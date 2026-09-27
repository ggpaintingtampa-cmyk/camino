import { useState } from 'react';
import { previewTemplateApplication } from '../../shared/planning';
import { CapacitySummary } from '../components/CapacitySummary';
import { rangeLabel } from '../components/format';
import { Modal, type PageProps } from '../ui';
import { WholeTemplatePreview } from './WholeTemplatePreview';

export function TemplateApplyDialog({ state, now, run, runReviewed, templateId, date, onClose }: PageProps & { templateId: string; date: string; onClose: () => void }) {
  const [review, setReview] = useState(() => ({ state, preview: previewTemplateApplication(state, { templateId, date }, now) }));
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const stale = review.preview.baseRevision !== state.revision;
  const template = review.state.templates.find(t => t.id === templateId);
  const preview = review.preview;
  return <Modal className="v3-sheet" title="Review day template" onClose={onClose}>
    <WholeTemplatePreview title={template?.title ?? 'template'} dateLabel={date} timezone={preview.timezone} reviewedRevision={preview.baseRevision}
      items={preview.entries.map(entry => ({ key: entry.occurrenceId, title: template?.blocks[entry.index]?.title ?? 'Entry', timeLabel: entry.start && entry.end ? rangeLabel(entry.start, entry.end, preview.timezone) : entry.invalidTime ?? 'Time unavailable', kindLabel: entry.kind, alreadyApplied: entry.alreadyApplied,
        conflicts: entry.conflicts.map(c => `${review.state.blocks.find(b => b.id === c.blockId)?.title ?? template?.blocks.find((_, index) => `tpl:${templateId}:${date}:${index}` === c.blockId)?.title ?? 'Another template entry'} · ${rangeLabel(c.start, c.end, preview.timezone)}`) }))}
      capacity={<><p>{preview.addedReservedMinutes} new reserved minutes; overlapping time is counted once.</p><CapacitySummary capacity={preview.capacityAfter}/></>}
      conflictsAcknowledged={!stale && confirmed} onConflictsAcknowledgedChange={setConfirmed} disabled={busy || stale || !preview.valid}
      feedback={<>{!preview.valid && <p role="alert" className="notice warning">{preview.error?.message ?? 'This template cannot be applied.'}</p>}{stale && <p role="alert" className="notice warning">Your records changed. Review the latest information before applying.</p>}</>}
      onCancel={onClose} onApply={async revision => { setBusy(true); try { const command = { type: 'template.apply' as const, id: templateId, date, acknowledgedConflictIds: preview.requiredAcknowledgements }; const ok = runReviewed ? (await runReviewed(command, revision)).ok : await run(command); if (ok) onClose(); } finally { setBusy(false); } }}/>
    {stale && <button disabled={busy} onClick={() => { setReview({ state, preview: previewTemplateApplication(state, { templateId, date }, now) }); setConfirmed(false); }}>Review latest information</button>}
  </Modal>;
}
