import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const bounds=mesh=>({min:[0,1,2].map(k=>Math.min(...mesh.vertices.map(v=>v[k]))),
  max:[0,1,2].map(k=>Math.max(...mesh.vertices.map(v=>v[k])))});

test('maker plates are seated on the actual short-end cabinet faces, below the playing assembly',()=>{
  execFileSync(process.execPath,['scripts/export-table-geometry.mjs'],{cwd:root,stdio:'pipe'});
  const meshes=JSON.parse(readFileSync('/tmp/frame-geometry-current.json','utf8')).meshes;
  const shell=meshes.find(m=>m.material==='apronMaterial'&&bounds(m).min[1]<-.35&&bounds(m).max[1]>-.12);
  assert.ok(shell,'the plate must have a real cabinet behind it');
  const face=Math.max(...shell.vertices.map(v=>Math.abs(v[0])));
  const faceVertices=shell.vertices.filter(v=>Math.abs(Math.abs(v[0])-face)<1e-6);
  const faceY=[Math.min(...faceVertices.map(v=>v[1])),Math.max(...faceVertices.map(v=>v[1]))];
  const brand=meshes.filter(m=>m.material==='brand');
  for(const sign of [-1,1]){
    const parts=brand.filter(m=>m.vertices.every(v=>v[0]*sign>0));
    const plate=parts.find(m=>bounds(m).max[0]-bounds(m).min[0]>.002);
    const print=parts.find(m=>bounds(m).max[0]-bounds(m).min[0]<1e-6);
    assert.ok(plate&&print,'each end has a physical plaque and its lit print');
    const depth=plate.vertices.map(v=>v[0]*sign),b=bounds(plate),p=bounds(print);
    assert.ok(Math.abs(Math.min(...depth)-face)<1e-6,'plaque back meets the real fascia');
    assert.ok(b.min[1]>=faceY[0]&&b.max[1]<=faceY[1],'plaque fits within the flat fascia');
    assert.ok(b.max[1]<-.15,'no badge projects into the playable assembly');
    const printGap=print.vertices[0][0]*sign-Math.max(...depth);
    assert.ok(printGap>=0&&printGap<.0005,'print sits on the plaque rather than floating');
    for(const axis of [1,2])assert.ok(p.min[axis]>=b.min[axis]&&p.max[axis]<=b.max[axis]);
  }
});
