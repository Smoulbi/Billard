import test from 'node:test';
import assert from 'node:assert/strict';
import {RADIUS,WIDTH,NOSE_HEIGHT,PHYSICS,makePhysicsBody,
  simulatePhysics} from '../dist/physics.js';
import {COMPLIANT_POOL_RAIL,resolveCompliantRailImpact}
  from '../dist/compliant-cushion.js';
import {poolRailReference} from '../dist/cushion-profiles.js';
import {measurePoolObliqueRailRebound,measurePostSlideRailRebound}
  from '../dist/experimental.js';
import {runCalibration} from '../dist/calibration.js';
import {predictTrajectory} from '../dist/trajectory.js';
import {getLabScenario} from '../dist/lab.js';
import {strikeBall} from '../dist/physics.js';
import {powerToCueSpeed} from '../dist/power.js';

const I=0.4*PHYSICS.mass*RADIUS**2;
const h=NOSE_HEIGHT-RADIUS;
const reach=Math.sqrt(RADIUS**2-h**2);
const energy=b=>0.5*PHYSICS.mass*(b.vx*b.vx+b.vz*b.vz)+
  0.5*I*(b.wx*b.wx+b.wy*b.wy+b.wz*b.wz);

test('isolated compliant normal spring returns the requested contact restitution',()=>{
  const nx=-1,nz=0,tx=-nz,tz=nx;
  const body=makePhysicsBody(0,0,0);
  body.vx=1.5;
  body.wz=-1.5/RADIUS;
  const normalContactSpeed=b=>b.vx*nx+b.vz*nz-h*(b.wx*tx+b.wz*tz);
  const incoming=normalContactSpeed(body);
  const before=energy(body);
  const result=resolveCompliantRailImpact(body,nx,nz,{
    mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,
    restitution:0.67
  });
  assert.ok(result.normalImpulse>0);
  assert.ok(Math.abs(normalContactSpeed(body)+0.67*incoming)<1e-10);
  assert.ok(result.duration>0.0005&&result.duration<0.004);
  assert.ok(Math.abs(result.tangentialImpulse)<1e-9);
  assert.ok(energy(body)<before);
});

test('compliant pool and archived pool keep distinct reproducible bank observables',()=>{
  for(const speed of [0.5,1.2,2.3]) {
    const fit=poolRailReference(speed,0).velocityRetention;
    const result=measurePostSlideRailRebound(speed,'pool','compliant')/speed;
    assert.ok(Math.abs(result-fit)<0.006,
      `normal pool contact not consistent at ${speed} m/s`);
  }
  const p={incoming:2.3,angleDeg:75};
  const reference=poolRailReference(p.incoming,p.angleDeg*Math.PI/180);
  const archived=measurePoolObliqueRailRebound(p);
  const experimental=measurePoolObliqueRailRebound({...p,cushionModel:'compliant'});
  assert.ok(Math.abs(archived.postRollSpeed/p.incoming-reference.velocityRetention)<0.005);
  assert.ok(Math.abs(experimental.postRollSpeed/p.incoming-reference.velocityRetention)>0.10,
    'experimental mode is NOT yet fitted at grazing angles; show its residual');
  assert.ok(experimental.postRollSpeed>0);
});

test('tangential spring is integrated in both sticking and sliding regimes',()=>{
  const body=makePhysicsBody(0,0,0);
  body.vx=1.2;body.vz=0.5;body.wy=2;
  const result=resolveCompliantRailImpact(body,-1,0,{
    mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,
    restitution:0.8,
    parameters:{...COMPLIANT_POOL_RAIL,staticFriction:0.8,dynamicFriction:0.5}
  });
  assert.ok(result.stickingSteps>0,JSON.stringify(result));
  assert.ok(result.slidingSteps>0,JSON.stringify(result));
  assert.ok(Number.isFinite(body.wy));
});

test('experimental pool banks preserve an asymmetric and finite sidespin response',()=>{
  const settings={incoming:1.2,angleDeg:30,cushionModel:'compliant'};
  const running=measurePoolObliqueRailRebound({...settings,sidespin:-0.5});
  const neutral=measurePoolObliqueRailRebound(settings);
  const reverse=measurePoolObliqueRailRebound({...settings,sidespin:0.5});
  assert.ok(running.postRollAngleDeg>neutral.postRollAngleDeg);
  assert.ok(neutral.postRollAngleDeg>reverse.postRollAngleDeg);
  assert.ok(running.postRollSpeed>reverse.postRollSpeed);
});

