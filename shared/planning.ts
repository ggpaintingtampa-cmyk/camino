import { blockFlexibility, capacityForPlan, capacityForRemainingDay, clipInterval, entryConflicts, isPositionedLive, localDayRange, unionMinutes } from './capacity';
import type { ConflictingEntry, DayPlanPreview, DeadlineStatus, EntryConflict, ErrorDetails, InstantRange, NextCommitment, PlacementPreview, PlanPreview, PlanPreviewRow, PreviewError, TaskCollections, TaskView, TaskViewEntry, TemplatePreview, TemplatePreviewEntry } from './contracts';
import { dateKey, localInstant, minuteOfDay } from './dates';
import { bump, DomainError, fail, find, live, upsert, type CommandContext } from './domain-core';
import { applySessionCommand, hasRecordedWork } from './sessions';
import { applyTaskCommand } from './tasks';
import type { Block, BlockChangeSource, Command, DayPlan, DayPlanDraft, Flexibility, PlanOperation, PlanWindow, State, Task, WorkSession } from './types';

export type PlanningCommand = Extract<Command, { type: 'dayPlan.save' | 'task.defer' | 'task.plan' | 'plan.apply' }>;
type TemplateApply = Extract<Command, { type: 'template.apply' }>;
type PlanApply = Extract<Command, { type: 'plan.apply' }>;

/** Day plans, placements and reviewed plan changes. Mutates the cloned state in `context`; the caller owns the revision. */
export function applyPlanningCommand(context: CommandContext, command: PlanningCommand): void {
  switch (command.type) {
    case 'dayPlan.save': savePlan(context, command.plan); return;
    case 'task.defer': deferTask(context, command); return;
    case 'task.plan': planTask(context, command); return;
    case 'plan.apply': runPlan(newEngine(context, command.source, false), command); return;
  }
}

// ── Selectors ───────────────────────────────────────────────────────────────
const ms = (instant: string) => Date.parse(instant);

/** Every live task that is still open, scheduled or not. */
export function openTasks(state: State): Task[] { return state.tasks.filter(task => !task.archived && task.status === 'open'); }
export function dayPlanForDate(state: State, date: string): DayPlan | undefined { return state.dayPlans.find(plan => plan.date === date && !plan.archived); }
/** The date's zone: the plan's own when a plan exists, else the settings zone. */
export function zoneForDate(state: State, date: string): string { return dayPlanForDate(state, date)?.timezone ?? state.settings.timezone; }
/** The stored selection in plan order, without archived tasks. Finished ones stay so the day remains readable. */
export function selectedTasksForDay(state: State, date: string): Task[] {
  return (dayPlanForDate(state, date)?.taskIds ?? []).map(id => state.tasks.find(task => task.id === id)).filter((task): task is Task => !!task && !task.archived);
}
export function mainTaskForDay(state: State, date: string): Task | undefined {
  const id = dayPlanForDate(state, date)?.mainTaskId;
  return id ? state.tasks.find(task => task.id === id && !task.archived) : undefined;
}
/** The task's one live pending booking, if it has one. */
export function pendingBookingForTask(state: State, taskId: string): Block | undefined {
  return state.blocks.filter(block => !block.archived && block.kind === 'task' && block.taskId === taskId && block.status === 'pending')
    .sort((a, b) => ms(a.start) - ms(b.start) || a.id.localeCompare(b.id))[0];
}

function deadlineStatus(task: Task, now: string, zone: string): DeadlineStatus | undefined {
  const deadline = task.deadline;
  if (!deadline) return undefined;
  const today = dateKey(now, zone);
  if (deadline.kind === 'date') return deadline.date < today ? 'overdue' : deadline.date === today ? 'due-today' : 'upcoming';
  if (ms(deadline.at) < ms(now)) return 'overdue';
  return dateKey(deadline.at, zone) === today ? 'due-today' : 'upcoming';
}
function unfinishedSessionOf(state: State, taskId: string): TaskViewEntry['session'] {
  const session = state.workSessions.find(candidate => !candidate.endedAt && candidate.target.kind === 'task' && candidate.target.taskId === taskId);
  return session ? { id: session.id, state: session.intervals.at(-1)?.end === undefined && session.intervals.length > 0 ? 'running' : 'paused' } : undefined;
}

/**
 * One trusted collection in three views. A task keeps its ID in every view; moving between
 * views never creates or deletes anything. A scheduled open task stays in All.
 */
