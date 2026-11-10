import test from 'node:test';
import assert from 'node:assert/strict';
import {ShotReplay} from '../dist/shot-replay.js';
import {RADIUS} from '../dist/physics.js';
const ball=(num,x=0)=>({num,x,z:0,active:true});
test('replay owns its recorded positions and settings, and interpolates the actual timeline',()=>{
  const balls=[ball(0),ball(1,1)],metadata={power:32,spin:{x:.2,y:-.5}};
  const replay=new ShotReplay(balls,metadata);
  balls[0].x=.4;replay.record(.1,balls);balls[0].x=.8;replay.finish(.2,balls);
  balls[0].x=9;metadata.spin.y=1;
  assert.equal(replay.metadata.spin.y,-.5);
  const {before,after,alpha}=replay.sample(.15);
  assert.equal(before.states[0].x,.4);assert.equal(after.states[0].x,.8);
  assert.ok(Math.abs(alpha-.5)<1e-10);
  assert.equal(replay.sample(-1).before.states[0].x,0);
  assert.equal(replay.sample(99).after.states[0].x,.8);
  replay.record(.3,balls,true);assert.equal(replay.duration,.2);
});
test('potted balls fall and disappear without replaying their automatic respot',()=>{
  const balls=[ball(0)],replay=new ShotReplay(balls);
  balls[0].x=1;balls[0].active=false;replay.record(.1,balls);replay.finish(.1,balls);
  balls[0].active=true;balls[0].x=-.76;
  assert.ok(replay.duration>=.4);
  assert.equal(replay.sample(.1).after.states[0].y,RADIUS);
  assert.ok(replay.sample(.2).after.states[0].y<RADIUS);
  const end=replay.sample(1).after.states[0];
  assert.equal(end.visible,false);assert.equal(end.x,1);
});
test('only balls on the table at the start are recorded, and snapshots preserve orientation',()=>{
  const balls=[ball(0),{...ball(9),active:false}];
  let orientation=[0,0,0,1];balls[0].mesh={quaternion:{toArray:()=>[...orientation]}};
  const replay=new ShotReplay(balls);
  orientation=[0,1,0,0];replay.finish(.1,balls);
  assert.deepEqual(replay.ids,[0]);
  assert.deepEqual(replay.frames[0].states[0].q,[0,0,0,1]);
  assert.deepEqual(replay.frames.at(-1).states[0].q,[0,1,0,0]);
});
test('long recordings keep bounded memory and retain the beginning and final position',()=>{
  const balls=[ball(0)],replay=new ShotReplay(balls);
  for(let i=1;i<=15000;i++){balls[0].x=i;replay.record(i/60,balls);}
  replay.finish(250,balls);
  assert.ok(replay.frames.length<=7200);
  assert.equal(replay.frames[0].time,0);assert.equal(replay.duration,250);
  assert.equal(replay.frames.at(-1).states[0].x,15000);
});
