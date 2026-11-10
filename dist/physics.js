import {resolveSeparatedRailImpact} from './separated-cushion.js?v=0.68';
// FRAME physics — all lengths in metres, time in seconds, angular speeds in rad/s.
// The renderer never influences the simulation. Each sphere is assumed homogeneous.
import {CUSHION_PROFILES, DEFAULT_CUSHION_PROFILE,
  cushionRestitutionFor, poolRailReference,
  poolEffectiveRailFriction} from './cushion-profiles.js';
import {COMPLIANT_POOL_RAIL,COMPLIANT_POOL_RAIL_TUNED,
  resolveCompliantRailImpact} from './compliant-cushion.js';
import {COUPLED_POOL_RAIL,COUPLED_POOL_RAIL_V021,
  resolveCoupledRailImpact} from './coupled-cushion.js';
import {pocketReferenceGeometry,pocketApertureClearance,
  CORNER_FACING_RUN,CORNER_FACING_ANGLE,
  SIDE_FACING_RUN,SIDE_FACING_ANGLE} from './table-pocket-geometry.js';
export const CUSHION_MODELS=Object.freeze([
  'empirical','compliant','compliant-tuned','coupled-3d','coupled-v021','coupled-v068']);
export const LENGTH = 1.27;
export const WIDTH = 0.635;
export const RADIUS = 0.028575;
export const CORNER_CUT = 0.0808;
export const SIDE_CUT = 0.0648;
export const NOSE_HEIGHT = 2 * RADIUS * 0.635; // WPA: 63.5% of ball diameter
const NOSE_VERTICAL_OFFSET = NOSE_HEIGHT - RADIUS;
const NOSE_REACH = Math.sqrt(RADIUS ** 2 - NOSE_VERTICAL_OFFSET ** 2);
export const CORNER_POCKET_SHELF = 0.035; // 35 mm, within WPA 25.4–57.15 mm
export const SIDE_POCKET_SHELF = 0.006; // 6 mm, within WPA 0–9.525 mm

export const PHYSICS = Object.freeze({
  mass: 0.170097,
  gravity: 9.81,
  // Alciatore TP B.6 (pool): typical sliding 0.2, rolling 0.01.
  // The old 0.0128 snooker rolling value remains in the snooker profile.
  slidingFriction: 0.20,
  rollingFriction: CUSHION_PROFILES.pool.rollingFriction,
  spinningFriction: 0.015,
  // A 2023 experiment on 61-mm billiard balls and a PVC bench found e_n=0.98,
  // mu=0.10. Those conditions differ from a cloth-table impact; the chosen
  // isolated ball restitution is cross-checked with Mathavan 2009's Table I.
  ballRestitution: 0.94,
  // Alciatore's speed-dependent ball-ball friction law (Marlow data), reused
  // in Gismeros Moreno et al., Nonlinear Dynamics 107 (2022), Eq. (3.8).
  ballFrictionFloor: 0.009951,
  ballFrictionAmplitude: 0.108,
  ballFrictionDecay: 1.088,
  // Nominal pool values (the pool's effective restitution now depends on
  // impact speed and angle). The previous snooker rail model is separate.
  cushionRestitution: CUSHION_PROFILES.pool.restitution,
  cushionFriction: CUSHION_PROFILES.pool.friction, // lower bound, not a constant live pool coefficient
  facingRestitution: 0.78,
  facingFriction: 0.20,
  cueEffectiveMass: 0.55, // longitudinal effective cue mass, kg
  cueTipEffectiveMass: 0.018, // low-deflection shaft-end mass, kg
  chalkedTipLimit: 0.50, // maximum safe radial offset, in ball radii
});

export const PHYSICS_EVIDENCE = Object.freeze({
  cloth: Object.freeze({source:'Alciatore TP B.6 (pool) ; Mathavan et al. (snooker)',
    doi:'10.1119/1.3157159',surface:'repère typique du pool et mesure séparée sur snooker',
    poolRolling:0.01,poolSliding:0.20,
    rolling:[0.0127,0.0129],sliding:[0.178,0.245]}),
  ball: Object.freeze({source:'Mathavan et al. (2009) ; restitution et friction (2023)',
    dois:['10.1119/1.3157159','10.1016/j.mechrescom.2023.104149','10.1007/s11071-021-07117-4'],
    note:'Frottement bille-bille variable avec la vitesse tangentielle ; les coefficients PVC 2023 ne sont pas copiés.'}),
  rail: Object.freeze({source:'Nierhoff, Heunisch & Hirche, 1 217 impacts pool ; Alciatore, HSV B.15 / TP B.6 ; Mathavan et al. (2009) (snooker)',
    urls:[CUSHION_PROFILES.pool.sourceUrl,CUSHION_PROFILES.pool.proofUrl,
      CUSHION_PROFILES.snooker.sourceUrl],
    note:'Pool : corrections normale et tangentielle inversées de 1 217 rebonds, avec frottement tangent effectif vitesse-angle plafonné ; pas de mesure directe du caoutchouc. Snooker : ancienne courbe conservée.'}),
});

const INERTIA = 0.4 * PHYSICS.mass * RADIUS * RADIUS;
const INVERSE_MASS = 1 / PHYSICS.mass;
const INVERSE_INERTIA = 1 / INERTIA;
const SLIDE_DECEL = PHYSICS.slidingFriction * PHYSICS.gravity;
const SPIN_DECEL = 2.5 * PHYSICS.spinningFriction * PHYSICS.gravity / RADIUS;
const SLIP_EPS = 0.002;
const SPEED_EPS = 0.008;
const SPIN_EPS = 0.45;
const CONTACT_EPS = 1e-7;
const TIME_EPS = 1e-10;
const MAX_COLLISION_EVENTS = 80;
const MIN_BALL_CCD_IMPACT_SPEED = 0.002; // settle near-static clustered contacts discretely
const PACK_CONTACT_TOLERANCE = 0.00025; // tight rack gaps (250 micrometres)
// Phenolic-resin balls deform briefly on impact. A finite-duration Hertzian
// contact wave is essential for a tight rack: a rigid, simultaneous impulse
// incorrectly gives all 15 balls nearly the same forward motion.
const BALL_CONTACT_STIFFNESS = 3.8e8; // N / m^(3/2), reduced-radius Hertz contact
const PACK_SUBSTEP = 0.000001; // 1 microsecond
const PACK_CONTACT_DURATION = 0.0025; // s; resolves the initial rack collision wave

