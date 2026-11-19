import {
  PLANETARY_CATALOG_SI,
  SI,
  type DataProvenance,
  type KeplerianElementsSI,
  type PlanetaryPhysicalEntry,
} from './planetaryCatalog';
import type { HorizonsBodyStateSI } from './jplHorizons';

export type SolarScaleMode = 'exploration' | 'scientific' | 'local';

export type OrbitalTrajectoryRegime =
  | 'Circular Orbit'
  | 'Elliptical Orbit'
  | 'Transfer Trajectory'
  | 'Hyperbolic Escape'
  | 'Rendezvous'
  | 'Flyby'
  | 'Landing Trajectory'
  | 'Station-Keeping';

export interface CartesianStateSI {
  /** Position in meters (J2000 Ecliptic, +Y = Ecliptic North, XZ = Ecliptic Plane) */
  xM: number;
  yM: number;
  zM: number;
  /** Velocity in m/s */
  vxMs: number;
  vyMs: number;
  vzMs: number;
  /** Radial distance to parent body in meters */
  rM: number;
  /** True anomaly nu in radians */
  trueAnomalyRad: number;
  /** Eccentric anomaly E in radians */
  eccentricAnomalyRad: number;
  /** Orbital angle projected onto ecliptic XZ plane */
  eclipticAngleRad: number;
  /** Specific orbital energy in J/kg */
  specificEnergyJKg: number;
}

export interface ScaleProjectionConfig {
  mode: SolarScaleMode;
  /** Optional local body frame center in SI meters (used for 'local' mode) */
  localAnchorId?: string;
}

/**
 * Exploration Mode visual radii (compressed spacing with strict orbital ordering and Moon kept well within Venus..Mars corridor).
 */
export const EXPLORATION_VISUAL_LAYOUT: Record<
  string,
  { orbitRadiusUnits: number; bodyRadiusUnits: number }
> = {
  sun: { orbitRadiusUnits: 0, bodyRadiusUnits: 256.6151 },
  mercury: { orbitRadiusUnits: 820.0, bodyRadiusUnits: 0.8999 },
  venus: { orbitRadiusUnits: 1100.0, bodyRadiusUnits: 2.2323 },
  earth: { orbitRadiusUnits: 1450.0, bodyRadiusUnits: 2.35 },
  moon: { orbitRadiusUnits: 5.8, bodyRadiusUnits: 0.6409 },
  mars: { orbitRadiusUnits: 1950.0, bodyRadiusUnits: 1.2502 },
  ceres: { orbitRadiusUnits: 2600.0, bodyRadiusUnits: 0.1733 },
  jupiter: { orbitRadiusUnits: 3800.0, bodyRadiusUnits: 25.7873 },
  saturn: { orbitRadiusUnits: 5200.0, bodyRadiusUnits: 21.478 },
  uranus: { orbitRadiusUnits: 7000.0, bodyRadiusUnits: 9.354 },
  neptune: { orbitRadiusUnits: 8800.0, bodyRadiusUnits: 9.081 },
  pluto: { orbitRadiusUnits: 10500.0, bodyRadiusUnits: 0.438 },
  eris: { orbitRadiusUnits: 13500.0, bodyRadiusUnits: 0.429 },
  halley: { orbitRadiusUnits: 6500.0, bodyRadiusUnits: 0.45 },
  bennu: { orbitRadiusUnits: 1550.0, bodyRadiusUnits: 0.12 },
};

/**
 * Scientific Mode calibration:
 * - Distances use linear true AU scaling: 1 AU = 160 scene units (so Earth = 160u, Jupiter = 832u, Pluto = 6,317u)
 * - Body radii use TRUE physical radius ratios relative to Earth (`R_earth = 0.032u`):
 *     Sun   = 109.2 * 0.032 = 3.494u
 *     Jupiter = 10.97 * 0.032 = 0.351u
 *     Saturn  = 9.14  * 0.032 = 0.292u
 *     Moon orbit around Earth = 384,400 km / 6,371 km = 60.336 * R_earth = 1.931u
 *   Camera-relative floating-origin rendering & dynamic near plane allow zooming seamlessly right up to any world.
 */
export const SCIENTIFIC_UNITS_PER_AU = 160.0;
export const SCIENTIFIC_EARTH_RADIUS_UNITS = 0.032;

/**
 * Local Mission Mode calibration:
 * - 1 scene unit = 1,000 km (1,000,000 m), centered on the active local mission body (Earth, Moon, or Mars).
 *   Earth = 6.371u, Moon = 1.737u (384.4u from Earth), Mars = 3.390u.
 */
