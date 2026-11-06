# Sprint 01 — test report

Feature branch: `feature/v1.6-sprint-01`, based on V1.5 commit `d239b89`.

## Results

| Area | Status | Evidence |
| --- | --- | --- |
| RULE-01 Wire | PASS | Exact nonfirst card, owner/watched direction, unrelated player, dead owner, disguise, multiple wires, equipment investigation, BOT investigator and BOT owner regressions |
| RULE-02 Bribe | PASS | Ordinary swap, both leader types, decline, consumption before decision, uniform first-stage invalid errors, invalid slots, owner-only pending, stale/duplicate request rejection, knowledge invalidation |
| Existing regressions | PASS | All original 22 tests retained and passing |
| Full automated suite | PASS | 39 tests, 39 pass, 0 fail, 0 skipped; Node 24.22.1 |
| Interaction / cancellation | PASS | VM tests and Chromium card/avatar clicks; pre-submit equipment cancel sends zero commands and retains card |
| Reaction order / reconnect | PASS | Redirect resets passes/clock, vest after redirect, all-pass/force/timed cases; serialized restore, Chromium reload and defence |
| Local HTTP / SSE | PASS | Actual server.mjs: four human room, investigation, private state, two event reconnects, invalid token rejection |
| Assets | PASS | Generated app/style files match public source; npm run assets:check |
| UI screenshots | PASS | Chromium desktop 1440×1080 and mobile viewport 390×844; mobile reaction layout visually inspected and corrected |
| Cloudflare Worker / DO tests | PASS | Existing mocked worker flows plus cloned storage restore into a new GameRoom and duplicate decision rejection |
| Real Cloudflare deployment/runtime | NOT VERIFIED | No deployment requested or performed |
| Separate physical devices / browsers | NOT VERIFIED | Chromium only; no Safari, Firefox, real phones or unstable-network load tests |

No P0 issue was identified in the modified workflows under these checks. Local regression gate PASS. Production readiness is not asserted. No Sprint 02 work was started.

## Reproduce

From the checkout root:

```sh
npm test
node --test --test-isolation=none --test-reporter=spec tests/*.test.mjs
npm run assets:check
node scripts/local-smoke.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node scripts/browser-smoke.mjs
```

The explicit Node reporter shows individual tests; npm test's current runtime reporter groups them by five files. The HTTP/browser runners require local networking execution permissions. `SMOKE_PORT` optionally changes the local smoke port (18787). Browser runner accepts `PLAYWRIGHT_MODULE` (default `playwright`) and `CHROMIUM_PATH` (default `/usr/bin/chromium`). Playwright core and Chromium already exist in this cloud environment; no project dependency was added.

Browser scenarios intercept API routes using the real engine and deterministic equipment fixtures; they test public UI files and actual engine commands, not a deployed Worker or production server transport. The separate local smoke runner tests real server.mjs transport without injected equipment.

## Fixed flow evidence

**Wire:** A equips Wire on B → B investigates C's third card → A and B know exactly C:2; unrelated D has no known entries or private result. A is no longer incorrectly read from the opposite wire relationship. See `tests/sprint01.test.mjs` and [Wire screenshot](screenshots/wire-private.png).

**Bribe:** A selects B's third card → server consumes Bribe and records investigation → only A receives target, slot, decisionId and canSwap → A chooses own card or declines. An ordinary target swaps once; a leader is legitimately seen after consumption and cannot swap. Legacy one-step ownSlot requests fail identically for ordinary/leader cards with no mutation. See [decision screenshot](screenshots/bribe-decision.png). Choice survives reload and cloned Durable Object storage restoration.

**Reactions:** On-table public shooter/victim plus viewer-owned defensive equipment; [desktop](screenshots/reaction-desktop.png), [mobile](screenshots/reaction-mobile.png). Browser result metadata: [browser-results.json](screenshots/browser-results.json).

## Remaining limits and focused follow-up

- Card semantics follow existing repository equipment descriptions. No separate approved physical-rule reference was supplied; review the documented Wire exact-card / Bribe consumption interpretation before release.
- Real Cloudflare bindings, alarms, simultaneous requests across deployed isolates and storage migration on a staging account remain unverified. Run a staging-only replay with approval before production release.
- Cross-equipment combinations across all 23 effects are not exhaustively audited. Polygraph mutual viewing remains unchanged; Wire triggers through the investigation helper without recursive forwarding.
- Bribe has no automatic abandonment timeout. A disconnected human owner must reconnect and choose swap/decline; BOT owners immediately decline. An abandoned room can wait until expiry.
- Countdown assumes a reasonably accurate client clock; the server validates actual timing. Human-only rooms intentionally retain the existing manual force-after-15-seconds behavior; BOT rooms auto-resolve after 20 seconds.
- Hidden target leader checks in two pre-existing BOT heuristics were removed. This sprint is not a full security audit of every existing equipment effect or an exhaustive BOT strategy audit.
- Existing V1.5 branding is intentionally retained until release review. No production deployment was performed.
