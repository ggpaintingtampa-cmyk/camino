import { useState, useRef, useEffect, type PointerEvent, type FormEvent } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, GripVertical, Plus, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Sun, AlertTriangle, Compass } from 'lucide-react';
import type { Task, Block, Snapshot, Command, Day, TaskPatch } from '../shared/types';
import type { TemplateBlock, DayTemplate } from '../shared/types';
import { dateKey, localInstant, minuteOfDay, timeLabel, addDays } from '../shared/dates';
import { unscheduledTasks, overlaps } from '../shared/selectors';
import { summaryForDay } from '../shared/domain';
import { blockFlexibility } from '../shared/domain-core';
import { dayPlanForDate, pendingBookingForTask, previewPlacement } from '../shared/planning';
import { hasRecordedWork, previewDayClose, recordedMinutesForBlock, sessionState, unfinishedSessions } from '../shared/sessions';
import { EstimateField } from './components/EstimateField';
import { dateLabel, estimateLabel, kindLabel, minutesLabel, rangeLabel } from './components/format';
import { targetTitle } from './components/taskActions';
import { Modal, Field, DurationField, DateTimeField, Empty, type PageProps } from './ui';
import { TemplateApplyDialog } from './planning/TemplateApplyDialog';
import { EndDaySections } from './planning/EndDaySections';
import { DayFactsSummary } from './review/DayFactsSummary';
import { clipInterval, localDayRange } from '../shared/capacity';
import './planning-v2.css';

export function nextStart(now: string, date?: string, zone?: string) {
  const d = date ?? dateKey(now, zone);
  const m = Math.min(1435, Math.ceil(minuteOfDay(now, zone) / 5) * 5);
  return localInstant(d, date ? '09:00' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, zone);
}
export function plusMinutes(time: string, minutes: number) { return new Date(Date.parse(time) + minutes * 60000).toISOString(); }
function DurationChoices({ value, onChange, label = 'Duration' }: { value: number; onChange: (value: number) => void; label?: string }) {
  const [custom, setCustom] = useState(![15, 30, 60, 120].includes(value));
  return <div className="planning-duration"><span>{label}</span><div className="planning-duration-chips">{[15, 30, 60, 120].map(n => <button type="button" key={n} className={value === n ? 'selected' : ''} aria-pressed={value === n} onClick={() => { onChange(n); setCustom(false); }}>{n < 60 ? `${n}m` : `${n / 60}h`}</button>)}<button type="button" className={custom ? 'selected' : ''} aria-expanded={custom} onClick={() => setCustom(!custom)}>Custom</button></div>{custom && <DurationField value={value} onChange={onChange}/>}</div>;
}
function DayBrand() { return <div className="planning-day-brand"><span><Compass size={18}/></span><div>Caminos<small>by Morgan</small></div></div>; }

/** How a calendar entry stands right now. Running and paused come from work sessions only. */
function entryStatus(state: Snapshot, block: Block, now: string): { text: string; active: boolean } {
  if (block.status !== 'pending') return { text: block.status === 'complete' || block.status === 'attended' ? 'Completed' : block.status === 'missed' ? 'Not completed' : block.status[0].toUpperCase() + block.status.slice(1), active: false };
  const session = unfinishedSessions(state).find(candidate => candidate.intervals.at(-1)?.plannedBlockId === block.id);
  if (session && sessionState(session) === 'running') return { text: 'Recording now', active: true };
  if (session) return { text: 'Paused', active: false };
  if (hasRecordedWork(state, block)) return { text: 'Started earlier, no result yet', active: false };
  return { text: Date.parse(block.end) < Date.parse(now) ? 'Needs a result' : 'Upcoming', active: false };
}

