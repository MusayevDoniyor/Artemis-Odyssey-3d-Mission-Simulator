import { chromium, type Browser, type Page } from 'playwright';

export interface GPUVerification {
  isValidRealGpu: boolean;
  renderer: string;
  unmaskedRenderer: string;
  unmaskedVendor: string;
  glVersion: string;
  devicePixelRatio: number;
}

const SOFTWARE_RENDERER_PATTERNS = [
  /swiftshader/i,
  /llvmpipe/i,
  /software/i,
  /microsoft basic render/i,
  /mesa generic/i,
];

export async function launchRealGpuBrowser(): Promise<{ browser: Browser; page: Page; gpu: GPUVerification }> {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: [
      '--headless=new',
      '--use-angle=d3d11',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
      '--enable-webgl',
      '--enable-webgl2',
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Load dev server root to probe WebGL capabilities
  await page.goto('http://localhost:3000/?qa=1&desktop=1');
  await page.waitForTimeout(1000);

  const gpuInfo: GPUVerification = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) {
      return {
        isValidRealGpu: false,
        renderer: 'NONE',
        unmaskedRenderer: 'NONE',
        unmaskedVendor: 'NONE',
        glVersion: 'NONE',
        devicePixelRatio: window.devicePixelRatio || 1,
      };
    }

    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = gl.getParameter(gl.RENDERER) || 'UNKNOWN';
    const unmaskedRenderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'N/A';
    const unmaskedVendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'N/A';
    const glVersion = gl.getParameter(gl.VERSION) || 'UNKNOWN';

    return {
      isValidRealGpu: true, // Will be checked against blacklist below
      renderer: String(renderer),
      unmaskedRenderer: String(unmaskedRenderer),
      unmaskedVendor: String(unmaskedVendor),
      glVersion: String(glVersion),
      devicePixelRatio: window.devicePixelRatio || 1,
    };
  });

  for (const pattern of SOFTWARE_RENDERER_PATTERNS) {
    if (pattern.test(gpuInfo.unmaskedRenderer) || pattern.test(gpuInfo.renderer)) {
      gpuInfo.isValidRealGpu = false;
      break;
    }
  }

  if (!gpuInfo.isValidRealGpu) {
    await browser.close();
    throw new Error(
      `[QA FATAL] Physical GPU verification failed! Detected software emulator: "${gpuInfo.unmaskedRenderer}". Real GPU is required by R3 rails.`
    );
  }

  console.log(`[QA GPU] Physical GPU verified: ${gpuInfo.unmaskedRenderer} (${gpuInfo.unmaskedVendor})`);
  return { browser, page, gpu: gpuInfo };
}
