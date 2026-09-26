import { useEffect, useState, type FormEvent } from 'react';
import { AlarmClockPlus, ArrowDown, ArrowUp, Check, ChevronDown, CloudLightning, CloudMoonRain, CloudRainWind, GripVertical, Info, MapPin, Pin, Plus, RefreshCw, Save, Search, ShieldCheck, Star, Sun } from 'lucide-react';
import type { NavId, Reminder, WeatherData, WeatherLocation } from '../../shared/types';
import { Modal, Field, Empty, DateTimeField } from '../ui';
import { api } from '../api';
import { FeatureForm, PageHeading, stamp, draft, type FeatureProps } from './common';
import { version as appVersion } from '../../package.json';
import '../features-secondary-v2.css';

export function RemindersPage({state,now,run,add}:FeatureProps) {
  const [creating,setCreating]=useState(Boolean(add));
  const [editing,setEditing]=useState<Reminder>();
  const [showDismissed,setShowDismissed]=useState(false);
  const [saving,setSaving]=useState<string>();
  const reminders=state.reminders.filter(r=>!r.archived&&!r.dismissed).sort((a,b)=>Number(b.pinned)-Number(a.pinned)||Date.parse(a.startsAt)-Date.parse(b.startsAt));
  const dismissed=state.reminders.filter(r=>!r.archived&&r.dismissed).sort((a,b)=>Date.parse(b.updatedAt)-Date.parse(a.updatedAt));
  async function update(reminder:Reminder,change:{pinned?:boolean;dismissed?:boolean}){
    setSaving(reminder.id);
    try {await run({type:'reminder.save',reminder:{...draft(reminder),...change}});}
    finally {setSaving(undefined);}
  }
  const timing=(reminder:Reminder)=>{
    const format=(iso:string)=>new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:state.settings.timezone}).format(new Date(iso));
    if(reminder.expiresAt&&Date.parse(reminder.expiresAt)<=Date.parse(now))return `Expired ${format(reminder.expiresAt)}`;
    return `From ${format(reminder.startsAt)}${reminder.expiresAt?`, until ${format(reminder.expiresAt)}`:''}`;
  };
  return <div className="feature-page secondary-v2 reminders-v2">
    <PageHeading title="Reminders" action={<button className="secondary-outline-icon" aria-label="Add reminder" onClick={()=>setCreating(true)}><AlarmClockPlus size={17}/></button>}/>
    <p className="secondary-reminder-hint"><Info size={14}/><span>Pinned reminders appear on your Home screen.</span></p>
    {reminders.length?<div className="secondary-card-list">{reminders.map(reminder=><section className="feature-card secondary-reminder" key={reminder.id}>
      <button className="secondary-reminder-copy" aria-label={`Edit ${reminder.title}`} onClick={()=>setEditing(reminder)}><strong>{reminder.title}</strong><small>{timing(reminder)}</small>{reminder.body&&<span>{reminder.body}</span>}</button>
      <div className="secondary-reminder-actions"><button className={reminder.pinned?'pinned':''} aria-label={`${reminder.pinned?'Unpin':'Pin'} ${reminder.title}`} aria-pressed={reminder.pinned} disabled={saving===reminder.id} onClick={()=>update(reminder,{pinned:!reminder.pinned})}><Pin size={17}/></button><button className="dismiss" aria-label="Dismiss" title={`Dismiss ${reminder.title}`} disabled={saving===reminder.id} onClick={()=>update(reminder,{dismissed:true})}><Check size={17}/></button></div>
    </section>)}</div>:<Empty>No reminders right now. Add one for something you want to keep in view.</Empty>}
    <button className="secondary-section-toggle" aria-expanded={showDismissed} aria-controls="dismissed-reminders" onClick={()=>setShowDismissed(!showDismissed)}><span>Dismissed reminders ({dismissed.length})</span><ChevronDown size={15}/></button>
    {showDismissed&&<div className="secondary-card-list" id="dismissed-reminders">{dismissed.length?dismissed.map(reminder=><section className="feature-card secondary-reminder dismissed" key={reminder.id}><button className="secondary-reminder-copy" aria-label={`Edit ${reminder.title}`} onClick={()=>setEditing(reminder)}><strong>{reminder.title}</strong><small>Dismissed · {stamp(reminder.updatedAt,state.settings.timezone)}</small></button><button className="secondary-restore" aria-label="Restore reminder" disabled={saving===reminder.id} onClick={()=>update(reminder,{dismissed:false})}>Restore</button></section>):<Empty>No dismissed reminders.</Empty>}</div>}
    {(creating||editing)&&<ReminderEditor reminder={editing} now={now} run={run} close={()=>{setCreating(false);setEditing(undefined);}}/>}
  </div>;
}
function ReminderEditor({reminder,now,run,close}:{reminder?:Reminder;now:string;run:FeatureProps['run'];close:()=>void}){
 const [title,setTitle]=useState(reminder?.title??'');const [body,setBody]=useState(reminder?.body??'');const [startsAt,setStartsAt]=useState(reminder?.startsAt??now);const [expiresAt,setExpiresAt]=useState(reminder?.expiresAt??new Date(Date.parse(now)+7*86400000).toISOString());const [expires,setExpires]=useState(Boolean(reminder?.expiresAt));const [pinned,setPinned]=useState(reminder?.pinned??true);
 return <Modal title={reminder?'Edit reminder':'Add reminder'} onClose={close}><FeatureForm run={run} onSaved={close} command={()=>({type:'reminder.save',reminder:{...(reminder?draft(reminder):{}),title,body,startsAt,expiresAt:expires?expiresAt:undefined,pinned,dismissed:reminder?.dismissed??false,source:reminder?.source??'owner'}})} extra={reminder?<button className="feature-link-button" type="button" onClick={async()=>{if(await run({type:'record.archive',collection:'reminders',id:reminder.id,archived:true}))close();}}>Archive reminder</button>:undefined}><Field label="Title"><input autoFocus required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)}/></Field><Field label="Note"><textarea rows={4} maxLength={10000} value={body} onChange={e=>setBody(e.target.value)}/></Field><DateTimeField label="Show from" value={startsAt} onChange={setStartsAt}/><label className="feature-inline-check"><input type="checkbox" checked={expires} onChange={e=>setExpires(e.target.checked)}/>Set an end date</label>{expires&&<DateTimeField label="Show until" value={expiresAt} onChange={setExpiresAt}/>}<label className="feature-inline-check"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/>Pin to Home</label></FeatureForm></Modal>;
}

