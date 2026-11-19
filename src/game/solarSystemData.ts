import type { CampaignMissionId, SpaceTargetId } from './types';
import {
  PLANETARY_CATALOG_SI,
  SI,
  type DataProvenance,
  metersToAu,
  radToDeg,
  secondsToDays,
} from './planetaryCatalog';
import {
  EXPLORATION_VISUAL_LAYOUT,
  SCIENTIFIC_UNITS_PER_AU,
  type SolarScaleMode,
  computeBodyCartesianSI,
  getBodyVisualRadiusUnits,
  projectHeliocentricSIToScene,
} from './orbitalMechanics';
import type { HorizonsBodyStateSI } from './jplHorizons';

export type { SolarScaleMode };
export type SolarBodyCategory = 'star' | 'planet' | 'moon' | 'dwarf' | 'station' | 'belt' | 'comet' | 'asteroid';

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
  scientificBodyRadius: number;
  axialTiltDeg: number;
  siderealRotationPeriodDays: number;
  eccentricity: number;
  inclinationDeg: number;
  provenance: DataProvenance;
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

export function getNasaFactSheetUrl(bodyId: string): string {
  switch (bodyId) {
    case 'sun':
      return 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html';
    case 'moon':
      return 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html';
    case 'bennu':
      return 'https://science.nasa.gov/mission/osiris-rex/';
    case 'halley':
      return 'https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=1P';
    case 'ceres':
    case 'pluto':
    case 'eris':
      return 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/dwarffact.html';
    default:
      return `https://nssdc.gsfc.nasa.gov/planetary/factsheet/${bodyId}fact.html`;
  }
}

let activeHorizonsVectors: Record<string, HorizonsBodyStateSI> | null = null;
export function setActiveHorizonsVectors(vectors: Record<string, HorizonsBodyStateSI> | null): void {
  activeHorizonsVectors = vectors;
}
export function getActiveHorizonsVectors(): Record<string, HorizonsBodyStateSI> | null {
  return activeHorizonsVectors;
}

function buildBodySpec(
  id: string,
  meta: Pick<
    SolarSystemBodySpec,
    | 'shortName'
    | 'subtitle'
    | 'color'
    | 'diameterDisplay'
    | 'massDisplay'
    | 'gravityDisplay'
    | 'orbitalPeriodDisplay'
    | 'avgDistanceDisplay'
    | 'lightTimeOneWay'
    | 'tempRangeC'
    | 'moonsSummary'
    | 'fact'
    | 'landablePlanet'
    | 'targetId'
  >
): SolarSystemBodySpec {
  const si = PLANETARY_CATALOG_SI[id];
  const layout = EXPLORATION_VISUAL_LAYOUT[id];
  const aM = si.orbitalElements?.semiMajorAxisM ?? 0;
  const semiMajorAu = id === 'moon' ? 1.0 : metersToAu(aM);
  const orbitalPeriodYears = si.siderealOrbitPeriodS > 0 ? si.siderealOrbitPeriodS / SI.JULIAN_YEAR_S : 0;

  // Scientific orbit radius in scene units: Sun=0, Moon=60.34 R_earth around Earth, Planets=true AU * SCIENTIFIC_UNITS_PER_AU
  const sciOrbitRadius =
    id === 'sun'
      ? 0
      : id === 'moon'
        ? (aM / si.meanRadiusM) * getBodyVisualRadiusUnits('moon', 'scientific')
        : semiMajorAu * SCIENTIFIC_UNITS_PER_AU;

  return {
    id,
    name: si.name,
    shortName: meta.shortName,
    subtitle: meta.subtitle,
    category: si.category,
    semiMajorAu: Math.round(semiMajorAu * 1000) / 1000,
    orbitalPeriodYears: Math.round(orbitalPeriodYears * 10000) / 10000,
    explorationRadiusUnits: layout.orbitRadiusUnits,
    scientificScaleRadius: sciOrbitRadius,
    explorationBodySize: layout.bodyRadiusUnits,
    scientificBodyRadius: getBodyVisualRadiusUnits(id, 'scientific'),
    axialTiltDeg: Math.round(radToDeg(si.axialTiltRad) * 100) / 100,
    siderealRotationPeriodDays: Math.round(secondsToDays(si.siderealRotationPeriodS) * 1000) / 1000,
    eccentricity: si.orbitalElements?.eccentricity ?? 0,
    inclinationDeg: si.orbitalElements ? Math.round(radToDeg(si.orbitalElements.inclinationRad) * 100) / 100 : 0,
    provenance: si.provenance,
    color: meta.color,
    gravityG: Math.round((si.surfaceGravityMs2 / SI.G0) * 1000) / 1000,
    diameterDisplay: meta.diameterDisplay,
    massDisplay: meta.massDisplay,
    gravityDisplay: meta.gravityDisplay,
    orbitalPeriodDisplay: meta.orbitalPeriodDisplay,
    avgDistanceDisplay: meta.avgDistanceDisplay,
    lightTimeOneWay: meta.lightTimeOneWay,
    tempRangeC: meta.tempRangeC,
    moonsSummary: meta.moonsSummary,
    fact: meta.fact,
    landablePlanet: meta.landablePlanet,
    targetId: meta.targetId,
  };
}

