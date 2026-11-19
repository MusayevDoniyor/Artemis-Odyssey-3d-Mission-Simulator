import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';

async function check() {
  const dec = await draco3d.createDecoderModule();
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': dec,
      'meshopt.decoder': MeshoptDecoder,
    });
  const doc = await io.read('public/assets/rockets/sls_block1.glb');
  const root = doc.getRoot();
  const scene = root.getDefaultScene() || root.listScenes()[0];
  console.log('Scene name:', scene?.getName());
  console.log('Root children:');
  for (const n of scene?.listChildren() || []) {
    console.log('-', n.getName(), 'mesh:', n.getMesh()?.getName(), 'translation:', n.getTranslation(), 'scale:', n.getScale());
    for (const c of n.listChildren()) {
      console.log('  ->', c.getName(), 'mesh:', c.getMesh()?.getName(), 'translation:', c.getTranslation(), 'scale:', c.getScale());
    }
  }
}
check();
