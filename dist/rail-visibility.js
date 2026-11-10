// Render-only cutaway behind a cue ball near a cushion. Plane equations use
// Three.js's negative-half-space clipping convention; intersect all five.
export function railCutaway(cue,aim,{length,width,setback=.52}={}) {
  if(!cue||cue.active===false||Math.min(length-Math.abs(cue.x),width-Math.abs(cue.z))>.12)return null;
  const norm=Math.hypot(aim.x,aim.z);
  if(!norm)return null;
  const x=aim.x/norm,z=aim.z/norm,sideX=-z,sideZ=x;
  const along=x*cue.x+z*cue.z,side=sideX*cue.x+sideZ*cue.z;
  return [
    {x,y:0,z,constant:-along}, // behind the centre of the white
    {x:-x,y:0,z:-z,constant:along-setback-.12},
    {x:sideX,y:0,z:sideZ,constant:-side-.075},
    {x:-sideX,y:0,z:-sideZ,constant:side-.075},
    {x:0,y:-1,z:0,constant:.0015} // preserve the cloth/slate beneath
  ];
}
