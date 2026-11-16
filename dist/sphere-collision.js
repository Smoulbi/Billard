// Instantaneous equal homogeneous spheres. The caller supplies a unit normal
// from A to B. No position or cloth integration is performed here.
export function resolveSphereImpulse(a,b,n,{
  mass,radius,restitution,friction,freeA=true,freeB=true
}) {
  const [nx,ny,nz]=n;
  const normalSpeed=(b.vx-a.vx)*nx+((b.vy||0)-(a.vy||0))*ny+(b.vz-a.vz)*nz;
  if(normalSpeed>=-1e-7)return {impactSpeed:0,normalImpulse:0,tangentImpulse:[0,0,0],supportA:0,supportB:0};
  const inverseMass=1/mass,inverseInertia=1/(.4*mass*radius*radius);
  // A supported centre has zero mobility into the table. Only normal support
  // is modelled here; simultaneous cloth shear is deliberately outside scope.
  const normalMobility=(2*(nx*nx+nz*nz)+(Number(freeA)+Number(freeB))*ny*ny)*inverseMass;
  if(normalMobility<1e-12)return {impactSpeed:0,normalImpulse:0,tangentImpulse:[0,0,0],supportA:0,supportB:0};
  const jn=-(1+restitution)*normalSpeed/normalMobility;
  // Contact surface velocity B-A, including all three spin components.
  const wx=a.wx+b.wx,wy=a.wy+b.wy,wz=a.wz+b.wz;
  const ux=b.vx-a.vx-radius*(wy*nz-wz*ny);
  const uy=(b.vy||0)-(a.vy||0)-radius*(wz*nx-wx*nz);
  const uz=b.vz-a.vz-radius*(wx*ny-wy*nx);
  const un=ux*nx+uy*ny+uz*nz;
  let tx=ux-un*nx,ty=uy-un*ny,tz=uz-un*nz;
  const fullSlip=Math.hypot(tx,ty,tz);
  if(!freeA||!freeB){
    // The horizontal tangent perpendicular to n is decoupled from normal
    // support. The inclined/vertical tangent requires a coupled floor solver,
    // so do not invent that impulse or a hop by clamping a velocity afterwards.
    const horizontal=Math.hypot(nx,nz);
    if(horizontal>1e-10){
      const hx=-nz/horizontal,hz=nx/horizontal;
      const speed=ux*hx+uz*hz;
      tx=speed*hx;ty=0;tz=speed*hz;
    }else{tx=ux;ty=0;tz=uz;} // vertical normal: both tangents are horizontal
  }
  const slip=Math.hypot(tx,ty,tz);
  const mu=typeof friction==='function'?friction(fullSlip):friction;
  // 2/m + 2R²/I = 7/m. Capping at zero slip closes the rigid stick branch.
  const impulse=slip>1e-12?Math.min(mu*jn,mass*slip/7):0;
  const scale=slip>1e-12?-impulse/slip:0;
  const jx=scale*tx,jy=scale*ty,jz=scale*tz;
  a.vx-=(jn*nx+jx)*inverseMass;b.vx+=(jn*nx+jx)*inverseMass;
  a.vz-=(jn*nz+jz)*inverseMass;b.vz+=(jn*nz+jz)*inverseMass;
  if(freeA)a.vy=(a.vy||0)-(jn*ny+jy)*inverseMass;
  if(freeB)b.vy=(b.vy||0)+(jn*ny+jy)*inverseMass;
  // Opposite forces at opposite arms give equal spin changes.
  const cx=-radius*(ny*jz-nz*jy)*inverseInertia;
  const cy=-radius*(nz*jx-nx*jz)*inverseInertia;
  const cz=-radius*(nx*jy-ny*jx)*inverseInertia;
  a.wx+=cx;b.wx+=cx;a.wy+=cy;b.wy+=cy;a.wz+=cz;b.wz+=cz;
  return {impactSpeed:-normalSpeed,normalImpulse:jn,tangentImpulse:[jx,jy,jz],
    supportA:freeA?0:jn*ny,supportB:freeB?0:-jn*ny};
}
