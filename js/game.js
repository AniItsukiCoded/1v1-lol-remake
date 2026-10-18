const Game=(()=>{
const T=THREE,WIN=3,$=s=>document.querySelector(s);
let R,sc,cam,me,op,db,mid,uid,ou,names,run=false,raf,last=0,pRef,oRef,shRef,onEnd,tick,pt;
const B=[],K={},FX=[],S={},P=new T.Vector3(),camP=new T.Vector3(),tg=new T.Vector3(),opv=new T.Vector3();
let yaw=0,pitch=.2,recoil=0,shake=0,oHP=100,oD=0,oT=0,sp=0,stepT=0,oRecoil=0,ph=0,wph=0,owph=0,corners,sp0,first,hist=[];
let mvf=1,landT=0,oLandT=0,oPrevAir=false,onLeave=null;
let phase='live',frz=0,rd=1,cdN=-1,ads=0,camD=4.2,deadK=0,odeadK=0,opt=0,airO=0;
const crates=[[0,0,6,6,2.4],[-12,8,4,4,2],[12,-8,4,4,2],[-10,-12,8,2,3],[10,12,8,2,3],[0,-14,3,3,1.5],[0,14,3,3,1.5],[-18,0,2,8,3],[18,0,2,8,3],[-6,10,3,3,1.2],[6,-10,3,3,1.2]];

/* ================= WEAPONS =================
   rate = ms between shots, rec = camera/arm kick, fall = [full-damage range, zero-ish range, min multiplier]
   Gun parts live in "gun space": +Z forward, +Y up, origin at the grip (world units). */
const WEAPONS=[
{id:'pickaxe',n:'PICKAXE',melee:1,dmg:34,bdmg:75,hs:1.4,rate:520,mag:0,res:0,rl:0,spread:0,pel:1,auto:0,rec:.25,shk:.12,fall:[999,999,1],range:3,zoom:1,col:'#c0c8dc',
 parts:[['b',.045,.045,.95,0,0,.3,'#8a5a30'],['b',.05,.5,.08,0,0,.78,'#c0c8dc'],['b',.06,.1,.12,0,0,.78,'#6b7390']],mz:0},
{id:'shotgun',n:'SHOTGUN',dmg:11,bdmg:9,hs:1.5,rate:800,mag:6,res:24,rl:2200,spread:.07,pel:8,auto:0,rec:.9,shk:.22,fall:[7,20,.15],zoom:1.2,col:'#c08a5a',
 parts:[['c',.03,.7,0,.045,.52,'#111'],['b',.08,.07,.2,0,.0,.45,'#c08a5a'],['b',.065,.1,.3,0,.03,.1,'#2b2f3a'],['b',.05,.1,.3,0,-.01,-.22,'#8a5a30'],['b',.045,.1,.05,0,-.06,-.02,'#1d2029']],mz:.88},
{id:'ar',n:'ASSAULT RIFLE',dmg:17,bdmg:13,hs:2,rate:105,mag:30,res:120,rl:1800,spread:.013,pel:1,auto:1,rec:.16,shk:.07,fall:[40,90,.7],zoom:1.4,col:'#ff9a2f',
 parts:[['b',.065,.1,.5,0,.04,.2,'#2b2f3a'],['b',.07,.08,.3,0,.03,.58,'#ff9a2f'],['c',.018,.25,0,.04,.86,'#111'],['b',.04,.22,.07,0,-.12,.24,'#1d2029'],['b',.05,.1,.28,0,0,-.2,'#2b2f3a'],['b',.045,.1,.05,0,-.06,-.02,'#1d2029'],['b',.02,.04,.12,0,.115,.25,'#111']],mz:.99}
];
function buildGun(w){const g=new T.Group();
w.parts.forEach(p=>{let m;if(p[0]=='b'){m=new T.Mesh(new T.BoxGeometry(p[1],p[2],p[3]),new T.MeshStandardMaterial({color:p[7],roughness:.5,metalness:.3}));m.position.set(p[4],p[5],p[6])}
else{m=new T.Mesh(new T.CylinderGeometry(p[1],p[1],p[2],8),new T.MeshStandardMaterial({color:p[6],roughness:.5,metalness:.3}));m.rotation.x=Math.PI/2;m.position.set(p[3],p[4],p[5])}
m.castShadow=true;g.add(m)});
const mz=new T.Object3D();mz.position.set(0,.045,w.mz);g.add(mz);g.userData.mz=mz;return g}
function gunIcon(w){const x=w.parts.map(p=>p[0]=='b'?[p[6],p[5],p[3],p[2],p[7]]:[p[5],p[4],p[2],p[1]*2,p[6]]);
const sx=z=>(z+.4)*100,sy=y=>(.22-y)*100;
return '<svg viewBox="0 0 150 50" width="76" height="26">'+x.map(r=>`<rect x="${sx(r[0]-r[2]/2)}" y="${sy(r[1]+r[3]/2)}" width="${r[2]*100}" height="${r[3]*100}" fill="${r[4]=='#111'||r[4]=='#0c0c18'?'#cfd6ee':r[4]=='#2b2f3a'||r[4]=='#1d2029'?'#e9ecff':r[4]}" opacity=".95"/>`).join('')+'</svg>'}
function init(){if(R)return;R=new T.WebGLRenderer({canvas:$('#c'),antialias:true});R.setPixelRatio(Math.min(2,devicePixelRatio));R.shadowMap.enabled=true;
sc=new T.Scene();cam=new T.PerspectiveCamera(75,1,.1,200);HL=new T.HemisphereLight(0xaaaaff,0x443355,.8);sc.add(HL);DL=new T.DirectionalLight(0xffd0a0,1);DL.position.set(30,40,20);DL.castShadow=true;DL.shadow.bias=-.0006;DL.shadow.normalBias=.05;DL.shadow.mapSize.set(2048,2048);Object.assign(DL.shadow.camera,{left:-40,right:40,top:40,bottom:-40});sc.add(DL);
addEventListener('resize',rs);rs();
const wb=$('#wbar');if(wb&&!wb.children.length)WEAPONS.forEach((w,i)=>{const d=document.createElement('div');d.className='ws';d.innerHTML=`<i>${i+1}</i>${gunIcon(w)}<b>${w.n}</b>`;d.onclick=()=>run&&selectW(i);wb.appendChild(d)});
const bq=$('#bq');if(bq&&!bq.children.length){[['Z','wall','▮'],['X','floor','▬'],['C','ramp','◢'],['V','roof','▲']].forEach(([k,t,ic])=>{const d=document.createElement('div');d.className='bs';d.dataset.t=t;d.innerHTML=`<i>${k}</i><span>${ic}</span><b>${BPIECE[t].n}</b>`;d.onclick=()=>run&&setBuild(t);bq.appendChild(d)});const m=document.createElement('div');m.id='mats';bq.appendChild(m)}
addEventListener('keydown',e=>{K[e.code]=1;if(!run)return;if(e.code=='KeyR')reload();if(e.code=='KeyM')SFX.music();if(e.code=='KeyZ')setBuild('wall');if(e.code=='KeyX')setBuild('floor');if(e.code=='KeyC')setBuild('ramp');if(e.code=='KeyV')setBuild('roof');const n=+e.key;if(n>=1&&n<=WEAPONS.length)selectW(n-1)});addEventListener('keyup',e=>K[e.code]=0);
addEventListener('wheel',e=>{if(!run||document.pointerLockElement!=R.domElement)return;selectW((S.w+(e.deltaY>0?1:-1)+WEAPONS.length)%WEAPONS.length)},{passive:true});
addEventListener('contextmenu',e=>{if(run)e.preventDefault()});
addEventListener('mousemove',e=>{if(!run||document.pointerLockElement!=R.domElement)return;const k=.0024*(window.CFG?CFG.sens:1)*(cam.fov/75);yaw-=e.movementX*k;pitch=Math.max(-.6,Math.min(.9,pitch-e.movementY*k))});
addEventListener('mousedown',e=>{if(!run)return;if(document.pointerLockElement!=R.domElement){R.domElement.requestPointerLock();return}if(e.button==2)K.rm=1;else if(e.button==0)K.m=1});
addEventListener('mouseup',e=>{if(e.button==2)K.rm=0;else if(e.button==0){K.m=0;S.lat=0}});
document.addEventListener('pointerlockchange',()=>{if(!run)return;const l=!!document.pointerLockElement;if(l){S.hadLock=1;$('#resume').style.display='none';$('#pause').classList.remove('on')}
else{K.m=0;K.rm=0;K.KeyW=K.KeyA=K.KeyS=K.KeyD=K.ShiftLeft=K.Space=0;if(S.hadLock&&phase!='ended'){$('#pause').classList.add('on');$('#pconf').style.display='none';$('#pbtns').style.display='block'}else $('#resume').style.display='grid'}});
document.addEventListener('pointerlockerror',()=>{if(run&&!document.pointerLockElement&&S.hadLock)setTimeout(()=>{if(run&&!document.pointerLockElement)R.domElement.requestPointerLock()},500)});
document.addEventListener('visibilitychange',()=>{oT=performance.now()});
$('#resume').onclick=()=>R.domElement.requestPointerLock();
$('#pres').onclick=()=>{SFX.click();R.domElement.requestPointerLock()};
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
function buildMap(i){const M=MAPS[i];if(MG)sc.remove(MG);MG=new T.Group();sc.add(MG);B.length=0;for(let j=FX.length-1;j>=0;j--)if(FX[j].ring)FX.splice(j,1);
const hx=c=>'#'+c.toString(16).padStart(6,'0'),g=document.createElement('canvas');g.width=2;g.height=256;let x=g.getContext('2d'),r=x.createLinearGradient(0,0,0,256);M.sky.forEach((c,j)=>r.addColorStop(j/2,c));x.fillStyle=r;x.fillRect(0,0,2,256);sc.background=new T.CanvasTexture(g);
sc.fog=new T.Fog(M.fog,M.fd[0],M.fd[1]);HL.color.setHex(M.hl[0]);HL.groundColor.setHex(M.hl[1]);HL.intensity=M.hl[2];DL.color.setHex(M.dl);
const mt=c=>new T.MeshStandardMaterial({color:c,roughness:.9,flatShading:true}),add=(ge,c,px,py,pz)=>{const m=new T.Mesh(ge,mt(c));m.position.set(px,py,pz);m.castShadow=m.receiveShadow=true;MG.add(m);return m},
b=(px,pz,w,d,h,c)=>{add(new T.BoxGeometry(w,h,d),c,px,h/2,pz);B.push({x:px,z:pz,w,d,h})},
s=(px,pz,dx,dz,n,sh,w,len)=>{for(let k=0;k<n;k++)b(px+dx*len*(k+.5),pz+dz*len*(k+.5),dx?len:w,dx?w:len,sh*(n-k),0xbfc4da)};
const cv=document.createElement('canvas');cv.width=cv.height=2;x=cv.getContext('2d');x.fillStyle=hx(M.gc[0]);x.fillRect(0,0,2,2);x.fillStyle=hx(M.gc[1]);x.fillRect(1,0,1,1);x.fillRect(0,1,1,1);
const tx=new T.CanvasTexture(cv);tx.wrapS=tx.wrapT=T.RepeatWrapping;tx.magFilter=T.NearestFilter;tx.repeat.set(8,8);
const fl=new T.Mesh(new T.PlaneGeometry(64,64),new T.MeshStandardMaterial({map:tx,roughness:1}));fl.rotation.x=-Math.PI/2;fl.receiveShadow=true;MG.add(fl);
const fr=add(new T.PlaneGeometry(700,700),M.far,0,-.05,0);fr.rotation.x=-Math.PI/2;fr.castShadow=false;
for(let n=0;n<14;n++){const a=n/14*6.283,rr=85+n%3*12,h=18+(n*7%5)*7;add(new T.ConeGeometry(16+n%4*4,h,4),M.mt,Math.cos(a)*rr,h/2-1,Math.sin(a)*rr)}
for(let n=0;n<26;n++){const a=n*2.4,rr=38+n%5*6,px=Math.cos(a)*rr,pz=Math.sin(a)*rr;
if(M.k==0){add(new T.CylinderGeometry(.3,.4,2,6),0x6b4a2b,px,1,pz);add(new T.ConeGeometry(1.8,4.5,6),0x2e8b3d,px,4,pz)}
else if(M.k==1)add(new T.ConeGeometry(.25,1.4,4),0x8be04a,px,.7,pz);
else if(M.k==2&&n<18){const h=14+n*5%25;add(new T.BoxGeometry(6+n%3*3,h,6+n%2*4),0x35395e,px*1.3,h/2,pz*1.3)}
else if(M.k==3&&n<12){const t=new T.Mesh(new T.TorusGeometry(2+n%3,.12,8,24),new T.MeshBasicMaterial({color:n%2?0xff4d9d:0x38f5c8}));t.position.set(Math.cos(n)*45,18+n*2,Math.sin(n)*45);t.rotation.x=n;t.userData.s=.2+n*.03;MG.add(t);FX.push({ring:t})}}
M.p(b,s)}
/* ================= CHARACTER RIG (1v1.lol Drop Kick model, always used) ================= */
let SKG;
const AX={x:new T.Vector3(1,0,0),y:new T.Vector3(0,1,0),z:new T.Vector3(0,0,1)};
function skinData(){const D=window.SKIN;if(!D)return null;if(SKG)return SKG;
const bin=Uint8Array.from(atob(D.blob),c=>c.charCodeAt(0)).buffer,F=(n,C)=>new C(bin,D.meta[n][0],D.meta[n][1]/C.BYTES_PER_ELEMENT),ge=new T.BufferGeometry();
const ji=F('ji',Uint8Array).slice(0,D.vc*4),sw=F('sw',Float32Array).slice(0,D.vc*4);
ge.setAttribute('position',new T.BufferAttribute(F('pos',Float32Array).slice(0,D.vc*3),3));ge.setAttribute('normal',new T.BufferAttribute(F('nor',Float32Array).slice(0,D.vc*3),3));
ge.setAttribute('skinIndex',new T.BufferAttribute(new Uint16Array(ji),4));ge.setAttribute('skinWeight',new T.BufferAttribute(sw,4));
ge.setIndex(new T.BufferAttribute(F('idx',D.i16?Uint16Array:Uint32Array).slice(0,D.ic),1));ge.computeBoundingBox();
const used=new Set();for(let i=0;i<ji.length;i++)if(sw[i]>.001)used.add(ji[i]);
/* damp the kick clip's horizontal root motion so the character stays roughly in place */
const tracks=D.tracks.map(([n,p,t,v])=>{if(n==D.joints[1]&&p=='translation'){v=v.slice();const x0=v[0],z0=v[2];for(let i=0;i<v.length;i+=3){v[i]=x0+(v[i]-x0)*.2;v[i+2]=z0+(v[i+2]-z0)*.2}}
return p=='rotation'?new T.QuaternionKeyframeTrack('n'+n+'.quaternion',t,v):new T.VectorKeyframeTrack('n'+n+(p=='scale'?'.scale':'.position'),t,v)});
return SKG={ge,ibm:F('ibm',Float32Array),used,clip:new T.AnimationClip('kick',D.dur,tracks)}}

function rig(col){const D=window.SKIN,G=skinData();if(!G)return null;
const J=new Set(D.joints),mat=new T.MeshStandardMaterial({color:col,roughness:.6,skinning:true,side:T.DoubleSide}),root=new T.Group();
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
/* gun mounted on the right hand (gun +Z -> hand +Y, gun up -> -hand Z) */
const mount=new T.Group();mount.rotation.x=-Math.PI/2;mount.position.set(0,.07,0);mount.scale.setScalar(1/(100*k2));BN.RightHand_026.b.add(mount);
const guns=WEAPONS.map(buildGun),l=new T.PointLight(0xffcc66,0,8);let gi=-1;
const mx=new T.AnimationMixer(root),ac=mx.clipAction(G.clip);ac.setLoop(T.LoopOnce,1);ac.clampWhenFinished=true;let kT=0;
const q=new T.Quaternion(),acc=new T.Quaternion(),ax=new T.Vector3(),X=AX.x,Y=AX.y,Z=AX.z;
const rot=(n,list)=>{const r=BN[n];acc.identity();for(const[a,v]of list){if(!v)continue;ax.copy(a).applyQuaternion(r.bwi);q.setFromAxisAngle(ax,v);acc.premultiply(q)}r.b.quaternion.copy(r.bq).multiply(acc)};
function setGun(i){gi=i;if(i==0){mount.quaternion.set(.0898,.7847,.0953,.6058);mount.position.set(0,.065,.02)}else{mount.rotation.set(-Math.PI/2,0,0);mount.position.set(0,.07,0)}guns.forEach((x,j)=>{if(x.parent)x.parent.remove(x)});if(l.parent)l.parent.remove(l);if(i>=0){mount.add(guns[i]);guns[i].add(l);l.position.copy(guns[i].userData.mz.position)}}
/* o: k walk 0..1, w walk phase, pitch aim, rec recoil, air 0..1 + u jump velocity -1..1 (smoothed), land 0..1, gun weapon index (-1 = builder), swing 0..1 (pickaxe), t time, idle (lobby) */
const ease=x=>x*x*(3-2*x),mixv=(a,b,x)=>a+(b-a)*x,FING=ALL.filter(r=>/^(Left|Right)Hand(Index|Middle|Thumb)\d/.test(r.nm));
function curl(side,a){for(const r of FING){if(r.nm.indexOf(side)!=0)continue;const th=/Thumb/.test(r.nm);q.setFromAxisAngle(X,a*(th?.45:1));r.b.quaternion.copy(r.bq).multiply(q)}}
function poseT(o){for(const r of ALL){r.b.position.copy(r.bp);r.b.quaternion.copy(r.bq)}
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
const gun=o.gun==null?2:o.gun,sw=o.swing==null?-1:o.swing,base=.3;let ang=-base,tw=0,sx=0;
if(gun<=0&&sw>=0){if(sw<.32){const f=ease(sw/.32);ang=mixv(-base,-2.7,f);tw=-.25*f}else if(sw<.55){const f=ease((sw-.32)/.23);ang=mixv(-2.7,-.05,f);tw=mixv(-.25,.35,f);sx=.22*f}else{const f=ease((sw-.55)/.45);ang=mixv(-.05,-base,f);tw=mixv(.35,0,f);sx=.22*(1-f)}}
const lean=.07+.1*k+rc*.08+ld*.12+air*Math.max(0,-u)*.05,br=Math.sin(t*1.9)*.012;
rot('Hips_01',[[Z,sh*.025],[Y,s*.1*k]]);
rot('Spine_00',[[X,lean*.5],[Y,-s*.1*k]]);rot('Spine1_02',[[X,lean*.5+br],[Z,-sh*.02],[Y,tw*.5]]);rot('Spine2_03',[[X,lean*.3-p*.25+sx],[Y,s*.07*k+tw*.5]]);rot('Neck_04',[[X,-p*.25-lean*.4]]);rot('Head_05',[[X,-p*.3],[Y,Math.sin(t*.4)*.05*idle]]);
if(gun<=0){/* pickaxe / builder: fist at the hip height, pick held upright (like Fortnite), left arm swings with the run */
const rb=Math.sin(t*1.9)*.02;
rot('RightArm_024',[[Z,1.15],[Y,-.05],[X,ang+rb]]);rot('RightForeArm_025',[[Y,1.25+(sw>=0&&sw<.32?.25:0)]]);rot('RightHand_026',[[Z,-.1]]);
const la=tr*.75;rot('LeftArm_08',[[Z,-1.25],[Y,.12],[X,la]]);rot('LeftForeArm_09',[[Y,-.4-Math.max(0,-la)*.5]]);rot('LeftHand_010',[[Z,.1]]);
curl('Right',1.15);curl('Left',.5);return}
const ap=-(p+rc*.55);
rot('RightArm_024',[[Y,Math.PI/2*.97],[X,ap]]);rot('RightForeArm_025',[[Y,.38]]);rot('RightHand_026',[[Y,.12]]);
rot('LeftArm_08',[[Y,-Math.PI/2*.97],[X,ap]]);rot('LeftForeArm_09',[[Y,-1.05]]);rot('LeftHand_010',[[Y,-.2]]);curl('Right',.8);curl('Left',.8)}
/* smoothing layer: every bone eases toward its target pose so jump -> fall, weapon swaps, swings never snap */
const st={air:0,u:0,ld:0,init:0,hy:0},sq=ALL.map(r=>r.b.quaternion.clone());
function pose(o,dt){const sa=1-Math.exp(-dt*14);st.air+=((o.air?1:0)-st.air)*sa;st.u+=(Math.max(-1,Math.min(1,(o.vy||0)/9))-st.u)*(1-Math.exp(-dt*10));
const lt=o.land||0;st.ld+=(lt-st.ld)*(1-Math.exp(-dt*(lt>st.ld?30:8)));
poseT(Object.assign({},o,{air:o.idle?0:st.air,u:st.u,land:st.ld}));
const a=st.init?1-Math.exp(-dt*((o.swing||-1)>=0?42:20)):1;
ALL.forEach((r,i)=>{if(st.init)sq[i].slerp(r.b.quaternion,a);else sq[i].copy(r.b.quaternion);r.b.quaternion.copy(sq[i])});
const hb=BN.Hips_01.b;st.hy=st.init?st.hy+(hb.position.y-st.hy)*a:hb.position.y;hb.position.y=st.hy;st.init=1}
return{g,l,mat,pose,setGun,
kick(){ac.reset();ac.paused=false;ac.play();kT=G.clip.duration},kicking:()=>kT>0,
update(dt,o){if(kT>0){kT-=dt;mx.update(dt);st.init=0;if(kT<=0){ac.stop()}return}pose(o,dt)},
muzzle(v){g.updateMatrixWorld(true);return guns[Math.max(0,gi)].userData.mz.getWorldPosition(v||new T.Vector3())}}}

/* minimal stand-in only used if js/skin.js failed to load */
function fallbackRig(col){const g=new T.Group();g.rotation.order='YXZ';const m=new T.MeshStandardMaterial({color:col,roughness:.6});
const b=new T.Mesh(new T.BoxGeometry(.6,1.5,.4),m);b.position.y=.95;b.castShadow=true;g.add(b);const l=new T.PointLight(0xffcc66,0,8);l.position.set(0,1.4,-.6);g.add(l);
return{g,l,mat:m,pose(){},setGun(){},kick(){},kicking:()=>false,update(){},muzzle(v){return(v||new T.Vector3()).set(g.position.x,g.position.y+1.4,g.position.z)}}}
function char(col){return rig(col)||fallbackRig(col)}
function rs(){R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
function tag(t){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='bold 36px sans-serif';x.textAlign='center';x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=6;x.strokeText(t,128,44);x.fillText(t,128,44);
const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false}));s.scale.set(2,.5,1);s.position.y=2.4;return s}
function rayBox(o,d,b){let t0=0,t1=1e9;const mn=[b.x-b.w/2,b.y0||0,b.z-b.d/2],mx=[b.x+b.w/2,b.h,b.z+b.d/2],oo=[o.x,o.y,o.z],dd=[d.x,d.y,d.z];
for(let i=0;i<3;i++){if(Math.abs(dd[i])<1e-8){if(oo[i]<mn[i]||oo[i]>mx[i])return 1e9}else{let a=(mn[i]-oo[i])/dd[i],c=(mx[i]-oo[i])/dd[i];if(a>c)[a,c]=[c,a];t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)return 1e9}}return t0}
function raySph(o,d,c,r){const x=c.clone().sub(o),t=x.dot(d);if(t<0&&x.lengthSq()>r*r)return 1e9;const q=x.lengthSq()-t*t;return q>r*r?1e9:Math.max(0,t-Math.sqrt(r*r-q))}
/* ray vs capsule (segment a-b, radius r) -> distance or 1e9 */
function rayCap(o,d,a,b,r){const ba=b.clone().sub(a),oa=o.clone().sub(a),baba=ba.dot(ba),bard=ba.dot(d),baoa=ba.dot(oa),rdoa=d.dot(oa),oaoa=oa.dot(oa);
const A=baba-bard*bard;let best=1e9;
if(A>1e-8){const Bq=baba*rdoa-baoa*bard,C=baba*oaoa-baoa*baoa-r*r*baba,h=Bq*Bq-A*C;if(h>=0){const t=(-Bq-Math.sqrt(h))/A,y=baoa+t*bard;if(y>0&&y<baba&&t>0)best=t}}
for(const e of[a,b]){const t=raySph(o,d,e,r);if(t<best)best=t}return best}
const TOL=.34;
const hits=p=>B.some(b=>!b.ray&&p.y<b.h-TOL&&p.y+1.8>(b.y0||0)+.05&&Math.abs(p.x-b.x)<b.w/2+.45&&Math.abs(p.z-b.z)<b.d/2+.45)||RPL.some(r=>{const h=rampH(r,p,.45);return h!=null&&h-p.y>.45&&p.y+1.8>r.y0+.05});
const headHit=(p,vy,dt)=>B.some(b=>(b.y0||0)>p.y+1.2&&Math.abs(p.x-b.x)<b.w/2+.3&&Math.abs(p.z-b.z)<b.d/2+.3&&p.y+1.8+vy*dt>b.y0);
const gnd=p=>{let h=0;B.forEach(b=>{if(!b.ray&&p.y>=b.h-TOL&&Math.abs(p.x-b.x)<b.w/2+.3&&Math.abs(p.z-b.z)<b.d/2+.3)h=Math.max(h,b.h)});RPL.forEach(r=>{const y=rampH(r,p,.3);if(y!=null&&p.y>=y-.5)h=Math.max(h,y)});return h};
const dirv=()=>new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
const castRay=(o,d,mx=120)=>{let L=mx,id=null;B.forEach(b=>{const t=rayBox(o,d,b);if(t<L){L=t;id=b.bid||null}});return{L,id}};
const wallDist=(o,d,mx=120)=>castRay(o,d,mx).L;
const r3=x=>Math.round(x*1000)/1000;
function tracer(a,b,col=0xfff2a0,th=.04){const L=a.distanceTo(b);if(L<.05)return;const m=new T.Mesh(new T.BoxGeometry(th,th,L),new T.MeshBasicMaterial({color:col,transparent:true}));m.position.copy(a).lerp(b,.5);m.lookAt(b);sc.add(m);FX.push({m,life:.12,fade:1})}
function sparks(p,col=0xff4d6d,n=10){for(let i=0;i<n;i++){const m=new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshBasicMaterial({color:col,transparent:true}));m.position.copy(p);sc.add(m);FX.push({m,v:new T.Vector3(Math.random()-.5,Math.random()*.8,Math.random()-.5).multiplyScalar(7),life:.6,g:1})}}
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
   Z wall · X floor · C stairs · V roof. Press a key to enter build mode (ghost preview), click / hold click to place, pick a weapon to leave.
   Grid: 4u cells, 3u levels. Walls/floors/roofs are solid boxes, ramps use a real sloped surface for movement (and stepped boxes for bullets). */
