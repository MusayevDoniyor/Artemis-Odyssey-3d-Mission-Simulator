import { launchRealGpuBrowser } from '../qa/helpers/gpu';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('Launching real GPU browser to capture SLS Hardware Bay explosion levels...');
  const { browser, page } = await launchRealGpuBrowser();

  const outDir = 'docs/qa/screens';
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const levels = [
    { pct: 0, file: 'sls_bay_0pct.png' },
    { pct: 35, file: 'sls_bay_35pct.png' },
    { pct: 100, file: 'sls_bay_100pct.png' },
  ];

  for (const lvl of levels) {
    console.log(`Setting SLS explosion level to ${lvl.pct}%...`);
    await page.evaluate(`(async () => {
      await window.__QA__?.jumpToScene('hardware_bay', { craft: 'rocket', explodePct: ${lvl.pct} });
      await window.__QA__?.waitUntilIdle(5000);
    })()`);
    await page.waitForTimeout(1500);

    const ssPath = path.join(outDir, lvl.file);
    await page.screenshot({ path: ssPath });
    console.log(`Saved screenshot: ${ssPath}`);
  }

  await browser.close();
  console.log('SLS explosion capture complete!');
}

main().catch(console.error);
