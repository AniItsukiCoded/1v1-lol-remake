/* ================= KILLS & DAMAGE LEADERBOARD (main menu) =================
   All-time totals per account from EVERY mode (1v1, 2v2, 3v3, Box Fights, Zone Wars).
   main.js calls LBK.add(kills, damage, vsBots) when a match ends or you leave it. Totals are added to arenaStats/lb/<uid> with a transaction
   (see database.rules.json: values can only go up). Anything that could not be uploaded (offline) waits in localStorage and is sent on the next menu visit.
   COUNT_BOTS: false = matches vs bots do not count toward the leaderboard (they still show on the in-game scoreboard). Owner/admin accounts are never listed. */
const LBK=(()=>{
const $=s=>document.querySelector(s),PATH='arenaStats/lb',COUNT_BOTS=true;
let tab='k',fl=0,tok=0;
const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])),nf=n=>Math.round(n).toLocaleString();
const owner=()=>!!(window.EV&&EV.owner&&EV.owner()),qk=()=>'lbkq_'+(user?user.uid:'x');
function pend(){try{const q=JSON.parse(localStorage.getItem(qk())||'{}');return{k:+q.k||0,dm:+q.dm||0}}catch(e){return{k:0,dm:0}}}
function putPend(q){try{localStorage.setItem(qk(),JSON.stringify(q))}catch(e){}}
function add(k,dm,bots){k=Math.max(0,Math.floor(+k||0));dm=Math.max(0,Math.round(+dm||0));if(bots&&!COUNT_BOTS)return;if((!k&&!dm)||!user||owner())return;const q=pend();q.k+=k;q.dm+=dm;putPend(q);flush()}
function flush(){if(fl||!user||owner()||typeof db=='undefined')return;const q=pend();if(!q.k&&!q.dm)return;fl=1;
 db.ref(PATH+'/'+user.uid).transaction(c=>{c=c||{};return{n:nm().slice(0,14),k:Math.min(5e6,(c.k||0)+q.k),dm:Math.min(5e8,(c.dm||0)+q.dm),s:+CFG.skin||0}})
 .then(r=>{if(r&&r.committed){const p=pend();p.k=Math.max(0,p.k-q.k);p.dm=Math.max(0,p.dm-q.dm);putPend(p)}},()=>{}).then(()=>{fl=0})}
const top=f=>db.ref(PATH).orderByChild(f).limitToLast(50).once('value').then(s=>{const a=[];s.forEach(c=>{const v=c.val();if(v&&Number.isFinite(v[f])&&v[f]>0)a.push(Object.assign({id:c.key},v))});a.sort((x,y)=>y[f]-x[f]);return a});
const mine=()=>user?db.ref(PATH+'/'+user.uid).once('value').then(s=>s.val()||{k:0,dm:0}):Promise.resolve({k:0,dm:0});
function load(){const t=++tok,f=tab,box=$('#lbl'),me=$('#lbme');box.innerHTML='<p class="sub l">Loading…</p>';me.textContent='';
 Promise.all([top(f),mine()]).then(([a,m])=>{if(t!==tok)return;const p=pend(),mv=(m[f]||0)+p[f],i=user?a.findIndex(x=>x.id==user.uid):-1;
  me.innerHTML='<div class="lbme"><span>YOUR '+(f=='k'?'KILLS':'DAMAGE')+'</span><b>'+nf(mv)+'</b><small>'+(i>=0?'Rank #'+(i+1):mv>0?'Outside the top 50':'Play a match to get on the board')+'</small></div>';
  box.innerHTML=a.length?a.map((x,i)=>'<div class="lbr r'+(i<3?i+1:0)+(user&&x.id==user.uid?' me':'')+'"><span class="lbn">'+(i+1)+'</span><i class="lba" style="background:'+(typeof hx=='function'?hx(x.s||0x2f9bff):'#2f9bff')+'"></i><span class="lbu">'+esc(x.n||'Player')+'</span><span class="lbv"><b>'+nf(x[f])+'</b><small>'+(f=='k'?'kills':'damage')+'</small></span></div>').join(''):'<p class="sub l">Nobody is on the board yet — be the first!</p>'},
 ()=>{if(t===tok){box.innerHTML='<p class="sub l">Could not load the leaderboard. Check your connection and try again.</p>'}})}
function open(){SFX.click();$('#lbm').classList.add('on');flush();load()}
$('#lbb').onclick=open;
$('#lbt').onclick=e=>{const b=e.target.closest('button');if(!b||b.dataset.t==tab)return;SFX.click();tab=b.dataset.t;$('#lbt').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));load()};
return{add,flush,open}})();
