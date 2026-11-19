import { chromium } from 'playwright';

async function testHostRules() {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--headless=new',
      '--host-resolver-rules=MAP artemis.test 127.0.0.1',
    ],
  });

  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);

  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 100,
    downloadThroughput: 200 * 1024, // 200 KB/s
    uploadThroughput: 100 * 1024,
    connectionType: 'cellular3g',
  });

  const t0 = performance.now();
  const resp = await page.goto('http://artemis.test:4173/assets/index-zp93iWFQ.js');
  const buf = await resp?.body();
  const elapsed = (performance.now() - t0);
  console.log(`Downloaded ${buf?.length} bytes in ${elapsed.toFixed(1)} ms (${((buf?.length || 0) / 1024 / (elapsed / 1000)).toFixed(1)} KB/s)`);

  await browser.close();
}

testHostRules().catch(console.error);
