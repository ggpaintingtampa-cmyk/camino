import {resolve} from 'node:path';
import {createBrowserHarness} from './support/browser-harness';
import {browserHarnessConfig} from './support/browser-config';

const config=browserHarnessConfig();
const {app,close}=await createBrowserHarness(config,resolve('dist'));
let closing=false;
async function shutdown() {
  if(closing)return;
  closing=true;
  await close();
}
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,()=>{
  void shutdown().catch(()=>{process.exitCode=1;});
});
try {
  await app.listen({port:config.port,host:'127.0.0.1'});
  process.stdout.write(`Synthetic Caminos browser fixture ready on ${config.port}.\n`);
} catch(error) {
  await shutdown();
  throw error;
}
