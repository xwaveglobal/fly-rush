/**
 * Procedural racing-helmet avatars (pure SVG strings, no image files).
 * Each avatar = a race helmet in 3/4 view with a livery (stripes / chevrons / split / flames),
 * an iridescent visor, a racing number and a pit-board background (carbon, checker or speed lines).
 * A new pilot gets a random one; it can be changed or re-rolled in the profile.
 */
import { CLASS_COLOR, type RankClass } from '../meta/Rank.ts';

// v1.18 — front-facing racing pilot portraits: glossy helmet with a city-reflecting visor,
// livery, racing suit with collar + team stripe, and a neon team-colour backdrop.
const SHELLS = ['#f4f6fb', '#16181f', '#e01b33', '#1d4dff', '#ffcf1f', '#7a3dff', '#0fb862', '#ff6a12', '#ff4fd8', '#22c8ff'];
const ACCENTS = ['#ff2240', '#ffd21f', '#22d1ff', '#ffffff', '#111522', '#ff4fd8', '#3dff8b', '#ff8a1f'];
const VISORS: [string, string, string][] = [
  ['#7fe3ff', '#1a5bff', '#140a40'],
  ['#ffd27a', '#ff2d6a', '#2a0820'],
  ['#fff07a', '#ff7a1a', '#2a1200'],
  ['#8affc8', '#0aa4ff', '#04203a'],
  ['#e0b0ff', '#a03cff', '#1a0638'],
  ['#e8f6ff', '#6a8cff', '#0a1238'],
];
const BG_HUES = ['#1d6dff', '#9b4dff', '#ff3b7a', '#11b8a6', '#ff8a1f', '#3a5bff', '#d04dff', '#16c25a'];
const LIVERIES = ['twin', 'wide', 'chevron', 'flame', 'split', 'stars', 'bolt', 'race'] as const;

export const AVATAR_COUNT = 32;

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
};

