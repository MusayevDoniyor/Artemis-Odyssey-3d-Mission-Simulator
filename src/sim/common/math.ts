import type { SurfacePlanet } from '../../game/types';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getLunarTerrainHeight(x: number, z: number): number {
  return getSurfaceTerrainHeight('moon', x, z);
}

export function getSurfaceTerrainHeight(planet: SurfacePlanet, x: number, z: number): number {
  const distPad = Math.hypot(x, z);
  if (distPad < 15) return 0;
  const blend = clamp((distPad - 15) / 14, 0, 1);

  if (planet === 'mars') {
    // Jezero Crater sedimentary ripples + dry paleolake channel across ±260m arena
    let h =
      Math.sin(x * 0.028 + 0.6) * Math.cos(z * 0.03) * 2.5 +
      Math.sin(x * 0.075) * Math.cos(z * 0.068 + 1.2) * 0.95;

    // Ancient Delta Fan Terraces near (126, -134)
    const dDelta = Math.hypot(x - 126, z + 134);
    if (dDelta < 38) {
      h += Math.cos((dDelta / 38) * (Math.PI / 2)) * 4.4;
    }

    // Dry River Channel winding across Jezero floor
    const channelDist = Math.abs(z + x * 0.58 - 22);
    if (channelDist < 16 && distPad > 24) {
      h -= Math.cos((channelDist / 16) * (Math.PI / 2)) * 2.4;
    }

    // Máaz Basalt Ridge at (-148, -96)
    const dMaaz = Math.hypot(x + 148, z + 96);
    if (dMaaz < 42) {
      h += Math.cos((dMaaz / 42) * (Math.PI / 2)) * 6.4;
    }

    // Outer Jezero Crater Wall beyond ±260m playable rim
    if (distPad > 265) {
      const rimT = clamp((distPad - 265) / 72, 0, 1);
      const smoothRim = rimT * rimT * (3 - 2 * rimT);
      h += smoothRim * 22.0 * (0.76 + 0.24 * Math.sin(Math.atan2(z, x) * 5));
    }

    return h * blend;
  }

  // Moon South Pole: smooth undulating highlands + 4 named corridors across ±260m
  let h =
    Math.sin(x * 0.028) * Math.cos(z * 0.028) * 2.6 +
    Math.sin(x * 0.072 + 1.1) * Math.cos(z * 0.064) * 0.95;

  // Shackleton Cold Trap Crater at (128, -142)
  const dIce = Math.hypot(x - 128, z + 142);
  if (dIce < 30) {
    h -= Math.cos((dIce / 30) * (Math.PI / 2)) * 5.2;
  } else if (dIce < 42) {
    h += Math.sin(((dIce - 30) / 12) * Math.PI) * 2.2;
  }

  // Cabeus Secondary Shadow Basin at (-124, 152)
  const dCabeus = Math.hypot(x + 124, z - 152);
  if (dCabeus < 28) {
    h -= Math.cos((dCabeus / 28) * (Math.PI / 2)) * 4.2;
  }

  // Malapert Sunlit Ridge at (-148, -108)
  const dRidge = Math.hypot(x + 148, z + 108);
  if (dRidge < 40) {
    h += Math.cos((dRidge / 40) * (Math.PI / 2)) * 6.2;
  }

  // Nobile Highland Quarry Bench at (118, 134)
  const dNobile = Math.hypot(x - 118, z - 134);
  if (dNobile < 34) {
    h += Math.cos((dNobile / 34) * (Math.PI / 2)) * 3.8;
  }

  // Outer South Pole mountain rim outside expanded ±260m perimeter
  if (distPad > 265) {
    const rimT = clamp((distPad - 265) / 72, 0, 1);
    const smoothRim = rimT * rimT * (3 - 2 * rimT);
    h += smoothRim * 21.0 * (0.74 + 0.26 * Math.sin(Math.atan2(z, x) * 6));
  }

  return h * blend;
}

export function getSurfaceSlopeDeg(planet: SurfacePlanet, x: number, z: number): number {
  const eps = 1.5;
  const dhdx =
    (getSurfaceTerrainHeight(planet, x + eps, z) - getSurfaceTerrainHeight(planet, x - eps, z)) /
    (2 * eps);
  const dhdz =
    (getSurfaceTerrainHeight(planet, x, z + eps) - getSurfaceTerrainHeight(planet, x, z - eps)) /
    (2 * eps);
  return (Math.atan(Math.hypot(dhdx, dhdz)) * 180) / Math.PI;
}
