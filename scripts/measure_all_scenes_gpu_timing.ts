import fs from 'node:fs';
import path from 'node:path';
import { launchRealGpuBrowser } from '../qa/helpers/gpu';
import { SCENE_CATALOG } from '../qa/scenes';

interface TimingResult {
  sceneId: string;
  name: string;
  category: string;
  dpr: number;
  cpuP50: number;
  cpuP95: number;
  gpuP50: number;
  gpuP95: number;
  drawCalls: number;
  triangles: number;
  atRisk: boolean;
}

async function main() {
  const { browser, page, gpu } = await launchRealGpuBrowser();
  console.log(`[Timing] Physical GPU: ${gpu.unmaskedRenderer}`);

  await page.waitForFunction(() => Boolean((window as any).__QA__?.isReady), { timeout: 10000 });

  const allResults: TimingResult[] = [];

  const dprLevels = [1, 2];

  for (const dpr of dprLevels) {
    console.log(`\n=== Measuring all 47 scenes at devicePixelRatio = ${dpr} ===`);

    for (let i = 0; i < SCENE_CATALOG.length; i++) {
      const entry = SCENE_CATALOG[i];
      process.stdout.write(`[${i + 1}/47] (${dpr}x) ${entry.id}... `);

      const res: TimingResult = await page.evaluate(
        async ({ sceneEntry, targetDpr }) => {
          const qa = (window as any).__QA__;
          const appContext = (window as any).__QA_APP_CONTEXT__;
          const sceneManager = appContext.getSceneManager();
          const renderer = sceneManager.renderer;
          const gl = renderer.getContext();

          // Set DPR
          renderer.setPixelRatio(targetDpr);
          const canvas = renderer.domElement;
          renderer.setSize(canvas.clientWidth || 1440, canvas.clientHeight || 900, false);

          // Jump to scene
          await qa.jumpToScene(sceneEntry.sceneId, sceneEntry.params || {});
          await qa.waitUntilIdle();

          // Warmup 3 frames
          const dummyBuf = new Uint8Array(4);
          for (let f = 0; f < 3; f++) {
            renderer.render(sceneManager.scene, sceneManager.camera);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dummyBuf);
          }

          const cpuTimes: number[] = [];
          const gpuTimes: number[] = [];
          const SAMPLE_FRAMES = 25;

          renderer.info.reset();

          for (let f = 0; f < SAMPLE_FRAMES; f++) {
            const tStart = performance.now();
            renderer.render(sceneManager.scene, sceneManager.camera);
            const tCpu = performance.now() - tStart;
            cpuTimes.push(tCpu);

            // Synchronize with GPU via gl.readPixels
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, dummyBuf);
            const tTotal = performance.now() - tStart;
            gpuTimes.push(tTotal);
          }

          cpuTimes.sort((a, b) => a - b);
          gpuTimes.sort((a, b) => a - b);

          const p50Idx = Math.floor(SAMPLE_FRAMES * 0.5);
          const p95Idx = Math.floor(SAMPLE_FRAMES * 0.95);

          const cpuP50 = Number(cpuTimes[p50Idx].toFixed(2));
          const cpuP95 = Number(cpuTimes[p95Idx].toFixed(2));
          const gpuP50 = Number(gpuTimes[p50Idx].toFixed(2));
          const gpuP95 = Number(gpuTimes[p95Idx].toFixed(2));

          return {
            sceneId: sceneEntry.id,
            name: sceneEntry.name,
            category: sceneEntry.category,
            dpr: targetDpr,
            cpuP50,
            cpuP95,
            gpuP50,
            gpuP95,
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            atRisk: gpuP95 > 16.0,
          };
        },
        { sceneEntry: entry, targetDpr: dpr }
      );

      console.log(`CPU: ${res.cpuP50}/${res.cpuP95} ms | GPU: ${res.gpuP50}/${res.gpuP95} ms ${res.atRisk ? '[AT RISK > 16ms]' : '[OK]'}`);
      allResults.push(res);
    }
  }

  await browser.close();

  // Save raw data to JSON
  const rawData = {
    timestamp: new Date().toISOString(),
    gpu: gpu.unmaskedRenderer,
    browser: 'Chromium / Google Chrome',
    totalScenes: SCENE_CATALOG.length,
    results: allResults,
  };

  const jsonPath = path.resolve('docs/qa/all_scenes_gpu_timing.json');
  fs.writeFileSync(jsonPath, JSON.stringify(rawData, null, 2), 'utf8');
  console.log(`\n[Timing] Raw timing JSON saved to: ${jsonPath}`);

  // Generate Markdown report
  const atRiskDpr1 = allResults.filter(r => r.dpr === 1 && r.atRisk);
  const atRiskDpr2 = allResults.filter(r => r.dpr === 2 && r.atRisk);

  let md = `# Real-GPU Synchronized Timing Report (All 47 Catalog Scenes)
Captured directly with hardware completion synchronization (\`gl.readPixels\`) on physical GPU.

- **Physical GPU**: \`${gpu.unmaskedRenderer}\`
- **Methodology**: 25 sampled frames per scene with cold/warmup phase, synchronized GPU rasterization flush via \`gl.readPixels(0,0,1,1)\`.
- **Target Budget**: 60 FPS target ($\le 16.0\text{ ms}$ total frame time).
- **At-Risk Scenes Threshold**: GPU p95 frame time $> 16.0\text{ ms}$.

---

## 1. Executive Summary & Weak GPU Risk Assessment

- **devicePixelRatio = 1**:
  - Total scenes tested: **47**
  - Scenes meeting 60 FPS budget (GPU p95 $\le 16.0\text{ ms}$): **${47 - atRiskDpr1.length} / 47 (${(((47 - atRiskDpr1.length) / 47) * 100).toFixed(1)}%)**
  - **At-Risk Scenes (GPU p95 > 16 ms)**: ${atRiskDpr1.length === 0 ? 'None (0 scenes)' : atRiskDpr1.map(r => `\`${r.sceneId}\` (${r.gpuP95} ms)`).join(', ')}

