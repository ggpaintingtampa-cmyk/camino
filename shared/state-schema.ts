/**
 * Stored-state boundary. Command drafts are validated by `schema.ts`; this file validates what
 * is actually persisted, in legacy format 1 and in format 2. It reports and never repairs:
 * nothing here trims, defaults, drops a member or closes a record.
 */
import { z } from 'zod';
import type { StateFormat } from './contracts';
import { validDate, validZone } from './dates';
import type { State, StateRecords } from './types';
import { CURRENT_SCHEMA_DRAFT, CURRENT_SCHEMA_VERSION, CURRENT_SQL_VERSION, LEGACY_SQL_VERSION } from './state-format';

export { CURRENT_SCHEMA_DRAFT, CURRENT_SCHEMA_VERSION, CURRENT_SQL_VERSION, LEGACY_SQL_VERSION };

/** A JSON path, a record id and a rule name. Never a stored value. */
export interface StateIssue { path: string; id?: string; rule: string }
export type LegacyState = StateRecords & { revision: number };
export type DetectedFormat =
 | { kind: 'legacy'; format: StateFormat }
 | { kind: 'current'; format: StateFormat }
 | { kind: 'draft-mismatch'; format: StateFormat }
 | { kind: 'newer'; format: StateFormat }
 | { kind: 'invalid' };

export const LEGACY_FORMAT: StateFormat = { schemaVersion: 1 };
export const CURRENT_FORMAT: StateFormat = { schemaVersion: CURRENT_SCHEMA_VERSION, ...(CURRENT_SCHEMA_DRAFT === undefined ? {} : { draft: CURRENT_SCHEMA_DRAFT }) };

const positive = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

/** Accepts the stored JSON text or its parsed value. Reads only the two format members. */
export function detectStateFormat(json: unknown): DetectedFormat {
  let value = json;
  if (typeof value === 'string') {
    try { value = JSON.parse(value); } catch { return { kind: 'invalid' }; }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return { kind: 'invalid' };
  const state = value as Record<string, unknown>;
  const hasDraft = Object.hasOwn(state, 'schemaDraft');
  if (!Object.hasOwn(state, 'schemaVersion')) return hasDraft ? { kind: 'invalid' } : { kind: 'legacy', format: LEGACY_FORMAT };
  const version = state.schemaVersion;
  if (!positive(version) || (hasDraft && !positive(state.schemaDraft))) return { kind: 'invalid' };
  const format: StateFormat = { schemaVersion: version, ...(hasDraft ? { draft: state.schemaDraft as number } : {}) };
  if (version > CURRENT_SCHEMA_VERSION) return { kind: 'newer', format };
  // Format 1 is recognised by the absent member only; a written `1` was never produced.
  if (version < CURRENT_SCHEMA_VERSION) return { kind: 'invalid' };
  return format.draft === CURRENT_SCHEMA_DRAFT ? { kind: 'current', format } : { kind: 'draft-mismatch', format };
}

// ── Shape ───────────────────────────────────────────────────────────────────
// Value rules follow shared/schema.ts. Custom rule messages are constant rule names, so an
// issue can be reported without reading the message of a built-in check.
const ID = /^[A-Za-z0-9:_-]+$/;
// Wider than a command id: the migration derives `legacy-session:<blockId>`.
const id = z.string().min(1).max(200).regex(ID);
const instant = z.iso.datetime({ offset: true }).refine(v => Number.isFinite(Date.parse(v)), 'invalid-instant');
const date = z.string().refine(validDate, 'invalid-date');
const zone = z.string().refine(validZone, 'unknown-zone');
const text = z.string().max(10000);
// A generated day summary quotes block notes, so it has no command-sized bound.
const longText = z.string().max(1_000_000);
const title = z.string().min(1).max(200);
const amount = z.number().int().min(0).max(1_000_000_000_000);
const duration = z.number().int().min(5).max(1440).multipleOf(5);
const rating = z.number().int().min(1).max(5);
const area = z.enum(['personal', 'company']);
const tag = z.enum(['Personal', 'Work']);
const kind = z.enum(['task', 'appointment', 'routine']);
const unique = (values: string[]) => new Set(values).size === values.length;
const ids = (max: number) => z.array(id).max(max).refine(unique, 'duplicate-id');
const span = (v: { start: string; end: string }) => Date.parse(v.end) - Date.parse(v.start);
const base = { id, createdAt: instant, updatedAt: instant, archived: z.boolean().optional() };

const ledger = z.strictObject({ area, account: amount, cash: amount, earned: amount, lost: amount });
const settings = z.strictObject({
  timezone: zone, name: title, currency: z.literal('USD'),
  navOrder: z.array(z.enum(['home', 'schedule', 'goals', 'more'])).length(4).refine(unique, 'duplicate-tab').optional(),
});
const legacyTask = { ...base, title, duration, tag, labels: z.array(z.string().min(1).max(60)).max(30), goalId: id.optional(), notes: text, status: z.enum(['open', 'complete', 'partial']), remainingTaskId: id.optional() };
const deadline = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('date'), date }),
  z.strictObject({ kind: z.literal('instant'), at: instant, timezone: zone }),
]);
const checklist = z.array(z.strictObject({ id, text: z.string().min(1).max(200), done: z.boolean() })).max(50)
  .refine(items => unique(items.map(item => item.id)), 'duplicate-id');
