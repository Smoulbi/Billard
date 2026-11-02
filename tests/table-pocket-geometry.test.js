import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {
  LENGTH, WIDTH, RADIUS, CORNER_CUT, SIDE_CUT, getPockets,getCushionSegments
} from '../dist/physics.js';
import {
  pocketMouthCurve,pocketShelfCurve,pocketVisibleCurve,pocketVisibleSagitta,
  pocketShelfLinerOutline,pocketCollectorArcPoint,pocketCollectorRadii,
  pocketMouthTrimOutline,pocketCastingOutline,cornerPocketInsertOutline,
  cornerPocketAssemblyReference,cornerPocketDecorativeOuterArc,
  sidePocketAssemblyReference,sidePocketFrontCircularArc,
  cornerPocketCapInnerArc,cornerPocketCircleReference,
  cornerPocketOpeningCircleReference,pocketReferenceGeometry,
  pocketApertureContains,pocketApertureClearance,
  tableClothBoundary,tableSlateBoundary,pocketWellOutline,
  SIDE_CAP_SETBACK,SIDE_POCKET_NOTCH_BACK,
  longRailCapEnds,shortRailCapEnds,RAIL_CAP_INNER_OFFSET
} from '../dist/table-pocket-geometry.js';

const OUTER_RAIL = .172;

test('physical jaw-to-jaw widths match WPA official tournament pocket specifications',()=>{
  // WPA Recommended Equipment Specifications §9, 2024:
  // https://wpapool.com/wp-content/uploads/2024/01/RECOMMENDED-EQUIPMENT-SPECIFICATIONS.pdf
  // Corner 4.5–4.625 in; side 5–5.125 in. These are mouth WIDTHS, not radii.
  const inch=.0254;
  const corner=Math.SQRT2*CORNER_CUT;
  const side=2*SIDE_CUT;
  // CORNER_CUT was rounded to 0.1 mm in the existing physics. Allow only
  // 0.05 mm of construction rounding; do not alter the calibrated collider.
  const rounding=.00005;
  assert.ok(corner>=4.5*inch-rounding&&corner<=4.625*inch,
    `physical corner mouth ${corner*1000} mm outside WPA spec`);
  assert.ok(side>=5*inch&&side<=5.125*inch,
    `physical side mouth ${side*1000} mm outside WPA spec`);
});

test('both rendering paths use identical physical-jaw-based cloth boundaries',()=>{
  const pockets=getPockets();
  const outline=tableClothBoundary(LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,pockets);
  assert.ok(outline.length>220);
  assert.equal(isInsidePolygon(0,0,outline),true);
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  for(const p of pockets){
    const mouth=pocketMouthCurve(p,CORNER_CUT,SIDE_CUT);
    for(const endpoint of [mouth[0],mouth.at(-1)])
      assert.ok(outline.some(([x,z])=>near(x,endpoint[0])&&near(z,endpoint[1])),
        `cloth contour lost ${p.kind} jaw at ${endpoint}`);
    const well=pocketWellOutline(p,CORNER_CUT,SIDE_CUT);
    assert.equal(overlapCount(well,.001),0,
      `visual well at ${p.x},${p.z} covers cloth`);
    assert.equal(triangulatedClothOverlaps(well),0,
      `GPU triangles of the ${p.kind} well cover playable cloth`);
  }
  assert.ok(SIDE_CAP_SETBACK<=.010,
    'rail tops must not add 50 mm to the apparent side pocket mouth');
  assert.ok(2*(SIDE_CUT+SIDE_CAP_SETBACK)<=.150,
    'side rails must close the oversized 179.6 mm opening');
  assert.ok(SIDE_POCKET_NOTCH_BACK<=.110,
    'visual side notch must not reach the former 133 mm depth');
});

// The actual concave production cloth contour, including its 1.2 mm overhang,
// is used to reject mesh overlaps. An axis-aligned rectangle or an old
// half-circle would silently miss overhanging slate-shelf intersections.
const clothBoundary=tableClothBoundary(
  LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,getPockets(),36,.0012);
