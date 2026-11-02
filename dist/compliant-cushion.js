// FRAME experimental pool-cushion resolver, independent of the v0.17 impulse
// calibration. Inspired by Stronge's lumped normal/tangential compliance,
// Rod Cross (2010), and the pool-specific Lankarani–Nikravesh literature.
// This is NOT a port of any source implementation nor a measured K55/K66
// material law. It is a constrained two-degree-of-freedom CONTACT model:
// normal compression/restitution + horizontal tangential spring/slip.
// The engine keeps three-dimensional angular velocities but does not simulate
// vertical translation, cloth/cushion simultaneous contact or jumping.

export const COMPLIANT_POOL_RAIL = Object.freeze({
  name:'Pool · contact déformable expérimental',
  normalAngularFrequency:2200,   // rad/s; unmeasured contact-duration scale
  tangentToNormalFrequency:1.8, // dimensionless, illustrative pooltool default
  staticFriction:0.24,         // unmeasured engineering hypothesis
  dynamicFriction:0.20,        // pooltool's generic reference, not K66 data
  tangentDampingRatio:0.06,    // unmeasured; governs spring-ringdown damping
  integrationSteps:320,       // deterministic event-local quadrature
  model:'Stronge-inspired spring/slip, two horizontal contact components',
  source:'Stronge, Impact Mechanics (2018); Cross, AJP (2010)',
  note:'Restitution normale transmise depuis le profil pool v0.17; contact raideur, frottement et durée encore non identifiés sur une bande de pool américaine.'
});

// v0.19: conservative, explicitly EFFECTIVE identification on TUM's
// American-pool regression. Its values are NOT K55/K66 material measurements.
// Both the v0.18 experimental law and v0.17 empirical impact remain available.
// Reproduce selection and its internal consistency checks with
// `node scripts/guarded-cushion-fit.js`. No independent US rail/spin
// measurements were available for an external validation.
export const COMPLIANT_POOL_RAIL_TUNED = Object.freeze({
  ...COMPLIANT_POOL_RAIL,
  name:'Pool · contact déformable ajusté (non validé)',
  tangentToNormalFrequency:1.8560389196849427,
  staticFriction:0.2692221765359864,
  dynamicFriction:0.22372232410125437,
  tangentDampingRatio:0.02611365583725274,
  source:'Identification numérique limitée sur les régressions TUM ; structure Stronge-inspired',
  note:'Coefficients effectifs identifiés sur une régression de rebonds pool US, pas des mesures physiques K55/K66 ; résultats avec effet latéral et angles rasants non validés.'
});

function clamp(value,lo,hi) {return Math.max(lo,Math.min(hi,value));}

function kineticEnergy(ball,mass,inertia) {
  return 0.5*mass*(ball.vx**2+ball.vz**2)+
    0.5*inertia*(ball.wx**2+ball.wy**2+ball.wz**2);
}

