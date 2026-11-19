import { NodeIO } from '@gltf-transform/core';
import { KHRDracoMeshCompression } from '@gltf-transform/extensions';
import { draco } from '@gltf-transform/functions';
import draco3d from 'draco3dgltf';
import fs from 'fs';
import path from 'path';

async function compressSls() {
  const dec = await draco3d.createDecoderModule();
  const enc = await draco3d.createEncoderModule();

  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression])
    .registerDependencies({
      'draco3d.decoder': dec,
      'draco3d.encoder': enc,
    });

  const targetPath = path.resolve('public/assets/rockets/sls_block1.glb');
  console.log('Reading:', targetPath);
  const doc = await io.read(targetPath);

  console.log('Applying Draco compression...');
  await doc.transform(
    draco({
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12,
    })
  );

  const outBytes = await io.writeBinary(doc);
  fs.writeFileSync(targetPath, Buffer.from(outBytes));

  console.log(`Saved compressed sls_block1.glb: ${outBytes.byteLength} bytes (${(outBytes.byteLength / (1024 * 1024)).toFixed(2)} MB)`);
}

compressSls().catch(console.error);
