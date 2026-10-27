/* ===== Game modes =====
   size  = players per team (team modes) · ffa = free-for-all (every player is their own team) · win = rounds needed to win the match
   map   = 'arena' (random small arena) · 'box' (enclosed box-fight room) · 'zone' (big map + shrinking storm)
   min / max = player count for online free-for-all queues · bots = how many bots fill a practice match
   room = open room: no bots, players join / leave at any time, rounds repeat (rounds = how many, roundSec = seconds per round) and a round starts as soon as 2 players are in
   Menu art (mode picker): grp = group label · badge = corner ribbon · c1/c2 = card colours · art = big emoji on the card · where = map line · rule = match rule line */
window.MODES={
'1v1':{id:'1v1',n:'1v1',ic:'⚔️',tag:'Classic duel · vote for the map',short:'One on one. Vote for the map, first to 3 rounds.',size:1,win:3,map:'arena',ppl:2,grp:'SOLO',badge:'CLASSIC',c1:'#2f8bff',c2:'#5a2ad8',art:'⚔️',where:'Voted map',rule:'First to 3 rounds'},
'2v2':{id:'2v2',n:'2v2',ic:'🤝',tag:'You + a teammate vs two enemies',short:'Team up with a partner against two enemies.',size:2,win:3,map:'arena',ppl:4,grp:'DUOS',badge:'TEAMS',c1:'#16c9a0',c2:'#1c6fd0',art:'🤝',where:'Voted map',rule:'First to 3 rounds'},
'3v3':{id:'3v3',n:'3v3',ic:'👥',tag:'Squad up: three vs three',short:'Squad up for a three vs three showdown.',size:3,win:3,map:'arena',ppl:6,grp:'SQUADS',badge:'TEAMS',c1:'#ff8a2a',c2:'#d02a6a',art:'👥',where:'Voted map',rule:'First to 3 rounds'},
'box':{id:'box',n:'Box Fights',ic:'📦',tag:'Fortnite-style box fights · everyone starts in their own box · build, edit, outplay · join any time',short:'Build, edit and outplay inside your own box.',ffa:1,room:1,rounds:100,roundSec:120,min:2,max:10,win:100,map:'box',ppl:10,grp:'BUILD',badge:'LIVE',c1:'#ffc233',c2:'#d9531e',art:'📦',where:'Box arena',rule:'Up to 100 rounds'},
'ranked':{id:'ranked',n:'Ranked',ic:'🏅',tag:'Real players only · 1v1, 2v2 & 3v3 · climb from Bronze to Archnemesis',short:'Real players, real stakes. Place, climb and win season rewards.',size:1,win:3,map:'arena',ppl:2,plt:'1v1 · 2v2 · 3v3',grp:'COMPETITIVE',badge:'SEASON',c1:'#ff2e63',c2:'#4a0a5a',art:'🏅',where:'Voted map',rule:'30 day season',ranked:1},
'trainer':{id:'trainer',n:'Aim Trainer',ic:'🎯',tag:'Solo aim drills: gridshot, tracking, flicks, strafing targets and more',short:'Five 60 second drills with personal bests and grades.',size:1,win:1,map:'trainer',ppl:1,solo:1,grp:'PRACTICE',badge:'TRAIN',c1:'#ff4d6d',c2:'#7a1fd1',art:'🎯',where:'Training range',rule:'60s drills'},
'zone':{id:'zone',n:'Zone Wars',ic:'🌀',tag:'Big map · closing storm · last one standing · join any time',short:'Huge map, closing storm. Last one standing wins.',ffa:1,room:1,rounds:100,roundSec:120,min:2,max:10,win:100,map:'zone',ppl:10,grp:'BATTLE',badge:'LIVE',c1:'#a64dff',c2:'#3a1a9a',art:'🌀',where:'Big map + storm',rule:'Up to 100 rounds'}
};
/* Aim Trainer drills (used by the mode screen AND the range itself in game.js)
   n = name · ic = icon · c = accent colour · d = what it is · tip = how to score · max = targets on screen · g = score needed for grades C / B / A / S */
window.DRILLS={
grid:{n:'Gridshot',ic:'🎯',c:'#38f5c8',d:'Three targets at a time on a 5x3 grid. Hit them as fast as you can.',tip:'100 points per hit',max:3,g:[1500,2800,4200,5500]},
micro:{n:'Microshot',ic:'🔬',c:'#ffd23f',d:'Small targets close together. Precision over speed.',tip:'120 points per hit',max:3,g:[1200,2400,3600,4800]},
flick:{n:'Flick',ic:'⚡',c:'#ff4d6d',d:'One target at a time and it vanishes fast. Be quick.',tip:'150 to 300 points, faster hit = more',max:1,g:[2500,5000,7500,10000]},
track:{n:'Tracking',ic:'🌀',c:'#b04dff',d:'Hold fire and keep the crosshair glued to the moving ball.',tip:'100 points per second on target',max:1,g:[1500,2800,4000,5000]},
strafe:{n:'Strafing dummies',ic:'🏃',c:'#ff9a2e',d:'Running dummies that change direction. Head shots count double.',tip:'100 body · 250 head',max:3,g:[1500,3000,4500,6000]}};
window.DRILL_ORDER=['grid','micro','flick','track','strafe'];
window.modeOf=id=>window.MODES[id]||window.MODES['1v1'];
window.MODE_ORDER=['1v1','2v2','3v3','ranked','box','zone','trainer'];
/* AFK zone: stand in the zone and collect these every minute. candyRank=false keeps AFK candy out of the event leaderboard & candy goals (it is still spendable). */
window.AFK={ms:60000,candy:5,coins:10,candyRank:false};
/* Which party sizes a mode accepts. kind: 'solo' (aim trainer: everybody plays on their own) · 'queue' (the party queues as one group and is matched with others) ·
   'private' (the party fills BOTH sides: 1v1 with 2 players, 2v2 with 4, 3v3 with 6) · 'room' (everybody joins the same Box Fights / Zone Wars room). */
window.partyCheck=(id,n)=>{const M=modeOf(id);n=Math.max(1,n|0);
 if(M.ranked){const P=modeOf((window.CFG&&['1v1','2v2','3v3'].includes(CFG.rkpl))?CFG.rkpl:'1v1');return n<=P.size?{ok:1,kind:'queue'}:{ok:0,why:'Ranked '+P.n+' takes a party of up to '+P.size+' – yours has '+n}}
 if(M.solo)return{ok:1,kind:'solo'};
 if(M.room)return n<=M.max?{ok:1,kind:'room'}:{ok:0,why:M.n+' holds up to '+M.max+' players – your party has '+n};
 if(M.size==1){if(n==1)return{ok:1,kind:'queue'};if(n==2)return{ok:1,kind:'private'};return{ok:0,why:'1v1 is for 1 or 2 players – your party has '+n}}
 if(n<=M.size)return{ok:1,kind:'queue'};if(n==M.size*2)return{ok:1,kind:'private'};
 return{ok:0,why:M.n+' needs a party of 1–'+M.size+' (or exactly '+M.size*2+' for a private match) – your party has '+n}};
window.PARTY_MAX=10;
