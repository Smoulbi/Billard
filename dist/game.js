import {newNineBallMatch,nineBallRack,adjudicateNineBall,resolveNineBallDecision,nineBallVictoryPresentation} from './nine-ball-rules.js';
import {createFirstPersonView,resetFirstPersonAim,rotateFirstPersonAim,adjustFirstPersonHeight,freezeFirstPersonShot,currentFirstPersonPose} from './first-person-camera.js';
import * as THREE from './vendor/three.module.js';
import {LENGTH, WIDTH, RADIUS, CORNER_CUT, SIDE_CUT, getPockets,
  getCushionSegments, makePhysicsBody, getCueImpact, strikeBall, stopBall,
  simulatePhysics} from './physics.js';
import {getLabScenario, ShotTelemetry} from './lab.js';
import {powerToCueSpeed} from './power.js';
import {HEAD_STRING_X, clampBreakPosition, canPlaceBreakCue,
  clampFreePosition, canPlaceFreeCue} from './placement.js';
import {newEightBallMatch,adjudicateEightBall,resolveEightBallDecision,
  eightBallVictoryPresentation,groupOf} from './eight-ball-rules.js';
import {predictTrajectory} from './trajectory.js';
import {runCalibration, signedDeviation, calibrationToCSV} from './calibration.js';
import {panCameraTarget,zoomCamera} from './camera-controls.js';
import {isFullscreenShortcut,toggleSceneFullscreen,IMMERSIVE_CLASS} from './fullscreen.js';
import {pocketCollectorRadii,
  pocketMouthTrimOutline,pocketCastingOutline,
  cornerPocketInsertOutline,
  pocketShelfLinerOutline,tableClothBoundary,tableSlateBoundary,pocketWellOutline,
  pocketReferenceGeometry,
  longRailCapEnds,shortRailCapEnds,RAIL_CAP_INNER_OFFSET}
  from './table-pocket-geometry.js';

// FRAME / Table de tournoi avec dynamique de sphères rigides.
const FIXED_STEP = 1 / 240;
const MAX_DT = 0.05;
const BALL_COLORS = ['#f5f7ed','#e8c43b','#2c61b5','#cb3f36','#763c9b','#dd792d','#2a8753','#8a2835','#202427','#e8c43b','#2c61b5','#cb3f36','#763c9b','#dd792d','#2a8753','#8a2835'];

const ids = ['aimMouseButton','pushOutButton','nineBallPanel','nineBallTarget','firstPersonHeightSlider','firstPersonHeightValue','firstPersonSetbackSlider','firstPersonSetbackValue','firstPersonPositionReset','firstPersonSettings','firstPersonFovSlider','firstPersonFovValue','firstPersonFovReset','gameCanvas','fullscreenButton','loadingOverlay','shotsCount','pottedCount','ballTotal','ballsProgress','statusTitle','statusText','statusIndicator','shotState','cameraName','sceneHint','placeCueButton','placementQuick','spinPad','spinDot','spinReset','spinType','spinCoords','impactReadout','squirtValue','elevationSlider','elevationValue','powerSlider','powerValue','powerMode','powerSpeed','breakPreset','shootButton','resetButton','viewButton','aimAssist','audioToggle','audioLabel','showTraces','labScenario','labLoad','labReplay','labExport','labDescription','labDistance','labAfterContact','labCushions','labTime','labState','calibrationRun','calibrationExport','calibrationRows','calibrationStats','calibrationHeading','cushionModel','matchOverlay','requireCall','breakerSelect','startMatch','matchPanel','modeChip','playerOne','playerTwo','playerOneGroup','playerTwoGroup','matchMessage','callPanel','calledBall','calledPockets','safetyButton','callHint','decisionOverlay','decisionText','decisionActions','victoryOverlay','victoryWinner','victoryOutcome','victoryReason','victoryNewMatch','victoryInspect'];
const el = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));

let cameraMode='perspective';
const firstPerson=createFirstPersonView();

let scene, renderer, camera, cueGroup, aimLine, deflectionLine, objectLine, ghostMarker;
let cueTrailLine, objectTrailLine, placementZone, headStringLine;
let raycaster = new THREE.Raycaster();
let pointer = new THREE.Vector2();
let fallbackCtx = null;
let balls = [];
let fallingBalls = [];
let aim = { x: 1, z: 0 };
let spin = { x: 0, y: 0 };
let shotCount = 0;
let shotActive = false;
let scratchedThisShot = false;
let pocketsThisShot = 0;
let miscuedThisShot = false;
let soundEnabled = true;
let audioContext = null;
let lastSoundAt = 0;
let orbit = { azimuth: 0.29, elevation: 0.69, distance: 3.97, topDown: false,
  targetX: 0, targetZ: 0, dragMode: null, pointerId: null, x: 0, y: 0 };
let accumulator = 0;
let shotSimTime = 0;
let telemetry = null;
let activeLabScenario = null;
let lastShotSnapshot = null;
let lastMetricsAt = 0;
let lastFrame = performance.now();
let lastAimVisualTime = 0;
let placementMode = false;
let placementPointer = null;
let match = null;
let needsCuePlacement = false;
let shotEvents = null;
let chosenPocket = null;
let safetyCalled = false;
let boardRevision = 0;
let previewKey = '';
let previewCache = null;
let previewLastAt = -Infinity;
let previewTimer = null;
let calibrationResults = null;
const CALIBRATION_STORAGE_KEY = 'frame-calibration-measurements-v1';
let calibrationMeasurements = {};
try {
  const saved=JSON.parse(localStorage.getItem(CALIBRATION_STORAGE_KEY)||'{}');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved))
    for(const [key,value] of Object.entries(saved))
      if(typeof value==='number'&&Number.isFinite(value))calibrationMeasurements[key]=value;
}catch(_error){/* Storage is optional; the simulator works without it. */}

const sharedSphere = new THREE.SphereGeometry(RADIUS, 56, 40);
function numberPatchGeometry(){
  const vertices=[],uvs=[],indices=[],rings=9,sides=48;
  const radius=RADIUS*.51;
  for(let ring=0;ring<=rings;ring++)for(let j=0;j<=sides;j++){
    const r=radius*ring/rings,a=2*Math.PI*j/sides;
    const x=r*Math.cos(a),z=r*Math.sin(a);
    vertices.push(x,Math.sqrt(RADIUS**2-r**2)+.000075,z);
    uvs.push(.5+x/(2*radius),.5+z/(2*radius));
  }
  for(let ring=0;ring<rings;ring++)for(let j=0;j<sides;j++){
    const a=ring*(sides+1)+j,b=a+sides+1;
    indices.push(a,b+1,b,a,a+1,b+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  return geometry;
}
const sharedNumberPatch=numberPatchGeometry();
const ballRotationAxis = new THREE.Vector3();
const ballRotationQuaternion = new THREE.Quaternion();
// Visual-only materials. None of these affect collision surfaces or damping.
const feltMaterial = new THREE.MeshStandardMaterial({color:0xffffff,roughness:0.98,
  metalness:0,side:THREE.DoubleSide});
const woodMaterial = new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0.64,
  metalness:0.015,clearcoat:0.09,clearcoatRoughness:0.62});
const railMaterial = new THREE.MeshPhysicalMaterial({color:0xffffff,roughness:0.45,
  metalness:0.015,clearcoat:0.24,clearcoatRoughness:0.48});
const innerRailMaterial = new THREE.MeshStandardMaterial({color:0x08739e,
  roughness:0.96,metalness:0,side:THREE.DoubleSide});
const cushionSeam = new THREE.MeshStandardMaterial({color:0x075375,roughness:0.98});
const leather = new THREE.MeshStandardMaterial({color:0x101719,roughness:0.90,
  metalness:0,side:THREE.DoubleSide});
const matteBlack = new THREE.MeshStandardMaterial({color:0x030709,roughness:0.99});
const brass = new THREE.MeshStandardMaterial({color:0xaab3b5,roughness:0.34,metalness:0.78});
const darkMetal = new THREE.MeshStandardMaterial({color:0x263238,roughness:0.46,metalness:0.55});
// Distinct graphite joint replacing the gold corner plate of a real table.
// It abuts the wooden cap, without being merged into its oversized cutout.
const cornerInsertMaterial = new THREE.MeshStandardMaterial({color:0x455158,
  roughness:0.50,metalness:0.28,side:THREE.DoubleSide});
const cornerInsertBackingMaterial = new THREE.MeshStandardMaterial({
  color:0x101719,roughness:0.94,metalness:0,side:THREE.DoubleSide});
const slateMaterial = new THREE.MeshStandardMaterial({color:0x333c41,roughness:0.91});
const baseMaterial = new THREE.MeshStandardMaterial({color:0x1e292d,roughness:0.55,metalness:0.20});
const sightInsetMaterial = new THREE.MeshStandardMaterial({color:0x0c1317,roughness:0.75});
const pearlMaterial = new THREE.MeshPhysicalMaterial({color:0xe6e9e5,roughness:0.2,
  metalness:0.08,clearcoat:0.75,clearcoatRoughness:0.2});
const apronMaterial = new THREE.MeshPhysicalMaterial({color:0xffffff,
  roughness:0.60,metalness:0.012,clearcoat:0.10,clearcoatRoughness:0.58});
const brushedAluminium = new THREE.MeshStandardMaterial({color:0x9cabb1,
  roughness:0.38,metalness:0.78,side:THREE.DoubleSide});
const lowerRevealMaterial = new THREE.MeshStandardMaterial({color:0x0a1216,
  roughness:0.62,metalness:0.28});
const netThread = new THREE.LineBasicMaterial({color:0x68767b,transparent:true,opacity:0.45});
const RAIL_TOP=0.063;
const CAP_BOTTOM=0.024;
const OUTER_RAIL=0.172;

// Deterministic procedural maps prevent image loading and keep the offline
// simulator self-contained. High-frequency grain is subtle enough not to
// resemble a tiled photograph or interfere with trajectory guides.
function seededTextureCanvas(width,height,pixel){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  const data=ctx.createImageData(width,height);
  let state=0x96b2714f;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    state=(Math.imul(state,1664525)+1013904223)>>>0;
    const noise=((state>>>8)&255)/255-.5;
    const i=4*(y*width+x),rgb=pixel(x,y,noise);
    data.data[i]=rgb[0];data.data[i+1]=rgb[1];data.data[i+2]=rgb[2];
    data.data[i+3]=255;
  }
  ctx.putImageData(data,0,0);return canvas;
}

function canvasMap(canvas,repeatX=1,repeatY=1,colour=true){
  const map=new THREE.CanvasTexture(canvas);
  if(colour)map.colorSpace=THREE.SRGBColorSpace;
  map.wrapS=THREE.RepeatWrapping;map.wrapT=THREE.RepeatWrapping;
  map.repeat.set(repeatX,repeatY);map.anisotropy=12;
  return map;
}

function createGraphiteMaps(){
  const colour=seededTextureCanvas(1024,512,(x,y,noise)=>{
    // Dark stained ash: long natural fibres, broad waves and occasional
    // irregular dark pores. The photo shows discernible graphite wood grain.
    const warp=20*Math.sin(x*.012)+7*Math.sin(x*.046)+
      12*Math.sin(x*.004+y*.009);
    const fibre=y+warp+3*Math.sin(x*.19+y*.004);
    const broad=7*Math.sin(fibre*.044)+4*Math.sin(fibre*.108);
    const latewood=-11*Math.pow(Math.max(0,Math.sin(fibre*.21)),12);
    const variation=broad+latewood+noise*5.4;
    return [38+variation*.89,42+variation*.93,47+variation];
  });
  const relief=seededTextureCanvas(1024,512,(x,y,noise)=>{
    const grain=126+16*Math.sin((y+19*Math.sin(x*.013))*.11)+noise*16;
    return [grain,grain,grain];
  });
  return {map:canvasMap(colour,1.4,1),bump:canvasMap(relief,1.4,1,false)};
}

function createClothMaps(){
  const colour=seededTextureCanvas(1024,512,(x,y,noise)=>{
    const nap=2.3*Math.sin(x*.7+y*.18)+1.2*Math.cos(y*.96);
    const weave=1.4*((x&1)?1:-1)+1.1*((y&1)?1:-1);
    const n=nap+weave+noise*8;
    return [11+n*.57,119+n*.85,165+n];
  });
  const relief=seededTextureCanvas(1024,512,(x,y,noise)=>{
    const weave=7*((x&1)?1:-1)+5*((y&1)?1:-1);
    const grey=127+weave+noise*11;
    return [grey,grey,grey];
  });
  return {map:canvasMap(colour,2.4,1.2),bump:canvasMap(relief,2.4,1.2,false)};
}

function box(w, h, d, x, y, z, material, cast = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z); mesh.castShadow = cast; mesh.receiveShadow = true;
  scene.add(mesh); return mesh;
}

function prism(points, bottom, height, material, bevel=0, holes=[]) {
  // A cap or cushion with mitred jaws, defined in the horizontal playing plane.
  const outline = new THREE.Shape();
  points.forEach(([x,z],i)=>i===0?outline.moveTo(x,-z):outline.lineTo(x,-z));
  outline.closePath();
  for(const polygon of holes) {
    const hole=new THREE.Path();
    polygon.forEach(([x,z],i)=>i===0?hole.moveTo(x,-z):hole.lineTo(x,-z));
    hole.closePath();outline.holes.push(hole);
  }
  // Three.js extrudes the bevel *outside* its nominal depth. Compensate so
  // the visible rail/casting top remains exactly at RAIL_TOP and the inlaid
  // diamonds are flush, rather than unexpectedly recessed by the bevel.
  const bevelDepth=Math.min(bevel*.35,height*.15);
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:height-2*bevelDepth,
    bevelEnabled:bevel>0,bevelThickness:bevelDepth,bevelSize:bevel,
    bevelSegments:bevel>0?4:0,steps:1,curveSegments:12}),material);
  mesh.rotation.x=-Math.PI/2;
  mesh.position.y=bottom+bevelDepth;
  mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;
}

