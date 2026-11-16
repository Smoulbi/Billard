import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {panCameraTarget,zoomCamera} from '../dist/camera-controls.js';
const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const never=()=>assert.fail('replay navigation must not edit the live game');
function handlers(){
 const context={gamePaused:false,replayPlayback:{pausedAt:.3,record:{duration:1}},shotActive:false,
  training:{editing:true},trainingDrag:{id:99},cameraMode:'perspective',fallbackCtx:null,
  placementPointer:{id:99},placementMode:false,needsCuePlacement:false,powerInputMode:'mouse',strokePhase:'spin',
  orbit:{topDown:false,azimuth:.3,elevation:.7,distance:4,targetX:0,targetZ:0},camera:{fov:40},
  el:{gameCanvas:{focus(){},setPointerCapture(){},style:{},clientHeight:600}},panCameraTarget,zoomCamera,
  updateCamera(){context.draws++;},refreshReplayCameraUI(){context.uiUpdates++;},draws:0,uiUpdates:0,
  beginTrainingPlacement:never,moveTrainingBall:never,tablePointAt:never,updateAimAt:never,setElevation:never,
  cuePlacementAvailable:never};
 const event=(type,end)=>{
  const start=source.indexOf(`  el.gameCanvas.addEventListener('${type}',e=>{`);
  const part=source.slice(start,source.indexOf(end,start));
  return runInNewContext(part.slice(part.indexOf('e=>{'),part.lastIndexOf('});')+1) ,context);
 };
 const down=event('pointerdown',"  el.gameCanvas.addEventListener('pointerleave'");
 const move=event('pointermove','  const releasePointer=');
 const wheel=runInNewContext(source.match(/el\.gameCanvas\.addEventListener\('wheel',(e=>\{.*\}),\{passive:false\}\);/)[1],context);
 return {context,down,move,wheel};
}
const pointer=(button,x=100,y=100)=>({button,pointerId:42,clientX:x,clientY:y,preventDefault(){}});
test('replay supports rotation, pan and zoom while paused without changing the recording or live placement',()=>{
 const {context:c,down,move,wheel}=handlers();const record=JSON.stringify(c.replayPlayback);
 down(pointer(2));move(pointer(2,120,115));assert.notEqual(c.orbit.azimuth,.3);assert.notEqual(c.orbit.elevation,.7);
 down(pointer(1));move(pointer(1,130,140));assert.notEqual(c.orbit.targetX,0);assert.notEqual(c.orbit.targetZ,0);
 wheel({deltaY:-100,deltaMode:0,preventDefault(){}});assert.ok(c.orbit.distance<4);
 assert.equal(JSON.stringify(c.replayPlayback),record);assert.deepEqual(c.placementPointer,{id:99});assert.ok(c.draws>=3);
});
test('right drag leaves overhead mode during replay; left clicks and idle movement do not aim or place balls',()=>{
 const {context:c,down,move}=handlers();c.orbit.topDown=true;c.cameraMode='overhead';
 down(pointer(0));move(pointer(0));assert.equal(c.draws,0);
 down(pointer(2));move(pointer(2,110,100));assert.equal(c.orbit.topDown,false);assert.equal(c.cameraMode,'perspective');assert.equal(c.uiUpdates,1);
});
test('opening the pause menu blocks replay camera input',()=>{
 const {context:c,down,move,wheel}=handlers();c.gamePaused=true;const initial=JSON.stringify(c.orbit);
 down(pointer(2));move(pointer(2,140,140));wheel({deltaY:100,preventDefault(){}});
 assert.equal(JSON.stringify(c.orbit),initial);assert.equal(c.draws,0);
});
test('exiting replay restores the complete orbit and camera and releases the captured pointer',()=>{
 const before={azimuth:.9,elevation:.5,distance:2.4,targetX:.2,targetZ:-.1,topDown:true,dragMode:null,pointerId:null};
 const restoredCamera={saved:true};let released=false,closed=false;
 const c={replayPlayback:{cameraMode:'overhead',camera:restoredCamera,orbit:before,meshes:[],hidden:[],overlays:[],shotState:'PRÊT'},
  orbit:{...before,azimuth:-1,distance:5,dragMode:'rotate',pointerId:42},cameraMode:'perspective',
  scene:{remove(){}},camera:{copy(value){assert.equal(value,restoredCamera);},updateProjectionMatrix(){}},
  el:{gameCanvas:{clientWidth:1000,clientHeight:600,style:{},hasPointerCapture:()=>true,releasePointerCapture(){released=true;},closest:()=>({classList:{remove(){}}})},
   replayDialog:{close(){closed=true;}},shotState:{},cameraName:{}},updateVisuals(){}};
 const start=source.indexOf('function releaseCameraDrag('),end=source.indexOf('function animateShotReplay(');
 const stop=runInNewContext(source.slice(start,end)+'\nstopShotReplay',c);stop();
 assert.equal(c.replayPlayback,null);assert.deepEqual(c.orbit,before);assert.equal(c.cameraMode,'overhead');assert.ok(released&&closed);
});
