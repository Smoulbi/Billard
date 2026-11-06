import {firstPersonYawDelta} from './first-person-camera.js?v=0.61';
const RESPONSE_SECONDS = .025;

export function createAimSmoothing(aim) {
  const angle=Math.atan2(aim.z,aim.x);
  return {angle,target:angle};
}
export function resetAimSmoothing(state,aim) {
  state.angle=state.target=Math.atan2(aim.z,aim.x);
}
export function queueAimMovement(state,view,deltaX) {
  // Keep an unwrapped target: crossing +/-pi must not reverse the camera.
  state.target+=firstPersonYawDelta(view,deltaX);
}
export function stepAimSmoothing(state,seconds) {
  if(!Number.isFinite(seconds)||seconds<=0||state.angle===state.target)return null;
  state.angle+=(state.target-state.angle)*(-Math.expm1(-seconds/RESPONSE_SECONDS));
  if(Math.abs(state.target-state.angle)<1e-7)state.angle=state.target;
  return {x:Math.cos(state.angle),z:Math.sin(state.angle)};
}
