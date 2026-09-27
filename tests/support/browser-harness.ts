import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import argon2 from 'argon2';
import {z} from 'zod';
import {createApp,type CaminosApp} from '../../server/app';
import type {Command} from '../../shared/types';
import {type BrowserHarnessConfig} from './browser-config';

// Clock control is a test-code callback, never an HTTP route or database-path input.
export async function createBrowserHarness(config:BrowserHarnessConfig,staticDir?:string) {
  let app:CaminosApp|undefined;
  let clock=Date.parse(config.initialNow);
  const initialNow=new Date(clock).toISOString();
  const directory=mkdtempSync(join(tmpdir(),'caminos-browser-test-'));
  try {
    app=await createApp({
      dbPath:join(directory,'fixture.sqlite'),origin:config.origin,
      allowInsecureLocalhost:true,staticDir,now:()=>clock,
      weather:{
        search:async q=>[{name:`${q}, Florida, United States`,latitude:28.22,longitude:-82.46}],
        forecast:async l=>({locationId:l.id,temperature:82,shortForecast:'Partly cloudy. A gentle start.',high:89,low:74,precipitation:20,fetchedAt:new Date(clock).toISOString(),stale:false,attribution:'Synthetic weather · test fixture',periods:[]}),
      },
    });
    const fixtureApp=app;
    const advanceClock=(milliseconds:number)=>{
      const advanceMs=z.number().int().positive().max(31*24*60*60*1000).parse(milliseconds);
      const next=clock+advanceMs;
      if(!Number.isFinite(new Date(next).getTime()))throw Object.assign(new Error('Invalid synthetic clock.'),{statusCode:400});
      clock=next;
      return new Date(clock).toISOString();
    };
    app.repository.setOwnerHash(await argon2.hash('caminos-fixture-password'));
    if(config.scenario==='daily')seedDaily(fixtureApp,initialNow);
    const close=async()=>{
      try {await fixtureApp.close();}
      finally {rmSync(directory,{recursive:true,force:true});}
    };
    return {app:fixtureApp,directory,close,advanceClock};
  } catch(error) {
    try {if(app)await app.close();}
    finally {rmSync(directory,{recursive:true,force:true});}
    throw error;
  }
}

function seedDaily(app:CaminosApp,initialNow:string) {
  function command(command:Command,at=initialNow){app.repository.execute({requestId:crypto.randomUUID(),baseRevision:app.repository.snapshot().revision,command},at);}
  command({type:'settings.save',name:'Test Owner',timezone:'America/New_York'});
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
}
