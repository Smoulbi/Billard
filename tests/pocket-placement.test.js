import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlaceSupportedBall,canPlaceFreeCue} from '../dist/placement.js';
import {canPlaceTrainingBall} from '../dist/training.js';
import {getPockets,getCushionSegments,CORNER_CUT,SIDE_CUT,RADIUS,NOSE_HEIGHT,WIDTH,LENGTH,
  makePhysicsBody,simulatePhysics,strikeBall} from '../dist/physics.js';
import {pocketReferenceGeometry} from '../dist/table-pocket-geometry.js';
function rimPosition(p,margin=.001){
  if(p.kind==='side')return {x:0,z:p.z+p.sz*(.008-margin)};
  const c=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,64).openingCircle;
  return {x:c.x-p.sx*(c.radius+margin)/Math.SQRT2,z:c.z-p.sz*(c.radius+margin)/Math.SQRT2};
}
test('all six pocket lips allow supported positions excluded by the old safety circles',()=>{
  for(const p of getPockets()){
    const pos=rimPosition(p);
    assert.equal(canPlaceFreeCue(pos.x,pos.z),false);
    assert.equal(canPlaceSupportedBall(pos.x,pos.z),true,JSON.stringify(pos));
    assert.equal(canPlaceTrainingBall(1,pos.x,pos.z,[{num:0,x:0,z:0,active:true}]),true);
  }
});
test('lip placements stay stationary and supported when the real solver starts',()=>{
  for(const p of getPockets()){
    const pos=rimPosition(p),ball=makePhysicsBody(1,pos.x,pos.z);
    let pots=0;
    for(let i=0;i<60;i++)simulatePhysics([ball],1/240,{cushionModel:'coupled-v021',onPocket:()=>pots++});
    assert.equal(ball.active,true);assert.equal(pots,0);
    assert.ok(Math.hypot(ball.x-pos.x,ball.z-pos.z)<1e-10);
  }
});
test('crossing each pocket lip is refused by placement and captured by the solver',()=>{
  for(const p of getPockets()){
    const inside=rimPosition(p,-.001);
    assert.equal(canPlaceSupportedBall(inside.x,inside.z),false);
    const pos=rimPosition(p),ball=makePhysicsBody(1,pos.x,pos.z);
    const aim=p.kind==='corner'?{x:p.sx/Math.SQRT2,z:p.sz/Math.SQRT2}:{x:0,z:p.sz};
    strikeBall(ball,aim,.2);
    for(let i=0;i<240&&ball.active;i++)simulatePhysics([ball],1/240,{cushionModel:'coupled-v021'});
    assert.equal(ball.active,false,`ball should fall through ${p.kind} lip`);
  }
});
test('exact cushion geometry excludes straight noses, angled jaws and rounded tips',()=>{
  for(const rail of getCushionSegments()){
    assert.equal(canPlaceSupportedBall(rail.x0,rail.z0),false);
    assert.equal(canPlaceSupportedBall((rail.x0+rail.x1)/2,(rail.z0+rail.z1)/2),false);
  }
  const reach=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);
  assert.equal(canPlaceSupportedBall(.3,WIDTH-reach-.0001),true);
  assert.equal(canPlaceSupportedBall(.3,WIDTH-reach+.0001),false);
});
test('free pocket-edge placement still rejects overlapping balls and off-table coordinates',()=>{
  const pos=rimPosition(getPockets()[0]);
  assert.equal(canPlaceTrainingBall(1,pos.x,pos.z,[{num:0,...pos,active:true}]),false);
  assert.equal(canPlaceSupportedBall(LENGTH+.5,WIDTH+.5),false);
  assert.equal(canPlaceSupportedBall(NaN,0),false);
  assert.equal(canPlaceSupportedBall(0,Infinity),false);
});
