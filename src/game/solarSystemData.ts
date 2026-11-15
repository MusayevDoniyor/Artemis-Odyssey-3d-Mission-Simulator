export type SolarBodyCategory = 'star' | 'planet' | 'dwarf' | 'station' | 'belt' | 'comet';

export interface SolarSystemBodySpec {
  id: string;
  name: string;
  category: SolarBodyCategory;
  semiMajorAu: number;
  orbitalPeriodYears: number;
  explorationRadiusUnits: number;
  scientificScaleRadius: number;
  explorationBodySize: number;
  color: number;
  gravityG: number;
  lightTimeOneWay: string;
  tempRangeC: string;
  moonsSummary: string;
  fact: string;
  landablePlanet?: 'moon' | 'mars';
  targetId?: 'relay-orbit' | 'moon' | 'gateway' | 'mars';
}

export const SOLAR_SYSTEM_BODIES: SolarSystemBodySpec[] = [
  {
    id: 'sun',
    name: 'Sun (Sol)',
    category: 'star',
    semiMajorAu: 0,
    orbitalPeriodYears: 0,
    explorationRadiusUnits: 0,
    scientificScaleRadius: 0,
    explorationBodySize: 9.8,
    color: 0xfbbf24,
    gravityG: 27.9,
    lightTimeOneWay: '8 min 19 s to Earth',
    tempRangeC: '5,500°C surface',
    moonsSummary: '8 planets · 5+ dwarf worlds',
    fact: 'Holds 99.86% of our Solar System’s mass; solar flares can trigger radiation storms.',
  },
  {
    id: 'mercury',
    name: 'Mercury',
    category: 'planet',
    semiMajorAu: 0.39,
    orbitalPeriodYears: 0.24,
    explorationRadiusUnits: 16,
    scientificScaleRadius: 7.8,
    explorationBodySize: 1.15,
    color: 0x94a3b8,
    gravityG: 0.38,
    lightTimeOneWay: '5.1 min',
    tempRangeC: '-180°C to +430°C',
    moonsSummary: '0 moons',
    fact: 'Smallest planet—circles the Sun in just 88 Earth days with polar ice hidden in deep craters.',
  },
  {
    id: 'venus',
    name: 'Venus',
    category: 'planet',
    semiMajorAu: 0.72,
    orbitalPeriodYears: 0.62,
    explorationRadiusUnits: 24,
    scientificScaleRadius: 12.2,
    explorationBodySize: 1.75,
    color: 0xfde68a,
    gravityG: 0.9,
    lightTimeOneWay: '2.3–14 min',
    tempRangeC: '+465°C (thick CO₂)',
    moonsSummary: '0 moons',
    fact: 'Runaway greenhouse clouds make Venus hotter than Mercury and spin backwards slowly.',
  },
  {
    id: 'earth',
    name: 'Earth + Moon & HERMES',
    category: 'planet',
    semiMajorAu: 1.0,
    orbitalPeriodYears: 1.0,
    explorationRadiusUnits: 34,
    scientificScaleRadius: 16.5,
    explorationBodySize: 2.0,
    color: 0x38bdf8,
    gravityG: 1.0,
    lightTimeOneWay: '0 s (Moon: 1.3 s)',
    tempRangeC: '-89°C to +56°C',
    moonsSummary: 'Moon (0.165g) + Gateway NRHO',
    fact: 'Our home oasis; magnetic field shields life while Moon & Gateway test deep-space flight.',
    landablePlanet: 'moon',
    targetId: 'moon',
  },
  {
    id: 'mars',
    name: 'Mars (Jezero Crater)',
    category: 'planet',
    semiMajorAu: 1.52,
    orbitalPeriodYears: 1.88,
    explorationRadiusUnits: 46,
    scientificScaleRadius: 24.0,
    explorationBodySize: 1.55,
    color: 0xf97316,
    gravityG: 0.38,
    lightTimeOneWay: '3.2–22.4 min',
    tempRangeC: '-125°C to +20°C',
    moonsSummary: 'Phobos & Deimos',
    fact: 'Ancient river deltas hold clay minerals while thin CO₂ air requires supersonic parachutes & Sky Crane.',
    landablePlanet: 'mars',
    targetId: 'mars',
  },
  {
    id: 'ceres',
    name: 'Ceres (Dwarf Planet)',
    category: 'dwarf',
    semiMajorAu: 2.77,
    orbitalPeriodYears: 4.6,
    explorationRadiusUnits: 57,
    scientificScaleRadius: 36.0,
    explorationBodySize: 0.9,
    color: 0xcbd5e1,
    gravityG: 0.029,
    lightTimeOneWay: '15–31 min',
    tempRangeC: '-105°C',
    moonsSummary: 'Largest Main Asteroid Belt world',
    fact: 'A dwarf planet inside the rocky Asteroid Belt with bright salty brine deposits on its surface.',
  },
  {
    id: 'jupiter',
    name: 'Jupiter + Galilean Moons',
    category: 'planet',
    semiMajorAu: 5.2,
    orbitalPeriodYears: 11.86,
    explorationRadiusUnits: 72,
    scientificScaleRadius: 56.0,
    explorationBodySize: 4.4,
    color: 0xfdba74,
    gravityG: 2.53,
    lightTimeOneWay: '33–54 min',
    tempRangeC: '-110°C cloud tops',
    moonsSummary: 'Io · Europa · Ganymede · Callisto (95 total)',
    fact: 'Giant gas planet with a Great Red Spot storm wider than Earth and icy ocean moon Europa.',
  },
  {
    id: 'saturn',
    name: 'Saturn + Rings & Titan',
    category: 'planet',
    semiMajorAu: 9.58,
    orbitalPeriodYears: 29.45,
    explorationRadiusUnits: 92,
    scientificScaleRadius: 84.0,
    explorationBodySize: 3.7,
    color: 0xfef08a,
    gravityG: 1.07,
    lightTimeOneWay: '67–92 min',
    tempRangeC: '-140°C cloud tops',
    moonsSummary: 'Titan (lakes) · Enceladus (water geysers)',
    fact: 'Spectacular ice-and-rock rings plus Titan’s liquid methane lakes and Enceladus’ icy ocean plumes.',
  },
  {
    id: 'uranus',
    name: 'Uranus + Tilted Rings',
    category: 'planet',
    semiMajorAu: 19.2,
    orbitalPeriodYears: 84.0,
    explorationRadiusUnits: 112,
    scientificScaleRadius: 122.0,
    explorationBodySize: 2.6,
    color: 0x67e8f9,
    gravityG: 0.89,
    lightTimeOneWay: '2.4–2.9 hrs',
    tempRangeC: '-195°C',
    moonsSummary: 'Miranda · Ariel · Titania · Oberon',
    fact: 'Ice giant tipped 98° onto its side so its vertical faint rings roll around the Sun like a wheel.',
  },
  {
    id: 'neptune',
    name: 'Neptune + Triton',
    category: 'planet',
    semiMajorAu: 30.05,
    orbitalPeriodYears: 164.8,
    explorationRadiusUnits: 130,
    scientificScaleRadius: 155.0,
    explorationBodySize: 2.5,
    color: 0x3b82f6,
    gravityG: 1.14,
    lightTimeOneWay: '4.0–4.3 hrs',
    tempRangeC: '-200°C',
    moonsSummary: 'Triton (nitrogen geysers)',
    fact: 'Supersonic winds whip deep blue methane clouds at 2,000 km/h at the windy edge of the planetary zone.',
  },
  {
    id: 'pluto',
    name: 'Pluto + Charon (Kuiper Belt)',
    category: 'dwarf',
    semiMajorAu: 39.5,
    orbitalPeriodYears: 248.0,
    explorationRadiusUnits: 146,
    scientificScaleRadius: 180.0,
    explorationBodySize: 0.95,
    color: 0xe2e8f0,
    gravityG: 0.063,
    lightTimeOneWay: '5.5 hrs',
    tempRangeC: '-229°C',
    moonsSummary: 'Charon (half Pluto’s size) + 4 small moons',
    fact: 'Dwarf planet in the icy Kuiper Belt featuring Tombaugh Regio’s bright nitrogen-ice heart glacier.',
  },
  {
    id: 'eris',
    name: 'Eris · Haumea · Makemake',
    category: 'dwarf',
    semiMajorAu: 67.8,
    orbitalPeriodYears: 558.0,
    explorationRadiusUnits: 162,
    scientificScaleRadius: 205.0,
    explorationBodySize: 0.85,
    color: 0xa5f3fc,
    gravityG: 0.084,
    lightTimeOneWay: '9.4 hrs',
    tempRangeC: '-243°C',
    moonsSummary: 'Dysnomia · Distant Kuiper Scattered Disk',
    fact: 'Distant dwarf worlds beyond Pluto—representing the Kuiper Belt and transition toward the far Oort Cloud.',
  },
  {
    id: 'halley',
    name: "Halley's Comet",
    category: 'comet',
    semiMajorAu: 17.8,
    orbitalPeriodYears: 75.3,
    explorationRadiusUnits: 66,
    scientificScaleRadius: 48.0,
    explorationBodySize: 0.72,
    color: 0x7dd3fc,
    gravityG: 0.0001,
    lightTimeOneWay: 'Varies along ellipse',
    tempRangeC: '-200°C to +77°C near Sun',
    moonsSummary: 'Glowing ion & dust tails',
    fact: 'Dirty snowball whose icy coma melts near the Sun, pushing two glowing tails always away from solar wind.',
  },
];

