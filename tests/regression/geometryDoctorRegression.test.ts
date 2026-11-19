import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { diagnoseGLB, DEFAULT_THRESHOLDS } from '../../tools/glb-doctor/doctor.js';

test('REGRESSION TEST: Corrupted SLS Block 1 fixture FAILS GLB doctor', async () => {
  const corruptSlsPath = path.resolve('tests/fixtures/corrupt/sls_block1_corrupt.glb');
  assert.ok(fs.existsSync(corruptSlsPath), `Fixture must exist: ${corruptSlsPath}`);

  const report = await diagnoseGLB(corruptSlsPath, DEFAULT_THRESHOLDS);
  assert.equal(report.passes, false, 'Corrupted SLS fixture must fail doctor checks');
  assert.ok(
    report.violations.some((v) => v.includes('Degenerate') || v.includes('negative scale') || v.includes('edge')),
    `Violations must flag geometry defects. Found: ${JSON.stringify(report.violations)}`
  );
});

test('REGRESSION TEST: Corrupted Mobile Launcher fixture FAILS GLB doctor', async () => {
  const corruptMlPath = path.resolve('tests/fixtures/corrupt/mobile_launcher_corrupt.glb');
  assert.ok(fs.existsSync(corruptMlPath), `Fixture must exist: ${corruptMlPath}`);

  const report = await diagnoseGLB(corruptMlPath, DEFAULT_THRESHOLDS);
  assert.equal(report.passes, false, 'Corrupted Mobile Launcher fixture must fail doctor checks');
  assert.ok(
    report.violations.some((v) => v.includes('edge') || v.includes('Needle')),
    `Violations must flag needle/long edge defect. Found: ${JSON.stringify(report.violations)}`
  );
});

test('VERIFICATION: Fixed SLS Block 1 GLB PASSES GLB doctor with 0 violations', async () => {
  const fixedSlsPath = path.resolve('public/assets/rockets/sls_block1.glb');
  assert.ok(fs.existsSync(fixedSlsPath), `Fixed SLS must exist: ${fixedSlsPath}`);

  const report = await diagnoseGLB(fixedSlsPath, DEFAULT_THRESHOLDS);
  assert.equal(report.passes, true, `Fixed SLS must pass doctor with 0 violations. Found: ${report.violations.join(', ')}`);
  assert.equal(report.nanVertexCount, 0, 'Must have zero NaN vertices');
  assert.equal(report.infinityVertexCount, 0, 'Must have zero Inf vertices');
  assert.equal(report.degenerateTriangleCount, 0, 'Must have zero degenerate triangles');
  assert.ok(report.totalTriangles <= 75000, `Hero rocket must be <= 75k triangles (got ${report.totalTriangles})`);
  assert.ok(report.worldBoundingBox.size[1] >= 85 && report.worldBoundingBox.size[1] <= 100, `Height must match ~95m SLS (got ${report.worldBoundingBox.size[1]})`);
});

test('VERIFICATION: Background assets pass GLB doctor thresholds', async () => {
  const assets = [
    'public/assets/rockets/saturn_v.glb',
    'public/assets/asteroids/bennu.glb',
    'public/assets/structures/vab.glb',
    'public/assets/crafts/apollo_lunar_module.glb',
  ];

  for (const assetPath of assets) {
    const fullPath = path.resolve(assetPath);
    if (!fs.existsSync(fullPath)) continue;
    const report = await diagnoseGLB(fullPath, DEFAULT_THRESHOLDS);
    assert.equal(report.passes, true, `Asset ${assetPath} must pass doctor. Violations: ${report.violations.join(', ')}`);
    assert.equal(report.nanVertexCount, 0, `${assetPath} must have 0 NaN`);
    assert.equal(report.infinityVertexCount, 0, `${assetPath} must have 0 Inf`);
  }
});
