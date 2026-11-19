import { launchRealGpuBrowser } from '../qa/helpers/gpu';

async function main() {
  const { browser, page, gpu } = await launchRealGpuBrowser();
  console.log('[Test] GPU:', gpu.unmaskedRenderer);

  // Wait for QA harness to mount
  await page.waitForFunction(() => Boolean((window as any).__QA__?.isReady), { timeout: 10000 });

  // Jump to launch pad scene
  await page.evaluate(async () => {
    const qa = (window as any).__QA__;
    await qa.jumpToScene('launch');
    await qa.waitUntilIdle();
  });

  await page.waitForTimeout(1000);

  // Hook renderBufferDirect and capture 1 frame
  const frameAudit = await page.evaluate(async () => {
    const appContext = (window as any).__QA_APP_CONTEXT__;
    const sceneManager = appContext.getSceneManager();
    const renderer = sceneManager.renderer;

    const calls: Array<{
      objectName: string;
      objectType: string;
      parentName: string;
      pass: 'main' | 'shadow';
      isInstanced: boolean;
      instanceCount: number;
      triangles: number;
      callsAdded?: number;
      partId?: string;
    }> = [];

    const origRenderBufferDirect = renderer.renderBufferDirect.bind(renderer);

    let capturing = false;

    // We intercept renderBufferDirect during a single render() call
    renderer.renderBufferDirect = function(
      camera: any,
      scene: any,
      geometry: any,
      material: any,
      object: any,
      group: any
    ) {
      if (capturing) {
        const isShadow = renderer.getRenderTarget() !== null;
        const trisBefore = renderer.info.render.triangles;
        const callsBefore = renderer.info.render.calls;

        const res = origRenderBufferDirect(camera, scene, geometry, material, object, group);

        const trisDelta = renderer.info.render.triangles - trisBefore;
        const callsDelta = renderer.info.render.calls - callsBefore;

        const isInstanced = Boolean(object.isInstancedMesh);
        const instanceCount = isInstanced ? (object.count || 1) : 1;

        calls.push({
          objectName: object.name || '(unnamed)',
          objectType: object.type,
          parentName: object.parent?.name || '(no-parent)',
          pass: isShadow ? 'shadow' : 'main',
          isInstanced,
          instanceCount,
          triangles: trisDelta,
          callsAdded: callsDelta,
          partId: object.userData?.partId || object.userData?.explodePartId,
        });

        return res;
      }
      return origRenderBufferDirect(camera, scene, geometry, material, object, group);
    };

    // Trigger one clean frame render
    renderer.info.reset();
    capturing = true;
    renderer.render(sceneManager.scene, sceneManager.camera);
    capturing = false;

    // Restore original function
    renderer.renderBufferDirect = origRenderBufferDirect;

    const infoCalls = renderer.info.render.calls;
    const infoTris = renderer.info.render.triangles;

    return {
      totalLoggedCalls: calls.length,
      infoCalls,
      totalLoggedTris: calls.reduce((s, c) => s + c.triangles, 0),
      infoTris,
      calls,
    };
  });

  console.log('Result:');
  console.log(`Calls: logged ${frameAudit.totalLoggedCalls} vs renderer.info ${frameAudit.infoCalls}`);
  console.log(`Tris: logged ${frameAudit.totalLoggedTris} vs renderer.info ${frameAudit.infoTris}`);

  const shadowCalls = frameAudit.calls.filter(c => c.pass === 'shadow');
  const mainCalls = frameAudit.calls.filter(c => c.pass === 'main');
  console.log(`Main pass calls: ${mainCalls.length}, Shadow pass calls: ${shadowCalls.length}`);

  await browser.close();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
