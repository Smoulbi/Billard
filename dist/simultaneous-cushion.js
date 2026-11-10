// FRAME v0.22 research solver — NOT a replacement for the validated rail modes.
// A 6-DOF sphere simultaneously touches a rounded rail nose and a flat cloth.
// Coordinates: x = inward rail normal, z = rail tangent, y = up.
// Contact law: Hertz / Lankarani–Nikravesh normal force, regularized Coulomb
// slip on BOTH contacts, gravity, and explicit finite-duration integration.
// This is a hypothesis about a rounded nose, NOT measured K55/K66 geometry,
// rheology, or independent validation of American-pool rail rebound.

import {RADIUS,NOSE_HEIGHT,PHYSICS} from './physics.js?v=0.68';

export const SIMULTANEOUS_POOL_CONTACT=Object.freeze({
  name:'v0.22 · simultaneous rail/cloth, research candidate',
  railStiffness:1e8,          // N/m^1.5; exploratory, NOT K55/K66 measured
  railRestitution:0.85,      // exploratory contact restitution, not TUM's fit
  railFriction:0.15,         // exploratory Coulomb coefficient
  clothStiffness:1e8,        // N/m^1.5; exploratory, not a slate measurement
  clothRestitution:0.40,     // only sets a damping hypothesis
  clothImpactSpeed:0.20,    // m/s reference for regularized cloth damping
  clothFriction:PHYSICS.slidingFriction,
  clothNormalLaw:'lankarani-nikravesh', // v0.22 legacy hypothesis
  clothFrictionLaw:'constant', // keep original candidate exactly reproducible
  slipRegularization:0.001, // m/s, numerical smooth Coulomb approximation
  timeStep:0.000001,        // s, must be convergence-checked
  maxDuration:0.012,        // s; contact plus vertical settling
  source:'Gismeros Moreno et al., Nonlinear Dynamics 107 (2022) 1859–1886, DOI:10.1007/s11071-021-07117-4',
  status:'UNCALIBRATED: no independent American-pool rubber/cloth measurements'
});

// Table 1, Gismeros Moreno et al., Nonlinear Dynamics 107 (2022), p.1866.
// THESE ARE GENERIC material properties used in a pool model, not measured
// stiffnesses of a particular K55/K66 table or of the supporting slate.
export const PUBLISHED_POOL_MATERIALS_2022=Object.freeze({
  ball:Object.freeze({youngPa:3_800_000_000,poisson:0.375}),
  cushion:Object.freeze({youngPa:7_000_000,poisson:0.50}),
  cloth:Object.freeze({youngPa:3_100_000_000,poisson:0.38}),
  source:'Gismeros Moreno et al. (2022), Table 1, doi:10.1007/s11071-021-07117-4'
});

// Hertz sphere-plane contact Eq. 3.6 of the cited pool research.
// This is a geometry/material calculation, NOT a fitted rebound coefficient.
export function spherePlaneHertzStiffness(ball,plane,radius=RADIUS){
  for(const material of [ball,plane]){
    if(!Number.isFinite(material?.youngPa)||material.youngPa<=0||
      !Number.isFinite(material.poisson)||material.poisson<0||material.poisson>0.5)
      throw new RangeError('Invalid Hertz material');
  }
  if(!Number.isFinite(radius)||radius<=0)throw new RangeError('Invalid Hertz radius');
  const compliance=(1-ball.poisson**2)/ball.youngPa+
    (1-plane.poisson**2)/plane.youngPa;
  return 4*Math.sqrt(radius)/(3*compliance);
}

// A separate, source-grounded STIFFNESS experiment. The dissipative material
// constants remain explicitly hypothetical; do not promote as a calibrated
// K55/K66 rail. Nor does the generic wool modulus include the underlying slate.
export const PUBLISHED_MODULI_POOL_CONTACT=Object.freeze({
  ...SIMULTANEOUS_POOL_CONTACT,
  name:'v0.22 · research with published generic pool elastic moduli',
  railStiffness:spherePlaneHertzStiffness(
    PUBLISHED_POOL_MATERIALS_2022.ball,PUBLISHED_POOL_MATERIALS_2022.cushion),
  clothStiffness:spherePlaneHertzStiffness(
    PUBLISHED_POOL_MATERIALS_2022.ball,PUBLISHED_POOL_MATERIALS_2022.cloth),
  status:'ONLY ELASTIC MODULI ARE LITERATURE-BASED; K55/K66, friction, restitution, cloth damping remain unmeasured',
  source:PUBLISHED_POOL_MATERIALS_2022.source
});

