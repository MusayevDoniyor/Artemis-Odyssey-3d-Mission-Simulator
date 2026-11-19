import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';

async function main() {
  const dec = await draco3d.createDecoderModule();
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': dec,
      'meshopt.decoder': MeshoptDecoder,
    });

  const doc = await io.read('public/assets/rockets/sls_block1.glb');
  const root = doc.getRoot();

  console.log('Finding rogue triangles in sls_block1.glb:');

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;

    const t = node.getTranslation();
    const r = node.getRotation();
    const s = node.getScale();
    const mat = node.getMatrix();

    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const ind = prim.getIndices();
      if (!pos || !ind) continue;

      const pCount = pos.getCount();
      const tCount = ind.getCount() / 3;

      let rogueCount = 0;
      const rogueTriangles = [];

      for (let i = 0; i < tCount; i++) {
        const i0 = ind.getScalar(i * 3);
        const i1 = ind.getScalar(i * 3 + 1);
        const i2 = ind.getScalar(i * 3 + 2);

        const p0 = pos.getElement(i0, [0, 0, 0]);
        const p1 = pos.getElement(i1, [0, 0, 0]);
        const p2 = pos.getElement(i2, [0, 0, 0]);

        // Transform to world space
        // mat is column-major 16 floats
        const wp = [p0, p1, p2].map(([x, y, z]) => [
          mat[0] * x + mat[4] * y + mat[8] * z + mat[12],
          mat[1] * x + mat[5] * y + mat[9] * z + mat[13],
          mat[2] * x + mat[6] * y + mat[10] * z + mat[14],
        ]);

        // Check if any vertex is outside normal rocket cylinder
        // SLS rocket is centered near (0, 0), radius ~5m, height 0 to 98m
        const isRogue = wp.some(([wx, wy, wz]) => 
          wx < -12 || wx > 12 || wz < -12 || wz > 12 || wy < -1 || wy > 105
        );

        if (isRogue) {
          rogueCount++;
          if (rogueTriangles.length < 5) {
            rogueTriangles.push({
              triIndex: i,
              worldCoords: wp,
              localCoords: [p0, p1, p2],
            });
          }
        }
      }

      console.log(`Node "${node.getName()}" / Primitive: rogue triangles = ${rogueCount} / ${tCount} (${((rogueCount / tCount) * 100).toFixed(2)}%)`);
      if (rogueTriangles.length > 0) {
        console.log(`  Sample rogue triangle:`, JSON.stringify(rogueTriangles[0]));
      }
    }
  }
}

main().catch(console.error);
