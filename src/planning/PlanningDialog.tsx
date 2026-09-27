import { useState } from 'react';
import type { Block, Command, DayPlanDraft, PlanOperation, Snapshot } from '../../shared/types';
import type { PlanPreview, PlanPreviewRow } from '../../shared/contracts';
import { addDays, dateKey, timeLabel } from '../../shared/dates';
import { blockFlexibility, clipInterval, localDayRange } from '../../shared/capacity';
import { dayPlanForDate, nextFixedCommitment, previewDayPlan, previewPlanChange, zoneForDate } from '../../shared/planning';
import { hasRecordedWork, runningSession } from '../../shared/sessions';
import { CapacitySummary } from '../components/CapacitySummary';
import { rangeLabel } from '../components/format';
import { targetTitle } from '../components/taskActions';
import { Field, Modal, type PageProps } from '../ui';
import { PlanTodayForm, type PlanTodayDraft } from './PlanTodayForm';
import { PlanningWindowFields } from './PlanningWindowFields';
import { QuickCapture } from './QuickCapture';
import { ResetReview, type PlanningChangeRow } from './ResetReview';
import { TaskDetails } from './TaskDetails';
import { readWindowDraft, windowDraftFromInstants, type WindowDraft } from './windowDraft';

type Adjustment = { action: 'keep' | 'move' | 'extend' | 'defer' | 'cancel'; window: WindowDraft; newBlockId: string };
type Review = { preview: PlanPreview; operations: PlanOperation[]; state: Snapshot; now: string };

function describeRow(row: PlanPreviewRow, state: Snapshot, zone: string, key: string): PlanningChangeRow {
  const task = (id: string) => state.tasks.find(t => t.id === id)?.title ?? 'Task';
  const block = (id: string) => state.blocks.find(b => b.id === id)?.title ?? 'Calendar entry';
  const range = (r?: { start: string; end: string }) => r ? `${dateKey(r.start, zone)} · ${rangeLabel(r.start, r.end, zone)}` : 'No time chosen';
  switch (row.kind) {
    case 'selection': return { key, action: 'Priorities', title: 'Chosen tasks and main task', before: row.before.taskIds.map(id => `${task(id)}${id === row.before.mainTaskId ? ' (main)' : ''}`).join(', ') || 'None', after: row.after.taskIds.map(id => `${task(id)}${id === row.after.mainTaskId ? ' (main)' : ''}`).join(', ') || 'None' };
    case 'preferredDay': return { key, action: 'Defer', title: task(row.taskId), before: row.before ?? 'No preferred day', after: row.after ? `Intended for ${row.after}, without a new booking` : 'No preferred day' };
    case 'window': return { key, action: 'Priorities', title: 'Available time', before: range(row.before), after: range(row.after) };
    case 'spare': return { key, action: 'Spare time', title: 'Protected spare time', before: `${row.before} minutes`, after: `${row.after} minutes` };
    case 'session.pause': return { key, action: 'Pause', title: targetTitle(state, row.target), before: 'Recording now', after: `Paused; ${row.recordedMinutes} minutes recorded so far. Task stays open.` };
    case 'placement.cancel': return { key, action: 'Defer', title: block(row.blockId), before: range(row.before), after: 'Booking cancelled and kept in history. Task stays open.' };
    case 'placement.set': return { key, action: 'Move', title: task(row.taskId), before: range(row.replaces?.before), after: `${range(row.after)}. Previous recorded work stays with the old entry.` };
    default: return { key, action: row.kind === 'appointment.change' ? 'Appointment' : 'Move', title: block(row.blockId), before: range(row.before), after: range(row.after) };
  }
}

