import test from 'node:test';
import assert from 'node:assert/strict';
import {railCutaway} from '../dist/rail-visibility.js';
import {LENGTH,WIDTH,RADIUS} from '../dist/physics.js';
const settings={length:LENGTH,width:WIDTH};
const removed=(planes,p)=>planes.every(n=>n.x*p.x+n.y*p.y+n.z*p.z+n.constant<0);
test('each of the four near cushions clears the line from the eyes to the rear of the cue ball',()=>{
  for(const [x,z,ax,az] of [[-LENGTH+RADIUS,0,1,0],[LENGTH-RADIUS,0,-1,0],
    [.3,-WIDTH+RADIUS,0,1],[-.3,WIDTH-RADIUS,0,-1]]){
    const cue={x,z},aim={x:ax,z:az},planes=railCutaway(cue,aim,settings);
    assert.ok(planes);
    for(const setback of [.3,.52,1.1]){
      const region=railCutaway(cue,aim,{...settings,setback});
      for(const d of [.03,.08,.15]){
        assert.ok(removed(region,{x:x-ax*d,y:.04,z:z-az*d}));
      }
      assert.ok(!removed(region,{x:x+ax*.05,y:.04,z:z+az*.05}),'the rail ahead of the ball remains');
      assert.ok(!removed(region,{x:x-ax*.1-az*.2,y:.04,z:z-az*.1+ax*.2}),'adjacent rail remains');
      assert.ok(!removed(region,{x:x-ax*.1,y:.001,z:z-az*.1}),'cloth remains');
    }
  }
});
test('corner and oblique shots retain a bounded clearance corridor along the shot direction',()=>{
  const cue={x:LENGTH-.07,z:WIDTH-.07},aim={x:-Math.SQRT1_2,z:-Math.SQRT1_2};
  const planes=railCutaway(cue,aim,settings);
  assert.ok(removed(planes,{x:cue.x+.08,y:.05,z:cue.z+.08}));
  assert.ok(!removed(planes,{x:cue.x+.8,y:.05,z:cue.z+.8}));
});
test('central, missing and pocketed cue balls do not activate a cutaway',()=>{
  for(const cue of [null,{x:0,z:0},{x:0,z:WIDTH-.03,active:false}])
    assert.equal(railCutaway(cue,{x:1,z:0},settings),null);
});
