import test from 'node:test';
import assert from 'node:assert/strict';
import {makePhysicsBody,simulatePhysics,RADIUS,PHYSICS,NOSE_HEIGHT,WIDTH,strikeBall} from '../dist/physics.js';
import {resolveSeparatedRailImpact} from '../dist/separated-cushion.js';
import {resolveCoupledRailImpact,COUPLED_POOL_RAIL_V021} from '../dist/coupled-cushion.js';
import {compareCushionModels} from '../scripts/compare-cushion-models.js';
import {getLabScenario,ShotTelemetry} from '../dist/lab.js';
import {predictTrajectory} from '../dist/trajectory.js';
const reach=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);
const options={mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,restitution:.73,parameters:COUPLED_POOL_RAIL_V021};
const energy=b=>.5*PHYSICS.mass*(b.vx**2+b.vz**2)+.2*PHYSICS.mass*RADIUS**2*(b.wx**2+b.wy**2+b.wz**2);
function grazing(model,side){
  const b=makePhysicsBody(0,-.4,WIDTH-reach-1e-6),a=85*Math.PI/180;
  b.vx=4*Math.sin(a);b.vz=4*Math.cos(a);
  b.wx=-b.vz/RADIUS;b.wz=b.vx/RADIUS;b.wy=side*4/RADIUS;
  for(let i=0;i<20;i++)simulatePhysics([b],.004,{cushionModel:model});
  return b;
}

test('v0.68 fixes the three residual inward velocities without altering v0.21',()=>{
  for(const side of [-2,1,2]){
    const old=grazing('coupled-v021',side),fixed=grazing('coupled-v068',side);
    assert.ok(old.vz>.003,'archived model must reproduce the diagnosed problem');
    assert.ok(fixed.vz<=0,'centre must separate from the upper rail');
  }
});
test('a receding centre cannot receive another impact solely because of spin',()=>{
  const b=makePhysicsBody(0,0,0);b.vz=-.1;b.wx=100;
  const original={...b},old={...b};
  assert.ok(resolveCoupledRailImpact(old,0,-1,options).speed>0);
  assert.equal(resolveSeparatedRailImpact(b,0,-1,options).speed,0);
  assert.deepEqual(b,original);
});
test('the geometric correction is passive, torque-free and leaves tangent speed intact',()=>{
  const b=makePhysicsBody(0,0,0);b.vx=.8;b.vz=.02;b.wx=-100;b.wy=30;
  const before={...b},e0=energy(b);
  const impact=resolveSeparatedRailImpact(b,0,-1,options);
  assert.ok(impact.separationImpulse>0);
  assert.equal(b.vz,0);assert.equal(b.vx,before.vx);
  for(const key of ['wx','wy','wz'])assert.equal(b[key],before[key]);
  assert.ok(energy(b)<e0);
});
test('American-pool regression agreement is identical for the old and corrected models',()=>{
  const scores=compareCushionModels().publishedRegression;
  assert.deepEqual(scores.byModel['coupled-v068'],scores.byModel['coupled-v021']);
  assert.match(scores.status,/NOT independent/);
});
test('the corrected pool option does not change the archived snooker profile',()=>{
  const a=makePhysicsBody(0,-.4,WIDTH-reach-1e-4);
  a.vz=.6;a.vx=.8;a.wx=-20;a.wy=80;
  const b={...a};
  for(let i=0;i<100;i++){
    simulatePhysics([a],1/240,{cushionProfile:'snooker',cushionModel:'coupled-v021'});
    simulatePhysics([b],1/240,{cushionProfile:'snooker',cushionModel:'coupled-v068'});
  }
  assert.deepEqual(a,b);
});
test('rail diagnostic observes actual pre/post impact states without changing motion',()=>{
  const s=getLabScenario('rail-grazing');
  const make=()=>{const b=makePhysicsBody(0,s.balls[0].x,s.balls[0].z);strikeBall(b,s.aim,12*s.power/100,s.spin);return b;};
  const b=make(),plain=make(),t=new ShotTelemetry([b],s.aim,s.title,{cushionModel:'coupled-v068'});
  let time=0;
  for(let i=0;i<120;i++){
    simulatePhysics([b],1/240,{cushionModel:'coupled-v068',
      onBeforeRailContact:(hit,dt,kind)=>t.recordRailBefore(hit,time+(dt??1/240),kind),
      onRailContact:(hit,_,dt,kind)=>t.recordRailAfter(hit,time+(dt??1/240),kind)});
    simulatePhysics([plain],1/240,{cushionModel:'coupled-v068'});time+=1/240;
  }
  assert.deepEqual(b,plain);assert.ok(t.railImpacts.length>=1);
  const event=t.railImpacts[0];assert.equal(event.num,0);assert.equal(event.kind,'rail');
  assert.ok(event.before.vz>0&&event.after.vz<0);
  const saved=structuredClone(event);b.vx=99;t.record([b],time,true);assert.deepEqual(event,saved);
});
test('trajectory assistance uses the corrected model and predicts its actual moving path',()=>{
  const s=getLabScenario('rail-grazing');
  const balls=s.balls.map(b=>makePhysicsBody(b.num,b.x,b.z));
  const preview=predictTrajectory(balls,s.aim,s.power,s.spin,s.elevation,'coupled-v068');
  strikeBall(balls[0],s.aim,12*s.power/100,s.spin);
  for(let i=0;i<540;i++)simulatePhysics(balls,1/240,{cushionModel:'coupled-v068'});
  const end=preview.before.at(-1);
  assert.ok(Math.hypot(end.x-balls[0].x,end.z-balls[0].z)<1e-5);
});

test('the passive correction is invariant under rotation of the table frame',()=>{
  for(const a of [0,.3,Math.PI/2,Math.PI,-Math.PI/2]){
    const nx=Math.cos(a),nz=Math.sin(a),tx=-nz,tz=nx;
    const b=makePhysicsBody(0,0,0);
    b.vx=-.02*nx+.8*tx;b.vz=-.02*nz+.8*tz;
    b.wx=-100*tx;b.wz=-100*tz;b.wy=30;
    const original={...b},e0=energy(b);
    resolveSeparatedRailImpact(b,nx,nz,options);
    assert.ok(b.vx*nx+b.vz*nz>=-1e-12);
    assert.ok(Math.abs(b.vx*tx+b.vz*tz-.8)<1e-12);
    assert.ok(energy(b)<=e0);
    assert.equal(b.wx,original.wx);assert.equal(b.wz,original.wz);assert.equal(b.wy,original.wy);
  }
});
