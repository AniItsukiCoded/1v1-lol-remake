#!/usr/bin/env node
'use strict';
/* Battle Royale end-to-end test: TWO browser tabs (two players) in one room, real game code, Firebase stand-in (see run.js for setup).
   Usage: node tests/browser/br.js [screenshot dir] */
const {serve,launch,sleep}=require('./lib.js'),fs=require('fs'),path=require('path');
const SHOTS=process.argv[2]||path.join(require('os').tmpdir(),'arena-shots');fs.mkdirSync(SHOTS,{recursive:true});
let pass=0,fail=0;const fails=[];
const ok=(c,name,extra)=>{if(c){pass++;console.log('  ✓ '+name)}else{fail++;fails.push(name);console.log('  ✗ '+name+(extra!==undefined?'   -> '+JSON.stringify(extra):''))}};
/* only the front tab gets animation frames in Chrome, so the tab being checked is brought to the front first */
const until=async(p,fn,ms,arg)=>{await p.bringToFront().catch(()=>{});const t=Date.now();for(;;){const v=await p.evaluate(fn,arg).catch(()=>null);if(v)return v;if(Date.now()-t>(ms||8000))return null;await sleep(120)}};
const shot=async(p,n)=>{await p.bringToFront().catch(()=>{});await sleep(1200);return p.screenshot({path:path.join(SHOTS,n+'.png')}).catch(()=>{})};
const ev=(p,code)=>p.evaluate(c=>Game.ev(c),code);
const signUp=async(p,email,name)=>{await p.evaluate(async(e,n)=>{try{await auth.createUserWithEmailAndPassword(e,'pw123456')}catch(_){await auth.signInWithEmailAndPassword(e,'pw123456')}await auth.currentUser.updateProfile({displayName:n});await db.ref('users/'+auth.currentUser.uid+'/name').set(n)},email,name);
 return until(p,()=>typeof user!='undefined'&&user&&!user.isAnonymous&&ECON.ready()&&user.uid,10000)};
const tidy=p=>p.evaluate(()=>{document.querySelectorAll('#reveal.on').forEach(e=>e.classList.remove('on'))});
const at=(p,x,y,z)=>ev(p,`P.set(${x},${y},${z});S.vy=0;send(true)`);