// Six-sided, K55-like *visual* cross-section. The nose is placed on the exact
// unchanged physics rail line at the WPA nose height; only the rear shoulder
// rises to meet the timber cap. This geometry is never used for collisions.
const cushionNoseHeight=2*RADIUS*.635;
const basicCushionProfile=[
  [0,cushionNoseHeight],[.007,RAIL_TOP-.007],[.040,RAIL_TOP-.002],
  [.048,RAIL_TOP],[.055,RAIL_TOP-.017],[.049,.019],[.009,.019]
];
const pocketFacingProfile=[
  [0,cushionNoseHeight],[0,RAIL_TOP-.009],[.005,RAIL_TOP-.009],
  [.010,RAIL_TOP-.009],[.014,RAIL_TOP-.014],[.014,.019],
  [.002,.019]
];
// One closed swept volume per rail. Each corner facing is an extension of the
// rail's own mesh, connected by two profile rings at the SAME physical jaw.
// There is no detached wedge and no separate triangular patch: at every join
// the seven cross-section vertices are shared by adjacent surface strips.
function addCushionSweep(stations){
  const count=basicCushionProfile.length,vertices=[],indices=[];
  const welded=[],unique=new Map();
  for(const s of stations){
    if(s.profile.length!==count)throw new Error('Cushion profile mismatch');
    for(const [distance,y] of s.profile){
      const x=s.x+s.nx*distance,z=s.z+s.nz*distance;
      const key=[x,y,z].map(n=>Math.round(n*1e9)).join(':');
      if(!unique.has(key)){
        unique.set(key,vertices.length/3);
        vertices.push(x,y,z);
      }
      welded.push(unique.get(key));
    }
  }
  const nondegenerate=(a,b,c)=>{
    const j=3*a,k=3*b,l=3*c;
    const ux=vertices[k]-vertices[j],uy=vertices[k+1]-vertices[j+1],uz=vertices[k+2]-vertices[j+2];
    const vx=vertices[l]-vertices[j],vy=vertices[l+1]-vertices[j+1],vz=vertices[l+2]-vertices[j+2];
    const cx=uy*vz-uz*vy,cy=uz*vx-ux*vz,cz=ux*vy-uy*vx;
    return cx*cx+cy*cy+cz*cz>1e-18;
  };
  const triangle=(a,b,c)=>{
    a=welded[a];b=welded[b];c=welded[c];
    if(a!==b&&b!==c&&c!==a&&nondegenerate(a,b,c))indices.push(a,b,c);
  };
  for(let row=0;row<stations.length-1;row++)for(let i=0;i<count;i++){
    const j=(i+1)%count,a=row*count+i,b=row*count+j,c=b+count,d=a+count;
    triangle(a,d,c);triangle(a,c,b);
  }
  const last=(stations.length-1)*count;
  for(let i=1;i<count-1;i++){
    triangle(0,i+1,i);triangle(last,last+i,last+i+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new THREE.Mesh(geometry,innerRailMaterial);
  mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  return mesh;
}

function addContinuousRail(x0,z0,x1,z1,outX,outZ){
  const faces=getCushionSegments().filter(f=>f.kind==='facing');
  const matchFace=(x,z)=>faces.find(f=>
    Math.hypot(f.x0-x,f.z0-z)<1e-8);
  const start=matchFace(x0,z0),end=matchFace(x1,z1);
  if(!start||!end)throw new Error('Unconnected rail facing');
  const stations=[];
  const facing=(x,z,face)=>({x,z,nx:-face.nx,nz:-face.nz,
    profile:pocketFacingProfile});
  const main=(x,z)=>({x,z,nx:outX,nz:outZ,
    profile:basicCushionProfile});
  if(start){
    stations.push(facing(start.x1,start.z1,start));
    stations.push(facing(x0,z0,start));
  }
  stations.push(main(x0,z0),main(x1,z1));
  if(end){
    stations.push(facing(x1,z1,end));
    stations.push(facing(end.x1,end.z1,end));
  }
  return addCushionSweep(stations);
}

function addShapedBed(bottom,thickness,material){
  // Visual slate is undercut by 2.3 mm beneath the cloth-facing circular lip.
  // Its 3D mesh does not feed the independent physical pocket shelf test.
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(slateCutoutShape(),{
    depth:thickness,bevelEnabled:false,curveSegments:32,steps:1}),material);
  mesh.rotation.x=-Math.PI/2;mesh.position.y=bottom;
  mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  return mesh;
}

function addPocketCasting(p){
  // The supplied Diamond-style reference has sculpted BLACK wood corners,
  // not brushed-nickel corner plates. The pocket opening remains entirely
  // clear: this casting lives behind the cloth's curved cut-out.
  const points=pocketCastingOutline(p,CORNER_CUT,OUTER_RAIL,SIDE_CUT);
  prism(points,-.145,CAP_BOTTOM+.145,apronMaterial);
  prism(points,CAP_BOTTOM-.005,.005,lowerRevealMaterial);
  // Rounded black upper cap; a slightly broader moulded edge takes the
  // sharpness off the pocket/rail transition without changing the cut-out.
  prism(points,CAP_BOTTOM,RAIL_TOP-CAP_BOTTOM,railMaterial,.009);
  if(p.kind==='corner'){
    // A thin, flat graphite plate at the rail TOP, not a tall metallic wall.
    // The dark structural backing below it merges into the black cup liner.
    // The existing cloth shoulders require no additional raised triangles.
    const insert=cornerPocketInsertOutline(p,CORNER_CUT);
    const plateThickness=.0045;
    prism(insert,CAP_BOTTOM,RAIL_TOP-CAP_BOTTOM-plateThickness,
      cornerInsertBackingMaterial);
    prism(insert,RAIL_TOP-plateThickness,plateThickness,
      cornerInsertMaterial);
  }
}

function addPocketBasket(p){
  // The black opening descends as a hollow bowl to the collection cylinder.
  // At the corners its entire perimeter is ONE circle, identical to the
  // physical capture boundary; the separate wood return stays behind it.
  // The older mesh lofted only the FRONT arc of the opening; behind it there
  // was no inner wall, so distant BLUE FELT showed through the corner hole.
  const bottom=-.302;
  const {top:topRadius,bottom:bottomRadius}=
    pocketCollectorRadii(p,CORNER_CUT,SIDE_CUT,RADIUS);
  const top=-.18;
  // The collector axis comes from the SAME reference perimeter: exact circle
  // centre at the corners, area centroid at the sides. No guessed shift.
  // This is a visual hanging bag, not the physical capture threshold.
  const reference=pocketReferenceGeometry(p,CORNER_CUT,SIDE_CUT,48);
  const collector=reference.collectorCenter;
  const vertices=[],indices=[],steps=48;
  const rim=reference.rim;
  const count=rim.length;
  const throatRings=[[-.006,0],[-.035,.02],[-.078,.25],
    [-.126,.65],[top,1]];
  for(const [y,blend] of throatRings)
    for(const [x,z] of rim){
      const dx=x-collector.x,dz=z-collector.z;
      const a=Math.atan2(dz,dx);
      const roundX=collector.x+topRadius*Math.cos(a);
      const roundZ=collector.z+topRadius*Math.sin(a);
      vertices.push(x*(1-blend)+roundX*blend,y,
        z*(1-blend)+roundZ*blend);
    }
  for(let row=0;row<throatRings.length-1;row++)for(let i=0;i<count;i++){
    const a=row*count+i,b=row*count+(i+1)%count;
    const c=(row+1)*count+i,d=(row+1)*count+(i+1)%count;
    indices.push(a,b,d,a,d,c);
  }
  const throatGeometry=new THREE.BufferGeometry();
  throatGeometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  throatGeometry.setIndex(indices);throatGeometry.computeVertexNormals();
  const throat=new THREE.Mesh(throatGeometry,leather);
  throat.castShadow=true;throat.receiveShadow=true;scene.add(throat);

  // A thin leather return lies just inside the circular cloth-facing edge;
  // it is recessed and does not overlay the blue playing surface.
  prism(pocketShelfLinerOutline(p,CORNER_CUT,SIDE_CUT),-.004,.0042,leather);

  const height=top-bottom;
  const liner=new THREE.Mesh(new THREE.CylinderGeometry(
    topRadius,bottomRadius,height,48,1,true),leather);
  liner.position.set(collector.x,(top+bottom)/2,collector.z);
  liner.castShadow=true;liner.receiveShadow=true;scene.add(liner);
  // The narrow black lip now sits below the cloth and flush with the throat,
  // not as a dark raised ring projected onto the blue playing surface.
  prism(pocketMouthTrimOutline(p,CORNER_CUT,SIDE_CUT),-.008,.003,leather);
  const levels=[-.194,-.225,-.260,-.290];
  const radiusAt=y=>topRadius+(bottomRadius-topRadius)*(top-y)/height;
  for(const y of levels){
    const vertices=[];
    for(let i=0;i<48;i++){
      const a=2*Math.PI*i/48,r=radiusAt(y)*.97;
      vertices.push(new THREE.Vector3(collector.x+r*Math.cos(a),y,collector.z+r*Math.sin(a)));
    }
    scene.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(vertices),netThread));
  }
  for(let i=0;i<20;i++){
    const a=2*Math.PI*i/20;
    const vertices=levels.map(y=>new THREE.Vector3(
      collector.x+radiusAt(y)*.97*Math.cos(a),y,collector.z+radiusAt(y)*.97*Math.sin(a)));
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(vertices),netThread));
  }
  const darkBottom=new THREE.Mesh(new THREE.CircleGeometry(bottomRadius*.98,48),matteBlack);
  darkBottom.rotation.x=-Math.PI/2;
  darkBottom.position.set(collector.x,bottom-.001,collector.z);
  scene.add(darkBottom);
  addPocketCasting(p);
}

function clothCutoutShape(overhang=0) {
  // At corners, cover both shoulders from the jaws to the opening circle.
  // The physical 35/6 mm shelf is not a second visual or capture boundary.
  const shape=new THREE.Shape();
  tableClothBoundary(LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,getPockets(),36,overhang)
    .forEach(([x,z],i)=>i===0?shape.moveTo(x,-z):shape.lineTo(x,-z));
  shape.closePath();return shape;
}

function slateCutoutShape() {
  const shape=new THREE.Shape();
  tableSlateBoundary(LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,getPockets())
    .forEach(([x,z],i)=>i===0?shape.moveTo(x,-z):shape.lineTo(x,-z));
  shape.closePath();return shape;
}

function sightDiamond(x,z,rotated=false,scale=1) {
  return [[-.012,0],[0,-.0055],[.012,0],[0,.0055]]
    .map(([u,v])=>rotated?[x-v*scale,z+u*scale]:[x+u*scale,z+v*scale]);
}

function addSightInlay(x,z,rotated=false){
  // A real cut-out in the wooden cap, lined with a dark gasket and a flush
  // mother-of-pearl insert. No planes float above the rail any longer.
  prism(sightDiamond(x,z,rotated,1.18),CAP_BOTTOM,RAIL_TOP-CAP_BOTTOM,
    sightInsetMaterial,0,[sightDiamond(x,z,rotated,.96)]);
  prism(sightDiamond(x,z,rotated,.96),RAIL_TOP-.003,.003,pearlMaterial);
}

function addTableBrand() {
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=150;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,768,150);
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillStyle='#edf1f2';ctx.font='italic 800 79px Georgia';ctx.letterSpacing='2px';ctx.fillText('FRAME',384,73);
  ctx.fillStyle='#b7c5c7';ctx.font='600 17px Arial';ctx.letterSpacing='7px';ctx.fillText('TOURNAMENT',384,122);
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  // Like the supplied photo, the wordmark belongs to the short end fascia.
  const front=new THREE.Mesh(new THREE.PlaneGeometry(0.86,0.167),mat);
  front.rotation.y=Math.PI/2;
  front.position.set(LENGTH+OUTER_RAIL+.003, -.226,0);scene.add(front);
  const back=new THREE.Mesh(new THREE.PlaneGeometry(0.86,0.167),mat);
  back.rotation.y=-Math.PI/2;
  back.position.set(-LENGTH-OUTER_RAIL-.003,-.226,0);scene.add(back);
}

function makeCornerLeg(x,z,sx,sz) {
  // Massive four-post Diamond-style construction from the reference photo:
  // each tapered square leg is directly beneath a cabinet corner, with its
  // top concealed inside the apron and its foot seated on the ground.
  const height=.411,topY=-.331,bottomY=topY-height;
  const geometry=new THREE.BoxGeometry(1,height,1,1,4,1);
  const positions=geometry.getAttribute('position');
  for(let i=0;i<positions.count;i++){
    const t=(height/2-positions.getY(i))/height;
    const w=.254-.052*t,d=.212-.023*t;
    const cx=x-sx*.012*t,cz=z-sz*.012*t;
    positions.setXYZ(i,cx+positions.getX(i)*w,positions.getY(i),
      cz+positions.getZ(i)*d);
  }
  geometry.computeVertexNormals();
  const leg=new THREE.Mesh(geometry,woodMaterial);
  leg.position.y=(topY+bottomY)/2;
  leg.castShadow=true;leg.receiveShadow=true;scene.add(leg);
  const fx=x-sx*.012,fz=z-sz*.012;
  box(.204,.018,.191,fx,-.751,fz,lowerRevealMaterial);
}

