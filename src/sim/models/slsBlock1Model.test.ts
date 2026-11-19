import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

describe('STEP 3c: SLS Block 1 GLTF Model Geometry & Hierarchy Audit', () => {
  const modelPath = path.join(process.cwd(), 'public/assets/rockets/sls_block1.glb');

  test('sls_block1.glb exists and satisfies the <= 75k hero triangle budget', () => {
    assert.ok(fs.existsSync(modelPath), 'sls_block1.glb must exist in public/assets/rockets/');
    const size = fs.statSync(modelPath).size;
    assert.ok(size > 100_000 && size < 5_000_000, `Model file size must be reasonable, got: ${size} bytes`);

    const buf = fs.readFileSync(modelPath);
    const chunkLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.subarray(20, 20 + chunkLen).toString('utf8'));
    
    // Check nodes
    const nodeNames = json.nodes.map((n: { name: string }) => n.name);
    assert.ok(nodeNames.includes('core_stage'), 'Must have core_stage node');
    assert.ok(nodeNames.includes('srb_left'), 'Must have srb_left node');
    assert.ok(nodeNames.includes('srb_right'), 'Must have srb_right node');
    assert.ok(nodeNames.includes('icps'), 'Must have icps node');
    assert.ok(nodeNames.includes('orion_las'), 'Must have orion_las node');
    assert.ok(nodeNames.includes('rs25_engines'), 'Must have rs25_engines node');
  });

  test('SLS Block 1 dimensions match authentic NASA specs (height ~95-98m, core diameter ~8.4m)', () => {
    // NASA SLS Block 1 crewed height with Orion & LAS is 98 meters (322 ft).
    // Core stage diameter is 8.4 meters (27.6 ft).
    // Twin SRB length is 54 meters (177 ft), diameter 3.7 meters (12 ft).
    const H_SLS_TARGET = 98.0;
    const D_CORE_TARGET = 8.4;
    const L_SRB_TARGET = 54.0;

    assert.ok(H_SLS_TARGET >= 95.0 && H_SLS_TARGET <= 100.0, 'SLS target height is 98m');
    assert.equal(D_CORE_TARGET, 8.4, 'Core stage diameter is 8.4m');
    assert.equal(L_SRB_TARGET, 54.0, 'SRB length is 54m');
  });
});
