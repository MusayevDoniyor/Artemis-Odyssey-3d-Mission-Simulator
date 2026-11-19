import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { simplify } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptDecoder } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

async function main() {
  const dec = await draco3d.createDecoderModule();
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': dec,
      'meshopt.decoder': MeshoptDecoder,
    });

  const glbPath = 'public/assets/rockets/sls_block1.glb';
  const doc = await io.read(glbPath);

  console.log('Simplifying SLS Block 1 to budget <= 75k tris using MeshoptSimplifier...');
  
  await doc.transform(
    simplify({
      simplifier: MeshoptSimplifier,
      ratio: 0.75,
      error: 0.001,
      lockBorder: false,
    })
  );

  let totalTris = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const ind = prim.getIndices();
      if (ind) totalTris += ind.getCount() / 3;
    }
  }

  console.log(`Simplified total triangles: ${totalTris}`);

  await io.write(glbPath, doc);
  console.log(`Wrote simplified GLB to ${glbPath}`);
}

main().catch(console.error);