const guidance = z.string().min(1).max(500);
const currentTask = { ...legacyTask, duration: duration.optional(), firstAction: guidance.optional(), doneWhen: guidance.optional(), preferredDay: date.optional(), deadline: deadline.optional(), effort: z.enum(['light', 'moderate', 'demanding']).optional(), checklist: checklist.optional() };
const legacyBlock = {
  ...base, taskId: id.optional(), title, kind, tag, start: instant, end: instant, notes: text,
  status: z.enum(['pending', 'complete', 'missed', 'partial', 'attended', 'cancelled']),
  snoozedUntil: instant.optional(), actualStart: instant.optional(), actualEnd: instant.optional(), conflictReviewed: z.boolean().optional(),
};
const currentBlock = {
  ...legacyBlock, flexibility: z.enum(['fixed', 'flexible']).optional(), acknowledgedConflictIds: ids(200).optional(), rescheduledFromId: id.optional(), supersededById: id.optional(),
  changeReason: z.enum(['moved', 'deferred', 'cancelled', 'replanned', 'task-resolved']).optional(), changeSource: z.enum(['reset', 'plan', 'task', 'template']).optional(),
};
const bookable = (v: { start: string; end: string }) => span(v) > 0 && span(v) <= 86400000;
const legacyDay = { ...base, date, startedAt: instant.optional(), endedAt: instant.optional(), mood: rating.optional(), energy: rating.optional(), note: text, summary: longText, journal: text, summaryEdited: z.boolean().optional() };
const currentDay = { ...legacyDay, reflection: z.strictObject({ changedPlan: z.string().max(2000).optional(), easierTomorrow: z.string().max(2000).optional() }).optional() };
const goal = z.strictObject({ ...base, title, parentId: id.optional(), targetDate: date, notes: text, status: z.enum(['active', 'paused', 'completed', 'archived']), checked: z.boolean(), pinned: z.boolean() });
// A stored sleep duration is derived by rounding, so it may be below the command minimum.
const log = z.strictObject({ ...base, kind: z.enum(['steps', 'weight', 'workout', 'sleep', 'food', 'rocket']), at: instant, value: z.number().min(0).max(1_000_000).optional(), duration: z.number().int().min(0).max(1440).optional(), start: instant.optional(), end: instant.optional(), quality: rating.optional(), category: z.string().max(100), description: z.string().max(1000), notes: text });
const reminder = z.strictObject({ ...base, title, body: text, startsAt: instant, expiresAt: instant.optional(), pinned: z.boolean(), dismissed: z.boolean(), source: z.enum(['owner', 'ai']) });
const envelope = z.strictObject({ ...base, area, title, amount: amount.min(1), purpose: z.string().min(1).max(1000), expiresAt: instant, notes: text, status: z.enum(['active', 'earned', 'lost', 'handled', 'cancelled']), resolvedAt: instant.optional() });
const adjustment = z.strictObject({ ...base, area, reason: z.string().min(1).max(2000), before: ledger, after: ledger });
const template = z.strictObject({ ...base, title, blocks: z.array(z.strictObject({ title, kind, tag, startMinute: z.number().int().min(0).max(1435).multipleOf(5), duration, notes: text })).min(1).max(200) });
const location = z.strictObject({ ...base, name: title, latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), primary: z.boolean(), postcode: z.string().max(20).optional() });

