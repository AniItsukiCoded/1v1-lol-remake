/* ================= TERMS OF SERVICE + IP LOGGING =================
   - Nobody gets past the loading screen (no sign-in, no menu, no matches) until they have accepted the Terms. Acceptance is stored per browser
     (localStorage 'tos_v') and is asked again whenever TOSV below is raised.
   - After acceptance (and again on every sign-in) the player's IP address, approximate location and basic device info are written to
     iplogs/<uid> in the Realtime Database. Only owners (ownerUids/<uid> = true) can read it (see database.rules.json).
   - The IP + location come from a public lookup service called from the player's browser (ipwho.is, fallback ipapi.co, fallback ipify).
     That is "client reported": fine for abuse / ban / legal use, but a modified browser could fake it. For a tamper-proof IP, log it from a
     server / Cloud Function instead.
   TOS.ensure()  -> promise, resolves once accepted.      TOS.log(user) -> write the log entry.      TOS.open() -> read the terms again.      */
const TOS=(()=>{
const TOSV=1,SK='tos_v';
const TEXT=[
['1. Agreement','By pressing "I ACCEPT & PLAY" you agree to these Terms. If you do not agree, you may not use 1v1.Arena. This is a free browser game made by a small team; it is provided "as is", with no promise that it will always be online or bug free.'],
['2. Who may play','You must be at least 13 years old, or have a parent or guardian\'s permission to play and to let us collect the information described below.'],
['3. IP address and information we log (for legal and security reasons)','FOR LEGAL AND SECURITY REASONS, THE SITE LOGS THE IP ADDRESS OF EVERY PLAYER, GUESTS INCLUDED. Together with it we log: your username and account ID, whether you are a guest or signed in, the approximate location of your IP address (city / region / country), your internet provider, your browser, device type, screen size, language and time zone, and the dates and times you visit. To find your IP and location, your browser contacts a third-party IP lookup service, which receives your IP address the same way any website you visit does.'],
['4. Why we log it','To keep the game safe and fair: stopping hackers and cheaters, banning repeat offenders, investigating attacks on the site, preventing abuse and ban evasion, and answering lawful requests from authorities. We do not sell this data.'],
['5. Who can see it','Only the site owners can open the logs. We keep them for as long as needed for the purposes above, and may share them with law enforcement or service providers when the law requires it or to protect the site and its players.'],
['6. Fair play','Do not hack, cheat, exploit bugs, tamper with the page or its data, fake owner / admin status, give yourself items or currency, attack the database, or help anyone else do so. Tampering is detected automatically and logged. We may lock, reset, restrict or permanently ban any account, device or IP, remove items, coins, candy, levels and rankings, and report serious attacks to the authorities. We may reset all player progress at any time.'],
['7. Guests and accounts','Guests can play the game modes and choose a username, but do not earn levels, XP, coins, candy, skins, passes or rewards and do not appear on leaderboards. Sign in or create an account to save progress. Items, coins and candy have no real-world value and cannot be bought, sold or traded for money.'],
['8. Behaviour','Keep usernames and behaviour respectful. No hate, harassment, threats, spam or impersonating staff. We may rename or remove accounts that break this rule.'],
['9. Changes and contact','We may change these Terms or the game at any time; if the Terms change you will be asked to accept them again. Questions or removal requests: ask the site owner of the place where you found this game.']
];
let acc=false,wait=null,ov=null;
try{acc=+localStorage.getItem(SK)===TOSV}catch(_){}
function css(){if(document.getElementById('tosCss'))return;const s=document.createElement('style');s.id='tosCss';
 s.textContent='#tos{position:fixed;inset:0;z-index:2000000;background:#0b0f24f2;display:flex;align-items:center;justify-content:center;padding:14px;font-family:Nunito,system-ui,sans-serif;color:#fff}'+
 '#tos .tc{width:min(720px,100%);max-height:94vh;display:flex;flex-direction:column;background:#151b3d;border:2px solid #ffffff22;border-radius:18px;box-shadow:0 20px 60px #000a;overflow:hidden}'+
 '#tos h2{margin:0;padding:16px 20px 6px;font:400 28px "Lilita One",Nunito,sans-serif;letter-spacing:.03em}'+
 '#tos .ts{padding:0 20px 10px;opacity:.75;font-weight:800;font-size:13px}'+
 '#tos .tb{overflow:auto;padding:4px 20px 12px;font-size:14px;line-height:1.5;font-weight:700;color:#d8def5}'+
 '#tos .tb h3{margin:14px 0 4px;font-size:15px;color:#ffd23f}#tos .tb p{margin:0}'+
 '#tos .tb .ip{background:#ff4d5e22;border:1px solid #ff4d5e66;border-radius:10px;padding:10px 12px;margin-top:6px}'+
 '#tos .tf{padding:12px 20px 16px;border-top:1px solid #ffffff1a;display:flex;flex-direction:column;gap:10px}'+
 '#tos label{display:flex;gap:10px;align-items:flex-start;font-weight:800;font-size:14px;cursor:pointer}#tos label input{width:20px;height:20px;margin:0;flex:none}'+
 '#tos .tbt{display:flex;gap:10px;flex-wrap:wrap}'+
 '#tos button{flex:1;min-width:150px;border:0;border-radius:12px;padding:13px 16px;font:400 20px "Lilita One",Nunito,sans-serif;letter-spacing:.04em;cursor:pointer;color:#fff;background:linear-gradient(180deg,#3ddc84,#1c9a57)}'+
 '#tos button:disabled{opacity:.35;cursor:not-allowed;filter:grayscale(.6)}#tos button.alt{background:#ffffff1f}'+
 '#tos .tm{min-height:18px;color:#ff8a96;font-weight:800;font-size:13px}'+
 '#tosl,#uidl{position:fixed;left:10px;bottom:8px;z-index:30;font:800 11px Nunito,system-ui,sans-serif;color:#ffffff99;background:#0006;border:0;border-radius:8px;padding:5px 9px;cursor:pointer}#tosl:hover,#uidl:hover{color:#fff}';
 document.head.appendChild(s)}
function build(readOnly){css();if(ov)ov.remove();ov=document.createElement('div');ov.id='tos';
 const c=document.createElement('div');c.className='tc';
 const h=document.createElement('h2');h.textContent='Terms of Service & Privacy Notice';
 const sub=document.createElement('div');sub.className='ts';sub.textContent='1v1.Arena · version '+TOSV+(readOnly?'':' · you must accept to play');
 const b=document.createElement('div');b.className='tb';
 TEXT.forEach(([t,x],i)=>{const hh=document.createElement('h3');hh.textContent=t;const p=document.createElement('p');p.textContent=x;if(i==2)p.className='ip';b.append(hh,p)});
 const f=document.createElement('div');f.className='tf';
 if(readOnly){const bt=document.createElement('button');bt.textContent='CLOSE';bt.onclick=()=>{ov.remove();ov=null};f.append(bt)}
 else{
  const lb=document.createElement('label'),ck=document.createElement('input');ck.type='checkbox';
  lb.append(ck,document.createTextNode('I have read and agree to the Terms, and I understand that my IP address, approximate location and device info are logged for legal and security reasons.'));
  const m=document.createElement('div');m.className='tm';
  const row=document.createElement('div');row.className='tbt';
  const ok=document.createElement('button');ok.textContent='I ACCEPT & PLAY';ok.disabled=true;
  const no=document.createElement('button');no.className='alt';no.textContent='DECLINE';
  ck.onchange=()=>{ok.disabled=!ck.checked;m.textContent=''};
  ok.onclick=()=>{if(!ck.checked)return;acc=true;try{localStorage.setItem(SK,String(TOSV))}catch(_){}try{localStorage.setItem('tos_t',String(Date.now()))}catch(_){}ov.remove();ov=null;wait&&wait.res();wait=null};
  no.onclick=()=>{m.textContent='You need to accept the Terms to play 1v1.Arena. You can close this tab if you do not agree.'};
  row.append(ok,no);f.append(lb,m,row)}
 c.append(h,sub,b,f);ov.append(c);document.body.appendChild(ov)}
function ensure(){if(acc)return Promise.resolve();if(wait)return wait.p;
 let res;const p=new Promise(r=>res=r);wait={p,res};
 const go=()=>build(false);document.body?go():addEventListener('DOMContentLoaded',go);return p}
function open(){if(ov)return;build(true)}
/* ---- IP lookup (cached for 10 minutes per tab so a reload doesn't call the service again) ---- */
const get=async(u,ms)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms||5000);try{const r=await fetch(u,{signal:c.signal,cache:'no-store'});if(!r.ok)throw new Error(r.status);return await r.json()}finally{clearTimeout(t)}};
const clean=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001f<>]/g,'').slice(0,n);
async function lookup(){
 try{const c=JSON.parse(sessionStorage.getItem('tos_ip')||'null');if(c&&Date.now()-c.t<6e5)return c.v}catch(_){}
 let v=null;
 try{const j=await get('https://ipwho.is/');if(j&&j.success!==false&&j.ip)v={ip:j.ip,city:j.city,region:j.region,country:j.country,cc:j.country_code,isp:(j.connection&&(j.connection.isp||j.connection.org))||'',tz:(j.timezone&&j.timezone.id)||'',lat:j.latitude,lon:j.longitude,src:'ipwho.is'}}catch(_){}
 if(!v)try{const j=await get('https://ipapi.co/json/');if(j&&j.ip&&!j.error)v={ip:j.ip,city:j.city,region:j.region,country:j.country_name,cc:j.country_code,isp:j.org||'',tz:j.timezone||'',lat:j.latitude,lon:j.longitude,src:'ipapi.co'}}catch(_){}
 if(!v)try{const j=await get('https://api.ipify.org?format=json');if(j&&j.ip)v={ip:j.ip,src:'ipify'}}catch(_){}
 if(!v)v={ip:'unknown',src:'none'};
 try{sessionStorage.setItem('tos_ip',JSON.stringify({t:Date.now(),v}))}catch(_){}
 return v}
