import Database from 'better-sqlite3';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { initialState, applyCommand } from '../shared/domain.js';
import { commandEnvelopeSchema } from '../shared/schema.js';
import type { DatabaseOpenIntent, StateFormat, StorageErrorCode } from '../shared/contracts.js';
import type { CommandEnvelope, State } from '../shared/types.js';
import { dateKey } from '../shared/dates.js';
import { CURRENT_FORMAT, CURRENT_SCHEMA_DRAFT, CURRENT_SQL_VERSION, LEGACY_SQL_VERSION, detectStateFormat, issueRecordIds, validateCurrentState, validateLegacyState, type StateIssue } from '../shared/state-schema.js';

export class RevisionConflict extends Error {
  constructor(public currentRevision:number) { super('This information changed. Refresh and review your change before saving.'); }
}
export class DuplicateRequest extends Error {
  constructor() { super('This request ID was already used for a different change.'); }
}
/** A storage refusal. It carries a code, record IDs and rule names; never a stored value. */
export class StorageError extends Error {
  readonly recordIds?:string[];
  constructor(public readonly code:StorageErrorCode, message:string, public readonly issues:StateIssue[] = []) {
    super(message); this.name = 'StorageError';
    const ids = issueRecordIds(issues);
    if (ids.length) this.recordIds = ids;
  }
}
export const hashToken = (value:string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export interface Session { hash:string; csrf:string; authenticated:number; expires:number }
export interface SearchResult { id:string; type:string; title:string; text:string; date?:string }
export interface RepositoryOptions { intent?:DatabaseOpenIntent; allowDraftFormat?:boolean }
export interface BackupVerification { revision:number; format:StateFormat; sqlVersion:number }
export type OwnerExport =
 | { format:'caminos-owner-export'; version:1; exportedAt:string; state:unknown }
 | { format:'caminos-owner-export'; version:2; stateFormat:StateFormat; exportedAt:string; state:State };
/** What a read-only look at a database found. `issues` is empty when the state is valid. */
export interface Inspection { path:string; sqlVersion:number; revision:number; json:string; digest:string; legacy:boolean; format:StateFormat; state:unknown; issues:StateIssue[] }

const BASELINE_TABLES = ['app_state','command_receipts','owner','sessions','weather_cache','login_attempts','owner_setup'];
const BASELINE_SCHEMA = `
  CREATE TABLE app_state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, json TEXT NOT NULL);
  CREATE TABLE command_receipts (request_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, revision INTEGER NOT NULL, applied_at TEXT NOT NULL);
  CREATE TABLE owner (id INTEGER PRIMARY KEY CHECK(id=1), password_hash TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE TABLE sessions (hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, authenticated INTEGER NOT NULL, expires INTEGER NOT NULL);
  CREATE TABLE weather_cache (key TEXT PRIMARY KEY, json TEXT NOT NULL, fetched_at INTEGER NOT NULL);
  CREATE TABLE login_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, started_at INTEGER NOT NULL);
  CREATE TABLE owner_setup (id INTEGER PRIMARY KEY CHECK(id=1), hash TEXT NOT NULL, expires INTEGER NOT NULL);
`;
const notCaminos = () => new StorageError('STATE_INVALID','This file is not a Caminos database. It was left unchanged.');
export const invalidState = (issues:StateIssue[]) => new StorageError('STATE_INVALID','The stored records did not pass validation. Nothing was changed.',issues);
/** SHA-256 of the exact stored `app_state.json` text. */
export const stateDigest = (json:string) => createHash('sha256').update(json,'utf8').digest('hex');

/**
 * Looks at a database through a read-only connection and classifies it. It creates nothing and
 * runs no schema statement. Structural refusals throw; record-level findings are returned in
 * `issues` so a preflight can report them.
 */
export function inspectDatabase(path:string, options:{integrity?:boolean} = {}):Inspection {
  const file = resolve(path);
  const stat = statSync(file,{throwIfNoEntry:false});
  if (!stat) throw new StorageError('DATABASE_MISSING','No Caminos database exists at the selected path. Nothing was created.');
  if (!stat.isFile()) throw notCaminos();
  let db:Database.Database;
  try { db = new Database(file,{readonly:true,fileMustExist:true}); } catch { throw notCaminos(); }
  let sqlVersion:number; let row:{revision:number;json:string}|undefined;
  try {
    sqlVersion = db.pragma('user_version',{simple:true}) as number;
    if (options.integrity && db.pragma('integrity_check',{simple:true}) !== 'ok') throw new StorageError('STATE_INVALID','Backup integrity check failed.');
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").pluck().all() as string[];
    if (sqlVersion > CURRENT_SQL_VERSION) throw new StorageError('UNSUPPORTED_SCHEMA','This database was written by a newer Caminos build. It was left unchanged.');
    if (BASELINE_TABLES.some(name => !tables.includes(name))) throw notCaminos();
    row = db.prepare('SELECT revision,json FROM app_state WHERE id=1').get() as {revision:number;json:string}|undefined;
  } catch (error) {
    if (error instanceof StorageError) throw error;
    throw notCaminos();
  } finally { db.close(); }
  if (!row || typeof row.json !== 'string') throw notCaminos();
  let state:unknown;
  try { state = JSON.parse(row.json); } catch { throw new StorageError('STATE_INVALID','The stored records could not be read. Nothing was changed.',[{path:'$',rule:'invalid-json'}]); }
  const detected = detectStateFormat(state);
  if (detected.kind === 'newer') throw new StorageError('UNSUPPORTED_SCHEMA','This database was written by a newer Caminos build. It was left unchanged.');
  if (detected.kind === 'invalid') throw new StorageError('STATE_INVALID','The stored format could not be recognised. Nothing was changed.',[{path:'schemaVersion',rule:'unknown-format'}]);
  const legacy = detected.kind === 'legacy';
  // Disagreeing counters are never repaired by re-stamping either side.
  if (sqlVersion !== (legacy ? LEGACY_SQL_VERSION : CURRENT_SQL_VERSION)) throw new StorageError('STATE_INVALID','The stored format and the SQL version disagree. Nothing was changed.',[{path:'schemaVersion',rule:'sql-version-mismatch'}]);
  if ((state as {revision?:unknown}).revision !== row.revision) throw new StorageError('STATE_INVALID','The stored revisions disagree. Nothing was changed.',[{path:'revision',rule:'revision-mismatch'}]);
  if (detected.kind === 'draft-mismatch') throw new StorageError('DRAFT_FORMAT_MISMATCH','This database uses a different draft of the storage format. Recreate the disposable fixture.');
  return {path:file,sqlVersion,revision:row.revision,json:row.json,digest:stateDigest(row.json),legacy,format:detected.format,state,issues:legacy ? validateLegacyState(state) : validateCurrentState(state)};
}

/** One private database is the authority for both the web API and caminosctl. */
export class Repository {
  readonly db:Database.Database;
  readonly path:string;
  readonly intent:DatabaseOpenIntent;
  readonly format:StateFormat;
  readonly sqlVersion:number;
  constructor(path:string, options:RepositoryOptions = {}) {
    process.umask(0o077);
    this.intent = options.intent ?? 'open-existing';
    this.path = path === ':memory:' ? path : resolve(path);
    if (this.path === ':memory:') {
      // Never persisted, so it always initializes and may always be a draft.
      this.db = new Database(this.path);
      this.initialize();
      this.format = CURRENT_FORMAT; this.sqlVersion = CURRENT_SQL_VERSION;
      return;
    }
    const entry = lstatSync(this.path,{throwIfNoEntry:false});
    if (entry?.isSymbolicLink()) throw new Error('The database path must not be a symbolic link.');
    if (!entry) {
      if (this.intent !== 'initialize-if-missing') throw new StorageError('DATABASE_MISSING','No Caminos database exists at the selected path. Nothing was created.');
      if (CURRENT_SCHEMA_DRAFT !== undefined && !options.allowDraftFormat) throw new StorageError('DRAFT_FORMAT_NOT_ALLOWED','The current storage format is a draft. Creating a database needs the explicit draft opt-in. Nothing was created.');
      mkdirSync(dirname(this.path), { recursive:true, mode:0o700 });
      this.db = new Database(this.path);
      this.db.pragma('journal_mode = WAL');
      this.initialize();
      this.format = CURRENT_FORMAT; this.sqlVersion = CURRENT_SQL_VERSION;
    } else {
      // Everything is decided on a read-only connection before a writable one exists.
      const found = inspectDatabase(this.path);
      if (found.issues.length) throw invalidState(found.issues);
      if (found.legacy && this.intent !== 'read-only') throw new StorageError('MIGRATION_REQUIRED','This database uses the earlier storage format. Run the migration preflight before opening it. Nothing was changed.');
      this.format = found.format; this.sqlVersion = found.sqlVersion;
      this.db = new Database(this.path,{fileMustExist:true,readonly:this.intent === 'read-only'});
      if (this.intent !== 'read-only') this.db.pragma('journal_mode = WAL');
    }
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
    if (this.intent !== 'read-only') {
      this.db.pragma('synchronous = FULL');
      for(const file of [this.path,`${this.path}-wal`,`${this.path}-shm`]) if(existsSync(file)) chmodSync(file,0o600);
    }
  }
  /** Runs only for a database this constructor has just created. */
  private initialize():void {
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = FULL');
    const initial = initialState();
    this.db.transaction(() => {
      this.db.exec(BASELINE_SCHEMA);
      this.db.pragma(`user_version = ${CURRENT_SQL_VERSION}`);
      this.db.prepare('INSERT INTO app_state(id,revision,json) VALUES (1,?,?)').run(initial.revision, JSON.stringify(initial));
    }).immediate();
  }
  get legacy():boolean { return this.format.schemaVersion === 1; }
  private writable():void {
    if (this.intent === 'read-only') throw new Error('This database was opened read-only. Nothing was changed.');
  }
  private stored():string {
    return (this.db.prepare('SELECT json FROM app_state WHERE id=1').get() as {json:string}).json;
  }
  snapshot():State {
    if (this.legacy) throw new StorageError('MIGRATION_REQUIRED','This database uses the earlier storage format. It can be exported and backed up; reading it as current records needs a migration.');
    return JSON.parse(this.stored()) as State;
  }
  /** The one export shape, shared by caminosctl and the HTTP route. Records only. */
  exportEnvelope(exportedAt:string):OwnerExport {
    if (this.legacy) return {format:'caminos-owner-export',version:1,exportedAt,state:JSON.parse(this.stored())};
    return {format:'caminos-owner-export',version:2,stateFormat:this.format,exportedAt,state:this.snapshot()};
  }
  execute(input:CommandEnvelope, now = new Date().toISOString()):State {
    this.writable();
    const envelope = commandEnvelopeSchema.parse(input) as CommandEnvelope;
    const fingerprint = hashToken(JSON.stringify(envelope));
    return this.db.transaction(() => {
      const receipt = this.db.prepare('SELECT fingerprint FROM command_receipts WHERE request_id=?').get(envelope.requestId) as {fingerprint:string}|undefined;
      // Return the latest snapshot for a repeated command, never rewind newer user edits.
      if (receipt) {
        if (receipt.fingerprint !== fingerprint) throw new DuplicateRequest();
        return this.snapshot();
      }
      const state = this.snapshot();
      if (envelope.baseRevision !== state.revision) throw new RevisionConflict(state.revision);
      const next = applyCommand(state, envelope.command, now);
      if (next.revision !== state.revision + 1) throw new Error('Invalid domain revision.');
      const json = JSON.stringify(next);
      // Validate exactly what would be stored; an invalid state is refused, never written.
      const issues = validateCurrentState(JSON.parse(json));
      if (issues.length) throw invalidState(issues);
      this.db.prepare('UPDATE app_state SET revision=?,json=? WHERE id=1').run(next.revision, json);
      this.db.prepare('INSERT INTO command_receipts(request_id,fingerprint,revision,applied_at) VALUES (?,?,?,?)').run(envelope.requestId, fingerprint, next.revision, now);
      return next;
    }).immediate();
  }
  search(query:string):SearchResult[] {
    const state = this.snapshot();
    const q = query.trim().toLocaleLowerCase();
    if (!q) return [];
    const rows:SearchResult[] = [
      ...state.days.map(x => ({id:x.id,type:'day',title:x.date,text:[x.summary,x.journal,x.note].join('\n'),date:x.date})),
      ...state.tasks.map(x => ({id:x.id,type:'task',title:x.title,text:[x.notes,x.firstAction,x.doneWhen,...x.labels].filter(Boolean).join(' '),date:dateKey(x.createdAt,state.settings.timezone)})),
      ...state.blocks.map(x => ({id:x.id,type:x.kind,title:x.title,text:x.notes,date:dateKey(x.start,state.settings.timezone)})),
      ...state.goals.map(x => ({id:x.id,type:'goal',title:x.title,text:x.notes,date:x.targetDate})),
      ...state.reminders.map(x => ({id:x.id,type:'reminder',title:x.title,text:x.body,date:dateKey(x.startsAt,state.settings.timezone)})),
    ];
    return rows.filter(x => `${x.title} ${x.text} ${x.date ?? ''}`.toLocaleLowerCase().includes(q)).slice(0,200);
  }
  ownerHash():string|undefined { return (this.db.prepare('SELECT password_hash FROM owner WHERE id=1').get() as {password_hash:string}|undefined)?.password_hash; }
  setOwnerHash(hash:string):void {
    this.writable();
    this.db.transaction(() => {
      this.db.prepare('INSERT INTO owner(id,password_hash,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at').run(hash,new Date().toISOString());
      this.db.prepare('DELETE FROM sessions').run();
      this.db.prepare('DELETE FROM owner_setup').run();
      this.db.prepare('DELETE FROM login_attempts').run();
    })();
  }
  createSetupToken(now=Date.now()):{raw:string;expires:number} {
    this.writable();
    const raw=token(); const expires=now+15*60*1000;
    this.db.transaction(()=>{
      if(this.ownerHash()) throw Object.assign(new Error('The private owner is already configured.'),{statusCode:409,code:'OWNER_ALREADY_CONFIGURED'});
      this.db.prepare('INSERT INTO owner_setup(id,hash,expires) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET hash=excluded.hash,expires=excluded.expires').run(hashToken(raw),expires);
    }).immediate();
    return {raw,expires};
  }
  setupTokenValid(raw:string,now:number):boolean {
    return !!this.db.prepare('SELECT id FROM owner_setup WHERE id=1 AND hash=? AND expires>?').get(hashToken(raw),now);
  }
  completeSetup(raw:string,passwordHash:string,now:number):void {
    this.writable();
    this.db.transaction(()=>{
      if(this.ownerHash()) throw Object.assign(new Error('The private owner is already configured.'),{statusCode:409,code:'OWNER_ALREADY_CONFIGURED'});
      if(!this.setupTokenValid(raw,now)) throw Object.assign(new Error('That setup link has expired or was replaced. Generate a new private setup link.'),{statusCode:403,code:'SETUP_LINK_EXPIRED'});
      this.db.prepare('INSERT INTO owner(id,password_hash,updated_at) VALUES(1,?,?)').run(passwordHash,new Date(now).toISOString());
      this.db.prepare('DELETE FROM owner_setup').run();
      this.db.prepare('DELETE FROM sessions').run();
    }).immediate();
  }
  session(rawToken:string|undefined, now:number):Session|undefined {
    if (!rawToken) return undefined;
    return this.db.prepare('SELECT * FROM sessions WHERE hash=? AND expires>?').get(hashToken(rawToken),now) as Session|undefined;
  }
  createSession(authenticated:boolean, now:number):{raw:string; session:Session} {
    this.writable();
    const raw = token();
    const session = { hash:hashToken(raw), csrf:token(), authenticated:authenticated ? 1 : 0, expires:now + (authenticated ? 7*24*60*60*1000 : 15*60*1000) };
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
      this.db.prepare('INSERT INTO sessions(hash,csrf,authenticated,expires) VALUES (?,?,?,?)').run(session.hash,session.csrf,session.authenticated,session.expires);
    })();
    return {raw,session};
  }
  authenticateOwner(verifiedHash:string,oldSessionHash:string|undefined,now:number):{raw:string;session:Session} {
    this.writable();
    return this.db.transaction(()=>{
      // Password verification is asynchronous. A concurrent password reset must win.
      if(this.ownerHash()!==verifiedHash) throw Object.assign(new Error('Your sign-in changed while signing in. Please try again.'),{statusCode:401,code:'CREDENTIALS_CHANGED'});
      if(oldSessionHash) this.deleteSession(oldSessionHash);
      return this.createSession(true,now);
    }).immediate();
  }
  deleteSession(hash:string):void { this.writable(); this.db.prepare('DELETE FROM sessions WHERE hash=?').run(hash); }
  loginBlocked(key:string, now:number):boolean {
    const row = this.db.prepare('SELECT failures,started_at FROM login_attempts WHERE key=?').get(key) as {failures:number;started_at:number}|undefined;
    return !!row && row.started_at > now-15*60*1000 && row.failures >= 8;
  }
  loginFailure(key:string, now:number):void {
    this.writable();
    this.db.prepare('INSERT INTO login_attempts(key,failures,started_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN started_at<? THEN 1 ELSE failures+1 END,started_at=CASE WHEN started_at<? THEN excluded.started_at ELSE started_at END').run(key,now,now-15*60*1000,now-15*60*1000);
  }
  reserveLoginAttempt(key:string,now:number):boolean {
    this.writable();
    return this.db.transaction(()=>{
      if(this.loginBlocked(key,now))return false;
      this.loginFailure(key,now);
      return true;
    }).immediate();
  }
  loginSuccess(key:string):void { this.writable(); this.db.prepare('DELETE FROM login_attempts WHERE key=?').run(key); }
  weatherCache<T>(key:string):{data:T;fetchedAt:number}|undefined {
    const row = this.db.prepare('SELECT json,fetched_at FROM weather_cache WHERE key=?').get(key) as {json:string;fetched_at:number}|undefined;
    return row ? {data:JSON.parse(row.json) as T, fetchedAt:row.fetched_at} : undefined;
  }
  putWeatherCache(key:string, data:unknown, now:number):void {
    this.writable();
    this.db.prepare('INSERT INTO weather_cache(key,json,fetched_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json,fetched_at=excluded.fetched_at').run(key,JSON.stringify(data),now);
  }
  /** Works on a read-only repository, so a legacy database stays backed up before its migration. */
  async backup(destination:string):Promise<BackupVerification & {path:string;digest:string}> {
    const target = resolve(destination);
    if (target === this.path || existsSync(target)) throw new Error('Backup requires a new destination file.');
    mkdirSync(dirname(target), {recursive:true,mode:0o700});
    await this.db.backup(target);
    chmodSync(target,0o600);
    const found = Repository.inspectBackup(target);
    return {revision:found.revision,format:found.format,sqlVersion:found.sqlVersion,path:target,digest:found.digest};
  }
  private static inspectBackup(path:string):Inspection {
    const found = inspectDatabase(path,{integrity:true});
    if (found.issues.length) throw invalidState(found.issues);
    return found;
  }
  /** Read-only. Accepts legacy format 1 and the current format; never upgrades what it reads. */
  static verifyBackup(path:string):BackupVerification {
    const found = Repository.inspectBackup(path);
    return {revision:found.revision,format:found.format,sqlVersion:found.sqlVersion};
  }
  close():void { this.db.close(); }
}
