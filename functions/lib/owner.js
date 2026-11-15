'use strict';
/* =====================================================================================================================
   OWNER COMMANDS  (pure logic, same db adapter as economy.js)

   Every command is authorised HERE, on the server: the caller's UID must be listed under  ownerUids/<uid> = true  in the
   Realtime Database (set by hand in the Firebase console; no client and no command can write that list).
   Nothing in the browser (hidden buttons, variables, localStorage) is ever trusted.
   Each command is rate limited, the dangerous ones need an explicit confirmation flag, and every call is written to
   audit/admin (who, what, on whom, result) which only owners can read.
   ===================================================================================================================== */
const E = require('./economy.js');
const { CAT, ITEM, int } = E;

class OwnerError extends Error { constructor(code, msg) { super(msg); this.code = code; } }
const bad = (code, msg) => { throw new OwnerError(code, msg); };
const CAP = 1000000, RATE = { n: 40, ms: 60000 };
const need = l => 300 + 150 * (l - 1);
const xpForLevel = L => { let x = 0; for (let l = 1; l < L; l++) x += need(l); return x; };
const levelOf = xp => { let l = 1; while (xp >= need(l)) { xp -= need(l); l++; } return l; };
const safeKey = k => typeof k === 'string' && k.length >= 6 && k.length <= 128 && !/[.#$\[\]\/]/.test(k);

/* change one player's economy state (migrating the old save first if the server has never seen this account) */
async function mutate(db, uid, now, fn) {
  const legacy = (await db.get('econ/' + uid)) == null ? ((await db.get('saves/' + uid)) || null) : null;
  let before, after, out;
  let flagged = null;
  await db.tx('econ/' + uid, cur => { flagged = null; const s = cur == null ? E.migrate(legacy, now) : E.norm(cur); if (cur == null) { const w = E.suspicion(s); if (w.length) { s.hold = 1; flagged = { why: 'imported save: ' + w.join(', '), bal: E.snap(s) }; } } before = E.snap(s); out = fn(s); after = E.snap(s); return s; });
  /* first time the server sees this account (an owner opened it before the player came back): same import checks as a player sync */
  if (flagged) await db.update({ ['flags/' + uid]: { t: now, why: flagged.why, bal: flagged.bal, open: true }, ['audit/econ/' + uid + '/' + db.id()]: { t: now, a: 'migrate', bal: flagged.bal } });
  return { before, after, d: E.diff(before, after), out };
}
async function resolve(db, arg) {
  arg = String(arg == null ? '' : arg).trim(); if (!arg) bad('arg', 'Which player? Give a UID or @username');
  if (arg[0] !== '@' && safeKey(arg) && arg.length >= 20) { const u = await db.get('users/' + arg); return { uid: arg, name: (u && u.name) || '(no profile yet)' }; }
  const name = arg.replace(/^@/, ''), hits = await db.find('users', 'name', name, 3);
  if (!hits.length) bad('arg', 'No player called "' + name + '" (names are case sensitive; you can also paste a UID)');
  if (hits.length > 1) bad('arg', hits.length + ' players are called "' + name + '": use the UID instead (' + hits.map(h => h.key).join(', ') + ')');
  return { uid: hits[0].key, name: hits[0].val.name };
}
const amount = (v, max) => { const n = Math.floor(Number(v)); if (!Number.isFinite(n) || n < 0) bad('arg', 'Amount must be a positive number'); if (n > (max || CAP)) bad('arg', 'Amount is over the limit of ' + (max || CAP).toLocaleString() + ' per command'); return n; };
const notify = (up, db, uid, now, by, text, x) => { up['inbox/' + uid + '/' + db.id()] = Object.assign({ t: now, bn: String(by).slice(0, 24), m: String(text).slice(0, 140) }, x || {}); };

/* ---- command table: [dangerous?, usage, help, handler(db, ctx, args) -> {msg, rows?, target?}] ---- */
const C = {};
const def = (name, danger, usage, help, fn) => { C[name] = { danger, usage, help, fn }; };

async function giveCur(db, ctx, a, field, label, sign, set) {
  const t = await resolve(db, a[0]), n = amount(a[1], field === 'keys' ? 1000 : CAP), up = {};
  const r = await mutate(db, t.uid, ctx.now, s => {
    const get = () => field === 'coins' ? s.coins : field === 'xp' ? s.xp : s.ev[field];
    const put = v => { v = Math.max(0, v); if (field === 'coins') s.coins = v; else if (field === 'xp') s.xp = v; else s.ev[field] = v; };
    const was = get(); put(set ? n : was + sign * n);
    /* "ranked" candy also counts as collected (leaderboard + goals); default is spendable only */
    if (field === 'candy' && sign > 0 && !set && String(a[2] || '').toLowerCase() === 'ranked') { s.ev.tot += n; }
    return { was, now: get() };
  });
  up['audit/econ/' + t.uid + '/' + db.id()] = { t: ctx.now, a: 'owner:' + ctx.cmd, by: ctx.uid, d: r.d, bal: r.after };
  if (sign > 0 && !set) notify(up, db, t.uid, ctx.now, ctx.name, 'sent you ' + n.toLocaleString() + ' ' + label, { gift: 1 });
  await db.update(up);
  return { target: t.uid, msg: t.name + ': ' + label + ' ' + r.out.was.toLocaleString() + ' → ' + r.out.now.toLocaleString() };
}

def('help', 0, '/help', 'List every command', async () => ({ msg: 'Commands', rows: Object.keys(C).map(k => ({ command: C[k].usage, what: C[k].help + (C[k].danger ? '  ⚠ asks for confirmation' : '') })) }));

/* ----- players ----- */
def('players', 0, '/players [name starts with]', 'Players online now, or search every account by name', async (db, ctx, a) => {
  if (a[0]) { const hits = await db.prefix('users', 'name', String(a[0]).replace(/^@/, ''), 25); return { msg: hits.length + ' account(s) starting with "' + a[0] + '"', rows: hits.map(h => ({ name: h.val.name, uid: h.key, wins: h.val.wins || 0, losses: h.val.losses || 0 })) }; }
  const pres = Object.keys((await db.get('presence')) || {}).slice(0, 200), rows = [];
  for (const uid of pres) { const u = await db.get('users/' + uid); rows.push({ name: (u && u.name) || 'Guest / new', uid, wins: (u && u.wins) || 0, losses: (u && u.losses) || 0 }); }
  return { msg: rows.length + ' player(s) online', rows };
});
async function info(db, ctx, a) {
  const t = await resolve(db, a[0]);
  const [u, e, flag, ban, lb, ip, pres] = await Promise.all([db.get('users/' + t.uid), db.get('econ/' + t.uid), db.get('flags/' + t.uid), db.get('bans/' + t.uid), db.get('arenaStats/lb/' + t.uid), db.get('iplogs/' + t.uid), db.get('presence/' + t.uid)]);
  const s = e ? E.norm(e) : null, rk = await db.get('ranked/s' + require('./rankcore.js').seasonAt(ctx.now) + '/lb/' + t.uid);
  const info = {
    name: t.name, uid: t.uid, online: !!pres, account: ip && ip.acct || '?', firstSeen: ip && ip.first || null, lastSeen: ip && ip.last || null, visits: ip && ip.cnt || 0, device: ip && ip.dev || '',
    wins: (u && u.wins) || 0, losses: (u && u.losses) || 0, kills: (lb && lb.k) || 0, damage: (lb && lb.dm) || 0, rankedRP: rk ? rk.r | 0 : 0, rankedGames: rk ? rk.g | 0 : 0,
    migrated: !!s, level: s ? levelOf(s.xp) : 1, xp: s ? s.xp : 0, coins: s ? s.coins : 0, candy: s ? s.ev.candy : 0, candyCollected: s ? s.ev.tot : 0, keys: s ? s.ev.keys : 0,
    lolPassTier: s ? E.bpTier(s) : 0, spookyTier: s ? s.ev.tier : 0, items: s ? s.owned.length : 0, onHold: !!(s && s.hold),
    flag: flag && flag.open ? flag.why : '', banned: ban ? (ban.until ? 'until ' + new Date(ban.until).toISOString() : 'permanent') + (ban.reason ? ' (' + ban.reason + ')' : '') : ''
  };
  const inv = s ? s.owned.map(v => CAT.items.find(x => x.v === v)).filter(Boolean).map(x => ({ id: x.id, name: x.n, kind: x.k, rarity: x.rar })) : [];
  return { target: t.uid, msg: t.name + ' · level ' + info.level + ' · ' + info.coins.toLocaleString() + ' coins · ' + info.candy.toLocaleString() + ' candy' + (info.flag ? ' · ⚠ FLAGGED' : '') + (info.banned ? ' · BANNED' : ''), info, inventory: inv };
}
def('inspect', 0, '/inspect <uid|@name>', 'Full account view: stats, currencies, inventory, flags, ban state', info);
def('playerinfo', 0, '/playerinfo <uid|@name>', 'Same as /inspect', info);
def('kick', 0, '/kick <uid|@name> [reason]', 'Remove a player from their current match / queue', async (db, ctx, a) => {
  const t = await resolve(db, a[0]); await db.update({ ['kicks/' + t.uid]: { t: ctx.now, by: ctx.uid, r: a.slice(1).join(' ').slice(0, 120) } }); return { target: t.uid, msg: 'Kicked ' + t.name };
});
def('ban', 1, '/ban <uid|@name> [hours, 0 = permanent] [reason]', 'Ban an account: no matchmaking, parties or rewards (enforced by the database rules and the functions)', async (db, ctx, a) => {
  const t = await resolve(db, a[0]); if ([true, 1].includes(await db.get('ownerUids/' + t.uid))) bad('arg', 'Owners cannot be banned from the game (remove them from ownerUids in the Firebase console first)');
  const numeric = a[1] != null && /^\d+(\.\d+)?$/.test(String(a[1])), hours = numeric ? Math.min(87600, Number(a[1])) : 0, reason = a.slice(numeric ? 2 : 1).join(' ').slice(0, 120);
  await db.update({ ['bans/' + t.uid]: { t: ctx.now, until: hours ? ctx.now + hours * 36e5 : 0, by: ctx.uid, reason }, ['kicks/' + t.uid]: { t: ctx.now, by: ctx.uid, r: 'banned' + (reason ? ': ' + reason : '') } });
  return { target: t.uid, msg: 'Banned ' + t.name + (hours ? ' for ' + hours + 'h' : ' permanently') };
});
def('unban', 0, '/unban <uid|@name>', 'Lift a ban', async (db, ctx, a) => { const t = await resolve(db, a[0]); await db.update({ ['bans/' + t.uid]: null }); return { target: t.uid, msg: 'Unbanned ' + t.name }; });
def('bans', 0, '/bans', 'Every banned account', async (db) => { const b = (await db.get('bans')) || {}; return { msg: Object.keys(b).length + ' ban(s)', rows: Object.entries(b).map(([uid, v]) => ({ uid, until: v.until ? new Date(v.until).toISOString() : 'permanent', reason: v.reason || '', by: v.by })) }; });

/* ----- economy ----- */
def('givecandy', 0, '/givecandy <uid|@name> <amount> [ranked]', 'Add candy (add the word ranked to also count it on the event leaderboard)', (db, ctx, a) => giveCur(db, ctx, a, 'candy', '🍬 candy', 1));
def('removecandy', 1, '/removecandy <uid|@name> <amount>', 'Take candy away (never below 0)', (db, ctx, a) => giveCur(db, ctx, a, 'candy', '🍬 candy', -1));
def('setcandy', 1, '/setcandy <uid|@name> <amount>', 'Set the candy balance to an exact number', (db, ctx, a) => giveCur(db, ctx, a, 'candy', '🍬 candy', 1, true));
def('givecoins', 0, '/givecoins <uid|@name> <amount>', 'Add coins', (db, ctx, a) => giveCur(db, ctx, a, 'coins', '🪙 coins', 1));
def('removecoins', 1, '/removecoins <uid|@name> <amount>', 'Take coins away (never below 0)', (db, ctx, a) => giveCur(db, ctx, a, 'coins', '🪙 coins', -1));
def('setcoins', 1, '/setcoins <uid|@name> <amount>', 'Set the coin balance to an exact number', (db, ctx, a) => giveCur(db, ctx, a, 'coins', '🪙 coins', 1, true));
def('givekeys', 0, '/givekeys <uid|@name> <amount>', 'Add Box Keys (max 1,000 per command)', (db, ctx, a) => giveCur(db, ctx, a, 'keys', '🗝️ keys', 1));
def('giveall', 1, '/giveall <candy|coins|keys|xp> <amount>', 'Gift every player who is online right now', async (db, ctx, a) => {
  const f = String(a[0] || '').toLowerCase(); if (!['candy', 'coins', 'keys', 'xp'].includes(f)) bad('arg', 'Give what? candy, coins, keys or xp');
  const ids = Object.keys((await db.get('presence')) || {}).filter(u => u !== ctx.uid).slice(0, 200); let n = 0;
  for (const uid of ids) { if (await db.get('iplogs/' + uid + '/acct') === 'guest') continue; try { await giveCur(db, ctx, [uid, a[1]], f, { candy: '🍬 candy', coins: '🪙 coins', keys: '🗝️ keys', xp: '⭐ XP' }[f], 1); n++; } catch (e) { if (e.code === 'arg' && /Amount/.test(e.message)) throw e; } }
  return { msg: 'Gifted ' + n + ' online account(s)' };
});
def('reconcilecurrency', 1, '/reconcilecurrency <uid|@name> <keep | ledger | coins candy>', 'Settle a flagged account: keep = accept the balance, ledger = keep only what the server itself has paid out since the account moved to the secure economy, or type exact coins and candy. Clears the hold.', async (db, ctx, a) => {
  const t = await resolve(db, a[0]), mode = String(a[1] || '').toLowerCase(); let coins = null, candy = null;
  if (mode === 'ledger') {
    const rows = Object.values((await db.get('audit/econ/' + t.uid)) || {}); coins = 0; candy = 0;
    rows.sort((x, y) => x.t - y.t).forEach(r => { if (r.a === 'migrate' || !r.d) return; coins = Math.max(0, coins + (r.d.coins || 0)); candy = Math.max(0, candy + (r.d.candy || 0)); });
  } else if (mode !== 'keep') { if (a[2] == null) bad('arg', 'Use: keep, ledger, or two numbers (coins candy)'); coins = amount(a[1], 1e8); candy = amount(a[2], 1e8); }
  const r = await mutate(db, t.uid, ctx.now, s => { if (coins != null) { s.coins = coins; s.ev.candy = candy; if (s.ev.tot > E.LIMITS.suspicious.tot) s.ev.tot = Math.min(s.ev.tot, candy); } delete s.hold; });
  const up = { ['audit/econ/' + t.uid + '/' + db.id()]: { t: ctx.now, a: 'owner:reconcile:' + (mode === 'keep' || mode === 'ledger' ? mode : 'set'), by: ctx.uid, d: r.d, bal: r.after }, ['flags/' + t.uid + '/open']: false, ['flags/' + t.uid + '/closedBy']: ctx.uid, ['flags/' + t.uid + '/closedT']: ctx.now };
  if ((await db.get('flags/' + t.uid)) == null) { delete up['flags/' + t.uid + '/open']; delete up['flags/' + t.uid + '/closedBy']; delete up['flags/' + t.uid + '/closedT']; }
  if (r.after.tot !== r.before.tot) up[CAT.evt.lb + '/lb/' + t.uid + '/c'] = r.after.tot;
  await db.update(up);
  return { target: t.uid, msg: t.name + ' reconciled (' + mode + '): coins ' + r.before.coins.toLocaleString() + ' → ' + r.after.coins.toLocaleString() + ', candy ' + r.before.candy.toLocaleString() + ' → ' + r.after.candy.toLocaleString() + '. Hold cleared.' };
});
def('hold', 1, '/hold <uid|@name> <on|off>', 'Pause / resume spending on an account while you investigate (earning keeps working)', async (db, ctx, a) => {
  const t = await resolve(db, a[0]), on = String(a[1]).toLowerCase() !== 'off'; await mutate(db, t.uid, ctx.now, s => { if (on) s.hold = 1; else delete s.hold; }); return { target: t.uid, msg: t.name + ': spending ' + (on ? 'paused' : 'resumed') };
});
def('auditplayer', 0, '/auditplayer <uid|@name> [rows]', 'Economy ledger of one account: every reward, purchase and owner change, newest first', async (db, ctx, a) => {
  const t = await resolve(db, a[0]), n = int(a[1] == null ? 40 : a[1], 1, 300), rows = (await db.last('audit/econ/' + t.uid, n)).reverse();
  const flag = await db.get('flags/' + t.uid);
  return { target: t.uid, msg: t.name + ': ' + rows.length + ' ledger row(s)' + (flag && flag.open ? ' · ⚠ FLAG: ' + flag.why : ''), rows: rows.map(r => ({ time: new Date(r.val.t).toISOString().replace('T', ' ').slice(0, 19), action: r.val.a, change: Object.entries(r.val.d || {}).map(([k, v]) => k + ' ' + (v > 0 ? '+' : '') + v.toLocaleString()).join(', ') || '—', coins: r.val.bal ? r.val.bal.coins : '', candy: r.val.bal ? r.val.bal.candy : '', by: r.val.by || '', match: r.val.mid || '' })) };
});
def('flags', 0, '/flags', 'Accounts the server flagged for impossible balances (nothing is wiped automatically)', async (db) => {
  const f = (await db.get('flags')) || {}, rows = []; for (const [uid, v] of Object.entries(f)) { if (!v || !v.open) continue; const u = await db.get('users/' + uid + '/name'); rows.push({ name: u || '?', uid, why: v.why, when: new Date(v.t).toISOString().slice(0, 16).replace('T', ' ') }); }
  return { msg: rows.length + ' open flag(s)', rows };
});

/* ----- progress + cosmetics ----- */
def('givexp', 0, '/givexp <uid|@name> <amount>', 'Add account XP', (db, ctx, a) => giveCur(db, ctx, a, 'xp', '⭐ XP', 1));
def('setlevel', 1, '/setlevel <uid|@name> <level 1-500>', 'Set the account level (rewrites XP)', async (db, ctx, a) => {
  const t = await resolve(db, a[0]), L = int(a[1], 1, 500); const r = await mutate(db, t.uid, ctx.now, s => { s.xp = xpForLevel(L); });
  await db.update({ ['audit/econ/' + t.uid + '/' + db.id()]: { t: ctx.now, a: 'owner:setlevel', by: ctx.uid, d: r.d, bal: r.after } }); return { target: t.uid, msg: t.name + ' is now level ' + L };
});
def('setpass', 1, '/setpass <uid|@name> <lol|spooky> <tier 0-30>', 'Set a pass tier', async (db, ctx, a) => {
  const t = await resolve(db, a[0]), which = String(a[1] || '').toLowerCase(), n = int(a[2], 0, 30); if (!['lol', 'spooky'].includes(which)) bad('arg', 'Which pass? lol or spooky');
  await mutate(db, t.uid, ctx.now, s => { if (which === 'lol') { s.bp.xp = n * CAT.passes.bp.per; s.bp.cf = s.bp.cf.filter(i => i < n); } else s.ev.tier = n; });
  await db.update({ ['audit/econ/' + t.uid + '/' + db.id()]: { t: ctx.now, a: 'owner:setpass:' + which + ':' + n, by: ctx.uid } }); return { target: t.uid, msg: t.name + ': ' + which + ' pass tier ' + n };
});
def('grantitem', 0, '/grantitem <uid|@name> <item id>', 'Give a skin / colour / gun skin (see /items for ids)', async (db, ctx, a) => {
  const t = await resolve(db, a[0]), it = ITEM[String(a[1])]; if (!it) bad('arg', 'Unknown item id "' + a[1] + '" (try /items)');
  const r = await mutate(db, t.uid, ctx.now, s => { if (s.owned.includes(it.v)) return false; s.owned.push(it.v); return true; }); if (!r.out) return { target: t.uid, msg: t.name + ' already owns ' + it.n };
  const up = { ['audit/econ/' + t.uid + '/' + db.id()]: { t: ctx.now, a: 'owner:grantitem:' + it.id, by: ctx.uid, d: r.d, bal: r.after } }; notify(up, db, t.uid, ctx.now, ctx.name, 'sent you ' + it.n, { gift: 1, item: it.id }); await db.update(up);
  return { target: t.uid, msg: 'Gave ' + it.n + ' to ' + t.name };
});
def('removeitem', 1, '/removeitem <uid|@name> <item id>', 'Take an item away (starter colours cannot be removed)', async (db, ctx, a) => {
  const t = await resolve(db, a[0]), it = ITEM[String(a[1])]; if (!it) bad('arg', 'Unknown item id "' + a[1] + '"'); if (it.src === 'start') bad('arg', 'Starter colours cannot be removed');
  const r = await mutate(db, t.uid, ctx.now, s => { if (!s.owned.includes(it.v)) return false; s.owned = s.owned.filter(v => v !== it.v); if (s.skin % 4294967296 === it.v) s.skin = s.owned[0]; if (it.k === 'gun' && s.gs[it.w] === it.gn) s.gs[it.w] = 0; return true; });
  if (!r.out) return { target: t.uid, msg: t.name + ' does not own ' + it.n };
  await db.update({ ['audit/econ/' + t.uid + '/' + db.id()]: { t: ctx.now, a: 'owner:removeitem:' + it.id, by: ctx.uid, d: r.d, bal: r.after } }); return { target: t.uid, msg: 'Removed ' + it.n + ' from ' + t.name };
});
def('giveallskins', 1, '/giveallskins <uid|@name>', 'Unlock every item in the game for one account', async (db, ctx, a) => {
  const t = await resolve(db, a[0]); const r = await mutate(db, t.uid, ctx.now, s => { let n = 0; CAT.items.forEach(it => { if (!s.owned.includes(it.v)) { s.owned.push(it.v); n++; } }); return n; });
  await db.update({ ['audit/econ/' + t.uid + '/' + db.id()]: { t: ctx.now, a: 'owner:giveallskins', by: ctx.uid, d: r.d, bal: r.after } }); return { target: t.uid, msg: 'Unlocked ' + r.out + ' item(s) for ' + t.name };
});
def('items', 0, '/items [filter]', 'Item ids for /grantitem and /removeitem', async (db, ctx, a) => { const q = String(a[0] || '').toLowerCase(); return { msg: 'Items', rows: CAT.items.filter(x => !q || (x.id + ' ' + x.n + ' ' + x.rar + ' ' + x.k + ' ' + x.src).toLowerCase().includes(q)).map(x => ({ id: x.id, name: x.n, kind: x.k, rarity: x.rar, source: x.src })) }; });
/* ---- leaderboards: take a player off (and keep them off) / put them back ---- */
const LBK = { kills: ['k'], damage: ['dm'], candy: ['c'], ranked: ['r'], all: ['k', 'dm', 'c', 'r'] };
def('lbremove', 0, '/lbremove <uid|@name> [kills|damage|candy|ranked|all]', 'Take a player off a leaderboard AND keep them off it (the server stops writing them back). Default: all boards. /lbrestore lets them back on', async (db, ctx, a) => {
  const t = await resolve(db, a[0]), w = String(a[1] || 'all').toLowerCase(); if (!LBK[w]) bad('arg', 'Board must be one of: ' + Object.keys(LBK).join(', '));
  const up = {}, ks = LBK[w], seas = require('./rankcore.js').seasonAt(ctx.now);
  if (ks.includes('k')) up['arenaStats/lb/' + t.uid + '/k'] = null;
  if (ks.includes('dm')) up['arenaStats/lb/' + t.uid + '/dm'] = null;
  if (ks.includes('c')) up[CAT.evt.lb + '/lb/' + t.uid] = null;
  if (ks.includes('r')) for (const n of [seas, seas - 1]) if (n >= 1) up['ranked/s' + n + '/lb/' + t.uid] = null;
  for (const k of ks) up['lbhide/' + t.uid + '/' + k] = ctx.now;
  await db.update(up); return { target: t.uid, msg: t.name + ' removed from: ' + (w == 'all' ? 'every leaderboard' : w) + ' (kept off until /lbrestore)' };
});
def('lbrestore', 0, '/lbrestore <uid|@name>', 'Let a player appear on the leaderboards again (removed scores are gone; new matches count again)', async (db, ctx, a) => { const t = await resolve(db, a[0]); await db.update({ ['lbhide/' + t.uid]: null }); return { target: t.uid, msg: t.name + ' can appear on the leaderboards again' }; });
def('lbhidden', 0, '/lbhidden', 'Players currently kept off leaderboards', async (db) => { const h = (await db.get('lbhide')) || {}; return { msg: Object.keys(h).length + ' player(s) kept off', rows: Object.entries(h).map(([uid, v]) => ({ uid, boards: Object.keys(v || {}).map(k => ({ k: 'kills', dm: 'damage', c: 'candy', r: 'ranked' }[k] || k)).join(', ') })) }; });
def('resetstats', 1, '/resetstats <uid|@name>', 'Reset wins / losses and the kill + damage leaderboard entry (currencies and items are untouched)', async (db, ctx, a) => {
  const t = await resolve(db, a[0]); await db.update({ ['users/' + t.uid + '/wins']: 0, ['users/' + t.uid + '/losses']: 0, ['arenaStats/lb/' + t.uid]: null }); return { target: t.uid, msg: 'Stats reset for ' + t.name };
});
def('resetdaily', 0, '/resetdaily <uid|@name>', 'Make the daily reward, treat box and daily quest available again', async (db, ctx, a) => { const t = await resolve(db, a[0]); await mutate(db, t.uid, ctx.now, s => { s.dly = 0; s.ev.tday = ''; s.ev.d = { day: '', s: { win: 0 }, c: [] }; }); return { target: t.uid, msg: 'Dailies reset for ' + t.name }; });

/* ----- server ----- */
def('announce', 0, '/announce <message>   (or /announce off)', 'Banner shown to every player, live', async (db, ctx, a) => {
  const m = a.join(' ').trim().slice(0, 160); if (!m) bad('arg', 'Type a message'); if (m.toLowerCase() === 'off') { await db.update({ 'meta/announce': null }); return { msg: 'Announcement cleared' }; }
  await db.update({ 'meta/announce': { t: ctx.now, m, by: String(ctx.name).slice(0, 24) } }); return { msg: 'Announced: ' + m };
});
def('maintenance', 1, '/maintenance <on|off> [message]', 'Maintenance mode: only owners can queue for matches while it is on (database rules enforce it)', async (db, ctx, a) => {
  const on = String(a[0]).toLowerCase() === 'on'; if (!on && String(a[0]).toLowerCase() !== 'off') bad('arg', 'on or off?');
  await db.update({ 'meta/maint': on ? { on: true, t: ctx.now, m: a.slice(1).join(' ').slice(0, 160) || 'The game is down for maintenance. Back soon!' } : null }); return { msg: 'Maintenance mode ' + (on ? 'ON' : 'OFF') };
});
def('event', 1, '/event <on|off|auto>', 'Force the seasonal event on / off for everyone, or go back to its dates', async (db, ctx, a) => {
  const v = String(a[0] || '').toLowerCase(); if (!['on', 'off', 'auto'].includes(v)) bad('arg', 'on, off or auto?'); await db.update({ 'meta/event': v === 'auto' ? null : v }); return { msg: 'Event: ' + v };
});
def('serverinfo', 0, '/serverinfo', 'Live numbers: players online, queues, rooms, parties, flags, bans', async (db, ctx) => {
  const [pres, w, q, rooms, parties, flags, bans, maint, ev, epoch, rq] = await Promise.all(['presence', 'lobby/waiting', 'lobby2/q', 'rooms', 'parties', 'flags', 'bans', 'meta/maint', 'meta/event', 'meta/epoch', 'rankq'].map(p => db.get(p)));
  const cnt = o => Object.keys(o || {}).length, roomRows = []; Object.entries(rooms || {}).forEach(([md, rs]) => Object.entries(rs || {}).forEach(([rid, r]) => { if (r && ctx.now - (r.hb || 0) < 30000) roomRows.push({ mode: md, room: rid, players: cnt(r.m), match: r.mid }); }));
  const info = { online: cnt(pres), queue1v1: w && ctx.now - w.t < 20000 ? 1 : 0, queueTeams: cnt(q), queueRanked: Object.values(rq || {}).reduce((n, m) => n + cnt(m), 0), liveRooms: roomRows.length, parties: cnt(parties), openFlags: Object.values(flags || {}).filter(f => f && f.open).length, bans: cnt(bans),
    maintenance: maint && maint.on ? 'ON' : 'off', event: ev || (E.evOn(ctx.now, null) ? 'auto (live)' : 'auto (not live)'), dataEpoch: epoch || 0, serverTime: new Date(ctx.now).toISOString() };
  return { msg: info.online + ' online · ' + info.liveRooms + ' live room(s) · ' + info.parties + ' part' + (info.parties === 1 ? 'y' : 'ies'), info, rows: roomRows };
});
def('auditlogs', 0, '/auditlogs [rows]', 'Owner action history (who ran what, on whom)', async (db, ctx, a) => {
  const rows = (await db.last('audit/admin', int(a[0] == null ? 50 : a[0], 1, 300))).reverse();
  return { msg: rows.length + ' owner action(s)', rows: rows.map(r => ({ time: new Date(r.val.t).toISOString().replace('T', ' ').slice(0, 19), owner: r.val.bn || r.val.by, command: '/' + r.val.c + ' ' + (r.val.args || ''), result: r.val.ok ? '✓ ' + (r.val.msg || '') : '✗ ' + (r.val.err || '') })) };
});
def('resetall', 1, '/resetall RESET ALL', 'Wipe every player\'s progress, leaderboards and ranked data (accounts, names and logs stay). Cannot be undone.', async (db, ctx, a) => {
  if (a.join(' ') !== 'RESET ALL') bad('arg', 'Type exactly:  /resetall RESET ALL');
  const users = Object.keys((await db.get('users')) || {}), wl = {}; users.forEach(u => { wl['users/' + u + '/wins'] = 0; wl['users/' + u + '/losses'] = 0; });
  await db.update(Object.assign(wl, { econ: null, saves: null, flags: null, inbox: null, gifts: null, trolls: null, ranked: null, 'arenaStats/lb': null, [CAT.evt.lb + '/lb']: null, 'meta/epoch': ctx.now })); return { msg: 'Everything was reset' };
});

/* ---- one request. ctx = {uid, anon, now, name} ; data = {cmd, args:[...], confirm:bool} ---- */
async function handle(db, ctx, data) {
  data = (data && typeof data === 'object') ? data : {};
  if (!ctx.uid || ctx.anon) bad('denied', 'Not allowed');
  if (![true, 1].includes(await db.get('ownerUids/' + ctx.uid))) {           /* the ONLY thing that makes somebody an owner */
    await db.push('audit/denied', { t: ctx.now, by: ctx.uid, c: String(data.cmd || '').slice(0, 24) }).catch(() => {});
    bad('denied', 'Not allowed');
  }
  const cmd = String(data.cmd || '').toLowerCase().replace(/^\//, ''), def_ = C[cmd];
  const args = (Array.isArray(data.args) ? data.args : []).slice(0, 12).map(x => String(x).slice(0, 200));
  if (!def_) bad('arg', 'Unknown command /' + cmd.slice(0, 24) + ' (try /help)');
  /* rate limit: RATE.n commands per RATE.ms per owner */
  let limited = false;
  await db.tx('adminRate/' + ctx.uid, c => { c = c && ctx.now - c.t < RATE.ms ? c : { t: ctx.now, n: 0 }; if (c.n >= RATE.n) { limited = true; return undefined; } c.n++; return c; });
  if (limited) bad('rate', 'Slow down: too many owner commands in a minute');
  if (def_.danger && data.confirm !== true) return { ok: false, confirm: true, msg: 'Confirm: /' + cmd + ' ' + args.join(' ') + '  —  ' + def_.help };
  const log = { t: ctx.now, by: ctx.uid, bn: String(ctx.name || '').slice(0, 24), c: cmd, args: args.join(' ').slice(0, 300) };
  try {
    const r = await def_.fn(db, Object.assign({ cmd }, ctx), args);
    if (cmd !== 'help') await db.push('audit/admin', Object.assign(log, { ok: true, msg: String(r.msg || '').slice(0, 200), ...(r.target ? { on: r.target } : {}) }));
    return Object.assign({ ok: true }, r);
  } catch (e) {
    await db.push('audit/admin', Object.assign(log, { ok: false, err: String(e.message || e).slice(0, 200) })).catch(() => {});
    if (e instanceof OwnerError || e instanceof E.EconError) throw e; throw e;
  }
}
module.exports = { handle, OwnerError, COMMANDS: C, levelOf, xpForLevel };