interface LocationResult {name:string;latitude:number;longitude:number;postcode?:string}
function WeatherSymbol({description,size=20}:{description:string;size?:number}){
  const Icon=/thunder|storm/i.test(description)?CloudLightning:/rain|shower/i.test(description)?CloudRainWind:/sunny|clear/i.test(description)?Sun:CloudMoonRain;
  return <Icon size={size} aria-hidden="true"/>;
}
export function WeatherPage({state,run}:FeatureProps){
  const [adding,setAdding]=useState(false);
  const [managing,setManaging]=useState(false);
  const [forecast,setForecast]=useState<WeatherData>();
  const [error,setError]=useState('');
  const [selected,setSelected]=useState<string>();
  const [loading,setLoading]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const locations=state.locations.filter(l=>!l.archived);
  const current=locations.find(l=>l.id===selected)??locations.find(l=>l.primary)??locations[0];
  useEffect(()=>{
    if(!current)return;
    let live=true;setLoading(true);setError('');setForecast(undefined);
    void api<WeatherData>(`/api/weather?locationId=${encodeURIComponent(current.id)}`).then(data=>{if(live)setForecast(data);}).catch(e=>{if(live)setError(e instanceof Error?e.message:'Forecast unavailable.');}).finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;};
  },[current?.id,refresh]);
  const degrees=(value:number|null|undefined)=>value==null?'—':`${Math.round(value)}°`;
  const summary=forecast?.periods[0]?.forecast||forecast?.shortForecast;
  return <div className="feature-page secondary-v2 weather-v2">
    <PageHeading title="Weather"/>
    {current&&<div className="secondary-location-line"><MapPin size={16}/><strong>{current.name}{current.postcode&&!current.name.includes(current.postcode)?` ${current.postcode}`:''}</strong><button onClick={()=>setManaging(true)}>Change</button></div>}
    {loading&&<p role="status" className="muted">Getting the forecast…</p>}
    {error&&<div className="feature-warning" role="status"><p>{error}</p><button onClick={()=>setRefresh(value=>value+1)}>Try again</button></div>}
    {forecast&&<>
      <section className="secondary-weather-current"><div className="secondary-weather-temperature"><WeatherSymbol description={forecast.shortForecast} size={48}/><div><strong>{forecast.temperature===null?'—':`${Math.round(forecast.temperature)}°F`}</strong><p>{forecast.shortForecast}</p></div></div><div className="secondary-weather-metrics"><div><span>Chance of rain</span><strong>{forecast.precipitation===null?'Not available':`${Math.round(forecast.precipitation)}%`}</strong></div><div><span>High / Low</span><strong>{degrees(forecast.high)} / {degrees(forecast.low)}</strong></div></div></section>
      <section className="secondary-section"><h2 className="secondary-section-title">Today's forecast</h2><div className="secondary-forecast-summary"><p>{summary}</p><span><strong>{degrees(forecast.high)}</strong> <small>{degrees(forecast.low)}</small></span></div></section>
      <section className="secondary-section"><h2 className="secondary-section-title">Forecast outlook</h2><div className="secondary-card-list">{forecast.periods.length?forecast.periods.slice(0,6).map((period,index)=><div className="secondary-weather-period" key={`${period.name}-${index}`}><WeatherSymbol description={period.forecast} size={19}/><span><strong>{period.name}</strong><small>{period.forecast}</small></span><b>{degrees(period.temperature)}</b></div>):<p className="secondary-unavailable">An extended forecast is not available from this provider.</p>}</div></section>
      <footer className="secondary-weather-attribution"><p>{forecast.attribution}</p><p>{forecast.stale?'Saved forecast · ':''}{forecast.fetchedAt?`Updated ${stamp(forecast.fetchedAt,state.settings.timezone)}`:'Not updated yet'}</p><button onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={12}/>Refresh forecast</button></footer>
    </>}
    {!locations.length&&<><Empty>Add a city or postal code to see the weather.</Empty><button className="primary" onClick={()=>setAdding(true)}><Plus size={16}/>Add weather location</button></>}
    {managing&&<Modal title="Weather locations" onClose={()=>setManaging(false)}><div className="secondary-location-manager"><Field label="Forecast location"><select value={current?.id??''} onChange={e=>{setSelected(e.target.value);setManaging(false);}}>{locations.map(location=><option key={location.id} value={location.id}>{location.name}</option>)}</select></Field><div className="feature-section-label"><h2>Saved locations</h2><button className="feature-link-button" aria-label="Add weather location" onClick={()=>{setManaging(false);setAdding(true);}}><Plus size={16}/>Add</button></div>{locations.map(location=><section className="feature-card" key={location.id}><div className="feature-section-label"><h2><MapPin size={17}/>{location.name}</h2>{location.primary&&<Star size={17}/>}</div><div className="feature-inline-actions">{location.primary?<span className="feature-status">Home forecast</span>:<button onClick={()=>run({type:'location.save',location:{...draft(location),primary:true}})}>Show on Home</button>}<button className="feature-link-button" onClick={()=>run({type:'record.archive',collection:'locations',id:location.id,archived:true})}>Remove location</button></div></section>)}</div></Modal>}
    {adding&&<LocationSearch run={run} existing={locations} close={()=>{setAdding(false);setManaging(true);}}/>}
  </div>;
}
function LocationSearch({run,existing,close}:{run:FeatureProps['run'];existing:WeatherLocation[];close:()=>void}){
 const [query,setQuery]=useState('');const [results,setResults]=useState<LocationResult[]>([]);const [loading,setLoading]=useState(false);const [searched,setSearched]=useState(false);const [error,setError]=useState('');const [saving,setSaving]=useState(false);
 async function search(event:FormEvent){event.preventDefault();setLoading(true);setError('');setResults([]);try{setResults(await api<LocationResult[]>(`/api/weather/locations?q=${encodeURIComponent(query.trim())}`));setSearched(true);}catch(e){setError(e instanceof Error?e.message:'Location search unavailable.');}finally{setLoading(false);}}
 async function choose(location:LocationResult){setSaving(true);try{if(await run({type:'location.save',location:{...location,primary:existing.length===0}}))close();}finally{setSaving(false);}}
 return <Modal title="Add a weather location" onClose={close}><form className="feature-form" onSubmit={search}><Field label="City or postal code"><input autoFocus required minLength={2} maxLength={100} value={query} onChange={e=>setQuery(e.target.value)} placeholder="City name or 34638"/></Field><button type="submit" disabled={loading}><Search size={17}/>{loading?'Searching…':'Search locations'}</button></form>{error&&<p role="alert" className="feature-warning">{error}</p>}<div className="feature-location-results">{results.map((result,index)=>{const duplicate=existing.some(l=>l.latitude===result.latitude&&l.longitude===result.longitude);return <button className="feature-entry" key={index} disabled={saving||duplicate} onClick={()=>choose(result)}><MapPin size={18}/><span className="feature-entry-copy"><strong>{result.name}</strong>{result.postcode&&<small>{result.postcode}</small>}</span>{duplicate?<Check size={17}/>:<Plus size={17}/>}</button>;})}{searched&&!loading&&!error&&!results.length&&<Empty>No locations found. Try a nearby city name.</Empty>}</div><p className="muted">Choose the matching place before saving. Caminos does not use your phone’s GPS.</p></Modal>;
}

