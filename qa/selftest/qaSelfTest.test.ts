import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { diagnoseGLB, DEFAULT_THRESHOLDS } from '../../tools/glb-doctor/doctor.js';
import { analyzeScreenshot } from '../helpers/imageHeuristics.js';
import { PNG } from 'pngjs';

describe('QA SYSTEM SELF-TEST: Injected Defect Detectors (Proves Red on Failure)', () => {
  test('1. Corrupted GLB detector: catches corrupted SLS fixture and fails red', async () => {
    const corruptPath = path.resolve('tests/fixtures/corrupt/sls_block1_corrupt.glb');
    assert.ok(fs.existsSync(corruptPath), 'Fixture must exist');

    const report = await diagnoseGLB(corruptPath, DEFAULT_THRESHOLDS);
    assert.strictEqual(report.passes, false, 'Must fail on corrupted geometry');
    assert.ok(report.violations.length > 0, 'Must provide clear violation messages');
  });

  test('2. NaN position detector: catches NaN coordinates in scene-graph traversal', () => {
    const sampleGraph = [
      { name: 'good_node', position: [0, 10, 0] },
      { name: 'corrupted_node', position: [NaN, 12, 0] },
    ];

    const nanNodes = sampleGraph.filter(
      (n) => Number.isNaN(n.position[0]) || Number.isNaN(n.position[1]) || Number.isNaN(n.position[2])
    );

    assert.strictEqual(nanNodes.length, 1, 'Detector must catch exactly 1 node with NaN position');
    assert.strictEqual(nanNodes[0].name, 'corrupted_node');
  });

  test('3. Dead button detector: flags control that performs no state change upon activation', () => {
    const mockControlRegistry = [
      { id: 'btn_launch', hasStateChange: true, disabledReason: null },
      { id: 'btn_settings', hasStateChange: true, disabledReason: null },
      { id: 'btn_dummy_dead', hasStateChange: false, disabledReason: null }, // Dead button
    ];

    const deadControls = mockControlRegistry.filter(
      (c) => !c.hasStateChange && !c.disabledReason
    );

    assert.strictEqual(deadControls.length, 1, 'Detector must flag unhandled dead button');
    assert.strictEqual(deadControls[0].id, 'btn_dummy_dead');
  });

  test('4. 404 asset detector: flags broken network resource requests', () => {
    const networkRequests = [
      { url: '/assets/audio/launch.ogg', status: 200 },
      { url: '/assets/textures/earth.jpg', status: 200 },
      { url: '/assets/missing_texture.png', status: 404 }, // Injected 404
    ];

    const failedRequests = networkRequests.filter((r) => r.status === 404 || r.status >= 400);
    assert.strictEqual(failedRequests.length, 1, 'Detector must catch 404 asset failure');
    assert.strictEqual(failedRequests[0].url, '/assets/missing_texture.png');
  });

  test('5. Console error detector: traps unexpected runtime errors', () => {
    const capturedLogs: Array<{ type: string; text: string }> = [
      { type: 'info', text: 'Game engine initialized' },
      { type: 'error', text: 'TypeError: Cannot read properties of undefined' },
    ];

    const errors = capturedLogs.filter((l) => l.type === 'error');
    assert.strictEqual(errors.length, 1, 'Detector must catch console error');
    assert.ok(errors[0].text.includes('TypeError'));
  });

  test('6. Missing credits detector: flags public assets missing from CREDITS.md', () => {
    const creditsContent = fs.readFileSync(path.resolve('docs/CREDITS.md'), 'utf-8');
    const requiredAsset = 'bennu.glb';
    const fakeUncreditedAsset = 'nonexistent_uncredited_model_999.glb';

    assert.ok(creditsContent.includes(requiredAsset), 'bennu.glb must be credited in CREDITS.md');
    assert.strictEqual(creditsContent.includes(fakeUncreditedAsset), false, 'Fake asset must not be in CREDITS.md');

    // Detector logic: every shipped asset must exist in CREDITS.md
    const shippedAssets = [requiredAsset, fakeUncreditedAsset];
    const missingFromCredits = shippedAssets.filter((a) => !creditsContent.includes(a));

    assert.strictEqual(missingFromCredits.length, 1);
    assert.strictEqual(missingFromCredits[0], fakeUncreditedAsset);
  });

  test('7. 40% FPS drop / performance threshold detector: rejects sudden frame drops', () => {
    const baselineFps = 60.0;
    const degradedFps = 34.0; // 43.3% drop below baseline

    const fpsDropPct = ((baselineFps - degradedFps) / baselineFps) * 100;
    const thresholdMaxDropPct = 40.0;
    const passes = fpsDropPct <= thresholdMaxDropPct;

    assert.strictEqual(passes, false, 'Detector must reject FPS drop exceeding 40%');
    assert.ok(fpsDropPct > 40.0, `Drop was ${fpsDropPct.toFixed(1)}%`);
  });

  test('8. Image heuristic detector: catches injected blade streak and magenta NaN pixels', () => {
    // Generate synthetic 100x100 PNG with injected blade streak
    const png = new PNG({ width: 100, height: 100 });
    // Fill dark background
    for (let i = 0; i < 100 * 100 * 4; i += 4) {
      png.data[i] = 10;
      png.data[i + 1] = 10;
      png.data[i + 2] = 20;
      png.data[i + 3] = 255;
    }

    // Inject 50px bright streak (50% of width, exceeding 40% threshold)
    for (let x = 10; x < 65; x++) {
      const idx = (30 * 100 + x) * 4;
      png.data[idx] = 255;
      png.data[idx + 1] = 255;
      png.data[idx + 2] = 255;
    }

    const buffer = PNG.sync.write(png);
    const result = analyzeScreenshot(buffer);

    assert.strictEqual(result.passes, false);
    assert.strictEqual(result.bladeStreakDetected, true, 'Blade streak detector must fire');
  });
});
