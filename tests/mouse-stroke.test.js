import test from 'node:test';
import assert from 'node:assert/strict';
import {createMouseStroke,moveMouseStroke,MAX_STROKE_PULL} from '../dist/mouse-stroke.js';
test('a deliberate backswing followed by forward contact fires exactly once',()=>{
  const s=createMouseStroke();
  assert.equal(moveMouseStroke(s,-50,20),null);
  assert.equal(moveMouseStroke(s,60,80),null);assert.equal(s.pull,.06);
  assert.equal(moveMouseStroke(s,-30,110),null);
  const power=moveMouseStroke(s,-30,140);
  assert.ok(power>27&&power<28);assert.equal(s.pull,0);
  assert.equal(moveMouseStroke(s,60,180),null);assert.equal(moveMouseStroke(s,-60,200),null);
});
test('same stroke distance delivers more power when moved faster',()=>{
  const stroke=(dt)=>{const s=createMouseStroke();moveMouseStroke(s,60,60);let result;for(let i=1;i<=5;i++)result=moveMouseStroke(s,-12,60+i*dt);return result;};
  assert.ok(stroke(20)>stroke(40));assert.ok(stroke(40)>stroke(80));
  assert.equal(stroke(1),100);
});
test('tiny jitter cannot arm a shot and pullback is bounded',()=>{
  const s=createMouseStroke();moveMouseStroke(s,2,20);
  assert.equal(moveMouseStroke(s,-2,40),null);
  moveMouseStroke(s,10000,60);assert.equal(s.pull,MAX_STROKE_PULL);
});
test('pausing or reversing removes stale fast movement from impact power',()=>{
  const s=createMouseStroke();moveMouseStroke(s,100,100);moveMouseStroke(s,-50,110);
  assert.equal(s.power,100);
  const slow=moveMouseStroke(s,-50,1110);assert.ok(slow<5);
  const reverse=createMouseStroke();moveMouseStroke(reverse,100,100);moveMouseStroke(reverse,-50,110);
  moveMouseStroke(reverse,10,150);let result;
  for(let i=1;i<=6;i++)result=moveMouseStroke(reverse,-10,150+i*100);
  assert.ok(result<10);
});
test('invalid timestamps and movement do not produce a shot or corrupt state',()=>{
  const s=createMouseStroke(100);assert.equal(moveMouseStroke(s,100,90),null);
  assert.equal(moveMouseStroke(s,NaN,110),null);assert.equal(moveMouseStroke(s,100,Infinity),null);
  assert.deepEqual(s,createMouseStroke(100));
});

test('a pause at full backswing does not suppress a fast forward stroke',()=>{
  const s=createMouseStroke();moveMouseStroke(s,60,60);moveMouseStroke(s,-10,1060);
  const result=moveMouseStroke(s,-50,1080);assert.ok(result>40&&result<50);
});

test('ordinary forward motion gives controllable rather than break-level speed',()=>{
  const s=createMouseStroke();moveMouseStroke(s,60,60);
  let result;
  for(let i=1;i<=5;i++)result=moveMouseStroke(s,-12,60+i*20);
  assert.ok(Math.abs(result-100/6)<1e-9,'600 px/s should produce 16.7% power (2 m/s)');
});
