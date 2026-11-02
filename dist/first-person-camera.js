// First-person aiming uses relative mouse travel, independently of table picking.
export function createFirstPersonView() {
  return {fine:false,locked:false,previousX:null,previousY:null,shot:null};
}
export function resetFirstPersonAim(view) {
  view.fine=false;view.locked=false;view.previousX=null;view.previousY=null;view.shot=null;
}
export function rotateFirstPersonAim(view, aim, deltaX) {
  if(view.locked||!Number.isFinite(deltaX))return {...aim};
  const angle=Math.atan2(aim.z,aim.x)+deltaX*(view.fine?0.00035:0.0035);
  return {x:Math.cos(angle),z:Math.sin(angle)};
}
export function firstPersonPose(cue, aim, {height=0.23, setback=0.52}={}) {
  // Eyes above the shaft, close to the cue ball, looking along the shot line.
  return {
    position:{x:cue.x-aim.x*setback,y:height,z:cue.z-aim.z*setback},
    target:{x:cue.x+aim.x*1.4,y:0.035,z:cue.z+aim.z*1.4}
  };
}
export function freezeFirstPersonShot(view, cue, aim) {
  view.shot={cue:{x:cue.x,z:cue.z},aim:{...aim}};
}
export function currentFirstPersonPose(view, cue, aim, shooting, settings) {
  const origin=shooting&&view.shot?view.shot:{cue,aim};
  return firstPersonPose(origin.cue,origin.aim,settings);
}

// Height is expressed in centimetres, like the live UI control.
export function adjustFirstPersonHeight(view, height, deltaY) {
  if(view.locked||!Number.isFinite(deltaY))return height;
  return Math.max(12,Math.min(50,height-deltaY*(view.fine?0.01:0.1)));
}
