import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {LENGTH,WIDTH,RADIUS,CORNER_CUT,SIDE_CUT,getPockets,getCushionSegments} from '../dist/physics.js';
import {tableClothBoundary,pocketWellOutline} from '../dist/table-pocket-geometry.js';

const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dump='/tmp/frame-geometry-current.json';
let cachedMeshes;
function productionMeshes(){
  if(cachedMeshes)return cachedMeshes;
  execFileSync(process.execPath,['scripts/export-table-geometry.mjs'],{
    cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']});
  cachedMeshes=JSON.parse(readFileSync(dump,'utf8')).meshes;
  return cachedMeshes;
}

const clothBoundary=tableClothBoundary(LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,
  getPockets(),36,.0012);
function onCloth(x,z){
  // The newly extended corner-shoulder felt is partly hidden *under* the
  // elevated cushion facing. That is intentional; this test checks exposed
  // PLAYABLE felt, whose limit is still the physical rectangular bed.
  // Visual joints meet the physical jaw line exactly. The GPU stores some
  // mirrored jaw coordinates 1e-8 m inside that line; tolerate 10 microns.
  if(Math.abs(x)>=LENGTH-1e-5||Math.abs(z)>=WIDTH-1e-5)return false;
  if(Math.abs(x)<LENGTH-CORNER_CUT-.004&&Math.abs(z)<WIDTH-SIDE_CUT-.004)return true;
  let inside=false;
  for(let i=0,j=clothBoundary.length-1;i<clothBoundary.length;j=i++){
    const [xi,zi]=clothBoundary[i],[xj,zj]=clothBoundary[j];
    if((zi>z)!==(zj>z)&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)inside=!inside;
  }
  return inside;
}

function bounds(mesh){
  const min=[0,1,2].map(i=>Math.min(...mesh.vertices.map(v=>v[i])));
  const max=[0,1,2].map(i=>Math.max(...mesh.vertices.map(v=>v[i])));
  return {min,max,size:max.map((v,i)=>v-min[i])};
}

test('v0.54 has a single graphite insert per corner and no detached rubber patches',()=>{
  const meshes=productionMeshes();
  const group=name=>meshes.filter(mesh=>mesh.material===name);
  assert.equal(group('railMaterial').length,12,
    'six continuous rail sections and six same-wood pocket junctions');
  assert.equal(group('brushedAluminium').length,0,
    'the reference has no silver corner castings or metal leg shoes');
  assert.equal(group('feltMaterial').length,1);
  assert.equal(group('pearlMaterial').length,18);
  assert.equal(group('sightInsetMaterial').length,18);
  assert.equal(group('matteBlack').length,getPockets().length);
  assert.equal(group('cornerInsertMaterial').length,4,
    'each corner has ONE complete circular graphite plate with its shoulders');
  assert.equal(group('cornerInsertBackingMaterial').length,4,
    'each single-piece graphite insert has ONE matching dark foundation');
  for(const plate of group('cornerInsertMaterial')){
    const {min,max}=bounds(plate);
    assert.ok(Math.abs(min[1]-.0585)<1e-5,
      'the graphite portion must be a thin horizontal plate, not a tall wall');
    assert.ok(Math.abs(max[1]-.063)<1e-5,
      'graphite plates finish flush with the wooden rail tops');
  }
  for(const backing of group('cornerInsertBackingMaterial')){
    const {min,max}=bounds(backing);
    assert.ok(Math.abs(min[1]-.024)<1e-5&&Math.abs(max[1]-.0585)<1e-5,
      'dark supports end precisely where the thin graphite plate starts');
  }
  assert.equal(group('leather').length,getPockets().length*4);
  assert.equal(group('innerRailMaterial').length,6,
    'six integral rail/facing sweeps, including all side-pocket mitres');
  assert.equal(group('cornerCushionJointMaterial').length,0,
    'no freestanding blue corner connection is permitted');
  const mainRubber=group('innerRailMaterial');
  assert.equal(mainRubber.length,6);
  const faces=getCushionSegments().filter(f=>f.kind==='facing');
  assert.equal(faces.length,12);
  for(const face of faces){
    const matches=mainRubber.filter(m=>m.vertices.some(v=>
      Math.hypot(v[0]-face.x0,v[2]-face.z0)<1e-6)&&m.vertices.some(v=>
      Math.hypot(v[0]-face.x1,v[2]-face.z1)<1e-6));
    assert.equal(matches.length,1,
      'both physics facing endpoints belong to precisely ONE continuous rail');
  }
  for(const mesh of mainRubber){
    const uniquePositions=new Set(mesh.vertices.map(v=>v.join(':')));
    assert.equal(uniquePositions.size,mesh.vertices.length,
      'adjacent rubber surfaces share welded vertices rather than duplicate seam positions');
    assert.ok(mesh.triangles.length>=48,
      'each integrated rail volume has closed sidewalls and endpoint caps');
    const edges=new Map();
    for(const t of mesh.triangles){
      const [a,b,c]=t.map(i=>mesh.vertices[i]);
      const u=a.map((v,i)=>b[i]-v),v=a.map((w,i)=>c[i]-w);
      const n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],
        u[0]*v[1]-u[1]*v[0]];
      assert.ok(Math.hypot(...n)>1e-9,
        'every rubber triangle must have a nonzero physical area');
      for(const [i,j] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
        const key=[i,j].sort((a,b)=>a-b).join(':');
        edges.set(key,(edges.get(key)||0)+1);
      }
    }
    assert.ok([...edges.values()].every(n=>n===2),
      'rubber must be a watertight two-manifold: no unpaired edges or floating fins');
  }
  assert.equal(group('cornerFacingMaterial').length,0,
    'the felt shoulders must not contain freestanding triangular prisms');

  const top=mesh=>Math.max(...mesh.vertices.map(v=>v[1]));
  const nearly=(a,b)=>Math.abs(a-b)<1e-5;
  for(const mesh of [...group('railMaterial'),...group('pearlMaterial'),
    ...group('sightInsetMaterial')])
    assert.ok(nearly(top(mesh),.063),
      `rail and pearl inlay must be flush at y=0.063, got ${top(mesh)}`);

  // Four black support pads lie exactly on the graphical ground at y=-0.760.
  const soles=group('lowerRevealMaterial').filter(mesh=>
    mesh.vertices.some(v=>nearly(v[1],-.76)));
  assert.equal(soles.length,4);
  for(const mesh of soles)
    assert.ok(mesh.vertices.every(v=>v[1]>=-.760001));
  const largeLegs=group('woodMaterial').filter(mesh=>{
    const ys=mesh.vertices.map(v=>v[1]);
    return Math.min(...ys)<-.65&&Math.max(...ys)>-.34;
  });
  assert.equal(largeLegs.length,4,'four structural corner legs support the cabinet');
});

