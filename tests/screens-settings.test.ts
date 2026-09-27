import {describe,expect,it} from 'vitest';
import {applyCommand,initialState} from '../shared/domain';
import {commandSchema} from '../shared/schema';

describe('main navigation preferences',()=>{
 it('persists a complete custom order while older settings commands preserve it',()=>{
  const now='2026-09-18T14:10:00Z';
  const original=initialState();
  const changed=applyCommand(original,{type:'settings.save',name:'Owner',timezone:'America/New_York',navOrder:['goals','home','schedule','more']},now);
  expect(changed.settings.navOrderV3).toEqual(['home','schedule','tasks','history','more']);
  expect(original.settings.navOrder).toBeUndefined();
  const renamed=applyCommand(changed,{type:'settings.save',name:'Andre',timezone:'America/New_York'},now);
  expect(renamed.settings.navOrderV3).toEqual(changed.settings.navOrderV3);
 });
 it('rejects omissions, duplicate tabs and unknown routes',()=>{
  const settings={type:'settings.save',name:'Owner',timezone:'America/New_York'};
  for(const navOrder of [['home','goals','more'],['home','home','goals','more'],['home','schedule','goals','health']])expect(commandSchema.safeParse({...settings,navOrder}).success).toBe(false);
 });
});