function isOnCloth(x,z) {
  // Include the two corner shoulders outside the playing-bed rectangle.
  // They are visible felt behind the jaws, even though a ball cannot use
  // these covered shelves as ordinary unrestricted playing territory.
  return isInsidePolygon(x,z,clothBoundary);
}

function isInsidePolygon(x,z,outline) {
  let isInside=false;
  for(let i=0,j=outline.length-1;i<outline.length;j=i++) {
    const [xi,zi]=outline[i],[xj,zj]=outline[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)
      isInside=!isInside;
  }
  return isInside;
}

function segmentsIntersect(a,b,c,d,epsilon=1e-9){
  const cross=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-
    (q[1]-p[1])*(r[0]-p[0]);
  const v=[cross(a,b,c),cross(a,b,d),cross(c,d,a),cross(c,d,b)];
  return v[0]*v[1]<-epsilon&&v[2]*v[3]<-epsilon;
}
function selfCrossings(outline){
  let count=0;
  for(let i=0;i<outline.length;i++)for(let j=i+2;j<outline.length;j++){
    if(i===0&&j===outline.length-1)continue;
    if(segmentsIntersect(outline[i],outline[(i+1)%outline.length],
      outline[j],outline[(j+1)%outline.length]))count++;
  }
  return count;
}

function overlapCount(outline,step=.0015) {
  const xs=outline.map(p=>p[0]),zs=outline.map(p=>p[1]);
  const left=Math.min(...xs),right=Math.max(...xs);
  const top=Math.min(...zs),bottom=Math.max(...zs);
  let count=0;
  for(let x=left+step/2;x<right;x+=step)
    for(let z=top+step/2;z<bottom;z+=step)
      if(isInsidePolygon(x,z,outline)&&isOnCloth(x,z))count++;
  return count;
}

function triangulatedClothOverlaps(outline) {
  const shape=new THREE.Shape();
  outline.forEach(([x,z],i)=>i===0?shape.moveTo(x,-z):shape.lineTo(x,-z));
  shape.closePath();
  const geom=new THREE.ShapeGeometry(shape);
  const positions=geom.getAttribute('position'),index=geom.getIndex();
  const vertices=(i)=>{
    const j=index?index.getX(i):i;
    return [positions.getX(j),-positions.getY(j)];
  };
  let overlaps=0;
  for(let i=0;i<(index?index.count:positions.count);i+=3){
    const a=vertices(i),b=vertices(i+1),c=vertices(i+2);
    // Sample each triangle interior, including near corners, to catch a
    // triangulation that fills the concave opening across the pocket mouth.
    for(let u=1;u<=6;u++)for(let v=1;v<=6-u;v++){
      const s=u/7,t=v/7,w=1-s-t;
      if(isOnCloth(s*a[0]+t*b[0]+w*c[0],s*a[1]+t*b[1]+w*c[1]))overlaps++;
    }
  }
  geom.dispose();
  return overlaps;
}

test('the six pocket castings never cover a single sample of playable cloth',()=>{
  for(const p of getPockets()){
    const casting=pocketCastingOutline(p,CORNER_CUT,OUTER_RAIL,SIDE_CUT);
    assert.equal(overlapCount(casting),0,
      `outer ${p.kind} casting at (${p.x}, ${p.z}) intrudes on the drape`);
    assert.equal(triangulatedClothOverlaps(casting),0,
      `${p.kind} casting's actual GPU triangles overlap the playing cloth`);
  }
});

