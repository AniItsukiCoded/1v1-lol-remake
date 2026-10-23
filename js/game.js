const Game=(()=>{
const T=THREE,WIN=3,DOM={},$=s=>DOM[s]||(DOM[s]=document.querySelector(s)); /* cached lookups (ids only) */
let R,sc,cam,me,db,mid,uid,names,run=false,raf,last=0,pRef,shRef,onEnd,tick,pt,RP=[],oRefs=[],myT=0,W=[0,0],MODE2=0,fireK=0,fcnt=0,aaOn=true,shMode='';
const B=[],K={},FX=[],S={},P=new T.Vector3(),camP=new T.Vector3();
const PMAX=1.5;let yaw=0,pitch=.2,recoil=0,shake=0,sp=0,stepT=0,ph=0,wph=0,corners,sp0,hist=[];
let mvf=1,landT=0,onLeave=null,clk=Date.now,BOTM=0,startT=0,rT0=0,firstTg=0,onGhost=null;
const NR={set(){return Promise.resolve()},push(){},on(){},off(){},remove(){return Promise.resolve()},update(){return Promise.resolve()},child(){return NR},onDisconnect(){return{remove(){},cancel(){},set(){}}}}; /* stand-in for Firebase refs in bot matches */
let phase='live',frz=0,rd=1,cdN=-1,ads=0,camD=4.2,deadK=0;
/* geometry shared by every effect (never disposed): per-shot BoxGeometry/SphereGeometry used to leak GPU buffers and cause hitches */
const UBOX=new T.BoxGeometry(1,1,1),SPG=new T.BoxGeometry(.1,.1,.1),CPG=new T.SphereGeometry(.06,5,4),PLG=new T.PlaneGeometry(1,1),SHG=new T.BoxGeometry(.05,.03,.09);[UBOX,SPG,CPG,PLG,SHG].forEach(x=>x.userData.keep=1);
/* ================= GRAPHICS QUALITY: 0 Anti-Lag · 1 Low · 2 Normal (the original look) · 3 Higher =================
   pr render-scale cap, ss super-sampling multiplier of the device pixel ratio, aa anti-aliasing (applies after a reload), sh/shs shadows + map size, se shadow refresh every N frames,
   dec scenery detail 0/1/2, fx particle multiplier (0 = none), cas shell casings, fl muzzle flashes, flat = grey untextured world */
const QNAMES=['Anti-Lag','Low','Normal','Higher'];
const QL=()=>{const q=window.CFG&&CFG.gq!=null&&Number.isFinite(+CFG.gq)?Math.round(+CFG.gq):2;return Math.max(0,Math.min(3,q))};
const QT=q=>[
{pr:.5,ss:1,aa:false,sh:false,shs:512,shT:T.BasicShadowMap,se:3,dec:0,fx:0,cas:false,fl:false,flat:true},
{pr:.8,ss:1,aa:false,sh:true,shs:1024,shT:T.BasicShadowMap,se:3,dec:1,fx:.4,cas:false,fl:true,flat:false},
{pr:2,ss:1,aa:true,sh:true,shs:2048,shT:T.PCFShadowMap,se:1,dec:2,fx:1,cas:true,fl:true,flat:false},
{pr:2.5,ss:1.5,aa:true,sh:true,shs:4096,shT:T.PCFSoftShadowMap,se:1,dec:2,fx:1.5,cas:true,fl:true,flat:false}][Math.max(0,Math.min(3,q|0))];
let Qs=QT(QL()),dynS=1,fAvg=16.7,fT0=0,fLow=0,fHi=0;
/* dynamic resolution: if the GPU can't hold ~50fps the render scale steps down (and back up when there is headroom) instead of stuttering */
const prNow=()=>Math.min(Qs.pr,(devicePixelRatio||1)*Qs.ss);
function setPR(){R.setPixelRatio(prNow()*dynS);R.setSize(innerWidth,innerHeight)}
function adapt(raw,now){if(raw>250||document.hidden||now-startT<3500){fLow=fHi=0;return}fAvg+=(raw-fAvg)*.05;if(now-fT0<2500)return;
if(fAvg>21&&dynS>.6){if(++fLow>20){dynS=Math.max(.6,+(dynS-.15).toFixed(2));fT0=now;fLow=0;fAvg=16.7;setPR()}}else fLow=0;
if(fAvg<13.5&&dynS<1){if(++fHi>240){dynS=Math.min(1,+(dynS+.1).toFixed(2));fT0=now;fHi=0;setPR()}}else fHi=0}
const QDESC=['Grey untextured world, no shadows, no particles, muzzle flashes or special effects, low resolution. Highest FPS.','Reduced resolution and scenery, small shadows, few particles. Smooth on weak devices.','The standard look: full resolution, shadows, anti-aliasing, all scenery and effects.','Super-sampled resolution, sharp soft shadows, anti-aliasing and extra particles. Needs a strong GPU.'];
const qinfo=q=>QDESC[Math.max(0,Math.min(3,q|0))];
function applyQ(first){const q=QL();Qs=QT(q);dynS=1;FLASH=Qs.fl;R.setPixelRatio(prNow());if(!first)rs();
const mode=(Qs.sh?1:0)+'|'+Qs.shT;if(mode!==shMode){shMode=mode;R.shadowMap.enabled=!!Qs.sh;R.shadowMap.type=Qs.shT;[sc,LS].forEach(s=>s&&s.traverse(o=>{const m=o.material;if(m)(Array.isArray(m)?m:[m]).forEach(x=>x.needsUpdate=true)}))}
if(DL&&DL.shadow.mapSize.x!==Qs.shs){DL.shadow.mapSize.set(Qs.shs,Qs.shs);if(DL.shadow.map){DL.shadow.map.dispose();DL.shadow.map=null}}
R.shadowMap.autoUpdate=Qs.se===1;R.shadowMap.needsUpdate=true;applyFlat()}
let FLASH=true;
/* Anti-Lag: the arena becomes flat grey (no textures, no sky gradient, no emissive glow); other tiers restore the original colours */
function applyFlat(){if(!sc)return;const on=Qs.flat;if(on){if(sc.userData.bg0===undefined)sc.userData.bg0=sc.background;sc.background=new T.Color(0x6e7381)}else if(sc.userData.bg0!==undefined){sc.background=sc.userData.bg0;sc.userData.bg0=undefined}
if(!MG)return;MG.traverse(o=>{const m=o.material;if(!m)return;(Array.isArray(m)?m:[m]).forEach(x=>{const u=x.userData;if(on){if(u.c0===undefined){u.c0=x.color?x.color.getHex():null;u.m0=x.map||null;u.e0=x.emissive?x.emissive.getHex():null}if(x.color&&x.isMeshStandardMaterial||x.isMeshBasicMaterial&&x.color){const c=x.color,l=.3*c.r+.59*c.g+.11*c.b,v=.34+l*.5;c.setRGB(v,v,v*1.03)}x.map=null;if(x.emissive)x.emissive.setHex(0);x.needsUpdate=true}else if(u.c0!==undefined){if(x.color&&u.c0!==null)x.color.setHex(u.c0);x.map=u.m0;if(x.emissive&&u.e0!==null)x.emissive.setHex(u.e0);u.c0=undefined;x.needsUpdate=true}})})}
function quality(){if(!R)return{reload:false};applyQ();return{reload:Qs.aa!==aaOn}}
/* free GPU buffers/textures of a removed object (shared geometry is flagged userData.keep; materials are left alone so compiled shader programs stay cached) */
function disposeTree(o){if(!o)return;o.traverse(x=>{if(x.geometry&&!(x.geometry.userData&&x.geometry.userData.keep))x.geometry.dispose();const m=x.material;if(m)(Array.isArray(m)?m:[m]).forEach(y=>{['map','emissiveMap','alphaMap'].forEach(k=>{if(y[k]&&y[k].dispose)y[k].dispose()})});if(x.skeleton&&x.skeleton.dispose)x.skeleton.dispose()})}
const crates=[[0,0,6,6,2.4],[-12,8,4,4,2],[12,-8,4,4,2],[-10,-12,8,2,3],[10,12,8,2,3],[0,-14,3,3,1.5],[0,14,3,3,1.5],[-18,0,2,8,3],[18,0,2,8,3],[-6,10,3,3,1.2],[6,-10,3,3,1.2]];

/* ================= WEAPONS =================
   rate = ms between shots, rec = camera/arm kick, fall = [full-damage range, zero-ish range, min multiplier]
   Gun parts live in "gun space": +Z forward, +Y up, origin at the grip (world units). */
const WEAPONS=[
{key:'1',id:'shotgun',n:'SHOTGUN',dmg:11,bdmg:9,hs:1.5,rate:800,mag:6,res:24,rl:2200,spread:.07,pel:8,auto:0,rec:.55,shk:.1,kk:1,kd:7,fall:[7,20,.15],zoom:1.2,col:'#c08a5a',
 parts:[['c',.03,.7,0,.045,.52,'#111'],['b',.08,.07,.2,0,.0,.45,'#c08a5a'],['b',.065,.1,.3,0,.03,.1,'#2b2f3a'],['b',.05,.1,.3,0,-.01,-.22,'#8a5a30'],['b',.045,.1,.05,0,-.06,-.02,'#1d2029']],mz:.88},
{key:'2',id:'ar',n:'ASSAULT RIFLE',dmg:17,bdmg:13,hs:2,rate:105,mag:30,res:120,rl:1800,spread:.013,pel:1,auto:1,rec:.07,shk:.012,kk:.4,kd:15,fall:[40,90,.7],zoom:1.4,col:'#ff9a2f',
 parts:[['b',.065,.1,.5,0,.04,.2,'#2b2f3a'],['b',.07,.08,.3,0,.03,.58,'#ff9a2f'],['c',.018,.25,0,.04,.86,'#111'],['b',.04,.22,.07,0,-.12,.24,'#1d2029'],['b',.05,.1,.28,0,0,-.2,'#2b2f3a'],['b',.045,.1,.05,0,-.06,-.02,'#1d2029'],['b',.02,.04,.12,0,.115,.25,'#111']],mz:.99},
{key:'F',id:'pickaxe',n:'PICKAXE',melee:1,dmg:34,bdmg:75,hs:1.4,rate:520,mag:0,res:0,rl:0,spread:0,pel:1,auto:0,rec:0,shk:0,kk:0,kd:10,fall:[999,999,1],range:3,zoom:1,col:'#c0c8dc',
 parts:[['b',.045,.045,.95,0,0,.3,'#8a5a30'],['b',.05,.5,.08,0,0,.78,'#c0c8dc'],['b',.06,.1,.12,0,0,.78,'#6b7390']],mz:0}
];
const PICK=2;
function buildGun(w,sk){const g=new T.Group(),em=sk&&sk.e?new T.Color(sk.e):null,gl=sk&&sk.g?new Set(sk.g):null;
const mk=(p,i,ci)=>{const o={color:sk&&sk.c[i]?sk.c[i]:p[ci],roughness:sk?.35:.5,metalness:sk?.45:.3};if(em&&(!gl||gl.has(i))){o.emissive=em;o.emissiveIntensity=sk.ei}return new T.MeshStandardMaterial(o)};
w.parts.forEach((p,i)=>{let m;if(p[0]=='b'){m=new T.Mesh(new T.BoxGeometry(p[1],p[2],p[3]),mk(p,i,7));m.position.set(p[4],p[5],p[6])}
else{m=new T.Mesh(new T.CylinderGeometry(p[1],p[1],p[2],8),mk(p,i,6));m.rotation.x=Math.PI/2;m.position.set(p[3],p[4],p[5])}
m.castShadow=true;g.add(m)});
const mz=new T.Object3D();mz.position.set(0,.045,w.mz);g.add(mz);g.userData.mz=mz;if(!w.melee){const f=flashObj();mz.add(f);g.userData.fl=f}return g}
const flashMat=()=>new T.MeshBasicMaterial({color:0xffc864,transparent:true,opacity:.95,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,fog:false});
function flashObj(){const f=new T.Group(),m=flashMat(),a=new T.Mesh(PLG,m),b=new T.Mesh(PLG,m);a.rotation.y=Math.PI/2;a.scale.set(.55,.3,1);a.position.z=.22;b.rotation.x=Math.PI/2;b.scale.set(.3,.55,1);b.position.z=.22;f.add(a,b);f.visible=false;return f}
function gunIcon(w,cols,sz){const x=w.parts.map((p,i)=>p[0]=='b'?[p[6],p[5],p[3],p[2],cols&&cols[i]||p[7]]:[p[5],p[4],p[2],p[1]*2,cols&&cols[i]||p[6]]);
const sx=z=>(z+.4)*100,sy=y=>(.3-y)*100,lt=c=>c=='#111'||c=='#0c0c18'?'#cfd6ee':c=='#2b2f3a'||c=='#1d2029'?'#e9ecff':c;
return `<svg viewBox="0 0 150 62" width="${sz?sz*2.4:68}" height="${sz||28}">`+x.map(r=>`<rect x="${sx(r[0]-r[2]/2)}" y="${sy(r[1]+r[3]/2)}" width="${r[2]*100}" height="${r[3]*100}" fill="${cols?r[4]:lt(r[4])}" opacity=".95"/>`).join('')+'</svg>'}
/* ---- input: every key / mouse button maps to an action through js/controls.js (rebindable) ---- */
const TCH=()=>!!window.TOUCH,paused=()=>$('#pause').classList.contains('on');
/* desktop: mouse must be captured (pointer lock). touch: always "captured" unless the pause menu is open */
const hold=()=>run&&R&&(TCH()?!paused():document.pointerLockElement===R.domElement);
const lock=()=>{if(!(run&&R))return;if(TCH()){S.hadLock=1;$('#resume').style.display='none';$('#pause').classList.remove('on');for(const k in K)K[k]=0}else R.domElement.requestPointerLock()};
function trig(a,rep){switch(a){case 'reload':reload();break;case 'music':if(!rep)SFX.music();break;case 'wall':case 'floor':case 'ramp':case 'roof':if(!rep)setBuild(a);break;case 'mat':if(!rep)cycleMat();break;
case 'edit':if(!rep){if(EDIT)confirmEdit();else startEdit()}break;case 'pick':selectW(PICK);break;case 'w1':selectW(0);break;case 'w2':selectW(1);break}}
function down(a,rep){if(a=='shoot'){if(hold())K.shoot=1;return}
if(a=='aim'){if(rep||!hold())return;if(EDIT)EDIT.mask=EDIT.orig;else if(buildT)cycleMat();else K.aim=1;return}
K[a]=1;if(run)trig(a,rep)}
function up(a){if(a=='shoot'){K.shoot=0;S.lat=0}else K[a]=0}
const pumpOf=(t0,now,w)=>{if(!t0||!w||w.id!='shotgun')return 0;const u=(now-t0-180)/450;return u>0&&u<1?Math.sin(u*Math.PI):0};
/* HUD key labels follow the player's bindings */
function refreshKeys(){const wb=$('#wbar');if(wb)[...wb.children].forEach((d,i)=>{const e=d.querySelector('i');if(e)e.textContent=CTL.first(['w1','w2','pick'][i])});
const bq=$('#bq');if(bq)bq.querySelectorAll('.bs').forEach(d=>{const e=d.querySelector('i');if(e)e.textContent=CTL.first(d.dataset.t)})}
function init(){if(R)return;Qs=QT(QL());aaOn=Qs.aa;R=new T.WebGLRenderer({canvas:$('#c'),antialias:aaOn,powerPreference:'high-performance'});
sc=new T.Scene();cam=new T.PerspectiveCamera(75,1,.1,200);HL=new T.HemisphereLight(0xaaaaff,0x443355,.8);sc.add(HL);DL=new T.DirectionalLight(0xffd0a0,1);DL.position.set(30,40,20);DL.castShadow=true;DL.shadow.bias=-.0006;DL.shadow.normalBias=.05;DL.shadow.mapSize.set(2048,2048);Object.assign(DL.shadow.camera,{left:-40,right:40,top:40,bottom:-40});sc.add(DL);
addEventListener('resize',rs);applyQ(1);rs();
const wb=$('#wbar');if(wb&&!wb.children.length)WEAPONS.forEach((w,i)=>{const d=document.createElement('div');d.className='ws';d.innerHTML=`<i>${w.key}</i>${gunIcon(w)}<b>${w.n}</b>`;d.onclick=()=>run&&selectW(i);wb.appendChild(d)});
const bq=$('#bq');if(bq&&!bq.children.length){[['Z','wall','▮'],['X','floor','▬'],['C','ramp','⟋'],['V','roof','▲'],['G','edit','✎']].forEach(([k,t,ic])=>{const d=document.createElement('div');d.className='bs';d.dataset.t=t;d.innerHTML=`<i>${k}</i><span>${ic}</span><b>${t=='edit'?'EDIT':BPIECE[t].n}</b>`;d.onclick=()=>run&&(t=='edit'?(EDIT?confirmEdit():startEdit()):setBuild(t));bq.appendChild(d)});const m=document.createElement('div');m.id='mats';m.onclick=()=>cycleMat();bq.appendChild(m)}
addEventListener('keydown',e=>{if(CTL.busy)return;for(const a of CTL.acts(e.code))down(a,e.repeat)});addEventListener('keyup',e=>{for(const a of CTL.acts(e.code))up(a)});
addEventListener('blur',()=>{for(const k in K)K[k]=0;S.lat=0});
addEventListener('wheel',e=>{if(TCH()||!run||document.pointerLockElement!=R.domElement)return;selectW((S.w+(e.deltaY>0?1:-1)+WEAPONS.length)%WEAPONS.length)},{passive:true});
addEventListener('contextmenu',e=>{if(run)e.preventDefault()});
addEventListener('mousemove',e=>{if(TCH()||!run||document.pointerLockElement!=R.domElement)return;if(Math.abs(e.movementX)>350||Math.abs(e.movementY)>350)return;const k=.0024*(window.CFG?CFG.sens:1)*(cam.fov/75);yaw-=e.movementX*k;pitch=Math.max(-PMAX,Math.min(PMAX,pitch-e.movementY*k))});
addEventListener('mousedown',e=>{if(TCH()||!run||CTL.busy)return;if(e.target.closest&&e.target.closest('#pause,.modal'))return;if(document.pointerLockElement!=R.domElement){R.domElement.requestPointerLock();return}
const as=CTL.acts('Mouse'+e.button);if(as.length&&(e.button===1||e.button>2))e.preventDefault();as.forEach(a=>down(a,false))});
addEventListener('mouseup',e=>{for(const a of CTL.acts('Mouse'+e.button))up(a)});
document.addEventListener('pointerlockchange',()=>{if(!run)return;const l=!!document.pointerLockElement;if(l){S.hadLock=1;$('#resume').style.display='none';$('#pause').classList.remove('on')}
else{for(const k in K)K[k]=0;if(S.hadLock&&phase!='ended'){$('#pause').classList.add('on');$('#pconf').style.display='none';$('#pbtns').style.display='block'}else $('#resume').style.display='grid'}});
document.addEventListener('pointerlockerror',()=>{if(run&&!document.pointerLockElement&&S.hadLock)setTimeout(()=>{if(run&&!document.pointerLockElement)R.domElement.requestPointerLock()},500)});
document.addEventListener('visibilitychange',()=>{const n=performance.now();RP.forEach(r=>{if(r.t)r.t=n})});
$('#resume').onclick=lock;
$('#pres').onclick=()=>{SFX.click();lock()};
$('#pset').onclick=()=>{SFX.click();$('#settings').classList.add('on')};
$('#pleaveg').onclick=()=>{SFX.click();$('#pbtns').style.display='none';$('#pconf').style.display='block'};
$('#pno').onclick=()=>{SFX.click();$('#pconf').style.display='none';$('#pbtns').style.display='block'};
$('#pyes').onclick=()=>{SFX.click();leave()}}

let MG,HL,DL;
const MAPS=[
{n:'Grasslands',sky:['#12276b','#3b8fe8','#a9e4ff'],fog:0x8fd0f5,fd:[45,130],gc:[0x56c93f,0x4ab536],far:0x3f9a30,hl:[0xffffff,0x88aa66,.95],dl:0xfff4d8,mt:0x1b2a6e,k:0,
p(b,s){b(0,0,8,8,3,0xcfd3e6);s(0,4,0,1,4,.75,3.4,1.4);[[-14,-6,6,1],[14,6,6,1],[-8,14,1,6],[8,-14,1,6]].forEach(c=>b(c[0],c[1],c[2],c[3],2.2,0xe9e9f5));[[-12,8],[12,-8],[-4,-12],[4,12],[-20,-2],[20,2]].forEach((c,i)=>b(c[0],c[1],2.4,2.4,1.5+i%2*.8,0xb07a4a))}},
{n:'Crate Yard',sky:['#1fb5ff','#5ad6ff','#b48cff'],fog:0x9fd8ff,fd:[40,120],gc:[0x7a52c8,0x6a45b4],far:0x5a3a9c,hl:[0xffffff,0x8866cc,1],dl:0xffffff,mt:0x5b3fb0,k:1,
p(b){const w=0xb07a4a,v=0xc08a5a;b(0,0,6,6,3,w);b(0,0,3.4,3.4,4.5,v);b(-4.4,2,2.6,2.6,1.5,v);b(4.2,-2,2.2,2.2,1.5,w);[[-14,-10],[14,10],[-14,12],[14,-12]].forEach((c,i)=>{b(c[0],c[1],4,4,3,w);b(c[0]+(i%2?-3.2:3.2),c[1],2.4,2.4,1.5,v)});b(0,-16,12,1.6,2.2,v);b(0,16,12,1.6,2.2,v);b(-21,0,1.6,10,2.2,w);b(21,0,1.6,10,2.2,w);[[-8,-6],[8,6],[-8,6],[8,-6],[0,-9],[0,9]].forEach(c=>b(c[0],c[1],1.6,1.6,1.6,v))}},
{n:'Container Port',sky:['#2a1a4a','#d4507a','#ffb36b'],fog:0xe8907a,fd:[35,110],gc:[0x8b8f9c,0x7d818e],far:0x5d6070,hl:[0xffe0d0,0x665577,.9],dl:0xffb070,mt:0x3a2a5e,k:2,
p(b,s){const c=[0xd9552b,0x2e7bd6,0x3aa856,0xe0b13a];let i=0;const C=(x,z,r)=>b(x,z,r?2.6:10,r?10:2.6,2.6,c[i++%4]);C(0,0);s(0,1.3,0,1,4,.65,2.4,1.2);C(-10,-12);C(10,12);C(-12,6,1);C(12,-6,1);C(0,-20);C(0,20);C(-20,-8,1);C(20,8,1);C(8,-14);C(-8,14);[[-5,-8],[5,8],[-6,10],[6,-10]].forEach(q=>b(q[0],q[1],1.6,1.6,1.6,0x555a6e))}},
{n:'Neon Dome',sky:['#150a40','#6a2c8a','#ff8a65'],fog:0x2a1f55,fd:[30,90],gc:[0x22264a,0x1b1f3d],far:0x101030,hl:[0xaaaaff,0x443355,.8],dl:0xffd0a0,mt:0x2b1a6e,k:3,
p(b){[[0,-31,64,2],[0,31,64,2],[-31,0,2,64],[31,0,2,64]].forEach(w=>b(w[0],w[1],w[2],w[3],8,0x30305a));crates.forEach((c,i)=>b(c[0],c[1],c[2],c[3],c[4],[0xc0623a,0x4d6fd0,0x8a4dd0][i%3]))}}];
function buildMap(i){const M=MAPS[i];if(MG){sc.remove(MG);disposeTree(MG)}MG=new T.Group();sc.add(MG);B.length=0;for(let j=FX.length-1;j>=0;j--)if(FX[j].ring)FX.splice(j,1);
const hx=c=>'#'+c.toString(16).padStart(6,'0'),g=document.createElement('canvas');g.width=2;g.height=256;let x=g.getContext('2d'),r=x.createLinearGradient(0,0,0,256);M.sky.forEach((c,j)=>r.addColorStop(j/2,c));x.fillStyle=r;x.fillRect(0,0,2,256);const ob=sc.userData.bg0!==undefined?sc.userData.bg0:sc.background;sc.userData.bg0=undefined;sc.background=new T.CanvasTexture(g);ob&&ob.dispose&&ob.dispose();
sc.fog=new T.Fog(M.fog,M.fd[0],M.fd[1]);HL.color.setHex(M.hl[0]);HL.groundColor.setHex(M.hl[1]);HL.intensity=M.hl[2];DL.color.setHex(M.dl);
const mt=c=>new T.MeshStandardMaterial({color:c,roughness:.9,flatShading:true}),add=(ge,c,px,py,pz)=>{const m=new T.Mesh(ge,mt(c));m.position.set(px,py,pz);m.castShadow=m.receiveShadow=true;MG.add(m);return m},
b=(px,pz,w,d,h,c)=>{add(new T.BoxGeometry(w,h,d),c,px,h/2,pz);B.push({x:px,z:pz,w,d,h})},
s=(px,pz,dx,dz,n,sh,w,len)=>{for(let k=0;k<n;k++)b(px+dx*len*(k+.5),pz+dz*len*(k+.5),dx?len:w,dx?w:len,sh*(n-k),0xbfc4da)};
const cv=document.createElement('canvas');cv.width=cv.height=2;x=cv.getContext('2d');x.fillStyle=hx(M.gc[0]);x.fillRect(0,0,2,2);x.fillStyle=hx(M.gc[1]);x.fillRect(1,0,1,1);x.fillRect(0,1,1,1);
const tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.magFilter=T.NearestFilter;tx.repeat.set(8,8);
const fl=new T.Mesh(new T.PlaneGeometry(64,64),new T.MeshStandardMaterial({map:tx,roughness:1}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;MG.add(fl);
const fr=add(new T.PlaneGeometry(700,700),M.far,0,-.05,0);fr.rotation.x=-Math.PI/2;fr.castShadow=false;
for(let n=0;n<(Qs.dec?14:7);n++){const a=n/(Qs.dec?14:7)*6.283,rr=85+n%3*12,h=18+(n*7%5)*7;add(new T.ConeGeometry(16+n%4*4,h,4),M.mt,Math.cos(a)*rr,h/2-1,Math.sin(a)*rr)}
for(let n=0;n<(Qs.dec?26:0);n++){const a=n*2.4,rr=38+n%5*6,px=Math.cos(a)*rr,pz=Math.sin(a)*rr;
if(M.k==0){add(new T.CylinderGeometry(.3,.4,2,6),0x6b4a2b,px,1,pz);add(new T.ConeGeometry(1.8,4.5,6),0x2e8b3d,px,4,pz)}
else if(M.k==1)add(new T.ConeGeometry(.25,1.4,4),0x8be04a,px,.7,pz);
else if(M.k==2&&n<18){const h=14+n*5%25;add(new T.BoxGeometry(6+n%3*3,h,6+n%2*4),0x35395e,px*1.3,h/2,pz*1.3)}
else if(M.k==3&&n<12){const t=new T.Mesh(new T.TorusGeometry(2+n%3,.12,8,24),new T.MeshBasicMaterial({color:n%2?0xff4d9d:0x38f5c8}));t.position.set(Math.cos(n)*45,18+n*2,Math.sin(n)*45);t.rotation.x=n;t.userData.s=.2+n*.03;MG.add(t);FX.push({ring:t})}}
M.p(b,s);applyFlat()}
/* ================= CHARACTER RIG (1v1.lol Drop Kick model, always used) ================= */
let SKG;
const AX={x:new T.Vector3(1,0,0),y:new T.Vector3(0,1,0),z:new T.Vector3(0,0,1)};
function skinData(){const D=window.SKIN;if(!D)return null;if(SKG)return SKG;
const bin=Uint8Array.from(atob(D.blob),c=>c.charCodeAt(0)).buffer,F=(n,C)=>new C(bin,D.meta[n][0],D.meta[n][1]/C.BYTES_PER_ELEMENT),ge=new T.BufferGeometry();
const ji=F('ji',Uint8Array).slice(0,D.vc*4),sw=F('sw',Float32Array).slice(0,D.vc*4);
ge.setAttribute('position',new T.BufferAttribute(F('pos',Float32Array).slice(0,D.vc*3),3));ge.setAttribute('normal',new T.BufferAttribute(F('nor',Float32Array).slice(0,D.vc*3),3));
ge.setAttribute('skinIndex',new T.BufferAttribute(new Uint16Array(ji),4));ge.setAttribute('skinWeight',new T.BufferAttribute(sw,4));
ge.setIndex(new T.BufferAttribute(F('idx',D.i16?Uint16Array:Uint32Array).slice(0,D.ic),1));ge.computeBoundingBox();ge.userData.keep=1;
const used=new Set();for(let i=0;i<ji.length;i++)if(sw[i]>.001)used.add(ji[i]);
/* damp the kick clip's horizontal root motion so the character stays roughly in place */
const tracks=D.tracks.map(([n,p,t,v])=>{if(n==D.joints[1]&&p=='translation'){v=v.slice();const x0=v[0],z0=v[2];for(let i=0;i<v.length;i+=3){v[i]=x0+(v[i]-x0)*.2;v[i+2]=z0+(v[i+2]-z0)*.2}}
return p=='rotation'?new T.QuaternionKeyframeTrack('n'+n+'.quaternion',t,v):new T.VectorKeyframeTrack('n'+n+(p=='scale'?'.scale':'.position'),t,v)});
return SKG={ge,ibm:F('ibm',Float32Array),used,clip:new T.AnimationClip('kick',D.dur,tracks)}}

function rig(col){const D=window.SKIN,G=skinData();if(!G)return null;const cid=window.COS?COS.id(col):0,gp=w=>window.GUN?GUN.get(w,GUN.pick(col,w)):null;col=col%16777216;
const J=new Set(D.joints),mat=new T.MeshStandardMaterial({color:col,roughness:.48,metalness:.08,emissive:col,emissiveIntensity:.1,skinning:true,side:T.DoubleSide}),root=new T.Group();
const os=D.nodes.map((n,i)=>{const o=i==D.mesh?new T.SkinnedMesh(G.ge,mat):J.has(i)?new T.Bone():new T.Object3D();o.name='n'+i;o.userData.nm=n.n;
if(n.m)new T.Matrix4().fromArray(n.m).decompose(o.position,o.quaternion,o.scale);else{n.t&&o.position.fromArray(n.t);n.r&&o.quaternion.fromArray(n.r);n.s&&o.scale.fromArray(n.s)}return o});
D.nodes.forEach((n,i)=>(n.p<0?root:os[n.p]).add(os[i]));
const mesh=os[D.mesh];mesh.frustumCulled=false;mesh.castShadow=true;root.updateMatrixWorld(true);
mesh.bind(new T.Skeleton(D.joints.map(j=>os[j]),D.joints.map((_,j)=>new T.Matrix4().fromArray(G.ibm,j*16))),mesh.matrixWorld);
/* rebuild the rest pose from the inverse bind matrices so "no pose" == T-pose with zero skin distortion */
const BN={},ALL=[],tv=new T.Vector3(),ts=new T.Vector3();
D.joints.forEach((ni,jj)=>{if(!G.used.has(jj))return;const b=os[ni],M=new T.Matrix4().fromArray(G.ibm,jj*16).invert();
new T.Matrix4().copy(b.parent.matrixWorld).invert().multiply(M).decompose(b.position,b.quaternion,b.scale);b.updateMatrixWorld(true);
const wq=new T.Quaternion();M.decompose(tv,wq,ts);const r={b,nm:D.nodes[ni].n.replace('mixamorig:',''),bp:b.position.clone(),bq:b.quaternion.clone(),bs:b.scale.clone(),bwi:wq.clone().invert()};BN[r.nm]=r;ALL.push(r)});
const bb=G.ge.boundingBox,k2=1.9/(bb.max.y-bb.min.y),inn=new T.Group();inn.rotation.y=Math.PI;inn.add(root);root.scale.setScalar(k2);root.position.set(0,-bb.min.y*k2,0);
const g=new T.Group();g.rotation.order='YXZ';g.add(inn);
/* cosmetic accessories ride on the head / spine / hip bones; each holder cancels the bone's rest rotation+scale so parts are authored in plain character space (see js/cosmetics.js) */
const cs=cid&&window.COS?COS.make(cid,mat):null;let cT=0;
if(cs){g.updateMatrixWorld(true);const hold=(nm,x,y,z,arr)=>{if(!arr||!BN[nm])return;const b=BN[nm].b,h=new T.Group(),ws=b.getWorldScale(new T.Vector3());h.quaternion.copy(b.getWorldQuaternion(new T.Quaternion())).invert();h.scale.set(1/ws.x,1/ws.y,1/ws.z);h.position.copy(b.worldToLocal(new T.Vector3(x,y,z)));b.add(h);arr.forEach(o=>h.add(o))};
hold('Head_05',0,1.75,0,cs.head);hold('Spine2_03',0,1.5,.12,cs.back);hold('Spine2_03',0,1.5,0,cs.chest);hold('Hips_01',0,.96,.1,cs.hip)}
/* gun mounted on the right hand (gun +Z -> hand +Y, gun up -> -hand Z) */
const mount=new T.Group();mount.rotation.x=-Math.PI/2;mount.position.set(0,.07,0);mount.scale.setScalar(1/(100*k2));BN.RightHand_026.b.add(mount);
const guns=WEAPONS.map((w,i)=>buildGun(w,gp(i)));let gi=-1,flT=0;
const mx=new T.AnimationMixer(root),ac=mx.clipAction(G.clip);ac.setLoop(T.LoopOnce,1);ac.clampWhenFinished=true;let kT=0;
const q=new T.Quaternion(),acc=new T.Quaternion(),ax=new T.Vector3(),X=AX.x,Y=AX.y,Z=AX.z;
const rot=(n,list)=>{const r=BN[n];acc.identity();for(const[a,v]of list){if(!v)continue;ax.copy(a).applyQuaternion(r.bwi);q.setFromAxisAngle(ax,v);acc.premultiply(q)}r.b.quaternion.copy(r.bq).multiply(acc)};
/* ---- two-bone arm IK (law of cosines + elbow pole vector) for gun poses: the gun points exactly along the aim direction and both hands stay on it.
   Targets are built in character space (x right, y up, -z forward) around the mid-shoulder point, so lean / pitch / recoil never pull the gun off the crosshair. ---- */
ALL.forEach((r,i)=>r.i=i);g.updateMatrixWorld(true);
const V3=()=>new T.Vector3(),tS=V3(),tE=V3(),tH=V3(),tT=V3(),tPp=V3(),tD1=V3(),tD2=V3(),tN=V3(),tB=V3(),tC3=V3(),tC=V3(),tC2=V3(),tGx=V3(),tUp=V3(),tFw=V3(),tNg=V3(),tPoleR=V3(),tPoleL=V3(),tGrip=V3(),tWr=V3(),tPal=V3();
const qP=new T.Quaternion(),qU=new T.Quaternion(),qA=new T.Quaternion(),qF=new T.Quaternion(),qG=new T.Quaternion(),qHd=new T.Quaternion(),m1=new T.Matrix4(),m2=new T.Matrix4();
const hsc=(()=>{const v=V3();BN.RightHand_026.b.getWorldScale(v);return v.x})();
const IK=[1,-1].map(sd=>{const p=sd>0?'Right':'Left',n=sd>0?['Arm_024','ForeArm_025','Hand_026','Shoulder_023']:['Arm_08','ForeArm_09','Hand_010','Shoulder_07'],sb=BN[p+n[0]],eb=BN[p+n[1]],hb=BN[p+n[2]],pb=BN[p+n[3]],a=V3(),b=V3(),c=V3();
sb.b.getWorldPosition(a);eb.b.getWorldPosition(b);hb.b.getWorldPosition(c);
const ab=eb.bp.clone().normalize(),hf=AX.y.clone().applyQuaternion(eb.bwi),hbu=hf.clone().applyQuaternion(eb.bq);hbu.addScaledVector(ab,-hbu.dot(ab)).normalize();
return{sd,S:sb,E:eb,H:hb,P:pb,l1:a.distanceTo(b),l2:b.distanceTo(c),hf,mu:new T.Matrix4().makeBasis(ab,hbu,new T.Vector3().crossVectors(ab,hbu)).transpose(),qS:new T.Quaternion(),qE:new T.Quaternion(),qH:new T.Quaternion()}});
function solveArm(c,Tw,pole,Qh){c.S.b.getWorldPosition(tS);c.P.b.getWorldQuaternion(qP);
tT.copy(Tw).sub(tS);const L=Math.max(1e-4,tT.length()),Lc=Math.min(Math.max(L,Math.abs(c.l1-c.l2)+.001),(c.l1+c.l2)*.995);tT.multiplyScalar(1/L);
const a=(c.l1*c.l1-c.l2*c.l2+Lc*Lc)/(2*Lc),h=Math.sqrt(Math.max(0,c.l1*c.l1-a*a));
tPp.copy(pole).addScaledVector(tT,-pole.dot(tT));if(tPp.lengthSq()<1e-8)tPp.set(0,-1,0);tPp.normalize();
tE.copy(tS).addScaledVector(tT,a).addScaledVector(tPp,h);tH.copy(tS).addScaledVector(tT,Lc);
tD1.copy(tE).sub(tS).normalize();tD2.copy(tH).sub(tE).normalize();
const phi=Math.acos(Math.max(-1,Math.min(1,tD1.dot(tD2))));
tN.crossVectors(tD1,tD2);if(tN.lengthSq()<1e-8)tN.crossVectors(tT,tPp);tN.addScaledVector(tD1,-tN.dot(tD1)).normalize();
tB.copy(tN).multiplyScalar(c.sd);tC3.crossVectors(tD1,tB);
m1.makeBasis(tD1,tB,tC3);m2.multiplyMatrices(m1,c.mu);qU.setFromRotationMatrix(m2);
c.qS.copy(qP).invert().multiply(qU);c.qE.copy(c.E.bq).multiply(qA.setFromAxisAngle(c.hf,c.sd*phi));qF.copy(qU).multiply(c.qE);c.qH.copy(qF).invert().multiply(Qh)}
/* IKP = gun-hold parameters from poseT: P gun pitch, ox/oy/oz grip offset from the mid-shoulder point (character space), lx/ly/lz left palm on the gun */
let IKP=null,IKL=null;
function ikRun(w,IKq){const P=IKq.P,cP=Math.cos(P),sP=Math.sin(P);g.updateMatrixWorld(true);g.getWorldQuaternion(qG);
IK[0].S.b.getWorldPosition(tC);IK[1].S.b.getWorldPosition(tC2);tC.add(tC2).multiplyScalar(.5);
tFw.set(0,sP,-cP).applyQuaternion(qG);tUp.set(0,cP,sP).applyQuaternion(qG);tGx.crossVectors(tUp,tFw);
tGrip.set(IKq.ox,IKq.oy*cP-IKq.oz*sP,IKq.oy*sP+IKq.oz*cP).applyQuaternion(qG).add(tC);
tPoleR.set(.5,-1,.3).applyQuaternion(qG);tPoleL.set(-.5,-1,.3).applyQuaternion(qG);
/* right hand: hand x -> gun x, y -> forward, z -> -up */
tNg.copy(tUp).negate();m1.makeBasis(tGx,tFw,tNg);qHd.setFromRotationMatrix(m1);tWr.set(0,.07*hsc,0).applyQuaternion(qHd).negate().add(tGrip);solveArm(IK[0],tWr,tPoleR,qHd);
/* left hand: palm on the hand-guard, fingers forward, palm up */
tPal.copy(tGrip).addScaledVector(tGx,IKq.lx).addScaledVector(tUp,IKq.ly).addScaledVector(tFw,IKq.lz);
tNg.copy(tFw).negate();m1.makeBasis(tNg.crossVectors(tFw,tUp),tFw,tUp);qHd.setFromRotationMatrix(m1);tWr.set(0,.07*hsc,0).applyQuaternion(qHd).negate().add(tPal);solveArm(IK[1],tWr,tPoleL,qHd);
for(const c of IK)for(const r of[c.S,c.E,c.H]){sq[r.i].slerp(c.qS===undefined?r.b.quaternion:(r===c.S?c.qS:r===c.E?c.qE:c.qH),w);r.b.quaternion.copy(sq[r.i])}}
function setGun(i){gi=i;if(i==PICK){mount.quaternion.set(.0898,.7847,.0953,.6058);mount.position.set(0,.065,.02)}else{mount.rotation.set(-Math.PI/2,0,0);mount.position.set(0,.07,0)}guns.forEach(x=>{if(x.parent)x.parent.remove(x)});if(i>=0)mount.add(guns[i])}
/* o: k walk 0..1, w walk phase, pitch aim, rec recoil, air 0..1 + u jump velocity -1..1 (smoothed), land 0..1, gun weapon index (-1 = builder), swing 0..1 (pickaxe), t time, idle (lobby) */
const ease=x=>x*x*(3-2*x),mixv=(a,b,x)=>a+(b-a)*x,FING=ALL.filter(r=>/^(Left|Right)Hand(Index|Middle|Thumb)\d/.test(r.nm));
function curl(side,a){for(const r of FING){if(r.nm.indexOf(side)!=0)continue;const th=/Thumb/.test(r.nm);q.setFromAxisAngle(X,a*(th?.45:1));r.b.quaternion.copy(r.bq).multiply(q)}}
function poseT(o){IKP=null;for(const r of ALL){r.b.position.copy(r.bp);r.b.quaternion.copy(r.bq)}
const k=o.k||0,s=Math.sin(o.w||0),c=Math.cos(o.w||0),air=o.air||0,u=o.u||0,p=o.pitch||0,rc=o.rec||0,t=o.t||0,ld=o.land||0,hp=BN.Hips_01;
if(o.idle){/* relaxed lobby stance: weight shift, breathing, slow head look, arms slightly bent */
const br=Math.sin(t*1.9),sh=Math.sin(t*.7),lk=Math.sin(t*.45);
rot('Hips_01',[[Z,sh*.03],[Y,lk*.06]]);hp.b.position.y=hp.bp.y-.012+br*.002;
rot('Spine_00',[[Z,-sh*.02],[X,.03]]);rot('Spine1_02',[[X,br*.016],[Z,-sh*.015]]);rot('Spine2_03',[[X,br*.02],[Y,-lk*.05]]);
rot('Neck_04',[[X,-.04],[Y,lk*.1]]);rot('Head_05',[[Y,lk*.16],[X,Math.sin(t*.3)*.04-.02]]);
rot('LeftShoulder_07',[[Z,-.04+br*.01]]);rot('RightShoulder_023',[[Z,.04-br*.01]]);
rot('LeftArm_08',[[Z,-1.27],[Y,.2],[X,.05]]);rot('RightArm_024',[[Z,1.27],[Y,-.2],[X,.05]]);
rot('LeftForeArm_09',[[Y,-.42+br*.02]]);rot('RightForeArm_025',[[Y,.42-br*.02]]);
rot('LeftHand_010',[[Z,.1]]);rot('RightHand_026',[[Z,-.1]]);
const ls=Math.max(0,sh);rot('LeftUpLeg_039',[[Z,.07+ls*.02],[X,-.04]]);rot('RightUpLeg_044',[[Z,-.07-Math.max(0,-sh)*.02],[X,.02]]);
rot('LeftLeg_040',[[X,.06+ls*.08]]);rot('RightLeg_045',[[X,.04+Math.max(0,-sh)*.08]]);rot('LeftFoot_041',[[X,-.08]]);rot('RightFoot_046',[[X,-.05]]);
curl('Left',.35);curl('Right',.35);return}
/* ---- legs: run cycle blended with a continuous jump pose (rise -> apex -> fall) and a landing crouch ---- */
const swg=.8*k,gtl=-s*swg,gtr=s*swg,gkl=.95*k*Math.max(0,c),gkr=.95*k*Math.max(0,-c);
const atl=-.625-.325*u,atr=.075-.225*u,akl=.75+.25*u,akr=.375+.175*u;
let tl=gtl+(atl-gtl)*air,tr=gtr+(atr-gtr)*air,kl=gkl+(akl-gkl)*air,kr=gkr+(akr-gkr)*air;
const e=Math.sin(Math.min(1,ld)*Math.PI*.5);tl-=.55*e;tr-=.55*e;kl+=.95*e;kr+=.95*e;
const idle=Math.max(0,1-Math.min(1,k*1.5)-air),sh=Math.sin(t*.7)*idle;
rot('LeftUpLeg_039',[[X,tl],[Z,.04*(1-k)+air*.05]]);rot('RightUpLeg_044',[[X,tr],[Z,-.04*(1-k)-air*.05]]);rot('LeftLeg_040',[[X,kl]]);rot('RightLeg_045',[[X,kr]]);
rot('LeftFoot_041',[[X,-(tl+kl)*.8]]);rot('RightFoot_046',[[X,-(tr+kr)*.8]]);
hp.b.position.y=hp.bp.y+Math.abs(s)*.022*k*(1-air)+air*(.003+.022*u)-ld*.1*e;
const gun=o.gun==null?1:o.gun,sw=o.swing==null?-1:o.swing,base=.3;let ang=-base,tw=0,sx=0;
if((gun<0||gun==PICK)&&sw>=0){if(sw<.32){const f=ease(sw/.32);ang=mixv(-base,-2.7,f);tw=-.25*f}else if(sw<.55){const f=ease((sw-.32)/.23);ang=mixv(-2.7,-.05,f);tw=mixv(-.25,.35,f);sx=.22*f}else{const f=ease((sw-.55)/.45);ang=mixv(-.05,-base,f);tw=mixv(.35,0,f);sx=.22*(1-f)}}
const A=o.ads||0,F=o.fire||0,PM=o.pump||0,RE=o.rle||0,RP=o.rlp==null?-1:o.rlp,DW=o.dw||0,SPR=(o.spr||0)*(1-A),sg=gun==0,gh=gun>=0&&gun!=PICK,fk=gh?F:0;
const lean=.07+.1*k+rc*.08+ld*.12+air*Math.max(0,-u)*.05+(gh?SPR*.1+A*.04+RE*.06:0),br=Math.sin(t*1.9)*.012;
rot('Hips_01',[[Z,sh*.025],[Y,s*.1*k]]);
rot('Spine_00',[[X,lean*.5],[Y,-s*.1*k]]);rot('Spine1_02',[[X,lean*.5+br],[Z,-sh*.02],[Y,tw*.5]]);rot('Spine2_03',[[X,lean*.3-p*.25+sx-fk*(sg?.075:.022)],[Y,s*.07*k+tw*.5-(gh?A*.1:0)]]);rot('Neck_04',[[X,-p*.25-lean*.4]]);rot('Head_05',[[X,-p*.3+fk*.03],[Y,Math.sin(t*.4)*.05*idle]]);
if(gun<0||gun==PICK){/* pickaxe / builder: fist at the hip height, pick held upright (like Fortnite), left arm swings with the run */
const rb=Math.sin(t*1.9)*.02;
rot('RightArm_024',[[Z,1.15],[Y,-.05],[X,ang+rb]]);rot('RightForeArm_025',[[Y,1.25+(sw>=0&&sw<.32?.25:0)]]);rot('RightHand_026',[[Z,-.1]]);
const la=tr*.75;rot('LeftArm_08',[[Z,-1.25],[Y,.12],[X,la]]);rot('LeftForeArm_09',[[Y,-.4-Math.max(0,-la)*.5]]);rot('LeftHand_010',[[Z,.1]]);
curl('Right',1.15);curl('Left',.5);return}
/* two-handed gun hold. ap = both arms' pitch: aim + kick (muzzle climb) + sprint low-ready + draw + reload lowering */
const ap=-(p+rc*.2)-fk*(sg?.3:.075)+SPR*.85+DW*.85+RE*(sg?.5:.6)+Math.sin(t*1.7)*.005*(1-A);
const bump=RP>0?Math.exp(-Math.pow((RP-(sg?.45:.58))/.07,2)):0,ins=sg&&RP>0?.5-.5*Math.cos(RP*Math.PI*10):0,lap=ap+RE*(sg?.1:.5)-bump*.35+ins*RE*.35;
/* IK targets for the gun hold (see ikRun): aim pitch + muzzle climb + sprint/draw/reload lowering; ADS brings the gun up and in; the left palm slides for pump / reload */
{const Ae=A*A*(3-2*A),bob=(1-A)*k*(1-air);IKP={P:p+rc*.1+fk*(sg?.3:.075)-SPR*.7-DW*.85-RE*(sg?.35:.45)+Math.sin(t*1.7)*.004*(1-A),
ox:.15-.03*Ae+SPR*.02+c*.01*bob,oy:-.18+.09*Ae-SPR*.12-DW*.15-RE*.03+Math.abs(s)*.012*bob,oz:-(.17+.05*Ae-fk*(sg?.07:.035)-SPR*.05),
lx:0,ly:-.035-RE*(sg?.05:.19)-ins*RE*.06,lz:.32-RE*(sg?.2:.18)-PM*.17-bump*.04};IKL=IKP}

rot('RightArm_024',[[Y,Math.PI/2*.97],[X,ap]]);rot('RightForeArm_025',[[Y,.38+A*.26+fk*.1+SPR*.3]]);rot('RightHand_026',[[Y,.12]]);
rot('LeftArm_08',[[Y,-Math.PI/2*.97],[X,lap]]);rot('LeftForeArm_09',[[Y,-1.05-A*.1-PM*.38-RE*(sg?.2:.5)-DW*.25+SPR*.25]]);rot('LeftHand_010',[[Y,-.2]]);curl('Right',.8);curl('Left',.8)}
/* smoothing layer: every bone eases toward its target pose so jump -> fall, weapon swaps, swings never snap */
const st={air:0,u:0,ld:0,init:0,hy:0,ads:0,spr:0,rle:0,fk:0,ikw:0},sq=ALL.map(r=>r.b.quaternion.clone());
function pose(o,dt){const sa=1-Math.exp(-dt*14);st.air+=((o.air?1:0)-st.air)*sa;st.u+=(Math.max(-1,Math.min(1,(o.vy||0)/9))-st.u)*(1-Math.exp(-dt*10));
st.fk+=((o.fire||0)-st.fk)*(1-Math.exp(-dt*((o.fire||0)>st.fk?45:14)));st.ikw+=((IKP?1:0)-st.ikw)*(1-Math.exp(-dt*12));
const lt=o.land||0;st.ld+=(lt-st.ld)*(1-Math.exp(-dt*(lt>st.ld?30:8)));
st.ads+=((o.ads||0)-st.ads)*(1-Math.exp(-dt*13));st.spr+=((o.spr||0)-st.spr)*(1-Math.exp(-dt*9));
const rp=o.rl==null?-1:o.rl,re=rp<0?0:Math.min(1,rp/.12)*Math.min(1,(1-rp)/.12);st.rle+=(re-st.rle)*(1-Math.exp(-dt*(re>st.rle?18:10)));
poseT(Object.assign({},o,{air:o.idle?0:st.air,u:st.u,land:st.ld,ads:st.ads,spr:st.spr,rle:st.rle,rlp:rp,fire:st.fk,dw:o.draw==null?0:1-ease(Math.max(0,Math.min(1,o.draw)))}));
const a=st.init?1-Math.exp(-dt*((o.swing||-1)>=0||(o.fire||0)>.04?40:24)):1;
ALL.forEach((r,i)=>{if(st.init)sq[i].slerp(r.b.quaternion,a);else sq[i].copy(r.b.quaternion);r.b.quaternion.copy(sq[i])});
const hb=BN.Hips_01.b;st.hy=st.init?st.hy+(hb.position.y-st.hy)*a:hb.position.y;hb.position.y=st.hy;st.init=1;if(IKL&&st.ikw>.002)ikRun(st.ikw,IKL)}
function flashUpd(dt){const cur=gi>=0?guns[gi]:null,f=cur&&cur.userData.fl;guns.forEach(x=>{const y=x.userData.fl;if(y&&y!==f)y.visible=false});if(!f)return;if(flT>0){flT-=dt;f.visible=true;f.rotation.z=Math.random()*6.283;const s=.75+Math.random()*.5;f.scale.set(s,s,s)}else f.visible=false}
return{g,mat,pose,setGun,flash(){if(FLASH)flT=.055},
kick(){ac.reset();ac.paused=false;ac.play();kT=G.clip.duration},kicking:()=>kT>0,
update(dt,o){cT+=dt;flashUpd(dt);cs&&cs.upd&&cs.upd(cT,dt,o||{});if(kT>0){kT-=dt;mx.update(dt);st.init=0;if(kT<=0){ac.stop()}return}pose(o,dt)},
muzzle(v){g.updateMatrixWorld(true);return guns[Math.max(0,gi)].userData.mz.getWorldPosition(v||new T.Vector3())}}}

/* minimal stand-in only used if js/skin.js failed to load */
function fallbackRig(col){col=col%16777216;const g=new T.Group();g.rotation.order='YXZ';const m=new T.MeshStandardMaterial({color:col,roughness:.6});
const b=new T.Mesh(new T.BoxGeometry(.6,1.5,.4),m);b.position.y=.95;b.castShadow=true;g.add(b);
return{g,mat:m,pose(){},setGun(){},flash(){},kick(){},kicking:()=>false,update(){},muzzle(v){return(v||new T.Vector3()).set(g.position.x,g.position.y+1.4,g.position.z)}}}
function char(col){return rig(col)||fallbackRig(col)}
function rs(){R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
function tag(t,col){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='bold 36px sans-serif';x.textAlign='center';x.fillStyle=col||'#fff';x.strokeStyle='#000';x.lineWidth=6;x.strokeText(t,128,44);x.fillText(t,128,44);
const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false}));s.scale.set(2,.5,1);s.position.y=2.4;return s}
function rayBox(o,d,b){let t0=0,t1=1e9,a,c,q;
const hw=b.w/2,hd=b.d/2;
if(Math.abs(d.x)<1e-8){if(o.x<b.x-hw||o.x>b.x+hw)return 1e9}else{a=(b.x-hw-o.x)/d.x;c=(b.x+hw-o.x)/d.x;if(a>c){q=a;a=c;c=q}if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)return 1e9}
const y0=b.y0||0;
if(Math.abs(d.y)<1e-8){if(o.y<y0||o.y>b.h)return 1e9}else{a=(y0-o.y)/d.y;c=(b.h-o.y)/d.y;if(a>c){q=a;a=c;c=q}if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)return 1e9}
if(Math.abs(d.z)<1e-8){if(o.z<b.z-hd||o.z>b.z+hd)return 1e9}else{a=(b.z-hd-o.z)/d.z;c=(b.z+hd-o.z)/d.z;if(a>c){q=a;a=c;c=q}if(a>t0)t0=a;if(c<t1)t1=c;if(t0>t1)return 1e9}
return t0}
function raySph(o,d,c,r){const x=c.clone().sub(o),t=x.dot(d);if(t<0&&x.lengthSq()>r*r)return 1e9;const q=x.lengthSq()-t*t;return q>r*r?1e9:Math.max(0,t-Math.sqrt(r*r-q))}
/* ray vs capsule (segment a-b, radius r) -> distance or 1e9 */
function rayCap(o,d,a,b,r){const ba=b.clone().sub(a),oa=o.clone().sub(a),baba=ba.dot(ba),bard=ba.dot(d),baoa=ba.dot(oa),rdoa=d.dot(oa),oaoa=oa.dot(oa);
const A=baba-bard*bard;let best=1e9;
if(A>1e-8){const Bq=baba*rdoa-baoa*bard,C=baba*oaoa-baoa*baoa-r*r*baba,h=Bq*Bq-A*C;if(h>=0){const t=(-Bq-Math.sqrt(h))/A,y=baoa+t*bard;if(y>0&&y<baba&&t>0)best=t}}
for(const e of[a,b]){const t=raySph(o,d,e,r);if(t<best)best=t}return best}
const TOL=.34;
/* solid collision: map boxes use a .45 body radius, build pieces .32 so doorways/edited holes are walkable. Stairs are a thin sloped slab (rampH). */
const hits=p=>B.some(b=>{if(b.ray||p.y>=b.h-TOL||p.y+1.8<=(b.y0||0)+.05)return false;const m=b.bid?BM:.45;return Math.abs(p.x-b.x)<b.w/2+m&&Math.abs(p.z-b.z)<b.d/2+m})||RPL.some(r=>{const h=rampH(r,p,.4);return h!=null&&h-p.y>.45&&p.y+1.8>h-.3});
const headHit=(p,vy,dt)=>B.some(b=>!b.ray&&(b.y0||0)>p.y+1.2&&Math.abs(p.x-b.x)<b.w/2+.3&&Math.abs(p.z-b.z)<b.d/2+.3&&p.y+1.8+vy*dt>b.y0)||RPL.some(r=>{const h=rampH(r,p,.3);return h!=null&&p.y+1.2<h-.3&&p.y+1.8+vy*dt>h-.3});
/* ground height under p; yr = reference feet height (previous frame) so fast falls can't tunnel through thin floors */
const gnd=(p,yr=p.y)=>{let h=0;B.forEach(b=>{if(!b.ray&&yr>=b.h-TOL&&Math.abs(p.x-b.x)<b.w/2+.3&&Math.abs(p.z-b.z)<b.d/2+.3)h=Math.max(h,b.h)});RPL.forEach(r=>{const y=rampH(r,p,.3);if(y!=null&&yr>=y-.5)h=Math.max(h,y)});return h};
const dirv=()=>new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
const castRay=(o,d,mx=120,solid)=>{let L=mx,id=null;B.forEach(b=>{if(solid&&b.ray)return;const t=rayBox(o,d,b);if(t<L){L=t;id=b.bid||null}});return{L,id}};
const wallDist=(o,d,mx=120)=>castRay(o,d,mx).L;
const r3=x=>Math.round(x*1000)/1000;
/* effect meshes are pooled (a new material per spark/tracer/shell made every shot allocate + re-hash shader state = little freezes) */
const FXP=new Map();
function fxMk(geo,col){let a=FXP.get(geo),m=a&&a.pop();if(!m){m=new T.Mesh(geo,new T.MeshBasicMaterial({color:col,transparent:true}));m.frustumCulled=false}else m.material.color.setHex(col);m.material.opacity=1;m.scale.set(1,1,1);m.rotation.set(0,0,0);m.userData.geo=geo;return m}
function fxFree(m){sc.remove(m);const g=m.userData.geo;if(!g)return;let a=FXP.get(g);if(!a)FXP.set(g,a=[]);if(a.length<160)a.push(m)}
function tracer(a,b,col=0xfff2a0,th=.04){const L=a.distanceTo(b);if(L<.05)return;const m=fxMk(UBOX,col);m.scale.set(th,th,L);m.position.copy(a).lerp(b,.5);m.lookAt(b);sc.add(m);FX.push({m,life:.12,fade:1,sh:1})}
function sparks(p,col=0xff4d6d,n=10){n=Qs.fx>0?Math.max(2,Math.round(n*Qs.fx)):0;for(let i=0;i<n;i++){const m=fxMk(SPG,col);m.position.copy(p);sc.add(m);FX.push({m,v:new T.Vector3(Math.random()-.5,Math.random()*.8,Math.random()-.5).multiplyScalar(7),life:.6,g:1,sh:1})}}
/* ejected shell casing (rt = unit vector pointing out of the gun's right side) */
function casing(o,rt){if(!Qs.cas)return;const m=fxMk(SHG,0xd9a43b);m.position.copy(o);m.rotation.set(Math.random()*6,Math.random()*6,0);sc.add(m);
FX.push({m,v:new T.Vector3(rt.x*(1.6+Math.random()),2+Math.random()*1.5,rt.z*(1.6+Math.random())),life:.9,g:1,floor:1,spin:(Math.random()-.5)*18})}
function msg(t,cls){const e=$('#msg');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
function feed(t){const d=document.createElement('div');d.textContent=t;$('#feed').appendChild(d);setTimeout(()=>d.remove(),4000)}

/* ================= HITBOXES (feet position p; matches the 1.9u tall model) ================= */
const HB={head:[1.76,.18],torso:[[.97,1.34],.27],legs:[[.12,.88],.2]};
function hitZone(o,d,p,yw){
const th=raySph(o,d,new T.Vector3(p.x,p.y+HB.head[0],p.z),HB.head[1]);
const tt=rayCap(o,d,new T.Vector3(p.x,p.y+HB.torso[0][0],p.z),new T.Vector3(p.x,p.y+HB.torso[0][1],p.z),HB.torso[1]);
const tl=rayCap(o,d,new T.Vector3(p.x,p.y+HB.legs[0][0],p.z),new T.Vector3(p.x,p.y+HB.legs[0][1],p.z),HB.legs[1]);
/* gun arms stick out in front of the chest */
const fx=-Math.sin(yw),fz=-Math.cos(yw),ta=rayCap(o,d,new T.Vector3(p.x,p.y+1.38,p.z),new T.Vector3(p.x+fx*.6,p.y+1.38,p.z+fz*.6),.13);
const tb=Math.min(tt,ta);
if(th<1e9&&th<=tb+.12)return{t:th,z:'head'};
if(tb<1e9&&tb<=tl)return{t:tb,z:'body'};
if(tl<1e9)return{t:tl,z:'legs'};return null}

/* ================= BUILDING (Fortnite style) =================
   Z wall · X floor · C stairs · V roof — ghost preview, click (or hold) to place, RIGHT-CLICK cycles material (wood/brick/metal).
   Pieces build up over ~0.45s (blueprint -> solid, HP ramps up). G edits your wall/floor: aim, click/drag cells to cut, G again to confirm.
   Grid: 4u cells, 3u levels. Ramps use a real sloped surface for movement (stepped boxes for bullets). */
const GRID=5,LVL=3.6,ROW=LVL/3,COST=10,CELL=GRID/3,BUILD_T=450,BM=.32,NST=10,ROTY=[Math.PI,Math.PI/2,0,-Math.PI/2];
const MT=[{n:'WOOD',c:0xc98f55,hp:150,ic:'🪵'},{n:'BRICK',c:0xc4584b,hp:300,ic:'🧱'},{n:'METAL',c:0x9db3c9,hp:450,ic:'🔩'}];
const BPIECE={wall:{f:1,n:'WALL'},floor:{f:.93,n:'FLOOR'},ramp:{f:1,n:'STAIRS'},roof:{f:.8,n:'ROOF'}};
const BLD={},RPL=[],TW=[];let BG,GH,bseq=0,bcool=0,buildT=null,mat=[500,300,200],msel=0,visY=0,EDIT=null,EG=null,shSm=.9,camDs=4.2;
const prog=b=>Math.min(1,(performance.now()-b.born)/BUILD_T),hpNow=b=>b.max*(.25+.75*prog(b))-b.dmg;
const rampH=(r,p,m)=>{const a=(p.x-r.x)*r.dx+(p.z-r.z)*r.dz,c=Math.abs((p.x-r.x)*r.dz-(p.z-r.z)*r.dx);return c<GRID/2+m&&a>-GRID/2-m&&a<GRID/2+m?r.y0+LVL*Math.max(0,Math.min(1,(a+GRID/2)/GRID)):null};
function bKey(t,x,y,z,r){return t+'|'+Math.round(x*2)+'|'+Math.round(y*2)+'|'+Math.round(z*2)+'|'+r}
let RG;const roofGeo=()=>RG||(RG=(()=>{const g=new T.ConeGeometry(GRID*.7071,1.8,4);g.rotateY(Math.PI/4);g.translate(0,.9,0);g.userData.keep=1;return g})());
const GC={},gb=(w,h,d)=>{const k=[w,h,d].map(v=>Math.round(v*1000)).join('|');if(!GC[k]){const q=new T.BoxGeometry(w,h,d);q.userData.keep=1;GC[k]=q}return GC[k]};
const edgesOf=q=>q.userData.eg||(q.userData.eg=(()=>{const e=new T.EdgesGeometry(q,25);e.userData.keep=1;return e})());
const centerOf=(t,x,y,z)=>t=='wall'?[x,y+LVL/2,z]:t=='floor'?[x,y-.15,z]:[x,y,z];
/* mask: bit set = cell removed (wall idx=row*3+col, floor idx=row*3+col) */
function pieceBoxes(t,x,y,z,r,mask){mask=mask|0;
if(t=='wall'){if(!mask)return[r?{x,z,w:.3,d:GRID,y0:y,h:y+LVL}:{x,z,w:GRID,d:.3,y0:y,h:y+LVL}];const o=[];
for(let j=0;j<3;j++)for(let i=0;i<3;i++){if(mask>>(j*3+i)&1)continue;const off=(i-1)*CELL;o.push(r?{x,z:z+off,w:.3,d:CELL,y0:y+j*ROW,h:y+(j+1)*ROW}:{x:x+off,z,w:CELL,d:.3,y0:y+j*ROW,h:y+(j+1)*ROW})}return o}
if(t=='floor'){if(!mask)return[{x,z,w:GRID,d:GRID,y0:y-.3,h:y}];const o=[];
for(let k=0;k<3;k++)for(let i=0;i<3;i++){if(mask>>(k*3+i)&1)continue;o.push({x:x+(i-1)*CELL,z:z+(k-1)*CELL,w:CELL,d:CELL,y0:y-.3,h:y})}return o}
if(t=='roof')return[[GRID,.6],[GRID*.66,1.2],[GRID*.33,1.8]].map(([w,h])=>({x,z,w,d:w,y0:y,h:y+h}));
/* stairs: thin treads in a straight line up (bullets only; walking uses the sloped surface in RPL) */
const dx=[0,1,0,-1][r],dz=[-1,0,1,0][r],L=GRID/NST,out=[];for(let k=0;k<NST;k++){const o=-GRID/2+L/2+k*L,top=y+(k+1)*LVL/NST;out.push({x:x+dx*o,z:z+dz*o,w:dx?L:GRID,d:dx?GRID:L,y0:top-.25,h:top,ray:1})}return out}
function makePiece(b){const{t,x,y,z,r}=b,boxes=pieceBoxes(t,x,y,z,r,b.mask);boxes.forEach(bx=>{bx.bid=b.id;B.push(bx)});b.boxes=boxes;
const g=new T.Group(),c=centerOf(t,x,y,z),lm=new T.LineBasicMaterial({color:b.ally?0x16306b:0x6b1616});g.position.set(c[0],c[1],c[2]);
const add=(geo,px,py,pz,ry)=>{const m=new T.Mesh(geo,b.mat);m.position.set(px,py,pz);if(ry)m.rotation.y=ry;m.castShadow=true;m.add(new T.LineSegments(edgesOf(geo),lm));g.add(m)};
if(t=='ramp'){g.rotation.y=ROTY[r];const L=GRID/NST,len=Math.hypot(GRID,LVL),an=-Math.atan2(LVL,GRID);
for(let k=0;k<NST;k++)add(gb(GRID,.25,L+.02),0,(k+1)*LVL/NST-.125,-GRID/2+L/2+k*L,0);
[-1,1].forEach(sx=>{const m=new T.Mesh(gb(.22,.36,len),b.mat);m.position.set(sx*(GRID/2-.11),LVL/2-.2,0);m.rotation.x=an;m.castShadow=true;m.add(new T.LineSegments(edgesOf(m.geometry),lm));g.add(m)})}
else if(t=='roof')add(roofGeo(),0,0,0,0);
else boxes.forEach(bx=>add(gb(bx.w,bx.h-bx.y0,bx.d),bx.x-c[0],(bx.y0+bx.h)/2-c[1],bx.z-c[2],0));
b.g=g;b.lm=lm;BG.add(g)}
function dropParts(b){b.boxes.forEach(x=>{const i=B.indexOf(x);if(i>=0)B.splice(i,1)});if(BG)BG.remove(b.g)}
function addBuild(id,t,x,y,z,r,own,mt,mask,ally){if(ally===undefined)ally=own;if(BLD[id])return false;const key=bKey(t,x,y,z,r);for(const k in BLD)if(BLD[k].key==key){if(id<k&&!own)removeBuild(k,true);else return false}
if(!BG){BG=new T.Group();sc.add(BG)}
const M=MT[mt|0]||MT[0],mat0=new T.MeshStandardMaterial({color:M.c,roughness:.85,flatShading:true,transparent:true,opacity:.4,emissive:ally?0x2a6bff:0xff3b3b,emissiveIntensity:.9});
const b={id,key,t,x,y,z,r,mask:mask|0,mt:mt|0,own,ally,born:performance.now(),dmg:0,max:Math.round(M.hp*BPIECE[t].f),mat:mat0,col:M.c,done:0};BLD[id]=b;makePiece(b);
b.g.scale.setScalar(.82);TW.push({m:b.g,t:0});if(t=='ramp'){b.rp={id,x,z,dx:[0,1,0,-1][r],dz:[-1,0,1,0][r],y0:y};RPL.push(b.rp)}return true}
function removeBuild(id,quiet){const b=BLD[id];if(!b)return;dropParts(b);if(b.rp){const i=RPL.indexOf(b.rp);if(i>=0)RPL.splice(i,1)}const i=TW.findIndex(x=>x.m===b.g);if(i>=0)TW.splice(i,1);
delete BLD[id];if(!quiet)sparks(new T.Vector3(b.x,b.y+1.2,b.z),b.ally?0x7cc0ff:0xff9a9a,14)}
function clearBuilds(){for(const id in BLD)removeBuild(id,true)}
function damageBuild(id,d){const b=BLD[id];if(!b)return;b.dmg+=d;const h=hpNow(b);if(h<=0){removeBuild(id);return}b.mat.color.setHex(b.col);b.mat.color.multiplyScalar(.5+.5*Math.max(0,h)/b.max)}
function buildUpdate(){const now=performance.now();for(const id in BLD){const b=BLD[id];if(b.done)continue;const p=prog(b);b.mat.opacity=.4+.6*p;b.mat.emissiveIntensity=.9*(1-p);
if(p>=1){b.done=1;b.mat.transparent=false;b.mat.opacity=1;b.mat.emissiveIntensity=0;b.mat.needsUpdate=true}}}
function applyEdit(b,mask){if(!b||b.mask==mask)return;dropParts(b);b.mask=mask;makePiece(b)}
function cardinal(){const fx=-Math.sin(yaw),fz=-Math.cos(yaw);return Math.abs(fx)>Math.abs(fz)?(fx>0?[1,0,1]:[-1,0,3]):(fz>0?[0,1,2]:[0,-1,0])}
/* Fortnite-style placement: everything snaps to the tile the player is standing in. Walls go on that tile's edge in the facing direction,
   stairs/floors/roofs go on the tile in front. Level comes from your feet height. If a piece lands on someone they are pushed out (unstick). */
function pieceSpot(t){const[dx,dz,rr]=cardinal(),L=Math.max(0,Math.floor((P.y+.6)/LVL)),yb=L*LVL,cx=Math.round(P.x/GRID)*GRID,cz=Math.round(P.z/GRID)*GRID;
if(t=='wall')return dx?{x:cx+dx*GRID/2,y:yb,z:cz,r:1}:{x:cx,y:yb,z:cz+dz*GRID/2,r:0};
if(t=='floor'||t=='roof')return{x:cx+dx*GRID,y:Math.max(L,1)*LVL,z:cz+dz*GRID,r:0};
return{x:cx+dx*GRID,y:yb,z:cz+dz*GRID,r:rr}}
function findSpot(t){const sp1=pieceSpot(t),boxes=pieceBoxes(t,sp1.x,sp1.y,sp1.z,sp1.r,0),key=bKey(t,sp1.x,sp1.y,sp1.z,sp1.r);
sp1.dup=Object.values(BLD).some(b=>b.key==key);sp1.oob=boxes.some(b=>Math.abs(b.x)+b.w/2>31||Math.abs(b.z)+b.d/2>31);sp1.bad=sp1.dup||sp1.oob;return sp1}
function place(t){const n=performance.now();if(phase!='live'||S.dead||n<bcool)return;bcool=n+110;
if(mat[msel]<COST){SFX.empty();shake+=.04;if(!S.noMat||n-S.noMat>1500){S.noMat=n;feed('Out of '+MT[msel].n.toLowerCase()+' — press '+CTL.first('mat')+' to switch material')}return}
const sp1=findSpot(t);if(sp1.bad){if(!sp1.dup)SFX.empty();return}
const mine=Object.keys(BLD).filter(k=>BLD[k].own);if(mine.length>=50)removeBuild(mine[0],true);
const id=uid.slice(-4)+'_'+rd+'_'+(bseq++);if(!addBuild(id,t,sp1.x,sp1.y,sp1.z,sp1.r,true,msel,0))return;mat[msel]-=COST;SFX.swap();hud();
shRef.push({by:uid,k:'b',id,t,x:r3(sp1.x),y:r3(sp1.y),z:r3(sp1.z),r:sp1.r,m:msel,rd})}
function cycleMat(){if(!run)return;msel=(msel+1)%3;SFX.tick();hud()}
function setBuild(t){if(S.dead||phase=='over'||phase=='ended')return;if(EDIT)exitEdit();if(buildT==t){exitBuild();return}clearTimeout(S.rlT);S.rl=0;buildT=t;S.lat=0;me.setGun(-1);SFX.swap();ghostShow();hud();send()}
function exitBuild(){if(!buildT)return;buildT=null;if(GH)GH.visible=false;if(!EDIT)me.setGun(S.w);hud();send()}
const GHM={};
function stairsGhost(m0){const g=new T.Group(),L=GRID/NST;for(let k=0;k<NST;k++){const m=new T.Mesh(new T.BoxGeometry(GRID,.25,L),m0);m.position.set(0,(k+1)*LVL/NST-.125,-GRID/2+L/2+k*L);g.add(m)}return g}
function ghostInit(){if(GH)return;GH=new T.Group();GH.visible=false;sc.add(GH);const m0=new T.MeshBasicMaterial({color:0x66b3ff,transparent:true,opacity:.42,depthWrite:false});GH.userData.mat=m0;
GHM.wall=new T.Mesh(new T.BoxGeometry(1,1,1),m0);GHM.floor=new T.Mesh(new T.BoxGeometry(1,1,1),m0);GHM.ramp=stairsGhost(m0);GHM.roof=new T.Mesh(roofGeo(),m0);for(const k in GHM){GHM[k].visible=false;GH.add(GHM[k])}}
function ghostShow(){ghostInit();GH.visible=true}
function ghostUpdate(){if(!buildT||!GH)return;const t=buildT,sp1=findSpot(t),m=GHM[t];for(const k in GHM)GHM[k].visible=k==t;
if(t=='wall'){m.position.set(sp1.x,sp1.y+LVL/2,sp1.z);m.scale.set(sp1.r?.3:GRID,LVL,sp1.r?GRID:.3)}
else if(t=='floor'){m.position.set(sp1.x,sp1.y-.15,sp1.z);m.scale.set(GRID,.3,GRID)}
else if(t=='ramp'){m.position.set(sp1.x,sp1.y,sp1.z);m.rotation.y=ROTY[sp1.r]}
else{m.position.set(sp1.x,sp1.y,sp1.z)}
GH.userData.mat.color.setHex(sp1.bad||mat[msel]<COST?0xff5c5c:0x66b3ff)}


/* ---- EDIT MODE: 3x3 cells on a wall/floor you own ---- */
function editInit(){if(EG)return;EG=new T.Group();EG.visible=false;sc.add(EG);EG.userData.cells=[];for(let i=0;i<9;i++){const m=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0x66b3ff,transparent:true,opacity:.25,depthWrite:false}));EG.add(m);EG.userData.cells.push(m)}}
function editLayout(b){EG.userData.cells.forEach((m,idx)=>{const i=idx%3,j=Math.floor(idx/3);
if(b.t=='wall'){const off=(i-1)*CELL;m.position.set(b.r?b.x:b.x+off,b.y+(j+.5)*ROW,b.r?b.z+off:b.z);m.scale.set(b.r?.55:CELL*.94,ROW*.94,b.r?CELL*.94:.55)}
else{m.position.set(b.x+(i-1)*CELL,b.y-.15,b.z+(j-1)*CELL);m.scale.set(CELL*.94,.55,CELL*.94)}})}
function startEdit(){if(EDIT||S.dead||phase!='live')return;const d=dirv(),o=camP.clone().addScaledVector(d,camD+.3),c=castRay(o,d,10),b=c.id&&BLD[c.id];
if(!b||!b.own||(b.t!='wall'&&b.t!='floor')||prog(b)<1){feed('Aim at one of your walls or floors to edit');return}
if(buildT){buildT=null;if(GH)GH.visible=false}clearTimeout(S.rlT);S.rl=0;editInit();EDIT={b,mask:b.mask,orig:b.mask,hover:-1,paint:null,last:-1};me.setGun(-1);editLayout(b);EG.visible=true;SFX.swap();hud();send();
msg('EDIT: click cells · '+CTL.first('edit')+' confirm · '+CTL.first('aim')+' reset')}
function exitEdit(){if(!EDIT)return;EDIT=null;if(EG)EG.visible=false;if(!buildT)me.setGun(S.w);hud();send()}
function confirmEdit(){if(!EDIT)return;const{b,mask}=EDIT;if(mask!=b.mask&&mask!=511&&BLD[b.id]){applyEdit(b,mask);shRef.push({by:uid,k:'e',id:b.id,mk:mask});SFX.swap()}else if(mask==511)feed("Can't remove every cell");exitEdit()}
function editPick(b){const d=dirv();let t,hx,hz,hy;
if(b.t=='wall'){if(!b.r){if(Math.abs(d.z)<1e-4)return-1;t=(b.z-camP.z)/d.z}else{if(Math.abs(d.x)<1e-4)return-1;t=(b.x-camP.x)/d.x}}else{if(Math.abs(d.y)<1e-4)return-1;t=(b.y-camP.y)/d.y}
if(t<=0||t>16)return-1;hx=camP.x+d.x*t;hy=camP.y+d.y*t;hz=camP.z+d.z*t;
if(b.t=='wall'){const u=b.r?hz-b.z:hx-b.x,v=hy-b.y;if(Math.abs(u)>=GRID/2||v<0||v>=LVL)return-1;return Math.floor(v/ROW)*3+Math.floor((u+GRID/2)/CELL)}
const u=hx-b.x,w=hz-b.z;if(Math.abs(u)>=GRID/2||Math.abs(w)>=GRID/2)return-1;return Math.floor((w+GRID/2)/CELL)*3+Math.floor((u+GRID/2)/CELL)}
function editUpdate(){if(!EDIT)return;if(!BLD[EDIT.b.id]||phase!='live'||S.dead){exitEdit();return}
EDIT.hover=editPick(EDIT.b);
if(K.shoot){if(EDIT.hover>=0&&EDIT.hover!=EDIT.last){if(EDIT.paint===null)EDIT.paint=(EDIT.mask>>EDIT.hover&1)?0:1;EDIT.mask=EDIT.paint?EDIT.mask|1<<EDIT.hover:EDIT.mask&~(1<<EDIT.hover);EDIT.last=EDIT.hover;SFX.tick()}}else{EDIT.paint=null;EDIT.last=-1}
EG.userData.cells.forEach((m,i)=>{const rem=EDIT.mask>>i&1,hv=i==EDIT.hover;m.material.color.setHex(rem?0xff5c5c:hv?0xffffff:0x66b3ff);m.material.opacity=rem?.6:hv?.5:.22})}
/* if a (remote) piece lands on top of us, push the player to the nearest free spot instead of leaving them stuck */
function unstick(){if(!hits(P))return;const bx=P.x,by=P.y,bz=P.z;
for(let r=.3;r<=3.2;r+=.3)for(let a=0;a<16;a++){const x=bx+Math.cos(a*.3927)*r,z=bz+Math.sin(a*.3927)*r;if(Math.abs(x)>29||Math.abs(z)>29)continue;P.set(x,by,z);if(!hits(P)){return}}
for(let h=.4;h<=7;h+=.4){P.set(bx,by+h,bz);if(!hits(P)){S.vy=0;return}}P.set(bx,by,bz)}

