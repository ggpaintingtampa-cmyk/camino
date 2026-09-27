# Caminos v3 — independent review resolutions

September 27, 2026. **Design and planning corrections only.** Application source, database schema, tests, local databases, GitHub state, and deployment were not changed by this work. Figma annotations and two related control states were edited.

## Review input and scope

The owner supplied another AI's review of the implementation plan. That reviewer read the plan and backend/domain code, searched parts of the UI, and explicitly did not run tests, open a database, or inspect Figma. Its positive conclusion about the overall plan is retained; the eight main findings and two smaller notes are resolved below.

This correction pass checked relevant repository, CLI, MCP bridge, schema, Home, Settings, and shell source without opening any database. The current application remains v2. Proposed commands and migration safeguards described here are future implementation requirements, not capabilities that already exist.

## Findings and decisions

| Finding | Resolution | Implementation evidence required later |
|---|---|---|
| 1. Phase 2 converts navigation before the Phase 6 shell/Settings | Preserve four-tab storage through Phases 2–5. Phase 6 activates the five-tab representation only with matching shell, Settings editor, server normalization, and tests. | M20–M22 plus old/new navigation E2E; no intermediate broken Settings save |
| 2. Five-tab validation blocks old retries before receipt lookup | Keep the original strict four-tab `settings.save` wire branch. Separate stored-state invariants from accepted historical commands. Fingerprint/receipt/revision handling precedes fresh-command normalization. A distinct v3 command is permitted if needed to preserve old serialization exactly. | Exact accepted four-tab request replay after activation, including its original revision; fresh valid legacy save before/after activation; invalid mixed arrays rejected |
| 3. Complete data shape freezes before its behavior is built | Draft schemas evolve on deliberately disposable fixtures through Phases 2–5. Freeze at first non-disposable owner-data use or supported release/export publication, after the R1 readiness gate. Later supported-format changes receive new migrations. | Draft fixture lifecycle recorded; release format agrees with implemented sessions/plans/outcomes and consumers |
| 4. No-day sessions/resumes have ambiguous dates and lifetime | Store timezone/date/optional open-day association on each interval. Resume captures fresh context. Calendar totals slice absolute intervals at date/week boundaries; open-day records are labeled separately. Stop works without Start Day. | T20–T25: late resume, no-day stop, midnight, Start Day during recording, scoped closure |
| 5. Opening through CLI/MCP can accidentally migrate the default DB | Normal API/CLI/MCP open never upgrades an existing database. Add read-only preflight and a separate migration apply requiring literal absolute target, target version, explicit opt-in, and a new verified backup. Refuse stale preflight/backup source changes. | M17–M19/M23; mocked MCP invocation and isolated CLI fixtures; no default-path database inspection |
| 6. `actualStart` compatibility is unspecified | First linked start still stamps `actualStart`; terminal actions project `actualEnd`. Intervals own running/paused/duration truth. Update legacy consumers before exposing Pause, independently of the later visual redesign. | T24 and Phase 3 Home/summary compatibility tests; no double counting of legacy span and sessions |
| 7. Too much new machinery without a release boundary | R1 uses the core daily loop and three necessary new collections. R2 adds advanced allocations, variants/subsets/application records, detailed change history, weekly learning, and remaining enhancements. Command/module lists are candidates, not quotas. | Separate R1/R2 PR scope and reports; overall completion requires both; existing useful tools remain in R1 |
| 8. Four parallel workers contradict dependencies/two-slot limit | Keep four durable roles but at most two active sessions. AI 4 sets up and parks; AI 1+2 handle foundation, AI 2+3 core/planning, AI 3+4 closure/review. Swap in a needed owner for bounded fixes/activation/review. | GitHub active/parked roster, precise handoffs and actual merge/test commits; no worker waits indefinitely for a parked role |
| 9. Codex-specific tools/runtime paths | State the host-portability rule in the skill and every standalone prompt. Local `AGENTS.md` requirements still apply on this workstation; other hosts use supported native editing/runtime equivalents. | Actual runtime/tool recorded; unchanged privacy, isolated-data, patch review and verification requirements |
| 10. WebKit reportedly lacks `libevent-2.1.so.7` | Record this as a reviewer-reported baseline limitation. It was not rerun in this documentation pass. Implementation must reproduce/report it or obtain compatible authorized host/CI coverage. | No false WebKit pass, no suppressed required check, no unapproved system-package installation |

## Important details retained

- An old request must still parse before it can match a receipt. Merely preserving hash computation is insufficient.
- A new command with an old shape may normalize to the new representation, but an already applied command must replay without reapplying its old settings.
- The review did not authorize opening `.data/hermes.sqlite`. A local path does not imply synthetic contents. No database was opened to confirm its existence or inspect its format.
- Normal MCP operations inherit CLI/environment defaults in current code. The required future migration gate is below those paths, not an instruction to try them against the user's data.
- A paused session can remain resumable; each resumed interval gets current context. No automatic week-long elapsed duration or original-date allocation is inferred.
- Open-day factual attribution and calendar-week time slicing are different reporting views. Their totals must not be added together.
- R1/R2 is a delivery sequence, not removal of accepted scope or permission for production deployment.

