/**
 * Caminos v3 derived-value contracts: selector, preview and review result shapes plus the
 * stable error-code vocabulary. Types only. A declaration here is not proof that its
 * function exists; docs/redesign-v3/contracts.md records what is implemented and tested.
 */
import type { Block, BlockChangeReason, BlockChangeSource, ExpectedSession, Flexibility, OutcomeSource, PlanWindow, SessionTarget, Task } from './types';

/** Stored-format identity. JSON format, SQL `user_version` and `revision` are three separate counters. */
export interface StateFormat {schemaVersion:number; draft?:number}
/** `read-only` serves export, backup and verification, on legacy and current databases alike. */
export type DatabaseOpenIntent = 'read-only'|'open-existing'|'initialize-if-missing';

export type LegacyErrorCode =
 | 'INVALID_COMMAND'|'NOT_FOUND'|'ARCHIVED'|'INVALID_STATE'|'INVALID_TIME'|'ALREADY_EXISTS'|'ALREADY_RESOLVED'
 | 'ACTIVE_TASK'|'TASK_SCHEDULED'|'TASK_FINISHED'|'PARTIAL_TASK'|'DAY_OPEN'|'GOAL_CYCLE'|'DUPLICATE_STEPS'
 | 'INSUFFICIENT_BALANCE'|'INSUFFICIENT_CASH'|'NOT_EXPIRED';
export type V3ErrorCode =
 | 'SESSION_RUNNING'|'SESSION_ENDED'|'SESSION_SWITCH_STALE'|'TARGET_UNAVAILABLE'|'BOOKING_MISMATCH'|'CLOCK_REGRESSION'
 | 'SESSION_CLOSE_CONFIRMATION_REQUIRED'|'SESSION_CLOSE_STALE'
 | 'PLAN_INVALID'|'PLAN_OPERATION_INVALID'|'CONFLICT_ACK_REQUIRED'|'FIXED_APPOINTMENT_PROTECTED'|'BOOKING_HAS_RECORDED_WORK'
 /** Transitional: a declared command whose handler has not landed. Absent once R1 is complete. */
 | 'NOT_IMPLEMENTED';
export type StorageErrorCode = 'DATABASE_MISSING'|'MIGRATION_REQUIRED'|'UNSUPPORTED_SCHEMA'|'DRAFT_FORMAT_MISMATCH'|'DRAFT_FORMAT_NOT_ALLOWED'|'STATE_INVALID'|'SOURCE_CHANGED'|'MIGRATION_ARGUMENT';
/** One JSON line on stderr for a typed CLI failure. IDs and counts only. */
export interface CliFailure {ok:false; code:StorageErrorCode|DomainErrorCode|TransportErrorCode; message:string; recordIds?:string[]}
export type TransportErrorCode = 'VALIDATION'|'REVISION_CONFLICT'|'REQUEST_ID_REUSED'|'UNAUTHENTICATED'|'CSRF_REJECTED'|'ORIGIN_REJECTED'|'SERVER_ERROR';
export type DomainErrorCode = LegacyErrorCode|V3ErrorCode;

/** Error details carry record IDs, states and counts only. They never contain titles, notes or writing. */
export interface SessionRef {id:string; state:'running'|'paused'; target:SessionTarget}
export interface ErrorDetails {
  runningSession?:SessionRef;
  sessions?:SessionRef[];
  conflictIds?:string[];
  operationIndex?:number;
  recordIds?:string[];
}

// ── Sessions ────────────────────────────────────────────────────────────────
export type SessionState = 'running'|'paused'|'ended';
/** One clipped piece of a recorded interval. `open` means the source interval was still running at `now`. */
export interface RecordedSlice {sessionId:string; target:SessionTarget; start:string; end:string; minutes:number; open:boolean; contextDate:string; timezone:string; dayId?:string; plannedBlockId?:string}
export interface InstantRange {start:string; end:string}

