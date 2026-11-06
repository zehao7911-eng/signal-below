export const directions = [[0,-1],[1,0],[0,1],[-1,0]];

const plans = [
  ['First Contact', 'Pump Annex', 5, [
    '###########','#..C......#','#.####.##.#','#......##.#','#.###.....#','#.#..###..#','#....C....#','#S#########','###########']],
  ['Blue Intake', 'Pump Annex', 6, [
    '###########','#....#...C#','#.##.#.##.#','#..#...#..#','##.#####.##','#..C...#..#','#.####....#','#S....d...#','###########']],
  ['Resonance Lock', 'Flooded Works', 6, [
    '###########','#....#...C#','#.##.g.##.#','#..#.#....#','#.r..#.#..#','#.##.#.####','#..#.#.C..#','#S....#####','###########']],
  ['Crossing Watch', 'Flooded Works', 6, [
    '###########','#....C....#','#.##.#.##.#','#..#.#.#..#','#..d...d..#','##.###.##.#','#C...#...C#','#....S....#','###########']],
  ['The Long Return', 'Flooded Works', 7, [
    '###########','#C..#...C.#','###.#.###.#','#...#.#...#','#.#.g...#.#','#.#.#.###.#','#.r.#...#.#','#S..#.#..C#','###########']],
  ['Copper Junction', 'Relay Deep', 7, [
    '###########','#....C....#','#.###.###.#','#..r#...#.#','##..g.d...#','#...#.###.#','#C..#...#C#','#....S....#','###########']],
  ['Dead Signal', 'Relay Deep', 8, [
    '###########','#C....#..C#','#.##..#.#.#','#....dg.#.#','###.#.#...#','#r..#.#.#.#','#.#...#.#C#','#S....g...#','###########']],
  ['The Last Relay', 'Relay Deep', 8, [
    '###########','#C..#....C#','#.#.#.###.#','#.#.g...#.#','#.r.#.d...#','#.#.#.###.#','#C..#...#C#','#....S....#','###########']],
];

export const width = 11, height = 9;
export const index = (x,y) => y*width+x;
export const point = i => [i%width, Math.floor(i/width)];
export function neighbor(i,d) {
  const [x,y]=point(i), [dx,dy]=directions[d];
  const nx=x+dx, ny=y+dy;
  return nx>=0&&ny>=0&&nx<width&&ny<height ? index(nx,ny) : -1;
}

export const sectors = plans.map(([name,zone,budget,rows]) => {
  if (rows.length!==height || rows.some(row=>row.length!==width)) throw Error('Invalid sector layout');
  const cells=[...rows.join('')];
  const find = char => cells.flatMap((c,i)=>c===char?[i]:[]);
  const plain = i => cells[i]==='.';
  const patrols = find('d').map(center=>{
    const axis = [1,0].find(d=>plain(neighbor(center,d)) && plain(neighbor(center,(d+2)%4)));
    if (axis===undefined) return [center];
    const start=neighbor(center,(axis+2)%4), end=neighbor(center,axis);
    return [center,end,center,start];
  });
  return {name,zone,budget,cells,start:find('S')[0],cores:find('C'),relays:find('r'),gates:find('g'),patrols};
});

export const freshProfile = () => ({best:sectors.map(()=>0),rewards:{like:false,comment:false},sound:true,run:null});
export const open = (s,i,powered) => i>=0 && s.cells[i]!=='#' && (s.cells[i]!=='g'||powered);

function rememberNear(run,s) {
  run.seen[run.position]=1;
  for(let d=0;d<4;d++) {
    const n=neighbor(run.position,d);
    if(n>=0) run.seen[n]=1;
  }
}

export function freshRun(level) {
  const s=sectors[level];
  const run={level,position:s.start,seen:Array(width*height).fill(0),taken:[],powered:false,
    patrol:s.patrols.map(()=>({step:0,stun:0})),turn:0,scans:0,bumps:0,won:false};
  rememberNear(run,s);
  return run;
}

