import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';

async function inspectNodes(glbPath: string) {
  const dec = await draco3d.createDecoderModule();
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': dec,
      'meshopt.decoder': MeshoptDecoder,
    });

  const doc = await io.read(glbPath);
  const root = doc.getRoot();

  console.log(`\n==================================================`);
  console.log(`Inspecting nodes of: ${glbPath}`);
  console.log(`==================================================`);

  for (const node of root.listNodes()) {
    const mesh = node.getMesh();
    const t = node.getTranslation();
    const r = node.getRotation();
    const s = node.getScale();
    const matrix = node.getMatrix();

    let vCount = 0;
    let tCount = 0;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        const indices = prim.getIndices();
        if (pos) {
          vCount += pos.getCount();
          for (let i = 0; i < pos.getCount(); i++) {
            const p = pos.getElement(i, [0, 0, 0]) as [number, number, number];
            if (p[0] < minX) minX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[2] < minZ) minZ = p[2];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] > maxY) maxY = p[1];
            if (p[2] > maxZ) maxZ = p[2];
          }
        }
        if (indices) {
          tCount += indices.getCount() / 3;
        } else if (pos) {
          tCount += pos.getCount() / 3;
        }
      }
    }

    console.log(`Node "${node.getName()}":`);
    console.log(`  Translation: [${t.map(v => v.toFixed(3)).join(', ')}]`);
    console.log(`  Scale:       [${s.map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`  Mesh:        ${mesh ? mesh.getName() : 'none'} (Vertices: ${vCount}, Triangles: ${tCount})`);
    if (vCount > 0) {
      const sizeX = maxX - minX;
      const sizeY = maxY - minY;
      const sizeZ = maxZ - minZ;
      console.log(`  Local Bounds: [${minX.toFixed(2)}, ${minY.toFixed(2)}, ${minZ.toFixed(2)}] to [${maxX.toFixed(2)}, ${maxY.toFixed(2)}, ${maxZ.toFixed(2)}]`);
      console.log(`  Local Size:   [${sizeX.toFixed(2)}, ${sizeY.toFixed(2)}, ${sizeZ.toFixed(2)}] (Diagonal: ${Math.hypot(sizeX, sizeY, sizeZ).toFixed(2)})`);
    }
  }
}

async function main() {
  await inspectNodes('public/assets/rockets/sls_block1.glb');
  await inspectNodes('public/assets/structures/mobile_launcher.glb');
}

main().catch(console.error);
