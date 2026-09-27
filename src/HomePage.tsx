import { useEffect, useState } from 'react';
import { CheckCircle2, MapPin, Plus, Sun, Wallet, X } from 'lucide-react';
import { blockFlexibility, capacityForRemainingDay, entryConflicts, localDayRange } from '../shared/capacity';
import { addDays, dateKey as recordDate, timeLabel as formatTime } from '../shared/dates';
import { openDay } from '../shared/domain-core';
import { dayPlanForDate, nextFixedCommitment, taskCollections } from '../shared/planning';
import { dailySteps, goalProgress } from '../shared/selectors';
import { recordedMinutes, recordedSlices, runningSession, sessionState, unfinishedSessions } from '../shared/sessions';
import type { Block, SessionTarget, WeatherData, WorkSession } from '../shared/types';
import * as api from './api';
import type { View } from './components/AppNavigation';
import { CapacitySummary } from './components/CapacitySummary';
import { CommitmentRow } from './components/CommitmentRow';
import { FocusPanel, type FocusTarget, type FocusTiming } from './components/FocusPanel';
import { dateLabel, estimateLabel, minutesLabel, rangeLabel } from './components/format';
import { targetTitle, type TaskActions } from './components/taskActions';
import { TaskRow } from './components/TaskRow';
import { money, type PageProps } from './ui';

export interface TodayPageProps extends PageProps {
  go: (view: View, kind?: string) => void;
  actions: TaskActions;
  /** Opens Start day, or the open-day path when yesterday is still open. */
  onStartDay: () => void;
  /** Opens the plan for the date. Planning and Reset flows are entered from Plan. */
  onChangePlan: (date: string) => void;
}

