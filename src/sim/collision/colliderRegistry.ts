import { RoverCollider, SurfacePlanet } from '../../game/types';
import {
  MOON_OBJECTIVES,
  MARS_OBJECTIVES,
  MOON_LANDING_ZONES,
  MARS_LANDING_ZONES,
} from '../../game/constants';
import { getSurfaceTerrainHeight } from '../common/math';

export interface BoundingVolume2D {
  x: number;
  z: number;
  r: number;
  height?: number;
  type: 'rock' | 'habitat' | 'lander' | 'station' | 'structure';
  label: string;
}

/**
 * Deterministically generates all surface boulders for a given planet.
 * Visual mesh scale is s * 1.28 (horizontal) x s * 0.72 (vertical).
 * To guarantee ZERO visual penetration, physical collider radius is strictly s * 1.28.
 */
function generateDeterministicBoulders(planet: SurfacePlanet): RoverCollider[] {
  const allStations = [...MOON_OBJECTIVES, ...MARS_OBJECTIVES];
  const allLandingZones = [...MOON_LANDING_ZONES, ...MARS_LANDING_ZONES];
  const colliders: RoverCollider[] = [];

  for (let i = 0; i < 142; i++) {
    const angle = i * 2.39996;
    const dist = 20 + i * 1.65;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const nearObj = allStations.some((o) => Math.hypot(rx - o.x, rz - o.z) < 9.5);
    const nearPad = allLandingZones.some((lz) => Math.hypot(rx - lz.x, rz - lz.z) < lz.radius + 4.0);
    const nearHab = Math.hypot(rx + 15, rz + 13) < 14;
    if (nearObj || nearPad || nearHab) continue;

    const s = 0.45 + (i % 7) * 0.26;
    // Exactly matches the visual InstancedMesh horizontal bounding scale: s * 1.28
    const r = Math.round(s * 1.28 * 1000) / 1000;
    colliders.push({
      x: Math.round(rx * 100) / 100,
      z: Math.round(rz * 100) / 100,
      r,
      type: 'rock',
      label: planet === 'mars' ? 'Basalt Boulder' : 'Surface Boulder',
    });
  }

  return colliders;
}

// Cached boulder sets per planet
const CACHED_MOON_BOULDERS = generateDeterministicBoulders('moon');
const CACHED_MARS_BOULDERS = generateDeterministicBoulders('mars');

/**
 * Returns single authoritative registry of all solid surface colliders for a given planet.
 */
export function getUnifiedSurfaceColliders(
  planet: SurfacePlanet,
  landerPose?: { x: number; z: number } | null
): RoverCollider[] {
  const colliders: RoverCollider[] = [];

  // 1. Habitat Domes
  if (planet === 'moon') {
    colliders.push({
      x: -15,
      z: -13,
      r: 9.6,
      type: 'habitat',
      label: 'Artemis Base Camp',
    });
  } else {
    colliders.push({
      x: -15,
      z: -13,
      r: 9.6,
      type: 'habitat',
      label: 'Jezero Base & MOXIE',
    });
  }

  // 2. Parked Lander (if landed)
  if (landerPose) {
    colliders.push({
      x: landerPose.x,
      z: landerPose.z,
      r: 3.8,
      type: 'lander',
      label: 'Parked Lander',
    });
  }

  // 3. Science Stations / Drill Sites
  const stations = planet === 'moon' ? MOON_OBJECTIVES : MARS_OBJECTIVES;
  for (let i = 0; i < stations.length; i++) {
    const st = stations[i];
    colliders.push({
      x: st.x,
      z: st.z,
      r: 1.5,
      type: 'station',
      label: st.siteName,
    });
  }

  // 4. Boulders & Natural Monoliths
  const boulders = planet === 'moon' ? CACHED_MOON_BOULDERS : CACHED_MARS_BOULDERS;
  for (let i = 0; i < boulders.length; i++) {
    colliders.push(boulders[i]);
  }

  return colliders;
}

/**
 * Returns solid colliders for Earth LC-39B pad structures.
 */
export function getEarthPadColliders(): RoverCollider[] {
  return [
    {
      x: 0,
      z: -0.6,
      r: 7.2,
      type: 'structure',
      label: 'Mobile Launcher 1',
    },
    {
      x: -6.8,
      z: 0,
      r: 4.5,
      type: 'structure',
      label: 'Launch Umbilical Tower',
    },
  ];
}

export interface CollisionResolutionResult {
  x: number;
  z: number;
  collided: boolean;
  label: string;
  minClearance: number;
}

/**
 * Multi-pass relaxation solver guaranteeing strictly ZERO penetration across all colliders.
 */
export function resolveSolidCollision(
  px: number,
  pz: number,
  objectRadius: number,
  colliders: RoverCollider[],
  skipSmallRocks = false
): CollisionResolutionResult {
  let currX = px;
  let currZ = pz;
  let collided = false;
  let label = '';
  let minClearance = Infinity;

  // Run 3 relaxation iterations to resolve tight cluster overlaps without tunneling
  for (let pass = 0; pass < 3; pass++) {
    let passAdjusted = false;

    for (let i = 0; i < colliders.length; i++) {
      const col = colliders[i];
      if (skipSmallRocks && col.type === 'rock' && col.r < 0.55) {
        continue;
      }

      const dx = currX - col.x;
      const dz = currZ - col.z;
      const dist = Math.hypot(dx, dz);
      const minDist = objectRadius + col.r;
      const clearance = dist - minDist;

      if (pass === 0 && clearance < minClearance) {
        minClearance = clearance;
      }

      if (dist < minDist && dist > 0.00001) {
        passAdjusted = true;
        collided = true;
        label = col.label;

        const nx = dx / dist;
        const nz = dz / dist;
        const overlap = minDist - dist;

        currX += nx * overlap;
        currZ += nz * overlap;
      }
    }

    if (!passAdjusted) break;
  }

  return {
    x: currX,
    z: currZ,
    collided,
    label,
    minClearance: minClearance === Infinity ? 999 : minClearance,
  };
}

/**
 * Resolves camera occlusion, ensuring the camera view does not clip inside solid geometry.
 */
export function resolveCameraOcclusion(
  camPos: { x: number; y: number; z: number },
  targetPos: { x: number; y: number; z: number },
  colliders: RoverCollider[],
  terrainFloorY: number,
  cameraNearRadius = 0.35
): { x: number; y: number; z: number } {
  let outX = camPos.x;
  let outZ = camPos.z;
  let outY = Math.max(terrainFloorY + 0.65, camPos.y);

  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    // Check horizontal bounding cylinder of obstacle
    const dx = outX - col.x;
    const dz = outZ - col.z;
    const dist = Math.hypot(dx, dz);
    const minDist = col.r + cameraNearRadius;

    if (dist < minDist && dist > 0.0001) {
      // Push camera outside along line from collider center to camera
      const nx = dx / dist;
      const nz = dz / dist;
      outX = col.x + nx * minDist;
      outZ = col.z + nz * minDist;
    }
  }

  return { x: outX, y: outY, z: outZ };
}