// Nierhoff, Heunisch & Hirche (2012), Eqs. 6, 17, 18: coefficients
// independently measured on a US pool table by pulling a 3-ball fixture.
// F_slide = -mg*(lambda_sa*v/|v| + lambda_sr*v). This is a specific-table
// reference, not a universal cloth property. The original published fit is
// piecewise and discontinuous at 0.672 m/s; we do not smooth or re-fit it.
export const TUM_POOL_CLOTH_SLIDING_2012=Object.freeze({
  transitionSpeed:0.672,
  slow:Object.freeze({lambdaSa:0.2014,lambdaSr:0.4763}),
  fast:Object.freeze({lambdaSa:0.2322,lambdaSr:0.0180}),
  source:'Nierhoff, Heunisch & Hirche, Strategic play for a pool-playing robot (2012), Eqs. 6, 17 and 18'
});

export function tumPoolClothFriction(slipSpeed){
  if(!Number.isFinite(slipSpeed)||slipSpeed<0)
    throw new RangeError('Invalid pool cloth slip speed');
  const fit=slipSpeed<=TUM_POOL_CLOTH_SLIDING_2012.transitionSpeed?
    TUM_POOL_CLOTH_SLIDING_2012.slow:TUM_POOL_CLOTH_SLIDING_2012.fast;
  return fit.lambdaSa+fit.lambdaSr*slipSpeed;
}

// Distinct 2022/2012 literature assumptions; changes NO active game model.
// The cloth normal force is pure Hertz (2022 Eq. 3.9) rather than the
// unmeasured L-N hysteresis of v0.22. Cushion damping/friction and shape
// remain hypotheses, so this still cannot be called a calibrated K55/K66.
export const LITERATURE_POOL_CONTACT=Object.freeze({
  ...PUBLISHED_MODULI_POOL_CONTACT,
  name:'v0.22 · separate literature cloth-contact hypothesis',
  clothNormalLaw:'hertz',
  clothFrictionLaw:'tum-2012',
  status:'RESEARCH ONLY; cloth laws sourced, rubber restitution, friction and K55/K66 geometry unmeasured'
});

const sq=x=>x*x;
const inertia=0.4*PHYSICS.mass*sq(RADIUS);

function energy(b,p){
  const clothOverlap=Math.max(0,RADIUS-b.y);
  const noseDistance=Math.hypot(b.x,b.y-NOSE_HEIGHT);
  const railOverlap=Math.max(0,RADIUS-noseDistance);
  return 0.5*PHYSICS.mass*(sq(b.vx)+sq(b.vy)+sq(b.vz))+
    0.5*inertia*(sq(b.wx)+sq(b.wy)+sq(b.wz))+
    PHYSICS.mass*PHYSICS.gravity*(b.y-RADIUS)+
    0.4*(p.clothStiffness*clothOverlap**2.5+p.railStiffness*railOverlap**2.5);
}

function validate(p){
  for(const k of ['railStiffness','clothStiffness','clothImpactSpeed',
    'slipRegularization','timeStep','maxDuration']){
    if(!Number.isFinite(p[k])||p[k]<=0)throw new RangeError(`Invalid ${k}`);
  }
  for(const k of ['railRestitution','clothRestitution']){
    if(!Number.isFinite(p[k])||p[k]<0||p[k]>1)
      throw new RangeError(`Invalid ${k}`);
  }
  for(const k of ['railFriction','clothFriction']){
    if(!Number.isFinite(p[k])||p[k]<0||p[k]>2)
      throw new RangeError(`Invalid ${k}`);
  }
  if(p.timeStep>0.00002||p.maxDuration>0.5)
    throw new RangeError('Research integration exceeds safety limits');
  if(!['hertz','lankarani-nikravesh'].includes(p.clothNormalLaw))
    throw new RangeError('Invalid cloth normal contact law');
  if(!['constant','tum-2012'].includes(p.clothFrictionLaw))
    throw new RangeError('Invalid cloth friction law');
}

