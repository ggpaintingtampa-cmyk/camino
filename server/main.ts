import { resolve } from 'node:path';
import { createApp } from './app.js';
import { appEnvironment } from './environment.js';

const port = Number(appEnvironment('PORT') ?? '3003');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('CAMINOS_PORT must be a valid unprivileged TCP port.');
const staticDir = appEnvironment('STATIC_DIR');
const app = await createApp({
  dbPath:appEnvironment('DB') ?? resolve('.data/hermes.sqlite'),
  origin:appEnvironment('ORIGIN') ?? 'https://hermes.andresinbox.tech',
  allowInsecureLocalhost:appEnvironment('ALLOW_HTTP') === '1',
  ...(staticDir ? {staticDir} : {}),
});
await app.listen({port,host:'127.0.0.1'});
process.stdout.write(`Caminos listening on loopback port ${port}.\n`);
for (const signal of ['SIGINT','SIGTERM'] as const) process.once(signal,async ()=>{await app.close();process.exit(0);});
