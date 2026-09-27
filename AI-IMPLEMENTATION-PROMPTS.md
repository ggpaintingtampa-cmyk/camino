# Four AI prompts for the Caminos redesign

**27 September 2026 integration update:** R1 is implemented and integrated; see [release verification](docs/redesign-v3/release-verification.md) for actual checks and limits. The assignments and handoff status below record earlier stages. Do not restart completed R1 work. R2 remains deferred. The owner subsequently authorized integration, focused checks, push and deployment; no additional agents are requested.

These are four implementation role assignments. Prompt 4's setup batch is now authorized; its actual status and evidence are recorded in `docs/redesign-v3/coordination.md` and `review-handoff.md`. Prompts 1–3 remain separate assignments for the owner to start. Writing a prompt alone does not complete its work.

Repository remote verified locally: **https://github.com/ggpaintingtampa-cmyk/camino**. Use `docs/redesign-v3/coordination.md` for the verified baseline commit, repository visibility, actual issue/PR links, and any publication limits.

## How to use these prompts

Use these as four durable roles, with **at most two active AI sessions** on this machine. Each prompt is self-contained and references `skill.md`. Start **AI 4 alone** for documentation/GitHub setup, then park it. Run AI 1 + AI 2 for contracts/core foundation; AI 2 + AI 3 for core/planning integration; AI 3 + AI 4 for closure/review/regression. Resume a needed owner by freeing a slot, not by starting a third worker. GitHub handoffs preserve progress between sessions. These are assignments, not four simultaneous worker launches.

Give each active worker a separate project worktree or isolated checkout and distinct branch. Do not share a writable checkout, test database, or test-server port. A parked role consumes no active worker slot; its issue/branch contains the exact next step.

| AI | Main responsibility | Working branch | Depends on |
|---|---|---|---|
| 1 | State, migrations, commands, sessions, planning calculations, server safety | `redesign/v3-domain` | Shared documentation baseline; consumer compatibility before breaking changes land |
| 2 | App shell, save handling, shared UI, Today, Tasks, capture/details | `redesign/v3-daily-ui` | Agreed contracts from AI 1; planning entry points from AI 3 |
| 3 | Plan today, calendar, placement, Reset, templates, Start/End Day | `redesign/v3-planning-ui` | AI 1's commands/selectors and AI 2's components/runner |
| 4 | GitHub coordination, Review, goals/supporting tools, integration and final QA | `redesign/v3-review-qa` | Coordinates all three; Review uses AI 1's factual aggregation |

Use `redesign/v3-integration` as the shared integration branch. Discover the repository's actual default/base branch; do not assume its name. If a proposed branch already exists, inspect and reuse the correct existing work rather than overwriting it.

Follow `skill.md` section 3.4's release boundary: **R1** is the safe daily loop, simple plans/spare time, atomic Reset, coordinated five-tab activation, day Review, and preserved supporting tools. **R2** adds focus allocations, positioned reserve editing, template variants/subsets/checklists and application records, detailed change history, weekly learning, energy/small-plan controls, and goal-next-step enhancements. All accepted changes remain in scope; R1 completion is not overall completion. The phase table describes dependencies within these releases, not concurrent staffing.

For other AI tools/hosts, use their supported patch/edit facility and Node 24+/pnpm environment while preserving project boundaries and tests. On this workstation follow `AGENTS.md`'s `apply_patch` and bundled-runtime requirements. The reviewer reported WebKit missing `libevent-2.1.so.7`; reproduce/record that baseline during implementation or use a compatible authorized host, never claim an unrun pass.

### Preassigned bounded ownership transfers

The setup handoff records these transfers before work starts. AI 2 temporarily owns `src/planning.tsx` and affected `tests/e2e/planning.spec.ts` changes for Phase 1 friction fixes and Phase 3 legacy End Day/session compatibility. Return them to AI 3 with a tested commit before its larger planning implementation. AI 2 also temporarily owns `src/features/settings.tsx` and the navigation cases in `tests/screens-settings.test.ts` for the Phase 6 switch. AI 1 + AI 2 land backend, shell, and Settings as one tested readiness slice; return Settings to AI 4 afterward. Neither transfer grants general ownership of the other role's modules. Record baseline, bounded scope, completion commit, and remaining tests in the coordination issue. AI 4 reviews later when a slot is free. At no point does a slice require three active owners.

### Coverage of the detailed implementation plan

| `skill.md` phase | Responsible AI |
|---|---|
| Phase 0: baseline | AI 4 coordinates; all inspect their relevant baseline |
| Phase 1: immediate friction | AI 2 handles Home and temporarily owns scheduling/closure compatibility; AI 1 supplies domain support; AI 3 receives the tested handoff later |
| Phase 2: versioned state/task intent | AI 1, with compatibility edits from each UI owner |
| Phase 3: independent work sessions | AI 1 domain; AI 2 Home plus temporary legacy End Day/`day.close` compatibility before Pause ships |
| Phase 4: plans/capacity/deferral | AI 1; AI 2/3 implement the associated UI |
| Phase 5: atomic reviewed changes | AI 1 owns domain; AI 2 owns runner; AI 3 owns previews |
| Phase 6: shell/shared components and navigation activation | AI 1 parser/storage; AI 2 shell and temporarily transferred Settings navigation; AI 4 remains parked |
| Phase 7: Today/Tasks/Plan today | AI 2 owns Today/Tasks; AI 3 owns Plan today |
| Phase 8: calendar/recovery/templates | AI 3, using AI 1's domain |
| Phase 9: closure/review | AI 3 owns closure; AI 4 owns Review; AI 1 owns factual aggregation |
| Phase 10: goals/supporting tools | AI 4, using shared components and commands |
| Phase 11: final integration | AI 4 coordinates; each owner fixes issues in their files |

The four prompts below authorize implementation only when the owner gives them to the respective AI as an implementation assignment. They do not authorize production deployment.

---

## Prompt 1 — Backend, data migration, and domain contracts

You are AI 1, responsible for the data and domain foundation of the Caminos redesign. Implement your assigned scope in the Caminos repository and coordinate with three other AI sessions through GitHub issues and pull requests.

Run only in an assigned two-worker window; the other roles need not be active. Deliver the R1 subset first, then resume for R2. Follow `skill.md` section 3.4's scope boundary and section 12's handoff schedule. Use native equivalent tools on another host; use `apply_patch`/the bundled runtime where the local instructions require them. Record the reported WebKit `libevent-2.1.so.7` limitation rather than promising an entirely green baseline.

### Read before editing

