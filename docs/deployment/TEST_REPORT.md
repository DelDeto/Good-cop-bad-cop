# Cloudflare auto-deployment setup — 2026-11-07

Status: **PASS — initial setup, read-only configuration verification and compiler dry-run**.
This is deployment infrastructure; V1.8 artwork/UI is not declared complete and no
release tag has been created.

First successful hosted setup:
https://github.com/DelDeto/Good-cop-bad-cop/actions/runs/42341135320

Source commit: `f1d0a42b07d4191e72e5d4a2fe9ddca1dcd3201d`.
The initial workflow-context validation failure was fixed before this run; it
performed no Cloudflare operations. See `initial-setup.json` for machine-readable
live evidence fetched from `automation/deployment-state` after the passing run.

| Gate | Result | Evidence |
|---|---|---|
| GitHub can use both Cloudflare Secrets | PASS | Authenticated settings/version reads in hosted Actions |
| Existing production config | PASS | `GAME_ROOMS` → `GameRoom`; namespace `1c05e1f7d23844ff8bacc1371847dbff`; existing migration `v1`; compatibility date `2026-11-06` |
| Production baseline | PASS | Active version `d9359700-591f-4197-8663-307df471ff67`; health `1.6.1-sprint01`; six resource hashes recorded |
| Node 20/22/24 regressions/privacy/gameplay/BOT | PASS | First hosted setup: 144 tests per suite, initial run plus five repetitions per Node version; local two repetitions each |
| Chromium PC/mobile | PASS | 48 geometry cases, 11 interaction groups, screenshots in Actions artifacts |
| Actual multiplayer, private investigate, reconnect, seven hard BOTs | PASS | Chromium real-server integration; HTTP/SSE smoke |
| Source/public/Cloudflare asset synchronization | PASS | `npm run assets:check` in each Node job |
| Official compiler dry-run | PASS | Wrangler 4.158.0; eight JS/text modules; six public assets; 311.23 KiB upload equivalent; zero upload/activation |
| Release tag/version/source/completion validation | PASS (automated tests) | Reject malformed tags, mismatched version, stale main and incomplete manifest |
| Namespace/config preservation, failed smoke and safe rollback logic | PASS (simulated API) | Reject config/namespace drift and concurrent deployment; restore only this run's candidate |
| Real production version upload/activation | NOT VERIFIED | Deliberately not performed during setup; requires completed release and valid tag |
| Real production rollback after failure | NOT VERIFIED | No production fault injected; safe rollback branches tested with simulated API |
| GitHub/Cloudflare outage or complete workflow cancellation recovery | NOT VERIFIED | Independent recovery job/checkpoint configured; external outages can prevent execution |

Two further regressions verify the packaged Worker itself returns exact frontend
bytes/build identity and split traffic cannot be overwritten. These bring the
final suite to **146 tests**; final hosted results and compiler evidence are stored
under the latest Actions run and `automation/deployment-state/deployment-state/`.

No source changes to the engine, GameRoom, API/privacy or local server. No Worker,
namespace, migration, room write, route change or production deployment occurred.
A setup pass enables future completed UI tags to release automatically; it does
not authorize a development commit to deploy. No manual environment approval gate
was added. See `cloudflare-deployment.md` for tag requirements and recovery limits.