export function taskCollections(state: State, date: string, now: string): TaskCollections {
  const plan = dayPlanForDate(state, date);
  const timezone = plan?.timezone ?? state.settings.timezone;
  const range = localDayRange(date, timezone);
  const order = new Map((plan?.taskIds ?? []).map((id, index) => [id, index]));
  const entries = openTasks(state).map((task): TaskViewEntry => {
    const booking = pendingBookingForTask(state, task.id);
    const session = unfinishedSessionOf(state, task.id);
    const status = deadlineStatus(task, now, timezone);
    return {
      task, selected: order.has(task.id), main: plan?.mainTaskId === task.id, preferredToday: task.preferredDay === date,
      ...(booking ? { booking } : {}), bookedToday: !!booking && !!clipInterval(booking, range),
      ...(session ? { session } : {}), ...(status ? { deadlineStatus: status } : {}), estimate: task.duration === undefined ? 'unknown' : 'known',
    };
  });
  const isToday = (entry: TaskViewEntry) => entry.selected || entry.preferredToday || entry.bookedToday;
  const byBooking = (a: TaskViewEntry, b: TaskViewEntry) => (a.bookedToday && a.booking ? ms(a.booking.start) : Infinity) - (b.bookedToday && b.booking ? ms(b.booking.start) : Infinity) || ms(a.task.createdAt) - ms(b.task.createdAt) || a.task.id.localeCompare(b.task.id);
  const byPreference = (a: TaskViewEntry, b: TaskViewEntry) => (a.task.preferredDay ?? '9999-12-31').localeCompare(b.task.preferredDay ?? '9999-12-31') || ms(a.task.createdAt) - ms(b.task.createdAt) || a.task.id.localeCompare(b.task.id);
  const selected = entries.filter(entry => entry.selected).sort((a, b) => order.get(a.task.id)! - order.get(b.task.id)!);
  const other = entries.filter(entry => !entry.selected && isToday(entry)).sort(byBooking);
  const later = entries.filter(entry => !isToday(entry)).sort(byPreference);
  return { date, timezone, all: entries, today: { selected, other }, later, counts: { all: entries.length, today: selected.length + other.length, later: later.length } };
}
export function tasksForView(state: State, view: TaskView, date: string, now: string): TaskViewEntry[] {
  const collections = taskCollections(state, date, now);
  return view === 'all' ? collections.all : view === 'later' ? collections.later : [...collections.today.selected, ...collections.today.other];
}

/** The fixed commitment to protect: one in progress, and the next to come. Preparation time is never guessed. */
export function nextFixedCommitment(state: State, now: string): NextCommitment {
  const fixed = state.blocks.filter(block => isPositionedLive(block) && block.status === 'pending' && blockFlexibility(block) === 'fixed')
    .sort((a, b) => ms(a.start) - ms(b.start) || ms(a.end) - ms(b.end) || a.id.localeCompare(b.id));
  const inProgress = fixed.find(block => ms(block.start) <= ms(now) && ms(now) < ms(block.end));
  const next = fixed.find(block => ms(block.start) > ms(now));
  return { ...(inProgress ? { inProgress } : {}), ...(next ? { next } : {}) };
}

// ── Placement engine ────────────────────────────────────────────────────────
// Commands and previews share these transitions, so a preview and its apply cannot disagree
// at the same revision. The only difference: a preview reports the acknowledgement sets a
// command must carry instead of comparing them.
interface Placed { blockId: string; acknowledged: string[]; operationIndex?: number }
interface Engine { context: CommandContext; source: BlockChangeSource; preview: boolean; placed: Placed[]; required: { operationIndex?: number; blockId: string; blockIds: string[] }[] }
const newEngine = (context: CommandContext, source: BlockChangeSource, preview: boolean): Engine => ({ context, source, preview, placed: [], required: [] });

function assertInterval(state: State, start: string, end: string, limit = 86400000): void {
  for (const instant of [start, end]) {
    if (ms(instant) % 60000 !== 0 || minuteOfDay(instant, state.settings.timezone) % 5 !== 0) fail('Planned times use five-minute steps.', 'INVALID_TIME');
  }
  if (ms(end) <= ms(start) || ms(end) - ms(start) > limit) fail('A planned entry lasts between five minutes and 24 hours.', 'INVALID_TIME');
}
const intervalsUnder = (state: State, blockId: string) => state.workSessions.flatMap(session => session.intervals.filter(interval => interval.plannedBlockId === blockId));
const runsUnder = (state: State, blockId: string) => intervalsUnder(state, blockId).some(interval => interval.end === undefined);
function overlapsOf(state: State, block: Block): Block[] {
  return state.blocks.filter(other => other.id !== block.id && isPositionedLive(other) && ms(other.start) < ms(block.end) && ms(other.end) > ms(block.start))
    .sort((a, b) => a.id.localeCompare(b.id));
}
const sameSet = (a: string[], b: string[]) => a.length === b.length && new Set([...a, ...b]).size === a.length;

