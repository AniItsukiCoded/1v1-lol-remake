'use strict';
/* in-memory stand-in for the Realtime Database adapter used by functions/lib (same 9 methods as functions/index.js) */
module.exports = function memdb(seed) {
  const root = JSON.parse(JSON.stringify(seed || {})); let n = 0;
  const parts = p => String(p).split('/').filter(Boolean);
  const get = p => { let o = root; for (const k of parts(p)) { if (o == null || typeof o !== 'object') return null; o = o[k]; } return o === undefined ? null : JSON.parse(JSON.stringify(o)); };
  const set = (p, v) => { const ks = parts(p); if (!ks.length) throw new Error('root'); let o = root; for (let i = 0; i < ks.length - 1; i++) { if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {}; o = o[ks[i]]; } if (v == null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); };
  const list = p => Object.entries(get(p) || {}).map(([key, val]) => ({ key, val }));
  const db = {
    root, get: async p => get(p),
    tx: async (p, fn) => { const r = fn(get(p)); if (r === undefined) return { committed: false, value: get(p) }; set(p, r); return { committed: true, value: get(p) }; },
    update: async m => { Object.entries(m).forEach(([p, v]) => set(p, v)); },
    push: async (p, v) => { set(p + '/' + db.id(), v); },
    id: () => '-id' + String(++n).padStart(6, '0'),
    top: async (p, child, k) => list(p).filter(x => x.val && x.val[child] != null).sort((a, b) => b.val[child] - a.val[child]).slice(0, k),
    find: async (p, child, v, k) => list(p).filter(x => x.val && x.val[child] === v).slice(0, k),
    prefix: async (p, child, q, k) => list(p).filter(x => x.val && String(x.val[child] || '').startsWith(q)).slice(0, k),
    last: async (p, k) => list(p).sort((a, b) => a.key < b.key ? -1 : 1).slice(-k)
  };
  return db;
};
