import test from 'node:test';
import assert from 'node:assert/strict';
import {RADIUS, makePhysicsBody, strikeBall, simulatePhysics} from '../dist/physics.js';
import {powerToCueSpeed} from '../dist/power.js';

test('the whole power gauge is increasing and retains gentle low-end control', () => {
  assert.equal(powerToCueSpeed(0),0);
  assert.equal(powerToCueSpeed(-50),0);
  assert.equal(powerToCueSpeed(200),12);
  let previous=0;
  for(let pct=5;pct<=100;pct++) {
    const speed=powerToCueSpeed(pct);
    assert.ok(speed>previous,`power ${pct}% must increase speed`);
    previous=speed;
  }
  assert.ok(powerToCueSpeed(5)<0.3);
  assert.ok(powerToCueSpeed(55)>2.1&&powerToCueSpeed(55)<2.4);
  assert.ok(powerToCueSpeed(90)>8);
  assert.equal(powerToCueSpeed(100),12);
});

test('max-power centred break delivers realistic speed and opens a full rack', () => {
  const rack=[makePhysicsBody(0,-0.76,0)];
  const initial=[];
  for(let row=0,n=1;row<5;row++)for(let j=0;j<=row;j++) {
    const x=0.49+row*(Math.sqrt(3)*RADIUS+0.0005);
    const z=(j-row/2)*(2*RADIUS+0.0008);
    rack.push(makePhysicsBody(n++,x,z));initial.push({x,z});
  }
  const impact=strikeBall(rack[0],{x:1,z:0},powerToCueSpeed(100));
  assert.ok(Math.abs(impact.vx-12)<1e-9);
  let collisions=0;
  for(let i=0;i<2400;i++) {
    const moving=simulatePhysics(rack,1/240,{onCollision:()=>collisions++});
    if(!moving)break;
  }
  const movement=rack.slice(1).map((b,i)=>Math.hypot(b.x-initial[i].x,b.z-initial[i].z));
  assert.ok(collisions>=15,`rack collision count ${collisions}`);
  assert.ok(movement.filter(d=>d>0.2).length>=6,`dispersed balls: ${movement.filter(d=>d>0.2).length}`);
  assert.ok(rack.slice(1).every(b=>Number.isFinite(b.x+b.z+b.vx+b.vz)));
});