/** Owns drafts and pins every reviewed operation to its exact snapshot revision. */
export function PlanningDialog({ state, now, run, runReviewed, date, reset = false, onClose }: PageProps & { date: string; reset?: boolean; onClose: () => void }) {
  const initial = dayPlanForDate(state, date);
  const [draft, setDraft] = useState<PlanTodayDraft>(() => ({ date, selection: { taskIds: [...(initial?.taskIds ?? [])], mainTaskId: initial?.mainTaskId }, useWindow: !!initial?.window,
    window: initial?.window ? windowDraftFromInstants(initial.window.start, initial.window.end, initial.timezone) : { startDate: date, startTime: '', endDate: date, endTime: '' }, protectedSpareMinutes: String(initial?.protectedSpareMinutes ?? 0) }));
  const [adjustments, setAdjustments] = useState<Record<string, Adjustment>>({});
  const [pause, setPause] = useState(false);
  const [pauseConfirmed, setPauseConfirmed] = useState(false);
  const [overlapsConfirmed, setOverlapsConfirmed] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [capture, setCapture] = useState(false);
  const [details, setDetails] = useState<string | null>(null);
  const zone = zoneForDate(state, draft.date);
  const stored = dayPlanForDate(state, draft.date);
  const parsed = draft.useWindow ? readWindowDraft(draft.window, zone, stored?.window) : undefined;
  const plan: DayPlanDraft = { date: draft.date, taskIds: draft.selection.taskIds, ...(draft.selection.mainTaskId ? { mainTaskId: draft.selection.mainTaskId } : {}),
    ...(parsed?.valid ? { window: { start: parsed.start, end: parsed.end } } : {}), protectedSpareMinutes: Number(draft.protectedSpareMinutes), timezone: zone, ...(stored?.note ? { note: stored.note } : {}) };
  const preview = previewDayPlan(state, plan, now);
  const range = localDayRange(draft.date || date, zone);
  const bookings = state.blocks.filter(b => !b.archived && b.status === 'pending' && clipInterval(b, range));
  const fixed = bookings.filter(b => blockFlexibility(b) === 'fixed');
  const running = runningSession(state);
  const titleOf = (id: string) => state.blocks.find(b => b.id === id)?.title ?? 'Another entry';
  const stale = !!review && review.preview.baseRevision !== state.revision;
  const change = (block: Block, update: Partial<Adjustment>) => setAdjustments(all => ({ ...all, [block.id]: { ...(all[block.id] ?? { action: 'keep', window: windowDraftFromInstants(block.start, block.end, zone), newBlockId: crypto.randomUUID() }), ...update } }));

  function prepare(): Review | undefined {
    setMessage(''); setPauseConfirmed(false); setOverlapsConfirmed(false);
    if (parsed && !parsed.valid) { setMessage(parsed.error); return; }
    if (!preview.valid) { setMessage(preview.error?.message ?? 'Review your choices.'); return; }
    let taskIds = [...plan.taskIds];
    const operations: PlanOperation[] = [];
    if (pause && running) operations.push({ op: 'session.pause', sessionId: running.id });
    for (const [id, adjustment] of Object.entries(adjustments)) {
      if (adjustment.action === 'keep') continue;
      const block = state.blocks.find(b => b.id === id);
      if (!block || block.archived || block.status !== 'pending') { setMessage('A booking changed. Reopen this plan to review it. Your choices have not been saved.'); return; }
      if (adjustment.action === 'defer' || adjustment.action === 'cancel') {
        operations.push({ op: 'placement.cancel', blockId: id, reason: adjustment.action === 'defer' ? 'deferred' : 'cancelled' });
        if (adjustment.action === 'defer' && block.taskId) { taskIds = taskIds.filter(taskId => taskId !== block.taskId); operations.push({ op: 'preferredDay.set', taskId: block.taskId, preferredDay: addDays(draft.date, 1) }); }
      } else {
        const time = readWindowDraft(adjustment.window, zone, block);
        if (!time.valid) { setMessage(`${block.title}: ${time.error}`); return; }
        if (adjustment.action === 'extend') operations.push({ op: 'placement.extend', blockId: id, end: time.end, acknowledgedConflictIds: [] });
        else if (blockFlexibility(block) === 'fixed') operations.push({ op: 'appointment.change', blockId: id, newBlockId: adjustment.newBlockId, start: time.start, end: time.end, acknowledgedConflictIds: [] });
        else if (hasRecordedWork(state, block) && block.taskId) operations.push({ op: 'placement.set', taskId: block.taskId, newBlockId: adjustment.newBlockId, start: time.start, end: time.end, acknowledgedConflictIds: [] });
        else operations.push({ op: 'placement.move', blockId: id, newBlockId: adjustment.newBlockId, start: time.start, end: time.end, acknowledgedConflictIds: [] });
      }
    }
    const mainTaskId = plan.mainTaskId && taskIds.includes(plan.mainTaskId) ? plan.mainTaskId : undefined;
    if (JSON.stringify(taskIds) !== JSON.stringify(stored?.taskIds ?? []) || mainTaskId !== stored?.mainTaskId) operations.push({ op: 'selection.set', taskIds, ...(mainTaskId ? { mainTaskId } : {}) });
    if (JSON.stringify(plan.window) !== JSON.stringify(stored?.window)) operations.push({ op: 'window.set', window: plan.window ?? null });
    if (plan.protectedSpareMinutes !== (stored?.protectedSpareMinutes ?? 0)) operations.push({ op: 'spare.set', protectedSpareMinutes: plan.protectedSpareMinutes });
    if (!operations.length) { setMessage('Choose a change before reviewing the plan.'); return; }
    const result = previewPlanChange(state, { date: draft.date, source: 'reset', operations }, now);
    if (!result.valid) { setMessage(result.error?.message ?? 'These changes cannot be applied.'); return; }
    for (const ack of result.requiredAcknowledgements) { const operation = operations[ack.operationIndex]; if ('acknowledgedConflictIds' in operation) operation.acknowledgedConflictIds = ack.blockIds; }
    return { preview: result, operations, state, now };
  }
  async function save(revision: number) {
    if (reset) { const next = prepare(); if (next) setReview(next); return; }
    if (!preview.valid || (parsed && !parsed.valid)) { setMessage(preview.error?.message ?? 'Choose valid dates and times.'); return; }
    setBusy(true);
    try { const ok = runReviewed ? (await runReviewed({ type: 'dayPlan.save', plan }, revision)).ok : await run({ type: 'dayPlan.save', plan }); if (ok) onClose(); }
    finally { setBusy(false); }
  }
  async function apply(revision: number) {
    if (!review || stale || (review.preview.requiredAcknowledgements.some(ack => ack.blockIds.length) && !overlapsConfirmed)) return;
    setBusy(true);
    try { const command: Command = { type: 'plan.apply', date: review.preview.date, source: 'reset', operations: review.operations }; const ok = runReviewed ? (await runReviewed(command, revision)).ok : await run(command); if (ok) onClose(); }
    finally { setBusy(false); }
  }
  const needsOverlap = review?.preview.requiredAcknowledgements.some(ack => ack.blockIds.length);
  const next = nextFixedCommitment(review?.state ?? state, review?.now ?? now);
  const nextFixed = next.inProgress ?? next.next;
  return <Modal className="v3-sheet" title={reset ? 'Reset today' : 'Choose a plan'} onClose={onClose}>
    {capture ? <><QuickCapture run={run} autoFocus onSaved={id => { setDraft(value => ({ ...value, selection: { ...value.selection, taskIds: [...value.selection.taskIds, id] } })); setCapture(false); }}/><button type="button" onClick={() => setCapture(false)}>Back to choices</button></> : review ? <>
      {stale && <p className="notice warning" role="alert">Your records changed. These changes have not been saved. Your draft is kept; review the latest information before applying.</p>}
      <ResetReview reviewedRevision={review.preview.baseRevision} remainingFromLabel={`${timeLabel(review.now, zone)} · ${zone}`} nextFixedCommitment={nextFixed ? <p><strong>{next.inProgress ? 'Fixed commitment now' : 'Next fixed commitment'}: {nextFixed.title}</strong><br/>{rangeLabel(nextFixed.start, nextFixed.end, zone)}</p> : <p>No next fixed commitment recorded.</p>}
        capacity={<><CapacitySummary capacity={review.preview.remainingBefore}/><p>After these changes:</p><CapacitySummary capacity={review.preview.remainingAfter}/></>} changes={review.preview.rows.map((row, i) => describeRow(row, review.state, review.preview.timezone, String(i)))}
        requiresPauseConfirmation={review.operations.some(op => op.op === 'session.pause')} pauseConfirmed={!stale && pauseConfirmed} onPauseConfirmedChange={setPauseConfirmed}
        sessionConsequence={<><p>Fixed commitments stay unchanged unless explicitly listed above.</p>{review.preview.unchangedFixedIds.map(id => <p key={id}>{titleOf(id)} · kept</p>)}</>}
        feedback={<>{needsOverlap && <section className="notice warning">{review.preview.conflicts.map((c, i) => <p key={i}>Overlap: {[c.aId, c.bId].map(titleOf).join(' and ')} · {c.minutes} minutes</p>)}<label className="check-label"><input type="checkbox" checked={!stale && overlapsConfirmed} onChange={e => setOverlapsConfirmed(e.target.checked)}/>Keep these overlaps</label></section>}{message && <p role="alert">{message}</p>}</>}
        disabled={busy || stale || (!!needsOverlap && !overlapsConfirmed)} onApply={apply} onCancel={() => { setReview(null); setPauseConfirmed(false); setOverlapsConfirmed(false); }}/>
      <button type="button" disabled={busy} onClick={() => { const updated = prepare(); if (updated) setReview(updated); else setReview(null); }}>{stale ? 'Review latest information' : 'Refresh this review'}</button>
      <button type="button" disabled={busy} onClick={() => setReview(null)}>Edit changes</button>
    </> : <>
      {reset && <section className="planning-v3 planning-v3-stack"><h2>Adjust what remains</h2><p>Choose changes explicitly. Nothing moves until you review and apply.</p>
        {running && <label className="check-label"><input type="checkbox" checked={pause} onChange={e => setPause(e.target.checked)}/>Pause {targetTitle(state, running.target)} when applying</label>}
        {bookings.map(block => { const adjustment = adjustments[block.id]; const recorded = hasRecordedWork(state, block); const fixedEntry = blockFlexibility(block) === 'fixed'; return <section className="planning-v3-card" key={block.id}><h3>{block.title}</h3><p>{rangeLabel(block.start, block.end, zone)} · {fixedEntry ? 'Fixed commitment' : 'Flexible booking'}{recorded ? ' · recorded work stays in history' : ''}</p>
          <Field label={`Change ${block.title}`}><select value={adjustment?.action ?? 'keep'} onChange={e => change(block, { action: e.target.value as Adjustment['action'] })}><option value="keep">Keep unchanged</option>{(!recorded || (!!block.taskId && !fixedEntry)) && <option value="move">{fixedEntry ? 'Explicitly change this fixed commitment' : recorded ? 'Book remaining work elsewhere' : 'Move booking'}</option>}{!fixedEntry && <option value="extend">Extend booking</option>}{!fixedEntry && !recorded && block.taskId && <option value="defer">Tomorrow, without a time</option>}{!fixedEntry && !recorded && <option value="cancel">Cancel booking; keep task open</option>}</select></Field>
          {adjustment && ['move', 'extend'].includes(adjustment.action) && <PlanningWindowFields label={adjustment.action === 'extend' ? 'Keep the start; choose a later end' : 'Proposed booking'} value={adjustment.window} timezone={zone} original={block} onChange={window => change(block, { window: adjustment.action === 'extend' ? { ...window, startDate: windowDraftFromInstants(block.start, block.end, zone).startDate, startTime: windowDraftFromInstants(block.start, block.end, zone).startTime } : window })}/>}
        </section>; })}</section>}
      <PlanTodayForm draft={draft} timezone={zone} reviewedRevision={preview.baseRevision} onChange={nextDraft => { if (nextDraft.date !== draft.date) setAdjustments({}); setDraft(nextDraft); setMessage(''); }} tasks={state.tasks.filter(t => !t.archived && (t.status === 'open' || draft.selection.taskIds.includes(t.id)))} originalWindow={stored?.window}
        fixedCommitments={fixed.length ? <ul>{fixed.map(b => <li key={b.id}>{b.title} · {rangeLabel(b.start, b.end, zone)}</li>)}</ul> : <p>No fixed commitments recorded.</p>} capacity={<CapacitySummary capacity={preview.capacityAfter}/>} feedback={message && <p role="alert" className="notice warning">{message}</p>} disabled={busy}
        onCreateTask={() => setCapture(true)} onEditTask={setDetails} onSave={save} onCancel={onClose} submitLabel={reset ? 'Review revised plan' : 'Save choices'}/>
    </>}
    {details && <TaskDetails taskId={details} state={state} now={now} run={run} runReviewed={runReviewed} onClose={() => setDetails(null)}/>}
  </Modal>;
}
