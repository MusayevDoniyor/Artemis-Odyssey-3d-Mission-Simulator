import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files'], { encoding: 'utf8' }).split('\n').filter(Boolean);

const patterns = [
  /(?:api[_-]?key|apikey|secret|token|private[_-]?key)\s*[:=]\s*['"]([A-Za-z0-9_\-]{16,})['"]/i,
  /AIza[0-9A-Za-z-_]{35}/,
  /sk-[a-zA-Z0-9]{32,}/,
  /ghp_[a-zA-Z0-9]{36}/,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
];

let found = 0;

for (const file of files) {
  if (file.endsWith('.png') || file.endsWith('.glb') || file.endsWith('.jpg') || file.endsWith('.webp') || file.endsWith('.mp3')) {
    continue;
  }
  if (!fs.existsSync(file)) continue;

  const content = fs.readFileSync(file, 'utf8');
  for (const pat of patterns) {
    const m = content.match(pat);
    if (m) {
      // Ignore env template placeholders
      if (m[0].includes('your_') || m[0].includes('YOUR_') || m[0].includes('placeholder')) continue;
      console.error(`[SECRET DETECTED] in ${file}: ${m[0].slice(0, 20)}...`);
      found++;
    }
  }
}

if (found === 0) {
  console.log('[Secrets Scan] PASSED: Zero API keys, private keys, or credentials detected across all tracked files.');
} else {
  console.error(`[Secrets Scan] FAILED: ${found} potential secrets detected!`);
  process.exit(1);
}
