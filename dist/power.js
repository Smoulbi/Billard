// UI stroke scale, expressed as the initial cue-ball speed for a centred hit.
// Tournament break shots typically reach around 10–13 m/s.  The additional
// high-end stroke reserve leaves the existing delicate-shot calibration nearly
// unchanged while making a genuine hard break possible at 95–100%.
export function powerToCueSpeed(percent) {
  const p = Math.max(0, Math.min(100, Number(percent) || 0)) / 100;
  if (p === 0) return 0;
  const controlledStroke = 0.16 + 5 * p ** 1.5;
  const breakStroke = 6.84 * Math.max(0, (p - 0.60) / 0.40) ** 2;
  return controlledStroke + breakStroke;
}
