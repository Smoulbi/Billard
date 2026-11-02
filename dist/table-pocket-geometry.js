// Shared geometric reference for the cloth opening, pocket well and capture.
// The physics module consumes its aperture directly, while cushion contacts
// remain independent. All distances are in metres.
export const CORNER_CAP_EXTENSION=.019;
// Leave an 8 mm joining piece between each capped rail and its cushion jaw;
// the old 25 mm setback made the side pocket look 179.6 mm wide on the rail.
export const SIDE_CAP_SETBACK=.008;
export const RAIL_CAP_INNER_OFFSET=.049;
// These same values define BOTH the physical 142° corner facings in
// physics.js and the exact 3D graphite/rubber/cloth boundaries.
export const CORNER_FACING_RUN=.028;
export const CORNER_FACING_ANGLE=38*Math.PI/180;
export const CORNER_RUBBER_SHOULDER=.010;
export const CORNER_RAIL_REAR_TOP=.048;
export const SIDE_FACING_RUN=.011;
export const SIDE_FACING_ANGLE=76*Math.PI/180;
export const SIDE_RUBBER_SHOULDER=.010;
export const SIDE_POCKET_NOTCH_BACK=.108;
// Corner opening and capture share one COMPLETE circle. The separate rear
// wood-return circle only defines the cabinet fitting, never the black hole.
// These derived dimensions are a visual construction, not a manufacturer cut.
// Side pockets used to project 12 mm INTO the playing bed at their midpoint.
// The centre of their visible/physical circular front arc now sits 8 mm
// BEHIND the jaw chord; both physical jaws remain where they were.
export const SIDE_VISIBLE_LIP_SAGITTA=-.008;

// A mouth is the straight chord between the two cushion noses. Its width is
// specified by the WPA; no circular pocket radius is prescribed. The slate
// cut and cloth-covered shelf sit BEHIND this line, towards the pocket.

export function pocketMouthCurve(p,cornerCut,sideCut,steps=36){
  let start,end;
  if(p.kind==='corner'){
    start=[p.x-p.sx*cornerCut,p.z];
    end=[p.x,p.z-p.sz*cornerCut];
  }else{
    start=[p.x-sideCut,p.z];end=[p.x+sideCut,p.z];
  }
  const points=[];
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    points.push([start[0]+(end[0]-start[0])*t,
      start[1]+(end[1]-start[1])*t]);
  }
  return points;
}

// Exact circular arc through the two jaw points, with a prescribed sagitta.
// The sagitta is always measured normal to the physical mouth chord. Unlike
// the previous sine and sine-squared splines, this has constant curvature.
function pocketArc(p,cornerCut,sideCut,steps,depth,pointsTowardTable){
  const mouth=pocketMouthCurve(p,cornerCut,sideCut,steps);
  const a=Math.hypot(mouth.at(-1)[0]-mouth[0][0],
    mouth.at(-1)[1]-mouth[0][1])/2;
  if(depth<=0)return mouth;
  const radius=(a*a+depth*depth)/(2*depth);
  const chordOffset=radius-depth;
  return mouth.map(([x,z],i)=>{
    const longitudinal=a*(2*i/steps-1);
    const offset=Math.sqrt(Math.max(0,radius*radius-longitudinal*longitudinal))-
      chordOffset;
    const sign=pointsTowardTable?-1:1;
    if(p.kind==='side')return [x,z+sign*p.sz*offset];
    return [x+sign*p.sx*offset/Math.SQRT2,
      z+sign*p.sz*offset/Math.SQRT2];
  });
}

function unwrapAfter(a,previous){
  while(a<=previous)a+=2*Math.PI;
  return a;
}
function pointsOnCornerCircle(reference,start,end,steps){
  return Array.from({length:steps+1},(_,i)=>{
    const a=start+(end-start)*i/steps;
    return [reference.x+reference.sx*reference.radius*Math.cos(a),
      reference.z+reference.sz*reference.radius*Math.sin(a)];
  });
}
function cornerOpeningAngles(circle){
  // Diagnostic intersections with the rectangular field. The visible arc
  // must continue BEYOND these two intersections, into the felt shoulders;
  // otherwise straight cap-to-intersection edges look like a polygonal hole.
  const c=circle.offset,r=circle.radius;
  const q=Math.sqrt(r*r-c*c);
  const start=Math.atan2(-c,-q);
  const end=Math.atan2(-q,-c);
  return {start,end,edgeIntercept:q-c};
}
function centroidOfRim(points){
  let twiceArea=0,sumX=0,sumZ=0;
  for(let i=0;i<points.length;i++){
    const [x0,z0]=points[i],[x1,z1]=points[(i+1)%points.length];
    const cross=x0*z1-x1*z0;
    twiceArea+=cross;
    sumX+=(x0+x1)*cross;
    sumZ+=(z0+z1)*cross;
  }
  if(Math.abs(twiceArea)<1e-12)throw new RangeError('Degenerate pocket reference perimeter');
  return {x:sumX/(3*twiceArea),z:sumZ/(3*twiceArea)};
}

