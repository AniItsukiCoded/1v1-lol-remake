/* ================= ANTI-CHEAT: REPORTING ONLY =================
   Loaded FIRST. What actually protects the game is on the SERVER:
     - database.rules.json : a browser cannot write balances, items, leaderboards, bans or owner status at all
     - functions/          : every reward / purchase / owner command is validated and logged by Cloud Functions
   So this file no longer "punishes" anything. The old version locked the whole site, hid the page, tried to close the tab on any click and could
   wipe a player's progress when a client-side check misfired (slow network, browser extension, a victim of someone else's exploit...). None of
   that stopped a real cheater - they simply talk to the database directly - but it did hurt normal players. Now:

     AC.flag(reason)  -> log a suspicious event to cheats/<uid> (owners read it in the Owner panel). Rate limited. Nothing else happens.
     AC.trip(reason)  -> same, for the stronger signals (a page pretending to be an owner). It also hides any owner UI that was forced open,
                         which is harmless for the player and useless for the tamperer: the buttons cannot do anything without the server.
     AC.locked()      -> always false (kept so older code keeps working).

   Graduated response lives on the server: invalid requests are rejected, impossible balances are flagged + put on hold for an owner to review
   (never wiped automatically), and owners decide what to do (/flags, /auditplayer, /reconcilecurrency, /ban). */
const AC_=(()=>{
const seen={};let n=0;
function report(why){try{if(typeof db=='undefined'||typeof user=='undefined'||!user)return;
 db.ref('cheats/'+user.uid).push({t:firebase.database.ServerValue.TIMESTAMP,r:String(why).slice(0,80),n:String(user.displayName||'').slice(0,40)}).catch(()=>{})}catch(_){}}
/* at most one report per reason per 5 minutes and 20 per page load: a bug that fires every frame must not flood the database */
function flag(why){why=String(why||'unknown');const t=Date.now();if(n>=20||t-(seen[why]||0)<3e5)return false;seen[why]=t;n++;report(why);console.warn('[anti-cheat] reported: '+why);return false}
function trip(why){flag(why);
 try{['#admin','#gadm'].forEach(q=>{const e=document.querySelector(q);if(e&&typeof ADM!='undefined'&&!ADM.verified())e.classList.remove('on')});
  const b=document.querySelector('#admb');if(b&&typeof ADM!='undefined'&&!ADM.verified())b.style.display='none'}catch(_){}
 return false}
try{sessionStorage.removeItem('__ac_lk')}catch(_){} /* a lock left behind by the old version must not survive the update */
return Object.freeze({trip,flag,locked:()=>false})})();
Object.defineProperty(window,'AC',{value:AC_,writable:false,configurable:false});
