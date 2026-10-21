import { countryName, detectCountry, flagOf, guessCountry } from './meta/Country.ts';
import * as THREE from 'three';
import { AUTOPILOT, DEBUG, HEIGHT, LANES, LEVELS, LEFTOVER_POINTS, SPEED, TIMING, TRACK_ITEM_BONUS, TYRE, EXP, WORLD_LENGTH, type SpeedLevel } from './config.ts';
import { clamp, damp } from './core/math.ts';
import { Input, type Action } from './core/Input.ts';
import { loadSave, writeSave, type SaveData } from './core/Save.ts';
import { World, type WorldEvent } from './gameplay/World.ts';
import { Run, type Feedback, SHIELD_HITS } from './gameplay/Run.ts';
import { MissionTracker, type MissionStat } from './gameplay/Missions.ts';
import { Autopilot } from './gameplay/Autopilot.ts';
import { speedAt, worldAt, WORLDS, type WorldId } from './gameplay/Spawner.ts';
import { Renderer } from './render/Renderer.ts';
import { CameraRig } from './render/CameraRig.ts';
import { Vehicle, SKINS, carVisibility } from './render/Vehicle.ts';
import { CarShatter } from './render/Shatter.ts';
import { Track } from './render/Track.ts';
import { Scenery } from './render/Scenery.ts';
import { ObstacleViews } from './render/ObstacleViews.ts';
import { PickupViews, POWER_COLORS } from './render/PickupViews.ts';
import { READABILITY, COMFORT } from './render/Readability.ts';
import { setObstacleContrast, OBSTACLE_FX } from './render/ObstacleViews.ts';
import { Particles, SpeedLines, RingPulses, Debris, makeShield, makePortal } from './render/Effects.ts';
import { Audio } from './audio/Audio.ts';
import { AssetLoader } from './assets/AssetLoader.ts';
import { UI, UPGRADE_MAX, upgradeCost, type UpgradeKey } from './ui/UI.ts';
import { ICON } from './ui/icons.ts';
import { COURSES, courseById, sectionAt, trackLock, type Course } from './gameplay/Courses.ts';
import { makeArch } from './render/Arches.ts';
import { rowMasks } from './gameplay/ObstacleRules.ts';
import { Ads, ADS } from './ads/Ads.ts';
import { advancedScript, basicScript, boostScript, WORLD_LESSONS, type BoostKind, type TrainingScript, type TutorialStep } from './gameplay/Tutorial.ts';
import { PASS_H, PASS_L, PASS_N } from './gameplay/types.ts';
import { MAPS, TIER_NAME, type Tier } from './gameplay/Difficulty.ts';
import { FAIRNESS } from './config.ts';
import { RANK_ORDER, rankDist } from './gameplay/Difficulty.ts';
import type { Box, PickupKind, RowSpec } from './gameplay/types.ts';
import { Meta, type EventResult, type RunSummary } from './meta/Meta.ts';
import { schedule, fmtLeft, localTime, prizesFor, cupFor } from './meta/Events.ts';
import { classFor, classProgress, CLASSES, CLASS_MIN, XPT as XPT_ICON, type RankClass } from './meta/Rank.ts';
import type { RunRewards } from './ui/UI.ts';
import { crashTip, type CrashTip } from './gameplay/CrashTip.ts';
import { createStore, weekBoard, type PlayerStore } from './net/PlayerStore.ts';
import { hashStr } from './meta/Leaderboard.ts';
import { classForScore } from './meta/Rank.ts';
import { avatarForName } from './ui/avatars.ts';
import { productBySku, DemoStore, type Store } from './meta/Shop.ts';
import type { ItemKey, Reward } from './meta/Daily.ts';
import { ITEM_PRICE, UNLOCK_BOOSTS } from './meta/Daily.ts';
import { dayKey } from './core/Save.ts';

const VERSION = 'v2.0.2';
/** coins for one Roadster Jump bought on the spot (training / blockade) */
const ROCKET_PRICE = 250;
/** welcome-back gift after this many hours away */
const WELCOME_AFTER_H = 12;
const WELCOME_GIFT = { coins: 200, shield: 1 };
/** coin rewards of the perk popups (one-off: entry, launch · daily: share, invite) */
const PERK = { entry: 300, launch: 300, share: 300, invite: 100 };
type PerkKind = 'entry' | 'launch' | 'share' | 'invite' | 'rate' | 'addscreen' | 'offline';

type State = 'loading' | 'menu' | 'garage' | 'missions' | 'tracks' | 'countdown' | 'run' | 'paused' | 'dying' | 'continue' | 'respawn' | 'finish' | 'gameover';

const WORLD_NAMES: Record<WorldId, string> = {
  city: 'FUTURE CITY',
  tunnel: 'NEON TUNNEL',
  cloud: 'CLOUD CITY',
  space: 'SPACE ZONE',
  mega: 'XWAVE MEGACITY',
};

const POWER_LABEL: Record<Exclude<PickupKind, 'coin'>, string> = {
  shield: 'SHIELD',
  magnet: 'MAGNET',
  turbo: 'TURBO BOOST',
  double: 'DOUBLE SCORE',
  life: 'EXTRA LIFE',
  super: 'ROADSTER JUMP',
  dash: 'AIR DASH',
  escape: 'SKY ESCAPE',
};

const POWER_SUB: Record<Exclude<PickupKind, 'coin'>, string> = {
  shield: '',
  magnet: 'coins fly to you',
  turbo: 'smash through obstacles',
  double: 'every coin ×2',
  life: '+1 heart',
  super: 'tap ROADSTER to launch',
  dash: 'flip across 2 lanes',
  escape: 'tap SOS to fly up',
};

const POWER_ICON: Record<Exclude<PickupKind, 'coin'>, string> = {
  shield: ICON.shield,
  magnet: ICON.magnet,
  turbo: ICON.bolt,
  double: ICON.x2,
  life: ICON.heart,
  super: ICON.rocket,
  dash: ICON.dash,
  escape: ICON.sos,
};

/**
 * Orchestrator: owns the state machine and wires pure gameplay (World/Run/
 * Missions) to rendering, audio and UI. No gameplay rules live here.
 */
export class Game {
  state: State = 'loading';
  save: SaveData = loadSave();
  world = new World();
  run!: Run;
  missions: MissionTracker;
  input: Input;
  audio = new Audio();
  assets = new AssetLoader();
  ui: UI;

  rig = new CameraRig();
  renderer: Renderer;
  vehicle = new Vehicle();
  track = new Track();
  scenery: Scenery;
  obstacleViews: ObstacleViews;
  pickupViews: PickupViews;
  particles: Particles;
  /** soft (non-glowing) smoke & dust */
  smoke: Particles;
  speedLines = new SpeedLines();
  rings = new RingPulses();
  debris = new Debris();
  private speedBlurS = 0;
  /** game-over: the car render breaks into shards */
  shatter = new CarShatter();
  shield = makeShield();
  portal = makePortal();
  private autopilot = AUTOPILOT ? new Autopilot() : null;
  /** current track (null = endless) */
  course: Course | null = null;
  private startArch = makeArch('start');
  private finishArch = makeArch('finish');
  private sectionName = '';
  private livesLost = 0;
  private finishShown = false;
  private runTime = 0;
  private superRolled = false;
  /** a Roadster/HYPER flight is in progress → landing shockwave clears the road ahead */
  private superFlight = false;
  /** car blockade rows injected while the player holds a rocket jump */
  private blockade: RowSpec[] | null = null;
  private nextBlockadeAt = 420;
  private blockadeWarned = false;
  // ---- monetisation (rewarded / interstitial)
  ads!: Ads;
  private continuesUsed = 0;
  private adContinueUsed = false;
  private nextBoost = false;
  private lastResult = { coins: 0, reward: 0, doubled: false };
  /** first-run pilot training */
  private tutorialMode = false;
  private tutStep = 0;
  private tutHint = 0;
  private tutPrompting = false;
  /** active training script (basic, or an advanced world tour) */
  private tut: TrainingScript = basicScript();
  private trainWorld: WorldId | null = null;
  // danger assist (arrow when a crash is imminent)
  private dangerHint: string | null = null;
  private dangerHold = 0;
  private timeScale = 1;
  private timeScaleTarget = 1;
  /** remaining real seconds of slow motion */
  private slowmoT = 0;
  private slowmoDone = false;
  // ---- live-ops
  meta: Meta;
  store: Store;
  private rankTab: 'week' | 'all' = 'week';
  private cupBoardOpen = false;
  private pendingRes: EventResult[] = [];
  /** where "back" goes from a page opened on top of something (shop from continue / garage / tracks) */
  private returnTo: (() => void) | null = null;
  /** freeze the continue countdown while the shop is open */
  private holdContinue = false;

