import test from 'node:test';
import assert from 'node:assert/strict';
import {RADIUS,WIDTH,PHYSICS,PHYSICS_EVIDENCE,ballContactFriction,
  makePhysicsBody,resolveBallCollision,simulatePhysics} from '../dist/physics.js';
import {PUBLISHED_COLLISIONS,MATHAVAN_2009_URL,
  measurePostSlipCollision,measureRollingDeceleration,publishedCushionFit,
  measureRailRebound,measurePostSlideRailRebound,
  measurePoolObliqueRailRebound} from '../dist/experimental.js';
import {CUSHION_PROFILES,DEFAULT_CUSHION_PROFILE,cushionRestitutionFor,
  snookerReboundFit,TUM_POOL_RAIL,poolRailReference,
  poolEffectiveRailFriction} from '../dist/cushion-profiles.js';
import {runCalibration} from '../dist/calibration.js';

test('published collision speeds are actual source data and simulated separately',()=>{
  assert.equal(PUBLISHED_COLLISIONS.length,5);
  assert.match(MATHAVAN_2009_URL,/10\.1119\/1\.3157159/);
  const benchmark=PUBLISHED_COLLISIONS.map(p=>({p,sim:measurePostSlipCollision(p)}));
  let squared=0;
  for(const {p,sim} of benchmark) {
    for(const k of ['cue','object']) {
      assert.ok(sim[k]>0);
      squared+=(sim[k]-p[k])**2;
    }
  }
  const rmse=Math.sqrt(squared/10);
  assert.ok(rmse<0.05,`independent published collisions RMSE ${rmse} m/s`);
  // The data include a shot whose difference is material. No fitted
  // simulation should falsely advertise zero discrepancy on all five shots.
  assert.ok(benchmark.some(({p,sim})=>Math.abs(sim.cue-p.cue)>0.05));
});

test('pool cloth follows Alciatore and snooker retains measured tournament friction',()=>{
  const [low,high]=PHYSICS_EVIDENCE.cloth.rolling;
  assert.equal(PHYSICS.rollingFriction,PHYSICS_EVIDENCE.cloth.poolRolling);
  assert.ok(CUSHION_PROFILES.snooker.rollingFriction>=low&&
    CUSHION_PROFILES.snooker.rollingFriction<=high);
  const snooker=measureRollingDeceleration('snooker');
  assert.ok(snooker>=0.124&&snooker<=0.126,
    `published snooker deceleration 0.124–0.126 m/s², found ${snooker}`);
  const pool=measureRollingDeceleration('pool');
  assert.ok(pool>0.097&&pool<0.099,`typical American-pool deceleration: ${pool}`);
});

test('ball friction decays with relative tangential speed, following the published law',()=>{
  assert.ok(Math.abs(ballContactFriction(0)-0.117951)<1e-8);
  assert.ok(Math.abs(ballContactFriction(1)-(0.009951+0.108*Math.exp(-1.088)))<1e-10);
  assert.ok(ballContactFriction(0.2)>ballContactFriction(2));
  assert.ok(ballContactFriction(8)>0);
});

test('collision-induced throw peaks near the high-speed-video result at moderate speed',()=>{
  const incidentSpeed=1;
  let largest={angle:0,throw:0};
  for(let angle=5;angle<=65;angle++) {
    const cue=makePhysicsBody(0,0,0);
    const target=makePhysicsBody(1,
      2*RADIUS*Math.cos(angle*Math.PI/180),
      2*RADIUS*Math.sin(angle*Math.PI/180));
    cue.vx=incidentSpeed;
    resolveBallCollision(cue,target);
    const objectAngle=Math.atan2(target.vz,target.vx)*180/Math.PI;
    const throwAngle=Math.abs(objectAngle-angle);
    if(throwAngle>largest.throw)largest={angle,throw:throwAngle};
  }
  // Sudo et al. 2003 measured a maximum near 30° for their experimental
  // conditions. This checks the shape, not an unmeasured exact-angle fit.
  assert.ok(largest.angle>=22&&largest.angle<=35,JSON.stringify(largest));
  assert.ok(largest.throw>2&&largest.throw<7);
});

