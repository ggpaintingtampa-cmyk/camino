import { describe, expect, it } from 'vitest';
import { readWindowDraft, windowDraftFromInstants, type WindowDraft } from '../src/planning/windowDraft';

const draft: WindowDraft = { startDate: '2026-09-28', startTime: '08:37', endDate: '2026-09-28', endTime: '17:12' };

describe('R1 planning wall-clock draft adapter', () => {
  it('uses the owner zone and preserves exact minutes instead of rounding to a slot', () => {
    expect(readWindowDraft(draft, 'Asia/Kathmandu')).toEqual({ valid: true, start: '2026-09-28T02:52:00.000Z', end: '2026-09-28T11:27:00.000Z' });
  });
  it('keeps missing or malformed input invalid without inventing an interval', () => {
    expect(readWindowDraft({ ...draft, startTime: '' }, 'UTC').valid).toBe(false);
    expect(readWindowDraft({ ...draft, startDate: '2026-02-30' }, 'UTC').valid).toBe(false);
    expect(readWindowDraft(draft, 'invalid/zone').valid).toBe(false);
  });
  it('requires an explicit overnight end date', () => {
    const overnight = { ...draft, startTime: '23:15', endTime: '01:15' };
    expect(readWindowDraft(overnight, 'America/New_York')).toMatchObject({ valid: false, error: expect.stringContaining('next date') });
    expect(readWindowDraft({ ...overnight, endDate: '2026-09-29' }, 'America/New_York')).toEqual({ valid: true, start: '2026-09-29T03:15:00.000Z', end: '2026-09-29T05:15:00.000Z' });
  });
  it('returns the shared DST-gap error and leaves the input untouched', () => {
    const gap = { startDate: '2026-03-08', startTime: '02:30', endDate: '2026-03-08', endTime: '04:00' };
    expect(readWindowDraft(gap, 'America/New_York')).toMatchObject({ valid: false, error: expect.stringContaining('clocks move forward') });
    expect(gap.startTime).toBe('02:30');
  });
  it('uses the earlier fold occurrence for a new booking', () => {
    expect(readWindowDraft({ startDate: '2026-11-01', startTime: '01:30', endDate: '2026-11-01', endTime: '02:30' }, 'America/New_York')).toEqual({ valid: true, start: '2026-11-01T05:30:00.000Z', end: '2026-11-01T07:30:00.000Z' });
  });
  it('preserves an existing later fold occurrence when reopening or editing only the end', () => {
    const original = { start: '2026-11-01T06:30:00.000Z', end: '2026-11-01T07:30:00.000Z' };
    const fields = windowDraftFromInstants(original.start, original.end, 'America/New_York');
    expect(readWindowDraft(fields, 'America/New_York', original)).toEqual({ valid: true, ...original });
    expect(readWindowDraft({ ...fields, endTime: '03:00' }, 'America/New_York', original)).toEqual({ valid: true, start: original.start, end: '2026-11-01T08:00:00.000Z' });
  });
});
