// FRAME v0.20: constrained 3D contact-point kinematics for an American pool rail.
// This is an original, deliberately simplified event-local numerical model,
// NOT a port of Pooltool's Stronge solver and NOT measured K55/K66 rheology.
// The ball centre remains on the cloth: the vertical contact impulse is
// reacted by the table, so no jump or airborne motion is represented.

import {COMPLIANT_POOL_RAIL_TUNED} from './compliant-cushion.js';

export const COUPLED_POOL_RAIL = Object.freeze({
  ...COMPLIANT_POOL_RAIL_TUNED,
  name:'Pool · contact 3D couplé expérimental',
  verticalToHorizontalStiffness:1,
  staticFriction:0.125,
  dynamicFriction:0.12,
  velocityFrictionGain:0.45,
  velocityFrictionScale:1.7, // m/s; rounded, in-sample effective fit
  model:'3D two-tangent spring/slip, coupled normal/vertical, constrained height',
  source:'Cinématique de contact 3D et cône de Coulomb ; TUM 1217 impacts, recherche bornée (sans mesures K55/K66)',
  note:'Deux cisaillements, cône de Coulomb commun et couplage normal/vertical. Frottement effectif dépendant de la vitesse, fit borné sur les régressions TUM ; optimum atteint des bornes, aucun coefficient de gomme K55/K66 mesuré ni validation de table indépendante.'
});

// v0.21: limited re-identification of EFFECTIVE parameters. The trust region
// constrains deviations from v0.20; 1.2 m/s was excluded from the objective.
// Several optima touch these bounds, so do not infer rubber material values.
// The archived v0.20 variant and all earlier models remain unchanged.
export const COUPLED_POOL_RAIL_V021 = Object.freeze({
  ...COUPLED_POOL_RAIL,
  name:'Pool · contact 3D, ajustement borné v0.21',
  tangentToNormalFrequency:1.6,
  tangentDampingRatio:0.05,
  verticalToHorizontalStiffness:0.7,
  dynamicFriction:0.105,
  staticFriction:0.106,
  velocityFrictionGain:0.6,
  velocityFrictionScale:1.59,
  velocityFrictionExponent:2.8,
  source:'Recherche de paramètres sous région de confiance v0.20 ; cibles régression TUM',
  note:'Calibration effective limitée, entraînée sur 0,5/2,3 m/s et contrôlée sur 1,2 m/s de la même régression. Plusieurs paramètres aux bornes ; aucune validation sur tirs indépendants ni mesure de caoutchouc K55/K66.'
});

const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));