test('each corner has ONE simple graphite contour, radially outside the exact round opening',()=>{
  for(const p of getPockets().filter(p=>p.kind==='corner')){
    const insert=cornerPocketInsertOutline(p,CORNER_CUT,64);
    const assembly=cornerPocketAssemblyReference(p,CORNER_CUT,64);
    const ref=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,64);
    assert.equal(insert.length,136,'one contour wraps the entire U-shaped return');
    assert.deepEqual(insert,assembly.graphite);
    assert.equal(selfCrossings(insert),0,'the metal must be a simple polygon');
    assert.deepEqual(insert[0],assembly.railA);
    assert.deepEqual(insert[1],ref.capA);
    assert.deepEqual(insert[65],ref.capB);
    assert.deepEqual(insert[66],assembly.railB);
    assert.deepEqual(insert[67],assembly.rubberStartB);
    assert.deepEqual(insert[68],assembly.rubberEndB);
    assert.deepEqual(insert[134],assembly.rubberEndA);
    assert.deepEqual(insert[135],assembly.rubberStartA);
    assert.deepEqual(cornerPocketDecorativeOuterArc(p,CORNER_CUT),insert.slice(1,66));
    for(const [x,z] of insert.slice(1,66))
      assert.ok(Math.hypot(x-ref.openingCircle.x,
        z-ref.openingCircle.z)>ref.openingCircle.radius+.0119,
      'wood return is always separated from the black pocket by 12 mm of metal');
    for(const [x,z] of insert.slice(69,134))
      assert.ok(Math.abs(Math.hypot(x-ref.openingCircle.x,
        z-ref.openingCircle.z)-ref.openingCircle.radius)<1e-10,
      'the graphite throat follows the unchanged circular physics aperture');
    assert.ok(overlapCount(insert,.001)<30,
      'only the intentional 1.2 mm invisible cloth overhang may overlap metal');
  }
});

test('all four graphite corners share boundaries with rubber faces and the blue cloth',()=>{
  const faces=getCushionSegments().filter(f=>f.kind==='facing');
  for(const p of getPockets().filter(p=>p.kind==='corner')){
    const ref=cornerPocketAssemblyReference(p,CORNER_CUT);
    const circle=ref.openingCircle;
    for(const [jaw,end,shoulder] of [[ref.jawA,ref.faceEndA,ref.rubberEndA],
      [ref.jawB,ref.faceEndB,ref.rubberEndB]]){
      const face=faces.find(f=>Math.hypot(f.x0-jaw[0],f.z0-jaw[1])<1e-9);
      assert.ok(face,'each graphite connection begins at a physics jaw');
      assert.ok(Math.hypot(face.x1-end[0],face.z1-end[1])<1e-10,
        'decorative facing exactly ends with the real physical collider');
      assert.ok(Math.hypot(shoulder[0]-(end[0]-face.nx*.010),
        shoulder[1]-(end[1]-face.nz*.010))<1e-10,
        'the metal/blue seam uses the same rubber shoulder');
      assert.ok(Math.hypot(shoulder[0]-circle.x,shoulder[1]-circle.z)>circle.radius,
        'the rubber-to-graphite seam must not block the black aperture');
    }
    const lip=pocketVisibleCurve(p,CORNER_CUT,SIDE_CUT,64);
    assert.ok(Math.hypot(ref.nearA[0]-lip[0][0],ref.nearA[1]-lip[0][1])<1e-12);
    assert.ok(Math.hypot(ref.nearB[0]-lip.at(-1)[0],ref.nearB[1]-lip.at(-1)[1])<1e-12);
  }
});

test('the six recessed mouth trims follow the circular cloth lip without covering felt',()=>{
  for(const p of getPockets()){
    const trim=pocketMouthTrimOutline(p,CORNER_CUT,SIDE_CUT);
    assert.equal(overlapCount(trim,.0004),0,
      `${p.kind} opening at (${p.x}, ${p.z}) obscures the playing field`);
    assert.equal(triangulatedClothOverlaps(trim),0,
      `${p.kind} mouth trim's actual GPU triangles overlap the playing cloth`);
    const cut=p.kind==='corner'?CORNER_CUT:SIDE_CUT;
    for(const [x,z] of trim)
      assert.ok(Math.abs(x-p.x)<=cut+.00301,
        'visual rim cannot widen the physical jaw-to-jaw mouth');
  }
});