/* ================= WEAPON STATE ================= */
let WS=[];
const curW=()=>WEAPONS[S.w],curS=()=>WS[S.w];
function selectW(i){if(S.dead||phase=='over'||phase=='ended')return;if(EDIT){exitEdit();if(i==S.w)return}if(buildT){exitBuild();if(i==S.w)return}if(i==S.w)return;clearTimeout(S.rlT);S.rl=0;S.w=i;S.eq=performance.now()+260;S.lat=0;me.setGun(i);SFX.swap();hud()}
let wsN=null,bsN=null,matsK='';
function hud(){const w=curW(),st=curS();$('#hp').style.width=Math.max(0,S.hp)+'%';$('#hpt').textContent=Math.max(0,Math.ceil(S.hp));
const a=$('#ammo');$('#am').textContent=w.melee?'⛏':S.rl?'…':st.mag;$('#amr').textContent=w.melee?'':'/'+st.res;$('#wnm').textContent=w.n;a.className=!w.melee&&st.mag<=Math.ceil(w.mag*.25)?'low':'';
if(!wsN){wsN=[...document.querySelectorAll('#wbar .ws')];bsN=[...document.querySelectorAll('#bq .bs')]}
wsN.forEach((e,i)=>e.classList.toggle('on',!buildT&&i==S.w));bsN.forEach(e=>e.classList.toggle('on',e.dataset.t==buildT||(e.dataset.t=='edit'&&!!EDIT)));
const mt=$('#mats');if(mt){const h=MT.map((m,i)=>`<span class="${i==msel?'on':''}">${m.ic} ${mat[i]}</span>`).join('')+'<small>'+CTL.first('mat')+' / '+CTL.first('aim')+'</small>';if(h!==matsK){matsK=h;mt.innerHTML=h}}
if(buildT)$('#wnm').textContent='BUILD · '+BPIECE[buildT].n+' · '+MT[msel].n;else if(EDIT)$('#wnm').textContent='EDIT';
$('#s1').textContent=W[myT];$('#s2').textContent=W[1-myT];$('#rnd').textContent='ROUND '+rd+' · FIRST TO '+WIN}
function reload(){const w=curW(),st=curS();if(w.melee||S.rl||st.mag==w.mag||st.res<=0||S.dead||phase!='live')return;S.rl=1;S.rlT0=performance.now();SFX.reload();hud();const i=S.w;
S.rlT=setTimeout(()=>{if(!run||S.w!=i)return;const n=Math.min(w.mag-st.mag,st.res);st.mag+=n;st.res-=n;S.rl=0;hud()},w.rl)}
function shoot(){const w=curW(),st=curS(),n=performance.now();if(phase!='live'||S.dead||S.rl||n<S.nextShot||n<S.eq)return;
if(!w.auto&&S.lat)return;
if(!w.melee&&st.mag<=0){SFX.empty();S.nextShot=n+250;reload();return}
if(!w.melee)st.mag--;S.nextShot=n+w.rate;S.lat=1;recoil=Math.min(1.2,recoil+w.rec);shake+=w.shk;fireK=Math.min(1,fireK+(w.kk||0));S.pumpT=n;if(w.melee)S.swingT=n;
const d=dirv(),rt=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),up=new T.Vector3().crossVectors(rt,d).normalize();
const o=camP.clone().addScaledVector(d,camD+.3),mu=w.melee?o:me.muzzle(),spr=w.spread*(1+(sp>3?.9:0)+(S.g?0:1.5))*(1-ads*.65),D=[],L=[],bd={},HT={},mx=w.melee?w.range:110;let harv=0;
for(let i=0;i<w.pel;i++){const a=Math.random()*6.283,r=(w.pel>1?Math.sqrt(Math.random()):Math.random())*spr,v=d.clone().addScaledVector(rt,Math.cos(a)*r).addScaledVector(up,Math.sin(a)*r).normalize(),c=castRay(o,v,mx);let l=c.L,ht=null,hq=null;
for(const q of RP){if(q.mate||q.dead||q.left)continue;const h=hitZone(o,v,q.g.position,q.r);if(h&&h.t<=Math.min(l,mx)+.05&&(!ht||h.t<ht.t)){ht=h;hq=q}}
if(ht){const f=w.fall,m=1-(1-f[2])*Math.max(0,Math.min(1,(ht.t-f[0])/(f[1]-f[0]))),e=HT[hq.u]||(HT[hq.u]={r:hq,dm:0,hd:0,p:null});e.dm+=w.dmg*m*(ht.z=='head'?w.hs:ht.z=='legs'?.8:1);if(ht.z=='head')e.hd=1;e.p=o.clone().addScaledVector(v,ht.t);l=ht.t}
if(!ht&&c.id&&l<mx)bd[c.id]=(bd[c.id]||0)+w.bdmg;else if(!ht&&w.melee&&l<mx&&!harv){harv=1;mat[msel]=Math.min(999,mat[msel]+25);SFX.hit();hud()}
D.push(r3(v.x),r3(v.y),r3(v.z));L.push(Math.round(l*10)/10);if(!w.melee)tracer(mu,o.clone().addScaledVector(v,l),0xfff2a0,w.pel>1?.025:.04)}
const bda=Object.keys(bd).map(k=>[k,bd[k]]);bda.forEach(([id,dm])=>damageBuild(id,dm));
const claims=[];for(const k in HT){const e=HT[k],dm=Math.round(e.dm*10)/10;e.r.hitT=n;e.r.rc=Math.min(1.2,(e.r.rc||0)+.3);if(e.r.bot)botHit(e.r,dm,e.hd,e.p);else{claims.push({u:k,dm,hd:e.hd});hitFx(e.p,e.hd)}}
if(!w.melee&&w.id=='ar')casing(mu.clone().addScaledVector(d,-.5),rt);if(!w.melee)flash(me);SFX.gun(w.id);$('#cross').classList.add('f');setTimeout(()=>$('#cross').classList.remove('f'),90);
shRef.push({by:uid,rd,h:claims,w:S.w,o:[r3(o.x),r3(o.y),r3(o.z)],m:[r3(mu.x),r3(mu.y),r3(mu.z)],D,L,bd:bda,pk:Math.round(P.y*10)/10});hud();
if(!w.melee&&st.mag<=0&&st.res>0)setTimeout(()=>{if(run&&!S.rl&&S.w==WEAPONS.indexOf(w)&&curS().mag<=0)reload()},w.rate+150)}
function flash(c){c.flash&&c.flash()}
/* ================= OTHER PLAYERS =================
   RP holds every remote player (1v1: one enemy; 2v2: one teammate + two enemies). Each entry is a character rig with extra fields:
   u uid, name, team, mate, c spawn corner, tg target position, opv smoothed position, hp, dead, left, dc deaths seen, ads/rlOn/fk/pumpT (animation state) */
