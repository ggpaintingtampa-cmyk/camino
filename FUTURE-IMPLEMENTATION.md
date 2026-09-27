# Caminos Future Implementation

This file tracks what is already implemented in the copied development workspace at `/home/andre/Desktop/camino` and what is intentionally left for later work.

Do not treat this file as production verification. The real deployed app and historical runtime names may still use Hermes paths, services, cookies, and hostnames. All edits for this project should stay in `/home/andre/Desktop/camino`.

## Currently implemented

- Caminos branding in source, user-facing copy, app metadata, development commands, and local docs.
- Private single-owner web app with React, TypeScript, Vite, Fastify, Zod, and SQLite.
- Owner setup/login, private session cookie behavior, CSRF/origin checks, no-store API responses, and validated command envelopes with revision/idempotency safety.
- Home dashboard with daily briefing, weather, current work, first appointments, goals, reminders, and expiring money envelopes.
- Start Day and End Day flows with wake time, mood, energy, optional sleep/weight details, factual summary, personal journal, and unresolved-item handling.
- Schedule with compact agenda, optional 24-hour timeline, five-minute placement, drag/tap editing, unscheduled tasks, appointments, conflict warnings, templates, and task resolution.
- Tasks with duration, Work/Personal area, labels, notes, goal links, complete/missed/partial/snooze behavior, and linked remaining work for partial completion.
- Goals with parent/child structure, target dates, active/paused/completed/archived states, pinned goals, and equal-weight leaf progress.
- Health and practice logs for steps, weight, workouts, sleep, food, and Rocket League practice.
- Journal and history with calendar navigation, editable factual summaries, separate personal journal text, search, and historical activity views.
- Money tracking with Personal and Company ledgers, cash/account/earned/lost buckets, envelopes, expiry decisions, cancellation, adjustments, and audit history.
- Weather locations with NWS/Open-Meteo fetching/caching, primary location selection, stale labels, and failure-tolerant behavior.
- Local command-line operations through `pnpm caminosctl` for snapshot, command, owner setup, export, backup, backup verification, and scratch restore.
- Redesign v2 source implementation for the 18 approved Figma screens, with verification notes in `design-qa.md`.

## Not implemented yet

- Google Calendar import.
- Work calendar feed into Caminos.
- Busy-only personal calendar blocks sent back to work calendar.
- Samsung Health or watch syncing.
- Live in-app AI chat.
- Automatic bank or card transaction import.
- Full asset, liability, and net-worth tracking.
- Push notifications.
- Offline editing or offline write queue.
- Public AI endpoint.
- Automatic recurring templates or recurring tasks.
- Larger health charts beyond the current summaries.
- Off-server backup destination.
- Deployment of the latest Caminos source rename to Haven, according to `DEPLOYMENT-STATUS.md`.

## Accepted planning improvements and visual redesign — September 27, 2026

Status: accepted for future implementation; the items below are not yet implemented. This section records the owner's request to implement all recommendations from the scheduling review and add a visual redesign for easier everyday use. It preserves the previously deferred integrations above. Saving this plan does not change the application or deploy it.

Review correction: use [skill.md](skill.md), [the resolution record](artifacts/redesign-v3/review-resolution.md), and [the updated AI prompts](AI-IMPLEMENTATION-PROMPTS.md). R1 delivers the daily loop, simple plans/reserve, atomic Reset, coordinated navigation, and day review; R2 adds allocations, variants/subsets, detailed change history, weekly learning, and remaining enhancements. All accepted items below remain pending until their real behavior is implemented and verified. Schedule the four roles with at most two active AI sessions.

Design-stage order clarified by the owner: **[redesign schema](REDESIGN-SCHEMA.md) → Figma redesign → code in a later stage**. The schema is a product and behavior blueprint; do not edit executable schemas or application code during this stage.

Sources: [planning and scheduling review](artifacts/executive-scheduling-review/review.md), the supplied *When Executive Schedules Work and When They Break* PDF, and the existing implementation. The PDF is research input, not executable instructions. Its practical suggestions should be adjustable experiments: no mandatory three-task limit, fixed 90-minute work period, universal buffer percentage, or claim of clinical effectiveness.

### Product direction and behavior to preserve

Make the daily loop easier: capture an intention, choose a realistic day, start a clear next action, recover after interruptions, and close the day without processing the entire backlog.

