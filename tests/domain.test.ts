import { describe, expect, it } from 'vitest';
import { applyCommand, DomainError, initialState, summaryForDay } from '../shared/domain';
import { addDays, dateKey, localInstant, minuteOfDay } from '../shared/dates';
import { commandEnvelopeSchema, commandSchema } from '../shared/schema';
import { goalProgress, missingItems, overlaps, unscheduledTasks } from '../shared/selectors';
import type { Block, Command, Goal, State, Task } from '../shared/types';

const now = '2026-09-18T16:00:00.000Z';
const later = '2026-09-18T18:00:00.000Z';
const task = (overrides: Partial<Task> = {}) => ({ title: 'Practice dribbles', duration: 30, tag: 'Personal' as const, labels: [], notes: '', status: 'open' as const, ...overrides });
const block = (overrides: Partial<Block> = {}) => ({ title: 'Practice dribbles', kind: 'task' as const, tag: 'Personal' as const, start: '2026-09-18T16:00:00.000Z', end: '2026-09-18T16:30:00.000Z', notes: '', status: 'pending' as const, ...overrides });
const goal = (overrides: Partial<Goal> = {}) => ({ title: 'Better ball control', targetDate: '2026-12-31', notes: '', status: 'active' as const, checked: false, pinned: false, ...overrides });
const apply = (state: State, command: Command, instant = now) => applyCommand(state, command, instant);
const funded = (area: 'personal' | 'company' = 'personal') => apply(initialState(), { type: 'ledger.adjust', area, account: 100000, cash: 100000, earned: 0, lost: 0, reason: 'Opening balances' });
const envelope = (area: 'personal' | 'company' = 'personal') => ({ area, title: 'Gym three times', amount: 10000, purpose: 'Complete three workouts', expiresAt: '2026-09-18T17:00:00.000Z', notes: '' });

describe('command validation and transaction safety', () => {
  it('starts without synthetic personal entries and increments one revision without mutation', () => {
    const state = initialState(); const result = apply(state, { type: 'task.save', task: task() });
    expect(state.revision).toBe(0); expect(state.tasks).toHaveLength(0);
    expect(result.revision).toBe(1); expect(result.tasks).toHaveLength(1);
    expect(initialState().ledgers).toHaveLength(2);
    expect(initialState().days).toHaveLength(0);
  });
  it('rejects unknown payload fields, invalid dates, fractional cents and malformed health', () => {
    expect(commandEnvelopeSchema.safeParse({ requestId: 'request-1', baseRevision: 0, command: { type: 'settings.save', name: 'Morgan', timezone: 'America/New_York', owner: true } }).success).toBe(false);
    expect(commandSchema.safeParse({ type: 'goal.save', goal: goal({ targetDate: '2026-02-30' }) }).success).toBe(false);
    expect(commandSchema.safeParse({ type: 'envelope.create', envelope: { ...envelope(), amount: 1.5 } }).success).toBe(false);
    expect(commandSchema.safeParse({ type: 'log.save', log: { kind: 'weight', at: now, category: '', description: '', notes: '' } }).success).toBe(false);
    expect(commandSchema.safeParse({ type: 'task.save', task: task({ duration: 7 }) }).success).toBe(false);
  });
  it('exposes a coded domain error and leaves input unchanged when a command fails', () => {
    const state = initialState();
    expect(() => apply(state, { type: 'envelope.create', envelope: envelope() })).toThrow(DomainError);
    try { apply(state, { type: 'envelope.create', envelope: envelope() }); } catch (error) {
      expect(error).toMatchObject({ code: 'INSUFFICIENT_CASH', status: 409, statusCode: 409 });
    }
    expect(state.envelopes).toEqual([]); expect(state.adjustments).toEqual([]);
  });
});

