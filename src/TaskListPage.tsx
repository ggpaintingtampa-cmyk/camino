import { useState } from 'react';
import { CheckCircle2, Clock3, Search } from 'lucide-react';
import type { TaskView, TaskViewEntry } from '../shared/contracts';
import { dateKey } from '../shared/dates';
import { openDay } from '../shared/domain-core';
import { taskCollections } from '../shared/planning';
import { recordedMinutes, unfinishedSessions } from '../shared/sessions';
import type { Task } from '../shared/types';
import { dateLabel, estimateLabel } from './components/format';
import type { TaskActions } from './components/taskActions';
import { TaskRow } from './components/TaskRow';
import { QuickCapture } from './planning/QuickCapture';
import { Empty, type PageProps } from './ui';

export interface TaskListPageProps extends PageProps {
  actions: TaskActions;
  initialView?: TaskView;
  onViewChange?: (view: TaskView) => void;
}

const VIEWS: { id: TaskView; label: string }[] = [{ id: 'all', label: 'All' }, { id: 'today', label: 'Today' }, { id: 'later', label: 'Later' }];
const matchesText = (task: Task, query: string) => !query || [task.title, task.notes, task.firstAction ?? '', task.doneWhen ?? '', ...task.labels].join('\n').toLocaleLowerCase().includes(query);

