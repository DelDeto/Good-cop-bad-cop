# V1.6 — Sprint 01 changes on V1.5 base

- Fix Wire owner/watched-player lookup and share the exact private investigation result across human/BOT turns.
- Resolve Bribe in two server-controlled stages, consume on successful investigation, persist owner-only choice, reject stale/duplicate decisions, and refresh position knowledge after swaps.
- Standardize explicit interaction states and recover stale selections from authoritative snapshots.
- Show shooter, victim, reactions and countdowns on the table; highlight the viewer's defensive equipment; preserve reconnect and optional reactions.
- Label the legacy per-turn `round` counter as LƯỢT everywhere on the table.
- Generate Cloudflare assets from `public/` with `npm run assets`; verify with `npm run assets:check`.
- Add regression tests, HTTP/SSE smoke runner and optional Chromium fixture runner/screenshots. Remove two existing BOT equipment heuristics that inspected other players' hidden leader roles; remaining rule eligibility stays server-controlled.

No production deployment, team/win-rule changes, or new artwork. Existing V1.5 branding/package version is retained until release review.
