import { addDays, dateKey, timeLabel } from '../../shared/dates';
import type { Block, TaskDeadline } from '../../shared/types';

/** Whole minutes as "45 min", "1h" or "1h 30m". */
export function minutesLabel(minutes: number): string {
  const whole = Math.max(0, Math.round(minutes));
  if (whole < 60) return `${whole} min`;
  return whole % 60 ? `${Math.floor(whole / 60)}h ${whole % 60}m` : `${Math.floor(whole / 60)}h`;
}

/** An absent estimate is unknown. It is never shown as zero or as a default. */
export function estimateLabel(minutes?: number): string {
  return minutes === undefined ? 'No estimate' : minutesLabel(minutes);
}

export function dateLabel(date: string, today: string): string {
  if (date === today) return 'Today';
  if (date === addDays(today, 1)) return 'Tomorrow';
  if (date === addDays(today, -1)) return 'Yesterday';
  // Noon UTC keeps the calendar date stable in every zone.
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

export function rangeLabel(start: string, end: string, zone: string): string {
  return `${timeLabel(start, zone)} – ${timeLabel(end, zone)}`;
}

/** A date-only deadline stays a date. A timed one shows its own zone when that differs. */
export function deadlineLabel(deadline: TaskDeadline, zone: string, today: string): string {
  if (deadline.kind === 'date') return `Due ${dateLabel(deadline.date, today)}`;
  const day = dateLabel(dateKey(deadline.at, deadline.timezone), today);
  const suffix = deadline.timezone === zone ? '' : ` (${deadline.timezone.replaceAll('_', ' ')})`;
  return `Due ${day} at ${timeLabel(deadline.at, deadline.timezone)}${suffix}`;
}

export function kindLabel(block: Pick<Block, 'kind'>, flexibility: 'fixed' | 'flexible'): string {
  if (block.kind === 'appointment') return flexibility === 'fixed' ? 'Fixed appointment' : 'Flexible appointment';
  if (block.kind === 'routine') return flexibility === 'fixed' ? 'Fixed routine' : 'Routine';
  return flexibility === 'fixed' ? 'Fixed task time' : 'Flexible task time';
}

export const ESTIMATE_MIN = 5;
export const ESTIMATE_MAX = 1440;
/** Blank means unknown. Anything else must be a whole number of minutes in five-minute steps. */
export function parseEstimate(raw: string): { value?: number; error?: string } {
  const text = raw.trim();
  if (!text) return {};
  if (!/^\d+$/.test(text)) return { error: 'Enter whole minutes, or leave this blank.' };
  const value = Number(text);
  if (value < ESTIMATE_MIN || value > ESTIMATE_MAX) return { error: `Use ${ESTIMATE_MIN} to ${ESTIMATE_MAX} minutes, or leave this blank.` };
  if (value % 5 !== 0) return { error: 'Use five-minute steps, such as 25 or 30.' };
  return { value };
}
