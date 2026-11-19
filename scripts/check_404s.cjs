const { chromium } = require('playwright');

async function check404() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  const notFounds = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('response', (res) => {
    if (res.status() === 404) {
      notFounds.push(res.url());
    }
  });

  console.log('Navigating to http://localhost:3000/?desktop=1...');
  await page.goto('http://localhost:3000/?desktop=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const phases = ['launch', 'space', 'inspector'];
  for (const ph of phases) {
    console.log(`Testing phase: ${ph}...`);
    await page.evaluate((p) => window.__JUMP_TO_PHASE__(p, 'moon'), ph);
    await page.waitForTimeout(1500);
  }

  await browser.close();

  console.log('\n=== 404 NETWORK AUDIT RESULT ===');
  console.log('Total 404s:', notFounds.length);
  notFounds.forEach((u) => console.log('  404:', u));

  console.log('\n=== CONSOLE ERRORS RESULT ===');
  console.log('Total Console Errors:', errors.length);
  errors.forEach((e) => console.log('  Error:', e));
}

check404().catch(console.error);
