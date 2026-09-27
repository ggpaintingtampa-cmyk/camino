export type Area = 'personal' | 'company';
export type Tag = 'Personal' | 'Work';
/** Stored main-tab identity. Four tabs stay authoritative through redesign Phases 2–5. */
export type NavId = 'home' | 'schedule' | 'goals' | 'more';
/** Five-tab identity. Stored in `Settings.navOrderV3` and accepted only by `settings.saveV3`. */
export type NavIdV3 = 'home' | 'schedule' | 'tasks' | 'history' | 'more';
export interface Base { id:string; createdAt:string; updatedAt:string; archived?:boolean }

/** A date-only deadline never becomes an invented midnight instant. */
export type TaskDeadline = {kind:'date'; date:string} | {kind:'instant'; at:string; timezone:string};
export type TaskEffort = 'light'|'moderate'|'demanding';
export interface ChecklistItem {id:string; text:string; done:boolean}
/** `duration` is the owner's estimate in minutes. Absent means unknown; it is never zero. */
export interface Task extends Base {title:string; duration?:number; tag:Tag; labels:string[]; goalId?:string; notes:string; status:'open'|'complete'|'partial'; remainingTaskId?:string;
  firstAction?:string; doneWhen?:string; preferredDay?:string; deadline?:TaskDeadline; effort?:TaskEffort; checklist?:ChecklistItem[]}

export type Flexibility = 'fixed'|'flexible';
export type BlockChangeReason = 'moved'|'deferred'|'cancelled'|'replanned'|'task-resolved';
export type BlockChangeSource = 'reset'|'plan'|'task'|'template';
/**
 * `actualStart`/`actualEnd` are compatibility projections once a work session refers to the
 * block; sessions are the only running/paused/duration authority (skill.md section 4.5).
 * The five fields after `conflictReviewed` are server-owned except `flexibility`.
 */
export interface Block extends Base {taskId?:string; title:string; kind:'task'|'appointment'|'routine'; tag:Tag; start:string; end:string; notes:string; status:'pending'|'complete'|'missed'|'partial'|'attended'|'cancelled'; snoozedUntil?:string; actualStart?:string; actualEnd?:string; conflictReviewed?:boolean;
  flexibility?:Flexibility; acknowledgedConflictIds?:string[]; rescheduledFromId?:string; supersededById?:string; changeReason?:BlockChangeReason; changeSource?:BlockChangeSource}

export interface DayReflection {changedPlan?:string; easierTomorrow?:string}
export interface Day extends Base {date:string; startedAt?:string; endedAt?:string; mood?:number; energy?:number; note:string; summary:string; journal:string; summaryEdited?:boolean; reflection?:DayReflection}
export interface Goal extends Base {title:string; parentId?:string; targetDate:string; notes:string; status:'active'|'paused'|'completed'|'archived'; checked:boolean; pinned:boolean}
export type LogKind = 'steps'|'weight'|'workout'|'sleep'|'food'|'rocket';
export interface HealthLog extends Base {kind:LogKind; at:string; value?:number; duration?:number; start?:string; end?:string; quality?:number; category:string; description:string; notes:string}
export interface Reminder extends Base {title:string; body:string; startsAt:string; expiresAt?:string; pinned:boolean; dismissed:boolean; source:'owner'|'ai'}
export interface Ledger {area:Area; account:number; cash:number; earned:number; lost:number}
export interface Envelope extends Base {area:Area; title:string; amount:number; purpose:string; expiresAt:string; notes:string; status:'active'|'earned'|'lost'|'handled'|'cancelled'; resolvedAt?:string}
export interface Adjustment extends Base {area:Area; reason:string; before:Ledger; after:Ledger}
export interface TemplateBlock {title:string; kind:'task'|'appointment'|'routine'; tag:Tag; startMinute:number; duration:number; notes:string}
export interface DayTemplate extends Base {title:string; blocks:TemplateBlock[]}
export interface WeatherLocation extends Base {name:string; latitude:number; longitude:number; primary:boolean; postcode?:string}
/**
 * `navOrder` is the four-tab preference and keeps its shape for old clients and receipts.
 * `navOrderV3` is the five-tab preference. At most one of the two is stored: saving a five-tab
 * order removes the four-tab one. With neither, the shell uses the default order.
 */
export interface Settings {timezone:string; name:string; currency:'USD'; navOrder?:NavId[]; navOrderV3?:NavIdV3[]}

/** R1 draft collection: one plan per owner-local date. Selected tasks are references, never copies. */
export interface PlanWindow {start:string; end:string}
export interface DayPlan extends Base {date:string; timezone:string; taskIds:string[]; mainTaskId?:string; window?:PlanWindow; protectedSpareMinutes:number; note?:string}