export function TaskEditor({ state, run, runReviewed, now, onClose, task, block, appointment = false, startAt, planning = false }: { state: Snapshot; run: PageProps['run']; runReviewed?: PageProps['runReviewed']; now: string; onClose: () => void; task?: Task; block?: Block; appointment?: boolean; startAt?: string; planning?: boolean }) {
  const zone = state.settings.timezone;
  const today = dateKey(now, zone);
  const isRoutine = block?.kind === 'routine';
  const isTask = !appointment && !isRoutine;
  const stored = block ? state.blocks.find(candidate => candidate.id === block.id) : undefined;
  // A resolved entry is history. It is shown, never rewritten.
  const historical = !!stored && stored.status !== 'pending';
  const [title, setTitle] = useState(task?.title ?? block?.title ?? '');
  const [estimate, setEstimate] = useState(task?.duration);
  const [estimateValid, setEstimateValid] = useState(true);
  // The booked length is its own fact. An unknown estimate never becomes 30 by being booked.
  const [slot, setSlot] = useState(block ? Math.round((Date.parse(block.end) - Date.parse(block.start)) / 60000) : task?.duration ?? 30);
  const [tag, setTag] = useState<'Personal' | 'Work'>(task?.tag ?? block?.tag ?? 'Personal');
  const [notes, setNotes] = useState(task?.notes ?? block?.notes ?? '');
  const [labels, setLabels] = useState(task?.labels.join(', ') ?? '');
  const [goalId, setGoal] = useState(task?.goalId ?? '');
  const [scheduled, setScheduled] = useState(!historical && (!!block || !!startAt || appointment || planning));
  const [dateExpanded, setDateExpanded] = useState(!!block || !!startAt || appointment || planning);
  const [start, setStart] = useState(startAt ?? block?.start ?? nextStart(now, undefined, zone));
  const [busy, setBusy] = useState(false);
  // A confirmation belongs to one proposed time. Changing the time withdraws it.
  const [reviewedKey, setReviewedKey] = useState<string | null>(null);
  const [overlapKey, setOverlapKey] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [taskId] = useState(() => task?.id ?? crypto.randomUUID());
  const [newBlockId, setNewBlockId] = useState(() => crypto.randomUUID());
  const [more, setMore] = useState(true);
  const end = plusMinutes(start, slot);
  const current = task ? pendingBookingForTask(state, task.id) : undefined;
  const placementChanged = !current || current.start !== start || current.end !== end;
  const preview = isTask && scheduled && placementChanged ? previewPlacement(state, { ...(task ? { taskId: task.id } : {}), start, end }, now) : undefined;
  const candidate = { id: block?.id ?? 'candidate', start, end };
  const collisions = !isTask && scheduled ? overlaps(state, candidate) : [];
  const conflictRows = preview ? preview.conflicts.map(conflict => ({ conflict, entry: state.blocks.find(other => other.id === conflict.blockId) })) : [];
  const placementText = `${dateLabel(dateKey(start, zone), today)} · ${rangeLabel(start, end, zone)} · ${minutesLabel(slot)}`;
  const keyFor = (isScheduled: boolean) => `${state.revision}|${start}|${slot}|${isScheduled}`;
  const review = reviewedKey === keyFor(scheduled);
  const keepOverlap = overlapKey === keyFor(scheduled);

  const labelList = () => labels.split(',').map(x => x.trim()).filter(Boolean);
  function taskPatch(): TaskPatch {
    const patch: TaskPatch = {};
    if (!task) return patch;
    if (title.trim() !== task.title) patch.title = title.trim();
    if (estimate !== task.duration) patch.duration = estimate ?? null;
    if (tag !== task.tag) patch.tag = tag;
    if (notes !== task.notes) patch.notes = notes;
    if (goalId !== (task.goalId ?? '')) patch.goalId = goalId || null;
    if (JSON.stringify(labelList()) !== JSON.stringify(task.labels)) patch.labels = labelList();
    return patch;
  }
  const reviewed = (command: Command, revision: number) => runReviewed ? runReviewed(command, revision).then(result => result.ok) : run(command);

  async function save(e: FormEvent, wantsSchedule = scheduled) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setNotice('');
    if (!isTask) {
      setBusy(true);
      try { if (await run({ type: 'block.save', block: { ...(block ?? {}), id: block?.id ?? newBlockId, title: title.trim(), kind: isRoutine ? 'routine' : 'appointment', tag, start, end, notes, status: block?.status ?? 'pending' } })) onClose(); }
      finally { setBusy(false); }
      return;
    }
    if (!estimateValid) { setNotice('Correct the estimate, or leave it blank.'); return; }
    const books = wantsSchedule && placementChanged;
    const placement = books ? previewPlacement(state, { ...(task ? { taskId: task.id } : {}), start, end }, now) : undefined;
    if (books && reviewedKey !== keyFor(true)) {
      // The consequences are shown first. Nothing is sent by this press.
      setScheduled(true); setDateExpanded(true); setMore(true); setReviewedKey(keyFor(true));
      return;
    }
    if (placement && !placement.valid) { setNotice(placement.error?.message ?? 'This time cannot be booked.'); return; }
    if (placement && placement.conflicts.length > 0 && overlapKey !== keyFor(true)) { setNotice('Choose another time, or confirm that you are keeping the overlap.'); return; }
    setBusy(true);
    try {
      if (!task) {
        const capture = { id: taskId, title: title.trim(), ...(notes ? { notes } : {}), ...(estimate !== undefined ? { duration: estimate } : {}), tag, labels: labelList(), ...(goalId ? { goalId } : {}) };
        const ok = placement
          ? await reviewed({ type: 'task.plan', task: { capture }, blockId: newBlockId, start, end, acknowledgedConflictIds: placement.requiredAcknowledgements }, placement.baseRevision)
          : await run({ type: 'task.capture', task: capture });
        if (ok) onClose();
        return;
      }
      if (placement) {
        if (!await reviewed({ type: 'task.plan', task: { id: task.id }, blockId: newBlockId, start, end, acknowledgedConflictIds: placement.requiredAcknowledgements }, placement.baseRevision)) return;
        setNewBlockId(crypto.randomUUID()); setReviewedKey(null); setOverlapKey(null);
      } else if (!wantsSchedule && current) {
        if (!await run({ type: 'block.resolve', id: current.id, outcome: 'cancelled' }, { label: 'Cancel booking' })) return;
      }
      const patch = taskPatch();
      if (Object.keys(patch).length && !await run({ type: 'task.update', id: task.id, patch })) {
        if (placement) setNotice('The time was booked. The task details were not saved: review the message and save again.');
        return;
      }
      onClose();
    } finally { setBusy(false); }
  }

  if (historical && stored) return <Modal className="planning-task-sheet" title="Past calendar entry" onClose={onClose}>
    <div className="v3-stack">
      <h3>{stored.title}</h3>
      <p>{dateLabel(dateKey(stored.start, zone), today)} · {rangeLabel(stored.start, stored.end, zone)} · {kindLabel(stored, blockFlexibility(stored))}</p>
      <p className="v3-hint">{entryStatus(state, stored, now).text}{stored.changeReason ? ` · ${stored.changeReason === 'moved' ? 'moved to another time' : stored.changeReason === 'deferred' ? 'deferred' : stored.changeReason === 'replanned' ? 'planned again after work was recorded' : stored.changeReason === 'task-resolved' ? 'its task was finished before it began' : 'cancelled'}` : ''}. This entry is kept as history and cannot be edited.</p>
      {recordedMinutesForBlock(state, stored.id, now) > 0 && <p className="v3-hint">Recorded under this entry: {minutesLabel(recordedMinutesForBlock(state, stored.id, now))}.</p>}
      <button type="button" onClick={onClose}>Close</button>
    </div>
  </Modal>;

  const bookingLabel = `Book ${rangeLabel(start, end, zone)}`;
  return <Modal className="planning-task-sheet" title={appointment ? (block ? 'Edit appointment' : 'New appointment') : isRoutine ? 'Edit routine' : task ? 'Plan task' : 'New task'} onClose={onClose}>
    <form className="planning-task-form" onSubmit={e => save(e)}>
      {notice && <p role="alert" className="notice warning">{notice}</p>}
      <Field label={appointment ? 'What is happening?' : 'What needs doing?'}><input aria-label="Title" autoFocus required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} placeholder={appointment ? 'Add an appointment' : 'Give your next step a name'}/></Field>
      <div className="planning-area" aria-label="Task area">{(['Personal', 'Work'] as const).map(t => <button type="button" className={tag === t ? 'selected' : ''} aria-pressed={tag === t} key={t} onClick={() => setTag(t)}>{t}</button>)}</div>
      <button type="button" className="planning-more-options" aria-expanded={more} onClick={() => setMore(!more)}>More options{more ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</button>
      {more && <div className="planning-task-options">
        {isTask && <EstimateField value={estimate} onChange={(value, valid) => { setEstimate(value); setEstimateValid(valid); if (valid && value !== undefined && !block && !scheduled) setSlot(value); }} hint="Optional. Changing the estimate never moves a booked time."/>}
        <div className="planning-schedule-choice">
          {isTask ? <label><input type="checkbox" aria-label={current ? 'Keep on schedule (uncheck to return to list)' : 'Assign a time'} checked={scheduled} onChange={e => { setScheduled(e.target.checked); setDateExpanded(e.target.checked); }}/><CalendarDays size={15}/><span>{scheduled ? `Book for ${dateLabel(dateKey(start, zone), today).toLowerCase()}` : 'Assign a day and time'}</span></label> : <span><CalendarDays size={15}/>Scheduled for {dateLabel(dateKey(start, zone), today)}</span>}
          <button type="button" data-dirty onClick={() => { setScheduled(true); setDateExpanded(!dateExpanded); }}>{scheduled ? timeLabel(start, zone) : 'Choose'}</button>
        </div>
        {scheduled && dateExpanded && <div className="planning-date-options">
          <div className="chips"><button type="button" data-dirty onClick={() => setStart(nextStart(now, today, zone))}>Today 9:00 AM</button><button type="button" data-dirty onClick={() => setStart(nextStart(now, addDays(today, 1), zone))}>Tomorrow 9:00 AM</button></div>
          <DateTimeField label="Starts" value={start} onChange={setStart} zone={zone}/>
          <DurationChoices label={isTask ? 'Booked length' : 'Length'} value={slot} onChange={setSlot}/>
        </div>}
        {scheduled && <p className="planning-placement-summary" role="status"><strong>{placementChanged || !isTask ? 'Time to be saved' : 'Booked time, unchanged'}:</strong> {placementText} · {zone.replaceAll('_', ' ')}{isTask && estimate !== undefined && estimate !== slot ? ` · estimate stays ${estimateLabel(estimate)}` : ''}</p>}
        {collisions.length > 0 && <div className="notice warning"><AlertTriangle size={16}/><span>Overlaps {collisions.map(b => `${b.title} (${rangeLabel(b.start, b.end, zone)})`).join(', ')}. You can still save; the overlap stays marked until you review it.</span></div>}
        {preview && !preview.valid && <div className="notice warning" role="alert"><AlertTriangle size={16}/><span>{preview.error?.message ?? 'This time cannot be booked.'}</span></div>}
        {preview && preview.supersedesBlockId && current && <p className="muted">This replaces the booking {dateLabel(dateKey(current.start, zone), today)} {rangeLabel(current.start, current.end, zone)}. The old entry stays in history as {preview.supersedeEffect === 'replanned' ? 'not completed, with its recorded work' : 'moved'}.</p>}
        {conflictRows.length > 0 && <div className="notice warning planning-conflict-review">
          <AlertTriangle size={16}/>
          <div><strong>This time overlaps:</strong><ul>{conflictRows.map(({ conflict, entry }) => <li key={conflict.blockId}>{entry?.title ?? 'Another entry'} · {rangeLabel(conflict.start, conflict.end, zone)} · {conflict.flexibility === 'fixed' ? 'fixed' : 'flexible'} · {minutesLabel(conflict.minutes)} in common</li>)}</ul>
            <label className="check-label"><input type="checkbox" checked={keepOverlap} onChange={e => setOverlapKey(e.target.checked ? keyFor(scheduled) : null)}/>Keep this overlap</label></div>
        </div>}
        <details className="planning-extra-fields"><summary>Notes, labels & goal</summary><div className="stack">{isTask && <><Field label="Goal (optional)"><select value={goalId} onChange={e => setGoal(e.target.value)}><option value="">No linked goal</option>{state.goals.filter(g => g.id === task?.goalId || (!g.archived && g.status !== 'archived')).map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></Field><Field label="Labels (optional)"><input value={labels} onChange={e => setLabels(e.target.value)} placeholder="Home, Health, Learning"/></Field></>}<Field label="Notes"><textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)}/></Field></div></details>
      </div>}
      {isTask && review && preview && <section className="planning-placement-review" aria-label="Review the booking">
        <h3>Review before saving</h3>
        <p>{task ? 'This task' : 'The new task'} will be booked <strong>{placementText}</strong> ({zone.replaceAll('_', ' ')}).</p>
        {conflictRows.length > 0 ? <p>{keepOverlap ? 'The overlap above is kept.' : 'Decide about the overlap above first.'}</p> : <p className="muted">No other entry overlaps this time.</p>}
      </section>}
      <div className="planning-task-actions">
        {isTask && !scheduled && <button type="button" disabled={busy || !title.trim()} onClick={e => save(e, true)} aria-label="Save and schedule">Save & schedule…</button>}
        <button className="primary" disabled={busy || (isTask && scheduled && placementChanged && review && (!preview?.valid || (conflictRows.length > 0 && !keepOverlap)))} aria-label={!isTask ? 'Save to schedule' : scheduled && placementChanged ? (review ? 'Confirm booking' : 'Review booking') : 'Save to task list'}>
          {busy ? 'Saving…' : !isTask ? `Save · ${rangeLabel(start, end, zone)}` : scheduled && placementChanged ? (review ? bookingLabel : 'Review time…') : 'Save'}
        </button>
      </div>
    </form>
  </Modal>;
}

