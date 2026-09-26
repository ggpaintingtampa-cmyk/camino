import { describe, expect, it } from 'vitest';
import { applyCommand, initialState, summaryForDay } from '../shared/domain';
import { dailySteps, goalProgress, unscheduledTasks } from '../shared/selectors';
import type { Command, State } from '../shared/types';

const instant = '2026-09-18T16:00:00.000Z';
function apply(state: State, command: Command, now = instant) { return applyCommand(state, command, now); }
const newTask = (id: string, goalId?: string) => ({ id, title: id, goalId, tag: 'Personal' as const, notes: '', duration: 30, labels: [], status: 'open' as const });
const newGoal = (id: string, parentId?: string, checked = false) => ({ id, title: id, parentId, targetDate: '2026-12-31', notes: '', pinned: false, checked, status: 'active' as const });
const newBlock = (id: string, taskId?: string, start = '2026-09-18T16:00:00.000Z') => ({ id, taskId, title: id, kind: 'task' as const, tag: 'Personal' as const, start, end: new Date(Date.parse(start) + 1800000).toISOString(), notes: '', status: 'pending' as const });

describe('day and schedule recovery', () => {
  it('closing a day started at noon returns earlier unfinished scheduled tasks too', () => {
    let state = apply(initialState(), { type: 'block.save', block: newBlock('before-wake', undefined, '2026-09-18T12:00:00Z') });
    state = apply(state, { type: 'day.start', date: '2026-09-18', wakeAt: instant });
    state = apply(state, { type: 'day.end', id: state.days[0].id });
    expect(state.blocks[0].status).toBe('missed');
    expect(unscheduledTasks(state)).toHaveLength(1);
  });
  it('a current-day journal can become an active day without losing prose or fabricating sleep', () => {
    let state = apply(initialState(), { type: 'day.save', date: '2026-09-18', summary: 'Draft facts', journal: 'Before getting up' });
    expect(state.days[0].endedAt).toBe(instant);
    state = apply(state, { type: 'day.start', date: '2026-09-18', wakeAt: '2026-09-18T16:15:00Z' }, '2026-09-18T16:15:00Z');
    expect(state.days).toHaveLength(1); expect(state.days[0].endedAt).toBeUndefined();
    expect(state.days[0].journal).toBe('Before getting up'); expect(state.logs).toHaveLength(0);
  });
  it('requires explicit reopening and preserves the original wake, check-in and writing', () => {
    let state = apply(initialState(), { type: 'day.start', date: '2026-09-18', wakeAt: '2026-09-18T11:00:00Z', mood: 4, note: 'Morning' });
    const id = state.days[0].id;
    state = apply(state, { type: 'day.end', id, journal: 'My own words.' });
    state = apply(state, { type: 'day.start', date: '2026-09-18', wakeAt: '2026-09-18T12:00:00Z', mood: 1, note: 'Should not overwrite' });
    expect(state.days[0]).toMatchObject({ startedAt: '2026-09-18T11:00:00.000Z', mood: 4, note: 'Morning', endedAt: instant });
    state = apply(state, { type: 'day.reopen', id });
    expect(state.days[0].endedAt).toBeUndefined();
    expect(state.days[0].journal).toBe('My own words.');
    expect(state.days[0].startedAt).toBe('2026-09-18T11:00:00.000Z');
  });
  it('normalizes offset dates and times into UTC before storage', () => {
    const state = apply(initialState(), { type: 'block.save', block: newBlock('normalized', undefined, '2026-09-18T12:00:00-04:00') });
    expect(state.blocks[0].start).toBe(instant);
  });
  it('an invalid partial schedule rolls back every proposed linked-task mutation', () => {
    const state = apply(initialState(), { type: 'block.save', block: newBlock('focus') });
    expect(() => apply(state, { type: 'block.resolve', id: 'focus', outcome: 'partial', remainingDuration: 15, remainingStart: '2026-09-18T16:32:00Z' })).toThrow(/five-minute/);
    expect(state.tasks).toHaveLength(1); expect(state.tasks[0].remainingTaskId).toBeUndefined(); expect(state.blocks[0].status).toBe('pending');
  });
  it('archiving an active task ends its actual timer and releases the active-task lock', () => {
    let state = apply(initialState(), { type: 'block.save', block: newBlock('first') });
    state = apply(state, { type: 'block.start', id: 'first' });
    state = apply(state, { type: 'record.archive', collection: 'tasks', id: state.tasks[0].id, archived: true }, '2026-09-18T16:10:00Z');
    expect(state.blocks[0]).toMatchObject({ status: 'cancelled', actualEnd: '2026-09-18T16:10:00.000Z' });
    state = apply(state, { type: 'block.save', block: newBlock('second') });
    state = apply(state, { type: 'block.start', id: 'second' });
    expect(state.blocks[1].actualStart).toBe(instant);
  });
  it('a task cannot gain two pending schedule blocks even if they do not overlap', () => {
    let state = apply(initialState(), { type: 'task.save', task: newTask('work') });
    state = apply(state, { type: 'block.save', block: newBlock('first', 'work') });
    expect(() => apply(state, { type: 'block.save', block: newBlock('second', 'work', '2026-09-19T16:00:00Z') })).toThrow(/already has/);
  });
});

