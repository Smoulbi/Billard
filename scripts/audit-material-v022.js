// Reproduce a MATERIAL, not rebound, source-based refinement of v0.22.
// Paper: Gismeros Moreno et al. (2022), Table 1, and Eq. (3.6).
// Never install the candidate into gameplay unless its validation gate passes.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {auditV022} from './audit-v022.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {PUBLISHED_MODULI_POOL_CONTACT,PUBLISHED_POOL_MATERIALS_2022,
  LITERATURE_POOL_CONTACT,TUM_POOL_CLOTH_SLIDING_2012,
  SIMULTANEOUS_POOL_CONTACT,measureSimultaneousPoolRebound}
  from '../dist/simultaneous-cushion.js';

// A research candidate is not necessarily better just because its total RMSE
// falls: check BOTH output components at every reference incidence and speed.
// These observations are values from the published TUM regression, NOT raw
// held-out experimental impacts. This is a no-regression gate, not validation.
export function comparePoolResearchVariants(baseline,trial){
  const rows=[];
  for(const incoming of [0.5,1.2,2.3])
    for(const angleDeg of [30,45,60,75]){
      const fit=poolRailReference(incoming,angleDeg*Math.PI/180);
      const old=measureSimultaneousPoolRebound({incoming,angleDeg,
        parameters:baseline});
      const next=measureSimultaneousPoolRebound({incoming,angleDeg,
        parameters:trial});
      for(const [component,expected,denom,key] of [
        ['normal',fit.postRollNormalRatio,old.incomingNormal,'postRollNormal'],
        ['tangent',fit.postRollTangentialRatio,old.incomingTangent,'postRollTangent']]){
        const before=100*(old[key]/denom-expected);
        const after=100*(next[key]/denom-expected);
        rows.push({incoming,angleDeg,component,
          baselineErrorPoints:before,trialErrorPoints:after,
          deltaAbsoluteErrorPoints:Math.abs(after)-Math.abs(before)});
      }
    }
  const rmse=list=>Math.sqrt(list.reduce((sum,x)=>sum+x*x,0)/list.length);
  const groupBy=key=>[...new Set(rows.map(x=>x[key]))].map(value=>{
    const group=rows.filter(x=>x[key]===value);
    return {value,
      baselineRmsePoints:rmse(group.map(x=>x.baselineErrorPoints)),
      trialRmsePoints:rmse(group.map(x=>x.trialErrorPoints)),
      noRegression:rmse(group.map(x=>x.trialErrorPoints))<=
        rmse(group.map(x=>x.baselineErrorPoints))+0.05};
  });
  const bySpeed=groupBy('incoming'),byAngle=groupBy('angleDeg');
  const byComponent=groupBy('component');
  const worsened=rows.filter(x=>x.deltaAbsoluteErrorPoints>0.05)
    .sort((a,b)=>b.deltaAbsoluteErrorPoints-a.deltaAbsoluteErrorPoints);
  return {
    baselineRmsePoints:rmse(rows.map(x=>x.baselineErrorPoints)),
    trialRmsePoints:rmse(rows.map(x=>x.trialErrorPoints)),
    worsenedCount:worsened.length,
    totalComponents:rows.length,
    worstDegradations:worsened.slice(0,8),
    bySpeed,byAngle,byComponent,
    noRegression:worsened.length===0&&
      [...bySpeed,...byAngle,...byComponent].every(x=>x.noRegression),
    source:'TUM published regression, NOT independent held-out data'
  };
}

export function auditMaterialV022(measurementPath){
  const exploratory=auditV022({measurementPath});
  const literature=auditV022({measurementPath,
    parameters:PUBLISHED_MODULI_POOL_CONTACT});
  const clothSource=auditV022({measurementPath,
    parameters:LITERATURE_POOL_CONTACT});
  const materialVsOriginal=comparePoolResearchVariants(
    SIMULTANEOUS_POOL_CONTACT,PUBLISHED_MODULI_POOL_CONTACT);
  const clothVsMaterial=comparePoolResearchVariants(
    PUBLISHED_MODULI_POOL_CONTACT,LITERATURE_POOL_CONTACT);
  return {
    source:PUBLISHED_POOL_MATERIALS_2022.source,
    elasticModuli:PUBLISHED_POOL_MATERIALS_2022,
    americanClothFriction:TUM_POOL_CLOTH_SLIDING_2012,
    scenarios:{
      originalV022:{rmsePoints:exploratory.regression.candidate.rmsePoints,
        worstPoints:exploratory.regression.candidate.worstPoints,
        status:exploratory.status},
      publishedElasticModuli:{
        railStiffness:PUBLISHED_MODULI_POOL_CONTACT.railStiffness,
        clothStiffness:PUBLISHED_MODULI_POOL_CONTACT.clothStiffness,
        rmsePoints:literature.regression.candidate.rmsePoints,
        worstPoints:literature.regression.candidate.worstPoints,
        status:literature.status,
        bySpeed:literature.regression.subgroups,
        independent:literature.independent},
      publishedClothLaws:{
        railStiffness:LITERATURE_POOL_CONTACT.railStiffness,
        clothStiffness:LITERATURE_POOL_CONTACT.clothStiffness,
        clothNormalLaw:LITERATURE_POOL_CONTACT.clothNormalLaw,
        clothFrictionLaw:LITERATURE_POOL_CONTACT.clothFrictionLaw,
        rmsePoints:clothSource.regression.candidate.rmsePoints,
        maePoints:clothSource.regression.candidate.maePoints,
        worstPoints:clothSource.regression.candidate.worstPoints,
        status:clothSource.status,
        bySpeed:clothSource.regression.subgroups,
        mostDegraded:clothSource.regression.mostDegraded,
        independent:clothSource.independent}
    },
    v021:{rmsePoints:literature.regression.baseline.rmsePoints,
      worstPoints:literature.regression.baseline.worstPoints},
    researchVariantComparisons:{materialVsOriginal,clothVsMaterial},
    activeModelChanged:false,
    caution:'Young moduli and Poisson ratios are generic literature assumptions. '+
      'TUM pool cloth friction is specific to its instrumented table and '+
      'is not independent of the TUM cushion fit used as benchmark. '+
      'Contact geometry, cushion restitution and friction are not identified '+
      'for an American K55/K66 rail; the TUM regression is not holdout data.'
  };
}

if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  console.log(JSON.stringify(auditMaterialV022(process.argv[2]),null,2));
