/* ================= HALLOWEEN EVENT HUB (MM2 style), LOL PASS, LOCKER =================
   Loaded after main.js (uses its CFG, saveCfg, toast, ui, menu, hx, db, user, nm, SFX).  Data lives in events.js, outfits in cosmetics.js. */
const EV=(()=>{
let E,OWNER=false,KNOWN=false;const INF=999999999; /* OWNER = account is on the backend admin list (see admin.js): owns every skin, infinite coins/candy/keys, never on leaderboards */
const own=v=>OWNER||CFG.owned.includes(v);
/* make CFG safe to use (runs on load and again after an account save is loaded) */
function norm(){
CFG.ev=Object.assign({candy:0,tot:0,tier:0,keys:0,tday:'',streak:0,seen:0,d:{day:'',s:{},c:[]},dqDone:0,pq:[],ach:[],st:{},rk:0,lbT:0},CFG.ev||{});
['candy','tot','tier','keys','streak','dqDone','lbT'].forEach(k=>{if(!Number.isFinite(CFG.ev[k])||CFG.ev[k]<0)CFG.ev[k]=0});CFG.ev.tier=Math.min(30,Math.floor(CFG.ev.tier));
['pq','ach'].forEach(k=>{if(!Array.isArray(CFG.ev[k]))CFG.ev[k]=[]});if(!CFG.ev.dl||typeof CFG.ev.dl!='object')CFG.ev.dl={k:'',c:0};if(!CFG.ev.d||typeof CFG.ev.d!='object'||!CFG.ev.d.s||!Array.isArray(CFG.ev.d.c))CFG.ev.d={day:'',s:{},c:[]};
CFG.ev.st=Object.assign({gold:0,win:0,play:0,box:0},CFG.ev.st||{});if(!Array.isArray(CFG.owned))CFG.owned=[];
CFG.bp=Object.assign({xp:0,cf:[]},CFG.bp||{});if(!Number.isFinite(CFG.bp.xp)||CFG.bp.xp<0)CFG.bp.xp=0;if(!Array.isArray(CFG.bp.cf))CFG.bp.cf=[];
ITEMS.filter(x=>x.src=='start').forEach(x=>{if(!CFG.owned.includes(x.v))CFG.owned.push(x.v)});
/* equipped gun skins [shotgun, rifle, pickaxe]: 0 = stock; drop anything not owned */
if(!Array.isArray(CFG.gs))CFG.gs=[0,0,0];CFG.gs=[0,1,2].map(w=>{const n=CFG.gs[w]|0,it=ITEMS.find(x=>x.k=='gun'&&x.w==w&&x.gn==n);return it&&own(it.v)?n:0});
E=CFG.ev;fix()}
/* owners: keep coins / candy / keys topped up (shown as infinity). Accounts that stopped being owners lose the fake pile. */
function fix(){if(!E)return;if(OWNER){if(!(CFG.coins>=INF))CFG.coins=INF;if(!(E.candy>=INF))E.candy=INF;if(!(E.keys>=999))E.keys=999}
else if(KNOWN){if(CFG.coins>=INF/2)CFG.coins=0;if(E.candy>=INF/2)E.candy=0;if(E.keys>=999)E.keys=0}}
norm();
const Q=a=>document.querySelectorAll(a),on=()=>EVT.on(),fmt=n=>Math.round(n).toLocaleString();
const dot=(id,v)=>{const e=$(id);if(e)e.style.display=v?'block':'none'};
let matchCandy=0,matchPass=0,rvq=[],view='home',bn=1,lfs='all',rkTab='global',rkTimer=0;
const bpTier=()=>Math.min(30,Math.floor(CFG.bp.xp/PASSES.bp.per));
/* player skins/colours show a rendered portrait of the character (Game.thumb); guns/coins keep their icon */
const TGIF='data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
const swHtml=(col,ico,big,v)=>{const gun=String(ico).slice(0,4)=='<svg',ch=v!=null&&!gun,st=`--c:${col==null?'#ffc400':hx(col)}`;
if(ch){const u=Game.thumbCached(v);return`<div class="pv ch${big?' big':''}" style="${st}"><img alt="" draggable="false" data-sv="${v}" data-ico="${ico||''}" ${u?'data-done="1" ':''}src="${u||TGIF}"></div>`}
return`<div class="pv${big?' big':''}${gun?' gun':''}" style="${st}"><span class="pe">${ico}</span></div>`};
/* portrait thumbnails: each one builds a character and encodes a PNG on the main thread, so they are made one at a time, only in idle time,
   visible ones first, never during a match and never in a hidden tab (rendering them back-to-back used to freeze weak devices whenever a shop / pass opened) */
let thBusy=0;const thIdle=window.requestIdleCallback?f=>requestIdleCallback(f,{timeout:500}):f=>setTimeout(f,30),thGame=()=>window.Game&&Game.busy&&Game.busy();
function thFill(){if(thBusy)return;thBusy=1;const go=()=>{if(document.hidden||thGame()||!document.querySelector('#menu.on')){thBusy=0;setTimeout(thFill,1500);return}
const all=document.querySelectorAll('img[data-sv]:not([data-done])');if(!all.length){thBusy=0;return}
let im=null;for(const x of all)if(x.offsetParent){im=x;break}
const vis=!!im;if(!im)im=all[0];const v=im.dataset.sv,u=Game.thumb(v);
document.querySelectorAll('img[data-sv="'+v+'"]:not([data-done])').forEach(x=>{if(u){x.src=u;x.dataset.done=1}else{const e=document.createElement('span');e.className='pe';e.textContent=x.dataset.ico||'';x.parentNode.classList.remove('ch');x.replaceWith(e)}});
setTimeout(()=>thIdle(go),vis?40:1500)};setTimeout(()=>thIdle(go),0)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)thFill()});
/* was: a MutationObserver on the whole page that ran a selector query on every DOM change (every HUD / feed update in a match included). Now the menus that add portraits ask for a fill. */
let thQ=0;window.thumbFill=()=>{if(thQ)return;thQ=setTimeout(()=>{thQ=0;if(!thBusy)thFill()},60)};
['#locker','#bpm','#evm','#reveal','#party'].forEach(q=>{const e=document.querySelector(q);if(e)new MutationObserver(()=>window.thumbFill()).observe(e,{childList:true,subtree:true})});
const WS=['Shotgun','Rifle','Pickaxe'],icn=it=>it.k=='gun'?Game.gunIcon(it.w,it.g.c,0,it.g):it.ico,icol=it=>it.k=='gun'?it.col:it.v%16777216,ival=it=>it.k=='gun'?null:it.v,swI=(it,big)=>swHtml(icol(it),icn(it),big,ival(it)),inm=it=>it.k=='gun'?it.n+' '+WS[it.w]:it.n,
 kindOf=it=>it.k=='gun'?'NEW GUN SKIN':it.k=='skin'?'NEW SKIN':'NEW COLOR',eq=it=>it.k=='gun'?CFG.gs[it.w]==it.gn:CFG.skin==it.v;