describe('goal and archive relationships', () => {
  it('one of several tasks linked to a goal does not complete that goal prematurely', () => {
    let state = apply(initialState(), { type: 'goal.save', goal: newGoal('leaf') });
    state = apply(state, { type: 'task.save', task: newTask('a', 'leaf') });
    state = apply(state, { type: 'task.save', task: newTask('b', 'leaf') });
    state = apply(state, { type: 'task.save', task: { ...newTask('a', 'leaf'), status: 'complete' } });
    expect(goalProgress(state, 'leaf').percent).toBe(0);
    state = apply(state, { type: 'task.save', task: { ...newTask('b', 'leaf'), status: 'complete' } });
    expect(goalProgress(state, 'leaf').percent).toBe(100);
  });
  it('a partial original cannot be completed independently of its remaining task', () => {
    let state = apply(initialState(), { type: 'block.save', block: newBlock('original') });
    state = apply(state, { type: 'block.resolve', id: 'original', outcome: 'partial', remainingDuration: 10 });
    const original = state.tasks[0];
    expect(() => apply(state, { type: 'task.save', task: { ...newTask(original.id), remainingTaskId: original.remainingTaskId, status: 'complete' } })).toThrow(/remaining task/);
  });
  it('reopening a leaf resets completed ancestor status and checked state', () => {
    let state = apply(initialState(), { type: 'goal.save', goal: newGoal('parent') });
    state = apply(state, { type: 'goal.save', goal: newGoal('child', 'parent', true) });
    expect(state.goals[0]).toMatchObject({ checked: true, status: 'completed' });
    state = apply(state, { type: 'goal.save', goal: newGoal('child', 'parent', false) });
    expect(state.goals[0]).toMatchObject({ checked: false, status: 'active' });
  });
  it('archived goal context can stay on an existing task, while new links are rejected', () => {
    let state = apply(initialState(), { type: 'goal.save', goal: newGoal('parent') });
    state = apply(state, { type: 'goal.save', goal: newGoal('leaf', 'parent') });
    state = apply(state, { type: 'task.save', task: newTask('existing', 'leaf') });
    state = apply(state, { type: 'record.archive', collection: 'goals', id: 'parent', archived: true });
    state = apply(state, { type: 'task.save', task: { ...newTask('existing', 'leaf'), notes: 'Still editable' } });
    expect(state.tasks[0].notes).toBe('Still editable');
    expect(() => apply(state, { type: 'task.save', task: newTask('new', 'leaf') })).toThrow(/Restore/);
    expect(() => apply(state, { type: 'record.archive', collection: 'goals', id: 'leaf', archived: false })).toThrow(/parent/);
  });
  it('restoring a former steps record cannot create two totals for one day', () => {
    const stepLog = { kind: 'steps' as const, at: instant, value: 1000, category: '', description: '', notes: '' };
    let state = apply(initialState(), { type: 'log.save', log: stepLog });
    const id = state.logs[0].id;
    state = apply(state, { type: 'record.archive', collection: 'logs', id, archived: true });
    state = apply(state, { type: 'log.save', log: { ...stepLog, value: 2000 } });
    expect(() => apply(state, { type: 'record.archive', collection: 'logs', id, archived: false })).toThrow(/already has/);
  });
  it('keeps cumulative daily steps separate across an open day’s midnight boundary', () => {
    let state = apply(initialState(), { type: 'day.start', date: '2026-09-18' });
    const dayId = state.days[0].id;
    const base = { kind: 'steps' as const, category: '', description: '', notes: '' };
    state = apply(state, { type: 'log.save', log: { ...base, at: '2026-09-19T03:30:00Z', value: 4000 } }, '2026-09-19T03:30:00Z');
    state = apply(state, { type: 'log.save', log: { ...base, at: '2026-09-19T03:55:00Z', value: 5000 } }, '2026-09-19T03:55:00Z');
    state = apply(state, { type: 'log.save', log: { ...base, at: '2026-09-19T04:10:00Z', value: 200 } }, '2026-09-19T04:10:00Z');
    state = apply(state, { type: 'day.end', id: dayId }, '2026-09-19T05:00:00Z');
    expect(dailySteps(state, '2026-09-18')).toBe(5000);
    expect(dailySteps(state, '2026-09-19')).toBe(200);
    expect(dailySteps(state, '2026-09-20')).toBeUndefined();
    const summary = summaryForDay(state, dayId);
    expect(summary).toContain('Steps recorded: 5,000.');
    expect(summary).toContain('Steps recorded for 2026-09-19: 200.');
    expect(summary).not.toContain('5,200');
    expect(summary).not.toContain('9,000');
  });
});

