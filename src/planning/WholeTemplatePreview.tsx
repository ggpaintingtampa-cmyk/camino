import { useId, type ReactNode } from 'react';
import './planning-v3.css';

export interface TemplatePreviewRow {
  /** Stable identity supplied by template preview, never a display array index. */
  key: string;
  title: string;
  timeLabel: string;
  kindLabel: string;
  alreadyApplied: boolean;
  conflicts: readonly string[];
}

export interface WholeTemplatePreviewProps {
  title: string;
  dateLabel: string;
  timezone: string;
  reviewedRevision: number;
  items: readonly TemplatePreviewRow[];
  capacity: ReactNode;
  conflictsAcknowledged: boolean;
  onConflictsAcknowledgedChange: (value: boolean) => void;
  feedback?: ReactNode;
  disabled?: boolean;
  onApply: (reviewedRevision: number) => void;
  onCancel: () => void;
}

/** R1 applies the whole template. R2 variants and item selection are intentionally absent. */
export function WholeTemplatePreview({ title, dateLabel, timezone, reviewedRevision, items, capacity, conflictsAcknowledged, onConflictsAcknowledgedChange, feedback, disabled = false, onApply, onCancel }: WholeTemplatePreviewProps) {
  const id = useId();
  const hasAdditions = items.some(item => !item.alreadyApplied);
  const hasNewConflicts = items.some(item => !item.alreadyApplied && item.conflicts.length > 0);
  return <section className="planning-v3 planning-v3-stack" aria-labelledby={`${id}-title`}>
    <header><p className="planning-v3-eyebrow">{dateLabel}</p><h2 id={`${id}-title`}>Apply {title}</h2><p className="planning-v3-muted">Review the whole template in {timezone}. Editing a template is a separate action.</p></header>
    {capacity}
    <ol className="planning-v3-selection">{items.map(item => <li className="planning-v3-card" key={item.key}>
      <span className="planning-v3-eyebrow">{item.kindLabel}</span><h3>{item.title}</h3><p>{item.timeLabel}</p>
      <p className="planning-v3-muted">{item.alreadyApplied ? 'Already applied · no duplicate will be added' : 'Will be added'}</p>
      {item.conflicts.map((conflict, index) => <p className="planning-v3-notice" key={index}>Overlap: {conflict}</p>)}
    </li>)}</ol>
    {!items.length && <p className="planning-v3-muted">This template has no entries.</p>}
    {items.length > 0 && !hasAdditions && <p className="planning-v3-notice">All entries are already applied.</p>}
    {hasNewConflicts && <label className="planning-v3-check"><input type="checkbox" checked={conflictsAcknowledged} disabled={disabled} onChange={e => onConflictsAcknowledgedChange(e.target.checked)} /><span>Keep the overlaps shown above.</span></label>}
    {feedback}
    <footer className="planning-v3-footer"><button type="button" disabled={disabled} onClick={onCancel}>Cancel</button><button type="button" className="primary" disabled={disabled || !hasAdditions || (hasNewConflicts && !conflictsAcknowledged)} onClick={() => onApply(reviewedRevision)}>Apply whole template</button></footer>
  </section>;
}
