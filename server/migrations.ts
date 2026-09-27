import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import type { StateFormat } from '../shared/contracts.js';
import { dateKey } from '../shared/dates.js';
import { CURRENT_FORMAT, CURRENT_SCHEMA_DRAFT, CURRENT_SCHEMA_VERSION, CURRENT_SQL_VERSION, validateCurrentState, validateLegacyState, type LegacyState, type StateIssue } from '../shared/state-schema.js';
import type { State, WorkSession } from '../shared/types.js';
import { Repository, StorageError, inspectDatabase, invalidState, stateDigest, type Inspection } from './repository.js';

const COUNTED = ['tasks','blocks','days','goals','logs','reminders','ledgers','envelopes','adjustments','templates','locations','dayPlans','workSessions','taskOutcomes'] as const;
export type RecordCounts = Partial<Record<typeof COUNTED[number],number>>;
export interface MigrationDiagnostic { rule:string; path:string; id?:string }
export interface MigrationPreflight {
  status:'ready'|'already-current'|'blocked';
  source:{format:StateFormat; sqlVersion:number; revision:number; digest:string};
  target:{format:StateFormat; sqlVersion:number};
  counts:RecordCounts;
  /** Sessions the transformation would derive from running legacy blocks. */
  derivedSessions:number;
  diagnostics:MigrationDiagnostic[];
}
export interface MigrationResult {
  status:'applied'|'already-current';
  source:MigrationPreflight['source'];
  target:MigrationPreflight['target'];
  resultRevision:number;
  backup?:{path:string; revision:number; digest:string};
  counts:RecordCounts;
}
export interface MigrateArguments { db:string; toSchema:number; apply:boolean; backup?:string; allowDraftFormat:boolean }
export interface ApplyMigrationOptions {
  db:string; backup:string; allowDraftFormat?:boolean;
  /** Trusted time recorded in the bookkeeping row. The migrated records never depend on it. */
  now:string;
  /** Test seams: a concurrent writer after the backup, and a failure inside the transaction. */
  afterBackup?:() => void;
  beforeCommit?:() => void;
}

const argumentError = (message:string) => new StorageError('MIGRATION_ARGUMENT',message);
const counts = (state:unknown):RecordCounts => Object.fromEntries(COUNTED.flatMap(name => {
  const list = (state as Record<string,unknown>)[name];
  return Array.isArray(list) ? [[name,list.length]] : [];
}));

/**
 * Reads the arguments after the action name. Only what is literally present counts: no
 * environment variable and no default path ever stands in for `--db`.
 */
export function parseMigrateArguments(args:string[]):MigrateArguments {
  const values = new Map<string,string>(); const flags = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const name = args[index];
    if (values.has(name) || flags.has(name)) throw argumentError(`${name} may be given once.`);
    if (name === '--apply' || name === '--allow-draft-format') { flags.add(name); continue; }
    if (!['--db','--to-schema','--backup'].includes(name)) throw argumentError('migrate accepts --db, --to-schema, --apply, --backup and --allow-draft-format only.');
    const value = args[++index];
    if (value === undefined || value.startsWith('--')) throw argumentError(`${name} requires a value.`);
    values.set(name,value);
  }
  const db = values.get('--db'); const to = values.get('--to-schema'); const backup = values.get('--backup');
  if (!db || !isAbsolute(db)) throw argumentError('migrate needs --db with an absolute path to an existing database. An environment or default path is never used.');
  if (to === undefined) throw argumentError('migrate needs --to-schema.');
  if (to !== String(CURRENT_SCHEMA_VERSION)) throw argumentError(`This build migrates to schema ${CURRENT_SCHEMA_VERSION} only.`);
  const apply = flags.has('--apply');
  if (apply && (!backup || !isAbsolute(backup))) throw argumentError('--apply needs --backup with an absolute path for a new backup file.');
  if (!apply && backup !== undefined) throw argumentError('--backup is used together with --apply.');
  return {db,toSchema:CURRENT_SCHEMA_VERSION,apply,...(backup ? {backup} : {}),allowDraftFormat:flags.has('--allow-draft-format')};
}

