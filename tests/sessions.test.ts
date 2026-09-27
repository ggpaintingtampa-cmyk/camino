import { describe, expect, it } from 'vitest';
import { applyCommand, DomainError, initialState } from '../shared/domain';
import { blockFlexibility, isSessionBacked, recordedMinutes, recordedMinutesForBlock, recordedSlices, runningSession, sessionState, sessionViolations, unfinishedSessionForTarget, unfinishedSessions } from '../shared/sessions';
import type { Command, SessionTarget, State } from '../shared/types';

// Monday 2026-09-21 in America/New_York (UTC-4). 10:00 local is 14:00Z.
const t = (time: string, date = '2026-09-21') => `${date}T${time}:00.000Z`;
const run = (state: State, command: Command, now: string) => applyCommand(state, command, now);
function refuse(state: State, command: Command, now: string, code: string): DomainError {
  const before = structuredClone(state);
  let error: unknown;
  try { applyCommand(state, command, now); } catch (caught) { error = caught; }
  expect(error).toBeInstanceOf(DomainError);
  expect(error).toMatchObject({ code });
  expect(state).toEqual(before);
  return error as DomainError;
}
const taskTarget = (taskId: string): SessionTarget => ({ kind: 'task', taskId });
const capture = (state: State, id: string, now = t('13:00')) => run(state, { type: 'task.capture', task: { id, title: `Task ${id}` } }, now);
const entry = (id: string, kind: 'task' | 'routine' | 'appointment', start: string, taskId?: string) => ({ id, kind, taskId, title: `Entry ${id}`, tag: 'Personal' as const, start, end: new Date(Date.parse(start) + 3600000).toISOString(), notes: '', status: 'pending' as const });
const book = (state: State, id: string, kind: 'task' | 'routine' | 'appointment', start: string, taskId?: string) => run(state, { type: 'block.save', block: entry(id, kind, start, taskId) }, t('13:00'));
const twoTasks = () => capture(capture(initialState(), 'a'), 'b');
const sessionOf = (state: State, taskId: string) => unfinishedSessionForTarget(state, taskTarget(taskId))!;