const PLR=u=>RP.find(r=>r.u===u);
const yawAt=c=>Math.atan2(Math.sign(c[0]),Math.sign(c[1]));
/* incoming shot (we are the target): victim-side hit detection, with ~110ms of lag compensation. Teammates' shots only draw tracers (no friendly fire). */
function onShot(s){if(s.by===uid)return;const sh=PLR(s.by);if(!sh)return;
if(s.k=='b'){if(s.rd===rd&&phase!='over')addBuild(s.id,s.t,s.x,s.y,s.z,s.r,false,s.m|0,0,sh.mate);return}
if(s.k=='e'){applyEdit(BLD[s.id],s.mk|0);return}
const w=WEAPONS[s.w|0]||WEAPONS[0],o=new T.Vector3(...s.o),n=(s.L||[]).length||1,mu=new T.Vector3(...s.m);
(s.bd||[]).forEach(([id,dm])=>damageBuild(id,dm));
if(!w.melee)for(let i=0;i<n;i++){const v=new T.Vector3(s.D[i*3],s.D[i*3+1],s.D[i*3+2]);tracer(mu,o.clone().addScaledVector(v,s.L[i]),sh.mate?0x9affd0:0xff9ab0,w.pel>1?.025:.04)}
const now=performance.now();
if(w.melee)sh.swingT=now;else{flash(sh);sh.fk=Math.min(1,(sh.fk||0)+(w.kk||0));sh.pumpT=now;if(w.id=='ar'&&s.D&&s.D.length>=3){const dx=s.D[0],dz=s.D[2],l=Math.hypot(dx,dz)||1;casing(mu.clone().addScaledVector(new T.Vector3(dx,0,dz),-.5/l),new T.Vector3(-dz/l,0,dx/l))}}
sh.rc=Math.min(1.2,(sh.rc||0)+w.rec);SFX.gun(w.id,Math.max(.2,1-P.distanceTo(sh.opv)/50));
/* hits are decided on the SHOOTER's screen (what you see is what you hit); the victim just applies the claimed damage after sanity checks */
if(S.dead||!run||sh.mate||s.rd!==rd)return;const mh=(s.h||[]).find(x=>x&&x.u===uid);if(!mh)return;
if(!(phase=='live'||(phase=='freeze'&&frz-now<600)))return; /* the 600ms grace covers the two clients leaving the countdown a hair apart */
const cap=w.dmg*(w.pel||1)*w.hs*1.02,dm=Math.max(0,Math.min(cap,+mh.dm||0));if(dm<=0)return;takeHit(dm,!!mh.hd,null,s.by)}
function takeHit(dmg,head,pnt,by){recoil=Math.min(1.2,recoil+.25);S.hp-=dmg;SFX.hurt();shake=Math.max(shake,.3);const vg=$('#vig');vg.classList.remove('on');void vg.offsetWidth;vg.classList.add('on');sparks(pnt||new T.Vector3(P.x,P.y+1.3,P.z),head?0xffd23f:0xff4d6d,head?16:10);if(S.hp<=0){S.hp=0;die(head,by)}hud();send()}
function hitFx(p,hd){SFX.hit();const h=$('#hit');h.classList.remove('on');void h.offsetWidth;h.classList.add('on');if(p)sparks(p,hd?0xffd23f:0xff4d6d,hd?16:10)}
function die(head,by){exitEdit();exitBuild();S.dead=1;S.dts=clk();S.deaths++;S.killer=by||null;SFX.death();feed((names[by]||'Someone')+(head?' headshot you':' eliminated you'));hud();send();checkRound()}
let hbN=0,xhB=-1,xhS=-1;
function send(){pRef.set({hb:++hbN,ts:clk(),dts:S.dead?(S.dts||0):0,x:+P.x.toFixed(2),y:+P.y.toFixed(2),z:+P.z.toFixed(2),r:+yaw.toFixed(2),pt:+pitch.toFixed(2),w:buildT?-1:S.w,hp:Math.ceil(S.hp),d:S.deaths,dead:S.dead?1:0,rd,a:ads>.5?1:0,rl:S.rl?1:0,kb:S.dead?(S.killer||null):null})}
function mateUi(){const m=RP.find(r=>r.mate),e=$('#mate');if(!m){e.style.display='none';return}e.style.display='flex';e.classList.toggle('dead',!!(m.dead||m.left));$('#matet').textContent=m.name;$('#mateh').style.width=(m.dead||m.left?0:Math.max(0,m.hp))+'%'}
function playerLeft(r){r.left=1;r.dead=1;r.g.visible=false;if(r.bar)r.bar.style.display='none';feed(r.name+' left the match');mateUi();if(!RP.some(x=>!x.mate&&!x.left))end(true,'Opponent left');else checkRound()}
function onOpp(r,v){if(!v){if(r.seen&&phase!='over'&&phase!='ended'&&!r.left)playerLeft(r);return}
const n=performance.now();r.seen=1;r.t=n;if(![v.x,v.y,v.z,v.r].every(Number.isFinite))return;
r.tg.set(v.x,v.y,v.z);r.r=v.r;r.pt=Number.isFinite(v.pt)?Math.max(-PMAX,Math.min(PMAX,v.pt)):0;
if(v.w!=null&&v.w!==r.wi){r.wi=v.w;r.eqT=n;r.setGun(v.w)}
r.ads=v.a?1:0;if(v.rl){if(!r.rlOn){r.rlOn=1;r.rlT0=n}}else r.rlOn=0;
const cur=v.rd===rd;if(cur)pushSample(r,v);
if(cur&&v.hp<r.hp&&!v.dead&&!r.mate&&n-(r.hitT||0)>700){SFX.hit();const h=$('#hit');h.classList.remove('on');void h.offsetWidth;h.classList.add('on');sparks(new T.Vector3(v.x,v.y+1.3,v.z))}
if(cur)r.hp=v.hp;r.dead=!!(v.dead&&cur);r.dts=r.dead?(v.dts||0):0;
if(v.d>(r.dc||0)){r.dc=v.d;const k=v.kb||(MODE2?null:uid);
if(!r.mate){SFX.kill();if(k===uid)me.kick();feed(k===uid?'You eliminated '+r.name:(names[k]||'Someone')+' eliminated '+r.name)}else feed(r.name+' was eliminated');hud()}
if(r.mate)mateUi();checkRound()}

