/* ================= PARTY SYSTEM =================
   parties/<CODE> = { lead:<uid>, priv:0|1, t, m:{<uid>:{name,skin,rk,ac,rd}}, inv:{<uid>:true}, ban:{<uid>:true} }
   pinv/<to uid>/<from uid> = { code, name, t }          one slot per sender -> the same person can never stack duplicate invitations

   What keeps it consistent (the database rules in database.rules.json enforce the important parts, not this file):
     - ONE leader: `lead` is a single field. Only the leader can change it - or, when the leader has vanished from the member list, a remaining
       member may hand it to somebody who IS in the list. Every client picks the same successor (lowest uid) and writes it with a transaction,
       so two members reacting at the same moment cannot end up with two leaders.
     - NO ghosts: every member removes ITSELF on disconnect (server-side onDisconnect). The last member alone also removes the party node.
     - NO stale state: every screen is drawn from the live `parties/<CODE>` value only; leaving / being kicked / the party closing all arrive
       through that one listener.
     - Invite-only parties: you can only add yourself if the leader put you on `inv` (rule). Kicked players go on `ban` and cannot walk back in.
     - Reconnect: when the connection comes back (or the page is reloaded) you are put back into the party you were in, if it still exists and
       you are still allowed in.
   Starting a match is unchanged: the leader presses PLAY and the others receive the match through invites/<uid> (see go() / pmatch in main.js).
   NEW: members press PLAY (or READY) to ready up; the leader can only start when everybody is ready.
   Globals kept for the rest of the game: party, joinParty(code), partyRefresh(), dropParty().                                                  */
