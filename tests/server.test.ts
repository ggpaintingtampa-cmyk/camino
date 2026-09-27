import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import argon2 from 'argon2';
import { createApp, type CaminosApp } from '../server/app.js';
import { Repository } from '../server/repository.js';
import type { Command, CommandEnvelope } from '../shared/types.js';

const origin = 'https://caminos.test';
const password = 'isolated-test-password-2026';
const timestamp = Date.parse('2026-09-18T15:00:00Z');
const envelope = (command:Command,baseRevision=0):CommandEnvelope => ({requestId:randomUUID(),baseRevision,command});
let app:CaminosApp;
let directory:string;
let cookie:string;
let csrf:string;
let clock=timestamp;
const requestHeaders = () => ({origin,cookie,'x-csrf-token':csrf});
async function login() {
  const session = await app.inject({method:'GET',url:'/api/session'});
  cookie = session.cookies[0].name+'='+session.cookies[0].value;
  csrf = session.json().csrfToken;
  const result = await app.inject({method:'POST',url:'/api/login',headers:requestHeaders(),payload:{password}});
  expect(result.statusCode).toBe(200);
  cookie = result.cookies[0].name+'='+result.cookies[0].value;
  csrf = result.json().csrfToken;
  return result;
}
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(),'caminos-server-test-'));
  clock=timestamp;
  app = await createApp({dbPath:join(directory,'private.sqlite'),origin,now:()=>clock});
  app.repository.setOwnerHash(await argon2.hash(password,{type:argon2.argon2id,memoryCost:8192,timeCost:1,parallelism:1}));
  cookie='';csrf='';
});
afterEach(async () => {await app.close();rmSync(directory,{recursive:true,force:true});});