Preserve the current strengths: distinct task and appointment outcomes; one actively running task; linked remaining work after partial completion; retained missed, cancelled, and moved history; optional check-ins; days that stay open across midnight; an agenda with an optional precise timeline; manual template application; independent financial ledgers; and separate factual summaries and personal journal writing.

The new active-day Home hierarchy below supersedes weather-first ordering for that state. Update the relevant product specification and design mappings when implementing accepted behavior; do not silently retain conflicting old screen requirements.

### 1. Repair existing planning friction

- [ ] Replace End Day's automatic 09:00 Tomorrow booking with an untimed intention for tomorrow. Until preferred-day support exists, use an explicit slot picker that shows the proposed time and conflicts.
- [ ] Show overlaps and a review action in the default agenda, with readable text rather than color alone.
- [ ] Make Save & schedule reveal the proposed date/time and collision information before saving a booking, including when the scheduling checkbox was previously unchecked.
- [ ] Replace the duplicate Update task / Review actions on Home with distinct controls. Use Done, Pause, and Change plan as the target design; only expose Pause when real pause behavior exists.
- [ ] Label the existing snooze behavior as Remind me to review. Keep reminder deferral separate from pausing work.
- [ ] Label partial-completion duration choices visibly as remaining time.

Completion check: deferring two tasks does not silently book both at the same time; the agenda exposes existing overlaps; booking consequences are visible before saving; task controls accurately describe their effects.

Implementation starting points: `src/planning.tsx`, `src/HomePage.tsx`, and `shared/domain.ts`. Detailed evidence and code links are in the review.

### 2. Make Home answer what to do now

- [ ] During an active day, put the current action first, the next fixed appointment and preparation time second, and today's selected priorities third. Reduce weather to a compact line; retain access to health, goals, envelopes, and other tools.
- [ ] Remove ordinary unscheduled backlog from Needs attention. Reserve that treatment for actual time-sensitive obligations, conflicts, and explicit decisions such as envelope expiry.
- [ ] Show optional first-action and done-when guidance, or relevant task notes, directly in the focus card. Do not require these fields during capture.
- [ ] Distinguish actual recorded work time from the planned finish time. Exclude paused intervals from work time and preserve unknown historical values.
- [ ] Offer clear Done, Pause / Resume, and Change plan actions. Check the next fixed commitment and transition time before offering an extension.
- [ ] Design before-day, active, paused, empty, completed-priority, and overrun states without requiring the owner to interpret a crowded dashboard.

Completion check: Home makes the next action and next fixed commitment clear without opening another screen; elapsed work and planned timing cannot be mistaken for one another.

### 3. Add a short, realistic Plan Today flow

- [ ] Offer a skippable planning step after Start Day. Preserve optional morning check-in fields and the wake-only path.
- [ ] Support one main outcome and optional supporting priorities, with a small suggested selection rather than a hard limit. Allow selection and reordering of today's tasks.
- [ ] Let a task be selected for today without assigning a precise time.
- [ ] Separate a genuine deadline, a preferred day, and a scheduled start. Do not convert a preference into a calendar promise.
- [ ] Let the owner choose a planning window and reserve breaks, transitions, and spare time. Do not assume all waking hours are available for work.
- [ ] Show available capacity, selected estimated work, and time deliberately left open. Flag unknown estimates instead of treating them as zero or inventing values.
- [ ] Calculate occupied time using the union of overlapping intervals, clipped to the planning window; flag conflicts separately. Avoid counting tasks inside a reserved focus window twice.

Completion check: the owner can select a workable day with untimed tasks; capacity calculations account for fixed commitments and protected spare time without double-counting overlaps.

### 4. Separate quick capture from detailed planning

- [ ] Provide direct task capture with a title and optional note, without first requiring the nine-type Add menu or expanded planning fields.
- [ ] Preserve an unknown duration until the owner estimates it. Decide explicitly between an optional estimate in the task model and a separate capture-draft model; do not quietly store a default 30-minute estimate.
- [ ] Preserve existing stored estimates during migration; do not assume a historical 30-minute value was accidental.
- [ ] Use one trusted task collection with All, Today, and Later views. Include scheduled open tasks in All.
- [ ] Make Tasks directly reachable from Home or primary navigation. Reordering the existing four tabs alone cannot supply a new destination.
- [ ] Allow an unscheduled task to be started or completed directly, without creating a fictional calendar booking. Retain the one-running-task invariant.
- [ ] Keep appointments on a separate, explicit time-entry path; progressively reveal task details when planning or editing.

