/* ================= LOCKER · SHOP · SKIN STUDIO =================
   LOCKER  : the whole catalogue (owned + locked) with search, category / rarity / ownership filters, sorting, clear OWNED / EQUIPPED / LOCKED
             states, and an inspect panel with a live 3D turntable (drag = rotate, wheel / pinch buttons = zoom, preview animations).
   SHOP    : the items sold for coins. Buying is a request to the server (price and ownership are checked there).
   STUDIO  : custom skins. A custom skin is still ONE number (the same number every other system already syncs):
               colour (24 bits) + accessory id (8 bits) + finish (3 bits) + pattern (3 bits)
             so other players see exactly what you built, old skins keep working unchanged, and nothing new has to be stored per match.
             Presets (name + number) are saved with your settings. The server checks the accessory belongs to a skin you own.
   Portraits in the grid are the cached thumbnails the game already makes (one at a time, reused); the only live 3D object is the single
   inspect / studio character, which is disposed when the locker closes (Game.studio).
   Opened through EV.locker(shop) -> LOCKER.open(tab, helpers).                                                                              */
const LOCKER=(()=>{
const STY=140737488355328,C24=16777216,MAXP=12;
const FIN=['Standard','Metallic','Chrome','Matte','Glow','Neon','Pearl','Shadow'],PAT=['None','Stripes','Pinstripe','Checker','Fade','Split','Dots','Camo'];
const SRC={start:'Starter colour',shop:'Shop · coins',bp:'LOL Pass reward',hw:'Halloween event',rk:'Ranked season reward'};
const SWATCH=[0xff4d5e,0xff8a3d,0xffd23f,0x8be04a,0x3ddc84,0x38f5c8,0x4da6ff,0x5b6cff,0xb36bff,0xff4dd2,0xffffff,0xb8c0d8,0x6b7391,0x2a2f45,0x8a5a2b,0x101018];
let H=null,tab='locker',sel=null,q='',cat='all',rar='all',ownF='all',sort='rarity',st=null,pIdx=-1,drag=null,wired=false,buying=false;
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const clampHex=v=>Math.max(0,Math.min(C24-1,v|0));
const pack=s=>clampHex(s.col)+(s.cos|0)*C24+((s.fin&7)+((s.pat&7)<<3))*STY;
const unpack=v=>{v=+v||0;const sty=Math.floor(v/STY)%64,b=v%4294967296;return{col:b%C24,cos:Math.floor(b/C24)%256,fin:sty&7,pat:sty>>3}};
const isCustom=v=>{v=+v||0;return Math.floor(v/STY)>0||!ITEM_V(v%4294967296)};
/* accessories you may use = "none" + the accessory of every skin you own */
function myCos(){const ids=new Set();ITEMS.forEach(x=>{if(x.k=='skin'&&x.cos&&H.own(x.v))ids.add(x.cos)});return COS.LIST.filter(c=>ids.has(c.id))}
/* ---- presets: validated on load so a broken / hand-edited entry can never crash the studio ---- */
function presets(){let a=CFG.presets;if(!Array.isArray(a))a=CFG.presets=[];
 CFG.presets=a.filter(p=>p&&typeof p.n=='string'&&Number.isSafeInteger(+p.v)&&+p.v>=0).slice(0,MAXP).map(p=>({n:cleanName(p.n),v:+p.v}));return CFG.presets}
const cleanName=n=>String(n||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,20)||'My skin';
const savePresets=()=>{try{saveCfg()}catch(e){}};

/* ---------------- shell ---------------- */
function shell(){const b=$('#lkbody');if(b.dataset.ok)return;b.dataset.ok=1;
 b.innerHTML=`<div class="lkmain"><div class="lkleft"><div class="lktools" id="lktools"><input id="lkq" placeholder="🔎 Search skins, colours, gun skins…" maxlength="30" autocomplete="off"><select id="lkrar" title="Rarity"></select><select id="lkown" title="Ownership"><option value="all">All items</option><option value="own">Owned</option><option value="lock">Locked</option></select><select id="lksort" title="Sort"><option value="rarity">Sort: rarity</option><option value="name">Sort: name</option><option value="kind">Sort: type</option><option value="new">Sort: newest</option></select></div><div id="lf" class="flt"></div><div id="sw"></div><div id="lkstudio"></div></div>
<aside class="lkside"><div class="lkview" id="lkview"><div class="lkhint">drag to rotate · scroll to zoom</div></div><div class="lkzoom"><button data-z="-.2" title="Zoom in">＋</button><button data-z=".2" title="Zoom out">－</button><button data-z="0" title="Reset view">⟲</button></div><div class="lkanim" id="lkanim"></div><div id="lkinfo"></div></aside></div>`;
 $('#lkrar').innerHTML='<option value="all">Any rarity</option>'+Object.keys(RAR).map(k=>`<option value="${k}">${RAR[k][0][0]+RAR[k][0].slice(1).toLowerCase()}</option>`).join('');
 $('#lkanim').innerHTML=[['idle','Idle'],['aim','Aim'],['sprint','Sprint'],['jump','Jump'],['emote','Emote']].map((a,i)=>`<button data-a="${a[0]}" class="${i?'':'on'}">${a[1]}</button>`).join('');
 if(wired)return;wired=true;
 $('#lkq').oninput=e=>{q=e.target.value.trim().toLowerCase();grid()};$('#lkq').onkeydown=e=>e.stopPropagation();
 $('#lkrar').onchange=e=>{rar=e.target.value;grid()};$('#lkown').onchange=e=>{ownF=e.target.value;grid()};$('#lksort').onchange=e=>{sort=e.target.value;grid()};
 $('#lf').onclick=e=>{const b=e.target.closest('.fc');if(b){SFX.click();cat=b.dataset.f;grid()}};
 $('#lkanim').onclick=e=>{const b=e.target.closest('button');if(!b)return;SFX.click();$('#lkanim').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));Game.studio.anim(b.dataset.a)};
 document.querySelector('.lkzoom').onclick=e=>{const b=e.target.closest('button');if(!b)return;SFX.click();+b.dataset.z?Game.studio.view(0,+b.dataset.z):Game.studio.reset()};
 const v=$('#lkview');v.addEventListener('pointerdown',e=>{drag={x:e.clientX};try{v.setPointerCapture(e.pointerId)}catch(_){}});
 v.addEventListener('pointermove',e=>{if(!drag)return;Game.studio.view((e.clientX-drag.x)*.012,0);drag.x=e.clientX});
 ['pointerup','pointercancel','pointerleave'].forEach(n=>v.addEventListener(n,()=>{drag=null}));
 v.addEventListener('wheel',e=>{e.preventDefault();Game.studio.view(0,e.deltaY>0?.12:-.12)},{passive:false});
 /* the viewer lives exactly as long as the locker is on screen */
 new MutationObserver(()=>{if(!$('#locker').classList.contains('on'))Game.studio.close()}).observe($('#locker'),{attributes:true,attributeFilter:['class']});
 $('#tL').onclick=()=>{SFX.click();open('locker')};$('#tS').onclick=()=>{SFX.click();open('shop')};$('#tC').onclick=()=>{SFX.click();open('studio')}}
