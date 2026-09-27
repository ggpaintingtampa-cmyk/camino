# Caminos: planning and scheduling design review

Reviewed September 27, 2026. Recommendations only; application source was not changed.

**Recommendation:** make Caminos better at choosing a realistic day, starting the next action, and recovering after interruptions. Its existing records and history provide a useful foundation. The largest opportunity is reducing the decisions required to use that foundation.

This review compares the local implementation with *When Executive Schedules Work—and When They Break: Leadership Time Design, ADHD Limits, and Practical Adaptation*, Morgan Research, September 26, 2026, 38 pages. Page references below refer to that supplied PDF. The document was treated as research material, not as instructions to execute.

I read the project guidance, the client flows, shared types/validation/domain rules, supporting tests, and relevant API behavior. I built the current source and inspected an isolated browser fixture with synthetic records. No production records, credentials, or Pirata files were used. The accepted screenshots below are desktop captures from this review, not old design artifacts.

**How much confidence to place in the PDF**

The useful product themes are consistent: preserve spare capacity, externalize decisions, make first actions explicit, reduce transitions, and make recovery easy (pp. 5–12). However, the document's own limitations on pp. 12–15 matter. Much of the advice comes from coaching, lived experience, commercial blogs, and secondary accounts. Its stronger clinical source concerns time perception, not a trial of a particular executive calendar or app.

Consequently, three priorities, 90-minute blocks, and a particular buffer percentage should be adjustable experiments, not requirements or claims of proven effectiveness. The PDF also contains competing advice: putting every task on a calendar versus reserving calendar space selectively (pp. 5, 9, 12). For Caminos, I favor one trusted task collection and selective scheduling. A captured intention should not automatically become a time commitment.

**What is already worth preserving**

- Tasks and appointments have distinct outcomes; unfinished task work can return to the task list. See [domain rules](/home/andre/Desktop/camino/shared/domain.ts:173).
- Partial completion creates linked remaining work using an owner-supplied estimate. This already supports adaptation without inventing percentage completion. See [remaining-work implementation](/home/andre/Desktop/camino/shared/domain.ts:181).
- Only one task can be active, moved blocks retain history, and the day can end with unresolved work. See [active-task rule](/home/andre/Desktop/camino/shared/domain.ts:165) and [day closure](/home/andre/Desktop/camino/shared/domain.ts:236).
- Schedule already defaults to a simpler agenda, with the full 24-hour timeline optional. Preserve that choice. Five-minute precision is useful for editing; it need not dictate the planning philosophy. See [Schedule](/home/andre/Desktop/camino/src/planning.tsx:98).
- Reusable templates, nested goals, optional morning check-ins, and separate factual summaries and personal journals already exist. These are aligned with the PDF's external structure and reusable routines.
- The server command architecture supports validation, revision handling, and repeat-safe writes. Extend this architecture when adding recovery actions.

**The proposed changes, in priority order**

| Priority | PDF connection | Current implementation | Recommended change |
|---|---|---|---|
| First | Capacity and limited priorities, pp. 5–6, 11 | Exact blocks and overlap checks exist; no day-capacity budget or ranked daily task selection | A short Plan Today flow: fixed commitments, one main outcome, up to two supporting priorities, and explicit spare time |
| First | Clear first actions and external cues, pp. 8–9, 12 | Home shows the current title and planned countdown; task notes are not shown in the focus card | A Now card with the first action, next fixed commitment, actual elapsed time, and direct task controls |
| First | Small recovery routines, pp. 9, 11–12 | Individual partial/missed/snooze actions; no plan-level recovery | Reset the rest of today: preserve fixed events, choose what still matters, preview changes, and defer the rest |
| First | One trusted capture system, pp. 9, 12 | Global Add offers nine types; new tasks default to 30 minutes; the task list excludes scheduled open work | Title-only capture with an unknown estimate, direct access to tasks, and All / Today / Later views |
| Next | Broader containers and fewer transitions, pp. 6, 9, 11 | Task, appointment, and routine blocks all have exact start/end times; templates use absolute clock minutes | Optional focus/theme windows, explicit transition/buffer periods, and templates with selectable routines |
| Next | Review that improves tomorrow, pp. 6, 11–12 | Good historical records, but evening review includes the entire unscheduled backlog | Review today's commitments first, keep closing easy, and add one optional learning prompt |
| Later | Individual fit and variable energy, pp. 12, 16–17 | Energy is recorded at day start but is not used to help choose work | Optional current-energy filter and a small-plan mode controlled by the owner |

