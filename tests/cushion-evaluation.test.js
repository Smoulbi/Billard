import test from 'node:test';
import assert from 'node:assert/strict';
import {compareCushionModels} from '../scripts/compare-cushion-models.js';

test('independent scoring script separates published regression from real shots',()=>{
  const report=compareCushionModels();
  const stats=report.publishedRegression;
  assert.match(stats.status,/NOT independent/);
  assert.equal(stats.byModel['coupled-3d'].count,24);
  assert.equal(stats.byModel.empirical.count,24);
  assert.ok(!('independentTable' in report));
});

test('v0.20 bounded effective fit improves on v0.19 but never masquerades as independent validation',()=>{
  const report=compareCushionModels();
  const old=report.publishedRegression.byModel['compliant-tuned'];
  const coupled=report.publishedRegression.byModel['coupled-3d'];
  assert.ok(coupled.rmsePoints<old.rmsePoints);
  assert.ok(coupled.maePoints<old.maePoints);
  assert.ok(coupled.rmsePoints>report.publishedRegression.byModel.empirical.rmsePoints);
  assert.ok(!('independentTable' in report));
});