test('unchanged physical shelf references remain behind the jaw chords',()=>{
  for(const p of getPockets()){
    const points=pocketMouthCurve(p,CORNER_CUT,SIDE_CUT,40);
    const shelf=pocketShelfCurve(p,CORNER_CUT,SIDE_CUT,40);
    const start=points[0],end=points.at(-1),mid=points[20];
    const near=(a,b)=>Math.abs(a-b)<1e-9;
    for(const i of [0,40]){
      assert.ok(near(shelf[i][0],points[i][0]));
      assert.ok(near(shelf[i][1],points[i][1]));
    }
    if(p.kind==='side'){
      assert.ok(near(start[0],-SIDE_CUT)&&near(end[0],SIDE_CUT));
      assert.ok(near(start[1],p.z)&&near(end[1],p.z));
      assert.ok(near(mid[1],p.z));
      assert.ok(near(p.sz*(shelf[20][1]-mid[1]),p.shelf),
        'side slate cut must sit 6 mm behind the mouth chord');
    }else{
      assert.ok(near(start[0],p.x-p.sx*CORNER_CUT)&&near(start[1],p.z));
      assert.ok(near(end[0],p.x)&&near(end[1],p.z-p.sz*CORNER_CUT));
      assert.ok(near(mid[0],p.x-p.sx*CORNER_CUT/2));
      assert.ok(near(mid[1],p.z-p.sz*CORNER_CUT/2));
      const depth=(p.sx*(shelf[20][0]-mid[0])+p.sz*(shelf[20][1]-mid[1]))/Math.SQRT2;
      assert.ok(near(depth,p.shelf),
        'corner slate cut must sit 35 mm behind the mouth chord');
    }
  }
});

test('the corner felt remains blue towards the table while graphite fills the rear shoulders',()=>{
  for(const p of getPockets()){
    const jaw=pocketMouthCurve(p,CORNER_CUT,SIDE_CUT,40);
    const cut=pocketVisibleCurve(p,CORNER_CUT,SIDE_CUT,40);
    const depth=pocketVisibleSagitta(p,CORNER_CUT,SIDE_CUT);
    assert.ok(Math.abs(depth)<.04,
      'the circular cloth lip is bounded independently from the shelf depth');
    if(p.kind==='side'){
      const assembly=sidePocketAssemblyReference(p,SIDE_CUT);
      assert.deepEqual(cut[0],assembly.rubberEndA);
      assert.deepEqual(cut.at(-1),assembly.rubberEndB);
      for(const [jawPoint,shoulderPoint] of [
        [assembly.jawA,assembly.rubberStartA],
        [assembly.jawB,assembly.rubberStartB]]){
        assert.ok(Math.abs(jawPoint[1]-p.z)<1e-10);
        assert.ok(p.sz*(shoulderPoint[1]-p.z)>0,
          'blue cloth must continue behind BOTH physical jaws');
      }
      const lipHalf=assembly.rubberEndB[0]-p.x;
      const lipChord=p.sz*(assembly.rubberEndB[1]-p.z);
      const lipDepth=lipChord+depth;
      const lipRadius=(lipHalf*lipHalf+lipDepth*lipDepth)/(2*lipDepth);
      const lipCenter=p.z+p.sz*(-depth+lipRadius);
      for(const [x,z] of cut)
        assert.ok(Math.abs(Math.hypot(x-p.x,z-lipCenter)-lipRadius)<1e-9,
          'the visible boundary must be one true circle all along the shoulder-to-shoulder arc');
      assert.ok(Math.abs(p.sz*(cut[20][1]-p.z)+depth)<1e-10,
        'side pocket black lip lies 8 mm outside the physical jaw chord');
      assert.ok(Math.abs(depth+.008)<1e-10,
        'both side pockets must be recessed by the same 8 mm');
      assert.deepEqual(cut,sidePocketFrontCircularArc(p,SIDE_CUT,40));
      const ref=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT);
      for(const x of [p.x-.058,p.x+.058])for(const back of [.018,.032,.042]){
        const z=p.z+p.sz*back;
        assert.equal(isOnCloth(x,z),true,
          'both formerly black triangles must be covered by continuous blue felt');
        assert.equal(pocketApertureContains(ref,x,z),false,
          'the blue triangular shoulders must not trigger a pocket capture');
      }
      for(const [a,b] of [[ref.nearLip[0],ref.farLip[0]],
        [ref.nearLip.at(-1),ref.farLip.at(-1)]])
        assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-12,
          'front and rear black-bowl arcs must meet at a rubber shoulder');
      assert.equal(pocketApertureContains(ref,p.x,p.z),false,
        'the ball must not start falling on the old jaw chord');
      assert.equal(pocketApertureContains(ref,p.x,p.z+p.sz*.012),true,
        'the visible well and the physics capture must both begin behind it');
    }else{
      const circle=cornerPocketOpeningCircleReference(p,CORNER_CUT);
      const reference=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT);
      assert.ok(circle.edgeIntercept>0&&circle.edgeIntercept<CORNER_CUT,
        'the circular opening meets the bed between the jaw and the corner');
      assert.ok(circle.frontArcEnd-circle.frontArcStart>2,
        'the contact with felt must extend along the circle beyond BOTH bed edges');
      const projection=joint=>{
        const dx=joint[0]-circle.x,dz=joint[1]-circle.z;
        const distance=Math.hypot(dx,dz);
        return [circle.x+dx*circle.radius/distance,
          circle.z+dz*circle.radius/distance];
      };
      for(const [point,cap] of [[cut[0],reference.capA],
        [cut.at(-1),reference.capB]]){
        const expected=projection(cap);
        assert.ok(Math.hypot(point[0]-expected[0],point[1]-expected[1])<1e-10,
          'both arc ends must be radial continuations of the cabinet connections');
      }
      for(const [x,z] of cut){
        assert.ok(Math.abs(Math.hypot(x-circle.x,z-circle.z)-circle.radius)<1e-10,
          'the cloth-facing lip must belong to the EXACT circle of the well');
      }
      for(const local of [
        [-.045,-.006],[-.006,-.045],[-.025,-.025],
        [-.055,.010],[.010,-.055]
      ]){
        const wedge=[p.x+p.sx*local[0],p.z+p.sz*local[1]];
        assert.equal(isOnCloth(...wedge),true,
          'both user-marked triangular shoulders must remain blue felt');
        assert.equal(pocketApertureContains(reference,...wedge),false,
          'neither blue-felt wedge may trigger a physical drop');
      }
      assert.equal(pocketApertureContains(reference,circle.x,circle.z),true);
    }
  }
});

