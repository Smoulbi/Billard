// Compare the archived and corrected constrained-height pool models.
// American pool dimensions only; no snooker/carom experimental targets.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {RADIUS,WIDTH,NOSE_HEIGHT,PHYSICS,makePhysicsBody,simulatePhysics,isMoving,getCueImpact} from '../dist/physics.js';
import {compareCushionModels} from './compare-cushion-models.js';
import {measurePostSlideRailRebound} from '../dist/experimental.js';
const aSlide=PHYSICS.slidingFriction*PHYSICS.gravity;
const aRoll=PHYSICS.rollingFriction*PHYSICS.gravity;
const alpha=2.5*PHYSICS.spinningFriction*PHYSICS.gravity/RADIUS;
const inertia=.4*PHYSICS.mass*RADIUS**2;
const energy=b=>.5*PHYSICS.mass*(b.vx**2+b.vz**2)+.5*inertia*(b.wx**2+b.wy**2+b.wz**2);
const state=b=>Object.fromEntries(['x','z','vx','vz','wx','wy','wz','active'].map(k=>[k,b[k]]));
const finite=b=>['x','z','vx','vz','wx','wy','wz'].every(k=>Number.isFinite(b[k]));
function advance(b,duration,dt,callbacks={}){
  let elapsed=0;
  while(elapsed<duration-1e-12){const h=Math.min(dt,duration-elapsed);simulatePhysics([b],h,{cushionProfile:'pool',cushionModel:'coupled-v021',...callbacks});elapsed+=h;callbacks.auditSample?.(b);}
}
const cloth=[];
for(const speed of [.1,.25,.5,.6]){
  const b=makePhysicsBody(0,-1.1,.2);b.vx=speed;b.wz=-speed/RADIUS;
  advance(b,.5,1/240);
  const expectedSpeed=speed-aRoll*.5,expectedDistance=speed*.5-.5*aRoll*.5**2;
  const speedError=Math.abs(b.vx-expectedSpeed),distanceError=Math.abs((b.x+1.1)-expectedDistance);
  cloth.push({family:'rolling',speed,seconds:.5,speedErrorMps:speedError,distanceErrorM:distanceError,
    passed:speedError<1e-9&&distanceError<1e-9});
}
for(const speed of [.3,.6,1.2])for(const roll of [-1,0,.5,1,1.5,2]){
  const b=makePhysicsBody(0,-.6,.23);b.vx=speed;b.wz=-roll*speed/RADIUS;
  const tr=Math.abs(1-roll)*speed/(3.5*aSlide),tail=.025;
  const sign=Math.sign(1-roll),vr=speed-sign*aSlide*tr;
  const expectedV=vr-aRoll*tail,expectedD=speed*tr-.5*sign*aSlide*tr**2+vr*tail-.5*aRoll*tail**2;
  advance(b,tr+tail,1/240);
  const speedError=Math.abs(b.vx-expectedV),distanceError=Math.abs((b.x+.6)-expectedD);
  cloth.push({family:'sliding-to-rolling',speed,roll,transitionTimeS:tr,
    speedErrorMps:speedError,distanceErrorM:distanceError,
    slipMps:Math.abs(b.vx+RADIUS*b.wz),passed:speedError<.001&&distanceError<.0005&&Math.abs(b.vx+RADIUS*b.wz)<1e-10});
}
for(const omega of [-120,-60,-10,10,60,120]){
  const b=makePhysicsBody(0,0,.2);b.wy=omega;
  advance(b,.5,1/240);
  const expected=Math.sign(omega)*(Math.abs(omega)-alpha*.5),error=Math.abs(b.wy-expected);
  cloth.push({family:'vertical-spin-decay',omega,seconds:.5,errorRadps:error,passed:error<1e-9&&b.x===0&&b.z===.2});
}
for(const omega of [-60,0,60]){
  const b=makePhysicsBody(0,-.6,.23);b.vx=.6;b.wz=-.6/RADIUS;b.wy=omega;
  advance(b,.5,1/240);
  const error=Math.abs((b.x+.6)-(.6*.5-.5*aRoll*.5**2));
  cloth.push({family:'pure-sidespin-on-isotropic-level-cloth',omega,
    lateralDriftM:Math.abs(b.z-.23),longitudinalErrorM:error,passed:Math.abs(b.z-.23)<1e-10&&error<1e-9});
}
for(const omega of [10,60,120]){
  const b=makePhysicsBody(0,0,.2);b.wy=omega;
  let t=0;while(isMoving(b)&&t<20){advance(b,1/240,1/240);t+=1/240;}
  const early=omega/alpha-t;
  cloth.push({family:'spin-stop-threshold',omega,idealStopS:omega/alpha,actualStopS:t,earlyStopS:early,
    passed:Math.abs(early)<=.45/alpha+1/240});
}

