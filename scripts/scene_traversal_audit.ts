import { launchRealGpuBrowser } from '../qa/helpers/gpu';
import fs from 'fs';
import path from 'path';

interface SubsystemData {
  mainCalls: number;
  shadowCalls: number;
  totalCalls: number;
  mainTris: number;
  shadowTris: number;
  totalTris: number;
  uniqueTris: number;
}

interface SceneAuditResult {
  sceneName: string;
  sceneId: string;
  rendererCalls: number;
  rendererTriangles: number;
  geometries: number;
  textures: number;
  bySubsystem: Record<string, SubsystemData>;
}

export async function runTraversalAudit(): Promise<SceneAuditResult[]> {
  console.log('Launching real GPU browser for scene traversal audit...');
  const { browser, page, gpu } = await launchRealGpuBrowser();
  console.log(`GPU Verified: ${gpu.unmaskedRenderer}\n`);

  const targets = [
    { name: 'Launch Pad (Wide)', id: 'launch', params: {} },
    { name: 'Title Screen (Hero)', id: 'title', params: {} },
    { name: 'Mission Briefing', id: 'briefing', params: { tab: 'objectives' } },
    { name: 'Settings Console', id: 'settings', params: {} },
    { name: 'Hardware Bay: SLS Block 1', id: 'hardware_bay', params: { craft: 'rocket' } },
    { name: 'Hardware Bay: LM-2 Lander', id: 'hardware_bay', params: { craft: 'lander' } },
    { name: 'Hardware Bay: Lunar Rover', id: 'hardware_bay', params: { craft: 'rover' } },
    { name: 'Hardware Bay: ISS', id: 'hardware_bay', params: { craft: 'iss' } },
    { name: 'Hardware Bay: JWST', id: 'hardware_bay', params: { craft: 'jwst' } },
  ];

  const results: SceneAuditResult[] = [];

  for (const target of targets) {
    console.log(`========================================================================================`);
    console.log(`SCENE: ${target.name} (id: ${target.id})`);
    console.log(`========================================================================================`);

    await page.evaluate(`(async () => {
      await window.__QA__?.jumpToScene('${target.id}', ${JSON.stringify(target.params)});
      await window.__QA__?.waitUntilIdle(5000);
    })()`);
    await page.waitForTimeout(1000);

    const auditData = (await page.evaluate(`(async () => {
      const sm = window.__QA_APP_CONTEXT__?.getSceneManager?.();
      if (!sm || !sm.scene || !sm.renderer) {
        return { error: 'SceneManager not available' };
      }

      const renderer = sm.renderer;
      const mainCam = sm.camera;
      const origRender = renderer.render.bind(renderer);
      const origRenderBufferDirect = renderer.renderBufferDirect.bind(renderer);

      function getSubsystemName(obj) {
        let names = [];
        let curr = obj;
        while (curr && curr !== sm.scene) {
          if (curr.name) names.push(curr.name);
          curr = curr.parent;
        }
        const joined = names.join(' > ');
        if (joined.includes('sls-core') || joined.includes('core_stage')) return 'SLS Core Stage';
        if (joined.includes('sls-boosters') || joined.includes('srb')) return 'SLS Twin SRBs';
        if (joined.includes('sls-rs25') || joined.includes('rs25')) return 'SLS RS-25 Engines';
        if (joined.includes('sls-icps') || joined.includes('icps')) return 'SLS ICPS';
        if (joined.includes('sls-orion') || joined.includes('orion_cm')) return 'Orion Crew Module';
        if (joined.includes('sls-las') || joined.includes('orion_las')) return 'Launch Abort System';
        if (joined.includes('sls-esm') || joined.includes('orion_esm')) return 'European Service Module';
        if (joined.includes('lc39b-tower') || joined.includes('tower')) return 'LC-39B Umbilical Tower';
        if (joined.includes('mobile_launcher') || joined.includes('mlp') || joined.includes('trench')) return 'Mobile Launcher & Trench';
        if (joined.includes('VAB') || joined.includes('Vehicle_Assembly')) return 'VAB & Industrial Complex';
        if (joined.includes('lunar') || joined.includes('terrain') || joined.includes('crater')) return 'Lunar Terrain & Craters';
        if (joined.includes('lander') || joined.includes('lm-')) return 'Apollo LM-2 Lander';
        if (joined.includes('rover') || joined.includes('wheel')) return 'Lunar Rover / VIPER';
        if (joined.includes('hab') || joined.includes('kilopower')) return 'Base Camp Outpost Hab';
        if (obj.geometry?.type === 'SphereGeometry' && obj.material?.side === 1) return 'Sky Dome & Horizon';
        if (obj.isSprite) return 'Atmospheric Cloud Deck';
        if (obj.geometry?.type === 'CircleGeometry') return 'Pad Ground Plane';
        if (joined.includes('bayTurntable') || joined.includes('turntable')) return 'Hardware Bay Turntable';
        if (joined.includes('iss')) return 'ISS Model Structure';
        if (joined.includes('jwst')) return 'JWST Model Structure';
        if (joined.includes('saturn-v')) return 'Saturn V Vehicle';
        return names[0] || 'Environment & Scenery';
      }

      let activeFrameRecords = [];
      let completedFrameRecords = null;
      let capturing = true;

      renderer.renderBufferDirect = function(camera, scene, geometry, material, object, group) {
        if (capturing) {
          const isShadow = (camera !== mainCam) || (material && (material.isMeshDepthMaterial || material.isMeshDistanceMaterial));
          
          let tris = 0;
          if (geometry.index) {
            tris = geometry.index.count / 3;
          } else if (geometry.attributes && geometry.attributes.position) {
            tris = geometry.attributes.position.count / 3;
          }
          if (object.isInstancedMesh && object.count) {
            tris *= object.count;
          }
          
          activeFrameRecords.push({
            subsystem: getSubsystemName(object),
            meshName: object.name || (object.isInstancedMesh ? 'InstancedMesh' : 'unnamed'),
            isShadow,
            tris: Math.round(tris)
          });
        }
        return origRenderBufferDirect(camera, scene, geometry, material, object, group);
      };

      renderer.render = function(scene, camera) {
        if (capturing) {
          activeFrameRecords = [];
        }
        origRender(scene, camera);
        if (capturing && activeFrameRecords.length > 0) {
          completedFrameRecords = [...activeFrameRecords];
          capturing = false;
        }
      };

      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      renderer.render = origRender;
      renderer.renderBufferDirect = origRenderBufferDirect;

      const records = completedFrameRecords || [];
      const bySubsystem = {};

      for (const r of records) {
        if (!bySubsystem[r.subsystem]) {
          bySubsystem[r.subsystem] = {
            mainCalls: 0,
            shadowCalls: 0,
            totalCalls: 0,
            mainTris: 0,
            shadowTris: 0,
            totalTris: 0,
            uniqueTris: 0,
          };
        }
        const g = bySubsystem[r.subsystem];
        if (r.isShadow) {
          g.shadowCalls++;
          g.shadowTris += r.tris;
        } else {
          g.mainCalls++;
          g.mainTris += r.tris;
          g.uniqueTris += r.tris;
        }
        g.totalCalls++;
        g.totalTris += r.tris;
      }

      return {
        rendererCalls: renderer.info.render.calls,
        rendererTriangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        bySubsystem
      };
    })()`)) as any;

    if (auditData.error) {
      console.log('Error:', auditData.error);
      continue;
    }

    const { rendererCalls, rendererTriangles, geometries, textures, bySubsystem } = auditData;

    console.log(`\nTHREE.js Renderer Info:`);
    console.log(`  - Total Render Calls:     ${rendererCalls}`);
    console.log(`  - Total Render Triangles: ${rendererTriangles.toLocaleString()}`);
    console.log(`  - Active Geometries:      ${geometries}`);
    console.log(`  - Active Textures:        ${textures}`);

    console.log(`\nPer-Group Measured Breakdown (Main Pass vs Shadow Pass):`);
    console.log(
      `| ${'Object Group / Subsystem'.padEnd(30)} | ${'MainCalls'.padStart(9)} | ${'ShadCalls'.padStart(9)} | ${'TotCalls'.padStart(8)} | ${'UniqueTris'.padStart(10)} | ${'ShadTris'.padStart(10)} | ${'TotalTris'.padStart(10)} |`
    );
    console.log(
      `|--------------------------------|-----------|-----------|----------|------------|------------|------------|`
    );

    let sumMainCalls = 0;
    let sumShadowCalls = 0;
    let sumTotalCalls = 0;
    let sumUniqueTris = 0;
    let sumShadowTris = 0;
    let sumTotalTris = 0;

    for (const [sName, g] of Object.entries(bySubsystem as Record<string, SubsystemData>)) {
      sumMainCalls += g.mainCalls;
      sumShadowCalls += g.shadowCalls;
      sumTotalCalls += g.totalCalls;
      sumUniqueTris += g.uniqueTris;
      sumShadowTris += g.shadowTris;
      sumTotalTris += g.totalTris;

      console.log(
        `| ${sName.padEnd(30)} | ${String(g.mainCalls).padStart(9)} | ${String(g.shadowCalls).padStart(9)} | ${String(g.totalCalls).padStart(8)} | ${String(g.uniqueTris).padStart(10)} | ${String(g.shadowTris).padStart(10)} | ${String(g.totalTris).padStart(10)} |`
      );
    }

    console.log(
      `|--------------------------------|-----------|-----------|----------|------------|------------|------------|`
    );
    console.log(
      `| ${'SUM OF GROUPS'.padEnd(30)} | ${String(sumMainCalls).padStart(9)} | ${String(sumShadowCalls).padStart(9)} | ${String(sumTotalCalls).padStart(8)} | ${String(sumUniqueTris).padStart(10)} | ${String(sumShadowTris).padStart(10)} | ${String(sumTotalTris).padStart(10)} |`
    );
    console.log(
      `| ${'RENDERER.INFO (Actual)'.padEnd(30)} | ${'—'.padStart(9)} | ${'—'.padStart(9)} | ${String(rendererCalls).padStart(8)} | ${'—'.padStart(10)} | ${'—'.padStart(10)} | ${String(rendererTriangles).padStart(10)} |\n`
    );

    results.push({
      sceneName: target.name,
      sceneId: target.id,
      rendererCalls,
      rendererTriangles,
      geometries,
      textures,
      bySubsystem
    });
  }

  await browser.close();

  // Save audit data to docs/qa/scene_traversal_audit.json
  fs.writeFileSync('docs/qa/scene_traversal_audit.json', JSON.stringify(results, null, 2));
  console.log('Saved docs/qa/scene_traversal_audit.json');

  return results;
}

if (process.argv[1]?.endsWith('scene_traversal_audit.ts')) {
  runTraversalAudit().catch(console.error);
}