export function ResolveDialog({ block, state, now, run, onClose }: { block: Block; state?: Snapshot; now: string; run: PageProps['run']; onClose: () => void }) {
  const zone = state?.settings.timezone;
  const [mode, setMode] = useState<'choices' | 'partial' | 'remind'>('choices');
  const [duration, setDuration] = useState(30);
  const [schedule, setSchedule] = useState(false);
  const [start, setStart] = useState(nextStart(now, undefined, zone));
  const [busy, setBusy] = useState(false);
  const send = async (command: Command) => { setBusy(true); try { if (await run(command)) onClose(); } finally { setBusy(false); } };
  const remind = (minutes: number) => send({ type: 'block.snooze', id: block.id, until: plusMinutes(now, minutes) });
  const tonight = () => send({ type: 'block.snooze', id: block.id, until: localInstant(addDays(dateKey(now, zone), minuteOfDay(now, zone) >= 1200 ? 1 : 0), '20:00', zone) });
  const partial = (minutes: number) => { setDuration(minutes); setMode('partial'); };
  const recorded = state ? recordedMinutesForBlock(state, block.id, now) : 0;
  const recording = !!state && unfinishedSessions(state).some(session => session.intervals.at(-1)?.plannedBlockId === block.id);
  return <Modal className="planning-outcome-sheet" title={mode === 'choices' ? 'How did it go?' : mode === 'partial' ? 'Plan the remaining work' : 'Remind me to review'} onClose={onClose}>
    <div className="planning-outcome-header"><span className="planning-badge">{Date.parse(block.end) <= Date.parse(now) ? 'Ended entry' : 'Your current entry'}</span><h2>{block.title}</h2><p>{timeLabel(block.start, zone)} – {timeLabel(block.end, zone)}</p>{recorded > 0 && <p className="muted">Recorded work: {minutesLabel(recorded)}</p>}</div>
    {mode === 'choices' ? <><h3 className="planning-outcome-question">How did it go?</h3><div className="planning-outcome-choices">
      <button className="primary" disabled={busy} aria-label={block.kind === 'appointment' ? 'Attended' : 'Complete'} onClick={() => send({ type: 'block.resolve', id: block.id, outcome: block.kind === 'appointment' ? 'attended' : 'complete' })}>{block.kind === 'appointment' ? 'Attended' : 'Done'}</button>
      {block.kind !== 'appointment' && <section className="planning-choice-group"><button type="button" className="planning-choice-title" onClick={() => setMode('partial')}>Partly done</button><p className="planning-choice-label">Remaining time</p><div className="planning-quick-chips">{[15, 30, 60].map(m => <button type="button" disabled={busy} key={m} aria-label={`Partly done, ${m} minutes remaining`} onClick={() => partial(m)}>{m === 60 ? '1h' : `${m}m`}</button>)}</div></section>}
      <button disabled={busy} aria-label={block.kind === 'appointment' ? 'Missed' : 'Not completed · task stays open'} onClick={() => send({ type: 'block.resolve', id: block.id, outcome: 'missed' })}>{block.kind === 'appointment' ? 'Missed' : "Didn't happen · task stays open"}</button>
      {block.kind === 'appointment' && <button disabled={busy} onClick={() => send({ type: 'block.resolve', id: block.id, outcome: 'cancelled' })}>Cancelled</button>}
      {recording && <p className="muted">Any of these outcomes ends the recording under this entry at the time you choose it.</p>}
      <section className="planning-choice-group"><button type="button" className="planning-choice-title" onClick={() => setMode('remind')}>Remind me to review</button><p className="planning-choice-label">This sets a reminder. It does not pause or move the work.</p><div className="planning-quick-chips">{[10, 30, 60].map(m => <button key={m} disabled={busy} aria-label={`Remind me to review in ${m === 60 ? '1 hour' : `${m} minutes`}`} onClick={() => remind(m)}>{m === 60 ? '1 hr' : `${m} min`}</button>)}<button disabled={busy} aria-label="Remind me to review tonight" onClick={tonight}>Tonight</button></div></section>
    </div><button className="planning-skip" onClick={onClose}>Not now</button></> : <div className="stack">
      {mode === 'partial' ? <><p className="muted">Enter the remaining time. The original entry stays in history and one new task holds what is left.</p><DurationField value={duration} onChange={setDuration}/><p className="muted">Remaining time: {minutesLabel(duration)}</p><label className="check-label"><input type="checkbox" checked={schedule} onChange={e => setSchedule(e.target.checked)}/>Book a day and time for the remaining work now</label>{schedule && <><DateTimeField label="Remaining work starts" value={start} onChange={setStart} zone={zone}/><p className="muted">Books {timeLabel(start, zone)} – {timeLabel(plusMinutes(start, duration), zone)} on {dateKey(start, zone)}.</p></>}<button disabled={busy} className="primary" onClick={() => send({ type: 'block.resolve', id: block.id, outcome: 'partial', remainingDuration: duration, ...(schedule ? { remainingStart: start } : {}) })}>{schedule ? `Save and book ${timeLabel(start, zone)}` : 'Save remaining work without a time'}</button></> : <><div className="quick-grid">{[10, 30, 60].map(m => <button disabled={busy} key={m} onClick={() => remind(m)}>{m === 60 ? 'In 1 hour' : `In ${m} minutes`}</button>)}<button disabled={busy} onClick={tonight}>Tonight · 8 PM</button></div><DateTimeField label="Remind me at" value={start} onChange={setStart} zone={zone}/><button disabled={busy} onClick={() => send({ type: 'block.snooze', id: block.id, until: start })}>Remind me at the selected time</button></>}
      <button className="text-button" onClick={() => setMode('choices')}>Back to choices</button>
    </div>}
  </Modal>;
}

