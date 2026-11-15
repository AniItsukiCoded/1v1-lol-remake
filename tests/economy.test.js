'use strict';
const test = require('node:test'), assert = require('node:assert');
const E = require('../functions/lib/economy.js'), memdb = require('./memdb.js');
const T0 = E.CAT.evt.start + 5 * 864e5;                                  /* a moment inside the event */
let seq = 0; const id = () => 'req' + String(++seq).padStart(8, '0');
const ctx = (o) => Object.assign({ uid: 'u1', anon: false, owner: false, now: T0, rnd: () => 0.5, evForce: null, name: 'Tester' }, o);
const act = (db, c, a, d) => E.handle(db, c, Object.assign({ a, id: id() }, d));
const rejects = (p, code) => assert.rejects(p, e => { assert.strictEqual(e.code, code, e.message); return true; });
const play = async (db, c, o) => { const mid = 'm' + (++seq); await act(db, c, 'mstart', { mid }); c.now += 120000; return act(db, c, 'match', Object.assign({ mid, mode: '1v1', win: 1, rw: 3, rl: 1, kills: 3, dmg: 400 }, o)); };

test('new account starts with starter colours and zero currency', async () => {
  const db = memdb(), r = await act(db, ctx(), 'sync');
  assert.strictEqual(r.state.coins, 0); assert.strictEqual(r.state.ev.candy, 0); assert.ok(r.state.owned.length >= 1);
});
test('guests and banned accounts get nothing', async () => {
  const db = memdb(); await rejects(act(db, ctx({ anon: true }), 'daily'), 'guest'); await rejects(act(db, ctx({ banned: true }), 'daily'), 'banned');
});
test('THE EXPLOIT: a doctored old save is imported but flagged and put on hold, never trusted silently', async () => {
  const db = memdb({ saves: { u1: { d: JSON.stringify({ coins: 10, xp: 0, owned: [], ev: { candy: 5000000, tot: 5000000 } }) } } });
  const r = await act(db, ctx(), 'sync');
  assert.strictEqual(r.state.ev.candy, 5000000, 'not wiped automatically'); assert.strictEqual(r.state.hold, 1);
  assert.ok(db.root.flags.u1.open); assert.match(db.root.flags.u1.why, /candy/);
  await rejects(act(db, ctx(), 'exchange', { n: 'all' }), 'held');                   /* cannot launder it into coins / tiers / boxes */
  await rejects(act(db, ctx(), 'hwBuy', { n: 1 }), 'held');
});
test('a normal old save migrates untouched', async () => {
  const db = memdb({ saves: { u1: { d: JSON.stringify({ coins: 1234, xp: 900, owned: [E.CAT.items.find(x => x.price).v], ev: { candy: 300, tot: 800, tier: 4 }, bp: { xp: 2500, cf: [0, 1] } }) } } });
  const s = (await act(db, ctx(), 'sync')).state;
  assert.strictEqual(s.coins, 1234); assert.strictEqual(s.ev.tier, 4); assert.deepStrictEqual(s.bp.cf, [0, 1]); assert.ok(!s.hold); assert.ok(!db.root.flags);
});
test('garbage in a save cannot crash or go negative', () => {
  const s = E.norm({ coins: -50, xp: 'abc', owned: 'nope', ev: { candy: NaN, keys: -3, d: 7, pq: { a: 'x' } }, bp: null, gs: [99, -1] });
  assert.strictEqual(s.coins, 0); assert.strictEqual(s.xp, 0); assert.strictEqual(s.ev.candy, 0); assert.strictEqual(s.ev.keys, 0); assert.deepStrictEqual(s.gs, [31, 0, 0]);
});
test('match reward: server computes it, inflated numbers are clamped', async () => {
  const db = memdb(), c = ctx();
  const r = await play(db, c, { rw: 999, rl: 999, kills: 99999, dmg: 9e9, candy: 9e9, gold: 999 });
  assert.strictEqual(r.res.x, 150 + 3 * 20); assert.strictEqual(r.res.c, 25);
  assert.ok(r.res.candy <= 5 * E.LIMITS.candyPerRound + 150, 'candy capped: ' + r.res.candy);
  assert.ok(db.root.arenaStats.lb.u1.k <= 5, 'kills capped to rounds x opponents');
  assert.strictEqual(db.root.users.u1.wins, 1);
});
test('same match cannot be paid twice (replay) and same request id is idempotent', async () => {
  const db = memdb(), c = ctx(); await act(db, c, 'mstart', { mid: 'mX' }); c.now += 120000;
  const rid = id(), a = await E.handle(db, c, { a: 'match', id: rid, mid: 'mX', mode: '1v1', win: 1, rw: 3, rl: 0 });
  const b = await E.handle(db, c, { a: 'match', id: rid, mid: 'mX', mode: '1v1', win: 1, rw: 3, rl: 0 }); assert.ok(b.dup);
  const d = await act(db, c, 'match', { mid: 'mX', mode: '1v1', win: 1, rw: 3, rl: 0 }); assert.ok(d.res.dup);
  assert.strictEqual(d.state.coins, a.state.coins); assert.strictEqual(db.root.users.u1.wins, 1);
});
test('instant "matches" are refused (needs real time since the server saw the start)', async () => {
  const db = memdb(), c = ctx(); await act(db, c, 'mstart', { mid: 'fast' }); c.now += 3000;
  await rejects(act(db, c, 'match', { mid: 'fast', mode: '1v1', win: 1, rw: 3, rl: 0 }), 'rate');
  await act(db, c, 'match', { mid: 'nostart1', mode: '1v1', win: 1, rw: 3, rl: 0 });          /* first claim without a start: ok */
  c.now += 5000; await rejects(act(db, c, 'match', { mid: 'nostart2', mode: '1v1', win: 1, rw: 3, rl: 0 }), 'rate');
});
test('daily caps bound what a scripted client can farm', async () => {
  const db = memdb(), c = ctx(); let last;
  for (let i = 0; i < 120; i++) { try { last = await play(db, c, { mode: 'box', rounds: 100, kills: 900, dmg: 1e6, candy: 1e6 }); } catch (e) { assert.strictEqual(e.code, 'rate'); break; } c.now = T0 + (i + 1) * 130000; if (E.utcDay(c.now) !== E.utcDay(T0)) break; }
  const s = last.state; assert.ok(s.lim.xp <= E.LIMITS.perDay.xp && s.lim.coins <= E.LIMITS.perDay.coins && s.lim.candy <= E.LIMITS.perDay.candy);
  assert.ok(s.ev.candy <= E.LIMITS.perDay.candy);
});
test('shop: price from the server catalogue, no double buy, no buying unsold items', async () => {
  const it = E.CAT.items.find(x => x.price), db = memdb({ econ: { u1: Object.assign(E.blank(), { coins: it.price + 5 }) } });
  await rejects(act(db, ctx(), 'buy', { item: E.CAT.items.find(x => !x.price && x.src !== 'start').id }), 'arg');
  const r = await act(db, ctx(), 'buy', { item: it.id }); assert.strictEqual(r.state.coins, 5); assert.ok(r.state.owned.includes(it.v));
  await rejects(act(db, ctx(), 'buy', { item: it.id }), 'owned');
  const db2 = memdb(); await rejects(act(db2, ctx(), 'buy', { item: it.id }), 'funds');
});
test('daily reward uses the server clock', async () => {
  const db = memdb(), c = ctx(); assert.strictEqual((await act(db, c, 'daily')).state.coins, 50); c.now += 3600e3; await rejects(act(db, c, 'daily'), 'early'); c.now += 864e5; assert.strictEqual((await act(db, c, 'daily')).state.coins, 100);
});
test('halloween pass, boxes, exchange, treat', async () => {
  const st = E.blank(); st.ev.candy = 5000; st.ev.keys = 1; const db = memdb({ econ: { u1: st } }), c = ctx();
  const t = await act(db, c, 'hwBuy', { n: 2 }); assert.strictEqual(t.state.ev.tier, 2); assert.strictEqual(t.res.cost, 2 * E.CAT.passes.hw.tierCost);
  const b = await act(db, c, 'box', { key: 1 }); assert.strictEqual(b.state.ev.keys, t.state.ev.keys - 1); assert.ok(E.ITEM[b.res.item]);
  for (let k = b.state.ev.keys; k > 0; k--) await act(db, c, 'box', { key: 1 });
  await rejects(act(db, c, 'box', { key: 1 }), 'funds');
  const before = (await act(db, c, 'sync')).state.ev.candy, x = await act(db, c, 'exchange', { n: 3 }); assert.strictEqual(x.state.ev.candy, before - 300); assert.strictEqual(x.res.coins, 300);
  await rejects(act(db, c, 'exchange', { n: 1e6 }), 'funds');
  await act(db, c, 'treat'); await rejects(act(db, c, 'treat'), 'early');
  await rejects(act(db, ctx({ now: E.CAT.evt.end + 30 * 864e5 }), 'box', {}), 'closed');
});
test('quests / goals / pass tiers cannot be claimed before they are earned', async () => {
  const db = memdb(), c = ctx();
  await rejects(act(db, c, 'quest', { q: E.CAT.dq[0].id + ':0' }), 'locked'); await rejects(act(db, c, 'goal', { g: E.CAT.ach[0].id }), 'locked');
  await rejects(act(db, c, 'pquest', { n: E.CAT.pq[0].n }), 'locked'); await rejects(act(db, c, 'bpClaim', { i: 0 }), 'none');
  for (let i = 0; i < E.CAT.dq[0].st[0]; i++) await play(db, c, {});
  const q = await act(db, c, 'quest', { q: E.CAT.dq[0].id + ':0' }); assert.strictEqual(q.res.candy, E.CAT.dq[0].r[0]); await rejects(act(db, c, 'quest', { q: E.CAT.dq[0].id + ':0' }), 'done');
});
test('equip: catalogue skins must be owned; custom skins need an owned accessory', async () => {
  const db = memdb(), c = ctx(), locked = E.CAT.items.find(x => x.k === 'skin' && x.cos && x.src !== 'start');
  await rejects(act(db, c, 'equip', { skin: locked.v }), 'owned');
  await rejects(act(db, c, 'equip', { skin: 0x123456 + locked.cos * 16777216, custom: 1 }), 'owned');
  const ok = await act(db, c, 'equip', { skin: 0x123456 + 3 * 140737488355328, custom: 1 }); assert.strictEqual(ok.state.skin, 0x123456 + 3 * 140737488355328);
  await rejects(act(db, c, 'equip', { gun: 0, n: 1 }), 'owned'); await rejects(act(db, c, 'equip', { skin: -5 }), 'arg');
});
test('owners spend nothing and never appear on leaderboards', async () => {
  const db = memdb(), c = ctx({ owner: true }); await act(db, c, 'hwBuy', { n: 3 }); await play(db, c, {});
  assert.ok(!db.root.arenaStats); assert.ok(!(db.root[E.CAT.evt.lb] || {}).lb);
});
test('every committed action leaves a ledger row with the balance after it', async () => {
  const db = memdb(), c = ctx(); await act(db, c, 'daily'); const rows = Object.values(db.root.audit.econ.u1);
  assert.ok(rows.some(r => r.a === 'daily' && r.d.coins === 50 && r.bal.coins === 50));
});
test('Battle Royale pays for placing and eliminations, never for loot; inflated kills are clamped to the lobby size', async () => {
  const db = memdb(), c = ctx(); assert.ok(E.CAT.modes.br && E.CAT.modes.br.br && E.CAT.modes.br.rounds === 1 && E.CAT.modes.br.max === 10);
  const w = await play(db, c, { mode: 'br', rounds: 1, win: 1, kills: 500, dmg: 9e9, place: 1, players: 10 });
  assert.strictEqual(w.res.x, 140 + 9 * 45 + 450); assert.strictEqual(w.res.c, 14 + 9 * 6 + 90);
  const l = await play(db, c, { mode: 'br', rounds: 1, win: 0, kills: 1, dmg: 100, place: 4, players: 6 }); assert.strictEqual(l.res.x, 140 + 45); assert.strictEqual(l.res.c, 20);
  const s = l.state; assert.strictEqual(s.owned.length, E.blank().owned.length, 'a match can never add items to the account');
  const q = await play(db, c, { mode: 'br', left: 1, kills: 3 }); assert.strictEqual(q.res.x, 0);
});
