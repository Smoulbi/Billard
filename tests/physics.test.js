import test from 'node:test';
import assert from 'node:assert/strict';
import {RADIUS, LENGTH, WIDTH, SIDE_CUT, CORNER_CUT, NOSE_HEIGHT,
  CORNER_POCKET_SHELF, SIDE_POCKET_SHELF, getCushionSegments,
  getPockets,
  PHYSICS, makePhysicsBody, getCueImpact, strikeBall, simulatePhysics,
  resolveBallCollision, isMoving,pocketSupportClearance} from '../dist/physics.js';
import {pocketReferenceGeometry} from '../dist/table-pocket-geometry.js';

function advance(bodies, seconds, callbacks) {
  const dt = 1 / 240;
  for (let i = 0; i < Math.round(seconds / dt); i++) simulatePhysics(bodies, dt, callbacks);
}

function close(actual, expected, tolerance = 0.01) {
  assert.ok(Math.abs(actual - expected) <= tolerance,
    `Expected ${actual} to be within ${tolerance} of ${expected}`);
}

test('a centred shot starts sliding and enters pure rolling without speed gain', () => {
  const b = makePhysicsBody(0, -0.8, 0);
  strikeBall(b, {x: 1, z: 0}, 1, {x: 0, y: 0});
  close(b.wz, 0);
  advance([b], 0.30);
  assert.equal(b.state, 'rolling');
  close(b.vx, 5 / 7 - PHYSICS.rollingFriction * PHYSICS.gravity * (0.30 - 1 / (3.5 * PHYSICS.slidingFriction * PHYSICS.gravity)), 0.015);
  close(b.vx + RADIUS * b.wz, 0, 0.0001);
  close(b.vz - RADIUS * b.wx, 0, 0.0001);
});

test('rolling resistance is weaker than sliding friction', () => {
  const b = makePhysicsBody(1, 0, 0);
  b.vx = 1;
  b.wz = -1 / RADIUS;
  advance([b], 0.15);
  assert.equal(b.state, 'rolling');
  close(b.vx, 1 - PHYSICS.rollingFriction * PHYSICS.gravity * 0.15, 0.002);
});

test('draw reverses cue-ball motion naturally after a head-on collision', () => {
  const cue = makePhysicsBody(0, -0.052, 0);
  const target = makePhysicsBody(1, 0.005, 0);
  cue.vx = 1.5;
  cue.wz = 60; // Negative y impact: the opposite of natural forward roll.
  const hit = resolveBallCollision(cue, target);
  assert.ok(hit > 1.4);
  assert.ok(target.vx > 1.3);
  advance([cue, target], 0.10);
  assert.ok(cue.vx < -0.10, `draw should reverse cue ball; vx=${cue.vx}`);
});

test('follow adds forward motion after collision through retained topspin', () => {
  const cue = makePhysicsBody(0, -0.052, 0);
  const target = makePhysicsBody(1, 0.005, 0);
  cue.vx = 1.5;
  cue.wz = -90;
  resolveBallCollision(cue, target);
  advance([cue, target], 0.10);
  assert.ok(cue.vx > 0.10, `follow should carry cue ball forward; vx=${cue.vx}`);
});

test('eccentric strike creates opposite follow/draw and lateral angular speeds', () => {
  const a = makePhysicsBody(0, 0, 0);
  const b = makePhysicsBody(0, 0, 0);
  strikeBall(a, {x: 1, z: 0}, 2.5, {x: 0.4, y: 0.6});
  strikeBall(b, {x: 1, z: 0}, 2.5, {x: -0.4, y: -0.6});
  assert.ok(a.wz < 0 && a.wy > 0);
  close(a.wz, -b.wz, 0.0001);
  close(a.wy, -b.wy, 0.0001);
});

test('a low-deflection cue squirts away from the side-spin offset', () => {
  const centered = getCueImpact({x: 1, z: 0}, 2, {x: 0, y: 0});
  const right = getCueImpact({x: 1, z: 0}, 2, {x: 0.65, y: 0});
  const left = getCueImpact({x: 1, z: 0}, 2, {x: -0.65, y: 0});
  close(centered.vz, 0, 1e-12);
  assert.ok(right.vz < 0 && right.wy > 0);
  assert.ok(left.vz > 0 && left.wy < 0);
  close(right.vz, -left.vz, 1e-12);
  assert.ok(right.squirtDegrees > 2 && right.squirtDegrees < 4);
  close(right.squirtDegrees, -left.squirtDegrees, 1e-12);
});

