# Draft PR #1 — Sprint 01 release gates

Source: review findings in [Draft PR #1](https://github.com/DelDeto/Good-cop-bad-cop/pull/1), read from GitHub before this follow-up. The branch remains `feature/v1.6-sprint-01`; no merge, production deploy or Sprint 02 work is included.

| Gate | Result | Evidence / limit |
| --- | --- | --- |
| Human pending Bribe after disconnect | PASS locally | Persisted 60-second deadline; decline-only expiry; no exchange/refund; original private result preserved. Engine boundary tests, a real Node timer with zero clients/requests, HTTP stale-command rejection and mocked DO alarm recovery. |
| Pending Bribe restoration | PASS in cloned-storage DO tests | New GameRoom instance retains original deadline and private decision. Reconnect/chat never renew it. Expired or legacy timestamp-less pending declines on recovery and is saved before stale request rejection. Actual deployed Cloudflare restart remains NOT VERIFIED. |
| Private information end-to-end | PASS locally | Same assertions through actual Node HTTP/SSE and Worker router + mocked DO: Wire exact result, owner-only Bribe fields, live observer stream, reconnect, unauthorized tokens/stolen decision ids. Changing an investigated target between ordinary/agent/kingpin leaves unrelated observers' serialized responses identical and legacy invalid errors identical. |
| Concurrent Bribe resolution | PASS in DO tests | Fetch/alarm operations serialized. Two concurrent same-decision swaps produce exactly one 200 and one 400; single consumption. |
| CI configuration | IMPLEMENTED; hosted run pending | `.github/workflows/sprint01.yml`: PR/push, Node 20/22/24, npm test, assets:check, actual server smoke. Contents read-only, immutable action SHAs, no secrets or deployment. Hosted result must be confirmed separately. |
| Automated tests | PASS | 54/54, zero skipped/failures, all previous 39 retained. Node 20.20.2, 22.23.4, 24.22.1 tested locally. [Node 20](evidence/node20-tests.txt), [Node 22](evidence/node22-tests.txt), [Node 24](evidence/node24-tests.txt). |
| Browser interaction evidence | PASS for Chromium fixtures | Card-first cancel/swap/decline, reload, reaction defence and timeout recovery. [Result metadata](screenshots/browser-results.json), [timeout screenshot](screenshots/bribe-timeout.png), [pending screenshot](screenshots/bribe-decision.png). APIs intercepted with real engine fixtures; not a hosted/staging claim. |
| Cloudflare staging smoke before release | NOT VERIFIED / OPEN | No staging binding/configuration/credentials supplied; no remote deploy performed. Must verify real alarm/restart, private SSE streams and simultaneous commands on an authorized staging target. |
| Physical Vietnamese Wire/Bribe semantics | REVIEW REQUIRED / OPEN | Existing repository descriptions are the implementation source. No independent approved card-text reference was supplied. Timeout is a technical abandonment policy, not a change to underlying team/win rules. |
| Full cross-equipment reaction matrix | PARTIAL / OPEN | Existing shield→vest, pass/force/timed-shot tests remain passing; new tests block card-moving equipment while Bribe is pending. Exhaustive combinations across all 23 cards remain unverified. |

## Timeout and privacy policy

- A successful Bribe investigation consumes equipment and creates `deadline = server time + 60000`; no client field can extend it or replace the locked target/card.
- The owner can exchange a permitted ordinary card or decline before expiry. BOT owners retain immediate decline behavior. On timeout, only the optional exchange is declined; cards, turn/phase and authorized knowledge remain intact.
- Timers/alarms run without an SSE connection. If alarm delivery is delayed or a DO is reconstructed, the next request recovers overdue pending first. Reconnect does not rearm a timer. Legacy records without a timestamp decline immediately upon recovery.
- The owner sees the deadline and decision UI. Other players see only pending kind and owner, not target, slot, card id, decision id, swap eligibility or investigation result. Public expiry log contains no identity result.
- Clock-based engine/DO tests advance fake Date; the local no-client timer test uses a short fixture deadline and a real timer (no production timeout override). The browser expiry screenshot advances only fixture state, then reloads.

## Reproduce

```sh
npm test
npm run assets:check
node scripts/local-smoke.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node scripts/browser-smoke.mjs
```

CI installs no application dependencies: the application and tests use Node built-ins. HTTP/SSE tests need local listen/connect permissions in the cloud shell. Playwright/Chromium are optional only for the separate browser evidence runner.

The original 39-test report was authored by Codex; this follow-up re-ran the expanded 54 tests across three Node versions. This is not an independent human review or a production readiness declaration. Keep PR #1 in Draft until open review/staging gates are satisfied.