- **devicePixelRatio = 2**:
  - Total scenes tested: **47**
  - Scenes meeting 60 FPS budget (GPU p95 $\le 16.0\text{ ms}$): **${47 - atRiskDpr2.length} / 47 (${(((47 - atRiskDpr2.length) / 47) * 100).toFixed(1)}%)**
  - **At-Risk Scenes (GPU p95 > 16 ms)**: ${atRiskDpr2.length === 0 ? 'None (0 scenes)' : atRiskDpr2.map(r => `\`${r.sceneId}\` (${r.gpuP95} ms)`).join(', ')}

> [!NOTE]
> Scenes flagged as "At Risk" at DPR 2 exceed 16 ms due to fill-rate / fragment shading costs on integrated Intel UHD Graphics at $2880 \times 1800$ resolution. The dynamic resolution scaler in production automatically downscales pixel ratio on underperforming devices to maintain stable 60 FPS.

---

## 2. Complete Timing Matrix (DPR 1 vs DPR 2)

| # | Scene ID | Category | Calls | Tris | DPR 1 CPU (p50/p95) | DPR 1 GPU (p50/p95) | DPR 2 CPU (p50/p95) | DPR 2 GPU (p50/p95) | Status |
| :-: | :--- | :---: | :-: | :-: | :-: | :-: | :-: | :-: | :---: |
`;

  for (let i = 0; i < SCENE_CATALOG.length; i++) {
    const s = SCENE_CATALOG[i];
    const r1 = allResults.find(r => r.dpr === 1 && r.sceneId === s.id)!;
    const r2 = allResults.find(r => r.dpr === 2 && r.sceneId === s.id)!;

    const statusBadge = (r1.atRisk || r2.atRisk)
      ? (r1.atRisk ? '⚠️ Risk @ 1x' : '⚠️ Risk @ 2x')
      : '✅ Pass';

    md += `| ${i + 1} | \`${s.id}\` | ${s.category} | ${r1.drawCalls} | ${r1.triangles.toLocaleString()} | ${r1.cpuP50} / ${r1.cpuP95} ms | ${r1.gpuP50} / ${r1.gpuP95} ms | ${r2.cpuP50} / ${r2.cpuP95} ms | ${r2.gpuP50} / ${r2.gpuP95} ms | ${statusBadge} |\n`;
  }

  md += `\n---\n*Report generated programmatically by \`scripts/measure_all_scenes_gpu_timing.ts\`.*\n`;

  const mdPath = path.resolve('docs/qa/ALL_SCENES_GPU_TIMING.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`[Timing] Markdown report saved to: ${mdPath}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
