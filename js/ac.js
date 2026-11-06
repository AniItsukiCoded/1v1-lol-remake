/* ================= ANTI-CHEAT / LOCKDOWN =================
   Loaded FIRST (before every other script). Real protection is the database rules (database.rules.json): owner powers are checked on the server
   against ownerUids/<uid>. This file is the second layer: it notices someone faking owner / tampering with the page and locks the whole site.

   LOCKDOWN = full-screen blocker over everything, the game is muted + pointer-unlocked, and ANY click / key / touch tries to close the tab.
   (Browsers only let a script close a tab that the script itself opened, so if the browser refuses, the tab is sent to about:blank instead.)
   The lock survives a reload in the same tab (sessionStorage). Closing the tab and opening the site again starts clean, so a false alarm never
   locks anybody out for good.

   AC.trip(reason, opts)  -> lock the site.  opts.wipe = also reset this account's local progress (used for impossible stats).
   AC.locked()            -> true once locked.                                                                                          */
const AC_=(()=>{
let locked=false,box=null,mo=null,closing=false,spec=false;
const KEY='__ac_lk';
const tap=['pointerdown','mousedown','mouseup','click','dblclick','contextmenu','keydown','keyup','touchstart','touchend','wheel'];
function kill(e){
 try{e&&e.preventDefault&&e.preventDefault();e&&e.stopImmediatePropagation&&e.stopImmediatePropagation()}catch(_){}
 if(closing)return;closing=true;
 try{window.onbeforeunload=null}catch(_){}
 try{window.open('','_self');window.close()}catch(_){}
 try{window.close()}catch(_){}
 setTimeout(()=>{try{location.replace('about:blank')}catch(_){}},60);
 setTimeout(()=>{try{document.documentElement.innerHTML=''}catch(_){}closing=false},400)}
function paint(why){
 if(box&&box.isConnected)return;
 box=document.createElement('div');box.id='aclock';
 box.setAttribute('style','position:fixed;inset:0;z-index:2147483647;background:#050000;color:#ff4d5e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;font:800 18px/1.4 system-ui,sans-serif;cursor:not-allowed;user-select:none;pointer-events:all;padding:24px');
 const h=document.createElement('div');h.style.cssText='font-size:clamp(26px,6vw,54px);letter-spacing:.06em';h.textContent='⛔ ACCESS BLOCKED';
 const p=document.createElement('div');p.style.cssText='max-width:520px;color:#ffb3bb;font-weight:700';p.textContent='Tampering was detected on this page. This site is now locked and the attempt has been logged.';
 const s=document.createElement('div');s.style.cssText='opacity:.7;font-size:14px';s.textContent='Click anywhere to close this tab.';
 box.append(h,p,s);(document.body||document.documentElement).appendChild(box)}
function lockUi(why){
 paint(why);
 try{document.exitPointerLock&&document.exitPointerLock()}catch(_){}
 try{document.exitFullscreen&&document.fullscreenElement&&document.exitFullscreen()}catch(_){}
 try{document.querySelectorAll('audio,video').forEach(a=>{a.pause();a.muted=true})}catch(_){}
 try{if(window.SFX&&SFX.mute)SFX.mute(true)}catch(_){}
 try{[...document.body.children].forEach(c=>{if(c!==box&&c.tagName!='SCRIPT')c.style.visibility='hidden'})}catch(_){}
 if(!spec){spec=true;tap.forEach(t=>window.addEventListener(t,kill,true));
  /* if the blocker is deleted in devtools, put it back and lock again */
  try{mo=new MutationObserver(()=>{if(locked&&(!box||!box.isConnected))lockUi('overlay removed');else if(locked&&box&&box.style.display=='none')box.style.display='flex'});mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class','hidden']})}catch(_){}
  setInterval(()=>{if(locked){lockUi('tick');try{document.exitPointerLock&&document.exitPointerLock()}catch(_){}}},700)}}
/* tell the owners (cheats/<uid>/<id>, owners-only read). Best effort, never throws. */
function report(why){try{if(typeof db=='undefined'||typeof user=='undefined'||!user)return;
 db.ref('cheats/'+user.uid).push({t:firebase.database.ServerValue.TIMESTAMP,r:String(why).slice(0,60),n:String(user.displayName||'').slice(0,40)}).catch(()=>{})}catch(_){}}
function trip(why,o){
 o=o||{};
 if(!locked){locked=true;try{sessionStorage.setItem(KEY,'1')}catch(_){}
  try{window.__acReason=String(why)}catch(_){}
  report(why);
  if(o.wipe){try{if(typeof cloud!='undefined')cloud.ready=false;if(typeof wipe=='function')wipe()}catch(_){}}
  console.error('%c[anti-cheat] locked: '+why,'color:#ff4d5e;font-weight:bold')}
 if(document.body)lockUi(why);else addEventListener('DOMContentLoaded',()=>lockUi(why));
 return false}
/* flag = softer than trip: log it to the owners and, if asked, reset this account's progress (local + cloud). NO lockdown. Used for impossible stats on a
   normal account, which is usually a victim of the earlier hack, not an attacker. */
let flagT=0;
function flag(why,o){if(Date.now()-flagT<30000)return;flagT=Date.now();report(why);
 if(o&&o.wipe){try{if(typeof wipe=='function')wipe();if(typeof EV!='undefined')EV.reload();if(typeof ui=='function')ui();if(typeof cloudPush=='function')cloudPush();if(typeof toast=='function')toast('Your progress was reset: impossible totals were found on this account')}catch(_){}}}
/* a previous lock in this tab still stands after a reload */
try{if(sessionStorage.getItem(KEY)==='1'){locked=true;if(document.body)lockUi('persisted');else addEventListener('DOMContentLoaded',()=>lockUi('persisted'))}}catch(_){}
/* console tampering flag: someone defining their own AC would not matter, so freeze ours */
return Object.freeze({trip,flag,locked:()=>locked})})();
Object.defineProperty(window,'AC',{value:AC_,writable:false,configurable:false});