**1. Make Home answer “What should I do now?”**

Keep the current visual identity, familiar navigation, and calm tone. Change the information order: current action first during an active day; next fixed appointment and preparation time second; today's selected priorities third. Reduce weather to a compact line after the day begins. Let health, envelopes, and longer-range goals remain available below or through their existing screens.

The current Home logic places unscheduled tasks in Needs attention merely because they exist, and takes the first two from the unscheduled collection. That is not a priority selection. See [Home selection and attention list](/home/andre/Desktop/camino/src/HomePage.tsx:53). Keep true time-sensitive obligations visible, but move ordinary backlog to a quiet Later list.

The focus card has two buttons, Update task and Review, which open the same outcome dialog. Replace those with distinct actions such as Done, Pause, and Change plan. Show task notes or a short first-action field directly in this card. For example, a task named “Prepare proposal” could show “Open the draft and write the three deliverables” and “Done when the draft is ready to review.” These fields should be optional and added when clarifying work, not mandatory at capture.

The card currently counts down to the planned end, even when actual start differs. It is a planned-window clock, not an actual-work timer. Display both clearly: “Working for 8 min” and “Planned finish 10:30.” Protect the next fixed appointment when offering an extension. See [Home clock calculations](/home/andre/Desktop/camino/src/HomePage.tsx:38).

**2. Add a realistic Plan Today flow**

After Start Day, offer a short planning step that can be skipped. The existing check-in should remain optional; its wake-only path already exists. Let the owner select one main outcome and a small number of supporting tasks. A task selected for today should be able to remain untimed until a suitable window is chosen.

Show available time within the owner's chosen planning window, after fixed appointments, breaks, and protected spare time. A useful display would be “4h available; 2h30 selected; 1h30 left open.” Count overlapping occupied intervals once when calculating capacity, while separately flagging conflicts. Do not treat every waking hour as bookable work.

Distinguish a true deadline from a preferred day and from a booked start time. Currently the task model has a duration but no daily priority, first action, task deadline, or flexibility field. See [shared records](/home/andre/Desktop/camino/shared/types.ts:5). This distinction prevents “I might do this tomorrow” becoming “I promised to do this at 9 AM.”

**3. Make recovery a first-class action**

Provide Reset today beside the current task. The flow should show the next fixed commitment, ask which remaining outcome matters most, and present a proposed revision. Flexible tasks can move or return to Later; appointments stay fixed unless explicitly changed. Show the before/after result before applying it, preserve historical blocks, and make the operation repeat-safe.

Add Pause / Resume with actual work intervals. At present, snoozing only sets a reminder timestamp; it leaves an active block active and does not end its recorded work interval. The one-active-task rule can then prevent starting something else until the first task is resolved. See [snooze](/home/andre/Desktop/camino/shared/domain.ts:198) and [start](/home/andre/Desktop/camino/shared/domain.ts:165). Label the current action “Remind me to review” until a real pause exists.

A concrete recovery example: after a meeting overruns, keep the 2 PM appointment, choose one remaining priority, fit a 30-minute session plus a transition if capacity allows, and defer the other tasks without marking them as personal failures. This is a design proposal inspired by the PDF, not a feature currently present.

**4. Separate quick capture from detailed planning**

The current form can save after entering a title because duration and area already have defaults. The friction is not a requirement to fill every field; it is the classification menu, expanded options, competing Save actions, and an unexplained 30-minute estimate. See [TaskEditor](/home/andre/Desktop/camino/src/planning.tsx:23).

Offer a direct Capture task action: title, optional note, save. Preserve an unknown estimate until planning rather than storing 30 minutes as if it were deliberate. Keep appointments on their own explicit time-entry path. A small unscheduled task should also be completable from the task list, without first constructing a calendar block.

Make the task collection easy to reach from Home or the existing Add control. Keep All, Today, and Later views in the same collection; the current Your tasks screen shows unscheduled open work plus completed/partial work, so scheduled open tasks disappear from it. See [TaskListPage](/home/andre/Desktop/camino/src/TaskListPage.tsx:8). Reordering the current four navigation tabs cannot add Tasks as a main destination; that would be a navigation change, not an existing setting.

