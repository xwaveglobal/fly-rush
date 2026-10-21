# Progress log

Newest entry on top. Every AI session adds a short entry: what was done, what is unfinished, what's next.

---

## 2026-10-21 — v1.18: big UI/meta pass (owner's 13-point list + popup/daily/car mock-ups)

**Done**: see README "v1.18 changes". New modules: `src/ui/art.ts` (popup illustrations), `src/meta/Country.ts`, `docs/ECONOMY.md`. Car art in `src/assets/images/cars/` was cropped from the owner's line-up sheet.

**Pending / notes**
- Car-specific skills (Ion Burst, Phase Shift, Fire Trail…) are shown as "SOON". They are not implemented.
- In-race car sprite is still the X1 render, tinted per car. The owner will send high-res transparent rear renders of the 5 cars; swap them into `X1_VIEWS` / per-skin textures.
- Daily Day 4 / Day 7 in the mock-up show cars. The rewards stay items/coins (cars are class-gated); revisit if cars become daily prizes.
- Mega Gate aiming was typechecked + unit-tested, but not played through in a browser (the 0.5 fps headless run was stopped).
- Publishing the Claude artifact link fails with a validator false positive ("artifact-pr-review"). The owner tests on localhost / the HTML file in `builds/`.
- Emoji flags render as letters on Windows Chrome (OS limitation).

---

## 2026-10-21 — v1.17: ROADSTER button, leftover points, wheel speed

**Done**
- Training: early ROADSTER tap → nudge + toast instead of silent ignore (`Game.useRocket`, `UI.rocketWait`).
- ROADSTER button glows + "TAP!" when the danger hint says a jump is needed (`UI.danger` → `.ready`), same look as the training `.call` state.
- Bug fix: ROADSTER/SOS count badges never updated (`data-h` was missing on the badges).
- Track finish: unused Roadster/HYPER/SOS charges converted to points (`Game.cashLeftovers`, `LEFTOVER_POINTS`), and shown on the result screen.
- Tyres: per-frame capped tread step (no wagon-wheel strobing), longer blur and streaks, tyre spray particles (`TYRE` config, `Game.tyreSpray`, `Vehicle.rearTyreWorld`).
- `builds/sky-roadster-v1.17.html` (single file) replaces v1.16 and is published to the Claude artifact link.

**Notes for the next session**
- The cloud workspace has no npm registry access. Builds there use bun with three.js r169 fetched from GitHub, so they are not byte-identical to `vite build`. The owner's PC runs the real `npm run dev`.
- Wheel feel was checked only in a 0.5 fps headless browser. Get the owner's feedback on real devices and tune with `TYRE.*`.

**Next**
- (owner to fill in)

---

## 2026-10-21 — Moved to GitHub (v1.16)

**Done**
- Imported the project from a Claude chat (zip of the source + single-file HTML build).
- Verified the HTML build matches this source (both `v1.16`); kept it as `builds/sky-roadster-v1.16.html`.
- Added `AGENTS.md`, `CLAUDE.md`, this file. GitHub is used only for version control (no CI / Pages).
- Added `SkyRoadster-Dev.bat` + `scripts/dev-autopull.ps1`: owner double-clicks once on Windows; it runs `npm run dev` and pulls `main` every 20 s so localhost follows every push.
- Online test link = Claude artifact (republished from `builds/` single-file HTML on each release).

**Known gaps**
- `README.md` changelog stops at v1.14; code is at v1.16 (CSS notes mention v1.15.x changes: "+" next to coins opens Watch-Ad reward, big pickup title, collect flyers). Write the v1.15 / v1.16 changelog sections when known.
- No `package-lock.json` (the auto-pull script installs with `--no-package-lock` so a local lockfile never blocks `git pull`). If a lockfile is committed later, drop that flag.
- `package.json` name is still `xwave-flying-run` (old name). Harmless; rename if wanted.
- `server/` is a reference implementation only (JSON file storage, no auth).

**Next**
- (owner to fill in: next features / bugs)
