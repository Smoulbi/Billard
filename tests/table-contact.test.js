import test from 'node:test';
import assert from 'node:assert/strict';
import {makePhysicsBody,getCueStrike,getCueImpact,strikeBall,resolveTableContact,simulatePhysics,PHYSICS,RADIUS} from '../dist/physics.js';
const close=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
const energy=b=>.5*PHYSICS.mass*(b.vx**2+b.vy**2+b.vz**2)+.2*PHYSICS.mass*RADIUS**2*(b.wx**2+b.wy**2+b.wz**2);
const slip=b=>[b.vx+RADIUS*b.wz,b.vz-RADIUS*b.wx];
test('normal restitution is the same at launch and landing, with no jump angle threshold',()=>{
 for(const angle of [0,1,5,15,19.99,20.01,45,75]){
  const raw=getCueStrike({x:1,z:0},4,{x:0,y:0},{elevation:angle});
  const launch=getCueImpact({x:1,z:0},4,{x:0,y:0},{elevation:angle});
  close(raw.vy,-4*Math.sin(angle*Math.PI/180));
  close(launch.vy,-raw.vy*PHYSICS.tableRestitution);
  const b=makePhysicsBody(0,0,0);b.vy=raw.vy;
  resolveTableContact(b);close(b.vy,launch.vy);
 }
 const a=getCueImpact({x:1,z:0},4,{x:0,y:0},{elevation:19.99});
 const b=getCueImpact({x:1,z:0},4,{x:0,y:0},{elevation:20.01});
 assert.ok(Math.abs(a.vy-b.vy)<.001);
});
test('sliding landing obeys the Coulomb limit and transfers angular momentum with correct signs',()=>{
 const b=makePhysicsBody(0,0,0);b.vx=4;b.vy=-1;b.wy=7;
 const incoming=resolveTableContact(b);
 close(incoming,1);close(b.vy,.6);
 const change=.2*(1+.6);
 close(b.vx,4-change);close(b.wz,-2.5*change/RADIUS);close(b.wx,0);close(b.wy,7);
 assert.ok(slip(b)[0]>0);
});
test('sticking landing stops contact slip without reversing it',()=>{
 const b=makePhysicsBody(0,0,0);b.vx=.1;b.vz=-.07;b.vy=-3;
 resolveTableContact(b);const [sx,sz]=slip(b);close(sx,0);close(sz,0);
 close(b.vx,.1*5/7);close(b.vz,-.07*5/7);
});
test('a naturally rolling sphere gets no tangential impulse on landing',()=>{
 const b=makePhysicsBody(0,0,0);b.vx=.8;b.vz=.3;b.wz=-b.vx/RADIUS;b.wx=b.vz/RADIUS;b.vy=-1;
 const before={...b};resolveTableContact(b);
 for(const key of ['vx','vz','wx','wy','wz'])close(b[key],before[key]);
});
test('contact dissipates energy and never reverses slip across a deterministic range of velocities and spin',()=>{
 for(let i=1;i<=200;i++){
  const b=makePhysicsBody(0,0,0);
  Object.assign(b,{vx:4*Math.sin(i),vz:3*Math.cos(i*1.3),vy:-.1-i/80,wx:100*Math.sin(i*.3),wz:120*Math.cos(i*.7),wy:10});
  const e=energy(b),u=slip(b);resolveTableContact(b);const v=slip(b);
  assert.ok(energy(b)<=e+1e-10);assert.ok(u[0]*v[0]+u[1]*v[1]>=-1e-10);
  for(const k of ['vx','vy','vz','wx','wy','wz'])assert.ok(Number.isFinite(b[k]));
 }
});
test('normal rebound height follows restitution squared; the tiny-height cutoff is numerical',()=>{
 for(const restitution of [.5,.6,.7]){
  const b=makePhysicsBody(0,0,0);b.vy=-2;resolveTableContact(b,{restitution});
  close(b.vy**2/(2*PHYSICS.gravity),restitution**2*4/(2*PHYSICS.gravity));
 }
 const b=makePhysicsBody(0,0,0);b.vy=-.001;resolveTableContact(b);assert.equal(b.vy,0);
 b.vy=1;assert.equal(resolveTableContact(b),0);assert.equal(b.vy,1);
});
test('the flight solver consumes the remainder after bouncing and reports a physical landing',()=>{
 const b=makePhysicsBody(0,0,0);b.y=RADIUS+.0001;b.vy=-1;
 const dt=.001,t=(-1+Math.sqrt(1+2*PHYSICS.gravity*.0001))/PHYSICS.gravity;
 const incoming=1+PHYSICS.gravity*t,out=.6*incoming;
 const events=[];simulatePhysics([b],dt,{onLanding:(ball,speed,time)=>events.push({speed,time})});
 assert.equal(events.length,1);close(events[0].time,t);close(events[0].speed,incoming);
 close(b.y,RADIUS+out*(dt-t)-.5*PHYSICS.gravity*(dt-t)**2);
 close(b.vy,out-PHYSICS.gravity*(dt-t));
});
test('unsupported pocket openings capture a descending ball without a fictitious table bounce',()=>{
 const b=makePhysicsBody(0,0,.65);b.y=RADIUS+.0001;b.vy=-1;
 let pockets=0,landings=0;simulatePhysics([b],.002,{onPocket:()=>pockets++,onLanding:()=>landings++});
 assert.equal(pockets,1);assert.equal(landings,0);assert.equal(b.active,false);
});
