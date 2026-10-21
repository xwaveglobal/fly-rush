// XWAVE Flying Run — reference player server (no dependencies, Node 18+).
// Same API as RemotePlayerStore in src/net/PlayerStore.ts. Stores JSON in ./data.json.
// Run:  node server/index.mjs   then open the game with ?api=http://localhost:8787
// For production, replace the JSON file with the tables in schema.sql and add auth.
import http from 'node:http';
import fs from 'node:fs';

const FILE = new URL('./data.json', import.meta.url);
const PORT = Number(process.env.PORT ?? 8787);
let db = { players: {}, scores: {} };
try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* new database */ }
let dirty = false;
setInterval(() => { if (dirty) { fs.writeFileSync(FILE, JSON.stringify(db)); dirty = false; } }, 2000);

const rows = (board) => Object.values(db.scores).filter((s) => s.board === board && db.players[s.playerId]).sort((a, b) => b.score - a.score || a.at - b.at);
const send = (res, code, body) => {
  res.writeHead(code, { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type, authorization', 'access-control-allow-methods': 'GET, PUT, POST, OPTIONS' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const read = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { ok({}); } }); });

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  try {
    if (parts[0] === 'players' && parts[1]) {
      if (req.method === 'GET') return send(res, 200, db.players[parts[1]] ?? null);
      if (req.method === 'PUT') {
        const p = await read(req);
        // X-Points and class are server-owned in production: recompute from verified runs, never trust the client
        db.players[parts[1]] = { ...(db.players[parts[1]] ?? {}), ...p, id: parts[1] };
        dirty = true;
        return send(res, 200, {});
      }
    }
    if (parts[0] === 'scores' && req.method === 'POST') {
      const s = await read(req);
      if (typeof s.board !== 'string' || typeof s.playerId !== 'string' || !Number.isFinite(s.score)) return send(res, 400, { error: 'bad score' });
      const k = `${s.board}|${s.playerId}`;
      if (!db.scores[k] || s.score > db.scores[k].score) { db.scores[k] = { board: s.board, playerId: s.playerId, score: Math.floor(s.score), at: Date.now() }; dirty = true; }
      return send(res, 200, {});
    }
    if (parts[0] === 'boards' && parts[1]) {
      const r = rows(parts[1]);
      if (parts[2] === 'rank' && parts[3]) {
        const i = r.findIndex((x) => x.playerId === parts[3]);
        return send(res, 200, i < 0 ? null : { rank: i + 1, total: r.length });
      }
      const limit = Math.min(200, Number(url.searchParams.get('limit') ?? 100));
      return send(res, 200, r.slice(0, limit).map((s, i) => ({ ...s, rank: i + 1, player: db.players[s.playerId] })));
    }
    send(res, 404, { error: 'not found' });
  } catch (e) {
    send(res, 500, { error: String(e) });
  }
}).listen(PORT, () => console.log(`XWAVE player server on http://localhost:${PORT}`));
