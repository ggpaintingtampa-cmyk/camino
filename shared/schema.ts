import { z } from 'zod';
import { validDate, validZone } from './dates';

const id = z.string().min(1).max(160).regex(/^[A-Za-z0-9:_-]+$/);
const text = z.string().max(10000);
const title = z.string().trim().min(1).max(200);
const iso = z.iso.datetime({ offset: true }).refine(v => Number.isFinite(Date.parse(v)), 'Invalid instant').transform(v => new Date(v).toISOString());
const date = z.string().refine(validDate, 'Invalid calendar date');
const amount = z.number().int().min(0).max(1_000_000_000_000);
const duration = z.number().int().min(5).max(1440).multipleOf(5);
const rating = z.number().int().min(1).max(5);
const area = z.enum(['personal', 'company']);
const tag = z.enum(['Personal', 'Work']);
const base = { id: id.optional(), archived: z.boolean().optional() };

// ── v3 values ───────────────────────────────────────────────────────────────
// No defaults and no new transforms: a parsed envelope stays a faithful image of the wire
// request, so receipt fingerprints never depend on schema evolution. Defaults live in the domain.
// Optional members added to a legacy shape are appended last for the same reason.
const zone = z.string().refine(validZone, 'Unknown time zone');
const guidance = z.string().trim().min(1).max(500);
const label = z.string().trim().min(1).max(60);
const shortNote = z.string().trim().min(1).max(1000);
const unique = (values: string[]) => new Set(values).size === values.length;
const ids = (max: number) => z.array(id).max(max).refine(unique, 'Each record may appear once');
const flexibility = z.enum(['fixed', 'flexible']);
const spareMinutes = z.number().int().min(0).max(1440).multipleOf(5);
const deadline = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('date'), date }),
  z.strictObject({ kind: z.literal('instant'), at: iso, timezone: zone }),
]);
const effort = z.enum(['light', 'moderate', 'demanding']);
const checklist = z.array(z.strictObject({ id, text: z.string().trim().min(1).max(200), done: z.boolean() })).max(50)
  .refine(items => unique(items.map(item => item.id)), 'Checklist items need distinct ids');
const taskIntent = { firstAction: guidance.optional(), doneWhen: guidance.optional(), preferredDay: date.optional(), deadline: deadline.optional(), effort: effort.optional(), checklist: checklist.optional() };
const span = (v: { start: string; end: string }) => Date.parse(v.end) - Date.parse(v.start);
const bookable = (v: { start: string; end: string }) => span(v) > 0 && span(v) <= 86400000;
const windowed = (v: { start: string; end: string }) => span(v) > 0 && span(v) <= 25 * 3600000;

const task = z.strictObject({ ...base, title, duration: duration.optional(), tag, labels: z.array(z.string().trim().min(1).max(60)).max(30), goalId: id.optional(), notes: text, status: z.enum(['open', 'complete', 'partial']), remainingTaskId: id.optional(), ...taskIntent });
const block = z.strictObject({
  ...base, taskId: id.optional(), title, kind: z.enum(['task', 'appointment', 'routine']), tag,
  start: iso, end: iso, notes: text, status: z.enum(['pending', 'complete', 'missed', 'partial', 'attended', 'cancelled']),
  snoozedUntil: iso.optional(), actualStart: iso.optional(), actualEnd: iso.optional(), conflictReviewed: z.boolean().optional(),
  flexibility: flexibility.optional(), acknowledgedConflictIds: ids(200).optional(), rescheduledFromId: id.optional(), supersededById: id.optional(),
  changeReason: z.enum(['moved', 'deferred', 'cancelled', 'replanned', 'task-resolved']).optional(), changeSource: z.enum(['reset', 'plan', 'task', 'template']).optional(),
}).refine(v => Date.parse(v.end) > Date.parse(v.start), 'End must follow start')
  .refine(v => Date.parse(v.end) - Date.parse(v.start) <= 86400000, 'Blocks cannot exceed 24 hours');
