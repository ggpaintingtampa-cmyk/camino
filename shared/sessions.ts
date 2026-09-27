import type { DayClosePreview, InstantRange, RecordedSlice, SessionRef, SessionState } from './contracts';
import type { Block, Command, Day, SessionEndReason, SessionTarget, State, WorkInterval, WorkSession } from './types';
import { dateKey } from './dates';
import { blockFlexibility, bump, createBase, fail, isInDay, openDay, type CommandContext } from './domain-core';

export { blockFlexibility };
export type SessionCommand = Extract<Command, { type: 'session.start' | 'session.pause' | 'session.resume' | 'session.switch' | 'session.stop' }>;
/** Narrows recorded slices. Every member that is present must match. */
export interface SliceFilter { sessionId?: string; target?: SessionTarget; plannedBlockId?: string; dayId?: string }
export type DayCloseEntrySet = 'ended' | 'legacy';
type Unfinished = 'running' | 'paused';

const at = (instant: string) => Date.parse(instant);
const lastWhere = <T>(list: T[], test: (item: T) => unknown): T | undefined => [...list].reverse().find(test);

// ── Selectors ───────────────────────────────────────────────────────────────
export function sameTarget(a: SessionTarget, b: SessionTarget): boolean {
  return a.kind === 'task' ? b.kind === 'task' && a.taskId === b.taskId : b.kind === 'routine' && a.blockId === b.blockId;
}
export function sessionState(session: WorkSession): SessionState {
  if (session.endedAt) return 'ended';
  const last = session.intervals.at(-1);
  return last && !last.end ? 'running' : 'paused';
}
export function sessionRef(session: WorkSession): SessionRef {
  return { id: session.id, state: sessionState(session) as Unfinished, target: { ...session.target } };
}
export function runningSession(state: State): WorkSession | undefined {
  return state.workSessions.find(session => sessionState(session) === 'running');
}
export function unfinishedSessions(state: State): WorkSession[] {
  return state.workSessions.filter(session => !session.endedAt);
}
export function unfinishedSessionForTarget(state: State, target: SessionTarget): WorkSession | undefined {
  return state.workSessions.find(session => !session.endedAt && sameTarget(session.target, target));
}
export function sessionsAssociatedWithDay(state: State, dayId: string): WorkSession[] {
  return unfinishedSessions(state).filter(session => session.intervals.at(-1)?.dayId === dayId);
}
export function isSessionBacked(state: State, blockId: string): boolean {
  return state.workSessions.some(session => session.intervals.some(interval => interval.plannedBlockId === blockId));
}
/** Recorded work in the vocabulary of the contract: a session interval names the block, or it carries a legacy start. */
export function hasRecordedWork(state: State, block: Block): boolean {
  return !!block.actualStart || isSessionBacked(state, block.id);
}

/** A backward clock can make `now` precede an open interval's start; that measures zero, never a negative span. */
function span(interval: WorkInterval, now: string, range?: InstantRange): { start: number; end: number } | undefined {
  let start = at(interval.start), end = interval.end ? at(interval.end) : Math.max(start, at(now));
  if (range) { start = Math.max(start, at(range.start)); end = Math.min(end, at(range.end)); if (end <= start) return undefined; }
  return { start, end };
}
const floorMinutes = (ms: number) => Math.floor(ms / 60000);

export function recordedSlices(state: State, range: InstantRange, now: string, filter: SliceFilter = {}): RecordedSlice[] {
  const slices: RecordedSlice[] = [];
  for (const session of state.workSessions) {
    if (filter.sessionId !== undefined && session.id !== filter.sessionId) continue;
    if (filter.target && !sameTarget(session.target, filter.target)) continue;
    for (const interval of session.intervals) {
      if (filter.plannedBlockId !== undefined && interval.plannedBlockId !== filter.plannedBlockId) continue;
      if (filter.dayId !== undefined && interval.dayId !== filter.dayId) continue;
      const clipped = span(interval, now, range);
      if (!clipped) continue;
      slices.push({
        sessionId: session.id, target: { ...session.target }, start: new Date(clipped.start).toISOString(), end: new Date(clipped.end).toISOString(),
        minutes: floorMinutes(clipped.end - clipped.start), open: !interval.end, contextDate: interval.contextDate, timezone: interval.timezone,
        ...(interval.dayId ? { dayId: interval.dayId } : {}), ...(interval.plannedBlockId ? { plannedBlockId: interval.plannedBlockId } : {}),
      });
    }
  }
  return slices.sort((a, b) => at(a.start) - at(b.start));
}
export function recordedMinutes(session: WorkSession, now: string): number {
  return floorMinutes(session.intervals.reduce((total, interval) => { const s = span(interval, now)!; return total + s.end - s.start; }, 0));
}
export function recordedMinutesForBlock(state: State, blockId: string, now: string): number {
  let total = 0;
  for (const session of state.workSessions) for (const interval of session.intervals) {
    if (interval.plannedBlockId === blockId) { const s = span(interval, now)!; total += s.end - s.start; }
  }
  return floorMinutes(total);
}