const dayPlan = z.strictObject({
  ...base, date, timezone: zone, taskIds: ids(100), mainTaskId: id.optional(),
  window: z.strictObject({ start: instant, end: instant }).refine(v => span(v) > 0 && span(v) <= 25 * 3600000, 'invalid-window').optional(),
  protectedSpareMinutes: z.number().int().min(0).max(1440).multipleOf(5), note: z.string().min(1).max(1000).optional(),
});
const workSession = z.strictObject({
  ...base,
  target: z.discriminatedUnion('kind', [z.strictObject({ kind: z.literal('task'), taskId: id }), z.strictObject({ kind: z.literal('routine'), blockId: id })]),
  intervals: z.array(z.strictObject({ start: instant, end: instant.optional(), dayId: id.optional(), contextDate: date, timezone: zone, plannedBlockId: id.optional() })).min(1).max(10000),
  endedAt: instant.optional(), endReason: z.enum(['completed', 'partial', 'stopped', 'archived', 'day-closed']).optional(), provenance: z.enum(['native', 'legacy-block']),
});
const taskOutcome = z.strictObject({
  ...base, taskId: id, kind: z.enum(['complete', 'partial', 'reopen']), at: instant, contextDate: date, timezone: zone,
  dayId: id.optional(), blockId: id.optional(), sessionId: id.optional(), remainingTaskId: id.optional(), remainingDuration: duration.optional(),
  note: z.string().min(1).max(1000).optional(), source: z.enum(['task.resolve', 'task.reopen', 'task.save', 'block.resolve']),
});

const revision = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1);
const block = (shape: typeof legacyBlock) => z.strictObject(shape).refine(bookable, 'invalid-interval');
const sharedCollections = { goals: z.array(goal), logs: z.array(log), reminders: z.array(reminder), ledgers: z.array(ledger), envelopes: z.array(envelope), adjustments: z.array(adjustment), templates: z.array(template), locations: z.array(location) };
const legacyStateSchema = z.strictObject({
  revision, settings, tasks: z.array(z.strictObject(legacyTask)), blocks: z.array(block(legacyBlock)), days: z.array(z.strictObject(legacyDay)), ...sharedCollections,
});
const currentStateSchema = z.strictObject({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION), schemaDraft: z.number().int().min(1).optional(),
  revision, settings, tasks: z.array(z.strictObject(currentTask)), blocks: z.array(block(currentBlock)), days: z.array(z.strictObject(currentDay)), ...sharedCollections,
  dayPlans: z.array(dayPlan), workSessions: z.array(workSession), taskOutcomes: z.array(taskOutcome),
});

function shapeIssues(schema: z.ZodType, value: unknown): StateIssue[] {
  const result = schema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map(issue => {
    const path = issue.path.map(part => typeof part === 'number' ? `[${part}]` : `.${String(part)}`).join('').replace(/^\./, '') || '$';
    const [collection, index] = issue.path;
    const records = typeof collection === 'string' && typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[collection] : undefined;
    const record = Array.isArray(records) && typeof index === 'number' ? records[index] as { id?: unknown } | null : undefined;
    const recordId = record && typeof record.id === 'string' && record.id.length <= 200 && ID.test(record.id) ? record.id : undefined;
    return { path, ...(recordId ? { id: recordId } : {}), rule: issue.code === 'custom' ? issue.message : String(issue.code) };
  });
}

