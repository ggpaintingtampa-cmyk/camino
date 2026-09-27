import type { CapacityResult } from '../../shared/contracts';
import { timeLabel } from '../../shared/dates';
import { minutesLabel } from './format';

export interface CapacitySummaryProps {
  /** The domain's result, shown as it is. No minutes are recalculated here. */
  capacity: CapacityResult;
  onChooseWindow?: () => void;
  compact?: boolean;
}

/** Known capacity, reserves, unknown estimates and overload as labeled arithmetic. */
export function CapacitySummary({ capacity, onChooseWindow, compact = false }: CapacitySummaryProps) {
  const unknown = capacity.unestimatedTaskIds.length;
  const unacknowledged = capacity.conflicts.filter(conflict => !conflict.acknowledged).length;
  if (capacity.status === 'window-missing') return <section className="v3-capacity" aria-label="Capacity">
    <h3>Available time not chosen</h3>
    <p className="v3-hint">Capacity is unknown until you choose when today’s planning window starts and ends. Caminos does not assume a full day.</p>
    {unknown > 0 && <p className="v3-capacity-unknown">{unknown} chosen {unknown === 1 ? 'task has' : 'tasks have'} no estimate.</p>}
    {onChooseWindow && <button type="button" onClick={onChooseWindow}>Choose your available time</button>}
  </section>;
  const heading = capacity.scope === 'remaining-day' ? 'Rest of today' : 'Whole planning window';
  const range = capacity.window ? `${timeLabel(capacity.window.start, capacity.timezone)} – ${timeLabel(capacity.window.end, capacity.timezone)}` : '';
  const balance = (capacity.overloadMinutes ?? 0) > 0
    ? `${minutesLabel(capacity.overloadMinutes ?? 0)} more than fits`
    : `${minutesLabel(capacity.unallocatedMinutes ?? 0)} unallocated`;
  return <section className={`v3-capacity${(capacity.overloadMinutes ?? 0) > 0 ? ' is-over' : ''}`} aria-label={`Capacity, ${heading.toLowerCase()}`}>
    <h3>{heading}{range && <span className="v3-capacity-range"> · {range}</span>}</h3>
    {capacity.status === 'window-elapsed' && <p className="v3-hint">The planning window has ended.</p>}
    <p className="v3-capacity-balance"><strong>{balance}</strong>{unknown > 0 && <span>, plus {unknown} {unknown === 1 ? 'task' : 'tasks'} without an estimate</span>}</p>
    {!compact && <dl className="v3-capacity-lines">
      <div><dt>Window</dt><dd>{minutesLabel(capacity.windowMinutes ?? 0)}</dd></div>
      <div><dt>Fixed commitments</dt><dd>− {minutesLabel(capacity.fixedMinutes)}</dd></div>
      <div><dt>Booked flexible work</dt><dd>− {minutesLabel(capacity.flexibleMinutes)}</dd></div>
      <div><dt>Protected spare time</dt><dd>− {minutesLabel(capacity.protectedSpareMinutes)}</dd></div>
      <div><dt>Chosen work without a time</dt><dd>− {minutesLabel(capacity.unplacedDemandMinutes)}</dd></div>
    </dl>}
    {unacknowledged > 0 && <p className="v3-conflict"><span>{unacknowledged} {unacknowledged === 1 ? 'overlap needs' : 'overlaps need'} a decision. Overlapping time is counted once.</span></p>}
    {capacity.outsideWindowIds.length > 0 && <p className="v3-hint">{capacity.outsideWindowIds.length} {capacity.outsideWindowIds.length === 1 ? 'entry is' : 'entries are'} outside this window and not deducted.</p>}
  </section>;
}
