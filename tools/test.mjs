import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import * as game from '../core.mjs';
import {bridge} from '../sdk.mjs';

function solve(level) {
  const initial=game.freshRun(level), s=game.sectors[level];
  const queue=[{run:initial,path:[]}], visited=new Set();
  for(let k=0;k<queue.length;k++) {
    const {run,path}=queue[k];
    if(run.won) return path;
    for(const input of [0,1,2,3,'pulse']) {
      if(input==='pulse'&&run.scans===s.budget) continue;
      const next=structuredClone(run), event=game.action(next,input);
      if(!event||event.blocked||event.hit) continue;
      const state=JSON.stringify([next.position,next.taken.slice().sort(),next.powered,next.patrol,next.scans,next.won]);
      if(visited.has(state)) continue;
      visited.add(state);
      queue.push({run:next,path:[...path,input]});
    }
  }
  throw Error('No three-star route for '+s.name);
}

const routes=game.sectors.map((s,level)=>{
  const path=solve(level);
  let profile=game.freshProfile();
  profile.best.fill(3,0,level);
  profile.run=game.freshRun(level);
  const gate= s.gates[0];
  if(gate!==undefined) {
    assert(!game.open(s,gate,false));
    assert(game.open(s,gate,true));
  }
  for(const input of path) {
    const event=game.action(profile.run,input);
    assert(event&&!event.blocked&&!event.hit);
    const restored=game.cleanProfile(JSON.parse(JSON.stringify(profile)));
    assert.deepEqual(restored.run,profile.run);
    profile=restored;
  }
  assert.equal(profile.run.position,s.start);
  assert.equal(profile.run.taken.length,s.cores.length);
  assert.equal(game.rating(profile.run),3);
  assert.equal(game.action(profile.run,'pulse'),null);
  game.settle(profile);game.settle(profile);
  assert.equal(profile.best[level],3);
  console.log(s.name,path.length+' turns',profile.run.scans+' pulses');
  return path;
});

const first=game.freshRun(0), known=first.seen.reduce((a,b)=>a+b,0);
assert(game.action(first,2).blocked);
assert.equal(first.turn,0);
const scan=game.action(first,'pulse');
assert(first.seen.reduce((a,b)=>a+b,0)>known);
assert([...scan.pulse.values()].every(n=>n<=5));
assert(!scan.pulse.has(game.index(2,7))||!game.open(game.sectors[0],game.index(2,7),false));
const relay=game.freshRun(2);
assert(game.action(relay,'pulse').relay);
assert(relay.powered);

const collision=game.freshRun(1);
for(let d=0;d<4;d++) game.action(collision,1);
assert(collision.bumps>0);
assert.equal(collision.position,game.sectors[1].start);
const stunned=game.freshRun(1);
const st=game.action(stunned,'pulse');
assert(st.pulse.has(game.scoutPositions(stunned)[0]));
assert.equal(stunned.patrol[0].stun,1);
assert(!game.cleanProfile({best:[0,3],run:{...first,position:0}}).run);
assert.deepEqual(game.cleanProfile({best:[0,3]}).best,Array(8).fill(0));
const old=game.freshProfile(), remote=game.freshProfile();
old.run=first;remote.run=collision;remote.best[0]=3;remote.rewards.like=true;
assert.equal(game.mergeProfiles(old,remote).run,first);
assert.equal(game.mergeProfiles(old,remote).best[0],3);
assert(game.mergeProfiles(old,remote).rewards.like);