/* ================= ROUND FLOW (first team to WIN rounds wins) =================
   A round ends when every player on one team is down. Each client works that out from the same player flags (dead + round number), so scores agree.
   If both teams go down within 350ms it is a double KO and both teams score. */
const isOut=p=>p?(p.dead||p.left):!!S.dead;
const memb=t=>{const a=RP.filter(r=>r.team===t);if(t===myT)a.push(null);return a};
const teamOut=t=>memb(t).every(isOut);
function checkRound(){if(phase!='live')return;if(teamOut(0)||teamOut(1))closeRound()}
function closeRound(){let T0=Math.max(S.dts||0,...RP.map(r=>r.dts||0));const c0=clk();if(!(T0>0)||c0-T0>3000||T0>c0+500)T0=c0;rT0=T0;phase='over';clearTimeout(S.rlT);S.rl=0;const mo=teamOut(myT),eo=teamOut(1-myT),en=RP.find(r=>!r.mate);
msg(mo&&eo?'DOUBLE KO':eo?(MODE2?'ROUND WON':'ELIMINATED '+en.name.toUpperCase()):(MODE2?'ROUND LOST':'ELIMINATED'));hud();clearTimeout(pt);pt=setTimeout(finalizeRound,Math.max(250,T0+350-c0))}
function finalizeRound(){if(!run)return;const mo=teamOut(myT),eo=teamOut(1-myT);if(!mo&&!eo){phase='live';return}
if(mo)W[1-myT]++;if(eo)W[myT]++;hud();roundCb&&roundCb(eo&&!mo);
clearTimeout(pt);pt=setTimeout(()=>{if(!run)return;if(W[0]>=WIN||W[1]>=WIN)finish();else newRound()},Math.max(300,rT0+2900-clk()))}
function newRound(){clearBuilds();exitEdit();exitBuild();mat=[500,300,200];msel=0;S.swingT=0;rd++;phase='freeze';{const tg=rd==1?firstTg:(rT0?rT0+5900:0);frz=performance.now()+(tg?Math.max(1200,Math.min(9000,tg-clk())):3000)}cdN=-1;
P.set(sp0[0],0,sp0[1]);visY=0;yaw=yawAt(sp0);pitch=.12;S.vy=0;S.g=1;S.hp=100;S.dead=0;S.dts=0;S.killer=null;S.rl=0;sp=0;recoil=0;fireK=0;hist=[];
WS=WEAPONS.map(w=>({mag:w.mag,res:w.res}));S.nextShot=0;S.lat=0;
RP.forEach(r=>{if(r.left)return;r.buf=[];r.dts=0;if(r.bot)botSpawn(r);r.hp=100;r.dead=0;r.fk=0;r.g.position.set(r.c[0],0,r.c[1]);r.tg.copy(r.g.position);r.opv.copy(r.g.position);r.odk=0;r.ads=0;r.rlOn=0});
deadK=0;spawnCandy();$('#cd').textContent='';mateUi();hud();send()}
function finish(){const a=W[myT],b=W[1-myT],w=a>b,dr=a==b;phase='ended';end(w,dr?'Draw':w?'Victory':'Defeat',dr)}
function stopNet(){pRef.remove();pRef.off();oRefs.forEach(r=>r.off());shRef.off()}
function end(w,t,dr){if(!run)return;run=false;phase='ended';clearInterval(tick);clearTimeout(pt);clearTimeout(S.rlT);cancelAnimationFrame(raf);document.exitPointerLock();$('#hud').classList.remove('on');$('#pause').classList.remove('on');$('#cd').textContent='';$('#scope').classList.remove('on');
stopNet();clearBuilds();clearCandy();dr?0:w?SFX.win():SFX.lose();
const mine=[names[uid],...RP.filter(r=>r.mate).map(r=>r.name)].join(' & '),foes=RP.filter(r=>!r.mate).map(r=>r.name).join(' & ');
onEnd({win:w,draw:!!dr,title:t,me:W[myT],opp:W[1-myT],myName:mine,oppName:foes,winner:w?mine:foes})}
function leave(){if(!run)return;run=false;phase='ended';clearInterval(tick);clearTimeout(pt);clearTimeout(S.rlT);cancelAnimationFrame(raf);document.exitPointerLock();
$('#hud').classList.remove('on');$('#pause').classList.remove('on');$('#cd').textContent='';$('#scope').classList.remove('on');
stopNet();clearBuilds();clearCandy();onLeave&&onLeave({me:W[myT],opp:W[1-myT]})}
function ghost(cb){if(!run)return;run=false;phase='ended';clearInterval(tick);clearTimeout(pt);clearTimeout(S.rlT);cancelAnimationFrame(raf);document.exitPointerLock();$('#hud').classList.remove('on');$('#pause').classList.remove('on');$('#cd').textContent='';$('#scope').classList.remove('on');stopNet();clearBuilds();clearCandy();cb&&cb()}
function resume(){lock()}
/* ================= PRACTICE BOT (1v1 when nobody is online) =================
   Runs fully on this client: it walks (collision + jumping over low cover), keeps a preferred range, strafes, needs line of sight to shoot,
   fires in bursts with a reaction delay, and its accuracy drops against a fast-moving player. It adapts a little: if you are ahead it gets sharper. */
