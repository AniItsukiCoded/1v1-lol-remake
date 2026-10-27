/* ================= RANKED (UI + Firebase + matchmaking queue) =================
   Loaded after lobby2.js. Pure rules live in rankcore.js (RKC). Uses CFG, saveCfg, saveLocal, ui, toast, show, menu, db, user, nm, now, conn, online, party, SK, SFX, hx, modeOf, EV, Game.
   - One rating for 1v1, 2v2 and 3v3. Seasons last 30 days (see RKC.SEASON). The season record lives at  ranked/s<N>/lb/<uid>  (see database.rules.json).
   - Queue: rankq/<1v1|2v2|3v3>/<uid>. Every waiting player retries the match every few seconds, the allowed rating gap grows with waiting time.
   - Your rank goes with you everywhere: lobby, party, queue, scoreboard, name tags above heads, end screen (roster entries carry  rk = {r, m, a}). */
const RK=(()=>{
const C=window.RKC,$=s=>document.querySelector(s),esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const nf=n=>Math.round(n).toLocaleString(),owner=()=>!!(typeof EV!='undefined'&&EV.owner&&EV.owner());
const path=n=>'ranked/s'+n+'/lb',PL=['1v1','2v2','3v3'];
const dbg=window.DEBUG;try{const q=new URLSearchParams(location.search).get('rkday');if(dbg&&q)C.setShift(+q*864e5)}catch(e){} /* ?debug=1&rkday=31 jumps the season clock forward for testing */

/* ================= EMBLEMS =================
   One description (layers) drawn two ways: inline SVG for the menus, canvas for the name tags above players' heads. */
const SH='M50 4 L86 16 V50 C86 74 69 88 50 96 C31 88 14 74 14 50 V16 Z',IN='M50 13 L78 23 V50 C78 67 65 78 50 85 C35 78 22 67 22 50 V23 Z',BEV='M50 4 L86 16 V25 L50 13 L14 25 V16 Z';
const chev=(y,w)=>`M${50-w} ${y} L50 ${y-12} L${50+w} ${y} L${50+w} ${y+7} L50 ${y-5} L${50-w} ${y+7} Z`;
const star=(cx,cy,ro,ri,n=5)=>{let d='';for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,r=i%2?ri:ro;d+=(i?'L':'M')+(cx+Math.cos(a)*r).toFixed(1)+' '+(cy+Math.sin(a)*r).toFixed(1)+' '}return d+'Z'};
const G=[ /* glyph per major rank: [path, fill, opacity] */
 [[chev(62,22),'g']],
 [[chev(52,23),'g'],[chev(65,18),'g']],
 [[chev(46,23),'g'],[chev(58,20),'g'],[chev(70,15),'g']],
 [[star(50,53,26,11),'g'],['M50 34 L55 48 L50 54 L45 48 Z','#fff',.35]],
 [['M50 28 L74 48 L50 78 L26 48 Z','g'],['M50 28 L26 48 L50 48 Z','#fff',.4],['M50 28 L74 48 L50 48 Z','#fff',.12],['M26 48 L50 48 L50 78 Z','#000',.1],['M74 48 L50 48 L50 78 Z','#000',.3]],
 [['M50 27 L73 40 L73 62 L50 75 L27 62 L27 40 Z','g'],['M50 27 L73 40 L50 52 L27 40 Z','#fff',.35],['M73 40 L73 62 L50 75 L50 52 Z','#000',.25],['M27 40 L50 52 L50 75 L27 62 Z','#fff',.06]],
 [['M27 68 L27 38 L39 52 L50 31 L61 52 L73 38 L73 68 Z','g'],['M27 62 H73 V69 H27 Z','#000',.22],['M50 31 L61 52 L50 62 L39 52 Z','#fff',.25]],
 [['M25 68 L25 33 L37 49 L43 29 L50 46 L57 29 L63 49 L75 33 L75 68 Z','g'],['M25 61 H75 V69 H25 Z','#000',.25],['M50 46 L57 29 L63 49 L50 61 L37 49 L43 29 Z','#fff',.22]],
 [['M50 33 L63 55 L50 78 L37 55 Z','g'],['M50 45 L53.5 56 L50 67 L46.5 56 Z','#12000a',.92],['M50 33 L37 55 L50 55 Z','#fff',.3]]];
const HORN='M22 24 C4 14 -2 -6 8 -24 C10 -8 24 2 40 10 Z';
const FL1='M28 14 C16 -6 36 -12 30 -30 C52 -18 46 0 48 14 Z',FL2='M52 14 C54 0 48 -18 70 -30 C64 -12 84 -6 72 14 Z';
const wingPaths=lv=>{const out=[],n=lv+2,len=16+lv*9;for(let k=0;k<n;k++){const y=24+k*9,tx=86+len-k*(len/(n+1)),ty=2+k*11+lv*1.5;out.push(`M86 ${y} Q${(86+tx)/2+2} ${y-9} ${tx} ${ty} Q${tx-3} ${ty+12} 86 ${y+9} Z`)}return out};
const PIP=(x,y)=>`M${x} ${y-5} L${x+5} ${y} L${x} ${y+5} L${x-5} ${y} Z`;
const keyOf=inf=>inf.un?'un':inf.arch&&inf.arch<=3?'a'+inf.arch:inf.id;
/* o: {wings, pips, flames, pl (placements played), n (placement total)} */
function layers(inf,o){const L=[],ri=inf.ri;
 if(ri===8&&o.flames)L.push({d:FL1,f:'f',o:.95,cls:'fl a'},{d:FL2,f:'f',o:.85,cls:'fl b'});
 const wl=ri>=5?ri-4:0;
 if(o.wings&&wl)wingPaths(wl).forEach(d=>{L.push({d,f:'w',o:.96,sc:'dk',sw:1.2,cls:'wg'});L.push({d,f:'w',o:.96,m:1,sc:'dk',sw:1.2,cls:'wg'})});
 if(ri===8){L.push({d:HORN,f:'dk2',sc:'edge',sw:1.4},{d:HORN,f:'dk2',m:1,sc:'edge',sw:1.4})}
 L.push({d:SH,f:'s',sw:2.4,sc:'edge'},{d:BEV,f:'#fff',o:.3},{d:IN,f:'i',sw:1.5,sc:'edge2'});
 if(inf.un)L.push({txt:'?',x:50,y:66,size:46,f:'g'});else G[ri].forEach(([d,f,op])=>{L.push({d,f,o:op==null?1:op,sc:f=='g'?'dk':null,sw:.9})});
 if(o.pips){if(inf.un){const n=o.n||5,p=o.pl|0,x0=50-(n-1)*8;for(let i=0;i<n;i++)L.push({d:PIP(x0+i*16,106),f:i<p?'g':'pd',o:1,sc:'edge2',sw:1})}
  else if(ri===8)L.push({txt:'#'+(inf.arch||''),x:50,y:112,size:17,f:'g',stroke:1});
  else for(let i=0;i<3;i++)L.push({d:PIP(36+i*14,106),f:i<inf.div?'g':'pd',o:1,sc:'edge2',sw:1})}
 return L}
const vbOf=o=>o.wings||o.flames?'-44 -34 188 152':o.pips?'6 0 88 118':'8 0 84 100';
const mix=(a,b,t)=>{const p=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)),x=p(a),y=p(b);return'#'+x.map((v,i)=>Math.round(v+(y[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const palKey=k=>k=='un'?C.UNP:k[0]=='a'&&k.length==2?C.ARCHP[+k[1]]:C.RANKS.find(r=>r.id==k);
const KEYS=[...C.RANKS.map(r=>r.id),'a1','a2','a3','un'];
function defs(){return'<svg id="rkdefs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'+KEYS.map(k=>{const p=palKey(k);return`<linearGradient id="rkg-${k}-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.c1}"/><stop offset=".45" stop-color="${p.c2}"/><stop offset="1" stop-color="${p.c3}"/></linearGradient>`+
 `<linearGradient id="rkg-${k}-i" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${mix(p.c3,'#000000',.15)}"/><stop offset="1" stop-color="${mix(p.c2,p.c3,.55)}"/></linearGradient>`+
 `<linearGradient id="rkg-${k}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="${p.c1}"/><stop offset="1" stop-color="${p.c2}"/></linearGradient>`+
 `<linearGradient id="rkg-${k}-w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.c2}"/><stop offset="1" stop-color="${p.c1}"/></linearGradient>`+
 `<linearGradient id="rkg-${k}-f" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${p.c2}"/><stop offset=".6" stop-color="#ff9a3a"/><stop offset="1" stop-color="#fff2b0"/></linearGradient>`}).join('')+
 `<linearGradient id="rkshine" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="rkclip"><path d="${SH}"/></clipPath></defs></svg>`}
const fillOf=(k,f)=>f=='dk2'?'#3a0620':f=='pd'?'#0a0620':f.length==1||f.length==2?`url(#rkg-${k}-${f})`:f;
const strokeOf=(p,s)=>s=='edge'?p.c1:s=='edge2'?mix(p.c1,p.c3,.5):s=='dk'?p.c3:null;
/* inline SVG. o: {h: height in px, wings, pips, flames, pl, n} */
function emblem(rk,o){o=Object.assign({h:64,wings:0,pips:0,flames:0,hi:1},o||{});const inf=rk&&rk.label?rk:C.info(rk),k=keyOf(inf),p=palKey(k),L=layers(inf,o),vb=vbOf(o).split(' ').map(Number);
 const body=L.map(l=>{if(l.txt)return`<text x="${l.x}" y="${l.y}" font-size="${l.size}" text-anchor="middle" font-family="'Lilita One',Impact,sans-serif" fill="${fillOf(k,l.f)}"${l.stroke?` stroke="${p.c3}" stroke-width="2.4" paint-order="stroke"`:''}>${esc(l.txt)}</text>`;
  const st=strokeOf(p,l.sc);return`<path d="${l.d}" fill="${fillOf(k,l.f)}"${l.o!=null&&l.o!==1?` opacity="${l.o}"`:''}${st?` stroke="${st}" stroke-width="${l.sw||1}" stroke-linejoin="round"`:''}${l.m?' transform="translate(100 0) scale(-1 1)"':''}${l.cls?` class="${l.cls}"`:''}/>`}).join('');
 const shine=inf.un?'':'<g clip-path="url(#rkclip)"><rect class="rk-sh" x="-40" y="0" width="26" height="100" fill="url(#rkshine)"/></g>';
 return`<svg class="rkem rk-${k}${inf.ri>=4?' hi':''}${inf.ri===8?' arch':''}" viewBox="${vb.join(' ')}" height="${o.h}" width="${Math.round(o.h*vb[2]/vb[3])}" style="--gl:${p.gl}" role="img" aria-label="${esc(inf.label)}">${body}${shine}</svg>`}
/* small badge with the rank name (scoreboard, party, lobby) */
function mini(rk,o){if(!rk)return'';const inf=C.info(rk),p=palKey(keyOf(inf));o=o||{};
 return`<span class="rkmini${o.big?' big':''}" style="--gl:${p.gl};--c1:${p.c1}" title="${esc(inf.label)}">${emblem(inf,{h:o.h||(o.big?30:20)})}<i>${esc(inf.un?'UNRANKED':inf.arch?'ARCHNEMESIS #'+inf.arch:inf.label.toUpperCase())}</i></span>`}
/* canvas tag over a player's head: [emblem] NAME / RANK */
function tagCanvas(name,col,rk){const inf=C.info(rk),k=keyOf(inf),p=palKey(k),c=document.createElement('canvas');c.width=420;c.height=120;const x=c.getContext('2d'),H=84,sc=H/100,tw=84*sc;
 x.font='bold 40px sans-serif';const nw=x.measureText(name).width;x.font='bold 24px sans-serif';const lab=inf.un?'UNRANKED':inf.arch?'ARCHNEMESIS #'+inf.arch:inf.label.toUpperCase(),lw=x.measureText(lab).width,w=Math.min(400,Math.max(nw,lw)),tot=tw+10+w,x0=(420-tot)/2;
 /* emblem */
 x.save();x.translate(x0-8*sc,34);x.scale(sc,sc);drawLayers(x,layers(inf,{}),k,p);x.restore();
 const tx=x0+tw+10+w/2;x.textAlign='center';x.lineJoin='round';
 x.font='bold 40px sans-serif';x.strokeStyle='#000';x.lineWidth=7;x.strokeText(name,tx,60);x.fillStyle=col||'#fff';x.fillText(name,tx,60);
 x.font='bold 24px sans-serif';x.lineWidth=6;x.strokeText(lab,tx,94);x.fillStyle=p.c1;x.fillText(lab,tx,94);return c}
function drawLayers(x,L,k,p){const grad=f=>{if(f=='dk2')return'#3a0620';if(f=='pd')return'#0a0620';if(f.length>2)return f;const g=f=='w'?x.createLinearGradient(86,0,120,0):f=='i'?x.createLinearGradient(0,13,0,85):f=='f'?x.createLinearGradient(0,10,0,-20):f=='g'?x.createLinearGradient(0,28,0,78):x.createLinearGradient(0,4,0,96);
  const st=f=='s'?[[0,p.c1],[.45,p.c2],[1,p.c3]]:f=='i'?[[0,mix(p.c3,'#000000',.15)],[1,mix(p.c2,p.c3,.55)]]:f=='g'?[[0,'#ffffff'],[.5,p.c1],[1,p.c2]]:f=='w'?[[0,p.c2],[1,p.c1]]:[[0,p.c2],[.6,'#ff9a3a'],[1,'#fff2b0']];st.forEach(([o,c])=>g.addColorStop(o,c));return g};
 for(const l of L){x.save();if(l.m){x.translate(100,0);x.scale(-1,1)}x.globalAlpha=l.o==null?1:l.o;
  if(l.txt){x.font=`${l.size}px 'Lilita One',Impact,sans-serif`;x.textAlign='center';if(l.stroke){x.lineWidth=2.4;x.strokeStyle=p.c3;x.strokeText(l.txt,l.x,l.y)}x.fillStyle=grad(l.f);x.fillText(l.txt,l.x,l.y)}
  else{const d=new Path2D(l.d);x.fillStyle=grad(l.f);x.fill(d);const st=strokeOf(p,l.sc);if(st){x.lineWidth=l.sw||1;x.strokeStyle=st;x.lineJoin='round';x.stroke(d)}}x.restore()}}

/* ================= STATE (saved with your account: CFG.rkd) ================= */
function D(){let d=CFG.rkd;if(!d||typeof d!='object')d=CFG.rkd={};if(!Array.isArray(d.pend))d.pend=[];if(!Array.isArray(d.tr))d.tr=[];if(!d.cl||typeof d.cl!='object')d.cl={};
 const n=C.season();if(d.s!==n||!d.rec||typeof d.rec!='object'){d.s=n;d.rec=Object.assign(C.blank(),{mm:C.SEED_MM});d.pend=[];seeded=false}return d}
let seeded=true,top=[],topT=0,topS=0,loading=null,claims=[],claimT=0,fl=0,tab='play',lbSeason=0,hubOpen=false,thumbs={};
const rec=()=>D().rec,placed=()=>C.isPlaced(rec());
const myPos=()=>{if(!user)return 0;const i=top.findIndex(x=>x.id==user.uid);return i>=0&&i<C.TOPN?i+1:0};
/* what goes with you into a match / party / waiting list: r = rating (-1 until placed), m = matchmaking rating, a = Archnemesis position (0 unless top 10) */
function pack(){const r=rec(),p=C.isPlaced(r);return{r:p?r.r:-1,m:Math.round(r.mm),a:p&&r.r>=C.ARCH_MIN?myPos():0}}
const mine=()=>C.info(pack());
const lbl=rk=>C.info(rk).label;

/* load my season record + top 10 (also seeds a fresh season from the last one) */
function load(force){if(!user||typeof db=='undefined')return Promise.resolve();if(loading&&!force)return loading;
 return loading=(async()=>{const d=D(),n=C.season(),uid=user.uid;
  try{const snap=await db.ref(path(n)+'/'+uid).once('value'),v=snap.val();
   if(v){let r=Object.assign(C.blank(),v);d.pend.forEach(e=>{r=C.applyRes(r,e)});d.rec=r}
   else if(!d.rec.g&&!d.pend.length&&n>1&&!seeded){const pv=(await db.ref(path(n-1)+'/'+uid).once('value')).val();d.rec=Object.assign(C.blank(),{mm:C.seedFrom(pv)});seeded=true}
   else if(!d.rec.g&&!d.pend.length&&n==1)seeded=true}catch(e){}
  await loadTop(force);saveLocal();flush();checkClaims().catch(()=>{});paint();if(hubOpen)render()})().then(()=>{loading=null},()=>{loading=null})}
function loadTop(force){const n=C.season();if(!force&&topS===n&&Date.now()-topT<45000)return Promise.resolve(top);if(typeof db=='undefined')return Promise.resolve(top);
 return fetchTop(n).then(a=>{top=a;topS=n;topT=Date.now();return a},()=>top)}
const fetchTop=n=>db.ref(path(n)).orderByChild('e').limitToLast(C.TOPN).once('value').then(s=>{const a=[];s.forEach(c=>{const v=c.val();if(v&&v.e>0)a.push(Object.assign({id:c.key},v))});a.sort((x,y)=>y.e-x.e||y.pk-x.pk);return a});
/* send results to Firebase one at a time (offline results wait in CFG.rkd.pend). Deltas are applied inside the transaction, so two devices can not overwrite each other. */
function flush(){const d=D();if(fl||!user||user.isAnonymous||!d.pend.length||typeof db=='undefined')return;fl=1;const e=d.pend[0],n=d.s,uid=user.uid,own=owner();
 db.ref(path(n)+'/'+uid).transaction(cur=>{const c=C.applyRes(cur,e);c.n=nm().slice(0,14);c.s=+CFG.skin||0;c.e=!own&&C.isPlaced(c)&&c.g>=C.MINGAMES?c.r:0;
  ['r','mm','pl','g','w','l','pk','e'].forEach(k=>{if(!Number.isFinite(c[k]))delete c[k]});return c})
 .then(r=>{if(r&&r.committed){const dd=D();if(dd.s===n){dd.pend.shift();let x=Object.assign(C.blank(),r.snapshot.val()||{});dd.pend.forEach(q=>{x=C.applyRes(x,q)});dd.rec=x}saveLocal();loadTop(true).then(paint)}},()=>{}).then(()=>{fl=0;paint();if(hubOpen)render()})}

/* ================= RESULT OF A MATCH ================= */
const avg=a=>a.length?a.reduce((q,p)=>q+C.mmOf(p),0)/a.length:C.SEED_MM;
/* m = {md, s (season when the queue started), ros}; r = the match result from game.js; leave = you left early. Returns what the end screen needs (or null). */
function finish(m,r,leave){if(!m||!user)return null;if(C.season()!==m.s)return{void:1};
 const me=(m.ros||[]).find(p=>p.u===user.uid);if(!me)return null;const d=D(),was=C.isPlaced(d.rec),b4=mine(),pl0=d.rec.pl|0;
 const team=m.ros.filter(p=>p.t===me.t),opp=m.ros.filter(p=>p.t!==me.t),s=r.draw?.5:r.win?1:0;
 const dl=C.delta({m:d.rec.mm,placed:was,team:avg(team),opp:avg(opp),s,leave:!!leave});
 d.rec=C.applyRes(d.rec,{d:dl,s});if(d.pend.length<60)d.pend.push({d:dl,s});saveCfg();flush();
 const af=C.isPlaced(d.rec),a1=mine();setTimeout(()=>loadTop(true).then(()=>{paint();if(hubOpen)render()}),2500);
 const placeNow=!was&&af,up=was&&af&&(a1.ri>b4.ri||(a1.ri===b4.ri&&a1.div>b4.div)),down=was&&af&&(a1.ri<b4.ri||(a1.ri===b4.ri&&a1.div<b4.div));
 paint();return{void:0,d:dl,s,was,af,b4,a1,placeNow,up,down,majorUp:up&&a1.ri>b4.ri,pl:d.rec.pl|0,pl0,rp:d.rec.r|0,leave:!!leave,win:s===1}}
/* the end-of-match card: RP gained, rank bar, placement progress, rank-up banner */
function endUi(res){const box=$('#rsub');if(!box||!res||res.void)return;const w=document.createElement('div');w.className='rkend';
 if(!res.af){const n=C.PLACE_N,p=res.pl;w.innerHTML=`<div class="rkpl"><b>PLACEMENT MATCH ${p}/${n}</b><div class="rkdots">${Array.from({length:n},(_,i)=>`<s class="${i<p?'on':''}"></s>`).join('')}</div><small>${p<n?'Your rank is revealed after '+(n-p)+' more match'+(n-p==1?'':'es')+'. Highest placement: Gold 3.':'Calculating your rank…'}</small></div>`}
 else{const a=res.a1,p=C.info(res.a1),sgn=res.d>0?'+':'';
  w.innerHTML=(res.majorUp?`<div class="rkup">RANK UP!</div>`:res.up?`<div class="rkup sm">DIVISION UP</div>`:'')+`<div class="rkrow ${res.d>0?'pos':res.d<0?'neg':''}">${emblem(a,{h:58,pips:1,wings:1,flames:1})}<div class="rkx"><b>${esc(p.label)}</b><div class="rkbar"><u style="width:${Math.round(p.prog*100)}%"></u></div><small>${p.arch?'Top '+p.arch+' of the season':nf(res.rp)+' RP'+(p.next&&!p.top?' · '+Math.max(0,p.nextAt-res.rp)+' to '+esc(p.next):p.top?' · '+esc(p.next):'')}</small></div><span class="rkd">${sgn}${res.d} RP</span></div>`+(res.leave?'<small class="rkl">Leaving a ranked match early counts as a loss.</small>':'')}
 box.appendChild(w);
 if(res.placeNow||res.majorUp)setTimeout(()=>reveal(res),1300)}

/* ================= BIG REVEAL (after placements, and on a rank up) ================= */
function reveal(res){const o=$('#rkrv');if(!o)return;const inf=res.a1||mine(),p=palKey(keyOf(inf));o.style.setProperty('--gl',p.gl);o.style.setProperty('--c1',p.c1);o.style.setProperty('--c2',p.c2);o.className='rkrv on'+(inf.ri>=6?' big':'');
 $('#rkrk').textContent=res.placeNow?'PLACEMENTS COMPLETE':'RANK UP!';$('#rkrem').innerHTML=emblem(inf,{h:230,wings:1,pips:1,flames:1});$('#rkrn').textContent=inf.label.toUpperCase();
 $('#rkrs').textContent=res.placeNow?'Your rank is '+inf.label+' ('+res.rp+' RP). Placements can only reach Gold 3 – the rest you climb.':'You climbed from '+res.b4.label+' to '+inf.label+'.';
 const sp=$('#rkrsp');sp.innerHTML='';for(let i=0;i<26;i++){const e=document.createElement('i');e.style.cssText=`--a:${(i*360/26)|0}deg;--d:${(.15+Math.random()*.6).toFixed(2)}s;--l:${(90+Math.random()*130)|0}px`;sp.appendChild(e)}
 SFX.claim&&SFX.claim()}
$('#rkrok')&&($('#rkrok').onclick=()=>{SFX.click();$('#rkrv').classList.remove('on')});

/* ================= LOBBY: rank under your name, button dot ================= */
function paint(){const d=D(),inf=mine(),r=rec(),row=$('#rkrow');
 if(row){const p=palKey(keyOf(inf)),tr=d.tr.length?'<span class="rktr" title="Season trophies">'+d.tr.slice(-3).map(t=>['','🥇','🥈','🥉'][t.p]||'🏆').join('')+'</span>':'';
  row.style.setProperty('--gl',p.gl);row.style.setProperty('--c1',p.c1);
  row.innerHTML=emblem(inf,{h:34,pips:0})+`<div><b>${esc(inf.un?'UNRANKED':inf.arch?'ARCHNEMESIS #'+inf.arch:inf.label)}</b><small>${inf.un?'Placements '+(r.pl|0)+'/'+C.PLACE_N:nf(r.r)+' RP'}</small></div>`+tr}
 const dot=$('#rkdot');if(dot)dot.style.display=claims.length?'block':'none';
 const b=$('#rkb');if(b){const l=b.querySelector('.ic');if(l)l.innerHTML=emblem(inf,{h:30})}
 try{typeof partyRefresh=='function'&&partyRefresh()}catch(e){}}

/* ================= SEASON-END REWARDS ================= */
async function checkClaims(){if(!user||user.isAnonymous||owner())return;if(Date.now()-claimT<30000)return;claimT=Date.now();const d=D(),cur=C.season(),out=[];
 for(let s=Math.max(1,cur-3);s<cur;s++){if(d.cl[s])continue;let v=null,t=[];
  try{v=(await db.ref(path(s)+'/'+user.uid).once('value')).val();t=await fetchTop(s)}catch(e){return}
  const i=t.findIndex(x=>x.id==user.uid),pos=i>=0&&i<C.TOPN?i+1:0,rw=v?C.rewardsFor(v,pos):null;
  if(!rw){d.cl[s]=-1;continue}out.push({s,rw,v,pos})}
 claims=out;saveLocal();paint();if(hubOpen)render()}
function claim(s){const c=claims.find(x=>x.s==s);if(!c)return;const d=D();if(d.cl[s]>0)return;d.cl[s]=1;
 const rw=[{k:'coins',n:c.rw.coins}].concat(c.rw.items.map(id=>({k:'item',id})));
 if(c.rw.top)d.tr.push({s,p:c.rw.top});else if(c.rw.arch)d.tr.push({s,p:0});
 const txt=EV.give(rw,false);claims=claims.filter(x=>x.s!=s);saveCfg();ui();paint();render();
 toast('Season '+s+' rewards claimed: '+txt)}

/* ================= QUEUE ================= */
const playlist=()=>PL.includes(CFG.rkpl)?CFG.rkpl:'1v1';
function setPlaylist(p){if(!PL.includes(p))return;CFG.rkpl=p;saveLocal();try{LB2.modeShow();typeof pui=='function'&&pui()}catch(e){}if(hubOpen)render()}
function play(){const md=playlist(),M=modeOf(md),S=M.size;
 if(!user||user.isAnonymous)return toast('Ranked needs an account – sign in with Google or email so your rank is saved'),open();
 if(!conn)return toast('Ranked needs an internet connection (real players only, no bots)');
 if(C.season()>0&&C.sLeft()<=0)return toast('The season is changing – try again in a moment');
 const uids=party?Object.keys(party.m):[user.uid];
 if(uids.length>1){if(party.lead!=user.uid)return toast('Waiting for the party leader to press Play');
  if(uids.length>S)return toast('Ranked '+M.n+' takes a party of up to '+S+' – yours has '+uids.length);
  const ms=uids.map(u=>u==user.uid?{rk:pack(),ac:1}:party.m[u]),bad=ms.find(x=>!x.ac);if(bad)return toast('Everyone in the party needs a signed-in account for ranked');
  const v=ms.map(x=>(x.rk&&x.rk.m!=null?x.rk.m:C.SEED_MM)),un=ms.some(x=>!(x.rk&&x.rk.r>=0));
  if(Math.max(...v)-Math.min(...v)>450||(un&&Math.max(...v)>C.UNP_MAX))return toast('Your party is too far apart in rank for ranked'+(un?' (unranked players can only queue with Platinum and below)':''))}
 findR(md,uids)}
async function findR(md,uids){const M=modeOf(md),S=M.size,me=user.uid,q=db.ref('rankq/'+md),mine1=q.child(me),inv=db.ref('invites/'+me),season=C.season();
 show('queue');$('#qbot').style.display='none';$('#qtxt').textContent='Searching Ranked '+M.n+'…';
 let hb,tm,done=0,sec=0,inQ=false,gap=0,busy=false,formed=null;const t0=now();
 const players=uids.map(u=>u==me?{u,n:nm(),s:SK(),rk:pack()}:{u,n:party.m[u].name,s:party.m[u].skin,rk:party.m[u].rk||{r:-1,m:C.SEED_MM,a:0}});
 const mm0=Math.round(players.reduce((a,p)=>a+C.mmOf(p),0)/players.length);
 const stop=()=>{done=1;clearInterval(hb);clearInterval(tm);inv.off();mine1.onDisconnect().cancel().catch(()=>{});mine1.remove().catch(()=>{});if(qStop===stop)qStop=null;$('#qrk').innerHTML=''};
 qStop=stop;qBot=null;
 const pin=()=>{const inf=mine(),p=palKey(keyOf(inf)),w=C.winOf(mm0,sec),elite=mm0>=C.ELITE;
  $('#qrk').innerHTML=`<div class="rkq" style="--gl:${p.gl}">${emblem(inf,{h:92,wings:1,flames:1,pips:1,pl:rec().pl|0})}<b>${esc(inf.un?'UNRANKED':inf.arch?'ARCHNEMESIS #'+inf.arch:inf.label)}</b><small>${inf.un?'Placement match '+Math.min(C.PLACE_N,(rec().pl|0)+1)+' of '+C.PLACE_N:nf(inf.r)+' RP'}</small>
  <span class="rkr">${elite?'Elite pool · Master · Grandmaster · Archnemesis':'Match range ±'+w+' RP'}${mm0>=C.ARCH_MIN?' (reaches all top 3 ranks)':''}</span></div>`};
 pin();
 tm=setInterval(()=>{if(done)return;sec++;const others=Math.max(0,online-1);$('#qtxt').textContent=`Searching Ranked ${M.n}… ${sec}s · ${others} other player${others==1?'':'s'} online`+(sec>45&&others<2?' · ranked is real players only':'');if(sec%5==0)pin()},1000);
 const begin1=async f=>{const ros=[...f.teams[0].map(p=>({...p,t:0})),...f.teams[1].map(p=>({...p,t:1}))],mid=ros.map(p=>p.u).join('_')+'_'+now();
  await db.ref('matches/'+mid+'/meta').set({a:ros[0].u,b:ros[1].u});
  await Promise.all(ros.filter(p=>p.u!==me).map(p=>db.ref('invites/'+p.u).set({mid,ros,md,rm:1,s:season,t:now()})));
  if(done)return;$('#qtxt').textContent='Match found – loading…';begin2(mid,ros,md,{md,s:season,ros})};
 const attempt=async()=>{if(done||busy)return;busy=true;try{
  if(inQ&&!(await mine1.once('value')).exists()){if(!gap){gap=1;busy=false;return} gap=0} /* my entry vanished: probably consumed by a match whose invite is on its way – wait one round before re-queueing */
  let r=null;for(let k=0;k<4&&!done;k++){
   r=await q.transaction(cur=>{const t=now(),Q={};formed=null;for(const k in cur||{}){const e=cur[k];if(e&&Array.isArray(e.m)&&e.m.length&&e.m.length<=S&&t-e.t<20000)Q[k]=e}
    const own=Q[me],g={k:me,m:players,t0:own&&own.t0?own.t0:t0,t},others=Object.keys(Q).filter(k=>k!==me).map(k=>({k,m:Q[k].m,t0:Q[k].t0,t:Q[k].t}));
    const pl=C.plan(g,others,S,t);if(pl){formed=pl;pl.ch.forEach(x=>{delete Q[x.k]});return Object.keys(Q).length?Q:null}
    Q[me]={m:players,t,t0:g.t0,md};return Q});
   if(r.committed)break}
  if(done){if(r&&r.committed&&!formed)mine1.remove().catch(()=>{});return}
  if(!r||!r.committed)throw new Error('busy');
  if(formed){inQ=false;const f=formed;formed=null;await begin1(f);return}
  if(!inQ){inQ=true;mine1.onDisconnect().remove()}gap=0}
  catch(e){if(!done&&String(e&&e.message||e).indexOf('busy')<0)console.warn('ranked queue',e)}finally{busy=false}};
 await Promise.race([inv.remove().catch(()=>{}),new Promise(r=>setTimeout(r,2000))]);if(done)return; /* old invites are wiped BEFORE listening, so a stale one can never start a ghost match */
 inv.on('value',s=>{const v=s.val();if(v&&!done){if(v.ack)return;inv.remove();beginAny(v)}});
 attempt();hb=setInterval(attempt,4000)}

/* ================= THE RANKED SCREEN ================= */
const dur=ms=>{ms=Math.max(0,ms);const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);return d?d+'d '+h+'h':h+'h '+m+'m'};
function thumb(v){if(thumbs[v])return thumbs[v];try{return thumbs[v]=Game.thumb(v)}catch(e){return''}}
const itemV=id=>{const it=typeof ITEM=='function'?ITEM(id):null;return it};
const itemChip=id=>{const it=itemV(id);if(!it)return'';const r=RAR[it.rar]||RAR.common;return`<span class="rkit" style="--r:${r[1]}" title="${esc(it.n)} · ${r[0]}"><i style="background-image:url(${thumb(it.v)});background-color:#${(it.v%16777216).toString(16).padStart(6,'0')}"></i><b>${esc(it.n)}</b></span>`};
function hero(){const inf=mine(),r=rec(),p=palKey(keyOf(inf));let h;
 if(inf.un){const pl=r.pl|0;h=`<div class="rkinfo"><small>YOUR RANK</small><h3>UNRANKED</h3><div class="rkdots lg">${Array.from({length:C.PLACE_N},(_,i)=>`<s class="${i<pl?'on':''}"></s>`).join('')}</div><p class="sub">${pl?pl+' of '+C.PLACE_N+' placement matches played.':'Play '+C.PLACE_N+' placement matches to discover your rank.'} Your first rank can be anywhere from Bronze 1 to <b>Gold 3</b> – everything above is earned by climbing.</p></div>`}
 else{const w=r.w|0,l=r.l|0,wr=w+l?Math.round(w/(w+l)*100):0,pk=C.info({r:r.pk,a:0});
  h=`<div class="rkinfo"><small>YOUR RANK${inf.arch?' · SEASON TOP '+inf.arch:''}</small><h3>${esc(inf.arch?'ARCHNEMESIS':inf.label.toUpperCase())}</h3>`+
  (inf.arch?`<p class="sub">Only 10 players hold this rank. You are number <b>${inf.arch}</b> – ${inf.arch<=3?'a podium spot worth an exclusive skin at season end!':'climb the top 3 for the podium prizes!'}</p>`:
   `<div class="rkbar"><u style="width:${Math.round(inf.prog*100)}%"></u></div><div class="rkpts"><b>${nf(r.r)}</b> RP${inf.top?` · <b>Top 10 needed</b> for Archnemesis (${top.length>=C.TOPN?nf(top[C.TOPN-1].e+1)+' RP gets you in':'spots open'})`:` · ${Math.max(0,inf.nextAt-r.r)} to ${esc(inf.next)}`}</div>`)+
  `<div class="rkstats"><span>WINS <b>${w}</b></span><span>LOSSES <b>${l}</b></span><span>WIN RATE <b>${wr}%</b></span><span>PEAK <b>${esc(pk.label)}</b></span></div></div>`}
 return`<div class="rkhero" style="--gl:${p.gl};--c1:${p.c1};--c2:${p.c2}"><div class="rkbig">${emblem(inf,{h:170,wings:1,pips:1,flames:1,pl:r.pl|0})}</div>${h}</div>`}
function tPlay(){const sel=playlist(),cur=C.season(),ended=C.sLeft()<=0,uids=party?Object.keys(party.m):[user.uid];
 const pls=PL.map(id=>{const M=modeOf(id);return`<button class="rkpl2 ${sel==id?'on':''}" data-pl="${id}"><b>${id}</b><small>${M.size} v ${M.size}</small></button>`}).join('');
 let note='';if(!user||user.isAnonymous)note='<div class="rknote warn">🔒 Sign in with Google or email to play ranked – your rank, rewards and place on the leaderboard are saved to your account.</div>';
 else if(party&&uids.length>1)note=`<div class="rknote">🎉 Queuing as a party of ${uids.length}. Everyone is matched together.</div>`;
 const open=`<div class="rkrules"><h4>HOW RANKED WORKS</h4><ul>
  <li><b>Real players only.</b> No bots. 1v1, 2v2 and 3v3 all count towards the same rank.</li>
  <li><b>${C.PLACE_N} placement matches</b> reveal your rank. You can only place up to <b>Gold 3</b>.</li>
  <li>8 ranks × 3 divisions (100 RP each): Bronze · Silver · Gold · Platinum · Diamond · Emerald · Master · Grandmaster.</li>
  <li><b>Archnemesis</b> is only for the <b>top 10</b> players of the season (2400+ RP). Archnemesis, Grandmaster and Master play each other.</li>
  <li>Gains shrink the higher you climb, so good ranks take a long time. Leaving a match early counts as a loss.</li>
  <li><b>${C.MINGAMES} ranked matches</b> needed to be listed on the leaderboard.</li>
  <li>The season lasts <b>30 days</b>. Then everyone gets rewards for their rank, and the <b>best, 2nd best and 3rd best</b> players get exclusive skins.</li></ul></div>`;
 return`${note}<div class="rkpls">${pls}</div><button id="rkgo" class="btn rkgo"${ended?' disabled':''}>${rec().pl>=C.PLACE_N&&placed()?'QUEUE RANKED '+sel.toUpperCase():'PLAY PLACEMENT '+Math.min(C.PLACE_N,(rec().pl|0)+1)+'/'+C.PLACE_N+' · '+sel.toUpperCase()}</button>${open}`}
function tLadder(){const inf=mine(),r=rec(),taken=top.filter(x=>x.r>=C.ARCH_MIN).length;
 const rows=[];rows.push(`<div class="rkl arch${inf.arch?' me':''}"><div class="e">${emblem({r:C.ARCH_MIN,a:5},{h:56,wings:1,flames:1})}</div><div class="t"><b>ARCHNEMESIS</b><small>2400+ RP · top 10 only · ${taken}/${C.TOPN} spots taken</small><u>${itemChip('rk_arch')}</u></div>${inf.arch?'<em>YOU</em>':''}</div>`);
 for(let i=7;i>=0;i--){const R=C.RANKS[i],lo=C.rankStart(i),here=!inf.un&&!inf.arch&&inf.ri==i,hi=i==7?'2399':String(lo+299);
  rows.push(`<div class="rkl${here?' me':''}" style="--c1:${R.c1};--gl:${R.gl}"><div class="e">${emblem({r:lo+250,a:0},{h:52,wings:1})}</div><div class="t"><b>${R.n.toUpperCase()}</b><small>${nf(lo)}–${nf(+hi)} RP · 3 divisions${i==2?' · highest placement':''}</small>${C.REW[i].item?'<u>'+itemChip(C.REW[i].item)+'</u>':''}</div>${here?`<em>YOU · ${esc(inf.label)}</em>`:''}</div>`)}
 return'<p class="sub l">Divisions go 1 → 3, then you move up a rank. Rewards are given when the season ends.</p><div class="rkladder">'+rows.join('')+'</div>'}
function lbRows(a,s){if(!a.length)return'<p class="sub l">Nobody is on the board yet.<br>Play '+C.MINGAMES+' ranked matches to be listed – the best three players of the season win exclusive skins!</p>';
 return a.map((x,i)=>{const pos=i+1,inf=C.info({r:x.r,a:x.r>=C.ARCH_MIN?pos:0}),p=palKey(keyOf(inf)),me=user&&x.id==user.uid;
  return`<div class="rkr r${pos<=3?pos:0}${me?' me':''}" style="--gl:${p.gl}"><span class="n">${pos<=3?['🥇','🥈','🥉'][i]:pos}</span><i class="av" style="background:${hx(x.s||0x2f9bff)}"></i><span class="u">${esc(x.n||'Player')}<small>${x.w|0}W · ${x.l|0}L</small></span><span class="rm">${emblem(inf,{h:34})}<small>${esc(inf.arch?'ARCHNEMESIS':inf.label)}</small></span><span class="v"><b>${nf(x.r)}</b><small>RP</small></span></div>`}).join('')}
function tLb(){const cur=C.season(),s=lbSeason&&lbSeason<cur?lbSeason:cur;let h='';
 if(cur>1)h+=`<div class="seg rklbs"><button data-ls="0" class="${s==cur?'on':''}">Season ${cur}</button><button data-ls="${cur-1}" class="${s!=cur?'on':''}">Season ${cur-1} (final)</button></div>`;
 h+=`<p class="sub l">The top 10 players. Only players with <b>${C.MINGAMES}+ ranked matches</b> are listed. Reach 2400 RP inside the top 10 to become <b>Archnemesis</b>.</p><div id="rklb"><p class="sub l">Loading…</p></div>`;
 const me=rec();h+=`<div class="lbme rkme"><span>YOU</span><b>${nf(me.r||0)} RP</b><small>${myPos()?'Season rank #'+myPos():(me.g|0)<C.MINGAMES?(me.g|0)+'/'+C.MINGAMES+' matches to be listed':placed()?'Outside the top 10':'Finish your placements first'}</small></div>`;
 setTimeout(()=>{const t=++lbTok;fetchTop(s).then(a=>{if(t!==lbTok||!$('#rklb'))return;if(s==cur){top=a;topS=cur;topT=Date.now()}$('#rklb').innerHTML=lbRows(a,s)},()=>{$('#rklb')&&($('#rklb').innerHTML='<p class="sub l">Could not load the leaderboard.</p>')})},0);return h}
let lbTok=0;
function tRew(){const cur=C.season();let h='';
 claims.forEach(c=>{const rw=c.rw,inf=C.info({r:c.v.pk,a:0});h+=`<div class="rkclaim"><div class="ch"><b>🎁 SEASON ${c.s} REWARDS</b><small>${rw.top?'You finished #'+rw.top+' in the world!':rw.arch?'You finished as Archnemesis!':'Peak rank: '+esc(C.RANKS[rw.ri].n)}</small></div><div class="ci">${esc(nf(rw.coins))} 🪙 ${rw.items.map(itemChip).join('')}</div><button class="btn" data-claim="${c.s}">CLAIM</button></div>`});
 h+=`<p class="sub l">Season ${cur} ends in <b>${dur(C.sLeft())}</b>. Rewards for every rank you reached are given when it ends. A new season starts straight away.</p>`;
 h+='<h4 class="rkh4">PODIUM · BEST 3 PLAYERS</h4><div class="rkpod">'+[1,2,3].map(p=>{const T=C.TOP[p];return`<div class="rkpc p${p}"><div class="m">${['🥇','🥈','🥉'][p-1]}</div><b>${['BEST','2ND BEST','3RD BEST'][p-1]}</b><small>${esc(T.t)}</small>${itemChip(T.item)}<span>+ ${nf(T.coins)} 🪙</span></div>`}).join('')+'</div>';
 h+='<h4 class="rkh4">RANK REWARDS</h4><div class="rkrw">'+C.REW.map((R,i)=>{const n=C.RANKS[i];return`<div class="rkrr" style="--c1:${n.c1}"><span class="e">${emblem({r:i==8?2500:C.rankStart(i)+150,a:i==8?5:0},{h:40})}</span><b>${n.n}</b><span class="c">${nf(R.coins)} 🪙</span>${R.item?itemChip(R.item):'<em>coins only</em>'}</div>`}).join('')+'</div><p class="sub l">You keep the items of every rank up to your best one, plus the coins of your best rank. Archnemesis rewards need a top 10 finish when the season ends.</p>';
 return h}
function render(){const m=$('#rkm');if(!m||!user)return;$('#rkseason').innerHTML=`SEASON ${C.season()} <b>${dur(C.sLeft())} left</b>`;$('#rkhero').innerHTML=hero();
 $('#rktabs').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',b.dataset.t==tab);if(b.dataset.t=='rew')b.classList.toggle('dot',claims.length>0)});
 $('#rkbody').innerHTML=tab=='play'?tPlay():tab=='ladder'?tLadder():tab=='lb'?tLb():tRew()}
function open(t){SFX.click();hubOpen=true;if(t)tab=t;else if(claims.length)tab='rew';$('#rkm').classList.add('on');loadTop(true).then(()=>{if(hubOpen)render()});render();load()}
function close(){hubOpen=false}
$('#rkb')&&($('#rkb').onclick=()=>open());
$('#rkrow')&&($('#rkrow').onclick=()=>open());
$('#rktabs')&&($('#rktabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;SFX.click();tab=b.dataset.t;render()});
$('#rkbody')&&($('#rkbody').onclick=e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.pl){SFX.click();return setPlaylist(b.dataset.pl)}
 if(b.id=='rkgo'){SFX.resume();SFX.click();$('#rkm').classList.remove('on');hubOpen=false;window.touchEnter&&touchEnter();return play()}
 if(b.dataset.claim){SFX.click();return claim(+b.dataset.claim)}
 if(b.dataset.ls!=null){SFX.click();lbSeason=+b.dataset.ls;render()}});
document.querySelectorAll('.modal .close').forEach(b=>b.addEventListener('click',close));
setInterval(()=>{if(hubOpen&&$('#rkm').classList.contains('on')){$('#rkseason').innerHTML=`SEASON ${C.season()} <b>${dur(C.sLeft())} left</b>`;if(C.season()!==D().s)load(true)}},30000);

/* ================= BOOT ================= */
document.body.insertAdjacentHTML('beforeend',defs());
return{emblem,mini,tagCanvas,info:C.info,pack,mine,paint,load,open,play,finish,endUi,reload:()=>{D();paint()},setPlaylist,playlist,season:C.season,flush,
 pendingClaims:()=>claims.length,palOf:rk=>palKey(keyOf(C.info(rk))),lbl}})();
