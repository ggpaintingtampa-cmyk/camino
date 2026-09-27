# Domain handoff (AI 1)

Branch `redesign/v3-domain`, stacked on the contract commit `1206415` (PR #8). Baseline `redesign/v3-integration` at `0884f68`. Release R1 domain code, Phases 2–5 plus review facts. Phase 6 navigation is not started.

## State of the code

All R1 domain source is written and compiles. **The behavior added after commit `59b3ca1` has not been run through any test suite.** The owner runs the suites.

| Commit | Content | Checks run at that commit |
|---|---|---|
| `1206415` | Contract proposal, types, legacy fingerprint guard | `pnpm test` 106/106, typecheck, lint, build |
| `f15d53a` | Strict schemas, dispatch, optional estimate | `pnpm test` 106/106, scoped typecheck, lint |
| `9e08747` | Capacity arithmetic, `localDayRange` | `tests/capacity.test.ts` and `tests/domain.test.ts` passed, scoped typecheck, lint |
| `59b3ca1` | Task views, day-plan and commitment selectors | `tests/task-views.test.ts` and `tests/capacity.test.ts` passed, scoped typecheck, lint |
| this commit | Tasks, sessions, legacy adapters, day lifecycle, planning commands and previews, review facts, storage, migration, CLI, MCP bridge | Scoped typecheck and lint only. **No test run** |

Scoped typecheck means everything except `src/**`. The full `pnpm typecheck` fails in `src/TaskListPage.tsx:17` (four errors, `task.duration` possibly undefined) until the client patch requested on #3 lands.

## Modules

| Module | Exports to know |
|---|---|
| `shared/domain-core.ts` | `DomainError`, `CommandContext`, `blockFlexibility`, `openDay`, `pendingBooking`, record helpers |
| `shared/tasks.ts` | `applyTaskCommand`, `applyTaskOutcome` |
| `shared/sessions.ts` | `sessionState`, `runningSession`, `unfinishedSessions`, `unfinishedSessionForTarget`, `sessionsAssociatedWithDay`, `recordedSlices`, `recordedMinutes`, `recordedMinutesForBlock`, `isSessionBacked`, `hasRecordedWork`, `previewDayClose`, `sessionViolations`, `applySessionCommand` |
| `shared/capacity.ts` | `clipInterval`, `unionMinutes`, `entryConflicts`, `capacityForPlan`, `capacityForRemainingDay`, `capacityForDraft`, `isPositionedLive`, `localDayRange` |
| `shared/planning.ts` | `openTasks`, `taskCollections`, `tasksForView`, `dayPlanForDate`, `zoneForDate`, `selectedTasksForDay`, `mainTaskForDay`, `pendingBookingForTask`, `nextFixedCommitment`, `previewPlacement`, `previewDayPlan`, `previewPlanChange`, `previewTemplateApplication`, `applyPlanningCommand`, `applyTemplate` |
| `shared/review.ts` | `factsForDay`, `factsForWeek` |
| `shared/state-schema.ts` | `detectStateFormat`, `validateStoredState`, `validateLegacyState`, `validateCurrentState`, format constants |
| `server/repository.ts` | `Repository` with `{ intent, allowDraftFormat }`, `StorageError`, `inspectDatabase`, `stateDigest` |
| `server/migrations.ts` | `migrateLegacyState`, `preflightMigration`, `applyMigration`, `parseMigrateArguments` |

## Tests present but not run

`tests/sessions.test.ts` (written with the session code) and the storage fixtures `tests/fixtures/legacy-state-v1.json`, `tests/fixtures/storage-fixtures.ts`. `tests/server.test.ts` and `tests/server-cli.test.ts` were adjusted for the explicit open intent.

## Tests still to write

Migration and open-intent rows M01–M13, M15–M20, M23–M25; task rows T01, T02, T10–T13, T17, T18; planning rows P01–P03, P17–P20; template and closure rows R05–R12, R19–R22; review rows R14, R16; MCP bridge with a mocked spawn.

## Dependencies on other roles

- AI 2: unknown-estimate patch; Home, schedule and summary consumers move to sessions before Pause is exposed; End Day confirmation submits `day.close`. Requested on #3.
- AI 4: pass `databaseIntent` and `allowDraftFormat` explicitly in the browser harness. Requested on #5. Until then `createApp` keeps a permissive default.
- Phase 6 five-tab activation with AI 2.

## Limits

Synthetic data only. No production database, secret or service was touched. No browser check was run. WebKit cannot launch on this workstation (`libevent-2.1.so.7` missing).
