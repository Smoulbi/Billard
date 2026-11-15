import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {createCueMaterials} from '../dist/cue-materials.js';

test('cue textures are small, reproducible without a DOM and isolated between constructions',()=>{
  const first=createCueMaterials(),second=createCueMaterials();
  try{
    const maps=Object.values(first).map(material=>material.map).filter(Boolean);
    assert.equal(new Set(maps).size,4);
    let bytes=0;
    for(const [key,material] of Object.entries(first)){
      assert.notEqual(material,second[key],'each cue owns its materials');
      const map=material.map;
      if(!map)continue;
      const other=second[key].map;
      assert.notEqual(map,other);
      assert.notEqual(map.image.data,other.image.data,'pixel buffers are not shared mutable state');
      const {width,height,data}=map.image;
      assert.ok(width>0&&height>0&&width<=256&&height<=256);
      assert.equal(data.length,width*height*4);
      assert.equal(map.colorSpace,THREE.SRGBColorSpace);
      assert.equal(map.wrapS,THREE.RepeatWrapping);
      assert.equal(map.wrapT,THREE.RepeatWrapping);
      assert.equal(map.minFilter,THREE.LinearMipmapLinearFilter);
      assert.equal(map.generateMipmaps,true);
      assert.deepEqual(data,other.image.data,'seeded grain is reproducible');
      bytes+=data.byteLength;
      const original=other.image.data[0];
      data[0]^=255;
      assert.equal(other.image.data[0],original,'editing one cue leaves another untouched');
    }
    assert.ok(bytes<=512*1024,'four maps remain within a half-megabyte RGBA budget');
  }finally{
    for(const palette of [first,second])for(const material of Object.values(palette)){
      material.map?.dispose();material.dispose();
    }
  }
});
