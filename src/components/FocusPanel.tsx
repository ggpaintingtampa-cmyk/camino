import { Check, Pause, Play, Shuffle, Square } from 'lucide-react';
import type { ReactNode } from 'react';
import { minutesLabel } from './format';

export type FocusMode = 'running' | 'paused' | 'ready' | 'done' | 'empty';
export interface FocusTarget {
  title: string;
  /** "Personal · task", "Work · routine". */
  context: string;
  firstAction?: string;
  doneWhen?: string;
}
export interface FocusTiming {
  /** Minutes recorded by this session inside today's local date. */
  recordedTodayMinutes: number;
  /** Minutes recorded by this session over its whole life. Shown only when it differs. */
  recordedSessionMinutes: number;
  /** When the current interval opened, already formatted in the owner's zone. */
  sinceLabel?: string;
  /** End of the booking this interval runs under, already formatted. Absent for unscheduled work. */
  plannedFinishLabel?: string;
  /** Positive when the planned finish has passed. */
  overrunMinutes?: number;
}
export interface FocusPanelProps {
  mode: FocusMode;
  target?: FocusTarget;
  timing?: FocusTiming;
  /** Shown in `done` and `empty` modes, for example the completed main priority. */
  message?: string;
  busy?: boolean;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onDone?: () => void;
  onPartial?: () => void;
  onStop?: () => void;
  onChangePlan?: () => void;
  /** Other paused work and secondary choices, rendered below the actions. */
  children?: ReactNode;
}

const EYEBROW: Record<FocusMode, string> = { running: 'Recording now', paused: 'Paused', ready: 'Ready when you are', done: 'Priority done', empty: 'Nothing chosen yet' };

/**
 * The current action. It renders the state it is given: running and paused come from
 * work sessions, never from a block's `actualStart`. The timer text is a labeled value
 * and is not a live region, so it is not announced every second.
 */
export function FocusPanel({ mode, target, timing, message, busy = false, onStart, onPause, onResume, onDone, onPartial, onStop, onChangePlan, children }: FocusPanelProps) {
  const overrun = (timing?.overrunMinutes ?? 0) > 0;
  return <section className={`v3-focus v3-focus-${mode}${overrun ? ' is-overrun' : ''}`} aria-labelledby="v3-focus-title">
    <p className="v3-focus-eyebrow">{overrun && mode === 'running' ? 'Past planned finish' : EYEBROW[mode]}</p>
    {target ? <>
      <h2 id="v3-focus-title">{target.title}</h2>
      <p className="v3-focus-context">{target.context}</p>
      {target.firstAction && <p className="v3-focus-guidance"><span>First action</span>{target.firstAction}</p>}
      {target.doneWhen && <p className="v3-focus-guidance"><span>Done when</span>{target.doneWhen}</p>}
    </> : <h2 id="v3-focus-title">{mode === 'done' ? 'Your main priority is done.' : 'Choose what matters today.'}</h2>}
    {message && <p className="v3-focus-message">{message}</p>}
    {timing && (mode === 'running' || mode === 'paused') && <dl className="v3-focus-times">
      <div><dt>{mode === 'paused' ? 'Recorded today, paused' : 'Recorded today'}</dt><dd>{minutesLabel(timing.recordedTodayMinutes)}</dd></div>
      {timing.recordedSessionMinutes !== timing.recordedTodayMinutes && <div><dt>Recorded in this session, all days</dt><dd>{minutesLabel(timing.recordedSessionMinutes)}</dd></div>}
      {timing.sinceLabel && mode === 'running' && <div><dt>Recording since</dt><dd>{timing.sinceLabel}</dd></div>}
      {timing.plannedFinishLabel && <div><dt>Planned finish</dt><dd>{timing.plannedFinishLabel}{overrun ? ` · ${minutesLabel(timing.overrunMinutes ?? 0)} ago` : ''}</dd></div>}
    </dl>}
    <div className="v3-focus-actions">
      {mode === 'ready' && onStart && <button type="button" className="primary" disabled={busy} onClick={onStart}><Play size={18} aria-hidden="true"/>Start</button>}
      {mode === 'paused' && onResume && <button type="button" className="primary" disabled={busy} onClick={onResume}><Play size={18} aria-hidden="true"/>Resume</button>}
      {mode === 'running' && onDone && <button type="button" className="primary" disabled={busy} onClick={onDone}><Check size={18} aria-hidden="true"/>Done</button>}
      {mode === 'running' && onPause && <button type="button" disabled={busy} onClick={onPause}><Pause size={18} aria-hidden="true"/>Pause</button>}
      {(mode === 'paused' || mode === 'ready') && onDone && <button type="button" disabled={busy} onClick={onDone}><Check size={18} aria-hidden="true"/>Done</button>}
      {onChangePlan && <button type="button" disabled={busy} className={overrun ? 'v3-emphasis' : ''} onClick={onChangePlan}><Shuffle size={18} aria-hidden="true"/>Change plan</button>}
    </div>
    {(onPartial || onStop) && (mode === 'running' || mode === 'paused') && <div className="v3-focus-secondary">
      {onPartial && <button type="button" className="text-button" disabled={busy} onClick={onPartial}>Partly done…</button>}
      {onStop && <button type="button" className="text-button" disabled={busy} onClick={onStop}><Square size={14} aria-hidden="true"/>Stop recording · keep task open</button>}
    </div>}
    {children}
  </section>;
}
