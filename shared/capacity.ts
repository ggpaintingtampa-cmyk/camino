import type { CapacityResult, EntryConflict, InstantRange, TaskCredit } from './contracts';
import { localDayRange } from './dates';
import type { Block, DayPlanDraft, Flexibility, PlanWindow, State, Task } from './types';

export { localDayRange };

const MINUTE = 60000;
const ms = (instant: string) => Date.parse(instant);
const iso = (value: number) => new Date(value).toISOString();
const minutes = (value: number) => Math.floor(value / MINUTE);

/** The stored role, else fixed for an appointment and flexible for everything else. */
export function blockFlexibility(block: Pick<Block, 'kind' | 'flexibility'>): Flexibility {
  return block.flexibility ?? (block.kind === 'appointment' ? 'fixed' : 'flexible');
}
/** A live block that still holds its place: not archived, not cancelled, not missed. */
export function isPositionedLive(block: Block): boolean {
  return !block.archived && block.status !== 'cancelled' && block.status !== 'missed';
}

/** Intervals are half-open: one ending at 10:00 does not touch one starting at 10:00. */
export function clipInterval(interval: InstantRange, window: InstantRange): InstantRange | undefined {
  const start = Math.max(ms(interval.start), ms(window.start)), end = Math.min(ms(interval.end), ms(window.end));
  return end > start ? { start: iso(start), end: iso(end) } : undefined;
}
function unionMs(intervals: InstantRange[], window?: InstantRange): number {
  const clipped = intervals
    .map(interval => window ? clipInterval(interval, window) : ms(interval.end) > ms(interval.start) ? interval : undefined)
    .filter((interval): interval is InstantRange => !!interval)
    .map(interval => [ms(interval.start), ms(interval.end)] as const)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let total = 0, from = 0, to = 0, open = false;
  for (const [start, end] of clipped) {
    if (open && start <= to) { to = Math.max(to, end); continue; }
    if (open) total += to - from;
    from = start; to = end; open = true;
  }
  return open ? total + to - from : total;
}
export function unionMinutes(intervals: InstantRange[], window?: InstantRange): number { return minutes(unionMs(intervals, window)); }

function acknowledged(a: Block, b: Block): boolean {
  return !!a.acknowledgedConflictIds?.includes(b.id) || !!b.acknowledgedConflictIds?.includes(a.id) || !!a.conflictReviewed || !!b.conflictReviewed;
}
/** Overlaps among positioned-live entries inside the range. Reported apart from occupation, never folded into it. */
export function entryConflicts(state: State, range: InstantRange): EntryConflict[] {
  const entries = state.blocks.filter(block => isPositionedLive(block) && clipInterval(block, range))
    .sort((a, b) => ms(a.start) - ms(b.start) || ms(a.end) - ms(b.end) || a.id.localeCompare(b.id));
  const conflicts: EntryConflict[] = [];
  for (const [index, a] of entries.entries()) for (const b of entries.slice(index + 1)) {
    if (ms(b.start) >= ms(a.end)) break;
    const overlap = clipInterval({ start: iso(Math.max(ms(a.start), ms(b.start))), end: iso(Math.min(ms(a.end), ms(b.end))) }, range);
    if (!overlap) continue;
    conflicts.push({ aId: a.id, bId: b.id, start: overlap.start, end: overlap.end, minutes: minutes(ms(overlap.end) - ms(overlap.start)),
      involvesFixed: blockFlexibility(a) === 'fixed' || blockFlexibility(b) === 'fixed', acknowledged: acknowledged(a, b) });
  }
  return conflicts;
}

interface PlanInput { date: string; timezone: string; taskIds: string[]; window?: PlanWindow; protectedSpareMinutes: number }

function planInput(state: State, date: string): PlanInput {
  const plan = state.dayPlans.find(candidate => candidate.date === date && !candidate.archived);
  return plan ? { date, timezone: plan.timezone, taskIds: plan.taskIds, window: plan.window, protectedSpareMinutes: plan.protectedSpareMinutes }
    : { date, timezone: state.settings.timezone, taskIds: [], protectedSpareMinutes: 0 };
}
function draftInput(state: State, draft: DayPlanDraft): PlanInput {
  const stored = state.dayPlans.find(candidate => candidate.date === draft.date && !candidate.archived);
  return { date: draft.date, timezone: draft.timezone ?? stored?.timezone ?? state.settings.timezone, taskIds: draft.taskIds, window: draft.window, protectedSpareMinutes: draft.protectedSpareMinutes };
}