test('facing joins have no vertical fin above the nose and taper toward the pocket',()=>{
  const rubber=productionMeshes().filter(mesh=>mesh.material==='innerRailMaterial');
  for(const face of getCushionSegments().filter(f=>f.kind==='facing')){
    const mesh=rubber.find(m=>m.vertices.some(v=>
      Math.hypot(v[0]-face.x0,v[2]-face.z0)<1e-6)&&m.vertices.some(v=>
      Math.hypot(v[0]-face.x1,v[2]-face.z1)<1e-6));
    assert.ok(mesh,'every facing remains connected to its original rail');
    const dx=face.x1-face.x0,dz=face.z1-face.z0,length=Math.hypot(dx,dz);
    const tx=dx/length,tz=dz/length;
    // Cross-sections must be perpendicular to the actual visual jaw segment,
    // not a copy of a collision response direction. Nose points stay fixed.
    const section=(x,z)=>mesh.vertices.filter(v=>
      Math.abs((v[0]-x)*tx+(v[2]-z)*tz)<1e-6);
    const jawNose=mesh.vertices.filter(v=>
      Math.hypot(v[0]-face.x0,v[2]-face.z0)<1e-6);
    assert.equal(jawNose.length,1,
      'one shared nose vertex replaces the incompatible zero-length profile strip');
    assert.ok(jawNose.every(v=>v[1]<=2*RADIUS*.635+1e-6),
      'no raised vertical fin may sit directly above the physical jaw nose');
    const end=section(face.x1,face.z1);
    assert.ok(Math.abs(Math.max(...end.map(v=>v[1]))-.054)<1e-6,
      'the narrow facing still descends toward the pocket');
    assert.ok(end.some(v=>Math.hypot(v[0]-face.x1,v[2]-face.z1)>.009&&v[1]>.04),
      'the facing has a real shoulder normal to its segment, not a collapsed fin');
    for(const [x,z] of [[face.x0,face.z0],[face.x1,face.z1]])
      assert.ok(mesh.vertices.some(v=>Math.hypot(v[0]-x,v[2]-z)<1e-6&&
        Math.abs(v[1]-2*RADIUS*.635)<1e-6),'the physical nose endpoints stay fixed');
  }
});