  private clock = new THREE.Clock();
  private time = 0;
  private stateT = 0;
  private speedScale = 1;
  private countdownStep = -1;
  private runMissionsDone: { text: string; reward: number }[] = [];
  /** v2: rank reached by the current run's EXP (for the in-run rank-up notice) */
  private runRank: RankClass = 'D';
  /** v2: personal-best EXP already beaten in this run (notice shown once) */
  private runBeatBest = false;
  /** run started with ?rank=… (test shortcut) — its EXP is not saved */
  private debugStart = false;
  /** last rank gate announced in this run */
  private gateShown = '';
  private menuDist = 0;
  private tmpV = new THREE.Vector3();
  private frameTimes: number[] = [];
  private qualityChecked = 0;
  private fps = 60;
  private debugBoxes: THREE.LineSegments | null = null;
  /** last collision, explained (debug overlay) */
  private lastHit = '—';
  private tutorialT = 0;

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container, this.save.settings.quality, this.rig.camera);
    this.vehicle.camera = this.rig.camera;
    const scene = this.renderer.scene;
    this.scenery = new Scenery(scene);
    scene.add(this.scenery.group, this.track.group, this.vehicle.root);
    const worldRoot = new THREE.Group();
    scene.add(worldRoot);
    this.obstacleViews = new ObstacleViews(worldRoot);
    this.pickupViews = new PickupViews(worldRoot);
    this.particles = new Particles(this.renderer.pixelRatio);
    this.smoke = new Particles(this.renderer.pixelRatio, false);
    this.renderer.scene.add(this.smoke.points);
    scene.add(this.particles.points, this.speedLines.lines, this.rings.group, this.debris.group, this.shatter.group, this.shield.mesh, this.portal.group, this.startArch, this.finishArch);

    this.world.hooks = {
      spawnObstacle: (o) => this.obstacleViews.spawn(o),
      despawnObstacle: (o) => this.obstacleViews.despawn(o),
      spawnPickup: (p) => this.pickupViews.spawn(p),
      despawnPickup: (p) => this.pickupViews.despawn(p),
    };
    this.wirePlayerEvents();

    this.meta = new Meta(this.save);
    this.missions = new MissionTracker(this.save.missions.active, this.save.missions.completed);
    this.missions.onComplete = (m) => {
      if (this.save.settings.autoClaim !== false) this.save.wallet += m.reward;
      else this.save.pendingMissions.push({ text: m.text, reward: m.reward });
      this.save.missions.completed = this.missions.completed;
      this.runMissionsDone.push({ text: m.text, reward: m.reward });
      this.ui.toast(`${ICON.check} MISSION COMPLETE · ${m.text} <span class="price">${ICON.coin}+${m.reward}</span>`, 'var(--green)');
      this.audio.play('mission');
      // (no ground roll — the car only flips in the air)
      this.persist();
    };

    this.input = new Input(container);
    this.input.onAction = (a) => this.onAction(a);
    this.input.onSpecial = () => this.useEscape();
    this.input.onRocket = () => this.useRocket();
    this.world.player.canAirDash = () => !!this.run && this.run.dashes > 0;
    this.input.onPause = () => (this.state === 'run' ? this.pause() : this.state === 'paused' ? this.resume() : undefined);

    this.ui = new UI(container, {
      play: () => {
        this.returnTo = null;
        this.afterResults(() => (this.save.tutorialDone ? this.openTracks() : this.openTutorialIntro()));
      },
      help: () => this.openTutorialIntro(),
      startTutorial: () => this.startTutorial(),
      advTrain: (w) => this.startTutorial(w as WorldId),
      skipTutorial: () => {
        this.save.tutorialDone = true;
        this.persist();
        this.openTracks();
      },
      startTrack: (id) => this.startTrack(id),
      setSpeed: (lv) => this.setSpeed(lv),
      nextTrack: () => this.afterResults(() => this.nextTrack()),
      garage: () => this.openGarage(),
      missions: () => this.openMissions(),
      home: () => {
        const back = this.returnTo;
        this.returnTo = null;
        if (back) return back();
        this.afterResults(() => this.goHome());
      },
      settings: () => this.openSettings(),
      closeModal: () => this.showHome(),
      daily: () => this.openDaily(),
      events: () => this.openEvents(),
      ranks: () => this.openRanks(),
      shop: () => this.openShop(),
      guide: () => {
        this.audio.play('click');
        this.ui.show('start', 'guide');
      },
      checkIn: () => this.doCheckIn(),
      claimQuest: (id) => this.claim(this.meta.claimQuest(id), 'Quest reward', () => this.openDaily(true)),
      claimChest: (i) => this.claim(this.meta.claimChest(i), 'Chest opened', () => this.openDaily(true)),
      claimPass: () => this.claim(this.meta.claimPass(), 'XWAVE Pass', () => this.openDaily(true)),
      raceCup: () => {
        const c = this.meta.myCup();
        if (c) this.startTrack(c.cup.track);
        else this.ui.toast(`${ICON.clock} Next cup ${localTime(schedule().next.start)} · in ${fmtLeft(schedule().next.start - Date.now())}`);
      },
      profile: () => this.openProfile(),
      viewPlayer: (i) => this.ui.showPlayer(i),
      boostInfo: (k) => this.openBoostInfo(k as ItemKey),
      bag: () => this.openBag(),
      boostTrain: (k) => this.startBoostTraining(k as BoostKind),
      toggleAutoClaim: () => {
        this.save.settings.autoClaim = this.save.settings.autoClaim === false;
        this.persist();
        this.audio.play('click');
        this.openMissions();
      },
      claimMission: (i) => this.claimMissions(i),
      cupBoard: () => {
        this.cupBoardOpen = !this.cupBoardOpen;
        this.openEvents(true);
      },
      buy: (sku) => void this.buy(sku),
      restore: () => {
        this.ui.toast(`${ICON.bag} Purchases restored (${this.save.purchases})`);
      },
      setName: (n) => this.setName(n),
      equip: (k) => this.equip(k),
      rankTab: (t) => {
        this.rankTab = t;
        this.openRanks(true);
      },
      claimResults: () => this.claimResults(),
      share: () => void this.share(),
      sos: () => this.useEscape(),
      rocket: () => this.useRocket(),
      popAction: (a) => this.popAction(a),
      freePop: () => this.openAdPopup(),
      perk: (k) => this.openPerk(k as PerkKind, true),
      buyBoost: (key) => {
        const k = key as ItemKey;
        const u = UNLOCK_BOOSTS.find((x) => x.k === k);
        if (u && CLASSES.indexOf(classFor(this.save.expBest)) < CLASSES.indexOf(u.cls)) return;
        const price = ITEM_PRICE[k];
        if (price === undefined || this.save.wallet < price) return;
        this.save.wallet -= price;
        this.save.items[k]++;
        this.persist();
        this.audio.play('power');
        this.ui.refreshProfile(this.save);
        this.ui.tracksSync(this.save, this.meta.myCup()?.cup.track);
        this.ui.boostSync(k, this.save.items[k], this.save.equip[k], this.save.wallet);
        if (this.ui.isShown('bag')) this.ui.bagSync(this.save);
      },
      setLang: (code) => {
        this.save.settings.lang = code;
        this.persist();
        this.audio.play('click');
        this.ui.applyLang(code);
      },
      dailyPop: () => {
        this.audio.play('click');
        this.openDailyPopup();
      },
      rocketFix: (how) => this.resolveNeedRocket(how),
      setCountry: (code) => {
        this.save.country = code;
        this.save.countryAuto = false;
        this.persist();
        this.audio.play('click');
        this.syncProfile();
        this.ui.toast(`${flagOf(code)} Country set to ${countryName(code)}`);
      },
      setAvatar: (i) => {
        this.save.avatar = i;
        this.save.perks.avatarPicked = true;
        this.persist();
        this.audio.play('click');
        this.ui.settingsSync(this.save, this.meta.name, VERSION);
        this.syncProfile();
      },
      randomAvatar: () => {
        let i = this.save.avatar;
        while (i === this.save.avatar) i = Math.floor(Math.random() * 24);
        this.save.avatar = i;
        this.save.perks.avatarPicked = true;
        this.persist();
        this.audio.play('power');
        this.ui.settingsSync(this.save, this.meta.name, VERSION);
        this.syncProfile();
      },
      pause: () => this.pause(),
      resume: () => this.resume(),
      retry: () => this.afterResults(() => this.startRun()),
      continueAd: () => void this.continueByAd(),
      continueCoins: () => this.continueByCoins(),
      continueNo: () => this.gameOver(),
      adDouble: () => void this.adDouble(),
      adFreeCoins: () => void this.adFreeCoins(),
      adBoost: () => void this.adBoost(),
      selectSkin: (id) => this.selectSkin(id),
      buySkin: (id) => this.buySkin(id),
      upgrade: (k) => this.buyUpgrade(k),
      toggleSound: () => this.toggleSound(),
      toggleMusic: () => this.toggleMusic(),
      toggleQuality: () => this.toggleQuality(),
      toggleAssist: () => this.toggleAssist(),
      toggleComfort: () => this.toggleComfort(),
      toggleVibrate: () => {
        this.save.settings.vibrate = this.save.settings.vibrate === false;
        this.persist();
        this.audio.play('click');
        this.vibrate(30);
        this.ui.refreshProfile(this.save);
      },
      previewSkin: (id) => this.previewSkin(id),
    });

    this.store = new DemoStore(container);
    this.ads = new Ads(container, {
      pause: () => this.audio.duck(true),
      resume: () => this.audio.duck(false),
    });

    this.audio.setSfx(this.save.settings.sound);
    this.audio.setMusic(this.save.settings.music);
    this.applySkin(this.save.vehicle);

    const resize = () => this.onResize();
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'run') this.pause();
    });
    // unlock audio on first gesture anywhere
    const unlock = () => {
      this.audio.unlock();
      this.audio.startMusic();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    window.addEventListener('touchstart', unlock, { once: true });

    if (DEBUG) this.makeDebugBoxes();
    this.onResize();
    (window as unknown as { __xwave: Game }).__xwave = this;
  }

  /** country: offline guess right away, then IP detection once (until the player picks one) */
  private initCountry() {
    if (!this.save.country) {
      this.save.country = guessCountry();
      this.persist();
    }
    if (!this.save.countryAuto || this.save.perks.countryDetected) return;
    void detectCountry().then((c) => {
      this.save.perks.countryDetected = true;
      if (c && this.save.countryAuto) this.save.country = c;
      this.persist();
    });
  }

  async boot() {
    this.ui.setLoading(0.15);
    this.initCountry();
    // prewarm pools & compile shaders up-front so the first obstacles don't hitch
    this.obstacleViews.prewarm();
    this.pickupViews.prewarm();
    await this.assets.loadAll(this.audio, (k) => this.ui.setLoading(0.15 + k * 0.5));
    const car = this.assets.model('vehicle.xwave');
    if (car) this.vehicle.useModel(car);
    this.ui.setLoading(0.75);
    this.world.reset(1234);
    this.world.player.reset(1);
    this.scenery.setWorld('city', true);
    this.track.setAccent(this.scenery.accent);
    this.applyReadability();
    this.renderer.renderer.compile(this.renderer.scene, this.rig.camera);
    this.ui.setLoading(1);
    this.ui.setLoadingText('Ready');
    // let the loading key art be seen (≥1.6 s from page start), never a blank flash
    await new Promise((r) => window.setTimeout(r, Math.max(0, 2200 - performance.now())));
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installPrompt = e as unknown as { prompt(): Promise<void> };
    });
    window.addEventListener('offline', () => {
      if (this.state === 'menu') this.openPerk('offline');
    });
    window.addEventListener('online', () => {
      if (this.ui.isShown('popup')) this.ui.closePopup();
    });
    this.ui.applyLang(this.save.settings.lang ?? 'en');
    const prevSeen = this.save.lastSeen;
    void this.seedDb();
    this.goHome();
    window.setTimeout(() => this.launchPopups(prevSeen), 700);
    this.clock.start();
    this.renderer.renderer.setAnimationLoop(() => this.frame());
  }

  // =============================================================== states
  private setState(s: State) {
    this.state = s;
    this.stateT = 0;
  }

  goHome() {
    this.audio.play('click');
    this.tutorialMode = false;
    this.tutPrompting = false;
    this.timeScale = this.timeScaleTarget = 1;
    this.ui.tutPrompt(null);
    this.setState('menu');
    this.rig.mode = 'menu';
    this.input.enabled = false;
    this.clearRunVisuals();
    this.world.reset(Math.floor(Math.random() * 1e9));
    this.world.player.reset(1);
    this.applySkin(this.save.vehicle);
    this.vehicle.visibleBlink = true;
    this.scenery.setWorld('city', true);
    this.track.setAccent(this.scenery.accent);
    this.applyReadability();
    this.track.setOpenAir(true);
    this.ui.tutorial(false);
    this.audio.intensity = 0;
    this.returnTo = null;
    this.showHome();
    this.pendingRes = this.meta.pendingResults();
    if (this.pendingRes.length) {
      this.ui.eventResults(this.pendingRes);
      this.ui.show('start', 'eventres');
    }
  }

  /** Home screen without resetting the world (closing a modal / page). */
  showHome() {
    this.vehicle.resetFx();
    if (this.state !== 'menu') this.setState('menu');
    this.rig.mode = 'menu';
    this.meta.rollover();
    this.ui.refreshProfile(this.save);
    this.ui.freeCoins(this.freeCoinsLeft(), ADS.freeCoinsAmount);
    const cup = this.meta.myCup();
    const next = this.meta.nextCup();
    const best = cup ? this.meta.cupBest(cup) : 0;
    this.ui.myClass = this.meta.cls;
    this.ui.homeSync({
      name: this.meta.name,
      color: this.meta.color,
      best: this.save.best,
      avatar: this.save.avatar,
      bolts: this.save.expBest,
      weekRank: this.save.weekBest > 0 ? this.meta.weekly().you.rank : null,
      dailyBadge: this.meta.dailyBadge(),
      cup: cup
        ? { live: true, name: cup.cup.name, div: cup.division, color: cup.cup.color, text: `ends in ${fmtLeft(cup.end - Date.now())}`, rank: best > 0 ? this.meta.cupBoard(cup).you.rank : null }
        : { live: false, name: next.cup.name, div: next.division, color: next.cup.color, text: `starts ${localTime(next.start)} · in ${fmtLeft(next.start - Date.now())}`, rank: null },
      sale: !this.save.starterBought,
      pass: this.meta.passActive,
    });
    this.perkBadges();
    this.ui.show('start');
  }

  // =============================================================== live-ops screens
  private openSettings() {
    this.audio.play('click');
    this.ui.settingsSync(this.save, this.meta.name, VERSION);
    this.ui.show('start', 'settings');
  }

  private openDaily(quiet = false) {
    if (!quiet) this.audio.play('click');
    if (this.state !== 'menu') this.setState('menu');
    const ci = this.meta.checkinState();
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
    this.ui.dailySync({
      ...ci,
      quests: this.meta.quests(),
      pts: this.save.dailyPts,
      chests: this.save.dailyChests,
      resetIn: fmtLeft(midnight - now.getTime()),
      pass: { active: this.meta.passActive, claimed: this.save.passDay === dayKey(), days: Math.ceil((this.save.passUntil - Date.now()) / 86400000) },
    });
    this.ui.refreshProfile(this.save);
    this.ui.show('daily');
  }

  private openEvents(quiet = false) {
    if (!quiet) this.audio.play('click');
    const sc = schedule();
    const cls = this.meta.cls;
    const mine = sc.live ? cupFor(sc.live, cls) : cupFor(sc.next, cls);
    const board = this.meta.cupBoard(mine);
    const best = this.meta.cupBest(mine);
    const session = sc.live ?? sc.next;
    this.ui.eventsSync({
      cls,
      bolts: this.save.expBest,
      live: !!sc.live,
      mine,
      now: Date.now(),
      best,
      rank: best > 0 ? board.you.rank : null,
      total: board.total,
      divisions: CLASSES.map((d) => ({ div: d, cup: cupFor(session, d), open: d === cls, need: CLASS_MIN[d] })),
      prizes: prizesFor(cls),
      upcoming: sc.upcoming.map((s) => ({ start: s.start, cup: cupFor(s, cls) })),
      trophies: this.save.trophies,
      boardOpen: this.cupBoardOpen,
      board,
    });
    this.ui.refreshProfile(this.save);
    this.ui.show('events');
  }

  private openRanks(quiet = false) {
    if (!quiet) this.audio.play('click');
    const board = this.rankTab === 'week' ? this.meta.weekly() : this.meta.allTime();
    this.ui.ranksSync(board, this.rankTab, `${this.rankTab === 'week' ? 'Weekly board resets Monday 00:00' : 'All-time best scores'} · rival pilots are demo data until online ranking goes live`);
    this.ui.refreshProfile(this.save);
    this.ui.show('ranks');
  }

  private openShop() {
    this.audio.play('click');
    // remember where to come back to when the shop opens on top of a run / garage / tracks
    if (this.state === 'continue') {
      this.holdContinue = true;
      this.returnTo = () => {
        this.holdContinue = false;
        const cost = ADS.continueCoinCost * Math.pow(2, this.continuesUsed);
        this.ui.continueOffer({ adOk: !this.adContinueUsed, cost, canAfford: this.save.wallet + this.run.coins >= cost, tip: this.lastTip });
        this.ui.continueTick(Math.max(0, 1 - this.stateT / ADS.continueSeconds), ADS.continueSeconds - this.stateT);
      };
    } else if (this.state === 'garage') this.returnTo = () => this.openGarage();
    else if (this.state === 'tracks') this.returnTo = () => this.openTracks();
    else if (this.state === 'gameover') this.returnTo = () => this.ui.show('gameover');
    this.ui.shopSync(this.save);
    this.ui.show('shop');
  }

  private claim(r: Reward | null, title: string, then: () => void) {
    if (!r) return;
    this.persist();
    this.audio.play('mission');
    this.ui.rewardToast(title, r);
    then();
  }

  // ------------------------------------------------------------- player database (bots + real)
  /** local DB today, HTTP server later (?api=…) — see src/net/PlayerStore.ts and /server */
  private db: PlayerStore = createStore();

  private selfId() {
    return `p-${this.save.pid}`;
  }

  /** first launch: store the rival pilots as bot rows so boards/profiles read from one table */
  private async seedDb() {
    try {
      if (await this.db.getPlayer('bot-seeded')) return;
      const now = Date.now();
      for (const r of this.meta.allTime().rows) {
        if (r.you) continue;
        const id = `bot-${hashStr(r.name)}`;
        await this.db.upsertPlayer({ id, name: r.name, avatar: r.av ?? avatarForName(r.name), flag: r.flag, isBot: true, cls: classForScore(r.score), xp: Math.round(r.score / 9), best: r.score, runs: 0, car: 'pearl', trophies: { gold: 0, silver: 0, bronze: 0 }, createdAt: now, lastSeen: now });
        await this.db.submitScore({ playerId: id, board: 'all', score: r.score, at: now });
      }
      await this.db.upsertPlayer({ id: 'bot-seeded', name: '_seed', avatar: 0, flag: '', isBot: true, cls: 'D', xp: 0, best: 0, runs: 0, car: '', trophies: { gold: 0, silver: 0, bronze: 0 }, createdAt: now, lastSeen: now });
    } catch {
      /* offline / storage blocked: the game keeps working from the sample boards */
    }
  }

  /** write this pilot + their run to the DB (best score per board) */
  private async syncDb(score: number, cupKey: string | null) {
    try {
      const now = Date.now();
      const id = this.selfId();
      await this.db.upsertPlayer({ id, name: this.meta.name, avatar: this.save.avatar, flag: flagOf(this.save.country), isBot: false, cls: this.meta.cls, xp: this.save.expBest, best: this.save.best, runs: this.save.totalRuns, car: this.save.vehicle, trophies: { ...this.save.trophies }, createdAt: now, lastSeen: now });
      const s = Math.floor(score);
      await this.db.submitScore({ playerId: id, board: 'all', score: s, at: now });
      await this.db.submitScore({ playerId: id, board: weekBoard(), score: s, at: now });
      if (cupKey) await this.db.submitScore({ playerId: id, board: `cup:${cupKey}`, score: s, at: now });
    } catch {
      /* ignore: sync is best-effort */
    }
  }

  // ------------------------------------------------------------- reward popups
  /** on launch: welcome-back gift after a break, else today's daily reward (once a day) */
  private launchPopups(prevSeen: number) {
    if (this.state !== 'menu' || !this.ui.isShown('start') || this.ui.isShown('eventres') || !this.save.tutorialDone) return;
    const today = new Date().toISOString().slice(0, 10);
    if (prevSeen > 0 && Date.now() - prevSeen > WELCOME_AFTER_H * 3600_000 && this.save.giftDay !== today) {
      this.ui.popup('gift', { coins: WELCOME_GIFT.coins, shield: WELCOME_GIFT.shield, hours: Math.floor((Date.now() - prevSeen) / 3600_000) });
      return;
    }
    // a gentle rating ask after 8 runs (once, never rewarded — store rules)
    if (!this.save.perks.rateAsked && !this.save.perks.rated && this.save.totalRuns >= 8) {
      this.save.perks.rateAsked = true;
      this.persist();
      this.openPerk('rate');
      return;
    }
    if (this.save.popDay !== today && !this.meta.checkinState().claimedToday) {
      this.save.popDay = today;
      this.persist();
      this.openDailyPopup();
    }
  }

  private openDailyPopup() {
    const st = this.meta.checkinState();
    this.ui.popup('daily', { slot: st.slot, claimed: st.claimedToday, streak: st.streak });
  }

  private openAdPopup() {
    this.audio.play('click');
    this.ui.popup('ad', { left: this.freeCoinsLeft(), amount: ADS.freeCoinsAmount, noAds: this.save.noAds });
  }

  // ------------------------------------------------------------- perk popups (entry · launch · share · invite · rate · add-to-screen · offline)
  private installPrompt: { prompt(): Promise<void> } | null = null;

  private get standalone() {
    try {
      return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    } catch {
      return false;
    }
  }

  private perkState() {
    const k = this.save.perks;
    const today = new Date().toISOString().slice(0, 10);
    return {
      entrySteps: [!!k.profileSeen, !!this.save.name, !!k.avatarPicked],
      entry: !!k.entry,
      launch: !!k.launch,
      standalone: this.standalone,
      shareToday: k.shareDay === today,
      inviteToday: k.inviteDay === today,
      invites: k.invites ?? 0,
      canInstall: !!this.installPrompt,
      online: navigator.onLine !== false,
    };
  }

  /** badges on the home side buttons */
  private perkBadges() {
    const st = this.perkState();
    this.ui.perkBadges({
      entry: st.entry ? 'done' : st.entrySteps.every(Boolean) ? 'ready' : 'todo',
      launch: st.launch ? 'done' : st.standalone ? 'ready' : 'todo',
      share: st.shareToday ? 'done' : 'ready',
    });
  }

  private openPerk(kind: PerkKind, click = false) {
    if (click) this.audio.play('click');
    this.ui.popup(kind, { ...this.perkState(), avatar: this.save.avatar, name: this.save.name, entryReward: PERK.entry, launchReward: PERK.launch, shareReward: PERK.share, inviteReward: PERK.invite });
  }

  private grantCoins(n: number, title: string) {
    this.save.wallet += n;
    this.persist();
    this.audio.play('mission');
    this.ui.rewardToast(title, { coins: n });
    this.ui.refreshProfile(this.save);
  }

  private async shareLink(kind: 'share' | 'invite') {
    const url = `${location.origin}${location.pathname}${kind === 'invite' ? `?ref=${this.save.pid.toString(36)}` : ''}`;
    const text = kind === 'invite' ? `Race me in Sky Roadster! Join with my link and we both get ${PERK.invite} coins.` : `I'm racing in Sky Roadster — best score ${this.save.best.toLocaleString('en-US')}. Can you beat me?`;
    try {
      if (navigator.share) await navigator.share({ title: 'Sky Roadster', text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        this.ui.toast(`${ICON.share} Link copied — paste it to a friend`);
      }
      return true;
    } catch {
      return false; // share sheet dismissed
    }
  }

  private popAction(a: string) {
    if (a.startsWith('go:')) return this.openPerk(a.slice(3) as PerkKind, true);
    const today = new Date().toISOString().slice(0, 10);
    const k = this.save.perks;
    if (a === 'entry') {
      if (k.entry || !this.perkState().entrySteps.every(Boolean)) return;
      k.entry = true;
      this.grantCoins(PERK.entry, 'Entry reward');
      this.ui.closePopup();
      this.perkBadges();
      return;
    }
    if (a === 'launch') {
      if (k.launch || !this.standalone) return;
      k.launch = true;
      this.grantCoins(PERK.launch, 'Launch reward');
      this.ui.closePopup();
      this.perkBadges();
      return;
    }
    if (a === 'share' || a === 'invite') {
      void this.shareLink(a).then((ok) => {
        if (!ok) return;
        if (a === 'share' && k.shareDay !== today) {
          k.shareDay = today;
          this.grantCoins(PERK.share, 'Share reward');
        } else if (a === 'invite' && k.inviteDay !== today) {
          k.inviteDay = today;
          k.invites = (k.invites ?? 0) + 1;
          this.grantCoins(PERK.invite, 'Invite sent');
        }
        this.persist();
        this.perkBadges();
        if (this.ui.isShown('popup')) this.openPerk(a);
      });
      return;
    }
    if (a.startsWith('rate')) {
      const stars = Number(a.slice(4)) || 5;
      k.rated = true;
      this.persist();
      this.ui.closePopup();
      this.ui.toast(stars >= 4 ? `${ICON.check} Thank you for the ${stars}★!` : `${ICON.check} Thanks — we'll keep improving`, 'var(--gold)');
      return;
    }
    if (a === 'install') {
      const ip = this.installPrompt;
      this.installPrompt = null;
      void ip?.prompt();
      return;
    }
    if (a === 'retry') {
      if (navigator.onLine !== false) {
        this.ui.closePopup();
        this.ui.toast(`${ICON.check} Back online`);
      } else this.ui.toast('Still offline — check Wi-Fi or mobile data', 'var(--red)');
      return;
    }
    if (a === 'claimdaily') {
      const r = this.meta.checkIn();
      this.claim(r, 'Daily reward', () => this.openDailyPopup());
      // (no ground roll — the car only flips in the air)
      this.showHomeKeep('popup');
    } else if (a === 'watchad') {
      void this.adFreeCoins().then(() => {
        if (this.ui.isShown('popup')) this.openAdPopup();
      });
    } else if (a === 'gift') {
      const today = new Date().toISOString().slice(0, 10);
      if (this.save.giftDay === today) return;
      this.save.giftDay = today;
      this.save.wallet += WELCOME_GIFT.coins;
      this.save.items.shield += WELCOME_GIFT.shield;
      this.persist();
      this.audio.play('mission');
      this.ui.rewardToast('Welcome back gift', { coins: WELCOME_GIFT.coins, items: { shield: WELCOME_GIFT.shield } });
      this.ui.closePopup();
      this.showHome();
      // then today's daily reward, if still open
      if (!this.meta.checkinState().claimedToday) window.setTimeout(() => this.openDailyPopup(), 500);
    }
  }

  /** refresh home under an open overlay */
  private showHomeKeep(id: string) {
    this.showHome();
    this.ui.show('start', id);
  }

  private doCheckIn() {
    const r = this.meta.checkIn();
    this.claim(r, 'Check-in', () => this.openDaily(true));
    // (no ground roll — the car only flips in the air)
  }

  private async buy(sku: string) {
    const p = productBySku(sku);
    if (!p) return;
    this.audio.play('click');
    const ok = await this.store.purchase(p);
    if (!ok) return;
    const g = p.grant;
    this.meta.grant(g);
    if (g.noAds) this.save.noAds = true;
    if (g.starter) this.save.starterBought = true;
    if (g.passDays) this.save.passUntil = Math.max(Date.now(), this.save.passUntil) + g.passDays * 86400000;
    this.save.purchases++;
    this.persist();
    this.audio.play('mission');
    this.ui.toast(`${ICON.check} ${p.name} · thank you!`, 'var(--gold)');
    this.ui.shopSync(this.save);
    this.ui.refreshProfile(this.save);
  }

  private setName(n: string) {
    const name = n.replace(/[^\p{L}\p{N} _.\-]/gu, '').trim().slice(0, 14);
    this.save.name = name;
    this.persist();
    this.ui.toast(`${ICON.user} Pilot name: ${this.meta.name}`);
    this.ui.settingsSync(this.save, this.meta.name, VERSION);
    this.syncProfile();
  }

  /** refresh the open profile card + home chip after a name/avatar change */
  private syncProfile() {
    const prof = this.ui.isShown('profile');
    if (this.ui.isShown('start')) this.showHome();
    if (prof) {
      this.openProfile(false);
      this.ui.show('start', 'profile');
    }
  }

  private equip(k: ItemKey) {
    if (this.save.items[k] <= 0) return;
    this.save.equip[k] = !this.save.equip[k];
    this.persist();
    this.audio.play(this.save.equip[k] ? 'power' : 'click');
    this.ui.tracksSync(this.save, this.meta.myCup()?.cup.track);
    if (this.ui.isShown('boostinfo')) this.ui.boostSync(k, this.save.items[k], this.save.equip[k], this.save.wallet);
    if (this.ui.isShown('bag')) this.ui.bagSync(this.save);
  }

  private claimResults() {
    for (const r of this.pendingRes) this.meta.claimResult(r);
    this.pendingRes = [];
    this.persist();
    this.audio.play('mission');
    // (no ground roll — the car only flips in the air)
    this.showHome();
  }

  private async share() {
    const score = this.state === 'finish' || this.state === 'gameover' ? Math.floor(this.run?.score ?? 0) : this.save.best;
    const text = `I scored ${score.toLocaleString('en-US')} in Sky Roadster! Can you beat me?`;
    try {
      if (navigator.share) await navigator.share({ title: 'Sky Roadster', text, url: location.href });
      else {
        await navigator.clipboard.writeText(`${text} ${location.href}`);
        this.ui.toast(`${ICON.share} Copied — paste it anywhere`);
      }
    } catch {
      /* share sheet dismissed */
    }
  }

  /** best EXP before the last recorded run (result screen bar) */
  private prevExpBest = 0;

  /** v2: in-run notices when the run's EXP reaches a new rank / beats the personal best */
  private expMilestones(run: Run) {
    if (this.tutorialMode || this.state !== 'run' || run.expRate <= 0) return;
    if (!this.course) {
      const z = this.world.spawner.zoneAt(this.world.dist);
      this.ui.gateHud(z.kind === 'gate' && z.next ? { next: z.next, k: (this.world.dist - z.from) / Math.max(1, z.to - z.from) } : null);
      if (z.kind === 'gate' && z.next && this.gateShown !== z.next) {
        this.gateShown = z.next;
        this.ui.toast(`${XPT_ICON} RANK GATE ${z.next} · hardest stretch, hold on!`, '#ff5a8a');
        this.audio.play('beep');
        this.vibrate([30, 60, 30]);
      }
    }
    const exp = run.exp;
    const rc = classFor(exp);
    if (rc !== this.runRank) {
      this.runRank = rc;
      const first = CLASSES.indexOf(rc) > CLASSES.indexOf(classFor(this.save.expBest));
      this.ui.toast(`${XPT_ICON} RANK ${rc}${first ? ' · NEW!' : ''}`, '#ffc21a');
      this.audio.play('mission');
      this.vibrate([20, 40, 30]);
    }
    if (!this.runBeatBest && exp > this.save.expBest) {
      this.runBeatBest = true;
      this.ui.toast(`${XPT_ICON} NEW BEST EXP`, '#7fe6ff');
    }
  }

  /** Feed the finished run to dailies / weekly board / live cup and build the rank line. */
  /** records the run in meta (best EXP, weekly EXP); returns what the result screen shows */
  private recordMeta(finished: boolean): RunRewards | null {
    if (this.tutorialMode) return null;
    const run = this.run;
    const sum: RunSummary = {
      track: this.course?.id ?? 'endless',
      score: run.score,
      coins: run.coins,
      distance: run.distance,
      near: run.nearMiss,
      powerups: run.powerups,
      jumps: run.superUsed,
      rings: run.rings,
      finished,
      exp: this.debugStart ? 0 : run.exp,
    };
    this.prevExpBest = this.save.expBest;
    const done = this.meta.recordRun(sum);
    done.forEach((t, i) => window.setTimeout(() => this.ui.toast(`${ICON.calendar} DAILY QUEST DONE · ${t}`, 'var(--green)'), 400 + i * 900));
    const wk = this.meta.weekly().you.rank;
    const cup = this.meta.myCup();
    const inCup = !!cup && cup.cup.track === sum.track;
    void this.syncDb(run.score, inCup && cup ? cup.key : null);
    // (the rank-up notice already showed during the run; the result bar shows RANK UP)
    const before = classFor(this.prevExpBest);
    const after = classFor(this.save.expBest);
    return {
      exp: sum.exp,
      from: this.prevExpBest,
      to: this.save.expBest,
      clsBefore: before,
      clsAfter: after,
      weekRank: wk,
      cup: inCup && cup ? { div: cup.division, name: cup.cup.name, rank: this.meta.cupBoard(cup).you.rank } : null,
      quests: done,
      missions: this.runMissionsDone,
      items: { super: run.superUsed, near: run.nearMiss },
    };
  }

  openGarage() {
    this.audio.play('click');
    this.setState('garage');
    this.rig.mode = 'garage';
    this.ui.garageSync(this.save, this.save.vehicle);
    this.ui.show('garage');
  }

  openTracks() {
    this.audio.unlock();
    this.audio.play('click');
    this.setState('tracks');
    this.rig.mode = 'menu';
    this.input.enabled = false;
    this.ui.tracksSync(this.save, this.meta.myCup()?.cup.track);
    this.ui.adButton('adboost', this.nextBoost ? 'used' : 'ready', 'Head start ready for your next run');
    this.ui.show('tracks');
  }

  // =============================================================== ads
  /** Leaving a results screen is a natural break: maybe show an interstitial first. */
  private afterResults(next: () => void) {
    if (!this.save.noAds && (this.state === 'gameover' || (this.state === 'finish' && this.finishShown))) {
      void this.ads.maybeInterstitial('between_runs', this.save.totalRuns).then(next);
    } else next();
  }

  /** Out of lives: offer a rewarded continue (or coins) before the game-over screen. */
  private offerContinue() {
    const cost = ADS.continueCoinCost * Math.pow(2, this.continuesUsed);
    if (this.tutorialMode || this.continuesUsed >= ADS.maxContinues) return this.gameOver();
    this.setState('continue');
    this.input.enabled = false;
    this.ui.continueOffer({ adOk: !this.adContinueUsed, cost, canAfford: this.save.wallet + this.run.coins >= cost, tip: this.lastTip });
    this.audio.play('beep');
  }

  private async continueByAd() {
    if (this.state !== 'continue') return;
    const t = this.stateT;
    const ok = await this.ads.rewarded('continue');
    if (ok) {
      this.adContinueUsed = true;
      this.doContinue();
    } else {
      this.stateT = t; // the countdown resumes where it was
    }
  }

  private continueByCoins() {
    if (this.state !== 'continue') return;
    const cost = ADS.continueCoinCost * Math.pow(2, this.continuesUsed);
    // spend this run's coins first, then the wallet
    const fromRun = Math.min(this.run.coins, cost);
    if (this.save.wallet + fromRun < cost) return;
    this.run.coins -= fromRun;
    this.save.wallet -= cost - fromRun;
    this.persist();
    this.doContinue();
  }

  private doContinue() {
    this.continuesUsed++;
    this.run.lives = 1;
    this.rig.mode = 'run';
    this.ui.show('hud');
    this.respawn();
    this.run.invulnT = Math.max(this.run.invulnT, 3);
    this.ui.toast(`${ICON.heart} CONTINUE! Keep going`, 'var(--gold)');
  }

  private async adDouble() {
    if (this.lastResult.doubled) return;
    const ok = await this.ads.rewarded('double_coins');
    if (!ok) return;
    const extra = this.lastResult.coins + this.lastResult.reward;
    this.lastResult.doubled = true;
    this.save.wallet += extra;
    this.persist();
    this.ui.adButton(this.state === 'finish' ? 'ad2xf' : 'ad2x', 'used', `+${extra} coins added`);
    this.ui.refreshProfile(this.save);
    this.audio.play('mission');
  }

  private freeCoinsLeft() {
    const day = new Date().toISOString().slice(0, 10);
    if (this.save.adFreeDay !== day) {
      this.save.adFreeDay = day;
      this.save.adFreeCount = 0;
    }
    return ADS.freeCoinsPerDay - (this.save.adFreeCount ?? 0);
  }

  private async adFreeCoins() {
    if (this.freeCoinsLeft() <= 0) return;
    const ok = await this.ads.rewarded('free_coins');
    if (!ok) return;
    this.save.adFreeCount = (this.save.adFreeCount ?? 0) + 1;
    this.save.wallet += ADS.freeCoinsAmount;
    this.persist();
    this.ui.refreshProfile(this.save);
    this.ui.freeCoins(this.freeCoinsLeft(), ADS.freeCoinsAmount);
    this.ui.toast(`${ICON.coin} +${ADS.freeCoinsAmount} coins`, 'var(--gold)');
    this.audio.play('power');
  }

  private async adBoost() {
    if (this.nextBoost) return;
    const ok = await this.ads.rewarded('head_start');
    if (!ok) return;
    this.nextBoost = true;
    this.ui.adButton('adboost', 'used', 'Head start ready for your next run');
    this.audio.play('power');
  }

  openTutorialIntro() {
    this.audio.unlock();
    this.audio.play('click');
    this.setState('tracks');
    this.rig.mode = 'menu';
    this.input.enabled = false;
    this.ui.show('tutintro');
  }

  startTutorial(world: WorldId | null = null) {
    this.trainWorld = world;
    this.tut = world ? advancedScript(world) : basicScript();
    this.tutorialMode = true;
    this.course = null;
    this.startRun();
  }

  /** practice road for one boost (opened from its info card) */
  startBoostTraining(kind: BoostKind) {
    this.trainWorld = null;
    this.tut = boostScript(kind);
    this.tutorialMode = true;
    this.course = null;
    this.startRun();
  }

  // ------------------------------------------------------------- profile / boosts / missions
  private openProfile(fresh = true) {
    if (fresh) this.audio.play('click');
    if (!this.save.perks.profileSeen) {
      this.save.perks.profileSeen = true;
      this.persist();
    }
    const p = classProgress(this.save.expBest);
    this.ui.profileSync({
      self: true,
      name: this.meta.name,
      avatar: this.save.avatar,
      cls: p.cls,
      bolts: this.save.expBest,
      next: p.next,
      k: p.k,
      need: p.need,
      best: this.save.best,
      weekRank: this.save.weekBest > 0 ? this.meta.weekly().you.rank : null,
      runs: this.save.totalRuns,
      trophies: this.save.trophies,
      car: (SKINS.find((x) => x.id === this.save.vehicle) ?? SKINS[0]).name,
      country: this.save.country,
    });
    if (fresh) this.ui.show('start', 'profile');
  }

  private openBoostInfo(k: ItemKey) {
    this.audio.play('click');
    this.ui.boostSync(k, this.save.items[k], this.save.equip[k], this.save.wallet);
    // from the Magic Bag: the info card opens on top of the bag (over whatever screen is under it)
    if (this.ui.isShown('bag')) {
      const base = ['start', 'tracks', 'profile'].filter((id) => this.ui.isShown(id));
      this.ui.show(...base, 'bag', 'boostinfo');
    } else this.ui.show('tracks', 'boostinfo');
  }

  private openBag() {
    this.audio.play('click');
    this.ui.bagSync(this.save);
    const base = ['start', 'tracks', 'profile'].filter((id) => this.ui.isShown(id));
    this.ui.show(...(base.length ? base : ['start']), 'bag');
  }

  private claimMissions(i: number) {
    const list = this.save.pendingMissions;
    const take = i < 0 ? list.splice(0) : list.splice(i, 1);
    const total = take.reduce((a, m) => a + m.reward, 0);
    if (!total) return;
    this.save.wallet += total;
    this.persist();
    this.audio.play('mission');
    this.ui.toast(`${ICON.coin} +${total} mission rewards`, 'var(--gold)');
    this.openMissions();
  }

  /** difficulty of the current run: training = easy, Endless = always HARD, tracks = the player's pick */
  private get runLevel(): SpeedLevel {
    if (this.tutorialMode) return 'easy';
    if (!this.course) return 'hard';
    return this.save.settings.speed;
  }

  startTrack(id: string) {
    this.tutorialMode = false;
    this.save.track = id;
    this.course = courseById(id);
    this.persist();
    this.startRun();
  }

  nextTrack() {
    const i = this.course ? COURSES.indexOf(this.course) : -1;
    const next = COURSES[i + 1];
    const lock = next && trackLock(next, this.save.trackBest, CLASSES.indexOf(classFor(this.save.expBest)) >= CLASSES.indexOf('A'));
    if (next && lock && lock.open) this.startTrack(next.id);
    else {
      if (lock && !lock.open) this.ui.toast(lock.why === 'score' ? `${ICON.lock} Score ${lock.need.toLocaleString('en-US')} here to unlock ${next.name}` : `${ICON.lock} Reach rank class A to unlock tracks 11–20`, '#ffc21a');
      this.openTracks();
    }
  }

  openMissions() {
    this.audio.play('click');
    this.setState('missions');
    this.rig.mode = 'menu';
    this.ui.missionsSync(this.save, this.missions.active);
    this.ui.show('missions');
  }

  startRun() {
    this.audio.unlock();
    this.audio.startMusic();
    this.audio.play('click');
    this.clearRunVisuals();
    const level = this.runLevel;
    // test shortcut: ?rank=B starts Endless just before the B rank gate (that run's EXP is not saved)
    const want = !this.course && !this.tutorialMode ? /[?&]rank=(C|B|A|AA|AAA)\b/.exec(location.search)?.[1] : undefined;
    const startDist = want ? Math.max(0, rankDist(RANK_ORDER.indexOf(want as (typeof RANK_ORDER)[number]), level) - 2600) : 0;
    this.debugStart = startDist > 0;
    this.world.reset(Math.floor(Math.random() * 1e9), this.course, level, startDist);
    this.tutStep = 0;
    this.tutHint = 0;
    this.tutPrompting = false;
    this.timeScale = this.timeScaleTarget = 1;
    this.ui.tutPrompt(null);
    const car = SKINS.find((x) => x.id === this.save.vehicle) ?? SKINS[0];
    this.run = new Run({ ...this.save.upgrades }, LEVELS[level].score * (1 + (car.bonus ?? 0) / 100));
    this.run.expRate = this.tutorialMode ? 0 : EXP.rate[level];
    this.run.distance = startDist;
    this.gateShown = '';
    this.runRank = 'D';
    this.runBeatBest = this.save.expBest <= 0;
    this.superFlight = false;
    this.blockade = null;
    this.nextBlockadeAt = 420;
    if (this.nextBoost && !this.tutorialMode) {
      this.nextBoost = false;
      this.run.shield = true;
      this.run.shieldHits = SHIELD_HITS;
      this.run.shieldT = this.run.durations().shield;
      this.run.superJumps = 1;
      window.setTimeout(() => this.ui.toast(`${ICON.rocket} HEAD START · Shield + Roadster Jump`, '#9b6bff'), 2900);
    }
    if (!this.tutorialMode) {
      const used: string[] = [];
      for (const k of ['super', 'hyper', 'escape', 'shield', 'turbo', 'magnet', 'double', 'life'] as ItemKey[]) {
        if (!this.save.equip[k] || this.save.items[k] <= 0) continue;
        this.save.items[k]--;
        this.save.equip[k] = false;
        if (k === 'super') this.run.superJumps = Math.min(2, this.run.superJumps + 1);
        if (k === 'hyper') this.run.hyperJumps = 1;
        if (k === 'escape') this.run.escapes = Math.min(2, this.run.escapes + 1);
        if (k === 'shield') {
          this.run.shield = true;
          this.run.shieldHits = SHIELD_HITS;
          this.run.shieldT = this.run.durations().shield;
        }
        const d = this.run.durations();
        if (k === 'turbo') this.run.turboT = d.turbo;
        if (k === 'magnet') this.run.magnetT = d.magnet;
        if (k === 'double') this.run.doubleT = d.double;
        if (k === 'life') {
          this.run.maxLives = Math.max(this.run.maxLives, 4);
          this.run.lives = Math.min(this.run.maxLives, this.run.lives + 1);
        }
        used.push({ super: 'Roadster Jump', hyper: 'HYPER JUMP', escape: 'Sky Escape', shield: 'Shield', turbo: 'Turbo', magnet: 'Magnet', double: '×2 Coins', life: 'Extra Life' }[k]);
      }
      if (used.length) {
        this.persist();
        window.setTimeout(() => this.ui.toast(`${ICON.check} BOOSTS ON · ${used.join(' + ')}`, '#9b6bff'), 3300);
      }
    }
    if (this.tutorialMode && this.tut.grant) {
      const g = this.tut.grant;
      this.run.superJumps = g.super ?? 0;
      this.run.hyperJumps = g.hyper ?? 0;
      this.run.escapes = g.escape ?? 0;
      if (g.shield) {
        this.run.shield = true;
        this.run.shieldHits = SHIELD_HITS;
        this.run.shieldT = 0; // lasts until it pops
      }
    }
    if (this.tutorialMode) {
      const script = this.tut;
      const sp = this.world.spawner;
      sp.scripted = true;
      sp.rows.push(...script.rows);
      sp.pickups.push(...script.pickups);
    }
    this.livesLost = 0;
    this.continuesUsed = 0;
    this.adContinueUsed = false;
    this.finishShown = false;
    this.runTime = 0;
    this.sectionName = '';
    this.missions.beginRun();
    this.runMissionsDone = [];
    this.applySkin(this.save.vehicle);
    this.vehicle.resetPose();
    this.vehicle.visibleBlink = true;
    this.scenery.setWorld(this.course?.world ?? ((this.tutorialMode && this.trainWorld) || 'city'), true);
    this.track.setAccent(new THREE.Color(this.scenery.accent));
    this.applyReadability();
    this.track.setOpenAir(this.scenery.openAir);
    this.startArch.visible = this.finishArch.visible = !!this.course;
    this.startArch.position.z = -14;
    this.finishArch.visible = false;
    this.speedScale = 1;
    this.setState('countdown');
    this.countdownStep = -1;
    this.rig.mode = 'run';
    this.input.enabled = true; // inputs during countdown are ignored by state check
    this.ui.resetHud();
    this.ui.show('hud', 'countdown');
    this.ui.tutorial(false);
    this.audio.intensity = 0;
    const c = this.course;
    this.ui.trackHud(c ? { section: c.sections[0].name, dist: 0, length: c.length, marks: c.sections.slice(1).map((s) => s.from) } : null);
    if (c) this.ui.banner(`TRACK ${COURSES.indexOf(c) + 1} · ${(c.length / 1000).toFixed(1)} KM`, c.name.toUpperCase());
    else if (this.tutorialMode) this.ui.banner(this.trainWorld ? 'ADVANCED TRAINING' : this.tut.title ? 'BOOST TRAINING' : 'FIRST FLIGHT', this.trainWorld ? WORLD_LESSONS[this.trainWorld].name.toUpperCase() : this.tut.title ?? 'PILOT TRAINING');
  }

  pause() {
    if (this.state !== 'run') return;
    this.setState('paused');
    this.ui.refreshProfile(this.save);
    this.ui.show('hud', 'pause');
    this.audio.play('click');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.audio.play('click');
    this.state = 'run';
    this.ui.show('hud');
    if (this.tutorialMode && this.tutPrompting) {
      const st = this.tut.steps[this.tutStep];
      this.ui.tutPrompt({ index: this.tutStep, total: this.tut.steps.length, need: st.need, title: st.title, sub: st.sub });
    }
  }

  private clearRunVisuals() {
    this.ui.gateHud(null);
    this.vehicle.resetFx();
    this.shatter.clear();
    this.particles.clear();
    this.smoke.clear();
    this.debris.clear();
    this.shield.mesh.visible = false;
    this.portal.group.visible = false;
    this.startArch.visible = this.finishArch.visible = false;
  }

  // =============================================================== input
  private onAction(a: Action) {
    if (this.state !== 'run') return;
    if (this.autopilot) return;
    if (this.dangerHint === a) {
      // hinted move performed: count it, fade the hint immediately
      const hl = (this.save.hintsLearned ??= {});
      hl[a] = (hl[a] ?? 0) + 1;
      this.dangerHint = null;
      this.dangerHold = 0;
      this.ui.dangerOk();
    }
    // first-flight training: the car only moves on a training prompt (no free swiping);
    // world (advanced) and boost training: free 4-way control like a normal run
    if (this.tutorialMode && !this.tutPrompting && this.isBasicTraining) return;
    if (this.tutorialMode && this.tutPrompting && !this.tutAccept(a)) return;
    // a swipe UP is always a normal hop — the Roadster / HYPER jump has its own button
    this.world.player.input(a);
  }

  /** grit kicked back from the rear tyres while driving fast on the road (sells the speed) */
  private sprayAcc = 0;
  private sprayPos = new THREE.Vector3();
  private tyreSpray(dt: number, speed: number) {
    const p = this.world.player;
    if (this.state !== 'run' || p.air > 0.08 || speed < TYRE.sprayFrom) {
      this.sprayAcc = 0;
      return;
    }
    const k = clamp((speed - TYRE.sprayFrom) / (SPEED.max - TYRE.sprayFrom), 0, 1);
    this.sprayAcc += dt * TYRE.sprayRate * (0.3 + 0.7 * k);
    while (this.sprayAcc >= 1) {
      this.sprayAcc -= 1;
      for (const side of [-1, 1] as const) {
        const q = this.vehicle.rearTyreWorld(side, this.sprayPos);
        this.particles.emit(
          q.x + (Math.random() - 0.5) * 0.12, q.y, q.z + 0.05,
          side * (0.3 + Math.random() * 0.9), 0.5 + Math.random() * 1.3, 1 + Math.random() * 3,
          TYRE.effects && Math.random() < 0.3 + 0.5 * k ? TYRE.sparkColor : TYRE.sprayColor, TYRE.spraySize * (0.7 + Math.random() * 0.6), TYRE.sprayLife * (0.7 + Math.random() * 0.6),
          { locked: true, drag: 2, grav: 9 },
        );
      }
    }
  }

  /** the very first, generic pilot training (strict step-by-step flow) */
  private get isBasicTraining() {
    return this.tutorialMode && !this.trainWorld && !this.tut.title;
  }

  /** ROADSTER / HYPER JUMP button (HUD, or R / Shift) */
  private rocketQueuedT = -1;
  useRocket() {
    if (this.state !== 'run' || !this.run) return;
    const r = this.run;
    if (r.hyperJumps <= 0 && r.superJumps <= 0) {
      if (this.tutorialMode) this.needRocket();
      return;
    }
    if (this.tutorialMode) {
      if (this.tutPrompting) {
        if (!this.tutAccept('rocket')) return;
      } else if (this.isBasicTraining || this.tut.steps.slice(this.tutStep).some((s) => s.need === 'rocket')) {
        // too early: the charge is needed for the blockade ahead — say so instead of ignoring the tap
        this.ui.rocketWait();
        this.audio.play('bump');
        return;
      }
    }
    const p = this.world.player;
    if (p.canJump) this.launchSuperJump(r.hyperJumps > 0);
    else this.rocketQueuedT = this.time; // still in the air: fire the moment the wheels touch down
  }

  /** no rocket for a step that needs it: explain + offer to use one, buy one or retry */
  private needRocketOpen = false;
  private needRocket() {
    if (this.needRocketOpen) return;
    this.needRocketOpen = true;
    this.state = 'paused';
    this.ui.tutPrompt(null);
    this.ui.needRocket({ owned: this.save.items.super, wallet: this.save.wallet, price: ROCKET_PRICE });
    this.ui.show('hud', 'needrocket');
    this.audio.play('beep');
  }

  private resolveNeedRocket(how: string) {
    const r = this.run;
    let ok = false;
    if (how === 'use' && this.save.items.super > 0) {
      this.save.items.super--;
      ok = true;
    } else if (how === 'buy' && this.save.wallet >= ROCKET_PRICE) {
      this.save.wallet -= ROCKET_PRICE;
      ok = true;
    } else if (how === 'shop') {
      this.needRocketOpen = false;
      this.returnTo = () => this.goHome();
      this.openShop();
      return;
    } else if (how === 'retry') {
      this.needRocketOpen = false;
      this.startRun();
      return;
    }
    if (!ok) return;
    r.superJumps = Math.min(2, r.superJumps + 1);
    this.persist();
    this.needRocketOpen = false;
    this.audio.play('power');
    this.ui.toast(`${ICON.rocket} ROADSTER JUMP ready — tap the purple button!`, '#9b6bff');
    this.state = 'run';
    this.ui.show('hud');
    if (this.tutorialMode && this.tutPrompting) {
      const st = this.tut.steps[this.tutStep];
      this.ui.tutPrompt({ index: this.tutStep, total: this.tut.steps.length, need: st.need, title: st.title, sub: st.sub });
    }
  }

  /**
   * Lane-change lessons: point the prompt at the target lane from where the car really is.
   * Already lined up → praise and skip the step (returns false = no prompt).
   */
  private aimStep(st: TutorialStep) {
    if (st.target === undefined) return true;
    const d = st.target - this.world.player.lane;
    if (d === 0) {
      this.tutStep++;
      this.ui.toast(`${ICON.check} ${st.title}: you're lined up — stay in this lane`, '#b6ff2e');
      return false;
    }
    st.need = d < 0 ? 'left' : 'right';
    return true;
  }

  /** training: is this the gesture the current step waits for? (advances the step) */
  private tutAccept(a: Action | 'sos' | 'rocket') {
    const step = this.tut.steps[this.tutStep];
    if (a !== step.need) {
      this.ui.tutWrong();
      this.audio.play('bump');
      return false;
    }
    this.tutPrompting = false;
    if (step.target !== undefined && (a === 'left' || a === 'right')) {
      // two lanes away: this swipe is right, but one more is needed — prompt again from the new lane
      const after = this.world.player.lane + (a === 'left' ? -1 : 1);
      if (after !== step.target) {
        this.ui.tutPrompt(null);
        this.audio.play('combo');
        return true;
      }
    }
    this.tutStep++;
    this.timeScaleTarget = 1;
    this.ui.tutPrompt(null);
    this.ui.pop('NICE!', '#b6ff2e', '', -4);
    this.audio.play('combo');
    return true;
  }

  /** SKY ESCAPE: emergency rocket straight up, cruise above everything, glide down. */
  useEscape() {
    if (this.state !== 'run' || !this.run || this.run.escapes <= 0) return;
    if (this.tutorialMode && this.tutPrompting && !this.tutAccept('sos')) return;
    if (this.tutorialMode && !this.tutPrompting && this.isBasicTraining) return;
    const p = this.world.player;
    if (!p.escape()) return;
    this.run.escapes--;
    this.run.invulnT = Math.max(this.run.invulnT, TIMING.escExec + TIMING.escHold + TIMING.escRecover + 0.6);
    this.superFlight = true;
    this.superRolled = true; // no roll: straight up
    this.vibrate(35);
    this.audio.play('turbo');
    this.audio.play('warp');
    this.rig.shake(0.4);
    this.rig.fovKick += 10;
    const c = this.vehicle.root.position;
    for (let k = 0; k < 4; k++) this.rings.spawn(this.tmpV.set(c.x, 0.1 + k * 0.6, 0), k % 2 ? 0xffffff : 0xff5a3c, 2.4 + k * 1.2, 0.6, true);
    this.particles.burst(c.x, c.y, 0, 80, 0xff5a3c, 10, 0.35, 0.7, { up: 3 });
    this.ui.pop('SKY ESCAPE!', '#ff8a6a', 'SAFE ABOVE THE ROAD', -12);
    this.ui.flash();
  }

  /** ROADSTER JUMP: rocket hop over two beats with a 360° roll at the apex. */
  private launchSuperJump(hyper = false) {
    const p = this.world.player;
    if (!p.superJump(hyper)) return;
    if (hyper) this.run.hyperJumps--;
    else this.run.superJumps--;
    this.run.superUsed++;
    this.vehicle.boostKick(1);
    // invulnerable for the whole flight + a short grace after touch-down
    const flight = hyper
      ? TIMING.superAntic + TIMING.hyperExec + TIMING.hyperHold + TIMING.hyperRecover
      : TIMING.superAntic + TIMING.superExec + TIMING.superHold + TIMING.superRecover;
    this.run.invulnT = Math.max(this.run.invulnT, flight + 0.6);
    this.superRolled = false;
    this.slowmoDone = false;
    this.superFlight = true;
    this.vibrate(hyper ? 45 : 35);
    this.audio.play('turbo');
    this.rig.shake(hyper ? 0.45 : 0.3);
    this.rig.fovKick += hyper ? 12 : 8;
    const c = this.vehicle.root.position;
    const col = hyper ? 0xffc21a : 0x9b6bff;
    for (let k = 0; k < (hyper ? 5 : 3); k++) this.rings.spawn(this.tmpV.set(c.x, 0.08 + k * 0.5, 0), k ? col : hyper ? 0xfff3a0 : 0x5ad1ff, 2.5 + k * 1.4, 0.55, true);
    this.particles.burst(c.x, 0.3, 0, hyper ? 110 : 60, col, hyper ? 12 : 9, 0.35, 0.7, { up: 4 });
    this.ui.pop(hyper ? 'HYPER JUMP!' : 'ROADSTER JUMP!', hyper ? '#ffd24a' : '#c8a8ff', hyper ? 'MYTHIC' : '', -10);
  }

  private wirePlayerEvents() {
    const p = this.world.player;
    p.events = {
      lane: (dir) => {
        this.audio.play('lane', { pan: dir * 0.5 });
        const p = this.world.player;
        if (p.air > 0.5) {
          // in the air: blue energy streaks from the opposite-side thrusters
          const car = this.vehicle.root.position;
          for (let i = 0; i < 12; i++) {
            this.particles.emit(car.x - dir * 0.9, car.y - 0.05 + Math.random() * 0.2, 0.3 + Math.random() * 1.2, -dir * (6 + Math.random() * 6), 0, 4 + Math.random() * 4, 0x6fd2ff, 0.28, 0.26, { drag: 4, locked: true });
          }
        } else {
          // on the road: a light tyre spray off the outside wheels
          for (const i of [0, 1, 2, 3]) {
            const w = this.vehicle.contactWorld(i, this.tmpV);
            if (Math.sign(w.x - p.x) !== -dir) continue;
            for (let k = 0; k < 4; k++) this.particles.emit(w.x, 0.08, w.z, -dir * (1.5 + Math.random() * 2), 0.6 + Math.random(), 1, 0xbcd6ff, 0.12, 0.3, { drag: 3, locked: true, grow: 1.2 });
          }
        }
        this.rig.fovKick += 1;
      },
      up: () => {
        this.audio.play('up');
        this.vibrate(12);
        // take-off: the hidden fans fire — a short burst of blue energy pushes down from the jets
        this.energyBurst(10, -7);
      },
      down: () => {
        this.audio.play('down');
        // on the road the car stays clean: no sparks, smoke or air
      },
      land: (m) => {
        if (m === 'up') {
          this.vibrate(10);
          // a short soft puff of dust where the wheels touch down — gone within half a second
          const big = this.superFlight;
          const px = this.world.player.x;
          for (let k = 0; k < (big ? 10 : 5); k++) {
            const a = Math.random() * Math.PI * 2;
            this.smoke.emit(px + Math.cos(a) * 0.9, 0.12, 0.4 + Math.sin(a) * 0.8, Math.cos(a) * (big ? 2.4 : 1.5), 0.5 + Math.random() * 0.6, 1 + Math.random(), 0xc9d2e0, big ? 0.5 : 0.32, big ? 0.6 : 0.42, { drag: 3, grow: 1.6, locked: true });
          }
        }
        if (m === 'up' && this.superFlight) {
          // landing shockwave: the road just ahead is blasted clear so the touch-down is always fair
          this.superFlight = false;
          for (const o of this.world.obstacles) {
            if (o.z <= -26) continue;
            const b = o.boxes[0];
            if (b) this.particles.burst((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2, 24, 0xffa23a, 9, 0.4, 0.6, { locked: true, grav: 5 });
          }
          this.world.clearAhead(26);
          const px = this.world.player.x;
          this.rings.spawn(this.tmpV.set(px, 0.06, -2), 0xffd23d, 7, 0.6, true, true);
          this.audio.play('explode');
          this.rig.shake(0.35);
        }
        if (m === 'up') {
          this.audio.play('land');
          // touch-down: a last soft push of blue energy from the jets, then nothing on the road
          this.energyBurst(8, -3);
          this.rig.shake(0.06);
        }
      },
      airDash: (dir) => {
        this.vibrate(30);
        // booster: second lane in the same hop, edge → far edge, with a 360° flip
        const r = this.run;
        if (r) r.dashes = Math.max(0, r.dashes - 1);
        if (r) r.invulnT = Math.max(r.invulnT, TIMING.laneChange + 0.15);
        this.vehicle.barrelRoll(1, dir === -1 ? 1 : -1, 15);
        this.audio.play('ring');
        if (r && this.state === 'run') r.score += 100 * r.scoreMul;
        this.ui.pop('AIR DASH FLIP!', '#7ff5e2', '', -8);
        const c = this.vehicle.root.position;
        for (let i = 0; i < 22; i++) this.particles.emit(c.x, c.y + (Math.random() - 0.5) * 0.6, 0.3 + Math.random(), -dir * (8 + Math.random() * 6), (Math.random() - 0.5) * 2, 3, i % 2 ? 0x2ee6c8 : 0xa8fff0, 0.22, 0.35, { drag: 3, locked: true });
      },
      airBlocked: (dir) => {
        // one lane per hop: a little side puff and a hint, the car must land first
        this.audio.play('bump', { pan: dir * 0.4 });
        if (this.state === 'run' && !this.tutorialMode) this.ui.pop('LAND FIRST', '#9fb3dd', '', 4);
      },
      bump: (dir) => {
        this.audio.play('bump', { pan: dir * 0.6 });
        this.rig.shake(0.18);
      },
    };
  }

  // =============================================================== frame
  /** When true the loop only renders; tests drive time with advance(). */
  manual = /[?&]manual/.test(location.search);

  private frame() {
    const rawDt = this.clock.getDelta();
    if (!this.manual) this.tick(Math.min(rawDt, 1 / 20), rawDt);
    this.renderer.render();
    if (DEBUG) this.updateDebug();
  }

  /** Deterministic fixed-step advance (test/tooling hook). */
  advance(seconds: number, step = 1 / 60) {
    for (let t = 0; t < seconds - 1e-9; t += step) this.tick(step, step);
  }

  private tick(dt: number, rawDt: number) {
    if (this.ads?.showing) return; // ad on screen: everything holds still
    // cinematic slow motion (Roadster / HYPER landing) — ends on its own
    if (this.slowmoT > 0) {
      this.slowmoT -= rawDt;
      if (this.slowmoT <= 0 && !this.tutPrompting) this.timeScaleTarget = 1;
    }
    if ((this.tutorialMode && (this.state === 'run' || this.state === 'paused')) || this.slowmoT > 0 || this.timeScale < 0.999) {
      this.timeScale += (this.timeScaleTarget - this.timeScale) * damp(this.timeScaleTarget < 1 ? 10 : 6, rawDt);
      if (this.state !== 'run' && !this.tutorialMode) this.timeScale = this.timeScaleTarget = 1;
      dt *= this.timeScale;
    }
    this.time += dt;
    this.stateT += dt;
    this.trackPerformance(rawDt);

    switch (this.state) {
      case 'menu':
      case 'garage':
      case 'missions':
      case 'tracks':
        this.updateAmbient(dt);
        break;
      case 'countdown':
        this.updateCountdown(dt);
        break;
      case 'run':
      case 'dying':
      case 'respawn':
      case 'finish':
        this.updateRun(dt);
        break;
      case 'paused':
      case 'continue': {
        if (this.holdContinue) {
          this.stateT -= dt;
          break;
        }
        const left = ADS.continueSeconds - this.stateT;
        this.ui.continueTick(Math.max(0, left / ADS.continueSeconds), left);
        if (left <= 0) this.gameOver();
        break;
      }
      case 'gameover':
      case 'loading':
        break;
    }
    if (this.state !== 'paused') {
      this.updateVisuals(this.state === 'gameover' ? dt * 0.3 : dt);
    }
  }

  /** Menu/garage: car hovers on the highway while the city scrolls by slowly. */
  private updateAmbient(dt: number) {
    this.menuDist += dt * 16;
    const p = this.world.player;
    p.update(dt);
    // home: the road streams by and the wheels spin at racing speed
    this.vehicle.update(p, dt, 32, 0);
    this.scenery.update(this.menuDist, this.time, dt);
    this.track.update(this.menuDist);
    this.rig.update(dt, p, 0, 0);
    this.audio.intensity = 0;
  }

  private updateCountdown(dt: number) {
    const step = Math.floor(this.stateT / 0.7);
    if (step !== this.countdownStep && step <= 3) {
      this.countdownStep = step;
      const label = ['3', '2', '1', 'GO!'][step];
      this.ui.countdown(label);
      this.audio.play(step === 3 ? 'go' : 'beep');
      if (step === 3) {
        // (no ground roll — the car only flips in the air)
        this.rig.shake(0.15);
        this.vehicle.boostKick(1); // launch: light bursts out of the rear
        this.vibrate(25);
      } else this.vibrate(8);
    }
    const p = this.world.player;
    p.update(dt);
    this.vehicle.update(p, dt, 0, 0);
    this.scenery.update(this.world.dist, this.time, dt);
    this.track.update(this.world.dist);
    this.rig.update(dt, p, 0, 0);
    if (this.stateT > 2.6) {
      this.setState('run');
      this.ui.show('hud');
      this.audio.intensity = 1;
      if (!this.tutorialMode && !this.save.tutorialDone && this.save.totalRuns < 3) {
        this.tutorialT = 4.5;
        this.ui.tutorial(true);
      }
    }
  }

  private updateRun(dt: number) {
    const w = this.world;
    const run = this.run;
    const p = w.player;

    // ---- speed scaling during crash / respawn
    if (this.state === 'dying') this.speedScale = Math.max(0, this.speedScale - dt * 2.6);
    else if (this.state === 'finish') this.speedScale = Math.max(0.3, this.speedScale - dt * 0.7);
    else if (this.state === 'respawn') this.speedScale = Math.min(1, this.speedScale + dt * 0.8);
    else this.speedScale = 1;

    if (this.autopilot && this.state === 'run') this.autopilot.update(w, dt, (a) => p.input(a));

    // ---- fixed sub-steps for precise collision at high speed
    const steps = Math.max(1, Math.ceil(dt / (1 / 120)));
    const h = dt / steps;
    const opts = {
      invulnerable: this.state !== 'run' || run.invulnerable || (this.tutorialMode && !this.tut.vulnerable),
      smash: run.turboT > 0,
      magnet: run.magnetActive,
      magnetRadius: run.magnetRadius,
      speedMul: run.speedMul * this.speedScale,
    };
    for (let i = 0; i < steps; i++) {
      const before = w.dist;
      const ev = w.step(h, opts);
      if (this.state === 'run' || this.state === 'respawn') run.update(h, w.dist - before);
      this.handleWorldEvents(ev);
      const crash = this.state === 'run' ? run.handle(ev) : null;
      this.handleFeedback();
      if (crash) {
        const hit = ev.find((e) => e.type === 'hit');
        const pl = w.player;
        this.lastTip = hit && hit.type === 'hit' ? crashTip(hit.o, pl.lane, pl.vmode === 'up', pl.vmode === 'down' && pl.vphase !== 'recover') : null;
        this.onCrash(crash === 'gameover');
        break;
      }
    }

    // ---- missions
    if (this.state === 'run') {
      const st = run.stats();
      st.ups = p.stats.ups;
      st.downs = p.stats.downs;
      st.lanes = p.stats.lanes;
      this.missions.update(st as Record<MissionStat, number>);
    }

    // ---- car blockades: the Roadster Jump showcase
    this.updateBlockade();

    // ---- danger assist: big arrow when a crash is about to happen
    this.updateDanger(dt);

    // ---- state timers
    if (this.state === 'dying' && this.stateT > (run.lives > 0 ? 1.0 : 1.6)) {
      if (run.lives > 0) this.respawn();
      else this.offerContinue();
    }
    if (this.state === 'respawn' && this.stateT > 0.2 && this.speedScale >= 1) {
      this.setState('run');
    }

    // ---- ROADSTER JUMP: 360° roll at the top of the hop, rocket trail while climbing
    if (this.superFlight && !p.isSuper && p.vmode !== 'up') this.superFlight = false;
    if (p.isSuper) {
      if (!this.superRolled && p.vphase === 'hold' && !p.isEscape) {
        this.superRolled = true;
        this.vehicle.barrelRoll(p.isHyper ? 2 : 1);
        this.vibrate(20);
      }
      // the roll comes out of the apex and the car starts down: brief slow motion to savour it
      if (this.superRolled && !this.slowmoDone && !p.isEscape && (p.vphase === 'hold' && p.airTimeLeft < 0.35 || p.vphase === 'recover')) {
        this.slowmoDone = true;
        this.slowmoT = 0.85;
        this.timeScaleTarget = 0.38;
        this.rig.fovKick -= 4;
        this.audio.play('ring');
        if (p.isHyper && this.state === 'run') {
          // mythic bonus at the apex: coin shower + score
          this.run.coins += 25;
          this.run.score += 1000 * this.run.scoreMul;
          this.ui.pop('+25 COINS', '#ffd24a', '', -18);
          const c = this.vehicle.root.position;
          this.particles.burst(c.x, c.y + 0.5, -1.5, 26, 0xffd23d, 7, 0.22, 0.8, { grav: 6, up: 3 });
        }
      }
      const climbing = p.vphase === 'exec' || p.vphase === 'antic';
      if (climbing || ((p.isHyper || p.isEscape) && p.vphase === 'hold')) {
        const c = this.vehicle.root.position;
        const cols = p.isEscape ? [0xff5a3c, 0xffffff] : p.isHyper ? [0xffc21a, 0xfff3a0] : [0x9b6bff, 0x5ad1ff];
        for (let k = 0; k < (climbing ? 4 : 1); k++) this.particles.emit(c.x + (Math.random() - 0.5) * 1.6, c.y - 0.4, 0.4 + Math.random(), 0, climbing ? -10 - Math.random() * 6 : -2, 3, cols[k % 2], 0.3, 0.45, { drag: 1.5, locked: true, grow: 0.8 });
      }
    }

    // ---- invulnerability blink
    const blink = run.invulnT > 0 && run.turboT <= 0 && this.state !== 'dying' && !p.isSuper;
    // no blinking (eye comfort): the car stays solid; protection shows as a steady soft bubble + HUD chip
    void blink;
    this.vehicle.visibleBlink = this.state !== 'dying';

    // ---- pilot training: wait for each gesture, captions, finish
    if (this.tutorialMode) {
      const st = this.tut.steps[this.tutStep];
      if (st && !this.tutPrompting && this.state === 'run' && (st.dist - w.dist) / Math.max(1, w.speed) <= st.lead && this.aimStep(st)) {
        this.tutPrompting = true;
        this.timeScaleTarget = 0.035;
        this.ui.tutPrompt({ index: this.tutStep, total: this.tut.steps.length, need: st.need, title: st.title, sub: st.sub });
        this.audio.play('beep');
        if (st.need === 'rocket' && run.superJumps <= 0 && run.hyperJumps <= 0) this.needRocket();
      }
    }
    // rocket button pressed mid-air: launch on touchdown
    if (this.rocketQueuedT >= 0 && this.state === 'run') {
      if (this.time - this.rocketQueuedT > 1.0) this.rocketQueuedT = -1;
      else if (this.world.player.canJump && (run.superJumps > 0 || run.hyperJumps > 0)) {
        this.rocketQueuedT = -1;
        this.launchSuperJump(run.hyperJumps > 0);
      }
    }
    if (this.tutorialMode) {
      while (this.tutHint < this.tut.hints.length && w.dist >= this.tut.hints[this.tutHint].dist) {
        this.ui.toast(this.tut.hints[this.tutHint].text);
        this.tutHint++;
      }
      if (this.state === 'run' && w.dist >= this.tut.length) this.onFinish();
      if (this.state === 'finish' && !this.finishShown && this.stateT > 1.6) {
        this.finishShown = true;
        this.save.tutorialDone = true;
        this.missions.endRun();
        this.persist();
        this.ui.show('tutdone');
      }
    }

    // ---- track mode: gates, sections, finish line
    const c = this.course;
    if (c) {
      if (this.state === 'run' || this.state === 'respawn') this.runTime += dt;
      this.startArch.position.z = -(14 - w.dist);
      this.startArch.visible = w.dist < 40;
      this.finishArch.position.z = -(c.length - w.dist);
      this.finishArch.visible = c.length - w.dist < 260 && c.length - w.dist > -30;
      const sec = sectionAt(c, w.dist);
      if (sec.name !== this.sectionName) {
        if (this.sectionName && this.state === 'run') {
          const idx = c.sections.indexOf(sec) + 1;
          this.ui.banner(`SECTION ${String(idx).padStart(2, '0')}`, sec.name.toUpperCase());
          this.audio.play('ring');
        }
        this.sectionName = sec.name;
      }
      if ((this.state === 'run' || this.state === 'respawn') && w.dist >= c.length) this.onFinish();
      if (this.state === 'finish' && !this.finishShown && this.stateT > 1.9) this.showFinish();
    }

    // ---- world transition portal & preload (endless only)
    const nextBoundary = (Math.floor(w.dist / WORLD_LENGTH) + 1) * WORLD_LENGTH;
    const toPortal = nextBoundary - w.dist;
    if (!c && toPortal < 320) this.scenery.preload(worldAt(nextBoundary));
    this.portal.group.visible = !c && toPortal < 260;
    if (this.portal.group.visible) {
      this.portal.group.position.z = -toPortal;
      this.portal.setColor(new THREE.Color(this.scenery.accent));
    }

    // ---- tutorial
    if (this.tutorialT > 0) {
      this.tutorialT -= dt;
      if (this.tutorialT <= 0) this.ui.tutorial(false);
    }

    // ---- audio intensity
    this.audio.intensity = run.turboT > 0 ? 2 : this.state === 'run' ? 1 : 0;

    // ---- HUD (throttled)
    if (Math.floor(this.time * 20) !== Math.floor((this.time - dt) * 20)) {
      this.ui.updateHud(run, w.speed, SPEED.max * SPEED.turboMul * LEVELS[this.runLevel].speed, this.missions.active[0]);
      this.expMilestones(run);
      if (c) this.ui.trackHud({ section: this.sectionName, dist: w.dist, length: c.length, marks: c.sections.slice(1).map((s) => s.from) });
    }
  }

  /**
   * While the player holds a Roadster/HYPER charge, every ~500 m a double wall of cars
   * blocks the whole road. If the charge is gone (used/lost) before the car gets there and
   * the car isn't already flying, the blockade is removed — it can never be unfair.
   */
  private updateBlockade() {
    const w = this.world;
    const r = this.run;
    const p = w.player;
    const charged = r.superJumps > 0 || r.hyperJumps > 0;
    if (this.blockade) {
      const [a, b] = this.blockade;
      if (w.dist > b.dist + 8) {
        this.blockade = null;
        return;
      }
      if (!charged && !p.isSuper && !this.superFlight) {
        this.removeRows(this.blockade);
        this.blockade = null;
        return;
      }
      if (!this.blockadeWarned && a.dist - w.dist < 120 && charged) {
        this.blockadeWarned = true;
        this.ui.toast(`${ICON.rocket} CAR BLOCKADE AHEAD · tap the ROADSTER button`, '#9b6bff');
        this.audio.play('beep');
      }
      return;
    }
    if (this.state !== 'run' || this.tutorialMode || !charged || w.dist < this.nextBlockadeAt) return;
    if (!this.course) return; // v2 Endless: no row ever needs a special item
    this.blockade = w.spawner.injectBlockade();
    this.blockadeWarned = false;
    this.nextBlockadeAt = w.dist + 520;
  }

  private removeRows(rows: RowSpec[]) {
    const w = this.world;
    for (const o of [...w.obstacles]) if (rows.includes(o.row)) this.obstacleViews.despawn(o);
    w.obstacles = w.obstacles.filter((o) => !rows.includes(o.row));
    w.upcoming = w.upcoming.filter((row) => !rows.includes(row));
    w.spawner.rows = w.spawner.rows.filter((row) => !rows.includes(row));
  }

  /**
   * Look ~0.8 s ahead: if the car's current lane/height won't pass the next row,
   * show an arrow for the move that does (prefer staying in lane: down/up, else the open lane).
   */
  private updateDanger(dt: number) {
    let hint: string | null = null;
    const w = this.world;
    const p = w.player;
    const r = this.run;
    const on = this.save.settings.assist !== false && this.state === 'run' && !(this.tutorialMode && this.tutPrompting) && !r.invulnerable && !p.isSuper;
    if (on) {
      for (const row of w.upcoming) {
        const t = (row.dist - w.dist) / Math.max(1, w.speed);
        if (t < 0.12) continue;
        if (t > 0.85) break;
        const lane = p.lane;
        const st = p.vmode === 'up' && p.airTimeLeft >= t ? PASS_H : p.vmode === 'down' && p.vphase !== 'recover' ? PASS_L : PASS_N;
        const m = row.masks[lane];
        if (m & st) break; // this row is fine
        if (m & PASS_L && st !== PASS_H) hint = 'down';
        else if (m & PASS_H && p.canJump) hint = 'up';
        else if (lane > 0 && row.masks[lane - 1] & PASS_N) hint = 'left';
        else if (lane < 2 && row.masks[lane + 1] & PASS_N) hint = 'right';
        else if (r.superJumps > 0 || r.hyperJumps > 0) hint = 'rocket';
        else if (r.escapes > 0) hint = 'sos';
        break;
      }
    }
    // tutorial visibility state machine: a gesture the player has already answered 3× is "learned"
    // and its hint is not shown again (SOS pulse is always allowed)
    // the small corner arrow is always shown in a hard moment (no 'learned' suppression)
    if (hint) {
      this.dangerHold = 0.3;
      if (hint !== this.dangerHint) {
        this.dangerHint = hint;
        this.ui.danger(hint);
      }
    } else if (this.dangerHint) {
      this.dangerHold -= dt;
      if (this.dangerHold <= 0 || !on) {
        this.dangerHint = null;
        this.ui.danger(null);
      }
    }
  }

  private handleWorldEvents(ev: WorldEvent[]) {
    for (const e of ev) {
      if (e.type === 'world') this.onWorldChange(e.world);
      if (e.type === 'smash') this.obstacleViews.hide(e.o);
      if (e.type === 'hit') {
        const p = this.world.player;
        const m = e.o.row.masks[p.lane];
        const need = m === 0 ? 'lane change' : m & PASS_N ? 'stay level' : m & PASS_H ? 'fly UP' : 'fly DOWN';
        this.lastHit = `${e.o.spec.type} ${e.o.row.pid ?? ''} T${e.o.row.tier ?? '?'} · lane ${p.lane} ${p.heightState} · needed: ${need}`;
      }
    }
  }

  private handleFeedback() {
    const fb: Feedback[] = this.run.feedback;
    if (!fb.length) return;
    for (const f of fb) {
      switch (f.t) {
        case 'coin': {
          this.audio.play('coin');
          this.particles.burst(f.x, f.y, 0, 6, 0xffd23d, 4, 0.25, 0.3, { drag: 4 });
          const s = this.toScreen(f.x, f.y, f.z);
          if (s) this.ui.flyTo(s.x, s.y, ICON.coin, 'coins', 70);
          break;
        }
        case 'power': {
          const k = f.kind as Exclude<PickupKind, 'coin'>;
          this.audio.play(k === 'shield' ? 'shield' : k === 'turbo' ? 'turbo' : 'power');
          this.particles.burst(f.x, f.y, 0, 10, POWER_COLORS[k], 5, 0.25, 0.5); // small, soft — no flash
          this.rings.spawn(this.tmpV.set(f.x, f.y, 0), POWER_COLORS[k], 3.2, 0.5);
          {
            const s = this.toScreen(f.x, f.y, f.z);
            const tgt = k === 'super' ? 'rocket' : k === 'escape' ? 'sos' : k === 'life' ? 'hearts' : 'powers';
            if (s) window.setTimeout(() => this.ui.flyTo(s.x, s.y, POWER_ICON[k], tgt), 60);
          }
          // big pickup title zooms out toward the player (steady glow, no screen flash)
          this.ui.bigPickup(POWER_LABEL[k], '#' + POWER_COLORS[k].toString(16).padStart(6, '0'), POWER_ICON[k], k === 'shield' ? `blocks ${SHIELD_HITS} hits` : POWER_SUB[k]);
          if (k !== 'turbo') this.vibrate(14);
          if (k === 'turbo') {
            this.vibrate([40, 30, 40]);
            this.vehicle.boostKick(1);
            this.rig.shake(0.25);
            this.rig.fovKick += 6;
          }
          if (k === 'life') this.ui.toast(`${POWER_ICON.life} EXTRA LIFE`, 'var(--red)');
          if (k === 'super') this.ui.toast(`${POWER_ICON.super} ROADSTER JUMP ready · tap the ROADSTER button`, '#9b6bff');
          if (k === 'dash') this.ui.toast(`${POWER_ICON.dash} AIR DASH ×${this.run.dashes} · from an edge lane: jump, swipe twice → flip`, '#2ee6c8');
          if (k === 'escape') this.ui.toast(`${POWER_ICON.escape} SKY ESCAPE ready · tap SOS (E) in an emergency`, '#ff5a3c');
          break;
        }
        case 'near': {
          this.audio.play('near', { pan: clamp(f.x / 4, -1, 1) });
          this.ui.pop('NEAR MISS', '#b6ff2e', '', 6);
          this.vibrate(10);
          for (let i = 0; i < 4; i++) this.particles.emit(f.x * 0.6, f.y, -1, 0, 0, 14, 0xb6ff2e, 0.1, 0.2, { drag: 1 });
          this.rig.fovKick += 2;
          break;
        }
        case 'ring':
          this.audio.play('ring');
          this.vibrate(8);
          this.ui.pop('RING', '#4fc3ff', '', 2);
          this.rings.spawn(this.tmpV.copy(this.vehicle.root.position), 0x39b6ff, 3, 0.5);
          break;
        case 'combo':
          this.audio.play('combo');
          // only whole multipliers get a pop (x2, x3, x4) — fewer interruptions
          break;
        case 'shieldBreak': {
          this.audio.play('shieldBreak');
          this.vehicle.shieldHit();
          this.vibrate([30, 40, 30]);
          this.rig.shake(0.35);
          this.particles.burst(this.vehicle.root.position.x, this.vehicle.root.position.y, 0, 30, 0x3d9bff, 9, 0.3, 0.5);
          const left = this.run.shield ? this.run.shieldHits : 0;
          this.ui.pop(left > 0 ? `SHIELD ×${left}` : 'SHIELD GONE', left > 0 ? '#6fc8ff' : '#9fb3dd', '', -8);
          break;
        }
        case 'smash':
          this.audio.play('explode');
          // obstacle shattered: real chunks fly off + orange/blue sparks (no white flash)
          this.debris.explode(this.tmpV.set(f.x, f.y, f.z), 0x3a3f4c, 0x4fb8ff, true);
          this.particles.burst(f.x, f.y, f.z, 46, 0xff8a1f, 13, 0.4, 0.75, { locked: true, grav: 7, up: 3 });
          this.particles.burst(f.x, f.y, f.z, 24, 0x5cc2ff, 10, 0.3, 0.5, { locked: true, grav: 4 });
          this.smoke.emit(f.x, f.y, f.z, 0, 1.2, 0, 0x9aa3b5, 0.6, 0.55, { drag: 2, grow: 2, locked: true });
          this.rig.shake(0.32);
          this.vibrate(25);
          break;
        case 'crash':
          break;
        case 'expire':
          this.audio.play('expire');
          break;
      }
    }
    fb.length = 0;
  }

  /** one short haptic tap (fly, flip, booster, turbo, crash) — Settings ▸ Vibration */
  /** haptics (Android / supported browsers; iOS Safari ignores it). Pattern = [on, off, on, …] ms */
  private vibrate(ms: number | number[]) {
    if (this.save.settings.vibrate === false || this.autopilot) return;
    try {
      navigator.vibrate?.(ms);
    } catch {
      /* not supported (iOS Safari) */
    }
  }

  /** what would have avoided the last crash (shown on respawn / continue / game over) */
  private lastTip: CrashTip | null = null;

  private onCrash(final: boolean) {
    if (this.lastTip && !final) {
      const t = this.lastTip;
      window.setTimeout(() => this.ui.toast(`${ICON.info} <b>TIP</b> · ${t.text}`, '#4fc3ff'), 700);
    }
    this.dangerHint = null;
    this.ui.danger(null);
    const p = this.world.player;
    this.livesLost++;
    this.setState('dying');
    p.frozen = true;
    this.input.enabled = false;
    const pos = this.vehicle.root.position.clone();
    const skin = SKINS.find((s) => s.id === this.save.vehicle) ?? SKINS[0];
    if (!final) this.debris.explode(pos, skin.body, skin.glow);
    this.particles.burst(pos.x, pos.y, pos.z, 36, 0xd8742a, 10, 0.55, 0.8, { grav: 4 });
    this.particles.burst(pos.x, pos.y, pos.z, 30, 0x555a66, 4, 1.2, 1.3, { drag: 1.5, up: 2 });
    this.audio.play('crash');
    window.setTimeout(() => this.audio.play('explode'), 60);
    this.rig.shake(final ? 0.7 : 0.45);
    // heavy, ragged rumble on the final crash; one solid hit otherwise
    this.vibrate(final ? [90, 40, 140, 50, 60] : [70]);
    if (final) this.shatter.burst(this.vehicle); // a few pieces fly off; the car stays on the road
    this.ui.tutorial(false);
    if (final) this.rig.mode = 'crash';
    this.audio.intensity = 0;
  }

  private respawn() {
    this.shatter.clear();
    const w = this.world;
    const p = w.player;
    this.setState('respawn');
    w.clearAhead(70);
    p.reset(p.lane);
    p.frozen = false;
    this.input.enabled = true;
    this.run.invulnT = 2.4;
    this.vehicle.resetPose();
    this.speedScale = 0.25;
    const c = this.tmpV.set(LANES[p.lane], HEIGHT.NORMAL, 0);
    for (let i = 0; i < 4; i++) window.setTimeout(() => this.rings.spawn(c.clone(), 0x39b6ff, 2.5 + i * 0.6, 0.6, i % 2 === 0), i * 90);
    this.particles.burst(c.x, c.y, 0, 60, 0x6fd2ff, 6, 0.35, 0.7);
    this.audio.play('respawn');
    this.vibrate(20);
    this.vehicle.boostKick(0.8);
    this.ui.toast(`${ICON.heart} RESPAWN · ${this.run.lives} ${this.run.lives === 1 ? 'life' : 'lives'} left`, 'var(--red)');
  }

  /** unused Roadster / HYPER / SOS charges at the finish line → bonus points (shown on the result) */
  private leftover: { pts: number; items: string } | null = null;
  private cashLeftovers() {
    this.leftover = null;
    const r = this.run;
    const parts: string[] = [];
    let pts = 0;
    const add = (n: number, each: number, name: string) => {
      if (n <= 0) return;
      pts += n * each;
      parts.push(`${n}× ${name}`);
    };
    add(r.superJumps, LEFTOVER_POINTS.super, 'Roadster Jump');
    add(r.hyperJumps, LEFTOVER_POINTS.hyper, 'HYPER JUMP');
    add(r.escapes, LEFTOVER_POINTS.escape, 'Sky Escape');
    if (pts <= 0) return;
    const total = Math.round(pts * r.scoreMul);
    r.score += total;
    r.superJumps = r.hyperJumps = r.escapes = 0;
    this.leftover = { pts: total, items: parts.join(' + ') };
    window.setTimeout(() => {
      this.ui.pop(`+${total.toLocaleString('en-US')}`, '#c9a8ff', 'UNUSED BOOSTS', -18);
      this.ui.toast(`${ICON.rocket} Unused boosts → points · ${parts.join(' + ')} = +${total.toLocaleString('en-US')}`, '#9b6bff');
      this.audio.play('combo');
    }, 900);
  }

  private onFinish() {
    if (!this.tutorialMode && this.course) this.cashLeftovers();
    this.setState('finish');
    this.input.enabled = false;
    this.rig.mode = 'garage';
    // (no ground roll — the car only flips in the air)
    this.ui.tutorial(false);
    this.audio.play('mission');
    this.audio.intensity = 0;
    this.ui.banner(this.tutorialMode ? 'PILOT TRAINING' : 'TRACK COMPLETE', this.tutorialMode ? 'COMPLETE!' : 'FINISH!');
    this.timeScale = this.timeScaleTarget = 1;
    this.ui.tutPrompt(null);
    // confetti + celebration rings
    const colors = [0xffc21a, 0x39b6ff, 0xff4fd8, 0xb6ff2e, 0xffffff];
    const p = this.vehicle.root.position;
    for (let k = 0; k < 5; k++) {
      window.setTimeout(() => {
        // gentle confetti only — no rings, no flash
        this.particles.burst(p.x + (Math.random() - 0.5) * 6, p.y + 3 + Math.random() * 2, -4 - Math.random() * 6, 18, colors[k], 6, 0.2, 1.4, { grav: 7, up: 3 });
      }, k * 220);
    }
  }

  private showFinish() {
    const run = this.run;
    const c = this.course!;
    this.finishShown = true;
    this.missions.endRun();
    const stars = 1 + (this.livesLost === 0 ? 1 : 0) + (run.coins >= c.coinTarget ? 1 : 0);
    const lv = LEVELS[this.runLevel];
    const reward = Math.round((c.reward * stars * lv.reward) / 3 / 10) * 10;
    const speedBonus = Math.round(run.coins * (lv.reward - 1));
    const score = Math.floor(run.score);
    const isBest = score > (this.save.trackBest[c.id] ?? 0);
    this.save.trackBest[c.id] = Math.max(score, this.save.trackBest[c.id] ?? 0);
    this.save.trackStars[c.id] = Math.max(stars, this.save.trackStars[c.id] ?? 0);
    this.save.best = Math.max(this.save.best, score);
    this.save.bestDistance = Math.max(this.save.bestDistance, Math.floor(run.distance));
    this.save.wallet += run.coins + speedBonus + reward;
    this.save.totalRuns++;
    // big-reward tracks: item bonus into the Magic Bag
    const bonusItems: string[] = [];
    for (const rule of TRACK_ITEM_BONUS) {
      if (c.reward < rule.minReward || stars < rule.stars) continue;
      for (const [k, n] of Object.entries(rule.items)) {
        this.save.items[k as ItemKey] += n ?? 0;
        bonusItems.push(`+${n} ${({ super: 'Roadster Jump', hyper: 'HYPER JUMP', escape: 'Sky Escape', shield: 'Start Shield' } as Record<string, string>)[k]}`);
      }
    }
    if (bonusItems.length) window.setTimeout(() => this.ui.toast(`${ICON.bag} Track bonus → Magic Bag · ${bonusItems.join(' · ')}`, '#c24dff'), 1200);
    const rewards = this.recordMeta(true);
    this.persist();
    this.ui.finish({
      rewards,
      track: c.name,
      stars,
      score,
      isBest,
      time: this.runTime,
      coins: run.coins,
      coinTarget: c.coinTarget,
      lost: this.livesLost,
      reward,
      speedBonus,
      level: lv.label,
      hasNext: COURSES.indexOf(c) < COURSES.length - 1,
      leftover: this.leftover,
      bonusItems,
    });
    this.ui.show('finish');
    this.lastResult = { coins: run.coins, reward, doubled: false };
    this.ui.adButton('ad2xf', 'ready');
    this.ads.runEnded();
  }

  private gameOver() {
    this.holdContinue = false;
    this.returnTo = null;
    const run = this.run;
    this.setState('gameover');
    this.input.enabled = false;
    this.missions.endRun();
    const score = Math.floor(run.score);
    const isBest = score > this.save.best;
    if (isBest) this.save.best = score;
    const tid = this.course?.id ?? 'endless';
    this.save.trackBest[tid] = Math.max(score, this.save.trackBest[tid] ?? 0);
    this.save.bestDistance = Math.max(this.save.bestDistance, Math.floor(run.distance));
    const lvg = LEVELS[this.runLevel];
    const speedBonus = Math.round(run.coins * (lvg.reward - 1));
    this.save.wallet += run.coins + speedBonus;
    this.save.totalRuns++;
    const rewards = this.recordMeta(false);
    this.persist();
    this.ui.gameOver({ score: run.exp, best: this.save.expBest, isBest: !!rewards && rewards.exp > 0 && rewards.to > rewards.from, dist: run.distance, length: this.course?.length, coins: run.coins, near: run.nearMiss, missions: this.runMissionsDone, rewards, speedBonus, level: lvg.label, tip: this.lastTip });
    this.lastResult = { coins: run.coins, reward: 0, doubled: false };
    this.ui.adButton('ad2x', run.coins > 0 ? 'ready' : 'used', 'No coins to double');
    this.ads.runEnded();
    this.ui.show('gameover');
    if (rewards && rewards.to > rewards.from) this.audio.play('mission');
  }

  private onWorldChange(id: WorldId) {
    this.scenery.setWorld(id);
    this.track.setAccent(new THREE.Color(this.scenery.accent));
    this.applyReadability();
    this.track.setOpenAir(this.scenery.openAir);
    const idx = WORLDS.indexOf(id) + 1;
    this.ui.banner(`WORLD ${idx}`, WORLD_NAMES[id]);
    this.ui.flash();
    this.audio.play('warp');
    this.rig.fovKick += 10;
    this.speedLines.intensity = 1.2;
  }

  // =============================================================== visuals
  private updateVisuals(dt: number) {
    const w = this.world;
    const p = w.player;
    const running = this.state === 'run' || this.state === 'dying' || this.state === 'respawn' || this.state === 'countdown' || this.state === 'finish' || this.state === 'gameover';
    if (!running) {
      this.obstacleViews.update(w.obstacles, this.time, dt);
      this.pickupViews.update(w.pickups, this.time, this.rig.camera.quaternion);
      this.particles.update(dt, 0);
      this.smoke.update(dt, 0);
      this.rings.update(dt, 0);
      this.updateTrails(dt, 9, 0);
      return;
    }
    const run = this.run;
    const turbo = run && run.turboT > 0 ? 1 : 0;
    const speedFactor = clamp((w.speed - SPEED.start) / (SPEED.max - SPEED.start), 0, 1);
    if (this.state !== 'countdown') {
      this.scenery.update(w.dist, this.time, dt);
      this.track.update(w.dist);
    }
    if (this.state !== 'dying' && this.state !== 'gameover') this.vehicle.update(p, dt, w.speed, turbo);
    this.tyreSpray(dt, w.speed);
    this.obstacleViews.update(w.obstacles, this.time, dt);
    this.pickupViews.update(w.pickups, this.time, this.rig.camera.quaternion);
    const scroll = this.state === 'countdown' ? 0 : w.speed;
    this.particles.update(dt, scroll);
    this.smoke.update(dt, scroll);
    this.rings.update(dt, scroll);
    this.debris.update(dt, this.state === 'run' ? this.world.speed : 0);
    this.shatter.update(dt);
    this.portal.update(dt);

    // speed lines
    // side speed streaks: always a little while racing, more with speed, most in Turbo
    const comfortK = this.save.settings.comfort !== false ? 0.75 : 1;
    const wantLines = (turbo ? 1 : this.state === 'run' ? 0.18 + speedFactor * 0.55 : 0) * comfortK;
    // velocity-based edge blur (High quality): grows with speed, extra in Turbo; light shake in Turbo
    const blurWant = this.state === 'run' ? (0.016 + speedFactor * 0.04 + turbo * 0.05) * comfortK : 0;
    this.speedBlurS += (blurWant - this.speedBlurS) * damp(4, dt);
    this.renderer.setSpeedBlur(this.speedBlurS);
    this.rig.rumble = turbo && this.state === 'run' ? 0.16 * comfortK : 0;
    this.speedLines.intensity += (wantLines - this.speedLines.intensity) * damp(3, dt);
    this.speedLines.update(dt, w.speed, this.scenery.accent);

    // shield bubble
    const sh = this.shield;
    // the X1 render shows protection as its own calm aura; the mote cloud is only for 3D bodies
    sh.mesh.visible = !!run && run.shield && this.state !== 'dying' && !this.vehicle.usesSprite;
    // the shield is the hexagon dome; the soft aura is for the other power-ups
    // (Turbo and rockets use the flames + smoke render instead of the aura — no double glow)
    // power-up visuals only while actually racing (never on the game-over / menu screens: the
    // last run's shield or turbo used to stay glowing around the car on the next run)
    const racing = !!run && (this.state === 'run' || this.state === 'respawn' || this.state === 'countdown');
    this.vehicle.auraTarget = racing && (run.magnetActive || run.doubleT > 0) ? 1 : 0;
    this.vehicle.shieldTarget = racing && run.shield ? 1 : 0;
    // boost look while Turbo runs or a Roadster / HYPER / SOS rocket is climbing
    this.vehicle.boostTarget = run && this.state === 'run' && (run.turboT > 0 || (this.world.player.isSuper && this.world.player.vphase !== 'recover')) ? 1 : 0;
    if (sh.mesh.visible) {
      sh.mesh.position.copy(this.vehicle.root.position);
      sh.mesh.quaternion.copy(this.vehicle.root.quaternion);
      sh.mat.uniforms.time.value = this.time;
      // steady; fades smoothly in the last 2 s instead of flickering
      sh.mat.uniforms.strength.value = run.shieldT > 0 && run.shieldT < 2 ? 0.35 + 0.325 * run.shieldT : 1;
    }

    // magnet field pulse
    // (magnet pulse rings removed — repeating rings read as flashing)

    // bloom tracks turbo
    const rp = READABILITY[this.scenery.world];
    const comfort = this.save.settings.comfort !== false;
    void comfort;
    this.renderer.setBloom(rp.bloom * COMFORT.bloomMul); // constant: boosts never brighten the screen

    if (this.state !== 'dying' && this.state !== 'gameover') this.updateTrails(dt, w.speed, turbo);
    this.rig.update(dt, p, speedFactor, turbo);
  }

  /** Thruster exhaust trails + fly-up plasma column. */
  /** world point → pixel position inside the UI layer (null when behind the camera) */
  private toScreen(x: number, y: number, z: number) {
    const v = this.tmpV.set(x, y, z).project(this.rig.camera);
    if (v.z > 1) return null;
    const r = this.ui.root.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  }

  /** blue energy particles out of the two jets (take-off / landing bursts) */
  private energyBurst(n: number, vy: number) {
    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < n; k++) {
        const pos = this.vehicle.jetWorld(i, this.tmpV);
        this.particles.emit(pos.x + (Math.random() - 0.5) * 0.15, pos.y - Math.random() * 0.2, pos.z, (Math.random() - 0.5) * 1.2, vy - Math.random() * 3, 1.5, 0x4fb8ff, 0.09, 0.3, { drag: 2.4, locked: true });
      }
    }
  }

  /** energy trail while airborne (hops, Roadster / HYPER, Sky Escape); nothing on the road */
  private updateTrails(dt: number, speed: number, turbo: number) {
    if (!this.vehicle.visibleBlink) return;
    const p = this.world.player;
    if (p.air < 0.4 && turbo <= 0) return;
    const low = this.renderer.quality === 'low';
    const rate = (low ? 14 : 30) * (p.isSuper ? 1.6 : 1) * (turbo > 0 ? 2 : 1) * dt;
    for (let i = 0; i < 2; i++) {
      let k = rate;
      while (k > 0) {
        if (Math.random() > k) break;
        k -= 1;
        const pos = this.vehicle.jetWorld(i, this.tmpV);
        if (p.air < 0.4) this.particles.emit(pos.x + (Math.random() - 0.5) * 0.1, pos.y + 0.15, pos.z + 0.2, (Math.random() - 0.5) * 0.5, -0.4, 9 + Math.random() * 4, 0x5cc2ff, 0.12, 0.25, { drag: 1.5 });
        else this.particles.emit(pos.x + (Math.random() - 0.5) * 0.1, pos.y - 0.3 - Math.random() * 0.3, pos.z, (Math.random() - 0.5) * 0.4, -4 - p.engine * 4, speed > 1 ? 2 : 0.4, 0x5cc2ff, 0.08, 0.22, { drag: 2.2, locked: speed > 1 });
      }
    }
  }

  // =============================================================== profile
  private persist() {
    this.save.missions.active = this.missions.active.map((a) => ({ id: a.id, progress: a.progress }));
    this.save.missions.completed = this.missions.completed;
    this.save.lastSeen = Date.now();
    writeSave(this.save);
  }

  private applySkin(id: string, preview = false) {
    const s = SKINS.find((x) => x.id === id) ?? SKINS[0];
    // the next car to earn shows in colour (curiosity); cars after it stay a black silhouette
    this.vehicle.setSkin(s, preview && carVisibility(this.save.unlocked, s.id) === 'dark');
    this.rig.rearOnly = s.shape === 'gt';
  }

  private previewSkin(id: string) {
    this.audio.play('click');
    this.applySkin(id, true);
    // (no ground roll — the car only flips in the air)
    this.ui.garageSync(this.save);
  }

  private selectSkin(id: string) {
    if (!this.save.unlocked.includes(id)) return;
    this.save.vehicle = id;
    this.persist();
    this.audio.play('power');
    this.ui.garageSync(this.save);
  }

  private buySkin(id: string) {
    const s = SKINS.find((x) => x.id === id);
    if (!s || this.save.unlocked.includes(id) || this.save.wallet < s.price) return;
    if (carVisibility(this.save.unlocked, id) !== 'next') return; // cars unlock in order
    if (CLASSES.indexOf(classFor(this.save.expBest)) < CLASSES.indexOf((s.need ?? 'D') as (typeof CLASSES)[number])) return;
    this.save.wallet -= s.price;
    this.save.unlocked.push(id);
    this.save.vehicle = id;
    this.applySkin(id);
    this.persist();
    this.audio.play('mission');
    // (no ground roll — the car only flips in the air)
    this.ui.garageSync(this.save);
  }

  private buyUpgrade(k: UpgradeKey) {
    const lvl = this.save.upgrades[k];
    const cost = upgradeCost(lvl);
    if (lvl >= UPGRADE_MAX || this.save.wallet < cost) return;
    this.save.wallet -= cost;
    this.save.upgrades[k] = lvl + 1;
    this.persist();
    this.audio.play('power');
    this.ui.garageSync(this.save);
  }

  private toggleSound() {
    this.audio.unlock();
    this.save.settings.sound = !this.save.settings.sound;
    this.audio.setSfx(this.save.settings.sound);
    this.persist();
    this.ui.refreshProfile(this.save);
    this.audio.play('click');
  }

  private toggleMusic() {
    this.audio.unlock();
    this.save.settings.music = !this.save.settings.music;
    this.audio.setMusic(this.save.settings.music);
    if (this.save.settings.music) this.audio.startMusic();
    this.persist();
    this.ui.refreshProfile(this.save);
  }

  private setSpeed(lv: SpeedLevel) {
    this.save.settings.speed = lv;
    this.persist();
    this.ui.refreshProfile(this.save);
    this.audio.unlock();
    this.audio.play('click');
  }

  private toggleAssist() {
    this.save.settings.assist = this.save.settings.assist === false;
    if (this.save.settings.assist) this.save.hintsLearned = {}; // turning hints back on shows them again
    this.persist();
    this.ui.refreshProfile(this.save);
    this.audio.play('click');
  }

  /** world readability profile → road, rails, obstacle outlines; comfort → pulses/flashes */
  private applyReadability() {
    const rp = READABILITY[this.scenery.world];
    this.track.applyReadability(rp);
    setObstacleContrast(rp.edge, rp.edgeOpacity, rp.hazardLift);
    const comfort = this.save.settings.comfort !== false;
    OBSTACLE_FX.pulse = comfort ? COMFORT.pulse : 1;
    this.ui.setComfort(comfort);
  }

  private toggleComfort() {
    this.save.settings.comfort = this.save.settings.comfort === false;
    this.persist();
    this.applyReadability();
    this.ui.refreshProfile(this.save);
    this.audio.play('click');
  }

  private toggleQuality() {
    this.save.settings.quality = this.renderer.quality === 'high' ? 'low' : 'high';
    this.applyQuality(this.save.settings.quality);
    this.persist();
    this.audio.play('click');
  }

  private applyQuality(q: 'high' | 'low') {
    this.renderer.setQuality(q);
    this.particles.setPixelRatio(this.renderer.pixelRatio);
    this.smoke.setPixelRatio(this.renderer.pixelRatio);
    this.ui.refreshProfile(this.save, q);
  }

  // =============================================================== misc
  private onResize() {
    const aspect = this.renderer.resize();
    this.rig.resize(aspect);
  }

  /** Drops to LOW for this session if the device can't hold ~42 fps. */
  private trackPerformance(rawDt: number) {
    this.frameTimes.push(rawDt);
    if (this.frameTimes.length > 90) this.frameTimes.shift();
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = 1 / Math.max(1e-4, avg);
    this.qualityChecked += rawDt;
    if (this.state === 'run' && this.qualityChecked > 4 && this.renderer.quality === 'high' && this.fps < 42 && !DEBUG && !/[?&]noauto/.test(location.search)) {
      this.qualityChecked = 0;
      this.frameTimes.length = 0;
      // graceful scaling: resolution 2 → 1.75 → 1.5, then bloom off, only then LOW (session only)
      if (this.renderer.degrade()) {
        this.particles.setPixelRatio(this.renderer.pixelRatio);
        this.smoke.setPixelRatio(this.renderer.pixelRatio);
        return;
      }
      this.applyQuality('low');
      this.ui.toast(`${ICON.gear} Graphics set to LOW for smoother play`);
    }
  }

  private makeDebugBoxes() {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(64 * 24 * 3), 3));
    this.debugBoxes = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x00ff66, depthTest: false, transparent: true, toneMapped: false }));
    this.debugBoxes.frustumCulled = false;
    this.debugBoxes.renderOrder = 999;
    this.renderer.scene.add(this.debugBoxes);
  }

  private updateDebug() {
    const w = this.world;
    const p = w.player;
    const info = this.renderer.info.render;
    // next row: pattern, tier, time to collision, safe lanes, reaction margin
    const next = w.upcoming.find((r) => r.dist > w.dist + 0.5);
    let rowInfo = 'next row —';
    if (next) {
      const ttc = (next.dist - w.dist) / Math.max(1, w.speed);
      const safe: string[] = [];
      let bestNeed = Infinity;
      for (let l = 0; l < 3; l++) {
        const m = next.masks[l];
        if (!m) continue;
        safe.push(`${l}${m & PASS_N ? 'N' : ''}${m & PASS_H ? 'H' : ''}${m & PASS_L ? 'L' : ''}`);
        const move = Math.abs(l - p.lane) * FAIRNESS.laneStepTime + (m & PASS_N ? 0 : FAIRNESS.verticalTime);
        bestNeed = Math.min(bestNeed, move);
      }
      const t = (next.tier ?? 0) as Tier;
      rowInfo = `next ${next.pid ?? '?'} ${t ? TIER_NAME[t] : 'EMPTY'}  ttc ${ttc.toFixed(2)}s  safe [${safe.join(' ')}]  margin ${(ttc - bestNeed).toFixed(2)}s`;
    }
    const cfg = MAPS[this.scenery.world];
    this.ui.debug(
      `fps ${this.fps.toFixed(0)}  calls ${info.calls}  tris ${(info.triangles / 1000).toFixed(0)}k  dpr ${this.renderer.pixelRatio.toFixed(2)}\n` +
        `map ${this.scenery.world} (${cfg.target}/10)  level ${this.save.settings.speed}\n` +
        `${rowInfo}\n` +
        `last hit: ${this.lastHit}\n` +
        `state ${this.state}  world ${w.world}\n` +
        `lane ${p.lane}  y ${p.y.toFixed(2)} ${p.heightState}  ${p.vmode}/${p.vphase}\n` +
        `speed ${w.speed.toFixed(1)}  dist ${w.dist.toFixed(0)}  obst ${w.obstacles.length}  pick ${w.pickups.length}`,
    );
    if (!this.debugBoxes) return;
    const arr = (this.debugBoxes.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    let n = 0;
    const push = (b: Box) => {
      if (n >= 64) return;
      const c = [
        [b.minX, b.minY, b.minZ], [b.maxX, b.minY, b.minZ], [b.maxX, b.maxY, b.minZ], [b.minX, b.maxY, b.minZ],
        [b.minX, b.minY, b.maxZ], [b.maxX, b.minY, b.maxZ], [b.maxX, b.maxY, b.maxZ], [b.minX, b.maxY, b.maxZ],
      ];
      const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
      let o = n * 72;
      for (const [a, bb] of e) {
        arr.set(c[a], o);
        arr.set(c[bb], o + 3);
        o += 6;
      }
      n++;
    };
    push(p.hitbox({ minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }));
    for (const o of w.obstacles) for (const b of o.boxes) push(b);
    arr.fill(0, n * 72);
    this.debugBoxes.geometry.attributes.position.needsUpdate = true;
  }

  /** Test hook: base speed for a distance (exposed for tooling). */
  static speedAt = speedAt;

  /**
   * Capture/demo hook (used to record the Roadster Jump guide video): clears the road
   * ahead and scripts a rocket pickup in `rocketLane` followed by two back-to-back walls.
   */
  demoScript(kind: PickupKind = 'super', rocketLane = 2, at = 70) {
    const w = this.world;
    w.clearAhead(260);
    for (const p of [...w.pickups]) if (p.spec.kind !== 'coin') this.pickupViews.despawn(p);
    w.pickups = w.pickups.filter((p) => p.spec.kind === 'coin');
    const sp = w.spawner;
    sp.scripted = true;
    sp.rows.length = 0;
    sp.pickups.length = 0;
    const d = w.dist;
    const wall = (dist: number, v: number) => {
      const obstacles = [0, 1, 2].map((lane) => ({ type: 'traffic' as const, lane, variant: lane === (v ? 0 : 1) ? 4 : (v + lane) % 4 }));
      return { dist, dt: 1, masks: rowMasks(obstacles), obstacles };
    };
    sp.rows.push(wall(d + at + 95, 0), wall(d + at + 112, 1));
    this.nextBlockadeAt = d + 5000; // no random blockade during the scripted demo
    sp.pickups.push({ kind, lane: rocketLane, dist: d + at, y: HEIGHT.NORMAL });
    for (let k = 1; k <= 6; k++) sp.pickups.push({ kind: 'coin', lane: rocketLane, dist: d + at + 8 + k * 5, y: HEIGHT.NORMAL });
    for (let k = 0; k < 8; k++) sp.pickups.push({ kind: 'coin', lane: rocketLane, dist: d + at + 140 + k * 5, y: HEIGHT.NORMAL });
  }

  /** end a demo script: normal generation resumes after the scripted stretch */
  demoEnd() {
    const sp = this.world.spawner;
    sp.scripted = false;
    sp.resetReach(this.world.player.lane);
  }
}
