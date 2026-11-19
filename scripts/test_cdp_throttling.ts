import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--headless=new'] });
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200 * 1024, // 204,800 bytes/sec
    uploadThroughput: 100 * 1024,
    connectionType: 'cellular3g',
  });

  await page.goto('http://127.0.0.1:4173/');

  const result = await page.evaluate(async () => {
    const t0 = performance.now();
    const res = await fetch('/assets/three-models-ZxnvMgZd.js', { cache: 'no-store' });
    const blob = await res.blob();
    const dt = performance.now() - t0;
    return { size: blob.size, durationMs: dt, kbps: (blob.size / 1024) / (dt / 1000) };
  });

  console.log('Fetch with CDP Throttling:', result);
  await browser.close();
}
test().catch(console.error);