function view(v){const el=$('#lkview');if(!Game.studio.open(el,v))el.classList.add('nogl')}

/* ---------------- catalogue ---------------- */
const CATS=[['all','ALL'],['skin','🧍 SKINS'],['color','🎨 COLOURS'],['gun','🔫 GUN SKINS'],['hw','🎃 HALLOWEEN'],['bp','⭐ PASS'],['rk','🏅 RANKED']];
function filtered(){let list=ITEMS.slice();const shop=tab=='shop';
 if(shop)list=list.filter(x=>x.price&&!H.own(x.v));
 else{if(cat!='all')list=list.filter(x=>['skin','color','gun'].includes(cat)?x.k==cat:x.src==cat);if(ownF!='all')list=list.filter(x=>H.own(x.v)==(ownF=='own'))}
 if(rar!='all')list=list.filter(x=>x.rar==rar);
 if(q)list=list.filter(x=>(H.inm(x)+' '+x.rar+' '+x.k+' '+(SRC[x.src]||'')).toLowerCase().includes(q));
 const idx=new Map(ITEMS.map((x,i)=>[x,i])),R=H.RO;
 list.sort((a,b)=>(shop?0:(H.eq(b)-H.eq(a))||(H.own(b.v)-H.own(a.v)))||(sort=='name'?H.inm(a).localeCompare(H.inm(b)):sort=='kind'?a.k.localeCompare(b.k)||R[a.rar]-R[b.rar]:sort=='new'?idx.get(b)-idx.get(a):R[a.rar]-R[b.rar]||H.inm(a).localeCompare(H.inm(b))));
 return list}
