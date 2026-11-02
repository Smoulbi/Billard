// Gate new physical hypotheses against the SAME observable as v0.21.
// The TUM rows are values of a fitted regression, not raw validation shots.
// Optional: node scripts/audit-v022.js measurements.json
// An independent-data file follows compare-cushion-models.js's schema.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {measurePoolObliqueRailRebound} from '../dist/experimental.js';
import {measureSimultaneousPoolRebound,
  SIMULTANEOUS_POOL_CONTACT} from '../dist/simultaneous-cushion.js';
import {readMeasurements} from './compare-cushion-models.js';

const speeds=[0.5,1.2,2.3];
const angles=[30,45,60,75];
const published=speeds.flatMap(incoming=>angles.flatMap(angleDeg=>{
  const fit=poolRailReference(incoming,angleDeg*Math.PI/180);
  return [
    {incoming,angleDeg,component:'normal',
      observedPercent:fit.postRollNormalRatio*100},
    {incoming,angleDeg,component:'tangent',
      observedPercent:fit.postRollTangentialRatio*100}
  ];
}));

const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
function statistics(errors){
  return {count:errors.length,
    maePoints:mean(errors.map(Math.abs)),
    rmsePoints:Math.sqrt(mean(errors.map(x=>x*x))),
    worstPoints:Math.max(...errors.map(Math.abs)),
    biasPoints:mean(errors)};
}
function errorsFor(data,solver){
  const cache=new Map();
  return data.map(row=>{
    const key=`${row.incoming}:${row.angleDeg}`;
    if(!cache.has(key))cache.set(key,solver(row));
    const shot=cache.get(key);
    const ratio=row.component==='normal'?
      shot.postRollNormal/shot.incomingNormal:
      shot.postRollTangent/shot.incomingTangent;
    return 100*ratio-row.observedPercent;
  });
}
function compareRows(data,parameters){
  const old=errorsFor(data,row=>measurePoolObliqueRailRebound({
    incoming:row.incoming,angleDeg:row.angleDeg,cushionModel:'coupled-v021'
  }));
  const candidate=errorsFor(data,row=>measureSimultaneousPoolRebound({
    incoming:row.incoming,angleDeg:row.angleDeg,parameters
  }));
  const eps=0.05; // experimental fit predictions shown in percentage points
  const baseline=statistics(old),trial=statistics(candidate);
  const subgroups=[...new Set(data.map(r=>r.incoming))].map(speed=>{
    const indices=data.flatMap((row,i)=>row.incoming===speed?[i]:[]);
    const b=statistics(indices.map(i=>old[i]));
    const c=statistics(indices.map(i=>candidate[i]));
    return {incoming:speed,baseline:b,candidate:c,
      noRegression:c.rmsePoints<=b.rmsePoints+eps&&
        c.worstPoints<=b.worstPoints+eps};
  });
  return {baseline,candidate:trial,subgroups,
    noRegression:trial.maePoints<=baseline.maePoints+eps&&
      trial.rmsePoints<=baseline.rmsePoints+eps&&
      trial.worstPoints<=baseline.worstPoints+eps&&
      subgroups.every(g=>g.noRegression),
    mostDegraded:data.map((row,i)=>({incoming:row.incoming,
      angleDeg:row.angleDeg,component:row.component,
      baselineErrorPoints:old[i],candidateErrorPoints:candidate[i],
      regressionPoints:Math.abs(candidate[i])-Math.abs(old[i])}))
      .sort((a,b)=>b.regressionPoints-a.regressionPoints).slice(0,5)};
}

export function auditV022({measurementPath,parameters}={}){
  const regression=compareRows(published,parameters);
  const independent=measurementPath?readMeasurements(measurementPath):null;
  const independentComparison=independent?
    {table:independent.table,provenance:'USER-SUPPLIED, NOT VERIFIED',
      ...compareRows(independent.measurements,parameters)}:null;
  // A physically richer law does not get promoted merely because it has
  // fewer residuals against the same IN-SAMPLE regression as before.
  const status=!regression.noRegression?'REJECTED_REGRESSION':
    !independentComparison?'AWAITING_INDEPENDENT_POOL_MEASUREMENTS':
    !independentComparison.noRegression?'REJECTED_INDEPENDENT_MEASUREMENTS':
      'REQUIRES_HUMAN_PROVENANCE_AND_GENERALIZATION_REVIEW';
  return {model:'simultaneous rail + cloth 6-DOF research candidate',
    parameters:{...SIMULTANEOUS_POOL_CONTACT,...parameters},
    firstRollIntegrationLimitSeconds:parameters?.maxDuration??0.50,
    regression:{source:'Nierhoff/Heunisch/Hirche TUM (fit to 1,217 American-pool impacts)',
      status:'IN_SAMPLE REGRESSION, NOT INDEPENDENT VALIDATION',
      ...regression},independent:independentComparison,status,
    activeModelChanged:false,
    qualification:'The default pool model and v0.21 have not been modified. ' +
      'Any promotion requires independent shot measurements and documented provenance.'};
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
  const result=auditV022({measurementPath:process.argv[2]});
  console.log(JSON.stringify(result,null,2));
}
