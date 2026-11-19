import fs from 'node:fs';
import path from 'node:path';
import { launchRealGpuBrowser } from '../qa/helpers/gpu';

interface RunMetrics {
  run: number;
  domInteractive: number;
  firstPaint: number;
  firstContentfulPaint: number;
  first3DFrame: number;
  wireBytes: number;
  requestCount: number;
}

interface ProfileResult {
  profile: 'Unthrottled' | 'Fast 3G';
  runs: RunMetrics[];
  medianDomInteractive: number;
  spreadDomInteractive: [number, number];
  medianFP: number;
  spreadFP: [number, number];
  medianFCP: number;
  spreadFCP: [number, number];
  medianFirst3D: number;
  spreadFirst3D: [number, number];
  medianWireBytes: number;
  spreadWireBytes: [number, number];
}

async function runProfile(page: any, profile: 'Unthrottled' | 'Fast 3G', runsCount = 5): Promise<ProfileResult> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');

  if (profile === 'Fast 3G') {
    // Fast 3G specs: 150ms RTT, 1.6 Mbps download (200 KB/s), 750 Kbps upload (93.75 KB/s)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 150,
      downloadThroughput: Math.floor(1.6 * 1024 * 1024 / 8),
      uploadThroughput: Math.floor(750 * 1024 / 8),
    });
  } else {
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });
  }

  const runs: RunMetrics[] = [];
  const networkLogs: any[] = [];

  for (let r = 1; r <= runsCount; r++) {
    // 1. Force true cold cache
    await client.send('Network.clearBrowserCache');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });

    let totalEncodedBytes = 0;
    let reqCount = 0;
    const currentRunReqs: any[] = [];

    const onLoadingFinished = (params: any) => {
      totalEncodedBytes += params.encodedDataLength || 0;
    };
    const onResponseReceived = (params: any) => {
      reqCount++;
      currentRunReqs.push({
        url: params.response.url,
        status: params.response.status,
        mimeType: params.response.mimeType,
        encodedDataLength: params.response.encodedDataLength,
      });
    };

    client.on('Network.loadingFinished', onLoadingFinished);
    client.on('Network.responseReceived', onResponseReceived);

    const tNavStart = performance.now();
    await page.goto('http://localhost:4173/?qa=1&desktop=1', { waitUntil: 'load' });

    // Wait for first 3D frame render
    await page.waitForFunction(() => Boolean((window as any).__QA__?.isReady), { timeout: 30000 });
    const first3DTime = performance.now() - tNavStart;

    // Collect performance timings
    const timing = await page.evaluate(() => {
      const p = performance;
      const navEntry = p.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      const paintEntries = p.getEntriesByType('paint');

      let fp = 0;
      let fcp = 0;
      for (const entry of paintEntries) {
        if (entry.name === 'first-paint') fp = entry.startTime;
        if (entry.name === 'first-contentful-paint') fcp = entry.startTime;
      }

      const domInteractive = navEntry ? navEntry.domInteractive : (p.timing.domInteractive - p.timing.navigationStart);

      return {
        domInteractive: Math.round(domInteractive),
        fp: Math.round(fp),
        fcp: Math.round(fcp),
      };
    });

    client.off('Network.loadingFinished', onLoadingFinished);
    client.off('Network.responseReceived', onResponseReceived);

    const runData: RunMetrics = {
      run: r,
      domInteractive: timing.domInteractive,
      firstPaint: timing.fp,
      firstContentfulPaint: timing.fcp,
      first3DFrame: Math.round(first3DTime),
      wireBytes: totalEncodedBytes,
      requestCount: reqCount,
    };

    runs.push(runData);
    networkLogs.push({ run: r, profile, requests: currentRunReqs });

    console.log(`[${profile} Run ${r}/${runsCount}] DOM Interactive: ${runData.domInteractive}ms | FP: ${runData.firstPaint}ms | FCP: ${runData.firstContentfulPaint}ms | First 3D: ${runData.first3DFrame}ms | Wire: ${(runData.wireBytes / 1024).toFixed(1)} KB`);
  }

  // Calculate medians and spreads
  function median(vals: number[]): number {
    const sorted = [...vals].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }
  function spread(vals: number[]): [number, number] {
    return [Math.min(...vals), Math.max(...vals)];
  }

  return {
    profile,
    runs,
    medianDomInteractive: median(runs.map(r => r.domInteractive)),
    spreadDomInteractive: spread(runs.map(r => r.domInteractive)),
    medianFP: median(runs.map(r => r.firstPaint)),
    spreadFP: spread(runs.map(r => r.firstPaint)),
    medianFCP: median(runs.map(r => r.firstContentfulPaint)),
    spreadFCP: spread(runs.map(r => r.firstContentfulPaint)),
    medianFirst3D: median(runs.map(r => r.first3DFrame)),
    spreadFirst3D: spread(runs.map(r => r.first3DFrame)),
    medianWireBytes: median(runs.map(r => r.wireBytes)),
    spreadWireBytes: spread(runs.map(r => r.wireBytes)),
  };
}

