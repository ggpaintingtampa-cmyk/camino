# Ready-to-use Prompt 3

**27 September 2026 integration update:** R1 is implemented and integrated; see [release verification](../release-verification.md) for actual checks and limits. The assignments and handoff status below record earlier stages. Do not restart completed R1 work. R2 remains deferred. The owner subsequently authorized integration, focused checks, push and deployment; no additional agents are requested.

Copy the assignment below into the AI session. Read [coordination](../coordination.md) first for the actual integration baseline, issue links, and active-role roster. Start only after AI 1's foundation is integrated and AI 2 returns the planning compatibility files; take a freed slot. Never start all three at once.

This is a copy of Prompt 3 in [AI-IMPLEMENTATION-PROMPTS.md](../../../AI-IMPLEMENTATION-PROMPTS.md). Keep the assignment body synchronized when editing.

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
