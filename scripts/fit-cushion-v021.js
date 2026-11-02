// Deterministic, bounded experiment; TUM-derived REGRESSION points, not raw
// measurements. Withhold speed 1.2 m/s until AFTER parameter search.
// A lower training residual cannot establish independent physical accuracy.
import {measurePoolObliqueRailRebound} from '../dist/experimental.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {COUPLED_POOL_RAIL} from '../dist/coupled-cushion.js';

const angles=[30,45,60,75];
const bounds=[
  [0.105,0.15], // dynamicFriction at zero slip (effective, not measured)
  [0,0.06],     // static minus dynamic friction
  [0.35,0.60],  // velocityFrictionGain (effective, not measured)
  [1.3,2.1],    // velocityFrictionScale, m/s
  [1.4,2.8],    // smooth shape exponent
  [1.6,2.1],    // tangential/normal frequency ratio
  [0.015,0.05], // tangential damping ratio
  [0.7,1.4]     // vertical/horizontal shear stiffness ratio
];
const variableNames=['dynamicFriction','staticFrictionMargin',
  'velocityFrictionGain','velocityFrictionScale','velocityFrictionExponent',
  'tangentToNormalFrequency','tangentDampingRatio',
  'verticalToHorizontalStiffness'];
const base=[COUPLED_POOL_RAIL.dynamicFriction,
  COUPLED_POOL_RAIL.staticFriction-COUPLED_POOL_RAIL.dynamicFriction,
  COUPLED_POOL_RAIL.velocityFrictionGain,COUPLED_POOL_RAIL.velocityFrictionScale,
  COUPLED_POOL_RAIL.velocityFrictionExponent??2,
  COUPLED_POOL_RAIL.tangentToNormalFrequency,
  COUPLED_POOL_RAIL.tangentDampingRatio,
  COUPLED_POOL_RAIL.verticalToHorizontalStiffness];
const references=new Map();
for(const speed of [0.5,1.2,2.3])for(const angle of angles)
  references.set(`${speed}/${angle}`,
    poolRailReference(speed,angle*Math.PI/180));

function parameters(x) {
  return {...COUPLED_POOL_RAIL,
    dynamicFriction:x[0],staticFriction:x[0]+x[1],
    velocityFrictionGain:x[2],velocityFrictionScale:x[3],
    velocityFrictionExponent:x[4],tangentToNormalFrequency:x[5],
    tangentDampingRatio:x[6],verticalToHorizontalStiffness:x[7]};
}
function evaluate(x,speeds) {
  const p=parameters(x);
  const records=[];
  for(const incoming of speeds)for(const angleDeg of angles) {
    const measured=measurePoolObliqueRailRebound({incoming,angleDeg,
      cushionModel:'coupled-3d',cushionParameters:p});
    const published=references.get(`${incoming}/${angleDeg}`);
    const n=100*(measured.postRollNormal/measured.incomingNormal-
      published.postRollNormalRatio);
    const t=100*(measured.postRollTangent/measured.incomingTangent-
      published.postRollTangentialRatio);
    records.push({speed:incoming,angle:angleDeg,n,t});
  }
  const squares=records.flatMap(r=>[r.n*r.n,r.t*r.t]);
  const abs=records.flatMap(r=>[Math.abs(r.n),Math.abs(r.t)]);
  const rmse=Math.sqrt(squares.reduce((a,b)=>a+b,0)/squares.length);
  return {rmse,mae:abs.reduce((a,b)=>a+b,0)/abs.length,
    worst:Math.max(...abs),records,
    // Protect against a fit that improves aggregate RMSE by sacrificing a
    // single grazing-angle rebound. This is a training loss, not validation.
    loss:rmse**2+0.12*Math.max(...abs)**2};
}

let seed=287651;
const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const population=[base];
for(let i=1;i<42;i++)
  population.push(bounds.map(([lo,hi])=>lo+random()*(hi-lo)));
const scores=population.map(v=>evaluate(v,[0.5,2.3]));
for(let gen=0;gen<220;gen++)for(let i=0;i<population.length;i++) {
  let a,b,c;
  do{a=Math.floor(random()*population.length);}while(a===i);
  do{b=Math.floor(random()*population.length);}while(b===i||b===a);
  do{c=Math.floor(random()*population.length);}while(c===i||c===a||c===b);
  const mutation=0.68;
  const pivot=Math.floor(random()*bounds.length);
  const trial=population[i].map((val,k)=>{
    if(random()>=0.82&&k!==pivot)return val;
    return clamp(population[a][k]+mutation*(population[b][k]-population[c][k]),
      bounds[k][0],bounds[k][1]);
  });
  const result=evaluate(trial,[0.5,2.3]);
  if(result.loss<scores[i].loss) {
    population[i]=trial;scores[i]=result;
  }
}
const bestIndex=scores.reduce((best,item,i)=>item.loss<scores[best].loss?i:best,0);
const summarize=({rmse,mae,worst,loss})=>({rmse,mae,worst,loss});
const print=(x)=>({parameters:parameters(x),
  training:summarize(evaluate(x,[0.5,2.3])),
  withheldInterpolation:summarize(evaluate(x,[1.2])),
  all:summarize(evaluate(x,[0.5,1.2,2.3]))});
console.log(JSON.stringify({
  warning:'TUM regression only; withheld 1.2 m/s still same fitted regression, NOT independent validation',
  trainingSpeed:[0.5,2.3],withheldSpeed:1.2,
  search:{population:42,generations:220,bounds:Object.fromEntries(
    variableNames.map((name,i)=>[name,bounds[i]]))},
  baseline:print(base),best:print(population[bestIndex])
},null,2));