export const LOCAL_UNITS_PER_METER = 1 / 1_000_000;

/**
 * Solves Kepler's Equation M = E - e * sin(E) for Eccentric Anomaly E in radians.
 * Uses Newton-Raphson with Halley-style step clamping for high eccentricities (0 <= e < 0.999).
 */
export function solveEccentricAnomaly(meanAnomalyRad: number, eccentricity: number): number {
  const twoPi = Math.PI * 2;
  let M = meanAnomalyRad % twoPi;
  if (M < 0) M += twoPi;
  if (M > Math.PI) M -= twoPi;

  if (eccentricity < 1e-8) return M;

  // Good initial guess across low and high eccentricities
  let E = eccentricity < 0.8 ? M + eccentricity * Math.sin(M) : Math.PI * Math.sign(M || 1);
  for (let iter = 0; iter < 32; iter++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - eccentricity * sinE - M;
    if (Math.abs(f) < 1e-12) break;
    const fp = 1 - eccentricity * cosE;
    const fpp = eccentricity * sinE;
    // Halley step prevents overshoot near e -> 1
    const delta = (2 * f * fp) / Math.max(1e-12, 2 * fp * fp - f * fpp);
    E -= delta;
  }
  return E;
}

/**
 * Converts J2000 Keplerian elements to 3D J2000 Ecliptic Cartesian state in SI meters & m/s.
 * Right-handed Three.js ecliptic convention:
 *   Three.X = X_ecliptic, Three.Y = Z_ecliptic (ecliptic North), Three.Z = -Y_ecliptic
 */
export function keplerianToCartesianSI(
  elements: KeplerianElementsSI,
  muCenterM3S2: number,
  dtFromJ2000Seconds: number
): CartesianStateSI {
  const {
    semiMajorAxisM: a,
    eccentricity: e,
    inclinationRad: inc,
    ascendingNodeRad: omegaNode,
    argPeriapsisRad: argPeri,
    meanAnomalyJ2000Rad: m0,
  } = elements;

  const meanMotion = Math.sqrt(muCenterM3S2 / Math.pow(a, 3));
  const M = m0 + meanMotion * dtFromJ2000Seconds;
  const E = solveEccentricAnomaly(M, e);

  const cosE = Math.cos(E);
  const sinE = Math.sin(E);
  const sqrtOneMinusE2 = Math.sqrt(Math.max(1e-12, 1 - e * e));

  const rM = a * (1 - e * cosE);
  const trueAnomalyRad = Math.atan2(sqrtOneMinusE2 * sinE, cosE - e);

  // Perifocal position & velocity
  const xOrb = a * (cosE - e);
  const yOrb = a * sqrtOneMinusE2 * sinE;
  const velFactor = Math.sqrt(muCenterM3S2 * a) / Math.max(1, rM);
  const vxOrb = -velFactor * sinE;
  const vyOrb = velFactor * sqrtOneMinusE2 * cosE;

  // Euler rotation from perifocal frame to J2000 Ecliptic frame (Omega, i, omega)
  const cosO = Math.cos(omegaNode);
  const sinO = Math.sin(omegaNode);
  const cosI = Math.cos(inc);
  const sinI = Math.sin(inc);
  const cosW = Math.cos(argPeri);
  const sinW = Math.sin(argPeri);

  const px = cosO * cosW - sinO * sinW * cosI;
  const py = sinO * cosW + cosO * sinW * cosI;
  const pz = sinW * sinI;

  const qx = -cosO * sinW - sinO * cosW * cosI;
  const qy = -sinO * sinW + cosO * cosW * cosI;
  const qz = cosW * sinI;

  const xEcl = px * xOrb + qx * yOrb;
  const yEcl = py * xOrb + qy * yOrb;
  const zEcl = pz * xOrb + qz * yOrb;

  const vxEcl = px * vxOrb + qx * vyOrb;
  const vyEcl = py * vxOrb + qy * vyOrb;
  const vzEcl = pz * vxOrb + qz * vyOrb;

  // Map J2000 Ecliptic -> Three.js right-handed space: (X, Z, -Y)
  const xM = xEcl;
  const yM = zEcl;
  const zM = -yEcl;
  const vxMs = vxEcl;
  const vyMs = vzEcl;
  const vzMs = -vyEcl;

  const v2 = vxMs * vxMs + vyMs * vyMs + vzMs * vzMs;
  const specificEnergyJKg = 0.5 * v2 - muCenterM3S2 / Math.max(1, rM);

  return {
    xM,
    yM,
    zM,
    vxMs,
    vyMs,
    vzMs,
    rM,
    trueAnomalyRad,
    eccentricAnomalyRad: E,
    eclipticAngleRad: Math.atan2(zM, xM),
    specificEnergyJKg,
  };
}