test('the visual slate is cut beneath the real circular lip and the leather stays inside it',()=>{
  const slate=tableSlateBoundary(LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,getPockets());
  assert.ok(slate.length>220);
  for(const p of getPockets()){
    const insideLip=pocketVisibleCurve(p,CORNER_CUT,SIDE_CUT,40,0);
    const liner=pocketShelfLinerOutline(p,CORNER_CUT,SIDE_CUT,40);
    assert.equal(liner.length,82);
    assert.deepEqual(liner.slice(0,41),insideLip);
    assert.deepEqual(liner.slice(41),pocketVisibleCurve(
      p,CORNER_CUT,SIDE_CUT,40,-.0025).toReversed());
    assert.equal(overlapCount(liner,.0007),0,
      `${p.kind} leather must dress the hole without hiding felt`);
    assert.equal(triangulatedClothOverlaps(liner),0,
      `${p.kind} leather's actual GPU triangles must not cover playable felt`);
    const stoneCut=pocketVisibleCurve(p,CORNER_CUT,SIDE_CUT,36,.0035);
    assert.ok(slate.some(([x,z])=>Math.hypot(x-stoneCut[18][0],z-stoneCut[18][1])<1e-8),
      `slate under the ${p.kind} must not fill the visible black bowl`);
  }
});

