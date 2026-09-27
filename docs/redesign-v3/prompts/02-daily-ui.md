# Ready-to-use Prompt 2

Copy the assignment below into the AI session. Read [coordination](../coordination.md) first for the actual integration baseline, issue links, and active-role roster. Start from the published integration branch after Prompt 4 setup; AI 1 and AI 2 may work together. Never start all three at once.

This is a copy of Prompt 2 in [AI-IMPLEMENTATION-PROMPTS.md](../../../AI-IMPLEMENTATION-PROMPTS.md). Keep the assignment body synchronized when editing.

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
