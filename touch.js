/* ===== Touch / mobile controls =====
   window.TOUCH is true on phones & tablets (primary pointer is coarse). Force it with ?touch=1 or disable with ?touch=0.
   In a match: left half = floating move stick (push to the rim to sprint), right half = drag to look,
   buttons: FIRE (hold, can also drag to aim while firing), AIM (tap to toggle), JUMP, RELOAD, BUILD (shows the build bar), pause.
   Weapons use the weapon bar at the top (tap), build pieces use the build bar. Everything feeds Game.input (see js/game.js). */
(()=>{
const f=new URLSearchParams(location.search).get('touch');
const T=f==='1'?true:f==='0'?false:(matchMedia('(pointer:coarse)').matches||(navigator.maxTouchPoints>0&&!matchMedia('(any-pointer:fine)').matches));
window.TOUCH=T;if(!T)return;
document.body.classList.add('touch');
const hud=document.getElementById('hud'),G=()=>typeof Game!='undefined'?Game.input:null;
const ts=()=>{const v=window.CFG&&+CFG.tsens;return Number.isFinite(v)&&v>0?v:1}; /* touch look sensitivity (Settings > Mobile) */
const isStick=x=>window.CFG&&CFG.tswap?x>=innerWidth*.55:x<innerWidth*.45; /* left half = move stick (right half when 'swap sides' is on) */
const mk=(h,c,p)=>{const d=document.createElement('div');d.className=c;d.innerHTML=h;(p||hud).appendChild(d);return d};
const zone=mk('<div id="tbase"><div id="tknob"></div></div>','tzone');hud.insertBefore(zone,hud.firstChild);
const base=zone.querySelector('#tbase'),knob=zone.querySelector('#tknob');
/* ---- floating stick (left) + look (right) on one full-screen zone ---- */
let st=null,lk=null,R=58;
const stickEnd=()=>{st=null;base.style.display='none';G()&&G().move(0,0)};
zone.addEventListener('pointerdown',e=>{e.preventDefault();try{zone.setPointerCapture(e.pointerId)}catch(_){}
if(isStick(e.clientX)&&!st){R=Math.max(40,Math.min(62,innerHeight*.13));st={id:e.pointerId,x:e.clientX,y:e.clientY};base.style.cssText=`display:block;left:${e.clientX-R}px;top:${e.clientY-R}px;width:${R*2}px;height:${R*2}px`;knob.style.transform='translate(-50%,-50%)'}
else if(!isStick(e.clientX)&&!lk)lk={id:e.pointerId,x:e.clientX,y:e.clientY}});
zone.addEventListener('pointermove',e=>{e.preventDefault();
if(st&&e.pointerId===st.id){let dx=e.clientX-st.x,dy=e.clientY-st.y;const l=Math.hypot(dx,dy),m=Math.min(l,R*1.15);if(l>0){dx=dx/l*m;dy=dy/l*m}
knob.style.transform=`translate(calc(-50% + ${Math.max(-R,Math.min(R,dx))}px),calc(-50% + ${Math.max(-R,Math.min(R,dy))}px))`;
let x=dx/R,y=-dy/R;const mg=Math.hypot(x,y);if(mg<.12){x=y=0}else if(mg>1){x/=mg;y/=mg}G()&&G().move(x,y)}
else if(lk&&e.pointerId===lk.id){G()&&G().look((e.clientX-lk.x)*ts(),(e.clientY-lk.y)*ts());lk.x=e.clientX;lk.y=e.clientY}});
const zEnd=e=>{if(st&&e.pointerId===st.id)stickEnd();if(lk&&e.pointerId===lk.id)lk=null};
zone.addEventListener('pointerup',zEnd);zone.addEventListener('pointercancel',zEnd);
/* ---- buttons ---- */
function btn(id,label,cls,onDown,onUp,drag){const b=mk(label,'tb '+cls);b.id=id;let pid=null,px=0,py=0;
b.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();if(pid!==null)return;pid=e.pointerId;px=e.clientX;py=e.clientY;try{b.setPointerCapture(pid)}catch(_){}b.classList.add('dn');onDown&&onDown()});
b.addEventListener('pointermove',e=>{if(e.pointerId!==pid||!drag)return;e.preventDefault();G()&&G().look((e.clientX-px)*ts(),(e.clientY-py)*ts());px=e.clientX;py=e.clientY});
const end=e=>{if(e.pointerId!==pid)return;pid=null;b.classList.remove('dn');onUp&&onUp()};b.addEventListener('pointerup',end);b.addEventListener('pointercancel',end);return b}
btn('tfire','FIRE','fire',()=>G()&&G().down('shoot'),()=>G()&&G().up('shoot'),true);
btn('tjump','⤒','jump',()=>G()&&G().down('jump'),()=>G()&&G().up('jump'));
btn('taim','◎','aim',()=>{const g=G();if(!g)return;if(window.CFG&&CFG.tam==='hold')g.aimHold(1);else g.tapAim()},()=>{const g=G();if(g&&window.CFG&&CFG.tam==='hold')g.aimHold(0)});
btn('tcr','⤓','cr',()=>G()&&G().down('crouch'),()=>G()&&G().up('crouch'));
btn('trl','↻','rl',()=>G()&&G().down('reload'),()=>G()&&G().up('reload'));
btn('tbld','🧱','bld',()=>document.body.classList.toggle('bq'));
btn('tsb','🏆','sb',()=>G()&&G().down('score'),()=>G()&&G().up('score'));
btn('tpause','❚❚','pz',()=>G()&&G().pause());
/* ---- HUD layout (Settings > Mobile): button size / opacity and where every piece of the match screen sits. Positions are the CENTRE of each piece in % of the screen. ---- */
const LIDS={cr:'#tcr',fire:'#tfire',jump:'#tjump',aim:'#taim',rl:'#trl',bld:'#tbld',sb:'#tsb',pz:'#tpause',wbar:'#wbar',bq:'#bq',bot:'#bot'};
window.touchLayout=()=>{const C=window.CFG||{},b=document.body,L=C.tlay&&C.tlay!=='classic'&&C.tl&&typeof C.tl=='object'?C.tl:null;
 b.style.setProperty('--tsz',String((+C.tsz||100)/100));b.style.setProperty('--tso',String((+C.tso||100)/100));
 for(const k in LIDS){const e=document.querySelector(LIDS[k]);if(!e)continue;const p=L&&L[k];
  if(p&&Number.isFinite(+p[0])&&Number.isFinite(+p[1])){const S=(n,v)=>e.style.setProperty(n,v,'important');S('left',(+p[0])+'%');S('top',(+p[1])+'%');S('right','auto');S('bottom','auto');S('transform','translate(-50%,-50%)')}
  else['left','top','right','bottom','transform'].forEach(n=>e.style.removeProperty(n))}};
window.touchLayout();
/* page-level: no pinch/double-tap zoom, no scroll bounce, no long-press menu while playing */
addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>e.preventDefault());
let lt=0;document.addEventListener('touchend',e=>{const n=Date.now();if(n-lt<350&&hud.classList.contains('on'))e.preventDefault();lt=n},{passive:false});
/* Android: go fullscreen + landscape when a match starts (needs the tap on PLAY as the user gesture) */
window.touchEnter=()=>{try{const d=document.documentElement,rq=d.requestFullscreen||d.webkitRequestFullscreen;if(rq&&!document.fullscreenElement)Promise.resolve(rq.call(d)).catch(()=>{}).then(()=>screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape').catch(()=>{}))}catch(_){}};
})();
