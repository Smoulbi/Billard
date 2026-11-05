// Linear gauge: 50% is half the maximum centred cue-ball speed (12 m/s).
export function powerToCueSpeed(percent) {
  return 12 * Math.max(0,Math.min(100,Number(percent)||0)) / 100;
}
