import { factsForDay } from '../../shared/review';
import type { Snapshot } from '../../shared/types';
import { minutesLabel, rangeLabel } from '../components/format';
import { targetTitle } from '../components/taskActions';

/** Reservations and recording are different facts; neither implies task completion. */
export function DayFactsSummary({ state, date, now }: { state: Snapshot; date: string; now: string }) {
  const facts = factsForDay(state, date, now);
  const title = (id: string) => state.tasks.find(task => task.id === id)?.title ?? 'Task';
  return <section className="planning-v3-card v3-stack" aria-label="Recorded day facts">
    <h2>Day record</h2>
    <dl className="v3-capacity-lines">
      <div><dt>Calendar reservations</dt><dd>{minutesLabel(facts.plannedMinutes)}</dd></div>
      <div><dt>Recorded work on this date</dt><dd>{facts.recorded.slices.length ? minutesLabel(facts.recorded.minutes) : 'Not recorded'}</dd></div>
      <div><dt>Tasks marked done</dt><dd>{facts.completedTaskIds.length}</dd></div>
      <div><dt>Tasks marked partly done</dt><dd>{facts.partialTaskIds.length}</dd></div>
    </dl>
    <p className="v3-hint">Calendar time is reserved time. Recording measures intervals you started; outcomes are the results you entered.</p>
    {!facts.plan && <p className="v3-hint">No day plan was recorded.</p>}
    {facts.selected.length > 0 && <div><h3>Chosen tasks</h3><ul>{facts.selected.map(item => <li key={item.taskId}>{title(item.taskId)}{item.main ? ' · main task' : ''} · {item.outcomeInRange === 'complete' ? 'marked done this day' : item.outcomeInRange === 'partial' ? 'marked partly done this day' : 'no outcome recorded this day'}</li>)}</ul></div>}
    {facts.outcomes.filter(outcome => !outcome.selected).length > 0 && <div><h3>Other recorded outcomes</h3><ul>{facts.outcomes.filter(outcome => !outcome.selected).map(item => <li key={item.outcomeId}>{title(item.taskId)} · {item.kind === 'complete' ? 'done' : item.kind === 'partial' ? 'partly done' : 'reopened'}</li>)}</ul></div>}
    {facts.recorded.slices.length > 0 && <details><summary>Recorded intervals</summary><ul>{facts.recorded.slices.map((slice, index) => <li key={`${slice.sessionId}:${index}`}>{targetTitle(state, slice.target)} · {rangeLabel(slice.start, slice.end, facts.timezone)}{slice.open ? ' · recording now' : ''}</li>)}</ul></details>}
    {facts.dayRecord && facts.dayRecord.minutes !== facts.recorded.minutes && <p className="v3-hint">The started day includes {minutesLabel(facts.dayRecord.minutes)} of work across its attached intervals. The date total above includes only this calendar date.</p>}
    {facts.legacyRecorded.length > 0 && <p className="v3-hint">Earlier version: {minutesLabel(facts.legacyRecorded.reduce((total, entry) => total + entry.minutes, 0))} from legacy start/end spans. These were not recorded as pausable sessions.</p>}
    {facts.legacyCompletions.length > 0 && <p className="v3-hint">{facts.legacyCompletions.length} older completion{facts.legacyCompletions.length === 1 ? '' : 's'} dated approximately from calendar evidence, separate from explicit outcomes above.</p>}
  </section>;
}
