const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function runAudit() {
  console.log('--- STARTING DEEP PERFORMANCE AUDIT ---');

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags="--expose-gc"'],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Track network bytes and transfer size
  let transferredBytes = 0;
  let resourceCount = 0;
  page.on('response', async (res) => {
    try {
      const buf = await res.body();
      transferredBytes += buf.length;
      resourceCount++;
    } catch (e) {}
  });

  // Track long tasks
  const longTasks = [];

  const navStart = Date.now();
  await page.goto('http://localhost:3000/?stats=1&desktop=1', { waitUntil: 'networkidle' });
  const ttiMs = Date.now() - navStart;
  console.log(`TTI: ${ttiMs} ms | Transferred Bytes: ${(transferredBytes / 1024).toFixed(1)} KB across ${resourceCount} requests`);

  // Wait for 3D scene init
  await page.waitForTimeout(2000);

  // Setup performance observer for longtasks
  await page.evaluate(() => {
    window.__LONG_TASKS__ = [];
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__LONG_TASKS__.push({
            name: entry.name,
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {}
  });

  // 1. Measure Frame-Time & JS vs GL breakdown across all 7 scenes
  console.log('\n--- MEASURING FRAME-TIME & RENDER BREAKDOWN ACROSS 7 SCENES ---');
  const scenes = [
    { id: 'title', name: 'Title Screen', action: async () => window.__JUMP_TO_PHASE__('title') },
    { id: 'launch', name: 'Launch Pad', action: async () => window.__JUMP_TO_PHASE__('launch', 'moon') },
    { id: 'orbit', name: 'Orbit (LEO)', action: async () => window.__JUMP_TO_PHASE__('space', 'earth') },
    {
      id: 'solar',
      name: 'Solar System View',
      action: async () => {
        window.__JUMP_TO_PHASE__('space', 'earth');
        window.__FOCUS_SOLAR_BODY__('sun');
        window.__SET_SPACE_CAMERA_MODE__('overview');
      },
    },
    { id: 'lander', name: 'Lander Descent', action: async () => window.__JUMP_TO_PHASE__('landing', 'moon') },
    { id: 'rover', name: 'Rover Surface', action: async () => window.__JUMP_TO_PHASE__('rover', 'moon') },
    { id: 'inspector', name: 'Hardware Inspector', action: async () => window.__JUMP_TO_PHASE__('inspector') },
  ];

  const scenePerformance = [];

  for (const s of scenes) {
    await page.evaluate(s.action);
    await page.waitForTimeout(1500);

    const perfData = await page.evaluate(async () => {
      const samples = [];
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const st = window.__SCENE_STATS__ || {};
        samples.push(st);
      }
      const avg = (fn) => samples.reduce((acc, x) => acc + (fn(x) || 0), 0) / samples.length;
      return {
        fps: Math.round(avg((x) => x.fps)),
        frameMs: Number(avg((x) => x.frameMs).toFixed(2)),
        jsUpdateMs: Number(avg((x) => x.jsUpdateMs).toFixed(2)),
        renderSubmitMs: Number(avg((x) => x.renderSubmitMs).toFixed(2)),
        triangles: samples[samples.length - 1]?.triangles || 0,
        calls: samples[samples.length - 1]?.calls || 0,
        geometries: samples[samples.length - 1]?.geometries || 0,
        textures: samples[samples.length - 1]?.textures || 0,
      };
    });

    scenePerformance.push({ id: s.id, name: s.name, ...perfData });
    console.log(
      `  ${s.name}: ${perfData.fps} FPS | Frame: ${perfData.frameMs}ms (JS: ${perfData.jsUpdateMs}ms · GL: ${perfData.renderSubmitMs}ms) | Tris: ${perfData.triangles.toLocaleString()} | Calls: ${perfData.calls}`
    );
  }

  // 2. 5x Scene Enter/Exit Leak Test
  console.log('\n--- 5x SCENE ENTER/EXIT LEAK TEST ---');
  const leakRounds = [];

  for (let round = 1; round <= 5; round++) {
    for (const s of scenes) {
      await page.evaluate(s.action);
      await page.waitForTimeout(300);
    }
    // Return to title
    await page.evaluate(() => window.__JUMP_TO_PHASE__('title'));
    await page.waitForTimeout(500);

    const memoryState = await page.evaluate(() => {
      const perfMem = window.performance ? window.performance.memory : null;
      const stats = window.__SCENE_STATS__ || {};
      return {
        usedHeapMB: perfMem ? Number((perfMem.usedJSHeapSize / (1024 * 1024)).toFixed(2)) : null,
        totalHeapMB: perfMem ? Number((perfMem.totalJSHeapSize / (1024 * 1024)).toFixed(2)) : null,
        geometries: stats.geometries || 0,
        textures: stats.textures || 0,
      };
    });

    leakRounds.push({ round, ...memoryState });
    console.log(
      `  Round ${round}: Heap Used: ${memoryState.usedHeapMB} MB | Geometries: ${memoryState.geometries} | Textures: ${memoryState.textures}`
    );
  }

  // 3. Collect Longtasks during session
  const capturedLongTasks = await page.evaluate(() => window.__LONG_TASKS__ || []);
  console.log(`\nCaptured ${capturedLongTasks.length} long tasks (>50ms) during transition and load.`);

  await browser.close();

  // 4. Texture VRAM Analysis
  console.log('\n--- TEXTURE VRAM ANALYSIS ---');
  const texturesDir = path.join(__dirname, '../public/assets/planets');
  const textureFiles = [];
  if (fs.existsSync(texturesDir)) {
    for (const f of fs.readdirSync(texturesDir)) {
      if (f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')) {
        const full = path.join(texturesDir, f);
        const st = fs.statSync(full);
        textureFiles.push({ file: `planets/${f}`, sizeBytes: st.size });
      }
    }
  }

  // Add banner/textures from other dirs
  const bannersDir = path.join(__dirname, '../public/assets/banners');
  if (fs.existsSync(bannersDir)) {
    for (const f of fs.readdirSync(bannersDir)) {
      const full = path.join(bannersDir, f);
      const st = fs.statSync(full);
      textureFiles.push({ file: `banners/${f}`, sizeBytes: st.size });
    }
  }

  textureFiles.sort((a, b) => b.sizeBytes - a.sizeBytes);
  const top10Textures = textureFiles.slice(0, 10).map((t) => {
    // Standard 2K texture (2048x1024) uncompressed in GPU VRAM = 2048 * 1024 * 4 bytes = 8.39 MB
    // Standard 4K texture (4096x2048) uncompressed in GPU VRAM = 33.55 MB
    const is4K = t.sizeBytes > 1024 * 1024;
    const estVramMB = is4K ? 33.55 : 8.39;
    return {
      file: t.file,
      diskMB: Number((t.sizeBytes / (1024 * 1024)).toFixed(2)),
      estimatedVramMB: estVramMB,
    };
  });

  // 5. Bundle Top Modules
  console.log('\n--- BUNDLE TOP MODULES ANALYSIS ---');
  const distDir = path.join(__dirname, '../dist/assets');
  let bundleSize = 0;
  if (fs.existsSync(distDir)) {
    for (const f of fs.readdirSync(distDir)) {
      if (f.endsWith('.js') && f.startsWith('index-')) {
        bundleSize = fs.statSync(path.join(distDir, f)).size;
      }
    }
  }

  const output = {
    firstLoad: {
      ttiMs,
      transferredKB: Number((transferredBytes / 1024).toFixed(1)),
      resourceCount,
      mainBundleMB: Number((bundleSize / (1024 * 1024)).toFixed(2)),
    },
    scenePerformance,
    leakRounds,
    capturedLongTasksCount: capturedLongTasks.length,
    top10Textures,
  };

  fs.writeFileSync(path.join(__dirname, '../docs/overnight/DEEP_PERF_DATA.json'), JSON.stringify(output, null, 2));
  console.log('Saved deep perf data to docs/overnight/DEEP_PERF_DATA.json');
}

runAudit().catch(console.error);