export function SchedulePage({ state, now, run, runReviewed, initialDate, add, onResolve, onPlan }: PageProps & { initialDate?: string; onResolve: (b: Block) => void; onPlan: (date: string, reset: boolean) => void }) {
  const zone = state.settings.timezone;
  const [date, setDate] = useState(initialDate ?? dateKey(now, zone));
  const [editor, setEditor] = useState<{ task?: Task; block?: Block; appointment?: boolean; startAt?: string } | null>(add ? {} : null);
  const [showList, setShowList] = useState(false);
  const [timeline, setTimeline] = useState(false);
  const [template, setTemplate] = useState('');
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  const [drag, setDrag] = useState<{ task?: Task; block?: Block; x: number; y: number } | null>(null);
  const [dropError, setDropError] = useState('');
  const track = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLDivElement>(null);
  const pending = unscheduledTasks(state);
  const blocks = state.blocks.filter(b => !b.archived && clipInterval(b, localDayRange(date, zone))).sort((a, b) => a.start.localeCompare(b.start));
  useEffect(() => { if (initialDate) setDate(initialDate); }, [initialDate]);
  useEffect(() => { if (timeline && date === dateKey(now, zone)) marker.current?.scrollIntoView({ block: 'center', behavior: 'instant' }); }, [date, timeline]);
  const startDrag = (e: PointerEvent, task?: Task, block?: Block) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); setDrag({ task, block, x: e.clientX, y: e.clientY }); setDropError(''); };
  function move(e: PointerEvent) { if (!drag) return; setDrag({ ...drag, x: e.clientX, y: e.clientY }); const viewport = document.querySelector('.content'); if (viewport) { const rect = viewport.getBoundingClientRect(); if (e.clientY > rect.bottom - 90) viewport.scrollTop += 22; if (e.clientY < rect.top + 80) viewport.scrollTop -= 22; } }
  function drop(e: PointerEvent) {
    if (!drag) return;
    const d = drag; setDrag(null);
    const box = track.current?.getBoundingClientRect();
    if (!box || e.clientY < box.top || e.clientY > box.bottom || e.clientX < box.left || e.clientX > box.right) { setDropError('Drop on the timeline, or tap a task to choose its time.'); return; }
    const m = Math.max(0, Math.min(1435, Math.round((e.clientY - box.top) / 1.6 / 5) * 5));
    let start: string;
    try { start = localInstant(date, `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, zone); } catch { setDropError('That time is skipped by daylight saving. Choose another time.'); return; }
    // A drop only proposes a time. The editor shows it and nothing is saved until it is confirmed there.
    if (d.block) setEditor({ block: d.block, task: state.tasks.find(t => t.id === d.block?.taskId), appointment: d.block.kind === 'appointment', startAt: start });
    else setEditor({ task: d.task, startAt: start });
  }
  const openBlock = (b: Block) => {
    if (b.status === 'pending' && Date.parse(b.end) < Date.parse(now)) onResolve(b);
    else setEditor({ task: state.tasks.find(t => t.id === b.taskId), block: b, appointment: b.kind === 'appointment' });
  };
  const statusText = (b: Block) => entryStatus(state, b, now).text;
  const nowRow = <div className="planning-agenda-now" ref={timeline ? undefined : marker}><time>{timeLabel(now, zone)}</time><span/></div>;
  const visibleBlocks = blocks.filter(b => b.status !== 'cancelled');
  const after = visibleBlocks.findIndex(b => Date.parse(b.start) > Date.parse(now));
  const acknowledged = (b: Block, other: Block) => !!b.conflictReviewed || !!other.conflictReviewed || !!b.acknowledgedConflictIds?.includes(other.id) || !!other.acknowledgedConflictIds?.includes(b.id);
  return <div className="planning-schedule">
    <header className="page-heading"><p className="eyebrow">A little structure. Room to adapt.</p><div className="row"><h1>Plan</h1><button className="icon-button" aria-label="Add appointment" onClick={() => setEditor({ appointment: true, startAt: nextStart(now, date, zone) })}><Plus size={20}/></button></div></header>
    <div className="date-bar"><button aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={18}/></button><label className="planning-date-label"><input aria-label="Schedule date" type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)}/><CalendarDays size={15}/></label><button aria-label="Next day" onClick={() => setDate(addDays(date, 1))}><ChevronRight size={18}/></button></div>
    <div className="schedule-tools"><button className="planning-now-button" onClick={() => { setDate(dateKey(now, zone)); if (timeline) marker.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }}>Now</button><button aria-expanded={showList} onClick={() => setShowList(!showList)}>Without a time <span className="count">{pending.length}</span></button><button onClick={() => setEditor({ startAt: nextStart(now, date, zone) })}><Plus size={12}/>Task</button></div>
    {showList && <section className="card backlog"><h2>Open tasks without a time</h2><p className="muted">Tap a task to choose its day and time.{timeline ? ' You can also drag its handle onto the timeline.' : ''}</p>{pending.length === 0 ? <Empty>Every open task has a time, or there are none.</Empty> : pending.map(t => <div className="backlog-row" key={t.id}>{timeline && <button className="drag-handle" aria-label={`Drag ${t.title}`} style={{ touchAction: 'none' }} onPointerDown={e => startDrag(e, t)} onPointerMove={move} onPointerUp={drop} onPointerCancel={() => setDrag(null)}><GripVertical size={20}/></button>}<button className="task-row" onClick={() => setEditor({ task: t, startAt: nextStart(now, date, zone) })}><span><strong>{t.title}</strong><small>{t.tag} · {estimateLabel(t.duration)}</small></span><ArrowRight size={16}/></button></div>)}</section>}
    <div className="v3-actions"><button className="primary" onClick={() => onPlan(date, false)}>Plan today</button><button onClick={() => onPlan(date, true)}>Reset today</button></div>
    {dayPlanForDate(state, date) && <section className="card"><h2>Chosen for {date}</h2><p className="muted">Choosing a task does not book a time.</p>{dayPlanForDate(state, date)!.taskIds.map(id => { const task = state.tasks.find(t => t.id === id); return task && <button className="task-row" key={id} onClick={() => setEditor({ task, block: pendingBookingForTask(state, id) })}><span><strong>{task.title}{dayPlanForDate(state, date)?.mainTaskId === id ? ' · main task' : ''}</strong><small>{task.status} · {estimateLabel(task.duration)}{pendingBookingForTask(state, id) ? ' · booked' : ' · without a time'}</small></span></button>; })}</section>}
    <details className="template-apply"><summary>Apply a day template<ChevronDown size={16}/></summary><div className="row"><select aria-label="Day template" value={template} onChange={e => setTemplate(e.target.value)}><option value="">Choose template…</option>{state.templates.filter(t => !t.archived).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select><button disabled={!template} onClick={() => setApplyingTemplate(true)}>Review template</button></div><p className="muted">Review times, capacity and overlaps before adding entries to {date}.</p></details>
    {applyingTemplate && <TemplateApplyDialog state={state} now={now} run={run} runReviewed={runReviewed} templateId={template} date={date} onClose={() => setApplyingTemplate(false)}/>}
    {dropError && <p role="status" className="notice">{dropError}</p>}
    {!timeline ? <div className="planning-agenda">{visibleBlocks.map((b, index) => {
      const { text, active } = entryStatus(state, b, now);
      const completed = b.status === 'complete' || b.status === 'attended';
      const clashes = b.status === 'pending' || completed ? overlaps(state, b) : [];
      const open = clashes.filter(other => !acknowledged(b, other));
      return <div key={b.id}>{date === dateKey(now, zone) && index === after && nowRow}<div className="planning-agenda-row"><time>{timeLabel(b.start, zone)}</time><div className={`schedule-block planning-agenda-card ${b.status} ${active ? 'is-active' : ''} ${open.length ? 'overlap' : ''}`}><button className="block-content" onClick={() => openBlock(b)}><span className="planning-agenda-title"><strong>{b.title}</strong>{completed ? <CheckCircle2 size={14}/> : <span className={`planning-badge ${active ? '' : b.tag === 'Work' ? 'is-work' : 'is-personal'}`}>{active ? 'Recording' : b.tag}</span>}</span><small>{kindLabel(b, blockFlexibility(b))} · {text} · {minutesLabel(Math.round((Date.parse(b.end) - Date.parse(b.start)) / 60000))}</small></button>
        {clashes.length > 0 && <p className="planning-agenda-conflict"><AlertTriangle size={14} aria-hidden="true"/><span>{open.length ? 'Overlaps' : 'Overlap kept with'} {clashes.map(other => `${other.title} (${rangeLabel(other.start, other.end, zone)})`).join(', ')}</span>{open.length > 0 && b.status === 'pending' && <><button type="button" className="text-button" onClick={() => setEditor({ task: state.tasks.find(t => t.id === b.taskId), block: b, appointment: b.kind === 'appointment' })}>Review conflict</button><button type="button" className="text-button" onClick={() => run({ type: 'block.conflictReviewed', id: b.id }, { label: 'Keep overlap' })}>Keep overlap</button></>}</p>}
      </div></div></div>;
    })}{date === dateKey(now, zone) && after === -1 && nowRow}{!visibleBlocks.length && <div className="planning-agenda-empty"><CalendarDays size={24}/><h2>A little room in your day.</h2><p>Add a task or appointment whenever you’re ready.</p><button onClick={() => setEditor({ startAt: nextStart(now, date, zone) })}>Plan a task<Plus size={14}/></button></div>}</div> : <div className="planning-timeline-wrap"><div className="timeline" ref={track}>{Array.from({ length: 24 }, (_, hour) => <div className="hour" key={hour} style={{ top: hour * 96 }}><span>{hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}</span><button aria-label={`Schedule at ${hour}:00`} onClick={() => { try { setEditor({ startAt: localInstant(date, `${String(hour).padStart(2, '0')}:00`, zone) }); } catch { setDropError('That hour is skipped by daylight saving. Choose another time.'); } }}/></div>)}{blocks.map(b => { const task = state.tasks.find(t => t.id === b.taskId); const min = dateKey(b.start, zone) < date ? 0 : minuteOfDay(b.start, zone); const end = dateKey(b.end, zone) > date ? 1440 : minuteOfDay(b.end, zone); const collision = overlaps(state, b).length > 0; return <div key={b.id} className={`schedule-block ${b.tag.toLowerCase()} ${b.status} ${collision ? 'overlap' : ''}`} style={{ top: min * 1.6, height: Math.max(32, (end - min) * 1.6), left: collision ? '26%' : '19%', right: collision ? '4%' : '2%' }}><button className="block-content" onClick={() => openBlock(b)}><strong>{b.title}</strong><small>{timeLabel(b.start, zone)}–{timeLabel(b.end, zone)} · {statusText(b)}{collision ? ' · overlap' : ''}</small></button>{b.status === 'pending' && !hasRecordedWork(state, b) && <button className="drag-handle" aria-label={`Move ${b.title}`} style={{ touchAction: 'none' }} onPointerDown={e => startDrag(e, task, b)} onPointerMove={move} onPointerUp={drop} onPointerCancel={() => setDrag(null)}><GripVertical size={16}/></button>}</div>; })}{date === dateKey(now, zone) && <div className="now-line" ref={marker} style={{ top: minuteOfDay(now, zone) * 1.6 }}><span>{timeLabel(now, zone)}</span></div>}<span className="timeline-end">12 AM</span></div></div>}
    <button className="planning-view-toggle" aria-pressed={timeline} onClick={() => setTimeline(!timeline)}>{timeline ? 'Back to day overview' : 'Open 24-hour timeline'}<ArrowRight size={13}/></button>
    {drag && <div className="drag-preview" style={{ left: drag.x + 10, top: drag.y - 30 }}>{drag.task?.title ?? drag.block?.title}</div>}
    {editor && <TaskEditor state={state} now={now} run={run} runReviewed={runReviewed} {...editor} block={editor.block ? { ...editor.block, start: editor.startAt ?? editor.block.start, end: editor.startAt ? plusMinutes(editor.startAt, (Date.parse(editor.block.end) - Date.parse(editor.block.start)) / 60000) : editor.block.end } : undefined} onClose={() => setEditor(null)}/>}
  </div>;
}

/** What closing a day will do to recordings, in words, with the confirmation it needs. */
function CloseConsequences({ state, dayId, now, confirmed, onConfirm }: { state: Snapshot; dayId: string; now: string; confirmed: boolean; onConfirm: (value: boolean) => void }) {
  const preview = previewDayClose(state, dayId, now);
  if (!preview.valid || (!preview.associatedSessions.length && !preview.continuingSessions.length)) return null;
  return <section className="notice warning planning-close-consequences" aria-label="Recordings and this day">
    <div>
      {preview.associatedSessions.length > 0 && <>
        <strong>Closing this day ends {preview.associatedSessions.length === 1 ? 'this recording' : 'these recordings'}:</strong>
        <ul>{preview.associatedSessions.map(session => <li key={session.id}>{targetTitle(state, session.target)} · {session.state === 'running' ? 'recording now' : 'paused'} · {minutesLabel(session.recordedMinutes)} recorded</li>)}</ul>
        <p>The task stays open. Nothing is marked done.</p>
        <label className="check-label"><input type="checkbox" checked={confirmed} onChange={e => onConfirm(e.target.checked)}/>Stop recording and close the day</label>
      </>}
      {preview.continuingSessions.map(session => <p key={session.id}>{targetTitle(state, session.target)} keeps recording. It is not part of this day and is not stopped.</p>)}
    </div>
  </section>;
}

export function StartDayDialog({ state, now, run, runReviewed, onClose, onPlanToday }: { state: Snapshot; now: string; run: PageProps['run']; runReviewed?: PageProps['runReviewed']; onClose: () => void; onPlanToday?: (date: string) => void }) {
  const zone = state.settings.timezone;
  const previous = state.days.find(d => !d.archived && !d.endedAt);
  const [wake, setWake] = useState(now);
  const [sleep, setSleep] = useState('');
  const [quality, setQuality] = useState('');
  const [weight, setWeight] = useState('');
  const [mood, setMood] = useState('');
  const [energy, setEnergy] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [notice, setNotice] = useState('');
  const [wakeDetails, setWakeDetails] = useState(false);
  const [sleepDetails, setSleepDetails] = useState(false);
  const [closeConfirmed, setCloseConfirmed] = useState(false);
  useEffect(() => { setCloseConfirmed(false); }, [state.revision]);
  const form = useRef<HTMLFormElement>(null);
  async function start(e: FormEvent, onlyWake = false) {
    e.preventDefault(); setBusy(true); setNotice('');
    try {
      const logs: Extract<Command, { type: 'day.startWithCheckin' }>['logs'] = [];
      if (!onlyWake && weight) logs.push({ kind: 'weight', at: wake, value: Number(weight) });
      if (!onlyWake && sleep) logs.push({ kind: 'sleep', start: sleep, end: wake, ...(quality ? { quality: Number(quality) } : {}) });
      if (await run({ type: 'day.startWithCheckin', date: dateKey(wake, zone), wakeAt: wake, ...(!onlyWake && mood ? { mood: Number(mood) } : {}), ...(!onlyWake && energy ? { energy: Number(energy) } : {}), note: onlyWake ? '' : note, logs })) setStarted(true);
    } finally { setBusy(false); }
  }
  if (started) return <Modal title="Your day is started" onClose={onClose}><div className="v3-stack"><p>Your check-in is saved. Choosing a plan is optional.</p>{onPlanToday && <button className="primary" onClick={() => onPlanToday(dateKey(wake, zone))}>Plan today</button>}<button onClick={onClose}>Continue to my day</button></div></Modal>;
  if (previous && previous.date !== dateKey(now, zone)) {
    const preview = previewDayClose(state, previous.id, now);
    const needsConfirmation = preview.associatedSessions.length > 0;
    return <Modal title="A day still needs closing" onClose={onClose}>
      <p className="dialog-intro">{previous.date}</p>
      <p>Close your open day from {dateLabel(previous.date, dateKey(now, zone))} before starting this one. Open tasks stay open.</p>
      <CloseConsequences state={state} dayId={previous.id} now={now} confirmed={closeConfirmed} onConfirm={setCloseConfirmed}/>
      {notice && <p role="status" className="notice">{notice}</p>}
      <button className="primary" disabled={busy || (needsConfirmation && !closeConfirmed)} onClick={async () => {
        setBusy(true);
        try {
          const command: Command = { type: 'day.close', id: previous.id, expectedSessions: preview.expectedSessions };
          const ok = runReviewed ? (await runReviewed(command, preview.baseRevision)).ok : await run(command);
          if (ok) setNotice('Previous day closed. Start your new day.');
        } finally { setBusy(false); }
      }}>Close previous day and continue</button>
      <p className="muted">You can edit the summary and journal later in Review.</p>
    </Modal>;
  }
  const closedToday = state.days.find(d => d.date === dateKey(now, zone) && d.startedAt && d.endedAt);
  if (closedToday) return <Modal title="Today is already saved" onClose={onClose}><p>Your morning check-in and journal are preserved. You can reopen today to continue tracking.</p><button className="primary" disabled={busy} onClick={async () => { setBusy(true); try { if (await run({ type: 'day.reopen', id: closedToday.id })) onClose(); } finally { setBusy(false); } }}>Reopen today</button></Modal>;
  const wakeMinutes = minuteOfDay(wake, zone), hour = Math.floor(wakeMinutes / 60);
  const setWakePart = (newHour: number, minute: number) => { try { setWake(localInstant(dateKey(wake, zone), `${String(newHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, zone)); } catch { setNotice('That time is skipped by daylight saving. Choose another time.'); } };
  const sleepMinutes = sleep ? Math.round((Date.parse(wake) - Date.parse(sleep)) / 60000) : undefined;
  return <Modal className="planning-day-sheet planning-start-day" title="A fresh start" onClose={onClose}>
    <DayBrand/><header className="planning-day-intro"><p><Sun size={15}/>{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: state.settings.timezone }).format(new Date(wake))}</p><h1>Good morning, {state.settings.name}.</h1><span>A quiet check-in before the world rushes in.</span></header>
    <form className="planning-day-form" ref={form} onSubmit={e => start(e)}>
      {notice && <p role="status" className="notice">{notice}</p>}
      <section className="planning-wake-card"><h2>What time did you wake up?</h2><div className="planning-wake-wheel"><span className="planning-wheel-column"><small aria-hidden="true">{((hour + 10) % 12) + 1}</small><select aria-label="I woke up at hour" value={hour} onChange={e => setWakePart(Number(e.target.value), wakeMinutes % 60)}>{Array.from({ length: 24 }, (_, h) => <option value={h} key={h}>{h % 12 || 12}</option>)}</select><small aria-hidden="true">{hour % 12 + 1}</small></span><b>:</b><span className="planning-wheel-column"><small aria-hidden="true">{String((wakeMinutes + 55) % 60).padStart(2, '0')}</small><select aria-label="I woke up at minute" value={wakeMinutes % 60} onChange={e => setWakePart(hour, Number(e.target.value))}>{wakeMinutes % 5 !== 0 && <option value={wakeMinutes % 60}>{String(wakeMinutes % 60).padStart(2, '0')}</option>}{Array.from({ length: 12 }, (_, m) => <option value={m * 5} key={m}>{String(m * 5).padStart(2, '0')}</option>)}</select><small aria-hidden="true">{String((wakeMinutes + 5) % 60).padStart(2, '0')}</small></span><span className="planning-wheel-column"><button type="button" data-dirty aria-label="Toggle morning or afternoon" onClick={() => setWakePart((hour + 12) % 24, wakeMinutes % 60)}>{hour < 12 ? 'AM' : 'PM'}</button><small aria-hidden="true">{hour < 12 ? 'PM' : 'AM'}</small></span></div><button type="button" className="planning-wake-date-toggle" onClick={() => setWakeDetails(!wakeDetails)}>{wakeDetails ? 'Hide date' : 'Change date'}</button>{wakeDetails && <input aria-label="I woke up at date" type="date" value={dateKey(wake, zone)} onChange={e => { if (e.target.value) { try { setWake(localInstant(e.target.value, `${String(hour).padStart(2, '0')}:${String(wakeMinutes % 60).padStart(2, '0')}`, zone)); } catch { setNotice('Choose another wake time.'); } } }}/>}</section>
      <h2 className="planning-section-label">A few quick notes (optional)</h2>
      <section className="planning-checkin-card"><p>How are you feeling?</p><div className="planning-moods" role="group" aria-label="Mood">{['😭', '😔', '😐', '🙂', '🤩'].map((emoji, index) => <button type="button" key={emoji} aria-label={`Mood ${index + 1} of 5`} aria-pressed={mood === String(index + 1)} className={mood === String(index + 1) ? 'selected' : ''} onClick={() => setMood(mood === String(index + 1) ? '' : String(index + 1))}>{emoji}</button>)}</div></section>
      <section className="planning-checkin-card"><div className="planning-checkin-label"><p>Energy level</p><span>{energy ? `${energy} of 5` : 'Not recorded'}</span></div><div className="planning-energy" role="group" aria-label="Energy">{[1, 2, 3, 4, 5].map(n => <button type="button" key={n} aria-label={`Energy ${n} of 5`} aria-pressed={energy === String(n)} onClick={() => setEnergy(energy === String(n) ? '' : String(n))}><span className={Number(energy) >= n ? 'filled' : ''}/></button>)}</div></section>
      <div className="planning-morning-metrics"><label className="planning-checkin-card"><span>Morning weight</span><div><input aria-label="Morning weight (lb)" type="number" min="1" max="2000" step="0.1" value={weight} placeholder="—" onChange={e => setWeight(e.target.value)}/><small>lbs</small></div></label><button type="button" className="planning-checkin-card" aria-expanded={sleepDetails} onClick={() => setSleepDetails(!sleepDetails)}><span>Sleep duration</span><strong>{sleepMinutes !== undefined && sleepMinutes > 0 ? `${Math.floor(sleepMinutes / 60)}h ${sleepMinutes % 60}m` : 'Add sleep'}</strong></button></div>
      {sleepDetails && <section className="planning-sleep-details"><button type="button" data-dirty onClick={() => setSleep(localInstant(addDays(dateKey(wake, zone), -1), '23:00', zone))}>Set sleep start</button>{sleep && <><DateTimeField label="Fell asleep" value={sleep} onChange={setSleep} zone={zone}/><Field label="Sleep quality"><select value={quality} onChange={e => setQuality(e.target.value)}><option value="">Not recorded</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></Field></>}</section>}
      <label className="planning-checkin-card planning-note"><span>Morning note</span><textarea aria-label="How are you waking up?" value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Anything on your mind?"/></label>
      <button disabled={busy} className="primary planning-day-submit">{busy ? 'Saving…' : 'Start my day'}</button>
      <button type="button" disabled={busy} className="planning-skip" onClick={e => start(e, true)}>Just record wake time</button>
    </form>
  </Modal>;
}

