import { COUNTRIES, countryName, flagOf } from '../meta/Country.ts';
import './ui.css';
import { ICON } from './icons.ts';
import { AVATAR_COUNT, avatarForName, avatarSvg, classCorner } from './avatars.ts';
import { CLASSES, CLASS_COLOR, CLASS_MIN, EXP_RULES, XPT, classBadge, classFor as classOfBolts, classForScore, playerRank, rankMinutes, type RankClass } from '../meta/Rank.ts';
import logoUrl from '../assets/images/sky-roadster-logo.webp';
import appIcon from '../assets/images/app-icon.webp';
import { amount, calendarGift, coinFace, coinPile, friends, giftBox, megaphone, phonePlus, shareNodes, starBig, tapMarks, wifiRobot } from './art.ts';
import loadingUrl from '../assets/images/loading.jpg';
import thFuture from '../assets/images/tracks/future-city.jpg';
import thTunnel from '../assets/images/tracks/neon-tunnel.jpg';
import thCloud from '../assets/images/tracks/cloud-city.jpg';
import thSpace from '../assets/images/tracks/space-zone.jpg';
import thMega from '../assets/images/tracks/mega-city.jpg';
import thEndless from '../assets/images/tracks/endless.jpg';
import guide1 from '../assets/images/guide/guide-1.jpg';
import guide2 from '../assets/images/guide/guide-2.jpg';
import guide3 from '../assets/images/guide/guide-3.jpg';
import { MISSIONS, missionById, type ActiveMission } from '../gameplay/Missions.ts';
import type { SaveData } from '../core/Save.ts';
import { SKINS, carVisibility } from '../render/Vehicle.ts';
import carZenith from '../assets/images/cars/zenith.webp';
import carVolt from '../assets/images/cars/volt.webp';
import carPhantom from '../assets/images/cars/phantom.webp';
import carInferno from '../assets/images/cars/inferno.webp';
import carNexus from '../assets/images/cars/nexus.webp';
import carShadow from '../assets/images/car/x1-back.webp';
const CAR_IMG: Record<string, string> = { zenith: carZenith, volt: carVolt, phantom: carPhantom, inferno: carInferno, nexus: carNexus };
const RARITY_COLOR: Record<string, string> = { Common: '#4fb3ff', Rare: '#a77bff', Epic: '#ffc24a', Legendary: '#ff4a3c', Mythic: '#d04dff' };
import { LEVELS } from '../config.ts';
import type { Run } from '../gameplay/Run.ts';
import type { PickupKind } from '../gameplay/types.ts';
import type { Board, LbRow } from '../meta/Leaderboard.ts';
import { CHECKIN, CHESTS, ITEM_PRICE, LOCKED_SPECIALS, SPECIALS, UNLOCK_BOOSTS, rewardText, rewardValue, type ItemKey, type Quest, type Reward, type SpecialKey } from '../meta/Daily.ts';
import { fmtLeft, localTime, type EventInst, type Prize } from '../meta/Events.ts';
import { PRODUCTS, type Product } from '../meta/Shop.ts';
import type { EventResult } from '../meta/Meta.ts';
import type { CrashTip } from '../gameplay/CrashTip.ts';
import { LANGS, getLang, setLang, translateTree, type Lang } from './i18n.ts';

/** track thumbnail: remixes reuse their world's art */
const THUMBS: Record<string, string> = {
  endless: thEndless,
  'future-city': thFuture,
  'neon-tunnel': thTunnel,
  'cloud-city': thCloud,
  'space-zone': thSpace,
  'mega-city': thMega,
};

export type UpgradeKey = 'engine' | 'shield' | 'magnet';
export const UPGRADE_MAX = 5;
export const upgradeCost = (lvl: number) => Math.round(150 * Math.pow(lvl + 1, 1.6) / 10) * 10;

/** Show a small "demo rivals" note under sample leaderboards (set false once boards are online). */
export const SAMPLE_BOARD_NOTE = true;

export interface UIHandlers {
  play(): void;
  garage(): void;
  missions(): void;
  home(): void;
  pause(): void;
  resume(): void;
  retry(): void;
  selectSkin(id: string): void;
  buySkin(id: string): void;
  upgrade(k: UpgradeKey): void;
  toggleSound(): void;
  toggleMusic(): void;
  toggleQuality(): void;
  previewSkin(id: string): void;
  /** start a run on a track ('endless' or a course id) */
  startTrack(id: string): void;
  /** v2: tapped a track → choose the one special for this race */
  pickTrack(id: string): void;
  chooseSpecial(k: string): void;
  buySpecial(k: string): void;
  goRace(): void;
  nextTrack(): void;
  setSpeed(level: 'easy' | 'normal' | 'hard'): void;
  /** open the training intro */
  help(): void;
  startTutorial(): void;
  advTrain(world: string): void;
  toggleAssist(): void;
  toggleComfort(): void;
  toggleVibrate(): void;
  skipTutorial(): void;
  // ---- ads
  continueAd(): void;
  continueCoins(): void;
  continueNo(): void;
  adDouble(): void;
  adFreeCoins(): void;
  adBoost(): void;
  // ---- live-ops / meta
  settings(): void;
  closeModal(): void;
  daily(): void;
  events(): void;
  ranks(): void;
  shop(): void;
  guide(): void;
  checkIn(): void;
  claimQuest(id: string): void;
  claimChest(i: number): void;
  claimPass(): void;
  raceCup(): void;
  cupBoard(): void;
  buy(sku: string): void;
  restore(): void;
  setName(name: string): void;
  equip(item: ItemKey): void;
  rankTab(tab: 'week' | 'all'): void;
  claimResults(): void;
  share(): void;
  sos(): void;
  setAvatar(i: number): void;
  setCountry(code: string): void;
  randomAvatar(): void;
  profile(): void;
  viewPlayer(i: number): void;
  boostInfo(k: string): void;
  bag(): void;
  boostTrain(k: string): void;
  toggleAutoClaim(): void;
  claimMission(i: number): void;
  rocket(): void;
  rocketFix(how: string): void;
  popAction(a: string): void;
  freePop(): void;
  perk(k: string): void;
  buyBoost(k: string): void;
  setLang(code: string): void;
  dailyPop(): void;
}

/** Magic Bag: drawstring pouch with a star */
const BAG_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6.5c-1-1.6-.4-3.5 1.2-3.5 1 0 1.6.8 2.8.8s1.8-.8 2.8-.8c1.6 0 2.2 1.9 1.2 3.5z" fill="#ffd23d"/><path d="M8.2 6.6h7.6M7.6 8.6C4.5 11 3.5 14.4 4.3 17.4 5 20.2 7.6 21.5 12 21.5s7-1.3 7.7-4.1c.8-3-.2-6.4-3.3-8.8z" fill="#fff" fill-opacity=".95" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 11.2l1.1 2.3 2.5.3-1.8 1.8.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.8 2.5-.3z" fill="#b04dff"/></svg>`;

/** tutorial (book + ?) and launch (megaphone) icons */
const TUT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M10.2 8.3a2 2 0 1 1 2.6 1.9c-.5.2-.8.6-.8 1.1v.6"/><path d="M12 14.4h.01"/></g></svg>`;
const MEGA_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="2.5" width="11" height="19" rx="2.6" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12 6.2c1.7 1.2 2.4 3 2.2 5.4l-.9.9h-2.6l-.9-.9c-.2-2.4.5-4.2 2.2-5.4z" fill="#fff"/><circle cx="12" cy="9.3" r=".9" fill="#2a7bff"/><path d="M10.6 13.2 12 16.4l1.4-3.2z" fill="#ffc21a"/><path d="M10.4 18.6h3.2" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>`;

/** what a finished / crashed run paid out (result screens) */
export interface RunRewards {
  /** EXP of this run */
  exp: number;
  /** best EXP before / after this run */
  from: number;
  to: number;
  clsBefore: RankClass;
  clsAfter: RankClass;
  weekRank: number;
  cup: { div: RankClass; name: string; rank: number } | null;
  quests: string[];
  missions: { text: string; reward: number }[];
  items: { super: number; near: number };
}

/** what each boost does (info card) */
const BOOST_INFO: Record<ItemKey, { what: string; how: string; when: string }> = {
  super: { what: 'A rocket hop that clears two rows of obstacles at once and rolls 360° at the top.', how: 'Equip it, then tap the purple ROADSTER button on the road (or R / Shift).', when: 'Cars blocking every lane, a wall right behind a wall.' },
  hyper: { what: 'The mythic jump: 7.4 m high, a double roll and a golden trail — clears everything for a long stretch.', how: 'Equip it, then tap the gold HYPER button on the road. Fires before a Roadster Jump if you hold both.', when: 'A full road block with no way through, or to grab a coin trail in the sky.' },
  escape: { what: 'Emergency rocket straight up: you cruise safely above the road, then glide back down.', how: 'Tap the red SOS button (or press E / Enter) at any moment.', when: 'You are about to crash and there is no time to swipe.' },
  shield: { what: 'Start the run inside a shield bubble that absorbs one hit.', how: 'Equip it before a run — it is active from the start until it pops.', when: 'Hard tracks and cups: one free mistake.' },
  turbo: { what: 'Start the run with a Turbo Boost: you blast forward and smash through obstacles for a few seconds.', how: 'Equip it before a run — it fires at the start line.', when: 'Score runs: a fast, safe opening.' },
  magnet: { what: 'Start with the Coin Magnet active: coins from every lane fly to you.', how: 'Equip it before a run — active from the start.', when: 'Coin missions and 3-star coin targets.' },
  double: { what: 'Start with ×2 Coins: every coin counts double while it lasts.', how: 'Equip it before a run — active from the start.', when: 'Saving up for a new car.' },
  life: { what: 'Start the run with one extra life (up to 4 hearts).', how: 'Equip it before a run.', when: 'Long tracks, Endless records and cups.' },
};

/** sample rival profile (deterministic from the name) */
function rivalProfile(name: string, score: number) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) h = Math.imul(h ^ name.charCodeAt(i), 16777619) >>> 0;
  const rnd = (k: number) => ((Math.imul(h ^ (k * 2654435761), 1597334677) >>> 0) % 10000) / 10000;
  const online = rnd(1) < 0.3;
  return {
    runs: Math.round(40 + rnd(2) * 900 + score / 40),
    car: SKINS[Math.floor(rnd(3) * SKINS.length)].name,
    gold: Math.floor(rnd(4) * (score / 9000)),
    silver: Math.floor(rnd(5) * (score / 6000)),
    bronze: Math.floor(rnd(6) * (score / 4000)),
    seen: online ? 'Online now' : rnd(7) < 0.5 ? `Last seen ${1 + Math.floor(rnd(8) * 50)}m ago` : `Last seen ${1 + Math.floor(rnd(9) * 20)}h ago`,
    online,
    streak: 1 + Math.floor(rnd(10) * 30),
  };
}

const ADV_WORLDS: [string, string][] = [['city', 'Future City'], ['cloud', 'Cloud City'], ['tunnel', 'Neon Tunnel'], ['space', 'Space Zone'], ['mega', 'Megacity']];
const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
/** side-view silhouette for the garage cards */
function carSvg(shape: string, body: number, glow: number) {
  const b = hex(body);
  const gl = hex(glow);
  const paths: Record<string, string> = {
    gt: `<path d="M6 33c3-6 14-8 28-10 11-8 36-10 52-4 13 2 22 5 28 11v6H6z" fill="${b}"/><path d="M40 22c10-7 30-8 42-3l-6 5H42z" fill="#0b1020"/>`,
    wedge: `<path d="M4 34l8-5 50-13h24l28 9v11H4z" fill="${b}"/><path d="M50 18l12-3h22l6 7H52z" fill="#0b1020"/><path d="M98 9h20v3h-20zM104 12h3v12h-3z" fill="${b}"/>`,
    muscle: `<path d="M5 36V25l25-2 13-10h37l12 10 22 2v11z" fill="${b}"/><path d="M46 15h32l9 8H40z" fill="#0b1020"/><path d="M104 18h12v3h-12z" fill="${b}"/><path d="M8 24h100" stroke="#fff" stroke-width="2" opacity=".8"/>`,
    bubble: `<ellipse cx="60" cy="29" rx="54" ry="10" fill="${b}"/><ellipse cx="54" cy="21" rx="22" ry="11" fill="#0b1020"/><path d="M84 22l14-12h5l-4 14z" fill="${b}"/>`,
    cyber: `<path d="M4 37v-9l58-19 54 17v11z" fill="${b}"/><path d="M30 20l32-10 22 7z" fill="#0b1020"/>`,
  };
  return `<svg class="csvg" viewBox="0 0 120 48">${paths[shape] ?? paths.gt}<rect x="10" y="38" width="100" height="2" rx="1" fill="${gl}" opacity=".9"/><circle cx="28" cy="38" r="6" fill="#151a26" stroke="${gl}" stroke-width="2"/><circle cx="92" cy="38" r="6" fill="#151a26" stroke="${gl}" stroke-width="2"/></svg>`;
}
/** avatar with the rank-class plate (D … AAA) in the corner */
const avaHtml = (av: number, rc: RankClass, cls = '', extra = '') => `<span class="ava img ${cls}">${avatarSvg(av)}${classCorner(rc)}${extra}</span>`;
/** EXP logo (rank shield) */
const BOLT = XPT;
const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');
const $ = <T extends HTMLElement = HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const ITEM_ICON: Record<ItemKey, string> = { super: ICON.rocket, hyper: ICON.hyper, shield: ICON.shield, escape: ICON.sos, turbo: ICON.bolt, magnet: ICON.magnet, double: ICON.x2, life: ICON.heart };
const ITEM_NAME: Record<ItemKey, string> = { super: 'Roadster Jump', hyper: 'HYPER JUMP', shield: 'Start Shield', escape: 'SOS Escape', turbo: 'Turbo Start', magnet: 'Coin Magnet', double: '×2 Coins', life: 'Extra Life' };
/** what each v2 special does, in one line */
const SPECIAL_LINE: Record<SpecialKey, string> = { escape: 'Rocket straight up when a crash is coming', super: 'Hop over a whole block of obstacles', hyper: 'Fly high over a long stretch' };
/** icons of the teaser specials (unlock at AAA, try them in Bonus) */
const LOCKED_ICON: Record<string, string> = {
  tunnel: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V12a9 9 0 0 1 18 0v8" fill="none" stroke="#7fe6ff" stroke-width="2"/><path d="M7 20v-7a5 5 0 0 1 10 0v7" fill="none" stroke="#7fe6ff" stroke-width="1.4" opacity=".6"/><rect x="8.5" y="1.6" width="7" height="3.4" rx="1.2" fill="#fff"/></svg>`,
  wall: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18M6 3v18" stroke="#9b6bff" stroke-width="2"/><path d="M9 16l6-4-6-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 16l6-4-6-4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/></svg>`,
  ghost: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V11a7 7 0 0 1 14 0v10l-2.4-1.8L14.3 21 12 19.2 9.7 21l-2.3-1.8z" fill="#cfe0ff" fill-opacity=".85"/><circle cx="9.5" cy="11" r="1.3" fill="#1b1450"/><circle cx="14.5" cy="11" r="1.3" fill="#1b1450"/></svg>`,
  rail: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 6h20" stroke="#ffc21a" stroke-width="2.2" stroke-linecap="round"/><path d="M12 6v5" stroke="#fff" stroke-width="1.6"/><rect x="7" y="11" width="10" height="5" rx="2" fill="#fff"/><path d="M3 20l4-3M21 20l-4-3" stroke="#ffc21a" stroke-width="1.4" opacity=".6"/></svg>`,
};

/** 7-day check-in as a list (mock-up): Day label · reward art · amount · ✓ / 🔒; today glows */
function checkinList(slot: number, claimedToday: boolean) {
  const rows = CHECKIN.map((r, i) => {
    const got = i < slot || (claimedToday && i === slot);
    const today = i === slot && !claimedToday;
    const items = Object.entries(r.items ?? {}).filter(([, n]) => n) as [ItemKey, number][];
    // item days get a wide art strip (like the car tiles in the mock-up); coin days an icon + amount
    const body = items.length
      ? `<span class="ckart ${items[0][0]}">${items.map(([k, n]) => `<span class="ckit">${ITEM_ICON[k]}<span class="ckn">${ITEM_NAME[k]}${n > 1 ? ` ×${n}` : ''}</span></span>`).join('')}${r.coins ? `<span class="ckc">${coinFace(18)}<b>x${fmt(r.coins)}</b></span>` : ''}</span>`
      : `<span class="ckcoin">${coinFace(26)}<b>x${fmt(r.coins ?? 0)}</b></span>`;
    return `<div class="ckrow ${got ? 'got' : ''} ${today ? 'today' : ''} ${!got && !today ? 'lock' : ''}"><span class="ckday">Day ${i + 1}</span><span class="ckbody">${body}</span><i class="ckst">${got ? ICON.check : today ? '' : ICON.lock}</i></div>`;
  }).join('');
  return `<div class="cklist">${rows}</div>`;
}

function rewardChips(r: Reward) {
  const out: string[] = [];
  if (r.coins) out.push(`<span class="rchip">${ICON.coin}${fmt(r.coins)}</span>`);
  for (const [k, n] of Object.entries(r.items ?? {})) if (n) out.push(`<span class="rchip ${k}">${ITEM_ICON[k as ItemKey]}×${n}</span>`);
  return out.join('');
}

/**
 * DOM overlay UI. Pure presentation: it renders state handed to it and calls
 * back into the game through UIHandlers. HUD updates are throttled & diffed.
 */
export class UI {
  root: HTMLElement;
  private screens: Record<string, HTMLElement> = {};
  private hudCache: Record<string, string> = {};
  private pops: HTMLElement;
  private garageIndex = 0;
  private fastTapT = -1e9;

