// Research-only search. TUM regressions are the TRAINING REFERENCE and the
// middle speed is only an internal interpolation check, NOT independent data.
// No file is written by this script; explicit acceptance is required.
import {measurePoolObliqueRailRebound} from '../dist/experimental.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {COUPLED_POOL_RAIL} from '../dist/coupled-cushion.js';
import {COMPLIANT_POOL_RAIL_TUNED} from '../dist/compliant-cushion.js';

let seed=871623;
function random() {seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
const angles=[30,45,60,75],speeds=[0.5,1.2,2.3];
const refs=speeds.flatMap(speed=>angles.map(angle=>({
  speed,angle,reference:poolRailReference(speed,angle*Math.PI/180)
})));
const origin={...COUPLED_POOL_RAIL,
  staticFriction:COMPLIANT_POOL_RAIL_TUNED.staticFriction,
  dynamicFriction:COMPLIANT_POOL_RAIL_TUNED.dynamicFriction,
  velocityFrictionGain:0,velocityFrictionScale:1};
function evaluate(p) {
  const param={...origin,...p};
  const errors=refs.map(({speed,angle,reference})=>{
    const x=measurePoolObliqueRailRebound({incoming:speed,angleDeg:angle,
      cushionModel:'coupled-3d',cushionParameters:param});
    const en=100*x.postRollNormal/x.incomingNormal-100*reference.postRollNormalRatio;
    const et=100*x.postRollTangent/x.incomingTangent-100*reference.postRollTangentialRatio;
    return {speed,angle,en,et};
  });
  const rmse=rows=>Math.sqrt(rows.reduce((s,x)=>s+x.en*x.en+x.et*x.et,0)/rows.length/2);
  return {train:rmse(errors.filter(x=>x.speed!==1.2)),
    interpolation:rmse(errors.filter(x=>x.speed===1.2)),
    all:rmse(errors),errors};
}
let best={p:{dynamicFriction:origin.dynamicFriction,
  staticFriction:origin.staticFriction,
  velocityFrictionGain:0,velocityFrictionScale:1},
  ...evaluate(origin)};
const baseline={train:best.train,interpolation:best.interpolation,all:best.all};
const accepted={staticFriction:COUPLED_POOL_RAIL.staticFriction,
  dynamicFriction:COUPLED_POOL_RAIL.dynamicFriction,
  velocityFrictionGain:COUPLED_POOL_RAIL.velocityFrictionGain,
  velocityFrictionScale:COUPLED_POOL_RAIL.velocityFrictionScale};
for(let i=0;i<10000;i++) {
  const p=i<7000?{
    dynamicFriction:0.12+random()*0.28,
    staticFriction:0.12+random()*0.48,
    velocityFrictionGain:random()*0.45,
    velocityFrictionScale:0.3+random()*2.2
  }:{
    dynamicFriction:Math.max(0.12,Math.min(0.4,best.p.dynamicFriction+(random()-0.5)*0.08)),
    staticFriction:Math.max(0.12,Math.min(0.6,best.p.staticFriction+(random()-0.5)*0.08)),
    velocityFrictionGain:Math.max(0,Math.min(0.45,best.p.velocityFrictionGain+(random()-0.5)*0.10)),
    velocityFrictionScale:Math.max(0.3,Math.min(2.5,best.p.velocityFrictionScale+(random()-0.5)*0.35))
  };
  if(p.staticFriction<p.dynamicFriction)continue;
  const r=evaluate(p);
  if(r.train<best.train)best={p,...r};
}
console.log(JSON.stringify({baseline,accepted:{parameters:accepted,...evaluate(accepted)},
  best:{parameters:best.p,train:best.train,
  interpolation:best.interpolation,all:best.all,errors:best.errors}},null,2));
