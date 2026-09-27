# Caminos — redesign schema, v3

Design blueprint • September 27, 2026 • Proposed design, not implemented

Reviewed revision: incorporates the supplied independent AI review of the implementation plan. The final visual direction remains; delivery, migration, compatibility, and interval attribution are clarified below. See [review resolutions](artifacts/redesign-v3/review-resolution.md).

## Purpose and order of work

This is the schema for the redesigned product: its information architecture, screens, relationships, state transitions, and interaction rules. It is a design document, not a change to the executable database or command schema.

Work proceeds in this order: **this blueprint → editable Figma design → owner review → application implementation in a later stage**. The owner explicitly requested no code changes during this design stage. The existing source and its behavior remain unchanged.

Scope comes from [the accepted roadmap](FUTURE-IMPLEMENTATION.md) and [the scheduling review](artifacts/executive-scheduling-review/review.md). Preserve the useful existing app features while making everyday planning less demanding. This proposal replaces conflicting old layout rules only when later accepted and implemented; it is not evidence that a feature already exists.

## 1. Experience model

The central loop is **Capture → Choose today → Do one thing → Adjust → Close → Learn**. Entering through any point is allowed. Starting a day, entering a health value, estimating every task, or filling a calendar is not a prerequisite to capturing or completing a task.

The home screen answers three questions, in order:

1. What am I doing now, or what can I start next?
2. What fixed commitment must I protect next?
3. What matters today, and how much time should stay open?

The app supports a small plan without presenting it as a failure. Suggestions remain editable. No forced three-task limit, universal buffer percentage, punitive score, or automatic financial loss is introduced.

## 2. Navigation schema

| Destination | Purpose | Primary actions | Secondary access |
|---|---|---|---|
| Today | The current action and chosen day | Start / Resume, Pause, Done, Reset today | Plan today, Start / End day, compact weather and urgent decisions |
| Plan | Calendar and available capacity | Add appointment, place flexible work, review conflict | Agenda / Timeline, day picker, template preview |
| Tasks | One trusted task collection | Quick capture, start, complete, select for today | All / Today / Later, search, details, archive |
| Review | Reflection and history | View day, write journal, weekly review | Calendar, search, factual summary and explicit regeneration |
| More | Supporting tools | Goals, health, practice, money, reminders, weather, settings | Clear group labels and existing tools |

On a phone, use five labeled navigation destinations with a minimum 44-pixel interactive height. Replace the nine-choice capture entry with an immediately available **+ Task** action; additional record types remain in their destination or an Add other menu. At 320 pixels, labels and touch areas must fit without horizontal scrolling.

On a wide screen, use a left navigation rail, a bounded main work area, and a contextual right column. The right column repeats only useful context, such as the next fixed commitment and protected capacity. It must not become a second unrelated dashboard.

Goals moves into More but remains accessible through a linked task and a compact Today entry. Keep four-tab preferences through implementation Phases 2–5. Activate five-tab storage only in Phase 6 together with the matching shell, Settings editor, migration/normalization, and tests. Continue accepting the original four-tab `settings.save` wire shape: validation occurs before receipt lookup, so an old accepted save must still reach its receipt. Normalize fresh legacy saves only after fingerprint/receipt/revision handling; do not conflate five-tab stored state with legacy command acceptance.

## 3. Screen and action schema

| ID | Screen / state | Information order | Main action and behavior |
|---|---|---|---|
| S01 | Today — before day | Date; start-day invitation; next fixed commitment; quick capture | Start day; capture remains available without starting |
| S02 | Today — active | Current task and first action; recorded work time; planned finish; next appointment; selected priorities | Pause, Done; Reset today is a separate plan action |
| S03 | Today — paused | Paused task and time already recorded; next commitment; other priorities | Resume; starting another task is allowed while this one is paused |
| S04 | Today — overrun | Honest overrun label; next commitment; remaining capacity | Reset today; extend only after showing impact |
| S05 | Plan today | Planning window; fixed commitments; capacity; main outcome; supporting tasks | Save today's choices; time placement optional |
| S06 | Tasks | Search / capture; All / Today / Later; open tasks including scheduled work | + Task; direct start or complete; planning fields progressively disclosed |
| S07 | Quick capture | Title; optional note | Save task; then offer Plan task as a separate step |
| S08 | Task details | Title; first action; done-when guidance; estimate; preferred day; actual deadline; goal; notes | Start, Complete, or Plan; never silently create a booking |
| S09 | Plan — agenda | Day and capacity; fixed events; flexible windows; buffers; untimed choices | Place work / add appointment; conflicts are visible in rows |
| S10 | Plan — conflict | Both conflicting entries and their fixed/flexible status | Choose a new time, defer flexible work, or explicitly keep overlap |
| S11 | Reset today | Next fixed commitment; remaining priority; before/after preview; deferred items | Apply changes atomically; cancel leaves plan unchanged |
| S12 | Templates | Light / regular variants; selected items; preview against existing plan | Apply selected items after conflict/load preview |
| S13 | Start day | Wake time; optional mood/energy/sleep/weight | Start day; Plan today is a skippable next step |
| S14 | End day | Today's selected commitments; optional reflection; reachable closing action | End day; leave unresolved work for later; wider backlog collapsed |
| S15 | Review — day | Date navigation; factual record; separate personal journal | Save writing; regenerate summary only after explicit replacement warning |
| S16 | Review — week | Priority progress; recorded planned/actual comparison; changes to try | Turn an owner-chosen insight into a task or future-plan adjustment |
| S17 | Goals | Active goals; leaf progress; selected next step | Choose next step → Plan this step → Today |
| S18 | More and supporting tools | Goals; health and practice; money; reminders; weather; settings | Open tool directly; none is mandatory for the daily loop |