const GRID=4,LVL=3,COST=10,BPIECE={wall:{hp:150,n:'WALL'},floor:{hp:140,n:'FLOOR'},ramp:{hp:150,n:'STAIRS'},roof:{hp:120,n:'ROOF'}};
const BLD={},RPL=[],TW=[];let BG,GH,bseq=0,bcool=0,buildT=null,mats=500,visY=0;const bcnt={};
const rampH=(r,p,m)=>{const a=(p.x-r.x)*r.dx+(p.z-r.z)*r.dz,c=Math.abs((p.x-r.x)*r.dz-(p.z-r.z)*r.dx);return c<GRID/2+m&&a>-GRID/2-m&&a<GRID/2+m?r.y0+LVL*Math.max(0,Math.min(1,(a+GRID/2)/GRID)):null};
function bKey(t,x,y,z,r){return t+'|'+Math.round(x*2)+'|'+Math.round(y*2)+'|'+Math.round(z*2)+'|'+r}
function wedgeGeo(){const g=new T.BufferGeometry(),v=[-2,0,-2, 2,0,-2, 2,0,2, -2,0,2, -2,3,2, 2,3,2],i=[0,2,1,0,3,2, 3,4,5,3,5,2, 0,1,5,0,5,4, 0,4,3, 1,2,5];
g.setAttribute('position',new T.BufferAttribute(new Float32Array(v),3));g.setIndex(i);g.computeVertexNormals();return g}
const roofGeo=()=>{const g=new T.ConeGeometry(2.83,1.5,4);g.rotateY(Math.PI/4);g.translate(0,.75,0);return g};
function pieceBoxes(t,x,y,z,r){/* y = base height of the piece */
if(t=='wall')return[r?{x,z,w:.3,d:GRID,y0:y,h:y+LVL}:{x,z,w:GRID,d:.3,y0:y,h:y+LVL}];
if(t=='floor')return[{x,z,w:GRID,d:GRID,y0:y-.3,h:y}];
if(t=='roof')return[[GRID,.5],[GRID*.66,1],[GRID*.33,1.5]].map(([w,h])=>({x,z,w,d:w,y0:y,h:y+h}));
const dx=[0,1,0,-1][r],dz=[-1,0,1,0][r],out=[];for(let k=0;k<10;k++){const o=-GRID/2+.2+k*.4;out.push({x:x+dx*o,z:z+dz*o,w:dx?.4:GRID,d:dx?GRID:.4,y0:y,h:y+(k+1)*.3,ray:1})}return out}
function pieceMesh(t,x,y,z,r,mat,boxes){let m;
if(t=='ramp'){m=new T.Mesh(wedgeGeo(),mat);m.position.set(x,y,z);m.rotation.y=[Math.PI,Math.PI/2,0,-Math.PI/2][r]}
else if(t=='roof'){m=new T.Mesh(roofGeo(),mat);m.position.set(x,y,z)}
else{const b=boxes[0];m=new T.Mesh(new T.BoxGeometry(b.w,b.h-b.y0,b.d),mat);m.position.set(b.x,(b.y0+b.h)/2,b.z)}return m}
function addBuild(id,t,x,y,z,r,own){if(BLD[id])return false;const key=bKey(t,x,y,z,r);for(const k in BLD)if(BLD[k].key==key)return false;
if(!BG){BG=new T.Group();sc.add(BG)}
const boxes=pieceBoxes(t,x,y,z,r);boxes.forEach(b=>{b.bid=id;B.push(b)});
const col=own?0x7cc0ff:0xff9a9a,mat=new T.MeshStandardMaterial({color:col,roughness:.85,flatShading:true});const m=pieceMesh(t,x,y,z,r,mat,boxes);
m.castShadow=true;m.receiveShadow=false;const ln=new T.LineSegments(new T.EdgesGeometry(m.geometry,25),new T.LineBasicMaterial({color:own?0x16306b:0x6b1616}));m.add(ln);
m.scale.setScalar(.82);TW.push({m,t:0});BG.add(m);
let rp=null;if(t=='ramp'){rp={id,x,z,dx:[0,1,0,-1][r],dz:[-1,0,1,0][r],y0:y};RPL.push(rp)}
const hp=BPIECE[t].hp;BLD[id]={id,key,t,x,y,z,r,hp,max:hp,boxes,rp,mesh:m,line:ln,own,col};bcnt[own?1:0]=(bcnt[own?1:0]||0)+1;return true}
function removeBuild(id,quiet){const b=BLD[id];if(!b)return;b.boxes.forEach(x=>{const i=B.indexOf(x);if(i>=0)B.splice(i,1)});if(b.rp){const i=RPL.indexOf(b.rp);if(i>=0)RPL.splice(i,1)}
if(BG)BG.remove(b.mesh);[b.mesh.geometry,b.line.geometry].forEach(g=>g&&g.dispose&&g.dispose());const i=TW.findIndex(x=>x.m===b.mesh);if(i>=0)TW.splice(i,1);
bcnt[b.own?1:0]--;delete BLD[id];if(!quiet)sparks(new T.Vector3(b.x,b.y+1.2,b.z),b.own?0x7cc0ff:0xff9a9a,14)}
function clearBuilds(){for(const id in BLD)removeBuild(id,true);bcnt[0]=bcnt[1]=0}
function damageBuild(id,d){const b=BLD[id];if(!b)return;b.hp-=d;if(b.hp<=0){removeBuild(id);return}
const k=.5+.5*b.hp/b.max,c=new T.Color(b.col);c.multiplyScalar(k);b.mesh.material.color.copy(c)}
function cardinal(){const fx=-Math.sin(yaw),fz=-Math.cos(yaw);return Math.abs(fx)>Math.abs(fz)?(fx>0?[1,0,1]:[-1,0,3]):(fz>0?[0,1,2]:[0,-1,0])}
function pieceSpot(t,n){const[dx,dz,rr]=cardinal(),L=Math.max(0,Math.floor((P.y+.5)/LVL)),yb=L*LVL,cx=Math.round(P.x/GRID)*GRID,cz=Math.round(P.z/GRID)*GRID;
if(t=='wall'){if(dx){const e=(Math.ceil((P.x*dx+.6)/GRID-.5)+.5+n)*GRID;return{x:e*dx,y:yb,z:cz,r:1}}const e=(Math.ceil((P.z*dz+.6)/GRID-.5)+.5+n)*GRID;return{x:cx,y:yb,z:e*dz,r:0}}
if(t=='floor'||t=='roof')return{x:cx+dx*GRID,y:Math.max(L,1)*LVL,z:cz+dz*GRID,r:0};
return{x:cx+dx*GRID,y:yb,z:cz+dz*GRID,r:rr}}
function blocked(boxes){const ps=[[P.x,P.y,P.z]];if(op)ps.push([opv.x,opv.y,opv.z]);
return boxes.some(b=>Math.abs(b.x)+b.w/2>30||Math.abs(b.z)+b.d/2>30||ps.some(q=>Math.abs(q[0]-b.x)<b.w/2+.5&&Math.abs(q[2]-b.z)<b.d/2+.5&&q[1]<b.h-.05&&q[1]+1.8>b.y0+.05))}
/* first free candidate spot for this piece, or the best (blocked) one for the red ghost */
function findSpot(t){let first=null;for(let n=0;n<(t=='wall'?3:1);n++){const sp1=pieceSpot(t,n),boxes=pieceBoxes(t,sp1.x,sp1.y,sp1.z,sp1.r),key=bKey(t,sp1.x,sp1.y,sp1.z,sp1.r);
const dup=Object.values(BLD).some(b=>b.key==key),bad=blocked(boxes)||dup;sp1.boxes=boxes;sp1.bad=bad;sp1.dup=dup;if(!first)first=sp1;if(!bad)return sp1}return first}
function place(t){const n=performance.now();if(phase!='live'||S.dead||n<bcool)return;bcool=n+110;
if(mats<COST){SFX.empty();shake+=.04;return}
const sp1=findSpot(t);if(sp1.bad){if(!sp1.dup)SFX.empty();return}
const mine=Object.keys(BLD).filter(k=>BLD[k].own);if(mine.length>=50)removeBuild(mine[0],true);
const id=uid.slice(-4)+'_'+rd+'_'+(bseq++);if(!addBuild(id,t,sp1.x,sp1.y,sp1.z,sp1.r,true))return;mats-=COST;SFX.swap();hud();
shRef.push({by:uid,k:'b',id,t,x:r3(sp1.x),y:r3(sp1.y),z:r3(sp1.z),r:sp1.r})}
function setBuild(t){if(S.dead||phase=='over'||phase=='ended')return;if(buildT==t){exitBuild();return}clearTimeout(S.rlT);S.rl=0;buildT=t;S.lat=0;me.setGun(-1);SFX.swap();ghostShow();hud();send()}
function exitBuild(){if(!buildT)return;buildT=null;if(GH)GH.visible=false;me.setGun(S.w);hud();send()}
const GHM={};
function ghostInit(){if(GH)return;GH=new T.Group();GH.visible=false;sc.add(GH);const mat=new T.MeshBasicMaterial({color:0x66b3ff,transparent:true,opacity:.42,depthWrite:false});GH.userData.mat=mat;
GHM.wall=new T.Mesh(new T.BoxGeometry(1,1,1),mat);GHM.floor=new T.Mesh(new T.BoxGeometry(1,1,1),mat);GHM.ramp=new T.Mesh(wedgeGeo(),mat);GHM.roof=new T.Mesh(roofGeo(),mat);for(const k in GHM){GHM[k].visible=false;GH.add(GHM[k])}}
function ghostShow(){ghostInit();GH.visible=true}
function ghostUpdate(){if(!buildT||!GH)return;const t=buildT,sp1=findSpot(t),m=GHM[t];for(const k in GHM)GHM[k].visible=k==t;
if(t=='wall'){m.position.set(sp1.x,sp1.y+LVL/2,sp1.z);m.scale.set(sp1.r?.3:GRID,LVL,sp1.r?GRID:.3)}
else if(t=='floor'){m.position.set(sp1.x,sp1.y-.15,sp1.z);m.scale.set(GRID,.3,GRID)}
else if(t=='ramp'){m.position.set(sp1.x,sp1.y,sp1.z);m.rotation.y=[Math.PI,Math.PI/2,0,-Math.PI/2][sp1.r]}
else{m.position.set(sp1.x,sp1.y,sp1.z)}
GH.userData.mat.color.setHex(sp1.bad||mats<COST?0xff5c5c:0x66b3ff)}

