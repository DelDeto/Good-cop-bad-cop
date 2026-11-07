V1.6.1 gameplay used a scrolling dashboard with duplicated own-card presentation and replaced chat/focus during SSE updates. V1.7 replaces it with a viewport tabletop, a viewer-relative 4–8-seat arrangement and one personal hand anchored below the table. Mobile uses compact visible opponents and full-size inspection/action alternatives; timeline, private memory, chat and help are drawers.

Keeps the engine and server byte-identical to V1.6.1; Worker behavior is unchanged apart from health version metadata. All 23 equipment, BOT/human modes, private state, SSE/reconnect and V1.6.1 fixes remain. No merge or production deployment; existing offline-human Serum P1 remains explicitly open.

Validation:
- 133 tests including all 126 prior regressions; five complete runs on each Node 20/22/24: 1,995 passed, none failed/skipped/cancelled.
- Chromium: 48 measured viewport/seat/viewer/status cases, no page overflow or overlapping seats, and 11 gameplay groups including Wire/Bribe, private investigation, aiming/redirection/reactions, two-target SSE preservation, memory invalidation, focus/drafts, offline reload and native touch.
- Actual server integration: separate-context multiplayer create/join/start/private investigation/reload plus 7 hard BOT solo with actual timer activity.
- Public/Cloudflare generated assets synchronized; CI includes Node repeats and a Chromium evidence artifact job.

Review UX_SPEC_V1.7.md, docs/v17/UX_COMPARISON.md and docs/v17/TEST_REPORT.md. Before/after PC/mobile screenshots, machine-readable geometry and test transcripts are committed under docs/v17. Real Cloudflare staging/runtime, physical devices/Safari and independent card-rule verification remain unverified.

Base is feature/v1.6-sprint-01, deliberately not old main. Keep this PR and PR #1 unmerged; do not deploy production automatically.
