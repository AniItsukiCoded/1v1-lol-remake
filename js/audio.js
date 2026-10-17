const SFX=(()=>{let c,mus=null,on=true;const A=()=>c||(c=new(window.AudioContext||window.webkitAudioContext)());let mg;const out=()=>{if(!mg){mg=A().createGain();mg.connect(A().destination);mg.gain.value=window.CFG?CFG.vol:1}return mg};
function tone(f,d,type='sine',v=.15,sl=0,dl=0){const a=A(),o=a.createOscillator(),g=a.createGain(),t=a.currentTime+dl;o.type=type;o.frequency.setValueAtTime(f,t);if(sl)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+sl),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(out());o.start(t);o.stop(t+d)}
function noise(d,v=.3,f=1500){const a=A(),b=a.createBuffer(1,a.sampleRate*d,a.sampleRate),x=b.getChannelData(0);for(let i=0;i<x.length;i++)x[i]=(Math.random()*2-1)*(1-i/x.length);const s=a.createBufferSource(),fl=a.createBiquadFilter(),g=a.createGain();s.buffer=b;fl.frequency.value=f;g.gain.value=v;s.connect(fl).connect(g).connect(out());s.start()}
const bass=[55,55,82,55,73,73,98,73];let i=0;
return{resume(){A().resume()},setVol(v){out().gain.value=v},click(){tone(660,.08,'triangle',.12)},
shoot(v=1){noise(.18,.35*v,2800);tone(150,.14,'square',.2*v,-110)},hit(){tone(1200,.07,'square',.12);tone(800,.1,'square',.1,0,.05)},
hurt(){tone(120,.25,'sawtooth',.25,-60);noise(.12,.2,600)},empty(){tone(300,.05,'square',.1)},
reload(){tone(400,.06,'square',.1);tone(300,.08,'square',.1,0,.5);tone(600,.06,'square',.12,0,1.2)},
jump(){tone(250,.15,'sine',.12,300)},land(){noise(.1,.2,400)},step(){noise(.05,.06,500)},
death(){tone(300,.7,'sawtooth',.25,-250)},kill(){[523,659,784,1046].forEach((f,k)=>tone(f,.15,'triangle',.15,0,k*.07))},
win(){[523,659,784,1046,1318].forEach((f,k)=>tone(f,.3,'triangle',.18,0,k*.12))},lose(){[400,350,300,200].forEach((f,k)=>tone(f,.35,'sawtooth',.12,0,k*.15))},
music(s){if(s===undefined)s=!on;on=s;clearInterval(mus);mus=null;if(on)mus=setInterval(()=>{tone(bass[i++%8],.38,'triangle',.07);if(i%4==0)tone(bass[i%8]*4,.2,'sine',.025)},400)}}})();
