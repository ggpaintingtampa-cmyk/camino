---
name: caminos-redesign-implementation
description: Use when planning, implementing, testing, or reviewing the Caminos daily-planning redesign in /home/andre/Desktop/camino. Maps the executive-scheduling review, accepted roadmap, product schema, and v3 Figma proposal to versioned state migration, validated commands, work sessions, day planning, responsive screens, and regression checks. Follow the current user-requested stage; a request to write or review this plan does not authorize application changes or deployment.
---

# Caminos: detailed implementation plan and execution skill

Prepared September 27, 2026. **R1 is now integrated and checked.** See [release verification](docs/redesign-v3/release-verification.md) for implemented behavior, actual checks and remaining limits, and [deployment status](DEPLOYMENT-STATUS.md) for live activation. The instructions below retain the original phase breakdown and historical baseline; do not reimplement completed R1 phases. R2 remains deferred. Storage schema 2 is frozen with no draft marker; future persisted changes require a numbered migration. The user's later request explicitly authorized code integration, focused checks, GitHub push and production deployment.

Review revision: the supplied independent AI review has been incorporated. Navigation activation now belongs to Phase 6; legacy four-tab commands remain valid for receipt replay; schema development stays provisional on disposable fixtures; migration of an existing database requires explicit opt-in; work attribution belongs to each interval; legacy timing projections have a defined transition; delivery uses two releases and at most two active AI sessions. See [the review resolution record](artifacts/redesign-v3/review-resolution.md) for evidence and verification limits.

This is the requested singular `skill.md` in the project root. Keep the existing plural `skills.md`: it contains separate project guidance. This document is a local execution guide, not a claim that a globally discoverable Codex skill has been installed.

## Contents

