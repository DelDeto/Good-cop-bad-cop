# Production release and post-release visual correction

V1.8.2 successfully passed the full tagged-release pipeline and production smoke
from `274c43f9ee8025acc65a49f75677a3f7ac5f9648`:

- [Actions](https://github.com/DelDeto/Good-cop-bad-cop/actions/runs/42375161888)
- Cloudflare deployment: `3051376f-a902-40b5-b601-739221734812`
- Worker version: `08d5ec1e-ac87-4f13-9d63-634c2d8174d3`
- Health/SHA and all 16 resource hashes: PASS; actual production multiplayer,
  private investigation isolation, shooting/reaction/reconnect and BOT alarm: PASS.
- Namespace `1c05e1f7d23844ff8bacc1371847dbff`, `GAME_ROOMS` / `GameRoom`, runtime
  fingerprint and migration `v1` unchanged. Rollback was not needed.

Reviewing the actual production injury screenshot found a P2 visual defect:
the public weapon/injury footer shared the portrait's bottom edge with its
health caption. Both labels could overlap despite the seat and hub geometry
gates passing. Gameplay and privacy were unaffected. The V1.8.2 tag is retained
unchanged; the correction is released as a separate UI hotfix, V1.8.3.

## V1.8.3 scope and regression proof

A single CSS rule suppresses the redundant portrait health caption when that
player has a nonempty weapon/status footer. Injury/weapon badges, the public
status footer and seat header remain visible; no panel/card geometry, artwork,
engine, rule, API or persistence code changes.

The existing 14-state browser audit now requires zero overlap between visible
portrait health captions and nonempty status footers. The exact production
browser verifier applies the same assertion to every screenshot, including after
the real shot resolves.

- **Negative proof:** Run the new audit against the extracted `v1.8.2/public`
  source; it fails at `aiming` with `portrait-health and equipment/status footer
  overlap aiming`. This expected failure demonstrates the gate detects the bug.
- **Positive proof:** All 14 states pass on the corrected UI, with zero overlaps,
  unchanged game-state hashes, the existing hierarchy/contrast thresholds and
  all 23 complete equipment names/descriptions. [Corrected fixture](hotfix-wounded.png).
- Existing 159-test suite passes locally. The exact hotfix commit must also pass
  all Node 20/22/24 repetitions, Chromium, strict goldens, real integration and
  Cloudflare preflight/dry-run before a `v1.8.3` tag may be pushed.
- Final production evidence is published automatically to the existing
  `automation/deployment-state` reports and `screenshots/1.8.3/` folder only after
  the actual release succeeds. The verified fallback is the successful V1.8.2
  Worker version above.

The original before/after V1.8.2 images stay intact as evidence of what shipped.
All remaining engine/native-device verification boundaries in `TEST_REPORT.md`
still apply. This correction closes the observed portrait/footer overlap; it
does not claim to solve the pre-existing offline Serum decision limitation.
