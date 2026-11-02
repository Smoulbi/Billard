// First-person aiming uses relative mouse travel, independently of table picking.
export function createFirstPersonView() {
  return {fine:false,locked:false,previousX:null,shot:null};
}
export function resetFirstPersonAim(view) {
  view.fine=false;view.locked=false;view.previousX=null;view.shot=null;
}
export function rotateFirstPersonAim(view, aim, deltaX) {
  if(view.locked||!Number.isFinite(deltaX))return {...aim};
  const angle=Math.atan2(aim.z,aim.x)+deltaX*(view.fine?0.00035:0.0035);
  return {x:Math.cos(angle),z:Math.sin(angle)};
}
export function firstPersonPose(cue, aim) {
  // Eyes above the shaft, close to the cue ball, looking along the shot line.
  return {
    position:{x:cue.x-aim.x*0.52,y:0.23,z:cue.z-aim.z*0.52},
    target:{x:cue.x+aim.x*1.4,y:0.035,z:cue.z+aim.z*1.4}
  };
}
export function freezeFirstPersonShot(view, cue, aim) {
  view.shot=firstPersonPose(cue,aim);
}
export function currentFirstPersonPose(view, cue, aim, shooting) {
  return shooting&&view.shot?view.shot:firstPersonPose(cue,aim);
}