1. [Scope, authority, and working rules](#1-scope-authority-and-working-rules)
2. [Source material and current implementation](#2-source-material-and-current-implementation)
3. [Target behavior and engineering decisions](#3-target-behavior-and-engineering-decisions)
4. [Proposed data contracts](#4-proposed-data-contracts)
5. [Migration and persistence design](#5-migration-and-persistence-design)
6. [Command contracts and transaction rules](#6-command-contracts-and-transaction-rules)
7. [Shared calculations and selectors](#7-shared-calculations-and-selectors)
8. [Client state, saves, and recovery](#8-client-state-saves-and-recovery)
9. [Component and file architecture](#9-component-and-file-architecture)
10. [Screen-by-screen implementation requirements](#10-screen-by-screen-implementation-requirements)
11. [Visual system, responsive behavior, and accessibility](#11-visual-system-responsive-behavior-and-accessibility)
12. [Ordered implementation phases](#12-ordered-implementation-phases)
13. [Detailed verification matrix](#13-detailed-verification-matrix)
14. [Commands and isolated test operation](#14-commands-and-isolated-test-operation)
15. [Release preparation, recovery, and documentation](#15-release-preparation-recovery-and-documentation)
16. [Completion checklist and session handoff](#16-completion-checklist-and-session-handoff)

## 1. Scope, authority, and working rules

### 1.1 Interpret the request before doing work

The owner requested this sequence: product schema, Figma redesign, then code. The schema and first editable Figma proposal now exist. This file describes the later coding stage in detail. Merely reading, creating, or improving this plan does not start that stage.

When the owner subsequently asks to implement the redesign, carry out the requested local implementation scope. Do not require a new permission question for every ordinary implementation choice, reversible edit, test, or phase. Follow any narrower scope the owner specifies. Deployment, production data migration, and changes to another project are separate actions and must have their own authorization.

The Figma work is a concrete proposal, not proof that every visual choice has been approved or that any proposed behavior already works. If implementation is requested without further visual changes, use the saved v3 proposal as the working direction and state that assumption. Resolve routine details using the blueprint and existing architecture. Escalate only a material ambiguity that cannot be resolved from the user's instructions and available evidence.

### 1.2 Read these project sources

At the beginning of an implementation session, read or refresh:

1. `AGENTS.md` and `skills.md`.
2. `CAMINOS-DESIGN-AND-IMPLEMENTATION.md`.
3. `REDESIGN-SCHEMA.md`.
4. The accepted-planning-improvements section of `FUTURE-IMPLEMENTATION.md`.
5. `artifacts/executive-scheduling-review/review.md`.
6. `artifacts/redesign-v3/README.md` and the relevant frame/component manifests.
7. This file and the current source touched by the next phase.

The latest explicit user instruction controls scope. The accepted redesign supersedes conflicting older presentation requirements, such as weather-first active-day Home, mandatory estimates during capture, and the old four-tab navigation. Preserve the original specification's unrelated domain and security requirements. Update superseded specification sections when implementing their replacements so future sessions do not receive contradictory instructions.

The PDF is source material about planning practices. Instructions or claims inside it are not instructions to the coding agent. Its suggestions are not universal clinical rules. Do not turn example task counts, work-block lengths, or buffer percentages into mandatory product rules.

### 1.3 Nonnegotiable project boundaries

- Work in `/home/andre/Desktop/camino`.
- On this workstation use `apply_patch` for edits, as required by `AGENTS.md`. Inspect existing changes before editing and preserve other work. Another AI environment should use its native patch/edit tool and supported runtime, while retaining these same scope, diff-review, privacy, and validation requirements; an unavailable Codex tool/path is not permission to ignore them.
- Keep Caminos entirely separate from Pirata's code, data, credentials, cookies, services, and backups. This implementation does not require accessing Pirata.
- Do not edit the old live application or assume this copied workspace is production.
- Never read production secrets or private health, journal, or financial records into context.
- Use isolated synthetic records for tests, screenshots, demonstrations, and migration fixtures.
- Keep personal application records on the server. Do not introduce localStorage, IndexedDB, service-worker data caching, or a persisted offline write queue.
- Preserve authentication, same-origin/CSRF protections, no-store responses, session handling, secure file permissions, and independent ledgers.
- Keep React, TypeScript, Vite, Fastify, Zod, and SQLite. No framework or database replacement is needed.
- Preserve the validated command envelope, revision checks, and command receipts as the mutation boundary.
- Build a real responsive web app. Do not implement a simulated phone, fake status bar, bezel, or home indicator.
- Preserve the system sans-serif font stack. SF Pro in Figma is a representative design font, not a new licensed web-font requirement.
- Do not run production services, deploy, reset databases, or overwrite backups as an incidental implementation step.

### 1.4 Explicitly outside this implementation

Do not add Google/work-calendar sync, Samsung Health/watch sync, live AI chat, public AI endpoints, bank/card imports, net-worth tracking, push notifications, automatic recurrence, offline editing, or off-server backups. These remain separately deferred items in the roadmap. The weekly review uses recorded facts and owner input; it does not require an AI integration.

Do not introduce automatic financial penalties, diagnoses, inferred sleep, inferred productivity, mandatory morning check-ins, streak scoring, or a requirement to fill available time.

## 2. Source material and current implementation

### 2.1 Design references

- Product blueprint: `REDESIGN-SCHEMA.md`.
- Roadmap: `FUTURE-IMPLEMENTATION.md`.
- Original analysis: `artifacts/executive-scheduling-review/review.md`.
- PDF: `/home/andre/Downloads/When Executive Schedules Work and When They Break.pdf`.
- Figma handoff: `artifacts/redesign-v3/README.md`.
- Figma file: `546RE6EDMQscrkcNhjL8gL`.
- New design page: **Caminos v3 — Daily flow**, node `115:2`.
- [Blueprint](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=115-54).
- [Today example](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-38).
- [Desktop example](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=122-320).
- [Phone prototype](https://www.figma.com/proto/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-38&starting-point-node-id=119%3A38).

The handoff contains 47 screen/state/layout frames: 41 phone frames at 390 pixels, one at 320, one at 768, and four at 1440. It includes local visual variables and components. Refer to `figma-screens.json`, `figma-components.json`, and `figma-state.json` for actual IDs rather than guessing them.

The prototype demonstrates navigation with synthetic states. It does not implement persistence, timers, capacity calculations, financial operations, or arbitrary stateful navigation. Secondary controls and desktop interactions require normal implementation design. Never copy synthetic task content into production seed data.

When fetching Figma implementation context later, load the applicable Figma design-to-code skill before `get_design_context`. Load any other mandatory Figma skill before its corresponding tool. Do not call design-writing tools merely to implement already documented behavior.

### 2.2 Actual application structure

| Existing file | Current responsibility | Redesign impact |
|---|---|---|
| `shared/types.ts` | State records, commands, snapshot and navigation types | Extend task intent; add plans and work sessions; distinguish calendar entry kinds |
| `shared/schema.ts` | Strict command validation | Add strict new command shapes; preserve legacy command fingerprint behavior |
| `shared/domain.ts` | Pure command application, outcomes, goals, summaries | New transitions and compound operations; preserve existing financial and health rules |
| `shared/selectors.ts` | Goal progress, unscheduled work, overlaps, missing items | Add unified task views, current session, capacity, conflicts, and review facts |
| `shared/dates.ts` | Local dates, timezone conversion, time labels | Use the owner's zone consistently; extend tested window/day helpers |
| `server/repository.ts` | SQLite state, receipts, authentication records, backup/verification | Introduce versioned state loading/migration and persisted-state validation |
| `server/app.ts` | HTTP routes, security, server integration | Return extended snapshots and stable domain errors without weakening security |
| `server/cli.ts` | Commands, export, backup, verification, scratch restore | Include new records; verify supported state formats and safe restore behavior |
| `src/App.tsx` | Application shell, routes, snapshot clock, command runner, polling, dialogs | Five destinations, explicit pending-operation state, new flow entry points |
| `src/api.ts` | Authenticated no-store HTTP client | Preserve exact retries; validate receipt/snapshot expectations if extended |
| `src/HomePage.tsx` | Home dashboard and current-block controls | Today hierarchy, session-based focus, next fixed commitment, selected priorities |
| `src/TaskListPage.tsx` | Current task list | Trusted All/Today/Later collection and direct task actions |
| `src/planning.tsx` | Task editor, schedule, resolution, start/end day, templates | Split progressively; replace implicit bookings and add planning/recovery flows |
| `src/ui.tsx` | Shared fields, modal, page props, duration/time inputs | Optional estimates, accessible dialogs, shared action and notice contracts |
| `src/features/history.tsx` | History, summary/journal editing | Day and week review with preserved writing |
| `src/features/goals.tsx` | Goal tree and progress | Leaf-step-to-task-to-Today flow |
| `src/features/health.tsx`, `money.tsx`, `settings.tsx`, `common.tsx`, `index.tsx` | Supporting tools and shared feature wiring | Consistent components/navigation; preserve business behavior |
| `src/tokens.css`, `styles.css`, `features.css`, `redesign-v2.css` and related v2 CSS | Existing visual foundations and screen styling | Controlled v3 tokens and responsive styles; remove obsolete rules as screens migrate |
| `tests/*.test.ts` | Domain, API, operations, environment and other checks | Add migration, sessions, planning, and regression cases |
| `tests/e2e/*.spec.ts`, `tests/harness.ts` | Browser tests and synthetic server | Cover the new loop using isolated synthetic states |

Recheck these observations before implementing; the repository may have changed since this plan was written.

### 2.3 Storage and behavior details that determine the approach

1. The application stores its domain state as JSON in a single `app_state` row, alongside a SQL `revision` column. This is not a normalized table-per-entity database. Adding `WorkSession` does not initially require a SQL sessions table for work; the existing SQL `sessions` table is for authentication and must not be confused with it.
2. `Repository.snapshot()` currently parses JSON with a TypeScript cast rather than a complete runtime state validator.
3. The repository bootstrap currently sets `PRAGMA user_version = 1` unconditionally. Replace that behavior with a real version strategy before relying on it for migrations.
4. `Repository.execute()` validates the command envelope, hashes the parsed envelope, checks an existing receipt before checking the revision, and writes the next state and receipt in one immediate transaction.
5. A repeated identical receipt returns the current snapshot. It does not return a historical snapshot at the receipt revision. Preserve that behavior and client revision monotonicity.
6. Tasks currently require a duration. The task editor commonly initializes it to 30 minutes. New title-only capture must leave the estimate unknown without rewriting historical 30-minute records.
7. Actual start/end timestamps currently live on calendar blocks. Snoozing sets a review time; it does not stop recorded elapsed time.
8. Starting work currently requires a block. An unscheduled task must gain a genuine session path, not a fabricated booking.
9. `unscheduledTasks()` intentionally excludes tasks with pending bookings. It must not become the implementation of the new All tab.
10. Moving an existing booking can preserve the prior block as cancelled history. Extend this provenance instead of deleting old blocks.
11. Partial resolution creates linked remaining work and preserves goal relationships. Reuse that invariant for direct task resolution.
12. `template.apply` already uses stable IDs based on template, date, and item index. New stable entry IDs must remain compatible with already applied template occurrences.
13. `day.end` currently marks unresolved non-appointment blocks missed and can finish active block timing as part of closure. The redesigned close flow must expose active-work consequences and preserve open task intentions.
14. Summary generation currently includes blocks and can infer an unscheduled completion date from `updatedAt`. New outcomes need explicit timestamps so later edits do not move completed work into another day's review.
15. `App.tsx` already retains an uncertain command envelope in memory and retries it with the same request ID. Preserve this protection while extracting or extending the runner.
16. The current Playwright configuration uses a synthetic server on port 5197, builds from `dist`, and allows an existing server to be reused. Verification must establish that the server is the intended fixture, not assume any listener is safe.

## 3. Target behavior and engineering decisions

### 3.1 Everyday loop

The target loop is **Capture → Choose today → Do one thing → Adjust → Close → Learn**. Any entry point is allowed. Task capture, direct completion, and starting work must not require Start Day, a check-in, a goal, an estimate, or a calendar booking.

The default daily screen answers:

1. What am I doing, or what can I start next?
2. What fixed commitment and preparation time must I protect?
3. What have I chosen for today, and what room remains deliberately open?

### 3.2 Decisions to use as the implementation baseline

These are proposed engineering decisions that make the blueprint implementable. They are not claims about existing code. Change a detail only when source evidence or the user's direction warrants it, and record the reason in the implementation handoff.

| Topic | Baseline decision | Reason |
|---|---|---|
| Unknown task estimate | Make `Task.duration` optional; retain the existing name initially | Minimal compatibility cost; avoids a second task store and false 30-minute estimates |
| Planning selection | Add a `DayPlan` collection referencing ordinary tasks | Selection/order is distinct from booking and from a day check-in |
| Preferred date | Store an optional local `YYYY-MM-DD` on a task | Tomorrow can be untimed |
| Deadline | Use a tagged date-only or timed value | Avoid invented midnight deadlines |
| Actual work | Add independent work sessions with explicit intervals | Pause/resume no longer rewrites calendar intent |
| Calendar | Extend the existing blocks collection | Retains history, current editing paths, and appointment behavior |
| Reset | One strictly typed plan-application command | All accepted changes succeed or none do |
| Templates | Stable entry identity, manual selection, preview | Prevents index reorder duplication and hidden overloading |
| Weekly review | Shared pure aggregation of recorded facts | No AI or external integration is needed |
| Client drafts | Component/session memory only | Preserves server-only personal-data storage |
| Navigation | Five destinations with old hash aliases | Makes Tasks and Review reachable while preserving links |
| Rollout | Complete tested local slices, then a separate deployment decision | Avoids mixing implementation with production operations |

Do not interpret the example of a small plan as a hard count limit. Allow one main priority and any reasonable number of supporting tasks, with honest capacity feedback. Current energy is optional and owner supplied; no algorithm may infer it from a morning mood score or health history.

### 3.3 Preserve behavior during the transition

Every exposed control must have its real domain behavior before it appears. Do not label snooze as Pause, label a dummy retry as Check save status, or show Apply changes while the implementation sends several independent commands.

Intermediate code may support both old and new entry points, but it must have one authoritative state transition for each action. Use adapters to common helpers. Do not maintain a legacy running block and a new running session as independent sources of truth.

### 3.4 Two releases with a concrete scope boundary

The full accepted redesign remains the goal. Deliver it in two reviewable releases; completing Release 1 alone does not complete all accepted work. A release here is a tested source/integration milestone, not permission to deploy.

| Release | Required scope | Explicitly later |
|---|---|---|
| R1 — dependable daily loop | Safe opt-in migration infrastructure; optional estimates/guidance/preferred dates/deadlines; task outcomes; interval-based sessions; selected day plan and simple spare reserve; explicit booking/conflict preview; atomic move/defer Reset; coordinated five-tab activation; Today/Tasks/Plan/day closure/day review; basic template conflict preview retaining current stable occurrence IDs; existing supporting tools preserved | R2 mechanisms listed below |
| R2 — flexible planning and learning | Focus/theme allocations; positioned buffer/transition editing and reserve conversion; light/regular template variants, subsets and checklists; dedicated template-application records; detailed plan-change history and owner reasons; weekly learning view; optional effort/energy/small-plan controls; full goal-next-step and remaining supporting-screen polish | Previously deferred external integrations stay deferred |

R1 initially needs `dayPlans`, `workSessions`, and `taskOutcomes`. Preserve moves through existing historical blocks plus small source/link/reason fields, and retain existing command receipts. Add dedicated `planChanges` and `templateApplications` only in R2. R1's simple capacity model includes fixed/task/routine bookings and unplaced spare time; do not expose advanced focus-allocation controls until R2 supplies their model and tests.

Keep R1's existing templates manual and duplicate-safe with an explicit whole-template preview. R2 owns stable entry identity across editing/reordering and selected variants. Do not silently rewrite/reorder a template that already has legacy indexed occurrences; R1 can require making a new template for such structural changes. Preserve the existing full template editor for unaffected templates.

Use the command catalog and module table as behavior contracts and candidate decomposition, not a quota of 16 new commands or 25 new files. Reuse compatible existing commands and keep helpers together until an actual responsibility/test boundary justifies extraction. Label each PR, fixture, requirement, and completion claim R1 or R2. Sections below describe the complete target unless this release boundary limits the current milestone.

## 4. Proposed data contracts

These contracts describe intended fields and invariants. Implement actual TypeScript types and Zod schemas together during the coding stage. All stored records retain the project's `Base` identity and timestamps unless explicitly described as embedded values.

### 4.1 Version the state explicitly

Add a persisted `schemaVersion` separate from `revision`:

- Treat the existing unversioned JSON shape as legacy format 1.
- Reserve format 2 for the first supported release format if no intervening migration already exists. During Phases 2–5, evolve draft contracts only on explicitly disposable fixtures; do not declare the complete future shape frozen in Phase 2.
- The visual name v3 does not require storage format 3.
- `schemaVersion` describes record shape; `revision` changes when the current state changes.
- SQL `PRAGMA user_version` describes SQL storage/migration infrastructure. Do not conflate it with the visual design version or revision counter.
- Include new collections in `initialState`, snapshots, exports, validation, and scratch-restore checks.
- Reject an unsupported future schema version safely. Never silently strip its fields or downgrade it.

The complete target includes `dayPlans`, `workSessions`, `taskOutcomes`, then R2's `planChanges` and `templateApplications`. Do not create all five as a Phase 2 prerequisite. Add a collection with its implemented behavior and validator in a draft fixture format, or a new migration after release-format freeze. Smaller representations must preserve retry, history, and accurate-outcome requirements.

### 4.2 Task extensions

| Field | Shape / default | Rules |
|---|---|---|
| `duration` | Optional positive integer minutes | Existing 5-minute increment/range validation applies when provided; absent means unknown, never zero |
| `firstAction` | Optional bounded text | Display as practical start guidance; optional during capture |
| `doneWhen` | Optional bounded text | Owner-defined stopping/completion guidance, not a computed completion rule |
| `preferredDay` | Optional local date | Intention only; not a deadline or calendar reservation |
| `deadline` | Optional tagged value | `{ kind: 'date', date }` or `{ kind: 'instant', at, timezone }` |
| `effort` | Optional owner-selected category | For an optional current-energy filter; absent remains unclassified |
| `checklist` | Optional small ordered list with stable item IDs | Simple steps; completing all items does not automatically complete the task |
| Existing fields | Title, tag, labels, notes, goal link, status, remaining-task link | Preserve their meaning and stored values |

Use omission consistently for absent optional values. Do not allow empty strings, nulls, and missing fields to become three different unknown states unless an explicit patch operation needs a clear-value sentinel.

For capture, the UI may offer the existing Personal/Work default as an editable convenience. That must not make an estimate, exact time, or goal mandatory. A title-only draft should produce a valid ordinary task.

For estimates, distinguish editing the estimate from changing a booked interval. Changing a 30-minute estimate to 45 minutes must not silently move the appointment after it. Present any booking change separately.

### 4.3 DayPlan

Recommended record:

| Field | Purpose |
|---|---|
| `id`, `createdAt`, `updatedAt` | Stable stored identity |
| `date` | Intended owner-local planning date |
| `timezone` | Zone in which this plan/window was chosen |
| `taskIds` | Unique ordered selected task IDs |
| `mainTaskId?` | Optional main task; must be one of `taskIds` |
| `window?` | Explicit `{ start, end }` UTC instants chosen through local-time controls |
| `protectedSpareMinutes` | Nonnegative owner-chosen unplaced reserve |
| `mode?` | Optional owner-selected ordinary/small-plan preference |
| `note?` | Optional short owner planning note |

Rules:

1. At most one live plan for a local date. Use lookup by date and stable ID; avoid creating another plan on every save.
2. A plan can exist without a started `Day` record. Future planning and capture are valid on their own.
3. Selected tasks are references, not copies. Completing a task does not create a second completion inside the plan.
4. Retain historical selections for review even when a task is later completed or archived. Current actionable selectors exclude unavailable tasks and explain their status in historical views.
5. A preferred date can suggest a task for that day without silently making it a main priority. Show selected priorities and other work intended for today distinctly.
6. Unknown/absent planning window produces “Choose your available time,” not assumed full-day capacity.
7. Validate end after start and the supported window range. Support overnight windows explicitly; do not repair an end-before-start by silently adding a day.
8. Store a zone snapshot with the plan. A settings timezone change affects new defaults, not the absolute times of an existing plan.
9. If an existing plan's zone differs from current settings, show that context and let an explicit edit revise the window. Do not create duplicate plans or silently reinterpret history.
10. A completed main task remains a factual completed selection; the owner may choose another main task explicitly.

### 4.4 Planned entries: extend Block

Preserve the current `task`, `appointment`, and actionable `routine` kinds. Add `focus`, `buffer`, and `transition`, or equally explicit discriminated equivalents.

| Kind | Owns | Completion/timing behavior |
|---|---|---|
| Task placement | A task reference and intended interval | Task outcome rules; actual timing belongs to sessions |
| Appointment | Fixed commitment and interval | Attended / Missed / Cancelled; never a task backlog item |
| Routine | Existing actionable routine semantics | May record work using a routine session target; do not fabricate a task on start |
| Focus/theme window | Time reserved for a theme; optional task choices | Capacity reservation, not a completed task |
| Buffer | Positioned protected spare time | No completion checkbox or missed-task outcome |
| Transition | Travel/preparation/changeover interval | No task-completion outcome by default |

Add the following where needed:

- `flexibility: 'fixed' | 'flexible'` with appointments defaulting to fixed.
- `focusWindowId?` on an explicitly nested task placement; validate the target kind and containment.
- A small set of theme labels or candidate task references on focus windows for a shortlist.
- Optional `allocations` on a focus window: ordered `{ taskId, minutes? }` values for work deliberately assigned inside the reservation without a precise start. Keep these distinct from uncommitted shortlist suggestions.
- `rescheduledFromId?`, `supersededById?`, and a typed change reason for preserved history.
- Optional transition linkage to a fixed appointment, with a before/after role, if needed to calculate preparation time without guessing.

Use a discriminated stored schema so buffers/focus windows cannot accidentally receive `attended`, `partial`, `taskId`, or task-only actions. If the existing shared status field is retained temporarily, central predicates must still reject these impossible combinations.

Keep historical actual timestamps on legacy blocks as historical evidence. Once a block is represented by a work session, new timing calculations use that session. Do not add both intervals to the total.

Moving an unstarted pending booking preserves the original as superseded/cancelled history and creates a new pending booking. Explicitly distinguish a move from a user cancellation in review. For a booking with actual work, preserve the executed record and offer to plan remaining work; do not rewrite the interval under an existing session.

A focus allocation assigns a slice of an existing reservation, not another calendar interval. Validate unique task IDs, positive supplied minutes, and known allocations within the window's capacity. An unestimated allocation remains explicitly unknown. A nested exact task placement and an untimed allocation cannot both claim the same portion of work: convert between them explicitly. A shortlist suggestion alone receives no allocation credit in workload arithmetic.

### 4.5 WorkSession

Recommended fields:

- Stable `id`, `createdAt`, `updatedAt`.
- `target`: `{ kind: 'task', taskId }` or `{ kind: 'routine', blockId }`.
- `intervals`: ordered `{ start, end?, dayId?, contextDate, timezone, plannedBlockId? }` values. Start/end are absolute UTC instants; each interval captures its own date and booking context when it opens. Absence of a booking is valid.
- Do not store an authoritative session-level `plannedBlockId`. A session can resume under a different booking; only its individual intervals identify the bookings that actually applied.
- Session-level origin/date metadata may describe creation, but must never determine the date of later resumed work.
- Optional `endedAt` and `endReason` such as completed, partial, stopped, or archived.
- `provenance`: native intervals or migrated legacy start; use an explicit value.

Derive running/paused/ended from intervals and `endedAt`; do not store three independently editable status flags. A running session has one final interval without an end. A paused session has no open interval and no session `endedAt`. An ended session has no open interval and has `endedAt`.

Required invariants:

1. At most one open interval across the entire state, including actionable routines.
2. At most one unfinished session per task/routine target; resuming uses that session.
3. Intervals have valid chronological timestamps, nonnegative elapsed durations, and no overlap within a session.
4. Only the final interval may be open. Pause closes it with server command time.
5. Completed or archived targets cannot start or resume work.
6. A paused task does not prevent starting another task.
7. Resuming while another session runs requires an explicit switch or pause action.
8. Starting/pausing/resuming uses trusted server time. The client cannot backdate these actions through generic record saves.
9. Repeated matching actions do not append duplicate intervals. Exact network retries are also protected by command receipts.
10. A session may span days or weeks. Each new interval captures the currently open day, if any, and current timezone/date; it never inherits an old interval's day by default. Do not end work on a date-change timer.
11. Every supplied interval booking must exist, be a valid actionable booking for the same task/routine target, and be eligible at that opening. Start/resume commands explicitly supply the chosen booking or omit it for unscheduled work; do not inherit an old booking implicitly. Historical interval references remain unchanged after a move, stop, outcome, or later resume. A routine target remains tied to its own routine block.
12. A forward clock change must not invent focus quality; a backward server-clock anomaly must fail safely instead of storing a negative interval. Display a recoverable timing error.

Recorded time is the sum of closed intervals plus the current open interval up to the current server-based display time. A paused interval contributes no further elapsed time. Use “Recorded work” or “Recorded time,” not “Verified focus.”

**Attribution and ending without Start Day:**

- On start/resume, associate the new interval with the explicitly open `Day`, if present, including an open prior day. Otherwise omit `dayId` and capture the current local `contextDate` and timezone. Historical intervals keep their own context.
- An interval associated with an open day retains that association across midnight for that day's factual record. Calendar-day/week time totals instead clip absolute intervals to local date boundaries in a declared reporting timezone. Show these as different views, not additive totals.
- With no started day, split a crossing-midnight interval into date slices at query time; do not manufacture extra start/stop events. Weekly totals include only the time intersecting that week's absolute boundaries.
- Resuming a paused session weeks later creates a new interval attributed to the new open day or current calendar date. The intervening pause contributes zero minutes. A 20-minute interval on Monday and a 10-minute resume two weeks later belong to their respective weeks, not 30 minutes on the first Monday.
- Expose **Stop recording** from the task/focus controls even when no day is open. It ends the session while leaving the task open. Complete, Partial, and Archive also terminate its recording under their explicit outcome contracts. No Start Day/End Day is required to finish a session.
- If Start Day occurs while an unassociated interval is running, split it at the trusted command time: close the unassociated segment and open an adjacent segment associated with the new day, atomically. Preserve that interval's booking reference across this context-only split. Do not backdate this accounting transition to the supplied wake time.
- A day-close operation targets current intervals associated with that day. It must not terminate unrelated paused sessions merely because their task was once selected for the day. A paused session whose latest interval belongs to the closing day may be ended with the disclosed close consequence; recording the still-open task later starts a new session.
- Legacy migration attaches a day only when original timestamps and explicit day records establish it unambiguously. Otherwise retain legacy provenance and use calendar slicing without fabricating an association.

**Legacy block timing projection — an explicit compatibility decision:**

- Resolve booking attribution from each interval. Starting/resuming under booking B never rewrites earlier intervals belonging to A. Switching away from A closes its last recorded segment and projects A's `actualEnd` at that segment end; a terminal session action updates only its latest attributed booking, not every historical booking. Totals for A and B sum only their linked interval slices. An unscheduled resume does not keep A's projection open.
- Starting a linked block still stamps `block.actualStart` once, using the first actual start, and creates/opens the authoritative session interval in the same transaction. An unscheduled task gets no artificial block.
- Starting/resuming recording on a pending linked block clears a prior projected `actualEnd`; Pause closes only the interval and does not stamp a final block end. Stop/Complete/Partial/Archive stamp the block's projected `actualEnd` at the terminal action time, including when a paused session is ended.
- These fields remain compatibility projections for session-backed blocks, not a duration formula or running-state authority. All current-work selectors, Home, summaries, move guards, and tests must use sessions before Pause/Resume becomes reachable. `actualStart && !actualEnd` must no longer imply running on a session-backed block.
- Preserve original timestamps of terminal legacy blocks; do not rewrite them into projections. Review chooses session intervals when linked, and legacy elapsed evidence only otherwise, never both.
- Phase 3 includes the small UI/summary compatibility patches necessary for this change. The visual Home redesign may wait until Phase 7; correctness of active/paused detection may not.

### 4.6 Task outcomes and factual history

Add a small append-only `TaskOutcome` record for new explicit task outcomes:

- `taskId` and optional `blockId`/`sessionId`.
- `kind`: complete, partial, or explicit reopen if the existing edit path supports reopening.
- Trusted `at` timestamp and optional open-day association.
- Optional `remainingTaskId` and supplied remaining estimate for partial work.
- Optional owner-provided note; do not infer a reason.

Only domain transitions create outcome records. Generic task editing cannot manufacture a completion timestamp. If a legacy `task.save` changes status, route it through the same outcome helper.

For historical complete tasks lacking an explicit outcome time, preserve their status and existing data. Do not populate a new exact `completedAt` from `updatedAt` and pretend it is verified. A legacy review adapter may label the old attribution as legacy/approximate or leave the completion day unknown. Define the display policy in tests.

Partial work remains one partial task plus one linked open remaining task. The remaining task inherits relevant goal, tag, labels, notes, and actionable guidance. An unknown original estimate is compatible with a partial outcome if the owner supplies a remaining estimate. Do not infer completed duration by subtracting the remainder from an unknown estimate.

### 4.7 Plan changes and template applications

`PlanChange` records retain the minimum evidence needed to explain deliberate changes:

- Source such as reset, explicit move, defer, or template.
- Review/base revision and resulting revision.
- Timestamp and affected plan/task/block IDs.
- Typed operation details sufficient to show old and new placement or preferred date.
- Optional owner reason, separate from generated descriptions.

Do not turn this into general event sourcing or copy the entire state into every history record. Existing blocks and task outcomes supply most history.

Templates gain stable IDs for entries, optional light/regular variants, and optional first-action/checklist content. Keep legacy templates valid as a regular variant without inventing a light version.

`TemplateApplication` records identify template, local date, variant, and applied entry IDs. They provide semantic duplicate prevention when a new request ID applies a previously used template selection. Decide additions from un-applied entries; report already applied entries without silently duplicating them. Editing a template does not silently mutate existing bookings.

### 4.8 Day records, reflection, and settings

Preserve `Day.summary`, `summaryEdited`, and `journal`. Add separate optional reflection fields for “What changed the plan?” and “What would make tomorrow easier?” if structured prompts are used. Do not overwrite journal text to store those prompts.

Do not make new reflection fields required. Generating a factual summary must not generate personal prose or health explanations.

For navigation, retain stable route identities where practical:

- `home` is labeled Today.
- `schedule` is labeled Plan.
- `tasks` is Tasks.
- `history` is labeled Review and can contain day/week modes.
- `more` is More.
- `goals` remains a reachable secondary route and old deep link.

The final v3 **stored navigation order** contains exactly these five distinct IDs. This is not a restriction to put on the legacy `settings.save` wire schema: that command must continue to parse its original valid four-tab order for receipt replay and compatible fresh saves.

Keep the stored four-tab preference unchanged through Phases 2–5. In **Phase 6**, activate the five-tab representation only in a coordinated slice containing the shell, settings editor, stored-state migration/normalization, and tests. Do not return five-tab preferences to the old four-tab shell during an intermediate phase. Include reloading old open clients in the eventual rollout procedure.

The conversion removes `goals`, inserts `tasks` immediately after `schedule`, and inserts `history` immediately after `tasks`. Preserve retained destinations' relative order; use Today / Plan / Tasks / Review / More when no old preference exists. Before activation, fresh legacy saves retain four-tab storage. After activation, a fresh four-tab save is normalized to the five-tab stored representation **after** receipt fingerprinting and revision checking. A repeated accepted save returns through its existing receipt before normalization runs. A new five-tab command shape must not change parsing/serialization of the legacy branch; prefer a distinct `settings.saveV3` command if that is simpler to prove.

## 5. Migration and persistence design

### 5.1 Add a real stored-state boundary

Create `shared/state-schema.ts` for stored-state validation and `server/migrations.ts` for version detection and migration orchestration. Names are proposed new files; they do not exist merely because this plan lists them.

Keep command draft schemas separate from stored-record schemas. Stored records include `createdAt`, `updatedAt`, archival flags, provenance, and derived links that the owner must not be able to set through a generic edit command.

Validate in two layers:

1. Shape: record fields, valid dates, safe integers, optional values, supported enums, unique IDs, bounded text/arrays.
2. Invariants: references, one active interval, session/target compatibility, one live plan per date, valid main-task selection, no duplicate current task booking, valid goal references, legal partial chains, and consistent SQL/JSON revision.

Use existing domain rules as the source for compatibility. Do not make the first migration reject legitimate archived history simply because a new UI would not create it today. Conversely, do not automatically “repair” corrupt records by dropping unknown fields, closing work, or deleting links.

In particular, the current generic task-save path permits links to a parent goal even though automatic completion only acts on eligible leaves. Preserve those existing links during migration. The new Choose next step flow targets leaves; that new-flow restriction is not a reason to reject or rewrite older parent-goal associations.

### 5.2 Pure legacy transformation

Implement a pure `migrateLegacyState` transformation with deterministic results. It must not access a live database, call the network, use the current date to guess historical facts, or generate new random IDs each time it runs.

Transformations:

1. Copy existing records and relationships exactly unless a documented shape change requires otherwise.
2. Set the new schema version.
3. Preserve all supplied task estimates, including 30-minute values.
4. Leave new optional guidance, preferred dates, deadlines, and effort values absent.
5. Initialize only the implemented release's collections; do not pre-allocate R2 collections or automatically select every task scheduled today.
6. Preserve summaries, edited flags, journals, ledger balances, adjustments, envelopes, logs, reminders, and location records.
7. Preserve legacy template occurrence IDs in R1. In the R2 template migration, give entries deterministic stable IDs derived from template identity and original index, retaining the mapping to existing `tpl:<template>:<date>:<index>` blocks.
8. Preserve every legacy block's actual timestamps. For a currently running valid block, create a deterministic session referencing it, with its real original start and legacy provenance.
9. For completed legacy intervals, use an explicit legacy-time adapter for review rather than fabricating segmented sessions or pauses. Ensure the adapter excludes a legacy interval already represented by a session.
10. Do not infer exact task completion times from unrelated modification timestamps.
11. Preserve navigation in the Phase 2 draft migration. Include the deterministic five-tab conversion only in the Phase 6 activation slice, after shell/settings compatibility exists.
12. Validate the transformed state and invariants before returning it.

If legacy state contains multiple concurrently running blocks or broken relationships, fail the migration with a record-ID-based diagnostic. Do not choose a winner or expose private record text in logs. A repair requires a separately reviewed, concrete plan.

### 5.3 Explicit migration gate and repository opening

**Normal repository open, API startup, CLI snapshot/export/command, and MCP calls must never upgrade an existing database automatically.** A path inside this workspace is not evidence that its contents are disposable. In particular, do not open or migrate `.data/hermes.sqlite` to test the redesign. The CLI has that default, and `deploy/caminos-mcp.mjs` invokes the CLI without a `--db` argument; the bridge also retains a historical project-directory default. Test these behaviors with mocked process invocation and isolated paths only.

Implement version inspection before writable initialization, schema-changing PRAGMAs, or domain-state normalization. A current supported database can open normally. A supported older format may use an explicit read-only legacy reader for verification/export, or return a typed `MIGRATION_REQUIRED`; it cannot silently write the new format. An unsupported future format is refused. Read-only inspection must not create a missing database or reset `user_version`.

Introduce a narrow administrative CLI operation, proposed as `migrate --db ABSOLUTE_EXISTING_PATH --to-schema VERSION`. These are future interface requirements, not commands available today. The default operation is a read-only preflight/dry run returning schema/version/count diagnostics without private content. Applying additionally requires an explicit `--apply` and `--backup ABSOLUTE_NEW_BACKUP_PATH`. Require the literal database argument for this operation; environment/default paths do not count as opt-in. The ordinary MCP bridge must not offer this operation or inherit a global auto-migration flag.

The explicit apply sequence is:

1. Verify the selected existing path, supported source/target formats, release readiness, and writable-maintenance conditions. Do not broaden this into implicit owner authorization for production work.
2. Create a new verified private backup through the existing safe backup machinery. Capture source revision and state digest; do not overwrite a backup.
3. Take the immediate migration transaction and re-read version, revision, and digest. If another writer changed the source after backup/preflight, abort and obtain a fresh reviewed backup/preflight rather than migrating unbacked changes.
4. Run the deterministic transformation and validate the entire result.
5. Increment the global revision once, keeping SQL and JSON equal. Apply the Phase 6 navigation conversion only when the matching consumer bundle is ready.
6. Write JSON and version bookkeeping atomically. Preserve receipts, owner/auth records, weather cache, login attempts, and setup records.
7. Commit; any failure rolls back the migration. Repeating apply on the target format is a no-op, not another revision.
8. Ordinary subsequent opens validate/read without migration or a revision change. No authentication reset belongs to this migration.

Do not stamp `PRAGMA user_version = 1` on every constructor call. Use a monotonic SQL migration registry or an equivalent explicit version switch. Avoid a separate rewrite on every `snapshot()` call.

**Missing-file rule:** only deliberate server/owner initialization and the synthetic test harness may create a new database; snapshot, export, ordinary commands, backup/verification, and every MCP path must fail on a missing source without creating it; migration requires an existing source; scratch restore alone may create its explicitly selected new destination.

Encode this in an explicit repository open intent, for example `open-existing` (default) versus `initialize-if-missing`; read-only verification additionally uses SQLite read-only/file-must-exist options. Thread the intent through each caller rather than guessing from a filename or environment variable. Server startup/owner setup deliberately opts into initialization, while the CLI dispatches by operation before constructing a repository. MCP never inherits initialization permission even if an owner-setup CLI action exists. A missing-file error must create neither a parent directory nor SQLite/WAL/SHM files. Test every caller with a nonexistent synthetic path. Initialization of a missing file never authorizes migration of an existing file.

Explicitly created empty synthetic databases initialize directly in the current draft/test format; they do not need a legacy migration. User-created new databases use the supported release format through the established owner setup workflow.

**Freeze boundary:** Phases 2–5 evolve draft schemas together with real behavior on deliberately disposable fixtures. Record draft contract revisions and recreate/update those fixtures explicitly. Freeze a format when it first touches non-disposable owner data or is published as a supported release/export format, whichever comes first. Review that boundary at the R1 readiness gate, after sessions, plans, outcomes, navigation consumers, and migration tests agree. After freezing, change persisted meaning only through a new numbered migration. R2 may use a later version; Phase 2 does not lock its future shape.

### 5.4 Preserve retry fingerprints across upgrades

This is a compatibility requirement, not an optimization.

The current receipt fingerprint hashes the parsed envelope. Adding defaults to a legacy Zod command schema can change that parsed JSON even when a retry sends exactly the same original bytes. That can make an already accepted request fail as a conflicting duplicate.

Before changing a legacy command schema:

1. Preserve syntactic acceptance first: `commandEnvelopeSchema.parse` runs before receipt lookup. Keep the original strict four-tab `settings.save` branch, including omitted `navOrder`, valid on API and CLI paths. A command rejected by validation cannot reach its receipt.
2. Preserve their parsed wire representation, including property order relevant to the existing `JSON.stringify` fingerprint.
3. Apply new defaults/normalization after receipt identification, inside domain handling, where possible.
4. Prefer new command names for substantially changed contracts.
5. If protocol versioning is necessary, support legacy fingerprint computation explicitly; do not silently invalidate all old receipts.
6. Test a pre-migration applied command retried after migration with its original request ID and base revision. It must return the current snapshot without reapplying the mutation.
7. Test the same request ID with a different payload. It must remain rejected.

Capture representative legacy parsed envelopes/fingerprints before editing schemas. Specifically test a four-tab settings request accepted before navigation activation and replayed after activation with its old revision: parsing must succeed, the fingerprint must match, and the latest five-tab snapshot must return without applying the old preference again. Also test fresh valid four-tab saves before and after activation, five-tab saves only in the v3 path, and invalid mixed/duplicate tab arrays. Internal normalization occurs after receipt lookup and revision validation, never before hashing.

Do not prune receipts as part of this redesign. Do not move revision checking before receipt lookup: that would break legitimate retries of commands whose original revision is now old.

### 5.5 Backup, verification, and recovery

Extend `Repository.verifyBackup` beyond SQLite integrity and revision equality to identify supported state formats and validate appropriate invariants. Verification is read-only and must not upgrade the backup being verified.

Extend scratch-restore tests to cover:

- Legacy backup verified without mutation.
- Copy into a new destination only.
- Scratch restore preserves the copied format; upgrade requires the separate explicit migration apply targeting that new scratch path. Merely opening the copy must not upgrade it.
- Current-format backup verification and reopening.
- Existing destination refusal.
- Unsupported future format refusal.
- Migration failure leaves the original backup untouched.

The CLI currently has `export`, `backup`, `verify`, and `restore-scratch`. Use those operations with explicit synthetic paths during development. Never run `snapshot` or export against an implicit production database just to inspect the schema.

Exercise explicit migration preflight/apply entirely on synthetic legacy databases first. Test normal API/CLI/MCP opening as a non-migrating path. Any later owner-data migration needs explicit authorization for that selected database, and production additionally needs its authorized maintenance window. Do not include either in ordinary local validation commands.

## 6. Command contracts and transaction rules

### 6.1 Common rules

All new user mutations go through `CommandEnvelope { requestId, baseRevision, command }`. IDs are generated once per intent and retained through uncertain retries. Use strict schemas and the existing ID/text/time constraints.

The server is authoritative for:

- Current revision and trusted action time.
- Target existence and archival state.
- Goal leaf eligibility.
- One-running-session enforcement.
- Allowed outcomes and remaining-work creation.
- Booking conflicts/acknowledgements and fixed-commitment protection.
- Atomic change application.

Client validation helps the owner understand a problem but does not replace domain validation.

Every accepted domain command results in one repository transaction and one revision increment under the current architecture. Exact receipt replay does not create another revision. Multiple internal helper calls in a compound command must not recursively invoke `applyCommand` and increment revision several times.

### 6.2 Proposed command catalog

Names below are implementation targets. Keep them consistent across types, schemas, domain handlers, tests, and UI. If an existing command safely provides the same contract, extend it compatibly instead of adding a redundant command.

| Command | Required intent | Atomic effects / critical checks |
|---|---|---|
| `task.capture` | Title, optional note and explicitly supplied fields | Creates one open task with unknown estimate when omitted |
| `task.update` | Task ID and a bounded editable-field patch | Edits intent/guidance; cannot change sessions or outcome history |
| `task.resolve` | Task ID, complete or partial; remainder for partial | Records outcome, ends related session, resolves applicable current booking, creates linked remaining task if needed, syncs goal |
| `task.reopen` | Completed task ID when supported | Explicitly records reopening and restores open intent; preserves independent owner goal checks |
| `task.defer` | Task ID, preferred date or Later, explicit booking treatment | Updates intention; removes current selection/booking only as previewed; preserves history |
| `dayPlan.save` | Date, ordered selection, optional main task/window/reserve | Saves one plan after validating references and capacity inputs |
| `session.start` | Task/routine target and optional booking ID | Creates or starts the valid target session; rejects another running target |
| `session.pause` | Session ID | Closes the open interval; leaves task and booking outcome unchanged |
| `session.resume` | Session ID | Opens a new interval if no other target is running |
| `session.switch` | Expected running session and chosen target | Pauses the old target and starts/resumes the chosen one in one command |
| `session.stop` | Session ID | Ends recording while leaving task intent open; no invented completion |
| `task.plan` | Existing task or capture draft plus explicit proposed interval | Saves the task and booking together after preview; never leaves an orphan half-save |
| `plan.apply` | Date, explicit typed reviewed operations | Applies Reset/move/defer/selection changes atomically and records provenance |
| `template.applySelection` | Template/variant/date and selected stable entry IDs | Applies only intended entries, checks legacy/current application identity, records occurrence |
| `day.startWithCheckin` | Wake/day input plus optional valid supplied logs | Optional compound path for Start Day's supplied sleep/weight; all supplied records succeed together |
| `day.close` | Open day ID, optional writing, explicit active-work treatment | Closes day/session as reviewed, preserves unresolved task intent and journal boundaries |

Retain existing appointment resolution, reminders, health, money, weather, archive, and settings commands unless the accepted behavior requires an explicit extension. Do not expose a generic “execute arbitrary commands” batch endpoint; use a narrow plan-operation union.

This catalog covers both releases. R1 can extend `task.save`, `template.apply`, and existing day commands compatibly where the same behavior can be proven. R2 owns variant/subset template commands and expanded focus/history operations. The only extra settings command needed is a distinct v3 shape if dual parsing cannot preserve legacy serialization cleanly; retain `settings.save` for four-tab retries regardless.

### 6.3 Task capture, edit, complete, and partial

For capture:

1. Trim/validate title and note.
2. Accept unknown estimate; reject zero, NaN, negative, and invalid supplied values.
3. Apply the normal tag/labels defaults inside the new command contract.
4. Create the task without a day plan, booking, session, or completion record.
5. Return the usual snapshot; the UI offers Plan task as a subsequent choice.

For direct completion:

1. Resolve the live task.
2. If already complete from the same outcome, avoid duplicate outcome records.
3. Close/terminate an unfinished session for that target at the command time, including a paused session.
4. Resolve the current linked task booking where applicable without touching appointments.
5. Write one explicit completion outcome and update task status.
6. Recompute leaf/ancestor progress using existing goal rules.

For partial:

1. Require a positive supplied remaining estimate using the existing increment policy.
2. Reject creation of a second remaining task for an already resolved partial task.
3. End the session and record the partial outcome.
4. Create exactly one linked remaining task; preserve goal and useful guidance.
5. Leave scheduling of the remaining task optional. A supplied preferred date is not a booking.
6. If the owner explicitly chooses a time, include its validated placement in the same compound operation.
7. Keep the original partial work available in review without counting it as a completed leaf.

Archiving active/paused work must use the same session-termination helper and show the consequence in the UI. Do not permit a dangling running session on an archived task.

Reopening task intent must not silently undo an independently checked goal. Preserve the existing goal-check contract and recompute aggregate display from its authoritative fields. If task-derived automatic goal completion later becomes reversible, store its provenance and test that manual checks are not reversed with it; do not infer that provenance from the current `checked` boolean.

### 6.4 Sessions and legacy block commands

Refactor existing `block.start`, `block.resolve`, **`day.end`**, and relevant archive handling into adapters to the new session/outcome/closure helpers. All entry points must consult the same global-running-session selector.

Follow section 4.5's timing projection exactly: linked start still stamps the first `actualStart`, intervals own active/paused state, and terminal actions project `actualEnd`. Land compatible Home/summary/selectors before enabling Pause/Resume; otherwise a paused block's retained `actualStart` would still look active to legacy consumers.

**Legacy End Day bridge (required in Phase 3, before Pause ships):** keep the old `day.end` wire shape and parsed fingerprint valid so accepted receipts replay before new business checks. For a fresh legacy close with no unfinished session associated with that day, use the common close helper and preserve existing unresolved-work/writing behavior. If a running or paused session's latest interval belongs to the closing day, reject the old command atomically with `SESSION_CLOSE_CONFIRMATION_REQUIRED`; do not close the day or silently stop recording. AI 2 patches the existing End Day screen to show the exact session consequence and submit the new explicit `day.close` command, bound to the reviewed revision and expected session ID/state. Stage this minimal `day.close`/confirmation capability in Phase 3; the larger selected-first closure redesign still belongs to Phase 9. The same helper atomically ends the associated recording without inventing task completion, closes the day, and preserves unrelated paused work. Active unassociated recording must be clearly shown as continuing; it is not silently attached to or ended with this day. A changed session/revision requires refreshed review. No day-close path may leave an unfinished recording associated with an ended day.

Appointment resolution remains separate. Buffers, transitions, and focus windows never enter task resolution or session start.

`block.snooze` remains a reminder/review deferral. Label it “Remind me to review.” Do not change its meaning into Pause for compatibility. Session pause and reminder deferral can both exist without affecting each other's data.

If a start/resume collision occurs, return a typed conflict with the running session identity. The UI offers “Pause current and start this task” or return. It must not silently pause the other task merely because the owner opened task details.

### 6.5 Plan preview and `plan.apply`

Use a pure preview builder shared by UI/tests to derive proposed operations and explanatory before/after rows. Server execution revalidates the operation's meaning against the exact reviewed revision.

Recommended operation union:

- Set the day's selected task order/main task.
- Set or clear a task's preferred date.
- Supersede a flexible pending task placement with an explicit new interval.
- Defer/cancel a flexible pending placement while preserving the task.
- Change an explicitly chosen focus window, transition, or buffer.
- Change protected unplaced spare minutes.
- Pause a specifically identified current session if the preview says it will pause.
- Change a fixed appointment only through a distinct explicit appointment operation included and highlighted in the preview.

Validate all operations on a cloned candidate state first. Reject duplicate targets, contradictory operations, missing records, forbidden kinds, inconsistent session expectations, invalid times, and unexplained fixed-appointment changes. Commit only after the full candidate state passes.

For each move, preserve its previous record and linkage. For each deferral, distinguish “move intention to tomorrow” from “remove from today's selected priorities” and “cancel this booking.” The preview must state which effects are included.

Do not shorten a task's estimate merely to make a calendar slot fit. If the owner wants a shorter work session, change the planned interval and leave the estimate intact unless they separately edit it.

Avoid general Undo in the first implementation. A usable before/after preview and explicit future adjustment satisfy the requirement. If Undo is later offered, implement it as a new revision-checked compensating command, not deletion of history or restoration of an old entire snapshot.

### 6.6 Templates

Preview against the current snapshot and planning window before submission. Display:

- Selected variant and items.
- Item time, kind, duration, and optional first action.
- Existing appointments and overlapping entries.
- Additional reserved/estimated load and unknown values.
- Already applied entries that will not be duplicated.
- Any time invalid in the owner's zone on that date.

Store selection by stable template entry ID. Reordering template entries must not create new occurrences of previously applied work. Translate existing legacy-index identities in migration/application checks.

Keep application manual. Conflicting flexible suggestions can be moved or excluded before apply. Fixed appointment overlaps require visible explicit acknowledgement or correction. Do not add automatic daily template application.

### 6.7 Start and close day

Retain wake-only Start Day. If the UI collects optional sleep/weight records as part of one submission, use the narrow compound start command so the owner does not receive a partially saved check-in without a clear result. Existing individual health commands remain available separately.

After a successful start, offer Plan today with Skip. Canceling or skipping planning does not undo a successfully started day.

Close day rules:

1. Show the explicitly open day, including its original date if now past midnight.
2. List every unfinished session whose latest interval belongs to this day, including all paused sessions and any running session. Require an explicit stop-recording-and-close choice or return to work. Include the reviewed set of session IDs/states in the close command; do not assume only one paused session exists.
3. If the expected associated-session set/state or reviewed revision changed after preview, reject with a stale/conflict response. Unassociated running work is disclosed as continuing and is not silently attached to or stopped with this day.
4. If a paused session's latest interval is associated with this day, disclose that closing ends its recording session while leaving the task open. Do not end an unrelated session using session creation date or historical task selection. A later start of that task creates a new session/current interval context; it never resumes into the closed day.
5. Close the selected day at the server time. Do not invent a task completion or appointment attendance outcome.
6. Keep unresolved task intentions available. An ended pending task booking may be marked not completed under existing historical rules, but that must not complete/archive its task or mark appointments missed automatically.
7. Preserve future placements and unrelated days.
8. Save optional journal/reflection fields only when supplied; preserve existing writing otherwise.
9. Generate a factual summary only under the established creation/regeneration contract. Never overwrite an owner-edited summary during ordinary close/retry.
10. Repeated closing is safe and does not repeatedly regenerate summaries or create outcomes.

Tomorrow actions in this flow use preferred dates and explicit selection changes. They do not call `nextStart(... tomorrow ...)` to invent 09:00 bookings.

## 7. Shared calculations and selectors

### 7.1 Create named selectors rather than screen-specific copies

Add pure, independently testable helpers, preferably in focused shared modules once `selectors.ts` becomes unwieldy:

- `openTasks` / `tasksForView` for All, Today, Later.
- `dayPlanForDate`, `selectedTasksForDay`, and `mainTaskForDay`.
- `runningSession`, `unfinishedSessionForTarget`, and `recordedDuration`.
- `nextFixedCommitment` and `preparationDeadline`.
- `visibleAgendaEntries`, `entryConflicts`, and `actionableEntries`.
- `capacityForPlan` and `capacityForRemainingDay`.
- `previewPlanChange` and `previewTemplateApplication`.
- `factsForDay`, `factsForWeek`, and task-outcome grouping.

Pass state, timezone, and `now` explicitly. Do not call `new Date()` deep inside an otherwise pure preview/summary helper when a caller-provided time exists.

### 7.2 Task collection definitions

All means all live task intentions, including scheduled open tasks. Provide an explicit completed/archive view or filter where the existing UI requires it; do not silently lose those records.

Today includes selected tasks and other tasks intentionally associated with the current planning date through preferred date or a live booking. Distinguish “Selected priorities” from “Other work for today”; selection does not need to be fabricated for each booked task.

Later includes open tasks not selected/booked for the current planning date, with future preferred dates and undated backlog visible. A genuine overdue deadline gets its own factual label. An ordinary undated task is not automatically urgent or overdue.

Use one task ID across all views. Filter membership changes do not create/delete tasks. Search should include relevant first-action/done-when text once those fields exist, without exposing records outside the authenticated app.

### 7.3 Interval rules

Use half-open intervals `[start, end)`: an entry ending at 10:00 does not overlap one starting at 10:00. Convert to numeric instants for calculations; format in the appropriate zone only at the display boundary.

To measure occupied time:

1. Clip intervals to the planning window.
2. Discard empty clipped intervals.
3. Sort by start, then end.
4. Merge overlapping/touching intervals.
5. Sum the merged lengths.

Detect and report collisions separately from this union. Two overlapping one-hour appointments occupy their union of time, but still require a visible conflict label.

### 7.4 Capacity outputs and arithmetic

Return a structured result, not just one “free minutes” number:

- Planning-window minutes.
- Fixed-commitment union inside the window.
- Positioned transition/buffer occupation, excluding already counted overlaps.
- Protected unplaced spare minutes.
- Flexible reserved occupation, with nested tasks counted once.
- Estimated untimed selected demand.
- Count and IDs of unestimated selected tasks.
- Remaining/unallocated known capacity and over-capacity amount.
- Conflicts, out-of-window work, and invalid/missing input indicators.

Protect these distinctions:

1. The full-day summary and remaining-from-now summary use different windows and must be labeled accordingly.
2. Appointments outside the planning window remain visible but do not reduce that window's capacity.
3. A task wholly contained in its linked focus window consumes that reservation; do not also deduct its full estimate from the overall day.
4. Unplaced selected work is additional demand. If some of a task's estimate is explicitly represented by a reservation, deduct only the remaining estimated demand, never a negative amount.
5. A generic focus window reserves its full duration whether or not its task shortlist is full. Show unused window capacity locally, rather than counting it again as global free time.
6. Positioned buffers and unplaced protected spare are separate quantities. The UI must explain whether an edit is adding a new reserve or converting unplaced reserve into a positioned buffer. Conversion reduces the unplaced amount in the same command to prevent double reservation.
7. Unknown estimates remain visible. “2 hours unallocated, plus 2 unestimated tasks” is honest; “2 hours free” alone is not.
8. If a reservation intersects fixed time, report the collision and compute union-based occupation. Do not silently use a negative available-time label to hide it.
9. Do not clamp over-capacity to zero and lose the excess. Return both remaining capacity and overload magnitude for clear copy.

Synthetic arithmetic example: 09:00–17:00 is 480 minutes; 60 fixed + 30 transition + 120 protected spare leaves 270 minutes for flexible work. Selecting 150 minutes of estimated unplaced work leaves 120 known minutes unallocated. Adding an unknown task must not change that numeric subtotal, but must add an explicit unknown-demand warning.

Treat a precise booking interval and an estimate as different facts. A 60-minute booking for a task estimated at 90 minutes reserves 60; show the unreserved 30 only once when estimating the rest of the selected workload. Do not equate recorded work with completed estimated scope automatically.

Use this calculation contract for the known numeric subtotal:

1. `occupiedMinutes` is the length of the union of all live positioned commitments/reservations clipped to the window. Nested task placements add no occupation beyond their parent reservation.
2. For each selected task with a supplied estimate, calculate uniquely attributed reservation minutes from its exact placement or explicit focus allocation. Cap credit at the estimate. Do not credit the same allocation twice or infer credit from a shortlist membership.
3. `unplacedDemandMinutes` is the sum of `max(0, estimate - creditedReservationMinutes)` across those selected tasks. Track unestimated tasks separately.
4. `knownBalanceMinutes = windowMinutes - occupiedMinutes - protectedSpareMinutes - unplacedDemandMinutes`.
5. A positive balance is known unallocated capacity; a negative balance is known overload. In both cases, retain conflicts, unestimated demand, and out-of-window warnings beside the subtotal.

This intentionally keeps the arithmetic separate from conflict detection: overlapping reservations can have a plausible union total while still being impossible to honor together. When calculating the rest of the day, clip reservation credit as well as occupation to the remaining window and use an explicit owner-supplied remaining estimate when available. Otherwise label the unchanged estimate as such instead of automatically subtracting elapsed recording time.

### 7.5 Next commitment and extension suggestions

Find the next live fixed appointment using absolute time. Handle an appointment currently in progress separately from the next future one. Exclude cancelled/missed historical appointments from future protection as appropriate.

Use an explicit linked transition/preparation interval when available. Do not assume an arbitrary travel time based on appointment title or location text.

When offering an extension, show the proposed end and any collision with preparation/appointment time before saving. The default suggestion may stop at the protected boundary. The owner can explicitly adjust the plan; the app must not auto-extend into a fixed commitment or cascade other tasks into the evening.

### 7.6 Timezone and midnight handling

Audit every call to `dateKey`, `timeLabel`, `minuteOfDay`, and `localInstant`. Several existing callers rely on a default zone; new behavior must use `state.settings.timezone` or the plan's stored zone intentionally.

Use `addDays` for local calendar arithmetic. Do not implement Tomorrow as adding 86,400,000 milliseconds to an instant.

The current `localInstant` policy rejects nonexistent spring-forward times and chooses the earlier occurrence for ambiguous fall-back times. Preserve and document that policy unless explicit-offset selection is intentionally introduced. The UI must surface a skipped-time error and display the selected offset/zone where ambiguity matters.

The detailed timeline must remain understandable on 23-hour and 25-hour dates. A fixed 24-row display must not create impossible slots or make repeated hours indistinguishable. Either render actual zoned hour occurrences or explicitly label unavailable/repeated periods and map actions to unambiguous instants.

Keep interval-level open-day association separate from wall-clock date. After midnight, show that yesterday's day is still open. Do not move its existing intervals, summary, or journal into a new day. A newly opened interval receives the then-current context; a previously paused session does not force its new work into the original day. Calendar-day/week aggregation clips intervals at reporting boundaries and never groups all time by session creation date.

## 8. Client state, saves, and recovery

### 8.1 Preserve the existing command runner's protections

`App.tsx` currently owns the snapshot, revision acceptance, server-based clock, polling, and uncertain-save envelope. Extract this only when necessary to make new flows manageable. A proposed `src/hooks/useCommandRunner.ts` must retain behavior before screens depend on it.

Required runner states:

| State | UI behavior | Allowed recovery |
|---|---|---|
| Idle | Editing and actions available | Submit one intent |
| Saving | Preserve draft; disable duplicate submit | Wait for result |
| Saved | Accept monotonic snapshot; announce success | Continue |
| Validation/domain failure | Keep draft and inline reason | Correct and submit a new intent |
| Stale revision | Preserve draft; refresh current state | Rebuild/review affected preview before new submission |
| Unknown result | Keep exact original envelope in memory | Retry that envelope; do not create another request ID |
| Authentication lost | Stop mutation and show sign-in state | Reauthenticate, then reconcile the original outcome if still available |
| Offline/unreachable | Explain inability to save | Reconnect/retry; no persisted queue |

Distinguish a definitive server rejection from transport failure after the server may have committed. Network errors and ambiguous server failures must not be described as “nothing saved.”

### 8.2 Pin the reviewed revision

The current general `run(command)` obtains the latest snapshot revision at submission time. That is insufficient for a preview if polling has refreshed state since the owner reviewed it.

Add an explicit prepared-intent path, for example `runReviewed(command, reviewedRevision)`, that sends the exact revision used to build the visible preview. Do not silently swap in the newest revision. The server must reject a stale preview, and the client must refresh and show changed consequences before applying again.

Use this path for Reset today, template application, placement/conflict confirmation, day closure with active work, and any other action whose visible consequences depend on a specific snapshot.

Client draft IDs and prepared command IDs should be created once. Retrying an unknown result must not regenerate task, session, booking, or request IDs.

### 8.3 Snapshot and clock handling

Keep snapshots monotonic by revision; a slow poll response must not overwrite a newer mutation response. Do not replace active field drafts whenever a poll arrives. Mark a preview out of date and preserve the user's choices for rebase/review.

Keep server-derived time with the existing monotonic elapsed-time approach for display. Reconcile on fresh snapshots without writing a command every second. Use visibility/focus refresh to correct suspended-tab displays.

Do not infer that a timer stopped merely because the browser closed. A running interval remains a server record until an explicit transition. Display the recorded elapsed interval honestly and let the owner stop it; do not call all of it verified focus.

### 8.4 Retry and navigation details

An uncertain operation blocks conflicting fresh mutations until resolved. The message must identify the attempted action in neutral terms and offer the exact safe retry.

There is no dedicated read-only command-status endpoint in the current app. Implement “Retry save safely” using existing receipt replay. Do not show “Check save status” unless a real authenticated read-only status endpoint is intentionally added and tested. No such endpoint is required to complete this redesign.

Keep dirty drafts in component memory through recoverable errors. On navigation away from unsaved writing, use the existing unsaved-change pattern with a concrete consequence. Browser reload loses in-memory drafts; do not imply otherwise or add browser persistence as a shortcut.

### 8.5 Stable navigation

Use one route-to-label configuration for the phone bar and desktop rail. Preserve `#/home`, `#/schedule`, `#/tasks`, `#/history`, `#/goals`, and existing supporting-tool hashes. If new aliases such as `#/today`, `#/plan`, or `#/review` are accepted, resolve them to the same views rather than creating duplicate screen logic.

Preserve relevant date/filter context when moving from Plan to Task details and back. Prefer non-sensitive route parameters for date/tab; do not put journal text or task notes in URLs.

Direct `+ Task` must be reachable from Today and Tasks. Keep Add appointment in Plan and other record types in their supporting destinations or an Add other menu.

## 9. Component and file architecture

### 9.1 Suggested modules

Create these only as the relevant phase requires; do not generate empty scaffolding for all of them at once.

| Proposed file/module | Responsibility |
|---|---|
| `shared/state-schema.ts` | Current and supported legacy persisted-state shapes |
| `shared/sessions.ts` | Pure session predicates, duration calculations, transition helpers |
| `shared/planning.ts` | Plan operations, preview result shapes, containment/selection helpers |
| `shared/capacity.ts` | Interval clipping/union and capacity calculation |
| `shared/review.ts` | Day/week factual aggregation and legacy attribution adapters |
| `server/migrations.ts` | Version detection and deterministic state migration |
| `src/hooks/useCommandRunner.ts` | One authoritative command/uncertain-result state machine |
| `src/hooks/useServerClock.ts` | Existing server/monotonic display-time behavior if extracted |
| `src/components/AppNavigation.tsx` | Shared destination configuration and responsive navigation |
| `src/components/TaskRow.tsx` | One task's status, intent, estimate, and direct action |
| `src/components/FocusPanel.tsx` | Ready/running/paused/overrun rendering from shared selectors |
| `src/components/CommitmentRow.tsx` | Kind, timing, status, and visible conflict treatment |
| `src/components/CapacitySummary.tsx` | Known capacity, reserves, unknown estimates, overload |
| `src/components/SaveNotice.tsx` | Saving, stale, unknown outcome, and retry messaging |
| `src/components/EstimateField.tsx` | Unknown versus supplied valid estimate |
| `src/planning/QuickCapture.tsx` | Title/note capture, then optional planning |
| `src/planning/TaskDetails.tsx` | Guidance, estimate, intention, deadline, goal, notes |
| `src/planning/PlanToday.tsx` | Selection, order, main outcome, window and spare time |
| `src/planning/PlacementEditor.tsx` | Explicit date/time preview and conflict action |
| `src/planning/ResetToday.tsx` | Remaining priority and before/after plan preview |
| `src/planning/TemplatePreview.tsx` | Variant/subset/load/conflict preview |
| `src/planning/StartDay.tsx`, `EndDay.tsx` | Small explicit day lifecycle flows |
| `src/features/review-week.tsx` | Weekly review screen using shared facts |
| `src/redesign-v3.css` or focused feature styles | Token-based responsive redesign styles |

Keep existing exported entry points working during extraction. `src/planning.tsx` can temporarily re-export split components while call sites migrate. Avoid a simultaneous untested rewrite of all screens.

### 9.2 Component contracts

Components receive authoritative data plus explicit callbacks. They do not write SQLite, invent completion facts, or duplicate domain transitions.

- `FocusPanel` receives target/session/timing/next-commitment data and allowed actions. It does not derive running work from `actualStart` alone.
- `TaskRow` renders estimated/unknown time and selected/scheduled/paused state without removing the task from All.
- `CommitmentRow` always exposes fixed/flexible/buffer/transition kind in text. Buffers never receive a Done button.
- `CapacitySummary` consumes structured calculated output. It does not independently recompute minutes in JSX.
- `EstimateField` supports blank/unknown without coercing blank to `0` or `30`.
- `PlacementEditor` shows the actual proposed date, start, end, zone, and conflicts before its saving action.
- `SaveNotice` receives a real runner state and recovery callback. It never promises a save succeeded based on optimistic UI alone.

Use a common modal/sheet/full-screen-flow foundation with accessible focus handling. A Figma frame is a visual state, not a requirement for a separate React page or hardcoded state switch.

The proposed module table spans R1 and R2 and is not mandatory scaffolding. Start with existing modules and extract only as implemented code benefits. In R1, omit modules used solely for advanced allocations, variants, or detailed history until their R2 work begins.

### 9.3 CSS transition strategy

Inspect the actual CSS import graph before adding v3 styles. `main.tsx` currently imports base styles, feature styles, and `redesign-v2.css`; v2 feature files may be imported transitively.

1. Add semantic tokens to the existing token source.
2. Implement the new shell and shared primitives with a clear scoped class or component naming scheme.
3. Migrate one screen group at a time.
4. Remove or narrow obsolete v2 selectors when their screen is replaced.
5. Avoid broad `button`, `section`, or `.card` overrides that unexpectedly alter financial/settings forms.
6. Finish with one intentional style cascade. Do not leave v3 dependent on accidental last-import wins over numerous obsolete rules.

## 10. Screen-by-screen implementation requirements

### 10.1 S01–S04: Today and current work

Before-day state:

- Date and a Start day invitation.
- Direct task capture and existing task access still available.
- Next fixed commitment and compact weather when available.
- No fabricated priority or progress score when the day has no plan.

Active state:

- Current task title, first action, and done-when guidance when present.
- Recorded work time and planned finish as separate labeled values.
- Done, real Pause, and Change plan/Reset today as distinct actions.
- Next fixed appointment and explicit preparation boundary.
- Selected priorities below current work; completed selection remains understandable.
- Weather as a compact supporting line, not the dominant active-day panel.

Paused state:

- Show paused time without a live incrementing timer.
- Resume the chosen paused task, or start another selected task.
- If several sessions are paused, show the selected/main task with an explicit way to choose another; do not imply all are running.
- Keep Stop recording reachable without Start Day. Show a later resume's date context accurately; accumulated session lifetime time must not be presented as today's time.

Overrun state:

- Neutral “Past planned finish” copy.
- Actual recorded time remains independent of schedule overrun.
- Reset today is prominent; extension shows its effect on the next fixed commitment.
- Do not automatically reschedule other work or fill the evening.

Attention rules:

- Ordinary unscheduled tasks belong in Tasks, not Needs attention.
- Real conflicts, explicit financial expiry decisions, and genuine timed obligations may appear.
- Preserve optional access to goals, health, reminders, weather, and envelopes.

### 10.2 S05: Plan today

Build this as a short flow, usable without Start Day:

1. Choose/view a local date and optional planning window.
2. Show fixed commitments and protected transitions.
3. Choose the main outcome and optional supporting tasks.
4. Reorder priorities with keyboard/tap controls as well as drag if offered.
5. Choose protected spare time and optional small-plan mode.
6. Display known selected demand, unknown estimates, and remaining capacity.
7. Save choices without requiring exact bookings.

Allow task creation from the selector without losing current choices. Make unknown estimates editable inline or in details without requiring estimates for all tasks.

If choices exceed known capacity, explain the overload and offer remove/defer/adjust-window actions. Do not silently reduce estimates or reject a knowingly overcommitted plan solely because the app prefers a smaller day.

### 10.3 S06–S08: Tasks, capture, details

Tasks:

- Direct capture at the top.
- All / Today / Later filters with clear counts based on task IDs.
- Scheduled open tasks remain in All.
- Search includes title and useful guidance/notes.
- Start/Resume/Complete can be used without visiting Plan.
- Archived/completed records remain available through explicit filters or existing history access.

Capture:

- Persistent Title label and optional Note.
- Primary action Save task.
- No expanded nine-type selector or required planning form.
- Blank estimate remains absent in the saved task.
- On success, offer Plan task without automatically scheduling it.

Details:

- Title, first action, done-when guidance, estimate, preferred date, deadline, goal, labels, notes.
- Clearly distinguish preferred date from deadline and booking.
- Complete and Partial use task outcomes; remaining-time input is explicitly labeled “Remaining time.”
- Date-only deadline stays date-only when reopened/edited.
- If a task already has a pending placement, show it and edit that placement rather than creating a second one.

### 10.4 S09–S10: Plan agenda, timeline, and conflicts

Default to agenda. Keep the detailed timeline optional and preserve precise appointment editing.

Agenda rows show time/kind/status, with a readable overlap message and Review conflict action. A conflict is visible even if the timeline was never opened. Show untimed selected tasks as a separate section rather than fake all-day appointments.

Conflict review shows both entries, their fixed/flexible roles, proposed resolution, and explicit keep-overlap option where permitted. Conflict acknowledgement belongs to the current interval/reference combination; moving an entry invalidates an acknowledgement for the old collision.

Save & schedule must first reveal the placement editor even when the old scheduling checkbox was off. The final action labels and summary must match the interval that will be saved.

Timeline interaction needs click/tap and keyboard alternatives to drag. Drag is a preview until a visible consequence is accepted according to the flow's interaction contract. Cancelled pointer gestures must not save accidental moves.

Theme/focus windows show relevant task choices without forcing each to have a start time. Buffers and transitions show reservation intent and no completion control.

### 10.5 S11: Reset today

Entry is available beside current work. The flow should remain usable when there is no active session.

1. Show the next fixed commitment and preparation time.
2. Show actual remaining planning time from now, not the original full-day capacity.
3. Let the owner choose the remaining priority that matters most.
4. Offer explicit move/defer/keep choices for flexible work.
5. Show current versus proposed time, selection, and reserve changes.
6. List deferred tasks and their resulting preferred date/Later destination.
7. Show whether the current session will pause; do not hide that inside Apply changes.
8. Submit one reviewed-revision command.
9. After success, show the resulting Today state. Cancel leaves state unchanged.

The reset is an adjustment to the rest of the day, not automatic calendar optimization. Fixed appointments stay unchanged unless an explicit appointment edit is included. A failure of any operation saves none of the reset.

### 10.6 S12: Templates

Provide reusable light/regular choices without fabricating a variant for existing templates. Allow creating/editing variants explicitly.

Show a selectable item list, proposed times, load, and conflicts before apply. First actions and small checklists are optional template content. Existing applied entries are labeled and excluded from duplicate creation. Reapplying with an additional selected item may add that item only.

Keep the template editor distinct from “Apply to this day.” Editing the reusable template does not retroactively alter an already planned day.

### 10.7 S13: Start day

Keep wake time clear and optional check-in fields visually secondary. Wake-only submission must remain valid. Avoid making health logging look required through empty red fields or completion percentages.

Prevent a second open day. When yesterday is still open, provide the existing-day path instead of silently closing it or starting another one. Preserve reopen behavior allowed by current domain rules.

Offer Plan today after successful start, with Skip. The invitation is not a second mandatory onboarding flow.

### 10.8 S14: End day

Put today's chosen commitments first. Collapse the wider backlog behind a clearly labeled disclosure. Keep End day reachable in a persistent action area that does not cover content or the keyboard.

Offer Leave the rest for later. A pending task must not require a completion outcome merely to close the day. Avoid one dialog per unresolved task.

Support optional reflection and journal, preserving existing text. If work is running, show the exact stop-and-close consequence. If the owner returns to work, keep the day open.

Tomorrow on multiple tasks changes their intention without assigning identical 09:00 blocks. Opening tomorrow's Plan after closing is a navigation choice, not a hidden batch scheduling action.

### 10.9 S15–S16: Review day and week

Day review:

- Date navigation and the explicitly associated day record.
- Factual summary separated from personal journal.
- Optional reflection prompts stored separately if implemented as structured fields.
- Save writing without regenerating facts.
- Regenerate summary only through an explicit action that warns when replacing edited summary text.
- Never replace journal text during generation.

Weekly review:

- Define the displayed local date range visibly; do not assume the owner can infer week boundaries.
- Selected-priority outcomes, with missing plan data shown as unavailable.
- Planned reservations and recorded work presented as different measures.
- New outcome/session records plus clearly labeled legacy evidence where applicable.
- Explicit moves/deferrals and owner-entered reasons, without causal inference from health or money.
- A small owner-selected next adjustment or insight-to-task action.

The complete weekly learning view belongs to R2. Its underlying interval attribution and accurate R1 day facts cannot wait: use interval slices for calendar reporting, and label open-day records spanning midnight separately. Preserve existing history/review access in R1.

For insight-to-task, prefill a reviewable title/note draft and let the owner save it. Do not automatically create tasks when journal text changes or when a summary is generated.

Counts must deduplicate by task/outcome identity as appropriate. Superseded and cancelled bookings do not increase completed-work counts. Buffers, transitions, and focus windows are not tasks. Compare days only on available data; no denominator should silently assume every day was planned or fully recorded.

### 10.10 S17: Goals

Preserve the current hierarchy and equal-weight leaf progress. Add Choose next step from an eligible leaf, then create/link an ordinary task with optional first action and preferred day.

Offer Plan this step through the same task/day-plan commands. Do not create a parallel goal-work-item system. If a linked open task already exists, show it before offering another one.

Completing all relevant linked work must follow existing leaf rules. Parent goals aggregate descendants and are not double-counted as completed steps. Partial remaining work preserves its leaf relationship.

### 10.11 S18 and supporting screens

More groups Goals, health/practice, Money, reminders/weather, and settings in a readable list. Bring their fields, rows, buttons, notices, and dialogs into the new component system without changing unrelated domain rules.

Preserve:

- Steps totals, weight, workouts, sleep, food, and Rocket League practice.
- Personal and Company ledger separation, cash/account/earned/lost invariants, adjustments, explicit envelope decisions, and audit history.
- In-app reminder timing and dismissal; no suggestion of closed-app push alerts.
- Weather location management, attribution, stale state, and graceful fetch failure.
- Search, owner setup/login, password/session operations, settings, export, backup, and restore tools.

Optional energy filtering belongs in task selection as owner input. If no tasks are classified, say so or show all; do not hide the backlog or infer effort from private text.

### 10.12 Shared empty/error states

Implement real, reachable states for empty plans/tasks/history, unknown estimates, loading, saving, validation failure, stale revision, uncertain save, offline, and authentication loss.

An empty state should contain one useful action and factual copy. Do not seed sample records to make the app look populated. Keep error recovery near the affected form and preserve its draft where feasible.

## 11. Visual system, responsive behavior, and accessibility

### 11.1 Tokens and hierarchy

Start from the established palette:

| Token intent | Starting color |
|---|---|
| Background | `#0b0c0d` |
| Surface | `#191a1c` |
| Raised surface | `#222426` |
| Primary text | `#f4f2ed` |
| Muted text | `#a6aaae` |
| Border | `#34373a` |
| Accent gold | `#d8b978` |

Use named semantic tokens for focus, success, warning, danger, disabled, and overlays. Validate actual rendered combinations; do not assume every gold/text pairing is accessible because it matches a mockup.

Use approximately 16-pixel body text, 14-pixel secondary text, and 12-pixel text only for nonessential overlines. Titles and current-task headings scale with available width. Keep an 8-pixel spacing rhythm, comfortable 16–24-pixel panel padding, and restrained radii.

Reduce stacked decorative cards. Give current work one clear focus surface, selected priorities quiet rows, and supporting tools predictable lists. Gold indicates important action or selection, not every border and heading.

### 11.2 Responsive acceptance rules

| Width | Required behavior |
|---|---|
| 320 | No page-level horizontal scroll; five readable nav labels; forms and End day remain reachable |
| 390 | Primary phone reference; full daily loop and sheets fit natural browser viewport |
| 768 | Comfortable reading width; optional contextual columns only when they fit |
| 1440 | Left rail, bounded work area, useful contextual column; no oversized stretched forms |

Use content-driven layout rather than scaling a 390-pixel canvas. Verify long titles, multi-line notes, large amounts, date labels, empty lists, and error messages at every width.

Use safe-area padding where supported, dynamic viewport behavior for mobile dialogs, and sufficient bottom content padding for persistent actions/navigation. Test with the on-screen keyboard open. A sticky action must never cover the focused field, error text, last list row, or close action.

Preserve user zoom and text scaling. Test at 200% zoom and a narrow viewport; avoid fixed-height cards that clip expanded text.

### 11.3 Accessibility requirements

- Semantic headings and landmarks; one primary page heading.
- Persistent form labels and explicit optional/required cues.
- Minimum 44-pixel interactive target height for routine controls; keep compact icon controls equally usable.
- Visible keyboard focus and logical reading/tab order.
- Modal focus enters correctly, remains within a modal, and returns to the trigger on close.
- Escape behavior follows unsaved-change rules and does not discard text silently.
- Task/priority reorder has non-drag controls and announced resulting order.
- Color is paired with text/icon meaning for conflict, pause, completion, and overload.
- Saving/errors use restrained live announcements; do not announce a ticking timer every second.
- Timer text has an accessible static label; updates do not steal focus.
- Reduced-motion preference disables nonessential movement and smooth scrolling where needed.
- Contrast is measured for text, focus, borders that identify controls, and state indicators.
- Test at least representative flows with a screen reader where available; record limitations rather than claiming unperformed coverage.

Prefer existing accessible primitives or carefully improve `Modal`; do not introduce a large UI library solely to match Figma radii.

## 12. Ordered implementation phases

Each phase is a deliverable with concrete exit conditions. Validation accompanies implementation rather than waiting until the end. Do not claim a phase is complete because its Figma screen exists.

Phases describe dependency order, not an instruction to run four AIs simultaneously. Respect the owner's limit of **at most two active AI sessions**. The four prompts are four durable roles that take turns: AI 4 prepares the baseline alone; AI 1 + AI 2 build/verify contracts and core foundation; AI 2 + AI 3 complete planning integration; AI 3 + AI 4 finish closure/review/regressions. Park a role after its handoff to free a slot, and resume the necessary owner for backend fixes or coordinated activation. For Phase 6, AI 1 and AI 2 deliver the complete slice together: AI 2 temporarily owns `src/features/settings.tsx` navigation changes as well as the shell; AI 4 is parked. AI 2 also temporarily owns `src/planning.tsx` and its affected planning tests for Phase 1 friction fixes and Phase 3 legacy End Day/session compatibility, returning them to AI 3 at a tested commit before its main planning work starts. Record each bounded transfer and return in the coordination issue (file, scope, baseline/return commit); AI 4 later reviews Settings after a slot frees. If an R2 contract needs AI 1, swap it into a slot rather than starting a third worker. GitHub issues/PRs retain the state while a role is parked.

Apply the R1 subset of Phases 0–11 first, then the R2 extensions of Phases 4/5/8/9/10/11. R1's readiness gate does not wait for R2 allocations/variants/history; it does require all R1 behavior and migration/compatibility tests. Every requirement below inherits the explicit release boundary in section 3.4.

### Phase 0 — Re-establish the baseline and scope

**Dependencies:** an explicit later request to begin the desired coding work.

**Steps:**

1. Read project instructions and the sources in section 1.
2. Inspect `git status --short`; identify existing edits and preserve them.
3. Re-read touched source, package scripts, and test harness configuration.
4. Record which v3 behaviors/screens are in the requested implementation scope.
5. Run relevant baseline checks using the bundled runtime and synthetic data only.
6. Record pre-existing failures before attributing them to new work.
7. Confirm the local browser fixture and any ports before opening the app.

**Exit:** scope and baseline are documented; no production data/services were inspected or changed.

### Phase 1 — Remove immediate misleading interactions

**Files:** `src/planning.tsx`, `src/HomePage.tsx`, relevant shared predicates and affected tests. AI 2 owns the early planning/closure compatibility slice under the recorded temporary transfer; AI 1 handles domain predicates. AI 3 receives the tested planning files afterward.

**Steps:**

1. Make Save & schedule open an explicit placement preview before submitting.
2. Display overlap text and a review action in agenda rows.
3. Rename snooze to Remind me to review everywhere relevant, including accessible names.
4. Label partial choices Remaining time.
5. Remove duplicate Home actions; expose only truthful existing actions until sessions ship.
6. If this phase is delivered before preferred dates, replace Tomorrow auto-booking with an explicit date/time picker. If Phase 2 is included in the same slice, implement untimed Tomorrow directly and skip the temporary picker work.
7. Make End day reachable and collapse unrelated backlog without changing unresolved-task domain rules prematurely.

**Tests:** booking preview includes the saved interval; two Tomorrow actions cannot silently book the same default slot; agenda overlap is visible; snooze does not masquerade as Pause.

**Exit:** existing actions have visible, predictable consequences; no fake pause control ships.

### Phase 2 — Introduce versioned state and task intent

**Files:** types, command schemas, new stored-state schemas/migrations, repository, CLI, task/domain tests.

**Steps:**

1. Define the versioned state and separate stored-record validators.
2. Make task duration optional for new intent while preserving legacy values.
3. Add guidance, preferred date, tagged deadline, and outcome contracts.
4. Add only draft collections/contracts needed by currently implemented R1 behavior. Preserve four-tab navigation; its conversion belongs to Phase 6.
5. Implement pure migration infrastructure, read-only preflight, and explicitly opted-in apply on synthetic fixtures. Do not freeze the final sessions/plans/outcomes shape here or migrate existing default-path data.
6. Remove unconditional SQL version reset behavior.
7. Preserve legacy request fingerprints and receipts.
8. Extend export/backup verification/scratch restore for both supported formats.
9. Add title-only capture/update and explicit task-outcome helpers; keep legacy commands compatible.
10. Add field-level validation and truthful unknown-estimate formatting across existing readers before exposing new capture.

**Tests:** legacy/new/unsupported state, explicit opt-in and default-open refusal, migration idempotence and rollback, exact retry after migration, unchanged four-tab shell/settings behavior, unknown duration, estimates preserved, writing/money unchanged.

**Exit:** explicitly created/migrated synthetic fixtures support the current draft task shape. Existing non-disposable databases remain untouched; the later R1 release gate determines the supported frozen format.

### Phase 3 — Implement independent work sessions

**Files:** types/schemas/domain, `shared/sessions.ts`, repository integration tests, current-work consumers.

**Steps:**

1. Implement session start/pause/resume/stop/switch transitions and invariant validation.
2. Add/refine the draft migration's deterministic running-block session against implemented transitions, including interval attribution. Recreate disposable draft fixtures explicitly; use a new migration only if the affected format has already crossed the release/owner-data freeze boundary.
3. Adapt old block start/resolve/archive and `day.end` commands to shared helpers. Deliver the minimal explicit `day.close` contract and existing-screen confirmation bridge with AI 2 in this phase, before exposing Pause; retain legacy wire fingerprints/receipt replay (section 6.4).
4. Add direct start and complete/partial for unscheduled tasks.
5. Link each actual interval to its optional booking; a resume chooses the new valid booking or no booking without reassigning earlier intervals.
6. Implement interval-context day/calendar/week calculations, standalone Stop recording, recorded-time selectors, and legacy deduplication.
7. Handle active/paused task archive and explicit close-day session effects.
8. Keep linked `actualStart`/terminal `actualEnd` projections as specified in section 4.5. Update active-state and timing consumers, including minimal Home/summary compatibility, before exposing Pause/Resume. Do not wait for the full Phase 7 visual redesign.

**Tests:** one running target across tasks/routines, paused target allows another, switch atomicity, repeated transitions, partial links, no-Start-Day Stop, resume weeks later, per-interval week attribution, cross-midnight, block projections, legacy timing, negative-clock protection.

**Exit:** the app has one authoritative actual-work model; a task can start, pause, resume, and finish without a calendar block. Legacy End Day cannot leave associated recording unfinished; its explicit close bridge and interval booking attribution are tested.

### Phase 4 — Add day plans, capacity, and untimed deferral

**Files:** `shared/planning.ts`, `shared/capacity.ts`, selectors, types/schemas/domain, focused tests.

**Steps:**

1. Implement one plan per date, ordered selection, optional main task, window, and spare time.
2. Implement Tasks All/Today/Later predicates independent of `unscheduledTasks`.
3. Add preferred-date deferral and remove the 09:00 Tomorrow path.
4. Implement interval clipping/union, reserve accounting, unknown demand, and remaining-day capacity.
5. In R1 add fixed/flexible task/appointment behavior and unplaced spare reserve. In R2 add focus/buffer/transition discriminated rules and their controls.
6. Add R2 focus containment/allocation/reserve-conversion rules with their no-double-counting tests; do not add empty R2 collections as an R1 dependency.
7. Add timezone-explicit planning helpers and overnight-window handling.
8. Add R2 manual current-energy filter metadata and small-plan preference without inference or hard limits.

**Tests:** arithmetic matrix in section 13, plan reference/order validation, multiple Tomorrow tasks with no blocks, DST, timezone changes, fixed event outside window.

**Exit:** a realistic untimed day plan is representable and calculable before its main UI is built.

### Phase 5 — Implement reviewed atomic plan changes

**Files:** command types/schemas/domain, plan preview helpers, command runner, repository/server tests.

**Steps:**

1. Define the narrow plan-operation union and result/provenance shape.
2. Implement pure before/after preview generation.
3. Validate all operations and resulting state before commit.
4. Preserve moved/deferred records and fixed commitments by default. R1 uses existing history/link fields; R2 adds detailed `planChanges` rather than forcing the larger collection into R1.
5. Include explicit current-session pause only when reviewed.
6. Add a reviewed-revision submission path to the client runner.
7. Preserve exact uncertain-operation envelopes and component drafts.
8. Handle stale previews with refresh/review, not automatic resubmission.

**Tests:** invalid last operation rolls back all earlier operations; one revision; exact receipt replay; same ID/different payload refusal; two-tab stale preview; no automatic fixed-event move.

**Exit:** Reset today can rely on a safe transactional operation rather than a loop of API calls.

### Phase 6 — Build v3 shell and shared components

**Files:** `App.tsx`, `ui.tsx`, navigation/components, tokens and styles, settings navigation editor.

**Steps:**

1. Prepare five destination configuration, settings editor, and legacy route aliases together with the server's still-accepted legacy wire contract. Keep four-tab state until the entire activation slice passes.
2. Implement phone navigation and desktop rail using one source of truth.
3. Add direct + Task entry and preserve other add paths.
4. Build TaskRow, FocusPanel, CommitmentRow, CapacitySummary, EstimateField, and SaveNotice.
5. Improve modal/sheet focus and safe-area behavior.
6. Establish v3 tokens and remove conflicting styles as components migrate.
7. Implement actual loading/save/error states with no hardcoded fixture content.
8. Apply the five-tab stored-preference conversion in this coordinated Phase 6 slice, through the explicit migration/activation path. Verify old four-tab receipt replay and fresh saves before/after activation. Do not narrow the legacy `settings.save` parser to five entries, and do not migrate an existing owner database merely by opening the new build.

**Tests:** four-tab behavior before activation; converted/default/reordered five-tab navigation; old four-tab receipt replay; fresh legacy/v3 settings saves; old deep links; focus/keyboard; 320/390/768/1440 widths and long content.

**Exit:** new primitives support the daily loop and secondary screens without styling regressions.

### Phase 7 — Implement Today, Tasks, and Plan today

**Files:** Home, TaskList, split capture/details/PlanToday components and runner wiring.

**Steps:**

1. Implement title-only capture and details with progressive planning fields.
2. Implement All/Today/Later including scheduled open tasks.
3. Add direct start/resume/complete/partial actions.
4. Implement before-day, ready, active, paused, overrun, and completed-priority Today states.
5. Put current action, next fixed commitment, and selected priorities in that order.
6. Reduce weather and ordinary backlog prominence while retaining access.
7. Implement Plan today selection/reorder/window/reserve/capacity.
8. Add skippable Plan today invitation after Start Day.

**Tests:** capture without day/estimate, find after scheduling, no fake booking on start, paused timer stops, fixed-commitment context, untimed selection persists after reload.

**Exit:** the core daily loop works on real synthetic state and matches the intent of S01–S08.

### Phase 8 — Implement Plan, Reset, flexible windows, and templates

**Files:** schedule/placement/reset/template components, shared planning helpers and existing template editor.

**Steps:**

1. Complete agenda kind/conflict/untimed sections.
2. Implement explicit placement editor with collision review.
3. Preserve precise timeline editing and accessible non-drag alternatives, including DST dates.
4. In R2 implement focus/theme shortlist/allocations, positioned buffer, and transition controls; R1 exposes only implemented simple reservations/spare capacity.
5. Implement Reset today with before/after preview and reviewed revision.
6. In R1 preview the existing template's load/conflicts and retain its stable whole-template occurrence behavior. In R2 add stable entries across edits, variants, subsets, legacy mapping, application records, and their duplicate-safe tests.
7. Verify that deferral, shortening a slot, and editing estimates remain distinct actions.

**Tests:** atomic recovery journey, next-appointment protection, cancelled preview no write, template reapply/reorder, nested capacity, stale preview recovery.

**Exit:** interruption recovery and reusable planning work without implicit evening cascade or duplicate bookings.

### Phase 9 — Implement small day closure and factual review

**Files:** StartDay/EndDay, history/day/week review, summary aggregation, task outcomes.

**Steps:**

1. Finish compound Start Day submission for optional supplied logs while preserving wake-only mode.
2. Implement selected-first closure, collapsed backlog, optional writing, and reachable End day.
3. Surface stop-and-close consequences for active work and preserve cross-midnight context.
4. Preserve future work and unresolved task intentions.
5. Refactor factual summary generation to use explicit outcomes and session intervals.
6. Keep legacy attribution honest and owner-edited summaries protected.
7. Implement accurate R1 day facts/optional reflection and interval attribution; add the complete weekly learning view in R2.
8. Add R2 reviewable insight-to-task/future-plan actions.

**Tests:** close with backlog/no journal, active-session close, repeated close, midnight, edited summary/journal preservation, moved/cancelled count exclusion, unknown legacy facts.

**Exit:** closing is lightweight and review remains factual without destroying writing or overstating work quality.

### Phase 10 — Connect goals and finish supporting tools

**Files:** goal, health, money, reminder, weather, settings and shared feature components.

**Steps:**

1. Preserve all existing goal tools in R1; implement eligible goal leaf → existing/new task → Plan today as an R2 extension.
2. Prevent accidental duplicate next-step tasks and preserve leaf progress.
3. Apply new visual components to supporting screens.
4. Retain all health/practice forms and their existing validation.
5. Verify financial decision, adjustment, cancellation, and audit controls remain available and correct.
6. Preserve weather stale/failure states, reminder scope, search, authentication, and settings.
7. Remove obsolete v2 code/styles only after equivalent paths are verified.

**Tests:** goal partial/completion chains, ledger separation and repeat-safe outcomes, health totals, reminder/forecast failure, existing feature E2E paths.

**Exit:** the redesign has not simplified the primary loop by making existing tools disappear or changing their meanings.

### Phase 11 — Integrate, verify, and document

**Steps:**

1. Run the complete appropriate validation set in section 14 after targeted checks pass.
2. Exercise critical end-to-end journeys and failure recovery.
3. Capture synthetic browser screenshots at required widths and compare against Figma intent.
4. Check keyboard, touch alternatives, zoom, contrast, reduced motion, and representative screen-reader flows.
5. Exercise legacy migration, export, backup, verification, and scratch restore once more against the final schema.
6. Update product specification, roadmap implemented boxes, design QA, and operational documentation to match tested behavior.
7. Record any remaining limitations with specific effects and reproduction steps.
8. Present the local result and evidence. Treat production rollout as a separate authorized task.

9. At each release readiness gate, identify the release scope and supported format to freeze. R1 requires tested sessions/plans/outcomes and coordinated navigation consumers, but does not depend on R2 collections. No existing owner-data migration occurs without the explicit operation in section 5.3. Mark R2 work pending after R1; overall redesign completion requires both releases.

**Exit:** all in-scope behavior works, material failures are resolved, and evidence supports completion.

## 13. Detailed verification matrix

Every acceptance item below has an explicit release marker. **R1 gate:** all R1 matrix rows, date/API scenarios, browser journeys, and R1 checklist items in section 16.1 need recorded evidence; an environment-blocked required check remains pending. **R2 gate:** all R2 items plus the R1 regression set. Filter the Release column or `[R1]`/`[R2]` markers mechanically; phase order alone is not the release gate. R2 items do not block R1 and cannot be marked complete by R1 evidence.

Write meaningful behavior tests. Avoid tests that merely assert a copied constant or mirror JSX implementation. Reuse existing test infrastructure and extend relevant suites. Proposed new suite names are suggestions, not a requirement to fragment every helper into its own file.

### 13.1 Storage and migration

| ID | Release | Scenario | Required result |
|---|---|---|---|
| M01 | R1 | New empty database | Current format, empty new collections, normal initial revision |
| M02 | R1 | Valid legacy snapshot with 30-minute task | Estimate remains 30; optional new fields absent |
| M03 | R1 | Legacy summaries/journals/logs/ledgers | Values and relationships preserved byte-for-value where no transformation applies |
| M04 | R1 | Valid legacy active block | One deterministic linked session; original start retained; no duplicate elapsed counting |
| M05 | R1 | Legacy completed actual interval | Historical elapsed evidence retained; no invented pauses or verified-focus claim |
| M06 | R1 | Explicitly apply migration twice, then open normally | Same IDs/content after first upgrade; no second revision increment; open does not migrate |
| M07 | R1 | Migration validation fails | Original state and SQL version/revision remain unchanged |
| M08 | R1 | Unsupported newer format | Explicit safe refusal; no downgrade/write |
| M09 | R1 | Old receipt replay after migration | Current snapshot returned; mutation not repeated |
| M10 | R1 | Old request ID with changed payload | Duplicate conflict; state unchanged |
| M11 | R1 | SQL revision differs from JSON | Verification failure; no automatic guess |
| M12 | R1 | Read-only legacy backup verification | Identifies supported format without upgrading source |
| M13 | R1 | Scratch restore into existing path | Refused; no overwrite |
| M14 | R2 | Reordered legacy template entries after migration | Previously applied original entries remain recognized |
| M15 | R1 | Multiple legacy running blocks | Migration stops with safe IDs-only diagnostic; no invented resolution |
| M16 | R1 | Legacy task linked to a parent goal | Link retained; new leaf-step flow does not invalidate historical state |
| M17 | R1 | Normal API/CLI/MCP open on an old synthetic database | No schema/data/revision mutation; supported read-only path or `MIGRATION_REQUIRED` |
| M18 | R1 | Migration operation without literal absolute `--db`, `--apply`, or new backup target | Cannot apply; env/default database never serves as implicit opt-in |
| M19 | R1 | Source changes after migration preflight/backup | Apply aborts; old source is not upgraded against stale backup evidence |
| M20 | R1 | Phase 2–5 draft migration with old shell/settings | Stored four-tab preference unchanged; settings save works |
| M21 | R1 | Accepted four-tab settings receipt replay after Phase 6 | Legacy parsing and fingerprint succeed before normalization; latest five-tab snapshot returned |
| M22 | R1 | Fresh legacy settings command after activation | Accepted through legacy branch, normalized after receipt/revision checks; exactly one write |
| M23 | R1 | New empty inspection target or default MCP invocation | Does not create/upgrade a database; mocked invocation proves explicit scope requirements |
| M24 | R1 | Missing paths across snapshot/export/command/backup/verify/MCP/migration | Clear failure; no directory, database, WAL, or SHM created |
| M25 | R1 | Explicit server/owner initialization and test harness; scratch restore | Deliberate new destination succeeds; an existing legacy source still cannot migrate on open |

Suggested home: `tests/migrations.test.ts` and existing `server-operations.test.ts`.

### 13.2 Tasks, sessions, and goals

| ID | Release | Scenario | Required result |
|---|---|---|---|
| T01 | R1 | Title-only capture | Open task, no estimate, booking, session, or day prerequisite |
| T02 | R1 | Unknown versus zero estimate | Unknown accepted; zero/invalid supplied estimate rejected |
| T03 | R1 | Scheduled open task | Appears in All and appropriate date view |
| T04 | R1 | Start unscheduled task | Session created; blocks collection unchanged |
| T05 | R1 | Pause 10:10, resume 10:30 after 10:00 start | At 10:40 recorded time is 20 minutes, not 40 |
| T06 | R1 | Start B while A running | Rejected unless explicit switch; no side effects |
| T07 | R1 | Start B while A paused | Allowed; A remains paused |
| T08 | R1 | Resume A while B running | Explicit conflict; switch pauses B and resumes A atomically |
| T09 | R1 | Repeated pause/resume or exact retry | No duplicate interval/outcome/session |
| T10 | R1 | Complete paused/active target | Session ends correctly; one completion; no fictional paused time |
| T11 | R1 | Partial task with goal | Exactly one linked remainder; leaf not falsely complete |
| T12 | R1 | Partial unknown-estimate task | Owner-supplied remainder accepted; completed minutes not inferred |
| T13 | R1 | Archive active task | Recording ends through explicit helper; no dangling active interval |
| T14 | R1 | Actionable routine timing | Participates in global single-running rule; no fake task required on start |
| T15 | R1 | Attempt start on appointment | Rejected by domain |
| T16 | R1 | Browser suspended/reopened | Server interval remains truthful; no timer-based completion |
| T17 | R1 | Edit task after completion | Original outcome date unchanged |
| T18 | R1 | Goal leaf with several linked open tasks | Progress follows existing completion rule; no parent/child double count |
| T19 | R1 | Backward server time | No negative interval persisted; recoverable error |
| T20 | R1 | No Start Day; pause Monday then resume two weeks later | Each interval belongs to its actual reporting period; pause gap adds zero |
| T21 | R1 | No Start Day; Stop recording | Session ends, task stays open, no day/block fabricated |
| T22 | R1 | Unassociated work crosses midnight | Calendar totals split at midnight; one actual continuous interval retained |
| T23 | R1 | Start Day during running unassociated work | Atomic adjacent interval split at command time, no backdating to wake time |
| T24 | R1 | Linked start/pause/resume/stop | First `actualStart` retained; pause closes interval only; active/paused state uses sessions; terminal `actualEnd` follows section 4.5 |
| T25 | R1 | Close a day with unrelated old paused work | Unrelated session remains untouched; no session-origin date attribution |
| T26 | R2 | Attempt start on buffer/transition/focus window | Rejected by domain |
| T27 | R1 | Pause under booking A, resume same task under B | Old interval keeps A; new interval uses B; each booking's actual projection and recorded total use its own slices |
| T28 | R1 | Resume without booking or with another task's booking | Omitted booking stays unscheduled; mismatched supplied booking rejected atomically |
| T29 | R1 | Start Day splits a booked running interval | Both adjacent segments retain the same booking; only day context changes |

Suggested home: focused session tests plus existing domain/adversarial tests.

### 13.3 Planning and capacity

| ID | Release | Scenario | Required result |
|---|---|---|---|
| P01 | R1 | Select task for Today without time | Selection saved; no booking |
| P02 | R1 | Defer two tasks to Tomorrow | Two preferred dates/intent changes; no overlapping 09:00 blocks |
| P03 | R1 | Duplicate selected IDs or invalid main ID | Validation failure; no partial plan save |
| P04 | R1 | Overlapping fixed appointments 09:00–10:00 and 09:30–10:30 | 90 occupied minutes and a visible conflict, not 120 occupied minutes |
| P05 | R1 | Appointment 08:00–10:00, window 09:00–17:00 | Only 60 appointment minutes deducted |
| P06 | R1 | Appointment entirely outside window | Zero capacity deduction; appointment remains visible |
| P07 | R2 | Focus 09:00–11:00 containing task 09:30–10:00 | 120 reserved minutes, not 150 |
| P08 | R2 | Task placement partly outside linked focus window | Invalid containment or explicit separate placement; no silent double-count correction |
| P09 | R1 | Unknown selected task estimate | Numeric known subtotal plus explicit unknown-demand count |
| P10 | R1 | No planning window | Capacity unavailable; no assumed eight-hour day |
| P11 | R2 | Convert 30 unplaced spare minutes to a positioned buffer | Total protected reserve unchanged |
| P12 | R2 | Buffer overlaps appointment | Union-based occupation plus conflict label |
| P13 | R2 | R2 480-minute synthetic example with transition from section 7 | 270 usable; 150 demand; 120 known unallocated |
| P14 | R1 | Remaining-day reset after 14:00 | Uses remaining interval, not full-day capacity |
| P15 | R1 | Known demand exceeds capacity | Excess visible; no silent zero clamp hiding overload |
| P16 | R1 | Shorten planned slot only | Task estimate remains unchanged |
| P17 | R1 | Cancel Reset preview | No mutation, revision, or history entry |
| P18 | R1 | Invalid final operation in reset | All operations roll back; no session paused accidentally |
| P19 | R1 | Fixed appointment absent from explicit edit list | Remains byte-for-value unchanged in reset |
| P20 | R1 | Same reviewed command retried after response loss | One application and one revision |
| P21 | R2 | Untimed task explicitly allocated inside a focus reservation | Allocated known minutes credited once; no exact task start required |
| P22 | R2 | Task appears only in a focus shortlist | No reservation credit inferred until explicit allocation/placement |
| P23 | R1 | R1 480-minute window, 60 fixed, 120 unplaced reserve, 150 known demand | 150 known unallocated minutes; adding an unknown task changes warning count only |

### 13.4 Date/time scenarios

Test at least the configured owner zone and a substantially different IANA zone. Use synthetic fixed clocks.

- [R1] A normal day and a cross-midnight planning window.
- [R1] Open day from yesterday while the wall-clock date is today.
- [R1] Session crossing midnight, then pause and close.
- [R1] America/New_York on March 8, 2026: a nonexistent 02:30 must be rejected, not silently shifted.
- [R1] America/New_York on November 1, 2026: ambiguous 01:30 follows the documented earlier-occurrence policy; repeated-hour timeline remains intelligible.
- [R1] Local Tomorrow across both DST boundaries.
- [R1] Settings timezone changes while absolute bookings and a previously saved plan exist.
- [R1] Date-only deadline remains the same date rather than becoming midnight UTC.
- [R1] Timed deadline retains its exact instant and displays its zone.
- [R1] Adjacent intervals with matching end/start do not conflict.

### 13.5 Templates, day closure, and review

| ID | Release | Scenario | Required result |
|---|---|---|---|
| R01 | R2 | Apply selected template subset | Only selected non-applied entries created |
| R02 | R2 | Retry/reapply same selection | No duplicate task/block/application |
| R03 | R2 | Reorder template then apply again | Stable entry identity prevents old item duplication |
| R04 | R2 | Add one selected item on second apply | Exactly that new occurrence added |
| R05 | R1 | Template collides with fixed event | Preview exposes collision; owner resolves/acknowledges before apply |
| R06 | R1 | Wake-only Start Day | Valid; optional planning can be skipped |
| R07 | R1 | Optional check-in log invalid in compound start | No partial day/log save |
| R08 | R1 | End day with many backlog tasks/no journal | Day closes; backlog stays open/searchable |
| R09 | R1 | Close while session runs | Explicit stop-and-close required; stop timestamp is trusted server time |
| R10 | R1 | Session changes after close preview | Stale/conflict response; wrong session is not stopped |
| R11 | R1 | Repeated close | No duplicate outcomes, writing replacement, or new closing timestamp |
| R12 | R1 | Edited summary then ordinary save/close | Owner summary preserved |
| R13 | R1 | Explicit regenerate edited summary | Replacement warning/action; journal unchanged |
| R14 | R1 | Moved/cancelled/partial history | No inflated completed-task count |
| R15 | R2 | Buffer/focus/transition in week | Reserved time facts only; excluded from task outcomes |
| R16 | R1 | Legacy completion time unknown | No invented precise completion day |
| R17 | R2 | Insight to task | Reviewable draft; task created only on explicit save |
| R18 | R1 | Health/mood differs on a disrupted day | No automatically asserted cause of disruption |
| R19 | R1 | Fresh legacy `day.end` with an associated running/paused session | Typed confirmation error; day, session, writing, and revision unchanged |
| R20 | R1 | Legacy `day.end` without an associated unfinished session; accepted legacy receipt replay | Common close behavior succeeds; accepted replay never reapplies or fails new state checks |
| R21 | R1 | Existing End Day screen before Phase 9 confirms `day.close` | Expected session/revision checked; recording and day close atomically, no fake completion; stale confirmation does nothing |
| R22 | R1 | Whole-template R1 preview/retry | Conflict/load preview uses actual whole template; legacy indexed occurrences remain duplicate-safe; structural edits require a new template until R2 |

### 13.6 API, concurrency, and uncertainty

Use repository tests and HTTP integration tests, not only mocked component callbacks:

1. [R1] Two clients use revision N; first succeeds, second fails stale with no side effect.
2. [R1] A preview made at N is submitted after a poll accepts N+1; the runner still submits N and asks for review after rejection.
3. [R1] The server commits and the response is lost. Retry uses the same envelope and returns the latest snapshot without duplicate records.
4. [R1] A slow snapshot response cannot replace a newer snapshot.
5. [R1] A compound task-and-booking validation failure does not save only the task or only the block.
6. [R1] A duplicate request ID with a changed body is rejected.
7. [R1] Invalid JSON/ambiguous success response does not produce a false Saved message.
8. [R1] Expired authentication clears access appropriately; no personal payload enters logs or browser storage.
9. [R1] CSRF/origin requirements apply to every new mutation path.
10. [R1] Responses retain no-store headers and same-origin credential behavior.

### 13.7 Browser journeys

Use a fresh synthetic fixture or a deliberate isolated reset for each independent scenario. Avoid hidden test ordering dependencies.

**[R1] Journey A — Small ordinary day:** capture title-only task → choose it as main priority → start without booking → pause → resume → complete → close with no journal → review factual result.

**[R1] Journey B — Disrupted plan:** fixed appointment + flexible work + reserve → start task → overrun → Reset today → preserve appointment → defer two tasks untimed → apply once → close with unfinished work.

**[R1] Journey C — Safe retry:** submit reset → simulate lost response after commit → show unknown result → retry exact envelope → verify one revision/application and no duplicate blocks.

**[R1] Journey D — Two tabs:** prepare template/reset preview → change plan from another tab → stale result → preserve choices → refreshed review → explicit new apply.

**[R1] Journey E1 — Existing linked goal and partial work:** start an existing goal-linked task → partial with remaining time → schedule or select remainder → complete → verify existing leaf progress and review history.

**[R2] Journey E2 — Enhanced goal next step:** choose eligible leaf → create/link task through the new next-step flow → Plan today → partial/remainder → complete → verify no duplicated task or leaf count.

**[R1] Journey F — Writing:** edit summary/journal → navigate with unsaved draft → save → close/reopen review → regenerate only after explicit warning → journal stays intact.

**[R1] Journey G — Supporting tools:** enter synthetic health/practice record → exercise both ledgers and an explicit envelope decision → view audit → weather failure/stale display → reminder dismissal → settings navigation.

**[R1] Journey H — Narrow screen and keyboard:** run capture, Plan today, Reset, and End day at 320 pixels; then keyboard-only at desktop; test zoom and a mobile keyboard with persistent actions.

## 14. Commands and isolated test operation

### 14.1 Runtime setup

Use the bundled Node and pnpm fallback from project instructions. In a shell session for this workspace:

```bash
export PATH="/home/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/home/andre/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/fallback:$PATH"
```

Set the tool working directory to `/home/andre/Desktop/camino`. Do not repurpose `HOME`, `home`, or `CODEX_HOME` as task variables. Do not read `.env` or production database contents to discover test configuration.

For another AI tool/host, translate the mechanics: use the checked-out Caminos root, a supported Node 24+ runtime, the locked pnpm dependency set, and its native patch/edit facility. Do not assume the workstation's Codex cache paths exist elsewhere. Keep the same commands, isolated-data rules, explicit migration gate, and diff review; document the actual runtime/tool used. On this workstation `AGENTS.md` still requires `apply_patch` and the bundled runtime.

Inspect package scripts before assuming they are unchanged. At plan creation they are:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
```

`pnpm build` includes TypeScript checking and Vite output. Run targeted tests while developing; run the full relevant set once after integration. Do not repeat broad successful checks without a new change or unresolved concern.

### 14.2 Targeted verification examples

The new suite names below apply only after those files exist:

```bash
pnpm exec vitest run tests/migrations.test.ts
pnpm exec vitest run tests/domain.test.ts tests/domain-adversarial.test.ts
pnpm exec vitest run tests/server.test.ts tests/server-operations.test.ts tests/server-cli.test.ts
```

Add session/capacity/preview suites to targeted runs as they are created. Test both direct pure behavior and repository/HTTP transaction behavior where the risk depends on persistence or concurrency.

For UI changes, build before using the current browser harness because it serves `dist`:

```bash
pnpm build
pnpm exec playwright test tests/e2e/planning.spec.ts --project=chromium
```

Run affected new browser suites and both configured Chromium/WebKit projects during integration when the environment supports them. If a browser dependency is unavailable, record the limitation and the checks that did run; do not report the absent project as passing.

Prompt 4 reproduced the reported WebKit launch failure on this machine: `libevent-2.1.so.7` is missing. The browser failed before application assertions; coverage remains pending. See `docs/redesign-v3/review-handoff.md` for the exact command and passing Chromium checks. Run WebKit on a compatible authorized host/CI; do not suppress its project, install system packages, or label the whole browser matrix green without appropriate authorization and evidence.

### 14.3 Synthetic harness improvements

The current harness creates a fresh temporary SQLite database and seeds synthetic records. Preserve that isolation. Extend it to select explicit scenarios and a controllable synthetic clock so pause/resume, midnight, overrun, and DST behavior can be tested without waiting in real time.

The harness currently has a fixed command clock while the browser display extrapolates server time. Timer tests need deliberate server-clock advancement; waiting in the browser alone is not a valid assertion about persisted interval duration.

Prompt 4 provides `tests/support/browser-harness.ts`: `createBrowserHarness(config, staticDir?)` returns an isolated app, `advanceClock(milliseconds)`, and async `close()`. Control the clock from test code, then fetch a fresh snapshot; the callback accepts positive whole milliseconds up to 31 days per advance. No HTTP clock/reset endpoint is registered, even in the test server. Use `close()` in test cleanup so SQLite closes before its temporary directory is removed. Fresh `daily` and `empty` scenarios are available; a custom initial ISO clock requires `empty` to avoid misleading fixed daily seed dates. Do not add test reset routes to production `server/app.ts`.

The Prompt 4 setup batch makes Playwright start a fresh harness with reuse disabled. `CAMINOS_TEST_PORT` selects an isolated loopback port (default 5197); each active worker chooses a distinct free port. An occupied port must fail without stopping or reusing the other process. Each harness creates and removes its own temporary synthetic database; no database-path override is accepted. Harness-only clock control permits deliberate forward advancement; it is absent from production routes.

### 14.4 Backup and restore checks

Use temporary synthetic database paths supplied explicitly through `--db`. Keep the app's existing live defaults out of validation commands.

The test suite should create synthetic legacy/current databases, call the CLI with explicit paths, and assert new-file-only backup/restore behavior. Prefer tests to manually exporting a state dump into conversational output. The exported synthetic file must include all new domain collections and exclude authentication credentials/session tokens.

### 14.5 Evidence to record

For each completed phase, record:

- Source files changed and behavior delivered.
- Commands actually run, result, and any environment limitation.
- Meaningful synthetic scenarios covered.
- Screenshot artifact paths for UI work.
- Migration/retry compatibility evidence when affected.
- Remaining limitations and why they do not satisfy any still-pending requirement.

Do not claim screen-reader, touch-device, production migration, or deployment verification based only on unit tests or Figma QA.

## 15. Release preparation, recovery, and documentation

### 15.1 Keep local implementation reviewable

Use coherent changes around complete behaviors: storage/contracts, sessions, planning, atomic recovery, core UI, review, and supporting screens. Keep the application buildable at each delivered boundary. Avoid a giant style-only diff mixed with financial-domain changes.

Do not commit or push merely because this skill describes implementation. Follow the user's actual version-control request and project practices. Preserve unrelated uncommitted documentation and artifacts.

### 15.2 Document the final implementation

Update these when the corresponding behavior actually ships in the local source:

- `CAMINOS-DESIGN-AND-IMPLEMENTATION.md`: revised navigation, task/session distinction, planning, day closure, and review contracts.
- `FUTURE-IMPLEMENTATION.md`: check only implemented and verified items; keep integrations deferred.
- `design-qa.md`: real browser comparison, responsive/accessibility results, known limits, and v3 frame mapping.
- `artifacts/redesign-v3/README.md`: link implementation evidence without claiming the original prototype became stateful.
- Relevant operations documentation: schema version, supported backup formats, migration behavior, and downgrade limitations.
- This file: record material departures from the proposed contracts so it remains a useful guide.

### 15.3 Prepare a concrete later deployment plan

Local completion does not authorize production rollout. If deployment is later requested:

1. Identify the actual Caminos service, database, runtime, and current version without exposing secrets or crossing into Pirata.
2. Establish a maintenance strategy that prevents an old process from writing the newly migrated JSON shape. Do not run incompatible old/new writers concurrently.
3. Create and verify a new private backup through the established operations path.
4. Verify explicit migration preflight/apply on an authorized isolated copy without loading personal contents into the model context. Ordinary open must leave the source/copy's format unchanged.
5. Deploy the matching tested server, shell, and settings bundle, then run the separately authorized explicit migration operation with absolute target, target version, apply opt-in, and new verified backup. Reload old clients before allowing new-format interactive writes. Never use normal startup or the MCP bridge as a migration trigger.
6. Check authentication, health endpoint, owner access, schema/revision consistency, and essential workflows without exposing private data.
7. Retain the previous executable and verified backup according to the owner's operational policy.

Do not promise that running old code against new-format state is a safe rollback. After migration, recovery may require the prior code plus the pre-migration database backup. Restoring that backup can discard later writes; the owner must understand the concrete consequence before an authorized production restore. Prefer a tested forward fix when it can preserve subsequent records.

### 15.4 Avoid false completion

Do not mark application features complete when only types, schema, mockups, static components, or happy-path tests exist. Completion requires domain behavior, persistence, reachable UI, recovery states, appropriate tests, and documentation for the actual implementation scope.

Do not claim the app is easier to use as a measured fact without owner trials. Describe the delivered interaction changes and the evidence: fewer required capture fields, visible booking consequences, direct task actions, and a smaller closing flow. Capture effort, recovery effort, and ease of returning after an interrupted day are useful evaluation questions; calendar fullness is not the success metric.

## 16. Completion checklist and session handoff

### 16.1 Implementation completion checklist

- [ ] [R1] Current and legacy synthetic states validate and migrate without losing estimates, timestamps, relationships, writing, money, or history.
- [ ] [R1] Old receipt replay remains compatible after migration.
- [ ] [R1] Legacy four-tab parsing remains valid; five-tab stored navigation activates only with the Phase 6 shell/settings slice.
- [ ] [R1] Existing databases cannot migrate on normal API/CLI/MCP open; apply requires explicit path, opt-in, and backup.
- [ ] [R1] Draft formats were not frozen in Phase 2; the supported release format was frozen at the documented owner-data/release boundary.
- [ ] [R1] Title-only capture stores an unknown estimate and requires no started day.
- [ ] [R1] All includes scheduled open tasks; Today/Later semantics are clear.
- [ ] [R1] Preferred date, actual deadline, booking, and recorded work are distinct.
- [ ] [R1] Tomorrow never silently creates a 09:00 booking.
- [ ] [R1] Unscheduled tasks can start, pause, resume, complete, and partially complete.
- [ ] [R1] Exactly one interval can run globally, including routines.
- [ ] [R1] Paused intervals do not accumulate work time or block another task.
- [ ] [R1] No-day Stop works; later resumes are attributed per interval and calendar reporting slices at date/week boundaries.
- [ ] [R1] Legacy block start/end projections and session-backed consumer behavior match section 4.5.
- [ ] [R1] Partial work creates exactly one linked remaining task with preserved goal meaning.
- [ ] [R1] Day plans support ordered priorities and optional untimed selection.
- [ ] [R1] Capacity uses clipped interval unions, protects spare time, and exposes unknown estimates.
- [ ] [R2] Nested focus-window work and reserve conversion do not double-count capacity.
- [ ] [R1] Default agenda shows overlap text and a usable resolution action.
- [ ] [R1] Every scheduling save shows its actual date/time consequences first.
- [ ] [R1] Reset applies one reviewed atomic command with fixed commitments protected.
- [ ] [R1] Stale previews require updated review; unknown saves retry the exact envelope.
- [ ] [R1] Whole-template R1 application previews load/conflicts and remains duplicate-safe using existing indexed occurrences.
- [ ] [R2] Template subsets/variants and stable entry/application identities remain duplicate-safe after reorder/retry.
- [ ] [R1] Start Day remains optional for tasks; check-ins remain optional; Plan today can be skipped.
- [ ] [R1] End Day is reachable, selected-first, optional-writing, and compatible with unresolved work and midnight.
- [ ] [R1] Closing running/paused work has an explicit consequence; legacy `day.end` is adapted in Phase 3 and no associated recording outlives its closed day.
- [ ] [R1] Per-interval bookings survive pause/rebook/resume; missing paths follow the explicit database-creation policy.
- [ ] [R1] Factual summaries and personal journals remain separate; edited summaries require explicit regeneration.
- [ ] [R1] R1 day facts deduplicate moved/cancelled records and distinguish legacy/unknown evidence.
- [ ] [R2] R2 weekly learning, buffer/focus facts, and reviewable insight-to-task actions work.
- [ ] [R2] Goal next steps use ordinary tasks and preserve leaf-only progress.
- [ ] [R2] Optional energy/small-plan controls remain owner-directed.
- [ ] [R1] Existing health, practice, money, reminders, weather, search, auth, and settings still work.
- [ ] [R1] Five-destination phone/desktop navigation and old route access work.
- [ ] [R1] No personal browser persistence, new public endpoint, or production data fixture was introduced.
- [ ] [R1] Required widths, long content, keyboard, zoom, contrast, reduced motion, and reachable sticky actions were checked.
- [ ] [R1] Appropriate tests/build/lint completed; limitations are recorded accurately.
- [ ] [R1] Roadmap/specification/design QA reflect actual source behavior.
- [ ] [R1] Production systems remain untouched unless separately authorized.
- [ ] [R1] R1 and R2 are reported separately; completing R1 has not falsely closed R2 scope.
- [ ] [R1] No more than two AI sessions ran concurrently; GitHub handoffs match the phase dependencies.

### 16.2 Handoff after each coding session

Leave a concise factual handoff in the normal project work record or response:

1. Current phase and completed behavior.
2. Current schema/command compatibility status.
3. Files changed, including any new modules.
4. Tests and browser scenarios actually run.
5. Known issues with reproduction steps and affected invariants.
6. The next concrete implementation step and its prerequisites.
7. Any divergence from this plan and the evidence behind it.

Do not repeat a completed migration or recreate existing artifacts when resuming. Inspect source and recorded evidence, then continue from the first unmet requirement. Keep the user's latest scope authoritative throughout.
