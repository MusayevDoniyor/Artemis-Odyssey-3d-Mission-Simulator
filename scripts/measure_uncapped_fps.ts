import { chromium } from "playwright";
import fs from "fs";

interface GpuSyncedPerf {
  sceneName: string;
  sceneId: string;
  cpuP50Ms: number;
  cpuP95Ms: number;
  gpuP50Ms: number;
  gpuP95Ms: number;
  totalP50Ms: number;
  totalP95Ms: number;
  fpsFromP50: number;
  fpsFromAvg: number;
  sampleCount: number;
}

export async function measureUncappedFps(): Promise<GpuSyncedPerf[]> {
  console.log("Launching Chrome with --disable-frame-rate-limit and --disable-gpu-vsync...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--headless=new",
      "--use-angle=d3d11",
      "--ignore-gpu-blocklist",
      "--enable-gpu-rasterization",
      "--enable-webgl",
      "--enable-webgl2",
      "--disable-frame-rate-limit",
      "--disable-gpu-vsync",
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/?qa=1&desktop=1");
  await page.waitForTimeout(1500);

  const gpuInfo = (await page.evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: dbg && gl ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown',
      vendor: dbg && gl ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'unknown',
    };
  })()`)) as { renderer: string; vendor: string };

  console.log("Verified Physical GPU:", gpuInfo.renderer);
  console.log("==========================================================================================");
  console.log("  UNCAPPED REAL-GPU SYNCHRONIZED BENCHMARK (gl.readPixels Completion Sync)");
  console.log("==========================================================================================\n");

  const scenes = [
    { name: "Title Screen (Hero)", id: "title", params: {} },
    { name: "Launch Pad (Wide)", id: "launch", params: {} },
    { name: "Mission Briefing", id: "briefing", params: { tab: "objectives" } },
    { name: "Settings Console", id: "settings", params: {} },
    { name: "Space: LEO Orbit", id: "space", params: {} },
    { name: "Solar System Overview", id: "space", params: { viewMode: "solar_system" } },
    { name: "Saturn Rings & Shadow", id: "space", params: { focusedBody: "saturn" } },
    { name: "Landing: Approach", id: "landing", params: {} },
    { name: "Surface: Moon Shackleton", id: "surface_moon", params: {} },
    { name: "Surface: Mars Jezero", id: "surface_mars", params: {} },
    { name: "Hardware Bay: SLS Block 1", id: "hardware_bay", params: { craft: "rocket" } },
    { name: "Hardware Bay: LM-2 Lander", id: "hardware_bay", params: { craft: "lander" } },
    { name: "Hardware Bay: Saturn V", id: "hardware_bay", params: { craft: "saturn-v" } },
    { name: "Hardware Bay: ISS", id: "hardware_bay", params: { craft: "iss" } },
    { name: "Hardware Bay: JWST", id: "hardware_bay", params: { craft: "jwst" } },
  ];

  const results: GpuSyncedPerf[] = [];

  console.log(
    `| ${'Scene'.padEnd(26)} | ${'CPU p50'.padStart(7)} | ${'CPU p95'.padStart(7)} | ${'GPU p50'.padStart(7)} | ${'GPU p95'.padStart(7)} | ${'Tot p50'.padStart(7)} | ${'Tot p95'.padStart(7)} | ${'p50 FPS'.padStart(7)} | ${'Avg FPS'.padStart(7)} |`
  );
  console.log(
    `|----------------------------|---------|---------|---------|---------|---------|---------|---------|---------|`
  );

  for (const s of scenes) {
    await page.evaluate(`(async () => {
      await window.__QA__?.jumpToScene('${s.id}', ${JSON.stringify(s.params)});
      await window.__QA__?.waitUntilIdle(5000);
      window.__QA__?.resume();
    })()`);
    await page.waitForTimeout(500);

    const data = (await page.evaluate(`(async () => {
      const sm = window.__QA_APP_CONTEXT__?.getSceneManager?.();
      if (!sm || !sm.renderer) return null;
      const renderer = sm.renderer;
      const gl = renderer.getContext();
      const origRender = renderer.render.bind(renderer);
      const pixelBuf = new Uint8Array(4);

      const cpuTimes = [];
      const gpuTimes = [];
      const totalTimes = [];

      let frameCount = 0;
      const maxFrames = 75;

      return new Promise((resolve) => {
        renderer.render = function(scene, camera) {
          const t0 = performance.now();
          origRender(scene, camera);
          const t1 = performance.now();
          // Force hardware GPU pipeline drain & VRAM readback sync
          gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuf);
          const t2 = performance.now();

          if (frameCount > 15) { // Skip initial warm-up frames
            cpuTimes.push(t1 - t0);
            gpuTimes.push(t2 - t1);
            totalTimes.push(t2 - t0);
          }
          frameCount++;

          if (frameCount >= maxFrames) {
            renderer.render = origRender;

            cpuTimes.sort((a, b) => a - b);
            gpuTimes.sort((a, b) => a - b);
            totalTimes.sort((a, b) => a - b);

            const cpuP50 = cpuTimes[Math.floor(cpuTimes.length * 0.5)];
            const cpuP95 = cpuTimes[Math.floor(cpuTimes.length * 0.95)];
            const gpuP50 = gpuTimes[Math.floor(gpuTimes.length * 0.5)];
            const gpuP95 = gpuTimes[Math.floor(gpuTimes.length * 0.95)];
            const totalP50 = totalTimes[Math.floor(totalTimes.length * 0.5)];
            const totalP95 = totalTimes[Math.floor(totalTimes.length * 0.95)];
            const avgTotal = totalTimes.reduce((a, b) => a + b, 0) / totalTimes.length;

            resolve({
              cpuP50Ms: Number(cpuP50.toFixed(2)),
              cpuP95Ms: Number(cpuP95.toFixed(2)),
              gpuP50Ms: Number(gpuP50.toFixed(2)),
              gpuP95Ms: Number(gpuP95.toFixed(2)),
              totalP50Ms: Number(totalP50.toFixed(2)),
              totalP95Ms: Number(totalP95.toFixed(2)),
              fpsFromP50: Math.round(1000 / totalP50),
              fpsFromAvg: Math.round(1000 / avgTotal),
              sampleCount: totalTimes.length,
            });
          }
        };
      });
    })()`)) as any;

    if (!data) continue;

    const row: GpuSyncedPerf = {
      sceneName: s.name,
      sceneId: s.id,
      ...data,
    };
    results.push(row);

    console.log(
      `| ${row.sceneName.padEnd(26)} | ${(row.cpuP50Ms + 'ms').padStart(7)} | ${(row.cpuP95Ms + 'ms').padStart(7)} | ${(row.gpuP50Ms + 'ms').padStart(7)} | ${(row.gpuP95Ms + 'ms').padStart(7)} | ${(row.totalP50Ms + 'ms').padStart(7)} | ${(row.totalP95Ms + 'ms').padStart(7)} | ${String(row.fpsFromP50).padStart(7)} | ${String(row.fpsFromAvg).padStart(7)} |`
    );
  }

  await browser.close();

  fs.writeFileSync("docs/qa/uncapped_perf_synced.json", JSON.stringify(results, null, 2));
  console.log("\nSaved docs/qa/uncapped_perf_synced.json");

  return results;
}

if (process.argv[1]?.endsWith("measure_uncapped_fps.ts")) {
  measureUncappedFps().catch(console.error);
}
