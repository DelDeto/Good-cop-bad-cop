# V1.7.0 — Gameplay first UX specification

Base: verified V1.6.1 branch `feature/v1.6-sprint-01`, commit `cfb0a1d`. Work branch: `feature/v1.7-responsive-table`; PR base must be the V1.6.1 branch, never old main. No merge or production deployment.

## Audit / preserved contracts

V1.6.1 gameplay combines a tall two-column dashboard, a second copy of the viewer's role cards, tiny card captions and page scrolling. Mobile stacks these panels vertically and the viewer is not anchored to the bottom. Whole-root rendering replaces chat inputs and equipment selection is reset by reaction pass updates.

Keep engine byte-identical; retain all 23 equipment, 4–8 seats, 3–7 BOTs/two levels, API payloads, private `known`/hand projections, SSE, room/reconnect, shot/Coffee/Bribe/dead-aim fixes and win/team rules. Serum offline-human P1 remains open. Worker changes limited to necessary release version metadata.

## V1.7.1 — desktop composition

A viewport shell uses four bounded rows: status, interaction feedback, flexible table, personal hand; auxiliary navigation opens a drawer. The personal seat is the only rendering of own three cards. Other seats surround a shared equipment/gun hub. Every seat keeps its absolute server seat number, with relative clockwise order computed from the viewer's seat. Layout accepts 4/5/6/7/8 players; viewer is always the bottom anchor. Desktop body cannot scroll at 1366×768 / 1440×900 / 1920×1080. Names truncate with full name available by title and details.

## V1.7.2 — mobile composition

Targets: 360×800, 375×667, 390×844, 430×932 portrait. Compact opponents remain visible, with three distinct card selectors and a 44px-high combined seat/detail target. Own cards and equipment occupy the bottom hand, with 44px controls. Individual opponent slots may be narrower than 44px at eight seats; a seat inspection dialog offers full-size card choices. Log/chat/help/memory live in an internally scrolling drawer, never a scrolling gameplay page. Safe-area insets and dynamic viewport height are respected.

## V1.7.3 — interactions

Retain command validators and existing explicit interaction states. Picking a card/seat keeps server seat indices. Investigation, gun draw, equipment draw, shooting and public reveal require confirmation. Two-target equipment highlights the next valid target and remains cancellable before send. Existing single-target equipment can target a card/avatar; read its detail by right click or long press. A held-touch release must not trigger a second action. No drag is required.

Show gun/target labels and a pointer-events-none arrow layer using public aim data. Red shot emphasis differs from dashed aiming. Only confirmed state/results animate. Reaction controls show viewer-owned valid equipment, server-provided deadlines only, optional pass and existing force timing. Countdown updates text nodes only.

## V1.7.4 — information / recovery

Known identities come only from `myCards`, public `cards.type`, or this viewer's `known`. Track invalidated known positions as stale client labels without retaining old identities; do not infer replacements. Memory drawer re-reads the current projection. Public timeline and private findings are labeled separately. A small latest-event strip makes BOT activity legible without the log drawer.

Render stable shell regions only when their markup changes. Preserve drawer, chat draft, input focus/selection and valid equipment selection across unrelated SSE. Reset choices only when command context or eligibility changes. Announce connection state and allow normal EventSource recovery; modal focus returns to its trigger, Escape closes only local overlays. Server pending choices survive closing an overlay and reload.

## V1.7.5 — visual language

Mature noir: restrained dark felt/wood, brass rules, paper dossier cards, concise status chips. Typography ≥11px for gameplay labels, main controls ≥13px; color always accompanied by text/icon. Short transform/opacity transitions, reduced-motion support, no ornamental overlays over controls. Reuse original project art only; no 3D or heavy dependency.

## Validation / delivery

Capture old-layout baseline before implementation, then Playwright screenshots for desktop/mobile 4/8 seats, aim/reaction and investigation detail. Validate all required desktop/mobile viewports × 4/6/8 seats, plus 5/7-seat placement. Assert bounding boxes inside viewport, seat/hand non-overlap, viewport overflow zero and personal seat below opponents; do not count hidden/clipped seats as visible. Browser scenarios: lobby/start, actual solo and multiplayer/reload, investigate, equip/arm/reveal/aim/retarget/shoot/reactions, two-target selection plus unrelated SSE, wound/death, memory invalidation, game over, focus/chat and long-press.

Run existing 126 tests after each implementation stage, add V1.7 tests, retain Node 20/22/24 CI. New browser suite writes machine-readable geometry evidence and screenshots; distinguish engine-backed fixtures from actual server and mocked DO tests. Report PASS/FAIL, previous Serum P1 and any remaining verification limitations. Production rollout proposal only after review, rules/staging gates and explicit approval.
