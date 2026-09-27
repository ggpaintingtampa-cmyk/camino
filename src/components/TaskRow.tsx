import { CalendarClock, Check, ChevronRight, Flag, Pause, Play } from 'lucide-react';
import type { TaskViewEntry } from '../../shared/contracts';
import { dateKey } from '../../shared/dates';
import { dateLabel, deadlineLabel, estimateLabel, minutesLabel, rangeLabel } from './format';

export interface TaskRowActions {
  onOpen: (taskId: string) => void;
  /** Start or resume recording. The row decides the label from the session state. */
  onStart?: (entry: TaskViewEntry) => void;
  onPause?: (entry: TaskViewEntry) => void;
  onComplete?: (entry: TaskViewEntry) => void;
}
export interface TaskRowProps extends TaskRowActions {
  entry: TaskViewEntry;
  zone: string;
  /** Owner-local date the list is shown for. */
  today: string;
  /** Recorded minutes of the task's unfinished session, when it has one. */
  recordedMinutes?: number;
  goalTitle?: string;
  disabled?: boolean;
}

/** One task's intent, estimate and state in words, with its direct actions. */
export function TaskRow({ entry, zone, today, recordedMinutes, goalTitle, disabled = false, onOpen, onStart, onPause, onComplete }: TaskRowProps) {
  const { task, booking, session } = entry;
  const running = session?.state === 'running';
  const paused = session?.state === 'paused';
  const facts: { key: string; text: string; tone?: 'gold' | 'warning' }[] = [];
  if (running) facts.push({ key: 'session', text: `Recording · ${minutesLabel(recordedMinutes ?? 0)} so far`, tone: 'gold' });
  else if (paused) facts.push({ key: 'session', text: `Paused · ${minutesLabel(recordedMinutes ?? 0)} recorded` });
  if (entry.main) facts.push({ key: 'main', text: 'Main priority', tone: 'gold' });
  else if (entry.selected) facts.push({ key: 'selected', text: 'Chosen for today' });
  if (booking) facts.push({ key: 'booking', text: `Booked ${dateLabel(dateKey(booking.start, zone), today)} ${rangeLabel(booking.start, booking.end, zone)}` });
  else if (task.preferredDay) facts.push({ key: 'preferred', text: `Intended for ${dateLabel(task.preferredDay, today)}` });
  if (task.deadline) facts.push({ key: 'deadline', text: `${deadlineLabel(task.deadline, zone, today)}${entry.deadlineStatus === 'overdue' ? ' · overdue' : ''}`, tone: entry.deadlineStatus === 'overdue' ? 'warning' : undefined });
  facts.push({ key: 'estimate', text: estimateLabel(task.duration) });
  if (goalTitle) facts.push({ key: 'goal', text: `Goal: ${goalTitle}` });
  return <li className={`v3-task-row${running ? ' is-running' : ''}${paused ? ' is-paused' : ''}`}>
    <button type="button" className="v3-task-main" onClick={() => onOpen(task.id)} aria-label={`Open ${task.title}`}>
      <span className="v3-task-title">{task.title}</span>
      {task.firstAction && <span className="v3-task-first">First: {task.firstAction}</span>}
      <span className="v3-task-facts">{facts.map(fact => <span key={fact.key} className={fact.tone ? `v3-fact v3-fact-${fact.tone}` : 'v3-fact'}>
        {fact.key === 'booking' && <CalendarClock size={13} aria-hidden="true"/>}{fact.key === 'deadline' && <Flag size={13} aria-hidden="true"/>}{fact.text}
      </span>)}</span>
      <ChevronRight className="v3-task-chevron" size={18} aria-hidden="true"/>
    </button>
    <div className="v3-task-actions">
      {running && onPause && <button type="button" disabled={disabled} onClick={() => onPause(entry)} aria-label={`Pause ${task.title}`}><Pause size={16} aria-hidden="true"/>Pause</button>}
      {!running && onStart && <button type="button" disabled={disabled} onClick={() => onStart(entry)} aria-label={`${paused ? 'Resume' : 'Start'} ${task.title}`}><Play size={16} aria-hidden="true"/>{paused ? 'Resume' : 'Start'}</button>}
      {onComplete && <button type="button" disabled={disabled} onClick={() => onComplete(entry)} aria-label={`Mark ${task.title} done`}><Check size={16} aria-hidden="true"/>Done</button>}
    </div>
  </li>;
}
