import { useState } from 'react';
import { Plus, Wallet, ArrowUpRight, Heart, ChevronDown } from 'lucide-react';
import '../features-secondary-v2.css';
import type { Area, Envelope, Ledger } from '../../shared/types';
import { Modal, Field, Empty, DateTimeField } from '../ui';
import { ChoiceStrip, FeatureForm, PageHeading, Stat, dollars, stamp, type FeatureProps } from './common';

export function MoneyPage({state,now,run,add,addKind}:FeatureProps){
  const [area,setArea]=useState<Area>(addKind==='company'?'company':'personal');
  const [create,setCreate]=useState(Boolean(add&&addKind!=='company'&&addKind!=='personal'));
  const [adjust,setAdjust]=useState(false);
  const [selected,setSelected]=useState<{envelope:Envelope;extend?:boolean}>();
  const [history,setHistory]=useState(false);
  const [audit,setAudit]=useState(false);
  const [balances,setBalances]=useState(false);
  const [saving,setSaving]=useState<string>();
  const ledger=state.ledgers.find(l=>l.area===area)??{area,account:0,cash:0,earned:0,lost:0};
  const envelopes=state.envelopes.filter(e=>!e.archived&&e.area===area);
  const reservedEnvelopes=envelopes.filter(e=>e.status==='active').sort((a,b)=>Date.parse(a.expiresAt)-Date.parse(b.expiresAt));
  const active=reservedEnvelopes.filter(e=>Date.parse(e.expiresAt)>Date.parse(now));
  const expired=reservedEnvelopes.filter(e=>Date.parse(e.expiresAt)<=Date.parse(now));
  const reserved=reservedEnvelopes.reduce((n,e)=>n+e.amount,0);
  const expected=ledger.cash+reserved+ledger.earned+ledger.lost;
  const difference=ledger.account-expected;
  const lost=envelopes.filter(e=>e.status==='lost');
  const handled=envelopes.filter(e=>e.status!=='active'&&e.status!=='lost');
  async function resolveEnvelope(envelope:Envelope,outcome:'earned'|'lost'){
    setSaving(envelope.id);
    try {await run({type:'envelope.resolve',id:envelope.id,outcome});}
    finally {setSaving(undefined);}
  }
  return <div className="feature-page secondary-v2 money-v2">
    <PageHeading title="Your envelopes" description="Reserve cash for a purpose. Decide when it expires." action={<button className="secondary-add" aria-label="Add envelope" onClick={()=>setCreate(true)}><Plus size={16}/></button>}/>
    <ChoiceStrip value={area} onChange={setArea} options={[{value:'personal',label:'Personal'},{value:'company',label:'Company'}]} label="Money ledger"/>
    <section className="secondary-section">
      <h2 className="secondary-section-title">Active envelopes</h2>
      {active.length?<div className="secondary-card-list">{active.map(envelope=>{
        const lifetime=Date.parse(envelope.expiresAt)-Date.parse(envelope.createdAt);
        const elapsed=lifetime>0?Math.max(0,Math.min(100,(Date.parse(now)-Date.parse(envelope.createdAt))/lifetime*100)):0;
        const daysLeft=Math.ceil((Date.parse(envelope.expiresAt)-Date.parse(now))/86400000);
        return <button className="secondary-envelope" key={envelope.id} onClick={()=>setSelected({envelope})}>
          <div className="secondary-envelope-heading"><span><strong>{envelope.title}</strong><small>Expires {stamp(envelope.expiresAt,state.settings.timezone).replace(' · ',' at ')}</small></span><b>{dollars(envelope.amount)}</b></div>
          <div className="secondary-envelope-deadline"><progress aria-label={`Time elapsed toward ${envelope.title} expiry`} max={100} value={elapsed}/><span>{daysLeft===1?'Less than a day left':`${daysLeft} days left`}</span></div>
        </button>;
      })}</div>:<Empty>No active envelopes. Reserve some cash for a goal or a promise to yourself.</Empty>}
    </section>
    {expired.length>0&&<section className="secondary-section"><h2 className="secondary-section-title">Action required</h2><div className="secondary-card-list">{expired.map(envelope=><section className="secondary-envelope expired" key={envelope.id}>
      <button className="secondary-envelope-heading secondary-envelope-open" onClick={()=>setSelected({envelope})}><span><strong>{envelope.title}</strong><small>Expired {stamp(envelope.expiresAt,state.settings.timezone)}</small></span><b>{dollars(envelope.amount)}</b></button>
      <div className="secondary-envelope-decisions"><button className="earned" disabled={saving===envelope.id} onClick={()=>resolveEnvelope(envelope,'earned')}>Earned</button><button disabled={saving===envelope.id} onClick={()=>resolveEnvelope(envelope,'lost')}>Lost</button><button disabled={saving===envelope.id} onClick={()=>setSelected({envelope,extend:true})}>Extend</button></div>
    </section>)}</div></section>}
    {lost.length>0&&<section className="secondary-section"><h2 className="secondary-section-title">Ready for charity · {dollars(ledger.lost)}</h2><div className="secondary-card-list">{lost.map(envelope=><button className="secondary-envelope secondary-charity" key={envelope.id} onClick={()=>setSelected({envelope})}><Heart size={18}/><span><strong>{envelope.title}</strong><small>Confirm after you have paid it</small></span><b>{dollars(envelope.amount)}</b><ArrowUpRight size={16}/></button>)}</div></section>}
    <button className="secondary-disclosure" aria-label="Envelope history" aria-expanded={history} onClick={()=>setHistory(!history)}><span>{handled.length} handled envelope{handled.length===1?'':'s'}</span><ChevronDown size={16}/></button>
    {history&&<div className="secondary-panel">{envelopes.filter(e=>e.status!=='active').sort((a,b)=>Date.parse(b.resolvedAt??b.updatedAt)-Date.parse(a.resolvedAt??a.updatedAt)).map(envelope=><div className="feature-entry" key={envelope.id}><span className="feature-entry-copy"><strong>{envelope.title}</strong><small>{envelope.status==='handled'?'Charity paid':envelope.status==='cancelled'?'Returned to cash':envelope.status==='earned'?'Earned':'Lost / charity'} · {stamp(envelope.resolvedAt??envelope.updatedAt,state.settings.timezone)}</small></span><span>{dollars(envelope.amount)}</span></div>)}{!envelopes.some(e=>e.status!=='active')&&<Empty>No resolved envelopes yet.</Empty>}</div>}
    <button className="secondary-disclosure secondary-balances-toggle" aria-expanded={balances} onClick={()=>setBalances(!balances)}><span><Wallet size={16}/>Account balances</span><strong>{dollars(ledger.account)}</strong><ChevronDown size={16}/></button>
    {balances&&<section className="feature-account secondary-panel">
      <div className="feature-row"><span>{area==='personal'?'Personal':'Company'} account</span><button className="feature-link-button" onClick={()=>setAdjust(true)}>Adjust balances</button></div>
      <strong className="feature-account-total">{dollars(ledger.account)}</strong><span className="muted">Your recorded bank balance</span>
      <div className="feature-money-divider"/><div className="feature-stats feature-money-stats"><Stat label="Available cash" value={dollars(ledger.cash)}/><Stat label="In envelopes" value={dollars(reserved)}/><Stat label="Earned · yours to spend" value={dollars(ledger.earned)}/><Stat label="Lost / charity" value={dollars(ledger.lost)}/></div>
      {difference!==0?<div className="feature-warning" role="status"><strong>{dollars(Math.abs(difference))} to reconcile</strong><p>The account balance is {difference>0?'higher':'lower'} than cash + envelopes + earned + charity.</p></div>:<p className="feature-reconciled">All funds accounted for</p>}
      <button className="feature-disclosure" aria-expanded={audit} onClick={()=>setAudit(!audit)}>Balance adjustment history<ChevronDown size={17}/></button>
      {audit&&<div>{state.adjustments.filter(a=>a.area===area).slice().reverse().map(adjustment=><div className="feature-adjustment" key={adjustment.id}><strong>{adjustment.reason}</strong><small>{stamp(adjustment.createdAt,state.settings.timezone)}</small><span>Account {dollars(adjustment.before.account)} → {dollars(adjustment.after.account)}</span><span>Cash {dollars(adjustment.before.cash)} → {dollars(adjustment.after.cash)}</span><span>Earned {dollars(adjustment.before.earned)} → {dollars(adjustment.after.earned)}</span><span>Charity {dollars(adjustment.before.lost)} → {dollars(adjustment.after.lost)}</span></div>)}{!state.adjustments.some(a=>a.area===area)&&<Empty>No manual adjustments yet.</Empty>}</div>}
    </section>}
    {difference!==0&&!balances&&<button className="secondary-reconcile" onClick={()=>setBalances(true)}>{dollars(Math.abs(difference))} to reconcile · Review balances</button>}
    {create&&<EnvelopeEditor state={state} now={now} run={run} initialArea={area} close={()=>setCreate(false)}/>}
    {adjust&&<LedgerEditor ledger={ledger} reserved={reserved} run={run} close={()=>setAdjust(false)}/>}
    {selected&&<EnvelopeActions envelope={state.envelopes.find(e=>e.id===selected.envelope.id)??selected.envelope} now={now} zone={state.settings.timezone} run={run} initialExtend={selected.extend} close={()=>setSelected(undefined)}/>}
  </div>;
}
function LedgerEditor({ledger,reserved,run,close}:{ledger:Ledger;reserved:number;run:FeatureProps['run'];close:()=>void}){
 const [account,setAccount]=useState((ledger.account/100).toFixed(2));const [cash,setCash]=useState((ledger.cash/100).toFixed(2));const [earned,setEarned]=useState((ledger.earned/100).toFixed(2));const [lost,setLost]=useState((ledger.lost/100).toFixed(2));const [reason,setReason]=useState('');
 const inputs=[{label:'Bank account total',value:account,change:setAccount},{label:'Available cash',value:cash,change:setCash},{label:'Earned',value:earned,change:setEarned},{label:'Lost / charity',value:lost,change:setLost}];const mismatch=Math.round(Number(account)*100)-(Math.round(Number(cash)*100)+Math.round(Number(earned)*100)+Math.round(Number(lost)*100)+reserved);
 return <Modal title={`Adjust ${ledger.area} balances`} onClose={close}><FeatureForm run={run} onSaved={close} command={()=>({type:'ledger.adjust',area:ledger.area,account:Math.round(Number(account)*100),cash:Math.round(Number(cash)*100),earned:Math.round(Number(earned)*100),lost:Math.round(Number(lost)*100),reason})}><p className="muted">Enter the new totals in dollars. This records your balances and does not transfer money.</p>{inputs.map(input=><Field key={input.label} label={input.label}><input required type="number" inputMode="decimal" min="0" step="0.01" value={input.value} onChange={e=>input.change(e.target.value)}/></Field>)}<p className="muted">Active envelopes: {dollars(reserved)}. Envelopes change when you create or resolve one.</p>{mismatch!==0&&<p className="feature-warning">These balances differ by {dollars(Math.abs(mismatch))}. You can still save and reconcile later.</p>}<Field label="Reason for adjustment"><textarea required rows={3} value={reason} maxLength={1000} onChange={e=>setReason(e.target.value)} placeholder="Opening balance, updated bank balance, spending…"/></Field></FeatureForm></Modal>;
}
function EnvelopeEditor({state,now,run,initialArea,close}:FeatureProps&{initialArea:Area;close:()=>void}) {
 const [area,setArea]=useState(initialArea);const [title,setTitle]=useState('');const [amount,setAmount]=useState('');const [purpose,setPurpose]=useState('');const [notes,setNotes]=useState('');const [expiresAt,setExpiresAt]=useState(new Date(Date.parse(now)+7*86400000).toISOString());const available=state.ledgers.find(l=>l.area===area)?.cash??0;
 return <Modal title="New envelope" onClose={close}><FeatureForm run={run} onSaved={close} label="Reserve money" command={()=>({type:'envelope.create',envelope:{area,title,amount:Math.round(Number(amount)*100),purpose,expiresAt,notes}})}><Field label="Envelope name"><input autoFocus required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Three gym visits this week"/></Field><Field label="Money comes from"><select value={area} onChange={e=>setArea(e.target.value as Area)}><option value="personal">Personal cash</option><option value="company">Company cash</option></select></Field><Field label="Amount in dollars"><input required min="0.01" max={available/100} step="0.01" type="number" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)}/></Field><p className="muted">{dollars(available)} available to reserve</p><Field label="What is the commitment or purpose?"><textarea required maxLength={1000} rows={3} value={purpose} onChange={e=>setPurpose(e.target.value)} placeholder="What earns this money? What happens if you do not finish?"/></Field><DateTimeField label="Expires" value={expiresAt} onChange={setExpiresAt}/><Field label="Notes (optional)"><textarea rows={2} value={notes} onChange={e=>setNotes(e.target.value)} maxLength={10000}/></Field></FeatureForm></Modal>;
}
function EnvelopeActions({envelope,now,zone,run,close,initialExtend=false}:{envelope:Envelope;now:string;zone:string;run:FeatureProps['run'];close:()=>void;initialExtend?:boolean}){
 const [extend,setExtend]=useState(initialExtend);const [expiresAt,setExpiresAt]=useState(new Date(Math.max(Date.parse(now),Date.parse(envelope.expiresAt))+86400000).toISOString());const [busy,setBusy]=useState(false);const expired=Date.parse(envelope.expiresAt)<=Date.parse(now);
 async function resolve(outcome:'earned'|'lost'|'handled'|'cancelled'){setBusy(true);try{if(await run({type:'envelope.resolve',id:envelope.id,outcome}))close();}finally{setBusy(false);}}
 return <Modal title={envelope.title} onClose={close}><div className="feature-form"><strong className="feature-envelope-amount">{dollars(envelope.amount)}</strong><p>{envelope.purpose}</p><small>{envelope.area==='personal'?'Personal':'Company'} · {expired?'Expired':'Expires'} {stamp(envelope.expiresAt,zone)}</small>{envelope.notes&&<p className="muted">{envelope.notes}</p>}{envelope.status==='active'&&<>{expired?<><p>How did it go? The money stays reserved until you choose.</p><button className="primary" disabled={busy} onClick={()=>resolve('earned')}>Earned · move to spending money</button><button disabled={busy} onClick={()=>resolve('lost')}><Heart size={17}/> Lost · set aside for charity</button></>:<p className="muted">Review the result when this commitment expires.</p>}{extend?<FeatureForm run={run} onSaved={close} label="Extend expiry" command={()=>({type:'envelope.resolve',id:envelope.id,outcome:'extend',expiresAt})}><DateTimeField label="New expiry" value={expiresAt} onChange={setExpiresAt}/></FeatureForm>:<button disabled={busy} onClick={()=>setExtend(true)}>Extend expiry</button>}<button className="feature-link-button" disabled={busy} onClick={()=>resolve('cancelled')}>Cancel and return to cash</button></>}{envelope.status==='lost'&&<><p>Confirm only after you have paid this amount to charity. Your recorded charity balance and bank account total will both decrease by {dollars(envelope.amount)}.</p><button className="primary" disabled={busy} onClick={()=>resolve('handled')}>I have paid {dollars(envelope.amount)}</button></>}</div></Modal>;
}