const running = (block:LegacyState['blocks'][number]) => !block.archived && block.status === 'pending' && !!block.actualStart && !block.actualEnd;

/** Findings that stop a migration. IDs and rule names only; nothing is repaired or guessed. */
export function legacyMigrationIssues(legacy:unknown):StateIssue[] {
  const issues = validateLegacyState(legacy);
  if (issues.length) return issues;
  const state = legacy as LegacyState;
  const active = state.blocks.map((block,index) => ({block,index})).filter(entry => running(entry.block));
  for (const [index,block] of state.blocks.entries()) if (block.kind === 'task' && !block.taskId) issues.push({path:`blocks[${index}].taskId`,id:block.id,rule:'task-block-without-task'});
  if (active.length > 1) for (const {block,index} of active) issues.push({path:`blocks[${index}].actualStart`,id:block.id,rule:'multiple-running-blocks'});
  for (const {block,index} of active) if (block.kind === 'appointment') issues.push({path:`blocks[${index}].actualStart`,id:block.id,rule:'running-appointment'});
  return issues;
}

/**
 * Format 1 to format 2. Pure and deterministic: no clock, no random ID, no I/O. Every legacy
 * record is copied as stored; the revision is left for the caller to advance.
 */
export function migrateLegacyState(legacy:unknown):State {
  const stops = legacyMigrationIssues(legacy);
  if (stops.length) throw new StorageError('STATE_INVALID','The legacy records cannot be migrated as they are. Nothing was changed.',stops);
  const {revision,...records} = structuredClone(legacy) as LegacyState;
  const zone = records.settings.timezone;
  const workSessions:WorkSession[] = records.blocks.filter(running).map(block => {
    const start = block.actualStart!;
    const openDays = records.days.filter(day => !day.archived && !!day.startedAt && !day.endedAt && Date.parse(day.startedAt) <= Date.parse(start));
    return {
      id:`legacy-session:${block.id}`, createdAt:start, updatedAt:block.updatedAt,
      target:block.kind === 'task' ? {kind:'task' as const,taskId:block.taskId!} : {kind:'routine' as const,blockId:block.id},
      intervals:[{start,...(openDays.length === 1 ? {dayId:openDays[0].id} : {}),contextDate:dateKey(start,zone),timezone:zone,plannedBlockId:block.id}],
      provenance:'legacy-block' as const,
    };
  });
  const state:State = {
    schemaVersion:CURRENT_SCHEMA_VERSION, ...(CURRENT_SCHEMA_DRAFT === undefined ? {} : {schemaDraft:CURRENT_SCHEMA_DRAFT}),
    revision, ...records, dayPlans:[], workSessions, taskOutcomes:[],
  };
  const issues = validateCurrentState(state);
  if (issues.length) throw invalidState(issues);
  return state;
}

function report(found:Inspection):MigrationPreflight {
  const base = {
    source:{format:found.format,sqlVersion:found.sqlVersion,revision:found.revision,digest:found.digest},
    target:{format:CURRENT_FORMAT,sqlVersion:CURRENT_SQL_VERSION},
    counts:counts(found.state),
  };
  if (!found.legacy) return {status:found.issues.length ? 'blocked' : 'already-current',...base,derivedSessions:0,diagnostics:found.issues};
  try {
    const migrated = migrateLegacyState(found.state);
    return {status:'ready',...base,derivedSessions:migrated.workSessions.length,diagnostics:[]};
  } catch (error) {
    if (!(error instanceof StorageError)) throw error;
    return {status:'blocked',...base,derivedSessions:0,diagnostics:error.issues};
  }
}

/** Read-only. Reports formats, versions, revision, counts and IDs-only diagnostics. */
export function preflightMigration(db:string):MigrationPreflight {
  if (!isAbsolute(db)) throw argumentError('migrate needs --db with an absolute path to an existing database. An environment or default path is never used.');
  return report(inspectDatabase(db));
}

