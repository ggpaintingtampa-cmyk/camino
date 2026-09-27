import { afterEach, describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { applyMigration, migrateLegacyState, parseMigrateArguments, preflightMigration } from '../server/migrations';
import { inspectDatabase, Repository } from '../server/repository';
import { CURRENT_SCHEMA_DRAFT, CURRENT_SCHEMA_VERSION, validateCurrentState } from '../shared/state-schema';
import type { CommandEnvelope } from '../shared/types';
import { cleanScratch, fingerprint, legacyDatabase, legacyState, listing, rows, scratch, writeDatabase } from './fixtures/storage-fixtures';

afterEach(cleanScratch);
const now = '2026-09-27T12:00:00.000Z';
const options = (db: string, backup: string) => ({ db, backup, now, allowDraftFormat: true });

describe('R1 explicit migration and preservation gate', () => {
  it('requires an explicit absolute target and opt-in, independent of defaults', () => {
    for (const args of [[], ['--to-schema', '2'], ['--db', 'relative.sqlite', '--to-schema', '2'], ['--db', '/tmp/fixture.sqlite', '--to-schema', '2', '--apply']]) expect(() => parseMigrateArguments(args)).toThrow();
    expect(parseMigrateArguments(['--db', '/tmp/fixture.sqlite', '--to-schema', '2'])).toMatchObject({ apply: false, db: '/tmp/fixture.sqlite' });
  });
  it('normal opens never migrate a legacy database, and preflight is read-only', () => {
    const dir = scratch(), db = legacyDatabase(dir), before = fingerprint(db);
    expect(() => new Repository(db)).toThrow(/migration preflight/);
    expect(() => new Repository(db, { intent: 'initialize-if-missing', allowDraftFormat: true })).toThrow(/migration preflight/);
    expect(preflightMigration(db).status).toBe('ready');
    expect(fingerprint(db)).toEqual(before);
  });
  it('missing reads and commands create no directories or databases', () => {
    const dir = scratch(), missing = join(dir, 'missing', 'data.sqlite');
    for (const intent of ['open-existing', 'read-only'] as const) expect(() => new Repository(missing, { intent })).toThrow(/Nothing was created/);
    expect(() => preflightMigration(missing)).toThrow();
    expect(listing(dir)).toEqual([]);
    const initialized = new Repository(missing, { intent: 'initialize-if-missing', allowDraftFormat: true });
    expect(initialized.snapshot().schemaVersion).toBe(CURRENT_SCHEMA_VERSION); initialized.close();
  });
  it('preserves every legacy record and system table, verifies a private backup, and increments once', async () => {
    const dir = scratch(), db = legacyDatabase(dir), backup = join(dir, 'before.sqlite');
    const legacy = legacyState();
    const preserved = ['owner', 'sessions', 'weather_cache', 'login_attempts', 'owner_setup', 'command_receipts'];
    const before = Object.fromEntries(preserved.map(table => [table, rows(db, table)]));
    const result = await applyMigration(options(db, backup));
    expect(result.status).toBe('applied');
    expect(result.resultRevision).toBe(legacy.revision + 1);
    expect(statSync(backup).mode & 0o777).toBe(0o600);
    expect(JSON.parse(fingerprint(backup).json)).toEqual(legacy);
    const repo = new Repository(db), current = repo.snapshot(); repo.close();
    expect(validateCurrentState(current)).toEqual([]);
    for (const [key, value] of Object.entries(legacy)) if (key !== 'revision') expect(current[key as keyof typeof current], key).toEqual(value);
    expect(current.workSessions).toHaveLength(1);
    expect(current.workSessions[0].provenance).toBe('legacy-block');
    expect(current.schemaDraft).toBe(CURRENT_SCHEMA_DRAFT);
    for (const table of preserved) expect(rows(db, table), table).toEqual(before[table]);
    expect(rows(db, 'state_migrations')).toHaveLength(1);
    expect((await applyMigration(options(db, join(dir, 'unused.sqlite')))).status).toBe('already-current');
    expect(existsSync(join(dir, 'unused.sqlite'))).toBe(false);
    expect(fingerprint(db).sqlRevision).toBe(result.resultRevision);
  });
  it('replays an accepted legacy four-tab envelope after migration without converting its fingerprint', async () => {
    const captured = JSON.parse(readFileSync('tests/fixtures/legacy-envelope-fingerprints.json', 'utf8')).envelopes['settings.save.fourTab'] as { wire: CommandEnvelope; fingerprint: string };
    const dir = scratch(), db = legacyDatabase(dir, { receipts: [{ requestId: captured.wire.requestId, fingerprint: captured.fingerprint, revision: 1 }] });
    await applyMigration(options(db, join(dir, 'before.sqlite')));
    const repo = new Repository(db), before = repo.snapshot();
    expect(repo.execute(captured.wire).revision).toBe(before.revision);
    expect(repo.snapshot()).toEqual(before);
    repo.execute({ requestId: 'fresh-settings-r1', baseRevision: before.revision, command: { type: 'settings.save', name: before.settings.name, timezone: before.settings.timezone, navOrder: ['home', 'schedule', 'goals', 'more'] } });
    expect(repo.snapshot().settings.navOrderV3).toEqual(['home', 'schedule', 'tasks', 'history', 'more']);
    repo.close();
  });
  it('rolls back a failure inside the transaction while keeping the verified backup', async () => {
    const dir = scratch(), db = legacyDatabase(dir), backup = join(dir, 'before.sqlite'), before = fingerprint(db);
    await expect(applyMigration({ ...options(db, backup), beforeCommit: () => { throw new Error('synthetic failure'); } })).rejects.toThrow('synthetic failure');
    expect(fingerprint(db).json).toBe(before.json);
    expect(fingerprint(db).userVersion).toBe(1);
    expect(rows(db, 'owner')).toEqual(rows(backup, 'owner'));
    expect(fingerprint(db).tables).not.toContain('state_migrations');
  });
  it('refuses a source changed after the backup without overwriting the newer state', async () => {
    const dir = scratch(), db = legacyDatabase(dir), backup = join(dir, 'before.sqlite');
    const updated = legacyState(); updated.revision++;
    await expect(applyMigration({ ...options(db, backup), afterBackup: () => {
      const writer = new Database(db); writer.prepare('UPDATE app_state SET revision=?, json=? WHERE id=1').run(updated.revision, JSON.stringify(updated)); writer.close();
    } })).rejects.toThrow();
    expect(JSON.parse(fingerprint(db).json)).toEqual(updated);
    expect(fingerprint(db).userVersion).toBe(1);
  });
  it('refuses malformed, unsupported and ambiguous source states without changing them', () => {
    const dir = scratch();
    const invalid = legacyState(); invalid.tasks[0].duration = 0;
    const invalidDb = legacyDatabase(dir, { state: invalid }, 'invalid.sqlite'), before = fingerprint(invalidDb);
    expect(preflightMigration(invalidDb).status).toBe('blocked');
    expect(fingerprint(invalidDb)).toEqual(before);
    const future = { ...migrateLegacyState(legacyState()), schemaVersion: 999 };
    const futureDb = writeDatabase(join(dir, 'future.sqlite'), { state: future, sqlVersion: 999 });
    expect(() => inspectDatabase(futureDb)).toThrow(/newer/);
    const mismatch = legacyDatabase(dir, { sqlRevision: 999 }, 'mismatch.sqlite');
    expect(() => inspectDatabase(mismatch)).toThrow(/revisions disagree/);
  });
});
