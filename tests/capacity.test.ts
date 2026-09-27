import { describe, expect, it } from 'vitest';
import { capacityForDraft, capacityForPlan, capacityForRemainingDay, clipInterval, entryConflicts, localDayRange, unionMinutes } from '../shared/capacity';
import { initialState } from '../shared/domain';
import { localInstant } from '../shared/dates';
import type { Block, DayPlan, State, Task } from '../shared/types';

const zone = 'America/New_York';
const date = '2026-09-18';
const stamp = '2026-09-17T12:00:00.000Z';
const at = (time: string, day = date, timezone = zone) => localInstant(day, time, timezone);
const task = (id: string, duration?: number, overrides: Partial<Task> = {}): Task => ({ id, createdAt: stamp, updatedAt: stamp, title: `Synthetic ${id}`, ...(duration === undefined ? {} : { duration }), tag: 'Work', labels: [], notes: '', status: 'open', ...overrides });
const block = (id: string, start: string, end: string, overrides: Partial<Block> = {}): Block => ({ id, createdAt: stamp, updatedAt: stamp, title: `Synthetic ${id}`, kind: 'appointment', tag: 'Work', start, end, notes: '', status: 'pending', ...overrides });
const plan = (overrides: Partial<DayPlan> = {}): DayPlan => ({ id: `dayplan:${date}`, createdAt: stamp, updatedAt: stamp, date, timezone: zone, taskIds: [], window: { start: at('09:00'), end: at('17:00') }, protectedSpareMinutes: 0, ...overrides });
const state = (parts: Partial<State>): State => ({ ...initialState(), ...parts });

describe('interval arithmetic', () => {
  it('treats intervals as half-open so touching entries neither overlap nor double count', () => {
    const first = { start: at('09:00'), end: at('10:00') }, second = { start: at('10:00'), end: at('11:00') };
    expect(unionMinutes([first, second])).toBe(120);
    expect(clipInterval(first, second)).toBeUndefined();
    expect(entryConflicts(state({ blocks: [block('a', first.start, first.end), block('b', second.start, second.end)] }), localDayRange(date, zone))).toEqual([]);
  });
  it('merges overlapping and contained intervals and ignores empty ones', () => {
    expect(unionMinutes([{ start: at('09:00'), end: at('10:00') }, { start: at('09:30'), end: at('09:45') }, { start: at('09:50'), end: at('10:30') }, { start: at('12:00'), end: at('12:00') }])).toBe(90);
  });
  it('never rounds a clipped total upward', () => {
    expect(unionMinutes([{ start: '2026-09-18T13:00:00.000Z', end: '2026-09-18T13:10:59.999Z' }])).toBe(10);
  });
});

describe('local day range', () => {
  it('measures 23, 24 and 25 hour dates in New York', () => {
    const hours = (day: string) => { const range = localDayRange(day, zone); return (Date.parse(range.end) - Date.parse(range.start)) / 3600000; };
    expect(hours('2026-03-08')).toBe(23);
    expect(hours(date)).toBe(24);
    expect(hours('2026-11-01')).toBe(25);
    expect(localDayRange(date, zone).start).toBe('2026-09-18T04:00:00.000Z');
  });
  it('follows a zone with a fractional offset', () => {
    expect(localDayRange(date, 'Asia/Kathmandu')).toEqual({ start: '2026-09-17T18:15:00.000Z', end: '2026-09-18T18:15:00.000Z' });
  });
  it('rejects an invalid date or zone', () => {
    expect(() => localDayRange('2026-02-30', zone)).toThrow(RangeError);
    expect(() => localDayRange(date, 'Mars/Olympus')).toThrow(RangeError);
  });
});