/* ================= WEAPON STATE ================= */
let WS=[];
const curW=()=>WEAPONS[S.w],curS=()=>WS[S.w];
function selectW(i){if(S.dead||phase=='over'||phase=='ended')return;if(buildT){exitBuild();if(i==S.w)return}if(i==S.w)return;clearTimeout(S.rlT);S.rl=0;S.w=i;S.eq=performance.now()+260;S.lat=0;me.setGun(i);SFX.swap();hud()}
function hud(){const w=curW(),st=curS();$('#hp').style.width=Math.max(0,S.hp)+'%';$('#hpt').textContent=Math.max(0,Math.ceil(S.hp));
const a=$('#ammo');$('#am').textContent=w.melee?'⛏':S.rl?'…':st.mag;$('#amr').textContent=w.melee?'':'/'+st.res;$('#wnm').textContent=w.n;a.className=!w.melee&&st.mag<=Math.ceil(w.mag*.25)?'low':'';
document.querySelectorAll('#wbar .ws').forEach((e,i)=>e.classList.toggle('on',!buildT&&i==S.w));document.querySelectorAll('#bq .bs').forEach(e=>e.classList.toggle('on',e.dataset.t==buildT));const mt=$('#mats');if(mt)mt.textContent='🪵 '+mats;if(buildT)$('#wnm').textContent='BUILD · '+BPIECE[buildT].n;
$('#s1').textContent=oD;$('#s2').textContent=S.deaths;$('#rnd').textContent='ROUND '+rd+' · FIRST TO '+WIN}
function reload(){const w=curW(),st=curS();if(w.melee||S.rl||st.mag==w.mag||st.res<=0||S.dead||phase!='live')return;S.rl=1;SFX.reload();hud();const i=S.w;
S.rlT=setTimeout(()=>{if(!run||S.w!=i)return;const n=Math.min(w.mag-st.mag,st.res);st.mag+=n;st.res-=n;S.rl=0;hud()},w.rl)}
function shoot(){const w=curW(),st=curS(),n=performance.now();if(phase!='live'||S.dead||S.rl||n<S.nextShot||n<S.eq)return;
if(!w.auto&&S.lat)return;
if(!w.melee&&st.mag<=0){SFX.empty();S.nextShot=n+250;reload();return}
if(!w.melee)st.mag--;S.nextShot=n+w.rate;S.lat=1;recoil=Math.min(1.2,recoil+w.rec);shake+=w.shk;if(w.melee)S.swingT=n;
const d=dirv(),rt=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),up=new T.Vector3().crossVectors(rt,d).normalize();
const o=camP.clone().addScaledVector(d,camD+.3),mu=w.melee?o:me.muzzle(),spr=w.spread*(1+(sp>3?.9:0)+(S.g?0:1.5))*(1-ads*.65),D=[],L=[],bd={},mx=w.melee?w.range:110;let harv=0;
for(let i=0;i<w.pel;i++){const a=Math.random()*6.283,r=(w.pel>1?Math.sqrt(Math.random()):Math.random())*spr,v=d.clone().addScaledVector(rt,Math.cos(a)*r).addScaledVector(up,Math.sin(a)*r).normalize(),c=castRay(o,v,mx),l=c.L;
if(c.id&&l<mx)bd[c.id]=(bd[c.id]||0)+w.bdmg;else if(w.melee&&l<mx&&!harv){harv=1;mats=Math.min(999,mats+25);SFX.hit()}
D.push(r3(v.x),r3(v.y),r3(v.z));L.push(Math.round(l*10)/10);if(!w.melee)tracer(mu,o.clone().addScaledVector(v,l),0xfff2a0,w.pel>1?.025:.04)}
const bda=Object.keys(bd).map(k=>[k,bd[k]]);bda.forEach(([id,dm])=>damageBuild(id,dm));
if(!w.melee)flash(me);SFX.gun(w.id);$('#cross').classList.add('f');setTimeout(()=>$('#cross').classList.remove('f'),90);
shRef.push({by:uid,w:S.w,o:[r3(o.x),r3(o.y),r3(o.z)],m:[r3(mu.x),r3(mu.y),r3(mu.z)],D,L,bd:bda,pk:Math.round(P.y*10)/10});hud();
if(!w.melee&&st.mag<=0&&st.res>0)setTimeout(()=>{if(run&&!S.rl&&S.w==WEAPONS.indexOf(w)&&curS().mag<=0)reload()},w.rate+150)}
function flash(c){c.l.intensity=4;setTimeout(()=>c.l.intensity=0,50)}
/* incoming shot (we are the target): victim-side hit detection, with ~110ms of lag compensation */
function onShot(s){if(s.by===uid)return;
if(s.k=='b'){addBuild(s.id,s.t,s.x,s.y,s.z,s.r,false);return}
const w=WEAPONS[s.w|0]||WEAPONS[0],o=new T.Vector3(...s.o),n=(s.L||[]).length||1,mu=new T.Vector3(...s.m);
(s.bd||[]).forEach(([id,dm])=>damageBuild(id,dm));
if(!w.melee)for(let i=0;i<n;i++){const v=new T.Vector3(s.D[i*3],s.D[i*3+1],s.D[i*3+2]);tracer(mu,o.clone().addScaledVector(v,s.L[i]),0xff9ab0,w.pel>1?.025:.04)}
if(w.melee)op.swingT=performance.now();else flash(op);oRecoil=Math.min(1.2,oRecoil+w.rec);SFX.gun(w.id,Math.max(.2,1-P.distanceTo(opv)/50));
if(S.dead||!run||phase!='live')return;
const now=performance.now(),old=hist.find(h=>now-h.t<130)||{x:P.x,y:P.y,z:P.z},poss=[P.clone(),new T.Vector3(old.x,old.y,old.z)];
let dmg=0,head=0,pnt=null;
for(let i=0;i<n;i++){const v=new T.Vector3(s.D[i*3],s.D[i*3+1],s.D[i*3+2]);let best=null;
for(const p of poss){const h=hitZone(o,v,p,yaw);if(h&&h.t<=s.L[i]+.15&&(!best||h.t<best.t))best=h}
if(!best)continue;const f=w.fall,m=1-(1-f[2])*Math.max(0,Math.min(1,(best.t-f[0])/(f[1]-f[0])));
dmg+=w.dmg*m*(best.z=='head'?w.hs:best.z=='legs'?.8:1);if(best.z=='head')head=1;pnt=pnt||o.clone().addScaledVector(v,best.t)}
if(dmg<=0)return;S.hp-=dmg;SFX.hurt();shake=Math.max(shake,.3);const vg=$('#vig');vg.classList.remove('on');void vg.offsetWidth;vg.classList.add('on');sparks(pnt,head?0xffd23f:0xff4d6d,head?16:10);
if(S.hp<=0){S.hp=0;die(head)}hud();send()}
function die(head){exitBuild();S.dead=1;S.deaths++;SFX.death();feed(names[ou]+(head?' headshot you':' eliminated you'));hud();send();roundEnd(false)}
let hbN=0,seen=0;
function send(){pRef.set({hb:++hbN,x:+P.x.toFixed(2),y:+P.y.toFixed(2),z:+P.z.toFixed(2),r:+yaw.toFixed(2),pt:+pitch.toFixed(2),w:buildT?-1:S.w,hp:Math.ceil(S.hp),d:S.deaths,dead:S.dead?1:0,rd})}
function onOpp(v){if(!v){if(seen&&phase!='over'&&phase!='ended')end(true,'Opponent left');return}seen=1;oT=performance.now();if(![v.x,v.y,v.z,v.r].every(Number.isFinite))return;tg.set(v.x,v.y,v.z);op.r=v.r;opt=v.pt||0;
if(v.w!=null&&v.w!==op.wi){op.wi=v.w;op.setGun(v.w)}
if(v.hp<oHP&&!v.dead){SFX.hit();const h=$('#hit');h.classList.remove('on');void h.offsetWidth;h.classList.add('on');sparks(new T.Vector3(v.x,v.y+1.3,v.z))}
oHP=v.hp;op.dead=v.dead;
if(v.d>oD){oD=v.d;SFX.kill();me.kick();feed('You eliminated '+names[ou]);hud();roundEnd(true)}}