const reach=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);
function railCase({speed,deg,side,roll,impact,model,sign=1,dt=1/240}){
  const b=makePhysicsBody(0,-.4,sign*(WIDTH-reach-1e-6));
  const angle=deg*Math.PI/180;
  if(impact){
    b.vx=impact.vx;b.vz=sign*impact.vz;b.wx=sign*impact.wx;b.wz=impact.wz;b.wy=sign*impact.wy;
  }else{
    b.vx=speed*Math.sin(angle);b.vz=sign*speed*Math.cos(angle);
    b.wx=roll*b.vz/RADIUS;b.wz=-roll*b.vx/RADIUS;b.wy=sign*side*speed/RADIUS;
  }
  const initial=state(b),e0=energy(b);
  let hits=0,limits=0,immediate=null,peak=e0;
  advance(b,.08,dt,{cushionModel:model,
    onRailContact:(hit,_speed,time,kind)=>{
      hits++;if(!immediate)immediate={...state(hit),energyJ:energy(hit),kind};
      peak=Math.max(peak,energy(hit));
    },auditSample:()=>{peak=Math.max(peak,energy(b));},onEventLimit:()=>limits++
  });
  peak=Math.max(peak,energy(b));
  return {initial,immediate,final:state(b),energyInitialJ:e0,
    relativeEnergyGain:Math.max(0,(peak-e0)/e0),hits,eventLimits:limits,finite:finite(b)};
}
const conditions=[];
for(const speed of [.25,.5,1.2,2.3,4])for(const deg of [0,15,30,45,60,75,85])
 for(const side of [-2,-1,0,1,2])for(const roll of [-1,0,1,2])
  conditions.push({family:'prescribed-impact-state',speed,deg,side,roll});
const tips=[[0,0],[0,-.6],[0,.6],[-.6,0],[.6,0],[-.45,-.45],[-.45,.45],[.45,-.45],[.45,.45]];
for(const speed of [.5,1.2,2.3,4,8])for(const deg of [0,30,45,60,75,85])for(const [x,y] of tips){
  const a=deg*Math.PI/180,impact=getCueImpact({x:Math.sin(a),z:Math.cos(a)},speed,{x,y});
  if(impact.miscue)throw Error('Audit contains a miscued cue-generated state');
  conditions.push({family:'cue-generated',speed,deg,tip:{x,y},impact});
}
function auditRows(model){
 const rails=[];
for(const condition of conditions){
  const base=railCase({...condition,model}),mirror=railCase({...condition,model,sign:-1});
  const fine=railCase({...condition,model,dt:1/960});
  const x=base.final,y=mirror.final,z=fine.final;
  const symmetryError=Math.max(Math.abs(x.x-y.x),Math.abs(x.z+y.z),Math.abs(x.vx-y.vx),
    Math.abs(x.vz+y.vz),Math.abs(x.wx+y.wx),Math.abs(x.wy+y.wy),Math.abs(x.wz-y.wz));
  const positionDifferenceM=Math.hypot(x.x-z.x,x.z-z.z);
  const velocityDifferenceMps=Math.hypot(x.vx-z.vx,x.vz-z.vz);
  const spinDifferenceRadps=Math.hypot(x.wx-z.wx,x.wy-z.wy,x.wz-z.wz);
  const physicalConsistency=Boolean(base.immediate&&mirror.immediate&&fine.immediate)&&
    [base,mirror,fine].every(s=>s.finite&&s.eventLimits===0&&s.relativeEnergyGain<1e-6)&&symmetryError<1e-8;
  // Numerical engineering targets, NOT tolerances inferred from a real table.
  const convergence=positionDifferenceM<=.001&&velocityDifferenceMps<=.005&&spinDifferenceRadps<=.5;
  rails.push({condition,initial:base.initial,immediate:base.immediate,final:base.final,
    energyInitialJ:base.energyInitialJ,maxRelativeEnergyGain:Math.max(base.relativeEnergyGain,mirror.relativeEnergyGain,fine.relativeEnergyGain),
    residualIntoRailAt80ms:base.final.vz>1e-6,
    hits:base.hits,eventLimits:base.eventLimits+mirror.eventLimits+fine.eventLimits,symmetryError,
    positionDifferenceM,velocityDifferenceMps,spinDifferenceRadps,physicalConsistency,convergence});
 }

 return rails;
}
const max=(rows,key)=>Math.max(...rows.map(r=>r[key]));
function summarize(rows){return {
 conditions:rows.length,simulations:rows.length*3,
 consistencyFailures:rows.filter(x=>!x.physicalConsistency).length,
 convergenceFailures:rows.filter(x=>!x.convergence).length,
 residualContactFlags:rows.filter(x=>x.residualIntoRailAt80ms).map(x=>({condition:x.condition,normalVelocityMps:x.final.vz})),
 maxRelativeEnergyGain:max(rows,'maxRelativeEnergyGain'),maxSymmetryError:max(rows,'symmetryError'),
 maxPositionDifferenceM:max(rows,'positionDifferenceM'),maxVelocityDifferenceMps:max(rows,'velocityDifferenceMps'),
 maxSpinDifferenceRadps:max(rows,'spinDifferenceRadps')};}
