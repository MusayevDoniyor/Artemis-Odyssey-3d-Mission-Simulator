import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import path from 'node:path';

describe('SLS Block 1 Per-Part Dimension Audit', async () => {
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
    });

  const modelPath = path.resolve(process.cwd(), 'public/assets/rockets/sls_block1.glb');
  const doc = await io.read(modelPath);
  const root = doc.getRoot();

  function getNodeBounds(nodeName: string) {
    const node = root.listNodes().find(n => n.getName() === nodeName);
    assert.ok(node, `Node ${nodeName} must exist in sls_block1.glb`);
    const mesh = node.getMesh();
    assert.ok(mesh, `Node ${nodeName} must contain a mesh`);

    let minY = Infinity, maxY = -Infinity;
    let minX = Infinity, maxX = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      assert.ok(pos, `Primitive must have POSITION attribute`);
      const count = pos.getCount();
      for (let i = 0; i < count; i++) {
        const [x, y, z] = pos.getElement(i, [0, 0, 0]);
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    return {
      nodeName,
      minY,
      maxY,
      height: maxY - minY,
      width: maxX - minX,
      depth: maxZ - minZ
    };
  }

  it('Core Stage dimensions match 212 ft tankage plus forward LVSA adapter', () => {
    const b = getNodeBounds('core_stage');
    // Core Stage in CAD extends from Y=3.09 to Y=76.32 m (height: 73.23m)
    assert.ok(Math.abs(b.height - 73.23) < 0.2, `Core Stage height should be ~73.23m (got ${b.height.toFixed(2)})`);
    assert.ok(Math.abs(b.width - 8.85) < 0.2, `Core Stage diameter should be ~8.4-8.8m (got ${b.width.toFixed(2)})`);
  });

  it('Solid Rocket Boosters (SRBs) identify 3.13m difference vs published 53.95m', () => {
    const bL = getNodeBounds('srb_left');
    const bR = getNodeBounds('srb_right');
    assert.ok(Math.abs(bL.height - 50.82) < 0.2, `SRB height should be ~50.82m (got ${bL.height.toFixed(2)})`);
    assert.ok(Math.abs(bR.height - 50.82) < 0.2, `SRB right height should be ~50.82m (got ${bR.height.toFixed(2)})`);
    
    // Published NASA SRB length: 53.95 m (177 ft)
    const publishedSrbHeight = 53.95;
    const srbDelta = publishedSrbHeight - bL.height;
    assert.ok(Math.abs(srbDelta - 3.13) < 0.2, `SRB deficit must be precisely ~3.13m (calculated ${srbDelta.toFixed(2)}m)`);
  });

  it('Launch Abort System (LAS) identifies 0.98m difference vs published 15.24m', () => {
    const b = getNodeBounds('orion_las');
    assert.ok(Math.abs(b.height - 14.26) < 0.2, `LAS height should be ~14.26m (got ${b.height.toFixed(2)})`);
    
    // Published NASA LAS length: 15.24 m (50 ft)
    const publishedLasHeight = 15.24;
    const lasDelta = publishedLasHeight - b.height;
    assert.ok(Math.abs(lasDelta - 0.98) < 0.2, `LAS deficit must be precisely ~0.98m (calculated ${lasDelta.toFixed(2)}m)`);
  });

  it('Total Stack Height reconciliation: net 94.62m 3D bounding envelope vs 98.3m published', () => {
    const rs25 = getNodeBounds('rs25_engines');
    const las = getNodeBounds('orion_las');
    
    const stackBottom = rs25.minY; // 0.83m
    const stackTop = las.maxY;     // 95.45m
    const totalHeight = stackTop - stackBottom;

    assert.ok(Math.abs(totalHeight - 94.62) < 0.2, `Total 3D stack height should be ~94.62m (got ${totalHeight.toFixed(2)})`);
    
    const publishedStack = 98.3; // 322.5 ft
    const totalDeficit = publishedStack - totalHeight;
    assert.ok(Math.abs(totalDeficit - 3.68) < 0.2, `Total deficit must equal 3.68m (calculated ${totalDeficit.toFixed(2)}m)`);
  });
});
