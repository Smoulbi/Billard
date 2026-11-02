import test from 'node:test';
import assert from 'node:assert/strict';
import {RADIUS, LENGTH, WIDTH} from '../dist/physics.js';
import {HEAD_STRING_X, BREAK_X_MIN, BREAK_X_MAX, BREAK_Z_LIMIT,
  clampBreakPosition, canPlaceBreakCue} from '../dist/placement.js';

test('the legal break region is behind the head string with cushion clearance',()=>{
  assert.equal(HEAD_STRING_X,-LENGTH/2);
  assert.ok(canPlaceBreakCue(-.76,0));
  assert.ok(canPlaceBreakCue(-1.0,0.3));
  assert.ok(!canPlaceBreakCue(0,0));
  assert.ok(!canPlaceBreakCue(HEAD_STRING_X,0));
  assert.ok(!canPlaceBreakCue(-LENGTH,0));
  assert.ok(!canPlaceBreakCue(-.8,WIDTH));
  assert.ok(!canPlaceBreakCue(-1.24,.60));
  assert.ok(BREAK_X_MIN>-LENGTH+RADIUS);
  assert.ok(BREAK_X_MAX<HEAD_STRING_X);
  assert.ok(BREAK_Z_LIMIT<WIDTH-RADIUS);
});

test('dragging is constrained to the break zone and corner pockets are excluded',()=>{
  assert.deepEqual(clampBreakPosition(100,100),{x:BREAK_X_MAX,z:BREAK_Z_LIMIT});
  assert.deepEqual(clampBreakPosition(-100,-100),{x:BREAK_X_MIN,z:-BREAK_Z_LIMIT});
  assert.equal(clampBreakPosition(Infinity,0),null);
  assert.equal(canPlaceBreakCue(NaN,0),false);
});

test('break cue placement cannot overlap an active object ball',()=>{
  const others=[{active:true,num:1,x:-.90,z:0}];
  assert.ok(!canPlaceBreakCue(-.90,0,others));
  assert.ok(!canPlaceBreakCue(-.90+RADIUS,0,others));
  assert.ok(canPlaceBreakCue(-.76,.2,others));
  others[0].active=false;
  assert.ok(canPlaceBreakCue(-.90,0,others));
});
