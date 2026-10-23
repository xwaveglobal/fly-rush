# 04 — Baseline test results (v4.0.1)

Run on 2026-10-23 in the Claude cloud workspace (Linux, Node v22.22.0, npm 10.9.4), branch `feature/sky-roadster-3d-v4.1` @ `665fc30`, clean working tree. Only what was actually executed is reported.

| # | Command | Result |
|---|---|---|
| 1 | `npm install` | **FAILED — environment.** `ENOTFOUND registry.npmjs.org`; retried through the session proxy → `403 Forbidden` on `@types/three`; `npm install --offline` → `ENOTCACHED`. The npm registry is not reachable from this session, so `node_modules` is empty. Not a project problem. |
| 2 | `npm ls --depth=0` | missing: `three@0.169.0`, `@types/three@^0.169.0`, `typescript@^5.6.3`, `vite@^5.4.10`, `vite-plugin-singlefile@^2.0.3` (consequence of #1) |
| 3 | `npm test` (7 suites) | **PASSED, exit 0.** The tests need no packages (Node 22 `--experimental-transform-types`). Details below. |
| 4 | `tsc --noEmit` (global TypeScript 6.0.3, project wants ^5.6.3) | **Could not verify.** Exit 2 with 38 errors, all caused by the missing `three` package: 29 × TS2307 "Cannot find module 'three'" (and `three/examples/jsm/...`), 9 × TS7006 implicit `any` in callbacks whose types come from `three` (`traverse`, `TextureLoader.load`). No error outside that cause. |
| 5 | `npm run build` (tsc + vite) | **Could not run** — stops at the same type errors; `vite` is not installed. |
| 6 | `node scripts/build-esbuild.mjs` (fallback) | **Could not run** — `ERR_MODULE_NOT_FOUND: Cannot find package 'esbuild'`. |
| 7 | Native (`build:tiktok`, `check:tiktok`) | **Not applicable on this branch** — the native pipeline exists only on `main`. Not run. |

## `npm test` details

| Suite | Result |
|---|---|
| `test:fairness` | ALL PASSED — static: 9,455 rows checked; dynamic: 24 runs, 144 km, 0 crashes; 20 tracks finished 8/8; easy/normal/hard 330 km each, 0 crashes; max air time under UP spam 0.97 s |
| `test:difficulty` | ALL PASSED — 22,326 rows in 360 sequences (5 maps × 3 levels × 24 seeds), tier mix close to target |
| `test:air` | ALL PASSED — 5 checks |
| `test:exp` | ALL PASSED — 25 checks |
| `test:phases` | ALL PASSED — 12 checks |
| `test:bonus` | ALL PASSED — 50 checks |
| `test:server` | ALL PASSED — 9 checks |

## To complete the baseline (needs a machine with npm access)

On the owner's Windows PC (which already runs the game) or any machine with internet:

```bash
git fetch origin
git checkout feature/sky-roadster-3d-v4.1
npm install
npm run typecheck
npm test
npm run build
# baseline tag (this session could create it only locally; tag pushes were refused with HTTP 403)
git tag -a v4.0.1 665fc30 -m "Baseline v4.0.1 before the 3D upgrade"
git push origin v4.0.1
```

Expected: typecheck and build pass, because this code is the shipped v2.3.0 H5 game plus a one-line version change. This must be confirmed before Step 02 code is merged; Step 02 work will also need a working `npm install` (in this workspace or on the PC) to type-check and build.