test('side pocket collector arcs face outwards and stay behind the playing surface',()=>{
  for(const p of getPockets().filter(p=>p.kind==='side')){
    const radius=SIDE_CUT*.66;
    for(let i=0;i<=40;i++){
      const [x,z]=pocketCollectorArcPoint(p,radius,i/40,CORNER_CUT,SIDE_CUT);
      assert.ok(p.sz*(z-p.z)>=-1e-10,
        'the collector half-ring must never curve into the playable felt');
      assert.ok(Math.abs(x-p.x)<=radius+1e-10);
    }
  }
});

test('basket throats admit a full 57.15 mm ball without decorative oversizing',()=>{
  const ballDiameter=2*RADIUS;
  for(const p of getPockets()){
    const {top,bottom}=pocketCollectorRadii(p,CORNER_CUT,SIDE_CUT,RADIUS);
    assert.ok(bottom*2>=ballDiameter+.009,
      'the hidden collector must pass a real pool ball with 9 mm clearance');
    assert.ok(top>=bottom,'the collector must taper gently, not widen downwards');
    assert.ok(2*top<(p.kind==='corner'?Math.SQRT2*CORNER_CUT:2*SIDE_CUT),
      'the collection cup must be narrower than the physical mouth');
  }
});

test('the decorative fittings preserve a physically open mouth',()=>{
  const corners=getPockets().filter(p=>p.kind==='corner');
  const sides=getPockets().filter(p=>p.kind==='side');
  assert.equal(corners.length,4);
  assert.equal(sides.length,2);
  for(const p of [...corners,...sides]){
    const collar=pocketCastingOutline(p,CORNER_CUT,OUTER_RAIL,SIDE_CUT);
    assert.equal(isInsidePolygon(p.x,p.z,collar),false,
      'no fitted metal may fill the center of a pocket');
  }
});

test('all six wooden pocket returns join the exact ends of the adjacent rail caps',()=>{
  const [leftEnd,leftSide]=longRailCapEnds(-LENGTH+CORNER_CUT,-SIDE_CUT);
  const [rightSide,rightEnd]=longRailCapEnds(SIDE_CUT,LENGTH-CORNER_CUT);
  const [shortLow,shortHigh]=shortRailCapEnds(-WIDTH+CORNER_CUT,WIDTH-CORNER_CUT);
  const near=(a,b)=>Math.abs(a-b)<1e-9;
  for(const p of getPockets()){
    const outline=pocketCastingOutline(p,CORNER_CUT,OUTER_RAIL,SIDE_CUT);
    if(p.kind==='side'){
      assert.ok(outline.some(([x,z])=>near(x,leftSide)&&
        near(z,p.z+p.sz*RAIL_CAP_INNER_OFFSET)));
      assert.ok(outline.some(([x,z])=>near(x,rightSide)&&
        near(z,p.z+p.sz*RAIL_CAP_INNER_OFFSET)));
      // A notch carries the opening into the visual rail; the rear bridge
      // stays outside the cloth and does not obscure the true pocket mouth.
      assert.equal(isInsidePolygon(0,p.z+p.sz*.10,outline),false);
      assert.equal(isInsidePolygon(0,p.z+p.sz*.16,outline),true);
    }else{
      const jointX=p.sx<0?leftEnd:rightEnd;
      const jointZ=p.sz<0?shortLow:shortHigh;
      assert.ok(outline.some(([x,z])=>near(x,jointX)&&
        near(z,p.z+p.sz*RAIL_CAP_INNER_OFFSET)));
      assert.ok(outline.some(([x,z])=>near(x,p.x+p.sx*RAIL_CAP_INNER_OFFSET)&&
        near(z,jointZ)));
    }
  }
});

