# V1.6.1 audit fixes — report and reproduction

Source: `feature/v1.6-sprint-01` at `7df5323` (latest V1.6 release/version changes preserved). Update the existing PR #1 on that branch. Production Worker `diep-vien-so-dach-online` is not contacted, modified or deployed.

## Result

| Item | Status | Evidence |
| --- | --- | --- |
| FIX-01 active shooter eliminated by redirected shot | PASS | Shared living-successor path runs after existing winning check; ordinary shooter advances once, first leader wound keeps aim phase, terminal leader death ends game first. |
| FIX-02 Coffee recipient eliminated before extra turn | PASS | Elimination clears the reservation; handoff rechecks that a reserved seat is alive. Dead or stale reservations fall back to normal living successor in the current direction. Living Coffee recipient is honored. |
| Existing regressions | PASS | All 54 pre-existing tests passed before changes and remain in the 111-test suite. |
| New regressions / audit cases | PASS | 57 additions: 4/8 seats, both directions, humans and BOT resolution/progress, wounds/deaths, leader wins, Coffee plus reverse, skipping multiple dead seats, restored stale reservations and pending reconnect. |
| Full local matrix | PASS | 111/111, zero failed/skipped on Node 20.20.2 / 22.23.4 / 24.22.1. [Node 20](evidence/v161/node20.txt), [Node 22](evidence/v161/node22.txt), [Node 24](evidence/v161/node24.txt). |
| API, privacy, restart | PASS locally | Actual Node HTTP/SSE + Worker router/cloned DO storage. Pending shot `since`, passes, victim and Coffee reservation survive reconnect; one living turn results. Tokens and unrelated hidden cards remain absent from public responses. |
| Already-stalled persisted room | PASS locally | Next GET/SSE read/alarm repairs a dead active seat exactly once if no choice is pending; preserves pending Serum and terminal win precedence. |
| Browser and assets | PASS | Existing Chromium card-first/reaction fixtures pass after the V1.6.1 version bump. `npm run assets:check` and actual entrypoint smoke pass. Browser output was written outside tracked prior screenshots. |
| GitHub Actions Node 20/22/24 | PASS | [PR run 42327186623](https://github.com/DelDeto/Good-cop-bad-cop/actions/runs/42327186623): Success, all 3 matrix jobs completed on implementation commit `0576f88`; [push run](https://github.com/DelDeto/Good-cop-bad-cop/actions/runs/42327180658) also succeeded. [Recorded evidence](evidence/v161/hosted-ci.json). |
| Serum human-disconnect liveness audit | FAIL — remaining P1 | Human Serum target has no deadline; advancing time by one hour does not resolve it. Reconnect is lossless and the target may resume, but an absent target can block the room indefinitely. This is a characterization test, not a claim of a Serum fix. |
| Physical-card redirection rule | NOT VERIFIED externally | Publisher page request returned HTTP 403. No independent approved rule text supplied. Shield eligibility is unchanged; technical handoff is fixed without banning/allowing new targets. |
| Real Cloudflare / production verification | NOT VERIFIED | No staging or production deployment; mocked DO restart/alarm tests are not a deployed-runtime claim. |

**Overall: PARTIAL release readiness.** Both requested turn-stall fixes PASS, but Serum's confirmed P1 and external rule/staging verification remain open. No team/win-rule changes. No merge, production deployment or Sprint 02 work.

## Exact reproduction: FIX-01

Four living seats A/B/C/D in clockwise order; A has three ordinary role cards, C holds Agent and D holds Kingpin. This avoids ending the game when A dies.

1. Give A an existing (not fresh) gun aimed at B; A issues `actionShoot`.
2. B holds Shield and issues `playEquipment` with `target: 0`. A is adjacent to B under existing Shield validation.
3. All remaining living players issue `passShot` (A is already in the pass list).
4. A is eliminated. Before the fix, `status=playing`, `turn=0`, `phase=aim`, and that actor cannot act because dead. After the fix, `turn=1`, `phase=action`, turn sequence advances once to 2.
5. If A holds an unwounded leader, the same redirect wounds A and retains its aim phase/turn sequence. If A's leader was already wounded, the unchanged win check finishes the game before any turn handoff.

## Exact reproduction: FIX-02

Use the same initial four-player role layout.

1. B plays Coffee during A's turn (`coffeeNext=1`).
2. A shoots B with an existing gun; all living participants pass and ordinary B is eliminated.
3. A issues `endTurn`.
4. Before the fix, the game selects dead seat 1. After the fix, the Coffee reservation is cleared and seat 2 starts a valid action turn. Counterclockwise fallback is seat 3. If B survives, B still receives the reserved next turn in either direction.

Run deterministic repros without any server, account or production state:

```sh
node scripts/repro-v161.mjs
# Reproduce the old failures using the exact source baseline:
git show 7df5323:src/engine.mjs > /tmp/v161-old-engine.mjs
node scripts/repro-v161.mjs /tmp/v161-old-engine.mjs
```

[Before JSON](evidence/v161/repro-before.json), [after JSON](evidence/v161/repro-after.json). Both scenarios show `livingTurn: false` before and `true` after. Fixtures explicitly set role positions/equipment; no hidden information is used to choose a move in production.

The first 44 new engine/audit cases were also run against the original engine: 26 passed, 18 failed ([pre-fix trace](evidence/v161/pre-fix-failures.txt)). They were rerun green after fixing the two handoffs. Baseline old-suite evidence: [54/54](evidence/v161/baseline54.txt). Failures in that archived trace are expected pre-fix reproductions, not current failing tests.

## Technical review

- `g.turn` mutations: room initialization, `startGame` resetting to seat 0, and one shared `advanceTurn` for normal endTurn / eliminated active player / recovery. `startGame` resets every player's alive state before exposing the result. BOT actions use the same server engine; BOT variants of the matrix seed an already-declared shot and use real `botStep` for reactions and subsequent turns, not a new BOT redirection heuristic.
- `checkWin` is unchanged. A finished game may retain its last dead seat as an archival `turn`; no active turn runs because `status=finished`. Only playing games must have a living active seat.
- `nextAlive` respects current `direction` and skips dead seats. Coffee is used only if its reserved seat still exists and is alive. Consuming a valid Coffee turn or skipping an invalid reservation clears it exactly once.
- Shield's allowed targets, BOT avoidance of directing Shield toward the shooter, shot pass/reset behavior and reaction timers are unchanged. The publisher lookup failure does not authorize a different physical-card interpretation.
- Reconnect/reconstruction does not reset or extend shot/Bribe timestamps or replace targets. Recovery does nothing while any pending decision remains. Serum remains a target-controlled public reveal; no automatic random reveal or cancellation rule was invented.
- Existing HTTP/SSE hidden-information assertions are retained, and new turn-resolution snapshots check public revealed cards, unrelated face-down cards, private logs and token absence.

## Remaining issue severity

- **P0:** None identified in the tested modified turn-resolution workflows. This is not a full-game security certification.
- **P1 — confirmed:** Serum can wait indefinitely for an offline human target. Requires an approved timeout/fallback policy (auto-selection vs cancellation vs another outcome) before changing target-controlled card behavior. Reconnect alone is insufficient; see the named Serum audit and Worker reconnect tests.
- **P2 — verification:** Physical Shield rule reference not independently verified (HTTP 403); staging alarm/runtime behavior and real-device/cross-browser testing not verified. Exhaustive 23-equipment combinations remain outside this targeted test matrix.

Re-run `npm test`, `npm run assets:check`, `node scripts/local-smoke.mjs`. Optional browser runner uses installed Playwright/Chromium; set `BROWSER_OUTPUT_DIR=file:///tmp/v161-browser/` to retain historical screenshot files. See the CI check on the exact PR head for hosted evidence.
