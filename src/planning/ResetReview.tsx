import { useId, type ReactNode } from 'react';
import './planning-v3.css';

export interface PlanningChangeRow {
  key: string;
  title: string;
  action: 'Keep' | 'Move' | 'Defer' | 'Priorities' | 'Spare time' | 'Pause' | 'Appointment';
  before: string;
  after: string;
}

export interface ResetReviewProps {
  reviewedRevision: number;
  /** Owner-zone text from the domain preview's trusted clock boundary. */
  remainingFromLabel: string;
  nextFixedCommitment: ReactNode;
  capacity: ReactNode;
  changes: readonly PlanningChangeRow[];
  sessionConsequence?: ReactNode;
  requiresPauseConfirmation?: boolean;
  pauseConfirmed: boolean;
  onPauseConfirmedChange: (confirmed: boolean) => void;
  feedback?: ReactNode;
  disabled?: boolean;
  onApply: (reviewedRevision: number) => void;
  onCancel: () => void;
}

/** Presentation of an authoritative preview. No scheduling, capacity, or retry logic lives here. */
export function ResetReview({ reviewedRevision, remainingFromLabel, nextFixedCommitment, capacity, changes, sessionConsequence, requiresPauseConfirmation = false, pauseConfirmed, onPauseConfirmedChange, feedback, disabled = false, onApply, onCancel }: ResetReviewProps) {
  const id = useId();
  return <section className="planning-v3 planning-v3-stack" aria-labelledby={`${id}-title`}>
    <header><h2 id={`${id}-title`}>Review your revised plan</h2><p className="planning-v3-muted">Remaining time from {remainingFromLabel}. These changes are saved together.</p></header>
    {nextFixedCommitment && <div className="planning-v3-card planning-v3-focus">{nextFixedCommitment}</div>}
    {capacity}
    <section className="planning-v3-card" aria-labelledby={`${id}-changes`}>
      <h3 id={`${id}-changes`}>Proposed changes</h3>
      <ul className="planning-v3-change-list">{changes.map(change => <li key={change.key}>
        <span className="planning-v3-eyebrow">{change.action}</span><strong>{change.title}</strong>
        <dl><dt>Now</dt><dd>{change.before}</dd><dt>After</dt><dd>{change.after}</dd></dl>
      </li>)}</ul>
      {!changes.length && <p className="planning-v3-muted">No changes selected.</p>}
    </section>
    {sessionConsequence && <div className="planning-v3-notice">{sessionConsequence}</div>}
    {requiresPauseConfirmation && <label className="planning-v3-check"><input type="checkbox" checked={pauseConfirmed} disabled={disabled} onChange={e => onPauseConfirmedChange(e.target.checked)} /><span>Pause my current recording when these changes are applied.</span></label>}
    {feedback}
    <footer className="planning-v3-footer">
      <button type="button" disabled={disabled} onClick={onCancel}>Cancel</button>
      <button type="button" className="primary" disabled={disabled || !changes.length || (requiresPauseConfirmation && !pauseConfirmed)} onClick={() => onApply(reviewedRevision)}>Apply revised plan</button>
    </footer>
  </section>;
}
