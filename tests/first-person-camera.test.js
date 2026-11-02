import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirstPersonView,resetFirstPersonAim,rotateFirstPersonAim,firstPersonPose,freezeFirstPersonShot,currentFirstPersonPose} from '../dist/first-person-camera.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('eyes are behind the cue ball and aligned with any shot direction',()=>{
  for(const aim of [{x:1,z:0},{x:0,z:-1},{x:Math.SQRT1_2,z:Math.SQRT1_2}]){
    const cue={x:.7,z:-.2},pose=firstPersonPose(cue,aim);
    near((cue.x-pose.position.x)*aim.x+(cue.z-pose.position.z)*aim.z,.52);
    near((pose.target.x-cue.x)*aim.z-(pose.target.z-cue.z)*aim.x,0);
    assert.ok(pose.position.y>pose.target.y);
  }
});
test('fine aim rotates ten times less; locking prevents rotation',()=>{
  const view=createFirstPersonView(),aim={x:1,z:0};
  const normal=rotateFirstPersonAim(view,aim,100);
  view.fine=true;
  const fine=rotateFirstPersonAim(view,aim,100);
  near(Math.atan2(normal.z,normal.x),10*Math.atan2(fine.z,fine.x));
  view.locked=true;
  assert.deepEqual(rotateFirstPersonAim(view,aim,100),aim);
  assert.deepEqual(rotateFirstPersonAim(view,aim,NaN),aim);
});
test('camera stays at the shot origin even if the cue moves or is pocketed',()=>{
  const view=createFirstPersonView(),cue={x:-.76,z:0},aim={x:1,z:0};
  freezeFirstPersonShot(view,cue,aim);
  const initial=structuredClone(view.shot);
  cue.x=1;cue.z=.4;cue.active=false;
  assert.deepEqual(currentFirstPersonPose(view,cue,{x:0,z:1},true),initial);
});
test('next shot resets fine aim and lock and relocates behind the new cue position',()=>{
  const view=createFirstPersonView(),aim={x:1,z:0};
  freezeFirstPersonShot(view,{x:0,z:0},aim);
  view.locked=true;view.fine=true;view.previousX=100;
  resetFirstPersonAim(view);
  assert.deepEqual(view,createFirstPersonView());
  assert.deepEqual(currentFirstPersonPose(view,{x:1,z:.2},aim,false),firstPersonPose({x:1,z:.2},aim));
});