function makeTable() {
  // Regulation 100 × 50 inch playing surface, built as a modern nine-foot tournament table.
  const graphite=createGraphiteMaps();
  for(const material of [woodMaterial,railMaterial,apronMaterial]){
    material.map=graphite.map;material.bumpMap=graphite.bump;
    material.bumpScale=0.00045;material.needsUpdate=true;
  }
  const felt=createClothMaps();
  feltMaterial.map=felt.map;feltMaterial.bumpMap=felt.bump;
  feltMaterial.bumpScale=0.00019;feltMaterial.needsUpdate=true;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200,200),
    new THREE.MeshStandardMaterial({color:0x101719,roughness:0.97}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-0.76;floor.receiveShadow=true;scene.add(floor);
  // Tournament slate and continuous hardwood supporting frame. Pockets
  // remain real cut-outs through both the slate and the under-bed.
  addShapedBed(-.035,.034,slateMaterial);
  addShapedBed(-.115,.080,baseMaterial);
  // Structural rail sills touch the under-bed and the cabinet beneath it;
  // they are interrupted at each pocket, leaving the liners unobstructed.
  const sillStart=SIDE_CUT+.080,sillEnd=LENGTH-.080;
  for(const sx of [-1,1])for(const sz of [-1,1]) {
    const middle=sx*(sillStart+sillEnd)/2;
    box(sillEnd-sillStart,.215,.110,middle,-.205,
      sz*(WIDTH+.050),baseMaterial);
  }
  for(const sx of [-1,1])
    box(.110,.215,2*(WIDTH-.080),sx*(LENGTH+.050),-.205,0,baseMaterial);
  box(2.30,.193,1.12,0,-.209,0,baseMaterial);
  box(2.68,.105,1.40,0,-.355,0,woodMaterial);
  box(2.60,.019,1.32,0,-.414,0,lowerRevealMaterial);

  // Continuous furniture aprons: the upper ends overlap the rail skirts and
  // the lower ends are fastened over the structural frame (no floating gaps).
  for(const sign of [-1,1]){
    const longZ=sign*(WIDTH+OUTER_RAIL-.027);
    box(2.74,.213,.054,0,-.235,longZ,apronMaterial);
    box(2.72,.010,.057,0,-.345,longZ,lowerRevealMaterial);
    const shortX=sign*(LENGTH+OUTER_RAIL-.027);
    box(.054,.213,1.48,shortX,-.235,0,apronMaterial);
    box(.057,.010,1.46,shortX,-.345,0,lowerRevealMaterial);
  }
  // Four solid corner posts bridge both apron runs below the pocket castings.
  for(const sx of [-1,1])for(const sz of [-1,1])
    box(.103,.214,.113,sx*1.393,-.235,sz*.753,apronMaterial);

  // No exposed trestle: four sturdy legs rise into the corner cabinet posts.
  for(const sx of [-1,1])for(const sz of [-1,1])
    makeCornerLeg(sx*1.315,sz*.695,sx,sz);

  // The six holes are genuinely cut out of the cloth mesh.
  const cloth=new THREE.Mesh(new THREE.ShapeGeometry(clothCutoutShape(.0012),20),feltMaterial);
  cloth.rotation.x=-Math.PI/2;cloth.position.y=0.001;cloth.receiveShadow=true;scene.add(cloth);

  // Six separate rail assemblies, with mitred pocket ends, inlaid sights and
  // felt-covered rubber meeting the wood precisely at its inside shoulder.
  const longSightXs=[-.9525,-.635,-.3175,.3175,.635,.9525];
  const shortSightZs=[-.3175,0,.3175];
  for(const sign of [-1,1]) {
    for(const [x0,x1] of [[-LENGTH+CORNER_CUT,-SIDE_CUT],[SIDE_CUT,LENGTH-CORNER_CUT]]) {
      addContinuousRail(x0,sign*WIDTH,x1,sign*WIDTH,0,sign);
      const [capX0,capX1]=longRailCapEnds(x0,x1);
      const capSpan=capX1-capX0,capMid=(capX0+capX1)/2;
      const xSights=longSightXs.filter(x=>x>x0+.035&&x<x1-.035);
      const zSight=sign*(WIDTH+.091);
      prism([[capX0,sign*(WIDTH+RAIL_CAP_INNER_OFFSET)],
        [capX1,sign*(WIDTH+RAIL_CAP_INNER_OFFSET)],
        [capX1,sign*(WIDTH+OUTER_RAIL)],
        [capX0,sign*(WIDTH+OUTER_RAIL)]],
      CAP_BOTTOM,RAIL_TOP-CAP_BOTTOM,railMaterial,.007,
      xSights.map(x=>sightDiamond(x,zSight,false,1.18)));
      for(const x of xSights)addSightInlay(x,zSight);
      // A structural rail core closes the underside beneath the top cap;
      // the exposed outer plank is a true apron, not a floating strip.
      box(capSpan,.125,.120,capMid,-.0385,
        sign*(WIDTH+.112),woodMaterial);
      // Vertical hardwood apron runs into the rail with no floating gap.
      box(capSpan,.171,.038,capMid,-.0615,
        sign*(WIDTH+OUTER_RAIL-.019),apronMaterial);
      box(capSpan-.003,.006,.040,capMid,-.148,
        sign*(WIDTH+OUTER_RAIL-.019),darkMetal,false);
      // The photo shows a recessed black wood moulding, no bright metal strip.
      box(capSpan-.003,.007,.003,capMid,.0125,
        sign*(WIDTH+OUTER_RAIL+.002),lowerRevealMaterial,false);
    }
    const z0=-WIDTH+CORNER_CUT,z1=WIDTH-CORNER_CUT;
    addContinuousRail(sign*LENGTH,z0,sign*LENGTH,z1,sign,0);
    const [capZ0,capZ1]=shortRailCapEnds(z0,z1),capWidth=capZ1-capZ0;
    prism([[sign*(LENGTH+RAIL_CAP_INNER_OFFSET),capZ0],
      [sign*(LENGTH+RAIL_CAP_INNER_OFFSET),capZ1],
      [sign*(LENGTH+OUTER_RAIL),capZ1],
      [sign*(LENGTH+OUTER_RAIL),capZ0]],
    CAP_BOTTOM,RAIL_TOP-CAP_BOTTOM,railMaterial,.007,
    shortSightZs.map(z=>sightDiamond(sign*(LENGTH+.092),z,true,1.18)));
    for(const z of shortSightZs)addSightInlay(sign*(LENGTH+.092),z,true);
    box(.120,.125,capWidth,sign*(LENGTH+.112),-.0385,
      0,woodMaterial);
    box(.038,.171,capWidth,sign*(LENGTH+OUTER_RAIL-.019),
      -.0615,0,apronMaterial);
    box(.040,.006,capWidth-.003,sign*(LENGTH+OUTER_RAIL-.019),
      -.148,0,darkMetal,false);
    box(.003,.007,capWidth-.003,
      sign*(LENGTH+OUTER_RAIL+.002),.0125,0,lowerRevealMaterial,false);
  }
  // All twelve physical pocket facings (eight corner, four side) are now
  // integrated into the six rubber volumes above, without any detached ends.
  for(const p of getPockets())addPocketBasket(p);
  addTableBrand();
}

