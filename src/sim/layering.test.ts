import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function getFilesRecursively(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...getFilesRecursively(fullPath));
    } else if (item.endsWith('.ts') && !item.endsWith('.test.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

test('SIM LAYERING: Core sim modules must not import React, Three.js, or access browser DOM globals', () => {
  const simDir = path.resolve(import.meta.dirname, '.');
  const simFiles = getFilesRecursively(simDir);

  assert.ok(simFiles.length >= 6, `Expected at least 6 sim source files, found ${simFiles.length}`);

  const FORBIDDEN_IMPORT_PATTERNS = [
    /from\s+['"]react['"]/,
    /from\s+['"]react-dom['"]/,
    /from\s+['"]three['"]/,
    /from\s+['"]three\/.+['"]/,
    /require\(['"]react['"]\)/,
    /require\(['"]three['"]\)/,
  ];

  const FORBIDDEN_DOM_GLOBALS = [
    /\bwindow\./,
    /\bdocument\./,
    /\bnavigator\./,
    /\blocalStorage\./,
    /\bsessionStorage\./,
    /\bHTMLElement\b/,
    /\brequestAnimationFrame\b/,
  ];

  for (const file of simFiles) {
    const content = fs.readFileSync(file, 'utf8');
    const relativePath = path.relative(simDir, file).replace(/\\/g, '/');

    for (const pattern of FORBIDDEN_IMPORT_PATTERNS) {
      assert.ok(
        !pattern.test(content),
        `Layering violation in src/sim/${relativePath}: Forbidden UI/Renderer import matching ${pattern}`
      );
    }

    for (const pattern of FORBIDDEN_DOM_GLOBALS) {
      assert.ok(
        !pattern.test(content),
        `Layering violation in src/sim/${relativePath}: Forbidden DOM global reference matching ${pattern}`
      );
    }
  }
});
