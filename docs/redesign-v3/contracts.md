# Caminos v3 domain contracts

Owner: AI 1 (Domain, [#2](https://github.com/ggpaintingtampa-cmyk/camino/issues/2)). Reviewers: AI 2 for client-facing contracts, AI 3 for preview/session/plan semantics, AI 4 for integration and operations.

Baseline: `redesign/v3-integration` at `0884f68`. Source of requirements: `skill.md` sections 3.4, 4–7, 12 (Phases 2–5) and 13.1–13.6.

**This document is a contract proposal, not an implementation claim.** A published type or command name does not mean its handler works. Section 10 is the only place that marks something implemented, and only with a tested commit.

Type sources: `shared/types.ts` (stored records, command payloads), `shared/contracts.ts` (selector, preview and review result shapes, error codes) and `shared/state-format.ts` (format constants). Names below are the exact exported names.

Words used with one meaning throughout:

| Word | Meaning |
|---|---|
| live | The record exists and is not archived |
| positioned-live | A live block whose status is not `cancelled` or `missed` |
| fixed / flexible | `blockFlexibility(block)`: the stored `flexibility`, else `fixed` for an appointment and `flexible` for anything else. Never decided by kind alone |
| recorded work | The block is named by at least one session interval, or carries a legacy `actualStart` |
| `now` | Trusted server command time. For a selector, the time the caller passes |
| date range | `localDayRange(date, zone)`, where `zone` is the date's plan zone when a plan exists, else `settings.timezone`. Every result states the zone it used |

## 1. Versions and formats

Three counters stay separate:

| Counter | Where | Meaning |
|---|---|---|
| `revision` | `app_state.revision` and `state.revision`, always equal | Changes by exactly one for every accepted command, and once for an applied migration |
| `schemaVersion` (+ `schemaDraft`) | Inside the state JSON | Shape of stored records |
| SQL `user_version` | SQLite header | SQL storage and bookkeeping layout |

| JSON format | Detection | SQL `user_version` | Status |
|---|---|---|---|
| 1 (legacy) | State JSON has no `schemaVersion` member | 1 | Supported read-only: verify, export, backup, migration source. Never written by the new build |
| 2, draft *n* | `schemaVersion: 2` and `schemaDraft: n` | 2 | **Provisional.** Disposable synthetic fixtures only |
| 2, frozen | `schemaVersion: 2`, no `schemaDraft` | 2 | Does not exist yet. Decided at the R1 readiness gate |
| greater than 2 | `schemaVersion > 2`, or `user_version > 2` | any | Refused with `UNSUPPORTED_SCHEMA`. Never stripped or downgraded |
| anything else | JSON and SQL versions disagree; `schemaVersion` not a positive integer; `user_version` 0; no valid `app_state` row | any | Refused with `STATE_INVALID`. Never repaired by re-stamping |

The visual name "v3" is unrelated to storage format 2.

**Draft rule.** While `CURRENT_SCHEMA_DRAFT` is defined, a database in that format is disposable by definition. Every change to a stored shape during Phases 2–5 increments the draft number. A build refuses a database whose draft number differs from its own with `DRAFT_FORMAT_MISMATCH`; the fixture is recreated, not migrated. Creating or migrating into a draft format needs an explicit draft opt-in (section 6.1), and a draft-state export is not a supported export format. The format is frozen (the draft constant and member are removed) when it first touches non-disposable owner data or is published as a supported release or export format, whichever comes first. After that, stored meaning changes only through a new numbered migration.

Constants in `shared/state-format.ts`: `CURRENT_SCHEMA_VERSION = 2`, `CURRENT_SCHEMA_DRAFT = 1`, `CURRENT_SQL_VERSION = 2`, `LEGACY_SQL_VERSION = 1`.

**Old-build hazard.** The baseline build stamps `user_version = 1` on every open and keeps writing. If it ever opens a migrated database, the next new-build open sees disagreeing versions and refuses with `STATE_INVALID`. Rolling back code after a migration therefore needs the pre-migration backup; it is not repaired in place.

## 2. Stored records

All instants are absolute ISO 8601 UTC strings. All dates are owner-local `YYYY-MM-DD`. Optional values are omitted when absent: stored records never contain `null` or an empty string standing for "unknown".

### 2.1 State

```ts
interface State extends StateRecords { schemaVersion: 2; schemaDraft?: number; revision: number; dayPlans: DayPlan[]; workSessions: WorkSession[]; taskOutcomes: TaskOutcome[] }
```

`StateRecords` holds the twelve collections format 1 already had. The three new collections are required arrays in every format-2 state, so readers need no fallback. `initialState()` returns this shape from the contract commit on. R2 adds `planChanges` and `templateApplications` through a later draft or migration; they are not pre-allocated.

### 2.2 Task

| Field | Shape | Rule |
|---|---|---|
| `duration` | integer minutes, 5–1440, multiple of 5 | **Becomes optional in Phase 2** (section 7.1). Absent means unknown, never zero. Existing values, including 30, are preserved |
| `firstAction`, `doneWhen` | trimmed text, 1–500 characters | Guidance only. `doneWhen` is not a computed completion rule |
| `preferredDay` | local date | Intention. Not a deadline, not a booking |
| `deadline` | `TaskDeadline` | `{kind:'date', date}` stays date-only. `{kind:'instant', at, timezone}` keeps its instant and zone |
| `effort` | `'light' \| 'moderate' \| 'demanding'` | Owner-selected. Stored in R1; no R1 behavior reads it |
| `checklist` | up to 50 `ChecklistItem {id, text, done}`, unique IDs | Completing every item never completes the task |
| existing fields | unchanged | `title`, `tag`, `labels`, `notes`, `goalId`, `status`, `remainingTaskId` keep their meaning |

`goalId` may refer to a parent goal. Migration and validation preserve such links; only the R2 next-step flow restricts new links to leaves.

### 2.3 Block (planned entry)

R1 keeps the three kinds `task`, `appointment`, `routine`. R2 adds `focus`, `buffer`, `transition`.

| Field | Shape | Rule |
|---|---|---|
| `flexibility` | `'fixed' \| 'flexible'` | Optional, owner-set. Effective value through `blockFlexibility(block)` |
| `acknowledgedConflictIds` | string[] | Server-owned. The entries whose overlap was acknowledged when this block's current interval was saved |
| `rescheduledFromId`, `supersededById` | id | Server-owned move links. A moved booking is a new block; the old one stays as history |
| `changeReason` | `BlockChangeReason` | Server-owned. Why a block left the live plan: `moved`, `deferred`, `cancelled`, `replanned`, `task-resolved` |
| `changeSource` | `BlockChangeSource` | Server-owned. `reset`, `plan`, `task`, `template` |
| `actualStart`, `actualEnd` | instant | Compatibility projection, section 2.6 |
| `conflictReviewed` | boolean | Legacy acknowledgement. Still honored, section 5.3 |

### 2.4 DayPlan

`DayPlan extends Base { date; timezone; taskIds; mainTaskId?; window?; protectedSpareMinutes; note? }`

1. At most one live plan per local date. Its ID is deterministic: `dayplan:<date>`.
2. `taskIds` is ordered and unique. `mainTaskId` must be a member.
3. A plan exists without a started `Day`. Selection creates no booking.
4. Selections are references. A task completed or archived later stays in the stored selection for review; actionable selectors skip it.
5. `window` is a pair of instants with `end > start`, at most 25 hours (a whole fall-back day), whole minutes, five-minute aligned in the plan's zone, and `window.start` falls on `date` in the plan's zone. An overnight window is simply one whose end falls on the next date. The client produces the instants with `localInstant`, keeping its policy: a nonexistent local time is rejected and an ambiguous one means its earlier occurrence. Absent window means capacity is unknown, never an assumed day.
6. `timezone` is captured when the plan is created. A later settings change does not reinterpret the plan. Only an explicit `timezone` in `dayPlan.save` revises it.
7. `protectedSpareMinutes` is 0–1440, multiple of 5. It is unplaced reserve.
8. A plan created implicitly by a `plan.apply` operation starts with no selection, no window, no note, `protectedSpareMinutes: 0` and `settings.timezone`.

`mode` (small-plan preference) is R2 and is not stored in R1.

### 2.5 WorkSession

```ts
type SessionTarget = {kind:'task'; taskId} | {kind:'routine'; blockId}
interface WorkInterval { start; end?; dayId?; contextDate; timezone; plannedBlockId? }
interface WorkSession extends Base { target; intervals; endedAt?; endReason?; provenance: 'native' | 'legacy-block' }
```

State is derived, never stored: **running** = last interval has no `end`; **paused** = no open interval and no `endedAt`; **ended** = `endedAt` present.

Invariants (validated on every write and on open):

1. At most one open interval in the whole state, routines included.
2. At most one unfinished session per target.
3. Intervals are chronological, non-overlapping, each with `end >= start`. Only the last may be open.
4. There is no session-level booking or date. Each interval carries its own `plannedBlockId`, `dayId`, `contextDate` and `timezone`, captured when it opens.
5. A supplied `plannedBlockId` refers to an existing block that belongs to the same target: a `task` block with the same `taskId`, or the routine block itself. A routine interval always carries its own `blockId`.
6. `dayId`, when present, refers to an existing day. It is set only from a day that was explicitly open when the interval opened.
7. Ended sessions are immutable history.

Session IDs are generated by the server. A client finds the session of a target with `unfinishedSessionForTarget(snapshot, target)`.

### 2.6 `actualStart` / `actualEnd` projection

For a block named by any session interval ("session-backed"):

| Event | Effect on the block |
|---|---|
| First interval opens under the block | `actualStart` set once and never changed; `actualEnd` and `snoozedUntil` removed |
| Later interval opens under the block | `actualEnd` removed |
| Pause | No change. No `actualEnd` |
| Same target resumes under another booking, or unscheduled | The previous booking's `actualEnd` = end of its last interval |
| Stop, Complete, Partial, Archive, day close, Not completed, Cancel | The latest attributed booking's `actualEnd` = command time, also when the session was paused |

`actualStart && !actualEnd` no longer means running. Terminal legacy blocks keep their original timestamps untouched. A later terminal action never rewrites an `actualEnd` that an earlier one already projected.

### 2.7 TaskOutcome

`TaskOutcome extends Base { taskId; kind: 'complete'|'partial'|'reopen'; at; contextDate; timezone; dayId?; blockId?; sessionId?; remainingTaskId?; remainingDuration?; note?; source }`

Append-only. Created only by domain transitions, with trusted command time, and generated IDs. `source` records the command family that produced it. Editing a task later never changes an outcome. Legacy completed tasks have no outcome record and none is invented.

### 2.8 Day and Settings

`Day.reflection?: { changedPlan?; easierTomorrow? }` is optional and separate from `journal`. `summary`, `summaryEdited` and `journal` keep their meaning.

`Settings.navOrder` stays `NavId[]` (four tabs) through Phases 2–5. Section 7.3 describes Phase 6.

## 3. Commands

Every mutation is a `CommandEnvelope { requestId, baseRevision, command }`. One accepted command is one transaction, one revision, one receipt. A compound command never calls `applyCommand` recursively. Exact receipt replay returns the current snapshot and applies nothing. Receipt lookup precedes the revision check. A rejected command writes nothing: no state, no receipt, no revision.

All schemas are strict: unknown fields are rejected. New schemas contain **no Zod defaults and no transforms other than the existing `trim` and instant normalization**, so a parsed envelope is a faithful image of the wire request. Zod emits keys in schema order and omits absent optional members, so appending an optional member never changes an old payload's parsed form. Defaults are applied inside the domain.

**Availability.** In the contract commit no new command is accepted: `commandSchema` rejects each with a validation error. From the foundation commit on, a declared command whose handler has not landed is accepted by the schema and rejected by the domain with `NOT_IMPLEMENTED` (501). The same holds for a legacy command that carries one of the new optional members before its handler exists.

**Who creates IDs.**

| Record | ID comes from |
|---|---|
| Captured task | `task.capture.task.id` when supplied, else generated. Supply it when the next step needs the task (for example offering Plan task) |
| Every block a v3 command creates | The client: `task.plan.blockId`, `RemainingPlacement.blockId`, `newBlockId` in plan operations. `ALREADY_EXISTS` when the ID is taken. This makes a preview and its apply name the same records |
| Remaining task of a partial outcome | `RemainingWork.taskId` when supplied, else generated. Found afterwards through `Task.remainingTaskId` |
| Session, outcome | Generated. Found through the snapshot and the selectors |
| Day plan | Deterministic `dayplan:<date>` |
| Template occurrence | Legacy deterministic `tpl:<template>:<date>:<index>` and `…:task` |

An ID is created once per intent and kept through every retry. Retry protection is the receipt, not the ID.

### 3.1 Legacy commands

All 23 legacy command types stay accepted with their exact wire shape and parsed form. `tests/legacy-fingerprints.test.ts` pins 30 representative envelopes captured from the baseline.

The existing editors send a stored record back by spreading it, so the two save commands must tolerate what a stored record can now contain. Legacy shapes gain optional trailing members only. An old payload parses to the identical JSON.

| Command | Added members | Meaning |
|---|---|---|
| `task.save` | `firstAction?`, `doneWhen?`, `preferredDay?`, `deadline?`, `effort?`, `checklist?`; `duration` becomes optional in Phase 2 | A member that is sent is stored as sent. A member that is omitted keeps its stored value. `task.save` cannot clear one; `task.update` can |
| `block.save` | `flexibility?` | Owner-set role, stored as sent; omitted keeps the stored value |
| `block.save` | `acknowledgedConflictIds?`, `rescheduledFromId?`, `supersededById?`, `changeReason?`, `changeSource?` | Echo only. Each must equal the stored value, exactly like the existing rule for `status`, `actualStart`, `actualEnd` and `snoozedUntil`. On a new block they must be absent |
| `template.apply` | `acknowledgedConflictIds?` | Present: reviewed mode, section 3.5. Absent: legacy behavior |

Behavior changes behind unchanged wire shapes (Phases 2–3):

| Command | Change |
|---|---|
| `task.save` | A status change goes through the common outcome helper: `open → complete` records a `complete` outcome and ends the target's session; `complete → open` records `reopen` |
| `block.save` | Moving a booking links old and new with `supersededById` / `rescheduledFromId` and `changeReason: 'moved'`. A booking with recorded work still cannot be moved (`ACTIVE_TASK`). No acknowledgement is asked: a conflict it creates stays unacknowledged until `block.conflictReviewed` |
| `block.start` | Adapter for `session.start` with the block as booking. A collision keeps the legacy code `ACTIVE_TASK` and adds `details.runningSession` |
| `block.resolve` | Task and routine outcomes go through the common helpers. `complete`/`partial` record outcomes and end the target's session. `missed`/`cancelled` end the session only when its latest interval belongs to this block. Appointments unchanged. A remainder booking through `remainingStart` asks no acknowledgement |
| `record.archive` | Archiving a task ends its unfinished session (`archived`). Archiving a block cancels it and ends the session whose latest interval belongs to it |
| `day.start`, `day.reopen` | If an unassociated interval is running, split it at command time: close it and open an adjacent interval associated with the day, keeping the same `plannedBlockId`. Never backdated to `wakeAt` |
| `day.end` | Bridge, section 3.3 |
| `block.snooze` | Unchanged. It defers a review reminder and never pauses work |

### 3.2 New commands

| Command | Payload | Effects | Errors |
|---|---|---|---|
| `task.capture` | `task: TaskCaptureDraft` | Creates one open task. Applies `tag: 'Personal'`, `labels: []`, `notes: ''` when omitted. No plan, booking, session or outcome | `ALREADY_EXISTS`, `NOT_FOUND`/`ARCHIVED` (goal) |
| `task.update` | `id`, `patch: TaskPatch` (at least one member) | Edits intent and guidance. `null` clears an optional value. Never touches status, links, sessions, outcomes or bookings | `NOT_FOUND`, `ARCHIVED` |
| `task.resolve` | `id`, `outcome: 'complete'`, `note?` — or — `id`, `outcome: 'partial'`, `remaining: RemainingWork`, `note?` | Ends the target's unfinished session. Resolves the task's pending booking. Writes one outcome. Sets status. Syncs the goal leaf. Partial creates exactly one linked open remaining task that inherits title, tag, labels, notes, goal, first action and done-when, with `remaining.duration` as its estimate and `remaining.preferredDay` when given. `remaining.placement` books it from `start` to `start + duration` | `NOT_FOUND`, `ARCHIVED`, `ALREADY_RESOLVED`, `PARTIAL_TASK`, `ALREADY_EXISTS`, `CONFLICT_ACK_REQUIRED`, `INVALID_TIME` |
| `task.reopen` | `id`, `note?` | `complete → open` with a `reopen` outcome. Goal checks are not changed | `NOT_FOUND`, `ARCHIVED`, `INVALID_STATE`, `PARTIAL_TASK` |
| `task.defer` | `id`, `preferredDay` (date or `null` for Later), `cancelBlockId?`, `deselectFromDate?` | Sets or clears the preferred day. Cancels exactly the named flexible pending booking (`changeReason: 'deferred'`). Removes the task from exactly the named date's selection, clearing `mainTaskId` when it was the main task. Creates no booking | `NOT_FOUND`, `ARCHIVED`, `BOOKING_MISMATCH`, `BOOKING_HAS_RECORDED_WORK`, `FIXED_APPOINTMENT_PROTECTED`, `PLAN_INVALID` |
| `task.plan` | `task: {id} \| {capture}`, `blockId`, `start`, `end`, `flexibility?`, `acknowledgedConflictIds` | Saves the task (when captured) and its booking together, or neither. Placement rule below | `NOT_FOUND`, `ARCHIVED`, `TASK_FINISHED`, `ACTIVE_TASK`, `ALREADY_EXISTS`, `CONFLICT_ACK_REQUIRED`, `INVALID_TIME` |
| `dayPlan.save` | `plan: DayPlanDraft` | Replaces the plan for `plan.date`, creating it if needed. An omitted `mainTaskId`, `window` or `note` is removed. An omitted `timezone` keeps the stored zone, or captures `settings.timezone` on creation. Newly added IDs must be live open tasks; IDs already in the stored plan may stay whatever their status. An over-capacity plan is accepted | `PLAN_INVALID`, `NOT_FOUND` |
| `session.start` | `target`, `plannedBlockId?` | Opens an interval, creating the session or resuming the target's paused one. An omitted booking means unscheduled; nothing is inherited | `SESSION_RUNNING`, `TARGET_UNAVAILABLE`, `BOOKING_MISMATCH`, `CLOCK_REGRESSION` |
| `session.pause` | `id` | Closes the open interval. Already paused: accepted no-op | `NOT_FOUND`, `SESSION_ENDED`, `CLOCK_REGRESSION` |
| `session.resume` | `id`, `plannedBlockId?` | Opens a new interval with fresh context | `NOT_FOUND`, `SESSION_RUNNING`, `SESSION_ENDED`, `TARGET_UNAVAILABLE`, `BOOKING_MISMATCH`, `CLOCK_REGRESSION` |
| `session.switch` | `expectedRunningSessionId`, `target`, `plannedBlockId?` | Pauses the expected running session and starts or resumes the target, in one command. The target must differ from the running one | `SESSION_SWITCH_STALE`, `INVALID_COMMAND`, plus the `session.start` errors |
| `session.stop` | `id` | Ends recording. The task stays open. No outcome, day or block is created. Already ended: accepted no-op | `NOT_FOUND`, `CLOCK_REGRESSION` |
| `plan.apply` | `date`, `source`, `operations: PlanOperation[]` (1–100) | Section 3.4 | `PLAN_OPERATION_INVALID`, `PLAN_INVALID`, `CONFLICT_ACK_REQUIRED`, `FIXED_APPOINTMENT_PROTECTED`, `BOOKING_HAS_RECORDED_WORK`, `ACTIVE_TASK`, `ALREADY_EXISTS` |
| `day.startWithCheckin` | `date`, `wakeAt?`, `mood?`, `energy?`, `note?`, `logs: CheckinLogDraft[]` (0–4) | `day.start` plus the supplied sleep and weight logs. Everything is saved or nothing is. On a day that is already started it is the same accepted no-op as `day.start` and writes no log | `day.start` errors, log validation |
| `day.close` | `id`, `summary?`, `journal?`, `reflection?`, `expectedSessions` | Section 3.3 | `SESSION_CLOSE_STALE`, `NOT_FOUND`, `ARCHIVED` |

Accepted no-ops still produce one revision and one receipt, matching the existing repeated `day.start`.

**Same target already running.** `session.start` or `session.resume` on a target that is running is an accepted no-op when `plannedBlockId` equals the open interval's booking (both absent counts as equal). Otherwise it is `BOOKING_MISMATCH`: pause first, then resume under the other booking.

**Interval context.** A new interval takes `dayId` from the one explicitly open day if there is one (a day with `startedAt`, without `endedAt`, not archived, including yesterday's still-open day), `contextDate` from `now` in `settings.timezone`, and that `timezone`. It never inherits an earlier interval's day or booking.

**Booking eligibility.** A `plannedBlockId` must name a live `pending` block of the same target. An appointment is never a target (`TARGET_UNAVAILABLE`).

**Target eligibility.** A task target is a live task with status `open`. A routine target is a live `pending` routine block.

**Pending booking on direct resolve.** If the booking has started (`start <= now`) or has recorded work, it takes the outcome status. A purely future booking is cancelled with `changeReason: 'task-resolved'`. Appointments are never touched.

**Placement rule** (`task.plan`, `placement.set`). The task must be live and open.

| The task's pending booking | Result |
|---|---|
| None | The new booking is created |
| Exists, no recorded work | Move: old block `cancelled`, `supersededById`, `changeReason: 'moved'`; new block `rescheduledFromId` |
| Has recorded work, session paused or ended | Old block `missed`, `supersededById`, `changeReason: 'replanned'`, actual timestamps kept; new block `rescheduledFromId` |
| Has recorded work, session running under it | `ACTIVE_TASK`. Pause or stop first (inside `plan.apply`, an earlier `session.pause` operation does that) |

The booking interval is independent of the estimate. Neither command changes `duration`.

**Conflict acknowledgement.** One rule for every v3 command that places, moves or extends an entry:

| Command | Acknowledgement | Required set |
|---|---|---|
| `task.plan`, `RemainingPlacement`, `placement.set`, `placement.move`, `placement.extend`, `appointment.change` | Required array, may be empty | Every positioned-live entry overlapping the new interval in the resulting state, entries created by the same command included, the entry itself and the block it supersedes excluded |
| `template.apply` with the member present | One array for the whole application | The union of those sets over every entry the application creates |
| `block.save`, `block.resolve`, `template.apply` without the member | None | Exempt. The conflict stays unacknowledged |

Intervals are half-open `[start, end)`, so touching entries do not overlap. The array must equal the required set; a difference is `CONFLICT_ACK_REQUIRED` with `details.conflictIds` holding the required set. Each created block stores, in `acknowledgedConflictIds`, the part of the set it overlaps.

### 3.3 Closing a day

The **associated sessions** of a day are the unfinished sessions whose latest interval has that `dayId`. Session creation date and historical selection are irrelevant.

| Step | Behavior |
|---|---|
| Legacy `day.end`, associated sessions exist | Rejected atomically with `SESSION_CLOSE_CONFIRMATION_REQUIRED` and `details.sessions`. Day, sessions, writing and revision are unchanged |
| Legacy `day.end`, none | Closes with the legacy entry set below. Existing behavior preserved |
| `day.close` on an open day | `expectedSessions` must equal the associated sessions by ID and state, else `SESSION_CLOSE_STALE` with `details.sessions` holding the current set. The envelope's `baseRevision` is the reviewed revision |
| `day.close` on an ended day | `expectedSessions` is not compared. Supplied writing is saved; nothing else changes. No new closing time, outcome or summary |
| Associated sessions | Open interval closed at `now`, `endedAt = now`, `endReason: 'day-closed'`, booking projection updated. No outcome is invented and the task stays open |
| Unassociated running work | Continues. It is not attached to the day and not stopped |
| Writing | `summary`, `journal`, `reflection` saved only when supplied. A summary is generated only when none exists. An edited summary is never replaced |

Which pending entries a close marks `missed` (their tasks stay `open`; appointments are never resolved by closing):

| Command | Entry set |
|---|---|
| `day.close` | Pending task and routine blocks that belong to the day **and have ended** (`end <= now`). Belonging: the block starts on `day.date` in `settings.timezone`, or between `day.startedAt` and `now`. Entries still running or still to come stay `pending` |
| `day.end` | The legacy set, unchanged: every pending task and routine block belonging to the day, including ones later the same date. Kept so the existing screen and its tests behave as before. A client should move to `day.close` for every close once it is available |

Accepted legacy `day.end` receipts replay before any of these checks run.

### 3.4 `plan.apply`

`date` names the plan the command addresses. After midnight with yesterday's day still open, the client chooses which date it is resetting; the domain does not guess. `source` is `'reset'` or `'plan'`. The envelope's `baseRevision` is the revision the preview was built from; a stale one is rejected by the ordinary revision check and nothing is recalculated.

| Operation | Rule |
|---|---|
| `selection.set` | Sets the date's ordered selection and main task. Same ID rules as `dayPlan.save` |
| `preferredDay.set` | Sets or clears one live task's preferred day |
| `window.set` | Sets the date's planning window, or removes it with `null`. Same window rules as section 2.4 |
| `spare.set` | Sets the date's `protectedSpareMinutes` |
| `session.pause` | Pauses exactly the named session, which must be running |
| `placement.set` | Books a live open task by `taskId` under the placement rule of section 3.2. This is how Reset re-plans the task that was just worked on, and how it places a task that has no booking |
| `placement.move` | By `blockId`: a flexible pending `task` or `routine` block without recorded work. Old block `cancelled`, `supersededById`, `changeReason: 'moved'`. New block `rescheduledFromId`, same kind, title, tag, notes and task |
| `placement.extend` | Changes only `end` of a flexible pending `task` or `routine` block, in place, recorded work or not. `end` must be after `now` and after `start` |
| `placement.cancel` | A flexible pending `task` or `routine` block without recorded work becomes `cancelled` with the given reason. The task stays open |
| `appointment.change` | Moves a pending fixed entry of any kind without recorded work, superseding it like `placement.move`. Inside `plan.apply` it is the only operation that may touch a fixed entry. Cancelling one is `block.resolve`, outside Reset |

Rules:

1. Operations apply in array order. Acknowledgements are evaluated against the final candidate state.
2. At most one each of `selection.set`, `window.set`, `spare.set`, `session.pause`. No two operations on the same block or the same task's placement. No two `preferredDay.set` for the same task.
3. A `placement.*` operation on a fixed entry is `FIXED_APPOINTMENT_PROTECTED`. One on a booking with recorded work, other than `placement.set` and `placement.extend`, is `BOOKING_HAS_RECORDED_WORK`.
4. A block named by `blockId` must intersect the date's range. Its new interval may leave the date.
5. A failure that has its own code keeps it. Every other in-operation failure is `PLAN_OPERATION_INVALID`. All carry `details.operationIndex`. Nothing is saved.
6. Blocks changed by the command carry `changeSource` equal to `source`. No estimate is ever changed.
7. A fixed entry that no operation names is byte-for-value unchanged.

### 3.5 Templates in R1

R1 keeps whole-template application and the legacy occurrence IDs. Entries already applied for the date are skipped, so re-applying is duplicate-safe. `previewTemplateApplication` shows load and conflicts first. In reviewed mode the application is rejected unless the acknowledged set is exact. A structural edit of a template that already has applied occurrences needs a new template until R2.

## 4. Errors

`DomainError { message, code, status, details? }`. HTTP body: `{ error, code, details? }`. `details` follows `ErrorDetails`: IDs, states and indexes only.

| Code | Status | Raised when |
|---|---|---|
| `SESSION_RUNNING` | 409 | Start or resume while another target runs. `details.runningSession` |
| `SESSION_ENDED` | 409 | Pause or resume of an ended session |
| `SESSION_SWITCH_STALE` | 409 | The running session is not the expected one. `details.runningSession` when any |
| `TARGET_UNAVAILABLE` | 409 | Target missing, archived, finished, or not startable |
| `BOOKING_MISMATCH` | 409 | Booking missing, resolved, belonging to another target, or differing from the running interval's |
| `CLOCK_REGRESSION` | 409 | Command time precedes the session's last recorded instant. Nothing is stored |
| `SESSION_CLOSE_CONFIRMATION_REQUIRED` | 409 | Legacy `day.end` with associated sessions. `details.sessions` |
| `SESSION_CLOSE_STALE` | 409 | `day.close` expectation differs from the current associated sessions. `details.sessions` |
| `PLAN_INVALID` | 400 | Duplicate or unknown selection, main task outside the selection, invalid window or reserve, task not selected |
| `PLAN_OPERATION_INVALID` | 400 | Contradictory, duplicate or ineligible plan operation. `details.operationIndex` |
| `CONFLICT_ACK_REQUIRED` | 409 | Acknowledged set differs from the required set. `details.conflictIds` |
| `FIXED_APPOINTMENT_PROTECTED` | 409 | A flexible-placement operation targets a fixed entry |
| `BOOKING_HAS_RECORDED_WORK` | 409 | Move, cancel or defer of a booking that has recorded work |
| `NOT_IMPLEMENTED` | 501 | A declared command whose handler has not landed. Transitional: absent once R1 is complete |

Legacy codes keep their meaning. Transport codes are unchanged. Storage codes are in section 6.6.

## 5. Selectors and result shapes

Pure functions. State, zone-bearing inputs and `now` are passed explicitly; none reads the clock. Result types are in `shared/contracts.ts`. Every preview result carries `baseRevision`, the revision to submit with.

### 5.1 Sessions and day closure — `shared/sessions.ts`

| Function | Returns |
|---|---|
| `sessionState(session)` | `SessionState` |
| `runningSession(state)` | the one running `WorkSession` or `undefined` |
| `unfinishedSessions(state)` | running and paused sessions |
| `unfinishedSessionForTarget(state, target)` | `WorkSession \| undefined` |
| `sessionsAssociatedWithDay(state, dayId)` | unfinished sessions whose latest interval has that day |
| `recordedSlices(state, range, now, filter?)` | `RecordedSlice[]` clipped to `[range.start, range.end)`; an open interval is measured to `now` |
| `recordedMinutes(session, now)` | whole session, closed intervals plus the open one to `now` |
| `recordedMinutesForBlock(state, blockId, now)` | only slices whose interval names that booking |
| `isSessionBacked(state, blockId)` | whether any interval names the block |
| `previewDayClose(state, dayId, now)` | `DayClosePreview` for `day.close` |

Minutes are `Math.floor(ms / 60000)` of the summed milliseconds, so clipping never rounds a total upward.

### 5.2 Tasks and plans — `shared/planning.ts`

| Function | Returns |
|---|---|
| `openTasks(state)` | live tasks with status `open` |
| `taskCollections(state, date, now)` | `TaskCollections` |
| `tasksForView(state, view, date, now)` | `TaskViewEntry[]` |
| `dayPlanForDate(state, date)` | `DayPlan \| undefined` |
| `selectedTasksForDay(state, date)` | ordered live tasks in the selection |
| `mainTaskForDay(state, date)` | `Task \| undefined` |
| `nextFixedCommitment(state, now)` | `NextCommitment` |

View membership, one task ID across all views:

- **All**: every live open task, scheduled or not. Completed and partial tasks are reached through the existing history paths.
- **Today**: selected in the date's plan, or `preferredDay === date`, or a live pending booking intersecting the date range. `today.selected` follows plan order; `today.other` holds the rest.
- **Later**: every open task not in Today.

`deadlineStatus` is `overdue` only for a real deadline in the past. An undated task is never overdue. `unscheduledTasks` keeps its legacy meaning and is not the All view.

### 5.3 Capacity — `shared/capacity.ts`

| Function | Returns |
|---|---|
| `localDayRange(date, timezone)` | `InstantRange` of the local date, 23, 24 or 25 hours. Defined in `shared/dates.ts` |
| `blockFlexibility(block)`, `isPositionedLive(block)` | The two vocabulary rules as functions |
| `clipInterval(interval, window)` | clipped interval or `undefined` |
| `unionMinutes(intervals, window?)` | minutes of the merged, clipped intervals |
| `entryConflicts(state, range)` | `EntryConflict[]` among positioned-live entries intersecting the range |
| `capacityForPlan(state, date)` | `CapacityResult`, scope `full-day` |
| `capacityForRemainingDay(state, date, now)` | `CapacityResult`, scope `remaining-day` |
| `capacityForDraft(state, draft, now?)` | the same arithmetic for an unsaved `DayPlanDraft`; scope `remaining-day` when `now` is passed |

Measured range and credit range per scope:

The **plan range** is the date range extended to cover the window, so an overnight window's hours after midnight belong to the plan that owns the window.

| Scope | Measured range (occupation, balance) | Credit range |
|---|---|---|
| `full-day`, window present | The window | The plan range |
| `full-day`, no window | The date range, status `window-missing`, no balances, both outside-window lists empty | The date range |
| `remaining-day` | `[max(now, window.start), window.end)`. When `now >= window.end`: status `window-elapsed`, `windowMinutes: 0`, balances still returned | The plan range from `now` on |

Arithmetic (R1):

1. `occupiedMinutes` = union of positioned-live entries clipped to the measured range. `fixedMinutes` = union of the fixed ones. `flexibleMinutes` = the difference.
2. Credit per selected open estimated task = minutes of its live pending placement inside the credit range, capped at the estimate. Resolved bookings are history and give no credit. Credit is not clipped to the window: a task booked outside the window is placed, not unplaced, and `outOfWindowCreditMinutes` says how much of its credit lies outside.
3. `unplacedDemandMinutes` = sum of `max(0, estimate − credit)`. Selected open tasks without an estimate go to `unestimatedTaskIds` and add nothing.
4. `knownBalanceMinutes = windowMinutes − occupiedMinutes − protectedSpareMinutes − unplacedDemandMinutes`. `unallocatedMinutes` and `overloadMinutes` are its positive and negative parts.
5. Estimates are used as stored (`estimateBasis: 'unchanged-estimate'`). Recorded time is never subtracted. Protected spare is the day's whole unplaced reserve in both scopes.
6. Conflicts are reported separately and never change the union.
7. A conflict is `acknowledged` when either block lists the other in `acknowledgedConflictIds`, or either carries legacy `conflictReviewed`.

Worked R1 example (P23): window 480, fixed 60, spare 120, demand 150 gives balance 150. Adding an unestimated task changes only `unestimatedTaskIds`.

### 5.4 Previews — `shared/planning.ts`

| Function | Returns |
|---|---|
| `previewPlacement(state, {taskId?, start, end}, now)` | `PlacementPreview`. Without `taskId` it previews a remainder or a captured task |
| `previewDayPlan(state, draft, now)` | `DayPlanPreview` |
| `previewPlanChange(state, {date, source, operations}, now)` | `PlanPreview` |
| `previewTemplateApplication(state, {templateId, date}, now)` | `TemplatePreview` |

A preview runs the same validation and transformation as its command on a cloned state, with one exception: it ignores the acknowledgement arrays it is given and reports the required ones instead. The client copies them into the command and submits at `baseRevision`. A preview never mutates. Cancelling a preview sends nothing.

**Extension.** The overrun state's extension is a `plan.apply` with one `placement.extend`. Its preview shows the new end, the conflicts with the next fixed commitment and the capacity effect. Nothing extends automatically.

### 5.5 Review facts — `shared/review.ts`

| Function | Returns |
|---|---|
| `factsForDay(state, date, now)` | `DayFacts` |
| `factsForWeek(state, startDate, now)` | `WeekFacts` for seven consecutive local dates |

Rules:

- Planned reservations, recorded intervals, legacy evidence and unknown facts are separate members and are never summed together.
- `recorded` clips absolute intervals to the local calendar range. `dayRecord` groups intervals by their open-day association and may cross midnight. They are two views of the same work.
- A legacy block's elapsed span appears in `legacyRecorded` only when no session represents the block.
- Completed counts come from explicit outcomes, deduplicated by task. Moved, cancelled and superseded blocks have `history: true` and add nothing.
- A legacy complete task is attributed only through block evidence, flagged `approximate`. Without block evidence it is listed in `undatedLegacyCompletionIds` and no day is invented.
- Nothing infers a cause from health, mood or money records.

### 5.6 Search and export

`Repository.search` also matches `firstAction` and `doneWhen`. Exports carry the new collections and no credentials or tokens: `{ format: 'caminos-owner-export', version: 2, stateFormat: StateFormat, exportedAt, state }`. A legacy database exports unchanged as `version: 1`. While the format is a draft, `stateFormat.draft` is present and the export is a development artifact, not a supported format.

## 6. Persistence and operations

### 6.1 Opening a database

`new Repository(path, { intent, allowDraftFormat })`. `intent: DatabaseOpenIntent`, default `'open-existing'`. `allowDraftFormat` defaults to `false`. `:memory:` always initializes and is always allowed to be a draft.

Inspection happens on a read-only connection before any writable open, schema statement or `PRAGMA user_version`. `user_version` is written only when a database is created and when a migration is applied.

| Situation | `read-only` | `open-existing` | `initialize-if-missing` |
|---|---|---|---|
| File missing | `DATABASE_MISSING` | `DATABASE_MISSING` | Creates the database in the current format. While that format is a draft, only with `allowDraftFormat`; otherwise `DRAFT_FORMAT_NOT_ALLOWED` |
| Current format | Reads | Opens | Opens |
| Legacy format 1 | Reads for export and backup. `snapshot()` is `MIGRATION_REQUIRED` | `MIGRATION_REQUIRED` | `MIGRATION_REQUIRED`. Initialization never authorizes migration |
| Draft number differs | `DRAFT_FORMAT_MISMATCH` | same | same |
| Newer format | `UNSUPPORTED_SCHEMA` | same | same |
| Any disagreement, invalid state, existing file that is not a Caminos database | `STATE_INVALID`, record IDs only | same | same. An existing file is never initialized |

A failure creates nothing: no directory, database, WAL or SHM file. A read-only repository rejects every write.

| Caller | Intent |
|---|---|
| `server/main.ts` (server start) | `initialize-if-missing`, passed explicitly. `allowDraftFormat` only when `CAMINOS_ALLOW_DRAFT_FORMAT=1` |
| `createApp` called without `databaseIntent` | Transitional default `initialize-if-missing` with `allowDraftFormat: true`, so the existing harness and tests keep working. It flips to `open-existing` / `false` once AI 4's harness passes both explicitly (section 7.4) |
| CLI `owner-setup`, `setup-link` | `initialize-if-missing`. A draft format only with `--allow-draft-format` |
| CLI `command` | `open-existing` |
| CLI `snapshot` | `open-existing`. A legacy database is `MIGRATION_REQUIRED` |
| CLI `export`, `backup` | `read-only`. Work on legacy and current databases alike, so the scheduled backup keeps running before a migration |
| CLI `verify`, `migrate` preflight | `read-only` |
| CLI `restore-scratch` | Source `read-only`. Creates only its explicitly named new destination |
| MCP bridge | Through the CLI: `snapshot`, `export`, `command`. Never initializes |

A server started on a legacy database fails at startup with `MIGRATION_REQUIRED`. It does not start in a degraded mode and writes nothing, authentication rows included.

### 6.2 Migration

Pure transformation `migrateLegacyState(legacy): State` in `server/migrations.ts`. Deterministic: no clock, no random IDs, no I/O.

1. Every record and relationship is copied unchanged. Estimates, timestamps, links, summaries, journals, logs, ledgers, adjustments, envelopes, reminders, templates, locations and the four-tab `navOrder` are preserved.
2. `schemaVersion` and `schemaDraft` are set. `dayPlans`, `taskOutcomes` start empty. No task is selected, no outcome is invented.
3. A running legacy block (`pending`, `actualStart`, no `actualEnd`, not archived) becomes one session: ID `legacy-session:<blockId>`, `provenance: 'legacy-block'`, one open interval starting at the original `actualStart`, `plannedBlockId` the block, `contextDate` from that instant in the settings zone. `dayId` is set only when exactly one open day started at or before that instant. `createdAt` is `actualStart`, `updatedAt` the block's `updatedAt`.
4. Completed legacy intervals stay on their blocks as evidence. No session or pause is fabricated for them.
5. More than one running legacy block, a task block without a task, or a broken reference stops the migration with an IDs-only diagnostic. Nothing is repaired or guessed.
6. The result is validated, shape and invariants, before it is returned.

CLI: `migrate --db ABSOLUTE_EXISTING_PATH --to-schema 2 [--apply --backup ABSOLUTE_NEW_PATH --allow-draft-format]`.

| Rule | Detail |
|---|---|
| Default | Read-only preflight: formats, SQL version, revision, record counts, diagnostics. No private content |
| `--db` | Must be present literally in the arguments and absolute. `CAMINOS_DB`, `HERMES_DB` and the default path never count |
| Apply | Needs `--apply` and `--backup` with an absolute path that does not exist. While the target is a draft format it also needs `--allow-draft-format`. A missing or malformed argument is `MIGRATION_ARGUMENT` |
| Digest | SHA-256 of the exact `app_state.json` text as stored, never of a re-serialization or of file bytes |
| Sequence | Preflight and dry-run transformation; new verified backup whose revision and digest equal the source's; immediate transaction that re-reads `user_version`, both revisions and the digest and aborts with `SOURCE_CHANGED` on any difference; transform; validate; `revision + 1` in SQL and JSON; bookkeeping row; `user_version = 2`; commit |
| Failure | Rolls back. Source state, revision and SQL version unchanged |
| Repeat | Apply on a database already in the target format reports `already-current`, writes nothing, takes no backup |
| Preserved | Receipts, owner and authentication records, weather cache, login attempts, setup records. No session reset |
| Operator | No other process may hold the database. The command does not stop services; that belongs to the separately authorized maintenance plan |

Bookkeeping table `state_migrations(id INTEGER PRIMARY KEY, from_format, to_format, to_draft, source_revision, result_revision, source_digest, applied_at)`.

### 6.3 Backup, verification, restore

`Repository.verifyBackup(path)` is read-only and returns `{ revision, format: StateFormat, sqlVersion }`. It accepts legacy format 1 and the current format, validates the matching shape and invariants, refuses newer formats, and never upgrades.

`restore-scratch` verifies the source, copies it into a new destination only, and removes authentication sessions from the copy through a narrow writable connection that executes exactly `DELETE FROM sessions`: no schema statement, no `user_version` write, no `app_state` write. It then verifies read-only that format, revision and `user_version` equal the source's. The copy keeps its format; upgrading it is a separate explicit `migrate --apply` on that path.

### 6.4 MCP bridge

`deploy/caminos-mcp.mjs`:

- Always passes an explicit absolute `--db` to the CLI: `CAMINOS_DB` / `HERMES_DB` when set, otherwise the historical default resolved against the project directory. A relative configured path is rejected, not resolved.
- Checks before spawning that the path is an existing regular file and not a symbolic link, and fails otherwise. This holds even when the spawned CLI belongs to an older checkout.
- Invokes only `snapshot`, `export` and `command`. Tool arguments are never forwarded as CLI flags. There is no migration tool and no initialization.
- Builds its CLI arguments in an exported pure function and takes an injectable spawn, so tests use a mocked process and isolated paths. The stdio loop starts only from an explicit `start()`, which both entry points call.

### 6.5 HTTP

`POST /api/commands` and `GET /api/snapshot` keep their shape. `Snapshot` carries the format-2 members. Domain errors add `details` when present. Origin, CSRF, authentication and no-store behavior apply unchanged to every new command because they share the one command route. No new route is added.

### 6.6 Storage errors and CLI output

| Code | Raised when |
|---|---|
| `DATABASE_MISSING` | The path does not exist and the intent does not create |
| `MIGRATION_REQUIRED` | Legacy format where the current one is needed |
| `UNSUPPORTED_SCHEMA` | Newer JSON format or SQL version |
| `DRAFT_FORMAT_MISMATCH` | Draft number differs from the build's |
| `DRAFT_FORMAT_NOT_ALLOWED` | Creating or migrating into a draft format without the opt-in |
| `STATE_INVALID` | Disagreeing versions or revisions, failed shape or invariant validation, not a Caminos database |
| `SOURCE_CHANGED` | The source changed between backup and apply |
| `MIGRATION_ARGUMENT` | `migrate` without a literal absolute `--db`, without `--to-schema`, with an unsupported target, `--apply` without `--backup`, or a backup path that is relative or exists |

A typed CLI failure prints one JSON line on stderr, `{ "ok": false, "code", "message", "recordIds"? }`, and exits 1. It contains IDs and counts only. Untyped failures keep the existing plain message.

## 7. Compatibility requirements

### 7.1 Breaking changes and their prerequisites

| Change | Lands with | Breaks | Prerequisite |
|---|---|---|---|
| `Task.duration` becomes optional | Phase 2 behavioral PR | `src/TaskListPage.tsx:16–17` (comparison and arithmetic on the value); displays at `src/planning.tsx:137`, `:222` and `src/HomePage.tsx:53`; the editor default at `src/planning.tsx:25`, which would turn an unknown estimate into a stored 30 on the first save | AI 2 lands a preparatory patch: an absent estimate is shown as unknown, and the editor never invents one. Requested on [#3](https://github.com/ggpaintingtampa-cmyk/camino/issues/3) |
| Legacy database refused | Phase 2 behavioral PR | Any local database created by an older build | Recreate synthetic fixtures. Owner data needs the separately authorized migration |
| `Repository` needs an intent to create a file | Phase 2 behavioral PR | `new Repository(newPath)` in tests | Owned tests are updated in the same PR. `createApp` keeps a transitional default |
| Paused work keeps `actualStart` | Phase 3 behavioral PR | Every consumer that treats `actualStart && !actualEnd` as running: `src/HomePage.tsx:18`, `:51`, `src/planning.tsx:129`, `:141` | AI 2 switches them to `runningSession` / `isSessionBacked` before Pause is exposed |
| Legacy `day.end` can be rejected | Phase 3 behavioral PR | The existing End Day screen | AI 2 adds the confirmation that submits `day.close` |

Not breaking, because the server tolerates it: the existing editors spread a stored record into `task.save` and `block.save`. Section 3.1 accepts every member a stored record can carry. A client must still not change a server-owned block member.

### 7.2 Receipts and fingerprints

1. Receipt lookup stays before the revision check.
2. A legacy envelope parses to the same JSON as at the baseline. New optional members are appended last and have no default.
3. New behavior for a legacy command runs inside the domain, after fingerprint, receipt and revision handling.
4. A request accepted before migration and retried after it returns the current snapshot and applies nothing.
5. The same request ID with a different payload stays `REQUEST_ID_REUSED`.
6. Receipts are never pruned by this redesign.

### 7.3 Navigation (Phase 6, not started)

Stored `navOrder` stays four-tab through Phases 2–5 and `settings.save` keeps accepting exactly the original four-tab shape forever. The planned Phase 6 slice, delivered together with AI 2:

- New command `settings.saveV3 { name, timezone, navOrder?: NavIdV3[] }` with exactly five distinct IDs. The legacy branch is not edited.
- Stored `Settings.navOrder` becomes `NavIdV3[]` through an explicit format step. Conversion removes `goals`, inserts `tasks` after `schedule` and `history` after `tasks`, keeps the relative order of the rest, and defaults to `home, schedule, tasks, history, more`.
- After activation a fresh four-tab `settings.save` is normalized to five tabs inside the domain, after fingerprint, receipt and revision handling. A replayed accepted request returns through its receipt first.

Nothing in this section is implemented.

### 7.4 Requests to other roles

| To | Request |
|---|---|
| AI 2 | Preparatory unknown-estimate patch (7.1). Review sections 3.2, 4, 5.1, 5.2 and 6.5. Confirm `runReviewed(command, reviewedRevision)` sends the preview's `baseRevision` unchanged |
| AI 2 | Phase 3: the four consumers in 7.1 use sessions; End Day confirmation submits `day.close` with `previewDayClose(...).expectedSessions` |
| AI 3 | Review sections 3.3, 3.4, 3.5, 5.3 and 5.4: operation union, placement rule, acknowledgement rule, close entry set |
| AI 4 | In `tests/support/browser-harness.ts` and `tests/browser-harness.test.ts:64`, pass `databaseIntent: 'initialize-if-missing'` and `allowDraftFormat: true` to `createApp`. After that lands, `createApp`'s defaults become strict. Review section 6 |

## 8. Release map

| Area | R1 | R2 |
|---|---|---|
| Storage | Format 2 draft, explicit migration, open intent, legacy verify/export/backup | `planChanges`, `templateApplications`, later draft or migration |
| Task | Optional estimate, guidance, preferred day, deadline, effort and checklist fields, outcomes | Energy filter behavior, goal next-step command |
| Sessions | All five commands, legacy adapters, per-interval attribution | — |
| Plan | Selection, main task, window, unplaced reserve, fixed/flexible | Focus windows, positioned buffers and transitions, allocations, small-plan mode |
| Reviewed operations | `task.plan`, `plan.apply` (ten operations), `day.close`, `day.startWithCheckin`, reviewed `template.apply` | Focus/buffer operations, `template.applySelection`, plan-change records |
| Review | `factsForDay`, `factsForWeek` with interval attribution | Weekly learning view data, reasons, insight-to-task |

Matrix rows this workstream answers: M01–M13, M15–M25 (M21, M22 with Phase 6), T01–T25, T27–T29, P01–P06, P09, P10, P14–P20, P23, R05–R14, R16, R18–R22, the R1 date scenarios in 13.4 and items 1, 3, 5, 6, 9, 10 of 13.6. Browser journeys and UI states are not covered by domain tests.

## 9. Decisions beyond `skill.md`

| Decision | Reason |
|---|---|
| `schemaDraft` marker and explicit draft opt-in for create and migrate | Makes "provisional" machine-checkable, so a draft shape cannot reach owner data unnoticed |
| Legacy database stops server start instead of serving `MIGRATION_REQUIRED` over HTTP | Guarantees zero writes, including authentication rows, to a database that was not migrated |
| `read-only` intent for export and backup | A legacy database must stay exportable and the scheduled backup must keep working before a migration |
| Client-supplied IDs for every created block | A preview and its apply must name the same records, including in acknowledgement sets |
| Acknowledged set must equal the required set | A preview and its apply cannot silently disagree |
| Legacy save commands accept and echo the new stored members | The existing editors spread stored records; rejecting them would break every edit of a v3 task |
| Explicit `cancelBlockId` and `deselectFromDate` in `task.defer` | The command changes exactly what the owner previewed |
| Reviewed mode on `template.apply` through an optional member | Keeps legacy whole-template occurrence IDs and wire shape; R2 owns `template.applySelection` |
| Future booking cancelled, started booking resolved, on direct task resolve | A booking that never began is not evidence of completed scheduled work |
| Re-planning a booking with recorded work closes it as `missed` / `replanned` | Preserves the executed record without leaving the task unplannable |
| `placement.extend` edits the end in place | It changes intent only; recorded intervals and the booking's start are untouched |
| `day.close` marks only ended entries; `day.end` keeps the legacy set | `skill.md` 6.7 asks to preserve future placements, and the existing screen must behave as before |
| Credit is not clipped to the window | `skill.md` 7.4 step 2 credits the placement itself. Clipping would count a task booked outside the window as both placed and unplaced. In remaining-day scope only the time before `now` is excluded |
| Interval split also on `day.reopen` | Reopening makes a day explicitly open, the same condition as Start Day |
| `endReason: 'day-closed'` | Distinguishes an owner Stop from a disclosed close consequence |
| Deterministic plan ID `dayplan:<date>` | One plan per date holds by construction |

## 10. Implementation status

| Item | Status | Evidence |
|---|---|---|
| Exported types in `shared/types.ts`, `shared/contracts.ts`, constants in `shared/state-format.ts` | Declared | This contract PR. Typecheck passes |
| `initialState()` returns the format-2 draft shape | Implemented | This contract PR. Existing suites pass |
| Legacy wire fingerprints | Tested | `tests/legacy-fingerprints.test.ts`, this contract PR |
| Every new command, selector, preview, migration and storage rule above | **Not implemented** | — |

Known limits of this handoff: no browser check was run by this role. WebKit cannot launch on this workstation (`libevent-2.1.so.7` missing), as recorded in `review-handoff.md`. The production wrapper `deploy/hermesctl` rejects `--db`, so the migration command cannot run through it; a production migration needs its own separately authorized operations path. Until the Phase 2 behavioral PR, the repository still stamps `user_version = 1` and has no format gate.