// Force and torque for a point contact r and force F in the same frame.
function forceAtContact(forces,r,fx,fy,fz){
  forces.fx+=fx;forces.fy+=fy;forces.fz+=fz;
  forces.tx+=r.y*fz-r.z*fy;
  forces.ty+=r.z*fx-r.x*fz;
  forces.tz+=r.x*fy-r.y*fx;
}

function pointVelocity(b,r){
  return {
    x:b.vx+b.wy*r.z-b.wz*r.y,
    y:b.vy+b.wz*r.x-b.wx*r.z,
    z:b.vz+b.wx*r.y-b.wy*r.x
  };
}

// The L–N damping factor is proportional to (1-e²)/impact speed.
// Non-negative force prevents artificial adhesion during decompression.
function normalForce(stiffness,indent,indentRate,e,entrySpeed){
  if(indent<=0)return 0;
  const hysteresis=3*(1-e*e)/(4*entrySpeed);
  return stiffness*indent**1.5*Math.max(0,1+hysteresis*indentRate);
}

function railContact(b,p,entrySpeed,forces){
  const dy=b.y-NOSE_HEIGHT,d=Math.hypot(b.x,dy);
  const indent=RADIUS-d;
  if(indent<=0)return {force:0,indent:0};
  const nx=d>1e-12?b.x/d:1,ny=d>1e-12?dy/d:0;
  const r={x:-RADIUS*nx,y:-RADIUS*ny,z:0};
  const v=pointVelocity(b,r);
  const normalSpeed=v.x*nx+v.y*ny;
  const fn=normalForce(p.railStiffness,indent,-normalSpeed,
    p.railRestitution,entrySpeed);
  const slipX=v.x-normalSpeed*nx,slipY=v.y-normalSpeed*ny;
  const slip=Math.hypot(slipX,slipY,v.z);
  const scale=-p.railFriction*fn/Math.hypot(slip,p.slipRegularization);
  forceAtContact(forces,r,fn*nx+scale*slipX,fn*ny+scale*slipY,scale*v.z);
  return {force:fn,indent};
}

function clothContact(b,p,forces){
  const indent=RADIUS-b.y;
  if(indent<=0)return {force:0,indent:0};
  const r={x:0,y:-RADIUS,z:0};
  const v=pointVelocity(b,r);
  const fn=p.clothNormalLaw==='hertz'?
    p.clothStiffness*indent**1.5:
    normalForce(p.clothStiffness,indent,-b.vy,
      p.clothRestitution,p.clothImpactSpeed);
  const slip=Math.hypot(v.x,v.z);
  const friction=p.clothFrictionLaw==='tum-2012'?
    tumPoolClothFriction(slip):p.clothFriction;
  const scale=-friction*fn/Math.hypot(slip,p.slipRegularization);
  forceAtContact(forces,r,scale*v.x,fn,scale*v.z);
  return {force:fn,indent};
}

