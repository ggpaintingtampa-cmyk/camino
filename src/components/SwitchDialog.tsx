import { minutesLabel } from './format';
import { Modal } from '../ui';

export interface SwitchDialogProps {
  runningTitle: string;
  runningMinutes: number;
  targetTitle: string;
  /** `resume` when the chosen task already has paused work. */
  verb: 'start' | 'resume';
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Only one recording runs at a time. Pausing the current one is always an explicit choice. */
export function SwitchDialog({ runningTitle, runningMinutes, targetTitle, verb, busy, onConfirm, onCancel }: SwitchDialogProps) {
  return <Modal className="v3-sheet" title="You are recording another task" onClose={onCancel}>
    <div className="v3-stack">
      <p><strong>{runningTitle}</strong> is recording, {minutesLabel(runningMinutes)} so far. It will be paused, not finished, and you can resume it later.</p>
      <div className="v3-actions">
        <button type="button" disabled={busy} onClick={onCancel}>Keep recording {runningTitle}</button>
        <button type="button" className="primary" disabled={busy} onClick={onConfirm}>{busy ? 'Switching…' : `Pause it and ${verb} ${targetTitle}`}</button>
      </div>
    </div>
  </Modal>;
}