## Documents updated

- [skill.md](../../skill.md): contracts, phases, release boundary, migration opt-in, compatibility rules, interval attribution, extra test cases, host portability, and execution schedule.
- [REDESIGN-SCHEMA.md](../../REDESIGN-SCHEMA.md): product behavior, standalone Stop, interval context, navigation activation, and delivery rules.
- [Root README](../../README.md): current-v2 versus future-v3 status, authoritative document links, corrected rollout boundaries, and default-database caution.
- [Figma handoff README](README.md): reviewed rules, actual Figma changes, release/prototype limits, and links.
- [AI-IMPLEMENTATION-PROMPTS.md](../../AI-IMPLEMENTATION-PROMPTS.md): all four roles, two-session scheduling, dependency/activation gates, safety ownership, R1/R2 sequencing, and standalone host limitations.
- [FUTURE-IMPLEMENTATION.md](../../FUTURE-IMPLEMENTATION.md): retained scope with explicit reviewed migration/navigation/session requirements.

## Figma changes and observed verification

File `546RE6EDMQscrkcNhjL8gL`, page **Caminos v3 — Daily flow** (`115:2`):

- [Blueprint `115:54`](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=115-54): updated Pause/interval wording, reviewed-design marker, R1/R2 scope, coordinated shell/Settings activation, opt-in migration, and pointer to the two-worker handoff.
- [Paused Today `119:88`](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-88): added Stop recording (`135:560`) next to Reset today in a compact action row (`136:561`). Both controls measure 141 × 48 pixels; their text fits the available width.
- [Task outcomes `123:377`](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=123-377): changed the ambiguous Leave open action to Stop recording · keep task open (`123:401`), measuring 342 × 48 pixels.
- Both Stop actions navigate to ready Today (`123:453`), whose existence was read back. The original outcome action initially led to Paused; it was corrected so Stop and Pause no longer imply the same result.
- Inspected rendered screenshots of the blueprint, outcome screen, and paused screen. After adding Stop, condensed the paused actions into one row and inspected the corrected rendering so the next appointment/preparation remained visible.
- Frame sizes remain 1440 × 788 for the blueprint and 390 × 844 for the two phone screens. No new screen frame or application implementation was created.

These are static synthetic prototype actions. They do not execute a real session stop, persist data, or validate interval accounting. The original full-design QA files retain their historical meaning; this targeted correction is recorded separately in [review-fix-qa.json](review-fix-qa.json).

## Verification boundaries

Passed: skill frontmatter validation; 16-section/12-phase structure; local Markdown links; four standalone prompts with release/concurrency/environment guidance; corrected-contract checks; QA JSON parsing and Stop destinations; whitespace checks. Before/after hashes matched for all **55 checked application, test, deployment, and package/config files**. No checked source file changed.

No application tests, browser launches, database migrations, exports, backups, production commands, or GitHub mutations were run for these documentation/design fixes. The new acceptance tests are specified, not implemented or claimed passing.


## Final review follow-up — September 27, 2026

All five later findings are resolved in the implementation documents. The table records specification changes, not completed application features.

| Finding | Resolution | Required later evidence |
|---|---|---|
| Mixed release gates | Every section 13 matrix row, date/API scenario, browser journey, and section 16.1 checkbox has R1/R2 scope. Mixed goal/template/week scenarios are split; R1 has its own capacity example. | R1 evidence for every R1 item; R2 evidence plus R1 regressions. Blocked checks remain pending. |
| Legacy End Day leaves recording alive | Section 6.4 and Phase 3 require a `day.end` adapter and a minimal existing-screen `day.close` confirmation bridge before Pause is exposed. Keep old wire shape/fingerprints/replays. | R19–R21: fresh old command safely rejects when confirmation is needed; explicit close is atomic; old receipts replay. |
| Two-role scheduling collisions | AI 2 temporarily owns Phase 1/3 planning compatibility and Phase 6 Settings navigation with affected tests. AI 1 + AI 2 deliver the complete navigation slice; later tested returns to AI 3/4. | Coordination issue tracks scope, baseline, return commit and owner; no third active role needed. |
| Session-level booking attribution | `plannedBlockId?` belongs to every interval, not the session. Resume chooses a valid new booking or none; old references/totals remain intact. | T27–T29: A→B resume, unscheduled/mismatched booking, and Start Day context split. |
| Missing database creation | Explicit open intent; only deliberate server/owner initialization and synthetic harness can initialize, plus explicit new scratch destination. Inspection/commands/backup/verify/MCP and migration require existing sources. | M24–M25 exercise every caller and absence of directory/SQLite/WAL/SHM side effects. |

Updated `skill.md`, root/design READMEs, blueprint, roadmap, and all four prompts together. Prompt 4's later code/test/GitHub results are recorded separately in [review-handoff.md](../../docs/redesign-v3/review-handoff.md); the preceding design-only verification remains historical.