/**
 * Computes full heliocentric SI Cartesian state of any catalog body at `epochYearsFromJ2000`,
 * optionally blending with live JPL Horizons state vectors when cached at t ≈ epoch.
 */
export function computeBodyCartesianSI(
  bodyId: string,
  epochYearsFromJ2000: number,
  horizonsVectors?: Record<string, HorizonsBodyStateSI> | null
): {
  state: CartesianStateSI;
  provenance: DataProvenance;
} {
  const entry: PlanetaryPhysicalEntry | undefined = PLANETARY_CATALOG_SI[bodyId];
  if (!entry || bodyId === 'sun' || !entry.orbitalElements) {
    return {
      state: {
        xM: 0,
        yM: 0,
        zM: 0,
        vxMs: 0,
        vyMs: 0,
        vzMs: 0,
        rM: 0,
        trueAnomalyRad: 0,
        eccentricAnomalyRad: 0,
        eclipticAngleRad: 0,
        specificEnergyJKg: 0,
      },
      provenance: 'REAL NASA/JPL DATA',
    };
  }

  const dtSec = epochYearsFromJ2000 * SI.JULIAN_YEAR_S;

  // If Moon, solve geocentric orbit around Earth and add Earth's heliocentric vector
  // Two-body Earth-Moon standard gravitational parameter GM_total = GM_Earth + GM_Moon (27.32166 day sidereal period)
  if (entry.parentBodyId === 'earth') {
    const earthRes = computeBodyCartesianSI('earth', epochYearsFromJ2000, horizonsVectors);
    const earthMoonMu = PLANETARY_CATALOG_SI.earth.muM3S2 + PLANETARY_CATALOG_SI.moon.muM3S2;
    const moonRel = keplerianToCartesianSI(entry.orbitalElements, earthMoonMu, dtSec);
    return {
      state: {
        xM: earthRes.state.xM + moonRel.xM,
        yM: earthRes.state.yM + moonRel.yM,
        zM: earthRes.state.zM + moonRel.zM,
        vxMs: earthRes.state.vxMs + moonRel.vxMs,
        vyMs: earthRes.state.vyMs + moonRel.vyMs,
        vzMs: earthRes.state.vzMs + moonRel.vzMs,
        rM: moonRel.rM,
        trueAnomalyRad: moonRel.trueAnomalyRad,
        eccentricAnomalyRad: moonRel.eccentricAnomalyRad,
        eclipticAngleRad: Math.atan2(moonRel.zM, moonRel.xM),
        specificEnergyJKg: moonRel.specificEnergyJKg,
      },
      provenance: 'SCIENTIFIC MODEL',
    };
  }

  // If live Horizons state is available near epoch 0 (without scrub offset), seed exact live vector
  const hv = horizonsVectors?.[bodyId];
  if (hv && hv.provenance === 'REAL NASA/JPL DATA' && Math.abs(epochYearsFromJ2000) < 1e-4 && (hv.posM.x !== 0 || hv.posM.z !== 0)) {
    const rM = Math.hypot(hv.posM.x, hv.posM.y, hv.posM.z);
    const v2 = hv.velMs.x * hv.velMs.x + hv.velMs.y * hv.velMs.y + hv.velMs.z * hv.velMs.z;
    const muSun = PLANETARY_CATALOG_SI.sun.muM3S2;
    return {
      state: {
        xM: hv.posM.x,
        yM: hv.posM.y,
        zM: hv.posM.z,
        vxMs: hv.velMs.x,
        vyMs: hv.velMs.y,
        vzMs: hv.velMs.z,
        rM,
        trueAnomalyRad: 0,
        eccentricAnomalyRad: 0,
        eclipticAngleRad: Math.atan2(hv.posM.z, hv.posM.x),
        specificEnergyJKg: 0.5 * v2 - muSun / Math.max(1, rM),
      },
      provenance: 'REAL NASA/JPL DATA',
    };
  }

  const sunMu = PLANETARY_CATALOG_SI.sun.muM3S2;
  return {
    state: keplerianToCartesianSI(entry.orbitalElements, sunMu, dtSec),
    provenance: 'SCIENTIFIC MODEL',
  };
}