export function SettingsPage({state,run}:FeatureProps){
  const [name,setName]=useState(state.settings.name);
  const [saved,setSaved]=useState(false);
  const [editor,setEditor]=useState<'profile'|'navigation'>();
  const [privacy,setPrivacy]=useState(false);
  const [navOrder,setNavOrder]=useState<NavId[]>(state.settings.navOrder??['home','schedule','goals','more']);
  const [dragged,setDragged]=useState<NavId>();
  const navLabels:Record<NavId,string>={home:'Home',schedule:'Schedule',goals:'Goals',more:'More'};
  function openEditor(kind:'profile'|'navigation'){setName(state.settings.name);setNavOrder(state.settings.navOrder??['home','schedule','goals','more']);setSaved(false);setEditor(kind);}
  function moveTab(index:number,change:number){const target=index+change;if(target<0||target>=navOrder.length)return;const next=[...navOrder];[next[index],next[target]]=[next[target],next[index]];setNavOrder(next);}
  function dropTab(target:NavId){if(!dragged||dragged===target)return;const next=navOrder.filter(id=>id!==dragged);next.splice(navOrder.indexOf(target),0,dragged);setNavOrder(next);setDragged(undefined);}
  return <div className="feature-page secondary-v2 settings-v2">
    <PageHeading title="Settings"/>
    <section className="secondary-section"><h2 className="secondary-section-title">Profile</h2><div className="secondary-setting-card secondary-profile"><span>{state.settings.name}</span><button onClick={()=>openEditor('profile')}>Edit name</button></div></section>
    <section className="secondary-section"><h2 className="secondary-section-title">Navigation</h2><button className="secondary-setting-card secondary-nav-edit" onClick={()=>openEditor('navigation')}><span><strong>Tab bar order</strong><small>Reorder your bottom tabs</small></span><GripVertical size={16}/></button></section>
    <section className="secondary-section"><h2 className="secondary-section-title">Time &amp; units</h2><div className="secondary-setting-card secondary-units"><div><span>Time zone</span><small>{state.settings.timezone.replaceAll('_',' ')}</small></div><div><span>Weight unit</span><span className="secondary-unit-badge">LBS</span></div><div><span>Currency · temperature</span><small>USD · °F</small></div></div></section>
    <section className="secondary-section"><h2 className="secondary-section-title">Data</h2><a className="secondary-export" href="/api/export" download="caminos-export.json"><Save size={17}/>Export my data (JSON)</a><button className="secondary-privacy-link" onClick={()=>setPrivacy(true)}>Privacy info</button></section>
    <footer className="secondary-settings-footer"><strong>Caminos v{appVersion}</strong><span>Made with focus in mind</span>{saved&&<p className="feature-reconciled" role="status">Settings saved</p>}</footer>
    {editor&&<Modal title={editor==='profile'?'Edit your name':'Main tab order'} onClose={()=>setEditor(undefined)}><FeatureForm run={run} command={()=>({type:'settings.save',name,timezone:state.settings.timezone,navOrder})} onSaved={()=>{setSaved(true);setEditor(undefined);}} label="Save settings">{editor==='profile'?<Field label="Your name"><input autoFocus required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></Field>:<fieldset className="feature-nav-order"><legend>Main tab order</legend><p className="muted">Drag a row or use the arrows to change its place.</p>{navOrder.map((id,index)=><div key={id} className="feature-nav-order-row secondary-nav-row" draggable onDragStart={()=>setDragged(id)} onDragEnd={()=>setDragged(undefined)} onDragOver={e=>e.preventDefault()} onDrop={()=>dropTab(id)}><GripVertical size={16}/><span>{index+1}. {navLabels[id]}</span><button type="button" className="icon-button" aria-label={`Move ${navLabels[id]} earlier`} disabled={index===0} onClick={()=>moveTab(index,-1)}><ArrowUp size={16}/></button><button type="button" className="icon-button" aria-label={`Move ${navLabels[id]} later`} disabled={index===navOrder.length-1} onClick={()=>moveTab(index,1)}><ArrowDown size={16}/></button></div>)}</fieldset>}</FeatureForm></Modal>}
    {privacy&&<Modal title="Your private space" onClose={()=>setPrivacy(false)}><div className="secondary-privacy"><ShieldCheck size={24}/><p>Your records live on your private server, separate from Pirata's account and storage. Work-app employees cannot access this app with their Pirata accounts.</p><p>Personal records are not saved in your phone's browser storage. Trusted server administrators and AI tools you explicitly authorize can access the server data.</p><p>Calendar connections, Samsung Health and in-app AI are planned for later. You can add and edit your information manually now.</p><p>Exports download your records to your device. Keep those files somewhere private.</p></div></Modal>}
  </div>;
}