// Side rubber facings have the same 104° geometry and 10 mm rear shoulder as
// their physical rail segments. The cloth must extend around BOTH shoulders
// BEFORE its circular cut begins; otherwise a broad black triangle appears
// between the jaws and a nearly straight lip.
export function sidePocketAssemblyReference(p,sideCut){
  if(p.kind!=='side')throw new TypeError('Side assembly requires a side pocket');
  const across=SIDE_FACING_RUN*Math.tan(SIDE_FACING_ANGLE);
  const shoulder=SIDE_RUBBER_SHOULDER/Math.SQRT2;
  const jawA=[p.x-sideCut,p.z],jawB=[p.x+sideCut,p.z];
  const faceEndA=[p.x-sideCut+SIDE_FACING_RUN,p.z+p.sz*across];
  const faceEndB=[p.x+sideCut-SIDE_FACING_RUN,p.z+p.sz*across];
  const rubberStartA=[jawA[0]-shoulder,p.z+p.sz*shoulder];
  const rubberStartB=[jawB[0]+shoulder,p.z+p.sz*shoulder];
  const rubberEndA=[faceEndA[0]-shoulder,faceEndA[1]+p.sz*shoulder];
  const rubberEndB=[faceEndB[0]+shoulder,faceEndB[1]+p.sz*shoulder];
  return {jawA,jawB,faceEndA,faceEndB,rubberStartA,rubberStartB,
    rubberEndA,rubberEndB};
}

// One true constant-curvature arc from shoulder A to shoulder B. Its front
// midpoint is 8 mm outside the nose chord, but the lip ends 51 mm behind it,
// under the mitred rubber. This visibly rounds the WHOLE front of the opening
// and restores the blue felt on both formerly black triangular shoulders.
export function sidePocketFrontCircularArc(p,sideCut,steps=36,overhang=0){
  const {rubberEndA,rubberEndB}=sidePocketAssemblyReference(p,sideCut);
  const half=(rubberEndB[0]-rubberEndA[0])/2;
  const chord=p.sz*(rubberEndA[1]-p.z);
  const front=-SIDE_VISIBLE_LIP_SAGITTA-overhang;
  const depth=chord-front;
  if(!(depth>0))throw new RangeError('Side circular lip needs positive curvature');
  const radius=(half*half+depth*depth)/(2*depth);
  const offset=radius-depth;
  return Array.from({length:steps+1},(_,i)=>{
    const t=i/steps,u=(2*t-1)*half;
    const sag=Math.sqrt(Math.max(0,radius*radius-u*u))-offset;
    return [p.x+u,p.z+p.sz*(chord-sag)];
  });
}

// Rear wood-return reference for a CORNER pocket. In mirrored local axes:
// jaw A=(-a,0), jaw B=(0,-a), cap joints C=(-a+e,h), D=(h,-a+e).
// Symmetry forces the circle centre to (c,c). Equal distance to jaw A and
// cap joint C fixes c analytically; its radius follows from the jaw itself.
// This circle defines only the REAR return. It must not be imposed on the
// cloth-facing lip: doing so shifts the apparent opening into the table.
export function cornerPocketCircleReference(p,cornerCut){
  if(p.kind!=='corner')throw new TypeError('Corner circle requires a corner pocket');
  const near=-cornerCut+CORNER_CAP_EXTENSION;
  const shoulder=RAIL_CAP_INNER_OFFSET;
  const c=(near*near+shoulder*shoulder-cornerCut*cornerCut)/
    (2*(cornerCut+near+shoulder));
  const radius=Math.hypot(-cornerCut-c,-c);
  const jawA=Math.atan2(-c,-cornerCut-c);
  const jawB=unwrapAfter(Math.atan2(-cornerCut-c,-c),jawA);
  const capB=unwrapAfter(Math.atan2(near-c,shoulder-c),jawB);
  const capA=unwrapAfter(Math.atan2(shoulder-c,near-c),capB);
  const chordHalf=cornerCut/Math.SQRT2;
  const sagitta=radius-Math.sqrt(radius*radius-chordHalf*chordHalf);
  return {x:p.x+p.sx*c,z:p.z+p.sz*c,sx:p.sx,sz:p.sz,
    radius,sagitta,angles:{jawA,jawB,capB,capA}};
}