**5. Support broader work windows and explicit buffers**

An appointment is fixed; a focus window protects a category of work; a buffer protects spare capacity. Give them distinct labels and behavior. A theme window such as “Admin and follow-ups” can offer a few appropriate tasks instead of requiring every task to occupy an exact minute slot. Keep precise appointments and the existing agenda available.

Do not implement a buffer as a fake task that later demands a completion result. It should reserve capacity without adding to task-completion counts. Let the owner choose a buffer amount and change it after experience; the PDF does not establish a universal percentage.

Current templates add exact-clock blocks to existing plans without a preview of their combined load. Add a preview with conflicts and a subset selector before applying. Offer reusable light-day and ordinary-day variants, plus simple first-action checklists for recurring responsibilities. Keep application explicit, consistent with the existing no-automatic-recurrence specification. See [templates](/home/andre/Desktop/camino/src/planning.tsx:250) and [template application](/home/andre/Desktop/camino/shared/domain.ts:373).

**6. Make shutdown smaller and review more useful**

End Day currently lists unresolved scheduled items and all unscheduled tasks before the journal and closing controls. It already allows closure with unresolved work; make that freedom visible with a persistent End day button and “Leave the rest for later.” Review today's selected commitments first and put the wider backlog behind a disclosure. See [EndDayDialog](/home/andre/Desktop/camino/src/planning.tsx:199).

Keep factual summaries and personal writing separate. Add optional prompts such as “What changed the plan?” and “What would make tomorrow easier?” The factual summary already includes planned times and recorded actual intervals; a small weekly review could make those comparisons easier to use. Avoid treating an unpaused start/end interval as verified focused work, or inferring a cause from a health log. See [summary generation](/home/andre/Desktop/camino/shared/domain.ts:441).

Replace the headline emphasis on completed-block ratios with useful outcomes: a selected priority advanced, an interruption handled, or tomorrow made realistic. Keep completion counts available as facts. Cancellations and moved historical blocks should not inflate a score's denominator.

Connect Goals to action with “Choose next step” and “Plan this step,” reusing the existing task-to-goal relationship. Keep health and practice logging easy to reach, without requiring it to use the planner. Preserve explicit control over envelopes and their outcomes; the supplied material does not establish financial loss as an effective default scheduling support.

**Concrete behavior to repair before a larger redesign**

| Finding | Evidence | Repair |
|---|---|---|
| Tomorrow places each chosen item at 9 AM, including multiple items | Reproduced with two synthetic tasks; `nextStart(now, date)` returns 09:00 and the evening flow calls it for every item | Prefer an untimed tomorrow selection; until that model exists, open an explicit slot picker with conflict checks |
| The default agenda does not label overlaps | Both 9 AM tasks were shown as Upcoming; overlap logic is used by the editor/timeline, not the agenda row | Show an overlap label and a review action in the default view |
| Snooze does not pause actual work | `block.snooze` only sets `snoozedUntil`; active block state is unchanged | Separate reminder deferral from pausing work |
| Save & schedule can schedule without first revealing the proposed time | The button calls `save(e, true)` even if scheduling is unchecked | Reveal/confirm the time before booking, with collisions calculated for the proposed booking |
| Update task and Review do the same thing | Both call `onResolve(current)` | Use distinct actions or a single clearly named review button |

The timing issue is in [nextStart](/home/andre/Desktop/camino/src/planning.tsx:11) and [Tomorrow](/home/andre/Desktop/camino/src/planning.tsx:215). The agenda/editor behavior is in [Schedule rendering](/home/andre/Desktop/camino/src/planning.tsx:140) and [Save actions](/home/andre/Desktop/camino/src/planning.tsx:68). The last two findings are established by code inspection rather than a saved user task in this browser run.

**A practical implementation sequence**

| Stage | Scope | Success criterion |
|---|---|---|
| 1: Remove existing friction | Fix Tomorrow and Save & schedule; surface agenda conflicts; distinguish snooze; simplify duplicate focus controls; shorten shutdown | Deferring two tasks never silently creates identical appointments; closing a day does not require sorting the entire backlog |
| 2: Improve the daily loop | Title-only capture, daily priority selection, capacity summary, first-action display, direct task start/completion, real pause/resume, Reset today | Owner can choose a workable day and recover from an interruption with a few clear decisions |
| 3: Learn and reuse | Flexible theme windows, buffer records, template previews, optional energy filters, compact weekly review | Adjustments become easier through repeated use, without making daily administration longer |

