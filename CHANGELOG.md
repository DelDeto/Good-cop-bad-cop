# V1.6 — Sprint 01 changes on V1.5 base

- Fix Wire owner/watched-player lookup and share the exact private investigation result across human/BOT turns.
- Resolve Bribe in two server-controlled stages, consume on successful investigation, persist owner-only choice, reject stale/duplicate decisions, and refresh position knowledge after swaps.
- Standardize explicit interaction states and recover stale selections from authoritative snapshots.
- Show shooter, victim, reactions and countdowns on the table; highlight the viewer's defensive equipment; preserve reconnect and optional reactions.
- Label the legacy per-turn `round` counter as LƯỢT everywhere on the table.
- Generate Cloudflare assets from `public/` with `npm run assets`; verify with `npm run assets:check`.
- Add regression tests, HTTP/SSE smoke runner and optional Chromium fixture runner/screenshots. Remove two existing BOT equipment heuristics that inspected other players' hidden leader roles; remaining rule eligibility stays server-controlled.

No production deployment, team/win-rule changes, or new artwork. Existing V1.5 branding/package version is retained until release review.

## Sprint 01 release-gate follow-up (Draft PR #1)

- Add a persisted 60-second Bribe decision limit. Expiry declines the optional exchange, retains authorized investigation knowledge and does not refund spent equipment. Offline owners cannot block the room indefinitely.
- Schedule expiry in both Node timers and Durable Object alarms, with lazy recovery on reconnect/request. Legacy timestamp-less decisions decline on recovery. Late/duplicate decisions cannot swap.
- Serialize Durable Object commands and alarms to protect concurrent decision resolution.
- Add GitHub Actions on PR/push with a Node 20/22/24 matrix: regressions, private HTTP/SSE transport checks, asset synchronization and actual server smoke. Read-only permissions, immutable action pins, no deployment.
- Expand to 54 tests, including no-client timer expiry, cross-restart deadline preservation, concurrent commands, invalid token/stolen-decision attacks, private live SSE/reconnect and ordinary/leader response noninterference.
- Add browser timeout recovery evidence. Staging and physical-rule approval remain open release gates.