Completion check: title-only capture is possible from the everyday interface; tasks remain findable after scheduling; completing a small unscheduled task requires no calendar workaround.

### 5. Make recovery a first-class action

- [ ] Add Reset today near the current task. Show the next fixed commitment and let the owner choose the remaining priority that matters most.
- [ ] Preview the current and proposed plan before applying changes. Move, shorten where explicitly chosen, or defer flexible work while leaving appointments unchanged unless the owner explicitly changes them.
- [ ] Implement real Pause / Resume with recorded work intervals independent of planned blocks. A paused task must allow another task to start; resuming must enforce the one-running-task rule.
- [ ] Apply an accepted group of plan changes atomically through one validated command and revision. Preserve historical blocks and links, handle stale revisions, and retry uncertain results with the same request identity.
- [ ] Use neutral wording for unfinished work. Avoid automatically cascading the entire backlog into the evening.
- [ ] If reversal is offered, preserve history and validate against newer changes rather than deleting intervening work.

Completion check: after an overrun, the owner can preserve a fixed appointment, choose one useful next action, and defer the rest with a clear preview and repeat-safe application.

### 6. Support flexible work windows and protected buffers

- [ ] Distinguish fixed appointments, flexible focus or theme windows, and transition or buffer periods in both the model and interface.
- [ ] Let a theme window such as Admin and follow-ups offer a small relevant task shortlist without requiring every task to have an exact start time.
- [ ] Reserve buffer capacity without creating fake tasks or demanding completion outcomes. Exclude buffers from task-completion statistics.
- [ ] Keep buffer amounts and work-window lengths adjustable. Do not automatically fill intentionally spare time.
- [ ] Preserve the default agenda, optional full 24-hour timeline, precise appointment editing, and a tap/keyboard alternative to dragging.

Completion check: a focus window can contain task choices without duplicate capacity consumption; a buffer protects time without becoming another obligation.

### 7. Make templates safe and reusable

- [ ] Preview a template against the existing plan, including combined load and conflicts, before applying it.
- [ ] Allow a subset of template items to be selected, with reusable light-day and regular-day variants.
- [ ] Support optional first actions and simple checklists for recurring responsibilities.
- [ ] Keep application manual and duplicate-safe. Automatic recurring tasks and templates remain a separately deferred integration/feature decision.

Completion check: applying a template is an explicit choice with visible consequences and cannot duplicate entries because of a retry.

### 8. Make End Day smaller and easier

- [ ] Review today's selected commitments first; place the wider backlog behind a collapsed disclosure.
- [ ] Keep End day reachable and make Leave the rest for later explicit. Preserve the ability to close with unresolved work and to keep a day open past midnight.
- [ ] Keep personal journaling optional and separate from the factual summary.
- [ ] Emphasize selected-priority progress and useful adaptations over completion ratios. Keep completion counts available as facts; do not let moved or cancelled historical blocks distort a score.

Completion check: the owner can close a day without resolving every backlog item or writing a journal entry, and retained history remains accurate.

### 9. Connect reflection to the next plan

- [ ] Add optional prompts such as What changed the plan? and What would make tomorrow easier?
- [ ] Add a compact weekly review of planned time, recorded actual work, and owner-recorded interruptions or deferrals.
- [ ] Preserve owner-edited factual summaries until explicit regeneration; explain replacement before regenerating. Never overwrite personal journal writing with generated facts.
- [ ] Distinguish recorded intervals from verified focused work. Do not retroactively fabricate pauses or infer why a plan changed from sleep, mood, health, or financial records.
- [ ] Offer a clear action to turn an insight into a task or adjustment for a future day, with owner confirmation of the actual change.

Completion check: review helps adjust a future plan while preserving the distinction between recorded facts, personal reflection, and unknown information.

### 10. Connect supporting features without adding daily obligations

- [ ] Add Goal → Choose next step → Plan this step → Today, using existing task-to-goal relationships and preserving leaf-based progress without double-counting parents.
- [ ] Offer an optional current-energy filter and owner-selected small-plan mode. Do not assume a morning energy entry describes the entire day.
- [ ] Keep health, food, sleep, workouts, and practice logs easy to reach but optional for planning.
- [ ] Preserve explicit envelope decisions, independent Personal and Company ledgers, and repeat-safe money operations. Do not introduce automatic financial penalties or inferred outcomes as motivation.
- [ ] Describe reminders honestly as in-app reminders until push notifications are implemented; do not imply alerts while the app is closed.

