import { AlertTriangle, Lock } from 'lucide-react';
import { dateKey } from '../../shared/dates';
import type { Block, Flexibility } from '../../shared/types';
import { dateLabel, kindLabel, minutesLabel, rangeLabel } from './format';

export interface CommitmentRowProps {
  block: Block;
  /** `blockFlexibility(block)` from the domain. Never decided from the kind here. */
  flexibility: Flexibility;
  zone: string;
  today: string;
  /** Status in words, for example "In progress now" or "Starts in 40 min". */
  status?: string;
  /** Titles and times of the entries this one overlaps. Shown as text, not only as color. */
  conflicts?: string[];
  conflictAcknowledged?: boolean;
  onOpen?: (block: Block) => void;
  onReviewConflict?: (block: Block) => void;
}

/** A calendar entry with its kind and time in words. It never offers a completion control. */
export function CommitmentRow({ block, flexibility, zone, today, status, conflicts = [], conflictAcknowledged = false, onOpen, onReviewConflict }: CommitmentRowProps) {
  const minutes = Math.round((Date.parse(block.end) - Date.parse(block.start)) / 60000);
  const day = dateKey(block.start, zone);
  const body = <>
    <span className="v3-commitment-time">{day === today ? '' : `${dateLabel(day, today)} · `}{rangeLabel(block.start, block.end, zone)}</span>
    <span className="v3-commitment-title">{block.title}</span>
    <span className="v3-commitment-kind">{flexibility === 'fixed' && <Lock size={12} aria-hidden="true"/>}{kindLabel(block, flexibility)} · {minutesLabel(minutes)}{status ? ` · ${status}` : ''}</span>
  </>;
  return <div className={`v3-commitment v3-commitment-${flexibility}${conflicts.length ? ' has-conflict' : ''}`}>
    {onOpen ? <button type="button" className="v3-commitment-body" onClick={() => onOpen(block)}>{body}</button> : <div className="v3-commitment-body">{body}</div>}
    {conflicts.length > 0 && <p className="v3-conflict">
      <AlertTriangle size={14} aria-hidden="true"/>
      <span>{conflictAcknowledged ? 'Overlap kept: ' : 'Overlaps '}{conflicts.join('; ')}</span>
      {onReviewConflict && !conflictAcknowledged && <button type="button" className="text-button" onClick={() => onReviewConflict(block)}>Review conflict</button>}
    </p>}
  </div>;
}
