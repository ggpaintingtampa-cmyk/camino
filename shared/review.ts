import { blockFlexibility, clipInterval, localDayRange, unionMinutes } from './capacity';
import type { DayFacts, InstantRange, LegacyCompletionFact, OutcomeFact, RecordedSlice, WeekFacts } from './contracts';
import { addDays } from './dates';
import { dayPlanForDate, zoneForDate } from './planning';
import { isSessionBacked, recordedSlices } from './sessions';
import type { Block, State, TaskOutcome } from './types';

const ms = (instant: string) => Date.parse(instant);
const within = (instant: string, range: InstantRange) => ms(instant) >= ms(range.start) && ms(instant) < ms(range.end);
const ALL_TIME: InstantRange = { start: new Date(0).toISOString(), end: new Date(8.64e15).toISOString() };
const sliceMinutes = (slices: RecordedSlice[]) => Math.floor(slices.reduce((sum, slice) => sum + ms(slice.end) - ms(slice.start), 0) / 60000);

/** A block that left the live plan. It is history: never planned time, never a completed task. */
const isHistory = (block: Block) => block.status === 'cancelled' || !!block.supersededById || !!block.changeReason;

/** The latest explicit outcome of each task inside the range decides how the task counts; a reopen counts as neither. */
function outcomeStanding(outcomes: TaskOutcome[], range: InstantRange): Map<string, TaskOutcome['kind']> {
  const standing = new Map<string, TaskOutcome['kind']>();
  for (const outcome of outcomes.filter(candidate => within(candidate.at, range)).sort((a, b) => ms(a.at) - ms(b.at))) standing.set(outcome.taskId, outcome.kind);
  return standing;
}
const idsWith = (standing: Map<string, TaskOutcome['kind']>, kind: TaskOutcome['kind']) => [...standing].filter(([, value]) => value === kind).map(([id]) => id);

/** Complete tasks the old build resolved: dated only through block evidence, and flagged approximate. */
function legacyCompletions(state: State, range: InstantRange): LegacyCompletionFact[] {
  const facts: LegacyCompletionFact[] = [];
  for (const task of state.tasks.filter(candidate => candidate.status === 'complete' && !state.taskOutcomes.some(outcome => outcome.taskId === candidate.id))) {
    const blocks = state.blocks.filter(block => block.taskId === task.id && block.status === 'complete');
    const actual = blocks.find(block => block.actualEnd && within(block.actualEnd, range));
    const scheduled = actual ? undefined : blocks.find(block => !block.actualEnd && within(block.start, range));
    if (actual) facts.push({ taskId: task.id, evidence: 'legacy-block-actual', blockId: actual.id, approximate: true });
    else if (scheduled) facts.push({ taskId: task.id, evidence: 'legacy-block-scheduled', blockId: scheduled.id, approximate: true });
  }
  return facts;
}

/**
 * What is recorded for one local date. Planned reservations, recorded intervals, legacy
 * evidence and unknown facts stay apart; nothing here infers a cause or a quality of work.
 */