  constructor(parent: HTMLElement, private h: UIHandlers) {
    this.root = document.createElement('div');
    this.root.id = 'ui';
    parent.appendChild(this.root);
    this.root.innerHTML = this.template();
    for (const el of Array.from(this.root.querySelectorAll<HTMLElement>('.screen'))) this.screens[el.id] = el;
    this.pops = $(this.root, '#pops');
    // one notice lane under the HUD: section banners + toasts stack instead of covering each other
    this.notices = document.createElement('div');
    this.notices.id = 'notices';
    this.pops.appendChild(this.notices);
    const ban = $(this.root, '#banner');
    this.notices.appendChild(ban);
    this.bind();
    // translations: re-apply to anything newly rendered (HUD numbers are skipped)
    const tmo = new MutationObserver((recs) => {
      if (getLang() === 'en') return;
      for (const rec of recs) {
        const t = rec.target as HTMLElement;
        if (t.closest?.('#hud .row, #hud .row2, #pops')) continue;
        for (const n of Array.from(rec.addedNodes)) translateTree(n);
      }
      this.scheduleFit();
    });
    tmo.observe(this.root, { subtree: true, childList: true });
    // every overlay panel must fit the phone screen without scrolling: shrink-to-fit when needed
    const mo = new MutationObserver(() => this.scheduleFit());
    for (const ov of Array.from(this.root.querySelectorAll<HTMLElement>('.screen.overlay'))) mo.observe(ov, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    window.addEventListener('resize', () => this.scheduleFit());
    // display font (falls back to the system stack offline)
    if (!document.querySelector('link[data-xw-font]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.dataset.xwFont = '1';
      l.href = 'https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,600;0,700;0,800;1,700;1,800;1,900&display=swap';
      document.head.appendChild(l);
    }
  }

  private head(title: string, extra = '') {
    return `<div class="head">
        <button class="icon-btn" data-a="home" aria-label="Back">${ICON.chevL}</button>
        <h2>${title}</h2>
        ${extra || `<button class="wallet" data-a="shop" aria-label="Coins · open shop">${ICON.coin}<b data-k="wallet">0</b><i class="plus" data-a="freepop" role="button" aria-label="Free coins · watch an ad">${ICON.plus}</i></button>`}
      </div>`;
  }

  private template() {
    const logo = `<div class="logo"><img class="xw" src="${logoUrl}" alt="Sky Roadster" draggable="false" /></div>`;
    const loadingBg = `<img class="loadbg" src="${loadingUrl}" alt="" draggable="false" />`;
    return `
    <section id="loading" class="screen show">
      ${loadingBg}
      <div class="load-foot"><div class="bar"><i></i></div><div class="label" data-k="loadtxt">Loading…</div></div>
    </section>

    <section id="tracks" class="screen">
      ${this.head('SELECT TRACK')}
      <div class="track-list" data-k="tracklist"></div>
      <div class="boost-row" data-k="boosts" hidden></div>
      <button class="btn gold adbtn" data-a="adboost" data-k="adboost" hidden>${ICON.play}</button>
    </section>

    <section id="finish" class="screen overlay">
      <div class="panel result">
        <div class="res-top"><button class="icon-btn sm" data-a="home" aria-label="Close">${ICON.close}</button><img class="res-logo" src="${logoUrl}" alt="" /><button class="icon-btn sm" data-a="share" aria-label="Share">${ICON.share}</button></div>
        <div class="finish-title">FINISH! <small class="label" data-k="ftrack">Future City</small></div>
        <div class="scoreline"><div class="stars big" data-k="fstars"></div><div class="final" data-k="ffinal">0</div><div class="newbest" data-k="fnewbest">${ICON.trophy} NEW BEST!</div></div>
        <div class="leftover bonus" data-k="fbonus" hidden>${BAG_ICON}<span>Track bonus</span><small data-k="fbonustxt"></small><b>BAG</b></div>
        <div class="leftover" data-k="fleft" hidden>${ICON.rocket}<span>Unused boosts</span><small data-k="flefttxt"></small><b data-k="fleftpts">+0</b></div>
        <div class="stats mini">
          <div class="stat"><span class="label">Time</span><span class="v">${ICON.flag}<span data-k="ftime">0</span></span></div>
          <div class="stat"><span class="label">Coins</span><span class="v">${ICON.coin}<span data-k="fcoins">0</span></span></div>
          <div class="stat"><span class="label">Lives lost</span><span class="v">${ICON.heart}<span data-k="flost">0</span></span></div>
          <div class="stat"><span class="label">Reward</span><span class="v">${ICON.coin}<span data-k="freward">0</span></span></div>
        </div>
        <div class="star-rules" data-k="frules"></div>
        <div class="rwd" data-k="frwd"></div>
        <button class="btn gold adbtn" data-a="ad2x" data-k="ad2xf">${ICON.play} Watch ad · ×2 reward</button>
        <button class="btn big" data-a="nexttrack" data-k="fnext">${ICON.play} Next track</button>
        <div class="navrow">
          <button class="btn nav blue" data-a="retry">${ICON.retry}<span>Retry</span></button>
          <button class="btn nav purple" data-a="tracks">${ICON.flag}<span>Tracks</span></button>
          <button class="btn nav dark" data-a="home">${ICON.home}<span>Home</span></button>
        </div>
      </div>
    </section>

    <section id="start" class="screen">
      <div class="top-row">
        <button class="profile" data-a="profile" aria-label="Your profile">
          <span data-k="ava"></span>
          <span class="pmeta"><b><span data-k="pname">Pilot</span> <i class="pedit">✎</i></b><small data-k="pline"></small></span>
        </button>
        <div class="tr">
          <button class="wallet" data-a="shop" aria-label="Coins · open shop">${ICON.coin}<b data-k="wallet">0</b><i class="plus" data-a="freepop" role="button" aria-label="Free coins · watch an ad">${ICON.plus}</i></button>
          <button class="icon-btn sm2 langb" data-a="lang" aria-label="Language"><span data-k="langflag">🇬🇧</span></button>
          <button class="icon-btn sm2" data-a="help" aria-label="Tutorial">${TUT_ICON}</button>
          <button class="icon-btn" data-a="settings" aria-label="Settings">${ICON.gear}</button>
        </div>
      </div>
      <div class="brand">${logo}</div>
      <div class="mid">
      <div class="rail left">
        <button class="rbtn" data-a="daily"><span class="ri g-daily">${ICON.calendar}</span><span class="rl">Daily</span><em class="badge" data-k="dailybadge" hidden>1</em></button>
        <button class="rbtn" data-a="events"><span class="ri g-cups">${ICON.cup}</span><span class="rl">Cups</span><em class="tag live">LIVE</em></button>
        <button class="rbtn" data-a="ranks"><span class="ri g-ranks">${ICON.podium}</span><span class="rl">Ranks</span></button>
      </div>
      <div class="rail right">
        <button class="rbtn" data-a="perk" data-v="share" data-k="pk-share"><span class="ri g-share">${ICON.share}</span><span class="rl">Share</span><em class="badge" hidden>!</em></button>
        <button class="rbtn" data-a="perk" data-v="entry" data-k="pk-entry"><span class="ri g-entry">${ICON.gift}</span><span class="rl">Entry</span><em class="badge" hidden>!</em></button>
        <button class="rbtn" data-a="perk" data-v="launch" data-k="pk-launch"><span class="ri g-launch">${MEGA_ICON}</span><span class="rl">Launch</span><em class="badge" hidden>!</em></button>
      </div>
      </div>
      <div class="menu">
        <button class="cupstrip" data-a="events" data-k="cupstrip"></button>
        <div class="speedsel" role="radiogroup" aria-label="Speed">
          ${(['easy', 'normal', 'hard'] as const).map((k, i) => `<button role="radio" data-a="speed" data-v="${k}" title="${LEVELS[k].label}: ${LEVELS[k].desc}"><i class="chev">${'›'.repeat(i + 1)}</i><b>${LEVELS[k].label}</b><small>EXP ×${['1', '1.15', '2'][i]}</small></button>`).join('')}
        </div>
        <div class="speedcap" data-k="speedtip"></div>

        <div class="menu-btns">
          <button class="btn mbtn" data-a="play"><span class="ib">${ICON.play}</span><span class="lb">Play</span></button>
          <div class="minirow">
            <button class="mini garage" data-a="garage">${ICON.car}<span>Garage</span></button>
            <button class="mini shop" data-a="shop">${ICON.bag}<span>Shop</span><em class="msale" data-k="saletag">−80%</em></button>
            <button class="mini missions" data-a="missions">${ICON.target}<span>Missions</span></button>
          </div>
        </div>
      </div>
    </section>

    <section id="settings" class="screen overlay">
      <div class="panel modal">
        <div class="mhead"><h2>SETTINGS</h2><button class="icon-btn sm" data-a="closemodal" aria-label="Close">${ICON.close}</button></div>
        <div class="sgrid">
          <div class="stile"><span class="si">${ICON.sound}</span><span class="sl">Sound</span><button class="switch" data-a="sound" role="switch" aria-label="Sound effects"><i></i></button></div>
          <div class="stile"><span class="si">${ICON.music}</span><span class="sl">Music</span><button class="switch" data-a="music" role="switch" aria-label="Music"><i></i></button></div>
          <div class="stile"><span class="si">≋</span><span class="sl">Vibration</span><button class="switch" data-a="vibrate" role="switch" aria-label="Vibration"><i></i></button></div>
          <div class="stile"><span class="si">${ICON.info}</span><span class="sl">Hint arrows</span><button class="switch" data-a="assist" role="switch" aria-label="Danger arrows"><i></i></button></div>
          <div class="stile"><span class="si">◐</span><span class="sl">Comfort</span><button class="switch" data-a="comfort" role="switch" aria-label="Comfort visuals"><i></i></button></div>
          <div class="stile"><span class="si">${ICON.gear}</span><span class="sl">Graphics</span><div class="seg" data-k="qseg"><button data-a="quality" data-v="high">HI</button><button data-a="quality" data-v="low">LO</button></div></div>
        </div>
        <button class="srow lang" data-a="lang"><span class="si">🌐</span><span class="sl">Language</span><b data-k="langname">English</b>${ICON.chevR}</button>
        <div class="sbtns compact">
          <button class="btn sm ghost" data-a="profile">${ICON.user} Profile</button>
          <button class="btn sm ghost" data-a="help">${ICON.info} How to play</button>
          <button class="btn sm ghost" data-a="guide">${ICON.rocket} Jump guide</button>
          <button class="btn sm ghost" data-a="restore">${ICON.bag} Restore</button>
        </div>
        <div class="label sfoot" data-k="sfoot">Sky Roadster</div>
      </div>
    </section>

    <section id="guide" class="screen overlay">
      <div class="panel modal guide">
        <div class="mhead"><h2>ROADSTER JUMP</h2><button class="icon-btn sm" data-a="closemodal" aria-label="Close">${ICON.close}</button></div>
        <p class="tut-lead">The rocket jump that clears <b>two rows</b> of obstacles and rolls 360° in the sky.</p>
        <div class="gsteps">
          <button class="gstep" data-a="gstep"><img src="${guide1}" alt="" /><b><i>1</i> Spot the purple rocket</b><small>Appears after 250 m, floating in a lane. Swipe into its lane to grab it.</small>
            <div class="gmore"><b>Details</b>The rocket pickup floats at driving height in one lane and turns up every few hundred metres after the first 250 m. Drive or hop into that lane to collect it — a purple flash ring confirms the pickup. You can carry up to 2. You can also start with one: equip <em>Roadster Jump</em> on the track screen (daily check-in day 5, cups and the shop give them).</div><em class="gtap">${ICON.info} tap for details</em></button>
          <button class="gstep" data-a="gstep"><img src="${guide2}" alt="" /><b><i>2</i> The ROADSTER button appears</b><small>A purple ROADSTER button shows bottom-right with how many you hold.</small>
            <div class="gmore"><b>Details</b>While you hold a charge, a round purple <em>ROADSTER</em> button sits above the red SOS button (it turns gold for a HYPER JUMP). A normal swipe UP is always just a small hop — only the button fires the rocket, so you never waste it by accident. Keyboard: <em>R</em> or <em>Shift</em>.</div><em class="gtap">${ICON.info} tap for details</em></button>
          <button class="gstep" data-a="gstep"><img src="${guide3}" alt="" /><b><i>3</i> Tap ROADSTER to launch</b><small>Flies 5.6 m over cars blocking every lane, barrel roll at the top.</small>
            <div class="gmore"><b>Details</b>When a car blockade (a semi truck + cars across all 3 lanes) appears, a toast warns you ~120 m ahead. Tap the button on the road: the car rockets 5.6 m up, clears both rows of cars, rolls 360° and lands safely — you are protected for the whole flight. Pressed in the air? It fires the moment your wheels touch the road. No rocket? Collect one, buy one, or use SOS.</div><em class="gtap">${ICON.info} tap for details</em></button>
        </div>
        <div class="gmyth">${ICON.hyper}<div><b>Mythic HYPER JUMP</b><small>Win it in Cups, Day-7 check-in or the Shop: 7.4 m high, double roll, golden trail. Fires from the same button (gold).</small></div></div>
        <button class="btn big" data-a="tutstart">${ICON.play} Practice it</button>
      </div>
    </section>

    <section id="ranks" class="screen page">
      ${this.head('TOP PILOTS')}
      <div class="tabs" data-k="ranktabs"><button data-a="ranktab" data-v="week">This week</button><button data-a="ranktab" data-v="all">All time</button></div>
      <div class="podium" data-k="podium"></div>
      <div class="lb-list" data-k="lblist"></div>
      <div class="lb-you" data-k="lbyou"></div>
    </section>

    <section id="daily" class="screen page">
      ${this.head('DAILY')}
      <div class="scroll">
        <div class="panel block">
          <div class="bhead"><b>Check-in</b><span class="label" data-k="cistreak">Day 1</span></div>
          <div class="cigrid" data-k="cigrid"></div>
          <button class="btn" data-a="checkin" data-k="cibtn">Claim today</button>
        </div>
        <div class="panel block pass" data-k="passrow"></div>
        <div class="panel block">
          <div class="bhead"><b>Daily quests</b><span class="label">${ICON.clock}<span data-k="dreset">resets in 0h</span></span></div>
          <div class="dpts"><div class="dbar"><i data-k="dbar"></i></div><div class="chests" data-k="chests"></div></div>
          <div class="qlist" data-k="qlist"></div>
        </div>
      </div>
    </section>

    <section id="events" class="screen page">
      ${this.head('CUPS')}
      <div class="scroll">
        <div class="cuphero" data-k="cuphero"></div>
        <div class="panel block cupboard" data-k="cupboard" hidden></div>
        <div class="panel block">
          <div class="bhead"><b>Prizes</b><span class="label">Final rank when the cup ends</span></div>
          <div class="prizes" data-k="prizes"></div>
        </div>
        <div class="bhead out"><b>Divisions</b><button class="linkbtn" data-a="rankguide">${ICON.info} How EXP works</button></div>
        <div class="divgrid" data-k="divisions"></div>
        <div class="bhead out"><b>Upcoming</b><span class="label">daily 12:00 &amp; 22:00 US Eastern · 3 h each</span></div>
        <div class="upcoming" data-k="upcoming"></div>
        <div class="trophies" data-k="trophies"></div>
      </div>
    </section>

    <section id="shop" class="screen page">
      ${this.head('SHOP')}
      <div class="scroll" data-k="shoplist"></div>
    </section>

    <section id="eventres" class="screen overlay">
      <div class="panel modal center">
        <div class="cupbig">${ICON.cup}</div>
        <h2>CUP RESULTS</h2>
        <div data-k="eventres"></div>
        <button class="btn big gold" data-a="claimresults">${ICON.gift} Collect</button>
      </div>
    </section>

    <section id="profile" class="screen overlay">
      <div class="panel modal prof">
        <div class="mhead"><h2 data-k="proftitle">PILOT PROFILE</h2><button class="icon-btn sm" data-a="closeov" data-v="profile" aria-label="Close">${ICON.close}</button></div>
        <div data-k="profbody"></div>
      </div>
    </section>

    <section id="bag" class="screen overlay">
      <div class="panel modal bagm scrolly">
        <div class="mhead"><h2>${BAG_ICON} MAGIC BAG</h2><button class="icon-btn sm" data-a="closeov" data-v="bag" aria-label="Close">${ICON.close}</button></div>
        <div data-k="bagbody"></div>
      </div>
    </section>

    <section id="boostinfo" class="screen overlay">
      <div class="panel modal binfo" data-k="binfo"></div>
    </section>

    <section id="popup" class="screen overlay">
      <div class="panel modal pop3" data-k="popbody"></div>
    </section>

    <section id="specialpick" class="screen overlay">
      <div class="panel modal spick">
        <div class="mhead"><h2>${BAG_ICON} SPECIAL</h2><button class="icon-btn sm" data-a="closeov" data-v="specialpick" aria-label="Close">${ICON.close}</button></div>
        <div data-k="spbody"></div>
      </div>
    </section>

    <section id="rankguide" class="screen overlay">
      <div class="panel modal rguide">
        <div class="mhead"><h2>${XPT} EXP &amp; RANK</h2><button class="icon-btn sm" data-a="closeov" data-v="rankguide" aria-label="Close">${ICON.close}</button></div>
        <div data-k="rgbody"></div>
      </div>
    </section>

    <section id="needrocket" class="screen overlay">
      <div class="panel modal center needr">
        <div class="nr-ic">${ICON.rocket}</div>
        <h2>ROADSTER JUMP NEEDED</h2>
        <p class="tut-lead">Cars block every lane — only a <b>Roadster Jump</b> gets you past. Collect the purple rocket on the road, or get one now.</p>
        <div data-k="nrbtns" class="nrbtns"></div>
      </div>
    </section>

    <section id="hud" class="screen passthrough">
      <div class="row">
        <button class="icon-btn hit" data-a="pause" aria-label="Pause">${ICON.pause}</button>
        <div class="scorebox panel exp"><div class="label">${XPT}EXP</div><div class="val"><span data-h="score">0</span><span class="rankp" data-h="rankp"></span></div></div>
        <div class="side">
          <span class="pill coins">${ICON.coin}<b data-h="coins">0</b></span>
          <span class="pill">${ICON.flag}<b data-h="dist">0 m</b></span>
        </div>
      </div>
      <div class="row2">
        <div class="speed"><div class="label">Speed <span data-h="kmh">0</span> km/h</div><div class="track"><i data-h="speedbar"></i></div></div>
        <div class="hearts" data-h="hearts"></div>
      </div>
      <div class="gatebar" data-h="gatebar" hidden><b>RANK GATE</b><span data-h="gatenext"></span><div class="track"><i data-h="gatefill"></i></div></div>
      <div class="trackbar panel" data-h="trackbar" hidden>
        <div class="t"><span data-h="tsection">START AREA</span><span data-h="tdist">0 / 3,200 m</span></div>
        <div class="track"><i data-h="tbar"></i><b data-h="tmarks"></b></div>
      </div>
      <div class="hudline">
        <div class="powers" data-h="powers"></div>
        <div class="danger" data-k="danger" hidden><div class="dg-arrow" data-k="dgarrow"></div><div class="dg-txt" data-k="dgtxt">SWIPE</div></div>
      </div>
      <button class="rocketbtn hit" data-a="rocket" data-k="rocketbtn" hidden aria-label="Roadster Jump">${ICON.rocket}<span data-k="rocketlbl" data-h="rocketlbl">ROADSTER</span><em data-k="rocketcnt" data-h="rocketcnt">1</em></button>
      <button class="sos hit" data-a="sos" data-k="sosbtn" hidden aria-label="Sky Escape">${ICON.sos}<span>SOS</span><em data-k="soscnt" data-h="soscnt">1</em></button>
      <div class="mission panel"><div class="t"><span data-h="mtext">—</span><span data-h="mprog"></span></div><div class="track"><i data-h="mbar"></i></div></div>
    </section>

    <div id="pops"></div>
    <div id="banner"><div class="w" data-k="bw">WORLD 1</div><div class="n" data-k="bn">FUTURE CITY</div></div>
    <div id="tutorial"><div class="hand">${ICON.hand}</div><div class="txt">SWIPE TO DODGE<small>← → change lane · ↑ fly up · ↓ fly down</small></div></div>
    <div id="flash"></div>

    <section id="tutintro" class="screen overlay">
      <div class="panel tut-panel scrolly">
        <div class="mhead"><h2>${TUT_ICON} TUTORIAL</h2><button class="icon-btn sm" data-a="closeov" data-v="tutintro" aria-label="Close">${ICON.close}</button></div>
        <p class="tut-lead">Everything in one place: learn the moves, practise every special item and meet the obstacles of each world. You can't crash in training.</p>
        <div class="tuthub">
          <div class="th-sec"><div class="th-h"><i>1</i><b>Basics · first flight</b></div>
            <div class="tut-grid">
              <div class="tut-tile"><span class="g g-lr"><i>←</i><i>→</i></span><b>Swipe left / right</b><small>Exactly one lane per swipe</small></div>
              <div class="tut-tile"><span class="g g-up"><i>↑</i></span><b>Swipe up</b><small>One hop over low obstacles</small></div>
              <div class="tut-tile"><span class="g g-down"><i>↓</i></span><b>Swipe down</b><small>Slide under beams</small></div>
              <div class="tut-tile"><span class="g g-coin">${ICON.rocket}</span><b>Roadster Jump</b><small>Tap ROADSTER: clear 2 rows</small></div>
            </div>
            <div class="label tut-keys">Keyboard: arrow keys or W A S D</div>
            <button class="btn" data-a="tutstart">${ICON.play} Start training</button></div>
          <div class="th-sec"><div class="th-h"><i>2</i><b>Special items</b><button class="linkbtn" data-a="guide">${ICON.info} Roadster guide</button></div>
            <div class="th-items">${(['super', 'hyper', 'escape', 'shield'] as ItemKey[]).map((k) => `<button class="th-it ${k}" data-a="boosttrain" data-v="${k}"><span>${ITEM_ICON[k]}</span><b>${ITEM_NAME[k]}</b><small>${ICON.target} Practise</small></button>`).join('')}</div></div>
          <div class="th-sec"><div class="th-h"><i>3</i><b>Advanced · every obstacle of a world</b></div>
            <div class="advgrid">${ADV_WORLDS.map(([id, name]) => `<button class="advw" data-a="advtrain" data-v="${id}"><img src="${THUMBS[id === 'city' ? 'future-city' : id === 'tunnel' ? 'neon-tunnel' : id === 'cloud' ? 'cloud-city' : id === 'space' ? 'space-zone' : 'mega-city']}" alt="" /><span>${name}</span></button>`).join('')}</div></div>
        </div>
        <button class="btn ghost sm" data-a="tutskip">Skip · go racing</button>
      </div>
    </section>

    <section id="tutprompt" class="screen passthrough">
      <div class="tut-card" data-k="tutcard">
        <div class="tut-step" data-k="tutstep">STEP 1 / 4</div>
        <div class="tut-gesture" data-k="tutgesture"><span class="hand">${ICON.hand}</span></div>
        <div class="tut-title" data-k="tuttitle">SWIPE LEFT</div>
        <div class="tut-sub" data-k="tutsub">One swipe moves exactly one lane.</div>
        <div class="tut-key" data-k="tutkey">Keyboard: ←</div>
      </div>
    </section>

    <section id="tutdone" class="screen overlay">
      <div class="panel tut-panel">
        <div class="tut-check">${ICON.check}</div>
        <h2>TRAINING COMPLETE</h2>
        <p class="tut-lead">You're ready. Pick a speed on the home screen, choose a track and race!</p>
        <button class="btn big" data-a="play">${ICON.play} Let's race</button>
        <button class="btn ghost sm" data-a="tutstart">${ICON.retry} Replay training</button>
        <button class="btn sm purple" data-a="help">${ICON.target} Advanced training</button>
      </div>
    </section>

    <section id="continue" class="screen overlay">
      <div class="panel cont-panel">
        <div class="title">CONTINUE?</div>
        <div class="cont-ring"><svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" data-k="contring" cx="60" cy="60" r="52"/></svg><b data-k="contsec">7</b></div>
        <div class="tipbox" data-k="ctip" hidden></div>
        <p class="tut-lead">Keep your score and distance. You respawn right where you crashed.</p>
        <button class="btn big gold" data-a="contad">${ICON.play} Ad · Continue</button>
        <button class="btn blue" data-a="contcoins"><span class="price">${ICON.coin}<b data-k="contcost">300</b></span>&nbsp;Continue</button>
        <button class="btn sm pink" data-a="contshop" data-k="contshop" hidden>${ICON.bag} Get coins</button>
        <button class="btn ghost sm" data-a="contno">No thanks</button>
      </div>
    </section>

    <section id="countdown" class="screen"><div class="n" data-k="count">3</div></section>

    <section id="pause" class="screen overlay">
      <div class="panel">
        <h2>Paused</h2>
        <div class="toggles">
          <button class="toggle" data-a="sound"><span data-ic="sound">${ICON.sound}</span> SFX</button>
          <button class="toggle" data-a="music"><span data-ic="music">${ICON.music}</span> MUSIC</button>
          <button class="toggle" data-a="quality">${ICON.gear} <span data-k="quality">HIGH</span></button>
        </div>
        <button class="btn big" data-a="resume">${ICON.play} Resume</button>
        <div class="navrow">
          <button class="btn nav blue" data-a="retry">${ICON.retry}<span>Retry</span></button>
          <button class="btn nav dark" data-a="home">${ICON.home}<span>Home</span></button>
        </div>
      </div>
    </section>

    <section id="gameover" class="screen overlay">
      <div class="panel result">
        <div class="res-top"><button class="icon-btn sm" data-a="home" aria-label="Close">${ICON.close}</button><img class="res-logo" src="${logoUrl}" alt="" /><button class="icon-btn sm" data-a="share" aria-label="Share">${ICON.share}</button></div>
        <div class="title">GAME OVER</div>
        <div class="scoreline"><div class="final exp" data-k="final">0</div><div class="newbest" data-k="newbest">${ICON.trophy} NEW BEST EXP!</div></div>
        <div class="tipbox" data-k="gtip" hidden></div>
        <div class="stats mini">
          <div class="stat"><span class="label">Best EXP</span><span class="v">${XPT}<span data-k="gbest">0</span></span></div>
          <div class="stat"><span class="label">Distance</span><span class="v">${ICON.flag}<span data-k="gdist">0</span></span></div>
          <div class="stat"><span class="label">Coins</span><span class="v">${ICON.coin}<span data-k="gcoins">0</span></span></div>
          <div class="stat"><span class="label">Near miss</span><span class="v">${ICON.bolt}<span data-k="gnear">0</span></span></div>
        </div>
        <div class="rwd" data-k="grwd"></div>
        <button class="btn gold adbtn" data-a="ad2x" data-k="ad2x">${ICON.play} Watch ad · ×2 coins</button>
        <button class="btn big retry" data-a="retry">${ICON.retry} Retry</button>
        <div class="navrow">
          <button class="btn nav blue" data-a="home">${ICON.home}<span>Home</span></button>
          <button class="btn nav purple" data-a="tracks">${ICON.flag}<span>Tracks</span></button>
          <button class="btn nav dark" data-a="garage">${ICON.car}<span>Garage</span></button>
        </div>
      </div>
    </section>

    <section id="garage" class="screen">
      ${this.head('GARAGE')}
      <div class="lockbadge" data-k="lockbadge" hidden>${ICON.lock}<span data-k="locktxt">LOCKED</span></div>
      <div class="carinfo panel" data-k="carinfo"></div>
      <div class="bottom">
        <div class="carstrip" data-k="carstrip"></div>
        <div class="carsel panel">
          <button class="icon-btn" data-a="prevcar" aria-label="Previous car">${ICON.chevL}</button>
          <div class="name"><b data-k="carname">XWAVE Pearl</b><small class="ccls" data-k="carcls">GT Coupe</small><div class="dots" data-k="cardots"></div></div>
          <button class="icon-btn" data-a="nextcar" aria-label="Next car">${ICON.chevR}</button>
        </div>
        <button class="btn" data-a="carbtn" data-k="carbtn">Selected</button>
        <div class="upgrades panel" data-k="upgrades"></div>
      </div>
    </section>

    <section id="missions" class="screen page">
      ${this.head('MISSIONS')}
      <div class="rank panel"><div class="badge" data-k="rank">1</div><div><div class="label">Pilot rank</div><div class="rt" data-k="ranktitle">Cadet</div><div class="label" data-k="rankprog"></div></div></div>
      <div class="autoclaim panel"><span><b>Auto-collect rewards</b><small data-k="acnote">Rewards go straight to your wallet</small></span><button class="switch" data-a="autoclaim" role="switch" aria-label="Auto-collect mission rewards"><i></i></button></div>
      <div data-k="mpending" class="mpending"></div>
      <div data-k="mlist" class="mlist"></div>
      <button class="btn big" data-a="play" style="margin-top:auto;align-self:center">${ICON.play} Play</button>
    </section>

    <div id="debug"></div>`;
  }

  private bind() {
    this.root.addEventListener('click', (e) => {
      // tap on the dimmed backdrop around a modal with a close button = close it
      const tgt = e.target as HTMLElement;
      if (tgt.classList.contains('overlay') && tgt.classList.contains('screen') && tgt.querySelector(':scope > .modal [data-a="closemodal"]')) {
        tgt.querySelectorAll('.gstep.open').forEach((g) => g.classList.remove('open'));
        return this.h.closeModal();
      }
      const el = tgt.closest<HTMLElement>('[data-a]');
      if (!el || el.hasAttribute('disabled')) return;
      const a = el.dataset.a!;
      switch (a) {
        case 'play': return this.h.play();
        case 'tracks': return this.h.play();
        case 'nexttrack': return this.h.nextTrack();
        case 'speed':
          this.speedTip(el.dataset.v as 'easy' | 'normal' | 'hard');
          return this.h.setSpeed(el.dataset.v as 'easy' | 'normal' | 'hard');
        case 'help': return this.h.help();
        case 'contad': return this.h.continueAd();
        case 'contcoins': return this.h.continueCoins();
        case 'contno': return this.h.continueNo();
        case 'contshop': return this.h.shop();
        case 'ad2x': return this.h.adDouble();
        case 'adfree': return this.h.adFreeCoins();
        case 'adboost': return this.h.adBoost();
        case 'tutstart': return this.h.startTutorial();
        case 'advtrain': return this.h.advTrain(el.dataset.v!);
        case 'assist': return this.h.toggleAssist();
        case 'comfort': return this.h.toggleComfort();
        case 'vibrate': return this.h.toggleVibrate();
        case 'tutskip': return this.h.skipTutorial();
        case 'track': return this.h.pickTrack(el.dataset.id!);
        case 'spick': return this.h.chooseSpecial(el.dataset.v ?? '');
        case 'sbuy': return this.h.buySpecial(el.dataset.v!);
        case 'sgo': return this.h.goRace();
        case 'slocked': return this.toast(`${ICON.lock} Opens at rank AAA · try it now in a Bonus event`, '#b7a6ff');
        case 'soon': return this.toast(`${ICON.lock} New track coming soon — keep climbing the ranks!`, '#b7a6ff');
        case 'rankgate': return this.rankGuide();
        case 'garage': return this.h.garage();
        case 'missions': return this.h.missions();
        case 'home': return this.h.home();
        case 'pause': return this.h.pause();
        case 'resume': return this.h.resume();
        case 'retry': return this.h.retry();
        case 'sound': return this.h.toggleSound();
        case 'music': return this.h.toggleMusic();
        case 'quality':
          if (el.dataset.v && el.classList.contains('on')) return;
          return this.h.toggleQuality();
        case 'settings': return this.h.settings();
        case 'closemodal':
          this.root.querySelectorAll('.gstep.open').forEach((g) => g.classList.remove('open'));
          return this.h.closeModal();
        case 'daily': return this.h.daily();
        case 'events': return this.h.events();
        case 'ranks': return this.h.ranks();
        case 'shop': return this.h.shop();
        case 'guide': return this.h.guide();
        case 'checkin': return this.h.checkIn();
        case 'claimq': return this.h.claimQuest(el.dataset.id!);
        case 'chest': return this.h.claimChest(Number(el.dataset.i));
        case 'claimpass': return this.h.claimPass();
        case 'racecup': return this.h.raceCup();
        case 'cupboard': return this.h.cupBoard();
        case 'buy': return this.h.buy(el.dataset.sku!);
        case 'restore': return this.h.restore();
        case 'savename': return this.h.setName($<HTMLInputElement>(this.root, '[data-k="nameinput"]').value);
        case 'equip': return this.h.equip(el.dataset.v as ItemKey);
        case 'ranktab': return this.h.rankTab(el.dataset.v as 'week' | 'all');
        case 'claimresults': return this.h.claimResults();
        case 'share': return this.h.share();
        case 'sos':
        case 'rocket':
          // already fired on touch-down (see pointerdown below); a click alone (mouse / keyboard) still works
          if (performance.now() - this.fastTapT < 600) return;
          return a === 'sos' ? this.h.sos() : this.h.rocket();
        case 'rocketfix': return this.h.rocketFix(el.dataset.v!);
        case 'avpick': return this.h.setAvatar(Number(el.dataset.i));
        case 'avrand': return this.h.randomAvatar();
        case 'profile': return this.h.profile();
        case 'viewp': return this.h.viewPlayer(Number(el.dataset.i));
        case 'boostinfo': return this.h.boostInfo(el.dataset.v!);
        case 'bag': return this.h.bag();
        case 'boosttrain': return this.h.boostTrain(el.dataset.v!);
        case 'autoclaim': return this.h.toggleAutoClaim();
        case 'claimm': return this.h.claimMission(Number(el.dataset.i));
        case 'mystery':
          this.toast(`${ICON.lock} Hidden world · reach class ${el.dataset.v} to reveal it`, 'var(--purple, #9b6bff)');
          return;
        case 'popa': return this.h.popAction(el.dataset.v!);
        case 'country': return this.countryPicker();
        case 'setcountry':
          this.closePopup();
          return this.h.setCountry(el.dataset.v!);
        case 'popgo': {
          // entry popup shortcuts (after the reward is claimed)
          this.closePopup();
          const v = el.dataset.v!;
          const go: Record<string, () => void> = { daily: () => this.h.daily(), shop: () => this.h.shop(), garage: () => this.h.garage(), help: () => this.h.help(), play: () => this.h.play(), events: () => this.h.events() };
          return go[v]?.();
        }
        case 'freepop': return this.h.freePop();
        case 'perk': return this.h.perk(el.dataset.v!);
        case 'buyboost': return this.h.buyBoost(el.dataset.v!);
        case 'lang': return this.langPicker();
        case 'setlang':
          this.closePopup();
          return this.h.setLang(el.dataset.v!);
        case 'dailypop': return this.h.dailyPop();
        case 'gstep': {
          // one detail open at a time: opening a step closes the others
          const open = !el.classList.contains('open');
          el.parentElement?.querySelectorAll('.gstep.open').forEach((g) => g.classList.remove('open'));
          el.classList.toggle('open', open);
          if (open) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return;
        }
        case 'rankguide':
          this.rankGuide();
          return;
        case 'closeov':
          this.screens[el.dataset.v!]?.classList.remove('show');
          return;
        case 'savepname': return this.h.setName($<HTMLInputElement>(this.root, '[data-k="pnameinput"]').value);
        case 'pickcar':
          this.garageIndex = SKINS.findIndex((x) => x.id === el.dataset.id);
          this.h.previewSkin(el.dataset.id!);
          return;
        case 'prevcar':
          this.garageIndex = (this.garageIndex + SKINS.length - 1) % SKINS.length;
          this.h.previewSkin(SKINS[this.garageIndex].id);
          return;
        case 'nextcar':
          this.garageIndex = (this.garageIndex + 1) % SKINS.length;
          this.h.previewSkin(SKINS[this.garageIndex].id);
          return;
        case 'carbtn': {
          const s = SKINS[this.garageIndex];
          if (el.dataset.mode === 'buy') this.h.buySkin(s.id);
          else if (el.dataset.mode === 'shop') this.h.shop();
          else if (el.dataset.mode === 'rank') this.rankGuide();
          else this.h.selectSkin(s.id);
          return;
        }
        default:
          if (a.startsWith('up-')) this.h.upgrade(a.slice(3) as UpgradeKey);
      }
    });
    // ROADSTER / SOS fire the instant the finger touches the button (no wait for touch-end / click)
    this.root.addEventListener('pointerdown', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-a="rocket"], [data-a="sos"]');
      if (!b || b.hidden) return;
      e.preventDefault();
      this.fastTapT = performance.now();
      b.classList.add('pressed');
      window.setTimeout(() => b.classList.remove('pressed'), 140);
      if (b.dataset.a === 'sos') this.h.sos();
      else this.h.rocket();
    });
    // stop HUD/overlay touches from becoming swipes
    this.root.addEventListener('touchstart', (e) => {
      const t = e.target as HTMLElement;
      if (t.closest('button,input,.scroll,.lb-list,.track-list,.avstrip,.modal')) e.stopPropagation();
    }, { passive: true });
    this.root.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') {
        e.stopPropagation();
        if (e.key === 'Enter') this.h.setName((e.target as HTMLInputElement).value);
      }
    });
  }

  /** shrink short labels that would be clipped (long names, other languages) */
  private fitLabels() {
    const sel = '.head h2, #start .rbtn .rl, .stile .sl, #tracks .boost span b, #tracks .boost span small, .mini span, .speedsel b, .tcard .tinfo b, .ccard b, #start .profile [data-k="pname"]';
    for (const el of Array.from(this.root.querySelectorAll<HTMLElement>(sel))) {
      if (!el.offsetParent) continue;
      el.style.removeProperty('font-size');
      let size = parseFloat(getComputedStyle(el).fontSize);
      let n = 0;
      while (el.scrollWidth > el.clientWidth + 1 && size > 7 && n++ < 20) {
        size -= 0.5;
        el.style.setProperty('font-size', `${size}px`, 'important');
      }
    }
  }

  // --------------------------------------------------------------- fit-to-screen
  private fitQueued = false;
  private scheduleFit() {
    if (this.fitQueued) return;
    this.fitQueued = true;
    requestAnimationFrame(() => {
      this.fitQueued = false;
      this.fitPanels();
    });
  }

  /** scale any open overlay panel down so it never needs scrolling on a phone */
  private fitPanels() {
    this.fitLabels();
    for (const scr of Array.from(this.root.querySelectorAll<HTMLElement>('.screen.overlay.show'))) {
      const panel = scr.querySelector<HTMLElement>(':scope > .panel');
      if (!panel || panel.classList.contains('scrolly')) continue; // long lists scroll instead of shrinking
      const prev = panel.style.getPropertyValue('--fit');
      panel.style.setProperty('--fit', '1');
      if (!panel.classList.contains('fitting')) panel.classList.add('fitting');
      const cs = getComputedStyle(scr);
      const availH = scr.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 8;
      const h = panel.scrollHeight;
      const k = h > availH && availH > 0 ? Math.max(0.6, availH / h) : 1;
      panel.style.setProperty('--fit', k.toFixed(3));
      void prev;
    }
  }

  // --------------------------------------------------------------- screens
  show(...ids: string[]) {
    for (const [id, el] of Object.entries(this.screens)) el.classList.toggle('show', ids.includes(id));
    if (!ids.includes('hud')) this.fitLabels(); // menus: fit now (no frame of clipped text)
    this.scheduleFit();
  }
  isShown(id: string) {
    return this.screens[id]?.classList.contains('show');
  }

  setLoading(k: number) {
    $(this.root, '#loading .bar i').style.width = `${Math.round(k * 100)}%`;
  }

  private setAll(key: string, v: string) {
    this.root.querySelectorAll<HTMLElement>(`[data-k="${key}"]`).forEach((el) => (el.textContent = v));
  }

  /** quality actually in use (may be a session-only LOW fallback) */
  private liveQuality: 'high' | 'low' | null = null;

  refreshProfile(s: SaveData, liveQuality?: 'high' | 'low') {
    if (liveQuality) this.liveQuality = liveQuality;
    this.setAll('wallet', fmt(s.wallet));
    // home top bar: compact amount (11.2K) so the profile chip keeps its room
    this.root.querySelectorAll<HTMLElement>('#start [data-k="wallet"]').forEach((e) => (e.textContent = s.wallet >= 10000 ? `${(s.wallet / 1000).toFixed(s.wallet >= 100000 ? 0 : 1)}K` : fmt(s.wallet)));
    this.setAll('best', fmt(s.best));
    this.setAll('quality', (this.liveQuality ?? s.settings.quality).toUpperCase());
    this.speedTip(s.settings.speed);
    this.root.querySelectorAll<HTMLElement>('[data-a="speed"]').forEach((b) => {
      const on = b.dataset.v === s.settings.speed;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', String(on));
    });
    this.root.querySelectorAll<HTMLElement>('[data-ic="sound"]').forEach((e) => (e.innerHTML = s.settings.sound ? ICON.sound : ICON.soundOff));
    this.root.querySelectorAll<HTMLElement>('[data-ic="music"]').forEach((e) => (e.innerHTML = s.settings.music ? ICON.music : ICON.musicOff));
    this.root.querySelectorAll<HTMLElement>('[data-a="sound"]').forEach((b) => b.classList.toggle('off', !s.settings.sound));
    this.root.querySelectorAll<HTMLElement>('[data-a="music"]').forEach((b) => b.classList.toggle('off', !s.settings.music));
    this.root.querySelectorAll<HTMLElement>('.switch[data-a="sound"]').forEach((b) => b.setAttribute('aria-checked', String(s.settings.sound)));
    this.root.querySelectorAll<HTMLElement>('.switch[data-a="music"]').forEach((b) => b.setAttribute('aria-checked', String(s.settings.music)));
    this.root.querySelectorAll<HTMLElement>('.switch[data-a="comfort"]').forEach((b) => b.setAttribute('aria-checked', String(s.settings.comfort !== false)));
    this.root.querySelectorAll<HTMLElement>('.switch[data-a="vibrate"]').forEach((b) => b.setAttribute('aria-checked', String(s.settings.vibrate !== false)));
    this.root.querySelectorAll<HTMLElement>('.switch[data-a="assist"]').forEach((b) => b.setAttribute('aria-checked', String(s.settings.assist !== false)));
    const q = this.liveQuality ?? s.settings.quality;
    this.root.querySelectorAll<HTMLElement>('.seg [data-a="quality"]').forEach((b) => b.classList.toggle('on', b.dataset.v === q));
  }

  // --------------------------------------------------------------- HUD
  private hset(key: string, v: string, html = false) {
    if (this.hudCache[key] === v) return;
    this.hudCache[key] = v;
    const el = this.root.querySelector<HTMLElement>(`[data-h="${key}"]`);
    if (!el) return;
    if (html) el.innerHTML = v;
    else el.textContent = v;
  }

  /** v2: rank-gate strip under the HUD (null = hidden) */
  gateHud(g: { next: RankClass; k: number } | null) {
    const el = this.root.querySelector<HTMLElement>('[data-h="gatebar"]');
    if (!el) return;
    el.hidden = !g;
    if (!g) return;
    this.hset('gatenext', classBadge(g.next), true);
    this.root.querySelector<HTMLElement>('[data-h="gatefill"]')!.style.width = `${Math.min(100, Math.max(0, g.k * 100)).toFixed(1)}%`;
  }

  resetHud() {
    this.hudCache = {};
  }

  updateHud(run: Run, speed: number, maxSpeed: number, mission: ActiveMission | undefined) {
    // v2: the big number is the run's EXP; the plate next to it is the rank that EXP has reached
    this.hset('score', fmt(run.exp));
    this.hset('rankp', run.expRate > 0 ? classBadge(classOfBolts(run.exp)) : '', true);
    this.hset('coins', fmt(run.coins));
    this.hset('dist', `${fmt(run.distance)} m`);
    this.hset('kmh', fmt(speed * 3.6));
    const sb = this.root.querySelector<HTMLElement>('[data-h="speedbar"]')!;
    const w = `${Math.min(100, (speed / maxSpeed) * 100).toFixed(0)}%`;
    if (sb.style.width !== w) sb.style.width = w;
    let hearts = '';
    for (let i = 0; i < run.maxLives; i++) hearts += i < run.lives ? ICON.heart : ICON.heartEmpty;
    this.hset('hearts', hearts, true);

    const d = run.durations();
    const chips: { kind: PickupKind; left: number; total: number; n?: number }[] = [];
    if (run.shield) chips.push({ kind: 'shield', left: run.shieldT, total: d.shield, n: run.shieldHits });
    if (run.magnetT > 0) chips.push({ kind: 'magnet', left: run.magnetT, total: d.magnet });
    if (run.turboT > 0) chips.push({ kind: 'turbo', left: run.turboT, total: d.turbo });
    if (run.doubleT > 0) chips.push({ kind: 'double', left: run.doubleT, total: d.double });
    // Roadster / HYPER charges show on their own button (bottom-right)
    if (run.dashes > 0) chips.push({ kind: 'dash', left: 1, total: 1 });
    const rb = $(this.root, '[data-k="rocketbtn"]');
    const rockets = run.hyperJumps + run.superJumps;
    if (rb.hidden !== rockets <= 0) rb.hidden = rockets <= 0;
    rb.classList.toggle('hyper', run.hyperJumps > 0);
    this.hset('rocketlbl', this.rocketReady || rb.classList.contains('call') ? 'TAP!' : run.hyperJumps > 0 ? 'HYPER' : 'ROADSTER');
    this.hset('rocketcnt', String(rockets));
    const sos = $(this.root, '[data-k="sosbtn"]');
    if (sos.hidden !== run.escapes <= 0) sos.hidden = run.escapes <= 0;
    this.hset('soscnt', String(run.escapes));
    const colors: Record<string, string> = { shield: '#3d9bff', magnet: '#ff3b4e', turbo: '#b6ff2e', double: '#ffc21a', super: '#9b6bff', hyper: '#ffc21a', dash: '#2ee6c8' };
    const icons: Record<string, string> = { shield: ICON.shield, magnet: ICON.magnet, turbo: BOLT, double: ICON.x2, super: ICON.rocket, hyper: ICON.hyper, dash: ICON.dash };
    const html = chips
      .map((c) => {
        const k = Math.max(0, c.left / c.total);
        const circ = 2 * Math.PI * 20;
        const q = Math.round(k * 40) / 40; // quantise to limit DOM churn
        return `<div class="pchip ${c.left < 2 ? 'expiring' : ''}" style="box-shadow:0 0 8px ${colors[c.kind]}40">
          <svg class="ring" viewBox="0 0 46 46"><circle class="bg" cx="23" cy="23" r="20"/><circle cx="23" cy="23" r="20" stroke="${colors[c.kind]}" stroke-dasharray="${circ}" stroke-dashoffset="${(circ * (1 - q)).toFixed(1)}" stroke-linecap="round"/></svg>
          ${icons[c.kind].replace('<svg', '<svg class="icon"')}${c.kind === 'super' && run.superJumps > 1 ? `<em class="cnt">×${run.superJumps}</em>` : ''}${c.kind === 'dash' ? `<em class="cnt dash">×${run.dashes}</em>` : ''}${c.kind === 'shield' && c.n ? `<em class="cnt shieldn">×${c.n}</em>` : ''}</div>`;
      })
      .join('');
    this.hset('powers', html, true);

    if (mission) {
      const def = missionById(mission.id)!;
      this.hset('mtext', def.text);
      this.hset('mprog', `${fmt(mission.progress)}/${fmt(def.target)}`);
      const mb = this.root.querySelector<HTMLElement>('[data-h="mbar"]')!;
      const mw = `${Math.min(100, (mission.progress / def.target) * 100).toFixed(0)}%`;
      if (mb.style.width !== mw) mb.style.width = mw;
    }
  }

  /** in-run score pops share ONE spot: a new pop replaces the previous one (no stacked, overlapping text) */
  pop(text: string, color = '#ffffff', sub = '', offsetY = 0) {
    void offsetY;
    this.pops.querySelectorAll('.pop').forEach((p) => p.remove());
    const el = document.createElement('div');
    el.className = 'pop';
    el.style.color = color;
    el.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
    this.pops.appendChild(el);
    window.setTimeout(() => el.remove(), 1100);
  }

  /**
   * Collect effect: an icon flies smoothly on a curve from where it was picked up on the road
   * into its HUD counter (coins → coin pill, stars → star pill, items → their chip / button),
   * which then gives a small bump. Throttled so a coin trail never floods the DOM.
   */
  private flyLast: Record<string, number> = {};
  private flyLive = 0;
  flyTo(x: number, y: number, icon: string, target: 'coins' | 'bolts' | 'powers' | 'rocket' | 'sos' | 'hearts', gapMs = 0) {
    const now = performance.now();
    if (gapMs && now - (this.flyLast[target] ?? 0) < gapMs) return;
    if (this.flyLive > 14) return;
    this.flyLast[target] = now;
    const sel: Record<string, string> = { coins: '#hud .pill.coins', bolts: '#hud .pill.bolts', powers: '#hud [data-h="powers"]', rocket: '#hud [data-k="rocketbtn"]', sos: '#hud [data-k="sosbtn"]', hearts: '#hud [data-h="hearts"]' };
    let tEl = this.root.querySelector<HTMLElement>(sel[target]);
    if (!tEl || !tEl.offsetParent) tEl = this.root.querySelector<HTMLElement>(sel.powers);
    if (!tEl) return;
    const root = this.root.getBoundingClientRect();
    const tr = tEl.getBoundingClientRect();
    const tx = (target === 'powers' ? tr.left + 24 : tr.left + Math.min(22, tr.width / 2)) - root.left;
    const ty = tr.top + tr.height / 2 - root.top;
    const el = document.createElement('div');
    el.className = `flyer ${target}`;
    el.innerHTML = icon;
    el.style.left = '0px';
    el.style.top = '0px';
    this.pops.appendChild(el);
    this.flyLive++;
    // quadratic curve: lift up first, then sweep into the counter
    const cx = (x + tx) / 2 + (tx > x ? -40 : 40);
    const cy = Math.min(y, ty) - 70;
    const frames: Keyframe[] = [];
    const N = 8;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cx + t * t * tx;
      const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cy + t * t * ty;
      const sc = target === 'coins' ? 1.1 - 0.5 * t : 1.6 - 1.05 * t;
      frames.push({ transform: `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(2)})`, opacity: t > 0.92 ? 0.6 : 1 });
    }
    const dur = target === 'coins' ? 520 : 760;
    const anim = el.animate(frames, { duration: dur, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
    anim.onfinish = () => {
      el.remove();
      this.flyLive--;
      tEl!.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.16)' }, { transform: 'scale(1)' }], { duration: 220, easing: 'ease-out' });
    };
  }

  /** special item picked up: big title + icon zooms out toward the player and fades (≈1 s, no flash) */
  bigPickup(label: string, color: string, icon: string, sub = '') {
    this.pops.querySelectorAll('.pop, .bigpick').forEach((p) => p.remove()); // one big title at a time
    const el = document.createElement('div');
    el.className = 'bigpick';
    el.style.setProperty('--pc', color);
    el.innerHTML = `<span class="bp-ic">${icon}</span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}`;
    this.pops.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    window.setTimeout(() => el.remove(), 4000); // safety
  }

  /**
   * Toasts and section banners share one lane just below the HUD (score / track bar / power chips):
   * they stack top-down instead of covering each other, long text wraps, at most 2 toasts at once (the road stays visible).
   */
  private notices!: HTMLElement;
  private placeNotices() {
    // the slot sits right under the score row / track bar, above the road (never mid-screen)
    const root = this.root.getBoundingClientRect();
    let bottom = 0;
    for (const sel of ['#hud .row', '#hud .row2', '#hud [data-h="trackbar"]']) {
      const el = this.root.querySelector<HTMLElement>(sel);
      if (!el || el.hidden || !el.offsetParent) continue;
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom - root.top);
    }
    this.notices.style.top = bottom > 0 ? `${Math.round(bottom + 6)}px` : '';
  }

  /**
   * ONE notice box at a time: section banners and toasts queue up and take turns in the same slot,
   * so the road is never covered by a stack of boxes. A full queue drops the oldest waiting notice.
   */
  private noticeQ: ({ kind: 'toast'; html: string; color: string } | { kind: 'banner'; w: string; n: string })[] = [];
  private noticeTimer = 0;
  private noticeCur = '';
  private pumpNotice() {
    if (this.noticeTimer || !this.noticeQ.length) return;
    const n = this.noticeQ.shift()!;
    this.placeNotices();
    this.notices.querySelectorAll('.toast').forEach((e) => e.remove());
    const ban = $(this.root, '#banner');
    ban.classList.remove('show');
    let ms: number;
    if (n.kind === 'banner') {
      this.noticeCur = `b:${n.w}|${n.n}`;
      this.setAll('bw', n.w);
      this.setAll('bn', n.n);
      void ban.offsetWidth;
      ban.classList.add('show');
      ms = 1900;
    } else {
      this.noticeCur = `t:${n.html}`;
      const el = document.createElement('div');
      el.className = 'toast panel';
      el.style.borderColor = n.color;
      el.innerHTML = n.html;
      ms = Math.min(3800, 2200 + Math.max(0, el.textContent!.length - 40) * 25);
      if (this.noticeQ.length) ms = Math.min(ms, 1800); // others are waiting: keep it moving
      el.style.animationDuration = `${ms}ms`;
      this.notices.appendChild(el);
    }
    this.noticeTimer = window.setTimeout(() => {
      this.noticeTimer = 0;
      this.noticeCur = '';
      this.notices.querySelectorAll('.toast').forEach((e) => e.remove());
      ban.classList.remove('show');
      this.pumpNotice();
    }, ms);
  }
  private pushNotice(n: (typeof this.noticeQ)[number]) {
    const key = n.kind === 'banner' ? `b:${n.w}|${n.n}` : `t:${n.html}`;
    if (key === this.noticeCur || this.noticeQ.some((q) => (q.kind === 'banner' ? `b:${q.w}|${q.n}` : `t:${q.html}`) === key)) return;
    this.noticeQ.push(n);
    while (this.noticeQ.length > 2) this.noticeQ.shift();
    this.pumpNotice();
  }

  toast(html: string, color = 'var(--cyan)') {
    this.pushNotice({ kind: 'toast', html, color });
  }

  banner(world: string, name: string) {
    this.pushNotice({ kind: 'banner', w: world, n: name });
  }

  /** comfort: softer full-screen flashes */
  setComfort(on: boolean) {
    $(this.root, '#flash').classList.toggle('soft', on);
  }

  /** full-screen flashes are disabled (eye comfort): kept as a no-op for call sites */
  flash(_red = false) {
    return;
  }


  countdown(v: string) {
    const n = $(this.root, '#countdown .n');
    n.textContent = v;
    n.classList.toggle('go', v === 'GO!');
    n.style.animation = 'none';
    void n.offsetWidth;
    n.style.animation = '';
  }

  tutorial(on: boolean) {
    $(this.root, '#tutorial').classList.toggle('show', on);
  }

  gameOver(o: { score: number; best: number; isBest: boolean; dist: number; length?: number; coins: number; near: number; missions: { text: string; reward: number }[]; rewards: RunRewards | null; speedBonus: number; level: string; tip: CrashTip | null }) {
    this.tipHtml($(this.root, '[data-k="gtip"]'), o.tip);
    this.setAll('final', fmt(o.score));
    this.setAll('gbest', fmt(o.best));
    this.setAll('gdist', o.length ? `${fmt((o.dist / o.length) * 100)}%` : `${fmt(o.dist)} m`);
    this.setAll('gcoins', fmt(o.coins));
    this.setAll('gnear', fmt(o.near));
    $(this.root, '[data-k="newbest"]').classList.toggle('show', o.isBest);
    $(this.root, '[data-k="grwd"]').innerHTML = this.rewardsHtml(o.rewards, [{ label: 'run', coins: o.coins }, { label: `${o.level} bonus`, coins: o.speedBonus }]);
  }

  // --------------------------------------------------------------- garage
  garageSync(s: SaveData, previewId?: string) {
    if (previewId) this.garageIndex = SKINS.findIndex((x) => x.id === previewId);
    if (this.garageIndex < 0) this.garageIndex = 0;
    const skin = SKINS[this.garageIndex];
    this.setAll('carname', skin.name);
    this.setAll('carcls', skin.cls);
    const myClass = playerRank(s.expBest, s.exp2Best);
    const vis = carVisibility(s.unlocked, skin.id);
    const rankOk = (k: (typeof SKINS)[number]) => CLASSES.indexOf(myClass) >= CLASSES.indexOf((k.need ?? 'D') as RankClass);
    $(this.root, '[data-k="lockbadge"]').hidden = vis === 'own';
    this.setAll('locktxt', vis === 'dark' ? `RANK ${skin.need} NEEDED` : 'LOCKED');
    const strip = $(this.root, '[data-k="carstrip"]');
    strip.innerHTML = SKINS.map((k, i) => {
      const v = carVisibility(s.unlocked, k.id);
      const img = v === 'dark' ? `<img class="cimg shadow" src="${carShadow}" alt="" />` : CAR_IMG[k.id] ? `<img class="cimg" src="${CAR_IMG[k.id]}" alt="" />` : carSvg(k.shape, k.body, k.glow);
      const label = v === 'own' ? (s.vehicle === k.id ? 'In use' : 'Owned') : v === 'next' ? (rankOk(k) ? `${ICON.coin}${fmt(k.price)}` : `${ICON.lock} Rank ${k.need}`) : `Rank ${k.need}`;
      return `<button class="ccard ${v === 'own' ? '' : 'locked'} ${v} ${i === this.garageIndex ? 'on' : ''} ${s.vehicle === k.id ? 'cur' : ''}" data-a="pickcar" data-id="${k.id}" style="--rc:${RARITY_COLOR[k.rarity ?? 'Common']}">
        ${img}${v === 'dark' ? '<i class="q">?</i>' : ''}<b>${v === 'dark' ? '???' : k.name.replace('XWAVE ', '')}</b><small>${label}</small>${v === 'own' ? '' : `<i class="lk">${ICON.lock}</i>`}</button>`;
    }).join('');
    // details: rarity, tagline, stats, score bonus, signature skills (hidden for dark cars)
    const st = skin.stats ?? [7, 7, 7, 7];
    const bars = ['Speed', 'Acceleration', 'Handling', 'Energy'].map((n, i) => `<div class="cst"><span>${n}</span><i><b style="width:${st[i] * 10}%"></b></i><em>${vis === 'dark' ? '?' : st[i]}</em></div>`).join('');
    $(this.root, '[data-k="carinfo"]').innerHTML = vis === 'dark'
      ? `<div class="crare" style="--rc:${RARITY_COLOR[skin.rarity ?? 'Common']}"><b class="cname">???</b>${skin.rarity ?? ''}</div><p class="cdark">${ICON.lock} Reach rank ${classBadge(skin.need as RankClass)} to reveal and unlock this car. Drive farther in one run to earn EXP.</p>`
      : `<div class="crare" style="--rc:${RARITY_COLOR[skin.rarity ?? 'Common']}"><b class="cname">${skin.name}</b>${skin.rarity ?? ''}<small>${esc(skin.cls.split('·')[1]?.trim() ?? '')}</small></div>
         <div class="cbonus">${ICON.lock} Unlocks at rank ${classBadge(skin.need as RankClass)}</div>
         <p class="cfair">Every car drives the same — EXP stays fair. Cars show off your rank.</p>`;
    void bars;
    const on = strip.querySelector<HTMLElement>('.ccard.on');
    if (on) strip.scrollLeft = on.offsetLeft - strip.clientWidth / 2 + on.clientWidth / 2;
    $(this.root, '[data-k="cardots"]').innerHTML = SKINS.map((_, i) => `<i class="${i === this.garageIndex ? 'on' : ''}"></i>`).join('');
    const btn = $(this.root, '[data-k="carbtn"]');
    const owned = s.unlocked.includes(skin.id);
    if (!owned) {
      btn.dataset.mode = 'rank';
      btn.className = 'btn purple';
      btn.innerHTML = `${ICON.lock} Reach rank ${skin.need}`;
      btn.removeAttribute('disabled');
    } else if (!owned) {
      btn.dataset.mode = 'buy';
      btn.className = 'btn gold';
      btn.innerHTML = `${ICON.lock} Unlock <span class="price">${ICON.coin}${fmt(skin.price)}</span>`;
      btn.removeAttribute('disabled');
      if (s.wallet < skin.price) {
        btn.dataset.mode = 'shop';
        btn.className = 'btn pink';
        btn.innerHTML = `${ICON.lock} Need ${ICON.coin}${fmt(skin.price - s.wallet)} more · Get coins`;
      }
    } else if (s.vehicle === skin.id) {
      btn.dataset.mode = 'sel';
      btn.className = 'btn ghost';
      btn.innerHTML = `${ICON.check} Selected`;
      btn.removeAttribute('disabled');
    } else {
      btn.dataset.mode = 'sel';
      btn.className = 'btn';
      btn.innerHTML = `Select`;
      btn.removeAttribute('disabled');
    }
    const rows: { k: UpgradeKey; name: string; desc: string; icon: string }[] = [
      { k: 'engine', name: 'Engine', desc: 'Longer Turbo Boost', icon: ICON.engine },
      { k: 'shield', name: 'Shield', desc: 'Longer shield bubble', icon: ICON.shield },
      { k: 'magnet', name: 'Magnet', desc: 'Bigger radius & duration', icon: ICON.magnet },
    ];
    $(this.root, '[data-k="upgrades"]').innerHTML =
      `<div class="label">Upgrades</div>` +
      rows
        .map((r) => {
          const lvl = s.upgrades[r.k];
          const max = lvl >= UPGRADE_MAX;
          const cost = upgradeCost(lvl);
          const pips = Array.from({ length: UPGRADE_MAX }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
          return `<div class="upg"><div class="ic">${r.icon}</div><div><div class="nm">${r.name}<small>${r.desc}</small></div><div class="pips">${pips}</div></div>
            <button class="btn sm ${max ? 'ghost' : 'blue'}" data-a="up-${r.k}" ${max || s.wallet < cost ? 'disabled' : ''}>${max ? 'MAX' : `<span class="price">${ICON.coin}${fmt(cost)}</span>`}</button></div>`;
        })
        .join('');
    this.setAll('wallet', fmt(s.wallet));
  }

  // --------------------------------------------------------------- missions
  missionsSync(s: SaveData, active: ActiveMission[]) {
    const rankTitles = ['Cadet', 'Pilot', 'Sky Racer', 'Ace', 'Wave Rider', 'Sky Legend', 'XWAVE Elite'];
    const rank = 1 + Math.floor(s.missions.completed / 3);
    this.setAll('rank', String(rank));
    this.setAll('ranktitle', rankTitles[Math.min(rankTitles.length - 1, rank - 1)]);
    this.setAll('rankprog', `${s.missions.completed} missions complete · next rank in ${3 - (s.missions.completed % 3)}`);
    const auto = s.settings.autoClaim !== false;
    this.root.querySelectorAll<HTMLElement>('.switch[data-a="autoclaim"]').forEach((b) => b.setAttribute('aria-checked', String(auto)));
    this.setAll('acnote', auto ? 'On · rewards go straight to your wallet' : 'Off · collect each reward yourself');
    const pend = s.pendingMissions;
    $(this.root, '[data-k="mpending"]').innerHTML = pend.length
      ? `<div class="bhead"><b>Ready to collect</b>${pend.length > 1 ? `<button class="btn sm gold" data-a="claimm" data-i="-1">${ICON.gift} Collect all</button>` : ''}</div>` +
        pend.map((m, i) => `<div class="mrow pend"><i class="ok">${ICON.check}</i><span>${esc(m.text)}</span><button class="btn sm green" data-a="claimm" data-i="${i}">+${fmt(m.reward)} ${ICON.coin}</button></div>`).join('')
      : '';
    $(this.root, '[data-k="mlist"]').innerHTML = active
      .map((a) => {
        const def = missionById(a.id) ?? MISSIONS[0];
        const k = Math.min(1, a.progress / def.target);
        return `<div class="mcard panel"><div class="t"><span>${def.text}</span><span class="price">${ICON.coin}${def.reward}</span></div>
          <div class="track"><i style="width:${(k * 100).toFixed(0)}%"></i></div>
          <div class="meta"><span>${def.cumulative ? 'Across runs' : 'In one run'}</span><span>${fmt(a.progress)} / ${fmt(def.target)}</span></div></div>`;
      })
      .join('');
    this.setAll('wallet', fmt(s.wallet));
  }

  // --------------------------------------------------------------- tracks
  private starsHtml(n: number, of = 3) {
    return Array.from({ length: of }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');
  }

  lastSave: SaveData | null = null;
  /**
   * v2 track list: Endless (the rank road), Track 2 (unlocks at AAA, ranks S / SS / SSS) and three
   * "coming soon" teasers. The old 20 courses are retired.
   */
  tracksSync(s: SaveData, liveTrack?: string) {
    void liveTrack;
    this.lastSave = s;
    const rank = playerRank(s.expBest, s.exp2Best);
    const aaa = CLASSES.indexOf(rank) >= CLASSES.indexOf('AAA');
    const lv = s.settings.speed;
    const endless = `<button class="tcard endless v2 ${s.track !== 'track2' ? 'sel' : ''}" data-a="track" data-id="endless">
        <img src="${THUMBS.endless}" alt="" draggable="false" />
        <div class="tinfo"><b>Endless</b><span class="label">The rank road · D → AAA · ${LEVELS[lv].label}</span>
        <span class="tmeta">${XPT}<span>${fmt(s.expBest)}</span>${classBadge(CLASSES[Math.min(5, CLASSES.indexOf(classOfBolts(s.expBest)))])}</span></div>
        <span class="tbadge">1</span></button>`;
    const t2 = aaa
      ? `<button class="tcard t2 ${s.track === 'track2' ? 'sel' : ''}" data-a="track" data-id="track2">
        <img src="${THUMBS['mega-city']}" alt="" draggable="false" />
        <div class="tinfo"><b>Mega Rush</b><span class="label">Harder from the start · EXP ×1.25 · ranks S · SS · SSS</span>
        <span class="tmeta">${XPT}<span>${fmt(s.exp2Best)}</span>${classBadge('S')}${classBadge('SS')}${classBadge('SSS')}</span></div>
        <span class="tbadge">2</span></button>`
      : `<button class="tcard t2 tlocked dark" data-a="rankguide">
        <img src="${THUMBS['mega-city']}" alt="" draggable="false" />
        <div class="tinfo"><b>Mega Rush</b><span class="label">Harder road · new ranks S · SS · SSS</span>
        <span class="tmeta">${ICON.lock}<span>Reach rank</span>${classBadge('AAA')}</span></div>
        <span class="tbadge">${ICON.lock}</span></button>`;
    const soon = ['Ocean Drive', 'Volcano Run', 'Aurora Peak']
      .map((n, i) => `<button class="tcard mystery" data-a="soon"><div class="mq">?</div>
        <div class="tinfo"><b>${n}</b><span class="tmeta">${ICON.lock}<span>Coming soon</span></span></div>
        <span class="tbadge">${i + 3}</span></button>`)
      .join('');
    $(this.root, '[data-k="tracklist"]').innerHTML = endless + t2 + soon;
    this.scheduleFit();
    this.setAll('wallet', fmt(s.wallet));
  }

  /** HUD progress bar for track mode (null hides it). */
  trackHud(o: { section: string; dist: number; length: number; marks: number[] } | null) {
    const el = this.root.querySelector<HTMLElement>('[data-h="trackbar"]')!;
    el.hidden = !o;
    if (!o) return;
    this.hset('tsection', o.section.toUpperCase());
    this.hset('tdist', `${fmt(Math.min(o.dist, o.length))} / ${fmt(o.length)} m`);
    const w = `${Math.min(100, (o.dist / o.length) * 100).toFixed(1)}%`;
    const bar = this.root.querySelector<HTMLElement>('[data-h="tbar"]')!;
    if (bar.style.width !== w) bar.style.width = w;
    this.hset('tmarks', o.marks.map((m) => `<s style="left:${((m / o.length) * 100).toFixed(2)}%"></s>`).join(''), true);
  }

  finish(o: { track: string; stars: number; score: number; isBest: boolean; time: number; coins: number; coinTarget: number; lost: number; reward: number; hasNext: boolean; rewards: RunRewards | null; speedBonus: number; level: string; leftover?: { pts: number; items: string } | null; bonusItems?: string[] }) {
    this.setAll('ftrack', o.track);
    $(this.root, '[data-k="fstars"]').innerHTML = this.starsHtml(o.stars);
    this.setAll('ffinal', fmt(o.score));
    $(this.root, '[data-k="fnewbest"]').classList.toggle('show', o.isBest);
    const m = Math.floor(o.time / 60);
    this.setAll('ftime', `${m}:${(o.time % 60).toFixed(1).padStart(4, '0')}`);
    this.setAll('fcoins', `${fmt(o.coins)}`);
    this.setAll('flost', `${o.lost}`);
    this.setAll('freward', `+${fmt(o.reward)}`);
    const tb = $(this.root, '[data-k="fbonus"]');
    tb.hidden = !o.bonusItems?.length;
    if (o.bonusItems?.length) this.setAll('fbonustxt', o.bonusItems.join(' · '));
    const lo = $(this.root, '[data-k="fleft"]');
    lo.hidden = !o.leftover;
    if (o.leftover) {
      this.setAll('fleftpts', `+${fmt(o.leftover.pts)}`);
      this.setAll('flefttxt', o.leftover.items);
    }
    const rule = (ok: boolean, t: string) => `<span class="srule ${ok ? 'got' : ''}"><i>${ok ? '★' : '☆'}</i>${t}</span>`;
    $(this.root, '[data-k="frules"]').innerHTML =
      rule(true, 'Finish') + rule(o.lost === 0, 'No lives lost') + rule(o.coins >= o.coinTarget, `${o.coinTarget} coins`);
    $(this.root, '[data-k="fnext"]').hidden = !o.hasNext;
    $(this.root, '[data-k="frwd"]').innerHTML = this.rewardsHtml(o.rewards, [
      { label: 'run', coins: o.coins },
      { label: `${o.level} bonus`, coins: o.speedBonus },
      { label: 'track', coins: o.reward },
    ]);
  }

  /** Show the guided-gesture card for a training step (null hides it). */
  tutPrompt(step: { index: number; total: number; need: string; title: string; sub: string } | null) {
    const scr = this.screens.tutprompt;
    if (!step) {
      scr.classList.remove('show');
      $(this.root, '[data-k="rocketbtn"]').classList.remove('call');
      return;
    }
    const keys: Record<string, string> = { left: '←', right: '→', up: '↑', down: '↓', sos: 'E / Enter · or tap SOS', rocket: 'R / Shift · or tap the ROADSTER button' };
    this.setAll('tutstep', `STEP ${step.index + 1} / ${step.total}`);
    this.setAll('tuttitle', step.title);
    this.setAll('tutsub', step.sub);
    this.setAll('tutkey', `Keyboard: ${keys[step.need]}`);
    $(this.root, '[data-k="rocketbtn"]').classList.toggle('call', step.need === 'rocket');
    $(this.root, '[data-k="tutgesture"]').className = `tut-gesture dir-${step.need}`;
    scr.classList.add('show');
  }

  tutWrong() {
    const c = $(this.root, '[data-k="tutcard"]');
    c.classList.remove('shake');
    void c.offsetWidth;
    c.classList.add('shake');
  }

  // --------------------------------------------------------------- ads
  /** "what to do next time" box after a crash */
  private tipHtml(el: HTMLElement, t: CrashTip | null) {
    el.hidden = !t;
    if (!t) return;
    const rot: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };
    const ic = t.move === 'sos' ? ICON.sos : `<svg viewBox="0 0 24 24" style="transform:rotate(${rot[t.move]}deg)"><path d="M5 12h12M12 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    el.innerHTML = `<span class="tip-ic">${ic}</span><span class="tip-t"><b>How to avoid the ${esc(t.what)}</b>${esc(t.text)}</span>`;
  }

  continueOffer(o: { adOk: boolean; cost: number; canAfford: boolean; tip?: CrashTip | null }) {
    this.tipHtml($(this.root, '[data-k="ctip"]'), o.tip ?? null);
    $(this.root, '[data-a="contad"]').hidden = !o.adOk;
    this.setAll('contcost', String(o.cost));
    $(this.root, '[data-a="contcoins"]').toggleAttribute('disabled', !o.canAfford);
    $(this.root, '[data-k="contshop"]').hidden = o.canAfford;
    this.continueTick(1, 7);
    this.show('hud', 'continue');
  }

  continueTick(k: number, secLeft: number) {
    this.setAll('contsec', String(Math.max(0, Math.ceil(secLeft))));
    const c = this.root.querySelector<SVGCircleElement>('[data-k="contring"]')!;
    const len = 2 * Math.PI * 52;
    c.style.strokeDasharray = `${len}`;
    c.style.strokeDashoffset = `${len * (1 - k)}`;
  }

  /** Reset/disable a rewarded-ad button (text after use). */
  adButton(key: 'ad2x' | 'ad2xf' | 'adboost', state: 'ready' | 'used', usedText = '') {
    const b = $(this.root, `[data-k="${key}"]`);
    if (!b.dataset.ready) b.dataset.ready = b.innerHTML;
    if (state === 'ready') {
      b.innerHTML = b.dataset.ready;
      b.removeAttribute('disabled');
      b.classList.remove('used');
    } else {
      b.innerHTML = `${ICON.check} ${usedText}`;
      b.setAttribute('disabled', '');
      b.classList.add('used');
    }
  }

  freeCoins(left: number, amount: number) {
    const fb = this.root.querySelector<HTMLElement>('[data-k="freebadge"]');
    if (fb) fb.hidden = left <= 0;
    this.setAll('adfree', left > 0 ? `+${amount}` : 'Tomorrow');
    this.root.querySelectorAll<HTMLElement>('[data-a="adfree"]').forEach((b) => b.toggleAttribute('disabled', left <= 0));
  }

  setLoadingText(t: string) {
    this.setAll('loadtxt', t);
  }

  debug(text: string | null) {
    const d = $(this.root, '#debug');
    d.classList.toggle('show', text !== null);
    if (text !== null) d.textContent = text;
  }

  // =============================================================== live-ops screens


  /** the player's own class (for their avatar plate) */
  myClass: RankClass = 'D';

  homeSync(o: { name: string; color: string; best: number; avatar: number; bolts: number; weekRank: number | null; dailyBadge: number; cup: { live: boolean; name: string; div: RankClass; color: string; text: string; rank: number | null }; sale: boolean; pass: boolean }) {
    this.setAll('pname', o.name);
    $(this.root, '[data-k="ava"]').innerHTML = avaHtml(o.avatar, this.myClass, o.pass ? 'pass' : '');
    $(this.root, '[data-k="pline"]').innerHTML = `${classBadge(this.myClass)}<span class="prank">${o.weekRank ? `#${fmt(o.weekRank)}` : '#—'}</span><span class="pbolt">${BOLT}${fmt(o.bolts)}</span>`;
    const b = $(this.root, '[data-k="dailybadge"]');
    b.hidden = o.dailyBadge <= 0;
    b.textContent = String(o.dailyBadge);
    $(this.root, '[data-k="saletag"]').hidden = !o.sale;
    const c = o.cup;
    const strip = $(this.root, '[data-k="cupstrip"]');
    strip.style.setProperty('--cc', c.color);
    strip.innerHTML = `<span class="ci">${ICON.cup}</span><span class="ct"><b>${classBadge(c.div)} ${c.name}</b><small>${c.live ? '<em class="live">LIVE</em> ' : '<em class="soon">NEXT</em> '}${c.text}${c.rank ? ` · you #${fmt(c.rank)}` : ''}</small></span><span class="cgo">${ICON.chevR}</span>`;
    this.root.querySelectorAll<HTMLElement>('.rbtn .tag.live').forEach((t) => (t.hidden = !c.live));
  }

  /** own profile (editable) or a rival's card */
  profileSync(o: { self: true; name: string; avatar: number; cls: RankClass; bolts: number; next: RankClass | null; k: number; need: number; best: number; weekRank: number | null; runs: number; trophies: SaveData['trophies']; car: string; country: string }) {
    this.myClass = o.cls;
    this.setAll('proftitle', 'YOUR PROFILE');
    const strip = Array.from({ length: AVATAR_COUNT }, (_, i) => `<button class="avpick ${i === o.avatar ? 'on' : ''}" data-a="avpick" data-i="${i}" aria-label="Avatar ${i + 1}">${avatarSvg(i)}</button>`).join('');
    $(this.root, '[data-k="profbody"]').innerHTML = `
      <div class="ph">${avaHtml(o.avatar, o.cls, 'xl')}<div class="pn">
        <div class="nameedit"><input data-k="pnameinput" maxlength="14" value="${esc(o.name)}" aria-label="Pilot name" /><button class="btn sm blue" data-a="savepname">Save</button></div>
        <small>Tap the name to change it</small></div></div>
      <div class="avrow2"><div class="avstrip" data-k="pavstrip">${strip}</div><button class="btn sm purple" data-a="avrand" aria-label="Random avatar">🎲</button></div>
      <button class="ctryrow bagrow" data-a="bag"><span class="fl">${BAG_ICON}</span><span><small>Magic Bag</small><b>Your items · when to use them</b></span><em>Open</em></button>
      <button class="ctryrow" data-a="country"><span class="fl">${flagOf(o.country)}</span><span><small>Country</small><b>${esc(countryName(o.country || 'US'))}</b></span><em>Change</em></button>
      ${this.classCard(o.cls, o.bolts, o.next, o.k, o.need)}
      <div class="pstats">
        <div><span class="label">Best EXP</span><b>${fmt(o.bolts)}</b></div>
        <div><span class="label">This week</span><b>${o.weekRank ? `#${fmt(o.weekRank)}` : '—'}</b></div>
        <div><span class="label">Runs</span><b>${fmt(o.runs)}</b></div>
        <div><span class="label">Car</span><b class="sm">${esc(o.car)}</b></div>
      </div>
      <div class="trophies in"><span class="label">Trophies</span><span class="tro gold">${ICON.cup}${o.trophies.gold}</span><span class="tro silver">${ICON.cup}${o.trophies.silver}</span><span class="tro bronze">${ICON.cup}${o.trophies.bronze}</span></div>
      <div class="sbtns"><button class="btn sm ghost" data-a="rankguide">${ICON.info} How EXP works</button><button class="btn sm ghost" data-a="ranks">${ICON.podium} Leaderboard</button><button class="btn sm ghost" data-a="events">${ICON.cup} Cups</button></div>`;
    const on = this.root.querySelector<HTMLElement>('[data-k="pavstrip"] .avpick.on');
    const st = this.root.querySelector<HTMLElement>('[data-k="pavstrip"]');
    if (on && st) st.scrollLeft = on.offsetLeft - st.clientWidth / 2 + on.clientWidth / 2;
  }

  private classCard(cls: RankClass, bolts: number, next: RankClass | null, k: number, need: number) {
    const ladder = CLASSES.map((c) => `<span class="lad ${c === cls ? 'cur' : CLASSES.indexOf(c) < CLASSES.indexOf(cls) ? 'done' : ''}" style="--cc:${CLASS_COLOR[c]}">${c}</span>`).join('');
    return `<div class="clscard" style="--cc:${CLASS_COLOR[cls]}">
      <div class="cc-top">${classBadge(cls, 'lg')}<div><b>Rank ${cls}</b><small>${next ? `${fmt(need)} EXP more to rank ${next}` : 'Top rank reached'}</small></div><span class="cc-bolts">${BOLT}${fmt(bolts)}</span></div>
      <div class="cc-bar"><i style="width:${(k * 100).toFixed(1)}%"></i></div>
      <div class="ladder">${ladder}</div></div>`;
  }

  /** rows of the last rendered board, for tapping into a rival's profile */
  private rowCache: { r: LbRow; cls: RankClass }[] = [];

  showPlayer(i: number) {
    const e = this.rowCache[i];
    if (!e) return;
    const { r, cls } = e;
    if (r.you) return this.h.profile();
    const p = rivalProfile(r.name, r.score);
    this.setAll('proftitle', 'PILOT');
    $(this.root, '[data-k="profbody"]').innerHTML = `
      <div class="ph">${avaHtml(r.av ?? avatarForName(r.name), cls, 'xl', r.rank <= 3 ? `<i class="crown">${ICON.crown}</i>` : '')}<div class="pn">
        <b class="big ${r.pass ? 'gold' : ''}">${esc(r.name)}</b><small>${r.flag} · <span class="${p.online ? 'online' : ''}">${p.seen}</span></small></div></div>
      <div class="clscard" style="--cc:${CLASS_COLOR[cls]}"><div class="cc-top">${classBadge(cls, 'lg')}<div><b>Rank ${cls}</b><small>#${fmt(r.rank)} on this board</small></div><span class="cc-bolts">${BOLT}${fmt(r.score)}</span></div></div>
      <div class="pstats">
        <div><span class="label">Best EXP</span><b>${fmt(r.score)}</b></div>
        <div><span class="label">Runs</span><b>${fmt(p.runs)}</b></div>
        <div><span class="label">Streak</span><b>${p.streak} d</b></div>
        <div><span class="label">Car</span><b class="sm">${p.car}</b></div>
      </div>
      <div class="trophies in"><span class="label">Trophies</span><span class="tro gold">${ICON.cup}${p.gold}</span><span class="tro silver">${ICON.cup}${p.silver}</span><span class="tro bronze">${ICON.cup}${p.bronze}</span></div>
      ${r.pass ? `<div class="label passnote">${ICON.crown} XWAVE Pass member</div>` : ''}`;
    this.screens.profile.classList.add('show');
  }

  /**
   * MAGIC BAG: every item the player owns (bag = inventory), what is equipped for the next run,
   * class locks, shop shortcuts and the rules / which item fits which track.
   */
  hideOverlay(id: string) {
    this.screens[id]?.classList.remove('show');
  }

  /** a special tile (pick popup + Magic Bag): owned → select / count; empty → buy with coins */
  private specialTile(s: SaveData, k: SpecialKey, pick: boolean) {
    const n = s.items[k];
    const on = pick && s.special === k && n > 0;
    const price = ITEM_PRICE[k];
    const buy = `<span class="spbuy ${s.wallet < price ? 'poor' : ''}" data-a="sbuy" data-v="${k}" role="button">${ICON.coin}${fmt(price)} · Buy</span>`;
    return `<div class="sptile ${k} ${on ? 'on' : ''} ${n > 0 ? '' : 'empty'}" ${pick && n > 0 ? `data-a="spick" data-v="${k}" role="button"` : ''}>
      <span class="spi">${ITEM_ICON[k]}</span><b>${ITEM_NAME[k]}</b><small>${SPECIAL_LINE[k]}</small>
      ${n > 0 ? `<em class="cnt">×${n}</em>${on ? `<i class="tick">${ICON.check}</i>` : ''}` : `<em class="out">Out — get one with coins</em>`}${buy}</div>`;
  }
  private lockedTiles() {
    return LOCKED_SPECIALS.map((x) => `<button class="sptile locked" data-a="slocked"><span class="spi">${LOCKED_ICON[x.id]}</span><b>${x.name}</b><small>${x.desc}</small><em class="lk">${ICON.lock} ${classBadge('AAA')}</em></button>`).join('');
  }
  private specialRules() {
    return `<div class="sprules">${ICON.info}<span><b>Buy as many as you like</b> — they wait in your Magic Bag. <b>Only 1 special per race.</b> It leaves the bag only if you use it.</span></div>`;
  }

  /** v2: choose the ONE special for this race (or none), buy more with coins, then GO */
  specialPick(s: SaveData, rank: RankClass) {
    void rank;
    const none = `<div class="sptile none ${!s.special ? 'on' : ''}" data-a="spick" data-v="" role="button"><span class="spi">—</span><b>No special</b><small>Pure skill run</small>${!s.special ? `<i class="tick">${ICON.check}</i>` : ''}</div>`;
    $(this.root, '[data-k="spbody"]').innerHTML = `
      <div class="spwallet">${ICON.coin}<b>${fmt(s.wallet)}</b><button class="linkbtn" data-a="shop">Get coins ›</button></div>
      <div class="spgrid">${SPECIALS.map((k) => this.specialTile(s, k, true)).join('')}${none}</div>
      ${this.specialRules()}
      <div class="bhead out"><b>Opens at ${classBadge('AAA')}</b></div>
      <div class="spgrid locked">${this.lockedTiles()}</div>
      <button class="btn big spgo" data-a="sgo">${ICON.play} GO</button>`;
    this.screens.specialpick.classList.add('show');
    this.scheduleFit();
  }

  bagSync(s: SaveData) {
    this.lastSave = s;
    const total = SPECIALS.reduce((a, k) => a + s.items[k], 0);
    $(this.root, '[data-k="bagbody"]').innerHTML = `
      <div class="spwallet">${ICON.coin}<b>${fmt(s.wallet)}</b><button class="linkbtn" data-a="shop">Get coins ›</button></div>
      <div class="spgrid">${SPECIALS.map((k) => this.specialTile(s, k, false)).join('')}</div>
      ${this.specialRules()}
      <div class="bhead out"><b>Opens at ${classBadge('AAA')}</b></div>
      <div class="spgrid locked">${this.lockedTiles()}</div>
      <div class="sbtns"><button class="btn sm gold" data-a="freepop">${ICON.play} Free coins</button><button class="btn sm blue" data-a="play">${ICON.flag} Race</button></div>`;
    this.setAll('bagbadge', String(total));
  }

  /** boost info card: what it does + equip + practice */
  boostSync(k: ItemKey, owned: number, equipped: boolean, wallet = 0) {
    const inf = BOOST_INFO[k];
    const un = UNLOCK_BOOSTS.find((u) => u.k === k);
    const isLocked = !!un && CLASSES.indexOf(this.myClass) < CLASSES.indexOf(un.cls);
    const canTrain = ['super', 'hyper', 'escape', 'shield'].includes(k);
    $(this.root, '[data-k="binfo"]').innerHTML = `
      <div class="mhead"><h2>${ITEM_NAME[k].toUpperCase()}</h2><button class="icon-btn sm" data-a="closeov" data-v="boostinfo" aria-label="Close">${ICON.close}</button></div>
      <div class="bi-hero ${k}">${ITEM_ICON[k]}<span class="own">owned ×${owned}</span></div>
      <div class="bi-rows">
        <div><b>What it does</b><p>${inf.what}</p></div>
        <div><b>How to use</b><p>${inf.how}</p></div>
        <div><b>Best moment</b><p>${inf.when}</p></div>
      </div>
      ${isLocked ? `<div class="bi-lock">${ICON.lock} Unlocks at rank ${classBadge(un!.cls)} — earn EXP by driving farther</div>` : ''}
      ${canTrain ? `<button class="btn big" data-a="boosttrain" data-v="${k}">${ICON.target} Practice it · free</button>` : ''}
      <div class="sbtns">
        ${owned > 0 && !isLocked ? `<button class="btn sm ${equipped ? 'ghost' : 'green'}" data-a="equip" data-v="${k}">${equipped ? `${ICON.check} Equipped · tap to remove` : 'Equip for next run'}</button>` : ''}
        ${!isLocked ? `<button class="btn sm gold" data-a="buyboost" data-v="${k}" ${wallet < ITEM_PRICE[k] ? 'disabled' : ''}>Buy 1 · ${ICON.coin}${fmt(ITEM_PRICE[k])}</button>` : ''}
        ${!un ? `<button class="btn sm pink" data-a="shop">${ICON.bag} Bundles · better value</button>` : ''}
      </div>`;
  }

  settingsSync(s: SaveData, name: string, version: string) {
    void name;
    this.refreshProfile(s);
    this.setAll('sfoot', version);
  }

  private rowClass(r: LbRow, div?: RankClass) {
    return r.you ? this.myClass : div ?? classForScore(r.score);
  }
  private lbRow(r: LbRow, div?: RankClass) {
    const cls = this.rowClass(r, div);
    const i = this.rowCache.push({ r, cls }) - 1;
    return `<button class="lbrow ${r.you ? 'you' : ''} ${r.rank <= 3 ? `top${r.rank}` : ''}" data-a="viewp" data-i="${i}">
      <span class="lr">${r.rank <= 3 ? ICON.crown : ''}<b>${r.you && r.score <= 0 ? '—' : fmt(r.rank)}</b></span>
      ${avaHtml(r.av ?? avatarForName(r.name), cls, 'sm')}
      <span class="ln"><b class="${r.pass ? 'gold' : ''}">${esc(r.name)}${r.you ? ' <em>YOU</em>' : ''}</b><small>${r.flag} ${classBadge(cls)}</small></span>
      <span class="ls">${fmt(r.score)}</span></button>`;
  }

  ranksSync(board: Board, tab: 'week' | 'all', extra: string) {
    this.root.querySelectorAll<HTMLElement>('[data-a="ranktab"]').forEach((b) => b.classList.toggle('on', b.dataset.v === tab));
    this.rowCache = [];
    const top = board.rows.slice(0, 3);
    const order = [top[1], top[0], top[2]].filter(Boolean);
    $(this.root, '[data-k="podium"]').innerHTML = order
      .map((r) => {
        const cls = this.rowClass(r);
        const i = this.rowCache.push({ r, cls }) - 1;
        return `<button class="pod p${r.rank} ${r.you ? 'you' : ''}" data-a="viewp" data-i="${i}">${avaHtml(r.av ?? avatarForName(r.name), cls, '', r.rank === 1 ? `<i class="crown">${ICON.crown}</i>` : '')}<b>${esc(r.name)}</b><small>${r.flag} ${fmt(r.score)}</small><span class="step">${r.rank}</span></button>`;
      })
      .join('');
    $(this.root, '[data-k="lblist"]').innerHTML = board.rows.slice(3).map((r) => this.lbRow(r)).join('') + (SAMPLE_BOARD_NOTE ? `<div class="lbnote">${extra}</div>` : '');
    const y = board.you;
    const pct = Math.max(0.1, (y.rank / board.total) * 100);
    $(this.root, '[data-k="lbyou"]').innerHTML = `${this.lbRow(y)}<div class="lbnext">${y.score <= 0 ? 'Play a run to get ranked' : board.next ? `Top ${pct < 1 ? pct.toFixed(1) : Math.ceil(pct)}% · EXP <b>${fmt(board.next.score)}</b> to reach <b>#${fmt(board.next.rank)}</b>` : 'You are #1!'}</div>`;
  }

  dailySync(o: { slot: number; claimedToday: boolean; streak: number; quests: (Quest & { progress: number; done: boolean; claimed: boolean })[]; pts: number; chests: number[]; resetIn: string; pass: { active: boolean; claimed: boolean; days: number } }) {
    this.setAll('cistreak', `Streak ${o.streak} / 7`);
    $(this.root, '[data-k="cigrid"]').innerHTML = checkinList(o.slot, o.claimedToday);
    const btn = $(this.root, '[data-k="cibtn"]');
    btn.toggleAttribute('disabled', o.claimedToday);
    btn.innerHTML = o.claimedToday ? `${ICON.check} Come back tomorrow` : `${ICON.gift} Claim day ${o.slot + 1}`;
    const pr = $(this.root, '[data-k="passrow"]');
    pr.innerHTML = o.pass.active
      ? `<div class="passin">${ICON.crown}<div><b>XWAVE Pass</b><small>${o.pass.days} days left · 300 coins + 1 Roadster Jump every day</small></div><button class="btn sm gold" data-a="claimpass" ${o.pass.claimed ? 'disabled' : ''}>${o.pass.claimed ? 'Claimed' : 'Claim'}</button></div>`
      : `<div class="passin">${ICON.crown}<div><b>XWAVE Pass</b><small>300 coins + Roadster Jump every day · ×2 quest coins</small></div><button class="btn sm gold" data-a="buy" data-sku="xwave_pass">$4.99</button></div>`;
    this.setAll('dreset', `resets in ${o.resetIn}`);
    const max = CHESTS[CHESTS.length - 1].pts;
    $(this.root, '[data-k="dbar"]').style.width = `${Math.min(100, (o.pts / max) * 100)}%`;
    $(this.root, '[data-k="chests"]').innerHTML = CHESTS.map((c, i) => {
      const open = o.chests.includes(i);
      const ready = o.pts >= c.pts && !open;
      return `<button class="chest ${ready ? 'ready' : ''} ${open ? 'open' : ''}" style="left:${(c.pts / max) * 100}%" data-a="chest" data-i="${i}" ${ready ? '' : 'disabled'} title="${rewardText(c.reward)}">${ICON.gift}<small>${c.pts}</small></button>`;
    }).join('') + `<span class="dpt">${o.pts} pts</span>`;
    $(this.root, '[data-k="qlist"]').innerHTML = o.quests
      .map((q) => `<div class="quest ${q.claimed ? 'claimed' : q.done ? 'done' : ''}">
        <div class="qt"><b>${q.text}</b><span class="qr"><span class="rchip pts">+${q.pts} pts</span><span class="rchip">${ICON.coin}${q.coins}</span></span></div>
        <div class="qb"><div class="track"><i style="width:${Math.min(100, (q.progress / q.target) * 100)}%"></i></div><span>${fmt(q.progress)}/${fmt(q.target)}</span>
        ${q.claimed ? `<i class="ok">${ICON.check}</i>` : q.done ? `<button class="btn sm green" data-a="claimq" data-id="${q.id}">Claim</button>` : ''}</div></div>`)
      .join('');
  }

  eventsSync(o: {
    cls: RankClass; bolts: number; live: boolean; mine: EventInst; now: number; best: number; rank: number | null; total: number;
    divisions: { div: RankClass; cup: EventInst; open: boolean; need: number }[]; prizes: Prize[];
    upcoming: { start: number; cup: EventInst }[]; trophies: SaveData['trophies']; boardOpen: boolean; board?: Board;
  }) {
    this.myClass = o.cls;
    const e = o.mine;
    const c = e.cup;
    const top = o.prizes[0];
    const hero = $(this.root, '[data-k="cuphero"]');
    hero.style.setProperty('--cc', c.color);
    hero.innerHTML = `
      <div class="ch-top">${o.live ? '<em class="live">LIVE</em>' : '<em class="soon">NEXT</em>'}${classBadge(e.division)}<span class="label">${ICON.clock} ${o.live ? `ends in <b>${fmtLeft(e.end - o.now)}</b>` : `starts <b>${localTime(e.start)}</b> · in <b>${fmtLeft(e.start - o.now)}</b>`}</span></div>
      <div class="ch-name">${c.name}</div>
      <div class="ch-tag">Class ${e.division} division · ${c.tag}</div>
      <div class="ch-prize">${ICON.hyper}<div><b>#1 wins HYPER JUMP ×${top.hyper}</b><small>+ ${fmt(top.coins)} coins + Gold trophy · run bolts ×2 while it is live</small></div></div>
      <div class="ch-stats"><div><span class="label">Your best</span><b>${o.best ? fmt(o.best) : '—'}</b></div><div><span class="label">Your rank</span><b>${o.rank ? `#${fmt(o.rank)}` : '—'}</b></div><div><span class="label">Racers</span><b>${fmt(o.total)}</b></div></div>
      <div class="ch-btns">${o.live ? `<button class="btn big" data-a="racecup">${ICON.play} Race now</button>` : `<button class="btn big ghost" disabled>${ICON.clock} Opens ${localTime(e.start)}</button>`}<button class="btn sm ghost" data-a="cupboard">${ICON.podium} ${o.boardOpen ? 'Hide' : 'Standings'}</button></div>`;
    const cb = $(this.root, '[data-k="cupboard"]');
    cb.hidden = !o.boardOpen || !o.board;
    this.rowCache = [];
    if (o.board) {
      const b = o.board;
      const rows = b.rows.slice(0, 10).map((r) => this.lbRow(r, e.division)).join('');
      cb.innerHTML = `<div class="bhead"><b>Standings · class ${e.division}</b><span class="label">top 10 · tap a pilot</span></div>${rows}${b.you.rank > 10 ? `<div class="lbgap">···</div>${this.lbRow(b.you, e.division)}` : ''}`;
    }
    $(this.root, '[data-k="prizes"]').innerHTML = o.prizes
      .map((p) => `<div class="prize ${p.trophy ?? ''}"><span class="pl">${p.trophy ? ICON.cup : ''}${p.label}</span><span class="pr"><span class="rchip bolt">${BOLT}${p.bolts}</span>${p.hyper ? `<span class="rchip hyper">${ICON.hyper}×${p.hyper}</span>` : ''}${p.superJ ? `<span class="rchip super">${ICON.rocket}×${p.superJ}</span>` : ''}<span class="rchip">${ICON.coin}${fmt(p.coins)}</span></span></div>`)
      .join('');
    $(this.root, '[data-k="divisions"]').innerHTML = o.divisions
      .map((d) => `<div class="divc ${d.open ? 'open' : CLASSES.indexOf(d.div) < CLASSES.indexOf(o.cls) ? 'past' : 'locked'}" style="--cc:${CLASS_COLOR[d.div]}">${classBadge(d.div, 'md')}<small>${d.open ? d.cup.cup.name : CLASSES.indexOf(d.div) < CLASSES.indexOf(o.cls) ? 'Moved up' : `${ICON.lock} ${BOLT}${fmt(d.need)}`}</small></div>`)
      .join('');
    $(this.root, '[data-k="upcoming"]').innerHTML = o.upcoming
      .map((u) => `<div class="upc" style="--cc:${u.cup.cup.color}"><span class="ci">${ICON.cup}</span><div><b>${classBadge(u.cup.division)} ${u.cup.cup.name}</b><small>${u.cup.cup.tag} · ${localTime(u.start)}</small></div><span class="starts"><small>starts in</small><b>${fmtLeft(u.start - o.now)}</b></span></div>`)
      .join('');
    const t = o.trophies;
    $(this.root, '[data-k="trophies"]').innerHTML = `<span class="label">Trophy cabinet</span><span class="tro gold">${ICON.cup}${t.gold}</span><span class="tro silver">${ICON.cup}${t.silver}</span><span class="tro bronze">${ICON.cup}${t.bronze}</span>`;
  }

  shopSync(s: SaveData) {
    const card = (p: Product) => {
      const owned = (p.sku === 'no_ads' && s.noAds) || (p.sku === 'starter_pack' && s.starterBought);
      const passOn = p.sku === 'xwave_pass' && s.passUntil > Date.now();
      return `<div class="pcard ${p.kind} art-${p.art} ${owned ? 'owned' : ''}">
        ${p.badge ? `<em class="pbadge">${p.badge}</em>` : ''}
        <div class="part">${this.productArt(p)}</div>
        <div class="pinfo"><b>${p.name}</b><small>${p.desc}</small>${p.kind === 'bundle' || p.sku === 'starter_pack' ? `<em class="pworth">${ICON.coin} worth ${fmt(rewardValue(p.grant))} coins</em>` : ''}</div>
        <button class="btn sm ${p.kind === 'coins' ? 'blue' : 'gold'} pbuy" data-a="buy" data-sku="${p.sku}" ${owned ? 'disabled' : ''}>${owned ? 'Owned' : passOn ? `Extend · ${p.price}` : p.price}</button></div>`;
    };
    const specials = PRODUCTS.filter((p) => p.kind !== 'coins' && !(p.once && p.sku === 'starter_pack' && s.starterBought));
    const coins = PRODUCTS.filter((p) => p.kind === 'coins');
    const inv = (SPECIALS as readonly ItemKey[]).map((k) => `<span class="rchip ${k}">${ITEM_ICON[k]}×${s.items[k]}</span>`).join('');
    $(this.root, '[data-k="shoplist"]').innerHTML = `
      <div class="inv panel"><span class="label">Your items</span>${inv}</div>
      ${specials.map(card).join('')}
      <div class="bhead out"><b>Coins</b></div>
      <div class="coingrid">${coins.map(card).join('')}</div>
      <div class="label shopnote">Demo store — purchases are simulated, no payment is taken.</div>`;
    this.setAll('wallet', fmt(s.wallet));
  }

  private productArt(p: Product) {
    switch (p.art) {
      case 'starter': return `<span class="stack">${ICON.coin}${ICON.rocket}${ICON.hyper}</span>`;
      case 'pass': return ICON.crown;
      case 'noads': return ICON.noads;
      case 'jumps': return `<span class="stack">${ICON.rocket}${ICON.hyper}</span>`;
      case 'hyper': return ICON.hyper;
      case 'escape': return ICON.sos;
      default: {
        const n = { 'coins-s': 1, 'coins-m': 2, 'coins-l': 3, 'coins-xl': 4 }[p.art] ?? 1;
        return `<span class="coins n${n}">${ICON.coin.repeat(n)}</span>`;
      }
    }
  }

  eventResults(list: EventResult[]) {
    $(this.root, '[data-k="eventres"]').innerHTML = list
      .map((r) => `<div class="eres" style="--cc:${r.inst.cup.color}"><b>${classBadge(r.inst.division)} ${r.inst.cup.name}</b><div class="erank">#${fmt(r.rank)}</div><small>Your best ${fmt(r.score)} · ${r.prize.label}</small>
        <div class="erew"><span class="rchip bolt">${BOLT}${r.prize.bolts}</span>${r.prize.trophy ? `<span class="rchip ${r.prize.trophy}">${ICON.cup}${r.prize.trophy}</span>` : ''}${rewardChips({ coins: r.prize.coins, items: { hyper: r.prize.hyper, super: r.prize.superJ ?? 0 } })}</div></div>`)
      .join('');
  }

  /** result-screen rewards box (compact): coins total + breakdown, EXP + rank bar, standings */
  private rewardsHtml(r: RunRewards | null, coins: { label: string; coins: number }[]) {
    const parts = coins.filter((c) => c.coins > 0).map((c) => ({ label: c.label, n: c.coins }));
    if (r) for (const m of r.missions) parts.push({ label: 'mission', n: m.reward });
    const total = parts.reduce((a, p) => a + p.n, 0);
    const rows: string[] = [];
    rows.push(`<div class="rw-line"><span class="rl">${ICON.coin} Coins</span><span class="rs">${parts.map((p) => `${fmt(p.n)} ${esc(p.label.toLowerCase())}`).join(' · ') || '—'}</span><b class="c">+${fmt(total)}</b></div>`);
    if (!r) return `<div class="rw-h"><b>Rewards</b></div>${rows.join('')}`;
    const best = r.exp > 0 && r.to > r.from;
    rows.push(`<div class="rw-line"><span class="rl">${XPT} EXP</span><span class="rs">${best ? '<b class="upt">NEW BEST</b>' : `best ${fmt(r.to)}`}</span><b class="xg">${fmt(r.exp)}</b></div>`);
    const ci = CLASSES.indexOf(r.clsAfter);
    const next = CLASSES[ci + 1] ?? null;
    const lo = CLASS_MIN[r.clsAfter];
    const hi = next ? CLASS_MIN[next] : lo;
    const kTo = next ? Math.min(1, (r.to - lo) / (hi - lo)) : 1;
    const kFrom = next && r.clsAfter === r.clsBefore ? Math.max(0, Math.min(1, (r.from - lo) / (hi - lo))) : 0;
    const up = r.clsAfter !== r.clsBefore;
    rows.push(`<div class="rw-bar ${up ? 'up' : ''}" style="--cc:${CLASS_COLOR[r.clsAfter]}">${classBadge(r.clsAfter)}<div class="bar"><i class="old" style="width:${(kFrom * 100).toFixed(1)}%"></i><i class="new" style="left:${(kFrom * 100).toFixed(1)}%;width:${((kTo - kFrom) * 100).toFixed(1)}%"></i></div>${next ? classBadge(next) : ''}<small>${up ? `<b class="upt">RANK UP!</b>` : next ? `${fmt(hi - r.to)} EXP to ${next}` : 'top'}</small></div>`);
    const chips = [`<span>${ICON.podium} Week #${fmt(r.weekRank)}</span>`];
    if (r.cup) chips.push(`<span>${ICON.cup} ${classBadge(r.cup.div)} #${fmt(r.cup.rank)}</span>`);
    for (const q of r.quests) chips.push(`<span class="qd" title="${esc(q)}">${ICON.check}<em>${esc(q)}</em></span>`);
    rows.push(`<div class="rw-chips">${chips.join('')}</div>`);
    return `<div class="rw-h"><b>Rewards</b><button class="linkbtn" data-a="rankguide">${ICON.info} How EXP works</button></div>${rows.join('')}`;
  }

  /** EXP & rank guide: thresholds and minutes per speed level. EXP can not be bought. */
  rankGuide() {
    const ladder = CLASSES.map((c) => `<tr><td>${classBadge(c, 'md')}</td><td>${fmt(CLASS_MIN[c])}</td><td>${c === 'D' ? '—' : `${rankMinutes(c, 'hard')}′`}</td><td>${c === 'D' ? '—' : `${rankMinutes(c, 'normal')}′`}</td><td>${c === 'D' ? '—' : `${rankMinutes(c, 'easy')}′`}</td></tr>`).join('');
    $(this.root, '[data-k="rgbody"]').innerHTML = `
      <p class="tut-lead">EXP shows <b>how good you are</b>. The farther one run goes, the more EXP it scores. Your rank is your <b>best run</b>.</p>
      <table class="rgt"><thead><tr><th>Rank</th><th>EXP</th><th>Hard</th><th>Normal</th><th>Easy</th></tr></thead><tbody>${ladder}</tbody></table>
      <div class="rg-rules">${EXP_RULES.map((r) => `<span>${r.what}<b>${r.gain}</b></span>`).join('')}</div>
      <div class="rg-note">${ICON.flag}<span>${classBadge('S')} ${classBadge('SS')} ${classBadge('SSS')} only on <b>Mega Rush</b> (opens at ${classBadge('AAA')}).</span></div>
      <div class="rg-note">${ICON.lock}<span>EXP can't be bought. New ranks unlock cars and tracks.</span></div>
`;
    this.screens.rankguide.classList.add('show');
  }

  /** tooltip under the speed selector: what the level means + its reward tier */
  /** one-line description of the selected speed level, always shown under the selector (never covers a button) */
  speedTip(k: 'easy' | 'normal' | 'hard') {
    const t = $(this.root, '[data-k="speedtip"]');
    const L = LEVELS[k];
    t.innerHTML = `<b>${L.label}</b> ${L.desc}`;
    t.dataset.v = k;
  }


  /** reward popups (image-2 style): daily reward · watch-ad reward · welcome-back gift */
  popup(kind: 'daily' | 'ad' | 'gift' | 'entry' | 'launch' | 'share' | 'invite' | 'rate' | 'addscreen' | 'offline', d: Record<string, unknown>) {
    const head = (icon: string, title: string, cls: string) => `<div class="p3h"><span class="p3i ${cls}">${icon}</span><h2>${title}</h2><button class="icon-btn sm" data-a="closeov" data-v="popup" aria-label="Close">${ICON.close}</button></div>`;
    let html = '';
    if (kind === 'daily') {
      const slot = Number(d.slot);
      const claimed = !!d.claimed;
      html = head(calendarGift(44), 'DAILY REWARD', 'art') + checkinList(slot, claimed) +
        (claimed ? `<button class="btn big ghost" disabled>${ICON.check} Come back tomorrow</button>` : `<button class="btn big blue" data-a="popa" data-v="claimdaily">CLAIM</button>`) +
        `<div class="label p3foot">Streak ${Number(d.streak)} / 7 · missing a day restarts at Day 1</div>`;
    } else if (kind === 'ad') {
      const left = Number(d.left);
      html = head(ICON.play, 'WATCH AD REWARD', 'gold') +
        `<p class="p3t">Watch an ad to get</p><div class="pzbig">${coinPile(230, 126)}${amount(`x${fmt(Number(d.amount))}`, 'xl')}</div>` +
        (left > 0 ? `<button class="btn big gold" data-a="popa" data-v="watchad">${ICON.play} WATCH AD</button>` : `<button class="btn big ghost" disabled>${ICON.clock} Come back tomorrow</button>`) +
        `<div class="label p3foot">${left > 0 ? `${left} left today` : 'All free rewards used today'}</div>`;
    } else if (kind !== 'gift') {
      html = this.perkPopup(kind, d, head);
    } else {
      html = head(giftBox(46), 'REVISIT GIFT', 'art') +
        `<p class="p3t">Welcome back!<br/>Here's a gift for you!</p>
        <div class="pzbig">${coinPile(230, 126)}${amount(`x${fmt(Number(d.coins))}`, 'xl')}</div>
        ${Number(d.shield) ? `<div class="pzplus">+ <span class="rchip shield">${ICON.shield}×${Number(d.shield)} Start Shield</span></div>` : ''}
        <button class="btn big gold" data-a="popa" data-v="gift">CLAIM</button>`;
    }
    $(this.root, '[data-k="popbody"]').innerHTML = html;
    this.screens.popup.classList.add('show');
  }

  private perkPopup(kind: string, d: Record<string, unknown>, head: (icon: string, title: string, cls: string) => string) {
    // illustrated step cards (mock-up style): purple number, caption, art strip under it
    const step = (n: number, text: string, done: boolean, art = '') =>
      `<div class="pzs ${done ? 'done' : ''}"><i class="pzn">${done ? ICON.check : n}</i><div class="pzb"><span>${text}</span>${art ? `<div class="pza">${art}</div>` : ''}</div></div>`;
    const coinBanner = (n: unknown) => `<div class="pzcoins">${coinPile(150, 72)}${amount(`x${fmt(Number(n))}`)}</div>`;
    const hand = `<span class="pzhand">${ICON.hand}</span>`;
    const av = Number(d.avatar ?? 0);
    switch (kind) {
      case 'entry': {
        const st = d.entrySteps as boolean[];
        const all = st.every(Boolean);
        const done = !!d.entry;
        const name = esc(String(d.name || 'Pilot name'));
        const explore = [
          ['daily', ICON.calendar, 'Daily'], ['shop', ICON.bag, 'Shop'], ['garage', ICON.engine, 'Garage'],
          ['help', TUT_ICON, 'Tutorial'], ['play', ICON.flag, 'Race'], ['events', ICON.cup, 'Cups'],
        ];
        return head(giftBox(46), 'ENTRY REWARD', 'art') +
          `<div class="pzsteps">
            ${step(1, 'Open your pilot profile', st[0], `<div class="pzrow"><span class="pztile plus">${ICON.plus}</span><span class="pztile chat">${ICON.user}<em>99+</em></span><span class="pztile ava on">${avatarSvg(av)}${tapMarks()}</span></div>`)}
            ${step(2, 'Set your pilot name', st[1], `<div class="pzbanner"><img src="${logoUrl}" alt="" /><span class="pzname">${name}</span><span class="pzmenu">≡</span></div>`)}
            ${step(3, 'Pick your racing helmet', st[2], `<div class="pzcard"><img src="${carZenith}" alt="" /><span class="pzhelm">${avatarSvg(av)}</span>${hand}${tapMarks('r')}</div>`)}
            ${step(4, 'Claim your rewards', done, coinBanner(d.entryReward))}
          </div>` +
          (done
            ? `<div class="pzdone">${ICON.check} Reward claimed — explore Sky Roadster</div>
               <div class="pzgo">${explore.map(([a, ic, t]) => `<button data-a="popgo" data-v="${a}"><span>${ic}</span><b>${t}</b></button>`).join('')}</div>`
            : all ? `<button class="btn big gold" data-a="popa" data-v="entry">CLAIM</button>` : `<button class="btn big blue" data-a="profile">${ICON.user} OPEN PROFILE</button>`);
      }
      case 'launch': {
        const sa = !!d.standalone;
        const done = !!d.launch;
        return head(megaphone(46), 'LAUNCH REWARD', 'art') +
          `<div class="pzsteps">
            ${step(1, 'Click the button below', sa, `<div class="pzgobtn"><button class="btn blue" data-a="popa" data-v="go:addscreen">${ICON.play} GO</button>${hand}${tapMarks('r')}</div>`)}
            ${step(2, 'Open Sky Roadster from your Home Screen', sa, `<div class="pzapps"><span class="pzgrid"><i></i><i></i><i></i><i></i></span><span class="pzarrow">→</span><img class="pzicon" src="${appIcon}" alt="" /></div>`)}
            ${step(3, 'Claim your rewards', done, coinBanner(d.launchReward))}
          </div>` +
          (done ? `<button class="btn big ghost" disabled>${ICON.check} Claimed</button>` : sa ? `<button class="btn big gold" data-a="popa" data-v="launch">CLAIM</button>` : `<button class="btn big blue" data-a="popa" data-v="go:addscreen">GO</button>`);
      }
      case 'share': {
        const done = !!d.shareToday;
        return head(shareNodes(46), 'SHARE REWARDS', 'art') +
          `<div class="pzbig">${coinPile(230, 126)}${amount(`+${fmt(Number(d.shareReward))}`, 'xl')}</div>
          <p class="p3t">Share to get free coins!</p>` +
          (done ? `<button class="btn big ghost" disabled>${ICON.check} Shared today · back tomorrow</button>` : `<button class="btn big green" data-a="popa" data-v="share">${ICON.share} SHARE</button>`) +
          `<button class="linkbtn center" data-a="popa" data-v="go:invite">Invite friends instead →</button>`;
      }
      case 'invite': {
        const done = !!d.inviteToday;
        const side = (who: string) => `<div class="pzinv"><span class="pzppl">${friends(70)}</span><span class="pzinvc">${coinFace(30)}</span><b>${who}</b>${amount(`x${fmt(Number(d.inviteReward))}`, 'sm')}</div>`;
        return head(friends(42, '#4fc3ff'), 'INVITE FRIENDS', 'art') +
          `<p class="p3t">Invite friends to play<br/>and get rewards!</p>
          <div class="pzinvrow">${side('YOU')}<span class="pzlink">🔗</span>${side('FRIEND')}</div>` +
          (done ? `<button class="btn big ghost" disabled>${ICON.check} Invite sent today</button>` : `<button class="btn big green" data-a="popa" data-v="invite">🔗 INVITE</button>`) +
          `<div class="label p3foot">${Number(d.invites)} friends invited</div>`;
      }
      case 'rate':
        return head(starBig(40), 'RATE US', 'art') +
          `<p class="p3t">Enjoying Sky Roadster?<br/>Give us a 5-star rating!</p>
          <div class="pzstars">${[1, 2, 3, 4, 5].map((n) => `<button data-a="popa" data-v="rate${n}" aria-label="${n} stars">${starBig(44)}</button>`).join('')}</div>
          <button class="btn big blue" data-a="popa" data-v="rate5">RATE NOW</button>
          <button class="btn big dark" data-a="closeov" data-v="popup">NOT NOW</button>`;
      case 'addscreen': {
        const can = !!d.canInstall;
        const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const sheet = [
          [`<span class="pzsq on">${ICON.plus}</span>`, 'Add to<br/>Home Screen'], [`<span class="pzsq">${ICON.share}</span>`, 'Share'],
          [`<span class="pzsq">🔗</span>`, 'Copy Link'], [`<span class="pzsq">•••</span>`, 'More'],
        ];
        return head(phonePlus(44), 'ADD TO SCREEN', 'art') +
          `<p class="p3t">Add Sky Roadster to your<br/>Home Screen for faster access!</p>
          <div class="pzphone"><i class="notch"></i><div class="pzsheet">${sheet.map(([ic, t]) => `<span>${ic}<small>${t}</small></span>`).join('')}</div>
            <ol class="pzol">${ios ? '<li>Tap <b>Share</b></li><li>Select <b>Add to Home Screen</b></li>' : '<li>Tap the browser menu <b>⋮</b></li><li>Select <b>Install app</b> / <b>Add to Home screen</b></li>'}<li>Find Sky Roadster on your Home Screen</li></ol></div>` +
          (can ? `<button class="btn big blue" data-a="popa" data-v="install">INSTALL NOW</button>` : `<button class="btn big blue" data-a="closeov" data-v="popup">GOT IT</button>`);
      }
      default:
        return head(`<svg viewBox="0 0 24 24"><path d="M2 8.5a15 15 0 0 1 20 0M5.5 12a10 10 0 0 1 13 0M9 15.5a5 5 0 0 1 6 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="19" r="1.6" fill="#fff"/></svg>`, 'NO CONNECTION', 'red') +
          `<p class="p3t">Please check your internet<br/>connection and try again.</p>
          <div class="pzbig robot">${wifiRobot(200, 132)}</div>
          <button class="btn big blue" data-a="popa" data-v="retry">${ICON.retry} RETRY</button>
          <div class="label p3foot">You can still race offline — cups sync when you're back.</div>`;
    }
  }

  perkBadges(o: Record<'entry' | 'launch' | 'share', 'todo' | 'ready' | 'done'>) {
    for (const [k, st] of Object.entries(o)) {
      const b = this.root.querySelector<HTMLElement>(`[data-k="pk-${k}"]`);
      if (!b) continue;
      // Entry stays after it is claimed (its popup then links to Daily / Shop / Garage / Tutorial / Race / Cups);
      // Launch disappears once claimed; Share is daily
      b.hidden = st === 'done' && k === 'launch';
      b.classList.toggle('done', st === 'done');
      const e = b.querySelector<HTMLElement>('.badge');
      if (e) e.hidden = st !== 'ready';
    }
  }

  /** country picker: search + list (auto-detected by IP until the player picks) */
  countryPicker() {
    const list = [...COUNTRIES].map((c) => ({ c, n: countryName(c) })).sort((a, b) => a.n.localeCompare(b.n));
    $(this.root, '[data-k="popbody"]').innerHTML = `<div class="p3h"><span class="p3i blue">🌍</span><h2>COUNTRY</h2><button class="icon-btn sm" data-a="closeov" data-v="popup" aria-label="Close">${ICON.close}</button></div>
      <input class="ctrysearch" data-k="ctryq" placeholder="Search country…" aria-label="Search country" />
      <div class="ctrylist" data-k="ctrylist">${list.map(({ c, n }) => `<button class="ctryopt" data-a="setcountry" data-v="${c}" data-n="${n.toLowerCase()}"><span class="fl">${flagOf(c)}</span><span>${n}</span></button>`).join('')}</div>`;
    this.screens.popup.classList.add('show');
    const q = $<HTMLInputElement>(this.root, '[data-k="ctryq"]');
    q.addEventListener('input', () => {
      const v = q.value.trim().toLowerCase();
      this.root.querySelectorAll<HTMLElement>('.ctryopt').forEach((b) => (b.hidden = !!v && !b.dataset.n!.includes(v) && !b.dataset.v!.toLowerCase().startsWith(v)));
    });
  }

  /** language picker (6 basic languages) */
  langPicker() {
    const cur = getLang();
    $(this.root, '[data-k="popbody"]').innerHTML = `<div class="p3h"><span class="p3i blue">🌐</span><h2>LANGUAGE</h2><button class="icon-btn sm" data-a="closeov" data-v="popup" aria-label="Close">${ICON.close}</button></div>
      <div class="langgrid">${LANGS.map((l) => `<button class="langopt ${l.code === cur ? 'on' : ''}" data-a="setlang" data-v="${l.code}"><span class="fl">${l.flag}</span><span>${l.name}</span>${l.code === cur ? ICON.check : ''}</button>`).join('')}</div>`;
    this.screens.popup.classList.add('show');
  }

  applyLang(code: string) {
    const l = LANGS.find((x) => x.code === code) ?? LANGS[0];
    setLang(l.code as Lang, this.root);
    this.setAll('langflag', l.flag);
    this.setAll('langname', l.name);
  }

  closePopup() {
    this.screens.popup.classList.remove('show');
  }

  needRocket(o: { owned: number; wallet: number; price: number }) {
    const b: string[] = [];
    if (o.owned > 0) b.push(`<button class="btn big" data-a="rocketfix" data-v="use">${ICON.rocket} Use one · you own ×${o.owned}</button>`);
    b.push(o.wallet >= o.price
      ? `<button class="btn gold" data-a="rocketfix" data-v="buy">Buy 1 · <span class="price">${ICON.coin}${fmt(o.price)}</span></button>`
      : `<button class="btn pink" data-a="rocketfix" data-v="shop">${ICON.bag} Get Roadster Jumps</button>`);
    b.push(`<button class="btn ghost sm" data-a="rocketfix" data-v="retry">${ICON.retry} Retry & collect the rocket</button>`);
    $(this.root, '[data-k="nrbtns"]').innerHTML = b.join('');
  }

  /** danger-assist arrow (null hides) */
  /** the player did the hinted move: quick confirm + fade out */
  dangerOk() {
    const d = $(this.root, '[data-k="danger"]');
    d.classList.add('ok');
    window.setTimeout(() => {
      d.hidden = true;
      d.classList.remove('ok');
    }, 260);
  }

  /** the ROADSTER button lights up (steady glow + "TAP!") when a jump is the way through */
  private rocketReady = false;
  /** training: ROADSTER tapped before the blockade — nudge the button and explain */
  rocketWait() {
    const b = $(this.root, '[data-k="rocketbtn"]');
    b.classList.remove('wait');
    void b.offsetWidth;
    b.classList.add('wait');
    this.toast(`${ICON.rocket} Save it! Tap ROADSTER when the button lights up`, '#9b6bff');
  }

  danger(hint: string | null) {
    this.rocketReady = hint === 'rocket';
    $(this.root, '[data-k="rocketbtn"]').classList.toggle('ready', this.rocketReady);
    const d = $(this.root, '[data-k="danger"]');
    d.classList.remove('ok');
    const sos = $(this.root, '[data-k="sosbtn"]');
    sos.classList.toggle('urgent', hint === 'sos');
    if (hint === 'rocket') {
      d.className = 'danger rocket';
      $(this.root, '[data-k="dgarrow"]').innerHTML = ICON.rocket;
      this.setAll('dgtxt', 'ROADSTER');
      d.hidden = false;
      return;
    }
    if (!hint || hint === 'sos') {
      d.hidden = hint !== 'sos';
      if (hint === 'sos') {
        d.className = 'danger sosh';
        $(this.root, '[data-k="dgarrow"]').innerHTML = ICON.sos;
        this.setAll('dgtxt', 'TAP SOS!');
      }
      return;
    }
    // thin chevron icon, placed at the screen edge on the side of the move
    const rot: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };
    d.className = `danger dir-${hint}`;
    $(this.root, '[data-k="dgarrow"]').innerHTML = `<svg viewBox="0 0 24 24" style="transform:rotate(${rot[hint]}deg)"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    this.setAll('dgtxt', hint.toUpperCase());
    d.hidden = false;
  }

  rewardToast(title: string, r: Reward) {
    this.toast(`${ICON.gift} ${title} ${rewardChips(r)}`, 'var(--gold)');
  }
}
