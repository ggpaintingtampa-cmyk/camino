import type { Block, State, Task } from './types';
import { dateKey } from './dates';

export function goalProgress(state: State, id: string): { completed: number; total: number; percent: number } {
  const visited = new Set<string>();
  function count(goalId: string): { completed: number; total: number } {
    if (visited.has(goalId)) return { completed: 0, total: 0 };
    visited.add(goalId);
    const goal = state.goals.find(g => g.id === goalId);
    if (!goal || goal.archived || goal.status === 'archived') return { completed: 0, total: 0 };
    const children = state.goals.filter(g => g.parentId === goalId && !g.archived && g.status !== 'archived');
    if (!children.length) return { completed: goal.checked || goal.status === 'completed' ? 1 : 0, total: 1 };
    return children.map(g => count(g.id)).reduce((a, b) => ({ completed: a.completed + b.completed, total: a.total + b.total }), { completed: 0, total: 0 });
  }
  const result = count(id);
  return { ...result, percent: result.total ? Math.round(100 * result.completed / result.total) : 0 };
}

export function unscheduledTasks(state: State): Task[] {
  return state.tasks.filter(task => !task.archived && task.status === 'open' && !state.blocks.some(block => !block.archived && block.taskId === task.id && block.status === 'pending'));
}

export function overlaps(state: State, block: Pick<Block, 'id' | 'start' | 'end'>): Block[] {
  return state.blocks.filter(other => !other.archived && !['cancelled', 'missed'].includes(other.status) && other.id !== block.id && Date.parse(other.start) < Date.parse(block.end) && Date.parse(other.end) > Date.parse(block.start));
}

/** Steps are a cumulative calendar-day total, never a sum of readings. */
export function dailySteps(state: State, date: string): number | undefined {
  return state.logs
    .filter(log => !log.archived && log.kind === 'steps' && dateKey(log.at, state.settings.timezone) === date)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0]?.value;
}

export interface MissingItem { key: 'start' | 'sleep' | 'weight' | 'steps' | 'food' | 'mood' | 'energy' | 'journal'; label: string }
export function missingItems(state: State, date: string): MissingItem[] {
  const day = state.days.find(d => d.date === date && !d.archived);
  const logs = state.logs.filter(l => !l.archived && dateKey(l.kind === 'sleep' && l.end ? l.end : l.at, state.settings.timezone) === date);
  const items: MissingItem[] = [];
  if (!day?.startedAt) items.push({ key: 'start', label: 'Wake time' });
  for (const [key, label] of [['sleep', 'Sleep'], ['weight', 'Weight'], ['steps', 'Steps'], ['food', 'Food']] as const) {
    if (!logs.some(log => log.kind === key)) items.push({ key, label });
  }
  if (!day?.mood) items.push({ key: 'mood', label: 'Mood' });
  if (!day?.energy) items.push({ key: 'energy', label: 'Energy' });
  if (!day?.journal.trim()) items.push({ key: 'journal', label: 'Journal entry' });
  return items;
}
