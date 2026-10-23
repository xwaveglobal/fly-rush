// Step 07: the car in the REAL game build, in the gameplay states that matter, at the phone resolution.
//
//   node scripts/car/gameplay-states.mjs <distDir> <outDir> [--w=360 --h=640 --dpr=2]
//
// Serves a built game (node scripts/build-esbuild.mjs → dist-esbuild), opens it with ?perf=1&noauto (perf
// overlay hidden), starts an Endless race and drives the game in fixed 1/60 s steps (Game.manual +
// advance): normal driving, lane change left / right, jump take-off, airborne, landing, Turbo, Shield,
// top speed. Each state: <outDir>/<state>.png (full screen, HUD included) + state.json (car screen box).
// Only the camera/road state is set up by the script — physics, camera rig and car code are the game's.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [dist, out] = process.argv.slice(2);
const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const W = +arg('w', 360), H = +arg('h', 640), DPR = +arg('dpr', 2);
mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const srv = createServer((req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const buf = readFileSync(join(dist, p));
    res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end();
  }
}).listen(0);
let chromium;
try {
  ({ chromium } = createRequire(join(here, '../../package.json'))('playwright'));
} catch {
  ({ chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright'));
}
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('crash', () => console.log('PAGE CRASH'));
page.on('close', () => console.log('PAGE CLOSED'));
browser.on('disconnected', () => console.log('BROWSER DISCONNECTED'));
await page.goto(`http://127.0.0.1:${srv.address().port}/?perf=1&noauto`);
await page.waitForFunction(() => window.__game?.state === 'menu', null, { timeout: 240000 });
await page.addStyleTag({ content: 'div[style*="9fffb0"]{display:none!important}' });
const clickWhen = async (fn) => {
  for (let i = 0; i < 240; i++) {
    if (await page.evaluate(fn)) return true;
    await page.waitForTimeout(500);
  }
  return false;
};
await clickWhen(() => { const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /^\s*Play\s*$/.test(e.textContent)); b?.click(); return !!b; });
await page.waitForTimeout(1500);
await page.evaluate(() => document.querySelector('button.trskip')?.click());
await clickWhen(() => { const el = [...document.querySelectorAll('*')].find((e) => e.offsetParent && e.children.length < 4 && /^\s*Endless/.test(e.textContent)); el?.click(); return !!el; });
await clickWhen(() => { const b = [...document.querySelectorAll('button')].filter((e) => e.offsetParent && /\bGO\b/.test(e.textContent)).at(-1); b?.click(); return !!b; });
await clickWhen(() => window.__game.state === 'run');
const meta = {};
const shot = async (name) => {
  await page.evaluate(() => window.__clear());
  await page.waitForTimeout(700); // the loop keeps rendering the held state
  await page.screenshot({ path: join(out, `${name}.png`), timeout: 180000 });
  meta[name] = await page.evaluate(() => {
    const g = window.__game;
    return { state: g.state, y: +g.world.player.y.toFixed(2), x: +g.world.player.x.toFixed(2), speed: +g.world.speed.toFixed(1), turbo: g.run.turboT > 0, shield: !!g.run.shield };
  });
  console.log('shot', name, JSON.stringify(meta[name]));
};
const step = (s) => page.evaluate((s) => { window.__clear(); window.__game.advance(s); }, s);
// keep the capture deterministic: obstacles within ~45 m are removed before each state (they would end
// the run mid-sequence); the road further ahead keeps its obstacles, so they stay in the frame
await page.evaluate(() => {
  const g = window.__game;
  g.manual = true;
  window.__clear = () => {
    const w = g.world;
    for (const o of w.obstacles) if (o.z > -45) w.hooks?.despawnObstacle?.(o);
    w.obstacles = w.obstacles.filter((o) => o.z <= -45);
  };
  g.advance(2.5);
});
await shot('01_normal');
await page.evaluate(() => window.__game.world.player.input('left'));
await step(0.12);
await shot('02_lane_left');
await step(0.6);
await page.evaluate(() => window.__game.world.player.input('right'));
await step(0.12);
await shot('03_lane_right');
await step(0.6);
await page.evaluate(() => window.__game.world.player.input('up'));
await step(0.1);
await shot('04_jump_takeoff');
await step(0.3);
await shot('05_airborne');
await page.evaluate(() => {
  const g = window.__game;
  window.__clear();
  for (let n = 0; g.world.player.y > 1.02 && n < 200; n++) g.advance(1 / 60);
  g.advance(0.05);
});
await shot('06_landing');
await page.evaluate(() => { window.__clear(); window.__game.run.turboT = 6; window.__game.advance(1); });
await shot('07_turbo');
await page.evaluate(() => { const g = window.__game; window.__clear(); const r = g.run; r.shield = true; r.shieldHits = 9; r.shieldT = 0; r.turboT = 0; g.advance(1.6); });
await shot('08_shield');
// top speed: still shielded while the speed builds up (no crash ends the sequence), shield off for the shot
await page.evaluate(() => { const g = window.__game; g.world.spawner.speed = () => 46; window.__clear(); g.advance(2); window.__clear(); g.run.shield = false; g.advance(0.5); });
await shot('09_top_speed');
meta.errors = errors;
writeFileSync(join(out, 'state.json'), JSON.stringify(meta, null, 1));
await browser.close();
srv.close();
