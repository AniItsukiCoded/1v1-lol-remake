firebase.initializeApp(window.FIREBASE_CONFIG);
/* ---- saved data. PROGRESS (coins, xp, skins, passes, event...) is wiped once whenever DATA_VER changes (accounts/usernames are untouched);
   settings (sensitivity, volume...) are kept. Logged-in accounts also save their progress to the cloud (see "account cloud save" below). ---- */
const DATA_VER=2;
const PROG={skin:0x2f9bff,coins:0,xp:0,owned:[0x2f9bff,0xff4d4d],dly:0,gs:[0,0,0]},PK=[...Object.keys(PROG),'ev','bp'],fresh=()=>JSON.parse(JSON.stringify(PROG));
let saved={};try{saved=JSON.parse(localStorage.cfg||'{}')||{}}catch(e){}
window.CFG=Object.assign({sens:1,vol:1,music:true,model:true},fresh(),saved);
if(CFG.ver!==DATA_VER){PK.forEach(k=>delete CFG[k]);Object.assign(CFG,fresh());CFG.ver=DATA_VER;CFG.own=''}
const saveCfg=()=>{try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}cloudDirty()};
const SK=()=>CFG.skin+GUN.pack(CFG.gs||[0,0,0]); /* what other players see: outfit + equipped gun skins */
const auth=firebase.auth(),db=firebase.database(),$=s=>document.querySelector(s);
let mode='in',user=null,qStop=null,off=0,online=0,conn=false,presOff=null;
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
async function menu(){show('menu');ui();if(!menu.j){menu.j=1;const c=new URLSearchParams(location.search).get('party');if(c)joinParty(c)}Game.lobby(true,CFG.skin);EV.welcome();$('#av').style.background=hx(CFG.skin);$('#gbtn').style.display=user.isAnonymous?'block':'none';$('#who').textContent=nm().slice(0,14);$('#acct').textContent=user.isAnonymous?'Email sign in / up':'Sign out';
let s=(await db.ref('users/'+user.uid).once('value').catch(()=>null))?.val()||{};
if(s.v!==DATA_VER){s={name:nm(),wins:0,losses:0,v:DATA_VER};db.ref('users/'+user.uid).set(s).catch(()=>{})} /* data reset: win/loss record starts over, the account stays */
$('#stats').textContent=`Wins ${s.wins||0} · Losses ${s.losses||0}`}
$('#play').onclick=()=>{SFX.resume();SFX.click();go()};
$('#cancel').onclick=()=>{SFX.click();qStop&&qStop();menu()};
$('#home').onclick=()=>{SFX.click();menu()};$('#again').onclick=()=>{SFX.click();go()};
function begin(mid,opp,oppName,oppSkin){qStop&&qStop();show('none');Game.start({db,uid:user.uid,name:nm(),mid,opp,oppName,oppSkin,skin:SK(),halloween:EV.matchStart(),onCandy:EV.candy,onRound:EV.round,onLeave:()=>{EV.sync();db.ref('users/'+user.uid).transaction(c=>{c=c||{};c.name=nm();c.v=DATA_VER;c.losses=(c.losses||0)+1;return c});menu()},onEnd:r=>{const gx=r.draw?{x:75+r.me*15,c:12}:r.win?{x:150+r.me*20,c:25}:{x:50+r.me*15,c:8};CFG.xp+=gx.x;CFG.coins+=gx.c;saveCfg();const ex=EV.matchDone(r,gx);
$('#res').textContent=r.draw?'DRAW':r.win?'VICTORY':'DEFEAT';$('#res').style.color=r.draw?'#ffd23f':r.win?'#38f5c8':'#ff6b81';
$('#winner').textContent=r.draw?'Nobody wins this one':'🏆 '+r.winner+' WINS!';$('#en1').textContent=r.myName||'You';$('#en2').textContent=r.oppName||'Enemy';$('#e1').textContent=r.me;$('#e2').textContent=r.opp;
$('#rtag').textContent=r.title=='Opponent left'?'OPPONENT LEFT':'MATCH OVER · FIRST TO 3';$('#rsub').textContent=`+${gx.x} XP  +${gx.c} 🪙`+ex;show('end');
if(r.draw)return;const f=r.win?'wins':'losses';db.ref('users/'+user.uid).transaction(c=>{c=c||{};c.name=nm();c.v=DATA_VER;c[f]=(c[f]||0)+1;return c})}})}
function find(){if(!conn)return alert('You are offline. Check your connection.');show('queue');const uid=user.uid,w=db.ref('lobby/waiting'),inv=db.ref('invites/'+uid);let hb,done=0,taken=null;
qStop=()=>{done=1;clearInterval(hb);inv.off();w.once('value',s=>{if((s.val()||{}).uid==uid)w.remove()});qStop=null};
w.transaction(cur=>{if(cur&&cur.uid!==uid&&now()-cur.t<20000){taken=cur;return null}taken=null;return{uid,name:nm(),skin:SK(),t:now()}}).then(async r=>{
if(done){if(r.committed&&!taken)w.remove();return}if(!r.committed)return find();
if(taken){const mid=`${taken.uid}_${uid}_${now()}`;await db.ref('matches/'+mid+'/meta').set({a:taken.uid,b:uid});await db.ref('invites/'+taken.uid).set({mid,uid,name:nm(),skin:SK()});begin(mid,taken.uid,taken.name,taken.skin)}
else{w.onDisconnect().remove();hb=setInterval(()=>w.update({t:now()}),8000);await inv.remove();
inv.on('value',s=>{const v=s.val();if(v){inv.remove();begin(v.mid,v.uid,v.name,v.skin)}})}}).catch(e=>{qStop&&qStop();menu();alert(e.message)})}

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
$('#fs').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
let fr=0;(function f(){fr++;requestAnimationFrame(f)})();setInterval(()=>{$('#fps').textContent='FPS: '+fr;fr=0},1000);
setInterval(()=>{if(!user||!conn)return;const t=performance.now();db.ref('presence/'+user.uid).set(true).then(()=>{$('#ping').textContent='Ping: '+Math.round(performance.now()-t)+' ms'}).catch(()=>{})},3000);