describe('capacity of a day plan', () => {
  it('P04: overlapping fixed appointments occupy their union and still report a conflict', () => {
    const result = capacityForPlan(state({ dayPlans: [plan()], blocks: [block('a', at('09:00'), at('10:00')), block('b', at('09:30'), at('10:30'))] }), date);
    expect(result.fixedMinutes).toBe(90);
    expect(result.occupiedMinutes).toBe(90);
    expect(result.conflicts).toEqual([{ aId: 'a', bId: 'b', start: at('09:30'), end: at('10:00'), minutes: 30, involvesFixed: true, acknowledged: false }]);
  });
  it('P05: an appointment crossing the window edge deducts only the part inside', () => {
    const result = capacityForPlan(state({ dayPlans: [plan()], blocks: [block('a', at('08:00'), at('10:00'))] }), date);
    expect(result.fixedMinutes).toBe(60);
    expect(result.knownBalanceMinutes).toBe(420);
    expect(result.partlyOutsideWindowIds).toEqual(['a']);
    expect(result.outsideWindowIds).toEqual([]);
  });
  it('P06: an appointment wholly outside the window deducts nothing and stays visible', () => {
    const result = capacityForPlan(state({ dayPlans: [plan()], blocks: [block('a', at('18:00'), at('19:00'))] }), date);
    expect(result.occupiedMinutes).toBe(0);
    expect(result.knownBalanceMinutes).toBe(480);
    expect(result.outsideWindowIds).toEqual(['a']);
  });
  it('P23 and P09: keeps the known subtotal and reports unestimated work beside it', () => {
    const tasks = [task('t1', 90), task('t2', 60), task('unknown')];
    const blocks = [block('fixed', at('13:00'), at('14:00'))];
    const known = capacityForPlan(state({ tasks, blocks, dayPlans: [plan({ taskIds: ['t1', 't2'], protectedSpareMinutes: 120 })] }), date);
    expect(known).toMatchObject({ status: 'ok', scope: 'full-day', windowMinutes: 480, fixedMinutes: 60, flexibleMinutes: 0, protectedSpareMinutes: 120, unplacedDemandMinutes: 150, knownBalanceMinutes: 150, unallocatedMinutes: 150, overloadMinutes: 0, unestimatedTaskIds: [] });
    const withUnknown = capacityForPlan(state({ tasks, blocks, dayPlans: [plan({ taskIds: ['t1', 't2', 'unknown'], protectedSpareMinutes: 120 })] }), date);
    expect(withUnknown.knownBalanceMinutes).toBe(150);
    expect(withUnknown.unestimatedTaskIds).toEqual(['unknown']);
  });
  it('P10: assumes nothing without a planning window', () => {
    const result = capacityForPlan(state({ tasks: [task('t1', 60)], dayPlans: [plan({ window: undefined, taskIds: ['t1'] })], blocks: [block('a', at('09:00'), at('10:00'))] }), date);
    expect(result.status).toBe('window-missing');
    expect(result.windowMinutes).toBeUndefined();
    expect(result.knownBalanceMinutes).toBeUndefined();
    expect(result.unallocatedMinutes).toBeUndefined();
    expect(result.fixedMinutes).toBe(60);
    expect(result.unplacedDemandMinutes).toBe(60);
    expect(result.outsideWindowIds).toEqual([]);
    const noPlan = capacityForPlan(state({}), date);
    expect(noPlan).toMatchObject({ status: 'window-missing', timezone: zone, protectedSpareMinutes: 0, unplacedDemandMinutes: 0 });
  });
  it('P15: reports overload instead of clamping the balance to zero', () => {
    const result = capacityForPlan(state({ tasks: [task('t1', 300), task('t2', 240)], dayPlans: [plan({ taskIds: ['t1', 't2'], protectedSpareMinutes: 60 })] }), date);
    expect(result.knownBalanceMinutes).toBe(-120);
    expect(result.unallocatedMinutes).toBe(0);
    expect(result.overloadMinutes).toBe(120);
  });
  it('P16: a booking shorter than the estimate reserves its own length and leaves the rest as demand once', () => {
    const tasks = [task('t1', 90)];
    const blocks = [block('b1', at('10:00'), at('11:00'), { kind: 'task', taskId: 't1' })];
    const result = capacityForPlan(state({ tasks, blocks, dayPlans: [plan({ taskIds: ['t1'] })] }), date);
    expect(result.flexibleMinutes).toBe(60);
    expect(result.credits).toEqual([{ taskId: 't1', estimateMinutes: 90, creditedMinutes: 60, outOfWindowCreditMinutes: 0, unplacedMinutes: 30 }]);
    expect(result.knownBalanceMinutes).toBe(480 - 60 - 30);
    expect(tasks[0].duration).toBe(90);
  });
  it('credits a task booked outside the window as placed, not as unplaced demand', () => {
    const result = capacityForPlan(state({ tasks: [task('t1', 60)], blocks: [block('b1', at('18:00'), at('19:00'), { kind: 'task', taskId: 't1' })], dayPlans: [plan({ taskIds: ['t1'] })] }), date);
    expect(result.credits).toEqual([{ taskId: 't1', estimateMinutes: 60, creditedMinutes: 60, outOfWindowCreditMinutes: 60, unplacedMinutes: 0 }]);
    expect(result.unplacedDemandMinutes).toBe(0);
    expect(result.knownBalanceMinutes).toBe(480);
  });
  it('gives no credit for cancelled, missed, archived or already resolved bookings and ignores finished selections', () => {
    const tasks = [task('t1', 60), task('done', 60, { status: 'complete' }), task('gone', 60, { archived: true })];
    const blocks = [
      block('cancelled', at('10:00'), at('11:00'), { kind: 'task', taskId: 't1', status: 'cancelled' }),
      block('missed', at('11:00'), at('12:00'), { kind: 'task', taskId: 't1', status: 'missed' }),
      block('archived', at('12:00'), at('13:00'), { kind: 'task', taskId: 't1', archived: true }),
      block('history', at('13:00'), at('14:00'), { kind: 'task', taskId: 't1', status: 'complete' }),
    ];
    const result = capacityForPlan(state({ tasks, blocks, dayPlans: [plan({ taskIds: ['t1', 'done', 'gone'] })] }), date);
    expect(result.credits).toEqual([{ taskId: 't1', estimateMinutes: 60, creditedMinutes: 0, outOfWindowCreditMinutes: 0, unplacedMinutes: 60 }]);
    expect(result.occupiedMinutes).toBe(60);
  });
  it('counts a flexible entry that overlaps a fixed one only for the time it adds', () => {
    const blocks = [block('fixed', at('09:00'), at('10:00')), block('flex', at('09:30'), at('10:30'), { kind: 'routine' })];
    const result = capacityForPlan(state({ blocks, dayPlans: [plan()] }), date);
    expect(result).toMatchObject({ fixedMinutes: 60, flexibleMinutes: 30, occupiedMinutes: 90 });
    expect(result.conflicts[0]).toMatchObject({ involvesFixed: true, minutes: 30 });
  });
  it('honors the stored flexibility over the kind', () => {
    const blocks = [block('tentative', at('09:00'), at('10:00'), { flexibility: 'flexible' }), block('committed', at('11:00'), at('12:00'), { kind: 'task', flexibility: 'fixed' })];
    expect(capacityForPlan(state({ blocks, dayPlans: [plan()] }), date)).toMatchObject({ fixedMinutes: 60, flexibleMinutes: 60 });
  });
  it('marks a conflict acknowledged through either block or the legacy review flag', () => {
    const range = localDayRange(date, zone);
    const pair = (a: Partial<Block>, b: Partial<Block>) => entryConflicts(state({ blocks: [block('a', at('09:00'), at('10:00'), a), block('b', at('09:30'), at('10:30'), b)] }), range)[0].acknowledged;
    expect(pair({}, {})).toBe(false);
    expect(pair({ acknowledgedConflictIds: ['b'] }, {})).toBe(true);
    expect(pair({}, { acknowledgedConflictIds: ['a'] })).toBe(true);
    expect(pair({ acknowledgedConflictIds: ['other'] }, {})).toBe(false);
    expect(pair({}, { conflictReviewed: true })).toBe(true);
  });
});