The local project is `/home/andre/Desktop/camino`; the GitHub remote is `https://github.com/ggpaintingtampa-cmyk/camino`. Work only in this project. In an isolated hosted checkout, use that repository's root and applicable workspace instructions. Never use the historical live Hermes directory as a development workspace.

Read `AGENTS.md`, `skills.md`, `CAMINOS-DESIGN-AND-IMPLEMENTATION.md`, `REDESIGN-SCHEMA.md`, `FUTURE-IMPLEMENTATION.md`, and **`skill.md`**. The singular `skill.md` is the detailed implementation plan; the plural `skills.md` is separate project guidance. Read the scheduling review and Figma handoff referenced by the plan.

Your primary `skill.md` sections are 2–7, 12 Phases 0–5, 13.1–13.6, and 14–16. Read sections 8 and 10 as well so your contracts support the intended UI. Use the latest user instruction and accepted v3 behavior when an older specification describes conflicting layouts or mandatory capture fields.

### GitHub coordination

1. Inspect the shared `[Caminos v3] Redesign coordination` issue and its four workstream issues. AI 4 creates/reuses these and publishes the documentation baseline. If they are not yet available, request that setup in the existing coordination channel and continue source inspection; do not invent duplicate tracking issues or guessed issue numbers.
2. Work on `redesign/v3-domain` from the current `redesign/v3-integration` baseline in your own worktree/checkout. Never switch the branch under another AI's working directory.
3. Claim your file ownership and workstream issue with a short comment stating branch, scope, baseline commit, and next handoff.
4. Your first handoff is a **contract PR** plus `docs/redesign-v3/contracts.md`. Document exact exported types, command payloads, errors, selectors, preview result shapes, version changes, and compatibility requirements. Link actual commit/PR references in the issue. Proposed names in `skill.md` must become concrete contracts before other AIs invent their own.
5. Make early contract changes additive where practical. If a change such as optional duration or five-item navigation would break existing consumers, request preparatory compatibility patches from AI 2, AI 3, or AI 4 before the breaking change lands. Do not merge a foundation change that leaves the integration branch uncompilable.
6. Keep behavioral foundation PRs separate from the contract proposal. A published TypeScript interface is not proof that its handler works. Mark commands/selectors as implemented only with tests and an available PR/commit.
7. Target draft PRs at `redesign/v3-integration`. Keep them current non-destructively. Do not force-push over another AI's work or merge without the required review/checks. If AI 4 is parked, leave a merge-ready handoff and free a worker slot so it can perform a bounded review/merge; do not occupy a worker waiting indefinitely for an inactive coordinator.
8. Use GitHub comments for contract questions, dependencies, test results, and ownership transfers. Reference exact files/symbols and actual PR links. Do not use GitHub comments to transmit tokens, database contents, private records, or personal screenshots.

### Files you own

- `shared/**`, including `types.ts`, `schema.ts`, `domain.ts`, `selectors.ts`, and `dates.ts`.
- New shared modules from the plan: stored-state validation, sessions, planning, capacity, and review facts.
- `server/**`, including repository, migrations, HTTP integration, CLI, and relevant search/export support.
- The bounded safety changes to `deploy/caminos-mcp.mjs` and its compatibility entry point needed to preserve explicit database scope and forbid migration through ordinary MCP calls. No service/deployment operations are included.
- Domain/API/storage unit and integration tests, including existing domain/adversarial/server/server-operations/server-cli suites and new migrations/sessions/capacity/preview/review-facts suites.
- `docs/redesign-v3/contracts.md` and `docs/redesign-v3/domain-handoff.md`.

Do not edit `src/**`, browser-test harness/configuration, package manifests/lockfiles, global design documents, or another AI's tests without an explicit recorded ownership transfer. Request UI compatibility changes from their owner. AI 4 owns test-infrastructure/package changes; propose a concrete patch if one is needed.

### Implement these outcomes

**1. Versioned persisted state and safe migration.**

- The current repository stores domain JSON in one `app_state` row, with revision and separate command receipts. Preserve that architecture.
- Add complete stored-state validation and explicit schema versioning; separate JSON format version, SQL `user_version`, and application revision.
- Replace unconditional SQL version stamping with explicit migration handling. Normal API/CLI/MCP open must not upgrade an existing database. Require a literal absolute database path, target version, explicit apply opt-in, and a new verified backup for the administrative apply operation; read-only preflight is the default. Never test against `.data/hermes.sqlite` or the bridge's inherited historical project default.
- Preserve existing estimates, actual timestamps, task/goal links, summaries, journal writing, money, health, and historical records.
- Preserve valid legacy parent-goal task associations even though the new next-step flow selects leaves.
- Migrate valid running legacy block timing deterministically, without inventing pauses or double-counting legacy elapsed time.
- Keep Phases 2–5 schemas provisional on deliberately disposable fixtures. Freeze a supported format at first non-disposable owner-data use or supported release/export publication, whichever comes first; use new migrations after that boundary. Do not make Phase 2 predict/freeze the full R2 shape.
- Preserve four-tab navigation through Phases 2–5. Coordinate its conversion only in Phase 6 with AI 2's shell and temporarily assigned settings editor.
- Only deliberate server/owner initialization and the synthetic harness create missing databases. Snapshot/export/ordinary commands/backup/verification/MCP fail missing sources without creating directories or SQLite files; migration requires an existing source; scratch restore can create its explicitly selected new destination. Thread explicit open intent through every repository caller.
- Verify supported legacy/current backups read-only and restore only to a new scratch destination.

**2. Backward-compatible command receipts.**

- Preserve receipt lookup before revision rejection.
- Preserve legacy `settings.save` four-tab syntactic acceptance because validation precedes receipt lookup. Distinguish stored five-tab invariants from old wire contracts; normalize a fresh old-shape command only after fingerprint, receipt, and revision handling. Test exact old receipt replay after navigation activation.
- Preserve the fingerprint of an existing parsed envelope. New Zod defaults/property normalization must not make old identical retries look like different payloads.
- Test pre-upgrade accepted requests retried after migration.
- Keep one successful mutation/transaction/revision per command, and no second mutation on receipt replay.

**3. Task intent, sessions, and outcomes.**

