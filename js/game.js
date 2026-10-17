const Game=(()=>{
const T=THREE,WIN=10,$=s=>document.querySelector(s);
let R,sc,cam,me,op,db,mid,uid,ou,names,run=false,raf,last=0,pRef,oRef,shRef,onEnd,tick;
const B=[],K={},FX=[],S={},P=new T.Vector3(),camP=new T.Vector3(),tg=new T.Vector3(),opv=new T.Vector3();
let yaw=0,pitch=.2,recoil=0,shake=0,oHP=100,oD=0,oT=0,sp=0,stepT=0,oRecoil=0,ph=0,oph=0,swit=0,corners;
const crates=[[0,0,6,6,2.4],[-12,8,4,4,2],[12,-8,4,4,2],[-10,-12,8,2,3],[10,12,8,2,3],[0,-14,3,3,1.5],[0,14,3,3,1.5],[-18,0,2,8,3],[18,0,2,8,3],[-6,10,3,3,1.2],[6,-10,3,3,1.2]];
function init(){if(R)return;R=new T.WebGLRenderer({canvas:$('#c'),antialias:true});R.setPixelRatio(Math.min(2,devicePixelRatio));R.shadowMap.enabled=true;
sc=new T.Scene();cam=new T.PerspectiveCamera(75,1,.1,200);HL=new T.HemisphereLight(0xaaaaff,0x443355,.8);sc.add(HL);DL=new T.DirectionalLight(0xffd0a0,1);DL.position.set(30,40,20);DL.castShadow=true;DL.shadow.mapSize.set(2048,2048);Object.assign(DL.shadow.camera,{left:-40,right:40,top:40,bottom:-40});sc.add(DL);
addEventListener('resize',rs);rs();
addEventListener('keydown',e=>{K[e.code]=1;if(!run)return;if(e.code=='KeyR')reload();if(e.code=='KeyM')SFX.music()});addEventListener('keyup',e=>K[e.code]=0);
addEventListener('mousemove',e=>{if(!run||document.pointerLockElement!=R.domElement)return;yaw-=e.movementX*.0024*(window.CFG?CFG.sens:1);pitch=Math.max(-.6,Math.min(.9,pitch-e.movementY*.0024*(window.CFG?CFG.sens:1)))});
addEventListener('mousedown',e=>{if(!run)return;if(document.pointerLockElement!=R.domElement)R.domElement.requestPointerLock();else K.m=1});addEventListener('mouseup',()=>K.m=0);
document.addEventListener('pointerlockchange',()=>{if(run)$('#resume').style.display=document.pointerLockElement?'none':'grid'});
$('#resume').onclick=()=>R.domElement.requestPointerLock()}

let MG,HL,DL;const SK={};
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
let SKG;
function skinChar(k,col){const D=window.SKIN;if(!D||SK[k]===0)return 0;let s=SK[k];
if(!s){try{
if(!SKG){const bin=Uint8Array.from(atob(D.blob),c=>c.charCodeAt(0)).buffer,F=(n,C)=>new C(bin,D.meta[n][0],D.meta[n][1]/C.BYTES_PER_ELEMENT),ge=new T.BufferGeometry();
ge.setAttribute('position',new T.BufferAttribute(F('pos',Float32Array).slice(0,D.vc*3),3));ge.setAttribute('normal',new T.BufferAttribute(F('nor',Float32Array).slice(0,D.vc*3),3));
ge.setAttribute('skinIndex',new T.BufferAttribute(new Uint16Array(F('ji',Uint8Array).slice(0,D.vc*4)),4));ge.setAttribute('skinWeight',new T.BufferAttribute(F('sw',Float32Array).slice(0,D.vc*4),4));
ge.setIndex(new T.BufferAttribute(F('idx',D.i16?Uint16Array:Uint32Array).slice(0,D.ic),1));
SKG={ge,ibm:F('ibm',Float32Array),clip:new T.AnimationClip('kick',D.dur,D.tracks.map(([n,p,t,v])=>p=='rotation'?new T.QuaternionKeyframeTrack('n'+n+'.quaternion',t,v):new T.VectorKeyframeTrack('n'+n+(p=='scale'?'.scale':'.position'),t,v)))}}
const J=new Set(D.joints),mat=new T.MeshStandardMaterial({color:col,roughness:.6,skinning:true,side:T.DoubleSide}),root=new T.Group();
const os=D.nodes.map((n,i)=>{const o=i==D.mesh?new T.SkinnedMesh(SKG.ge,mat):J.has(i)?new T.Bone():new T.Object3D();o.name='n'+i;o.userData.nm=n.n;if(n.m)new T.Matrix4().fromArray(n.m).decompose(o.position,o.quaternion,o.scale);else{n.t&&o.position.fromArray(n.t);n.r&&o.quaternion.fromArray(n.r);n.s&&o.scale.fromArray(n.s)}return o});
D.nodes.forEach((n,i)=>(n.p<0?root:os[n.p]).add(os[i]));const me=os[D.mesh];me.frustumCulled=false;me.castShadow=true;root.updateMatrixWorld(true);
me.bind(new T.Skeleton(D.joints.map(j=>os[j]),D.joints.map((_,j)=>new T.Matrix4().fromArray(SKG.ibm,j*16))),me.matrixWorld);
const mx=new T.AnimationMixer(root),ac=mx.clipAction(SKG.clip);ac.setLoop(T.LoopOnce,1);ac.clampWhenFinished=true;ac.play();ac.paused=true;mx.update(0);root.updateMatrixWorld(true);
const bx=new T.Box3(),v=new T.Vector3();for(let i=0;i<D.vc;i++){me.boneTransform(i,v);v.applyMatrix4(me.matrixWorld);bx.expandByPoint(v)}
const h=bx.max.y-bx.min.y;if(!(h>0))throw 0;const k2=1.9/h,wp=n=>os.find(q=>q.userData.nm.includes(n)).getWorldPosition(new T.Vector3()),fo=wp('LeftFoot_041'),to=wp('LeftToe_End_043');
const inn=new T.Group();inn.rotation.y=Math.PI-Math.atan2(to.x-fo.x,to.z-fo.z);inn.add(root);root.scale.setScalar(k2);const c=bx.getCenter(new T.Vector3());root.position.set(-c.x*k2,-bx.min.y*k2,-c.z*k2);
s=SK[k]={in:inn,mx,ac,mat,clip:SKG.clip}}catch(e){console.warn('skin failed',e);SK[k]=0;return 0}}
s.mat.color.setHex(col);const g=new T.Group();g.rotation.order='YXZ';g.add(s.in);const aL=new T.Group(),aR=new T.Group(),dm=()=>new T.Object3D();aL.position.set(-.5,1.5,0);aR.position.set(.5,1.5,0);
const gun=new T.Mesh(new T.BoxGeometry(.12,.6,.12),new T.MeshStandardMaterial({color:0x111111}));gun.position.y=-.95;aR.add(gun);const l=new T.PointLight(0xffcc66,0,8);l.position.set(0,-1.2,0);aR.add(l);g.add(aL,aR);let kT=0;
return{g,aL,aR,lL:dm(),lR:dm(),body:dm(),l,mx:1,kick(){s.ac.reset();s.ac.paused=false;s.ac.play();kT=s.clip.duration},up(dt){if(kT>0){kT-=dt;s.mx.update(dt);if(kT<=0){s.ac.reset();s.ac.play();s.ac.paused=true;s.mx.update(0)}}}}}
function rs(){R.setSize(innerWidth,innerHeight);cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix()}
function char(col,k){const sk=k&&CFG.model!==false&&skinChar(k,col);if(sk)return sk;const g=new T.Group();g.rotation.order='YXZ';const m=c=>new T.MeshStandardMaterial({color:c,roughness:.6});
const part=(w,h,d,c,x,y,z,p=g)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m(c));o.position.set(x,y,z);o.castShadow=true;p.add(o);return o};
const body=part(.7,.9,.4,col,0,1.15,0);part(.5,.55,.5,col,0,1.85,0);part(.4,.3,.06,0x14141f,0,1.9,-.26);part(.14,.14,.06,0xffffff,0,1.9,-.29);part(.72,.08,.42,0x14141f,0,1.0,0);part(.72,.08,.42,0x14141f,0,1.3,0);
const pv=(x,y)=>{const p=new T.Group();p.position.set(x,y,0);g.add(p);return p},lL=pv(-.18,.7),lR=pv(.18,.7),aL=pv(-.5,1.5),aR=pv(.5,1.5);
part(.3,.7,.3,0x2b2f4a,0,-.35,0,lL);part(.3,.7,.3,0x2b2f4a,0,-.35,0,lR);part(.25,.7,.25,col,0,-.35,0,aL);part(.25,.7,.25,col,0,-.35,0,aR);part(.12,.6,.12,0x111111,0,-.95,0,aR);
const l=new T.PointLight(0xffcc66,0,8);l.position.set(0,-1.2,0);aR.add(l);return{g,lL,lR,aL,aR,body,l}}
function tag(t){const c=document.createElement('canvas');c.width=256;c.height=64;const x=c.getContext('2d');x.font='bold 36px sans-serif';x.textAlign='center';x.fillStyle='#fff';x.strokeStyle='#000';x.lineWidth=6;x.strokeText(t,128,44);x.fillText(t,128,44);
const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false}));s.scale.set(2,.5,1);s.position.y=2.9;return s}
function rayBox(o,d,b){let t0=0,t1=1e9;const mn=[b.x-b.w/2,0,b.z-b.d/2],mx=[b.x+b.w/2,b.h,b.z+b.d/2],oo=[o.x,o.y,o.z],dd=[d.x,d.y,d.z];
for(let i=0;i<3;i++){if(Math.abs(dd[i])<1e-8){if(oo[i]<mn[i]||oo[i]>mx[i])return 1e9}else{let a=(mn[i]-oo[i])/dd[i],c=(mx[i]-oo[i])/dd[i];if(a>c)[a,c]=[c,a];t0=Math.max(t0,a);t1=Math.min(t1,c);if(t0>t1)return 1e9}}return t0}
function raySph(o,d,c,r){const x=c.clone().sub(o),t=x.dot(d);if(t<0)return 1e9;const q=x.lengthSq()-t*t;return q>r*r?1e9:t-Math.sqrt(r*r-q)}
const hits=p=>B.some(b=>p.y<b.h-.25&&Math.abs(p.x-b.x)<b.w/2+.45&&Math.abs(p.z-b.z)<b.d/2+.45);
const gnd=p=>{let h=0;B.forEach(b=>{if(p.y>=b.h-.35&&Math.abs(p.x-b.x)<b.w/2+.3&&Math.abs(p.z-b.z)<b.d/2+.3)h=Math.max(h,b.h)});return h};
const dirv=()=>new T.Vector3(-Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
function tracer(a,b,col=0xfff2a0){const L=a.distanceTo(b),m=new T.Mesh(new T.BoxGeometry(.04,.04,L),new T.MeshBasicMaterial({color:col,transparent:true}));m.position.copy(a).lerp(b,.5);m.lookAt(b);sc.add(m);FX.push({m,life:.12,fade:1})}
function sparks(p,col=0xff4d6d,n=10){for(let i=0;i<n;i++){const m=new T.Mesh(new T.BoxGeometry(.1,.1,.1),new T.MeshBasicMaterial({color:col,transparent:true}));m.position.copy(p);sc.add(m);FX.push({m,v:new T.Vector3(Math.random()-.5,Math.random()*.8,Math.random()-.5).multiplyScalar(7),life:.6,g:1})}}
function msg(t){const e=$('#msg');e.textContent=t;e.classList.remove('on');void e.offsetWidth;e.classList.add('on')}
function feed(t){const d=document.createElement('div');d.textContent=t;$('#feed').appendChild(d);setTimeout(()=>d.remove(),4000)}
function hud(){$('#hp').style.width=Math.max(0,S.hp)+'%';$('#hpt').textContent=Math.max(0,S.hp);const a=$('#ammo');a.textContent=S.rl?'…':S.ammo;a.className=S.ammo<4?'low':'';$('#s1').textContent=oD;$('#s2').textContent=S.deaths}
function reload(){if(S.rl||S.ammo==12||S.dead)return;S.rl=1;SFX.reload();hud();setTimeout(()=>{S.rl=0;S.ammo=12;hud()},1500)}
function shoot(){const n=performance.now();if(S.dead||S.rl||n-S.ls<230)return;if(S.ammo<=0){SFX.empty();S.ls=n;reload();return}
S.ls=n;S.ammo--;recoil=.4;shake=.12;const d=dirv(),o=camP.clone().addScaledVector(d,4.6);let L=80;B.forEach(b=>L=Math.min(L,rayBox(o,d,b)));
me.aR.updateMatrixWorld(true);const mu=me.aR.localToWorld(new T.Vector3(0,-1.3,0));tracer(mu,o.clone().addScaledVector(d,L));flash(me);SFX.shoot();$('#cross').classList.add('f');setTimeout(()=>$('#cross').classList.remove('f'),90);
shRef.push({by:uid,o:[o.x,o.y,o.z],d:[d.x,d.y,d.z],l:L,m:[mu.x,mu.y,mu.z]});hud()}
function flash(c){c.l.intensity=4;setTimeout(()=>c.l.intensity=0,50)}
function onShot(s){if(s.by===uid)return;const d=new T.Vector3(...s.d),o=new T.Vector3(...s.o);tracer(new T.Vector3(...s.m),o.clone().addScaledVector(d,s.l),0xff9ab0);flash(op);oRecoil=.4;SFX.shoot(Math.max(.2,1-P.distanceTo(opv)/50));
if(S.dead||!run)return;const c=(y)=>new T.Vector3(P.x,P.y+y,P.z),th=raySph(o,d,c(1.9),.32),tb=Math.min(raySph(o,d,c(1.2),.58),raySph(o,d,c(.5),.5));const t=Math.min(th,tb);
if(t>s.l)return;const dmg=th<tb?50:25;S.hp-=dmg;SFX.hurt();shake=.3;const v=$('#vig');v.classList.remove('on');void v.offsetWidth;v.classList.add('on');sparks(o.clone().addScaledVector(d,t));
if(S.hp<=0)die();hud()}
function die(){S.dead=1;S.deaths++;SFX.death();msg('ELIMINATED');feed(names[ou]+' eliminated you');hud();send();if(S.deaths>=WIN)return end(false,'Defeated');setTimeout(()=>{if(!run)return;const f=corners.filter(c=>Math.hypot(c[0]-opv.x,c[1]-opv.z)>25);const c=f[Math.random()*f.length|0]||corners[0];P.set(c[0],0,c[1]);S.hp=100;S.ammo=12;S.rl=0;S.dead=0;S.vy=0;msg('FIGHT!');hud()},3000)}
function send(){pRef.set({x:+P.x.toFixed(2),y:+P.y.toFixed(2),z:+P.z.toFixed(2),r:+yaw.toFixed(2),hp:S.hp,d:S.deaths,dead:S.dead?1:0})}
function onOpp(v){if(!v)return;oT=performance.now();tg.set(v.x,v.y,v.z);op.r=v.r;
if(v.hp<oHP&&!v.dead){SFX.hit();const h=$('#hit');h.classList.remove('on');void h.offsetWidth;h.classList.add('on');sparks(new T.Vector3(v.x,v.y+1.3,v.z))}
if(v.d>oD){SFX.kill();me.kick&&me.kick();msg('ELIMINATED '+names[ou].toUpperCase());feed('You eliminated '+names[ou])}
oHP=v.hp;op.dead=v.dead;if(v.d>oD){oD=v.d;hud();if(oD>=WIN)end(true,'Victory')}}
function end(w,t){if(!run)return;run=false;clearInterval(tick);cancelAnimationFrame(raf);document.exitPointerLock();$('#hud').classList.remove('on');pRef.remove();pRef.off();oRef.off();shRef.off();w?SFX.win():SFX.lose();onEnd({win:w,title:t,me:oD,opp:S.deaths})}
function frame(t){if(!run)return;raf=requestAnimationFrame(frame);const dt=Math.min(.05,(t-last)/1000||.016);last=t;ph+=dt;
if(!S.dead){const f=(K.KeyW?1:0)-(K.KeyS?1:0),r=(K.KeyD?1:0)-(K.KeyA?1:0),l=Math.hypot(f,r)||1,spd=K.ShiftLeft?10:6.5,vx=(-Math.sin(yaw)*f+Math.cos(yaw)*r)/l*spd,vz=(-Math.cos(yaw)*f-Math.sin(yaw)*r)/l*spd;
P.x+=vx*dt;if(hits(P))P.x-=vx*dt;P.z+=vz*dt;if(hits(P))P.z-=vz*dt;P.x=Math.max(-29,Math.min(29,P.x));P.z=Math.max(-29,Math.min(29,P.z));
if(K.Space&&S.g){S.vy=9;S.g=0;SFX.jump()}S.vy-=25*dt;P.y+=S.vy*dt;const gh=gnd(P);if(P.y<=gh&&S.vy<=0){if(!S.g&&S.vy<-8)SFX.land();P.y=gh;S.vy=0;S.g=1}else if(P.y>gh+.05)S.g=0;
sp+=(Math.hypot(vx,vz)-sp)*Math.min(1,dt*10);stepT-=dt;if(sp>3&&S.g&&stepT<0){SFX.step();stepT=K.ShiftLeft?.28:.4}
if(K.m)shoot()}
const k=Math.min(1,sp/6)*.9,w=Math.sin(ph*(sp>8?14:10));recoil*=.85;
me.g.position.copy(P);me.g.rotation.set(S.dead?-1.4:0,yaw,0);me.lL.rotation.x=w*k;me.lR.rotation.x=-w*k;me.aR.rotation.x=1.5+pitch+recoil;me.aL.rotation.x=1.3+pitch;me.aL.rotation.z=-.3;me.body.scale.y=1+Math.sin(ph*2)*.015;
const d=dirv(),rt=new T.Vector3(Math.cos(yaw),0,-Math.sin(yaw));camP.copy(P).add(new T.Vector3(0,1.7,0)).addScaledVector(d,-4.2).addScaledVector(rt,.9);if(camP.y<.3)camP.y=.3;
cam.position.copy(camP).add(new T.Vector3((Math.random()-.5)*shake,(Math.random()-.5)*shake,0));shake*=.88;cam.lookAt(camP.clone().add(d));
const fv=K.ShiftLeft&&sp>6?82:75;cam.fov+=(fv-cam.fov)*dt*6;cam.updateProjectionMatrix();
const pv=op.g.position.clone();op.g.position.lerp(tg,Math.min(1,dt*12));opv.copy(op.g.position);const spd2=pv.distanceTo(op.g.position)/dt;let dr=op.r-op.g.rotation.y;dr=Math.atan2(Math.sin(dr),Math.cos(dr));op.g.rotation.set(op.g.rotation.x+((op.dead?-1.4:0)-op.g.rotation.x)*dt*8,op.g.rotation.y+dr*Math.min(1,dt*12),0);
oph+=dt;me.up&&me.up(dt);op.up&&op.up(dt);const ow=Math.sin(oph*10),ok=Math.min(1,spd2/6)*.9;op.lL.rotation.x=ow*ok;op.lR.rotation.x=-ow*ok;oRecoil*=.85;op.aR.rotation.x=1.5+oRecoil;op.aL.rotation.x=1.3;op.aL.rotation.z=-.3;
const sp3=opv.clone().add(new T.Vector3(0,2.5,0)).project(cam),eb=$('#eb');if(sp3.z<1&&!op.dead){eb.style.display='block';eb.style.left=(sp3.x*.5+.5)*innerWidth+'px';eb.style.top=(-sp3.y*.5+.5)*innerHeight+'px';eb.firstChild.style.width=oHP+'%'}else eb.style.display='none';
for(let i=FX.length-1;i>=0;i--){const f=FX[i];if(f.ring){f.ring.rotation.y+=dt*f.ring.userData.s;continue}f.life-=dt;if(f.v){if(f.g)f.v.y-=18*dt;f.m.position.addScaledVector(f.v,dt)}f.m.material.opacity=Math.max(0,f.life*(f.fade?8:1.6));if(f.life<=0){sc.remove(f.m);FX.splice(i,1)}}
if(oT&&performance.now()-oT>10000)end(true,'Opponent left');R.render(sc,cam)}
function start(o){init();cancelAnimationFrame(lraf);db=o.db;uid=o.uid;ou=o.opp;mid=o.mid;names={[uid]:o.name,[ou]:o.oppName};onEnd=o.onEnd;if(me){sc.remove(me.g);sc.remove(op.g)}for(let i=FX.length-1;i>=0;i--)if(!FX[i].ring){sc.remove(FX[i].m);FX.splice(i,1)}
const first=uid<ou;let hh=0;for(const ch of mid)hh=(hh*31+ch.charCodeAt(0))>>>0;buildMap(hh%MAPS.length);feed('Map: '+MAPS[hh%MAPS.length].n);corners=[[-24,-24],[24,24],[-24,24],[24,-24]];const sp0=corners[first?0:1];P.set(sp0[0],0,sp0[1]);yaw=first?Math.PI*.75:-Math.PI*.25;pitch=.15;
Object.assign(S,{hp:100,ammo:12,rl:0,vy:0,g:1,deaths:0,dead:0,ls:0});oHP=100;oD=0;oT=0;recoil=oRecoil=0;
const mc=o.skin||0x2f9bff;me=char(mc,'M');op=char(o.oppSkin&&o.oppSkin!=mc?o.oppSkin:0xff4d4d,'O');sc.add(me.g);sc.add(op.g);op.g.add(tag(o.oppName));op.g.position.set(-sp0[0],0,-sp0[1]);tg.copy(op.g.position);op.r=0;
const base='matches/'+mid;pRef=db.ref(base+'/p/'+uid);oRef=db.ref(base+'/p/'+ou);shRef=db.ref(base+'/shots');pRef.onDisconnect().remove();
oRef.on('value',s=>onOpp(s.val()));shRef.on('child_added',s=>onShot(s.val()));
run=true;$('#hud').classList.add('on');$('#on').textContent=o.oppName.toUpperCase();hud();$('#resume').style.display='grid';msg('FIGHT!');SFX.resume();SFX.music(CFG.music);
tick=setInterval(send,66);last=performance.now();raf=requestAnimationFrame(frame)}
let LS,LC,LCam,lraf,CL=[];
function setLC(col){if(LC)LS.remove(LC.g);LC=char(col,'L');if(LC.mx)LC.aR.visible=LC.aL.visible=false;else LC.aR.children[1].visible=false;LS.add(LC.g)}
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
setLC(col||0x2f9bff);const t0=performance.now();let lt=t0,nk=2;(function l(){lraf=requestAnimationFrame(l);const n=performance.now(),dt=Math.min(.1,(n-lt)/1000),t=(n-t0)/1000;lt=n;
if(!LC.mx&&SK.L&&CFG.model!==false)setLC(col||0x2f9bff);if(LC.mx){nk-=dt;if(nk<0){LC.kick();nk=8}LC.up(dt)}
CL.forEach((c,i)=>{c.position.x+=dt*(.4+i*.05);if(c.position.x>34)c.position.x=-34});
LCam.aspect=innerWidth/innerHeight;LCam.updateProjectionMatrix();
LC.g.position.x=LCam.aspect<1?-.6:1.4;LC.g.rotation.y=-.35+Math.sin(t*.7)*.35;LC.body.scale.y=1+Math.sin(t*2)*.02;LC.aL.rotation.z=-.08+Math.sin(t*2)*.03;LC.aR.rotation.z=.08-Math.sin(t*2)*.03;R.render(LS,LCam)})()}
return{start,lobby,kick(){LC&&LC.kick&&LC.kick()}}})();
