'use strict';
/* =====================================================================================================================
   SERVER-AUTHORITATIVE ECONOMY  (pure logic: no firebase imports, so it runs in Cloud Functions AND in the tests)

   The browser never writes a balance. It sends an ACTION ("I finished this match", "buy this item", "open a box") and this
   file decides what that is worth, using the price / reward tables in catalog.json (generated from the game's own data files).
   The result is written to   econ/<uid>   which the database rules make read-only for clients.

   db = small adapter { get(path), tx(path, fn), update(map), push(path, value) }   (index.js wraps the Admin SDK; tests use memory)
   ===================================================================================================================== */
const CAT = require('../catalog.json');
const RKC = require('./rankcore.js');

const ITEM = Object.fromEntries(CAT.items.map(x => [x.id, x]));
const DAY = 864e5, VER = 1;
const START = CAT.items.filter(x => x.src === 'start').map(x => x.v);
const COS_OF = new Map(CAT.items.filter(x => x.k === 'skin').map(x => [x.v, x.cos]));

/* every tunable limit in one place */
const LIMITS = {
  matchMinMs: 12000,          /* a rewarded match lasts at least this long (measured by the SERVER between mstart and match) */
  roundMinMs: 4000,           /* ...plus this much per round reported */
  noStartGapMs: 60000,        /* claims without a recorded start (offline start) need this gap since the previous claim */
  perDay: { xp: 90000, coins: 15000, candy: 80000, pass: 15000, matches: 400 },
  candyPerRound: 260,         /* pickups (5 / 25 each) a player can plausibly collect in one round */
  afkGapMs: 55000, afkPerDay: 1200,
  txKeep: 60, midKeep: 40,
  /* balances above these never happen through normal play (and owner gifts are capped at 1,000,000 per command) -> flag for review, never wipe */
  suspicious: { coins: 2500000, candy: 2500000, xp: 4000000, keys: 400, tot: 3000000 }
};

class EconError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const bad = (code, msg) => { throw new EconError(code, msg); };
const int = (v, lo, hi) => { v = Math.floor(Number(v)); if (!Number.isFinite(v)) v = lo; return Math.max(lo, Math.min(hi, v)); };
const arr = v => Array.isArray(v) ? v : (v && typeof v === 'object' ? Object.values(v) : []);
const utcDay = t => new Date(t).toISOString().slice(0, 10);
const uniq = a => [...new Set(a)];

