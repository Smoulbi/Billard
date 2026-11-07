import {imperfectRack} from './rack.js?v=0.65';
import {RADIUS} from './physics.js';
import {canPlaceSupportedBall} from './placement.js?v=0.63';
import {nineBallRack} from './nine-ball-rules.js?v=0.65';
const HISTORY_LIMIT=100;

export function trainingLayout(kind='clear',random=Math.random) {
  const cue={num:0,x:-.76,z:0};
  if(kind==='clear')return [cue];
  if(kind==='nine')return [cue,...nineBallRack(RADIUS,random)];
  if(kind!=='eight')throw new Error('Configuration inconnue.');
  const sequence=[1,2,9,3,8,10,4,11,5,12,6,13,14,7,15];
  return [cue,...imperfectRack([1,2,3,4,5],sequence,RADIUS,random)];
}
export function canPlaceTrainingBall(num,x,z,balls) {
  return canPlaceSupportedBall(x,z)&&balls.every(b=>b.num===num||b.active===false||
    Math.hypot(x-b.x,z-b.z)>=2*RADIUS+1e-5);
}
export function createTrainingSession() {
  return {editing:false,selected:0,addNumber:null,paletteKey:'',undo:[],redo:[]};
}
export function recordTrainingChange(session,snapshot) {
  session.undo.push(structuredClone(snapshot));
  if(session.undo.length>HISTORY_LIMIT)session.undo.shift();
  session.redo=[];
}
export function undoTrainingChange(session,current) {
  if(!session.undo.length)return null;
  session.redo.push(structuredClone(current));
  return session.undo.pop();
}
export function redoTrainingChange(session,current) {
  if(!session.redo.length)return null;
  session.undo.push(structuredClone(current));
  return session.redo.pop();
}