export const SOLAR_SYSTEM_BODIES: SolarSystemBodySpec[] = [
  buildBodySpec('sun', {
    shortName: 'Sun',
    subtitle: 'G2V Main-Sequence Star',
    color: 0xfbbf24,
    diameterDisplay: '1,392,680 km (109.2× Earth)',
    massDisplay: '1.988 × 10³⁰ kg',
    gravityDisplay: '274.0 m/s²',
    orbitalPeriodDisplay: '230M yrs (Galactic)',
    avgDistanceDisplay: 'System Barycenter',
    lightTimeOneWay: '8 min 19 s to Earth',
    tempRangeC: '5,505°C photosphere',
    moonsSummary: '8 planets · 5+ dwarf worlds',
    fact: 'Holds 99.86% of our Solar System’s mass; coronal mass ejections drive space weather across every world.',
  }),
  buildBodySpec('mercury', {
    shortName: 'Mercury',
    subtitle: 'Innermost Rocky World',
    color: 0x94a3b8,
    diameterDisplay: '4,879 km',
    massDisplay: '3.30 × 10²³ kg',
    gravityDisplay: '3.70 m/s²',
    orbitalPeriodDisplay: '87.97 days',
    avgDistanceDisplay: '0.387 AU (57.9M km)',
    lightTimeOneWay: '3.2–12.3 min',
    tempRangeC: '-180°C to +430°C',
    moonsSummary: '0 moons · e = 0.206 · i = 7.0°',
    fact: 'High orbital eccentricity (0.206) and 7° inclination lock Mercury into a 3:2 spin-orbit resonance.',
  }),
  buildBodySpec('venus', {
    shortName: 'Venus',
    subtitle: 'Retrograde Greenhouse World',
    color: 0xfde68a,
    diameterDisplay: '12,104 km',
    massDisplay: '4.87 × 10²⁴ kg',
    gravityDisplay: '8.87 m/s²',
    orbitalPeriodDisplay: '224.70 days',
    avgDistanceDisplay: '0.723 AU (108.2M km)',
    lightTimeOneWay: '2.3–14.4 min',
    tempRangeC: '+464°C surface',
    moonsSummary: '0 moons · Tilt 177.4° (Retrograde)',
    fact: 'Dense CO₂ atmosphere sustains runaway greenhouse heating while Venus rotates backwards every 243 Earth days.',
  }),
  buildBodySpec('earth', {
    shortName: 'Earth',
    subtitle: 'Our Home Planet',
    color: 0x38bdf8,
    diameterDisplay: '12,742 km',
    massDisplay: '5.972 × 10²⁴ kg',
    gravityDisplay: '9.81 m/s²',
    orbitalPeriodDisplay: '365.256 days',
    avgDistanceDisplay: '1.000 AU (149.6M km)',
    lightTimeOneWay: '0 s (Moon: 1.28 s)',
    tempRangeC: '-89°C to +56°C',
    moonsSummary: 'Moon (384,400 km) · Tilt 23.44°',
    fact: 'Tilted 23.44° on its axis; liquid water oceans and magnetosphere sustain life and launch operations.',
    landablePlanet: 'moon',
    targetId: 'moon',
  }),
  buildBodySpec('moon', {
    shortName: 'Moon',
    subtitle: 'Earth’s Natural Satellite',
    color: 0xcbd5e1,
    diameterDisplay: '3,474.8 km (0.273× Earth)',
    massDisplay: '7.342 × 10²² kg',
    gravityDisplay: '1.622 m/s²',
    orbitalPeriodDisplay: '27.322 days (around Earth)',
    avgDistanceDisplay: '384,400 km (60.3 R⊕)',
    lightTimeOneWay: '1.28 s from Earth',
    tempRangeC: '-233°C PSR to +121°C',
    moonsSummary: 'Orbit i = 5.145° · e = 0.0549',
    fact: 'Orbits Earth at 60.3 Earth radii inclined 5.15° to the ecliptic; permanently shadowed South Pole craters trap ice.',
    landablePlanet: 'moon',
    targetId: 'moon',
  }),
  buildBodySpec('mars', {
    shortName: 'Mars',
    subtitle: 'The Red Planet',
    color: 0xf97316,
    diameterDisplay: '6,779 km',
    massDisplay: '6.417 × 10²³ kg',
    gravityDisplay: '3.721 m/s²',
    orbitalPeriodDisplay: '686.98 days',
    avgDistanceDisplay: '1.524 AU (227.9M km)',
    lightTimeOneWay: '3.2–22.4 min',
    tempRangeC: '-140°C to +20°C',
    moonsSummary: 'Phobos · Deimos · Tilt 25.19°',
    fact: 'Eccentricity (0.093) drives seasonal dust storms across Jezero Crater; 25.19° tilt mirrors Earth seasons.',
    landablePlanet: 'mars',
    targetId: 'mars',
  }),
  buildBodySpec('ceres', {
    shortName: 'Ceres',
    subtitle: 'Main Belt Dwarf Planet',
    color: 0xcbd5e1,
    diameterDisplay: '939.4 km',
    massDisplay: '9.384 × 10²⁰ kg',
    gravityDisplay: '0.284 m/s²',
    orbitalPeriodDisplay: '4.60 years',
    avgDistanceDisplay: '2.768 AU (414M km)',
    lightTimeOneWay: '15–31 min',
    tempRangeC: '-105°C',
    moonsSummary: 'Main Asteroid Belt · i = 10.59°',
    fact: 'Largest object in the Asteroid Belt between Mars and Jupiter, inclined 10.6° with bright sodium-carbonate evaporites.',
  }),
  buildBodySpec('jupiter', {
    shortName: 'Jupiter',
    subtitle: 'Gas Giant & Galilean System',
    color: 0xfdba74,
    diameterDisplay: '139,820 km (10.97× Earth)',
    massDisplay: '1.898 × 10²⁷ kg',
    gravityDisplay: '24.79 m/s²',
    orbitalPeriodDisplay: '11.86 years',
    avgDistanceDisplay: '5.203 AU (778.5M km)',
    lightTimeOneWay: '33–54 min',
    tempRangeC: '-110°C (1 bar)',
    moonsSummary: 'Io · Europa · Ganymede · Callisto',
    fact: 'Spins in just 9.93 hours despite spanning 11 Earth diameters, sculpting the Asteroid Belt through orbital resonances.',
  }),
  buildBodySpec('saturn', {
    shortName: 'Saturn',
    subtitle: 'Ringed Gas Giant',
    color: 0xfef08a,
    diameterDisplay: '116,460 km (9.14× Earth)',
    massDisplay: '5.683 × 10²⁶ kg',
    gravityDisplay: '10.44 m/s²',
    orbitalPeriodDisplay: '29.45 years',
    avgDistanceDisplay: '9.537 AU (1.43B km)',
    lightTimeOneWay: '67–92 min',
    tempRangeC: '-140°C (1 bar)',
    moonsSummary: 'Titan · Enceladus · Tilt 26.73°',
    fact: 'Ring plane aligns with Saturn’s 26.73° axial tilt, spanning C, B, Cassini Division, and A rings out to 2.27 R♄.',
  }),
  buildBodySpec('uranus', {
    shortName: 'Uranus',
    subtitle: 'Sideways Ice Giant',
    color: 0x67e8f9,
    diameterDisplay: '50,724 km (3.98× Earth)',
    massDisplay: '8.681 × 10²⁵ kg',
    gravityDisplay: '8.69 m/s²',
    orbitalPeriodDisplay: '84.02 years',
    avgDistanceDisplay: '19.19 AU (2.87B km)',
    lightTimeOneWay: '2.4–2.9 hrs',
    tempRangeC: '-195°C',
    moonsSummary: '28 moons · Tilt 97.77°',
    fact: 'Axial obliquity of 97.77° turns Uranus and its faint ring system sideways into extreme 42-year polar seasons.',
  }),
  buildBodySpec('neptune', {
    shortName: 'Neptune',
    subtitle: 'Supersonic Ice Giant',
    color: 0x3b82f6,
    diameterDisplay: '49,244 km (3.86× Earth)',
    massDisplay: '1.024 × 10²⁶ kg',
    gravityDisplay: '11.15 m/s²',
    orbitalPeriodDisplay: '164.8 years',
    avgDistanceDisplay: '30.07 AU (4.50B km)',
    lightTimeOneWay: '4.0–4.3 hrs',
    tempRangeC: '-200°C',
    moonsSummary: 'Triton (retrograde) · 16 moons',
    fact: 'Farthest major planet at 30.07 AU; supersonic methane jet streams reach 2,100 km/h.',
  }),
  buildBodySpec('pluto', {
    shortName: 'Pluto',
    subtitle: 'Kuiper Belt Dwarf Planet',
    color: 0xe2e8f0,
    diameterDisplay: '2,377 km',
    massDisplay: '1.303 × 10²² kg',
    gravityDisplay: '0.62 m/s²',
    orbitalPeriodDisplay: '247.9 years',
    avgDistanceDisplay: '39.48 AU (5.91B km)',
    lightTimeOneWay: '4.1–6.9 hrs',
    tempRangeC: '-229°C',
    moonsSummary: 'Charon · e = 0.249 · i = 17.14°',
    fact: 'Inclined 17.14° with e = 0.249, dipping closer to the Sun than Neptune at perihelion before climbing back out to 49 AU.',
  }),
  buildBodySpec('eris', {
    shortName: 'Eris',
    subtitle: 'Scattered-Disk Dwarf Planet',
    color: 0xa5f3fc,
    diameterDisplay: '2,326 km',
    massDisplay: '1.647 × 10²² kg',
    gravityDisplay: '0.82 m/s²',
    orbitalPeriodDisplay: '558.0 years',
    avgDistanceDisplay: '67.86 AU (10.1B km)',
    lightTimeOneWay: '5.3–13.5 hrs',
    tempRangeC: '-243°C',
    moonsSummary: 'Dysnomia · e = 0.436 · i = 44.04°',
    fact: 'Follows a steep 44° inclined eccentric orbit reaching 97.5 AU at aphelion.',
  }),
  buildBodySpec('halley', {
    shortName: "Halley's Comet",
    subtitle: 'Retrograde Periodic Comet',
    color: 0x7dd3fc,
    diameterDisplay: '11 km nucleus',
    massDisplay: '2.20 × 10¹⁴ kg',
    gravityDisplay: '0.0005 m/s²',
    orbitalPeriodDisplay: '75.3 years',
    avgDistanceDisplay: '17.83 AU (0.59–35.1 AU)',
    lightTimeOneWay: 'Varies along ellipse',
    tempRangeC: '-200°C to +77°C',
    moonsSummary: 'e = 0.967 · i = 162.26° (Retrograde)',
    fact: 'High eccentricity (0.967) plunges 1P/Halley inside Venus’s orbit at perihelion before swinging beyond Neptune.',
  }),
  buildBodySpec('bennu', {
    shortName: 'Bennu',
    subtitle: 'Carbonaceous Near-Earth Asteroid',
    color: 0x94a3b8,
    diameterDisplay: '490 m (0.49 km)',
    massDisplay: '7.329 × 10¹⁰ kg',
    gravityDisplay: '0.00006 m/s²',
    orbitalPeriodDisplay: '1.20 years (436.6 d)',
    avgDistanceDisplay: '1.126 AU (168.5M km)',
    lightTimeOneWay: '8.3–18.2 min',
    tempRangeC: '-73°C to +7°C',
    moonsSummary: 'OSIRIS-REx Sample Return Target',
    fact: 'B-type carbonaceous rubble-pile asteroid sampled by NASA OSIRIS-REx; samples delivered to Earth Sept 2023.',
  }),
];

