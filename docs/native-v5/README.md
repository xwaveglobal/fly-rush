# v5.0.0 — native TikTok Minis build: checks

## HS SDK (`npm run check:tiktok`)

Result: 0 fail, 0 warn. The check passed these:

- native package
- SDK v1.1.2
- the TikTok review buttons
- boot in the native runtime
- SDK started
- login with delivery confirmation
- iOS rewarded ad case
- rewards for share / tiktok_profile / tiktok_shortcut
- dashboard JSON (5 places, 0 products)
- profile save on the device
- Android boot
- Android rewarded ad

## Ad places

These are the same ids as v3, in `tiktok.hs-dashboard.json`:

| Place | Moment | TikTok ad unit |
|---|---|---|
| `rw_revive` | revive after the last crash | `ad7698648409188239361` |
| `rw_end_bonus` | +20 % coins on the result card | `ad7698648440104470580` |
| `rw_free_coins` | free coins (Home + / Shop) | `ad7698650608001796097` |
| `rw_head_start` | head start before a race | `ad7698658129030809601` |
| `int_race_end` | interstitial after a race (not with Remove Ads from v3) | `ad7698648500532201524` |

## Real-tap QA in the HS fake phone

Command: `node scripts/qa/native.mjs <out> [--platform android]`

TikTok mode passed 25 / 25 (`tiktok/`). Android mode passed 25 / 25 (`android/`). The QA covered:

- **Home and settings:**
  - Home, with Entry / Launch only on TikTok;
  - NORMAL at launch;
  - Settings: Camera motion and LO / MED / HI graphics.
- **Garage and shop:**
  - Garage;
  - Shop coins → specials exchange and the item → exchange popup;
  - no Beans products.
- **Bonus:** 1 h / 30 min / 3 plays.
- **Race:**
  - Play → tracks → special pick → countdown → race;
  - a swipe changes lane;
  - the special button sits under the hearts;
  - Pause never ends the race.
- **Revive and results:**
  - revive ad closed early → no revive;
  - revive ad watched → back in the race with no extra heart;
  - game over → weekly rank board → result card with Restart.
- **Class C:** promotion with a +300 coins / +1 Roadster Jump reward.
- **Training:** Skip is always shown.
- No page errors.

## Not covered here

- Real phones: FPS, audio latency, the TikTok app itself. Chromium + SwiftShader only.
- The upload to TikTok: it waits for the owner's approval.
