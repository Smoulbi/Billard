import test from 'node:test';
import assert from 'node:assert/strict';
import {createAimSmoothing,resetAimSmoothing,queueAimMovement,stepAimSmoothing} from '../dist/aim-smoothing.js';
const forward={x:1,z:0},view={locked:false,fine:false};
test('horizontal input is distributed over frames and converges without overshoot',()=>{
  const s=createAimSmoothing(forward);queueAimMovement(s,view,10);
  assert.equal(s.angle,0);assert.ok(Math.abs(s.target-.035)<1e-12);
  let previous=0;
  for(let i=0;i<120;i++){
    stepAimSmoothing(s,1/120);assert.ok(s.angle>=previous&&s.angle<=s.target);previous=s.angle;
  }
  assert.equal(s.angle,s.target);
});
test('smoothing has the same response at 30, 60 and 144 frames per second',()=>{
  const run=fps=>{
    const s=createAimSmoothing(forward);queueAimMovement(s,view,100);
    let time=0;
    while(time<.2){const dt=Math.min(1/fps,.2-time);stepAimSmoothing(s,dt);time+=dt;}
    return s.angle;
  };
  for(const fps of [30,60,144])assert.ok(Math.abs(run(fps)-.35*(1-Math.exp(-8)))<1e-12);
});
test('crossing pi or rotating more than a full turn preserves the intended direction',()=>{
  const start=Math.PI-.01,s=createAimSmoothing({x:Math.cos(start),z:Math.sin(start)});
  queueAimMovement(s,view,20);stepAimSmoothing(s,.01);assert.ok(s.angle>start);
  queueAimMovement(s,view,4000);assert.ok(s.target>start+2*Math.PI);
  stepAimSmoothing(s,1);assert.equal(s.angle,s.target);
});
test('freezing retains the displayed angle and discards pending input without a snap',()=>{
  const s=createAimSmoothing(forward);queueAimMovement(s,view,100);
  const displayed=stepAimSmoothing(s,.01);
  resetAimSmoothing(s,displayed);
  assert.ok(Math.abs(s.angle-Math.atan2(displayed.z,displayed.x))<1e-12);
  assert.equal(stepAimSmoothing(s,.5),null);
});
test('event grouping does not change sensitivity, and fine aiming still reduces it tenfold',()=>{
  const a=createAimSmoothing(forward),b=createAimSmoothing(forward),fine=createAimSmoothing(forward);
  for(let i=0;i<300;i++)queueAimMovement(a,view,.1);
  for(let i=0;i<10;i++)queueAimMovement(b,view,3);
  queueAimMovement(fine,{...view,fine:true},30);
  assert.ok(Math.abs(a.target-b.target)<1e-12);
  assert.ok(Math.abs(fine.target*10-b.target)<1e-12);
  queueAimMovement(b,{...view,locked:true},100);
  queueAimMovement(b,view,NaN);assert.ok(Math.abs(b.target-.105)<1e-12);
});
