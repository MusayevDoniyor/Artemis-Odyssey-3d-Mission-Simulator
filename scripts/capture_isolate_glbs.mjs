import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

async function main() {
  const outDir = path.resolve('docs/overnight/screens/isolate');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--headless=new',
      '--use-angle=d3d11',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
    ],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });

  const models = [
    '/assets/rockets/sls_block1.glb',
    '/assets/structures/mobile_launcher.glb',
    '/assets/structures/vab.glb',
    '/assets/crafts/iss.glb',
    '/assets/crafts/jwst.glb',
    '/assets/crafts/apollo_lunar_module.glb',
    '/assets/rockets/saturn_v.glb',
  ];

  const results = [];

  for (const model of models) {
    const modelName = path.basename(model, '.glb');
    console.log(`\nTesting isolated render: ${modelName} (${model})`);

    for (const angle of ['front', 'side', 'iso']) {
      for (const wireframe of [0, 1]) {
        const url = `http://localhost:3000/isolate-viewer.html?model=${encodeURIComponent(model)}&angle=${angle}&wireframe=${wireframe}`;
        await page.goto(url);

        await page.waitForFunction(() => window.__RENDER_DONE__ || window.__RENDER_ERROR__, {
          timeout: 20000,
        }).catch((e) => console.log(`Wait timeout for ${modelName} ${angle}`));

        const gpuInfo = await page.evaluate(() => window.__GPU_INFO__);
        const stats = await page.evaluate(() => window.__MODEL_STATS__);
        const err = await page.evaluate(() => window.__RENDER_ERROR__);

        const shotName = `${modelName}_${angle}_${wireframe ? 'wire' : 'solid'}.png`;
        const shotPath = path.join(outDir, shotName);
        await page.screenshot({ path: shotPath });

        results.push({
          model: modelName,
          angle,
          wireframe: Boolean(wireframe),
          shotPath,
          stats,
          gpuInfo,
          error: err || null,
        });

        console.log(`  Captured ${shotName} | Triangles: ${stats?.triangles} | GPU: ${gpuInfo?.unmaskedRenderer}`);
      }
    }
  }

  await browser.close();
  fs.writeFileSync(
    path.join(outDir, 'isolate_results.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`\nIsolate rendering complete. Captured ${results.length} screenshots in docs/overnight/screens/isolate/`);
}

main().catch(console.error);
