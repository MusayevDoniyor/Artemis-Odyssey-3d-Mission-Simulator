import * as THREE from 'three';

export interface ProceduralTextureSet {
  moonAlbedo: THREE.CanvasTexture;
  moonBump: THREE.CanvasTexture;
  foilAlbedo: THREE.CanvasTexture;
  foilBump: THREE.CanvasTexture;
  solarPanel: THREE.CanvasTexture;
  earthAlbedo: THREE.CanvasTexture;
  earthClouds: THREE.CanvasTexture;
  slsCore: THREE.CanvasTexture;
  slsSrb: THREE.CanvasTexture;
  orionTile: THREE.CanvasTexture;
  kscGround: THREE.CanvasTexture;
  duskSky: THREE.CanvasTexture;
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
  // 1. Lunar Regolith Albedo & Micro-Relief Bump
  const moonCanvas = document.createElement('canvas');
  moonCanvas.width = 512;
  moonCanvas.height = 512;
  const mCtx = moonCanvas.getContext('2d')!;
  mCtx.fillStyle = '#68707d';
  mCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 140; i++) {
    const gx = Math.random() * 512;
    const gy = Math.random() * 512;
    const gr = 20 + Math.random() * 64;
    const g = mCtx.createRadialGradient(gx, gy, 2, gx, gy, gr);
    g.addColorStop(0, i % 2 === 0 ? 'rgba(136,144,158,0.14)' : 'rgba(72,78,89,0.14)');
    g.addColorStop(1, 'rgba(104,112,125,0)');
    mCtx.fillStyle = g;
    mCtx.beginPath();
    mCtx.arc(gx, gy, gr, 0, Math.PI * 2);
    mCtx.fill();
  }
  for (let i = 0; i < 9000; i++) {
    const v = 86 + Math.floor(Math.random() * 44);
    mCtx.fillStyle = `rgb(${v},${v + 2},${v + 4})`;
    mCtx.fillRect(Math.random() * 512, Math.random() * 512, 1.6, 1.6);
  }
  for (let c = 0; c < 36; c++) {
    const cx = 20 + Math.random() * 472;
    const cy = 20 + Math.random() * 472;
    const r = 4 + Math.random() * 14;
    mCtx.strokeStyle = 'rgba(175, 184, 198, 0.34)';
    mCtx.lineWidth = 1.4;
    mCtx.beginPath();
    mCtx.arc(cx - 1, cy - 1, r, 0, Math.PI * 2);
    mCtx.stroke();
    const grad = mCtx.createRadialGradient(cx + r * 0.15, cy + r * 0.15, 1, cx, cy, r);
    grad.addColorStop(0, 'rgba(56, 62, 72, 0.38)');
    grad.addColorStop(1, 'rgba(104, 112, 125, 0)');
    mCtx.fillStyle = grad;
    mCtx.beginPath();
    mCtx.arc(cx, cy, r, 0, Math.PI * 2);
    mCtx.fill();
  }

  // 2. Crinkled Gold Kapton Foil
  const foilCanvas = document.createElement('canvas');
  foilCanvas.width = 256;
  foilCanvas.height = 256;
  const fCtx = foilCanvas.getContext('2d')!;
  fCtx.fillStyle = '#d97706';
  fCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 500; i++) {
    fCtx.fillStyle = i % 2 === 0 ? 'rgba(254, 240, 138, 0.38)' : 'rgba(120, 53, 15, 0.36)';
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    fCtx.beginPath();
    fCtx.moveTo(x, y);
    fCtx.lineTo(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 24);
    fCtx.lineTo(x + (Math.random() - 0.5) * 24, y + (Math.random() - 0.5) * 24);
    fCtx.fill();
  }

  // 3. Photovoltaic Solar Array Grid
  const solarCanvas = document.createElement('canvas');
  solarCanvas.width = 256;
  solarCanvas.height = 256;
  const sCtx = solarCanvas.getContext('2d')!;
  sCtx.fillStyle = '#0f172a';
  sCtx.fillRect(0, 0, 256, 256);
  sCtx.fillStyle = '#1d4ed8';
  for (let x = 4; x < 256; x += 32) {
    for (let y = 4; y < 256; y += 16) {
      sCtx.fillRect(x, y, 26, 12);
    }
  }
  sCtx.strokeStyle = '#38bdf8';
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

  // 5. SLS SOFI Orange Core Stage
  const coreCanvas = document.createElement('canvas');
  coreCanvas.width = 512;
  coreCanvas.height = 1024;
  const scCtx = coreCanvas.getContext('2d')!;
  const coreGrad = scCtx.createLinearGradient(0, 0, 512, 0);
  coreGrad.addColorStop(0, '#c2410c');
  coreGrad.addColorStop(0.5, '#f97316');
  coreGrad.addColorStop(1, '#c2410c');
  scCtx.fillStyle = coreGrad;
  scCtx.fillRect(0, 0, 512, 1024);
  scCtx.fillStyle = 'rgba(154, 52, 18, 0.45)';
  scCtx.fillRect(0, 170, 512, 145);
  scCtx.fillStyle = '#f8fafc';
  scCtx.fillRect(0, 868, 512, 156);
  scCtx.fillStyle = '#0f172a';
  for (let x = 16; x < 512; x += 64) {
    scCtx.fillRect(x, 876, 28, 22);
    scCtx.fillRect(x + 20, 965, 18, 38);
  }
  scCtx.fillStyle = '#ffffff';
  scCtx.font = 'bold 52px sans-serif';
  scCtx.textAlign = 'center';
  scCtx.fillText('U', 256, 480);
  scCtx.fillText('S', 256, 555);
  scCtx.fillText('A', 256, 630);

  // 6. 5-Segment Solid Rocket Booster
  const srbCanvas = document.createElement('canvas');
  srbCanvas.width = 256;
  srbCanvas.height = 1024;
  const srCtx = srbCanvas.getContext('2d')!;
  srCtx.fillStyle = '#f8fafc';
  srCtx.fillRect(0, 0, 256, 1024);
  srCtx.fillStyle = '#0f172a';
  srCtx.fillRect(0, 120, 256, 26);
  srCtx.fillRect(0, 855, 256, 22);
  srCtx.strokeStyle = '#64748b';
  srCtx.lineWidth = 4;
  [290, 435, 580, 725, 855].forEach((y) => {
    srCtx.beginPath();
    srCtx.moveTo(0, y);
    srCtx.lineTo(256, y);
    srCtx.stroke();
  });

  // 7. Orion Capsule Tiles
  const orionCanvas = document.createElement('canvas');
  orionCanvas.width = 512;
  orionCanvas.height = 256;
  const oCtx = orionCanvas.getContext('2d')!;
  oCtx.fillStyle = '#f1f5f9';
  oCtx.fillRect(0, 0, 512, 256);
  oCtx.strokeStyle = 'rgba(148, 163, 184, 0.5)';
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
  oCtx.fillStyle = '#1d4ed8';
  oCtx.beginPath();
  oCtx.arc(256, 172, 22, 0, Math.PI * 2);
  oCtx.fill();

  // 8. KSC Ground Coastal Plain
  const kscCanvas = document.createElement('canvas');
  kscCanvas.width = 512;
  kscCanvas.height = 512;
  const kCtx = kscCanvas.getContext('2d')!;
  kCtx.fillStyle = '#1d362e';
  kCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 12000; i++) {
    const shade = 28 + Math.floor(Math.random() * 40);
    kCtx.fillStyle = `rgba(${shade}, ${shade + 28}, ${shade - 4}, 0.28)`;
    kCtx.fillRect(Math.random() * 512, Math.random() * 512, 2.5, 2.5);
  }

  // 9. Florida Dusk Sky Dome
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512;
  skyCanvas.height = 512;
  const skCtx = skyCanvas.getContext('2d')!;
  const skGrad = skCtx.createLinearGradient(0, 0, 0, 512);
  skGrad.addColorStop(0.0, '#020617');
  skGrad.addColorStop(0.32, '#0f172a');
  skGrad.addColorStop(0.45, '#1e3a5f');
  skGrad.addColorStop(0.50, '#ea580c');
  skGrad.addColorStop(0.54, '#f59e0b');
  skGrad.addColorStop(0.62, '#1e293b');
  skGrad.addColorStop(1.0, '#0f172a');
  skCtx.fillStyle = skGrad;
  skCtx.fillRect(0, 0, 512, 512);

  return {
    moonAlbedo: finalizeColorTex(moonCanvas, maxAnisotropy, 10, 10),
    moonBump: finalizeDataTex(moonCanvas, maxAnisotropy, 10, 10),
    foilAlbedo: finalizeColorTex(foilCanvas, maxAnisotropy, 3, 3),
    foilBump: finalizeDataTex(foilCanvas, maxAnisotropy, 3, 3),
    solarPanel: finalizeColorTex(solarCanvas, maxAnisotropy),
    earthAlbedo: finalizeColorTex(earthCanvas, maxAnisotropy),
    earthClouds: finalizeColorTex(cloudCanvas, maxAnisotropy),
    slsCore: finalizeColorTex(coreCanvas, maxAnisotropy),
    slsSrb: finalizeColorTex(srbCanvas, maxAnisotropy),
    orionTile: finalizeColorTex(orionCanvas, maxAnisotropy),
    kscGround: finalizeColorTex(kscCanvas, maxAnisotropy, 16, 16),
    duskSky: finalizeColorTex(skyCanvas, maxAnisotropy),
  };
}
