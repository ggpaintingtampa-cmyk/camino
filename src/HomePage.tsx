import {useEffect,useState} from 'react';
import {ArrowRight,MapPin,Sun,Wallet,X} from 'lucide-react';
import type {Block,WeatherData} from '../shared/types';
import {addDays,dateKey as recordDate,timeLabel as formatTime} from '../shared/dates';
import {dailySteps,goalProgress,unscheduledTasks} from '../shared/selectors';
import * as api from './api';
import {money,type PageProps} from './ui';
import type {View} from './App';

export function HomePage({state,now,run,go,onResolve,onStart}:PageProps&{go:(view:View,kind?:string)=>void;onResolve:(block:Block)=>void;onStart:()=>void}) {
  const dateKey=(value:string)=>recordDate(value,state.settings.timezone);
  const timeLabel=(value:string)=>formatTime(value,state.settings.timezone);
  const day=state.days.find(d=>!d.archived&&!d.endedAt);
  const date=day?.date??dateKey(now);
  const closedToday=state.days.find(d=>!d.archived&&d.date===date&&d.startedAt&&d.endedAt);
  const ts=Date.parse(now);
  const blocks=state.blocks.filter(b=>!b.archived&&dateKey(b.start)===date).sort((a,b)=>a.start.localeCompare(b.start));
  const current=state.blocks.find(b=>!b.archived&&b.status==='pending'&&b.actualStart&&!b.actualEnd)??blocks.find(b=>b.kind!=='appointment'&&b.status==='pending'&&Date.parse(b.start)<=ts&&Date.parse(b.end)>ts);
  const next=blocks.find(b=>b.status==='pending'&&Date.parse(b.start)>ts&&b.kind!=='appointment');
  const appointments=blocks.filter(b=>b.kind==='appointment'&&Date.parse(b.end)>ts&&b.status==='pending');
  const pending=state.blocks.filter(b=>!b.archived&&b.status==='pending'&&Date.parse(b.end)<ts&&(!b.snoozedUntil||Date.parse(b.snoozedUntil)<=ts));
  const backlog=unscheduledTasks(state);
  const reminders=state.reminders.filter(r=>!r.archived&&!r.dismissed&&r.pinned&&r.startsAt<=now&&(!r.expiresAt||r.expiresAt>=now));
  const envelopes=state.envelopes.filter(e=>!e.archived&&e.status==='active').sort((a,b)=>a.expiresAt.localeCompare(b.expiresAt));
  const goals=state.goals.filter(g=>!g.archived&&g.status==='active'&&(g.pinned||g.targetDate<=addDays(date,7))).slice(0,3);
  const lost=state.ledgers.filter(l=>l.lost>0);
  const locations=state.locations.filter(l=>!l.archived);
  const [weather,setWeather]=useState<WeatherData|null>(null);
  const [weatherError,setWeatherError]=useState('');
  const [locationId,setLocationId]=useState(locations.find(l=>l.primary)?.id??locations[0]?.id??'');
  useEffect(()=>{
    if(!locationId)return;
    let live=true;
    setWeather(null);setWeatherError('');
    api.api<WeatherData>(`/api/weather?locationId=${encodeURIComponent(locationId)}`).then(w=>{if(live)setWeather(w);}).catch(()=>{if(live)setWeatherError('Forecast temporarily unavailable');});
    return()=>{live=false;};
  },[locationId]);
  const minutes=current?Math.ceil((Date.parse(current.end)-ts)/60000):0;
  const progress=current?Math.max(0,Math.min(100,(ts-Date.parse(current.start))/(Date.parse(current.end)-Date.parse(current.start))*100)):0;
  const dateText=new Intl.DateTimeFormat('en-US',{weekday:'long',month:'short',day:'numeric',timeZone:state.settings.timezone}).format(new Date(now));
  const logs=state.logs.filter(l=>!l.archived&&dateKey(l.kind==='sleep'&&l.end?l.end:l.at)===date).sort((a,b)=>a.at.localeCompare(b.at));
  const steps=dailySteps(state,date), sleep=logs.filter(l=>l.kind==='sleep').at(-1);
  const completed=blocks.filter(b=>['complete','attended'].includes(b.status)).length;
  const weekAppointments=state.blocks.filter(b=>!b.archived&&b.status==='pending'&&b.kind==='appointment'&&b.start>now&&dateKey(b.start)<=addDays(date,7)).length;
  const monthGoals=state.goals.filter(g=>!g.archived&&g.status==='active'&&g.targetDate>=date&&g.targetDate.slice(0,7)===date.slice(0,7)).length;
  const expiring=envelopes.filter(e=>Date.parse(e.expiresAt)>=ts&&Date.parse(e.expiresAt)<=ts+7*86400000).length;
  return <div className="v2-home">
    <header className="home-heading"><p className="eyebrow">{dateText}</p><h1>One moment at a time.</h1><p>A clear view of what matters today.</p></header>
    {!day&&<section className="card morning-card"><div className="morning-intro"><Sun size={24}/><div><h2>{closedToday?'Your day is saved.':'Good morning'}</h2><p>{closedToday?'Reopen today if you have more to add.':'Tap to check in and begin your day.'}</p></div></div><button className="primary" onClick={onStart}>{closedToday?'Review today':'Start my day'}</button></section>}
    <section className="weather-card" aria-label="Weather"><div className="weather-main"><div className="weather-location"><MapPin size={14}/>{locations.length?<select aria-label="Forecast location" value={locationId} onChange={e=>setLocationId(e.target.value)}>{locations.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select>:<button className="text-button" onClick={()=>go('weather')}>Add a weather location</button>}</div><span className="weather-temp">{weather?.temperature==null?'—':`${Math.round(weather.temperature)}°`}</span></div><div className="weather-detail"><p>{weatherError||weather?.shortForecast||(locationId?'Loading forecast…':'A forecast for your day.')}</p><small>{weather?.high!=null?`H: ${weather.high}° L: ${weather.low??'—'}°`:'Fahrenheit'}</small></div><p className="weather-credit">{weather?`${weather.attribution} · ${weather.stale?'Saved forecast · ':''}${weather.fetchedAt?timeLabel(weather.fetchedAt):'Not updated yet'}`:'Weather updates when connected'}</p></section>
    {day&&<section className="card focus-card"><div className="section-title"><span className="eyebrow"><span className="live-dot"/>{current?.actualStart?'IN FOCUS':current?'READY WHEN YOU ARE':'ROOM TO BREATHE'}</span><span className="clock-readout">{timeLabel(now)}</span></div>{current?<><span className="focus-area">{current.tag} · {current.kind}</span><h2>{current.title}</h2><div className="focus-time"><strong>{Math.abs(minutes)}<span>min</span></strong><p>{minutes<0?'past planned finish':'remaining'} <span>until {timeLabel(current.end)}</span></p></div><progress aria-label="Time remaining in planned block" max={100} value={100-progress}/><div className="focus-actions">{current.actualStart?<button className="primary" onClick={()=>onResolve(current)}>Update task</button>:<button className="primary" onClick={()=>run({type:'block.start',id:current.id})}>Start now</button>}<button onClick={()=>onResolve(current)}>Review</button></div></>:<><h2>{next?'A little space before what’s next.':'Your next step is yours.'}</h2><p className="muted">{next?`${next.title} starts at ${timeLabel(next.start)}.`:'Give a task a time, or enjoy the space in your day.'}</p><button className="wide" onClick={()=>go('schedule')}>Open schedule<ArrowRight size={16}/></button></>}</section>}
    <section className="home-section"><div className="section-title"><h2>On the calendar</h2><button className="text-button" onClick={()=>go('schedule')}>View day</button></div>{appointments.length?<div className="home-card-list">{appointments.slice(0,3).map(b=><button className="appointment-row" key={b.id} onClick={()=>go('schedule')}><span><strong>{timeLabel(b.start)} — {b.title}</strong><small>{Math.round((Date.parse(b.end)-Date.parse(b.start))/60000)} min</small></span><span className={`home-tag ${b.tag.toLowerCase()}`}>{b.tag}</span></button>)}</div>:<p className="quiet-empty">No upcoming appointments today.</p>}</section>
    {(pending.length>0||backlog.length>0||reminders.length>0||lost.length>0)&&<section className="home-section"><div className="section-title"><h2>Needs attention</h2></div><div className="home-card-list">{pending.slice(0,3).map(b=><button className="attention-row" key={b.id} onClick={()=>onResolve(b)}><i className="attention-dot overdue"/><span><strong>{b.title}</strong><small>Result needed · {dateKey(b.end)===date?'Today':dateKey(b.end)} {timeLabel(b.end)}</small></span></button>)}{pending.length>3&&<button className="text-button" onClick={()=>go('schedule')}>{pending.length-3} more results to review</button>}{backlog.slice(0,2).map(t=><button className="attention-row" key={t.id} onClick={()=>go('tasks')}><i className="attention-dot"/><span><strong>{t.title}</strong><small>Unscheduled · {t.duration} min</small></span></button>)}{reminders.map(r=><div className="attention-row" key={r.id}><i className="attention-dot overdue"/><span><strong>{r.title}</strong><small>{r.body}</small></span><button className="icon-button" aria-label={`Dismiss ${r.title}`} onClick={()=>run({type:'reminder.save',reminder:{...r,dismissed:true}})}><X size={16}/></button></div>)}{lost.map(l=><button className="attention-row" key={l.area} onClick={()=>go('money',l.area)}><Wallet size={17}/><span><strong>{money(l.lost)} in {l.area} Lost / Charity</strong><small>Waiting for you to mark it handled</small></span></button>)}</div></section>}
    {envelopes.length>0&&<section className="home-section"><div className="section-title"><h2>Envelopes coming due</h2><button className="text-button" onClick={()=>go('money')}>All funds</button></div><div className="home-card-list">{envelopes.slice(0,3).map(e=><button className="home-envelope" key={e.id} onClick={()=>go('money',e.area)}><span><strong>{e.title}</strong><small>{e.area==='company'?'Company':'Personal'} · {e.expiresAt<now?'Expired · ':''}{dateKey(e.expiresAt)} at {timeLabel(e.expiresAt)}</small></span><b>{money(e.amount)}</b></button>)}</div></section>}
    <section className="home-section home-metrics" aria-label="Your day so far"><button onClick={()=>go('health')}><span>Steps</span><strong>{steps?.toLocaleString()??'—'}</strong><small>{steps==null?'No entry':'Daily total'}</small></button><button onClick={()=>go('health')}><span>Sleep</span><strong>{sleep?.duration!=null?`${Math.floor(sleep.duration/60)}h ${sleep.duration%60}m`:'—'}</strong><small>{logs.filter(l=>l.kind==='sleep').length} {logs.filter(l=>l.kind==='sleep').length===1?'entry':'entries'}</small></button><button onClick={()=>go('schedule')}><span>Blocks</span><strong>{completed}/{blocks.length}</strong><small>Today</small></button></section>
    <section className="home-section"><div className="section-title"><h2>A little further ahead</h2></div><div className="ahead-card"><button onClick={()=>go('schedule')}><span>Appointments next 7 days</span><b>{weekAppointments}</b></button><button onClick={()=>go('goals')}><span>Goals due this month</span><b>{monthGoals}</b></button><button onClick={()=>go('money')}><span>Envelopes expiring this week</span><b className={expiring?'gold':''}>{expiring}</b></button></div></section>
    {goals.length>0&&<section className="home-section"><div className="section-title"><h2>The bigger picture</h2><button className="text-button" onClick={()=>go('goals')}>Goals</button></div>{goals.map(g=><button className="card goal-snapshot" key={g.id} onClick={()=>go('goals')}><span><strong>{g.title}</strong><small>Target {g.targetDate}</small></span><b>{goalProgress(state,g.id).percent}%</b><progress aria-label={`${g.title} progress`} value={goalProgress(state,g.id).percent} max={100}/></button>)}</section>}
    <button className="text-button missing-link" onClick={()=>go('missing')}>Review missing data</button><footer className="home-footer"><p>“There is more to time than what is on the clock.”</p></footer>
  </div>;
}