export function ballContactFriction(tangentSpeed) {
  return PHYSICS.ballFrictionFloor + PHYSICS.ballFrictionAmplitude *
    Math.exp(-PHYSICS.ballFrictionDecay*Math.abs(tangentSpeed));
}

const POCKETS = [];
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  POCKETS.push({x: sx * LENGTH, z: sz * WIDTH, sx, sz,
    radius: CORNER_CUT, kind: 'corner', shelf: CORNER_POCKET_SHELF});
}
for (const sz of [-1, 1]) {
  POCKETS.push({x: 0, z: sz * WIDTH, sz,
    radius: SIDE_CUT + 0.005, kind: 'side', shelf: SIDE_POCKET_SHELF});
}
// The visible mouth and the point where a ball loses support must be the
// same aperture. Previously a separate shelf-depth threshold left balls
// moving horizontally at fixed height while already over the black well.
const POCKET_APERTURES=POCKETS.map(p=>({p,
  geometry:pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,64)}));

// Measured at the cushion noses. Straight rails lead into angled rubber
// facings: 142° corner-cut angles and 104° side-cut angles (WPA target).
// Capsule ends represent the rounded nose at the junction of both surfaces.
const RAILS = [];
function addCushion(x0, z0, x1, z1, nx, nz, kind = 'rail') {
  const length = Math.hypot(nx, nz) || 1;
  RAILS.push({x0, z0, x1, z1, nx: nx / length, nz: nz / length, kind});
}
for (const sign of [-1, 1]) {
  for (const [x0, x1] of [[-LENGTH + CORNER_CUT, -SIDE_CUT], [SIDE_CUT, LENGTH - CORNER_CUT]]) {
    addCushion(x0, sign * WIDTH, x1, sign * WIDTH, 0, -sign);
  }
  addCushion(sign * LENGTH, -WIDTH + CORNER_CUT,
    sign * LENGTH, WIDTH - CORNER_CUT, -sign, 0);
}
for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
  const mouthLongX = sx * (LENGTH - CORNER_CUT);
  const mouthShortZ = sz * (WIDTH - CORNER_CUT);
  // 38° deflection from the straight cushion gives a 142° mouth cut.
  const cornerX = CORNER_FACING_RUN;
  const cornerZ = cornerX * Math.tan(CORNER_FACING_ANGLE);
  addCushion(mouthLongX, sz * WIDTH,
    mouthLongX + sx * cornerX, sz * (WIDTH + cornerZ), -sx, -sz, 'facing');
  addCushion(sx * LENGTH, mouthShortZ,
    sx * (LENGTH + cornerZ), mouthShortZ + sz * cornerX, -sx, -sz, 'facing');
}
for (const sz of [-1, 1]) for (const sx of [-1, 1]) {
  const sideX = SIDE_FACING_RUN;
  // 76° deflection from the long cushion gives a 104° mouth cut.
  addCushion(sx * SIDE_CUT, sz * WIDTH,
    sx * (SIDE_CUT - sideX), sz * (WIDTH + sideX * Math.tan(SIDE_FACING_ANGLE)),
    -sx, -sz, 'facing');
}

export function getPockets() {
  return POCKETS;
}

export function getCushionSegments() {
  return RAILS;
}

export function makePhysicsBody(num, x, z) {
  return {num, x, z, vx: 0, vz: 0, wx: 0, wy: 0, wz: 0,
    rotX: 0, rotY: 0, rotZ: 0, state: 'stationary', active: true};
}

export function stopBall(ball) {
  ball.vx = ball.vz = ball.wx = ball.wy = ball.wz = 0;
  ball.rotX = ball.rotY = ball.rotZ = 0;
  ball.state = 'stationary';
}

// Cue collision model, distinct from the cloth/ball solver. The displayed
// target point spans 0.62R; beyond the chalked tip's ~0.5R grip limit the
// tip slips, losing impulse and deflecting sharply (a deterministic miscue).
// The slight lateral impulse from shaft-end inertia causes opposite-direction
// squirt. Elevation tips the impulse and contact basis in 3D: its longitudinal
// angular component then generates a *lateral cloth slip*, so the existing
// sliding-friction integrator produces swerve without a scripted curve.
// Vertical translations and jumps are not simulated by this planar solver.
export function getCueImpact(aim, speed, english = {x: 0, y: 0}, options = {}) {
  const magnitude = Math.hypot(aim.x, aim.z) || 1;
  const dx = aim.x / magnitude, dz = aim.z / magnitude;
  const ox = Math.max(-1, Math.min(1, Number(english.x) || 0));
  const oy = Math.max(-1, Math.min(1, Number(english.y) || 0));
  const offsetScale = Math.min(1, 1 / (Math.hypot(ox, oy) || 1));
  const radialOffset = Math.hypot(ox, oy) * offsetScale * 0.62;
  const miscue = radialOffset > PHYSICS.chalkedTipLimit + 1e-9;
  const gripScale = radialOffset ? Math.min(1, PHYSICS.chalkedTipLimit / radialOffset) : 1;
  const lateral = ox * offsetScale * gripScale * RADIUS * 0.62;
  const vertical = oy * offsetScale * gripScale * RADIUS * 0.62;
  const depth = Math.sqrt(Math.max(0, RADIUS ** 2 - lateral ** 2 - vertical ** 2));
  const theta = Math.max(0, Math.min(15, Number(options.elevation) || 0)) * Math.PI / 180;
  const st = Math.sin(theta), ct = Math.cos(theta);
  const smallSquirt = Math.atan2(
    PHYSICS.cueTipEffectiveMass * lateral,
    (PHYSICS.mass + PHYSICS.cueTipEffectiveMass) * depth);
  const slipExcess = miscue ? Math.min(1, (radialOffset - PHYSICS.chalkedTipLimit) / (0.62 - PHYSICS.chalkedTipLimit)) : 0;
  const squirt = smallSquirt * (miscue ? 2 + 3 * slipExcess : 1);
  // A positive right-hand tip offset causes left squirt (negative T).
  const cd = Math.cos(squirt), sd = Math.sin(squirt);
  const ux = (dx * cd + dz * sd) * ct;
  const uz = (dz * cd - dx * sd) * ct;
  const uy = -st;
  // Coupled contact mass: off-centre strokes distribute the same cue-speed
  // input between ball translation and rotation.
  const spinLoad = (PHYSICS.mass * (lateral ** 2 + vertical ** 2)) * INVERSE_INERTIA;
  const massRatio = 1 + PHYSICS.mass / PHYSICS.cueEffectiveMass;
  const impulseSpeed = Math.max(0, Number(speed) || 0) * massRatio / (massRatio + spinLoad) *
    (miscue ? 0.60 - 0.25 * slipExcess : 1);
  // Contact point on the rear hemisphere, in a basis perpendicular to the
  // elevated cue. T=(-dz,0,dx), E=(sin(theta)*H + cos(theta)*up).
  const rx = -depth * ct * dx - lateral * dz + vertical * st * dx;
  const rz = -depth * ct * dz + lateral * dx + vertical * st * dz;
  const ry = depth * st + vertical * ct;
  const angularFactor = PHYSICS.mass * impulseSpeed * INVERSE_INERTIA;
  return {
    vx: ux * impulseSpeed, vz: uz * impulseSpeed,
    wx: (ry * uz - rz * uy) * angularFactor,
    wy: (rz * ux - rx * uz) * angularFactor,
    wz: (rx * uy - ry * ux) * angularFactor,
    miscue, squirtDegrees: squirt * 180 / Math.PI, impactOffset: radialOffset,
  };
}