test('v0.54 rail caps, complete graphite inserts and integrated rubber stay off playable felt',()=>{
  const meshes=productionMeshes();
  // Check actual extruded triangles, including the rounded outer bevels;
  // outline-only tests miss geometry that expands during extrusion.
  const surfaces=new Set(['railMaterial','brushedAluminium',
    'sightInsetMaterial','pearlMaterial','leather','innerRailMaterial',
    'cornerInsertMaterial','cornerInsertBackingMaterial']);
  const weights=[[.2,.2,.6],[.2,.6,.2],[.6,.2,.2],[1/3,1/3,1/3]];
  let sampled=0;
  for(const mesh of meshes){
    if(!surfaces.has(mesh.material))continue;
    for(const indices of mesh.triangles){
      const v=indices.map(i=>mesh.vertices[i]);
      for(const weight of weights){
        const [x,y,z]=[0,1,2].map(j=>v.reduce((sum,p,k)=>sum+p[j]*weight[k],0));
        if(y<=.00121)continue;
        sampled++;
        assert.equal(onCloth(x,z),false,
          `${mesh.material} overlaps playable felt at (${x},${y},${z})`);
      }
    }
  }
  assert.ok(sampled>1000,'expected to sample the actual mesh caps and fittings');
});

test('the six mouth lips are recessed below the felt rather than sitting above it',()=>{
  const meshes=productionMeshes();
  const lips=meshes.filter(mesh=>{
    if(mesh.material!=='leather')return false;
    const ys=mesh.vertices.map(v=>v[1]);
    return Math.abs(Math.min(...ys)+.008)<.00001&&
      Math.abs(Math.max(...ys)+.005)<.00001;
  });
  assert.equal(lips.length,getPockets().length);
});

test('the six wells have continuous deep liner walls rather than a missing rear face',()=>{
  const meshes=productionMeshes();
  const nearly=(a,b)=>Math.abs(a-b)<.00001;
  const wells=meshes.filter(mesh=>{
    if(mesh.material!=='leather')return false;
    const ys=mesh.vertices.map(v=>v[1]);
    return nearly(Math.max(...ys),-.006)&&nearly(Math.min(...ys),-.18);
  });
  assert.equal(wells.length,6,'every pocket must have a full-depth inner throat');
  for(const p of getPockets()){
    const contour=pocketWellOutline(p,CORNER_CUT,SIDE_CUT,48);
    const well=wells.find(mesh=>contour.every(([x,z])=>mesh.vertices.some(v=>
      nearly(v[0],x)&&nearly(v[1],-.006)&&nearly(v[2],z))));
    assert.ok(well,`${p.kind} rim must meet its complete well boundary`);
    const top=well.vertices.filter(v=>nearly(v[1],-.006));
    const bottom=well.vertices.filter(v=>nearly(v[1],-.18));
    assert.equal(top.length,contour.length);
    assert.equal(bottom.length,contour.length);
    assert.equal(well.triangles.length,(5-1)*contour.length*2,
      'all circumferential wall segments, including the rear wall, must exist');
  }
});

