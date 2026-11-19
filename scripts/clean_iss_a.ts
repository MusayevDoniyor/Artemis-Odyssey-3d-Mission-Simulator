import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, dedup, prune } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';

async function cleanISS() {
  const io = new NodeIO()
    .registerExtensions(KHRONOS_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  const doc = await io.read('scratch/iss_candidate_a_7k.glb');
  
  // Custom filter for zero-area / degenerate triangles
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const idx = prim.getIndices();
      if (!pos || !idx) continue;

      const indices = idx.getArray();
      if (!indices) continue;
      const newIndices: number[] = [];
      const posArray = pos.getArray();
      if (!posArray) continue;

      for (let i = 0; i < indices.length; i += 3) {
        const i0 = indices[i];
        const i1 = indices[i + 1];
        const i2 = indices[i + 2];

        // check if indices are duplicate
        if (i0 === i1 || i1 === i2 || i0 === i2) continue;

        // check vertex position duplication / zero area
        const x0 = posArray[i0 * 3], y0 = posArray[i0 * 3 + 1], z0 = posArray[i0 * 3 + 2];
        const x1 = posArray[i1 * 3], y1 = posArray[i1 * 3 + 1], z1 = posArray[i1 * 3 + 2];
        const x2 = posArray[i2 * 3], y2 = posArray[i2 * 3 + 1], z2 = posArray[i2 * 3 + 2];

        const ux = x1 - x0, uy = y1 - y0, uz = z1 - z0;
        const vx = x2 - x0, vy = y2 - y0, vz = z2 - z0;

        const cx = uy * vz - uz * vy;
        const cy = uz * vx - ux * vz;
        const cz = ux * vy - uy * vx;

        const areaSq = cx * cx + cy * cy + cz * cz;
        if (areaSq < 1e-12) {
          // Degenerate triangle! Skip it!
          continue;
        }

        newIndices.push(i0, i1, i2);
      }

      console.log(`Original indices: ${indices.length} (${indices.length / 3} tris) -> Cleaned: ${newIndices.length} (${newIndices.length / 3} tris)`);
      idx.setArray(new Uint32Array(newIndices));
    }
  }

  await doc.transform(
    weld(),
    dedup(),
    prune()
  );

  await io.write('scratch/iss_cleaned_a.glb', doc);
  console.log('Saved scratch/iss_cleaned_a.glb');
}

cleanISS().catch(console.error);