export function EndDayDialog({ day, state, now, run, runReviewed, onClose, onResolve, onOpenTask, onPlanTomorrow }: { day: Day; state: Snapshot; now: string; run: PageProps['run']; runReviewed?: PageProps['runReviewed']; onClose: () => void; onResolve: (b: Block) => void; onOpenTask?: (taskId: string) => void; onPlanTomorrow: (date: string) => void }) {
  const zone = state.settings.timezone;
  const tomorrow = addDays(day.date, 1);
  const [summary, setSummary] = useState(day.summary || summaryForDay(state, day.id, now));
  const [summaryDirty, setSummaryDirty] = useState(false);
  const [journal, setJournal] = useState(day.journal);
  const [changedPlan, setChangedPlan] = useState(day.reflection?.changedPlan ?? '');
  const [easierTomorrow, setEasierTomorrow] = useState(day.reflection?.easierTomorrow ?? '');
  const [busy, setBusy] = useState(false);
  const [planTomorrow, setPlanTomorrow] = useState(false);
  const [closeConfirmed, setCloseConfirmed] = useState(false);
  const preview = previewDayClose(state, day.id, now);
  useEffect(() => { setCloseConfirmed(false); }, [state.revision]);
  const plan = dayPlanForDate(state, day.date);
  const chosen = (plan?.taskIds ?? []).map(id => state.tasks.find(task => task.id === id)).filter((task): task is Task => !!task && !task.archived);
  const dayRange = localDayRange(day.date, zone);
  const entries = state.blocks.filter(b => !b.archived && b.status !== 'cancelled' && clipInterval(b, dayRange));
  const chosenIds = new Set(chosen.map(task => task.id));
  const backlog = state.tasks.filter(task => !task.archived && task.status === 'open' && !chosenIds.has(task.id) && !entries.some(block => block.taskId === task.id));
  const taskRow = (task: Task) => {
    const booking = pendingBookingForTask(state, task.id);
    const recording = unfinishedSessions(state).find(s => s.target.kind === 'task' && s.target.taskId === task.id);
    const canDefer = !recording && (!booking || (blockFlexibility(booking) === 'flexible' && !hasRecordedWork(state, booking)));
    return <div className="planning-v3-card v3-stack" key={task.id}>
      <strong>{task.title}</strong><p className="muted">{task.status === 'complete' ? 'Done' : task.status === 'partial' ? 'Partly done' : recording ? sessionState(recording) === 'running' ? 'Recording now' : 'Paused' : 'Open'}</p>
      {task.status === 'open' && <div className="v3-actions">
        <button disabled={busy} onClick={async () => { setBusy(true); try { await run({ type: 'task.resolve', id: task.id, outcome: 'complete' }); } finally { setBusy(false); } }}>Done{recording ? ' · end recording' : ''}</button>
        {canDefer && <button disabled={busy} onClick={async () => { setBusy(true); try {
          const command: Command = { type: 'task.defer', id: task.id, preferredDay: tomorrow, ...(booking ? { cancelBlockId: booking.id } : {}), ...(chosenIds.has(task.id) ? { deselectFromDate: day.date } : {}) };
          if (runReviewed) await runReviewed(command, state.revision); else await run(command);
        } finally { setBusy(false); } }}>Tomorrow · no time{booking ? ' · cancel booking' : ''}</button>}
        {onOpenTask && <button disabled={busy} onClick={() => onOpenTask(task.id)}>Details and outcomes</button>}
      </div>}
    </div>;
  };
  async function finish() {
    setBusy(true);
    try {
      const command: Command = { type: 'day.close', id: day.id, ...(summaryDirty ? { summary } : {}), journal, reflection: { changedPlan, easierTomorrow }, expectedSessions: preview.expectedSessions };
      const okay = runReviewed ? (await runReviewed(command, preview.baseRevision)).ok : await run(command);
      if (okay) { if (planTomorrow) onPlanTomorrow(tomorrow); else onClose(); }
    } finally { setBusy(false); }
  }
  return <Modal className="v3-sheet" title="Close your day" onClose={onClose}>
    <EndDaySections dateLabel={day.date}
      commitments={<><DayFactsSummary state={state} date={day.date} now={now}/>{chosen.map(taskRow)}
        {entries.filter(block => !block.taskId || !chosenIds.has(block.taskId)).map(block => <section className="planning-v3-card v3-stack" key={block.id}><strong>{block.title}</strong><p>{rangeLabel(block.start, block.end, zone)} · {entryStatus(state, block, now).text}</p>{block.status === 'pending' && <button disabled={busy} onClick={() => onResolve(block)}>Record result…</button>}</section>)}
        {!chosen.length && !entries.length && <p>No tasks or calendar commitments were chosen for this date.</p>}
        <details><summary>Edit factual summary</summary><Field label="Daily factual summary"><textarea rows={6} maxLength={10000} value={summary} onChange={e => { setSummary(e.target.value); setSummaryDirty(true); }}/></Field><p className="muted">An edited summary is preserved unless you explicitly regenerate it in Review.</p></details>
      </>}
      backlogCount={backlog.length} backlog={backlog.map(taskRow)}
      changedPlan={changedPlan} onChangedPlanChange={setChangedPlan} easierTomorrow={easierTomorrow} onEasierTomorrowChange={setEasierTomorrow} journal={journal} onJournalChange={setJournal}
      sessionConsequence={<>{preview.associatedSessions.map(session => <p key={session.id}>{targetTitle(state, session.target)} · {session.state} · {minutesLabel(session.recordedMinutes)} recorded. Closing ends this recording and leaves the task open.</p>)}{preview.continuingSessions.map(session => <p key={session.id}>{targetTitle(state, session.target)} is attached elsewhere and continues recording.</p>)}</>}
      requiresStopConfirmation={preview.associatedSessions.length > 0} stopConfirmed={closeConfirmed} onStopConfirmedChange={setCloseConfirmed}
      planTomorrow={planTomorrow} onPlanTomorrowChange={setPlanTomorrow} disabled={busy || !preview.valid} onCloseDay={finish} onKeepOpen={onClose}/>
  </Modal>;
}
export function TemplatesPage({ state, now, run, runReviewed }: PageProps) {
  const [edit, setEdit] = useState<DayTemplate | true | null>(null);
  const [title, setTitle] = useState('');
  const [rows, setRows] = useState<TemplateBlock[]>([]);
  const [date, setDate] = useState(dateKey(now, state.settings.timezone));
  const [applying, setApplying] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const used = (template: DayTemplate) => state.blocks.some(block => block.id.startsWith(`tpl:${template.id}:`));
  const open = (template?: DayTemplate) => {
    const copy = template && used(template);
    setTitle(template ? `${template.title}${copy ? ' copy' : ''}` : '');
    setRows(template?.blocks ?? [{ title: '', kind: 'routine', tag: 'Personal', startMinute: 420, duration: 15, notes: '' }]);
    setEdit(copy ? true : template ?? true);
  };
  const update = (i: number, changes: Partial<TemplateBlock>) => setRows(rows.map((row, index) => index === i ? { ...row, ...changes } : row));
  return <div className="v3-stack">
    <header className="page-heading"><h1>Day templates</h1><p>Your familiar rhythm, ready to review.</p></header>
    <button className="primary" onClick={() => open()}><Plus size={18}/>New template</button>
    <Field label="Apply on date"><input type="date" value={date} onChange={e => { if (e.target.value) setDate(e.target.value); }}/></Field>
    {state.templates.filter(t => !t.archived).map(template => <section className="planning-v3-card v3-stack" key={template.id}>
      <h2>{template.title}</h2><p className="muted">{template.blocks.length} entries · {template.blocks.reduce((n, b) => n + b.duration, 0)} minutes before overlap adjustment</p>
      {used(template) && <p className="muted">This template has been applied. Changing its entries creates a new template and preserves existing history.</p>}
      <div className="v3-actions"><button onClick={() => setApplying(template.id)}>Review template</button><button onClick={() => open(template)}>{used(template) ? 'Make edited copy' : 'Edit'}</button><button onClick={() => run({ type: 'record.archive', collection: 'templates', id: template.id, archived: true })}>Archive</button></div>
    </section>)}
    {applying && <TemplateApplyDialog state={state} now={now} run={run} runReviewed={runReviewed} templateId={applying} date={date} onClose={() => setApplying(null)}/>}
    {edit && <Modal title="Day template" onClose={() => setEdit(null)}><form className="stack" onSubmit={async e => {
      e.preventDefault(); setBusy(true);
      try { if (await run({ type: 'template.save', template: { ...(edit === true ? {} : edit), title, blocks: rows } })) setEdit(null); } finally { setBusy(false); }
    }}>
      <Field label="Template name"><input required value={title} onChange={e => setTitle(e.target.value)} placeholder="A steady workday"/></Field>
      {rows.map((row, i) => <fieldset className="template-row" key={i}><legend>Entry {i + 1}</legend>
        <Field label="Title"><input required value={row.title} onChange={e => update(i, { title: e.target.value })}/></Field>
        <div className="grid-two"><Field label="Kind"><select value={row.kind} onChange={e => update(i, { kind: e.target.value as TemplateBlock['kind'] })}><option value="routine">Routine</option><option value="task">Task</option><option value="appointment">Appointment</option></select></Field>
          <Field label="Area"><select value={row.tag} onChange={e => update(i, { tag: e.target.value as TemplateBlock['tag'] })}><option>Personal</option><option>Work</option></select></Field></div>
        <Field label="Start"><select value={row.startMinute} onChange={e => update(i, { startMinute: Number(e.target.value) })}>{Array.from({ length: 288 }, (_, j) => <option key={j} value={j * 5}>{String(Math.floor(j * 5 / 60)).padStart(2, '0')}:{String(j * 5 % 60).padStart(2, '0')}</option>)}</select></Field>
        <DurationField value={row.duration} onChange={duration => update(i, { duration })}/>
        <button type="button" onClick={() => setRows(rows.filter((_, j) => i !== j))}><X size={16}/>Remove entry</button>
      </fieldset>)}
      <button type="button" onClick={() => setRows([...rows, { title: '', kind: 'routine', tag: 'Personal', startMinute: 540, duration: 30, notes: '' }])}><Plus size={18}/>Add entry</button>
      <button className="primary" disabled={busy || !rows.length}>Save template</button>
    </form></Modal>}
  </div>;
}