test('v0.49 construction stays bilaterally symmetric',()=>{
  const meshes=productionMeshes();
  const groups=new Map();
  for(const mesh of meshes){
    const min=[0,1,2].map(i=>Math.min(...mesh.vertices.map(v=>v[i])));
    const max=[0,1,2].map(i=>Math.max(...mesh.vertices.map(v=>v[i])));
    const center=min.map((v,i)=>(v+max[i])/2);
    if(!groups.has(mesh.material))groups.set(mesh.material,[]);
    groups.get(mesh.material).push(center);
  }
  const same=(a,b)=>a.every((v,i)=>Math.abs(v-b[i])<.0001);
  for(const [material,centers] of groups){
    // Brand planes are only an offline proxy and are mirrored by rotation.
    if(material==='brand')continue;
    for(const [x,y,z] of centers){
      assert.ok(centers.some(c=>same(c,[-x,y,z])),
        `missing x-mirror of ${material} at (${x},${y},${z})`);
      assert.ok(centers.some(c=>same(c,[x,y,-z])),
        `missing z-mirror of ${material} at (${x},${y},${z})`);
    }
  }
});

test('the cabinet and levellers connect all four ground supports to the slate',()=>{
  const meshes=productionMeshes();
  const byMaterial=name=>meshes.filter(mesh=>mesh.material===name).map(bounds);
  const base=byMaterial('baseMaterial');
  const slate=byMaterial('slateMaterial')[0];
  const underbed=base.find(b=>b.size[0]>2.5&&b.size[1]<.09);
  const center=base.find(b=>b.size[0]>2.2&&b.size[0]<2.4);
  const sills=base.filter(b=>b.size[1]>.21&&b.size[1]<.22);
  const cabinet=byMaterial('apronMaterial').find(b=>b.size[0]>2.5&&b.min[1]<-.30&&b.max[1]<-.10);
  assert.ok(slate&&underbed&&center&&cabinet&&sills.length);

  const touches=(upper,lower,tolerance=.011)=>
    upper.min[1]<=lower.max[1]+tolerance&&
    upper.min[1]>=lower.max[1]-tolerance;
  assert.ok(touches(slate,underbed,.0001),'slate rests on the under-bed');
  assert.ok(touches(underbed,center,.003),'under-bed rests on central beam');
  for(const sill of sills){
    assert.ok(sill.max[1]>underbed.min[1]);
    assert.ok(sill.min[1]<cabinet.max[1]&&sill.max[1]>cabinet.min[1],
      'the sill intersects the cabinet vertically');
  }

  // AABB adjacency detects disconnected furniture components. It is a visual
  // assembly check, not a claim about the load-bearing strength of the table.
  const materials=new Set(['slateMaterial','baseMaterial','woodMaterial',
    'apronMaterial','lowerRevealMaterial','darkMetal']);
  const components=meshes.filter(m=>materials.has(m.material)).map(m=>({mesh:m,...bounds(m)}));
  const touches3d=(a,b)=>a.min.every((v,k)=>v<=b.max[k]+1e-4&&a.max[k]>=b.min[k]-1e-4);
  const pads=components.filter(c=>Math.abs(c.min[1]+.760)<1e-6&&c.max[1]<-.70);
  assert.equal(pads.length,4,'each corner has its own leveller on the ground');
  for(const pad of pads){
    const seen=new Set([pad]),queue=[pad];
    for(let i=0;i<queue.length;i++)for(const other of components)
      if(!seen.has(other)&&touches3d(queue[i],other)){seen.add(other);queue.push(other);}
    assert.ok([...seen].some(c=>c.mesh.material==='slateMaterial'),
      'every leveller has an uninterrupted assembly path up to the slate');
  }
});

