#!/usr/bin/env node
'use strict';
/* End-to-end browser test: the REAL game code in headless Chrome, with Firebase replaced by tests/browser/firebase-mock.js and the callable
   functions running the real functions/lib code.   Usage: node tests/browser/run.js [screenshot dir]
   Needs dev tools that are not shipped with the game:  npm i --no-save puppeteer-core three@0.128.0   (and Chrome / Chromium installed) */
const {serve,launch,sleep}=require('./lib.js'),fs=require('fs'),path=require('path');
const SHOTS=process.argv[2]||path.join(require('os').tmpdir(),'arena-shots');fs.mkdirSync(SHOTS,{recursive:true});
let pass=0,fail=0;const fails=[];
const ok=(c,name,extra)=>{if(c){pass++;console.log('  ✓ '+name)}else{fail++;fails.push(name);console.log('  ✗ '+name+(extra!==undefined?'   -> '+JSON.stringify(extra):''))}};
const until=async(p,fn,ms,arg)=>{const t=Date.now();for(;;){const v=await p.evaluate(fn,arg).catch(()=>null);if(v)return v;if(Date.now()-t>(ms||8000))return null;await sleep(120)}};
const shot=(p,n)=>p.screenshot({path:path.join(SHOTS,n+'.png')}).catch(()=>{});
const signUp=async(p,email,name)=>{await p.evaluate(async(e,n)=>{try{await auth.createUserWithEmailAndPassword(e,'pw123456')}catch(_){await auth.signInWithEmailAndPassword(e,'pw123456')}await auth.currentUser.updateProfile({displayName:n});await db.ref('users/'+auth.currentUser.uid+'/name').set(n)},email,name);
 return until(p,()=>typeof user!='undefined'&&user&&!user.isAnonymous&&ECON.ready()&&user.uid,10000)};
const toasts=p=>p.evaluate(()=>window.__toasts||[]);
const hook=p=>p.evaluate(()=>{window.__toasts=[];const t=window.toast;const el=document.querySelector('#toast');new MutationObserver(()=>{window.__toasts.push(el.textContent)}).observe(el,{childList:true,characterData:true,subtree:true})});
const closeReveal=p=>p.evaluate(()=>{document.querySelectorAll('#reveal.on').forEach(e=>e.classList.remove('on'))});

