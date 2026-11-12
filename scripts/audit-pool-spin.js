// Numerical diagnostics of spin extrapolation; no independent experimental score.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {PHYSICS,RADIUS,WIDTH,LENGTH,NOSE_HEIGHT,makePhysicsBody,simulatePhysics} from '../dist/physics.js';
export const MODEL='reference-v069';
const reach=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);
const keys=['x','z','vx','vz','wx','wy','wz'];
export const CONDITIONS=Object.freeze([.5,1.2,2.3].flatMap(speed=>[0,30,60,75].flatMap(angleDeg=>[-1,0,1].map(side=>Object.freeze({speed,angleDeg,side})))));
export function totalEnergy(b){return .5*PHYSICS.mass*(b.vx**2+b.vz**2)+.2*PHYSICS.mass*RADIUS**2*(b.wx**2+b.wy**2+b.wz**2);}
function transform(b,frame,inverse=false){
 const v={...b};
 if(frame==='mirror')for(const k of ['z','vz','wx','wy'])v[k]=-b[k];
 if(frame==='rotated'){
  const sign=inverse?-1:1;
  for(const [x,z] of [['x','z'],['vx','vz'],['wx','wz']]){v[x]=sign*b[z];v[z]=-sign*b[x];}
  if(inverse)v.z-=LENGTH-WIDTH;
 }
 return v;
}
function snapshot(b,timeS,frame){
 const local=transform(b,frame,true);
 return {timeS,world:Object.fromEntries(keys.map(k=>[k,b[k]])),
  local:Object.fromEntries(keys.map(k=>[k,local[k]])),state:b.state,active:b.active,
  normalMps:-local.vz,tangentMps:local.vx,
  angleFromOutwardNormalDeg:Math.atan2(local.vx,-local.vz)*180/Math.PI,
  rubberTangentialSlipMps:local.vx+reach*local.wy-(NOSE_HEIGHT-RADIUS)*local.wz,
  slipMps:Math.hypot(b.vx+RADIUS*b.wz,b.vz-RADIUS*b.wx),energyJ:totalEnergy(b)};
}
export function measureSpinRebound(condition,{step=.0001,frame='base',model=MODEL,maxTimeS=2}={}){
 const {speed,angleDeg,side}=condition;
 if(!Number.isFinite(speed)||speed<=0||!Number.isFinite(angleDeg)||angleDeg<0||angleDeg>=85||!Number.isFinite(side)||!Number.isFinite(step)||step<=0||step>.001||!Number.isFinite(maxTimeS)||maxTimeS<=0||!['base','mirror','rotated'].includes(frame))throw new RangeError('Invalid spin-audit condition');
 const a=angleDeg*Math.PI/180;
 let b=makePhysicsBody(0,-.4,WIDTH-reach);
 b.vx=speed*Math.sin(a);b.vz=speed*Math.cos(a);b.wx=b.vz/RADIUS;b.wz=-b.vx/RADIUS;b.wy=side*speed/RADIUS;
 b=transform(b,frame);
 if(frame==='rotated')b.x=LENGTH-reach; // Corresponding short rail, not a rotation of the rectangular table.
 const balls=[b],initial=snapshot(b,0,frame),failures=[];
 let incident=null,immediate=null,firstRoll=null,contacts=0,eventLimits=0,pockets=0,peakEnergyJ=initial.energyJ,maxPenetrationM=0,minSeparationMps=Infinity;
 let time=0;
 const observe=()=>{
  if(!keys.every(k=>Number.isFinite(b[k])))failures.push('non-finite-state');
  peakEnergyJ=Math.max(peakEnergyJ,totalEnergy(b));
  const penetration=frame==='rotated'?b.x-(LENGTH-reach):Math.abs(b.z)-(WIDTH-reach);
  maxPenetrationM=Math.max(maxPenetrationM,penetration);
 };
 while(time<maxTimeS-1e-12&&!failures.length){
  const h=Math.min(step,maxTimeS-time);
  simulatePhysics(balls,h,{cushionProfile:'pool',cushionModel:model,
   onBeforeRailContact:(hit,t,kind)=>{if(!incident)incident={...snapshot(hit,time+t,frame),angleFromIncomingNormalDeg:Math.atan2(Math.abs(transform(hit,frame,true).vx),Math.abs(transform(hit,frame,true).vz))*180/Math.PI,kind};observe();},
   onRailContact:(hit,_v,t,kind)=>{contacts++;if(!immediate)immediate={...snapshot(hit,time+t,frame),kind};observe();minSeparationMps=Math.min(minSeparationMps,snapshot(hit,time+t,frame).normalMps);},
   onEventLimit:()=>eventLimits++,onPocket:()=>pockets++});
  time+=h;observe();
  if(contacts>1)failures.push('multiple-contacts');
  if(eventLimits)failures.push('event-limit');
  if(pockets||!b.active)failures.push('pocket-or-inactive');
  if(immediate&&b.state==='rolling'&&snapshot(b,time,frame).slipMps<1e-8){firstRoll={...snapshot(b,time,frame),samplingUncertaintyS:step};break;}
 }
 if(!incident||!immediate)failures.push('missing-contact');
 if(!firstRoll)failures.push('first-roll-unresolved');
 if(incident&&incident.kind!=='rail'||immediate&&immediate.kind!=='rail')failures.push('unexpected-facing');
 const relativeEnergyGain=Math.max(0,peakEnergyJ/initial.energyJ-1);
 if(relativeEnergyGain>1e-6)failures.push('energy-gain');
 if(maxPenetrationM>1e-7)failures.push('penetration');
 if(minSeparationMps< -1e-7)failures.push('immediate-inward-velocity');
 if(incident){const q=incident.local,expected={vx:speed*Math.sin(a),vz:speed*Math.cos(a),wx:speed*Math.cos(a)/RADIUS,wz:-speed*Math.sin(a)/RADIUS,wy:side*speed/RADIUS};if(Object.entries(expected).some(([k,v])=>Math.abs(q[k]-v)>1e-6)||Math.abs(incident.angleFromIncomingNormalDeg-angleDeg)>1e-6)failures.push('incident-state-mismatch');}
 return {condition,model,step,frame,initial,incident,immediate,firstRoll,final:snapshot(b,time,frame),contacts,eventLimits,pockets,slidingDurationS:firstRoll&&immediate?firstRoll.timeS-immediate.timeS:null,slidingDurationUncertaintyS:step,peakEnergyJ,relativeEnergyGain,maxPenetrationM,minSeparationMps:Number.isFinite(minSeparationMps)?minSeparationMps:null,failures:[...new Set(failures)],passed:failures.length===0};
}
function differences(a,b,phase='firstRoll'){
 if(!a[phase]||!b[phase])return null;
 const x=a[phase].local,y=b[phase].local;
 return {positionM:Math.hypot(x.x-y.x,x.z-y.z),velocityMps:Math.hypot(x.vx-y.vx,x.vz-y.vz),spinRadps:Math.hypot(x.wx-y.wx,x.wy-y.wy,x.wz-y.wz),timeS:Math.abs(a[phase].timeS-b[phase].timeS)};
}
export function auditSpinMatrix(conditions=CONDITIONS){
 const rows=conditions.map(condition=>{
  const base=measureSpinRebound(condition),mirror=measureSpinRebound(condition,{frame:'mirror'}),rotated=measureSpinRebound(condition,{frame:'rotated'});
  const fine=measureSpinRebound(condition,{step:.000025}),extra=measureSpinRebound(condition,{step:.0000125});
  const symmetry={mirror:differences(base,mirror),rotated:differences(base,rotated),mirrorImmediate:differences(base,mirror,'immediate'),rotatedImmediate:differences(base,rotated,'immediate')};
  const convergence={baseFine:differences(base,fine),fineExtra:differences(fine,extra),baseFineImmediate:differences(base,fine,'immediate'),fineExtraImmediate:differences(fine,extra,'immediate')};
  const failures=[...[base,mirror,rotated,fine,extra].flatMap(r=>r.failures.map(f=>`${r.frame}@${r.step}:${f}`))];
  for(const [name,d] of Object.entries(symmetry))if(!d||d.positionM>1e-8||d.velocityMps>1e-8||d.spinRadps>1e-7||d.timeS>1e-8)failures.push(`symmetry-${name}`);
  for(const [name,d] of Object.entries(convergence))if(!d||d.positionM>.001||d.velocityMps>.001||d.spinRadps>.05||d.timeS>.0002)failures.push(`convergence-${name}`);
  return {condition,base,mirror,rotated,fine,extra,symmetry,convergence,failures,passed:failures.length===0};
 });
 return {model:MODEL,conditions:rows.length,simulations:rows.length*5,passed:rows.every(r=>r.passed),failedConditions:rows.filter(r=>!r.passed).length,rows};
}
export function runAudit(){
 const root=new URL('../',import.meta.url),report=auditSpinMatrix();
 return {schemaVersion:1,projectVersion:readFileSync(new URL('VERSION',root),'utf8').trim(),
  provenance:{sourceSha256:Object.fromEntries(['dist/physics.js','dist/cushion-profiles.js','dist/separated-cushion.js','dist/coupled-cushion.js','dist/compliant-cushion.js','dist/table-pocket-geometry.js','scripts/audit-pool-spin.js'].map(path=>[path,createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')])),commit:execFileSync('git',['rev-parse','HEAD'],{cwd:fileURLToPath(root),encoding:'utf8'}).trim(),trackedDirty:execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:fileURLToPath(root),encoding:'utf8'}).trim()!==''},
  evidence:{classification:'numerical consistency of spin extrapolation',independentExperimentalSpinMeasurements:0,regressionScoreUsed:false,claim:'Passing mechanics and agreement among agents do not establish real-table accuracy.'},
  protocol:{speedMps:[.5,1.2,2.3],angleFromNormalDeg:[0,30,60,75],sideDefinition:'R * omega_y / incident speed',side:[-1,0,1],initial:'Natural roll prescribed at geometric rail contact, with sidespin',output:'Immediate state and first actual pure roll sampled after contact; first-roll time uncertainty is at most the sampling step (not an exact transition instant)' ,signedConventions:'normalMps is positive away from the selected cushion (negative incident); tangentMps and rubberTangentialSlipMps use canonical +x; angleFromOutwardNormalDeg is signed atan2(tangent,outward normal), including incident values in [90,180]; incident also reports angleFromIncomingNormalDeg',frames:['base long rail','mirror long rail','90-degree rotated state on short rail'],stepsS:[.0001,.000025,.0000125],tolerances:{symmetryPositionM:1e-8,symmetryVelocityMps:1e-8,symmetrySpinRadps:1e-7,symmetryTimeS:1e-8,relativeEnergyGain:1e-6,penetrationM:1e-7,convergencePositionM:.001,convergenceVelocityMps:.001,convergenceSpinRadps:.05,convergenceTimeS:.0002},parameters:{...PHYSICS,radiusM:RADIUS,noseHeightM:NOSE_HEIGHT}},...report};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const report=runAudit(),out=new URL('../docs/data/pool-spin-audit-v071.json',import.meta.url);
 mkdirSync(new URL('.',out),{recursive:true});writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({conditions:report.conditions,simulations:report.simulations,failedConditions:report.failedConditions,passed:report.passed,report:fileURLToPath(out)}));
 process.exitCode=report.passed?0:1;
}