Additional states accompany these screens rather than creating unrelated new flows: no selected tasks, no active task, completed priority, unknown estimate, empty history, loading, saving, save failed, stale revision, uncertain save result, and offline. Empty states contain one useful action and do not fabricate activity.

## 4. Conceptual information schema

These are product concepts and relationships, not final TypeScript declarations or SQL migrations. Keep the existing validated command architecture when implementation begins.

| Concept | Information it owns | Relationships and rules |
|---|---|---|
| Task | Title; optional note, estimate, first action, done-when guidance, preferred date, deadline, area, labels | May link to a goal; can exist without a date or booking; existing stored estimates preserved |
| Day plan | Owner-local date; selected task IDs in order; main outcome; planning window; protected spare time | One current plan per local date; selected tasks remain ordinary tasks rather than copies |
| Planned entry | Kind; intended interval; fixed/flexible status; task or theme reference | Appointment, task placement, focus/theme window, transition, or buffer; old moved entries retain history |
| Work session | Task/routine target; intervals with their own timestamps, timezone, local date, optional open-day association and optional plan-entry link | At most one interval runs globally; pause closes it; resume captures a fresh interval context; Stop works without Start Day |
| Day record | Start/end; owner check-in; factual summary; separate journal | May remain open across midnight; starting/ending is repeat-safe; no inferred sleep |
| Plan change | Chosen move/defer/keep operations; original revision; resulting history | One accepted preview maps to one atomic, repeat-safe operation |
| Template | Named variant; selectable entries; optional first actions/checklists | Applied explicitly after preview; no automatic recurrence implied |
| Goal | Existing hierarchy, leaf steps, target date, state | Linked tasks can help act on a leaf without counting parent and child twice |
| Reminder | Existing in-app review cue and timing | Deferring a reminder does not pause or reschedule work |

Existing health logs, practice logs, financial ledgers/envelopes, weather locations, settings, and audit records retain their separate meanings and privacy protections.

### Dates and capacity

- A **preferred date** means intention. A **deadline** means a genuine due obligation. A **planned interval** means reserved time. Store and display those distinctions.
- Deadline entry supports a date without an invented midnight deadline; if a time is supplied, display that time explicitly.
- Capacity is calculated inside the owner's chosen planning window, using the union of occupied intervals. Fixed appointments outside that window remain visible but do not consume that window's capacity.
- A task inside a focus window consumes that window's capacity; it is not deducted again from the whole day. An estimate still unknown is shown as unestimated work.
- Separate **reserved time**, **estimated untimed work**, and **protected spare time**. Never present a reassuring free-time number that silently excludes unestimated selected tasks.
- Example fixture: 09:00–17:00 is 8 hours; 1 hour fixed + 30 minutes transitions + 2 hours protected spare leaves 4h30 usable. Selecting 2h30 of estimated work leaves 2 hours unallocated. These values are synthetic design examples.

### Work and outcomes

Task intent: open → complete, or open → partial with a linked remaining task. A booking can be missed while the task remains open. Appointments use Attended / Missed / Cancelled and never become task backlog.

Work session: idle → running → paused → running → ended. Completing or partially resolving a task ends its running interval. Starting another task while one is running requires an explicit pause/switch action; paused sessions do not block other work. No backfilled focused-time claims are made from old unpaused start/end records.

**Each interval owns its date context.** A paused task resumed weeks later records new work in the new interval's date/week, never the session's original date. With no open day, use the interval's start-date/timezone context and split calendar totals at local date boundaries. An interval associated with an explicitly open day retains that association across midnight for the day record; calendar/week reporting instead clips absolute intervals to its stated reporting window. Do not add these two views together.

Stop recording is available even without Start Day and leaves the task open. Starting a day during unassociated running work splits the interval at trusted command time without backdating it to wake time. Day closure must not terminate unrelated old paused sessions.