// ── Invariants ──────────────────────────────────────────────────────────────
type Records = StateRecords & Partial<Pick<State, 'dayPlans' | 'workSessions' | 'taskOutcomes'>>;
const COLLECTIONS = ['tasks', 'blocks', 'days', 'goals', 'logs', 'reminders', 'envelopes', 'adjustments', 'templates', 'locations', 'dayPlans', 'workSessions', 'taskOutcomes'] as const;

function invariantIssues(state: Records): StateIssue[] {
  const issues: StateIssue[] = [];
  const add = (path: string, rule: string, recordId?: string) => { issues.push({ path, ...(recordId ? { id: recordId } : {}), rule }); };
  const known = (list: { id: string }[]) => new Set(list.map(item => item.id));
  for (const name of COLLECTIONS) {
    const seen = new Set<string>();
    for (const [index, record] of (state[name] ?? []).entries()) {
      if (seen.has(record.id)) add(`${name}[${index}].id`, 'duplicate-id', record.id);
      seen.add(record.id);
    }
  }
  const tasks = known(state.tasks), blocks = known(state.blocks), days = known(state.days), goals = known(state.goals), sessions = known(state.workSessions ?? []);
  const reference = (set: Set<string>, target: string | undefined, path: string, owner: string) => { if (target !== undefined && !set.has(target)) add(path, 'unresolved-reference', owner); };

  for (const area of ['personal', 'company'] as const) {
    const count = state.ledgers.filter(l => l.area === area).length;
    if (count !== 1) add('ledgers', count ? 'duplicate-ledger' : 'missing-ledger');
  }
  const booked = new Set<string>();
  for (const [index, task] of state.tasks.entries()) {
    reference(goals, task.goalId, `tasks[${index}].goalId`, task.id);
    reference(tasks, task.remainingTaskId, `tasks[${index}].remainingTaskId`, task.id);
  }
  for (const [index, block] of state.blocks.entries()) {
    reference(tasks, block.taskId, `blocks[${index}].taskId`, block.id);
    reference(blocks, block.rescheduledFromId, `blocks[${index}].rescheduledFromId`, block.id);
    reference(blocks, block.supersededById, `blocks[${index}].supersededById`, block.id);
    for (const [at, other] of (block.acknowledgedConflictIds ?? []).entries()) reference(blocks, other, `blocks[${index}].acknowledgedConflictIds[${at}]`, block.id);
    if (block.taskId && !block.archived && block.status === 'pending') {
      if (booked.has(block.taskId)) add(`blocks[${index}].taskId`, 'duplicate-pending-booking', block.id);
      booked.add(block.taskId);
    }
  }
  const parents = new Map(state.goals.map(goal => [goal.id, goal.parentId]));
  for (const [index, goal] of state.goals.entries()) {
    reference(goals, goal.parentId, `goals[${index}].parentId`, goal.id);
    const seen = new Set([goal.id]);
    for (let parent = goal.parentId; parent !== undefined; parent = parents.get(parent)) {
      if (seen.has(parent)) { add(`goals[${index}].parentId`, 'goal-cycle', goal.id); break; }
      seen.add(parent);
    }
  }

  const planned = new Set<string>();
  for (const [index, plan] of (state.dayPlans ?? []).entries()) {
    for (const [at, taskId] of plan.taskIds.entries()) reference(tasks, taskId, `dayPlans[${index}].taskIds[${at}]`, plan.id);
    if (plan.mainTaskId !== undefined && !plan.taskIds.includes(plan.mainTaskId)) add(`dayPlans[${index}].mainTaskId`, 'main-task-not-selected', plan.id);
    if (plan.archived) continue;
    if (planned.has(plan.date)) add(`dayPlans[${index}].date`, 'duplicate-live-plan', plan.id);
    planned.add(plan.date);
  }

  let open = 0;
  const unfinished = new Set<string>();
  for (const [index, session] of (state.workSessions ?? []).entries()) {
    const at = `workSessions[${index}]`;
    const target = session.target;
    if (target.kind === 'task') reference(tasks, target.taskId, `${at}.target.taskId`, session.id);
    else if (state.blocks.find(b => b.id === target.blockId)?.kind !== 'routine') add(`${at}.target.blockId`, 'unresolved-reference', session.id);
    if (session.endedAt === undefined) {
      const key = target.kind === 'task' ? `task:${target.taskId}` : `routine:${target.blockId}`;
      if (unfinished.has(key)) add(`${at}.target`, 'duplicate-unfinished-session', session.id);
      unfinished.add(key);
    }
    let previousEnd = -Infinity;
    for (const [n, interval] of session.intervals.entries()) {
      const path = `${at}.intervals[${n}]`;
      const last = n === session.intervals.length - 1;
      const start = Date.parse(interval.start);
      if (start < previousEnd) add(`${path}.start`, 'interval-order', session.id);
      if (interval.end === undefined) {
        if (!last) add(`${path}.end`, 'open-interval-not-last', session.id);
        else if (session.endedAt !== undefined) add(`${path}.end`, 'open-interval-in-ended-session', session.id);
        else if (++open > 1) add(`${path}.end`, 'second-open-interval', session.id);
      } else if (Date.parse(interval.end) < start) add(`${path}.end`, 'interval-ends-before-start', session.id);
      previousEnd = interval.end === undefined ? Infinity : Math.max(start, Date.parse(interval.end));
      reference(days, interval.dayId, `${path}.dayId`, session.id);
      if (target.kind === 'routine' && interval.plannedBlockId !== target.blockId) add(`${path}.plannedBlockId`, 'booking-target-mismatch', session.id);
      else if (interval.plannedBlockId !== undefined && target.kind === 'task') {
        const booking = state.blocks.find(b => b.id === interval.plannedBlockId);
        if (!booking) add(`${path}.plannedBlockId`, 'unresolved-reference', session.id);
        else if (booking.kind !== 'task' || booking.taskId !== target.taskId) add(`${path}.plannedBlockId`, 'booking-target-mismatch', session.id);
      }
    }
  }
  for (const [index, outcome] of (state.taskOutcomes ?? []).entries()) {
    const at = `taskOutcomes[${index}]`;
    reference(tasks, outcome.taskId, `${at}.taskId`, outcome.id);
    reference(days, outcome.dayId, `${at}.dayId`, outcome.id);
    reference(blocks, outcome.blockId, `${at}.blockId`, outcome.id);
    reference(sessions, outcome.sessionId, `${at}.sessionId`, outcome.id);
    reference(tasks, outcome.remainingTaskId, `${at}.remainingTaskId`, outcome.id);
  }
  return issues;
}

