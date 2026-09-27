# Batch 3 — planning implementation handoff

**27 September 2026 integration update:** R1 is implemented and integrated; see [release verification](release-verification.md) for actual checks and limits. The assignments and handoff status below record earlier stages. Do not restart completed R1 work. R2 remains deferred. The owner subsequently authorized integration, focused checks, push and deployment; no additional agents are requested.

Status: independent component preparation implemented and tested; **Batch 3 is not complete**. Baseline `0884f68d44b60ad4c63fef01c260f440d95fd98d`, branch `redesign/v3-planning-ui`, isolated worktree `.worktrees/v3-planning-ui`.

The owner assigned Batch 3 on September 27 and explicitly requires their confirmation that Batches 1 and 2 are complete before the final combined app is pushed/deployed live. No production rollout or default-branch merge is authorized in this batch. This preparation is retained on a local working branch; GitHub issues carry coordination updates. No code push or deployment has been performed for Batch 3.

## Dependencies and ownership

AI 1 is implementing domain contracts on `redesign/v3-domain`. Its local draft `contracts.md` was inspected on September 27; its status table explicitly says the new commands/selectors are not implemented. No tested contract commit or AI 2 shared UI/runner handoff is published at this baseline. AI 2 still owns the early `src/planning.tsx` and existing planning-test compatibility slice. Batch 3 works only in new planning modules, uniquely named tests, scoped styles, and this handoff; it will not overwrite those files before the tested ownership return. The owner says Batches 1 and 2 are underway and will report when they and their dependencies are ready.

Required integration contracts: optional task estimates and preferred-date deferral; day-plan save/selection/window/reserve; authoritative capacity and preview selectors; one atomic reviewed `plan.apply`; task/block resolution; whole-template preview/apply; compound Start Day; associated-session-aware day closure. The UI uses the real domain exports once published, with no independent capacity/session algorithm or simulated production saves.

AI 2 must expose a reviewed-revision runner and its save/recovery state, shared capacity/row primitives, and shell entry points for Plan today, Reset, task outcomes and planning dialogs. Exact signatures will follow `ui-contracts.md`, not be guessed here.

## Independent preparation

Figma design context and screenshots read for Plan today `119:185`, agenda `120:118`, Reset `120:211`, templates `120:253`, and End day `120:331` in file `546RE6EDMQscrkcNhjL8gL`. These nodes contain typography, fields, actions and surfaces; no static bitmap/SVG assets are required. The components use existing React/system-font/token/CSS architecture and `Field`. They do not reproduce the mockup's outer phone frame or navigation. R2 template variants/subset controls shown in Figma are intentionally excluded from this R1 implementation.

The new components are not imported by `App.tsx` or legacy `planning.tsx`. There are no simulated saves in the app and no newly exposed production controls. The synthetic browser fixture records callbacks only and explicitly labels itself as such. Do not mistake its screenshots or browser passes for persisted application journeys.

## Exports ready for integration

| Module in `src/planning/` | Export and responsibility | Caller supplies |
|---|---|---|
| `PlanTodayForm.tsx` | `PlanTodayForm`, `PlanTodayDraft`: optional window, optional main task, ordered choices, reserve field, visible capacity slot, reviewed Save choices callback | Persistent-in-memory draft, eligible task projections, authoritative fixed/capacity content, revision, runner feedback, save/cancel/capture/detail callbacks |
| `PlanningTaskPicker.tsx` | `PlanningTaskPicker`, `PlanningSelection`, `PlanningTaskChoice`: choose/remove, optional main task, keyboard/tap reorder, search, honest absent estimate, create/edit callbacks | Eligible choices and controlled selection; no task or calendar writes are performed |
| `PlanningWindowFields.tsx` | `PlanningWindowFields`: explicit dates, minutes and owner-zone label; inline errors; original folded-hour preservation | Controlled `WindowDraft`, frozen preview zone, optional original interval, change callback |
| `windowDraft.ts` | `readWindowDraft`, `windowDraftFromInstants`, `WindowDraft`, `WindowResult` | Uses `shared/dates.ts` for all timezone/DST conversion. This is a field adapter, **not** domain plan validation or capacity calculation |
| `ResetReview.tsx` | `ResetReview`, `PlanningChangeRow`: current/proposed consequences, fixed commitment and capacity slots, explicit pause checkbox, reviewed revision callback | The real `previewPlanChange` result mapped to display rows, exact recording consequence, confirmation state, pending/error/retry content |
| `WholeTemplatePreview.tsx` | `WholeTemplatePreview`, `TemplatePreviewRow`: whole-template preview, readable overlaps and consent, already-applied labels, no-op apply disabled | Real preview rows using `occurrenceId` as key, authoritative capacity, revision, conflict acknowledgement and runner callbacks |
| `EndDaySections.tsx` | `EndDaySections`: selected commitments first, collapsed backlog, optional controlled writing, explicit recording consequence, reachable close/keep-open actions | Day-close preview, actual associated/continuing session descriptions, confirmation state, retained writing, outcome/defer rows, runner feedback and callbacks |

All production components import the scoped `planning-v3.css` directly. No global style entry was changed. `--planning-action-offset` defaults to `0px` for a dialog; the shell owner must set it to the actual mobile-navigation height for an inline page. Recheck footer reachability inside the final shell/dialog and with a soft keyboard. The fixture currently verifies standalone layouts and keyboard access.

