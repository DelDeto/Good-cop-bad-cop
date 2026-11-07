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

## V1.6.1 — turn recovery fixes

- Advance to a living player when a redirected shot eliminates the active shooter. A first leader wound retains the aim phase; terminal wins still take priority.
- Recover already-stalled persisted dead turns on the next read/alarm without disturbing pending choices.
- Clear a Coffee reservation when its player dies and validate it again at turn handoff. Normal and forced turn completion share a living-player successor path and preserve direction.
- Add 57 regressions/audit cases: 4/8-player tables, humans/BOTs, both directions, Coffee survival/elimination, leader wins, pending reconnect and DO alarm recovery.
- Confirm Serum can still wait indefinitely for an offline human; retain its target-controlled reveal rule pending policy approval.
- Bump package, Worker health, UI and asset cache keys to V1.6.1. No production deployment or merge.

## V1.6.1 PR review — stale aim and flaky BOT simulation

- Clear every aim reference to an eliminated player without assigning a replacement or removing surviving guns. Recover stale references on load/alarm; require a living aim at turn completion.
- Hide/guard shooting controls when the target is dead or missing; keep the normal main-action/aim phases for choosing a new target.
- Reproduce the Node 22 full-game failure with seed 1558 (5 BOTs, normal). Retain unseeded full games, add five seeded replays and public-state liveness checks after each move. Production RNG is unchanged.
- Expand to 126 tests and add a fail-on-any-error repeat runner. CI executes the entire suite five additional times per Node 20/22/24 job.
- Twenty local runs per Node version passed: 60 complete suites, 7,560 test executions, zero failed/skipped/cancelled. V1.6.1 shot/Coffee/Bribe fixes remain covered; the previously documented offline-human Serum policy gate remains open.

## V1.7.0 — responsive tabletop UX

- Replace the gameplay dashboard with a viewport table and one personal hand at the bottom. Viewer-relative 4–8-seat plans, compact mobile seats, original card art, public aim/shot arrows and readable status labels.
- Move chat, public timeline, help and private memory into drawers; preserve valid targeting and chat focus/drafts through unrelated SSE or chat responses. Mark invalidated memory without retaining old identities as current information.
- Equipment detail → target selection → confirmation; full-size seat inspection, touch/keyboard interaction, long-press release suppression and reduced-motion support. Server-confirmed private investigation detail, reaction and outcome feedback.
- Keep engine/server behavior and all V1.6.1 fixes. Only Worker release-version metadata changes. Synchronize public assets; target version/cache keys 1.7.0.
- Add browser geometry/scenario QA, actual multiplayer/7-BOT solo integration, before/after screenshots and CI browser artifacts. Existing UI tests adapted for the new release label, explicit equipment confirmation and read-only eliminated-seat inspection; gameplay/privacy assertions retained.
- Existing offline-human Serum P1 remains open; no merge or production deployment.
