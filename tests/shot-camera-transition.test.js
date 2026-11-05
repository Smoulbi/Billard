import test from 'node:test';
import assert from 'node:assert/strict';
import {shotCameraProgress,SHOT_CAMERA_DELAY,SHOT_CAMERA_DURATION} from '../dist/shot-camera-transition.js';
test('shot remains visible before the quick overhead transition starts',()=>{
  assert.equal(shotCameraProgress(0),0);
  assert.equal(shotCameraProgress(SHOT_CAMERA_DELAY-1),0);
  assert.equal(shotCameraProgress(SHOT_CAMERA_DELAY),0);
  assert.equal(shotCameraProgress(SHOT_CAMERA_DELAY+SHOT_CAMERA_DURATION/2),.5);
  assert.equal(shotCameraProgress(SHOT_CAMERA_DELAY+SHOT_CAMERA_DURATION),1);
  assert.equal(shotCameraProgress(10000),1);
});
test('transition eases monotonically and supports reduced motion without delaying completion',()=>{
  let previous=0;
  for(let ms=0;ms<=1000;ms++){
    const value=shotCameraProgress(ms);assert.ok(value>=previous&&value<=1);previous=value;
  }
  assert.equal(shotCameraProgress(SHOT_CAMERA_DELAY+1,1),1);
});