const integer = (x,min,max) => Number.isInteger(x)&&x>=min&&x<=max;
export function cleanProfile(raw) {
  const clean=freshProfile();
  if(!raw || typeof raw!=='object') return clean;
  clean.best=sectors.map((_,i)=>integer(raw.best?.[i],0,3)?raw.best[i]:0);
  for(let i=1;i<sectors.length;i++) if(!clean.best[i-1]) clean.best[i]=0;
  clean.rewards={like:raw.rewards?.like===true,comment:raw.rewards?.comment===true};
  clean.sound=raw.sound!==false;
  const r=raw.run;
  if(!r||!integer(r.level,0,sectors.length-1)||r.level>0&&!clean.best[r.level-1]) return clean;
  const s=sectors[r.level];
  if(!integer(r.position,0,width*height-1)||!open(s,r.position,r.powered===true)) return clean;
  if(!Array.isArray(r.seen)||r.seen.length!==width*height||r.seen.some(v=>v!==0&&v!==1)) return clean;
  if(!Array.isArray(r.taken)||r.taken.some(v=>!s.cores.includes(v))||new Set(r.taken).size!==r.taken.length) return clean;
  if(!Array.isArray(r.patrol)||r.patrol.length!==s.patrols.length||r.patrol.some((p,i)=>!p||!integer(p.step,0,s.patrols[i].length-1)||!integer(p.stun,0,2))) return clean;
  if(!integer(r.turn,0,100000)||!integer(r.scans,0,r.turn)||!integer(r.bumps,0,r.turn)) return clean;
  const won=r.won===true;
  if(won&&(r.position!==s.start||r.taken.length!==s.cores.length)) return clean;
  clean.run={level:r.level,position:r.position,seen:r.seen.slice(),taken:r.taken.slice(),
    powered:r.powered===true,patrol:r.patrol.map(p=>({...p})),turn:r.turn,scans:r.scans,bumps:r.bumps,won};
  rememberNear(clean.run,s);
  if(won) settle(clean);
  return clean;
}

export function scoutPositions(run) {
  return sectors[run.level].patrols.map((path,i)=>path[run.patrol[i].step]);
}

export function pulseMap(run) {
  const s=sectors[run.level], radius=5;
  const distances=new Map([[run.position,0]]);
  const queue=[run.position];
  for(const cell of queue) {
    const dist=distances.get(cell);
    if(dist>=radius) continue;
    for(let d=0;d<4;d++) {
      const next=neighbor(cell,d);
      if(next<0||distances.has(next)) continue;
      distances.set(next,dist+1);
      if(open(s,next,run.powered)) queue.push(next);
    }
  }
  return distances;
}

export function action(run,input) {
  if(!run||run.won||run.turn>=100000) return null;
  const s=sectors[run.level], old=run.position;
  const scouts=scoutPositions(run);
  let pulse=null, relay=false, core=false, hit=false;
  if(input==='pulse') {
    pulse=pulseMap(run);
    for(const i of pulse.keys()) run.seen[i]=1;
    run.scans++;
    if(!run.powered&&s.relays.some(i=>pulse.has(i))) {
      run.powered=true;
      relay=true;
    }
    scouts.forEach((i,j)=>{if(pulse.has(i)) run.patrol[j].stun=2;});
  } else {
    if(!integer(input,0,3)) return null;
    const next=neighbor(old,input);
    if(!open(s,next,run.powered)) return {blocked:true,gate:s.cells[next]==='g'};
    run.position=next;
  }
  run.turn++;
  rememberNear(run,s);
  if(s.cores.includes(run.position)&&!run.taken.includes(run.position)) {
    run.taken.push(run.position);
    core=true;
  }
  if(run.position===s.start&&run.taken.length===s.cores.length) {
    run.won=true;
  } else {
    for(let i=0;i<scouts.length;i++) {
      const guard=run.patrol[i], path=s.patrols[i];
      if(guard.stun>0) {
        guard.stun--;
        continue;
      }
      guard.step=(guard.step+1)%path.length;
      if(run.position===path[guard.step]||run.position===scouts[i]) hit=true;
    }
    if(hit) {
      run.bumps++;
      run.position=s.start;
      rememberNear(run,s);
    }
  }
  return {old,pulse,relay,core,hit,won:run.won};
}

export function rating(run) {
  return 1+Number(run.bumps===0)+Number(run.scans<=sectors[run.level].budget);
}

export function settle(profile) {
  if(profile.run?.won) {
    const {level}=profile.run;
    profile.best[level]=Math.max(profile.best[level],rating(profile.run));
  }
}

export function mergeProfiles(local,remote) {
  const incoming=cleanProfile(remote);
  return {...local,best:local.best.map((v,i)=>Math.max(v,incoming.best[i])),
    rewards:{like:local.rewards.like||incoming.rewards.like,comment:local.rewards.comment||incoming.rewards.comment},
    run:local.run||incoming.run};
}
