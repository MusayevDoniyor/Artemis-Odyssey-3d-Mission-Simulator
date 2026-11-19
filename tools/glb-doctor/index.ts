import path from 'node:path';
import { diagnoseGLB, DEFAULT_THRESHOLDS, DoctorThresholds } from './doctor.js';

function printHumanSummary(report: Awaited<ReturnType<typeof diagnoseGLB>>) {
  console.log('='.repeat(70));
  console.log(`GLB DOCTOR REPORT: ${path.basename(report.filePath)}`);
  console.log(`Path: ${report.filePath}`);
  console.log(`Result: ${report.passes ? 'PASSED' : 'FAILED'}`);
  console.log('='.repeat(70));
  console.log(`File Size: ${(report.fileSizeCompressed / 1024).toFixed(1)} KB (decoded estimate: ${(report.fileSizeDecodedEstimate / 1024).toFixed(1)} KB)`);
  console.log(`Meshes: ${report.totalMeshes} | Vertices: ${report.totalVertices} | Triangles: ${report.totalTriangles}`);
  console.log(`Extensions: ${report.extensionsUsed.length > 0 ? report.extensionsUsed.join(', ') : 'none'}`);
  console.log(`World Bounds: min=[${report.worldBoundingBox.min.map(v => v.toFixed(2)).join(', ')}] max=[${report.worldBoundingBox.max.map(v => v.toFixed(2)).join(', ')}]`);
  console.log(`Bounding Box Size: [${report.worldBoundingBox.size.map(v => v.toFixed(2)).join(', ')}] | Diagonal: ${report.worldBoundingBox.diagonal.toFixed(2)}`);
  console.log(`NaN Vertices: ${report.nanVertexCount} | Infinity: ${report.infinityVertexCount}`);
  console.log(`Degenerate Triangles: ${report.degenerateTriangleCount} (${(report.degenerateFraction * 100).toFixed(3)}%)`);
  console.log(`Max Edge Length: ${report.maxEdgeLength.toFixed(3)} (${(report.maxEdgeToDiagRatio * 100).toFixed(1)}% of diag)`);
  console.log(`99th Percentile Edge: ${report.p99EdgeLength.toFixed(3)} (${(report.p99EdgeToDiagRatio * 100).toFixed(1)}% of diag)`);
  console.log(`Needle Triangles (ratio > 100): ${report.needleTriangleCount}`);

  if (report.textures.length > 0) {
    console.log(`Textures (${report.textures.length}):`);
    for (const t of report.textures) {
      console.log(`  - ${t.name} (${t.mimeType}): ${(t.byteSize / 1024).toFixed(1)} KB`);
    }
  }

  if (report.violations.length > 0) {
    console.log('\nVIOLATIONS DETECTED:');
    for (const v of report.violations) {
      console.log(`  [FAIL] ${v}`);
    }
  } else {
    console.log('\nAll geometry integrity checks passed.');
  }
  console.log('='.repeat(70));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Usage: tsx tools/glb-doctor/index.ts <path-to-glb> [--json] [--allow-edge-ratio <ratio>]');
    process.exit(1);
  }

  let glbPath = '';
  let outputJson = false;
  const thresholds: DoctorThresholds = { ...DEFAULT_THRESHOLDS };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json') {
      outputJson = true;
    } else if (args[i] === '--allow-edge-ratio' && i + 1 < args.length) {
      thresholds.maxEdgeToDiagRatio = parseFloat(args[++i]);
    } else if (!args[i].startsWith('--')) {
      glbPath = args[i];
    }
  }

  if (!glbPath) {
    console.error('Error: No GLB file path specified.');
    process.exit(1);
  }

  try {
    const report = await diagnoseGLB(glbPath, thresholds);
    if (outputJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printHumanSummary(report);
    }
    process.exit(report.passes ? 0 : 1);
  } catch (err) {
    console.error(`Error diagnosing ${glbPath}:`, err);
    process.exit(2);
  }
}

main();
