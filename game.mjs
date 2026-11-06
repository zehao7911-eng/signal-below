import * as game from './core.mjs';
import {makeScene} from './art.mjs';
import {bridge} from './sdk.mjs';

const saveKey='signal-below-v1';
const byId=id=>document.getElementById(id);
const panel=byId('panel'), sheet=byId('sheet'), canvas=byId('view');
const scene=makeScene(canvas);
const effects={pulse:null,move:null,sparks:[]};
let profile=game.freshProfile(), sdk, audio, nextRepeat=0, pointer=null;
let notice='Pulse to reveal the passage. Recover the beacons, then return to the lift.';
let frameTime=0, lastFrame=0;

try {
  const saved=JSON.parse(localStorage.getItem(saveKey));
  if(saved?.game==='signal-below'&&saved.v===1) profile=game.cleanProfile(saved.profile);
} catch {}

function saveLocal() {
  try {
    localStorage.setItem(saveKey,JSON.stringify({game:'signal-below',v:1,profile}));
  } catch {}
}

function writeProfile(incoming,remote) {
  profile=remote?game.mergeProfiles(profile,incoming):game.cleanProfile(incoming);
  if(profile.run?.won) game.settle(profile);
  saveLocal();
  render();
}

function connect() {
  sdk=bridge({
    read:()=>({...profile}),
    write:writeProfile,
    changed:event=>{
      if(event.type==='reward') {
        notice=event.kind==='like'?'Brass chassis unlocked.':'Violet echo unlocked.';
        tone([494,659,988]);
      }
      if(event.type==='reward'||event.type==='support'||event.type==='connected') render();
    },
  });
  render();
}

function sectorNumber(level) {return String(level+1).padStart(2,'0');}
const stars=n=>'★'.repeat(n)+'☆'.repeat(3-n);
const preview=game.freshRun(0);
function currentRun() {return profile.run||preview;}
function render() {
  const run=currentRun(), s=game.sectors[run.level];
  byId('sector').textContent=s.name;
  byId('designation').textContent=sectorNumber(run.level)+' / '+s.zone.toUpperCase();
  byId('num').textContent=sectorNumber(run.level);
  byId('depth').textContent=String(40+run.level*28).padStart(3,'0')+' M';
  const [x,y]=game.point(run.position);
  byId('pos').textContent=run.position===s.start?'LIFT / ONLINE':`COL ${x} / ROW ${y}`;
  byId('beacons').textContent=run.taken.length+' / '+s.cores.length;
  byId('scans').textContent=run.scans+' / '+s.budget;
  byId('best').textContent=stars(profile.best[run.level]);
  byId('carrier').textContent=run.won?'EXTRACTION COMPLETE':run.powered?'RELAY ONLINE':run.scans?'ECHO LOCKED':'LISTENING';
  byId('sound').setAttribute('aria-label',profile.sound?'Mute sound':'Enable sound');
  byId('sound').textContent=profile.sound?'♪':'×';
  byId('message').textContent=notice;
  const extras=byId('extras'), support=sdk?.support();
  const hints=[];
  if(support?.like||profile.rewards.like) hints.push(profile.rewards.like?'Brass chassis equipped.':'Like in GameWave to unlock a brass chassis.');
  if(support?.comment||profile.rewards.comment) hints.push(profile.rewards.comment?'Violet echo equipped.':'Comment in GameWave to unlock violet echoes.');
  extras.hidden=!hints.length;
  extras.textContent=hints.join(' ');
}

function unlockAudio() {
  if(!profile.sound) return;
  try {
    audio??=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended') audio.resume().catch(()=>{});
  } catch {}
}
function tone(notes,volume=.04) {
  if(!audio||!profile.sound||document.hidden) return;
  notes.forEach((hz,i)=>{
    const at=audio.currentTime+i*.075, wave=audio.createOscillator(), gain=audio.createGain();
    wave.type='sine';
    wave.frequency.setValueAtTime(hz,at);
    gain.gain.setValueAtTime(.001,at);
    gain.gain.exponentialRampToValueAtTime(volume,at+.02);
    gain.gain.exponentialRampToValueAtTime(.001,at+.18);
    wave.connect(gain);gain.connect(audio.destination);wave.start(at);wave.stop(at+.20);
    wave.onended=()=>{wave.disconnect();gain.disconnect();};
  });
}

function burst(cell,color) {
  const [x,y]=scene.center(cell);
  for(let i=0;i<14;i++) {
    const angle=i*Math.PI*2/14;
    effects.sparks.push({x,y,time:frameTime,dx:Math.cos(angle)*38,dy:Math.sin(angle)*38,color});
  }
  effects.sparks=effects.sparks.slice(-42);
}

