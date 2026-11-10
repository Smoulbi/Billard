import test from 'node:test';
import assert from 'node:assert/strict';
import {LAB_SCENARIOS, getLabScenario, ShotTelemetry} from '../dist/lab.js';
import {RADIUS, LENGTH, WIDTH, makePhysicsBody, strikeBall, simulatePhysics} from '../dist/physics.js';
import {powerToCueSpeed} from '../dist/power.js';

function runScenario(id) {
  const setup = getLabScenario(id);
  const balls = setup.balls.map(b => makePhysicsBody(b.num,b.x,b.z));
  const telemetry = new ShotTelemetry(balls,setup.aim,setup.title,
    {power:setup.power,tipX:setup.spin.x,tipY:setup.spin.y,elevation:setup.elevation});
  const speed = powerToCueSpeed(setup.power);
  strikeBall(balls[0],setup.aim,speed,setup.spin,{elevation:setup.elevation});
  let simulatedTime=0;
  for(let i=0;i<3000;i++) {
    const active = simulatePhysics(balls,1/240,{
      onCollision:(a,b,_speed,time)=>telemetry.onCollision(a,b,simulatedTime+time),
      onCushion:()=>telemetry.onCushion(),
      onPocket:b=>telemetry.onPocket(b,simulatedTime+1/240)
    });
    simulatedTime+=1/240;
    telemetry.record(balls,simulatedTime);
    if(!active)break;
  }
  return {balls,telemetry,summary:telemetry.summary(balls[0])};
}

test('all calibration setups have distinct balls fully inside the table', () => {
  assert.equal(LAB_SCENARIOS.length,6);
  for(const template of LAB_SCENARIOS) {
    const s=getLabScenario(template.id);
    assert.equal(s.balls[0].num,0);
    assert.ok(s.power>=5&&s.power<=100);
    assert.ok(s.elevation>=0&&s.elevation<=15);
    for(const ball of s.balls) {
      assert.ok(Math.abs(ball.x)<LENGTH-RADIUS);
      assert.ok(Math.abs(ball.z)<WIDTH-RADIUS);
    }
    for(let i=0;i<s.balls.length;i++)for(let j=i+1;j<s.balls.length;j++) {
      assert.ok(Math.hypot(s.balls[i].x-s.balls[j].x,s.balls[i].z-s.balls[j].z)>2*RADIUS);
    }
  }
  assert.equal(getLabScenario('unknown'),null);
});

test('loading a preset returns new objects without mutating the stored reference', () => {
  const a=getLabScenario('draw'),b=getLabScenario('draw');
  a.balls[0].x=99;a.spin.y=0;a.aim.x=-1;
  assert.equal(b.balls[0].x,-0.73);
  assert.equal(b.spin.y,-0.70);
  assert.equal(b.aim.x,1);
});

test('stun, draw, and follow reproduce three distinctly different cue-ball responses', () => {
  const stop=runScenario('stop').summary;
  const draw=runScenario('draw').summary;
  const follow=runScenario('follow').summary;
  for(const result of [stop,draw,follow]) {
    assert.equal(result.firstObject,1);
    // On the longer-running, lower-friction cloth a ball can return from the
    // rail and strike the other ball again. The first collision is invariant.
    assert.ok(result.collisions>=1);
    assert.ok(result.duration>1);
  }
  assert.ok(Math.abs(stop.postContact)<0.012,
    `stun should finish near contact position: ${stop.postContact}`);
  assert.ok(draw.postContact<-.15,
    `draw should return more than 15 cm: ${draw.postContact}`);
  assert.ok(follow.postContact>.30,
    `follow should advance more than 30 cm: ${follow.postContact}`);
});

test('bank and swerve shots produce sampled moving trajectories', () => {
  for(const id of ['bank','swerve']) {
    const {telemetry,summary}=runScenario(id);
    const trace=telemetry.points.get(0);
    assert.ok(trace.length>30);
    assert.ok(summary.cueDistance>0.6);
    assert.ok(summary.cushions>=1);
    assert.ok(trace.every(p=>Number.isFinite(p.t+p.x+p.z+p.speed+p.wx+p.wy+p.wz)));
  }
});

test('CSV export uses metric units and reproducible trajectories', () => {
  const a=runScenario('draw').telemetry;
  const b=runScenario('draw').telemetry;
  assert.equal(a.toCSV(),b.toCSV());
  const lines=a.toCSV().trim().split('\n');
  assert.equal(lines[0],'scenario,ball,time_s,x_m,z_m,speed_m_s,omega_x_rad_s,omega_y_rad_s,omega_z_rad_s,power_pct,tip_x,tip_y,elevation_deg,aim_x,aim_z,cushion_model');
  assert.ok(lines.length>30);
  assert.equal(lines[1],`RÉTRO,0,0.0000,-0.73000,0.00000,0.00000,0.0000,0.0000,0.0000,${getLabScenario('draw').power},0.000,-0.700,0,1.00000,0.00000,empirical`);
});

test('the trace sampler caps sample density while keeping path length', () => {
  const b=makePhysicsBody(0,0,0);
  const lab=new ShotTelemetry([b],{x:1,z:0},'TEST');
  for(let i=1;i<=240;i++) {
    b.x=i*0.001;
    lab.record([b],i/240);
  }
  assert.ok(lab.points.get(0).length<=61);
  assert.ok(lab.points.get(0).length>=55);
  assert.ok(Math.abs(lab.cueDistance-.24)<1e-12);
});
