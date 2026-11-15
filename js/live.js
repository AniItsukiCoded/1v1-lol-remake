/* ================= LIVE SERVER MESSAGES =================
   Things the owners / the server can push to every open game, all read-only for players (database rules):
     meta/announce {t,m,by}   -> banner at the top of the screen                 (/announce)
     meta/maint    {on,m}     -> maintenance screen; queues are closed by the rules too, owners keep playing   (/maintenance)
     meta/event    'on'|'off' -> seasonal event forced on / off                   (/event)
     kicks/<uid>              -> you are taken out of your match / queue          (/kick, /ban)
     bans/<uid>    {until,reason} -> ban screen (the rules and the functions refuse a banned account anyway)   (/ban)
     inbox/<uid>/<id> {bn,m}  -> "<owner> sent you ..." toast for gifts the server already added to your account
   Loaded after main.js / passes.js. */
const LIVE=(()=>{
let offs=[],once=false,ban=null,maint=null,banT=0;
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const sub=(ref,fn)=>{const cb=ref.on('value',s=>{try{fn(s.val(),s)}catch(e){console.warn(e)}},()=>{});offs.push(()=>ref.off('value',cb))};
const isOwner=()=>{try{return ADM.verified()}catch(e){return false}};
function banner(a){let b=$('#annc');if(!a||!a.m){if(b)b.classList.remove('on');return}
 if(!b){b=h('div');b.id='annc';b.append(h('span','ai','📣'),h('b'),h('small'));const x=h('button',null,'✕');x.onclick=()=>{b.classList.remove('on');try{sessionStorage.setItem('annc_x',String(b.dataset.t))}catch(e){}};b.appendChild(x);document.body.appendChild(b)}
 let seen=0;try{seen=+sessionStorage.getItem('annc_x')||0}catch(e){}if(seen===+a.t)return;
 b.dataset.t=a.t;b.querySelector('b').textContent=String(a.m).slice(0,160);b.querySelector('small').textContent=a.by?'— '+String(a.by).slice(0,24):'';b.classList.add('on')}
function gate(){let g=$('#gate');const banned=ban&&(!ban.until||ban.until>now())&&!isOwner(),down=maint&&maint.on&&!isOwner();
 if(!banned&&!down){if(g)g.classList.remove('on');return}
 if(!g){g=h('div');g.id='gate';g.append(h('div','gi'),h('h2'),h('p'),h('small'));document.body.appendChild(g)}
 g.querySelector('.gi').textContent=banned?'⛔':'🛠';g.querySelector('h2').textContent=banned?'ACCOUNT BANNED':'MAINTENANCE';
 g.querySelector('p').textContent=banned?(ban.reason?'Reason: '+String(ban.reason).slice(0,120):'This account was banned by the game owners.'):String(maint.m||'The game is down for maintenance. Back soon!').slice(0,160);
 g.querySelector('small').textContent=banned?(ban.until?'Ends '+new Date(ban.until).toLocaleString():'This ban does not expire.')+'  You can sign out and play as a guest.':'Your progress is safe. This screen disappears by itself when the game is back.';
 g.classList.add('on');try{if(Game.busy())Game.leave();if(typeof qStop!='undefined'&&qStop){qStop()}}catch(e){}
 clearTimeout(banT);if(banned&&ban.until)banT=setTimeout(gate,Math.min(2147e6,Math.max(1000,ban.until-now()+500)))}
function attach(u){offs.forEach(f=>f());offs=[];ban=null;if(!u)return gate();
 sub(db.ref('meta/announce'),banner);
 sub(db.ref('meta/maint'),v=>{maint=v;gate()});
 sub(db.ref('meta/event'),v=>{const f=v==='on'||v==='off'?v:null;if(window.EVFORCE!==f){window.EVFORCE=f;try{EV.reload();ui()}catch(e){}}});
 sub(db.ref('bans/'+u.uid),v=>{ban=v;gate()});
 sub(db.ref('kicks/'+u.uid),(v,s)=>{if(!v)return;s.ref.remove().catch(()=>{});if(now()-(+v.t||0)>60000)return; /* an old kick must not hit you when you come back tomorrow */
  try{if(typeof qStop!='undefined'&&qStop)qStop();if(Game.busy())Game.leave();PARTY.leave(true);menu()}catch(e){}toast('You were removed from the game by an owner'+(v.r?': '+String(v.r).slice(0,120):''))});
 const ib=db.ref('inbox/'+u.uid),cb=ib.on('child_added',s=>{const v=s.val()||{};s.ref.remove().catch(()=>{});if(now()-(+v.t||0)>30*864e5)return;
  try{SFX.claim&&SFX.claim()}catch(e){}toast('🎁 '+String(v.bn||'An owner').slice(0,24)+' '+String(v.m||'sent you a gift').slice(0,140));
  if(v.item){const it=typeof ITEM=='function'&&ITEM(String(v.item));if(it)try{EV.shown([{k:'item',id:it.id}])}catch(e){}}},()=>{});offs.push(()=>ib.off('child_added',cb));
 if(!once){once=true;setInterval(()=>{if(ban||maint)gate()},30000)}}
return Object.freeze({attach,blocked:()=>{const g=$('#gate');return!!(g&&g.classList.contains('on'))}})})();
