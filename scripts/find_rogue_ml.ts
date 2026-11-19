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

  const doc = await io.read('public/assets/structures/mobile_launcher.glb');
  const root = doc.getRoot();

  console.log('Inspecting mobile_launcher.glb:');

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    if (!mesh) continue;

    const mat = node.getMatrix();
    console.log(`Node "${node.getName()}", scale: [${node.getScale().join(', ')}]`);

    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      const ind = prim.getIndices();
      if (!pos || !ind) continue;

      const pCount = pos.getCount();
      const tCount = ind.getCount() / 3;

      let longEdgeCount = 0;
      let maxEdge = 0;

      for (let i = 0; i < tCount; i++) {
        const i0 = ind.getScalar(i * 3);
        const i1 = ind.getScalar(i * 3 + 1);
        const i2 = ind.getScalar(i * 3 + 2);

        const p0 = pos.getElement(i0, [0, 0, 0]);
        const p1 = pos.getElement(i1, [0, 0, 0]);
        const p2 = pos.getElement(i2, [0, 0, 0]);

        const e0 = Math.hypot(p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]);
        const e1 = Math.hypot(p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]);
        const e2 = Math.hypot(p0[0]-p2[0], p0[1]-p2[1], p0[2]-p2[2]);

        const me = Math.max(e0, e1, e2);
        if (me > maxEdge) maxEdge = me;
        if (me > 1.5) {
          longEdgeCount++;
        }
      }

      console.log(`  Primitive: Triangles=${tCount}, MaxEdge=${maxEdge.toFixed(3)}, LongEdges(>1.5)=${longEdgeCount}`);
    }
  }
}

main().catch(console.error);