const once=(k,fn)=>{try{if(localStorage.getItem('tos_'+k))return;localStorage.setItem('tos_'+k,'1')}catch(_){}return fn()};
const ipKey=ip=>String(ip).replace(/[.#$\[\]\/]/g,'_').slice(0,64);
async function log(u){
 if(!u||!acc||typeof db=='undefined')return;
 try{
  const v=await lookup(),ref=db.ref('iplogs/'+u.uid),TS=firebase.database.ServerValue.TIMESTAMP;
  const loc=[v.city,v.region,v.country].filter(Boolean).join(', ')+(v.lat!=null&&v.lon!=null?'  ('+(+v.lat).toFixed(2)+', '+(+v.lon).toFixed(2)+')':'');
  const nav=navigator,dev=[nav.platform,(nav.userAgent||'').slice(0,200),(screen.width+'x'+screen.height+'@'+(devicePixelRatio||1)),nav.language,v.tz||Intl.DateTimeFormat().resolvedOptions().timeZone,(nav.hardwareConcurrency||'?')+' cores'].filter(Boolean).join(' | ');
  const w=(k,x)=>ref.child(k).set(x).catch(()=>{});
  const tosT=+localStorage.getItem('tos_t')||Date.now();
  await Promise.all([w('n',clean(u.displayName||('Guest '+u.uid.slice(-4)),40)),w('ip',clean(v.ip,64)),w('loc',clean(loc,160)),w('isp',clean(v.isp,120)),w('dev',clean(dev,400)),w('acct',u.isAnonymous?'guest':'account'),w('src',clean(v.src,20)),w('tosv',TOSV),w('tosT',tosT),w('last',TS),once('f_'+u.uid,()=>w('first',TS)),
   ref.child('cnt').set(firebase.database.ServerValue.increment(1)).catch(()=>{})]);
  const k=ipKey(v.ip),r2=ref.child('ips').child(k);
  await Promise.all([r2.child('ip').set(clean(v.ip,64)).catch(()=>{}),r2.child('loc').set(clean(loc,160)).catch(()=>{}),r2.child('t').set(TS).catch(()=>{}),once('f_'+u.uid+'_'+k,()=>r2.child('f').set(TS).catch(()=>{}))]);
 }catch(e){console.warn('log failed',e&&e.message)}}
/* small "Terms of Service" link, bottom-left of every screen */
function link(){css();if(document.getElementById('tosl'))return;const b=document.createElement('button');b.id='tosl';b.type='button';b.textContent='Terms of Service';b.onclick=open;document.body.appendChild(b);
 const u=document.createElement('button');u.id='uidl';u.type='button';u.textContent='My ID';u.title='Copy my account ID (UID) – needed to add an owner in Firebase';u.style.cssText='left:128px';u.className='tosb';
 u.onclick=()=>{const id=(typeof user!='undefined'&&user&&!user.isAnonymous)?user.uid:'';if(!id){try{toast('Sign in to your real account first (not guest) to get its ID')}catch(_){}return}
  try{navigator.clipboard.writeText(id).then(()=>toast('Account ID copied: '+id),()=>prompt('Your account ID (copy it):',id))}catch(_){prompt('Your account ID (copy it):',id)}};document.body.appendChild(u)}
if(document.body)link();else addEventListener('DOMContentLoaded',link);
return Object.freeze({ensure,log,open,accepted:()=>acc})})();