function blank() {
  return { v: VER, coins: 0, xp: 0, owned: START.slice(), skin: START[0], gs: [0, 0, 0], dly: 0,
    ev: { candy: 0, tot: 0, tier: 0, keys: 0, tday: '', streak: 0, seen: 0, d: { day: '', s: {}, c: [] }, dqDone: 0, pq: [], ach: [], st: { gold: 0, win: 0, play: 0, box: 0 }, rk: 0, dl: { k: '', c: 0 } },
    bp: { xp: 0, cf: [] }, rkc: {}, lim: {}, tx: {}, mids: [], ms: {} };
}
/* make any stored / migrated object safe: right types, no negatives, no NaN. Never trusts its input. */
function norm(s) {
  const b = blank(); s = (s && typeof s === 'object') ? s : {};
  const o = b;
  o.coins = int(s.coins, 0, 1e9); o.xp = int(s.xp, 0, 1e9); o.dly = int(s.dly, 0, 4e12);
  o.owned = uniq(arr(s.owned).map(Number).filter(Number.isSafeInteger).concat(START));
  o.skin = Number.isSafeInteger(Number(s.skin)) && Number(s.skin) >= 0 ? Number(s.skin) : START[0];
  const gs = arr(s.gs); o.gs = [0, 1, 2].map(i => int(gs[i], 0, 31));
  const e = (s.ev && typeof s.ev === 'object') ? s.ev : {};
  o.ev.candy = int(e.candy, 0, 1e9); o.ev.tot = int(e.tot, 0, 1e9); o.ev.tier = int(e.tier, 0, 30); o.ev.keys = int(e.keys, 0, 1e6);
  o.ev.tday = typeof e.tday === 'string' ? e.tday.slice(0, 10) : ''; o.ev.streak = int(e.streak, 0, 1e5); o.ev.seen = e.seen ? 1 : 0;
  o.ev.dqDone = int(e.dqDone, 0, 1e5); o.ev.rk = e.rk ? 1 : 0;
  o.ev.pq = uniq(arr(e.pq).map(Number).filter(Number.isFinite)); o.ev.ach = uniq(arr(e.ach).map(String)).slice(0, 100);
  const d = (e.d && typeof e.d === 'object') ? e.d : {};
  o.ev.d = { day: typeof d.day === 'string' ? d.day.slice(0, 10) : '', s: { win: int(d.s && d.s.win, 0, 1e5) }, c: uniq(arr(d.c).map(String)).slice(0, 20) };
  const st = (e.st && typeof e.st === 'object') ? e.st : {};
  o.ev.st = { gold: int(st.gold, 0, 1e9), win: int(st.win, 0, 1e9), play: int(st.play, 0, 1e9), box: int(st.box, 0, 1e9) };
  const dl = (e.dl && typeof e.dl === 'object') ? e.dl : {};
  o.ev.dl = { k: typeof dl.k === 'string' ? dl.k.slice(0, 10) : '', c: int(dl.c, 0, 1e9) };
  const p = (s.bp && typeof s.bp === 'object') ? s.bp : {};
  o.bp = { xp: int(p.xp, 0, 30 * CAT.passes.bp.per), cf: uniq(arr(p.cf).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 30)) };
  o.rkc = (s.rkc && typeof s.rkc === 'object') ? s.rkc : {};
  o.lim = (s.lim && typeof s.lim === 'object') ? s.lim : {};
  o.tx = (s.tx && typeof s.tx === 'object') ? s.tx : {};
  o.mids = arr(s.mids).map(String).slice(-LIMITS.midKeep);
  o.ms = (s.ms && typeof s.ms === 'object') ? s.ms : {};
  if (s.mig) o.mig = s.mig;
  if (s.hold) o.hold = 1;
  return o;
}

/* ---- the legacy save (saves/<uid>.d = JSON written by the OLD client, i.e. never trustworthy) -> server state. Nothing is wiped:
        impossible totals are imported as they are, flagged and put on hold so an owner can look at them. ---- */
function migrate(save, now) {
  let o = null;
  try { if (save && typeof save.d === 'string') o = JSON.parse(save.d); } catch (_) { /* unreadable save = fresh start */ }
  const s = norm(o || {});
  if (o) {
    const toKey = v => { const t = Date.parse(v); return Number.isFinite(t) ? utcDay(t + 12 * 36e5) : ''; }; /* old client stored local "Mon Nov 02 2026" */
    s.ev.tday = toKey(o.ev && o.ev.tday); s.ev.d.day = toKey(o.ev && o.ev.d && o.ev.d.day);
    /* the old client gave owners a fake "infinite" pile; it must not become a real balance */
    if (s.coins >= 4e8) s.coins = 0; if (s.ev.candy >= 4e8) s.ev.candy = 0; if (s.ev.keys >= 999) s.ev.keys = 0;
  }
  s.mig = { t: now, from: o ? 'save' : 'new' };
  return s;
}

function suspicion(s) {
  const L = LIMITS.suspicious, w = [];
  if (s.coins > L.coins) w.push('coins ' + s.coins); if (s.ev.candy > L.candy) w.push('candy ' + s.ev.candy);
  if (s.xp > L.xp) w.push('xp ' + s.xp); if (s.ev.keys > L.keys) w.push('keys ' + s.ev.keys); if (s.ev.tot > L.tot) w.push('candy collected ' + s.ev.tot);
  return w;
}

/* ---- event clock (server time). force: 'on' | 'off' | null comes from meta/event (owner command /event) ---- */
const evOn = (now, force) => force === 'on' || (force !== 'off' && now >= CAT.evt.start && now < CAT.evt.end);
const evOpen = (now, force) => evOn(now, force) || (force !== 'off' && now >= CAT.evt.start && now < CAT.evt.end + CAT.evt.grace);
const tierCost = t => t >= 30 ? CAT.passes.hw.finalCost : CAT.passes.hw.tierCost;
const bpTier = s => Math.min(30, Math.floor(s.bp.xp / CAT.passes.bp.per));

