// Render-independent, unilateral non-penetration for the height-constrained
// pool model. This does not identify new rubber/cloth material parameters.
import {COUPLED_POOL_RAIL_V021,resolveCoupledRailImpact} from './coupled-cushion.js';

export function resolveSeparatedRailImpact(ball,nx,nz,options) {
  const incoming=ball.vx*nx+ball.vz*nz;
  // For a sphere, rotation cannot close its geometric gap to the rail.
  // A receding centre must not receive a new impact just because of spin.
  if(incoming>=-1e-7)return {speed:0,separationImpulse:0};
  const result=resolveCoupledRailImpact(ball,nx,nz,{
    ...options,parameters:options.parameters??COUPLED_POOL_RAIL_V021
  });
  const separationImpulse=projectRailSeparation(ball,nx,nz,options.mass);
  return {...result,speed:-incoming,separationImpulse};
}

// Minimum passive, torque-free geometric correction; shared with the
// reference-driven model. This is not an elastic rubber coefficient.
export function projectRailSeparation(ball,nx,nz,mass) {
  const residual=ball.vx*nx+ball.vz*nz;
  if(residual>=0)return 0;
  ball.vx-=residual*nx;ball.vz-=residual*nz;
  return -mass*residual;
}