const goal = z.strictObject({ ...base, title, parentId: id.optional(), targetDate: date, notes: text, status: z.enum(['active', 'paused', 'completed', 'archived']), checked: z.boolean(), pinned: z.boolean() });
const log = z.strictObject({ ...base, kind: z.enum(['steps', 'weight', 'workout', 'sleep', 'food', 'rocket']), at: iso, value: z.number().min(0).max(1_000_000).optional(), duration: z.number().int().min(1).max(1440).optional(), start: iso.optional(), end: iso.optional(), quality: rating.optional(), category: z.string().max(100), description: z.string().max(1000), notes: text }).superRefine((v, ctx) => {
  const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
  if ((v.kind === 'steps' || v.kind === 'weight') && v.value === undefined) issue('A value is required');
  if (v.kind === 'steps' && v.value !== undefined && (!Number.isInteger(v.value) || v.value > 200000)) issue('Steps must be a whole number up to 200,000');
  if (v.kind === 'weight' && v.value !== undefined && (v.value <= 0 || v.value > 2000)) issue('Weight must be greater than zero and at most 2,000 pounds');
  if (['workout', 'rocket'].includes(v.kind) && !v.duration) issue('Duration is required');
  if (v.kind === 'workout' && !v.category.trim()) issue('Activity is required');
  if (v.kind === 'food' && !v.description.trim()) issue('Describe the food');
  if (v.kind === 'sleep' && (!v.start || !v.end)) issue('Sleep start and wake time are required');
  if (v.kind === 'sleep' && v.start && v.end && (Date.parse(v.end) <= Date.parse(v.start) || Date.parse(v.end) - Date.parse(v.start) > 86400000)) issue('Sleep must end after it starts, within 24 hours');
});
const reminder = z.strictObject({ ...base, title, body: text, startsAt: iso, expiresAt: iso.optional(), pinned: z.boolean(), dismissed: z.boolean(), source: z.enum(['owner', 'ai']) }).refine(v => !v.expiresAt || Date.parse(v.expiresAt) > Date.parse(v.startsAt), 'Reminder expiry must follow its start');
const envelope = z.strictObject({ ...base, area, title, amount: amount.refine(v => v > 0, 'Envelope must contain money'), purpose: z.string().trim().min(1).max(1000), expiresAt: iso, notes: text });
const template = z.strictObject({ ...base, id: id.max(100).optional(), title, blocks: z.array(z.strictObject({ title, kind: z.enum(['task', 'appointment', 'routine']), tag, startMinute: z.number().int().min(0).max(1435).multipleOf(5), duration, notes: text })).min(1).max(200) });
const location = z.strictObject({ ...base, name: title, latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), primary: z.boolean(), postcode: z.string().max(20).optional() });

