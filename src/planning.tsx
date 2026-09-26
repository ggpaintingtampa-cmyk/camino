import { useState, useRef, useEffect, type PointerEvent, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, Clock3, GripVertical, Plus, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Moon, Sun, AlertTriangle, Compass, Activity } from 'lucide-react';
import type { Task, Block, Snapshot, Command, Day } from '../shared/types';
import type { TemplateBlock, DayTemplate } from '../shared/types';
import { dateKey, localInstant, minuteOfDay, timeLabel, addDays } from '../shared/dates';
import { unscheduledTasks, overlaps, dailySteps } from '../shared/selectors';
import { summaryForDay } from '../shared/domain';
import { Modal, Field, DurationField, DateTimeField, Empty, type PageProps } from './ui';
import './planning-v2.css';

export function nextStart(now: string, date?: string) {
  const d = date ?? dateKey(now);
  const m = Math.min(1435, Math.ceil(minuteOfDay(now) / 5) * 5);
  return localInstant(d, date ? '09:00' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
}
export function plusMinutes(time: string, minutes: number) { return new Date(Date.parse(time) + minutes * 60000).toISOString(); }
function DurationChoices({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [custom, setCustom] = useState(![15, 30, 60, 120].includes(value));
  return <div className="planning-duration"><span>Duration</span><div className="planning-duration-chips">{[15, 30, 60, 120].map(n => <button type="button" key={n} className={value === n ? 'selected' : ''} aria-pressed={value === n} onClick={() => { onChange(n); setCustom(false); }}>{n < 60 ? `${n}m` : `${n / 60}h`}</button>)}<button type="button" className={custom ? 'selected' : ''} aria-expanded={custom} onClick={() => setCustom(!custom)}>Custom</button></div>{custom && <DurationField value={value} onChange={onChange}/>}</div>;
}
function DayBrand() { return <div className="planning-day-brand"><span><Compass size={18}/></span><div>Caminos<small>by Morgan</small></div></div>; }

export function TaskEditor({ state, run, now, onClose, task, block, appointment = false, startAt }: { state: Snapshot; run: PageProps['run']; now: string; onClose: () => void; task?: Task; block?: Block; appointment?: boolean; startAt?: string }) {
  const [title, setTitle] = useState(task?.title ?? block?.title ?? '');
  const [duration, setDuration] = useState(task?.duration ?? (block ? (Date.parse(block.end) - Date.parse(block.start)) / 60000 : 30));
  const [tag, setTag] = useState<'Personal' | 'Work'>(task?.tag ?? block?.tag ?? 'Personal');
  const [notes, setNotes] = useState(task?.notes ?? block?.notes ?? '');
  const [labels, setLabels] = useState(task?.labels.join(', ') ?? '');
  const [goalId, setGoal] = useState(task?.goalId ?? '');
  const [scheduled, setScheduled] = useState(!!block || !!startAt || appointment);
  const [dateExpanded, setDateExpanded] = useState(!!block || !!startAt || appointment);
  const [start, setStart] = useState(block?.start ?? startAt ?? nextStart(now));
  const [busy, setBusy] = useState(false);
  const [taskId] = useState(() => task?.id ?? crypto.randomUUID());
  const [newBlockId] = useState(() => crypto.randomUUID());
  const [more, setMore] = useState(true);
  const candidate = { id: block?.id ?? 'candidate', start, end: plusMinutes(start, duration) };
  const collisions = scheduled ? overlaps(state, candidate) : [];
  const isRoutine = block?.kind === 'routine';
  async function save(e: FormEvent, forceSchedule = scheduled) {
    e.preventDefault(); setBusy(true);
    try {
      if (appointment || isRoutine) {
        if (await run({ type: 'block.save', block: { ...(block ?? {}), id: block?.id ?? newBlockId, title: title.trim(), kind: isRoutine ? 'routine' : 'appointment', tag, start, end: plusMinutes(start, duration), notes, status: block?.status ?? 'pending' } })) onClose();
        return;
      }
      if (!await run({ type: 'task.save', task: { ...(task ?? {}), id: taskId, title: title.trim(), duration, tag, labels: labels.split(',').map(x => x.trim()).filter(Boolean), goalId: goalId || undefined, notes, status: task?.status ?? 'open' } })) return;
      if (!forceSchedule && block && !await run({ type: 'block.resolve', id: block.id, outcome: 'cancelled' })) return;
      if (forceSchedule && !await run({ type: 'block.save', block: { ...(block ?? {}), id: block?.id ?? newBlockId, title: title.trim(), taskId, kind: 'task', tag, start, end: plusMinutes(start, duration), notes, status: block?.status ?? 'pending' } })) return;
      onClose();
    } finally { setBusy(false); }
  }
  return <Modal className="planning-task-sheet" title={appointment ? (block ? 'Edit appointment' : 'New appointment') : isRoutine ? 'Edit routine' : task ? 'Plan task' : 'New task'} onClose={onClose}>
    <form className="planning-task-form" onSubmit={e => save(e)}>
      <Field label={appointment ? 'What is happening?' : 'What needs doing?'}><input aria-label="Title" autoFocus required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder={appointment ? 'Add an appointment' : 'Give your next step a name'}/></Field>
      <div className="planning-area" aria-label="Task area">{(['Personal', 'Work'] as const).map(t => <button type="button" className={tag === t ? 'selected' : ''} aria-pressed={tag === t} key={t} onClick={() => setTag(t)}>{t}</button>)}</div>
      <button type="button" className="planning-more-options" aria-expanded={more} onClick={() => setMore(!more)}>More options{more ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
      {more && <div className="planning-task-options">
        <DurationChoices value={duration} onChange={setDuration}/>
        <div className="planning-schedule-choice">
          {!appointment && !isRoutine ? <label><input type="checkbox" aria-label={block ? 'Keep on schedule (uncheck to return to list)' : 'Assign a time'} checked={scheduled} onChange={e => { setScheduled(e.target.checked); setDateExpanded(e.target.checked); }}/><CalendarDays size={15}/><span>{scheduled ? `Schedule for ${dateKey(start) === dateKey(now) ? 'today' : dateKey(start) === addDays(dateKey(now), 1) ? 'tomorrow' : dateKey(start)}` : 'Assign a day and time'}</span></label> : <span><CalendarDays size={15}/>Scheduled for {dateKey(start)}</span>}
          <button type="button" data-dirty onClick={() => { setScheduled(true); setDateExpanded(!dateExpanded); }}>{scheduled ? timeLabel(start) : 'Choose'}</button>
        </div>
        {scheduled && dateExpanded && <div className="planning-date-options"><div className="chips"><button type="button" data-dirty onClick={() => setStart(nextStart(now, dateKey(now)))}>Today</button><button type="button" data-dirty onClick={() => setStart(nextStart(now, addDays(dateKey(now), 1)))}>Tomorrow</button></div><DateTimeField label="Starts" value={start} onChange={setStart}/><p>{timeLabel(start)} – {timeLabel(plusMinutes(start, duration))} · {duration} minutes</p></div>}
        {collisions.length > 0 && <div className="notice warning"><AlertTriangle size={16}/><span>Overlaps {collisions.map(b => b.title).join(', ')}. You can still save.</span></div>}
        <details className="planning-extra-fields"><summary>Notes, labels & goal</summary><div className="stack">{!appointment && !isRoutine && <><Field label="Goal (optional)"><select value={goalId} onChange={e => setGoal(e.target.value)}><option value="">No linked goal</option>{state.goals.filter(g => !g.archived && g.status !== 'archived').map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></Field><Field label="Labels (optional)"><input value={labels} onChange={e => setLabels(e.target.value)} placeholder="Home, Health, Learning"/></Field></>}<Field label="Notes"><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}/></Field></div></details>
      </div>}
      <div className="planning-task-actions">{!appointment && !isRoutine && <button type="button" disabled={busy || !title.trim()} onClick={e => save(e, true)} aria-label="Save and schedule">Save & schedule</button>}<button className="primary" disabled={busy} aria-label={scheduled ? 'Save to schedule' : 'Save to task list'}>{busy ? 'Saving…' : 'Save'}</button></div>
    </form>
  </Modal>;
}

export function ResolveDialog({ block, now, run, onClose }: { block: Block; now: string; run: PageProps['run']; onClose: () => void }) {
  const [mode, setMode] = useState<'choices' | 'partial' | 'snooze'>('choices');
  const [duration, setDuration] = useState(30);
  const [schedule, setSchedule] = useState(false);
  const [start, setStart] = useState(nextStart(now));
  const [busy, setBusy] = useState(false);
  const send = async (command: Command) => { setBusy(true); try { if (await run(command)) onClose(); } finally { setBusy(false); } };
  const snooze = (minutes: number) => send({ type: 'block.snooze', id: block.id, until: plusMinutes(now, minutes) });
  const tonight = () => send({ type: 'block.snooze', id: block.id, until: localInstant(addDays(dateKey(now), minuteOfDay(now) >= 1200 ? 1 : 0), '20:00') });
  const partial = (minutes: number) => { setDuration(minutes); setMode('partial'); };
  return <Modal className="planning-outcome-sheet" title={mode === 'choices' ? 'How did it go?' : mode === 'partial' ? 'Plan the remaining work' : 'Remind me later'} onClose={onClose}>
    <div className="planning-outcome-header"><span className="planning-badge">{Date.parse(block.end) <= Date.parse(now) ? 'Completed block' : 'Your current block'}</span><h2>{block.title}</h2><p>{timeLabel(block.start)} – {timeLabel(block.end)}</p></div>
    {mode === 'choices' ? <><h3 className="planning-outcome-question">How did it go?</h3><div className="planning-outcome-choices">
      <button className="primary" disabled={busy} aria-label={block.kind === 'appointment' ? 'Attended' : 'Complete'} onClick={() => send({ type: 'block.resolve', id: block.id, outcome: block.kind === 'appointment' ? 'attended' : 'complete' })}>{block.kind === 'appointment' ? 'Attended' : 'Done'}</button>
      {block.kind !== 'appointment' && <section className="planning-choice-group"><button type="button" className="planning-choice-title" onClick={() => setMode('partial')}>Partially done</button><div className="planning-quick-chips">{[15, 30, 60].map(m => <button type="button" disabled={busy} key={m} aria-label={`Partially done, ${m} minutes remaining`} onClick={() => partial(m)}>{m === 60 ? '1h' : `${m}m`}</button>)}</div></section>}
      <button disabled={busy} aria-label={block.kind === 'appointment' ? 'Missed' : 'Not completed · return to list'} onClick={() => send({ type: 'block.resolve', id: block.id, outcome: 'missed' })}>{block.kind === 'appointment' ? 'Missed' : "Didn't happen"}</button>
      {block.kind === 'appointment' && <button disabled={busy} onClick={() => send({ type: 'block.resolve', id: block.id, outcome: 'cancelled' })}>Cancelled</button>}
      <section className="planning-choice-group"><button type="button" className="planning-choice-title" onClick={() => setMode('snooze')}>Snooze</button><div className="planning-quick-chips">{[10, 30, 60].map(m => <button key={m} disabled={busy} aria-label={m === 60 ? '1 hour' : `${m} minutes`} onClick={() => snooze(m)}>{m === 60 ? '1 hr' : `${m} min`}</button>)}<button disabled={busy} onClick={tonight}>Tonight</button></div></section>
    </div><button className="planning-skip" onClick={onClose}>Skip for now</button></> : <div className="stack">
      {mode === 'partial' ? <><p className="muted">Set the time you need for the remaining work. Your original block stays in history.</p><DurationField value={duration} onChange={setDuration}/><label className="check-label"><input type="checkbox" checked={schedule} onChange={e => setSchedule(e.target.checked)}/>Assign a day and time now</label>{schedule && <DateTimeField label="New task starts" value={start} onChange={setStart}/>}<button disabled={busy} className="primary" onClick={() => send({ type: 'block.resolve', id: block.id, outcome: 'partial', remainingDuration: duration, ...(schedule ? { remainingStart: start } : {}) })}>{schedule ? 'Schedule remaining work' : 'Send remaining work to list'}</button></> : <><div className="quick-grid">{[10, 30, 60].map(m => <button disabled={busy} key={m} onClick={() => snooze(m)}>{m === 60 ? '1 hour' : `${m} minutes`}</button>)}<button disabled={busy} onClick={tonight}>Tonight · 8 PM</button></div><DateTimeField label="Custom reminder" value={start} onChange={setStart}/><button disabled={busy} onClick={() => send({ type: 'block.snooze', id: block.id, until: start })}>Snooze until selected time</button></>}
      <button className="text-button" onClick={() => setMode('choices')}>Back to choices</button>
    </div>}
  </Modal>;
}

export function SchedulePage({ state, now, run, initialDate, add, onResolve }: PageProps & { initialDate?: string; onResolve: (b: Block) => void }) {
  const [date, setDate] = useState(initialDate ?? dateKey(now));
  const [editor, setEditor] = useState<{ task?: Task; block?: Block; appointment?: boolean; startAt?: string } | null>(add ? {} : null);
  const [showList, setShowList] = useState(false);
  const [timeline, setTimeline] = useState(false);
  const [template, setTemplate] = useState('');
  const [drag, setDrag] = useState<{ task?: Task; block?: Block; x: number; y: number } | null>(null);
  const [dropError, setDropError] = useState('');
  const track = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const pending = unscheduledTasks(state);
  const blocks = state.blocks.filter(b => !b.archived && (dateKey(b.start) === date || dateKey(b.end) === date)).sort((a, b) => a.start.localeCompare(b.start));
  useEffect(() => { if (timeline && date === dateKey(now)) marker.current?.scrollIntoView({ block: 'center', behavior: 'instant' }); }, [date, timeline]);
  const startDrag = (e: PointerEvent, task?: Task, block?: Block) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ task, block, x: e.clientX, y: e.clientY }); setDropError(''); };
  function move(e: PointerEvent) { if (!drag) return; setDrag({ ...drag, x: e.clientX, y: e.clientY }); const viewport = document.querySelector('.content'); if (viewport) { const rect = viewport.getBoundingClientRect(); if (e.clientY > rect.bottom - 90) viewport.scrollTop += 22; if (e.clientY < rect.top + 80) viewport.scrollTop -= 22; } }
  function drop(e: PointerEvent) {
    if (!drag) return;
    const d = drag; setDrag(null);
    const box = track.current?.getBoundingClientRect();
    if (!box || e.clientY < box.top || e.clientY > box.bottom || e.clientX < box.left || e.clientX > box.right) { setDropError('Drop on the timeline, or tap a task to choose its time.'); return; }
    const m = Math.max(0, Math.min(1435, Math.round((e.clientY - box.top) / 1.6 / 5) * 5));
    let start: string;
    try { start = localInstant(date, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`); } catch { setDropError('That time is skipped by daylight saving. Choose another time.'); return; }
    if (d.block) setEditor({ block: d.block, task: state.tasks.find(t => t.id === d.block?.taskId), appointment: d.block.kind === 'appointment', startAt: start });
    else setEditor({ task: d.task, startAt: start });
  }
  const openBlock = (b: Block) => {
    if (b.status === 'pending' && Date.parse(b.end) < Date.parse(now)) onResolve(b);
    else if (b.status === 'pending') setEditor({ task: state.tasks.find(t => t.id === b.taskId), block: b, appointment: b.kind === 'appointment' });
    else setEditor({ task: state.tasks.find(t => t.id === b.taskId), block: b, appointment: b.kind === 'appointment' });
  };
  const statusText = (b: Block) => b.status === 'pending' ? b.actualStart ? 'In progress' : Date.parse(b.end) < Date.parse(now) ? 'Needs a result' : 'Upcoming' : b.status === 'complete' || b.status === 'attended' ? 'Completed' : b.status === 'missed' ? 'Not completed' : b.status[0].toUpperCase() + b.status.slice(1);
  const nowRow = <div className="planning-agenda-now" ref={timeline ? undefined : marker}><time>{timeLabel(now)}</time><span/></div>;
  const visibleBlocks = blocks.filter(b => b.status !== 'cancelled');
  const after = visibleBlocks.findIndex(b => Date.parse(b.start) > Date.parse(now));
  return <div className="planning-schedule">
    <header className="page-heading"><p className="eyebrow">A little structure. Room to adapt.</p><div className="row"><h1>Your schedule</h1><button className="icon-button" aria-label="Add appointment" onClick={() => setEditor({ appointment: true, startAt: nextStart(now, date) })}><Plus size={20}/></button></div></header>
    <div className="date-bar"><button aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={18}/></button><label className="planning-date-label"><input aria-label="Schedule date" type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)}/><CalendarDays size={15}/></label><button aria-label="Next day" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={18}/></button></div>
    <div className="schedule-tools"><button className="planning-now-button" onClick={() => { setDate(dateKey(now)); if (timeline) marker.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }}>Now</button><button aria-expanded={showList} onClick={() => setShowList(!showList)}>Unscheduled <span className="count">{pending.length}</span></button><button onClick={() => setEditor({ startAt: nextStart(now, date) })}><Plus size={12}/>Task</button></div>
    {showList && <section className="card backlog"><h2>A place for later</h2><p className="muted">Tap a task to choose its day and time.{timeline ? ' You can also drag its handle onto the timeline.' : ''}</p>{pending.length === 0 ? <Empty>Your task list is clear.</Empty> : pending.map(t => <div className="backlog-row" key={t.id}>{timeline && <button className="drag-handle" aria-label={`Drag ${t.title}`} style={{ touchAction: 'none' }} onPointerDown={e => startDrag(e, t)} onPointerMove={move} onPointerUp={drop} onPointerCancel={() => setDrag(null)}><GripVertical size={20}/></button>}<button className="task-row" onClick={() => setEditor({ task: t, startAt: nextStart(now, date) })}><span><strong>{t.title}</strong><small>{t.tag} · {t.duration} min</small></span><ArrowRight size={16}/></button></div>)}</section>}
    <details className="template-apply"><summary>Apply a day template<ChevronDown size={16}/></summary><div className="row"><select aria-label="Day template" value={template} onChange={e => setTemplate(e.target.value)}><option value="">Choose template…</option>{state.templates.filter(t => !t.archived).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select><button disabled={!template} onClick={() => run({ type: 'template.apply', id: template, date })}>Apply</button></div><p className="muted">Adds blocks to {date}; existing plans stay in place.</p></details>
    {dropError && <p role="status" className="notice">{dropError}</p>}
    {!timeline ? <div className="planning-agenda">{visibleBlocks.map((b, index) => {
      const active = b.status === 'pending' && !!b.actualStart;
      const completed = b.status === 'complete' || b.status === 'attended';
      return <div key={b.id}>{date === dateKey(now) && index === after && nowRow}<div className="planning-agenda-row"><time>{timeLabel(b.start)}</time><div className={`schedule-block planning-agenda-card ${b.status} ${active ? 'is-active' : ''}`}><button className="block-content" onClick={() => openBlock(b)}><span className="planning-agenda-title"><strong>{b.title}</strong>{completed ? <CheckCircle2 size={14}/> : <span className={`planning-badge ${active ? '' : b.tag === 'Work' ? 'is-work' : 'is-personal'}`}>{active ? 'Active' : b.tag}</span>}</span><small>{statusText(b)} · {Math.round((Date.parse(b.end) - Date.parse(b.start)) / 60000)} min</small></button></div></div></div>;
    })}{date === dateKey(now) && after === -1 && nowRow}{!visibleBlocks.length && <div className="planning-agenda-empty"><CalendarDays size={24}/><h2>A little room in your day.</h2><p>Add a task or appointment whenever you’re ready.</p><button onClick={() => setEditor({ startAt: nextStart(now, date) })}>Plan a task<Plus size={14}/></button></div>}</div> : <div className="planning-timeline-wrap"><div className="timeline" ref={track}>{Array.from({ length: 24 }, (_, hour) => <div className="hour" key={hour} style={{ top: hour * 96 }}><span>{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span><button aria-label={`Schedule at ${hour}:00`} onClick={() => { try { setEditor({ startAt: localInstant(date, `${String(hour).padStart(2, '0')}:00`) }); } catch { setDropError('That hour is skipped by daylight saving. Choose another time.'); } }}/></div>)}{blocks.map(b => { const task = state.tasks.find(t => t.id === b.taskId); const min = dateKey(b.start) < date ? 0 : minuteOfDay(b.start); const end = dateKey(b.end) > date ? 1440 : minuteOfDay(b.end); const collision = overlaps(state, b).length > 0; return <div key={b.id} className={`schedule-block ${b.tag.toLowerCase()} ${b.status} ${collision ? 'overlap' : ''}`} style={{ top: min * 1.6, height: Math.max(32, (end - min) * 1.6), left: collision ? '26%' : '19%', right: collision ? '4%' : '2%' }}><button className="block-content" onClick={() => openBlock(b)}><strong>{b.title}</strong><small>{timeLabel(b.start)}–{timeLabel(b.end)} · {statusText(b)}{collision ? ' · overlap' : ''}</small></button>{b.status === 'pending' && <button className="drag-handle" aria-label={`Move ${b.title}`} style={{ touchAction: 'none' }} onPointerDown={e => startDrag(e, task, b)} onPointerMove={move} onPointerUp={drop} onPointerCancel={() => setDrag(null)}><GripVertical size={16}/></button>}</div>; })}{date === dateKey(now) && <div className="now-line" ref={marker} style={{ top: minuteOfDay(now) * 1.6 }}><span>{timeLabel(now)}</span></div>}<span className="timeline-end">12 AM</span></div></div>}
    <button className="planning-view-toggle" aria-pressed={timeline} onClick={() => setTimeline(!timeline)}>{timeline ? 'Back to day overview' : 'Open 24-hour timeline'}<ArrowRight size={13}/></button>
    {drag && <div className="drag-preview" style={{ left: drag.x + 10, top: drag.y - 30 }}>{drag.task?.title ?? drag.block?.title}</div>}
    {editor && <TaskEditor state={state} now={now} run={run} {...editor} block={editor.block ? { ...editor.block, start: editor.startAt ?? editor.block.start, end: editor.startAt ? plusMinutes(editor.startAt, (Date.parse(editor.block.end) - Date.parse(editor.block.start)) / 60000) : editor.block.end } : undefined} onClose={() => setEditor(null)}/>}
  </div>;
}

export function StartDayDialog({ state, now, run, onClose }: { state: Snapshot; now: string; run: PageProps['run']; onClose: () => void }) {
  const previous = state.days.find(d => !d.endedAt);
  const [wake, setWake] = useState(now);
  const [sleep, setSleep] = useState('');
  const [quality, setQuality] = useState('');
  const [weight, setWeight] = useState('');
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [notice, setNotice] = useState('');
  const [wakeDetails, setWakeDetails] = useState(false);
  const [sleepDetails, setSleepDetails] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  async function start(e: FormEvent, onlyWake = false) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const logDefaults = { category: '', description: '', notes: '' };
      if (step < 1) { if (!await run({ type: 'day.start', date: dateKey(wake), wakeAt: wake, ...(!onlyWake && mood ? { mood: Number(mood) } : {}), ...(!onlyWake && energy ? { energy: Number(energy) } : {}), note: onlyWake ? '' : note })) return; setStep(1); }
      if (!onlyWake && step < 2 && weight) { if (!await run({ type: 'log.save', log: { ...logDefaults, kind: 'weight', at: wake, value: Number(weight) } })) { setNotice('Your day is started. Save again to finish your weight check-in.'); return; } setStep(2); }
      if (!onlyWake && sleep) { if (!await run({ type: 'log.save', log: { ...logDefaults, kind: 'sleep', at: wake, start: sleep, end: wake, ...(quality ? { quality: Number(quality) } : {}) } })) { setNotice('Your day is started. Save again to finish your sleep check-in.'); return; } }
      onClose();
    } finally { setBusy(false); }
  }
  if (previous && previous.date !== dateKey(now) && step === 0) return <Modal title="A day still needs closing" onClose={onClose}><p className="dialog-intro">{previous.date}</p><p>Close yesterday’s open day before starting this one. Any unresolved work will return to your task list.</p><button className="primary" onClick={async () => { if (await run({ type: 'day.end', id: previous.id })) setNotice('Previous day closed. Start your new day.'); }}>Close previous day and continue</button><p className="muted">You can edit the summary and journal later in History.</p></Modal>;
  const closedToday = state.days.find(d => d.date === dateKey(now) && d.startedAt && d.endedAt);
  if (closedToday && step === 0) return <Modal title="Today is already saved" onClose={onClose}><p>Your morning check-in and journal are preserved. You can reopen today to continue tracking.</p><button className="primary" disabled={busy} onClick={async () => { setBusy(true); try { if (await run({ type: 'day.reopen', id: closedToday.id })) onClose(); } finally { setBusy(false); } }}>Reopen today</button></Modal>;
  const wakeMinutes = minuteOfDay(wake), hour = Math.floor(wakeMinutes / 60);
  const setWakePart = (newHour: number, minute: number) => { try { setWake(localInstant(dateKey(wake), `${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)); } catch { setNotice('That time is skipped by daylight saving. Choose another time.'); } };
  const sleepMinutes = sleep ? Math.round((Date.parse(wake) - Date.parse(sleep)) / 60000) : undefined;
  return <Modal className="planning-day-sheet planning-start-day" title="A fresh start" onClose={onClose}>
    <DayBrand/><header className="planning-day-intro"><p><Sun size={15}/>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: state.settings.timezone }).format(new Date(wake))}</p><h1>Good morning, {state.settings.name}.</h1><span>A quiet check-in before the world rushes in.</span></header>
    <form className="planning-day-form" ref={form} onSubmit={e => start(e)}>
      {notice && <p role="status" className="notice">{notice}</p>}
      <section className="planning-wake-card"><h2>What time did you wake up?</h2><div className="planning-wake-wheel"><span className="planning-wheel-column"><small aria-hidden="true">{((hour + 10) % 12) + 1}</small><select aria-label="I woke up at hour" value={hour} onChange={e => setWakePart(Number(e.target.value), wakeMinutes % 60)}>{Array.from({ length: 24 }, (_, h) => <option value={h} key={h}>{h % 12 || 12}</option>)}</select><small aria-hidden="true">{hour % 12 + 1}</small></span><b>:</b><span className="planning-wheel-column"><small aria-hidden="true">{String((wakeMinutes + 55) % 60).padStart(2, '0')}</small><select aria-label="I woke up at minute" value={wakeMinutes % 60} onChange={e => setWakePart(hour, Number(e.target.value))}>{wakeMinutes % 5 !== 0 && <option value={wakeMinutes % 60}>{String(wakeMinutes % 60).padStart(2, '0')}</option>}{Array.from({ length: 12 }, (_, m) => <option value={m * 5} key={m}>{String(m * 5).padStart(2, '0')}</option>)}</select><small aria-hidden="true">{String((wakeMinutes + 5) % 60).padStart(2, '0')}</small></span><span className="planning-wheel-column"><button type="button" data-dirty aria-label="Toggle morning or afternoon" onClick={() => setWakePart((hour + 12) % 24, wakeMinutes % 60)}>{hour < 12 ? 'AM' : 'PM'}</button><small aria-hidden="true">{hour < 12 ? 'PM' : 'AM'}</small></span></div><button type="button" className="planning-wake-date-toggle" onClick={() => setWakeDetails(!wakeDetails)}>{wakeDetails ? 'Hide date' : 'Change date'}</button>{wakeDetails && <input aria-label="I woke up at date" type="date" value={dateKey(wake)} onChange={e => { if (e.target.value) { try { setWake(localInstant(e.target.value, `${String(hour).padStart(2, '0')}:${String(wakeMinutes % 60).padStart(2, '0')}`)); } catch { setNotice('Choose another wake time.'); } } }}/>}</section>
      <h2 className="planning-section-label">A few quick notes (optional)</h2>
      <section className="planning-checkin-card"><p>How are you feeling?</p><div className="planning-moods" role="group" aria-label="Mood">{['😭', '😔', '😐', '🙂', '🤩'].map((emoji, index) => <button type="button" key={emoji} aria-label={`Mood ${index + 1} of 5`} aria-pressed={mood === String(index + 1)} className={mood === String(index + 1) ? 'selected' : ''} onClick={() => setMood(mood === String(index + 1) ? '' : String(index + 1))}>{emoji}</button>)}</div></section>
      <section className="planning-checkin-card"><div className="planning-checkin-label"><p>Energy level</p><span>{energy ? `${energy} of 5` : 'Not recorded'}</span></div><div className="planning-energy" role="group" aria-label="Energy">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-label={`Energy ${n} of 5`} aria-pressed={energy === String(n)} onClick={() => setEnergy(energy === String(n) ? '' : String(n))}><span className={Number(energy) >= n ? 'filled' : ''}/></button>)}</div></section>
      <div className="planning-morning-metrics"><label className="planning-checkin-card"><span>Morning weight</span><div><input aria-label="Morning weight (lb)" type="number" min="1" max="2000" step="0.1" value={weight} placeholder="—" onChange={e => setWeight(e.target.value)}/><small>lbs</small></div></label><button type="button" className="planning-checkin-card" aria-expanded={sleepDetails} onClick={() => setSleepDetails(!sleepDetails)}><span>Sleep duration</span><strong>{sleepMinutes !== undefined && sleepMinutes > 0 ? `${Math.floor(sleepMinutes / 60)}h ${sleepMinutes % 60}m` : 'Add sleep'}</strong></button></div>
      {sleepDetails && <section className="planning-sleep-details"><button type="button" data-dirty onClick={() => setSleep(localInstant(addDays(dateKey(wake), -1), '23:00'))}>Set sleep start</button>{sleep && <><DateTimeField label="Fell asleep" value={sleep} onChange={setSleep}/><Field label="Sleep quality"><select value={quality} onChange={e => setQuality(e.target.value)}><option value="">Not recorded</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></Field></>}</section>}
      <label className="planning-checkin-card planning-note"><span>Morning note</span><textarea aria-label="How are you waking up?" value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Anything on your mind?"/></label>
      <button disabled={busy} className="primary planning-day-submit">{busy ? 'Saving…' : 'Start my day'}</button>
      <button type="button" disabled={busy} className="planning-skip" onClick={e => start(e, true)}>Just record wake time</button>
    </form>
  </Modal>;
}

