firebase.initializeApp(window.FIREBASE_CONFIG);
/* ---- saved data. PROGRESS (coins, xp, skins, passes, event...) is wiped once whenever DATA_VER changes (accounts/usernames are untouched);
   settings (sensitivity, volume...) are kept. Logged-in accounts also save their progress to the cloud (see "account cloud save" below). ---- */
const DATA_VER=2;
const PROG={skin:0x2f9bff,coins:0,xp:0,owned:[0x2f9bff,0xff4d4d],dly:0,gs:[0,0,0],kb:{}},PK=[...Object.keys(PROG),'ev','bp'],fresh=()=>JSON.parse(JSON.stringify(PROG));
let saved={};try{saved=JSON.parse(localStorage.cfg||'{}')||{}}catch(e){}
window.CFG=Object.assign({sens:1,vol:1,music:true,model:true,q:window.TOUCH?4:10,mode:'1v1',fp:false,fpfov:90},fresh(),saved);
/* graphics: 0 Anti-Lag, 1 Low, 2 Normal, 3 Higher. One-time reset (GQ_VER) puts everyone on Normal; phones/tablets are always Normal */
const GQ_VER=1;if(CFG.gqv!==GQ_VER||window.TOUCH||CFG.gq==null||!Number.isFinite(+CFG.gq)){CFG.gq=2;CFG.gqv=GQ_VER}CFG.gq=Math.max(0,Math.min(3,Math.round(+CFG.gq)));if(!window.MODES[CFG.mode])CFG.mode='1v1';
if(CFG.ver!==DATA_VER){const kb0=CFG.kb;PK.forEach(k=>delete CFG[k]);Object.assign(CFG,fresh());if(kb0&&typeof kb0=='object')CFG.kb=kb0;CFG.ver=DATA_VER;CFG.own=''} /* a data reset keeps your keybinds */
const saveLocal=()=>{try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}}; /* device-only settings (quality, mode): no cloud upload */
const saveCfg=()=>{try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}cloudDirty()};
const SK=()=>CFG.skin+GUN.pack(CFG.gs||[0,0,0]); /* what other players see: outfit + equipped gun skins */
const auth=firebase.auth(),db=firebase.database(),$=s=>document.querySelector(s);
let mode='in',user=null,qStop=null,qBot=null,off=0,online=0,conn=false,presOff=null;
const now=()=>Date.now()+off,show=id=>{if(id!='menu'){const a=document.querySelector('#admin');a&&a.classList.remove('on')}document.querySelectorAll('.screen').forEach(e=>e.classList.toggle('on',e.id==id));$('#net').style.display=id=='menu'?'':'none'};
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
while(typeof EV=='undefined'||typeof LB2=='undefined'||typeof ADM=='undefined'||typeof LBK=='undefined')await new Promise(r=>setTimeout(r,25)); /* passes.js (EV) is the last script: never run the menu before it has loaded */
if(!u){user=null;presOff&&presOff();try{await auth.signInAnonymously()}catch(e){$('.spin').style.display='none';$('#bt').textContent='Could not start';
$('#berr').textContent=(e.code=='auth/operation-not-allowed'||e.code=='auth/admin-restricted-operation')?'Enable the Anonymous provider in Firebase console > Authentication > Sign-in method (and make sure sign-ups are allowed under Settings > User actions), then reload.':e.code=='auth/unauthorized-domain'?'Add this site ('+location.hostname+') to Firebase Authentication > Settings > Authorized domains, or open the game from your .web.app / .firebaseapp.com link.':e.message}return}
if(u.isAnonymous&&!u.displayName)await u.updateProfile({displayName:'Guest '+(1000+Math.random()*9000|0)});
user=u;await sess();conn&&present();menu()});
document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{SFX.click();mode=t.dataset.m;document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('on',x==t));$('#name').style.display=mode=='up'?'block':'none';$('#go').textContent=mode=='up'?'Create account':'Sign in';$('#err').textContent=''});
$('#go').onclick=async()=>{SFX.resume();SFX.click();try{const e=$('#email').value.trim(),p=$('#pass').value;
if(mode=='in'&&user&&user.isAnonymous&&(CFG.xp>0||CFG.coins>0)&&!confirm("Signing in loads your account's saved progress and replaces this guest's progress (if your account has a save). Continue?"))return;
if(mode=='up'){const n=$('#name').value.trim();if(n.length<2)return err('Pick a username (2+ chars)');
if(user&&user.isAnonymous)await user.linkWithCredential(firebase.auth.EmailAuthProvider.credential(e,p));else await auth.createUserWithEmailAndPassword(e,p);
await auth.currentUser.updateProfile({displayName:n});user=auth.currentUser;await sess();menu()}else await auth.signInWithEmailAndPassword(e,p)}catch(x){err(x)}};
$('#back').onclick=()=>{SFX.click();menu()};
$('#acct').onclick=async()=>{SFX.click();if(user.isAnonymous){$('#err').textContent='';show('auth')}else{presOff&&presOff();await cloudPush();cloud.ready=false;cloud.uid=cloud.p=null;wipe();await auth.signOut()}};
async function menu(){show('menu');ui();LB2.modeShow();LBK.flush();if(!menu.j){menu.j=1;const c=new URLSearchParams(location.search).get('party');if(c){strip();joinParty(c)}}partyRefresh();Game.lobby(true,CFG.skin);EV.welcome();$('#av').style.background=hx(CFG.skin);bustBg($('#av'),CFG.skin);$('#gbtn').style.display=user.isAnonymous?'block':'none';$('#who').textContent=nm().slice(0,14);$('#acct').textContent=user.isAnonymous?'Email sign in / up':'Sign out';
let s=(await db.ref('users/'+user.uid).once('value').catch(()=>null))?.val()||{};
if(s.v!==DATA_VER){s={name:nm(),wins:0,losses:0,v:DATA_VER};db.ref('users/'+user.uid).set(s).catch(()=>{})} /* data reset: win/loss record starts over, the account stays */
else if(s.name!==nm())db.ref('users/'+user.uid+'/name').set(nm()).catch(()=>{});
$('#stats').textContent=`Wins ${s.wins||0} · Losses ${s.losses||0}`}
$('#play').onclick=()=>{SFX.resume();SFX.click();window.touchEnter&&touchEnter();go()};
$('#cancel').onclick=()=>{SFX.click();qStop&&qStop();menu()};
$('#home').onclick=()=>{SFX.click();menu()};$('#again').onclick=()=>{SFX.click();window.touchEnter&&touchEnter();go()};
function begin2(mid,ros,md){begin(mid,null,null,null,ros,false,md)}
const beginAny=v=>{if(!v||!v.mid||(v.t&&now()-v.t>45000))return;if(v.room)return joinRoom(v.md,null,v.rid);v.ros?begin2(v.mid,v.ros,v.md):begin(v.mid,v.uid,v.name,v.skin,null,false,v.md)};
/* match-over screen: tint by result, Victory Royale banner for the winner only, reward chips */
function endFx(r,gx,ex){const e=$('#end'),res=r.draw?'draw':r.win?'win':'lose';e.classList.remove('win','lose','draw');e.classList.add(res);
const vr=$('#vroy');vr.classList.remove('on');void vr.offsetWidth;if(res=='win')vr.classList.add('on');$('#res').style.display=res=='win'?'none':'';
$('#fin').classList.toggle('w1',res=='win'&&!r.ffa);$('#fin').classList.toggle('w2',res=='lose'&&!r.ffa);
const ch=[['xp','+'+gx.x+' XP'],['co','+'+gx.c+' 🪙']];if(r.kills)ch.push(['k','⚔ '+r.kills+(r.kills==1?' kill':' kills')]);if(r.dmg)ch.push(['d','💥 '+r.dmg+' dmg']);
const box=$('#rsub');box.textContent='';const row=document.createElement('div');row.className='chips';ch.forEach(([c,t],i)=>{const s=document.createElement('span');s.className='chip '+c;s.style.animationDelay=(.45+i*.12)+'s';s.textContent=t;row.appendChild(s)});box.appendChild(row);
[['#e1',.75],['#e2',.75]].forEach(([q,d])=>{const el=$(q),t=el.textContent;if(!/^\d+$/.test(t)||+t<1)return;const n=+t,t0=performance.now()+d*1000;el.textContent='0';(function f(){const k=Math.min(1,(performance.now()-t0)/500);if(k<0){requestAnimationFrame(f);return}const v=Math.round(n*(1-Math.pow(1-k,3)));el.textContent=v;if(k<1)requestAnimationFrame(f);else el.textContent=n})()});
const x=String(ex||'').replace(/\s+/g,' ').trim();if(x){const n=document.createElement('div');n.className='rx';n.textContent=x;box.appendChild(n)}}
function begin(mid,opp,oppName,oppSkin,ros,bot,md,room){qStop&&qStop();LB2.afkStop();LB2.sheet(0,1);md=window.MODES[md]?md:'1v1'; /* bot matches pay out exactly like online ones: XP, coins, candy, pass XP, quests */
/* building the arena + characters takes a moment: show a loading card first (and let it paint) instead of freezing on a blank screen */
const tok=begin.tok=(begin.tok||0)+1;show('queue');$('#qtxt').textContent='Loading match…';$('#qbot').style.display='none';$('#cancel').style.display='none';
requestAnimationFrame(()=>setTimeout(()=>{if(tok!==begin.tok)return;$('#cancel').style.display='';show('none');try{Game.start({db,uid:user.uid,name:nm(),mid,opp,oppName,oppSkin,ros,mode:md,bot:!!bot,room,clock:now,skin:SK(),halloween:EV.matchStart(),onCandy:EV.candy,onRound:EV.round,
onGhost:()=>{toast(room?'That room had just finished – finding a new one':'Opponent never connected – searching again');menu();setTimeout(go,400)},
onLeave:x=>{LBK.add(x&&x.kills,x&&x.dmg,bot);if(bot){EV.sync();menu();return}if(x&&x.room){const rw=roomReward(x);if(rw.x||rw.c){CFG.xp+=rw.x;CFG.coins+=rw.c;saveCfg()}EV.sync();menu();toast('You left the room · '+(x.rounds|0)+' rounds · '+(x.kills|0)+' kills'+(rw.x||rw.c?' · +'+rw.x+' XP +'+rw.c+' 🪙':''));return}EV.sync();db.ref('users/'+user.uid).transaction(c=>{c=c||{};c.name=nm();c.v=DATA_VER;c.losses=(c.losses||0)+1;return c});menu()},
onEnd:r=>{LBK.add(r.kills,r.dmg,bot);const pl=r.ffa?r.players-r.place:0,g0=r.room?(rw=>({x:rw.x+(r.win?250:0),c:rw.c+(r.win?50:0)}))(roomReward(r)):r.draw?{x:75+r.me*15,c:12}:r.ffa?(r.win?{x:260,c:50}:{x:60+pl*30,c:8+pl*4}):r.win?{x:150+r.me*20,c:25}:{x:50+r.me*15,c:8},gx={x:Math.round(g0.x),c:Math.round(g0.c)};CFG.xp+=gx.x;CFG.coins+=gx.c;saveCfg();const ex=EV.matchDone(r,gx)+(bot?'  · 🤖 bot match':'');
$('#res').textContent=r.draw?'DRAW':r.win?'VICTORY':'DEFEAT';$('#res').style.color=r.draw?'#ffd23f':r.win?'#38f5c8':'#ff6b81';
$('#winner').textContent=r.draw?'Nobody wins this one':'🏆 '+r.winner+' WINS!';$('#en1').textContent=r.ffa?'Your place':(r.myName||'You');$('#en2').textContent=r.ffa?'players':(r.oppName||'Enemy');$('#e1').textContent=r.ffa?'#'+r.place:r.me;$('#e2').textContent=r.ffa?r.players:r.opp;
$('#rtag').textContent=r.title=='Opponent left'?'OPPONENT LEFT':r.room?(modeOf(r.mode).n.toUpperCase()+' · 100 ROUNDS · '+(r.kills|0)+' KILLS · '+(r.dmg|0)+' DAMAGE'):r.ffa?(modeOf(r.mode).n.toUpperCase()+' · '+((r.first||1)>1?'FIRST TO '+r.first:'LAST ONE STANDING')):'MATCH OVER · FIRST TO '+(r.first||3);endFx(r,gx,ex);show('end');
if(r.draw||bot||r.late||(r.room&&!r.win))return;const f=r.win?'wins':'losses';db.ref('users/'+user.uid).transaction(c=>{c=c||{};c.name=nm();c.v=DATA_VER;c[f]=(c[f]||0)+1;return c})}})}catch(e){console.error('Match failed to start',e);toast('Could not start the match: '+((e&&e.message)||e));qStop=null;menu()}},30))}
function botName(){const A=['Swift','Silent','Lucky','Crimson','Frosty','Rapid','Shadow','Turbo','Cosmic','Sneaky','Mighty','Rogue','Neon','Savage','Clutch','Ghost','Atomic','Wild','Hyper','Iron'],
N=['Falcon','Tiger','Viper','Wolf','Panda','Cobra','Raven','Shark','Dragon','Fox','Hawk','Bear','Lynx','Ninja','Titan','Comet','Storm','Blaze','Pixel','Rider'],
r=a=>a[Math.random()*a.length|0];return r(A)+r(N)+(10+Math.random()*9990|0)}
/* practice bot: runs entirely on this device (no network). Always works, even offline. */
/* what you earn in a 100-round room (also when you leave early): rounds you played, eliminations and damage */
const roomReward=r=>{const rounds=r.rounds|0,k=r.kills|0,d=r.dmg|0;if(!rounds&&!k)return{x:0,c:0};return{x:Math.min(3000,Math.round(rounds*14+k*12+d*.05)),c:Math.min(600,Math.round(rounds*1.5+k*2))}};
function beginBot(md){md=window.MODES[md]?md:CFG.mode;if(md!='1v1'){toast('Bots only play 1v1 – '+modeOf(md).n+' is played with real players');menu();return}const c=[0xff4d4d,0xffa42e,0xb04dff,0x4dffa8,0xff6bd6,0x38f5c8,0xffd23f],M=modeOf(md),me={u:user.uid,n:nm(),s:SK(),t:0},pc=()=>c[Math.random()*c.length|0];
if(md=='1v1'){begin('bot_'+now(),'BOT',botName(),pc(),null,true,'1v1');return}
const ros=[me];let i=0;
if(M.ffa){for(;i<M.bots;i++)ros.push({u:'BOT'+i,n:botName(),s:pc(),t:i+1})}
else{for(let k=1;k<M.size;k++)ros.push({u:'BOT'+i++,n:botName(),s:0,t:0});for(let k=0;k<M.size;k++)ros.push({u:'BOT'+i++,n:botName(),s:pc(),t:1})}
begin('bot_'+now(),null,null,null,ros,true,md)}
/* 1v1 queue. One waiting slot (lobby/waiting) claimed with a transaction. Fixes: invite is cleared BEFORE queueing (it used to be cleared after, which could eat a
   match that had just been made), the disconnect hook is cancelled on cancel (it used to delete somebody else's waiting entry), and a bot match starts if
   nobody is online (after ~2s) or nobody joins within 12s. */