// ── Task collections ────────────────────────────────────────────────────────
export type TaskView = 'all'|'today'|'later';
export type DeadlineStatus = 'overdue'|'due-today'|'upcoming';
export interface TaskViewEntry {
  task:Task;
  /** Selected in the day plan for the supplied date. */
  selected:boolean;
  main:boolean;
  /** `preferredDay` equals the supplied date. */
  preferredToday:boolean;
  /** The task's one live pending booking, on any date. */
  booking?:Block;
  /** True when `booking` intersects the supplied local date. */
  bookedToday:boolean;
  session?:{id:string; state:'running'|'paused'};
  deadlineStatus?:DeadlineStatus;
  estimate:'known'|'unknown';
}
export interface TaskCollections {
  date:string; timezone:string;
  /** Every live open task, including scheduled ones. */
  all:TaskViewEntry[];
  today:{selected:TaskViewEntry[]; other:TaskViewEntry[]};
  later:TaskViewEntry[];
  counts:{all:number; today:number; later:number};
}

// ── Capacity ────────────────────────────────────────────────────────────────
export interface EntryConflict {aId:string; bId:string; start:string; end:string; minutes:number; involvesFixed:boolean; acknowledged:boolean}
/**
 * `creditedMinutes` is the task's reserved time inside the credit range, capped at the estimate.
 * `outOfWindowCreditMinutes` is the part of that credit lying outside the planning window.
 */
export interface TaskCredit {taskId:string; estimateMinutes:number; creditedMinutes:number; outOfWindowCreditMinutes:number; unplacedMinutes:number}
export interface CapacityResult {
  /**
   * `window-missing`: no planning window was chosen; nothing is assumed and balances are absent.
   * `window-elapsed`: remaining-day scope only, `now` is at or after the window's end.
   */
  status:'ok'|'window-missing'|'window-elapsed';
  scope:'full-day'|'remaining-day';
  date:string; timezone:string;
  /** The window actually measured. In remaining-day scope it starts at max(now, window.start). */
  window?:PlanWindow;
  windowMinutes?:number;
  /** R1 demand always uses the owner's estimate as stored. Recorded time is never subtracted from it. */
  estimateBasis:'unchanged-estimate';
  /** Union of positioned-live fixed entries clipped to the measured range. */
  fixedMinutes:number;
  /** Additional union minutes contributed by positioned-live flexible entries beyond `fixedMinutes`. */
  flexibleMinutes:number;
  /** Union of every positioned-live entry clipped to the measured range. Equals fixed + flexible. */
  occupiedMinutes:number;
  protectedSpareMinutes:number;
  /** Sum over selected open estimated tasks of max(0, estimate − credited reservation). */
  unplacedDemandMinutes:number;
  credits:TaskCredit[];
  unestimatedTaskIds:string[];
  /** window − occupied − protected spare − unplaced demand. May be negative. Absent without a window. */
  knownBalanceMinutes?:number;
  /** max(0, balance) and max(0, −balance); both kept so overload is never clamped away. */
  unallocatedMinutes?:number;
  overloadMinutes?:number;
  conflicts:EntryConflict[];
  /** Positioned-live entries on the date lying wholly outside the window. They stay visible. Empty without a window. */
  outsideWindowIds:string[];
  /** Positioned-live entries on the date crossing a window edge. Empty without a window. */
  partlyOutsideWindowIds:string[];
}
export interface NextCommitment {
  /** A pending fixed entry (effective flexibility `fixed`, any kind) whose interval contains `now`. */
  inProgress?:Block;
  /** The next pending fixed entry starting after `now`. */
  next?:Block;
  /** R2: explicit linked preparation or transition interval. Always absent in R1; never guessed. */
  preparation?:InstantRange & {blockId:string};
}