function validate(schema: z.ZodType, value: unknown): StateIssue[] {
  const shape = shapeIssues(schema, value);
  // Invariants read members freely, so they only run on a well-shaped state.
  return shape.length ? shape : invariantIssues(value as Records);
}

/** Shape, then invariants, of a legacy format-1 state. An empty result means valid. */
export function validateLegacyState(value: unknown): StateIssue[] { return validate(legacyStateSchema, value); }
/** Shape, then invariants, of a format-2 state in this build's draft. An empty result means valid. */
export function validateCurrentState(value: unknown): StateIssue[] {
  const detected = detectStateFormat(value);
  if (detected.kind !== 'current') return [{ path: 'schemaVersion', rule: detected.kind === 'legacy' ? 'legacy-format' : `${detected.kind}-format` }];
  return validate(currentStateSchema, value);
}
/** Validates a stored state against the format it declares. */
export function validateStoredState(value: unknown): StateIssue[] {
  return detectStateFormat(value).kind === 'legacy' ? validateLegacyState(value) : validateCurrentState(value);
}
/** Distinct record ids named by the issues, bounded so a diagnostic stays one line. */
export function issueRecordIds(issues: StateIssue[], limit = 50): string[] {
  return [...new Set(issues.flatMap(issue => issue.id ? [issue.id] : []))].slice(0, limit);
}