### Binding rules

1. Keep the form drafts in the owning controller when opening capture/details or refreshing a stale snapshot. No browser storage. A changed server snapshot must not silently overwrite writing, selection or raw invalid date input.
2. Map `PlanningSelection` to the agreed `DayPlanDraft.taskIds/mainTaskId`. Omit `window` when `useWindow` is false. Convert a supplied window with `readWindowDraft`; let shared validation enforce duration/alignment/date rules. `protectedSpareMinutes` is deliberately a raw string while editing, converted only after validation. No capacity estimate is computed locally.
3. Preserve a plan's zone from its stored plan/preview. Pass `originalWindow` when reopening an existing interval so a later fall-fold occurrence is not changed merely by saving untouched wall-clock fields.
4. `onSave(revision)` and `onApply(revision)` carry the visible preview's revision. Pass that exact revision to AI 2's reviewed runner, never replace it with the latest snapshot revision. No component clears a draft or reports success on its own.
5. Supply `disabled` for pending, uncertain, or invalid authoritative previews. Render shared error/stale/same-envelope retry controls through `feedback`. Do not create a second mutation/retry state machine in these components.
6. Clear pause/stop/overlap confirmations whenever the reviewed revision, operations, dates, affected session set or conflict set changes. They must apply to the currently shown consequences only. Construct the final command from the retained preview; `day.close.expectedSessions` is the exact associated set, and unrelated running work is explicitly shown as continuing.
7. Map every Reset operation, including priority, reserve and session changes, to a displayed row. The final binding sends one `plan.apply`; Cancel sends no command. The next fixed appointment stays unchanged unless an explicit appointment-change operation is shown.
8. Use `previewTemplateApplication` to decide invalid times, applied occurrences, conflicts and duplicate handling. Send its exact required acknowledgement IDs only after owner consent. The component's disabled Apply is a convenience, not the idempotency implementation. Changing the preview resets consent.
9. Map `changedPlan` and `easierTomorrow` to the agreed optional `Day.reflection` fields; do not overwrite a factual summary with them. Preserve the existing journal and both reflection answers through refresh/navigation. The original End Day editor remains in service until the ownership return.
10. The End Day `planTomorrow` checkbox is a post-success navigation preference. Deferring tasks uses real `task.defer` operations, never a fabricated 09:00 booking. Existing commitments and backlog rows need real resolve/defer handlers from the final controller.

## Remaining Batch 3 work

| Release | Work | Gate |
|---|---|---|
| R1 | Bind Plan today, actual capacity and reviewed save | AI 1 implemented selectors/commands and AI 2 runner/shared components |
| R1 | Explicit placement editor, default agenda, overlap review, precise timeline and cancelled-drag handling | Tested return of `src/planning.tsx` and existing planning tests from AI 2 |
| R1 | Reset operation editing and one atomic apply, stale/uncertain recovery | Implemented preview/apply contracts and runner |
| R1 | Real whole-template preview/apply and retained template editor | Implemented preview/idempotency contract |
| R1 | Shared task/block outcome dialog, appointment outcomes and untimed Tomorrow | Task resolution/deferral commands plus shell wiring |
| R1 | Compound optional Start Day check-in and open-day/reopen paths | Day lifecycle contract and planning ownership return |
| R1 | Full associated-session-aware End Day integration | Real preview/close command and reviewed runner |
| R1 | Persisted browser journeys, final shell/keyboard/soft-keyboard checks, compatible WebKit coverage | Integrated implementation and AI 4 harness coordination |
| R2 | Focus allocations, positioned buffers/transitions, reserve conversion, template variants/subsets and advanced planning | Explicit second-release contracts; no placeholder controls added |

These remain open requirements, not optional polish. Do not mark Batch 3, R1, or deployment ready based on this preparation PR.

## Verification

On September 27, using the bundled Node runtime and a frozen-lockfile installation in this worktree:

- `pnpm typecheck`: passed.
- `pnpm lint`: passed; focused lint also passed after adding PlanTodayForm.
- `pnpm test`: 80 tests across 11 files passed, including six new wall-clock adapter tests (zone, partial fields, overnight dates, DST gap/fold and an existing later-fold booking).
- `CAMINOS_TEST_PORT=5297 pnpm exec playwright test tests/e2e/planning-controls.spec.ts --project=chromium`: 13 passed. Covers selection without an estimate, keyboard reorder, create-with-draft retention, visible DST errors, pinned preview callback, cancel without apply, stop/pause disclosure, retained writing, template overlap consent, pending controls, optional planning window, widths 320/390/768/1440 and 200% text.
- `pnpm build`: passed.
- Targeted WebKit launch (`--project=webkit --grep 'Plan today accepts' --max-failures=1`): could not launch because `libevent-2.1.so.7` is missing. No application assertion ran; WebKit coverage remains pending on a compatible host.

The browser suite starts a separate Vite fixture on an ephemeral loopback port and uses the existing isolated synthetic Playwright harness on 5297. It does not connect to the owner database. No production or shared shell/domain files were changed. These are component-level checks: real receipt replay, revision conflict recovery, atomic writes, session termination and template repeat safety still need integration tests.