describe('owner privacy and authentication',() => {
  it('uses expiring, one-time setup links without exposing token digests or replacing an owner',async()=>{
    app.repository.db.prepare('DELETE FROM owner').run();
    const replaced=app.repository.createSetupToken(timestamp);
    const setup=app.repository.createSetupToken(timestamp);
    expect(app.repository.setupTokenValid(replaced.raw,timestamp)).toBe(false);
    expect(app.repository.setupTokenValid(setup.raw,timestamp+16*60*1000)).toBe(false);
    const stored=app.repository.db.prepare('SELECT hash FROM owner_setup WHERE id=1').get() as {hash:string};
    expect(stored.hash).not.toBe(setup.raw);
    const initial=await app.inject({url:'/api/session'});
    cookie=initial.cookies[0].name+'='+initial.cookies[0].value;csrf=initial.json().csrfToken;
    expect(initial.json().ownerConfigured).toBe(false);
    const bad=await app.inject({method:'POST',url:'/api/setup',headers:requestHeaders(),payload:{token:replaced.raw,password}});
    expect(bad.statusCode).toBe(403);
    const created=await app.inject({method:'POST',url:'/api/setup',headers:requestHeaders(),payload:{token:setup.raw,password}});
    expect(created.statusCode).toBe(200);
    expect(created.json().authenticated).toBe(true);
    expect(app.repository.setupTokenValid(setup.raw,timestamp)).toBe(false);
    expect(await argon2.verify(app.repository.ownerHash()!,password)).toBe(true);
    cookie=created.cookies[0].name+'='+created.cookies[0].value;csrf=created.json().csrfToken;
    const again=await app.inject({method:'POST',url:'/api/setup',headers:requestHeaders(),payload:{token:setup.raw,password:'another-test-password'}});
    expect(again.statusCode).toBe(409);
    expect(()=>app.repository.createSetupToken()).toThrow('already configured');
  });
  it('rejects anonymous and Pirata sessions for every personal route',async () => {
    for (const url of ['/api/snapshot','/api/export','/api/search?q=journal','/api/weather','/api/weather/locations?q=Tampa']) {
      const response = await app.inject({method:'GET',url,headers:{cookie:'pirata_session=owner; __Host-pirata_session=employee; __Host-hermes_session=forged'}});
      expect(response.statusCode,url).toBe(401);
      expect(response.headers['cache-control']).toContain('no-store');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    }
  });
  it('authorizes canonical decoded routes, including every encoded API prefix',async()=>{
    const paths=['snapshot','export','search?q=journal','weather','weather/locations?q=Tampa'];
    for(const path of paths) {
      for(const prefix of ['/%61pi/','/a%70i/','/ap%69/','/%61%70%69/']) {
        const response=await app.inject({url:`${prefix}${path}`,headers:{cookie:'__Host-pirata_session=owner'}});
        expect(response.statusCode,`${prefix}${path}`).toBe(401);
        expect(response.body).not.toContain('ledgers');
        expect(response.body).not.toContain('settings');
        expect(response.body).not.toContain('caminos-owner-export');
      }
    }
    await login();
    expect((await app.inject({url:'/%61pi/snapshot',headers:{cookie}})).statusCode).toBe(200);
    for(const route of ['/%61pi/login','/a%70i/setup','/ap%69/logout','/%61pi/commands']) {
      expect((await app.inject({method:'POST',url:route,payload:{password,token:'x'.repeat(43)}})).statusCode,route).toBe(403);
      expect((await app.inject({method:'POST',url:route,headers:{cookie,origin:'https://pirata.test','x-csrf-token':csrf},payload:{password,token:'x'.repeat(43)}})).statusCode,route).toBe(403);
    }
    const valid=await app.inject({method:'POST',url:'/%61pi/commands',headers:requestHeaders(),payload:envelope({type:'settings.save',name:'Morgan',timezone:'America/New_York'})});
    expect(valid.statusCode).toBe(200);
  });
  it('requires exact origin and CSRF even for login, rotates cookie, revokes logout',async () => {
    const anonymous = await app.inject({url:'/api/session'});
    const oldCookie = anonymous.cookies[0].name+'='+anonymous.cookies[0].value;
    const oldCsrf = anonymous.json().csrfToken;
    for (const headers of [{cookie:oldCookie},{cookie:oldCookie,origin:'https://pirata.test','x-csrf-token':oldCsrf},{cookie:oldCookie,origin,'x-csrf-token':'wrong'}]) {
      expect((await app.inject({method:'POST',url:'/api/login',headers,payload:{password}})).statusCode).toBe(403);
    }
    const result=await login();
    expect(result.headers['set-cookie']).toContain('__Host-hermes_session=');
    expect(result.headers['set-cookie']).toContain('HttpOnly');
    expect(result.headers['set-cookie']).toContain('Secure');
    expect(result.headers['set-cookie']).toContain('SameSite=Strict');
    expect(result.headers['set-cookie']).toContain('Max-Age=604800');
    expect(result.headers['set-cookie']).not.toContain('Expires=');
    expect((await app.inject({url:'/api/snapshot',headers:{cookie:oldCookie}})).statusCode).toBe(401);
    expect((await app.inject({url:'/api/snapshot',headers:{cookie}})).statusCode).toBe(200);
    expect((await app.inject({method:'POST',url:'/api/logout',headers:requestHeaders()})).statusCode).toBe(200);
    expect((await app.inject({url:'/api/snapshot',headers:{cookie}})).statusCode).toBe(401);
  });
  it('persistently limits owner password guesses',async () => {
    const initial=await app.inject({url:'/api/session'});
    cookie=initial.cookies[0].name+'='+initial.cookies[0].value;csrf=initial.json().csrfToken;
    for(let i=0;i<8;i++) expect((await app.inject({method:'POST',url:'/api/login',headers:requestHeaders(),payload:{password:'incorrect'}})).statusCode).toBe(401);
    const limited=await app.inject({method:'POST',url:'/api/login',headers:requestHeaders(),payload:{password}});
    expect(limited.statusCode).toBe(429);
    expect(limited.headers['retry-after']).toBe('900');
  });
  it('reserves limits before asynchronous password checks so parallel guesses cannot bypass them',async()=>{
    const initial=await app.inject({url:'/api/session'});
    cookie=initial.cookies[0].name+'='+initial.cookies[0].value;csrf=initial.json().csrfToken;
    const responses=await Promise.all(Array.from({length:12},()=>app.inject({method:'POST',url:'/api/login',headers:requestHeaders(),payload:{password:'incorrect'}})));
    expect(responses.filter(response=>response.statusCode===401)).toHaveLength(8);
    expect(responses.filter(response=>response.statusCode===429)).toHaveLength(4);
  });
  it('cannot create a session from a password that was reset during asynchronous verification',async()=>{
    const oldHash=app.repository.ownerHash()!;
    const resetHash=await argon2.hash('replacement-private-password',{memoryCost:8192,timeCost:1,parallelism:1});
    app.repository.setOwnerHash(resetHash);
    expect(()=>app.repository.authenticateOwner(oldHash,undefined,timestamp)).toThrow('sign-in changed');
    expect(app.repository.db.prepare('SELECT count(*) AS count FROM sessions').get()).toEqual({count:0});
    expect(app.repository.authenticateOwner(resetHash,undefined,timestamp).session.authenticated).toBe(1);
  });
  it('expires anonymous and authenticated sessions on the server regardless of browser cookie state',async()=>{
    const initial=await app.inject({url:'/api/session'});
    cookie=initial.cookies[0].name+'='+initial.cookies[0].value;csrf=initial.json().csrfToken;
    clock+=16*60*1000;
    expect((await app.inject({method:'POST',url:'/api/login',headers:requestHeaders(),payload:{password}})).statusCode).toBe(403);
    await login();
    clock+=8*24*60*60*1000;
    expect((await app.inject({url:'/api/snapshot',headers:{cookie}})).statusCode).toBe(401);
    const refreshed=await app.inject({url:'/api/session',headers:{cookie}});
    expect(refreshed.json().authenticated).toBe(false);
    expect(refreshed.cookies[0].value).not.toBe(cookie.split('=')[1]);
  });
  it('rejects oversized requests without exposing payloads or personal records',async()=>{
    await login();
    const result=await app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:{privateDiary:'PRIVATE-PAYLOAD-'+ 'x'.repeat(1024*1024)}});
    expect(result.statusCode).toBe(413);
    expect(result.body).not.toContain('PRIVATE-PAYLOAD');
    expect(app.repository.snapshot().revision).toBe(0);
  });
  it('rejects insecure deployment origins and only explicitly enables loopback development',async () => {
    await expect(createApp({dbPath:':memory:',origin:'http://caminos.example'})).rejects.toThrow('HTTPS');
    await expect(createApp({dbPath:':memory:',origin:'http://127.0.0.1:5190'})).rejects.toThrow('HTTPS');
    await expect(createApp({dbPath:':memory:',origin:'https://caminos.test/'})).rejects.toThrow('exact');
    const local=await createApp({dbPath:':memory:',origin:'http://127.0.0.1:5190',allowInsecureLocalhost:true});
    const result=await local.inject({url:'/api/session'});
    expect(result.cookies[0].name).toBe('hermes_dev_session');
    await local.close();
  });
});