/**
 * True 3D Keplerian orbital position helper (projected into Three.js right-handed coordinates).
 * Solves M = E - e*sin(E) in SI units and maps via active scaleMode (`exploration` | `scientific` | `local`).
 */
export function computeKeplerBodyPosition(
  body: SolarSystemBodySpec,
  epochYears: number,
  scaleMode: SolarScaleMode,
  originX = SOLAR_SUN_ORIGIN_X,
  originZ = SOLAR_SUN_ORIGIN_Z,
  localAnchorId = 'earth'
): {
  x: number;
  y: number;
  z: number;
  orbitalRadius: number;
  angleRad: number;
  siPosM: { xM: number; yM: number; zM: number };
  provenance: DataProvenance;
} {
  if (body.id === 'sun' && scaleMode !== 'local') {
    return {
      x: originX,
      y: 0,
      z: originZ,
      orbitalRadius: 0,
      angleRad: 0,
      siPosM: { xM: 0, yM: 0, zM: 0 },
      provenance: 'REAL NASA/JPL DATA',
    };
  }

  const earthRes = computeBodyCartesianSI('earth', epochYears, activeHorizonsVectors);
  const bodyRes = computeBodyCartesianSI(body.id, epochYears, activeHorizonsVectors);
  const anchorRes =
    scaleMode === 'local'
      ? computeBodyCartesianSI(localAnchorId, epochYears, activeHorizonsVectors)
      : undefined;

  const projected = projectHeliocentricSIToScene(
    body.id,
    bodyRes.state,
    scaleMode,
    originX,
    originZ,
    earthRes.state,
    anchorRes?.state
  );

  let orbitalRadius = Math.hypot(projected.x - originX, projected.z - originZ);
  let angleRad = bodyRes.state.eclipticAngleRad;
  if (body.id === 'moon') {
    const earthProj = projectHeliocentricSIToScene(
      'earth',
      earthRes.state,
      scaleMode,
      originX,
      originZ,
      earthRes.state,
      anchorRes?.state
    );
    orbitalRadius = Math.hypot(projected.x - earthProj.x, projected.z - earthProj.z);
    angleRad = Math.atan2(projected.z - earthProj.z, projected.x - earthProj.x);
  }

  return {
    x: projected.x,
    y: projected.y,
    z: projected.z,
    orbitalRadius,
    angleRad,
    siPosM: { xM: bodyRes.state.xM, yM: bodyRes.state.yM, zM: bodyRes.state.zM },
    provenance: bodyRes.provenance,
  };
}