/** R1 draft collection: actual recorded work, independent of calendar intent. */
export type SessionTarget = {kind:'task'; taskId:string} | {kind:'routine'; blockId:string};
/** Each interval owns its date, zone, open-day and booking context. `end` absent means running. */
export interface WorkInterval {start:string; end?:string; dayId?:string; contextDate:string; timezone:string; plannedBlockId?:string}
export type SessionEndReason = 'completed'|'partial'|'stopped'|'archived'|'day-closed';
/** Running/paused/ended is derived from `intervals` and `endedAt`; it is never stored as a flag. */
export interface WorkSession extends Base {target:SessionTarget; intervals:WorkInterval[]; endedAt?:string; endReason?:SessionEndReason; provenance:'native'|'legacy-block'}

/** R1 draft collection: append-only explicit outcomes. Only domain transitions create them. */
export type OutcomeSource = 'task.resolve'|'task.reopen'|'task.save'|'block.resolve';
export interface TaskOutcome extends Base {taskId:string; kind:'complete'|'partial'|'reopen'; at:string; contextDate:string; timezone:string; dayId?:string; blockId?:string; sessionId?:string; remainingTaskId?:string; remainingDuration?:number; note?:string; source:OutcomeSource}

/** Collections every stored format has carried since format 1. */
export interface StateRecords {settings:Settings; tasks:Task[]; blocks:Block[]; days:Day[]; goals:Goal[]; logs:HealthLog[]; reminders:Reminder[]; ledgers:Ledger[]; envelopes:Envelope[]; adjustments:Adjustment[]; templates:DayTemplate[]; locations:WeatherLocation[]}
/**
 * Stored state, format 2. `schemaDraft` marks a provisional shape and disappears when the
 * format is frozen. `revision` is unrelated to either: it counts accepted changes.
 */
export interface State extends StateRecords {schemaVersion:2; schemaDraft?:number; revision:number; dayPlans:DayPlan[]; workSessions:WorkSession[]; taskOutcomes:TaskOutcome[]}
export interface Snapshot extends State {serverNow:string}

type Draft<T extends Base> = Omit<T,'id'|'createdAt'|'updatedAt'> & {id?:string};
/**
 * Legacy wire drafts are spelled out so a record extension never widens one by accident.
 * `task.save` replaces the task. A v3 member it carries is stored as sent; one it omits keeps
 * its stored value. An omitted `duration` keeps the stored estimate, or leaves it unknown.
 */
export interface LegacyTaskDraft {id?:string; archived?:boolean; title:string; duration?:number; tag:Tag; labels:string[]; goalId?:string; notes:string; status:Task['status']; remainingTaskId?:string;
  firstAction?:string; doneWhen?:string; preferredDay?:string; deadline?:TaskDeadline; effort?:TaskEffort; checklist?:ChecklistItem[]}
/** Members after `flexibility` are server-owned: a client may echo the stored value, never change it. */
export interface LegacyBlockDraft {id?:string; archived?:boolean; taskId?:string; title:string; kind:Block['kind']; tag:Tag; start:string; end:string; notes:string; status:Block['status']; snoozedUntil?:string; actualStart?:string; actualEnd?:string; conflictReviewed?:boolean;
  flexibility?:Flexibility; acknowledgedConflictIds?:string[]; rescheduledFromId?:string; supersededById?:string; changeReason?:BlockChangeReason; changeSource?:BlockChangeSource}

export type LegacyCommand =
 | {type:'task.save'; task:LegacyTaskDraft}
 | {type:'block.save'; block:LegacyBlockDraft}
 | {type:'block.start'; id:string}
 | {type:'block.resolve'; id:string; outcome:'complete'|'missed'|'partial'|'attended'|'cancelled'; remainingDuration?:number; remainingStart?:string}
 | {type:'block.snooze'; id:string; until:string}
 | {type:'block.conflictReviewed'; id:string}
 | {type:'day.start'; date:string; mood?:number; energy?:number; note?:string; wakeAt?:string}
 | {type:'day.reopen'; id:string}
 | {type:'day.end'; id:string; summary?:string; journal?:string}
 | {type:'day.save'; id?:string; date?:string; summary:string; journal:string; note?:string}
 | {type:'day.checkin'; id:string; mood?:number; energy?:number; note?:string; wakeAt?:string}
 | {type:'day.regenerate'; id:string}
 | {type:'goal.save'; goal:Draft<Goal>}
 | {type:'log.save'; log:Draft<HealthLog>}
 | {type:'reminder.save'; reminder:Draft<Reminder>}
 | {type:'ledger.adjust'; area:Area; account:number; cash:number; earned:number; lost:number; reason:string}
 | {type:'envelope.create'; envelope:Omit<Draft<Envelope>,'status'|'resolvedAt'>}
 | {type:'envelope.resolve'; id:string; outcome:'earned'|'lost'|'extend'|'handled'|'cancelled'; expiresAt?:string}
 | {type:'template.save'; template:Draft<DayTemplate>}
 | {type:'template.apply'; id:string; date:string; acknowledgedConflictIds?:string[]}
 | {type:'location.save'; location:Draft<WeatherLocation>}
 | {type:'record.archive'; collection:'tasks'|'blocks'|'goals'|'logs'|'reminders'|'templates'|'locations'; id:string; archived:boolean}
 | {type:'settings.save'; name:string; timezone:string; navOrder?:NavId[]};

