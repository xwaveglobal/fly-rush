/** Persistent player profile in localStorage (wrapped: storage can be blocked). */
export interface SaveData {
  best: number;
  bestDistance: number;
  wallet: number;
  totalRuns: number;
  vehicle: string;
  unlocked: string[];
  upgrades: { engine: number; shield: number; magnet: number };
  missions: { active: { id: string; progress: number }[]; completed: number; rank: number };
  settings: { sound: boolean; music: boolean; quality: 'high' | 'low'; speed: 'easy' | 'normal' | 'hard'; assist?: boolean; comfort?: boolean; autoClaim?: boolean; vibrate?: boolean; lang?: string };
  /** rewarded "free coins": day key + how many claimed that day */
  adFreeDay?: string;
  adFreeCount?: number;
  /** first-run training finished (or skipped) */
  tutorialDone?: boolean;
  /** last chosen track ('endless' or a course id) */
  track: string;
  /** best stars (0–3) per course id */
  trackStars: Record<string, number>;
  /** best score per track id (incl. 'endless') */
  trackBest: Record<string, number>;
  /** bumped when default settings change, to migrate old saves */
  settingsRev?: number;

  // ---- live-ops / meta
  /** pilot name shown on leaderboards */
  name: string;
  /** stable random id → avatar colour, sample-data seed */
  pid: number;
  /** avatar index (random on first launch, changeable in Settings) */
  avatar: number;
  /** ⚡ bolts = cup points (rank class D → AAA) */
  bolts: number;
  /** mission rewards waiting for a manual claim (auto-claim off) */
  pendingMissions: { text: string; reward: number }[];
  /** consumable items (equipped on the track screen, used in a run) */
  items: { super: number; hyper: number; shield: number; escape: number; turbo: number; magnet: number; double: number; life: number };
  /** which owned items are equipped for the next run */
  equip: { super: boolean; hyper: boolean; shield: boolean; escape: boolean; turbo: boolean; magnet: boolean; double: boolean; life: boolean };
  /** best score this week (leaderboard "This week") */
  weekKey: string;
  weekBest: number;
  /** daily check-in: last claimed day + streak (1..7) */
  checkDay: string;
  checkStreak: number;
  /** daily quests: day key + progress per quest id + claimed flags + daily points */
  dailyDay: string;
  dailyProg: Record<string, number>;
  dailyClaimed: string[];
  dailyPts: number;
  dailyChests: number[];
  /** tournaments: per event instance key → best score, claimed prize */
  events: Record<string, { best: number; claimed?: boolean; rank?: number }>;
  trophies: { gold: number; silver: number; bronze: number };
  /** purchases (IAP) */
  noAds: boolean;
  starterBought: boolean;
  passUntil: number;
  passDay: string;
  purchases: number;
  /** last time the game saved (for the welcome-back gift) */
  lastSeen: number;
  /** day the welcome-back gift was given / the daily popup was shown */
  giftDay: string;
  popDay: string;
  /** one-off / daily reward popups (entry, launch, share, invite, rate) */
  perks: { profileSeen?: boolean; avatarPicked?: boolean; entry?: boolean; launch?: boolean; shareDay?: string; inviteDay?: string; invites?: number; rated?: boolean; rateAsked?: boolean };
  /** danger-hint gestures the player has answered (hint stops after 3) */
  hintsLearned?: Record<string, number>;
}

const SETTINGS_REV = 3;

// storage key kept from the original working title so existing progress carries over
const KEY = 'xwave-sky-rush-v1';

const defaults = (): SaveData => ({
  best: 0,
  bestDistance: 0,
  wallet: 0,
  totalRuns: 0,
  vehicle: 'pearl',
  unlocked: ['pearl'],
  upgrades: { engine: 0, shield: 0, magnet: 0 },
  missions: { active: [], completed: 0, rank: 1 },
  settings: {
    sound: true,
    music: true,
    quality: 'high',
    speed: 'normal',
    assist: true,
    comfort: true,
    autoClaim: true,
  },
  settingsRev: SETTINGS_REV,
  track: 'future-city',
  trackStars: {},
  trackBest: {},
  name: '',
  pid: Math.floor(Math.random() * 1e9),
  avatar: Math.floor(Math.random() * 24),
  bolts: 0,
  pendingMissions: [],
  items: { super: 1, hyper: 0, shield: 0, escape: 1, turbo: 0, magnet: 0, double: 0, life: 0 },
  equip: { super: false, hyper: false, shield: false, escape: false, turbo: false, magnet: false, double: false, life: false },
  weekKey: '',
  weekBest: 0,
  checkDay: '',
  checkStreak: 0,
  dailyDay: '',
  dailyProg: {},
  dailyClaimed: [],
  dailyPts: 0,
  dailyChests: [],
  events: {},
  trophies: { gold: 0, silver: 0, bronze: 0 },
  noAds: false,
  starterBought: false,
  passUntil: 0,
  passDay: '',
  purchases: 0,
  lastSeen: 0,
  giftDay: '',
  popDay: '',
  perks: {},
});

export function loadSave(): SaveData {
  const d = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return d;
    const p = JSON.parse(raw) as Partial<SaveData>;
    // defaults refresh (v1.10): HIGH graphics, music and sound ON — applied once to old saves
    if (p.settingsRev !== SETTINGS_REV && p.settings) {
      p.settings.quality = 'high';
      p.settings.sound = true;
      p.settings.music = true;
    }
    return {
      ...d,
      ...p,
      upgrades: { ...d.upgrades, ...(p.upgrades ?? {}) },
      missions: { ...d.missions, ...(p.missions ?? {}) },
      settings: { ...d.settings, ...(p.settings ?? {}) },
      trackStars: { ...(p.trackStars ?? {}) },
      trackBest: { ...(p.trackBest ?? {}) },
      items: { ...d.items, ...(p.items ?? {}) },
      equip: { ...d.equip, ...(p.equip ?? {}) },
      events: { ...(p.events ?? {}) },
      perks: { ...(p.perks ?? {}) },
      trophies: { ...d.trophies, ...(p.trophies ?? {}) },
      dailyProg: { ...(p.dailyProg ?? {}) },
      dailyClaimed: Array.isArray(p.dailyClaimed) ? p.dailyClaimed : [],
      dailyChests: Array.isArray(p.dailyChests) ? p.dailyChests : [],
      unlocked: Array.isArray(p.unlocked) && p.unlocked.length ? p.unlocked : d.unlocked,
      // older saves may hold an auto-detected LOW: start on HIGH once, then respect the player's choice
      ...(p.settingsRev !== SETTINGS_REV ? { settingsRev: SETTINGS_REV } : {}),
    };
  } catch {
    return d;
  }
}

export function writeSave(s: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable — progress lives for this session only */
  }
}

/** Local calendar day key (YYYY-MM-DD) — dailies reset at the player's midnight. */
export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Monday 00:00 local of the week containing d. */
export function weekStart(d = new Date()) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
  return s;
}

/** Week key = date of its Monday. */
export function weekKey(d = new Date()) {
  return dayKey(weekStart(d));
}