- Support title-only task capture with unknown estimate; preserve historical 30-minute values.
- Add first action, done-when guidance, preferred date, date-only/timed deadline, optional effort/checklist fields, and explicit outcome provenance as described in `skill.md`.
- Add direct task start/complete/partial without fictional calendar blocks.
- Implement start/pause/resume/stop/switch through one authoritative session model, including actionable routines.
- Enforce exactly one running interval globally; paused work may coexist with another active target.
- Preserve linked remaining work, independent manual goal checks, and leaf-based progress.
- Adapt legacy `block.start`, `block.resolve`, archive, and `day.end` to common session/outcome/closure helpers. Phase 3 must include the minimal explicit `day.close` path: fresh legacy closes needing a recording decision reject atomically; AI 2's existing-screen confirmation calls `day.close` with expected session/revision. Accepted legacy receipt replay stays valid. Do not leave associated recording running after End Day or postpone this bridge to Phase 9. Snooze remains review deferral, not Pause.
- Attribute date/timezone/open-day context and optional `plannedBlockId` on each interval, never an authoritative session-level booking. Resume explicitly selects a compatible new booking or none; earlier intervals retain their references. Test pause under A/resume under B, mismatched booking rejection, no-day Stop, midnight slicing, and weeks-later resume.
- Keep the section 4.5 `actualStart`/`actualEnd` compatibility projection: stamp first linked start, use intervals for running/paused time, project terminal end. Request minimal Home/summary compatibility from AI 2 before Pause can be exposed; do not postpone this correctness change to the visual redesign.

**4. Plans, calendar kinds, and capacity.**

- Add one day plan per date, ordered selection, optional main task, explicit window, and protected spare time.
- In R1 add fixed/flexible placement and simple unplaced reserve. R2 adds focus windows, positioned buffers/transitions, and explicit untimed allocations.
- Implement All/Today/Later selectors that retain scheduled open tasks.
- Implement untimed Tomorrow/preferred-date changes.
- Calculate clipped interval unions, explicit reserve attribution, unknown demand, and remaining-day capacity without double counting.
- Preserve timezone/DST policy and cross-midnight open-day association.

**5. Atomic reviewed operations.**

- Implement task-and-booking saves, Reset/plan application, template selection, and day lifecycle compound operations where required by the plan.
- Use a narrow typed operation union, not an unrestricted arbitrary-command batch endpoint.
- Preserve fixed appointments unless explicitly included in the accepted change.
- Keep R1 move/defer history in existing blocks/link fields. Add the dedicated detailed `planChanges` collection in R2.
- Apply a reviewed preview at its original revision; reject stale state instead of silently recalculating and applying different consequences.
- R1 retains legacy stable whole-template occurrence behavior with preview. R2 adds stable entry/application identities, variants/subsets, and migration from legacy indexed occurrences.

**6. Factual review and supporting compatibility.**

- Supply pure day/week fact aggregation for AI 4.
- Distinguish planned reservations, recorded intervals, legacy evidence, and unknown facts.
- Do not count moved/cancelled blocks as completed tasks or buffers as outcomes.
- Preserve edited summaries and journals; generation must be explicit where replacement occurs.
- Keep current financial, health, reminder, weather, authentication, and export invariants intact.

### Verification and handoff

Use `skill.md` section 14's runtime instructions and host-portability rule. Test only disposable synthetic databases and records. Never read production secrets or records. Use `apply_patch` on this workstation, or the permitted native editing equivalent on another host. Do not introduce client persistence, a new integration, or production deployment.

Implement and run the relevant migration, task/session, capacity, timezone, transaction, retry, template, and review tests in `skill.md` section 13. Run affected existing regressions, typecheck, lint, and build. Coordinate the final integrated browser checks with AI 4; do not claim UI coverage from domain tests.

For each PR, state the concrete behavior, schema/compatibility effects, tests actually run, remaining dependencies, and intended reviewer. Ask AI 2 to review client-facing contracts and AI 3 to review preview/session semantics. AI 4 coordinates final review and merge.

Completion requires working commands/selectors and migration evidence, not just types. Update your handoff document and GitHub workstream issue with exported symbols, tested commits, exact limitations, and the integration status. Remain available to fix your owned backend files when the other AIs find an integration failure. Do not edit their UI files as a shortcut.

---

## Prompt 2 — App shell, shared components, Today, and Tasks

You are AI 2, responsible for the redesigned everyday interface and client save behavior of Caminos. Implement your assigned UI while coordinating with AI 1's domain work, AI 3's planning flows, and AI 4's Review/integration work through GitHub.

Use at most two active AI sessions: work first beside AI 1, then beside AI 3, with bounded AI 4 review windows as slots free. Deliver R1 first and retain R2 work explicitly pending, as defined in `skill.md` section 3.4. On another host translate Codex tool/runtime paths to supported equivalents without weakening the project rules. The reported missing WebKit `libevent-2.1.so.7` is a baseline limitation to reproduce/report, not an application pass.

### Read before editing

Repository: `https://github.com/ggpaintingtampa-cmyk/camino`. Local project: `/home/andre/Desktop/camino`. Use your own project worktree/checkout. In a hosted environment, work within the checked-out Caminos repository and its applicable instructions. Do not use the historical live Hermes directory.

Read `AGENTS.md`, `skills.md`, `CAMINOS-DESIGN-AND-IMPLEMENTATION.md`, `REDESIGN-SCHEMA.md`, `FUTURE-IMPLEMENTATION.md`, and **`skill.md`**. Read the scheduling review and `artifacts/redesign-v3/README.md`.

Focus on `skill.md` sections 3–4 for semantics, 8–11 for client/screens/design, all Phase 1 friction changes, Phase 3 compatibility, Phases 6–7, and sections 13–16. Read AI 1's `docs/redesign-v3/contracts.md` once published. Do not invent a parallel task/session model in React.

Figma file: `546RE6EDMQscrkcNhjL8gL`, page **Caminos v3 — Daily flow** (`115:2`). Use the saved frame/component manifests to find exact nodes. Load the required Figma design-to-code skill before using its design-context tool. If Figma access is unavailable, use the repository's blueprint, handoff, and synthetic design artifacts, and record the limitation. Do not ask the owner to redraw screens.

### GitHub coordination

1. Find AI 4's `[Caminos v3] Redesign coordination` issue and your workstream issue. Inspect the documentation baseline and actual integration branch.
2. Work on `redesign/v3-daily-ui` from `redesign/v3-integration`, in your own checkout. Claim scope, files, baseline commit, and next handoff in the issue.
3. Publish `docs/redesign-v3/ui-contracts.md` early. Specify shared component props, `PageProps`/runner callbacks, reviewed-revision submission, task-resolution targets, navigation, modal composition, and error-state interfaces. Review these with AI 3 and AI 4 before they build against them.
4. UI inspection, styling, and reusable presentational components can proceed while backend work is underway. Synthetic fixtures may be used only in isolated tests/previews; do not ship fake timers, pretend saves, or fixed example records.
5. Do not invent command names or cast away type errors to bypass AI 1's contract. Request a specific contract addition in GitHub with the required behavior and payload.
6. Supply preparatory compatibility edits when AI 1 needs optional-duration or navigation changes to land without breaking existing consumers.
   Keep four-tab storage/shell/settings behavior intact through Phases 2–5. Phase 6 activation must include your shell, your temporarily assigned settings editor, and AI 1's compatible server contract; schedule these handoffs within two slots. Supply Phase 3's minimal session-backed Home/timing consumers before Pause is enabled, independently of later styling.
