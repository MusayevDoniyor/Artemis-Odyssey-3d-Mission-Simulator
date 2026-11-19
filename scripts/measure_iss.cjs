const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testISS(outputScreenshotName) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/?stats=1&desktop=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    window.__JUMP_TO_PHASE__('inspector');
  });
  await page.waitForTimeout(1000);

  // Click ISS button in the craft selector
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('ISS'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(2500);

  const stats = await page.evaluate(() => {
    const el = document.getElementById('dev-stats-overlay');
    return el ? el.innerText : 'Overlay not found';
  });

  const outPath = path.join(__dirname, '../docs/overnight/screens', outputScreenshotName);
  await page.screenshot({ path: outPath });
  console.log(`Saved screenshot to ${outPath}`);
  console.log('Stats:');
  console.log(stats);

  await browser.close();
}

const name = process.argv[2] || 'iss_before.png';
testISS(name);