function addBlock(engine: Engine, block: Omit<Block, 'createdAt' | 'updatedAt' | 'status' | 'changeSource'>): Block {
  const { state, now } = engine.context;
  if (state.blocks.some(other => other.id === block.id)) fail('This planned entry already exists. Refresh and review it.', 'ALREADY_EXISTS', 409);
  const created: Block = { ...block, createdAt: now, updatedAt: now, status: 'pending', changeSource: engine.source };
  state.blocks.push(created);
  return created;
}
function retire(engine: Engine, block: Block, status: 'cancelled' | 'missed', reason: NonNullable<Block['changeReason']>, supersededById?: string): void {
  const { state, now } = engine.context;
  block.status = status; block.changeReason = reason; block.changeSource = engine.source;
  if (supersededById) block.supersededById = supersededById;
  delete block.snoozedUntil;
  // A closed booking records where its work stopped; nothing more will be recorded under it.
  const ends = intervalsUnder(state, block.id).map(interval => interval.end).filter((end): end is string => !!end).sort();
  if (block.actualStart && !block.actualEnd && ends.length) block.actualEnd = ends.at(-1);
  bump(block, now);
}
/** Placement rule of contract 3.2: create, move, or close a worked booking as history and book again. */
function placeTask(engine: Engine, request: { taskId: string; blockId: string; start: string; end: string; flexibility?: Flexibility; acknowledged: string[]; operationIndex?: number }): { created: Block; replaced?: { block: Block; before: InstantRange; effect: 'moved' | 'replanned' } } {
  const { state } = engine.context;
  const task = live(state.tasks, request.taskId);
  if (task.status !== 'open') fail('Only open tasks can be planned.', 'TASK_FINISHED', 409);
  assertInterval(state, request.start, request.end);
  const old = pendingBookingForTask(state, task.id);
  let replaced: { block: Block; before: InstantRange; effect: 'moved' | 'replanned' } | undefined;
  if (old) {
    const worked = hasRecordedWork(state, old);
    if (worked && runsUnder(state, old.id)) fail('Pause or stop the recording before planning this task again.', 'ACTIVE_TASK', 409);
    replaced = { block: old, before: { start: old.start, end: old.end }, effect: worked ? 'replanned' : 'moved' };
    retire(engine, old, worked ? 'missed' : 'cancelled', worked ? 'replanned' : 'moved', request.blockId);
  }
  const created = addBlock(engine, {
    id: request.blockId, taskId: task.id, title: task.title, kind: 'task', tag: task.tag, start: request.start, end: request.end, notes: task.notes,
    ...(request.flexibility ? { flexibility: request.flexibility } : {}), ...(old ? { rescheduledFromId: old.id } : {}),
  });
  engine.placed.push({ blockId: created.id, acknowledged: request.acknowledged, operationIndex: request.operationIndex });
  return { created, ...(replaced ? { replaced } : {}) };
}
function pendingEntry(state: State, blockId: string): Block {
  const block = live(state.blocks, blockId);
  if (block.status !== 'pending') fail('This planned entry has already been resolved.', 'ALREADY_RESOLVED', 409);
  return block;
}
function flexibleEntry(state: State, blockId: string, allowWorked: boolean): Block {
  const block = pendingEntry(state, blockId);
  if (blockFlexibility(block) === 'fixed') fail('A fixed commitment changes only through its own explicit change.', 'FIXED_APPOINTMENT_PROTECTED', 409);
  if (block.kind === 'appointment') fail('This change applies to task and routine placements.', 'PLAN_OPERATION_INVALID');
  if (!allowWorked && hasRecordedWork(state, block)) fail('This booking already has recorded work. Plan the remaining work instead.', 'BOOKING_HAS_RECORDED_WORK', 409);
  return block;
}
function supersede(engine: Engine, old: Block, request: { newBlockId: string; start: string; end: string; acknowledged: string[]; operationIndex?: number }): Block {
  assertInterval(engine.context.state, request.start, request.end);
  retire(engine, old, 'cancelled', 'moved', request.newBlockId);
  const created = addBlock(engine, {
    id: request.newBlockId, title: old.title, kind: old.kind, tag: old.tag, start: request.start, end: request.end, notes: old.notes,
    ...(old.taskId ? { taskId: old.taskId } : {}), ...(old.flexibility ? { flexibility: old.flexibility } : {}), rescheduledFromId: old.id,
  });
  engine.placed.push({ blockId: created.id, acknowledged: request.acknowledged, operationIndex: request.operationIndex });
  return created;
}
/** Runs last, against the final candidate state, so entries placed together are judged together. */
function settleAcknowledgements(engine: Engine): void {
  const { state } = engine.context;
  for (const placed of engine.placed) {
    const block = find(state.blocks, placed.blockId);
    const required = overlapsOf(state, block).map(other => other.id);
    engine.required.push({ operationIndex: placed.operationIndex, blockId: block.id, blockIds: required });
    if (!engine.preview && !sameSet(required, placed.acknowledged)) {
      fail('This time overlaps other planned entries. Review the overlap before saving.', 'CONFLICT_ACK_REQUIRED', 409, { conflictIds: required, ...(placed.operationIndex === undefined ? {} : { operationIndex: placed.operationIndex }) });
    }
    if (required.length) block.acknowledgedConflictIds = required; else delete block.acknowledgedConflictIds;
  }
}