function numberTexture(number) {
  const c = document.createElement('canvas');c.width=256;c.height=256;
  const ctx=c.getContext('2d');
  ctx.clearRect(0,0,256,256);
  ctx.fillStyle='#faf8ed';ctx.beginPath();ctx.arc(128,128,120,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='#dfdccb';ctx.lineWidth=4;ctx.stroke();
  ctx.fillStyle='#171717';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`700 ${number<10?145:112}px Arial`;ctx.fillText(String(number),128,135);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;
}

function ballMesh(number) {
  const group=new THREE.Group();
  const color=BALL_COLORS[number];
  let body;
  if(number>=9) {
    body = new THREE.Mesh(sharedSphere,new THREE.MeshPhysicalMaterial({color:0xf5f4e9,
      roughness:0.18,metalness:0,clearcoat:1,clearcoatRoughness:0.085}));
    const band=new THREE.Mesh(new THREE.SphereGeometry(RADIUS*1.001,56,24,
      0,Math.PI*2,Math.PI*0.35,Math.PI*0.30),
    new THREE.MeshPhysicalMaterial({color:new THREE.Color(color),roughness:0.18,
      clearcoat:1,clearcoatRoughness:0.085}));
    band.castShadow=true;group.add(band);
  } else {
    body=new THREE.Mesh(sharedSphere,new THREE.MeshPhysicalMaterial({color:new THREE.Color(color),
      roughness:0.18,metalness:0,clearcoat:1,clearcoatRoughness:0.085}));
  }
  body.castShadow=true;body.receiveShadow=true;group.add(body);
  if(number!==0) {
    const decal=new THREE.MeshBasicMaterial({map:numberTexture(number),transparent:true,
      depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,side:THREE.DoubleSide});
    for(const turn of [0,Math.PI]){
      const patch=new THREE.Mesh(sharedNumberPatch,decal);
      patch.rotation.x=turn;group.add(patch);
    }
  }
  scene.add(group);return group;
}

function placeBall(num,x,z) {
  const mesh=ballMesh(num);mesh.position.set(x,RADIUS,z);
  const b={...makePhysicsBody(num,x,z),mesh};
  balls.push(b); return b;
}

function clearTable() {
  for(const fall of fallingBalls)if(fall.mesh)scene.remove(fall.mesh);
  fallingBalls=[];
  boardRevision++;
  placementMode=false;placementPointer=null;
  const disposedMaterials=new Set();
  const disposedTextures=new Set();
  for(const b of balls) {
    scene.remove(b.mesh);
    b.mesh.traverse(obj=>{
      if(obj.geometry && obj.geometry!==sharedSphere&&obj.geometry!==sharedNumberPatch)
        obj.geometry.dispose();
      if(obj.material&&!disposedMaterials.has(obj.material)) {
        disposedMaterials.add(obj.material);
        if(obj.material.map?.isTexture&&!disposedTextures.has(obj.material.map)) {
          disposedTextures.add(obj.material.map);
          obj.material.map.dispose();
        }
        obj.material.dispose();
      }
    });
  }
  balls=[]; shotCount=0;shotActive=false;scratchedThisShot=false;pocketsThisShot=0;miscuedThisShot=false;accumulator=0;
  shotSimTime=0;telemetry=null;lastMetricsAt=0;
  if(cueTrailLine)cueTrailLine.visible=false;
  if(objectTrailLine)objectTrailLine.visible=false;
  el.labLoad.disabled=false;el.labReplay.disabled=true;el.labExport.disabled=true;
  el.labDistance.textContent=el.labAfterContact.textContent=el.labCushions.textContent=el.labTime.textContent='—';
}

function newGame() {
  clearTable();
  resetFirstPersonAim(firstPerson);
  activeLabScenario=null;lastShotSnapshot=null;
  el.labDescription.textContent='La partie utilise le simulateur physique. Les tirs restent mesurés pendant le jeu.';
  el.labState.textContent='JEU DE LA 8';
  placeBall(0,-0.76,0);
  if(match?.mode==='nine'){
    for(const ball of nineBallRack(RADIUS))placeBall(ball.num,ball.x,ball.z);
  }else{
  // WPA: one full ball and one striped ball at opposite rear corners.
  const sequence=[1,2,9,3,8,10,4,11,5,12,6,13,14,7,15];
  let index=0;
  for(let row=0;row<5;row++) {
    for(let j=0;j<=row;j++) {
      let num=sequence[index++];
      // The eight remains at the centre of the triangle.
      if(row===2&&j===1) num=8;
      // Balls are frozen to within a fraction of a millimetre, as in a
      // properly tightened tournament rack (not an artificially loose rack).
      const x=0.49+row*(Math.sqrt(3)*RADIUS+0.00006);
      const z=(j-row/2)*(2*RADIUS+0.00012);
      placeBall(num,x,z);
    }
  }
  }
  aim={x:1,z:0};
  updateCounters();setStatus('Casse à préparer','Glissez la blanche dans la zone de départ, puis visez le triangle.',false);
  el.shotState.textContent='PRÊT';el.shootButton.disabled=false;
  el.cushionModel.disabled=false;
  setSpin(0,0);
}

const groupLabel = group => group === 'solid' ? 'PLEINES 1–7' :
  group === 'stripe' ? 'RAYÉES 9–15' : 'TABLE OUVERTE';

function refreshMatchUI() {
  el.matchPanel.hidden=!match;
  el.modeChip.textContent=match?(match.mode==='nine'?'JEU DE LA 9':'JEU DE LA 8'):'PRÉPARATION';
  for(let player=0;player<2;player++){
    const node=player===0?el.playerOne:el.playerTwo;
    node.classList.toggle('current',Boolean(match&&match.current===player&&match.phase!=='finished'));
    node.querySelector('strong').textContent=match?.winner===player?'VAINQUEUR':
      match?.phase==='finished'?'PARTIE TERMINÉE':
      match?.current===player?'À LA TABLE':'EN ATTENTE';
    (player===0?el.playerOneGroup:el.playerTwoGroup).textContent=match?.mode==='nine'?`${match.fouls[player]} FAUTE(S) CONSÉCUTIVE(S)`:groupLabel(match?.groups[player]);
  }
  if(match){
    el.matchMessage.textContent=match.phase==='finished'?`Joueur ${match.winner+1} remporte la partie.`:
      `Joueur ${match.current+1} · ${match.lastResult?.reason||'Casse à préparer.'}`;
  }
  el.nineBallPanel.hidden=match?.mode!=='nine';
  if(match?.mode==='nine'){
    const remaining=balls.filter(b=>b.active&&b.num>0).map(b=>b.num);
    el.nineBallTarget.textContent=match.phase==='finished'?'PARTIE TERMINÉE':
      `TOUCHER LA ${Math.min(...remaining)} EN PREMIER`;
    el.pushOutButton.hidden=!match.pushOutAvailable;
    el.pushOutButton.disabled=shotActive;
    el.pushOutButton.classList.toggle('active',safetyCalled);
    el.pushOutButton.setAttribute('aria-pressed',String(safetyCalled));
    el.pushOutButton.textContent=safetyCalled?'PUSH-OUT ANNONCÉ · ANNULER':'ANNONCER UN PUSH-OUT';
  }
  refreshCallUI();
  if(match){
    el.shootButton.disabled=shotActive||match.phase==='decision'||match.phase==='finished'||needsCuePlacement;
    if(match.phase==='finished')el.shotState.textContent='FIN DE PARTIE';
    else if(match.phase==='decision')el.shotState.textContent='DÉCISION';
    else if(needsCuePlacement)el.shotState.textContent='BLANCHE EN MAIN';
  }
  el.labLoad.disabled=Boolean(match&&match.phase!=='finished');
  el.labReplay.disabled=Boolean(match&&match.phase!=='finished')||!lastShotSnapshot;
}

function refreshCallUI() {
  const visible=Boolean(match&&match.mode==='eight'&&match.phase==='playing');
  el.callPanel.hidden=!visible;
  if(!visible)return;
  el.callPanel.classList.toggle('auto-mode',!match.callPocket);
  const selected=el.calledBall.value;
  const group=match.groups[match.current];
  const available=balls.filter(b=>b.active&&(b.num===8||groupOf(b.num))&&
    (group? groupOf(b.num)===group || (b.num===8&&!balls.some(other=>other.active&&groupOf(other.num)===group)) : b.num!==8 ||
      !balls.some(other=>other.active&&other.num!==0&&other.num!==8)));
  el.calledBall.replaceChildren(new Option('Choisir une bille',''),
    ...available.map(b=>new Option(`Bille ${b.num}`,String(b.num))));
  el.calledBall.value=available.some(b=>String(b.num)===selected)?selected:'';
  el.safetyButton.classList.toggle('active',safetyCalled);
  el.safetyButton.setAttribute('aria-pressed',String(safetyCalled));
  el.calledBall.disabled=safetyCalled;
  for(const button of el.calledPockets.querySelectorAll('button')){
    button.classList.toggle('selected',chosenPocket===Number(button.dataset.pocket));
    button.setAttribute('aria-pressed',String(chosenPocket===Number(button.dataset.pocket)));
    button.disabled=safetyCalled;
  }
  el.callHint.textContent=safetyCalled?'Sécurité annoncée : le tour passera à l’adversaire.':
    match.callPocket?'La bille et sa poche doivent être annoncées avant le tir.':
    'Mode sans annonce : les billes valables sont comptées automatiquement.';
}

function showMatchSetup() {
  if(shotActive)return;
  releaseAimMouse();
  el.matchOverlay.hidden=false;
  el.decisionOverlay.hidden=true;
  el.victoryOverlay.hidden=true;
  el.startMatch.focus();
}

function startMatch() {
  if(shotActive)return;
  const nine=document.querySelector('input[name=gameMode]:checked')?.value==='nine';
  match=(nine?newNineBallMatch:newEightBallMatch)({callPocket:el.requireCall.checked,
    breaker:Number(el.breakerSelect.value)});
  needsCuePlacement=false;chosenPocket=null;safetyCalled=false;shotEvents=null;
  newGame();
  el.matchOverlay.hidden=true;el.decisionOverlay.hidden=true;el.victoryOverlay.hidden=true;
  refreshMatchUI();
  el.gameCanvas.focus();
}

function showVictoryScreen() {
  releaseAimMouse();
  const summary=match?.mode==='nine'?nineBallVictoryPresentation(match):eightBallVictoryPresentation(match);
  if(!summary)return;
  // Match dialogs belong to the scene and remain visible in fullscreen.
  el.victoryOverlay.querySelector('.victory-medallion').textContent=match.mode==='nine'?'9':'8';
  el.victoryWinner.textContent=summary.winner;
  el.victoryOutcome.textContent=summary.outcome;
  el.victoryReason.textContent=summary.reason;
  el.victoryOverlay.hidden=false;
  el.victoryNewMatch.focus();
}

const breakChoices = {
  'take-shot':'Jouer depuis cette position',
  'pass-shot':'Rendre la main au joueur du push-out',
  'spot-head':'Replacer la 8 · blanche dans la zone de casse',
  'spot-continue':'Replacer la 8 · continuer',
  'rerack-incoming':'Refaire le triangle · casse de l’adversaire',
  'rerack-breaker':'Refaire le triangle · même casseur',
  'accept':'Accepter la position des billes'
};

function spotObjectBall(number=8) {
  const ball=balls.find(b=>b.num===number);
  if(!ball||ball.active)return;
  const footSpot=0.49;
  let found=null;
  for(const direction of [-1,1]){
    for(let step=0;step<70;step++){
      const x=footSpot+direction*step*(2*RADIUS+.0006);
      if(x<-LENGTH+RADIUS||x>LENGTH-RADIUS)break;
      if(balls.every(b=>!b.active||b.num===number||Math.hypot(b.x-x,b.z)>2*RADIUS+.001)){
        found={x,z:0};break;
      }
    }
    if(found)break;
  }
  if(!found)return;
  ball.x=found.x;ball.z=found.z;ball.active=true;stopBall(ball);
  ball.mesh.visible=true;ball.mesh.position.set(ball.x,RADIUS,ball.z);
  for(let i=fallingBalls.length-1;i>=0;i--)if(fallingBalls[i].num===number){
    if(fallingBalls[i].mesh)scene.remove(fallingBalls[i].mesh);
    fallingBalls.splice(i,1);
  }
  boardRevision++;updateCounters();
}

function findCuePosition(mode) {
  const canPlace=mode==='head'?canPlaceBreakCue:canPlaceFreeCue;
  const candidates=[[-.76,0],[-.93,0],[-.76,.25],[-.76,-.25],[0,0]];
  for(let x=-LENGTH+.06;x<LENGTH-.04;x+=.06)
    for(let z=-WIDTH+.06;z<WIDTH-.04;z+=.06)candidates.push([x,z]);
  return candidates.find(([x,z])=>canPlace(x,z,balls));
}

function prepareCueInHand() {
  if(!match?.ballInHand)return;
  const cue=balls.find(b=>b.num===0);
  if(!cue)return;
  if(!cue.active){
    const candidate=findCuePosition(match.ballInHand);
    if(candidate){cue.x=candidate[0];cue.z=candidate[1];}
    cue.active=true;cue.mesh.visible=true;stopBall(cue);
    cue.mesh.position.set(cue.x,RADIUS,cue.z);
  }
  needsCuePlacement=true;placementMode=true;
  el.shotState.textContent='BLANCHE EN MAIN';
}

function openBreakDecision() {
  releaseAimMouse();
  if(!match?.pending)return;
  el.decisionOverlay.querySelector('h2').textContent=match.mode==='nine'?'Choix après le push-out.':'Choix après la casse.';
  el.decisionText.textContent=match.lastResult.reason;
  el.decisionActions.replaceChildren();
  for(const action of match.pending.options){
    const button=document.createElement('button');
    button.type='button';button.className='decision-button';
    button.textContent=breakChoices[action];
    button.addEventListener('click',()=>{
      const shouldSpot=action==='spot-head'||action==='spot-continue';
      match=match.mode==='nine'?resolveNineBallDecision(match,action):resolveEightBallDecision(match,action);
      if(match.lastResult.kind==='rerack'){
        chosenPocket=null;safetyCalled=false;needsCuePlacement=false;
        newGame();
      } else if(shouldSpot)spotObjectBall();
      if(match.ballInHand)prepareCueInHand();
      el.decisionOverlay.hidden=true;
      setStatus('Décision appliquée',match.lastResult.reason,false);
      refreshMatchUI();updateVisuals();
    });
    el.decisionActions.append(button);
  }
  el.decisionOverlay.hidden=false;
  el.decisionActions.querySelector('button')?.focus();
}

function setPower(value) {
  const power=Math.max(1,Math.min(100,Number(value)||1));
  el.powerSlider.value=String(power);
  el.powerValue.textContent=`${power.toLocaleString('fr-FR',{maximumFractionDigits:1})}%`;
  const filled=(power-1)/99*100;
  el.powerSlider.style.background=`linear-gradient(to right,transparent ${filled}%,#35443e ${filled}%),linear-gradient(to right,#a6dd7a 0%,#a6dd7a 60%,#e9ba70 88%,#ea9960 100%)`;
  updatePowerReadout();
  updateVisuals();
}

function updatePowerReadout() {
  const power=Number(el.powerSlider.value);
  const impact=getCueImpact(aim,powerToCueSpeed(power),spin,{elevation:Number(el.elevationSlider.value)});
  const speed=Math.hypot(impact.vx,impact.vz);
  el.powerSpeed.textContent=`${speed.toFixed(1).replace('.',',')} m/s`;
  el.powerMode.textContent=power>=90?'ZONE DE CASSE':power>=75?'COUP PUISSANT':power>=40?'COUP CONTRÔLÉ':'DOSAGE FIN';
  el.powerMode.classList.toggle('break-zone',power>=90);
}

function setElevation(value) {
  const elevation=Math.max(0,Math.min(15,Number(value)||0));
  el.elevationSlider.value=String(elevation);
  el.elevationValue.textContent=`${elevation}°`;
  el.elevationSlider.style.background=`linear-gradient(to right,var(--accent) 0%,var(--accent) ${100*elevation/15}%,#35443e ${100*elevation/15}%,#35443e 100%)`;
  updatePowerReadout();
  updateVisuals();
}

function prepareLabTable(positions, newAim, newSpin, power, elevation, title, subtitle) {
  clearTable();
  for(const b of positions)placeBall(b.num,b.x,b.z);
  aim={...newAim};
  setPower(power);setElevation(elevation);setSpin(newSpin.x,newSpin.y);
  updateCounters();
  setStatus('Coup de laboratoire chargé',subtitle,false);
  el.shotState.textContent='PRÊT';el.shootButton.disabled=false;
  el.labDescription.textContent=`${title} — ${subtitle}`;
  el.labState.textContent='SCÉNARIO PRÊT';
  updateVisuals();
}

function loadLabScenario() {
  if(shotActive)return;
  const scenario=getLabScenario(el.labScenario.value);
  if(!scenario)return;
  match=null;needsCuePlacement=false;chosenPocket=null;safetyCalled=false;
  activeLabScenario=scenario;lastShotSnapshot=null;
  prepareLabTable(scenario.balls,scenario.aim,scenario.spin,scenario.power,
    scenario.elevation,scenario.title,scenario.subtitle);
  refreshMatchUI();
}

function replayLastShot() {
  if(shotActive||!lastShotSnapshot)return;
  const shot=lastShotSnapshot;
  // A replay is an independent laboratory exercise, not an additional turn.
  match=null;needsCuePlacement=false;chosenPocket=null;safetyCalled=false;
  activeLabScenario=shot.scenario;
  // Replaying a shot must restore the rail model actually used at recording,
  // even if the user selected a different preset in the meantime.
  el.cushionModel.value=shot.cushionModel||'empirical';
  el.cushionModel.dispatchEvent(new Event('change'));
  prepareLabTable(shot.positions,shot.aim,shot.spin,shot.power,
    shot.elevation,shot.label,'Configuration reproduite à l’identique.');
  refreshMatchUI();
  shoot();
}

function exportLabCSV() {
  if(!telemetry || shotActive)return;
  const csv=telemetry.toCSV();
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download=`frame-trajectoire-${activeLabScenario?.id || 'libre'}.csv`;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function exportCalibrationCSV() {
  if(!calibrationResults)return;
  const url=URL.createObjectURL(new Blob([calibrationToCSV(calibrationResults,calibrationMeasurements)],
    {type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download=`frame-calibration-v021-${el.cushionModel.value}.csv`;
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function calibrationValue(value,unit) {
  if(!Number.isFinite(value))return '—';
  const digits=unit==='billes'?0:unit==='m/s'||unit==='m/s²'?3:1;
  return `${value.toFixed(digits).replace('.',',')} ${unit}`;
}

function updateCalibrationStats() {
  if(!calibrationResults)return;
  const angular=calibrationResults.filter(r=>r.unit==='°'&&Number.isFinite(r.reference));
  const maxTheory=Math.max(...angular.map(r=>Math.abs(r.simulated-r.reference)));
  const count=calibrationResults.filter(r=>Number.isFinite(calibrationMeasurements[r.id])).length;
  const published=calibrationResults.filter(r=>Number.isFinite(r.published));
  // Bands use a fitted equation already built into the model. Only the ball
  // collision data are an independent velocity comparison.
  const speedBenchmarks=published.filter(r=>r.family==='published-ball');
  const speedMAE=speedBenchmarks.reduce((s,r)=>s+Math.abs(r.simulated-r.published),0)/
    Math.max(1,speedBenchmarks.length);
  el.calibrationStats.replaceChildren();
  for(const [label,value] of [['ESSAIS',`${calibrationResults.length}`],
    ['ÉCART MAX. AUX RÈGLES',calibrationValue(maxTheory,'°')],
    ['MESURES / REPÈRES PUBLIÉS',`${published.length}`],
    ['ÉCART MOYEN · COLLISIONS',calibrationValue(speedMAE,'m/s')],
    ['MESURES PERSONNELLES',`${count} / ${calibrationResults.length}`]]) {
    const span=document.createElement('span');
    span.textContent=`${label} · `;
    const strong=document.createElement('strong');strong.textContent=value;
    span.append(strong);el.calibrationStats.append(span);
  }
}

function renderCalibrationResults() {
  el.calibrationRows.replaceChildren();
  for(const item of calibrationResults) {
    const row=document.createElement('tr');
    const name=document.createElement('td');
    const scenario=document.createElement('div');scenario.className='calibration-scenario';
    const title=document.createElement('span');title.textContent=item.name;
    const detail=document.createElement('small');detail.textContent=item.detail;
    scenario.append(title,detail);name.append(scenario);
    const simulated=document.createElement('td');simulated.textContent=calibrationValue(item.simulated,item.unit);
    const theory=document.createElement('td');theory.className=item.reference===null?'calibration-neutral':'calibration-theory';
    theory.textContent=calibrationValue(item.reference,item.unit);theory.title=item.source;
    const published=document.createElement('td');
    published.className=Number.isFinite(item.published)?'calibration-published':'calibration-neutral';
    if(Number.isFinite(item.published)) {
      const mark=document.createElement(item.sourceUrl?'a':'span');
      if(item.sourceUrl){mark.href=item.sourceUrl;mark.target='_blank';mark.rel='noopener noreferrer';}
      mark.textContent=calibrationValue(item.published,item.unit);
      mark.title=`${item.publishedKind} · ${item.source}`;
      published.append(mark);
    }else published.textContent='—';
    const publishedDelta=document.createElement('td');
    const publishedDifference=signedDeviation(item.simulated,item.published);
    publishedDelta.textContent=publishedDifference===null?'—':
      `${publishedDifference>=0?'+':'−'}${calibrationValue(Math.abs(publishedDifference),item.unit)}`;
    publishedDelta.className=publishedDifference===null?'calibration-neutral':
      (item.unit==='m/s'&&Math.abs(publishedDifference)<=0.05)||
      (item.unit==='%'&&Math.abs(publishedDifference)<=1.5)?'calibration-match':'calibration-error';
    publishedDelta.title=item.publishedKind||'';
    const measured=document.createElement('td');
    const input=document.createElement('input');input.type='number';
    input.min='0';input.max=String(item.unit==='°'?180:
      item.unit==='billes'?15:item.unit==='%'?100:300);
    input.step=item.unit==='billes'?'1':item.unit==='m/s'||item.unit==='m/s²'?'0.001':'0.1';input.placeholder='—';
    input.dataset.calibrationId=item.id;
    input.setAttribute('aria-label',`Mesure personnelle pour ${item.name}, en ${item.unit}`);
    if(Number.isFinite(calibrationMeasurements[item.id]))input.value=String(calibrationMeasurements[item.id]);
    measured.append(input);
    const delta=document.createElement('td');delta.className='calibration-neutral';
    const writeDelta=()=>{
      const reference=calibrationMeasurements[item.id];
      const difference=signedDeviation(item.simulated,reference);
      delta.textContent=difference===null?'—':
        `${difference>=0?'+':'−'}${calibrationValue(Math.abs(difference),item.unit)}`;
      delta.className=difference===null?'calibration-neutral':'calibration-error';
    };
    writeDelta();
    input.addEventListener('change',()=>{
      const raw=input.value.trim();
      const next=raw===''?null:Number(raw);
      const limit=Number(input.max);
      if(next!==null&&(!Number.isFinite(next)||next<0||next>limit||
        (item.unit==='billes'&&!Number.isInteger(next)))) {
        input.value=Number.isFinite(calibrationMeasurements[item.id])?
          String(calibrationMeasurements[item.id]):'';
        return;
      }
      if(next===null)delete calibrationMeasurements[item.id];
      else calibrationMeasurements[item.id]=next;
      try {localStorage.setItem(CALIBRATION_STORAGE_KEY,JSON.stringify(calibrationMeasurements));}
      catch(_error){/* Browser-local persistence is optional. */}
      writeDelta();updateCalibrationStats();
    });
    row.append(name,simulated,theory,published,publishedDelta,measured,delta);
    el.calibrationRows.append(row);
  }
  updateCalibrationStats();
  el.calibrationExport.disabled=false;
}

function bindCalibration() {
  el.calibrationRun.addEventListener('click',()=>{
    el.calibrationRun.disabled=true;
    el.calibrationStats.textContent='Calcul en cours…';
    // Keep the calibration independent from the current table and shot.
    requestAnimationFrame(()=>{
      try {
        calibrationResults=runCalibration({cushionModel:el.cushionModel.value});
        renderCalibrationResults();
      }catch(error) {
        el.calibrationStats.textContent=`Calcul impossible : ${error.message}`;
      }finally{el.calibrationRun.disabled=false;}
    });
  });
  el.calibrationExport.addEventListener('click',exportCalibrationCSV);
}

function updateLabMeasurements() {
  if(!telemetry)return;
  const summary=telemetry.summary(balls.find(b=>b.num===0));
  el.labDistance.textContent=`${(summary.cueDistance*100).toFixed(1)} cm`;
  el.labAfterContact.textContent=summary.postContact===null?'—':
    `${summary.postContact>=0?'+':'−'}${Math.abs(summary.postContact*100).toFixed(1)} cm`;
  el.labCushions.textContent=String(summary.cushions);
  el.labTime.textContent=`${summary.duration.toFixed(2)} s`;
}

function updateCounters() {
  el.shotsCount.textContent=String(shotCount).padStart(2,'0');
  const potted=balls.filter(b=>b.num!==0&&!b.active).length;
  el.pottedCount.textContent=String(potted).padStart(2,'0');
  el.ballTotal.textContent=String(balls.filter(b=>b.num!==0).length).padStart(2,'0');
  el.ballsProgress.replaceChildren();
  for(let n=1;n<=15;n++) {
    const ball=balls.find(b=>b.num===n);
    if(!ball) continue;
    const s=document.createElement('span');s.className='mini-ball'+(!ball.active?' potted':'');
    s.style.background=n>=9?`linear-gradient(to bottom,#e8ece3 0%,#e8ece3 28%,${BALL_COLORS[n]} 28%,${BALL_COLORS[n]} 72%,#e8ece3 72%)`:BALL_COLORS[n];
    s.style.color=[1,9,10,12,13,14].includes(n)?'#131a1b':'#fff';s.textContent=n;
    s.title=`Bille ${n}${!ball.active?' — empochée':''}`;
    el.ballsProgress.append(s);
  }
}

function setStatus(title,description,rolling=false) {
  el.statusTitle.textContent=title;el.statusText.textContent=description;
  el.statusIndicator.classList.toggle('rolling',rolling);
}

function makeCylinder(length,r1,r2,center,mat) {
  const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,length,12),mat);
  m.rotation.z=Math.PI/2;m.position.set(center,0,0);m.castShadow=true;cueGroup.add(m);return m;
}

function makeCueAndGuides() {
  cueGroup=new THREE.Group();scene.add(cueGroup);
  const shaft = new THREE.MeshStandardMaterial({color:0xdcc69b,roughness:0.55});
  const grip = new THREE.MeshStandardMaterial({color:0x20292c,roughness:0.8});
  const blue = new THREE.MeshStandardMaterial({color:0x376a8b,roughness:0.55});
  makeCylinder(0.78,0.013,0.006,-0.445,shaft);
  makeCylinder(0.39,0.015,0.013,-1.03,grip);
  makeCylinder(0.02,0.007,0.007,-0.045,blue);
  makeCylinder(0.012,0.012,0.012,-0.84,brass);
  makeCylinder(0.018,0.013,0.013,-1.225,woodMaterial);

  aimLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xf1f9dd,dashSize:0.039,gapSize:0.026,transparent:true,opacity:0.88,depthTest:false}));
  aimLine.renderOrder=5;scene.add(aimLine);
  deflectionLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xa6dd7a,dashSize:0.021,gapSize:0.012,transparent:true,opacity:0.98,depthTest:false}));
  deflectionLine.renderOrder=6;scene.add(deflectionLine);
  objectLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({color:0xe9ce80,dashSize:0.028,gapSize:0.02,transparent:true,opacity:0.78,depthTest:false}));
  objectLine.renderOrder=5;scene.add(objectLine);
  ghostMarker=new THREE.Mesh(new THREE.TorusGeometry(RADIUS*1.05,0.0023,6,40),new THREE.MeshBasicMaterial({color:0xc6f0a2,transparent:true,opacity:0.8,depthTest:false}));
  ghostMarker.rotation.x=Math.PI/2;ghostMarker.renderOrder=5;scene.add(ghostMarker);
  cueTrailLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xa6dd7a,transparent:true,opacity:.91,depthTest:false}));
  cueTrailLine.visible=false;cueTrailLine.renderOrder=7;scene.add(cueTrailLine);
  objectTrailLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0xf3c277,transparent:true,opacity:.90,depthTest:false}));
  objectTrailLine.visible=false;objectTrailLine.renderOrder=7;scene.add(objectTrailLine);
  placementZone=new THREE.Mesh(new THREE.PlaneGeometry(HEAD_STRING_X+LENGTH,2*WIDTH),
    new THREE.MeshBasicMaterial({color:0xa9df83,transparent:true,opacity:.11,
      depthWrite:false,side:THREE.DoubleSide}));
  placementZone.rotation.x=-Math.PI/2;
  placementZone.position.set((-LENGTH+HEAD_STRING_X)/2,.007,0);
  placementZone.renderOrder=3;placementZone.visible=false;scene.add(placementZone);
  headStringLine=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({
    color:0xd6f3ba,dashSize:.027,gapSize:.016,transparent:true,opacity:.7,depthTest:false}));
  setLine(headStringLine,[new THREE.Vector3(HEAD_STRING_X,.013,-WIDTH),
    new THREE.Vector3(HEAD_STRING_X,.013,WIDTH)]);
  headStringLine.renderOrder=4;headStringLine.visible=false;scene.add(headStringLine);
}

