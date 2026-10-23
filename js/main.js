firebase.initializeApp(window.FIREBASE_CONFIG);
/* ---- saved data. PROGRESS (coins, xp, skins, passes, event...) is wiped once whenever DATA_VER changes (accounts/usernames are untouched);
   settings (sensitivity, volume...) are kept. Logged-in accounts also save their progress to the cloud (see "account cloud save" below). ---- */
const DATA_VER=2;
const PROG={skin:0x2f9bff,coins:0,xp:0,owned:[0x2f9bff,0xff4d4d],dly:0,gs:[0,0,0],kb:{}},PK=[...Object.keys(PROG),'ev','bp'],fresh=()=>JSON.parse(JSON.stringify(PROG));
let saved={};try{saved=JSON.parse(localStorage.cfg||'{}')||{}}catch(e){}
window.CFG=Object.assign({sens:1,vol:1,music:true,model:true,q:window.TOUCH?4:10,mode:'1v1',fp:false,fpfov:90},fresh(),saved);
/* graphics: 0 Anti-Lag, 1 Low, 2 Normal, 3 Higher. One-time reset (GQ_VER) puts everyone on Normal; phones/tablets are always Normal */
const GQ_VER=1;if(CFG.gqv!==GQ_VER||window.TOUCH||CFG.gq==null||!Number.isFinite(+CFG.gq)){CFG.gq=2;CFG.gqv=GQ_VER}CFG.gq=Math.max(0,Math.min(3,Math.round(+CFG.gq)));if(CFG.mode!=='2v2')CFG.mode='1v1';
if(CFG.ver!==DATA_VER){const kb0=CFG.kb;PK.forEach(k=>delete CFG[k]);Object.assign(CFG,fresh());if(kb0&&typeof kb0=='object')CFG.kb=kb0;CFG.ver=DATA_VER;CFG.own=''} /* a data reset keeps your keybinds */
const saveLocal=()=>{try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}}; /* device-only settings (quality, mode): no cloud upload */
const saveCfg=()=>{try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}cloudDirty()};
const SK=()=>CFG.skin+GUN.pack(CFG.gs||[0,0,0]); /* what other players see: outfit + equipped gun skins */
const auth=firebase.auth(),db=firebase.database(),$=s=>document.querySelector(s);
let mode='in',user=null,qStop=null,qBot=null,off=0,online=0,conn=false,presOff=null;
const now=()=>Date.now()+off,show=id=>{document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('on',e.id==id));$('#net').style.display=id=='menu'?'':'none'};
const nm=()=>user.displayName||('Guest '+user.uid.slice(-4).toUpperCase());
const err=e=>$('#err').textContent=(e.message||e).replace('Firebase: ','').replace(/\s*\(auth.*\)\.?/,'');
// ---- connection + presence ("online" indicator)
db.ref('.info/serverTimeOffset').on('value',s=>off=s.val()||0);
const net=()=>{const n=$('#net');n.className=conn?'ok':'';n.textContent=conn?`● Online · ${online} player${online==1?'':'s'}`:'● Offline – reconnecting…'};
db.ref('.info/connected').on('value',s=>{conn=!!s.val();net();if(conn&&user)present()});
function present(){if(presOff)presOff();const r=db.ref('presence/'+user.uid),c=db.ref('presence');
r.onDisconnect().remove().then(()=>r.set(true));c.on('value',s=>{online=s.numChildren();net()});presOff=()=>{c.off();r.remove();presOff=null}}
// ---- auth: guest by default
auth.onAuthStateChanged(async u=>{
while(typeof EV=='undefined')await new Promise(r=>setTimeout(r,25)); /* passes.js (EV) is the last script: never run the menu before it has loaded */
if(!u){user=null;presOff&&presOff();try{await auth.signInAnonymously()}catch(e){$('.spin').style.display='none';$('#bt').textContent='Could not start';
$('#berr').textContent=(e.code=='auth/operation-not-allowed'||e.code=='auth/admin-restricted-operation')?'Enable the Anonymous provider in Firebase console > Authentication > Sign-in method (and make sure sign-ups are allowed under Settings > User actions), then reload.':e.code=='auth/unauthorized-domain'?'Add this site ('+location.hostname+') to Firebase Authentication > Settings > Authorized domains, or open the game from your .web.app / .firebaseapp.com link.':e.message}return}
if(u.isAnonymous&&!u.displayName)await u.updateProfile({displayName:'Guest '+(1000+Math.random()*9000|0)});
user=u;await cloudAttach();conn&&present();menu()});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{SFX.click();mode=t.dataset.m;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x==t));$('#name').style.display=mode=='up'?'block':'none';$('#go').textContent=mode=='up'?'Create account':'Sign in';$('#err').textContent=''});
$('#go').onclick=async()=>{SFX.resume();SFX.click();try{const e=$('#email').value.trim(),p=$('#pass').value;
if(mode=='in'&&user&&user.isAnonymous&&(CFG.xp>0||CFG.coins>0)&&!confirm("Signing in loads your account's saved progress and replaces this guest's progress (if your account has a save). Continue?"))return;
if(mode=='up'){const n=$('#name').value.trim();if(n.length<2)return err('Pick a username (2+ chars)');
if(user&&user.isAnonymous)await user.linkWithCredential(firebase.auth.EmailAuthProvider.credential(e,p));else await auth.createUserWithEmailAndPassword(e,p);
await auth.currentUser.updateProfile({displayName:n});user=auth.currentUser;await cloudAttach();menu()}else await auth.signInWithEmailAndPassword(e,p)}catch(x){err(x)}};
$('#back').onclick=()=>{SFX.click();menu()};
$('#acct').onclick=async()=>{SFX.click();if(user.isAnonymous){$('#err').textContent='';show('auth')}else{presOff&&presOff();await cloudPush();cloud.ready=false;cloud.uid=cloud.p=null;wipe();await auth.signOut()}};
async function menu(){show('menu');ui();if(!menu.j){menu.j=1;const c=new URLSearchParams(location.search).get('party');if(c){strip();joinParty(c)}}partyRefresh();Game.lobby(true,CFG.skin);EV.welcome();$('#av').style.background=hx(CFG.skin);bustBg($('#av'),CFG.skin);$('#gbtn').style.display=user.isAnonymous?'block':'none';$('#who').textContent=nm().slice(0,14);$('#acct').textContent=user.isAnonymous?'Email sign in / up':'Sign out';
let s=(await db.ref('users/'+user.uid).once('value').catch(()=>null))?.val()||{};
if(s.v!==DATA_VER){s={name:nm(),wins:0,losses:0,v:DATA_VER};db.ref('users/'+user.uid).set(s).catch(()=>{})} /* data reset: win/loss record starts over, the account stays */
$('#stats').textContent=`Wins ${s.wins||0} · Losses ${s.losses||0}`}
$('#play').onclick=()=>{SFX.resume();SFX.click();window.touchEnter&&touchEnter();go()};
$('#cancel').onclick=()=>{SFX.click();qStop&&qStop();menu()};
$('#home').onclick=()=>{SFX.click();menu()};$('#again').onclick=()=>{SFX.click();window.touchEnter&&touchEnter();go()};
function begin2(mid,ros){begin(mid,null,null,null,ros)}
const beginAny=v=>{if(!v||!v.mid||(v.t&&now()-v.t>45000))return;v.ros?begin2(v.mid,v.ros):begin(v.mid,v.uid,v.name,v.skin)};
function begin(mid,opp,oppName,oppSkin,ros,bot){qStop&&qStop();show('none');const K=bot?.5:1;
Game.start({db,uid:user.uid,name:nm(),mid,opp,oppName,oppSkin,ros,bot:!!bot,clock:now,skin:SK(),halloween:EV.matchStart(),onCandy:bot?null:EV.candy,onRound:bot?null:EV.round,
onGhost:()=>{toast('Opponent never connected – searching again');menu();setTimeout(go,400)},
onLeave:()=>{if(bot){menu();return}EV.sync();db.ref('users/'+user.uid).transaction(c=>{c=c||{};c.name=nm();c.v=DATA_VER;c.losses=(c.losses||0)+1;return c});menu()},
onEnd:r=>{const g0=r.draw?{x:75+r.me*15,c:12}:r.win?{x:150+r.me*20,c:25}:{x:50+r.me*15,c:8},gx={x:Math.round(g0.x*K),c:Math.round(g0.c*K)};CFG.xp+=gx.x;CFG.coins+=gx.c;saveCfg();const ex=bot?'  (practice vs bot: half rewards)':EV.matchDone(r,gx);
$('#res').textContent=r.draw?'DRAW':r.win?'VICTORY':'DEFEAT';$('#res').style.color=r.draw?'#ffd23f':r.win?'#38f5c8':'#ff6b81';
$('#winner').textContent=r.draw?'Nobody wins this one':'🏆 '+r.winner+' WINS!';$('#en1').textContent=r.myName||'You';$('#en2').textContent=r.oppName||'Enemy';$('#e1').textContent=r.me;$('#e2').textContent=r.opp;
$('#rtag').textContent=r.title=='Opponent left'?'OPPONENT LEFT':'MATCH OVER · FIRST TO 3';$('#rsub').textContent=`+${gx.x} XP  +${gx.c} 🪙`+ex;show('end');
if(r.draw||bot)return;const f=r.win?'wins':'losses';db.ref('users/'+user.uid).transaction(c=>{c=c||{};c.name=nm();c.v=DATA_VER;c[f]=(c[f]||0)+1;return c})}})}
function botName(){const A=['Swift','Silent','Lucky','Crimson','Frosty','Rapid','Shadow','Turbo','Cosmic','Sneaky','Mighty','Rogue','Neon','Savage','Clutch','Ghost','Atomic','Wild','Hyper','Iron'],
N=['Falcon','Tiger','Viper','Wolf','Panda','Cobra','Raven','Shark','Dragon','Fox','Hawk','Bear','Lynx','Ninja','Titan','Comet','Storm','Blaze','Pixel','Rider'],
r=a=>a[Math.random()*a.length|0];return r(A)+r(N)+(10+Math.random()*9990|0)}
/* practice bot: runs entirely on this device (no network). Always works, even offline. */
function beginBot(){const c=[0xff4d4d,0xffa42e,0xb04dff,0x4dffa8,0xff6bd6,0x38f5c8,0xffd23f];
begin('bot_'+now(),'BOT',botName(),c[Math.random()*c.length|0],null,true)}
/* 1v1 queue. One waiting slot (lobby/waiting) claimed with a transaction. Fixes: invite is cleared BEFORE queueing (it used to be cleared after, which could eat a
   match that had just been made), the disconnect hook is cancelled on cancel (it used to delete somebody else's waiting entry), and a bot match starts if
   nobody is online (after ~2s) or nobody joins within 12s. */