test('off-centre cue contact spends part of the impact energy on rotation', () => {
  const center = getCueImpact({x: 1, z: 0}, 2, {x: 0, y: 0});
  const english = getCueImpact({x: 1, z: 0}, 2, {x: 0.7, y: 0});
  assert.ok(Math.hypot(english.vx, english.vz) < Math.hypot(center.vx, center.vz));
  assert.ok(english.wy > 0);
  const low = getCueImpact({x: 1, z: 0}, 2, {x: 0.25, y: 0}).squirtDegrees;
  assert.ok(english.squirtDegrees > low);
});

test('the elevation-induced horizontal rotation curves sidespin back through cloth friction', () => {
  const flat = makePhysicsBody(0, -0.85, 0);
  const elevated = makePhysicsBody(0, -0.85, 0);
  strikeBall(flat, {x: 1, z: 0}, 1.5, {x: 0.55, y: 0}, {elevation: 0});
  strikeBall(elevated, {x: 1, z: 0}, 1.5, {x: 0.55, y: 0}, {elevation: 15});
  close(flat.wx, 0, 1e-12);
  assert.ok(elevated.wx > 0, 'a lifted cue must impart forward-axis rotation');
  close(flat.vz / flat.vx, elevated.vz / elevated.vx, 1e-12);
  advance([flat], 0.5);
  advance([elevated], 0.5);
  assert.ok(elevated.z > flat.z + 0.02,
    `right swerve must counter left squirt: ${elevated.z} vs ${flat.z}`);
});

test('raising a centred cue does not create unrequested sidespin or a lateral drift', () => {
  const shot = getCueImpact({x: 1, z: 0}, 2.5, {x: 0, y: 0}, {elevation: 15});
  close(shot.vz, 0, 1e-12);
  close(shot.wx, 0, 1e-12);
  close(shot.wy, 0, 1e-12);
  close(shot.wz, 0, 1e-12);
  const b = makePhysicsBody(0, -0.8, 0);
  strikeBall(b, {x: 1, z: 0}, 2.5, {x: 0, y: 0}, {elevation: 15});
  advance([b], 0.25);
  close(b.z, 0, 1e-12);
});

test('a cue tip outside the chalked grip limit miscues deterministically', () => {
  const safe = getCueImpact({x: 1, z: 0}, 2.0, {x: 0.78, y: 0});
  const bad = getCueImpact({x: 1, z: 0}, 2.0, {x: 0.95, y: 0});
  assert.equal(safe.miscue, false);
  assert.equal(bad.miscue, true);
  assert.ok(Math.hypot(bad.vx, bad.vz) < Math.hypot(safe.vx, safe.vz) * 0.65);
  assert.ok(bad.squirtDegrees > safe.squirtDegrees * 3);
  assert.ok(bad.impactOffset > PHYSICS.chalkedTipLimit);
});

test('combined follow and side impact remains finite and mirrored on reverse sides', () => {
  for (const elevation of [0, 5, 10, 15]) {
    const a = getCueImpact({x: 0.8, z: 0.6}, 4.5, {x: 0.42, y: 0.51}, {elevation});
    const b = getCueImpact({x: 0.8, z: 0.6}, 4.5, {x: -0.42, y: 0.51}, {elevation});
    for (const impact of [a,b]) {
      for (const component of ['vx','vz','wx','wy','wz','squirtDegrees'])
        assert.ok(Number.isFinite(impact[component]), `${component} must remain finite`);
      assert.equal(impact.miscue, false);
    }
    close(a.wy, -b.wy, 0.8);
    close(a.squirtDegrees, -b.squirtDegrees, 1e-12);
  }
});

test('a near-stationary rack settles without exhausting the continuous-event budget', () => {
  const cluster = [];
  for (let row = 0; row < 5; row++) for (let j = 0; j <= row; j++) {
    const b = makePhysicsBody(cluster.length, 0.05 + row * (Math.sqrt(3) * RADIUS + 0.0001),
      (j - row / 2) * (2 * RADIUS + 0.0001));
    if (row < 2) {
      b.vx = 0.005 + row * 0.001;
      b.wz = -b.vx / RADIUS;
    }
    cluster.push(b);
  }
  let eventLimits = 0;
  advance(cluster, 0.40, {onEventLimit: () => eventLimits++});
  assert.equal(eventLimits, 0);
});