// ── Commands ────────────────────────────────────────────────────────────────
function validWindow(window: PlanWindow, date: string, timezone: string): boolean {
  const aligned = [window.start, window.end].every(instant => ms(instant) % 60000 === 0 && minuteOfDay(instant, timezone) % 5 === 0);
  const length = ms(window.end) - ms(window.start);
  return aligned && length > 0 && length <= 25 * 3600000 && dateKey(window.start, timezone) === date;
}
function assertSelection(state: State, stored: DayPlan | undefined, taskIds: string[], mainTaskId?: string): void {
  if (new Set(taskIds).size !== taskIds.length) fail('Each task can be selected once.', 'PLAN_INVALID');
  if (mainTaskId && !taskIds.includes(mainTaskId)) fail('The main task must be one of the selected tasks.', 'PLAN_INVALID');
  for (const id of taskIds) {
    const task = find(state.tasks, id);
    // A selection made earlier stays readable after its task is finished; only new choices must be actionable.
    if (!stored?.taskIds.includes(id) && (task.archived || task.status !== 'open')) fail('Only open tasks can be chosen for a day.', 'PLAN_INVALID');
  }
}
function storePlan(context: CommandContext, plan: DayPlan): DayPlan {
  const { state } = context;
  const index = state.dayPlans.findIndex(other => other.id === plan.id);
  if (index >= 0) state.dayPlans[index] = plan; else state.dayPlans.push(plan);
  return plan;
}
/** The date's plan, created empty in the settings zone when an operation needs one. */
function ensurePlan(context: CommandContext, date: string): DayPlan {
  const { state, now } = context;
  return dayPlanForDate(state, date) ?? storePlan(context, { id: `dayplan:${date}`, createdAt: now, updatedAt: now, date, timezone: state.settings.timezone, taskIds: [], protectedSpareMinutes: 0 });
}
function savePlan(context: CommandContext, draft: DayPlanDraft): DayPlan {
  const { state, now } = context;
  const stored = dayPlanForDate(state, draft.date);
  const timezone = draft.timezone ?? stored?.timezone ?? state.settings.timezone;
  assertSelection(state, stored, draft.taskIds, draft.mainTaskId);
  if (draft.window && !validWindow(draft.window, draft.date, timezone)) fail('Choose a planning window that starts on this date, in five-minute steps.', 'PLAN_INVALID');
  return storePlan(context, {
    id: `dayplan:${draft.date}`, createdAt: stored?.createdAt ?? now, updatedAt: now, date: draft.date, timezone, taskIds: [...draft.taskIds],
    ...(draft.mainTaskId ? { mainTaskId: draft.mainTaskId } : {}), ...(draft.window ? { window: { ...draft.window } } : {}),
    protectedSpareMinutes: draft.protectedSpareMinutes, ...(draft.note ? { note: draft.note } : {}),
  });
}
function setPreferredDay(context: CommandContext, task: Task, preferredDay: string | null): void {
  if (preferredDay === null) delete task.preferredDay; else task.preferredDay = preferredDay;
  bump(task, context.now);
}
function deferTask(context: CommandContext, command: Extract<Command, { type: 'task.defer' }>): void {
  const { state, now } = context;
  const task = live(state.tasks, command.id);
  if (task.status !== 'open') fail('Only open tasks can be deferred.', 'TASK_FINISHED', 409);
  if (command.cancelBlockId) {
    const block = state.blocks.find(other => other.id === command.cancelBlockId);
    if (!block || block.archived || block.status !== 'pending' || block.kind !== 'task' || block.taskId !== task.id) fail('That booking does not belong to this task any more. Refresh and review.', 'BOOKING_MISMATCH', 409);
    retire(newEngine(context, 'task', false), flexibleEntry(state, block.id, false), 'cancelled', 'deferred');
  }
  if (command.deselectFromDate) {
    const plan = dayPlanForDate(state, command.deselectFromDate);
    if (!plan?.taskIds.includes(task.id)) fail('This task is not selected for that day.', 'PLAN_INVALID');
    plan.taskIds = plan.taskIds.filter(id => id !== task.id);
    if (plan.mainTaskId === task.id) delete plan.mainTaskId;
    bump(plan, now);
  }
  setPreferredDay(context, task, command.preferredDay);
}
function planTask(context: CommandContext, command: Extract<Command, { type: 'task.plan' }>): void {
  let taskId: string;
  if ('capture' in command.task) {
    // The task and its booking are one intent: a failure below leaves neither behind.
    taskId = command.task.capture.id ?? crypto.randomUUID();
    applyTaskCommand(context, { type: 'task.capture', task: { ...command.task.capture, id: taskId } });
  } else taskId = command.task.id;
  const engine = newEngine(context, 'task', false);
  placeTask(engine, { taskId, blockId: command.blockId, start: command.start, end: command.end, flexibility: command.flexibility, acknowledged: command.acknowledgedConflictIds });
  settleAcknowledgements(engine);
}

