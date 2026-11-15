/* ================= RANKED CORE (pure logic: no DOM, no Firebase) =================
   Ranks, rating maths, skill-based matchmaking, seasons and rewards. ranked.js (UI + Firebase) sits on top of this file.
   It is also loaded by Node for the tests in /tests, so keep it free of browser globals.

   THE LADDER (one rating for all of ranked: 1v1, 2v2 and 3v3 share it)
   - 8 normal ranks x 3 divisions, 100 RP per division, 300 RP per rank:
       Bronze 0 · Silver 300 · Gold 600 · Platinum 900 · Diamond 1200 · Emerald 1500 · Master 1800 · Grandmaster 2100 (to 2399)
   - ARCHNEMESIS: 2400 RP or more AND in the top 10 of the season. Only 10 people can hold it. Nobody else is ever shown as Archnemesis.
   - Placements: 5 matches, then you are placed. Placements can only put you in Bronze..Gold 3 (PLACE_CAP), the rest has to be climbed.
   - Ranking up is slow on purpose: gains shrink with rank (K 40 → 24) and top ranks only play strong opponents, so ~50% win rates up there. */
(function(root){
'use strict';
const DIV=100,RSZ=300,NR=8,ARCH_MIN=2400,PLACE_N=5,PLACE_CAP=899,MINGAMES=20,TOPN=10,SEED_MM=250,ELITE=1800,UNP_MAX=1199;
const SEASON={anchor:Date.UTC(2026,9,27),len:30*864e5}; /* season 1 = Oct 27 → Nov 26 2026 (UTC); every 30 days a new one starts, automatically */

/* palette: c1 light · c2 mid · c3 dark · gl glow */
const P=(c1,c2,c3,gl)=>({c1,c2,c3,gl});
const RANKS=[
 {id:'bronze',n:'Bronze',...P('#f3b17a','#c9772f','#6a3512','#ff9a4d')},
 {id:'silver',n:'Silver',...P('#ffffff','#b6c0d8','#58627c','#cfe0ff')},
 {id:'gold',n:'Gold',...P('#fff3a8','#ffc933','#a8680a','#ffd23f')},
 {id:'platinum',n:'Platinum',...P('#cafff8','#3fdccb','#12727a','#4dfff0')},
 {id:'diamond',n:'Diamond',...P('#e0f7ff','#5cc8ff','#2457d6','#6fd8ff')},
 {id:'emerald',n:'Emerald',...P('#c4ffdd','#2fe08a','#0a6a46','#3dff9a')},
 {id:'master',n:'Master',...P('#f3d0ff','#b25cff','#4a1a9a','#c471ff')},
 {id:'grandmaster',n:'Grandmaster',...P('#ffd0d0','#ff4d5e','#8a0f22','#ff5a6e')},
 {id:'archnemesis',n:'Archnemesis',...P('#ffb0c8','#ff1f5a','#2a0016','#ff2e63')}];
/* Archnemesis #1 / #2 / #3 get their own metals */
const ARCHP=[null,P('#fffbe0','#ffd23f','#7a4a00','#ffd23f'),P('#ffffff','#d3dcf0','#4a5878','#bfe6ff'),P('#ffe2c4','#e08a4a','#5a2a0c','#ff9a5a')];
const UNP=P('#d8dcea','#8a90aa','#3e4360','#9aa3c7');

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rankIdx=r=>Math.min(NR-1,Math.floor(r/RSZ));

/* what a rating looks like. rk = {r: rating or -1 (unplaced), m: matchmaking rating, a: Archnemesis position 1..10 or 0} */
function info(rk){
 if(!rk||!(rk.r>=0))return{un:1,ri:-1,div:0,id:'unranked',name:'Unranked',label:'Unranked',short:'?',pal:UNP,prog:0,pts:0,next:'Placements',nextAt:0,r:-1};
 const r=Math.floor(rk.r),arch=r>=ARCH_MIN&&(rk.a|0)>0&&rk.a<=TOPN,top=r>=ARCH_MIN;
 if(arch){const a=rk.a|0,pal=ARCHP[a]||RANKS[8];return{un:0,ri:8,div:0,id:'archnemesis',name:'Archnemesis',label:'Archnemesis',short:'A',pal,prog:1,pts:r-ARCH_MIN,next:'',nextAt:0,r,arch:a,top:1}}
 const ri=rankIdx(r),div=top?3:Math.min(3,Math.floor((r-ri*RSZ)/DIV)+1),base=top?ARCH_MIN:ri*RSZ+(div-1)*DIV,pts=r-base,R=RANKS[ri];
 let next,nextAt;
 if(top){next='Archnemesis · top 10';nextAt=0}
 else if(div<3){next=R.n+' '+(div+1);nextAt=base+DIV}
 else if(ri<NR-1){next=RANKS[ri+1].n+' 1';nextAt=base+DIV}
 else{next='Archnemesis';nextAt=ARCH_MIN}
 return{un:0,ri,div,id:R.id,name:R.n,label:R.n+' '+div,short:R.n[0]+div,pal:R,prog:top?1:clamp(pts/DIV,0,1),pts:top?r-ARCH_MIN:pts,next,nextAt,r,top:top?1:0}}
/* lowest rating of a major rank (0..8) */
const rankStart=i=>i>=8?ARCH_MIN:i*RSZ;

/* ---------------- rating maths ---------------- */
const expect=(a,b)=>1/(1+Math.pow(10,(b-a)/400));
const kOf=r=>r<900?40:r<1500?34:r<2100?28:24;
/* o = {m: my matchmaking rating, placed: bool, team: avg rating of my team (team modes), opp: avg rating of the other team, s: 1 win · .5 draw · 0 loss, leave: left early}
   returns the RP change (whole number) */
function delta(o){
 const my=o.team!=null?o.team:o.m,E=expect(my,o.opp);let d;
 if(!o.placed)d=Math.round(100*(o.s-E)); /* placements move fast: they are about finding your level */
 else{d=Math.round(kOf(o.m)*(o.s-E));
  if(o.s===1){d=clamp(d,6,40);if(o.m>=2100)d=Math.max(5,Math.round(d*.85))} /* high ranks: slower climb */
  else if(o.s===0){d=clamp(d,-40,-6);if(o.m<600)d=Math.min(-4,Math.round(d*.75))} /* low ranks: gentler falls */
  else d=clamp(d,-20,20)}
 if(o.leave&&o.s===0)d-=5; /* leaving a ranked match early costs a little extra */
 return d}
const blank=()=>({mm:SEED_MM,pl:0,g:0,w:0,l:0,pk:0});
const isPlaced=c=>!!c&&(c.pl|0)>=PLACE_N&&Number.isFinite(c.r);
/* apply one result {d, s} to a season record, returns a NEW record (this is also what runs inside the Firebase transaction) */
function applyRes(rec,res){
 const c=Object.assign(blank(),rec||{});c.g=(c.g|0)+1;if(res.s===1)c.w=(c.w|0)+1;else if(res.s===0)c.l=(c.l|0)+1;
 const d=clamp(res.d|0,-130,130);
 if((c.pl|0)<PLACE_N){c.pl=(c.pl|0)+1;c.mm=clamp(c.mm+d,0,9999);if(c.pl>=PLACE_N){c.r=clamp(Math.round(c.mm),0,PLACE_CAP);c.mm=c.r}}
 else{c.r=clamp((c.r|0)+d,0,9999);c.mm=c.r}
 if(Number.isFinite(c.r))c.pk=Math.max(c.pk|0,c.r);
 return c}
/* the rating a new season starts placements from (a little memory of last season so strong players climb faster) */
const seedFrom=prev=>prev&&isPlaced(prev)?clamp(Math.round(SEED_MM+Math.min(prev.pk||prev.r,2400)*.12),SEED_MM,540):SEED_MM;

/* ---------------- matchmaking ----------------
   Every waiting group = {k, m:[players], t0 (queued at), t}. A player = {u, rk:{r,m,a}}. m (matchmaking rating) is the rank rating once placed, the hidden placement rating before.
   How far apart two groups may be (in RP) grows the longer somebody waits. People in the top 3 ranks (Master, Grandmaster, Archnemesis) share one elite pool with wide windows
   from the start, and an Archnemesis-level player (2400+) can always reach all three of those ranks. Unranked players never meet anyone above Platinum. */
const winOf=(m,secs)=>{let w=m>=ELITE?Math.min(700,400+40*Math.floor(secs/5)):Math.min(450,100+30*Math.floor(secs/5));if(m>=ARCH_MIN)w=Math.max(w,m-ELITE);return w}; /* Archnemesis-level: always reaches down to the bottom of the top 3 ranks (Master 1) */
const mmOf=p=>p&&p.rk&&Number.isFinite(p.rk.m)?p.rk.m:SEED_MM;
function gi(g,t){const secs=Math.max(0,(t-(Number.isFinite(g.t0)?g.t0:Number.isFinite(g.t)?g.t:t))/1000),ms=g.m.map(mmOf);return{g,secs,lo:Math.min(...ms),hi:Math.max(...ms),avg:ms.reduce((a,b)=>a+b,0)/ms.length,w:Math.max(...ms.map(m=>winOf(m,secs))),unp:g.m.some(p=>!(p.rk&&p.rk.r>=0))}}
function compat(a,b){if((a.unp||b.unp)&&(a.hi>UNP_MAX||b.hi>UNP_MAX))return false;return Math.max(a.hi-b.lo,b.hi-a.lo)<=Math.max(a.w,b.w)}
/* mine / others: groups. S = players per team. Returns {ch:[groups], teams:[[players],[players]], spread} or null */
function plan(mine,others,S,t){
 const need=S*2,me=gi(mine,t);if(mine.m.length>S)return null;
 const O=others.filter(g=>g&&g.m&&g.m.length&&g.m.length<=S).map(g=>gi(g,t)).filter(x=>compat(me,x)).sort((a,b)=>Math.abs(a.avg-me.avg)-Math.abs(b.avg-me.avg)).slice(0,16);
 let out=null;const pick=[me];
 const dfs=(i,tot)=>{if(out)return;if(tot===need){const sp=split(pick.map(x=>x.g),S);if(sp)out={ch:pick.map(x=>x.g),teams:sp.teams,spread:sp.diff};return}
  if(i>=O.length||tot>need)return;const x=O[i];
  if(tot+x.g.m.length<=need&&pick.every(p=>compat(p,x))){pick.push(x);dfs(i+1,tot+x.g.m.length);pick.pop()}
  dfs(i+1,tot)};
 dfs(0,mine.m.length);return out}
/* put the chosen groups into two teams of S, parties stay together, as even as possible (average rating) */
function split(gs,S){const n=gs.length;let best=null;
 for(let mask=0;mask<(1<<n);mask++){let a=0,b=0,sa=0,sb=0,A=[],B=[];
  for(let i=0;i<n;i++){const g=gs[i],s=g.m.reduce((q,p)=>q+mmOf(p),0);if(mask>>i&1){A.push(...g.m);a+=g.m.length;sa+=s}else{B.push(...g.m);b+=g.m.length;sb+=s}}
  if(a!==S||b!==S)continue;const diff=Math.abs(sa/a-sb/b);if(!best||diff<best.diff)best={teams:[A,B],diff}}
 return best}

/* ---------------- seasons (30 days, back to back) ---------------- */
let shift=0;
const clock=()=>Date.now()+shift;
const seasonAt=t=>Math.max(1,Math.floor((t-SEASON.anchor)/SEASON.len)+1);
const season=()=>seasonAt(clock());
const sStart=n=>SEASON.anchor+(n-1)*SEASON.len,sEnd=n=>SEASON.anchor+n*SEASON.len;
const sLeft=()=>Math.max(0,sEnd(season())-clock());

/* ---------------- rewards ----------------
   Season-end rewards. Everything for every rank up to your PEAK (items) and the coin prize of your best rank. Archnemesis needs the top 10 at the very end.
   The top three of the season (best, 2nd best, 3rd best) get the podium prizes on top. Rank 0..8 = Bronze..Archnemesis. */
const REW=[
 {coins:100},
 {coins:250,item:'rk_steel'},
 {coins:500,item:'rk_aurum'},
 {coins:900,item:'rk_glacier'},
 {coins:1500,item:'rk_dvisor'},
 {coins:2200,item:'rk_ehalo'},
 {coins:3200,item:'rk_mcrown'},
 {coins:4500,item:'rk_gmangel'},
 {coins:7000,item:'rk_arch'}];
const TOP={1:{coins:15000,item:'rk_champ1',t:'Best player of the season'},2:{coins:10000,item:'rk_champ2',t:'2nd best player of the season'},3:{coins:6000,item:'rk_champ3',t:'3rd best player of the season'}};
/* rec = the final season record · pos = 1..10 position on the final leaderboard (0 = not in the top 10) */
function rewardsFor(rec,pos){
 if(!isPlaced(rec))return null;
 let ri=Math.min(NR-1,Math.floor((rec.pk>=0?rec.pk:rec.r)/RSZ));const arch=pos>0&&pos<=TOPN&&rec.r>=ARCH_MIN&&rec.e>0;if(arch)ri=8;
 const items=[];for(let i=0;i<=ri;i++)if(REW[i].item)items.push(REW[i].item);
 let coins=REW[ri].coins,top=0;
 if(pos>=1&&pos<=3&&rec.e>0){top=pos;coins+=TOP[pos].coins;items.push(TOP[pos].item)}
 return{ri,coins,items,top,arch}}

root.RKC={DIV,RSZ,NR,ARCH_MIN,PLACE_N,PLACE_CAP,MINGAMES,TOPN,SEED_MM,ELITE,UNP_MAX,SEASON,RANKS,ARCHP,UNP,REW,TOP,
 info,rankIdx,rankStart,expect,kOf,delta,blank,isPlaced,applyRes,seedFrom,winOf,mmOf,compat,plan,split,
 season,seasonAt,sStart,sEnd,sLeft,clock,setShift:ms=>{shift=+ms||0},rewardsFor,clamp};
if(typeof module!=='undefined'&&module.exports)module.exports=root.RKC;
})(typeof window!=='undefined'?window:globalThis);
