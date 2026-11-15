'use strict';
const test = require('node:test'), assert = require('node:assert');
const O = require('../functions/lib/owner.js'), E = require('../functions/lib/economy.js'), memdb = require('./memdb.js');
const UID = 'ownerownerownerowner1234', P = 'playerplayerplayer123456';
const seed = () => memdb({ ownerUids: { [UID]: true }, users: { [P]: { name: 'Bob', wins: 3, losses: 1 }, [UID]: { name: 'Boss' } }, presence: { [P]: true } });
const ctx = o => Object.assign({ uid: UID, anon: false, now: 1.8e12, name: 'Boss' }, o);
const run = (db, line, confirm, c) => { const a = line.split(' '); return O.handle(db, c || ctx(), { cmd: a[0], args: a.slice(1), confirm }); };

test('a normal player (or a guest, or a forged flag) is refused and the attempt is logged', async () => {
  const db = seed();
  await assert.rejects(run(db, 'givecandy @Bob 5000', true, ctx({ uid: P })), e => e.code === 'denied');
  await assert.rejects(run(db, 'givecandy @Bob 5000', true, ctx({ anon: true })), e => e.code === 'denied');
  db.root.ownerUids.fake = 'true'; await assert.rejects(run(db, 'serverinfo', true, ctx({ uid: 'fake' })), e => e.code === 'denied');   /* only boolean true counts */
  assert.ok(!db.root.econ); assert.ok(Object.keys(db.root.audit.denied).length >= 2);
});
test('give / remove / set currency by @name or uid, capped, logged, player notified', async () => {
  const db = seed(); let r = await run(db, 'givecandy @Bob 500'); assert.ok(r.ok); assert.strictEqual(db.root.econ[P].ev.candy, 500); assert.strictEqual(db.root.econ[P].ev.tot, 0);
  await run(db, 'givecandy ' + P + ' 100 ranked'); assert.strictEqual(db.root.econ[P].ev.tot, 100);
  await assert.rejects(run(db, 'givecoins @Bob 99999999'), e => /limit/.test(e.message)); await assert.rejects(run(db, 'givecoins @Bob -5'), e => e.code === 'arg');
  await assert.rejects(run(db, 'givecoins @Nobody 5'), e => /No player/.test(e.message));
  r = await run(db, 'removecandy @Bob 9999'); assert.ok(r.confirm && !r.ok, 'dangerous command asks first'); assert.strictEqual(db.root.econ[P].ev.candy, 600);
  await run(db, 'removecandy @Bob 9999', true); assert.strictEqual(db.root.econ[P].ev.candy, 0, 'never below zero');
  await run(db, 'setcoins @Bob 777', true); assert.strictEqual(db.root.econ[P].coins, 777);
  assert.ok(Object.values(db.root.inbox[P]).some(x => /candy/.test(x.m))); assert.ok(Object.values(db.root.audit.admin).some(x => x.c === 'givecandy' && x.ok && x.on === P));
  assert.ok(Object.values(db.root.audit.econ[P]).some(x => x.a === 'owner:givecandy' && x.by === UID));
});
test('items, level, passes, stats', async () => {
  const db = seed(), it = E.CAT.items.find(x => x.src !== 'start');
  await run(db, 'grantitem @Bob ' + it.id); assert.ok(db.root.econ[P].owned.includes(it.v)); assert.match((await run(db, 'grantitem @Bob ' + it.id)).msg, /already/);
  await run(db, 'removeitem @Bob ' + it.id, true); assert.ok(!Object.values(db.root.econ[P].owned).includes(it.v));
  await assert.rejects(run(db, 'grantitem @Bob nope'), e => e.code === 'arg');
  await run(db, 'giveallskins @Bob', true); assert.strictEqual(Object.values(db.root.econ[P].owned).length, E.CAT.items.length);
  await run(db, 'setlevel @Bob 10', true); assert.strictEqual(O.levelOf(db.root.econ[P].xp), 10);
  await run(db, 'setpass @Bob spooky 12', true); assert.strictEqual(db.root.econ[P].ev.tier, 12);
  await run(db, 'resetstats @Bob', true); assert.strictEqual(db.root.users[P].wins, 0);
  const i = await run(db, 'inspect @Bob'); assert.strictEqual(i.info.level, 10); assert.ok(i.inventory.length > 50); assert.strictEqual(i.info.online, true);
});
test('kick / ban / unban; owners cannot be banned', async () => {
  const db = seed(); await run(db, 'kick @Bob afk'); assert.strictEqual(db.root.kicks[P].r, 'afk');
  await run(db, 'ban @Bob 2 cheating in ranked', true); assert.strictEqual(db.root.bans[P].until, 1.8e12 + 2 * 36e5); assert.strictEqual(db.root.bans[P].reason, 'cheating in ranked');
  await run(db, 'ban @Bob being rude', true); assert.strictEqual(db.root.bans[P].until, 0); assert.strictEqual(db.root.bans[P].reason, 'being rude');
  await run(db, 'unban @Bob'); assert.ok(!db.root.bans || !db.root.bans[P]);
  await assert.rejects(run(db, 'ban @Boss', true), e => /Owners cannot/.test(e.message));
});
test('investigating the candy exploit: flag -> ledger -> reconcile, nothing automatic', async () => {
  const db = seed(); db.root.saves = { [P]: { d: JSON.stringify({ coins: 40, ev: { candy: 5000000, tot: 5000000 } }) } };
  const pc = { uid: P, anon: false, owner: false, now: 1.8e12, rnd: () => .5, evForce: 'on', name: 'Bob' };
  await E.handle(db, pc, { a: 'sync' }); await E.handle(db, pc, { a: 'daily', id: 'dailydaily01' });
  const f = await run(db, 'flags'); assert.strictEqual(f.rows.length, 1); assert.strictEqual(f.rows[0].uid, P);
  const a = await run(db, 'auditplayer @Bob'); assert.ok(a.rows.some(r => r.action === 'migrate')); assert.match(a.msg, /FLAG/);
  await run(db, 'reconcilecurrency @Bob ledger', true);
  assert.strictEqual(db.root.econ[P].ev.candy, 0); assert.strictEqual(db.root.econ[P].coins, 50, 'keeps what the server itself paid (the daily 50)'); assert.ok(!db.root.econ[P].hold); assert.strictEqual(db.root.flags[P].open, false);
  assert.strictEqual((await run(db, 'flags')).rows.length, 0);
});
test('server commands: announce, maintenance, event, serverinfo, auditlogs, help', async () => {
  const db = seed(); await run(db, 'announce Double candy this weekend!'); assert.strictEqual(db.root.meta.announce.m, 'Double candy this weekend!'); await run(db, 'announce off'); assert.ok(!db.root.meta || !db.root.meta.announce);
  await run(db, 'maintenance on patching', true); assert.strictEqual(db.root.meta.maint.on, true); await run(db, 'maintenance off', true); assert.ok(!db.root.meta.maint);
  await run(db, 'event off', true); assert.strictEqual(db.root.meta.event, 'off'); await run(db, 'event auto', true); assert.ok(!db.root.meta.event);
  const s = await run(db, 'serverinfo'); assert.strictEqual(s.info.online, 1); const l = await run(db, 'auditlogs'); assert.ok(l.rows.length >= 6);
  const h = await run(db, 'help'); for (const c of ['players', 'inspect', 'kick', 'ban', 'unban', 'playerinfo', 'givecandy', 'removecandy', 'setcandy', 'givecoins', 'givekeys', 'reconcilecurrency', 'auditplayer', 'givexp', 'setlevel', 'grantitem', 'removeitem', 'giveallskins', 'resetstats', 'announce', 'maintenance', 'serverinfo', 'event', 'auditlogs']) assert.ok(h.rows.some(r => r.command.startsWith('/' + c + ' ') || r.command === '/' + c), c);
  await assert.rejects(run(db, 'nosuchcommand'), e => e.code === 'arg');
});
test('rate limit: 40 commands a minute per owner', async () => {
  const db = seed(); for (let i = 0; i < 40; i++) await run(db, 'serverinfo'); await assert.rejects(run(db, 'serverinfo'), e => e.code === 'rate');
  await run(db, 'serverinfo', false, ctx({ now: 1.8e12 + 61000 }));
});

