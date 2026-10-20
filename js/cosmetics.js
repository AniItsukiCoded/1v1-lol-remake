/* ================= COSMETICS =================
   A skin value is a single number: colour (low 24 bits) + cosmetic id * 2^24.  Because it is one number it travels through the
   existing party / invite / waiting-room data unchanged, so your opponent sees your outfit with no Firebase changes.
   Accessories are authored in "character space": origin at the holder, +Y up, the character faces -Z, +X is its right.
   make(id) -> {head,back,hip,chest:[Object3D], mat(material), upd(t,dt,o)}                                                       */
window.COS=(()=>{
const T=THREE,TAU=Math.PI*2;
const M=(c,o={})=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.7,flatShading:true},o));
const BM=(c,o={})=>new T.MeshBasicMaterial(Object.assign({color:c},o));
const mesh=(g,m,x=0,y=0,z=0)=>{const o=new T.Mesh(g,m);o.position.set(x,y,z);return o};
const grp=(...a)=>{const g=new T.Group();a.forEach(x=>x&&g.add(x));return g};
const Y=new T.Vector3(0,1,0);
/* thin cylinder between two points */
const bar=(a,b,r,m)=>{const d=b.clone().sub(a),o=new T.Mesh(new T.CylinderGeometry(r,r,d.length(),5),m);o.position.copy(a).addScaledVector(d,.5);o.quaternion.setFromUnitVectors(Y,d.normalize());return o};
const poly=(pts,m)=>{const s=new T.Shape();pts.forEach((p,i)=>i?s.lineTo(p[0],p[1]):s.moveTo(p[0],p[1]));return new T.Mesh(new T.ShapeGeometry(s),m)};
const glowTex=(()=>{let t;return()=>{if(t)return t;const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d'),g=x.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.35,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,64,64);return t=new T.CanvasTexture(c)}})();
const glow=(c,s)=>{const sp=new T.Sprite(new T.SpriteMaterial({map:glowTex(),color:c,transparent:true,blending:T.AdditiveBlending,depthWrite:false}));sp.scale.set(s,s,1);return sp};

/* ---------- reusable pieces ---------- */
function pumpkin(s=1,gl=0xffc83a,body=0xff7a12,lite){const g=new T.Group(),mo=M(body,{emissive:0x8a2a00,emissiveIntensity:.55}),rb=M(0xd95a00);
const b=mesh(new T.SphereGeometry(.2,14,12),mo);b.scale.set(1.12,.95,1.1);g.add(b);
if(!lite)for(let i=0;i<4;i++){const r=mesh(new T.TorusGeometry(.2,.012,5,22),rb);r.rotation.y=i*Math.PI/4;r.scale.set(1.12,.95,1.1);g.add(r)}
const st=mesh(new T.CylinderGeometry(.028,.045,.1,6),M(0x3f7d22));st.position.y=.2;st.rotation.z=.2;g.add(st);
const gm=BM(gl),eye=poly([[-.045,-.03],[.045,-.03],[0,.045]],gm);[-1,1].forEach(sx=>{const e=eye.clone();e.position.set(sx*.08,.04,-.222);e.rotation.y=Math.PI;g.add(e)});
const mo2=poly([[-.1,.0],[-.06,-.04],[-.03,-.01],[0,-.045],[.03,-.01],[.06,-.04],[.1,0],[.07,-.075],[-.07,-.075]],gm);mo2.position.set(0,-.045,-.215);mo2.rotation.y=Math.PI;g.add(mo2);
g.scale.setScalar(s);g.userData.glow=gm;return g}
function eyes(c,y=.02,x=.055,z=-.128,r=.016){return grp(...[-1,1].map(s=>mesh(new T.SphereGeometry(r,6,5),BM(c),s*x,y,z)))}
function horn(c,h=.17,r=.035){const g=new T.Group(),m=M(c),a=mesh(new T.ConeGeometry(r,h,6),m,0,h/2,0),b=mesh(new T.ConeGeometry(r*.55,h*.6,6),m,.03,h*.95,0);b.rotation.z=-.5;g.add(a,b);return g}
function ear(c,inner,s=1){const g=new T.Group();g.add(mesh(new T.ConeGeometry(.06*s,.15*s,4),M(c),0,.075*s,0),mesh(new T.ConeGeometry(.032*s,.1*s,4),M(inner),0,.06*s,-.018));return g}
function wingShape(m,sz=1,feather){const pts=feather?[[0,0],[.3,.34],[.75,.5],[1.15,.42],[1.3,.2],[1.2,.0],[1.28,-.2],[1.0,-.3],[1.05,-.5],[.75,-.5],[.7,-.7],[.45,-.55],[.3,-.6],[.15,-.3]]:[[0,0],[.3,.34],[.8,.46],[1.1,.3],[.98,.04],[.86,.14],[.74,-.12],[.56,.0],[.44,-.24],[.26,-.06],[.1,-.2]];
const w=poly(pts,m);w.scale.setScalar(.34*sz);return w}
function wings(c,sz,feather,flap=.22,spd=5){const m=M(c,{side:T.DoubleSide,emissive:feather?0x9aa8c8:0x1a0830,emissiveIntensity:feather?.5:.5}),R=grp(wingShape(m,sz,feather)),L=grp(wingShape(m,sz,feather));L.scale.x=-1;
const pr=grp(R),pl=grp(L);pr.position.x=.07;pl.position.x=-.07;pr.rotation.y=-.5;pl.rotation.y=.5;
const g=grp(pr,pl);return{g,upd:(t,k)=>{const f=Math.sin(t*(spd+k*4))*flap;R.rotation.z=.2+f;L.rotation.z=-.2-f}}}
function capeMesh(c,inner,len=.85,w0=.2,w1=.36){const g=new T.Group(),sh=[[-w0,0],[w0,0],[w1,-len],[-w1,-len]],o=poly(sh,M(inner,{side:T.DoubleSide}));
const back=poly(sh.map(p=>[p[0]*.985,p[1]]),M(c,{side:T.DoubleSide}));back.position.z=.004;g.add(o,back);g.position.set(0,0,.1);return g}
function tail(c,r,n,step,curl,tip){const g=new T.Group(),m=M(c),seg=[];for(let i=0;i<n;i++){const s=mesh(new T.SphereGeometry(r*(1-i/n*.55),6,5),m);g.add(s);seg.push(s)}
let sp=null;if(tip==='spade'){sp=mesh(new T.ConeGeometry(.05,.1,3),M(0xc4161c));g.add(sp)}
const place=t=>{for(let i=0;i<n;i++){seg[i].position.set(Math.sin(t*2.2+i*.55)*.014*i,-.03*i+curl*i*i,.04+step*i)}if(sp){const e=seg[n-1].position;sp.position.set(e.x,e.y+.05,e.z+.02);sp.rotation.x=-1.2}};place(0);return{g,upd:place}}
function flames(n,h,c1,c2){const g=new T.Group(),fl=[];for(let i=0;i<n;i++){const a=i/n*TAU,f=mesh(new T.ConeGeometry(.045,h,5),BM(i%2?c1:c2,{transparent:true,opacity:.9}),Math.cos(a)*.13,h/2,Math.sin(a)*.13);g.add(f);fl.push(f)}
return{g,upd:t=>fl.forEach((f,i)=>{const s=.75+.35*Math.sin(t*9+i*1.7)+.15*Math.sin(t*17+i);f.scale.set(1,s,1);f.position.y=h*s/2})}}
function orbit(n,mk,rad,spd,ymin,ymax){const g=new T.Group(),o=[];for(let i=0;i<n;i++){const m=mk(i);g.add(m);o.push({m,a:i/n*TAU,s:spd*(.7+(i*37%7)/10),y:ymin+(ymax-ymin)*((i*53%10)/10),r:rad*(.8+(i*29%5)/10)})}
return{g,upd:t=>o.forEach(q=>{const a=q.a+t*q.s;q.m.position.set(Math.cos(a)*q.r,q.y+Math.sin(t*2+q.a)*.05,Math.sin(a)*q.r)})}}
function embers(n,c,w,h){const g=new T.Group(),o=[];for(let i=0;i<n;i++){const m=mesh(new T.SphereGeometry(.014,4,4),BM(c,{transparent:true}));g.add(m);o.push({m,p:i/n,x:Math.sin(i*12.9)*w,z:Math.cos(i*7.3)*w*.6})}
return{g,upd:t=>o.forEach((q,i)=>{const p=(t*.45+q.p)%1;q.m.position.set(q.x+Math.sin(t*3+i)*.04,p*h,q.z);q.m.material.opacity=1-p;q.m.scale.setScalar(1.2-p)})}}

/* ---------- catalogue ---------- */
const LIST=[
{id:1,n:'Jack',ico:'🎃',set:'hw',rar:'rare'},{id:2,n:'Witch',ico:'🧙',set:'hw',rar:'rare'},{id:3,n:'Skeleton',ico:'💀',set:'hw',rar:'epic'},
{id:4,n:'Ghost',ico:'👻',set:'hw',rar:'epic'},{id:5,n:'Vampire',ico:'🧛',set:'hw',rar:'epic'},{id:6,n:'Mummy',ico:'🧻',set:'hw',rar:'rare'},
{id:7,n:'Zombie',ico:'🧟',set:'hw',rar:'rare'},{id:8,n:'Devil',ico:'😈',set:'hw',rar:'epic'},{id:9,n:'Bat',ico:'🦇',set:'hw',rar:'epic'},
{id:10,n:'Reaper',ico:'☠️',set:'hw',rar:'legendary'},{id:11,n:'Pumpkin King',ico:'👑',set:'hw',rar:'legendary'},{id:12,n:'Frankenstein',ico:'🔩',set:'hw',rar:'rare'},
{id:13,n:'Candy Corn',ico:'🍬',set:'hw',rar:'rare'},{id:14,n:'Spider',ico:'🕷️',set:'hw',rar:'epic'},{id:15,n:'Werewolf',ico:'🐺',set:'hw',rar:'epic'},{id:16,n:'Black Cat',ico:'🐈‍⬛',set:'hw',rar:'rare'},{id:17,n:'Nightmare King',ico:'👹',set:'hw',rar:'mythic'},{id:18,n:'Spectral Knight',ico:'⚔️',set:'hw',rar:'mythic'},
{id:20,n:'Crown',ico:'👑',set:'bp',rar:'epic'},{id:21,n:'Halo',ico:'😇',set:'bp',rar:'rare'},{id:22,n:'Headphones',ico:'🎧',set:'bp',rar:'rare'},
{id:23,n:'Cyber Visor',ico:'🥽',set:'bp',rar:'epic'},{id:24,n:'Shades',ico:'😎',set:'bp',rar:'common'},{id:25,n:'Angel',ico:'🪽',set:'bp',rar:'legendary'}];
const B={};

B[1]=()=>({head:[pumpkin(1)]});
B[2]=()=>{const g=new T.Group(),hm=M(0x2a1740),br=mesh(new T.CylinderGeometry(.27,.27,.02,16),hm,0,.1,0);
const c1=mesh(new T.ConeGeometry(.15,.2,12),hm,0,.21,0),c2=mesh(new T.ConeGeometry(.1,.2,12),hm,.0,.38,.02);c2.rotation.x=.3;const c3=mesh(new T.ConeGeometry(.04,.1,8),hm,0,.5,.07);c3.rotation.x=.9;
const bd=mesh(new T.CylinderGeometry(.152,.162,.05,12),M(0xff8a1f),0,.14,0),bk=mesh(new T.BoxGeometry(.06,.05,.012),M(0xffd23f,{metalness:.6}),0,.14,-.16);g.add(br,c1,c2,c3,bd,bk);g.position.y=.02;return{head:[g,eyes(0xb26bff,.0,.052,-.128)]}};
B[3]=()=>{const g=new T.Group(),bone=M(0xf1ecd8),sk=mesh(new T.SphereGeometry(.17,14,12),bone);sk.scale.set(.86,1,.96);g.add(sk);
const so=M(0x0a0a10);[-1,1].forEach(s=>{const e=mesh(new T.SphereGeometry(.04,8,6),so,s*.06,.025,-.15);e.scale.z=.5;g.add(e,mesh(new T.SphereGeometry(.014,6,5),BM(0x7dff9a),s*.06,.025,-.172))});
const ns=mesh(new T.ConeGeometry(.018,.04,3),so,0,-.03,-.165);ns.rotation.x=Math.PI;g.add(ns);
const jw=mesh(new T.BoxGeometry(.14,.05,.1),bone,0,-.14,-.07);g.add(jw);for(let i=-2;i<=2;i++)g.add(mesh(new T.BoxGeometry(.006,.05,.102),so,i*.028,-.14,-.07));
const chest=grp();for(let i=0;i<4;i++)[-1,1].forEach(s=>chest.add(mesh(new T.BoxGeometry(.13,.014,.02),bone,s*.09,-.05-i*.055,-.155)));
chest.add(mesh(new T.BoxGeometry(.018,.24,.02),bone,0,-.12,-.155));
return{head:[g],chest:[chest]}};
B[4]=()=>{const f=eyes(0x10101a,.02,.05,-.127,.018);f.children.forEach(e=>e.scale.set(.8,1.5,.5));const mo=mesh(new T.SphereGeometry(.024,8,6),BM(0x10101a),0,-.055,-.128);mo.scale.set(1,1.4,.4);
const orb=orbit(7,i=>glow(i%2?0x9fd6ff:0xffffff,.22),.52,1.1,.2,1.5);const wp=grp(f,mo);
return{head:[wp],hip:[orb.g],mat:m=>{m.transparent=true;m.opacity=.72;m.emissive.set(0x6688ff);m.emissiveIntensity=.45;m.side=T.FrontSide},upd:orb.upd}};
B[5]=()=>{const cape=capeMesh(0x1a0610,0x8c0a22,.9,.2,.4),fang=grp(...[-1,1].map(s=>{const f=mesh(new T.ConeGeometry(.01,.035,4),M(0xffffff),s*.03,-.075,-.128);f.rotation.x=Math.PI;return f}));
const col=grp(...[-1,1].map(s=>{const c=poly([[0,0],[s*.14,.02],[s*.05,.2]],M(0x1a0610,{side:T.DoubleSide}));c.position.set(0,-.05,.11);return c}));
return{head:[fang,eyes(0xff2a3a,.02,.05,-.128,.014),col],back:[cape],upd:(t,d,o)=>{cape.rotation.x=-.1-.05*Math.sin(t*2)-(o.k||0)*.25}}};
B[6]=()=>{const m=M(0xd8c8a0,{roughness:1}),h=grp();[-.12,-.085,-.05,.07,.1,.13,.155].forEach((y,i)=>{const r=mesh(new T.TorusGeometry(.128-Math.abs(y)*.16,.017,5,18),m,0,y,0);r.rotation.x=Math.PI/2+(i%2?.12:-.1);r.rotation.z=i*.4;r.scale.set(1,1.02,1);h.add(r)});
const ch=grp();[0,-.07,-.14,-.21].forEach((y,i)=>{const r=mesh(new T.TorusGeometry(.19,.016,5,20),m,0,y,0);r.rotation.x=Math.PI/2+(i%2?.1:-.08);r.scale.set(1,.88,1);ch.add(r)});
return{head:[h,eyes(0xff3030,.045,.05,-.13,.013)],chest:[ch]}};
B[7]=()=>{const st=M(0x1c1410),sc=mesh(new T.BoxGeometry(.12,.012,.01),st,.03,-.07,-.13),bx=grp(sc);for(let i=0;i<4;i++)bx.add(mesh(new T.BoxGeometry(.006,.03,.01),st,-.02+i*.025,-.07,-.13));
const dk=grp(...[-1,1].map(s=>{const d=mesh(new T.SphereGeometry(.034,8,6),M(0x2a3a1c),s*.052,.022,-.118);d.scale.set(1,.8,.3);return d}));
const fl=orbit(4,()=>mesh(new T.SphereGeometry(.012,4,4),BM(0x050505)),.22,5,.02,.2);
return{head:[bx,dk,eyes(0xe8ff80,.022,.052,-.127,.01),fl.g],upd:fl.upd}};
B[8]=()=>{const hn=[-1,1].map(s=>{const h=horn(0xc4161c);h.position.set(s*.075,.13,-.02);h.rotation.z=-s*.3;return h}),tl=tail(0xc4161c,.026,9,.05,.006,'spade');
return{head:[...hn,eyes(0xffd23f,.022,.052,-.128,.014)],hip:[tl.g],upd:tl.upd}};
B[9]=()=>{const w=wings(0x2b1d46,1.2,false,.26,5),ear1=[-1,1].map(s=>{const e=ear(0x2b1d46,0xc07aa8,1);e.position.set(s*.085,.13,-.01);e.rotation.z=-s*.12;return e});
return{head:[...ear1,eyes(0xff4d6d,.025,.05,-.128,.012)],back:[w.g],upd:(t,d,o)=>w.upd(t,o.k||0)}};
B[10]=()=>{const blk=M(0x0b0b12),hd=mesh(new T.SphereGeometry(.185,12,10),blk);hd.scale.set(.98,1.04,1.04);hd.position.y=.01;
const pk=mesh(new T.ConeGeometry(.1,.3,8),blk,0,.1,.15);pk.rotation.x=-1.15;const cl=mesh(new T.CylinderGeometry(.17,.3,.24,10),blk,0,-.2,0);
const fc=mesh(new T.SphereGeometry(.12,10,8),M(0x000000),0,.0,-.07);fc.scale.set(.95,1.05,.8);
const g1=glow(0xff5a1a,.1),g2=glow(0xff5a1a,.1);g1.position.set(-.05,.015,-.17);g2.position.set(.05,.015,-.17);
const sc=grp(bar(new T.Vector3(.3,-.6,.06),new T.Vector3(-.12,.62,.06),.014,M(0x3a2a1c)));const sil=M(0xcfd6ee,{metalness:.7,roughness:.3,emissive:0x334466,emissiveIntensity:.5});
const arc=[[-.12,.62],[-.2,.74],[-.34,.78],[-.46,.7],[-.5,.58]];for(let i=0;i<arc.length-1;i++)sc.add(bar(new T.Vector3(arc[i][0],arc[i][1],.06),new T.Vector3(arc[i+1][0],arc[i+1][1],.06),.016-i*.003,sil));
return{head:[hd,pk,cl,fc,g1,g2,eyes(0xff7a1a,.015,.05,-.17,.013)],back:[sc],upd:t=>{const s=.1+.025*Math.sin(t*5);g1.scale.set(s,s,1);g2.scale.set(s,s,1)}}};
B[11]=()=>{const pm=pumpkin(1.12,0xff5a1a,0xff6a0a),fl=flames(7,.2,0xffd23f,0xff5a1a);fl.g.position.y=.27;const crown=mesh(new T.CylinderGeometry(.14,.16,.045,10,1,true),M(0x2a1a08,{metalness:.7,side:T.DoubleSide,emissive:0x553300,emissiveIntensity:.5}),0,.26,0);
const cape=capeMesh(0x2a0f44,0xff6a0a,.95,.2,.42),em=embers(10,0xffa030,.3,.8);em.g.position.y=-.1;
return{head:[pm,fl.g,crown,glow(0xff7a1a,.9),em.g],back:[cape],upd:(t,d,o)=>{fl.upd(t);em.upd(t);cape.rotation.x=-.1-.05*Math.sin(t*2)-(o.k||0)*.25}}};
B[12]=()=>{const top=mesh(new T.BoxGeometry(.27,.1,.26),M(0x15151c),0,.16,0),bolt=[-1,1].map(s=>{const g=grp(mesh(new T.CylinderGeometry(.015,.015,.09,6),M(0xb0b8c8,{metalness:.8,roughness:.3}),0,0,0),mesh(new T.SphereGeometry(.025,6,5),M(0xb0b8c8,{metalness:.8}),s*.045,0,0));g.children[0].rotation.z=Math.PI/2;g.position.set(s*.13,-.06,-.01);return g});
const sc=mesh(new T.BoxGeometry(.1,.014,.01),M(0x5a1a1a),.02,.08,-.13);const st=grp(sc);for(let i=0;i<4;i++)st.add(mesh(new T.BoxGeometry(.006,.03,.01),M(0x2a0a0a),-.02+i*.027,.08,-.13));
return{head:[top,...bolt,st,eyes(0xf0f0d0,.02,.05,-.127,.012)]}};
B[13]=()=>{const g=new T.Group();[[.15,.11,.12,0xffd23f,.16],[.11,.075,.1,0xff8a1f,.255],[.075,.012,.1,0xfafafa,.35]].forEach(([rb,rt,h,c,y])=>{const s=mesh(new T.CylinderGeometry(rt,rb,h,14),M(c,{emissive:c,emissiveIntensity:.15}),0,y,0);g.add(s)});g.rotation.z=.12;
return{head:[g,eyes(0x2a1a10,.02,.05,-.128,.013)]}};
B[14]=()=>{const m=M(0x14141c),legs=[];const g=new T.Group();
for(let s=-1;s<=1;s+=2)for(let i=0;i<4;i++){const z=(i-1.5)*.12,P=[[0,0,0],[s*.26,.26+i*.03,.05+z*.4],[s*.52,.14,.12+z*.9],[s*.66,-.34,.16+z*1.1]].map(p=>new T.Vector3(...p)),lg=new T.Group();for(let k=0;k<3;k++)lg.add(bar(P[k],P[k+1],.013,m));lg.position.set(s*.08,0,.04);g.add(lg);legs.push({lg,i,s})}
const hg=mesh(new T.SphereGeometry(.05,8,6),M(0x14141c),0,-.15,.08);hg.scale.set(1,1.3,1);g.add(hg,mesh(new T.BoxGeometry(.02,.03,.01),BM(0xff2a2a),0,-.16,.13));
const ey=grp(...[[-.035,.07],[.035,.07],[-.065,.04],[.065,.04]].map(p=>mesh(new T.SphereGeometry(.012,5,4),BM(0xff2a3a),p[0],p[1]+.04,-.128)));
return{head:[ey],back:[g],upd:t=>legs.forEach(q=>{q.lg.rotation.z=q.s*(Math.sin(t*3+q.i*.9)*.06);q.lg.rotation.y=q.s*Math.sin(t*3+q.i*.9)*.07})}};
B[15]=()=>{const fur=0x6b4a2b,ea=[-1,1].map(s=>{const e=ear(fur,0x3a2a1a,1.3);e.position.set(s*.085,.13,.0);e.rotation.z=-s*.2;return e}),tl=tail(fur,.034,8,.055,.004);
const sn=mesh(new T.ConeGeometry(.045,.1,6),M(0x5a3d22),0,-.04,-.16);sn.rotation.x=-Math.PI/2;
return{head:[...ea,sn,mesh(new T.SphereGeometry(.014,5,4),BM(0x0a0a0a),0,-.04,-.213),eyes(0xffd23f,.03,.052,-.127,.014)],hip:[tl.g],upd:tl.upd}};
B[16]=()=>{const ea=[-1,1].map(s=>{const e=ear(0x181820,0xe48aa8,1.1);e.position.set(s*.085,.14,-.02);e.rotation.z=-s*.12;return e}),tl=tail(0x181820,.026,9,.04,.009),wh=grp();
[-1,1].forEach(s=>[-.02,0,.02].forEach(y=>wh.add(bar(new T.Vector3(s*.05,-.05+y,-.13),new T.Vector3(s*.2,-.05+y*2.5,-.12),.002,BM(0xe0e0e0)))));
return{head:[...ea,wh,eyes(0x7dff6a,.025,.05,-.128,.014)],hip:[tl.g],upd:tl.upd}};
B[17]=()=>{const sk=B[3](),fl=flames(9,.3,0xff4dd2,0x8a2aff),cape=capeMesh(0x12081f,0x8a2aff,1.05,.22,.5),em=embers(14,0xff4dd2,.35,.9),hn=[-1,1].map(s=>{const h=horn(0x2a1040,.22,.04);h.position.set(s*.1,.12,0);h.rotation.z=-s*.5;return h}),or=orbit(3,()=>pumpkin(.3,0xff4dd2,0x8a2aff),.5,1.4,.1,.5);fl.g.position.y=.3;em.g.position.y=-.1;
return{head:[...sk.head,fl.g,...hn,glow(0xff4dd2,1),em.g],chest:sk.chest,back:[cape],hip:[or.g],upd:(t,d,o)=>{fl.upd(t);em.upd(t);or.upd(t);cape.rotation.x=-.1-.05*Math.sin(t*2)-(o.k||0)*.25}}};
B[18]=()=>{const sk=B[3](),fl=flames(7,.24,0x7dffea,0x2a8aff),w=wings(0xbfe9ff,1.25,true,.18,3),orb=orbit(6,i=>glow(i%2?0x7dffea:0xffffff,.24),.55,1,.2,1.6);fl.g.position.y=.26;
return{head:[...sk.head,fl.g,glow(0x7dffea,.8)],chest:sk.chest,back:[w.g],hip:[orb.g],mat:m=>{m.transparent=true;m.opacity=.78;m.emissive.set(0x2a8aff);m.emissiveIntensity=.5;m.side=T.FrontSide},upd:(t,d,o)=>{fl.upd(t);orb.upd(t);w.upd(t,o.k||0)}}};
/* level-pass accessories */
B[20]=()=>{const gm=M(0xffd23f,{metalness:.8,roughness:.25,emissive:0x665000,emissiveIntensity:.5}),g=new T.Group();g.add(mesh(new T.CylinderGeometry(.13,.15,.06,12,1,true),Object.assign(gm.clone(),{side:T.DoubleSide}),0,0,0));
for(let i=0;i<6;i++){const a=i/6*TAU,p=mesh(new T.ConeGeometry(.026,.09,4),gm,Math.cos(a)*.14,.07,Math.sin(a)*.14);g.add(p);g.add(mesh(new T.SphereGeometry(.014,6,5),BM(i%2?0xff4d6d:0x4dd2ff),Math.cos(a)*.14,.12,Math.sin(a)*.14))}
g.position.y=.17;return{head:[g]}};
B[21]=()=>{const h=mesh(new T.TorusGeometry(.14,.013,6,24),BM(0xffe680),0,.3,0);h.rotation.x=Math.PI/2;const gl=glow(0xffe680,.5);gl.position.y=.3;return{head:[h,gl],upd:t=>{h.position.y=gl.position.y=.3+Math.sin(t*2)*.012;h.rotation.z=t*.6}}};
B[22]=()=>{const ar=mesh(new T.TorusGeometry(.155,.016,6,20,Math.PI),M(0x20222e),0,-.005,0);const cs=[-1,1].map(s=>{const c=mesh(new T.CylinderGeometry(.06,.06,.05,12),M(0x1ad1c9,{emissive:0x0a6a66,emissiveIntensity:.7}),s*.15,-.005,0);c.rotation.z=Math.PI/2;return c});
return{head:[ar,...cs]}};
B[23]=()=>{const v=mesh(new T.CylinderGeometry(.14,.14,.07,18,1,true,Math.PI-1,2),BM(0x4dd2ff,{transparent:true,opacity:.7,side:T.DoubleSide}),0,.025,0);v.scale.set(.92,1,1.04);const g=glow(0x4dd2ff,.34);g.position.set(0,.025,-.15);
return{head:[v,g],upd:t=>{v.material.opacity=.6+.15*Math.sin(t*3)}}};
B[24]=()=>{const lm=M(0x07070c,{metalness:.6,roughness:.15}),g=grp(...[-1,1].map(s=>mesh(new T.BoxGeometry(.075,.05,.012),lm,s*.05,.025,-.132)),mesh(new T.BoxGeometry(.03,.01,.012),lm,0,.04,-.132));[-1,1].forEach(s=>g.add(bar(new T.Vector3(s*.088,.04,-.13),new T.Vector3(s*.125,.04,-.02),.005,lm)));return{head:[g]}};
B[25]=()=>{const w=wings(0xffffff,1.15,true,.12,2.4),h=mesh(new T.TorusGeometry(.13,.012,6,24),BM(0xfff2a8),0,.3,0);h.rotation.x=Math.PI/2;
return{head:[h,glow(0xfff2a8,.42)].map((o,i)=>{if(i)o.position.y=.3;return o}),back:[w.g],upd:(t,d,o)=>{w.upd(t,.0);h.position.y=.3+Math.sin(t*2)*.012}}};

/* ---------- Halloween scenery props (used by the lobby and in-match decor) ---------- */
function jack(s=1,lite){return pumpkin(s,0xffd34a,0xff7a12,lite)}
function tomb(w=.8,h=1.1){const g=new T.Group(),m=M(0x7d8190,{roughness:1});g.add(mesh(new T.BoxGeometry(w,h,.22),m,0,h/2,0),mesh(new T.CylinderGeometry(w/2,w/2,.22,10),m,0,h,0));g.children[1].rotation.x=Math.PI/2;
const c=M(0x2c2e38);g.add(mesh(new T.BoxGeometry(.07,.36,.03),c,0,h*.62,-.12),mesh(new T.BoxGeometry(.24,.07,.03),c,0,h*.68,-.12));g.children.forEach(o=>o.castShadow=true);return g}
function bat(sz=1){const m=M(0x120a22,{side:T.DoubleSide}),R=grp(wingShape(m,sz)),L=grp(wingShape(m,sz));L.scale.x=-1;const g=grp(R,L,mesh(new T.SphereGeometry(.07*sz,6,5),m));g.userData.flap=t=>{R.rotation.z=Math.sin(t)*.7;L.rotation.z=-Math.sin(t)*.7};return g}
function tree(h=5){const g=new T.Group(),m=M(0x1b1320,{roughness:1});g.add(mesh(new T.CylinderGeometry(.18,.4,h,6),m,0,h/2,0));
[[.5,.9,.25],[.65,-.8,.2],[.8,.5,.15],[.4,-.5,.3]].forEach(([y,a,s],i)=>{const b=mesh(new T.CylinderGeometry(.03,.12,h*.45,5),m,Math.sin(a)*h*.14,h*y,Math.cos(a)*.0);b.rotation.z=-a*.9;b.rotation.y=i;g.add(b)});return g}
function moon(r=3){const g=new T.Group();g.add(mesh(new T.SphereGeometry(r,24,18),BM(0xfff1c9,{fog:false})));const h=glow(0xffe2a0,r*5.5);h.material.fog=false;g.add(h);
[[-.4,.5,.7],[.5,-.2,.5],[-.1,-.6,.4]].forEach(([x,y,s])=>g.add(mesh(new T.CircleGeometry(r*.14*s,10),BM(0xe6cf9c,{fog:false}),x*r,y*r,r*.98)));return g}

return{
 LIST,Y:16777216,
 id:v=>Math.floor((v||0)/16777216)%256,col:v=>(v||0)%16777216,pack:(c,i)=>c+i*16777216,
 info:id=>LIST.find(x=>x.id==id),
 make:(id,mat)=>{const f=B[id];if(!f)return null;const r=f();if(r.mat)r.mat(mat);return r},
 prop:{jack,tomb,bat,tree,moon,glow,wingShape,pumpkin}};
})();