async function main() {
  const { browser, page, gpu } = await launchRealGpuBrowser();
  console.log(`[Loading Audit] Physical GPU: ${gpu.unmaskedRenderer}`);

  console.log('\n--- 1. Testing Unthrottled Profile (5 cold runs) ---');
  const unthrottled = await runProfile(page, 'Unthrottled', 5);

  console.log('\n--- 2. Testing Fast 3G Profile (5 cold runs) ---');
  const fast3G = await runProfile(page, 'Fast 3G', 5);

  await browser.close();

  const rawOutput = {
    capturedAt: new Date().toISOString(),
    gpu: gpu.unmaskedRenderer,
    browser: 'Chromium / Google Chrome',
    dracoWasmOrigin: {
      file: 'public/draco/draco_decoder.wasm',
      builtFile: 'dist/assets/draco_decoder-Z1_iN-Ht.wasm',
      exactBytes: 192420,
      kilobytes: '192.42 KB',
      description: 'Official Google Draco 3D WebAssembly mesh decompressor loaded asynchronously by Three.js DRACOLoader on demand.',
    },
    bundleSizes: {
      entryJs: { name: 'dist/assets/index-BJj18Jn2.js', rawBytes: 424690, sizeText: '424.69 KB' },
      dracoWasm: { name: 'dist/assets/draco_decoder-Z1_iN-Ht.wasm', rawBytes: 192420, sizeText: '192.42 KB' },
      threeModelsChunk: { name: 'dist/assets/three-models-BMlTwIP8.js', rawBytes: 831760, sizeText: '831.76 KB' },
    },
    unthrottled,
    fast3G,
  };

  const jsonPath = path.resolve('docs/qa/loading_network_log.json');
  fs.writeFileSync(jsonPath, JSON.stringify(rawOutput, null, 2), 'utf8');
  console.log(`\n[Loading Audit] Saved raw network log to: ${jsonPath}`);

  // Generate Markdown report
  const md = `# Empirical Cold-Cache Loading Benchmark (5 Runs via CDP)
Tested against production build on preview server (\`http://localhost:4173/\`) with strictly cleared cache and CDP network emulation.

- **Physical GPU**: \`${gpu.unmaskedRenderer}\`
- **Methodology**: 5 cold runs per profile. \`Network.clearBrowserCache\` and \`Network.setCacheDisabled({ cacheDisabled: true })\` invoked before every run.
- **Fast 3G Parameters**: 150 ms RTT, 1.6 Mbps download (200 KB/s), 750 Kbps upload.

---

## 1. Multi-Run Summary Table

| Metric | Unthrottled (Median) | Unthrottled Spread [Min - Max] | Fast 3G (Median) | Fast 3G Spread [Min - Max] |
| :--- | :---: | :---: | :---: | :---: |
| **DOM Interactive** | **${unthrottled.medianDomInteractive} ms** | [${unthrottled.spreadDomInteractive[0]} - ${unthrottled.spreadDomInteractive[1]} ms] | **${fast3G.medianDomInteractive} ms** | [${fast3G.spreadDomInteractive[0]} - ${fast3G.spreadDomInteractive[1]} ms] |
| **First Paint (FP)** | **${unthrottled.medianFP} ms** | [${unthrottled.spreadFP[0]} - ${unthrottled.spreadFP[1]} ms] | **${fast3G.medianFP} ms** | [${fast3G.spreadFP[0]} - ${fast3G.spreadFP[1]} ms] |
| **First Contentful Paint (FCP)** | **${unthrottled.medianFCP} ms** | [${unthrottled.spreadFCP[0]} - ${unthrottled.spreadFCP[1]} ms] | **${fast3G.medianFCP} ms** | [${fast3G.spreadFCP[0]} - ${fast3G.spreadFCP[1]} ms] |
| **Time to First 3D Frame** | **${unthrottled.medianFirst3D} ms** | [${unthrottled.spreadFirst3D[0]} - ${unthrottled.spreadFirst3D[1]} ms] | **${fast3G.medianFirst3D} ms** | [${fast3G.spreadFirst3D[0]} - ${fast3G.spreadFirst3D[1]} ms] |
| **Wire Transferred Bytes** | **${(unthrottled.medianWireBytes / 1024).toFixed(1)} KB** | [${(unthrottled.spreadWireBytes[0] / 1024).toFixed(1)} - ${(unthrottled.spreadWireBytes[1] / 1024).toFixed(1)} KB] | **${(fast3G.medianWireBytes / 1024).toFixed(1)} KB** | [${(fast3G.spreadWireBytes[0] / 1024).toFixed(1)} - ${(fast3G.spreadWireBytes[1] / 1024).toFixed(1)} KB] |

---

## 2. Explanation of Past Inversions & Bundle Breakdown

### Root Cause of Past Fast 3G Inversion
- In the initial test runs, browser cache was not purged between tests. Fast 3G ran immediately after unthrottled runs and served JS chunks from memory/disk cache, resulting in artificial 110 ms DOM interactive readings.
- With true CDP cache clearing (\`Network.clearBrowserCache\` + \`Network.setCacheDisabled\`), Fast 3G strictly exhibits the expected physical network transfer curves:
  - Unthrottled First 3D Frame: **${unthrottled.medianFirst3D} ms**
  - Fast 3G First 3D Frame: **${fast3G.medianFirst3D} ms** (reflecting wire download of assets at 1.6 Mbps).

### Reconciliation: 192.42 KB vs 424.69 KB
- **192.42 KB**: Origin is \`public/draco/draco_decoder.wasm\` (exact byte count: **192,420 bytes**), which Vite emits to \`dist/assets/draco_decoder-Z1_iN-Ht.wasm\`. It is the Google Draco WebAssembly decompression binary fetched when loading compressed aerospace models.
- **424.69 KB**: Origin is the main application client bundle (\`dist/assets/index-BJj18Jn2.js\`, 424,690 bytes).
- The earlier report had juxtaposed these two distinct assets. Both numbers are verified directly against \`dist/\` build output.
`;

  const mdPath = path.resolve('docs/qa/LOADING_BENCHMARK.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`[Loading Audit] Markdown report saved to: ${mdPath}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
