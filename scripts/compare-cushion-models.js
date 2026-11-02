// Published-fit scores and OPTIONAL independent table measurements.
// Usage: node scripts/compare-cushion-models.js [measurements.json]
// Raw TUM shots are not embedded; their published regression is NOT a holdout.
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {CUSHION_MODELS} from '../dist/physics.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {measurePoolObliqueRailRebound} from '../dist/experimental.js';

const speeds=[0.5,1.2,2.3],angles=[30,45,60,75];
const experiments=speeds.flatMap(incoming=>angles.flatMap(angleDeg=>
  ['normal','tangent'].map(component=>{
    const ref=poolRailReference(incoming,angleDeg*Math.PI/180);
    return {incoming,angleDeg,component,
      observedPercent:100*(component==='normal'?
        ref.postRollNormalRatio:ref.postRollTangentialRatio)};
  })));

export function readMeasurements(path) {
  if(!path)return null;
  const input=JSON.parse(readFileSync(path,'utf8'));
  if(typeof input!=='object'||!Array.isArray(input.measurements)||
    !input.table||typeof input.table!=='string')
    throw new Error('Le JSON doit contenir table (identifiant de table) et measurements (tableau).');
  const validated=input.measurements.map((row,i)=>{
    for(const name of ['incoming','angleDeg','observedPercent'])
      if(!Number.isFinite(row[name]))throw new Error(`Mesure ${i}: ${name} doit être fini.`);
    if(row.incoming<0.1||row.incoming>5||row.angleDeg<5||row.angleDeg>80||
      !['normal','tangent'].includes(row.component)||
      row.observedPercent<-200||row.observedPercent>250)
      throw new Error(`Mesure ${i}: condition hors du domaine d'évaluation.`);
    if(!row.shotId||typeof row.shotId!=='string')
      throw new Error(`Mesure ${i}: shotId obligatoire (répétition identifiée).`);
    return row;
  });
  if(!validated.length)throw new Error('Aucune mesure réelle fournie.');
  // A single physical shot may supply BOTH normal and tangential components.
  // It must not supply the same component twice or contradict its conditions.
  const seen=new Set(),conditions=new Map();
  for(const row of validated){
    const key=`${row.shotId}:${row.component}`;
    if(seen.has(key))throw new Error('shotId/composante dupliqué.');
    seen.add(key);
    const condition=`${row.incoming}:${row.angleDeg}`;
    if(conditions.has(row.shotId)&&conditions.get(row.shotId)!==condition)
      throw new Error('Conditions contradictoires pour un même tir.');
    conditions.set(row.shotId,condition);
  }
  return {table:input.table,measurements:validated};
}

const mean=values=>values.reduce((s,n)=>s+n,0)/values.length;
function evaluate(data,model) {
  const cache=new Map();
  const errors=data.map(row=>{
    const key=`${row.incoming}-${row.angleDeg}`;
    if(!cache.has(key))cache.set(key,measurePoolObliqueRailRebound({
      incoming:row.incoming,angleDeg:row.angleDeg,cushionModel:model
    }));
    const result=cache.get(key);
    const simulated=100*(row.component==='normal'?
      result.postRollNormal/result.incomingNormal:
      result.postRollTangent/result.incomingTangent);
    return simulated-row.observedPercent;
  });
  return {count:errors.length,maePoints:mean(errors.map(Math.abs)),
    rmsePoints:Math.sqrt(mean(errors.map(e=>e*e))),
    biasPoints:mean(errors)};
}

export function compareCushionModels(inputPath) {
  const observed=readMeasurements(inputPath);
  const summary={
    publishedRegression:{source:'Nierhoff/Heunisch/Hirche TUM, 1217 pool impacts (fitted regression)',
      status:'IN_SAMPLE: empirically inverse-identified v0.17; NOT independent validation',
      byModel:Object.fromEntries(CUSHION_MODELS.map(m=>[m,evaluate(experiments,m)]))}
  };
  if(observed)summary.independentTable={table:observed.table,
    status:'USER-SUPPLIED: independence must be established from acquisition provenance',
    byModel:Object.fromEntries(CUSHION_MODELS.map(m=>[
      m,evaluate(observed.measurements,m)]))};
  return summary;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  console.log(JSON.stringify(compareCushionModels(process.argv[2]),null,2));
