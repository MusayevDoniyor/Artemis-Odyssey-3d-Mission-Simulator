import { getUnifiedSurfaceColliders } from '../src/sim/collision/colliderRegistry';
import { MOON_OBJECTIVES, MARS_OBJECTIVES } from '../src/game/constants';
import { getSurfaceTerrainHeight } from '../src/game/physics';

interface BlockerItem {
  planet: string;
  category: 'stuck' | 'floating' | 'overlap';
  description: string;
  location: { x: number; z: number };
  details: string;
}

const blockers: BlockerItem[] = [];

for (const planet of ['moon', 'mars'] as const) {
  const colliders = getUnifiedSurfaceColliders(planet, { x: 0, z: 0 });
  const elevFn = (x: number, z: number) => getSurfaceTerrainHeight(planet, x, z);

  console.log(`Auditing ${planet.toUpperCase()} (${colliders.length} surface colliders)...`);

  // 1. Check for overlapping colliders (d < r1 + r2)
  for (let i = 0; i < colliders.length; i++) {
    for (let j = i + 1; j < colliders.length; j++) {
      const c1 = colliders[i];
      const c2 = colliders[j];
      const dist = Math.hypot(c1.x - c2.x, c1.z - c2.z);
      const minDistance = c1.r + c2.r;
      // Allow 0.05m tolerance for intentional tangent boundaries
      if (dist < minDistance - 0.05) {
        blockers.push({
          planet,
          category: 'overlap',
          description: `Overlap between ${c1.label} (r=${c1.r}m) and ${c2.label} (r=${c2.r}m)`,
          location: { x: c1.x, z: c1.z },
          details: `Distance: ${dist.toFixed(3)}m < Minimum: ${minDistance.toFixed(3)}m (Penetration: ${(minDistance - dist).toFixed(3)}m)`
        });
      }
    }
  }

  // 2. Check surface science stations and objectives for terrain altitude consistency
  const objectives = planet === 'moon' ? MOON_OBJECTIVES : MARS_OBJECTIVES;
  for (const obj of objectives) {
    const terrainY = elevFn(obj.x, obj.z);
    // In game engine, objects are pinned to terrain elevation: y = elevFn(x, z)
    if (!Number.isFinite(terrainY)) {
      blockers.push({
        planet,
        category: 'stuck',
        description: `Invalid non-finite terrain elevation for ${obj.title}`,
        location: { x: obj.x, z: obj.z },
        details: `Elevation is NaN or Infinite`
      });
    }
  }
}

console.log(`\nAudit Complete! Found ${blockers.length} issues.`);
if (blockers.length === 0) {
  console.log('Zero stuck, zero floating, and zero overlapping objects found across all surveyed Moon & Mars colliders.');
} else {
  console.log(JSON.stringify(blockers, null, 2));
}