/* equipping is shown at once and confirmed by the server (which checks you own the item); if it refuses, ECON puts the real loadout back */
function equip(it){if(it.k=='gun'){CFG.gs[it.w]=CFG.gs[it.w]==it.gn?0:it.gn;saveLocal();if(ECON.on())ECON.act('equip',{gun:it.w,n:CFG.gs[it.w]}).catch(()=>{})}else{CFG.skin=it.v;saveLocal();if(ECON.on())ECON.act('equip',{skin:it.v}).catch(()=>{})}}
/* true while a server request of this kind is running: stops double clicks from sending the same purchase twice */
const busy={};const once=async(k,f)=>{if(busy[k])return;busy[k]=1;try{return await f()}catch(e){}finally{busy[k]=0}};
const dur=m=>{m=Math.max(0,m);const d=Math.floor(m/864e5),h=Math.floor(m%864e5/36e5);return d?d+'d '+h+'h':h+'h '+Math.floor(m%36e5/6e4)+'m'},left=()=>dur(EVT.left()),closeLeft=()=>dur(EVT.end+7*864e5-Date.now()),open=()=>EVT.open();
const needOpen=()=>{if(!open()){toast('The event has ended');return false}return true},bump=(k,n)=>{E.st[k]=(E.st[k]||0)+n};
const utcKey=()=>new Date(now()).toISOString().slice(0,10),todayCandy=()=>E.dl.k==utcKey()?E.dl.c:0;
const dayKey=()=>utcKey(),nextReset=()=>864e5-(now()%864e5), /* days roll over at 00:00 UTC on the SERVER clock, the same clock the rewards server uses */
 hm=ms=>Math.floor(ms/36e5)+'h, '+Math.floor(ms%36e5/6e4)+'m';
function rollDay(){if(E.d.day!=dayKey())E.d={day:dayKey(),s:{},c:[]}}
const dstat=(k,n)=>{rollDay();E.d.s[k]=(E.d.s[k]||0)+n};
const dailyList=()=>DQ;

/* ---------- reveal popup ---------- */
function reveal(o){rvq.push(o);if(!$('#reveal').classList.contains('on'))nextReveal()}
function nextReveal(){const o=rvq.shift();if(!o){$('#reveal').classList.remove('on');return}
$('#rvk').textContent=o.kind||'NEW ITEM';$('#rvi').innerHTML=swHtml(o.col,o.ico,1,o.v);$('#rvn').textContent=o.name;const r=RAR[o.rar]||RAR.common;$('#rvr').textContent=o.sub||r[0];$('#rvr').style.color=r[1];$('#rvi').style.setProperty('--r',r[1]);
$('#rvok').textContent=o.btn||'NICE!';$('#reveal').dataset.go=o.go||'';$('#reveal').classList.add('on');SFX.claim()}
$('#rvok').onclick=()=>{SFX.click();const g=$('#reveal').dataset.go;nextReveal();if(g==='ev')openEvent('home')};
/* `got` = what the SERVER granted ([{k:'coins',n}|{k:'key',n}|{k:'candy',n}|{k:'item',id,dup}]). Returns a short text and shows the item popups (only epic+ when quiet).
   Nothing is added to a balance here: the new balance arrives with the server's answer (js/econ.js). */
