import test from 'node:test';
import assert from 'node:assert/strict';
import {makePhysicsBody,strikeBall,simulatePhysics,isMoving,RADIUS,PHYSICS,stopBall} from '../dist/physics.js';
import {ShotReplay} from '../dist/shot-replay.js';
import {newEightBallMatch,adjudicateEightBall} from '../dist/eight-ball-rules.js';
import {newNineBallMatch,adjudicateNineBall} from '../dist/nine-ball-rules.js';
const aim={x:1,z:0},center={x:0,y:0};
function advance(balls,time,callbacks={},step=1/240){for(let t=0;t<time-1e-10;t+=step)simulatePhysics(balls,Math.min(step,time-t),callbacks);}
test('jump launch depends on cue angle and strength; flat shots and miscues do not launch',()=>{
 const b=makePhysicsBody(0,-.8,0);
 strikeBall(b,aim,4,center,{elevation:15});assert.equal(b.vy,0);
 strikeBall(b,aim,4,center,{elevation:45});const v=b.vy;assert.ok(v>1);
 strikeBall(b,aim,2,center,{elevation:45});assert.equal(b.vy,v/2);
 strikeBall(b,aim,4,center,{elevation:65});assert.ok(b.vy>v);
 strikeBall(b,aim,4,{x:.98,y:0},{elevation:45});assert.equal(b.vy,0);
});
test('flight follows gravity without cloth drag; paused time has no effect',()=>{
 const b=makePhysicsBody(0,-.8,0);strikeBall(b,aim,3,center,{elevation:45});
 const y=b.y,v=b.vy,vx=b.vx;simulatePhysics([b],0);assert.equal(b.y,y);
 advance([b],.05);
 assert.ok(Math.abs(b.y-(y+v*.05-.5*PHYSICS.gravity*.05**2))<1e-9);
 assert.equal(b.vx,vx);assert.ok(isMoving(b));
});
test('a sufficient jump clears an obstructing ball and lands before hitting the target',()=>{
 const white=makePhysicsBody(0,-.8,0),block=makePhysicsBody(2,-.46,0),target=makePhysicsBody(1,.12,0);
 strikeBall(white,aim,4,center,{elevation:45});
 const contacts=[];let landings=0,maxHeight=0;
 for(let i=0;i<140;i++){simulatePhysics([white,block,target],1/240,{onBallContact:(a,b)=>contacts.push([a.num,b.num]),onLanding:()=>landings++});maxHeight=Math.max(maxHeight,white.y);}
 assert.ok(maxHeight>3*RADIUS);assert.equal(block.vx,0);assert.equal(block.x,-.46);
 assert.ok(contacts.some(pair=>pair.includes(0)&&pair.includes(1)));assert.ok(landings>0);
 assert.ok(white.y>=RADIUS);assert.ok(Number.isFinite(white.vx));
});
test('a low jump hits the obstructing ball rather than ghosting through it',()=>{
 const a=makePhysicsBody(0,-.8,0),b=makePhysicsBody(2,-.65,0);strikeBall(a,aim,2,center,{elevation:25});let hits=0;
 advance([a,b],.15,{onBallContact:()=>hits++});assert.ok(hits>0);assert.ok(b.vx>0);
});
test('vertical jumps remain moving through the apex, bounce and settle on the cloth',()=>{
 const b=makePhysicsBody(0,0,0);b.vy=1;let landings=0;
 advance([b],.1);assert.ok(isMoving(b));
 advance([b],2,{onLanding:()=>landings++});assert.ok(landings>=1);
 assert.equal(b.y,RADIUS);assert.equal(b.vy,0);assert.equal(isMoving(b),false);
 b.y=.3;b.vy=2;stopBall(b);assert.equal(b.y,RADIUS);assert.equal(b.vy,0);
});
test('an airborne ball over a pocket is not captured; a ball clearing the rail leaves the table once',()=>{
 const b=makePhysicsBody(0,0,.63);b.y=.18;b.vy=.2;b.vz=3;let pockets=0,out=0;
 advance([b],.15,{onPocket:()=>pockets++,onOffTable:()=>out++});
 assert.equal(pockets,0);assert.equal(out,1);assert.equal(b.active,false);
});
test('replay records the actual jump height',()=>{
 const b=makePhysicsBody(0,-.8,0);const replay=new ShotReplay([b]);strikeBall(b,aim,4,center,{elevation:45});advance([b],.06);replay.record(.06,[b]);assert.equal(replay.frames.at(-1).states[0].y,b.y);assert.ok(b.y>RADIUS);
});
test('off-table balls are fouls, an off-table eight loses and an off-table nine is spotted',()=>{
 const eight={...newEightBallMatch(),phase:'playing'};
 assert.equal(adjudicateEightBall(eight,{offTable:[0]}).ballInHand,'anywhere');
 assert.equal(adjudicateEightBall(eight,{offTable:[8]}).winner,1);
 const nine={...newNineBallMatch(),phase:'playing',pushOutAvailable:true};
 const result=adjudicateNineBall(nine,{offTable:[9],pushOut:true});
 assert.equal(result.lastResult.kind,'foul');assert.equal(result.spotNine,true);
});
test('jump results converge when the external timestep is halved',()=>{
 const run=step=>{const b=makePhysicsBody(0,-.8,0);strikeBall(b,aim,4,center,{elevation:45});advance([b],.4,{},step);return b;};
 const a=run(1/240),b=run(1/480);assert.ok(Math.abs(a.x-b.x)<.001);assert.ok(Math.abs(a.y-b.y)<.001);assert.ok(Math.abs(a.vx-b.vx)<.01);
});

test('the trajectory guide skips the jumped obstacle and predicts the actual first target',async()=>{
 const {predictTrajectory}=await import('../dist/trajectory.js');
 const layout=[makePhysicsBody(0,-.8,0),makePhysicsBody(2,-.46,0),makePhysicsBody(1,.12,0)];
 const prediction=predictTrajectory(layout,aim,100/3,center,45);
 assert.equal(prediction.firstObject,1);
 assert.equal(layout[0].x,-.8);assert.equal(layout[0].y,RADIUS);
});
