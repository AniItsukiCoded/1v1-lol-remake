'use strict';
/* Cloud Functions entry point. All the logic is in lib/economy.js and lib/owner.js (plain JS, covered by the tests in /tests);
   this file only checks who is calling and connects those modules to the Realtime Database through the Admin SDK.

   econ   -> every economy action a player can ask for (rewards, purchases, boxes, quests, passes...)
   owner  -> owner commands. Authorised by ownerUids/<uid> === true, read here with admin rights on every single call.

   Deploy:  cd functions && npm install && cd .. && firebase deploy --only functions,database      (needs the Blaze plan) */
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');
const economy = require('./lib/economy.js');
const owner = require('./lib/owner.js');

admin.initializeApp();
const root = () => admin.database().ref();
const list = s => { const a = []; s.forEach(c => { a.push({ key: c.key, val: c.val() }); }); return a; };
const db = {
  get: async p => (await root().child(p).once('value')).val(),
  tx: async (p, fn) => { const r = await root().child(p).transaction(c => fn(c), undefined, false); return { committed: r.committed, value: r.snapshot.val() }; },
  update: m => root().update(m),
  push: (p, v) => root().child(p).push(v),
  id: () => root().push().key,
  top: async (p, child, n) => list(await root().child(p).orderByChild(child).limitToLast(n).once('value')).reverse(),
  find: async (p, child, v, n) => list(await root().child(p).orderByChild(child).equalTo(v).limitToFirst(n).once('value')),
  prefix: async (p, child, q, n) => list(await root().child(p).orderByChild(child).startAt(q).endAt(q + '').limitToFirst(n).once('value')),
  last: async (p, n) => list(await root().child(p).orderByKey().limitToLast(n).once('value'))
};
const OPTS = { region: 'us-central1', maxInstances: 20, memory: '256MiB', timeoutSeconds: 30, cors: true };
const who = req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first');
  const t = req.auth.token || {};
  return { uid: req.auth.uid, anon: (t.firebase && t.firebase.sign_in_provider) === 'anonymous', name: String(t.name || 'Player').slice(0, 24), now: Date.now() };
};
const fail = e => {
  if (e instanceof economy.EconError || e instanceof owner.OwnerError) return new HttpsError(e.code === 'denied' ? 'permission-denied' : e.code === 'rate' ? 'resource-exhausted' : 'failed-precondition', e.message, { code: e.code, state: e.state || null });
  console.error(e); return new HttpsError('internal', 'Server error');
};

exports.econ = onCall(OPTS, async req => {
  const ctx = who(req);
  try {
    const [own, ban, ev] = await Promise.all([db.get('ownerUids/' + ctx.uid), db.get('bans/' + ctx.uid), db.get('meta/event')]);
    ctx.owner = (own === true || own === 1) && !ctx.anon;
    ctx.banned = !!ban && (!ban.until || ban.until > ctx.now) && !ctx.owner;
    ctx.evForce = ev === 'on' || ev === 'off' ? ev : null;
    ctx.rnd = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;          /* drops are rolled here, never in the browser */
    return await economy.handle(db, ctx, req.data);
  } catch (e) { throw fail(e); }
});

exports.owner = onCall(OPTS, async req => {
  const ctx = who(req);
  try { return await owner.handle(db, ctx, req.data); } catch (e) { throw fail(e); }
});
