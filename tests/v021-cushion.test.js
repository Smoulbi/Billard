import test from 'node:test';
import assert from 'node:assert/strict';
import {RADIUS,NOSE_HEIGHT,PHYSICS,WIDTH,makePhysicsBody,
  simulatePhysics,strikeBall} from '../dist/physics.js';
import {COUPLED_POOL_RAIL,COUPLED_POOL_RAIL_V021,
  resolveCoupledRailImpact} from '../dist/coupled-cushion.js';
import {compareCushionModels} from '../scripts/compare-cushion-models.js';
import {runCalibration} from '../dist/calibration.js';
import {predictTrajectory} from '../dist/trajectory.js';
import {getLabScenario} from '../dist/lab.js';
import {powerToCueSpeed} from '../dist/power.js';

const inertia=0.4*PHYSICS.mass*RADIUS**2;
const energy=b=>0.5*PHYSICS.mass*(b.vx*b.vx+b.vz*b.vz)+
  0.5*inertia*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz);
const noseReach=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);

test('v0.21 keeps the archived v0.20 model unchanged and uses bounded effective parameters',()=>{
  assert.equal(COUPLED_POOL_RAIL.dynamicFriction,0.12);
  assert.equal(COUPLED_POOL_RAIL.verticalToHorizontalStiffness,1);
  const p=COUPLED_POOL_RAIL_V021;
  assert.ok(p.staticFriction>=p.dynamicFriction);
  assert.ok(p.dynamicFriction>=0.105&&p.dynamicFriction<=0.15);
  assert.ok(p.velocityFrictionGain>=0.35&&p.velocityFrictionGain<=0.6);
  assert.ok(p.velocityFrictionExponent>=1.4&&p.velocityFrictionExponent<=2.8);
  assert.ok(p.tangentToNormalFrequency>=1.6&&p.tangentToNormalFrequency<=2.1);
  assert.ok(p.verticalToHorizontalStiffness>=0.7&&p.verticalToHorizontalStiffness<=1.4);
});

test('v0.21 lowers MAE, RMSE and maximum component residual in each speed group',()=>{
  const stats=compareCushionModels().publishedRegression;
  assert.match(stats.status,/NOT independent/);
  const old=stats.byModel['coupled-3d'];
  const updated=stats.byModel['coupled-v021'];
  assert.ok(Math.abs(old.rmsePoints-5.008860389072972)<1e-8,
    'v0.20 numerical baseline must remain reproducible');
  assert.ok(updated.maePoints<old.maePoints);
  assert.ok(updated.rmsePoints<old.rmsePoints);
  for(const speed of ['0-5','1-2','2-3']) {
    const rowsFor=model=>runCalibration({cushionModel:model}).filter(r=>
      r.id.startsWith(`tum-pool-${speed}-`));
    const rms=rows=>Math.sqrt(rows.reduce((s,x)=>
      s+(x.simulated-x.published)**2,0)/rows.length);
    const max=rows=>Math.max(...rows.map(x=>Math.abs(x.simulated-x.published)));
    const before=rowsFor('coupled-3d'),after=rowsFor('coupled-v021');
    assert.ok(rms(after)<rms(before),`${speed}: no RMSE improvement`);
    assert.ok(max(after)<max(before),`${speed}: no worst-case improvement`);
  }
});

test('v0.21 constrained coupled contact conserves or dissipates kinetic energy with extreme spin',()=>{
  const params=COUPLED_POOL_RAIL_V021;
  for(const speed of [0.2,0.5,2.3,4])for(const deg of [0,30,60,75])
    for(const side of [-4,-1,0,1,4])for(const roll of [-2,0,1,2]) {
      const angle=deg*Math.PI/180;
      const b=makePhysicsBody(0,0,0);
      b.vx=speed*Math.cos(angle);b.vz=speed*Math.sin(angle);
      b.wx=roll*b.vz/RADIUS;b.wz=-roll*b.vx/RADIUS;
      b.wy=side*speed/RADIUS;
      const initial=energy(b);
      const impact=resolveCoupledRailImpact(b,-1,0,{
        mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,
        restitution:0.73,parameters:params});
      assert.ok(impact.normalImpulse>0);
      assert.ok(energy(b)<=initial+1e-9,
        `energy gain speed=${speed} angle=${deg} side=${side} roll=${roll}`);
    }
});

test('v0.21 selection leaves snooker unchanged bit-for-bit',()=>{
  const b=makePhysicsBody(0,0,WIDTH-noseReach-0.001);
  b.vz=1.1;b.wx=b.vz/RADIUS;
  const plain={...b},experimental={...b};
  for(let i=0;i<70;i++) {
    simulatePhysics([plain],0.0005,{cushionProfile:'snooker'});
    simulatePhysics([experimental],0.0005,{
      cushionProfile:'snooker',cushionModel:'coupled-v021'});
  }
  for(const key of ['x','z','vx','vz','wx','wy','wz'])
    assert.equal(plain[key],experimental[key],key);
});

test('v0.21 predicted bank ends at the real simulated bank position',()=>{
  const shot=getLabScenario('bank');
  const bodies=shot.balls.map(b=>makePhysicsBody(b.num,b.x,b.z));
  const prediction=predictTrajectory(bodies,shot.aim,shot.power,
    shot.spin,shot.elevation,'coupled-v021');
  const actual=bodies.map(b=>({...b}));
  strikeBall(actual[0],shot.aim,powerToCueSpeed(shot.power),
    shot.spin,{elevation:shot.elevation});
  for(let i=0;i<540;i++)simulatePhysics(actual,1/240,
    {cushionModel:'coupled-v021'});
  const end=prediction.before.at(-1);
  assert.ok(Math.hypot(end.x-actual[0].x,end.z-actual[0].z)<1e-5);
});