test('an owner written as the number 1 (what the console shows) works, and owners can ban / take players off leaderboards', async () => {
  const db = seed(); db.root.ownerUids[UID] = 1;
  db.root.arenaStats = { lb: { [P]: { n: 'Bob', k: 50, dm: 9000, s: 1 } } }; db.root[E.CAT.evt.lb] = { lb: { [P]: { n: 'Bob', c: 400, d: 5, dk: 'x', s: 1 } } };
  await run(db, 'ban @Bob 2 cheating', true); assert.ok(db.root.bans[P] && db.root.bans[P].until > 0);
  let r = await run(db, 'lbremove @Bob kills'); assert.ok(r.ok); assert.strictEqual(db.root.arenaStats.lb[P].k, undefined); assert.strictEqual(db.root.arenaStats.lb[P].dm, 9000); assert.ok(db.root.lbhide[P].k && !db.root.lbhide[P].dm);
  await run(db, 'lbremove @Bob all'); assert.strictEqual(db.root.arenaStats.lb[P].dm, undefined); assert.ok(!db.root[E.CAT.evt.lb].lb[P]); assert.ok(db.root.lbhide[P].c && db.root.lbhide[P].r);
  await assert.rejects(run(db, 'lbremove @Bob nonsense'), e => e.code === 'arg');
  assert.strictEqual((await run(db, 'lbhidden')).rows.length, 1);
  await run(db, 'lbrestore @Bob'); assert.ok(!db.root.lbhide || !db.root.lbhide[P]);
  await assert.rejects(run(db, 'lbremove @Bob all', true, ctx({ uid: P })), e => e.code === 'denied');
});