/** The booking under which an unfinished session last recorded, when that session is not among `except`. */
function heldBookings(state: State, except: WorkSession[]): Set<string> {
  const held = new Set<string>();
  for (const session of unfinishedSessions(state)) {
    const booking = session.intervals.at(-1)?.plannedBlockId;
    if (booking && !except.includes(session)) held.add(booking);
  }
  return held;
}
/**
 * What a close does to each pending entry that belongs to the day. `day.close` marks only
 * entries that have ended; legacy `day.end` keeps its whole-day set. An entry that is the
 * current booking of work continuing past the close stays pending: marking it would leave
 * a recording under a resolved booking.
 */
export function dayCloseEntries(state: State, day: Day, now: string, entrySet: DayCloseEntrySet = 'ended'): { block: Block; effect: DayClosePreview['pendingEntries'][number]['effect'] }[] {
  const held = heldBookings(state, sessionsAssociatedWithDay(state, day.id));
  return state.blocks.filter(block => !block.archived && block.status === 'pending' && isInDay(state, day, block.start, now)).map(block => ({
    block,
    effect: block.kind === 'appointment' ? 'left-unreviewed' as const
      : held.has(block.id) || (entrySet === 'ended' && at(block.end) > at(now)) ? 'left-pending' as const : 'marked-not-completed' as const,
  }));
}
export function previewDayClose(state: State, dayId: string, now: string): DayClosePreview {
  const day = state.days.find(d => d.id === dayId);
  const base = { baseRevision: state.revision, dayId, associatedSessions: [], continuingSessions: [], pendingEntries: [], expectedSessions: [] };
  if (!day) return { ...base, valid: false, error: { code: 'NOT_FOUND', message: 'This day could not be found. Refresh and try again.' }, date: '', open: false, crossesMidnight: false };
  const crossesMidnight = dateKey(day.endedAt || now, state.settings.timezone) !== day.date;
  if (day.archived) return { ...base, valid: false, error: { code: 'ARCHIVED', message: 'Restore this day before closing it.' }, date: day.date, open: false, crossesMidnight };
  if (day.endedAt) return { ...base, valid: true, date: day.date, open: false, crossesMidnight };
  const measured = (session: WorkSession) => ({ ...sessionRef(session), recordedMinutes: recordedMinutes(session, now) });
  const associated = sessionsAssociatedWithDay(state, day.id);
  const running = runningSession(state);
  return {
    ...base, valid: true, date: day.date, open: true, crossesMidnight,
    associatedSessions: associated.map(measured),
    continuingSessions: running && !associated.includes(running) ? [measured(running)] : [],
    pendingEntries: dayCloseEntries(state, day, now).map(({ block, effect }) => ({ blockId: block.id, kind: block.kind, effect })),
    expectedSessions: associated.map(session => ({ id: session.id, state: sessionState(session) as Unfinished })),
  };
}

/** Invariants of contract 2.5. Returns the IDs of the sessions that break one; empty when the state is sound. */
export function sessionViolations(state: State): string[] {
  const broken = new Set<string>();
  const running = state.workSessions.filter(session => session.intervals.some(interval => !interval.end));
  if (running.length > 1) for (const session of running) broken.add(session.id);
  const unfinished = unfinishedSessions(state);
  for (const session of state.workSessions) {
    const { intervals, target } = session;
    if (!session.endedAt && unfinished.some(other => other !== session && sameTarget(other.target, target))) broken.add(session.id);
    intervals.forEach((interval, index) => {
      const last = index === intervals.length - 1;
      if (!interval.end ? !last || !!session.endedAt : at(interval.end) < at(interval.start)) broken.add(session.id);
      if (index > 0 && at(interval.start) < at(intervals[index - 1].end ?? interval.start)) broken.add(session.id);
      if (interval.dayId && !state.days.some(day => day.id === interval.dayId)) broken.add(session.id);
      if (target.kind === 'routine' && interval.plannedBlockId !== target.blockId) broken.add(session.id);
      if (interval.plannedBlockId) {
        const block = state.blocks.find(b => b.id === interval.plannedBlockId);
        if (!block || (target.kind === 'task' ? block.kind !== 'task' || block.taskId !== target.taskId : block.kind !== 'routine')) broken.add(session.id);
      }
    });
  }
  return [...broken];
}

