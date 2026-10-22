/** v3 native UI — safe-area insets (status bar / home indicator / TikTok capsule menu) */
import type { Gfx } from './gfx.ts';

export const SAFE = { top: 0, bottom: 0, menuBottom: 0 };

/** top inset: below the status bar and the TikTok "…  ×" capsule */
export function safeTop(_g: Gfx) {
  return Math.max(SAFE.top, SAFE.menuBottom);
}
export function safeBottom(_g: Gfx) {
  return SAFE.bottom;
}
/** content column (phones: full width; tablets: a centred 480 px column) */
export function column(g: Gfx) {
  const w = Math.min(g.W, 480);
  return { x: (g.W - w) / 2, w };
}