/** One task collection in three views. A scheduled open task stays in All. */
export function TaskListPage({ state, now, run, actions, initialView = 'all', onViewChange }: TaskListPageProps) {
  const zone = state.settings.timezone;
  const today = dateKey(now, zone);
  const date = openDay(state)?.date ?? today;
  const [view, setView] = useState<TaskView>(initialView);
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState<'All' | Task['tag']>('All');
  const query = search.trim().toLocaleLowerCase();
  const collections = taskCollections(state, date, now);
  const keep = (entry: TaskViewEntry) => (tag === 'All' || entry.task.tag === tag) && matchesText(entry.task, query);
  const sessions = unfinishedSessions(state);
  const minutesFor = (taskId: string) => { const session = sessions.find(candidate => candidate.target.kind === 'task' && candidate.target.taskId === taskId); return session ? recordedMinutes(session, now) : undefined; };
  const goalTitle = (task: Task) => task.goalId ? state.goals.find(goal => goal.id === task.goalId)?.title : undefined;
  const rows = (entries: TaskViewEntry[]) => <ul className="v3-task-list">{entries.map(entry => <TaskRow key={entry.task.id} entry={entry} zone={zone} today={today} recordedMinutes={minutesFor(entry.task.id)} goalTitle={goalTitle(entry.task)} disabled={actions.busy}
    onOpen={actions.details} onStart={item => actions.start({ kind: 'task', taskId: item.task.id })} onPause={item => item.session && actions.pause(item.session.id)} onComplete={item => actions.complete(item.task)}/>)}</ul>;
  const choose = (next: TaskView) => { setView(next); onViewChange?.(next); };

  const selected = collections.today.selected.filter(keep), other = collections.today.other.filter(keep);
  const all = collections.all.filter(keep), later = collections.later.filter(keep);
  const filtered = !!query || tag !== 'All';
  const nothing = filtered ? 'No open task matches this search.' : undefined;

  // An explicit outcome dates a finished task. Older records have none, and no day is invented for them.
  const outcomeAt = (task: Task) => state.taskOutcomes.filter(outcome => outcome.taskId === task.id && outcome.kind !== 'reopen').sort((a, b) => b.at.localeCompare(a.at))[0]?.at;
  const finished = state.tasks.filter(task => !task.archived && task.status !== 'open' && (tag === 'All' || task.tag === tag) && matchesText(task, query));
  const finishedToday = finished.filter(task => { const at = outcomeAt(task); return !!at && dateKey(at, zone) === today; });
  const finishedEarlier = finished.filter(task => !finishedToday.includes(task));
  const finishedRow = (task: Task) => {
    const remaining = state.tasks.find(candidate => candidate.id === task.remainingTaskId);
    const at = outcomeAt(task);
    return <li className="v3-finished-row" key={task.id}>
      <button type="button" className="v3-task-main" onClick={() => actions.details(task.id)} aria-label={`Open ${task.title}`}>
        <span className="v3-task-title">{task.title}</span>
        <span className="v3-task-facts"><span className="v3-fact">{task.status === 'complete' ? <><CheckCircle2 size={13} aria-hidden="true"/>Done</> : <><Clock3 size={13} aria-hidden="true"/>{remaining?.archived ? 'Partly done · follow-up archived' : remaining?.status === 'open' ? `Partly done · ${estimateLabel(remaining.duration)} remaining` : remaining?.status === 'complete' ? 'Partly done · follow-up done' : 'Partly done'}</>}</span>
          <span className="v3-fact">{at ? dateLabel(dateKey(at, zone), today) : 'Completion day not recorded'}</span></span>
      </button>
      <div className="v3-task-actions"><button type="button" disabled={actions.busy} aria-label={`Archive ${task.title}`} onClick={() => run({ type: 'record.archive', collection: 'tasks', id: task.id, archived: true })}>Archive</button></div>
    </li>;
  };

  return <section className="v3-tasks">
    <header className="v3-page-heading"><h1>Tasks</h1></header>
    <QuickCapture run={run} onAddDetails={actions.details} onPlan={taskId => { const task = state.tasks.find(candidate => candidate.id === taskId); if (task) actions.plan(task); }}/>

    <div className="v3-filter-bar">
      <div className="v3-tabs" role="group" aria-label="Task view">
        {VIEWS.map(({ id, label }) => <button type="button" key={id} aria-pressed={view === id} className={view === id ? 'selected' : ''} onClick={() => choose(id)}>{label} <span className="v3-count">{collections.counts[id]}</span></button>)}
      </div>
      <label className="v3-search"><Search size={16} aria-hidden="true"/><span className="sr-only">Search tasks</span><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search title, guidance, notes"/></label>
      <div className="v3-chip-row" role="group" aria-label="Area">
        {(['All', 'Personal', 'Work'] as const).map(value => <button type="button" key={value} aria-pressed={tag === value} className={tag === value ? 'selected' : ''} onClick={() => setTag(value)}>{value === 'All' ? 'Any area' : value}</button>)}
      </div>
    </div>

    {view === 'all' && (all.length ? rows(all) : <Empty>{nothing ?? 'No open tasks. Add one above whenever something comes up.'}</Empty>)}
    {view === 'today' && <>
      <h2 className="v3-subhead">Chosen priorities</h2>
      {selected.length ? rows(selected) : <p className="v3-hint">{nothing ?? 'Nothing is chosen for today yet.'}</p>}
      <h2 className="v3-subhead">Other work for today</h2>
      {other.length ? rows(other) : <p className="v3-hint">{nothing ?? 'No other task is intended or booked for today.'}</p>}
    </>}
    {view === 'later' && (later.length ? rows(later) : <Empty>{nothing ?? 'Nothing is waiting for later.'}</Empty>)}

    <details className="v3-finished">
      <summary>Finished tasks ({finished.length})</summary>
      <h2 className="v3-subhead">Finished today</h2>
      {finishedToday.length ? <ul className="v3-task-list">{finishedToday.map(finishedRow)}</ul> : <p className="v3-hint">Tasks you finish today appear here.</p>}
      {finishedEarlier.length > 0 && <><h2 className="v3-subhead">Earlier</h2><ul className="v3-task-list">{finishedEarlier.map(finishedRow)}</ul></>}
      {finished.some(task => task.status === 'complete') && <button type="button" className="text-button" disabled={actions.busy} onClick={async () => { if (!window.confirm('Archive every finished task shown here? History is kept.')) return; for (const task of finished.filter(item => item.status === 'complete')) if (!await run({ type: 'record.archive', collection: 'tasks', id: task.id, archived: true })) break; }}>Archive finished tasks</button>}
    </details>
  </section>;
}