const oldRows=auditRows('coupled-v021'),newRows=auditRows('coupled-v068');
const changed=[];
for(let i=0;i<oldRows.length;i++){
 const old=oldRows[i],next=newRows[i];
 const difference=Math.max(...['x','z','vx','vz','wx','wy','wz'].map(k=>Math.abs(old.final[k]-next.final[k])));
 if(difference>1e-10)changed.push({condition:old.condition,oldImmediate:old.immediate,newImmediate:next.immediate,
   oldFinal:old.final,newFinal:next.final});
}
const regression=compareCushionModels().publishedRegression;
const oldScore=regression.byModel['coupled-v021'],newScore=regression.byModel['coupled-v068'];
const oldSummary=summarize(oldRows),newSummary=summarize(newRows);
const indicativeRebound={source:'Alciatore HSV B.15 / TP B.6, approximate 50% after skid',
 status:'INDICATIVE_ONLY_NO_EXACT_TABLE_SPEED_PUBLISHED',diagnosticInputMps:1.6,
 oldRetainedPercent:100*measurePostSlideRailRebound(1.6,'pool','coupled-v021')/1.6,
 newRetainedPercent:100*measurePostSlideRailRebound(1.6,'pool','coupled-v068')/1.6};
const passed=cloth.every(x=>x.passed)&&newSummary.consistencyFailures===0&&newSummary.convergenceFailures===0&&
 newSummary.residualContactFlags.length===0&&newScore.rmsePoints<=oldScore.rmsePoints+1e-10;
const result={
 version:readFileSync(new URL('../VERSION',import.meta.url),'utf8').trim(),
 conclusion:passed?'NON_PENETRATION_IMPROVED_US_REGRESSION_UNCHANGED':'REQUIRES_REVIEW',
 experimentalValidation:'NO_NEW_INDEPENDENT_AMERICAN_POOL_SHOTS_WITH_SPIN',
 sources:{poolReference:'Nierhoff/Heunisch/Hirche TUM, 1217 impacts, already-used fitted regression WITHOUT sidespin',
  excludedNumericalTargets:['Mathavan 2009 snooker','Mathavan 2010 reproduced 52.5 mm / 140.6 g setup','Tailuge/Han carom'],
  originalPdfRechecked:false,rawIndependentMeasurements:0},
 parameters:{diameterMm:2*RADIUS*1000,massKg:PHYSICS.mass,profile:'pool',noseHeightM:NOSE_HEIGHT,
  slidingFriction:PHYSICS.slidingFriction,rollingFriction:PHYSICS.rollingFriction,
  spinningFriction:PHYSICS.spinningFriction,verticalSpinDecelRadS2:alpha,materialParametersRetuned:false},
 protocol:{prescribedConditions:700,cueGeneratedConditions:270,perModelSimulations:2910,
  observationTimeS:.08,coarseStepS:1/240,fineStepS:1/960,mirror:true,
  convergenceTargets:{positionM:.001,velocityMps:.005,spinRadps:.5}},
 cloth:{checks:cloth.length,passed:cloth.filter(x=>x.passed).length,rows:cloth},
 old:oldSummary,new:newSummary,
 changedConditions:changed.length,changedCueGeneratedConditions:changed.filter(x=>x.condition.family==='cue-generated').length,
 changed,indicativeNormalRebound:indicativeRebound,americanPoolRegression:{status:regression.status,componentCount:24,old:oldScore,new:newScore,
  rmseDeltaPoints:newScore.rmsePoints-oldScore.rmsePoints},
 limitations:['Fixed-height passive projection, not a measured cushion constitutive law',
  'No guarantee for airborne shots or all possible spins','Agreement with an in-sample regression is not independent realism validation']
};
const folder=new URL('../docs/data/',import.meta.url);mkdirSync(folder,{recursive:true});
const out=new URL('pool-v068-comparison.json',folder);writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({conclusion:result.conclusion,cloth:result.cloth.passed,
 old:oldSummary,new:newSummary,changed:changed.length,changedCueGenerated:result.changedCueGeneratedConditions,
 americanPoolRegression:result.americanPoolRegression,result:out.pathname},null,2));
process.exitCode=passed?0:1;
