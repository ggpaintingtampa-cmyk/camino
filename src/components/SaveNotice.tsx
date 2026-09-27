import { AlertTriangle as TriangleAlert, CheckCircle2, CloudOff, RefreshCw, X } from 'lucide-react';
import type { SaveState } from '../hooks/useCommandRunner';

export interface SaveNoticeProps {
  state: SaveState;
  busy: boolean;
  online: boolean;
  onRetry: () => void;
  onDismiss: () => void;
  onDiscardSignedOut: () => void;
  onReconnect: () => void;
}

/**
 * Reports what the runner actually knows. It never says "saved" before the server
 * confirmed, and never says "not saved" when the outcome is unknown.
 */
export function SaveNotice({ state, busy, online, onRetry, onDismiss, onDiscardSignedOut, onReconnect }: SaveNoticeProps) {
  return <div className="v3-save-notices">
    {!online && <div className="v3-notice v3-notice-warning" role="status">
      <CloudOff size={18} aria-hidden="true"/>
      <p><strong>Connection paused.</strong> Caminos cannot reach the server. Nothing is stored on this device, so changes cannot be saved until it reconnects.</p>
      <button type="button" onClick={onReconnect}><RefreshCw size={16} aria-hidden="true"/>Reconnect</button>
    </div>}
    {state.kind === 'uncertain' && <div className="v3-notice v3-notice-warning" role="alert">
      <TriangleAlert size={18} aria-hidden="true"/>
      <p><strong>{state.label}: result unknown.</strong> {state.message}</p>
      <button type="button" className="primary" disabled={busy} onClick={onRetry}>{busy ? 'Retrying…' : 'Retry save safely'}</button>
    </div>}
    {state.kind === 'signed-out' && <div className="v3-notice v3-notice-warning" role="alert">
      <TriangleAlert size={18} aria-hidden="true"/>
      <p><strong>{state.label}: {state.uncertain ? 'result unknown' : 'not saved'}.</strong> {state.message}</p>
      <button type="button" className="primary" disabled={busy} onClick={onRetry}>Send again</button>
      {!state.uncertain && <button type="button" disabled={busy} onClick={onDiscardSignedOut}>Discard</button>}
    </div>}
    {state.kind === 'stale' && <div className="v3-notice v3-notice-warning" role="alert">
      <TriangleAlert size={18} aria-hidden="true"/>
      <p><strong>{state.label}: not saved.</strong> {state.message}</p>
      <button type="button" className="icon-button" aria-label="Dismiss message" onClick={onDismiss}><X size={16} aria-hidden="true"/></button>
    </div>}
    {(state.kind === 'rejected' || state.kind === 'offline') && <div className="v3-notice v3-notice-warning" role="alert">
      <TriangleAlert size={18} aria-hidden="true"/>
      <p><strong>{state.label}: not saved.</strong> {state.message}</p>
      <button type="button" className="icon-button" aria-label="Dismiss message" onClick={onDismiss}><X size={16} aria-hidden="true"/></button>
    </div>}
    {state.kind === 'saved' && <div className="save-toast v3-saved" role="status">
      <CheckCircle2 size={16} aria-hidden="true"/>Saved
      <button type="button" aria-label="Dismiss saved message" onClick={onDismiss}><X size={15} aria-hidden="true"/></button>
    </div>}
  </div>;
}
