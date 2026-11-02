import {LENGTH, WIDTH, RADIUS, CORNER_CUT, SIDE_CUT} from './physics.js';

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