export function strikeBall(ball, aim, speed, english = {x: 0, y: 0}, options = {}) {
  const impact = getCueImpact(aim, speed, english, options);
  ball.vx = impact.vx;
  ball.vz = impact.vz;
  ball.wx = impact.wx;
  ball.wy = impact.wy;
  ball.wz = impact.wz;
  ball.state = 'sliding';
  return impact;
}

function advanceBall(b, dt, profile = DEFAULT_CUSHION_PROFILE) {
  const rollingDecel=CUSHION_PROFILES[profile].rollingFriction*PHYSICS.gravity;
  const initialWx = b.wx, initialWy = b.wy, initialWz = b.wz;
  const slipX = b.vx + RADIUS * b.wz;
  const slipZ = b.vz - RADIUS * b.wx;
  const slip = Math.hypot(slipX, slipZ);
  let remaining = dt;

  if (slip > SLIP_EPS) {
    b.state = 'sliding';
    // On a uniform sphere, the cloth removes slip 3.5x faster than it removes
    // centre-of-mass speed. Cap the force at the sliding-to-rolling transition.
    const slidingTime = Math.min(remaining, slip / (3.5 * SLIDE_DECEL));
    const ux = slipX / slip, uz = slipZ / slip;
    const vx0 = b.vx, vz0 = b.vz;
    b.vx -= ux * SLIDE_DECEL * slidingTime;
    b.vz -= uz * SLIDE_DECEL * slidingTime;
    b.wx += uz * 2.5 * SLIDE_DECEL / RADIUS * slidingTime;
    b.wz -= ux * 2.5 * SLIDE_DECEL / RADIUS * slidingTime;
    b.x += (vx0 + b.vx) * 0.5 * slidingTime;
    b.z += (vz0 + b.vz) * 0.5 * slidingTime;
    remaining -= slidingTime;
  }

  if (remaining > 1e-10 || slip <= SLIP_EPS) {
    // Pure rolling obeys v_contact = 0; rolling resistance is much smaller
    // than sliding friction and slows the translation and rotation together.
    b.wx = b.vz / RADIUS;
    b.wz = -b.vx / RADIUS;
    const speed = Math.hypot(b.vx, b.vz);
    if (speed > SPEED_EPS) {
      b.state = 'rolling';
      const finalSpeed = Math.max(0, speed - rollingDecel * remaining);
      const distance = (speed + finalSpeed) * 0.5 * remaining;
      b.x += b.vx / speed * distance;
      b.z += b.vz / speed * distance;
      b.vx *= finalSpeed / speed;
      b.vz *= finalSpeed / speed;
      b.wx = b.vz / RADIUS;
      b.wz = -b.vx / RADIUS;
    } else {
      b.vx = b.vz = b.wx = b.wz = 0;
    }
  }

  // Spin about the vertical axis can remain when a ball no longer travels.
  const spinMagnitude = Math.abs(b.wy);
  b.wy = Math.sign(b.wy) * Math.max(0, spinMagnitude - SPIN_DECEL * dt);
  if (Math.abs(b.wy) < SPIN_EPS) b.wy = 0;

  if (Math.hypot(b.vx, b.vz) < SPEED_EPS &&
      Math.hypot(b.vx + RADIUS * b.wz, b.vz - RADIUS * b.wx) < SLIP_EPS) {
    b.vx = b.vz = b.wx = b.wz = 0;
  }
  if (b.vx === 0 && b.vz === 0) b.state = b.wy ? 'spinning' : 'stationary';

  // Angular increments are consumed by Three.js; these are never used by
  // the mechanical solver, which remains renderer-independent.
  b.rotX += (initialWx + b.wx) * 0.5 * dt;
  b.rotY += (initialWy + b.wy) * 0.5 * dt;
  b.rotZ += (initialWz + b.wz) * 0.5 * dt;
}

