import { dateKey, localInstant, minuteOfDay } from '../../shared/dates';

/** Unsaved wall-clock fields only. Persisted intervals and capacity belong to shared/. */
export interface WindowDraft {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export type WindowResult =
  | { valid: true; start: string; end: string }
  | { valid: false; error: string };

export function readWindowDraft(draft: WindowDraft, timezone: string, original?: { start: string; end: string }): WindowResult {
  if (!draft.startDate || !draft.startTime || !draft.endDate || !draft.endTime) {
    return { valid: false, error: 'Choose both dates and times.' };
  }
  try {
    const originalDraft = original ? windowDraftFromInstants(original.start, original.end, timezone) : undefined;
    // Preserve a booked later occurrence of a repeated hour when that field was not edited.
    const start = original && originalDraft?.startDate === draft.startDate && originalDraft.startTime === draft.startTime
      ? original.start : localInstant(draft.startDate, draft.startTime, timezone);
    const end = original && originalDraft?.endDate === draft.endDate && originalDraft.endTime === draft.endTime
      ? original.end : localInstant(draft.endDate, draft.endTime, timezone);
    if (Date.parse(end) <= Date.parse(start)) {
      return { valid: false, error: 'End must be after start. For overnight time, choose the next date.' };
    }
    return { valid: true, start, end };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : 'Choose valid dates and times.' };
  }
}

export function windowDraftFromInstants(start: string, end: string, timezone: string): WindowDraft {
  const time = (instant: string) => {
    const minutes = minuteOfDay(instant, timezone);
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  };
  return { startDate: dateKey(start, timezone), startTime: time(start), endDate: dateKey(end, timezone), endTime: time(end) };
}
