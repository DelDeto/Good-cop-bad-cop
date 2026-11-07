# V1.8.2 visual review

The original V2.0 mockup is visible in the conversation, but no reference image
file is available in this workspace. This review uses the written art direction;
it does not claim a pixel comparison with that image. The game uses independent
portrait/card/object artwork and a dedicated wood texture, never a whole mockup
as a background.

## Before / after at identical authorized game states

Baseline source: tag `v1.8.1`, commit
`ff2d6bca56174b04f056625fe4f54a503d9a5927`. Both captures use the same fixed clock,
card IDs, identities, hands, public events, player IDs and server private view.
Every normalized authorized-view SHA-256 is identical across each image pair.

| State | V1.8.1 | V1.8.2 | Mean opponent portrait area increase |
|---|---|---|---|
| PC / four players / 1366×768 | [Before](before/pc-4.png) | [After](after/pc-4.png) | 76% |
| PC / eight players / 1366×768 | [Before](before/pc-8.png) | [After](after/pc-8.png) | 52% |
| Mobile / four players / 375×667 | [Before](before/mobile-4.png) | [After](after/mobile-4.png) | 43% |
| Mobile / eight players / 375×667 | [Before](before/mobile-8.png) | [After](after/mobile-8.png) | 56% |

| Interaction | Before | After |
|---|---|---|
| Private investigation | [Before](before/investigation.png) | [After](after/investigation.png) |
| Aiming | [Before](before/aiming.png) | [After](after/aiming.png) |
| Reaction | [Before](before/reaction.png) | [After](after/reaction.png) |
| Mobile reaction | [Before](before/reaction-mobile.png) | [After](after/reaction-mobile.png) |
| Equipment selection | [Before](before/equipment-selected.png) | [After](after/equipment-selected.png) |
| Equipment detail | [Before](before/equipment-detail.png) | [After](after/equipment-detail.png) |
| Accepted equipment use | [Before](before/equipment-use.png) | [After](after/equipment-use.png) |
| Wounded | [Before](before/wounded.png) | [After](after/wounded.png) |
| Eliminated | [Before](before/eliminated.png) | [After](after/eliminated.png) |
| Mobile character inspector | [Before](before/mobile-character-detail.png) | [After](after/mobile-character-detail.png) |

Independent quality gates require ≥35% portrait-area improvement, PC identity
width/height ≤0.85, ≥4.5:1 computed solid text-layer contrast, no important control
outside the viewport, ≥44px own-card/equipment/action targets and all 23 complete
equipment names/descriptions. Measured PC identity aspect improved from 0.93 to
0.66 (four players) and 1.43 to 0.79 (eight). Minimum sampled text-layer contrast
is 6.69:1. This is a targeted computed contrast check, not full WCAG certification
over every illustration/gradient/animation.

Manual image review confirms larger faces, clearer physical card silhouettes,
warmer wood lighting, readable defeated-player text, distinct injury/gun badges,
and equipment/deck prominence over secondary navigation. Dense mobile opponent
cards remain compact: known faces use real artwork and a role seal, with full
names in accessible labels and the large inspector. The player's own cards keep
full wrapped names. The inspector provides a larger touch alternative to tiny
opponent cards; not every compact opponent card is claimed to be a 44px target.

Four newly reviewed V1.8.2 goldens live in `golden/`. V1.8.1 goldens under
`docs/v18/golden/` are preserved byte-for-byte. Screenshot limits remain mean
channel error ≤5 and changed-block ratio ≤0.06; no gate was relaxed. The separate
improvement audit avoids confusing baseline similarity with better art direction.

## Preserved asset inventory

| Bundled asset | Content |
|---|---|
| `public/portraits.webp` | Eight original independent noir portraits, assigned by public seat only |
| `public/roles.webp` | Four original illustrated identity faces, shown only when authorized |
| `public/item-art.webp` | All 23 distinct original equipment illustrations |
| `public/board-texture.webp` | Dedicated mahogany tabletop texture |
| `public/card-back.webp` | Engraved leather card back |
| Six `public/detective-*.woff2` files | Bundled OFL Vietnamese text and HUD symbol fonts |
| `public/art-manifest.json` | Dimensions, illustration counts, hashes and attribution |

Artwork, font hashes and names/effects of all equipment remain unchanged.
`public` is canonical; the existing generator synchronizes Cloudflare text/base64
modules. Packaging still contains 18 modules and 16 verified frontend resources.