/* ================= ROUND FLOW (first to WIN round wins) ================= */
function roundEnd(win){hud();if(phase!='live')return;phase='over';clearTimeout(S.rlT);S.rl=0;
msg(win?'ELIMINATED '+names[ou].toUpperCase():'ELIMINATED');
clearTimeout(pt);pt=setTimeout(()=>{if(!run)return;if(oD>=WIN||S.deaths>=WIN)finish();else newRound()},2600)}
function newRound(){clearBuilds();exitBuild();mats=500;S.swingT=0;rd++;phase='freeze';frz=performance.now()+3000;cdN=-1;
P.set(sp0[0],0,sp0[1]);visY=0;yaw=first?Math.PI*1.25:Math.PI*.25;pitch=.12;S.vy=0;S.g=1;S.hp=100;S.dead=0;S.rl=0;sp=0;recoil=0;hist=[];
WS=WEAPONS.map(w=>({mag:w.mag,res:w.res}));S.nextShot=0;S.lat=0;oHP=100;op.dead=0;op.g.position.set(-sp0[0],0,-sp0[1]);tg.copy(op.g.position);deadK=odeadK=0;
$('#cd').textContent='';hud();send()}
function finish(){const w=oD>S.deaths,dr=oD==S.deaths;phase='ended';end(w,dr?'Draw':w?'Victory':'Defeat',dr)}
function end(w,t,dr){if(!run)return;run=false;phase='ended';clearInterval(tick);clearTimeout(pt);clearTimeout(S.rlT);cancelAnimationFrame(raf);document.exitPointerLock();$('#hud').classList.remove('on');$('#pause').classList.remove('on');$('#cd').textContent='';$('#scope').classList.remove('on');
pRef.remove();pRef.off();oRef.off();shRef.off();clearBuilds();dr?0:w?SFX.win():SFX.lose();
onEnd({win:w,draw:!!dr,title:t,me:oD,opp:S.deaths,myName:names[uid],oppName:names[ou],winner:w?names[uid]:names[ou]})}

