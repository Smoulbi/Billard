export const SHOT_CAMERA_DELAY = 450;
export const SHOT_CAMERA_DURATION = 500;

// Keep the strike visible, then ease quickly into the overview.
export function shotCameraProgress(elapsed, duration=SHOT_CAMERA_DURATION) {
  const t=Math.max(0,Math.min(1,(elapsed-SHOT_CAMERA_DELAY)/duration));
  return t*t*(3-2*t);
}
