import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

function compare(fileA, fileB, diffOut) {
  const imgA = PNG.sync.read(fs.readFileSync(fileA));
  const imgB = PNG.sync.read(fs.readFileSync(fileB));
  const { width, height } = imgA;
  const diff = new PNG({ width, height });

  const numDiffPixels = pixelmatch(imgA.data, imgB.data, diff.data, width, height, {
    threshold: 0.1,
  });

  fs.writeFileSync(diffOut, PNG.sync.write(diff));
  const pct = ((numDiffPixels / (width * height)) * 100).toFixed(2);
  console.log(`Compared ${path.basename(fileA)} vs ${path.basename(fileB)}: ${numDiffPixels} diff pixels (${pct}%)`);
}

const beforeDir = path.resolve('docs/overnight/screens/before_fix');
const afterDir = path.resolve('docs/overnight/screens/after_fix');
const diffDir = path.resolve('docs/overnight/screens/diffs');

if (!fs.existsSync(diffDir)) {
  fs.mkdirSync(diffDir, { recursive: true });
}

compare(
  path.join(beforeDir, 'before_hardware_bay_sls_1440x900.png'),
  path.join(afterDir, 'after_hardware_bay_sls_1440x900.png'),
  path.join(diffDir, 'diff_hardware_bay_sls.png')
);

compare(
  path.join(beforeDir, 'before_launch_pad_1440x900.png'),
  path.join(afterDir, 'after_launch_pad_1440x900.png'),
  path.join(diffDir, 'diff_launch_pad.png')
);
