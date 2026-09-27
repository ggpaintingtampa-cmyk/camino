import { blockFlexibility, clipInterval, isPositionedLive, localDayRange } from './capacity';
import type { DeadlineStatus, NextCommitment, TaskCollections, TaskView, TaskViewEntry } from './contracts';
import { dateKey } from './dates';
import { notImplemented, type CommandContext } from './domain-core';
import type { Block, Command, DayPlan, State, Task } from './types';

export type PlanningCommand = Extract<Command, { type: 'dayPlan.save' | 'task.defer' | 'task.plan' | 'plan.apply' }>;

/** Day plans, placements and reviewed plan changes. Mutates the cloned state in `context`; the caller owns the revision. */
export function applyPlanningCommand(_context: CommandContext, command: PlanningCommand): void {
  notImplemented(command.type);
}

// ── Selectors ───────────────────────────────────────────────────────────────
const ms = (instant: string) => Date.parse(instant);

/** Every live task that is still open, scheduled or not. */
export function openTasks(state: State): Task[] { return state.tasks.filter(task => !task.archived && task.status === 'open'); }
export function dayPlanForDate(state: State, date: string): DayPlan | undefined { return state.dayPlans.find(plan => plan.date === date && !plan.archived); }
/** The date's zone: the plan's own when a plan exists, else the settings zone. */
export function zoneForDate(state: State, date: string): string { return dayPlanForDate(state, date)?.timezone ?? state.settings.timezone; }
/** The stored selection in plan order, without archived tasks. Finished ones stay so the day remains readable. */
export function selectedTasksForDay(state: State, date: string): Task[] {
  return (dayPlanForDate(state, date)?.taskIds ?? []).map(id => state.tasks.find(task => task.id === id)).filter((task): task is Task => !!task && !task.archived);
}
export function mainTaskForDay(state: State, date: string): Task | undefined {
  const id = dayPlanForDate(state, date)?.mainTaskId;
  return id ? state.tasks.find(task => task.id === id && !task.archived) : undefined;
}
/** The task's one live pending booking, if it has one. */
export function pendingBookingForTask(state: State, taskId: string): Block | undefined {
  return state.blocks.filter(block => !block.archived && block.kind === 'task' && block.taskId === taskId && block.status === 'pending')
    .sort((a, b) => ms(a.start) - ms(b.start) || a.id.localeCompare(b.id))[0];
}

function deadlineStatus(task: Task, now: string, zone: string): DeadlineStatus | undefined {
  const deadline = task.deadline;
  if (!deadline) return undefined;
  const today = dateKey(now, zone);
  if (deadline.kind === 'date') return deadline.date < today ? 'overdue' : deadline.date === today ? 'due-today' : 'upcoming';
  if (ms(deadline.at) < ms(now)) return 'overdue';
  return dateKey(deadline.at, zone) === today ? 'due-today' : 'upcoming';
}
function unfinishedSessionOf(state: State, taskId: string): TaskViewEntry['session'] {
  const session = state.workSessions.find(candidate => !candidate.endedAt && candidate.target.kind === 'task' && candidate.target.taskId === taskId);
  return session ? { id: session.id, state: session.intervals.at(-1)?.end === undefined && session.intervals.length > 0 ? 'running' : 'paused' } : undefined;
}

/**
 * One trusted collection in three views. A task keeps its ID in every view; moving between
 * views never creates or deletes anything. A scheduled open task stays in All.
 */
export function taskCollections(state: State, date: string, now: string): TaskCollections {
  const plan = dayPlanForDate(state, date);
  const timezone = plan?.timezone ?? state.settings.timezone;
  const range = localDayRange(date, timezone);
  const order = new Map((plan?.taskIds ?? []).map((id, index) => [id, index]));
  const entries = openTasks(state).map((task): TaskViewEntry => {
    const booking = pendingBookingForTask(state, task.id);
    const session = unfinishedSessionOf(state, task.id);
    const status = deadlineStatus(task, now, timezone);
    return {
      task, selected: order.has(task.id), main: plan?.mainTaskId === task.id, preferredToday: task.preferredDay === date,
      ...(booking ? { booking } : {}), bookedToday: !!booking && !!clipInterval(booking, range),
      ...(session ? { session } : {}), ...(status ? { deadlineStatus: status } : {}), estimate: task.duration === undefined ? 'unknown' : 'known',
    };
  });
  const isToday = (entry: TaskViewEntry) => entry.selected || entry.preferredToday || entry.bookedToday;
  const byBooking = (a: TaskViewEntry, b: TaskViewEntry) => (a.bookedToday && a.booking ? ms(a.booking.start) : Infinity) - (b.bookedToday && b.booking ? ms(b.booking.start) : Infinity) || ms(a.task.createdAt) - ms(b.task.createdAt) || a.task.id.localeCompare(b.task.id);
  const byPreference = (a: TaskViewEntry, b: TaskViewEntry) => (a.task.preferredDay ?? '9999-12-31').localeCompare(b.task.preferredDay ?? '9999-12-31') || ms(a.task.createdAt) - ms(b.task.createdAt) || a.task.id.localeCompare(b.task.id);
  const selected = entries.filter(entry => entry.selected).sort((a, b) => order.get(a.task.id)! - order.get(b.task.id)!);
  const other = entries.filter(entry => !entry.selected && isToday(entry)).sort(byBooking);
  const later = entries.filter(entry => !isToday(entry)).sort(byPreference);
  return { date, timezone, all: entries, today: { selected, other }, later, counts: { all: entries.length, today: selected.length + other.length, later: later.length } };
}
export function tasksForView(state: State, view: TaskView, date: string, now: string): TaskViewEntry[] {
  const collections = taskCollections(state, date, now);
  return view === 'all' ? collections.all : view === 'later' ? collections.later : [...collections.today.selected, ...collections.today.other];
}

/** The fixed commitment to protect: one in progress, and the next to come. Preparation time is never guessed. */
export function nextFixedCommitment(state: State, now: string): NextCommitment {
  const fixed = state.blocks.filter(block => isPositionedLive(block) && block.status === 'pending' && blockFlexibility(block) === 'fixed')
    .sort((a, b) => ms(a.start) - ms(b.start) || ms(a.end) - ms(b.end) || a.id.localeCompare(b.id));
  const inProgress = fixed.find(block => ms(block.start) <= ms(now) && ms(now) < ms(block.end));
  const next = fixed.find(block => ms(block.start) > ms(now));
  return { ...(inProgress ? { inProgress } : {}), ...(next ? { next } : {}) };
}
