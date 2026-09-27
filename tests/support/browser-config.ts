import {z} from 'zod';

export const defaultTestNow='2026-09-18T14:10:00.000Z';
export interface BrowserHarnessConfig {
  port:number;
  origin:string;
  scenario:'daily'|'empty';
  initialNow:string;
}

// Only test-specific environment keys are read; never inherit a production DB path.
export function browserHarnessConfig(env:NodeJS.ProcessEnv=process.env):BrowserHarnessConfig {
  const rawPort=env.CAMINOS_TEST_PORT??'5197';
  if(!/^\d+$/.test(rawPort))throw new Error('CAMINOS_TEST_PORT must be an integer from 1024 to 65535.');
  const port=Number(rawPort);
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('CAMINOS_TEST_PORT must be an integer from 1024 to 65535.');
  const scenario=z.enum(['daily','empty']).parse(env.CAMINOS_TEST_SCENARIO??'daily');
  const initialNow=z.iso.datetime({offset:true}).parse(env.CAMINOS_TEST_NOW??defaultTestNow);
  if(scenario==='daily'&&Date.parse(initialNow)!==Date.parse(defaultTestNow))throw new Error('A custom initial clock requires CAMINOS_TEST_SCENARIO=empty; daily seed dates are fixed.');
  return {port,origin:`http://127.0.0.1:${port}`,scenario,initialNow};
}
