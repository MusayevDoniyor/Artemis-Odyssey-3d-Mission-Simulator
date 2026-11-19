import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

interface LoadingMetrics {
  profile: string;
  firstPaintMs: number;
  firstContentfulPaintMs: number;
  domInteractiveMs: number;
  domContentLoadedMs: number;
  timeToFirst3DFrameMs: number;
  initialChunkWireBytes: number;
  initialChunkDiskBytes: number;
  totalBytesBefore3D: number;
  jsBytesBefore3D: number;
  resourcesBefore3D: { name: string; transferSize: number; durationMs: number }[];
}

async function measureProfile(
  profileName: string,
  throttle: boolean
): Promise<LoadingMetrics> {
  console.log(`\n========================================================================`);
  console.log(`RUNNING BENCHMARK: ${profileName.toUpperCase()} (FRESH COLD BROWSER)`);
  console.log(`========================================================================`);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'artemis-cold-'));

  const context = await chromium.launchPersistentContext(tmpDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: [
      '--headless=new',
      '--use-angle=d3d11',
      '--host-resolver-rules=MAP artemis.test 127.0.0.1',
    ],
  });

  const page = context.pages()[0] || (await context.newPage());
  const cdp = await context.newCDPSession(page);

  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  if (throttle) {
    // Fast 3G: 1.6 Mbps download (200 KB/s), 750 kbps upload (93.75 KB/s), 40ms latency
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 40,
      downloadThroughput: (1.6 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
      connectionType: 'cellular3g',
    });
  }

  // Inject 3D frame hook before navigation
  await page.addInitScript(`
    window.__FIRST_3D_FRAME_TIME__ = 0;
    const origGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(...args) {
      const gl = origGetContext.apply(this, args);
      if (args[0] === 'webgl' || args[0] === 'webgl2') {
        const wrapDraw = (origFn) => function(...drawArgs) {
          if (!window.__FIRST_3D_FRAME_TIME__) {
            window.__FIRST_3D_FRAME_TIME__ = performance.now();
          }
          return origFn.apply(this, drawArgs);
        };
        gl.drawElements = wrapDraw(gl.drawElements);
        gl.drawArrays = wrapDraw(gl.drawArrays);
      }
      return gl;
    };
  `);

  console.log(`Navigating to http://artemis.test:4173/?qa=1&desktop=1...`);
  const tNavStart = performance.now();
  await page.goto('http://artemis.test:4173/?qa=1&desktop=1', {
    waitUntil: 'domcontentloaded',
    timeout: 180000,
  });

  console.log(`Waiting for first 3D frame to render...`);
  await page.waitForFunction('window.__FIRST_3D_FRAME_TIME__ > 0', { timeout: 180000 });
  const first3DTime = await page.evaluate('window.__FIRST_3D_FRAME_TIME__');
  const elapsedRealMs = performance.now() - tNavStart;
  console.log(`First 3D frame captured at ${Number(first3DTime).toFixed(1)} ms (wall clock navigation time: ${elapsedRealMs.toFixed(1)} ms)!`);

  await page.waitForTimeout(1000);

  const telemetry = (await page.evaluate(`(() => {
    const nav = performance.getEntriesByType('navigation')[0] || {};
    const paints = performance.getEntriesByType('paint');
    const fpEntry = paints.find(p => p.name === 'first-paint');
    const fcpEntry = paints.find(p => p.name === 'first-contentful-paint');
    const resources = performance.getEntriesByType('resource');

    const first3D = window.__FIRST_3D_FRAME_TIME__ || 0;

    let totalBytesBefore3D = 0;
    let jsBytesBefore3D = 0;
    let initialChunkWireBytes = 0;
    const resourcesBefore3D = [];

    for (const r of resources) {
      if (r.responseEnd <= first3D + 100) {
        const size = r.transferSize || r.decodedBodySize || 0;
        totalBytesBefore3D += size;
        if (r.name.includes('/assets/index-') && r.name.endsWith('.js')) {
          initialChunkWireBytes = size;
        }
        if (r.name.endsWith('.js') || r.initiatorType === 'script') {
          jsBytesBefore3D += size;
        }
        const shortName = r.name.split('/').pop() || r.name;
        resourcesBefore3D.push({ name: shortName, transferSize: size, durationMs: Math.round(r.duration) });
      }
    }

    return {
      firstPaintMs: fpEntry ? fpEntry.startTime : 0,
      firstContentfulPaintMs: fcpEntry ? fcpEntry.startTime : 0,
      domInteractiveMs: nav.domInteractive || 0,
      domContentLoadedMs: nav.domContentLoadedEventEnd || 0,
      timeToFirst3DFrameMs: first3D,
      totalBytesBefore3D,
      jsBytesBefore3D,
      initialChunkWireBytes,
      resourcesBefore3D,
    };
  })()`)) as any;

  console.log(`[${profileName}] Telemetry extracted:`);
  console.log(`  - DOM Interactive:              ${Number(telemetry.domInteractiveMs).toFixed(1)} ms`);
  console.log(`  - First Paint (FP):             ${Number(telemetry.firstPaintMs).toFixed(1)} ms`);
  console.log(`  - First Contentful Paint (FCP): ${Number(telemetry.firstContentfulPaintMs).toFixed(1)} ms`);
  console.log(`  - First 3D Frame:               ${Number(telemetry.timeToFirst3DFrameMs).toFixed(1)} ms`);
  console.log(`  - Initial JS Chunk (Wire):      ${(telemetry.initialChunkWireBytes / 1024).toFixed(1)} KB`);
  console.log(`  - Total JS Transferred:         ${(telemetry.jsBytesBefore3D / 1024).toFixed(1)} KB`);
  console.log(`  - Total Bytes Transferred:      ${(telemetry.totalBytesBefore3D / 1024).toFixed(1)} KB`);

  // Close context cleanly
  try {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
  } catch {}

  await context.close().catch(() => {});

  return {
    profile: profileName,
    firstPaintMs: Number(telemetry.firstPaintMs.toFixed(1)),
    firstContentfulPaintMs: Number(telemetry.firstContentfulPaintMs.toFixed(1)),
    domInteractiveMs: Number(telemetry.domInteractiveMs.toFixed(1)),
    domContentLoadedMs: Number(telemetry.domContentLoadedMs.toFixed(1)),
    timeToFirst3DFrameMs: Number(telemetry.timeToFirst3DFrameMs.toFixed(1)),
    initialChunkWireBytes: telemetry.initialChunkWireBytes,
    initialChunkDiskBytes: 424.69 * 1024,
    totalBytesBefore3D: telemetry.totalBytesBefore3D,
    jsBytesBefore3D: telemetry.jsBytesBefore3D,
    resourcesBefore3D: telemetry.resourcesBefore3D,
  };
}