// ── Transitions ─────────────────────────────────────────────────────────────
// One function per action. The session commands and the legacy adapters both call these.

function assertClock(session: WorkSession, now: string) {
  const last = session.intervals.at(-1);
  const latest = Math.max(last ? at(last.end ?? last.start) : 0, session.endedAt ? at(session.endedAt) : 0);
  if (at(now) < latest) fail('The clock moved backwards, so nothing was recorded. Try again in a moment.', 'CLOCK_REGRESSION', 409);
}
function assertTarget({ state }: CommandContext, target: SessionTarget) {
  if (target.kind === 'task') {
    const task = state.tasks.find(t => t.id === target.taskId);
    if (!task || task.archived || task.status !== 'open') fail('This task cannot be recorded. Only an open task can.', 'TARGET_UNAVAILABLE', 409);
  } else {
    const block = state.blocks.find(b => b.id === target.blockId);
    if (!block || block.archived || block.kind !== 'routine' || block.status !== 'pending') fail('This entry cannot be recorded. Only a pending routine can.', 'TARGET_UNAVAILABLE', 409);
  }
}
/** A routine is always recorded under its own block. A task records under the named booking, or unscheduled. */
function requestedBooking(target: SessionTarget, plannedBlockId?: string): string | undefined {
  if (target.kind !== 'routine') return plannedBlockId;
  if (plannedBlockId !== undefined && plannedBlockId !== target.blockId) fail('A routine is recorded under its own entry.', 'BOOKING_MISMATCH', 409);
  return target.blockId;
}
function assertBooking({ state }: CommandContext, target: SessionTarget, booking?: string) {
  if (!booking || target.kind === 'routine') return;
  const block = state.blocks.find(b => b.id === booking);
  if (!block || block.archived || block.status !== 'pending' || block.kind !== 'task' || block.taskId !== target.taskId) fail('This booking is not an open booking of this task. Refresh and choose again.', 'BOOKING_MISMATCH', 409);
}
function lastBooking(session: WorkSession): string | undefined {
  return lastWhere(session.intervals, interval => interval.plannedBlockId)?.plannedBlockId;
}
function openInterval({ state, now }: CommandContext, session: WorkSession, booking?: string) {
  const zone = state.settings.timezone, day = openDay(state);
  const previous = lastBooking(session);
  if (previous && previous !== booking) {
    // The same target moves on: the earlier booking's projection ends with its own last interval.
    const block = state.blocks.find(b => b.id === previous);
    const end = lastWhere(session.intervals, interval => interval.plannedBlockId === previous)?.end;
    if (block && end && !block.actualEnd) { block.actualEnd = end; bump(block, now); }
  }
  if (booking) {
    const block = state.blocks.find(b => b.id === booking);
    if (block) {
      if (!isSessionBacked(state, booking)) delete block.snoozedUntil;
      block.actualStart ||= now; delete block.actualEnd; bump(block, now);
    }
  }
  session.intervals.push({ start: now, ...(day ? { dayId: day.id } : {}), contextDate: dateKey(now, zone), timezone: zone, ...(booking ? { plannedBlockId: booking } : {}) });
  bump(session, now);
}
function closeInterval(session: WorkSession, now: string) {
  const last = session.intervals.at(-1);
  if (last && !last.end) last.end = now;
  bump(session, now);
}

