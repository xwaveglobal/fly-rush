# Progress log

Newest entry on top. Every AI session adds a short entry: what was done, what is unfinished, what's next.

---

## 2026-10-21 — Moved to GitHub (v1.16)

**Done**
- Imported the project from a Claude chat (zip of the source + single-file HTML build).
- Verified the HTML build matches this source (both `v1.16`); kept it as `builds/sky-roadster-v1.16.html`.
- Added `AGENTS.md`, `CLAUDE.md`, this file. GitHub is used only for version control (no CI / Pages).

**Known gaps**
- `README.md` changelog stops at v1.14; code is at v1.16 (CSS notes mention v1.15.x changes: "+" next to coins opens Watch-Ad reward, big pickup title, collect flyers). Write the v1.15 / v1.16 changelog sections when known.
- No `package-lock.json` yet — run `npm install` once locally and commit the lockfile for reproducible builds.
- `package.json` name is still `xwave-flying-run` (old name). Harmless; rename if wanted.
- `server/` is a reference implementation only (JSON file storage, no auth).

**Next**
- (owner to fill in: next features / bugs)
