import {expect,it} from 'vitest';
import {appEnvironment} from '../server/environment';

it('accepts existing deployment settings and gives Caminos configuration precedence',()=>{
  expect(appEnvironment('DB',{HERMES_DB:'/private/existing.sqlite'})).toBe('/private/existing.sqlite');
  expect(appEnvironment('DB',{HERMES_DB:'/private/existing.sqlite',CAMINOS_DB:'/private/chosen.sqlite'})).toBe('/private/chosen.sqlite');
  expect(appEnvironment('DB',{})).toBeUndefined();
});
