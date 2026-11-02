import test from 'node:test';
import assert from 'node:assert/strict';
import {RADIUS,WIDTH,NOSE_HEIGHT,PHYSICS,
  makePhysicsBody,simulatePhysics} from '../dist/physics.js';
import {SIMULTANEOUS_POOL_CONTACT,PUBLISHED_POOL_MATERIALS_2022,
  PUBLISHED_MODULI_POOL_CONTACT,LITERATURE_POOL_CONTACT,
  TUM_POOL_CLOTH_SLIDING_2012,spherePlaneHertzStiffness,
  tumPoolClothFriction,
  simulateSimultaneousRailClothImpact,measureSimultaneousPoolRebound}
  from '../dist/simultaneous-cushion.js';
import {auditV022} from '../scripts/audit-v022.js';
import {auditMaterialV022,comparePoolResearchVariants}
  from '../scripts/audit-material-v022.js';
import {sensitivityV022} from '../scripts/sensitivity-v022.js';
import {readMeasurements} from '../scripts/compare-cushion-models.js';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('v0.22 evaluates concurrent non-zero cloth and rail forces in 6 DOF',()=>{
  const r=simulateSimultaneousRailClothImpact({incoming:1.2,angleDeg:45});
  assert.ok(r.impactSteps>50);
  assert.ok(r.simultaneousSteps>50);
  assert.ok(r.peakRailForce>10&&r.peakClothForce>10);
  assert.ok(r.peakRailIndent>0&&r.peakClothIndent>0);
  assert.ok(Math.abs(r.state.y-RADIUS)>0.0001,
    'vertical translation is not artificially constrained');
  assert.ok(r.exitTime>0&&r.exitTime<0.012);
  assert.ok(r.netEnergyLoss>0);
});

test('v0.22 preserves mechanical energy when both contacts are elastic and frictionless',()=>{
  const elastic={railRestitution:1,clothRestitution:1,
    railFriction:0,clothFriction:0};
  for(const angleDeg of [0,30,75]){
    const r=simulateSimultaneousRailClothImpact({
      incoming:1.2,angleDeg,parameters:elastic,timeStep:0.0000005});
    assert.ok(Math.abs(r.initialEnergy-r.finalEnergy)<2e-6,
      `unphysical energy drift at ${angleDeg} degrees`);
  }
});

test('v0.22 dissipates energy for rolling, oblique, and spin-heavy impacts',()=>{
  for(const incoming of [0.5,1.2,2.3,4])
    for(const angleDeg of [0,30,75])
      for(const sidespin of [-3,0,3]){
        const r=simulateSimultaneousRailClothImpact({
          incoming,angleDeg,sidespin});
        assert.ok(r.netEnergyLoss>-0.00001);
        assert.ok(r.maxEnergyIncrease<0.00001,
          `unexpected energy production at ${incoming}/${angleDeg}/${sidespin}`);
        assert.ok(Object.values(r.state).every(Number.isFinite));
      }
});

test('v0.22 integrated rebound converges with halving the numerical timestep',()=>{
  for(const angleDeg of [30,75]){
    const coarse=measureSimultaneousPoolRebound({incoming:1.2,angleDeg,
      timeStep:0.000002});
    const fine=measureSimultaneousPoolRebound({incoming:1.2,angleDeg,
      timeStep:0.000001});
    for(const key of ['postRollNormal','postRollTangent'])
      assert.ok(Math.abs(coarse[key]-fine[key])<0.002,
        `${key} does not converge`);
  }
});

test('v0.22 returns to first physical 3D roll, including delayed lift-offs',()=>{
  const fast=measureSimultaneousPoolRebound({incoming:2.3,angleDeg:30});
  assert.ok(fast.firstRollTime>0.12);
  assert.ok(Math.abs(fast.state.y-RADIUS)<0.00005+
    fast.equilibriumIndent);
  assert.ok(Math.abs(fast.state.vy)<0.05);
  assert.ok(Math.hypot(fast.state.vx+RADIUS*fast.state.wz,
    fast.state.vz-RADIUS*fast.state.wx)<0.00201);
});

test('v0.22 rejects invalid arbitrary rubber and integration parameters',()=>{
  for(const parameters of [{railRestitution:1.1},
    {railStiffness:-1},{railFriction:-0.1},{timeStep:0.0002}]){
    assert.throws(()=>simulateSimultaneousRailClothImpact({
      incoming:1,parameters}),RangeError);
  }
  assert.throws(()=>measureSimultaneousPoolRebound({incoming:1,angleDeg:90}),
    RangeError);
});

test('v0.22 gate rejects worsening an in-sample US pool reference',()=>{
  const report=auditV022();
  assert.equal(report.status,'REJECTED_REGRESSION');
  assert.equal(report.activeModelChanged,false);
  assert.equal(report.independent,null);
  assert.equal(report.regression.baseline.count,24);
  assert.ok(Math.abs(report.regression.baseline.rmsePoints-3.846837443558314)<1e-8);
  assert.ok(report.regression.candidate.rmsePoints>report.regression.baseline.rmsePoints);
  assert.ok(report.regression.subgroups.every(g=>!g.noRegression));
});

