import {test,expect,type Page} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {initialState,applyCommand} from '../../shared/domain';
import type {Command,Snapshot} from '../../shared/types';

// Screenshots use a deterministic in-memory snapshot, never an owner's records.
function designFixture():Snapshot {
  const now='2026-09-18T14:10:00.000Z';
  let state=initialState();
  const put=(command:Command,at=now)=>{state=applyCommand(state,command,at);};
  put({type:'settings.save',name:'Andre',timezone:'America/New_York'});
  put({type:'day.start',date:'2026-09-18',wakeAt:'2026-09-18T11:00:00Z',mood:4,energy:3,note:'A little space to focus.'});
  put({type:'task.save',task:{id:'focus',title:'Build a little momentum',duration:30,tag:'Personal',labels:[],notes:'',status:'open'}});
  put({type:'block.save',block:{id:'focus-block',taskId:'focus',title:'Build a little momentum',kind:'task',tag:'Personal',start:'2026-09-18T14:00:00Z',end:'2026-09-18T14:30:00Z',notes:'',status:'pending'}});
  put({type:'block.start',id:'focus-block'},'2026-09-18T14:02:00Z');
  put({type:'block.save',block:{id:'expired',title:'Call dentist',kind:'task',tag:'Personal',start:'2026-09-18T13:00:00Z',end:'2026-09-18T13:15:00Z',notes:'',status:'pending'}});
  for(const [id,title,tag,start,end] of [['work','Project check-in','Work','15:00','16:00'],['doctor','Annual check-up','Personal','18:00','18:30']] as const)put({type:'block.save',block:{id,title,kind:'appointment',tag,start:`2026-09-18T${start}:00Z`,end:`2026-09-18T${end}:00Z`,notes:'',status:'pending'}});
  put({type:'goal.save',goal:{id:'desk',title:'Desk setup',targetDate:'2026-09-30',notes:'A comfortable place to focus.',status:'active',checked:false,pinned:false}});
  put({type:'task.save',task:{id:'backlog',title:'Research new monitors',duration:30,tag:'Personal',goalId:'desk',labels:[],notes:'',status:'open'}});
  put({type:'task.save',task:{id:'work-task',title:'Update portfolio site',duration:60,tag:'Work',labels:[],notes:'',status:'open'}});
  put({type:'task.save',task:{id:'finished-task',title:'Write weekly report',duration:45,tag:'Work',labels:[],notes:'',status:'complete'}});
  put({type:'goal.save',goal:{id:'year',title:'Build a stronger, calmer year',targetDate:'2026-12-31',notes:'Small steps add up.',status:'active',checked:false,pinned:false}});
  for(const [id,title,checked] of [['gym','Show up for three workouts',false],['sleep','Keep a steady bedtime',true]] as const)put({type:'goal.save',goal:{id,title,parentId:'year',targetDate:'2026-09-25',notes:'',status:checked?'completed':'active',checked,pinned:false}});
  for(const [kind,value] of [['steps',2840],['weight',180.5]] as const)put({type:'log.save',log:{kind,at:now,value,category:'',description:'',notes:''}});
  put({type:'log.save',log:{kind:'sleep',at:'2026-09-18T11:00:00Z',start:'2026-09-18T03:30:00Z',end:'2026-09-18T11:00:00Z',quality:4,category:'',description:'',notes:''}});
  put({type:'log.save',log:{kind:'food',at:'2026-09-18T12:00:00Z',category:'Breakfast',description:'Eggs and toast',notes:''}});
  put({type:'log.save',log:{kind:'workout',at:'2026-09-18T12:45:00Z',duration:30,category:'Strength',description:'Morning strength session',notes:''}});
  put({type:'log.save',log:{kind:'rocket',at:'2026-09-18T13:15:00Z',duration:25,category:'Free play',description:'Recoveries and controlled touches',notes:''}});
  put({type:'ledger.adjust',area:'personal',account:120000,cash:120000,earned:0,lost:0,reason:'Synthetic design fixture'});
  put({type:'envelope.create',envelope:{id:'gym-money',area:'personal',title:'Three visits to the gym',amount:10000,purpose:'Show up three times this week',expiresAt:'2026-09-20T23:00:00Z',notes:''}});
  put({type:'reminder.save',reminder:{title:'Drink some water',body:'A small pause in your day.',startsAt:'2026-09-18T11:00:00Z',pinned:true,dismissed:false,source:'owner'}});
  put({type:'day.save',id:state.days[0].id,summary:'Woke at 7:00 AM. Recorded 7h 30m of sleep, 2,840 steps and a morning workout. Two appointments are scheduled for later today.',journal:'A calm start. I want to make room for the things that matter.'});
  return {...state,serverNow:now};
}

