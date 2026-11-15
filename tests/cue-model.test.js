import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createCueModel} from '../dist/cue-model.js';

const material=new THREE.MeshStandardMaterial();
const materials=Object.fromEntries(['shaft','butt','wrap','metal','ferrule','tip','bumper','inlay'].map(key=>[key,material]));
function bounds(mesh){mesh.geometry.computeBoundingBox();return mesh.geometry.boundingBox;}

test('cue keeps the tip contact anchor and extends backwards to a full length cue',()=>{
  const cue=createCueModel(materials),box=new THREE.Box3().setFromObject(cue);
  assert.ok(Math.abs(box.max.x+.035)<1e-8);
  assert.ok(Math.abs(box.min.x+1.505)<1e-7);
  assert.ok(Math.abs(box.max.y+box.min.y)<1e-8);
  assert.ok(Math.abs(box.max.z+box.min.z)<1e-8);
  const tip=cue.getObjectByName('blue-leather-tip').geometry.attributes.position;
  let front=new THREE.Vector3(-Infinity,0,0);
  for(let i=0;i<tip.count;i++)if(tip.getX(i)>front.x)front.fromBufferAttribute(tip,i);
  assert.ok(Math.abs(front.x+.035)<1e-8&&Math.hypot(front.y,front.z)<1e-8);
  const pose=new THREE.Matrix4().compose(new THREE.Vector3(2,.1,-.5),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,.7,-.14,'YXZ')),new THREE.Vector3(1,1,1));
  assert.ok(front.applyMatrix4(pose).distanceTo(new THREE.Vector3(-.035,0,0).applyMatrix4(pose))<1e-8);
});

test('cue sections meet without axial gaps or radius steps',()=>{
  const cue=createCueModel(materials);
  const names=['rubber-bumper','butt-ring','dark-wood-sleeve','wrap-rear-ring','woven-grip','wrap-front-ring','dark-wood-forearm','joint-ring','maple-shaft','ivory-ferrule','blue-leather-tip'];
  const ends=(mesh,front)=>{
    const b=bounds(mesh),x=front?b.max.x:b.min.x,p=mesh.geometry.attributes.position;
    let r=0;
    for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-x)<1e-7)r=Math.max(r,Math.hypot(p.getY(i),p.getZ(i)));
    return {x,r};
  };
  for(let i=1;i<names.length;i++){
    const a=ends(cue.getObjectByName(names[i-1]),true),b=ends(cue.getObjectByName(names[i]),false);
    assert.ok(Math.abs(a.x-b.x)<1e-7,`${names[i]} axial joint`);
    assert.ok(Math.abs(a.r-b.r)<1e-7,`${names[i]} radial joint`);
  }
});

test('inlays hug the conical wood and face outwards without duplicate shadows',()=>{
  const cue=createCueModel(materials),inlays=cue.children.filter(m=>m.name.startsWith('curved-inlay'));
  assert.equal(inlays.length,4);
  const wood=cue.getObjectByName('dark-wood-forearm'),box=bounds(wood);
  for(const inlay of inlays){
    assert.equal(inlay.castShadow,false);
    const p=inlay.geometry.attributes.position,n=inlay.geometry.attributes.normal;
    for(let i=0;i<p.count;i++){
      const x=p.getX(i),r=Math.hypot(p.getY(i),p.getZ(i));
      assert.ok(x>box.min.x&&x<box.max.x);
      const expected=.0105+(.014-.0105)*(-.787-x)/.288;
      assert.ok(r>=expected-1e-8&&r-expected<.00005,'veneer is within 50 microns of wood');
      // Endpoints collapse to a point and may have a zero normal.
      if(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))>.5)
        assert.ok(n.getY(i)*p.getY(i)+n.getZ(i)*p.getZ(i)>0,'radial normal faces out');
    }
    const index=inlay.geometry.index;
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    for(let i=0;i<index.count;i+=3){
      a.fromBufferAttribute(p,index.getX(i));
      b.fromBufferAttribute(p,index.getX(i+1));
      c.fromBufferAttribute(p,index.getX(i+2));
      assert.ok(b.sub(a).cross(c.sub(a)).lengthSq()>0,'inlay triangles have positive area');
    }
  }
});

test('cue has a bounded mesh budget and finite render attributes',()=>{
  const cue=createCueModel(materials);
  assert.ok(cue.children.length<=16);
  for(const mesh of cue.children){
    for(const attribute of Object.values(mesh.geometry.attributes))
      assert.ok(Array.from(attribute.array).every(Number.isFinite),mesh.name);
    assert.ok(mesh.geometry.attributes.position.count<10000);
    assert.equal(mesh.material,material,'materials are injected without hidden DOM or textures');
  }
});
