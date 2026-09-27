import { bump, createBase, fail, live, openDay, pendingBooking, syncGoalFromTask, validateSchedule, type CommandContext } from './domain-core';
import { dateKey } from './dates';
import { endSessionForTarget, hasRecordedWork, settleBlock } from './sessions';
import type { Block, Command, OutcomeSource, Task, TaskOutcome } from './types';

export type TaskCommand = Extract<Command, { type: 'task.capture' | 'task.update' | 'task.resolve' | 'task.reopen' }>;

/**
 * Remaining work of a partial outcome. `placement` books it from `start` for `duration`
 * minutes. With `acknowledgedConflictIds` the placement follows the v3 acknowledgement rule;
 * without it (legacy `block.resolve`) no acknowledgement is asked.
 */
export interface OutcomeRemainder { duration: number; preferredDay?: string; taskId?: string; placement?: { blockId?: string; start: string; acknowledgedConflictIds?: string[] } }
export type OutcomeRequest =
 | { kind: 'complete'; source: OutcomeSource; note?: string; blockId?: string }
 | { kind: 'partial'; source: OutcomeSource; note?: string; blockId?: string; remaining: OutcomeRemainder }
 | { kind: 'reopen'; source: OutcomeSource; note?: string };

/** Private overlap rule for the remainder placement: positioned-live entries, half-open intervals. */
function overlapping(blocks: Block[], entry: Block): Block[] {
  return blocks.filter(other => other.id !== entry.id && !other.archived && other.status !== 'cancelled' && other.status !== 'missed' &&
    Date.parse(other.start) < Date.parse(entry.end) && Date.parse(other.end) > Date.parse(entry.start));
}
function createRemainder(context: CommandContext, original: Task, remaining: OutcomeRemainder): Task {
  const { state, now } = context;
  const task: Task = {
    ...createBase(now, remaining.taskId), title: original.title, duration: remaining.duration, tag: original.tag, labels: [...original.labels], notes: original.notes, status: 'open',
    ...(original.goalId ? { goalId: original.goalId } : {}), ...(original.firstAction ? { firstAction: original.firstAction } : {}), ...(original.doneWhen ? { doneWhen: original.doneWhen } : {}),
    ...(remaining.preferredDay ? { preferredDay: remaining.preferredDay } : {}),
  };
  state.tasks.push(task);
  const placement = remaining.placement;
  if (!placement) return task;
  const reviewed = placement.acknowledgedConflictIds !== undefined;
  const end = new Date(Date.parse(placement.start) + remaining.duration * 60000).toISOString();
  validateSchedule(state, placement.start, end, reviewed ? 'INVALID_TIME' : 'INVALID_COMMAND');
  const block: Block = { ...createBase(now, placement.blockId), title: task.title, kind: 'task', taskId: task.id, tag: task.tag, notes: task.notes, start: placement.start, end, status: 'pending' };
  if (reviewed) {
    // Evaluated in the resulting state: the original booking has already taken its outcome.
    const required = overlapping(state.blocks, block).map(other => other.id);
    const acknowledged = new Set(placement.acknowledgedConflictIds);
    if (required.length !== acknowledged.size || required.some(id => !acknowledged.has(id))) {
      fail('This time overlaps other entries. Review the overlap and confirm it.', 'CONFLICT_ACK_REQUIRED', 409, { conflictIds: required });
    }
    if (required.length) block.acknowledgedConflictIds = required;
  }
  state.blocks.push(block);
  return task;
}

/**
 * The one transition behind every task outcome, and the only place a `TaskOutcome` is
 * created. Complete and partial end the target's recording, settle its booking, write the
 * outcome, set the status and sync the goal leaf. Reopen only records and sets the status.
 */
