import { useId } from 'react';
import { Field } from '../ui';
import { readWindowDraft, type WindowDraft } from './windowDraft';
import './planning-v3.css';

export interface PlanningWindowFieldsProps {
  value: WindowDraft;
  timezone: string;
  onChange: (value: WindowDraft) => void;
  label?: string;
  disabled?: boolean;
  showErrors?: boolean;
  original?: { start: string; end: string };
}

/** Editing never changes the time zone, silently fixes an invalid time, or writes a booking. */
export function PlanningWindowFields({ value, timezone, onChange, label = 'Planning window', disabled = false, showErrors = false, original }: PlanningWindowFieldsProps) {
  const id = useId();
  const result = readWindowDraft(value, timezone, original);
  const complete = Object.values(value).every(Boolean);
  const error = !result.valid && (complete || showErrors) ? result.error : undefined;
  const change = (key: keyof WindowDraft, next: string) => onChange({ ...value, [key]: next });
  const dateTime = (part: 'start' | 'end') => {
    const name = part === 'start' ? 'Start' : 'End';
    return <div className="planning-v3-time-pair">
      <Field label={`${name} date`}><input type="date" value={value[`${part}Date`]} onChange={e => change(`${part}Date`, e.target.value)} aria-invalid={!!error} aria-describedby={`${id}-zone${error ? ` ${id}-error` : ''}`} /></Field>
      <Field label={`${name} time`}><input type="time" step="60" value={value[`${part}Time`]} onChange={e => change(`${part}Time`, e.target.value)} aria-invalid={!!error} aria-describedby={`${id}-zone${error ? ` ${id}-error` : ''}`} /></Field>
    </div>;
  };
  return <fieldset className="planning-v3 planning-v3-window" disabled={disabled}>
    <legend>{label}</legend>
    <p className="planning-v3-muted" id={`${id}-zone`}>All times in {timezone}. Overnight plans need an end date after the start date. Existing times are preserved; new times in a repeated hour use the earlier occurrence.</p>
    <div className="planning-v3-time-grid">{dateTime('start')}{dateTime('end')}</div>
    {error && <p className="planning-v3-notice" role="alert" id={`${id}-error`}>{error}</p>}
  </fieldset>;
}
