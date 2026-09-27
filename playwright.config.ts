import {defineConfig,devices} from '@playwright/test';
import {browserHarnessConfig} from './tests/support/browser-config';

const fixture=browserHarnessConfig();
export default defineConfig({
  testDir:'tests/e2e',fullyParallel:false,workers:1,timeout:30000,
  use:{baseURL:fixture.origin,trace:'retain-on-failure',screenshot:'only-on-failure'},
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome'],viewport:{width:390,height:844}}},
    {name:'webkit',use:{...devices['Desktop Safari'],viewport:{width:390,height:844}}},
  ],
  webServer:{
    command:'pnpm exec tsx tests/harness.ts',url:`${fixture.origin}/healthz`,
    reuseExistingServer:false,timeout:30000,
    gracefulShutdown:{signal:'SIGTERM',timeout:5000},
  },
  reporter:[['list'],['html',{open:'never'}]],
});