class Clock {
  id=0;
  jobs=new Map();
  schedule=(fn,ms)=>{this.jobs.set(++this.id,{fn,ms});return this.id;};
  cancel=id=>this.jobs.delete(id);
  tick(ms) {
    for(const [id,job] of [...this.jobs]) {
      if(job.ms>ms||!this.jobs.delete(id)) continue;
      job.fn();
    }
  }
}
const micro=async()=>{for(let i=0;i<8;i++) await Promise.resolve();};
let host, clock=new Clock(), starts=0, ends=0, offs=0, saved=[], like, comment;
let p=game.freshProfile(), events=[];
const adapter=()=>bridge({
  host:()=>host,read:()=>({...p}),write:(incoming,isRemote)=>{p=isRemote?game.mergeProfiles(p,incoming):game.cleanProfile(incoming);},
  changed:e=>events.push(e),schedule:clock.schedule,cancel:clock.cancel,timeout:100,
});
let sdk=adapter();
p.run=game.freshRun(0);
game.action(p.run,'pulse');sdk.start();sdk.save();
host={gameStart(){starts++;}};
sdk.connect();sdk.connect();
assert.equal(starts,1);
Object.assign(host,{
  gameOver(){ends++;},
  loadUserGameState:async()=>({}),
  saveUserGameState:async v=>{saved.push(v);return {code:0};},
  onLike:async cb=>{like=cb;return {code:0,data:{unsubscribe:()=>offs++}};},
  onComment:async cb=>{comment=cb;return {code:0,data:{unsubscribe:()=>offs++}};},
  getGameViewport:()=>({width:390,height:844,density:3}),
});
sdk.connect();await micro();
assert.deepEqual(sdk.viewport(),{width:390,height:844,density:3});
assert.deepEqual(sdk.support(),{like:true,comment:true});
assert.equal(saved[0].game,'signal-below');
assert.deepEqual(saved[0].profile.run,p.run);
like({project_id:'1',status:false});
like({project_id:1,status:true});
comment({project_id:'1'});
assert.deepEqual(p.rewards,{like:false,comment:false});
like({project_id:'1000000000000000001',status:true,count:0});
like({project_id:'1000000000000000001',status:true,count:8});
comment({project_id:'1000000000000000001',content:'',count:0});
comment({project_id:'1000000000000000001',content:'again',count:1});
await micro();
assert.equal(events.filter(e=>e.type==='reward').length,2);
sdk.stop();
assert.equal(offs,2);
p=game.cleanProfile(JSON.parse(JSON.stringify(p)));
sdk=adapter();await micro();
assert.equal(starts,1);
game.action(p.run,0);sdk.start();sdk.start();
assert.equal(starts,2);
for(const input of routes[0].slice(1)) game.action(p.run,input);
assert(p.run.won);
game.settle(p);sdk.end();sdk.end();sdk.save();await micro();
assert.equal(ends,1);
assert(saved.at(-1).profile.run.won);
sdk.stop();
assert.equal(offs,4);

clock=new Clock();
let release, badWrites=0, lateOff=0;
host={
  onLike:()=>new Promise(resolve=>{release=resolve;}),
  onComment:()=>Promise.reject(Error('host error')),
  loadUserGameState:()=>Promise.reject(Error('offline')),
  saveUserGameState:()=>{badWrites++;},
  getGameViewport:()=>Promise.reject(Error('async')),
};
sdk=adapter();
assert.equal(sdk.viewport(),null);
await micro();sdk.save();clock.tick(100);
assert.deepEqual(sdk.support(),{like:false,comment:false});
sdk.stop();release({code:0,data:{unsubscribe:()=>lateOff++}});await micro();
assert.equal(lateOff,1);
assert.equal(badWrites,0);

host={loadUserGameState:async()=>({game:'unrelated',profile:{}}),saveUserGameState:()=>badWrites++};
sdk=adapter();sdk.save();await micro();assert.equal(badWrites,0);sdk.stop();
host={loadUserGameState:()=>new Promise(()=>{}),saveUserGameState:()=>badWrites++};
sdk=adapter();sdk.save();clock.tick(100);assert.equal(badWrites,0);sdk.stop();
let attempts=0;
host={loadUserGameState:async()=>({}),saveUserGameState:()=>++attempts===1?new Promise(()=>{}):Promise.resolve({code:0})};
sdk=adapter();sdk.save();await micro();clock.tick(100);sdk.connect();await micro();
assert.equal(attempts,2);sdk.stop();

const root=fileURLToPath(new URL('../',import.meta.url));
const html=fs.readFileSync(root+'index.html','utf8');
assert.equal(html,fs.readFileSync(root+'standalone.html','utf8'));
assert(!html.includes('src="./game.mjs"'));
new Function(html.match(/<script>\n([\s\S]*?)<\/script>/)[1]);
if(process.argv.includes('--routes')) console.log('ROUTES '+JSON.stringify(routes));
console.log('Eight complete three-star routes, checkpoint roundtrips, rule edges, SDK mocks and bundle syntax passed.');