test('sidespin changes the rebound angle on a long cushion', () => {
  const noSpin = makePhysicsBody(1, 0.23, WIDTH - RADIUS - 0.001);
  const spin = makePhysicsBody(2, 0.23, WIDTH - RADIUS - 0.001);
  noSpin.vz = spin.vz = 1.7;
  spin.wy = 65;
  simulatePhysics([noSpin], 1 / 240);
  simulatePhysics([spin], 1 / 240);
  assert.ok(noSpin.vz < 0 && spin.vz < 0);
  assert.ok(Math.abs(spin.vx - noSpin.vx) > 0.025,
    `sidespin should change lateral rebound: ${noSpin.vx}, ${spin.vx}`);
});

test('side pocket stays open and captures the ball', () => {
  const b = makePhysicsBody(1, 0, WIDTH - 0.105);
  b.vz = 1.2;
  let potted = 0;
  advance([b], 0.20, {onPocket: () => potted++});
  assert.equal(potted, 1);
  assert.equal(b.active, false);
});

test('cushion nose and pocket cuts follow the selected tournament dimensions', () => {
  close(NOSE_HEIGHT, 0.635 * 2 * RADIUS, 1e-12);
  assert.ok(CORNER_POCKET_SHELF >= 0.0254 && CORNER_POCKET_SHELF <= 0.05715);
  assert.ok(SIDE_POCKET_SHELF >= 0 && SIDE_POCKET_SHELF <= 0.009525);
  const facings = getCushionSegments().filter(c => c.kind === 'facing');
  assert.equal(facings.length, 12);
  const corner = facings.find(c => Math.abs(c.x0) > LENGTH - CORNER_CUT - 0.001 &&
    Math.abs(c.x0) < LENGTH - CORNER_CUT + 0.001);
  const side = facings.find(c => Math.abs(c.x0 - SIDE_CUT) < 1e-8);
  close(Math.atan2(Math.abs(corner.z1 - corner.z0), Math.abs(corner.x1 - corner.x0)) * 180 / Math.PI, 38, 0.001);
  close(Math.atan2(Math.abs(side.z1 - side.z0), Math.abs(side.x1 - side.x0)) * 180 / Math.PI, 76, 0.001);
});

test('a ball near the opening but still supported by its rim remains active', () => {
  const side = makePhysicsBody(0, 0, WIDTH - 0.018);
  simulatePhysics([side], 1 / 240);
  assert.equal(side.active, true);
  const corner = makePhysicsBody(1,
    LENGTH - CORNER_CUT / 2 - .005,
    WIDTH - CORNER_CUT / 2 - .005);
  const clearance=pocketSupportClearance(corner.x,corner.z);
  assert.equal(clearance,0,
    'the centre is still on felt before reaching the actual graphic lip');
  simulatePhysics([corner], 1 / 240);
  assert.equal(corner.active, true);
});

test('a ball inside the drawn rim is captured immediately, without any inset capture region',()=>{
  const corner=getPockets().find(p=>p.kind==='corner'&&p.sx===1&&p.sz===1);
  const reference=pocketReferenceGeometry(corner,CORNER_CUT,SIDE_CUT,64);
  const [lipX,lipZ]=reference.nearLip[32];
  const edge={x:lipX+.010/Math.SQRT2,z:lipZ+.010/Math.SQRT2};
  const entry=pocketSupportClearance(edge.x,edge.z);
  assert.ok(entry>0,
    'the centre projects inside the black well');
  const b=makePhysicsBody(1,edge.x,edge.z);
  let captured=0;
  simulatePhysics([b],1/240,{onPocket:()=>captured++});
  assert.equal(b.active,false);
  assert.equal(captured,1);
  simulatePhysics([b],1/240,{onPocket:()=>captured++});
  assert.equal(captured,1,'falling is an irreversible transition');
});

test('the physical capture starts at the exact visible front arc on all six pockets',()=>{
  for(const p of getPockets()){
    const reference=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,64);
    const [mx,mz]=reference.nearLip[32];
    const nx=p.kind==='corner'?p.sx/Math.SQRT2:0;
    const nz=p.kind==='corner'?p.sz/Math.SQRT2:p.sz;
    const before=[mx-nx*.002,mz-nz*.002];
    const after=[mx+nx*.002,mz+nz*.002];
    assert.equal(pocketSupportClearance(...before),0,
      `capture must not start on the felt at ${p.x},${p.z}`);
    assert.ok(pocketSupportClearance(...after)>0,
      `capture must start inside the graphic lip at ${p.x},${p.z}`);
    const outside=makePhysicsBody(1,...before);
    const inside=makePhysicsBody(2,...after);
    simulatePhysics([outside,inside],1/240);
    assert.equal(outside.active,true);
    assert.equal(inside.active,false);
  }
});

