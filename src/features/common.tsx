import { useState, type FormEvent, type ReactNode } from 'react';
import type { PageProps } from '../ui';
import type { Base, Command } from '../../shared/types';

export type FeatureProps = PageProps & {add?:boolean; addKind?:string};
export function draft<T extends Base>(record:T):Omit<T,'createdAt'|'updatedAt'> {return Object.fromEntries(Object.entries(record).filter(([key])=>key!=='createdAt'&&key!=='updatedAt')) as Omit<T,'createdAt'|'updatedAt'>;}
export const dollars = (cents:number) => new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
export const dayKey = (iso:string, zone='America/New_York') => new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));
export const prettyDate = (day:string) => new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}).format(new Date(`${day}T12:00:00Z`));
export const clockLabel = (iso:string, zone='America/New_York') => new Intl.DateTimeFormat('en-US',{timeZone:zone,hour:'numeric',minute:'2-digit'}).format(new Date(iso));
export const stamp = (iso:string,zone='America/New_York') => `${prettyDate(dayKey(iso,zone))} · ${clockLabel(iso,zone)}`;
export const shiftDay = (date:string, days:number) => {const next=new Date(`${date}T12:00:00Z`); next.setUTCDate(next.getUTCDate()+days);return next.toISOString().slice(0,10);};
export const durationLabel = (minutes:number) => minutes>=60 ? `${Math.floor(minutes/60)}h${minutes%60?` ${Math.round(minutes%60)}m`:''}` : `${Math.round(minutes)}m`;
export function PageHeading({eyebrow,title,description,action}:{eyebrow?:string;title:string;description?:string;action?:ReactNode}) {return <header className="feature-heading"><div>{eyebrow&&<span className="feature-eyebrow">{eyebrow}</span>}<h1>{title}</h1>{description&&<p className="muted">{description}</p>}</div>{action}</header>;}
export function FeatureForm({run,command,children,onSaved,label='Save',extra}:{run:FeatureProps['run'];command:()=>Command;children:ReactNode;onSaved:()=>void;label?:string;extra?:ReactNode}) {
 const [saving,setSaving]=useState(false); const [error,setError]=useState('');
 async function submit(event:FormEvent){event.preventDefault();setError('');setSaving(true);try {if(await run(command()))onSaved();}catch(e){setError(e instanceof Error?e.message:'Could not save. Your draft is still here.');}finally{setSaving(false);}}
 return <form className="feature-form" onSubmit={submit}>{children}{error&&<p role="alert" className="feature-warning">{error}</p>}<div className="feature-form-actions">{extra}<button className="primary" type="submit" disabled={saving}>{saving?'Saving…':label}</button></div></form>;
}
export function Stat({label,value,hint}:{label:string;value:ReactNode;hint?:string}){return <div className="feature-stat"><span>{label}</span><strong>{value}</strong>{hint&&<small>{hint}</small>}</div>;}
export function ChoiceStrip<T extends string>({value,onChange,options,label}:{value:T;onChange:(v:T)=>void;options:{value:T;label:string}[];label:string}) {return <div className="feature-choice-strip" role="group" aria-label={label}>{options.map(option=><button key={option.value} type="button" className={value===option.value?'selected':''} aria-pressed={value===option.value} onClick={()=>onChange(option.value)}>{option.label}</button>)}</div>;}