test('upper pocket connectors form a true circular arc without moving rail joints',()=>{
  for(const p of getPockets()){
    const outline=pocketCastingOutline(p,CORNER_CUT,OUTER_RAIL,SIDE_CUT);
    if(p.kind==='side'){
      const curve=outline.slice(1,-3);
      assert.equal(curve.length,65,
        'the side pocket must use one sampled circular arc, not a Bezier or polygonal shoulders');
      const front=p.z+p.sz*RAIL_CAP_INNER_OFFSET;
      const halfWidth=SIDE_CUT+SIDE_CAP_SETBACK;
      for(const sign of [-1,1]){
        assert.ok(outline.some(([x,z])=>
          Math.hypot(x-(p.x+sign*halfWidth),z-front)<1e-10),
        'the smoothly rounded fitting must retain the exact wood-rail joint');
      }
      const assembly=sidePocketAssemblyReference(p,SIDE_CUT);
      const reach=assembly.rubberEndB[0]-p.x;
      const startOffset=p.sz*(assembly.rubberEndB[1]-p.z);
      const sagitta=SIDE_POCKET_NOTCH_BACK-startOffset;
      const radius=(reach*reach+sagitta*sagitta)/(2*sagitta);
      const center=SIDE_POCKET_NOTCH_BACK-radius;
      assert.ok(Math.abs(curve[0][0]-(p.x-reach))<1e-10);
      assert.ok(Math.abs(curve.at(-1)[0]-(p.x+reach))<1e-10);
      for(let i=0;i<curve.length;i++){
        const mirrored=curve[curve.length-1-i];
        assert.ok(Math.abs((curve[i][0]-p.x)+(mirrored[0]-p.x))<1e-10,
          'left and right pockets must be mirror-symmetric');
        assert.ok(Math.abs(curve[i][1]-mirrored[1])<1e-10);
        assert.ok(p.sz*(curve[i][1]-p.z)>=startOffset-1e-10,
          'the cap must remain outside the cloth edge');
        assert.ok(Math.abs(Math.hypot(curve[i][0]-p.x,
          p.sz*(curve[i][1]-p.z)-center)-radius)<1e-10,
        'every point of the black upper contour must lie on the SAME circle');
        if(i>0)assert.ok(curve[i][0]>curve[i-1][0],
          'the arc must not fold back or intersect itself');
      }
      assert.ok(Math.abs(curve[32][1]-(p.z+p.sz*SIDE_POCKET_NOTCH_BACK))<1e-10,
        'the circular cap must keep the existing rearward extent');
    }else{
      // The cabinet's outer quarter-circle has 37 mm radius and shares its
      // tangency with both straight wooden edges.
      const outerCorner=[p.x+p.sx*OUTER_RAIL,p.z+p.sz*(OUTER_RAIL-.037)];
      assert.ok(outline.some(([x,z])=>Math.hypot(x-outerCorner[0],z-outerCorner[1])<1e-10),
        'the outer rounded profile must meet the side wall tangentially');
      const circular=cornerPocketCapInnerArc(p,CORNER_CUT);
      assert.deepEqual(outline.slice(0,circular.length),circular,
        'the inner fitting must use the single smooth decorative return');
    }
  }
});

test('all four corner wells have a COMPLETE circular aperture independent of cabinet fittings',()=>{
  const pockets=getPockets().filter(p=>p.kind==='corner');
  for(const p of pockets){
    const arc=cornerPocketCapInnerArc(p,CORNER_CUT,64);
    const circle=cornerPocketOpeningCircleReference(p,CORNER_CUT);
    assert.equal(arc.length,65);
    assert.deepEqual(arc,cornerPocketDecorativeOuterArc(p,CORNER_CUT,64));
    for(const [x,z] of arc)
      assert.ok(Math.hypot(x-circle.x,z-circle.z)>=circle.radius+.0119,
        'the wooden return must clear the round black opening by at least 12 mm');
    const rear=arc[32];
    assert.ok(p.sx*(rear[0]-p.x)>0 && p.sz*(rear[1]-p.z)>0,
      'the smooth rear wall must curve into the cabinet, never the felt');
    const well=pocketWellOutline(p,CORNER_CUT,SIDE_CUT,64);
    assert.equal(well.length,128);
    const ref=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,64);
    assert.deepEqual(ref.farLip,arc,
      'the outwardly recessed cabinet return shares the unchanged rail joints');
    assert.deepEqual(ref.nearLip,pocketVisibleCurve(p,CORNER_CUT,SIDE_CUT,64),
      'the circular cloth cut and well must share the nominal near arc');
    for(const [x,z] of well)
      assert.ok(Math.abs(Math.hypot(x-ref.openingCircle.x,
        z-ref.openingCircle.z)-ref.openingCircle.radius)<1e-10,
      'each black bowl edge point must sit on ONE complete circle');
    assert.equal(overlapCount(well,.0006),0);
    assert.equal(triangulatedClothOverlaps(well),0);
  }
});