export function getLiveSolarTargetPosition(
  targetId: SpaceTargetId,
  epochYears = 0,
  scaleMode: SolarScaleMode = 'exploration',
  originX = SOLAR_SUN_ORIGIN_X,
  originZ = SOLAR_SUN_ORIGIN_Z,
  localAnchorId = 'earth'
): { x: number; y: number; z: number; radius: number } {
  const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
  const moonSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'moon')!;
  const marsSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'mars')!;

  const earthPos = computeKeplerBodyPosition(earthSpec, epochYears, scaleMode, originX, originZ, localAnchorId);
  const moonPos = computeKeplerBodyPosition(moonSpec, epochYears, scaleMode, originX, originZ, localAnchorId);

  if (targetId === 'moon') {
    return {
      x: moonPos.x,
      y: moonPos.y,
      z: moonPos.z,
      radius: getBodyVisualRadiusUnits('moon', scaleMode),
    };
  }

  if (targetId === 'relay-orbit') {
    const t = scaleMode === 'scientific' ? 0.85 : 0.68;
    return {
      x: earthPos.x + (moonPos.x - earthPos.x) * t,
      y: earthPos.y + (moonPos.y - earthPos.y) * t,
      z: earthPos.z + (moonPos.z - earthPos.z) * t,
      radius: scaleMode === 'scientific' ? 0.14 : scaleMode === 'local' ? 1.6 : 1.4,
    };
  }

  if (targetId === 'gateway') {
    const dx = moonPos.x - earthPos.x;
    const dz = moonPos.z - earthPos.z;
    const len = Math.max(0.001, Math.hypot(dx, dz));
    const offset = scaleMode === 'scientific' ? 0.35 : scaleMode === 'local' ? 6.5 : 2.6;
    return {
      x: moonPos.x + (-dz / len) * offset,
      y: moonPos.y,
      z: moonPos.z + (dx / len) * offset,
      radius: scaleMode === 'scientific' ? 0.12 : scaleMode === 'local' ? 1.5 : 1.3,
    };
  }

  const marsPos = computeKeplerBodyPosition(marsSpec, epochYears, scaleMode, originX, originZ, localAnchorId);
  return {
    x: marsPos.x,
    y: marsPos.y,
    z: marsPos.z,
    radius: getBodyVisualRadiusUnits('mars', scaleMode),
  };
}

