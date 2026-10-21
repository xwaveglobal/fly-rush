/**
 * Procedural racing-helmet avatars (pure SVG strings, no image files).
 * Each avatar = a race helmet in 3/4 view with a livery (stripes / chevrons / split / flames),
 * an iridescent visor, a racing number and a pit-board background (carbon, checker or speed lines).
 * A new pilot gets a random one; it can be changed or re-rolled in the profile.
 */
import { CLASS_COLOR, type RankClass } from '../meta/Rank.ts';

const SHELLS = ['#f4f6fb', '#14171f', '#e01b33', '#1d4dff', '#ffcf1f', '#7a3dff', '#11b85c', '#ff6a12'];
const ACCENTS = ['#ff2240', '#ffd21f', '#22d1ff', '#ffffff', '#111522', '#ff4fd8', '#3dff8b'];
const VISORS: [string, string][] = [
  ['#39b6ff', '#1a1aff'],
  ['#ff9a3c', '#ff2d6a'],
  ['#ffe066', '#ff7a1a'],
  ['#5dffb0', '#0aa4ff'],
  ['#c084ff', '#ff4fd8'],
  ['#d8f4ff', '#5a7dff'],
];
const BGS = ['carbon', 'checker', 'speed', 'carbon', 'speed', 'checker'] as const;
const LIVERIES = ['stripes', 'chevron', 'split', 'flame', 'band', 'star'] as const;

export const AVATAR_COUNT = 24;

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
};

export function avatarSvg(i: number) {
  const n = ((i % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT;
  const shell = SHELLS[n % SHELLS.length];
  let acc = ACCENTS[(n * 3 + 1) % ACCENTS.length];
  if (acc === shell || Math.abs(lum(acc) - lum(shell)) < 0.18) acc = lum(shell) > 0.5 ? '#111522' : '#ffd21f';
  const [v1, v2] = VISORS[(n * 5 + 2) % VISORS.length];
  const bg = BGS[(n * 7 + 1) % BGS.length];
  const liv = LIVERIES[Math.floor(n / 4) % LIVERIES.length];
  const num = String(((n * 37 + 7) % 98) + 1);
  const numFill = lum(shell) > 0.55 ? '#111522' : '#ffffff';
  const id = `a${n}`;

  const back: Record<(typeof BGS)[number], string> = {
    carbon: `<rect width="64" height="64" fill="#10131b"/><rect width="64" height="64" fill="url(#cb${id})"/>`,
    checker: `<rect width="64" height="64" fill="#0d1018"/><rect width="64" height="64" fill="url(#ck${id})" opacity=".55"/>`,
    speed: `<rect width="64" height="64" fill="url(#sp${id})"/><path d="M-4 18h40M-4 26h28M-4 50h34M30 8h40M40 58h30" stroke="${acc}" stroke-opacity=".35" stroke-width="2" stroke-linecap="round"/>`,
  };
  // helmet shell (3/4 view, chin to the right)
  const shellPath = 'M9 38C8 21 19 8 34 8c13 0 22 9 22 22 0 6-1 11-3 15l-6 9H21c-7-3-11-8-12-16z';
  const livery: Record<(typeof LIVERIES)[number], string> = {
    stripes: `<path d="M26 9c-6 8-9 20-8 41M33 8c-5 9-7 22-5 42" stroke="${acc}" stroke-width="4" fill="none"/>`,
    chevron: `<path d="M12 22l14 10 14-22M10 32l16 11 18-28" stroke="${acc}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>`,
    split: `<path d="M9 38C8 21 19 8 34 8l-8 46h-5c-7-3-11-8-12-16z" fill="${acc}"/>`,
    flame: `<path d="M10 44c4-2 6-6 6-10 3 3 4 6 3 10 3-4 6-10 4-16 5 4 7 11 5 18 2-3 4-6 4-10 3 4 3 9 1 14H21c-5-2-9-4-11-6z" fill="${acc}"/>`,
    band: `<path d="M10 30c12-3 28-5 46-2v6c-18-3-33-1-46 2z" fill="${acc}"/><path d="M10 37c12-3 28-5 45-2" stroke="${shell}" stroke-width="1.2" opacity=".8"/>`,
    star: `<path d="M24 14l2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z" fill="${acc}"/>`,
  };
  return `<svg viewBox="0 0 64 64" class="avsvg" aria-hidden="true"><defs>
<pattern id="cb${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#1d2230"/><rect x="3" y="3" width="3" height="3" fill="#1d2230"/></pattern>
<pattern id="ck${id}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#ffffff"/><rect x="8" y="8" width="8" height="8" fill="#ffffff"/></pattern>
<linearGradient id="sp${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a2348"/><stop offset="1" stop-color="#05070f"/></linearGradient>
<linearGradient id="sh${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient>
<linearGradient id="vi${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${v1}"/><stop offset=".55" stop-color="${v2}"/><stop offset="1" stop-color="#05061a"/></linearGradient>
<clipPath id="cl${id}"><path d="${shellPath}"/></clipPath></defs>
${back[bg]}
<path d="M12 64c1-7 8-11 20-11s20 4 22 11z" fill="#0a0c12"/><path d="M15 64c2-5 8-8 17-8" stroke="${acc}" stroke-width="2.5" fill="none"/>
<path d="${shellPath}" fill="${shell}"/>
<g clip-path="url(#cl${id})">${livery[liv]}<rect width="64" height="64" fill="url(#sh${id})"/></g>
<path d="M22 27c0-3 2-5 6-5h21c4 0 7 3 7 7v6c0 3-2 5-5 5H28c-4 0-6-2-6-5z" fill="#06070d"/>
<path d="M24 28c0-2 2-4 5-4h19c3 0 6 2 6 5v5c0 2-2 4-4 4H29c-3 0-5-2-5-4z" fill="url(#vi${id})"/>
<path d="M28 27h14" stroke="#fff" stroke-opacity=".75" stroke-width="1.6" stroke-linecap="round"/>
<path d="M44 44l9-1-3 6h-9z" fill="#0b0d14"/><path d="M45 45.5h5" stroke="${acc}" stroke-width="1.3"/>
<circle cx="18" cy="35" r="3" fill="#0b0d14"/><circle cx="18" cy="35" r="1.4" fill="${acc}"/>
<text x="15" y="23" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-style="italic" font-size="10" fill="${numFill}" text-anchor="middle" transform="rotate(-12 15 23)">${num}</text>
<path d="M9 38C8 21 19 8 34 8c13 0 22 9 22 22" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.2"/>
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
