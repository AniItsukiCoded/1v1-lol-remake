/* ===== Settings: tabs + controller / mobile options =====
   Tabs (General, First Person, Crosshair, Controls, Controller, Mobile) just show / hide the existing groups.
   Controller options (CFG.play / pswap / pauto / pcrv / pads) are read by game.js; mobile options (CFG.tlay / tl / tsz / tso / tsens / tam / tswap) by js/touch.js. */
(()=>{
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const save=()=>{try{typeof saveLocal=='function'&&saveLocal()}catch(e){}},click=()=>{try{SFX.click()}catch(e){}};
const touchNow=()=>{try{window.touchLayout&&window.touchLayout()}catch(e){}};
/* ---------- tabs ---------- */
const tabs=all('#stabs button'),secs=all('.sset');
function showTab(k){if(!secs.some(s=>s.dataset.s===k))k='gen';tabs.forEach(b=>b.classList.toggle('on',b.dataset.s===k));secs.forEach(s=>s.classList.toggle('on',s.dataset.s===k));const pb=$('#settings .pb');if(pb)pb.scrollTop=0;CFG.stab=k;save()}
tabs.forEach(b=>b.onclick=()=>{click();showTab(b.dataset.s)});
showTab(CFG.stab||'gen');
/* ---------- small helpers ---------- */
function seg(id,key,def,parse,after){const g=$('#'+id);if(!g)return()=>{};const sy=()=>{const v=CFG[key]==null?def:CFG[key];g.querySelectorAll('button').forEach(b=>b.classList.toggle('on',String(parse(b.dataset.v))===String(parse(v))))};sy();
 g.onclick=e=>{const b=e.target.closest('button');if(!b)return;click();CFG[key]=parse(b.dataset.v);save();sy();after&&after(b.dataset.v)};return sy}
function tog(id,key,def){const e=$('#'+id);if(!e)return;e.checked=!!(CFG[key]==null?def:CFG[key]);e.onchange=()=>{CFG[key]=e.checked?1:0;save()}}
function sl(id,key,def,fmt,after){const e=$('#'+id),o=$('#'+id+'v');if(!e)return()=>{};const sy=()=>{const v=CFG[key]==null||!Number.isFinite(+CFG[key])?def:+CFG[key];e.value=v;if(o)o.textContent=fmt(v)};sy();e.oninput=()=>{CFG[key]=+e.value;if(o)o.textContent=fmt(+e.value);save();after&&after()};return sy}
/* ---------- controller ---------- */
const padRefresh=()=>{const pm=$('#padmap');if(pm&&window.INPUT)pm.innerHTML=INPUT.layout().map(([a,b])=>`<div class="pm"><span>${a}</span><b>${b}</b></div>`).join('')};
seg('playout','play',0,v=>+v,padRefresh);tog('pswap','pswap',0);$('#pswap')&&($('#pswap').onchange=()=>{CFG.pswap=$('#pswap').checked?1:0;save();padRefresh()});
tog('pauto','pauto',0);seg('pcrv','pcrv',1.45,v=>+v);sl('pads','pads',100,v=>Math.round(v)+'%');
/* ---------- mobile ---------- */
const DEF={fire:[91,76],jump:[92,50],aim:[80,82],rl:[82,62],bld:[88.5,9.5],sb:[81,9.5],pz:[95.5,9.5],wbar:[16,9.5],bq:[78,27],bot:[50,89]};
const NAMES={fire:'FIRE',jump:'JUMP',aim:'AIM',rl:'RELOAD',bld:'BUILD',sb:'SCORE',pz:'PAUSE',wbar:'WEAPONS',bq:'BUILD BAR',bot:'HEALTH + AMMO'};
const RND={fire:1,jump:1,aim:1,rl:1,bld:1,sb:1,pz:1};
const PRE={classic:null,left:{fire:[9,76],jump:[8,50],aim:[20,82],rl:[18,62],bld:[88.5,9.5],sb:[81,9.5],pz:[95.5,9.5],wbar:[16,9.5],bq:[78,27],bot:[50,89]},
 compact:Object.assign({},DEF,{fire:[93,74],jump:[93,52],aim:[85,85],rl:[86,65]})};
const clone=o=>JSON.parse(JSON.stringify(o));
const cur=()=>CFG.tlay&&CFG.tlay!=='classic'&&CFG.tl&&typeof CFG.tl=='object'?CFG.tl:DEF;
const posOf=k=>{const p=cur()[k];return p&&Number.isFinite(+p[0])&&Number.isFinite(+p[1])?[+p[0],+p[1]]:DEF[k]};
const led=$('#tled');
function tledRender(){if(!led)return;led.textContent='';
 for(const k in DEF){const c=document.createElement('div'),p=posOf(k);c.className='tc'+(RND[k]?' rd':'');c.dataset.k=k;c.textContent=NAMES[k];c.style.left=p[0]+'%';c.style.top=p[1]+'%';led.appendChild(c)}}
let drag=null;
if(led){led.addEventListener('pointerdown',e=>{const c=e.target.closest('.tc');if(!c)return;e.preventDefault();drag={c,id:e.pointerId};try{c.setPointerCapture(e.pointerId)}catch(_){}c.classList.add('dn')});
 led.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;e.preventDefault();const r=led.getBoundingClientRect(),x=Math.max(3,Math.min(97,(e.clientX-r.left)/r.width*100)),y=Math.max(4,Math.min(96,(e.clientY-r.top)/r.height*100));drag.c.style.left=x+'%';drag.c.style.top=y+'%';drag.x=x;drag.y=y});
 const end=e=>{if(!drag||e.pointerId!==drag.id)return;const{c,x,y}=drag;drag=null;c.classList.remove('dn');if(x==null)return;
  if(CFG.tlay!=='custom'||!CFG.tl||typeof CFG.tl!='object')CFG.tl=clone(cur());CFG.tlay='custom';CFG.tl[c.dataset.k]=[Math.round(x*10)/10,Math.round(y*10)/10];save();tlaySync();touchNow()};
 led.addEventListener('pointerup',end);led.addEventListener('pointercancel',end)}
const tlaySync=seg('tlay','tlay','classic',v=>String(v),v=>{if(v!=='custom'){CFG.tl=PRE[v]?clone(PRE[v]):null;CFG.tswap=v==='left'?1:0}else if(!CFG.tl)CFG.tl=clone(DEF);save();tledRender();touchNow();tswSync()});
const tswSync=()=>{const e=$('#tswap');if(e)e.checked=!!CFG.tswap};
tog('tswap','tswap',0);$('#tswap')&&($('#tswap').onchange=()=>{CFG.tswap=$('#tswap').checked?1:0;save()});
sl('tsz','tsz',100,v=>Math.round(v)+'%',touchNow);sl('tso','tso',100,v=>Math.round(v)+'%',touchNow);sl('tse','tsens',1,v=>(+v).toFixed(1)+'×');
seg('tam','tam','tap',v=>String(v));
const rs=$('#tlreset');if(rs)rs.onclick=()=>{click();CFG.tlay='classic';CFG.tl=null;CFG.tswap=0;CFG.tsz=100;CFG.tso=100;save();['tsz','tso'].forEach(i=>{$('#'+i).value=100;$('#'+i+'v').textContent='100%'});tlaySync();tswSync();tledRender();touchNow();if(window.toast)toast('HUD layout reset')};
tledRender();tswSync();
if(window.INPUT)INPUT.on(()=>{padRefresh()});
})();
