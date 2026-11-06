import {RADIUS} from './physics.js';
import {canPlaceFreeCue} from './placement.js';
import {nineBallRack} from './nine-ball-rules.js';
const HISTORY_LIMIT=100;

export function trainingLayout(kind='clear') {
  const cue={num:0,x:-.76,z:0};
  if(kind==='clear')return [cue];
  if(kind==='nine')return [cue,...nineBallRack(RADIUS)];
  if(kind!=='eight')throw new Error('Configuration inconnue.');
  const sequence=[1,2,9,3,8,10,4,11,5,12,6,13,14,7,15];
  const rack=[];let index=0;
  for(let row=0;row<5;row++)for(let j=0;j<=row;j++)rack.push({
    num:sequence[index++],x:.49+row*(Math.sqrt(3)*RADIUS+.00006),
    z:(j-row/2)*(2*RADIUS+.00012)
  });
  return [cue,...rack];
}
export function canPlaceTrainingBall(num,x,z,balls) {
  return canPlaceFreeCue(x,z,[])&&balls.every(b=>b.num===num||b.active===false||
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
