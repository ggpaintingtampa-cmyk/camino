import Database from 'better-sqlite3';
import { createHash, randomBytes } from 'node:crypto';
import { chmodSync, existsSync, lstatSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { initialState, applyCommand } from '../shared/domain.js';
import { commandEnvelopeSchema } from '../shared/schema.js';
import type { CommandEnvelope, State } from '../shared/types.js';
import { dateKey } from '../shared/dates.js';

export class RevisionConflict extends Error {
  constructor(public currentRevision:number) { super('This information changed. Refresh and review your change before saving.'); }
}
export class DuplicateRequest extends Error {
  constructor() { super('This request ID was already used for a different change.'); }
}
export const hashToken = (value:string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(32).toString('base64url');
export interface Session { hash:string; csrf:string; authenticated:number; expires:number }
export interface SearchResult { id:string; type:string; title:string; text:string; date?:string }

/** One private database is the authority for both the web API and caminosctl. */
export class Repository {
  readonly db:Database.Database;
  readonly path:string;
  constructor(path:string) {
    process.umask(0o077);
    this.path = path === ':memory:' ? path : resolve(path);
    if (this.path !== ':memory:') {
      mkdirSync(dirname(this.path), { recursive:true, mode:0o700 });
      if (existsSync(this.path) && lstatSync(this.path).isSymbolicLink()) throw new Error('The database path must not be a symbolic link.');
    }
    this.db = new Database(this.path);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('busy_timeout = 5000');
    this.db.pragma('synchronous = FULL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), revision INTEGER NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS command_receipts (request_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, revision INTEGER NOT NULL, applied_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS owner (id INTEGER PRIMARY KEY CHECK(id=1), password_hash TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, csrf TEXT NOT NULL, authenticated INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS weather_cache (key TEXT PRIMARY KEY, json TEXT NOT NULL, fetched_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, started_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS owner_setup (id INTEGER PRIMARY KEY CHECK(id=1), hash TEXT NOT NULL, expires INTEGER NOT NULL);
      PRAGMA user_version = 1;
    `);
    const initial = initialState();
    this.db.prepare('INSERT OR IGNORE INTO app_state(id,revision,json) VALUES (1,?,?)').run(initial.revision, JSON.stringify(initial));
    if (this.path !== ':memory:') {
      for(const file of [this.path,`${this.path}-wal`,`${this.path}-shm`]) if(existsSync(file)) chmodSync(file,0o600);
    }
  }
  snapshot():State {
    const row = this.db.prepare('SELECT json FROM app_state WHERE id=1').get() as {json:string};
    return JSON.parse(row.json) as State;
  }
  execute(input:CommandEnvelope, now = new Date().toISOString()):State {
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
      this.db.prepare('UPDATE app_state SET revision=?,json=? WHERE id=1').run(next.revision, JSON.stringify(next));
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
      ...state.tasks.map(x => ({id:x.id,type:'task',title:x.title,text:[x.notes,...x.labels].join(' '),date:dateKey(x.createdAt,state.settings.timezone)})),
      ...state.blocks.map(x => ({id:x.id,type:x.kind,title:x.title,text:x.notes,date:dateKey(x.start,state.settings.timezone)})),
      ...state.goals.map(x => ({id:x.id,type:'goal',title:x.title,text:x.notes,date:x.targetDate})),
      ...state.reminders.map(x => ({id:x.id,type:'reminder',title:x.title,text:x.body,date:dateKey(x.startsAt,state.settings.timezone)})),
    ];
    return rows.filter(x => `${x.title} ${x.text} ${x.date ?? ''}`.toLocaleLowerCase().includes(q)).slice(0,200);
  }
  ownerHash():string|undefined { return (this.db.prepare('SELECT password_hash FROM owner WHERE id=1').get() as {password_hash:string}|undefined)?.password_hash; }
  setOwnerHash(hash:string):void {
    this.db.transaction(() => {
      this.db.prepare('INSERT INTO owner(id,password_hash,updated_at) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at').run(hash,new Date().toISOString());
      this.db.prepare('DELETE FROM sessions').run();
      this.db.prepare('DELETE FROM owner_setup').run();
      this.db.prepare('DELETE FROM login_attempts').run();
    })();
  }
  createSetupToken(now=Date.now()):{raw:string;expires:number} {
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
    const raw = token();
    const session = { hash:hashToken(raw), csrf:token(), authenticated:authenticated ? 1 : 0, expires:now + (authenticated ? 7*24*60*60*1000 : 15*60*1000) };
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM sessions WHERE expires<=?').run(now);
      this.db.prepare('INSERT INTO sessions(hash,csrf,authenticated,expires) VALUES (?,?,?,?)').run(session.hash,session.csrf,session.authenticated,session.expires);
    })();
    return {raw,session};
  }
  authenticateOwner(verifiedHash:string,oldSessionHash:string|undefined,now:number):{raw:string;session:Session} {
    return this.db.transaction(()=>{
      // Password verification is asynchronous. A concurrent password reset must win.
      if(this.ownerHash()!==verifiedHash) throw Object.assign(new Error('Your sign-in changed while signing in. Please try again.'),{statusCode:401,code:'CREDENTIALS_CHANGED'});
      if(oldSessionHash) this.deleteSession(oldSessionHash);
      return this.createSession(true,now);
    }).immediate();
  }
  deleteSession(hash:string):void { this.db.prepare('DELETE FROM sessions WHERE hash=?').run(hash); }
  loginBlocked(key:string, now:number):boolean {
    const row = this.db.prepare('SELECT failures,started_at FROM login_attempts WHERE key=?').get(key) as {failures:number;started_at:number}|undefined;
    return !!row && row.started_at > now-15*60*1000 && row.failures >= 8;
  }
  loginFailure(key:string, now:number):void {
    this.db.prepare('INSERT INTO login_attempts(key,failures,started_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET failures=CASE WHEN started_at<? THEN 1 ELSE failures+1 END,started_at=CASE WHEN started_at<? THEN excluded.started_at ELSE started_at END').run(key,now,now-15*60*1000,now-15*60*1000);
  }
  reserveLoginAttempt(key:string,now:number):boolean {
    return this.db.transaction(()=>{
      if(this.loginBlocked(key,now))return false;
      this.loginFailure(key,now);
      return true;
    }).immediate();
  }
  loginSuccess(key:string):void { this.db.prepare('DELETE FROM login_attempts WHERE key=?').run(key); }
  weatherCache<T>(key:string):{data:T;fetchedAt:number}|undefined {
    const row = this.db.prepare('SELECT json,fetched_at FROM weather_cache WHERE key=?').get(key) as {json:string;fetched_at:number}|undefined;
    return row ? {data:JSON.parse(row.json) as T, fetchedAt:row.fetched_at} : undefined;
  }
  putWeatherCache(key:string, data:unknown, now:number):void {
    this.db.prepare('INSERT INTO weather_cache(key,json,fetched_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET json=excluded.json,fetched_at=excluded.fetched_at').run(key,JSON.stringify(data),now);
  }
  async backup(destination:string):Promise<{revision:number;path:string}> {
    const target = resolve(destination);
    if (target === this.path || existsSync(target)) throw new Error('Backup requires a new destination file.');
    mkdirSync(dirname(target), {recursive:true,mode:0o700});
    await this.db.backup(target);
    chmodSync(target,0o600);
    const verification = Repository.verifyBackup(target);
    return {revision:verification.revision,path:target};
  }
  static verifyBackup(path:string):{revision:number} {
    const check = new Database(path,{readonly:true,fileMustExist:true});
    try {
      const integrity = check.pragma('integrity_check',{simple:true});
      if (integrity !== 'ok') throw new Error('Backup integrity check failed.');
      const row = check.prepare('SELECT revision,json FROM app_state WHERE id=1').get() as {revision:number;json:string}|undefined;
      if (!row || (JSON.parse(row.json) as State).revision !== row.revision) throw new Error('Backup state verification failed.');
      return {revision:row.revision};
    } finally { check.close(); }
  }
  close():void { this.db.close(); }
}
