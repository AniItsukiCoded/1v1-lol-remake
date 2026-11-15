/* ===== Tab guard + light watchdog =====
   1) Tab guard, ONLY while a match is running: closing / reloading asks "Leave site?" first, and Ctrl+W (crouch + forward) is blocked while fullscreen
      (Keyboard Lock). In the menus the page closes normally - the old version asked on every single reload.
   2) Watchdog (every 5 s, was every 700 ms with a forced style recalculation each time): if the page shows owner tools although the SERVER did not
      confirm this account as an owner, the tools are hidden and the event is reported (AC.trip). Nothing is locked and nothing is wiped: owner
      commands are authorised by the Cloud Function on every call, so a forced-open panel cannot do anything anyway. Balances are not judged here
      either - the server flags impossible totals for an owner to review. */
(()=>{
const inMatch=()=>{try{return typeof Game!='undefined'&&Game.busy()}catch(_){return false}};
const lock=()=>{try{navigator.keyboard&&navigator.keyboard.lock&&navigator.keyboard.lock(['KeyW','KeyT','KeyN']).catch(()=>{})}catch(_){}},
 unlock=()=>{try{navigator.keyboard&&navigator.keyboard.unlock&&navigator.keyboard.unlock()}catch(_){}};
addEventListener('beforeunload',e=>{if(!inMatch())return;e.preventDefault();e.returnValue='';return''});
addEventListener('keydown',e=>{if(inMatch()&&(e.ctrlKey||e.metaKey)&&e.code==='KeyW'){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('fullscreenchange',()=>{document.fullscreenElement?lock():unlock()});
document.addEventListener('webkitfullscreenchange',()=>{document.webkitFullscreenElement?lock():unlock()});
document.addEventListener('pointerlockchange',()=>{if(document.fullscreenElement)lock()});
if(document.fullscreenElement)lock();
let strikes=0;
setInterval(()=>{
 if(document.hidden||typeof EV=='undefined'||typeof ADM=='undefined'||typeof user=='undefined')return;
 if(!ADM.ready()){strikes=0;return} /* an owner check is still running or failed: judge nothing */
 if(ADM.verified()){strikes=0;return}
 const ap=document.querySelector('#admin'),gp=document.querySelector('#gadm');
 const forced=EV.owner()||(ap&&ap.classList.contains('on'))||(gp&&gp.classList.contains('on'));
 if(forced){if(++strikes>=2){strikes=0;try{ADM.demote()}catch(_){}AC.trip('owner tools shown without server confirmation')}}else strikes=0;
},5000);
})();