export function EndDayDialog({ day, state, now, run, onClose, onResolve, onPlanTomorrow }: { day: Day; state: Snapshot; now: string; run: PageProps['run']; onClose: () => void; onResolve: (b: Block) => void; onPlanTomorrow: () => void }) {
  const [summary, setSummary] = useState(day.summary || summaryForDay(state, day.id));
  const [journal, setJournal] = useState(day.journal);
  const [editSummary, setEditSummary] = useState(false);
  const [summaryDirty, setSummaryDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [planTomorrow, setPlanTomorrow] = useState(false);
  const unresolved = state.blocks.filter(b => !b.archived && b.status === 'pending' && dateKey(b.start) >= day.date && Date.parse(b.start) <= Date.parse(now));
  const backlog = unscheduledTasks(state);
  const dailyBlocks = state.blocks.filter(b => !b.archived && b.status !== 'cancelled' && dateKey(b.start) === day.date);
  const completed = dailyBlocks.filter(b => ['complete', 'attended'].includes(b.status)).length;
  const logs = state.logs.filter(l => !l.archived && dateKey(l.at) === day.date);
  const sleep = logs.filter(l => l.kind === 'sleep').at(-1);
  const steps = dailySteps(state, day.date);
  const elapsed = day.startedAt ? Math.max(0, Math.round((Date.parse(now) - Date.parse(day.startedAt)) / 60000)) : undefined;
  const conflicts = dailyBlocks.filter(b => !b.conflictReviewed && overlaps(state, b).length > 0);
  async function tomorrow(block?: Block, task?: Task) {
    setBusy(true);
    try {
      const original = task ?? state.tasks.find(t => t.id === block?.taskId);
      if (!original && !block) return;
      if (block && !await run({ type: 'block.resolve', id: block.id, outcome: block.kind === 'appointment' ? 'cancelled' : 'missed' })) return;
      const start = nextStart(now, addDays(dateKey(now), 1));
      await run({ type: 'block.save', block: { title: original?.title ?? block!.title, kind: original ? 'task' : block!.kind, ...(original ? { taskId: original.id } : {}), tag: original?.tag ?? block!.tag, notes: original?.notes ?? block!.notes, start, end: plusMinutes(start, original?.duration ?? Math.round((Date.parse(block!.end) - Date.parse(block!.start)) / 60000)), status: 'pending' } });
    } finally { setBusy(false); }
  }
  async function snoozeTask(task: Task) { await run({ type: 'reminder.save', reminder: { title: task.title, body: 'A task is waiting in your unscheduled list.', startsAt: plusMinutes(now, 60), pinned: true, dismissed: false, source: 'owner' } }); }
  async function finish(closeDay: boolean) {
    setBusy(true);
    try {
      const savedSummary = summaryDirty || day.summaryEdited ? summary : summaryForDay(state, day.id);
      const okay = closeDay ? await run({ type: 'day.end', id: day.id, summary: savedSummary, journal }) : await run({ type: 'day.save', id: day.id, summary: savedSummary, journal });
      if (okay) { if (planTomorrow) onPlanTomorrow(); else onClose(); }
    } finally { setBusy(false); }
  }
  return <Modal className="planning-day-sheet planning-end-day" title="Wrapping up your day" onClose={onClose} dirty={journal !== day.journal || summaryDirty}>
    <DayBrand/><header className="planning-day-intro"><p><Moon size={15}/>Good evening, {state.settings.name}</p><h1>Wrapping up your day</h1></header>
    <div className="planning-end-content">
      <section><h2 className="planning-section-label">Unresolved tasks</h2>{!unresolved.length && !backlog.length ? <div className="planning-end-clear"><CheckCircle2 size={18}/>Everything is reviewed. A little room to exhale.</div> : <div className="planning-unresolved-list">
        {unresolved.map(block => <div className="planning-unresolved-card" key={block.id}><div><button className="planning-item-title" onClick={() => onResolve(block)}>{block.title}</button><span>{block.snoozedUntil ? 'Snoozed' : block.actualStart ? 'In progress' : 'Needs a result'}</span></div><div className="planning-unresolved-actions"><button disabled={busy} onClick={() => tomorrow(block)}>Tomorrow</button><button disabled={busy} onClick={() => onResolve(block)} aria-label={`Review or snooze ${block.title}`}>Snooze</button><button disabled={busy} onClick={() => run(block.taskId ? { type: 'record.archive', collection: 'tasks', id: block.taskId, archived: true } : { type: 'block.resolve', id: block.id, outcome: 'cancelled' })}>Drop</button></div></div>)}
        {backlog.map(task => <div className="planning-unresolved-card" key={task.id}><div><strong>{task.title}</strong><span>Unscheduled</span></div><div className="planning-unresolved-actions"><button disabled={busy} onClick={() => tomorrow(undefined, task)}>Tomorrow</button><button disabled={busy} onClick={() => snoozeTask(task)}>Snooze</button><button disabled={busy} onClick={() => run({ type: 'record.archive', collection: 'tasks', id: task.id, archived: true })}>Drop</button></div></div>)}
      </div>}{conflicts.map(block => <div className="notice warning" key={block.id}><span>{block.title} overlaps another block.</span><button onClick={() => run({ type: 'block.conflictReviewed', id: block.id })}>Reviewed</button></div>)}</section>
      <section><div className="planning-section-heading"><h2 className="planning-section-label">Your day at a glance</h2><button onClick={() => { if (!editSummary && !summaryDirty && !day.summaryEdited) setSummary(summaryForDay(state, day.id)); setEditSummary(!editSummary); }}>{editSummary ? 'Keep summary' : 'Edit summary'}</button></div>{editSummary ? <Field label="Daily summary · editable facts"><textarea rows={8} value={summary} onChange={e => { setSummary(e.target.value); setSummaryDirty(true); }}/></Field> : <div className="planning-day-glance"><p><Sun size={15}/><span>{day.startedAt ? `Woke at ${timeLabel(day.startedAt)}` : 'Wake time not recorded'}{day.mood ? ` · Mood ${['', 'Very low', 'Low', 'Okay', 'Good', 'Great'][day.mood]}` : ''}</span></p><p><CheckCircle2 size={15}/><span>{completed} of {dailyBlocks.length} blocks completed</span></p><p><Activity size={15}/><span>{steps === undefined ? 'Steps not recorded' : `${steps.toLocaleString()} steps`}{sleep?.duration ? ` · ${Math.floor(sleep.duration / 60)}h ${sleep.duration % 60}m sleep` : ' · Sleep not recorded'}</span></p>{elapsed !== undefined && <p><Clock3 size={15}/><span>Day open for {Math.floor(elapsed / 60)}h {elapsed % 60}m</span></p>}</div>}</section>
      <section><label className="planning-section-label" htmlFor="planning-day-journal">Journal</label><textarea id="planning-day-journal" aria-label="My journal" value={journal} onChange={e => setJournal(e.target.value)} rows={3} placeholder="A few words, or a few paragraphs — whatever you need."/></section>
      <label className="planning-tomorrow-switch"><span><CalendarDays size={16}/>Plan tomorrow?</span><input type="checkbox" checked={planTomorrow} onChange={e => setPlanTomorrow(e.target.checked)}/><span className="planning-switch" aria-hidden="true"/></label>{planTomorrow && <p className="planning-tomorrow-note">After saving, tomorrow’s schedule opens with your templates and task list.</p>}
      <button className="primary planning-day-submit" disabled={busy} aria-label="End day" onClick={() => finish(true)}>{busy ? 'Saving your day…' : 'End my day'}</button>
      <button className="planning-skip" disabled={busy} onClick={() => finish(false)}>Save and keep going</button>
    </div>
  </Modal>;
}

export function TemplatesPage({state,run}:PageProps){
 const [edit,setEdit]=useState<DayTemplate|true|null>(null);const [title,setTitle]=useState('');const [rows,setRows]=useState<TemplateBlock[]>([]);const open=(t?:DayTemplate)=>{setTitle(t?.title??'');setRows(t?.blocks??[{title:'',kind:'routine',tag:'Personal',startMinute:420,duration:15,notes:''}]);setEdit(t??true);};
 const update=(i:number,changes:Partial<TemplateBlock>)=>setRows(rows.map((r,j)=>j===i?{...r,...changes}:r));
 return <><header className="page-heading"><h1>Day templates</h1><p>Your familiar rhythm, ready to reuse.</p></header><button className="primary" onClick={()=>open()}><Plus size={18}/>New template</button><div className="stack">{state.templates.filter(t=>!t.archived).map(t=><section className="card" key={t.id}><h2>{t.title}</h2><p className="muted">{t.blocks.length} blocks · {t.blocks.reduce((n,b)=>n+b.duration,0)} minutes</p><div className="inline-actions"><button onClick={()=>open(t)}>Edit</button><button onClick={()=>run({type:'record.archive',collection:'templates',id:t.id,archived:true})}>Archive</button></div></section>)}</div>{edit&&<Modal title="Day template" onClose={()=>setEdit(null)}><form className="stack" onSubmit={async e=>{e.preventDefault();if(await run({type:'template.save',template:{...(edit===true?{}:edit),title,blocks:rows}}))setEdit(null);}}><Field label="Template name"><input required value={title} onChange={e=>setTitle(e.target.value)} placeholder="A steady workday"/></Field>{rows.map((r,i)=><fieldset className="template-row" key={i}><legend>Block {i+1}</legend><Field label="Title"><input required value={r.title} onChange={e=>update(i,{title:e.target.value})}/></Field><div className="grid-two"><Field label="Kind"><select value={r.kind} onChange={e=>update(i,{kind:e.target.value as TemplateBlock['kind']})}><option value="routine">Routine</option><option value="task">Task</option><option value="appointment">Appointment</option></select></Field><Field label="Area"><select value={r.tag} onChange={e=>update(i,{tag:e.target.value as TemplateBlock['tag']})}><option>Personal</option><option>Work</option></select></Field></div><Field label="Start"><select value={r.startMinute} onChange={e=>update(i,{startMinute:Number(e.target.value)})}>{Array.from({length:288},(_,j)=><option key={j} value={j*5}>{String(Math.floor(j*5/60)).padStart(2,'0')}:{String(j*5%60).padStart(2,'0')}</option>)}</select></Field><DurationField value={r.duration} onChange={n=>update(i,{duration:n})}/><button type="button" onClick={()=>setRows(rows.filter((_,j)=>i!==j))}><X size={16}/>Remove block</button></fieldset>)}<button type="button" onClick={()=>setRows([...rows,{title:'',kind:'routine',tag:'Personal',startMinute:540,duration:30,notes:''}])}><Plus size={18}/>Add block</button><button className="primary" disabled={!rows.length}>Save template</button></form></Modal>}</>;
}
