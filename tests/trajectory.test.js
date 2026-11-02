import test from 'node:test';
import assert from 'node:assert/strict';
import {makePhysicsBody, RADIUS, strikeBall, simulatePhysics} from '../dist/physics.js';
import {powerToCueSpeed} from '../dist/power.js';
import {predictTrajectory} from '../dist/trajectory.js';

const STEP=1/240;

function cutScenario(cutDegrees, distance=0.45) {
  const angle=Math.asin(2*RADIUS/distance*Math.sin(cutDegrees*Math.PI/180));
  return {
    balls:[makePhysicsBody(0,-distance,0),makePhysicsBody(1,0,0)],
    aim:{x:Math.cos(angle),z:Math.sin(angle)}
  };
}

function realShot(balls, aim, power, spin, elevation, steps, callbacks={}) {
  const clone=balls.map(b=>({...b}));
  strikeBall(clone[0],aim,powerToCueSpeed(power),spin,{elevation});
  for(let i=0;i<steps;i++)simulatePhysics(clone,STEP,callbacks);
  return clone;
}

function closePoint(actual,expected,tolerance=0.001) {
  assert.ok(Math.hypot(actual.x-expected.x,actual.z-expected.z)<tolerance,
    `expected (${actual.x}, ${actual.z}) to match (${expected.x}, ${expected.z})`);
}

test('aim-guide first contact agrees with the continuous collision solver at every cut',()=>{
  for(const angle of [0,20,40,60,75]) {
    const {balls,aim}=cutScenario(angle);
    const predicted=predictTrajectory(balls,aim,40);
    assert.equal(predicted.firstObject,1);
    let actualContact=null;
    const clone=balls.map(b=>({...b}));
    strikeBall(clone[0],aim,powerToCueSpeed(40));
    for(let i=0;i<240&&!actualContact;i++)simulatePhysics(clone,STEP,{
      onCollision:(a,b)=>{
        if(a.num===0||b.num===0)actualContact={x:clone[0].x,z:clone[0].z};
      }
    });
    assert.ok(actualContact,`no contact observed at cut ${angle}`);
    closePoint(predicted.contact,actualContact,0.0001);
  }
});

test('predicted white and object paths equal a real shot after the same number of steps',()=>{
  for(const angle of [0,25,38,60])for(const power of [30,40,50]) {
    const {balls,aim}=cutScenario(angle);
    const predicted=predictTrajectory(balls,aim,power);
    assert.ok(predicted.firstContactTime!==null);
    const totalSteps=Math.ceil(predicted.firstContactTime/STEP)+72;
    const actual=realShot(balls,aim,power,{x:0,y:0},0,totalSteps);
    closePoint(predicted.whiteAfter.at(-1),actual[0],0.00001);
    closePoint(predicted.objectAfter.at(-1),actual[1],0.00001);
  }
});

test('predictor includes natural roll and draw without changing the real table',()=>{
  const {balls,aim}=cutScenario(35,0.23);
  const original=balls.map(b=>({...b}));
  const neutral=predictTrajectory(balls,aim,40);
  const draw=predictTrajectory(balls,aim,40,{x:0,y:-0.5});
  assert.equal(neutral.firstObject,1);
  assert.equal(draw.firstObject,1);
  const a=neutral.whiteAfter.at(-1),b=draw.whiteAfter.at(-1);
  assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>0.02,
    'the guide must reflect follow/draw differences after contact');
  assert.deepEqual(balls,original,'prediction must not move real objects');
});

test('spin and cue elevation use the same physical trajectory as the actual shot',()=>{
  const {balls,aim}=cutScenario(35);
  for(const spin of [{x:0,y:-0.5},{x:0,y:0.5},{x:0.25,y:0.2}]) {
    for(const elevation of [0,10]) {
      const predicted=predictTrajectory(balls,aim,40,spin,elevation);
      assert.equal(predicted.firstObject,1);
      const totalSteps=Math.ceil(predicted.firstContactTime/STEP)+72;
      const actual=realShot(balls,aim,40,spin,elevation,totalSteps);
      closePoint(predicted.whiteAfter.at(-1),actual[0],0.00001);
      closePoint(predicted.objectAfter.at(-1),actual[1],0.00001);
    }
  }
});

test('predictor stays stable on a tightly packed tournament break',()=>{
  const balls=[makePhysicsBody(0,-0.93,0.36)];
  for(let row=0,n=1;row<5;row++)for(let j=0;j<=row;j++)
    balls.push(makePhysicsBody(n++,0.49+row*(Math.sqrt(3)*RADIUS+0.00006),
      (j-row/2)*(2*RADIUS+0.00012)));
  const d=Math.hypot(1.42,-0.36);
  const aim={x:1.42/d,z:-0.36/d};
  const predicted=predictTrajectory(balls,aim,100);
  assert.equal(predicted.firstObject,1);
  assert.ok(predicted.before.length>=2);
  assert.ok(predicted.whiteAfter.length>=2);
  assert.ok(predicted.objectAfter.length>=2);
  assert.ok(predicted.whiteAfter.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));
});

test('a shot without a target terminates cleanly',()=>{
  const white=makePhysicsBody(0,-0.35,0);
  const predicted=predictTrajectory([white],{x:1,z:0},10);
  assert.equal(predicted.firstObject,null);
  assert.equal(predicted.contact,null);
  assert.ok(predicted.before.length>=2);
  assert.deepEqual(predicted.whiteAfter,[]);
});