function grid(){const el=$('#sw'),shop=tab=='shop';el.textContent='';$('#lf').innerHTML=CATS.map(f=>`<button class="fc ${cat==f[0]?'on':''}" data-f="${f[0]}">${f[1]}</button>`).join('');$('#lf').style.display=shop?'none':'flex';$('#lkown').style.display=shop?'none':'';
 const list=filtered();
 if(shop&&H.on()){const n=h('button','cd evcard');n.style.gridColumn='1/-1';n.innerHTML='<span class="ic">🎃</span><b>Halloween skins &amp; gun skins are earned in the Event menu</b><span class="pr">OPEN</span>';n.onclick=()=>{SFX.click();$('#locker').classList.remove('on');H.openEvent('home')};el.appendChild(n)}
 const frag=document.createDocumentFragment();
 list.forEach(x=>{const own=H.own(x.v),eq=own&&H.eq(x),r=RAR[x.rar],b=h('button','cd r-'+x.rar+(eq?' sel':'')+(own||shop?'':' lk')+(sel===x?' cur':''));b.style.setProperty('--r',r[1]);
  b.innerHTML=H.swHtml(H.icol(x),x.k=='color'?'':H.icn(x),0,H.ival(x))+'<b></b><span class="pr"></span>'+`<small class="rt" style="color:${r[1]}">${r[0]}${x.k=='gun'?' · '+H.WS[x.w].toUpperCase():''}</small>`+(own||shop?'':'<i class="lkbadge">🔒</i>')+(eq?'<i class="lkbadge eq">✔</i>':'');
  b.querySelector('b').textContent=x.n;b.querySelector('.pr').textContent=shop?'🪙 '+H.fmt(x.price):eq?'EQUIPPED':own?'OWNED':'LOCKED';
  b.onclick=()=>{SFX.click();sel=x;el.querySelectorAll('.cd.cur').forEach(c=>c.classList.remove('cur'));b.classList.add('cur');info()};b.ondblclick=()=>{if(own&&!shop)doEquip(x)};frag.appendChild(b)});
 el.appendChild(frag);
 if(!list.length){const d=h('p','sub',shop&&!q&&rar=='all'?'You own every colour in the shop!':'Nothing matches — try another search or filter.');d.style.gridColumn='1/-1';el.appendChild(d)}
 if(!sel||!list.includes(sel)){sel=list.find(x=>H.own(x.v)&&H.eq(x)&&x.k!='gun')||list[0]||null}
 info();window.thumbFill&&thumbFill()}
