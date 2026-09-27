import { describe, expect, it } from 'vitest';
import { initialState } from '../shared/domain';
import { localInstant } from '../shared/dates';
import { dayPlanForDate, mainTaskForDay, nextFixedCommitment, openTasks, selectedTasksForDay, taskCollections, tasksForView } from '../shared/planning';
import { unscheduledTasks } from '../shared/selectors';
import type { Block, DayPlan, State, Task, WorkSession } from '../shared/types';

const zone = 'America/New_York';
const date = '2026-09-18';
const stamp = '2026-09-10T12:00:00.000Z';
const at = (time: string, day = date) => localInstant(day, time, zone);
const now = at('10:00');
const task = (id: string, overrides: Partial<Task> = {}): Task => ({ id, createdAt: stamp, updatedAt: stamp, title: `Synthetic ${id}`, tag: 'Work', labels: [], notes: '', status: 'open', ...overrides });
const block = (id: string, start: string, end: string, overrides: Partial<Block> = {}): Block => ({ id, createdAt: stamp, updatedAt: stamp, title: `Synthetic ${id}`, kind: 'task', tag: 'Work', start, end, notes: '', status: 'pending', ...overrides });
const plan = (overrides: Partial<DayPlan> = {}): DayPlan => ({ id: `dayplan:${date}`, createdAt: stamp, updatedAt: stamp, date, timezone: zone, taskIds: [], protectedSpareMinutes: 0, ...overrides });
const session = (id: string, taskId: string, running: boolean): WorkSession => ({ id, createdAt: stamp, updatedAt: stamp, target: { kind: 'task', taskId }, provenance: 'native', intervals: [{ start: at('09:00'), ...(running ? {} : { end: at('09:20') }), contextDate: date, timezone: zone }] });
const state = (parts: Partial<State>): State => ({ ...initialState(), ...parts });
const ids = (entries: { task: Task }[]) => entries.map(entry => entry.task.id);

describe('one task collection in three views', () => {
  const tasks = [
    task('booked-today', { duration: 30 }), task('booked-later', { duration: 30 }), task('selected-b'), task('selected-a'),
    task('preferred-today', { preferredDay: date }), task('preferred-tomorrow', { preferredDay: '2026-09-19' }), task('backlog', { createdAt: '2026-09-11T12:00:00.000Z' }),
    task('finished', { status: 'complete' }), task('partial', { status: 'partial', remainingTaskId: 'backlog' }), task('archived', { archived: true }),
  ];
  const blocks = [
    block('b-today', at('15:00'), at('15:30'), { taskId: 'booked-today' }),
    block('b-later', at('09:00', '2026-09-21'), at('09:30', '2026-09-21'), { taskId: 'booked-later' }),
    block('b-cancelled', at('11:00'), at('11:30'), { taskId: 'backlog', status: 'cancelled' }),
  ];
  const base = state({ tasks, blocks, dayPlans: [plan({ taskIds: ['selected-a', 'finished', 'selected-b'], mainTaskId: 'selected-a' })] });

  it('T03: a scheduled open task appears in All and in the view of its date', () => {
    const collections = taskCollections(base, date, now);
    expect(ids(collections.all)).toEqual(['booked-today', 'booked-later', 'selected-b', 'selected-a', 'preferred-today', 'preferred-tomorrow', 'backlog']);
    expect(ids(collections.today.other)).toContain('booked-today');
    expect(ids(collections.later)).toContain('booked-later');
    expect(collections.all.find(entry => entry.task.id === 'booked-later')).toMatchObject({ bookedToday: false, booking: { id: 'b-later' } });
    expect(ids(unscheduledTasks(base).map(found => ({ task: found })))).not.toContain('booked-today');
  });
  it('keeps selected priorities in plan order and apart from other work for the day', () => {
    const collections = taskCollections(base, date, now);
    expect(ids(collections.today.selected)).toEqual(['selected-a', 'selected-b']);
    expect(ids(collections.today.other)).toEqual(['booked-today', 'preferred-today']);
    expect(collections.today.selected[0]).toMatchObject({ selected: true, main: true, estimate: 'unknown' });
    expect(collections.today.other[0]).toMatchObject({ selected: false, bookedToday: true, estimate: 'known' });
  });
  it('puts every other open task in Later, dated intentions first then oldest first, and never calls an undated task overdue', () => {
    const collections = taskCollections(base, date, now);
    expect(ids(collections.later)).toEqual(['preferred-tomorrow', 'booked-later', 'backlog']);
    expect(collections.later.every(entry => entry.deadlineStatus === undefined)).toBe(true);
    expect(collections.counts).toEqual({ all: 7, today: 4, later: 3 });
    expect(collections.counts.today + collections.counts.later).toBe(collections.counts.all);
  });
  it('uses one task identity across views and creates nothing', () => {
    const before = structuredClone(base);
    const all = tasksForView(base, 'all', date, now), today = tasksForView(base, 'today', date, now), later = tasksForView(base, 'later', date, now);
    expect(new Set([...ids(today), ...ids(later)])).toEqual(new Set(ids(all)));
    expect(ids(today).filter(id => ids(later).includes(id))).toEqual([]);
    expect(base).toEqual(before);
  });
  it('shows running and paused work without removing the task from any view', () => {
    const working = state({ tasks, blocks, workSessions: [session('s-run', 'backlog', true), session('s-pause', 'selected-b', false), { ...session('s-old', 'booked-today', false), endedAt: at('09:30'), endReason: 'stopped' }] });
    const entries = new Map(taskCollections(working, date, now).all.map(entry => [entry.task.id, entry]));
    expect(entries.get('backlog')!.session).toEqual({ id: 's-run', state: 'running' });
    expect(entries.get('selected-b')!.session).toEqual({ id: 's-pause', state: 'paused' });
    expect(entries.get('booked-today')!.session).toBeUndefined();
  });
  it('keeps finished selections readable while actionable views skip them', () => {
    expect(selectedTasksForDay(base, date).map(found => found.id)).toEqual(['selected-a', 'finished', 'selected-b']);
    expect(mainTaskForDay(base, date)?.id).toBe('selected-a');
    expect(dayPlanForDate(base, '2026-09-19')).toBeUndefined();
    expect(selectedTasksForDay(base, '2026-09-19')).toEqual([]);
    expect(openTasks(base).map(found => found.id)).not.toContain('finished');
  });
});

