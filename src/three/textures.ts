import * as THREE from 'three';

export interface ProceduralTextureSet {
  moonAlbedo: THREE.CanvasTexture;
  moonBump: THREE.CanvasTexture;
  marsAlbedo: THREE.CanvasTexture;
  marsBump: THREE.CanvasTexture;
  foilAlbedo: THREE.CanvasTexture;
  foilBump: THREE.CanvasTexture;
  solarPanel: THREE.CanvasTexture;
  earthAlbedo: THREE.CanvasTexture;
  earthClouds: THREE.CanvasTexture;
  slsCore: THREE.CanvasTexture;
  slsSrb: THREE.CanvasTexture;
  orionTile: THREE.CanvasTexture;
  nasaDecal: THREE.CanvasTexture;
  kscGround: THREE.CanvasTexture;
  duskSky: THREE.CanvasTexture;
  cloudPuff: THREE.CanvasTexture;
  towerSteel: THREE.CanvasTexture;
  sunAlbedo: THREE.CanvasTexture;
  moonSphereAlbedo: THREE.CanvasTexture;
  marsSphereAlbedo: THREE.CanvasTexture;
}

function finalizeColorTex(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  return tex;
}

function finalizeDataTex(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = maxAnisotropy;
  if (repeatX > 1 || repeatY > 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  return tex;
}

export function createProceduralTextureSet(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Organic Lunar Silicate Regolith Albedo & Micro-Relief Bump (no repetitive flat circle stamps)
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 512;
  moonCanvas.height = 512;
  const mCtx = moonCanvas.getContext('2d')!;
  mCtx.fillStyle = '#6c737f';
  mCtx.fillRect(0, 0, 512, 512);

  // Broad highland/mare mineral variation
  for (let i = 0; i < 220; i++) {
    const gx = Math.random() * 512;
    const gy = Math.random() * 512;
    const gr = 24 + Math.random() * 88;
    const g = mCtx.createRadialGradient(gx, gy, 2, gx, gy, gr);
    const bright = i % 2 === 0;
    g.addColorStop(0, bright ? 'rgba(148,156,170,0.12)' : 'rgba(54,60,70,0.14)');
    g.addColorStop(1, 'rgba(108,115,127,0)');
    mCtx.fillStyle = g;
    mCtx.beginPath();
    mCtx.arc(gx, gy, gr, 0, Math.PI * 2);
    mCtx.fill();
  }

  // Fine basalt/anorthosite regolith grit
  for (let i = 0; i < 16000; i++) {
    const v = 78 + Math.floor(Math.random() * 58);
    mCtx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    mCtx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }

  // Soft shaded micro-craters with subtle highlight lip & shadowed bowl
  for (let c = 0; c < 48; c++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const r = 3 + Math.random() * 11;
    // Wrap seamlessly at edges
    for (const ox of [-512, 0, 512]) {
      for (const oy of [-512, 0, 512]) {
        const px = cx + ox;
        const py = cy + oy;
        if (px + r < 0 || px - r > 512 || py + r < 0 || py - r > 512) continue;
        const rimGrad = mCtx.createRadialGradient(px - r * 0.15, py - r * 0.15, r * 0.4, px, py, r * 1.15);
        rimGrad.addColorStop(0, 'rgba(42,47,56,0.45)');
        rimGrad.addColorStop(0.68, 'rgba(165,174,188,0.22)');
        rimGrad.addColorStop(1, 'rgba(108,115,127,0)');
        mCtx.fillStyle = rimGrad;
        mCtx.beginPath();
        mCtx.arc(px, py, r * 1.15, 0, Math.PI * 2);
        mCtx.fill();
      }
    }
  }

  // 2. Crinkled Gold Kapton Multi-Layer Insulation (LM-2 & VIPER)
  const foilCanvas = document.createElement('canvas');
  foilCanvas.width = 256;
  foilCanvas.height = 256;
  const fCtx = foilCanvas.getContext('2d')!;
  const foilGrad = fCtx.createLinearGradient(0, 0, 256, 256);
  foilGrad.addColorStop(0, '#b45309');
  foilGrad.addColorStop(0.5, '#f59e0b');
  foilGrad.addColorStop(1, '#92400e');
  fCtx.fillStyle = foilGrad;
  fCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 850; i++) {
    const tone = i % 3;
    fCtx.fillStyle =
      tone === 0
        ? 'rgba(254, 240, 138, 0.44)'
        : tone === 1
          ? 'rgba(120, 53, 15, 0.42)'
          : 'rgba(245, 158, 11, 0.32)';
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    fCtx.beginPath();
    fCtx.moveTo(x, y);
    fCtx.lineTo(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);
    fCtx.lineTo(x + (Math.random() - 0.5) * 20, y + (Math.random() - 0.5) * 20);
    fCtx.fill();
  }

  // 3. High-Efficiency Photovoltaic Solar Cell Grid
  const solarCanvas = document.createElement('canvas');
  solarCanvas.width = 256;
  solarCanvas.height = 256;
  const sCtx = solarCanvas.getContext('2d')!;
  sCtx.fillStyle = '#0b1324';
  sCtx.fillRect(0, 0, 256, 256);
  sCtx.fillStyle = '#1e40af';
  for (let x = 4; x < 256; x += 32) {
    for (let y = 4; y < 256; y += 16) {
      sCtx.fillRect(x, y, 26, 12);
      sCtx.fillStyle = 'rgba(96, 165, 250, 0.25)';
      sCtx.fillRect(x, y, 26, 2);
      sCtx.fillStyle = '#1e40af';
    }
  }
  sCtx.strokeStyle = '#60a5fa';
  sCtx.lineWidth = 1;
  for (let x = 0; x <= 256; x += 32) {
    sCtx.beginPath();
    sCtx.moveTo(x, 0);
    sCtx.lineTo(x, 256);
    sCtx.stroke();
  }

  // 4. Earth Albedo + Clouds
  const earthCanvas = document.createElement('canvas');
  earthCanvas.width = 1024;
  earthCanvas.height = 512;
  const eCtx = earthCanvas.getContext('2d')!;
  const ocean = eCtx.createLinearGradient(0, 0, 0, 512);
  ocean.addColorStop(0, '#0c4a6e');
  ocean.addColorStop(0.5, '#0284c7');
  ocean.addColorStop(1, '#0c4a6e');
  eCtx.fillStyle = ocean;
  eCtx.fillRect(0, 0, 1024, 512);

  const paintContinent = (pts: number[][], col: string) => {
    eCtx.fillStyle = col;
    eCtx.beginPath();
    pts.forEach((p, idx) => (idx === 0 ? eCtx.moveTo(p[0], p[1]) : eCtx.lineTo(p[0], p[1])));
    eCtx.closePath();
    eCtx.fill();
  };
  paintContinent([[130, 90], [230, 80], [290, 120], [250, 200], [180, 245], [120, 160]], '#15803d');
  paintContinent([[245, 265], [315, 285], [340, 355], [295, 445], [255, 390]], '#166534');
  paintContinent([[465, 85], [600, 68], [765, 82], [845, 130], [780, 225], [620, 210], [475, 160]], '#15803d');
  paintContinent([[475, 195], [575, 192], [620, 255], [585, 375], [520, 410], [460, 275]], '#ca8a04');
  paintContinent([[770, 325], [855, 322], [870, 388], [805, 408], [765, 370]], '#b45309');
  eCtx.fillStyle = '#f8fafc';
  eCtx.fillRect(0, 0, 1024, 24);
  eCtx.fillRect(0, 480, 1024, 32);

  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = 512;
  cloudCanvas.height = 256;
  const cCtx = cloudCanvas.getContext('2d')!;
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * 512;
    const y = 16 + Math.random() * 224;
    const rx = 18 + Math.random() * 44;
    const g = cCtx.createRadialGradient(x, y, 2, x, y, rx);
    g.addColorStop(0, 'rgba(255,255,255,0.52)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    cCtx.fillStyle = g;
    cCtx.beginPath();
    cCtx.ellipse(x, y, rx, 7, 0, 0, Math.PI * 2);
    cCtx.fill();
  }

  // 5. SLS Block 1 Core Stage Texture (Blueprint Accurate: SOFI Orange + Corrugated Intertank + Engine Shroud)
  const coreCanvas = document.createElement('canvas');
  coreCanvas.width = 512;
  coreCanvas.height = 1024;
  const scCtx = coreCanvas.getContext('2d')!;
  const coreGrad = scCtx.createLinearGradient(0, 0, 512, 0);
  coreGrad.addColorStop(0, '#c2410c');
  coreGrad.addColorStop(0.5, '#ea580c');
  coreGrad.addColorStop(1, '#c2410c');
  scCtx.fillStyle = coreGrad;
  scCtx.fillRect(0, 0, 512, 1024);

  // Intertank vertical stringer ribs & weld rings
  scCtx.fillStyle = 'rgba(124, 45, 18, 0.55)';
  scCtx.fillRect(0, 155, 512, 150);
  scCtx.fillStyle = 'rgba(253, 186, 116, 0.25)';
  for (let rx = 8; rx < 512; rx += 16) {
    scCtx.fillRect(rx, 155, 4, 150);
  }
  scCtx.fillStyle = 'rgba(154, 52, 18, 0.5)';
  scCtx.fillRect(0, 620, 512, 14);

  // White Aft Engine Section + Roll Pattern
  scCtx.fillStyle = '#f8fafc';
  scCtx.fillRect(0, 868, 512, 156);
  scCtx.fillStyle = '#0f172a';
  for (let x = 16; x < 512; x += 64) {
    scCtx.fillRect(x, 876, 28, 22);
    scCtx.fillRect(x + 20, 965, 18, 38);
  }
  scCtx.fillStyle = '#ffffff';
  scCtx.font = 'bold 54px sans-serif';
  scCtx.textAlign = 'center';
  scCtx.fillText('U', 256, 465);
  scCtx.fillText('S', 256, 540);
  scCtx.fillText('A', 256, 615);

  // 6. 5-Segment Solid Rocket Booster Texture (Blueprint Accurate)
  const srbCanvas = document.createElement('canvas');
  srbCanvas.width = 256;
  srbCanvas.height = 1024;
  const srCtx = srbCanvas.getContext('2d')!;
  srCtx.fillStyle = '#f8fafc';
  srCtx.fillRect(0, 0, 256, 1024);
  srCtx.fillStyle = '#0f172a';
  srCtx.fillRect(0, 110, 256, 28);
  srCtx.fillRect(0, 855, 256, 24);
  // US Flag & NASA stripe band
  srCtx.fillStyle = '#1d4ed8';
  srCtx.fillRect(92, 230, 32, 24);
  srCtx.fillStyle = '#dc2626';
  for (let sy = 230; sy < 270; sy += 8) {
    srCtx.fillRect(124, sy, 42, 4);
  }
  srCtx.strokeStyle = '#64748b';
  srCtx.lineWidth = 4;
  [290, 435, 580, 725, 855].forEach((y) => {
    srCtx.beginPath();
    srCtx.moveTo(0, y);
    srCtx.lineTo(256, y);
    srCtx.stroke();
  });

  // 7. Orion Capsule Tiles + Windows + Hatch
  const orionCanvas = document.createElement('canvas');
  orionCanvas.width = 512;
  orionCanvas.height = 256;
  const oCtx = orionCanvas.getContext('2d')!;
  oCtx.fillStyle = '#f1f5f9';
  oCtx.fillRect(0, 0, 512, 256);
  oCtx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
  for (let x = 0; x < 512; x += 32) {
    oCtx.beginPath();
    oCtx.moveTo(x, 0);
    oCtx.lineTo(x, 256);
    oCtx.stroke();
  }
  oCtx.fillStyle = '#0f172a';
  oCtx.fillRect(216, 68, 80, 52);
  oCtx.fillStyle = '#1e3a8a';
  oCtx.fillRect(222, 74, 68, 40);
  oCtx.fillStyle = '#0b3d91';
  oCtx.beginPath();
  oCtx.arc(256, 174, 22, 0, Math.PI * 2);
  oCtx.fill();

  // 8. NASA Meatball Insignia Decal Texture
  const nasaCanvas = document.createElement('canvas');
  nasaCanvas.width = 256;
  nasaCanvas.height = 256;
  const nCtx = nasaCanvas.getContext('2d')!;
  nCtx.clearRect(0, 0, 256, 256);
  nCtx.fillStyle = '#0B3D91';
  nCtx.beginPath();
  nCtx.arc(128, 128, 96, 0, Math.PI * 2);
  nCtx.fill();
  nCtx.strokeStyle = '#FC3D21';
  nCtx.lineWidth = 14;
  nCtx.beginPath();
  nCtx.moveTo(28, 165);
  nCtx.lineTo(132, 90);
  nCtx.lineTo(234, 54);
  nCtx.stroke();
  nCtx.fillStyle = '#FFFFFF';
  nCtx.font = 'bold 52px Georgia, serif';
  nCtx.textAlign = 'center';
  nCtx.fillText('NASA', 128, 146);

  // 9. KSC Ground Coastal Plain & Tarmac Apron
  const kscCanvas = document.createElement('canvas');
  kscCanvas.width = 512;
  kscCanvas.height = 512;
  const kCtx = kscCanvas.getContext('2d')!;
  kCtx.fillStyle = '#182b27';
  kCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const shade = 24 + Math.floor(Math.random() * 34);
    kCtx.fillStyle = `rgba(${shade}, ${shade + 22}, ${shade + 10}, 0.32)`;
    kCtx.fillRect(Math.random() * 512, Math.random() * 512, 2.5, 2.5);
  }
  kCtx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  kCtx.lineWidth = 2;
  for (let g = 0; g < 512; g += 64) {
    kCtx.beginPath();
    kCtx.moveTo(g, 0);
    kCtx.lineTo(g, 512);
    kCtx.stroke();
    kCtx.beginPath();
    kCtx.moveTo(0, g);
    kCtx.lineTo(512, g);
    kCtx.stroke();
  }

  // 10. Florida Space Coast Sunset-to-Twilight Atmospheric Sky Dome
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const skCtx = skyCanvas.getContext('2d')!;
  const skGrad = skCtx.createLinearGradient(0, 0, 0, 512);
  skGrad.addColorStop(0.0, '#020617');
  skGrad.addColorStop(0.24, '#071330');
  skGrad.addColorStop(0.38, '#173461');
  skGrad.addColorStop(0.455, '#3b5f8c');
  skGrad.addColorStop(0.485, '#ea7b35');
  skGrad.addColorStop(0.505, '#fbbf24');
  skGrad.addColorStop(0.53, '#7c3f2e');
  skGrad.addColorStop(0.60, '#162238');
  skGrad.addColorStop(1.0, '#070b14');
  skCtx.fillStyle = skGrad;
  skCtx.fillRect(0, 0, 1024, 512);

  // Subtle distant twilight cirrus bands near horizon
  for (let i = 0; i < 65; i++) {
    const cx = Math.random() * 1024;
    const cy = 195 + Math.random() * 56;
    const w = 55 + Math.random() * 130;
    const cg = skCtx.createRadialGradient(cx, cy, 4, cx, cy, w);
    const warm = cy > 230;
    cg.addColorStop(0, warm ? 'rgba(253, 186, 116, 0.24)' : 'rgba(147, 197, 253, 0.16)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    skCtx.fillStyle = cg;
    skCtx.beginPath();
    skCtx.ellipse(cx, cy, w, 9, 0, 0, Math.PI * 2);
    skCtx.fill();
  }

  // 11. Volumetric Cloud Puff Sprite Texture
  const puffCanvas = document.createElement('canvas');
  puffCanvas.width = 128;
  puffCanvas.height = 128;
  const pCtx = puffCanvas.getContext('2d')!;
  pCtx.clearRect(0, 0, 128, 128);
  const pGrad = pCtx.createRadialGradient(64, 58, 6, 64, 64, 60);
  pGrad.addColorStop(0, 'rgba(241, 245, 249, 0.72)');
  pGrad.addColorStop(0.45, 'rgba(203, 213, 225, 0.36)');
  pGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 128, 128);

  // 12. LC-39B Structural Steel & Concrete Grit Texture
  const steelCanvas = document.createElement('canvas');
  steelCanvas.width = 256;
  steelCanvas.height = 256;
  const stCtx = steelCanvas.getContext('2d')!;
  stCtx.fillStyle = '#475569';
  stCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    stCtx.fillStyle = y % 32 === 0 ? 'rgba(15, 23, 42, 0.28)' : 'rgba(226, 232, 240, 0.12)';
    stCtx.fillRect(0, y, 256, 3);
  }
  for (let i = 0; i < 1200; i++) {
    stCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.08)';
    stCtx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  // 13. Mars Jezero Iron-Oxide & Sedimentary Clay Regolith Albedo & Bump
  const marsCanvas = document.createElement('canvas');
  marsCanvas.width = 512;
  marsCanvas.height = 512;
  const maCtx = marsCanvas.getContext('2d')!;
  maCtx.fillStyle = '#a44a2a';
  maCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 180; i++) {
    const gx = Math.random() * 512;
    const gy = Math.random() * 512;
    const gr = 20 + Math.random() * 82;
    const g = maCtx.createRadialGradient(gx, gy, 2, gx, gy, gr);
    const tone = i % 3 === 0 ? 'rgba(217, 119, 68, 0.14)' : i % 3 === 1 ? 'rgba(92, 42, 28, 0.16)' : 'rgba(180, 92, 52, 0.12)';
    g.addColorStop(0, tone);
    g.addColorStop(1, 'rgba(164, 74, 42, 0)');
    maCtx.fillStyle = g;
    maCtx.beginPath();
    maCtx.arc(gx, gy, gr, 0, Math.PI * 2);
    maCtx.fill();
  }
  for (let i = 0; i < 14000; i++) {
    const r = 135 + Math.floor(Math.random() * 68);
    const g = Math.floor(r * 0.45 + Math.random() * 14);
    const b = Math.floor(r * 0.25 + Math.random() * 10);
    maCtx.fillStyle = `rgb(${r},${g},${b})`;
    maCtx.fillRect(Math.random() * 512, Math.random() * 512, 1.8, 1.8);
  }
  for (let c = 0; c < 34; c++) {
    const cx = Math.random() * 512;
    const cy = Math.random() * 512;
    const r = 4 + Math.random() * 12;
    const rimGrad = maCtx.createRadialGradient(cx - r * 0.15, cy - r * 0.15, r * 0.35, cx, cy, r * 1.15);
    rimGrad.addColorStop(0, 'rgba(72, 28, 18, 0.38)');
    rimGrad.addColorStop(0.7, 'rgba(224, 142, 92, 0.18)');
    rimGrad.addColorStop(1, 'rgba(164, 74, 42, 0)');
    maCtx.fillStyle = rimGrad;
    maCtx.beginPath();
    maCtx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
    maCtx.fill();
  }

  // 14. Solar Granulation & Sunspot Corona Albedo
  const sunCanvas = document.createElement('canvas');
  sunCanvas.width = 512;
  sunCanvas.height = 256;
  const suCtx = sunCanvas.getContext('2d')!;
  const suGrad = suCtx.createLinearGradient(0, 0, 0, 256);
  suGrad.addColorStop(0, '#f59e0b');
  suGrad.addColorStop(0.5, '#fbbf24');
  suGrad.addColorStop(1, '#ea580c');
  suCtx.fillStyle = suGrad;
  suCtx.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 320; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 256;
    const r = 6 + Math.random() * 24;
    const cell = suCtx.createRadialGradient(x, y, 1, x, y, r);
    cell.addColorStop(0, i % 4 === 0 ? 'rgba(254,249,195,0.62)' : 'rgba(234,88,12,0.45)');
    cell.addColorStop(1, 'rgba(251,191,36,0)');
    suCtx.fillStyle = cell;
    suCtx.beginPath();
    suCtx.arc(x, y, r, 0, Math.PI * 2);
    suCtx.fill();
  }
  for (let sp = 0; sp < 9; sp++) {
    const sx = 40 + Math.random() * 432;
    const sy = 45 + Math.random() * 166;
    const sr = 5 + Math.random() * 9;
    const spot = suCtx.createRadialGradient(sx, sy, 1, sx, sy, sr);
    spot.addColorStop(0, 'rgba(124,45,18,0.85)');
    spot.addColorStop(0.55, 'rgba(194,65,12,0.45)');
    spot.addColorStop(1, 'rgba(245,158,11,0)');
    suCtx.fillStyle = spot;
    suCtx.beginPath();
    suCtx.arc(sx, sy, sr, 0, Math.PI * 2);
    suCtx.fill();
  }

  // 15. Global Lunar Sphere Albedo (Maria Basins + Highland Rays + Tycho Ejecta)
  const moonSphCanvas = document.createElement('canvas');
  moonSphCanvas.width = 512;
  moonSphCanvas.height = 256;
  const msCtx = moonSphCanvas.getContext('2d')!;
  msCtx.fillStyle = '#9ca3af';
  msCtx.fillRect(0, 0, 512, 256);
  [
    [135, 95, 52],
    [195, 118, 38],
    [250, 88, 44],
    [320, 128, 35],
    [95, 138, 32],
    [390, 102, 42],
  ].forEach(([mx, my, mr]) => {
    const mare = msCtx.createRadialGradient(mx, my, 4, mx, my, mr);
    mare.addColorStop(0, 'rgba(55,65,81,0.72)');
    mare.addColorStop(0.75, 'rgba(75,85,99,0.42)');
    mare.addColorStop(1, 'rgba(156,163,175,0)');
    msCtx.fillStyle = mare;
    msCtx.beginPath();
    msCtx.arc(mx, my, mr, 0, Math.PI * 2);
    msCtx.fill();
  });
  for (let c = 0; c < 85; c++) {
    const cx = Math.random() * 512;
    const cy = 18 + Math.random() * 220;
    const cr = 3 + Math.random() * 11;
    const g = msCtx.createRadialGradient(cx - cr * 0.2, cy - cr * 0.2, cr * 0.25, cx, cy, cr);
    g.addColorStop(0, 'rgba(51,65,85,0.55)');
    g.addColorStop(0.75, 'rgba(226,232,240,0.45)');
    g.addColorStop(1, 'rgba(156,163,175,0)');
    msCtx.fillStyle = g;
    msCtx.beginPath();
    msCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    msCtx.fill();
  }

  // 16. Global Mars Sphere Albedo (Iron Oxide Plains + Syrtis Major + Valles Marineris + Polar Ice Caps)
  const marsSphCanvas = document.createElement('canvas');
  marsSphCanvas.width = 512;
  marsSphCanvas.height = 256;
  const maSphCtx = marsSphCanvas.getContext('2d')!;
  const maSphGrad = maSphCtx.createLinearGradient(0, 0, 0, 256);
  maSphGrad.addColorStop(0, '#c25934');
  maSphGrad.addColorStop(0.5, '#d96b38');
  maSphGrad.addColorStop(1, '#9a3c22');
  maSphCtx.fillStyle = maSphGrad;
  maSphCtx.fillRect(0, 0, 512, 256);
  // Dark basaltic albedo features (Syrtis Major & Acidalia)
  [
    [150, 92, 48],
    [285, 134, 56],
    [395, 108, 42],
    [82, 146, 36],
  ].forEach(([bx, by, br]) => {
    const dark = maSphCtx.createRadialGradient(bx, by, 4, bx, by, br);
    dark.addColorStop(0, 'rgba(76,29,21,0.68)');
    dark.addColorStop(1, 'rgba(164,74,42,0)');
    maSphCtx.fillStyle = dark;
    maSphCtx.beginPath();
    maSphCtx.ellipse(bx, by, br * 1.25, br * 0.78, 0.25, 0, Math.PI * 2);
    maSphCtx.fill();
  });
  // Valles Marineris canyon scar
  maSphCtx.strokeStyle = 'rgba(69,26,18,0.75)';
  maSphCtx.lineWidth = 5;
  maSphCtx.beginPath();
  maSphCtx.moveTo(190, 128);
  maSphCtx.bezierCurveTo(235, 122, 275, 138, 325, 130);
  maSphCtx.stroke();
  // Dust storms & crater speckles
  for (let i = 0; i < 65; i++) {
    const dx = Math.random() * 512;
    const dy = 24 + Math.random() * 208;
    const dr = 8 + Math.random() * 24;
    const dust = maSphCtx.createRadialGradient(dx, dy, 1, dx, dy, dr);
    dust.addColorStop(0, 'rgba(251,146,60,0.34)');
    dust.addColorStop(1, 'rgba(217,107,56,0)');
    maSphCtx.fillStyle = dust;
    maSphCtx.beginPath();
    maSphCtx.arc(dx, dy, dr, 0, Math.PI * 2);
    maSphCtx.fill();
  }
  // White North & South CO2 Polar Ice Caps
  maSphCtx.fillStyle = '#f8fafc';
  maSphCtx.fillRect(0, 0, 512, 16);
  maSphCtx.fillRect(0, 238, 512, 18);

  return {
    moonAlbedo: finalizeColorTex(moonCanvas, maxAnisotropy, 12, 12),
    moonBump: finalizeDataTex(moonCanvas, maxAnisotropy, 12, 12),
    marsAlbedo: finalizeColorTex(marsCanvas, maxAnisotropy, 12, 12),
    marsBump: finalizeDataTex(marsCanvas, maxAnisotropy, 12, 12),
    foilAlbedo: finalizeColorTex(foilCanvas, maxAnisotropy, 3, 3),
    foilBump: finalizeDataTex(foilCanvas, maxAnisotropy, 3, 3),
    solarPanel: finalizeColorTex(solarCanvas, maxAnisotropy),
    earthAlbedo: finalizeColorTex(earthCanvas, maxAnisotropy),
    earthClouds: finalizeColorTex(cloudCanvas, maxAnisotropy),
    slsCore: finalizeColorTex(coreCanvas, maxAnisotropy),
    slsSrb: finalizeColorTex(srbCanvas, maxAnisotropy),
    orionTile: finalizeColorTex(orionCanvas, maxAnisotropy),
    nasaDecal: finalizeColorTex(nasaCanvas, maxAnisotropy),
    kscGround: finalizeColorTex(kscCanvas, maxAnisotropy, 16, 16),
    duskSky: finalizeColorTex(skyCanvas, maxAnisotropy),
    cloudPuff: finalizeColorTex(puffCanvas, maxAnisotropy),
    towerSteel: finalizeColorTex(steelCanvas, maxAnisotropy, 2, 4),
    sunAlbedo: finalizeColorTex(sunCanvas, maxAnisotropy),
    moonSphereAlbedo: finalizeColorTex(moonSphCanvas, maxAnisotropy),
    marsSphereAlbedo: finalizeColorTex(marsSphCanvas, maxAnisotropy),
  };
}