export function applyTaskOutcome(context: CommandContext, task: Task, request: OutcomeRequest): TaskOutcome {
  const { state, now } = context;
  const zone = state.settings.timezone, day = openDay(state);
  const outcome: TaskOutcome = { ...createBase(now), taskId: task.id, kind: request.kind, at: now, contextDate: dateKey(now, zone), timezone: zone, ...(day ? { dayId: day.id } : {}), source: request.source };
  if (request.kind !== 'reopen') {
    const session = endSessionForTarget(context, { kind: 'task', taskId: task.id }, request.kind === 'complete' ? 'completed' : 'partial');
    if (session) outcome.sessionId = session.id;
    const booking = request.blockId ? state.blocks.find(b => b.id === request.blockId) : pendingBooking(state, task.id);
    if (booking) {
      // A booking that never began is not evidence of scheduled work: it is cancelled, not resolved.
      if (request.blockId || Date.parse(booking.start) <= Date.parse(now) || hasRecordedWork(state, booking)) { settleBlock(context, booking, request.kind); outcome.blockId = booking.id; }
      else settleBlock(context, booking, 'cancelled', { changeReason: 'task-resolved', changeSource: 'task' });
    }
    if (request.kind === 'partial') {
      const remainder = createRemainder(context, task, request.remaining);
      task.remainingTaskId = remainder.id;
      outcome.remainingTaskId = remainder.id; outcome.remainingDuration = request.remaining.duration;
    }
  }
  if (request.note) outcome.note = request.note;
  task.status = request.kind === 'reopen' ? 'open' : request.kind;
  bump(task, now);
  state.taskOutcomes.push(outcome);
  syncGoalFromTask(state, task, now);
  return outcome;
}

const CLEARABLE = ['duration', 'goalId', 'firstAction', 'doneWhen', 'preferredDay', 'deadline', 'effort', 'checklist'] as const;

/** Task intent and explicit outcomes. Mutates the cloned state in `context`; the caller owns the revision. */
export function applyTaskCommand(context: CommandContext, command: TaskCommand): void {
  const { state, now } = context;
  switch (command.type) {
    case 'task.capture': {
      const { id, tag, labels, notes, ...intent } = command.task;
      if (id && state.tasks.some(t => t.id === id)) fail('This task already exists.', 'ALREADY_EXISTS', 409);
      if (intent.goalId) live(state.goals, intent.goalId);
      const given = Object.fromEntries(Object.entries(intent).filter(([, value]) => value !== undefined)) as typeof intent;
      state.tasks.push({ ...createBase(now, id), ...given, tag: tag ?? 'Personal', labels: labels ? [...labels] : [], notes: notes ?? '', status: 'open' });
      break;
    }
    case 'task.update': {
      const task = live(state.tasks, command.id), patch = command.patch;
      if (patch.goalId && patch.goalId !== task.goalId) live(state.goals, patch.goalId);
      if (patch.title !== undefined) task.title = patch.title;
      if (patch.notes !== undefined) task.notes = patch.notes;
      if (patch.tag !== undefined) task.tag = patch.tag;
      if (patch.labels !== undefined) task.labels = [...patch.labels];
      for (const member of CLEARABLE) {
        const value = patch[member];
        if (value === null) delete task[member];
        else if (value !== undefined) Object.assign(task, { [member]: value });
      }
      bump(task, now); break;
    }
    case 'task.resolve': {
      const task = live(state.tasks, command.id);
      if (task.status === 'partial') fail('Update the linked remaining task to finish this work.', 'PARTIAL_TASK', 409);
      if (task.status !== 'open') fail('This task has already been resolved.', 'ALREADY_RESOLVED', 409);
      if (command.outcome === 'complete') { applyTaskOutcome(context, task, { kind: 'complete', source: 'task.resolve', note: command.note }); break; }
      const { remaining } = command;
      if (remaining.taskId && state.tasks.some(t => t.id === remaining.taskId)) fail('The remaining task already exists.', 'ALREADY_EXISTS', 409);
      if (remaining.placement && state.blocks.some(b => b.id === remaining.placement!.blockId)) fail('The booking for the remaining work already exists.', 'ALREADY_EXISTS', 409);
      applyTaskOutcome(context, task, { kind: 'partial', source: 'task.resolve', note: command.note, remaining });
      break;
    }
    case 'task.reopen': {
      const task = live(state.tasks, command.id);
      if (task.status === 'partial') fail('Update the linked remaining task to continue this work.', 'PARTIAL_TASK', 409);
      if (task.status !== 'complete') fail('Only a completed task can be reopened.', 'INVALID_STATE', 409);
      applyTaskOutcome(context, task, { kind: 'reopen', source: 'task.reopen', note: command.note });
      break;
    }
  }
}