export function getShipSpawnForMission(
  missionId: CampaignMissionId,
  epochYears = 0,
  scaleMode: SolarScaleMode = 'exploration',
  localAnchorId = 'earth'
): { x: number; z: number } {
  const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
  const earthPos = computeKeplerBodyPosition(earthSpec, epochYears, scaleMode, SOLAR_SUN_ORIGIN_X, SOLAR_SUN_ORIGIN_Z, localAnchorId);
  const moonPos = getLiveSolarTargetPosition('moon', epochYears, scaleMode, SOLAR_SUN_ORIGIN_X, SOLAR_SUN_ORIGIN_Z, localAnchorId);

  if (missionId === 'artemis-4') {
    const offset = scaleMode === 'scientific' ? 0.32 : scaleMode === 'local' ? 6.5 : 2.6;
    return { x: moonPos.x - offset * 0.4, z: moonPos.z + offset };
  }

  const dx = moonPos.x - earthPos.x;
  const dz = moonPos.z - earthPos.z;
  const len = Math.max(0.001, Math.hypot(dx, dz));
  const offset = scaleMode === 'scientific' ? 0.28 : scaleMode === 'local' ? 9.5 : 3.2;
  // Place Orion on the opposite side of Earth from the Moon so cislunar transit is clean and unobstructed
  return {
    x: earthPos.x - (dx / len) * offset,
    z: earthPos.z - (dz / len) * offset,
  };
}