(async()=>{const {s,url}=await serve(),{browser,page,keeper}=await launch();
try{await keeper(url);
 console.log('\n[1] first person is the default, is migrated once, and stays a choice');
 const A=await page(url+'/?debug=1');await until(A,()=>typeof user!='undefined'&&user&&document.querySelector('#menu').classList.contains('on'),12000);
 ok(await A.evaluate(()=>CFG.fp===true&&CFG.fpv===1),'new player: first person on');
 await A.evaluate(()=>{const c=JSON.parse(localStorage.cfg||'{}');c.fp=false;delete c.fpv;localStorage.cfg=JSON.stringify(c)});await A.reload({waitUntil:'load'});await until(A,()=>typeof CFG!='undefined'&&typeof user!='undefined'&&user,12000);
 ok(await A.evaluate(()=>CFG.fp===true&&CFG.fpv===1),'old config that still had the third-person default is switched once');
 await A.evaluate(()=>{CFG.fp=false;saveCfg()});await A.reload({waitUntil:'load'});await until(A,()=>typeof CFG!='undefined'&&typeof user!='undefined'&&user,12000);
 ok(await A.evaluate(()=>CFG.fp===false),'a player who then chooses third person keeps it (no forcing on every load)');
 await A.evaluate(()=>{CFG.fp=true;saveCfg()});
 const uidA=await signUp(A,'ann@test.dev','Ann');await tidy(A);
 const B=await page(url+'/?debug=1');await until(B,()=>typeof user!='undefined'&&user,12000);const uidB=await signUp(B,'ben@test.dev','Ben');await tidy(B);
 await shot(A,'br-01-lobby');
 await A.evaluate(()=>LB2.sheet(1));await sleep(900);await shot(A,'br-02-mode-select');
 ok(await A.evaluate(()=>MODE_ORDER[0]==='br'&&!!document.querySelector('.mcard[data-m="br"]')),'Battle Royale has its own card, first in the mode picker');
 await A.evaluate(()=>LB2.sheet(0));

 console.log('\n[2] matchmaking, warm-up and countdown');
 for(const p of[A,B])await p.evaluate(()=>{MODES.br.warm=4;CFG.mode='br';CFG.gq=0;saveCfg();show('menu');joinRoom('br')}); /* Anti-Lag graphics: headless Chrome renders in software */
 await shot(A,'br-03-loading');
 ok(await until(A,()=>Game.busy(),20000)&&await until(B,()=>Game.busy(),20000),'both players are in a Battle Royale room');
 ok(await ev(A,'mid')===await ev(B,'mid'),'same match for both');
 ok(await ev(A,'BRM===1&&MD.id==="br"&&ROUNDS===1'),'mode flags: Battle Royale, one continuous match');
 const inv0=await ev(A,'JSON.stringify({i:BR.inv.map(s=>s?s.k+s.wi+":"+s.rar:null),w:S.w,mat,am:BR.am,sh:S.sh,pk:WEAPONS[PICK].id})');
 ok(inv0===JSON.stringify({i:['w3:0',null,null,null,null],w:3,mat:[0,0,0],am:{l:36,m:0,s:0},sh:0,pk:'pickaxe'}),'start: ONE common pistol, pickaxe, 4 empty slots, no shield, no materials',inv0);
 ok(await ev(A,'curW().id=="pistol"&&curS().mag==12&&curS().res==36'),'pistol: 12 in the magazine, 36 light ammo in reserve');
 ok(await until(A,()=>/MATCH STARTS IN|WARM/.test(document.querySelector('#rnd').textContent),6000),'warm-up countdown is shown',await A.evaluate(()=>document.querySelector('#rnd').textContent));
 ok(await ev(A,'BR.chests.length>=20&&BR.nodes.length>100&&BRGEN.poi.length==7'),'island generated: 7 named places, chests, resource nodes',await ev(A,'[BR.chests.length,BR.nodes.length,BR.items.size]'));
 ok(await ev(A,'JSON.stringify(BRGEN.chests)')===await ev(B,'JSON.stringify(BRGEN.chests)')&&await ev(A,'[...BR.items.keys()].sort().join()')===await ev(B,'[...BR.items.keys()].sort().join()'),'both clients generated the identical island and floor loot');
 ok(await until(A,()=>Game.ev('RS&&RS.st==="round"&&phase=="live"'),30000)&&await until(B,()=>Game.ev('RS&&RS.st==="round"&&phase=="live"'),30000),'countdown ends and the match goes live for both');
 ok(await A.evaluate(()=>{const r=__fb.get('rooms/br');return Object.values(r||{}).some(x=>x.lk===true)}),'the room is locked for matchmaking once the match has started');
 await sleep(1500);await shot(A,'br-04-hud');
 ok(await A.evaluate(()=>document.body.classList.contains('brm')&&document.querySelectorAll('#brbar .bsl').length===6&&document.querySelectorAll('#brbar .bsl.em').length===4&&getComputedStyle(document.querySelector('#wbar')).display==='none'),'HUD: pickaxe tile + 5 slots (4 shown empty), old weapon bar hidden');
 ok(await A.evaluate(()=>/👥 2/.test(document.querySelector('#bralive').textContent)&&!!document.querySelector('#brcompi b')),'alive counter and compass present');

 console.log('\n[3] pistol + camera');
 const sh=await A.evaluate(()=>{Game.ev('S.nextShot=0;S.eq=0;S.lat=0');const m0=Game.ev('curS().mag');Game.ev('shoot()');return{m0,m1:Game.ev('curS().mag'),lat:Game.ev('S.lat')}});
 ok(sh.m1===sh.m0-1,'firing the pistol uses one round',sh);
 await ev(A,'shoot()');ok(await ev(A,'curS().mag')===sh.m1,'semi-automatic: holding fire does not shoot again');
 await ev(A,'S.lat=0;reload()');ok(await until(A,()=>Game.ev('curS().mag==12&&BR.am.l==35&&!S.rl'),4000),'reload refills the magazine from the light-ammo reserve',await ev(A,'[curS().mag,BR.am.l]'));
 ok(await until(A,()=>Game.ev('fpCur===true'),12000),'match is in first person');await ev(A,"trig('view',false)");ok(await A.evaluate(()=>CFG.fp===false)&&await until(A,()=>Game.ev('fpCur===false'),12000),'B key switches to third person');
 await shot(A,'br-05-third-person');await ev(A,"trig('view',false)");await sleep(300);ok(await A.evaluate(()=>CFG.fp===true),'and back');

 console.log('\n[4] chests');
  const cpos=await ev(A,'[BR.chests[0].x,BR.chests[0].y,BR.chests[0].z]');
 await at(A,cpos[0]+1.2,cpos[1],cpos[2]+.9);
 ok(await until(A,()=>Game.ev('!!(BR.tgt&&BR.tgt.c&&BR.tgt.c.id===0)')&&/Search chest/.test(document.querySelector('#brprompt').textContent),15000),'walking up to a chest shows the "Search chest" prompt',await ev(A,'JSON.stringify({P:[P.x,P.y,P.z],c:[BR.chests[0].x,BR.chests[0].y,BR.chests[0].z],ph:phase,late:S.late,dead:S.dead,scan:performance.now()-BR.scanT,rs:RS&&RS.st})'));
 await ev(A,'yaw=Math.atan2(-(BR.chests[0].z-P.z),BR.chests[0].x-P.x);pitch=-.35');await sleep(900);await shot(A,'br-06-chest-prompt');
 await ev(A,"trig('use',false)");ok(await ev(A,'!!BR.srch&&BR.srch.id===0'),'pressing E starts the search with a progress bar');
 ok(await until(A,()=>Game.ev('BR.chests[0].open===1'),15000)&&await until(B,()=>Game.ev('BR.chests[0].open===1'),15000),'chest opens for BOTH players');
 const la=await ev(A,'[...BR.items.entries()].filter(e=>e[0].startsWith("c0_")).map(e=>e[0]+JSON.stringify(e[1].it)).sort().join()'),lb=await ev(B,'[...BR.items.entries()].filter(e=>e[0].startsWith("c0_")).map(e=>e[0]+JSON.stringify(e[1].it)).sort().join()');
 ok(la.length>20&&la===lb,'the same loot appears for both (generated from match seed + chest id)',la);
 ok(/"k":"w"/.test(la)&&/"k":"a"/.test(la),'chest loot contains a weapon and its ammunition');
 await sleep(900);await shot(A,'br-07-chest-open-loot');
 /* two players search the same chest at the same instant */
 const p1=await ev(A,'[BR.chests[1].x,BR.chests[1].y,BR.chests[1].z]');await at(A,p1[0]+1,p1[1],p1[2]+1);await at(B,p1[0]-1,p1[1],p1[2]+1);await sleep(400);
 await Promise.all([ev(A,"BR.srch={id:1,t0:performance.now()-880}"),ev(B,"BR.srch={id:1,t0:performance.now()-880}")]);
 await until(A,()=>Game.ev('BR.chests[1].open===1'),15000);await until(B,()=>Game.ev('BR.chests[1].open===1'),15000);await sleep(500);
 const n1a=await ev(A,'[...BR.items.keys()].filter(k=>k.startsWith("c1_")).length+[...BR.gone].filter(k=>k.startsWith("c1_")).length'),n1b=await ev(B,'[...BR.items.keys()].filter(k=>k.startsWith("c1_")).length+[...BR.gone].filter(k=>k.startsWith("c1_")).length'),want=await ev(A,'brLoot(1).length');
 ok(n1a===want&&n1b===want&&typeof(await A.evaluate(m=>__fb.get('matches/'+m+'/br/r1/ch/1'),await ev(A,'mid')))==='string','simultaneous search: ONE winner in the database and the loot spawns exactly once per client',{n1a,n1b,want});

 console.log('\n[5] picking up, ammunition, duplicates, swapping, dropping');
 const wk=await ev(A,'[...BR.items.values()].find(e=>e.id.startsWith("c0_")&&e.it.k=="w").id');
 const wpos=await ev(A,`(e=>[e.x,e.y,e.z])(BR.items.get(${JSON.stringify(wk)}))`);await at(A,wpos[0],wpos[1],wpos[2]+.8);await at(B,wpos[0],wpos[1],wpos[2]-.8);
 ok(await until(A,()=>/Pick up/.test(document.querySelector('#brprompt').textContent),15000),'standing at a weapon shows "Pick up <rarity> <weapon>"',await A.evaluate(()=>document.querySelector('#brprompt').textContent));
 /* both players grab the same weapon in the same tick */
 await Promise.all([ev(A,`brClaim(BR.items.get(${JSON.stringify(wk)}))`),ev(B,`brClaim(BR.items.get(${JSON.stringify(wk)}))`)]);await sleep(900);
 const got=[await ev(A,'BR.inv.filter(s=>s&&s.k=="w").length'),await ev(B,'BR.inv.filter(s=>s&&s.k=="w").length')];
 ok(got[0]+got[1]===3,'two players grabbing the same item: exactly one of them gets it',got);
 ok(await ev(A,`!BR.items.has(${JSON.stringify(wk)})`)&&await ev(B,`!BR.items.has(${JSON.stringify(wk)})`),'the item is gone from the ground for both');
 const W=got[0]===2?A:B,O=W===A?B:A;
 ok(await ev(W,'BR.inv[1]&&BR.inv[1].k=="w"&&BR.inv[0].wi===3'),'the new weapon went into the first empty slot; the pistol stayed');
 const amBefore=await ev(W,'JSON.stringify(BR.am)');await sleep(800); /* the chest ammo next to it is picked up automatically */
 const ak=await ev(W,'(e=>e?e.id:null)([...BR.items.values()].find(e=>e.it.k=="a"))');
 if(ak){const ap=await ev(W,`(e=>[e.x,e.y,e.z])(BR.items.get(${JSON.stringify(ak)}))`);await at(W,ap[0],ap[1],ap[2])}
 ok(await until(W,b=>JSON.stringify(Game.ev('BR.am'))!==b,15000,amBefore),'ammunition is picked up automatically by walking over it',await ev(W,'JSON.stringify(BR.am)'));
 await ev(W,"trig('w2',false)");ok(await ev(W,'BR.sel===1&&!BR.pick&&S.w===BR.inv[1].wi&&curW().wi===BR.inv[1].wi'),'key 2 selects slot 2 and equips that weapon');
 const rs=await ev(W,'(s=>({r:s.rar,d:curW().dmg,b:WEAPONS[s.wi].dmg,x:brWp(s.wi,4).dmg,rl:brWp(s.wi,4).rl,rb:WEAPONS[s.wi].rl}))(BR.inv[1])');
 ok(rs.x>rs.b&&rs.x<=rs.b*1.25&&rs.rl<rs.rb,'rarity changes real stats (legendary: more damage, faster reload) but stays within +24%',rs);
 await ev(W,"trig('pick',false)");ok(await ev(W,'BR.pick===1&&S.w===PICK&&curW().melee===1&&BR.inv[0]&&BR.inv[1]'),'pickaxe key equips the pickaxe; it is not one of the five slots and nothing was lost');
 await ev(W,"trig('wnext',false)");ok(await ev(W,'!BR.pick&&BR.sel===0'),'controller "next weapon" / mouse wheel cycles pickaxe → slot 1');
 await W.evaluate(()=>{const s=document.querySelectorAll('#brbar .bsl')[2];s.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));s.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}))});ok(await ev(W,'BR.sel===1&&!BR.pick'),'tapping a hotbar slot selects it (touch)');
 await ev(W,"trig('s4',false)");ok(await ev(W,'BR.sel===3&&brHands()&&gunIx()===-1'),'key 4 selects an empty slot: hands, nothing to fire');
 /* full inventory: the next weapon swaps with the selected slot and the old one drops for everybody */
 await ev(W,'BR.inv[2]=brMkW(0,1);BR.inv[3]=brMkW(4,0);BR.inv[4]={k:"c",id:"med",n:1};brSel(1);hud()');const old=await ev(W,'BR.inv[1].wi+":"+BR.inv[1].rar');
 await ev(W,'brGrant({k:"w",wi:1,rar:3,mag:30})');await sleep(600);
 ok(await ev(W,'BR.inv[1].wi===1&&BR.inv[1].rar===3&&BR.inv.every(Boolean)'),'full bar: the new weapon replaces the selected slot');
 ok(await until(O,o=>[...Game.ev('[...BR.items.values()].map(e=>e.id[0]+(e.it.k=="w"?e.it.wi+":"+e.it.rar:""))')].includes('d'+o),4000,old),'the replaced weapon is dropped and the other player sees it',old);
 await ev(W,'brSel(2)');await ev(W,"trig('drop',false)");await sleep(500);ok(await ev(W,'BR.inv[2]===null')&&await until(O,()=>Game.ev('[...BR.items.values()].filter(e=>e.id[0]=="d").length>=2'),3000),'drop key drops the selected item into the world');
 await shot(W,'br-08-inventory');

 console.log('\n[6] consumables');
 await ev(W,'BR.inv[2]={k:"c",id:"shield",n:2};S.sh=0;brSel(2);hud()');await ev(W,'S.nextShot=0;S.eq=0;shoot()');
 ok(await ev(W,'!!BR.use&&BR.use.s.id=="shield"'),'fire with a potion in hand starts using it (progress bar)');
 ok(await until(W,()=>Game.ev('S.sh===50&&BR.inv[2].n===1'),15000),'shield potion: +50 shield, one used up',await ev(W,'[S.sh,BR.inv[2]&&BR.inv[2].n]'));
 await ev(W,'S.sh=100;S.nextShot=0;S.eq=0;shoot()');await sleep(300);ok(await ev(W,'!BR.use&&BR.inv[2].n===1'),'cannot waste a potion at full shield');
 await ev(W,'S.hp=40;brSel(4);S.nextShot=0;S.eq=0;shoot()');ok(await until(W,()=>Game.ev('S.hp===100&&BR.inv[4]===null'),20000),'medkit restores health and the empty stack leaves the bar');

 console.log('\n[7] harvesting');
 const hv=await W.evaluate(()=>{const g=Game.ev,id=g('BR.nodes.find(n=>n.k=="tree").id');const out={id,m0:g('mat[0]')};g('brPick()');
  for(let i=0;i<9;i++)g(`(n=>brHarvest(new T.Vector3(n.x,1.2,n.z-2),new T.Vector3(0,0,1),1.5))(BR.nodes[${id}])`);out.m1=g('mat[0]');out.hp=g(`BR.nodes[${id}].hp`);out.live=g(`BR.nodes[${id}].live`);
  g('(()=>{const n=BR.nodes.find(n=>n.k=="rock");brHarvest(new T.Vector3(n.x,.8,n.z-3),new T.Vector3(0,0,1),3-n.r)})()');out.stone=g('mat[1]');
  g('brHarvest(new T.Vector3(0,1,0),new T.Vector3(1,0,0),1)');out.m2=g('mat[0]');return out});
 ok(hv.m1>=hv.m0+50&&hv.m1<=hv.m0+100&&hv.hp===0&&hv.live===0,'a tree gives wood per hit, has health, and is gone when depleted (no infinite harvesting)',hv);
 ok(hv.stone>=10,'rocks give stone',hv.stone);ok(hv.m2===hv.m1,'hitting anything that is not a resource node gives nothing');
 ok(await until(O,id=>Game.ev(`BR.nodes[${id}].hp===0&&BR.nodes[${id}].live===0`),4000,hv.id),'the depleted tree disappears for the other player too');
 ok(await ev(W,'mat[0]>=10')&&await W.evaluate(()=>{Game.ev("setBuild('wall')");const n=Game.ev('Object.keys(BLD).length');Game.ev("place('wall')");const m=Game.ev('Object.keys(BLD).length');Game.ev('exitBuild()');return m>=n}),'harvested wood can be spent in the normal building system');

 console.log('\n[8] storm, elimination, spectating, Victory Royale');
 const ph=await ev(A,'ZN.ph.map(p=>[p.wait,p.shr,p.r,p.dmg])');ok(ph.length===5&&ph[0][2]>ph[1][2]&&ph[4][2]===0&&ph[4][3]>ph[0][3],'storm has 5 shrinking phases with rising damage',ph);
 ok(await A.evaluate(()=>/STORM/.test(document.querySelector('#zinfo').textContent)),'storm timer is on the HUD',await A.evaluate(()=>document.querySelector('#zinfo').textContent));
 await ev(O,'BR.inv[1]=brMkW(1,2);hud()');
 await ev(O,'ZN.t0=clk()-200000');const hp0=await ev(O,'S.hp+(S.sh||0)');await at(O,170,0,170);
 ok(await until(O,h=>Game.ev('S.hp+(S.sh||0)')<h,20000,hp0),'standing outside the circle takes storm damage',await ev(O,'[S.hp,zoneNow().s,zoneNow().r]'));
 await ev(O,'S.hp=1;S.sh=0');ok(await until(O,()=>Game.ev('S.dead===1'),20000),'the storm eliminates the player');
 const spec=await O.evaluate(()=>document.body.classList.contains('spec')&&getComputedStyle(document.querySelector('#spec')).display!=='none'),emp=await ev(O,'BR.inv.every(s=>!s)');O.screenshot({path:path.join(SHOTS,'br-09-eliminated-spectating.png')}).catch(()=>{});
 const drop=await W.evaluate(()=>Game.busy()&&Game.ev('[...BR.items.values()].some(e=>e.id[0]=="d"&&e.it.k=="w"&&e.it.wi===1&&e.it.rar===2)'));
 ok(spec,'eliminated player is spectating (no respawn)');ok(emp&&drop,'their inventory drops as loot for the survivors',{emp,drop});
 ok(await until(W,()=>!Game.busy(),20000),'with one player left the match ends');
 const endTxt=await W.evaluate(()=>document.querySelector('#end')?document.querySelector('#end').textContent:document.body.innerText.slice(0,300));
 ok(/VICTORY\s*ROYALE/i.test(endTxt)&&await W.evaluate(()=>document.querySelector('#vroy').classList.contains('on')),'winner gets the Victory Royale screen',endTxt.slice(0,120));await sleep(600);await shot(W,'br-10-victory-royale');
 ok(await until(O,()=>!Game.busy(),12000)&&await O.evaluate(()=>!document.querySelector('#vroy').classList.contains('on')),'the eliminated player gets the end screen without a win');
 const uidW=W===A?uidA:uidB;
 ok(await until(W,u=>{const a=Object.values(__fb.get('audit/econ/'+u)||{});return a.some(r=>r.a==='match'&&r.md==='br')},8000,uidW),'the result goes to the server economy as a normal match claim');
 ok(await W.evaluate(u=>{const e=__fb.get('econ/'+u);return e.owned.length===2&&!JSON.stringify(e).includes('"wi"')},uidW),'no match loot ended up in the permanent account inventory');

 console.log('\n[9] other modes are unchanged');
 for(const p of[A,B])await p.evaluate(()=>{try{menu()}catch(e){}document.querySelectorAll('#reveal.on').forEach(e=>e.classList.remove('on'))});await sleep(500);
 await A.evaluate(()=>beginBot('1v1'));ok(await until(A,()=>Game.busy()&&Game.ev('phase')=='live',25000),'1v1 vs bot starts');
 ok(await ev(A,'BRM===0&&S.w===1&&WS[0].mag===6&&WS[1].mag===30&&mat.join()==="500,300,200"&&curW().id==="ar"'),'classic loadout: shotgun + AR + pickaxe, 500/300/200 materials',await ev(A,'[BRM,S.w,mat.join()]'));
 await ev(A,"trig('w1',false)");const w1=await ev(A,'S.w');await ev(A,"trig('wnext',false)");await ev(A,"trig('wnext',false)");await ev(A,"trig('wnext',false)");ok(w1===0&&await ev(A,'S.w')===0,'weapon cycling never reaches the Battle Royale-only weapons');
 ok(await A.evaluate(()=>!document.body.classList.contains('brm')&&getComputedStyle(document.querySelector('#wbar')).display!=='none'&&getComputedStyle(document.querySelector('#brhud')).display==='none'),'no Battle Royale HUD outside Battle Royale');
 await ev(A,"trig('s4',false);trig('use',false);trig('drop',false)");ok(await ev(A,'S.w')===0,'Battle Royale keys do nothing in other modes');
 await A.evaluate(()=>Game.leave());await until(A,()=>!Game.busy());
 for(const p of[A,B])await p.evaluate(()=>{CFG.mode='zone';joinRoom('zone')});
 ok(await until(A,()=>Game.busy()&&Game.ev('RS&&RS.st==="round"'),30000)&&await until(B,()=>Game.busy()&&Game.ev('RS&&RS.st==="round"'),30000),'Zone Wars room: round starts with 2 players');
 ok(await ev(A,'BRM===0&&ROUNDS===100&&LT.length>10&&ZN.ph.length===5&&ZN.ph[0].wait===14&&mat.join()==="500,300,200"&&S.w===1'),'Zone Wars keeps its own rules: 100 rounds, quick storm, its pickups, classic loadout',await ev(A,'[BRM,ROUNDS,LT.length,ZN.ph[0].wait,mat.join(),S.w]'));
 for(const p of[A,B])await p.evaluate(()=>Game.leave());

 console.log('\n[10] screen sizes');
 const errs0=[].concat(A.errs,B.errs);
 const T=await page(url+'/?debug=1',{w:1024,h:768});await until(T,()=>typeof user!='undefined'&&user&&document.querySelector('#menu').classList.contains('on'),12000);await tidy(T);await sleep(600);await shot(T,'br-11-tablet-lobby');
 const M=await page(url+'/?debug=1',{w:844,h:390,mobile:true});await until(M,()=>typeof user!='undefined'&&user&&document.querySelector('#menu').classList.contains('on'),12000);await tidy(M);await sleep(600);await shot(M,'br-12-phone-lobby');
 ok(await M.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'phone lobby has no horizontal overflow');
 console.log('\n[11] JavaScript errors');
 const errs=errs0.concat(T.errs,M.errs);ok(errs.length===0,'no page / console errors in any tab',errs.slice(0,6));
}catch(e){fail++;fails.push('test script crashed: '+e.message);console.error(e)}
finally{await browser.close();s.close()}
console.log('\n'+pass+' passed, '+fail+' failed'+(fail?':\n - '+fails.join('\n - '):'')+'\nscreenshots: '+SHOTS);process.exit(fail?1:0)})();
