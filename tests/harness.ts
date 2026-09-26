import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import argon2 from 'argon2';
import {createApp} from '../server/app';
import type {Command} from '../shared/types';

// Disposable synthetic records only. Never accepts a production database path.
const directory=mkdtempSync(join(tmpdir(),'caminos-browser-test-'));
const now='2026-09-18T14:10:00.000Z';
const app=await createApp({dbPath:join(directory,'fixture.sqlite'),origin:'http://127.0.0.1:5197',allowInsecureLocalhost:true,staticDir:resolve('dist'),now:()=>Date.parse(now),weather:{search:async q=>[{name:`${q}, Florida, United States`,latitude:28.22,longitude:-82.46}],forecast:async l=>({locationId:l.id,temperature:82,shortForecast:'Partly cloudy. A gentle start.',high:89,low:74,precipitation:20,fetchedAt:now,stale:false,attribution:'Synthetic weather · test fixture',periods:[]})}});
app.repository.setOwnerHash(await argon2.hash('caminos-fixture-password'));
function command(command:Command,at=now){app.repository.execute({requestId:crypto.randomUUID(),baseRevision:app.repository.snapshot().revision,command},at);}
command({type:'settings.save',name:'Andre',timezone:'America/New_York'});
command({type:'day.start',date:'2026-09-18',wakeAt:'2026-09-18T11:00:00Z',mood:4,energy:3,note:'A fresh morning and a little time to focus.'});
command({type:'task.save',task:{id:'focus-task',title:'Build a little momentum',duration:30,tag:'Personal',labels:[],notes:'One task at a time.',status:'open'}});
command({type:'block.save',block:{id:'focus-block',taskId:'focus-task',title:'Build a little momentum',kind:'task',tag:'Personal',start:'2026-09-18T14:00:00Z',end:'2026-09-18T14:30:00Z',notes:'',status:'pending'}});
command({type:'block.start',id:'focus-block'},'2026-09-18T14:02:00Z');
command({type:'task.save',task:{id:'overdue-task',title:'Morning stretch',duration:15,tag:'Personal',labels:['Health'],notes:'',status:'open'}});
command({type:'block.save',block:{id:'overdue-block',taskId:'overdue-task',title:'Morning stretch',kind:'task',tag:'Personal',start:'2026-09-18T12:00:00Z',end:'2026-09-18T12:15:00Z',notes:'',status:'pending'}});
for(const [id,title,start] of [['work','Project check-in','15:00'],['doctor','Annual check-up','18:00']])command({type:'block.save',block:{id,title,kind:'appointment',tag:id==='work'?'Work':'Personal',start:`2026-09-18T${start}:00Z`,end:`2026-09-18T${start==='15:00'?'16:00':'18:30'}:00Z`,notes:'',status:'pending'}});
command({type:'task.save',task:{id:'backlog',title:'Read twenty pages',duration:30,tag:'Personal',labels:[],notes:'',status:'open'}});
command({type:'goal.save',goal:{id:'goal-year',title:'Build a stronger, calmer year',targetDate:'2026-12-31',notes:'',status:'active',checked:false,pinned:true}});
command({type:'goal.save',goal:{id:'goal-step',parentId:'goal-year',title:'Show up for three workouts',targetDate:'2026-09-25',notes:'',status:'active',checked:false,pinned:false}});
command({type:'ledger.adjust',area:'personal',account:120000,cash:120000,earned:0,lost:0,reason:'Synthetic opening balance'});
command({type:'ledger.adjust',area:'company',account:400000,cash:400000,earned:0,lost:0,reason:'Synthetic opening balance'});
command({type:'envelope.create',envelope:{id:'gym-envelope',area:'personal',title:'Three visits to the gym',amount:10000,purpose:'Show up three times this week',expiresAt:'2026-09-20T23:00:00Z',notes:''}});
command({type:'envelope.create',envelope:{id:'expired-envelope',area:'company',title:'Finish the weekly review',amount:5000,purpose:'Review the week',expiresAt:'2026-09-18T12:00:00Z',notes:''}},'2026-09-17T10:00:00Z');
command({type:'log.save',log:{kind:'steps',at:'2026-09-18T14:00:00Z',value:2840,category:'',description:'',notes:''}});
command({type:'log.save',log:{kind:'sleep',at:'2026-09-18T11:00:00Z',start:'2026-09-18T03:30:00Z',end:'2026-09-18T11:00:00Z',quality:4,category:'',description:'',notes:''}});
command({type:'reminder.save',reminder:{title:'A small reminder',body:'Bring the notebook to your check-up.',startsAt:'2026-09-18T11:00:00Z',expiresAt:'2026-09-19T03:00:00Z',pinned:true,dismissed:false,source:'owner'}});
command({type:'template.save',template:{id:'weekday',title:'A steady weekday',blocks:[{title:'Shower and breakfast',kind:'routine',tag:'Personal',startMinute:420,duration:45,notes:''},{title:'First work session',kind:'task',tag:'Work',startMinute:540,duration:60,notes:''}]}});
await app.listen({port:5197,host:'127.0.0.1'});
process.stdout.write('Synthetic Caminos browser fixture ready on 5197.\n');
for(const signal of ['SIGINT','SIGTERM'] as const)process.once(signal,async()=>{await app.close();process.exit(0);});