function shown(got,quiet){return(got||[]).map(g=>{if(g.k=='coins')return g.n+' 🪙';if(g.k=='key')return g.n+' 🗝️';if(g.k=='candy')return fmt(g.n)+' 🍬';const it=ITEM(g.id);if(!it)return'';if(g.dup)return inm(it)+' (owned → '+g.dup+' 🪙)';
if(!quiet||['epic','legendary','mythic'].includes(it.rar))reveal({ico:icn(it),col:icol(it),v:ival(it),name:inm(it),rar:it.rar,kind:kindOf(it)});return inm(it)}).filter(Boolean).join(' + ')}
function art(rw,big){if(Array.isArray(rw))rw=rw[0];if(rw.k=='coins')return`<span class="ci">🪙</span>`;if(rw.k=='key')return`<span class="ci">🗝️</span>`;if(rw.k=='candy')return`<span class="ci">🍬</span>`;return swI(ITEM(rw.id),big)}
const rwName=rw=>Array.isArray(rw)?rw.map(rwName).join(' + '):rw.k=='coins'?fmt(rw.n)+' coins':rw.k=='candy'?fmt(rw.n)+' candy':rw.k=='key'?'Box Key'+(rw.n>1?' x'+rw.n:''):inm(ITEM(rw.id));
const rwRar=rw=>Array.isArray(rw)?rwRar(rw[0]):rw.k=='item'?ITEM(rw.id).rar:'common';

/* ---------- LOL PASS (levels, one free track) ---------- */
function bpClaimable(){let n=0;for(let i=0;i<bpTier();i++)if(!CFG.bp.cf.includes(i))n++;return n}
async function bpClaim(i){if(bpTier()<i+1||CFG.bp.cf.includes(i))return 0;try{const r=await ECON.act('bpClaim',{i});shown(r.res.got);return 1}catch(e){return 0}}
function renderBp(){const P=PASSES.bp,t=bpTier(),p=CFG.bp.xp,fr=t>=30?100:(p%P.per)/P.per*100;
$('#bpm .panel').className='panel pass';$('#bpt').textContent='⭐ LOL PASS';
let h=`<div class="phd"><div class="pt"><small>SEASON 1 · LEVEL PASS</small><div class="tt">TIER <b>${t}</b><span>/30</span></div></div><div class="xb big"><u style="width:${fr}%"></u><span>${t>=30?'MAX TIER':(p%P.per)+' / '+P.per+' XP'}</span></div>
<div class="pbtns"><button class="btn" id="pall" ${bpClaimable()?'':'disabled'}>CLAIM ALL${bpClaimable()?' ('+bpClaimable()+')':''}</button></div>
<p class="sub">Pass XP comes from <b>rounds</b>: every round you win is +${PASSXP.win} XP, every round you lose is +${PASSXP.loss} XP. Every ${P.per} XP unlocks the next tier — tap a glowing reward to claim it.</p></div><div class="ptrack" id="ptk">`;
for(let i=0;i<30;i++){const rw=P.free[i],got=CFG.bp.cf.includes(i),st=got?'got':t<i+1?'lock':'ready';
h+=`<div class="tier ${i<t?'rch':''}"><div class="tn">${i+1}</div><button class="rw ${st} r-${rwRar(rw)}" data-i="${i}">${art(rw)}<b>${rwName(rw)}</b><em>${got?'✓':st=='ready'?'CLAIM':''}</em></button></div>`}
$('#bpb2').innerHTML=h+'</div>';$('#cn3').textContent=OWNER?'∞':CFG.coins;$('#bpm').classList.add('on');const tk=$('#ptk');tk.scrollLeft=Math.max(0,t-2)*100;
$('#pall').onclick=()=>once('bp',async()=>{SFX.click();const n=bpClaimable(),r=await ECON.act('bpClaim',{all:1});shown(r.res.got,1);toast('Claimed '+n+' reward'+(n>1?'s':''));renderBp()})}
$('#bpb2').onclick=e=>{const b=e.target.closest('.rw');if(!b)return;SFX.click();if(b.classList.contains('lock'))return toast('Reach tier '+(+b.dataset.i+1)+' first');if(b.classList.contains('got'))return;once('bp',async()=>{if(await bpClaim(+b.dataset.i))renderBp()})};

/* ---------- locker / shop ---------- */
const RO={mythic:-1,legendary:0,epic:1,rare:2,common:3};
/* the locker / shop / skin studio live in js/locker2.js (LOCKER); it gets the helpers it needs from here */
function locker(shop){return LOCKER.open(shop?'shop':'locker',{own,eq,equip,swHtml,icn,icol,ival,inm,WS,RO,fmt,shown,owner:()=>OWNER,openEvent,on})}

