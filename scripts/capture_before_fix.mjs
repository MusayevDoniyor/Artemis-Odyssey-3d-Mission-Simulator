import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

async function main() {
  const outDir = path.resolve('docs/overnight/screens/before_fix');
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

  console.log('Capturing BEFORE screenshots on REAL GPU...');

  // 1. Title
  await page.goto('http://localhost:3000/?phase=title&stats=1&desktop=1');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'before_title_1440x900.png') });
  console.log('Captured before_title_1440x900.png');

  // 2. Launch Pad
  await page.goto('http://localhost:3000/?phase=launch&stats=1&desktop=1');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(outDir, 'before_launch_pad_1440x900.png') });
  console.log('Captured before_launch_pad_1440x900.png');

  // 3. Hardware Bay (SLS Block 1)
  await page.goto('http://localhost:3000/?phase=inspector&showcase=rocket&stats=1&desktop=1');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(outDir, 'before_hardware_bay_sls_1440x900.png') });
  console.log('Captured before_hardware_bay_sls_1440x900.png');

  const gpuInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return 'No canvas found';
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: gl?.getParameter(gl.RENDERER),
      unmaskedRenderer: dbg ? gl?.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'N/A',
      unmaskedVendor: dbg ? gl?.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'N/A',
    };
  });
  console.log('GPU Used:', JSON.stringify(gpuInfo, null, 2));

  await browser.close();
  console.log('Before fix captures complete.');
}

main().catch(console.error);
