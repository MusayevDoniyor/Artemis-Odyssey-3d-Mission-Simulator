import type { CampaignMissionId, SpaceTargetId } from './types';

export type SolarBodyCategory = 'star' | 'planet' | 'moon' | 'dwarf' | 'station' | 'belt' | 'comet';

export interface SolarSystemBodySpec {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  category: SolarBodyCategory;
  semiMajorAu: number;
  orbitalPeriodYears: number;
  explorationRadiusUnits: number;
  scientificScaleRadius: number;
  explorationBodySize: number;
  color: number;
  gravityG: number;
  diameterDisplay: string;
  massDisplay: string;
  gravityDisplay: string;
  orbitalPeriodDisplay: string;
  avgDistanceDisplay: string;
  lightTimeOneWay: string;
  tempRangeC: string;
  moonsSummary: string;
  fact: string;
  landablePlanet?: 'moon' | 'mars';
  targetId?: SpaceTargetId;
}

export const SOLAR_SUN_ORIGIN_X = -48;
export const SOLAR_SUN_ORIGIN_Z = -36;

export const PRIMARY_SOLAR_BAR_IDS = [
  'sun',
  'mercury',
  'venus',
  'earth',
  'moon',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
  'pluto',
] as const;

export const SOLAR_SYSTEM_BODIES: SolarSystemBodySpec[] = [
  {
    id: 'sun',
    name: 'Sun',
    shortName: 'Sun',
    subtitle: 'Yellow Dwarf Star',
    category: 'star',
    semiMajorAu: 0,
    orbitalPeriodYears: 0,
    explorationRadiusUnits: 0,
    scientificScaleRadius: 0,
    explorationBodySize: 9.2,
    color: 0xfbbf24,
    gravityG: 27.9,
    diameterDisplay: '1,392,700 km',
    massDisplay: '1.99 × 10³⁰ kg',
    gravityDisplay: '274 m/s²',
    orbitalPeriodDisplay: '230M yrs (Galactic)',
    avgDistanceDisplay: 'System Center',
    lightTimeOneWay: '8 min 19 s to Earth',
    tempRangeC: '5,500°C surface',
    moonsSummary: '8 planets · 5+ dwarf worlds',
    fact: 'Holds 99.86% of our Solar System’s mass; solar flares drive space weather across every world.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    shortName: 'Mercury',
    subtitle: 'Innermost Rocky World',
    category: 'planet',
    semiMajorAu: 0.39,
    orbitalPeriodYears: 0.24,
    explorationRadiusUnits: 16.5,
    scientificScaleRadius: 7.8,
    explorationBodySize: 1.15,
    color: 0x94a3b8,
    gravityG: 0.38,
    diameterDisplay: '4,879 km',
    massDisplay: '3.30 × 10²³ kg',
    gravityDisplay: '3.70 m/s²',
    orbitalPeriodDisplay: '87.97 days',
    avgDistanceDisplay: '57.9 million km',
    lightTimeOneWay: '5.1 min',
    tempRangeC: '-180°C to +430°C',
    moonsSummary: '0 moons',
    fact: 'Smallest planet—circles the Sun in just 88 Earth days with water ice hidden in deep polar craters.',
  },
  {
    id: 'venus',
    name: 'Venus',
    shortName: 'Venus',
    subtitle: 'Cloud-Shrouded Sister World',
    category: 'planet',
    semiMajorAu: 0.72,
    orbitalPeriodYears: 0.62,
    explorationRadiusUnits: 24.5,
    scientificScaleRadius: 12.2,
    explorationBodySize: 1.75,
    color: 0xfde68a,
    gravityG: 0.9,
    diameterDisplay: '12,104 km',
    massDisplay: '4.87 × 10²⁴ kg',
    gravityDisplay: '8.87 m/s²',
    orbitalPeriodDisplay: '224.7 days',
    avgDistanceDisplay: '108.2 million km',
    lightTimeOneWay: '2.3–14 min',
    tempRangeC: '+465°C (thick CO₂)',
    moonsSummary: '0 moons',
    fact: 'Dense carbon dioxide clouds trap extreme heat and cause Venus to rotate backwards slowly.',
  },
  {
    id: 'earth',
    name: 'Earth',
    shortName: 'Earth',
    subtitle: 'Our Home Planet',
    category: 'planet',
    semiMajorAu: 1.0,
    orbitalPeriodYears: 1.0,
    explorationRadiusUnits: 36.0,
    scientificScaleRadius: 17.0,
    explorationBodySize: 3.4,
    color: 0x38bdf8,
    gravityG: 1.0,
    diameterDisplay: '12,742 km',
    massDisplay: '5.97 × 10²⁴ kg',
    gravityDisplay: '9.81 m/s²',
    orbitalPeriodDisplay: '365.25 days',
    avgDistanceDisplay: '149.6 million km',
    lightTimeOneWay: '0 s (Moon: 1.3 s)',
    tempRangeC: '-89°C to +56°C',
    moonsSummary: 'Moon (0.165g) + Gateway NRHO',
    fact: 'A living ocean world protected by a magnetic shield, serving as launchpad for Moon and Mars.',
    landablePlanet: 'moon',
    targetId: 'moon',
  },
  {
    id: 'moon',
    name: 'Moon',
    shortName: 'Moon',
    subtitle: 'Earth’s Natural Satellite',
    category: 'moon',
    semiMajorAu: 1.0,
    orbitalPeriodYears: 0.0748,
    explorationRadiusUnits: 10.5,
    scientificScaleRadius: 4.2,
    explorationBodySize: 1.45,
    color: 0xcbd5e1,
    gravityG: 0.165,
    diameterDisplay: '3,474 km',
    massDisplay: '7.35 × 10²² kg',
    gravityDisplay: '1.62 m/s²',
    orbitalPeriodDisplay: '27.32 days (around Earth)',
    avgDistanceDisplay: '384,400 km from Earth',
    lightTimeOneWay: '1.28 s from Earth',
    tempRangeC: '-230°C poles to +120°C',
    moonsSummary: 'Gateway NRHO Staging Orbit',
    fact: 'Shadowed craters at the lunar South Pole trap ancient water ice right beside sunlit power ridges.',
    landablePlanet: 'moon',
    targetId: 'moon',
  },
  {
    id: 'mars',
    name: 'Mars',
    shortName: 'Mars',
    subtitle: 'The Red Planet',
    category: 'planet',
    semiMajorAu: 1.52,
    orbitalPeriodYears: 1.88,
    explorationRadiusUnits: 51.0,
    scientificScaleRadius: 25.0,
    explorationBodySize: 2.3,
    color: 0xf97316,
    gravityG: 0.38,
    diameterDisplay: '6,779 km',
    massDisplay: '6.42 × 10²³ kg',
    gravityDisplay: '3.72 m/s²',
    orbitalPeriodDisplay: '687 days',
    avgDistanceDisplay: '227.9 million km',
    lightTimeOneWay: '3.2–22.4 min',
    tempRangeC: '-125°C to +20°C',
    moonsSummary: 'Phobos & Deimos',
    fact: 'Ancient river deltas in Jezero Crater hold clay minerals where rovers search for past habitability.',
    landablePlanet: 'mars',
    targetId: 'mars',
  },
  {
    id: 'ceres',
    name: 'Ceres',
    shortName: 'Ceres',
    subtitle: 'Main Belt Dwarf Planet',
    category: 'dwarf',
    semiMajorAu: 2.77,
    orbitalPeriodYears: 4.6,
    explorationRadiusUnits: 63.5,
    scientificScaleRadius: 36.0,
    explorationBodySize: 0.95,
    color: 0xcbd5e1,
    gravityG: 0.029,
    diameterDisplay: '940 km',
    massDisplay: '9.38 × 10²⁰ kg',
    gravityDisplay: '0.28 m/s²',
    orbitalPeriodDisplay: '4.60 years',
    avgDistanceDisplay: '414 million km',
    lightTimeOneWay: '15–31 min',
    tempRangeC: '-105°C',
    moonsSummary: 'Largest Asteroid Belt world',
    fact: 'Dwarf planet inside the rocky Asteroid Belt with bright salty brine deposits on its surface.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    shortName: 'Jupiter',
    subtitle: 'Gas Giant & Ocean Moons',
    category: 'planet',
    semiMajorAu: 5.2,
    orbitalPeriodYears: 11.86,
    explorationRadiusUnits: 82.0,
    scientificScaleRadius: 58.0,
    explorationBodySize: 4.4,
    color: 0xfdba74,
    gravityG: 2.53,
    diameterDisplay: '139,820 km',
    massDisplay: '1.90 × 10²⁷ kg',
    gravityDisplay: '24.79 m/s²',
    orbitalPeriodDisplay: '11.86 years',
    avgDistanceDisplay: '778.5 million km',
    lightTimeOneWay: '33–54 min',
    tempRangeC: '-110°C cloud tops',
    moonsSummary: 'Io · Europa · Ganymede · Callisto',
    fact: 'Largest planet in our Solar System, home to the Great Red Spot and icy ocean moon Europa.',
  },
  {
    id: 'saturn',
    name: 'Saturn',
    shortName: 'Saturn',
    subtitle: 'Ringed Gas Giant',
    category: 'planet',
    semiMajorAu: 9.58,
    orbitalPeriodYears: 29.45,
    explorationRadiusUnits: 104.0,
    scientificScaleRadius: 86.0,
    explorationBodySize: 3.7,
    color: 0xfef08a,
    gravityG: 1.07,
    diameterDisplay: '116,460 km',
    massDisplay: '5.68 × 10²⁶ kg',
    gravityDisplay: '10.44 m/s²',
    orbitalPeriodDisplay: '29.45 years',
    avgDistanceDisplay: '1.43 billion km',
    lightTimeOneWay: '67–92 min',
    tempRangeC: '-140°C cloud tops',
    moonsSummary: 'Titan (lakes) · Enceladus (plumes)',
    fact: 'Spectacular ice-and-rock rings orbit alongside methane-lake moon Titan and geyser moon Enceladus.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    shortName: 'Uranus',
    subtitle: 'Tilted Ice Giant',
    category: 'planet',
    semiMajorAu: 19.2,
    orbitalPeriodYears: 84.0,
    explorationRadiusUnits: 124.0,
    scientificScaleRadius: 122.0,
    explorationBodySize: 2.6,
    color: 0x67e8f9,
    gravityG: 0.89,
    diameterDisplay: '50,724 km',
    massDisplay: '8.68 × 10²⁵ kg',
    gravityDisplay: '8.69 m/s²',
    orbitalPeriodDisplay: '84.0 years',
    avgDistanceDisplay: '2.87 billion km',
    lightTimeOneWay: '2.4–2.9 hrs',
    tempRangeC: '-195°C',
    moonsSummary: 'Miranda · Ariel · Titania · Oberon',
    fact: 'Ice giant tipped 98° onto its side so its faint vertical rings roll around the Sun like a wheel.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    shortName: 'Neptune',
    subtitle: 'Supersonic Ice Giant',
    category: 'planet',
    semiMajorAu: 30.05,
    orbitalPeriodYears: 164.8,
    explorationRadiusUnits: 142.0,
    scientificScaleRadius: 155.0,
    explorationBodySize: 2.5,
    color: 0x3b82f6,
    gravityG: 1.14,
    diameterDisplay: '49,244 km',
    massDisplay: '1.02 × 10²⁶ kg',
    gravityDisplay: '11.15 m/s²',
    orbitalPeriodDisplay: '164.8 years',
    avgDistanceDisplay: '4.50 billion km',
    lightTimeOneWay: '4.0–4.3 hrs',
    tempRangeC: '-200°C',
    moonsSummary: 'Triton (nitrogen geysers)',
    fact: 'Supersonic winds whip deep blue methane clouds at 2,000 km/h at the outer planetary frontier.',
  },
  {
    id: 'pluto',
    name: 'Pluto',
    shortName: 'Pluto',
    subtitle: 'Kuiper Belt Dwarf Planet',
    category: 'dwarf',
    semiMajorAu: 39.5,
    orbitalPeriodYears: 248.0,
    explorationRadiusUnits: 158.0,
    scientificScaleRadius: 180.0,
    explorationBodySize: 1.0,
    color: 0xe2e8f0,
    gravityG: 0.063,
    diameterDisplay: '2,377 km',
    massDisplay: '1.30 × 10²² kg',
    gravityDisplay: '0.62 m/s²',
    orbitalPeriodDisplay: '248.0 years',
    avgDistanceDisplay: '5.91 billion km',
    lightTimeOneWay: '5.5 hrs',
    tempRangeC: '-229°C',
    moonsSummary: 'Charon + 4 small moons',
    fact: 'Dwarf planet in the icy Kuiper Belt featuring Tombaugh Regio’s bright nitrogen-ice heart glacier.',
  },
  {
    id: 'eris',
    name: 'Eris',
    shortName: 'Eris',
    subtitle: 'Distant Kuiper World',
    category: 'dwarf',
    semiMajorAu: 67.8,
    orbitalPeriodYears: 558.0,
    explorationRadiusUnits: 174.0,
    scientificScaleRadius: 205.0,
    explorationBodySize: 0.95,
    color: 0xa5f3fc,
    gravityG: 0.084,
    diameterDisplay: '2,326 km',
    massDisplay: '1.66 × 10²² kg',
    gravityDisplay: '0.82 m/s²',
    orbitalPeriodDisplay: '558.0 years',
    avgDistanceDisplay: '10.1 billion km',
    lightTimeOneWay: '9.4 hrs',
    tempRangeC: '-243°C',
    moonsSummary: 'Dysnomia',
    fact: 'Distant dwarf world beyond Pluto at the edge of the Kuiper Scattered Disk.',
  },
  {
    id: 'halley',
    name: "Halley's Comet",
    shortName: 'Halley',
    subtitle: 'Periodic Comet',
    category: 'comet',
    semiMajorAu: 17.8,
    orbitalPeriodYears: 75.3,
    explorationRadiusUnits: 71.0,
    scientificScaleRadius: 48.0,
    explorationBodySize: 0.72,
    color: 0x7dd3fc,
    gravityG: 0.0001,
    diameterDisplay: '11 km nucleus',
    massDisplay: '2.20 × 10¹⁴ kg',
    gravityDisplay: '0.0005 m/s²',
    orbitalPeriodDisplay: '75.3 years',
    avgDistanceDisplay: '2.66 billion km',
    lightTimeOneWay: 'Varies along ellipse',
    tempRangeC: '-200°C to +77°C',
    moonsSummary: 'Glowing ion & dust tails',
    fact: 'Icy comet whose coma sublimates near the Sun, pushing two glowing tails away from solar wind.',
  },
];

