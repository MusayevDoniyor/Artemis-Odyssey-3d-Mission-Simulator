const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../tools/model-gallery');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const candidates = [
  {
    id: 'apollo-lunar-module',
    name: 'Apollo Lunar Module',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Apollo Lunar Module/Apollo Lunar Module.png',
    glb: '3D Models/Apollo Lunar Module/Apollo Lunar Module.glb',
    sizeBytes: 716840,
    triangles: 97588,
    meshes: 134,
    materials: 12,
    role: 'Hero Craft (Lunar Descent/Ascent)',
    license: 'Public Domain (NASA)',
    status: 'PASS (Needs decimation to <= 75k)',
  },
  {
    id: 'bennu-asteroid',
    name: '1999 RQ36 Asteroid (Bennu)',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/1999 RQ36 asteroid/1999 RQ36 asteroid.png',
    glb: '3D Models/1999 RQ36 asteroid/1999 RQ36 asteroid.glb',
    sizeBytes: 329596,
    triangles: 18240,
    meshes: 1,
    materials: 2,
    role: 'Deep Space Target / Science Sample',
    license: 'Public Domain (NASA)',
    status: 'PASS (Within 40k budget)',
  },
  {
    id: 'crawler-transporter',
    name: 'Crawler-Transporter',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Crawler/Crawler.png',
    glb: '3D Models/Crawler/Crawler.glb',
    sizeBytes: 1629892,
    triangles: 279800,
    meshes: 1,
    materials: 6,
    role: 'Launch Complex Ground Scenery',
    license: 'Public Domain (NASA)',
    status: 'PASS (Needs decimation to <= 40k)',
  },
  {
    id: 'gateway-core',
    name: 'Gateway Core',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Gateway/Gateway Core.png',
    glb: '3D Models/Gateway/Gateway Core.glb',
    sizeBytes: 66214552,
    triangles: 92209,
    meshes: 51,
    materials: 15,
    role: 'Cislunar Orbital Station (Paused/Future)',
    license: 'Public Domain (NASA)',
    status: 'PASS (Needs WebP compression & decimation)',
  },
  {
    id: 'ingenuity-helicopter',
    name: 'Ingenuity Mars Helicopter',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Ingenuity Mars Helicopter/Ingenuity Mars Helicopter.png',
    glb: '3D Models/Ingenuity Mars Helicopter/Ingenuity Mars Helicopter.glb',
    sizeBytes: 2019408,
    triangles: 9124,
    meshes: 11,
    materials: 10,
    role: 'Mars Surface Companion Scout',
    license: 'Public Domain (NASA/JPL-Caltech)',
    status: 'PASS (Ultra-low 9.1k tris, separable rotors)',
  },
  {
    id: 'iss-a',
    name: 'International Space Station (A)',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/International Space Station (ISS) (A)/International Space Station (ISS) (A).png',
    glb: '3D Models/International Space Station (ISS) (A)/International Space Station (ISS) (A).glb',
    sizeBytes: 39708,
    triangles: 6642,
    meshes: 1,
    materials: 6,
    role: 'LEO Background Orbit Object',
    license: 'Public Domain (NASA)',
    status: 'PASS (Ultra-low 6.6k tris, ideal replacement for 174k ISS)',
  },
  {
    id: 'jwst-b',
    name: 'James Webb Space Telescope (B)',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/James Webb Space Telescope (B)/James Webb Space Telescope (B).png',
    glb: '3D Models/James Webb Space Telescope (B)/James Webb Space Telescope (B).glb',
    sizeBytes: 1004248,
    triangles: 99239,
    meshes: 1,
    materials: 36,
    role: 'Deep Space L2 Observatory',
    license: 'Public Domain (NASA)',
    status: 'PASS (Needs decimation to <= 40k)',
  },
  {
    id: 'mars-2020-perseverance',
    name: 'Perseverance Mars Rover',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Mars 2020 Perseverance Rover/Mars 2020 Perseverance Rover.png',
    glb: '3D Models/Mars 2020 Perseverance Rover/Mars 2020 Perseverance Rover.glb',
    sizeBytes: 4987176,
    triangles: 199521,
    meshes: 68,
    materials: 47,
    role: 'Hero Rover (Mars Jezero Exploration)',
    license: 'Public Domain (NASA/JPL-Caltech)',
    status: 'PASS (Decimated version in repo at 1.5MB / 75k tris)',
  },
  {
    id: 'mobile-launcher',
    name: 'Mobile Launcher (assembled)',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Mobile Launcher/Mobile Launcher (assembled).png',
    glb: '3D Models/Mobile Launcher/Mobile Launcher (assembled).glb',
    sizeBytes: 198480,
    triangles: 20446,
    meshes: 1,
    materials: 2,
    role: 'Pad 39B Launch Platform & Tower Scenery',
    license: 'Public Domain (NASA)',
    status: 'PASS (20.4k tris within 40k budget)',
  },
  {
    id: 'saturn-v',
    name: 'Saturn V Moon Rocket',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Saturn V/Saturn V.png',
    glb: '3D Models/Saturn V/Saturn V.glb',
    sizeBytes: 927212,
    triangles: 62374,
    meshes: 4,
    materials: 2,
    role: 'Historical Hero Rocket (Separable Stages)',
    license: 'Public Domain (NASA)',
    status: 'PASS (62.3k tris within 75k hero budget)',
  },
  {
    id: 'space-launch-system',
    name: 'Space Launch System (SLS Block 1)',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Space Launch System Block 1/Block 1 (GNC markings scanline).png',
    glb: '3D Models/Space Launch System Block 1/Block 1 (GNC markings).7z',
    sizeBytes: 14165913,
    triangles: 110000,
    meshes: 18,
    materials: 12,
    role: 'Hero Launcher (Artemis II)',
    license: 'Public Domain (NASA)',
    status: 'PASS (.blend archive in repo, procedural hero currently used)',
  },
  {
    id: 'space-shuttle-orbiter',
    name: 'Space Shuttle Orbiter (A)',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Space Shuttle (A)/Space Shuttle (A).png',
    glb: '3D Models/Space Shuttle (A)/Space Shuttle (A).glb',
    sizeBytes: 1194068,
    triangles: 32836,
    meshes: 1,
    materials: 6,
    role: 'Historical Spacecraft / Academy',
    license: 'Public Domain (NASA)',
    status: 'PASS (32.8k tris within 40k budget)',
  },
  {
    id: 'tdrs-satellite',
    name: 'Tracking and Data Relay Satellite (TDRS)',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Tracking and Data Relay Satellites (TDRS) (C)/Tracking and Data Relay Satellites (TDRS) (C).png',
    glb: '3D Models/Tracking and Data Relay Satellites (TDRS) (C)/Tracking and Data Relay Satellites (TDRS) (C).glb',
    sizeBytes: 2127504,
    triangles: 51218,
    meshes: 1,
    materials: 11,
    role: 'Communications Network Satellite',
    license: 'Public Domain (NASA)',
    status: 'PASS (Repo has 96k decimated variant)',
  },
  {
    id: 'vab-building',
    name: 'Vehicle Assembly Building (VAB)',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Vehicle Assembly Building (VAB)/Vehicle Assembly Building (VAB).png',
    glb: '3D Models/Vehicle Assembly Building (VAB)/Vehicle Assembly Building (VAB).glb',
    sizeBytes: 6505624,
    triangles: 6458,
    meshes: 1,
    materials: 9,
    role: 'KSC Launch Complex Scenery',
    license: 'Public Domain (NASA)',
    status: 'PASS (Ultra-low 6.4k tris, high-res textures)',
  },
  {
    id: 'viking-lander',
    name: 'Viking Mars Lander',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Viking Lander/Viking Lander.png',
    glb: '3D Models/Viking Lander/Viking Lander.glb',
    sizeBytes: 1849384,
    triangles: 99526,
    meshes: 2,
    materials: 9,
    role: 'Mars Historical Lander',
    license: 'Public Domain (NASA)',
    status: 'PASS (Needs decimation to <= 75k hero)',
  },
  {
    id: 'voyager-probe',
    name: 'Voyager Interstellar Probe',
    srcPng: 'assets-src/nasa-3d-cache/3D Models/Voyager Probe (A)/Voyager Probe (A).png',
    glb: '3D Models/Voyager Probe (A)/Voyager Probe (A).glb',
    sizeBytes: 285936,
    triangles: 29911,
    meshes: 1,
    materials: 16,
    role: 'Interstellar Probe / Outer Solar System',
    license: 'Public Domain (NASA/JPL-Caltech)',
    status: 'PASS (29.9k tris within 40k budget)',
  },
];

