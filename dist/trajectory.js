import {makePhysicsBody, strikeBall, simulatePhysics, isMoving, RADIUS} from './physics.js?v=0.69';
import {powerToCueSpeed} from './power.js';

// The guide is a dry run of the shot, not an idealised 90-degree tangent.
// A one-ball sweep finds the first contact cheaply; the real multi-ball
// collision solver then determines both outgoing trajectories, including the
// sliding-to-rolling transition, throw and interactions with a tight rack.
const STEP = 1 / 240;
const PREVIEW_STEPS = 540;
const AFTER_STEPS = 72;
const PATH_LIMIT = 0.62;

function copyBall(ball) {
  return {...makePhysicsBody(ball.num, ball.x, ball.z),
    vx:ball.vx, vz:ball.vz, wx:ball.wx, wy:ball.wy, wz:ball.wz,
    state:ball.state, active:ball.active};
}

function point(ball) {return {x:ball.x,z:ball.z};}

function pushPoint(path, p) {
  const last=path.at(-1);
  if(!last||Math.hypot(last.x-p.x,last.z-p.z)>0.0001)path.push(point(p));
}

function sweptBallFraction(start, end, target) {
  const dx=end.x-start.x,dz=end.z-start.z;
  const rx=start.x-target.x,rz=start.z-target.z;
  const a=dx*dx+dz*dz;
  const c=rx*rx+rz*rz-4*RADIUS*RADIUS;
  if(c<=0)return 0;
  if(a<1e-14)return Infinity;
  const b=2*(rx*dx+rz*dz);
  const discriminant=b*b-4*a*c;
  if(b>=0||discriminant<0)return Infinity;
  const fraction=(-b-Math.sqrt(discriminant))/(2*a);
  return fraction>=0&&fraction<=1?fraction:Infinity;
}

function limitedPath(path, next, travelled) {
  const last=path.at(-1);
  if(!last||travelled>=PATH_LIMIT)return travelled;
  const delta=Math.hypot(next.x-last.x,next.z-last.z);
  if(delta<0.0001)return travelled;
  const portion=Math.min(1,(PATH_LIMIT-travelled)/delta);
  path.push({x:last.x+(next.x-last.x)*portion,z:last.z+(next.z-last.z)*portion});
  return travelled+delta*portion;
}

export function predictTrajectory(physicalBalls, aim, power, spin={x:0,y:0},
  elevation=0,cushionModel='empirical') {
  const initial=physicalBalls.filter(b=>b.active).map(copyBall);
  const solo=initial.find(b=>b.num===0);
  if(!solo)return null;
  const targets=initial.filter(b=>b.num!==0);
  strikeBall(solo,aim,powerToCueSpeed(power),spin,{elevation});
  const before=[point(solo)];
  let travelledTime=0;

  for(let step=0;step<PREVIEW_STEPS&&solo.active&&isMoving(solo);step++) {
    const previous={...solo};
    simulatePhysics([solo],STEP,{cushionModel});

    let firstTarget=null,firstFraction=Infinity;
    for(const target of targets) {
      const fraction=sweptBallFraction(previous,solo,target);
      if(fraction<firstFraction){firstFraction=fraction;firstTarget=target;}
    }

    if(firstTarget) {
      // Restore the moment before impact. The same full-table physics step
      // used by the game resolves this hit (and its simultaneous contacts).
      const full=initial.map(copyBall);
      const white=full.find(b=>b.num===0);
      Object.assign(white,previous);
      let actualFirst=null;
      simulatePhysics(full,STEP,{
        cushionModel,
        onCollision:(a,b)=>{
          if(actualFirst===null&&(a.num===0||b.num===0))
            actualFirst=a.num===0?b.num:a.num;
        }
      });
      if(actualFirst===null) {
        if(step%3===0)pushPoint(before,solo);
        travelledTime+=STEP;
        continue;
      }

      const hit=full.find(b=>b.num===actualFirst);
      const contact={x:previous.x+(solo.x-previous.x)*firstFraction,
        z:previous.z+(solo.z-previous.z)*firstFraction};
      pushPoint(before,contact);
      const whiteAfter=[contact];
      const objectAfter=[point(hit)];
      let whiteTravel=limitedPath(whiteAfter,white,0);
      let objectTravel=0;
      for(let i=0;i<AFTER_STEPS;i++) {
        if(!full.some(isMoving))break;
        simulatePhysics(full,STEP,{cushionModel});
        if(i%2===1||i===AFTER_STEPS-1) {
          if(white.active)whiteTravel=limitedPath(whiteAfter,white,whiteTravel);
          if(hit.active)objectTravel=limitedPath(objectAfter,hit,objectTravel);
        }
        if(whiteTravel>=PATH_LIMIT&&objectTravel>=PATH_LIMIT)break;
      }
      return {before,whiteAfter,objectAfter,contact,firstObject:actualFirst,
        firstContactTime:travelledTime+STEP*firstFraction};
    }
    if(step%3===0)pushPoint(before,solo);
    travelledTime+=STEP;
  }

  pushPoint(before,solo);
  return {before,whiteAfter:[],objectAfter:[],contact:null,firstObject:null,
    firstContactTime:null};
}
