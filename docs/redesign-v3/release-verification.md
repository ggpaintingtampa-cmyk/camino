# R1 integration and release verification — 27 September 2026

The owner authorized combining all four batches, focused checks, GitHub push and production deployment. Work was integrated without spawning agents. Domain `f5fd16c`, daily UI `626b143`, planning components `0a4b2ea`, and the earlier harness are combined on `redesign/v3-release`. Deployment evidence is recorded separately in [DEPLOYMENT-STATUS.md](../../DEPLOYMENT-STATUS.md).

## Resulting behavior

- Five-tab responsive shell: Today, Plan, Tasks, Review, More, with capture available throughout and legacy routes preserved.
- Title-only tasks, unknown estimates, separate intended day/deadline/booking; direct work start/pause/resume/stop and explicit outcomes. Interval dates, timezone and booking references remain independent of session creation.
- Plan today works without Start Day; inline capture retains the draft; priorities, optional working window, spare time and capacity use the domain contracts.
- Reset previews the before/after plan, keeps unchanged fixed appointments, discloses overlaps and recording consequences, and applies atomically at the reviewed revision. Stale previews retain choices and require review again.
- Whole-template preview requires overlap consent. Repeated application adds nothing; used template entries are protected and can be copied for editing.
- Optional morning check-in is atomic. End Day discloses recordings, preserves unfinished work and edited summaries, and stores optional reflection separately. Tomorrow remains untimed.
- Review distinguishes selection, outcomes, booked time, measured intervals and legacy evidence. Existing supporting tools, calendar, journal/search, owner authentication and financial invariants remain.
- Unknown save outcomes retain the exact request for safe retry, including interrupted authentication. No personal browser persistence was added.

## Storage and compatibility

Schema 2 / SQL version 2 are frozen for R1, with no draft marker. Normal opens never migrate. Explicit migration requires an absolute existing database, target schema, apply opt-in and a new verified backup; source revision/digest are rechecked transactionally. Legacy records, owner authentication, weather cache and command receipts are preserved. Accepted four-tab settings retries replay; fresh legacy saves convert to five-tab preferences after receipt lookup. Missing sources fail closed on read/command/MCP paths; deliberate initialization and new scratch restores remain supported.

## Focused evidence

All checks use synthetic, isolated local records. No owner records or credentials were used as fixtures or placed in screenshots.

- TypeScript, ESLint and Vite production build passed. Vite reports a nonfatal bundle-size warning.
- 192 tests passed across 16 focused suites: R1 migration/flows, sessions, capacity, task views, legacy fingerprints, server/API, CLI, operations, domain/adversarial, settings, planning dates, browser harness, environment and installer.
- Nine Chromium R1 browser scenarios passed: exact retry after a lost response; untimed work lifecycle and Review; planning with inline capture without Start Day; stale Reset and atomic pause/rebooking; template overlap/repeat safety; optional morning/closure/reflection; and usable planning/navigation at 320, 768 and 1440 pixels. Three initially ambiguous test locators were corrected and their cases rerun successfully.
- A tenth Chromium scenario passed after the final task-details change: a stale edit retains the draft, refuses the old save, and succeeds only after explicit review. The final source also passed typecheck/build and lint.
- The earlier planning-component handoff records 13 Chromium checks and six date-field unit checks; these are historical evidence, not a claim of a second full run.

## Limits and deferred work

WebKit launch was attempted again and failed before any app interaction because its required host library `libevent-2.1.so.7` is missing. A current WebKit/device/screen-reader pass is not claimed. Old v2 browser suites contain obsolete labels; they are not represented as an all-green suite. The focused checks do not cover every row of the original exhaustive acceptance matrix.

R2 remains deferred: focus allocations, positioned buffers/transitions, template variants/subsets and application history, detailed plan-change history, weekly learning, small-plan/energy controls and enhanced goal-next-step flows. Existing supporting tools are retained; this release does not claim the entire R2 redesign or external integrations.

The Figma graphite/gold language, real responsive shell, large controls, review-first planning and factual Review informed the implementation. Synthetic rendered planning screens were inspected; pixel-identical parity across every Figma frame is not claimed.