export function factsForDay(state: State, date: string, now: string): DayFacts {
  const timezone = zoneForDate(state, date), range = localDayRange(date, timezone);
  const day = state.days.find(candidate => candidate.date === date && !candidate.archived);
  const plan = dayPlanForDate(state, date);
  const standing = outcomeStanding(state.taskOutcomes, range);
  const outcomes: OutcomeFact[] = state.taskOutcomes.filter(outcome => within(outcome.at, range)).sort((a, b) => ms(a.at) - ms(b.at)).map(outcome => ({
    outcomeId: outcome.id, taskId: outcome.taskId, kind: outcome.kind, at: outcome.at, source: outcome.source, selected: !!plan?.taskIds.includes(outcome.taskId),
    ...(outcome.blockId ? { blockId: outcome.blockId } : {}), ...(outcome.sessionId ? { sessionId: outcome.sessionId } : {}), ...(outcome.remainingTaskId ? { remainingTaskId: outcome.remainingTaskId } : {}),
  }));
  const reservations = state.blocks.filter(block => !block.archived && clipInterval(block, range)).sort((a, b) => ms(a.start) - ms(b.start) || a.id.localeCompare(b.id));
  const slices = recordedSlices(state, range, now);
  const dayRecord = day ? recordedSlices(state, ALL_TIME, now, { dayId: day.id }) : undefined;
  const unknown: DayFacts['unknown'] = [];
  if (!plan) unknown.push('plan');
  if (!day) unknown.push('day-record');
  if (!plan?.window) unknown.push('planning-window');
  return {
    date, timezone, range,
    ...(day ? { day: { id: day.id, ...(day.startedAt ? { startedAt: day.startedAt } : {}), ...(day.endedAt ? { endedAt: day.endedAt } : {}), open: !!day.startedAt && !day.endedAt } } : {}),
    ...(plan ? { plan: { id: plan.id, taskIds: [...plan.taskIds], ...(plan.mainTaskId ? { mainTaskId: plan.mainTaskId } : {}), protectedSpareMinutes: plan.protectedSpareMinutes,
      ...(plan.window ? { windowMinutes: Math.floor((ms(plan.window.end) - ms(plan.window.start)) / 60000) } : {}) } } : {}),
    selected: (plan?.taskIds ?? []).flatMap(id => {
      const task = state.tasks.find(candidate => candidate.id === id), kind = standing.get(id);
      return task ? [{ taskId: id, main: plan?.mainTaskId === id, status: task.status, archived: !!task.archived, ...(kind && kind !== 'reopen' ? { outcomeInRange: kind } : {}) }] : [];
    }),
    outcomes, completedTaskIds: idsWith(standing, 'complete'), partialTaskIds: idsWith(standing, 'partial'),
    legacyCompletions: legacyCompletions(state, range),
    reservations: reservations.map(block => {
      const clipped = clipInterval(block, range)!;
      return { blockId: block.id, kind: block.kind, flexibility: blockFlexibility(block), start: block.start, end: block.end, status: block.status,
        minutes: Math.floor((ms(clipped.end) - ms(clipped.start)) / 60000), history: isHistory(block),
        ...(block.changeReason ? { changeReason: block.changeReason } : {}), ...(block.changeSource ? { changeSource: block.changeSource } : {}), ...(block.supersededById ? { supersededById: block.supersededById } : {}) };
    }),
    plannedMinutes: unionMinutes(reservations.filter(block => !isHistory(block)), range),
    recorded: { minutes: sliceMinutes(slices), slices },
    ...(day && dayRecord ? { dayRecord: { dayId: day.id, minutes: sliceMinutes(dayRecord), slices: dayRecord } } : {}),
    // A legacy span counts only while no session represents its block, so no time is counted twice.
    legacyRecorded: state.blocks.filter(block => !block.archived && block.actualStart && block.actualEnd && !isSessionBacked(state, block.id)).flatMap(block => {
      const clipped = clipInterval({ start: block.actualStart!, end: block.actualEnd! }, range);
      return clipped ? [{ blockId: block.id, start: clipped.start, end: clipped.end, minutes: Math.floor((ms(clipped.end) - ms(clipped.start)) / 60000) }] : [];
    }),
    unknown,
  };
}

/** Seven consecutive local dates from `startDate`. Totals compare only what was recorded; no day is assumed planned. */
export function factsForWeek(state: State, startDate: string, now: string): WeekFacts {
  const timezone = state.settings.timezone, endDate = addDays(startDate, 6);
  const days = Array.from({ length: 7 }, (_, index) => factsForDay(state, addDays(startDate, index), now));
  const range: InstantRange = { start: localDayRange(startDate, timezone).start, end: localDayRange(endDate, timezone).end };
  const standing = outcomeStanding(state.taskOutcomes, range);
  const sum = (pick: (day: DayFacts) => number) => days.reduce((total, day) => total + pick(day), 0);
  return {
    startDate, endDate, timezone, range, days,
    totals: {
      plannedMinutes: sum(day => day.plannedMinutes), recordedMinutes: sum(day => day.recorded.minutes), legacyRecordedMinutes: sum(day => day.legacyRecorded.reduce((total, fact) => total + fact.minutes, 0)),
      completedTaskIds: idsWith(standing, 'complete'), partialTaskIds: idsWith(standing, 'partial'),
      selectedCount: sum(day => day.selected.length), selectedCompletedCount: sum(day => day.selected.filter(entry => entry.outcomeInRange === 'complete').length),
      daysWithPlan: days.filter(day => day.plan).length, daysWithRecording: days.filter(day => day.recorded.slices.length > 0).length,
    },
    undatedLegacyCompletionIds: state.tasks.filter(task => task.status === 'complete' && !state.taskOutcomes.some(outcome => outcome.taskId === task.id)
      && !state.blocks.some(block => block.taskId === task.id && block.status === 'complete')).map(task => task.id),
  };
}
