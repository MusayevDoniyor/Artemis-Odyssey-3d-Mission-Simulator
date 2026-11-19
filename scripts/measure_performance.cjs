const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../docs/overnight/screens');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:3000/?stats=1&desktop=1...');
  await page.goto('http://localhost:3000/?stats=1&desktop=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const scenes = [
    { id: 'title', name: 'Title Screen', action: async () => {} },
    {
      id: 'launch-pad',
      name: 'Launch Pad',
      action: async () => {
        await page.evaluate(() => window.__JUMP_TO_PHASE__('launch', 'moon'));
      },
    },
    {
      id: 'orbit',
      name: 'Orbit (Earth Parking Orbit)',
      action: async () => {
        await page.evaluate(() => {
          window.__JUMP_TO_PHASE__('space', 'earth');
          window.__FOCUS_SOLAR_BODY__(null);
          window.__SET_SPACE_CAMERA_MODE__('cockpit');
        });
      },
    },
    {
      id: 'solar-system',
      name: 'Solar System View',
      action: async () => {
        await page.evaluate(() => {
          window.__JUMP_TO_PHASE__('space', 'earth');
          window.__FOCUS_SOLAR_BODY__('sun');
          window.__SET_SPACE_CAMERA_MODE__('overview');
        });
      },
    },
    {
      id: 'lander',
      name: 'Lander (Descent/Touchdown)',
      action: async () => {
        await page.evaluate(() => window.__JUMP_TO_PHASE__('landing', 'moon'));
      },
    },
    {
      id: 'rover',
      name: 'Rover (Lunar Surface)',
      action: async () => {
        await page.evaluate(() => window.__JUMP_TO_PHASE__('rover', 'moon'));
      },
    },
    {
      id: 'inspector',
      name: 'Hardware Inspector',
      action: async () => {
        await page.evaluate(() => window.__JUMP_TO_PHASE__('inspector'));
      },
    },
  ];

  const results = [];

  for (const s of scenes) {
    console.log(`\nTesting scene: ${s.name} (${s.id})...`);
    await s.action();
    await page.waitForTimeout(1500);

    const stats = await page.evaluate(() => {
      return (
        window.__SCENE_STATS__ || {
          triangles: 0,
          calls: 0,
          geometries: 0,
          textures: 0,
        }
      );
    });

    const screenshotPath = path.join(outDir, `stats-${s.id}.png`);
    await page.screenshot({ path: screenshotPath });

    const heroTriBudget = 75000;
    const bgTriBudget = 40000;
    const wholeSceneTriBudget = 185000;
    const callBudget = 45;

    results.push({
      id: s.id,
      name: s.name,
      triangles: stats.triangles,
      calls: stats.calls,
      geometries: stats.geometries,
      textures: stats.textures,
      trianglesBudget: wholeSceneTriBudget,
      callsBudget: callBudget,
      withinBudget: stats.triangles <= wholeSceneTriBudget && stats.calls <= callBudget,
      screenshot: `docs/overnight/screens/stats-${s.id}.png`,
    });

    console.log(`  Draw Calls: ${stats.calls} (budget <= ${callBudget})`);
    console.log(`  Triangles:  ${stats.triangles.toLocaleString()} (budget <= ${wholeSceneTriBudget.toLocaleString()})`);
    console.log(`  Geometries: ${stats.geometries}, Textures: ${stats.textures}`);
    console.log(`  Pass: ${stats.triangles <= wholeSceneTriBudget && stats.calls <= callBudget ? 'YES' : 'NO'}`);
  }

  await browser.close();

  const reportPath = path.join(__dirname, '../docs/overnight/PERFORMANCE_AUDIT.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nAudit complete. Saved to ${reportPath}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