// ── v3 command payloads ─────────────────────────────────────────────────────
const placed = { start: iso, end: iso, acknowledgedConflictIds: ids(200) };
const planWindow = z.strictObject({ start: iso, end: iso }).refine(windowed, 'The window must end after it starts, within 25 hours');
const taskCapture = z.strictObject({ id: id.optional(), title, notes: text.optional(), duration: duration.optional(), tag: tag.optional(), labels: z.array(label).max(30).optional(), goalId: id.optional(), ...taskIntent });
const taskPatch = z.strictObject({
  title: title.optional(), notes: text.optional(), tag: tag.optional(), labels: z.array(label).max(30).optional(),
  duration: duration.nullable().optional(), goalId: id.nullable().optional(), firstAction: guidance.nullable().optional(), doneWhen: guidance.nullable().optional(),
  preferredDay: date.nullable().optional(), deadline: deadline.nullable().optional(), effort: effort.nullable().optional(), checklist: checklist.nullable().optional(),
}).refine(patch => Object.keys(patch).length > 0, 'Change at least one field');
const remainingWork = z.strictObject({ duration, preferredDay: date.optional(), taskId: id.optional(), placement: z.strictObject({ blockId: id, start: iso, acknowledgedConflictIds: ids(200) }).optional() });
const sessionTarget = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('task'), taskId: id }),
  z.strictObject({ kind: z.literal('routine'), blockId: id }),
]);
const mainSelected = (v: { taskIds: string[]; mainTaskId?: string }) => !v.mainTaskId || v.taskIds.includes(v.mainTaskId);
const dayPlan = z.strictObject({
  date, taskIds: ids(100), mainTaskId: id.optional(), window: planWindow.optional(), protectedSpareMinutes: spareMinutes, note: shortNote.optional(), timezone: zone.optional(),
}).refine(mainSelected, 'The main task must be one of the selected tasks');
const planOperation = z.discriminatedUnion('op', [
  z.strictObject({ op: z.literal('selection.set'), taskIds: ids(100), mainTaskId: id.optional() }).refine(mainSelected, 'The main task must be one of the selected tasks'),
  z.strictObject({ op: z.literal('preferredDay.set'), taskId: id, preferredDay: date.nullable() }),
  z.strictObject({ op: z.literal('window.set'), window: planWindow.nullable() }),
  z.strictObject({ op: z.literal('spare.set'), protectedSpareMinutes: spareMinutes }),
  z.strictObject({ op: z.literal('session.pause'), sessionId: id }),
  z.strictObject({ op: z.literal('placement.set'), taskId: id, newBlockId: id, flexibility: flexibility.optional(), ...placed }).refine(bookable, 'End must follow start, within 24 hours'),
  z.strictObject({ op: z.literal('placement.move'), blockId: id, newBlockId: id, ...placed }).refine(bookable, 'End must follow start, within 24 hours'),
  z.strictObject({ op: z.literal('placement.extend'), blockId: id, end: iso, acknowledgedConflictIds: ids(200) }),
  z.strictObject({ op: z.literal('placement.cancel'), blockId: id, reason: z.enum(['deferred', 'cancelled']) }),
  z.strictObject({ op: z.literal('appointment.change'), blockId: id, newBlockId: id, ...placed }).refine(bookable, 'End must follow start, within 24 hours'),
]);
const reflection = z.strictObject({ changedPlan: z.string().max(2000).optional(), easierTomorrow: z.string().max(2000).optional() });
const checkinLog = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('sleep'), start: iso, end: iso, quality: rating.optional(), notes: text.optional() }).refine(bookable, 'Sleep must end after it starts, within 24 hours'),
  z.strictObject({ kind: z.literal('weight'), at: iso, value: z.number().gt(0).max(2000), notes: text.optional() }),
]);
const expectedSessions = z.array(z.strictObject({ id, state: z.enum(['running', 'paused']) })).max(50)
  .refine(items => unique(items.map(item => item.id)), 'Each session may appear once');
const taskResolve = z.discriminatedUnion('outcome', [
  z.strictObject({ type: z.literal('task.resolve'), id, outcome: z.literal('complete'), note: shortNote.optional() }),
  z.strictObject({ type: z.literal('task.resolve'), id, outcome: z.literal('partial'), remaining: remainingWork, note: shortNote.optional() }),
]);

