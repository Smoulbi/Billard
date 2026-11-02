import test from 'node:test';
import assert from 'node:assert/strict';
import {RADIUS, PHYSICS, makePhysicsBody, strikeBall,
  simulatePhysics, resolveSimultaneousBallContacts} from '../dist/physics.js';
import {powerToCueSpeed} from '../dist/power.js';

function tightRack(cueZ) {
  const balls=[makePhysicsBody(0,-.93,cueZ)];
  const starts=[];
  for(let row=0,n=1;row<5;row++)for(let j=0;j<=row;j++){
    const x=.49+row*(Math.sqrt(3)*RADIUS+.00006);
    const z=(j-row/2)*(2*RADIUS+.00012);
    starts.push({x,z});balls.push(makePhysicsBody(n++,x,z));
  }
  return {balls,starts};
}

function runBreak(cueZ) {
  const {balls,starts}=tightRack(cueZ);
  const dx=.49+.93,dz=-cueZ,mag=Math.hypot(dx,dz);
  strikeBall(balls[0],{x:dx/mag,z:dz/mag},powerToCueSpeed(100));
  const mass=PHYSICS.mass,inertia=.4*mass*RADIUS**2;
  const energy=()=>balls.reduce((sum,b)=>sum+(b.active?
    .5*mass*(b.vx*b.vx+b.vz*b.vz)+
    .5*inertia*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz):0),0);
  const initialEnergy=energy();
  let peakEnergy=initialEnergy,limits=0,rails=0,collisions=0,settled=false;
  for(let k=0;k<2600;k++){
    const moving=simulatePhysics(balls,1/240,{
      onEventLimit:()=>limits++,onCushion:()=>rails++,onCollision:()=>collisions++});
    peakEnergy=Math.max(peakEnergy,energy());
    if(!moving){settled=true;break;}
  }
  const distances=balls.slice(1).map((b,i)=>Math.hypot(b.x-starts[i].x,b.z-starts[i].z));
  return {balls,distances,initialEnergy,peakEnergy,limits,rails,collisions,settled};
}

test('compression and restitution transmit an impulse through a touching chain',()=>{
  const makeChain=()=>[
    makePhysicsBody(0,-2*RADIUS-.0001,0),
    makePhysicsBody(1,0,0),
    makePhysicsBody(2,2*RADIUS+.0001,0),
  ];
  const normal=makeChain(),reverse=makeChain();
  normal[0].vx=4;reverse[0].vx=4;
  const contacts=resolveSimultaneousBallContacts(normal,normal[0],normal[1]);
  resolveSimultaneousBallContacts(reverse.slice().reverse(),reverse[0],reverse[1]);
  assert.ok(contacts.reports.length>=2);
  assert.ok(contacts.advanced>0,'the collision lasts a finite time');
  assert.ok(normal[2].vx>2,'third ball receives a meaningful impulse');
  assert.ok(Math.abs(normal.reduce((s,b)=>s+b.vx,0)-4)<1e-7);
  assert.ok(normal.reduce((s,b)=>s+b.vx*b.vx,0)<=16+1e-6);
  for(let i=0;i<3;i++)assert.ok(Math.abs(normal[i].vx-reverse[i].vx)<1e-5,
    'contact resolution must not depend on pair enumeration order');
});

test('initial break fans to both halves instead of pushing the whole rack forward',()=>{
  for(const cueZ of [0,-.42,.42]){
    const {balls}=tightRack(cueZ);
    const dx=1.42,dz=-cueZ,mag=Math.hypot(dx,dz);
    strikeBall(balls[0],{x:dx/mag,z:dz/mag},powerToCueSpeed(100));
    for(let i=0;i<36;i++)simulatePhysics(balls,1/240);
    const objects=balls.slice(1);
    const forward=objects.filter(b=>b.vx>.1).length;
    const backward=objects.filter(b=>b.vx<-.1).length;
    const left=objects.filter(b=>b.vz<-.1).length;
    const right=objects.filter(b=>b.vz>.1).length;
    assert.ok(forward>=5&&backward>=4,
      `break ${cueZ} did not fan longitudinally: forward=${forward}, backward=${backward}`);
    assert.ok(left>=4&&right>=4,
      `break ${cueZ} did not fan laterally: left=${left}, right=${right}`);
    const middle=objects[4]; // near the middle of the racked triangle
    const outer=objects[10]; // an outside rear-row ball
    assert.ok(Math.hypot(outer.vx,outer.vz)>Math.hypot(middle.vx,middle.vz)*2,
      `break ${cueZ} moves the whole rack as one rigid block`);
  }
});

test('a full-speed tournament break disperses balls from centre and both sides',()=>{
  for(const cueZ of [0,-.42,.42]){
    const shot=runBreak(cueZ);
    const moved=shot.distances.filter(d=>d>.20).length;
    assert.ok(shot.settled,`the break from ${cueZ} must settle`);
    assert.equal(shot.limits,0,`CCD event capacity exhausted at ${cueZ}`);
    assert.ok(moved>=11,`from ${cueZ}, only ${moved} of 15 balls travelled 20 cm`);
    assert.ok(shot.rails>=15,`from ${cueZ}, too few cushion hits: ${shot.rails}`);
    // A pool cushion dissipates more energy than the archived snooker fit;
    // fewer SECONDARY contacts are expected without a loss of rack spread.
    assert.ok(shot.collisions>=28,`from ${cueZ}, too few ball contacts: ${shot.collisions}`);
    assert.ok(shot.peakEnergy<shot.initialEnergy*1.001,
      `from ${cueZ}, the impact solver created kinetic energy`);
  }
});
