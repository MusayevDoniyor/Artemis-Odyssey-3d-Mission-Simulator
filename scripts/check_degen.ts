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

  for (const mesh of root.listMeshes()) {
    let mDegen = 0;
    let mTotal = 0;
    const sampleDegen = [];

    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const ind = prim.getIndices();
      if (!pos || !ind) continue;

      const tCount = ind.getCount() / 3;
      mTotal += tCount;

      for (let i = 0; i < tCount; i++) {
        const i0 = ind.getScalar(i * 3);
        const i1 = ind.getScalar(i * 3 + 1);
        const i2 = ind.getScalar(i * 3 + 2);

        const p0 = pos.getElement(i0, [0, 0, 0]);
        const p1 = pos.getElement(i1, [0, 0, 0]);
        const p2 = pos.getElement(i2, [0, 0, 0]);

        if (i0 === i1 || i1 === i2 || i0 === i2) {
          mDegen++;
          if (sampleDegen.length < 3) sampleDegen.push({ reason: 'duplicate indices', i0, i1, i2 });
          continue;
        }

        const u = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
        const v = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
        const cx = u[1] * v[2] - u[2] * v[1];
        const cy = u[2] * v[0] - u[0] * v[2];
        const cz = u[0] * v[1] - u[1] * v[0];
        const area = 0.5 * Math.hypot(cx, cy, cz);

        if (area <= 1e-7) {
          mDegen++;
          if (sampleDegen.length < 3) sampleDegen.push({ reason: 'collinear/zero-area', area, p0, p1, p2 });
        }
      }
    }

    console.log(`Mesh "${mesh.getName()}": degenerate = ${mDegen} / ${mTotal} (${((mDegen/mTotal)*100).toFixed(2)}%)`);
    if (sampleDegen.length > 0) {
      console.log('  sample:', JSON.stringify(sampleDegen[0]));
    }
  }
}

main().catch(console.error);
