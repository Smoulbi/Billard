// Offline visual QA: exports exactly the geometry built by makeTable() without
// booting the browser, changing game.js, or running the physics integrator.
import fs from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../dist/vendor/three.module.js';
import {LENGTH, WIDTH, RADIUS, CORNER_CUT, SIDE_CUT,
  getPockets, getCushionSegments} from '../dist/physics.js';
import {pocketMouthCurve,pocketShelfCurve,pocketVisibleCurve,pocketVisibleSagitta,
  pocketShelfLinerOutline,pocketCollectorArcPoint,pocketCollectorRadii,
  pocketMouthTrimOutline,pocketCastingOutline,cornerPocketInsertOutline,
  tableClothBoundary,tableSlateBoundary,pocketWellOutline,pocketReferenceGeometry,
  longRailCapEnds,shortRailCapEnds,RAIL_CAP_INNER_OFFSET}
  from '../dist/table-pocket-geometry.js';

const code=fs.readFileSync(new URL('../dist/game.js',import.meta.url),'utf8');
const begin=code.indexOf('const feltMaterial =');
const end=code.indexOf('function numberTexture(');
if(begin<0||end<begin)throw Error('Unable to isolate the production table constructor');
const scene=new THREE.Scene();
const fakeCanvas=()=>({width:0,height:0,getContext:()=>({
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData(){},clearRect(){},fillText(){},
})});
const context={THREE,scene,LENGTH,WIDTH,RADIUS,CORNER_CUT,SIDE_CUT,
  getPockets,getCushionSegments,pocketMouthCurve,pocketShelfCurve,pocketVisibleCurve,pocketVisibleSagitta,
  pocketShelfLinerOutline,tableSlateBoundary,
  pocketCollectorArcPoint,pocketCollectorRadii,
  pocketMouthTrimOutline,pocketCastingOutline,cornerPocketInsertOutline,
  tableClothBoundary,pocketWellOutline,pocketReferenceGeometry,
  longRailCapEnds,shortRailCapEnds,RAIL_CAP_INNER_OFFSET,
  document:{createElement:fakeCanvas}};
vm.runInNewContext(code.slice(begin,end)+`
  makeTable();
  globalThis.materialReferences={feltMaterial,woodMaterial,railMaterial,
    innerRailMaterial,cushionSeam,leather,matteBlack,
    brass,darkMetal,cornerInsertMaterial,cornerInsertBackingMaterial,
    slateMaterial,baseMaterial,sightInsetMaterial,pearlMaterial,
    apronMaterial};
  if(typeof brushedAluminium!=='undefined')materialReferences.brushedAluminium=brushedAluminium;
  if(typeof lowerRevealMaterial!=='undefined')materialReferences.lowerRevealMaterial=lowerRevealMaterial;`,context,
{filename:'table-preview-source.js'});
scene.updateMatrixWorld(true);

const materials=new Map(Object.entries(context.materialReferences).map(([name,mat])=>[mat.uuid,name]));
const meshes=[];
for(const node of scene.children){
  if(!(node instanceof THREE.Mesh))continue;
  if(node.geometry instanceof THREE.PlaneGeometry&&node.geometry.parameters.width>10)continue;
  const geometry=node.geometry.clone();geometry.applyMatrix4(node.matrixWorld);
  const position=geometry.getAttribute('position');
  const indices=geometry.getIndex();
  const materialName=materials.get(node.material.userData.tableSourceMaterial||node.material.uuid)||'brand';
  const triangles=[];
  if(indices){
    for(let j=0;j<indices.count;j+=3)
      triangles.push([indices.getX(j),indices.getX(j+1),indices.getX(j+2)]);
  }else{
    for(let j=0;j<position.count;j+=3)triangles.push([j,j+1,j+2]);
  }
  const vertices=[];
  for(let i=0;i<position.count;i++)
    vertices.push([position.getX(i),position.getY(i),position.getZ(i)]);
  meshes.push({material:materialName,vertices,triangles});
}
fs.writeFileSync('/tmp/frame-geometry-current.json',JSON.stringify({meshes}));
console.log(JSON.stringify({meshes:meshes.length,triangles:meshes.reduce((n,m)=>n+m.triangles.length,0),
  materials:[...new Set(meshes.map(m=>m.material))]}));
