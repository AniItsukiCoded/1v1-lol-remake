/* ================= ECONOMY CLIENT =================
   The browser no longer owns any balance. Coins, candy, keys, XP, items and pass progress live in  econ/<uid>  in the Realtime Database,
   which the database rules make READ-ONLY for players. This file:
     - listens to that node and mirrors it into CFG (so every menu keeps reading CFG.coins, CFG.ev.candy ... exactly as before)
     - sends ACTIONS to the "econ" Cloud Function ("I finished this match", "buy this item", "open a box"); the server decides the outcome
     - keeps finished-match claims in localStorage until the server has confirmed them (offline, tab closed, flaky Wi-Fi), each with its own
       id so a claim can never be paid twice
   Editing CFG / localStorage in the console only changes what THIS screen shows until the next server update; it cannot change a real balance.
   Loaded right after main.js. */
const ECON=(()=>{
const KEYS=['coins','xp','owned','dly','skin','gs','ev','bp'];
let uid=null,ref=null,cb=null,last=null,ready=false,down=0,fnc=null,flushing=false,holdShown=false;
const rid=()=>{const a=new Uint8Array(12);(window.crypto||window.msCrypto).getRandomValues(a);return Array.from(a,b=>b.toString(16).padStart(2,'0')).join('')};
const callable=()=>{if(fnc)return fnc;if(!firebase.functions)throw new Error('functions SDK missing');return fnc=firebase.app().functions(window.FUNCTIONS_REGION||'us-central1').httpsCallable('econ',{timeout:20000})};
const qk=()=>'econq_'+uid;
const rq=()=>{try{const a=JSON.parse(localStorage.getItem(qk())||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
const wq=a=>{try{localStorage.setItem(qk(),JSON.stringify(a.slice(-40)))}catch(e){}};
const list=v=>Array.isArray(v)?v:(v&&typeof v=='object'?Object.values(v):[]);
/* server state -> CFG. Arrays may arrive as objects (Realtime Database), so they are rebuilt; nothing here is trusted for anything but display */
function apply(s){if(!s||typeof s!='object'||!uid)return;last=s;
 CFG.coins=+s.coins||0;CFG.xp=+s.xp||0;CFG.dly=+s.dly||0;CFG.owned=list(s.owned).map(Number).filter(Number.isFinite);
 if(Number.isFinite(+s.skin))CFG.skin=+s.skin;const g=list(s.gs);CFG.gs=[0,1,2].map(i=>g[i]|0);
 const e=s.ev||{},d=e.d||{};CFG.ev=Object.assign({},e,{pq:list(e.pq),ach:list(e.ach),d:{day:d.day||'',s:Object.assign({},d.s),c:list(d.c)},st:Object.assign({},e.st),dl:Object.assign({k:'',c:0},e.dl)});
 const b=s.bp||{};CFG.bp={xp:+b.xp||0,cf:list(b.cf).map(Number)};CFG.hold=s.hold?1:0;CFG.own=uid;
 try{localStorage.cfg=JSON.stringify(CFG)}catch(_){}
 try{EV.reload();ui()}catch(_){}
 if(s.hold&&!holdShown){holdShown=true;try{toast('Your balance is being reviewed by the game owners. You can keep playing and earning; spending is paused for now.')}catch(_){}}}
function detach(){if(ref&&cb)ref.off('value',cb);ref=cb=null;uid=null;last=null;ready=false;holdShown=false}
/* called after every sign-in. Guests have no economy (they play every mode, but earn nothing and keep the two starter colours). */
async function attach(u){detach();if(!u||u.isAnonymous)return;uid=u.uid;const me=uid;
 ref=db.ref('econ/'+uid);cb=ref.on('value',s=>{if(uid===me&&s.val())apply(s.val())},e=>console.warn('economy unavailable (publish database.rules.json):',e&&e.message));
 try{await act('sync',{},{quiet:1});ready=true}catch(e){if(uid===me)warnDown(e)}
 flush()}
function warnDown(e){const c=e&&e.code||'';if(Date.now()-down<60000)return;down=Date.now();
 console.warn('[economy] server call failed:',c,e&&e.message,'\nThe "econ" Cloud Function is not reachable. Deploy it:  cd functions && npm install && cd .. && firebase deploy --only functions,database  (needs the Blaze plan). Guests and owners are not blocked by this; rewards for signed-in players wait until it is up.');
 try{toast(/not-found|internal|unavailable|deadline|functions SDK/.test(c+(e&&e.message||''))?(ADM_owner()?'Rewards server not deployed yet — owner perks still work, player rewards wait until you run firebase deploy':'Rewards server unreachable — your progress is safe, new rewards wait until it is back'):'Could not reach the rewards server')}catch(_){}}
const ADM_owner=()=>{try{return !!(EV&&EV.owner())}catch(e){return false}};
/* one action. Resolves with {res, state}; rejects with an Error whose .message is safe to show. opts.quiet = no toast on failure */
async function act(a,args,opts){opts=opts||{};if(!uid)throw Object.assign(new Error('Sign in to earn and keep rewards'),{code:'guest'});const me=uid;
 const data=Object.assign({a,id:opts.id||rid()},args||{});let r;
 try{r=(await callable()(data)).data}
 catch(e){const det=e&&e.details,msg=(e&&e.message)||'Server error',game=det&&det.code; /* game = the server understood the request and said no */
  if(uid===me){if(det&&det.state)apply(det.state);else if(last)apply(last)} /* put the screen back to what the server really has */
  if(!game)warnDown(e);else if(!opts.quiet)try{toast(msg)}catch(_){}
  throw Object.assign(new Error(msg),{code:game||'net',net:!game})}
 if(uid===me&&r&&r.state)apply(r.state);return r||{}}
/* ---- finished matches: queued first, sent second, removed only when the server answered (accepted OR refused for a game reason) ---- */
function match(m){if(!uid)return;const q=rq();q.push(Object.assign({id:rid(),t:Date.now()},m));wq(q);flush()}
async function flush(){if(flushing||!uid)return;flushing=true;const me=uid;
 try{for(;;){const q=rq();if(!q.length||uid!==me)break;const m=q[0];let drop=true;
  if(Date.now()-m.t<7*864e5){try{const r=await act('match',m,{id:m.id,quiet:1});if(r&&r.res&&ECON.onMatch)try{ECON.onMatch(r.res,m)}catch(_){}}
   catch(e){if(e.net){drop=false}else console.info('[economy] match not rewarded:',e.message)}}
  if(!drop)break;const q2=rq().filter(x=>x.id!==m.id);wq(q2)}}
 finally{flushing=false}}
addEventListener('online',()=>flush());
return{attach,detach,act,match,flush,started:mid=>{if(uid)act('mstart',{mid},{quiet:1}).catch(()=>{})},ready:()=>ready,on:()=>!!uid,state:()=>last,onMatch:null}})();
