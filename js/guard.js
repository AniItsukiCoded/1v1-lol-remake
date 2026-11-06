/* ===== Tab guard + anti-cheat watchdog =====
   1) Tab guard: closing / reloading / leaving the page asks "Leave site?" first (beforeunload); Ctrl+W is blocked while fullscreen (Keyboard Lock).
      (Switched off once the anti-cheat has locked the site, so the lockdown can actually close / redirect the tab.)
   2) Watchdog (every 700 ms): the page may only claim owner status after the SERVER confirmed it (ADM.verified(), see admin.js). Anything else =
      fake owner -> AC.trip() -> whole site locked, any click closes the tab. Also trips on: owner not signed in / guest account acting as owner, admin
      panels visible to a non-owner, the core objects (EV / ADM / AC) being replaced or unfrozen, and impossible currency / XP totals on normal accounts
      (those also get their progress wiped). */
(()=>{
const lock=()=>{try{navigator.keyboard&&navigator.keyboard.lock&&navigator.keyboard.lock(['KeyW','KeyT','KeyN']).catch(()=>{})}catch(_){}},
 unlock=()=>{try{navigator.keyboard&&navigator.keyboard.unlock&&navigator.keyboard.unlock()}catch(_){}};
addEventListener('beforeunload',e=>{if(AC.locked())return;e.preventDefault();e.returnValue='';return''});
addEventListener('keydown',e=>{if(!AC.locked()&&(e.ctrlKey||e.metaKey)&&e.code==='KeyW'){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('fullscreenchange',()=>{document.fullscreenElement?lock():unlock()});
document.addEventListener('webkitfullscreenchange',()=>{document.webkitFullscreenElement?lock():unlock()});
document.addEventListener('pointerlockchange',()=>{if(document.fullscreenElement)lock()});
if(document.fullscreenElement)lock();

/* sane ceilings for NORMAL accounts. Gifts are capped at 1,000,000 per gift (rules + client), so a legit account stays far below these. */
const LIM={coins:5e6,xp:5e6,candy:5e6,keys:500,tot:5e6,tier:30};
const shown=el=>{if(!el)return false;const c=getComputedStyle(el);return c.display!=='none'&&c.visibility!=='hidden'&&el.offsetParent!==null||el.classList.contains('on')};
let boot=Date.now(),sig=null;
const bad=(w,o)=>{AC.trip(w,o);return true};
setInterval(()=>{
 if(AC.locked())return;
 if(typeof EV=='undefined'||typeof ADM=='undefined'||typeof user=='undefined'||typeof CFG=='undefined')return;
 /* the core objects must still be the frozen originals */
 if(!Object.isFrozen(EV)||!Object.isFrozen(EV.admin)||!Object.isFrozen(ADM)||!Object.isFrozen(AC)||!Object.isFrozen(TOS))return bad('core object tampered');
 const o=EV.owner(),v=ADM.verified();
 if(o&&!v)return bad('fake owner (server did not confirm)');
 if(o&&(!user||user.isAnonymous))return bad('owner flag without a real signed-in account');
 if(!o&&!user&&shown(document.querySelector('#menu')))return bad('menu without sign-in');
 if(!v){
  const ap=document.querySelector('#admin'),gp=document.querySelector('#gadm'),ab=document.querySelector('#admb');
  if((ap&&ap.classList.contains('on'))||(gp&&gp.classList.contains('on'))||(ab&&ab.style.display!=='none'&&shown(ab)))return bad('admin UI shown to a non-owner');
  /* impossible totals on a normal account */
  const E=CFG.ev||{},B=CFG.bp||{};
  if(user&&!user.isAnonymous&&(CFG.coins>LIM.coins||CFG.xp>LIM.xp||E.candy>LIM.candy||E.keys>LIM.keys||E.tot>LIM.tot||E.tier>LIM.tier||B.xp>LIM.xp))return bad('impossible stats: coins '+CFG.coins+' xp '+CFG.xp+' candy '+E.candy,{wipe:true});
 }
},700);
})();