For implementation compatibility, starting a linked block still stamps its first `actualStart`; terminal actions project `actualEnd`. Session intervals become the only running/paused/duration authority. Update Home, summaries, and shared selectors before exposing Pause; retain legacy timestamps as evidence and never count both the old span and its new session.

Selecting Tomorrow changes a preferred day or day-plan selection. It never books 09:00 automatically. Moving a booked task presents its proposed time before saving and retains the previous record as history.

### Closing, carrying work forward, and recovery

End day closes the day record, not every intention. Unresolved tasks remain open and searchable. Reset today preserves fixed appointments by default and previews any proposed changes. Nothing silently shifts into the evening.

Closing while work is running must surface the active session and offer an explicit stop or return to task; do not fabricate an end time while hiding the consequence. Cross-midnight work remains associated with the explicitly open day and retains its true absolute timestamps.

## 5. Interaction contracts

| Flow | Required decisions | Result |
|---|---|---|
| Capture | Enter title; optional note | Open task with unknown estimate unless owner supplied one |
| Choose today | Select main outcome and optional supporting tasks; review capacity | Ordered day selection; exact booking optional |
| Start | Choose task; handle existing running session if present | One running interval, even for an unscheduled task |
| Pause | Press Pause | Interval closes; task remains resumable; no completion outcome demanded |
| Stop recording | Press Stop recording, with or without an open day | Session ends; task stays open; no fabricated booking or day |
| Complete / Partial | Choose outcome; supply remaining time for partial | Factual outcome and linked remaining work as appropriate |
| Reset | Protect next appointment; choose priority; review before/after | Atomic plan revision with preserved history and clear deferred work |
| Apply template | Choose variant and subset; review existing plan conflicts | Explicit duplicate-safe additions |
| Close | Review today's commitments if desired; optional writing | Day closes with unresolved work preserved |

Primary actions must say what they do: Save task, Save today's plan, Apply changes, End day. Avoid two differently named controls that perform the same operation. A confirmation is warranted when choosing actual consequences, not for every harmless navigation step.

On uncertain save outcome, keep the exact pending operation available for retry; do not present a fresh duplicate submission as recovery. On stale revision, refresh and show a new preview before applying. Offline has a clear reconnect message; no offline editing queue or browser-persisted personal records is introduced.

## 6. Visual schema

### Visual language

Retain graphite surfaces, warm off-white text, and warm gold for selected actions. Reduce stacked decorative cards: one clear focus surface, quieter contextual rows, and predictable spacing. Use concise, neutral copy. Avoid streaks, pressure labels, unnecessary motivational quotes, and empty progress decorations.

Source palette remains the starting point: background `#0b0c0d`, surface `#191a1c`, raised `#222426`, text `#f4f2ed`, muted `#a6aaae`, border `#34373a`, gold `#d8b978`. A subtle warm focus surface and semantic warning/success colors may be introduced as named design tokens, with non-color labels.

The implementation keeps the approved system sans-serif stack. Figma uses an available system-family representative where possible; any substitute must be documented and must not imply a web-font dependency.

Type intent: readable 16px body; 14px secondary text; 12px only for nonessential overlines; 24–32px screen titles; 28–40px focus heading depending on width. Controls target at least 44px height, typically 48px. Use an 8px spacing rhythm, 16–24px panel padding, and restrained 12–20px radii.

### Responsive rules

- 320–599px: single column, full-width focus content, five labeled navigation items, no permanent side panel; details open as readable full-screen flows or sheets with reachable actions.
- 600–1023px: wider reading width; contextual columns only where content fits; maintain the same task order and behavior.
- 1024px+: left rail and bounded two-column workspace; Plan may use additional width for the agenda/timeline, while forms keep a readable line length.
- Designs contain no fake phone status bar, device bezel, or home indicator. Sticky actions reserve space and must not cover content or the on-screen keyboard.
- Keyboard order follows reading order; visible focus is required. Text status accompanies color. Reduced motion removes nonessential transitions. Accessibility is verified in the implemented app later, not claimed from static Figma frames.

### Component schema

| Component | Variants / contents | Important behavior |
|---|---|---|
| Action | Primary, secondary, quiet, disabled, focus | Clear verb; one main commitment per section |
| Task row | Selected, scheduled, untimed, paused, completed | Title and readable status; direct action; task stays in All |
| Focus panel | Ready, running, paused, overrun | Next action, separate recorded/planned times, distinct controls |
| Commitment row | Fixed, flexible, transition, buffer, conflict | Explicit kind and time; buffers have no completion checkbox |
| Capacity summary | Known, unknown estimate present, over capacity | Time labels and arithmetic, not just a colored meter |
| Selection / filter | Selected, unselected, focused | Labels remain visible and state is programmatically available later |
| Field | Empty, filled, optional, error, disabled | Persistent label; no placeholder-only instruction |
| Notice | Informational, conflict, offline, uncertain save | Concrete next action; does not imply data was saved |
| Navigation | Phone bar, desktop rail | Same destinations and hierarchy |