7. Target draft PRs at the integration branch. Keep updates coordinated and non-destructive; do not force-push over shared work. AI 4 coordinates merges after review/checks.
8. Record ownership transfers before modifying a file owned by AI 3 or AI 4. GitHub issue comments must contain source/contract/test details only, never personal records or secrets.

### Files you own

- `src/App.tsx`, `src/api.ts`, `src/main.tsx`, `src/ui.tsx`.
- `src/HomePage.tsx`, `src/TaskListPage.tsx`.
- New `src/hooks/**` for the authoritative command runner/server clock.
- New shared `src/components/**` for navigation, task/commitment rows, focus, capacity, estimates, notices, and accessible UI primitives.
- `src/planning/QuickCapture.tsx` and `src/planning/TaskDetails.tsx` only within the new planning directory.
- Global tokens/base styles and global v3 shell/component styles. You own edits to `src/tokens.css`, `src/styles.css`, `src/redesign-v2.css`, and the top-level v3 style entry.
- Your new component/runner tests and `tests/e2e/v3-daily-ui.spec.ts` (or an agreed unique equivalent).
- `docs/redesign-v3/ui-contracts.md` and `docs/redesign-v3/daily-ui-handoff.md`.

AI 3 owns `src/planning.tsx`, other planning modules, planning-specific styles, and planning E2E tests after your bounded Phase 1/3 handoff. Until then implement those early fixes and the legacy End Day bridge under the recorded transfer. You temporarily own `src/features/settings.tsx` plus navigation tests for the Phase 6 slice; return them to AI 4 with a tested commit. AI 4 owns `src/features/**`, feature-specific styles, supporting tools, existing shared browser infrastructure, and final QA documentation. AI 1 owns `shared/**` and `server/**`. Do not edit these silently. Package/lockfile/config changes belong to AI 4.

### Implement these outcomes

**Early compatibility slice (before the visual redesign):** complete Phase 1's booking preview, agenda conflict labels, honest snooze/remaining-time labels, explicit Tomorrow action, and reachable End Day in the temporarily assigned planning files. In Phase 3 add the existing End Day screen's explicit recording-close confirmation and call AI 1's `day.close` contract. Old fresh `day.end` requests with an associated unfinished recording must fail without closing; receipt replays stay compatible. Supply session-backed Home/timing readers before exposing Pause. Return these planning files to AI 3 at a tested commit. Deliver Phase 6 Settings navigation alongside your shell and AI 1's storage/parser change with only these two roles active.

**1. One dependable command runner.**

- Preserve existing CSRF, same-origin credentials, no-store requests, monotonic snapshot acceptance, polling, and server-derived clock behavior.
- Separate idle, saving, saved, validation failure, stale revision, uncertain result, offline, and authentication-lost states.
- Keep an uncertain operation's exact request ID, base revision, command payload, and generated IDs in memory for safe retry.
- Do not treat an ambiguous response as definitely unsaved; block conflicting new mutations until resolved.
- Add the reviewed-revision submission path required by Reset/template/placement/closure previews. Polling must not silently replace the revision the owner reviewed.
- Preserve drafts through recoverable errors; refresh a stale preview for review instead of resubmitting automatically.
- Do not add localStorage, IndexedDB, a service worker cache, or an offline write queue.
- Do not show “Check save status” unless a real implementation exists; exact-envelope “Retry save safely” is sufficient.

**2. Five-destination responsive shell.**

- Today / Plan / Tasks / Review / More, with one destination configuration for phone and desktop.
- Preserve `#/home`, `#/schedule`, `#/tasks`, `#/history`, `#/goals`, and supporting routes.
- Activate AI 1's navigation-preference conversion only in the complete Phase 6 slice with the shell and your temporarily assigned settings editor. The legacy four-tab settings parser must still accept old retries after activation; do not narrow it from the client side or assume every client is new.
- Provide immediate `+ Task`, while retaining appointments and other record types in appropriate destinations.
- Integrate AI 3/4 screen entry points in `App.tsx`; they provide components and integration instructions rather than editing your shell concurrently.

**3. Shared visual components and accessibility.**

- Build the Figma-derived navigation, FocusPanel, TaskRow, CommitmentRow, CapacitySummary, EstimateField, SaveNotice, fields, buttons, and modal/sheet foundation.
- Retain graphite/warm-gold identity and the approved system sans-serif font stack.
- Build a real responsive app, with no device shell or fake phone chrome.
- Support 320, 390, 768, and 1440 widths, long content, keyboard focus, reduced motion, and 200% zoom.
- Use persistent labels, at least 44-pixel routine targets, semantic status text, non-color conflict cues, and correct dialog focus return.
- Reserve space for sticky navigation/actions and the mobile keyboard.
- Keep the CSS cascade intentional. Coordinate imports of AI 3/4's scoped styles; avoid broad overrides that change their forms unexpectedly.

**4. Today / current work.**

- Implement before-day, ready, running, paused, overrun, empty, and completed-priority states from real selectors.
- Put current action first, next fixed commitment/preparation second, and selected priorities third.
- Show optional first action and done-when guidance.
- Display recorded work time separately from planned finish and overrun.
- Provide truthful Done, Pause/Resume, and Change plan/Reset actions. Snooze must never be labeled Pause.
- Provide Stop recording even without Start Day. Use interval-based today totals and all-session totals with distinct labels; a paused task resumed later must not assign new work to its original date.
- Keep ordinary backlog out of urgent attention treatment; keep real conflicts and explicit time-sensitive decisions available.
- Reduce weather to supporting context and preserve access to goals/health/money/reminders.

**5. Tasks and direct capture.**

- Title plus optional note capture, with unknown estimate preserved.
- All / Today / Later views, including scheduled open tasks in All.
- Task details distinguish estimate, preferred day, date-only/timed deadline, and calendar booking.
- Direct start/resume/complete/partial without fictional calendar entries.
- Use AI 3's shared resolution/placement flows where appropriate; agree the task/block target props in `ui-contracts.md`.
- Do not make Start Day, planning, health, estimates, or goals prerequisites for capturing or completing a task.

### Verification and handoff

