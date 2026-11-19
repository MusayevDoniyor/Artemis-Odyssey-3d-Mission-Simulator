import { test, describe } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { diagnoseGLB, DEFAULT_THRESHOLDS } from './doctor.js';

describe('GLB Doctor Diagnostic Suite', () => {
  test('diagnoseGLB successfully analyzes bennu.glb without false positives', async () => {
    const bennuPath = path.resolve('public/assets/asteroids/bennu.glb');
    const report = await diagnoseGLB(bennuPath);

    assert.strictEqual(report.passes, true, 'bennu.glb should pass clean');
    assert.strictEqual(report.totalMeshes, 1);
    assert.strictEqual(report.totalTriangles, 18240);
    assert.strictEqual(report.nanVertexCount, 0);
    assert.strictEqual(report.degenerateTriangleCount, 0);
    assert.ok(report.worldBoundingBox.diagonal > 1000);
    assert.ok(report.maxEdgeToDiagRatio < 0.10);
  });

  test('diagnoseGLB flags negative node scale and degenerates in corrupted sls_block1 fixture', async () => {
    const slsPath = path.resolve('tests/fixtures/corrupt/sls_block1_corrupt.glb');
    const report = await diagnoseGLB(slsPath);

    // Corrupted sls_block1 fixture has negative scale on srb_left and degenerate triangles
    assert.strictEqual(report.passes, false);
    assert.ok(report.violations.length >= 1);
    assert.ok(
      report.violations.some((v) => v.includes('negative scale') || v.includes('Degenerate')),
      'Should detect negative scale or degenerates on corrupted node'
    );
  });

  test('custom threshold overrides properly reject or accept models based on error tolerance', async () => {
    const bennuPath = path.resolve('public/assets/asteroids/bennu.glb');
    
    // Set an ultra-strict edge ratio threshold that should fail
    const strictReport = await diagnoseGLB(bennuPath, {
      ...DEFAULT_THRESHOLDS,
      maxEdgeToDiagRatio: 0.01, // 1% of diagonal
    });
    assert.strictEqual(strictReport.passes, false);
    assert.ok(strictReport.violations.some((v) => v.includes('exceeds threshold')));

    // Set a relaxed threshold that passes
    const relaxedReport = await diagnoseGLB(bennuPath, {
      ...DEFAULT_THRESHOLDS,
      maxEdgeToDiagRatio: 0.50,
    });
    assert.strictEqual(relaxedReport.passes, true);
  });
});
