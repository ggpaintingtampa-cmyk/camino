import type { Adjustment, Base, Command, Day, Goal, HealthLog, Ledger, State, Task } from './types';
import { addDays, dateKey, timeLabel, validDate } from './dates';
import { commandSchema } from './schema';
import { dailySteps, goalProgress } from './selectors';
import { CURRENT_SCHEMA_DRAFT, CURRENT_SCHEMA_VERSION } from './state-format';
import { bump, createBase, DomainError, fail, find, isInDay, live, pendingBooking as scheduled, refreshGoal, syncGoalAncestors, syncGoalFromTask, upsert, validateSchedule, type CommandContext } from './domain-core';
import { applyTaskCommand, applyTaskOutcome } from './tasks';
import { applySessionCommand, dayCloseEntries, endSession, endSessionForTarget, endSessionUnderBooking, hasRecordedWork, isSessionBacked, recordedMinutesForBlock, sessionRef, sessionState, sessionsAssociatedWithDay, sessionViolations, settleBlock, splitRunningIntervalForDay, startSession, type DayCloseEntrySet } from './sessions';
import { applyPlanningCommand, applyTemplate } from './planning';

export { DomainError };

const TASK_KEPT_MEMBERS = ['duration', 'firstAction', 'doneWhen', 'preferredDay', 'deadline', 'effort', 'checklist'] as const;
const BLOCK_SERVER_MEMBERS = ['acknowledgedConflictIds', 'rescheduledFromId', 'supersededById', 'changeReason', 'changeSource'] as const;

function ledgerFor(state: State, area: Ledger['area']): Ledger {
  const ledger = state.ledgers.find(l => l.area === area);
  if (!ledger) fail('The money ledger is missing.', 'INVALID_STATE', 409);
  return ledger;
}
function audit(state: State, before: Ledger, after: Ledger, reason: string, now: string) {
  const adjustment: Adjustment = { ...createBase(now), area: before.area, reason, before: { ...before }, after: { ...after } };
  state.adjustments.push(adjustment);
}
function ensureMoney(ledger: Ledger) {
  for (const key of ['account', 'cash', 'earned', 'lost'] as const) {
    if (!Number.isSafeInteger(ledger[key]) || ledger[key] < 0 || ledger[key] > 1_000_000_000_000) fail('This change would produce an invalid money balance. Review the ledger first.', 'INSUFFICIENT_BALANCE', 409);
  }
}
type DayStartCommand = Extract<Command, { type: 'day.start' | 'day.startWithCheckin' }>;
/** Returns false for the accepted no-op on a day that is already started. */
function startDay(context: CommandContext, command: DayStartCommand): boolean {
  const { state, now } = context;
  const existing = state.days.find(day => day.date === command.date && !day.archived);
  const other = state.days.find(day => !day.archived && !day.endedAt && day.id !== existing?.id);
  if (other) fail('Review or close your previous open day before starting this day.', 'DAY_OPEN', 409);
  // A repeated Start request cannot revise a genuine prior check-in or reopen
  // a closed day. Corrections and reopening each have their own explicit action.
  if (existing?.startedAt) return false;
  const wakeAt = command.wakeAt || now;
  if (dateKey(wakeAt, state.settings.timezone) !== command.date) fail('Wake time must be on the selected date.');
  if (Date.parse(wakeAt) > Date.parse(now)) fail('Wake time cannot be in the future.');
  let day = existing;
  if (day) {
    day.startedAt = wakeAt;
    if (command.date === dateKey(now, state.settings.timezone)) delete day.endedAt;
    if (command.mood !== undefined) day.mood = command.mood;
    if (command.energy !== undefined) day.energy = command.energy;
    if (command.note !== undefined) day.note = command.note;
    bump(day, now);
  } else {
    day = { ...createBase(now), date: command.date, startedAt: wakeAt, mood: command.mood, energy: command.energy, note: command.note || '', summary: '', journal: '' };
    state.days.push(day);
  }
  // Work already running joins the day from this command's time on, never from the wake time.
  if (!day.endedAt) splitRunningIntervalForDay(context, day);
  return true;
}
/** Shared by `day.end` and `day.close`. Ends the day's recordings without inventing an outcome. */
function closeDay(context: CommandContext, day: Day, entrySet: DayCloseEntrySet) {
  const { state, now } = context;
  if (day.startedAt && Date.parse(now) < Date.parse(day.startedAt)) fail('A day cannot end before it starts.');
  for (const session of sessionsAssociatedWithDay(state, day.id)) endSession(context, session, 'day-closed');
  // Appointments remain unreviewed: do not invent attendance or absence.
  for (const { block, effect } of dayCloseEntries(state, day, now, entrySet)) {
    if (effect !== 'marked-not-completed') continue;
    settleBlock(context, block, 'missed');
    if (block.taskId) bump(find(state.tasks, block.taskId), now);
  }
  day.endedAt = now;
}
function sameValue(a: unknown, b: unknown): boolean { return JSON.stringify(a) === JSON.stringify(b); }