/**
 * The explicit upgrade of one selected database. No other process may hold it. Any failure
 * leaves the source state, revision and SQL version as they were.
 */
export async function applyMigration(options:ApplyMigrationOptions):Promise<MigrationResult> {
  if (!isAbsolute(options.db)) throw argumentError('migrate needs --db with an absolute path to an existing database. An environment or default path is never used.');
  if (!options.backup || !isAbsolute(options.backup)) throw argumentError('--apply needs --backup with an absolute path for a new backup file.');
  const found = inspectDatabase(options.db);
  const before = report(found);
  if (before.status === 'blocked') throw new StorageError('STATE_INVALID','The records cannot be migrated as they are. Nothing was changed.',before.diagnostics);
  if (before.status === 'already-current') return {status:'already-current',source:before.source,target:before.target,resultRevision:found.revision,counts:before.counts};
  if (existsSync(options.backup)) throw argumentError('--backup must name a file that does not exist yet. Existing files are never overwritten.');
  if (CURRENT_SCHEMA_DRAFT !== undefined && !options.allowDraftFormat) throw new StorageError('DRAFT_FORMAT_NOT_ALLOWED','The target storage format is a draft. Migrating into it needs --allow-draft-format. Nothing was changed.');

  const source = new Repository(found.path,{intent:'read-only'});
  let backup:Awaited<ReturnType<Repository['backup']>>;
  try { backup = await source.backup(options.backup); } finally { source.close(); }
  if (backup.revision !== found.revision || backup.digest !== found.digest) throw new StorageError('SOURCE_CHANGED','The database changed while it was being backed up. Nothing was migrated; start again from the preflight.');
  options.afterBackup?.();

  const db = new Database(found.path,{fileMustExist:true});
  try {
    db.pragma('busy_timeout = 5000');
    db.pragma('synchronous = FULL');
    return db.transaction(():MigrationResult => {
      const sqlVersion = db.pragma('user_version',{simple:true}) as number;
      const row = db.prepare('SELECT revision,json FROM app_state WHERE id=1').get() as {revision:number;json:string}|undefined;
      let stored:{revision?:unknown}|undefined;
      try { stored = row ? JSON.parse(row.json) as {revision?:unknown} : undefined; } catch { stored = undefined; }
      if (!row || sqlVersion !== found.sqlVersion || row.revision !== found.revision || stored?.revision !== found.revision || stateDigest(row.json) !== found.digest) {
        throw new StorageError('SOURCE_CHANGED','The database changed after its backup was taken. Nothing was migrated; start again from the preflight.');
      }
      const next:State = {...migrateLegacyState(stored),revision:found.revision + 1};
      const issues = validateCurrentState(next);
      if (issues.length) throw invalidState(issues);
      db.exec('CREATE TABLE IF NOT EXISTS state_migrations (id INTEGER PRIMARY KEY, from_format INTEGER NOT NULL, to_format INTEGER NOT NULL, to_draft INTEGER, source_revision INTEGER NOT NULL, result_revision INTEGER NOT NULL, source_digest TEXT NOT NULL, applied_at TEXT NOT NULL)');
      db.prepare('INSERT INTO state_migrations(from_format,to_format,to_draft,source_revision,result_revision,source_digest,applied_at) VALUES (?,?,?,?,?,?,?)')
        .run(found.format.schemaVersion,CURRENT_SCHEMA_VERSION,CURRENT_SCHEMA_DRAFT ?? null,found.revision,next.revision,found.digest,new Date(options.now).toISOString());
      db.prepare('UPDATE app_state SET revision=?,json=? WHERE id=1').run(next.revision,JSON.stringify(next));
      db.pragma(`user_version = ${CURRENT_SQL_VERSION}`);
      options.beforeCommit?.();
      return {status:'applied',source:before.source,target:before.target,resultRevision:next.revision,backup:{path:backup.path,revision:backup.revision,digest:backup.digest},counts:counts(next)};
    }).immediate();
  } finally { db.close(); }
}
