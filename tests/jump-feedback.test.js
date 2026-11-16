import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {makePhysicsBody,strikeBall,simulatePhysics,RADIUS} from '../dist/physics.js';
import {ShotReplay} from '../dist/shot-replay.js';
import {powerToCueSpeed} from '../dist/power.js';
import {impactGain} from '../dist/impact-audio.js';
const source=readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const extract=(name,next)=>source.slice(source.indexOf(`function ${name}(`),source.indexOf(`function ${next}(`));
const noop=()=>{};
test('a successful strike resets the next elevation while preserving launch and replay metadata; a blocked shot preserves it',()=>{
 const el=new Proxy({}, {get(target,key){return target[key]??= {value:'',hidden:true,style:{}};}});
 el.elevationSlider.value='45';el.powerSlider.value='33.333333333333';
 const cue=makePhysicsBody(0,-.8,0);cue.mesh={clone:()=>({}),quaternion:{toArray:()=>[0,0,0,1]}};
 const context={el,balls:[cue],strikeBall,powerToCueSpeed,ShotReplay,ShotTelemetry:class{constructor(...args){this.options=args[3];}},
  gamePaused:false,replayPlayback:null,strokePhase:'aim',training:null,powerInputMode:'gauge',match:null,shotActive:false,
  needsCuePlacement:false,firstPerson:{},aim:{x:1,z:0},spin:{x:0,y:0},cameraMode:'overhead',fallbackCtx:null,
  shotCount:0,activeLabScenario:null,cueTrailLine:null,objectTrailLine:null,
  impactAudio:{unlock:noop,play:noop},freezeFirstPersonShot:noop,releaseAimMouse:noop,
  updateCounters:noop,updateVisuals:noop,updatePowerReadout:noop,setStatus:noop};
 const shoot=runInNewContext(extract('setElevation','prepareLabTable')+extract('shoot','pocketBall')+'\nshoot',context);
 assert.equal(shoot(),true);assert.equal(el.elevationSlider.value,'0');assert.equal(el.elevationValue.textContent,'0°');
 assert.ok(cue.vy>1);assert.equal(context.lastShotReplay.metadata.elevation,45);
 assert.equal(context.lastShotSnapshot.elevation,45);assert.equal(context.telemetry.options.elevation,45);
 el.elevationSlider.value='38';context.gamePaused=true;assert.equal(shoot(),false);assert.equal(el.elevationSlider.value,'38');
});
test('real landing audio uses the cushion sample and the vertical impact speed, including the small bounce',()=>{
 const ball=makePhysicsBody(0,0,0);ball.vy=1.2;ball.vx=.1;
 ball.mesh={position:{set:noop},quaternion:{premultiply:noop}};
 const calls=[],context={balls:[ball],simulatePhysics,RADIUS,el:{cushionModel:{value:'reference-v069'}},
  impactAudio:{play:(kind,speed)=>calls.push({kind,speed,gain:impactGain(speed)})},
  pocketBall:noop,telemetry:null,shotEvents:null,shotSimTime:0,lastMetricsAt:0,
  updateLabMeasurements:noop,syncTrailLines:noop,lastShotReplay:null,shotActive:false,
  ballRotationAxis:{set:noop},ballRotationQuaternion:{setFromAxisAngle:noop}};
 const step=runInNewContext(extract('physicsStep','beginShotCameraTransition')+'\nphysicsStep',context);
 for(let i=0;i<240;i++)step(1/240);
 assert.ok(calls.length>=3);assert.ok(calls.every(c=>c.kind==='cushion'));
 assert.ok(Math.abs(calls[0].speed-1.2)<1e-8);
 for(let i=1;i<calls.length;i++){assert.ok(calls[i].speed<calls[i-1].speed);assert.ok(calls[i].gain<calls[i-1].gain);assert.ok(calls[i].gain>0);}
 assert.ok(calls.at(-1).speed<.35,'the final soft landing remains audible');
});
test('the elevation indicator remains visible after adjustment and clears for the shot or a flat cue',()=>{
 const context={gamePaused:false,replayPlayback:null,cameraMode:'perspective',powerInputMode:'mouse',strokePhase:'spin',shotActive:false,
  el:{jumpHint:{},matchOverlay:{hidden:true},elevationSlider:{value:'46'}},refreshPlacementUI:noop,cueGroup:null};
 const update=runInNewContext(extract('updateVisuals','shoot')+'\nupdateVisuals',context);
 update();assert.equal(context.el.jumpHint.hidden,false);assert.match(context.el.jumpHint.textContent,/46°/);
 context.strokePhase='aim';update();assert.equal(context.el.jumpHint.hidden,false);assert.match(context.el.jumpHint.textContent,/46°/);
 context.shotActive=true;update();assert.equal(context.el.jumpHint.hidden,true);
 context.shotActive=false;context.el.elevationSlider.value='0';update();assert.equal(context.el.jumpHint.hidden,true);
});