describe('recording work', () => {
  it('T04: starting an unscheduled task creates a session and leaves the schedule alone', () => {
    const state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    expect(state.blocks).toEqual([]); expect(state.days).toEqual([]);
    expect(state.workSessions).toHaveLength(1);
    expect(state.workSessions[0]).toMatchObject({ target: taskTarget('a'), provenance: 'native', intervals: [{ start: t('14:00'), contextDate: '2026-09-21', timezone: 'America/New_York' }] });
    expect(state.workSessions[0].intervals[0]).not.toHaveProperty('plannedBlockId');
    expect(state.workSessions[0].intervals[0]).not.toHaveProperty('dayId');
    expect(sessionState(state.workSessions[0])).toBe('running');
  });
  it('T05: a pause adds nothing to recorded time', () => {
    let state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    const id = state.workSessions[0].id;
    state = run(state, { type: 'session.pause', id }, t('14:10'));
    expect(sessionState(state.workSessions[0])).toBe('paused');
    expect(recordedMinutes(state.workSessions[0], t('14:25'))).toBe(10);
    state = run(state, { type: 'session.resume', id }, t('14:30'));
    expect(recordedMinutes(state.workSessions[0], t('14:40'))).toBe(20);
    expect(state.workSessions).toHaveLength(1);
  });
  it('T06: starting other work while something runs is refused and names the running session', () => {
    const state = run(twoTasks(), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    const error = refuse(state, { type: 'session.start', target: taskTarget('b') }, t('14:05'), 'SESSION_RUNNING');
    expect(error.status).toBe(409);
    expect(error.details).toEqual({ runningSession: { id: state.workSessions[0].id, state: 'running', target: taskTarget('a') } });
  });
  it('T07: paused work does not block other work and stays paused', () => {
    let state = run(twoTasks(), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    state = run(state, { type: 'session.pause', id: state.workSessions[0].id }, t('14:10'));
    state = run(state, { type: 'session.start', target: taskTarget('b') }, t('14:15'));
    expect(sessionState(sessionOf(state, 'a'))).toBe('paused');
    expect(runningSession(state)?.target).toEqual(taskTarget('b'));
    expect(sessionOf(state, 'a').intervals).toEqual([expect.objectContaining({ start: t('14:00'), end: t('14:10') })]);
  });
  it('T08: resuming A while B runs needs an explicit switch, which pauses B and resumes A together', () => {
    let state = run(twoTasks(), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    const a = state.workSessions[0].id;
    state = run(state, { type: 'session.pause', id: a }, t('14:10'));
    state = run(state, { type: 'session.start', target: taskTarget('b') }, t('14:15'));
    const b = sessionOf(state, 'b').id;
    refuse(state, { type: 'session.resume', id: a }, t('14:20'), 'SESSION_RUNNING');
    const switched = run(state, { type: 'session.switch', expectedRunningSessionId: b, target: taskTarget('a') }, t('14:30'));
    expect(switched.revision).toBe(state.revision + 1);
    expect(runningSession(switched)?.id).toBe(a);
    expect(sessionOf(switched, 'b').intervals.at(-1)).toMatchObject({ start: t('14:15'), end: t('14:30') });
    expect(sessionOf(switched, 'a').intervals).toHaveLength(2);
    expect(switched.workSessions).toHaveLength(2);
  });
  it('T08: a switch is refused when the running work is not the expected one, or is the target itself', () => {
    let state = run(twoTasks(), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    const a = state.workSessions[0].id;
    const stale = refuse(state, { type: 'session.switch', expectedRunningSessionId: 'someone-else', target: taskTarget('b') }, t('14:05'), 'SESSION_SWITCH_STALE');
    expect(stale.details?.runningSession?.id).toBe(a);
    refuse(state, { type: 'session.switch', expectedRunningSessionId: a, target: taskTarget('a') }, t('14:05'), 'INVALID_COMMAND');
    refuse(state, { type: 'session.switch', expectedRunningSessionId: a, target: taskTarget('missing') }, t('14:05'), 'TARGET_UNAVAILABLE');
    state = run(state, { type: 'session.pause', id: a }, t('14:10'));
    const idle = refuse(state, { type: 'session.switch', expectedRunningSessionId: a, target: taskTarget('b') }, t('14:15'), 'SESSION_SWITCH_STALE');
    expect(idle.details).toBeUndefined();
  });
  it('T09: a repeated start, pause or stop is accepted once more and records nothing new', () => {
    let state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    const id = state.workSessions[0].id;
    const again = run(state, { type: 'session.start', target: taskTarget('a') }, t('14:05'));
    expect(again.workSessions).toEqual(state.workSessions);
    expect(again.revision).toBe(state.revision + 1);
    expect(run(state, { type: 'session.resume', id }, t('14:05')).workSessions).toEqual(state.workSessions);
    state = run(state, { type: 'session.pause', id }, t('14:10'));
    expect(run(state, { type: 'session.pause', id }, t('14:20')).workSessions).toEqual(state.workSessions);
    state = run(state, { type: 'session.stop', id }, t('14:30'));
    expect(run(state, { type: 'session.stop', id }, t('14:50')).workSessions).toEqual(state.workSessions);
    expect(state.taskOutcomes).toEqual([]);
  });
  it('an ended session is history: it cannot pause or resume, and new work starts a new session', () => {
    let state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    const id = state.workSessions[0].id;
    state = run(state, { type: 'session.stop', id }, t('14:10'));
    refuse(state, { type: 'session.pause', id }, t('14:20'), 'SESSION_ENDED');
    refuse(state, { type: 'session.resume', id }, t('14:20'), 'SESSION_ENDED');
    refuse(state, { type: 'session.pause', id: 'missing' }, t('14:20'), 'NOT_FOUND');
    const fresh = run(state, { type: 'session.start', target: taskTarget('a') }, t('14:30'));
    expect(fresh.workSessions).toHaveLength(2);
    expect(fresh.workSessions[0]).toEqual(state.workSessions[0]);
    expect(sessionViolations(fresh)).toEqual([]);
  });
  it('T14: a routine is recorded under its own entry and obeys the single-running rule without a task', () => {
    let state = book(capture(initialState(), 'a'), 'stretch', 'routine', t('14:00'));
    state = run(state, { type: 'session.start', target: { kind: 'routine', blockId: 'stretch' } }, t('14:00'));
    expect(state.tasks.map(task => task.id)).toEqual(['a']);
    expect(state.workSessions[0].intervals[0].plannedBlockId).toBe('stretch');
    expect(state.blocks[0].actualStart).toBe(t('14:00'));
    refuse(state, { type: 'session.start', target: taskTarget('a') }, t('14:05'), 'SESSION_RUNNING');
    state = run(state, { type: 'block.resolve', id: 'stretch', outcome: 'complete' }, t('14:20'));
    expect(state.workSessions[0]).toMatchObject({ endedAt: t('14:20'), endReason: 'completed' });
    expect(state.taskOutcomes).toEqual([]);
    refuse(state, { type: 'session.start', target: { kind: 'routine', blockId: 'stretch' } }, t('14:30'), 'TARGET_UNAVAILABLE');
  });
  it('T15: an appointment is never recorded work', () => {
    const state = book(capture(initialState(), 'a'), 'dentist', 'appointment', t('14:00'));
    refuse(state, { type: 'session.start', target: { kind: 'routine', blockId: 'dentist' } }, t('14:00'), 'TARGET_UNAVAILABLE');
    refuse(state, { type: 'session.start', target: taskTarget('a'), plannedBlockId: 'dentist' }, t('14:00'), 'BOOKING_MISMATCH');
    refuse(state, { type: 'block.start', id: 'dentist' }, t('14:00'), 'INVALID_COMMAND');
  });
  it('only a live open task can be recorded', () => {
    let state = capture(initialState(), 'a');
    refuse(state, { type: 'session.start', target: taskTarget('missing') }, t('14:00'), 'TARGET_UNAVAILABLE');
    state = run(state, { type: 'task.resolve', id: 'a', outcome: 'complete' }, t('14:00'));
    refuse(state, { type: 'session.start', target: taskTarget('a') }, t('14:05'), 'TARGET_UNAVAILABLE');
  });
  it('T19: a command time before the last recorded instant stores nothing', () => {
    let state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    const id = state.workSessions[0].id;
    expect(refuse(state, { type: 'session.pause', id }, t('13:59'), 'CLOCK_REGRESSION').status).toBe(409);
    refuse(state, { type: 'session.stop', id }, t('13:59'), 'CLOCK_REGRESSION');
    refuse(state, { type: 'task.resolve', id: 'a', outcome: 'complete' }, t('13:59'), 'CLOCK_REGRESSION');
    state = run(state, { type: 'session.pause', id }, t('14:10'));
    refuse(state, { type: 'session.resume', id }, t('14:05'), 'CLOCK_REGRESSION');
    expect(recordedMinutes(state.workSessions[0], t('13:00'))).toBe(10);
  });
});

describe('attribution without a started day', () => {
  it('T20: work resumed two weeks later belongs to its own week and the gap adds nothing', () => {
    let state = run(capture(initialState(), 'a', t('13:00', '2026-09-07')), { type: 'session.start', target: taskTarget('a') }, t('14:00', '2026-09-07'));
    const id = state.workSessions[0].id;
    state = run(state, { type: 'session.pause', id }, t('14:20', '2026-09-07'));
    state = run(state, { type: 'session.resume', id }, t('14:00'));
    state = run(state, { type: 'session.pause', id }, t('14:10'));
    const week = (monday: string, nextMonday: string) => ({ start: t('04:00', monday), end: t('04:00', nextMonday) });
    const first = recordedSlices(state, week('2026-09-07', '2026-09-14'), t('15:00'));
    const between = recordedSlices(state, week('2026-09-14', '2026-09-21'), t('15:00'));
    const third = recordedSlices(state, week('2026-09-21', '2026-09-28'), t('15:00'));
    expect(first.map(slice => slice.minutes)).toEqual([20]);
    expect(between).toEqual([]);
    expect(third.map(slice => slice.minutes)).toEqual([10]);
    expect(state.workSessions[0].intervals.map(interval => interval.contextDate)).toEqual(['2026-09-07', '2026-09-21']);
    expect(state.workSessions[0].intervals.some(interval => 'dayId' in interval)).toBe(false);
    expect(recordedMinutes(state.workSessions[0], t('15:00'))).toBe(30);
  });
  it('T21: Stop recording ends the session, keeps the task open and invents no day, block or outcome', () => {
    let state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    state = run(state, { type: 'session.stop', id: state.workSessions[0].id }, t('14:25'));
    expect(state.workSessions[0]).toMatchObject({ endedAt: t('14:25'), endReason: 'stopped', intervals: [{ start: t('14:00'), end: t('14:25') }] });
    expect(state.tasks[0].status).toBe('open');
    expect(state.days).toEqual([]); expect(state.blocks).toEqual([]); expect(state.taskOutcomes).toEqual([]);
    expect(unfinishedSessions(state)).toEqual([]);
  });
  it.each([
    ['America/New_York', '2026-09-22T03:30:00.000Z', '2026-09-22T04:45:00.000Z', '2026-09-22T04:00:00.000Z', [30, 45]],
    ['Asia/Kathmandu', '2026-09-21T17:45:00.000Z', '2026-09-21T18:40:00.000Z', '2026-09-21T18:15:00.000Z', [30, 25]],
  ] as const)('T22: unassociated work crossing midnight in %s is one interval, split only when read', (zone, start, end, midnight, minutes) => {
    let state = run(initialState(), { type: 'settings.save', name: 'Morgan', timezone: zone }, t('13:00'));
    state = run(capture(state, 'a'), { type: 'session.start', target: taskTarget('a') }, start);
    state = run(state, { type: 'session.pause', id: state.workSessions[0].id }, end);
    expect(state.workSessions[0].intervals).toEqual([{ start, end, contextDate: '2026-09-21', timezone: zone }]);
    const dayMs = 86400000, before = { start: new Date(Date.parse(midnight) - dayMs).toISOString(), end: midnight }, after = { start: midnight, end: new Date(Date.parse(midnight) + dayMs).toISOString() };
    expect(recordedSlices(state, before, end).map(slice => [slice.start, slice.end, slice.minutes])).toEqual([[start, midnight, minutes[0]]]);
    expect(recordedSlices(state, after, end).map(slice => [slice.start, slice.end, slice.minutes])).toEqual([[midnight, end, minutes[1]]]);
  });
  it('an open interval is measured to the supplied time and clipped to the range', () => {
    const state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    const slices = recordedSlices(state, { start: t('14:10'), end: t('14:30') }, '2026-09-21T14:20:30.000Z');
    expect(slices).toEqual([expect.objectContaining({ start: t('14:10'), end: '2026-09-21T14:20:30.000Z', minutes: 10, open: true })]);
    expect(recordedSlices(state, { start: t('14:10'), end: t('14:30') }, t('15:00'))).toEqual([expect.objectContaining({ end: t('14:30'), minutes: 20, open: true })]);
    expect(recordedSlices(state, { start: t('15:00'), end: t('16:00') }, t('14:20'))).toEqual([]);
    expect(recordedSlices(state, { start: t('13:00'), end: t('16:00') }, t('14:20'), { target: taskTarget('b') })).toEqual([]);
  });
  it('minutes are floored over the summed time, so seconds never round a total up', () => {
    let state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, '2026-09-21T14:00:00.000Z');
    const id = state.workSessions[0].id;
    state = run(state, { type: 'session.pause', id }, '2026-09-21T14:00:40.000Z');
    state = run(state, { type: 'session.resume', id }, '2026-09-21T14:10:00.000Z');
    state = run(state, { type: 'session.pause', id }, '2026-09-21T14:10:40.000Z');
    expect(recordedMinutes(state.workSessions[0], t('15:00'))).toBe(1);
    expect(recordedSlices(state, { start: t('13:00'), end: t('16:00') }, t('15:00')).map(slice => slice.minutes)).toEqual([0, 0]);
  });
});

describe('a day opening during running work', () => {
  it('T23: Start Day splits the running interval at command time, never at the wake time', () => {
    let state = run(capture(initialState(), 'a'), { type: 'session.start', target: taskTarget('a') }, t('13:00'));
    state = run(state, { type: 'day.start', date: '2026-09-21', wakeAt: t('11:00') }, t('14:00'));
    const day = state.days[0];
    expect(day.startedAt).toBe(t('11:00'));
    expect(state.workSessions).toHaveLength(1);
    expect(state.workSessions[0].intervals).toEqual([
      { start: t('13:00'), end: t('14:00'), contextDate: '2026-09-21', timezone: 'America/New_York' },
      { start: t('14:00'), dayId: day.id, contextDate: '2026-09-21', timezone: 'America/New_York' },
    ]);
    expect(sessionState(state.workSessions[0])).toBe('running');
    expect(recordedMinutes(state.workSessions[0], t('14:30'))).toBe(90);
  });
  it('T29: the split keeps the booking on both segments and changes only the day context', () => {
    let state = book(capture(initialState(), 'a'), 'slot', 'task', t('13:00'), 'a');
    state = run(state, { type: 'block.start', id: 'slot' }, t('13:00'));
    state = run(state, { type: 'day.start', date: '2026-09-21' }, t('14:00'));
    const intervals = state.workSessions[0].intervals;
    expect(intervals.map(interval => interval.plannedBlockId)).toEqual(['slot', 'slot']);
    expect(intervals.map(interval => interval.dayId)).toEqual([undefined, state.days[0].id]);
    expect(intervals[0].end).toBe(intervals[1].start);
    expect(state.blocks[0]).toMatchObject({ actualStart: t('13:00'), status: 'pending' });
    expect(state.blocks[0].actualEnd).toBeUndefined();
    expect(recordedMinutesForBlock(state, 'slot', t('14:30'))).toBe(90);
  });
  it('reopening today splits running unassociated work the same way; paused work is left alone', () => {
    let state = run(twoTasks(), { type: 'day.start', date: '2026-09-21' }, t('12:00'));
    state = run(state, { type: 'day.end', id: state.days[0].id }, t('13:00'));
    state = run(state, { type: 'session.start', target: taskTarget('a') }, t('13:10'));
    state = run(state, { type: 'session.pause', id: state.workSessions[0].id }, t('13:20'));
    state = run(state, { type: 'session.start', target: taskTarget('b') }, t('13:30'));
    state = run(state, { type: 'day.reopen', id: state.days[0].id }, t('14:00'));
    expect(sessionOf(state, 'a').intervals).toEqual([expect.not.objectContaining({ dayId: expect.anything() })]);
    expect(sessionOf(state, 'b').intervals).toEqual([
      expect.objectContaining({ start: t('13:30'), end: t('14:00') }),
      expect.objectContaining({ start: t('14:00'), dayId: state.days[0].id }),
    ]);
  });
  it('a repeated Start Day on a started day does not split again', () => {
    let state = run(capture(initialState(), 'a'), { type: 'day.start', date: '2026-09-21' }, t('12:00'));
    state = run(state, { type: 'session.start', target: taskTarget('a') }, t('13:00'));
    const again = run(state, { type: 'day.start', date: '2026-09-21' }, t('14:00'));
    expect(again.workSessions).toEqual(state.workSessions);
  });
});

describe('bookings and the compatibility projection', () => {
  const linked = () => book(twoTasks(), 'slot', 'task', t('14:00'), 'a');
  it('T24: the first start is kept, a pause stamps no end, and the terminal action stamps the end', () => {
    let state = run(linked(), { type: 'block.snooze', id: 'slot', until: t('15:00') }, t('13:30'));
    state = run(state, { type: 'block.start', id: 'slot' }, t('14:00'));
    const id = state.workSessions[0].id;
    expect(state.blocks[0]).toMatchObject({ actualStart: t('14:00'), status: 'pending' });
    expect(state.blocks[0].snoozedUntil).toBeUndefined();
    expect(isSessionBacked(state, 'slot')).toBe(true);
    state = run(state, { type: 'session.pause', id }, t('14:10'));
    expect(state.blocks[0].actualStart).toBe(t('14:00'));
    expect(state.blocks[0].actualEnd).toBeUndefined();
    expect(runningSession(state)).toBeUndefined();
    expect(sessionState(state.workSessions[0])).toBe('paused');
    state = run(state, { type: 'session.resume', id, plannedBlockId: 'slot' }, t('14:30'));
    expect(state.blocks[0].actualStart).toBe(t('14:00'));
    state = run(state, { type: 'session.stop', id }, t('14:40'));
    expect(state.blocks[0]).toMatchObject({ actualStart: t('14:00'), actualEnd: t('14:40'), status: 'pending' });
    expect(recordedMinutesForBlock(state, 'slot', t('16:00'))).toBe(20);
    expect(state.tasks.find(task => task.id === 'a')?.status).toBe('open');
  });
  it('T24: stopping paused work stamps the booking at the stop, not at the pause', () => {
    let state = run(linked(), { type: 'session.start', target: taskTarget('a'), plannedBlockId: 'slot' }, t('14:00'));
    state = run(state, { type: 'session.pause', id: state.workSessions[0].id }, t('14:10'));
    state = run(state, { type: 'session.stop', id: state.workSessions[0].id }, t('14:50'));
    expect(state.blocks[0].actualEnd).toBe(t('14:50'));
    expect(state.workSessions[0].intervals).toEqual([expect.objectContaining({ end: t('14:10') })]);
    expect(recordedMinutes(state.workSessions[0], t('16:00'))).toBe(10);
  });
  it('block.start keeps the legacy collision code and adds the running session', () => {
    let state = book(linked(), 'other', 'task', t('16:00'), 'b');
    state = run(state, { type: 'block.start', id: 'slot' }, t('14:00'));
    const error = refuse(state, { type: 'block.start', id: 'other' }, t('14:05'), 'ACTIVE_TASK');
    expect(error.details).toEqual({ runningSession: { id: state.workSessions[0].id, state: 'running', target: taskTarget('a') } });
    const repeated = run(state, { type: 'block.start', id: 'slot' }, t('14:06'));
    expect(repeated.workSessions).toEqual(state.workSessions);
    expect(repeated.blocks).toEqual(state.blocks);
  });
  it('T27: work resumed under another booking keeps each interval, projection and total with its own booking', () => {
    let state = run(linked(), { type: 'block.start', id: 'slot' }, t('14:00'));
    const id = state.workSessions[0].id;
    state = run(state, { type: 'session.pause', id }, t('14:10'));
    // Synthetic fixture for a re-planned booking: the planning command belongs to a later track.
    state = structuredClone(state);
    Object.assign(state.blocks[0], { status: 'missed', changeReason: 'replanned', supersededById: 'slot-2' });
    state.blocks.push({ ...state.blocks[0], id: 'slot-2', status: 'pending', start: t('14:30'), end: t('15:30'), rescheduledFromId: 'slot', actualStart: undefined, changeReason: undefined, supersededById: undefined });
    state = run(state, { type: 'session.resume', id, plannedBlockId: 'slot-2' }, t('14:30'));
    state = run(state, { type: 'session.pause', id }, t('14:50'));
    expect(state.workSessions[0].intervals.map(interval => [interval.plannedBlockId, interval.start, interval.end])).toEqual([['slot', t('14:00'), t('14:10')], ['slot-2', t('14:30'), t('14:50')]]);
    expect(state.blocks[0]).toMatchObject({ actualStart: t('14:00'), actualEnd: t('14:10') });
    expect(state.blocks[1].actualStart).toBe(t('14:30'));
    expect(state.blocks[1].actualEnd).toBeUndefined();
    expect(recordedMinutesForBlock(state, 'slot', t('16:00'))).toBe(10);
    expect(recordedMinutesForBlock(state, 'slot-2', t('16:00'))).toBe(20);
    state = run(state, { type: 'session.stop', id }, t('15:00'));
    expect(state.blocks[0].actualEnd).toBe(t('14:10'));
    expect(state.blocks[1].actualEnd).toBe(t('15:00'));
  });
  it('T28: a resume without a booking is unscheduled and inherits nothing', () => {
    let state = run(linked(), { type: 'block.start', id: 'slot' }, t('14:00'));
    const id = state.workSessions[0].id;
    state = run(state, { type: 'session.pause', id }, t('14:10'));
    state = run(state, { type: 'session.resume', id }, t('14:30'));
    expect(state.workSessions[0].intervals[0].plannedBlockId).toBe('slot');
    expect(state.workSessions[0].intervals[1]).not.toHaveProperty('plannedBlockId');
    expect(state.blocks[0]).toMatchObject({ status: 'pending', actualStart: t('14:00'), actualEnd: t('14:10') });
    expect(recordedMinutesForBlock(state, 'slot', t('15:00'))).toBe(10);
    expect(recordedMinutes(state.workSessions[0], t('15:00'))).toBe(40);
  });
  it('T28: a booking of another task, a resolved booking or a different booking while running is refused whole', () => {
    let state = book(linked(), 'other', 'task', t('16:00'), 'b');
    refuse(state, { type: 'session.start', target: taskTarget('a'), plannedBlockId: 'other' }, t('14:00'), 'BOOKING_MISMATCH');
    refuse(state, { type: 'session.start', target: taskTarget('a'), plannedBlockId: 'missing' }, t('14:00'), 'BOOKING_MISMATCH');
    state = run(state, { type: 'session.start', target: taskTarget('a') }, t('14:00'));
    refuse(state, { type: 'session.start', target: taskTarget('a'), plannedBlockId: 'slot' }, t('14:05'), 'BOOKING_MISMATCH');
    refuse(state, { type: 'session.switch', expectedRunningSessionId: state.workSessions[0].id, target: taskTarget('b'), plannedBlockId: 'slot' }, t('14:05'), 'BOOKING_MISMATCH');
    state = run(state, { type: 'session.pause', id: state.workSessions[0].id }, t('14:10'));
    state = run(state, { type: 'block.resolve', id: 'slot', outcome: 'missed' }, t('14:15'));
    refuse(state, { type: 'session.resume', id: state.workSessions[0].id, plannedBlockId: 'slot' }, t('14:20'), 'BOOKING_MISMATCH');
    refuse(state, { type: 'session.start', target: { kind: 'routine', blockId: 'slot' } }, t('14:20'), 'TARGET_UNAVAILABLE');
  });
  it('not completed or cancelled ends the recording only when it was last made under that block', () => {
    let state = run(linked(), { type: 'block.start', id: 'slot' }, t('14:00'));
    const id = state.workSessions[0].id;
    state = run(state, { type: 'session.pause', id }, t('14:10'));
    const under = run(state, { type: 'block.resolve', id: 'slot', outcome: 'missed' }, t('14:20'));
    expect(under.workSessions[0]).toMatchObject({ endedAt: t('14:20'), endReason: 'stopped' });
    expect(under.blocks[0]).toMatchObject({ status: 'missed', actualEnd: t('14:20') });
    expect(under.taskOutcomes).toEqual([]);
    state = run(state, { type: 'session.resume', id }, t('14:30'));
    const elsewhere = run(state, { type: 'block.resolve', id: 'slot', outcome: 'cancelled' }, t('14:40'));
    expect(sessionState(elsewhere.workSessions[0])).toBe('running');
    expect(elsewhere.blocks[0]).toMatchObject({ status: 'cancelled', actualEnd: t('14:10') });
  });
  it('archiving a block cancels it and ends the recording made under it', () => {
    let state = run(linked(), { type: 'block.start', id: 'slot' }, t('14:00'));
    state = run(state, { type: 'record.archive', collection: 'blocks', id: 'slot', archived: true }, t('14:15'));
    expect(state.blocks[0]).toMatchObject({ status: 'cancelled', archived: true, actualEnd: t('14:15') });
    expect(state.workSessions[0]).toMatchObject({ endedAt: t('14:15'), endReason: 'archived' });
    expect(state.tasks.find(task => task.id === 'a')?.status).toBe('open');
  });
  it('a booking with recorded work cannot be moved, also while its recording is paused', () => {
    let state = run(linked(), { type: 'block.start', id: 'slot' }, t('14:00'));
    state = run(state, { type: 'session.pause', id: state.workSessions[0].id }, t('14:10'));
    const block = Object.fromEntries(Object.entries(state.blocks[0]).filter(([key]) => key !== 'createdAt' && key !== 'updatedAt')) as typeof state.blocks[number];
    refuse(state, { type: 'block.save', block: { ...block, start: t('16:00'), end: t('17:00') } }, t('14:20'), 'ACTIVE_TASK');
  });
  it('the effective role follows the stored choice, else the kind', () => {
    expect(blockFlexibility({ kind: 'appointment' })).toBe('fixed');
    expect(blockFlexibility({ kind: 'task' })).toBe('flexible');
    expect(blockFlexibility({ kind: 'routine' })).toBe('flexible');
    expect(blockFlexibility({ kind: 'appointment', flexibility: 'flexible' })).toBe('flexible');
    expect(blockFlexibility({ kind: 'task', flexibility: 'fixed' })).toBe('fixed');
  });
  it('a state that breaks a session invariant names the sessions and nothing else', () => {
    const state = structuredClone(run(twoTasks(), { type: 'session.start', target: taskTarget('a') }, t('14:00')));
    state.workSessions.push({ ...state.workSessions[0], id: 'second-open', target: taskTarget('b') });
    expect(sessionViolations(state).sort()).toEqual([state.workSessions[0].id, 'second-open'].sort());
    const error = refuse(state, { type: 'task.update', id: 'a', patch: { title: 'Renamed' } }, t('14:05'), 'INVALID_STATE');
    expect(error.details?.recordIds).toHaveLength(2);
  });
});
