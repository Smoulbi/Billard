// Locate the contact on the cue-facing hemisphere in the cue's tilted frame.
export function spinContactPoint(cue,aim,spin,radius,elevation=0) {
  const tilt=elevation*Math.PI/180,c=Math.cos(tilt),s=Math.sin(tilt);
  const side=spin.x*.62*radius,vertical=spin.y*.62*radius;
  const depth=Math.sqrt(Math.max(0,radius*radius-side*side-vertical*vertical));
  const direction={x:aim.x*c,y:-s,z:aim.z*c};
  return {
    x:cue.x-aim.z*side+aim.x*s*vertical-direction.x*depth,
    y:radius+c*vertical-direction.y*depth,
    z:cue.z+aim.x*side+aim.z*s*vertical-direction.z*depth
  };
}
export function moveSpinTarget(spin,dx,dy,fine=false) {
  const rate=fine ? .001 : .004;
  let x=spin.x+(Number.isFinite(dx)?dx:0)*rate;
  let y=spin.y-(Number.isFinite(dy)?dy:0)*rate;
  const length=Math.hypot(x,y);
  if(length>.98){x=x/length*.98;y=y/length*.98;}
  return {x,y};
}
