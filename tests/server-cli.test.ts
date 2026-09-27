import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Repository } from '../server/repository.js';

const directories:string[]=[];
afterEach(()=>{for(const path of directories.splice(0))rmSync(path,{recursive:true,force:true});});
describe('private local command and recovery tool',()=>{
  it('provisions privately, shares validated commands, and restores a verified scratch database with sessions revoked',async()=>{
    const dir=mkdtempSync(join(tmpdir(),'caminos-cli-test-'));directories.push(dir);
    const db=join(dir,'original.sqlite');
    const invoke=(args:string[],input?:string)=>JSON.parse(execFileSync(process.execPath,['--import','tsx',resolve('server/cli.ts'),...args,'--db',db],{cwd:resolve('.'),input,encoding:'utf8',env:{...process.env,HERMES_ORIGIN:'https://caminos.test'}}));
    expect(invoke(['owner-setup','--password-stdin','--allow-draft-format'],'synthetic-secret-only-in-test-2026\n').ok).toBe(true);
    const request={requestId:randomUUID(),baseRevision:0,command:{type:'ledger.adjust',area:'personal',account:50000,cash:50000,earned:0,lost:0,reason:'Synthetic recovery test'}};
    expect(invoke(['command','--stdin'],JSON.stringify(request)).revision).toBe(1);
    expect(invoke(['command','--stdin'],JSON.stringify(request)).revision).toBe(1);
    const source=new Repository(db);
    const session=source.createSession(true,Date.now());
    const expected=source.snapshot();source.close();
    const backup=join(dir,'backup.sqlite');
    expect(invoke(['backup','--out',backup]).revision).toBe(1);
    expect(invoke(['verify','--file',backup]).ok).toBe(true);
    const destination=join(dir,'scratch','restored.sqlite');
    expect(invoke(['restore-scratch','--file',backup,'--out',destination]).ok).toBe(true);
    const restored=new Repository(destination);
    expect(restored.snapshot()).toEqual(expected);
    expect(restored.session(session.raw,Date.now())).toBeUndefined();
    expect(restored.execute(request as Parameters<Repository['execute']>[0]).revision).toBe(1);
    restored.close();
    expect(statSync(destination).mode & 0o777).toBe(0o600);
    expect(invoke(['export']).state).toEqual(expected);
  },20_000);
});
