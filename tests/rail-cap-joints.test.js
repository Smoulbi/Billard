import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {LENGTH,WIDTH,CORNER_CUT,SIDE_CUT,getPockets} from '../dist/physics.js';
import {longRailCapEnds,shortRailCapEnds,pocketCastingOutline} from '../dist/table-pocket-geometry.js';
const root=fileURLToPath(new URL('../',import.meta.url));
let cached;
function caps(){
  if(cached)return cached;
  execFileSync(process.execPath,['scripts/export-table-geometry.mjs'],{cwd:root,stdio:'pipe'});
  cached=JSON.parse(readFileSync('/tmp/frame-geometry-current.json','utf8')).meshes.filter(m=>m.material==='railMaterial');
  return cached;
}
const bounds=mesh=>({
  min:[0,1,2].map(k=>Math.min(...mesh.vertices.map(v=>v[k]))),
  max:[0,1,2].map(k=>Math.max(...mesh.vertices.map(v=>v[k])))});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} must meet ${b}`);

test('rail cap bevels stop at their mating planes rather than overlap pocket returns',()=>{
  const meshes=caps();assert.equal(meshes.length,12);
  let index=0;
  for(const sign of [-1,1]){
    for(const [x0,x1] of [[-LENGTH+CORNER_CUT,-SIDE_CUT],[SIDE_CUT,LENGTH-CORNER_CUT]]){
      const b=bounds(meshes[index++]),[a,c]=longRailCapEnds(x0,x1);
      near(b.min[0],a);near(b.max[0],c);near(b.max[1],.063);
      // Exposed outer edges retain their original 7 mm rounded expansion.
      near(sign<0?b.min[2]:b.max[2],sign*(WIDTH+.172+.007));
    }
    const b=bounds(meshes[index++]),[a,c]=shortRailCapEnds(-WIDTH+CORNER_CUT,WIDTH-CORNER_CUT);
    near(b.min[2],a);near(b.max[2],c);near(b.max[1],.063);
    near(sign<0?b.min[0]:b.max[0],sign*(LENGTH+.172+.007));
  }
  for(const p of getPockets()){
    const b=bounds(meshes[index++]),outline=pocketCastingOutline(p,CORNER_CUT,.172,SIDE_CUT);
    near(b.min[1],.024);near(b.max[1],.063);
    if(p.kind==='side'){
      near(b.min[0],Math.min(...outline.map(q=>q[0])));
      near(b.max[0],Math.max(...outline.map(q=>q[0])));
      near(p.sz<0?b.min[2]:b.max[2],p.z+p.sz*(.172+.007));
    }else{
      const extremeX=(p.sx>0?Math.min:Math.max)(...outline.map(q=>q[0]));
      const extremeZ=(p.sz>0?Math.min:Math.max)(...outline.map(q=>q[1]));
      near(p.sx>0?b.min[0]:b.max[0],extremeX);
      near(p.sz>0?b.min[2]:b.max[2],extremeZ);
      near(p.sx<0?b.min[0]:b.max[0],p.x+p.sx*(.172+.007));
      near(p.sz<0?b.min[2]:b.max[2],p.z+p.sz*(.172+.007));
    }
  }
});

test('trimmed cap bevels retain finite nondegenerate triangles',()=>{
  for(const mesh of caps())for(const triangle of mesh.triangles){
    const [a,b,c]=triangle.map(i=>mesh.vertices[i]);
    assert.ok([...a,...b,...c].every(Number.isFinite));
    const u=b.map((v,k)=>v-a[k]),v=c.map((n,k)=>n-a[k]);
    assert.ok(Math.hypot(u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])>1e-12);
  }
});


test('mating planes contain no doubled internal wall triangles that self-shadow the top',()=>{
  for(const mesh of caps()){
    const b=bounds(mesh);
    // Every cap's extreme end planes are its mating planes; the exposed
    // outer edge is bevelled and therefore spans several x/z coordinates.
    const top=mesh.vertices.filter(v=>Math.abs(v[1]-.063)<1e-6);
    for(const axis of [0,2])for(const side of ['min','max']){
      const plane=b[side][axis];
      const nominal=(side==='min'?Math.min:Math.max)(...top.map(v=>v[axis]));
      if(Math.abs(plane-nominal)>1e-6)continue;
      for(const triangle of mesh.triangles)assert.equal(
        triangle.every(i=>Math.abs(mesh.vertices[i][axis]-plane)<1e-7),false,
        'internal mating wall must not remain in either cap');
    }
  }
});
