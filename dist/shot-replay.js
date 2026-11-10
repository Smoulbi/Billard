import {RADIUS} from './physics.js?v=0.69';
// Record the actual simulated motion, rather than running the shot a second time.
export class ShotReplay {
  constructor(balls,metadata={}) {
    this.ids=balls.filter(b=>b.active).map(b=>b.num);
    this.metadata=structuredClone(metadata);
    this.frames=[];this.interval=1/60;this.pockets=new Map();this.complete=false;
    this.record(0,balls,true);
  }
  record(time,balls,force=false) {
    if(this.complete)return;
    const last=this.frames.at(-1);
    if(last&&time-last.time<this.interval-1e-8&&!force)return;
    const states=this.ids.map(num=>{
      const b=balls.find(b=>b.num===num);
      if(!b.active&&!this.pockets.has(num))this.pockets.set(num,{time,x:b.x,z:b.z});
      const pocket=this.pockets.get(num),elapsed=pocket?time-pocket.time:0;
      return {num,x:pocket?.x??b.x,z:pocket?.z??b.z,
        y:pocket ? RADIUS-4.905*elapsed**2 : RADIUS,
        visible:!pocket||elapsed<.28,
        q:b.mesh?.quaternion.toArray()??[0,0,0,1]};
    });
    const frame={time,states};
    if(last&&Math.abs(last.time-time)<1e-8)this.frames[this.frames.length-1]=frame;
    else this.frames.push(frame);
    // Bound memory even if a future table configuration produces a very long shot.
    if(this.frames.length>7200){this.frames=this.frames.filter((_,i)=>i%2===0||i===this.frames.length-1);this.interval*=2;}
  }
  finish(time,balls){
    this.record(time,balls,true);
    const end=Math.max(time,...[...this.pockets.values()].map(p=>p.time+.3));
    for(let t=time+this.interval;t<end;t+=this.interval)this.record(t,balls,true);
    if(end>time)this.record(end,balls,true);
    this.complete=true;
  }
  get duration(){return this.frames.at(-1)?.time??0;}
  sample(time) {
    const t=Math.max(0,Math.min(this.duration,time));
    let low=0,high=this.frames.length-1;
    while(low<high){const mid=(low+high)>>>1;if(this.frames[mid].time<t)low=mid+1;else high=mid;}
    const after=this.frames[low],before=this.frames[Math.max(0,low-1)];
    return {before,after,alpha:after.time===before.time?0:(t-before.time)/(after.time-before.time)};
  }
}
