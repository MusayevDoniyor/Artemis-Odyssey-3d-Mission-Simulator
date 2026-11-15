export type DataProvenance =
  | 'REAL NASA/JPL DATA'
  | 'SCIENTIFIC MODEL'
  | 'VISUAL REPRESENTATION'
  | 'SIMULATED GAMEPLAY';

export interface KeplerianElementsSI {
  /** Semi-major axis in meters */
  semiMajorAxisM: number;
  /** Orbital eccentricity (0 <= e < 1; comets may approach 0.967) */
  eccentricity: number;
  /** Inclination to J2000 ecliptic (or Earth-Moon Laplace plane for Moon) in radians */
  inclinationRad: number;
  /** Longitude of ascending node (Omega) in radians */
  ascendingNodeRad: number;
  /** Argument of periapsis (omega) in radians */
  argPeriapsisRad: number;
  /** Mean anomaly at J2000 epoch (M0) in radians */
  meanAnomalyJ2000Rad: number;
}

export interface PlanetaryPhysicalEntry {
  id: string;
  name: string;
  jplId: string;
  parentBodyId: 'sun' | 'earth' | null;
  category: 'star' | 'planet' | 'moon' | 'dwarf' | 'comet' | 'asteroid';
  /** Mean volumetric radius in SI meters (JPL Planetary Physical Parameters) */
  meanRadiusM: number;
  /** Equatorial radius in SI meters */
  equatorialRadiusM: number;
  /** Mass in SI kilograms */
  massKg: number;
  /** Bulk density in kg/m^3 */
  densityKgM3: number;
  /** Standard gravitational parameter GM in m^3/s^2 */
  muM3S2: number;
  /** Equatorial/reference surface gravity in m/s^2 */
  surfaceGravityMs2: number;
  /** Sidereal rotation period in seconds (negative = retrograde) */
  siderealRotationPeriodS: number;
  /** Axial obliquity to orbit in radians */
  axialTiltRad: number;
  /** Sidereal orbital period in seconds (0 for Sun) */
  siderealOrbitPeriodS: number;
  /** Geometric albedo (dimensionless 0..1) */
  geometricAlbedo: number;
  orbitalElements: KeplerianElementsSI | null;
  provenance: DataProvenance;
  sourceCitation: string;
}

export interface SpacecraftSpecSI {
  id: string;
  name: string;
  heightM: number;
  diameterM: number;
  wingspanM: number;
  dryMassKg: number;
  propellantMassKg: number;
  wetMassKg: number;
  thrustN: number;
  ispVacuumS: number;
  ispSeaLevelS?: number;
  provenance: DataProvenance;
  approximationNote?: string;
  sourceCitation: string;
}

export const SI = {
  G: 6.67430e-11,
  G0: 9.80665,
  AU_M: 149_597_870_700,
  SPEED_OF_LIGHT_MS: 299_792_458,
  DAY_S: 86_400,
  JULIAN_YEAR_S: 365.25 * 86_400,
  DEG_TO_RAD: Math.PI / 180,
  RAD_TO_DEG: 180 / Math.PI,
} as const;

const D2R = SI.DEG_TO_RAD;

/**
 * Single source of truth for Solar System planetary physical & J2000 orbital constants in strict SI units.
 * Primary source: NASA/JPL Solar System Dynamics — Planetary Physical Parameters (ssd.jpl.nasa.gov/planets/phys_par.html)
 * and JPL Standish J2000 Keplerian Elements (1800 AD - 2050 AD).
 */
