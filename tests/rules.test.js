'use strict';
/* database.rules.json checked offline with targaryen (npm i in the project root installs it) */
const test = require('node:test'), assert = require('node:assert');
let targaryen; try { targaryen = require('targaryen'); } catch (e) { targaryen = null; }
const rules = require('../database.rules.json');
const NOW = Date.now();
const data = {
  ownerUids: { own: true }, bans: { bad: { until: 0 }, old: { until: 1000 } }, meta: { epoch: 1 },
  users: { a: { name: 'A', wins: 1, losses: 0 } }, econ: { a: { coins: 5, ev: { candy: 1 } } }, saves: { a: { d: '{}' } },
  parties: { OPEN1: { lead: 'a', priv: 0, m: { a: { name: 'A', skin: 1 }, d: { name: 'D', skin: 1 } } }, PRIV1: { lead: 'a', priv: 1, m: { a: { name: 'A', skin: 1 } }, inv: { c: true }, ban: { k: true } }, DEAD1: { lead: 'gone', priv: 0, m: { d: { name: 'D', skin: 1 }, e: { name: 'E', skin: 1 } } } },
  ranked: { s1: { lb: { a: { g: 10, t: NOW - 60000, r: 1000, mm: 1000, pl: 5, w: 6, l: 4, pk: 1000, e: 1000 } } } }
};
const U = (uid, anon) => ({ uid, provider: anon ? 'anonymous' : 'password' });
const skip = !targaryen && 'targaryen not installed';
const db = () => targaryen.database(rules, data, NOW);
const W = (who, path, val) => db().as(who).write(path, val, undefined, NOW).allowed;
const UPD = (who, path, val) => db().as(who).update(path, val, NOW).allowed;
const R = (who, path) => db().as(who).read(path, NOW).allowed;