// ---- account cloud save: only for logged-in accounts (guests keep their progress on this device). One JSON string per user at saves/<uid>.
const cloud={ready:false,uid:null,tm:0,p:null};
const wipe=()=>{PK.forEach(k=>delete CFG[k]);Object.assign(CFG,fresh());CFG.own='';try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}EV.reload()}; /* local progress back to a new-player state */
function cloudDirty(){if(!cloud.ready)return;clearTimeout(cloud.tm);cloud.tm=setTimeout(cloudPush,2500)}
function cloudPush(){clearTimeout(cloud.tm);cloud.tm=0;if(!cloud.ready||!user||user.isAnonymous||user.uid!==cloud.uid)return Promise.resolve();
const o={};PK.forEach(k=>o[k]=CFG[k]);return db.ref('saves/'+cloud.uid).set({ver:DATA_VER,t:firebase.database.ServerValue.TIMESTAMP,d:JSON.stringify(o)}).catch(e=>console.warn('cloud save failed',e&&e.message))}
function cloudAttach(){if(!user||user.isAnonymous){cloud.ready=false;cloud.uid=cloud.p=null;return Promise.resolve()}
if(cloud.p&&cloud.uid===user.uid)return cloud.p;const u=user.uid;cloud.ready=false;cloud.uid=u;
return cloud.p=(async()=>{let v=null;
try{v=(await db.ref('saves/'+u).once('value')).val()}catch(e){console.warn('cloud save unavailable (publish database.rules.json):',e&&e.message);cloud.uid=cloud.p=null;toast('Cloud save unavailable — progress stays on this device');return}
let o=null;if(v&&v.ver===DATA_VER&&typeof v.d=='string'){try{o=JSON.parse(v.d)}catch(e){}}
if(o){PK.forEach(k=>delete CFG[k]);Object.assign(CFG,fresh(),o);CFG.own=u;try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}EV.reload();ui()}  /* the account's save wins */
else{if(CFG.own&&CFG.own!==u)wipe(); /* leftover data from a different account: never carry it over */ CFG.own=u;try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}}  /* new account: keep this device's progress and upload it */
cloud.ready=true;await cloudPush()})()}
document.addEventListener('visibilitychange',()=>{if(document.hidden)cloudPush()});addEventListener('pagehide',()=>{cloudPush()});
// ---- progression, locker, shop, daily
const need=l=>300+150*(l-1),hx=c=>'#'+(c%16777216).toString(16).padStart(6,'0');
function toast(t){const e=$('#toast');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
function ui(){let l=1,x=CFG.xp;while(x>=need(l)){x-=need(l);l++}const p=x/need(l)*100+'%';$('#lv').textContent=l;$('#xf').style.width=p;$('#xt').textContent=x+'/'+need(l);$('#cn').textContent=$('#cn2').textContent=CFG.coins;$('#dot').style.display=Date.now()-CFG.dly>864e5?'block':'none';$('#chips').style.display=CFG.hud===false?'none':'flex';EV.ui()}
function grid(shop){EV.locker(shop)}
$('#lock').onclick=()=>{SFX.click();grid(0)};$('#shop').onclick=()=>{SFX.click();grid(1)};$('#plus').onclick=()=>$('#shop').click();$('#tL').onclick=()=>{SFX.click();grid(0)};$('#tS').onclick=()=>{SFX.click();grid(1)};
$('#daily').onclick=()=>{SFX.click();if(Date.now()-CFG.dly<864e5)return toast('Come back later for your next daily reward');CFG.dly=Date.now();CFG.coins+=50;saveCfg();ui();toast('Daily reward: +50 🪙')};
const sv=()=>{$('#sensv').textContent=CFG.sens.toFixed(1)+'x';$('#volv').textContent=Math.round(CFG.vol*100)+'%'};sv();$('#sens').addEventListener('input',sv);$('#vol').addEventListener('input',sv);
$('#sfp').checked=CFG.hud!==false;$('#sfp').onchange=e=>{CFG.hud=e.target.checked;saveCfg();ui()};$('#fs2').onclick=()=>$('#fs').click();
// ---- party (invite a friend for a private 1v1)
let party=null,pOff=null;
function pui(){const m=party?party.m:{},ids=Object.keys(m).sort((a,b)=>(a==party.lead?-1:0)-(b==party.lead?-1:0)||(a<b?-1:1));$('#pnone').style.display=party?'none':'block';$('#pin').style.display=party?'block':'none';$('#pc').textContent=party?party.code:'';
[['#ps1',ids[0]],['#ps2',ids[1]]].forEach(([s,id])=>{const el=$(s);el.innerHTML='<i></i><b></b><small></small>';const i=el.querySelector('i');if(id){i.style.background=hx(m[id].skin);el.querySelector('b').textContent=m[id].name;el.querySelector('small').textContent=id==party.lead?'LEADER':'MEMBER'}else{i.className='em';i.textContent='+';el.querySelector('b').textContent='Waiting…'}});
const o=ids.find(i=>i!=user.uid),f=$('#friend');f.classList.toggle('has',!!o);f.textContent=o?m[o].name.slice(0,2).toUpperCase():'+';f.style.background=o?hx(m[o].skin):'';f.title=o?m[o].name+' is in your party':'Invite to party';Game.partner(o?{name:m[o].name,skin:m[o].skin}:null)}
function attach(code,lead){const r=db.ref('parties/'+code),inv=db.ref('invites/'+user.uid),me=r.child('m/'+user.uid);if(lead)r.onDisconnect().remove();else me.onDisconnect().remove();
r.on('value',s=>{const v=s.val();if(!v||!(v.m||{})[user.uid]){if(party){party=null;pOff&&pOff();pOff=null;toast('Party closed');pui()}return}party={code,lead:v.lead,m:v.m};pui()});
inv.on('value',s=>{const v=s.val();if(v&&party&&party.lead!=user.uid){inv.remove();$('#party').classList.remove('on');begin(v.mid,v.uid,v.name,v.skin)}});
pOff=()=>{r.off();inv.off();lead?r.remove():me.remove()}}
const mem=()=>({name:nm(),skin:SK()});
$('#pnew').onclick=async()=>{SFX.click();if(!conn)return toast('You are offline');const code=Math.random().toString(36).slice(2,7).toUpperCase();await db.ref('parties/'+code).set({lead:user.uid,m:{[user.uid]:mem()}}).catch(e=>toast('Party error: '+e.message));attach(code,true)};
async function joinParty(code){code=(code||'').toUpperCase().trim();if(code.length<4)return toast('Enter a party code');const r=db.ref('parties/'+code),v=(await r.once('value').catch(()=>null))?.val();
if(!v)return toast('Party not found');if(!(v.m||{})[user.uid]&&Object.keys(v.m||{}).length>=2)return toast('Party is full');if(party)$('#pleave').click();await r.child('m/'+user.uid).set(mem());attach(code,v.lead==user.uid);$('#party').classList.add('on');pui()}
$('#pjoin').onclick=()=>{SFX.click();joinParty($('#pcode').value)};
$('#pcopy').onclick=()=>{SFX.click();const l=location.origin.replace('null','')+location.pathname+'?party='+party.code;(navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast('Invite link copied!'),()=>prompt('Copy this invite link',l))};
$('#pleave').onclick=()=>{SFX.click();pOff&&pOff();pOff=null;party=null;pui();toast('Left party')};
$('#friend').onclick=()=>{SFX.click();pui();$('#party').classList.add('on')};
function go(){if(party&&Object.keys(party.m).length>1){if(party.lead!=user.uid)return toast('Waiting for the party leader to press Play');return pmatch()}find()}
async function pmatch(){const o=Object.keys(party.m).find(i=>i!=user.uid),mid=`${user.uid}_${o}_${now()}`;try{await db.ref('matches/'+mid+'/meta').set({a:user.uid,b:o});await db.ref('invites/'+o).set({mid,uid:user.uid,name:nm(),skin:SK()});begin(mid,o,party.m[o].name,party.m[o].skin)}catch(e){toast(e.message)}}
