'use strict';
/* shared helpers for the browser tests: static server + headless Chrome with the CDN scripts replaced by local copies / the Firebase stand-in */
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'..','..');
const need=n=>{try{return require(n)}catch(e){console.error('Missing dev dependency "'+n+'". Run: npm i --no-save puppeteer-core three@0.128.0');process.exit(2)}};
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
function serve(){return new Promise(res=>{const s=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p=='/')p='/index.html';const f=path.join(ROOT,p);
 if(!f.startsWith(ROOT)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end('missing '+p);return}r.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','cache-control':'no-store'});fs.createReadStream(f).pipe(r)});s.listen(0,'127.0.0.1',()=>res({s,url:'http://127.0.0.1:'+s.address().port}))})}
function fnlib(){const rd=f=>fs.readFileSync(path.join(ROOT,'functions',f),'utf8');
 return `window.__fnlib=(()=>{const M={},C={};const req=n=>{n=n.replace(/^.*\\//,'');if(C[n])return C[n].exports;const m=C[n]={exports:{}};M[n](m,m.exports,req);return m.exports};
M['catalog.json']=(module)=>{module.exports=${rd('catalog.json')}};
M['rankcore.js']=function(module,exports,require){${rd('lib/rankcore.js')}\n};
M['economy.js']=function(module,exports,require){${rd('lib/economy.js')}\n};
M['owner.js']=function(module,exports,require){${rd('lib/owner.js')}\n};
return{economy:req('economy.js'),owner:req('owner.js')}})();`}
async function launch(){const pp=need('puppeteer-core');const three=fs.readFileSync(require.resolve('three/build/three.min.js'),'utf8'),mock=fs.readFileSync(path.join(__dirname,'firebase-mock.js'),'utf8')+'\n'+fnlib();
 const exe=process.env.CHROME||['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(f=>fs.existsSync(f));
 const browser=await pp.launch({executablePath:exe,headless:'new',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--mute-audio','--window-size=1280,800','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--disable-background-timer-throttling']});
 async function page(url,opt){opt=opt||{};const p=await browser.newPage();await p.setViewport({width:opt.w||1280,height:opt.h||800,deviceScaleFactor:1,isMobile:!!opt.mobile,hasTouch:!!opt.mobile});const errs=[];p.errs=errs;
  p.on('pageerror',e=>errs.push('PAGEERROR '+(e.stack||e.message).split('\n').slice(0,3).join(' | ')));p.on('console',m=>{if(m.type()=='error'){const t=m.text();if(!/Failed to load resource|favicon/.test(t))errs.push('CONSOLE '+t.slice(0,400))}});
  p.on('dialog',d=>d.accept(opt.prompt||'').catch(()=>{}));
  await p.setRequestInterception(true);
  p.on('request',r=>{const u=r.url();
   if(u.includes('three.min.js'))return r.respond({contentType:'text/javascript',body:three});
   if(u.includes('firebase-app-compat'))return r.respond({contentType:'text/javascript',body:mock});
   if(u.includes('gstatic.com/firebasejs'))return r.respond({contentType:'text/javascript',body:'/* replaced by tests/browser/firebase-mock.js */'});
   if(u.startsWith('http://127.0.0.1')||u.startsWith('data:')||u.startsWith('blob:'))return r.continue();
   if(/ipwho|ipapi|ipify/.test(u))return r.respond({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:'{"ip":"203.0.113.7","success":true,"city":"Testville","country":"Nowhere"}'});
   if(/fonts\.g/.test(u))return r.respond({contentType:'text/css',body:''});
   errs.push('BLOCKED external request '+u.slice(0,120));r.abort()});
  /* keep animation frames running in tabs that are not in front (two players = two tabs) */
  try{const c=await p.createCDPSession();await c.send('Emulation.setFocusEmulationEnabled',{enabled:true})}catch(e){}
  await p.goto(url,{waitUntil:'load'});return p}
 /* an empty page that only holds the shared mock database, so it survives a reload of the game tab (like the real server would) */
 const keeper=async base=>{const k=await browser.newPage();await k.setRequestInterception(true);k.on('request',r=>r.url().includes('__keeper')?r.respond({contentType:'text/html',body:'<script>'+mock.replace(/<\/script/g,'<\\/script')+'</script>'}):r.continue());await k.goto(base+'/__keeper');return k};
 return{browser,page,keeper}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
module.exports={serve,launch,sleep,ROOT};
