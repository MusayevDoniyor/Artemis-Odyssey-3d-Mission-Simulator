import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function captureModel(modelFile: string, prefix: string) {
  // Copy modelFile to public/assets/crafts/iss.glb
  fs.copyFileSync(modelFile, 'public/assets/crafts/iss.glb');
  console.log(`Copied ${modelFile} to public/assets/crafts/iss.glb`);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-webgl', '--enable-webgl2'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:3000/?qa=1&desktop=1');
  await page.waitForTimeout(1000);

  // Jump to hardware_bay with craft: iss
  await page.evaluate(`(async () => {
    await window.__QA__?.jumpToScene('hardware_bay', { craft: 'iss' });
    await window.__QA__?.waitUntilIdle(5000);
  })()`);
  await page.waitForTimeout(2000);

  const outDir = 'docs/qa/screens';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Angle 1: Overview
  await page.screenshot({ path: path.join(outDir, `${prefix}_angle1_overview.png`) });
  console.log(`Saved ${prefix}_angle1_overview.png`);

  // Angle 2: Close-up Modules
  await page.evaluate(`(() => {
    const sm = window.__QA_APP_CONTEXT__?.getSceneManager?.();
    if (sm && sm.camera) {
      sm.camera.position.set(0, 1.2, 4.0);
      sm.camera.lookAt(0, 0, 0);
    }
  })()`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, `${prefix}_angle2_modules.png`) });
  console.log(`Saved ${prefix}_angle2_modules.png`);

  // Angle 3: Solar Arrays & Truss
  await page.evaluate(`(() => {
    const sm = window.__QA_APP_CONTEXT__?.getSceneManager?.();
    if (sm && sm.camera) {
      sm.camera.position.set(6.5, 4.5, 7.0);
      sm.camera.lookAt(0, 0, 0);
    }
  })()`);
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, `${prefix}_angle3_truss.png`) });
  console.log(`Saved ${prefix}_angle3_truss.png`);

  await browser.close();
}

async function run() {
  // Capture 107k model (currently in scratch/iss_decimated_38k.glb or assets-src/crafts/iss.glb)
  await captureModel('scratch/iss_decimated_38k.glb', 'iss_107k');

  // Capture Cleaned Candidate A (6.5k model)
  await captureModel('scratch/iss_cleaned_a.glb', 'iss_6k');

  console.log('ISS 3-angle comparison capture complete!');
}

run().catch(console.error);