/* ================= HALLOWEEN EVENT HUB ================= */
const nextCost=()=>E.tier>=30?0:tierCost(E.tier+1);
function buyCost(n){let c=0;for(let i=1;i<=n;i++)c+=tierCost(E.tier+i);return c}
function claimableQ(){rollDay();let n=0;dailyList().forEach(q=>q.st.forEach((s,i)=>{if((E.d.s[q.stat]||0)>=s&&!E.d.c.includes(q.id+':'+i))n++}));PQ.forEach(p=>{if(E.dqDone>=p.n&&!E.pq.includes(p.n))n++});return n}
const treatReady=()=>E.tday!=dayKey(),yest=()=>new Date(now()-864e5).toISOString().slice(0,10),liveStreak=()=>E.tday==dayKey()||E.tday==yest()?E.streak:0;
function openEvent(v){if(!open())return toast('The Halloween event has ended');view=v||'home';$('#evm').classList.add('on');renderEvent()}
function candyArt(n){return`<div class="cart"><span class="c1">🍬</span><span class="c2">🍭</span><span class="c3">🍬</span>${n!=null?`<i>x${fmt(n)}</i>`:''}</div>`}
function renderEvent(){rollDay();$('#cdy2').textContent=OWNER?'∞':fmt(E.candy);$('#evh').textContent=EVT.title;$('#evback').style.visibility=view=='home'?'hidden':'visible';const c=$('#evc');c.className='v-'+view;
if(view=='home'){const T=[['quests','📜','Quests',claimableQ()],['pass','⏩','Pass',E.candy>=nextCost()&&E.tier<30],['box','🧰','Box',E.keys>0],['treat','🍬','Treats',treatReady()],['exch','🪙','Exchange',E.candy>=100],['ranks','🏆','Ranks',EVT.ended()&&!E.rk],['goals','🏅','Goals',claimableG()],['coll','📖','Collection',0]];
c.innerHTML=`<div class="hhome"><div class="hbg"></div><div class="hfig"><div class="bub">Happy Halloween!</div><div class="pkh">🎃</div><div class="bdy"><i class="vest"></i><i class="belt"></i></div></div><div class="hinfo">${on()?`<small>EVENT ENDS IN</small><b>${left()}</b>`:`<small>EVENT ENDED · SHOP CLOSES IN</small><b>${closeLeft()}</b>`}<small>Pass tier ${E.tier}/30 · ${E.keys} 🗝️ · ${fmt(E.tot)} 🍬 collected</small></div></div>
<div class="htiles">${T.map(t=>`<button class="ht" data-v="${t[0]}"><span class="hti">${t[1]}</span><em>${t[2]}</em>${t[3]?'<s></s>':''}</button>`).join('')}</div>`}
else if(view=='quests')c.innerHTML=qView();
else if(view=='exch'){const n=Math.floor(E.candy/100);c.innerHTML=`<div class="exch"><div class="exa"><span>🍬</span><i>➜</i><span>🪙</span></div><h3>CANDY EXCHANGE</h3><p class="sub"><b>100 🍬 = 100 🪙</b> · spend coins in the Shop. (Pass tiers and boxes still cost candy.)</p><div class="exr">You have <b>${fmt(E.candy)}</b> 🍬 · <b>${fmt(CFG.coins)}</b> 🪙</div>
<div class="exb">${[1,5,10].map(k=>`<button class="btn" data-x="${k}" ${n>=k&&open()?'':'disabled'}>${fmt(k*100)} 🍬 ➜ ${fmt(k*100)} 🪙</button>`).join('')}<button class="btn alt" data-x="all" ${n>0&&open()?'':'disabled'}>EXCHANGE ALL${n?' ('+fmt(n*100)+' 🍬)':''}</button></div></div>`}
else if(view=='pass')c.innerHTML=passView();
else if(view=='final')c.innerHTML=finalView();
else if(view=='box')c.innerHTML=boxView();
else if(view=='treat'){const rd=treatReady(),st=liveStreak(),bon=(rd?Math.min(st,6):Math.min(E.streak,6))*10;c.innerHTML=`<div class="treat"><div class="tbox ${rd?'rdy':''}" id="tbox">🎁</div><h3>DAILY TREAT BOX</h3><p class="sub">Trick or treat! One free box every day — candy, coins, a Box Key… or a golden pumpkin jackpot.<br>🔥 Streak: <b>${st}</b> day${st==1?'':'s'} · ${rd?'opening now':'tomorrow'}: <b>+${bon}% bonus</b> (max +60% at a 7-day streak)</p><button class="btn" id="topen" ${rd&&open()?'':'disabled'}>${rd?(open()?'OPEN TREAT BOX':'EVENT ENDED'):'NEXT TREAT IN '+hm(nextReset())}</button><div id="tres"></div></div>`}
else if(view=='ranks'){c.innerHTML=ranksView();loadRanks()}
else if(view=='goals')c.innerHTML=goalsView();
else if(view=='coll'){const L=ITEMS.filter(x=>x.src=='hw'),n=L.filter(x=>own(x.v)).length;c.innerHTML=`<h3 class="sec">COLLECTION · ${n}/${L.length} <small>skins · colors · gun skins</small></h3><div class="grid" id="evg"></div>`;const g=$('#evg');
L.sort((a,b)=>RO[a.rar]-RO[b.rar]).forEach(x=>{const o=own(x.v),b=document.createElement('div'),r=RAR[x.rar];b.className='cd r-'+x.rar+(o?'':' lk');b.style.setProperty('--r',r[1]);b.innerHTML=swI(x)+'<b></b><small class="rt" style="color:'+r[1]+'">'+r[0]+(x.k=='gun'?' · '+WS[x.w].toUpperCase():'')+'</small>';b.querySelector('b').textContent=o?x.n:'???';g.appendChild(b)})}}

