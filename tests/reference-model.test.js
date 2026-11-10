import test from 'node:test';
import assert from 'node:assert/strict';
import {PHYSICS,RADIUS,WIDTH,NOSE_HEIGHT,makePhysicsBody,simulatePhysics,strikeBall} from '../dist/physics.js';
import {measureQualifiedPoolRebound} from '../dist/experimental.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {compareCushionModels} from '../scripts/compare-cushion-models.js';
import {auditModelRows,summarizeModel,runClothChecks} from '../scripts/pool-audit-tools.js';
import {getLabScenario} from '../dist/lab.js';
import {predictTrajectory} from '../dist/trajectory.js';
const model='reference-v069';
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
function error(row){
 const ref=poolRailReference(row.incident.speed,row.incident.angleRad);
 return [100*(row.postRollNormal/row.incident.normal-ref.postRollNormalRatio),
  100*(row.postRollTangent/row.incident.tangent-ref.postRollTangentialRatio)];
}

test('the reference model resolves small residual sliding instead of snapping it into rolling',()=>{
 const b=makePhysicsBody(0,0,.2);b.vx=.5;b.wz=-(.5-.001)/RADIUS;
 const old={...b},slide=PHYSICS.slidingFriction*PHYSICS.gravity,roll=PHYSICS.rollingFriction*PHYSICS.gravity;
 simulatePhysics([b],.0001,{cushionModel:model});simulatePhysics([old],.0001,{cushionModel:'empirical'});
 near(b.vx,.5-slide*.0001);assert.equal(b.state,'sliding');assert.equal(old.state,'rolling');
 simulatePhysics([b],.0001,{cushionModel:model});
 const transition=.001/(3.5*slide);
 near(b.vx,.5-.001/3.5-roll*(.0002-transition));
 near(b.vx+RADIUS*b.wz,0);assert.equal(b.state,'rolling');
});
test('all archived legacy model scores are preserved, including v0.17',()=>{
 const scores=compareCushionModels().publishedRegression.byModel;
 near(scores.empirical.rmsePoints,.08102912200831013);
 near(scores['coupled-v068'].rmsePoints,3.846837443558314);
 assert.deepEqual(scores[model],scores.empirical);
});
test('US measurement uses contact speed and genuine pure roll for all candidates',()=>{
 for(const m of ['empirical','coupled-v068',model]){
  const r=measureQualifiedPoolRebound({incoming:.5,angleDeg:75,cushionModel:m});
  near(r.incident.speed,.5);near(r.incident.angleRad,75*Math.PI/180);
  assert.equal(r.phase,'FIRST_PURE_ROLL');assert.equal(r.contacts,1);assert.equal(r.eventLimits,0);
 }
 for(const bad of [{incoming:0},{incoming:1,angleDeg:90},{incoming:1,step:0}])
  assert.throws(()=>measureQualifiedPoolRebound(bad),RangeError);
});
test('the new model reproduces the US regression on extra conditions not limited to the old test grid',()=>{
 for(const [incoming,angleDeg] of [[.7,21],[1.1,37],[2.1,53]]){
  const r=measureQualifiedPoolRebound({incoming,angleDeg,cushionModel:model});
  assert.ok(error(r).every(e=>Math.abs(e)<.004));
 }
});
test('the small remaining reference discrepancy converges as measurement resolution increases',()=>{
 const scores=[];
 for(const step of [.0001,.000025]){
  const errors=[.5,1.2,2.3].flatMap(incoming=>[30,45,60,75].flatMap(angleDeg=>error(
   measureQualifiedPoolRebound({incoming,angleDeg,cushionModel:model,step}))));
  scores.push(Math.sqrt(errors.reduce((s,e)=>s+e*e,0)/errors.length));
 }
 assert.ok(scores[0]<.002);assert.ok(scores[1]<scores[0]);
});
test('US contact and cloth audits pass without residual penetration or artificial energy',()=>{
 const rows=auditModelRows(model),summary=summarizeModel(rows);
 assert.equal(rows.length,970);assert.equal(summary.consistencyFailures,0);
 assert.equal(summary.convergenceFailures,0);assert.equal(summary.residualContactFlags.length,0);
 assert.ok(runClothChecks(model).every(x=>x.passed));
});
test('new accuracy and contact corrections never leak into the archived snooker profile',()=>{
 const reach=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);
 const a=makePhysicsBody(0,-.4,WIDTH-reach-1e-5);a.vx=.8;a.vz=.5;a.wx=-10;a.wy=100;
 const b={...a};
 for(let i=0;i<100;i++){
  simulatePhysics([a],1/240,{cushionProfile:'snooker',cushionModel:'empirical'});
  simulatePhysics([b],1/240,{cushionProfile:'snooker',cushionModel:model});
 }
 assert.deepEqual(a,b);
});
test('assistance and actual simulation share the new model and exact transition rules',()=>{
 const s=getLabScenario('rail-grazing'),balls=s.balls.map(b=>makePhysicsBody(b.num,b.x,b.z));
 const preview=predictTrajectory(balls,s.aim,s.power,s.spin,s.elevation,model);
 strikeBall(balls[0],s.aim,12*s.power/100,s.spin);
 for(let i=0;i<540;i++)simulatePhysics(balls,1/240,{cushionModel:model});
 const end=preview.before.at(-1);assert.ok(Math.hypot(end.x-balls[0].x,end.z-balls[0].z)<1e-5);
});

test('a valid direct backspin stroke separates from the rail where v0.17 stayed pressed',()=>{
 const reach=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);
 const make=()=>{const b=makePhysicsBody(0,-.4,WIDTH-reach-1e-6);strikeBall(b,{x:0,z:1},4,{x:0,y:-.6});return b;};
 const old=make(),next=make();
 for(let i=0;i<20;i++){
  simulatePhysics([old],.004,{cushionModel:'empirical'});
  simulatePhysics([next],.004,{cushionModel:model});
 }
 assert.ok(old.vz>.1);assert.ok(next.vz<=0);
});