test('economy is read-only for every client (this is what stops the candy exploit)', { skip }, () => {
  for (const p of ['econ/a/coins', 'econ/a/ev/candy', 'econ/a', 'saves/a', 'halloween26v2/lb/a', 'arenaStats/lb/a', 'users/a/wins', 'flags/a', 'audit/econ/a/x', 'bans/a', 'meta/epoch', 'meta/maint', 'ownerUids/a', 'gifts/a/x', 'inbox/a/x'])
    for (const who of [U('a'), U('own'), U('g', true), null]) assert.strictEqual(W(who, p, p.includes('lb/') ? { n: 'A', c: 5000000 } : 5000000), false, p + ' as ' + (who && who.uid));
  assert.ok(R(U('a'), 'econ/a')); assert.ok(!R(U('b'), 'econ/a')); assert.ok(R(U('own'), 'econ/a')); assert.ok(!R(null, 'econ/a'));
});
test('owner-only data cannot be read by players', { skip }, () => {
  for (const p of ['flags', 'audit', 'iplogs', 'cheats']) { assert.ok(!R(U('a'), p), p); assert.ok(R(U('own'), p), p); }
  assert.ok(R(U('a'), 'ownerUids/a')); assert.ok(!R(U('a'), 'ownerUids/own')); assert.ok(!R(U('a'), 'ownerUids'));
});
test('players can still do what the game needs', { skip }, () => {
  assert.ok(W(U('a'), 'users/a/name', 'NewName')); assert.ok(!W(U('b'), 'users/a/name', 'Hacked')); assert.ok(!W(U('a'), 'users/a/name', 'x'.repeat(40)));
  assert.ok(W(U('a'), 'presence/a', true)); assert.ok(!W(U('a'), 'presence/b', true));
  assert.ok(W(U('a'), 'prefs/a', { t: { '.sv': 'timestamp' }, d: '{}' })); assert.ok(!W(U('a'), 'prefs/b', { t: { '.sv': 'timestamp' }, d: '{}' })); assert.ok(!W(U('g', true), 'prefs/g', { t: { '.sv': 'timestamp' }, d: '{}' }));
  assert.ok(W(U('g', true), 'lobby/waiting', { uid: 'g', t: 1 })); assert.ok(W(U('a'), 'matches/m1/s/a', { x: 1 })); assert.ok(W(U('a'), 'cheats/a/x1', { t: { '.sv': 'timestamp' }, r: 'test' }));
  assert.ok(W(U('a'), 'inbox/a/x', null)); assert.ok(W(U('a'), 'kicks/a', null));
});
test('banned accounts and maintenance close matchmaking; an expired ban does not', { skip }, () => {
  assert.ok(!W(U('bad'), 'lobby/waiting', { uid: 'bad', t: 1 })); assert.ok(!W(U('bad'), 'matches/m1/s/bad', { x: 1 })); assert.ok(!W(U('bad'), 'parties/NEW01', { lead: 'bad', m: { bad: { name: 'B', skin: 1 } } }));
  assert.ok(W(U('old'), 'lobby/waiting', { uid: 'old', t: 1 }));
  const m = targaryen.database(rules, Object.assign({}, data, { meta: { maint: { on: true } } }), NOW);
  assert.ok(!m.as(U('a')).write('lobby/waiting', { uid: 'a', t: 1 }).allowed); assert.ok(m.as(U('own')).write('lobby/waiting', { uid: 'own', t: 1 }).allowed);
});
test('parties: create, join rules, one leader, kick, invitations', { skip }, () => {
  assert.ok(W(U('z'), 'parties/NEW01', { lead: 'z', priv: 0, t: 1, m: { z: { name: 'Z', skin: 1 } } })); assert.ok(!W(U('z'), 'parties/NEW01', { lead: 'a', m: { z: { name: 'Z', skin: 1 } } }), 'cannot create a party led by someone else');
  assert.ok(!W(U('z'), 'parties/OPEN1', { lead: 'z', m: { z: { name: 'Z', skin: 1 } } }), 'cannot overwrite an existing party');
  assert.ok(W(U('b'), 'parties/OPEN1/m/b', { name: 'B', skin: 2 })); assert.ok(!W(U('b'), 'parties/OPEN1/m/x', { name: 'X', skin: 2 }), 'cannot add someone else');
  assert.ok(!W(U('b'), 'parties/PRIV1/m/b', { name: 'B', skin: 2 }), 'invite only'); assert.ok(W(U('c'), 'parties/PRIV1/m/c', { name: 'C', skin: 2 }), 'invited');
  assert.ok(!W(U('k'), 'parties/PRIV1/m/k', { name: 'K', skin: 2 }), 'kicked players stay out'); assert.ok(!W(U('b'), 'parties/NOPE1/m/b', { name: 'B', skin: 2 }), 'no joining a party that does not exist');
  assert.ok(!W(U('d'), 'parties/OPEN1/lead', 'd'), 'member cannot take the lead while the leader is there'); assert.ok(W(U('a'), 'parties/OPEN1/lead', 'd'), 'leader hands over'); assert.ok(!W(U('a'), 'parties/OPEN1/lead', 'stranger'), 'only to a member');
  assert.ok(W(U('d'), 'parties/DEAD1/lead', 'd'), 'leader vanished: a member takes over'); assert.ok(!W(U('z'), 'parties/DEAD1/lead', 'z'), 'outsider cannot');
  assert.ok(W(U('a'), 'parties/OPEN1/m/d', null), 'leader kicks'); assert.ok(!W(U('d'), 'parties/OPEN1/m/a', null), 'member cannot kick'); assert.ok(W(U('d'), 'parties/OPEN1/m/d', null), 'leave');
  assert.ok(W(U('d'), 'parties/OPEN1/m/d/rd', true), 'ready up'); assert.ok(!W(U('d'), 'parties/OPEN1/priv', 1)); assert.ok(W(U('a'), 'parties/OPEN1/priv', 1));
  assert.ok(W(U('a'), 'parties/PRIV1/inv/q', true)); assert.ok(!W(U('c'), 'parties/PRIV1/inv/c2', true), 'non-members cannot invite into a private party');
  const inv = { code: 'OPEN1', name: 'A', t: { '.sv': 'timestamp' } };
  assert.ok(W(U('a'), 'pinv/q/a', inv)); assert.ok(!W(U('z'), 'pinv/q/a', inv), 'cannot forge the sender'); assert.ok(!W(U('z'), 'pinv/q/z', inv), 'must be in that party'); assert.ok(W(U('q'), 'pinv/q/a', null), 'decline'); assert.ok(R(U('q'), 'pinv/q')); assert.ok(!R(U('a'), 'pinv/q'));
});
test('ranked rating: bounded steps, one result per write, rate limited, not for guests', { skip }, () => {
  const e = (o) => Object.assign({ g: 11, t: { '.sv': 'timestamp' }, r: 1030, mm: 1030, pl: 5, w: 7, l: 4, pk: 1030, e: 1030, n: 'A', s: 1 }, o);
  assert.ok(W(U('a'), 'ranked/s1/lb/a', e())); assert.ok(!W(U('a'), 'ranked/s1/lb/a', e({ r: 9000, pk: 9000, e: 9000 })), 'no rating jumps');
  assert.ok(!W(U('a'), 'ranked/s1/lb/a', e({ g: 50 })), 'one game per write'); assert.ok(!W(U('b'), 'ranked/s1/lb/a', e()), 'only your own'); assert.ok(!W(U('a'), 'ranked/s1/lb/a', e({ e: 5000 })));
  assert.ok(!W(U('g', true), 'ranked/s1/lb/g', { g: 1, t: { '.sv': 'timestamp' }, r: 0, mm: 800, pl: 1, w: 1, l: 0, pk: 0, e: 0 }), 'guests');
  assert.ok(W(U('n'), 'ranked/s1/lb/n', { g: 1, t: { '.sv': 'timestamp' }, r: 0, mm: 800, pl: 1, w: 1, l: 0, pk: 0, e: 0 })); assert.ok(!W(U('n'), 'ranked/s1/lb/n', { g: 1, t: { '.sv': 'timestamp' }, r: 5000, mm: 800, pl: 5, w: 1, l: 0, pk: 5000, e: 5000 }));
  const fast = targaryen.database(rules, { ranked: { s1: { lb: { a: Object.assign({}, data.ranked.s1.lb.a, { t: NOW - 3000 }) } } } }, NOW);
  assert.ok(!fast.as(U('a')).write('ranked/s1/lb/a', e()).allowed, 'second result 3 s later is refused');
});
test('Battle Royale match state (matches/<mid>/br) uses the existing match rule: players yes; signed-out, banned and maintenance no; economy still closed', { skip }, () => {
  for (const p of ['matches/rm_br_1/br/r1/ch/3', 'matches/rm_br_1/br/r1/it/c3_0', 'matches/rm_br_1/br/r1/nd/12']) { assert.ok(W(U('a'), p, 'a'), p); assert.ok(W(U('g', true), p, 'g'), p + ' guest'); assert.ok(!W(null, p, 'x'), p + ' signed out'); assert.ok(!W(U('bad'), p, 'bad'), p + ' banned'); }
  assert.ok(W(U('a'), 'matches/rm_br_1/br/r1/dr/x1', { x: 1, y: 0, z: 2, it: { k: 'w', wi: 1, rar: 4, mag: 30 } }));
  assert.ok(W(U('a'), 'rooms/br/r1/lk', true), 'room lock');
  for (const p of ['econ/a/owned', 'econ/a/coins', 'econ/a/ev/candy']) assert.ok(!W(U('a'), p, 99), p + ' stays server-only');
  const m = targaryen.database(rules, Object.assign({}, data, { meta: { maint: { on: true } } }), NOW); assert.ok(!m.as(U('a')).write('matches/rm_br_1/br/r1/ch/3', 'a').allowed);
});
