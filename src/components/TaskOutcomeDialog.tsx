import { useState } from 'react';
import { Check, Square } from 'lucide-react';
import { addDays, dateKey } from '../../shared/dates';
import { recordedMinutes, sessionState, unfinishedSessionForTarget } from '../../shared/sessions';
import type { Snapshot, Task } from '../../shared/types';
import { Modal, type PageProps } from '../ui';
import { EstimateField } from './EstimateField';
import { estimateLabel, minutesLabel } from './format';

export interface TaskOutcomeDialogProps {
  /** The task the outcome is for. A calendar entry's outcome uses the planning dialog instead. */
  task: Task;
  state: Snapshot;
  now: string;
  run: PageProps['run'];
  initialMode?: 'choices' | 'partial';
  onClose: () => void;
}

type Continue = 'none' | 'today' | 'tomorrow';

/**
 * Outcome of a task that needs no calendar entry: done, partly done with the remaining
 * time, or stop recording and keep the task open. Nothing here books a time.
 */
export function TaskOutcomeDialog({ task, state, now, run, initialMode = 'choices', onClose }: TaskOutcomeDialogProps) {
  const [mode, setMode] = useState(initialMode);
  const [remaining, setRemaining] = useState<number | undefined>();
  const [remainingValid, setRemainingValid] = useState(false);
  const [when, setWhen] = useState<Continue>('none');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // Created once for this dialog, so a retried partial outcome names the same remaining task.
  const [remainingTaskId] = useState(() => crypto.randomUUID());
  const session = unfinishedSessionForTarget(state, { kind: 'task', taskId: task.id });
  const recorded = session ? recordedMinutes(session, now) : 0;
  const today = dateKey(now, state.settings.timezone);
  const send = async (command: Parameters<PageProps['run']>[0]) => { setBusy(true); try { if (await run(command)) onClose(); } finally { setBusy(false); } };
  const trimmed = note.trim();
  return <Modal className="v3-sheet" title={mode === 'partial' ? 'Partly done' : 'How did it go?'} onClose={onClose} dirty={mode === 'partial' && (remaining !== undefined || !!trimmed)}>
    <div className="v3-stack">
      <header className="v3-dialog-subject">
        <h3>{task.title}</h3>
        <p className="v3-hint">Estimate: {estimateLabel(task.duration)}{session ? ` · ${sessionState(session) === 'running' ? 'recording' : 'paused'}, ${minutesLabel(recorded)} recorded` : ''}</p>
        {task.doneWhen && <p className="v3-focus-guidance"><span>Done when</span>{task.doneWhen}</p>}
      </header>
      {mode === 'choices' ? <>
        <button type="button" className="primary" disabled={busy} onClick={() => send({ type: 'task.resolve', id: task.id, outcome: 'complete' })}><Check size={18} aria-hidden="true"/>Done</button>
        <button type="button" disabled={busy} onClick={() => setMode('partial')}>Partly done…</button>
        {session && <button type="button" disabled={busy} onClick={() => send({ type: 'session.stop', id: session.id })}><Square size={16} aria-hidden="true"/>Stop recording · keep task open</button>}
        {session && <p className="v3-hint">Done and Partly done also end this recording at the time you confirm.</p>}
        <button type="button" className="text-button" disabled={busy} onClick={onClose}>Not now</button>
      </> : <form className="v3-stack" onSubmit={event => {
        event.preventDefault();
        if (!remainingValid || remaining === undefined) return;
        void send({ type: 'task.resolve', id: task.id, outcome: 'partial', remaining: { duration: remaining, taskId: remainingTaskId, ...(when === 'none' ? {} : { preferredDay: when === 'today' ? today : addDays(today, 1) }) }, ...(trimmed ? { note: trimmed } : {}) });
      }}>
        <p className="v3-hint">This task is kept as partly done. One new open task holds the remaining work, with the same goal and guidance.</p>
        <EstimateField label="Remaining time" required value={remaining} onChange={(value, valid) => { setRemaining(value); setRemainingValid(valid); }} hint="Your own estimate of what is left. Recorded time is not subtracted for you."/>
        <fieldset className="v3-field">
          <legend>Continue on<span className="v3-optional">optional</span></legend>
          <div className="v3-chip-row">{([['none', 'No day yet'], ['today', 'Today'], ['tomorrow', 'Tomorrow']] as const).map(([value, label]) => <button type="button" key={value} data-dirty aria-pressed={when === value} className={when === value ? 'selected' : ''} onClick={() => setWhen(value)}>{label}</button>)}</div>
          <p className="v3-hint">This is an intention, not a calendar booking.</p>
        </fieldset>
        <label className="v3-field"><span>Note<span className="v3-optional">optional</span></span><textarea rows={2} maxLength={1000} value={note} onChange={event => setNote(event.target.value)}/></label>
        <div className="v3-actions">
          <button type="button" disabled={busy} onClick={() => setMode('choices')}>Back</button>
          <button className="primary" disabled={busy || !remainingValid}>{busy ? 'Saving…' : 'Save remaining work'}</button>
        </div>
      </form>}
    </div>
  </Modal>;
}