// Integrate only the short CONTACT interval. The rest of FRAME remains an
// event-driven continuous-collision solver, avoiding changes to its clock.
// A series normal spring stores 1/2*k_n*d^2 energy in compression. During
// restitution its stiffness changes to e_n^2*k_n, dissipating the correct
// normal fraction by an energetic (Stronge-style) coefficient of restitution.
// The tangential spring accumulates shear displacement and is capped by
// static/kinetic friction. Sliding projects the stored spring deflection to
// the friction cone and dissipates the removed elastic energy.
export function resolveCompliantRailImpact(ball,nx,nz,{
  mass, radius, noseHeight, restitution,
  parameters=COMPLIANT_POOL_RAIL
}) {
  const h=noseHeight-radius;
  const reach=Math.sqrt(Math.max(0,radius*radius-h*h));
  const inertia=0.4*mass*radius*radius;
  const inverseMass=1/mass,inverseInertia=1/inertia;
  const tx=-nz,tz=nx;
  const vn=ball.vx*nx+ball.vz*nz-h*(ball.wx*tx+ball.wz*tz);
  if(vn>=-1e-7)return {speed:0,normalImpulse:0,tangentialImpulse:0,
    duration:0,slidingSteps:0,stickingSteps:0};

  const normalInverseMass=inverseMass+h*h*inverseInertia;
  const tangentInverseMass=inverseMass+radius*radius*inverseInertia;
  const tangentialSlip=ball.vx*tx+ball.vz*tz+reach*ball.wy+
    h*(ball.wx*nx+ball.wz*nz);
  const energyBefore=kineticEnergy(ball,mass,inertia);
  const e=clamp(restitution,0.02,0.99);
  const omega=parameters.normalAngularFrequency;
  const omegaTangential=omega*parameters.tangentToNormalFrequency;
  const springTangential=omegaTangential**2/tangentInverseMass;
  const dampingTangential=2*parameters.tangentDampingRatio*
    omegaTangential/tangentInverseMass;
  const compressionDuration=Math.PI/(2*omega);
  const restitutionDuration=compressionDuration/e;
  const duration=compressionDuration+restitutionDuration;
  const n=Math.max(32,Math.floor(parameters.integrationSteps));
  const stepDuration=duration/n;
  const normalForceAmplitude=omega*(-vn)/normalInverseMass;
  let springDisplacement=0;
  let tangentVelocity=tangentialSlip;
  let tangentialImpulse=0;
  let slidingSteps=0,stickingSteps=0;
  for(let step=0;step<n;step++) {
    const t=(step+0.5)*stepDuration;
    const normalForce=t<compressionDuration?
      normalForceAmplitude*Math.sin(omega*t):
      e*e*normalForceAmplitude*
        Math.cos(omega*e*(t-compressionDuration));
    const positiveNormalForce=Math.max(0,normalForce);
    const trialDisplacement=springDisplacement+tangentVelocity*stepDuration;
    const trialForce=-springTangential*trialDisplacement-
      dampingTangential*tangentVelocity;
    let tangentForce;
    if(Math.abs(trialForce)<=parameters.staticFriction*positiveNormalForce) {
      tangentForce=trialForce;
      springDisplacement=trialDisplacement;
      stickingSteps++;
    } else {
      // For gross slip, friction opposes relative velocity; as velocity
      // crosses zero the elastic spring may restore force in either sense.
      const sign=Math.sign(Math.abs(tangentVelocity)>1e-9?
        tangentVelocity:-trialForce);
      tangentForce=-sign*parameters.dynamicFriction*positiveNormalForce;
      springDisplacement=springTangential>0?
        -(tangentForce+dampingTangential*tangentVelocity)/springTangential:0;
      slidingSteps++;
    }
    tangentialImpulse+=tangentForce*stepDuration;
    tangentVelocity+=tangentInverseMass*tangentForce*stepDuration;
  }

  // In each isolated normal oscillator, incoming and outgoing contact speeds
  // have ratio e. This impulse is exact, independent of the quadrature used
  // solely for the tangential spring and Coulomb forces.
  const normalImpulse=-(1+e)*vn/normalInverseMass;
  const jn=normalImpulse;
  ball.vx+=jn*nx*inverseMass;
  ball.vz+=jn*nz*inverseMass;
  ball.wx-=h*jn*tx*inverseInertia;
  ball.wz-=h*jn*tz*inverseInertia;

  // The rubber may not create kinetic energy. Tangential impulse changes E
  // by s_t*J_t + (k_t/2)*J_t². Clip to its exact admissible interval if the
  // time-discretized stick/slip integration adds energy numerically.
  const energyNormal=kineticEnergy(ball,mass,inertia);
  const allowance=Math.max(0,energyBefore-energyNormal);
  const determinant=tangentialSlip*tangentialSlip+
    2*tangentInverseMass*allowance;
  const root=Math.sqrt(Math.max(0,determinant));
  tangentialImpulse=clamp(tangentialImpulse,
    (-tangentialSlip-root)/tangentInverseMass,
    (-tangentialSlip+root)/tangentInverseMass);
  const jt=tangentialImpulse;
  ball.vx+=jt*tx*inverseMass;
  ball.vz+=jt*tz*inverseMass;
  ball.wx+=h*jt*nx*inverseInertia;
  ball.wz+=h*jt*nz*inverseInertia;
  ball.wy+=reach*jt*inverseInertia;

  return {speed:-vn,normalImpulse:jn,tangentialImpulse:jt,duration,
    slidingSteps,stickingSteps};
}