describe('remaining day', () => {
  const tasks = [task('t1', 60), task('t2', 60)];
  const blocks = [
    block('morning', at('10:00'), at('11:00')),
    block('afternoon', at('15:00'), at('16:00')),
    block('past', at('11:00'), at('12:00'), { kind: 'task', taskId: 't1' }),
  ];
  const base = state({ tasks, blocks, dayPlans: [plan({ taskIds: ['t1', 't2'], protectedSpareMinutes: 30 })] });
  it('P14: measures from now, so elapsed appointments and elapsed bookings no longer count', () => {
    const result = capacityForRemainingDay(base, date, at('14:00'));
    expect(result).toMatchObject({ status: 'ok', scope: 'remaining-day', windowMinutes: 180, fixedMinutes: 60, occupiedMinutes: 60, unplacedDemandMinutes: 120, knownBalanceMinutes: 180 - 60 - 30 - 120, estimateBasis: 'unchanged-estimate' });
    expect(result.window).toEqual({ start: at('14:00'), end: at('17:00') });
    expect(capacityForPlan(base, date).windowMinutes).toBe(480);
  });
  it('starts at the window, not earlier, when now precedes it', () => {
    expect(capacityForRemainingDay(base, date, at('07:00')).window).toEqual({ start: at('09:00'), end: at('17:00') });
  });
  it('reports an elapsed window instead of a negative length', () => {
    const result = capacityForRemainingDay(base, date, at('17:00'));
    expect(result).toMatchObject({ status: 'window-elapsed', windowMinutes: 0, occupiedMinutes: 0 });
    expect(result.overloadMinutes).toBe(30 + 120);
  });
  it('credits only the part of a running booking that is still to come', () => {
    const result = capacityForRemainingDay(state({ tasks: [task('t1', 60)], blocks: [block('b', at('13:30'), at('14:30'), { kind: 'task', taskId: 't1' })], dayPlans: [plan({ taskIds: ['t1'] })] }), date, at('14:00'));
    expect(result.credits).toEqual([{ taskId: 't1', estimateMinutes: 60, creditedMinutes: 30, outOfWindowCreditMinutes: 0, unplacedMinutes: 30 }]);
    expect(result.occupiedMinutes).toBe(30);
  });
});