/* ----- quests view ----- */
function qView(){let h=`<div class="qh"><h3 class="sec">DAILY QUEST</h3><span>Refreshes in ${hm(nextReset())}</span></div>`;
dailyList().forEach(q=>{const v=E.d.s[q.stat]||0,mx=q.st[2],seg=[0,.1667,.5,.8333];let f=0;for(let i=0;i<3;i++){const a=i?q.st[i-1]:0;if(v>=q.st[i])f=seg[i+1];else{f=seg[i]+(seg[i+1]-seg[i])*(v-a)/(q.st[i]-a);break}}
h+=`<div class="qr"><div class="ql"><b>${q.n}</b><small>${q.ico} 3 stages</small></div><div class="qt">${q.st.map((s,i)=>{const k=q.id+':'+i,dn=E.d.c.includes(k),rd=v>=s&&!dn;return`<button class="qb ${dn?'dn':''} ${rd?'rd':''}" data-q="${k}">${candyArt(q.r[i])}<span>${dn?'Claimed ✓':rd?'CLAIM':'Win '+q.st[i]}</span></button>`}).join('')}</div>
<div class="qp"><div class="qf" style="width:${f*100}%"></div><div class="qv" style="left:${Math.max(4,f*100)}%">${Math.min(v,mx)}</div>${q.st.map((s,i)=>`<i style="left:${(i+.5)/3*100}%"></i><b style="left:${(i+.5)/3*100}%">${s}</b>`).join('')}</div></div>`});
const dn=E.dqDone,N=PQ.length,top=PQ[N-1].n,fe=Math.min(1,dn/top)*(1-.5/N)*100;h+=`<div class="qh"><h3 class="sec">EVENT QUEST</h3><span>Days completed: ${dn}</span></div><div class="qr"><div class="ql"><b>Finish the daily quest</b><small>1 per day</small></div><div class="qt" style="grid-template-columns:repeat(${N},1fr)">${PQ.map(p=>{const it=ITEM(p.id),cl=E.pq.includes(p.n),rd=dn>=p.n&&!cl;return`<button class="qb ${cl?'dn':''} ${rd?'rd':''}" data-p="${p.n}">${swI(it)}<span style="color:${RAR[it.rar][1]}">${cl?'Claimed ✓':rd?'CLAIM':it.n}</span></button>`}).join('')}</div>
<div class="qp"><div class="qf" style="width:${fe}%"></div><div class="qv" style="left:${Math.max(4,fe)}%">${Math.min(dn,top)}</div>${PQ.map((p,i)=>`<i style="left:${(i+.5)/N*100}%"></i><b style="left:${(i+.5)/N*100}%">${p.n}</b>`).join('')}</div></div>`;return h}

/* ----- pass view (buy tiers with candy) ----- */
function passView(){const t=E.tier;bn=Math.max(1,Math.min(bn,30-t||1));const P=PASSES.hw;let h=`<div class="pty">Your Tier: ${t}/30</div><div class="ptrack mmt" id="ptk">`;
for(let i=0;i<30;i++){const rw=P.free[i],r=i<t,nx=i==t,fin=i==29;h+=`<div class="mt ${r?'on':nx?'nx':''} ${fin?'fin':''}" data-t="${i+1}"><div class="mth ${fin?'view':''}">${fin&&!r?'View':i+1}</div><div class="mta ${fin&&!r?'sil':''}">${art(rw,1)}</div><div class="mtn r-${rwRar(rw)}">${fin&&!r?'???':rwName(rw)}</div><small>${fin?fmt(P.finalCost):fmt(P.tierCost)} 🍬</small></div>`}
const fin=t>=30,cost=fin?0:buyCost(bn);
h+=`</div><div class="buybar"><button class="bb" data-b="-10">-10</button><button class="bb" data-b="-1">-1</button><div class="bbm"><small>${fin?'MAX':bn+' Tier'+(bn>1?'s':'')}</small><b>${fin?'—':fmt(cost)+' 🍬'}</b></div><button class="bb buy" id="bbuy" ${fin?'disabled':''}>Buy</button><button class="bb" data-b="1">+1</button><button class="bb" data-b="10">+10</button></div>`;return h}
function finalView(){const P=PASSES.hw,rw=P.free[29],it=ITEM(rw.id),got=E.tier>=30;return`<div class="fv"><div class="fvb"><small>FINAL REWARD</small><div class="${got?'':'sil'}">${art(rw,1)}</div><div class="fvn" style="background:${RAR[it.rar][1]}">${got?it.n:'???'}</div></div><div class="fvp">${fmt(P.finalCost)} 🍬</div><p>${got?'Unlocked — you own the rarest skin of the event!':E.tier<29?'Complete the battle pass to unlock.':'Tier 29 reached — buy the final tier!'}</p>${!got&&E.tier>=29?'<button class="btn" id="fgo">GO TO PASS</button>':''}</div>`}
function buyTiers(){const n=bn;if(E.tier>=30)return;const c=buyCost(n);if(!needOpen())return;if(E.candy<c)return toast('Need '+fmt(c-E.candy)+' more 🍬');
once('hw',async()=>{const r=await ECON.act('hwBuy',{n}),got=shown(r.res.got,n>1).split(' + ');SFX.claim();if(n>1||!got[0].includes('owned'))toast('Tier '+r.res.tier+' unlocked · '+got.slice(0,3).join(', ')+(got.length>3?' …':''));bn=1;renderEvent();
setTimeout(()=>{const tk=$('#ptk');if(tk)tk.scrollLeft=Math.max(0,E.tier-2)*128},30)})}

