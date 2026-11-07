# V1.7.0 — test report and acceptance proposal

Branch: `feature/v1.7-responsive-table`. Base: verified `feature/v1.6-sprint-01` at `cfb0a1d`. Core implementation: `311b51e`. No worktree, merge or production deployment.

## Results

| Area | Result | Evidence |
| --- | --- | --- |
| V1.7.1 desktop table | PASS in Chromium | 1366×768, 1440×900, 1920×1080, 4/6/8 seats and both viewer ends; 5/7-seat checks. Own seat anchored below opponents, single own role set, all boxes within viewport. |
| V1.7.2 mobile table | PASS in Chromium | 360×800, 375×667, 390×844, 430×932; 4/6/8 seats, plus 5/7 at 375×667. No page overflow; own cards/equipment ≥44×44; larger inspection/action alternatives for compact opponent slots. Native Chromium touch scenario sends one command per tap. |
| V1.7.3 direct interaction | PASS | Confirmed investigate/arm/draw/reveal, aiming/retarget arrows, shot cancellation/reaction, two-target equipment, Wire/Bribe, discard, wound/elimination/win/restart. Shot arrow follows actual redirected victim. |
| V1.7.4 information and memory | PASS within tests | Private response only to authorized viewer; public timeline separated from private findings; swaps replace remembered identity with stale/unknown state. Chat node, focus, draft and valid targeting survive unrelated SSE/chat. Reload retains pending id/timestamps. |
| V1.7.5 visual polish | PASS for measured geometry; visual review proposed | Original art, noir/brass/wood, character portraits, no 3D or new runtime dependency. Fonts ≥11px, reduced motion, long-press click suppression, stable countdown nodes, keyboard Escape/Tab handling. Human visual acceptance remains a review step. |
| Original 126 regressions | PASS | Tests retained. UI expectations updated for release branding, explicit targeted-equipment confirmation and read-only eliminated-seat inspection; command/privacy checks remain and confirmations are strengthened. |
| Final unit/integration suite | PASS | 133 tests, 0 failed/skipped/cancelled. [Node 24 output](evidence/node24-tests.txt). |
| Repeated Node matrix | PASS locally | Five full suites per Node 20.20.2/22.23.4/24.22.1: 15 runs ×133 =1,995 test executions. [20](evidence/node20-repeated.json), [22](evidence/node22-repeated.json), [24](evidence/node24-repeated.json); raw final TAP files alongside. |
| Geometry/scenario QA | PASS | [48 measured cases](after/geometry.json); [11 scenario groups](after/results.json). Includes combined reaction/effect states. Baseline [21 cases](before/geometry.json). |
| Actual multiplayer and solo | PASS locally | [Actual server results](after/real-server-results.json): separate browser contexts create/join/start four-human room, investigate privately, change turn/reload, solo with 7 hard BOTs and real timer-driven BOT activity. APIs are not intercepted. |
| Engine / backend preservation | PASS | [Preservation hash](evidence/preservation.json): engine and Node server byte-identical to V1.6.1; Worker/DO behavior unchanged, health release metadata only. No API/payload or role/win changes. |
| Generated assets | PASS | `npm run assets:check`; package, cache keys and Worker health agree on V1.7.0. |
| Hosted CI | Pending until branch checks finish | Node 20/22/24 + repeated suites, plus Chromium geometry/gameplay/actual-server job and uploaded screenshots/metrics. [Workflow runs](https://github.com/DelDeto/Good-cop-bad-cop/actions/workflows/sprint01.yml). Do not equate local success with hosted CI. |
| New V1.7 PR | BLOCKED by environment access until creation succeeds | Intended base is `feature/v1.6-sprint-01`. GitHub API requests return Forbidden; `api.github.com` is absent from enforced egress. Branch publication and PR creation are separate outcomes. |

## Evidence / reproduce

Read [UX specification](../../UX_SPEC_V1.7.md), [before/after comparison](UX_COMPARISON.md), and screenshots in [before](before/) / [after](after/). In particular: [PC 4](after/pc-4.png), [PC 8](after/pc-8.png), [mobile 4](after/mobile-4.png), [mobile 8](after/mobile-8.png), [aim](after/aiming.png), [shooting](after/reaction.png), [private detail](after/investigation-detail.png), [touch detail](after/mobile-investigation.png).

```sh
npm test
npm run assets:check
node scripts/repeat-tests.mjs 5 /tmp/gcbc-v17-tests
node scripts/local-smoke.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node scripts/qa-v17.mjs
PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright-core/index.mjs node scripts/qa-v17-real.mjs
```

Default browser output is `docs/v17/after/`; set `QA_OUTPUT_DIR=file:///tmp/gcbc-v17-qa/` to keep committed evidence untouched. Browser test tools use installed Chromium/Playwright. CI installs only `playwright-core@1.57.0` into its temporary tool directory and uses runner Chrome; no application dependency is added. `scripts/browser-smoke.mjs` delegates to the broader V1.7 fixture suite.

The fixture suite uses a test-only HTTP/SSE server and the unchanged engine with deterministic equipment/role setup. It does not prove a Cloudflare deployment. The separate integration suite uses the real `createLocalServer()` and standard create/join/command APIs. Screenshots include authorized synthetic player information only. Old 126 Node tests continue to exercise Worker/DO routing, storage restart, alarms and privacy through mocks.

## Findings corrected during implementation

- Six-seat mobile overlap at 375×667: narrower compact cards and count/viewer-relative positions; all measured seat pairs now separated.
- Equipment artwork collapsed due inherited align-items:start: stretch the personal hand and verify visible touch/card bounds.
- Root replacement lost chat focus/drafts: stable regions + generated-markup cache; chat stays the same DOM node across public updates.
- Countdown-dependent markup could replace feedback on unrelated SSE: static time placeholders + text/property-only ticks, cached generated content. Browser verifies node identity through clock ticks and chat updates.
- Own chat response discarded equipment selection: only gameplay commands clear selection; unrelated chat preserves the first target.
- Redirected shot arrow initially used underlying gun aim: arrow now uses pending shot victim while the shot is active.
- Transient connectivity handling discarded the session: retain it on network/5xx errors, respond to offline/online and retry; only actual authorization/room errors clear it.

## Remaining P0/P1/P2 and verification boundaries

- **P0:** None identified in the tested V1.7 workflows. Not a universal security or rules certification.
- **P1 existing:** Offline human Serum recipient can still hold pending indefinitely. Preserved exactly as requested; no automatic reveal/cancel rule invented. Its characterization regression remains.
- **P1 new:** None identified after corrections in this sprint.
- **P2 / access:** New PR creation may remain blocked until GitHub API access is applied; a saved draft/domain proposal does not establish runtime access. No credentials are requested in chat.
- **P2 / verification:** Real iOS/Safari/Firefox, physical devices/OS keyboard, actual staging Cloudflare alarms/bindings and independent physical-card semantics are not verified. Safe-area CSS is present; native device behavior needs manual review.
- **P2 / compact tradeoff:** Mobile opponent slots are narrower than 44px at high player counts. Every opponent remains visible, with seat inspection, private-memory drawer and 44px main action controls offering larger alternatives. Personal cards/equipment are measured ≥44px.

## Acceptance / production proposal

Recommend UX review against the provided before/after screenshots and reproducible geometry/scenario evidence. Engineering acceptance additionally requires green hosted branch/PR checks and creation of the V1.7 PR with the correct V1.6.1 base. No claim that the access-blocked PR already exists.

After review: perform an explicitly authorized staging rollout/playtest with 4–8 real clients, network interruptions, responsive keyboard/safe-area cases and the existing rules/Serum gates. Resolve or explicitly accept the pre-existing release gates, then seek explicit authorization for any production rollout. Preserve the existing `GAME_ROOMS` Durable Object binding/namespace, verify release metadata and static cache keys, and retain a rollback version. No rollout is performed by this sprint.