describe('deadlines stay what the owner entered', () => {
  const entry = (deadline: Task['deadline'], instant = now) => taskCollections(state({ tasks: [task('t', { deadline })] }), date, instant).all[0];
  it('compares a date-only deadline by local date, never by an invented midnight', () => {
    expect(entry({ kind: 'date', date: '2026-09-17' }).deadlineStatus).toBe('overdue');
    expect(entry({ kind: 'date', date }).deadlineStatus).toBe('due-today');
    expect(entry({ kind: 'date', date }, at('23:55')).deadlineStatus).toBe('due-today');
    expect(entry({ kind: 'date', date: '2026-09-19' }).deadlineStatus).toBe('upcoming');
    expect(entry({ kind: 'date', date }).task.deadline).toEqual({ kind: 'date', date });
  });
  it('compares a timed deadline by its exact instant and keeps its zone', () => {
    expect(entry({ kind: 'instant', at: at('09:59'), timezone: zone }).deadlineStatus).toBe('overdue');
    expect(entry({ kind: 'instant', at: at('17:00'), timezone: zone }).deadlineStatus).toBe('due-today');
    expect(entry({ kind: 'instant', at: at('08:00', '2026-09-19'), timezone: 'Asia/Kathmandu' })).toMatchObject({ deadlineStatus: 'upcoming', task: { deadline: { timezone: 'Asia/Kathmandu' } } });
  });
});

describe('next fixed commitment', () => {
  const appointment = (id: string, start: string, end: string, overrides: Partial<Block> = {}) => block(id, start, end, { kind: 'appointment', ...overrides });
  it('separates the appointment in progress from the next one and ignores history and flexible work', () => {
    const blocks = [
      appointment('running', at('09:30'), at('10:30')), appointment('next', at('13:00'), at('14:00')), appointment('after', at('16:00'), at('17:00')),
      appointment('cancelled', at('11:00'), at('12:00'), { status: 'cancelled' }), appointment('attended', at('10:30'), at('11:00'), { status: 'attended' }),
      appointment('tentative', at('10:45'), at('11:15'), { flexibility: 'flexible' }), block('flexible-task', at('10:15'), at('10:45'), { taskId: 't' }),
    ];
    const result = nextFixedCommitment(state({ blocks }), now);
    expect(result.inProgress?.id).toBe('running');
    expect(result.next?.id).toBe('next');
    expect(result.preparation).toBeUndefined();
  });
  it('treats an appointment ending now as over and a fixed task placement as a commitment', () => {
    const blocks = [appointment('ended', at('09:00'), at('10:00')), block('committed', at('12:00'), at('13:00'), { taskId: 't', flexibility: 'fixed' })];
    expect(nextFixedCommitment(state({ blocks }), now)).toEqual({ next: blocks[1] });
    expect(nextFixedCommitment(state({}), now)).toEqual({});
  });
});