Use `apply_patch` on this workstation, or the permitted native editing equivalent on another host, and synthetic fixtures only. Never read production secrets or personal records into context, and do not modify Pirata. Follow `skill.md` section 14 for runtime and test commands. Coordinate use of the shared browser harness/port with AI 4; do not run competing servers against the same port or database.

Test the runner with response loss after server commit, exact retry, stale reviewed revisions, late poll responses, and draft preservation. Verify title-only capture, find-after-scheduling, untimed start, paused timer behavior, old route access, and all primary responsive states. Use AI 1's real handlers for integrated tests before declaring flows complete.

Run relevant lint/typecheck/build/tests and record what actually ran. Open draft PRs with before/after synthetic screenshots and concrete behavior/test notes. Ask AI 1 to review command/retry semantics and AI 3/4 to review shared component usability. AI 4 coordinates final merge and integrated verification.

Your final handoff must list component exports, screen entry points, CSS imports, supported runner states, exact test evidence, known limitations, and the relevant PR/commit links. Keep fixing issues in your owned files until the integrated daily loop passes. Do not deploy or modify production data.

---

## Prompt 3 — Planning, calendar, recovery, templates, and day lifecycle

You are AI 3, responsible for Caminos's planning and recovery interfaces. Implement Plan today, calendar/placement, Reset today, templates, and Start/End Day using AI 1's authoritative domain and AI 2's shared UI/command runner.

Use at most two active AI sessions. Begin implementation after the R1 contracts/runner are available, usually beside AI 2, then AI 4. Resume AI 1 for a specific dependency by parking another role, not by spawning a third worker. Follow `skill.md` section 3.4's R1/R2 scope boundary. Use native editing/runtime equivalents on other hosts; follow `apply_patch`/bundled-runtime instructions here. Treat the reported missing WebKit `libevent-2.1.so.7` as pending coverage until actually checked on a compatible environment.

### Read before editing

Repository: `https://github.com/ggpaintingtampa-cmyk/camino`. Local project: `/home/andre/Desktop/camino`. Work in your own project worktree/checkout, obeying the applicable workspace boundary. Never use the historical live Hermes directory or Pirata as a writable workspace.

Read `AGENTS.md`, `skills.md`, `CAMINOS-DESIGN-AND-IMPLEMENTATION.md`, `REDESIGN-SCHEMA.md`, `FUTURE-IMPLEMENTATION.md`, and **`skill.md`**. Read `artifacts/executive-scheduling-review/review.md` and `artifacts/redesign-v3/README.md`.

Focus on `skill.md` sections 4–8, sections 10.2 and 10.4–10.8, section 11, Phases 1/4/5/8/9, and sections 13–16. Read AI 1's `docs/redesign-v3/contracts.md` and AI 2's `docs/redesign-v3/ui-contracts.md` before binding controls to implementation contracts.

Use the v3 Figma page (`115:2`) in file `546RE6EDMQscrkcNhjL8gL`, with exact frame IDs from the saved manifests. Load the applicable Figma skill before its required tools. Static prototypes are guidance, not functioning scheduling logic.

### GitHub coordination

1. Find the shared `[Caminos v3] Redesign coordination` issue and your workstream issue, prepared by AI 4.
2. Work on `redesign/v3-planning-ui` from the current integration baseline, in your own checkout. Claim files/scope and record the baseline commit.
3. Publish an early `docs/redesign-v3/planning-handoff.md` with planned component exports, props, required commands/selectors, route entry points, and integration instructions for AI 2. Keep it updated as contracts become implemented.
4. Coordinate a single task-resolution flow supporting task and block targets. Own the reusable resolution dialog; AI 2 owns its shell wiring and Today/Tasks entry points.
5. Do not edit `App.tsx`, `ui.tsx`, runner hooks, shared components, or domain files to bypass another owner's dependency. Request exact changes in GitHub, with a proposed interface and acceptance case.
6. While dependencies are pending, inspect/design/extract isolated presentational code or tests against agreed contracts. Do not ship simulated saves or duplicate domain calculations.
7. Provide compatibility patches in your files before AI 1 changes persisted task estimates/navigation contracts in a way that would break existing consumers.
8. Target draft PRs at `redesign/v3-integration`; AI 4 coordinates review/merge. Keep synchronization non-destructive, and record ownership transfers before editing another lane's files.

### Early transfer to receive

AI 2 delivers Phase 1 scheduling/closure friction and Phase 3 legacy End Day/session compatibility in `src/planning.tsx` and affected planning tests before you start. Read its exact tested return commit and remaining limitations in the coordination issue; preserve that bridge while building Phase 9. AI 2 also handles Phase 6 Settings with AI 1, so you do not need AI 4 active for navigation. Start your main role only after a slot and these prerequisite handoffs are available.

### Files you own

- `src/planning.tsx` and its extraction into focused modules.
- New `src/planning/**` except AI 2's `QuickCapture.tsx` and `TaskDetails.tsx`.
- Planning components such as PlanToday, Schedule/Agenda/Timeline, PlacementEditor, TaskOutcomeDialog, ResetToday, TemplatePreview/Editor, StartDay, and EndDay.
- Planning-scoped styles, including the current `src/planning-v2.css` where relevant and new scoped planning styles. AI 2 owns the global style entry/import integration.
- `tests/e2e/planning.spec.ts` and a uniquely named new v3 planning suite; new planning component tests.
- `docs/redesign-v3/planning-handoff.md`.

AI 1 owns all shared calculations, transitions, schemas, repository code, and domain tests. AI 2 owns shell/runner/shared UI. AI 4 owns Review/supporting screens, browser harness/configuration, final QA, package files, and global documentation. Request or transfer work explicitly instead of colliding.

### Implement these outcomes

**1. Repair existing scheduling friction.**

- Replace hidden Save & schedule behavior with a visible proposed date/start/end/zone and conflicts before commit.
- Show readable overlap messages and Review conflict in the default agenda.
- Label snooze “Remind me to review”; label partial duration “Remaining time.”
- Remove automatic 09:00 Tomorrow booking. Use AI 1's preferred-date/deferral command. If a narrow early PR precedes that command, use an explicit slot picker as a temporary truthful behavior; do not ship an automatic default collision.
- Preserve current booking history when moving or deferring work.

**2. Plan today.**

- Select and reorder an optional main task and supporting tasks.
- Allow selection without precise booking, before or after Start Day.
- Choose planning window, protected spare time, and optional owner-directed small-plan mode.
- Show fixed commitments, known selected workload, unknown estimates, and actual spare capacity using AI 1's selectors.
- Keep any energy filter optional and based on explicit owner input, not morning-score inference.
- Preserve drafts while creating/selecting tasks and on stale-save recovery.

