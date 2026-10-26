/* ===== Tab guard =====
   - Closing / reloading / leaving the page asks "Leave site?" first (beforeunload).
   - Ctrl+W (Cmd+W) is blocked with preventDefault. Browsers treat Ctrl+W as a reserved shortcut and ignore preventDefault on a normal page, so the
     page also asks Chrome / Edge for "Keyboard Lock" while it is fullscreen: that API hands W (and T / N) to the page instead of the browser, so Ctrl+W
     really does nothing in fullscreen. Outside fullscreen the confirm dialog above is the safety net. */
(()=>{
const lock=()=>{try{navigator.keyboard&&navigator.keyboard.lock&&navigator.keyboard.lock(['KeyW','KeyT','KeyN']).catch(()=>{})}catch(_){}},
 unlock=()=>{try{navigator.keyboard&&navigator.keyboard.unlock&&navigator.keyboard.unlock()}catch(_){}};
addEventListener('beforeunload',e=>{e.preventDefault();e.returnValue='';return''});
addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.code==='KeyW'){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('fullscreenchange',()=>{document.fullscreenElement?lock():unlock()});
document.addEventListener('webkitfullscreenchange',()=>{document.webkitFullscreenElement?lock():unlock()});
document.addEventListener('pointerlockchange',()=>{if(document.fullscreenElement)lock()});
if(document.fullscreenElement)lock();
})();