export const PLANETARY_CATALOG_SI: Record<string, PlanetaryPhysicalEntry> = {
  sun: {
    id: 'sun',
    name: 'Sun',
    jplId: '10',
    parentBodyId: null,
    category: 'star',
    meanRadiusM: 695_700_000,
    equatorialRadiusM: 696_340_000,
    massKg: 1.98847e30,
    densityKgM3: 1408,
    muM3S2: 1.3271244004193938e20,
    surfaceGravityMs2: 274.0,
    siderealRotationPeriodS: 25.05 * SI.DAY_S,
    axialTiltRad: 7.25 * D2R,
    siderealOrbitPeriodS: 0,
    geometricAlbedo: 0,
    orbitalElements: null,
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA/JPL Solar System Dynamics Physical Parameters',
  },
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    jplId: '199',
    parentBodyId: 'sun',
    category: 'planet',
    meanRadiusM: 2_439_700,
    equatorialRadiusM: 2_440_500,
    massKg: 3.3011e23,
    densityKgM3: 5427,
    muM3S2: 2.203209e13,
    surfaceGravityMs2: 3.70,
    siderealRotationPeriodS: 58.6462 * SI.DAY_S,
    axialTiltRad: 0.034 * D2R,
    siderealOrbitPeriodS: 87.9691 * SI.DAY_S,
    geometricAlbedo: 0.142,
    orbitalElements: {
      semiMajorAxisM: 0.38709927 * SI.AU_M,
      eccentricity: 0.20563593,
      inclinationRad: 7.00497902 * D2R,
      ascendingNodeRad: 48.33076593 * D2R,
      argPeriapsisRad: (77.45779628 - 48.33076593) * D2R,
      meanAnomalyJ2000Rad: (252.25032350 - 77.45779628) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Planetary Physical Parameters & J2000 Keplerian Elements',
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    jplId: '299',
    parentBodyId: 'sun',
    category: 'planet',
    meanRadiusM: 6_051_800,
    equatorialRadiusM: 6_051_800,
    massKg: 4.8675e24,
    densityKgM3: 5243,
    muM3S2: 3.24858592e14,
    surfaceGravityMs2: 8.87,
    siderealRotationPeriodS: -243.025 * SI.DAY_S, // Retrograde rotation
    axialTiltRad: 177.36 * D2R,
    siderealOrbitPeriodS: 224.701 * SI.DAY_S,
    geometricAlbedo: 0.689,
    orbitalElements: {
      semiMajorAxisM: 0.72333566 * SI.AU_M,
      eccentricity: 0.00677672,
      inclinationRad: 3.39467605 * D2R,
      ascendingNodeRad: 76.67984255 * D2R,
      argPeriapsisRad: (131.60246718 - 76.67984255) * D2R,
      meanAnomalyJ2000Rad: (181.97909950 - 131.60246718) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Planetary Physical Parameters & J2000 Keplerian Elements',
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    jplId: '399',
    parentBodyId: 'sun',
    category: 'planet',
    meanRadiusM: 6_371_000,
    equatorialRadiusM: 6_378_137,
    massKg: 5.97219e24,
    densityKgM3: 5514,
    muM3S2: 3.986004418e14,
    surfaceGravityMs2: 9.80665,
    siderealRotationPeriodS: 86_164.0905, // 23h 56m 4.09s
    axialTiltRad: 23.4392911 * D2R,
    siderealOrbitPeriodS: 365.256363 * SI.DAY_S,
    geometricAlbedo: 0.367,
    orbitalElements: {
      semiMajorAxisM: 1.00000261 * SI.AU_M,
      eccentricity: 0.01671123,
      inclinationRad: 0.00005 * D2R,
      ascendingNodeRad: 0.0 * D2R,
      argPeriapsisRad: 102.93768193 * D2R,
      meanAnomalyJ2000Rad: (100.46457166 - 102.93768193) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'WGS-84 / JPL Planetary Physical Parameters & J2000 Elements',
  },
  moon: {
    id: 'moon',
    name: 'Moon',
    jplId: '301',
    parentBodyId: 'earth',
    category: 'moon',
    meanRadiusM: 1_737_400,
    equatorialRadiusM: 1_738_100,
    massKg: 7.342e22,
    densityKgM3: 3344,
    muM3S2: 4.9048695e12,
    surfaceGravityMs2: 1.622,
    siderealRotationPeriodS: 27.321661 * SI.DAY_S, // Tidally locked
    axialTiltRad: 6.687 * D2R, // To lunar orbit plane (1.54 deg to ecliptic)
    siderealOrbitPeriodS: 27.321661 * SI.DAY_S,
    geometricAlbedo: 0.12,
    orbitalElements: {
      semiMajorAxisM: 384_400_000,
      eccentricity: 0.0549,
      inclinationRad: 5.145 * D2R,
      ascendingNodeRad: 125.08 * D2R,
      argPeriapsisRad: 318.15 * D2R,
      meanAnomalyJ2000Rad: 135.27 * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA Moon Fact Sheet / JPL Horizons Lunar Mean Orbit',
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    jplId: '499',
    parentBodyId: 'sun',
    category: 'planet',
    meanRadiusM: 3_389_500,
    equatorialRadiusM: 3_396_200,
    massKg: 6.4171e23,
    densityKgM3: 3933,
    muM3S2: 4.282837e13,
    surfaceGravityMs2: 3.72076,
    siderealRotationPeriodS: 88_642.6848, // 24h 37m 22.68s
    axialTiltRad: 25.19 * D2R,
    siderealOrbitPeriodS: 686.98 * SI.DAY_S,
    geometricAlbedo: 0.17,
    orbitalElements: {
      semiMajorAxisM: 1.52371034 * SI.AU_M,
      eccentricity: 0.09339410,
      inclinationRad: 1.84969142 * D2R,
      ascendingNodeRad: 49.55953891 * D2R,
      argPeriapsisRad: (336.05637041 - 49.55953891) * D2R,
      meanAnomalyJ2000Rad: (355.44656795 - 336.05637041) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Planetary Physical Parameters & J2000 Keplerian Elements',
  },
  ceres: {
    id: 'ceres',
    name: 'Ceres',
    jplId: '2000001',
    parentBodyId: 'sun',
    category: 'dwarf',
    meanRadiusM: 469_730,
    equatorialRadiusM: 482_600,
    massKg: 9.3835e20,
    densityKgM3: 2162,
    muM3S2: 6.26284e10,
    surfaceGravityMs2: 0.284,
    siderealRotationPeriodS: 9.07417 * 3600,
    axialTiltRad: 4.0 * D2R,
    siderealOrbitPeriodS: 1681.63 * SI.DAY_S,
    geometricAlbedo: 0.09,
    orbitalElements: {
      semiMajorAxisM: 2.7675 * SI.AU_M,
      eccentricity: 0.0758,
      inclinationRad: 10.593 * D2R,
      ascendingNodeRad: 80.305 * D2R,
      argPeriapsisRad: 73.597 * D2R,
      meanAnomalyJ2000Rad: 95.989 * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Small-Body Database (1 Ceres)',
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    jplId: '599',
    parentBodyId: 'sun',
    category: 'planet',
    meanRadiusM: 69_911_000,
    equatorialRadiusM: 71_492_000,
    massKg: 1.8982e27,
    densityKgM3: 1326,
    muM3S2: 1.26686534e17,
    surfaceGravityMs2: 24.79,
    siderealRotationPeriodS: 9.9250 * 3600,
    axialTiltRad: 3.13 * D2R,
    siderealOrbitPeriodS: 4332.589 * SI.DAY_S,
    geometricAlbedo: 0.538,
    orbitalElements: {
      semiMajorAxisM: 5.20288700 * SI.AU_M,
      eccentricity: 0.04838624,
      inclinationRad: 1.30439695 * D2R,
      ascendingNodeRad: 100.47390909 * D2R,
      argPeriapsisRad: (14.72847983 - 100.47390909) * D2R,
      meanAnomalyJ2000Rad: (34.39644051 - 14.72847983) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Planetary Physical Parameters & J2000 Keplerian Elements',
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn',
    jplId: '699',
    parentBodyId: 'sun',
    category: 'planet',
    meanRadiusM: 58_232_000,
    equatorialRadiusM: 60_268_000,
    massKg: 5.6834e26,
    densityKgM3: 687,
    muM3S2: 3.7931187e16,
    surfaceGravityMs2: 10.44,
    siderealRotationPeriodS: 10.656 * 3600,
    axialTiltRad: 26.73 * D2R,
    siderealOrbitPeriodS: 10759.22 * SI.DAY_S,
    geometricAlbedo: 0.499,
    orbitalElements: {
      semiMajorAxisM: 9.53667594 * SI.AU_M,
      eccentricity: 0.05386179,
      inclinationRad: 2.48599187 * D2R,
      ascendingNodeRad: 113.66242448 * D2R,
      argPeriapsisRad: (92.59887831 - 113.66242448) * D2R,
      meanAnomalyJ2000Rad: (49.95424423 - 92.59887831) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Planetary Physical Parameters & J2000 Keplerian Elements',
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus',
    jplId: '799',
    parentBodyId: 'sun',
    category: 'planet',
    meanRadiusM: 25_362_000,
    equatorialRadiusM: 25_559_000,
    massKg: 8.6810e25,
    densityKgM3: 1270,
    muM3S2: 5.793939e15,
    surfaceGravityMs2: 8.69,
    siderealRotationPeriodS: -17.24 * 3600, // Retrograde due to 97.77 deg axial tilt
    axialTiltRad: 97.77 * D2R,
    siderealOrbitPeriodS: 30688.5 * SI.DAY_S,
    geometricAlbedo: 0.488,
    orbitalElements: {
      semiMajorAxisM: 19.18916464 * SI.AU_M,
      eccentricity: 0.04725744,
      inclinationRad: 0.77263783 * D2R,
      ascendingNodeRad: 74.01692503 * D2R,
      argPeriapsisRad: (170.95427630 - 74.01692503) * D2R,
      meanAnomalyJ2000Rad: (313.23810451 - 170.95427630) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Planetary Physical Parameters & J2000 Keplerian Elements',
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune',
    jplId: '899',
    parentBodyId: 'sun',
    category: 'planet',
    meanRadiusM: 24_622_000,
    equatorialRadiusM: 24_764_000,
    massKg: 1.02413e26,
    densityKgM3: 1638,
    muM3S2: 6.836529e15,
    surfaceGravityMs2: 11.15,
    siderealRotationPeriodS: 16.11 * 3600,
    axialTiltRad: 28.32 * D2R,
    siderealOrbitPeriodS: 60195 * SI.DAY_S,
    geometricAlbedo: 0.442,
    orbitalElements: {
      semiMajorAxisM: 30.06992276 * SI.AU_M,
      eccentricity: 0.00859048,
      inclinationRad: 1.77004347 * D2R,
      ascendingNodeRad: 131.78422574 * D2R,
      argPeriapsisRad: (44.96476227 - 131.78422574) * D2R,
      meanAnomalyJ2000Rad: (304.88003 * 1 - 44.96476227) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Planetary Physical Parameters & J2000 Keplerian Elements',
  },
  pluto: {
    id: 'pluto',
    name: 'Pluto',
    jplId: '999',
    parentBodyId: 'sun',
    category: 'dwarf',
    meanRadiusM: 1_188_300,
    equatorialRadiusM: 1_188_300,
    massKg: 1.303e22,
    densityKgM3: 1854,
    muM3S2: 8.71e11,
    surfaceGravityMs2: 0.62,
    siderealRotationPeriodS: -6.38723 * SI.DAY_S, // Retrograde
    axialTiltRad: 122.53 * D2R,
    siderealOrbitPeriodS: 90560 * SI.DAY_S,
    geometricAlbedo: 0.52,
    orbitalElements: {
      semiMajorAxisM: 39.48211675 * SI.AU_M,
      eccentricity: 0.24882730,
      inclinationRad: 17.14001206 * D2R,
      ascendingNodeRad: 110.30393684 * D2R,
      argPeriapsisRad: (224.06891629 - 110.30393684) * D2R,
      meanAnomalyJ2000Rad: (238.92903833 - 224.06891629) * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Planetary Physical Parameters & New Horizons (Pluto)',
  },
  eris: {
    id: 'eris',
    name: 'Eris',
    jplId: '136199',
    parentBodyId: 'sun',
    category: 'dwarf',
    meanRadiusM: 1_163_000,
    equatorialRadiusM: 1_163_000,
    massKg: 1.6466e22,
    densityKgM3: 2430,
    muM3S2: 1.108e12,
    surfaceGravityMs2: 0.82,
    siderealRotationPeriodS: 25.9 * 3600,
    axialTiltRad: 78.0 * D2R,
    siderealOrbitPeriodS: 203_830 * SI.DAY_S,
    geometricAlbedo: 0.96,
    orbitalElements: {
      semiMajorAxisM: 67.864 * SI.AU_M,
      eccentricity: 0.43607,
      inclinationRad: 44.040 * D2R,
      ascendingNodeRad: 35.951 * D2R,
      argPeriapsisRad: 151.639 * D2R,
      meanAnomalyJ2000Rad: 205.989 * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Small-Body Database (136199 Eris)',
  },
  halley: {
    id: 'halley',
    name: "Halley's Comet",
    jplId: '90000030',
    parentBodyId: 'sun',
    category: 'comet',
    meanRadiusM: 5_500, // 11 km mean nucleus diameter
    equatorialRadiusM: 7_500,
    massKg: 2.2e14,
    densityKgM3: 600,
    muM3S2: 1.47e4,
    surfaceGravityMs2: 0.0005,
    siderealRotationPeriodS: 52.8 * 3600,
    axialTiltRad: 35.0 * D2R,
    siderealOrbitPeriodS: 75.32 * SI.JULIAN_YEAR_S,
    geometricAlbedo: 0.04,
    orbitalElements: {
      semiMajorAxisM: 17.834 * SI.AU_M,
      eccentricity: 0.96714,
      inclinationRad: 162.26 * D2R, // Retrograde comet orbit
      ascendingNodeRad: 58.42 * D2R,
      argPeriapsisRad: 111.33 * D2R,
      meanAnomalyJ2000Rad: 38.38 * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'JPL Small-Body Database (1P/Halley)',
  },
  bennu: {
    id: 'bennu',
    name: '101955 Bennu',
    jplId: '2101955',
    parentBodyId: 'sun',
    category: 'asteroid',
    meanRadiusM: 245.03, // 490.06m volumetric mean diameter
    equatorialRadiusM: 255.0,
    massKg: 7.329e10,
    densityKgM3: 1190,
    muM3S2: 4.89,
    surfaceGravityMs2: 0.00006,
    siderealRotationPeriodS: 4.296 * 3600, // 4.296 hours
    axialTiltRad: 177.6 * D2R, // Retrograde rotator
    siderealOrbitPeriodS: 436.604 * SI.DAY_S, // 1.195 years
    geometricAlbedo: 0.046, // B-type carbonaceous asteroid
    orbitalElements: {
      semiMajorAxisM: 1.12639 * SI.AU_M,
      eccentricity: 0.20374,
      inclinationRad: 6.0349 * D2R,
      ascendingNodeRad: 2.0609 * D2R,
      argPeriapsisRad: 66.2231 * D2R,
      meanAnomalyJ2000Rad: 101.7039 * D2R,
    },
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA OSIRIS-REx Mission Archive & JPL Small-Body Database (101955 Bennu)',
  },
};

export const SPACECRAFT_CATALOG_SI: Record<string, SpacecraftSpecSI> = {
  'sls-block1': {
    id: 'sls-block1',
    name: 'Space Launch System (SLS Block 1)',
    heightM: 98.3,
    diameterM: 8.4,
    wingspanM: 16.1, // Across twin 3.71m SRBs mounted flush on 8.4m core
    dryMassKg: 147_500, // Core dry ~85.3t + ICPS dry ~3.5t + Orion ~26.5t + adapters
    propellantMassKg: 2_460_500, // Twin 5-seg SRBs (~1,252t) + Core LH2/LOX (~987t) + ICPS (~29t)
    wetMassKg: 2_608_000,
    thrustN: 39_140_000, // Liftoff: 2x SRB (~31.7 MN) + 4x RS-25 sea-level (~7.44 MN)
    ispVacuumS: 452, // RS-25D/E vacuum Isp (RL10B-2 = 462s)
    ispSeaLevelS: 269, // Composite SLS Block 1 liftoff Isp (SRB 269s + RS-25 366s)
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA SLS Block 1 Reference Guide (nasa.gov/reference/sls-space-launch-system/)',
  },
  'orion-mpcv': {
    id: 'orion-mpcv',
    name: 'Orion MPCV + European Service Module',
    heightM: 8.0, // CM + ESM stacked length
    diameterM: 5.02, // Heatshield outer diameter
    wingspanM: 19.0, // Tip-to-tip X-wing solar arrays
    dryMassKg: 17_200,
    propellantMassKg: 9_300,
    wetMassKg: 26_500,
    thrustN: 26_700, // AJ10-190 OMS main engine
    ispVacuumS: 316,
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA Orion Spacecraft Reference & ESA ESM Specifications',
  },
  gateway: {
    id: 'gateway',
    name: 'Lunar Gateway (PPE + HALO + i-HAB)',
    heightM: 43.0, // Length along stacked modules
    diameterM: 4.5,
    wingspanM: 38.0, // Solar array span (approximation from NASA PPE concept)
    dryMassKg: 40_000,
    propellantMassKg: 5_000,
    wetMassKg: 45_000,
    thrustN: 2.5, // Hall-effect electric propulsion (approximation)
    ispVacuumS: 2600,
    provenance: 'SCIENTIFIC MODEL',
    approximationNote: 'Gateway dimensions/mass combine NASA PPE + HALO + i-HAB published baseline concepts.',
    sourceCitation: 'NASA Lunar Gateway Program Overview',
  },
  'hermes-relay': {
    id: 'hermes-relay',
    name: 'HERMES Lunar Communications Relay',
    heightM: 3.2,
    diameterM: 1.8,
    wingspanM: 9.4,
    dryMassKg: 1_250,
    propellantMassKg: 450,
    wetMassKg: 1_700,
    thrustN: 450,
    ispVacuumS: 300,
    provenance: 'SIMULATED GAMEPLAY',
    approximationNote: 'Fictionalized Deep-Space Relay spacecraft modeled after NASA CapStone / Lunar Trailblazer buses.',
    sourceCitation: 'Artemis Odyssey Mission Design',
  },
  'lunar-lander': {
    id: 'lunar-lander',
    name: 'Artemis Descent Lander',
    heightM: 7.0,
    diameterM: 4.3,
    wingspanM: 9.1,
    dryMassKg: 4_850,
    propellantMassKg: 6_450,
    wetMassKg: 11_300,
    thrustN: 46_700,
    ispVacuumS: 311,
    provenance: 'SCIENTIFIC MODEL',
    approximationNote: 'Propulsion scaled to Apollo LMDE (46.7 kN throttleable) for lunar South Pole descent training.',
    sourceCitation: 'NASA Apollo LMDE / HLS Descent Reference',
  },
  'mars-lander': {
    id: 'mars-lander',
    name: 'Mars 0.38g Powered Descent Vehicle',
    heightM: 7.8,
    diameterM: 4.8,
    wingspanM: 9.4,
    dryMassKg: 5_400,
    propellantMassKg: 6_900,
    wetMassKg: 12_300,
    thrustN: 112_000,
    ispVacuumS: 325,
    provenance: 'SCIENTIFIC MODEL',
    approximationNote: 'Concept Mars lander with quad throttleable methalox engines sized for Jezero Crater 0.38g descent.',
    sourceCitation: 'NASA Mars DRA 5.0 Descent Architecture',
  },
  'viper-rover': {
    id: 'viper-rover',
    name: 'VIPER / Pressurized Science Rover',
    heightM: 2.5,
    diameterM: 1.5,
    wingspanM: 1.5,
    dryMassKg: 450,
    propellantMassKg: 0,
    wetMassKg: 450,
    thrustN: 0,
    ispVacuumS: 0,
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA VIPER Rover Fact Sheet (450 kg, 1.5m x 1.5m x 2.5m)',
  },
  jwst: {
    id: 'jwst',
    name: 'James Webb Space Telescope (JWST)',
    heightM: 8.0,
    diameterM: 6.5, // Primary segmented mirror
    wingspanM: 20.2, // Sunshield 21.2m x 14.2m
    dryMassKg: 6_161,
    propellantMassKg: 300,
    wetMassKg: 6_461,
    thrustN: 110,
    ispVacuumS: 230,
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA/ESA/CSA JWST Mission Overview',
  },
  voyager: {
    id: 'voyager',
    name: 'Voyager Interstellar Probe',
    heightM: 2.5,
    diameterM: 3.7, // HGA dish diameter
    wingspanM: 13.0, // Magnetometer boom
    dryMassKg: 721.9,
    propellantMassKg: 103.6,
    wetMassKg: 825.5,
    thrustN: 0.9,
    ispVacuumS: 210,
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA/JPL Voyager Spacecraft Specifications',
  },
  'saturn-v': {
    id: 'saturn-v',
    name: 'Saturn V (Apollo Lunar Stack)',
    heightM: 110.6,
    diameterM: 10.06,
    wingspanM: 12.0,
    dryMassKg: 185_300,
    propellantMassKg: 2_713_000,
    wetMassKg: 2_970_000,
    thrustN: 34_500_000,
    ispVacuumS: 421,
    ispSeaLevelS: 263,
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'NASA MSFC Saturn V Flight Manual (MSFC-MAN-507)',
  },
  'falcon-9': {
    id: 'falcon-9',
    name: 'Falcon 9 Full Thrust (Block 5)',
    heightM: 70.0,
    diameterM: 3.66,
    wingspanM: 18.0,
    dryMassKg: 26_200,
    propellantMassKg: 518_500,
    wetMassKg: 549_054,
    thrustN: 7_607_000,
    ispVacuumS: 348,
    ispSeaLevelS: 282,
    provenance: 'REAL NASA/JPL DATA',
    sourceCitation: 'SpaceX Falcon 9 Launch Vehicle Payload User’s Guide',
  },
};

export function metersToKm(m: number): number {
  return m / 1000;
}

export function metersToAu(m: number): number {
  return m / SI.AU_M;
}

export function radToDeg(rad: number): number {
  return rad * SI.RAD_TO_DEG;
}

export function secondsToDays(s: number): number {
  return s / SI.DAY_S;
}
