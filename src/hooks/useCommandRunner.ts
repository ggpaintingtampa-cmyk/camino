import { useCallback, useEffect, useRef, useState } from 'react';
import type { ErrorDetails } from '../../shared/contracts';
import type { Command, CommandEnvelope, Snapshot } from '../../shared/types';
import * as api from '../api';
import { useServerClock } from './useServerClock';

/** What the owner is told about the last attempted change. `label` names that change neutrally. */
export type SaveState =
  | { kind: 'idle' }
  | { kind: 'saving'; label: string }
  | { kind: 'saved'; label: string }
  | { kind: 'rejected'; label: string; message: string; code?: string; details?: ErrorDetails }
  | { kind: 'stale'; label: string; message: string; currentRevision?: number }
  | { kind: 'uncertain'; label: string; message: string }
  | { kind: 'offline'; label: string; message: string }
  | { kind: 'signed-out'; label: string; message: string; uncertain?: boolean };

export type RunFailure = 'rejected' | 'stale' | 'uncertain' | 'offline' | 'signed-out' | 'blocked';
export type RunOutcome =
  | { ok: true; revision: number }
  | { ok: false; reason: RunFailure; message: string; code?: string; details?: ErrorDetails };
export interface RunOptions { label?: string }

export interface CommandRunner {
  snapshot: Snapshot | null;
  now: string;
  online: boolean;
  busy: boolean;
  saveState: SaveState;
  /** True while an earlier change still needs its exact retry. New changes are refused until then. */
  pending: boolean;
  /** Submits at the newest accepted revision. Resolves `true` only after the server confirmed the change. */
  run: (command: Command, options?: RunOptions) => Promise<boolean>;
  /** Submits at exactly the revision a preview was built from. Never replaced by a newer one. */
  runReviewed: (command: Command, reviewedRevision: number, options?: RunOptions) => Promise<RunOutcome>;
  /** Sends the retained envelope again: same request ID, revision, payload and generated IDs. */
  retry: () => Promise<boolean>;
  /** Drops a change that the server definitely refused because the owner was signed out. */
  discardSignedOut: () => void;
  dismiss: () => void;
  refresh: () => Promise<void>;
  reset: () => void;
}

const LABELS: Partial<Record<Command['type'], string>> = {
  'task.capture': 'Save task', 'task.update': 'Save task details', 'task.save': 'Save task', 'task.resolve': 'Record task outcome', 'task.reopen': 'Reopen task',
  'task.defer': 'Move task to another day', 'task.plan': 'Save task and booking', 'dayPlan.save': 'Save today’s plan', 'plan.apply': 'Apply plan changes',
  'session.start': 'Start recording', 'session.pause': 'Pause recording', 'session.resume': 'Resume recording', 'session.switch': 'Switch task', 'session.stop': 'Stop recording',
  'day.start': 'Start day', 'day.startWithCheckin': 'Start day', 'day.end': 'End day', 'day.close': 'End day', 'day.save': 'Save writing',
  'block.save': 'Save calendar entry', 'block.resolve': 'Record outcome', 'block.snooze': 'Set review reminder', 'template.apply': 'Apply template',
  'settings.save': 'Save settings', 'settings.saveV3': 'Save settings',
};
export function describeCommand(command: Command): string { return LABELS[command.type] ?? 'Save changes'; }

const UNCERTAIN = 'Caminos could not confirm whether this was saved. Retry save safely sends the same request again and cannot apply it twice.';
const STALE = 'Your records changed since you reviewed this. Nothing was saved. Check the refreshed information, then save again.';

/** Stored records are spread into save commands; timestamps are server-owned and never sent back. */
function withoutTimestamps(command: Command): Command {
  return JSON.parse(JSON.stringify(command, (key, value) => key === 'createdAt' || key === 'updatedAt' ? undefined : value)) as Command;
}

/**
 * The one command path of the client. It owns the accepted snapshot, the server-derived
 * clock, polling, and the state of the last attempted change. Nothing is written to
 * browser storage: a retained envelope lives in memory and is lost on reload.
 */
