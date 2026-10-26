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
function listen(u){gOff&&gOff();gOff=null;seen=new Set();if(!u)return;const r=db.ref('gifts/'+u.uid);
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
   Same gifts as the main-menu panel (XP, candy with a leaderboard on/off switch, coins, keys) to yourself, everybody online or a player of this match,
   plus a practice refill (only in bot matches and the aim trainer, never in a real match). The key is only listed in Settings > Controls for owners. */
let gp=null,gt={me:1},gbusy=0;
const gOpen=()=>!!gp&&gp.classList.contains('on');
function gBuild(){gp=document.createElement('div');gp.id='gadm';gp.innerHTML=
 '<div class="gh"><b>🛠 ADMIN</b><small>press Y to close</small><button type="button" data-a="x">✕</button></div>'+
 '<div class="gs">SEND TO</div><div class="gtg"><button type="button" data-t="me" class="on">ME</button><button type="button" data-t="all">EVERYONE ONLINE</button></div><div class="gpl"></div>'+
 '<div class="gg"><label><small>⭐ XP</small><input id="gax" type="number" min="0" value="0"></label><label><small>🍬 CANDY</small><input id="gac" type="number" min="0" value="0"></label><label><small>🪙 COINS</small><input id="gao" type="number" min="0" value="0"></label><label><small>🗝️ KEYS</small><input id="gak" type="number" min="0" value="0"></label></div>'+
 '<div class="gq"><button type="button" data-q="1000">+1K XP</button><button type="button" data-q="10000">+10K</button><button type="button" data-q="100000">+100K</button><button type="button" data-q="1000000">+1M</button></div>'+
 '<label class="gk"><input id="gar" type="checkbox" checked> Candy counts for the leaderboard &amp; goals</label>'+
 '<button type="button" class="gsend" data-a="send">SEND</button>'+
 '<div class="gs">PRACTICE TOOLS <small>bot matches &amp; aim trainer only</small></div><button type="button" class="gtool" data-a="refill">❤️ REFILL HP + MATERIALS</button>';
 document.body.appendChild(gp);
 gp.addEventListener('keydown',e=>{e.stopPropagation();if(e.code=='Escape'||(CTL.acts(e.code)||[]).includes('admin')){e.preventDefault();gClose()}},true);
 gp.addEventListener('keyup',e=>e.stopPropagation(),true);
 gp.addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;SFX.click();
  if(b.dataset.t){gt=b.dataset.t=='all'?{all:1}:{me:1};gMark();return}
  if(b.dataset.q){$('#gax').value=b.dataset.q;return}
  if(b.dataset.u){gt={uid:b.dataset.u,name:b.textContent};gMark();return}
  const a=b.dataset.a;
  if(a=='x')return gClose();
  if(a=='refill')return toast(Game.adminRefill()?'Refilled HP and materials':'Refill only works in bot matches and the aim trainer');
  if(a=='send'){if(!EV.owner()||gbusy)return;const x=readAmt('#gac','#gao','#gak','#gax');x.rank=$('#gar').checked;if(!(x.c||x.o||x.k||x.x))return toast('Enter an amount to give');
   gbusy=1;b.disabled=true;try{await giveTo(gt,x)}catch(_){toast('Could not send the gift')}finally{gbusy=0;b.disabled=false}}})}
function gMark(){gp.querySelectorAll('[data-t]').forEach(b=>b.classList.toggle('on',(b.dataset.t=='me'&&gt.me)||(b.dataset.t=='all'&&gt.all)));gp.querySelectorAll('.gpl [data-u]').forEach(b=>b.classList.toggle('on',gt.uid===b.dataset.u))}
function gPlayers(){const box=gp.querySelector('.gpl');box.textContent='';let l=[];try{l=Game.players().filter(p=>!user||p.uid!==user.uid)}catch(_){}
 l.slice(0,10).forEach(p=>{const b=document.createElement('button');b.type='button';b.dataset.u=p.uid;b.textContent=String(p.name||'Player').slice(0,18);box.appendChild(b)});gMark()}
function gClose(){if(!gOpen())return;gp.classList.remove('on');Game.adminUi(0)}
function gameToggle(){if(!EV.owner())return;if(gOpen())return gClose();if(!gp)gBuild();gPlayers();gp.classList.add('on');Game.adminUi(1)}
/* the panel only exists inside a match: leaving the match (or losing owner status) closes it */
setInterval(()=>{if(gOpen()&&(!EV.owner()||!Game.busy())){gp.classList.remove('on');window.ADMOPEN=false}},500);
return{check,listen,owner:()=>EV.owner(),game:gameToggle}})();