export const commandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('task.save'), task }),
  z.strictObject({ type: z.literal('block.save'), block }),
  z.strictObject({ type: z.literal('block.start'), id }),
  z.strictObject({ type: z.literal('block.resolve'), id, outcome: z.enum(['complete', 'missed', 'partial', 'attended', 'cancelled']), remainingDuration: duration.optional(), remainingStart: iso.optional() }),
  z.strictObject({ type: z.literal('block.snooze'), id, until: iso }),
  z.strictObject({ type: z.literal('block.conflictReviewed'), id }),
  z.strictObject({ type: z.literal('day.start'), date, mood: rating.optional(), energy: rating.optional(), note: text.optional(), wakeAt: iso.optional() }),
  z.strictObject({ type: z.literal('day.reopen'), id }),
  z.strictObject({ type: z.literal('day.end'), id, summary: text.optional(), journal: text.optional() }),
  z.strictObject({ type: z.literal('day.save'), id: id.optional(), date: date.optional(), summary: text, journal: text, note: text.optional() }).refine(v => !!v.id || !!v.date, 'Choose an existing day or a date'),
  z.strictObject({ type: z.literal('day.checkin'), id, mood: rating.optional(), energy: rating.optional(), note: text.optional(), wakeAt: iso.optional() }),
  z.strictObject({ type: z.literal('day.regenerate'), id }),
  z.strictObject({ type: z.literal('goal.save'), goal }),
  z.strictObject({ type: z.literal('log.save'), log }),
  z.strictObject({ type: z.literal('reminder.save'), reminder }),
  z.strictObject({ type: z.literal('ledger.adjust'), area, account: amount, cash: amount, earned: amount, lost: amount, reason: z.string().trim().min(1).max(1000) }),
  z.strictObject({ type: z.literal('envelope.create'), envelope }),
  z.strictObject({ type: z.literal('envelope.resolve'), id, outcome: z.enum(['earned', 'lost', 'extend', 'handled', 'cancelled']), expiresAt: iso.optional() }),
  z.strictObject({ type: z.literal('template.save'), template }),
  z.strictObject({ type: z.literal('template.apply'), id, date, acknowledgedConflictIds: ids(200).optional() }),
  z.strictObject({ type: z.literal('location.save'), location }),
  z.strictObject({ type: z.literal('record.archive'), collection: z.enum(['tasks', 'blocks', 'goals', 'logs', 'reminders', 'templates', 'locations']), id, archived: z.boolean() }),
  z.strictObject({ type: z.literal('settings.save'), name: title, timezone: z.string().refine(validZone, 'Unknown time zone'), navOrder: z.array(z.enum(['home','schedule','goals','more'])).length(4).refine(order => new Set(order).size === 4, 'Include each main tab once').optional() }),
  z.strictObject({ type: z.literal('task.capture'), task: taskCapture }),
  z.strictObject({ type: z.literal('task.update'), id, patch: taskPatch }),
  taskResolve,
  z.strictObject({ type: z.literal('task.reopen'), id, note: shortNote.optional() }),
  z.strictObject({ type: z.literal('task.defer'), id, preferredDay: date.nullable(), cancelBlockId: id.optional(), deselectFromDate: date.optional() }),
  z.strictObject({ type: z.literal('task.plan'), task: z.union([z.strictObject({ id }), z.strictObject({ capture: taskCapture })]), blockId: id, flexibility: flexibility.optional(), ...placed }).refine(bookable, 'End must follow start, within 24 hours'),
  z.strictObject({ type: z.literal('dayPlan.save'), plan: dayPlan }),
  z.strictObject({ type: z.literal('session.start'), target: sessionTarget, plannedBlockId: id.optional() }),
  z.strictObject({ type: z.literal('session.pause'), id }),
  z.strictObject({ type: z.literal('session.resume'), id, plannedBlockId: id.optional() }),
  z.strictObject({ type: z.literal('session.switch'), expectedRunningSessionId: id, target: sessionTarget, plannedBlockId: id.optional() }),
  z.strictObject({ type: z.literal('session.stop'), id }),
  z.strictObject({ type: z.literal('plan.apply'), date, source: z.enum(['reset', 'plan']), operations: z.array(planOperation).min(1).max(100) }),
  z.strictObject({ type: z.literal('day.startWithCheckin'), date, wakeAt: iso.optional(), mood: rating.optional(), energy: rating.optional(), note: text.optional(), logs: z.array(checkinLog).max(4) }),
  z.strictObject({ type: z.literal('day.close'), id, summary: text.optional(), journal: text.optional(), reflection: reflection.optional(), expectedSessions }),
]);

export const commandEnvelopeSchema = z.strictObject({ requestId: id, baseRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1), command: commandSchema });