// The original cabinet circle wraps around the corner rail fittings and
// must stay untouched. Construct the ACTUAL black opening as a smaller,
// concentric-on-the-bisector circle: its frontmost point is the already
// recessed front of the old design; its rearmost point reaches the old rear
// fitting. Both red-marked shoulders now become felt up to this circle.
export function cornerPocketOpeningCircleReference(p,cornerCut,
  cabinet=cornerPocketCircleReference(p,cornerCut)){
  if(p.kind!=='corner')throw new TypeError('Opening circle requires a corner pocket');
  const cabinetC=p.sx*(cabinet.x-p.x);
  const front=-cornerCut/2+cabinet.sagitta/Math.SQRT2;
  const back=cabinetC+cabinet.radius/Math.SQRT2;
  const offset=(front+back)/2;
  const radius=(back-front)/Math.SQRT2;
  if(!(radius>offset&&offset>0))
    throw new RangeError('Corner aperture does not intersect both bed edges');
  const circle={x:p.x+p.sx*offset,z:p.z+p.sz*offset,
    sx:p.sx,sz:p.sz,offset,radius};
  // Project both existing cap joints radially onto the NEW pocket circle.
  // The complete felt-facing edge between those projections is one single
  // constant-curvature circular arc. Only the shorter radial connectors are
  // under the raised cushion faces, outside the exposed contact with felt.
  const near=-cornerCut+CORNER_CAP_EXTENSION;
  const shoulder=RAIL_CAP_INNER_OFFSET;
  const frontArcStart=Math.atan2(shoulder-offset,near-offset);
  const frontArcEnd=unwrapAfter(Math.atan2(near-offset,shoulder-offset),frontArcStart);
  return {...circle,...cornerOpeningAngles(circle),frontArcStart,frontArcEnd};
}

// The old nominal rear cabinet arc TANGENTLY CROSSED the real black opening
// at its backmost point. No watertight graphite ring can fit between two
// crossing curves. This decorative return instead stays at least 12 mm
// outside the physical opening, while meeting BOTH original wood cap joints
// exactly. It is one smooth symmetric radial curve, not a patch or offset mesh.
export function cornerPocketDecorativeOuterArc(p,cornerCut,steps=64){
  if(p.kind!=='corner')throw new TypeError('Corner return requires corner pocket');
  const opening=cornerPocketOpeningCircleReference(p,cornerCut);
  const c=[p.x+p.sx*(-cornerCut+CORNER_CAP_EXTENSION),
    p.z+p.sz*RAIL_CAP_INNER_OFFSET];
  const capRadius=Math.hypot(c[0]-opening.x,c[1]-opening.z);
  const rearRadius=opening.radius+.012;
  return Array.from({length:steps+1},(_,i)=>{
    const t=i/steps;
    const angle=opening.frontArcStart+
      (opening.frontArcEnd-2*Math.PI-opening.frontArcStart)*t;
    const weight=Math.cos(Math.PI*t)**2;
    const radius=rearRadius+(capRadius-rearRadius)*weight;
    return [opening.x+opening.sx*radius*Math.cos(angle),
      opening.z+opening.sz*radius*Math.sin(angle)];
  });
}

function cornerOpeningLip(circle,steps,radiusOffset=0){
  const radius=circle.radius+radiusOffset;
  const shifted={...circle,radius};
  return pointsOnCornerCircle(shifted,circle.frontArcStart,circle.frontArcEnd,steps);
}