/* ---- rewards ---- */
function give(s, rw, ctx, out) {
  out = out || [];
  if (Array.isArray(rw)) { rw.forEach(r => give(s, r, ctx, out)); return out; }
  if (rw.k === 'coins') { s.coins += rw.n; out.push({ k: 'coins', n: rw.n }); }
  else if (rw.k === 'key') { s.ev.keys += rw.n; out.push({ k: 'key', n: rw.n }); }
  else if (rw.k === 'candy') { s.ev.candy += rw.n; out.push({ k: 'candy', n: rw.n }); }
  else if (rw.k === 'item') {
    const it = ITEM[rw.id]; if (!it) bad('internal', 'Unknown reward item ' + rw.id);
    if (s.owned.includes(it.v) || ctx.owner) { if (!ctx.owner) s.coins += 60; out.push({ k: 'item', id: it.id, dup: 60 }); }
    else { s.owned.push(it.v); out.push({ k: 'item', id: it.id }); }
  }
  return out;
}
const spend = (s, ctx, what, n) => {
  if (ctx.owner) return;                       /* owners play with unlimited currency (and are never on a leaderboard) */
  if (s.hold) bad('held', 'This account\'s balance is under review by the game owners. Spending is paused until they finish.');
  const cur = what === 'coins' ? s.coins : what === 'candy' ? s.ev.candy : s.ev.keys;
  if (cur < n) bad('funds', 'Not enough ' + (what === 'keys' ? 'keys' : what));
  if (what === 'coins') s.coins -= n; else if (what === 'candy') s.ev.candy -= n; else s.ev.keys -= n;
};
const rollDay = (s, now) => { const k = utcDay(now); if (s.ev.d.day !== k) s.ev.d = { day: k, s: { win: 0 }, c: [] }; };
const addRanked = (s, n, now) => { const k = utcDay(now); if (s.ev.dl.k !== k) s.ev.dl = { k, c: 0 }; s.ev.dl.c += n; s.ev.tot += n; };
const dayLim = (s, now) => { const k = utcDay(now); if (!s.lim || s.lim.day !== k) s.lim = Object.assign({}, s.lim, { day: k, xp: 0, coins: 0, candy: 0, pass: 0, matches: 0, afk: 0 }); return s.lim; };
const room = (lim, key, cap, want) => { const left = Math.max(0, cap - (lim[key] || 0)), n = Math.min(left, Math.max(0, want)); lim[key] = (lim[key] || 0) + n; return n; };
const hwOwned = s => CAT.items.filter(x => x.src === 'hw' && s.owned.includes(x.v)).length;
const goalVal = (s, stat) => stat === 'tot' ? s.ev.tot : stat === 'dq' ? s.ev.dqDone : stat === 'tier' ? s.ev.tier : stat === 'own' ? hwOwned(s) : (s.ev.st[stat] || 0);

/* what a finished match is worth. Mirrors the numbers the game has always shown; every input is clamped to what the mode allows. */
function matchWorth(m) {
  const M = CAT.modes[m.mode] || CAT.modes['1v1'];
  const first = m.ranked && m.mode === '1v1' ? 5 : m.ranked ? 4 : M.win;
  const maxRounds = M.room ? (M.rounds || 100) : Math.max(1, first * 2 - 1);
  const rw = int(m.rw, 0, maxRounds), rl = int(m.rl, 0, maxRounds - rw), rounds = M.room ? int(m.rounds, 0, maxRounds) : rw + rl;
  const players = M.room ? (M.max || 10) : M.ffa ? (M.max || 10) : M.size * 2;
  const kills = int(m.kills, 0, Math.max(1, rounds) * (players - 1)), dmg = int(m.dmg, 0, kills * 250 + Math.max(1, rounds) * 400);
  const me = M.room ? 0 : Math.min(rw, first), win = !!m.win && !m.draw && !m.left, draw = !!m.draw && !m.left;
  let x = 0, c = 0;
  if (M.br) { /* Battle Royale = one long match: paid for placing + eliminations (nothing for leaving before you are out) */
    if (!m.left || m.place > 0) { const k = Math.min(kills, players - 1); x = 140 + k * 45 + (win ? 450 : 0); c = 14 + k * 6 + (win ? 90 : 0); }
  }
  else if (m.left) { if (M.room && !m.bot) { const r = roomReward(rounds, kills, dmg); x = r.x; c = r.c; } }
  else if (M.room) { const r = roomReward(rounds, kills, dmg); x = r.x + (win ? 250 : 0); c = r.c + (win ? 50 : 0); }
  else if (draw) { x = 75 + me * 15; c = 12; }
  else if (M.ffa) { const pl = int(m.players, 2, players) - int(m.place, 1, players); if (win) { x = 260; c = 50; } else { x = 60 + Math.max(0, pl) * 30; c = 8 + Math.max(0, pl) * 4; } }
  else if (win) { x = 150 + me * 20; c = 25; } else { x = 50 + me * 15; c = 8; }
  if (m.ranked && !m.bot) { x = Math.round(x * 1.5); c = Math.round(c * 1.5); }
  return { x, c, rw, rl, rounds: Math.max(rounds, rw + rl), kills, dmg, win, draw, first, room: !!M.room };
}
function roomReward(rounds, k, d) { if (!rounds && !k) return { x: 0, c: 0 }; return { x: Math.min(3000, Math.round(rounds * 14 + k * 12 + d * .05)), c: Math.min(600, Math.round(rounds * 1.5 + k * 2)) }; }

