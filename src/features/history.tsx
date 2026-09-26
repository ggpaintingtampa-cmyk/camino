import { useEffect, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Pencil, Search, RefreshCw } from 'lucide-react';
import type { Day } from '../../shared/types';
import { Modal, Field, Empty } from '../ui';
import { api } from '../api';
import { FeatureForm, PageHeading, dayKey, shiftDay, prettyDate, clockLabel, durationLabel, type FeatureProps } from './common';

interface SearchResult{id:string;type:string;title:string;text:string;date?:string}
export function HistoryPage({state,now,run,add}:FeatureProps) {
 const zone=state.settings.timezone;
 const today=dayKey(now,zone);
 const [date,setDate]=useState(today);
 const [month,setMonth]=useState(today.slice(0,7));
 const [query,setQuery]=useState('');
 const [results,setResults]=useState<SearchResult[]>([]);
 const [searching,setSearching]=useState(false);
 const [error,setError]=useState('');
 const [edit,setEdit]=useState(Boolean(add));
 const [regenerate,setRegenerate]=useState(false);
 const day=state.days.find(item=>!item.archived&&item.date===date);
 useEffect(()=>{
  if(!query.trim()){setResults([]);setError('');setSearching(false);return;}
  let live=true;
  setSearching(true);
  const timer=setTimeout(()=>{void api<SearchResult[]>(`/api/search?q=${encodeURIComponent(query)}`).then(data=>{if(live){setResults(data);setError('');}}).catch(reason=>{if(live)setError(reason instanceof Error?reason.message:'Search unavailable.');}).finally(()=>{if(live)setSearching(false);});},250);
  return()=>{live=false;clearTimeout(timer);};
 },[query,state.revision]);
 const first=`${month}-01`;
 const offset=(new Date(`${first}T12:00:00Z`).getUTCDay()+6)%7;
 const [year,monthNumber]=month.split('-').map(Number);
 const daysInMonth=new Date(Date.UTC(year,monthNumber,0)).getUTCDate();
 const dates=Array.from({length:Math.ceil((offset+daysInMonth)/7)*7},(_,index)=>index>=offset&&index<offset+daysInMonth?shiftDay(first,index-offset):undefined);
 const records=new Set([
  ...state.days.filter(item=>!item.archived).map(item=>item.date),
  ...state.logs.filter(item=>!item.archived).map(item=>dayKey(item.kind==='sleep'&&item.end?item.end:item.at,zone)),
  ...state.blocks.filter(item=>!item.archived).map(item=>dayKey(item.start,zone)),
  ...state.goals.filter(item=>!item.archived).map(item=>item.targetDate),
  ...state.reminders.filter(item=>!item.archived).map(item=>dayKey(item.startsAt,zone)),
 ]);
 const blocks=state.blocks.filter(item=>!item.archived&&dayKey(item.start,zone)===date).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start));
 const logs=state.logs.filter(item=>!item.archived&&dayKey(item.kind==='sleep'&&item.end?item.end:item.at,zone)===date).sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 const goals=state.goals.filter(item=>!item.archived&&item.targetDate===date);
 const reminders=state.reminders.filter(item=>!item.archived&&dayKey(item.startsAt,zone)===date);
 const completed=blocks.filter(item=>item.status==='complete'||item.status==='attended').length;
 const steps=logs.filter(item=>item.kind==='steps').at(-1);
 const sleep=logs.filter(item=>item.kind==='sleep'&&item.start&&item.end);
 const facts=[
  [day?.startedAt?`Woke at ${clockLabel(day.startedAt,zone)}`:'Wake time not recorded',day?.mood?`Mood: ${day.mood}/5`:undefined,day?.energy?`Energy: ${day.energy}/5`:undefined].filter(Boolean).join(' · '),
  blocks.length?`${completed}/${blocks.length} scheduled blocks completed`:'Schedule not recorded',
  [steps?.value!==undefined?`${steps.value.toLocaleString()} steps`:'Steps not recorded',sleep.length?`${durationLabel(sleep.reduce((total,item)=>total+(Date.parse(item.end!)-Date.parse(item.start!))/60000,0))} sleep`:'Sleep not recorded'].join(' · '),
 ];
 const activityCount=blocks.length+logs.length+goals.length+reminders.length;
 function changeMonth(amount:number){setMonth(new Date(Date.UTC(year,monthNumber-1+amount,1,12)).toISOString().slice(0,7));}
 function selectDate(value:string){setDate(value);setMonth(value.slice(0,7));}
 return <div className="feature-page life-v2 life-history">
  <PageHeading eyebrow="The days become your story" title="Journal & history" description="A factual record, with room for your own words."/>
  <div className="feature-search"><Search size={16}/><input type="search" aria-label="Search history" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search days, notes, tasks, goals…"/></div>
  {query.trim()&&<section className="feature-card life-search-results">
   <div className="feature-section-label"><h2>Search results</h2><small>{searching?'Searching…':`${results.length} found`}</small></div>
   {error&&<p role="alert" className="feature-warning">{error}</p>}
   {results.map(result=><details key={`${result.type}-${result.id}`} className="feature-search-result"><summary><span><strong>{result.title}</strong><small>{result.type} {result.date?`· ${prettyDate(result.date)}`:''}</small></span></summary><p>{result.text||'No additional notes.'}</p>{result.date&&<button className="feature-link-button" onClick={()=>{selectDate(result.date!);setQuery('');}}>View this day <ChevronRight size={15}/></button>}</details>)}
   {!searching&&!error&&!results.length&&<Empty>No matching records.</Empty>}
  </section>}
  <section className="feature-card feature-calendar">
   <div className="feature-calendar-heading">
    <button className="icon-button" aria-label="Previous month" onClick={()=>changeMonth(-1)}><ChevronLeft size={16}/></button>
    <div className="life-calendar-month"><label><span className="sr-only">Choose month</span><span aria-hidden="true">{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${first}T12:00:00Z`))}</span><input type="month" value={month} onChange={event=>{if(event.target.value)setMonth(event.target.value);}}/></label><button className="feature-link-button" onClick={()=>selectDate(today)}>Back to today</button></div>
    <button className="icon-button" aria-label="Next month" onClick={()=>changeMonth(1)}><ChevronRight size={16}/></button>
   </div>
   <div className="feature-calendar-grid">
    <div className="feature-calendar-weekdays" aria-hidden="true">{['M','T','W','T','F','S','S'].map((label,index)=><span key={index}>{label}</span>)}</div>
    {dates.map((value,index)=>value?<button key={value} aria-label={`${prettyDate(value)}${records.has(value)?', has records':''}`} aria-pressed={value===date} className={`${value===date?'selected':''} ${value===today?'today':''}`} onClick={()=>selectDate(value)}><span>{Number(value.slice(8))}</span>{records.has(value)&&<i/>}</button>:<span key={`empty-${index}`} aria-hidden="true"/>)}
   </div>
  </section>
  <section className="life-selected-day">
   <div className="feature-section-label life-journal-date"><h2>{prettyDate(date)}</h2><button className="feature-link-button" onClick={()=>setEdit(true)}><Pencil size={13}/>{day?'Edit entry':'Add entry'}</button></div>
   <section className="feature-card life-daily-record">
    <div className="feature-section-label"><h2>Daily record</h2>{day&&<button className="icon-button" aria-label="Regenerate daily summary" onClick={()=>setRegenerate(true)}><RefreshCw size={13}/></button>}</div>
    {day?.summary?<><p className="feature-journal-text">{day.summary}</p><small className="life-saved-checkin">{facts[0]}</small></>:<div className="life-day-facts">{facts.map(fact=><p key={fact}>{fact}</p>)}</div>}
    {day?.note&&<p className="feature-journal-note">{day.note}</p>}
   </section>
   <button className="feature-card life-journal-card" aria-label={day?'Edit personal journal':'Add personal journal'} onClick={()=>setEdit(true)}><span className="life-card-label">Your journal</span><span className={`feature-journal-text ${!day?.journal?'life-journal-placeholder':''}`}>{day?.journal||'Write something about today…'}</span></button>
  </section>
  {activityCount>0&&<details className="life-recorded-activities"><summary>View recorded activities <span>{activityCount}</span><ChevronDown size={15}/></summary><div className="life-health-history-content">
   {blocks.length>0&&<section className="feature-card"><h2><CalendarDays size={16}/> Schedule record</h2>{blocks.map(block=><div className="feature-entry" key={block.id}><span className="feature-entry-copy"><strong>{block.title}</strong><small>{clockLabel(block.start,zone)}–{clockLabel(block.end,zone)} · {block.tag}</small>{block.notes&&<span className="muted">{block.notes}</span>}</span><span className={`feature-status ${block.status}`}>{block.status==='pending'?'Unreviewed':block.status}</span></div>)}</section>}
   {logs.length>0&&<section className="feature-card"><h2>Health & practice</h2>{logs.map(log=><div className="feature-entry" key={log.id}><span className="feature-entry-copy"><strong>{log.kind==='weight'?`${log.value} lb`:log.kind==='steps'?`${log.value?.toLocaleString()} steps`:log.kind==='sleep'?`Sleep${log.start&&log.end?` · ${durationLabel((Date.parse(log.end)-Date.parse(log.start))/60000)}`:''}`:log.kind==='food'?log.description:`${log.category||log.kind}${log.duration?` · ${durationLabel(log.duration)}`:''}`}</strong><small>{clockLabel(log.at,zone)}{log.quality?` · Quality ${log.quality}/5`:''}</small>{log.notes&&<span className="muted">{log.notes}</span>}</span></div>)}</section>}
   {goals.length>0&&<section className="feature-card"><h2>Goal target dates</h2>{goals.map(goal=><div className="feature-entry" key={goal.id}><strong>{goal.title}</strong><span className="feature-status">{goal.status}</span></div>)}</section>}
   {reminders.length>0&&<section className="feature-card"><h2>Reminders</h2>{reminders.map(reminder=><div className="feature-adjustment" key={reminder.id}><strong>{reminder.title}</strong><p>{reminder.body}</p></div>)}</section>}
  </div></details>}
  {edit&&<JournalEditor day={day} date={date} run={run} close={()=>setEdit(false)}/>}
  {regenerate&&day&&<Modal title="Regenerate factual summary?" onClose={()=>setRegenerate(false)}><div className="feature-form"><p>This replaces your daily summary with a fresh version built from recorded data. Any edits to that summary will be replaced. Your personal journal stays unchanged.</p><button className="primary" onClick={async()=>{if(await run({type:'day.regenerate',id:day.id}))setRegenerate(false);}}>Replace summary</button><button onClick={()=>setRegenerate(false)}>Keep current summary</button></div></Modal>}
 </div>;
}
function JournalEditor({day,date,run,close}:{day?:Day;date:string;run:FeatureProps['run'];close:()=>void}) {
 const [summary,setSummary]=useState(day?.summary??'');const [journal,setJournal]=useState(day?.journal??'');const [note,setNote]=useState(day?.note??'');
 return <Modal title={`Journal · ${prettyDate(date)}`} onClose={close}><FeatureForm run={run} onSaved={close} command={()=>({type:'day.save',id:day?.id,date,summary,journal,note})}><Field label="Daily factual summary"><textarea rows={8} maxLength={10000} value={summary} onChange={e=>setSummary(e.target.value)} placeholder="A summary of recorded activities…"/></Field><Field label="Your personal journal"><textarea autoFocus rows={8} maxLength={10000} value={journal} onChange={e=>setJournal(e.target.value)} placeholder="What do you want to remember about this day?"/></Field><Field label="Day note"><textarea rows={3} maxLength={10000} value={note} onChange={e=>setNote(e.target.value)}/></Field></FeatureForm></Modal>;
}