function execute(input) {
  if(panel.open||document.hidden) return;
  if(profile.run?.won) {result();return;}
  const run=profile.run||game.freshRun(0), priorSeen=run.seen.slice();
  const outcome=game.action(run,input);
  if(!outcome) return;
  unlockAudio();
  if(outcome.blocked) {
    notice=outcome.gate?'Sealed gate. Send a pulse toward a relay.':'Bulkhead. Try another passage.';
    tone([118],.025);render();
    return;
  }
  profile.run=run;
  sdk.start();
  if(outcome.pulse) {
    effects.pulse={time:frameTime,distances:outcome.pulse,priorSeen};
    tone([182,272,409],.046);
  }
  if(!outcome.hit&&outcome.old!==run.position) effects.move={old:outcome.old,time:frameTime};
  if(outcome.hit) {
    effects.move=null;
    burst(run.position,'#ff896d');tone([155,104],.05);
    notice='Scout contact. Back at the lift with your beacons and map.';
  } else if(outcome.relay) {
    burst(run.position,'#93ffbd');tone([330,493,740]);
    notice='Relay online. The copper gates are open.';
  } else if(outcome.core) {
    burst(run.position,'#ffc487');tone([392,587,784]);
    notice=run.taken.length===game.sectors[run.level].cores.length?'All beacons secured. Return to the lift.':'Beacon secured. Keep searching.';
  } else if(outcome.pulse) {
    notice='Echo mapped. Reached scouts pause briefly.';
  } else {
    tone([96],.019);
    if(run.taken.length===game.sectors[run.level].cores.length) notice='Lift is ready. Follow your map back.';
    else notice='Search the passage for amber beacons.';
  }
  if(outcome.won) {
    game.settle(profile);
    sdk.end();
    notice='Extraction complete.';
    burst(run.position,'#a5ffcb');tone([392,523,659,784],.052);
  }
  saveLocal();
  sdk.save();
  render();
  if(outcome.won) result();
}

