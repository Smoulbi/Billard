// Independently published billiards experiments used as observable benchmarks.
// Do not confuse direct measurements with values predicted by a published fit.
import {LENGTH, WIDTH, RADIUS, PHYSICS, makePhysicsBody,
  resolveBallCollision, simulatePhysics} from './physics.js';
import {snookerReboundFit} from './cushion-profiles.js';

export const MATHAVAN_2009_URL = 'https://doi.org/10.1119/1.3157159';
export const MATHAVAN_2009_PDF = 'https://drdavepoolinfo.com/physics_articles/ajp_09_hsv_article.pdf';

// Mathavan, Jackson & Parkin, American Journal of Physics 77 (2009), Table I,
// p. 793. The two recorded speeds are measured AFTER the post-impact sliding
// phase, not immediately after the impulsive impact. Ball diameter was 52.4 mm.
export const PUBLISHED_COLLISIONS = Object.freeze([
  {incoming:1.539,cut:33.83,cue:0.816,object:0.836},
  {incoming:1.032,cut:26.36,cue:0.520,object:0.629},
  {incoming:1.364,cut:40.52,cue:0.925,object:0.700},
  {incoming:1.731,cut:46.50,cue:1.275,object:0.787},
  {incoming:0.942,cut:18.05,cue:0.365,object:0.581},
].map(Object.freeze));

function slipMagnitude(b) {
  return Math.hypot(b.vx+RADIUS*b.wz,b.vz-RADIUS*b.wx);
}

// Reproduce the impact with a naturally rolling cue ball. Capture each ball's
// speed on its FIRST return to pure roll; later friction is not part of the
// published post-slip speed measurement. No cue-stick or random input here.
export function measurePostSlipCollision(record) {
  const angle=record.cut*Math.PI/180;
  const cue=makePhysicsBody(0,0,0);
  const object=makePhysicsBody(1,
    2*RADIUS*Math.cos(angle),2*RADIUS*Math.sin(angle));
  cue.vx=record.incoming;
  cue.wz=-record.incoming/RADIUS;
  if(resolveBallCollision(cue,object)<=0)
    throw new Error('La collision expérimentale n’a pas été résolue.');
  let cueSpeed=null,objectSpeed=null;
  for(let i=0;i<800;i++) {
    if(cueSpeed===null&&slipMagnitude(cue)<0.002)
      cueSpeed=Math.hypot(cue.vx,cue.vz);
    if(objectSpeed===null&&slipMagnitude(object)<0.002)
      objectSpeed=Math.hypot(object.vx,object.vz);
    if(cueSpeed!==null&&objectSpeed!==null)break;
    simulatePhysics([cue,object],0.001);
  }
  if(cueSpeed===null||objectSpeed===null)
    throw new Error('Retour au roulement introuvable pour la collision expérimentale.');
  return {cue:cueSpeed,object:objectSpeed};
}

// Fig. 9 of the same paper describes 31 perpendicular cushion shots
// between 0.28 and 3.5 m/s, and publishes this regression (m/s). Values
// calculated here are predictions FROM their regression, not direct samples.
export function publishedCushionFit(incoming) {
  return snookerReboundFit(incoming);
}

function initialRollingRailBall(incoming) {
  // Starting near the cushion avoids confusing the measured contact speed
  // with a substantially larger launch speed reduced by cloth friction.
  const noseHeight=2*RADIUS*0.635;
  const noseReach=Math.sqrt(RADIUS**2-(noseHeight-RADIUS)**2);
  const cue=makePhysicsBody(0,LENGTH-noseReach-0.001,0);
  cue.vx=incoming;
  cue.wz=-incoming/RADIUS;
  return cue;
}

export function measureRailRebound(incoming, profile='snooker') {
  const cue=initialRollingRailBall(incoming);
  let rebound=null;
  for(let i=0;i<30&&rebound===null;i++)
    simulatePhysics([cue],0.0005,{cushionProfile:profile,
      onCushion:(b)=>{rebound=Math.hypot(b.vx,b.vz);}});
  if(rebound===null)throw new Error('Rebond de référence non détecté.');
  return rebound;
}

// Observable used for pool calibration: speed after the cushion impulse AND
// the first post-impact skid, which is not the same quantity as the immediate
// speed fitted by Mathavan's snooker study.
export function measurePostSlideRailRebound(incoming, profile='pool',cushionModel='empirical') {
  const cue=initialRollingRailBall(incoming);
  let impacted=false;
  for(let i=0;i<2500;i++) {
    simulatePhysics([cue],0.0005,{cushionProfile:profile,cushionModel,
      onCushion:()=>{impacted=true;}});
    if(impacted && slipMagnitude(cue)<0.002)
      return Math.hypot(cue.vx,cue.vz);
  }
  throw new Error('Retour au roulement introuvable après le rebond.');
}

// Reproducible pool long-rail diagnostic. Incidence is measured from the rail
// normal; positive tangent is +x, and vertical sidespin is specified as a
// fraction of incoming ball-surface speed. Positions avoid pocket cutouts.
// The published TUM regression applies to sidespin=0 and incoming natural roll.
export function measurePoolObliqueRailRebound({incoming,angleDeg=0,sidespin=0,
  profile='pool',cushionModel='empirical',cushionParameters}={}) {
  if(!(incoming>0) || !Number.isFinite(angleDeg) || angleDeg<0 || angleDeg>=85)
    throw new RangeError('Vitesse ou angle de bande expérimental invalide.');
  const noseHeight=2*RADIUS*0.635;
  const noseReach=Math.sqrt(RADIUS**2-(noseHeight-RADIUS)**2);
  const angle=angleDeg*Math.PI/180;
  const incomingNormal=incoming*Math.cos(angle);
  const incomingTangent=incoming*Math.sin(angle);
  const b=makePhysicsBody(0,-0.40,WIDTH-noseReach-0.002);
  b.vx=incomingTangent;
  b.vz=incomingNormal;
  b.wx=b.vz/RADIUS;
  b.wz=-b.vx/RADIUS;
  b.wy=sidespin*incoming/RADIUS;
  let immediate=null;
  for(let i=0;i<2500;i++) {
    simulatePhysics([b],0.0005,{cushionProfile:profile,cushionModel,cushionParameters,
      onCushion:hit=>{
        if(immediate===null)immediate={normal:-hit.vz,tangent:hit.vx,
          spin:hit.wy};
      }});
    if(immediate!==null&&slipMagnitude(b)<0.002){
      return {incomingNormal,incomingTangent,immediate,
        postRollNormal:-b.vz,postRollTangent:b.vx,
        postRollSpeed:Math.hypot(b.vx,b.vz),
        postRollAngleDeg:Math.atan2(Math.abs(b.vx),Math.abs(b.vz))*180/Math.PI};
    }
  }
  throw new Error('Rebond oblique ou retour au roulement introuvable.');
}

export function measureRollingDeceleration(profile='snooker') {
  const b=makePhysicsBody(0,-0.75,0);
  b.vx=0.5;
  b.wz=-0.5/RADIUS;
  for(let i=0;i<120;i++)simulatePhysics([b],1/240,{cushionProfile:profile});
  return (0.5-Math.hypot(b.vx,b.vz))/0.5;
}
