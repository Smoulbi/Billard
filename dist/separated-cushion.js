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
  const residual=ball.vx*nx+ball.vz*nz;
  let separationImpulse=0;
  if(residual<0){
    // Minimum passive correction to enforce v_normal >= 0. A radial nose
    // impulse has no torque on a sphere; the cloth balances its downward
    // component under the existing fixed-height assumption. No additional
    // elastic rebound is invented and tangent velocity/spin stay unchanged.
    separationImpulse=-options.mass*residual;
    ball.vx-=residual*nx;ball.vz-=residual*nz;
  }
  return {...result,speed:-incoming,separationImpulse};
}