function setLine(line,points) {
  line.geometry.dispose();line.geometry=new THREE.BufferGeometry().setFromPoints(points);
  line.computeLineDistances();
}

function syncTrailLines() {
  if(!cueTrailLine||!objectTrailLine)return;
  for(const [line,num] of [[cueTrailLine,0],[objectTrailLine,telemetry?.firstObject]]) {
    const trace=telemetry?.points.get(num);
    if(!el.showTraces.checked||!trace||trace.length<2){line.visible=false;continue;}
    setLine(line,trace.map(p=>new THREE.Vector3(p.x,RADIUS+.011,p.z)));
    line.visible=true;
  }
}

function trajectoryPreview() {
  const key=[boardRevision,aim.x.toFixed(5),aim.z.toFixed(5),spin.x.toFixed(4),
    spin.y.toFixed(4),el.powerSlider.value,el.elevationSlider.value,
    el.cushionModel.value].join('/');
  if(key===previewKey)return previewCache;
  const now=performance.now();
  const remaining=85-(now-previewLastAt);
  if(previewCache&&remaining>0) {
    if(previewTimer===null)previewTimer=setTimeout(()=>{
      previewTimer=null;updateVisuals();
    },remaining);
    return previewCache;
  }
  if(previewTimer!==null){clearTimeout(previewTimer);previewTimer=null;}
  previewKey=key;previewLastAt=now;
  previewCache=predictTrajectory(balls,aim,Number(el.powerSlider.value),spin,
    Number(el.elevationSlider.value),el.cushionModel.value);
  return previewCache;
}

function updateVisuals() {
  if(cameraMode==='first-person'&&camera)updateCamera();
  refreshPlacementUI();
  if(!cueGroup)return;
  const cue=balls.find(b=>b.num===0);
  const ready=cue&&cue.active&&!shotActive;
  cueGroup.visible=!!ready;
  aimLine.visible=!!ready&&el.aimAssist.checked;
  deflectionLine.visible=false;
  ghostMarker.visible=false;objectLine.visible=false;
  if(!ready)return;
  const elevation=Number(el.elevationSlider.value);
  const tilt=elevation*Math.PI/180;
  const impact=getCueImpact(aim,1,spin,{elevation});
  const contactOffset=spin.x*0.62*RADIUS;
  cueGroup.position.set(cue.x-aim.z*contactOffset,
    RADIUS+0.005+spin.y*0.62*RADIUS*Math.cos(tilt)-0.045*Math.sin(tilt),
    cue.z+aim.x*contactOffset);
  cueGroup.rotation.set(0,-Math.atan2(aim.z,aim.x),-tilt,'YXZ');
  const deflection=Math.abs(impact.squirtDegrees);
  el.impactReadout.classList.toggle('warning',impact.miscue);
  el.spinDot.classList.toggle('risk',impact.miscue);
  el.impactReadout.firstElementChild.textContent=impact.miscue?'FAUSSE QUEUE PROBABLE':'DÉVIATION INITIALE';
  el.squirtValue.textContent=impact.miscue?'CONTACT HORS LIMITE':
    deflection<0.05?'AXE VISÉ':`${deflection.toFixed(1)}° ${impact.squirtDegrees>0?'GAUCHE':'DROITE'}`;
  if(!el.aimAssist.checked) return;

  const prediction=trajectoryPreview();
  if(!prediction)return;
  const asVectors=(points,y)=>points.map(p=>new THREE.Vector3(p.x,y,p.z));
  if(prediction.before.length>=2)setLine(aimLine,asVectors(prediction.before,RADIUS+0.006));
  else aimLine.visible=false;
  if(prediction.contact) {
    ghostMarker.visible=true;
    ghostMarker.position.set(prediction.contact.x,RADIUS+0.006,prediction.contact.z);
  }
  if(prediction.whiteAfter.length>=2) {
    setLine(deflectionLine,asVectors(prediction.whiteAfter,RADIUS+0.012));
    deflectionLine.visible=true;
  }
  if(prediction.objectAfter.length>=2) {
    setLine(objectLine,asVectors(prediction.objectAfter,RADIUS+0.008));
    objectLine.visible=true;
  }
}

