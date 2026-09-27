# Prompt 4 setup handoff

Completed first batch on September 27, 2026. Scope: reviewed documentation, GitHub coordination, and isolated browser-test infrastructure. V3 app features, R1/R2 acceptance, production migration and deployment remain pending.

## Delivered code

- `tests/support/browser-config.ts`: validated test-only loopback port, daily/empty scenario, and initial ISO clock configuration. No production DB environment input or database-path override.
- `tests/support/browser-harness.ts`: fresh temporary SQLite database per factory call; synthetic owner/records/weather; `advanceClock(milliseconds)` callback from test code; async `close()` closes SQLite before removing its own directory. No HTTP clock/reset route.
- `tests/harness.ts`: startup with selected scenario/port, graceful signal shutdown and listen-error cleanup.
- `playwright.config.ts`: matching origin, server reuse disabled, graceful shutdown. An occupied port fails rather than attaching to an unrelated fixture.
- `tests/browser-harness.test.ts`: six behavior tests for isolated databases/cleanup, ignored production-path configuration, persisted server clock through authenticated commands across DST, invalid advances, absence of HTTP controls, occupied-port refusal, and invalid configuration.
- `tests/e2e/planning.spec.ts`: only its request Origin uses the common test-port configuration. AI 4 took this narrow infrastructure slice during setup and returns the file now; AI 2 holds its next Phase 1/3 compatibility transfer.
- `.gitignore` and ESLint ignore nested role worktrees so another checkout is neither committed nor linted accidentally.

No `src/**`, `shared/**`, `server/**`, deployment files, package manifest, or lockfile changed. No application database, stored-state migration, or v3 feature was implemented by this batch.

## Verification actually run

Worktree: `.worktrees/v3-review-qa`; bundled Node and pnpm fallback; isolated synthetic databases only.

| Check | Result |
|---|---|
| Original `pnpm test` before code changes | 68 tests across 9 files passed |
| `pnpm test` with harness batch | 74 tests across 10 files passed |
| Final targeted `pnpm exec vitest run tests/browser-harness.test.ts` | 6 tests passed after final harness edits |
| `pnpm typecheck`, `pnpm lint` | Passed; rerun after callback/configuration changes |
| `pnpm build` | Passed (TypeScript plus Vite) |
| `CAMINOS_TEST_PORT=5297 pnpm exec playwright test --project=chromium` | All 21 existing E2E tests passed; responsive checks at 320, 390, 768, 1280 |
| Final planning smoke on custom port | Scheduled task/partial remainder flow passed after switching its Origin to the shared configuration |
| Deliberate occupied-port probe | Playwright refused the owned synthetic listener; listener still answered afterward |
| `CAMINOS_TEST_PORT=5298 pnpm exec playwright test tests/e2e/empty-state.spec.ts --project=webkit --max-failures=1` | Environment-blocked before app assertions: missing `libevent-2.1.so.7`; first launch failed, two tests not run |
| Documentation checks | 99 release-tagged matrix cases, 29 tagged date/API/journey items, and release-tagged completion items; prompt bodies synchronized; QA JSON parses; whitespace checked |

WebKit coverage remains pending on a compatible host. No system packages were installed and its project remains enabled. Chromium's existing 1280 check does not claim the future R1 1440/accessibility acceptance gate. Existing browser specs still share a fixture within a run; new independent v3 scenarios should create their own harness through the factory. No v3 manual accessibility, screen-reader, owner usability, migration or rollout claim is made.

## Harness usage for the next roles

Use a different free port in each active checkout:

```bash
CAMINOS_TEST_PORT=5301 pnpm exec playwright test --project=chromium
```

The existing suites expect `daily`. For new empty/time-boundary scenarios, use the factory with `browserHarnessConfig({CAMINOS_TEST_PORT:'5302', CAMINOS_TEST_SCENARIO:'empty', CAMINOS_TEST_NOW:'2026-11-01T05:55:00.000Z'})`, serve that app on its selected loopback port, and pass `resolve('dist')` when browser assets are needed. Call `advanceClock(10 * 60 * 1000)` from the test, refresh the browser snapshot, then assert persisted command times. Always `await close()` in teardown. Clock advances can expire login sessions normally; reauthenticate for multiweek scenarios. Recreate the fixture for a backward jump rather than rewinding persisted records.

The callback accepts a positive integer up to 31 days in milliseconds per advance. A custom initial clock requires the empty scenario so fixed daily fixture records are not presented as current. The factory does not accept a live database path or expose a mutation/reset HTTP endpoint.

## Handoff

The five final review findings are resolved in the plan, READMEs, blueprint, roadmap and prompts: explicit release gates, Phase 3 legacy End Day/session bridge, two-role ownership transfers, per-interval booking context, and database creation intent. These are requirements for later app code, not assertions that future handlers already exist.

AI 4 parks after setup. Start AI 1 and AI 2 together from the published `redesign/v3-integration` head. AI 3 starts after AI 1's foundation is integrated and AI 2 returns the planning compatibility slice, using a freed slot. Return AI 4 for bounded review windows and later Review/supporting/integration work. Keep both releases open until their acceptance evidence exists.

Tracking: [coordination #1](https://github.com/ggpaintingtampa-cmyk/camino/issues/1), [Domain #2](https://github.com/ggpaintingtampa-cmyk/camino/issues/2), [Daily UI #3](https://github.com/ggpaintingtampa-cmyk/camino/issues/3), [Planning UI #4](https://github.com/ggpaintingtampa-cmyk/camino/issues/4), [Review/integration #5](https://github.com/ggpaintingtampa-cmyk/camino/issues/5). Documentation baseline: `cc3b977`; integration draft: [PR #6](https://github.com/ggpaintingtampa-cmyk/camino/pull/6). Tested code `0d72089` merged through [PR #7](https://github.com/ggpaintingtampa-cmyk/camino/pull/7) into integration at `4bd91f4`. The source/config/test files on integration match that tested tree; the subsequent final handoff changes documents only.
