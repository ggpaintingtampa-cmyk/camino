# Daily UI handoff (AI 2)

Branch `redesign/v3-daily-ui`, worktree `.worktrees/v3-daily-ui`, stacked on `redesign/v3-domain` at `f5fd16c`. Release R1. Written September 27, 2026.

## State of the code

All of it is written and compiles. **None of it has been run**: no unit test, no browser test, no manual click-through. The owner runs the suites.

| Check | Result |
|---|---|
| `pnpm typecheck` | Passed, whole project including `src/**` |
| `pnpm lint` | Passed |
| `pnpm build` | Passed. Vite warns that the script bundle is 512 kB, just over its 500 kB notice level |
| `pnpm test`, `pnpm test:e2e` | **Not run** |

Edits were made with the session's native file tools, the permitted equivalent of `apply_patch`. Bundled Node 24 and the pnpm fallback were used.

## What was built

| Area | Files | Behavior |
|---|---|---|
| Command runner | `src/hooks/useCommandRunner.ts`, `src/hooks/useServerClock.ts`, `src/api.ts` | Eight save states, reviewed-revision submission, exact-envelope retry, monotonic snapshots, 15-second polling, server-derived clock. An unreadable success answer is treated as unknown, not as saved |
| Shell | `src/App.tsx`, `src/components/AppNavigation.tsx` | Today / Plan / Tasks / Review / More on the phone bar and the desktop rail from one configuration. Old routes kept, three aliases added. `+ Task` on every screen. Skip link |
| Today | `src/HomePage.tsx`, `src/components/FocusPanel.tsx` | Running, paused, ready, priority done and empty states from work sessions. Recorded today and recorded in the session shown separately. Done, Pause, Resume, Partly done, Stop recording, Change plan. Next fixed commitment, chosen priorities, remaining-day capacity. Ordinary backlog is no longer under attention |
| Tasks | `src/TaskListPage.tsx`, `src/components/TaskRow.tsx` | All / Today / Later with counts, search over title, guidance, notes and labels, direct Start, Resume, Pause and Done. Finished tasks behind a disclosure |
| Capture and details | `src/planning/QuickCapture.tsx`, `src/planning/TaskDetails.tsx` | Title and optional note. Details keep estimate, preferred day, deadline and booking apart. Tomorrow and Later show their effects before they are applied |
| Outcomes | `src/components/TaskOutcomeDialog.tsx`, `src/components/SwitchDialog.tsx` | Task outcomes without a calendar entry. Explicit pause-and-switch |
| Shared pieces | `src/components/{CommitmentRow,CapacitySummary,EstimateField,SaveNotice,format,taskActions}` | See `ui-contracts.md` |
| Styles | `src/redesign-v3.css`, `src/tokens.css`, `src/main.tsx` | Scoped v3 styles, imported last. Semantic tokens added |
| Navigation settings | `src/features/settings.tsx` | Five-tab order editor, saved with `settings.saveV3` |

### Early compatibility slice in `src/planning.tsx` (temporary ownership)

1. Saving a task with a time first shows the date, start, end, zone and overlaps. The booking is sent only by the second, confirming press, at the reviewed revision, as one `task.plan`.
2. An overlap needs an explicit "Keep this overlap".
3. Agenda rows state overlaps in words, with Review conflict and Keep overlap.
4. Snooze is labeled "Remind me to review" everywhere, including accessible names.
5. Partial choices are labeled "Remaining time".
6. Tomorrow is `task.defer` with a preferred day. It books nothing.
7. End Day: chosen tasks first, other open tasks behind a disclosure, the closing action in a sticky area.
8. End Day and "Close previous day" use `day.close` with `previewDayClose(...).expectedSessions`. When a recording belongs to the day, its consequence is listed and must be confirmed.
9. Running and paused state in the agenda comes from work sessions.
10. The estimate and the booked length are separate fields. A blank estimate is never saved as 30.
11. A resolved calendar entry opens read-only.

### Phase 6 server slice, done by AI 2

AI 1 was parked, and the owner asked for coding to continue. The five-tab slice needed its server part, so it was added here: `shared/navigation.ts`, `settings.saveV3`, optional stored `settings.navOrderV3`, draft number 2. `contracts.md` section 7.3 describes it and why it differs from the earlier proposal. No other domain file was changed.

## Known breakage: existing browser tests

The v2 browser suites look for labels that the redesign changed. They will fail until they are rewritten for v3.

| File | Examples of what changed |
|---|---|
| `tests/e2e/planning.spec.ts` | `Add` button is now `Task`; `Home` and `Schedule` links are `Today` and `Plan`; `Snooze` is `Remind me to review`; `Partially done` is `Partly done`; `Unscheduled` is `Without a time`; `Retry save` is `Retry save safely`; saving with a time takes two presses |
| `tests/e2e/redesign.spec.ts` | `Update task` and `Start now` no longer exist on Today; `Add` is `Task` |
| `tests/e2e/empty-state.spec.ts` | The tab order editor lists Today, Plan, Tasks, Review, More; there is no `Move Goals` button |
| `tests/e2e/features.spec.ts`, `tests/e2e/responsive.spec.ts` | Not inspected line by line. They navigate through the shell, so expect label changes |

`tests/screens-settings.test.ts` tests the four-tab `settings.save` command only and should still hold.

## Not done

| Item | Why |
|---|---|
| Tests for the runner, the components and the v3 browser journey (`tests/e2e/v3-daily-ui.spec.ts`) | Not written: the owner asked for code only |
| Browser check at 320, 390, 768 and 1440, keyboard, zoom, contrast, screen reader | Not performed |
| Figma comparison | Not performed. The layout follows `skill.md` sections 10 and 11 and `REDESIGN-SCHEMA.md` |
| Plan today, Reset today, whole-template preview, End Day redesign | AI 3's flows. Their components exist on `redesign/v3-planning-ui` and are not bound yet |
| Compound Start Day (`day.startWithCheckin`) | Still three separate commands, as before. Phase 9 |
| Extension preview in the overrun state | Needs AI 3's Reset flow. Today offers Change plan |
| Effort and checklist fields | Stored by the domain. No R1 screen edits them |
| GitHub: issue comment, draft PR, push | Not done. Everything is local |

## Return of temporarily owned files

| File | Returns to | Condition |
|---|---|---|
| `src/planning.tsx`, affected cases of `tests/e2e/planning.spec.ts` | AI 3 | After the owner's test run of this branch. The test cases were not updated |
| `src/features/settings.tsx` navigation editor, navigation cases of `tests/screens-settings.test.ts` | AI 4 | Same |

## Limits

Synthetic data only. No database was opened, no server was started, no production file or secret was touched. WebKit cannot launch on this workstation (`libevent-2.1.so.7` missing), as recorded in `review-handoff.md`.