describe('calendar and DST', () => {
  it('uses New York day boundaries independently of the host timezone', () => {
    expect(dateKey('2026-09-19T02:00:00Z')).toBe('2026-09-18');
    expect(minuteOfDay('2026-09-19T02:00:00Z')).toBe(22 * 60);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
  it('rejects nonexistent spring times and consistently chooses the first fall occurrence', () => {
    expect(() => localInstant('2026-03-08', '02:30')).toThrow(/does not exist/);
    expect(localInstant('2026-11-01', '01:30')).toBe('2026-11-01T05:30:00.000Z');
    expect(localInstant('2026-03-08', '03:30')).toBe('2026-03-08T07:30:00.000Z');
    expect(localInstant('2026-09-18', '10:00', 'Asia/Kathmandu')).toBe('2026-09-18T04:15:00.000Z');
  });
});

describe('scheduled work', () => {
  it('missed work returns at its full estimate while retaining the missed block', () => {
    let state = apply(initialState(), { type: 'task.save', task: task({ duration: 60 }) });
    const id = state.tasks[0].id;
    state = apply(state, { type: 'block.save', block: block({ taskId: id }) });
    expect(unscheduledTasks(state)).toHaveLength(0);
    state = apply(state, { type: 'block.resolve', id: state.blocks[0].id, outcome: 'missed' }, later);
    expect(state.blocks[0].status).toBe('missed');
    expect(unscheduledTasks(state)[0]).toMatchObject({ id, duration: 60, status: 'open' });
  });
  it('creates linked partial work using the requested estimate and optional schedule', () => {
    let state = apply(initialState(), { type: 'block.save', block: block() });
    const original = state.tasks[0].id;
    state = apply(state, { type: 'block.resolve', id: state.blocks[0].id, outcome: 'partial', remainingDuration: 45, remainingStart: '2026-09-19T17:00:00.000Z' }, later);
    expect(state.tasks).toHaveLength(2); expect(state.tasks[0].status).toBe('partial');
    expect(state.tasks[0].remainingTaskId).toBe(state.tasks[1].id);
    expect(state.tasks[1]).toMatchObject({ duration: 45, status: 'open' });
    expect(state.blocks[1]).toMatchObject({ taskId: state.tasks[1].id, end: '2026-09-19T17:45:00.000Z' });
    expect(unscheduledTasks(state).find(t => t.id === original)).toBeUndefined();
    const retry = apply(state, { type: 'block.resolve', id: state.blocks[0].id, outcome: 'partial', remainingDuration: 45 }, later);
    expect(retry.tasks).toHaveLength(2);
  });
  it('rescheduling preserves cancelled history and does not duplicate the task', () => {
    let state = apply(initialState(), { type: 'block.save', block: block() });
    const original = state.blocks[0];
    state = apply(state, { type: 'block.save', block: { ...block(), id: original.id, taskId: original.taskId, start: '2026-09-18T18:00:00.000Z', end: '2026-09-18T18:30:00.000Z' } });
    expect(state.tasks).toHaveLength(1); expect(state.blocks).toHaveLength(2);
    expect(state.blocks[0]).toMatchObject({ id: original.id, start: original.start, status: 'cancelled' });
    expect(state.blocks[1].status).toBe('pending'); expect(state.blocks[1].id).not.toBe(original.id);
  });
  it('enforces one started task; snoozing does not silently complete or reschedule work', () => {
    let state = apply(initialState(), { type: 'block.save', block: block() });
    state = apply(state, { type: 'block.save', block: block({ title: 'Read', start: '2026-09-18T17:00:00.000Z', end: '2026-09-18T17:30:00.000Z' }) });
    state = apply(state, { type: 'block.start', id: state.blocks[0].id });
    expect(() => apply(state, { type: 'block.start', id: state.blocks[1].id })).toThrow(/current task/);
    state = apply(state, { type: 'block.snooze', id: state.blocks[0].id, until: later });
    expect(state.blocks[0]).toMatchObject({ status: 'pending', start: block().start, snoozedUntil: later, actualStart: now });
    state = apply(state, { type: 'block.resolve', id: state.blocks[0].id, outcome: 'complete' }, later);
    state = apply(state, { type: 'block.start', id: state.blocks[1].id }, later);
    expect(state.blocks[1].actualStart).toBe(later);
  });
  it('allows overlaps but excludes adjacent blocks; appointments have distinct outcomes', () => {
    let state = apply(initialState(), { type: 'block.save', block: block({ kind: 'appointment', title: 'Meeting' }) });
    const meeting = state.blocks[0];
    expect(overlaps(state, { id: 'new', start: '2026-09-18T16:15:00Z', end: '2026-09-18T17:00:00Z' })).toHaveLength(1);
    expect(overlaps(state, { id: 'new', start: '2026-09-18T16:30:00Z', end: '2026-09-18T17:00:00Z' })).toHaveLength(0);
    expect(() => apply(state, { type: 'block.resolve', id: meeting.id, outcome: 'complete' })).toThrow(/attended/);
    state = apply(state, { type: 'block.resolve', id: meeting.id, outcome: 'attended' });
    expect(state.tasks).toHaveLength(0); expect(state.blocks[0].status).toBe('attended');
  });
  it('does not permit direct saves to bypass outcome and start safeguards', () => {
    expect(() => apply(initialState(), { type: 'block.save', block: block({ actualStart: now }) })).toThrow(/actions/);
    expect(() => apply(initialState(), { type: 'block.save', block: block({ start: '2026-09-18T16:03:00Z' }) })).toThrow(/five-minute/);
  });
});

describe('day records and evidence-based summaries', () => {
  it('keeps a day open past midnight and preserves late-night tasks in its summary', () => {
    let state = apply(initialState(), { type: 'day.start', date: '2026-09-18', wakeAt: '2026-09-18T12:00:00Z', mood: 3, energy: 4 });
    const day = state.days[0];
    state = apply(state, { type: 'block.save', block: block({ title: 'Late practice', start: '2026-09-19T04:15:00Z', end: '2026-09-19T04:45:00Z' }) });
    state = apply(state, { type: 'block.resolve', id: state.blocks[0].id, outcome: 'complete' }, '2026-09-19T04:45:00Z');
    expect(() => apply(state, { type: 'day.start', date: '2026-09-19' }, '2026-09-19T05:00:00Z')).toThrow(/previous/);
    state = apply(state, { type: 'day.end', id: day.id }, '2026-09-19T05:00:00Z');
    expect(state.days[0].summary).toContain('Late practice: complete');
    expect(state.days[0].summary).toContain('Sleep: not recorded.');
    expect(state.logs.filter(l => l.kind === 'sleep')).toHaveLength(0);
  });
  it('repeated start/end avoids duplicates; end returns unfinished tasks without inventing attendance', () => {
    let state = apply(initialState(), { type: 'day.start', date: '2026-09-18' });
    state = apply(state, { type: 'day.start', date: '2026-09-18', mood: 2 });
    expect(state.days).toHaveLength(1);
    state = apply(state, { type: 'block.save', block: block() });
    state = apply(state, { type: 'block.save', block: block({ kind: 'appointment', title: 'Dentist' }) });
    state = apply(state, { type: 'day.end', id: state.days[0].id, journal: 'My own words.' }, later);
    expect(unscheduledTasks(state)).toHaveLength(1);
    expect(state.blocks[1].status).toBe('pending');
    expect(state.days[0].summary).toContain('Dentist: outcome not recorded');
    const endedAt = state.days[0].endedAt;
    state = apply(state, { type: 'day.end', id: state.days[0].id }, '2026-09-18T19:00:00Z');
    expect(state.days[0].endedAt).toBe(endedAt); expect(state.days[0].journal).toBe('My own words.');
  });
  it('preserves edited summaries until explicit regeneration and keeps journal separate', () => {
    let state = apply(initialState(), { type: 'day.start', date: '2026-09-18' });
    const id = state.days[0].id;
    state = apply(state, { type: 'day.save', id, summary: 'My corrected facts.', journal: 'Private thoughts.' });
    state = apply(state, { type: 'day.end', id }, later);
    expect(state.days[0].summary).toBe('My corrected facts.');
    state = apply(state, { type: 'day.regenerate', id }, later);
    expect(state.days[0].summary).not.toBe('My corrected facts.');
    expect(state.days[0].journal).toBe('Private thoughts.');
  });
  it('can save an old journal without inventing wake or sleep records', () => {
    let state = apply(initialState(), { type: 'day.save', date: '2020-04-10', summary: 'A memory.', journal: 'My past entry.' });
    expect(state.days[0].startedAt).toBeUndefined();
    expect(state.days[0].date).toBe('2020-04-10');
    expect(summaryForDay(state, state.days[0].id)).toContain('Wake time: not recorded.');
    state = apply(state, { type: 'day.start', date: '2026-09-18' });
    expect(state.days).toHaveLength(2);
    state = apply(state, { type: 'day.checkin', id: state.days[1].id, mood: 4, energy: 2, wakeAt: '2026-09-18T12:00:00Z' });
    expect(state.days[1]).toMatchObject({ mood: 4, energy: 2, startedAt: '2026-09-18T12:00:00.000Z' });
  });
});

describe('goal trees and templates', () => {
  it('counts only leaf steps, prevents cycles, and only completes a linked goal after remaining work is done', () => {
    let state = apply(initialState(), { type: 'goal.save', goal: goal({ id: 'root' }) });
    state = apply(state, { type: 'goal.save', goal: goal({ id: 'branch', parentId: 'root' }) });
    state = apply(state, { type: 'goal.save', goal: goal({ id: 'leaf-a', parentId: 'branch', checked: true }) });
    state = apply(state, { type: 'goal.save', goal: goal({ id: 'leaf-b', parentId: 'root' }) });
    expect(goalProgress(state, 'root')).toEqual({ total: 2, completed: 1, percent: 50 });
    expect(() => apply(state, { type: 'goal.save', goal: goal({ id: 'root', parentId: 'leaf-a' }) })).toThrow(/ancestor/);
    state = apply(state, { type: 'task.save', task: task({ goalId: 'leaf-b' }) });
    state = apply(state, { type: 'block.save', block: block({ taskId: state.tasks[0].id }) });
    state = apply(state, { type: 'block.resolve', id: state.blocks[0].id, outcome: 'partial', remainingDuration: 15 });
    expect(goalProgress(state, 'root').percent).toBe(50);
    state = apply(state, { type: 'block.save', block: block({ taskId: state.tasks[1].id }) });
    state = apply(state, { type: 'block.resolve', id: state.blocks[1].id, outcome: 'complete' });
    expect(goalProgress(state, 'root').percent).toBe(100);
    state = apply(state, { type: 'record.archive', collection: 'goals', id: 'branch', archived: true });
    expect(state.goals.find(g => g.id === 'leaf-a')?.archived).toBe(true);
    expect(goalProgress(state, 'root').total).toBe(1);
  });
  it('applies templates once per date with new daily tasks and transactionally rejects DST gaps', () => {
    let state = apply(initialState(), { type: 'template.save', template: { title: 'Morning', blocks: [{ title: 'Breakfast', kind: 'routine', tag: 'Personal', startMinute: 480, duration: 30, notes: '' }, { title: 'Training', kind: 'task', tag: 'Personal', startMinute: 540, duration: 30, notes: '' }] } });
    const id = state.templates[0].id;
    state = apply(state, { type: 'template.apply', id, date: '2026-09-19' });
    state = apply(state, { type: 'template.apply', id, date: '2026-09-19' });
    expect(state.blocks).toHaveLength(2); expect(state.tasks).toHaveLength(1);
    state = apply(state, { type: 'template.apply', id, date: '2026-09-20' });
    expect(state.blocks).toHaveLength(4); expect(state.tasks).toHaveLength(2);
    state = apply(state, { type: 'template.save', template: { title: 'Early morning', blocks: [{ title: 'Gap', kind: 'routine', tag: 'Personal', startMinute: 150, duration: 30, notes: '' }] } });
    expect(() => apply(state, { type: 'template.apply', id: state.templates[1].id, date: '2026-03-08' })).toThrow(/does not exist/);
    expect(state.blocks).toHaveLength(4);
  });
});

describe('health entries', () => {
  it('replaces a daily steps total, retains weights, and derives elapsed sleep across DST', () => {
    let state = initialState();
    for (const value of [1000, 3000]) state = apply(state, { type: 'log.save', log: { kind: 'steps', at: now, value, category: '', description: '', notes: '' } });
    expect(state.logs).toHaveLength(1); expect(state.logs[0].value).toBe(3000);
    for (const value of [180, 181]) state = apply(state, { type: 'log.save', log: { kind: 'weight', at: now, value, category: '', description: '', notes: '' } });
    expect(state.logs.filter(l => l.kind === 'weight')).toHaveLength(2);
    state = apply(state, { type: 'log.save', log: { kind: 'sleep', at: now, start: '2026-03-08T04:00:00Z', end: '2026-03-08T12:00:00Z', duration: 1, quality: 4, category: '', description: '', notes: '' } });
    expect(state.logs.at(-1)).toMatchObject({ duration: 480, at: '2026-03-08T12:00:00.000Z' });
  });
  it('uses the first weight after wake for the factual summary, and lists missing data quietly', () => {
    let state = apply(initialState(), { type: 'day.start', date: '2026-09-18', wakeAt: '2026-09-18T12:00:00Z' });
    for (const [at, value] of [['2026-09-18T10:00:00Z', 182], ['2026-09-18T13:00:00Z', 180], ['2026-09-18T15:00:00Z', 181]] as const) state = apply(state, { type: 'log.save', log: { kind: 'weight', at, value, category: '', description: '', notes: '' } });
    expect(summaryForDay(state, state.days[0].id)).toContain('First weight after waking: 180 lb.');
    expect(missingItems(state, '2026-09-18').map(i => i.key)).toEqual(['sleep', 'steps', 'food', 'mood', 'energy', 'journal']);
  });
});

describe.each(['personal', 'company'] as const)('%s money and envelope conservation', area => {
  it('reserves, earns and retries without moving money twice', () => {
    let state = apply(funded(area), { type: 'envelope.create', envelope: envelope(area) });
    expect(state.ledgers.find(l => l.area === area)).toMatchObject({ account: 100000, cash: 90000, earned: 0 });
    expect(() => apply(state, { type: 'envelope.resolve', id: state.envelopes[0].id, outcome: 'earned' })).toThrow(/not expired/);
    state = apply(state, { type: 'envelope.resolve', id: state.envelopes[0].id, outcome: 'earned' }, later);
    state = apply(state, { type: 'envelope.resolve', id: state.envelopes[0].id, outcome: 'earned' }, later);
    expect(state.ledgers.find(l => l.area === area)).toMatchObject({ account: 100000, cash: 90000, earned: 10000 });
    expect(state.adjustments).toHaveLength(3);
    expect(state.ledgers.find(l => l.area !== area)).toMatchObject({ account: 0, cash: 0, earned: 0, lost: 0 });
  });
  it('keeps losses in the account until actually handled, and preserves every audit entry', () => {
    let state = apply(funded(area), { type: 'envelope.create', envelope: envelope(area) });
    const id = state.envelopes[0].id;
    state = apply(state, { type: 'envelope.resolve', id, outcome: 'lost' }, later);
    expect(state.ledgers.find(l => l.area === area)).toMatchObject({ account: 100000, cash: 90000, lost: 10000 });
    state = apply(state, { type: 'envelope.resolve', id, outcome: 'handled' }, later);
    expect(state.ledgers.find(l => l.area === area)).toMatchObject({ account: 90000, cash: 90000, lost: 0 });
    expect(state.envelopes[0].status).toBe('handled');
    expect(state.adjustments.at(-1)?.before.lost).toBe(10000);
    expect(state.adjustments.at(-1)?.after.lost).toBe(0);
    const retry = apply(state, { type: 'envelope.resolve', id, outcome: 'handled' }, later);
    expect(retry.adjustments).toHaveLength(state.adjustments.length);
    expect(() => apply(state, { type: 'envelope.resolve', id, outcome: 'earned' }, later)).toThrow(/already/);
  });
  it('extends reservations, returns cancellation to cash and never silently reconciles account totals', () => {
    let state = apply(funded(area), { type: 'ledger.adjust', area, account: 110000, cash: 100000, earned: 0, lost: 0, reason: 'Statement differs; review later' });
    state = apply(state, { type: 'envelope.create', envelope: envelope(area) });
    const id = state.envelopes[0].id;
    state = apply(state, { type: 'envelope.resolve', id, outcome: 'extend', expiresAt: '2026-09-20T17:00:00Z' }, later);
    expect(state.envelopes[0].status).toBe('active');
    state = apply(state, { type: 'envelope.resolve', id, outcome: 'cancelled' }, later);
    expect(state.ledgers.find(l => l.area === area)).toMatchObject({ account: 110000, cash: 100000, earned: 0, lost: 0 });
  });
});