const KEPT_CODES = new Set(['PLAN_INVALID', 'CONFLICT_ACK_REQUIRED', 'FIXED_APPOINTMENT_PROTECTED', 'BOOKING_HAS_RECORDED_WORK', 'ACTIVE_TASK', 'ALREADY_EXISTS', 'PLAN_OPERATION_INVALID']);
function atOperation(error: unknown, operationIndex: number): never {
  if (!(error instanceof DomainError)) throw error;
  const details: ErrorDetails = { ...error.details, operationIndex };
  if (KEPT_CODES.has(error.code)) throw new DomainError(error.message, error.code, error.status, details);
  throw new DomainError(error.message, 'PLAN_OPERATION_INVALID', 400, details);
}
const recordedMs = (session: WorkSession, now: string) => session.intervals.reduce((sum, interval) => sum + Math.max(0, ms(interval.end ?? now) - ms(interval.start)), 0);

function assertDistinctTargets(state: State, operations: PlanOperation[]): void {
  const once = new Set<string>(), blocks = new Set<string>(), placements = new Set<string>(), preferences = new Set<string>();
  const claim = (set: Set<string>, key: string | undefined, index: number) => {
    if (key === undefined) return;
    if (set.has(key)) fail('Two changes address the same item. Review the plan change.', 'PLAN_OPERATION_INVALID', 400, { operationIndex: index });
    set.add(key);
  };
  for (const [index, operation] of operations.entries()) {
    switch (operation.op) {
      case 'selection.set': case 'window.set': case 'spare.set': case 'session.pause': claim(once, operation.op, index); break;
      case 'preferredDay.set': claim(preferences, operation.taskId, index); break;
      case 'placement.set': claim(placements, operation.taskId, index); claim(blocks, operation.newBlockId, index); break;
      case 'placement.move': case 'appointment.change':
        claim(blocks, operation.blockId, index); claim(blocks, operation.newBlockId, index);
        claim(placements, state.blocks.find(block => block.id === operation.blockId)?.taskId, index); break;
      case 'placement.extend': case 'placement.cancel':
        claim(blocks, operation.blockId, index);
        claim(placements, state.blocks.find(block => block.id === operation.blockId)?.taskId, index); break;
    }
  }
}
function runPlan(engine: Engine, command: Pick<PlanApply, 'date' | 'operations'>): PlanPreviewRow[] {
  const { context } = engine, { state, now } = context;
  const rows: PlanPreviewRow[] = [];
  assertDistinctTargets(state, command.operations);
  const range = localDayRange(command.date, zoneForDate(state, command.date));
  const onDate = (block: Block) => { if (!clipInterval(block, range)) fail('This planned entry is not on the day being changed.', 'PLAN_OPERATION_INVALID'); return block; };
  for (const [index, operation] of command.operations.entries()) {
    try {
      switch (operation.op) {
        case 'selection.set': {
          const stored = dayPlanForDate(state, command.date);
          assertSelection(state, stored, operation.taskIds, operation.mainTaskId);
          const plan = ensurePlan(context, command.date);
          const before = { taskIds: [...plan.taskIds], ...(plan.mainTaskId ? { mainTaskId: plan.mainTaskId } : {}) };
          plan.taskIds = [...operation.taskIds];
          if (operation.mainTaskId) plan.mainTaskId = operation.mainTaskId; else delete plan.mainTaskId;
          bump(plan, now);
          rows.push({ kind: 'selection', before, after: { taskIds: [...plan.taskIds], ...(plan.mainTaskId ? { mainTaskId: plan.mainTaskId } : {}) }, added: plan.taskIds.filter(id => !before.taskIds.includes(id)), removed: before.taskIds.filter(id => !plan.taskIds.includes(id)) });
          break;
        }
        case 'preferredDay.set': {
          const task = live(state.tasks, operation.taskId);
          const before = task.preferredDay;
          setPreferredDay(context, task, operation.preferredDay);
          rows.push({ kind: 'preferredDay', taskId: task.id, ...(before ? { before } : {}), ...(task.preferredDay ? { after: task.preferredDay } : {}) });
          break;
        }
        case 'window.set': {
          const plan = ensurePlan(context, command.date);
          if (operation.window && !validWindow(operation.window, plan.date, plan.timezone)) fail('Choose a planning window that starts on this date, in five-minute steps.', 'PLAN_INVALID');
          const before = plan.window;
          if (operation.window) plan.window = { ...operation.window }; else delete plan.window;
          bump(plan, now);
          rows.push({ kind: 'window', ...(before ? { before } : {}), ...(plan.window ? { after: plan.window } : {}) });
          break;
        }
        case 'spare.set': {
          const plan = ensurePlan(context, command.date);
          rows.push({ kind: 'spare', before: plan.protectedSpareMinutes, after: operation.protectedSpareMinutes });
          plan.protectedSpareMinutes = operation.protectedSpareMinutes; bump(plan, now);
          break;
        }
        case 'session.pause': {
          const session = find(state.workSessions, operation.sessionId);
          if (session.endedAt || session.intervals.at(-1)?.end !== undefined || !session.intervals.length) fail('That recording is not running any more. Refresh and review.', 'PLAN_OPERATION_INVALID');
          rows.push({ kind: 'session.pause', sessionId: session.id, target: session.target, recordedMinutes: Math.floor(recordedMs(session, now) / 60000) });
          applySessionCommand(context, { type: 'session.pause', id: session.id });
          break;
        }
        case 'placement.set': {
          const result = placeTask(engine, { taskId: operation.taskId, blockId: operation.newBlockId, start: operation.start, end: operation.end, flexibility: operation.flexibility, acknowledged: operation.acknowledgedConflictIds, operationIndex: index });
          rows.push({ kind: 'placement.set', taskId: operation.taskId, newBlockId: result.created.id, after: { start: result.created.start, end: result.created.end },
            ...(result.replaced ? { replaces: { blockId: result.replaced.block.id, before: result.replaced.before, effect: result.replaced.effect } } : {}) });
          break;
        }
        case 'placement.move': {
          const old = onDate(flexibleEntry(state, operation.blockId, false));
          const before = { start: old.start, end: old.end };
          const created = supersede(engine, old, { newBlockId: operation.newBlockId, start: operation.start, end: operation.end, acknowledged: operation.acknowledgedConflictIds, operationIndex: index });
          rows.push({ kind: 'placement.move', blockId: old.id, newBlockId: created.id, ...(old.taskId ? { taskId: old.taskId } : {}), before, after: { start: created.start, end: created.end } });
          break;
        }
        case 'placement.extend': {
          const block = onDate(flexibleEntry(state, operation.blockId, true));
          if (ms(operation.end) <= ms(now)) fail('Choose an end that is still to come.', 'INVALID_TIME');
          assertInterval(state, block.start, operation.end);
          const before = { start: block.start, end: block.end };
          block.end = operation.end; block.changeSource = engine.source; bump(block, now);
          engine.placed.push({ blockId: block.id, acknowledged: operation.acknowledgedConflictIds, operationIndex: index });
          rows.push({ kind: 'placement.extend', blockId: block.id, ...(block.taskId ? { taskId: block.taskId } : {}), before, after: { start: block.start, end: block.end } });
          break;
        }
        case 'placement.cancel': {
          const block = onDate(flexibleEntry(state, operation.blockId, false));
          rows.push({ kind: 'placement.cancel', blockId: block.id, ...(block.taskId ? { taskId: block.taskId } : {}), before: { start: block.start, end: block.end }, reason: operation.reason });
          retire(engine, block, 'cancelled', operation.reason);
          break;
        }
        case 'appointment.change': {
          const old = onDate(pendingEntry(state, operation.blockId));
          if (blockFlexibility(old) !== 'fixed') fail('This change applies to fixed commitments. Move flexible work as a placement.', 'PLAN_OPERATION_INVALID');
          if (hasRecordedWork(state, old)) fail('This booking already has recorded work. Plan the remaining work instead.', 'BOOKING_HAS_RECORDED_WORK', 409);
          const before = { start: old.start, end: old.end };
          const created = supersede(engine, old, { newBlockId: operation.newBlockId, start: operation.start, end: operation.end, acknowledged: operation.acknowledgedConflictIds, operationIndex: index });
          rows.push({ kind: 'appointment.change', blockId: old.id, newBlockId: created.id, before, after: { start: created.start, end: created.end } });
          break;
        }
      }
    } catch (error) { atOperation(error, index); }
  }
  settleAcknowledgements(engine);
  return rows;
}

