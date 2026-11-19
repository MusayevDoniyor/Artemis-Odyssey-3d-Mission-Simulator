import fs from 'node:fs';
import path from 'node:path';
import { NodeIO, Node, vec3, mat4 } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';
import { MeshoptDecoder } from 'meshoptimizer';

export interface DoctorThresholds {
  maxNaN: number;
  maxDegenerateFraction: number; // e.g. 0.001 (0.1%)
  maxEdgeToDiagRatio: number; // e.g. 0.60 (60%)
  needleRatioThreshold: number; // longest edge / shortest altitude e.g. 100
  allowNegativeScale: boolean;
  maxScaleMagnitude: number;
}

export const DEFAULT_THRESHOLDS: DoctorThresholds = {
  maxNaN: 0,
  maxDegenerateFraction: 0.001,
  maxEdgeToDiagRatio: 0.60,
  needleRatioThreshold: 100,
  allowNegativeScale: false,
  maxScaleMagnitude: 10000,
};

export interface MeshReport {
  meshIndex: number;
  meshName: string;
  primitiveCount: number;
  vertexCount: number;
  triangleCount: number;
  hasNormals: boolean;
  hasUVs: boolean;
  missingAttributes: string[];
  duplicateAttributes: string[];
  dracoQuantization?: Record<string, number>;
}

export interface NodeReport {
  name: string;
  translation: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
  hasExtremeScale: boolean;
  hasNegativeScale: boolean;
  meshName?: string;
  children: NodeReport[];
}

export interface TextureReport {
  name: string;
  mimeType: string;
  byteSize: number;
  width?: number;
  height?: number;
}

export interface DoctorReport {
  filePath: string;
  fileSizeCompressed: number;
  fileSizeDecodedEstimate: number;
  extensionsUsed: string[];
  extensionsRequired: string[];
  quantizationInfo: Record<string, any>;
  totalMeshes: number;
  totalVertices: number;
  totalTriangles: number;
  worldBoundingBox: {
    min: [number, number, number];
    max: [number, number, number];
    size: [number, number, number];
    diagonal: number;
  };
  nanVertexCount: number;
  infinityVertexCount: number;
  degenerateTriangleCount: number;
  degenerateFraction: number;
  maxEdgeLength: number;
  maxEdgeToDiagRatio: number;
  p99EdgeLength: number;
  p99EdgeToDiagRatio: number;
  needleTriangleCount: number;
  meshes: MeshReport[];
  nodes: NodeReport[];
  textures: TextureReport[];
  violations: string[];
  passes: boolean;
}

// 4x4 matrix multiplication helper
function multiplyMat4(out: number[], a: number[], b: number[]): number[] {
  const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
  const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
  const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
  const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

  let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
  out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
  out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
  out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;

  b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
  out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
  out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
  out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
  out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  return out;
}

function transformPoint(p: [number, number, number], m: number[]): [number, number, number] {
  const x = p[0], y = p[1], z = p[2];
  const w = m[3] * x + m[7] * y + m[11] * z + m[15] || 1.0;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) / w,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) / w,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) / w,
  ];
}

let cachedIO: NodeIO | null = null;
async function getIO(): Promise<NodeIO> {
  if (!cachedIO) {
    const dec = await draco3d.createDecoderModule();
    cachedIO = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({
        'draco3d.decoder': dec,
        'meshopt.decoder': MeshoptDecoder,
      });
  }
  return cachedIO;
}

