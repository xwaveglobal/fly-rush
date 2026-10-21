# Fix list — after v2.0.8 (owner review 2026-10-22)

Status: **chốt, chưa code**. Owner will send more bug screenshots → append below, then fix in one pass.

## A. Gameplay / logic
- **A1. Special trước khi đua** — Retry also opens the choice. Replace the long popup with ONE big "SPECIAL" button (icon of the chosen item) on the pre-race step → opens the **Magic Bag** popup to pick; items you don't own have a **Buy with coins** area at the bottom of the same popup.
- **A2.** Bonus Retry after the event closed must not start (check `bonusState()` on retry / start).
- **A3. Hearts**: keep hearts. Every EXP race starts with **1 heart**; a **heart pickup** appears on the road about **every 1,000 EXP** (max 3 hearts). A heart absorbs a crash (respawn, no ad). Out of hearts → revive by ad (max 2) → 3rd → Start.
- **A4.** Bonus showcase specials (Wall Run / Sky Rail / Tunnel Rider): the real car position must follow the visual — coins under the road are not collected by a car on the wall / in the air (coins in its path fly to it: magnet on), obstacles it passes are smashed with sparks instead of going through the body.
- **A5.** Phase Ghost: no blinking — car turns into a steady translucent blue "hologram" for the effect.
- **A6.** Cars bought with coins in v1 above the player's rank: re-lock (rank-only rule) and refund their v1 price as coins once.
- **A7.** Turbo pickups rarer (harder to get: fewer, often in a lane next to an obstacle).
- **A8.** Specials cheaper (proposal: SOS 1,200 · Roadster 1,800 · HYPER 4,000) — owner to confirm numbers.
- **A9.** Bonus obstacles themed per place (replace the neon props): desert = rocks / cactus / oil barrels / pickup trucks; forest = logs / fallen trees / wooden barriers; country = hay bales / fences / tractors; sea = buoys / crates / boats on the causeway.
- Kept as is (owner): revive by ad adds EXP; turbo adds EXP.

## B. Text cut / squeezed (375×640, EN/DE/FR)
- **B1.** Special tiles: "Roadster Ju…" cut and "×1" on top of the name → count at the bottom corner.
- **B2.** Special descriptions clamped → short lines ("Rocket up before a crash", "Hop a whole block", "Fly over a long stretch").
- **B3.** Locked special tiles: 2-line ~9 px names → icon + short name (Tunnel / Wall / Ghost / Rail).
- **B4.** Profile "Car: XWAVE …" → just "Zenith".
- **B5.** "Watch ad · Revive" button too tight, DE "Werbung · Weiter" cut → smaller button text.
- **B6.** Bonus closed: "OPENS 02:00 AM · IN 17M" 2 huge lines → button "Opens 02:00", countdown in a small line.
- **B7.** EXP & rank guide: speed rule box breaks into 4 lines; S-tier note wraps → one short line each.
- **B8.** Endless card: "… D → AAA · NORMAL" splits → speed level as a small tag.
- **B9.** Profile: "HOW EXP WORKS", "BEST EXP", "THIS WEEK" wrap → "EXP guide", "Best", "Week".
- **B10.** Tutorial needs scrolling in German (624 > 602 px).

## C. Needs scrolling
- **C1.** Daily: missions are below the fold → 7-day check-in as a compact grid (4 + 3) so missions fit.

## D. Leftover v1 text / buttons
- **D1.** Home Shop tag "−80%" (old Starter Pack) → remove.
- **D2.** Profile: "CUPS" button + "Trophies" row; bag row "Your items · when to use them" → remove Cups/Trophies, bag row "Specials · 1 per race".
- **D3.** Home Bonus strip lost its time line → "OPEN · 42m left" / "Next 02:00".
- **D4.** Tutorial "Roadster guide" link; Roadster tile "Tap ROADSTER: clear 2 rows" → "Your special: tap to jump a block".
- **D5.** Settings "JUMP GUIDE" → remove (or "Specials guide").
- **D6.** Game Over with 0 coins: "Coins — +0" + "No coins to double" → hide both.
- **D7.** Lock toast says "Track 2" → "Mega Rush".
- **D8.** Item info cards still say "Equip" / "pick up on the road" → v2 wording.

## E. Layout / notices
- **E1.** Home: the Bonus "OPEN" tag sits right under the Daily button → move it onto the Bonus button.
- **E2.** Special popup rules = 3 lines → one line "Stored in your bag · 1 per race".
- **E3.** RANK GATE strip hidden by notices → strip below the notice lane; other notices wait while in a gate.
- **E4.** Rank-up notice queued behind "new best" / "new car" → rank-up first, the others merged into one line.
- **E5.** Game Over weekly rank "Week #32,172" looks odd at low EXP → show "Top x %" or hide under 1,000 EXP.
