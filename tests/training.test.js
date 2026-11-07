import test from 'node:test';
import assert from 'node:assert/strict';
import {trainingLayout,canPlaceTrainingBall,createTrainingSession,recordTrainingChange,undoTrainingChange,redoTrainingChange} from '../dist/training.js';
import {RADIUS,LENGTH,WIDTH} from '../dist/physics.js';
const snap=shots=>({positions:[{num:0,x:-.76,z:0,active:true},{num:1,x:.4+shots*.1,z:0,active:shots<1}],
  aim:{x:1,z:0},spin:{x:.2,y:-.3},power:12,elevation:5,cushionModel:'coupled-v021',shots});
test('training starts with a cue ball and offers complete distinct eight and nine racks',()=>{
  assert.deepEqual(trainingLayout(),[{num:0,x:-.76,z:0}]);
  for(const [kind,count] of [['eight',16],['nine',10]]){
    const positions=trainingLayout(kind);
    assert.equal(positions.length,count);assert.equal(new Set(positions.map(b=>b.num)).size,count);
    for(let i=0;i<positions.length;i++)for(let j=0;j<i;j++)
      assert.ok(Math.hypot(positions[i].x-positions[j].x,positions[i].z-positions[j].z)>=2*RADIUS);
  }
  assert.ok(Math.abs(trainingLayout('eight').find(b=>b.num===8).x-(.49+2*Math.sqrt(3)*RADIUS*1.001))<=RADIUS*.001);
  assert.throws(()=>trainingLayout('other'));
});
test('training placement rejects pockets, cushions and overlapping white or object balls',()=>{
  const balls=[{num:0,x:0,z:0,active:true},{num:1,x:.4,z:0,active:true}];
  assert.equal(canPlaceTrainingBall(1,0,0,balls),false);
  assert.equal(canPlaceTrainingBall(0,.4,0,balls),false);
  assert.equal(canPlaceTrainingBall(1,.4,0,balls),true);
  assert.equal(canPlaceTrainingBall(2,0,0,[{...balls[0],active:false}]),true);
  assert.equal(canPlaceTrainingBall(2,LENGTH,WIDTH,balls),false);
  assert.equal(canPlaceTrainingBall(2,0,WIDTH+.03,balls),false);
  assert.equal(canPlaceTrainingBall(2,NaN,0,balls),false);
});
test('multiple undo and redo operations restore balls, potted states and shot settings',()=>{
  const session=createTrainingSession(),a=snap(0),b=snap(1),c=snap(2);
  recordTrainingChange(session,a);recordTrainingChange(session,b);
  assert.deepEqual(undoTrainingChange(session,c),b);
  assert.deepEqual(undoTrainingChange(session,b),a);
  assert.equal(undoTrainingChange(session,a),null);
  assert.deepEqual(redoTrainingChange(session,a),b);
  assert.deepEqual(redoTrainingChange(session,b),c);
  assert.equal(redoTrainingChange(session,c),null);
});
test('history owns its snapshots and a new action after undo discards redo',()=>{
  const session=createTrainingSession(),a=snap(0);
  recordTrainingChange(session,a);a.positions[0].x=999;a.spin.x=999;
  const restored=undoTrainingChange(session,snap(1));
  assert.equal(restored.positions[0].x,-.76);assert.equal(restored.spin.x,.2);
  recordTrainingChange(session,restored);assert.equal(session.redo.length,0);
});
test('training history retains the most recent hundred changes without persistence',()=>{
  const session=createTrainingSession();
  for(let i=0;i<105;i++)recordTrainingChange(session,snap(i));
  assert.equal(session.undo.length,100);assert.equal(session.undo[0].shots,5);
  assert.deepEqual(createTrainingSession().undo,[]);
});