### 11. Visual redesign in Figma

Use the accepted behavior above to guide an editable Figma design, followed by implementation in the real responsive web app. Figma work does not automatically update application code.

Existing reference: [Caminos — Redesign v2](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=1-2), with its 18-screen implementation mapping in `design-qa.md`. Preserve that baseline and put the new direction on a separate clearly named page or file.

- [ ] Retain the recognizable graphite and warm-gold identity while simplifying information hierarchy, navigation, and everyday actions. Use gold selectively to identify important actions and states.
- [ ] Design Home / Now, Plan Today, Tasks with All / Today / Later, quick capture and task details, Schedule, Reset today, Start Day, End Day, weekly review, and goal-to-next-step flows first.
- [ ] Bring Journal / History, health and practice, envelopes, reminders, weather, and settings into the same component system after the core daily flows are settled.
- [ ] Use editable frames, text, components, and variants rather than flattened screenshots. Define typography, spacing, color, controls, status labels, cards, dialogs, navigation, and responsive behavior.
- [ ] Provide phone and desktop layouts and document intermediate behavior. Validate the implemented app at 320, 390, 768, and desktop widths. Build a real responsive web interface without simulated phone chrome.
- [ ] Improve small labels, reading order, touch targets, keyboard focus, and the visibility of primary actions. Use measured contrast, non-color status cues, reduced-motion behavior, and screen-reader checks during implementation.
- [ ] Ensure fixed navigation and persistent actions do not obscure forms, keyboard-focused controls, or End day on small screens and at zoom.
- [ ] Include empty, loading, saving, error, stale-revision, unknown-save-result, and offline states. Preserve the existing server-only privacy model: offline state must not imply a new browser-persisted personal-data cache or offline write queue.
- [ ] Include active, paused, overdue/overrun, conflicting, and unknown-estimate states, with clear interaction annotations. Prototype the critical journeys where supported: capture → plan → start → interrupt → reset → close.
- [ ] Use only synthetic examples in Figma and test fixtures. Do not copy private personal records or Pirata data.
- [ ] Review the visual direction with the owner, then implement the chosen design using existing shared components and theme tokens. Compare actual responsive renders with the design and update `design-qa.md`.

Figma connection was verified on September 27, 2026, with an editing seat. The assistant can operate the connected Figma tools; the owner does not need to draw screens or perform routine design operations. Owner input is useful for visual preferences and everyday workflow feedback. File-specific permission or connection prompts may still require owner action if encountered.

Design-stage update: the [product schema](REDESIGN-SCHEMA.md) was written first, followed by an editable v3 Figma proposal. See the [design handoff and prototype links](artifacts/redesign-v3/README.md). The existing v2 designs are preserved. This completes the first design proposal, not feature implementation or final design approval; the roadmap's application checkboxes remain pending. The owner explicitly requested that code changes wait until the later implementation stage.

Completion check: the daily journeys are easier to scan and operate on phone and desktop; the design includes real interaction and recovery states; implemented behavior matches the accepted domain rules.

### 12. Engineering, migration, and validation

- [ ] Keep React, Fastify, SQLite, and the existing command architecture. Extend `shared/types.ts`, `shared/schema.ts`, `shared/domain.ts`, selectors, repository validation, and relevant UI together.
- [ ] Add an explicit day-plan representation for selected tasks and ordering; distinct preferred-day/deadline semantics; actual work sessions with pauses; and appropriate window/buffer types. Final field names and storage shape should follow implementation review.
- [ ] Migrate old snapshots only through explicit opt-in with absolute target, target version, and new verified backup. Ordinary API/CLI/MCP open must not upgrade existing data. Preserve estimates, timestamps, relationships, history, and edited summaries; do not invent missing facts. Draft formats remain provisional on disposable fixtures until supported-release/owner-data freeze.
- [ ] Keep four-tab navigation through Phases 2–5 and activate five tabs with the Phase 6 shell/Settings slice. Preserve legacy four-tab command parsing and fingerprints so old accepted saves reach receipt replay; normalize fresh legacy saves only afterward.
- [ ] Attribute resumed work per interval, including standalone Stop, late resume, midnight/week clipping, and explicit open-day context. Define block start/end projections and replace legacy active-state readers before exposing Pause.
- [ ] Keep new commands strict, atomic, revision-safe, and idempotent. Test stale revisions and uncertain outcomes for batch replanning and template application.
- [ ] Use isolated synthetic data for checks. Cover unknown estimates, one-running-task behavior including pause/resume, partial remaining work, overlapping capacity, tasks inside windows, late starts, overruns, next fixed commitments, cross-midnight days, timezone/DST changes, safe retries, and summary preservation as relevant to each change.
- [ ] Run the appropriate lint, typecheck, domain/API tests, build, and affected end-to-end flows. Verify keyboard, touch, zoom, responsive layouts, contrast, and screen-reader behavior for the redesigned flows. Record actual results and any environment limitations.
- [ ] Keep personal records server-side; retain authentication, CSRF/origin checks, no-store behavior, and separation from Pirata and production systems. Source implementation does not authorize deployment.

