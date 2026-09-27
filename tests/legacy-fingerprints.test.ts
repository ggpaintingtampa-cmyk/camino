import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { commandEnvelopeSchema } from '../shared/schema';
import { hashToken } from '../server/repository.js';

// The fixture was captured from the integration baseline before any v3 schema edit.
// A failure means an accepted legacy request would no longer reach its stored receipt.
// Fix the schema; never regenerate the fixture to make this pass.
interface Captured { wire: unknown; parsed: string; fingerprint: string }
const fixture = JSON.parse(readFileSync(resolve('tests/fixtures/legacy-envelope-fingerprints.json'), 'utf8')) as { envelopes: Record<string, Captured> };

describe('legacy command wire compatibility', () => {
  it('covers every legacy command type', () => {
    const types = new Set(Object.values(fixture.envelopes).map(entry => (entry.wire as { command: { type: string } }).command.type));
    expect([...types].sort()).toEqual([
      'block.conflictReviewed', 'block.resolve', 'block.save', 'block.snooze', 'block.start',
      'day.checkin', 'day.end', 'day.regenerate', 'day.reopen', 'day.save', 'day.start',
      'envelope.create', 'envelope.resolve', 'goal.save', 'ledger.adjust', 'location.save', 'log.save',
      'record.archive', 'reminder.save', 'settings.save', 'task.save', 'template.apply', 'template.save',
    ]);
  });
  for (const [name, captured] of Object.entries(fixture.envelopes)) {
    it(`keeps the parsed form and receipt fingerprint of ${name}`, () => {
      const parsed = JSON.stringify(commandEnvelopeSchema.parse(captured.wire));
      expect(parsed).toBe(captured.parsed);
      expect(hashToken(parsed)).toBe(captured.fingerprint);
    });
  }
  it('still accepts the original four-tab navigation order and an omitted order', () => {
    expect(commandEnvelopeSchema.safeParse(fixture.envelopes['settings.save.fourTab'].wire).success).toBe(true);
    expect(commandEnvelopeSchema.safeParse(fixture.envelopes['settings.save.noNav'].wire).success).toBe(true);
  });
});