describe('public assets cannot expose private files',()=>{
  it('serves the built shell and assets with Fastify 5 while blocking dotfiles, source files, maps and traversal',async()=>{
    const staticRoot=join(directory,'dist');mkdirSync(join(staticRoot,'assets'),{recursive:true});
    writeFileSync(join(staticRoot,'index.html'),'<!doctype html><title>Caminos static integration</title>');
    writeFileSync(join(staticRoot,'assets','main.js'),'document.title="Caminos";');
    writeFileSync(join(staticRoot,'private.json'),'PRIVATE-PAYLOAD-JSON');
    writeFileSync(join(staticRoot,'.env'),'PRIVATE-PAYLOAD-ENV');
    writeFileSync(join(staticRoot,'assets','main.js.map'),'PRIVATE-PAYLOAD-SOURCE');
    const server=await createApp({dbPath:join(directory,'static-api.sqlite'),origin,staticDir:staticRoot});
    try {
      expect((await server.inject({url:'/'})).body).toContain('Caminos static integration');
      expect((await server.inject({url:'/schedule'})).body).toContain('Caminos static integration');
      expect((await server.inject({url:'/assets/main.js'})).body).toContain('document.title');
      for(const url of ['/private.json','/.env','/assets/main.js.map','/../private.sqlite','/%2e%2e/private.sqlite','/assets/../../private.sqlite','/server/cli.ts']) {
        const result=await server.inject({url});
        expect(result.statusCode,url).toBeGreaterThanOrEqual(400);
        expect(result.body).not.toContain('PRIVATE-PAYLOAD');
        expect(result.body).not.toContain('SQLite format');
      }
      for(const url of ['/%61pi/unknown','/totally-unknown-view','/%61pi/snapshot']) {
        const response=await server.inject({url});
        expect(response.body).not.toContain('ledgers');
        expect(response.body).not.toContain('password_hash');
        expect(response.body).not.toContain('PRIVATE-PAYLOAD');
      }
      expect((await server.inject({url:'/assets/main.js'})).headers['cache-control']).toContain('no-store');
    } finally {await server.close();}
    await expect(createApp({dbPath:join(staticRoot,'private.sqlite'),origin,staticDir:staticRoot})).rejects.toThrow('cannot be inside');
  });
});