function find(){if(!conn){toast('Offline – starting a practice match vs a bot');return beginBot()}show('queue');$('#qtxt').textContent='Searching for opponent…';$('#qbot').style.display='none';
const uid=user.uid,w=db.ref('lobby/waiting'),inv=db.ref('invites/'+uid);let hb,tm,done=0,sec=0,queued=0,pend=null,tries=0;
const stop=()=>{done=1;clearInterval(hb);clearInterval(tm);if(pend){clearTimeout(pend.to);pend=null}inv.off();$('#qbot').style.display='none';if(queued){queued=0;w.onDisconnect().cancel().catch(()=>{});w.transaction(c=>c&&c.uid===uid?null:undefined).catch(()=>{})}if(qStop===stop)qStop=null;if(qBot===toBot)qBot=null};
qStop=stop;
const toBot=()=>{if(done)return;$('#qtxt').textContent='Starting bot match…';stop();beginBot()};
qBot=toBot;
/* SEARCH. Either we find somebody already waiting (we take the slot, create the match and invite them) or we become the waiting player ourselves.
   v22 fixes: the invited player now ANSWERS (ack) so the one who invited never walks into a match nobody joined; if there is no answer the slot was a ghost and we search again;
   the heartbeat can no longer re-create a half-empty slot; the bot only takes over late (and never while an invite is in flight), so two players who queue a few seconds apart still meet. */
const claim=async()=>{if(done||pend)return;let taken=null,r=null;tries++;
for(let t=0;t<6&&!done;t++){taken=null;r=await w.transaction(cur=>{if(cur&&cur.uid&&cur.uid!==uid&&now()-cur.t<20000){taken=cur;return null}taken=null;return{uid,name:nm(),skin:SK(),t:now()}});if(r.committed)break}
if(done){if(r&&r.committed&&!taken)w.remove().catch(()=>{});return}if(!r||!r.committed)throw new Error('busy');
if(taken){queued=0;const mid=`${taken.uid}_${uid}_${now()}`;$('#qtxt').textContent='Opponent found – connecting…';
await db.ref('matches/'+mid+'/meta').set({a:taken.uid,b:uid});await db.ref('invites/'+taken.uid).set({mid,uid,name:nm(),skin:SK(),t:now()});if(done)return;
const go=()=>{if(done)return;const p=pend;pend=null;p&&clearTimeout(p.to);begin(mid,taken.uid,taken.name,taken.skin)};
pend={mid,go,to:setTimeout(async()=>{if(done||!pend||pend.mid!==mid)return;pend=null;let ok=false;try{ok=(await db.ref('matches/'+mid+'/p/'+taken.uid).once('value')).exists()}catch(e){}
if(done)return;if(ok){begin(mid,taken.uid,taken.name,taken.skin);return}
/* nobody answered: that waiting entry was a ghost. Search again instead of loading into an empty match */
claim().catch(()=>{})},4500)}}
else{if(!queued){queued=1;w.onDisconnect().remove();clearInterval(hb);hb=setInterval(()=>{if(!done&&queued)w.transaction(c=>c&&c.uid===uid?Object.assign({},c,{t:now()}):undefined).catch(()=>{})},6000)}}};
(async()=>{try{await Promise.race([inv.remove().catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);if(done)return;
inv.on('value',s=>{const v=s.val();if(!v||done)return;
if(v.ack){if(pend&&pend.mid===v.ack){inv.remove();pend.go()}return} /* the player we invited answered */
if(!v.mid)return;inv.remove();
if(v.t&&now()-v.t>25000)return; /* old invite from a match that is long gone */
if(!v.room&&!v.ros&&v.uid)db.ref('invites/'+v.uid).set({ack:v.mid,t:now()}).catch(()=>{}); /* tell the other player we are really here */
beginAny(v)});
await claim()}
catch(e){if(!done){toast('Matchmaking unavailable – starting a bot match');toBot()}}})();
/* the timer runs from the very start, so the bot is available even if matchmaking hangs or errors.
   Bot offer button after 2s. Automatic bot: after 3s if nobody else is online, otherwise after 15s (and never while we are connecting to a found opponent). */
tm=setInterval(()=>{if(done)return;sec++;const others=Math.max(0,online-1);if(pend){return}if(!$('#qtxt').textContent.startsWith('Starting'))$('#qtxt').textContent=`Searching for opponent… ${sec}s · ${others} other player${others==1?'':'s'} online`;if(sec>=2)$('#qbot').style.display='block';
if((others==0&&sec>=3)||sec>=15){$('#qtxt').textContent='No opponent found – starting a bot match…';toBot()}},1000)}
$('#qbot').onclick=()=>{SFX.click();qBot&&qBot()};

// ---- lobby extras
$('#gbtn').onclick=async()=>{SFX.click();const p=new firebase.auth.GoogleAuthProvider();try{
if(user.isAnonymous){try{await user.linkWithPopup(p)}catch(e){if(e.code=='auth/credential-already-in-use'&&e.credential)await auth.signInWithCredential(e.credential);else throw e}}else await auth.signInWithPopup(p);
user=auth.currentUser;const g=user.providerData.find(x=>x.providerId=='google.com');if(g&&g.displayName&&user.displayName!=g.displayName)await user.updateProfile({displayName:g.displayName});await sess();menu()}catch(e){if(e.code!='auth/popup-closed-by-user')alert((e.message||e).replace('Firebase: ',''))}};
$('#edit').onclick=async()=>{SFX.click();const n=prompt('New username',nm());if(n&&n.trim().length>=2){await user.updateProfile({displayName:n.trim().slice(0,14)});menu()}};
$('#gear').onclick=()=>{SFX.click();$('#settings').classList.add('on');try{fpMark()}catch(e){}};
document.querySelectorAll('.modal .close').forEach(b=>b.onclick=()=>{SFX.click();document.querySelectorAll('.modal').forEach(x=>x.classList.remove('on'))});
$('#sens').value=CFG.sens;$('#vol').value=CFG.vol;$('#mus').checked=CFG.music;
$('#sens').oninput=e=>{CFG.sens=+e.target.value;saveCfg()};$('#vol').oninput=e=>{CFG.vol=+e.target.value;SFX.setVol(CFG.vol);saveCfg()};$('#mus').onchange=e=>{CFG.music=e.target.checked;SFX.music(CFG.music);saveCfg()};
const HWL=['OFF','LITE','FULL'],hwShow=()=>{$('#hwfx').textContent=HWL[CFG.hwfx===undefined?2:CFG.hwfx]};hwShow();$('#hwfx').onclick=()=>{SFX.click();CFG.hwfx=((CFG.hwfx===undefined?2:CFG.hwfx)+2)%3;saveCfg();hwShow();toast('Spooky effects: '+HWL[CFG.hwfx]+(CFG.hwfx<2?' (applies next match)':''))};
const QN=['Lowest Quality','Low Quality','Normal','Higher Quality'];
function qShow(){$('#qlv').textContent=QN[CFG.gq];$('#qln').textContent=Game.qinfo(CFG.gq)}
if(window.TOUCH){const r=$('#ql').closest('.srow');r&&(r.style.display='none');$('#qln').style.display='none'}$('#ql').value=CFG.gq;qShow();$('#ql').oninput=e=>{CFG.gq=+e.target.value;saveLocal();const r=Game.quality(CFG.gq);qShow();if(r&&r.reload)toast('Anti-aliasing changes after you reload the page')};
CTL.build($('#kbl'),$('#kbreset'));
/* ---- controller settings + device badge ---- */
{const cn=(id,k,d,f)=>{const e=$('#'+id),o=$('#'+id+'v');if(!e)return;e.value=CFG[k]==null?d:CFG[k];const s=()=>{o.textContent=f?f(+e.value):e.value};s();e.oninput=()=>{CFG[k]=+e.value;s();saveLocal()}};
cn('psens','psens',1,v=>v.toFixed(1)+'×');cn('pdz','pdz',.18,v=>Math.round(v*100)+'%');
[['pinv','pinv',0],['prum','prum',1]].forEach(([id,k,d])=>{const e=$('#'+id);e.checked=(CFG[k]==null?d:CFG[k])?true:false;e.onchange=()=>{CFG[k]=e.checked?1:0;saveLocal()}});
const DV={kbm:'🖱 Mouse & keyboard',pad:'🎮 Controller',touch:'📱 Touch'},leg=()=>{$('#devb').textContent=DV[INPUT.dev]+(INPUT.dev=='pad'?' · '+({xbox:'Xbox',ps:'PlayStation',switch:'Switch',generic:'Gamepad'})[INPUT.type]:'');
$('#padmap').innerHTML=INPUT.layout().map(([a,b])=>`<div class="pm"><span>${a}</span><b>${b}</b></div>`).join('');
$('#padhint').textContent=`${INPUT.layoutMap.move.split(' ')[0]===''?'':''}D-pad / stick: move · ${INPUT.label('jump')}: select · ${INPUT.label('build')}: back · LB / RB: tabs · ${INPUT.label('wnext')}: game modes · ${INPUT.type=='ps'?'Options':INPUT.type=='switch'?'+':'Menu'}: play`};
leg();INPUT.on(()=>{leg();CTL.refresh()})}
$('#fs').onclick=()=>{const d=document.documentElement,rq=d.requestFullscreen||d.webkitRequestFullscreen;if(!rq)return toast('Fullscreen is not supported here – on iPhone use Share > Add to Home Screen');document.fullscreenElement||document.webkitFullscreenElement?(document.exitFullscreen||document.webkitExitFullscreen).call(document):rq.call(d)};
let fr=0;(function f(){fr++;requestAnimationFrame(f)})();setInterval(()=>{$('#fps').textContent='FPS: '+fr;fr=0},1000);
setInterval(()=>{if(!user||!conn)return;const t=performance.now();db.ref('presence/'+user.uid).set(true).then(()=>{$('#ping').textContent='Ping: '+Math.round(performance.now()-t)+' ms'}).catch(()=>{})},3000);

// ---- account cloud save: only for logged-in accounts (guests keep their progress on this device). One JSON string per user at saves/<uid>.
const cloud={ready:false,uid:null,tm:0,p:null};
const wipe=()=>{PK.forEach(k=>delete CFG[k]);Object.assign(CFG,fresh());CFG.own='';try{localStorage.cfg=JSON.stringify(CFG)}catch(e){}EV.reload();CTL.refresh()}; /* local progress back to a new-player state */
/* what happens after every login: is this account on the backend admin list? -> load its cloud save (owner perks apply on top) -> start the gift inbox */
async function sess(){await ADM.check(user);await cloudAttach();ADM.listen(user)}
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
/* ---- first-person settings (all saved in this browser) ---- */
const FPS=[['fplrs','fplrv','fplr',0,v=>(v>0?'+':'')+v+'°'],['fplxs','fplxv','fplx',0,v=>(v>0?'+':'')+v],['fplys','fplyv','fply',0,v=>(v>0?'+':'')+v],['fplzs','fplzv','fplz',0,v=>(v>0?'+':'')+v],['bsn','bsnv','bsens',100,v=>Math.round(v)+'%'],['fpf','fpfv','fpfov',90,v=>Math.round(v)+'°'],['fpsw','fpswv','fpsw',100,v=>Math.round(v)+'%'],['fpbo','fpbov','fpbob',100,v=>Math.round(v)+'%'],
['fpgx','fpgxv','fpgx',0,v=>(v>0?'+':'')+v],['fpgy','fpgyv','fpgy',0,v=>(v>0?'+':'')+v],['fpgz','fpgzv','fpgz',0,v=>(v>0?'+':'')+v]];
const fpNum=(k,d)=>CFG[k]!=null&&Number.isFinite(+CFG[k])?+CFG[k]:d;
function fpSync(){$('#fpv').checked=!!CFG.fp;$('#fpar').checked=fpNum('fparms',1)!==0;FPS.forEach(([i,o,k,d,f])=>{const v=fpNum(k,d);$('#'+i).value=v;$('#'+o).textContent=f(v)})}
$('#fpv').onchange=e=>{CFG.fp=e.target.checked;saveCfg()};$('#fpar').onchange=e=>{CFG.fparms=e.target.checked?1:0;saveCfg()};
FPS.forEach(([i,o,k,d,f])=>{$('#'+i).oninput=e=>{CFG[k]=+e.target.value;saveCfg();$('#'+o).textContent=f(+e.target.value)}});
const FPP={bal:{fpfov:90,fpsw:100,fpbob:100,fparms:1,fpgx:0,fpgy:0,fpgz:0},cin:{fpfov:84,fpsw:135,fpbob:130,fparms:1,fpgx:1,fpgy:0,fpgz:0},comp:{fpfov:105,fpsw:45,fpbob:35,fparms:1,fpgx:0,fpgy:1,fpgz:-1}};
const fpMark=()=>document.querySelectorAll('#fppre button').forEach(b=>{const p=FPP[b.dataset.p];b.classList.toggle('on',Object.keys(p).every(k=>+(CFG[k]==null?FPP.bal[k]:CFG[k])===p[k]))});
document.querySelectorAll('#fppre button').forEach(b=>b.onclick=()=>{SFX.click();Object.assign(CFG,FPP[b.dataset.p]);saveCfg();fpSync();fpMark();toast('First person: '+b.textContent)});
document.querySelectorAll('#settings input[type=range]').forEach(i=>i.addEventListener('input',()=>setTimeout(fpMark,0)));
$('#fpreset').onclick=()=>{SFX.click();CFG.bsens=100;CFG.fplx=CFG.fply=CFG.fplz=CFG.fplr=0;CFG.fpfov=90;CFG.fpsw=100;CFG.fpbob=100;CFG.fparms=1;CFG.fpgx=CFG.fpgy=CFG.fpgz=0;saveCfg();fpSync();fpMark();toast('First-person settings reset')};
fpSync();
{const g=$('#sbmode'),sy=()=>g.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.m===(CFG.sbm==='toggle'?'toggle':'hold')));sy();g.onclick=e=>{const b=e.target.closest('button');if(!b)return;SFX.click();CFG.sbm=b.dataset.m==='toggle'?'toggle':'hold';saveCfg();sy()}}
$('#dmgnt').checked=CFG.dmgn!==false;$('#dmgnt').onchange=e=>{CFG.dmgn=e.target.checked;saveCfg()};
$('#sfp').checked=CFG.hud!==false;$('#sfp').onchange=e=>{CFG.hud=e.target.checked;saveCfg();ui()};$('#fs2').onclick=()=>$('#fs').click();
// ---- party (invite a friend for a private 1v1 / to be teammates in 2v2)
let party=null,pOff=null;
const strip=()=>{try{const u=new URL(location.href);if(u.searchParams.has('party')){u.searchParams.delete('party');history.replaceState(null,'',u.pathname+(u.search||'')+u.hash)}}catch(e){}}; /* invite link is one-shot: a reload must not re-join */
function pui(){const m=party?party.m:{},ids=Object.keys(m).sort((a,b)=>(a==party.lead?-1:0)-(b==party.lead?-1:0)||(a<b?-1:1));$('#pnone').style.display=party?'none':'block';$('#pin').style.display=party?'block':'none';$('#pc').textContent=party?party.code:'';
$('#pin .sub').textContent=party&&party.lead!=user.uid?'Waiting for the party leader to press PLAY.':'The party leader presses PLAY to start the match.';
{const box=$('#pslots');box.innerHTML='';const amLead=party&&party.lead==user.uid;
const mkSlot=id=>{const el=document.createElement('div');el.className='slot'+(id?'':' empty');el.innerHTML='<i></i><b></b><small></small>';const ic=el.querySelector('i');
 if(id){ic.style.background=hx(m[id].skin);bustBg(ic,m[id].skin);el.querySelector('b').textContent=m[id].name+(id==user.uid?' (you)':'');el.querySelector('small').textContent=id==party.lead?'👑 LEADER':'MEMBER';
  if(amLead&&id!=user.uid){const a=document.createElement('div');a.className='pact';a.innerHTML='<button data-k="lead" title="Make leader">👑</button><button data-k="kick" title="Remove from party">✕</button>';a.dataset.u=id;el.appendChild(a)}}
 else{ic.className='em';ic.textContent='+';el.querySelector('b').textContent='Open slot'}return el};
ids.forEach(id=>box.appendChild(mkSlot(id)));if(party&&ids.length<PARTY_MAX)box.appendChild(mkSlot(null));
const pc=$('#pcount');if(pc)pc.textContent=party?ids.length+' / '+PARTY_MAX+' players':'';
const md=CFG.mode,chk=party&&ids.length>1?partyCheck(md,ids.length):null,pr=$('#prule');if(pr){pr.style.display=chk?'block':'none';pr.className='prule '+(chk&&chk.ok?'ok':'bad');pr.textContent=chk?(chk.ok?modeOf(md).n+': '+({solo:'everyone plays on their own',queue:'your party queues together',private:'private match – your party fills both sides',room:'your party joins the same room'}[chk.kind]||'ready'):'⚠ '+chk.why):''}}
const o=ids.find(i=>i!=user.uid),f=$('#friend');f.classList.toggle('has',!!o);f.textContent=ids.length>2?String(ids.length):o?m[o].name.slice(0,2).toUpperCase():'+';f.style.background=o?hx(m[o].skin):'';f.title=o?(ids.length>1?ids.length+' players in your party':'')+'':'Invite to party';Game.partner(o?{name:m[o].name,skin:m[o].skin}:null)}
function dropParty(){const p=pOff;pOff=null;party=null;p&&p();pui()}
function attach(code,lead){const r=db.ref('parties/'+code),inv=db.ref('invites/'+user.uid),me=r.child('m/'+user.uid);let n=0,last=null;
if(lead)r.onDisconnect().remove();else me.onDisconnect().remove();
r.on('value',s=>{const v=s.val();if(!v||!(v.m||{})[user.uid]){if(party&&party.code===code){if(qStop){qStop();menu()}dropParty();toast(v?'You were removed from the party':'Party closed')}return}
last=v;if(v.lead==user.uid&&!lead){lead=true;r.onDisconnect().remove();me.onDisconnect().cancel().catch(()=>{});toast('You are the party leader now')}else if(v.lead!=user.uid&&lead){lead=false;r.onDisconnect().cancel().catch(()=>{});me.onDisconnect().remove()}
const was=n;n=Object.keys(v.m).length;party={code,lead:v.lead,m:v.m};
if(was>n&&qStop){qStop();menu();toast('A party member left – search cancelled')} /* never keep searching with a roster that no longer exists */
pui()});
let live=true;inv.remove().catch(()=>{}).then(()=>{if(!live)return;inv.on('value',s=>{const v=s.val();if(v&&live&&party&&party.code===code&&party.lead!=user.uid){inv.remove();$('#party').classList.remove('on');beginAny(v)}})}); /* stale invites from old matches are wiped before listening */
pOff=()=>{live=false;r.off();inv.off();if(lead){r.onDisconnect().cancel().catch(()=>{});const oth=Object.keys((last&&last.m)||{}).filter(u=>u!=user.uid).sort();if(oth.length)r.update({lead:oth[0],['m/'+user.uid]:null}).catch(()=>{});else r.remove().catch(()=>{})}else{me.onDisconnect().cancel().catch(()=>{});me.remove().catch(()=>{})}}}
const mem=()=>({name:nm(),skin:SK()});
function partyRefresh(){if(party&&party.m[user.uid]){const m=mem(),c=party.m[user.uid];if(c.name!==m.name||c.skin!==m.skin)db.ref('parties/'+party.code+'/m/'+user.uid).set(m).catch(()=>{})}}
const pcode=()=>{let c='';const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let i=0;i<5;i++)c+=A[Math.random()*A.length|0];return c};
$('#pnew').onclick=async()=>{SFX.click();if(!conn)return toast('You are offline');if(party)return;
for(let t=0;t<4;t++){const code=pcode();try{await db.ref('parties/'+code).set({lead:user.uid,m:{[user.uid]:mem()}});if(party)return;attach(code,true);return}catch(e){if(t==3)toast('Could not create party: '+(e.message||e).toString().replace('permission_denied','permission denied (publish database.rules.json)'))}}};
async function joinParty(code){code=(code||'').toUpperCase().trim();if(code.length<4)return toast('Enter a party code');if(!conn)return toast('You are offline');if(party&&party.code===code){$('#party').classList.add('on');return}
const r=db.ref('parties/'+code),v=(await r.once('value').catch(()=>null))?.val();
if(!v||!v.lead)return toast('Party not found');if(!(v.m||{})[user.uid]&&Object.keys(v.m||{}).length>=PARTY_MAX)return toast('Party is full ('+PARTY_MAX+' players)');
if(party){if(qStop){qStop();menu()}dropParty()}
try{await r.child('m/'+user.uid).set(mem())}catch(e){return toast('Could not join (party full?)')}
attach(code,v.lead==user.uid);$('#party').classList.add('on');pui()}
$('#pslots').onclick=e=>{const b=e.target.closest('button[data-k]');if(!b||!party||party.lead!=user.uid)return;const u=b.parentNode.dataset.u,r=db.ref('parties/'+party.code);SFX.click();
if(b.dataset.k=='kick')r.child('m/'+u).remove().catch(()=>toast('Could not remove (publish database.rules.json)'));else r.child('lead').set(u).catch(()=>toast('Could not hand over (publish database.rules.json)'))};
$('#pjoin').onclick=()=>{SFX.click();joinParty($('#pcode').value)};
$('#pcopy').onclick=()=>{SFX.click();const l=location.origin.replace('null','')+location.pathname+'?party='+party.code;(navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast('Invite link copied!'),()=>prompt('Copy this invite link',l))};
$('#pleave').onclick=()=>{SFX.click();if(qStop){qStop();menu()}dropParty();toast('Left party')};
$('#friend').onclick=()=>{SFX.click();pui();$('#party').classList.add('on')};
function go(){const uids=party?Object.keys(party.m):[user.uid],n=uids.length,duo=n>1,md=CFG.mode;
if(md=='trainer')return beginTrainer(CFG.tdrill||'grid');
if(duo){const pc=partyCheck(md,n);if(!pc.ok)return toast(pc.why);if(party.lead!=user.uid)return toast('Waiting for the party leader to press Play');
 if(pc.kind=='private')return md=='1v1'?pmatch('1v1'):pmatchN(md);
 if(pc.kind=='room')return joinRoom(md,uids.filter(i=>i!=user.uid));
 return findN(md,uids)}
if(md=='1v1')return find();
if(modeOf(md).room)return joinRoom(md,null);
return findN(md,[user.uid])}
/* ---- team / free-for-all matchmaking (2v2, 3v3, Box Fights, Zone Wars). lobby2/q holds waiting groups (1 solo player or a 2-player party) tagged with their mode.
   Whoever arrives and completes a valid match (right player count, groups splittable into two equal teams) creates it and writes an invite with the full roster for everyone else.
   There is a bot fallback for every mode (button after 1s, automatic when nobody else is online). ---- */
