# Caminos v2 — design and behavior verification

## Caminos rename verification — 26 September 2026

The production build, lint, and all 68 unit/API/operations tests passed. Chromium passed the 18-screen capture, daily-summary regression, and responsive checks at 320/390/768/1280 pixels (six browser cases). Refreshed Chromium captures under `artifacts/redesign-v2/` show Caminos; the mobile Home capture was visually inspected. The built frontend contains no previous-name references, and the install manifest serves the renamed icons successfully.

WebKit could not launch because this host is missing `libevent-2.1.so.7`; no current WebKit pass is claimed. Existing WebKit images and Figma reference images are historical. The source rename has not been deployed; runtime identifiers retained for compatibility are documented in README.md.

Final result: **passed**. No actionable P0/P1/P2 findings remain from the reviewed screens.

## Source and implementation

Source visual truth: [Caminos — Redesign v2](https://www.figma.com/design/546RE6EDMQscrkcNhjL8gL/Caminos?node-id=1-2). All 18 nodes were read with Figma design context before implementation. Reference code and screenshots are saved under `artifacts/figma-v2/`. Schematics page `88:2` remains the functional baseline alongside the accepted local specification.

| Screen | Node | Capture name |
|---|---|---|
| Home, active day | 100:16 | home-active |
| Home, before check-in | 100:142 | home-precheckin |
| Schedule | 100:233 | schedule |
| Add Task | 100:328 | add-task |
| Task Outcome | 100:383 | task-outcome |
| Goals | 100:418 | goals |
| Start Day | 100:663 | start-day |
| End Day | 100:739 | end-day |
| Health | 100:819 | health |
| Journal & History | 100:914 | journal |
| Envelopes | 100:1092 | envelopes |
| Add Menu | 100:1181 | add-menu |
| More Menu | 101:9 | more |
| Task List | 101:122 | task-list |
| Reminders | 101:228 | reminders |
| Settings | 101:317 | settings |
| Rocket League | 101:394 | rocket |
| Weather | 101:476 | weather |

Browser screenshots: `artifacts/redesign-v2/{capture-name}-chromium.png` and `-webkit.png`. All use synthetic authenticated records; no production personal data was opened for screenshots or tests. CSS viewport is 390 × 844 at device scale factor 1. Additional desktop captures are in `artifacts/verification/`.

## Comparison evidence

All 18 paired inputs are in `artifacts/redesign-v2/comparisons/{capture-name}.png`, Figma left and browser right. These combined images were opened and inspected. Focused typography, weather and current-task evidence is `comparisons/home-focus-detail.png`. Individual form/page pairs are large enough to inspect their controls directly.

Most references are 390 × 844. Home active was returned as 331 × 1024, representing a taller full-content frame; it was proportionally normalized to 390 × 1207 without stretching. More is 390 × 869. Browser captures are 390 × 844. Paired images preserve each full frame and pad unused space.

Some secondary Figma frames contain a 44-pixel simulated iOS status bar and home indicator. The real web app intentionally omits them, so content alignment is judged after subtracting mock system-chrome space. Sample names, dates, task counts, amounts and selected fields differ from the deterministic fixture. Comparisons assess corresponding layouts without inventing records to force equal heights.

## Findings and corrections

- Add Task initially inherited the browser dialog maximum width. Scoped CSS now makes the mobile sheet full width; final captures verify edge alignment.
- Linux lacked two mood glyphs. A 2,880-byte Noto Color Emoji subset now supplies all five choices locally. Its initial `/fonts/` URL was blocked by the existing static allowlist; moving it to `/assets/fonts/` fixed loading without weakening access rules. Final Chromium/WebKit captures show the glyphs. License and provenance ship with the font.
- Add Menu tile backgrounds and icon variants differed. Tiles now use the exact surface token, with source-matching Lucide glyphs, type sizes and padding. More now uses its compact square brand mark, gray badges and matching destination icons. Revised pairs were inspected.
- The envelope subtitle lost width to its action, and weather high/low figures stacked under an inherited rule. Scoped CSS fixes were recaptured and checked against the source.
- Rocket League section gaps were too large. They now use 12-pixel spacing; the revised pair was inspected.
- Early captures included stale mouse-hover highlights. Final captures move the pointer away.

Behavior review also fixed ongoing appointments offering invalid task-start actions, Home/Task List timezone grouping, finished follow-up tasks still claiming time remained, and overdue envelopes counting as upcoming weekly expiries. Regression coverage verifies each. End Day preserves an edited summary after collapsing its editor and protects a journal draft when another task dialog saves.

## Fidelity surfaces

- **Typography:** system sans-serif follows the user's explicit tokens, rather than importing Inter/Geist from individual Figma nodes. Heading hierarchy, weights, uppercase labels and compact sizes follow the designs. Platform font metrics differ slightly. No clipped text or uncontrolled wrapping was found.
- **Spacing/layout:** compact brand bar, rounded cards, fixed Add action, flat navigation, compact agenda and sheets match the new composition. Real data may lengthen pages. Scrolling/bottom padding keep actions reachable; the full timeline and optional fields remain available.
- **Colors:** background `#0b0c0d`, surface `#191a1c`, gold `#d8b978`, text `#f4f2ed`, muted `#a6aaae` and borders `#34373a` match the supplied palette. Status has text labels in addition to color.
- **Assets:** Lucide glyphs match the source symbols. No bespoke illustration or photography is required. Mood emoji are locally bundled font glyphs. The existing installation manifest/icons remain intact. No third-party font request is introduced.
- **Copy/data:** missing values remain unknown. The journal has a correct seven-column calendar, while the mock wraps dates incorrectly. Weather shows supported rain chance/high-low/forecast periods instead of fabricated humidity/wind. Reminders use stored start/expiry times instead of implying recurrence. Weight retains the accepted pounds format. Balances/audit tools remain in Envelopes. Goal percentages count leaf steps; partial task duration does not invent a completion percentage.
- **Interaction/accessibility:** semantic controls, accessible names, native dialog focus, visible keyboard focus, dirty-draft confirmation and reduced-motion behavior remain. Navigation stays consistent where Figma uses different variants. Physical-phone and screen-reader testing are not claimed.

## Validation

- TypeScript/Vite production build and ESLint pass.
- All 67 domain/API/weather/CLI/operations tests pass.
- All 21 browser cases pass in Chromium and all 21 in WebKit: setup, day lifecycle, optional check-in data, summaries/journals, partial work, snooze, schedule history, template idempotency, lost-save recovery, goal trees, health/practice, envelopes, reminders, weather search, settings order, empty data and unavailable weather.
- All 18 redesign states are captured in both engines. After final visual corrections, the six relevant capture/regression/responsive cases were repeated in each engine and passed.
- Four-width sweeps cover all 14 routes at 320, 390, 768 and 1280 pixels, checking horizontal overflow and browser errors. The private synthetic fixture uses port 5197 to avoid another project's test service.

## Checklist

- [x] Read all 18 nodes and preserve reference artifacts.
- [x] Implement every screen while preserving private workflows.
- [x] Inspect full and focused source/render pairs.
- [x] Correct findings and review new captures.
- [x] Pass functional, responsive, empty and failure-state checks.

Follow-up polish: physical-device font rendering and preferences learned through daily use. Deferred calendar/watch/AI/bank integrations remain deferred. The prior visual report is retained at `artifacts/verification/design-qa-v1.md`.

final result: passed