// K = J M^-1 J^T in the cushion frame (n,t,u), with u vertical and v_u=0.
// r = -sqrt(R²-h²)*n + h*u, h = noseHeight-R.
// K_nn = 1/m+h²/I, K_tt=1/m+R²/I, K_uu=reach²/I,
// K_nu=h*reach/I.  The cross term is the coupling missing from v0.19.
export function resolveCoupledRailImpact(ball,nx,nz,{
  mass,radius,noseHeight,restitution,parameters=COUPLED_POOL_RAIL
}) {
  const tx=-nz,tz=nx;
  const h=noseHeight-radius;
  const reach=Math.sqrt(Math.max(0,radius**2-h**2));
  const inertia=0.4*mass*radius**2;
  const inverseMass=1/mass, inverseInertia=1/inertia;
  const omegaT=ball.wx*tx+ball.wz*tz;
  const initialN=ball.vx*nx+ball.vz*nz-h*omegaT;
  if(initialN>=-1e-7)return {
    speed:0,normalImpulse:0,tangentialImpulse:0,verticalImpulse:0,
    duration:0,slidingSteps:0,stickingSteps:0,energyClipped:false
  };
  const initialT=ball.vx*tx+ball.vz*tz+reach*ball.wy+
    h*(ball.wx*nx+ball.wz*nz);
  const initialU=-reach*omegaT;
  const knn=inverseMass+h*h*inverseInertia;
  const ktt=inverseMass+radius*radius*inverseInertia;
  const kuu=reach*reach*inverseInertia;
  const knu=h*reach*inverseInertia;
  const e=clamp(restitution,0.02,0.99);
  const omega=parameters.normalAngularFrequency;
  const omegaTangent=omega*parameters.tangentToNormalFrequency;
  const kSpring=omegaTangent**2/ktt;
  const kVertical=kSpring*parameters.verticalToHorizontalStiffness;
  const cSpring=2*parameters.tangentDampingRatio*omegaTangent/ktt;
  const cVertical=cSpring*parameters.verticalToHorizontalStiffness;
  const compressionDuration=Math.PI/(2*omega);
  const duration=compressionDuration*(1+1/e);
  const count=Math.max(32,Math.floor(parameters.integrationSteps));
  const dt=duration/count;
  const targetNormalImpulse=-(1+e)*initialN/knn;
  const weights=new Array(count);
  let totalWeight=0;
  for(let i=0;i<count;i++) {
    const t=(i+0.5)*dt;
    const weight=t<compressionDuration?
      Math.sin(omega*t):e*e*Math.cos(omega*e*(t-compressionDuration));
    weights[i]=Math.max(0,weight);
    totalWeight+=weights[i];
  }
  let jn=0,jt=0,ju=0;
  let slipT=initialT,slipU=initialU;
  let springT=0,springU=0;
  let slidingSteps=0,stickingSteps=0;
  for(let i=0;i<count;i++) {
    // Requested normal-velocity history is achieved after compensating the
    // vertical shear's K_nu coupling. This avoids double-counting restitution.
    const requestedNormal=targetNormalImpulse*weights[i]/totalWeight;
    const trialT=springT+slipT*dt;
    const trialU=springU+slipU*dt;
    const forceT=-kSpring*trialT-cSpring*slipT;
    const forceU=-kVertical*trialU-cVertical*slipU;
    const magnitude=Math.hypot(forceT,forceU);
    const slipSpeed=Math.hypot(slipT,slipU);
    // Optional bounded EFFECTIVE friction variation with surface-slip speed.
    // Gain 0 leaves the original material hypothesis unchanged. Any nonzero
    // value must be identified against rail impacts, not called rubber data.
    const velocityFactor=Math.tanh((slipSpeed/
      Math.max(0.05,parameters.velocityFrictionScale??1))**
      (parameters.velocityFrictionExponent??2));
    const effectiveGain=(parameters.velocityFrictionGain??0)*velocityFactor;
    const muStatic=clamp(parameters.staticFriction+effectiveGain,0,1.5);
    const muDynamic=clamp(parameters.dynamicFriction+effectiveGain,0,1.5);
    const nominalFn=requestedNormal/dt;
    const sticking=magnitude<=muStatic*nominalFn;
    let djt,dju,coefficient;
    if(sticking) {
      djt=forceT*dt;dju=forceU*dt;
      coefficient=muStatic;
      stickingSteps++;
    } else {
      const slipMagnitude=Math.hypot(slipT,slipU);
      const unitT=slipMagnitude>1e-9?slipT/slipMagnitude:
        (magnitude>0?-forceT/magnitude:0);
      const unitU=slipMagnitude>1e-9?slipU/slipMagnitude:
        (magnitude>0?-forceU/magnitude:0);
      djt=-muDynamic*requestedNormal*unitT;
      dju=-muDynamic*requestedNormal*unitU;
      coefficient=muDynamic;
      slidingSteps++;
    }
    let djn=requestedNormal;
    // Solve the normal/shear friction-cone coupling by a bounded fixed point.
    // At each iteration the 2D shear vector fits one common Coulomb cone.
    for(let k=0;k<8;k++) {
      const maxShear=coefficient*Math.max(0,djn);
      const shear=Math.hypot(djt,dju);
      if(shear>maxShear&&shear>0) {
        const f=maxShear/shear;
        djt*=f;dju*=f;
      }
      djn=Math.max(0,requestedNormal-(knu/knn)*dju);
    }
    jn+=djn;jt+=djt;ju+=dju;
    slipT+=ktt*djt;
    slipU+=knu*djn+kuu*dju;
    if(sticking) {springT=trialT;springU=trialU;}
    else {
      springT=kSpring>0?-(djt/dt+cSpring*slipT)/kSpring:0;
      springU=kVertical>0?-(dju/dt+cVertical*slipU)/kVertical:0;
    }
  }

  // Impose the total normal restitution to machine precision. All changes
  // induced by vertical friction must be compensated in the normal impulse.
  const targetDeltaN=-(1+e)*initialN;
  const normalFor=(shearU)=>(targetDeltaN-knu*shearU)/knn;
  const energyChange=(factor)=>{
    const t=jt*factor,u=ju*factor,n=normalFor(u);
    return initialN*n+initialT*t+initialU*u+
      0.5*(knn*n*n+ktt*t*t+kuu*u*u+2*knu*n*u);
  };
  let energyClipped=false;
  if(energyChange(1)>1e-10) {
    // Effective restitution and omitted cloth reaction must not create net
    // ball kinetic energy. Scale both shear impulses uniformly, retaining
    // their direction and the exact normal contact restitution.
    let lo=0,hi=1;
    for(let i=0;i<55;i++) {
      const mid=(lo+hi)/2;
      if(energyChange(mid)>0)hi=mid;else lo=mid;
    }
    jt*=lo;ju*=lo;
    energyClipped=true;
  }
  jn=normalFor(ju);
  ball.vx+=(jn*nx+jt*tx)*inverseMass;
  ball.vz+=(jn*nz+jt*tz)*inverseMass;
  ball.wx+=(-h*jn*tx+h*jt*nx-reach*ju*tx)*inverseInertia;
  ball.wz+=(-h*jn*tz+h*jt*nz-reach*ju*tz)*inverseInertia;
  ball.wy+=reach*jt*inverseInertia;
  return {speed:-initialN,normalImpulse:jn,tangentialImpulse:jt,
    verticalImpulse:ju,duration,slidingSteps,stickingSteps,energyClipped};
}
