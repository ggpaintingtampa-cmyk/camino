# Caminos v3 — design handoff

September 27, 2026. Design artifacts only. Application code, executable schemas, tests, and deployment were not changed.

Reviewed handoff: [the independent review and resolutions](review-resolution.md) now govern implementation sequencing and compatibility. This updates the design contract, not the implementation status.

## Read in this order

1. [Product and behavior schema](../../REDESIGN-SCHEMA.md).
   Follow with [the detailed implementation skill](../../skill.md) and [four AI prompts](../../AI-IMPLEMENTATION-PROMPTS.md), scheduled with at most two active sessions.
2. [Figma blueprint](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=115-54).
3. [Phone Today design](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-38) and [desktop Today design](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=122-320).
4. [Phone prototype — active day](https://www.figma.com/proto/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-38&starting-point-node-id=119%3A38) or [start from before the day](https://www.figma.com/proto/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-4&starting-point-node-id=119%3A4).

The editable design is on **Caminos v3 — Daily flow**, page `115:2`, in the existing file. Existing v2 pages are preserved. The canvas includes the blueprint, visual foundations, reusable controls, phone flows, desktop layouts, and supporting tools. Screens are top-level frames so Figma can use them as prototype destinations; canvas headings group them visually.

## What was created

- 47 screen/state/layout frames: 41 phone frames at 390px, one narrow phone study at 320px, one tablet study at 768px, and four desktop frames at 1440px.
- Two variable collections with 42 variables: source-derived colors plus proposed semantic colors, spacing, and radii; explicit scopes and web syntax.
- Seven text styles using SF Pro as a representative of the approved system sans-serif stack. No web-font dependency is proposed.
- Four local component sets with 13 variants: actions, task rows, fields, and navigation items. Screen compositions reuse those components.
- A linked phone demonstration of capture, planning, starting work, pause/resume, recovery, day closure, and review. Desktop and tablet layouts are visual studies, not separate fully interactive prototypes.
- Fixed phone navigation, scrollable content, and persistent primary actions for capture, planning, recovery, starting, and closing a day.

All example tasks, appointments, journal text, weather, and money values are invented design fixtures. No production records or Pirata data were used.

## Core screen links

| Screen | Figma |
|---|---|
| Before day | [S01](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-4) |
| Today / working | [S02](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-38) |
| Paused | [S03](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-88) |
| Plan today | [S05](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-185) |
| Tasks | [S06](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-233) |
| Quick capture | [S07](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-278) |
| Agenda | [S09](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=120-118) |
| Reset today | [S11](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=120-211) |
| End day | [S14](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=120-331) |
| Day review | [S15](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=120-374) |
| Weekly review | [S16](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=120-415) |
| Goals | [S17](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=121-231) |
| More / supporting tools | [S18](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=121-265) |

All frame IDs are in [figma-screens.json](figma-screens.json); foundation and component IDs are in the adjacent state files.

## Design verification

- Read back every screen's dimensions, text families, action sizes, child widths, and reaction destinations. The structural audit found no horizontal overflow, non-SF-Pro text, action buttons below 44px height, or links to missing destinations.
- Visually inspected the blueprint and foundations; component variants; the main phone planning/recovery/shutdown screens; task capture, agenda, history, weekly review, money, narrow phone, tablet, and representative desktop layouts. Fixed clipped documentation rows, extended desktop rail backgrounds, and added real scroll regions and persistent phone actions.
- Verified the history calendar has seven weekday columns with September 2026 dates aligned correctly.
- Calculated selected text contrast pairs from the design tokens: primary text/background 17.50:1; muted text/background 8.37:1; muted text/raised surface 6.66:1; dark text/gold action 10.38:1; gold text/focus surface 8.42:1. These checks do not constitute full accessibility certification.
- The prototype API initially rejected nested navigation destinations. Frames were promoted to top-level page children with their positions preserved, then links were created and checked again. There are three named starting points.
- No application build or tests were run for these documentation and Figma changes. Keyboard, screen-reader, actual browser zoom, real touch behavior, and production data migrations remain implementation-stage checks.

## Limits and decisions for review

### Corrections required by the implementation review

- Keep saved four-tab navigation through Phases 2–5; Phase 6 activates five tabs with the matching shell and Settings editor. Continue accepting old four-tab commands before receipt lookup, with normalization only after receipt/fingerprint/revision handling.
- Keep draft schemas provisional on disposable fixtures until the supported-release/owner-data freeze boundary. Do not force Phase 2 to define all R2 collections.
- Require an explicit migration operation for existing databases, with absolute target, target version, apply opt-in, and new verified backup. Normal API/CLI/MCP open is not migration authorization.
- Assign timezone/date/open-day context to each work interval. A resume weeks later contributes to its actual reporting period. Stop recording works without Start Day; session creation date is not an accounting bucket.
- Keep legacy block start/end projections as specified in `skill.md` section 4.5, but make sessions authoritative before exposing Pause.
- R1 delivers the dependable daily loop and simple plans. R2 delivers advanced allocations, variants/subsets, detailed history, weekly learning, and the remaining enhancements. The existing 47 frames depict the full target, so some views combine release scopes. Do not implement unavailable R2 controls as fake R1 interactions.
- The four prompts are roles, not four concurrent workers. Use the two-session GitHub handoff schedule. Codex paths/tools are host-specific; the reviewer-reported WebKit dependency issue is not a passing test.

The [Figma blueprint](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=115-54) now records the reviewed R1/R2 delivery, coordinated navigation, explicit migration, interval context, and two-worker handoff. [Paused Today](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=119-88) has a compact Stop recording action; [task outcomes](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=123-377) explicitly offers Stop recording · keep task open. Both prototype Stop actions lead to the ready state. The resolution record states the verification performed. Earlier complete-screen QA remains evidence for its original design pass, not for unperformed application tests.

### Prototype scope

This is the first editable visual proposal from the schema, not an implemented application. Review the navigation change (Today / Plan / Tasks / Review / More), the prominence of current work, and the density of the planning and recovery screens before coding.

The phone prototype uses static synthetic states. It demonstrates navigation; it does not save text, run clocks, calculate capacity, execute financial operations, or preserve state across arbitrary navigation paths. Secondary controls and supporting-tool details are illustrative. A detailed 24-hour view is included as a scrollable study; the default remains the agenda. The schema remains authoritative for behavior not fully simulated in the prototype.

The Figma component library is local and editable. Community components were searched; a generic Input search returned HTTP 504. Caminos components were created from the app's established palette and the accepted blueprint rather than importing a different product's theme. Code Connect was not created for proposed components because their application implementation is explicitly deferred.

Before coding, settle the visual direction and final interaction details against the schema, then turn the accepted design into migrations and validated commands. Keep all feature implementation boxes in the roadmap pending until real behavior exists and has been verified.

## Final review and implementation kickoff

The five follow-up findings are resolved in [the resolution record](review-resolution.md): explicit release tags, Phase 3 legacy End Day compatibility, bounded AI 2 ownership transfers, interval-level booking links, and missing-database creation intent. These refine behavior/contracts; no additional Figma frame edit was required by this review.

[Prompt 4 setup evidence](../../docs/redesign-v3/review-handoff.md) records the subsequent test-infrastructure batch separately from the historical design-only QA above. [Coordination](../../docs/redesign-v3/coordination.md) records actual GitHub status and the two-role start order. Do not treat new harness checks as proof that the proposed v3 screens or behaviors are implemented.