test('all eighteen redesigned screens render and new navigation controls work',async({page},info)=>{
  test.setTimeout(90000);
  let fixture=designFixture();
  await page.route('**/api/snapshot',route=>route.fulfill({json:fixture}));
  await page.route('**/api/weather?*',route=>route.fulfill({json:{locationId:fixture.locations[0].id,temperature:82,shortForecast:'Partly cloudy. A gentle start.',high:89,low:74,precipitation:20,fetchedAt:fixture.serverNow,stale:false,attribution:'Synthetic weather · design fixture',periods:[{name:'Tonight',temperature:74,forecast:'Partly cloudy'},{name:'Saturday',temperature:87,forecast:'Chance of showers'},{name:'Saturday night',temperature:73,forecast:'Mostly clear'}]}}));
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByLabel('Your password').fill('caminos-fixture-password');await page.getByRole('button',{name:'Open my day'}).click();
  await expect(page.locator('.v2-home')).toBeVisible();
  mkdirSync('artifacts/redesign-v2',{recursive:true});
  const capture=async(name:string)=>{await expect(page.getByText('A screen needs a fresh start.')).toHaveCount(0);await page.mouse.move(0,0);await page.screenshot({path:`artifacts/redesign-v2/${name}-${info.project.name}.png`});};
  const open=async(route:string,name=route)=>{await page.goto(`/#/${route}`);await expect(page.locator('.content h1')).toBeVisible();await page.locator('.content').evaluate(e=>{e.scrollTop=0;});await capture(name);};
  await expect(page.locator('.weather-temp')).toContainText('82°');
  await capture('home-active');
  await page.getByRole('button',{name:'Update task',exact:true}).click();await capture('task-outcome');await close(page);
  await page.getByRole('button',{name:'End day',exact:true}).click();await capture('end-day');await close(page);
  await page.getByRole('button',{name:'Add',exact:true}).click();await capture('add-menu');
  await page.getByRole('dialog').getByRole('button',{name:'Task',exact:true}).click();await capture('add-task');await close(page);
  for(const route of ['schedule','goals','health','history','money','more','tasks','reminders','settings','rocket','weather'])await open(route,route==='history'?'journal':route==='money'?'envelopes':route==='tasks'?'task-list':route);
  await open('tasks');await page.getByRole('button',{name:'Filter tasks'}).click();await page.getByRole('button',{name:'Work',exact:true}).click();await expect(page.locator('.task-list-card')).toHaveCount(1);await expect(page.locator('.task-list-card')).toContainText('Update portfolio site');
  await expect(page.getByRole('link',{name:'More',exact:true})).toHaveAttribute('aria-current','page');
  fixture={...fixture,days:[]};
  await page.goto('/#/home');await page.reload();await expect(page.getByRole('button',{name:'Start my day',exact:true})).toBeVisible();await expect(page.locator('.weather-temp')).toContainText('82°');await capture('home-precheckin');
  await page.getByRole('button',{name:'Start my day',exact:true}).click();await capture('start-day');await close(page);
  expect(errors).toEqual([]);
});

async function close(page:Page){const dialog=page.getByRole('dialog');const closeButton=dialog.getByRole('button',{name:'Close',exact:true});if(await closeButton.isVisible())await closeButton.click();else await dialog.getByRole('button',{name:'Skip for now',exact:true}).click();await expect(dialog).toHaveCount(0);}

test('daily summaries respect the owner timezone and completed follow-up work',async({page})=>{
  const fixture=designFixture();
  fixture.settings.timezone='America/Los_Angeles';
  fixture.serverNow='2026-09-19T04:10:00.000Z';
  fixture.blocks=fixture.blocks.map(b=>b.id==='focus-block'?{...b,status:'complete',actualEnd:b.end}:b.id==='doctor'?{...b,start:'2026-09-19T04:00:00.000Z',end:'2026-09-19T04:30:00.000Z'}:b);
  fixture.envelopes.push({...fixture.envelopes[0],id:'old-envelope',title:'Earlier commitment',expiresAt:'2026-09-17T20:00:00.000Z'});
  fixture.tasks.push({...fixture.tasks.find(t=>t.id==='finished-task')!,id:'partially-finished',title:'Earlier report session',status:'partial',remainingTaskId:'finished-task'});
  await page.route('**/api/snapshot',route=>route.fulfill({json:fixture}));
  await page.goto('/');await page.getByLabel('Your password').fill('caminos-fixture-password');await page.getByRole('button',{name:'Open my day'}).click();
  await expect(page.locator('.appointment-row').filter({hasText:'Annual check-up'})).toContainText('9:00 PM');
  await expect(page.getByRole('button',{name:'Start now',exact:true})).toHaveCount(0);
  await expect(page.locator('.ahead-card button').filter({hasText:'Envelopes expiring'}).locator('b')).toHaveText('1');
  await page.goto('/#/tasks');
  await expect(page.locator('.task-list-cards').nth(1)).toContainText('Write weekly report');
  await expect(page.locator('.task-history-row').filter({hasText:'Earlier report session'})).toContainText('Follow-up complete');
  await expect(page.locator('.task-history-row').filter({hasText:'Earlier report session'})).not.toContainText('45m remaining');
});