export type SolarScaleMode = 'exploration' | 'scientific';

/**
 * Pure Keplerian orbital position helper (2D ecliptic XZ plane)
 * Centered on Sun at (originX, originZ).
 */
export function computeKeplerBodyPosition(
  body: SolarSystemBodySpec,
  epochYears: number,
  scaleMode: SolarScaleMode,
  originX = -48,
  originZ = -36
): { x: number; z: number; orbitalRadius: number; angleRad: number } {
  if (body.id === 'sun') {
    return { x: originX, z: originZ, orbitalRadius: 0, angleRad: 0 };
  }
  const baseRadius =
    scaleMode === 'scientific' ? body.scientificScaleRadius : body.explorationRadiusUnits;
  const period = Math.max(0.05, body.orbitalPeriodYears);
  // Deterministic non-overlapping initial phase offsets by body id
  const phaseSeeds: Record<string, number> = {
    mercury: 0.7,
    venus: 2.1,
    earth: 0.88, // keeps Earth near (-22, 26) at epochYears = 0!
    mars: 0.42,
    ceres: 2.9,
    jupiter: 5.1,
    saturn: 1.35,
    uranus: 3.9,
    neptune: 5.7,
    pluto: 2.6,
    eris: 4.5,
    halley: 0.25,
  };
  const phase0 = phaseSeeds[body.id] ?? 0;
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

export function computeWeightOnBodyKg(earthWeightKg: number, gravityG: number): number {
  return Math.round(earthWeightKg * gravityG * 10) / 10;
}
