import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import type { LegacyState } from '../../shared/state-schema';

/** Synthetic databases for storage tests. Every file lives in a temporary directory. */
const directories:string[] = [];
export function scratch(prefix = 'caminos-storage-test-'):string {
  const directory = mkdtempSync(join(tmpdir(),prefix));
  directories.push(directory);
  return directory;
}
export function cleanScratch():void { for (const directory of directories.splice(0)) rmSync(directory,{recursive:true,force:true}); }

/** The committed legacy fixture. Tests load it and build variants; they never regenerate it. */
export function legacyState():LegacyState {
  return JSON.parse(readFileSync(resolve('tests/fixtures/legacy-state-v1.json'),'utf8')) as LegacyState;
}
export const RUNNING_BLOCK = 'tpl:template-morning:2026-09-15:0';

const BASELINE = `
  CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, json TEXT NOT NULL);
  CREATE TABLE command_receipts (request_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, revision INTEGER NOT NULL, applied_at TEXT NOT NULL);
  CREATE TABLE owner (id INTEGER PRIMARY KEY CHECK(id=1), password_hash TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE sessions (hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, authenticated INTEGER NOT NULL, expires INTEGER NOT NULL);
  CREATE TABLE weather_cache (key TEXT PRIMARY KEY, json TEXT NOT NULL, fetched_at INTEGER NOT NULL);
  CREATE TABLE login_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, started_at INTEGER NOT NULL);
  CREATE TABLE owner_setup (id INTEGER PRIMARY KEY CHECK(id=1), hash TEXT NOT NULL, expires INTEGER NOT NULL);
`;
export interface DatabaseSeed { state:unknown; sqlVersion?:number; sqlRevision?:number; receipts?:{requestId:string;fingerprint:string;revision:number}[] }

/** Writes a database the way an earlier build left it: baseline tables, WAL, one state row. */
export function writeDatabase(path:string, seed:DatabaseSeed):string {
  const db = new Database(path);
  try {
    db.pragma('journal_mode = WAL');
    db.exec(BASELINE);
    db.pragma(`user_version = ${seed.sqlVersion ?? 1}`);
    const state = seed.state as {revision:number};
    db.prepare('INSERT INTO app_state(id,revision,json) VALUES (1,?,?)').run(seed.sqlRevision ?? state.revision,JSON.stringify(seed.state));
    db.prepare('INSERT INTO owner(id,password_hash,updated_at) VALUES (1,?,?)').run('synthetic-owner-hash','2026-09-14T10:00:00.000Z');
    db.prepare('INSERT INTO sessions(hash,csrf,authenticated,expires) VALUES (?,?,1,?)').run('synthetic-session-hash','synthetic-csrf',4102444800000);
    db.prepare('INSERT INTO weather_cache(key,json,fetched_at) VALUES (?,?,?)').run('synthetic-weather','{"synthetic":true}',1);
    db.prepare('INSERT INTO login_attempts(key,failures,started_at) VALUES (?,?,?)').run('owner',2,1);
    db.prepare('INSERT INTO owner_setup(id,hash,expires) VALUES (1,?,?)').run('synthetic-setup-hash',1);
    for (const receipt of seed.receipts ?? []) db.prepare('INSERT INTO command_receipts(request_id,fingerprint,revision,applied_at) VALUES (?,?,?,?)').run(receipt.requestId,receipt.fingerprint,receipt.revision,'2026-09-14T10:40:00.000Z');
  } finally { db.close(); }
  return path;
}
export function legacyDatabase(directory:string, seed:Partial<DatabaseSeed> = {}, name = 'legacy.sqlite'):string {
  return writeDatabase(join(directory,name),{state:legacyState(),...seed});
}

/** What must not move when an operation promises no mutation. */
export function fingerprint(path:string) {
  const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
  const db = new Database(path,{readonly:true,fileMustExist:true});
  try {
    const row = db.prepare('SELECT revision,json FROM app_state WHERE id=1').get() as {revision:number;json:string};
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").pluck().all() as string[];
    return {digest,userVersion:db.pragma('user_version',{simple:true}) as number,sqlRevision:row.revision,jsonRevision:(JSON.parse(row.json) as {revision:number}).revision,json:row.json,tables};
  } finally { db.close(); }
}
export function rows(path:string, table:string):unknown[] {
  const db = new Database(path,{readonly:true,fileMustExist:true});
  try { return db.prepare(`SELECT * FROM ${table} ORDER BY 1`).all(); } finally { db.close(); }
}
/** Everything in a directory, to prove a refused operation created nothing at all. */
export const listing = (directory:string):string[] => existsSync(directory) ? readdirSync(directory).sort() : [];
