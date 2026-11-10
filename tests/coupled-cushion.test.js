import test from 'node:test';
import assert from 'node:assert/strict';
import {CUSHION_MODELS,makePhysicsBody,simulatePhysics,
  NOSE_HEIGHT,RADIUS,PHYSICS,WIDTH} from '../dist/physics.js';
import {COUPLED_POOL_RAIL,resolveCoupledRailImpact} from '../dist/coupled-cushion.js';
import {runCalibration} from '../dist/calibration.js';
import {measurePoolObliqueRailRebound} from '../dist/experimental.js';
import {predictTrajectory} from '../dist/trajectory.js';
import {getLabScenario} from '../dist/lab.js';
import {strikeBall} from '../dist/physics.js';
import {powerToCueSpeed} from '../dist/power.js';

const I=0.4*PHYSICS.mass*RADIUS**2;
const h=NOSE_HEIGHT-RADIUS;
const reach=Math.sqrt(RADIUS**2-h**2);
const energy=b=>0.5*PHYSICS.mass*(b.vx*b.vx+b.vz*b.vz)+
  0.5*I*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz);
const nSpeed=(b,nx,nz)=>b.vx*nx+b.vz*nz-
  h*(-nz*b.wx+nx*b.wz);
const contact=(b,nx=-1,nz=0,parameters=COUPLED_POOL_RAIL)=>
  resolveCoupledRailImpact(b,nx,nz,{
    mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,
    restitution:0.73,parameters
  });

test('v0.20 and v0.21 are separately selectable alongside earlier rail models',()=>{
  assert.deepEqual(CUSHION_MODELS,
    ['empirical','compliant','compliant-tuned','coupled-3d','coupled-v021','coupled-v068']);
  assert.equal(COUPLED_POOL_RAIL.verticalToHorizontalStiffness,1);
});

test('3D rail shear couples vertical rolling velocity into normal impulse',()=>{
  const ball=makePhysicsBody(0,0,0);
  ball.vx=1.2;ball.wz=-1.2/RADIUS;
  const input=nSpeed(ball,-1,0);
  const result=contact(ball);
  assert.ok(result.normalImpulse>0);
  assert.ok(Math.abs(result.verticalImpulse)>1e-6,JSON.stringify(result));
  assert.ok(Math.abs(nSpeed(ball,-1,0)+0.73*input)<1e-10);
  assert.ok(result.slidingSteps>0&&result.stickingSteps>0);
});

test('normal and two shear impulses satisfy rotational kinematics',()=>{
  const ball=makePhysicsBody(0,0,0);
  ball.vx=1.4;ball.vz=0.6;
  ball.wx=22;ball.wy=-15;ball.wz=-33;
  const before={...ball};
  const res=contact(ball);
  const {normalImpulse:jn,tangentialImpulse:jt,verticalImpulse:ju}=res;
  assert.ok(Math.abs((ball.vx-before.vx)-(-jn/PHYSICS.mass))<1e-10);
  assert.ok(Math.abs((ball.vz-before.vz)-(-jt/PHYSICS.mass))<1e-10);
  assert.ok(Math.abs((ball.wz-before.wz)-
    (h*jn+reach*ju)/I)<1e-9);
  assert.ok(Math.abs((ball.wx-before.wx)+h*jt/I)<1e-9);
  assert.ok(Math.abs((ball.wy-before.wy)-reach*jt/I)<1e-9);
});

test('coupled impulse never adds kinetic energy across speed, incidence, spin and roll',()=>{
  for(const speed of [0.2,0.5,2.3,4])for(const deg of [0,30,60,75])
    for(const spin of [-4,-1,0,1,4])for(const roll of [-2,0,1,2]) {
      const a=deg*Math.PI/180;
      const ball=makePhysicsBody(0,0,0);
      ball.vx=speed*Math.cos(a);ball.vz=speed*Math.sin(a);
      ball.wx=ball.vz/RADIUS*roll;
      ball.wz=-ball.vx/RADIUS*roll;
      ball.wy=spin*speed/RADIUS;
      const before=energy(ball);
      const res=contact(ball);
      assert.ok(res.normalImpulse>0);
      assert.ok(energy(ball)<=before+1e-9,
        `energy gain speed=${speed} angle=${deg} spin=${spin} roll=${roll}`);
      assert.ok([ball.vx,ball.vz,ball.wx,ball.wy,ball.wz].every(Number.isFinite));
    }
});

test('3D coupling is resolved with stable time-step refinement',()=>{
  const b=makePhysicsBody(0,0,0);
  b.vx=1.4;b.vz=0.6;b.wx=14;b.wy=16;b.wz=-34;
  const fine={...b},veryFine={...b};
  contact(fine,-1,0,{...COUPLED_POOL_RAIL,integrationSteps:640});
  contact(veryFine,-1,0,{...COUPLED_POOL_RAIL,integrationSteps:1280});
  assert.ok(Math.hypot(fine.vx-veryFine.vx,fine.vz-veryFine.vz)<0.03);
  assert.ok(Math.hypot(fine.wx-veryFine.wx,fine.wz-veryFine.wz)*RADIUS<0.04);
});

test('coupled pool solver leaves the snooker model bit-for-bit intact',()=>{
  const ball=makePhysicsBody(0,0,WIDTH-reach-0.001);
  ball.vz=1.1;ball.wx=1.1/RADIUS;
  const a={...ball},b={...ball};
  for(let i=0;i<50;i++) {
    simulatePhysics([a],0.0005,{cushionProfile:'snooker'});
    simulatePhysics([b],0.0005,{cushionProfile:'snooker',cushionModel:'coupled-3d'});
  }
  for(const key of ['x','z','vx','vz','wx','wy','wz'])assert.equal(a[key],b[key]);
});

test('new mode works in pool experiments and the existing 57-case bench',()=>{
  const shot=measurePoolObliqueRailRebound({incoming:2.3,angleDeg:75,cushionModel:'coupled-3d'});
  assert.ok(Number.isFinite(shot.postRollAngleDeg));
  assert.equal(runCalibration({cushionModel:'coupled-3d'}).length,57);
});

test('v0.20 bank forecast agrees with the exact same in-game physics integration',()=>{
  const scene=getLabScenario('bank');
  const bodies=scene.balls.map(b=>makePhysicsBody(b.num,b.x,b.z));
  const forecast=predictTrajectory(bodies,scene.aim,scene.power,
    scene.spin,scene.elevation,'coupled-3d');
  const actual=bodies.map(b=>({...b}));
  strikeBall(actual[0],scene.aim,powerToCueSpeed(scene.power),
    scene.spin,{elevation:scene.elevation});
  for(let i=0;i<540;i++)simulatePhysics(actual,1/240,{cushionModel:'coupled-3d'});
  const predicted=forecast.before.at(-1);
  assert.ok(Math.hypot(predicted.x-actual[0].x,predicted.z-actual[0].z)<1e-5);
});