// Equal-mass spheres: normal restitution and a Coulomb-limited horizontal
// tangential impulse transfer linear motion and side spin (collision throw).
export function resolveBallCollision(a, b) {
  if (!a.active || !b.active) return 0;
  const dx = b.x - a.x, dz = b.z - a.z;
  const length = Math.hypot(dx, dz);
  const diameter = 2 * RADIUS;
  // An event-based solver reaches the exact contact, without an overlap.
  if (length > diameter + CONTACT_EPS) return 0;
  const nx = length > 1e-12 ? dx / length : 1;
  const nz = length > 1e-12 ? dz / length : 0;

  const overlap = Math.max(0, diameter - length);
  if (overlap > 0) {
    a.x -= nx * (overlap + 1e-8) * 0.5;
    a.z -= nz * (overlap + 1e-8) * 0.5;
    b.x += nx * (overlap + 1e-8) * 0.5;
    b.z += nz * (overlap + 1e-8) * 0.5;
  }

  const normalSpeed = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
  if (normalSpeed >= -1e-6) return 0;
  const jn = -(1 + PHYSICS.ballRestitution) * normalSpeed * PHYSICS.mass * 0.5;
  a.vx -= jn * nx * INVERSE_MASS;
  a.vz -= jn * nz * INVERSE_MASS;
  b.vx += jn * nx * INVERSE_MASS;
  b.vz += jn * nz * INVERSE_MASS;

  const tx = -nz, tz = nx;
  const tangentSpeed = (b.vx - a.vx) * tx + (b.vz - a.vz) * tz + RADIUS * (a.wy + b.wy);
  const maxFrictionImpulse = ballContactFriction(tangentSpeed) * jn;
  const jt = Math.max(-maxFrictionImpulse,
    Math.min(maxFrictionImpulse, -tangentSpeed / (2 * INVERSE_MASS + 2 * RADIUS * RADIUS * INVERSE_INERTIA)));
  a.vx -= jt * tx * INVERSE_MASS;
  a.vz -= jt * tz * INVERSE_MASS;
  b.vx += jt * tx * INVERSE_MASS;
  b.vz += jt * tz * INVERSE_MASS;
  a.wy += RADIUS * jt * INVERSE_INERTIA;
  b.wy += RADIUS * jt * INVERSE_INERTIA;
  return -normalSpeed;
}

// Compressible Hertzian contacts propagate a collision wave through a rack.
// Unlike a single rigid impulse across the entire connected graph, the force
// here is proportional to indentation^(3/2). The contact network forms and
// breaks continuously, leaving central balls slower than the outer balls.
// Lankarani–Nikravesh hysteresis approximates resin restitution. Tangential
// impulses are Coulomb-limited, as in isolated ball-ball collisions.
export function resolveSimultaneousBallContacts(balls, firstA, firstB) {
  const diameter=2*RADIUS;
  const all=[];
  for(let i=0;i<balls.length;i++) for(let j=i+1;j<balls.length;j++) {
    const a=balls[i],b=balls[j];
    if(!a.active||!b.active)continue;
    const dx=b.x-a.x,dz=b.z-a.z,distance=Math.hypot(dx,dz);
    if(distance>diameter+PACK_CONTACT_TOLERANCE)continue;
    all.push({a,b});
  }
  // Restrict the solver to the contact graph containing the actual collision.
  const connected=new Set([firstA,firstB]);
  let grew=true;
  while(grew){
    grew=false;
    for(const c of all)if(connected.has(c.a)!==connected.has(c.b)){
      connected.add(c.a);connected.add(c.b);grew=true;
    }
  }
  const contacts=all.filter(c=>connected.has(c.a)&&connected.has(c.b));
  if(contacts.length<2||!contacts.some(c=>(c.a===firstA&&c.b===firstB)||
      (c.a===firstB&&c.b===firstA)))return null;
  const active=[...connected];
  // Do not integrate past a cushion while the event solver is suspended.
  const fastest=Math.max(...active.map(b=>Math.hypot(b.vx,b.vz)));
  const safety=NOSE_REACH+fastest*PACK_CONTACT_DURATION+0.004;
  if(active.some(b=>RAILS.some(rail=>{
    const p=closestRailPoint(b.x,b.z,rail);
    return Math.hypot(b.x-p.x,b.z-p.z)<safety;
  })))return null;

  const pairs=[];
  for(let i=0;i<active.length;i++)for(let j=i+1;j<active.length;j++)
    pairs.push({i,j,touching:false,entrySpeed:1,peakForce:0,peakSpeed:0,contactTime:0});
  const dvx=new Float64Array(active.length),dvz=new Float64Array(active.length);
  const dwy=new Float64Array(active.length);
  const steps=Math.ceil(PACK_CONTACT_DURATION/PACK_SUBSTEP);
  const h=PACK_CONTACT_DURATION/steps;
  for(let step=0;step<steps;step++){
    dvx.fill(0);dvz.fill(0);dwy.fill(0);
    for(const c of pairs){
      const a=active[c.i],b=active[c.j];
      const dx=b.x-a.x,dz=b.z-a.z,distance=Math.hypot(dx,dz);
      const indentation=diameter-distance;
      if(indentation<=0){c.touching=false;continue;}
      const nx=distance>1e-12?dx/distance:1;
      const nz=distance>1e-12?dz/distance:0;
      const relativeNormal=(b.vx-a.vx)*nx+(b.vz-a.vz)*nz;
      if(!c.touching){
        c.touching=true;c.entrySpeed=Math.max(0.25,-relativeNormal);
        c.contactTime=step*h;
      }
      const hysteresis=0.75*(1-PHYSICS.ballRestitution**2)/c.entrySpeed;
      const force=BALL_CONTACT_STIFFNESS*indentation**1.5*
        Math.max(0,1-hysteresis*relativeNormal);
      if(force<=0)continue;
      c.peakForce=Math.max(c.peakForce,force);
      c.peakSpeed=Math.max(c.peakSpeed,-relativeNormal);
      const normalImpulse=force*h;
      const impulseSpeed=normalImpulse*INVERSE_MASS;
      dvx[c.i]-=impulseSpeed*nx;dvz[c.i]-=impulseSpeed*nz;
      dvx[c.j]+=impulseSpeed*nx;dvz[c.j]+=impulseSpeed*nz;
      const tx=-nz,tz=nx;
      const tangentialSpeed=(b.vx-a.vx)*tx+(b.vz-a.vz)*tz+
        RADIUS*(a.wy+b.wy);
      const slipImpulse=-tangentialSpeed/
        (2*INVERSE_MASS+2*RADIUS*RADIUS*INVERSE_INERTIA);
      const maxTangential=ballContactFriction(tangentialSpeed)*normalImpulse;
      const jt=Math.max(-maxTangential,Math.min(maxTangential,slipImpulse));
      dvx[c.i]-=jt*tx*INVERSE_MASS;dvz[c.i]-=jt*tz*INVERSE_MASS;
      dvx[c.j]+=jt*tx*INVERSE_MASS;dvz[c.j]+=jt*tz*INVERSE_MASS;
      dwy[c.i]+=RADIUS*jt*INVERSE_INERTIA;
      dwy[c.j]+=RADIUS*jt*INVERSE_INERTIA;
    }
    // Simultaneous force evaluation makes the contact wave independent of
    // pair iteration order. Semi-implicit Euler resolves the stiff spring.
    for(let i=0;i<active.length;i++){
      const b=active[i];
      b.vx+=dvx[i];b.vz+=dvz[i];b.wy+=dwy[i];
      b.x+=b.vx*h;b.z+=b.vz*h;
      b.rotX+=b.wx*h;b.rotY+=b.wy*h;b.rotZ+=b.wz*h;
    }
  }
  return {advanced:PACK_CONTACT_DURATION,
    reports:pairs.filter(c=>c.peakForce>100).map(c=>({
      a:active[c.i],b:active[c.j],speed:c.peakSpeed,time:c.contactTime}))};
}

