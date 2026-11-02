import test from 'node:test';
import assert from 'node:assert/strict';
import {CUSHION_MODELS,makePhysicsBody,simulatePhysics,RADIUS,
  PHYSICS,strikeBall} from '../dist/physics.js';
import {COMPLIANT_POOL_RAIL,COMPLIANT_POOL_RAIL_TUNED} from '../dist/compliant-cushion.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {measurePoolObliqueRailRebound} from '../dist/experimental.js';
import {runCalibration} from '../dist/calibration.js';
import {ShotTelemetry,getLabScenario} from '../dist/lab.js';
import {predictTrajectory} from '../dist/trajectory.js';
import {powerToCueSpeed} from '../dist/power.js';

function tangentialResidual({incoming,angleDeg},cushionModel) {
  const fit=poolRailReference(incoming,angleDeg*Math.PI/180);
  const measured=measurePoolObliqueRailRebound({incoming,angleDeg,cushionModel});
  return 100*(measured.postRollTangent/measured.incomingTangent-
    fit.postRollTangentialRatio);
}
const rmse=values=>Math.sqrt(values.reduce((sum,x)=>sum+x*x,0)/values.length);

test('conservative v0.19 adjustment improves all internal TUM-regression partitions',()=>{
  const partitions=[
    [0.5,2.3].flatMap(incoming=>[30,45,60,75].map(angleDeg=>({incoming,angleDeg}))),
    [30,45,60,75].map(angleDeg=>({incoming:1.2,angleDeg})),
    [0.8,1.6,2].flatMap(incoming=>[20,40,55,70].map(angleDeg=>({incoming,angleDeg})))
  ];
  let baselineMax=0,tunedMax=0;
  for(const p of partitions) {
    const before=p.map(x=>tangentialResidual(x,'compliant'));
    const after=p.map(x=>tangentialResidual(x,'compliant-tuned'));
    assert.ok(rmse(after)<rmse(before),
      `tuned model must improve partition ${JSON.stringify(p)}`);
    baselineMax=Math.max(baselineMax,...before.map(Math.abs));
    tunedMax=Math.max(tunedMax,...after.map(Math.abs));
  }
  assert.ok(tunedMax<baselineMax);
});

test('tuned parameters are mild, bounded, and distinct from the archived v0.18 values',()=>{
  assert.deepEqual(CUSHION_MODELS.slice(0,3),['empirical','compliant','compliant-tuned']);
  const original=COMPLIANT_POOL_RAIL,tuned=COMPLIANT_POOL_RAIL_TUNED;
  for(const key of ['staticFriction','dynamicFriction','tangentToNormalFrequency',
    'tangentDampingRatio'])assert.notEqual(tuned[key],original[key],key);
  assert.ok(tuned.staticFriction>=tuned.dynamicFriction);
  assert.ok(tuned.staticFriction<0.4&&tuned.dynamicFriction<0.3);
  assert.equal(tuned.normalAngularFrequency,original.normalAngularFrequency);
  assert.equal(tuned.integrationSteps,original.integrationSteps);
});

test('tuned model retains energy dissipation over oblique impacts with extreme spin',()=>{
  const inertia=0.4*PHYSICS.mass*RADIUS*RADIUS;
  const energy=b=>0.5*PHYSICS.mass*(b.vx*b.vx+b.vz*b.vz)+
    0.5*inertia*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz);
  for(const v of [0.5,1.2,2.3,4])for(const degrees of [15,30,60,75])
    for(const sidespin of [-3,-1,0,1,3]) {
      const a=degrees*Math.PI/180;
      const b=makePhysicsBody(0,-0.4,0.635-0.0275);
      b.vx=v*Math.sin(a);b.vz=v*Math.cos(a);
      b.wx=b.vz/RADIUS;b.wz=-b.vx/RADIUS;
      b.wy=sidespin*v/RADIUS;
      const before=energy(b);
      let after=null;
      for(let i=0;i<400&&after===null;i++)simulatePhysics([b],0.0005,{
        cushionModel:'compliant-tuned',onCushion:hit=>{after=energy(hit);}
      });
      assert.ok(after!==null,`no impact ${v} ${degrees}`);
      assert.ok(after<=before*(1+1e-6),`energy gain ${v} ${degrees} ${sidespin}`);
    }
});

test('tuned model remains an optional pool variant and never changes snooker',()=>{
  const a=makePhysicsBody(0,1.25,0.1);
  a.vx=1.4;a.vz=0.2;a.wz=-1.4/RADIUS;
  const b={...a};
  for(let i=0;i<25;i++) {
    simulatePhysics([a],0.0005,{cushionProfile:'snooker'});
    simulatePhysics([b],0.0005,{cushionProfile:'snooker',cushionModel:'compliant-tuned'});
  }
  for(const k of ['x','z','vx','vz','wx','wy','wz'])assert.equal(a[k],b[k],k);
  const empirical=runCalibration();
  const tuned=runCalibration({cushionModel:'compliant-tuned'});
  assert.equal(empirical.length,57);
  assert.equal(tuned.length,empirical.length);
  assert.ok(Math.abs(tuned.find(x=>x.id==='tum-pool-2-3-75-tangent').simulated-
    empirical.find(x=>x.id==='tum-pool-2-3-75-tangent').simulated)>10);
});

test('shot telemetry exports the exact rail model for reproducible comparisons',()=>{
  const b=makePhysicsBody(0,-0.3,0);
  const t=new ShotTelemetry([b],{x:1,z:0},'TEST',{
    power:46,cushionModel:'compliant-tuned'});
  const lines=t.toCSV().trim().split('\n');
  assert.match(lines[0],/cushion_model$/);
  assert.match(lines[1],/compliant-tuned$/);
});

test('v0.19 bank prediction is identical to the real integrated shot',()=>{
  const scenario=getLabScenario('bank');
  const bodies=scenario.balls.map(b=>makePhysicsBody(b.num,b.x,b.z));
  const forecast=predictTrajectory(bodies,scenario.aim,scenario.power,
    scenario.spin,scenario.elevation,'compliant-tuned');
  const simulation=bodies.map(b=>({...b}));
  strikeBall(simulation[0],scenario.aim,powerToCueSpeed(scenario.power),
    scenario.spin,{elevation:scenario.elevation});
  for(let i=0;i<540;i++)simulatePhysics(simulation,1/240,
    {cushionModel:'compliant-tuned'});
  const result=forecast.before.at(-1);
  assert.ok(Math.hypot(result.x-simulation[0].x,
    result.z-simulation[0].z)<1e-5);
});