function calculate(state: State, plan: PlanInput, now?: string): CapacityResult {
  const scope = now === undefined ? 'full-day' : 'remaining-day';
  const day = localDayRange(plan.date, plan.timezone);
  // The plan range is the date extended to cover an overnight window, so work booked inside
  // the window after midnight is credited to this plan rather than counted as unplaced.
  const planRange: InstantRange = plan.window
    ? { start: iso(Math.min(ms(day.start), ms(plan.window.start))), end: iso(Math.max(ms(day.end), ms(plan.window.end))) } : day;
  const elapsed = !!plan.window && now !== undefined && ms(now) >= ms(plan.window.end);
  const window: PlanWindow | undefined = !plan.window ? undefined
    : now === undefined ? plan.window
      : elapsed ? { start: plan.window.end, end: plan.window.end }
        : { start: iso(Math.max(ms(now), ms(plan.window.start))), end: plan.window.end };
  const measured: InstantRange = window ?? day;
  const creditRange: InstantRange = now === undefined ? planRange
    : { start: iso(Math.min(Math.max(ms(now), ms(planRange.start)), ms(planRange.end))), end: planRange.end };

  const entries = state.blocks.filter(isPositionedLive);
  const fixedMs = unionMs(entries.filter(block => blockFlexibility(block) === 'fixed'), measured);
  const occupiedMs = unionMs(entries, measured);
  const fixedMinutes = minutes(fixedMs), occupiedMinutes = minutes(occupiedMs);

  const selected = plan.taskIds.map(id => state.tasks.find(task => task.id === id))
    .filter((task): task is Task => !!task && !task.archived && task.status === 'open');
  const credits: TaskCredit[] = [];
  const unestimatedTaskIds: string[] = [];
  for (const task of selected) {
    if (task.duration === undefined) { unestimatedTaskIds.push(task.id); continue; }
    // Only the task's current pending placement reserves time for it; resolved bookings are history.
    const placements = state.blocks.filter(block => !block.archived && block.kind === 'task' && block.taskId === task.id && block.status === 'pending');
    const creditedMinutes = Math.min(task.duration, unionMinutes(placements, creditRange));
    const insideWindow = window ? Math.min(task.duration, minutes(unionMs(placements.map(block => clipInterval(block, creditRange)).filter((value): value is InstantRange => !!value), window))) : creditedMinutes;
    credits.push({ taskId: task.id, estimateMinutes: task.duration, creditedMinutes, outOfWindowCreditMinutes: creditedMinutes - insideWindow, unplacedMinutes: task.duration - creditedMinutes });
  }
  const unplacedDemandMinutes = credits.reduce((sum, credit) => sum + credit.unplacedMinutes, 0);

  const onDate = entries.filter(block => clipInterval(block, day));
  const inside = (block: Block) => !!plan.window && ms(block.start) >= ms(plan.window.start) && ms(block.end) <= ms(plan.window.end);
  const result: CapacityResult = {
    status: !plan.window ? 'window-missing' : elapsed ? 'window-elapsed' : 'ok', scope, date: plan.date, timezone: plan.timezone,
    estimateBasis: 'unchanged-estimate', fixedMinutes, flexibleMinutes: occupiedMinutes - fixedMinutes, occupiedMinutes,
    protectedSpareMinutes: plan.protectedSpareMinutes, unplacedDemandMinutes, credits, unestimatedTaskIds,
    conflicts: entryConflicts(state, now === undefined ? planRange : measured),
    outsideWindowIds: plan.window ? onDate.filter(block => !clipInterval(block, plan.window!)).map(block => block.id) : [],
    partlyOutsideWindowIds: plan.window ? onDate.filter(block => clipInterval(block, plan.window!) && !inside(block)).map(block => block.id) : [],
  };
  if (window) {
    const windowMinutes = minutes(ms(window.end) - ms(window.start));
    const balance = windowMinutes - occupiedMinutes - plan.protectedSpareMinutes - unplacedDemandMinutes;
    Object.assign(result, { window, windowMinutes, knownBalanceMinutes: balance, unallocatedMinutes: Math.max(0, balance), overloadMinutes: Math.max(0, -balance) });
  }
  return result;
}

/** The whole planning window of a date. Without a chosen window nothing is assumed and no balance is returned. */
export function capacityForPlan(state: State, date: string): CapacityResult { return calculate(state, planInput(state, date)); }
/** What is left from `now`: the window starts at `now`, and only time still to come is occupied or credited. */
export function capacityForRemainingDay(state: State, date: string, now: string): CapacityResult { return calculate(state, planInput(state, date), now); }
/** The same arithmetic for choices that are not saved yet. Passing `now` measures the remaining day. */
export function capacityForDraft(state: State, draft: DayPlanDraft, now?: string): CapacityResult { return calculate(state, draftInput(state, draft), now); }