/* ----- box view ----- */
function boxView(){const B=BOX;return`<div class="bx"><div class="bxl"><div class="bxart">🧰</div><div class="bxn">${B.name}</div><div class="bxc"><h4>Item Chances</h4>${B.tiers.map(t=>`<div style="color:${t[3]}"><b>${t[1]}:</b><span>${t[2]}%</span></div>`).join('')}</div></div>
<div class="bxr"><h3 class="sec">You will receive a random chance at… <small>(weapon skins only)</small></h3><div class="bxg">${B.tiers.flatMap(t=>t[5].map(id=>[id,t])).map(([id,t])=>{const it=ITEM(id);return`<div class="bxi"><div class="bxa">${swI(it)}</div><div class="bxb" style="background:${t[3]}">${inm(it)}</div></div>`}).join('')}</div>
<div class="bxbtn"><div class="bxs"><span>${E.keys} 🗝️</span><button ${E.keys>0&&open()?'':'disabled'} id="bkey">Use key</button></div><div class="bxs"><span>${fmt(B.cost)} 🍬</span><button ${E.candy>=B.cost&&open()?'':'disabled'} id="bcandy">Open</button></div></div></div></div>`}
/* the roll, the duplicate check and the refund all happen on the server; this only shows the result */
function openBox(useKey){const B=BOX;if(!needOpen())return;if(useKey){if(E.keys<1)return}else if(E.candy<B.cost)return toast('Need '+fmt(B.cost-E.candy)+' more 🍬');
once('box',async()=>{const r=(await ECON.act('box',{key:useKey?1:0})).res,it=ITEM(r.item);let sub=String(r.tier).toUpperCase();if(r.dup)sub+=' · DUPLICATE → +'+fmt(r.dup)+' 🍬';
reveal({ico:icn(it),col:icol(it),v:ival(it),name:inm(it),rar:it.rar,kind:'HALLOWEEN BOX',sub});renderEvent()})}

/* ----- goals (lifetime milestones) ----- */
const gv=s=>s=='tot'?E.tot:s=='dq'?E.dqDone:s=='tier'?E.tier:s=='own'?ITEMS.filter(x=>x.src=='hw'&&own(x.v)).length:(E.st[s]||0);
const claimableG=()=>ACH.filter(a=>!E.ach.includes(a.id)&&gv(a.stat)>=a.goal).length;
function goalsView(){const dn=ACH.filter(a=>E.ach.includes(a.id)).length;return`<h3 class="sec">GOALS · ${dn}/${ACH.length}</h3><div class="gl">${ACH.map(a=>{const v=Math.min(a.goal,gv(a.stat)),cl=E.ach.includes(a.id),rd=!cl&&v>=a.goal;
return`<div class="gr ${cl?'dn':''}"><div class="gm"><b>${a.n}</b><small>${a.d}</small><div class="gp"><div style="width:${v/a.goal*100}%"></div><span>${fmt(v)} / ${fmt(a.goal)}</span></div></div><button class="qb ${rd?'rd':''} ${cl?'dn':''}" data-g="${a.id}">${art(a.r)}<span>${cl?'Claimed ✓':rd?'CLAIM':rwName(a.r)}</span></button></div>`}).join('')}</div>`}

