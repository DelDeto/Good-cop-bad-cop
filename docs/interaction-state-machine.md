# Sprint 01 interaction contract

The browser derives one explicit state from the authoritative server snapshot, local equipment selection, confirmation modal and request-in-flight flag. `interactionState()` and `INTERACTION_STATES` live in `public/app.js`; `data-interaction-state` exposes the current rendered state for inspection. The server remains the final validator. No frontend rewrite or new gameplay phase is required.

| State | Valid inputs / server commands | Cancellation | Feedback | Recovery |
| --- | --- | --- | --- | --- |
| IDLE | Chat, legal off-turn equipment selection; `chat`, `playEquipment` after selection | Local selection/modal can close | Waiting for named current player | Re-derive from GET state / SSE |
| SELECT_CARD | Opponent hidden card → confirm `actionInvestigate`; own card → `chooseReveal` / `serumReveal`; held equipment → `discardHand` | Investigation confirmation can close; mandatory reveal/discard remains pending | Highlight eligible cards; explain required selection | Snapshot reconstructs mandatory pending |
| SELECT_PLAYER | Fallback target modal / aim picker → relevant selected command | Close modal, send nothing | Named target options | Close stale modal when turn, phase or pending changes |
| CHOOSE_AIM | Living opponent avatar → `chooseAim`; `endTurn` once gun aimed; equipment | Aim choice remains replaceable; equipment can cancel before submission | Highlight avatars; show current aim | Server snapshot restores aim |
| CONFIRM_SHOT | Confirm → `actionShoot` | Close modal sends nothing | Shooter's explicit shooting confirmation | State change closes stale confirmation |
| EQUIPMENT_TARGET | Legal card/avatar → `playEquipment`, or local first target for two-target equipment | Hủy clears local selection; no consumption | Highlight legal targets and describe selection | Invalid command refreshes state; missing equipment clears selection |
| EQUIPMENT_SECOND_TARGET | Second card/avatar → `playEquipment`; Bribe owner chooses own card → `resolveBribe` with decisionId and swap=true, or decline with swap=false | Two-target selection may cancel before submission. After Bribe investigation, only decline; spent equipment is not refunded | Second-target instructions; Bribe private investigated identity and swap eligibility | Reload reconstructs Bribe decision from private pending view. Other players see only waiting owner |
| REACTION_WINDOW | Optional legal equipment → `playEquipment`, `passShot`, shooter `forceShot` after 15 s | Equipment target selection can cancel; passing does not resolve early while other living players have not passed | On-table shooter → victim, own legal defensive gear highlight, deadline/force countdown | GET state/SSE restores victim, passes, since/deadline. Redirection resets passes and clock |
| RESOLVING | While sending: duplicate requests suppressed; while another Bribe owner decides: wait/chat | A submitted command cannot be canceled | Sending/waiting message | Re-fetch state after rejection; SSE or reload restores authoritative pending |
| TURN_COMPLETE | `endTurn` after main action without gun; game finished allows owner `restart` | Optional equipment selection can cancel | End-turn control or winning result | Next snapshot derives IDLE/SELECT_CARD |

A reaction takes priority over a confirmation/selection, with equipment target selection nested locally inside the reaction. Chat is available throughout. Mandatory choices are never canceled by closing a modal. Browser refresh drops local selection but preserves server pending.

Bribe stage 1 validates only public eligibility, then consumes the equipment and investigates. Legacy one-step ownSlot requests are rejected uniformly before reading card identity. Stage 2 is restricted to its owner and unique decisionId, locks the target's internal cardId, allows swapping only an ordinary investigated card, and invalidates affected position knowledge. The giver retains knowledge of the specific card they gave away. BOT currently chooses decline after investigation; it never reads hidden opponents' cards for this decision.

Wire shares the exact investigated card with the living equipment owner named on the watched player. It shares normal investigations and equipment calls to the investigation helper; it does not recursively trigger other wires. Polygraph's mutual hand viewing is unchanged.

`round` is a legacy turn-sequence counter. Both UI labels now say LƯỢT; no full-table-round arithmetic is inferred, particularly with coffee, reverse direction or eliminated players. Winning/team rules remain unchanged.

Reaction timing is unchanged: BOT rooms auto-resolve after 20 seconds; human-only rooms have no automatic deadline and the shooter may force resolution after 15 seconds. Countdown is advisory; server time validates commands.
