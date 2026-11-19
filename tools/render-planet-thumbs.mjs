import { chromium } from 'playwright';
import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const OUT_DIR = path.resolve('public/assets/planets/thumbs');
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const PLANETS = [
  { id: 'sun', texture: 'sun.jpg', isSun: true },
  { id: 'mercury', texture: 'mercury.jpg', rotY: 0.8 },
  { id: 'venus', texture: 'venus.jpg', rotY: 1.4 },
  { id: 'earth', texture: 'earth.jpg', rotY: -1.2, atmosphere: true },
  { id: 'moon', texture: 'moon.jpg', rotY: 1.1 },
  { id: 'mars', texture: 'mars.jpg', rotY: 1.8, tiltZ: 0.44 },
  { id: 'jupiter', texture: 'jupiter.jpg', rotY: 2.15 },
  { id: 'saturn', texture: 'saturn.jpg', ringTexture: 'saturn_ring.png', tiltZ: -0.46, camDist: 3.8 },
  { id: 'uranus', texture: 'uranus.jpg', tiltZ: -1.7, uranusRing: true, camDist: 3.4 },
  { id: 'neptune', texture: 'neptune.jpg', rotY: 0.6 },
  { id: 'pluto', texture: 'pluto.jpg', rotY: 1.8 },
  { id: 'ceres', texture: 'ceres.jpg', rotY: 0.5 },
];

async function main() {
  console.log('Bundling Three.js thumbnail generator...');
  const bundled = await esbuild.build({
    stdin: {
      contents: `
        import * as THREE from 'three';
        window.THREE = THREE;
      `,
      resolveDir: process.cwd(),
    },
    bundle: true,
    write: false,
    format: 'iife',
  });

  const threeBundleCode = bundled.outputFiles[0].text;

  console.log('Launching headless browser...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:4173');

  // Inject Three.js bundle
  await page.evaluate((code) => {
    const script = document.createElement('script');
    script.textContent = code;
    document.head.appendChild(script);
  }, threeBundleCode);

  console.log('Rendering photorealistic planet thumbnails...');
  for (const planet of PLANETS) {
    const dataUrl = await page.evaluate(async (p) => {
      const THREE = window.THREE;

      const width = 128;
      const height = 128;
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(1);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.set(0, 0, p.camDist || 2.75);

      // Key light from top-left (classic NASA sunlit angle)
      const sunLight = new THREE.DirectionalLight(0xffffff, p.isSun ? 0.2 : 2.2);
      sunLight.position.set(-2.2, 1.8, 2.5);
      scene.add(sunLight);

      // Deep space ambient fill
      const ambient = new THREE.AmbientLight(0xffffff, p.isSun ? 1.0 : 0.25);
      scene.add(ambient);

      // Rim light from lower-right
      const rimLight = new THREE.DirectionalLight(0x38bdf8, p.isSun ? 0 : 0.4);
      rimLight.position.set(2.0, -1.5, -1.0);
      scene.add(rimLight);

      const loader = new THREE.TextureLoader();
      const loadTex = (url) =>
        new Promise((resolve) => {
          loader.load(
            url,
            (tex) => {
              tex.colorSpace = THREE.SRGBColorSpace;
              tex.minFilter = THREE.LinearMipmapLinearFilter;
              tex.magFilter = THREE.LinearFilter;
              resolve(tex);
            },
            undefined,
            () => resolve(null)
          );
        });

      const bodyTex = await loadTex('/assets/planets/' + p.texture);

      const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
      let sphereMat;

      if (p.isSun) {
        sphereMat = new THREE.MeshBasicMaterial({
          map: bodyTex,
        });
      } else {
        sphereMat = new THREE.MeshStandardMaterial({
          map: bodyTex,
          roughness: 0.8,
          metalness: 0.05,
        });
      }

      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      if (p.rotY) sphere.rotation.y = p.rotY;
      if (p.tiltZ) sphere.rotation.z = p.tiltZ;
      scene.add(sphere);

      // Earth atmospheric glow
      if (p.atmosphere) {
        const atmoGeo = new THREE.SphereGeometry(1.025, 48, 48);
        const atmoMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.25,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
        });
        const atmo = new THREE.Mesh(atmoGeo, atmoMat);
        scene.add(atmo);
      }

      // Sun coronal halo
      if (p.isSun) {
        const haloGeo = new THREE.SphereGeometry(1.15, 32, 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.4,
          blending: THREE.AdditiveBlending,
          side: THREE.BackSide,
        });
        const halo = new THREE.Mesh(haloGeo, haloMat);
        scene.add(halo);
      }

      // Saturn Rings
      if (p.ringTexture) {
        const ringTex = await loadTex('/assets/planets/' + p.ringTexture);
        const innerR = 1.25;
        const outerR = 2.3;
        const ringGeo = new THREE.RingGeometry(innerR, outerR, 96, 1);
        const pos = ringGeo.attributes.position;
        const uv = ringGeo.attributes.uv;
        for (let i = 0; i < pos.count; i++) {
          const x = pos.getX(i);
          const y = pos.getY(i);
          const r = Math.hypot(x, y);
          const u = Math.min(1, Math.max(0, (r - innerR) / (outerR - innerR)));
          uv.setXY(i, u, 0.5);
        }
        uv.needsUpdate = true;

        const ringMat = new THREE.MeshStandardMaterial({
          map: ringTex,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
          roughness: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.rotation.y = -0.15;
        sphere.add(ring);
      }

      // Uranus Rings
      if (p.uranusRing) {
        const innerR = 1.35;
        const outerR = 1.7;
        const ringGeo = new THREE.RingGeometry(innerR, outerR, 64, 1);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x67e8f9,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        sphere.add(ring);
      }

      renderer.render(scene, camera);
      const url = renderer.domElement.toDataURL('image/png');
      renderer.dispose();
      return url;
    }, planet);

    if (dataUrl) {
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const outPathPng = path.join(OUT_DIR, `${planet.id}.png`);
      fs.writeFileSync(outPathPng, Buffer.from(base64Data, 'base64'));
      console.log(`Rendered: ${planet.id} -> ${outPathPng}`);
    } else {
      console.error(`Failed to render: ${planet.id}`);
    }
  }

  await browser.close();
  console.log('All planet thumbnails generated successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