/**
 * Reprojects spacecraft (x, z) cleanly when switching between `exploration`, `scientific`, and `local` modes
 * so Orion never teleports away from its active target or orbital body.
 */
export function reprojectShipBetweenScaleModes(
  shipX: number,
  shipZ: number,
  fromMode: SolarScaleMode,
  toMode: SolarScaleMode,
  epochYears: number,
  targetId: SpaceTargetId,
  navBodyId?: string | null,
  localAnchorId = 'earth'
): { x: number; z: number } {
  if (fromMode === toMode) return { x: shipX, z: shipZ };
  const navSpec = navBodyId ? SOLAR_SYSTEM_BODIES.find((b) => b.id === navBodyId) : undefined;
  const fromAnchor = navSpec
    ? computeKeplerBodyPosition(navSpec, epochYears, fromMode, SOLAR_SUN_ORIGIN_X, SOLAR_SUN_ORIGIN_Z, localAnchorId)
    : getLiveSolarTargetPosition(targetId, epochYears, fromMode, SOLAR_SUN_ORIGIN_X, SOLAR_SUN_ORIGIN_Z, localAnchorId);
  const toAnchor = navSpec
    ? computeKeplerBodyPosition(navSpec, epochYears, toMode, SOLAR_SUN_ORIGIN_X, SOLAR_SUN_ORIGIN_Z, localAnchorId)
    : getLiveSolarTargetPosition(targetId, epochYears, toMode, SOLAR_SUN_ORIGIN_X, SOLAR_SUN_ORIGIN_Z, localAnchorId);

  const fromBodyR = Math.max(0.05, getBodyVisualRadiusUnits(navSpec?.id ?? (targetId === 'mars' ? 'mars' : 'moon'), fromMode));
  const toBodyR = Math.max(0.05, getBodyVisualRadiusUnits(navSpec?.id ?? (targetId === 'mars' ? 'mars' : 'moon'), toMode));
  const relScale = toBodyR / fromBodyR;

  return {
    x: toAnchor.x + (shipX - fromAnchor.x) * relScale,
    z: toAnchor.z + (shipZ - fromAnchor.z) * relScale,
  };
}

export function computeWeightOnBodyKg(earthWeightKg: number, gravityG: number): number {
  return Math.round(earthWeightKg * gravityG * 10) / 10;
}
