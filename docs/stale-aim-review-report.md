# PR #1 review follow-up — dead aim and Node 22 BOT flake

**Review-scope result: PASS.** Gameplay/test implementation: `e9c36f661c4cee28d6204068b90539c70ac5b304`, based on `f487f27`. Existing V1.6.1 turn/Coffee/Bribe fixes remain intact. No merge, deployment or production Worker/namespace change.

## Diagnosis and changes

The Node 22 failure is a real engine/UI bug, not permission to weaken the simulator. When a shot eliminated a player, other gun holders retained aim references to that dead seat. The original simulated human could later issue `actionShoot` against it; the server correctly rejected the dead target, but the stale aim should have been invalidated earlier.

- On elimination, clear every aim whose target is dead/missing. Keep surviving guns and their freshness unchanged; never choose a replacement for a human.
- Recover stale saved references on request/alarm and before BOT decisions. Pending choice metadata and deadlines remain intact.
- Require a living aim at `endTurn`, retaining the normal main-action → aim → end-turn flow.
- Hide/guard the shooting control when the target is not legal. Existing server target validation still rejects dead shots; no dead victim can enter a shot window.
- Retain the original unseeded 3/5/7-BOT full-game test and its 600-step completion bound. Add state invariants after every move, so the test fails at an illegal transition instead of silently retargeting to hide it.
- Add five seeded six-game replays. RNG override exists only in isolated test/repro processes; production uses its unchanged cryptographic RNG.

## Deterministic reproduction

The original six-game simulator on Node 22 reproduces the exact review failure with **seed 1558** in the **5-BOT, normal** scenario. [Before](evidence/stale-aim/seed1558-before.json) returns `Mục tiêu không hợp lệ hoặc đã bị loại.`; [after](evidence/stale-aim/seed1558-after.json) completes all six games.

```sh
# Fixed engine: PASS, six full games
node scripts/repro-bot-seed.mjs
# Exact review baseline: expected exit 1, same reported error
# Run with Node 22 for the original environment.
git show f487f27:src/engine.mjs > /tmp/review-old-engine.mjs
node scripts/repro-bot-seed.mjs /tmp/review-old-engine.mjs 1558
```

Direct gameplay fixture: A shoots ordinary B; C and D also hold guns aimed at B. When B is eliminated, C/D retain guns but `aim=null`. C cannot shoot or end its aim phase until selecting a living target. A cancelled shot or first leader wound leaves aims intact because the target is alive. Tests cover 4/8 seats and human/BOT progression.

The deterministic engine regression had [6 failures / 1 pass before](evidence/stale-aim/regression-before.txt), and [7/7 pass after](evidence/stale-aim/regression-after.txt). These archived failures document the original engine, not current failures.

## Repeated full-suite evidence

All prior 111 tests are retained; 15 additional tests bring the suite to **126**. Each complete suite includes 6 unseeded plus 30 seeded full games (3/5/7 BOTs × normal/hard), along with V1.6.1, privacy, HTTP/SSE, reconnect and UI checks.

| Runtime | Full suite repetitions | Tests per repetition | Result | Evidence |
| --- | --- | --- | --- | --- |
| Node 20.20.2 | 20 | 126 | PASS — 2,520 passed, zero failed/skipped/cancelled | [All counts](evidence/stale-aim/node20-summary.json), [last raw TAP](evidence/stale-aim/node20-last-run.tap) |
| Node 22.23.4 | 20 | 126 | PASS — 2,520 passed, zero failed/skipped/cancelled | [All counts](evidence/stale-aim/node22-summary.json), [last raw TAP](evidence/stale-aim/node22-last-run.tap) |
| Node 24.22.1 | 20 | 126 | PASS — 2,520 passed, zero failed/skipped/cancelled | [All counts](evidence/stale-aim/node24-summary.json), [last raw TAP](evidence/stale-aim/node24-last-run.tap) |

Total: **60 complete suites, 7,560 test executions and 2,160 completed six-scenario BOT/human games**. The test runner records every result and returns nonzero if any run fails, times out, skips/cancels a test, or changes test counts. It does not retry a failed run until green. Full raw logs are written per run by the reproducible command; the report retains every count and a raw final run per version.

```sh
# Invoke using each Node version, from repository root:
node scripts/repeat-tests.mjs 20 /tmp/gcbc-review-stress
npm run assets:check
node scripts/local-smoke.mjs
```

## Transport and browser checks

- Actual local HTTP/SSE and Worker router/cloned DO storage: elimination broadcasts `aim=null`, restart/reconnect retains it, dead shot returns 400 with no pending shot, then a legal investigation/re-aim/endTurn progresses. Other face-down cards and private investigation results remain protected.
- Browser: eliminated seat click cannot initiate a shot; no shoot fallback is shown for null/dead aim; selecting a living target in the aim phase and ending turn succeeds. [Screenshot](evidence/stale-aim/stale-aim-recovered.png), [browser result metadata](evidence/stale-aim/browser-results.json).
- Generated Cloudflare assets match public source. Actual `server.mjs` smoke passes. No production request or deployment was used for validation.

## Hosted CI

The PR and push runs on implementation commit `e9c36f6` both succeeded: [PR run 42329035402](https://github.com/DelDeto/Good-cop-bad-cop/actions/runs/42329035402), [push run 42329030203](https://github.com/DelDeto/Good-cop-bad-cop/actions/runs/42329030203). All three Node matrix jobs completed successfully.

CI retains `npm test`, then additionally repeats the **entire** suite five times on each Node 20/22/24 job, plus asset and actual-server checks. Per-run counts are published to each run's GitHub step summary. [Latest workflow checks](https://github.com/DelDeto/Good-cop-bad-cop/actions/workflows/sprint01.yml) apply to the current PR head; the archived failing Node 22 run on the old baseline remains historical evidence.

## Scope of the liveness claim

No stale-aim dead shot, dead active turn, failed completion or infinite loop occurred in the deterministic regressions and 60 complete-suite stress runs. This is evidence for these workflows, not a proof of every possible game sequence.

The earlier **P1 offline-human Serum** remains a separate open review gate; its no-deadline characterization tests are retained. Its policy was not changed or relabeled fixed. Real Cloudflare runtime, independent physical-card text approval and exhaustive cross-equipment combinations remain unverified as previously documented. No new aiming, team or winning rules were introduced.