test('the corner pocket admits a ball travelling straight through its mouth', () => {
  const b = makePhysicsBody(0, LENGTH - 0.14, WIDTH - 0.14);
  b.vx = b.vz = 1.6;
  b.wx = b.vz / RADIUS;
  b.wz = -b.vx / RADIUS;
  let captured = 0;
  advance([b], 0.30, {onPocket: () => captured++});
  assert.equal(captured, 1);
  assert.equal(b.active, false);
});

test('a near-jaw side-pocket shot rattles out instead of auto-potting', () => {
  const b = makePhysicsBody(0, SIDE_CUT - 0.005, WIDTH - 0.15);
  b.vz = 2;
  b.wx = b.vz / RADIUS;
  let contacts = 0, captured = 0;
  advance([b], 0.50, {
    onCushion: () => contacts++, onPocket: () => captured++
  });
  assert.ok(contacts > 0);
  assert.equal(captured, 0);
  assert.equal(b.active, true);
});

test('a corner-pocket jaw can reject a shot travelling along the long rail', () => {
  const b = makePhysicsBody(0, LENGTH - 0.14, WIDTH - 0.070);
  b.vx = 2;
  b.wz = -b.vx / RADIUS;
  let cushionContacts = 0;
  advance([b], 0.50, {
    onCushion: () => cushionContacts++
  });
  assert.ok(cushionContacts > 0, 'the ball must rebound from the corner cushion');
  assert.equal(b.active, true);
});

test('continuous rail contact happens at the cushion nose, not after overlap', () => {
  const b = makePhysicsBody(0, 0.38, WIDTH - 0.20);
  b.vz = 3;
  b.wx = b.vz / RADIUS;
  let event = null;
  simulatePhysics([b], 0.08, {
    onCushion: (ball, speed, time, kind) => {
      if (!event) event = {z: ball.z, speed, time, kind};
    }
  });
  assert.ok(event, 'the bank must register a cushion collision');
  close(event.z, WIDTH - Math.sqrt(RADIUS ** 2 - (NOSE_HEIGHT - RADIUS) ** 2), 1e-7);
  assert.ok(event.time > 0.04 && event.time < 0.08);
  assert.equal(event.kind, 'rail');
});

test('a narrow shot cannot jump a head-on ball at break speed', () => {
  const cue = makePhysicsBody(0, -0.5, 0);
  const target = makePhysicsBody(1, -0.37, 0);
  strikeBall(cue, {x: 1, z: 0}, 6);
  let impacts = 0;
  for (let i = 0; i < 12; i++) simulatePhysics([cue, target], 1 / 240,
    {onCollision: () => impacts++});
  assert.ok(impacts > 0, 'collision must be detected during a hard break');
  assert.ok(target.vx > 1, 'target ball must receive momentum');
});

test('continuous solver reports first contact time before any overlap', () => {
  const cue = makePhysicsBody(0, -0.40, 0);
  const object = makePhysicsBody(1, -0.20, 0);
  cue.vx = 4;
  cue.wz = -4 / RADIUS; // Rolling resistance gives an analytic reference.
  const distanceToContact = 0.20 - 2 * RADIUS;
  const decel = PHYSICS.rollingFriction * PHYSICS.gravity;
  const expectedTime = (4 - Math.sqrt(16 - 2 * decel * distanceToContact)) / decel;
  let event = null;
  simulatePhysics([cue, object], 0.06, {
    onCollision: (a, b, speed, time) => {
      if (!event) event = {time, separation: Math.hypot(a.x - b.x, a.z - b.z), speed};
    }
  });
  assert.ok(event, 'event must occur before the end of the interval');
  close(event.time, expectedTime, 1e-6);
  close(event.separation, 2 * RADIUS, 1e-7);
});

test('grazing impact is detected even if no physics-step endpoint overlaps', () => {
  const cue = makePhysicsBody(0, -0.13, 2 * RADIUS - 0.000005);
  const object = makePhysicsBody(1, 0, 0);
  strikeBall(cue, {x: 1, z: 0}, 6);
  let collisions = 0;
  simulatePhysics([cue, object], 0.04, {onCollision: () => collisions++});
  assert.equal(collisions, 1, 'a shallow 5 µm overlap must not be skipped');
  assert.ok(Math.hypot(object.vx, object.vz) > 0.03);
});

