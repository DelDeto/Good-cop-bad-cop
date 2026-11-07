# V1.8 test and release evidence

Implementation gates before version promotion:

| Gate | Result |
|---|---|
| Existing regressions + new artwork/privacy/release tests | PASS locally: 152 tests, three full runs each on Node 20.20.2 / 22.23.4 / 24.22.1 |
| Viewport geometry | PASS: 92 cases; 4–8 players; PC, portrait and landscape phones |
| Chromium gameplay fixtures | PASS: 11 groups including Wire, Bribe, reaction/cancellation, stale aim, reconnect and native touch |
| Real local multiplayer/BOT server | PASS: private investigate, reload, seven hard BOTs |
| Exact post-deployment browser verifier rehearsal | PASS locally: four humans, private investigation, aim/shoot/reactions/reconnect, eight-player hard BOT alarm |
| Protected engine / GameRoom / API / server hashes | PASS: unchanged |
| Asset synchronization and original artwork inventory | PASS; five required art files, 8 portraits, 4 identities and 23 equipment |
| Compiler dry-run | PASS before final card-back addition; repeated in hosted Actions for the final package |
| Final hosted CI and Cloudflare dry-run | Required before version promotion/tag; see Actions |
| Actual production release / browser smoke | Pending tagged release; do not infer deployment from local rehearsal |

`evidence/` retains local geometry, visual comparisons, asset audit and repeated
Node suite results. Their recorded commit is the checkout base while the V1.8
working tree was under test; this limitation is stated in the JSON. Hosted
artifacts provide exact-commit evidence: every Node job uploads all five repeated
TAP runs and summary, and Chromium uploads screenshots, visual comparison metrics,
fixture/integration results and production-verifier rehearsal results.

Release source is `feature/v1.8-premium-release`, never stale `main`. Once the
completed UI commit passes hosted gates, set package version 1.8.0 and the completed
UI release declaration, run gates on that final commit, then tag exactly that SHA.
No development push deploys production.

Final production evidence is written by the workflow to:

- https://github.com/DelDeto/Good-cop-bad-cop/tree/automation/deployment-state/deployment-state
- https://github.com/DelDeto/Good-cop-bad-cop/releases/tag/v1.8.0 (only after success)

The report records version, SHA, Actions URL, candidate Cloudflare version,
deployment ID, verified rollback baseline, health/resource hashes and production
browser results. Actual production screenshots are stored under
`deployment-state/screenshots/1.8.0/` after success. Any failed activation or browser
smoke invokes guarded rollback; a rollback is never reported as successful without
checking active version, namespace/runtime, health and baseline resource hashes.
