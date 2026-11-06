/* ===== Settings v44: new tabs (Gameplay, Video, Audio), search, controller extras (aim assist + button remapping) =====
   Loaded after settings2.js. Everything here only writes CFG keys the game reads (see DEV_NOTES): crm slide adsm sprm bassist bturbo esens bdiff hitsnd
   antilag fpscap dynres fov3 cshake vmus vsfx aaim pb. All of them are device-local (saveLocal). */
(()=>{
const $=s=>document.querySelector(s),all=s=>[...document.querySelectorAll(s)];
const save=()=>{try{typeof saveLocal=='function'&&saveLocal()}catch(e){}},click=()=>{try{SFX.click()}catch(e){}};
const panel=$('#settings .pb'),tabsEl=$('#stabs');if(!panel||!tabsEl||!window.CFG)return;
const doneBtn=panel.querySelector(':scope > button.btn.close');
/* ---------- tiny control builders (HTML) + wiring ---------- */
const H={
 seg:(id,label,opts,hint)=>`<div class="row" data-q="${label} ${hint||''}"><span>${label}${hint?` <small style="opacity:.6">(${hint})</small>`:''}</span><div id="${id}" class="seg">${opts.map(([v,t])=>`<button data-v="${v}">${t}</button>`).join('')}</div></div>`,
 tog:(id,label,hint)=>`<div class="row" data-q="${label} ${hint||''}"><span>${label}${hint?` <small style="opacity:.6">(${hint})</small>`:''}</span><label class="tg"><input id="${id}" type="checkbox"><i></i></label></div>`,
 sl:(id,label,min,max,step,hint)=>`<div class="srow" data-q="${label} ${hint||''}"><span>${label}${hint?` <small style="opacity:.6">(${hint})</small>`:''}</span><output id="${id}v"></output><input id="${id}" type="range" min="${min}" max="${max}" step="${step}"></div>`,
 h3:t=>`<h3 data-q="${t}">${t}</h3>`,note:t=>`<p class="sub l">${t}</p>`};
function seg(id,key,def,parse,after){const g=$('#'+id);if(!g)return;const sy=()=>{const v=CFG[key]==null?def:CFG[key];g.querySelectorAll('button').forEach(b=>b.classList.toggle('on',String(parse(b.dataset.v))===String(parse(v))))};sy();g.onclick=e=>{const b=e.target.closest('button');if(!b)return;click();CFG[key]=parse(b.dataset.v);save();sy();after&&after()}}
function tog(id,key,def,after){const e=$('#'+id);if(!e)return;e.checked=!!(CFG[key]==null?def:CFG[key]);e.onchange=()=>{CFG[key]=e.checked?1:0;save();after&&after()}}
function sl(id,key,def,fmt,after){const e=$('#'+id),o=$('#'+id+'v');if(!e)return;const v0=CFG[key]==null||!Number.isFinite(+CFG[key])?def:+CFG[key];e.value=v0;if(o)o.textContent=fmt(v0);e.oninput=()=>{CFG[key]=+e.value;if(o)o.textContent=fmt(+e.value);save();after&&after()}}
const S=s=>String(s),N=Number;
/* ---------- sections ---------- */
function mk(key,html){const d=document.createElement('div');d.className='sset';d.dataset.s=key;d.innerHTML=html;panel.insertBefore(d,doneBtn);return d}
function tab(key,label,after){const b=document.createElement('button');b.dataset.s=key;b.textContent=label;const ref=tabsEl.querySelector(`[data-s="${after}"]`);tabsEl.insertBefore(b,ref?ref.nextSibling:null)}
const gp=mk('gp',
 H.h3('MOVEMENT')+
 H.seg('crmS','Crouch / slide key',[['hold','Hold'],['toggle','Toggle']],'default key E · controller R3 · rebind under Controls')+
 H.tog('slideT','Sliding','crouch while moving to slide, crouch while standing still to crouch')+
 H.seg('adsmS','Aim down sights',[['hold','Hold'],['toggle','Toggle']])+
 H.seg('sprmS','Sprint',[['hold','Hold'],['toggle','Toggle'],['auto','Auto']],'auto = sprint whenever you run forward')+
 H.h3('BUILDING')+
 H.tog('bassistT','Build assist','places pieces in the direction you are turning, so fast 90s and edits land where you aim')+
 H.tog('bturboT','Turbo building','faster piece placement rate')+
 H.sl('esens','Edit sensitivity',50,300,5,'turning speed while editing')+
 H.note('Quick-turn keys for 90s are under Controls → Building (unbound by default).')+
 H.h3('BOTS')+
 H.seg('bdiffS','Bot difficulty',[['adapt','Adaptive'],['easy','Easy'],['normal','Normal'],['hard','Hard'],['insane','Insane']],'bots only play 1v1 and aim like a person: no snapping')+
 H.h3('FEEDBACK')+
 H.tog('hitsndT','Hit sound','tick when you hit an enemy'));
const vid=mk('vid',
 H.h3('PERFORMANCE')+
 H.tog('antilagT','Anti-Lag','smoother frames and less network traffic. Picture quality stays exactly the same')+
 H.note('Anti-Lag: sends your position only when it changes, keeps rounds running while the tab is in the background, spreads work over frames and skips redundant updates. It never lowers graphics.')+
 H.seg('fpscapS','FPS limit',[[0,'Unlimited'],[60,'60'],[90,'90'],[120,'120'],[144,'144'],[240,'240']],'a limit can reduce heat and fan noise')+
 H.h3('CAMERA')+
 H.sl('fov3','Third-person field of view',60,110,1)+
 H.sl('cshake','Camera shake',0,200,10,'0 = none')+
 H.note('Graphics quality is in General. Every preset keeps the same picture, the lower ones just do less invisible work.'));
const aud=mk('aud',H.h3('VOLUME')+H.sl('vmus','Music volume',0,100,5)+H.sl('vsfx','Effects volume',0,100,5)+'<div id="audmv"></div>');
tab('gp','Gameplay','gen');tab('vid','Video','gp');tab('aud','Audio','vid');
/* master volume + music toggle live in the Audio tab */
{const host=$('#audmv'),v=$('#vol'),m=$('#mus');if(host&&v){const r=v.closest('.srow');r&&host.parentNode.insertBefore(r,host.parentNode.querySelector('h3').nextSibling)}if(host&&m){const r=m.closest('.row');r&&host.appendChild(r)}}
/* ---------- wiring ---------- */
seg('crmS','crm','hold',S);tog('slideT','slide',1);seg('adsmS','adsm','hold',S);seg('sprmS','sprm','hold',S);
tog('bassistT','bassist',1);tog('bturboT','bturbo',1);sl('esens','esens',100,v=>Math.round(v)+'%');seg('bdiffS','bdiff','adapt',S);tog('hitsndT','hitsnd',1);
tog('antilagT','antilag',1);seg('fpscapS','fpscap',0,N);sl('fov3','fov3',75,v=>Math.round(v)+'°');sl('cshake','cshake',100,v=>Math.round(v)+'%');
{const f=(k,e)=>{const el=$('#'+e);if(!el)return;const v=CFG[k]==null?1:+CFG[k];el.value=Math.round(v*100);const o=$('#'+e+'v');if(o)o.textContent=Math.round(v*100)+'%';el.oninput=()=>{CFG[k]=+el.value/100;if(o)o.textContent=el.value+'%';save()}};f('vmus','vmus');f('vsfx','vsfx')}
/* ---------- tabs: one switcher for every section ---------- */
function showTab(k){const secs=all('.sset');if(!secs.some(s=>s.dataset.s===k))k='gen';all('#stabs button').forEach(b=>b.classList.toggle('on',b.dataset.s===k));secs.forEach(s=>s.classList.toggle('on',s.dataset.s===k));panel.scrollTop=0;CFG.stab=k;save()}
all('#stabs button').forEach(b=>b.onclick=()=>{click();$('#ssearch')&&($('#ssearch').value='',search(''));showTab(b.dataset.s)});
showTab(CFG.stab||'gen');
/* ---------- search ---------- */
const sbox=document.createElement('input');sbox.id='ssearch';sbox.type='search';sbox.placeholder='🔍 Search settings…';sbox.autocomplete='off';panel.insertBefore(sbox,tabsEl);
function search(q){q=q.trim().toLowerCase();const on=!!q;$('#settings').classList.toggle('srch',on);
 all('.sset').forEach(sec=>{let any=false;sec.querySelectorAll('.row,.srow,h3,.sub').forEach(r=>{const t=(r.dataset.q||r.textContent).toLowerCase(),hit=!on||t.includes(q);r.style.display=hit?'':'none';if(hit&&on&&!/^H3$/.test(r.tagName)&&!r.classList.contains('sub'))any=true});
  if(!on)sec.style.display='';else sec.style.display=(any||sec.dataset.s=='kb'&&/control|key|bind/.test(q))?'block':'none'});
 if(!on)showTab(CFG.stab||'gen')}
sbox.oninput=()=>search(sbox.value);
/* ---------- controller extras ---------- */
const pad=$('.sset[data-s="pad"]'),pm=$('#padmap');
if(pad&&pm){const ex=document.createElement('div');ex.innerHTML=H.sl('aaim','Aim assist',0,100,5,'slows your aim a little while the crosshair is on an enemy. It never moves your aim for you')+
 H.h3('BUTTON REMAPPING')+H.note('Pick an action, then press the controller button you want for it. The two buttons swap, nothing is ever left unbound.')+'<div id="pbmap"></div><div class="row"><span></span><button id="pbreset" class="mini alt">RESET BUTTONS</button></div>';
 pad.insertBefore(ex,pm);sl('aaim','aaim',35,v=>Math.round(v)+'%');
 const ACT=[['Jump',0],['Reload',2],['Build mode',1],['Next weapon',3],['Cycle material',4],['Edit',5],['Aim down sights',6],['Fire',7],['Sprint',10],['Crouch / slide',11]];
 const FACE={xbox:['A','B','X','Y'],ps:['✕','○','□','△'],switch:['B','A','Y','X'],generic:['A','B','X','Y']},BN={xbox:{4:'LB',5:'RB',6:'LT',7:'RT',10:'L3',11:'R3'},ps:{4:'L1',5:'R1',6:'L2',7:'R2',10:'L3',11:'R3'},switch:{4:'L',5:'R',6:'ZL',7:'ZR',10:'L3',11:'R3'}};
 const lab=i=>{const t=(window.INPUT&&INPUT.type)||'xbox';return i<4?(FACE[t]||FACE.xbox)[i]:((BN[t]||BN.xbox)[i]||'B'+i)};
 const eff=p=>{const b=CFG.pb;if(b&&b[p]!=null&&Number.isFinite(+b[p]))return+b[p];return CFG.play==1?(p==0?4:p==4?0:p):p};
 const physOf=l=>{for(const p of [0,1,2,3,4,5,6,7,10,11])if(eff(p)===l)return p;return l};
 let cap=null;
 const draw=()=>{$('#pbmap').innerHTML=ACT.map(([n,l])=>`<div class="pm" data-l="${l}"><span>${n}</span><b>${cap===l?'press a button…':lab(physOf(l))}</b><button class="mini">${cap===l?'CANCEL':'CHANGE'}</button></div>`).join('')};
 const stop=()=>{cap=null;window.PADCAP=0;draw()};
 $('#pbmap').onclick=e=>{const b=e.target.closest('button');if(!b)return;click();const l=+b.parentNode.dataset.l;if(cap===l)return stop();cap=l;window.PADCAP=1;draw();listen(l)};
 function listen(l){const t0=performance.now();let prev=null;const tick=()=>{if(cap!==l)return;if(performance.now()-t0>8000)return stop();
  const g=(navigator.getGamepads?[...navigator.getGamepads()]:[]).find(x=>x&&x.connected);if(!g){requestAnimationFrame(tick);return}
  const cur=g.buttons.map(b=>b.pressed);if(prev){for(const p of [0,1,2,3,4,5,6,7,10,11])if(cur[p]&&!prev[p]){apply(p,l);return}}prev=cur;requestAnimationFrame(tick)};requestAnimationFrame(tick)}
 function apply(p,l){const old=eff(p),q=physOf(l);if(q===p)return stop();CFG.pb=Object.assign({},CFG.pb||{});for(const x of [0,1,2,3,4,5,6,7,10,11])CFG.pb[x]=eff(x);CFG.pb[p]=l;CFG.pb[q]=old;save();cap=null;setTimeout(()=>{window.PADCAP=0},250);draw()}
 $('#pbreset').onclick=()=>{click();CFG.pb=null;save();stop()};
 draw();if(window.INPUT&&INPUT.on)INPUT.on(()=>draw())}
})();