/**
 * Whole-template application with the legacy occurrence identities. Without an
 * acknowledgement list it behaves exactly as before. With one, every overlap the new
 * entries create must have been reviewed.
 */
export function applyTemplate(context: CommandContext, command: TemplateApply, preview = false): { created: Block[]; required: string[] } {
  const { state, now } = context;
  const template = live(state.templates, command.id);
  const created: Block[] = [];
  // Stable IDs make retries and reapplying a day's template nonduplicating.
  for (const [index, item] of template.blocks.entries()) {
    const id = `tpl:${template.id}:${command.date}:${index}`;
    if (state.blocks.some(block => block.id === id)) continue;
    const hour = Math.floor(item.startMinute / 60), minute = item.startMinute % 60;
    let start: string;
    try { start = localInstant(command.date, `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, state.settings.timezone); }
    catch (error) { fail(error instanceof Error ? error.message : 'Invalid template time.', 'INVALID_TIME', 400); }
    const end = new Date(ms(start) + item.duration * 60000).toISOString();
    let taskId: string | undefined;
    if (item.kind === 'task') {
      taskId = `${id}:task`;
      upsert(state.tasks, { id: taskId, title: item.title, duration: item.duration, tag: item.tag, notes: item.notes, labels: [], status: 'open' }, now);
    }
    created.push(upsert(state.blocks, { id, title: item.title, kind: item.kind, tag: item.tag, start, end, taskId, notes: item.notes, status: 'pending' }, now));
  }
  const reviewed = command.acknowledgedConflictIds !== undefined || preview;
  const overlaps = new Map(created.map(block => [block.id, overlapsOf(state, block).map(other => other.id)]));
  const required = [...new Set([...overlaps.values()].flat())].sort();
  if (!reviewed) return { created, required };
  if (!preview && !sameSet(required, command.acknowledgedConflictIds!)) fail('This template overlaps other planned entries. Review the overlap before applying.', 'CONFLICT_ACK_REQUIRED', 409, { conflictIds: required });
  for (const block of created) {
    const own = overlaps.get(block.id)!;
    if (own.length) block.acknowledgedConflictIds = own;
    block.changeSource = 'template';
  }
  return { created, required };
}

// ── Previews ────────────────────────────────────────────────────────────────
const previewError = (error: unknown): PreviewError => {
  if (!(error instanceof DomainError)) throw error;
  return { code: error.code, message: error.message, ...(error.details?.operationIndex === undefined ? {} : { operationIndex: error.details.operationIndex }), ...(error.details ? { details: error.details } : {}) };
};
const asConflicting = (block: Block, range: InstantRange): ConflictingEntry => {
  const overlap = clipInterval(block, range)!;
  return { blockId: block.id, kind: block.kind, flexibility: blockFlexibility(block), start: block.start, end: block.end, minutes: Math.floor((ms(overlap.end) - ms(overlap.start)) / 60000) };
};

/** What saving this interval would do. Without `taskId` it previews a captured task or a remainder. */
export function previewPlacement(state: State, request: { taskId?: string; start: string; end: string }, now: string): PlacementPreview {
  const candidate = structuredClone(state), timezone = state.settings.timezone;
  const base = { baseRevision: state.revision, start: request.start, end: request.end, minutes: Math.max(0, Math.floor((ms(request.end) - ms(request.start)) / 60000)), date: dateKey(request.start, timezone), timezone };
  const probe = 'preview:placement';
  try {
    const engine = newEngine({ state: candidate, now }, 'task', true);
    let replaced: ReturnType<typeof placeTask>['replaced'];
    if (request.taskId) replaced = placeTask(engine, { taskId: request.taskId, blockId: probe, start: request.start, end: request.end, acknowledged: [] }).replaced;
    else {
      assertInterval(candidate, request.start, request.end);
      addBlock(engine, { id: probe, title: '', kind: 'task', tag: 'Personal', start: request.start, end: request.end, notes: '' });
    }
    const conflicts = overlapsOf(candidate, find(candidate.blocks, probe));
    return { valid: true, ...base, conflicts: conflicts.map(block => asConflicting(block, request)), requiredAcknowledgements: conflicts.map(block => block.id),
      ...(replaced ? { supersedesBlockId: replaced.block.id, supersedeEffect: replaced.effect } : {}) };
  } catch (error) { return { valid: false, error: previewError(error), ...base, conflicts: [], requiredAcknowledgements: [] }; }
}

/** Capacity of choices that are not saved yet. */
export function previewDayPlan(state: State, draft: DayPlanDraft, now: string): DayPlanPreview {
  const stored = dayPlanForDate(state, draft.date);
  const capacityBefore = capacityForPlan(state, draft.date);
  const base = { baseRevision: state.revision, date: draft.date, addedTaskIds: draft.taskIds.filter(id => !stored?.taskIds.includes(id)), removedTaskIds: (stored?.taskIds ?? []).filter(id => !draft.taskIds.includes(id)), capacityBefore };
  const candidate = structuredClone(state);
  try {
    const plan = savePlan({ state: candidate, now }, draft);
    return { valid: true, ...base, timezone: plan.timezone, capacityAfter: capacityForPlan(candidate, draft.date), remainingAfter: capacityForRemainingDay(candidate, draft.date, now) };
  } catch (error) {
    return { valid: false, error: previewError(error), ...base, timezone: capacityBefore.timezone, capacityAfter: capacityBefore, remainingAfter: capacityForRemainingDay(state, draft.date, now) };
  }
}

function conflictsAcross(state: State, ranges: InstantRange[]): EntryConflict[] {
  const seen = new Map<string, EntryConflict>();
  const hull = { start: ranges.map(range => range.start).sort()[0], end: ranges.map(range => range.end).sort().at(-1)! };
  for (const conflict of entryConflicts(state, hull)) {
    if (ranges.some(range => clipInterval(conflict, range))) seen.set(`${conflict.aId}\u0000${conflict.bId}`, conflict);
  }
  return [...seen.values()];
}
/** The consequences of a plan change, from the same transitions the command runs. It ignores the acknowledgement arrays it is given. */
export function previewPlanChange(state: State, command: Pick<PlanApply, 'date' | 'source' | 'operations'>, now: string): PlanPreview {
  const timezone = zoneForDate(state, command.date), range = localDayRange(command.date, timezone);
  const capacityBefore = capacityForPlan(state, command.date), remainingBefore = capacityForRemainingDay(state, command.date, now);
  const candidate = structuredClone(state);
  const engine = newEngine({ state: candidate, now }, command.source, true);
  const fixedOnDate = (source: State) => source.blocks.filter(block => isPositionedLive(block) && block.status === 'pending' && blockFlexibility(block) === 'fixed' && clipInterval(block, range));
  try {
    const rows = runPlan(engine, command);
    const created = engine.placed.map(placed => find(candidate.blocks, placed.blockId));
    const after = zoneForDate(candidate, command.date);
    return {
      valid: true, baseRevision: state.revision, date: command.date, timezone: after, rows,
      conflicts: conflictsAcross(candidate, [localDayRange(command.date, after), ...created.map(block => ({ start: block.start, end: block.end }))]),
      requiredAcknowledgements: engine.required.filter(entry => entry.operationIndex !== undefined).map(entry => ({ operationIndex: entry.operationIndex!, blockIds: entry.blockIds })),
      unchangedFixedIds: fixedOnDate(state).filter(block => JSON.stringify(block) === JSON.stringify(candidate.blocks.find(other => other.id === block.id))).map(block => block.id),
      capacityBefore, capacityAfter: capacityForPlan(candidate, command.date), remainingBefore, remainingAfter: capacityForRemainingDay(candidate, command.date, now),
    };
  } catch (error) {
    return { valid: false, error: previewError(error), baseRevision: state.revision, date: command.date, timezone, rows: [], conflicts: entryConflicts(state, range), requiredAcknowledgements: [],
      unchangedFixedIds: fixedOnDate(state).map(block => block.id), capacityBefore, capacityAfter: capacityBefore, remainingBefore, remainingAfter: remainingBefore };
  }
}

/** Load and conflicts of a whole template before it is applied. Entries already applied for the date are reported, not repeated. */
export function previewTemplateApplication(state: State, request: { templateId: string; date: string }, now: string): TemplatePreview {
  const timezone = state.settings.timezone;
  const capacityBefore = capacityForPlan(state, request.date);
  const base = { baseRevision: state.revision, templateId: request.templateId, date: request.date, timezone, capacityBefore };
  const template = state.templates.find(candidate => candidate.id === request.templateId);
  if (!template || template.archived) return { valid: false, error: { code: template ? 'ARCHIVED' : 'NOT_FOUND', message: template ? 'Restore this template before applying it.' : 'This template could not be found. Refresh and try again.' }, ...base, entries: [], addedReservedMinutes: 0, requiredAcknowledgements: [], capacityAfter: capacityBefore };
  const candidate = structuredClone(state);
  const entries: TemplatePreviewEntry[] = template.blocks.map((item, index): TemplatePreviewEntry => {
    const occurrenceId = `tpl:${template.id}:${request.date}:${index}`;
    const entry = { index, occurrenceId, kind: item.kind, durationMinutes: item.duration, alreadyApplied: state.blocks.some(block => block.id === occurrenceId), conflicts: [] };
    try {
      const start = localInstant(request.date, `${String(Math.floor(item.startMinute / 60)).padStart(2, '0')}:${String(item.startMinute % 60).padStart(2, '0')}`, timezone);
      return { ...entry, start, end: new Date(ms(start) + item.duration * 60000).toISOString() };
    } catch (error) { return { ...entry, invalidTime: error instanceof Error ? error.message : 'Invalid template time.' }; }
  });
  try {
    const { created, required } = applyTemplate({ state: candidate, now }, { type: 'template.apply', id: template.id, date: request.date }, true);
    for (const block of created) {
      const entry = entries.find(candidateEntry => candidateEntry.occurrenceId === block.id)!;
      entry.conflicts = overlapsOf(candidate, block).map(other => asConflicting(other, block));
    }
    return { valid: true, ...base, entries, addedReservedMinutes: unionMinutes(created), requiredAcknowledgements: required, capacityAfter: capacityForPlan(candidate, request.date) };
  } catch (error) {
    return { valid: false, error: previewError(error), ...base, entries, addedReservedMinutes: 0, requiredAcknowledgements: [], capacityAfter: capacityBefore };
  }
}
