# V1.8 Premium Detective Boardgame UI

Art direction follows the owner's inline PC/mobile mockup: mahogany table,
antique brass, warm noir light, fictional illustrated detectives and tactile
playing cards. The reference was visible in the conversation; original assets
were generated from art briefs for this project, rather than copying physical
boardgame artwork. Production artwork is committed as optimized WebP. Exact
files, sizes, dimensions, hashes and atlas orders: `public/art-manifest.json`.

## Final asset inventory

- Eight distinct fictional character portraits, assigned by public seat only.
- Four illustrated identity faces: honest, crooked, agent and kingpin.
- Twenty-three equipment illustrations, mapped in engine equipment order. The
  atlas's spare twenty-fourth illustration is unused, not an invented game card.
- Original dark mahogany table with brass inlay, lamp and casefile edge details.
- Original engraved cognac leather card back with brass optical reticle.
- Gun and deck resources use actual illustrated atlas objects; role details,
  equipment previews and home showcase also use the final artwork.

The five generated image sources remain in `/workspace/generated_images` in this
session. The committed WebP files are self-contained release assets; no image
service, remote font, external CDN or generation service is needed at runtime.
Detective Sans/Serif are renamed Latin/Vietnamese subsets of SIL OFL 1.1 Noto fonts;
all four regular/bold WOFF2 files and two UI-symbol fallback subsets are bundled
and hash checked. Critical HUD glyph coverage is validated, so controls such as
the circled information button do not depend on runner/OS fallback fonts. See `fonts/OFL-1.1.txt`.
Primary characters, card faces, card backs, equipment and table have no icon
placeholder fallback. Small text/symbol HUD controls are semantic interface
controls, rather than substitutes for final illustrations.

## Layout and rules audit

PC places the viewer at the bottom; landscape phones place the personal hand to
the right to preserve table height. Portrait phone layouts adapt to 4–6 and
7–8 seats. The owner's role cards appear exactly once. Player name, public wound,
weapon/aim, turn, equipment and valid targets remain readable and inspectable.

The mockup is a visual reference, not a rule change: enemy team badges are not
shown; health uses actual alive/wounded/eliminated state instead of inventing two
hearts per player; equipment hand capacity remains one (temporarily two while
discarding); `round` is labelled **LƯỢT** because it counts completed player turns.

Accepted investigations illuminate the selected card and reveal only the private
server result in an illustrated dossier. Aim uses an animated brass line; a
pending shot uses a brighter animated line to the actual redirected victim.
Equipment feedback uses the consumed card's illustration only after server
acceptance. Reaction targets/countdowns, valid defensive equipment and reconnect
remain functional. Reduced motion disables these animations. Cancellation remains
local until an action is confirmed; no optimistic secret result is generated.

## Measurable visual gates

- 92 geometry cases: 4–8 players, two viewer seats, nine viewports, plus two dense
  reaction/status cases. Includes 1366×768, 1440×900, 1920×1080, 375×667,
  390×844, 430×932, 360×800, 844×390 and 768×360.
- Exact player/card counts; no document overflow, seat overlap or hub overlap;
  viewer at bottom/right; own card/equipment touch areas at least 44×44; card
  captions at least 11 px.
- Every image decodes in Chromium. All 8/4/23 atlas tiles must be distinct and
  have non-flat pixel variation; hashes, dimensions and inventory must agree.
- Four manually inspected golden screenshots (PC/mobile, 4/8 players). CI compares
  the rendered screenshots at 128×96 sampling: mean per-channel error ≤5 and
  proportion of blocks differing by >30 ≤6%, allowing browser text antialiasing.
- Full source assets stay within 2.4 MB; compiler payload remains below 3 MiB
  compressed. No external runtime assets or fonts.

Audit found and fixed: five-player phone deck overlap; atlas neighbours showing
inside wide equipment previews; stretched illustration proportions; cut card-back
marks on dense mobile tables; insufficient table height in landscape; local/CI system-font differences. Fonts
are now bundled rather than weakening screenshot comparison thresholds. Atlas art
now uses nested clipped SVG viewports, preserving proportions without adjacent
cell bleed. Final card backs use the dedicated illustration.

## Scope preservation and remaining verification

Engine, `GameRoom`, persistence/schema, API/privacy routing and local server remain
unchanged against the approved baseline; release packaging enforces their hashes.
Worker changes add only static artwork routes/modules and release health metadata.

Chromium PC/mobile and native touch are tested. Native iOS Safari/Firefox, a
production network outage and a deliberate real production rollback fault are
not verified. Actual post-release health, resource integrity, screenshots,
multiplayer privacy, shooting/reconnect and a BOT alarm are verified by the
release workflow using fresh QA rooms only; results are authoritative only after
that tagged release succeeds.
