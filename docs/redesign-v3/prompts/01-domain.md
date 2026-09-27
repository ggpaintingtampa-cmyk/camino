# Ready-to-use Prompt 1

Copy the assignment below into the AI session. Read [coordination](../coordination.md) first for the actual integration baseline, issue links, and active-role roster. Start from the published integration branch after Prompt 4 setup; AI 1 and AI 2 may work together. Never start all three at once.

This is a copy of Prompt 1 in [AI-IMPLEMENTATION-PROMPTS.md](../../../AI-IMPLEMENTATION-PROMPTS.md). Keep the assignment body synchronized when editing.

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