// Continuous ball-ball detection. For each candidate pair, minimise the
// separation over the entire remaining interval; then bisect the *first*
// diameter crossing. Positions at arbitrary times come from the same
// sliding/rolling integrator as the simulation, so the contact time also
// accounts for changing velocities and the transition to pure rolling.
// This avoids missing a grazing collision whose overlap lasts less than one
// render or physics step. Cushions and pocket capture remain substepped.
function predictAtTime(b, t, profile = DEFAULT_CUSHION_PROFILE) {
  const predicted = {x: b.x, z: b.z, vx: b.vx, vz: b.vz,
    wx: b.wx, wy: b.wy, wz: b.wz, rotX: 0, rotY: 0, rotZ: 0};
  advanceBall(predicted, t, profile);
  return predicted;
}

function separationSquaredAt(a, b, t, profile) {
  const pa = predictAtTime(a, t, profile), pb = predictAtTime(b, t, profile);
  return (pb.x - pa.x) ** 2 + (pb.z - pa.z) ** 2;
}

function ballBallTimeOfImpact(a, b, duration, profile) {
  if (!a.active || !b.active || duration <= TIME_EPS) return Infinity;
  const dx = b.x - a.x, dz = b.z - a.z;
  const diameter = 2 * RADIUS;
  const diameterSquared = diameter * diameter;
  const distanceSquared = dx * dx + dz * dz;
  const rvx = b.vx - a.vx, rvz = b.vz - a.vz;
  const approaching = dx * rvx + dz * rvz;

  if (distanceSquared <= diameterSquared + 1e-12) {
    return approaching < -diameter * MIN_BALL_CCD_IMPACT_SPEED ? 0 : Infinity;
  }

  const relativeSpeedSquared = rvx * rvx + rvz * rvz;
  // Conservative linear broadphase. Cloth acceleration changes relative
  // displacement by at most ~2*mu_s*g*dt² during this short interval.
  // A ball with zero translation but residual topspin can still accelerate
  // into another ball. Do not reject such a pair from velocity alone.
  const nearestLinearTime = relativeSpeedSquared > 1e-9 && approaching < 0
    ? Math.min(duration, -approaching / relativeSpeedSquared) : 0;
  const linearX = dx + rvx * nearestLinearTime;
  const linearZ = dz + rvz * nearestLinearTime;
  const margin = 2 * SLIDE_DECEL * duration * duration + CONTACT_EPS;
  if (linearX * linearX + linearZ * linearZ > (diameter + margin) ** 2) return Infinity;

  // Golden-section minimisation also finds very shallow tangential touches,
  // where both interval endpoints lie outside the collision diameter.
  let lo = 0, hi = duration;
  const ratio = 0.6180339887498949;
  let left = hi - ratio * (hi - lo);
  let right = lo + ratio * (hi - lo);
  let dLeft = separationSquaredAt(a, b, left, profile);
  let dRight = separationSquaredAt(a, b, right, profile);
  for (let i = 0; i < 24; i++) {
    if (dLeft < dRight) {
      hi = right;
      right = left; dRight = dLeft;
      left = hi - ratio * (hi - lo);
      dLeft = separationSquaredAt(a, b, left, profile);
    } else {
      lo = left;
      left = right; dLeft = dRight;
      right = lo + ratio * (hi - lo);
      dRight = separationSquaredAt(a, b, right, profile);
    }
  }
  const minimumTime = (lo + hi) * 0.5;
  if (separationSquaredAt(a, b, minimumTime, profile) > diameterSquared) return Infinity;

  // First entry into contact, to sub-microsecond numerical precision.
  lo = 0; hi = minimumTime;
  for (let i = 0; i < 28; i++) {
    const middle = (lo + hi) * 0.5;
    if (separationSquaredAt(a, b, middle, profile) > diameterSquared) lo = middle;
    else hi = middle;
  }
  const pa = predictAtTime(a, hi, profile), pb = predictAtTime(b, hi, profile);
  const contactDx = pb.x - pa.x, contactDz = pb.z - pa.z;
  const contactDistance = Math.hypot(contactDx, contactDz) || diameter;
  const closingSpeed = ((pb.vx - pa.vx) * contactDx + (pb.vz - pa.vz) * contactDz) / contactDistance;
  return closingSpeed < -MIN_BALL_CCD_IMPACT_SPEED ? hi : Infinity;
}

function advanceAll(balls, dt, profile) {
  if (dt <= 0) return;
  for (const b of balls) if (b.active) advanceBall(b, dt, profile);
}

