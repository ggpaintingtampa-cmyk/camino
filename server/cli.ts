#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { copyFileSync, constants, existsSync, mkdirSync, readFileSync, statSync, chmodSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import argon2 from 'argon2';
import { Repository } from './repository.js';
import { commandEnvelopeSchema } from '../shared/schema.js';
import { appEnvironment } from './environment.js';

const args = process.argv.slice(2);
const action = args[0] ?? 'help';
const option = (name:string):string|undefined => {
  const index = args.indexOf(name);
  if (index < 0) return undefined;
  if (!args[index+1] || args[index+1].startsWith('--')) throw new Error(`${name} requires a value.`);
  return args[index+1];
};
const dbPath = resolve(option('--db') ?? appEnvironment('DB') ?? '.data/hermes.sqlite');
const output = (value:unknown) => process.stdout.write(`${JSON.stringify(value,null,2)}\n`);
async function stdin(limit = 1024*1024):Promise<string> {
  let text = '';
  for await (const chunk of process.stdin) {
    text += chunk.toString();
    if (Buffer.byteLength(text)>limit) throw new Error('Input is too large.');
  }
  return text;
}
async function secret(prompt:string):Promise<string> {
  if (!process.stdin.isTTY) throw new Error('Owner setup needs an interactive terminal, or --password-stdin with a secure pipe.');
  process.stderr.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolveSecret,reject) => {
    let value = '';
    const finish = () => {process.stdin.off('data',read);process.stdin.setRawMode(false);process.stdin.pause();process.stderr.write('\n');};
    const read = (chunk:Buffer) => {
      for (const char of chunk.toString()) {
        if (char === '\u0003') { finish();reject(new Error('Owner setup cancelled.'));return; }
        if (char === '\r' || char === '\n') {finish();resolveSecret(value);return;}
        if (char === '\u007f' || char === '\b') value = value.slice(0,-1);
        else if (char >= ' ') value += char;
      }
    };
    process.stdin.on('data',read);
  });
}

async function main():Promise<void> {
  process.umask(0o077);
  if (action === 'help' || action === '--help') {
    process.stdout.write(`Caminos private command tool\n\n`+
      `  owner-setup [--replace] [--password-stdin]  Set an independent owner password\n`+
      `  setup-link                                Generate a private one-use 15-minute setup URL\n`+
      `  snapshot                                  Read all personal records\n`+
      `  command --file PATH                       Apply a JSON CommandEnvelope\n`+
      `  command --stdin                           Apply a JSON CommandEnvelope from stdin\n`+
      `  export [--out NEW_FILE]                    Export records without credentials\n`+
      `  backup [--out NEW_FILE]                    Make and verify a private SQLite backup\n`+
      `  verify --file BACKUP                       Read-only backup integrity check\n`+
      `  restore-scratch --file BACKUP --out NEW_DB  Restore into a new isolated database\n`+
      `  All database actions accept --db PATH or CAMINOS_DB. Never pass passwords as arguments.\n`);
    return;
  }
  if (action === 'verify') {
    const file = option('--file');
    if (!file) throw new Error('--file is required.');
    output({ok:true,...Repository.verifyBackup(resolve(file))});
    return;
  }
  if (action === 'restore-scratch') {
    const file = option('--file'); const out = option('--out');
    if (!file || !out) throw new Error('--file and --out are required.');
    const source = resolve(file); const destination = resolve(out);
    Repository.verifyBackup(source);
    if (source === destination || existsSync(destination)) throw new Error('Restore requires a new destination. Existing data is never overwritten.');
    mkdirSync(dirname(destination),{recursive:true,mode:0o700});
    copyFileSync(source,destination,constants.COPYFILE_EXCL);
    chmodSync(destination,0o600);
    // An offline restore cannot carry live browser sessions into a new installation.
    const restored = new Repository(destination);
    restored.db.prepare('DELETE FROM sessions').run();
    restored.close();
    output({ok:true,path:destination,...Repository.verifyBackup(destination)});
    return;
  }
  const repository = new Repository(dbPath);
  try {
    if (action === 'owner-setup') {
      if (repository.ownerHash() && !args.includes('--replace')) throw new Error('An owner already exists. Use --replace only for an intentional password reset; all sessions will be revoked.');
      const password = args.includes('--password-stdin') ? (await stdin(4096)).replace(/\r?\n$/,'') : await secret('New Caminos password (hidden): ');
      if (password.length < 12 || password.length > 1024) throw new Error('Use a password of 12–1024 characters.');
      if (!args.includes('--password-stdin') && password !== await secret('Repeat password (hidden): ')) throw new Error('The passwords did not match. No change was made.');
      const hash = await argon2.hash(password,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});
      repository.setOwnerHash(hash);
      output({ok:true,message:'Private owner configured. Previous sessions revoked.'});
    } else if (action === 'setup-link') {
      const origin=appEnvironment('ORIGIN') ?? 'https://hermes.andresinbox.tech';
      const parsed=new URL(origin);
      const insecure=appEnvironment('ALLOW_HTTP')==='1' && parsed.protocol==='http:' && ['localhost','127.0.0.1','[::1]'].includes(parsed.hostname);
      if(parsed.origin!==origin || (parsed.protocol!=='https:' && !insecure)) throw new Error('Set an exact HTTPS CAMINOS_ORIGIN before generating the setup link, or explicitly allow HTTP loopback development.');
      const setup=repository.createSetupToken();
      output({url:`${origin}/#/setup?token=${setup.raw}`,expiresAt:new Date(setup.expires).toISOString(),message:'Private single-use setup link. Share only with the owner; do not save in logs.'});
    } else if (action === 'snapshot') output(repository.snapshot());
    else if (action === 'command') {
      const file = option('--file');
      if (!file && !args.includes('--stdin')) throw new Error('Provide --file or --stdin with a CommandEnvelope.');
      if (file && statSync(file).size > 1024*1024) throw new Error('Command file exceeds 1 MB.');
      const text = file ? readFileSync(file,'utf8') : await stdin();
      const envelope = commandEnvelopeSchema.parse(JSON.parse(text));
      const state = repository.execute(envelope);
      output({ok:true,requestId:envelope.requestId,revision:state.revision});
    } else if (action === 'export') {
      const value = {format:'caminos-owner-export',version:1,exportedAt:new Date().toISOString(),state:repository.snapshot()};
      const out = option('--out');
      if (out) {writeFileSync(resolve(out),`${JSON.stringify(value,null,2)}\n`,{mode:0o600,flag:'wx'});output({ok:true,path:resolve(out)});}
      else output(value);
    } else if (action === 'backup') {
      const defaultPath = `/var/backups/hermes/caminos-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID().slice(0,8)}.sqlite`;
      output({ok:true,...await repository.backup(option('--out') ?? defaultPath)});
    } else throw new Error('Unknown action. Run caminosctl help.');
  } finally { repository.close(); }
}

main().catch((error:unknown) => {
  const message = error instanceof Error ? error.message : 'The command failed.';
  // Validation errors can echo entered journal content. CLI returns a simple description.
  process.stderr.write(`${error instanceof Error && ['ZodError','SyntaxError'].includes(error.name) ? 'Invalid command JSON. Check shared/schema.ts for accepted fields.' : message}\n`);
  process.exitCode = 1;
});