function extractRawJsonHeader(buffer: Buffer): any {
  if (buffer.length < 20) return null;
  const magic = buffer.readUInt32LE(0);
  if (magic !== 0x46546c67) return null; // 'glTF'
  const jsonChunkLength = buffer.readUInt32LE(12);
  const jsonChunkType = buffer.readUInt32LE(16);
  if (jsonChunkType !== 0x4e4f534a) return null; // 'JSON'
  try {
    const jsonStr = buffer.toString('utf8', 20, 20 + jsonChunkLength);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export async function diagnoseGLB(
  glbPath: string,
  thresholds: DoctorThresholds = DEFAULT_THRESHOLDS
): Promise<DoctorReport> {
  const io = await getIO();
  const fileBuffer = fs.readFileSync(glbPath);
  const rawJson = extractRawJsonHeader(fileBuffer);
  const doc = await io.readBinary(fileBuffer);
  const root = doc.getRoot();

  const violations: string[] = [];
  const meshesReport: MeshReport[] = [];
  const texturesReport: TextureReport[] = [];

  let totalVertices = 0;
  let totalTriangles = 0;
  let decodedByteSize = 0;

  // Track textures
  for (const tex of root.listTextures()) {
    const img = tex.getImage();
    const byteSize = img ? img.byteLength : 0;
    const size = tex.getSize();
    decodedByteSize += byteSize;
    texturesReport.push({
      name: tex.getName() || 'unnamed',
      mimeType: tex.getMimeType() || 'image/unknown',
      byteSize,
      width: size ? size[0] : undefined,
      height: size ? size[1] : undefined,
    });
  }

  // Inspect meshes
  const meshList = root.listMeshes();
  for (let mIdx = 0; mIdx < meshList.length; mIdx++) {
    const mesh = meshList[mIdx];
    let vCount = 0;
    let tCount = 0;
    let hasNormals = true;
    let hasUVs = true;
    const missing: string[] = [];
    const duplicates: string[] = [];
    const seenAttrs = new Set<string>();

    const prims = mesh.listPrimitives();
    for (const prim of prims) {
      for (const semantic of prim.listSemantics()) {
        if (seenAttrs.has(semantic)) {
          if (!duplicates.includes(semantic)) duplicates.push(semantic);
        } else {
          seenAttrs.add(semantic);
        }
      }

      const pos = prim.getAttribute('POSITION');
      if (pos) {
        vCount += pos.getCount();
        decodedByteSize += pos.getByteLength();
      }
      const norm = prim.getAttribute('NORMAL');
      if (norm) {
        decodedByteSize += norm.getByteLength();
      } else {
        hasNormals = false;
        if (!missing.includes('NORMAL')) missing.push('NORMAL');
      }
      const uv = prim.getAttribute('TEXCOORD_0');
      if (uv) {
        decodedByteSize += uv.getByteLength();
      } else {
        hasUVs = false;
        if (!missing.includes('TEXCOORD_0')) missing.push('TEXCOORD_0');
      }
      const indices = prim.getIndices();
      if (indices) {
        tCount += Math.floor(indices.getCount() / 3);
        decodedByteSize += indices.getByteLength();
      } else if (pos) {
        tCount += Math.floor(pos.getCount() / 3);
      }
    }

    totalVertices += vCount;
    totalTriangles += tCount;

    // Read quantization if present in rawJson
    let dracoQuant: Record<string, number> | undefined;
    if (rawJson?.meshes?.[mIdx]?.primitives?.[0]?.extensions?.KHR_draco_mesh_compression) {
      dracoQuant = rawJson.meshes[mIdx].primitives[0].extensions.KHR_draco_mesh_compression;
    }

    meshesReport.push({
      meshIndex: mIdx,
      meshName: mesh.getName() || `mesh_${mIdx}`,
      primitiveCount: prims.length,
      vertexCount: vCount,
      triangleCount: tCount,
      hasNormals,
      hasUVs,
      missingAttributes: missing,
      duplicateAttributes: duplicates,
      dracoQuantization: dracoQuant,
    });
  }

  // World transform traversal to inspect world bounds & triangles
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  let nanCount = 0;
  let infCount = 0;
  let degenCount = 0;
  let needleCount = 0;

  const edgeLengths: number[] = [];

  function buildNodeReport(node: Node, parentMat: number[]): NodeReport {
    const t = node.getTranslation();
    const r = node.getRotation();
    const s = node.getScale();
    const localMat = node.getMatrix(); // 16 floats
    const worldMat = multiplyMat4([], parentMat, localMat);

    const hasNegScale = s[0] < 0 || s[1] < 0 || s[2] < 0;
    const maxS = Math.max(Math.abs(s[0]), Math.abs(s[1]), Math.abs(s[2]));
    const minS = Math.min(Math.abs(s[0]), Math.abs(s[1]), Math.abs(s[2]));
    const hasExtScale = maxS > thresholds.maxScaleMagnitude || (minS > 0 && minS < 1e-5);

    if (hasNegScale && !thresholds.allowNegativeScale) {
      violations.push(`Node "${node.getName()}" has negative scale [${s.join(', ')}]`);
    }
    if (hasExtScale) {
      violations.push(`Node "${node.getName()}" has extreme scale [${s.join(', ')}]`);
    }

    const mesh = node.getMesh();
    if (mesh) {
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION');
        const indices = prim.getIndices();
        if (!pos) continue;

        const pCount = pos.getCount();
        const worldPositions: Array<[number, number, number]> = new Array(pCount);

        for (let i = 0; i < pCount; i++) {
          const rawP = pos.getElement(i, [0, 0, 0]) as [number, number, number];
          if (
            Number.isNaN(rawP[0]) ||
            Number.isNaN(rawP[1]) ||
            Number.isNaN(rawP[2])
          ) {
            nanCount++;
            continue;
          }
          if (
            !Number.isFinite(rawP[0]) ||
            !Number.isFinite(rawP[1]) ||
            !Number.isFinite(rawP[2])
          ) {
            infCount++;
            continue;
          }

          const wp = transformPoint(rawP, worldMat);
          worldPositions[i] = wp;

          if (wp[0] < minX) minX = wp[0];
          if (wp[1] < minY) minY = wp[1];
          if (wp[2] < minZ) minZ = wp[2];
          if (wp[0] > maxX) maxX = wp[0];
          if (wp[1] > maxY) maxY = wp[1];
          if (wp[2] > maxZ) maxZ = wp[2];
        }

        const triCount = indices ? Math.floor(indices.getCount() / 3) : Math.floor(pCount / 3);
        for (let t = 0; t < triCount; t++) {
          const i0 = indices ? indices.getScalar(t * 3) : t * 3;
          const i1 = indices ? indices.getScalar(t * 3 + 1) : t * 3 + 1;
          const i2 = indices ? indices.getScalar(t * 3 + 2) : t * 3 + 2;

          const p0 = worldPositions[i0];
          const p1 = worldPositions[i1];
          const p2 = worldPositions[i2];
          if (!p0 || !p1 || !p2) continue;

          // Edge vectors
          const u = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
          const v = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
          const w = [p0[0] - p2[0], p0[1] - p2[1], p0[2] - p2[2]];

          // Side lengths
          const l0 = Math.hypot(u[0], u[1], u[2]);
          const l1 = Math.hypot(v[0], v[1], v[2]);
          const l2 = Math.hypot(w[0], w[1], w[2]);

          const maxEdge = Math.max(l0, l1, l2);
          edgeLengths.push(maxEdge);

          // Cross product (2x triangle area)
          const cx = u[1] * v[2] - u[2] * v[1];
          const cy = u[2] * v[0] - u[0] * v[2];
          const cz = u[0] * v[1] - u[1] * v[0];
          const crossLen = Math.hypot(cx, cy, cz);
          const area = 0.5 * crossLen;

          if (area <= 1e-12 || maxEdge <= 1e-12) {
            degenCount++;
          } else {
            // Shortest altitude = 2 * area / maxEdge
            const minAlt = (2 * area) / maxEdge;
            const needleRatio = maxEdge / minAlt; // = maxEdge^2 / (2 * area)
            if (needleRatio > thresholds.needleRatioThreshold) {
              needleCount++;
            }
          }
        }
      }
    }

    const childReports: NodeReport[] = [];
    for (const child of node.listChildren()) {
      childReports.push(buildNodeReport(child, worldMat));
    }

    return {
      name: node.getName() || 'unnamed_node',
      translation: [t[0], t[1], t[2]],
      rotation: [r[0], r[1], r[2], r[3]],
      scale: [s[0], s[1], s[2]],
      hasExtremeScale: hasExtScale,
      hasNegativeScale: hasNegScale,
      meshName: mesh ? (mesh.getName() || 'unnamed_mesh') : undefined,
      children: childReports,
    };
  }

  const identityMat = [
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ];

  const nodeReports: NodeReport[] = [];
  const scenes = root.listScenes();
  const topNodes = scenes.length > 0 ? scenes[0].listChildren() : root.listNodes();
  for (const n of topNodes) {
    nodeReports.push(buildNodeReport(n, identityMat));
  }

  const dx = maxX >= minX ? maxX - minX : 0;
  const dy = maxY >= minY ? maxY - minY : 0;
  const dz = maxZ >= minZ ? maxZ - minZ : 0;
  const diagonal = Math.hypot(dx, dy, dz);

  let maxEdge = 0;
  let p99Edge = 0;
  if (edgeLengths.length > 0) {
    edgeLengths.sort((a, b) => a - b);
    maxEdge = edgeLengths[edgeLengths.length - 1];
    const p99Idx = Math.floor(0.99 * (edgeLengths.length - 1));
    p99Edge = edgeLengths[p99Idx];
  }

  const maxEdgeToDiagRatio = diagonal > 0 ? maxEdge / diagonal : 0;
  const p99EdgeToDiagRatio = diagonal > 0 ? p99Edge / diagonal : 0;
  const degenFraction = totalTriangles > 0 ? degenCount / totalTriangles : 0;

  // Threshold validations
  if (nanCount > thresholds.maxNaN) {
    violations.push(`Found ${nanCount} NaN vertices (max allowed: ${thresholds.maxNaN})`);
  }
  if (infCount > 0) {
    violations.push(`Found ${infCount} Infinity vertices`);
  }
  if (degenFraction > thresholds.maxDegenerateFraction) {
    violations.push(
      `Degenerate triangle fraction ${(degenFraction * 100).toFixed(3)}% exceeds threshold ${(thresholds.maxDegenerateFraction * 100).toFixed(3)}% (${degenCount}/${totalTriangles})`
    );
  }
  if (maxEdgeToDiagRatio > thresholds.maxEdgeToDiagRatio) {
    violations.push(
      `Max triangle edge to bounding diagonal ratio ${(maxEdgeToDiagRatio * 100).toFixed(1)}% exceeds threshold ${(thresholds.maxEdgeToDiagRatio * 100).toFixed(1)}% (maxEdge: ${maxEdge.toFixed(3)}, diagonal: ${diagonal.toFixed(3)})`
    );
  }

  const extUsed = root.listExtensionsUsed().map((e) => e.extensionName);
  const extReq = root.listExtensionsRequired().map((e) => e.extensionName);

  const quantizationInfo: Record<string, any> = {};
  if (rawJson?.extensionsUsed?.includes('KHR_draco_mesh_compression')) {
    quantizationInfo.draco = true;
  }
  if (rawJson?.extensionsUsed?.includes('KHR_mesh_quantization')) {
    quantizationInfo.khrMeshQuantization = true;
  }
  if (rawJson?.extensionsUsed?.includes('EXT_meshopt_compression')) {
    quantizationInfo.meshopt = true;
  }

  return {
    filePath: glbPath,
    fileSizeCompressed: fileBuffer.byteLength,
    fileSizeDecodedEstimate: decodedByteSize,
    extensionsUsed: extUsed,
    extensionsRequired: extReq,
    quantizationInfo,
    totalMeshes: meshList.length,
    totalVertices,
    totalTriangles,
    worldBoundingBox: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      size: [dx, dy, dz],
      diagonal,
    },
    nanVertexCount: nanCount,
    infinityVertexCount: infCount,
    degenerateTriangleCount: degenCount,
    degenerateFraction: degenFraction,
    maxEdgeLength: maxEdge,
    maxEdgeToDiagRatio,
    p99EdgeLength: p99Edge,
    p99EdgeToDiagRatio,
    needleTriangleCount: needleCount,
    meshes: meshesReport,
    nodes: nodeReports,
    textures: texturesReport,
    violations,
    passes: violations.length === 0,
  };
}