// ── Previews ────────────────────────────────────────────────────────────────
export interface ConflictingEntry {blockId:string; kind:Block['kind']; flexibility:Flexibility; start:string; end:string; minutes:number}
export interface PreviewError {code:string; message:string; operationIndex?:number; details?:ErrorDetails}
export interface PlacementPreview {
  valid:boolean; error?:PreviewError;
  /** The revision the preview was built from. Submit the command with exactly this `baseRevision`. */
  baseRevision:number;
  start:string; end:string; minutes:number; date:string; timezone:string;
  conflicts:ConflictingEntry[];
  /** Exactly the IDs the command must send in `acknowledgedConflictIds`. */
  requiredAcknowledgements:string[];
  /** An existing pending booking of the same task that this placement replaces. */
  supersedesBlockId?:string;
  supersedeEffect?:'moved'|'replanned';
}
export type PlanPreviewRow =
 | {kind:'selection'; before:{taskIds:string[]; mainTaskId?:string}; after:{taskIds:string[]; mainTaskId?:string}; added:string[]; removed:string[]}
 | {kind:'preferredDay'; taskId:string; before?:string; after?:string}
 | {kind:'placement.move'; blockId:string; newBlockId:string; taskId?:string; before:InstantRange; after:InstantRange}
 | {kind:'placement.cancel'; blockId:string; taskId?:string; before:InstantRange; reason:'deferred'|'cancelled'}
 | {kind:'window'; before?:PlanWindow; after?:PlanWindow}
 | {kind:'spare'; before:number; after:number}
 | {kind:'session.pause'; sessionId:string; target:SessionTarget; recordedMinutes:number}
 | {kind:'placement.set'; taskId:string; newBlockId:string; after:InstantRange; replaces?:{blockId:string; before:InstantRange; effect:'moved'|'replanned'}}
 | {kind:'placement.extend'; blockId:string; taskId?:string; before:InstantRange; after:InstantRange}
 | {kind:'appointment.change'; blockId:string; newBlockId:string; before:InstantRange; after:InstantRange};
export interface PlanPreview {
  valid:boolean; error?:PreviewError;
  /** The revision the preview was built from. Submit the command with exactly this `baseRevision`. */
  baseRevision:number;
  date:string; timezone:string;
  /** One row per operation, in operation order. */
  rows:PlanPreviewRow[];
  /** Conflicts in the candidate state, after every operation, over the date's range and every new interval. */
  conflicts:EntryConflict[];
  /**
   * The acknowledgement set each placing operation must carry. The preview ignores the arrays
   * it was given; copy these into the operations before submitting at `baseRevision`.
   */
  requiredAcknowledgements:{operationIndex:number; blockIds:string[]}[];
  /** Pending fixed entries on the date that no operation touches. */
  unchangedFixedIds:string[];
  capacityBefore:CapacityResult; capacityAfter:CapacityResult;
  remainingBefore:CapacityResult; remainingAfter:CapacityResult;
}
export interface TemplatePreviewEntry {
  index:number;
  /** Legacy stable occurrence identity `tpl:<template>:<date>:<index>`. */
  occurrenceId:string;
  kind:Block['kind'];
  durationMinutes:number;
  start?:string; end?:string;
  /** Set when the local time does not exist on the date in the owner's zone. */
  invalidTime?:string;
  alreadyApplied:boolean;
  conflicts:ConflictingEntry[];
}
export interface TemplatePreview {
  valid:boolean; error?:PreviewError;
  baseRevision:number;
  templateId:string; date:string; timezone:string;
  entries:TemplatePreviewEntry[];
  /** Union minutes the not-yet-applied entries would reserve. */
  addedReservedMinutes:number;
  /** Fixed appointments colliding with not-yet-applied entries; send them as `acknowledgedConflictIds`. */
  requiredAcknowledgements:string[];
  capacityBefore:CapacityResult; capacityAfter:CapacityResult;
}
/** Capacity of a plan that is not saved yet, from the same arithmetic as the stored plan. */
export interface DayPlanPreview {
  valid:boolean; error?:PreviewError;
  baseRevision:number;
  date:string; timezone:string;
  addedTaskIds:string[]; removedTaskIds:string[];
  capacityBefore:CapacityResult; capacityAfter:CapacityResult; remainingAfter:CapacityResult;
}
export interface DayClosePreview {
  /** Invalid when the day is missing or archived. An already ended day is valid with `open: false`. */
  valid:boolean; error?:PreviewError;
  baseRevision:number;
  dayId:string; date:string; open:boolean; crossesMidnight:boolean;
  /** Unfinished sessions whose latest interval belongs to this day. Closing ends their recording. */
  associatedSessions:(SessionRef & {recordedMinutes:number})[];
  /** Running work not associated with this day. It keeps running after the close. */
  continuingSessions:(SessionRef & {recordedMinutes:number})[];
  /**
   * Pending entries belonging to the day and what `day.close` does to each. Only an entry that
   * has ended is marked not completed; appointments and entries still to come are left alone.
   */
  pendingEntries:{blockId:string; kind:Block['kind']; effect:'marked-not-completed'|'left-unreviewed'|'left-pending'}[];
  /** Ready to send as `day.close.expectedSessions`. */
  expectedSessions:ExpectedSession[];
}

