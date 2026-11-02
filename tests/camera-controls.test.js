import test from 'node:test';
import assert from 'node:assert/strict';
import {panCameraTarget,zoomCamera,MIN_CAMERA_DISTANCE,MAX_CAMERA_DISTANCE} from '../dist/camera-controls.js';

const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-10,`${actual} != ${expected}`);

test('middle-button pan follows the screen axes from an overhead camera',()=>{
  const orbit={topDown:true,azimuth:0.7,elevation:0.69,distance:4,targetX:0,targetZ:0};
  const unit=2*4*Math.tan(40*Math.PI/360)/600;
  panCameraTarget(orbit,120,60,600);
  near(orbit.targetX,-120*unit);
  near(orbit.targetZ,-60*unit);
});

test('middle-button pan follows the current camera azimuth in perspective',()=>{
  const orbit={topDown:false,azimuth:Math.PI/2,elevation:Math.PI/6,distance:3,targetX:0,targetZ:0};
  const unit=2*3*Math.tan(40*Math.PI/360)/600;
  panCameraTarget(orbit,60,30,600);
  near(orbit.targetX,-30*unit/Math.sin(Math.PI/6));
  near(orbit.targetZ,60*unit);
});

test('pan is reversible and proportional to zoom',()=>{
  const initial={topDown:false,azimuth:0.29,elevation:0.69,distance:4,targetX:0,targetZ:0};
  const orbit={...initial};
  panCameraTarget(orbit,80,-25,580);
  const x=orbit.targetX,z=orbit.targetZ;
  panCameraTarget(orbit,-80,25,580);
  near(orbit.targetX,0);near(orbit.targetZ,0);
  orbit.distance=2;
  panCameraTarget(orbit,80,-25,580);
  near(orbit.targetX,x/2);near(orbit.targetZ,z/2);
});

test('zoom can get more than ten times closer than the old minimum',()=>{
  const orbit={distance:3.97};
  for(let i=0;i<30;i++)zoomCamera(orbit,-100);
  near(orbit.distance,MIN_CAMERA_DISTANCE);
  assert.ok(orbit.distance<2.6/8);
  for(let i=0;i<40;i++)zoomCamera(orbit,100);
  near(orbit.distance,MAX_CAMERA_DISTANCE);
});

test('wheel zoom is proportional and normalizes pixel and line deltas',()=>{
  const a={distance:3.97},b={distance:3.97};
  zoomCamera(a,-100,0);zoomCamera(b,-3,1);
  near(a.distance,b.distance);
  assert.ok(a.distance<3.97);
  zoomCamera(a,100,0);
  near(a.distance,3.97);
  zoomCamera(a,-3,2);
  assert.ok(a.distance>=MIN_CAMERA_DISTANCE);
});