function cornerOpeningRim(circle,steps){
  const count=Math.max(64,2*steps);
  return Array.from({length:count},(_,i)=>{
    const a=2*Math.PI*i/count;
    return [circle.x+circle.sx*circle.radius*Math.cos(a),
      circle.z+circle.sz*circle.radius*Math.sin(a)];
  });
}

// Canonical pocket reference: a complete circular opening at corners defines
// the felt cut, 3D basket and ball capture. Rear cap joints are decorative
// only, and the unchanged physical jaws stay outside the new felt shoulders.
export function pocketReferenceGeometry(p,cornerCut,sideCut,steps=36){
  if(p.kind==='corner'){
    const cabinet=cornerPocketCircleReference(p,cornerCut);
    const openingCircle=cornerPocketOpeningCircleReference(p,cornerCut,cabinet);
    const nearLip=cornerOpeningLip(openingCircle,steps);
    const farLip=cornerPocketDecorativeOuterArc(p,cornerCut,steps);
    const rim=cornerOpeningRim(openingCircle,steps);
    const mouth=pocketMouthCurve(p,cornerCut,sideCut,1);
    return {kind:p.kind,nearLip,farLip,rim,cornerCircle:cabinet,openingCircle,
      collectorCenter:{x:openingCircle.x,z:openingCircle.z},
      nearSagitta:-cabinet.sagitta,
      jawA:mouth[0],jawB:mouth[1],
      capA:farLip[0],capB:farLip.at(-1)};
  }
  const assembly=sidePocketAssemblyReference(p,sideCut);
  const nearLip=sidePocketFrontCircularArc(p,sideCut,steps);
  const farLip=sidePocketCapCircularReturn(
    assembly.rubberEndB[0]-p.x,p.sz*(assembly.rubberEndB[1]-p.z),
    SIDE_POCKET_NOTCH_BACK,steps)
    .map(([x,z])=>[p.x+x,p.z+p.sz*z]);
  const rim=[...nearLip,...farLip.toReversed()];
  // A 1-segment request is valid for inspecting a visible sagitta but its
  // two coincident cap/arc endpoints have zero polygon area. Sample the same
  // two arcs more densely for this collector-only computation.
  const collectorRim=steps>1?rim:[
    ...sidePocketFrontCircularArc(p,sideCut,16),
    ...sidePocketCapCircularReturn(
      assembly.rubberEndB[0]-p.x,p.sz*(assembly.rubberEndB[1]-p.z),
      SIDE_POCKET_NOTCH_BACK,16).map(([x,z])=>
      [p.x+x,p.z+p.sz*z]).toReversed()
  ];
  return {kind:p.kind,nearLip,farLip,rim,
    collectorCenter:centroidOfRim(collectorRim),
    nearSagitta:SIDE_VISIBLE_LIP_SAGITTA,
    jawA:assembly.jawA,jawB:assembly.jawB,
    capA:farLip[0],capB:farLip.at(-1)};
}

// Plan-view support test shared by the game solver and the visible opening.
// A ball whose centre projects inside this region has no cloth directly
// beneath its lowest point. The vertical drop is animated by the renderer.
export function pocketApertureContains(reference,x,z){
  if(reference.openingCircle){
    const circle=reference.openingCircle;
    return Math.hypot(x-circle.x,z-circle.z)<circle.radius;
  }
  const rim=reference.rim;
  let inside=false;
  for(let i=0,j=rim.length-1;i<rim.length;j=i++){
    const [xi,zi]=rim[i],[xj,zj]=rim[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)
      inside=!inside;
  }
  return inside;
}

// Distance measured INWARD from the aperture wall. Positive only over the
// open well. Gameplay capture begins when the ball CENTER crosses this rim.
export function pocketApertureClearance(reference,x,z){
  if(reference.openingCircle){
    const circle=reference.openingCircle;
    return circle.radius-Math.hypot(x-circle.x,z-circle.z);
  }
  const rim=reference.rim;
  let distanceSquared=Infinity;
  for(let i=0,j=rim.length-1;i<rim.length;j=i++){
    const [x0,z0]=rim[j],[x1,z1]=rim[i];
    const dx=x1-x0,dz=z1-z0;
    const t=Math.max(0,Math.min(1,
      ((x-x0)*dx+(z-z0)*dz)/(dx*dx+dz*dz)));
    distanceSquared=Math.min(distanceSquared,
      (x-x0-t*dx)**2+(z-z0-t*dz)**2);
  }
  const distance=Math.sqrt(distanceSquared);
  return pocketApertureContains(reference,x,z)?distance:-distance;
}


