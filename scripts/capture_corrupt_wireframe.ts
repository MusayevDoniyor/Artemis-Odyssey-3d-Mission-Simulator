import { launchRealGpuBrowser } from '../qa/helpers/gpu';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Rendering wireframe of corrupt SLS model...');
  const { browser, page } = await launchRealGpuBrowser();

  // Load corrupt model into isolate viewer or render in three.js canvas
  await page.goto('http://localhost:3000/isolate-viewer.html?model=/tests/fixtures/corrupt/sls_block1_corrupt.glb&wireframe=1');
  await page.waitForTimeout(2000);

  const outPath = 'docs/qa/screens/sls_corrupt_wireframe_streaks.png';
  await page.screenshot({ path: outPath });
  console.log(`Saved ${outPath}`);

  await browser.close();
}

main().catch(console.error);
