# Caminos v3 client contracts

Owner: AI 2 (Daily UI, [#3](https://github.com/ggpaintingtampa-cmyk/camino/issues/3)). For AI 3 (planning flows) and AI 4 (review, supporting tools, integration).

Branch `redesign/v3-daily-ui`, stacked on the domain commit `f5fd16c` of `redesign/v3-domain`. Domain contracts are in `contracts.md`; this document covers the client only.

Everything listed here exists in the source and compiles. None of it has been run in a browser or through a test suite yet. See `daily-ui-handoff.md`.

## 1. Page props

`src/ui.tsx`

```ts
interface PageProps {
  state: Snapshot;
  now: string;                       // server-derived display time, ISO
  run: (command: Command, options?: RunOptions) => Promise<boolean>;
  runReviewed?: (command: Command, reviewedRevision: number, options?: RunOptions) => Promise<RunOutcome>;
  saveState?: SaveState;
  add?: boolean; addKind?: string;
}
```

`runReviewed` and `saveState` are optional in the type only so that existing screens compile unchanged. The shell always passes them.

## 2. Command runner

`src/hooks/useCommandRunner.ts`, used once, in `App.tsx`. No screen creates its own.

| Member | Behavior |
|---|---|
| `run(command, {label?})` | Submits at the newest accepted revision. Resolves `true` only after the server confirmed |
| `runReviewed(command, reviewedRevision, {label?})` | Submits at exactly `reviewedRevision`. Polling never replaces it. Use it for every action whose visible consequences came from a preview: pass the preview's `baseRevision` |
| `retry()` | Sends the retained envelope again: same request ID, revision, payload, generated IDs |
| `saveState` | The runner's account of the last attempted change, below |
| `pending` | An earlier change still needs its retry. New changes are refused until then |
| `discardSignedOut()` | Drops a change the server refused because the owner was signed out |

```ts
type RunOutcome =
  | { ok: true; revision: number }
  | { ok: false; reason: 'rejected' | 'stale' | 'uncertain' | 'offline' | 'signed-out' | 'blocked'; message: string; code?: string; details?: ErrorDetails };
```

| `saveState.kind` | Meaning | What the owner can do |
|---|---|---|
| `idle` | Nothing to report | — |
| `saving` | A request is in flight | Wait. Submit controls are disabled through `busy` |
| `saved` | The server confirmed. Clears itself after four seconds | — |
| `rejected` | A readable 4xx answer: validation or a domain rule. `code` and `details` are kept | Correct the draft and submit a new intent |
| `stale` | `REVISION_CONFLICT`. The snapshot was refreshed. Nothing was saved and nothing is resubmitted | Review the refreshed preview, then submit again |
| `uncertain` | The connection dropped, the server failed, or a success answer could not be read | **Retry save safely** only. Never described as "not saved" |
| `offline` | The browser reported no connection, so nothing was sent | Reconnect, then save again |
| `signed-out` | 401. The change was not applied. The envelope is kept in memory | Sign in, then **Send again** or **Discard** |

Rules a screen can rely on:

1. A request ID and its base revision are created once per intent and kept through every retry.
2. While a change is uncertain, the promise returned by `run` / `runReviewed` stays pending. It resolves when the retry concludes, so a form keeps its draft and its generated IDs. Do not add a timeout around it.
3. A 409 of any kind refreshes the snapshot.
4. Snapshots are monotonic by revision. A poll never replaces a newer mutation response.
5. Nothing is written to `localStorage`, IndexedDB or a service worker. A reload loses drafts and a retained envelope.
6. There is no "Check save status": no read-only status endpoint exists.

`Modal` still listens to the `caminos-error` and `caminos-saved` window events, which the runner dispatches, so existing dialogs keep showing errors and their retry button.

## 3. Shared components

All in `src/components/`. They render what they are given and send nothing themselves.

| Export | Props that matter |
|---|---|
| `FocusPanel` | `mode: 'running' \| 'paused' \| 'ready' \| 'done' \| 'empty'`, `target?`, `timing?`, action callbacks. The caller derives `mode` from work sessions. Timer text is not a live region |
| `TaskRow` | `entry: TaskViewEntry` from `taskCollections`, `zone`, `today`, `recordedMinutes?`, `onOpen`, `onStart?`, `onPause?`, `onComplete?` |
| `CommitmentRow` | `block`, `flexibility` (pass `blockFlexibility(block)`), `status?`, `conflicts?: string[]`, `conflictAcknowledged?`, `onOpen?`, `onReviewConflict?`. Never renders a completion control |
| `CapacitySummary` | `capacity: CapacityResult`, `compact?`, `onChooseWindow?`. Shows the domain's numbers; recalculates nothing |
| `EstimateField` | `value?: number`, `onChange(value, valid)`, `required?`, `label?`. Blank stays blank |
| `SaveNotice` | `state: SaveState` and the runner callbacks. Rendered once by the shell |
| `TaskOutcomeDialog` | `task`, `state`, `now`, `run`, `initialMode?`. Done, partly done with remaining time, stop recording |
| `SwitchDialog` | Confirms pausing the running work before another starts |
| `format.ts` | `estimateLabel`, `minutesLabel`, `dateLabel`, `rangeLabel`, `deadlineLabel`, `kindLabel`, `parseEstimate` |

`src/planning/QuickCapture.tsx`: `QuickCapture({ run, onAddDetails?, onPlan?, autoFocus? })`.
`src/planning/TaskDetails.tsx`: `TaskDetails({ taskId, state, now, run, onClose, onPlan, onOutcome, onStart, onPause })`.

## 4. Task actions

`src/components/taskActions.ts`. The shell builds one `TaskActions` object and passes it to Today and Tasks. A planning screen that needs a direct task action should receive the same object rather than build its own.

```ts
interface TaskActions {
  start(target: SessionTarget): void;        // also resumes; asks before pausing other running work
  pause(sessionId: string): void;
  stop(sessionId: string): void;
  complete(task: Task): void;
  outcome(task: Task, mode?: 'choices' | 'partial'): void;
  details(taskId: string): void;
  plan(task: Task): void;                    // opens the placement editor
  capture(): void;
  resolveBlock(block: Block): void;          // outcome of a calendar entry
  busy: boolean;
}
```

**Outcome targets.** A task's outcome uses `task.resolve` through `TaskOutcomeDialog`. A calendar entry's outcome (routine, appointment, or a booked task chosen from the agenda) uses `block.resolve` through `ResolveDialog`.

**Booking on start.** `bookingForStart(state, target, now)`: a task booked for today records under that booking; a booking on another day is left alone and the work is recorded unscheduled. A routine records under its own entry.

## 5. Navigation

`src/components/AppNavigation.tsx`

- `DESTINATIONS`: Today (`home`), Plan (`schedule`), Tasks (`tasks`), Review (`history`), More (`more`). One configuration for `PhoneNavigation` and `DesktopRail`.
- Order: `effectiveNavOrder(state.settings)` from `shared/navigation.ts`.
- Routes kept: `#/home`, `#/schedule`, `#/tasks`, `#/history`, `#/goals`, and every supporting route. Aliases `#/today`, `#/plan`, `#/review` resolve to the same views.
- `#/tasks?view=today|later` selects the list view. Put only a date or a filter in a route, never writing.
- `+ Task` opens quick capture from every screen. Other record types are under "Add something else" and in their own destinations. Add appointment stays in Plan.

## 6. Shell entry points for other roles

`App.tsx` is the only place that mounts screens and dialogs. To add a flow, give AI 2 a component and these facts: the props it needs, what opens it, and what it does on success.

| Flow | Current entry | Waiting for |
|---|---|---|
| Plan today | Today's **Plan** and **Change plan** open the Plan screen for the date | AI 3's bound `PlanTodayForm` |
| Reset today | Same entry as above | AI 3's bound `ResetReview` |
| Whole-template preview | The existing template apply in Plan | AI 3's bound `WholeTemplatePreview` |
| End day | `EndDayDialog` in `src/planning.tsx` with the recording confirmation | AI 3's `EndDaySections` redesign |
| Review | `HistoryPage` | AI 4 |

`--planning-action-offset` for AI 3's inline pages: the phone bar is 66px high plus the bottom safe-area inset.

## 7. Styles

`src/main.tsx` imports, in this order: `styles.css`, `features.css`, `redesign-v2.css`, `redesign-v3.css`. `redesign-v3.css` is last on purpose.

- Every rule in it is scoped to a `v3-` class or to `.redesign-v3`. It has no bare `button`, `section` or `.card` rule.
- New semantic tokens in `tokens.css`: `--focus`, `--focus-surface`, `--success*`, `--warning*`, `--danger*`, `--disabled`, `--overlay`.
- Classes other roles may use: `v3-field`, `v3-optional`, `v3-hint`, `v3-field-error`, `v3-chip-row`, `v3-actions`, `v3-stack`, `v3-check`, `v3-notice`, and `v3-sheet` on a `Modal`.
- The section "Early planning compatibility" holds the few rules for the changes made in `src/planning.tsx`. They move to the planning styles when that file returns to AI 3.
