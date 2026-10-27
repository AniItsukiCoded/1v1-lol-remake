/* ================= ADMINS / OWNERS =================
   Who is an admin lives in the Firebase Realtime Database (backend), NOT in the code:

       fyusaugczduirdgyfdr / <the part of the email before the @>  =  1      (1 = admin, 0 or missing = not an admin)

   e.g.  jace01b@gmail.com  ->  fyusaugczduirdgyfdr/jace01b = 1.  Use lower case; dots and  # $ [ ] /  are dropped from the key
   (Firebase keys can't contain them), so  jace.01b@gmail.com  ->  "jace01b".
   Every admin is an owner: all skins, infinite coins / candy / keys, never shown on a leaderboard, plus the ADMIN button in the MAIN MENU
   (the panel can't be opened anywhere else and closes the moment you leave the menu).
   Loaded after passes.js (EV) and lobby2.js; main.js waits for it (see sess() in main.js). */
const ADM=(()=>{
const KEY='fyusaugczduirdgyfdr',CAP={c:1e7,o:1e7,k:1000};
const prefix=u=>{if(!u||u.isAnonymous)return'';const em=u.email||((u.providerData||[]).find(p=>p&&p.email)||{}).email||'';return String(em).split('@')[0].toLowerCase().replace(/[.#$\[\]\/]/g,'')};
const tmo=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
let pfx='';

/* ---- is this account on the backend list? (runs on every sign-in, BEFORE the cloud save loads so the owner perks apply to it) ---- */
async function check(u){let st=false,known=true;pfx='';
 try{pfx=prefix(u);if(pfx){const v=(await tmo(db.ref(KEY+'/'+pfx).once('value'),6000)).val();st=v===1||v===true||v==='1'}}
 catch(e){known=false;console.warn('Admin check failed (is database.rules.json published?):',e&&e.message)}
 EV.setOwner(st,known);if(!st)$('#admin').classList.remove('on');return st}

/* ---- gift inbox: gifts/<my uid>/<id> = {by,bn,t,candy?,coins?,keys?}. Claimed once (the gift is deleted first, then applied) ---- */
let gOff=null,seen=new Set(),pend=[],pt=0;
function listen(u){gOff&&gOff();gOff=null;seen=new Set();listenT(u);if(!u)return;const r=db.ref('gifts/'+u.uid);
 const h=r.on('child_added',s=>{const g=s.val(),id=s.key;if(!g||typeof g!='object'||seen.has(id))return;seen.add(id);
  s.ref.remove().then(()=>{const a=EV.admin.gift(g);pend.push({n:String(g.bn||'An admin').slice(0,24),a});clearTimeout(pt);pt=setTimeout(flush,600)},()=>{})},e=>console.warn('gift inbox unavailable:',e&&e.message));
 gOff=()=>r.off('child_added',h)}
function flush(){const p=pend;pend=[];if(!p.length)return;const t={c:0,o:0,k:0,x:0};p.forEach(x=>{t.c+=x.a.c;t.o+=x.a.o;t.k+=x.a.k;t.x+=x.a.x||0});
 const parts=[t.x?t.x.toLocaleString()+' ⭐ XP':'',t.c?t.c.toLocaleString()+' 🍬':'',t.o?t.o.toLocaleString()+' 🪙':'',t.k?t.k+' 🗝️':''].filter(Boolean).join(' + ');
 const who=[...new Set(p.map(x=>x.n))];toast('🎁 '+who.slice(0,2).join(' & ')+(who.length>2?' +'+(who.length-2):'')+' sent you '+(parts||'a gift')+'!');SFX.claim&&SFX.claim()}

/* ================= the panel (main menu only) ================= */
let tgt=null,busy=0;
const cl=(v,m)=>Math.max(0,Math.min(m,Math.floor(+v)||0));
function setTgt(t){tgt=t;$('#admto').textContent=!t?'nobody selected':t.all?'EVERYONE ONLINE':t.name+' ('+t.uid.slice(-4).toUpperCase()+')';
 document.querySelectorAll('#admlist .admp').forEach(b=>b.classList.toggle('on',!!t&&!t.all&&b.dataset.u==t.uid));$('#admall').classList.toggle('on',!!t&&!!t.all)}
function render(list,empty){const box=$('#admlist');box.innerHTML='';
 if(!list.length){const p=document.createElement('p');p.className='sub';p.textContent=empty;box.appendChild(p);return}
 list.forEach(x=>{const b=document.createElement('button');b.className='admp';b.dataset.u=x.uid;const n=document.createElement('b'),s=document.createElement('small');
  n.textContent=x.name;s.textContent='#'+x.uid.slice(-4).toUpperCase();b.append(n,s);b.onclick=()=>{SFX.click();setTgt({uid:x.uid,name:x.name})};box.appendChild(b)});setTgt(tgt)}
const nameOf=(uid,v)=>String(v||'Player').slice(0,24);
async function online(){const box=$('#admlist');box.innerHTML='<p class="sub">Loading online players…</p>';
 try{const s=await tmo(db.ref('presence').once('value'),8000),ids=Object.keys(s.val()||{}).filter(u=>!user||u!==user.uid).slice(0,40);
  const nm_=await Promise.all(ids.map(u=>db.ref('users/'+u+'/name').once('value').then(x=>x.val(),()=>null)));
  render(ids.map((u,i)=>({uid:u,name:nameOf(u,nm_[i])})),'Nobody else is online right now. Search a username to gift an offline player.')}
 catch(e){box.innerHTML='<p class="sub">Could not load players.</p>'}}
async function find(){const q=$('#admq').value.trim();if(!q)return online();const box=$('#admlist');box.innerHTML='<p class="sub">Searching…</p>';
 try{const s=await tmo(db.ref('users').orderByChild('name').startAt(q).endAt(q+'').limitToFirst(15).once('value'),8000),a=[];
  s.forEach(c=>{const v=c.val();if(v&&v.name&&(!user||c.key!==user.uid))a.push({uid:c.key,name:nameOf(c.key,v.name)})});
  render(a,'No player found whose username starts with "'+q+'" (case sensitive).')}
 catch(e){box.innerHTML='<p class="sub">Search unavailable — publish the new database.rules.json (users index on "name").</p>'}}
const sumTxt=x=>[x.x?x.x.toLocaleString()+' ⭐':'',x.c?x.c.toLocaleString()+' 🍬'+(x.c&&!x.rank?' (not ranked)':''):'',x.o?x.o.toLocaleString()+' 🪙':'',x.k?x.k+' 🗝️':''].filter(Boolean).join(' + ');
/* hand out a gift. t = {me:1} | {all:1} | {uid,name}.  x = {x:xp, c:candy, o:coins, k:keys, rank:true|false}  rank = the candy also counts for the leaderboard / goals */
async function giveTo(t,x){
 if(t.me){EV.admin.gift({candy:x.c,coins:x.o,keys:x.k,xp:x.x,rank:x.rank});SFX.claim&&SFX.claim();toast('🎁 Gave yourself '+sumTxt(x));return 1}
 let ids;if(t.all){const s=await tmo(db.ref('presence').once('value'),8000);ids=Object.keys(s.val()||{}).filter(u=>u!==user.uid).slice(0,200)}else ids=[t.uid];
 if(!ids.length){toast('Nobody else is online');return 0}
 const g={by:user.uid,bn:nm().slice(0,24),t:firebase.database.ServerValue.TIMESTAMP};if(x.c){g.candy=x.c;g.rank=!!x.rank}if(x.o)g.coins=x.o;if(x.k)g.keys=x.k;if(x.x)g.xp=x.x;
 const r=await Promise.all(ids.map(u=>db.ref('gifts/'+u).push().set(g).then(()=>1,()=>0))),n=r.reduce((p,q)=>p+q,0);
 if(n){SFX.claim&&SFX.claim();toast('🎁 Gift sent to '+(t.all?n+' player'+(n==1?'':'s'):t.name)+'  ('+sumTxt(x)+')')}else toast('Could not send — publish the new database.rules.json first');return n}
const readAmt=(c,o,k,x)=>({c:cl($(c).value,CAP.c),o:cl($(o).value,CAP.o),k:cl($(k).value,CAP.k),x:cl($(x).value,1e7)});
async function send(){if(!EV.owner()||busy)return;if(!tgt)return toast('Pick who gets the gift first');
 const a=readAmt('#admc','#admo','#admk','#admx');a.rank=$('#admrk').checked;if(!(a.c||a.o||a.k||a.x))return toast('Enter an amount to give');
 busy=1;const btn=$('#admsend');btn.disabled=true;try{await giveTo(tgt,a)}catch(e){toast('Could not send the gift')}finally{busy=0;btn.disabled=false}}

$('#admb').onclick=()=>{if(!EV.owner())return;SFX.click();$('#admwho').textContent='Signed in as '+nm()+' · admin key: '+KEY+'/'+pfx;$('#admin').classList.add('on');online()};
$('#admref').onclick=()=>{SFX.click();$('#admq').value='';online()};
$('#admall').onclick=()=>{SFX.click();setTgt({all:1})};
$('#admfind').onclick=()=>{SFX.click();find()};$('#admq').onkeydown=e=>{if(e.key=='Enter')find()};
$('#admsend').onclick=()=>{SFX.click();send()};
const tool=(btn,inp,fn,msg)=>{$(btn).onclick=()=>{if(!EV.owner())return;SFX.click();fn(inp?+$(inp).value:0);toast(msg(inp?+$(inp).value:0))}};
tool('#admlolb','#admlol',v=>EV.admin.setLol(v),v=>'LOL Pass tier set to '+cl(v,30));
tool('#admspkb','#admspk',v=>EV.admin.setSpooky(v),v=>'Spooky Pass tier set to '+cl(v,30));
tool('#admxpb','#admxp',v=>EV.admin.addXp(v),v=>'+'+cl(v,1e7).toLocaleString()+' XP');
tool('#admrd',null,()=>EV.admin.resetDaily(),()=>'Daily reward, treat & quests reset');

/* ================= in-game admin menu (default key Y, owners only) =================
   In-match tools only (gifts live in the main-menu ADMIN panel). Works in every match (bots, aim trainer and real players), owners only.
   Settings are saved in this browser (localStorage 'arena_admin_cfg_v1'). TROLL PLAYERS sends a command through Firebase  trolls/<uid>/<id>;
   the rules only let uids listed under ownerUids/<uid>=true write there and the victim's client applies it (owners are immune).  FLY: Space = up, Crouch = down, Sprint = faster. */
let gp=null,gbadge=null;
const gOpen=()=>!!gp&&gp.classList.contains('on');
/* toggles: [key, label, hint] */
const GROUPS=[
 ['AIM',[['silent','🎯 SILENT AIM','shots curve to the nearest enemy'],['auto','🔫 AUTO SHOOT','fires when an enemy is on target'],['hs','💀 ALWAYS HEADSHOT','every hit counts as a headshot'],['wb','🧱 WALLBANG','bullets ignore walls']],
  [['aim','AIMBOT (hold aim / right-click)',[[0,'OFF'],[1,'SMOOTH'],[2,'SNAP']]],['head','AIM AT',[[0,'BODY'],[1,'HEAD']]]]],
 ['GUN',[['ammo','♾️ INF AMMO','never reload, mag always full'],['rapid','⚡ RAPID FIRE','every gun full-auto, super fast'],['norec','🎛️ NO RECOIL / SPREAD','laser-straight bullets'],['ikill','☠️ ONE-HIT KILL','bots die in one shot'],['mats','🧱 INF MATERIALS','build forever']],[]],
 ['PLAYER',[['god','🛡️ GOD MODE','no damage at all'],['fly','🕊️ FLY','Space up · Crouch down'],['nc','👻 NOCLIP','walk through walls']],
  [['spd','MOVE SPEED',[[1,'x1'],[2,'x2'],[3,'x3'],[5,'x5']]],['jmp','JUMP HEIGHT',[[1,'x1'],[2,'x2'],[3,'x3']]],['grav','GRAVITY',[[1,'NORMAL'],[.5,'LOW'],[.25,'MOON'],[.08,'SPACE']]]]],
 ['TROLL',[['esp','👁️ WALLHACK','see enemies through walls'],['freeze','🧊 FREEZE BOTS','bots stop moving & shooting']],[]]
];
const TROLLS=[['freeze','🧊 FREEZE','can\'t move · 5s'],['fling','🚀 FLING','launch into the air'],['spin','🌀 SPIN','camera spins · 4s'],['drunk','🥴 DRUNK','wobbly aim · 8s'],['shake','📳 SHAKE','screen shake · 5s'],['blind','🕶️ BLIND','black screen · 3s'],['rev','🔀 REVERSE','controls flipped · 8s'],['slow','🐌 SLOW','crawl speed · 8s'],['disarm','🚫 DISARM','can\'t shoot · 6s'],['hop','🐇 BUNNY','forced jumping · 6s'],['slap','👋 SLAP','-20 HP (never kills)'],['tp','📍 BRING','teleports to you'],['scare','👻 SCARE','jumpscare']];
const TROLL_D={freeze:5,spin:4,drunk:8,shake:5,blind:3,rev:8,slow:8,disarm:6,hop:6};
let gtt=null; /* troll target: {uid,name} | {all:1} */
const TOGS=[].concat(...GROUPS.map(g=>g[1]));
function gBuild(){gp=document.createElement('div');gp.id='gadm';
 let h='<div class="gh"><b>🛠 ADMIN</b><small>press Y to close</small><button type="button" data-a="x">✕</button></div><p class="gnote" hidden>Admin tools only work inside a match.</p>';
 GROUPS.forEach(g=>{h+='<div class="gs">'+g[0]+'</div><div class="gsw">'+g[1].map(t=>'<button type="button" data-k="'+t[0]+'"><b>'+t[1]+'</b><small>'+t[2]+'</small></button>').join('')+'</div>';
  g[2].forEach(sg=>{h+='<div class="gs2">'+sg[1]+'</div><div class="gtg">'+sg[2].map(o=>'<button type="button" data-sk="'+sg[0]+'" data-sv="'+o[0]+'">'+o[1]+'</button>').join('')+'</div>'})});
 h+='<div class="gs">TROLL PLAYERS <small>real players in this match · owners are immune</small></div><div class="gtg gpl"></div><div class="gtg"><button type="button" data-tt="all">EVERYONE</button></div><div class="gsw gtr">'+TROLLS.map(t=>'<button type="button" data-tr="'+t[0]+'"><b>'+t[1]+'</b><small>'+t[2]+'</small></button>').join('')+'</div>';
 h+='<div class="gs">BOT ACTIONS <small>bot matches only</small></div><div class="gtg2"><button type="button" class="gtool" data-a="kill">☠️ KILL ALL BOTS</button><button type="button" class="gtool" data-a="bring">🧲 BRING BOTS TO ME</button><button type="button" class="gtool" data-a="tp">🌀 TELEPORT TO A BOT</button></div>'+
  '<div class="gs">QUICK</div><button type="button" class="gtool" data-a="refill">❤️ REFILL HP + MATERIALS</button><button type="button" class="gtool goff" data-a="reset">↺ TURN EVERYTHING OFF</button><button type="button" class="gtool goff" data-a="uid">📋 COPY MY UID (for Firebase ownerUids)</button>';
 gp.innerHTML=h;document.body.appendChild(gp);
 gp.addEventListener('keydown',e=>{e.stopPropagation();if(e.code=='Escape'||(CTL.acts(e.code)||[]).includes('admin')){e.preventDefault();gClose()}},true);
 gp.addEventListener('keyup',e=>e.stopPropagation(),true);
 gp.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;SFX.click();
  const st=Game.adminState();
  if(b.dataset.a=='x')return gClose();
  if(!st.practice)return toast('Admin tools only work for owners inside a match');
  if(b.dataset.tt){gtt={all:1};return gMark()}
  if(b.dataset.u){gtt={uid:b.dataset.u,name:b.textContent};return gMark()}
  if(b.dataset.tr){trollSend(b.dataset.tr);return}
  if(b.dataset.k){const k=b.dataset.k;Game.adminSet(k,st[k]?0:1);toast(TOGS.find(t=>t[0]==k)[1]+(st[k]?' off':' on'))}
  else if(b.dataset.sk){Game.adminSet(b.dataset.sk,+b.dataset.sv);toast(b.textContent+' set')}
  else if(b.dataset.a=='uid'){try{navigator.clipboard.writeText(user.uid);toast('UID copied: '+user.uid)}catch(_){toast('UID: '+user.uid)}}
  else if(b.dataset.a=='refill')toast(Game.adminRefill()?'Refilled HP and materials':'Refill failed');
  else if(b.dataset.a=='reset'){TOGS.forEach(t=>Game.adminSet(t[0],0));Game.adminSet('aim',0);Game.adminSet('head',1);Game.adminSet('spd',1);Game.adminSet('jmp',1);Game.adminSet('grav',1);toast('All admin tools off')}
  else{const n=Game.adminAct(b.dataset.a);toast(!n?'No bots in this match':(b.dataset.a=='kill'?'☠️ Eliminated '+n+' bot'+(n==1?'':'s'):b.dataset.a=='bring'?'🧲 Pulled '+n+' bot'+(n==1?'':'s')+' to you':'🌀 Teleported'))}
  gSync()})}
/* highlight what is on + a small badge so you can still see it with the menu closed */
function gSync(){if(typeof Game=='undefined')return;const st=Game.adminState(),on=TOGS.filter(t=>st[t[0]]).map(t=>t[1].split(' ').slice(1).join(' '));
 if(st.aim)on.unshift(st.aim==2?'AIMBOT SNAP':'AIMBOT');if(st.spd>1)on.push('SPEED x'+st.spd);if(st.jmp>1)on.push('JUMP x'+st.jmp);if(st.grav<1)on.push('LOW GRAV');
 if(gp){gp.querySelectorAll('[data-k]').forEach(b=>b.classList.toggle('on',!!st[b.dataset.k]));gp.querySelectorAll('[data-sk]').forEach(b=>b.classList.toggle('on',+b.dataset.sv==st[b.dataset.sk]));gp.querySelector('.gnote').hidden=st.practice}
 const show=st.practice&&on.length&&EV.owner()&&Game.busy();
 if(show&&!gbadge){gbadge=document.createElement('div');gbadge.id='gadmb';document.body.appendChild(gbadge)}
 if(gbadge){gbadge.style.display=show?'block':'none';if(show)gbadge.textContent='🛠 '+on.join(' · ')}}
function gMark(){if(!gp)return;gp.querySelectorAll('[data-tt]').forEach(b=>b.classList.toggle('on',!!(gtt&&gtt.all)));gp.querySelectorAll('.gpl [data-u]').forEach(b=>b.classList.toggle('on',!!(gtt&&gtt.uid===b.dataset.u)))}
function gPlayers(){const box=gp.querySelector('.gpl');box.textContent='';let l=[];try{l=Game.players().filter(p=>!user||p.uid!==user.uid)}catch(_){}
 if(!l.length){const i=document.createElement('small');i.textContent='No other real players in this match';i.style.opacity='.6';box.appendChild(i)}
 l.slice(0,14).forEach(p=>{const b=document.createElement('button');b.type='button';b.dataset.u=p.uid;b.textContent=String(p.name||'Player').slice(0,18);box.appendChild(b)});
 if(gtt&&gtt.uid&&!l.some(p=>p.uid===gtt.uid))gtt=null;gMark()}
/* send a troll command to the picked player (or everyone) through Firebase: trolls/<their uid>/<id>. The database rules only accept it from owners. */
async function trollSend(kind){if(!EV.owner()||!user)return;if(!gtt)return toast('Pick a player (or EVERYONE) first');
 let ids;try{ids=gtt.all?Game.players().map(p=>p.uid).filter(u=>u!==user.uid).slice(0,40):[gtt.uid]}catch(_){ids=[]}
 if(!ids.length)return toast('No other real players in this match');
 const c={by:user.uid,bn:nm().slice(0,24),t:firebase.database.ServerValue.TIMESTAMP,k:kind};if(TROLL_D[kind])c.d=TROLL_D[kind];
 if(kind=='tp'){const q=Game.adminPos();c.x=q.x;c.y=q.y;c.z=q.z}
 const r=await Promise.all(ids.map(u=>db.ref('trolls/'+u).push().set(c).then(()=>1,()=>0))),n=r.reduce((a,b)=>a+b,0);
 toast(n?'😈 '+TROLLS.find(t=>t[0]==kind)[1]+' → '+(gtt.all?n+' player'+(n==1?'':'s'):gtt.name):'Could not send — publish database.rules.json and add your UID under ownerUids (button at the bottom of this menu)')}
/* inbox: trolls other owners send to me. Deleted first, then applied by the game (owners ignore them). */
let tOff=null;
function listenT(u){tOff&&tOff();tOff=null;if(!u)return;const r=db.ref('trolls/'+u.uid),seenT=new Set(),
 h=r.on('child_added',s=>{const c=s.val(),id=s.key;if(seenT.has(id))return;seenT.add(id);s.ref.remove().catch(()=>{});if(!c||typeof c!='object'||EV.owner())return;try{Game.busy()&&Game.troll(c)}catch(_){}},e=>console.warn('troll inbox unavailable:',e&&e.message));
 tOff=()=>r.off('child_added',h)}
function gClose(){if(!gOpen())return;gp.classList.remove('on');Game.adminUi(0)}
function gameToggle(){if(!EV.owner())return;if(gOpen())return gClose();if(!gp)gBuild();gPlayers();gSync();gp.classList.add('on');Game.adminUi(1)}
/* the panel only exists inside a match: leaving the match (or losing owner status) closes it */
setInterval(()=>{if(gOpen()&&(!EV.owner()||!Game.busy())){gp.classList.remove('on');window.ADMOPEN=false}gSync()},500);
setInterval(()=>{if(gOpen())gPlayers()},4000);
return{check,listen,owner:()=>EV.owner(),game:gameToggle}})();
