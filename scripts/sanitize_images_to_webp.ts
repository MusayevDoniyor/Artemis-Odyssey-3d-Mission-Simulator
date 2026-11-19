import fs from 'node:fs';
import path from 'node:path';
import { launchRealGpuBrowser } from '../qa/helpers/gpu';

async function main() {
  const { browser, page } = await launchRealGpuBrowser();

  const imagesToConvert = [
    'docs/qa/screens/launch_pad_caa_extended_t10.png',
    'docs/qa/screens/launch_pad_caa_retracted_t0.png',
    'docs/qa/screens/landing_hard_touchdown.png',
    'docs/qa/screens/landing_touchdown_success.png',
    'docs/images/viper-lander-showcase.jpg',
    'docs/images/artemis-hero-banner.jpg',
    'docs/images/mission-architecture-diagram.jpg',
  ];

  for (const relPath of imagesToConvert) {
    if (!fs.existsSync(relPath)) continue;
    const absPath = path.resolve(relPath);
    const buf = fs.readFileSync(absPath);
    const mime = relPath.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrlInput = `data:${mime};base64,${buf.toString('base64')}`;

    const webpDataUrl = await page.evaluate(async (src) => {
      return new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // Scale down slightly if massive to guarantee <= 150 KB
          const maxDim = 1280;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/webp', 0.82));
        };
        img.src = src;
      });
    }, dataUrlInput);

    const base64Data = webpDataUrl.replace(/^data:image\/webp;base64,/, '');
    const outRelPath = relPath.replace(/\.(png|jpg|jpeg)$/, '.webp');
    fs.writeFileSync(outRelPath, Buffer.from(base64Data, 'base64'));
    const newSize = fs.statSync(outRelPath).size;
    console.log(`Converted ${relPath} -> ${outRelPath} (${(newSize / 1024).toFixed(1)} KB)`);

    // Remove the large original
    fs.unlinkSync(relPath);
    console.log(`Deleted original: ${relPath}`);
  }

  await browser.close();

  // Remove docs/overnight/screens/*.png and subdirs
  const overnightScreens = path.resolve('docs/overnight/screens');
  if (fs.existsSync(overnightScreens)) {
    const removeDir = (dir: string) => {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const p = path.join(dir, item);
        if (fs.statSync(p).isDirectory()) {
          removeDir(p);
          fs.rmdirSync(p);
        } else if (p.endsWith('.png') || p.endsWith('.jpg')) {
          fs.unlinkSync(p);
          console.log(`Removed large overnight screen: ${p}`);
        }
      }
    };
    removeDir(overnightScreens);
  }

  console.log('[Sanitize] Image sanitization complete!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