test('time-step refinement converges for the local tangential spring',()=>{
  const initial=makePhysicsBody(0,0,0);
  initial.vx=1.6;initial.vz=0.7;initial.wz=-20;initial.wy=18;
  const resolve=(integrationSteps)=>{
    const b={...initial};
    resolveCompliantRailImpact(b,-1,0,{
      mass:PHYSICS.mass,radius:RADIUS,noseHeight:NOSE_HEIGHT,
      restitution:0.72,parameters:{...COMPLIANT_POOL_RAIL,integrationSteps}
    });
    return b;
  };
  const a=resolve(320),b=resolve(640);
  assert.ok(Math.hypot(a.vx-b.vx,a.vz-b.vz)<0.015);
  assert.ok(Math.abs(a.wy-b.wy)*RADIUS<0.015);
});

test('experimental 3D contact never creates kinetic energy for high-spin impacts',()=>{
  for(const speed of [0.5,2.3,4])for(const angleDeg of [0,30,60,75])
    for(const spin of [-3,-1,0,1,3])for(const roll of [-1,0,1,2]) {
      const a=angleDeg*Math.PI/180;
      const b=makePhysicsBody(0,-0.4,WIDTH-reach-0.002);
      b.vx=speed*Math.sin(a);b.vz=speed*Math.cos(a);
      b.wx=b.vz/RADIUS*roll;b.wz=-b.vx/RADIUS*roll;
      b.wy=spin*speed/RADIUS;
      const before=energy(b);
      let after=null;
      for(let i=0;i<250&&after===null;i++)simulatePhysics([b],0.0005,{
        cushionModel:'compliant',onCushion:hit=>{after=energy(hit);}
      });
      assert.ok(after!==null,`missing contact ${speed} ${angleDeg}`);
      assert.ok(after<=before*(1+1e-6),
        `compliant energy gain speed ${speed}, angle ${angleDeg}, side ${spin}, roll ${roll}`);
    }
});

test('snooker is exactly unchanged when selecting the experimental pool resolver',()=>{
  const original=makePhysicsBody(0,1.27-reach-0.001,0.1);
  original.vx=1.2;original.vz=0.2;original.wz=-1.2/RADIUS;
  const a={...original},b={...original};
  for(let i=0;i<15;i++) {
    simulatePhysics([a],0.0005,{cushionProfile:'snooker'});
    simulatePhysics([b],0.0005,{cushionProfile:'snooker',cushionModel:'compliant'});
  }
  for(const k of ['x','z','vx','vz','wx','wy','wz'])assert.equal(a[k],b[k],k);
  const empirical=runCalibration().find(x=>x.id==='tum-pool-2-3-75-tangent');
  const compliant=runCalibration({cushionModel:'compliant'})
    .find(x=>x.id==='tum-pool-2-3-75-tangent');
  assert.ok(compliant.simulated>empirical.simulated+10);
});

test('bank prediction follows the same experimental cushion resolver as the game',()=>{
  const scenario=getLabScenario('bank');
  const positions=[];
  for(const cushionModel of ['empirical','compliant']) {
    const balls=scenario.balls.map(b=>makePhysicsBody(b.num,b.x,b.z));
    const forecast=predictTrajectory(balls,scenario.aim,scenario.power,
      scenario.spin,scenario.elevation,cushionModel);
    const simulation=balls.map(b=>({...b}));
    strikeBall(simulation[0],scenario.aim,powerToCueSpeed(scenario.power),
      scenario.spin,{elevation:scenario.elevation});
    for(let i=0;i<540;i++)simulatePhysics(simulation,1/240,{cushionModel});
    const end=forecast.before.at(-1);
    assert.ok(Math.hypot(end.x-simulation[0].x,end.z-simulation[0].z)<1e-5);
    positions.push(end);
  }
  assert.ok(Math.hypot(positions[0].x-positions[1].x,
    positions[0].z-positions[1].z)>0.03,
  'experimental cushion model should change predicted as well as actual banks');
});