function botSpawn(r){const lead=W[myT]-W[1-myT];r.bp=r.bp||new T.Vector3();r.ai={strafe:Math.random()<.5?1:-1,st:0,vy:0,g:1,mag:30,rlUntil:0,burst:0,nextShot:0,react:0,los:false,losT:0,blk:null,blkT:0,stuck:0,jmpT:0,sk:Math.max(.45,Math.min(1,.62+.1*lead+Math.random()*.15)),yaw:r.r||0,hold:0,bnext:0}}
function botHit(r,dm,hd,p){const a=r.ai;if(r.dead)return;hitFx(p,hd);r.hp-=dm;if(a)a.react=Math.min(a.react||1e12,performance.now()+250);
if(r.hp<=0){r.hp=0;r.dead=1;r.dts=clk();r.dc=(r.dc||0)+1;SFX.kill();me.kick();feed('You eliminated '+r.name);hud();checkRound()}}
function botStep(r,dt,now){const a=r.ai;if(!a||r.dead||r.left)return;const live=phase=='live'&&!S.dead,pos=r.tg,w=WEAPONS[1];
const tx=P.x-pos.x,tz=P.z-pos.z,dist=Math.hypot(tx,tz)||.01,want=Math.atan2(-tx,-tz);
if(!live){a.vy=0;return}
/* turn toward the player at a limited rate */
let dy=want-a.yaw;dy=Math.atan2(Math.sin(dy),Math.cos(dy));a.yaw+=Math.sign(dy)*Math.min(Math.abs(dy),dt*(3+4*a.sk));r.r=a.yaw;
r.pt=Math.max(-PMAX,Math.min(PMAX,Math.atan2((P.y+1.2)-(pos.y+1.5),dist)));r.ads=0;
/* line of sight every 120ms */
if(now>a.losT){a.losT=now+120;const eo=new T.Vector3(pos.x,pos.y+1.55,pos.z),tv=new T.Vector3(P.x,P.y+1.1,P.z).sub(eo),tl=tv.length();tv.multiplyScalar(1/tl);const c=castRay(eo,tv,tl);
const had=a.los;a.los=c.L>=tl-.7;a.blk=a.los?null:(c.id||null);if(a.los&&!had){a.react=now+(380+Math.random()*320)/a.sk}if(!a.los)a.blkT=(a.blkT||0)+.12;else a.blkT=0}
/* movement */
const want0=dist>20?1:dist<9?-1:0;a.st-=dt;if(a.st<=0){a.st=.7+Math.random()*1.6;if(Math.random()<.55)a.strafe=-a.strafe}
const fx=tx/dist,fz=tz/dist,sx=-fz*a.strafe,sz=fx*a.strafe,spd=(a.los?3.6:5.4)*(.8+.2*a.sk);
let vx=fx*want0*spd+sx*(a.los?spd:spd*.4)+(a.los?0:fx*spd*.9),vz=fz*want0*spd+sz*(a.los?spd:spd*.4)+(a.los?0:fz*spd*.9);
if(!a.g)vx*=.7,vz*=.7;
const np=pos.clone(),ox=pos.x,oz=pos.z;np.x+=vx*dt;if(hits(np))np.x=ox;np.z+=vz*dt;if(hits(np))np.z=oz;np.x=Math.max(-29,Math.min(29,np.x));np.z=Math.max(-29,Math.min(29,np.z));
const moved=Math.hypot(np.x-ox,np.z-oz),exp=Math.hypot(vx,vz)*dt;if(exp>.001&&moved<exp*.35){a.stuck+=dt;if(a.stuck>.25){if(a.g&&now>a.jmpT){a.vy=9;a.g=0;a.jmpT=now+900}if(a.stuck>.6){a.strafe=-a.strafe;a.st=1;a.stuck=0}}}else a.stuck=0;
a.vy=Math.max(-32,a.vy-25*dt);const y0=np.y;np.y+=a.vy*dt;const gh=gnd(np,y0);if(np.y<=gh&&a.vy<=0){np.y=gh;a.vy=0;a.g=1}else if(np.y>gh+.05)a.g=0;
if(a.g&&a.los&&Math.random()<dt*.35){a.vy=8;a.g=0}
pos.copy(np);
/* shooting: bursts of 3-7 rounds with pauses; reload when empty */
if(a.rlUntil){if(now>=a.rlUntil){a.rlUntil=0;a.mag=30;r.rlOn=0}else return}
if(now<a.react||phase!='live')return;
const eye=new T.Vector3(pos.x,pos.y+1.55,pos.z);
if(a.los&&dist<75){if(now<a.nextShot||now<a.bnext)return;
if(a.mag<=0){r.rlOn=1;r.rlT0=now;a.rlUntil=now+1800/(.8+.2*a.sk);return}
a.mag--;a.nextShot=now+w.rate*(1.25/a.sk);if(--a.burst<=0){a.burst=3+(Math.random()*5|0);a.bnext=now+(260+Math.random()*420)/a.sk}
const spd2=Math.min(1,sp/6.5),ch=Math.max(.06,Math.min(.62,(.62-dist/150)*a.sk*(1-.4*spd2)+.05)),hit=Math.random()<ch,tv=new T.Vector3(P.x,P.y+1.1,P.z);
let mu;try{mu=r.muzzle()}catch(e){mu=eye}
let end=tv.clone();if(!hit){end.x+=(Math.random()-.5)*2.4;end.y+=(Math.random()-.5)*2;end.z+=(Math.random()-.5)*2.4}
tracer(mu,end,0xff9ab0,.04);flash(r);r.fk=Math.min(1,(r.fk||0)+w.kk);r.rc=Math.min(1.2,(r.rc||0)+w.rec);r.pumpT=now;SFX.gun('ar',Math.max(.2,1-P.distanceTo(pos)/50));
if(hit){const rr=Math.random(),head=rr<.1,legs=!head&&rr>.8,f=w.fall,m=1-(1-f[2])*Math.max(0,Math.min(1,(dist-f[0])/(f[1]-f[0])));
takeHit(w.dmg*m*.85*(head?w.hs:legs?.8:1),head,end,r.u)}}
else if(a.blk&&a.blkT>.8&&dist<30&&now>=a.nextShot){a.nextShot=now+w.rate*2.2;const tv=new T.Vector3(P.x,P.y+1.1,P.z).sub(eye).normalize(),c=castRay(eye,tv,40);if(c.id){damageBuild(c.id,w.bdmg);let mu;try{mu=r.muzzle()}catch(e){mu=eye}tracer(mu,eye.clone().addScaledVector(tv,c.L),0xff9ab0,.04);flash(r);SFX.gun('ar',.5)}}}
/* snapshot interpolation: remote players are drawn ~100ms in the past between two real samples (extrapolated up to 150ms if packets stall), so lag spikes glide instead of teleporting */
const IDLY=100; /* base render delay; grows with measured network jitter (see pushSample) */
function pushSample(r,v){const ts=Number.isFinite(v.ts)?v.ts:clk(),d=clk()-ts;r.off=r.off==null||d<r.off?d:r.off+(d-r.off)*.02;
const ex=Math.max(0,d-r.off);r.jit=Math.max(ex,(r.jit||0)*.97); /* recent worst-case extra delay: peaks decay slowly so the delay doesn't pump */
const gp=r.lastA?performance.now()-r.lastA:50;r.lastA=performance.now();if(gp>120)r.jit=Math.max(r.jit,gp*.6);
const b=r.buf||(r.buf=[]);let l=b[b.length-1];if(l&&ts<=l.t)return;if(l&&Math.hypot(v.x-l.x,v.z-l.z)>10){b.length=0;l=null}
const q={t:ts,x:v.x,y:v.y,z:v.z,vx:0,vz:0};if(l&&ts-l.t<400){q.vx=(v.x-l.x)/(ts-l.t);q.vz=(v.z-l.z)/(ts-l.t)}b.push(q);while(b.length>40)b.shift()}
function sampleTarget(r,dt){const b=r.buf;if(!b||!b.length)return;const want=Math.max(IDLY,Math.min(260,IDLY+(r.jit||0)*1.1));r.dl=r.dl==null?want:r.dl+(want-r.dl)*Math.min(1,(dt||.016)*(want>r.dl?3:.6)); /* grows quickly, shrinks slowly */
const rt=clk()-(r.off||0)-r.dl;while(b.length>1&&b[1].t<=rt)b.shift();const a=b[0],c=b[1];
if(c&&rt>=a.t){const u=(rt-a.t)/Math.max(1,c.t-a.t);r.tg.set(a.x+(c.x-a.x)*u,a.y+(c.y-a.y)*u,a.z+(c.z-a.z)*u)}
else{const e=Math.max(0,Math.min(150,rt-a.t));r.tg.set(a.x+a.vx*e,a.y,a.z+a.vz*e)}}
function updRemote(r,dt,now){if(r.bot)botStep(r,dt,now);else sampleTarget(r,dt);const pv=r.pv||(r.pv=new T.Vector3());pv.copy(r.g.position);r.g.position.lerp(r.tg,r.bot?1:1-Math.exp(-dt*30));r.opv.copy(r.g.position);const rawS=Math.min(16,pv.distanceTo(r.g.position)/Math.max(dt,.001));r.sv=(r.sv||0)+(rawS-(r.sv||0))*(1-Math.exp(-dt*(rawS>(r.sv||0)?12:7)));const spd2=r.sv<.35?0:r.sv; /* smoothed speed: the walk cycle no longer stutters with every network packet */
const ovy=(r.g.position.y-pv.y)/Math.max(dt,.001),oair=Math.abs(ovy)>1.2||r.tg.y>r.g.position.y+.15;if(r.pa&&!oair)r.lt=.3;r.pa=oair;r.lt=Math.max(0,(r.lt||0)-dt);
const ofw=(r.g.position.x-pv.x)*(-Math.sin(r.g.rotation.y))+(r.g.position.z-pv.z)*(-Math.cos(r.g.rotation.y)),osg=spd2>1&&ofw<-.01?-1:1;
let dr=r.r-r.g.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));if(!isFinite(dr)||!isFinite(r.g.rotation.y)){dr=0;r.g.rotation.y=Number.isFinite(r.r)?r.r:0}if(!isFinite(r.g.position.x+r.g.position.y+r.g.position.z))r.g.position.copy(r.tg);r.odk+=((r.dead?1:0)-r.odk)*Math.min(1,dt*7);
r.g.rotation.set(r.odk*1.45,r.g.rotation.y+dr*Math.min(1,dt*12),0);r.g.position.y+=r.odk*.12;
r.wp=(r.wp||0)+dt*spd2*1.6*osg;r.rc=(r.rc||0)*Math.pow(.001,dt*1.1);const w=WEAPONS[r.wi]||null;r.fk=(r.fk||0)*Math.exp(-dt*((w&&w.kd)||10));
const rlp=r.rlOn&&w&&w.rl?Math.min(.999,(now-r.rlT0)/w.rl):-1,drw=r.eqT?Math.min(1,(now-r.eqT)/260):1;
r.ps=r.ps==null?r.pt:r.ps+(r.pt-r.ps)*(1-Math.exp(-dt*16));r.update(dt,{k:Math.min(1,spd2/6.5),w:r.wp,pitch:r.ps,rec:r.rc,air:oair,vy:ovy,land:r.lt/.3,gun:r.wi,swing:r.swingT&&now-r.swingT<380?(now-r.swingT)/380:-1,t:ph,ads:r.ads,fire:r.fk,pump:pumpOf(r.pumpT,now,w),rl:rlp,draw:drw,spr:spd2>8.2&&!oair&&!r.ads?1:0})}
/* name-tag health bar above a remote player (hidden behind walls) */
function updBar(r){const b=r.bar;if(!b)return;const tp=r.opv.clone().add(new T.Vector3(0,2.4,0)),dv2=tp.clone().sub(camP),dd2=dv2.length();dv2.multiplyScalar(1/(dd2||1));const occ=wallDist(camP,dv2,dd2)<dd2-.4,sp3=tp.clone().project(cam);
if(sp3.z<1&&!r.dead&&!r.left&&!occ){if(b.style.display!=='block')b.style.display='block';b.style.transform=`translate3d(calc(${((sp3.x*.5+.5)*innerWidth).toFixed(1)}px - 50%),calc(${((-sp3.y*.5+.5)*innerHeight).toFixed(1)}px - 50%),0)`;const hw=Math.max(0,r.hp)+'%';if(r.hw!==hw){r.hw=hw;b.firstChild.style.width=hw}}else if(b.style.display!=='none')b.style.display='none'}
function frame(t){if(!run)return;raf=requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.05,(t-last)/1000||.016);adapt(t-last,now);last=t;ph+=dt;
if(Qs.se>1)R.shadowMap.needsUpdate=(++fcnt%Qs.se)==0;
if(phase=='freeze'){const n=Math.ceil((frz-now)/1000);if(n!=cdN){cdN=n;if(n>0){$('#cd').textContent=n;$('#cd').classList.remove('on');void $('#cd').offsetWidth;$('#cd').classList.add('on');SFX.tick()}}
if(now>=frz){phase='live';$('#cd').textContent='';msg('FIGHT!');SFX.go();S.eq=0}}
const live=phase=='live';if(live)checkRound();
if(!S.dead){const mv=live,f=mv?Math.max(-1,Math.min(1,(K.fwd?1:0)-(K.back?1:0)+(K.ay||0))):0,r=mv?Math.max(-1,Math.min(1,(K.right?1:0)-(K.left?1:0)+(K.ax||0))):0,l=Math.max(1,Math.hypot(f,r)),spd=(K.sprint&&!K.aim?10:6.5)*(K.aim?.6:1),vx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)/l*spd,vz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)/l*spd;
P.x+=vx*dt;if(hits(P))P.x-=vx*dt;P.z+=vz*dt;if(hits(P))P.z-=vz*dt;P.x=Math.max(-29,Math.min(29,P.x));P.z=Math.max(-29,Math.min(29,P.z));
if(f)mvf=f<0?-1:1;if(mv&&K.jump&&S.g){S.vy=9;S.g=0;SFX.jump()}S.vy=Math.max(-32,S.vy-25*dt);if(S.vy>0&&headHit(P,S.vy,dt))S.vy=0;const y0=P.y;P.y+=S.vy*dt;let gh=gnd(P,y0);if(S.g&&S.vy<=0&&P.y>gh&&P.y-gh<.4){P.y=gh}if(P.y<=gh&&S.vy<=0){if(!S.g){if(S.vy<-4)landT=.3;if(S.vy<-8)SFX.land()}P.y=gh;S.vy=0;S.g=1}else if(P.y>gh+.05)S.g=0;
sp+=(Math.hypot(vx,vz)-sp)*Math.min(1,dt*10);stepT-=dt;if(sp>3&&S.g&&stepT<0){SFX.step();stepT=K.sprint?.28:.4}
unstick();if(live&&K.shoot&&!EDIT){if(buildT)place(buildT);else shoot()}}
hist.push({t:now,x:P.x,y:P.y,z:P.z});while(hist.length&&now-hist[0].t>300)hist.shift();
const w=curW();wph+=dt*sp*1.6*mvf;landT=Math.max(0,landT-dt);const k=Math.min(1,sp/6.5);recoil*=Math.pow(.001,dt*1.1);
/* aim down sights / scope */
const adsT=(K.aim&&live&&!S.dead&&!S.rl&&!w.melee)?1:0;ads+=(adsT-ads)*Math.min(1,dt*11);const sc1=w.scope&&ads>.75;
me.g.visible=!sc1;$('#scope').classList.toggle('on',!!sc1);
deadK+=((S.dead?1:0)-deadK)*Math.min(1,dt*7);
if(Math.abs(P.y-visY)>2.5)visY=P.y;visY=S.g?visY+(P.y-visY)*Math.min(1,dt*24):P.y;me.g.position.set(P.x,visY+deadK*.12,P.z);me.g.rotation.set(deadK*1.45,yaw,0);
fireK*=Math.exp(-dt*(w.kd||10));const rlp=S.rl?Math.min(.999,(now-(S.rlT0||now))/Math.max(1,w.rl)):-1,drw=S.eq>now?1-(S.eq-now)/260:1;
me.update(dt,{k,w:wph,pitch,rec:recoil,air:!S.g,vy:S.vy,land:landT/.3,gun:buildT?-1:S.w,swing:S.swingT&&now-S.swingT<380?(now-S.swingT)/380:-1,t:ph,ads,fire:fireK,pump:pumpOf(S.pumpT,now,w),rl:rlp,draw:drw,spr:(K.sprint&&!K.aim&&!K.shoot&&sp>6&&S.g)?1:0});
const d=dirv(),rt=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),head=new T.Vector3(P.x,visY+1.7,P.z);
const wantD=w.scope?.2:2.7,wantS=w.scope?0:.42,dTar=4.2+(wantD-4.2)*ads;shSm+=((.9+(wantS-.9)*ads)-shSm)*Math.min(1,dt*10);
const des=head.clone().addScaledVector(d,-dTar).addScaledVector(rt,shSm),dv=des.clone().sub(head),dl=dv.length();dv.multiplyScalar(1/dl);
let allow=dl;for(const off of[0,.35,-.35]){const o2=head.clone();o2.y+=off;allow=Math.min(allow,castRay(o2,dv,dl,1).L-.4)}
const camTgt=Math.max(.3,Math.min(dl,allow));camDs+=(camTgt-camDs)*Math.min(1,dt*(camTgt<camDs?28:4));camD=camDs*(dTar/dl);
camP.copy(head).addScaledVector(dv,camDs);camP.y-=Math.min(.14,landT*.45);if(camP.y<.3)camP.y=.3; /* little camera dip on landing */
cam.position.copy(camP).add(new T.Vector3((Math.random()-.5)*shake,(Math.random()-.5)*shake,0));shake*=Math.pow(.003,dt);cam.lookAt(camP.clone().add(d));
const fv=(K.sprint&&sp>6&&!K.aim?82:75)-fireK*(w.kk>.5?2.2:.6),zf=75/(w.zoom||1);cam.fov+=((fv+(zf-fv)*ads)-cam.fov)*Math.min(1,dt*10);cam.updateProjectionMatrix();
const cr=$('#cross'),bo=buildT?.25:1,cs=Math.round((1+w.spread*30+(sp>3?.4:0)+(S.g?0:.5)+recoil*.5)*(1-ads*.5)*40)/40;if(bo!==xhB){xhB=bo;cr.style.setProperty('--bo',bo)}if(cs!==xhS){xhS=cs;cr.style.setProperty('--s',cs)}
/* other players */
for(const r of RP){if(r.left)continue;updRemote(r,dt,now);updBar(r)}
halUpdate(dt);ghostUpdate();editUpdate();buildUpdate();for(let i=TW.length-1;i>=0;i--){const w2=TW[i];w2.t+=dt/.15;const e2=Math.min(1,w2.t);w2.m.scale.setScalar(.82+.18*(1-Math.pow(1-e2,3)));if(e2>=1)TW.splice(i,1)}
for(let i=FX.length-1;i>=0;i--){const f=FX[i];if(f.ring){f.ring.rotation.y+=dt*f.ring.userData.s;continue}f.life-=dt;if(f.v){if(f.g)f.v.y-=18*dt;f.m.position.addScaledVector(f.v,dt);if(f.floor&&f.m.position.y<.03){f.m.position.y=.03;f.v.set(0,0,0)}}f.m.material.opacity=Math.max(0,f.life*(f.fade?8:1.6));if(f.sh){const q=Math.max(.15,Math.min(1,f.life*3));if(!f.fade)f.m.scale.setScalar(q)}if(f.spin&&f.m.position.y>.04)f.m.rotation.x+=f.spin*dt;if(f.life<=0){fxFree(f.m);FX.splice(i,1)}}
if(!document.hidden)for(const r of RP)if(r.t&&!r.left&&now-r.t>12000)playerLeft(r);
if(!BOTM&&onGhost&&!document.hidden&&now-startT>16000&&RP.filter(r=>!r.mate).every(r=>!r.seen)){const g=onGhost;onGhost=null;ghost(g);return}
R.render(sc,cam)}

