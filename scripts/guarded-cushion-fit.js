// Conservative, local identification around FRAME v0.18's four tangent
// parameters. All comparison points derive from the SAME published TUM fit:
// the partitions test numerical interpolation, not experimental independence.
// Run: node scripts/guarded-cushion-fit.js
import {performance} from 'node:perf_hooks';
import {COMPLIANT_POOL_RAIL as BASE} from '../dist/compliant-cushion.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {measurePoolObliqueRailRebound} from '../dist/experimental.js';

const training=[0.5,2.3].flatMap(incoming=>[30,45,60,75].map(angleDeg=>({incoming,angleDeg})));
const control=[30,45,60,75].map(angleDeg=>({incoming:1.2,angleDeg}));
const interpolation=[0.8,1.6,2].flatMap(incoming=>[20,40,55,70].map(angleDeg=>({incoming,angleDeg})));
const tests=[training,control,interpolation];
const expected=[...tests.flat()].map(t=>100*poolRailReference(t.incoming,t.angleDeg*Math.PI/180).postRollTangentialRatio);
const n=[training.length,control.length,interpolation.length];

function allResiduals(parameters) {
  return [...tests.flat()].map((t,i)=>{
    const b=measurePoolObliqueRailRebound({...t,cushionModel:'compliant',cushionParameters:parameters});
    return 100*b.postRollTangent/b.incomingTangent-expected[i];
  });
}
function splitMetrics(residuals) {
  let offset=0;
  return n.map(count=>{
    const d=residuals.slice(offset,offset+count);offset+=count;
    return {rmse:Math.sqrt(d.reduce((s,v)=>s+v*v,0)/d.length),
      mae:d.reduce((s,v)=>s+Math.abs(v),0)/d.length,
      max:Math.max(...d.map(Math.abs))};
  });
}
const baseline=splitMetrics(allResiduals(BASE));
let seed=472931;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const started=performance.now();
let candidates=0,qualified=0,best=null;

for(let i=0;i<16000;i++) {
  // Restrict all values to near the original physically motivated hypothesis.
  const dynamicFriction=0.16+0.14*random();
  const tangentToNormalFrequency=1.35+0.95*random();
  const tangentDampingRatio=0.025+0.15*random();
  const staticFriction=dynamicFriction+0.005+0.14*random();
  const parameters={...BASE,dynamicFriction,staticFriction,
    tangentToNormalFrequency,tangentDampingRatio};
  // Staged gates avoid wasting work on parameters that overfit one speed.
  const trainResiduals=training.map(t=>{
    const b=measurePoolObliqueRailRebound({...t,cushionModel:'compliant',cushionParameters:parameters});
    return 100*b.postRollTangent/b.incomingTangent-
      100*poolRailReference(t.incoming,t.angleDeg*Math.PI/180).postRollTangentialRatio;
  });
  const trainError=Math.sqrt(trainResiduals.reduce((s,v)=>s+v*v,0)/trainResiduals.length);
  if(trainError>=baseline[0].rmse)continue;
  candidates++;
  const residuals=allResiduals(parameters);
  const measured=splitMetrics(residuals);
  if(measured.some((m,i)=>m.rmse>=baseline[i].rmse))continue;
  const maxError=Math.max(...measured.map(m=>m.max));
  const baselineMax=Math.max(...baseline.map(m=>m.max));
  if(maxError>baselineMax)continue;
  qualified++;
  const score=measured.reduce((s,m,i)=>s+m.rmse/baseline[i].rmse,0);
  if(!best||score<best.score)best={score,parameters:{dynamicFriction,staticFriction,
    tangentToNormalFrequency,tangentDampingRatio},metrics:measured};
}
console.log(JSON.stringify({method:'constrained 16 000 draws around v0.18; require all 3 split RMSE and worst-case residual not to worsen',
  caveat:'all splits derived from the same TUM regression; NOT independent measurements',
  sampleSeed:472931,baseline:baseline.map((m,i)=>({partition:['training','speed-control','interpolation'][i],...m})),
  candidatesWithTrainingGain:candidates,qualified,best,elapsedSeconds:(performance.now()-started)/1000},null,2));