function packT(gs,S){const A=[],B=[],go=i=>{if(i==gs.length)return A.length==S&&B.length==S;const g=gs[i].m;
if(A.length+g.length<=S){A.push(...g);if(go(i+1))return true;A.length-=g.length}if(B.length+g.length<=S){B.push(...g);if(go(i+1))return true;B.length-=g.length}return false};
return go(0)?[A,B]:null}
function planT(mine,others,S){const need=S*2;let out=null;const dfs=(i,tot,ch)=>{if(out)return;if(tot==need){const t=packT(ch.slice().sort((a,b)=>b.m.length-a.m.length),S);if(t)out={ch:ch.slice(),teams:t};return}
if(i>=others.length||tot>need)return;ch.push(others[i]);dfs(i+1,tot+others[i].m.length,ch);ch.pop();dfs(i+1,tot,ch)};dfs(0,mine.m.length,[mine]);return out}
async function findN(md,uids){const M=modeOf(md);if(!conn){toast('You are offline – '+M.n+' needs real players (bots only play 1v1)');return menu()}
show('queue');$('#qtxt').textContent='Searching for a '+M.n+' match…';$('#qbot').style.display='none';
const me=user.uid,q=db.ref('lobby2/q'),mine=q.child(me),inv=db.ref('invites/'+me),duo=uids.length>1;let hb,tm,done=0,formed=null,sec=0;
const mem=uids.map(u=>u==me?{u,n:nm(),s:SK()}:{u,n:party.m[u].name,s:party.m[u].skin});
/* everything this search started lives in these two functions: stop() cleans it ALL up (timers, listeners, queue entry) and can run any number of times */
const stop=()=>{done=1;clearInterval(hb);clearInterval(tm);inv.off();$('#qbot').style.display='none';mine.onDisconnect().cancel().catch(()=>{});mine.remove().catch(()=>{});if(qStop===stop)qStop=null;if(qBot===toBot)qBot=null};
const toBot=()=>{if(done)return;stop();beginBot(md)};
qStop=stop;qBot=null;
tm=setInterval(()=>{if(done)return;sec++;const others=Math.max(0,online-1);$('#qtxt').textContent=`Searching for a ${M.n} match${duo?' with your party':''}… ${sec}s · ${others} other player${others==1?'':'s'} online`;

if(duo&&sec>=90){stop();menu();toast('No '+M.n+' match found for your party – try again or pick another mode')}},1000);
try{await Promise.race([inv.remove().catch(()=>{}),new Promise(r=>setTimeout(r,2500))]);if(done)return;
let r=null;for(let t=0;t<4&&!done;t++){
r=await q.transaction(cur=>{const t=now(),Q={};formed=null;
for(const k in cur||{}){const e=cur[k];if(k!==me&&e&&Array.isArray(e.m)&&e.m.length&&e.m.length<4&&t-e.t<20000)Q[k]=e} /* stale / broken entries are dropped here */
const keys=Object.keys(Q).filter(k=>(Q[k].md||'2v2')==md).sort((a,b)=>Q[a].t-Q[b].t),others=keys.map(k=>({k,m:Q[k].m})),mineG={k:me,m:mem};
if(M.ffa){let tot=mem.length;const pick=[mineG];for(const o of others){if(tot+o.m.length<=M.max){pick.push(o);tot+=o.m.length}}
 if(tot>=M.min){formed={ffa:pick.map(o=>o.m)};pick.forEach(o=>{if(o.k!==me)delete Q[o.k]});return Object.keys(Q).length?Q:null}}
else{const pl=planT(mineG,others,M.size);if(pl){formed={teams:pl.teams};pl.ch.forEach(o=>{if(o.k!==me)delete Q[o.k]});return Object.keys(Q).length?Q:null}}
Q[me]={m:mem,t,md};return Q});
if(r.committed)break}
if(done){if(r&&r.committed&&!formed)mine.remove().catch(()=>{});return}
if(!r||!r.committed)throw new Error('busy');
if(formed){const ros=formed.ffa?formed.ffa.flat().map((p,i)=>({...p,t:i})):[...formed.teams[0].map(p=>({...p,t:0})),...formed.teams[1].map(p=>({...p,t:1}))],mid=ros.map(p=>p.u).join('_')+'_'+now();
await db.ref('matches/'+mid+'/meta').set({a:ros[0].u,b:ros[1].u});
await Promise.all(ros.filter(p=>p.u!==me).map(p=>db.ref('invites/'+p.u).set({mid,ros,md,t:now()})));
if(done)return;return begin2(mid,ros,md)}
mine.onDisconnect().remove();hb=setInterval(()=>mine.transaction(c=>c?{...c,t:now()}:undefined).catch(()=>{}),8000);
inv.on('value',s=>{const v=s.val();if(v&&!done){inv.remove();beginAny(v)}})}
catch(e){if(done)return;stop();menu();toast('Matchmaking error: '+String(e.message||e).replace('permission_denied','permission denied (publish database.rules.json)'))}}
async function pmatchN(md){const ids=Object.keys(party.m).sort((a,b)=>(a==party.lead?-1:0)-(b==party.lead?-1:0)||(a<b?-1:1)),ros=ids.map((u,i)=>({u,n:u==user.uid?nm():party.m[u].name,s:u==user.uid?SK():party.m[u].skin,t:i%2})),mid=ros.map(p=>p.u).join('_')+'_'+now();
try{await db.ref('matches/'+mid+'/meta').set({a:ros[0].u,b:ros[1].u});await Promise.all(ros.filter(p=>p.u!==user.uid).map(p=>db.ref('invites/'+p.u).set({mid,ros,md,t:now()})));begin2(mid,ros,md)}catch(e){toast(e.message)}}
async function pmatch(md){const o=Object.keys(party.m).find(i=>i!=user.uid),mid=`${user.uid}_${o}_${now()}`;try{await db.ref('matches/'+mid+'/meta').set({a:user.uid,b:o});await db.ref('invites/'+o).set({mid,uid:user.uid,name:nm(),skin:SK(),md,t:now()});begin(mid,o,party.m[o].name,party.m[o].skin,null,false,md)}catch(e){toast(e.message)}}