## 7. Figma deliverable and traceability

Create a new v3 design page in the existing Caminos file, preserving v2. Separate three readable canvas areas: blueprint and behavior map; reusable visual foundations; proposed screens. Each screen is named with its S-number from this schema. Add phone and desktop examples of the core daily loop and supporting screens with consistent components.

Use synthetic task examples only: prepare a proposal, read twenty pages, arrange a workspace, a fixed appointment, and an admin window. Include a clear legend that canvas examples are invented. The actual product UI should not show engineering instructions or schema identifiers.

Connect the main demonstration journey in Figma where supported: Today → Plan today → Today → Pause → Reset today → End day → Review. This is a design prototype; button links demonstrate navigation, not persistence or validated domain behavior.

Record the actual Figma page and frame links and verification results after creation. Keep outstanding implementation work in `FUTURE-IMPLEMENTATION.md`; do not mark application features implemented because their mockups exist.

Design-stage result: [the v3 Figma blueprint](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=115-54) and [design handoff with screen/prototype links](artifacts/redesign-v3/README.md) are available. The proposal contains 47 screen/state/layout frames, including phone, narrow-phone, tablet, and desktop studies. SF Pro is the Figma representative of the system font. Application behavior remains unchanged.

## 8. Design review criteria and later implementation boundary

The owner should be able to inspect how to capture an interruption, choose the next action, protect an appointment, pause, recover a disrupted day, and close with unfinished tasks. Visual review should compare phone and desktop, empty and busy states, and ordinary and disrupted days.

Later implementation will require data migration, strict commands, atomic batch replanning, safe retries, and tests for unknown values, partial work, running/paused sessions, capacity, timezones/DST, midnight, stale revisions, summary protection, privacy, and responsive accessibility. None of those code changes is authorized in this design-only stage.

### Reviewed delivery and storage boundaries

- **R1:** safe daily loop, title-only capture, sessions/outcomes, simple selected plans and spare reserve, explicit booking/conflict preview, atomic Reset, coordinated five-tab activation, day closure/review, basic whole-template preview, and existing tools preserved.
- **R2:** focus allocations, positioned buffers/transitions and reserve conversion, template variants/subsets/checklists and application records, detailed change history, weekly learning, optional energy/small-plan controls, enhanced goal-next-step and remaining polish. These remain accepted work; R1 is not the complete redesign.
- Existing Figma frames depict the complete target and may combine R1/R2 concepts. R1 must omit unavailable R2 controls rather than render inert imitations. Final appearance does not change the dependency gates.
- Draft schemas evolve on deliberately disposable fixtures while behavior is built. Freeze the supported format at first non-disposable owner-data use or supported release/export publication, after the release readiness checks; Phase 2 does not freeze all future collections.
- Existing databases never upgrade merely through API startup, normal CLI open, or MCP invocation. The planned administrative migration requires an explicit absolute target, target version, apply opt-in, and new verified backup. Its default preflight is read-only. These are future requirements, not implemented commands.
- Four AI prompts represent four roles scheduled with **at most two active sessions**: baseline setup, contracts/foundation, core/planning, review/integration. GitHub tracks parked-role handoffs and the R1/R2 boundary.

### Final review clarifications

Each interval stores its own optional `plannedBlockId` alongside date/timezone/day context. A resume explicitly chooses the new compatible booking or none; old intervals and their recorded totals keep their original attribution. Start Day's accounting split preserves the existing interval's booking.

Phase 3 adapts legacy `day.end` before Pause is exposed. Fresh legacy closes requiring a recording decision fail atomically; the existing End Day screen confirms the new `day.close` command with the reviewed revision/session. Accepted old receipts still replay. Phase 9 later redesigns that screen; no close may leave an unfinished session associated with an ended day.

The explicit missing-file policy permits only deliberate server/owner initialization, synthetic harness creation, and an explicitly selected new scratch-restore destination. Snapshot/export/ordinary commands/verification/backup/MCP refuse missing sources; migration requires an existing source. Initialization never grants migration permission.

AI 2 temporarily owns Phase 1/3 planning compatibility and Phase 6 Settings navigation. AI 1 + AI 2 deliver the navigation slice; AI 3/4 receive tested ownership handoffs later. All acceptance rows/scenarios and completion items carry R1/R2 markers in `skill.md` sections 13 and 16.1.

The earlier design-only restriction describes the completed design stage. The owner subsequently authorized Prompt 4 setup/test infrastructure; see [current execution record](docs/redesign-v3/coordination.md). App features still await Prompts 1–3 and later Prompt 4 integration.
