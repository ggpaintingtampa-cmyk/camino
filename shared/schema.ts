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

const task = z.strictObject({ ...base, title, duration, tag, labels: z.array(z.string().trim().min(1).max(60)).max(30), goalId: id.optional(), notes: text, status: z.enum(['open', 'complete', 'partial']), remainingTaskId: id.optional() });
const block = z.strictObject({
  ...base, taskId: id.optional(), title, kind: z.enum(['task', 'appointment', 'routine']), tag,
  start: iso, end: iso, notes: text, status: z.enum(['pending', 'complete', 'missed', 'partial', 'attended', 'cancelled']),
  snoozedUntil: iso.optional(), actualStart: iso.optional(), actualEnd: iso.optional(), conflictReviewed: z.boolean().optional(),
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
  z.strictObject({ type: z.literal('template.apply'), id, date }),
  z.strictObject({ type: z.literal('location.save'), location }),
  z.strictObject({ type: z.literal('record.archive'), collection: z.enum(['tasks', 'blocks', 'goals', 'logs', 'reminders', 'templates', 'locations']), id, archived: z.boolean() }),
  z.strictObject({ type: z.literal('settings.save'), name: title, timezone: z.string().refine(validZone, 'Unknown time zone'), navOrder: z.array(z.enum(['home','schedule','goals','more'])).length(4).refine(order => new Set(order).size === 4, 'Include each main tab once').optional() }),
]);

export const commandEnvelopeSchema = z.strictObject({ requestId: id, baseRevision: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER - 1), command: commandSchema });