function sound(strength=0.4,low=false) {
  if(!soundEnabled)return;
  const now=performance.now();if(now-lastSoundAt<45)return;lastSoundAt=now;
  try {
    audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume();
    const osc=audioContext.createOscillator();const gain=audioContext.createGain();
    osc.type=low?'triangle':'sine';
    osc.frequency.setValueAtTime(low?155:420,audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(low?65:170,audioContext.currentTime+.075);
    gain.gain.setValueAtTime(Math.min(.07,.015+strength*.017),audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.09);
    osc.connect(gain);gain.connect(audioContext.destination);
    osc.start();osc.stop(audioContext.currentTime+.1);
  }catch(_error){/* audio is optional */}
}

function shoot() {
  const cue=balls.find(b=>b.num===0);
  if(shotActive||!cue||!cue.active||match?.phase==='decision'||
     match?.phase==='finished'||!el.matchOverlay.hidden||!el.victoryOverlay.hidden||needsCuePlacement)return;
  if(match?.phase==='playing'&&match.callPocket&&!safetyCalled&&
     (!el.calledBall.value||chosenPocket===null)){
    setStatus('Annonce incomplète','Sélectionnez une bille et une poche, ou annoncez une sécurité.',false);
    return;
  }
  shotEvents=match?{firstContact:null,contactTime:null,railAfterContact:false,
    breakRailSet:new Set(),pocketed:[],scratch:false,
    remainingBefore:balls.filter(b=>b.active&&b.num>0).map(b=>b.num),
    calledBall:Number(el.calledBall.value)||null,calledPocket:chosenPocket,safety:safetyCalled,pushOut:match.mode==='nine'&&safetyCalled}:null;
  // Ball-in-hand stays adjustable until the cue is actually struck.
  if(match)match.ballInHand=null;
  placementMode=false;placementPointer=null;
  freezeFirstPersonShot(firstPerson,cue,aim);
  releaseAimMouse();
  shotActive=true;scratchedThisShot=false;pocketsThisShot=0;accumulator=0;
  el.cushionModel.disabled=true;
  shotSimTime=0;lastMetricsAt=0;
  shotCount++;
  const power=Number(el.powerSlider.value)/100;
  const shotSpeed=powerToCueSpeed(Number(el.powerSlider.value));
  const label=activeLabScenario?.title || 'JEU LIBRE';
  lastShotSnapshot={positions:balls.filter(b=>b.active).map(b=>({num:b.num,x:b.x,z:b.z})),
    aim:{...aim},spin:{...spin},power:Number(el.powerSlider.value),
    elevation:Number(el.elevationSlider.value),cushionModel:el.cushionModel.value,
    label,scenario:activeLabScenario};
  telemetry=new ShotTelemetry(balls,aim,label,{
    power:Number(el.powerSlider.value),tipX:spin.x,tipY:spin.y,
    elevation:Number(el.elevationSlider.value),cushionModel:el.cushionModel.value});
  el.labLoad.disabled=true;el.labReplay.disabled=true;el.labExport.disabled=true;
  el.labState.textContent='MESURE EN COURS';
  if(cueTrailLine)cueTrailLine.visible=false;
  if(objectTrailLine)objectTrailLine.visible=false;
  const impact=strikeBall(cue,aim,shotSpeed,spin,{elevation:Number(el.elevationSlider.value)});
  miscuedThisShot=impact.miscue;
  el.shootButton.disabled=true;el.shotState.textContent='EN MOUVEMENT';
  if(impact.miscue)setStatus('Fausse queue','Procédé trop loin du centre : perte de force et déviation brutale.',true);
  else setStatus('Billes en mouvement','Glissement, roulement et rotations calculés en temps réel.',true);
  updateCounters();updateVisuals();sound(power*(impact.miscue?0.5:2),!impact.miscue);
}

function pocketBall(b) {
  telemetry?.onPocket(b,shotSimTime+FIXED_STEP);
  if(shotEvents){
    const pockets=getPockets();
    let pocket=0,best=Infinity;
    for(let i=0;i<pockets.length;i++){
      const d=Math.hypot(b.x-pockets[i].x,b.z-pockets[i].z);
      if(d<best){pocket=i;best=d;}
    }
    shotEvents.pocketed.push({num:b.num,pocket});
    if(b.num===0)shotEvents.scratch=true;
  }
  // Capture is the single irreversible transition from planar motion to a
  // gravitational fall. Active balls never occupy a half-submerged state.
  const entryY=RADIUS;
  const fallingMesh=fallbackCtx?null:b.mesh.clone(true);
  if(fallingMesh){
    fallingMesh.position.set(b.x,entryY,b.z);
    scene.add(fallingMesh);
  }
  fallingBalls.push({mesh:fallingMesh,num:b.num,x:b.x,z:b.z,
    startY:entryY,y:entryY,elapsed:0});
  b.active=false;stopBall(b);b.mesh.visible=false;
  if(b.num===0) scratchedThisShot=true;
  else pocketsThisShot++;
  sound(0.6,true);
  updateCounters();
}

function settleShot() {
  shotActive=false;
  resetFirstPersonAim(firstPerson);
  if(cameraMode==='first-person')firstPerson.locked=true;
  el.cushionModel.disabled=false;
  telemetry?.record(balls,shotSimTime,true);
  updateLabMeasurements();
  syncTrailLines();
  el.labReplay.disabled=!lastShotSnapshot;
  el.labLoad.disabled=false;
  el.labExport.disabled=!telemetry;
  el.labState.textContent='MESURE TERMINÉE · REJOUABLE';
  if(match&&shotEvents){
    const adjudicate=match.mode==='nine'?adjudicateNineBall:adjudicateEightBall;
    match=adjudicate(match,{...shotEvents,breakRails:shotEvents.breakRailSet.size});
    if(match.mode==='nine'&&match.spotNine)spotObjectBall(9);
    shotEvents=null;
    chosenPocket=null;safetyCalled=false;
    el.calledBall.value='';
    needsCuePlacement=false;
    if(match.ballInHand)prepareCueInHand();
    const isWon=match.phase==='finished';
    setStatus(isWon?`Victoire du joueur ${match.winner+1}`:
      match.lastResult.kind==='foul'?'FAUTE':match.lastResult.kind==='decision'?'DÉCISION DE CASSE':
      `Joueur ${match.current+1} à la table`,match.lastResult.reason,false);
    el.shotState.textContent='PRÊT';
    refreshMatchUI();
    if(match.phase==='decision')openBreakDecision();
    if(isWon)showVictoryScreen();
  }else{
    const cue=balls.find(b=>b.num===0);
    if(cue&&!cue.active){
      const found=findCuePosition('anywhere');
      cue.x=found?.[0]??-.76;cue.z=found?.[1]??0;
      cue.active=true;cue.mesh.visible=true;stopBall(cue);
      cue.mesh.position.set(cue.x,RADIUS,cue.z);
    }
    if(scratchedThisShot)setStatus('Blanche empochée','Blanche replacée pour poursuivre le laboratoire.',false);
    else setStatus('Essai terminé','Les billes sont immobiles. Vous pouvez rejouer.',false);
    el.shootButton.disabled=false;el.shotState.textContent='PRÊT';
  }
  setSpin(0,0);
}

function physicsStep(dt) {
  const hasMotion=simulatePhysics(balls,dt,{
    cushionModel:el.cushionModel.value,
    onPocket:pocketBall,
    onRailContact:(ball,_speed,time)=>{
      if(shotEvents){
        if(ball.num>0)shotEvents.breakRailSet.add(ball.num);
        if(shotEvents.firstContact!==null &&
           shotSimTime+(time??dt)+1e-8>=shotEvents.contactTime)
          shotEvents.railAfterContact=true;
      }
    },
    onCushion:(_ball,speed)=>{telemetry?.onCushion();sound(Math.min(2,speed));},
    onBallContact:(a,b,_speed,time)=>{
      if(shotEvents&&shotEvents.firstContact===null){
        if(a.num===0&&b.num>0){shotEvents.firstContact=b.num;shotEvents.contactTime=shotSimTime+(time??dt);}
        else if(b.num===0&&a.num>0){shotEvents.firstContact=a.num;shotEvents.contactTime=shotSimTime+(time??dt);}
      }
    },
    onCollision:(a,b,speed,time)=>{
      telemetry?.onCollision(a,b,shotSimTime+(time??dt));
      sound(Math.min(2,speed));
    }
  });
  shotSimTime+=dt;
  telemetry?.record(balls,shotSimTime);
  if(shotSimTime-lastMetricsAt>=0.10) {
    lastMetricsAt=shotSimTime;
    updateLabMeasurements();syncTrailLines();
  }
  for(const b of balls) {
    if(!b.active)continue;
    const angle=Math.hypot(b.rotX,b.rotY,b.rotZ);
    if(angle>1e-9) {
      ballRotationAxis.set(b.rotX/angle,b.rotY/angle,b.rotZ/angle);
      ballRotationQuaternion.setFromAxisAngle(ballRotationAxis,angle);
      b.mesh.quaternion.premultiply(ballRotationQuaternion);
    }
    b.rotX=b.rotY=b.rotZ=0;
    b.mesh.position.set(b.x,RADIUS,b.z);
  }
  if(shotActive&&!hasMotion)settleShot();
}

function updateCamera() {
  el.firstPersonSettings.hidden=cameraMode!=='first-person'||!!fallbackCtx;
  const fov=cameraMode==='first-person'?Number(el.firstPersonFovSlider.value):40;
  if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
  if(cameraMode==='first-person') {
    const cue=balls.find(b=>b.num===0);
    if(!cue)return;
    const pose=currentFirstPersonPose(firstPerson,cue,aim,shotActive,{
      height:Number(el.firstPersonHeightSlider.value)/100,
      setback:Number(el.firstPersonSetbackSlider.value)/100
    });
    camera.position.set(pose.position.x,pose.position.y,pose.position.z);
    camera.up.set(0,1,0);
    camera.lookAt(pose.target.x,pose.target.y,pose.target.z);
    return;
  }
  if(orbit.topDown) {
    camera.position.set(orbit.targetX,orbit.distance,orbit.targetZ+0.001);
    camera.up.set(0,0,-1);
  } else {
    const horizontal=orbit.distance*Math.cos(orbit.elevation);
    camera.position.set(orbit.targetX+horizontal*Math.sin(orbit.azimuth),orbit.distance*Math.sin(orbit.elevation),orbit.targetZ+horizontal*Math.cos(orbit.azimuth));
    camera.up.set(0,1,0);
  }
  camera.lookAt(orbit.targetX,0,orbit.targetZ);
}

function forcePlacementCamera() {
  releaseAimMouse();
  if(fallbackCtx)return;
  if(cameraMode!=='overhead') {
    cameraMode='overhead';orbit.topDown=true;
    orbit.targetX=0;orbit.targetZ=0;orbit.distance=3.97;
    firstPerson.previousX=null;firstPerson.previousY=null;
  }
  el.cameraName.textContent='DESSUS';
  updateCamera();
}

function releaseAimMouse() {
  firstPerson.locked=true;
  if(document.pointerLockElement===el.gameCanvas)document.exitPointerLock();
}

function captureAimMouse() {
  if(cameraMode!=='first-person'||shotActive||placementMode||needsCuePlacement||
    !el.matchOverlay.hidden||!el.decisionOverlay.hidden||!el.victoryOverlay.hidden)return;
  firstPerson.locked=true;
  if(!el.gameCanvas.requestPointerLock){refreshPlacementUI();return;}
  try{
    Promise.resolve(el.gameCanvas.requestPointerLock()).catch(()=>{firstPerson.locked=true;refreshPlacementUI();});
  }catch(_error){firstPerson.locked=true;refreshPlacementUI();}
}

function toggleCamera() {
  if(fallbackCtx)return;
  if(placementMode||needsCuePlacement||placementPointer){forcePlacementCamera();return;}
  const modes=['perspective','overhead','first-person'];
  releaseAimMouse();
  cameraMode=modes[(modes.indexOf(cameraMode)+1)%modes.length];
  orbit.topDown=cameraMode==='overhead';
  firstPerson.previousX=null;firstPerson.previousY=null;
  el.cameraName.textContent=cameraMode==='first-person'?'PREMIÈRE PERSONNE':orbit.topDown?'DESSUS':'PERSPECTIVE';
  updateCamera();updateVisuals();
  if(cameraMode==='first-person')captureAimMouse();
}

function updateAimAt(clientX,clientY) {
  if(cameraMode==='first-person')return;
  const cue=balls.find(b=>b.num===0);if(!cue||!cue.active||shotActive)return;
  const hit=tablePointAt(clientX,clientY);
  if(!hit)return;
  const dx=hit.x-cue.x,dz=hit.z-cue.z;
  const dist=Math.hypot(dx,dz);
  if(dist>0.06){aim.x=dx/dist;aim.z=dz/dist;updateVisuals();}
}

function tablePointAt(clientX,clientY) {
  const bounds=el.gameCanvas.getBoundingClientRect();
  if(fallbackCtx) {
    const g=fallbackGeometry();
    return {x:(clientX-bounds.left-g.cx)/g.scale,z:(clientY-bounds.top-g.cy)/g.scale};
  }
  pointer.set((clientX-bounds.left)/bounds.width*2-1,-((clientY-bounds.top)/bounds.height*2-1));
  raycaster.setFromCamera(pointer,camera);
  const hit=new THREE.Vector3();
  return raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-RADIUS),hit)
    ? {x:hit.x,z:hit.z}:null;
}

function breakPlacementAvailable() {
  return !shotActive && match?.phase==='break' && shotCount===0 && balls.length===(match.mode==='nine'?10:16);
}

function cuePlacementAvailable() {
  return breakPlacementAvailable()||Boolean(!shotActive&&match?.phase==='playing'&&match.ballInHand);
}

function refreshPlacementUI() {
  if(placementMode||needsCuePlacement||placementPointer)forcePlacementCamera();
  const available=cuePlacementAvailable();
  const headOnly=breakPlacementAvailable()||match?.ballInHand==='head';
  el.placeCueButton.hidden=!available;
  el.placementQuick.hidden=!breakPlacementAvailable();
  el.placeCueButton.classList.toggle('active',available&&placementMode);
  el.placeCueButton.textContent=needsCuePlacement?'PLACEMENT OBLIGATOIRE':
    placementMode?'ANNULER PLACEMENT':match?.phase==='playing'&&match.ballInHand?
      'REPLACER LA BLANCHE':'PLACER LA BLANCHE';
  el.sceneHint.textContent=available
    ? placementMode?(headOnly?'CLIQUEZ DANS LA ZONE VERTE POUR POSITIONNER LA BLANCHE':
      'POSITIONNEZ LA BLANCHE LIBREMENT SUR LE TAPIS'):
      (match?.phase==='playing'&&match.ballInHand?
        'BLANCHE EN MAIN : REPLACEMENT LIBRE JUSQU’AU TIR · MOLETTE ENFONCÉE : DÉPLACER':
        'GLISSEZ LA BLANCHE · MOLETTE ENFONCÉE : DÉPLACER · DÉFILER : ZOOM · F : PLEIN ÉCRAN')
    : fallbackCtx?'VISER À LA SOURIS · MODE 2D DE SECOURS':
      'VISER À LA SOURIS · CLIC DROIT : TOURNER · MOLETTE ENFONCÉE : DÉPLACER · DÉFILER : ZOOM · F : PLEIN ÉCRAN';
  el.aimMouseButton.hidden=cameraMode!=='first-person'||document.pointerLockElement===el.gameCanvas;
  el.aimMouseButton.disabled=shotActive;
  if(cameraMode==='first-person') {
    el.cameraName.textContent=`PREMIÈRE PERSONNE · ${firstPerson.fine?'FINE':'NORMALE'} · ${document.pointerLockElement===el.gameCanvas?'VISÉE ACTIVE':'SOURIS LIBRE'}`;
    if(!placementMode&&!needsCuePlacement)el.sceneHint.textContent=shotActive?
      'CAMÉRA FIXE AU POINT DE TIR · V : CHANGER DE VUE':
      document.pointerLockElement===el.gameCanvas?
      'SOURIS ↔ : VISER · ↕ : HAUTEUR · CLIC DROIT : PRÉCISION · CLIC GAUCHE / ÉCHAP : LIBÉRER LA SOURIS':
      'VISÉE FIGÉE · RÉGLEZ LE COUP · CLIQUEZ SUR LA TABLE OU REPRENDRE LA VISÉE POUR VISER';
  }
  if(placementZone) {
    placementZone.visible=available&&headOnly;
    placementZone.material.opacity=placementMode ? 0.20 : 0.11;
  }
  if(headStringLine)headStringLine.visible=available&&headOnly;
}

function moveCueTo(x,z,clamp=false) {
  const cue=balls.find(b=>b.num===0);
  if(!cue||!cuePlacementAvailable())return false;
  const headOnly=breakPlacementAvailable()||match?.ballInHand==='head';
  const target=clamp?(headOnly?clampBreakPosition(x,z):clampFreePosition(x,z)):{x,z};
  const allowed=headOnly?canPlaceBreakCue:canPlaceFreeCue;
  if(!target||!allowed(target.x,target.z,balls)) {
    setStatus('Position interdite',headOnly?
      'La blanche doit rester derrière la ligne de tête, sans toucher une autre bille.':
      'La blanche doit rester sur le tapis sans toucher d’autre bille.',false);
    return false;
  }
  cue.x=target.x;cue.z=target.z;
  boardRevision++;
  cue.mesh.position.set(cue.x,RADIUS,cue.z);
  // A lateral reposition must not leave the previous straight-ahead aim.
  // Align with the rack's apex, then let the player refine the shot freely.
  const apex=headOnly?balls.find(b=>b.num===1):null;
  if(apex) {
    const dx=apex.x-cue.x,dz=apex.z-cue.z;
    const distance=Math.hypot(dx,dz);
    if(distance>0){aim={x:dx/distance,z:dz/distance};}
  }
  setStatus('Blanche repositionnée','Position validée sur le tapis. Ajustez votre visée.',false);
  updateVisuals();
  return true;
}

function setSpin(x,y) {
  const len=Math.hypot(x,y);if(len>0.98){x=x/len*0.98;y=y/len*0.98;}
  spin={x,y};
  el.spinDot.style.left=`${50+x*50}%`;
  el.spinDot.style.top=`${50-y*50}%`;
  el.spinCoords.textContent=`${x.toFixed(2)} / ${y.toFixed(2)}`;
  let name='BILLE CENTRÉE';
  if(Math.abs(x)>0.22&&Math.abs(y)>0.22)name=(y>0?'COULÉ + ':'RÉTRO + ')+(x>0?'EFFET DROIT':'EFFET GAUCHE');
  else if(Math.abs(y)>0.22)name=y>0?'COULÉ':'RÉTRO';
  else if(Math.abs(x)>0.22)name=x>0?'EFFET DROIT':'EFFET GAUCHE';
  el.spinType.textContent=name;
  updatePowerReadout();
  updateVisuals();
}