/**
 * Samples full closed 3D elliptical orbit path in SI meters around parent body.
 */
export function sampleKeplerOrbitPointsSI(
  bodyId: string,
  segments = 192
): Array<{ xM: number; yM: number; zM: number }> {
  const entry = PLANETARY_CATALOG_SI[bodyId];
  if (!entry || !entry.orbitalElements) return [];
  const mu =
    entry.parentBodyId === 'earth'
      ? PLANETARY_CATALOG_SI.earth.muM3S2
      : PLANETARY_CATALOG_SI.sun.muM3S2;
  const periodS =
    entry.siderealOrbitPeriodS > 0
      ? entry.siderealOrbitPeriodS
      : 2 * Math.PI * Math.sqrt(Math.pow(entry.orbitalElements.semiMajorAxisM, 3) / mu);

  const pts: Array<{ xM: number; yM: number; zM: number }> = [];
  for (let i = 0; i <= segments; i++) {
    const frac = i / segments;
    const st = keplerianToCartesianSI(entry.orbitalElements, mu, frac * periodS);
    pts.push({ xM: st.xM, yM: st.yM, zM: st.zM });
  }
  return pts;
}

/**
 * Visual body radius in Three.js scene units for the active presentation mode.
 */
export function getBodyVisualRadiusUnits(bodyId: string, mode: SolarScaleMode): number {
  const entry = PLANETARY_CATALOG_SI[bodyId];
  if (mode === 'scientific') {
    if (!entry) return SCIENTIFIC_EARTH_RADIUS_UNITS;
    // Single Convention: Volumetric Mean Radius (NASA/JPL Solar System Dynamics)
    const ratio = entry.volumetricMeanRadiusM / PLANETARY_CATALOG_SI.earth.volumetricMeanRadiusM;
    // Halley nucleus (5.5km) would be 0.00003u — floor to tiny visible comet coma marker in scientific overview
    return Math.max(0.004, ratio * SCIENTIFIC_EARTH_RADIUS_UNITS);
  }
  if (mode === 'local') {
    if (!entry) return 1.0;
    return Math.max(0.015, entry.volumetricMeanRadiusM * LOCAL_UNITS_PER_METER);
  }
  // Exploration / Educational mode: Single Convention: Volumetric Mean Radius (Earth base = 2.35 units)
  if (entry) {
    const ratio = entry.volumetricMeanRadiusM / PLANETARY_CATALOG_SI.earth.volumetricMeanRadiusM;
    return Number((ratio * 2.35).toFixed(4));
  }
  return EXPLORATION_VISUAL_LAYOUT[bodyId]?.bodyRadiusUnits ?? 1.5;
}

/**
 * Projects a heliocentric SI position vector (meters) into Three.js scene units
 * according to the active scale mode (`exploration`, `scientific`, or `local`).
 */