export type SolarScaleMode = 'exploration' | 'scientific';

const PHASE_SEEDS: Record<string, number> = {
  mercury: 0.72,
  venus: 2.15,
  earth: 0.88,
  moon: -0.35,
  mars: 0.42,
  ceres: 2.9,
  jupiter: 5.15,
  saturn: 1.35,
  uranus: 3.9,
  neptune: 5.7,
  pluto: 2.6,
  eris: 4.5,
  halley: 0.25,
};

/**
 * Pure Keplerian orbital position helper (2D ecliptic XZ plane).
 * Planets orbit Sun at (originX, originZ). Earth's Moon orbits Earth locally!
 */
export function computeKeplerBodyPosition(
  body: SolarSystemBodySpec,
  epochYears: number,
  scaleMode: SolarScaleMode,
  originX = SOLAR_SUN_ORIGIN_X,
  originZ = SOLAR_SUN_ORIGIN_Z
): { x: number; z: number; orbitalRadius: number; angleRad: number } {
  if (body.id === 'sun') {
    return { x: originX, z: originZ, orbitalRadius: 0, angleRad: 0 };
  }

  if (body.id === 'moon') {
    const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
    const earthPos = computeKeplerBodyPosition(earthSpec, epochYears, scaleMode, originX, originZ);
    const moonR = scaleMode === 'scientific' ? body.scientificScaleRadius : body.explorationRadiusUnits;
    const angleRad = (PHASE_SEEDS.moon ?? 0) + (epochYears / Math.max(0.05, body.orbitalPeriodYears)) * Math.PI * 2;
    return {
      x: earthPos.x + Math.cos(angleRad) * moonR,
      z: earthPos.z + Math.sin(angleRad) * moonR,
      orbitalRadius: moonR,
      angleRad,
    };
  }

  const baseRadius =
    scaleMode === 'scientific' ? body.scientificScaleRadius : body.explorationRadiusUnits;
  const period = Math.max(0.05, body.orbitalPeriodYears);
  const phase0 = PHASE_SEEDS[body.id] ?? 0;
  const angleRad = phase0 + (epochYears / period) * Math.PI * 2;
  const ecc = body.category === 'comet' ? 0.56 : 0.03;
  const r = baseRadius * (1 - ecc * Math.cos(angleRad));
  return {
    x: originX + Math.cos(angleRad) * r,
    z: originZ + Math.sin(angleRad) * r,
    orbitalRadius: r,
    angleRad,
  };
}