test('a near-miss does not create a false collision impulse', () => {
  const cue = makePhysicsBody(0, -0.13, 2 * RADIUS + 0.000005);
  const object = makePhysicsBody(1, 0, 0);
  strikeBall(cue, {x: 1, z: 0}, 6);
  let collisions = 0;
  simulatePhysics([cue, object], 0.04, {onCollision: () => collisions++});
  assert.equal(collisions, 0);
  assert.equal(object.vx, 0);
  assert.equal(object.vz, 0);
});

test('backspin can cause a collision starting from zero translational velocity', () => {
  const spinning = makePhysicsBody(0, -2 * RADIUS - 0.002, 0);
  const stationary = makePhysicsBody(1, 0, 0);
  spinning.wz = -150;
  let event = null;
  simulatePhysics([spinning, stationary], 0.05, {
    onCollision: (a, b, speed, time) => { event = {time, speed, distance: Math.hypot(a.x - b.x, a.z - b.z)}; }
  });
  assert.ok(event, 'cloth friction must accelerate the spinning ball into contact');
  assert.ok(event.time > 0.04 && event.time < 0.05);
  close(event.distance, 2 * RADIUS, 1e-7);
});

test('the next contact is recomputed after each impact in a collision chain', () => {
  const first = makePhysicsBody(0, -0.35, 0);
  const middle = makePhysicsBody(1, -0.15, 0);
  const last = makePhysicsBody(2, 0.05, 0);
  first.vx = 5;
  first.wz = -5 / RADIUS;
  const events = [];
  simulatePhysics([first, middle, last], 0.09, {
    onCollision: (a, b, _speed, time) => events.push([a.num, b.num, time])
  });
  assert.ok(events.length >= 2, `expected two collisions, got ${JSON.stringify(events)}`);
  assert.deepEqual(events.slice(0, 2).map(([a, b]) => [a, b]), [[0, 1], [1, 2]]);
  assert.ok(events[1][2] > events[0][2]);
  assert.ok(last.vx > 3, 'second impact must transfer momentum to third ball');
});

test('collision trajectories remain close across simulation step sizes', () => {
  const makePair = () => {
    const moving = makePhysicsBody(0, -0.4, 0.007);
    const target = makePhysicsBody(1, -0.2, 0);
    moving.vx = 3.1;
    moving.wz = -3.1 / RADIUS;
    return [moving, target];
  };
  const fine = makePair(), coarse = makePair();
  for (let i = 0; i < 96; i++) simulatePhysics(fine, 1 / 240);
  for (let i = 0; i < 24; i++) simulatePhysics(coarse, 1 / 60);
  for (let i = 0; i < 2; i++) {
    close(fine[i].x, coarse[i].x, 0.006);
    close(fine[i].z, coarse[i].z, 0.006);
  }
});

test('vertical spin decays even once translation has stopped', () => {
  const b = makePhysicsBody(0, 0, 0);
  b.wy = 20;
  advance([b], 3);
  assert.equal(b.state, 'stationary');
  assert.equal(b.wy, 0);
  assert.equal(isMoving(b), false);
});

test('a running rack remains finite and contains no severe ball overlaps', () => {
  const rack = [makePhysicsBody(0, -0.65, 0)];
  let n = 1;
  for (let row = 0; row < 5; row++) {
    for (let j = 0; j <= row; j++) rack.push(makePhysicsBody(n++,
      0.45 + row * (Math.sqrt(3) * RADIUS + 0.0009),
      (j - row / 2) * (2 * RADIUS + 0.0009)));
  }
  strikeBall(rack[0], {x: 1, z: 0}, 4.8, {x: 0.21, y: -0.4});
  advance(rack, 12);
  for (const b of rack) {
    for (const value of [b.x, b.z, b.vx, b.vz, b.wx, b.wy, b.wz])
      assert.ok(Number.isFinite(value));
    assert.ok(Math.abs(b.x) < LENGTH + 0.15 && Math.abs(b.z) < WIDTH + 0.15);
  }
  for (let i = 0; i < rack.length; i++) for (let j = i + 1; j < rack.length; j++) {
    if (rack[i].active && rack[j].active) {
      assert.ok(Math.hypot(rack[i].x - rack[j].x, rack[i].z - rack[j].z) > 2 * RADIUS - 0.006,
        `balls ${i}, ${j} overlap`);
    }
  }
});