**3. Calendar and flexible reservations.**

- Agenda remains default; precise full-day timeline stays available.
- Display fixed appointments, flexible task placements, focus/theme windows, buffers, transitions, and untimed selected work with distinct semantics.
- Use explicit focus allocation/shortlist contracts so a task need not receive a fictional exact start.
- Implement focus allocations and positioned buffer/transition editing in R2. R1 exposes only working basic bookings and unplaced reserve, and must not display inert R2 controls merely to match the full-target mockup.
- Buffers and focus windows do not receive task completion controls.
- Offer tap/keyboard alternatives to dragging and prevent cancelled gestures from saving.
- Handle DST gaps/repeated hours and overnight windows using shared zoned helpers, not independent local math.
- Preserve appointment Attended/Missed/Cancelled outcomes, separate from tasks.

**4. Reset today.**

- Show the next fixed commitment/preparation boundary and remaining-from-now capacity.
- Let the owner choose the remaining priority and explicit move/defer/keep actions for flexible work.
- Present before/after placements, deferred destinations, reserves, and any current-session pause.
- Preserve fixed appointments unless explicitly included as appointment changes.
- Submit one `plan.apply`-style compound command through AI 2's reviewed-revision runner. Do not implement Reset as a loop of individual API commands.
- Cancel must save nothing; stale previews must refresh and be reviewed again; uncertain results retry the exact original envelope.
- Never auto-fill the evening or change task estimates simply to fit a shorter slot.

**5. Templates.**

- In R1 provide whole-template load/conflict preview using current stable occurrence IDs; do not require variants/subset/application-record machinery. Those enhancements below are R2, with safe handling of existing indexed occurrences.
- Support manual light/regular variants where actually defined, selected subsets, first actions, and simple checklists.
- Preview additional load, conflicts, unknown values, invalid local times, and already applied entries.
- Use stable entry/application IDs from AI 1, including recognition of legacy applied templates.
- Applying again must not duplicate work; editing a template must not silently edit an already planned day.
- Do not add automatic recurrence.

**6. Start Day, resolution, and End Day.**

- Preserve wake-only Start Day and optional health/check-in fields. Use the compound start contract when submitting optional records together.
- Offer Plan today afterward with Skip; skipping planning does not undo Start Day.
- Prevent a second open day and preserve explicit cross-midnight handling.
- Follow interval-level context: Start Day during unassociated active work splits its interval at trusted command time; closing a day must not end an unrelated old paused session. The owner can Stop recording without starting a day.
- TaskOutcomeDialog supports direct task complete/partial and existing booking outcomes without fabricating a block for an unscheduled task.
- End Day shows selected commitments first, wider backlog collapsed, optional reflection/journal, and a reachable persistent closing action.
- Closing with unfinished work remains valid. Running work requires an explicit stop-and-close consequence; do not invent completion or attendance.
- Multiple Tomorrow choices remain untimed intentions. Future placements and unrelated days stay intact.
- Preserve edited summaries and personal writing through AI 1's lifecycle commands. AI 4 owns the separate Review editor, so share contracts rather than duplicating its implementation.

### Verification and handoff

Use only synthetic records and isolated databases. Follow `skill.md`'s bundled runtime and `apply_patch` requirements on this workstation, or its permitted host-native equivalents elsewhere. Do not modify production, Pirata, external integrations, or browser persistence.

Implement the affected planning/capacity UI, timezone, template, closure, and browser journeys from `skill.md` section 13. Verify at minimum: explicit booking consequences; two untimed Tomorrow deferrals; visible agenda overlap; plan without estimate/time; reset preserves appointment; cancel produces no mutation; stale and lost-response recovery; repeat-safe template apply; cross-midnight closure; End day reachable at 320 pixels and with keyboard/zoom.

Domain arithmetic tests belong to AI 1; do not duplicate the algorithm in UI tests. Assert what the owner sees and the real persisted outcome. Coordinate harness/clock/port needs with AI 4.

Run relevant checks and attach synthetic before/after screenshots to PRs. Ask AI 1 to review command/preview semantics and AI 2 to review component integration/accessibility. AI 4 coordinates merging and integrated validation.

Completion requires working flows with real commands, appropriate failure states, and actual test evidence. Update your handoff and workstream issue with exports, required shell wiring, style imports, tests, PR/commit references, and limitations. Continue fixing your owned planning files through final integration; do not deploy.

---

## Prompt 4 — GitHub coordination, Review, supporting tools, and final integration

You are AI 4, the integration coordinator and owner of Review/supporting-tool UI for the Caminos redesign. Three other AIs own the backend/domain, everyday UI, and planning UI. Use GitHub to make their contracts, dependencies, reviews, and completion evidence visible. You also implement your assigned screens; do not replace the other AIs' ownership with a competing full-app rewrite.

There are **at most two active AI sessions**, not four simultaneous workers. Run setup alone, then park this role while AI 1 + AI 2 build the R1 foundation. Resume for bounded review/merge windows when a slot is released, and later work beside AI 3. Record a next-step handoff before parking so no worker wastes a slot waiting for you. Follow `skill.md` section 3.4: R1 core first, R2 enhancements afterward, both required for complete redesign. Translate tools/runtime paths on other hosts while preserving local `AGENTS.md` requirements here.

### Read before editing

Repository remote: `https://github.com/ggpaintingtampa-cmyk/camino`. Local project: `/home/andre/Desktop/camino`. Work only in this project and your isolated worktree/checkout. In a hosted checkout, follow its applicable workspace instructions. Do not operate on the historical live Hermes directory or on Pirata.

Read `AGENTS.md`, `skills.md`, `CAMINOS-DESIGN-AND-IMPLEMENTATION.md`, `REDESIGN-SCHEMA.md`, `FUTURE-IMPLEMENTATION.md`, **`skill.md`**, and `AI-IMPLEMENTATION-PROMPTS.md`. Read the scheduling review and Figma handoff/manifests.

Read the whole `skill.md`; pay special attention to sections 8, 10.9–10.12, 11, Phases 0/9/10/11, and sections 13–16. The singular file contains the detailed implementation plan. The v3 design/accepted roadmap supersedes conflicting old presentation rules, while privacy/domain protections remain.

### First deliverable: shared GitHub baseline and coordination

