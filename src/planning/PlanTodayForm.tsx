import { useId, useState, type ReactNode } from 'react';
import { validDate } from '../../shared/dates';
import { Field } from '../ui';
import { PlanningTaskPicker, type PlanningSelection, type PlanningTaskChoice } from './PlanningTaskPicker';
import { PlanningWindowFields } from './PlanningWindowFields';
import { readWindowDraft, type WindowDraft } from './windowDraft';
import './planning-v3.css';

/** UI-only draft. Keep it in the parent while capture/details/refresh screens are open. */
export interface PlanTodayDraft {
  date: string;
  selection: PlanningSelection;
  useWindow: boolean;
  window: WindowDraft;
  protectedSpareMinutes: string;
}

export interface PlanTodayFormProps {
  draft: PlanTodayDraft;
  timezone: string;
  reviewedRevision: number;
  tasks: readonly PlanningTaskChoice[];
  onChange: (draft: PlanTodayDraft) => void;
  fixedCommitments: ReactNode;
  /** Render AI 2's CapacitySummary from AI 1's authoritative preview. */
  capacity: ReactNode;
  feedback?: ReactNode;
  disabled?: boolean;
  originalWindow?: { start: string; end: string };
  onCreateTask?: () => void;
  onEditTask?: (taskId: string) => void;
  onSave: (reviewedRevision: number) => void;
  onCancel: () => void;
  submitLabel?: string;
}

/** Contains no command, capacity arithmetic, navigation, or optimistic save behavior. */
export function PlanTodayForm({ draft, timezone, reviewedRevision, tasks, onChange, fixedCommitments, capacity, feedback, disabled = false, originalWindow, onCreateTask, onEditTask, onSave, onCancel, submitLabel = 'Save choices' }: PlanTodayFormProps) {
  const id = useId();
  const [attempted, setAttempted] = useState(false);
  const window = draft.useWindow ? readWindowDraft(draft.window, timezone, originalWindow) : undefined;
  const spare = Number(draft.protectedSpareMinutes);
  const error = !validDate(draft.date) ? 'Choose a valid planning date.'
    : draft.protectedSpareMinutes.trim() === '' || !Number.isInteger(spare) || spare < 0 || spare > 1440 || spare % 5 !== 0 ? 'Choose protected spare time from 0 to 1,440 minutes, in steps of five.'
    : window && !window.valid ? window.error
    : draft.useWindow && draft.window.startDate !== draft.date ? 'The planning window must start on the chosen planning date.'
    : undefined;
  return <form className="planning-v3 planning-v3-stack" aria-labelledby={`${id}-title`} noValidate onSubmit={event => { event.preventDefault(); setAttempted(true); if (!disabled && !error) onSave(reviewedRevision); }}>
    <header><h2 id={`${id}-title`}>Plan today</h2><p className="planning-v3-muted">Choose what matters. Leave room for the day to change.</p></header>
    <Field label="Planning date"><input type="date" value={draft.date} disabled={disabled} onChange={e => { if (validDate(e.target.value)) onChange({ ...draft, date: e.target.value }); }} /></Field>
    <label className="planning-v3-check"><input type="checkbox" checked={draft.useWindow} disabled={disabled} onChange={e => onChange({ ...draft, useWindow: e.target.checked })} /><span>Choose my available time (optional)</span></label>
    {draft.useWindow ? <PlanningWindowFields value={draft.window} timezone={timezone} onChange={value => onChange({ ...draft, window: value })} disabled={disabled} showErrors={attempted} original={originalWindow} /> : <p className="planning-v3-muted">You can choose tasks now. Available capacity is unknown until you choose a planning window.</p>}
    <section className="planning-v3-card" aria-labelledby={`${id}-fixed`}><h3 id={`${id}-fixed`}>Fixed commitments</h3>{fixedCommitments}</section>
    <PlanningTaskPicker tasks={tasks} value={draft.selection} onChange={selection => onChange({ ...draft, selection })} onCreateTask={onCreateTask} onEditTask={onEditTask} disabled={disabled} />
    <Field label="Protected spare time (minutes)"><input type="number" min="0" max="1440" step="5" inputMode="numeric" value={draft.protectedSpareMinutes} disabled={disabled} onChange={e => onChange({ ...draft, protectedSpareMinutes: e.target.value })} /></Field>
    <p className="planning-v3-muted">Spare time stays unbooked. Saving choices does not start your day or create calendar bookings.</p>
    {capacity}
    {attempted && error && <p className="planning-v3-notice" role="alert">{error}</p>}
    {feedback}
    <footer className="planning-v3-footer"><button type="button" disabled={disabled} onClick={onCancel}>Cancel</button><button type="submit" className="primary" disabled={disabled}>{submitLabel}</button></footer>
  </form>;
}