function info(){const w=$('#lkinfo');w.textContent='';if(tab=='studio')return;const x=sel;if(!x){view(CFG.skin);return}
 const own=H.own(x.v),eq=own&&H.eq(x),shop=tab=='shop',r=RAR[x.rar];
 view(x.k=='gun'?(CFG.skin%4294967296)+GUN.pack([0,1,2].map(i=>i==x.w?x.gn:(CFG.gs[i]|0))):x.v);if(x.k=='gun')Game.studio.anim('aim');
 const t=h('div','lkname');t.appendChild(h('b',null,H.inm(x)));const tag=h('span','lkrar',r[0]);tag.style.background=r[1];t.appendChild(tag);w.appendChild(t);
 w.appendChild(h('p','sub',(x.k=='gun'?H.WS[x.w]+' skin':x.k=='skin'?'Outfit with accessory':'Body colour')+' · '+(SRC[x.src]||'Special')));
 w.appendChild(h('p','lkstate '+(eq?'eq':own?'own':'lock'),eq?'✔ Equipped':own?'✔ Owned':shop?'🪙 '+H.fmt(x.price)+' coins':'🔒 Locked — '+({shop:'buy it in the Shop',bp:'earn it in the LOL Pass',hw:'earn it in the Halloween event',rk:'earn it from a Ranked season'}[x.src]||'not available yet')));
 const b=h('button','btn '+(eq&&x.k!='gun'?'alt':''));
 if(shop){b.textContent='BUY · 🪙 '+H.fmt(x.price);b.onclick=()=>buy(x)}
 else if(!own){b.textContent=x.src=='shop'?'GO TO SHOP':x.src=='hw'&&H.on()?'OPEN EVENT':'LOCKED';b.disabled=!(x.src=='shop'||(x.src=='hw'&&H.on()));b.onclick=()=>{SFX.click();if(x.src=='shop')open('shop');else{$('#locker').classList.remove('on');H.openEvent('home')}}}
 else if(eq){b.textContent=x.k=='gun'?'UNEQUIP (stock '+H.WS[x.w].toLowerCase()+')':'EQUIPPED';b.disabled=x.k!='gun';b.onclick=()=>doEquip(x)}
 else{b.textContent='EQUIP';b.onclick=()=>doEquip(x)}
 w.appendChild(b);
 if(own&&x.k!='gun'&&!shop){const c=h('button','btn alt','🎨 CUSTOMISE IN STUDIO');c.onclick=()=>{SFX.click();st=unpack(x.v);pIdx=-1;open('studio')};w.appendChild(c)}}
function doEquip(x){SFX.click();const was=H.eq(x);H.equip(x);if(x.k=='gun'&&was)toast(x.n+' removed — stock '+H.WS[x.w].toLowerCase());else toast(H.inm(x)+' equipped');ui();grid();try{menu()}catch(e){}}
/* purchase confirmation: item, price and what is left afterwards. Confirming sends the request; the server checks price + balance again. */
function confirmBuy(x){return new Promise(res=>{let e=$('#buyc');if(!e){e=h('div');e.id='buyc';document.body.appendChild(e)}e.textContent='';const b=h('div','bx');b.appendChild(h('h3',null,'Buy '+x.n+'?'));const pr=h('div','pr2','🪙 '+H.fmt(x.price));b.appendChild(pr);
 b.appendChild(h('p',null,'You have '+H.fmt(CFG.coins)+' coins — '+H.fmt(CFG.coins-x.price)+' left after this purchase.'));const r=h('div','row'),n=h('button','btn alt','CANCEL'),y=h('button','btn','BUY');const done=v=>{e.classList.remove('on');res(v)};n.onclick=()=>{SFX.click();done(false)};y.onclick=()=>{SFX.click();done(true)};e.onclick=ev=>{if(ev.target===e)done(false)};r.append(n,y);b.appendChild(r);e.appendChild(b);e.classList.add('on')})}
async function buy(x){SFX.click();if(buying)return;if(!ECON.on())return toast('Sign in to buy items');if(CFG.coins<x.price)return toast('Not enough coins — you need '+H.fmt(x.price-CFG.coins)+' more');
 if(!(await confirmBuy(x)))return;
 buying=true;try{await ECON.act('buy',{item:x.id});SFX.claim&&SFX.claim();toast(x.n+' unlocked!');H.equip(x);sel=null;ui();open('locker');try{menu()}catch(e){}}catch(e){}finally{buying=false}}