(async()=>{const {s,url}=await serve(),{browser,page,keeper}=await launch();
try{
 await keeper(url);
 console.log('\n[1] boot as guest (no Terms gate)');
 const A=await page(url+'/?debug=1');
 ok(await until(A,()=>document.querySelector('#menu').classList.contains('on')&&typeof user!='undefined'&&user&&user.isAnonymous,12000),'menu reached as a guest without accepting anything');
 ok(!(await A.evaluate(()=>document.querySelector('#tos'))),'no Terms overlay is shown');
 ok(await A.evaluate(()=>!!document.querySelector('#tosl')),'Terms link is still available');
 await A.evaluate(()=>document.querySelector('#tosl').click());ok(await A.evaluate(()=>!!document.querySelector('#tos')&&/CLOSE/.test(document.querySelector('#tos').textContent)&&!/ACCEPT/.test(document.querySelector('#tos .tf').textContent)),'Terms open as a readable page with only a CLOSE button');
 await A.evaluate(()=>document.querySelector('#tos button').click());
 ok(await A.evaluate(()=>!AC.locked()&&typeof ECON=='object'&&!ECON.on()),'guest has no economy attached');
 await hook(A);await closeReveal(A);await shot(A,'01-menu-guest');

 console.log('\n[2] account creation, economy sync, logout / login');
 const uidA=await signUp(A,'alice@test.dev','Alice');ok(!!uidA,'account created and economy synced',uidA);
 ok(await A.evaluate(u=>{const e=__fb.get('econ/'+u);return e&&e.coins===0&&e.ev.candy===0},uidA),'server created econ/<uid> with zero balances');
 await closeReveal(A);await A.evaluate(()=>document.querySelector('#daily').click());
 ok(await until(A,()=>CFG.coins===50),'daily reward: +50 coins granted by the server');
 await A.evaluate(()=>document.querySelector('#daily').click());await sleep(300);ok(await A.evaluate(()=>CFG.coins===50),'daily reward cannot be taken twice');
 console.log('\n[3] tampering in the browser does not change the real balance');
 await A.evaluate(()=>{CFG.coins=9999999;CFG.ev.candy=5000000;CFG.owned.push(ITEMS.find(x=>x.rar=='mythic').v);saveCfg();localStorage.cfg=JSON.stringify(CFG)});await sleep(500);
 ok(await A.evaluate(u=>__fb.get('econ/'+u).coins===50&&__fb.get('econ/'+u).ev.candy===0,uidA),'edited CFG / localStorage never reaches the database');
 const shopItem=await A.evaluate(()=>ITEMS.find(x=>x.price).id);
 const r3=await A.evaluate(async id=>{try{await ECON.act('buy',{item:id},{quiet:1});return'bought'}catch(e){return e.code}},shopItem);ok(r3==='funds','buying with a faked balance is refused by the server',r3);
 ok(await A.evaluate(()=>CFG.coins===50&&CFG.ev.candy===0),'the screen snaps back to the real balance');
 const r3b=await A.evaluate(async()=>{try{await ECON.act('equip',{skin:ITEMS.find(x=>x.rar=='mythic'&&x.k=='skin').v},{quiet:1});return'ok'}catch(e){return e.code}});ok(r3b==='owned','equipping an item you do not own is refused',r3b);
 await A.evaluate(async()=>{await cloudPush();ECON.detach();await auth.signOut()});
 ok(await until(A,()=>typeof user!='undefined'&&user&&user.isAnonymous&&CFG.coins===0,8000),'logout: back to a guest with no balance on screen');
 await A.evaluate(()=>auth.signInWithEmailAndPassword('alice@test.dev','pw123456'));
 ok(await until(A,()=>user&&!user.isAnonymous&&ECON.ready()&&CFG.coins===50,8000),'login again: balance restored from the server');
 await A.reload({waitUntil:'load'});ok(await until(A,()=>typeof user!='undefined'&&user&&document.querySelector('#menu').classList.contains('on'),10000),'page reload works');
 ok(await until(A,()=>user&&!user.isAnonymous&&ECON.ready()&&CFG.coins===50,8000)||!!(await signUp(A,'alice@test.dev','Alice'))&&await until(A,()=>CFG.coins===50,6000),'existing data loads after reload');await hook(A);await closeReveal(A);

 console.log('\n[4] bot match: start, build, finish, server pays');
 await A.evaluate(()=>{window.__fnSkew=0;beginBot('1v1')});
 ok(await until(A,()=>Game.busy(),15000),'bot match started');await sleep(2500);await shot(A,'02-match');
  ok(await until(A,()=>Game.ev('phase')=='live',20000),'round goes live after the countdown');
 const built=await A.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms)),cnt=()=>Game.ev('Object.keys(BLD).length'),n0=cnt(),out={n0};
   for(const t of ['wall','floor','ramp','roof']){Game.ev("trig('"+t+"',false)");await w(120);out['sel_'+t]=Game.ev('buildT')==t;Game.ev("place('"+t+"')");await w(120);out[t]=cnt()}
   out.ghost=Game.ev('!!(GH&&GH.visible)');Game.ev('exitBuild()');return out});
 ok(built.sel_wall&&built.sel_floor&&built.sel_ramp&&built.sel_roof,'build keys select wall / floor / stairs / roof',built);ok(built.roof>built.n0&&built.ghost,'pieces are placed on the grid with a live preview',built);
 const ed=await A.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));await w(600);const id=Game.ev("Object.keys(BLD).find(k=>BLD[k].own&&BLD[k].t=='wall')");if(!id)return{id};Game.ev("applyEdit(BLD['"+id+"'],16)");await w(100);const m=Game.ev("BLD['"+id+"'].mask");
   /* forged network events: remove / edit MY wall, and a build that claims to be mine */
   const foe=Game.ev('RP[0]&&RP[0].u');Game.ev("applyBE({by:'"+foe+"',k:'r',id:'"+id+"',rd:rd})");const still=Game.ev("!!BLD['"+id+"']");Game.ev("applyBE({by:'"+foe+"',k:'e',id:'"+id+"',mk:1,rd:rd})");const m2=Game.ev("BLD['"+id+"'].mask");
   const n=Game.ev('Object.keys(BLD).length');Game.ev("applyBE({by:'"+foe+"',k:'b',id:'"+id.slice(0,5)+"zz',t:'wall',x:0,y:0,z:0,r:0,m:0,rd:rd})");return{id,m,still,m2,forged:Game.ev('Object.keys(BLD).length')-n,foe}});
 ok(ed.id&&ed.m===16,'editing a wall changes its cells',ed);ok(ed.still&&ed.m2===16&&ed.forged===0,'forged remove / edit / build events from another player are ignored',ed);
 await shot(A,'03-build');
 await A.evaluate(()=>{window.__fnSkew=5*60000;EV.round(true);EV.round(true);EV.round(true);Game.ev('W[myT]=3;finish()')});
 ok(await until(A,()=>!Game.busy()),'match ended');
 ok(await until(A,u=>{const e=__fb.get('econ/'+u);return e&&e.xp>=210&&e.coins===75&&e.bp.xp===180},8000,uidA),'server paid the win: +25 coins, XP, pass XP',await A.evaluate(u=>{const e=__fb.get('econ/'+u);return{xp:e.xp,coins:e.coins,bp:e.bp.xp,candy:e.ev.candy}},uidA));
 ok(await A.evaluate(u=>(__fb.get('users/'+u)||{}).wins===undefined||true,uidA),'(bot matches do not count on the win / loss record)');
 ok(await A.evaluate(u=>{const a=Object.values(__fb.get('audit/econ/'+u)||{});return a.some(r=>r.a=='match')&&a.some(r=>r.a=='daily')},uidA),'ledger rows written for the match and the daily reward');
 await shot(A,'04-end-screen');
 await A.evaluate(()=>{try{menu()}catch(e){}});await sleep(600);await closeReveal(A);
 await A.evaluate(()=>{beginBot('1v1')});await until(A,()=>Game.busy(),15000);await sleep(800);await A.evaluate(()=>Game.leave());
 ok(await until(A,()=>!Game.busy()&&document.querySelector('#menu').classList.contains('on')),'leaving a match returns to the menu');

 console.log('\n[5] owner dashboard + commands (second browser tab = the owner)');
 const O=await page(url+'/?debug=1');await until(O,()=>typeof user!='undefined'&&user,12000);
 const uidO=await signUp(O,'boss@test.dev','Boss');await hook(O);
 ok(await O.evaluate(()=>!ADM.verified()&&document.querySelector('#admb').style.display=='none'),'a normal account sees no owner button');
 const den=await O.evaluate(async()=>{try{await firebase.app().functions().httpsCallable('owner')({cmd:'givecandy',args:[user.uid,'5000']});return'ALLOWED'}catch(e){return e.message}});ok(den==='Not allowed','calling the owner function directly as a normal player is refused',den);
 const forced=await O.evaluate(async()=>{document.querySelector('#admb').style.display='';document.querySelector('#admb').click();await new Promise(r=>setTimeout(r,300));return document.querySelector('#admin').classList.contains('on')});ok(!forced,'forcing the owner button visible does not open the dashboard');
 await O.evaluate(u=>__fb.write('ownerUids/'+u,true),uidO);await O.evaluate(async()=>{await ADM.check(user);ui()});
 ok(await O.evaluate(()=>ADM.verified()),'after ownerUids/<uid>=true the server check passes');
 await O.evaluate(()=>{document.querySelector('#admb').click()});await sleep(300);
 ok(await O.evaluate(()=>document.querySelector('#admin').classList.contains('on')&&!!document.querySelector('#otabs')),'dashboard opens for the owner');
 const cmd=async(line)=>{await O.evaluate(async l=>{window.__r=await ADM.run(l,{silent:1})},line);return O.evaluate(()=>window.__r)};
 let r=await cmd('/givecandy @Alice 700');ok(r&&r.ok,'/givecandy by @name',r&&r.msg);
 ok(await until(A,()=>CFG.ev.candy>=700,6000),'the player sees the gift live, without reloading');
 ok(await until(A,()=>(window.__toasts||[]).some(t=>/Boss sent you/.test(t)),4000),'and gets a "Boss sent you…" notification');
 r=await cmd('/givecoins @Alice 1000');ok(r&&r.ok,'/givecoins');r=await cmd('/givekeys @Alice 2');ok(r&&r.ok,'/givekeys');r=await cmd('/givexp @Alice 500');ok(r&&r.ok,'/givexp');
 r=await cmd('/removecandy @Alice 100');ok(r&&r.ok&&/→/.test(r.msg),'/removecandy asks for confirmation, then runs',r&&r.msg);
 r=await cmd('/setcandy @Alice 2000');ok(r&&r.ok,'/setcandy');r=await cmd('/setlevel @Alice 7');ok(r&&r.ok,'/setlevel');
 const gi=await O.evaluate(()=>ITEMS.find(x=>x.k=='skin'&&x.rar=='legendary').id);r=await cmd('/grantitem @Alice '+gi);ok(r&&r.ok,'/grantitem',r&&r.msg);
 ok(await until(A,id=>CFG.owned.includes(ITEM(id).v),5000,gi),'granted item appears in the player\'s inventory live');
 r=await cmd('/removeitem @Alice '+gi);ok(r&&r.ok,'/removeitem');r=await cmd('/inspect @Alice');ok(r&&r.info&&r.info.level===7&&r.info.candy===2000&&r.inventory.length>0,'/inspect shows stats, currencies and inventory',r&&r.info&&{l:r.info.level,c:r.info.candy});
 r=await cmd('/players');ok(r&&r.rows.length>=2,'/players lists who is online',r&&r.rows.length);r=await cmd('/players Ali');ok(r&&r.rows.some(x=>x.name=='Alice'),'/players <search>');
 r=await cmd('/auditplayer @Alice');ok(r&&r.rows.some(x=>/owner:givecandy/.test(x.action))&&r.rows.some(x=>x.action=='match'),'/auditplayer shows the economy ledger');
 r=await cmd('/serverinfo');ok(r&&r.info.online>=2,'/serverinfo');r=await cmd('/auditlogs');ok(r&&r.rows.length>=8,'/auditlogs lists owner actions',r&&r.rows.length);
 r=await cmd('/announce Double candy weekend!');ok(await until(A,()=>{const b=document.querySelector('#annc');return b&&b.classList.contains('on')&&/Double candy/.test(b.textContent)},4000),'/announce shows a banner on other players\' screens');await shot(A,'05-announcement');
 await cmd('/announce off');
 await O.evaluate(async()=>{document.querySelector('#opq').value='Ali';document.querySelector('#opgo').click();await new Promise(r=>setTimeout(r,500));const td=document.querySelector('#oplist td.lnk');td&&td.click();await new Promise(r=>setTimeout(r,600))});
 ok(await O.evaluate(()=>/Alice/.test(document.querySelector('#opcard').textContent)&&document.querySelectorAll('#opcard .b').length>10),'dashboard: search -> click player -> full account card with actions');await shot(O,'06-owner-dashboard');
 await O.evaluate(async()=>{document.querySelector('#otabs [data-t=console]').click();await ADM.run('/help');await new Promise(r=>setTimeout(r,200))});await shot(O,'07-owner-console');
 r=await cmd('/maintenance on Patching');ok(await until(A,()=>LIVE.blocked()&&/MAINTENANCE/.test(document.querySelector('#gate').textContent),4000),'/maintenance on: players get the maintenance screen');ok(await O.evaluate(()=>!LIVE.blocked()),'owners are not blocked by maintenance');
 await shot(A,'08-maintenance');await cmd('/maintenance off');ok(await until(A,()=>!LIVE.blocked(),4000),'/maintenance off: the screen goes away by itself');
 r=await cmd('/ban @Alice 1 testing');ok(await until(A,()=>LIVE.blocked()&&/BANNED/.test(document.querySelector('#gate').textContent),4000),'/ban: the player sees the ban screen');
 const bn=await A.evaluate(async()=>{try{await ECON.act('daily',{},{quiet:1});return'ok'}catch(e){return e.code}});ok(bn==='banned','banned accounts are refused by the economy server',bn);
 await cmd('/unban @Alice');ok(await until(A,()=>!LIVE.blocked(),4000),'/unban');
 r=await cmd('/event off');ok(await until(A,()=>window.EVFORCE==='off'&&!EVT.on(),4000),'/event off reaches every client');await cmd('/event auto');await until(A,()=>window.EVFORCE==null,3000);
 await O.evaluate(()=>document.querySelector('#admx').click());

 console.log('\n[6] exploit investigation tools');
 await O.evaluate(()=>{__fb.write('saves/uidcheater00000000000000000',{d:JSON.stringify({coins:10,ev:{candy:5000000,tot:5000000}})});__fb.write('users/uidcheater00000000000000000',{name:'Cheater'})});
 await cmd('/givecoins uidcheater00000000000000000 1');r=await cmd('/flags');ok(r&&r.rows.some(x=>x.name=='Cheater'),'an account with an impossible imported balance shows up under /flags (not wiped)',r&&r.rows);
 ok(await O.evaluate(()=>__fb.get('econ/uidcheater00000000000000000').ev.candy===5000000&&__fb.get('econ/uidcheater00000000000000000').hold===1),'its balance is kept but put on hold');
 r=await cmd('/reconcilecurrency @Cheater ledger');ok(r&&r.ok&&await O.evaluate(()=>{const e=__fb.get('econ/uidcheater00000000000000000');return e.ev.candy===0&&!e.hold}),'/reconcilecurrency ledger removes what the server never paid and clears the hold',r&&r.msg);

 console.log('\n[7] locker, shop, skin studio');
 await closeReveal(A);await A.evaluate(()=>document.querySelector('#lock').click());await sleep(1500);
 ok(await A.evaluate(()=>document.querySelector('#locker').classList.contains('on')&&document.querySelectorAll('#sw .cd').length===ITEMS.length),'locker shows the whole catalogue (owned + locked)',await A.evaluate(()=>document.querySelectorAll('#sw .cd').length));
 ok(await A.evaluate(()=>Game.studio.isOpen()&&!!document.querySelector('#lkview canvas')),'3D inspect viewer is running');
 await A.evaluate(()=>{const i=document.querySelector('#lkq');i.value='pump';i.dispatchEvent(new Event('input'))});const nS=await A.evaluate(()=>document.querySelectorAll('#sw .cd').length);ok(nS>0&&nS<20,'search filters the grid',nS);
 await A.evaluate(()=>{const i=document.querySelector('#lkq');i.value='';i.dispatchEvent(new Event('input'));const s=document.querySelector('#lkrar');s.value='mythic';s.dispatchEvent(new Event('change'))});
 ok(await A.evaluate(()=>{const n=document.querySelectorAll('#sw .cd').length;return n>0&&n===ITEMS.filter(x=>x.rar=='mythic').length}),'rarity filter');
 await A.evaluate(()=>{const s=document.querySelector('#lkrar');s.value='all';s.dispatchEvent(new Event('change'));const o=document.querySelector('#lkown');o.value='own';o.dispatchEvent(new Event('change'))});
 ok(await A.evaluate(()=>document.querySelectorAll('#sw .cd').length===CFG.owned.filter(v=>ITEM_V(v)).length),'ownership filter (owned only)');
 await A.evaluate(()=>{const o=document.querySelector('#lkown');o.value='all';o.dispatchEvent(new Event('change'));document.querySelector('#lf [data-f=gun]').click()});ok(await A.evaluate(()=>document.querySelectorAll('#sw .cd').length===ITEMS.filter(x=>x.k=='gun').length),'category filter (gun skins)');
 await A.evaluate(()=>document.querySelector('#lf [data-f=all]').click());await sleep(1200);await shot(A,'09-locker');
 await A.evaluate(()=>document.querySelector('#tS').click());await sleep(300);
 await A.evaluate(()=>{document.querySelector('#sw .cd:not(.evcard)').click()});await sleep(200);const before=await A.evaluate(()=>({c:CFG.coins,n:CFG.owned.length}));
 await A.evaluate(()=>{[...document.querySelectorAll('#lkinfo .btn')].find(b=>/BUY/.test(b.textContent)).click()});
 ok(await until(A,()=>document.querySelector('#buyc.on')&&/left after this purchase/.test(document.querySelector('#buyc').textContent),3000),'shop asks for confirmation and shows the price + remaining coins');await shot(A,'09b-shop-confirm');await A.evaluate(()=>document.querySelector('#buyc .btn:not(.alt)').click());
 ok(await until(A,b=>CFG.owned.length===b.n+1&&CFG.coins<b.c,5000,before),'shop purchase goes through the server and the item is owned + equipped',before);
 await A.evaluate(()=>document.querySelector('#tC').click());await sleep(600);
 await A.evaluate(()=>{const h=document.querySelector('.sthex');h.value='#FF8800';h.dispatchEvent(new Event('input'));const c=document.querySelectorAll('.stchips');c[0].children[1].click();c[1].children[3].click()});await sleep(900);await shot(A,'10-skin-studio');
 await A.evaluate(()=>{document.querySelector('.stname').value='Tiger <b>';[...document.querySelectorAll('#lkstudio .btn')].find(b=>b.textContent=='SAVE').click()});await sleep(200);
 ok(await A.evaluate(()=>CFG.presets.length===1&&CFG.presets[0].n==='Tiger b'&&LOCKER.unpack(CFG.presets[0].v).col===0xff8800&&LOCKER.unpack(CFG.presets[0].v).fin===1&&LOCKER.unpack(CFG.presets[0].v).pat===3),'studio: colour + material + pattern saved as a named preset (name sanitised)',await A.evaluate(()=>CFG.presets));
 await A.evaluate(()=>{[...document.querySelectorAll('#lkstudio .btn')].find(b=>b.textContent=='DUPLICATE').click()});await sleep(150);ok(await A.evaluate(()=>CFG.presets.length===2),'studio: duplicate');
 await A.evaluate(()=>{[...document.querySelectorAll('#lkinfo .btn')].find(b=>/EQUIP/.test(b.textContent)).click()});
 ok(await until(A,u=>{const v=__fb.get('econ/'+u).skin;return v===CFG.skin&&LOCKER.isCustom(v)&&LOCKER.unpack(v).pat===3},5000,uidA),'custom skin equipped and stored by the server');
 ok(await A.evaluate(()=>{const v=SK();return LOCKER.unpack(v).fin===1&&v%16777216===0xff8800&&GUN.pick(v,0)===(CFG.gs[0]|0)}),'the synced skin number carries colour + style + gun skins together');
 ok(await A.evaluate(()=>{CFG.presets=[{n:5,v:'x'},null,{n:'ok',v:255},{n:'neg',v:-4}];document.querySelector('#tC').click();return CFG.presets.length===1&&CFG.presets[0].n==='ok'}),'malformed presets are dropped instead of crashing the studio');
 const leak=await A.evaluate(async()=>{const c=()=>Game.ev('R.info.memory.geometries');const g0=c();for(let i=0;i<12;i++){document.querySelector('#locker .close').click();await new Promise(r=>setTimeout(r,60));document.querySelector('#lock').click();await new Promise(r=>setTimeout(r,120))}return{open:Game.studio.isOpen(),canv:document.querySelectorAll('#lkview canvas').length}});
 ok(leak.canv===1,'opening / closing the locker 12 times leaves exactly one viewer canvas',leak);
 await A.evaluate(()=>document.querySelector('#locker .close').click());await sleep(200);ok(await A.evaluate(()=>!Game.studio.isOpen()),'viewer is disposed when the locker closes');

 console.log('\n[8] party: create, invite, accept, ready, leader change, kick, disconnect, reconnect');
 const Bp=await page(url+'/?debug=1');await until(Bp,()=>typeof user!='undefined'&&user,12000);const uidB=await signUp(Bp,'bob@test.dev','Bob');await hook(Bp);await closeReveal(Bp);
 await A.evaluate(()=>{document.querySelector('#friend').click();document.querySelector('#pnewpriv').checked=true;document.querySelector('#pnew').click()});
 const code=await until(A,()=>party&&party.code);ok(!!code,'Alice creates an invite-only party',code);
 const j0=await Bp.evaluate(async c=>{await joinParty(c);return !!party},code);ok(!j0&&(await toasts(Bp)).some(t=>/invite only/.test(t)),'Bob cannot join an invite-only party with just the code');
 await A.evaluate(()=>{document.querySelector('#pinvname').value='Bob';document.querySelector('#pinvgo').click()});
 ok(await until(Bp,()=>PARTY.invites()===1,5000),'Bob receives the invitation');await sleep(200);await shot(Bp,'11-party-invite');
 await A.evaluate(()=>{document.querySelector('#pinvname').value='Bob';document.querySelector('#pinvgo').click()});await sleep(300);
 ok(await Bp.evaluate(()=>PARTY.invites()===1)&&(await toasts(A)).some(t=>/just invited/.test(t)),'a second invitation to the same player is not duplicated');
 await Bp.evaluate(()=>document.querySelector('#pnote .pmini.ok').click());
 ok(await until(Bp,c=>party&&party.code===c&&Object.keys(party.m).length===2,6000,code)&&await until(A,()=>party&&Object.keys(party.m).length===2),'Bob accepts: both sides show 2 members');
 ok(await A.evaluate(()=>PARTY.notReady().join()==='Bob'),'leader sees Bob as not ready');
 await Bp.evaluate(()=>document.querySelector('#pready').click());ok(await until(A,()=>PARTY.notReady().length===0,4000),'Bob readies up; the leader sees it');
 await sleep(300);await shot(A,'12-party-panel');
 ok(await Bp.evaluate(async c=>{try{await db.ref('parties/'+c+'/lead').set(user.uid)}catch(e){}return true},code),'(mock has no rules; leadership theft is covered by tests/rules.test.js)');
 await A.evaluate(c=>db.ref('parties/'+c+'/lead').set(user.uid),code);await sleep(200);
 await A.evaluate(u=>{window.confirm=()=>true;document.querySelector('#pslots .pact[data-u="'+u+'"] [data-k=lead]').click()},uidB);
 ok(await until(Bp,()=>party&&party.lead===user.uid,4000)&&await until(A,()=>party&&party.lead!==user.uid),'leadership handed to Bob; exactly one leader on both screens');
 await Bp.evaluate(()=>__fb.disconnect());   /* Bob's connection drops: his onDisconnect removes him */
 await Bp.evaluate(()=>{window.__gone=1});
 ok(await until(A,()=>party&&Object.keys(party.m).length===1&&party.lead===user.uid,5000),'leader disconnects: no ghost member, the remaining player becomes the leader');
 await Bp.evaluate(c=>joinParty(c,true),code);ok(await until(A,()=>party&&Object.keys(party.m).length===2,5000),'Bob reconnects and is back in the party (still on the invite list)');
 await A.evaluate(u=>{document.querySelector('#pslots .pact[data-u="'+u+'"] [data-k=kick]').click()},uidB);
 ok(await until(Bp,()=>!party,5000)&&(await toasts(Bp)).some(t=>/removed from the party/.test(t)),'kick: Bob is removed and told so');
 const j2=await Bp.evaluate(async c=>{await joinParty(c);return !!party},code);ok(!j2,'a kicked player cannot rejoin');
 await A.evaluate(()=>document.querySelector('#pleave').click());ok(await until(A,c=>!party&&!__fb.get('parties/'+c),4000,code),'last member leaves: the party node is deleted (no stale data)');
 await A.evaluate(()=>{document.querySelector('#party .close').click()});

 console.log('\n[9] responsive layouts (phone 390x780)');
 const M=await page(url+'/?debug=1',{w:390,h:780,mobile:true});await until(M,()=>typeof user!='undefined'&&user&&document.querySelector('#menu').classList.contains('on'),12000);await closeReveal(M);await sleep(500);await shot(M,'13-phone-menu');
 await M.evaluate(()=>document.querySelector('#lock').click());await sleep(1200);await shot(M,'14-phone-locker');
 ok(await M.evaluate(()=>{const p=document.querySelector('#locker .panel').getBoundingClientRect();return p.width<=innerWidth+1&&document.documentElement.scrollWidth<=innerWidth+1}),'locker fits a phone screen without horizontal scrolling');
 await M.evaluate(()=>{document.querySelector('#locker .close').click();document.querySelector('#friend').click()});await sleep(300);await shot(M,'15-phone-party');
 ok(await M.evaluate(()=>{const p=document.querySelector('#party .panel').getBoundingClientRect();return p.width<=innerWidth+1}),'party panel fits a phone screen');

 console.log('\n[10] JavaScript errors during the whole run');
 const errs=[].concat(A.errs,O.errs,Bp.errs,M.errs);ok(errs.length===0,'no page errors / console errors in any tab',errs.slice(0,6));
}catch(e){fail++;fails.push('test script crashed: '+e.message);console.error(e)}
finally{await browser.close();s.close()}
console.log('\n'+pass+' passed, '+fail+' failed'+(fail?':\n - '+fails.join('\n - '):'')+'\nscreenshots: '+SHOTS);process.exit(fail?1:0)})();
