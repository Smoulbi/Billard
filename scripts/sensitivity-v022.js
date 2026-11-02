// Research-only parameter sensitivity against the TUM fitted regression.
// THIS IS NOT IDENTIFICATION OF K55/K66 MATERIAL CONSTANTS. Rankings below
// are in-sample diagnostics and must not modify production physics.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {measureSimultaneousPoolRebound} from '../dist/simultaneous-cushion.js';
const speeds=[0.5,1.2,2.3],angles=[30,45,60,75];

export function sensitivityV022(){
  const variations=[];
  for(const railStiffness of [5e7,1e8,2e8])
    for(const railRestitution of [0.75,0.85,0.95])
      for(const railFriction of [0.05,0.15,0.30]){
        const parameters={railStiffness,railRestitution,railFriction};
        const residuals=[];
        let unresolved=null;
        shots: for(const incoming of speeds)for(const angleDeg of angles){
          const ref=poolRailReference(incoming,angleDeg*Math.PI/180);
          let b;
          try{b=measureSimultaneousPoolRebound({incoming,angleDeg,parameters});}
          catch(e){unresolved={incoming,angleDeg,reason:e.message};break shots;}
          residuals.push(100*(b.postRollNormal/b.incomingNormal-ref.postRollNormalRatio));
          residuals.push(100*(b.postRollTangent/b.incomingTangent-ref.postRollTangentialRatio));
        }
        if(unresolved){variations.push({parameters,unresolved});continue;}
        const mae=residuals.reduce((s,e)=>s+Math.abs(e),0)/residuals.length;
        const rmse=Math.sqrt(residuals.reduce((s,e)=>s+e*e,0)/residuals.length);
        const worst=Math.max(...residuals.map(Math.abs));
        variations.push({parameters,maePoints:mae,rmsePoints:rmse,worstPoints:worst});
      }
  const resolved=variations.filter(v=>!v.unresolved);
  const failed=variations.filter(v=>v.unresolved);
  resolved.sort((a,b)=>a.rmsePoints-b.rmsePoints);
  return {status:'SENSITIVITY_ONLY_NOT_MATERIAL_IDENTIFICATION',
    note:'No independent data; relative ranking is in-sample, not a fitted rubber specification.',
    count:variations.length,resolvedCount:resolved.length,unresolved:failed,
    bestRegressionScenarios:resolved.slice(0,8),
    worstRegressionScenario:resolved.at(-1)};
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url)
  console.log(JSON.stringify(sensitivityV022(),null,2));