/* ---- open rooms (Box Fights, Zone Wars): 100 rounds, people join and leave any time, no bots.
   rooms/<mode>/<roomId> = {mid, t0, hb, m:{uid:lastSeen}}. One transaction on rooms/<mode> picks the fullest room that still has space (or makes a new one), so two people who press
   PLAY at the same moment always end up in the SAME room. The game inside the room (matches/<mid>) runs its own round clock, see "OPEN ROOMS" in game.js. ---- */
function roomHold(md,rid){const m=db.ref(`rooms/${md}/${rid}/m/${user.uid}`),h=db.ref(`rooms/${md}/${rid}/hb`);m.onDisconnect().remove();
const beat=()=>{m.set(now()).catch(()=>{});h.set(now()).catch(()=>{})},iv=setInterval(beat,10000);beat();
return()=>{clearInterval(iv);m.onDisconnect().cancel().catch(()=>{});m.remove().catch(()=>{})}}
async function joinRoom(md,partner,rid0){const M=modeOf(md);
if(!conn){toast(M.n+' needs an internet connection (there are no bots in this mode)');return}
show('queue');$('#qtxt').textContent='Finding a '+M.n+' room…';$('#qbot').style.display='none';
const me=user.uid;let done=0,held=null,pick=null;
const stop=()=>{done=1;if(held){held();held=null}if(qStop===stop)qStop=null};qStop=stop;
try{const r=await db.ref('rooms/'+md).transaction(cur=>{pick=null;const t=now(),R=cur?JSON.parse(JSON.stringify(cur)):{},live={};
 for(const k in R){const e=R[k];if(!e||!e.mid||!e.hb||t-e.hb>30000)continue;const m=e.m||{};for(const u in m)if(u===me||t-m[u]>90000)delete m[u];if(!Object.keys(m).length)continue;e.m=m;live[k]=e}
 const cnt=k=>Object.keys(live[k].m).length;let best=null;
 if(rid0&&live[rid0]&&cnt(rid0)<M.max)best=rid0;else for(const k in live)if(cnt(k)<M.max&&(best==null||cnt(k)>cnt(best)))best=k;
 if(best){live[best].m[me]=t;live[best].hb=t;pick={rid:best,mid:live[best].mid}}
 else{const x=Math.random().toString(36).slice(2,6),rid='r'+t.toString(36)+x,mid='rm_'+md+'_'+t+'_'+x;live[rid]={mid,t0:t,hb:t,m:{[me]:t}};pick={rid,mid}}
 return live});
 if(done){if(r&&r.committed&&pick)db.ref(`rooms/${md}/${pick.rid}/m/${me}`).remove().catch(()=>{});return}
 if(!r.committed||!pick)throw new Error('busy');
 held=roomHold(md,pick.rid);
 if(partner)await Promise.all([].concat(partner).map(u=>db.ref('invites/'+u).set({mid:pick.mid,rid:pick.rid,md,room:1,t:now()}).catch(()=>{})));
 if(done)return;
 const off=held,rid=pick.rid;held=null; /* the game owns the membership from here on */
 begin(pick.mid,null,null,null,null,false,md,{md,rid,off,close:()=>db.ref(`rooms/${md}/${rid}`).remove().catch(()=>{})})}
catch(e){if(done)return;stop();menu();toast('Could not join a room: '+String(e.message||e).replace('permission_denied','permission denied (publish database.rules.json)'))}}