async function generate() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log(`Processing ${candidates.length} candidate models into 512x512 transparent PNGs...`);

  for (const c of candidates) {
    if (!fs.existsSync(c.srcPng)) {
      console.warn(`Source PNG not found for ${c.id}: ${c.srcPng}`);
      continue;
    }

    const pngBase64 = fs.readFileSync(c.srcPng).toString('base64');
    const dataUri = `data:image/png;base64,${pngBase64}`;

    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <body style="margin: 0; background: transparent; overflow: hidden;">
        <canvas id="c" width="512" height="512" style="display: block;"></canvas>
      </body>
      </html>
    `);

    await page.evaluate(async (uri) => {
      const canvas = document.getElementById('c');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = uri;
      });

      // Fit image into 512x512 while preserving aspect ratio and padding 24px
      const targetSize = 512;
      const pad = 24;
      const avail = targetSize - pad * 2;
      const scale = Math.min(avail / img.width, avail / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (targetSize - w) / 2;
      const y = (targetSize - h) / 2;

      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(img, x, y, w, h);
    }, dataUri);

    const canvasElem = await page.$('#c');
    const outPngPath = path.join(outDir, `${c.id}.png`);
    await canvasElem.screenshot({ path: outPngPath, omitBackground: true });
    console.log(`Saved 512x512 transparent preview: ${c.id}.png`);
  }

  await browser.close();

  // Generate tools/model-gallery/index.html
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>NASA 3D Model Gallery & Evaluation Matrix</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #0b0f19; color: #e2e8f0; margin: 0; padding: 24px; }
    h1 { color: #38bdf8; font-size: 24px; margin-bottom: 4px; }
    p.subtitle { color: #94a3b8; font-size: 14px; margin-top: 0; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
    .preview-box { background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); height: 260px; display: flex; align-items: center; justify-content: center; border-bottom: 1px solid #1e293b; }
    .preview-box img { max-width: 90%; max-height: 90%; object-fit: contain; }
    .info { padding: 16px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .title { font-size: 16px; font-weight: bold; color: #f8fafc; margin-bottom: 6px; }
    .role { font-size: 12px; color: #38bdf8; font-weight: 600; margin-bottom: 12px; }
    .stats { font-size: 12px; color: #cbd5e1; line-height: 1.6; }
    .status-badge { display: inline-block; margin-top: 12px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: bold; }
    .badge-pass { background: #064e3b; color: #34d399; }
    .badge-warn { background: #78350f; color: #fbbf24; }
  </style>
</head>
<body>
  <h1>NASA 3D Resources Model Survey Gallery</h1>
  <p class="subtitle">Official NASA 3D assets evaluated for ArtemisOdyssey against 75k hero / 40k background triangle budgets.</p>
  <div class="grid">
    ${candidates
      .map(
        (c) => `
      <div class="card">
        <div class="preview-box">
          <img src="${c.id}.png" alt="${c.name}" />
        </div>
        <div class="info">
          <div>
            <div class="title">${c.name}</div>
            <div class="role">${c.role}</div>
            <div class="stats">
              <div><strong>Triangles:</strong> ${c.triangles.toLocaleString()}</div>
              <div><strong>Meshes:</strong> ${c.meshes} | <strong>Materials:</strong> ${c.materials}</div>
              <div><strong>File Size:</strong> ${(c.sizeBytes / (1024 * 1024)).toFixed(2)} MB</div>
              <div><strong>Licence:</strong> ${c.license}</div>
            </div>
          </div>
          <div class="status-badge ${c.triangles <= 75000 ? 'badge-pass' : 'badge-warn'}">
            ${c.status}
          </div>
        </div>
      </div>
    `
      )
      .join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  console.log(`Generated model gallery HTML: tools/model-gallery/index.html`);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
