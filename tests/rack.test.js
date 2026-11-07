import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingLayout,createTrainingSession,recordTrainingChange,undoTrainingChange,redoTrainingChange} from '../dist/training.js';
import {RADIUS,makePhysicsBody,simulatePhysics,strikeBall} from '../dist/physics.js';
const seeded=seed=>()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};

test('1000 seeded eight and nine racks keep microscopic gaps without overlaps',()=>{
  for(const kind of ['eight','nine'])for(let seed=0;seed<1000;seed++){
    const rack=trainingLayout(kind,seeded(seed)).slice(1);
    assert.equal(rack[0].x,.49);assert.equal(rack[0].z,0);
    const gaps=[];
    for(let i=0;i<rack.length;i++)for(let j=0;j<i;j++){
      const gap=Math.hypot(rack[i].x-rack[j].x,rack[i].z-rack[j].z)-2*RADIUS;
      assert.ok(gap>=-1e-15,`${kind} seed ${seed}: overlap`);
      if(gap<.001)gaps.push(gap);
    }
    assert.ok(gaps.length>=rack.length-1);
    assert.ok(Math.max(...gaps)<=4*RADIUS*.001+1e-15);
    assert.ok(Math.max(...gaps)-Math.min(...gaps)>1e-6,'gaps vary within a rack');
  }
});
test('new formations vary, while a seed and undo/redo retain exact positions',()=>{
  for(const kind of ['eight','nine']){
    const first=trainingLayout(kind,seeded(123)),second=trainingLayout(kind,seeded(456));
    assert.notDeepEqual(first,second);
    assert.deepEqual(first,trainingLayout(kind,seeded(123)));
    assert.deepEqual(first.map(b=>b.num),second.map(b=>b.num));
    const session=createTrainingSession();
    recordTrainingChange(session,{positions:first});
    assert.deepEqual(undoTrainingChange(session,{positions:second}),{positions:first});
    assert.deepEqual(redoTrainingChange(session,{positions:first}),{positions:second});
  }
});
test('new racks remain stationary until the cue strikes them',()=>{
  for(const kind of ['eight','nine']){
    const layout=trainingLayout(kind,seeded(2));
    const balls=layout.map(b=>makePhysicsBody(b.num,b.x,b.z));
    for(let i=0;i<240;i++)simulatePhysics(balls,1/240);
    assert.deepEqual(balls.map(({num,x,z})=>({num,x,z})),layout);
  }
});
test('new eight and nine racks disperse under an actual break without exhausting collision processing',()=>{
  for(const kind of ['eight','nine'])for(const seed of [1,7,123]){
    const layout=trainingLayout(kind,seeded(seed));
    const balls=layout.map(b=>makePhysicsBody(b.num,b.x,b.z));
    let limits=0,collisions=0;
    strikeBall(balls[0],{x:1,z:0},12);
    for(let i=0;i<480;i++)simulatePhysics(balls,1/240,{
      onEventLimit:()=>limits++,onCollision:()=>collisions++
    });
    assert.equal(limits,0);
    assert.ok(collisions>=balls.length-1);
    const moved=balls.slice(1).filter((b,i)=>!b.active||Math.hypot(b.x-layout[i+1].x,b.z-layout[i+1].z)>.1).length;
    assert.ok(moved>=balls.length-3,`${kind} seed ${seed}: only ${moved} balls dispersed`);
    assert.ok(balls.every(b=>Number.isFinite(b.x)&&Number.isFinite(b.z)));
  }
});