/** Title is the only required capture field. Omitted values stay absent; defaults are applied in the domain, never by the schema. */
export interface TaskCaptureDraft {id?:string; title:string; notes?:string; duration?:number; tag?:Tag; labels?:string[]; goalId?:string; firstAction?:string; doneWhen?:string; preferredDay?:string; deadline?:TaskDeadline; effort?:TaskEffort; checklist?:ChecklistItem[]}
/** Omitted = unchanged. `null` clears an optional value. Status, links and history are not editable here. */
export interface TaskPatch {title?:string; notes?:string; tag?:Tag; labels?:string[]; duration?:number|null; goalId?:string|null; firstAction?:string|null; doneWhen?:string|null; preferredDay?:string|null; deadline?:TaskDeadline|null; effort?:TaskEffort|null; checklist?:ChecklistItem[]|null}
/** `dayPlan.save` replaces the plan: an omitted `mainTaskId`, `window` or `note` is removed. Only `timezone` is kept when omitted. */
export interface DayPlanDraft {date:string; taskIds:string[]; mainTaskId?:string; window?:PlanWindow; protectedSpareMinutes:number; note?:string; timezone?:string}
/** A booking for remaining work. It ends at `start` plus the remaining duration. */
export interface RemainingPlacement {blockId:string; start:string; acknowledgedConflictIds:string[]}
export interface RemainingWork {duration:number; preferredDay?:string; taskId?:string; placement?:RemainingPlacement}
export interface ExpectedSession {id:string; state:'running'|'paused'}
export type CheckinLogDraft =
 | {kind:'sleep'; start:string; end:string; quality?:number; notes?:string}
 | {kind:'weight'; at:string; value:number; notes?:string};

/**
 * Narrow reviewed-operation union for `plan.apply`. R2 extends it; it is never an arbitrary
 * command batch. Every block an operation creates takes its ID from the client, so a preview
 * and its apply name the same records.
 */
export type PlanOperation =
 | {op:'selection.set'; taskIds:string[]; mainTaskId?:string}
 | {op:'preferredDay.set'; taskId:string; preferredDay:string|null}
 | {op:'window.set'; window:PlanWindow|null}
 | {op:'spare.set'; protectedSpareMinutes:number}
 | {op:'session.pause'; sessionId:string}
 | {op:'placement.set'; taskId:string; newBlockId:string; start:string; end:string; flexibility?:Flexibility; acknowledgedConflictIds:string[]}
 | {op:'placement.move'; blockId:string; newBlockId:string; start:string; end:string; acknowledgedConflictIds:string[]}
 | {op:'placement.extend'; blockId:string; end:string; acknowledgedConflictIds:string[]}
 | {op:'placement.cancel'; blockId:string; reason:'deferred'|'cancelled'}
 | {op:'appointment.change'; blockId:string; newBlockId:string; start:string; end:string; acknowledgedConflictIds:string[]};

/** Declared contracts. A member is implemented only when contracts.md marks it so with a tested commit. */
export type V3Command =
 | {type:'task.capture'; task:TaskCaptureDraft}
 | {type:'task.update'; id:string; patch:TaskPatch}
 | {type:'task.resolve'; id:string; outcome:'complete'; note?:string}
 | {type:'task.resolve'; id:string; outcome:'partial'; remaining:RemainingWork; note?:string}
 | {type:'task.reopen'; id:string; note?:string}
 | {type:'task.defer'; id:string; preferredDay:string|null; cancelBlockId?:string; deselectFromDate?:string}
 | {type:'task.plan'; task:{id:string}|{capture:TaskCaptureDraft}; blockId:string; start:string; end:string; flexibility?:Flexibility; acknowledgedConflictIds:string[]}
 | {type:'dayPlan.save'; plan:DayPlanDraft}
 | {type:'session.start'; target:SessionTarget; plannedBlockId?:string}
 | {type:'session.pause'; id:string}
 | {type:'session.resume'; id:string; plannedBlockId?:string}
 | {type:'session.switch'; expectedRunningSessionId:string; target:SessionTarget; plannedBlockId?:string}
 | {type:'session.stop'; id:string}
 | {type:'plan.apply'; date:string; source:'reset'|'plan'; operations:PlanOperation[]}
 | {type:'day.startWithCheckin'; date:string; wakeAt?:string; mood?:number; energy?:number; note?:string; logs:CheckinLogDraft[]}
 | {type:'day.close'; id:string; summary?:string; journal?:string; reflection?:DayReflection; expectedSessions:ExpectedSession[]}
 | {type:'settings.saveV3'; name:string; timezone:string; navOrder?:NavIdV3[]};

export type Command = LegacyCommand | V3Command;
export interface CommandEnvelope {requestId:string; baseRevision:number; command:Command}
export interface WeatherData {locationId:string; temperature:number|null; shortForecast:string; high:number|null; low:number|null; precipitation:number|null; fetchedAt:string; stale:boolean; attribution:string; periods:{name:string; temperature:number; forecast:string}[]}