test('the cabinet reference preserves four physical anchors while the opening uses a separate true circle',()=>{
  for(const p of getPockets().filter(p=>p.kind==='corner')){
    const ref=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,64);
    const circle=ref.cornerCircle;
    const expected=[
      [p.x-p.sx*CORNER_CUT,p.z],
      [p.x,p.z-p.sz*CORNER_CUT],
      [p.x+p.sx*(-CORNER_CUT+.019),p.z+p.sz*RAIL_CAP_INNER_OFFSET],
      [p.x+p.sx*RAIL_CAP_INNER_OFFSET,p.z+p.sz*(-CORNER_CUT+.019)]
    ];
    const actual=[ref.jawA,ref.jawB,ref.capA,ref.capB];
    for(let i=0;i<4;i++){
      assert.ok(Math.hypot(actual[i][0]-expected[i][0],
        actual[i][1]-expected[i][1])<1e-12,
      `corner anchor ${i} no longer coincides with its physical junction`);
      assert.ok(Math.abs(Math.hypot(expected[i][0]-circle.x,
        expected[i][1]-circle.z)-circle.radius)<1e-12,
      `corner anchor ${i} not on the unique reference circle`);
    }
    assert.ok(circle.radius>.07&&circle.radius<.09,
      'derived circle must remain within the drop-pocket fitting');
    assert.ok(pocketApertureContains(ref,ref.collectorCenter.x,ref.collectorCenter.z),
      'the collection cup must stay inside the circular opening');
    assert.equal(ref.collectorCenter.x,ref.openingCircle.x);
    assert.equal(ref.collectorCenter.z,ref.openingCircle.z);
    const localX=p.sx*(ref.collectorCenter.x-p.x);
    const localZ=p.sz*(ref.collectorCenter.z-p.z);
    assert.ok(Math.abs(localX-localZ)<1e-9,
      'the collection cup must remain centred along the corner bisector');
  }
});

test('pocket capture clearance changes sign precisely at the displayed circular rim',()=>{
  for(const p of getPockets().filter(p=>p.kind==='corner')){
    const reference=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,64);
    const circle=reference.openingCircle;
    for(const [x,z] of reference.rim)
      assert.ok(Math.abs(pocketApertureClearance(reference,x,z))<1e-10);
    assert.ok(pocketApertureContains(reference,circle.x,circle.z));
    assert.ok(pocketApertureClearance(reference,circle.x,circle.z)>.01);
    const outside=[circle.x-p.sx*(circle.radius+.001),circle.z];
    assert.ok(pocketApertureClearance(reference,...outside)<0);
  }
});

test('lateral basket positions derive from the same closed reference perimeter',()=>{
  for(const p of getPockets().filter(p=>p.kind==='side')){
    const reference=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,64);
    assert.deepEqual(reference.rim,pocketWellOutline(p,CORNER_CUT,SIDE_CUT,64));
    assert.deepEqual(reference.nearLip,pocketVisibleCurve(p,CORNER_CUT,SIDE_CUT,64));
    const left=reference.rim.map(([x])=>x),
      back=reference.rim.map(([,z])=>p.sz*(z-p.z));
    assert.ok(Math.abs(reference.collectorCenter.x-p.x)<1e-10,
      'the lateral collection cup is on the pocket symmetry axis');
    assert.ok(reference.collectorCenter.x>Math.min(...left) &&
      reference.collectorCenter.x<Math.max(...left));
    const depth=p.sz*(reference.collectorCenter.z-p.z);
    assert.ok(depth>Math.min(...back)&&depth<Math.max(...back),
      'the collector centre stays inside its actual upper opening');
  }
});