describe('windows, zones and unsaved plans', () => {
  it('measures an overnight window and credits work booked after midnight inside it', () => {
    const window = { start: at('20:00'), end: at('02:00', '2026-09-19') };
    const blocks = [block('late', at('00:30', '2026-09-19'), at('01:30', '2026-09-19'), { kind: 'task', taskId: 't1' })];
    const result = capacityForPlan(state({ tasks: [task('t1', 60)], blocks, dayPlans: [plan({ window, taskIds: ['t1'] })] }), date);
    expect(result).toMatchObject({ windowMinutes: 360, occupiedMinutes: 60, unplacedDemandMinutes: 0, knownBalanceMinutes: 300 });
  });
  it('keeps a saved plan in its own zone after the settings zone changes', () => {
    const base = state({ blocks: [block('a', at('09:00'), at('10:00'))], dayPlans: [plan()] });
    const moved = { ...base, settings: { ...base.settings, timezone: 'Asia/Kathmandu' } };
    expect(capacityForPlan(moved, date)).toMatchObject({ timezone: zone, windowMinutes: 480, fixedMinutes: 60 });
    expect(capacityForPlan(moved, '2026-09-20').timezone).toBe('Asia/Kathmandu');
  });
  it('measures a window across the repeated hour of a fall-back date by absolute time', () => {
    const fallBack = '2026-11-01';
    const window = { start: localInstant(fallBack, '00:00', zone), end: localInstant(fallBack, '03:00', zone) };
    const result = capacityForPlan(state({ dayPlans: [plan({ id: `dayplan:${fallBack}`, date: fallBack, window })] }), fallBack);
    expect(result.windowMinutes).toBe(240);
  });
  it('calculates an unsaved plan without storing it', () => {
    const base = state({ tasks: [task('t1', 90), task('t2')], dayPlans: [plan({ taskIds: [] })] });
    const before = structuredClone(base);
    const draft = capacityForDraft(base, { date, taskIds: ['t1', 't2'], window: { start: at('10:00'), end: at('12:00') }, protectedSpareMinutes: 15 });
    expect(draft).toMatchObject({ scope: 'full-day', windowMinutes: 120, unplacedDemandMinutes: 90, knownBalanceMinutes: 15, unestimatedTaskIds: ['t2'], timezone: zone });
    expect(capacityForDraft(base, { date, taskIds: [], window: { start: at('10:00'), end: at('12:00') }, protectedSpareMinutes: 0 }, at('11:00'))).toMatchObject({ scope: 'remaining-day', windowMinutes: 60 });
    expect(base).toEqual(before);
  });
});