test('v0.22 default material hypotheses are marked as not experimentally known',()=>{
  assert.match(SIMULTANEOUS_POOL_CONTACT.status,/UNCALIBRATED/);
  assert.match(SIMULTANEOUS_POOL_CONTACT.source,/Gismeros/);
});

test('v0.22 experimental rows accept two components of one identified shot',()=>{
  const dir=mkdtempSync(join(tmpdir(),'frame-pool-measurements-'));
  try{
    const file=join(dir,'independent.json');
    const rows=[{shotId:'S01',incoming:1.2,angleDeg:45,
      component:'normal',observedPercent:66},
    {shotId:'S01',incoming:1.2,angleDeg:45,
      component:'tangent',observedPercent:79}];
    writeFileSync(file,JSON.stringify({table:'US table',measurements:rows}));
    assert.equal(readMeasurements(file).measurements.length,2);
    assert.ok(auditV022({measurementPath:file}).independent);
    writeFileSync(file,JSON.stringify({table:'US table',measurements:[rows[0],rows[0]]}));
    assert.throws(()=>readMeasurements(file),/dupliqué/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});

test('v0.22 does not change archived snooker nor v0.21 behavior',()=>{
  const reach=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);
  const base=makePhysicsBody(0,0,WIDTH-reach-0.001);
  base.vz=1.2;base.wx=base.vz/RADIUS;
  const same={...base},different={...base};
  for(let i=0;i<40;i++){
    simulatePhysics([same],0.0005,{cushionProfile:'snooker'});
    simulatePhysics([different],0.0005,{
      cushionProfile:'snooker',cushionModel:'coupled-v021'});
  }
  for(const key of ['x','z','vx','vz','wx','wy','wz'])
    assert.equal(same[key],different[key]);
});

test('v0.22 sensitivity scan demonstrates no unverified parameter substitution',()=>{
  const report=sensitivityV022();
  assert.equal(report.count,27);
  assert.match(report.status,/NOT_MATERIAL/);
  assert.ok(report.bestRegressionScenarios[0].rmsePoints>3.85,
    'reference must be preserved when uncalibrated contact laws still regress');
});

test('2022 pool material values determine Hertz stiffness without fitting rebounds',()=>{
  const {ball,cushion,cloth}=PUBLISHED_POOL_MATERIALS_2022;
  assert.equal(ball.youngPa,3_800_000_000);
  assert.equal(cushion.youngPa,7_000_000);
  assert.equal(cloth.youngPa,3_100_000_000);
  assert.ok(Math.abs(PUBLISHED_MODULI_POOL_CONTACT.railStiffness-
    2_099_195.6303526987)<0.001);
  assert.ok(Math.abs(PUBLISHED_MODULI_POOL_CONTACT.clothStiffness-
    448_845_888.29034704)<0.001);
  assert.equal(PUBLISHED_MODULI_POOL_CONTACT.railStiffness,
    spherePlaneHertzStiffness(ball,cushion));
  assert.equal(PUBLISHED_MODULI_POOL_CONTACT.clothStiffness,
    spherePlaneHertzStiffness(ball,cloth));
  assert.throws(()=>spherePlaneHertzStiffness(ball,{youngPa:0,poisson:0.3}),
    RangeError);
  assert.throws(()=>spherePlaneHertzStiffness(ball,cloth,-1),RangeError);
  assert.equal(SIMULTANEOUS_POOL_CONTACT.railStiffness,1e8,
    'base research comparison must stay unchanged');
});

test('published material hypothesis improves research RMSE but cannot replace v0.21',()=>{
  const report=auditMaterialV022();
  assert.equal(report.activeModelChanged,false);
  assert.equal(report.scenarios.originalV022.status,'REJECTED_REGRESSION');
  assert.equal(report.scenarios.publishedElasticModuli.status,
    'REJECTED_REGRESSION');
  assert.ok(report.scenarios.publishedElasticModuli.rmsePoints<
    report.scenarios.originalV022.rmsePoints);
  assert.ok(report.scenarios.publishedElasticModuli.rmsePoints>
    report.v021.rmsePoints);
  assert.match(PUBLISHED_MODULI_POOL_CONTACT.status,/remain unmeasured/);
});

test('published-moduli candidate remains dissipative and timestep convergent',()=>{
  for(const incoming of [0.5,1.2,2.3,4])
    for(const angleDeg of [0,30,75]){
      const result=simulateSimultaneousRailClothImpact({
        incoming,angleDeg,parameters:PUBLISHED_MODULI_POOL_CONTACT});
      assert.ok(result.netEnergyLoss>-0.00001);
      assert.ok(result.maxEnergyIncrease<0.00001);
    }
  for(const angleDeg of [30,75]){
    const a=measureSimultaneousPoolRebound({incoming:1.2,angleDeg,
      parameters:PUBLISHED_MODULI_POOL_CONTACT,timeStep:0.000002});
    const b=measureSimultaneousPoolRebound({incoming:1.2,angleDeg,
      parameters:PUBLISHED_MODULI_POOL_CONTACT,timeStep:0.000001});
    for(const key of ['postRollNormal','postRollTangent'])
      assert.ok(Math.abs(a[key]-b[key])<0.0001,
        `published-moduli ${key} does not converge`);
  }
});

test('2012 US pool cloth sliding law matches published piecewise coefficients',()=>{
  assert.equal(TUM_POOL_CLOTH_SLIDING_2012.transitionSpeed,0.672);
  assert.equal(tumPoolClothFriction(0),0.2014);
  assert.ok(Math.abs(tumPoolClothFriction(0.5)-0.43955)<1e-10);
  assert.ok(Math.abs(tumPoolClothFriction(0.672)-(0.2014+0.4763*0.672))<1e-10);
  assert.ok(Math.abs(tumPoolClothFriction(1)-(0.2322+0.0180))<1e-10);
  assert.throws(()=>tumPoolClothFriction(-0.1),RangeError);
  assert.throws(()=>tumPoolClothFriction(NaN),RangeError);
  assert.throws(()=>simulateSimultaneousRailClothImpact({incoming:1,
    parameters:{clothNormalLaw:'unrecognized'}}),RangeError);
  assert.throws(()=>simulateSimultaneousRailClothImpact({incoming:1,
    parameters:{clothFrictionLaw:'unrecognized'}}),RangeError);
  assert.equal(SIMULTANEOUS_POOL_CONTACT.clothFrictionLaw,'constant');
  assert.equal(SIMULTANEOUS_POOL_CONTACT.clothNormalLaw,
    'lankarani-nikravesh');
});

test('literature cloth hypothesis improves v0.22 without claiming v0.21 parity',()=>{
  const report=auditMaterialV022();
  const newModel=report.scenarios.publishedClothLaws;
  assert.equal(report.activeModelChanged,false);
  assert.equal(newModel.status,'REJECTED_REGRESSION');
  assert.equal(newModel.clothNormalLaw,'hertz');
  assert.equal(newModel.clothFrictionLaw,'tum-2012');
  assert.ok(newModel.rmsePoints<
    report.scenarios.publishedElasticModuli.rmsePoints);
  assert.ok(newModel.rmsePoints<
    report.scenarios.originalV022.rmsePoints);
  assert.ok(newModel.rmsePoints>report.v021.rmsePoints);
  assert.ok(newModel.bySpeed.every(g=>!g.noRegression));
  const local=report.researchVariantComparisons.clothVsMaterial;
  assert.equal(local.noRegression,false);
  assert.equal(local.totalComponents,24);
  assert.ok(local.worsenedCount>0);
  assert.ok(local.bySpeed.every(g=>g.noRegression));
  assert.ok(local.byAngle.some(g=>!g.noRegression));
  assert.ok(local.byComponent.some(g=>!g.noRegression));
  assert.ok(local.worstDegradations[0].deltaAbsoluteErrorPoints>2);
});

test('research no-regression gate accepts identical laws, rejects local degradation',()=>{
  const same=comparePoolResearchVariants(
    PUBLISHED_MODULI_POOL_CONTACT,PUBLISHED_MODULI_POOL_CONTACT);
  assert.equal(same.worsenedCount,0);
  assert.equal(same.noRegression,true);
  const different=comparePoolResearchVariants(
    PUBLISHED_MODULI_POOL_CONTACT,LITERATURE_POOL_CONTACT);
  assert.equal(different.noRegression,false);
});

test('literature cloth model dissipates energy and converges at half timesteps',()=>{
  for(const incoming of [0.5,1.2,2.3,4])
    for(const angleDeg of [0,30,75])
      for(const sidespin of [-3,0,3]){
        const r=simulateSimultaneousRailClothImpact({
          incoming,angleDeg,sidespin,parameters:LITERATURE_POOL_CONTACT});
        assert.ok(r.netEnergyLoss>-0.00001);
        assert.ok(r.maxEnergyIncrease<0.00001);
      }
  for(const angleDeg of [30,75]){
    const coarser=measureSimultaneousPoolRebound({incoming:1.2,angleDeg,
      parameters:LITERATURE_POOL_CONTACT,timeStep:0.000002});
    const finer=measureSimultaneousPoolRebound({incoming:1.2,angleDeg,
      parameters:LITERATURE_POOL_CONTACT,timeStep:0.000001});
    for(const key of ['postRollNormal','postRollTangent'])
      assert.ok(Math.abs(coarser[key]-finer[key])<0.00002,
        `literature cloth ${key} does not converge`);
  }
});