function closestRailPoint(x, z, rail) {
  const sx = rail.x1 - rail.x0, sz = rail.z1 - rail.z0;
  const t = Math.max(0, Math.min(1,
    ((x - rail.x0) * sx + (z - rail.z0) * sz) / (sx * sx + sz * sz)));
  return {x: rail.x0 + t * sx, z: rail.z0 + t * sz};
}

function cushionNormalSpeed(b, nx, nz) {
  const tx = -nz, tz = nx;
  return b.vx * nx + b.vz * nz -
    NOSE_VERTICAL_OFFSET * (b.wx * tx + b.wz * tz);
}

function distanceToRailSquared(b, rail, t, profile) {
  const predicted = predictAtTime(b, t, profile);
  const closest = closestRailPoint(predicted.x, predicted.z, rail);
  return (predicted.x - closest.x) ** 2 + (predicted.z - closest.z) ** 2;
}

function railApproachSpeed(b,nx,nz,rail,profile,model) {
  return profile==='pool'&&rail.kind==='rail'&&model==='coupled-v068'?
    b.vx*nx+b.vz*nz:cushionNormalSpeed(b,nx,nz);
}

function railTimeOfImpact(b, rail, duration, profile,model) {
  if (!b.active || duration <= TIME_EPS) return Infinity;
  const closest = closestRailPoint(b.x, b.z, rail);
  const dx = b.x - closest.x, dz = b.z - closest.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= NOSE_REACH + CONTACT_EPS) {
    const nx = distance > 1e-9 ? dx / distance : rail.nx;
    const nz = distance > 1e-9 ? dz / distance : rail.nz;
    return railApproachSpeed(b,nx,nz,rail,profile,model) < -1e-7 ? 0 : Infinity;
  }

  const speed = Math.hypot(b.vx, b.vz);
  const bound = NOSE_REACH + speed * duration + SLIDE_DECEL * duration ** 2;
  if (distance > bound) return Infinity;

  // Capsule-to-point sweep against both the straight rail and the rounded
  // jaw tip. Account for frictional acceleration when locating first contact.
  let lo = 0, hi = duration;
  const ratio = 0.6180339887498949;
  let left = hi - ratio * (hi - lo);
  let right = lo + ratio * (hi - lo);
  let dLeft = distanceToRailSquared(b, rail, left, profile);
  let dRight = distanceToRailSquared(b, rail, right, profile);
  for (let i = 0; i < 22; i++) {
    if (dLeft < dRight) {
      hi = right;
      right = left; dRight = dLeft;
      left = hi - ratio * (hi - lo);
      dLeft = distanceToRailSquared(b, rail, left, profile);
    } else {
      lo = left;
      left = right; dLeft = dRight;
      right = lo + ratio * (hi - lo);
      dRight = distanceToRailSquared(b, rail, right, profile);
    }
  }
  const minimumTime = (lo + hi) * 0.5;
  if (distanceToRailSquared(b, rail, minimumTime, profile) > NOSE_REACH ** 2) return Infinity;

  lo = 0; hi = minimumTime;
  for (let i = 0; i < 27; i++) {
    const mid = (lo + hi) * 0.5;
    if (distanceToRailSquared(b, rail, mid, profile) > NOSE_REACH ** 2) lo = mid;
    else hi = mid;
  }
  return hi;
}

function advanceWithContactEvents(balls, duration, callbacks, timeOffset) {
  const profile=callbacks.cushionProfile||DEFAULT_CUSHION_PROFILE;
  let elapsed = 0;
  let eventCount = 0;
  while (elapsed < duration - TIME_EPS && eventCount < MAX_COLLISION_EVENTS) {
    const remaining = duration - elapsed;
    let earliestTime = Infinity;
    let event = null;
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const time = ballBallTimeOfImpact(balls[i], balls[j], remaining, profile);
        if (time < earliestTime) {
          earliestTime = time;
          event = {type: 'ball', a: balls[i], b: balls[j]};
        }
      }
    }
    for (const b of balls) {
      if (!b.active) continue;
      for (const rail of RAILS) {
        const time = railTimeOfImpact(b, rail, remaining, profile,callbacks.cushionModel);
        if (time < earliestTime) {
          earliestTime = time;
          event = {type: 'cushion', ball: b, rail};
        }
      }
    }

    if (!event || earliestTime >= remaining) break;
    advanceAll(balls, earliestTime, profile);
    elapsed += earliestTime;
    let impactSpeed;
    if (event.type === 'ball') {
      const simultaneous=resolveSimultaneousBallContacts(balls,event.a,event.b);
      if(simultaneous){
        for(const c of simultaneous.reports){
          if(c.speed>1e-7)callbacks.onBallContact?.(c.a,c.b,c.speed,timeOffset+elapsed+c.time);
          if(c.speed>0.045)callbacks.onCollision?.(c.a,c.b,c.speed,timeOffset+elapsed+c.time);
        }
        elapsed+=simultaneous.advanced;
        if(elapsed>duration)balls._advanceCredit=(balls._advanceCredit||0)+(elapsed-duration);
        // The cluster has already been advanced using a finer force model.
        // Leave its contacts to that model until the time credit is consumed.
        if(elapsed>=duration)return true;
        continue;
      }else{
        impactSpeed = resolveBallCollision(event.a, event.b);
        if(impactSpeed>1e-7)callbacks.onBallContact?.(event.a,event.b,impactSpeed,timeOffset+elapsed);
        if (impactSpeed > 0.045) callbacks.onCollision?.(event.a, event.b, impactSpeed, timeOffset + elapsed);
      }
    } else {
      impactSpeed = bounceCushion(event.ball,event.rail,
        callbacks.cushionProfile,callbacks.cushionModel,callbacks.cushionParameters,
        b=>callbacks.onBeforeRailContact?.(b,timeOffset+elapsed,event.rail.kind));
      if(impactSpeed>1e-7)callbacks.onRailContact?.(event.ball,impactSpeed,timeOffset+elapsed,event.rail.kind);
      if (impactSpeed > 0.045) callbacks.onCushion?.(event.ball, impactSpeed, timeOffset + elapsed, event.rail.kind);
    }
    eventCount++;

    // Pathological simultaneous contact with no applicable impulse must not
    // pin the event clock to t=0 indefinitely.
    if (impactSpeed <= 1e-7) {
      const tinyStep = Math.min(duration - elapsed, 1e-7);
      advanceAll(balls, tinyStep, profile);
      elapsed += tinyStep;
    }
  }
  if (elapsed < duration) advanceAll(balls, duration - elapsed, profile);
  if (eventCount === MAX_COLLISION_EVENTS) callbacks.onEventLimit?.();
  return false;
}