function leave(){if(!run)return;run=false;phase='ended';clearInterval(tick);clearTimeout(pt);clearTimeout(S.rlT);cancelAnimationFrame(raf);document.exitPointerLock();
$('#hud').classList.remove('on');$('#pause').classList.remove('on');$('#cd').textContent='';$('#scope').classList.remove('on');
pRef.remove();pRef.off();oRef.off();shRef.off();clearBuilds();onLeave&&onLeave({me:oD,opp:S.deaths})}
function resume(){if(run&&R)R.domElement.requestPointerLock()}
function frame(t){if(!run)return;raf=requestAnimationFrame(frame);const now=performance.now(),dt=Math.min(.05,(t-last)/1000||.016);last=t;ph+=dt;
if(phase=='freeze'){const n=Math.ceil((frz-now)/1000);if(n!=cdN){cdN=n;if(n>0){$('#cd').textContent=n;$('#cd').classList.remove('on');void $('#cd').offsetWidth;$('#cd').classList.add('on');SFX.tick()}}
if(now>=frz){phase='live';$('#cd').textContent='';msg('FIGHT!');SFX.go();S.eq=0}}
const live=phase=='live';
if(!S.dead){const mv=live,f=mv?(K.KeyW?1:0)-(K.KeyS?1:0):0,r=mv?(K.KeyD?1:0)-(K.KeyA?1:0):0,l=Math.hypot(f,r)||1,spd=(K.ShiftLeft&&!K.rm?10:6.5)*(K.rm?.6:1),vx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)/l*spd,vz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)/l*spd;
P.x+=vx*dt;if(hits(P))P.x-=vx*dt;P.z+=vz*dt;if(hits(P))P.z-=vz*dt;P.x=Math.max(-29,Math.min(29,P.x));P.z=Math.max(-29,Math.min(29,P.z));
if(f)mvf=f<0?-1:1;if(mv&&K.Space&&S.g){S.vy=9;S.g=0;SFX.jump()}S.vy-=25*dt;if(S.vy>0&&headHit(P,S.vy,dt))S.vy=0;P.y+=S.vy*dt;let gh=gnd(P);if(S.g&&S.vy<=0&&P.y>gh&&P.y-gh<.4){P.y=gh}if(P.y<=gh&&S.vy<=0){if(!S.g){if(S.vy<-4)landT=.3;if(S.vy<-8)SFX.land()}P.y=gh;S.vy=0;S.g=1}else if(P.y>gh+.05)S.g=0;
sp+=(Math.hypot(vx,vz)-sp)*Math.min(1,dt*10);stepT-=dt;if(sp>3&&S.g&&stepT<0){SFX.step();stepT=K.ShiftLeft?.28:.4}
if(live&&K.m){if(buildT)place(buildT);else shoot()}}
hist.push({t:now,x:P.x,y:P.y,z:P.z});while(hist.length&&now-hist[0].t>300)hist.shift();
const w=curW();wph+=dt*sp*1.6*mvf;landT=Math.max(0,landT-dt);const k=Math.min(1,sp/6.5);recoil*=Math.pow(.001,dt*1.1);
/* aim down sights / scope */
const adsT=(K.rm&&live&&!S.dead&&!S.rl&&!w.melee)?1:0;ads+=(adsT-ads)*Math.min(1,dt*11);const sc1=w.scope&&ads>.75;
me.g.visible=!sc1;$('#scope').classList.toggle('on',!!sc1);
deadK+=((S.dead?1:0)-deadK)*Math.min(1,dt*7);
if(Math.abs(P.y-visY)>2.5)visY=P.y;visY=S.g?visY+(P.y-visY)*Math.min(1,dt*24):P.y;me.g.position.set(P.x,visY+deadK*.12,P.z);me.g.rotation.set(deadK*1.45,yaw,0);
me.update(dt,{k,w:wph,pitch,rec:recoil,air:!S.g,vy:S.vy,land:landT/.3,gun:buildT?-1:S.w,swing:S.swingT&&now-S.swingT<380?(now-S.swingT)/380:-1,t:ph});
const d=dirv(),rt=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw)),head=new T.Vector3(P.x,visY+1.7,P.z);
const wantD=w.scope?.2:2.7,wantS=w.scope?0:.6;camD=(4.2+(wantD-4.2)*ads);const shd=.9+(wantS-.9)*ads;
const des=head.clone().addScaledVector(d,-camD).addScaledVector(rt,shd),dv=des.clone().sub(head),dl=dv.length();dv.multiplyScalar(1/dl);const cl=Math.min(dl,wallDist(head,dv,dl)-.3);
if(cl<dl){camD*=Math.max(.15,cl/dl)}camP.copy(head).addScaledVector(dv,Math.max(.1,Math.min(dl,cl)));if(camP.y<.3)camP.y=.3;
cam.position.copy(camP).add(new T.Vector3((Math.random()-.5)*shake,(Math.random()-.5)*shake,0));shake*=Math.pow(.003,dt);cam.lookAt(camP.clone().add(d));
const fv=(K.ShiftLeft&&sp>6&&!K.rm?82:75),zf=75/(w.zoom||1);cam.fov+=((fv+(zf-fv)*ads)-cam.fov)*Math.min(1,dt*10);cam.updateProjectionMatrix();
const cr=$('#cross');cr.style.opacity=buildT?.25:1;cr.style.setProperty('--s',(1+w.spread*30+(sp>3?.4:0)+(S.g?0:.5)+recoil*.5)*(1-ads*.5));
/* opponent */
const pv=op.g.position.clone();op.g.position.lerp(tg,Math.min(1,dt*14));opv.copy(op.g.position);const spd2=pv.distanceTo(op.g.position)/Math.max(dt,.001);
const ovy=(op.g.position.y-pv.y)/Math.max(dt,.001),oair=Math.abs(ovy)>1.2||tg.y>op.g.position.y+.15;if(oPrevAir&&!oair)oLandT=.3;oPrevAir=oair;oLandT=Math.max(0,oLandT-dt);
const ofw=(op.g.position.x-pv.x)*(-Math.sin(op.g.rotation.y))+(op.g.position.z-pv.z)*(-Math.cos(op.g.rotation.y)),osg=spd2>1&&ofw<-.01?-1:1;
let dr=op.r-op.g.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));if(!isFinite(dr)||!isFinite(op.g.rotation.y)){dr=0;op.g.rotation.y=Number.isFinite(op.r)?op.r:0}if(!isFinite(op.g.position.x+op.g.position.y+op.g.position.z))op.g.position.copy(tg);odeadK+=((op.dead?1:0)-odeadK)*Math.min(1,dt*7);
op.g.rotation.set(odeadK*1.45,op.g.rotation.y+dr*Math.min(1,dt*12),0);op.g.position.y+=odeadK*.12;
owph+=dt*spd2*1.6*osg;oRecoil*=Math.pow(.001,dt*1.1);op.update(dt,{k:Math.min(1,spd2/6.5),w:owph,pitch:opt,rec:oRecoil,air:oair,vy:ovy,land:oLandT/.3,gun:op.wi,swing:op.swingT&&now-op.swingT<380?(now-op.swingT)/380:-1,t:ph});
const tp=opv.clone().add(new T.Vector3(0,2.4,0)),dv2=tp.clone().sub(camP),dd2=dv2.length();dv2.multiplyScalar(1/(dd2||1));const occ=wallDist(camP,dv2,dd2)<dd2-.4,sp3=tp.clone().project(cam),eb=$('#eb');if(sp3.z<1&&!op.dead&&!occ){eb.style.display='block';eb.style.left=(sp3.x*.5+.5)*innerWidth+'px';eb.style.top=(-sp3.y*.5+.5)*innerHeight+'px';eb.firstChild.style.width=Math.max(0,oHP)+'%'}else eb.style.display='none';
ghostUpdate();for(let i=TW.length-1;i>=0;i--){const w2=TW[i];w2.t+=dt/.15;const e2=Math.min(1,w2.t);w2.m.scale.setScalar(.82+.18*(1-Math.pow(1-e2,3)));if(e2>=1)TW.splice(i,1)}
for(let i=FX.length-1;i>=0;i--){const f=FX[i];if(f.ring){f.ring.rotation.y+=dt*f.ring.userData.s;continue}f.life-=dt;if(f.v){if(f.g)f.v.y-=18*dt;f.m.position.addScaledVector(f.v,dt)}f.m.material.opacity=Math.max(0,f.life*(f.fade?8:1.6));if(f.life<=0){sc.remove(f.m);FX.splice(i,1)}}
if(oT&&now-oT>12000&&!document.hidden)end(true,'Opponent left');R.render(sc,cam)}

