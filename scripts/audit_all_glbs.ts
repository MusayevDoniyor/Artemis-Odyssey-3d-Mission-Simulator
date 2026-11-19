import fs from 'node:fs';
import path from 'node:path';
import { diagnoseGLB } from '../tools/glb-doctor/doctor.js';

async function scanDir(dir: string): Promise<string[]> {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await scanDir(fullPath));
    } else if (entry.name.endsWith('.glb')) {
      files.push(fullPath);
    }
  }
  return files;
}

async function main() {
  const targets = [
    ...await scanDir(path.resolve('public/assets')),
    ...(fs.existsSync('assets-src/nasa-3d-cache') ? await scanDir(path.resolve('assets-src/nasa-3d-cache')) : []),
  ];

  console.log(`Auditing ${targets.length} GLB files across repository and NASA cache...\n`);
  const results: any[] = [];

  for (const file of targets) {
    try {
      const rel = path.relative(process.cwd(), file);
      const rep = await diagnoseGLB(file);
      results.push({
        file: rel.startsWith('..') ? file : rel,
        passes: rep.passes,
        triangles: rep.totalTriangles,
        meshes: rep.totalMeshes,
        nan: rep.nanVertexCount,
        degeneratePct: (rep.degenerateFraction * 100).toFixed(3) + '%',
        maxEdgeRatio: (rep.maxEdgeToDiagRatio * 100).toFixed(1) + '%',
        violations: rep.violations,
      });
    } catch (err: any) {
      results.push({
        file,
        passes: false,
        error: err.message,
      });
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main();
