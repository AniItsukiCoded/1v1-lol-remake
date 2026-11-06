/* Aim Trainer launcher (the drills themselves live in src/game/135-trainer.js -> js/game.js) */
window.beginTrainer=function(drill){
 try{qStop&&qStop();LB2.afkStop();LB2.sheet(0,1)}catch(_){}
 show('queue');$('#qtxt').textContent='Loading the training range…';$('#qbot').style.display='none';$('#cancel').style.display='none';
 requestAnimationFrame(()=>setTimeout(()=>{$('#cancel').style.display='';show('none');
  try{window.touchEnter&&touchEnter();SFX.resume();
   Game.start({db:null,uid:user.uid,name:nm(),mid:'trn_'+now(),mode:'trainer',bot:true,trainer:1,drill,ros:[{u:user.uid,n:nm(),s:SK(),t:0}],clock:now,skin:SK(),onLeave:()=>{menu()},onEnd:()=>{menu()}})}
  catch(e){console.error(e);menu();toast("Could not start the training range")}},30))};
