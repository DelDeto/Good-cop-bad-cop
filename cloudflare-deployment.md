# Cloudflare release automation

Existing Worker: `diep-vien-so-dach-online`. Production URL:
https://diep-vien-so-dach-online.duc-nguyen-ndd127.workers.dev

Secrets are read **only inside GitHub Actions**: `CLOUDFLARE_ACCOUNT_ID` and
`CLOUDFLARE_API_TOKEN`. No environment approval is introduced. The token needs
Workers Scripts edit/read access for this account. Token values never appear in
source, reports, artifacts or logs. A missing/unauthorized secret stops preflight.
GitHub's workflow token needs contents write to persist operational reports and
publish completed releases; the workflow declares this permission explicitly.

## Initial setup (no production changes)

Pushing `feature/v1.8-premium-release` runs `.github/workflows/release.yml`:

1. Full Node 20/22/24 suite, five repetitions each, privacy/BOT/pending/reconnect
   tests, asset synchronization and actual HTTP/SSE smoke.
2. Chromium desktop/mobile layout and gameplay, actual multiplayer and BOT server.
3. Read existing Worker settings, active 100% version and its runtime settings.
4. Require existing `GAME_ROOMS` → `GameRoom` namespace; do not guess a namespace.
5. Check current production health and all six frontend resources.
6. Build all eight ES/text modules, compile using pinned official Wrangler
   `deploy --dry-run`. This command never uploads. Preserve the existing migration;
   a compiler warning asking to declare exports is **not** permission to recreate it.
7. Save sanitized evidence in Actions artifacts/summary and branch
   `automation/deployment-state`, under `deployment-state/setup.json` on success.

The REST client never calls Worker creation, namespace creation, migration,
route, subdomain or storage endpoints. It refuses extra bindings or runtime
exports/limits until they can be explicitly reviewed and preserved. No migration
configuration is generated. Settings read from production supply the compatibility
date/flags and existing namespace for a subsequent version upload.

## Completed releases only

Canonical release source: `feature/v1.8-premium-release` (based on approved V1.7
commit `1c69065d3a2e17a86200986d680c6bb281c57e4e`), **not `main`**.
The pipeline rejects tags that do not equal `v` + package.json version, do not point
at this branch's current tip, or lack this reviewed completion declaration:

```json
{"version":"1.8.0","status":"complete","scope":"ui","sourceBranch":"feature/v1.8-premium-release"}
```

Save that declaration as `release.json` only after the UI release is finished.
It is deliberately absent while development continues. Creating a tag does not
bypass any test. Branch pushes and workflow_dispatch perform setup/dry-run only.
To dispatch on a tag, all release gates and initial-setup checks still apply.
All production operations use one non-cancelling concurrency lock.

Protected hashes in `scripts/release/policy.json` prevent a UI release from
changing engine rules, Durable Object persistence, API/privacy or local server.
A necessary backend/schema/access change must be separated for approval; do not
silently update those hashes to bypass this policy.

## Upload, activation and recovery

Use Cloudflare's supported Workers Versions REST API, multipart upload with
`application/javascript+module` for JS and `text/plain` for `.txt`. Images retain
the existing base64 text-module packaging; public and Cloudflare source assets
must pass `npm run assets:check`. Release health gains exact package version and
commit SHA during packaging; source gameplay and GameRoom remain byte-identical.

The pipeline requires a successful initial setup for the same configuration,
checks that production has not changed, then uploads a **non-active** version.
It compares runtime/migration and binding resources against the active version
before activation. The baseline is the currently active version whose health and
frontend were verified before deployment; a split rollout is refused.

Before changing traffic, upload an immutable recovery checkpoint to Actions.
Activate 100%, then verify health/version/SHA and SHA-256 of HTML, JS, CSS, favicon
and both image assets. Retry propagation checks for at most six attempts. Record
candidate version, deployment ID, commit, URL, baseline and smoke result.

On failure restore the baseline only if this run still owns the active version
and runtime/bindings are unchanged. Never force rollback over another release or
changed configuration. Compare rolled-back health and resource hashes with the
pre-release baseline. A separate recovery job handles release job failure/timeout
using the checkpoint. Complete workflow cancellation or GitHub/Cloudflare outages
can prevent recovery; the checkpoint remains for safe operator recovery after
service restoration. Do not claim an unavailable rollback succeeded.

Successful releases write a GitHub Release and `deployment-state/last-success.json`.
Every run records `latest.json` and an immutable run-ID report. GitHub reports
contain version/configuration IDs, never room tokens or game state.