/* ============================ ACTIONS ============================
   every handler: (s, data, ctx) -> result object.   s is mutated; throwing aborts the whole transaction (nothing is saved). */
const ACT = {
  sync() { return {}; },
  equip(s, d, ctx) {
    if (d.gun != null) { const w = int(d.gun, 0, 2), n = int(d.n, 0, 31); if (n) { const it = CAT.items.find(x => x.k === 'gun' && x.w === w && x.gn === n); if (!it || !(ctx.owner || s.owned.includes(it.v))) bad('owned', 'You do not own that gun skin'); } s.gs[w] = n; return {}; }
    const v = Number(d.skin); if (!Number.isSafeInteger(v) || v < 0) bad('arg', 'Bad skin');
    /* a skin number = colour (24 bits) + accessory id (8 bits) + style bits (finish / pattern, from 2^47). Catalogue skins must be owned.
       CUSTOM skins (any colour, any finish) are free, but the accessory must come from a skin you own. */
    const base = v % 4294967296, cos = Math.floor(base / 16777216) % 256, style = Math.floor(v / 140737488355328);
    if (v % 140737488355328 >= 4294967296) bad('arg', 'Bad skin');
    const exact = CAT.items.find(x => x.v === base && x.k !== 'gun');
    if (!ctx.owner) {
      if (exact && !style && !d.custom) { if (!s.owned.includes(base)) bad('owned', 'You do not own that skin'); }
      else { if (style > 63) bad('arg', 'Bad skin style'); if (cos && !s.owned.some(o => COS_OF.get(o) === cos)) bad('owned', 'Unlock a skin with that accessory first'); if (cos && !CAT.cosIds.includes(cos)) bad('arg', 'Unknown accessory'); }
    }
    s.skin = v; return {};
  },
  daily(s, d, ctx) { if (ctx.now - s.dly < DAY) bad('early', 'Come back later for your next daily reward'); s.dly = ctx.now; s.coins += 50; return { coins: 50 }; },
  buy(s, d, ctx) {
    const it = ITEM[String(d.item)]; if (!it || !it.price) bad('arg', 'That item is not for sale');
    if (s.owned.includes(it.v)) bad('owned', 'You already own this'); spend(s, ctx, 'coins', it.price); s.owned.push(it.v); return { item: it.id };
  },
  bpClaim(s, d, ctx) {
    const want = d.all ? [...Array(30).keys()] : [int(d.i, 0, 29)], t = bpTier(s), got = [];
    want.forEach(i => { if (t >= i + 1 && !s.bp.cf.includes(i)) { s.bp.cf.push(i); give(s, CAT.passes.bp.free[i], ctx, got); } });
    if (!got.length) bad('none', d.all ? 'Nothing to claim yet' : 'Reach tier ' + (want[0] + 1) + ' first'); return { got, n: got.length };
  },
  hwBuy(s, d, ctx) {
    if (!evOpen(ctx.now, ctx.evForce)) bad('closed', 'The event has ended');
    const n = int(d.n, 1, 30); if (s.ev.tier + n > 30) bad('arg', 'The pass only has 30 tiers');
    let cost = 0; for (let i = 1; i <= n; i++) cost += tierCost(s.ev.tier + i);
    spend(s, ctx, 'candy', cost); const got = []; for (let i = 1; i <= n; i++) give(s, CAT.passes.hw.free[s.ev.tier + i - 1], ctx, got); s.ev.tier += n; return { got, tier: s.ev.tier, cost };
  },
  box(s, d, ctx) {
    if (!evOpen(ctx.now, ctx.evForce)) bad('closed', 'The event has ended');
    const B = CAT.box; if (d.key) spend(s, ctx, 'keys', 1); else spend(s, ctx, 'candy', B.cost);
    let r = ctx.rnd() * 100, t = B.tiers[0]; for (const x of B.tiers) { if (r < x[2]) { t = x; break; } r -= x[2]; }
    const it = ITEM[t[5][Math.floor(ctx.rnd() * t[5].length)]]; let dup = 0;
    if (s.owned.includes(it.v)) { dup = t[4]; s.ev.candy += dup; } else s.owned.push(it.v);   /* duplicate -> candy refund, decided HERE */
    s.ev.st.box++; return { item: it.id, tier: t[1], dup };
  },
  treat(s, d, ctx) {
    if (!evOpen(ctx.now, ctx.evForce)) bad('closed', 'The event has ended');
    const today = utcDay(ctx.now), yest = utcDay(ctx.now - DAY); if (s.ev.tday === today) bad('early', 'You already opened today\'s treat box');
    s.ev.streak = (s.ev.tday === yest ? s.ev.streak : 0) + 1; s.ev.tday = today;
    const mu = 1 + Math.min(s.ev.streak - 1, 6) * .1, r = ctx.rnd(); let kind, ca = 0, co = 0, k = 0;
    if (r < .03) { ca = 1500; kind = 'jackpot'; } else if (r < .12) { k = 1; kind = 'key'; } else if (r < .3) { ca = 250 + Math.floor(ctx.rnd() * 251); kind = 'bag'; }
    else if (r < .45) { co = 30 + Math.floor(ctx.rnd() * 51); kind = 'coins'; } else { ca = 80 + Math.floor(ctx.rnd() * 121); kind = 'candy'; }
    ca = Math.round(ca * mu); co = Math.round(co * mu); s.ev.candy += ca; s.ev.keys += k; s.coins += co; return { kind, candy: ca, coins: co, keys: k, mu, streak: s.ev.streak };
  },
  quest(s, d, ctx) {
    if (!evOpen(ctx.now, ctx.evForce)) bad('closed', 'The event has ended'); rollDay(s, ctx.now);
    const [id, i] = String(d.q).split(':'), q = CAT.dq.find(x => x.id === id), k = int(i, 0, 2); if (!q) bad('arg', 'Unknown quest');
    const key = q.id + ':' + k; if (s.ev.d.c.includes(key)) bad('done', 'Already claimed'); if ((s.ev.d.s[q.stat] || 0) < q.st[k]) bad('locked', 'Quest stage not finished yet');
    s.ev.d.c.push(key); s.ev.candy += q.r[k]; let day = false; if ([0, 1, 2].every(n => s.ev.d.c.includes(q.id + ':' + n))) { s.ev.dqDone++; day = true; } return { candy: q.r[k], dayDone: day, dqDone: s.ev.dqDone };
  },
  pquest(s, d, ctx) {
    if (!evOpen(ctx.now, ctx.evForce)) bad('closed', 'The event has ended');
    const p = CAT.pq.find(x => x.n === Number(d.n)); if (!p) bad('arg', 'Unknown quest'); if (s.ev.pq.includes(p.n)) bad('done', 'Already claimed'); if (s.ev.dqDone < p.n) bad('locked', 'Not finished yet');
    s.ev.pq.push(p.n); return { got: give(s, { k: 'item', id: p.id }, ctx) };
  },
  goal(s, d, ctx) {
    if (!evOpen(ctx.now, ctx.evForce)) bad('closed', 'The event has ended');
    const a = CAT.ach.find(x => x.id === String(d.g)); if (!a) bad('arg', 'Unknown goal'); if (s.ev.ach.includes(a.id)) bad('done', 'Already claimed'); if (goalVal(s, a.stat) < a.goal) bad('locked', 'Goal not reached yet');
    s.ev.ach.push(a.id); return { got: give(s, a.r, ctx), name: a.n };
  },
  exchange(s, d, ctx) {
    if (!evOpen(ctx.now, ctx.evForce)) bad('closed', 'The event has ended');
    const n = d.n === 'all' ? Math.floor(s.ev.candy / 100) : int(d.n, 1, 1e6); if (n < 1) bad('funds', 'Not enough candy'); spend(s, ctx, 'candy', n * 100); s.coins += n * 100; return { coins: n * 100 };
  },
  seen(s) { s.ev.seen = 1; return {}; },
  /* the game tells the server a match began; the reward later needs real time to have passed since this moment */
  mstart(s, d, ctx) { const mid = String(d.mid || '').slice(0, 120); if (!mid) bad('arg', 'Missing match'); const ms = {}; Object.entries(s.ms).sort((a, b) => b[1] - a[1]).slice(0, 2).forEach(([k, v]) => { ms[k] = v; }); ms[key(mid)] = ctx.now; s.ms = ms; return {}; },
  match(s, d, ctx) {
    const mid = String(d.mid || '').slice(0, 120); if (!mid) bad('arg', 'Missing match'); if (s.mids.includes(mid)) return { dup: true };
    const w = matchWorth(d), lim = dayLim(s, ctx.now), t0 = s.ms[key(mid)];
    if (lim.matches >= LIMITS.perDay.matches) bad('rate', 'Daily match reward limit reached');
    const need = LIMITS.matchMinMs + w.rounds * LIMITS.roundMinMs;
    if (!d.left) { if (t0) { if (ctx.now - t0 < Math.min(need, 90000)) bad('rate', 'That match ended too quickly to count'); } else if (ctx.now - (lim.t || 0) < LIMITS.noStartGapMs) bad('rate', 'Match rewards are coming in too fast'); }
    s.mids.push(mid); s.mids = s.mids.slice(-LIMITS.midKeep); delete s.ms[key(mid)]; lim.t = ctx.now; lim.matches++;
    const out = { x: 0, c: 0, pass: 0, candy: 0, tier: bpTier(s) };
    out.x = room(lim, 'xp', LIMITS.perDay.xp, w.x); out.c = room(lim, 'coins', LIMITS.perDay.coins, w.c); s.xp += out.x; s.coins += out.c;
    out.pass = room(lim, 'pass', LIMITS.perDay.pass, w.rw * CAT.passxp.win + w.rl * CAT.passxp.loss); s.bp.xp = Math.min(30 * CAT.passes.bp.per, s.bp.xp + out.pass); out.tierUp = bpTier(s) > out.tier; out.tier = bpTier(s);
    if (evOn(ctx.now, ctx.evForce)) {
      const gold = int(d.gold, 0, Math.max(1, w.rounds) * 4), picked = Math.min(int(d.candy, 0, 1e7), Math.max(1, w.rounds) * LIMITS.candyPerRound);
      const bonus = d.left ? 0 : CAT.candy.matchBonus + (w.win ? CAT.candy.winBonus : 0), cd = room(lim, 'candy', LIMITS.perDay.candy, picked + bonus);
      s.ev.candy += cd; addRanked(s, cd, ctx.now); s.ev.st.gold += gold; out.candy = cd;
      if (!d.left) { s.ev.st.play++; if (w.win) { rollDay(s, ctx.now); s.ev.d.s.win = (s.ev.d.s.win || 0) + 1; s.ev.st.win++; } }
    }
    out.stats = { kills: w.kills, dmg: w.dmg, win: w.win, draw: w.draw, left: !!d.left, bot: !!d.bot, room: w.room, late: !!d.late };
    return out;
  },
  afk(s, d, ctx) {
    const lim = dayLim(s, ctx.now); if (ctx.now - (lim.afkT || 0) < LIMITS.afkGapMs) bad('rate', 'AFK drop not ready yet'); if (lim.afk >= LIMITS.afkPerDay) bad('rate', 'Daily AFK limit reached');
    lim.afkT = ctx.now; lim.afk++; const co = CAT.afk.coins; let ca = 0; s.coins += co;
    if (evOn(ctx.now, ctx.evForce)) { ca = CAT.afk.candy; s.ev.candy += ca; if (CAT.afk.candyRank) addRanked(s, ca, ctx.now); }
    return { coins: co, candy: ca };
  },
  /* event leaderboard prize: the SERVER looks the rank up (ctx.lbRank is filled in by handle()) */
  rankClaim(s, d, ctx) {
    if (ctx.now < CAT.evt.end && ctx.evForce !== 'off') bad('early', 'Rewards unlock when the event ends'); if (!evOpen(ctx.now, ctx.evForce) && ctx.now >= CAT.evt.end + CAT.evt.grace) bad('closed', 'The event shop has closed');
    if (s.ev.rk) bad('done', 'Already claimed'); s.ev.rk = 1; const rank = ctx.lbRank | 0; if (!rank) return { rank: 0 };
    const t = CAT.rankrew.find(x => rank <= x.max); return t ? { rank, tier: t.t, got: give(s, t.r, ctx) } : { rank };
  },
  /* ranked season prize: ctx.rk = {rec, pos} read by the server from ranked/s<n>/lb */
  rkClaim(s, d, ctx) {
    const n = int(d.s, 1, 9999); if (n >= RKC.seasonAt(ctx.now)) bad('early', 'That season is still running'); if (s.rkc[n]) bad('done', 'Already claimed');
    const rw = ctx.rk && ctx.rk.rec ? RKC.rewardsFor(ctx.rk.rec, ctx.rk.pos | 0) : null; s.rkc[n] = 1; if (!rw) return { none: true };
    return { coins: rw.coins, top: rw.top || 0, arch: !!rw.arch, got: give(s, [{ k: 'coins', n: rw.coins }].concat(rw.items.map(id => ({ k: 'item', id }))), ctx) };
  }
};
const key = mid => mid.replace(/[.#$\[\]\/]/g, '_');
const READONLY = new Set(['sync']), NO_ID = new Set(['sync', 'equip', 'seen', 'mstart']);

/* what the client is shown (bookkeeping fields stay on the server side of the object but are harmless to read) */
const pub = s => s;

/* ---- one request. ctx = {uid, anon, owner, now, rnd, evForce, banned} ---- */
async function handle(db, ctx, data) {
  data = (data && typeof data === 'object') ? data : {};
  const a = String(data.a || ''), fn = ACT[a];
  if (!fn) bad('arg', 'Unknown action');
  if (!ctx.uid || ctx.anon) bad('guest', 'Sign in to earn and keep rewards');
  if (ctx.banned) bad('banned', 'This account is banned');
  const id = NO_ID.has(a) ? null : String(data.id || '').replace(/[^\w-]/g, '').slice(0, 40);
  if (!NO_ID.has(a) && (!id || id.length < 8)) bad('arg', 'Missing request id');
  /* lookups the action needs, done BEFORE the transaction (transactions must be pure) */
  if (a === 'rankClaim') { const lb = await db.top(CAT.evt.lb + '/lb', 'c', 50); ctx.lbRank = lb.findIndex(x => x.key === ctx.uid) + 1; }
  if (a === 'rkClaim') { const n = int(data.s, 1, 9999), rec = await db.get('ranked/s' + n + '/lb/' + ctx.uid), top = (await db.top('ranked/s' + n + '/lb', 'e', RKC.TOPN)).filter(x => x.val && x.val.e > 0); const i = top.findIndex(x => x.key === ctx.uid); ctx.rk = { rec, pos: i >= 0 ? i + 1 : 0 }; }
  /* first visit: bring the old cloud save over (once). Read before the transaction because transactions must be pure. */
  const legacy = (await db.get('econ/' + ctx.uid)) == null ? ((await db.get('saves/' + ctx.uid)) || null) : null;
  let res = null, err = null, before = null, after = null, dup = false, created = false;
  await db.tx('econ/' + ctx.uid, cur => {
    res = null; err = null; dup = false; created = false;
    let s;
    if (cur == null) { s = migrate(legacy, ctx.now); created = true; if (suspicion(s).length && !ctx.owner) s.hold = 1; } else s = norm(cur);
    before = snap(s); after = before;
    if (id && s.tx[id]) { dup = true; return created ? s : undefined; }
    try { res = fn(s, data, ctx) || {}; } catch (e) { if (!(e instanceof EconError)) throw e; err = e; return created ? s : undefined; }
    if (id) { s.tx[id] = ctx.now; const ks = Object.keys(s.tx); if (ks.length > LIMITS.txKeep) ks.sort((x, y) => s.tx[x] - s.tx[y]).slice(0, ks.length - LIMITS.txKeep).forEach(k => delete s.tx[k]); }
    const w = suspicion(s); if (w.length && !ctx.owner && !s.hold) { s.hold = 1; res._flag = w; }
    after = snap(s); return s;
  });
  const state = await db.get('econ/' + ctx.uid);
  if (err) { err.state = state; throw err; }
  if (dup) return { ok: true, dup: true, state };
  /* side effects of a committed action (all server-written; clients cannot write any of these paths) */
  const up = {};
  const delta = diff(before, after);
  if (created) { const w = suspicion(norm(state)); up['audit/econ/' + ctx.uid + '/' + db.id()] = { t: ctx.now, a: 'migrate', bal: after }; if (w.length) up['flags/' + ctx.uid] = { t: ctx.now, why: 'imported save: ' + w.join(', '), bal: after, open: true }; }
  if (res && res._flag) { up['flags/' + ctx.uid] = { t: ctx.now, why: res._flag.join(', '), bal: after, open: true, a }; delete res._flag; }
  if (!READONLY.has(a) && a !== 'afk' && a !== 'mstart' && a !== 'seen' && a !== 'equip') up['audit/econ/' + ctx.uid + '/' + db.id()] = { t: ctx.now, a, id, d: delta, bal: after, ...(a === 'match' ? { mid: String(data.mid).slice(0, 120), md: String(data.mode || '').slice(0, 12) } : {}) };
  if (a === 'match' && res && res.stats && !res.dup) await matchSide(db, ctx, res, norm(state), up);
  if (Object.keys(up).length) await db.update(up);
  return { ok: true, res, state };
}
/* win / loss record, kill + damage leaderboard, event candy leaderboard: all written here, never by the browser */
async function matchSide(db, ctx, res, s, up) {
  const st = res.stats, name = String(ctx.name || 'Player').slice(0, 14);
  if (!st.draw && !st.bot && !st.late && !(st.room && !st.win) && !(st.left && st.room)) {
    const f = st.win ? 'wins' : 'losses'; await db.tx('users/' + ctx.uid, c => { c = c || {}; c.name = name; c[f] = (c[f] || 0) + 1; return c; });
  }
  const hd = ctx.owner ? {} : ((await db.get('lbhide/' + ctx.uid)) || {});    /* owners took this player off some boards (/lbremove): never write those back */
  if (!ctx.owner && (st.kills || st.dmg) && !(hd.k && hd.dm)) await db.tx('arenaStats/lb/' + ctx.uid, c => { c = c || {}; const o = { n: name, s: s.skin % 4294967296 }; if (!hd.k) o.k = Math.min(5e6, (c.k || 0) + st.kills); if (!hd.dm) o.dm = Math.min(5e8, (c.dm || 0) + st.dmg); return o; });
  if (!ctx.owner && !hd.c && s.ev.tot > 0 && evOn(ctx.now, ctx.evForce)) up[CAT.evt.lb + '/lb/' + ctx.uid] = { n: name, c: s.ev.tot, s: s.skin % 4294967296, d: s.ev.dl.k === utcDay(ctx.now) ? s.ev.dl.c : 0, dk: utcDay(ctx.now) };
  delete res.stats;
}
const snap = s => ({ coins: s.coins, xp: s.xp, candy: s.ev.candy, keys: s.ev.keys, tot: s.ev.tot, tier: s.ev.tier, items: s.owned.length });
const diff = (a, b) => { const o = {}; Object.keys(b).forEach(k => { if (b[k] !== a[k]) o[k] = b[k] - a[k]; }); return o; };

module.exports = { handle, norm, blank, migrate, suspicion, matchWorth, give, snap, diff, evOn, evOpen, EconError, LIMITS, CAT, ITEM, ACT, bpTier, utcDay, int, arr };