export function cornerPocketCapInnerArc(p,cornerCut,steps=64){
  if(p.kind!=='corner')throw new TypeError('Corner fitting requires a corner pocket');
  return pocketReferenceGeometry(p,cornerCut,0,steps).farLip;
}

// All exposed corner boundaries come from ONE 2D construction. The graphite
// is ONE simple U-shaped polygon, not an annulus plus independent patches.
// Its front edge shares rubberStart/end with the swept cushion and nearA/B
// with the felt and circular opening. The metal is outside the cloth polygon
// and the circle; it may sit above a concealed felt backing, as on real caps.
export function cornerPocketAssemblyReference(p,cornerCut,steps=64){
  if(p.kind!=='corner')throw new TypeError('Assembly requires a corner pocket');
  const opening=cornerPocketOpeningCircleReference(p,cornerCut);
  const outer=cornerPocketDecorativeOuterArc(p,cornerCut,steps);
  const inner=pointsOnCornerCircle(opening,
    opening.frontArcEnd-2*Math.PI,opening.frontArcStart,steps);
  const jawA=[p.x-p.sx*cornerCut,p.z];
  const jawB=[p.x,p.z-p.sz*cornerCut];
  const faceRun=CORNER_FACING_RUN;
  const faceAcross=faceRun*Math.tan(CORNER_FACING_ANGLE);
  const facingNormal=[p.sx/Math.SQRT2,p.sz/Math.SQRT2];
  const shoulder=CORNER_RUBBER_SHOULDER;
  const offset=[facingNormal[0]*shoulder,facingNormal[1]*shoulder];
  const endA=[jawA[0]+p.sx*faceRun,jawA[1]+p.sz*faceAcross];
  const endB=[jawB[0]+p.sx*faceAcross,jawB[1]+p.sz*faceRun];
  const rubberStartA=[jawA[0]+offset[0],jawA[1]+offset[1]];
  const rubberStartB=[jawB[0]+offset[0],jawB[1]+offset[1]];
  const rubberEndA=[endA[0]+offset[0],endA[1]+offset[1]];
  const rubberEndB=[endB[0]+offset[0],endB[1]+offset[1]];
  const railA=[jawA[0],jawA[1]+p.sz*CORNER_RAIL_REAR_TOP];
  const railB=[jawB[0]+p.sx*CORNER_RAIL_REAR_TOP,jawB[1]];
  const capApoint=outer[0],capBpoint=outer.at(-1);
  const nearA=inner.at(-1),nearB=inner[0];
  const graphite=[railA,...outer,railB,rubberStartB,rubberEndB,
    ...inner,rubberEndA,rubberStartA];
  return {jawA,jawB,railA,railB,capA:capApoint,capB:capBpoint,
    nearA,nearB,rubberStartA,rubberStartB,rubberEndA,rubberEndB,
    faceEndA:endA,faceEndB:endB,graphite,openingCircle:opening};
}

export function cornerPocketInsertOutline(p,cornerCut,steps=64){
  return cornerPocketAssemblyReference(p,cornerCut,steps).graphite;
}

// Diagnostic curve for the physical shelf DEPTH behind the cushion mouth:
// 35 mm at corners and 6 mm at sides, from p.shelf in physics.js. The WPA
// specifies the midpoint depth, not the entire cutter profile. This curve
// is not the visible cloth/slate cut, which consumes the canonical near lip.
export function pocketShelfCurve(p,cornerCut,sideCut,steps=36,overhang=0){
  return pocketArc(p,cornerCut,sideCut,steps,p.shelf+overhang,false);
}

// The corners follow the near quadrant of their closed circular openings.
// At side pockets, the arc now starts behind each mitred rubber facing; the
// two cloth-covered shoulders connect that circular edge to the real jaws.
export function pocketVisibleSagitta(p,cornerCut,sideCut){
  return pocketReferenceGeometry(p,cornerCut,sideCut,1).nearSagitta;
}
export function pocketVisibleCurve(p,cornerCut,sideCut,steps=36,overhang=0){
  if(p.kind==='corner')return cornerOpeningLip(
    cornerPocketOpeningCircleReference(p,cornerCut),steps,overhang);
  return sidePocketFrontCircularArc(p,sideCut,steps,overhang);
}