export function projectHeliocentricSIToScene(
  bodyId: string,
  siPosM: { xM: number; yM: number; zM: number },
  mode: SolarScaleMode,
  originX = 0,
  originZ = 0,
  earthSiPosM?: { xM: number; yM: number; zM: number },
  localAnchorSiPosM?: { xM: number; yM: number; zM: number }
): { x: number; y: number; z: number } {
  if (mode === 'local') {
    const anchor = localAnchorSiPosM ?? earthSiPosM ?? { xM: 0, yM: 0, zM: 0 };
    return {
      x: (siPosM.xM - anchor.xM) * LOCAL_UNITS_PER_METER,
      y: (siPosM.yM - anchor.yM) * LOCAL_UNITS_PER_METER,
      z: (siPosM.zM - anchor.zM) * LOCAL_UNITS_PER_METER,
    };
  }

  if (mode === 'scientific') {
    if (bodyId === 'moon' && earthSiPosM) {
      // Preserve true 60.336 R_earth separation around Earth matching Scientific Earth radius
      const dxM = siPosM.xM - earthSiPosM.xM;
      const dyM = siPosM.yM - earthSiPosM.yM;
      const dzM = siPosM.zM - earthSiPosM.zM;
      const earthScene = projectHeliocentricSIToScene('earth', earthSiPosM, 'scientific', originX, originZ);
      const rEarthM = PLANETARY_CATALOG_SI.earth.meanRadiusM;
      return {
        x: earthScene.x + (dxM / rEarthM) * SCIENTIFIC_EARTH_RADIUS_UNITS,
        y: earthScene.y + (dyM / rEarthM) * SCIENTIFIC_EARTH_RADIUS_UNITS,
        z: earthScene.z + (dzM / rEarthM) * SCIENTIFIC_EARTH_RADIUS_UNITS,
      };
    }
    const factor = SCIENTIFIC_UNITS_PER_AU / SI.AU_M;
    return {
      x: originX + siPosM.xM * factor,
      y: siPosM.yM * factor,
      z: originZ + siPosM.zM * factor,
    };
  }

  // Exploration Mode: compressed monotonic radial spacing while preserving true 3D orbital angles & inclination ratios
  if (bodyId === 'moon' && earthSiPosM) {
    const earthScene = projectHeliocentricSIToScene('earth', earthSiPosM, 'exploration', originX, originZ);
    const dxM = siPosM.xM - earthSiPosM.xM;
    const dyM = siPosM.yM - earthSiPosM.yM;
    const dzM = siPosM.zM - earthSiPosM.zM;
    const rGeoM = Math.max(1, Math.hypot(dxM, dyM, dzM));
    const aMoonM = PLANETARY_CATALOG_SI.moon.orbitalElements!.semiMajorAxisM;
    const moonR = EXPLORATION_VISUAL_LAYOUT.moon.orbitRadiusUnits * (rGeoM / aMoonM);
    return {
      x: earthScene.x + (dxM / rGeoM) * moonR,
      y: earthScene.y + (dyM / rGeoM) * moonR,
      z: earthScene.z + (dzM / rGeoM) * moonR,
    };
  }

  const entry = PLANETARY_CATALOG_SI[bodyId];
  const rSi = Math.hypot(siPosM.xM, siPosM.yM, siPosM.zM);
  if (rSi < 1 || !entry?.orbitalElements) {
    return { x: originX, y: 0, z: originZ };
  }
  const baseVis = EXPLORATION_VISUAL_LAYOUT[bodyId]?.orbitRadiusUnits ?? 50;
  const aM = entry.orbitalElements.semiMajorAxisM;
  const visR = baseVis * (rSi / aM);
  const scale = visR / rSi;
  return {
    x: originX + siPosM.xM * scale,
    y: siPosM.yM * scale * 0.65,
    z: originZ + siPosM.zM * scale,
  };
}

/**
 * Classifies spacecraft trajectory regime strictly from physical state relative to active gravity well / target.
 */
export function classifySpacecraftTrajectory(params: {
  speedUnitsPerSec: number;
  radialVelUnitsPerSec: number;
  tangentialVelUnitsPerSec: number;
  distanceToTargetUnits: number;
  targetBodyRadiusUnits: number;
  autoPilot: boolean;
  dockedOrStationKeeping: boolean;
  eccentricityEstimate?: number;
  specificEnergyJKg?: number;
  isEscapingWell?: boolean;
}): OrbitalTrajectoryRegime {
  if (params.dockedOrStationKeeping) return 'Station-Keeping';
  if (
    params.isEscapingWell ||
    (typeof params.specificEnergyJKg === 'number' &&
      params.specificEnergyJKg >= 0 &&
      params.speedUnitsPerSec > 0.6)
  ) {
    return 'Hyperbolic Escape';
  }
  if (params.distanceToTargetUnits <= params.targetBodyRadiusUnits + 3.0) {
    if (params.speedUnitsPerSec < 1.2) return 'Rendezvous';
    if (params.radialVelUnitsPerSec < -0.5) return 'Landing Trajectory';
    return 'Flyby';
  }
  const ecc = params.eccentricityEstimate ?? 0.05;
  if (params.autoPilot || Math.abs(params.radialVelUnitsPerSec) > Math.abs(params.tangentialVelUnitsPerSec) * 0.35) {
    return 'Transfer Trajectory';
  }
  return ecc < 0.08 ? 'Circular Orbit' : 'Elliptical Orbit';
}

/**
 * Computes exact circular orbital speed v = sqrt(mu / r) in SI m/s.
 */
export function computeCircularOrbitVelocity(muM3S2: number, radiusM: number): number {
  if (radiusM <= 0) return 0;
  return Math.sqrt(muM3S2 / radiusM);
}

/**
 * Computes orbital period T = 2 * pi * sqrt(r^3 / mu) in SI seconds.
 */
export function computeOrbitPeriodSeconds(muM3S2: number, radiusM: number): number {
  if (radiusM <= 0 || muM3S2 <= 0) return 0;
  return 2 * Math.PI * Math.sqrt(Math.pow(radiusM, 3) / muM3S2);
}

