import type { ErrorDetails } from './contracts';
import type { Base, Block, Day, Flexibility, Goal, State, Task } from './types';
import { dateKey, minuteOfDay } from './dates';
import { goalProgress } from './selectors';

export class DomainError extends Error {
  readonly statusCode: number;
  constructor(message: string, public readonly code = 'INVALID_COMMAND', public readonly status = 400, public readonly details?: ErrorDetails) {
    super(message); this.name = 'DomainError'; this.statusCode = status;
  }
}

/** One command works on one cloned state with one trusted command time. */
export interface CommandContext { state: State; now: string }

export function fail(message: string, code = 'INVALID_COMMAND', status = 400, details?: ErrorDetails): never { throw new DomainError(message, code, status, details); }
export function find<T extends { id: string }>(list: T[], id: string): T {
  const record = list.find(item => item.id === id);
  if (!record) fail('This record could not be found. Refresh and try again.', 'NOT_FOUND', 404);
  return record;
}
export function live<T extends Base>(list: T[], id: string): T {
  const record = find(list, id);
  if (record.archived) fail('Restore this record before changing it.', 'ARCHIVED', 409);
  return record;
}
export function createBase(now: string, id?: string): Base { return { id: id || crypto.randomUUID(), createdAt: now, updatedAt: now }; }
export function upsert<T extends Base>(list: T[], draft: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }, now: string): T {
  const old = draft.id ? list.find(item => item.id === draft.id) : undefined;
  const record = { ...draft, ...createBase(now, draft.id), createdAt: old?.createdAt || now } as T;
  if (old) list[list.indexOf(old)] = record; else list.push(record);
  return record;
}
export function bump(record: Base, now: string) { record.updatedAt = now; }
/** Declared in the contract, accepted by the schema, not yet delivered by its phase. Never a silent no-op. */
export function notImplemented(type: string): never { fail(`${type} is not available in this build yet.`, 'NOT_IMPLEMENTED', 501); }

/** Effective role of an entry. Never decided by kind alone once the owner has set one. */
export function blockFlexibility(block: Pick<Block, 'kind' | 'flexibility'>): Flexibility {
  return block.flexibility ?? (block.kind === 'appointment' ? 'fixed' : 'flexible');
}
/** The one explicitly open day: started, not ended, not archived. Yesterday's still-open day counts. */
export function openDay(state: State): Day | undefined {
  const open = state.days.filter(day => !day.archived && !!day.startedAt && !day.endedAt);
  return open.length === 1 ? open[0] : undefined;
}
export function isInDay(state: State, day: Day, instant: string, now: string): boolean {
  return dateKey(instant, state.settings.timezone) === day.date ||
    (!!day.startedAt && Date.parse(instant) >= Date.parse(day.startedAt) && Date.parse(instant) <= Date.parse(day.endedAt || now));
}
/** The task's one live pending booking. */
export function pendingBooking(state: State, taskId: string, exceptId?: string): Block | undefined {
  return state.blocks.find(b => !b.archived && b.taskId === taskId && b.status === 'pending' && b.id !== exceptId);
}
export function validateSchedule(state: State, start: string, end: string, code = 'INVALID_COMMAND') {
  for (const instant of [start, end]) {
    const ms = Date.parse(instant);
    if (ms % 60000 !== 0 || minuteOfDay(instant, state.settings.timezone) % 5 !== 0) fail('Schedule times use five-minute increments.', code);
  }
  if (Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > 86400000) fail('A block must last between five minutes and 24 hours.', code);
}

export function syncGoalFromTask(state: State, task: Task, now: string) {
  if (!task.goalId || task.status !== 'complete') return;
  const goal = state.goals.find(g => g.id === task.goalId && !g.archived && g.status !== 'archived');
  if (goal && !state.goals.some(g => g.parentId === goal.id && !g.archived && g.status !== 'archived')) {
    if (state.tasks.some(t => !t.archived && t.goalId === goal.id && t.status === 'open')) return;
    goal.checked = true; goal.status = 'completed'; bump(goal, now);
    syncGoalAncestors(state, goal.id, now);
  }
}
export function refreshGoal(state: State, goal: Goal, now: string) {
  if (!goal.archived && goal.status !== 'archived') {
    const progress = goalProgress(state, goal.id);
    goal.checked = progress.total > 0 && progress.completed === progress.total;
    if (goal.checked) goal.status = 'completed';
    else if (goal.status === 'completed') goal.status = 'active';
    bump(goal, now);
  }
}
export function syncGoalAncestors(state: State, id: string, now: string) {
  let ancestor = state.goals.find(g => g.id === id)?.parentId;
  const seen = new Set<string>();
  while (ancestor && !seen.has(ancestor)) {
    seen.add(ancestor);
    const goal = find(state.goals, ancestor);
    refreshGoal(state, goal, now);
    ancestor = goal.parentId;
  }
}