// A 2.5 mm recessed leather return follows the actual visible cloth boundary.
// Both curves stay on the pocket side of that edge, never on top of the felt.
export function pocketShelfLinerOutline(p,cornerCut,sideCut,steps=36){
  const front=pocketVisibleCurve(p,cornerCut,sideCut,steps,0);
  const rear=pocketVisibleCurve(p,cornerCut,sideCut,steps,-.0025);
  return [...front,...rear.reverse()];
}

// The half-ring below a side pocket faces OUTSIDE the field. Previous code
// used the opposite winding, creating a black arc 45 mm under the felt that
// read visually as a much larger pocket radius. The bottom collection cup
// is always entirely below the slate and has no bearing on ball collisions.
export function pocketCollectorArcPoint(p,radius,t,cornerCut,sideCut){
  if(p.kind==='side'){
    const a=Math.PI-p.sz*Math.PI*t;
    return [p.x+radius*Math.cos(a),p.z+radius*Math.sin(a)];
  }
  const mouth=pocketMouthCurve(p,cornerCut,sideCut,1);
  const first=Math.atan2(mouth[0][1]-p.z,mouth[0][0]-p.x);
  const last=Math.atan2(mouth[1][1]-p.z,mouth[1][0]-p.x);
  const delta=Math.atan2(Math.sin(last-first),Math.cos(last-first));
  const a=first+delta*t;
  return [p.x+radius*Math.cos(a),p.z+radius*Math.sin(a)];
}

export function pocketCollectorRadii(p,cornerCut,sideCut,ballRadius){
  const mouthHalf=p.kind==='corner'?cornerCut:sideCut;
  return {top:mouthHalf*.66,bottom:Math.max(mouthHalf*.46,ballRadius+.005)};
}

// Cloth and slate use the same circular lip. The physical shelf remains a
// separate geometric measurement, and the actual jaws do not move.
function tablePocketBoundary(length,width,cornerCut,sideCut,pockets,steps,overhang,curveFunction){
  const corner=(sx,sz)=>pockets.find(p=>p.kind==='corner'&&p.sx===sx&&p.sz===sz);
  const side=sz=>pockets.find(p=>p.kind==='side'&&p.sz===sz);
  const points=[[-length+cornerCut,-width],[-sideCut,-width]];
  const mouth=(p,reverse=false)=>{
    const curve=curveFunction(p,cornerCut,sideCut,steps,overhang);
    // The felt boundary uses the SAME shared rubber shoulder and circular
    // lip points as the single-piece graphite assembly. It cannot project
    // under an exposed graphite wing or leave an independent triangle gap.
    let complete=curve;
    if(p.kind==='corner'){
      const jaw=pocketMouthCurve(p,cornerCut,sideCut,1);
      const ref=cornerPocketAssemblyReference(p,cornerCut,1);
      complete=[jaw[0],ref.rubberStartA,ref.rubberEndA,
        ...curve,ref.rubberEndB,ref.rubberStartB,jaw[1]];
    }else{
      const ref=sidePocketAssemblyReference(p,sideCut);
      complete=[ref.jawA,ref.rubberStartA,
        ...curve,ref.rubberStartB,ref.jawB];
    }
    if(reverse)complete.reverse();
    points.push(...complete.slice(1));
  };
  mouth(side(-1));points.push([length-cornerCut,-width]);
  mouth(corner(1,-1));points.push([length,width-cornerCut]);
  mouth(corner(1,1),true);points.push([sideCut,width]);
  mouth(side(1),true);points.push([-length+cornerCut,width]);
  mouth(corner(-1,1));points.push([-length,-width+cornerCut]);
  mouth(corner(-1,-1),true);
  return points;
}
export function tableClothBoundary(length,width,cornerCut,sideCut,pockets,steps=36,overhang=0){
  return tablePocketBoundary(length,width,cornerCut,sideCut,pockets,steps,overhang,pocketVisibleCurve);
}
export function tableSlateBoundary(length,width,cornerCut,sideCut,pockets,steps=36){
  // Cut the visual slate a little farther into the aperture than the cloth,
  // so no bright gray stone fills the circular black opening from above.
  // The calibrated physical shelf remains independent in physics.js.
  return tablePocketBoundary(length,width,cornerCut,sideCut,pockets,steps,.0035,pocketVisibleCurve);
}

