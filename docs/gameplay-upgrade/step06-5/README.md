# Step 06.5 (+ Patch 02) — H5 gameplay, v4.5.0

Everything here comes from the **real H5 build** (`node scripts/build-esbuild.mjs`, Chromium + SwiftShader,
360 × 640 @2, real autoplay policy). Real-build QA: **59 / 59 checks** (`qa_results.json`, script
`scripts/qa/step065.mjs`). Node suites: **12 / 12** (`npm test`, incl. the new `tests/airdash.test.ts`).
Phone and TikTok Native were not available: nothing is claimed for them.

| Topic | Doc | Screenshots |
|---|---|---|
| Baseline audit | `00_baseline_audit.md` | |
| Class / Garage | `class_unlock_matrix.md` | `01`–`05` |
| Air Dash | `air_dash_lane_transition_diagram.md` | `06`–`14`, `air_dash_full_animation_sequence.png` |
| Spoiler | `spoiler_state_matrix.md` | `15`–`19` |
| Specials (manual + auto) | `special_auto_activation_flow.md` | `20`–`24` |
| Congratulations | (`class_unlock_matrix.md`) | `25`–`28` |
| Flat non-Home buttons | `non_home_button_style_audit.md` | `29`–`34` |
| Item balance | `item_balance_before_after.md`, `item_balance.json` | |
| Audio | `audio_startup_and_latency_report.md` | |
| Crash (owner note) | car drops to the road, 3 real parts break off on the final crash | `crash_sequence.png` |
| Tests | `test_results.md` | |
| Patch 02 (Pause, Magic Bag) | `patch02/` | `patch02/01`–`05` |
