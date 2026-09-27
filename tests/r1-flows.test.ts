import { afterEach, describe, expect, it } from 'vitest';
import { Repository } from '../server/repository';
import { previewPlanChange, previewTemplateApplication } from '../shared/planning';
import { factsForDay } from '../shared/review';
import { previewDayClose } from '../shared/sessions';
import { summaryForDay } from '../shared/domain';
import type { Command } from '../shared/types';

const repositories: Repository[] = [];
const at = (time: string) => `2026-09-18T${time}:00.000Z`;
function fixture() {
  const repo = new Repository(':memory:'); repositories.push(repo);
  const run = (command: Command, now = at('14:00')) => repo.execute({ requestId: crypto.randomUUID(), baseRevision: repo.snapshot().revision, command }, now);
  return { repo, run };
}
afterEach(() => { for (const repo of repositories.splice(0)) repo.close(); });

describe('R1 integrated daily-loop release gate', () => {
  it('captures, starts, partially completes and reopens work without inventing a calendar booking or estimate', () => {
    const { repo, run } = fixture();
    run({ type: 'task.capture', task: { id: 'task-a', title: 'Synthetic draft' } });
    expect(repo.snapshot().tasks[0].duration).toBeUndefined();
    run({ type: 'session.start', target: { kind: 'task', taskId: 'task-a' } });
    const envelope = { requestId: crypto.randomUUID(), baseRevision: repo.snapshot().revision, command: { type: 'task.resolve' as const, id: 'task-a', outcome: 'partial' as const, remaining: { taskId: 'remaining-a', duration: 20, preferredDay: '2026-09-19' } } };
    repo.execute(envelope, at('14:15')); repo.execute(envelope, at('14:20'));
    const state = repo.snapshot();
    expect(state.tasks).toHaveLength(2); expect(state.taskOutcomes).toHaveLength(1);
    expect(state.blocks).toEqual([]); expect(state.days).toEqual([]);
    expect(state.workSessions[0].endedAt).toBe(at('14:15'));
    expect(factsForDay(state, '2026-09-18', at('14:30'))).toMatchObject({ partialTaskIds: ['task-a'], recorded: { minutes: 15 }, plannedMinutes: 0 });
    run({ type: 'task.resolve', id: 'remaining-a', outcome: 'complete' });
    run({ type: 'task.reopen', id: 'remaining-a' });
    expect(repo.snapshot().taskOutcomes.map(o => o.kind)).toEqual(['partial', 'complete', 'reopen']);
    expect(repo.snapshot().tasks[1].status).toBe('open');
  });
  it('saves morning check-in atomically and exactly once, including optional logs', () => {
    const { repo, run } = fixture(), before = repo.snapshot();
    expect(() => run({ type: 'day.startWithCheckin', date: '2026-09-18', wakeAt: at('11:00'), logs: [{ kind: 'weight', at: at('11:00'), value: 150 }, { kind: 'sleep', start: at('12:00'), end: at('11:00') }] })).toThrow();
    expect(repo.snapshot()).toEqual(before);
    const envelope = { requestId: crypto.randomUUID(), baseRevision: 0, command: { type: 'day.startWithCheckin' as const, date: '2026-09-18', wakeAt: at('11:00'), mood: 3, logs: [{ kind: 'weight' as const, at: at('11:00'), value: 150 }, { kind: 'sleep' as const, start: at('03:00'), end: at('11:00') }] } };
    repo.execute(envelope, at('14:00')); repo.execute(envelope, at('14:00'));
    expect(repo.snapshot().days).toHaveLength(1); expect(repo.snapshot().logs).toHaveLength(2); expect(repo.snapshot().revision).toBe(1);
  });
  it('refuses legacy End Day while recording and closes the reviewed session set with reflection, preserving an edited summary', () => {
    const { repo, run } = fixture();
    run({ type: 'day.startWithCheckin', date: '2026-09-18', wakeAt: at('11:00'), logs: [] });
    const dayId = repo.snapshot().days[0].id;
    run({ type: 'day.save', id: dayId, summary: 'Owner-written synthetic summary', journal: 'Synthetic journal' });
    run({ type: 'task.capture', task: { id: 'task-a', title: 'Synthetic draft' } });
    run({ type: 'session.start', target: { kind: 'task', taskId: 'task-a' } });
    const before = repo.snapshot();
    expect(() => run({ type: 'day.end', id: dayId }, at('15:00'))).toThrow(/confirm/);
    expect(() => run({ type: 'day.close', id: dayId, expectedSessions: [] }, at('15:00'))).toThrow();
    expect(repo.snapshot()).toEqual(before);
    const preview = previewDayClose(before, dayId, at('15:00'));
    run({ type: 'day.close', id: dayId, expectedSessions: preview.expectedSessions, reflection: { changedPlan: 'Synthetic interruption', easierTomorrow: 'Choose less' } }, at('15:00'));
    expect(repo.snapshot().days[0]).toMatchObject({ summary: 'Owner-written synthetic summary', journal: 'Synthetic journal', endedAt: at('15:00'), reflection: { changedPlan: 'Synthetic interruption' } });
    expect(repo.snapshot().tasks[0].status).toBe('open');
    expect(repo.snapshot().workSessions[0].endedAt).toBe(at('15:00'));
  });
  it('attributes resumed work to each interval date and its newly chosen booking', () => {
    const { repo, run } = fixture();
    run({ type: 'task.capture', task: { id: 'task-a', title: 'Synthetic draft' } });
    run({ type: 'task.plan', task: { id: 'task-a' }, blockId: 'booking-a', start: at('14:00'), end: at('14:30'), acknowledgedConflictIds: [] });
    run({ type: 'session.start', target: { kind: 'task', taskId: 'task-a' }, plannedBlockId: 'booking-a' });
    const id = repo.snapshot().workSessions[0].id;
    run({ type: 'session.pause', id }, at('14:10'));
    const tomorrow = '2026-09-19T14:00:00.000Z';
    run({ type: 'task.plan', task: { id: 'task-a' }, blockId: 'booking-b', start: tomorrow, end: '2026-09-19T14:30:00.000Z', acknowledgedConflictIds: [] }, tomorrow);
    run({ type: 'session.resume', id, plannedBlockId: 'booking-b' }, tomorrow);
    run({ type: 'session.stop', id }, '2026-09-19T14:15:00.000Z');
    const state = repo.snapshot();
    expect(state.workSessions[0].intervals.map(i => [i.contextDate, i.plannedBlockId])).toEqual([['2026-09-18', 'booking-a'], ['2026-09-19', 'booking-b']]);
    expect(factsForDay(state, '2026-09-18', tomorrow).recorded.minutes).toBe(10);
    expect(factsForDay(state, '2026-09-19', '2026-09-19T15:00:00Z').recorded.minutes).toBe(15);
  });
  it('applies a reviewed pause and rebooking atomically, keeps the fixed commitment and rejects a stale revision', () => {
    const { repo, run } = fixture();
    run({ type: 'task.capture', task: { id: 'task-a', title: 'Synthetic draft', duration: 30 } });
    run({ type: 'task.plan', task: { id: 'task-a' }, blockId: 'booking-a', start: at('14:00'), end: at('14:30'), acknowledgedConflictIds: [] });
    run({ type: 'block.save', block: { id: 'fixed-a', title: 'Synthetic meeting', kind: 'appointment', tag: 'Work', start: at('15:00'), end: at('15:30'), status: 'pending', notes: '' } });
    run({ type: 'session.start', target: { kind: 'task', taskId: 'task-a' }, plannedBlockId: 'booking-a' });
    const before = repo.snapshot();
    const command: Extract<Command, {type:'plan.apply'}> = { type: 'plan.apply', date: '2026-09-18', source: 'reset', operations: [
      { op: 'session.pause', sessionId: before.workSessions[0].id }, { op: 'placement.set', taskId: 'task-a', newBlockId: 'booking-b', start: at('16:00'), end: at('16:30'), acknowledgedConflictIds: [] },
      { op: 'selection.set', taskIds: ['task-a'], mainTaskId: 'task-a' }, { op: 'window.set', window: { start: at('14:00'), end: at('18:00') } }, { op: 'spare.set', protectedSpareMinutes: 20 },
    ] };
    const preview = previewPlanChange(before, command, at('14:10'));
    expect(preview.valid).toBe(true); expect(repo.snapshot()).toEqual(before);
    expect(preview.unchangedFixedIds).toContain('fixed-a');
    const request = { requestId: crypto.randomUUID(), baseRevision: preview.baseRevision, command };
    const result = repo.execute(request, at('14:10'));
    expect(result.blocks.find(b => b.id === 'fixed-a')).toEqual(before.blocks.find(b => b.id === 'fixed-a'));
    expect(result.blocks.find(b => b.id === 'booking-a')).toMatchObject({ status: 'missed', supersededById: 'booking-b' });
    expect(result.workSessions[0].intervals[0].end).toBe(at('14:10'));
    expect(repo.execute(request, at('14:20'))).toEqual(result);
    expect(() => repo.execute({ ...request, requestId: crypto.randomUUID() }, at('14:20'))).toThrow(/changed/);
  });
  it('rejects a failed last Reset operation without retaining the first change', () => {
    const { repo, run } = fixture();
    run({ type: 'task.capture', task: { id: 'task-a', title: 'Synthetic draft' } });
    const before = repo.snapshot();
    expect(() => run({ type: 'plan.apply', date: '2026-09-18', source: 'reset', operations: [{ op: 'selection.set', taskIds: ['task-a'] }, { op: 'placement.cancel', blockId: 'does-not-exist', reason: 'cancelled' }] })).toThrow();
    expect(repo.snapshot()).toEqual(before);
  });
  it('requires template conflict consent, applies once and protects used occurrence identities', () => {
    const { repo, run } = fixture();
    const template = { id: 'template-a', title: 'Synthetic morning', blocks: [{ title: 'Synthetic exercise', kind: 'routine' as const, tag: 'Personal' as const, startMinute: 600, duration: 30, notes: '' }] };
    run({ type: 'template.save', template });
    run({ type: 'block.save', block: { id: 'fixed-a', title: 'Synthetic meeting', kind: 'appointment', tag: 'Work', start: at('14:00'), end: at('14:30'), status: 'pending', notes: '' } });
    const before = repo.snapshot(), preview = previewTemplateApplication(before, { templateId: template.id, date: '2026-09-18' }, at('14:00'));
    expect(preview.requiredAcknowledgements).toContain('fixed-a');
    expect(() => run({ type: 'template.apply', id: template.id, date: '2026-09-18', acknowledgedConflictIds: [] })).toThrow();
    expect(repo.snapshot()).toEqual(before);
    run({ type: 'template.apply', id: template.id, date: '2026-09-18', acknowledgedConflictIds: preview.requiredAcknowledgements });
    run({ type: 'template.apply', id: template.id, date: '2026-09-18', acknowledgedConflictIds: [] });
    expect(repo.snapshot().blocks.filter(b => b.id.startsWith('tpl:'))).toHaveLength(1);
    expect(() => run({ type: 'template.save', template: { ...template, blocks: [{ ...template.blocks[0], title: 'Different activity' }] } })).toThrow(/copy/);
  });
  it('does not invent a dated legacy completion from an unrelated edit timestamp', () => {
    const { repo, run } = fixture();
    run({ type: 'day.start', date: '2026-09-18', wakeAt: at('11:00') });
    const state = repo.snapshot();
    state.tasks.push({ id: 'legacy-done', title: 'Undated legacy task', duration: 15, tag: 'Personal', labels: [], notes: '', status: 'complete', createdAt: at('11:00'), updatedAt: at('14:00') });
    expect(factsForDay(state, '2026-09-18', at('16:00')).completedTaskIds).toEqual([]);
    expect(summaryForDay(state, state.days[0].id, at('16:00'))).not.toContain('Completed task: Undated legacy task');
  });
});