/* ---------------- studio ---------------- */
function studio(){const w=$('#lkstudio');w.textContent='';if(!st)st=unpack(CFG.skin);const cos=myCos();if(st.cos&&!cos.some(c=>c.id==st.cos)&&!H.owner())st.cos=0;
 const sec=(t,sub)=>{const s=h('section','sts');const hd=h('h4',null,t);if(sub)hd.appendChild(h('small',null,sub));s.appendChild(hd);w.appendChild(s);return s};
 /* presets */
 const ps=sec('MY SKINS',presets().length+' / '+MAXP+' saved'),pr=h('div','stpre');
 presets().forEach((p,i)=>{const b=h('button','stp'+(i==pIdx?' on':''));const d=h('i');d.style.background=hx(p.v);b.append(d,h('span',null,p.n));b.title='Load "'+p.n+'"';b.onclick=()=>{SFX.click();st=unpack(p.v);pIdx=i;studio()};pr.appendChild(b)});
 if(!presets().length)pr.appendChild(h('p','sub','No saved skins yet. Build one below and press SAVE.'));ps.appendChild(pr);
 const nm_=h('input','stname');nm_.maxLength=20;nm_.placeholder='Skin name';nm_.value=pIdx>=0&&presets()[pIdx]?presets()[pIdx].n:'';nm_.onkeydown=e=>e.stopPropagation();
 const row=h('div','strow'),B=(t,c,f,title)=>{const b=h('button','btn '+c,t);if(title)b.title=title;b.onclick=()=>{SFX.click();f()};row.appendChild(b);return b};
 row.appendChild(nm_);
 B('SAVE','',()=>{const a=presets(),n=cleanName(nm_.value);if(pIdx>=0&&a[pIdx]){a[pIdx]={n,v:pack(st)};toast('Saved "'+n+'"')}else{if(a.length>=MAXP)return toast('You can keep '+MAXP+' custom skins — delete one first');a.push({n,v:pack(st)});pIdx=a.length-1;toast('Saved as "'+n+'"')}savePresets();studio()},'Save this look');
 B('DUPLICATE','alt',()=>{const a=presets();if(a.length>=MAXP)return toast('You can keep '+MAXP+' custom skins — delete one first');a.push({n:cleanName((nm_.value||'My skin')+' copy'),v:pack(st)});pIdx=a.length-1;savePresets();studio();toast('Duplicated')},'Save a copy as a new skin');
 B('NEW','alt',()=>{pIdx=-1;st={col:0x4da6ff,cos:0,fin:0,pat:0};studio()},'Start a new skin');
 B('RESET','alt',()=>{st=pIdx>=0&&presets()[pIdx]?unpack(presets()[pIdx].v):unpack(CFG.skin);studio();toast('Changes undone')},'Undo changes since the last save');
 if(pIdx>=0)B('DELETE','red',()=>{const a=presets(),p=a[pIdx];if(!p||!confirm('Delete "'+p.n+'"?'))return;a.splice(pIdx,1);pIdx=-1;savePresets();studio();toast('Deleted')},'Delete this saved skin');
 ps.appendChild(row);
 /* colour */
 const cs=sec('COLOUR'),cr=h('div','strow');const pick=h('input');pick.type='color';pick.value=hx(st.col);const hex=h('input','sthex');hex.maxLength=7;hex.value=hx(st.col).toUpperCase();hex.onkeydown=e=>e.stopPropagation();
 const setCol=(c,from)=>{st.col=clampHex(c);if(from!=pick)pick.value=hx(st.col);if(from!=hex)hex.value=hx(st.col).toUpperCase();hex.classList.remove('bad');live()};
 pick.oninput=()=>setCol(parseInt(pick.value.slice(1),16),pick);
 hex.oninput=()=>{const m=/^#?([0-9a-f]{6})$/i.exec(hex.value.trim());if(m)setCol(parseInt(m[1],16),hex);else hex.classList.add('bad')};
 const rnd=h('button','btn alt','🎲 RANDOM');rnd.onclick=()=>{SFX.click();setCol(Math.random()*C24|0)};cr.append(pick,hex,rnd);cs.appendChild(cr);
 const sw=h('div','stsw');SWATCH.forEach(c=>{const b=h('button');b.style.background=hx(c);b.title=hx(c).toUpperCase();b.onclick=()=>{SFX.click();setCol(c)};sw.appendChild(b)});cs.appendChild(sw);
 /* finish + pattern */
 const chips=(title,sub,names,key)=>{const s=sec(title,sub),c=h('div','stchips');names.forEach((n,i)=>{const b=h('button',st[key]==i?'on':'',n);b.onclick=()=>{SFX.click();st[key]=i;c.querySelectorAll('button').forEach((x,j)=>x.classList.toggle('on',j==i));live()};c.appendChild(b)})
  ;s.appendChild(c)};
 chips('MATERIAL','how the surface reacts to light',FIN,'fin');chips('PATTERN','painted over your colour',PAT,'pat');
 /* accessory */
 const as=sec('ACCESSORY',cos.length?'from the skins you own':'unlock skins to get accessories'),ag=h('div','stacc');
 [{id:0,n:'None',ico:'∅'}].concat(H.owner()?COS.LIST:cos).forEach(c=>{const b=h('button',st.cos==c.id?'on':'');b.append(h('i',null,c.ico||'★'),h('span',null,c.n));b.onclick=()=>{SFX.click();st.cos=c.id;ag.querySelectorAll('button').forEach(x=>x.classList.remove('on'));b.classList.add('on');live()};ag.appendChild(b)});as.appendChild(ag);
 live()}
function live(){const v=pack(st);view(v);const w=$('#lkinfo');w.textContent='';const cur=CFG.skin===v,c=st.cos?COS.info(st.cos):null;
 const t=h('div','lkname');t.appendChild(h('b',null,pIdx>=0&&presets()[pIdx]?presets()[pIdx].n:'Custom skin'));const tag=h('span','lkrar','CUSTOM');tag.style.background='#38f5c8';tag.style.color='#012';t.appendChild(tag);w.appendChild(t);
 w.appendChild(h('p','sub',hx(st.col).toUpperCase()+' · '+FIN[st.fin]+(st.pat?' · '+PAT[st.pat]:'')+(c?' · '+c.n:'')));
 const b=h('button','btn',cur?'EQUIPPED':'EQUIP THIS SKIN');b.disabled=cur;b.onclick=()=>equipCustom(v);w.appendChild(b);
 w.appendChild(h('p','sub','Other players see this skin exactly as you built it.'))}
async function equipCustom(v){SFX.click();if(!Number.isSafeInteger(v)||v<0)return toast('That skin is not valid');const old=CFG.skin;CFG.skin=v;saveLocal();live();
 if(ECON.on()){try{await ECON.act('equip',{skin:v,custom:1})}catch(e){live();return}} /* refused: ECON already put the real skin back */
 else if(unpack(v).cos){CFG.skin=old;live();return toast('Sign in to use accessories')}
 toast('Custom skin equipped');ui();live();try{menu()}catch(e){}}

function open(t,helpers){if(helpers)H=helpers;if(!H)return;tab=t||'locker';shell();
 $('#tL').classList.toggle('on',tab=='locker');$('#tS').classList.toggle('on',tab=='shop');$('#tC').classList.toggle('on',tab=='studio');
 const stu=tab=='studio';$('#lktools').style.display=stu?'none':'';$('#lf').style.display=stu?'none':'flex';$('#sw').style.display=stu?'none':'';$('#lkstudio').style.display=stu?'':'none';
 $('#locker').classList.add('on');
 if(stu){Game.studio.anim('idle');$('#lkanim').querySelectorAll('button').forEach((x,i)=>x.classList.toggle('on',!i));studio()}else{if(tab=='shop'&&sel&&(!sel.price||H.own(sel.v)))sel=null;grid()}}
return Object.freeze({open,pack,unpack,isCustom,FIN,PAT})})();
