/* ================= OWNERS: DASHBOARD + COMMANDS =================
   Who is an owner lives in the Firebase Realtime Database, set by hand in the Firebase console (nobody can write it from the game):

       ownerUids / <the account's UID>  =  true          (boolean true. UID: Firebase console > Authentication > Users > "User UID", or the "My ID" button)

   EVERYTHING an owner does here is a request to the "owner" Cloud Function (functions/lib/owner.js). The function re-checks ownerUids/<caller uid>
   with admin rights on every call, rate-limits, asks for confirmation on dangerous commands and writes each call to audit/admin.
   The browser decides nothing: `ver` below only controls whether the buttons are SHOWN. Forcing the panel open on a normal account gets
   "Not allowed" from the server for every button, and the attempt is logged (audit/denied).
   Guests / anonymous accounts can never be owners.
   Loaded after passes.js (EV) and lobby2.js; main.js waits for it (see sess() in main.js). */
const ADM=(()=>{
const TK=Symbol('adm');EV.bind(TK);
let ver=false,verUid=null; /* ver = the SERVER answered ownerUids/<this uid> === true. Display only. */
const verified=()=>!!(ver&&typeof user!='undefined'&&user&&!user.isAnonymous&&user.uid===verUid);
const tmo=(p,ms)=>Promise.race([p,new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
const h=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};

/* LEGACY ADMIN LIST (older builds): backend node  fyusaugczduirdgyfdr/<email prefix> = 1.
   Only consulted when the ownerUids check could NOT be answered (database.rules.json of this version not published yet, so the read is denied).
   Once the new rules are live, ownerUids is the only source. It only switches on what THIS screen shows (all skins, infinite candy, no leaderboards);
   every owner command is still authorised by the server, so a spoofed value gives nothing. */
const LEGACY_NODE='fyusaugczduirdgyfdr';
async function legacy(u){const em=String(u&&u.email||'').toLowerCase(),pre=em.split('@')[0];if(!pre)return false;
 for(const k of [...new Set([pre,pre.replace(/[.#$\[\]\/]/g,','),pre.replace(/[.#$\[\]\/]/g,'')])]){
  try{const v=(await tmo(db.ref(LEGACY_NODE+'/'+k).once('value'),6000)).val();if(v===1||v===true||v==='1')return true}catch(e){}}
 return false}
let chk=false,okState=false;
async function check(u){let st=false,known=true,viaLegacy=false;chk=true;okState=false;ver=false;verUid=null;
 EV.setOwner(false,false,TK);
 try{if(u&&!u.isAnonymous){{const ov=(await tmo(db.ref('ownerUids/'+u.uid).once('value'),8000)).val();st=ov===true||ov===1};if(!st)console.info('[owner check] not in ownerUids. UID: '+u.uid+'  (Firebase console > Realtime Database > ownerUids > add key = this UID, value = true)')}}
 catch(e){known=false;console.warn('Owner check failed (is database.rules.json published?):',e&&e.message);
  try{if(u&&!u.isAnonymous&&await legacy(u)){st=true;known=true;viaLegacy=true;console.info('[owner check] owner through the legacy admin list (new rules not published yet)')}}catch(_){}}
 if(st){ver=true;verUid=u.uid}
 window.OWNER_VIA_LEGACY=viaLegacy;
 EV.setOwner(st,known,TK);if(!st)$('#admin').classList.remove('on');okState=known;chk=false;return st}
function demote(){ver=false;verUid=null;EV.setOwner(false,true,TK);$('#admin').classList.remove('on')}
function listen(u){listenT(u)}

/* ---- one owner command -> Cloud Function. Dangerous commands come back as {confirm:true}: ask, then resend with confirm ---- */
let fnc=null,running=0;
const fn=()=>fnc||(fnc=firebase.app().functions(window.FUNCTIONS_REGION||'us-central1').httpsCallable('owner',{timeout:30000}));
const parse=line=>{const a=[];String(line).trim().replace(/"([^"]*)"|(\S+)/g,(m,q,w)=>{a.push(q!=null?q:w)});return a};
/* ---- fallback: the "owner" Cloud Function is not deployed / not reachable (no Blaze plan yet) -> run the SAME command code in this owner's browser, straight against
   the database. The database rules decide: only ownerUids/<uid> may write the paths these commands touch (database.rules.json, OWNER-WRITE). ---- */
let olLoad=null,localNote=false;
const ownerLocal=()=>olLoad||(olLoad=new Promise((ok,no)=>{if(window.OWNERLOCAL)return ok(window.OWNERLOCAL);const sc=document.createElement('script');sc.src='js/ownerlocal.js';sc.onload=()=>window.OWNERLOCAL?ok(window.OWNERLOCAL):no(new Error('owner tools missing'));sc.onerror=()=>{olLoad=null;no(new Error('could not load js/ownerlocal.js'))};document.head.appendChild(sc)}));
const dbAdapter=()=>{const root=firebase.database().ref(),R=p=>firebase.database().ref(p),list=s=>{const a=[];s.forEach(c=>{a.push({key:c.key,val:c.val()})});return a};
 return{get:async p=>(await R(p).once('value')).val(),
  tx:async(p,f)=>{const r=await R(p).transaction(c=>f(c),undefined,false);return{committed:r.committed,value:r.snapshot.val()}},
  update:m=>root.update(m),push:(p,v)=>R(p).push(v),id:()=>root.push().key,
  top:async(p,c,n)=>list(await R(p).orderByChild(c).limitToLast(n).once('value')).reverse(),
  find:async(p,c,v,n)=>list(await R(p).orderByChild(c).equalTo(v).limitToFirst(n).once('value')),
  prefix:async(p,c,q,n)=>list(await R(p).orderByChild(c).startAt(q).endAt(q+'\uf8ff').limitToFirst(n).once('value')),
  last:async(p,n)=>list(await R(p).orderByKey().limitToLast(n).once('value'))}};
async function local(cmd,args,confirm){const L=await ownerLocal();
 try{return await L.handle(dbAdapter(),{uid:user.uid,anon:false,now:now(),name:nm()},{cmd,args,confirm})}
 catch(e){const m=String(e&&e.message||e);
  if(/permission_denied/i.test(m))throw Object.assign(new Error('Database refused it: publish the newest database.rules.json (it lets owners write directly) — or deploy the Cloud Functions'),{details:{code:'denied'}});
  if(e&&e.code&&!e.details)e.details={code:e.code};throw e}}
const isNet=e=>!(e&&e.details&&e.details.code);
async function run(line,opts){opts=opts||{};const a=Array.isArray(line)?line.map(String):parse(line);if(!a.length)return null;const cmd=a[0].replace(/^\//,'').toLowerCase(),args=a.slice(1),shown='/'+cmd+(args.length?' '+args.join(' '):'');
 if(!verified()){out('✗ Not an owner on this account','err');return null}
 if(!opts.silent)out('› '+shown,'cmd');running++;busyUi();let direct=false;
 try{let r;
  try{r=(await fn()({cmd,args})).data}
  catch(e){if(!isNet(e))throw e;direct=true;if(!localNote){localNote=true;out('ℹ The "owner" Cloud Function is not reachable — running owner commands directly against the database instead (needs the newest database.rules.json).','dim')}r=await local(cmd,args,false)}
  if(r&&r.confirm){if(!confirm(r.msg+'\n\nRun it?')){out('Cancelled','dim');return null}r=direct?await local(cmd,args,true):(await fn()({cmd,args,confirm:true})).data}
  if(!opts.silent||opts.echo)out('✓ '+(r.msg||'done')+(direct?'  (direct)':''),'ok',r);if(opts.toast)toast('✓ '+(r.msg||'Done'));return r}
 catch(e){const m=(e&&e.message)||'failed',net=isNet(e);out('✗ '+m+(net?'  (is the "owner" Cloud Function deployed?)':''),'err');if(opts.toast||opts.silent)toast('✗ '+m);return null}
 finally{running--;busyUi()}}
function busyUi(){const b=$('#admin .box');if(b)b.classList.toggle('busy',running>0)}

/* ---- generic renderers: every value goes in with textContent, never innerHTML ---- */
function table(rows,pick){const w=h('div','otw');if(!rows||!rows.length){w.appendChild(h('p','sub','Nothing to show.'));return w}
 const t=h('table','ot'),keys=Object.keys(rows[0]),hr=h('tr');keys.forEach(k=>hr.appendChild(h('th',null,k)));t.appendChild(hr);
 rows.slice(0,300).forEach(r=>{const tr=h('tr');keys.forEach(k=>{const td=h('td',null,r[k]==null?'':String(r[k]));if(k=='uid'&&pick){td.className='lnk';td.title='Open this player';td.onclick=()=>inspect(r.uid)}if(k=='command'){td.className='lnk';td.onclick=()=>{$('#ocin').value=String(r[k]).split('  ')[0].split(' <')[0].split(' [')[0]+' ';tab('console');$('#ocin').focus()}}tr.appendChild(td)});t.appendChild(tr)});
 w.appendChild(t);return w}
function grid(info){const g=h('div','og');Object.entries(info).forEach(([k,v])=>{if(v===''||v==null)return;const c=h('div','ogc'+(k=='flag'||k=='banned'||(k=='onHold'&&v)?' warn':'')+(String(v).length>30?' wide':''));c.appendChild(h('small',null,k.replace(/([A-Z])/g,' $1').toLowerCase()));
  c.appendChild(h('b',null,typeof v=='number'?(k.endsWith('Seen')?new Date(v).toLocaleString():v.toLocaleString()):v===true?'yes':v===false?'no':String(v)));g.appendChild(c)});return g}
function out(txt,cls,r){const o=$('#ocout');if(!o)return;const d=h('div','ol '+(cls||''),txt);o.appendChild(d);
 if(r){if(r.info)o.appendChild(grid(r.info));if(r.rows)o.appendChild(table(r.rows,true));if(r.inventory&&r.inventory.length)o.appendChild(table(r.inventory))}
 while(o.children.length>120)o.removeChild(o.firstChild);o.scrollTop=o.scrollHeight}

/* ================= the dashboard (built once, inside the #admin modal) ================= */
let cur=null,built=false;const hist=[];let hi=0;
function build(){if(built)return;built=true;const box=$('#admin .box');box.classList.add('own');box.textContent='';
 box.innerHTML=`<div class="ph"><h2>🛠 OWNER DASHBOARD</h2><span id="admwho" class="sub"></span><button class="x" id="admx">✕</button></div><div class="pb">
<div class="otabs" id="otabs"><button data-t="players" class="on">PLAYERS</button><button data-t="economy">ECONOMY</button><button data-t="server">SERVER</button><button data-t="console">CONSOLE</button><button data-t="logs">LOGS</button></div>
<div class="opane on" data-p="players"><div class="orow"><input id="opq" maxlength="24" placeholder="Search by username (starts with…) or paste a UID" autocomplete="off"><button class="b blu" id="opgo">SEARCH</button><button class="b" id="opon">ONLINE NOW</button></div><div id="oplist"></div><div id="opcard"></div></div>
<div class="opane" data-p="economy"><p class="sub">Accounts the server flagged for impossible balances. Nothing is wiped automatically: open the account, read its ledger, then reconcile.</p><div class="orow"><button class="b blu" id="oefl">LOAD FLAGS</button><button class="b" id="oebans">BANS</button><button class="b" id="oeitems">ITEM IDS</button></div><div id="oeout"></div>
<h3>Gift everyone online</h3><div class="orow"><select id="oegk"><option value="candy">🍬 Candy</option><option value="coins">🪙 Coins</option><option value="keys">🗝️ Keys</option><option value="xp">⭐ XP</option></select><input id="oegn" type="number" min="1" max="1000000" placeholder="amount"><button class="b grn" id="oegall">GIFT ALL ONLINE</button></div></div>
<div class="opane" data-p="server"><div class="orow"><button class="b blu" id="osinfo">REFRESH SERVER INFO</button></div><div id="osout"></div>
<h3>Global announcement</h3><div class="orow"><input id="osan" maxlength="160" placeholder="Message shown to every player right now"><button class="b grn" id="osang">ANNOUNCE</button><button class="b" id="osanx">CLEAR</button></div>
<h3>Maintenance mode</h3><div class="orow"><input id="osmm" maxlength="160" placeholder="Message (optional)"><button class="b red" id="osmon">TURN ON</button><button class="b grn" id="osmoff">TURN OFF</button></div>
<h3>Seasonal event</h3><div class="orow"><button class="b grn" data-ev="on">FORCE ON</button><button class="b red" data-ev="off">FORCE OFF</button><button class="b" data-ev="auto">FOLLOW DATES</button></div>
<h3>Danger zone</h3><div class="orow"><button class="b red" id="admreset">RESET ALL PLAYER DATA</button></div></div>
<div class="opane" data-p="console"><div id="ocout" class="ocout"></div><div class="orow"><input id="ocin" placeholder="/help   ·   e.g. /givecandy @Name 500   ·   ↑ ↓ history" autocomplete="off" spellcheck="false"><button class="b blu" id="ocgo">RUN</button></div></div>
<div class="opane" data-p="logs"><div class="orow"><button class="b blu" id="olaud">OWNER ACTION HISTORY</button><button class="b" id="iplload">IP LOGS</button><input id="iplq" placeholder="Filter IP logs (name, IP, place, UID)" autocomplete="off"><span id="iplcount" class="sub"></span></div><div id="olout"></div><div id="iplist"></div></div></div>`;
 $('#admx').onclick=()=>{SFX.click();$('#admin').classList.remove('on')};
 $('#otabs').onclick=e=>{const b=e.target.closest('button[data-t]');if(b){SFX.click();tab(b.dataset.t)}};
 const go=()=>{const q=$('#opq').value.trim();SFX.click();if(q.length>=20&&!/\s/.test(q)&&q[0]!='@')return inspect(q);list(q?['players',q]:['players'])};
 $('#opgo').onclick=go;$('#opq').onkeydown=e=>{if(e.key=='Enter')go()};$('#opon').onclick=()=>{SFX.click();list(['players'])};
 const into=(sel,cmd)=>async()=>{SFX.click();const r=await run(cmd,{silent:1});const o=$(sel);o.textContent='';if(r){o.appendChild(h('p','sub',r.msg));if(r.info)o.appendChild(grid(r.info));if(r.rows)o.appendChild(table(r.rows,true))}};
 $('#oefl').onclick=into('#oeout',['flags']);$('#oebans').onclick=into('#oeout',['bans']);$('#oeitems').onclick=into('#oeout',['items']);$('#osinfo').onclick=into('#osout',['serverinfo']);$('#olaud').onclick=into('#olout',['auditlogs','100']);
 $('#oegall').onclick=()=>{const n=Math.floor(+$('#oegn').value);if(!(n>0))return toast('Type an amount');run(['giveall',$('#oegk').value,n],{silent:1,toast:1})};
 $('#osang').onclick=()=>{const m=$('#osan').value.trim();if(!m)return toast('Type a message');run(['announce',m],{silent:1,toast:1})};$('#osanx').onclick=()=>run(['announce','off'],{silent:1,toast:1});
 $('#osmon').onclick=()=>run(['maintenance','on',$('#osmm').value.trim()].filter(Boolean),{silent:1,toast:1});$('#osmoff').onclick=()=>run(['maintenance','off'],{silent:1,toast:1});
 box.querySelectorAll('[data-ev]').forEach(b=>b.onclick=()=>run(['event',b.dataset.ev],{silent:1,toast:1}));
 $('#admreset').onclick=()=>{const t=prompt('RESET ALL PLAYER DATA\n\nThis deletes EVERY player\'s coins, candy, XP, skins, passes, rankings and leaderboards. Accounts and usernames stay.\nIt cannot be undone.\n\nType  RESET ALL  to continue:');if(t!=='RESET ALL')return toast('Reset cancelled');run(['resetall','RESET','ALL'],{silent:1,toast:1})};
 const sub=()=>{const v=$('#ocin').value.trim();if(!v)return;hist.push(v);hi=hist.length;$('#ocin').value='';run(v)};
 $('#ocgo').onclick=sub;$('#ocin').onkeydown=e=>{e.stopPropagation();if(e.key=='Enter')sub();else if(e.key=='ArrowUp'&&hi>0){$('#ocin').value=hist[--hi];e.preventDefault()}else if(e.key=='ArrowDown'){hi=Math.min(hist.length,hi+1);$('#ocin').value=hist[hi]||''}};
 $('#iplload').onclick=()=>{SFX.click();$('#olout').textContent='';iplLoad()};$('#iplq').oninput=()=>{if(iplRows.length)iplPaint()};
 out('Type /help for every command. Click a UID in any table to open that player.','dim')}
function tab(t){document.querySelectorAll('#otabs button').forEach(b=>b.classList.toggle('on',b.dataset.t==t));document.querySelectorAll('#admin .opane').forEach(p=>p.classList.toggle('on',p.dataset.p==t))}
async function list(cmd){const r=await run(cmd,{silent:1}),o=$('#oplist');o.textContent='';$('#opcard').textContent='';if(r){o.appendChild(h('p','sub',r.msg));o.appendChild(table(r.rows,true))}}
/* ---- one player: everything about the account + every action, no Firebase console needed ---- */
async function inspect(uid){tab('players');const r=await run(['inspect',uid],{silent:1}),c=$('#opcard');c.textContent='';if(!r)return;cur=r.info;$('#oplist').textContent='';
 const hd=h('div','opt');hd.appendChild(h('b',null,r.info.name));hd.appendChild(h('span','otag '+(r.info.online?'on':''),r.info.online?'ONLINE':'offline'));if(r.info.flag)hd.appendChild(h('span','otag warn','⚠ FLAGGED'));if(r.info.banned)hd.appendChild(h('span','otag warn','BANNED'));
 const cp=h('button','b','COPY UID');cp.onclick=()=>{try{navigator.clipboard.writeText(r.info.uid);toast('UID copied')}catch(_){prompt('UID',r.info.uid)}};hd.appendChild(cp);c.appendChild(hd);c.appendChild(grid(r.info));
 const U=r.info.uid,again=()=>inspect(U),act=(label,cls,f)=>{const b=h('button','b '+cls,label);b.onclick=async()=>{SFX.click();if(await f())again()};return b};
 const row1=h('div','orow');const sel=h('select');[['givecandy','+ 🍬 Candy'],['givecoins','+ 🪙 Coins'],['givekeys','+ 🗝️ Keys'],['givexp','+ ⭐ XP'],['removecandy','− 🍬 Candy'],['removecoins','− 🪙 Coins'],['setcandy','= 🍬 Set candy'],['setcoins','= 🪙 Set coins'],['setlevel','= Level']].forEach(([v,t])=>{const o=h('option',null,t);o.value=v;sel.appendChild(o)});
 const amt=h('input');amt.type='number';amt.min=0;amt.placeholder='amount';row1.append(sel,amt,act('APPLY','grn',()=>{const n=Math.floor(+amt.value);if(!(n>=0)||amt.value==='')return toast('Type an amount'),false;return run([sel.value,U,n],{silent:1,toast:1})}));c.appendChild(h('h3',null,'Currency & progress'));c.appendChild(row1);
 const row2=h('div','orow');const it=h('input');it.placeholder='item id (see ECONOMY › ITEM IDS)';it.setAttribute('list','oitems');let dl=$('#oitems');if(!dl){dl=h('datalist');dl.id='oitems';(window.ITEMS||[]).forEach(x=>{const o=h('option');o.value=x.id;o.label=x.n;dl.appendChild(o)});document.body.appendChild(dl)}
 row2.append(it,act('GRANT ITEM','grn',()=>it.value.trim()?run(['grantitem',U,it.value.trim()],{silent:1,toast:1}):(toast('Type an item id'),false)),act('REMOVE ITEM','red',()=>it.value.trim()?run(['removeitem',U,it.value.trim()],{silent:1,toast:1}):(toast('Type an item id'),false)),act('GIVE ALL SKINS','',()=>run(['giveallskins',U],{silent:1,toast:1})));c.appendChild(h('h3',null,'Inventory ('+r.inventory.length+' items)'));c.appendChild(row2);
 const inv=h('div','oinv');r.inventory.forEach(x=>{const s=h('span','oit r-'+x.rarity,x.name);s.title=x.id+' · '+x.kind+' · '+x.rarity+' (click to copy the id into the box)';s.onclick=()=>{it.value=x.id};inv.appendChild(s)});c.appendChild(inv);
 const row3=h('div','orow');const hrs=h('input');hrs.type='number';hrs.min=0;hrs.placeholder='ban hours (0 = forever)';const why=h('input');why.placeholder='reason';why.maxLength=120;
 row3.append(act('KICK','',()=>run(['kick',U,why.value.trim()].filter(Boolean),{silent:1,toast:1})),hrs,why,act('BAN','red',()=>run(['ban',U,String(Math.max(0,+hrs.value||0)),why.value.trim()].filter(Boolean),{silent:1,toast:1})),act('UNBAN','grn',()=>run(['unban',U],{silent:1,toast:1})),act('RESET STATS','red',()=>run(['resetstats',U],{silent:1,toast:1})),act('RESET DAILIES','',()=>run(['resetdaily',U],{silent:1,toast:1})));c.appendChild(h('h3',null,'Moderation'));c.appendChild(row3);
 const rowL=h('div','orow');rowL.append(act('OFF KILLS BOARD','red',()=>run(['lbremove',U,'kills'],{silent:1,toast:1})),act('OFF DAMAGE BOARD','red',()=>run(['lbremove',U,'damage'],{silent:1,toast:1})),act('OFF CANDY BOARD','red',()=>run(['lbremove',U,'candy'],{silent:1,toast:1})),act('OFF RANKED BOARD','red',()=>run(['lbremove',U,'ranked'],{silent:1,toast:1})),act('OFF ALL BOARDS','red',()=>run(['lbremove',U,'all'],{silent:1,toast:1})),act('BACK ON BOARDS','grn',()=>run(['lbrestore',U],{silent:1,toast:1})));c.appendChild(h('h3',null,'Leaderboards'));c.appendChild(rowL);
 const row4=h('div','orow'),led=h('div');row4.append(act('SHOW LEDGER','blu',async()=>{const a=await run(['auditplayer',U,'80'],{silent:1});led.textContent='';if(a){led.appendChild(h('p','sub',a.msg));led.appendChild(table(a.rows))}return false}),
  act('RECONCILE: KEEP BALANCE','',()=>run(['reconcilecurrency',U,'keep'],{silent:1,toast:1})),act('RECONCILE: SERVER LEDGER ONLY','red',()=>run(['reconcilecurrency',U,'ledger'],{silent:1,toast:1})),act(r.info.onHold?'RESUME SPENDING':'PAUSE SPENDING','',()=>run(['hold',U,r.info.onHold?'off':'on'],{silent:1,toast:1})));
 c.appendChild(h('h3',null,'Economy investigation'));c.appendChild(row4);c.appendChild(led)}
$('#admb').onclick=()=>{if(!verified())return;SFX.click();build();$('#admwho').textContent='Signed in as '+nm()+' · every action is checked and logged by the server';$('#admin').classList.add('on')};

/* ================= IP LOGS (owners only; the database rules refuse everyone else) ================= */
let iplRows=[];
const fdate=t=>t?new Date(t).toLocaleString():'?';
function iplLine(cls,txt){const d=document.createElement('div');d.className=cls;d.textContent=txt;return d}
function iplPaint(){const b=$('#iplist'),q=$('#iplq').value.trim().toLowerCase();b.textContent='';
 const rows=iplRows.filter(r=>!q||[r.n,r.ip,r.loc,r.isp,r.uid,r.acct].join(' ').toLowerCase().includes(q)||Object.values(r.ips||{}).some(x=>String(x.ip).toLowerCase().includes(q)));
 $('#iplcount').textContent=rows.length+' of '+iplRows.length+' shown';
 if(!rows.length){b.appendChild(h('p','sub',iplRows.length?'No match.':'No logs yet.'));return}
 rows.forEach(r=>{const d=document.createElement('div');d.className='ipr';
  const top=document.createElement('div');top.className='ipt';const n=document.createElement('b');n.textContent=r.n||'(no name)';top.appendChild(n);
  const tg=(t,c)=>{const e=document.createElement('span');e.className='iptag '+c;e.textContent=t;top.appendChild(e)};tg((r.acct||'?').toUpperCase(),r.acct=='guest'?'g':'a');
  if(r.flags.length)tg('⚠ '+r.flags.length+' REPORT'+(r.flags.length==1?'':'S'),'w');
  const op=h('button','b','OPEN');op.onclick=()=>inspect(r.uid);top.appendChild(op);d.appendChild(top);
  d.appendChild(iplLine('ipk','IP: '+(r.ip||'?')));
  d.appendChild(iplLine('','📍 '+(r.loc||'unknown')));d.appendChild(iplLine('','🌐 '+(r.isp||'unknown')));
  d.appendChild(iplLine('ipd','💻 '+(r.dev||'?')));
  d.appendChild(iplLine('','🕒 first seen '+fdate(r.first)+' · last seen '+fdate(r.last)+' · '+(r.cnt||0)+' visit'+((r.cnt|0)==1?'':'s')+' · via '+(r.src||'?')));
  const o=Object.values(r.ips||{}).filter(x=>x&&x.ip&&x.ip!==r.ip).sort((a,b)=>(b.t||0)-(a.t||0));
  if(o.length)d.appendChild(iplLine('','🔁 other IPs: '+o.slice(0,8).map(x=>x.ip+(x.loc?' ('+x.loc.split('  (')[0]+')':'')).join(' · ')));
  r.flags.slice(-3).forEach(f=>d.appendChild(iplLine('ipf','⚠ '+fdate(f.t)+' · '+f.r)));
  d.appendChild(iplLine('ipu','UID '+r.uid));
  b.appendChild(d)})}
async function iplLoad(){if(!verified())return;
 const b=$('#iplist');b.textContent='';b.appendChild(h('p','sub','Loading…'));
 try{const [a,c]=await Promise.all([tmo(db.ref('iplogs').orderByChild('last').limitToLast(300).once('value'),12000),tmo(db.ref('cheats').once('value'),12000).catch(()=>null)]);
  const fl={};if(c)c.forEach(u=>{fl[u.key]=Object.values(u.val()||{}).sort((x,y)=>(x.t||0)-(y.t||0))});
  iplRows=[];a.forEach(x=>{const v=x.val()||{};iplRows.push(Object.assign({uid:x.key,flags:fl[x.key]||[]},v))});iplRows.reverse();iplPaint()}
 catch(e){b.textContent='';b.appendChild(h('p','sub','Could not load logs: '+(e&&e.message||e)+' — publish database.rules.json and make sure your UID is under ownerUids.'))}}

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
async function trollSend(kind){if(!verified()||!user)return;if(!gtt)return toast('Pick a player (or EVERYONE) first');
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
function gameToggle(){if(!verified())return;if(gOpen())return gClose();if(!gp)gBuild();gPlayers();gSync();gp.classList.add('on');Game.adminUi(1)}
/* the panel only exists inside a match: leaving the match (or losing owner status) closes it */
setInterval(()=>{if(!gp||!gOpen())return;if(!verified()||!Game.busy()){gp.classList.remove('on');window.ADMOPEN=false}gSync()},500); /* does nothing at all unless the in-game owner panel is open */
setInterval(()=>{if(gOpen())gPlayers()},4000);
/* ---- leaderboards: owners get a 🛠 button on every row (kills / damage / candy / ranked boards): ban, take off this board, take off all boards, open the player ---- */
let lbm=null;
function lbMenu(uid,name,board,row){if(!verified())return;if(lbm)lbm.remove();
 const m=lbm=h('div','lbmenu');m.style.cssText='position:fixed;z-index:99999;left:50%;top:50%;transform:translate(-50%,-50%);background:#101a3a;border:2px solid #ffd23f;border-radius:12px;padding:14px;min-width:260px;max-width:92vw;display:flex;flex-direction:column;gap:8px;color:#fff;box-shadow:0 10px 40px #000a';
 m.appendChild(h('b',null,'🛠 '+String(name||'Player').slice(0,24)));m.appendChild(h('small',null,String(uid)));
 const done=r=>{if(r&&row)row.style.opacity='.35';m.remove();lbm=null};
 const btn=(t,fn,c)=>{const b=h('button','b'+(c?' '+c:''),t);b.onclick=async()=>{b.disabled=true;try{done(await fn())}catch(e){b.disabled=false}};m.appendChild(b)};
 const BN={k:'kills',dm:'damage',c:'candy',d:'candy',r:'ranked'}[board]||'all';
 btn('BAN…',()=>{if(uid===(user&&user.uid)){toast('That is you');return null}const hrs=prompt('Ban '+name+'\nHours (0 = permanent):','0');if(hrs===null)return null;const why=prompt('Reason (optional):','')||'';return run(['ban',uid,String(Math.max(0,+hrs||0)),why.trim()].filter((x,i)=>i<3||x),{silent:1,toast:1})},'red');
 btn('BAN + REMOVE FROM ALL BOARDS',async()=>{const hrs=prompt('Ban '+name+' and wipe them from every leaderboard.\nHours (0 = permanent):','0');if(hrs===null)return null;const why=prompt('Reason (optional):','')||'';const r=await run(['ban',uid,String(Math.max(0,+hrs||0)),why.trim()].filter((x,i)=>i<3||x),{silent:1,toast:1});if(r)await run(['lbremove',uid,'all'],{silent:1,toast:1});return r},'red');
 btn('REMOVE FROM '+BN.toUpperCase()+' BOARD',()=>run(['lbremove',uid,BN],{silent:1,toast:1}));
 btn('REMOVE FROM ALL BOARDS',()=>run(['lbremove',uid,'all'],{silent:1,toast:1}));
 btn('OPEN IN OWNER DASHBOARD',async()=>{m.remove();lbm=null;build();$('#admin').classList.add('on');inspect(uid);return null});
 const x=h('button','b','CANCEL');x.onclick=()=>{m.remove();lbm=null};m.appendChild(x);document.body.appendChild(m)}
function lbTools(box,board){if(!box||!verified())return;box.querySelectorAll('[data-uid]').forEach(row=>{if(row.querySelector('.lbadm')||row.dataset.uid===(user&&user.uid))return;
 const b=h('button','lbadm','🛠');b.type='button';b.title='Owner tools';b.style.cssText='margin-left:8px;cursor:pointer;background:#ffd23f;color:#000;border:0;border-radius:6px;padding:2px 7px;font-size:13px;flex:none';
 b.onclick=e=>{e.stopPropagation();SFX.click();lbMenu(row.dataset.uid,row.dataset.n,board,row)};(row.querySelector('.lbu,.rkn,.u')||row).appendChild(b)})}
return Object.freeze({lbTools,check,listen,owner:()=>verified(),verified,ready:()=>!chk&&okState,game:gameToggle,demote,run})})();