function bindControls() {
  bindCalibration();
  el.aimMouseButton.addEventListener('click',captureAimMouse);
  document.addEventListener('pointerlockchange',()=>{
    if(document.pointerLockElement===el.gameCanvas&&(cameraMode!=='first-person'||shotActive||placementMode||needsCuePlacement||
      !el.matchOverlay.hidden||!el.decisionOverlay.hidden||!el.victoryOverlay.hidden))releaseAimMouse();
    firstPerson.locked=document.pointerLockElement!==el.gameCanvas;
    if(!firstPerson.locked)el.gameCanvas.focus({preventScroll:true});
    refreshPlacementUI();
  });
  document.addEventListener('pointerlockerror',()=>{firstPerson.locked=true;refreshPlacementUI();});
  window.addEventListener('blur',releaseAimMouse);
  document.addEventListener('mousemove',e=>{
    if(document.pointerLockElement!==el.gameCanvas||cameraMode!=='first-person'||shotActive||
      placementMode||needsCuePlacement||!el.matchOverlay.hidden||!el.decisionOverlay.hidden||!el.victoryOverlay.hidden)return;
    aim=rotateFirstPersonAim(firstPerson,aim,e.movementX);
    el.firstPersonHeightSlider.value=String(adjustFirstPersonHeight(firstPerson,Number(el.firstPersonHeightSlider.value),e.movementY));
    el.firstPersonHeightSlider.dispatchEvent(new Event('input'));
    updateVisuals();
  });
  const refreshModeChoice=()=>{
    const nine=document.querySelector('input[name=gameMode]:checked')?.value==='nine';
    el.requireCall.disabled=nine;
    el.requireCall.closest('label').hidden=nine;
    document.querySelectorAll('input[name=gameMode]').forEach(input=>input.closest('label').classList.toggle('selected',input.checked));
  };
  document.querySelectorAll('input[name=gameMode]').forEach(input=>input.addEventListener('change',refreshModeChoice));
  refreshModeChoice();
  el.pushOutButton.addEventListener('click',()=>{
    if(shotActive||match?.mode!=='nine'||!match.pushOutAvailable)return;
    safetyCalled=!safetyCalled;refreshMatchUI();
  });
  el.startMatch.addEventListener('click',startMatch);
  el.victoryNewMatch.addEventListener('click',showMatchSetup);
  el.victoryInspect.addEventListener('click',()=>{
    el.victoryOverlay.hidden=true;
    el.resetButton.focus();
  });
  el.calledBall.addEventListener('change',()=>{safetyCalled=false;refreshCallUI();});
  el.calledPockets.querySelectorAll('button').forEach(button=>{
    button.addEventListener('click',()=>{
      chosenPocket=Number(button.dataset.pocket);safetyCalled=false;refreshCallUI();
    });
  });
  el.safetyButton.addEventListener('click',()=>{safetyCalled=!safetyCalled;refreshCallUI();});
  el.gameCanvas.addEventListener('contextmenu',e=>e.preventDefault());
  el.gameCanvas.addEventListener('auxclick',e=>{if(e.button===1)e.preventDefault();});
  el.gameCanvas.addEventListener('pointerdown',e=>{
    el.gameCanvas.focus({preventScroll:true});
    if(cameraMode==='first-person') {
      firstPerson.previousX=e.clientX;firstPerson.previousY=e.clientY;
      if(e.button===2){
        e.preventDefault();
        if(!shotActive){firstPerson.fine=!firstPerson.fine;refreshPlacementUI();}
        return;
      }
      if(e.button===1)return;
      if(e.button===0&&!placementMode&&!needsCuePlacement){
        if(document.pointerLockElement===el.gameCanvas)releaseAimMouse();
        else captureAimMouse();
        refreshPlacementUI();
        return;
      }
    }
    if(e.button===2||e.button===1){
      orbit.dragMode=e.button===2?'rotate':'pan';orbit.pointerId=e.pointerId;
      orbit.x=e.clientX;orbit.y=e.clientY;
      el.gameCanvas.setPointerCapture(e.pointerId);
      el.gameCanvas.style.cursor='grabbing';
      e.preventDefault();
    }
    else if(e.button===0&&cuePlacementAvailable()) {
      const target=tablePointAt(e.clientX,e.clientY);
      const cue=balls.find(b=>b.num===0);
      const grabbing=target&&cue&&Math.hypot(target.x-cue.x,target.z-cue.z)<.075;
      if(placementMode||grabbing) {
        if(!grabbing&&!moveCueTo(target?.x,target?.z))return;
        placementPointer={id:e.pointerId,
          offsetX:grabbing?cue.x-target.x:0,offsetZ:grabbing?cue.z-target.z:0};
        forcePlacementCamera();
        const overheadPoint=tablePointAt(e.clientX,e.clientY);
        if(grabbing&&overheadPoint){
          placementPointer.offsetX=cue.x-overheadPoint.x;
          placementPointer.offsetZ=cue.z-overheadPoint.z;
        }
        el.gameCanvas.setPointerCapture(e.pointerId);
        el.gameCanvas.style.cursor='grabbing';
        return;
      }
      updateAimAt(e.clientX,e.clientY);
    }else updateAimAt(e.clientX,e.clientY);
  });
  el.gameCanvas.addEventListener('pointerleave',()=>{firstPerson.previousX=null;firstPerson.previousY=null;});
  el.gameCanvas.addEventListener('pointermove',e=>{
    if(cameraMode==='first-person'&&!placementMode&&!needsCuePlacement&&!placementPointer)return;
    if(placementPointer&&placementPointer.id===e.pointerId){
      const point=tablePointAt(e.clientX,e.clientY);
      if(point)moveCueTo(point.x+placementPointer.offsetX,point.z+placementPointer.offsetZ,true);
    }else if(orbit.dragMode&&orbit.pointerId===e.pointerId){
      if(orbit.dragMode==='pan'){
        if(fallbackCtx){
          const scale=fallbackGeometry().scale;
          orbit.targetX-=(e.clientX-orbit.x)/scale;
          orbit.targetZ-=(e.clientY-orbit.y)/scale;
        }else{
          panCameraTarget(orbit,e.clientX-orbit.x,e.clientY-orbit.y,el.gameCanvas.clientHeight,camera.fov);
          updateCamera();
        }
      }else if(!orbit.topDown){
        orbit.azimuth-=(e.clientX-orbit.x)*0.006;
        orbit.elevation=Math.max(0.22,Math.min(1.45,orbit.elevation+(e.clientY-orbit.y)*0.005));
        updateCamera();
      }
      orbit.x=e.clientX;orbit.y=e.clientY;
    }else {
      const point=cuePlacementAvailable()?tablePointAt(e.clientX,e.clientY):null;
      const cue=balls.find(b=>b.num===0);
      const hoveringCue=point&&cue&&Math.hypot(point.x-cue.x,point.z-cue.z)<.075;
      el.gameCanvas.style.cursor=placementMode||hoveringCue?'grab':'crosshair';
      if(!placementMode)updateAimAt(e.clientX,e.clientY);
    }
  });
  const releasePointer=e=>{
    if(orbit.pointerId===e.pointerId){orbit.dragMode=null;orbit.pointerId=null;}
    if(placementPointer?.id===e.pointerId){
      placementPointer=null;placementMode=false;
      if(needsCuePlacement&&e.type==='pointerup'){
        needsCuePlacement=false;
        refreshMatchUI();
      }
      if(needsCuePlacement&&e.type==='pointercancel')placementMode=true;
      refreshPlacementUI();
    }
    el.gameCanvas.style.cursor='crosshair';
  };
  el.gameCanvas.addEventListener('pointerup',releasePointer);
  el.gameCanvas.addEventListener('pointercancel',releasePointer);
  el.placeCueButton.addEventListener('click',()=>{
    if(!cuePlacementAvailable()||needsCuePlacement)return;
    placementMode=!placementMode;
    refreshPlacementUI();
  });
  el.placementQuick.querySelectorAll('[data-cue-z]').forEach(button=>{
    button.addEventListener('click',()=>{
      if(!breakPlacementAvailable())return;
      forcePlacementCamera();
      moveCueTo(-.93,Number(button.dataset.cueZ));
      placementMode=false;
      refreshPlacementUI();
    });
  });
  el.gameCanvas.addEventListener('wheel',e=>{e.preventDefault();if(cameraMode==='first-person')return;zoomCamera(orbit,e.deltaY,e.deltaMode);updateCamera();},{passive:false});
  let spinning=false;
  const spinFromPointer=e=>{
    const rect=el.spinPad.getBoundingClientRect();
    setSpin(((e.clientX-rect.left)/rect.width-.5)*2, -((e.clientY-rect.top)/rect.height-.5)*2);
  };
  el.spinPad.addEventListener('pointerdown',e=>{spinning=true;el.spinPad.setPointerCapture(e.pointerId);spinFromPointer(e);});
  el.spinPad.addEventListener('pointermove',e=>{if(spinning)spinFromPointer(e);});
  el.spinPad.addEventListener('pointerup',()=>{spinning=false;});
  el.spinPad.addEventListener('pointercancel',()=>{spinning=false;});
  el.spinPad.addEventListener('keydown',e=>{
    const delta={ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,.05],ArrowDown:[0,-.05]}[e.key];
    if(delta){e.preventDefault();setSpin(spin.x+delta[0],spin.y+delta[1]);}
    if(e.key==='Home'){e.preventDefault();setSpin(0,0);}
  });
  el.spinReset.addEventListener('click',()=>setSpin(0,0));
  el.powerSlider.addEventListener('input',()=>setPower(el.powerSlider.value));
  el.breakPreset.addEventListener('click',()=>{setPower(100);setSpin(0,0);setElevation(0);});
  const updateFirstPersonZoom=()=>{
    const value=Number(el.firstPersonFovSlider.value);
    el.firstPersonFovValue.textContent=`${value}°`;
    const filled=(value-35)/50*100;
    el.firstPersonFovSlider.style.background=`linear-gradient(to right,var(--accent) ${filled}%,#35443e ${filled}%)`;
    if(cameraMode==='first-person')updateCamera();
  };
  el.firstPersonFovSlider.addEventListener('input',updateFirstPersonZoom);
  el.firstPersonFovReset.addEventListener('click',()=>{el.firstPersonFovSlider.value='60';updateFirstPersonZoom();});
  const updateFirstPersonPosition=()=>{
    for(const [slider,label,min,max] of [
      [el.firstPersonHeightSlider,el.firstPersonHeightValue,12,50],
      [el.firstPersonSetbackSlider,el.firstPersonSetbackValue,30,110]
    ]){
      const value=Number(slider.value);
      label.textContent=`${value.toLocaleString('fr-FR',{maximumFractionDigits:1})} cm`;
      const filled=(value-min)/(max-min)*100;
      slider.style.background=`linear-gradient(to right,var(--accent) ${filled}%,#35443e ${filled}%)`;
    }
    if(cameraMode==='first-person')updateCamera();
  };
  el.firstPersonHeightSlider.addEventListener('input',updateFirstPersonPosition);
  el.firstPersonSetbackSlider.addEventListener('input',updateFirstPersonPosition);
  el.firstPersonPositionReset.addEventListener('click',()=>{
    el.firstPersonHeightSlider.value='23';el.firstPersonSetbackSlider.value='52';updateFirstPersonPosition();
  });
  updateFirstPersonPosition();
  updateFirstPersonZoom();
  el.elevationSlider.addEventListener('input',()=>setElevation(el.elevationSlider.value));
  el.shootButton.addEventListener('click',shoot);
  el.resetButton.addEventListener('click',showMatchSetup);
  el.labLoad.addEventListener('click',loadLabScenario);
  el.labReplay.addEventListener('click',replayLastShot);
  el.labExport.addEventListener('click',exportLabCSV);
  el.showTraces.addEventListener('change',syncTrailLines);
  el.viewButton.addEventListener('click',toggleCamera);
  el.aimAssist.addEventListener('change',updateVisuals);
  el.cushionModel.addEventListener('change',()=>{
    if(shotActive)return;
    previewKey='';previewCache=null;
    calibrationResults=null;
    el.calibrationStats.textContent='Calcul non effectué pour ce modèle.';
    el.calibrationRows.replaceChildren();
    el.calibrationExport.disabled=true;
    el.calibrationHeading.textContent=el.cushionModel.value==='empirical'?
      'Banc de calibration.':el.cushionModel.value==='compliant'?
        'Banc de calibration · contact expérimental v0.18.':
      el.cushionModel.value==='compliant-tuned'?
        'Banc de calibration · ajustement provisoire v0.19.':
      el.cushionModel.value==='coupled-3d'?
        'Banc de calibration · contact 3D couplé v0.20.':
        'Banc de calibration · ajustement 3D prudent v0.21.';
    updateVisuals();
  });
  el.audioToggle.addEventListener('click',()=>{soundEnabled=!soundEnabled;el.audioLabel.textContent=soundEnabled?'ON':'OFF';});
  el.gameCanvas.closest('.scene-frame').querySelector('.shot-dock').addEventListener('toggle',()=>requestAnimationFrame(resize));
  el.fullscreenButton.addEventListener('click',()=>{
    toggleSceneFullscreen(el.gameCanvas.closest('.scene-frame'),document).finally(()=>{requestAnimationFrame(resize);el.gameCanvas.focus();});
  });
  document.addEventListener('fullscreenchange',()=>requestAnimationFrame(resize));
  window.addEventListener('keydown',e=>{
    const stage=el.gameCanvas.closest('.scene-frame');
    if(!el.matchOverlay.hidden||!el.decisionOverlay.hidden||!el.victoryOverlay.hidden)return;
    if(e.key==='Escape'&&document.pointerLockElement===el.gameCanvas){releaseAimMouse();return;}
    if(e.key==='Escape'&&stage.classList.contains(IMMERSIVE_CLASS)){
      stage.classList.remove(IMMERSIVE_CLASS);
      requestAnimationFrame(resize);
      e.preventDefault();
      return;
    }
    if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement||e.target instanceof HTMLTextAreaElement||
      e.target instanceof HTMLButtonElement||e.target?.isContentEditable)return;
    if(isFullscreenShortcut(e)){
      e.preventDefault();
      toggleSceneFullscreen(stage,document).finally(()=>requestAnimationFrame(resize));
      return;
    }
    if(e.code==='Space'){e.preventDefault();shoot();}
    if(e.key.toLowerCase()==='v')toggleCamera();
    if(e.key.toLowerCase()==='h'){el.aimAssist.checked=!el.aimAssist.checked;updateVisuals();}
  });
}

function resize() {
  const w=el.gameCanvas.clientWidth,h=el.gameCanvas.clientHeight;
  if(w<1||h<1)return;
  if(fallbackCtx) {
    const dpr=Math.min(window.devicePixelRatio||1,2);
    el.gameCanvas.width=Math.round(w*dpr);el.gameCanvas.height=Math.round(h*dpr);
    fallbackCtx.setTransform(dpr,0,0,dpr,0,0);
    return;
  }
  if(!renderer)return;
  renderer.setSize(w,h,false);
  camera.aspect=w/h;camera.updateProjectionMatrix();
}