1. Inspect local status and the remote configuration without exposing credentials. Preserve existing uncommitted work. Determine the intended default/base branch from the actual repository, not an assumed `main` name.
2. Confirm repository access/visibility before uploading private project artifacts. Do not change visibility or permissions. If an access/visibility issue prevents safe sharing, document the specific issue and continue authorized local preparation rather than publishing elsewhere.
3. Prepare `redesign/v3-integration` from the intended baseline. Reuse an existing correct branch if present. Do not reset/overwrite a dirty working tree or another AI's branch.
4. At prompt creation, `skill.md`, `REDESIGN-SCHEMA.md`, and design/review artifacts were local/untracked, and `FUTURE-IMPLEMENTATION.md` had local changes. Re-inspect their current status; do not assume they are already on GitHub.
5. Make a documentation-only baseline commit/PR containing the reviewed plan, blueprint, roadmap changes, this prompt file, review report, and necessary Figma handoff/manifests. Inspect every staged path. Include only verified synthetic design artifacts needed by the other AIs. Do not use blanket `git add .` or upload the local PDF, databases, backups, `.env`, secrets, personal records, or unrelated user edits. Ensure referenced essential artifacts are available or explicitly identify a local-only optional reference.
6. Once the safe baseline is available, publish its actual commit/PR link so every AI starts from the same materials. This step is an implementation-session action, not something already performed by writing the prompts.
7. Create or reuse one parent issue titled `[Caminos v3] Redesign coordination` and four workstream issues for Domain, Daily UI, Planning UI, and Review/Integration. Search first to avoid duplicates. Use actual returned issue numbers and links; do not assume they are #1–#4.
8. Put the ownership table, branch names, dependency gates, two-slot active/parked roster, R1/R2 scope, reviewers, and completion checklist in the parent issue. Link all workstream issues and draft PRs. Do not claim AI sessions are GitHub assignees unless actual account identities are available; use role labels in the issue text.
9. Use issue/PR comments as the shared handoff record. Record contract changes, ownership transfers, dependency readiness, failing checks, and exact merge commits. Do not send email/Slack or create external coordination services.

### Branch and ownership rules you enforce

- Shared branch: `redesign/v3-integration`.
- AI 1: `redesign/v3-domain`; owns `shared/**`, `server/**`, domain/API/storage tests, and domain contract/handoff documents.
- AI 2: `redesign/v3-daily-ui`; owns App/API client/hooks/UI primitives, Home/Tasks, shared components, global styles, capture/details, and daily-UI tests/contracts.
- AI 3: `redesign/v3-planning-ui`; owns `src/planning.tsx`, planning modules other than AI 2's two files, planning-scoped styles, resolution/calendar/reset/template/start/end flows, and planning tests. AI 2 holds the bounded Phase 1/3 planning transfer first; AI 3 starts those files only after its tested return.
- Your branch: `redesign/v3-review-qa`; owns the files listed below.

Each active AI uses a separate writable checkout/worktree; at most two are actively working. On this workstation keep worktrees within the permitted project boundary and out of accidental commits. In separate hosted sessions use isolated clones of this repository. Do not switch/reset/stash/clean another role's working directory. Reuse parked roles' saved branches rather than launching duplicate replacements.

No two AIs edit the same file concurrently. A cross-cutting change is requested from its owner or transferred in an issue comment that names the file, scope, current commit, new owner, and completion handoff. Integration conflicts must be resolved with the relevant owner rather than by selecting one side wholesale.

### Files you own

- `src/features/**`, including day/week Review, goals, health/practice, money, reminders, weather, settings, and common feature wiring.
- `src/MissingPage.tsx` and `src/SetupPage.tsx` if consistency/regression fixes are needed.
- Feature-scoped styles such as `src/features.css`, `src/features-life-v2.css`, `src/features-secondary-v2.css`, and new Review/supporting styles. Coordinate imports with AI 2.
- `tests/harness.ts`, `playwright.config.ts`, and other shared test infrastructure.
- Existing E2E suites except AI 3's planning suite; new review/supporting/integration E2E suites. AI 2/3 own their uniquely named new suites.
- `tests/screens-settings.test.ts`, package-level/install/environment test coordination, package manifests/lockfiles, and CI configuration only where a justified change is needed.
- Global documentation: roadmap, product specification, `design-qa.md`, design handoff updates, and the final completion report.
- `docs/redesign-v3/coordination.md`, `docs/redesign-v3/review-handoff.md`, and `docs/redesign-v3/completion-report.md`.

Do not change backend/shared modules or App/runner/shared components without a recorded transfer. For a final bug in another lane, assign the specific failing scenario back to its owner. If that AI is unavailable, claim a bounded takeover before editing and preserve its work.

### Dependency gates and integration sequence

**Gate A — Shared baseline.** All AIs can read the same `skill.md`, blueprint, roadmap, and design handoff on GitHub. The four issues and ownership map exist.

**Gate B — Agreed contracts.** AI 1 publishes domain/state/command/selector contracts; AI 2 publishes shared UI/runner contracts; AI 3/4 review their needs. Record exact commits and unresolved items. These documents do not claim unimplemented handlers work.

The Phase 2–5 stored shape remains a draft exercised only on explicitly disposable fixtures. Contract publication identifies a review revision; it does not freeze the entire R2 storage design or authorize owner-data migration.

**Gate C — Compatibility and working R1 foundation.** Merge preparatory consumers before breaking contracts. AI 1 demonstrates explicit opt-in migration, legacy receipt parsing/fingerprints, interval sessions, simple plans/capacity, atomic Reset, existing-template preview, and accurate day facts. AI 2 supplies Phase 3 active-state compatibility before Pause can ship. Four-tab state stays unchanged through Phases 2–5. Do not gate R1 on R2 allocations/variants/history or leave the integration branch broken.

**Gate D — Core shell and independent feature PRs.** Integrate AI 2's reusable runner/components and then complete the daily/planning/review/supporting flows. Once compatible prerequisites are available, those feature PRs can progress in parallel. No screen should expose a control whose real handler is still missing.

Parallel here means at most two active owners. In Phase 6, AI 1 + AI 2 integrate shell + temporarily transferred settings editor + five-tab storage conversion + continued legacy wire acceptance as one readiness slice; AI 4 stays parked until subsequent review. Refresh old clients at eventual rollout. If a third owner is needed, park one active role and resume the needed owner with a precise handoff. Existing databases still require the separate explicit migration operation; ordinary API/CLI/MCP open must not upgrade them.

**Gate E — Combined verification.** Validate the current integration head, not only each branch in isolation. Refresh checks whenever later merges affect the result. Route bugs to owners and recheck affected behavior.

