import { useState } from 'react';
import { Plus, Pin, PinOff, Pause } from 'lucide-react';
import { goalProgress } from '../../shared/selectors';
import type { Goal } from '../../shared/types';
import { Modal, Field, Empty } from '../ui';
import { FeatureForm, PageHeading, dayKey, prettyDate, shiftDay, draft, type FeatureProps } from './common';
import '../features-life-v2.css';

const horizons=[['all','All goals'],['1','Today'],['7','This week'],['31','This month'],['365','1 year'],['730','2 years'],['1095','3 years'],['1826','5 years'],['3653','10 years']];
export function GoalsPage({state,now,run,add}:FeatureProps) {
 const [editing,setEditing]=useState<Goal>();
 const [creating,setCreating]=useState(Boolean(add));
 const [parentId,setParentId]=useState<string>();
 const [horizon,setHorizon]=useState('all');
 const [showArchive,setShowArchive]=useState(false);
 const today=dayKey(now,state.settings.timezone);
 const all=state.goals.filter(goal=>showArchive||(!goal.archived&&goal.status!=='archived'));
 const selected=all.filter(goal=>horizon==='all'||goal.targetDate<=shiftDay(today,Number(horizon)-1));
 const visibleIds=new Set(selected.map(goal=>goal.id));
 for(const goal of selected){let parent=goal.parentId;let guard=0;while(parent&&guard++<all.length){visibleIds.add(parent);parent=all.find(item=>item.id===parent)?.parentId;}}
 const roots=all.filter(goal=>!goal.parentId||!all.some(parent=>parent.id===goal.parentId));
 const visibleRoots=roots.filter(goal=>visibleIds.has(goal.id));
 function addStep(id?:string){setParentId(id);setCreating(true);}
 function goalCard(goal:Goal,depth=0):React.ReactNode {
  if(!visibleIds.has(goal.id))return null;
  const children=all.filter(child=>child.parentId===goal.id);
  const progress=goalProgress(state,goal.id);
  const complete=goal.checked||goal.status==='completed';
  const archived=goal.archived||goal.status==='archived';
  const toggle=()=>run({type:'goal.save',goal:{...draft(goal),checked:!complete,status:complete?'active':'completed'}});
  const title=<button className="feature-text-button feature-goal-title" onClick={()=>setEditing(goal)}><span>{goal.title}</span><small>{prettyDate(goal.targetDate)}{archived?' · Archived':''}</small></button>;
  if(depth)return <div key={goal.id} className={`feature-goal feature-goal-child ${goal.status==='paused'?'life-paused':''}`}>
   <div className="life-goal-child-line">{title}<button className={`life-leaf-check ${complete?'checked':''}`} aria-label={`${complete?'Reopen':'Complete'} ${goal.title}`} aria-pressed={complete} disabled={Boolean(archived)||children.length>0} onClick={toggle}>{progress.percent}%</button><button className="life-child-add" aria-label={`Add a step to ${goal.title}`} onClick={()=>addStep(goal.id)} disabled={Boolean(archived)}><Plus size={12}/></button></div>
   {children.length>0&&<div className="feature-goal-children">{children.map(child=>goalCard(child,depth+1))}</div>}
  </div>;
  return <section key={goal.id} className={`feature-goal life-goal-card ${goal.status==='paused'?'life-paused':''}`}>
   <div className="life-goal-top">{title}<button className="life-goal-state" aria-label={goal.status==='paused'?`Resume ${goal.title}`:`${goal.pinned?'Unpin':'Pin'} ${goal.title}`} disabled={Boolean(archived)} onClick={()=>run({type:'goal.save',goal:{...draft(goal),...(goal.status==='paused'?{status:'active' as const,checked:false}:{pinned:!goal.pinned})}})}>{goal.status==='paused'?<Pause size={16}/>:goal.pinned?<PinOff size={16}/>:<Pin size={16}/>}</button></div>
   <div className="feature-goal-line life-goal-progress">{children.length?<span className="feature-percent" role="progressbar" aria-label={`${goal.title} progress`} aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>{progress.percent}%</span>:<button className="feature-percent" aria-label={`${complete?'Reopen':'Complete'} ${goal.title}`} aria-pressed={complete} disabled={Boolean(archived)} onClick={toggle}>{progress.percent}%</button>}</div>
   <p className="feature-step-count">{progress.completed} of {progress.total} steps complete</p>
   {goal.notes&&<p className="muted feature-goal-notes">{goal.notes}</p>}
   {children.length>0&&<div className="feature-goal-children">{children.map(child=>goalCard(child,depth+1))}</div>}
   {!archived&&<button className="feature-link-button" onClick={()=>addStep(goal.id)}><Plus size={12}/>Add a step</button>}
  </section>;
 }
 return <div className="feature-page life-v2 life-goals">
  <PageHeading eyebrow="A little closer, every day" title="Your goals" description="See the next step and the bigger picture." action={<button className="icon-button life-heading-add" aria-label="Add goal" onClick={()=>addStep()}><Plus size={20}/></button>}/>
  <div className="feature-horizons" role="group" aria-label="Goal horizon">{horizons.map(([value,label])=><button key={value} className={horizon===value?'selected':''} aria-pressed={horizon===value} onClick={()=>setHorizon(value)}>{label}</button>)}</div>
  <div className="feature-row feature-section-label life-goal-count"><span>{visibleRoots.length} {visibleRoots.length===1?'goal':'goals'}</span><label className="feature-inline-check"><input type="checkbox" checked={showArchive} onChange={event=>setShowArchive(event.target.checked)}/>Include archived</label></div>
  {visibleRoots.length?<div className="feature-stack">{visibleRoots.map(goal=>goalCard(goal))}</div>:<Empty>No goals here yet. Add a big goal, then break it into smaller steps.</Empty>}
  {(creating||editing)&&<GoalEditor state={state} run={run} now={now} goal={editing} parentId={parentId} close={()=>{setCreating(false);setEditing(undefined);setParentId(undefined);}}/>}
 </div>;
}
function GoalEditor({state,run,now,goal,parentId,close}:FeatureProps&{goal?:Goal;parentId?:string;close:()=>void}) {
 const rawRun=run; run=command=>rawRun(command.type==='goal.save'?{...command,goal:draft(command.goal as Goal)}:command);
 const [title,setTitle]=useState(goal?.title??'');const [notes,setNotes]=useState(goal?.notes??'');const [targetDate,setTargetDate]=useState(goal?.targetDate??dayKey(now,state.settings.timezone));const [parent,setParent]=useState(goal?.parentId??parentId??'');const [status,setStatus]=useState<Goal['status']>(goal?.status??'active');const [pinned,setPinned]=useState(goal?.pinned??false);
 const descendants=new Set<string>();function visit(id:string){for(const child of state.goals.filter(g=>g.parentId===id)){if(descendants.has(child.id))continue;descendants.add(child.id);visit(child.id);}}if(goal)visit(goal.id);
 return <Modal title={goal?'Edit goal':parentId?'Add a step':'Add a goal'} onClose={close}><FeatureForm run={run} onSaved={close} command={()=>({type:'goal.save',goal:{...(goal??{}),title,notes,targetDate,parentId:parent||undefined,status,pinned,checked:status==='completed'}})} extra={goal&&!goal.archived?<button type="button" className="feature-link-button" onClick={async()=>{if(await run({type:'record.archive',collection:'goals',id:goal.id,archived:true}))close();}}>Archive goal</button>:goal?.archived?<button type="button" onClick={async()=>{if(await run({type:'record.archive',collection:'goals',id:goal.id,archived:false}))close();}}>Restore goal</button>:null}><Field label="Goal or step"><input autoFocus required maxLength={200} value={title} onChange={e=>setTitle(e.target.value)} placeholder="What are you working toward?"/></Field><Field label="Target date"><input required type="date" value={targetDate} onChange={e=>setTargetDate(e.target.value)}/></Field><Field label="Part of a bigger goal"><select value={parent} onChange={e=>setParent(e.target.value)}><option value="">Standalone goal</option>{state.goals.filter(g=>!g.archived&&g.status!=='archived'&&g.id!==goal?.id&&!descendants.has(g.id)).map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></Field><Field label="Status"><select value={status} onChange={e=>setStatus(e.target.value as Goal['status'])}><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option>{status==='archived'&&<option value="archived">Archived</option>}</select></Field><Field label="Notes"><textarea rows={3} value={notes} onChange={e=>setNotes(e.target.value)}/></Field><label className="feature-inline-check"><input type="checkbox" checked={pinned} onChange={e=>setPinned(e.target.checked)}/> Pin to Home</label></FeatureForm></Modal>;
}