// Corner black wells are complete disks, not front/rear arcs connected by
// straight lines; their full circle is also the physics capture boundary.
export function pocketWellOutline(p,cornerCut,sideCut,steps=36){
  // Side transitions retain their separate rounded rear casting.
  return pocketReferenceGeometry(p,cornerCut,sideCut,steps).rim;
}

export function longRailCapEnds(x0,x1){
  return [x0<0?x0-CORNER_CAP_EXTENSION:x0+SIDE_CAP_SETBACK,
    x1>0?x1+CORNER_CAP_EXTENSION:x1-SIDE_CAP_SETBACK];
}

export function shortRailCapEnds(z0,z1){
  return [z0-CORNER_CAP_EXTENSION,z1+CORNER_CAP_EXTENSION];
}

// A narrow recessed black lip follows the INSIDE of the near circular cut,
// never occupying the 2D footprint of the remaining blue felt.
export function pocketMouthTrimOutline(p, cornerCut, sideCut, steps = 36) {
  const edge=pocketVisibleCurve(p,cornerCut,sideCut,steps,.0012);
  const circle=p.kind==='corner'?cornerPocketOpeningCircleReference(p,cornerCut):null;
  const inset=edge.map(([x,z])=>{
    if(p.kind==='side')return [x,z+p.sz*.003];
    const dx=circle.x-x,dz=circle.z-z,l=Math.hypot(dx,dz)||1;
    return [x+.003*dx/l,z+.003*dz/l];
  });
  return [...edge,...inset.reverse()];
}

// The pocket returns connect the rail heads outside the playing rectangle.
// They are shaped around the leather liner, not as oversized square cutouts.
// The upper edge of the SIDE pocket casting is a true circular arc. A former
// piecewise-cubic curve had varying curvature and read as a pointed black
// wedge at game scale. This circle passes through both ends of the opening
// and its rear midpoint, with no change to the physical jaw or cloth cut.
function sidePocketCapCircularReturn(halfOpening,front,back,steps=64){
  const sagitta=back-front;
  const radius=(halfOpening*halfOpening+sagitta*sagitta)/(2*sagitta);
  const center=back-radius;
  const start=Math.atan2(front-center,-halfOpening);
  const end=Math.atan2(front-center,halfOpening);
  const points=[];
  for(let i=0;i<=steps;i++){
    const angle=start+(end-start)*i/steps;
    points.push([radius*Math.cos(angle),center+radius*Math.sin(angle)]);
  }
  return points;
}
export function sidePocketCapInnerArc(p,sideCut,steps=64){
  if(p.kind!=='side')throw new TypeError('Side fitting requires a side pocket');
  return pocketReferenceGeometry(p,0,sideCut,steps).farLip;
}
export function pocketCastingOutline(p, cornerCut, outerRail, sideCut) {
  if (p.kind === 'side') {
    const halfWidth=sideCut+SIDE_CAP_SETBACK;
    const front=p.z+p.sz*RAIL_CAP_INNER_OFFSET;
    const rear=p.z+p.sz*outerRail;
    const rounded=sidePocketCapInnerArc(p,sideCut);
    // Rail cap joints stay at ±halfWidth, while the moulded inner lip follows
    // the same constant-radius circle at both side pockets.
    return [[p.x-halfWidth,front],...rounded,
      [p.x+halfWidth,front],[p.x+halfWidth,rear],[p.x-halfWidth,rear]];
  }
  const near = -cornerCut + CORNER_CAP_EXTENSION;
  const radius=.037,edge=outerRail-radius;
  const points=cornerPocketCapInnerArc(p,cornerCut)
    .map(([x,z])=>[(x-p.x)*p.sx,(z-p.z)*p.sz]);
  points.push([outerRail,near],[outerRail,edge]);
  // A real wood rail moulding rounds the outer cabinet corner instead of
  // ending in the sharp 90° block of the earlier silver casting.
  for(let i=1;i<=8;i++){
    const a=i*Math.PI/2/8;
    points.push([edge+radius*Math.cos(a),edge+radius*Math.sin(a)]);
  }
  points.push([near,outerRail]);
  return points.map(([u,v]) => [p.x + p.sx*u,p.z + p.sz*v]);
}