describe('durable command API',() => {
  it('validates, saves, retries once, detects conflicting edits, and never double-moves money',async () => {
    await login();
    const command=envelope({type:'ledger.adjust',area:'personal',account:100000,cash:100000,earned:0,lost:0,reason:'Synthetic initial balance'});
    const first=await app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:command});
    expect(first.statusCode).toBe(200);
    expect(first.json().snapshot.revision).toBe(1);
    const reserve=envelope({type:'envelope.create',envelope:{title:'Gym',area:'personal',amount:10000,purpose:'Three visits',expiresAt:'2026-09-20T23:00:00Z',notes:''}},1);
    expect((await app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:reserve})).statusCode).toBe(200);
    const retry=await app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:reserve});
    expect(retry.statusCode).toBe(200);
    expect(retry.json().snapshot.revision).toBe(2);
    expect(retry.json().snapshot.ledgers.find((x:{area:string})=>x.area==='personal').cash).toBe(90000);
    const stale=await app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:envelope({type:'settings.save',name:'Changed',timezone:'America/New_York'},1)});
    expect(stale.statusCode).toBe(409);
    expect(stale.json().code).toBe('REVISION_CONFLICT');
    expect(stale.json().currentRevision).toBe(2);
    const altered=await app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:{...command,command:{...command.command,reason:'Changed request'}}});
    expect(altered.statusCode).toBe(409);
    expect(altered.json().code).toBe('REQUEST_ID_REUSED');
    const invalid=await app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:envelope({type:'ledger.adjust',area:'personal',account:0,cash:-1,earned:0,lost:0,reason:'Bad money'},2)});
    expect(invalid.statusCode).toBe(400);
    expect(app.repository.snapshot().revision).toBe(2);
  });
  it('keeps independent service databases and accepts only one concurrent writer revision',async () => {
    await login();
    const [one,two]=await Promise.all([
      app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:envelope({type:'settings.save',name:'One',timezone:'America/New_York'})}),
      app.inject({method:'POST',url:'/api/commands',headers:requestHeaders(),payload:envelope({type:'settings.save',name:'Two',timezone:'America/New_York'})}),
    ]);
    expect([one.statusCode,two.statusCode].sort()).toEqual([200,409]);
    const other=new Repository(join(directory,'separate.sqlite'),{intent:'initialize-if-missing',allowDraftFormat:true});
    expect(other.snapshot().revision).toBe(0);
    expect(other.ownerHash()).toBeUndefined();
    expect(other.session(cookie.split('=')[1],timestamp)).toBeUndefined();
    other.close();
  });
  it('exports only records, searches journal text and persists through verified backup',async () => {
    await login();
    app.repository.execute(envelope({type:'day.start',date:'2026-09-18',wakeAt:'2026-09-18T12:00:00Z'}));
    const day=app.repository.snapshot().days[0];
    app.repository.execute(envelope({type:'day.save',id:day.id,summary:'Recorded wake time.',journal:'Synthetic lighthouse journal'},1));
    const search=await app.inject({url:'/api/search?q=lighthouse',headers:{cookie}});
    expect(search.json()).toHaveLength(1);
    expect(search.json()[0].type).toBe('day');
    const exported=await app.inject({url:'/api/export',headers:{cookie}});
    expect(exported.headers['content-disposition']).toContain('attachment');
    expect(exported.json().state.days[0].journal).toBe('Synthetic lighthouse journal');
    expect(exported.body).not.toContain('password_hash');
    expect(exported.body).not.toContain('csrf');
    const backup=join(directory,'backup.sqlite');
    await app.repository.backup(backup);
    expect(Repository.verifyBackup(backup).revision).toBe(2);
    const restored=new Repository(backup);
    expect(restored.snapshot()).toEqual(app.repository.snapshot());
    restored.close();
    expect(statSync(backup).mode & 0o777).toBe(0o600);
    expect(statSync(join(directory,'private.sqlite')).mode & 0o777).toBe(0o600);
    expect(readFileSync(backup).subarray(0,15).toString()).toBe('SQLite format 3');
    await expect(app.repository.backup(backup)).rejects.toThrow('new destination');
  });
});
