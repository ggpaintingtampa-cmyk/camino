import { useState, type FormEvent } from 'react';
import { CalendarClock, Check, Pause, Play } from 'lucide-react';
import { addDays, dateKey, localInstant, minuteOfDay, validDate } from '../../shared/dates';
import { blockFlexibility } from '../../shared/domain-core';
import { dayPlanForDate, pendingBookingForTask } from '../../shared/planning';
import { hasRecordedWork, recordedMinutes, sessionState, unfinishedSessionForTarget } from '../../shared/sessions';
import type { Snapshot, Tag, Task, TaskDeadline, TaskPatch } from '../../shared/types';
import { EstimateField } from '../components/EstimateField';
import { dateLabel, deadlineLabel, kindLabel, minutesLabel, rangeLabel } from '../components/format';
import { Modal, type PageProps } from '../ui';

export interface TaskDetailsProps {
  taskId: string;
  state: Snapshot;
  now: string;
  run: PageProps['run'];
  onClose: () => void;
  /** Opens the placement editor. Saving details never books or moves a time. */
  onPlan: (task: Task) => void;
  onOutcome: (task: Task, mode?: 'choices' | 'partial') => void;
  onStart: (task: Task) => void;
  onPause: (sessionId: string) => void;
}

type DeadlineMode = 'none' | 'date' | 'instant';
const pad = (value: number) => String(value).padStart(2, '0');