test('the old snooker rail model preserves its fitted curve, separate from pool',()=>{
  for(const incoming of [0.5,1.2,2.3,3.2]) {
    const predicted=publishedCushionFit(incoming);
    assert.equal(predicted,snookerReboundFit(incoming));
    const simulated=measureRailRebound(incoming,'snooker');
    assert.ok(Math.abs(simulated-predicted)<0.012,
      `at ${incoming} m/s: fit ${predicted}, observed ${simulated}`);
  }
  const rows=runCalibration();
  assert.equal(rows.filter(r=>r.family==='published-ball').length,10);
  assert.equal(rows.filter(r=>r.family==='snooker-rail').length,4);
  assert.ok(rows.filter(r=>r.family==='snooker-rail')
    .every(r=>r.publishedKind.includes('calibrage')));
});

test('American pool is the active cushion profile and follows measured speed dependence',()=>{
  assert.equal(DEFAULT_CUSHION_PROFILE,'pool');
  assert.equal(PHYSICS.cushionRestitution,CUSHION_PROFILES.pool.restitution);
  assert.notEqual(CUSHION_PROFILES.pool.restitution,CUSHION_PROFILES.snooker.restitution);
  assert.equal(TUM_POOL_RAIL.contactCount,1217);
  for(const incoming of [0.5,1.2,2.3]) {
    const postSkid=measurePostSlideRailRebound(incoming);
    const ratio=postSkid/incoming;
    // TUM Eq. 14 normalizes the rebound vector: at perpendicular incidence,
    // the FINAL speed ratio is delta_v, NOT e_bc * delta_v.
    const reference=poolRailReference(incoming,0).velocityRetention;
    assert.ok(Math.abs(ratio-reference)<0.006,
      `pool at ${incoming} m/s: ${(ratio*100).toFixed(2)} % vs TUM ${(reference*100).toFixed(2)} %`);
    assert.ok(postSkid<measurePostSlideRailRebound(incoming,'snooker'),
      'American pool profile should be less lively than archived snooker fit');
  }
  assert.ok(measurePostSlideRailRebound(0.5)/0.5>
    measurePostSlideRailRebound(2.3)/2.3,
    'the observed pool retention must decrease at higher speed');
  assert.throws(()=>cushionRestitutionFor('unknown',1,1),RangeError);
  const rows=runCalibration().filter(r=>r.family==='pool-rail');
  assert.equal(rows.length,4);
  assert.equal(rows.filter(r=>r.publishedKind.includes('indicatif')).length,1);
  assert.equal(rows.filter(r=>r.publishedKind.includes('régression')).length,3);
});

test('TUM pool equation 14 conserves the measured total speed, not e_bc times speed',()=>{
  for(const angleDeg of [0,15,30,45,60]){
    const a=angleDeg*Math.PI/180;
    const ref=poolRailReference(1.2,a);
    const vectorRatio=Math.hypot(ref.postRollNormalRatio*Math.cos(a),
      ref.postRollTangentialRatio*Math.sin(a));
    assert.ok(Math.abs(vectorRatio-ref.velocityRetention)<1e-12);
    assert.ok(ref.normalRestitution<1&&ref.normalRestitution>0);
  }
  assert.ok(poolRailReference(10,0).velocityRetention>0,
    'no unphysical negative pool speed extrapolation at a hard break');
});