export async function runLoadingBenchmark() {
  const unthrottled = await measureProfile('Unthrottled (High Speed)', false);
  const throttled = await measureProfile('Fast 3G (1.6 Mbps, 40ms RTT)', true);

  console.log(`\n========================================================================`);
  console.log(`         COLD CACHE PRODUCTION PREVIEW LOADING RESULTS`);
  console.log(`========================================================================`);
  console.log(`| Metric | Unthrottled | Fast 3G (1.6 Mbps) | Note / Distinction |`);
  console.log(`|---|---|---|---|`);
  console.log(
    `| **DOM Interactive** | **${unthrottled.domInteractiveMs} ms** | **${throttled.domInteractiveMs} ms** | HTML document parsed; DOM ready |`
  );
  console.log(
    `| **First Paint (FP)** | **${unthrottled.firstPaintMs} ms** | **${throttled.firstPaintMs} ms** | First pixels drawn by browser |`
  );
  console.log(
    `| **First Contentful Paint (FCP)** | **${unthrottled.firstContentfulPaintMs} ms** | **${throttled.firstContentfulPaintMs} ms** | UI Shell + "INITIALIZING..." visible |`
  );
  console.log(
    `| **Time to First 3D Frame** | **${unthrottled.timeToFirst3DFrameMs} ms** | **${throttled.timeToFirst3DFrameMs} ms** | WebGL canvas renders first 3D scene |`
  );
  console.log(
    `| **Initial JS Chunk (Wire / Transfer)** | **${(unthrottled.initialChunkWireBytes / 1024).toFixed(1)} KB** | **${(throttled.initialChunkWireBytes / 1024).toFixed(1)} KB** | Gzip compressed over HTTP wire |`
  );
  console.log(
    `| **Initial JS Chunk (Disk / V8 Uncompressed)** | **${(unthrottled.initialChunkDiskBytes / 1024).toFixed(1)} KB** | **${(throttled.initialChunkDiskBytes / 1024).toFixed(1)} KB** | Decompressed JS size evaluated by V8 |`
  );
  console.log(
    `| **Total JS Transferred Before 3D** | **${(unthrottled.jsBytesBefore3D / 1024).toFixed(1)} KB** | **${(throttled.jsBytesBefore3D / 1024).toFixed(1)} KB** | index + vendor + three modules |`
  );
  console.log(
    `| **Total Bytes Transferred Before 3D** | **${(unthrottled.totalBytesBefore3D / 1024).toFixed(1)} KB** | **${(throttled.totalBytesBefore3D / 1024).toFixed(1)} KB** | All resources to first 3D frame |`
  );
  console.log(`========================================================================\n`);

  console.log(`Resources Transferred Before First 3D Frame (Fast 3G):`);
  for (const r of throttled.resourcesBefore3D) {
    console.log(`  - ${r.name.padEnd(40)}: ${(r.transferSize / 1024).toFixed(1).padStart(7)} KB (${r.durationMs} ms)`);
  }

  process.exit(0);
}

if (process.argv[1]?.endsWith('measure_tti_and_bytes.ts')) {
  runLoadingBenchmark().catch(console.error);
}
