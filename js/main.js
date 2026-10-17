firebase.initializeApp(window.FIREBASE_CONFIG);
window.CFG=Object.assign({sens:1,vol:1,music:true,skin:0x2f9bff},JSON.parse(localStorage.cfg||'{}'));const saveCfg=()=>localStorage.cfg=JSON.stringify(CFG);
const auth=firebase.auth(),db=firebase.database(),$=s=>document.querySelector(s);
let mode='in',user=null,qStop=null,off=0,online=0,conn=false,presOff=null;
const now=()=>Date.now()+off,show=id=>document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('on',e.id==id));
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
user=u;conn&&present();menu()});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{SFX.click();mode=t.dataset.m;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x==t));$('#name').style.display=mode=='up'?'block':'none';$('#go').textContent=mode=='up'?'Create account':'Sign in';$('#err').textContent=''});
$('#go').onclick=async()=>{SFX.resume();SFX.click();try{const e=$('#email').value.trim(),p=$('#pass').value;
if(mode=='up'){const n=$('#name').value.trim();if(n.length<2)return err('Pick a username (2+ chars)');
if(user&&user.isAnonymous)await user.linkWithCredential(firebase.auth.EmailAuthProvider.credential(e,p));else await auth.createUserWithEmailAndPassword(e,p);
await auth.currentUser.updateProfile({displayName:n});user=auth.currentUser;menu()}else await auth.signInWithEmailAndPassword(e,p)}catch(x){err(x)}};
$('#back').onclick=()=>{SFX.click();menu()};
$('#acct').onclick=async()=>{SFX.click();if(user.isAnonymous){$('#err').textContent='';show('auth')}else{presOff&&presOff();await auth.signOut()}};
async function menu(){show('menu');Game.lobby(true,CFG.skin);$('#av').style.background='#'+CFG.skin.toString(16).padStart(6,'0');$('#gbtn').style.display=user.isAnonymous?'block':'none';$('#who').textContent=nm().slice(0,14);$('#acct').textContent=user.isAnonymous?'Email sign in / up':'Sign out';
const s=(await db.ref('users/'+user.uid).once('value').catch(()=>null))?.val()||{};$('#stats').textContent=`Wins ${s.wins||0} · Losses ${s.losses||0}`}
$('#play').onclick=()=>{SFX.resume();SFX.click();find()};
$('#cancel').onclick=()=>{SFX.click();qStop&&qStop();menu()};
$('#home').onclick=()=>{SFX.click();menu()};$('#again').onclick=()=>{SFX.click();find()};
function begin(mid,opp,oppName,oppSkin){qStop&&qStop();show('none');Game.start({db,uid:user.uid,name:nm(),mid,opp,oppName,oppSkin,skin:CFG.skin,onEnd:r=>{
$('#res').textContent=r.title.toUpperCase();$('#res').style.color=r.win?'#38f5c8':'#ff6b81';$('#rsub').textContent=`Final score ${r.me} – ${r.opp}`;show('end');
const f=r.win?'wins':'losses';db.ref('users/'+user.uid).transaction(c=>{c=c||{};c.name=nm();c[f]=(c[f]||0)+1;return c})}})}
function find(){if(!conn)return alert('You are offline. Check your connection.');show('queue');const uid=user.uid,w=db.ref('lobby/waiting'),inv=db.ref('invites/'+uid);let hb,done=0,taken=null;
qStop=()=>{done=1;clearInterval(hb);inv.off();w.once('value',s=>{if((s.val()||{}).uid==uid)w.remove()});qStop=null};
w.transaction(cur=>{if(cur&&cur.uid!==uid&&now()-cur.t<20000){taken=cur;return null}taken=null;return{uid,name:nm(),skin:CFG.skin,t:now()}}).then(async r=>{
if(done){if(r.committed&&!taken)w.remove();return}if(!r.committed)return find();
if(taken){const mid=`${taken.uid}_${uid}_${now()}`;await db.ref('matches/'+mid+'/meta').set({a:taken.uid,b:uid});await db.ref('invites/'+taken.uid).set({mid,uid,name:nm(),skin:CFG.skin});begin(mid,taken.uid,taken.name,taken.skin)}
else{w.onDisconnect().remove();hb=setInterval(()=>w.update({t:now()}),8000);await inv.remove();
inv.on('value',s=>{const v=s.val();if(v){inv.remove();begin(v.mid,v.uid,v.name,v.skin)}})}}).catch(e=>{qStop&&qStop();menu();alert(e.message)})}

// ---- lobby extras
$('#gbtn').onclick=async()=>{SFX.click();const p=new firebase.auth.GoogleAuthProvider();try{
if(user.isAnonymous){try{await user.linkWithPopup(p)}catch(e){if(e.code=='auth/credential-already-in-use'&&e.credential)await auth.signInWithCredential(e.credential);else throw e}}else await auth.signInWithPopup(p);
user=auth.currentUser;const g=user.providerData.find(x=>x.providerId=='google.com');if(g&&g.displayName&&user.displayName!=g.displayName)await user.updateProfile({displayName:g.displayName});menu()}catch(e){if(e.code!='auth/popup-closed-by-user')alert((e.message||e).replace('Firebase: ',''))}};
$('#edit').onclick=async()=>{SFX.click();const n=prompt('New username',nm());if(n&&n.trim().length>=2){await user.updateProfile({displayName:n.trim().slice(0,14)});menu()}};
[0x2f9bff,0xff4d4d,0x3ddc84,0xa65cff,0xff9a2f,0xff5fb8,0xffd23f,0xe8e8f0].forEach(c=>{const b=document.createElement('button');b.className='swb';b.style.background='#'+c.toString(16).padStart(6,'0');b.onclick=()=>{SFX.click();CFG.skin=c;saveCfg();menu()};$('#sw').appendChild(b)});
$('#lock').onclick=()=>{SFX.click();$('#locker').classList.add('on')};$('#gear').onclick=()=>{SFX.click();$('#settings').classList.add('on')};
document.querySelectorAll('.modal .close').forEach(b=>b.onclick=()=>{SFX.click();document.querySelectorAll('.modal').forEach(x=>x.classList.remove('on'))});
$('#sens').value=CFG.sens;$('#vol').value=CFG.vol;$('#mus').checked=CFG.music;
$('#sens').oninput=e=>{CFG.sens=+e.target.value;saveCfg()};$('#vol').oninput=e=>{CFG.vol=+e.target.value;SFX.setVol(CFG.vol);saveCfg()};$('#mus').onchange=e=>{CFG.music=e.target.checked;SFX.music(CFG.music);saveCfg()};
$('#fs').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
let fr=0;(function f(){fr++;requestAnimationFrame(f)})();setInterval(()=>{$('#fps').textContent='FPS: '+fr;fr=0},1000);
setInterval(()=>{if(!user||!conn)return;const t=performance.now();db.ref('presence/'+user.uid).set(true).then(()=>{$('#ping').textContent='Ping: '+Math.round(performance.now()-t)+' ms'}).catch(()=>{})},3000);
