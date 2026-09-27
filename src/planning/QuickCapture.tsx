import { useId, useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import type { PageProps } from '../ui';

export interface QuickCaptureProps {
  run: PageProps['run'];
  /** Offered after a save. Nothing is planned or opened automatically. */
  onAddDetails?: (taskId: string) => void;
  onPlan?: (taskId: string) => void;
  autoFocus?: boolean;
}

/**
 * Title and an optional note. No estimate, time, goal or started day is needed. A blank
 * estimate stays unknown in the saved task.
 */
export function QuickCapture({ run, onAddDetails, onPlan, autoFocus = false }: QuickCaptureProps) {
  const id = useId();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [withNote, setWithNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<{ id: string; title: string } | null>(null);
  // One ID per intent: kept through a retry, replaced only after a confirmed save.
  const [taskId, setTaskId] = useState(() => crypto.randomUUID());
  const input = useRef<HTMLInputElement>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const name = title.trim();
    if (!name || busy) return;
    setBusy(true);
    try {
      const ok = await run({ type: 'task.capture', task: { id: taskId, title: name, ...(note.trim() ? { notes: note.trim() } : {}) } });
      if (!ok) return;
      setSaved({ id: taskId, title: name });
      setTitle(''); setNote(''); setWithNote(false); setTaskId(crypto.randomUUID());
      input.current?.focus();
    } finally { setBusy(false); }
  }
  return <section className="v3-capture" aria-label="Add a task">
    <form onSubmit={submit}>
      <label className="v3-field" htmlFor={`${id}-title`}><span>New task</span>
        <input id={`${id}-title`} ref={input} autoFocus={autoFocus} required maxLength={200} autoComplete="off" value={title} onChange={event => { setTitle(event.target.value); if (saved) setSaved(null); }} placeholder="What needs doing?"/>
      </label>
      {withNote
        ? <label className="v3-field" htmlFor={`${id}-note`}><span>Note<span className="v3-optional">optional</span></span><textarea id={`${id}-note`} rows={2} maxLength={10000} value={note} onChange={event => setNote(event.target.value)}/></label>
        : <button type="button" className="text-button" onClick={() => setWithNote(true)}>Add a note</button>}
      <button className="primary" disabled={busy || !title.trim()}><Plus size={18} aria-hidden="true"/>{busy ? 'Saving…' : 'Save task'}</button>
    </form>
    {saved && <div className="v3-capture-saved" role="status">
      <p><CheckCircle2 size={16} aria-hidden="true"/>Saved “{saved.title}”. It has no estimate or time yet.</p>
      <div className="v3-actions">
        {onAddDetails && <button type="button" onClick={() => onAddDetails(saved.id)}>Add details</button>}
        {onPlan && <button type="button" onClick={() => onPlan(saved.id)}>Plan task</button>}
      </div>
    </div>}
  </section>;
}