test('leveller pads sit below tapered posts and support the four cabinet corners',()=>{
  const meshes=productionMeshes();
  const pads=meshes.filter(m=>m.material==='lowerRevealMaterial'&&
    Math.abs(bounds(m).min[1]+.760)<1e-6);
  const legs=meshes.filter(m=>m.material==='woodMaterial'&&bounds(m).min[1]<-.65);
  const quadrants=new Set();
  for(const pad of pads){
    const p=bounds(pad),x=(p.min[0]+p.max[0])/2,z=(p.min[2]+p.max[2])/2;
    quadrants.add(`${Math.sign(x)}:${Math.sign(z)}`);
    const leg=legs.find(m=>{const b=bounds(m);return x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2];});
    assert.ok(leg,'each ground pad is directly under a post');
    const l=bounds(leg),bottom=leg.vertices.filter(v=>Math.abs(v[1]-l.min[1])<1e-6);
    for(const axis of [0,2]){
      assert.ok(p.min[axis]>=Math.min(...bottom.map(v=>v[axis]))-1e-6);
      assert.ok(p.max[axis]<=Math.max(...bottom.map(v=>v[axis]))+1e-6,
        'the pad stays within the bottom footprint of its post');
    }
    assert.ok(p.max[1]<l.min[1],'a visible spindle separates pad and post');
    assert.ok(meshes.some(m=>m.material==='darkMetal'&&(()=>{
      const b=bounds(m);return x>b.min[0]&&x<b.max[0]&&z>b.min[2]&&z<b.max[2]&&
        b.min[1]<=p.max[1]+1e-6&&b.max[1]>=l.min[1]-1e-6;
    })()),'a spindle bridges the space without a floating gap');
  }
  assert.equal(quadrants.size,4,'the supports surround the centre in all four quadrants');
});

test('rounded cabinet and posts remain closed finite furniture volumes',()=>{
  const furniture=productionMeshes().filter(m=>
    (m.material==='apronMaterial'||m.material==='woodMaterial')&&
    bounds(m).min[1]<-.30&&bounds(m).max[1]<-.10);
  assert.ok(furniture.length>0);
  for(const mesh of furniture){
    const edges=new Map();let volume=0;
    for(const t of mesh.triangles){
      const [a,b,c]=t.map(i=>mesh.vertices[i]);
      assert.ok([...a,...b,...c].every(Number.isFinite));
      const u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);
      assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-12);
      volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
      for(const [i,j] of [[t[0],t[1]],[t[1],t[2]],[t[2],t[0]]]){
        const key=[i,j].sort((a,b)=>a-b).join(':');edges.set(key,(edges.get(key)||0)+1);
      }
    }
    assert.ok([...edges.values()].every(n=>n===2),'no open seam in a post or cabinet shell');
    assert.ok(volume>0,'the visible faces have outward winding');
  }
});

test('post tops stay within the actual rounded cabinet silhouette through their overlap',()=>{
  const meshes=productionMeshes();
  const cabinet=meshes.find(m=>m.material==='apronMaterial'&&
    bounds(m).min[1]<-.30&&bounds(m).max[1]<-.10&&bounds(m).size[0]>2.5);
  const legs=meshes.filter(m=>m.material==='woodMaterial'&&bounds(m).min[1]<-.65);
  assert.ok(cabinet&&legs.length);
  const section=(mesh,y)=>{
    const points=[];
    for(const t of mesh.triangles)for(let i=0;i<3;i++){
      const a=mesh.vertices[t[i]],b=mesh.vertices[t[(i+1)%3]];
      if((a[1]-y)*(b[1]-y)>=0)continue;
      const f=(y-a[1])/(b[1]-a[1]);
      points.push([a[0]+f*(b[0]-a[0]),a[2]+f*(b[2]-a[2])]);
    }
    return points;
  };
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const hull=points=>{
    const sorted=[...new Map(points.map(p=>[p.join(':'),p])).values()]
      .sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
    const half=list=>{const out=[];for(const p of list){
      while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=1e-12)out.pop();out.push(p);
    }return out;};
    return half(sorted).slice(0,-1).concat(half(sorted.toReversed()).slice(0,-1));
  };
  const c=bounds(cabinet);
  for(const leg of legs){
    const l=bounds(leg),bottom=Math.max(c.min[1],l.min[1])+1e-5,
      top=Math.min(c.max[1],l.max[1])-1e-5;
    assert.ok(top>bottom,'the post really enters the cabinet');
    for(let i=0;i<=12;i++){
      const y=bottom+(top-bottom)*i/12,outline=hull(section(cabinet,y));
      assert.ok(outline.length>=3);
      for(const point of section(leg,y))for(let j=0;j<outline.length;j++)
        assert.ok(cross(outline[j],outline[(j+1)%outline.length],point)>=-1e-7,
          'a post must not protrude through the rounded cabinet corner');
    }
  }
});
