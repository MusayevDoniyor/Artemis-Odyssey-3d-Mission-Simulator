import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const buf = execFileSync('git', ['--no-pager', 'show', '4da8ab9:public/assets/crafts/iss.glb'], {
  maxBuffer: 30 * 1024 * 1024,
});

fs.writeFileSync('docs/qa/iss_107k.glb', buf);
console.log('Successfully saved docs/qa/iss_107k.glb, byte length:', buf.length);