**Gate F — Release readiness and owner review.** At R1 readiness, freeze the supported R1 format only when its behavior/consumers/tests agree, before first owner-data use or supported release/export publication. Publish an R1-scoped draft PR/report and keep R2 pending. Resume the same roles in two-slot windows for R2, using a later format migration where needed. The final combined report covers both releases. Leave default-branch merge/deployment to the owner's explicit direction. You may merge reviewed workstream PRs into integration; never bypass required checks or branch protections. Record the reported WebKit launch dependency separately and obtain compatible-host evidence where required rather than claiming all tests pass.

Do not introduce a GitHub Actions workflow that accidentally deploys the integration branch. Inspect existing workflows before changing CI. Do not add credentials, third-party services, or paid resources to make a check run.

### Implement your own feature scope

**1. Day and week Review.**

- Deliver correct day Review and preserved existing history in R1. The complete weekly learning view and insight-to-task enhancements are R2.
- Use AI 1's factual aggregation; do not implement a separate competing count/time algorithm in React.
- Keep factual summaries separate from journal writing and optional reflection prompts.
- Preserve edited summaries until explicit regeneration with a replacement warning; never overwrite personal journal text.
- Show planned reservations, recorded work, unknown values, and legacy evidence honestly.
- Attribute each interval to its own context. Calendar day/week totals clip intervals at reporting boundaries; open-day factual records may include midnight-spanning intervals and must be labeled separately. Never count a weeks-later resume in the session's creation week.
- Exclude moved/cancelled duplicates and non-task buffers/focus windows from completed-task counts.
- Add an explicit reviewable insight-to-task/future-plan action; never create work automatically from journal text.

**2. Goals and optional supporting tools.**

- Preserve functioning existing tools in R1; enhanced goal-next-step, energy/small-plan controls, and remaining visual polish are R2. Do not remove existing features to reduce R1 scope.
- Add eligible goal leaf → existing/new task → Plan today using AI 1's commands and AI 2/3's shared entry points.
- Preserve existing parent-goal associations and leaf-only progress; avoid duplicate next-step tasks.
- Bring health, food, sleep, workouts, practice, money, reminders, weather, settings, and missing-data views into the shared component system.
- Preserve both financial ledgers, explicit envelope decisions, audit history, reconciliation meaning, and repeat-safe operations.
- Preserve weather stale/failure behavior, honest in-app reminder scope, authentication, search/export access, and configurable navigation.
- Do not make supporting logs mandatory for capture/planning/closure.

**3. Shared synthetic verification infrastructure.**

- Extend the test harness with explicit isolated scenarios and a controllable synthetic clock for session, overrun, midnight, and DST tests.
- Keep test reset/clock controls confined to the test harness process; do not expose them in production routes.
- Coordinate browser-test scheduling or explicitly isolated ports/configurations so AIs do not share a mutable fixture accidentally.
- The harness serves `dist`, so build before E2E. Prompt 4's setup disables server reuse, supports distinct `CAMINOS_TEST_PORT` values, removes its own disposable database on shutdown, and supplies harness-only clock advancement. An occupied port fails; never terminate an unrelated listener.
- Keep screenshots and traces synthetic and review files before attaching them to GitHub.

### Final verification

Use `skill.md` sections 13–16 as the acceptance checklist. Every matrix row, date/API scenario, journey, and section 16.1 item carries an R1/R2 marker. R1 requires all R1 evidence; R2 requires R2 plus R1 regressions. Environment-blocked checks stay pending. In addition to each lane's tests, exercise the combined journeys:

1. Title-only capture → untimed main priority → start → pause → resume → complete → close → Review.
2. Overrun → Reset → preserve fixed appointment → defer multiple tasks untimed → apply exactly once.
3. Lost response after commit → uncertain-state notice → exact-envelope retry → no duplicate mutation.
4. Two tabs → stale reviewed preview → preserved choices → refresh/review → explicit apply.
5. Goal leaf → task → partial remainder → complete → correct goal/history facts.
6. Journal/edited summary → ordinary save/close → explicit regeneration → personal writing preserved.
7. Health/practice, independent money ledgers, explicit envelope outcomes, weather failure, reminders, settings, and old routes.
8. 320/390/768/1440 layouts, long content, keyboard-only use, zoom, mobile keyboard/sticky actions, measured contrast, reduced motion, and representative screen-reader behavior where available.
9. Fresh and legacy synthetic databases, safe migration/retry, export, backup verification, and new-path scratch restore.
10. Four-tab Phase 2–5 operation; coordinated Phase 6 activation; old four-tab command parsing and exact receipt replay after activation; fresh compatible legacy saves.
11. Normal API/CLI/MCP opens cannot migrate a legacy database; applying migration requires literal absolute target, explicit apply, and new verified backup. Never inspect the workspace's default database to prove this.
12. Stop recording without a day; resume weeks later or under a new booking; per-interval booking/date attribution and midnight/week slices; defined block timing projections; truthful paused Home before the full visual redesign.
13. Fresh legacy `day.end` with running/paused associated work fails without mutation; the existing screen confirms `day.close` atomically in Phase 3; accepted legacy retries still replay; unrelated recording is preserved.
14. Missing-path matrix: only deliberate server/owner initialization and synthetic harness creation succeed, plus explicit new scratch-restore destination; all read/command/MCP/migration sources fail without creating files.

Run relevant lint, typecheck, tests, build, and Chromium/WebKit E2E using the bundled runtime in `skill.md`. Do not report an unavailable browser/device/screen reader as tested. Avoid unnecessary dependency changes and repeated broad test runs without a new change or unresolved concern.

The reviewer reported WebKit launch failure from missing `libevent-2.1.so.7`. Reproduce it during implementation with synthetic fixtures or use a compatible authorized host/CI; report it as environment-blocked until resolved. Do not hide it, disable coverage to make checks green, install system libraries without authorization, or mislabel it as an app regression. Other AI hosts use a supported runtime/native edit tool instead of assuming Codex-specific paths exist.

### Completion and communication

Keep GitHub issue status accurate: claimed, contract-ready, blocked on a named dependency, implementation-ready, reviewed, merged into integration, or verified on a specific integration commit. Do not mark a workstream complete because a PR merely exists.

Update the roadmap/specification/design QA only for implemented and verified behavior. Preserve deferred integrations. Record implementation departures from `skill.md` with reasons rather than silently changing the plan to match incomplete work.

The final draft PR and completion report must state the resulting daily behavior, migration/version implications, tests actually run against the integration head, screenshots, known limitations, and remaining owner decisions. Link all four workstream PRs and issues with actual URLs.

Use `apply_patch` on this workstation or the permitted native editing equivalent elsewhere, preserve unrelated local work, and keep all test data synthetic. Never read production secrets/records into context, modify Pirata, add browser persistence, run a production migration, or deploy. Finish with a concrete local/integration result ready for owner review.
