import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import type { Command, Snapshot } from '../shared/types';
import { dateKey, localInstant, minuteOfDay } from '../shared/dates';
import type { RunOptions, RunOutcome, SaveState } from './hooks/useCommandRunner';

/**
 * Every screen receives the accepted snapshot, the server-derived display time and the one
 * command runner. `runReviewed` submits at the revision a visible preview was built from;
 * `saveState` is the runner's account of the last attempted change. Both are optional in
 * the type only so that screens written before them keep compiling; the shell always
 * supplies them.
 */
export interface PageProps {state:Snapshot; now:string; run:(command:Command,options?:RunOptions)=>Promise<boolean>; add?:boolean; addKind?:string; runReviewed?:(command:Command,reviewedRevision:number,options?:RunOptions)=>Promise<RunOutcome>; saveState?:SaveState}
export function Modal({title,onClose,children,className='',dirty:externalDirty=false}:{title:string;onClose:()=>void;children:ReactNode;className?:string;dirty?:boolean}) {
  const ref=useRef<HTMLDialogElement>(null);
  const titleId=useId();
  const [error,setError]=useState('');const [uncertain,setUncertain]=useState(false);const dirty=useRef(false);
  const close=()=>{if((!dirty.current&&!externalDirty)||window.confirm('Close and discard unsaved changes?'))onClose();};
  useEffect(()=>{const el=ref.current;el?.showModal();return()=>el?.close();},[]);
  useEffect(()=>{const listener=(e:Event)=>{const d=(e as CustomEvent<{message:string;uncertain:boolean}>).detail;setError(d.message);setUncertain(d.uncertain);};const saved=()=>{setError('');setUncertain(false);dirty.current=false;};window.addEventListener('caminos-error',listener);window.addEventListener('caminos-saved',saved);return()=>{window.removeEventListener('caminos-error',listener);window.removeEventListener('caminos-saved',saved);};},[]);
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby={titleId} onClickCapture={e=>{if((e.target as HTMLElement).closest('button[data-dirty],button[aria-pressed]'))dirty.current=true;}} onChange={()=>{dirty.current=true;}} onCancel={e=>{e.preventDefault();close();}}><header className="modal-head"><h2 id={titleId}>{title}</h2><button className="icon-button" onClick={close} aria-label="Close"><X size={20}/></button></header><div className="modal-body">{error&&<div className="notice warning" role="alert"><span>{error}</span>{uncertain&&<button type="button" onClick={()=>window.dispatchEvent(new Event('caminos-retry'))}>Retry save safely</button>}</div>}{children}</div></dialog>;
}
export function Field({label,children}:{label:string;children:ReactNode}) {return <label className="field"><span>{label}</span>{children}</label>;}
export function Empty({children}:{children:ReactNode}) {return <div className="empty-state">{children}</div>;}
export function DurationField({value,onChange}:{value:number;onChange:(n:number)=>void}) {return <div className="field"><span>Duration</span><div className="stepper"><button type="button" aria-label="Five minutes less" onClick={()=>onChange(Math.max(5,value-5))}><Minus size={18}/></button><input aria-label="Duration in minutes" type="number" min="5" step="5" value={value} onChange={e=>onChange(Number(e.target.value))}/><span>min</span><button type="button" aria-label="Five minutes more" onClick={()=>onChange(value+5)}><Plus size={18}/></button></div><div className="chips">{[5,15,30,60,90].map(n=><button type="button" className={n===value?'selected':''} key={n} onClick={()=>onChange(n)}>{n}m</button>)}</div></div>;}
export function DateTimeField({label,value,onChange,zone}:{label:string;value:string;onChange:(s:string)=>void;zone?:string}) {
  const date=value?dateKey(value,zone):dateKey(new Date().toISOString(),zone);const minutes=value?minuteOfDay(value,zone):540;
  const set=(d:string,m:number)=>{if(!d)return;try{onChange(localInstant(d,`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`,zone));}catch{/* daylight-saving gap: preserve valid selection */}};
  return <fieldset className="datetime"><legend>{label}</legend><input aria-label={`${label} date`} type="date" value={date} onChange={e=>set(e.target.value,minutes)}/><div className="time-select"><select aria-label={`${label} hour`} value={Math.floor(minutes/60)} onChange={e=>set(date,Number(e.target.value)*60+minutes%60)}>{Array.from({length:24},(_,i)=><option key={i} value={i}>{i===0?'12 AM':i<12?`${i} AM`:i===12?'12 PM':`${i-12} PM`}</option>)}</select><span>:</span><select aria-label={`${label} minute`} value={Math.floor(minutes/5)*5} onChange={e=>set(date,Math.floor(minutes/60)*60+Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i} value={i*5}>{String(i*5).padStart(2,'0')}</option>)}</select></div></fieldset>;
}
export function money(cents:number) {return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);}
export function heading(title:string,subtitle?:string) {return <header className="page-heading"><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</header>;}
