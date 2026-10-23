# Magic Bag — automatic equip before each run (Patch 02)

The Magic Bag already **is** the special inventory: `save.items.super / hyper / escape` with exactly one
equipment slot, `save.special` (shown on the pre-race "Pick your special" screen; "1 special per race").
So the auto-equip uses that slot — there is no second inventory and no separate system.

`Game.magicBagAutoEquip()` runs when the pre-race pick screen opens (`openSpecialPick`, used by Play →
Endless / Mega Rush and by Retry):

1. Slot already filled (`save.special` set, count > 0) → **nothing** (the player's choice is never replaced;
   Resume / Retry never re-roll).
2. Eligible = the specials with count > 0 (zero-quantity excluded). None → nothing, no message, start normally.
3. Otherwise one eligible item at random (uniform) → `save.special`, saved, toast
   **"MAGIC BAG: ROADSTER JUMP / HYPER JUMP / SOS EQUIPPED"** with the item's icon (short, non-blocking).
4. Nothing is consumed: a special still leaves the bag only when it is used in the race (`spendCarried`),
   so Play / Restart / Resume / refresh can't consume twice.
5. The player can still change it or pick "Race without a special" on the same screen before GO.

Interaction with the last-chance rule: an auto-equipped special is an ordinary pre-race special — one
charge, used manually or by the last-chance auto-activation, never both, never a free rescue.
