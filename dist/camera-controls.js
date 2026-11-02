// Pan the table along its horizontal plane, keeping the camera orientation unchanged.
// One CSS pixel corresponds to the perspective frustum's size at the orbit target.
export function panCameraTarget(orbit, deltaX, deltaY, viewportHeight, fovDegrees = 40) {
  if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY) || !(viewportHeight > 0)) return;

  const distance = orbit.distance;
  const unitsPerPixel = 2 * distance * Math.tan(fovDegrees * Math.PI / 360) / viewportHeight;
  const azimuth = orbit.topDown ? 0 : orbit.azimuth;
  const verticalScale = orbit.topDown ? 1 : 1 / Math.sin(orbit.elevation);

  // Screen-right on the cloth is (cos(a), -sin(a)); screen-up points away
  // from the camera, toward (-sin(a), -cos(a)) in the XZ plane.
  orbit.targetX -= deltaX * unitsPerPixel * Math.cos(azimuth);
  orbit.targetZ += deltaX * unitsPerPixel * Math.sin(azimuth);
  orbit.targetX -= deltaY * unitsPerPixel * verticalScale * Math.sin(azimuth);
  orbit.targetZ -= deltaY * unitsPerPixel * verticalScale * Math.cos(azimuth);
}

export const MIN_CAMERA_DISTANCE = 0.3;
export const MAX_CAMERA_DISTANCE = 6.4;

// Multiplicative zoom keeps each wheel notch proportional to the current
// distance. Pixel, line and page scroll deltas are normalized independently.
export function zoomCamera(orbit, deltaY, deltaMode = 0) {
  if (!Number.isFinite(deltaY)) return;
  const wheelSteps = deltaMode === 1 ? deltaY / 3 : deltaMode === 2 ? deltaY : deltaY / 100;
  const nextDistance = orbit.distance * Math.exp(wheelSteps * 0.17);
  orbit.distance = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, nextDistance));
}
