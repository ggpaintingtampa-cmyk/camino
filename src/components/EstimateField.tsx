import { useId, useState } from 'react';
import { minutesLabel, parseEstimate } from './format';

export interface EstimateFieldProps {
  label?: string;
  /** Absent means unknown. */
  value?: number;
  /** `valid` is false while the typed text cannot be saved. `value` is then the last valid one. */
  onChange: (value: number | undefined, valid: boolean) => void;
  /** Remaining time after partial work must be supplied; an estimate may stay blank. */
  required?: boolean;
  hint?: string;
  disabled?: boolean;
}

const QUICK = [15, 30, 60, 90];

/** A blank field stays blank: it is never turned into 0 or 30. */
export function EstimateField({ label = 'Estimate', value, onChange, required = false, hint, disabled = false }: EstimateFieldProps) {
  const id = useId();
  const [raw, setRaw] = useState(value === undefined ? '' : String(value));
  const parsed = parseEstimate(raw);
  const missing = required && !raw.trim();
  const error = parsed.error ?? (missing ? 'Enter the remaining time in minutes.' : undefined);
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  const update = (text: string) => {
    setRaw(text);
    const next = parseEstimate(text);
    onChange(next.error ? value : next.value, !next.error && !(required && !text.trim()));
  };
  return <div className="v3-field v3-estimate">
    <label htmlFor={`${id}-input`}>{label}<span className="v3-optional">{required ? 'required' : 'optional'}</span></label>
    <div className="v3-estimate-input">
      <input id={`${id}-input`} inputMode="numeric" autoComplete="off" value={raw} disabled={disabled} placeholder={required ? '' : 'Not estimated'} aria-invalid={error ? true : undefined} aria-describedby={describedBy} onChange={e => update(e.target.value)}/>
      <span aria-hidden="true">min</span>
    </div>
    <div className="v3-chip-row" role="group" aria-label={`${label} shortcuts`}>
      {QUICK.map(minutes => <button type="button" key={minutes} data-dirty disabled={disabled} aria-pressed={parsed.value === minutes} className={parsed.value === minutes ? 'selected' : ''} onClick={() => update(String(minutes))}>{minutesLabel(minutes)}</button>)}
      {!required && <button type="button" data-dirty disabled={disabled} aria-pressed={!raw.trim()} className={!raw.trim() ? 'selected' : ''} onClick={() => update('')}>No estimate</button>}
    </div>
    {hint && <p className="v3-hint" id={`${id}-hint`}>{hint}</p>}
    {error && <p className="v3-field-error" id={`${id}-error`} role="alert">{error}</p>}
  </div>;
}
