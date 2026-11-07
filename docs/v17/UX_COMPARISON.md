# V1.6.1 → V1.7 UX comparison

Measured at 100% browser zoom, Chromium, default device scale. Source baseline `cfb0a1d`; the old UI was copied outside the checkout before editing and served with the same engine fixture shape.

| Case | V1.6.1 document | V1.7 document | Result |
| --- | --- | --- | --- |
| PC 1366×768 / 4 or 8 seats | 1366×1337 | 1366×768 | Entire table, personal hand and controls fit |
| Mobile 375×667 / 4 seats | 375×1849 | 375×667 | Single screen; auxiliary content in drawer |
| Mobile 375×667 / 8 seats | 375×2083 | 375×667 | All eight compact seats remain visible |

Machine evidence: [comparison.json](comparison.json), [before geometry](before/geometry.json), [after geometry](after/geometry.json). The after run checks every seat/card box, seat non-overlap, hub separation, own-seat bottom anchoring, 44px own-hand targets and card caption font ≥11px; page overflow is not merely hidden and assumed correct.

| View | Before | After |
| --- | --- | --- |
| PC / 4 seats | [before](before/pc-4.png) | [after](after/pc-4.png) |
| PC / 8 seats | [before](before/pc-8.png) | [after](after/pc-8.png) |
| Mobile / 4 seats | [before](before/mobile-4.png) | [after](after/mobile-4.png) |
| Mobile / 8 seats | [before](before/mobile-8.png) | [after](after/mobile-8.png) |

Other evidence: [aim](after/aiming.png), [reaction](after/reaction.png), [mobile reaction](after/reaction-mobile.png), [investigation dialog](after/investigation-detail.png), [native touch investigation](after/mobile-investigation.png), [memory invalidation](after/memory-invalidated.png), [Bribe decision](after/bribe-decision.png), [game over](after/game-over.png), [real solo](after/solo-real.png).

The personal roles are rendered once, inside the viewer's anchored seat. Opponents keep three distinct card buttons, full names in inspection/title, and icon/text status. Small mobile opponent slots are a deliberate compact mode; seat inspection and the 44px action controls offer larger alternatives. No identity is inferred from portraits or BOT behavior.