/* ================= HALLOWEEN EVENT: spooky arena dressing + candy pickups ================= */
let HAL=0,HAN=[],CG=null,CN=[],candyCb=null,roundCb=null,HH=0,gTex=null;
const rng=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
function skyTex(stops){const g=document.createElement('canvas');g.width=2;g.height=256;const x=g.getContext('2d'),r=x.createLinearGradient(0,0,0,256);stops.forEach((c,i)=>r.addColorStop(i/(stops.length-1),c));x.fillStyle=r;x.fillRect(0,0,2,256);return new T.CanvasTexture(g)}
function halDecor(lvl){HAN.length=0;lvl=lvl===undefined?2:lvl;const P2=window.COS.prop,r=rng(HH^0x5a17),g=new T.Group();MG.add(g);
sc.background=skyTex(['#07041a','#2a0d4a','#8a2a5e','#ff7a2a']);sc.fog=new T.Fog(0x2a1038,22,88);HL.color.setHex(0xffb98a);HL.groundColor.setHex(0x3a2060);HL.intensity=.78;DL.color.setHex(0xffa86a);
MG.children.forEach(m=>{const p=m.geometry&&m.geometry.parameters;if(!p||!m.material)return;if(m.geometry.type=='PlaneGeometry'&&p.width==64)m.material.color.setHex(0xb59ac6);if(m.geometry.type=='PlaneGeometry'&&p.width==700)m.material.color.setHex(0x1c0e2c)});
const mn=P2.moon(5);mn.position.set(-55,48,-95);g.add(mn);
const st=new Float32Array(240*3);for(let i=0;i<240;i++){const a=r()*6.283,e=.15+r()*.8;st[i*3]=Math.cos(a)*Math.cos(e)*150;st[i*3+1]=Math.sin(e)*150;st[i*3+2]=Math.sin(a)*Math.cos(e)*150}
const sg=new T.BufferGeometry();sg.setAttribute('position',new T.BufferAttribute(st,3));g.add(new T.Points(sg,new T.PointsMaterial({color:0xffffff,size:1.4,sizeAttenuation:false,fog:false})));
/* jack-o'-lanterns, tombstones and dead trees ring the arena (outside the playable +-29 box) */
if(lvl<1)return;/* Off: sky, fog, moon and stars only */
const RN=lvl>=2?22:12;for(let i=0;i<RN;i++){const a=i/RN*6.283+r()*.12,rad=31.5+r()*2.5,x=Math.cos(a)*rad,z=Math.sin(a)*rad;let o;
if(i%3==0){o=P2.jack(1+r()*.7,true);o.position.set(x,.85,z);o.rotation.y=Math.atan2(-x,-z)+Math.PI}
else{o=P2.tomb(.7+r()*.5,.9+r()*.6);o.position.set(x,0,z);o.rotation.y=Math.atan2(-x,-z)+Math.PI+r()*.4-.2;o.rotation.z=(r()-.5)*.12}g.add(o)}
for(let i=0;i<(lvl>=2?10:0);i++){const a=i/10*6.283+.3,rad=40+r()*14,t=P2.tree(5+r()*4);t.position.set(Math.cos(a)*rad,0,Math.sin(a)*rad);t.rotation.y=r()*6;g.add(t)}
/* little pumpkin patches inside the arena (decor only, walk-through) */
for(let i=0;i<(lvl>=2?8:0);i++){const x=(r()*2-1)*26,z=(r()*2-1)*26;if(B.some(b=>Math.abs(x-b.x)<b.w/2+1.2&&Math.abs(z-b.z)<b.d/2+1.2))continue;const o=P2.jack(.28+r()*.2,true);o.position.set(x,.2,z);o.rotation.y=r()*6;g.add(o)}
const bats=[];for(let i=0;i<(lvl>=2?9:0);i++){const b=P2.bat(1.1);g.add(b);bats.push({b,a:r()*6.283,s:.25+r()*.3,rad:18+r()*20,y:9+r()*9,p:r()*6})}
const wisps=[];for(let i=0;i<(lvl>=2?14:0);i++){const w=P2.glow(i%3?0xffa030:0x9a7bff,1.1);g.add(w);wisps.push({w,x:(r()*2-1)*30,z:(r()*2-1)*30,p:r()*6,y:.8+r()*2.2})}
let nf=performance.now()/1000+10+r()*12,fe=0;/* lightning: a quick double flash, thunder a moment later */
HAN.push(t=>{if(t>nf){fe=t+.28;nf=t+16+Math.random()*20;setTimeout(()=>{SFX.thunder&&SFX.thunder()},500+Math.random()*500)}HL.intensity=t<fe?(((t*40)|0)%2?2.6:1.3):.78;DL.intensity=t<fe?1.8:1;bats.forEach(q=>{const a=q.a+t*q.s;q.b.position.set(Math.cos(a)*q.rad,q.y+Math.sin(t*1.7+q.p)*1.2,Math.sin(a)*q.rad);q.b.rotation.y=-a;q.b.userData.flap(t*11+q.p)});
wisps.forEach(q=>{q.w.position.set(q.x+Math.sin(t*.5+q.p)*2,q.y+Math.sin(t*1.1+q.p)*.5,q.z+Math.cos(t*.4+q.p)*2);q.w.material.opacity=.45+.35*Math.sin(t*2+q.p)})})}
const CCOL=[0xff4d6d,0x38f5c8,0xffd23f,0xa65cff,0xff8a1f];
function mkCandy(gold){const g=new T.Group();if(gold){const p=window.COS.prop.pumpkin(.55,0xfff0a0,0xffb800,true);g.add(p)}
else{const c=CCOL[Math.floor(Math.random()*CCOL.length)],m=new T.MeshStandardMaterial({color:c,emissive:c,emissiveIntensity:.55,roughness:.4}),b=new T.Mesh(new T.SphereGeometry(.17,10,8),m);b.scale.x=1.25;g.add(b);
[-1,1].forEach(s=>{const w=new T.Mesh(new T.ConeGeometry(.12,.17,5),m);w.rotation.z=-s*Math.PI/2;w.position.x=s*.27;g.add(w)});const st=new T.Mesh(new T.TorusGeometry(.12,.025,5,12),new T.MeshBasicMaterial({color:0xffffff}));st.rotation.y=Math.PI/2;g.add(st);g.rotation.z=.4}
const gl=window.COS.prop.glow(gold?0xffd23f:0xffffff,gold?1.7:1.1);gl.position.y=.02;g.add(gl);g.userData.gold=gold;return g}
function clearCandy(){if(CG){sc.remove(CG);CG=null}CN=[]}
function spawnCandy(){clearCandy();if(!HAL)return;CG=new T.Group();sc.add(CG);const r=rng(HH^(rd*7919)),pts=[];let tries=0;
while(pts.length<18&&tries++<400){const x=(r()*2-1)*27,z=(r()*2-1)*27;if(B.some(b=>Math.abs(x-b.x)<b.w/2+1.4&&Math.abs(z-b.z)<b.d/2+1.4))continue;if(corners.some(c=>Math.hypot(x-c[0],z-c[1])<6))continue;if(pts.some(p=>Math.hypot(x-p[0],z-p[1])<5))continue;pts.push([x,z])}
pts.forEach((p,i)=>{const gold=i<2,o=mkCandy(gold);o.position.set(p[0],1,p[1]);CG.add(o);CN.push({o,x:p[0],z:p[1],v:gold?CANDY.gold:CANDY.normal,gold,ph:i*1.3})})}
function candyPop(x,y,z,gold){for(let i=0,n=Qs.fx>0?Math.max(2,Math.round((gold?14:7)*Qs.fx)):0;i<n;i++){const m=fxMk(CPG,gold?0xffd23f:CCOL[i%5]);m.position.set(x,y,z);sc.add(m);const a=Math.random()*6.283,s=2+Math.random()*3;FX.push({m,v:new T.Vector3(Math.cos(a)*s,2+Math.random()*3,Math.sin(a)*s),life:.55,g:1})}}
function halUpdate(dt){if(!HAL)return;const t=performance.now()/1000;HAN.forEach(f=>f(t));
for(let i=CN.length-1;i>=0;i--){const c=CN[i];c.o.rotation.y+=dt*(c.gold?1.6:2.4);c.o.position.y=1+Math.sin(t*2.4+c.ph)*.13;
if(phase=='live'&&!S.dead&&Math.abs(P.x-c.x)<1.25&&Math.abs(P.z-c.z)<1.25&&P.y<2.6){CG.remove(c.o);CN.splice(i,1);candyPop(c.x,1.1,c.z,c.gold);SFX.candy&&SFX.candy(c.gold);candyCb&&candyCb(c.v,c.gold);if(c.gold)feed('🎃 Golden pumpkin! +'+c.v+' 🍬')}}}
const hwLvl=()=>Math.min(window.CFG&&CFG.hwfx!==undefined?CFG.hwfx:2,Qs.dec);
/* compile every shader a match needs up front (effects, build pieces, muzzle flash) so nothing hitches the first time it appears */
let WARMG=null;
function warm(){try{if(!WARMG){WARMG=new T.Group();const add=m=>{const x=new T.Mesh(UBOX,m);x.castShadow=true;WARMG.add(x)};
add(new T.MeshStandardMaterial({color:0x888888,roughness:.85,flatShading:true,transparent:true,opacity:.5,emissive:0xff3b3b,emissiveIntensity:.5}));
add(new T.MeshStandardMaterial({color:0x888888,roughness:.5,metalness:.3}));add(new T.MeshBasicMaterial({color:0xfff2a0,transparent:true}));add(flashMat());add(new T.MeshBasicMaterial({color:0x66b3ff,transparent:true,opacity:.42,depthWrite:false}))}
sc.add(WARMG);R.compile(sc,cam);sc.remove(WARMG)}catch(e){}}
function start(o){init();cancelAnimationFrame(lraf);BOTM=!!o.bot;clk=o.clock||Date.now;onGhost=o.onGhost||null;rT0=0;startT=performance.now();db=BOTM?{ref:()=>NR}:o.db;uid=o.uid;mid=o.mid;onEnd=o.onEnd;onLeave=o.onLeave;clearBuilds();
for(let i=FX.length-1;i>=0;i--)if(!FX[i].ring){fxFree(FX[i].m);FX.splice(i,1)}
if(me){sc.remove(me.g);disposeTree(me.g)}RP.forEach(r=>{sc.remove(r.g);disposeTree(r.g);if(r.bar)r.bar.remove()});RP=[];oRefs=[];
/* roster: 1v1 = two players (lower uid is team 0); 2v2 = four players from the matchmaker, team 0 first */
const ros=o.ros||(uid<o.opp?[{u:uid,n:o.name,s:o.skin,t:0},{u:o.opp,n:o.oppName,s:o.oppSkin,t:1}]:[{u:o.opp,n:o.oppName,s:o.oppSkin,t:0},{u:uid,n:o.name,s:o.skin,t:1}]);
MODE2=ros.length>2?1:0;names={};ros.forEach(p=>names[p.u]=p.n);const mp=ros.find(p=>p.u===uid);myT=mp.t;W=[0,0];
let hh=0;for(const ch of mid)hh=(hh*31+ch.charCodeAt(0))>>>0;buildMap(hh%MAPS.length);HH=hh;HAL=o.halloween?1:0;candyCb=o.onCandy||null;roundCb=o.onRound||null;DL.intensity=1;clearCandy();if(HAL)halDecor(hwLvl());$('#candy').style.display=HAL?'block':'none';feed('Map: '+MAPS[hh%MAPS.length].n+(HAL?' · 🎃 Halloween':'')+(MODE2?' · 2v2':''));
/* spawn corners: team 0 on the west side, team 1 on the east side */
corners=[[-24,-24],[24,24],[-24,24],[24,-24]];const cnt=[0,0];ros.forEach(p=>{p.c=corners[p.t?[1,3][cnt[1]++]:[0,2][cnt[0]++]]});sp0=mp.c;
const mc=Number.isFinite(o.skin)?o.skin:0x2f9bff;me=char(mc);
ros.forEach(p=>{if(p.u===uid)return;const mate=p.t===myT,col=mate?0x38f5c8:0xff4d4d;let sk=Number.isFinite(p.s)&&p.s>0?p.s:col;if(sk===mc)sk=COS.pack(col,COS.id(mc))+(sk-GUN.base(sk));
const r=char(sk);Object.assign(r,{u:p.u,name:p.n,team:p.t,mate,c:p.c,tg:new T.Vector3(),opv:new T.Vector3(),wi:1,hp:100,dead:0,odk:0,dc:0,seen:p.u==='BOT'?1:0,bot:p.u==='BOT'?1:0,left:0,t:0,fk:0,rc:0,wp:0,lt:0,pa:false,ads:0,pt:0,r:yawAt(p.c)});r.setGun(1);r.g.rotation.y=r.r;r.g.position.set(p.c[0],0,p.c[1]);r.tg.copy(r.g.position);r.opv.copy(r.g.position);
r.g.add(tag(p.n,MODE2?(mate?'#7dffb0':'#ff9a9a'):'#fff'));sc.add(r.g);
r.bar=document.createElement('div');r.bar.className='eb2'+(mate?' mate':'');r.bar.innerHTML='<u></u>';$('#hud').appendChild(r.bar);RP.push(r)});
{const wb=$('#wbar');WEAPONS.forEach((w,i)=>{const sv=wb&&wb.children[i]&&wb.children[i].querySelector('svg'),sk=GUN.get(i,GUN.pick(mc,i));if(sv)sv.outerHTML=gunIcon(w,sk&&sk.c)})}me.setGun(1);buildT=null;mat=[500,300,200];msel=0;EDIT=null;visY=0;sc.add(me.g);
Object.assign(S,{w:1,eq:0,nextShot:0,lat:0,rl:0,deaths:0,swingT:0,hadLock:0,killer:null,pumpT:0,rlT0:0});$('#pause').classList.remove('on');$('#pconf').style.display='none';rd=0;ads=0;fireK=0;phase='live';cdN=-1;clearTimeout(pt);
const base='matches/'+mid;pRef=db.ref(base+'/p/'+uid);shRef=db.ref(base+'/shots');pRef.onDisconnect().remove();RP.forEach(r=>{r.ref=db.ref(base+'/p/'+r.u);oRefs.push(r.ref)});
{const mt=+String(mid).split('_').pop();firstTg=!BOTM&&Number.isFinite(mt)&&Math.abs(clk()-mt)<60000?mt+6000:0}newRound();
RP.forEach(r=>r.ref.on('value',s=>onOpp(r,s.val())));shRef.on('child_added',s=>onShot(s.val()));
run=true;for(const k in K)K[k]=0;$('#hud').classList.add('on');$('#on').textContent=MODE2?'ENEMIES':RP[0].name.toUpperCase();$('#you').textContent=MODE2?'TEAM':'YOU';mateUi();refreshKeys();hud();$('#resume').style.display=TCH()?'none':'grid';if(TCH())S.hadLock=1;SFX.resume();bcool=0;landT=0;SFX.music(CFG.music);
applyFlat();warm();R.shadowMap.needsUpdate=true;
tick=setInterval(send,50);last=performance.now();raf=requestAnimationFrame(frame)}
let LS,LC,LCam,lraf,CL=[],LP=null,LPk='',PI=null,LHAN=[];
function lobbyPartner(){if(!LS)return;const key=PI?PI.name+'|'+PI.skin:'';if(key===LPk)return;LPk=key;if(LP){LS.remove(LP.g);disposeTree(LP.g);LP=null}if(PI){LP=char(PI.skin);LP.setGun(-1);LP.g.add(tag(PI.name));LS.add(LP.g)}}
function lobbyHal(){const P2=window.COS.prop,r=rng(77);LHAN.length=0;
LS.background=skyTex(['#0a0522','#34125a','#9a2f5e','#ff8a2a']);LS.fog=new T.Fog(0x2a1038,14,62);
LS.children.forEach(m=>{if(m.isHemisphereLight){m.color.setHex(0xffb98a);m.groundColor.setHex(0x4a2a7a);m.intensity=.9}if(m.isDirectionalLight)m.color.setHex(0xffa86a);
const gp=m.geometry&&m.geometry.parameters;if(!gp||!m.material||!m.material.color)return;const ty=m.geometry.type;
if(ty=='PlaneGeometry')m.material.color.setHex(0x3a2457);else if(ty=='ConeGeometry'&&gp.radius<1)m.material.color.setHex(0xff8a1f);else if(ty=='ConeGeometry')m.material.color.setHex(0x2a1745+(((m.position.x/14)|0)&1)*0x0c0a18);else if(ty=='SphereGeometry'&&gp.radius>2)m.material.color.setHex(0x7d5a9c)});
const mn=P2.moon(4.2);mn.position.set(-13,13,-36);LS.add(mn);if(window.CFG&&CFG.hwfx===0)return;
const jacks=[[-3.4,.1,1.2,.75],[-2.5,.05,2.2,.5],[3.8,.1,.6,.62],[4.6,.05,1.6,.42],[-6.4,.1,-.6,.9],[7.4,.15,-1.2,1.1]].map(([x,y,z,k])=>{const j=P2.jack(k);j.position.set(x,y+.2*k+.12,z);j.rotation.y=Math.atan2(-x,6-z)*.5+Math.PI;LS.add(j);return j});
[[-8.4,-4],[5.8,-3.2],[8.6,-5.2],[-10.2,-7]].forEach(([x,z],i)=>{const t=P2.tomb(.8+i%2*.3,1+i%3*.3);t.position.set(x,0,z);t.rotation.y=r()*.6-.3;LS.add(t)});
[[-14,-9],[15,-12]].forEach(([x,z])=>{const t=P2.tree(7);t.position.set(x,0,z);LS.add(t)});
const bats=[];for(let i=0;i<7;i++){const b=P2.bat(1.4);LS.add(b);bats.push({b,a:r()*6.283,s:.3+r()*.3,rad:9+r()*8,y:5+r()*5,p:r()*6})}
const wisps=[];for(let i=0;i<16;i++){const w=P2.glow(i%3?0xffa030:0xa68bff,1.3);LS.add(w);wisps.push({w,x:(r()*2-1)*12,z:-r()*10+2,y:.5+r()*3,p:r()*6})}
LHAN.push(t=>{bats.forEach(q=>{const a=q.a+t*q.s;q.b.position.set(Math.cos(a)*q.rad,q.y+Math.sin(t*1.7+q.p),Math.sin(a)*q.rad*.6-8);q.b.rotation.y=-a;q.b.userData.flap(t*11+q.p)});
wisps.forEach(q=>{q.w.position.set(q.x+Math.sin(t*.5+q.p)*1.5,q.y+Math.sin(t*1.1+q.p)*.4,q.z+Math.cos(t*.4+q.p));q.w.material.opacity=.4+.35*Math.sin(t*2+q.p)});
jacks.forEach((j,i)=>j.userData.glow.color.setRGB(1,.72+.16*Math.sin(t*5+i*2),.2+.1*Math.sin(t*7+i)))})}
function setLC(col){if(LC){LS.remove(LC.g);disposeTree(LC.g)}LC=char(col);LC.setGun(-1);LS.add(LC.g)}
function lobby(on,col){init();cancelAnimationFrame(lraf);if(!on)return;R.shadowMap.needsUpdate=true;
if(!LS){LS=new T.Scene();const g=document.createElement('canvas');g.width=2;g.height=256;const x=g.getContext('2d'),gr=x.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#1fb5ff');gr.addColorStop(.55,'#5ad6ff');gr.addColorStop(1,'#b48cff');x.fillStyle=gr;x.fillRect(0,0,2,256);LS.background=new T.CanvasTexture(g);LS.fog=new T.Fog(0x9fd8ff,16,60);
LS.add(new T.HemisphereLight(0xffffff,0x8866cc,1));const d=new T.DirectionalLight(0xffffff,.9);d.position.set(4,8,6);d.castShadow=true;LS.add(d);
const M=(c,r=1)=>new T.MeshStandardMaterial({color:c,roughness:r,flatShading:true}),ad=(ge,c,px,py,pz,ry=0)=>{const m=new T.Mesh(ge,M(c));m.position.set(px,py,pz);m.rotation.y=ry;m.castShadow=m.receiveShadow=true;LS.add(m);return m};
const fl=ad(new T.PlaneGeometry(160,160),0x7a52c8,0,0,0);fl.rotation.x=-Math.PI/2;
[[-5,-3,2.2],[-3,-4.5,1.6],[4.8,-4,2.6],[7.2,-2,1.6],[-8.5,-6,3],[10,-6,2.2]].forEach((c,i)=>{ad(new T.BoxGeometry(c[2],c[2],c[2]),i%2?0xc08a5a:0xb07a4a,c[0],c[2]/2,c[1],c[0]);ad(new T.BoxGeometry(c[2]+.1,.12,c[2]+.1),0x7a4f2c,c[0],c[2]*.8,c[1],c[0])});
for(let i=0;i<22;i++)ad(new T.ConeGeometry(.15,.9,4),0x8be04a,(i%11-5)*2.2+Math.sin(i)*.8,.45,-2-Math.floor(i/11)*3);
for(let i=0;i<9;i++)ad(new T.ConeGeometry(9+i%3*3,10+i%4*4,4),i%2?0x3a63c9:0x4d7be0,(i-4)*14,3,-34-i%3*6);
for(let i=0;i<7;i++){const c=ad(new T.SphereGeometry(2.4,8,6),0xffffff,(i-3)*9,11+i%3*2,-20-i%2*8);c.scale.set(2.2,.7,1);c.castShadow=false;CL.push(c)}
LCam=new T.PerspectiveCamera(40,1,.1,100);LCam.position.set(-.6,1.5,6);LCam.lookAt(-.6,1.2,0);if(window.EVT&&EVT.on())lobbyHal()}
setLC(col||0x2f9bff);const t0=performance.now();let lt=t0;(function l(){lraf=requestAnimationFrame(l);const n=performance.now(),dt=Math.min(.1,(n-lt)/1000),t=(n-t0)/1000;lt=n;if(Qs.se>1)R.shadowMap.needsUpdate=(++fcnt%Qs.se)==0;
lobbyPartner();LHAN.forEach(f=>f(t));
CL.forEach((c,i)=>{c.position.x+=dt*(.4+i*.05);if(c.position.x>34)c.position.x=-34});
LCam.aspect=innerWidth/innerHeight;LCam.updateProjectionMatrix();
const nar=LCam.aspect<1,mx=PI?(nar?-1.1:.2):(nar?-.6:1.4);LC.g.position.x=mx;LC.g.rotation.y=Math.PI-.3+Math.sin(t*.5)*.08;LC.update(dt,{idle:1,t});
if(LP){LP.g.position.x=mx+(nar?1.3:1.9);LP.g.rotation.y=Math.PI+.3+Math.sin(t*.45+1)*.08;LP.update(dt,{idle:1,t:t+2.3})}R.render(LS,LCam)})()}
/* ---- portrait thumbnails: renders a skin on its own small transparent canvas and caches the PNG (used by every menu instead of emojis) ---- */
let TR,TS,TCam;const THC=new Map();
function thumb(v){v=+v||0;if(THC.has(v))return THC.get(v);let url='';
try{if(!TR){TR=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});TR.setPixelRatio(1);TR.setSize(168,210);TR.setClearColor(0x000000,0);TS=new T.Scene();TS.add(new T.HemisphereLight(0xffffff,0x8866cc,1.05));const d=new T.DirectionalLight(0xffffff,1.1);d.position.set(3,6,6);TS.add(d);const d2=new T.DirectionalLight(0x9fd8ff,.5);d2.position.set(-4,3,-4);TS.add(d2);TCam=new T.PerspectiveCamera(30,168/210,.1,60);TCam.position.set(0,1.15,7.6);TCam.lookAt(0,1.12,0)}
const c=char(v);c.setGun(-1);c.g.rotation.y=Math.PI-.38;TS.add(c.g);for(let i=0;i<4;i++)c.update(.05,{idle:1,t:1.4+i*.05});
TR.render(TS,TCam);url=TR.domElement.toDataURL('image/png');TS.remove(c.g);disposeTree(c.g)}catch(e){url=''}
THC.set(v,url);return url}
const input={down:a=>{if(run&&hold())down(a,false)},up:a=>up(a),
move(x,y){K.ax=x;K.ay=y;K.sprint=(x*x+y*y>.9&&y>.25)?1:0},
look(dx,dy){if(!run||paused())return;const k=.0042*(window.CFG?CFG.sens:1)*(cam.fov/75);yaw-=dx*k;pitch=Math.max(-PMAX,Math.min(PMAX,pitch-dy*k))},
tapAim(){if(!run||!hold())return;if(EDIT||buildT){down('aim',false);up('aim')}else K.aim=K.aim?0:1},
pause(){if(!run||phase=='ended')return;for(const k in K)K[k]=0;$('#pause').classList.add('on');$('#pconf').style.display='none';$('#pbtns').style.display='block'}};
return{input,start,lobby,leave,resume,quality,qinfo,thumb,thumbCached:v=>THC.get(+v||0),gunIcon:(wi,cols,sz)=>gunIcon(WEAPONS[wi],cols,sz),partner(i){PI=i;lobbyPartner()},kick(){LC&&LC.kick&&LC.kick()}}})();
