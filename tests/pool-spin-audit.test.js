import test from 'node:test';
import assert from 'node:assert/strict';
import {CONDITIONS,MODEL,totalEnergy,measureSpinRebound,auditSpinMatrix} from '../scripts/audit-pool-spin.js';
import {PHYSICS,RADIUS} from '../dist/physics.js';
import {measureQualifiedPoolRebound} from '../dist/experimental.js';
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('spin audit fixes a 36-condition matrix and preserves the reference model',()=>{
 assert.equal(MODEL,'reference-v069');assert.equal(CONDITIONS.length,36);
 assert.equal(new Set(CONDITIONS.map(c=>JSON.stringify(c))).size,36);
 for(const speed of [.5,1.2,2.3])for(const angleDeg of [0,30,60,75])for(const side of [-1,0,1])
  assert.ok(CONDITIONS.some(c=>c.speed===speed&&c.angleDeg===angleDeg&&c.side===side));
});
test('spin energy includes angular energy rather than translation alone',()=>{
 const b={vx:0,vz:0,wx:0,wy:40,wz:0};
 near(totalEnergy(b),.2*PHYSICS.mass*RADIUS**2*40**2);
 assert.ok(totalEnergy(b)>0);
});
test('spin audit captures the prescribed incident spin and integrated true roll separately',()=>{
 const r=measureSpinRebound({speed:1.2,angleDeg:60,side:-1});
 assert.equal(r.passed,true,JSON.stringify(r.failures));
 assert.equal(r.contacts,1);assert.equal(r.eventLimits,0);
 near(r.incident.local.wy,-1.2/RADIUS);near(Math.hypot(r.incident.local.vx,r.incident.local.vz),1.2);
 near(r.incident.angleFromIncomingNormalDeg,60);
 near(r.incident.angleFromOutwardNormalDeg,120);
 near(r.immediate.angleFromOutwardNormalDeg,Math.atan2(r.immediate.tangentMps,r.immediate.normalMps)*180/Math.PI);
 near(r.incident.local.wx,r.incident.local.vz/RADIUS);
 near(r.incident.local.wz,-r.incident.local.vx/RADIUS);
 assert.ok(r.incident.normalMps<0);
 near(r.slidingDurationS,r.firstRoll.timeS-r.immediate.timeS);
 assert.equal(r.slidingDurationUncertaintyS,r.step);
 assert.equal(r.firstRoll.state,'rolling');assert.ok(r.firstRoll.slipMps<1e-8);
 assert.ok(r.firstRoll.timeS>r.immediate.timeS);
 assert.ok(r.immediate.slipMps>r.firstRoll.slipMps);
 assert.equal(r.firstRoll.samplingUncertaintyS,r.step);
 assert.ok(r.immediate.energyJ<=r.incident.energyJ*(1+1e-6));
 assert.ok(r.maxPenetrationM<=1e-7);
});
test('all spin cases preserve immediate and post-roll symmetries and refine in time',()=>{
 const audit=auditSpinMatrix();
 assert.equal(audit.simulations,180);
 assert.equal(audit.passed,true,JSON.stringify(audit.rows.filter(r=>!r.passed).map(r=>({condition:r.condition,failures:r.failures}))));
 for(const r of audit.rows){
  for(const d of Object.values(r.symmetry)){assert.ok(d.positionM<1e-8);assert.ok(d.velocityMps<1e-8);assert.ok(d.spinRadps<1e-7);}
  for(const d of Object.values(r.convergence))assert.ok(d.velocityMps<.001);
 }
});
test('unresolved rebound is retained as a failing diagnostic rather than dropped',()=>{
 const r=measureSpinRebound({speed:1.2,angleDeg:60,side:1},{maxTimeS:.0001});
 assert.equal(r.passed,false);assert.equal(r.firstRoll,null);
 assert.ok(r.failures.includes('first-roll-unresolved'));
 assert.ok(r.incident);assert.ok(r.immediate);assert.ok(r.final);
});
test('invalid audit inputs fail explicitly',()=>{
 for(const c of [{speed:0,angleDeg:0,side:0},{speed:1,angleDeg:90,side:0},{speed:1,angleDeg:0,side:NaN}])assert.throws(()=>measureSpinRebound(c),RangeError);
 assert.throws(()=>measureSpinRebound(CONDITIONS[0],{step:0}),RangeError);
 assert.throws(()=>measureSpinRebound(CONDITIONS[0],{frame:'invalid'}),RangeError);
});

test('the twelve zero-side-spin controls retain the qualified reference protocol',()=>{
 for(const condition of CONDITIONS.filter(c=>c.side===0)){
  const spin=measureSpinRebound(condition);
  const control=measureQualifiedPoolRebound({incoming:condition.speed,angleDeg:condition.angleDeg,cushionModel:MODEL});
  near(spin.firstRoll.normalMps,control.postRollNormal);
  near(spin.firstRoll.tangentMps,control.postRollTangent);
  near(spin.firstRoll.timeS,control.elapsedS);
  near(spin.immediate.normalMps,control.immediate.normal);
  near(spin.immediate.tangentMps,control.immediate.tangent);
 }
});
