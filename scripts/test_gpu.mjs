import { chromium } from 'playwright';

async function testGpu() {
  const configs = [
    { channel: 'chrome', headless: false },
    { channel: 'chrome', headless: true, args: ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] },
    { channel: 'msedge', headless: false },
    { channel: 'msedge', headless: true, args: ['--headless=new', '--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] },
  ];

  for (const cfg of configs) {
    console.log(`\nTesting config: channel=${cfg.channel}, headless=${cfg.headless}, args=${cfg.args?.join(' ')}`);
    try {
      const browser = await chromium.launch({
        channel: cfg.channel,
        headless: cfg.headless,
        args: cfg.args || ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu-rasterization']
      });
      const page = await browser.newPage();
      await page.goto('about:blank');
      const info = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return { error: 'No WebGL context' };
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        return {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          unmaskedVendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'N/A',
          unmaskedRenderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'N/A'
        };
      });
      console.log('WebGL info:', JSON.stringify(info, null, 2));
      await browser.close();
    } catch (err) {
      console.error('Launch failed:', err.message);
    }
  }
}

testGpu();
