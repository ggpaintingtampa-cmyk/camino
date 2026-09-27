import { resolve } from 'node:path';
import { createApp } from './app.js';
import { appEnvironment } from './environment.js';
import { StorageError } from './repository.js';

const port = Number(appEnvironment('PORT') ?? '3003');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('CAMINOS_PORT must be a valid unprivileged TCP port.');
const staticDir = appEnvironment('STATIC_DIR');
// Starting the server may create a missing database. It never migrates an existing one: a
// legacy database stops the start before anything, authentication rows included, is written.
const app = await createApp({
  dbPath:appEnvironment('DB') ?? resolve('.data/hermes.sqlite'),
  origin:appEnvironment('ORIGIN') ?? 'https://hermes.andresinbox.tech',
  allowInsecureLocalhost:appEnvironment('ALLOW_HTTP') === '1',
  databaseIntent:'initialize-if-missing',
  allowDraftFormat:process.env.CAMINOS_ALLOW_DRAFT_FORMAT === '1',
  ...(staticDir ? {staticDir} : {}),
}).catch((error:unknown) => {
  if (!(error instanceof StorageError)) throw error;
  process.stderr.write(`${JSON.stringify({ok:false,code:error.code,message:error.message,...(error.recordIds ? {recordIds:error.recordIds} : {})})}\n`);
  process.exit(1);
});
await app.listen({port,host:'127.0.0.1'});
process.stdout.write(`Caminos listening on loopback port ${port}.\n`);
for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal,async ()=>{await app.close();process.exit(0);});