/** Today: the current action first, the next fixed commitment second, chosen priorities third. */
export function HomePage({ state, now, run, go, actions, onStartDay, onChangePlan }: TodayPageProps) {
  const zone = state.settings.timezone;
  const timeLabel = (value: string) => formatTime(value, zone);
  const calendarToday = recordDate(now, zone);
  const day = openDay(state);
  // Yesterday's day may still be open after midnight. Planning follows the open day.
  const date = day?.date ?? calendarToday;
  const closedToday = state.days.find(d => !d.archived && d.date === calendarToday && d.startedAt && d.endedAt);
  const ts = Date.parse(now);
  const range = localDayRange(calendarToday, zone);

  const running = runningSession(state);
  const paused = unfinishedSessions(state).filter(session => sessionState(session) === 'paused')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const plan = dayPlanForDate(state, date);
  const collections = taskCollections(state, date, now);
  const mainStored = plan?.mainTaskId ? state.tasks.find(task => task.id === plan.mainTaskId) : undefined;
  const mainDone = !!mainStored && mainStored.status !== 'open' && !mainStored.archived;
  const openSelected = collections.today.selected;
  const pausedForToday = paused.find(session => session.target.kind === 'task' && collections.today.selected.some(entry => entry.task.id === (session.target as { taskId: string }).taskId)) ?? paused[0];
  const focusSession: WorkSession | undefined = running ?? pausedForToday;

  const bookedNow = state.blocks.find(block => !block.archived && block.status === 'pending' && block.kind === 'routine' && Date.parse(block.start) <= ts && Date.parse(block.end) > ts);
  const readyEntry = openSelected.find(entry => entry.main) ?? collections.today.other.find(entry => entry.booking && Date.parse(entry.booking.start) <= ts && Date.parse(entry.booking.end) > ts) ?? openSelected[0];
  const readyTarget: SessionTarget | undefined = readyEntry ? { kind: 'task', taskId: readyEntry.task.id } : bookedNow ? { kind: 'routine', blockId: bookedNow.id } : undefined;

  function describe(target: SessionTarget): FocusTarget {
    if (target.kind === 'routine') {
      const block = state.blocks.find(candidate => candidate.id === target.blockId);
      return { title: block?.title ?? 'Routine', context: `${block?.tag ?? 'Personal'} · routine` };
    }
    const task = state.tasks.find(candidate => candidate.id === target.taskId);
    return { title: task?.title ?? 'Task', context: `${task?.tag ?? 'Personal'} · task · ${estimateLabel(task?.duration)}`, ...(task?.firstAction ? { firstAction: task.firstAction } : {}), ...(task?.doneWhen ? { doneWhen: task.doneWhen } : {}) };
  }
  function timing(session: WorkSession): FocusTiming {
    const last = session.intervals.at(-1);
    const booking = last?.plannedBlockId ? state.blocks.find(block => block.id === last.plannedBlockId) : undefined;
    const today = recordedSlices(state, range, now, { sessionId: session.id }).reduce((total, slice) => total + slice.minutes, 0);
    const overrun = booking && sessionState(session) === 'running' ? Math.floor((ts - Date.parse(booking.end)) / 60000) : 0;
    return {
      recordedTodayMinutes: today, recordedSessionMinutes: recordedMinutes(session, now),
      ...(last && !last.end ? { sinceLabel: `${recordDate(last.start, zone) === calendarToday ? '' : `${dateLabel(recordDate(last.start, zone), calendarToday)} `}${timeLabel(last.start)}` } : {}),
      ...(booking ? { plannedFinishLabel: timeLabel(booking.end) } : {}),
      ...(overrun > 0 ? { overrunMinutes: overrun } : {}),
    };
  }
  const taskOf = (target: SessionTarget) => target.kind === 'task' ? state.tasks.find(task => task.id === target.taskId) : undefined;
  const blockOf = (target: SessionTarget) => target.kind === 'routine' ? state.blocks.find(block => block.id === target.blockId) : undefined;
  const finish = (target: SessionTarget) => { const task = taskOf(target), block = blockOf(target); if (task) actions.complete(task); else if (block) void run({ type: 'block.resolve', id: block.id, outcome: 'complete' }); };
  const partial = (target: SessionTarget) => { const task = taskOf(target), block = blockOf(target); if (task) actions.outcome(task, 'partial'); else if (block) actions.resolveBlock(block); };

  const commitment = nextFixedCommitment(state, now);
  const conflictPairs = entryConflicts(state, range).filter(conflict => !conflict.acknowledged);
  const conflictsFor = (block: Block) => conflictPairs.filter(conflict => conflict.aId === block.id || conflict.bId === block.id)
    .map(conflict => state.blocks.find(other => other.id === (conflict.aId === block.id ? conflict.bId : conflict.aId))).filter((other): other is Block => !!other)
    .map(other => `${other.title} ${rangeLabel(other.start, other.end, zone)}`);
  const conflicted = state.blocks.filter(block => conflictPairs.some(conflict => conflict.aId === block.id));
  const needResult = state.blocks.filter(block => !block.archived && block.status === 'pending' && Date.parse(block.end) < ts && (!block.snoozedUntil || Date.parse(block.snoozedUntil) <= ts)
    && !unfinishedSessions(state).some(session => session.intervals.at(-1)?.plannedBlockId === block.id));
  const reminders = state.reminders.filter(r => !r.archived && !r.dismissed && r.pinned && r.startsAt <= now && (!r.expiresAt || r.expiresAt >= now));
  const envelopes = state.envelopes.filter(e => !e.archived && e.status === 'active').sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  const expired = envelopes.filter(e => Date.parse(e.expiresAt) <= ts);
  const lost = state.ledgers.filter(l => l.lost > 0);
  const goals = state.goals.filter(g => !g.archived && g.status === 'active' && (g.pinned || g.targetDate <= addDays(calendarToday, 7))).slice(0, 3);
  const logs = state.logs.filter(l => !l.archived && recordDate(l.kind === 'sleep' && l.end ? l.end : l.at, zone) === calendarToday).sort((a, b) => a.at.localeCompare(b.at));
  const steps = dailySteps(state, calendarToday), sleep = logs.filter(l => l.kind === 'sleep').at(-1);
  const capacity = plan ? capacityForRemainingDay(state, date, now) : undefined;
  const storedSelection = (plan?.taskIds ?? []).map(id => state.tasks.find(task => task.id === id)).filter((task): task is NonNullable<typeof task> => !!task && !task.archived);
  const finishedSelection = storedSelection.filter(task => task.status !== 'open');

  const locations = state.locations.filter(l => !l.archived);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState('');
  const [locationId, setLocationId] = useState(locations.find(l => l.primary)?.id ?? locations[0]?.id ?? '');
  useEffect(() => {
    if (!locationId) return;
    let live = true;
    setWeather(null); setWeatherError('');
    api.api<WeatherData>(`/api/weather?locationId=${encodeURIComponent(locationId)}`).then(w => { if (live) setWeather(w); }).catch(() => { if (live) setWeatherError('Forecast temporarily unavailable'); });
    return () => { live = false; };
  }, [locationId]);

  const dateText = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: zone }).format(new Date(now));
  const otherPaused = paused.filter(session => session !== focusSession);
  const sessionMinutes = (taskId: string) => { const session = unfinishedSessions(state).find(candidate => candidate.target.kind === 'task' && candidate.target.taskId === taskId); return session ? recordedMinutes(session, now) : undefined; };
  const commitmentStatus = (block: Block) => Date.parse(block.start) <= ts ? 'In progress now' : `Starts in ${minutesLabel(Math.ceil((Date.parse(block.start) - ts) / 60000))}`;

  return <div className="v3-today">
    <header className="v3-page-heading">
      <p className="v3-eyebrow">{dateText}</p>
      <h1>Today</h1>
      {day && day.date !== calendarToday && <p className="v3-hint">Your day from {dateLabel(day.date, calendarToday)} is still open. End it when you are ready.</p>}
    </header>

    {focusSession
      ? <FocusPanel mode={running ? 'running' : 'paused'} target={describe(focusSession.target)} timing={timing(focusSession)} busy={actions.busy}
          onPause={() => actions.pause(focusSession.id)} onResume={() => actions.start(focusSession.target)} onDone={() => finish(focusSession.target)}
          onPartial={() => partial(focusSession.target)} onStop={() => actions.stop(focusSession.id)} onChangePlan={() => onChangePlan(date)}>
          {otherPaused.length > 0 && <div className="v3-focus-others">
            <h3>Other paused work</h3>
            <ul>{otherPaused.map(session => <li key={session.id}>
              <span>{targetTitle(state, session.target)} · {minutesLabel(recordedMinutes(session, now))} recorded</span>
              <button type="button" disabled={actions.busy} onClick={() => actions.start(session.target)}>{running ? 'Switch to this' : 'Resume'}</button>
              <button type="button" className="text-button" disabled={actions.busy} onClick={() => actions.stop(session.id)}>Stop recording</button>
            </li>)}</ul>
          </div>}
        </FocusPanel>
      : readyTarget
        ? <FocusPanel mode="ready" target={describe(readyTarget)} busy={actions.busy} message={mainDone ? `Main priority done: ${mainStored!.title}.` : undefined}
            onStart={() => actions.start(readyTarget)} onDone={() => finish(readyTarget)} onChangePlan={() => onChangePlan(date)}/>
        : <FocusPanel mode={mainDone ? 'done' : 'empty'} busy={actions.busy}
            message={mainDone ? `${mainStored!.title} is done. Choose what comes next, or leave the rest open.` : collections.counts.all ? 'No task is chosen for today. Pick one from your tasks, or plan the day.' : 'You have no open tasks. Add one whenever something comes up.'}
            onChangePlan={() => onChangePlan(date)}>
            <div className="v3-actions">
              <button type="button" className="primary" onClick={actions.capture}><Plus size={18} aria-hidden="true"/>Task</button>
              {collections.counts.all > 0 && <button type="button" onClick={() => go('tasks')}>Open tasks</button>}
            </div>
          </FocusPanel>}

    {!day && <section className="v3-card v3-start-day">
      <Sun size={22} aria-hidden="true"/>
      <div><h2>{closedToday ? 'Today is saved' : 'Start your day'}</h2><p className="v3-hint">{closedToday ? 'Reopen it if you have more to add.' : 'Optional. Tasks can be added, started and finished without it.'}</p></div>
      <button type="button" onClick={onStartDay}>{closedToday ? 'Review today' : 'Start day'}</button>
    </section>}

    <section className="v3-section" aria-labelledby="v3-next-fixed">
      <h2 id="v3-next-fixed">Next fixed commitment</h2>
      {commitment.inProgress && <CommitmentRow block={commitment.inProgress} flexibility={blockFlexibility(commitment.inProgress)} zone={zone} today={calendarToday} status={commitmentStatus(commitment.inProgress)} conflicts={conflictsFor(commitment.inProgress)} onOpen={() => go('schedule')}/>}
      {commitment.next && <CommitmentRow block={commitment.next} flexibility={blockFlexibility(commitment.next)} zone={zone} today={calendarToday} status={commitmentStatus(commitment.next)} conflicts={conflictsFor(commitment.next)} onOpen={() => go('schedule')}/>}
      {!commitment.inProgress && !commitment.next && <p className="v3-hint">No fixed commitment ahead.</p>}
    </section>

    <section className="v3-section" aria-labelledby="v3-priorities">
      <div className="v3-section-head"><h2 id="v3-priorities">Chosen for {date === calendarToday ? 'today' : dateLabel(date, calendarToday)}</h2><button type="button" className="text-button" onClick={() => onChangePlan(date)}>Plan</button></div>
      {openSelected.length > 0 && <ul className="v3-task-list">{openSelected.map(entry => <TaskRow key={entry.task.id} entry={entry} zone={zone} today={calendarToday} recordedMinutes={sessionMinutes(entry.task.id)} disabled={actions.busy}
        onOpen={actions.details} onStart={item => actions.start({ kind: 'task', taskId: item.task.id })} onPause={item => item.session && actions.pause(item.session.id)} onComplete={item => actions.complete(item.task)}/>)}</ul>}
      {finishedSelection.length > 0 && <ul className="v3-done-list">{finishedSelection.map(task => <li key={task.id}><CheckCircle2 size={15} aria-hidden="true"/><span>{task.title}</span><small>{task.status === 'complete' ? 'Done' : 'Partly done, remaining work continues'}</small></li>)}</ul>}
      {!storedSelection.length && <p className="v3-hint">Nothing is chosen yet. Choosing is optional and needs no times.</p>}
      {collections.today.other.length > 0 && <>
        <h3 className="v3-subhead">Other work for today</h3>
        <ul className="v3-task-list">{collections.today.other.map(entry => <TaskRow key={entry.task.id} entry={entry} zone={zone} today={calendarToday} recordedMinutes={sessionMinutes(entry.task.id)} disabled={actions.busy}
          onOpen={actions.details} onStart={item => actions.start({ kind: 'task', taskId: item.task.id })} onPause={item => item.session && actions.pause(item.session.id)} onComplete={item => actions.complete(item.task)}/>)}</ul>
      </>}
      {capacity && <CapacitySummary capacity={capacity} compact onChooseWindow={() => onChangePlan(date)}/>}
    </section>

    {(conflicted.length > 0 || needResult.length > 0 || reminders.length > 0 || expired.length > 0 || lost.length > 0) && <section className="v3-section" aria-labelledby="v3-attention">
      <h2 id="v3-attention">Needs a decision</h2>
      <div className="v3-attention-list">
        {conflicted.map(block => <CommitmentRow key={`conflict-${block.id}`} block={block} flexibility={blockFlexibility(block)} zone={zone} today={calendarToday} conflicts={conflictsFor(block)} onOpen={() => go('schedule')} onReviewConflict={() => go('schedule')}/>)}
        {needResult.slice(0, 3).map(block => <button type="button" className="v3-attention-row" key={block.id} onClick={() => actions.resolveBlock(block)}><span><strong>{block.title}</strong><small>Ended {recordDate(block.end, zone) === calendarToday ? '' : `${dateLabel(recordDate(block.end, zone), calendarToday)} `}{timeLabel(block.end)} · no result recorded</small></span></button>)}
        {needResult.length > 3 && <button type="button" className="text-button" onClick={() => go('schedule')}>{needResult.length - 3} more without a result</button>}
        {reminders.map(reminder => <div className="v3-attention-row" key={reminder.id}><span><strong>{reminder.title}</strong><small>{reminder.body}</small></span><button type="button" className="icon-button" aria-label={`Dismiss ${reminder.title}`} onClick={() => run({ type: 'reminder.save', reminder: { ...reminder, dismissed: true } })}><X size={16} aria-hidden="true"/></button></div>)}
        {expired.map(envelope => <button type="button" className="v3-attention-row" key={envelope.id} onClick={() => go('money', envelope.area)}><Wallet size={17} aria-hidden="true"/><span><strong>{envelope.title} · {money(envelope.amount)}</strong><small>Expired {recordDate(envelope.expiresAt, zone)} at {timeLabel(envelope.expiresAt)} · choose what happens</small></span></button>)}
        {lost.map(ledger => <button type="button" className="v3-attention-row" key={ledger.area} onClick={() => go('money', ledger.area)}><Wallet size={17} aria-hidden="true"/><span><strong>{money(ledger.lost)} in {ledger.area} Lost / Charity</strong><small>Waiting for you to mark it handled</small></span></button>)}
      </div>
    </section>}

    <section className="v3-section v3-supporting" aria-labelledby="v3-supporting">
      <h2 id="v3-supporting">Also today</h2>
      <p className="v3-weather"><MapPin size={14} aria-hidden="true"/>
        {locations.length ? <select aria-label="Forecast location" value={locationId} onChange={event => setLocationId(event.target.value)}>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select> : <button type="button" className="text-button" onClick={() => go('weather')}>Add a weather location</button>}
        <span>{weatherError || (weather ? `${weather.temperature == null ? '—' : `${Math.round(weather.temperature)}°`} · ${weather.shortForecast}${weather.stale ? ' · saved forecast' : ''}` : locationId ? 'Loading forecast…' : '')}</span>
      </p>
      {weather && <p className="v3-hint">{weather.attribution} · updated {weather.fetchedAt ? timeLabel(weather.fetchedAt) : 'not yet'}</p>}
      <div className="v3-link-grid">
        <button type="button" onClick={() => go('health')}><span>Steps</span><strong>{steps?.toLocaleString() ?? '—'}</strong></button>
        <button type="button" onClick={() => go('health')}><span>Sleep</span><strong>{sleep?.duration != null ? `${Math.floor(sleep.duration / 60)}h ${sleep.duration % 60}m` : '—'}</strong></button>
        <button type="button" onClick={() => go('money')}><span>Active envelopes</span><strong>{envelopes.length}</strong></button>
        <button type="button" onClick={() => go('reminders')}><span>Reminders</span><strong>{state.reminders.filter(r => !r.archived && !r.dismissed).length}</strong></button>
      </div>
      {goals.length > 0 && <ul className="v3-goal-list">{goals.map(goal => <li key={goal.id}><button type="button" onClick={() => go('goals')}><span>{goal.title}<small>Target {goal.targetDate}</small></span><b>{goalProgress(state, goal.id).percent}%</b></button></li>)}</ul>}
      <button type="button" className="text-button" onClick={() => go('missing')}>Review missing data</button>
    </section>
  </div>;
}