export function initialState(): State {
  const origin = '2026-01-01T00:00:00.000Z';
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION, ...(CURRENT_SCHEMA_DRAFT === undefined ? {} : { schemaDraft: CURRENT_SCHEMA_DRAFT }),
    revision: 0, settings: { name: 'Morgan', timezone: 'America/New_York', currency: 'USD' },
    tasks: [], blocks: [], days: [], goals: [], logs: [], reminders: [], envelopes: [], adjustments: [], templates: [],
    dayPlans: [], workSessions: [], taskOutcomes: [],
    ledgers: [
      { area: 'personal', account: 0, cash: 0, earned: 0, lost: 0 },
      { area: 'company', account: 0, cash: 0, earned: 0, lost: 0 },
    ],
    locations: [{ id: 'home-34638', createdAt: origin, updatedAt: origin, name: 'Land O’ Lakes, FL', postcode: '34638', latitude: 28.2189, longitude: -82.4599, primary: true }],
  };
}

/** All edits use one pure command path, shared by the private UI and authorized local tooling. */
export function applyCommand(input: State, supplied: Command, now: string): State {
  const result = commandSchema.safeParse(supplied);
  if (!result.success) fail(result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  if (!Number.isFinite(Date.parse(now))) fail('Invalid command timestamp.');
  now = new Date(now).toISOString();
  const command: Command = result.data;
  const state: State = structuredClone(input);
  const context: CommandContext = { state, now };
  switch (command.type) {
    case 'task.save': {
      const draft = command.task;
      const old = draft.id ? state.tasks.find(t => t.id === draft.id) : undefined;
      if (draft.goalId) {
        if (draft.goalId === old?.goalId) find(state.goals, draft.goalId);
        else live(state.goals, draft.goalId);
      }
      if (draft.remainingTaskId && draft.remainingTaskId !== old?.remainingTaskId) fail('Use Partial to create linked remaining work.');
      if (draft.status === 'partial' && !draft.remainingTaskId) fail('Use Partial to enter the remaining work.');
      if (old?.remainingTaskId && draft.status !== old.status) fail('Update the linked remaining task to finish this work.', 'PARTIAL_TASK', 409);
      if (old && draft.archived !== old.archived && draft.archived) fail('Use Archive to preserve related schedule history.');
      if (old && scheduled(state, old.id) && draft.status !== old.status) fail('Resolve the scheduled block to update this task.', 'TASK_SCHEDULED', 409);
      // This command cannot clear an estimate or a v3 member: what it omits keeps its stored value.
      const kept = Object.fromEntries(TASK_KEPT_MEMBERS.filter(member => draft[member] === undefined && old?.[member] !== undefined).map(member => [member, old![member]]));
      const task = upsert(state.tasks, { ...draft, ...kept, status: old?.status ?? draft.status }, now);
      // A status change is an outcome, recorded at command time like every other one.
      if (old?.status === 'open' && draft.status === 'complete') applyTaskOutcome(context, task, { kind: 'complete', source: 'task.save' });
      else if (old?.status === 'complete' && draft.status === 'open') applyTaskOutcome(context, task, { kind: 'reopen', source: 'task.save' });
      else task.status = draft.status;
      syncGoalFromTask(state, task, now);
      break;
    }
    case 'block.save': {
      const draft = command.block;
      validateSchedule(state, draft.start, draft.end);
      const old = draft.id ? state.blocks.find(b => b.id === draft.id) : undefined;
      if (draft.archived) fail('Use Archive to preserve schedule history.');
      if (old && old.archived) fail('Archived schedule history cannot be overwritten.', 'ARCHIVED', 409);
      if (old && old.kind !== draft.kind) fail('A block’s kind cannot change. Create a new block instead.');
      if (draft.status !== (old?.status || 'pending') || draft.actualStart !== old?.actualStart || draft.actualEnd !== old?.actualEnd || draft.snoozedUntil !== old?.snoozedUntil) fail('Use the task outcome, start or snooze actions to change its progress.');
      // Echo only: a spread stored record passes, a changed or invented value does not.
      if (BLOCK_SERVER_MEMBERS.some(member => draft[member] !== undefined && !sameValue(draft[member], old?.[member]))) fail('Plan links and acknowledgements are kept by Caminos and cannot be edited here.');
      if (old && old.status !== 'pending') fail('Completed schedule history is preserved. Create a new block instead.', 'ALREADY_RESOLVED', 409);
      if (draft.kind !== 'task' && draft.taskId) fail('Only a task block can refer to a task.');
      if (old?.taskId && old.taskId !== draft.taskId) fail('A scheduled block cannot change its task.');
      let taskId = draft.taskId;
      if (draft.kind === 'task') {
        if (taskId) {
          const task = live(state.tasks, taskId);
          if (task.status !== 'open') fail('Only open tasks can be scheduled.', 'TASK_FINISHED', 409);
          if (scheduled(state, taskId, old?.id)) fail('This task already has a scheduled block. Move that block to reschedule it.', 'TASK_SCHEDULED', 409);
        } else {
          const task = upsert(state.tasks, { title: draft.title, duration: (Date.parse(draft.end) - Date.parse(draft.start)) / 60000, tag: draft.tag, labels: [], notes: draft.notes, status: 'open' }, now);
          taskId = task.id;
        }
      }
      const flexibility = draft.flexibility ?? old?.flexibility;
      const stored = { ...draft, taskId, ...(flexibility ? { flexibility } : {}) };
      // Members the server owns stay with the stored record; an omitted one is not a request to clear it.
      for (const member of BLOCK_SERVER_MEMBERS) if (old?.[member] !== undefined) Object.assign(stored, { [member]: old[member] });
      if (old && (old.start !== draft.start || old.end !== draft.end)) {
        if (hasRecordedWork(state, old)) fail('Resolve the active block before moving it.', 'ACTIVE_TASK', 409);
        // A moved booking is a new block; the old one stays as history, linked both ways.
        for (const member of BLOCK_SERVER_MEMBERS) delete stored[member];
        const moved = upsert(state.blocks, { ...stored, id: undefined, conflictReviewed: false, rescheduledFromId: old.id }, now);
        old.status = 'cancelled'; old.supersededById = moved.id; old.changeReason = 'moved'; bump(old, now);
      } else upsert(state.blocks, stored, now);
      break;
    }
    case 'block.start': {
      const block = live(state.blocks, command.id);
      if (block.kind === 'appointment') fail('Appointments are marked attended, missed or cancelled.');
      if (block.status !== 'pending') fail('This block has already been resolved.', 'ALREADY_RESOLVED', 409);
      if (block.kind === 'task' && !block.taskId) fail('This block has no task to record.', 'INVALID_STATE', 409);
      startSession(context, block.kind === 'task' ? { kind: 'task', taskId: block.taskId! } : { kind: 'routine', blockId: block.id }, block.id, 'ACTIVE_TASK');
      break;
    }
    case 'block.resolve': {
      const block = live(state.blocks, command.id);
      if (block.status !== 'pending') {
        if (block.status === command.outcome) break;
        fail('This block has already been resolved.', 'ALREADY_RESOLVED', 409);
      }
      if (block.kind === 'appointment' && !['attended', 'missed', 'cancelled'].includes(command.outcome)) fail('Choose attended, missed or cancelled for an appointment.');
      if (block.kind !== 'appointment' && command.outcome === 'attended') fail('Only appointments can be marked attended.');
      if (command.outcome === 'partial' && !command.remainingDuration) fail('Enter the time needed for the remaining work.');
      if (command.outcome !== 'partial' && (command.remainingDuration || command.remainingStart)) fail('Remaining work is only used with Partial.');
      const outcome = command.outcome;
      if (outcome === 'complete' || outcome === 'partial') {
        if (block.kind === 'routine') endSessionForTarget(context, { kind: 'routine', blockId: block.id }, outcome === 'complete' ? 'completed' : 'partial');
        if (outcome === 'partial' && !block.taskId) {
          const task = upsert(state.tasks, { title: block.title, duration: (Date.parse(block.end) - Date.parse(block.start)) / 60000, tag: block.tag, notes: block.notes, labels: [], status: 'open' }, now);
          block.taskId = task.id;
        }
        if (!block.taskId) { settleBlock(context, block, outcome); break; }
        const task = find(state.tasks, block.taskId);
        if (outcome === 'complete') applyTaskOutcome(context, task, { kind: 'complete', source: 'block.resolve', blockId: block.id });
        else applyTaskOutcome(context, task, { kind: 'partial', source: 'block.resolve', blockId: block.id, remaining: { duration: command.remainingDuration!, ...(command.remainingStart ? { placement: { start: command.remainingStart } } : {}) } });
        break;
      }
      // Not completed, cancelled or an appointment outcome: recording ends only when it was last made under this block.
      if (block.kind !== 'appointment') endSessionUnderBooking(context, block.id, 'stopped');
      settleBlock(context, block, outcome);
      if (block.taskId) bump(find(state.tasks, block.taskId), now);
      break;
    }
    case 'block.snooze': {
      const block = live(state.blocks, command.id);
      if (block.status !== 'pending') fail('Only unresolved blocks can be snoozed.', 'ALREADY_RESOLVED', 409);
      if (Date.parse(command.until) <= Date.parse(now)) fail('Choose a snooze time in the future.');
      block.snoozedUntil = command.until; bump(block, now); break;
    }
    case 'block.conflictReviewed': {
      const block = live(state.blocks, command.id); block.conflictReviewed = true; bump(block, now); break;
    }
    case 'day.start': startDay(context, command); break;
    case 'day.startWithCheckin': {
      // Everything or nothing: a failure below leaves the input state untouched.
      if (!startDay(context, command)) break;
      for (const entry of command.logs) {
        const log: HealthLog = entry.kind === 'sleep'
          ? { ...createBase(now), kind: 'sleep', at: entry.end, start: entry.start, end: entry.end, duration: Math.round((Date.parse(entry.end) - Date.parse(entry.start)) / 60000), category: '', description: '', notes: entry.notes ?? '' }
          : { ...createBase(now), kind: 'weight', at: entry.at, value: entry.value, category: '', description: '', notes: entry.notes ?? '' };
        if (log.kind === 'sleep' && log.duration! < 1) fail('Sleep must last at least one minute.');
        if (entry.kind === 'sleep' && entry.quality !== undefined) log.quality = entry.quality;
        state.logs.push(log);
      }
      break;
    }
    case 'day.reopen': {
      const day = live(state.days, command.id);
      if (day.date !== dateKey(now, state.settings.timezone)) fail('Only today can be reopened. Edit older entries through History.', 'INVALID_STATE', 409);
      if (!day.startedAt) fail('Record your wake time with Start Day first.', 'INVALID_STATE', 409);
      if (state.days.some(d => d.id !== day.id && !d.archived && !d.endedAt)) fail('Close your previous open day before reopening today.', 'DAY_OPEN', 409);
      delete day.endedAt; bump(day, now);
      splitRunningIntervalForDay(context, day); break;
    }
    case 'day.end': {
      const day = live(state.days, command.id);
      if (!day.endedAt) {
        const associated = sessionsAssociatedWithDay(state, day.id);
        if (associated.length) fail('Closing this day ends recorded work. Review it and confirm the close.', 'SESSION_CLOSE_CONFIRMATION_REQUIRED', 409, { sessions: associated.map(sessionRef) });
        closeDay(context, day, 'legacy');
      }
      if (command.summary !== undefined) { day.summary = command.summary; day.summaryEdited = true; }
      else if (!day.summary) { day.summary = summaryForDay(state, day.id, now); day.summaryEdited = false; }
      if (command.journal !== undefined) day.journal = command.journal;
      bump(day, now); break;
    }
    case 'day.close': {
      const day = live(state.days, command.id);
      const closing = !day.endedAt;
      if (closing) {
        const associated = sessionsAssociatedWithDay(state, day.id);
        const expected = new Map(command.expectedSessions.map(session => [session.id, session.state]));
        if (associated.length !== expected.size || associated.some(session => expected.get(session.id) !== sessionState(session))) {
          fail('Recorded work changed since you reviewed this close. Review it again.', 'SESSION_CLOSE_STALE', 409, { sessions: associated.map(sessionRef) });
        }
        closeDay(context, day, 'ended');
      }
      if (command.summary !== undefined) { day.summary = command.summary; day.summaryEdited = true; }
      else if (closing && !day.summary) { day.summary = summaryForDay(state, day.id, now); day.summaryEdited = false; }
      if (command.journal !== undefined) day.journal = command.journal;
      if (command.reflection !== undefined) {
        const reflection = Object.fromEntries(Object.entries(command.reflection).filter(([, value]) => value?.trim()));
        if (Object.keys(reflection).length) day.reflection = reflection; else delete day.reflection;
      }
      bump(day, now); break;
    }
    case 'day.save': {
      let day = command.id ? live(state.days, command.id) : state.days.find(d => d.date === command.date && !d.archived);
      if (day && command.date && day.date !== command.date) fail('The day and selected date do not match.');
      if (!day) {
        if (!command.date) fail('Choose a date for this entry.');
        day = { ...createBase(now), date: command.date, endedAt: now, note: '', summary: '', journal: '' };
        state.days.push(day);
      }
      day.summary = command.summary; day.journal = command.journal; day.summaryEdited = true;
      if (command.note !== undefined) day.note = command.note;
      bump(day, now); break;
    }
    case 'day.checkin': {
      const day = live(state.days, command.id);
      if (command.wakeAt !== undefined) {
        if (dateKey(command.wakeAt, state.settings.timezone) !== day.date) fail('Wake time must be on the selected date.');
        if (Date.parse(command.wakeAt) > Date.parse(now) || (day.endedAt && Date.parse(command.wakeAt) > Date.parse(day.endedAt))) fail('Wake time must precede the end of the day and cannot be in the future.');
        day.startedAt = command.wakeAt;
      }
      if (command.mood !== undefined) day.mood = command.mood;
      if (command.energy !== undefined) day.energy = command.energy;
      if (command.note !== undefined) day.note = command.note;
      bump(day, now); break;
    }
    case 'day.regenerate': {
      const day = live(state.days, command.id); day.summary = summaryForDay(state, day.id, now); day.summaryEdited = false; bump(day, now); break;
    }
    case 'goal.save': {
      const draft = command.goal;
      const oldParent = draft.id ? state.goals.find(g => g.id === draft.id)?.parentId : undefined;
      if (draft.parentId) {
        const seen = new Set<string>(draft.id ? [draft.id] : []);
        let ancestor: Goal | undefined = live(state.goals, draft.parentId);
        while (ancestor) {
          if (seen.has(ancestor.id)) fail('A goal cannot contain itself or one of its ancestors.', 'GOAL_CYCLE', 409);
          seen.add(ancestor.id); ancestor = ancestor.parentId ? find(state.goals, ancestor.parentId) : undefined;
        }
      }
      const goal = upsert(state.goals, draft, now);
      if (goal.status === 'archived') goal.archived = true;
      if (goal.checked || goal.status === 'completed') {
        goal.checked = true; goal.status = 'completed';
        const visit = (parent: string) => {
          for (const child of state.goals.filter(g => g.parentId === parent && !g.archived)) {
            child.checked = true; child.status = 'completed'; bump(child, now); visit(child.id);
          }
        };
        visit(goal.id);
      }
      syncGoalAncestors(state, goal.id, now);
      if (oldParent && oldParent !== goal.parentId) { refreshGoal(state, find(state.goals, oldParent), now); syncGoalAncestors(state, oldParent, now); }
      if (goal.archived) {
        const archiveChildren = (parent: string) => {
          for (const child of state.goals.filter(g => g.parentId === parent)) {
            child.archived = true; child.status = 'archived'; bump(child, now); archiveChildren(child.id);
          }
        };
        archiveChildren(goal.id);
      }
      break;
    }
    case 'log.save': {
      const draft = { ...command.log };
      if (draft.kind === 'sleep' && draft.start && draft.end) {
        draft.duration = Math.round((Date.parse(draft.end) - Date.parse(draft.start)) / 60000);
        draft.at = draft.end;
      }
      if (draft.kind === 'steps' && !draft.id) {
        const day = dateKey(draft.at, state.settings.timezone);
        const old = state.logs.find(l => l.kind === 'steps' && !l.archived && dateKey(l.at, state.settings.timezone) === day);
        if (old) draft.id = old.id;
      }
      if (draft.id) {
        const old = state.logs.find(l => l.id === draft.id);
        if (old && old.kind !== draft.kind) fail('A health entry cannot change its kind.');
      }
      if (draft.kind === 'steps') {
        const duplicate = state.logs.find(l => l.kind === 'steps' && !l.archived && l.id !== draft.id && dateKey(l.at, state.settings.timezone) === dateKey(draft.at, state.settings.timezone));
        if (duplicate) fail('There is already a steps total for this date. Edit that entry.', 'DUPLICATE_STEPS', 409);
      }
      upsert(state.logs, draft, now); break;
    }
    case 'reminder.save': upsert(state.reminders, command.reminder, now); break;
    case 'ledger.adjust': {
      const ledger = ledgerFor(state, command.area); const before = { ...ledger };
      ledger.account = command.account; ledger.cash = command.cash; ledger.earned = command.earned; ledger.lost = command.lost;
      ensureMoney(ledger); audit(state, before, ledger, command.reason, now); break;
    }
    case 'envelope.create': {
      const draft = command.envelope;
      if (draft.archived) fail('An active envelope cannot be archived.');
      if (draft.id && state.envelopes.some(e => e.id === draft.id)) fail('This envelope already exists.', 'ALREADY_EXISTS', 409);
      const ledger = ledgerFor(state, draft.area); const before = { ...ledger };
      if (draft.amount > ledger.cash) fail('There is not enough available cash for this envelope.', 'INSUFFICIENT_CASH', 409);
      ledger.cash -= draft.amount;
      upsert(state.envelopes, { ...draft, status: 'active' }, now);
      audit(state, before, ledger, `Reserved for envelope: ${draft.title}`, now); break;
    }
    case 'envelope.resolve': {
      const envelope = live(state.envelopes, command.id);
      const ledger = ledgerFor(state, envelope.area); const before = { ...ledger };
      const outcome = command.outcome;
      if (envelope.status === outcome) break;
      if (outcome === 'extend') {
        if (envelope.status !== 'active') fail('Only active envelopes can be extended.', 'ALREADY_RESOLVED', 409);
        if (!command.expiresAt || Date.parse(command.expiresAt) <= Date.parse(now) || Date.parse(command.expiresAt) <= Date.parse(envelope.expiresAt)) fail('Choose a new expiry after the current expiry and now.');
        envelope.expiresAt = command.expiresAt;
      } else if (outcome === 'handled') {
        if (envelope.status !== 'lost') fail('Only Lost/Charity envelopes can be marked handled.', 'INVALID_STATE', 409);
        ledger.lost -= envelope.amount; ledger.account -= envelope.amount;
        ensureMoney(ledger); envelope.status = 'handled'; envelope.resolvedAt = now;
      } else {
        if (envelope.status !== 'active') fail('This envelope has already been resolved.', 'ALREADY_RESOLVED', 409);
        if (outcome !== 'cancelled' && Date.parse(envelope.expiresAt) > Date.parse(now)) fail('This envelope has not expired yet. Extend or cancel it if your plans changed.', 'NOT_EXPIRED', 409);
        if (outcome === 'earned') ledger.earned += envelope.amount;
        if (outcome === 'lost') ledger.lost += envelope.amount;
        if (outcome === 'cancelled') ledger.cash += envelope.amount;
        ensureMoney(ledger); envelope.status = outcome; envelope.resolvedAt = now;
      }
      bump(envelope, now); audit(state, before, ledger, `Envelope ${outcome}: ${envelope.title}`, now); break;
    }
    case 'template.save': upsert(state.templates, command.template, now); break;
    case 'template.apply': applyTemplate(context, command); break;
    case 'location.save': {
      const location = upsert(state.locations, command.location, now);
      if (location.archived) fail('Use Archive to remove a weather location.');
      if (location.primary) for (const other of state.locations) if (other.id !== location.id && other.primary) { other.primary = false; bump(other, now); }
      if (!state.locations.some(l => !l.archived && l.primary)) location.primary = true;
      break;
    }
    case 'record.archive': {
      const records: Base[] = state[command.collection]; const record = find(records, command.id);
      if (command.collection === 'tasks' && command.archived) {
        endSessionForTarget(context, { kind: 'task', taskId: record.id }, 'archived');
        for (const block of state.blocks.filter(b => b.taskId === record.id && b.status === 'pending' && !b.archived)) settleBlock(context, block, 'cancelled');
      }
      if (command.collection === 'blocks' && command.archived) {
        const block = find(state.blocks, record.id);
        if (block.status === 'pending') {
          endSessionUnderBooking(context, block.id, 'archived');
          settleBlock(context, block, 'cancelled');
          if (block.taskId) bump(find(state.tasks, block.taskId), now);
        }
      }
      if (command.collection === 'goals') {
        const goal = find(state.goals, record.id);
        if (!command.archived && goal.parentId && find(state.goals, goal.parentId).archived) fail('Restore the parent goal first.', 'ARCHIVED', 409);
        const cascade = (parent: string) => {
          for (const child of state.goals.filter(g => g.parentId === parent)) { child.archived = command.archived; child.status = command.archived ? 'archived' : child.checked ? 'completed' : 'active'; bump(child, now); cascade(child.id); }
        };
        goal.status = command.archived ? 'archived' : goal.checked ? 'completed' : 'active'; cascade(goal.id);
      }
      if (command.collection === 'logs' && !command.archived) {
        const log = find(state.logs, record.id);
        if (log.kind === 'steps' && state.logs.some(l => l.id !== log.id && !l.archived && l.kind === 'steps' && dateKey(l.at, state.settings.timezone) === dateKey(log.at, state.settings.timezone))) fail('This date already has a steps total. Archive that entry before restoring this one.', 'DUPLICATE_STEPS', 409);
      }
      record.archived = command.archived; bump(record, now);
      if (command.collection === 'goals') syncGoalAncestors(state, record.id, now);
      if (command.collection === 'locations') {
        const liveLocations = state.locations.filter(l => !l.archived);
        if (!liveLocations.length) fail('Keep at least one weather location.');
        if (!liveLocations.some(l => l.primary)) { liveLocations[0].primary = true; bump(liveLocations[0], now); }
        for (const location of state.locations.filter(l => l.archived)) location.primary = false;
      }
      break;
    }
    case 'settings.save': {
      state.settings.name = command.name; state.settings.timezone = command.timezone;
      if (command.navOrder !== undefined) state.settings.navOrder = [...command.navOrder];
      break;
    }
    case 'task.capture': case 'task.update': case 'task.resolve': case 'task.reopen':
      applyTaskCommand(context, command); break;
    case 'session.start': case 'session.pause': case 'session.resume': case 'session.switch': case 'session.stop':
      applySessionCommand(context, command); break;
    case 'dayPlan.save': case 'task.defer': case 'task.plan': case 'plan.apply':
      applyPlanningCommand(context, command); break;
  }
  const broken = sessionViolations(state);
  if (broken.length) fail('Recorded work would become inconsistent, so nothing was saved.', 'INVALID_STATE', 409, { recordIds: broken });
  state.revision = input.revision + 1;
  return state;
}

/** A caller that knows the time passes `now`; the clock is read only when it is left out, for the legacy screen. */
export function summaryForDay(state: State, dayId: string, now?: string): string {
  const day = find(state.days, dayId);
  const zone = state.settings.timezone;
  const cutoff = day.endedAt || now || new Date().toISOString();
  const logs = state.logs.filter(l => !l.archived && isInDay(state, day, l.kind === 'sleep' && l.end ? l.end : l.at, cutoff));
  const blocks = state.blocks.filter(b => !b.archived && isInDay(state, day, b.start, cutoff));
  const lines = [`${day.date} · Daily record`, day.startedAt ? `Woke at ${timeLabel(day.startedAt, zone)}.` : 'Wake time: not recorded.'];
  if (day.mood) lines.push(`Morning mood: ${day.mood}/5.`);
  if (day.energy) lines.push(`Morning energy: ${day.energy}/5.`);
  if (day.note.trim()) lines.push(`Morning note: ${day.note.trim()}`);
  const sleeps = logs.filter(l => l.kind === 'sleep');
  if (sleeps.length) for (const sleep of sleeps) lines.push(`Sleep: ${sleep.duration ?? 0} minutes${sleep.quality ? `; quality ${sleep.quality}/5` : ''}.`);
  else lines.push('Sleep: not recorded.');
  const weights = logs.filter(l => l.kind === 'weight').sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  const morning = day.startedAt ? weights.find(w => Date.parse(w.at) >= Date.parse(day.startedAt!)) : undefined;
  if (morning) lines.push(`First weight after waking: ${morning.value} lb.`);
  const stepDates = [...new Set(logs.filter(l => l.kind === 'steps').map(l => dateKey(l.at, zone)))].sort();
  for (const stepDate of stepDates) {
    const total = dailySteps(state, stepDate);
    if (total !== undefined) lines.push(`Steps recorded${stepDate === day.date ? '' : ` for ${stepDate}`}: ${total.toLocaleString('en-US')}.`);
  }
  for (const log of logs.filter(l => ['workout', 'rocket', 'food'].includes(l.kind))) {
    const label = log.kind === 'rocket' ? 'Rocket League' : log.kind === 'workout' ? 'Workout' : 'Food';
    lines.push(`${label}: ${[log.category, log.description].filter(Boolean).join(' — ')}${log.duration ? ` (${log.duration} minutes)` : ''}${log.notes ? `; ${log.notes}` : ''}.`);
  }
  for (const block of blocks.sort((a, b) => Date.parse(a.start) - Date.parse(b.start))) {
    const outcome = block.status === 'pending' ? 'outcome not recorded' : block.status === 'missed' && block.kind !== 'appointment' ? 'not completed' : block.status;
    // A session-backed block reports what was recorded under it; pauses add nothing.
    const minutes = isSessionBacked(state, block.id) ? recordedMinutesForBlock(state, block.id, cutoff)
      : block.actualStart && block.actualEnd ? Math.max(0, Math.round((Date.parse(block.actualEnd) - Date.parse(block.actualStart)) / 60000)) : undefined;
    const actual = block.actualStart ? `; started ${timeLabel(block.actualStart, zone)}${minutes === undefined ? '' : `, ${minutes} actual minutes`}` : '';
    lines.push(`${timeLabel(block.start, zone)}–${timeLabel(block.end, zone)} ${block.title}: ${outcome}${actual}${block.notes ? `; ${block.notes}` : ''}.`);
  }
  const completedOn = (task: Task) => {
    // An explicit outcome dates the completion. Only a task without one falls back to the legacy inference.
    const outcome = [...state.taskOutcomes].reverse().find(o => o.taskId === task.id && o.kind !== 'reopen');
    if (!outcome) return dateKey(task.updatedAt, zone) === day.date;
    return outcome.kind === 'complete' && (outcome.dayId ? outcome.dayId === day.id : outcome.contextDate === day.date);
  };
  for (const task of state.tasks.filter(t => !t.archived && t.status === 'complete' && completedOn(t) && !blocks.some(b => b.taskId === t.id && b.status === 'complete'))) {
    lines.push(`Completed task: ${task.title} (no completed schedule block recorded).`);
  }
  for (const goal of state.goals.filter(g => !g.archived && dateKey(g.updatedAt, zone) === day.date)) {
    const progress = goalProgress(state, goal.id); lines.push(`Goal updated: ${goal.title} — ${progress.completed}/${progress.total} steps (${progress.percent}%).`);
  }
  for (const reminder of state.reminders.filter(r => !r.archived && isInDay(state, day, r.startsAt, cutoff))) lines.push(`Reminder: ${reminder.title}${reminder.body ? ` — ${reminder.body}` : ''}.`);
  for (const adjustment of state.adjustments.filter(a => isInDay(state, day, a.createdAt, cutoff))) lines.push(`${adjustment.area === 'personal' ? 'Personal' : 'Company'} money: ${adjustment.reason}.`);
  if (!blocks.length) lines.push('No schedule entries recorded.');
  return lines.join('\n');
}

// Exported for callers building day strips without duplicating calendar rules.
export { addDays, validDate };
