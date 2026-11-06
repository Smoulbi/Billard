import test from 'node:test';
import assert from 'node:assert/strict';
import {spinContactPoint,moveSpinTarget} from '../dist/spin-target.js';
const radius=.028575;
test('red target lies on the ball surface and faces the cue at every angle and elevation',()=>{
  const cue={x:.3,z:-.2};
  for(const aim of [{x:1,z:0},{x:0,z:1},{x:Math.SQRT1_2,z:Math.SQRT1_2}])
  for(const elevation of [0,15])for(const spin of [{x:0,y:0},{x:.7,y:.6},{x:-.6,y:-.7}]){
    const p=spinContactPoint(cue,aim,spin,radius,elevation);
    assert.ok(Math.abs(Math.hypot(p.x-cue.x,p.y-radius,p.z-cue.z)-radius)<1e-10);
    const tilt=elevation*Math.PI/180;
    assert.ok((p.x-cue.x)*aim.x*Math.cos(tilt)-(p.y-radius)*Math.sin(tilt)+(p.z-cue.z)*aim.z*Math.cos(tilt)<0);
  }
});
test('target and mouse directions agree with lateral spin, follow and draw',()=>{
  const right=moveSpinTarget({x:0,y:0},50,-25);
  assert.deepEqual(right,{x:.2,y:.1});
  const p=spinContactPoint({x:0,z:0},{x:1,z:0},right,radius);
  assert.ok(p.z>0&&p.y>radius&&p.x<0);
  assert.deepEqual(moveSpinTarget({x:0,y:0},50,-25,true),{x:.05,y:.025});
});
test('target movement is bounded to the playable impact disk and ignores invalid deltas',()=>{
  const spin=moveSpinTarget({x:0,y:0},100000,100000);
  assert.ok(Math.abs(Math.hypot(spin.x,spin.y)-.98)<1e-12);
  assert.deepEqual(moveSpinTarget({x:.1,y:.2},NaN,Infinity),{x:.1,y:.2});
});
