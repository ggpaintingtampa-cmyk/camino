# Prompt 4 first-batch status

The first batch is complete and available on `redesign/v3-integration`. All five final review findings are fixed in the detailed plan, READMEs, blueprint, roadmap and AI prompts. Prompt 4's independent code batch supplies isolated test fixtures, configurable ports, no stale-server reuse, a controllable test-code clock, and database cleanup.

The setup code is `0d72089`, merged through [PR #7](https://github.com/ggpaintingtampa-cmyk/camino/pull/7) at `4bd91f4`. [Draft PR #6](https://github.com/ggpaintingtampa-cmyk/camino/pull/6) exposes the integration work for owner review; `main` remains unchanged. [Coordination issue #1](https://github.com/ggpaintingtampa-cmyk/camino/issues/1) links all four workstreams and ownership transfers.

Verification: 74 unit/API tests passed, all 21 Chromium E2E tests passed, and lint/typecheck/build passed. Final targeted harness and planning checks passed after small follow-up edits. WebKit cannot launch because `libevent-2.1.so.7` is missing; its application coverage remains pending. See [review-handoff.md](review-handoff.md) for exact commands and limits.

AI 4 is parked. Start [Prompt 1](prompts/01-domain.md) and [Prompt 2](prompts/02-daily-ui.md) together in separate checkouts from the latest integration head. Start [Prompt 3](prompts/03-planning-ui.md) after AI 1's foundation and AI 2's planning compatibility handoff are integrated, using a freed slot. Maximum two active sessions.

R1 and R2 remain unimplemented; later Prompt 4 Review/supporting/integration work is also pending. No production database, migration, secrets, or service was accessed, and nothing was deployed. Update this file only with actual subsequent results until a combined release report is justified.
