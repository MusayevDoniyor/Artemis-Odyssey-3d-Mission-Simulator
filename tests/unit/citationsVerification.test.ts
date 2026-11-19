import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OFFICIAL_CITATIONS, normalizeText } from '../../scripts/save_official_snapshots.js';

describe('Aerospace Hardware Primary Citations & Snapshot Verification', () => {
  const citationsDir = path.resolve(process.cwd(), 'docs/data/citations');

  it('all 18 official citation snapshot files exist and have HTTP-Status 200', () => {
    assert.ok(fs.existsSync(citationsDir), 'Citations directory docs/data/citations must exist');

    for (const c of OFFICIAL_CITATIONS) {
      const filePath = path.join(citationsDir, `${c.id}.txt`);
      assert.ok(fs.existsSync(filePath), `Snapshot file for ${c.id} must exist at ${filePath}`);

      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('HTTP-Status: 200'), `Snapshot ${c.id} must have HTTP-Status: 200`);
      assert.ok(content.includes(`URL: ${c.url}`), `Snapshot ${c.id} must match URL`);
    }
  });

  it('every verbatim quoted sentence is an exact normalized substring of its snapshot text', () => {
    for (const c of OFFICIAL_CITATIONS) {
      const filePath = path.join(citationsDir, `${c.id}.txt`);
      const content = fs.readFileSync(filePath, 'utf8');
      const [header, ...bodyParts] = content.split('------------------------------------------------------------------------');
      const body = bodyParts.join('');

      const normBody = normalizeText(body);
      const normQuote = normalizeText(c.quote);

      const isSub = normBody.includes(normQuote);
      assert.ok(
        isSub,
        `Citation ${c.id} for ${c.craftId} failed verbatim match.\nExpected substring: "${c.quote}"\nIn file: ${filePath}`
      );
    }
  });
});