export type CollisionCode = 'SESSION_RUNNING' | 'ACTIVE_TASK';
/** Opens an interval for the target, creating its session or resuming the paused one. */
export function startSession(context: CommandContext, target: SessionTarget, plannedBlockId?: string, collision: CollisionCode = 'SESSION_RUNNING'): WorkSession {
  const { state, now } = context;
  assertTarget(context, target);
  const booking = requestedBooking(target, plannedBlockId);
  const running = runningSession(state);
  if (running && sameTarget(running.target, target)) {
    if (running.intervals.at(-1)?.plannedBlockId === booking) return running;
    fail('This work is already being recorded under another booking. Pause it first, then resume here.', 'BOOKING_MISMATCH', 409);
  }
  if (running) {
    fail(collision === 'ACTIVE_TASK' ? 'Finish, partially complete or return your current task to the list before starting another.' : 'Other work is being recorded. Pause it or switch to this task.',
      collision, 409, { runningSession: sessionRef(running) });
  }
  assertBooking(context, target, booking);
  let session = unfinishedSessionForTarget(state, target);
  if (session) assertClock(session, now);
  else { session = { ...createBase(now), target: { ...target }, intervals: [], provenance: 'native' }; state.workSessions.push(session); }
  openInterval(context, session, booking);
  return session;
}
export function pauseSession({ now }: CommandContext, session: WorkSession) {
  if (session.endedAt) fail('This recording has ended. Start the task again to record more.', 'SESSION_ENDED', 409);
  if (sessionState(session) === 'paused') return;
  assertClock(session, now);
  closeInterval(session, now);
}
/** Ends recording. The latest attributed booking takes the command time, unless an earlier action already projected its end. */
export function endSession({ state, now }: CommandContext, session: WorkSession, reason: SessionEndReason) {
  if (session.endedAt) return;
  assertClock(session, now);
  closeInterval(session, now);
  session.endedAt = now; session.endReason = reason;
  const booking = lastBooking(session), block = booking ? state.blocks.find(b => b.id === booking) : undefined;
  if (block && !block.actualEnd) { block.actualEnd = now; bump(block, now); }
}
export function endSessionForTarget(context: CommandContext, target: SessionTarget, reason: SessionEndReason): WorkSession | undefined {
  const session = unfinishedSessionForTarget(context.state, target);
  if (session) endSession(context, session, reason);
  return session;
}
/** Ends the unfinished session whose latest interval was recorded under this booking. */
export function endSessionUnderBooking(context: CommandContext, blockId: string, reason: SessionEndReason): WorkSession | undefined {
  const session = unfinishedSessions(context.state).find(s => s.intervals.at(-1)?.plannedBlockId === blockId);
  if (session) endSession(context, session, reason);
  return session;
}
/**
 * Gives a block its final status. A session-backed block keeps the projection its session
 * wrote; a legacy block keeps the legacy rule.
 */
export function settleBlock({ state, now }: CommandContext, block: Block, status: Block['status'], change: Pick<Block, 'changeReason' | 'changeSource' | 'supersededById'> = {}) {
  block.status = status;
  if (isSessionBacked(state, block.id)) {
    if (!block.actualEnd) block.actualEnd = lastWhere(state.workSessions.flatMap(s => s.intervals), i => i.plannedBlockId === block.id)?.end ?? now;
  } else if (block.actualStart) block.actualEnd = now;
  else delete block.actualEnd;
  delete block.snoozedUntil;
  Object.assign(block, change);
  bump(block, now);
}
/** A day became open while unassociated work was running: the context changes at command time, the booking does not. */
export function splitRunningIntervalForDay({ state, now }: CommandContext, day: Day) {
  const running = runningSession(state), open = running?.intervals.at(-1);
  if (!running || !open || open.dayId) return;
  assertClock(running, now);
  const zone = state.settings.timezone;
  open.end = now;
  running.intervals.push({ start: now, dayId: day.id, contextDate: dateKey(now, zone), timezone: zone, ...(open.plannedBlockId ? { plannedBlockId: open.plannedBlockId } : {}) });
  bump(running, now);
}

function sessionById(state: State, id: string): WorkSession {
  const session = state.workSessions.find(s => s.id === id);
  if (!session) fail('This recording could not be found. Refresh and try again.', 'NOT_FOUND', 404);
  return session;
}

/** Recorded work. Mutates the cloned state in `context`; the caller owns the revision. */
export function applySessionCommand(context: CommandContext, command: SessionCommand): void {
  const { state } = context;
  switch (command.type) {
    case 'session.start': startSession(context, command.target, command.plannedBlockId); break;
    case 'session.pause': pauseSession(context, sessionById(state, command.id)); break;
    case 'session.resume': {
      const session = sessionById(state, command.id);
      if (session.endedAt) fail('This recording has ended. Start the task again to record more.', 'SESSION_ENDED', 409);
      startSession(context, session.target, command.plannedBlockId); break;
    }
    case 'session.switch': {
      const running = runningSession(state);
      if (!running || running.id !== command.expectedRunningSessionId) {
        fail('The work being recorded changed since you chose to switch. Review it again.', 'SESSION_SWITCH_STALE', 409, running ? { runningSession: sessionRef(running) } : undefined);
      }
      if (sameTarget(running.target, command.target)) fail('Choose different work to switch to.');
      // Checked before the pause so a rejected switch reports the target's own reason.
      assertTarget(context, command.target);
      assertBooking(context, command.target, requestedBooking(command.target, command.plannedBlockId));
      pauseSession(context, running);
      startSession(context, command.target, command.plannedBlockId); break;
    }
    case 'session.stop': endSession(context, sessionById(state, command.id), 'stopped'); break;
  }
}