export function getLiveSolarTargetPosition(
  targetId: SpaceTargetId,
  epochYears = 0,
  scaleMode: SolarScaleMode = 'exploration',
  originX = SOLAR_SUN_ORIGIN_X,
  originZ = SOLAR_SUN_ORIGIN_Z
): { x: number; z: number; radius: number } {
  const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
  const moonSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'moon')!;
  const marsSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'mars')!;

  const earthPos = computeKeplerBodyPosition(earthSpec, epochYears, scaleMode, originX, originZ);
  const moonPos = computeKeplerBodyPosition(moonSpec, epochYears, scaleMode, originX, originZ);

  if (targetId === 'moon') {
    return { x: moonPos.x, z: moonPos.z, radius: moonSpec.explorationBodySize };
  }

  if (targetId === 'relay-orbit') {
    const t = scaleMode === 'scientific' ? 0.62 : 0.65;
    return {
      x: earthPos.x + (moonPos.x - earthPos.x) * t,
      z: earthPos.z + (moonPos.z - earthPos.z) * t,
      radius: 2.4,
    };
  }

  if (targetId === 'gateway') {
    const dx = moonPos.x - earthPos.x;
    const dz = moonPos.z - earthPos.z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    const offset = scaleMode === 'scientific' ? 2.4 : 4.2;
    return {
      x: moonPos.x + (-dz / len) * offset,
      z: moonPos.z + (dx / len) * offset,
      radius: 2.2,
    };
  }

  const marsPos = computeKeplerBodyPosition(marsSpec, epochYears, scaleMode, originX, originZ);
  return { x: marsPos.x, z: marsPos.z, radius: marsSpec.explorationBodySize };
}

export function getShipSpawnForMission(
  missionId: CampaignMissionId,
  epochYears = 0,
  scaleMode: SolarScaleMode = 'exploration'
): { x: number; z: number } {
  if (missionId === 'artemis-4') {
    const moonPos = getLiveSolarTargetPosition('moon', epochYears, scaleMode);
    return { x: moonPos.x - 1.6, z: moonPos.z + 4.4 };
  }
  const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
  const earthPos = computeKeplerBodyPosition(earthSpec, epochYears, scaleMode);
  return { x: earthPos.x - 3.4, z: earthPos.z + 3.4 };
}

export function computeWeightOnBodyKg(earthWeightKg: number, gravityG: number): number {
  return Math.round(earthWeightKg * gravityG * 10) / 10;
}