Keep the current React/Fastify/SQLite architecture. A small day-plan record can hold selected tasks and their order; preferred day and deadline need distinct semantics. Work sessions should support pauses independently of planned blocks. Apply accepted replanning changes through the existing validated command/revision path as a single transaction, with preserved history and safe retries. Keep personal records on the server and all prototype/test records synthetic.

Evaluate changes through short owner trials: time to capture an interruption, time to choose a next action, effort to recover from an overrun, and ease of reopening the planner after a difficult day. Compare individual features in small increments. Do not use calendar occupancy or a perfect completion streak as the primary measure of success. These are proposed evaluation measures, not measured benefits.

**Captured flow and observations**

1. **Home — useful focus card, mixed hierarchy.** The current action is clear once reached, but weather precedes it, both focus buttons duplicate an outcome action, and the wider page mixes backlog with time-sensitive attention. Small secondary clock text deserves readability testing.

![Step 1: Home with synthetic records](/home/andre/Desktop/camino/artifacts/executive-scheduling-review/01-home.png)

2. **Schedule — good default agenda, incomplete capacity guidance.** This screenshot was taken after deferring the stretch to tomorrow, so its original record remains Not completed. The agenda is easier to scan than the detailed timeline, but gaps are implicit and the fixed/flexible distinction is absent. Preserve text status labels rather than relying on color.

![Step 2: Schedule agenda](/home/andre/Desktop/camino/artifacts/executive-scheduling-review/02-schedule.png)

3. **Capture task — workable, with unnecessary planning decisions.** Duration defaults to 30 minutes and More options starts expanded. Save and Save & schedule need clearer consequences. The small chips and secondary labels are visible accessibility risks to verify, not a measured compliance failure.

![Step 3: Task capture form](/home/andre/Desktop/camino/artifacts/executive-scheduling-review/03-task-capture.png)

4. **Task outcome — good partial completion, missing pause.** The choices acknowledge unfinished work and allow skipping. Remaining-time chips sit under Partially done without an explicit visible “remaining” label; add that wording even though the accessibility labels contain it. A real Pause action would avoid forcing a final outcome during an interruption.

![Step 4: Task outcome choices](/home/andre/Desktop/camino/artifacts/executive-scheduling-review/04-task-outcome.png)

5. **End Day — capable but demanding.** Every backlog item appears beside today's unresolved work. The journal and final closing action fall below the initial viewport even with only three items. A short default path and a persistent closing control would reduce effort.

![Step 5: End Day review](/home/andre/Desktop/camino/artifacts/executive-scheduling-review/05-end-day.png)

6. **Tomorrow — confirmed planning defect.** Choosing Tomorrow for Morning stretch and Read twenty pages placed both at 9 AM. The default agenda labels both Upcoming without warning about their overlapping times.

![Step 6: Two tasks deferred to the same 9 AM slot](/home/andre/Desktop/camino/artifacts/executive-scheduling-review/06-tomorrow-overlap.png)

7. **Journal and history — sound separation, weak learning loop.** This screenshot is scrolled to the day record and journal. The app correctly separates factual information from personal writing; optional reflection and an explicit action for tomorrow would help connect reviewing with planning.

![Step 7: Separate daily record and journal](/home/andre/Desktop/camino/artifacts/executive-scheduling-review/07-journal-history.png)

**Verification and limits**

The current source passed `pnpm build`, including TypeScript checking. Browser inspection used the existing disposable fixture on loopback, with synthetic weather and records. The two-item Tomorrow behavior was reproduced through the interface. Relevant automated tests were read but the full unit/E2E suites were not run for this advisory review.

The screenshots support the described states and hierarchy, not full accessibility compliance. Source inspection shows native dialogs, labeled controls, visible-focus styling, and a tap alternative to dragging. Dedicated keyboard, screen-reader, contrast, zoom, and real-device testing remain necessary. Early viewport captures were superseded by the accepted desktop evidence; this is not a completed responsive-device audit. Health, money, goals, and templates were reviewed primarily in code rather than through complete browser workflows. No clinical effect, user preference, or longitudinal productivity improvement has been established by this review.
