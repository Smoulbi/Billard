import test from 'node:test';
import assert from 'node:assert/strict';
import {CALIBRATION_CASES,runCalibration,signedDeviation,calibrationToCSV}
  from '../dist/calibration.js';

test('calibration runs 57 distinct theoretical and published-reference cases',()=>{
  const result=runCalibration();
  assert.equal(result.length,57);
  assert.equal(new Set(result.map(r=>r.id)).size,57);
  assert.deepEqual(result.map(r=>r.id),CALIBRATION_CASES.map(r=>r.id));
  for(const row of result) {
    assert.ok(Number.isFinite(row.simulated),`${row.id} must be finite`);
    assert.ok(row.simulated>=0);
    if(row.family==='break')assert.ok(Number.isInteger(row.simulated)&&row.simulated<=15);
    if(row.family==='cloth')assert.equal(row.reference,null);
    if(row.publishedKind) {
      assert.ok(Number.isFinite(row.published),`${row.id} must carry its published reference`);
      assert.ok(row.sourceUrl?.startsWith('https://'));
    }
  }
});

test('stun and natural-roll reference residuals are measured, not assumed zero',()=>{
  const result=runCalibration();
  const stun=result.filter(r=>r.family==='stun');
  const roll=result.filter(r=>r.family==='roll');
  assert.equal(stun.length,5);
  assert.equal(roll.length,5);
  for(const row of stun) {
    assert.equal(row.reference,90-row.cut);
    assert.ok(Math.abs(row.simulated-row.reference)<8,
      `${row.id}: unexpectedly large error from ideal tangent`);
  }
  for(const row of roll) {
    assert.equal(row.reference,30);
    assert.ok(Math.abs(row.simulated-row.reference)<5,
      `${row.id}: unexpectedly large error from approximate natural angle`);
  }
  assert.ok(stun.some(r=>Math.abs(r.simulated-r.reference)>1),
    'the benchmark should show non-zero discrepancies');
});

test('pool cloth friction yields stopping distance from the American-pool reference',()=>{
  const cloth=runCalibration().find(r=>r.family==='cloth');
  assert.ok(cloth.simulated>126&&cloth.simulated<129,
    'with pool rolling resistance 0.0981 m/s², a 0.5 m/s ball travels ~1.27 m');
});

test('real-world reference entry remains separate from theoretical benchmarks',()=>{
  const rows=runCalibration();
  const selected={"roll-30":31.5,"cloth-050":69.2};
  const csv=calibrationToCSV(rows,selected);
  const lines=csv.trim().split('\n');
  assert.equal(lines.length,58);
  assert.ok(lines[0].includes('measured_reference'));
  const rolling=lines.find(line=>line.startsWith('roll-30,'));
  const cloth=lines.find(line=>line.startsWith('cloth-050,'));
  assert.ok(rolling.includes(',30.0000,31.5000,'));
  assert.ok(cloth.includes(',,69.2000,'),
    'no theoretical cloth measurement should be invented');
  assert.ok(lines[0].includes('published_reference'));
  assert.ok(lines.find(line=>line.startsWith('mathavan-0-cue,')).includes(',0.8160,'));
  assert.equal(signedDeviation(34.5,31.5),3);
  assert.equal(signedDeviation(34.5,null),null);
  assert.equal(signedDeviation(34.5,NaN),null);
});