describe('money reconciliation and history', () => {
  it('does not partially handle a charity obligation after a contradictory manual adjustment', () => {
    let state = apply(initialState(), { type: 'ledger.adjust', area: 'personal', account: 10000, cash: 10000, earned: 0, lost: 0, reason: 'Initial' });
    state = apply(state, { type: 'envelope.create', envelope: { id: 'commitment', area: 'personal', title: 'Commitment', amount: 10000, purpose: 'Gym', expiresAt: '2026-09-18T15:00:00Z', notes: '' } });
    state = apply(state, { type: 'envelope.resolve', id: 'commitment', outcome: 'lost' });
    state = apply(state, { type: 'ledger.adjust', area: 'personal', account: 10000, cash: 0, earned: 0, lost: 0, reason: 'Deliberate discrepancy to review' });
    const length = state.adjustments.length;
    expect(() => apply(state, { type: 'envelope.resolve', id: 'commitment', outcome: 'handled' })).toThrow(/invalid money/);
    expect(state.envelopes[0].status).toBe('lost'); expect(state.ledgers[0].account).toBe(10000); expect(state.adjustments).toHaveLength(length);
  });
  it('prevents envelope identifier reuse from consuming cash again', () => {
    let state = apply(initialState(), { type: 'ledger.adjust', area: 'personal', account: 100000, cash: 100000, earned: 0, lost: 0, reason: 'Initial' });
    const envelope = { id: 'commitment', area: 'personal' as const, title: 'Commitment', amount: 10000, purpose: 'Gym', expiresAt: instant, notes: '' };
    state = apply(state, { type: 'envelope.create', envelope });
    expect(() => apply(state, { type: 'envelope.create', envelope })).toThrow(/already exists/);
    expect(state.ledgers[0].cash).toBe(90000);
  });
});
