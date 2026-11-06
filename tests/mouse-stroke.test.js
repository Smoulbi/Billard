import test from 'node:test';
import assert from 'node:assert/strict';
import {strokeSensitivityGain,createMouseStroke,moveMouseStroke,MAX_STROKE_PULL} from '../dist/mouse-stroke.js';
test('a deliberate backswing followed by forward contact fires exactly once',()=>{
  const s=createMouseStroke();
  assert.equal(moveMouseStroke(s,-50,20),null);
  assert.equal(moveMouseStroke(s,60,80),null);assert.equal(s.pull,.06);
  assert.equal(moveMouseStroke(s,-30,110),null);
  const power=moveMouseStroke(s,-30,140);
  assert.ok(power>22&&power<23);assert.equal(s.pull,0);
  assert.equal(moveMouseStroke(s,60,180),null);assert.equal(moveMouseStroke(s,-60,200),null);
});
test('same stroke distance delivers more power when moved faster',()=>{
  const stroke=(dt)=>{const s=createMouseStroke();moveMouseStroke(s,60,60);let result;for(let i=1;i<=5;i++)result=moveMouseStroke(s,-12,60+i*dt);return result;};
  assert.ok(stroke(20)>stroke(40));assert.ok(stroke(40)>stroke(80));
  assert.equal(stroke(2),100);
});
test('tiny jitter cannot arm a shot and pullback is bounded',()=>{
  const s=createMouseStroke();moveMouseStroke(s,2,20);
  assert.equal(moveMouseStroke(s,-2,40),null);
  moveMouseStroke(s,10000,60);assert.equal(s.pull,MAX_STROKE_PULL);
});
test('pausing or reversing removes stale fast movement from impact power',()=>{
  const s=createMouseStroke();moveMouseStroke(s,100,100);moveMouseStroke(s,-20,110);moveMouseStroke(s,-50,120);
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
  const result=moveMouseStroke(s,-50,1080);assert.ok(result>55&&result<56);
});

test('ordinary forward motion gives controllable rather than break-level speed',()=>{
  const s=createMouseStroke();moveMouseStroke(s,60,60);
  let result;
  for(let i=1;i<=5;i++)result=moveMouseStroke(s,-12,60+i*20);
  assert.ok(Math.abs(result-40/3)<1e-9,'600 px/s should produce 13.3% power (1.6 m/s)');
});

test('gesture force scales impact power without changing the cue movement',()=>{
  const run=gain=>{
    const s=createMouseStroke();moveMouseStroke(s,60,60,gain);
    let result;for(let i=1;i<=5;i++)result=moveMouseStroke(s,-12,60+i*20,gain);
    return {result,pull:s.pull};
  };
  const normal=run(1),soft=run(.8),verySoft=run(.25);
  assert.ok(Math.abs(soft.result-normal.result*.8)<1e-9);
  assert.ok(Math.abs(verySoft.result-normal.result*.25)<1e-9);
  assert.equal(soft.pull,normal.pull);
  assert.equal(run(NaN).result,normal.result);
});

test('new 60% strength retains the previous 30% physical gain',()=>{
  assert.equal(strokeSensitivityGain(60),.3);
  for(const previous of [10,30,80,150])assert.equal(strokeSensitivityGain(previous*2),previous/100);
  assert.equal(strokeSensitivityGain(NaN),.3);
});

test('the same physical stroke has the same power across event rates and irregular batching',()=>{
  const run=(intervals)=>{
    const s=createMouseStroke();moveMouseStroke(s,120,100);
    let time=1000,index=0,power=null;
    while(power===null&&index<1000){
      const dt=intervals[index++%intervals.length];time+=dt;
      power=moveMouseStroke(s,-.6*dt,time,.3);
    }
    assert.ok(power!==null);return power;
  };
  for(const intervals of [[1],[2],[8],[1000/60],[50],[3,17,7,31,2,19]])
    assert.ok(Math.abs(run(intervals)-4)<1e-8,`intervals ${intervals}`);
});

test('contact time is interpolated inside a packet that overshoots the ball',()=>{
  const s=createMouseStroke();moveMouseStroke(s,100,100);
  moveMouseStroke(s,-20,110);moveMouseStroke(s,-40,150);
  const power=moveMouseStroke(s,-80,230);
  assert.ok(Math.abs(power-1000/4500*100)<1e-9);
  assert.equal(s.samples.at(-1).time,190);
});

test('a single packet or less than 8 ms of measured motion never fires a guessed shot',()=>{
  const s=createMouseStroke();moveMouseStroke(s,60,60);
  assert.equal(moveMouseStroke(s,-100,1060),null);
  assert.equal(s.needsRetry,true);assert.equal(s.fired,false);assert.equal(s.power,0);
  moveMouseStroke(s,60,1100);assert.equal(s.needsRetry,false);
  moveMouseStroke(s,-30,1120);
  assert.ok(moveMouseStroke(s,-30,1140)>0,'a new measurable stroke should work');
  const quick=createMouseStroke();moveMouseStroke(quick,60,60);moveMouseStroke(quick,-30,80);
  assert.equal(moveMouseStroke(quick,-30,81),null);assert.equal(quick.needsRetry,true);
});

test('events sharing a timestamp accumulate distance without inventing milliseconds',()=>{
  const run=split=>{
    const s=createMouseStroke();moveMouseStroke(s,60,100);moveMouseStroke(s,-10,200);
    if(split){moveMouseStroke(s,-10,210);moveMouseStroke(s,-10,210);}
    else moveMouseStroke(s,-20,210);
    return moveMouseStroke(s,-30,240);
  };
  assert.equal(run(true),run(false));
});

test('accelerating motion stays comparable at 60, 125 and 1000 Hz',()=>{
  const run=dt=>{
    const s=createMouseStroke();moveMouseStroke(s,120,100);
    let elapsed=0,lastTravel=0,power=null;
    while(power===null&&elapsed<1000){
      elapsed+=dt;
      const travel=.003*elapsed*elapsed;
      power=moveMouseStroke(s,-(travel-lastTravel),1000+elapsed,.3);
      lastTravel=travel;
    }
    assert.ok(power!==null);return power;
  };
  const reference=run(1);
  for(const dt of [8,1000/60])assert.ok(Math.abs(run(dt)-reference)<.05);
});