function bounceCushion(b, rail, profile = DEFAULT_CUSHION_PROFILE,
  cushionModel='empirical',cushionParameters,beforeImpact) {
  const closest = closestRailPoint(b.x, b.z, rail);
  const dx = b.x - closest.x, dz = b.z - closest.z;
  const distance = Math.hypot(dx, dz);
  if (distance > NOSE_REACH + CONTACT_EPS) return 0;

  const nx = distance > 1e-9 ? dx / distance : rail.nx;
  const nz = distance > 1e-9 ? dz / distance : rail.nz;
  const overlap = Math.max(0, NOSE_REACH - distance);
  if (overlap > 0) {
    b.x += nx * (overlap + 1e-8);
    b.z += nz * (overlap + 1e-8);
  }
  const tx = -nz, tz = nx;
  // The cushion nose is above the centre of the ball. This offset couples
  // normal rebound with topspin/backspin instead of simply negating vx/vz.
  const normalSpeed = railApproachSpeed(b,nx,nz,rail,profile,cushionModel);
  if (normalSpeed >= -1e-7) return 0;
  beforeImpact?.(b);
  // The empirical pool shear impulse must never create total translational
  // plus rotational energy. Evaluate before the rail impulse, not after skid.
  const preImpactEnergy=profile==='pool'&&rail.kind==='rail'?
    0.5*PHYSICS.mass*(b.vx*b.vx+b.vz*b.vz)+
    0.5*INERTIA*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz):0;

  // Pool: restitution effective computed from the TUM pool regression for
  // speed and angle, calibrated to post-skid NORMAL speed. Snooker: keep the
  // exact v0.14 Mathavan fit to immediate rebound speeds. These coefficients
  // are not interchangeable with intrinsic rubber material restitution.
  const incomingLinearNormal=Math.abs(b.vx*nx+b.vz*nz);
  const incomingTotalSpeed=Math.hypot(b.vx,b.vz);
  const incomingLinearTangent=b.vx*tx+b.vz*tz;
  const incidenceAngle=Math.acos(Math.max(0,Math.min(1,
    incomingLinearNormal/Math.max(incomingTotalSpeed,1e-9))));
  const noseRatio=NOSE_VERTICAL_OFFSET/RADIUS;
  const noseCoupling=(1+noseRatio)/(1+2.5*noseRatio*noseRatio);
  const restitution=rail.kind==='facing'?PHYSICS.facingRestitution:
    cushionRestitutionFor(profile,incomingLinearNormal,noseCoupling,
      incidenceAngle,incomingTotalSpeed,noseRatio);
  if(profile==='pool'&&rail.kind==='rail'&&cushionModel==='coupled-v068') {
    return resolveSeparatedRailImpact(b,nx,nz,{
      mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,
      restitution,parameters:cushionParameters||COUPLED_POOL_RAIL_V021
    }).speed;
  }
  if(profile==='pool'&&rail.kind==='rail'&&
    (cushionModel==='coupled-3d'||cushionModel==='coupled-v021')) {
    return resolveCoupledRailImpact(b,nx,nz,{
      mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,
      restitution,parameters:cushionParameters||(
        cushionModel==='coupled-v021'?COUPLED_POOL_RAIL_V021:COUPLED_POOL_RAIL)
    }).speed;
  }
  if(profile==='pool'&&rail.kind==='rail'&&
    (cushionModel==='compliant'||cushionModel==='compliant-tuned')) {
    // Experimental Stronge-inspired two-spring contact. It uses the SAME
    // empirically constrained normal restitution but does NOT also apply the
    // v0.17 inverse-fitted tangential friction law (no double calibration).
    return resolveCompliantRailImpact(b,nx,nz,{
      mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,
      restitution,parameters:cushionParameters||(
        cushionModel==='compliant-tuned'?COMPLIANT_POOL_RAIL_TUNED:COMPLIANT_POOL_RAIL)
    }).speed;
  }
  const jn = -(1 + restitution) * normalSpeed /
    (INVERSE_MASS + NOSE_VERTICAL_OFFSET ** 2 * INVERSE_INERTIA);
  b.vx += jn * nx * INVERSE_MASS;
  b.vz += jn * nz * INVERSE_MASS;
  b.wx -= NOSE_VERTICAL_OFFSET * jn * tx * INVERSE_INERTIA;
  b.wz -= NOSE_VERTICAL_OFFSET * jn * tz * INVERSE_INERTIA;
  const postNormalEnergy=preImpactEnergy>0?
    0.5*PHYSICS.mass*(b.vx*b.vx+b.vz*b.vz)+
    0.5*INERTIA*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz):0;
  const tangentSpeed = b.vx * tx + b.vz * tz + NOSE_REACH * b.wy +
    NOSE_VERTICAL_OFFSET * (b.wx * nx + b.wz * nz);
  const friction = rail.kind === 'facing' ? PHYSICS.facingFriction :
    profile==='pool'?poolEffectiveRailFriction(incomingTotalSpeed,
      incidenceAngle,restitution,noseRatio,PHYSICS.mass):
      CUSHION_PROFILES[profile].friction;
  const limit = friction * jn;
  const rigidJt=Math.max(-limit,
    Math.min(limit, -tangentSpeed / (INVERSE_MASS + RADIUS * RADIUS * INVERSE_INERTIA)));
  let jt=rigidJt;
  if(profile==='pool'&&rail.kind==='rail') {
    // TUM's SECOND fitted observable, delta_v, is the tangential speed
    // retained AFTER cushion contact for a naturally rolling, no-spin ball.
    // Find the *additional* tangential impulse relative to the existing
    // rigid contact solution so we do not double-apply post-rail cloth skid.
    // Under natural roll, v_t,post = v_t,in + 5*(1+h/R)*j_t/(7m).
    // The upper friction envelope is inversely identified from the same
    // pool observations (not measured rubber friction); the hard ceiling
    // prevents unlimited grazing-angle extrapolation. Spin is still handled
    // by the 3D contact impulse and the exact energy safeguard below.
    const retention=poolRailReference(incomingTotalSpeed,incidenceAngle)
      .postRollTangentialRatio;
    const naturalNormalSpeed=incomingLinearNormal*(1+noseRatio);
    const naturalJn=(1+restitution)*naturalNormalSpeed/
      (INVERSE_MASS+NOSE_VERTICAL_OFFSET**2*INVERSE_INERTIA);
    const naturalLimit=friction*naturalJn;
    const naturalJt=Math.max(-naturalLimit,Math.min(naturalLimit,
      -(1+noseRatio)*incomingLinearTangent/
      (INVERSE_MASS+RADIUS**2*INVERSE_INERTIA)));
    const gain=5*(1+noseRatio)*INVERSE_MASS/7;
    const targetJt=(retention-1)*incomingLinearTangent/gain;
    jt=Math.max(-limit,Math.min(limit,rigidJt+targetJt-naturalJt));
    // With substantial sidespin/draw, the no-spin pool regression is an
    // extrapolation. Constrain its correction by the exact quadratic impulse
    // energy relation E_after = E_normal + s_t*j + 0.5*k_t*j*j.
    const k=INVERSE_MASS+RADIUS**2*INVERSE_INERTIA;
    const discriminant=tangentSpeed*tangentSpeed+
      2*k*Math.max(0,preImpactEnergy-postNormalEnergy);
    const root=Math.sqrt(discriminant);
    jt=Math.max((-tangentSpeed-root)/k,
      Math.min((-tangentSpeed+root)/k,jt));
  }
  b.vx += jt * tx * INVERSE_MASS;
  b.vz += jt * tz * INVERSE_MASS;
  b.wx += NOSE_VERTICAL_OFFSET * jt * nx * INVERSE_INERTIA;
  b.wz += NOSE_VERTICAL_OFFSET * jt * nz * INVERSE_INERTIA;
  b.wy += NOSE_REACH * jt * INVERSE_INERTIA;
  return -normalSpeed;
}