function show(content) {
  sheet.innerHTML=content;
  if(!panel.open) panel.showModal();
}
function close() {if(panel.open)panel.close();}
function begin(level) {
  if(profile.run&&!profile.run.won) sdk.end();
  sdk.prepare();
  profile.run=game.freshRun(level);
  effects.pulse=null;effects.move=null;effects.sparks=[];
  notice='Pulse to reveal the passage. Recover the beacons, then return to the lift.';
  close();saveLocal();sdk.save();render();
}
const button=(text,action,primary=false)=>`<button class="button${primary?' primary':''}" data-action="${action}">${text}</button>`;
function guide() {
  show(`<div class="tag">OPERATOR BRIEF</div><h2>Find the signal.</h2>
    <p><strong>Pulse</strong> sends an echo five steps along connected passages. Echoes reveal nearby walls and tiles, power relays and briefly pause any scout they reach. Your map stays visible.</p>
    <p><strong>Move</strong> with the arrows, WASD, a swipe or a tap on an adjacent tile. Pick up every amber beacon by driving over it. Return to the lift when it turns green.</p>
    <p>Red scouts move when you act. A red dot shows the next tile when visible. Contact sends you to the lift with your discoveries intact.</p>
    <p>Earn one star for extraction, one for zero contacts, and one for staying within the pulse target. You can keep scanning beyond the target.</p>
    <div class="sheetbuttons">${button('Back to the sector','close',true)}</div>`);
}
function result() {
  const run=profile.run, rating=game.rating(run), last=run.level===game.sectors.length-1;
  const count=(n,word)=>n+' '+word+(n===1?'':'s');
  show(`<div class="tag">${last?'DIVISION REPORT':'EXTRACTION COMPLETE'}</div><h2>${last?'Signal restored.':'Back on the surface.'}</h2>
    <div class="resultStars" aria-label="${rating} out of 3 stars">${stars(rating)}</div>
    <p>${count(run.taken.length,'beacon')} recovered · ${count(run.scans,'pulse')} · ${count(run.bumps,'contact')}</p>
    <div class="sheetbuttons">${last?button('Sector map','map',true):button('Next sector','next',true)}${button('Replay','replay')}${button('View map','close')}</div>`);
}
function map() {
  const options=game.sectors.map((s,i)=>{
    const unlocked=i===0||profile.best[i-1]>0;
    return `<button class="button" data-action="level-${i}" ${unlocked?'':'disabled'}>${sectorNumber(i)} · ${s.name}<span>${unlocked?stars(profile.best[i]):'LOCKED'}</span></button>`;
  }).join('');
  show(`<div class="tag">RESCUE DIRECTORY</div><h2>Sector map</h2><div class="sectorlist">${options}</div>
    <div class="sheetbuttons">${button('Back','close',true)}${button('Restart sector','restart')}</div>`);
}
function confirmRestart(level) {
  show(`<div class="tag">LIFT CONTROL</div><h2>Start ${game.sectors[level].name}?</h2>
    <p>This replaces the current rescue checkpoint. Your best stars and cosmetics are saved.</p>
    <div class="sheetbuttons">${button('Start sector','begin-'+level,true)}${button('Keep checkpoint','close')}</div>`);
}
sheet.addEventListener('click',event=>{
  const choice=event.target.closest('button')?.dataset.action;
  if(choice==='close') close();
  if(choice==='map') map();
  if(choice==='restart') confirmRestart(currentRun().level);
  if(choice==='replay') begin(currentRun().level);
  if(choice==='next'&&profile.run?.won&&profile.run.level+1<game.sectors.length) begin(profile.run.level+1);
  if(choice?.startsWith('begin-')) begin(Number(choice.slice(6)));
  if(choice?.startsWith('level-')) {
    const level=Number(choice.slice(6));
    if(level===currentRun().level&&!profile.run?.won) close();
    else if(profile.run?.turn>0&&!profile.run.won) confirmRestart(level);
    else begin(level);
  }
});
byId('help').addEventListener('click',guide);
byId('menu').addEventListener('click',map);
byId('restart').addEventListener('click',()=>confirmRestart(currentRun().level));
byId('sound').addEventListener('click',()=>{
  profile.sound=!profile.sound;
  if(profile.sound){unlockAudio();tone([540]);}
  saveLocal();sdk.save();render();
});
byId('pulse').addEventListener('click',()=>execute('pulse'));
document.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>execute(Number(b.dataset.move))));
const keys={ArrowUp:0,w:0,ArrowRight:1,d:1,ArrowDown:2,s:2,ArrowLeft:3,a:3,' ':'pulse'};
window.addEventListener('keydown',event=>{
  if(panel.open||event.altKey||event.ctrlKey||event.metaKey) return;
  const key=event.key.length===1?event.key.toLowerCase():event.key, input=keys[key];
  if(input===undefined||key===' '&&event.target instanceof HTMLButtonElement) return;
  event.preventDefault();
  if(event.repeat&&(input==='pulse'||performance.now()<nextRepeat)) return;
  nextRepeat=performance.now()+145;
  execute(input);
});
canvas.addEventListener('pointerdown',event=>{
  if(pointer||!event.isPrimary||event.button!==0) return;
  pointer={id:event.pointerId,x:event.clientX,y:event.clientY};
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointerup',event=>{
  if(pointer?.id!==event.pointerId) return;
  const dx=event.clientX-pointer.x, dy=event.clientY-pointer.y;
  pointer=null;
  if(Math.hypot(dx,dy)>16) {
    execute(Math.abs(dx)>Math.abs(dy)?(dx>0?1:3):(dy>0?2:0));
    return;
  }
  const tile=scene.at(event.clientX,event.clientY);
  const direction=game.directions.findIndex((_,i)=>game.neighbor(currentRun().position,i)===tile);
  if(tile>=0&&direction>=0) execute(direction);
});
for(const name of ['pointercancel','lostpointercapture']) canvas.addEventListener(name,()=>{pointer=null;});
document.addEventListener('visibilitychange',()=>{
  pointer=null;
  if(document.hidden) saveLocal();
});
window.addEventListener('pagehide',()=>{saveLocal();sdk.stop();});
window.addEventListener('pageshow',event=>{if(event.persisted) connect();});
window.addEventListener('resize',()=>scene.resize());
new ResizeObserver(()=>scene.resize()).observe(canvas);

function frame(now) {
  requestAnimationFrame(frame);
  if(document.hidden||now-lastFrame<1000/40) return;
  lastFrame=now;frameTime=now/1000;
  if(effects.pulse&&frameTime-effects.pulse.time>.82) effects.pulse=null;
  if(effects.move&&frameTime-effects.move.time>.2) effects.move=null;
  effects.sparks=effects.sparks.filter(p=>frameTime-p.time<.65);
  const run=currentRun();
  scene.frame(run,game.sectors[run.level],frameTime,effects,profile.rewards);
}

scene.resize();
connect();
requestAnimationFrame(frame);
if(profile.run?.won) result();
else if(profile.run?.turn) {
  notice='Checkpoint restored. Continue the rescue.';
  render();
}
