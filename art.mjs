import {width,height,point,scoutPositions} from './core.mjs';

const tile=48, margin=25;
const size=[width*tile+margin*2,height*tile+margin*2];
const themes=[
  {ground:'#0b2028',metal:'#1d3541',edge:'#426272',warm:'#ffc680'},
  {ground:'#12232e',metal:'#263b4d',edge:'#506780',warm:'#fabb83'},
  {ground:'#222333',metal:'#3c3849',edge:'#6c526a',warm:'#ffc287'},
];
const noise = i => (Math.sin(i*78.233+17.37)*43758.5453)%1+1;
const center = i => {
  const [x,y]=point(i);
  return [margin+x*tile+tile/2,margin+y*tile+tile/2];
};

export function makeScene(canvas) {
  const ctx=canvas.getContext('2d',{alpha:false});
  let scale=1, offsetX=0, offsetY=0, cssWidth=1, cssHeight=1;
  function resize() {
    const rect=canvas.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
    cssWidth=rect.width;
    cssHeight=rect.height;
    const pixelsX=Math.max(1,Math.round(cssWidth*dpr)), pixelsY=Math.max(1,Math.round(cssHeight*dpr));
    if(canvas.width!==pixelsX||canvas.height!==pixelsY) {
      canvas.width=pixelsX;
      canvas.height=pixelsY;
    }
    scale=Math.min(cssWidth/size[0],cssHeight/size[1]);
    offsetX=(cssWidth-size[0]*scale)/2;
    offsetY=(cssHeight-size[1]*scale)/2;
  }

  function rect(x,y,w,h,r,color,stroke) {
    ctx.beginPath();
    ctx.roundRect(x,y,w,h,r);
    ctx.fillStyle=color;
    ctx.fill();
    if(stroke) {ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  }
  function disk(x,y,r,color) {
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  }
  function line(x,y,x2,y2,color,w=1) {
    ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.lineWidth=w;ctx.strokeStyle=color;ctx.stroke();
  }
  function halo(x,y,r,color) {
    const g=ctx.createRadialGradient(x,y,1,x,y,r);
    g.addColorStop(0,color);g.addColorStop(1,'transparent');
    disk(x,y,r,g);
  }
  function label(text,x,y,color,px=10) {
    ctx.font='700 '+px+'px monospace';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
  function diamond(x,y,r,color) {
    ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r*.78,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r*.78,y);ctx.closePath();
    ctx.fillStyle=color;ctx.fill();
  }
  function plate(x,y,i,p,wall) {
    const left=x-23, top=y-23;
    if(wall) {
      rect(left,top+4,46,44,3,'#081219');
      rect(left,top-2,46,43,3,p.metal,p.edge);
      rect(left+5,top+4,36,27,2,'#102330','#263b46');
      for(let q=0;q<5;q++) line(left+9,top+9+q*4,left+37,top+9+q*4,p.edge,1);
      line(left+4,top+38,left+42,top+38,'#627584');
      for(const dx of [5,40]) disk(left+dx,top+35,1.4,'#7c9296');
      return;
    }
    rect(left,top,46,46,3,p.ground,'#29434d');
    if(i%9===3) {
      ctx.beginPath();ctx.ellipse(x+4,y+8,13,8,-.21,0,Math.PI*2);
      ctx.fillStyle='#4d8b9850';ctx.fill();
      line(x-6,y+6,x+9,y+3,'#8aaebb5a');
      line(x+1,y+10,x+12,y+7,'#7dabb24a');
    }
    line(left+3,top+2,left+42,top+2,'#294650');
    line(left+2,top+43,left+43,top+43,'#09171f',2);
    for(let j=0;j<3;j++){
      const rx=(noise(i+j*41)%1)*35+left+4, ry=(noise(i+j*29+6)%1)*33+top+6;
      line(rx,ry,rx+6,ry,'#36525a');
    }
    disk(left+5,top+5,1.1,'#385560');
    disk(left+41,top+41,1.1,'#385560');
    if(i%14===5) {
      for(let j=0;j<4;j++) line(left+29+j*3,top+9,left+31+j*3,top+5,'#a1885b94',1.4);
    }
  }
  function elevator(x,y,ready) {
    rect(x-20,y-20,40,40,6,'#152a33',ready?'#88ffc6':'#6a6260');
    rect(x-15,y-15,30,30,3,ready?'#245a51':'#342c2b');
    for(let k=-12;k<=10;k+=6) line(x+k,y+16,x+k+5,y+16,ready?'#8ef0b9':'#f6ad62',2);
    ctx.beginPath();ctx.moveTo(x-7,y+4);ctx.lineTo(x,y-5);ctx.lineTo(x+7,y+4);
    ctx.strokeStyle=ready?'#b6ffe0':'#ffc18a';ctx.lineWidth=2;ctx.stroke();
  }
  function beacon(x,y,t,taken) {
    rect(x-14,y+9,28,9,3,'#0a171d','#765a43');
    rect(x-10,y+4,20,9,2,'#5b3f30','#b98c5f');
    if(taken) return;
    y+=Math.sin(t*3+x)*2;
    halo(x,y-3,26,'#ffad4364');
    diamond(x,y-5,12,'#f3a052');
    diamond(x-2,y-6,8,'#ffe1a1');
    line(x-1,y-16,x+6,y-6,'#fff3c6',1.5);
    disk(x+12,y-9+Math.sin(t*4)*3,1.2,'#ffdd91');
  }
  function gate(x,y,powered) {
    rect(x-21,y-19,42,38,5,powered?'#20433d':'#3f2b2f',powered?'#6cbca7':'#c0775e');
    if(!powered) {
      for(let i=-14;i<=14;i+=7) line(x+i,y-13,x+i,y+12,'#d89065',3);
      line(x-19,y,x+19,y,'#703d39',4);
    }
    disk(x+15,y-13,2.5,powered?'#a0ffca':'#ff885a');
  }
  function relay(x,y,powered,t) {
    const glow=powered?'#90fbb5':'#76eaff';
    halo(x,y,24,powered?'#82ffad55':'#6eeaff54');
    rect(x-13,y-14,26,28,5,'#162a36',glow);
    for(let n=1;n<4;n++) {
      ctx.beginPath();ctx.arc(x,y-1,n*3+1,Math.PI*1.2,Math.PI*1.8);
      ctx.strokeStyle=glow;ctx.lineWidth=1.5;ctx.stroke();
    }
    disk(x,y+3,2+Math.sin(t*4)*.45,glow);
  }
  function drone(x,y,stunned,t) {
    const color=stunned?'#97b9ff':'#ff8d86';
    halo(x,y,28,stunned?'#7e98ff42':'#ff645947');
    ctx.beginPath();ctx.ellipse(x,y+9,15,6,0,0,Math.PI*2);ctx.fillStyle='#040c12a0';ctx.fill();
    y-=2+Math.sin(t*4+x)*1.5;
    rect(x-14,y-10,28,20,6,'#6d4f54','#d18b83');
    rect(x-16,y-6,5,12,2,'#bb8579');
    rect(x+11,y-6,5,12,2,'#bb8579');
    rect(x-9,y-6,18,10,4,'#1e1724');
    disk(x,y-1,4,color);disk(x-1,y-2,1.5,'#ffe2d6');
    if(stunned) label('Ⅱ',x,y-15,color,10);
  }
  function robot(x,y,t,gold) {
    halo(x,y,42,gold?'#ffb85163':'#71eaff58');
    ctx.beginPath();ctx.ellipse(x,y+12,18,8,0,0,Math.PI*2);ctx.fillStyle='#000a12ba';ctx.fill();
    const color=gold?'#ffc276':'#86fff0';
    y+=Math.sin(t*4)*.75;
    rect(x-16,y-6,8,22,3,'#20323f','#607886');
    rect(x+8,y-6,8,22,3,'#20323f','#607886');
    for(let k=0;k<4;k++) {
      line(x-15,y-2+k*4,x-9,y-2+k*4,'#88a2aa');
      line(x+9,y-2+k*4,x+15,y-2+k*4,'#88a2aa');
    }
    const shell=ctx.createLinearGradient(x-10,y-16,x+13,y+14);
    shell.addColorStop(0,gold?'#ffe2a4':'#dbf6e7');shell.addColorStop(.48,gold?'#bd8753':'#8fb3b4');shell.addColorStop(1,'#36515d');
    rect(x-11,y-15,22,26,6,shell,'#e0f4e3');
    rect(x-8,y-11,16,11,4,'#122834','#627b82');
    rect(x-5,y-8,10,5,2,color);
    line(x-5,y+4,x+5,y+4,'#293f49',2);
    line(x+7,y-15,x+10,y-22,'#849b9e',2);
    disk(x+10,y-22,2.4,color);
  }
  function frame(run,sector,t,effects,rewards) {
    const p=themes[run.level<2?0:run.level<5?1:2];
    ctx.setTransform(canvas.width/cssWidth,0,0,canvas.height/cssHeight,0,0);
    ctx.fillStyle='#09151d';ctx.fillRect(0,0,cssWidth,cssHeight);
    ctx.translate(offsetX,offsetY);ctx.scale(scale,scale);
    const back=ctx.createLinearGradient(0,0,0,size[1]);
    back.addColorStop(0,'#13252e');back.addColorStop(.48,'#0b1b24');back.addColorStop(1,'#19232b');
    rect(4,4,size[0]-8,size[1]-8,12,back,'#45616b');
    rect(12,12,size[0]-24,size[1]-24,8,'#0a171e','#223c47');
    for(let k=0;k<9;k++) {
      const x=margin+k*60;
      line(x,16,x+18,16,'#52707a',1);
      line(x,size[1]-16,x+18,size[1]-16,'#314c55',1);
    }
    for(const x of [12,size[0]-12]) for(const y of [13,size[1]-13]) {
      disk(x,y,4,'#54666c');line(x-2,y+1,x+2,y-1,'#0b1419');
    }
    const sweep=margin+((t*29)%(height*tile));
    for(let i=0;i<sector.cells.length;i++) {
      const [x,y]=center(i);
      const pulse=effects.pulse, distance=pulse?.distances.get(i);
      const waiting=distance!==undefined&&!pulse.priorSeen[i]&&t-pulse.time<distance*.085;
      if(!run.seen[i]||waiting) {
        const glow=Math.max(0,1-Math.abs(y-sweep)/53);
        rect(x-23,y-23,46,46,3,'#102029','#1b333d');
        ctx.globalAlpha=.22+glow*.31;
        line(x-2,y,x+2,y,'#587f88');line(x,y-2,x,y+2,'#587f88');
        if(i%13===0) label('·',x-15,y+17,'#426672',9);
        ctx.globalAlpha=1;
        continue;
      }
      const cell=sector.cells[i];
      plate(x,y,i,p,cell==='#');
      if(cell==='S') elevator(x,y,run.taken.length===sector.cores.length);
      if(cell==='C') beacon(x,y,t,run.taken.includes(i));
      if(cell==='r') relay(x,y,run.powered,t);
      if(cell==='g') gate(x,y,run.powered);
    }
    scoutPositions(run).forEach((i,j)=>{
      if(!run.seen[i]) return;
      const [x,y]=center(i);
      const unit=run.patrol[j], path=sector.patrols[j], next=path[(unit.step+1)%path.length];
      if(unit.stun===0&&next!==i&&run.seen[next]) {
        const [nx,ny]=center(next);
        line(x,y,nx,ny,'#db77757b',2);
        disk(nx,ny,3,'#ff9984');
      }
      drone(x,y,unit.stun,t);
    });
    if(effects.pulse) {
      const age=t-effects.pulse.time;
      for(const [i,d] of effects.pulse.distances) {
        const f=age-d*.085;
        if(f<0||f>.36) continue;
        const [x,y]=center(i), alpha=1-f/.36;
        ctx.globalAlpha=alpha;
        const tint=rewards.comment&&d%2?'#c0a9ff':'#7be8ed';
        rect(x-22,y-22,44,44,4,tint+'25',tint);
        for(let a=0;a<4;a++) {
          const angle=a*Math.PI/2+d, radius=9+f*48;
          disk(x+Math.cos(angle)*radius,y+Math.sin(angle)*radius,1.4,tint);
        }
      }
      ctx.globalAlpha=1;
    }
    let [x,y]=center(run.position);
    if(effects.move) {
      const k=Math.min(1,(t-effects.move.time)/.17);
      const [px,py]=center(effects.move.old);
      const ease=1-(1-k)**3;
      x=px+(x-px)*ease;y=py+(y-py)*ease-Math.sin(k*Math.PI)*3;
    }
    robot(x,y,t,rewards.like);
    for(const f of effects.sparks) {
      const age=t-f.time;
      if(age>=.65) continue;
      ctx.globalAlpha=1-age/.65;
      disk(f.x+f.dx*age,f.y+f.dy*age-16*age+36*age**2,2.2,f.color);
    }
    ctx.globalAlpha=1;
  }
  function at(clientX,clientY) {
    const bounds=canvas.getBoundingClientRect();
    const x=Math.floor(((clientX-bounds.left-offsetX)/scale-margin)/tile);
    const y=Math.floor(((clientY-bounds.top-offsetY)/scale-margin)/tile);
    return x>=0&&x<width&&y>=0&&y<height ? y*width+x : -1;
  }
  return {resize,frame,at,center};
}
