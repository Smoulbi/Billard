// Model selection across the usable US reference corpus. No parameter fitting.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {CUSHION_MODELS,PHYSICS,RADIUS} from '../dist/physics.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {measureQualifiedPoolRebound} from '../dist/experimental.js';
import {compareCushionModels} from './compare-cushion-models.js';
import {auditModelRows,summarizeModel,runClothChecks} from './pool-audit-tools.js';
const stats=errors=>({count:errors.length,rmsePoints:Math.sqrt(errors.reduce((s,x)=>s+x*x,0)/errors.length),
 maePoints:errors.reduce((s,x)=>s+Math.abs(x),0)/errors.length,worstPoints:Math.max(...errors.map(Math.abs))});
const partitions={
 core:[.5,1.2,2.3].flatMap(incoming=>[30,45,60,75].map(angleDeg=>({incoming,angleDeg}))),
 normal:[.5,1.2,2.3].map(incoming=>({incoming,angleDeg:0})),
 interpolation:[.8,1.6,2].flatMap(incoming=>[20,40,55,70].map(angleDeg=>({incoming,angleDeg}))),
 additionalGrid:[.35,1,1.8,2.7].flatMap(incoming=>[10,25,50,65,80].map(angleDeg=>({incoming,angleDeg})))
};
export function scorePoolPartition(model,cases,step=.0001){
 const rows=[],unresolved=[];
 for(const c of cases){
  try{
   const measured=measureQualifiedPoolRebound({...c,cushionModel:model,step});
   if(Math.abs(measured.incident.speed-c.incoming)>1e-6)throw Error('Incident speed is not measured at the prescribed contact');
   const ref=poolRailReference(measured.incident.speed,measured.incident.angleRad);
   const errors=[100*(measured.postRollNormal/measured.incident.normal-ref.postRollNormalRatio)];
   if(c.angleDeg>0)errors.push(100*(measured.postRollTangent/measured.incident.tangent-ref.postRollTangentialRatio));
   rows.push({...c,measured,errors});
  }catch(e){unresolved.push({...c,message:e.message});}
 }
 return {step,statistics:rows.length?stats(rows.flatMap(r=>r.errors)):null,unresolved,rows};
}
const legacy=compareCushionModels().publishedRegression;
const models={};
for(const model of CUSHION_MODELS){
 const quantitative=Object.fromEntries(Object.entries(partitions).map(([name,cases])=>[name,scorePoolPartition(model,cases)]));
 const diagnostic=summarizeModel(auditModelRows(model));
 const cloth=runClothChecks(model);
 const typical=measureQualifiedPoolRebound({incoming:1.6,cushionModel:model});
 const eligible=cloth.every(c=>c.passed)&&diagnostic.consistencyFailures===0&&diagnostic.convergenceFailures===0&&
   diagnostic.residualContactFlags.length===0&&Object.values(quantitative).every(q=>q.unresolved.length===0);
 models[model]={eligible,quantitative,diagnostic,cloth:{passed:cloth.filter(x=>x.passed).length,count:cloth.length},
  indicativeNormalRebound:{retainedPercent:100*typical.postRollSpeed/typical.incident.speed,scored:false,
   note:'Alciatore approximate 50%: no exact speed/table attached, not a fitting target at 1.6 m/s'},
  legacyProtocol:legacy.byModel[model]};
}
const ranking=CUSHION_MODELS.filter(m=>models[m].eligible).sort((a,b)=>
 models[a].quantitative.core.statistics.rmsePoints-models[b].quantitative.core.statistics.rmsePoints);
const winner=ranking[0];
const primaryFamilies=['core','normal','interpolation'];
const dominatesPrimaryReferences=Boolean(winner)&&CUSHION_MODELS.every(m=>m===winner||primaryFamilies.every(p=>
 ['rmsePoints','maePoints','worstPoints'].every(k=>models[winner].quantitative[p].statistics[k]<=
 models[m].quantitative[p].statistics[k]+1e-10)));
const additionalGridCaveats=models[winner]?.quantitative.additionalGrid.rows.filter(row=>
 Math.max(...row.errors.map(Math.abs))>.05).map(row=>({incoming:row.incoming,angleDeg:row.angleDeg,errors:row.errors,
 note:'Disclose bounded-friction mismatch; this extra point is not an independent measured shot'}))??[];
const precisionControl=Object.fromEntries(['empirical','reference-v069'].map(m=>[m,
 [.0001,.00005,.000025].map(step=>scorePoolPartition(m,partitions.core,step).statistics)]));
const result={version:readFileSync(new URL('../VERSION',import.meta.url),'utf8').trim(),winner,ranking,dominatesPrimaryReferences,additionalGridCaveats,
 sourceEligibility:{scored:'TUM American pool published regression, used in model construction; NOT raw independent shots',
  excludedFromUSScore:['Mathavan snooker measurements','Han/Tailuge carom trajectories','PVC impact setup'],
  indicativeOnly:['Alciatore approximately 50% after-skid rebound; unspecified exact test conditions'],
  theoryChecks:['gliding/rolling mechanics','passive energy','geometric non-penetration','mirror symmetry'],
  independentUSSpinMeasurements:0,originalAcademicPdfRechecked:false},
 protocol:{initial:'Prescribed natural roll AT contact, checked against onBeforeRailContact',
  output:'First actual pure-rolling state after the impact; no small-slip proxy',step:.0001,
  interpolation:'Extra points on the SAME regression, NOT independent experimental holdout',
  minimumClaim:'Lowest score among the implemented candidates on this corpus, not a universal realism optimum',
  selection:'Physical gates, then lowest core RMSE; require dominance of RMSE/MAE/worst on core/normal/interpolation; additional grid disclosed separately',
  materialParametersRetuned:false,slidingFriction:PHYSICS.slidingFriction,rollingFriction:PHYSICS.rollingFriction,
  ballDiameterMm:2*RADIUS*1000,ballMassKg:PHYSICS.mass},models,precisionControl};
mkdirSync(new URL('../docs/data/',import.meta.url),{recursive:true});
const out=new URL('../docs/data/pool-model-selection-v069.json',import.meta.url);
writeFileSync(out,JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({winner,ranking,dominatesPrimaryReferences,additionalGridCaveats,byModel:Object.fromEntries(Object.entries(models).map(([m,r])=>[m,
 {eligible:r.eligible,core:r.quantitative.core.statistics,normal:r.quantitative.normal.statistics,
 interpolation:r.quantitative.interpolation.statistics,additionalGrid:r.quantitative.additionalGrid.statistics,
 unresolved:Object.values(r.quantitative).flatMap(q=>q.unresolved),residualContacts:r.diagnostic.residualContactFlags.length,
 consistencyFailures:r.diagnostic.consistencyFailures,convergenceFailures:r.diagnostic.convergenceFailures}])),
 precisionControl,report:out.pathname},null,2));
process.exitCode=winner==='reference-v069'&&dominatesPrimaryReferences?0:1;