test('measured pool bank angles and speed components match the 1217-shot regression',()=>{
  for(const speed of [0.5,1.2,2.3])for(const angleDeg of [15,30,45,60,75]){
    const fit=poolRailReference(speed,angleDeg*Math.PI/180);
    const output=measurePoolObliqueRailRebound({incoming:speed,angleDeg});
    const normalRatio=output.postRollNormal/output.incomingNormal;
    const tangentRatio=output.postRollTangent/output.incomingTangent;
    assert.ok(Math.abs(normalRatio-fit.postRollNormalRatio)<0.006,
      `pool normal ${speed} m/s at ${angleDeg}°`);
    assert.ok(Math.abs(tangentRatio-fit.postRollTangentialRatio)<0.010,
      `pool tangent ${speed} m/s at ${angleDeg}°`);
  }
});

test('pool effective tangential friction is inverse-identified, finite, and bounded',()=>{
  const angleToRadians=a=>a*Math.PI/180;
  const no=(1+0.27)/(1+2.5*0.27**2);
  const coeff=(speed,angle)=>{
    const a=angleToRadians(angle);
    const restitution=cushionRestitutionFor('pool',speed*Math.cos(a),
      no,a,speed,0.27);
    return poolEffectiveRailFriction(speed,a,restitution);
  };
  assert.equal(coeff(0.5,30),CUSHION_PROFILES.pool.friction);
  assert.ok(coeff(2.3,60)>0.33&&coeff(2.3,60)<0.35);
  assert.ok(coeff(2.3,75)>0.68&&coeff(2.3,75)<0.70);
  assert.equal(coeff(2.3,80),TUM_POOL_RAIL.maxEffectiveTangentialFriction);
  // Beyond 75° this is a numerical guard, NOT a calibrated pool measurement.
  const shallow=measurePoolObliqueRailRebound({incoming:2.3,angleDeg:80});
  const reference=poolRailReference(2.3,angleToRadians(80));
  assert.ok(shallow.postRollTangent/shallow.incomingTangent>
    reference.postRollTangentialRatio+0.02,
    'the >80° grazing limit must remain visible, not claimed as exact');
});

test('pool running and reverse side spin have opposite effects on bank angle',()=>{
  const params={incoming:1.2,angleDeg:30};
  const running=measurePoolObliqueRailRebound({...params,sidespin:-0.5});
  const natural=measurePoolObliqueRailRebound(params);
  const reverse=measurePoolObliqueRailRebound({...params,sidespin:0.5});
  assert.ok(running.postRollAngleDeg>natural.postRollAngleDeg);
  assert.ok(natural.postRollAngleDeg>reverse.postRollAngleDeg);
  assert.ok(running.postRollSpeed>reverse.postRollSpeed);
});

test('the empirical pool shear correction never creates kinetic energy, even with spin',()=>{
  const h=2*RADIUS*0.635-RADIUS;
  const noseReach=Math.sqrt(RADIUS*RADIUS-h*h);
  const I=0.4*PHYSICS.mass*RADIUS**2;
  const energy=b=>0.5*PHYSICS.mass*(b.vx*b.vx+b.vz*b.vz)+
    0.5*I*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz);
  for(const speed of [0.5,2.3,4])for(const angleDeg of [0,30,60,75])
    for(const spin of [-3,-1,0,1,3])for(const roll of [-1,0,1,2]){
      const angle=angleDeg*Math.PI/180;
      const b=makePhysicsBody(0,-0.4,WIDTH-noseReach-0.002);
      b.vx=speed*Math.sin(angle);
      b.vz=speed*Math.cos(angle);
      b.wx=b.vz/RADIUS*roll;
      b.wz=-b.vx/RADIUS*roll;
      b.wy=spin*speed/RADIUS;
      const before=energy(b);
      let after=null;
      for(let i=0;i<250&&!after;i++)simulatePhysics([b],0.0005,
        {onCushion:hit=>{after=energy(hit);}});
      assert.ok(after!==null,`missing rail at ${speed} m/s, ${angleDeg}°`);
      assert.ok(after<=before*(1+1e-6),
        `energy gain at ${speed} m/s, ${angleDeg}°, spin ${spin}, roll ${roll}`);
    }
});