function find(){if(!conn){toast('Offline – starting a practice match vs a bot');return beginBot()}show('queue');$('#qtxt').textContent='Searching for opponent…';$('#qbot').style.display='none';
const uid=user.uid,w=db.ref('lobby/waiting'),inv=db.ref('invites/'+uid);let hb,tm,done=0,sec=0,queued=0;
const stop=()=>{done=1;clearInterval(hb);clearInterval(tm);inv.off();$('#qbot').style.display='none';if(queued){queued=0;w.onDisconnect().cancel().catch(()=>{});w.transaction(c=>c&&c.uid===uid?null:undefined).catch(()=>{})}qStop=qBot=null};
qStop=stop;
/* the bot never waits on the network: leave the queue in the background and start immediately (a slot somebody grabbed in the meantime just times out on their side) */
const toBot=()=>{if(done)return;$('#qtxt').textContent='Starting bot match…';stop();beginBot()};
qBot=toBot;
(async()=>{try{await Promise.race([inv.remove().catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);if(done)return;
inv.on('value',s=>{const v=s.val();if(v&&!done){inv.remove();beginAny(v)}});
let taken=null,r;for(let t=0;t<6&&!done;t++){taken=null;r=await w.transaction(cur=>{if(cur&&cur.uid!==uid&&now()-cur.t<20000){taken=cur;return null}taken=null;return{uid,name:nm(),skin:SK(),t:now()}});if(r.committed)break}
if(done){if(r&&r.committed&&!taken)w.remove().catch(()=>{});return}if(!r||!r.committed)throw new Error('busy');
if(taken){const mid=`${taken.uid}_${uid}_${now()}`;await db.ref('matches/'+mid+'/meta').set({a:taken.uid,b:uid});await db.ref('invites/'+taken.uid).set({mid,uid,name:nm(),skin:SK(),t:now()});begin(mid,taken.uid,taken.name,taken.skin)}
else{queued=1;w.onDisconnect().remove();hb=setInterval(()=>w.update({t:now()}).catch(()=>{}),8000)}}
catch(e){if(!done){toast('Matchmaking unavailable – starting a bot match');toBot()}}})();
/* the timer runs from the very start, so the bot is available even if matchmaking hangs or errors */
tm=setInterval(()=>{if(done)return;sec++;const others=Math.max(0,online-1);if(!$('#qtxt').textContent.startsWith('Starting'))$('#qtxt').textContent=`Searching for opponent… ${sec}s · ${others} other player${others==1?'':'s'} online`;if(sec>=1)$('#qbot').style.display='block';if((others==0&&sec>=2)||sec>=8){$('#qtxt').textContent='No opponent found – starting a bot match…';toBot()}},1000)}
$('#qbot').onclick=()=>{SFX.click();qBot&&qBot()};

// ---- lobby extras
$('#gbtn').onclick=async()=>{SFX.click();const p=new firebase.auth.GoogleAuthProvider();try{
if(user.isAnonymous){try{await user.linkWithPopup(p)}catch(e){if(e.code=='auth/credential-already-in-use'&&e.credential)await auth.signInWithCredential(e.credential);else throw e}}else await auth.signInWithPopup(p);
user=auth.currentUser;const g=user.providerData.find(x=>x.providerId=='google.com');if(g&&g.displayName&&user.displayName!=g.displayName)await user.updateProfile({displayName:g.displayName});await cloudAttach();menu()}catch(e){if(e.code!='auth/popup-closed-by-user')alert((e.message||e).replace('Firebase: ',''))}};
$('#edit').onclick=async()=>{SFX.click();const n=prompt('New username',nm());if(n&&n.trim().length>=2){await user.updateProfile({displayName:n.trim().slice(0,14)});menu()}};
$('#gear').onclick=()=>{SFX.click();$('#settings').classList.add('on')};
document.querySelectorAll('.modal .close').forEach(b=>b.onclick=()=>{SFX.click();document.querySelectorAll('.modal').forEach(x=>x.classList.remove('on'))});
$('#sens').value=CFG.sens;$('#vol').value=CFG.vol;$('#mus').checked=CFG.music;
$('#sens').oninput=e=>{CFG.sens=+e.target.value;saveCfg()};$('#vol').oninput=e=>{CFG.vol=+e.target.value;SFX.setVol(CFG.vol);saveCfg()};$('#mus').onchange=e=>{CFG.music=e.target.checked;SFX.music(CFG.music);saveCfg()};
const HWL=['OFF','LITE','FULL'],hwShow=()=>{$('#hwfx').textContent=HWL[CFG.hwfx===undefined?2:CFG.hwfx]};hwShow();$('#hwfx').onclick=()=>{SFX.click();CFG.hwfx=((CFG.hwfx===undefined?2:CFG.hwfx)+2)%3;saveCfg();hwShow();toast('Spooky effects: '+HWL[CFG.hwfx]+(CFG.hwfx<2?' (applies next match)':''))};
const QN=['Anti-Lag','Low Quality','Normal','Higher Quality'];
function qShow(){$('#qlv').textContent=QN[CFG.gq];$('#qln').textContent=Game.qinfo(CFG.gq)}
if(window.TOUCH){const r=$('#ql').closest('.srow');r&&(r.style.display='none');$('#qln').style.display='none'}$('#ql').value=CFG.gq;qShow();$('#ql').oninput=e=>{CFG.gq=+e.target.value;saveLocal();const r=Game.quality(CFG.gq);qShow();if(r&&r.reload)toast('Anti-aliasing changes after you reload the page')};
CTL.build($('#kbl'),$('#kbreset'));
const modeShow=()=>{$('#modet').textContent=CFG.mode};modeShow();
$('#modebox').onclick=()=>{SFX.click();CFG.mode=CFG.mode=='2v2'?'1v1':'2v2';saveLocal();modeShow();toast(CFG.mode=='2v2'?'2v2: you + a teammate vs 2 opponents (party up with a friend to be teammates)':'1v1 mode')};
$('#fs').onclick=()=>{const d=document.documentElement,rq=d.requestFullscreen||d.webkitRequestFullscreen;if(!rq)return toast('Fullscreen is not supported here – on iPhone use Share > Add to Home Screen');document.fullscreenElement||document.webkitFullscreenElement?(document.exitFullscreen||document.webkitExitFullscreen).call(document):rq.call(d)};
let fr=0;(function f(){fr++;requestAnimationFrame(f)})();setInterval(()=>{$('#fps').textContent='FPS: '+fr;fr=0},1000);
setInterval(()=>{if(!user||!conn)return;const t=performance.now();db.ref('presence/'+user.uid).set(true).then(()=>{$('#ping').textContent='Ping: '+Math.round(performance.now()-t)+' ms'}).catch(()=>{})},3000);

// ---- account cloud save: only for logged-in accounts (guests keep their progress on this device). One JSON string per user at saves/<uid>.
const cloud={ready:false,uid:null,tm:0,p:null};
const wipe=()=>{PK.forEach(k=>delete CFG[k]);Object.assign(CFG,fresh());CFG.own='';try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}EV.reload();CTL.refresh()}; /* local progress back to a new-player state */
function cloudDirty(){if(!cloud.ready)return;clearTimeout(cloud.tm);cloud.tm=setTimeout(cloudPush,2500)}
function cloudPush(){clearTimeout(cloud.tm);cloud.tm=0;if(!cloud.ready||!user||user.isAnonymous||user.uid!==cloud.uid)return Promise.resolve();
const o={};PK.forEach(k=>o[k]=CFG[k]);return db.ref('saves/'+cloud.uid).set({ver:DATA_VER,t:firebase.database.ServerValue.TIMESTAMP,d:JSON.stringify(o)}).catch(e=>console.warn('cloud save failed',e&&e.message))}
function cloudAttach(){if(!user||user.isAnonymous){cloud.ready=false;cloud.uid=cloud.p=null;return Promise.resolve()}
if(cloud.p&&cloud.uid===user.uid)return cloud.p;const u=user.uid;cloud.ready=false;cloud.uid=u;
return cloud.p=(async()=>{let v=null;
try{v=(await db.ref('saves/'+u).once('value')).val()}catch(e){console.warn('cloud save unavailable (publish database.rules.json):',e&&e.message);cloud.uid=cloud.p=null;toast('Cloud save unavailable — progress stays on this device');return}
let o=null;if(v&&v.ver===DATA_VER&&typeof v.d=='string'){try{o=JSON.parse(v.d)}catch(e){}}
if(o){const kb0=CFG.kb;PK.forEach(k=>delete CFG[k]);Object.assign(CFG,fresh(),o);if(!(o.kb&&typeof o.kb=='object')&&kb0&&typeof kb0=='object')CFG.kb=kb0;CFG.own=u;try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}EV.reload();ui();CTL.refresh()}  /* the account's save wins */
else{if(CFG.own&&CFG.own!==u)wipe(); /* leftover data from a different account: never carry it over */ CFG.own=u;try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}}  /* new account: keep this device's progress and upload it */
cloud.ready=true;await cloudPush()})()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cloudPush()});addEventListener('pagehide',()=>{cloudPush()});
// ---- progression, locker, shop, daily
const need=l=>300+150*(l-1),hx=c=>'#'+(c%16777216).toString(16).padStart(6,'0');
/* head-and-shoulders portrait as a small avatar background (falls back to the plain colour if the portrait can't render) */
function bustBg(el,skin){if(!el)return;let u='';try{u=Game.thumb(skin)}catch(e){}el.style.backgroundImage=u?`url(${u})`:'';el.style.backgroundSize='cover';el.style.backgroundPosition='center'}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
function ui(){let l=1,x=CFG.xp;while(x>=need(l)){x-=need(l);l++}const p=x/need(l)*100+'%';$('#lv').textContent=l;$('#xf').style.width=p;$('#xt').textContent=x+'/'+need(l);$('#cn').textContent=$('#cn2').textContent=CFG.coins;$('#dot').style.display=Date.now()-CFG.dly>864e5?'block':'none';$('#chips').style.display=CFG.hud===false?'none':'flex';EV.ui()}
function grid(shop){EV.locker(shop)}
$('#lock').onclick=()=>{SFX.click();grid(0)};$('#shop').onclick=()=>{SFX.click();grid(1)};$('#plus').onclick=()=>$('#shop').click();$('#tL').onclick=()=>{SFX.click();grid(0)};$('#tS').onclick=()=>{SFX.click();grid(1)};
$('#daily').onclick=()=>{SFX.click();if(Date.now()-CFG.dly<864e5)return toast('Come back later for your next daily reward');CFG.dly=Date.now();CFG.coins+=50;saveCfg();ui();toast('Daily reward: +50 🪙')};
const sv=()=>{$('#sensv').textContent=CFG.sens.toFixed(1)+'x';$('#volv').textContent=Math.round(CFG.vol*100)+'%'};sv();$('#sens').addEventListener('input',sv);$('#vol').addEventListener('input',sv);
$('#fpv').checked=!!CFG.fp;$('#fpv').onchange=e=>{CFG.fp=e.target.checked;saveCfg()};const fpfShow=()=>{$('#fpfv').textContent=Math.round(CFG.fpfov||90)+'°'};$('#fpf').value=CFG.fpfov||90;fpfShow();$('#fpf').oninput=e=>{CFG.fpfov=+e.target.value;saveCfg();fpfShow()};
$('#sfp').checked=CFG.hud!==false;$('#sfp').onchange=e=>{CFG.hud=e.target.checked;saveCfg();ui()};$('#fs2').onclick=()=>$('#fs').click();
// ---- party (invite a friend for a private 1v1 / to be teammates in 2v2)
let party=null,pOff=null;
const strip=()=>{try{const u=new URL(location.href);if(u.searchParams.has('party')){u.searchParams.delete('party');history.replaceState(null,'',u.pathname+(u.search||'')+u.hash)}}catch(e){}}; /* invite link is one-shot: a reload must not re-join */
function pui(){const m=party?party.m:{},ids=Object.keys(m).sort((a,b)=>(a==party.lead?-1:0)-(b==party.lead?-1:0)||(a<b?-1:1));$('#pnone').style.display=party?'none':'block';$('#pin').style.display=party?'block':'none';$('#pc').textContent=party?party.code:'';
$('#pin .sub').textContent=party&&party.lead!=user.uid?'Waiting for the party leader to press PLAY.':'The party leader presses PLAY to start the match.';
[['#ps1',ids[0]],['#ps2',ids[1]]].forEach(([s,id])=>{const el=$(s);el.innerHTML='<i></i><b></b><small></small>';const i=el.querySelector('i');if(id){i.style.background=hx(m[id].skin);bustBg(i,m[id].skin);el.querySelector('b').textContent=m[id].name;el.querySelector('small').textContent=id==party.lead?'LEADER':'MEMBER'}else{i.className='em';i.textContent='+';el.querySelector('b').textContent='Waiting…'}});
const o=ids.find(i=>i!=user.uid),f=$('#friend');f.classList.toggle('has',!!o);f.textContent=o?m[o].name.slice(0,2).toUpperCase():'+';f.style.background=o?hx(m[o].skin):'';f.title=o?m[o].name+' is in your party':'Invite to party';Game.partner(o?{name:m[o].name,skin:m[o].skin}:null)}
function dropParty(){const p=pOff;pOff=null;party=null;p&&p();pui()}
function attach(code,lead){const r=db.ref('parties/'+code),inv=db.ref('invites/'+user.uid),me=r.child('m/'+user.uid);let n=0;
if(lead)r.onDisconnect().remove();else me.onDisconnect().remove();
r.on('value',s=>{const v=s.val();if(!v||!(v.m||{})[user.uid]){if(party&&party.code===code){if(qStop){qStop();menu()}dropParty();toast('Party closed')}return}
const was=n;n=Object.keys(v.m).length;party={code,lead:v.lead,m:v.m};
if(was>n&&qStop){qStop();menu();toast('Your teammate left the party – search cancelled')} /* never keep searching with a roster that no longer exists */
pui()});
let live=true;inv.remove().catch(()=>{}).then(()=>{if(!live)return;inv.on('value',s=>{const v=s.val();if(v&&live&&party&&party.code===code&&party.lead!=user.uid){inv.remove();$('#party').classList.remove('on');beginAny(v)}})}); /* stale invites from old matches are wiped before listening */
pOff=()=>{live=false;r.off();inv.off();if(lead){r.onDisconnect().cancel().catch(()=>{});r.remove().catch(()=>{})}else{me.onDisconnect().cancel().catch(()=>{});me.remove().catch(()=>{})}}}
const mem=()=>({name:nm(),skin:SK()});
function partyRefresh(){if(party&&party.m[user.uid]){const m=mem(),c=party.m[user.uid];if(c.name!==m.name||c.skin!==m.skin)db.ref('parties/'+party.code+'/m/'+user.uid).set(m).catch(()=>{})}}
const pcode=()=>{let c='';const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let i=0;i<5;i++)c+=A[Math.random()*A.length|0];return c};
$('#pnew').onclick=async()=>{SFX.click();if(!conn)return toast('You are offline');if(party)return;
for(let t=0;t<4;t++){const code=pcode();try{await db.ref('parties/'+code).set({lead:user.uid,m:{[user.uid]:mem()}});if(party)return;attach(code,true);return}catch(e){if(t==3)toast('Could not create party: '+(e.message||e).toString().replace('permission_denied','permission denied (publish database.rules.json)'))}}};
async function joinParty(code){code=(code||'').toUpperCase().trim();if(code.length<4)return toast('Enter a party code');if(!conn)return toast('You are offline');if(party&&party.code===code){$('#party').classList.add('on');return}
const r=db.ref('parties/'+code),v=(await r.once('value').catch(()=>null))?.val();
if(!v||!v.lead)return toast('Party not found');if(!(v.m||{})[user.uid]&&Object.keys(v.m||{}).length>=2)return toast('Party is full');
if(party){if(qStop){qStop();menu()}dropParty()}
try{await r.child('m/'+user.uid).set(mem())}catch(e){return toast('Could not join (party full?)')}
attach(code,v.lead==user.uid);$('#party').classList.add('on');pui()}
$('#pjoin').onclick=()=>{SFX.click();joinParty($('#pcode').value)};
$('#pcopy').onclick=()=>{SFX.click();const l=location.origin.replace('null','')+location.pathname+'?party='+party.code;(navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast('Invite link copied!'),()=>prompt('Copy this invite link',l))};
$('#pleave').onclick=()=>{SFX.click();if(qStop){qStop();menu()}dropParty();toast('Left party')};
$('#friend').onclick=()=>{SFX.click();pui();$('#party').classList.add('on')};
function go(){const duo=!!party&&Object.keys(party.m).length>1;
if(CFG.mode=='2v2'){if(duo&&party.lead!=user.uid)return toast('Waiting for the party leader to press Play');return find2(duo?Object.keys(party.m):[user.uid])}
if(duo){if(party.lead!=user.uid)return toast('Waiting for the party leader to press Play');return pmatch()}find()}
/* ---- 2v2 matchmaking: lobby2/q holds waiting teams (1 solo player or a 2-player party). Whoever arrives and completes 4 players creates the match and writes an invite (with the full roster) for everyone else. ---- */
async function find2(uids){if(!conn)return alert('You are offline. Check your connection.');show('queue');$('#qtxt').textContent='Searching for a 2v2 match…';
const me=user.uid,q=db.ref('lobby2/q'),mine=q.child(me),inv=db.ref('invites/'+me);let hb,done=0,formed=null;
const mem=uids.map(u=>u==me?{u,n:nm(),s:SK()}:{u,n:party.m[u].name,s:party.m[u].skin});
qStop=()=>{done=1;clearInterval(hb);inv.off();mine.onDisconnect().cancel().catch(()=>{});mine.remove().catch(()=>{});qStop=null};
try{await inv.remove();
const r=await q.transaction(cur=>{const t=now(),Q={};formed=null;
for(const k in cur||{}){const e=cur[k];if(k!==me&&e&&Array.isArray(e.m)&&e.m.length&&e.m.length<3&&t-e.t<20000)Q[k]=e}
const keys=Object.keys(Q).sort((a,b)=>Q[a].t-Q[b].t),pick=[me];let n=mem.length;
for(const k of keys){const z=Q[k].m.length;if(n+z<=4){pick.push(k);n+=z;if(n==4)break}}
if(n==4){formed={groups:pick.map(k=>k==me?mem:Q[k].m)};pick.forEach(k=>{if(k!==me)delete Q[k]});return Object.keys(Q).length?Q:null}
Q[me]={m:mem,t};return Q});
if(done){if(r.committed&&!formed)mine.remove().catch(()=>{});return}
if(!r.committed)return find2(uids);
if(formed){const gs=formed.groups.slice().sort((a,b)=>b.length-a.length),t0=[],t1=[];gs.forEach(g=>{(t0.length+g.length<=2?t0:t1).push(...g)});
const ros=[...t0.map(p=>({...p,t:0})),...t1.map(p=>({...p,t:1}))],mid=ros.map(p=>p.u).join('_')+'_'+now();
await db.ref('matches/'+mid+'/meta').set({a:ros[0].u,b:ros[2].u});
await Promise.all(ros.filter(p=>p.u!==me).map(p=>db.ref('invites/'+p.u).set({mid,ros,t:now()})));
return begin2(mid,ros)}
mine.onDisconnect().remove();hb=setInterval(()=>mine.transaction(c=>c?{...c,t:now()}:undefined),8000);
inv.on('value',s=>{const v=s.val();if(v){inv.remove();beginAny(v)}})}catch(e){qStop&&qStop();menu();alert(e.message)}}
async function pmatch(){const o=Object.keys(party.m).find(i=>i!=user.uid),mid=`${user.uid}_${o}_${now()}`;try{await db.ref('matches/'+mid+'/meta').set({a:user.uid,b:o});await db.ref('invites/'+o).set({mid,uid:user.uid,name:nm(),skin:SK(),t:now()});begin(mid,o,party.m[o].name,party.m[o].skin)}catch(e){toast(e.message)}}
