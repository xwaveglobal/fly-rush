# Non-Home buttons — flat style audit (Step 06.5)

Sources of button lighting found in `src/ui/ui.css` (2,532 lines before the change: 138 `box-shadow`,
51 `text-shadow`): the shared `.btn` (gradient + 3-D edge `box-shadow` + gloss `::before` / `::after`
strips, `:active` shadow), screen rules (`.on` / `.sel` / `.cur` glow rings on cards, tabs and speed
buttons, HUD special-button halo and pulse animations), `drop-shadow` filters on button icons, and
inline `text-shadow`s. No canvas- or WebGL-drawn buttons exist (all buttons are DOM).

Fix — one scoped block at the end of `ui.css` (`#ui .screen:not(#start) …`), so **Home (`#start`) is not
touched** and every other screen (Garage, Ranks, Settings, Pause, Game Over, Revive / continue, item
selection, Magic Bag, Shop, rewards, celebrations, HUD) is:

| Removed | How |
|---|---|
| glow / outer glow / halo / drop & box shadows | `box-shadow: none` on every `button`, `.btn`, `[data-a]`, `.toggle`, `.switch` and their pseudo-elements |
| text shadow | `text-shadow: none` on the button and every child (labels, icons, prices) |
| icon bloom | `filter: none` on the button and its children (no `drop-shadow`) |
| gloss strips / light beams | `.btn::before / ::after { display: none }` (except the invisible enlarged hit area of the HUD Roadster / SOS buttons) |
| pulsing illumination | `animation: none` on buttons |
| strong 3-D | gradient → one solid colour (mix of the button's own two palette colours), 1 px solid border in its edge colour |

States without lighting: **pressed** = `scale(.97)` + `brightness(.88)`; **disabled** = 45 % opacity +
partial greyscale; **selected** = the existing coloured border (2 px on cards); **normal** = solid colour.
Sizes, paddings, radii, touch targets and layout are unchanged (no new margins → no layout shift).

Automated check (real build, `scripts/qa/step065.mjs` section J): every visible button of the open
non-Home screens is read with `getComputedStyle` (element + `::before` / `::after`) → no `box-shadow`,
`text-shadow`, `filter`, `animation` or glowing pseudo-element. Screenshots `29_…` – `33_…`, Home
unchanged in `34_home_buttons_unchanged.png`.