// Integrate the complete coupled force sum at each micro-step, with a single
// semi-implicit update. No sequential impulses and no prescribed rail outcome.
export function simulateSimultaneousRailClothImpact({incoming,angleDeg=0,
  sidespin=0,parameters={},timeStep,maxDuration,untilFirstRoll=false}={}){
  if(!Number.isFinite(incoming)||incoming<=0||incoming>5||
    !Number.isFinite(angleDeg)||angleDeg<0||angleDeg>=85||
    !Number.isFinite(sidespin)||Math.abs(sidespin)>5)
    throw new RangeError('Invalid American-pool impact conditions');
  const p={...SIMULTANEOUS_POOL_CONTACT,...parameters};
  if(timeStep!==undefined)p.timeStep=timeStep;
  if(maxDuration!==undefined)p.maxDuration=maxDuration;
  else if(untilFirstRoll)p.maxDuration=0.50;
  validate(p);
  const normalIn=incoming*Math.cos(angleDeg*Math.PI/180);
  const tangentIn=incoming*Math.sin(angleDeg*Math.PI/180);
  const equilibriumIndent=(PHYSICS.mass*PHYSICS.gravity/p.clothStiffness)**(2/3);
  const initialY=RADIUS-equilibriumIndent;
  const initialX=Math.sqrt(sq(RADIUS)-sq(initialY-NOSE_HEIGHT));
  const b={x:initialX,y:initialY,z:0,
    vx:-normalIn,vy:0,vz:tangentIn,
    wx:tangentIn/RADIUS,wy:sidespin*incoming/RADIUS,wz:normalIn/RADIUS};
  const normalDirectionX=initialX/RADIUS;
  const entrySpeed=normalIn*normalDirectionX;
  const baseline=energy(b,p);
  const totalSteps=Math.ceil(p.maxDuration/p.timeStep);
  const dt=p.maxDuration/totalSteps;
  let impactSteps=0,simultaneousSteps=0,peakRailForce=0,peakClothForce=0;
  let peakRailIndent=0,peakClothIndent=0,maxEnergyIncrease=0;
  let railSeparated=false,exitTime=null,firstRollTime=null;
  let previousEnergy=baseline;
  for(let i=0;i<totalSteps;i++){
    const f={fx:0,fy:-PHYSICS.mass*PHYSICS.gravity,fz:0,
      tx:0,ty:0,tz:0};
    // Evaluate both contacts from the identical state. Each torque is
    // contributed about the ball centre; no vertical-position constraint.
    const rail=railContact(b,p,entrySpeed,f);
    const cloth=clothContact(b,p,f);
    if(rail.force>0)impactSteps++;
    if(rail.force>0&&cloth.force>0)simultaneousSteps++;
    peakRailForce=Math.max(peakRailForce,rail.force);
    peakClothForce=Math.max(peakClothForce,cloth.force);
    peakRailIndent=Math.max(peakRailIndent,rail.indent);
    peakClothIndent=Math.max(peakClothIndent,cloth.indent);
    b.vx+=f.fx/PHYSICS.mass*dt;
    b.vy+=f.fy/PHYSICS.mass*dt;
    b.vz+=f.fz/PHYSICS.mass*dt;
    b.wx+=f.tx/inertia*dt;
    b.wy+=f.ty/inertia*dt;
    b.wz+=f.tz/inertia*dt;
    b.x+=b.vx*dt;b.y+=b.vy*dt;b.z+=b.vz*dt;
    const nextEnergy=energy(b,p);
    maxEnergyIncrease=Math.max(maxEnergyIncrease,nextEnergy-baseline);
    previousEnergy=nextEnergy;
    const railIndent=RADIUS-Math.hypot(b.x,b.y-NOSE_HEIGHT);
    if(impactSteps>0&&railIndent<=0&&b.vx>0){
      if(!railSeparated)exitTime=(i+1)*dt;
      railSeparated=true;
    }
    if(untilFirstRoll&&railSeparated&&railIndent<=0&&
      Math.abs(b.y-initialY)<0.00005&&Math.abs(b.vy)<0.05&&
      Math.hypot(b.vx+RADIUS*b.wz,b.vz-RADIUS*b.wx)<0.002){
      firstRollTime=(i+1)*dt;
      break;
    }
  }
  if(!railSeparated)throw new Error('Rail contact did not separate within time budget');
  if(!Object.values(b).every(Number.isFinite))
    throw new Error('Unstable numerical contact solution');
  if(untilFirstRoll&&firstRollTime===null)
    throw new Error('3D solver did not reach first rolling state; no 2D handoff is allowed');
  return {state:b,parameters:p,initialEnergy:baseline,finalEnergy:previousEnergy,
    maxEnergyIncrease,netEnergyLoss:baseline-previousEnergy,exitTime,firstRollTime,
    impactSteps,simultaneousSteps,peakRailForce,peakClothForce,
    peakRailIndent,peakClothIndent,
    equilibriumIndent};
}

// Measure first rolling after the rail WITHIN the 3D contact solver itself.
// A 2D handoff while the ball is airborne or bouncing is not physically valid.
export function measureSimultaneousPoolRebound(options){
  const shot=simulateSimultaneousRailClothImpact({...options,untilFirstRoll:true});
  const {state}=shot;
  const a=options.angleDeg*Math.PI/180;
  return {...shot,postRollNormal:state.vx,postRollTangent:state.vz,
    postRollSpeed:Math.hypot(state.vx,state.vz),
    incomingNormal:options.incoming*Math.cos(a),
    incomingTangent:options.incoming*Math.sin(a)};
}