function animate(t) {
  const delta=Math.min(MAX_DT,(t-lastFrame)/1000);lastFrame=t;
  if(shotActive){accumulator+=delta;let iterations=0;while(accumulator>=FIXED_STEP&&iterations++<20){physicsStep(FIXED_STEP);accumulator-=FIXED_STEP;}}
  for(let i=fallingBalls.length-1;i>=0;i--){
    const fall=fallingBalls[i];
    fall.elapsed+=delta;
    fall.y=fall.startY-.5*9.81*fall.elapsed*fall.elapsed;
    if(fall.mesh)fall.mesh.position.y=fall.y;
    if(fall.y<-.32||fall.elapsed>.5){
      if(fall.mesh)scene.remove(fall.mesh);
      fallingBalls.splice(i,1);
    }
  }
  if(shotActive&&t-lastAimVisualTime>200){lastAimVisualTime=t;updateVisuals();}
  if(fallbackCtx)drawFallback();
  else renderer.render(scene,camera);
}

function fallbackGeometry() {
  const w=el.gameCanvas.clientWidth,h=el.gameCanvas.clientHeight;
  const scale=Math.min((w-46)/(LENGTH*2+0.32),(h-60)/(WIDTH*2+0.32))*3.97/orbit.distance;
  return {w,h,cx:w/2-orbit.targetX*scale,cy:h/2-orbit.targetZ*scale,scale};
}

function outlineTournamentCloth(ctx) {
  ctx.beginPath();
  tableClothBoundary(LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,getPockets(),36,.0012)
    .forEach(([x,z],i)=>i===0?ctx.moveTo(x,z):ctx.lineTo(x,z));
  ctx.closePath();
}

function drawFallback() {
  const ctx=fallbackCtx;
  const {w,h,cx,cy,scale}=fallbackGeometry();
  ctx.clearRect(0,0,w,h);
  const bg=ctx.createRadialGradient(cx,cy,20,cx,cy,Math.max(w,h)*0.65);
  bg.addColorStop(0,'#243840');bg.addColorStop(1,'#0a1418');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.translate(cx,cy);ctx.scale(scale,scale);

  ctx.shadowColor='#000b';ctx.shadowBlur=20/scale;ctx.shadowOffsetY=12/scale;
  ctx.fillStyle='#0b1013';ctx.fillRect(-LENGTH-.16,-WIDTH-.16,LENGTH*2+.32,WIDTH*2+.32);
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  ctx.strokeStyle='#77878d';ctx.lineWidth=.009;ctx.strokeRect(-LENGTH-.15,-WIDTH-.15,LENGTH*2+.30,WIDTH*2+.30);
  const cap=ctx.createLinearGradient(0,-WIDTH-.15,0,-WIDTH);
  cap.addColorStop(0,'#263741');cap.addColorStop(.47,'#1d2b32');cap.addColorStop(.83,'#172127');cap.addColorStop(1,'#11191e');
  ctx.fillStyle=cap;ctx.fillRect(-LENGTH-.145,-WIDTH-.145,LENGTH*2+.29,WIDTH*2+.29);
  ctx.strokeStyle='#84959a';ctx.lineWidth=.0028;ctx.strokeRect(-LENGTH-.138,-WIDTH-.138,LENGTH*2+.276,WIDTH*2+.276);
  ctx.strokeStyle='#0f222b';ctx.lineWidth=.007;ctx.strokeRect(-LENGTH-.065,-WIDTH-.065,LENGTH*2+.13,WIDTH*2+.13);
  // Six jaw-aligned recessed wells. The fallback previously used full dark
  // circles extending as far as 80 mm onto the playing surface, unlike WebGL.
  for(const pocket of getPockets()) {
    const outline=pocketWellOutline(pocket,CORNER_CUT,SIDE_CUT);
    const gradient=ctx.createLinearGradient(pocket.x,pocket.z,
      pocket.x+(pocket.sx||0)*.08,pocket.z+pocket.sz*.12);
    gradient.addColorStop(0,'#09151a');gradient.addColorStop(.45,'#03080b');
    gradient.addColorStop(1,'#111a20');
    ctx.beginPath();outline.forEach(([x,z],i)=>i===0?ctx.moveTo(x,z):ctx.lineTo(x,z));
    ctx.closePath();ctx.fillStyle=gradient;ctx.fill();
  }
  const cloth=ctx.createLinearGradient(-LENGTH,-WIDTH,LENGTH,WIDTH);
  cloth.addColorStop(0,'#1f90ba');cloth.addColorStop(.48,'#087caa');cloth.addColorStop(1,'#076389');
  outlineTournamentCloth(ctx);ctx.fillStyle=cloth;ctx.fill();
  // The old 24 mm outline darkened 12 mm of felt around every opening in
  // Canvas2D, visually recreating an oversized pocket even after fixing the
  // actual mesh. Keep only a narrow textile edge seam.
  ctx.strokeStyle='#074d70';ctx.lineWidth=.006;ctx.stroke();
  if(cuePlacementAvailable()&&(breakPlacementAvailable()||match?.ballInHand==='head')) {
    ctx.fillStyle=placementMode?'#b9ea8950':'#b9ea892b';
    ctx.fillRect(-LENGTH,-WIDTH,LENGTH+HEAD_STRING_X,2*WIDTH);
    ctx.beginPath();ctx.setLineDash([.026,.015]);ctx.moveTo(HEAD_STRING_X,-WIDTH);
    ctx.lineTo(HEAD_STRING_X,WIDTH);ctx.strokeStyle='#d0e9b6';ctx.lineWidth=.008;
    ctx.stroke();ctx.setLineDash([]);
    ctx.font='500 .025px Arial';ctx.textAlign='center';ctx.fillStyle='#d6efc5';
    ctx.fillText('ZONE DE CASSE',(-LENGTH+HEAD_STRING_X)/2,-WIDTH+.075);
  }
  // Same rubber facings as the 3D meshes and the collision engine.
  ctx.lineCap='round';ctx.lineWidth=.013;ctx.strokeStyle='#075375';
  for(const face of getCushionSegments()) {
    if(face.kind!=='facing')continue;
    ctx.beginPath();ctx.moveTo(face.x0,face.z0);ctx.lineTo(face.x1,face.z1);ctx.stroke();
  }
  // Inlaid mother-of-pearl diamond sights: six on each long rail, three on each end.
  ctx.fillStyle='#d8e3e6';
  const sight=(x,z,turn=false)=>{
    ctx.save();ctx.translate(x,z);if(turn)ctx.rotate(Math.PI/2);
    ctx.beginPath();ctx.moveTo(-.014,0);ctx.lineTo(0,-.0055);ctx.lineTo(.014,0);ctx.lineTo(0,.0055);ctx.closePath();ctx.fill();ctx.restore();
  };
  for(const side of [-1,1]) {
    for(const x of [-.9525,-.635,-.3175,.3175,.635,.9525])sight(x,side*(WIDTH+.092));
    for(const z of [-.3175,0,.3175])sight(side*(LENGTH+.092),z,true);
  }
  // Simple flush nameplate on the spectator side.
  ctx.fillStyle='#c7d2d3';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='700 .040px Arial';ctx.fillText('FRAME',0,WIDTH+.116);
  ctx.fillStyle='#657b85';ctx.font='500 .017px Arial';ctx.fillText('TOURNAMENT SERIES  /  9 FT',0,WIDTH+.139);
  for(const sideX of [-1,1])for(const sideZ of [-1,1]) {
    ctx.fillStyle='#566168';ctx.fillRect(sideX<0?-LENGTH-.13:LENGTH+.065,sideZ<0?-WIDTH-.145:WIDTH+.065,.065,.080);
  }

  // The same sampled positions are rendered in the WebGL and Canvas2D paths.
  if(el.showTraces.checked&&telemetry) {
    for(const [num,color] of [[0,'#b1e586'],[telemetry.firstObject,'#ffd185']]) {
      const path=telemetry.points.get(num);
      if(!path||path.length<2)continue;
      ctx.strokeStyle=color;ctx.lineWidth=.006;ctx.globalAlpha=.88;ctx.lineCap='round';
      ctx.beginPath();ctx.moveTo(path[0].x,path[0].z);
      for(let i=1;i<path.length;i++)ctx.lineTo(path[i].x,path[i].z);
      ctx.stroke();ctx.globalAlpha=1;
    }
  }

  const cue=balls.find(b=>b.num===0);
  if(cue&&cue.active&&!shotActive) {
    if(el.aimAssist.checked) {
      const prediction=trajectoryPreview();
      const drawPrediction=(points,color,dashes,width)=>{
        if(!points||points.length<2)return;
        ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dashes);
        ctx.beginPath();ctx.moveTo(points[0].x,points[0].z);
        for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].z);
        ctx.stroke();ctx.setLineDash([]);
      };
      if(prediction) {
        drawPrediction(prediction.before,'#dbefc5',[.037,.024],.005);
        drawPrediction(prediction.whiteAfter,'#a6dd7a',[.02,.012],.006);
        drawPrediction(prediction.objectAfter,'#f6cc8d',[.03,.02],.006);
        if(prediction.contact) {
          ctx.beginPath();ctx.arc(prediction.contact.x,prediction.contact.z,RADIUS,0,Math.PI*2);
          ctx.lineWidth=.004;ctx.strokeStyle='#c8ee9d';ctx.stroke();
        }
      }
    }
    ctx.save();ctx.translate(-aim.z*spin.x*.62*RADIUS,aim.x*spin.x*.62*RADIUS);
    ctx.strokeStyle='#172329';ctx.lineWidth=.024;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(cue.x-aim.x*.052,cue.z-aim.z*.052);ctx.lineTo(cue.x-aim.x*1.35,cue.z-aim.z*1.35);ctx.stroke();
    ctx.strokeStyle='#dcc89b';ctx.lineWidth=.015;ctx.beginPath();ctx.moveTo(cue.x-aim.x*.052,cue.z-aim.z*.052);ctx.lineTo(cue.x-aim.x*.9,cue.z-aim.z*.9);ctx.stroke();
    ctx.strokeStyle='#273638';ctx.lineWidth=.026;ctx.beginPath();ctx.moveTo(cue.x-aim.x*.91,cue.z-aim.z*.91);ctx.lineTo(cue.x-aim.x*1.31,cue.z-aim.z*1.31);ctx.stroke();
    ctx.restore();
  }

  for(const b of balls) {
    if(!b.active)continue;
    const r=RADIUS;
    ctx.beginPath();ctx.arc(b.x+r*.12,b.z+r*.16,r*1.1,0,Math.PI*2);ctx.fillStyle='#00111777';ctx.fill();
    const grad=ctx.createRadialGradient(b.x-r*.35,b.z-r*.42,r*.05,b.x,b.z,r*1.25);
    grad.addColorStop(0,'#ffffff');grad.addColorStop(.13,b.num===0?'#f7f7ef':BALL_COLORS[b.num]);
    grad.addColorStop(.7,b.num===0?'#d2d9d3':BALL_COLORS[b.num]);grad.addColorStop(1,'#101c1d');
    ctx.fillStyle=grad;ctx.beginPath();ctx.arc(b.x,b.z,r,0,Math.PI*2);ctx.fill();
    if(b.num>=9){ctx.fillStyle='#f3f3e9';ctx.fillRect(b.x-r*.9,b.z-r*.5,r*1.8,r*.24);ctx.fillRect(b.x-r*.9,b.z+r*.32,r*1.8,r*.24);}
    if(b.num>0){
      ctx.beginPath();ctx.arc(b.x,b.z,r*.52,0,Math.PI*2);ctx.fillStyle='#f8f7eb';ctx.fill();
      ctx.fillStyle='#202523';ctx.font=`700 ${r*.8}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(b.num,b.x,b.z+r*.04);
    }
  }
  for(const fall of fallingBalls){
    const fraction=Math.max(0,Math.min(1,(fall.y+RADIUS)/(2*RADIUS)));
    if(fraction<=0)continue;
    ctx.beginPath();ctx.arc(fall.x,fall.z,RADIUS*Math.max(.1,fraction),0,Math.PI*2);
    ctx.fillStyle=fall.num===0?'#dfdfdc':BALL_COLORS[fall.num];
    ctx.globalAlpha=fraction;ctx.fill();ctx.globalAlpha=1;
  }
  ctx.restore();
}

function init() {
  try {
    renderer=new THREE.WebGLRenderer({canvas:el.gameCanvas,antialias:true,alpha:false,powerPreference:'high-performance'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=new THREE.Scene();scene.background=new THREE.Color('#0c1619');
    scene.fog=new THREE.Fog(0x0c1619,5.3,11);
    camera=new THREE.PerspectiveCamera(40,1,0.01,100);updateCamera();
    // The original cool tournament-room palette with physically continuous
    // rail-to-apron shadows instead of a floating top plate.
    scene.add(new THREE.HemisphereLight(0xc8e3dd,0x26332c,1.75));
    const mainLight=new THREE.DirectionalLight(0xf7fff4,3.0);
    mainLight.position.set(-1.8,4.6,2.2);mainLight.castShadow=true;
    mainLight.shadow.mapSize.set(2048,2048);
    mainLight.shadow.camera.left=-3;mainLight.shadow.camera.right=3;
    mainLight.shadow.camera.top=3;mainLight.shadow.camera.bottom=-3;
    mainLight.shadow.normalBias=0.004;mainLight.shadow.bias=-0.00009;
    scene.add(mainLight);
    const fill=new THREE.DirectionalLight(0x84c6b5,0.82);
    fill.position.set(3,2,-3);scene.add(fill);
    const edge=new THREE.DirectionalLight(0x9bb7c0,0.32);
    edge.position.set(0.7,1.8,-2.8);scene.add(edge);
    makeTable();makeCueAndGuides();newGame();setPower(el.powerSlider.value);bindControls();resize();
    new ResizeObserver(resize).observe(el.gameCanvas);
    renderer.setAnimationLoop(animate);
    requestAnimationFrame(()=>el.loadingOverlay.classList.add('hidden'));
  }catch(error) {
    console.warn('WebGL non disponible ; activation de la vue 2D.',error.message);
    try {
      fallbackCtx=el.gameCanvas.getContext('2d');
      if(!fallbackCtx)throw new Error('Canvas2D indisponible');
      scene=new THREE.Scene();camera=new THREE.PerspectiveCamera();
      makeCueAndGuides();newGame();setPower(el.powerSlider.value);bindControls();resize();
      el.cameraName.textContent='DESSUS · 2D';
      refreshPlacementUI();
      el.viewButton.disabled=true;
      el.viewButton.title='Vue 3D non disponible sur ce navigateur';
      new ResizeObserver(resize).observe(el.gameCanvas);
      requestAnimationFrame(function frame(t){animate(t);requestAnimationFrame(frame);});
      requestAnimationFrame(()=>el.loadingOverlay.classList.add('hidden'));
    }catch(fallbackError) {
      console.error('Impossible de préparer la table',fallbackError);
      el.loadingOverlay.innerHTML='<p style="max-width:320px;text-align:center;line-height:1.8;color:#f1c49a">Le rendu du jeu est indisponible dans ce navigateur.</p>';
    }
  }
}

init();
