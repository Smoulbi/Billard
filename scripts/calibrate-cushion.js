// Deterministic, reproducible parameter identification for FRAME's experimental
// American-pool cushion. The TUM targets are predictions from a published fit,
// not independently measured samples at these exact coordinates.
// Run: node scripts/calibrate-cushion.js
import {performance} from 'node:perf_hooks';
import {COMPLIANT_POOL_RAIL} from '../dist/compliant-cushion.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {measurePoolObliqueRailRebound} from '../dist/experimental.js';

const train=[0.5,2.3].flatMap(incoming=>[30,45,60,75].map(angleDeg=>({incoming,angleDeg})));
const heldOut=[30,45,60,75].map(angleDeg=>({incoming:1.2,angleDeg}));
const interpolated=[0.8,1.6,2.0].flatMap(incoming=>[20,40,55,70]
  .map(angleDeg=>({incoming,angleDeg})));
// All constraints are engineering bounds, not K55/K66 measured ranges.
const bounds=[[0.15,0.70],[0,0.25],[0.6,4.0],[0,0.5]];
const parameterNames=['dynamicFriction','staticGap','tangentToNormalFrequency','tangentDampingRatio'];
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));

function toParameters(x) {
  return {...COMPLIANT_POOL_RAIL,
    dynamicFriction:x[0],staticFriction:x[0]+x[1],
    tangentToNormalFrequency:x[2],tangentDampingRatio:x[3]};
}

function target(test) {
  const fit=poolRailReference(test.incoming,test.angleDeg*Math.PI/180);
  return 100*fit.postRollTangentialRatio;
}
function predicted(test,parameters) {
  const b=measurePoolObliqueRailRebound({...test,cushionModel:'compliant',cushionParameters:parameters});
  return 100*b.postRollTangent/b.incomingTangent;
}
function errors(cases,parameters) {
  return cases.map(test=>predicted(test,parameters)-target(test));
}
function metrics(cases,parameters) {
  const residuals=errors(cases,parameters);
  return {rmse:Math.sqrt(residuals.reduce((sum,v)=>sum+v*v,0)/residuals.length),
    mae:residuals.reduce((sum,v)=>sum+Math.abs(v),0)/residuals.length,
    max:Math.max(...residuals.map(Math.abs))};
}
const score=x=>{const r=errors(train,toParameters(x));return r.reduce((s,v)=>s+v*v,0)/r.length;};

function refine(initial) {
  let x=[...initial],best=score(x);
  const span=bounds.map(([lo,hi])=>hi-lo);
  let step=span.map(s=>s*0.20);
  // Deterministic pattern search handles stick/slip discontinuities without
  // assuming differentiability of the impact law.
  while(Math.max(...step.map((s,i)=>s/span[i]))>0.00012) {
    let next=null,lowest=best;
    for(let j=0;j<4;j++)for(const sign of [-1,1]) {
      const t=[...x];t[j]=clamp(x[j]+sign*step[j],...bounds[j]);
      if(t[j]===x[j])continue;
      const candidate=score(t);
      if(candidate<lowest-1e-10){lowest=candidate;next=t;}
    }
    if(next){x=next;best=lowest;} else step=step.map(s=>s*0.5);
  }
  return {x,score:best};
}

let seed=20261031;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const initial=[COMPLIANT_POOL_RAIL.dynamicFriction,
  COMPLIANT_POOL_RAIL.staticFriction-COMPLIANT_POOL_RAIL.dynamicFriction,
  COMPLIANT_POOL_RAIL.tangentToNormalFrequency,COMPLIANT_POOL_RAIL.tangentDampingRatio];
const started=performance.now();
const samples=[{x:initial,score:score(initial)}];
for(let i=0;i<1500;i++) {
  const x=bounds.map(([lo,hi])=>lo+(hi-lo)*random());
  samples.push({x,score:score(x)});
}
samples.sort((a,b)=>a.score-b.score);
function differentialEvolution() {
  const size=64, population=samples.slice(0,size).map(s=>({...s,x:[...s.x]}));
  // Mixed initial population: good random samples and enough broad coverage
  // to escape narrow, discontinuous stick/slip basins.
  for(let i=size/2;i<size;i++) {
    const x=bounds.map(([lo,hi])=>lo+(hi-lo)*random());
    population[i]={x,score:score(x)};
  }
  for(let generation=0;generation<180;generation++) {
    for(let i=0;i<size;i++) {
      let a,b,c;
      do{a=Math.floor(random()*size);}while(a===i);
      do{b=Math.floor(random()*size);}while(b===i||b===a);
      do{c=Math.floor(random()*size);}while(c===i||c===a||c===b);
      const force=0.55+0.25*random(),jForce=Math.floor(random()*4);
      const next=population[i].x.map((value,j)=>
        (j===jForce||random()<0.82)?clamp(population[a].x[j]+force*
          (population[b].x[j]-population[c].x[j]),...bounds[j]):value);
      const s=score(next);
      if(s<population[i].score)population[i]={x:next,score:s};
    }
  }
  population.sort((a,b)=>a.score-b.score);
  return population.slice(0,8).map(x=>refine(x.x));
}
const candidates=[refine(initial),...samples.slice(0,12).map(s=>refine(s.x)),
  ...differentialEvolution()];
candidates.sort((a,b)=>a.score-b.score);
const best=candidates[0],parameters=toParameters(best.x);
const baseline=toParameters(initial);

console.log(JSON.stringify({
  source:'TUM pooled American-pool regression, not independent validation',
  method:'seeded 1500 random starts + bounded pattern search + 180-generation differential evolution',
  seed:20261031,
  bounds:Object.fromEntries(parameterNames.map((name,i)=>[name,bounds[i]])),
  parameters:{dynamicFriction:parameters.dynamicFriction,
    staticFriction:parameters.staticFriction,
    tangentToNormalFrequency:parameters.tangentToNormalFrequency,
    tangentDampingRatio:parameters.tangentDampingRatio},
  baseline:{training:metrics(train,baseline),heldOut:metrics(heldOut,baseline),
    interpolated:metrics(interpolated,baseline)},
  optimized:{training:metrics(train,parameters),heldOut:metrics(heldOut,parameters),
    interpolated:metrics(interpolated,parameters)},
  residuals:[...train,...heldOut].map(t=>({...t,target:target(t),
    baseline:predicted(t,baseline),optimized:predicted(t,parameters)})),
  sensitivity:Object.fromEntries(['dynamicFriction','staticFriction',
    'tangentToNormalFrequency','tangentDampingRatio'].map(key=>{
    const delta=0.10*baseline[key];
    return [key,[-1,1].map(sign=>{
      const p={...baseline,[key]:baseline[key]+sign*delta};
      if(p.staticFriction<p.dynamicFriction)return null;
      const d=errors(train,p),base=errors(train,baseline);
      return {changePercent:sign*10,meanAbsoluteObservableChange:
        d.reduce((sum,v,i)=>sum+Math.abs(v-base[i]),0)/d.length};
    })];
  })),
  elapsedSeconds:(performance.now()-started)/1000
},null,2));