function start(o){init();cancelAnimationFrame(lraf);db=o.db;uid=o.uid;ou=o.opp;mid=o.mid;names={[uid]:o.name,[ou]:o.oppName};onEnd=o.onEnd;onLeave=o.onLeave;clearBuilds();seen=0;if(me){sc.remove(me.g);sc.remove(op.g)}for(let i=FX.length-1;i>=0;i--)if(!FX[i].ring){sc.remove(FX[i].m);FX.splice(i,1)}
first=uid<ou;let hh=0;for(const ch of mid)hh=(hh*31+ch.charCodeAt(0))>>>0;buildMap(hh%MAPS.length);feed('Map: '+MAPS[hh%MAPS.length].n);corners=[[-24,-24],[24,24],[-24,24],[24,-24]];sp0=corners[first?0:1];
const mc=o.skin||0x2f9bff;me=char(mc);op=char(o.oppSkin&&o.oppSkin!=mc?o.oppSkin:0xff4d4d);me.setGun(2);op.setGun(2);op.wi=2;op.r=first?Math.PI*.25:Math.PI*1.25;op.g.rotation.y=op.r;buildT=null;mats=500;visY=0;sc.add(me.g);sc.add(op.g);op.g.add(tag(o.oppName));
Object.assign(S,{w:2,eq:0,nextShot:0,lat:0,rl:0,deaths:0,swingT:0,hadLock:0});$('#pause').classList.remove('on');$('#pconf').style.display='none';rd=0;oD=0;oT=0;opt=0;ads=0;phase='live';cdN=-1;clearTimeout(pt);
const base='matches/'+mid;pRef=db.ref(base+'/p/'+uid);oRef=db.ref(base+'/p/'+ou);shRef=db.ref(base+'/shots');pRef.onDisconnect().remove();
newRound();oT=0;
oRef.on('value',s=>onOpp(s.val()));shRef.on('child_added',s=>onShot(s.val()));
run=true;K.m=K.rm=0;$('#hud').classList.add('on');$('#on').textContent=o.oppName.toUpperCase();hud();$('#resume').style.display='grid';SFX.resume();bcool=0;landT=oLandT=0;SFX.music(CFG.music);
tick=setInterval(send,66);last=performance.now();raf=requestAnimationFrame(frame)}
let LS,LC,LCam,lraf,CL=[],LP=null,LPk='',PI=null;
function lobbyPartner(){if(!LS)return;const key=PI?PI.name+'|'+PI.skin:'';if(key===LPk)return;LPk=key;if(LP){LS.remove(LP.g);LP=null}if(PI){LP=char(PI.skin);LP.setGun(-1);LP.g.add(tag(PI.name));LS.add(LP.g)}}
function setLC(col){if(LC)LS.remove(LC.g);LC=char(col);LC.setGun(-1);LS.add(LC.g)}
function lobby(on,col){init();cancelAnimationFrame(lraf);if(!on)return;
if(!LS){LS=new T.Scene();const g=document.createElement('canvas');g.width=2;g.height=256;const x=g.getContext('2d'),gr=x.createLinearGradient(0,0,0,256);gr.addColorStop(0,'#1fb5ff');gr.addColorStop(.55,'#5ad6ff');gr.addColorStop(1,'#b48cff');x.fillStyle=gr;x.fillRect(0,0,2,256);LS.background=new T.CanvasTexture(g);LS.fog=new T.Fog(0x9fd8ff,16,60);
LS.add(new T.HemisphereLight(0xffffff,0x8866cc,1));const d=new T.DirectionalLight(0xffffff,.9);d.position.set(4,8,6);d.castShadow=true;LS.add(d);
const M=(c,r=1)=>new T.MeshStandardMaterial({color:c,roughness:r,flatShading:true}),ad=(ge,c,px,py,pz,ry=0)=>{const m=new T.Mesh(ge,M(c));m.position.set(px,py,pz);m.rotation.y=ry;m.castShadow=m.receiveShadow=true;LS.add(m);return m};
const fl=ad(new T.PlaneGeometry(160,160),0x7a52c8,0,0,0);fl.rotation.x=-Math.PI/2;
[[-5,-3,2.2],[-3,-4.5,1.6],[4.8,-4,2.6],[7.2,-2,1.6],[-8.5,-6,3],[10,-6,2.2]].forEach((c,i)=>{ad(new T.BoxGeometry(c[2],c[2],c[2]),i%2?0xc08a5a:0xb07a4a,c[0],c[2]/2,c[1],c[0]);ad(new T.BoxGeometry(c[2]+.1,.12,c[2]+.1),0x7a4f2c,c[0],c[2]*.8,c[1],c[0])});
for(let i=0;i<22;i++)ad(new T.ConeGeometry(.15,.9,4),0x8be04a,(i%11-5)*2.2+Math.sin(i)*.8,.45,-2-Math.floor(i/11)*3);
for(let i=0;i<9;i++)ad(new T.ConeGeometry(9+i%3*3,10+i%4*4,4),i%2?0x3a63c9:0x4d7be0,(i-4)*14,3,-34-i%3*6);
for(let i=0;i<7;i++){const c=ad(new T.SphereGeometry(2.4,8,6),0xffffff,(i-3)*9,11+i%3*2,-20-i%2*8);c.scale.set(2.2,.7,1);c.castShadow=false;CL.push(c)}
LCam=new T.PerspectiveCamera(40,1,.1,100);LCam.position.set(-.6,1.5,6);LCam.lookAt(-.6,1.2,0)}
setLC(col||0x2f9bff);const t0=performance.now();let lt=t0;(function l(){lraf=requestAnimationFrame(l);const n=performance.now(),dt=Math.min(.1,(n-lt)/1000),t=(n-t0)/1000;lt=n;
lobbyPartner();
CL.forEach((c,i)=>{c.position.x+=dt*(.4+i*.05);if(c.position.x>34)c.position.x=-34});
LCam.aspect=innerWidth/innerHeight;LCam.updateProjectionMatrix();
const nar=LCam.aspect<1,mx=PI?(nar?-1.1:.2):(nar?-.6:1.4);LC.g.position.x=mx;LC.g.rotation.y=Math.PI-.3+Math.sin(t*.5)*.08;LC.update(dt,{idle:1,t});
if(LP){LP.g.position.x=mx+(nar?1.3:1.9);LP.g.rotation.y=Math.PI+.3+Math.sin(t*.45+1)*.08;LP.update(dt,{idle:1,t:t+2.3})}R.render(LS,LCam)})()}
return{start,lobby,leave,resume,partner(i){PI=i;lobbyPartner()},kick(){LC&&LC.kick&&LC.kick()}}})();
