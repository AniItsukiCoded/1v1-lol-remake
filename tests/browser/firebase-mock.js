/* TEST ONLY. In-memory stand-in for the Firebase compat SDK (auth + realtime database + callable functions), loaded instead of the CDN scripts by
   run.js. Several pages in one browser share the database through a BroadcastChannel, so two "players" can be tested against each other.
   Callable functions run the REAL functions/lib code (injected by run.js as window.__fnlib) against this database.
   Database RULES are not simulated here (tests/rules.test.js covers them). */
(()=>{
const bc=new BroadcastChannel('fbmock');let root={};const L=[];let pushN=0;const disc=[];
const clone=v=>v==null?null:JSON.parse(JSON.stringify(v));
const parts=p=>String(p).split('/').filter(Boolean);
const get=p=>{let o=root;for(const k of parts(p)){if(o==null||typeof o!='object')return null;o=o[k]}return o===undefined?null:clone(o)};
const prune=()=>{const f=o=>{for(const k in o){if(o[k]&&typeof o[k]=='object'){f(o[k]);if(!Object.keys(o[k]).length)delete o[k]}else if(o[k]==null)delete o[k]}};f(root)};
const rawSet=(p,v)=>{const ks=parts(p);if(!ks.length){root=v||{};return}let o=root;for(let i=0;i<ks.length-1;i++){if(o[ks[i]]==null||typeof o[ks[i]]!='object')o[ks[i]]={};o=o[ks[i]]}if(v==null)delete o[ks[ks.length-1]];else o[ks[ks.length-1]]=clone(v);prune()};
const sv=(v,cur)=>{if(v&&typeof v=='object'){if(v['.sv']==='timestamp')return Date.now();if(v['.sv']&&v['.sv'].increment!=null)return(+cur||0)+v['.sv'].increment;const o=Array.isArray(v)?[]:{};for(const k in v)o[k]=sv(v[k],cur&&cur[k]);return o}return v};
const rel=(a,b)=>a===b||a.startsWith(b+'/')||b.startsWith(a+'/')||a===''||b==='';
const snap=(path,val)=>({key:parts(path).pop()||null,ref:ref(path),val:()=>clone(val),exists:()=>val!=null,child:k=>snap(path+'/'+k,val&&typeof val=='object'?(val[k]===undefined?null:val[k]):null),forEach(f){if(val&&typeof val=='object')for(const k of Object.keys(val))if(f(snap(path+'/'+k,val[k]))===true)return true},numChildren:()=>val&&typeof val=='object'?Object.keys(val).length:0,hasChild:k=>!!(val&&val[k]!=null)});
const applyQ=(val,q)=>{if(!q||val==null||typeof val!='object')return val;let es=Object.entries(val);const f=q.child?(e=>e[1]&&e[1][q.child]):(e=>e[0]);
 if(q.child)es=es.filter(e=>e[1]&&e[1][q.child]!=null);if(q.eq!==undefined)es=es.filter(e=>f(e)===q.eq);if(q.start!==undefined)es=es.filter(e=>f(e)>=q.start);if(q.end!==undefined)es=es.filter(e=>f(e)<=q.end);
 es.sort((a,b)=>f(a)<f(b)?-1:f(a)>f(b)?1:0);if(q.first)es=es.slice(0,q.first);if(q.last)es=es.slice(-q.last);const o={};es.forEach(e=>o[e[0]]=e[1]);return Object.keys(o).length?o:null};
function fire(path){L.slice().forEach(l=>{if(!rel(l.path,path))return;const v=applyQ(get(l.path),l.q);
 if(l.type=='value'){const j=JSON.stringify(v);if(j===l.last)return;l.last=j;try{l.cb(snap(l.path,v))}catch(e){console.error('listener',e)}}
 else if(l.type=='child_added'){const o=v&&typeof v=='object'?v:{};Object.keys(o).forEach(k=>{if(!l.seen.has(k)){l.seen.add(k);try{l.cb(snap(l.path+'/'+k,o[k]))}catch(e){console.error('listener',e)}}});[...l.seen].forEach(k=>{if(!(k in o))l.seen.delete(k)})}
 else if(l.type=='child_changed'){const o=v&&typeof v=='object'?v:{};l.prev=l.prev||{};Object.keys(o).forEach(k=>{const j=JSON.stringify(o[k]);if(l.prev[k]!==undefined&&l.prev[k]!==j){try{l.cb(snap(l.path+'/'+k,o[k]))}catch(e){console.error('listener',e)}}l.prev[k]=j})}})}
function write(p,v,quiet){rawSet(p,v);if(!quiet)bc.postMessage({p,v:get(p)});fire(parts(p).join('/'))}
const merge=(a,b)=>{if(b==null||typeof b!='object')return b==null?a:b;if(a==null||typeof a!='object')return b;const o=Object.assign({},a);for(const k in b)o[k]=merge(a[k],b[k]);return o};
bc.onmessage=e=>{const m=e.data;if(m.sync){if(m.root&&!window.__fbSynced){root=merge(m.root,root);window.__fbSynced=1;fire('')}return}if(m.hello){bc.postMessage({sync:1,root});return}if(m.f!==undefined){fire(parts(m.f).join('/'));return}rawSet(m.p,m.v);if(!m.q)fire(parts(m.p).join('/'))};
bc.postMessage({hello:1});
const later=v=>new Promise(r=>setTimeout(()=>r(v),1));
function ref(path,q){path=parts(path||'').join('/');const Q=x=>ref(path,Object.assign({},q,x));
 const r={key:parts(path).pop()||null,path,toString:()=>path,child:k=>ref(path+'/'+k),get parent(){return ref(parts(path).slice(0,-1).join('/'))},
  set:v=>{write(path,sv(v,get(path)));return later()},update:m=>{const ks=Object.keys(m);ks.forEach(k=>{rawSet(path+'/'+k,sv(m[k],get(path+'/'+k)));bc.postMessage({p:path+'/'+k,v:get(path+'/'+k),q:1})});bc.postMessage({f:path});fire(path);return later()} /* atomic like the real SDK: listeners see the finished update */,remove:()=>{write(path,null);return later()},
  push:v=>{const k='-M'+String(Date.now()).slice(-9)+String(++pushN).padStart(4,'0')+Math.random().toString(36).slice(2,6),c=ref(path+'/'+k);if(v!==undefined)write(path+'/'+k,sv(v));c.then=(f,g)=>later(c).then(()=>{delete c.then;return f?f(c):c},g);c.catch=()=>c;return c},
  once:()=>later().then(()=>{const v=path=='.info/connected'?true:path=='.info/serverTimeOffset'?0:applyQ(get(path),q);return snap(path,v)}),
  on:(type,cb,err)=>{const l={path,type,cb,q,last:undefined,seen:new Set()};L.push(l);setTimeout(()=>{if(!L.includes(l))return;if(path=='.info/connected'){cb(snap(path,true));return}if(path=='.info/serverTimeOffset'){cb(snap(path,0));return}const v=applyQ(get(path),q);if(type=='value'){l.last=JSON.stringify(v);cb(snap(path,v))}else if(type=='child_changed'){l.prev={};Object.keys(v||{}).forEach(k=>l.prev[k]=JSON.stringify(v[k]))}else fire(path)},1);return cb},
  off:(type,cb)=>{for(let i=L.length-1;i>=0;i--)if(L[i].path===path&&(!type||L[i].type===type)&&(!cb||L[i].cb===cb))L.splice(i,1)},
  transaction:(fn)=>later().then(()=>{const cur=get(path),nv=fn(clone(cur));if(nv===undefined)return{committed:false,snapshot:snap(path,cur)};write(path,sv(nv,cur));return{committed:true,snapshot:snap(path,get(path))}}),
  onDisconnect:()=>({remove:()=>{disc.push({path,v:null});return later()},set:v=>{disc.push({path,v});return later()},update:()=>later(),cancel:()=>{for(let i=disc.length-1;i>=0;i--)if(rel(disc[i].path,path)&&disc[i].path.startsWith(path))disc.splice(i,1);return later()}}),
  orderByChild:c=>Q({child:c}),orderByKey:()=>Q({}),equalTo:v=>Q({eq:v}),startAt:v=>Q({start:v}),endAt:v=>Q({end:v}),limitToFirst:n=>Q({first:n}),limitToLast:n=>Q({last:n})};return r}
const database=()=>({ref:p=>ref(p),goOffline(){},goOnline(){}});database.ServerValue={TIMESTAMP:{'.sv':'timestamp'},increment:n=>({'.sv':{increment:n}})};
/* ---- auth ---- */
const acl=[];let cur=null;const accts=JSON.parse(sessionStorage.getItem('fbmock_accts')||'{}');
const mk=(uid,anon,name,email)=>({uid,isAnonymous:anon,displayName:name||null,email:email||null,updateProfile(p){if(p.displayName!=null)this.displayName=p.displayName;if(this.email&&accts[this.email]){accts[this.email].name=this.displayName;sessionStorage.setItem('fbmock_accts',JSON.stringify(accts))}return later()},getIdToken:()=>later('tok')});
const setUser=u=>{cur=u;A.currentUser=u;acl.forEach(f=>setTimeout(()=>f(u),1))};
const uidOf=e=>('uid'+btoa(e).replace(/[^a-zA-Z0-9]/g,'')+'000000000000000000000000').slice(0,28);
const A={currentUser:null,onAuthStateChanged(f){acl.push(f);setTimeout(()=>f(cur),1);return()=>{}},
 signInAnonymously(){const u=mk('anon'+Math.random().toString(36).slice(2,12).padEnd(24,'0'),true);setUser(u);return later({user:u})},
 createUserWithEmailAndPassword(e,p){if(accts[e])return Promise.reject(Object.assign(new Error('email already in use'),{code:'auth/email-already-in-use'}));accts[e]={p,name:null};sessionStorage.setItem('fbmock_accts',JSON.stringify(accts));const u=mk(uidOf(e),false,null,e);setUser(u);return later({user:u})},
 signInWithEmailAndPassword(e,p){if(!accts[e]||accts[e].p!==p)return Promise.reject(Object.assign(new Error('wrong password'),{code:'auth/wrong-password'}));const u=mk(uidOf(e),false,accts[e].name,e);setUser(u);return later({user:u})},
 signInWithCredential(){return Promise.reject(new Error('n/a'))},signInWithPopup(){return Promise.reject(new Error('n/a'))},signOut(){setUser(null);return later()},useDeviceLanguage(){}};
const auth=()=>A;auth.EmailAuthProvider={credential:(e,p)=>({e,p})};auth.GoogleAuthProvider=function(){};
/* ---- callable functions -> the real functions/lib code ---- */
const list=o=>Object.entries(o||{}).map(([key,val])=>({key,val}));
const fdb={get:async p=>get(p),tx:async(p,fn)=>{const r=fn(get(p));if(r===undefined)return{committed:false,value:get(p)};write(p,r);return{committed:true,value:get(p)}},update:async m=>{Object.keys(m).forEach(k=>write(k,m[k]))},push:async(p,v)=>{write(p+'/'+fdb.id(),v)},id:()=>'-F'+Date.now()+String(++pushN).padStart(5,'0'),
 top:async(p,c,n)=>list(get(p)).filter(x=>x.val&&x.val[c]!=null).sort((a,b)=>b.val[c]-a.val[c]).slice(0,n),find:async(p,c,v,n)=>list(get(p)).filter(x=>x.val&&x.val[c]===v).slice(0,n),prefix:async(p,c,q,n)=>list(get(p)).filter(x=>x.val&&String(x.val[c]||'').startsWith(q)).slice(0,n),last:async(p,n)=>list(get(p)).sort((a,b)=>a.key<b.key?-1:1).slice(-n)};
const functions=()=>({httpsCallable:name=>async data=>{await later();window.__fnCalls=(window.__fnCalls||0)+1;if(window.__fnDown)throw Object.assign(new Error('internal'),{code:'functions/unavailable'});const lib=window.__fnlib,u=cur;
 const ctx={uid:u&&u.uid,anon:!!(u&&u.isAnonymous),name:(u&&u.displayName)||'Player',now:Date.now()+(window.__fnSkew||0)};
 try{if(name=='econ'){const ban=get('bans/'+ctx.uid),ev=get('meta/event');ctx.owner=[true,1].includes(get('ownerUids/'+ctx.uid))&&!ctx.anon;ctx.banned=!!ban&&(!ban.until||ban.until>ctx.now)&&!ctx.owner;ctx.evForce=ev==='on'||ev==='off'?ev:null;ctx.rnd=Math.random;return{data:await lib.economy.handle(fdb,ctx,clone(data))}}
  return{data:await lib.owner.handle(fdb,ctx,clone(data))}}
 catch(e){if(e&&e.code&&(e instanceof lib.economy.EconError||e instanceof lib.owner.OwnerError))throw Object.assign(new Error(e.message),{code:'functions/failed-precondition',details:{code:e.code,state:e.state||null}});console.error('FUNCTION CRASH',e);throw Object.assign(new Error('internal'),{code:'functions/internal'})}}});
const app={functions};
window.firebase={initializeApp:()=>app,app:()=>app,auth,database,functions};
window.__fb={get,write,disconnect(){disc.splice(0).forEach(d=>write(d.path,d.v))},root:()=>root,L};
})();
