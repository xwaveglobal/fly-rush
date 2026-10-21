# Fix list — after v2.0.8 (owner review 2026-10-22)

Status: **DONE in v2.1.0** (2026-10-22). G2 note: new per-world obstacles are new LOOKS on the existing fair hitboxes (crate / barrier / beam); no new hitbox types were added.

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

## F. Owner screenshots, round 2 (iPhone, artifact)
- **F1. Bug:** after finishing the training, back on Home all buttons are missing.
- **F2.** New logo → `docs/assets-inbox/logo-sky-roadster-v2.png` (2172×724 RGBA, sharp). Replace the home / result logo.
- **F3. Pilot card (rival + own):** remove Trophies; **new avatar set** (current helmets look bad); car name cut ("XWAVE In…") → short name; the EXP shield icon is hard to read → a clearer icon (e.g. "EXP" badge text or a speedometer); show **Average EXP** instead of Best EXP *(open: does the leaderboard / rank also use average, or stay on best run? see questions)*.
- **F4. Daily:** remove points + chests (coins only); add more daily missions related to v2 (EXP, ranks, specials, Bonus, distance, power-ups); **remove Near Miss from the whole game** (pop, stat, quest, result tile) — nobody understands it.
- **F5. Tracks 3–5:** not "Coming soon" — they unlock at **S / SS / SSS** (show the rank badge on each card).
- **F6. Practice (item info card):** "Practice it" = a practice road for **that special only** (SOS / Roadster / HYPER), no basic left/right/up/down steps, and **no shield pickups** in the practice. Item card text: shorter, v2 rules (no "spot the purple rocket on the road", no "win it in Cups").
- **F7. Profile:** nicer Magic Bag icon; much less text; remove Cups (= D2).
- **F8. Result screen:** title **"END"** instead of "GAME OVER"; no "how to avoid" tip; emphasise **this race's EXP**, the **rank reached** and the **leaderboard position**; minimal text.
- **F9. Revive popup:** no "how to avoid" tip, minimal text, focus on the button + revives left.
- **F10. Cars:** the car in `docs/assets-inbox/car-rank-C-rear.png` (1536×1024, background is a baked-in checkerboard → must be cut out) becomes the **rank C** car. Cars for **B and above are black silhouettes** (not visible until unlocked). Ladder becomes D Zenith · C new car · B · A · AA · AAA.

## Owner answers (2026-10-22 02:11)
1. **Average EXP** only on OTHER pilots' cards; the player's own profile shows **best** only. Rank / leaderboard stay on best run.
2. Special prices OK: **SOS 1,200 · Roadster 1,800 · HYPER 4,000**.
3. Rank-C car name: Claude picks → **XWAVE Vega**. B → AAA stay Volt · Phantom · Inferno · Nexus.

## G. Endless variety (owner request 02:11)
- **G1. No repeats before AAA.** Today 5 worlds loop every 5 km (≈ 2 min). New: a **12-world ladder** tied to EXP (same minutes on every speed level) — **2 worlds per rank phase**, each ending in that phase's rank gate; only after AAA does the ladder start again.
  - D: Future City → Neon Harbor · C: Cloud City → Solar Farms · B: Neon Tunnel → Crystal Canyon · A: Space Zone → Asteroid Belt · AA: XWAVE Megacity → Storm Front · AAA: Volcano Core → Aurora Ice.
  - 7 new sceneries (Neon Harbor, Solar Farms, Crystal Canyon, Asteroid Belt, Storm Front, Volcano Core, Aurora Ice).
- **G2. New obstacles per phase** (signature of each rank, all through the fairness validator; built on the existing low / high / full / moving hitboxes so `ObstacleRules.ts` stays the single source):
  - C: road-works barrier + cone line (low), sign gantry (high).
  - B: rolling container (moving lane block), double laser fence.
  - A: lane-switching truck (sweeps 2 lanes, like the sliding platform), drop-gate.
  - AA: crusher pillars (full block, alternating), storm debris.
  - AAA: lava jets / ice walls (timed open lane), mixed combos.
## (answered) questions
1. F3 "Average EXP": shown on the pilot card only, or should rank / leaderboard use average too? (Design today: rank = best single run.)
2. A8 special prices: SOS 1,200 · Roadster 1,800 · HYPER 4,000 OK?
3. F10: name of the rank-C car? Cars B → AAA keep Volt / Phantom / Inferno / Nexus?

## H. Round 3 — training (owner 2026-10-22 06:30) — chốt, chưa code
- **H1.** No ad after a training / practice ends (`afterResults` must skip the interstitial when the finished run was training).
- **H2.** Basic training: no Shield pickup on the road (remove the shield at 412 m), and its hint "Road power-ups: Shield, …" → mention only Magnet / Turbo / ×2.
- **H3.** Basic training: remove the coin line at the very end (600–630 m) — the road just runs out to the finish.
- **H4.** Training end card (basic + every special practice): add a **Home** button.
- Found while checking (Claude):
- **H5.** After a special practice, "Replay training" restarts the BASIC training → should replay the same practice (Roadster / HYPER / SOS).
- **H6.** During training the HUD shows "EXP 0" and the daily-mission strip ("Play 3 races") — training earns nothing → hide the EXP box value / show "TRAINING", hide the mission strip.
- **H7.** The end card text says "Race Endless" even after a special practice → for practices show "Back to the bag" / "Race" + "Home".