/* ----- ranks ----- */
/* the event leaderboard entry is written by the server when it pays out a match (the browser cannot write it any more) */
function syncLB(){return Promise.resolve()}
function fetchLB(f){f=f||'c';return new Promise((res,rej)=>{try{db.ref(EVT.lb+'/lb').orderByChild(f).limitToLast(50).once('value').then(s=>{const a=[];s.forEach(c=>{const v=c.val();if(v&&Number.isFinite(v[f])&&(f=='c'||v.dk==utcKey()))a.push(Object.assign({id:c.key,v:v[f]},v))});a.sort((x,y)=>(y.v-x.v)||String(x.n).localeCompare(String(y.n)));res(a)}).catch(rej)}catch(e){rej(e)}})}
const esc=t=>String(t==null?'':t).replace(/[<>&"']/g,'');
function ranksView(){const gl=rkTab!='rew';return`<div class="rkt"><button class="${rkTab=='global'?'on':''}" data-rk="global">🏆 Global</button><button class="${rkTab=='today'?'on':''}" data-rk="today">📅 Today</button><button class="${rkTab=='rew'?'on':''}" data-rk="rew">🎁 Rewards</button></div>`+(gl?`<div class="rkh"><b>${rkTab=='today'?'Today\'s top collectors (resets 00:00 UTC)':on()?'Leaderboards end in: '+left():'Final standings'}</b><small>Ranked by 🍬 collected — spending candy never lowers your score · updates every 20s</small></div><div id="rkl"><p class="sub">Loading…</p></div>`
:`<div class="rkh"><b>${EVT.ended()?(E.rk?'Reward claimed ✓':'The event is over — claim your reward!'):'Rewards are given when the event ends ('+left()+')'}</b><small>Your final rank decides your reward: exclusive rare skins &amp; gun skins (top 50 on the global board)</small></div><div class="rwl">${RANKREW.map(t=>`<div class="rwr"><b>${t.t}</b><div class="rwa">${t.r.map(r=>art(r)).join('')}</div><span>${rwName(t.r)}</span></div>`).join('')}</div><button class="btn" id="rkclaim" ${EVT.ended()&&!E.rk&&open()?'':'disabled'}>${E.rk?'CLAIMED':'CHECK MY RANK & CLAIM'}</button>`)}
function loadRanks(){if(rkTab=='rew')return;const tab=rkTab,td=tab=='today';syncLB(1).then(()=>fetchLB(td?'d':'c')).then(a=>{const box=$('#rkl');if(!box||view!='ranks'||rkTab!=tab)return;const me=a.findIndex(x=>user&&x.id==user.uid),mine=td?todayCandy():E.tot;
box.innerHTML=(a.length?a.map((x,i)=>`<div data-uid="${esc(x.id)}" data-n="${esc(x.n)}" class="rk r${i<3?i+1:0} ${user&&x.id==user.uid?'me':''}"><div class="rka" style="background:${hx(x.s||0x2f9bff)}"></div><div class="rkn"><b>#${i+1} - ${esc(x.n)||'Player'}</b><small>${fmt(x.v)} candies</small></div></div>`).join(''):'<p class="sub">No scores yet — collect candy in a match to be the first!</p>')+`<p class="sub">${me>=0?'You are #'+(me+1)+' with '+fmt(mine)+' candies':'Not in the top 50 yet — you have '+fmt(mine)+' candies'+(td?' today':'')}</p>`;try{ADM.lbTools(box,'c')}catch(e){}}).catch(()=>{const box=$('#rkl');if(box)box.innerHTML='<p class="sub">Leaderboard unavailable. Make sure database.rules.json was published in Firebase (see README).</p>'})}
function claimRank(){if(!EVT.ended())return toast('Rewards unlock when the event ends');if(E.rk)return toast('Already claimed');if(!needOpen())return;
once('rk',async()=>{const r=(await ECON.act('rankClaim')).res;if(!r.rank||!r.got){renderEvent();toast('You finished outside the top 50 — thanks for playing!');return}
reveal({kind:'RANK #'+r.rank+' REWARD',ico:'🏆',col:0xffd23f,name:r.tier,rar:'legendary',sub:shown(r.got,1),btn:'CLAIM'});renderEvent()})}
setInterval(()=>{if(view=='ranks'&&rkTab!='rew'&&$('#evm').classList.contains('on'))loadRanks()},20000);

/* ----- event delegation ----- */
$('#evback').onclick=()=>{SFX.click();view=view=='final'?'pass':'home';renderEvent()};$('#evplus').onclick=()=>{SFX.click();view='treat';renderEvent()};
$('#evc').onclick=e=>{const t=e.target,g=s=>t.closest(s);let b;
if(b=g('.ht')){SFX.click();view=b.dataset.v;renderEvent();return}
if(b=g('.qb[data-q]')){rollDay();if(!needOpen())return;const k=b.dataset.q,[id,i]=k.split(':'),q=DQ.find(x=>x.id==id);if(!q||E.d.c.includes(k)||(E.d.s[q.stat]||0)<q.st[+i])return;
once('q',async()=>{const r=(await ECON.act('quest',{q:k})).res;SFX.claim();toast('+'+r.candy+' 🍬');if(r.dayDone)toast('Daily quest complete! ('+r.dqDone+'/'+PQ[PQ.length-1].n+' days)');renderEvent()});return}
if(b=g('.qb[data-p]')){if(!needOpen())return;const p=PQ.find(x=>x.n==+b.dataset.p);if(!p||E.pq.includes(p.n)||E.dqDone<p.n)return;once('q',async()=>{shown((await ECON.act('pquest',{n:p.n})).res.got);renderEvent()});return}
if(b=g('[data-x]')){if(!needOpen())return;const n=b.dataset.x=='all'?Math.floor(E.candy/100):+b.dataset.x;if(n<1||E.candy<n*100)return;once('x',async()=>{const r=(await ECON.act('exchange',{n:b.dataset.x=='all'?'all':n})).res;SFX.claim();toast('+'+fmt(r.coins)+' 🪙');renderEvent()});return}
if(b=g('.bb[data-b]')){SFX.click();bn=Math.max(1,Math.min(30-E.tier,bn+(+b.dataset.b)));renderEvent();return}
if(g('#bbuy')){SFX.click();buyTiers();return}
if(b=g('.mt')){const n=+b.dataset.t;if(n==30&&E.tier<30){SFX.click();view='final';renderEvent();return}
if(n<=E.tier){const rw=PASSES.hw.free[n-1];if(rw.k=='item'){const it=ITEM(rw.id);if(own(it.v)){SFX.click();const was=eq(it);equip(it);ui();menu();toast(it.k=='gun'&&was?inm(it)+' removed':'Equipped '+inm(it))}}}return}
if(b=g('[data-g]')){if(!needOpen())return;const a=ACH.find(x=>x.id==b.dataset.g);if(!a||E.ach.includes(a.id)||gv(a.stat)<a.goal)return;once('g',async()=>{const m=shown((await ECON.act('goal',{g:a.id})).res.got);SFX.claim();toast('Goal complete: '+a.n+' · '+m);renderEvent()});return}
if(b=g('[data-rk]')){SFX.click();rkTab=b.dataset.rk;renderEvent();return}if(g('#rkclaim')){SFX.click();claimRank();return}
if(g('#fgo')){SFX.click();view='pass';renderEvent();return}
if(g('#bkey')){SFX.click();openBox(1);return}if(g('#bcandy')){SFX.click();openBox(0);return}
if(t.id=='topen'&&treatReady()&&needOpen()){SFX.spook();once('treat',async()=>{const r=(await ECON.act('treat')).res,ca=r.candy,co=r.coins,mu=r.mu;
let m={jackpot:'🎃 GOLDEN PUMPKIN JACKPOT!',key:'🗝️ A Box Key!',bag:'🛍 Big bag!',coins:'🪙 Shiny coins!',candy:'🍬 Candy!'}[r.kind]||'🍬';m+=(ca?' +'+fmt(ca)+' 🍬':'')+(co?' +'+co+' 🪙':'')+(mu>1?'  (streak ×'+mu.toFixed(1)+')':'');
renderEvent();const tr=$('#tres'),tb=$('#tbox');if(tr)tr.textContent=m;if(tb)tb.classList.add('pop')})}};
document.addEventListener('wheel',e=>{const tk=e.target.closest&&e.target.closest('.ptrack');if(tk&&Math.abs(e.deltaY)>Math.abs(e.deltaX)){tk.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false});

/* ---------- match hooks ----------
   During a match the game only COUNTS what happened (candy picked up, rounds won / lost). When the match ends main.js reports those counts to the
   server, which clamps them to what the mode allows and pays out. The numbers shown on the HUD / end screen are the same formulas the server uses. */
let matchGold=0,matchRW=0,matchRL=0;
function candy(v,gold){if(!on())return;matchCandy+=v;if(gold)matchGold++;const e=$('#cdm');e.textContent=fmt(matchCandy);e.parentNode.classList.remove('bump');void e.offsetWidth;e.parentNode.classList.add('bump')}
function matchStart(){matchCandy=0;matchPass=0;matchGold=0;matchRW=0;matchRL=0;$('#cdm').textContent=0;return on()}
/* LOL Pass XP comes from ROUNDS: called by the game at the end of every round */
function round(win){const x=win?PASSXP.win:PASSXP.loss;if(win)matchRW++;else matchRL++;matchPass+=x;if(user&&!user.isAnonymous)toast('⭐ +'+x+' LOL Pass XP')}
const matchTally=()=>({rw:matchRW,rl:matchRL,candy:Math.round(matchCandy),gold:matchGold});
function matchDone(r,gx){let s='  +'+matchPass+' ⭐ pass XP';if(on()){const b=CANDY.matchBonus+(r.win?CANDY.winBonus:0);s+='  +'+fmt(matchCandy+b)+' 🍬'}return s}
ECON.onMatch=(res)=>{if(res.dup)return;if(res.tierUp)toast('⭐ LOL Pass tier '+res.tier+' unlocked!')};

/* ---------- lobby widgets ---------- */
function refresh(){fix();rollDay();const t=bpTier(),live=open(),hwShow=live||E.tier>0||E.tot>0,nc=nextCost();
$('#pl').textContent=t;$('#pf').style.width=(t>=30?100:CFG.bp.xp%250/250*100)+'%';$('#hl').textContent=E.tier;$('#hf').style.width=(E.tier>=30?100:Math.min(1,E.candy/nc)*100)+'%';$('#cn3').textContent=CFG.coins;$('#cdy').textContent=fmt(E.candy);$('#cdy2').textContent=fmt(E.candy);
$('#hpass').style.display=hwShow?'flex':'none';$('#evb').style.display=live?'':'none';$('#candyc').style.display=live?'':'none';$('#evban').style.display=live?'flex':'none';
dot('#pdot',bpClaimable());dot('#bdot',bpClaimable());dot('#hdot',live&&E.tier<30&&E.candy>=nc);dot('#edot',live&&(treatReady()||claimableQ()>0||claimableG()>0||E.keys>0||(E.tier<30&&E.candy>=nc)||(EVT.ended()&&!E.rk)));
if(OWNER)['#cn','#cn2','#cn3','#cdy','#cdy2'].forEach(s=>{const e=$(s);if(e)e.textContent='∞'});$('#admb').style.display=OWNER?'':'none';
$('#evbt').textContent=on()?'HALLOWEEN EVENT':'EVENT ENDED';$('#evbl').textContent=on()?left():'shop closes in '+closeLeft();document.body.classList.toggle('hw',on())}
$('#lpass').onclick=$('#bpb').onclick=()=>{SFX.click();renderBp()};$('#hpass').onclick=()=>{SFX.click();openEvent('pass')};$('#evb').onclick=$('#evban').onclick=()=>{SFX.click();openEvent('home')};
setInterval(()=>{if(user)refresh()},30000);
function welcome(){if(on()&&!E.seen){E.seen=1;if(ECON.on())ECON.act('seen',{},{quiet:1}).catch(()=>{});reveal({kind:'🎃 EVENT STARTED',ico:'🎃',col:0xa030ff,name:EVT.title,rar:'mythic',sub:'Collect 🍬 · Quests · Spooky Pass · Boxes',btn:'SEE EVENT',go:'ev'})}}
/* ---------- admin / owner hooks (used by admin.js + main.js) ---------- */
/* token: admin.js hands EV a secret symbol once (bind). After that, setOwner / admin.* only run for the holder of that secret. Anyone calling them
   from the console gets the anti-cheat lockdown instead. */
let TOK=null;const bind=t=>{if(TOK===null&&typeof t=='symbol'){TOK=t;return true}return false},okTok=(t,w)=>(TOK!==null&&t===TOK)||(AC.trip('console call: EV.'+w),false);
function setOwner(b,known,t){if(!okTok(t,'setOwner'))return;OWNER=!!b;KNOWN=known!==false;fix();try{window.CTL&&CTL.refresh()}catch(_){}
saveCfg();refresh()}
/* (the old EV.admin.* hooks changed balances in the browser. Owner tools are server commands now: see functions/lib/owner.js and js/admin.js) */
return Object.freeze({on,ui:refresh,owner:()=>OWNER,setOwner,bind,locker,candy,round,matchStart,matchDone,matchTally,welcome,openEvent,shown,reveal,sync:()=>Promise.resolve(),reload:()=>{norm();rollDay();refresh()}})})();