export function avatarSvg(i: number) {
  const n = ((i % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  const shell = SHELLS[n % SHELLS.length];
  let acc = ACCENTS[(n * 3 + 1) % ACCENTS.length];
  if (acc === shell || Math.abs(lum(acc) - lum(shell)) < 0.2) acc = lum(shell) > 0.5 ? '#111522' : '#ffd21f';
  const [v1, v2, v3] = VISORS[(n * 5 + 2) % VISORS.length];
  const hue = BG_HUES[(n * 7 + 3) % BG_HUES.length];
  const liv = LIVERIES[(n + Math.floor(n / SHELLS.length)) % LIVERIES.length];
  const suit = lum(shell) > 0.6 ? '#1b2238' : shell;
  const num = String(((n * 37 + 7) % 98) + 1);
  const numFill = lum(shell) > 0.55 ? '#111522' : '#ffffff';
  const id = `v${n}`;
  const helmet = 'M13 34C13 18 21 8 32 8s19 10 19 26c0 8-3 14-8 17H21c-5-3-8-9-8-17z';
  const livery: Record<(typeof LIVERIES)[number], string> = {
    twin: `<path d="M28.5 8v20M35.5 8v20" stroke="${acc}" stroke-width="3"/>`,
    wide: `<path d="M27 7h10v22H27z" fill="${acc}"/><path d="M29 7v22M35 7v22" stroke="${shell}" stroke-width="1"/>`,
    chevron: `<path d="M16 16l16 9 16-9M15 22l17 9 17-9" stroke="${acc}" stroke-width="3" fill="none" stroke-linejoin="round"/>`,
    flame: `<path d="M13 40c3-1 4-5 3-9 3 2 4 5 4 8 1-4 3-8 2-13 4 3 5 8 4 14h12c-1-6 0-11 4-14-1 5 1 9 2 13 0-3 1-6 4-8-1 4 0 8 3 9v6H13z" fill="${acc}"/>`,
    split: `<path d="M32 6v46H10V6z" fill="${acc}"/>`,
    stars: `<path d="M22 15l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5zM42 15l1.6 3.3 3.6.5-2.6 2.5.6 3.6-3.2-1.7-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z" fill="${acc}"/>`,
    bolt: `<path d="M35 7l-9 13h6l-4 9 11-14h-6l4-8z" fill="${acc}"/>`,
    race: `<path d="M12 27h40v4H12z" fill="${acc}"/><path d="M12 32h40" stroke="${acc}" stroke-width="1" opacity=".7"/>`,
  };
  return `<svg viewBox="0 0 64 64" class="avsvg" aria-hidden="true"><defs>
<radialGradient id="bg${id}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${hue}"/><stop offset=".55" stop-color="${hue}" stop-opacity=".45"/><stop offset="1" stop-color="#05071a"/></radialGradient>
<linearGradient id="sh${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
<linearGradient id="vi${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v1}"/><stop offset=".5" stop-color="${v2}"/><stop offset="1" stop-color="${v3}"/></linearGradient>
<linearGradient id="su${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${suit}"/><stop offset="1" stop-color="#05060c"/></linearGradient>
<clipPath id="hc${id}"><path d="${helmet}"/></clipPath><clipPath id="vc${id}"><rect x="17" y="23" width="30" height="15" rx="7"/></clipPath></defs>
<rect width="64" height="64" fill="url(#bg${id})"/>
<path d="M-2 14l28-10M40 62l30-14M-4 50l14-5" stroke="#fff" stroke-opacity=".12" stroke-width="3" stroke-linecap="round"/>
<circle cx="32" cy="30" r="25" fill="none" stroke="${hue}" stroke-opacity=".55" stroke-width="1.2"/>
<path d="M4 64c2-9 12-14 28-14s26 5 28 14z" fill="url(#su${id})"/>
<path d="M22 51l10 7 10-7" fill="none" stroke="${acc}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M10 64c1-5 3-8 6-10M54 64c-1-5-3-8-6-10" stroke="${acc}" stroke-width="2" fill="none" opacity=".8"/>
<rect x="24" y="48" width="16" height="5" rx="2" fill="#0a0c14"/>
<path d="${helmet}" fill="${shell}"/>
<g clip-path="url(#hc${id})">${livery[liv]}<rect width="64" height="64" fill="url(#sh${id})"/></g>
<path d="${helmet}" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1"/>
<rect x="15.5" y="21.5" width="33" height="18" rx="8.5" fill="#05060c"/>
<rect x="17" y="23" width="30" height="15" rx="7" fill="url(#vi${id})"/>
<g clip-path="url(#vc${id})" opacity=".55"><path d="M17 35h3v-4h2v-5h3v6h2v-3h3v5h2v-7h3v4h2v-2h3v6h3v5H17z" fill="#05061a"/></g>
<path d="M20 26.5c4-2.4 13-3 20-1" stroke="#fff" stroke-opacity=".85" stroke-width="1.8" fill="none" stroke-linecap="round"/>
<path d="M41 33l3-5" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/>
<path d="M26 44h12l-2 4h-8z" fill="#0b0d14"/><path d="M28 45.5h8M29 47h6" stroke="${acc}" stroke-width=".9"/>
<text x="32" y="19" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-style="italic" font-size="7.5" fill="${numFill}" text-anchor="middle">${num}</text>
<path d="M14 30C15 17 22 9 32 9" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/>
</svg>`;
}

/** stable avatar for a sample rival */
export function avatarForName(name: string) {
  let h = 7;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h % AVATAR_COUNT;
}

/** small hexagonal class plate for an avatar corner (D … AAA) */
export function classCorner(c: RankClass) {
  const col = CLASS_COLOR[c];
  const fs = c.length >= 3 ? 7.2 : c.length === 2 ? 9 : 11;
  return `<svg viewBox="0 0 24 24" class="tierb" aria-label="Class ${c}"><path d="M12 1.5l9.5 5.2v10.6L12 22.5l-9.5-5.2V6.7z" fill="#0b1020" stroke="${col}" stroke-width="2"/><text x="12" y="15.6" text-anchor="middle" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="${fs}" fill="${col}">${c}</text></svg>`;
}