export function useCommandRunner({ enabled, onSignedOut }: { enabled: boolean; onSignedOut: () => void }): CommandRunner {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const snapshotRef = useRef<Snapshot | null>(null);
  const [online, setOnline] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [saveState, setSaveState] = useState<SaveState>({ kind: 'idle' });
  const retained = useRef<{ envelope: CommandEnvelope; label: string; signedOut: boolean; uncertain: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const waiting = useRef<((outcome: RunOutcome) => void)[]>([]);
  const signedOut = useRef(onSignedOut);
  signedOut.current = onSignedOut;
  const { now, sync } = useServerClock();

  const accept = useCallback((next: Snapshot) => {
    const current = snapshotRef.current;
    // Monotonic: a slow response never replaces a newer snapshot.
    if (current && next.revision < current.revision) return;
    if (current && next.revision === current.revision && Date.parse(next.serverNow) < Date.parse(current.serverNow)) return;
    snapshotRef.current = next; setSnapshot(next); sync(next.serverNow); setOnline(true);
  }, [sync]);

  const dropSession = useCallback(() => { snapshotRef.current = null; setSnapshot(null); signedOut.current(); }, []);

  const refresh = useCallback(async () => {
    try { accept(await api.snapshot()); }
    catch (error) {
      if (error instanceof api.ApiError && error.status === 401) dropSession();
      else setOnline(false);
    }
  }, [accept, dropSession]);

  const announce = (message: string, uncertain: boolean) => window.dispatchEvent(new CustomEvent('caminos-error', { detail: { message, uncertain } }));
  const settle = (outcome: RunOutcome) => { for (const resolve of waiting.current.splice(0)) resolve(outcome); };

  const execute = useCallback(async (envelope: CommandEnvelope, label: string): Promise<RunOutcome> => {
    const wasUncertain = retained.current?.uncertain === true;
    busyRef.current = true; setBusy(true); setSaveState({ kind: 'saving', label });
    try {
      const result = await api.mutate(envelope);
      accept(result.snapshot);
      retained.current = null; setPending(false);
      setSaveState({ kind: 'saved', label });
      window.dispatchEvent(new Event('caminos-saved'));
      const outcome: RunOutcome = { ok: true, revision: result.snapshot.revision };
      settle(outcome);
      return outcome;
    } catch (caught) {
      const error = caught instanceof api.ApiError ? caught : new api.ApiError('Unable to complete this request.', 0, undefined, undefined, undefined, true);
      if (error.uncertain || (wasUncertain && error.status !== 401 && error.code !== 'REVISION_CONFLICT')) {
        retained.current = { envelope, label, signedOut: false, uncertain: true }; setPending(true);
        setSaveState({ kind: 'uncertain', label, message: UNCERTAIN });
        announce(UNCERTAIN, true);
        if (error.status === 0) setOnline(navigator.onLine !== false);
        // The caller keeps waiting: its draft and its generated IDs stay with the retained envelope.
        return new Promise<RunOutcome>(resolve => { waiting.current.push(resolve); });
      }
      if (error.status === 401) {
        retained.current = { envelope, label, signedOut: true, uncertain: wasUncertain }; setPending(true);
        const message = wasUncertain ? 'You were signed out while checking an earlier save. Its result is still unknown. Sign in and retry the same request safely.' : 'You were signed out, so this was not saved. Sign in to send it again.';
        setSaveState({ kind: 'signed-out', label, message, uncertain: wasUncertain });
        const outcome: RunOutcome = { ok: false, reason: 'signed-out', message, code: error.code };
        settle(outcome); dropSession();
        return outcome;
      }
      retained.current = null; setPending(false);
      let outcome: RunOutcome;
      if (error.code === 'REVISION_CONFLICT') {
        setSaveState({ kind: 'stale', label, message: STALE, currentRevision: error.currentRevision });
        announce(STALE, false);
        outcome = { ok: false, reason: 'stale', message: STALE, code: error.code };
      } else {
        setSaveState({ kind: 'rejected', label, message: error.message, code: error.code, details: error.details });
        announce(error.message, false);
        outcome = { ok: false, reason: 'rejected', message: error.message, code: error.code, details: error.details };
      }
      // A conflict means this client's picture is out of date, whatever the reason.
      if (error.status === 409) await refresh();
      settle(outcome);
      return outcome;
    } finally { busyRef.current = false; setBusy(false); }
  }, [accept, dropSession, refresh]);

  const submit = useCallback(async (supplied: Command, revision: number | undefined, options?: RunOptions): Promise<RunOutcome> => {
    const command = withoutTimestamps(supplied);
    const label = options?.label ?? describeCommand(command);
    const current = snapshotRef.current;
    if (!current) return { ok: false, reason: 'blocked', message: 'Caminos is still opening your records.' };
    if (busyRef.current) return { ok: false, reason: 'blocked', message: 'Another change is being saved. Try again in a moment.' };
    if (retained.current) {
      const message = 'An earlier change still needs to be confirmed. Use Retry save safely before making another change.';
      announce(message, true);
      return { ok: false, reason: 'blocked', message };
    }
    if (navigator.onLine === false) {
      const message = 'You are offline, so this was not sent. Nothing is stored on this device. Reconnect and save again.';
      setSaveState({ kind: 'offline', label, message }); setOnline(false); announce(message, false);
      return { ok: false, reason: 'offline', message };
    }
    // The request ID and revision are fixed here, once per intent, and kept through every retry.
    return execute({ requestId: crypto.randomUUID(), baseRevision: revision ?? current.revision, command }, label);
  }, [execute]);

  const run = useCallback(async (command: Command, options?: RunOptions) => (await submit(command, undefined, options)).ok, [submit]);
  const runReviewed = useCallback((command: Command, reviewedRevision: number, options?: RunOptions) => submit(command, reviewedRevision, options), [submit]);
  const retry = useCallback(async () => {
    const kept = retained.current;
    if (!kept || busyRef.current) return false;
    return (await execute(kept.envelope, kept.label)).ok;
  }, [execute]);
  const discardSignedOut = useCallback(() => {
    if (!retained.current?.signedOut || retained.current.uncertain) return;
    retained.current = null; setPending(false); setSaveState({ kind: 'idle' });
  }, []);
  // A notice about a change that still needs its retry cannot be dismissed away.
  const dismiss = useCallback(() => setSaveState(state => retained.current || state.kind === 'saving' ? state : { kind: 'idle' }), []);
  const reset = useCallback(() => { snapshotRef.current = null; setSnapshot(null); }, []);

  useEffect(() => {
    if (saveState.kind !== 'saved') return;
    const timer = setTimeout(() => setSaveState(state => state.kind === 'saved' ? { kind: 'idle' } : state), 4000);
    return () => clearTimeout(timer);
  }, [saveState]);

  useEffect(() => {
    const listener = () => { void retry(); };
    window.addEventListener('caminos-retry', listener);
    return () => window.removeEventListener('caminos-retry', listener);
  }, [retry]);

  useEffect(() => {
    if (!enabled) return;
    // After signing in again, a change refused for being signed out can be sent as it was.
    if (retained.current?.signedOut) setSaveState({ kind: 'signed-out', label: retained.current.label, uncertain: retained.current.uncertain, message: retained.current.uncertain ? 'The earlier save still has an unknown result. Retry safely to confirm it.' : 'This change was not saved because you were signed out. Send it again, or discard it.' });
    void refresh();
    const tick = () => { if (!document.hidden && !busyRef.current) void refresh(); };
    const poll = setInterval(tick, 15000);
    const goOnline = () => { setOnline(true); tick(); };
    const goOffline = () => setOnline(false);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [enabled, refresh]);

  return { snapshot, now, online, busy, saveState, pending, run, runReviewed, retry, discardSignedOut, dismiss, refresh, reset };
}
