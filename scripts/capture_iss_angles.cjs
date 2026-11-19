const { chromium } = require('playwright');
const path = require('path');

async function captureIssAngles() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('http://localhost:3000/?stats=1&desktop=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  await page.evaluate(() => {
    window.__JUMP_TO_PHASE__('inspector');
  });
  await page.waitForTimeout(1000);

  // Click ISS button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const btn = btns.find(b => b.textContent && b.textContent.includes('ISS'));
    if (btn) btn.click();
  });
  await page.waitForTimeout(2500);

  // Angle 1: Front wide
  const p1 = path.join(__dirname, '../docs/overnight/screens/iss_angle_front.png');
  await page.screenshot({ path: p1 });
  console.log('Saved Angle 1 (Front):', p1);

  // Angle 2: Close-up Modules (Destiny, Kibo, Cupola)
  await page.evaluate(() => {
    const mgr = window.__SCENE_MANAGER__;
    if (mgr && mgr.camera) {
      mgr.camera.position.set(0, 1.5, 5.0);
      mgr.camera.lookAt(0, 0, 0);
    }
  });
  await page.waitForTimeout(1000);
  const p2 = path.join(__dirname, '../docs/overnight/screens/iss_angle_modules.png');
  await page.screenshot({ path: p2 });
  console.log('Saved Angle 2 (Modules close-up):', p2);

  // Angle 3: Solar Arrays & Truss overview
  await page.evaluate(() => {
    const mgr = window.__SCENE_MANAGER__;
    if (mgr && mgr.camera) {
      mgr.camera.position.set(8.0, 6.0, 8.0);
      mgr.camera.lookAt(0, 0, 0);
    }
  });
  await page.waitForTimeout(1000);
  const p3 = path.join(__dirname, '../docs/overnight/screens/iss_angle_solar_arrays.png');
  await page.screenshot({ path: p3 });
  console.log('Saved Angle 3 (Solar arrays):', p3);

  await browser.close();
}

captureIssAngles();
