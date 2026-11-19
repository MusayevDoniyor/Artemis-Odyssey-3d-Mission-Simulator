import fs from 'fs';
import { HARDWARE_CATALOG } from '../src/game/hardwareCatalog';

async function checkUrl(url: string) {
  try {
    const res = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
    if (res.status === 405 || res.status === 403) {
      // try GET
      const getRes = await fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
      return getRes.status;
    }
    return res.status;
  } catch (err: any) {
    return `Error: ${err.message}`;
  }
}

async function main() {
  console.log('Auditing Hardware Catalog Citations:\n');
  const results = [];

  for (const [craftId, craft] of Object.entries(HARDWARE_CATALOG)) {
    console.log(`Craft: ${craft.title} (id: ${craftId})`);
    const sources = (craft as any).sources || [];
    const sourceCitation = (craft as any).sourceCitation || '';

    // Extract any URLs from sources and sourceCitation
    const text = [sourceCitation, ...sources].join(' ');
    const urlMatches = text.match(/https?:\/\/[^\s'")]+/g) || [];

    for (const url of urlMatches) {
      const status = await checkUrl(url);
      console.log(`  - URL: ${url} -> Status: ${status}`);
      results.push({ craftId, craftName: craft.title, url, status });
    }
  }

  console.log('\nAudit complete!');
}

main().catch(console.error);
