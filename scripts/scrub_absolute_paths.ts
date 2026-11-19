import fs from 'node:fs';
import path from 'node:path';

function scrubFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Patterns to scrub
  // 1. ./
  if (content.includes('./')) {
    content = content.replaceAll('./', './');
    changed = true;
  }
  // 2. ./
  if (content.includes('C:\\Users\\doniy\\Desktop\\ArtemisOdyssey\\')) {
    content = content.replaceAll('C:\\Users\\doniy\\Desktop\\ArtemisOdyssey\\', './');
    changed = true;
  }
  // 3. ./
  if (content.includes('./')) {
    content = content.replaceAll('./', './');
    changed = true;
  }
  // 4. .
  if (content.includes('C:\\Users\\doniy\\Desktop\\ArtemisOdyssey')) {
    content = content.replaceAll('C:\\Users\\doniy\\Desktop\\ArtemisOdyssey', '.');
    changed = true;
  }
  // 5. .
  if (content.includes('.')) {
    content = content.replaceAll('.', '.');
    changed = true;
  }
  // 6. assets-src/nasa-3d-cache
  if (content.includes('C:\\Users\\doniy\\nasa-3d-cache')) {
    content = content.replaceAll('C:\\Users\\doniy\\nasa-3d-cache', 'assets-src/nasa-3d-cache');
    changed = true;
  }
  // 7. assets-src/nasa-3d-cache
  if (content.includes('assets-src/nasa-3d-cache')) {
    content = content.replaceAll('assets-src/nasa-3d-cache', 'assets-src/nasa-3d-cache');
    changed = true;
  }
  // 8. aistudio-backup.zip
  if (content.includes('C:\\Users\\doniy\\aistudio-backup.zip')) {
    content = content.replaceAll('C:\\Users\\doniy\\aistudio-backup.zip', 'aistudio-backup.zip');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Scrubbed: ${filePath}`);
  }
}

function walkDir(dir: string) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
    const p = path.join(dir, item);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      walkDir(p);
    } else if (
      p.endsWith('.md') ||
      p.endsWith('.ts') ||
      p.endsWith('.js') ||
      p.endsWith('.cjs') ||
      p.endsWith('.mjs') ||
      p.endsWith('.py') ||
      p.endsWith('.json')
    ) {
      scrubFile(p);
    }
  }
}

walkDir('docs');
walkDir('scripts');
walkDir('tools');
walkDir('src');
walkDir('tests');
console.log('Path scrubbing complete!');