let party=null;
const PARTY=(()=>{
let off=null,pinvRef=null,pinvCb=null,invites={},uidNow=null,recentOn={},sentAt={},connRef=null,connCb=null;
const SS='party_code',RC='party_recent';
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const strip=()=>{try{const u=new URL(location.href);if(u.searchParams.has('party')){u.searchParams.delete('party');history.replaceState(null,'',u.pathname+(u.search||'')+u.hash)}}catch(e){}}; /* invite link is one-shot: a reload must not re-join */
const mem=()=>({name:nm(),skin:SK(),rk:RK.pack(),ac:user.isAnonymous?0:1});
const pcode=()=>{let c='';const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';for(let i=0;i<5;i++)c+=A[Math.random()*A.length|0];return c};
const ids=()=>party?Object.keys(party.m).sort((a,b)=>(a==party.lead?-1:0)-(b==party.lead?-1:0)||(a<b?-1:1)):[];
const amLead=()=>!!(party&&user&&party.lead==user.uid);
const why=e=>{const m=String(e&&e.message||e||'');return /permission/i.test(m)?'not allowed (banned, maintenance, or database.rules.json not published)':m.slice(0,80)};
const recent=()=>{try{const a=JSON.parse(localStorage.getItem(RC)||'[]');return Array.isArray(a)?a.filter(x=>x&&x.u&&x.n&&(!user||x.u!=user.uid)).slice(0,8):[]}catch(e){return[]}};
function remember(m){try{const a=recent();Object.keys(m).forEach(u=>{if(u==user.uid||!m[u].ac)return;const i=a.findIndex(x=>x.u==u);if(i>=0)a.splice(i,1);a.unshift({u,n:String(m[u].name).slice(0,24)})});localStorage.setItem(RC,JSON.stringify(a.slice(0,8)))}catch(e){}}

/* ---------------- drawing ---------------- */
function pui(){if(!user)return;const m=party?party.m:{},list=ids(),lead=amLead(),me=party&&m[user.uid];
 $('#pnone').style.display=party?'none':'block';$('#pin').style.display=party?'block':'none';$('#pc').textContent=party?party.code:'';
 const box=$('#pslots');box.textContent='';
 const mkSlot=id=>{const el=h('div','slot'+(id?'':' empty')+(id&&id!=party.lead&&m[id].rd?' rdy':''));const ic=h('i'),b=h('b'),sm=h('small');el.append(ic,b,sm);
  if(id){ic.style.background=hx(m[id].skin);bustBg(ic,m[id].skin);b.textContent=m[id].name+(id==user.uid?' (you)':'');
   sm.innerHTML=(id==party.lead?'<span class="ptag ld">👑 LEADER</span>':m[id].rd?'<span class="ptag ok">✔ READY</span>':'<span class="ptag">NOT READY</span>')+' '+RK.mini(m[id].rk);
   if(lead&&id!=user.uid){const a=h('div','pact');a.dataset.u=id;const b1=h('button',null,'👑');b1.dataset.k='lead';b1.title='Make '+m[id].name+' the party leader';const b2=h('button',null,'✕');b2.dataset.k='kick';b2.title='Remove '+m[id].name+' from the party';a.append(b1,b2);el.appendChild(a)}}
  else{ic.className='em';ic.textContent='+';b.textContent='Open slot';sm.textContent='Invite a player below'}return el};
 list.forEach(id=>box.appendChild(mkSlot(id)));if(party&&list.length<PARTY_MAX)box.appendChild(mkSlot(null));
 const pc=$('#pcount');if(pc)pc.textContent=party?list.length+' / '+PARTY_MAX+' players · '+(party.priv?'🔒 invite only':'🔓 anyone with the code can join'):'';
 const md=CFG.mode,chk=party&&list.length>1?partyCheck(md,list.length):null,pr=$('#prule');if(pr){pr.style.display=chk?'block':'none';pr.className='prule '+(chk&&chk.ok?'ok':'bad');pr.textContent=chk?(chk.ok?modeOf(md).n+': '+({solo:'everyone plays on their own',queue:'your party queues together',private:'private match – your party fills both sides',room:'your party joins the same room'}[chk.kind]||'ready'):'⚠ '+chk.why):''}
 if(party){const nr=notReady();$('#phint').textContent=lead?(list.length<2?'Invite players, then press PLAY in the lobby to start.':nr.length?'Waiting for '+nr.join(', ')+' to ready up.':'Everyone is ready — press PLAY in the lobby!'):(me&&me.rd?'You are ready. Waiting for the leader to press PLAY.':'Press READY when you are set. The leader starts the match.');
  const rb=$('#pready');rb.style.display=lead?'none':'';rb.textContent=me&&me.rd?'✔ READY (tap to cancel)':'READY UP';rb.classList.toggle('alt',!!(me&&me.rd));
  const pv=$('#ppriv');pv.style.display=lead?'':'none';pv.textContent=party.priv?'🔒 INVITE ONLY (tap to open)':'🔓 OPEN (tap to make invite only)';
  $('#pinvite').style.display=(lead||!party.priv)?'':'none';paintOut();paintRecent()}
 paintIn();
 const o=list.find(i=>i!=user.uid),f=$('#friend'),nIn=Object.keys(invites).length;f.classList.toggle('has',!!o);f.classList.toggle('inv',nIn>0&&!party);f.textContent=list.length>2?String(list.length):o?m[o].name.slice(0,2).toUpperCase():nIn?'✉':'+';f.style.background=o?hx(m[o].skin):'';f.title=o?list.length+' players in your party':nIn?nIn+' party invitation'+(nIn>1?'s':''):'Party';
 Game.partner(o?{name:m[o].name,skin:m[o].skin,rk:m[o].rk}:null);window.thumbFill&&thumbFill()}
/* invitations the leader sent that nobody answered yet */
function paintOut(){const w=$('#pout');w.textContent='';if(!party||!amLead())return;const pend=Object.keys(party.inv||{}).filter(u=>!party.m[u]);if(!pend.length)return;
 w.appendChild(h('small','plab','INVITED · WAITING FOR AN ANSWER'));pend.forEach(u=>{const r=h('div','prow');r.appendChild(h('b',null,(party.invN&&party.invN[u])||nameOf(u)));const x=h('button','pmini','CANCEL');x.onclick=()=>{SFX.click();cancelInvite(u)};r.appendChild(x);w.appendChild(r)})}
const names={};const nameOf=u=>names[u]||('Player '+u.slice(-4));
function paintRecent(){const w=$('#precent');w.textContent='';const a=recent().filter(x=>!party||!party.m[x.u]);if(!a.length||!party||!(amLead()||!party.priv))return;
 w.appendChild(h('small','plab','RECENT TEAMMATES'));a.forEach(x=>{const r=h('div','prow');const d=h('i','pdot'+(recentOn[x.u]?' on':''));d.title=recentOn[x.u]?'Online':'Offline';r.append(d,h('b',null,x.n));
  const b=h('button','pmini',recentOn[x.u]?'INVITE':'OFFLINE');b.disabled=!recentOn[x.u];b.onclick=()=>{SFX.click();inviteUid(x.u,x.n)};r.appendChild(b);w.appendChild(r)})}
async function pollRecent(){const a=recent();await Promise.all(a.map(async x=>{try{recentOn[x.u]=!!(await db.ref('presence/'+x.u).once('value')).val()}catch(e){recentOn[x.u]=false}}));if($('#party').classList.contains('on'))paintRecent()}
/* invitations I received: in the party window AND as a card on the menu (never on top of a running match) */
function paintIn(){const w=$('#pinvs');w.textContent='';const list=Object.entries(invites);
 list.forEach(([from,v])=>{const r=h('div','pinvr');r.appendChild(h('span',null,'✉'));const t=h('div');t.appendChild(h('b',null,v.name));t.appendChild(h('small',null,'invited you to a party'));r.appendChild(t);
  const y=h('button','pmini ok','ACCEPT'),n=h('button','pmini','DECLINE');y.onclick=()=>{SFX.click();accept(from)};n.onclick=()=>{SFX.click();decline(from)};r.append(y,n);w.appendChild(r)});
 let card=$('#pnote');const busy=window.Game&&Game.busy(),open=$('#party').classList.contains('on');
 if(!list.length||busy||open){if(card)card.classList.remove('on');return}
 if(!card){card=h('div');card.id='pnote';document.body.appendChild(card)}
 const [from,v]=list[0];card.textContent='';card.appendChild(h('b',null,'🎉 '+v.name+' invited you to a party'+(list.length>1?' (+'+(list.length-1)+' more)':'')));
 const row=h('div','prow'),y=h('button','pmini ok','ACCEPT'),n=h('button','pmini','DECLINE'),s=h('button','pmini','VIEW');y.onclick=()=>{SFX.click();accept(from)};n.onclick=()=>{SFX.click();decline(from)};s.onclick=()=>{SFX.click();open_()};row.append(y,n,s);card.appendChild(row);card.classList.add('on')}

/* ---------------- live party ---------------- */
function dropParty(silent){const p=off;off=null;party=null;try{sessionStorage.removeItem(SS)}catch(e){}p&&p();if(user)pui()}
function attach(code){const r=db.ref('parties/'+code),inv=db.ref('invites/'+user.uid),me=r.child('m/'+user.uid),myUid=user.uid;let n=0,last=null,armAll=false,live=true,electing=false;
 try{sessionStorage.setItem(SS,code)}catch(e){}
 me.onDisconnect().remove();
 const onVal=s=>{if(!live)return;const v=s.val();
  if(!v||!v.lead||!(v.m||{})[myUid]){if(party&&party.code===code){if(qStop){qStop();menu()}const kicked=v&&v.ban&&v.ban[myUid];dropParty();toast(!v||!v.lead?'The party was closed':kicked?'You were removed from the party':'You left the party')}return}
  last=v;const mIds=Object.keys(v.m);
  /* leader gone (closed the tab, lost connection): the lowest uid left takes over. Transaction = only one winner even if several try at once */
  if(!v.m[v.lead]&&!electing){const next=mIds.slice().sort()[0];if(next===myUid){electing=true;r.child('lead').transaction(c=>c===v.lead?myUid:undefined).then(()=>{electing=false},()=>{electing=false})}}
  /* alone in the party: if I disconnect, the whole party goes with me (no empty husk left in the database) */
  const sole=mIds.length===1&&v.lead===myUid;
  if(sole&&!armAll){armAll=true;r.onDisconnect().remove()}else if(!sole&&armAll){armAll=false;r.onDisconnect().cancel().then(()=>{if(live)me.onDisconnect().remove()},()=>{})}
  const wasLead=party&&party.lead==myUid,was=n;n=mIds.length;party={code,lead:v.lead,priv:v.priv?1:0,m:v.m,inv:v.inv||{},invN:(party&&party.code===code&&party.invN)||{}};
  if(v.lead==myUid&&party&&!wasLead&&was>0)toast('👑 You are the party leader now');
  if(was>n&&qStop){qStop();menu();toast('A party member left – search cancelled')} /* never keep searching with a roster that no longer exists */
  remember(v.m);pui()};
 r.on('value',onVal,e=>{if(live&&party&&party.code===code){dropParty();toast('Lost access to the party: '+why(e))}});
 /* match start from the leader arrives here (unchanged protocol) */
 inv.remove().catch(()=>{}).then(()=>{if(!live)return;inv.on('value',s=>{const v=s.val();if(v&&live&&party&&party.code===code&&party.lead!=myUid){inv.remove();$('#party').classList.remove('on');me.child('rd').set(false).catch(()=>{});beginAny(v)}})});
 off=()=>{live=false;r.off('value',onVal);inv.off();
  const oth=Object.keys((last&&last.m)||{}).filter(u=>u!=myUid).sort();
  if(last&&last.lead===myUid){r.onDisconnect().cancel().catch(()=>{});if(oth.length)r.update({lead:oth[0],['m/'+myUid]:null}).catch(()=>{});else r.remove().catch(()=>{})}
  else{me.onDisconnect().cancel().catch(()=>{});me.remove().catch(()=>{})}}}
/* connection came back: put myself back in (my onDisconnect removed me) and re-arm the cleanup. If the party died meanwhile, the listener says so. */
function reconnect(){if(!party||!user)return;const code=party.code,r=db.ref('parties/'+code);
 r.child('lead').once('value').then(s=>{if(!party||party.code!==code)return;if(!s.val()){dropParty();toast('The party closed while you were offline');return}
  const me=r.child('m/'+user.uid);me.onDisconnect().remove();me.update(mem()).catch(()=>{if(party&&party.code===code){dropParty();toast('Could not rejoin the party after reconnecting')}})}).catch(()=>{})}

/* ---------------- actions ---------------- */
async function create(priv){if(!conn)return toast('You are offline');if(party)return;
 for(let t=0;t<4;t++){const code=pcode();try{const r=db.ref('parties/'+code);if((await r.child('lead').once('value')).val())continue;
   await r.set({lead:user.uid,priv:priv?1:0,t:firebase.database.ServerValue.TIMESTAMP,m:{[user.uid]:mem()}});if(party)return;attach(code);pollRecent();return}
  catch(e){if(t==3)toast('Could not create a party: '+why(e))}}}
async function joinParty(code,quiet){code=String(code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);if(code.length<4)return quiet||toast('Enter a party code');if(!conn)return quiet||toast('You are offline');
 if(party&&party.code===code){quiet||open_();return}
 const r=db.ref('parties/'+code);let v=null;try{v=(await r.once('value')).val()}catch(e){return quiet||toast('Could not look up that party: '+why(e))}
 if(!v||!v.lead)return quiet||toast('Party not found — it may have been closed');
 const inIt=!!(v.m||{})[user.uid];
 if(!inIt){if((v.ban||{})[user.uid])return quiet||toast('You were removed from that party');
  if(v.priv&&!(v.inv||{})[user.uid])return quiet||toast('That party is invite only — ask the leader for an invitation');
  if(Object.keys(v.m||{}).length>=PARTY_MAX)return quiet||toast('That party is full ('+PARTY_MAX+' players)')}
 if(party){if(qStop){qStop();menu()}dropParty()}
 try{await r.child('m/'+user.uid).set(mem())}catch(e){return quiet||toast('Could not join the party: '+why(e))}
 attach(code);if(!quiet)open_();pui()}
function leave(silent){if(!party)return;if(typeof qStop!='undefined'&&qStop){qStop();if(!silent)menu()}dropParty();if(!silent)toast('You left the party')}
function kick(u){if(!amLead()||u==user.uid)return;const name=party.m[u]?party.m[u].name:'Player';db.ref('parties/'+party.code).update({['m/'+u]:null,['inv/'+u]:null,['ban/'+u]:true}).then(()=>toast(name+' was removed from the party'),e=>toast('Could not remove: '+why(e)))}
function promote(u){if(!amLead()||!party.m[u])return;const name=party.m[u].name;if(!confirm('Make '+name+' the party leader?'))return;db.ref('parties/'+party.code+'/lead').set(u).then(()=>toast('👑 '+name+' is the party leader now'),e=>toast('Could not hand over: '+why(e)))}
function setPriv(p){if(!amLead())return;db.ref('parties/'+party.code+'/priv').set(p?1:0).then(()=>toast(p?'🔒 Party is invite only':'🔓 Anyone with the code can join'),e=>toast('Could not change privacy: '+why(e)))}
const notReady=()=>party?Object.keys(party.m).filter(u=>u!=party.lead&&!party.m[u].rd).map(u=>party.m[u].name):[];
function toggleReady(){if(!party||amLead())return;const me=party.m[user.uid],rd=!(me&&me.rd);db.ref('parties/'+party.code+'/m/'+user.uid+'/rd').set(rd).then(()=>toast(rd?'✔ You are ready — waiting for the leader to press Play':'Not ready'),e=>toast('Could not ready up: '+why(e)))}
function partyRefresh(){if(party&&user&&party.m[user.uid]){const m=mem(),c=party.m[user.uid];if(c.name!==m.name||c.skin!==m.skin||JSON.stringify(c.rk)!==JSON.stringify(m.rk))db.ref('parties/'+party.code+'/m/'+user.uid).update(m).catch(()=>{})}}

/* ---------------- invitations ---------------- */
async function inviteName(name){name=String(name||'').trim().replace(/^@/,'');if(!name)return toast('Type a username');if(!party)return;
 if(name===nm())return toast('That is you');
 let hits=[];try{const s=await db.ref('users').orderByChild('name').equalTo(name).limitToFirst(5).once('value');s.forEach(c=>{hits.push({u:c.key,n:c.val().name})})}catch(e){return toast('Could not search players: '+why(e))}
 hits=hits.filter(x=>x.u!=user.uid);if(!hits.length)return toast('No player called "'+name+'" (usernames are case sensitive)');
 /* several accounts can share a name: invite the one that is online */
 let pick=null;for(const x of hits){try{if((await db.ref('presence/'+x.u).once('value')).val()){pick=x;break}}catch(e){}}
 if(!pick)return toast(name+' is offline right now');return inviteUid(pick.u,pick.n)}
async function inviteUid(u,name){if(!party)return;if(!(amLead()||!party.priv))return toast('Only the leader can invite to an invite-only party');
 if(party.m[u])return toast(name+' is already in your party');if(Object.keys(party.m).length>=PARTY_MAX)return toast('Your party is full');
 if(Date.now()-(sentAt[u]||0)<8000)return toast('You just invited '+name+' — give them a moment');sentAt[u]=Date.now();names[u]=name;
 try{const code=party.code;await db.ref('parties/'+code+'/inv/'+u).set(true);party.invN[u]=name;
  await db.ref('pinv/'+u+'/'+user.uid).set({code,name:nm().slice(0,24),t:firebase.database.ServerValue.TIMESTAMP});toast('Invitation sent to '+name);paintOut()}
 catch(e){sentAt[u]=0;toast('Could not invite '+name+': '+why(e))}}
function cancelInvite(u){if(!party)return;db.ref('parties/'+party.code+'/inv/'+u).remove().catch(()=>{});db.ref('pinv/'+u+'/'+user.uid).remove().catch(()=>{});toast('Invitation cancelled')}
function accept(from){const v=invites[from];if(!v)return;const code=v.code;delete invites[from];db.ref('pinv/'+user.uid+'/'+from).remove().catch(()=>{});
 if(window.Game&&Game.busy()){toast('Finish your match first');return}joinParty(code)}
function decline(from){const v=invites[from];if(!v)return;delete invites[from];db.ref('pinv/'+user.uid+'/'+from).remove().catch(()=>{});db.ref('parties/'+v.code+'/inv/'+user.uid).remove().catch(()=>{});pui();toast('Invitation declined')}
function watchInvites(u){if(pinvRef&&pinvCb)pinvRef.off('value',pinvCb);pinvRef=pinvCb=null;invites={};if(!u)return;
 pinvRef=db.ref('pinv/'+u.uid);let first=true;pinvCb=pinvRef.on('value',s=>{const v=s.val()||{},t=now(),nx={};
  Object.entries(v).forEach(([from,x])=>{if(!x||typeof x.code!='string'||typeof x.name!='string')return;if(t-(+x.t||0)>10*60000){pinvRef.child(from).remove().catch(()=>{});return} /* older than 10 minutes: expired */
   if(party&&party.code===x.code){pinvRef.child(from).remove().catch(()=>{});return}nx[from]={code:x.code.slice(0,8),name:x.name.slice(0,24)}});
  const fresh=Object.keys(nx).some(k=>!invites[k]);invites=nx;if(fresh&&!first)try{SFX.claim&&SFX.claim()}catch(e){}first=false;if(user)pui()},()=>{})}

/* ---------------- session ---------------- */
function session(u){if(uidNow===(u&&u.uid))return;if(party)dropParty();uidNow=u?u.uid:null;watchInvites(u);
 if(connRef&&connCb)connRef.off('value',connCb);connRef=db.ref('.info/connected');let was=true;connCb=connRef.on('value',s=>{const c=!!s.val();if(c&&!was)reconnect();was=c});
 /* page reloaded while in a party: walk back in (silently; if it is gone or closed to us, nothing happens) */
 let code=null;try{code=sessionStorage.getItem(SS)}catch(e){}if(u&&code&&!new URLSearchParams(location.search).get('party'))joinParty(code,true)}
function open_(){if(!user)return;pui();pollRecent();$('#party').classList.add('on');paintIn()}

/* ---------------- wiring ---------------- */
$('#pnew').onclick=()=>{SFX.click();create($('#pnewpriv').checked)};
$('#pjoin').onclick=()=>{SFX.click();joinParty($('#pcode').value)};$('#pcode').onkeydown=e=>{e.stopPropagation();if(e.key=='Enter')joinParty($('#pcode').value)};
$('#pslots').onclick=e=>{const b=e.target.closest('button[data-k]');if(!b||!amLead())return;SFX.click();const u=b.parentNode.dataset.u;b.dataset.k=='kick'?kick(u):promote(u)};
$('#pcopy').onclick=()=>{SFX.click();if(!party)return;const l=location.origin.replace('null','')+location.pathname+'?party='+party.code;(navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast(party.priv?'Link copied — invite-only: they also need an invitation':'Invite link copied!'),()=>prompt('Copy this invite link',l))};
$('#pleave').onclick=()=>{SFX.click();leave()};
$('#pready').onclick=()=>{SFX.click();toggleReady()};
$('#ppriv').onclick=()=>{SFX.click();if(party)setPriv(!party.priv)};
$('#pinvgo').onclick=()=>{SFX.click();const i=$('#pinvname');inviteName(i.value);i.value=''};$('#pinvname').onkeydown=e=>{e.stopPropagation();if(e.key=='Enter'){inviteName(e.target.value);e.target.value=''}};
$('#friend').onclick=()=>{SFX.click();open_()};
return{session,leave,toggleReady,notReady,open:open_,strip,joinParty,partyRefresh,dropParty,refresh:()=>{if(user)pui()},invites:()=>Object.keys(invites).length}})();
const joinParty=PARTY.joinParty,partyRefresh=PARTY.partyRefresh,dropParty=PARTY.dropParty,strip=PARTY.strip;
