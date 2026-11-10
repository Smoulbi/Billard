import {LENGTH, WIDTH, RADIUS, CORNER_CUT, SIDE_CUT, NOSE_HEIGHT,
  getPockets,getCushionSegments,pocketSupportClearance} from './physics.js?v=0.68';
import {tableClothBoundary} from './table-pocket-geometry.js';

// The cue-ball centre must remain behind the head string. Avoid the cushions,
// corner pocket mouths and other balls when positioning the break.
export const HEAD_STRING_X = -LENGTH / 2;
export const BREAK_X_MIN = -LENGTH + RADIUS + 0.004;
export const BREAK_X_MAX = HEAD_STRING_X - 0.001;
export const BREAK_Z_LIMIT = WIDTH - RADIUS - 0.004;

export function clampBreakPosition(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return {x:Math.max(BREAK_X_MIN,Math.min(BREAK_X_MAX,x)),
    z:Math.max(-BREAK_Z_LIMIT,Math.min(BREAK_Z_LIMIT,z))};
}

export function canPlaceBreakCue(x, z, otherBalls = []) {
  if (!Number.isFinite(x) || !Number.isFinite(z) ||
      x < BREAK_X_MIN || x > BREAK_X_MAX || Math.abs(z) > BREAK_Z_LIMIT) return false;
  for (const side of [-1, 1]) {
    if (Math.hypot(x + LENGTH, z - side * WIDTH) < CORNER_CUT + 0.012) return false;
  }
  return otherBalls.every(b => !b.active || b.num === 0 ||
    Math.hypot(x - b.x, z - b.z) > 2 * RADIUS + 0.003);
}

export function clampFreePosition(x, z) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return {x:Math.max(-LENGTH+RADIUS+.004,Math.min(LENGTH-RADIUS-.004,x)),
    z:Math.max(-WIDTH+RADIUS+.004,Math.min(WIDTH-RADIUS-.004,z))};
}

export function canPlaceFreeCue(x, z, otherBalls = []) {
  if (!Number.isFinite(x) || !Number.isFinite(z) ||
      Math.abs(x) > LENGTH-RADIUS-.004 || Math.abs(z) > WIDTH-RADIUS-.004) return false;
  for (const sx of [-1,1]) for (const sz of [-1,1]) {
    // A ball cannot be placed in the open corner aperture.
    if (Math.hypot(x-sx*LENGTH,z-sz*WIDTH) < CORNER_CUT+RADIUS*.35) return false;
  }
  for (const sz of [-1,1]) {
    if (Math.hypot(x,z-sz*WIDTH) < SIDE_CUT+RADIUS*.35) return false;
  }
  return otherBalls.every(b => !b.active || b.num === 0 ||
    Math.hypot(x-b.x,z-b.z) > 2*RADIUS+.003);
}

// Training placement uses the actual felt cut and the same cushion capsules
// and support test as the physics solver, rather than broad pocket circles.
const SUPPORTED_CLOTH=tableClothBoundary(LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,getPockets(),64);
const CUSHION_REACH=Math.sqrt(RADIUS**2-(NOSE_HEIGHT-RADIUS)**2);
function segmentDistanceSquared(x,z,x0,z0,x1,z1) {
  const dx=x1-x0,dz=z1-z0;
  const t=Math.max(0,Math.min(1,((x-x0)*dx+(z-z0)*dz)/(dx*dx+dz*dz||1)));
  return (x-x0-t*dx)**2+(z-z0-t*dz)**2;
}
function isOnCloth(x,z) {
  let inside=false;
  for(let i=0,j=SUPPORTED_CLOTH.length-1;i<SUPPORTED_CLOTH.length;j=i++){
    const [x0,z0]=SUPPORTED_CLOTH[j],[x1,z1]=SUPPORTED_CLOTH[i];
    if(segmentDistanceSquared(x,z,x0,z0,x1,z1)<1e-18)return true;
    if((z0>z)!==(z1>z)&&x<(x1-x0)*(z-z0)/(z1-z0)+x0)inside=!inside;
  }
  return inside;
}
export function canPlaceSupportedBall(x,z) {
  if(!Number.isFinite(x)||!Number.isFinite(z)||!isOnCloth(x,z)||pocketSupportClearance(x,z)>0)return false;
  return getCushionSegments().every(rail=>
    segmentDistanceSquared(x,z,rail.x0,rail.z0,rail.x1,rail.z1)>=(CUSHION_REACH+1e-6)**2);
}