### Delivery sequence

| Phase | Work | Exit condition |
|---|---|---|
| A — Visual direction and flow design | Map existing screens; create the Figma component direction and core Home / Plan Today / Reset today journeys; specify changed behavior | Owner can review concrete phone and desktop designs, including interruption and recovery states |
| B — Remove existing friction | Tomorrow placement, booking preview, agenda conflicts, truthful snooze wording, distinct controls, visible remaining-time labels, shorter shutdown | Existing actions have predictable consequences and day closure does not demand backlog processing |
| C — Improve the daily loop | Data migration, quick capture, unified task collection, day priorities, capacity, first-action guidance, direct start/complete, pause/resume, atomic Reset today; implement core visual design | A realistic day can be chosen and an interruption handled with a few clear decisions |
| D — Learn and reuse | Flexible windows, buffers, template preview/variants, goal next steps, optional energy/small-plan support, weekly review; complete remaining visual consistency work | Repeated use makes planning easier without increasing daily administration |
| E — Validate and document | Owner trials, accessibility/responsive checks, relevant regression tests, updated product spec and design QA | Results are recorded, material issues are resolved, and remaining deferred work is explicit |

Validation should accompany each phase; Phase E consolidates it rather than postponing it. Evaluate small increments through capture effort, time to choose a next action, effort to recover from an overrun, ease of closing a day, and willingness to return after a difficult day. Calendar occupancy and perfect streaks are not the primary success measures. These are proposed evaluation criteria, not measured benefits.

The A–E table is the broad work order, not a requirement to finish every advanced feature before R1. Follow the precise R1/R2 boundary and two-worker dependency schedule in `skill.md` sections 3.4 and 12. The supplied review reports WebKit's missing `libevent-2.1.so.7`; record/reproduce the environment limitation or obtain compatible-host evidence rather than claiming a fully passing baseline.

## Future implementation rules

- Keep privacy first: never use production personal records as test fixtures.
- Prefer the existing command model in `shared/types.ts`, validation in `shared/schema.ts`, and business rules in `shared/domain.ts`.
- Do not write directly to SQLite from feature code or AI tools; route mutations through validated commands.
- Preserve unknown values as unknown. Do not infer missing sleep, health, money, weather, or journal facts.
- Keep external integrations opt-in, auditable, and separate from the work app and its users.
- For any new integration, add tests for auth isolation, stale/retry behavior, and failure that does not block the rest of the app.
- Update this file whenever a deferred feature becomes implemented or a new future item is accepted.

## Quick activity list

- Start Day
- End Day
- Tasks
- Appointments
- Schedule
- Day templates
- Goals
- Health logs
- Food logs
- Rocket League practice
- Journal
- History and search
- Reminders
- Money ledgers
- Cash envelopes
- Weather locations
- Settings

## Prompt 4 setup and final review follow-up

The initial authorized batch delivers shared documentation, GitHub coordination, and isolated browser-test infrastructure: separate test ports, no stale-server reuse, daily/empty fixture factories, a test-code clock callback, and cleanup after closing SQLite. App redesign feature boxes above remain pending. See [setup evidence](docs/redesign-v3/review-handoff.md) and [coordination](docs/redesign-v3/coordination.md).

The implementation contract now requires Phase 3 compatibility for legacy `day.end`, booking/date context on each interval, and explicit repository creation intent. AI 2 temporarily handles early planning fixes and Phase 6 Settings navigation before returning ownership. Use the R1/R2 markers on every acceptance case/checklist item in `skill.md` sections 13 and 16.1 to determine release readiness.
