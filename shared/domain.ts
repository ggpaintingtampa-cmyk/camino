import type { Adjustment, Base, Block, Command, Day, Goal, Ledger, State, Task } from './types';
import { addDays, dateKey, localInstant, minuteOfDay, timeLabel, validDate } from './dates';
import { commandSchema } from './schema';
import { dailySteps, goalProgress } from './selectors';
import { CURRENT_SCHEMA_DRAFT, CURRENT_SCHEMA_VERSION } from './state-format';
import { bump, createBase, DomainError, fail, find, live, notImplemented, upsert } from './domain-core';
import { applyTaskCommand } from './tasks';
import { applySessionCommand } from './sessions';
import { applyPlanningCommand } from './planning';

export { DomainError };

const TASK_INTENT_MEMBERS = ['firstAction', 'doneWhen', 'preferredDay', 'deadline', 'effort', 'checklist'] as const;
const BLOCK_V3_MEMBERS = ['flexibility', 'acknowledgedConflictIds', 'rescheduledFromId', 'supersededById', 'changeReason', 'changeSource'] as const;

function isInDay(state: State, day: Day, instant: string, now: string): boolean {
  return dateKey(instant, state.settings.timezone) === day.date ||
    (!!day.startedAt && Date.parse(instant) >= Date.parse(day.startedAt) && Date.parse(instant) <= Date.parse(day.endedAt || now));
}
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
function scheduled(state: State, taskId: string, exceptId?: string): Block | undefined {
  return state.blocks.find(b => !b.archived && b.taskId === taskId && b.status === 'pending' && b.id !== exceptId);
}
function validateSchedule(start: string, end: string, state: State) {
  for (const instant of [start, end]) {
    const ms = Date.parse(instant);
    if (ms % 60000 !== 0 || minuteOfDay(instant, state.settings.timezone) % 5 !== 0) fail('Schedule times use five-minute increments.');
  }
  if (Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > 86400000) fail('A block must last between five minutes and 24 hours.');
}
function syncGoalFromTask(state: State, task: Task, now: string) {
  if (!task.goalId || task.status !== 'complete') return;
  const goal = state.goals.find(g => g.id === task.goalId && !g.archived && g.status !== 'archived');
  if (goal && !state.goals.some(g => g.parentId === goal.id && !g.archived && g.status !== 'archived')) {
    if (state.tasks.some(t => !t.archived && t.goalId === goal.id && t.status === 'open')) return;
    goal.checked = true; goal.status = 'completed'; bump(goal, now);
    syncGoalAncestors(state, goal.id, now);
  }
}
function refreshGoal(state: State, goal: Goal, now: string) {
  if (!goal.archived && goal.status !== 'archived') {
    const progress = goalProgress(state, goal.id);
    goal.checked = progress.total > 0 && progress.completed === progress.total;
    if (goal.checked) goal.status = 'completed';
    else if (goal.status === 'completed') goal.status = 'active';
    bump(goal, now);
  }
}
function syncGoalAncestors(state: State, id: string, now: string) {
  let ancestor = state.goals.find(g => g.id === id)?.parentId;
  const seen = new Set<string>();
  while (ancestor && !seen.has(ancestor)) {
    seen.add(ancestor);
    const goal = find(state.goals, ancestor);
    refreshGoal(state, goal, now);
    ancestor = goal.parentId;
  }
}
function finishBlock(state: State, block: Block, outcome: Block['status'], now: string) {
  block.status = outcome; block.actualEnd = block.actualStart ? now : undefined;
  delete block.snoozedUntil; bump(block, now);
  if (block.taskId) {
    const task = find(state.tasks, block.taskId);
    task.status = outcome === 'complete' ? 'complete' : outcome === 'partial' ? 'partial' : 'open';
    bump(task, now); syncGoalFromTask(state, task, now);
  }
}

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
  switch (command.type) {
    case 'task.save': {
      const draft = command.task;
      // Transitional: the handler that stores these members lands with the task-intent phase.
      if (draft.duration === undefined || TASK_INTENT_MEMBERS.some(member => draft[member] !== undefined)) notImplemented('task.save with v3 members');
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
      const task = upsert(state.tasks, draft, now);
      syncGoalFromTask(state, task, now);
      break;
    }
    case 'block.save': {
      const draft = command.block;
      // Transitional: the handler that stores or checks these members lands with the session phase.
      if (BLOCK_V3_MEMBERS.some(member => draft[member] !== undefined)) notImplemented('block.save with v3 members');
      validateSchedule(draft.start, draft.end, state);
      const old = draft.id ? state.blocks.find(b => b.id === draft.id) : undefined;
      if (draft.archived) fail('Use Archive to preserve schedule history.');
      if (old && old.archived) fail('Archived schedule history cannot be overwritten.', 'ARCHIVED', 409);
      if (old && old.kind !== draft.kind) fail('A block’s kind cannot change. Create a new block instead.');
      if (draft.status !== (old?.status || 'pending') || draft.actualStart !== old?.actualStart || draft.actualEnd !== old?.actualEnd || draft.snoozedUntil !== old?.snoozedUntil) fail('Use the task outcome, start or snooze actions to change its progress.');
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
      if (old && (old.start !== draft.start || old.end !== draft.end)) {
        if (old.actualStart) fail('Resolve the active block before moving it.', 'ACTIVE_TASK', 409);
        old.status = 'cancelled'; bump(old, now);
        upsert(state.blocks, { ...draft, id: undefined, taskId, conflictReviewed: false }, now);
      } else upsert(state.blocks, { ...draft, taskId }, now);
      break;
    }
    case 'block.start': {
      const block = live(state.blocks, command.id);
      if (block.kind === 'appointment') fail('Appointments are marked attended, missed or cancelled.');
      if (block.status !== 'pending') fail('This block has already been resolved.', 'ALREADY_RESOLVED', 409);
      const other = state.blocks.find(b => b.id !== block.id && !b.archived && b.actualStart && !b.actualEnd && b.status === 'pending');
      if (other) fail('Finish, partially complete or return your current task to the list before starting another.', 'ACTIVE_TASK', 409);
      block.actualStart ||= now; delete block.snoozedUntil; bump(block, now); break;
    }
    case 'block.resolve': {
      const block = live(state.blocks, command.id);
      if (block.status !== 'pending') {
        if (block.status === command.outcome) break;
        fail('This block has already been resolved.', 'ALREADY_RESOLVED', 409);
      }
      if (block.kind === 'appointment' && !['attended', 'missed', 'cancelled'].includes(command.outcome)) fail('Choose attended, missed or cancelled for an appointment.');
      if (block.kind !== 'appointment' && command.outcome === 'attended') fail('Only appointments can be marked attended.');
      if (command.outcome === 'partial') {
        if (!command.remainingDuration) fail('Enter the time needed for the remaining work.');
        if (!block.taskId) {
          const task = upsert(state.tasks, { title: block.title, duration: (Date.parse(block.end) - Date.parse(block.start)) / 60000, tag: block.tag, notes: block.notes, labels: [], status: 'open' }, now);
          block.taskId = task.id;
        }
        const original = find(state.tasks, block.taskId);
        const remaining = upsert(state.tasks, { title: original.title, duration: command.remainingDuration, tag: original.tag, notes: original.notes, labels: [...original.labels], goalId: original.goalId, status: 'open' }, now);
        original.remainingTaskId = remaining.id;
        if (command.remainingStart) {
          const end = new Date(Date.parse(command.remainingStart) + command.remainingDuration * 60000).toISOString();
          validateSchedule(command.remainingStart, end, state);
          upsert(state.blocks, { title: remaining.title, kind: 'task', taskId: remaining.id, tag: remaining.tag, notes: remaining.notes, start: command.remainingStart, end, status: 'pending' }, now);
        }
      } else if (command.remainingDuration || command.remainingStart) fail('Remaining work is only used with Partial.');
      finishBlock(state, block, command.outcome, now); break;
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
    case 'day.start': {
      const existing = state.days.find(day => day.date === command.date && !day.archived);
      const other = state.days.find(day => !day.archived && !day.endedAt && day.id !== existing?.id);
      if (other) fail('Review or close your previous open day before starting this day.', 'DAY_OPEN', 409);
      // A repeated Start request cannot revise a genuine prior check-in or reopen
      // a closed day. Corrections and reopening each have their own explicit action.
      if (existing?.startedAt) break;
      const wakeAt = command.wakeAt || existing?.startedAt || now;
      if (dateKey(wakeAt, state.settings.timezone) !== command.date) fail('Wake time must be on the selected date.');
      if (Date.parse(wakeAt) > Date.parse(now)) fail('Wake time cannot be in the future.');
      if (existing) {
        const journalOnly = !existing.startedAt;
        if (!journalOnly && existing.endedAt && Date.parse(wakeAt) > Date.parse(existing.endedAt)) fail('Wake time must precede the end of the day.');
        existing.startedAt = wakeAt;
        if (journalOnly && command.date === dateKey(now, state.settings.timezone)) delete existing.endedAt;
        if (command.mood !== undefined) existing.mood = command.mood;
        if (command.energy !== undefined) existing.energy = command.energy;
        if (command.note !== undefined) existing.note = command.note;
        bump(existing, now);
      } else state.days.push({ ...createBase(now), date: command.date, startedAt: wakeAt, mood: command.mood, energy: command.energy, note: command.note || '', summary: '', journal: '' });
      break;
    }
    case 'day.reopen': {
      const day = live(state.days, command.id);
      if (day.date !== dateKey(now, state.settings.timezone)) fail('Only today can be reopened. Edit older entries through History.', 'INVALID_STATE', 409);
      if (!day.startedAt) fail('Record your wake time with Start Day first.', 'INVALID_STATE', 409);
      if (state.days.some(d => d.id !== day.id && !d.archived && !d.endedAt)) fail('Close your previous open day before reopening today.', 'DAY_OPEN', 409);
      delete day.endedAt; bump(day, now); break;
    }
    case 'day.end': {
      const day = live(state.days, command.id);
      if (!day.endedAt) {
        if (day.startedAt && Date.parse(now) < Date.parse(day.startedAt)) fail('A day cannot end before it starts.');
        day.endedAt = now;
        for (const block of state.blocks.filter(b => !b.archived && b.status === 'pending' && isInDay(state, day, b.start, now))) {
          // Appointments remain unreviewed: do not invent attendance or absence.
          if (block.kind !== 'appointment') finishBlock(state, block, 'missed', now);
        }
      }
      if (command.summary !== undefined) { day.summary = command.summary; day.summaryEdited = true; }
      else if (!day.summary) { day.summary = summaryForDay(state, day.id); day.summaryEdited = false; }
      if (command.journal !== undefined) day.journal = command.journal;
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
      const day = live(state.days, command.id); day.summary = summaryForDay(state, day.id); day.summaryEdited = false; bump(day, now); break;
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
    case 'template.apply': {
      // Transitional: reviewed mode lands with the reviewed-operations phase.
      if (command.acknowledgedConflictIds !== undefined) notImplemented('template.apply in reviewed mode');
      const template = live(state.templates, command.id);
      // Stable IDs make retries and reapplying a day's template nonduplicating.
      for (const [index, item] of template.blocks.entries()) {
        const id = `tpl:${template.id}:${command.date}:${index}`;
        if (state.blocks.some(b => b.id === id)) continue;
        const hour = Math.floor(item.startMinute / 60), minute = item.startMinute % 60;
        let start: string;
        try { start = localInstant(command.date, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, state.settings.timezone); }
        catch (error) { fail(error instanceof Error ? error.message : 'Invalid template time.', 'INVALID_TIME', 400); }
        const end = new Date(Date.parse(start) + item.duration * 60000).toISOString();
        let taskId: string | undefined;
        if (item.kind === 'task') {
          taskId = `${id}:task`;
          upsert(state.tasks, { id: taskId, title: item.title, duration: item.duration, tag: item.tag, notes: item.notes, labels: [], status: 'open' }, now);
        }
        upsert(state.blocks, { id, title: item.title, kind: item.kind, tag: item.tag, start, end, taskId, notes: item.notes, status: 'pending' }, now);
      }
      break;
    }
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
        for (const block of state.blocks.filter(b => b.taskId === record.id && b.status === 'pending' && !b.archived)) finishBlock(state, block, 'cancelled', now);
      }
      if (command.collection === 'blocks' && command.archived) {
        const block = find(state.blocks, record.id);
        if (block.status === 'pending') finishBlock(state, block, 'cancelled', now);
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
      applyTaskCommand({ state, now }, command); break;
    case 'session.start': case 'session.pause': case 'session.resume': case 'session.switch': case 'session.stop':
      applySessionCommand({ state, now }, command); break;
    case 'dayPlan.save': case 'task.defer': case 'task.plan': case 'plan.apply':
      applyPlanningCommand({ state, now }, command); break;
    case 'day.startWithCheckin': case 'day.close':
      notImplemented(command.type);
  }
  state.revision = input.revision + 1;
  return state;
}

export function summaryForDay(state: State, dayId: string): string {
  const day = find(state.days, dayId);
  const zone = state.settings.timezone;
  const cutoff = day.endedAt || new Date().toISOString();
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
    const actual = block.actualStart ? `; started ${timeLabel(block.actualStart, zone)}${block.actualEnd ? `, ${Math.max(0, Math.round((Date.parse(block.actualEnd) - Date.parse(block.actualStart)) / 60000))} actual minutes` : ''}` : '';
    lines.push(`${timeLabel(block.start, zone)}–${timeLabel(block.end, zone)} ${block.title}: ${outcome}${actual}${block.notes ? `; ${block.notes}` : ''}.`);
  }
  for (const task of state.tasks.filter(t => !t.archived && t.status === 'complete' && dateKey(t.updatedAt, zone) === day.date && !blocks.some(b => b.taskId === t.id && b.status === 'complete'))) {
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
