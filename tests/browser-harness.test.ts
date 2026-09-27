import {afterEach,expect,it} from 'vitest';
import {existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp,type CaminosApp} from '../server/app';
import {browserHarnessConfig,defaultTestNow} from './support/browser-config';
import {createBrowserHarness} from './support/browser-harness';

const cleanups:Array<()=>Promise<void>>=[];
afterEach(async()=>{for(const cleanup of cleanups.splice(0).reverse())await cleanup();});
async function fixture(env:NodeJS.ProcessEnv={CAMINOS_TEST_SCENARIO:'empty'}) {
  const config=browserHarnessConfig(env);
  const result=await createBrowserHarness(config);
  cleanups.push(result.close);
  return {...result,config};
}
async function login(app:CaminosApp,origin:string) {
  const session=await app.inject({method:'GET',url:'/api/session'});
  const result=await app.inject({method:'POST',url:'/api/login',headers:{origin,cookie:`${session.cookies[0].name}=${session.cookies[0].value}`,'x-csrf-token':session.json().csrfToken},payload:{password:'caminos-fixture-password'}});
  expect(result.statusCode).toBe(200);
  return {origin,cookie:`${result.cookies[0].name}=${result.cookies[0].value}`,'x-csrf-token':result.json().csrfToken};
}

it('isolates daily and empty fixtures and removes only their own databases on close',async()=>{
  const ignoredDirectory=mkdtempSync(join(tmpdir(),'caminos-unused-config-'));
  const ignoredPath=join(ignoredDirectory,'never-open.sqlite');
  cleanups.push(async()=>{rmSync(ignoredDirectory,{recursive:true,force:true});});
  const daily=await fixture({CAMINOS_TEST_SCENARIO:'daily',CAMINOS_DB:ignoredPath});
  const empty=await fixture();
  expect(daily.directory).not.toBe(empty.directory);
  expect(existsSync(ignoredPath)).toBe(false);
  expect(daily.app.repository.snapshot().tasks.length).toBeGreaterThan(0);
  expect(empty.app.repository.snapshot().tasks).toEqual([]);
  expect(existsSync(join(daily.directory,'fixture.sqlite'))).toBe(true);
  await daily.close();
  expect(existsSync(daily.directory)).toBe(false);
  expect(existsSync(join(empty.directory,'fixture.sqlite'))).toBe(true);
  await empty.close();
  expect(existsSync(empty.directory)).toBe(false);
});

it('advances trusted server time for persisted commands without changing revision itself',async()=>{
  const {app,config,advanceClock}=await fixture({CAMINOS_TEST_SCENARIO:'empty',CAMINOS_TEST_NOW:'2026-11-01T05:55:00.000Z'});
  const headers=await login(app,config.origin);
  const before=app.repository.snapshot().revision;
  expect(advanceClock(10*60*1000)).toBe('2026-11-01T06:05:00.000Z');
  expect(app.repository.snapshot().revision).toBe(before);
  const saved=await app.inject({method:'POST',url:'/api/commands',headers,payload:{requestId:crypto.randomUUID(),baseRevision:before,command:{type:'task.save',task:{id:'clock-task',title:'Synthetic clock task',duration:10,tag:'Personal',labels:[],notes:'',status:'open'}}}});
  expect(saved.statusCode).toBe(200);
  expect(app.repository.snapshot().tasks[0].createdAt).toBe('2026-11-01T06:05:00.000Z');
});

it('rejects invalid clock advances and exposes no clock route even to an authenticated owner',async()=>{
  const {app,config,advanceClock}=await fixture();
  const headers=await login(app,config.origin);
  expect((await app.inject({method:'POST',url:'/api/__test/clock',headers,payload:{advanceMs:1000}})).statusCode).toBe(404);
  for(const milliseconds of [-1,0,0.5,32*86400000,NaN,Infinity])expect(()=>advanceClock(milliseconds)).toThrow();
  const snapshot=await app.inject({method:'GET',url:'/api/snapshot',headers});
  expect(snapshot.json().serverNow).toBe(defaultTestNow);
});

it('does not register test controls in the production app factory',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'caminos-harness-boundary-'));
  const app=await createApp({dbPath:join(directory,'private.sqlite'),origin:'https://caminos.test'});
  cleanups.push(async()=>{await app.close();rmSync(directory,{recursive:true,force:true});});
  expect(app.hasRoute({method:'POST',url:'/api/__test/clock'})).toBe(false);
});

it('refuses an occupied port without reusing the other fixture and cleans the failed fixture',async()=>{
  const first=await fixture();
  const address=new URL(await first.app.listen({host:'127.0.0.1',port:0}));
  const second=await fixture();
  await expect(second.app.listen({host:'127.0.0.1',port:Number(address.port)})).rejects.toMatchObject({code:'EADDRINUSE'});
  await second.close();
  expect(existsSync(second.directory)).toBe(false);
  expect((await fetch(new URL('/healthz',address))).status).toBe(200);
});

it('validates test-only configuration before opening any fixture',()=>{
  for(const port of ['0','80','65536','5197x','1e4','-1'])expect(()=>browserHarnessConfig({CAMINOS_TEST_PORT:port})).toThrow();
  expect(()=>browserHarnessConfig({CAMINOS_TEST_SCENARIO:'live'})).toThrow();
  expect(()=>browserHarnessConfig({CAMINOS_TEST_NOW:'not-a-date'})).toThrow();
  expect(()=>browserHarnessConfig({CAMINOS_TEST_NOW:'2026-11-01T05:00:00Z'})).toThrow(/requires.*empty/);
  expect(browserHarnessConfig({CAMINOS_TEST_PORT:'5298',CAMINOS_TEST_SCENARIO:'empty',CAMINOS_TEST_NOW:'2026-03-08T01:55:00-05:00'}).origin).toBe('http://127.0.0.1:5298');
});