export function pocketSupportClearance(x,z){
  let clearance=0;
  for(const {p,geometry} of POCKET_APERTURES){
    if(p.kind==='corner'){
      if(Math.abs(x-p.x)>.09||Math.abs(z-p.z)>.09)continue;
    }else if(Math.abs(x-p.x)>.09||p.sz*(z-p.z)<-.025||
      p.sz*(z-p.z)>.12)continue;
    clearance=Math.max(clearance,pocketApertureClearance(geometry,x,z));
  }
  return clearance;
}
function inPocket(b) {
  // Match capture to the *actual drawn opening*: the ball's projected centre
  // enters its polygon, triggering an irreversible fall. The previous extra
  // ball-radius inset left the visible black opening ahead of the capture
  // zone, so balls appeared to float over a perfectly open pocket.
  return pocketSupportClearance(b.x,b.z)>0;
}

export function isMoving(b) {
  return b.active && (Math.hypot(b.vx, b.vz) > SPEED_EPS ||
    Math.hypot(b.wx, b.wz) * RADIUS > SLIP_EPS || Math.abs(b.wy) > SPIN_EPS);
}

export function simulatePhysics(balls, dt, callbacks = {}) {
  if (dt <= 0) return false;
  const profile=callbacks.cushionProfile||DEFAULT_CUSHION_PROFILE;
  if(!CUSHION_PROFILES[profile])
    throw new RangeError(`Profil de bande inconnu : ${profile}`);
  if(callbacks.cushionModel&&!CUSHION_MODELS.includes(callbacks.cushionModel))
    throw new RangeError(`Modèle de contact de bande inconnu : ${callbacks.cushionModel}`);
  let maxSpeed = 0;
  for (const b of balls) if (b.active) maxSpeed = Math.max(maxSpeed, Math.hypot(b.vx, b.vz));
  // At hard break speeds an ordinary 240 Hz step crosses ~20 mm. Smaller
  // internal steps keep contacts from skipping thin grazing intersections.
  const subdivisions = Math.max(1, Math.min(24, Math.ceil(maxSpeed * dt / (RADIUS * 0.25))));
  const h = dt / subdivisions;

  for (let step = 0; step < subdivisions; step++) {
    const credited=Math.min(h,balls._advanceCredit||0);
    if(credited){
      balls._advanceCredit-=credited;
      if(h-credited<TIME_EPS)continue;
    }
    const burst=advanceWithContactEvents(balls,h-credited,callbacks,step*h+credited);
    if(burst)continue;
    for (const b of balls) {
      if (!b.active) continue;
      if (inPocket(b)) {
        stopBall(b);
        b.active = false;
        callbacks.onPocket?.(b);
        continue;
      }
      for (const rail of RAILS) {
        const impactSpeed = bounceCushion(b,rail,
          callbacks.cushionProfile,callbacks.cushionModel,callbacks.cushionParameters,
          hit=>callbacks.onBeforeRailContact?.(hit,(step+1)*h,rail.kind));
        if(impactSpeed>1e-7)callbacks.onRailContact?.(b,impactSpeed,(step+1)*h,rail.kind);
        if (impactSpeed > 0.045) callbacks.onCushion?.(b, impactSpeed);
      }
    }
    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const impactSpeed = resolveBallCollision(balls[i], balls[j]);
        if(impactSpeed>1e-7)callbacks.onBallContact?.(balls[i],balls[j],impactSpeed,(step+1)*h);
        if (impactSpeed > 0.045) callbacks.onCollision?.(balls[i], balls[j], impactSpeed, (step + 1) * h);
      }
    }
    for (const b of balls) {
      if (b.active && inPocket(b)) {
        stopBall(b);
        b.active = false;
        callbacks.onPocket?.(b);
      }
    }
  }
  return balls.some(isMoving);
}
