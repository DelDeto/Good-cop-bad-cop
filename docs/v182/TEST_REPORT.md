# V1.8.2 test and release gates

Implementation validation before version promotion:

| Gate | Result / scope |
|---|---|
| Existing regression suite | PASS: all 152 preserved |
| New UI privacy/feedback regressions | PASS: seven; total 159 |
| Node 20.20.2 / 22.23.4 / 24.22.1 | PASS: three full runs per version, 1,431 test executions, zero skips/failures |
| Chromium geometry | PASS: 94 cases, 4–8 players, desktop/portrait/landscape, two safe-area simulations |
| Requested viewport sizes | PASS: 1366×768, 1440×900, 1920×1080, 360×800, 375×667, 390×844, 430×932 |
| Chromium fixture gameplay | PASS: 11 groups; investigation, equipment cancellation, aim/shoot/reactions, Wire/Bribe, death, touch, reconnect |
| Actual local multiplayer / hard BOT integration | PASS |
| Exact post-deployment browser verifier rehearsal | PASS: fresh four-human/eight-seat BOT rooms, secrecy, reload, shot and injury |
| Identical-state before/after audit | PASS: 14 states; all state hashes match; independent visual improvement thresholds pass |
| All equipment text | PASS: all 23 full names and unchanged descriptions, no title clipping on mobile |
| Animation completion | PASS: accepted use finishes and cleans up; reduced-motion regression passes |
| Live knowledge invalidation in inspector | PASS: real Blackmail exchange removes stale known face while modal stays open |
| Reaction drawers | PASS: warning and defensive equipment remain unobstructed; nonmodal keyboard behavior |
| Assets/fonts, synchronization, protected-source hashes | PASS; no backend/game-rule/schema changes |
| Hosted CI / actual V1.8.2 production | Must PASS on final commit/tag; authoritative report locations below |

Local result summaries are captured in `evidence/`; full TAP logs remain in the local QA output directories. They record checkout base
`ff2d6bc` while testing the uncommitted implementation; they are not represented
as exact final-commit evidence. Hosted Actions runs the entire suite once plus
five retained repetitions per Node version, without retrying failures away. It
also runs all geometry, four strict golden comparisons, the new 14-state visual
audit, real integration and the exact production-verifier rehearsal. CI artifacts
provide exact-commit TAP, JSON and screenshot evidence.

Only promote package, health/cache version and complete UI release declaration
after implementation CI passes. Then require final-commit CI and existing
Cloudflare preflight/dry-run before tagging that exact canonical branch tip.
No intermediate development push deploys production; no main merge is required.
The existing guarded rollback retains the verified active V1.8.1 Worker version,
namespace/runtime fingerprint and baseline frontend hashes before activation.

After the tagged release, authoritative health, resource hashes, actual production
browser results, SHA, Actions URL, Cloudflare IDs and rollback outcome are written
automatically to:

- [Deployment reports](https://github.com/DelDeto/Good-cop-bad-cop/tree/automation/deployment-state/deployment-state)
- [V1.8.2 production screenshots](https://github.com/DelDeto/Good-cop-bad-cop/tree/automation/deployment-state/deployment-state/screenshots/1.8.2)
- [Release report](https://github.com/DelDeto/Good-cop-bad-cop/releases/tag/v1.8.2) (created only after successful release)

Actual production smoke verifies `/api/health` version/SHA, all 16 packaged
frontend resource hashes, private investigation isolation, multiplayer, BOT,
aim/shoot/reaction, wound/elimination, reload during pending and unchanged existing
Durable Object namespace. Synthetic fixture images are explicitly separate from
these actual production screenshots.

## Remaining issues and boundaries

- **P0:** None identified in the modified workflows.
- **P1 existing:** An offline human Serum recipient can hold a pending decision
  indefinitely (documented since V1.7). Its characterization remains passing.
  This UI release preserves the engine/rules as instructed; it does not claim
  that pre-existing engine limitation is fixed. No new P1 found in modified UI.
- **P2 / NOT VERIFIED:** Real iOS/Safari/Firefox and physical device behavior;
  eight simultaneous real humans; exhaustive all-23-equipment reaction matrix;
  deliberate failure/rollback injection against production. Chromium mobile
  emulation and simulated safe-area padding do not replace native device tests.
- **Reference limitation:** No V2.0 mockup file in workspace; direct pixel
  comparison is NOT VERIFIED. Design-description review and V1.8.1 comparison
  are verified separately.

No rollback fault is intentionally injected into occupied production rooms.
Rollback is reported as executed only if the existing workflow actually invokes
and verifies it; otherwise its status is “not needed.”
