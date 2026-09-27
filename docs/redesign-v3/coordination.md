# Caminos v3 coordination

Prompt 4's first setup/test-infrastructure batch completed September 27, 2026. AI 4 is now parked. The owner can start Prompts 1 and 2 together; Prompt 3 follows their prerequisite handoff and a freed slot. Application redesign features and R1/R2 acceptance remain pending.

Repository: https://github.com/ggpaintingtampa-cmyk/camino. Default branch: `main`; verified starting commit: `cca9aaf13d7078f2a2a63e1633b9289c0f08a247`. Shared integration branch: `redesign/v3-integration`. Do not merge integration into `main` or deploy without a separate owner instruction.

Repository visibility was verified as **public**. The requested GitHub handoff contains reviewed code, implementation documents, and synthetic design evidence only. Never publish owner records, database/backup files, credentials, or the local PDF. No visibility or permissions change is authorized or needed for these source changes.

## Roles and start order

| Role | Branch | Scope | Current state |
|---|---|---|---|
| AI 1 | `redesign/v3-domain` | Shared domain, repository/server, migrations, commands, calculations | Not started; start with AI 2 after setup |
| AI 2 | `redesign/v3-daily-ui` | Shell, runner, Today/Tasks, components; temporary early compatibility slices | Not started; start with AI 1 after setup |
| AI 3 | `redesign/v3-planning-ui` | Plan/calendar/Reset/templates/Start/End Day | Not started; wait for AI 1 foundation and AI 2's planning return, then take AI 1's slot |
| AI 4 | `redesign/v3-review-qa` | Setup/harness now; Review/supporting tools/integration later | Initial batch complete; parked until a later review/integration window |

At most two AI sessions are active. Each has a separate writable worktree/checkout and a distinct browser-test port. AI 1 + AI 2 finish R1 foundation and coordinated Phase 6 activation first; AI 2 + AI 3 complete daily/planning flows; AI 3 + AI 4 finish closure/review/regression. Resume backend fixes by freeing a slot. A parked role is not a running worker waiting on another worker.

## Preassigned transfers

| Files | Temporary owner | Scope | Return condition |
|---|---|---|---|
| `src/planning.tsx`, affected `tests/e2e/planning.spec.ts` cases | AI 2 | Phase 1 friction and Phase 3 old End Day/session compatibility only | Tested return commit to AI 3 before its planning work |
| `src/features/settings.tsx`, navigation cases in `tests/screens-settings.test.ts` | AI 2 | Phase 6 navigation editor/tests only | Tested return commit to AI 4 after AI 1 + AI 2 activation |

Starting application source is `cca9aaf13d7078f2a2a63e1633b9289c0f08a247`; the setup batch does not change those transferred files. Role claims must record the exact integration commit checked out. Update this issue with each transfer completion commit and outstanding tests. Other files stay with the owners in `AI-IMPLEMENTATION-PROMPTS.md`. AI 4 reviews returned Settings after a slot becomes available.

## Dependency and release gates

1. Shared baseline and this setup handoff available on GitHub; each role reads `skill.md` and applicable project instructions.
2. AI 1 publishes `contracts.md`; AI 2 publishes `ui-contracts.md`; both review command/runner/selector boundaries before dependent changes.
3. AI 1 + AI 2 deliver compatible R1 foundation, including Phase 3 legacy `day.end` bridge and interval-level booking attribution. Four-tab navigation stays until the complete Phase 6 slice.
4. Planning/review role PRs target integration. Merge only coherent reviewed/tested slices. An idle coordinator does not require a third active session: save the PR handoff and free a slot for a bounded review/merge window.
5. R1 requires every R1-tagged item in `skill.md` sections 13 and 16.1, plus documented release/schema boundary. R2 requires all R2 items and R1 regressions. Environment-blocked checks remain pending; neither release is complete today.

AI 1 reviews domain/command semantics, AI 2 reviews client contracts, AI 3 reviews planning consequences, and AI 4 reviews integration/operations/evidence. Reviewers are roles, not claimed GitHub assignees. Use issues/PRs for source/contract/test handoffs only.

## Tracking links and evidence

[Parent coordination issue #1](https://github.com/ggpaintingtampa-cmyk/camino/issues/1); workstreams: [Domain #2](https://github.com/ggpaintingtampa-cmyk/camino/issues/2), [Daily UI #3](https://github.com/ggpaintingtampa-cmyk/camino/issues/3), [Planning UI #4](https://github.com/ggpaintingtampa-cmyk/camino/issues/4), [Review/integration #5](https://github.com/ggpaintingtampa-cmyk/camino/issues/5).

Documentation baseline: `cc3b977`. Tested harness commit: `0d7208928bc78c963e89dbcd599e4060a3a5b917`. [Setup PR #7](https://github.com/ggpaintingtampa-cmyk/camino/pull/7) was merged into integration at `4bd91f49378935089fe810006832403642beda6c`; source review and local check evidence are in that PR/handoff. No independent external review or GitHub CI pass is claimed. The integration code matches the tested workstream tree; the final subsequent handoff update changes documentation only.

[Integration draft PR #6](https://github.com/ggpaintingtampa-cmyk/camino/pull/6) targets `main` and remains unmerged. Start new role branches from the latest published `redesign/v3-integration` head, including the final documentation handoff. See `review-handoff.md` for checks actually run and `completion-report.md` for the limited first-batch status. Full role prompts remain in `AI-IMPLEMENTATION-PROMPTS.md`; individual copies: [Prompt 1](prompts/01-domain.md), [Prompt 2](prompts/02-daily-ui.md), [Prompt 3](prompts/03-planning-ui.md).

During setup AI 4 held a narrow infrastructure transfer for `tests/e2e/planning.spec.ts`: its request Origin now uses the shared test-port configuration. This slice is complete at `0d72089`; ownership moves to AI 2 for the already assigned Phase 1/3 compatibility work, then to AI 3. No app planning behavior changed. The other preassigned transfer files still match the original application baseline.

## Acceptance status

- [x] Shared reviewed documentation baseline published.
- [x] Parent and four workstream issues linked.
- [x] Initial synthetic harness batch verified and available on integration; WebKit environment coverage remains pending.
- [x] AI 4 parked; ready-to-use Prompts 1–3 prepared for owner launch.
- [ ] R1 implemented and verified (later work).
- [ ] R2 implemented and verified (later work).