/** Intent and guidance of one task. Estimate, preferred day, deadline and booking stay separate facts. */
export function TaskDetails({ taskId, state, now, run, onClose, onPlan, onOutcome, onStart, onPause }: TaskDetailsProps) {
  const task = state.tasks.find(candidate => candidate.id === taskId);
  const zone = state.settings.timezone;
  const today = dateKey(now, zone);
  const [title, setTitle] = useState(task?.title ?? '');
  const [firstAction, setFirstAction] = useState(task?.firstAction ?? '');
  const [doneWhen, setDoneWhen] = useState(task?.doneWhen ?? '');
  const [estimate, setEstimate] = useState(task?.duration);
  const [estimateValid, setEstimateValid] = useState(true);
  const [preferredDay, setPreferredDay] = useState(task?.preferredDay ?? '');
  const [deadlineMode, setDeadlineMode] = useState<DeadlineMode>(task?.deadline?.kind ?? 'none');
  const deadlineZone = task?.deadline?.kind === 'instant' ? task.deadline.timezone : zone;
  const [deadlineDate, setDeadlineDate] = useState(task?.deadline ? task.deadline.kind === 'date' ? task.deadline.date : dateKey(task.deadline.at, deadlineZone) : '');
  const [deadlineTime, setDeadlineTime] = useState(() => { if (task?.deadline?.kind !== 'instant') return '17:00'; const minutes = minuteOfDay(task.deadline.at, deadlineZone); return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`; });
  const [tag, setTag] = useState<Tag>(task?.tag ?? 'Personal');
  const [goalId, setGoalId] = useState(task?.goalId ?? '');
  const [labels, setLabels] = useState(task?.labels.join(', ') ?? '');
  const [notes, setNotes] = useState(task?.notes ?? '');
  const [problem, setProblem] = useState('');
  const [busy, setBusy] = useState(false);
  const [deferring, setDeferring] = useState<'tomorrow' | 'later' | null>(null);
  const [cancelBooking, setCancelBooking] = useState(true);
  const [deselect, setDeselect] = useState(true);
  if (!task) return <Modal className="v3-sheet" title="Task" onClose={onClose}><p>This task is no longer available. It may have been archived from another window.</p><button type="button" onClick={onClose}>Close</button></Modal>;

  const open = task.status === 'open' && !task.archived;
  const booking = pendingBookingForTask(state, task.id);
  const session = unfinishedSessionForTarget(state, { kind: 'task', taskId: task.id });
  const running = !!session && sessionState(session) === 'running';
  const selectedToday = !!dayPlanForDate(state, today)?.taskIds.includes(task.id);
  const bookingCancellable = !!booking && blockFlexibility(booking) === 'flexible' && !hasRecordedWork(state, booking);

  function deadlineDraft(): { value?: TaskDeadline | null; error?: string } {
    if (deadlineMode === 'none') return { value: null };
    if (!validDate(deadlineDate)) return { error: 'Choose the deadline date.' };
    if (deadlineMode === 'date') return { value: { kind: 'date', date: deadlineDate } };
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(deadlineTime)) return { error: 'Choose the deadline time.' };
    try { return { value: { kind: 'instant', at: localInstant(deadlineDate, deadlineTime, deadlineZone), timezone: deadlineZone } }; }
    catch (error) { return { error: error instanceof Error ? error.message : 'That time does not exist on this date.' }; }
  }
  function patch(): { patch?: TaskPatch; error?: string } {
    const current = task!;
    const next: TaskPatch = {};
    const name = title.trim();
    if (!name) return { error: 'Give the task a title.' };
    if (!estimateValid) return { error: 'Correct the estimate, or leave it blank.' };
    if (name !== current.title) next.title = name;
    const guidance = (value: string, stored: string | undefined) => value.trim() === (stored ?? '') ? undefined : value.trim() ? value.trim() : null;
    const first = guidance(firstAction, current.firstAction); if (first !== undefined) next.firstAction = first;
    const done = guidance(doneWhen, current.doneWhen); if (done !== undefined) next.doneWhen = done;
    if (estimate !== current.duration) next.duration = estimate ?? null;
    if (preferredDay !== (current.preferredDay ?? '')) {
      if (preferredDay && !validDate(preferredDay)) return { error: 'Choose a valid preferred day.' };
      next.preferredDay = preferredDay || null;
    }
    const deadline = deadlineDraft();
    if (deadline.error) return { error: deadline.error };
    if (JSON.stringify(deadline.value ?? null) !== JSON.stringify(current.deadline ?? null)) next.deadline = deadline.value ?? null;
    if (tag !== current.tag) next.tag = tag;
    if (goalId !== (current.goalId ?? '')) next.goalId = goalId || null;
    const list = labels.split(',').map(label => label.trim()).filter(Boolean);
    if (list.some(label => label.length > 60) || list.length > 30) return { error: 'Use up to 30 labels of at most 60 characters.' };
    if (JSON.stringify(list) !== JSON.stringify(current.labels)) next.labels = list;
    if (notes !== current.notes) next.notes = notes;
    return { patch: next };
  }
  const draft = patch();
  const dirty = !!draft.patch && Object.keys(draft.patch).length > 0;

  async function save(event: FormEvent) {
    event.preventDefault();
    const result = patch();
    if (result.error || !result.patch) { setProblem(result.error ?? ''); return; }
    setProblem('');
    if (!Object.keys(result.patch).length) { onClose(); return; }
    setBusy(true);
    try { if (await run({ type: 'task.update', id: task!.id, patch: result.patch })) onClose(); } finally { setBusy(false); }
  }
  async function act(command: Parameters<PageProps['run']>[0]) { setBusy(true); try { if (await run(command)) onClose(); } finally { setBusy(false); } }
  const guard = (action: () => void) => { if (dirty && !window.confirm('Leave without saving your changes to this task?')) return; action(); };
  const deferDate = deferring === 'tomorrow' ? addDays(today, 1) : null;

  return <Modal className="v3-sheet v3-task-details" title={open ? 'Task details' : task.status === 'complete' ? 'Completed task' : 'Partly done task'} onClose={onClose} dirty={dirty}>
    <form className="v3-stack" onSubmit={save}>
      {problem && <p className="v3-field-error" role="alert">{problem}</p>}
      <label className="v3-field"><span>Title</span><input required maxLength={200} value={title} disabled={!open} onChange={event => setTitle(event.target.value)}/></label>
      <label className="v3-field"><span>First action<span className="v3-optional">optional</span></span><input maxLength={500} value={firstAction} disabled={!open} onChange={event => setFirstAction(event.target.value)} placeholder="The first small thing to do"/></label>
      <label className="v3-field"><span>Done when<span className="v3-optional">optional</span></span><input maxLength={500} value={doneWhen} disabled={!open} onChange={event => setDoneWhen(event.target.value)} placeholder="How you will know to stop"/></label>
      <EstimateField value={estimate} disabled={!open} onChange={(value, valid) => { setEstimate(value); setEstimateValid(valid); }} hint="Your guess of the work. Changing it never moves a booked time."/>

      <fieldset className="v3-field">
        <legend>Preferred day<span className="v3-optional">optional</span></legend>
        <input aria-label="Preferred day" type="date" value={preferredDay} disabled={!open} onChange={event => setPreferredDay(event.target.value)}/>
        <div className="v3-chip-row">
          {([[today, 'Today'], [addDays(today, 1), 'Tomorrow'], ['', 'No day']] as const).map(([value, label]) => <button type="button" key={label} data-dirty disabled={!open} aria-pressed={preferredDay === value} className={preferredDay === value ? 'selected' : ''} onClick={() => setPreferredDay(value)}>{label}</button>)}
        </div>
        <p className="v3-hint">An intention for a day. It is not a deadline and reserves no time.</p>
      </fieldset>

      <fieldset className="v3-field">
        <legend>Deadline<span className="v3-optional">optional</span></legend>
        <div className="v3-chip-row" role="group" aria-label="Deadline kind">
          {([['none', 'No deadline'], ['date', 'On a date'], ['instant', 'Date and time']] as const).map(([value, label]) => <button type="button" key={value} data-dirty disabled={!open} aria-pressed={deadlineMode === value} className={deadlineMode === value ? 'selected' : ''} onClick={() => setDeadlineMode(value)}>{label}</button>)}
        </div>
        {deadlineMode !== 'none' && <div className="v3-inline-fields">
          <input aria-label="Deadline date" type="date" value={deadlineDate} disabled={!open} onChange={event => setDeadlineDate(event.target.value)}/>
          {deadlineMode === 'instant' && <input aria-label="Deadline time" type="time" value={deadlineTime} disabled={!open} onChange={event => setDeadlineTime(event.target.value)}/>}
        </div>}
        {deadlineMode === 'instant' && <p className="v3-hint">Time zone: {deadlineZone.replaceAll('_', ' ')}</p>}
        {deadlineMode === 'date' && <p className="v3-hint">Due on that date. No time of day is added.</p>}
      </fieldset>

      <section className="v3-field" aria-label="Calendar booking">
        <span className="v3-field-label">Calendar booking</span>
        {booking
          ? <p className="v3-booking"><CalendarClock size={16} aria-hidden="true"/>{dateLabel(dateKey(booking.start, zone), today)} {rangeLabel(booking.start, booking.end, zone)} · {kindLabel(booking, blockFlexibility(booking))}</p>
          : <p className="v3-hint">No time is booked for this task.</p>}
        {open && <button type="button" disabled={busy} onClick={() => guard(() => onPlan(task))}>{booking ? 'Change booked time…' : 'Plan a time…'}</button>}
      </section>

      <fieldset className="v3-field">
        <legend>Area</legend>
        <div className="v3-chip-row">{(['Personal', 'Work'] as const).map(value => <button type="button" key={value} data-dirty disabled={!open} aria-pressed={tag === value} className={tag === value ? 'selected' : ''} onClick={() => setTag(value)}>{value}</button>)}</div>
      </fieldset>
      <label className="v3-field"><span>Goal<span className="v3-optional">optional</span></span>
        <select value={goalId} disabled={!open} onChange={event => setGoalId(event.target.value)}>
          <option value="">No linked goal</option>
          {state.goals.filter(goal => goal.id === task.goalId || (!goal.archived && goal.status !== 'archived')).map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
        </select>
      </label>
      <label className="v3-field"><span>Labels<span className="v3-optional">optional</span></span><input value={labels} disabled={!open} onChange={event => setLabels(event.target.value)} placeholder="Home, Health, Learning"/></label>
      <label className="v3-field"><span>Notes<span className="v3-optional">optional</span></span><textarea rows={4} maxLength={10000} value={notes} disabled={!open} onChange={event => setNotes(event.target.value)}/></label>
      {task.deadline && <p className="v3-hint">Saved deadline: {deadlineLabel(task.deadline, zone, today)}</p>}

      {open && <div className="v3-actions v3-sticky-actions">
        <button type="button" disabled={busy} onClick={onClose}>Cancel</button>
        <button className="primary" disabled={busy || !!draft.error}>{busy ? 'Saving…' : 'Save details'}</button>
      </div>}
    </form>

    {open && <section className="v3-stack v3-task-work" aria-label="Work on this task">
      <h3>Work</h3>
      {session && <p className="v3-hint">{running ? 'Recording now' : 'Paused'} · {minutesLabel(recordedMinutes(session, now))} recorded in this session.</p>}
      <div className="v3-actions">
        {running
          ? <button type="button" disabled={busy} onClick={() => guard(() => onPause(session!.id))}><Pause size={16} aria-hidden="true"/>Pause</button>
          : <button type="button" disabled={busy} onClick={() => guard(() => onStart(task))}><Play size={16} aria-hidden="true"/>{session ? 'Resume' : 'Start'}</button>}
        <button type="button" disabled={busy} onClick={() => guard(() => onOutcome(task, 'choices'))}><Check size={16} aria-hidden="true"/>Done or partly done…</button>
      </div>
      <h3>Another day</h3>
      {deferring ? <div className="v3-stack v3-defer-review">
        <p><strong>{deferring === 'tomorrow' ? `Intended for tomorrow, ${dateLabel(deferDate!, today)}` : 'No intended day (Later)'}</strong>. No time is booked.</p>
        {booking && (bookingCancellable
          ? <label className="v3-check"><input type="checkbox" checked={cancelBooking} onChange={event => setCancelBooking(event.target.checked)}/><span>Cancel the booking {dateLabel(dateKey(booking.start, zone), today)} {rangeLabel(booking.start, booking.end, zone)}. It stays in history.</span></label>
          : <p className="v3-hint">The booking {rangeLabel(booking.start, booking.end, zone)} stays as it is: it is fixed or already has recorded work.</p>)}
        {selectedToday && <label className="v3-check"><input type="checkbox" checked={deselect} onChange={event => setDeselect(event.target.checked)}/><span>Remove it from today’s chosen tasks.</span></label>}
        <div className="v3-actions">
          <button type="button" disabled={busy} onClick={() => setDeferring(null)}>Back</button>
          <button type="button" className="primary" disabled={busy || running} onClick={() => act({ type: 'task.defer', id: task.id, preferredDay: deferDate, ...(booking && bookingCancellable && cancelBooking ? { cancelBlockId: booking.id } : {}), ...(selectedToday && deselect ? { deselectFromDate: today } : {}) })}>{deferring === 'tomorrow' ? 'Move to tomorrow' : 'Move to Later'}</button>
        </div>
        {running && <p className="v3-hint">Pause or stop the recording before moving this task.</p>}
      </div> : <div className="v3-actions">
        <button type="button" disabled={busy} onClick={() => guard(() => setDeferring('tomorrow'))}>Tomorrow…</button>
        <button type="button" disabled={busy} onClick={() => guard(() => setDeferring('later'))}>Later…</button>
        <button type="button" disabled={busy} onClick={() => { if (window.confirm(session ? 'Archive this task? Its recording ends and any booking is cancelled. History is kept.' : 'Archive this task? Any booking is cancelled. History is kept.')) void act({ type: 'record.archive', collection: 'tasks', id: task.id, archived: true }); }}>Archive</button>
      </div>}
    </section>}
    {!open && task.status === 'complete' && !task.archived && <div className="v3-actions"><button type="button" disabled={busy} onClick={() => act({ type: 'task.reopen', id: task.id })}>Reopen task</button></div>}
    {!open && task.status === 'partial' && <p className="v3-hint">The remaining work continues in its own task.</p>}
  </Modal>;
}
