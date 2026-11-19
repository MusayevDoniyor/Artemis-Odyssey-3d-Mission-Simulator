import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);
const fileStats = files.map(f => {
  try {
    return { file: f, size: fs.statSync(f).size };
  } catch {
    return { file: f, size: 0 };
  }
}).sort((a, b) => b.size - a.size);

console.log('--- 10 Largest Tracked Files in Repository ---');
fileStats.slice(0, 10).forEach((f, i) => {
  console.log(`${i + 1}. ${f.file} — ${(f.size / 1024 / 1024).toFixed(3)} MB (${f.size.toLocaleString()} bytes)`);
});
