// v5 native QA: the TikTok build (tiktok/game.js) in the HS fake-phone preview (TikTok Minis + Android),
// driven by REAL taps on the canvas UI's own hit regions (NativeUI → Gfx.hits), screenshots per screen.
//
//   node scripts/qa/native.mjs <outDir> [--platform android] [--only=a,b]
//
// Needs Chromium + Playwright (the cloud QA image has them in /opt/npm-tools). Starts its own preview
// (scripts/tiktok-tools.mjs preview) on a free port and stops it at the end.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = process.argv[2] ?? 'qa-native';
const android = process.argv.includes('--platform') && process.argv[process.argv.indexOf('--platform') + 1] === 'android';
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '').slice(7).split(',').filter(Boolean);
const want = (s) => !only.length || only.includes(s);
mkdirSync(out, { recursive: true });
let chromium;
try {
  ({ chromium } = createRequire(join(root, 'package.json'))('playwright'));
} catch {
  ({ chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright'));
}

const port = 8300 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, [join(root, 'scripts/tiktok-tools.mjs'), 'preview', '--port', String(port), ...(android ? ['--platform', 'android'] : [])], { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
await new Promise((res, rej) => {
  const t = setTimeout(() => rej(new Error('preview did not start')), 30000);
  srv.stdout.on('data', (d) => String(d).includes('http://') && (clearTimeout(t), res()));
});

const R = { platform: android ? 'android' : 'tiktok', checks: [], errors: [] };
const check = (ok, msg, data) => {
  R.checks.push({ ok: !!ok, msg, data });
  console.log(`  ${ok ? '✓' : '✗'} ${msg}${data !== undefined ? ' ' + JSON.stringify(data).slice(0, 220) : ''}`);
};
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', (e) => R.errors.push(`page: ${e.message}`));
try {
  await page.goto(`http://127.0.0.1:${port}/`);
  // the game frame
  let fr = null;
  for (let i = 0; i < 120 && !fr; i++) {
    fr = page.frames().find((f) => f.url().includes('__hs_frame'));
    if (!fr) await page.waitForTimeout(250);
  }
  fr.on?.('pageerror', (e) => R.errors.push(`frame: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') R.errors.push(`console: ${m.text()}`);
  });
  const ev = (fn, arg) => fr.evaluate(fn, arg);
  await fr.waitForFunction(() => window.__xwave && window.__xwave.state === 'menu', null, { timeout: 120000 });
  await page.waitForTimeout(1500);
  const frameEl = await fr.frameElement();
  const box = await frameEl.boundingBox();
  const view = await ev(() => ({ w: innerWidth, h: innerHeight }));
  const k = box.width / view.w;
  const shot = async (name) => {
    await page.waitForTimeout(450);
    await frameEl.screenshot({ path: join(out, `${name}.png`), timeout: 120000 });
  };
  /** tap the canvas UI hit region `key` (exact or prefix*) like a finger */
  const tap = async (key, opt = {}) => {
    // SwiftShader draws ~10 fps here: wait until the canvas UI has drawn the button (its hit region)
    let h = null;
    const t0 = Date.now();
    await page.waitForTimeout(opt.wait ?? 200);
    while (!h && Date.now() - t0 < (opt.timeout ?? 15000)) {
      h = await ev((key) => {
        const hits = window.__xwave.ui.g.hits;
        const m = key.endsWith('*') ? hits.filter((x) => x.key.startsWith(key.slice(0, -1))) : hits.filter((x) => x.key === key);
        const z = m[m.length - 1];
        if (!z) return null;
        const p = { x: z.x + z.w / 2, y: z.y + z.h / 2 };
        // the button must be the TOPMOST region at its centre (not under a modal / a stale frame)
        for (let i = hits.length - 1; i >= 0; i--) {
          const q = hits[i];
          if (p.x >= q.x && p.x <= q.x + q.w && p.y >= q.y && p.y <= q.y + q.h) return q === z ? p : null;
        }
        return null;
      }, key);
      if (!h) await page.waitForTimeout(150);
    }
    if (!h) {
      const keys = await ev(() => window.__xwave.ui.g.hits.map((x) => x.key).slice(-60));
      if (!opt.optional) check(false, `tap ${key}: button on screen`, keys);
      return false;
    }
    const d0 = await ev(() => window.__xwave.ui.lastDraw);
    await page.mouse.click(box.x + h.x * k, box.y + h.y * k);
    await fresh(d0);
    return true;
  };
  /** wait for the canvas UI to draw again after `d0` (its hit regions are then current) */
  const fresh = async (d0) => {
    const t0 = Date.now();
    while (Date.now() - t0 < 6000) {
      await page.waitForTimeout(120);
      if ((await ev(() => window.__xwave.ui.lastDraw)) > d0) break;
    }
    await page.waitForTimeout(150);
  };
  /** wait until the UI shows (or stops showing) an overlay / screen */
  const until = async (fn, ms = 15000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (await ev(fn)) {
        await fresh(await ev(() => window.__xwave.ui.lastDraw));
        return true;
      }
      await page.waitForTimeout(150);
    }
    return false;
  };
  const shown = () => ev(() => [...window.__xwave.ui.shown]);
  const state = () => ev(() => window.__xwave.state);

  // ------------------------------------------------------------------ boot + home
  if (want('home')) {
    console.log('A. boot / home');
    const st = await ev(() => ({ v: window.__xwave.ui.version, speed: window.__xwave.save.settings.speed, car: !!window.__xwave.vehicle }));
    check(true, 'boots to the Home screen in the native runtime', st);
    check(st.speed === 'normal', 'launch level is NORMAL (v4.6)', st.speed);
    const perk = await ev(() => window.__xwave.ui.g.hits.map((x) => x.key).filter((k) => k.startsWith('pk-')));
    check(android ? !perk.includes('pk-entry') : perk.includes('pk-share') && perk.includes('pk-entry') && perk.includes('pk-launch'), android ? 'Android: no Entry / Launch Reward (TikTok only)' : 'TikTok review: Share · Entry · Launch Reward on Home', perk);
    await shot('01_home');
  }
  // ------------------------------------------------------------------ settings
  if (want('settings')) {
    console.log('B. settings');
    await tap('settings');
    await shot('02_settings');
    const before = await ev(() => window.__xwave.save.settings.camMotion === true);
    await tap('s-cammotion');
    const after = await ev(() => ({ save: window.__xwave.save.settings.camMotion === true, rig: window.__xwave.rig.dynamic }));
    check(before === false && after.save === true && after.rig === true, 'Camera motion: default OFF, the switch turns it on (rig follows)', { before, after });
    await tap('s-cammotion');
    await tap('q-medium');
    const q = await ev(() => window.__xwave.save.settings.quality);
    check(q === 'medium', 'Graphics LO / MED / HI: MED selected', q);
    await tap('q-high');
    await tap('x-settings', { optional: true });
    await ev(() => window.__xwave.ui.hideOverlay('settings'));
    await until(() => !window.__xwave.ui.shown.has('settings'));
  }
  // ------------------------------------------------------------------ garage
  if (want('garage')) {
    console.log('C. garage');
    await tap('garage');
    await shot('03_garage');
    const g = await ev(() => ({ shown: [...window.__xwave.ui.shown], idx: window.__xwave.ui.garageIndex }));
    check(g.shown.includes('garage'), 'Garage opens', g);
    await tap('car-inferno');
    await shot('04_garage_locked');
    await tap('back');
    await until(() => window.__xwave.ui.shown.has('start'));
  }
  // ------------------------------------------------------------------ shop
  if (want('shop')) {
    console.log('D. shop');
    await ev(() => {
      window.__xwave.save.wallet = 20000;
      window.__xwave.persist();
    });
    await tap('shop');
    await shot('05_shop');
    const s0 = await ev(() => ({ super: window.__xwave.save.items.super, wallet: window.__xwave.save.wallet }));
    await tap('sbuy-super');
    const s1 = await ev(() => ({ super: window.__xwave.save.items.super, wallet: window.__xwave.save.wallet }));
    check(s1.super === s0.super + 1 && s1.wallet < s0.wallet, 'Shop exchange: coins → 1 Roadster Jump', { s0, s1 });
    await tap('shop-inv-hyper');
    await until(() => window.__xwave.ui.shown.has('bagbuy'), 5000);
    check((await shown()).includes('bagbuy'), 'tapping your item opens the exchange popup', await shown());
    await shot('06_shop_exchange_popup');
    await tap('bb-back');
    const beans = await ev(() => window.__xwave.ui.g.hits.some((x) => x.key.startsWith('buy-')));
    check(!beans, 'no TikTok Beans products (owner: ads only)', beans);
    await tap('back');
    await until(() => window.__xwave.ui.shown.has('start'));
  }
  // ------------------------------------------------------------------ bonus
  if (want('bonus')) {
    console.log('E. bonus');
    await tap('events');
    await until(() => window.__xwave.ui.shown.has('bonus'), 5000);
    await shot('07_bonus');
    const b = await ev(() => window.__xwave.ui.bonus);
    check(b && b.maxPlays === 3 && b.openMinutes === 30 && b.everyHours === 1, 'Bonus: every hour, open 30 min, 3 plays', b && { maxPlays: b.maxPlays, open: b.openMinutes, every: b.everyHours, live: b.live });
    await ev(() => window.__xwave.ui.hideOverlay('bonus'));
    await page.waitForTimeout(400);
  }
  // ------------------------------------------------------------------ race: Play → tracks → special → countdown → HUD
  if (want('race')) {
    console.log('F. race');
    await ev(() => {
      const G = window.__xwave;
      G.save.tutorialDone = true;
      G.save.items.super = Math.max(1, G.save.items.super);
      G.persist();
    });
    await tap('play');
    await until(() => window.__xwave.ui.shown.has('tracks'), 6000);
    await shot('08_tracks');
    const sh = await shown();
    check(sh.includes('tracks'), 'Play opens the track list', sh);
    const trackKeys = await ev(() => window.__xwave.ui.g.hits.map((x) => x.key));
    R.trackKeys = trackKeys;
    const endlessKey = trackKeys.find((x) => /endless/i.test(x)) ?? trackKeys.find((x) => /^tr/.test(x));
    if (endlessKey) await tap(endlessKey);
    await until(() => window.__xwave.ui.shown.has('specialpick') || window.__xwave.state !== 'menu', 8000);
    if ((await shown()).includes('specialpick')) {
      await shot('09_special_pick');
      R.pickKeys = await ev(() => window.__xwave.ui.g.hits.map((x) => x.key));
      await tap('sgo');
    }
    // SwiftShader renders the race at a few fps: game time is fast-forwarded with the game's own
    // stepper (Game.advance) between the real taps
    await until(() => window.__xwave.state === 'countdown' || window.__xwave.state === 'run', 10000);
    for (let i = 0; i < 20 && (await state()) === 'countdown'; i++) await ev(() => window.__xwave.advance(0.25));
    await page.waitForTimeout(800);
    await shot('10_race_hud');
    const hud = await ev(() => {
      const ui = window.__xwave.ui;
      const r = ui.g.hits.find((x) => x.key === 'rocket' || x.key === 'sos');
      return { state: window.__xwave.state, special: r ? { key: r.key, y: Math.round(r.y), h: Math.round(r.h) } : null, hearts: ui.hudSpecialBottom };
    });
    check(hud.state === 'run', 'the race runs (countdown → run)', hud.state);
    check(!hud.special || hud.special.y < 260, 'special button under the hearts (top right, v4.6)', hud);
    // steer by swipes (Input via tt touch)
    const x0 = box.x + view.w * 0.5 * k,
      y0 = box.y + view.h * 0.7 * k;
    if ((await state()) !== 'run') throw new Error(`race did not start: ${await state()} ${JSON.stringify(await shown())}`);
    const lane0 = await ev(() => window.__xwave.world.player.lane);
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    await page.mouse.move(x0 - 80 * k, y0, { steps: 4 });
    await page.mouse.up();
    await ev(() => window.__xwave.advance(0.6));
    const lane1 = await ev(() => window.__xwave.world.player.lane);
    check(lane1 === lane0 - 1 || lane0 === 0, 'a left swipe changes lane', { lane0, lane1 });
    // pause never ends the race
    await tap('pause');
    await ev(() => window.__xwave.advance(9)); // 9 s of game time while paused
    const p = await ev(() => window.__xwave.state);
    check(p === 'paused', 'Pause holds (no auto game over after 9 s)', p);
    await shot('11_pause');
    await tap('resume');
    await until(() => window.__xwave.state === 'run', 8000);
    // crash to the end: last life
    await ev(() => {
      const G = window.__xwave;
      G.run.lives = 0;
      G.run.superJumps = 0;
      G.run.hyperJumps = 0;
      G.run.escapes = 0;
    });
    for (let i = 0; i < 240 && !['continue', 'gameover'].includes(await state()); i++) await ev(() => window.__xwave.advance(0.25));
    const st2 = await state();
    await shot('12_revive_or_end');
    /** answer the preview's fake ad screen (a DOM card in the game frame) */
    const adAnswer = async (label) => {
      const b = fr.locator('button, div', { hasText: new RegExp(`^${label}$`) }).last();
      await b.waitFor({ timeout: 15000 });
      await b.click();
    };
    if (st2 === 'continue') {
      check(true, 'last crash → revive offer (rewarded ad place rw_revive)');
      // 1) the ad closed early → no revive, the offer stays (countdown resumes)
      await tap('contad');
      await adAnswer('Closed early');
      await page.waitForTimeout(800);
      check((await state()) === 'continue', 'revive ad closed early → no revive, the offer stays', await state());
      // 2) watched to the end → revived, no heart added (v4.6)
      await tap('contad');
      await adAnswer('Watched to the end');
      await until(() => window.__xwave.state !== 'continue', 8000);
      for (let i = 0; i < 12 && (await state()) === 'respawn'; i++) await ev(() => window.__xwave.advance(0.25));
      const rv = await ev(() => ({ s: window.__xwave.state, lives: window.__xwave.run.lives }));
      check(['run', 'respawn'].includes(rv.s) && rv.lives === 0, 'revive ad watched → back in the race, no extra heart', rv);
      await shot('12b_revived');
      // crash again, decline this time
      for (let i = 0; i < 240 && !['continue', 'gameover'].includes(await state()); i++) await ev(() => window.__xwave.advance(0.25));
      if ((await state()) === 'continue') await tap('contno');
    }
    for (let i = 0; i < 40 && (await state()) !== 'gameover'; i++) await ev(() => window.__xwave.advance(0.25));
    await until(() => window.__xwave.ui.shown.has('runrank'), 8000);
    const go = await shown();
    check(go.includes('gameover'), 'game over → result card', go);
    check(go.includes('runrank'), 'v4.6 post-race weekly rank board over the result card', go);
    await shot('13_rank_board');
    await tap('rr-details');
    await until(() => !window.__xwave.ui.shown.has('runrank'), 5000);
    await shot('14_result_card');
    const rs = await ev(() => window.__xwave.ui.g.hits.some((x) => x.key === 'go-retry'));
    check(rs, 'result card has Restart', rs);
  }
  // ------------------------------------------------------------------ class promotion (C reward)
  if (want('classup')) {
    console.log('G. class promotion');
    await ev(() => {
      const G = window.__xwave;
      G.goHome?.();
      G.save.classCelebrated = ['B', 'A', 'AA', 'AAA', 'S', 'SS', 'SSS'];
      G.save.expBest = 3000;
      window.__w0 = G.save.wallet;
      window.__s0 = G.save.items.super;
      G.queueClassCelebration();
    });
    await until(() => window.__xwave.ui.shown.has('classup'), 6000);
    check((await shown()).includes('classup'), 'first-time Class C celebration', await shown());
    await shot('15_class_c');
    await tap('classok');
    await until(() => !window.__xwave.ui.shown.has('classup'), 5000);
    const paid = await ev(() => ({ coins: window.__xwave.save.wallet - window.__w0, super: window.__xwave.save.items.super - window.__s0 }));
    check(paid.coins === 300 && paid.super === 1, 'Class C reward paid on Continue (+300 coins, +1 Roadster Jump)', paid);
  }
  // ------------------------------------------------------------------ training
  if (want('training')) {
    console.log('H. training');
    await ev(() => {
      const G = window.__xwave;
      G.goHome?.();
      G.ui.hideOverlay('classup');
      G.startTutorial?.() ?? G.ui.h.help?.();
    });
    await until(() => window.__xwave.ui.g.hits.some((x) => x.key === 'tutskip'), 15000);
    await shot('16_training');
    const sk = await ev(() => window.__xwave.ui.g.hits.some((x) => x.key === 'tutskip'));
    check(sk, 'training: Skip always on screen', sk);
    if (sk) await tap('tutskip');
  }
  R.errors = R.errors.filter((e) => !/ipapi|net::ERR|Failed to load resource|favicon/i.test(e));
  check(R.errors.length === 0, 'no page / console errors', R.errors.slice(0, 8));
} catch (e) {
  check(false, `QA crashed: ${e.message}`);
} finally {
  writeFileSync(join(out, 'native_qa.json'), JSON.stringify(R, null, 1));
  const fails = R.checks.filter((c) => !c.ok).length;
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  await browser.close();
  try {
    process.kill(-srv.pid, 'SIGTERM'); // the preview and its hs-web child
  } catch {
    srv.kill();
  }
  process.exit(fails ? 1 : 0);
}