// ── Factual review ──────────────────────────────────────────────────────────
export type ReservationFact = {blockId:string; kind:Block['kind']; flexibility:Flexibility; start:string; end:string; status:Block['status']; minutes:number;
  /** Superseded, moved, deferred or cancelled history. Never counted as planned time or as a completed task. */
  history:boolean; changeReason?:BlockChangeReason; changeSource?:BlockChangeSource; supersededById?:string};
export interface OutcomeFact {outcomeId:string; taskId:string; kind:'complete'|'partial'|'reopen'; at:string; source:OutcomeSource; selected:boolean; blockId?:string; sessionId?:string; remainingTaskId?:string}
export interface LegacyCompletionFact {taskId:string; evidence:'legacy-block-actual'|'legacy-block-scheduled'; blockId:string; approximate:true}
export interface LegacyRecordedFact {blockId:string; start:string; end:string; minutes:number}
export interface DayFacts {
  date:string; timezone:string; range:InstantRange;
  day?:{id:string; startedAt?:string; endedAt?:string; open:boolean};
  plan?:{id:string; taskIds:string[]; mainTaskId?:string; protectedSpareMinutes:number; windowMinutes?:number};
  selected:{taskId:string; main:boolean; status:Task['status']; archived:boolean; outcomeInRange?:'complete'|'partial'}[];
  outcomes:OutcomeFact[];
  /** Distinct tasks whose latest explicit outcome inside the range is complete / partial. */
  completedTaskIds:string[];
  partialTaskIds:string[];
  legacyCompletions:LegacyCompletionFact[];
  reservations:ReservationFact[];
  /** Union of live, non-history reservations clipped to the calendar range. */
  plannedMinutes:number;
  /** Session intervals clipped to the calendar range. Recorded work, not verified focus. */
  recorded:{minutes:number; slices:RecordedSlice[]};
  /** Intervals associated with the open-day record, which may cross midnight. A different view; never add it to `recorded`. */
  dayRecord?:{dayId:string; minutes:number; slices:RecordedSlice[]};
  /** Elapsed evidence from legacy blocks that no session represents. */
  legacyRecorded:LegacyRecordedFact[];
  unknown:('plan'|'day-record'|'planning-window')[];
}
export interface WeekFacts {
  startDate:string; endDate:string; timezone:string; range:InstantRange;
  days:DayFacts[];
  totals:{plannedMinutes:number; recordedMinutes:number; legacyRecordedMinutes:number; completedTaskIds:string[]; partialTaskIds:string[]; selectedCount:number; selectedCompletedCount:number; daysWithPlan:number; daysWithRecording:number};
  /** Complete tasks that have neither an explicit outcome nor block evidence: no completion day is invented. */
  undatedLegacyCompletionIds:string[];
}
