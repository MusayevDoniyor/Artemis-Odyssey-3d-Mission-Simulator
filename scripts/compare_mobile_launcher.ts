import { launchRealGpuBrowser } from '../qa/helpers/gpu';

async function main() {
  const { browser, page } = await launchRealGpuBrowser();
  
  const results = await page.evaluate(async () => {
    // Three is available via window or we can dynamic import
    const THREE = await import('three');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');

    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    async function load(url: string) {
      return new Promise<any>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
    }

    const oldG = await load('/assets/structures/mobile_launcher.glb');
    // Also let's check corrupt fixture if accessible or inspect old vs new
    
    function dumpHierarchy(scene: any) {
      const meshes: any[] = [];
      scene.traverse((o: any) => {
        if (o.isMesh) {
          let tris = 0;
          if (o.geometry.index) tris = o.geometry.index.count / 3;
          else if (o.geometry.attributes.position) tris = o.geometry.attributes.position.count / 3;
          meshes.push({
            name: o.name || '(unnamed)',
            parent: o.parent?.name || 'none',
            tris,
            position: [o.position.x, o.position.y, o.position.z],
            scale: [o.scale.x, o.scale.y, o.scale.z]
          });
        }
      });
      return meshes;
    }

    return {
      currentML: dumpHierarchy(oldG.scene),
      totalTris: dumpHierarchy(oldG.scene).reduce((s, m) => s + m.tris, 0)
    };
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
}

main().catch(console.error);
