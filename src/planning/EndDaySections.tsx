import { useId, type ReactNode } from 'react';
import { Field } from '../ui';
import './planning-v3.css';

export interface EndDaySectionsProps {
  dateLabel: string;
  commitments: ReactNode;
  backlog?: ReactNode;
  backlogCount: number;
  changedPlan: string;
  easierTomorrow: string;
  journal: string;
  onChangedPlanChange: (value: string) => void;
  onEasierTomorrowChange: (value: string) => void;
  onJournalChange: (value: string) => void;
  sessionConsequence?: ReactNode;
  requiresStopConfirmation?: boolean;
  stopConfirmed: boolean;
  onStopConfirmedChange: (value: boolean) => void;
  planTomorrow: boolean;
  onPlanTomorrowChange: (value: boolean) => void;
  feedback?: ReactNode;
  disabled?: boolean;
  onCloseDay: () => void;
  onKeepOpen: () => void;
}

/** Parent retains writing drafts and the reviewed session set across refreshes. */
export function EndDaySections({ dateLabel, commitments, backlog, backlogCount, changedPlan, easierTomorrow, journal, onChangedPlanChange, onEasierTomorrowChange, onJournalChange, sessionConsequence, requiresStopConfirmation = false, stopConfirmed, onStopConfirmedChange, planTomorrow, onPlanTomorrowChange, feedback, disabled = false, onCloseDay, onKeepOpen }: EndDaySectionsProps) {
  const id = useId();
  return <section className="planning-v3 planning-v3-stack" aria-labelledby={`${id}-title`}>
    <header><p className="planning-v3-eyebrow">{dateLabel}</p><h2 id={`${id}-title`}>Close today</h2><p className="planning-v3-muted">Keep a useful record. The rest can wait.</p></header>
    <section className="planning-v3-stack" aria-labelledby={`${id}-commitments`}><h3 id={`${id}-commitments`}>Today’s commitments</h3>{commitments}</section>
    {backlogCount > 0 && <details className="planning-v3-disclosure"><summary>Other backlog ({backlogCount})</summary><div>{backlog}</div></details>}
    <p className="planning-v3-muted">Unfinished work can stay open. You do not need to resolve every task to close the day.</p>
    <Field label="What changed the plan? (optional)"><textarea aria-label="What changed the plan? (optional)" rows={3} value={changedPlan} disabled={disabled} onChange={e => onChangedPlanChange(e.target.value)} /></Field>
    <Field label="What would make tomorrow easier? (optional)"><textarea aria-label="What would make tomorrow easier? (optional)" rows={3} value={easierTomorrow} disabled={disabled} onChange={e => onEasierTomorrowChange(e.target.value)} /></Field>
    <Field label="Personal journal (optional)"><textarea aria-label="Personal journal (optional)" rows={5} value={journal} disabled={disabled} onChange={e => onJournalChange(e.target.value)} /></Field>
    {sessionConsequence && <div className="planning-v3-notice">{sessionConsequence}</div>}
    {requiresStopConfirmation && <label className="planning-v3-check"><input type="checkbox" checked={stopConfirmed} disabled={disabled} onChange={e => onStopConfirmedChange(e.target.checked)} /><span>End the recordings shown above and close this day. Leave the tasks unfinished.</span></label>}
    <label className="planning-v3-check"><input type="checkbox" checked={planTomorrow} disabled={disabled} onChange={e => onPlanTomorrowChange(e.target.checked)} /><span>Open tomorrow’s plan afterwards. No bookings will be created by this choice.</span></label>
    {feedback}
    <footer className="planning-v3-footer">
      <button type="button" disabled={disabled} onClick={onKeepOpen}>Keep day open</button>
      <button type="button" className="primary" disabled={disabled || (requiresStopConfirmation && !stopConfirmed)} onClick={onCloseDay}>End day · leave the rest</button>
    </footer>
  </section>;
}
