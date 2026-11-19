import { SOLAR_TARGETS } from '../../game/constants';
import {
  computeKeplerBodyPosition,
  getLiveSolarTargetPosition,
  getShipSpawnForMission,
  SOLAR_SUN_ORIGIN_X,
  SOLAR_SUN_ORIGIN_Z,
  SOLAR_SYSTEM_BODIES,
  type SolarScaleMode,
} from '../../game/solarSystemData';
import type {
  CampaignCarryoverState,
  CampaignMissionId,
  InputState,
  ResourceState,
  SpaceFlightState,
  SpaceTargetId,
} from '../../game/types';
import {
  PLANETARY_CATALOG_SI,
  SI,
  metersToAu,
  metersToKm,
} from '../../game/planetaryCatalog';
import {
  classifySpacecraftTrajectory,
  computeBodyCartesianSI,
  getBodyVisualRadiusUnits,
  LOCAL_UNITS_PER_METER,
  SCIENTIFIC_EARTH_RADIUS_UNITS,
  type OrbitalTrajectoryRegime,
} from '../../game/orbitalMechanics';
import { clamp } from '../common/math';

export interface SpaceHandoffState {
  shipX: number;
  shipZ: number;
  vx: number;
  vz: number;
  headingRad?: number;
  orbitalSpeedKmS?: number;
  trajectoryRegime?: OrbitalTrajectoryRegime;
}

/**
 * Generates coordinate points for an inclined Low Earth Parking Orbit (28.5 deg LC-39B).
 */
export function generateEarthParkingOrbitCoordinates(
  earthPos: { x: number; y?: number; z: number },
  radius: number,
  pointsCount = 64
): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const inclRad = 28.5 * (Math.PI / 180);
  const cosI = Math.cos(inclRad);
  const sinI = Math.sin(inclRad);
  const ey = earthPos.y ?? 0;

  for (let i = 0; i <= pointsCount; i++) {
    const theta = (i / pointsCount) * Math.PI * 2;
    const xOrb = radius * Math.cos(theta);
    const zOrb = radius * Math.sin(theta);
    points.push({
      x: earthPos.x + xOrb,
      y: ey + zOrb * sinI,
      z: earthPos.z + zOrb * cosI,
    });
  }
  return points;
}

/**
 * Generates outbound Trans-Lunar Injection (TLI) Keplerian transfer conic arc.
 */
export function generateTliConicCoordinates(
  earthPos: { x: number; y?: number; z: number },
  moonPos: { x: number; y?: number; z: number },
  pointsCount = 64
): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const dx = moonPos.x - earthPos.x;
  const dz = moonPos.z - earthPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return points;

  const ux = dx / dist;
  const uz = dz / dist;
  const nx = -uz;
  const nz = ux;

  const ey = earthPos.y ?? 0;
  const my = moonPos.y ?? 0;

  for (let i = 0; i <= pointsCount; i++) {
    const s = i / pointsCount;
    const bow = Math.sin(s * Math.PI) * (dist * 0.16);
    const yLift = Math.sin(s * Math.PI) * 0.28 + (ey * (1 - s) + my * s);

    points.push({
      x: earthPos.x + ux * (s * dist) + nx * bow,
      y: yLift,
      z: earthPos.z + uz * (s * dist) + nz * bow,
    });
  }
  return points;
}

/**
 * Generates an authentic Cislunar Free-Return trajectory figure-8 loop in synodic frame.
 * Leaves Earth prograde, swings behind Moon far-side at perilune (~110 km),
 * and re-enters Earth's atmospheric corridor.
 */
export function generateCislunarFreeReturnCoordinates(
  earthPos: { x: number; y?: number; z: number },
  moonPos: { x: number; y?: number; z: number },
  moonVisualRadius = 0.5,
  pointsCount = 80
): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const dx = moonPos.x - earthPos.x;
  const dz = moonPos.z - earthPos.z;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return points;

  const ux = dx / dist;
  const uz = dz / dist;
  const nx = -uz;
  const nz = ux;

  const ey = earthPos.y ?? 0;
  const my = moonPos.y ?? 0;

  for (let i = 0; i <= pointsCount; i++) {
    const t = i / pointsCount;
    let longitudinal = 0;
    let lateral = 0;
    let vertical = 0;

    if (t < 0.45) {
      const u = t / 0.45;
      longitudinal = u * (dist - moonVisualRadius * 0.8);
      lateral = Math.sin(u * Math.PI) * (dist * 0.15);
      vertical = Math.sin(u * Math.PI) * 0.22;
    } else if (t <= 0.55) {
      const u = (t - 0.45) / 0.10;
      const sweepAngle = Math.PI * (0.5 - u);
      const periluneR = moonVisualRadius * 1.35;
      const offsetAlong = Math.cos(sweepAngle) * periluneR;
      const offsetPerp = Math.sin(sweepAngle) * periluneR;
      longitudinal = dist + offsetAlong;
      lateral = offsetPerp;
      vertical = Math.cos(sweepAngle) * 0.08;
    } else {
      const u = (t - 0.55) / 0.45;
      longitudinal = (1 - u) * (dist - moonVisualRadius * 0.8);
      lateral = -Math.sin(u * Math.PI) * (dist * 0.18);
      vertical = Math.sin(u * Math.PI) * 0.18;
    }

    const px = earthPos.x + ux * longitudinal + nx * lateral;
    const pz = earthPos.z + uz * longitudinal + nz * lateral;
    const py = ey * (1 - t) + my * t + vertical;

    points.push({ x: px, y: py, z: pz });
  }

  return points;
}

/**
 * Generates hyperbolic flyby / capture arc coordinates around the Moon inside its SOI.
 */
export function generateMoonSoiConicCoordinates(
  moonPos: { x: number; y?: number; z: number },
  incomingHeadingRad: number,
  periapsisRadius: number,
  pointsCount = 48
): Array<{ x: number; y: number; z: number }> {
  const points: Array<{ x: number; y: number; z: number }> = [];
  const my = moonPos.y ?? 0;
  const ecc = 1.4;
  const p = periapsisRadius * (1 + ecc);
  const maxTrueAnomaly = Math.PI * 0.42;

  for (let i = 0; i <= pointsCount; i++) {
    const f = -maxTrueAnomaly + (i / pointsCount) * (2 * maxTrueAnomaly);
    const r = p / (1 + ecc * Math.cos(f));
    const lx = r * Math.sin(f);
    const lz = -r * Math.cos(f);

    const cosH = Math.cos(incomingHeadingRad);
    const sinH = Math.sin(incomingHeadingRad);
    const rx = lx * cosH - lz * sinH;
    const rz = lx * sinH + lz * cosH;

    points.push({
      x: moonPos.x + rx,
      y: my,
      z: moonPos.z + rz,
    });
  }

  return points;
}

export function computeLaunchOrbitHandoffState(
  launch: {
    altitudeKm: number;
    downrangeKm?: number;
    horizontalSpeedMs: number;
    verticalSpeedMs: number;
    orbitReached?: boolean;
  },
  missionId: CampaignMissionId = 'artemis-2',
  scaleMode: SolarScaleMode = 'exploration',
  epochYears = 0,
  localAnchorId = 'earth',
  tliBurnActive = false,
  tliDeltaVAppliedMs = 0
): SpaceHandoffState {
  const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
  const earthPos = computeKeplerBodyPosition(
    earthSpec,
    epochYears,
    scaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );

  const rEarthKm = 6371.0;
  const altKm = Math.max(150, launch.altitudeKm || 165);
  const rOrbitKm = rEarthKm + altKm;

  // Visual radius of orbit in scene units
  const earthVisualRadius = getBodyVisualRadiusUnits('earth', scaleMode);
  const orbitVisualRadius =
    scaleMode === 'scientific'
      ? (rOrbitKm / rEarthKm) * SCIENTIFIC_EARTH_RADIUS_UNITS
      : scaleMode === 'local'
        ? rOrbitKm * LOCAL_UNITS_PER_METER
        : earthVisualRadius * (1 + (altKm / rEarthKm) * 0.45 + 0.015);

  // Downrange orbital angle theta in radians around Earth
  const downrangeRad = ((launch.downrangeKm ?? 0) * 1000) / (rEarthKm * 1000);
  // Inclination 28.5 deg (LC-39B Kennedy Space Center eastward launch)
  const inclRad = 28.5 * (Math.PI / 180);

  // Position in orbital plane projected into XZ scene plane
  const dx = orbitVisualRadius * Math.cos(downrangeRad);
  const dz = orbitVisualRadius * Math.sin(downrangeRad) * Math.cos(inclRad);

  const shipX = earthPos.x + dx;
  const shipZ = earthPos.z + dz;

  // Orbital velocity
  const muEarth = PLANETARY_CATALOG_SI.earth.muM3S2;
  const vCircMs = Math.sqrt(muEarth / (rOrbitKm * 1000));
  const baseSpeedKmS = (launch.horizontalSpeedMs > 5000 ? launch.horizontalSpeedMs : vCircMs) / 1000;
  const effectiveSpeedKmS = baseSpeedKmS + tliDeltaVAppliedMs / 1000;

  // Velocity direction is prograde tangential (-sin theta, cos theta * cos i)
  const fwdX = -Math.sin(downrangeRad);
  const fwdZ = Math.cos(downrangeRad) * Math.cos(inclRad);
  const fwdLen = Math.max(0.0001, Math.hypot(fwdX, fwdZ));
  const dirX = fwdX / fwdLen;
  const dirZ = fwdZ / fwdLen;

  // Scale scene speed unit for smooth, controllable gameplay motion:
  // In exploration mode, Earth radius is 2.35u and 165 km orbit is ~2.41u.
  // Real 7.81 km/s orbital velocity corresponds to 0.20 u/s scene speed:
  // Angular rate omega = v / r = 0.20 / 2.41 = 0.0830 rad/s = 4.75 deg/s.
  // One full orbit takes 2*pi*r / v = 75.7 seconds (readable and controllable).
  const sceneSpeed =
    scaleMode === 'scientific'
      ? (effectiveSpeedKmS / 1000) * 0.4
      : scaleMode === 'local'
        ? effectiveSpeedKmS * 0.35
        : (effectiveSpeedKmS / 7.81) * 0.20;

  const vx = dirX * sceneSpeed;
  const vz = dirZ * sceneSpeed;
  const headingRad = Math.atan2(vx, vz);

  const trajectoryRegime: OrbitalTrajectoryRegime =
    tliDeltaVAppliedMs > 2500
      ? 'Transfer Trajectory'
      : launch.orbitReached
        ? 'Circular Orbit'
        : 'Elliptical Orbit';

  return {
    shipX,
    shipZ,
    vx,
    vz,
    headingRad,
    orbitalSpeedKmS: Number(effectiveSpeedKmS.toFixed(2)),
    trajectoryRegime,
  };
}

export function createInitialSpaceFlightState(
  missionId: CampaignMissionId = 'artemis-2',
  carryover?: Partial<CampaignCarryoverState>,
  handoff?: SpaceHandoffState
): SpaceFlightState {
  const defaultTarget: SpaceTargetId =
    missionId === 'artemis-4'
      ? 'gateway'
      : missionId === 'mars-pathfinder'
        ? 'mars'
        : 'moon';

  const target = SOLAR_TARGETS[defaultTarget];
  const liveTarget = getLiveSolarTargetPosition(defaultTarget, 0, 'exploration');
  const spawn = getShipSpawnForMission(missionId, 0, 'exploration');
  const relay0 = getLiveSolarTargetPosition('relay-orbit', 0, 'exploration');
  const fuelStart = clamp(
    (missionId === 'artemis-4' ? 76 : 92) + (carryover?.isruFuelBonusPct || 0),
    45,
    100
  );

  const satAlreadyOnline = Boolean(carryover?.relaySatelliteOnline);
  const earthSi = computeBodyCartesianSI('earth', 0).state;

  const startX = handoff ? handoff.shipX : spawn.x;
  const startZ = handoff ? handoff.shipZ : spawn.z;
  let startVx = handoff ? handoff.vx : 0;
  let startVz = handoff ? handoff.vz : 0;

  // If entering space flight without a prior ascent handoff, initialize in stable circular Low Earth Orbit
  if (!handoff && (missionId === 'artemis-2' || missionId === 'artemis-3')) {
    const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
    const earthPos = computeKeplerBodyPosition(earthSpec, 0, 'exploration', SOLAR_SUN_ORIGIN_X, SOLAR_SUN_ORIGIN_Z, 'earth');
    const rx = startX - earthPos.x;
    const rz = startZ - earthPos.z;
    const rDist = Math.max(0.001, Math.hypot(rx, rz));
    const tx = -rz / rDist;
    const tz = rx / rDist;
    const circSpeed = 0.20; // Verified 0.20 u/s circular orbit speed matching 7.81 km/s LEO
    startVx = tx * circSpeed;
    startVz = tz * circSpeed;
  }

  const startHeading =
    handoff?.headingRad ??
    (Math.hypot(startVx, startVz) > 0.001
      ? Math.atan2(startVx, startVz)
      : Math.atan2(liveTarget.x - startX, liveTarget.z - startZ));

  return {
    shipX: startX,
    shipZ: startZ,
    vx: startVx,
    vz: startVz,
    headingRad: startHeading,
    targetId: defaultTarget,
    autoPilot: false,
    boostActive: false,
    shieldBoostActive: false,
    fuelPct: fuelStart,
    elapsedDays: 0,
    inRadiationZone: false,
    arrivedMoon: false,
    arrivedMars: false,
    arrivedGateway: false,
    inSatDeployZone: false,
    visitedTargets: [],
    orbitalSat: {
      deployed: satAlreadyOnline,
      satX: relay0.x,
      satZ: relay0.z,
      solarDeployedPct: satAlreadyOnline ? 100 : 0,
      dishAlignedPct: satAlreadyOnline ? 100 : 0,
      linkLocked: satAlreadyOnline,
      rotationErrorDeg: satAlreadyOnline ? 0 : 42,
      telemetrySignalPct: satAlreadyOnline ? 100 : 12,
    },
    statusText:
      missionId === 'artemis-2'
        ? 'Artemis II: Fly Orion on Cislunar Free-Return Trajectory past the Moon (~7,400 km perilune)!'
        : satAlreadyOnline
          ? `Course ready for ${target.name}. Fly cleanly to orbital capture!`
          : 'Fly to Destination on planned trajectory!',
    navBodyId: null,
    trajectoryRegime: handoff?.trajectoryRegime ?? 'Circular Orbit',
    orbitalSpeedKmS: handoff?.orbitalSpeedKmS ?? 1.02,
    distanceFromSunAu: Math.round(metersToAu(earthSi.rM) * 1000) / 1000,
    distanceToTargetKm: 384400,
    altitudeKm: 165,
    commsDelaySec: 0.0,
    radiationDoseRateUsvH: 18.0,
    activeTrajectoryFrame: 'earth_inertial',
    timeWarp: 1,
    throttle: 0,
    sasMode: 'MANUAL',
  };
}

export function stepSpaceFlightPhysics(
  state: SpaceFlightState,
  resources: ResourceState,
  input: Pick<InputState, 'forward' | 'left' | 'right' | 'boost' | 'action' | 'backward'>,
  donkiFlareActive: boolean,
  rawDt: number,
  solarEpochYears = 0,
  solarScaleMode: SolarScaleMode = 'exploration',
  options?: { satDeployBoost?: number; fuelFactor?: number; localAnchorId?: string }
): { space: SpaceFlightState; resources: ResourceState } {
  const dt = Math.min(rawDt, 0.05);
  const fuelFactor = options?.fuelFactor ?? 1.0;
  const satDeployBoost = options?.satDeployBoost ?? 1.0;
  const localAnchorId = options?.localAnchorId ?? 'earth';
  const s: SpaceFlightState = {
    ...state,
    visitedTargets: [...state.visitedTargets],
    orbitalSat: { ...state.orbitalSat },
  };
  const res: ResourceState = { ...resources };

  const targetMeta = SOLAR_TARGETS[s.targetId];
  const navSpec = s.navBodyId ? SOLAR_SYSTEM_BODIES.find((b) => b.id === s.navBodyId) : undefined;
  const liveNavPos = navSpec
    ? computeKeplerBodyPosition(
        navSpec,
        solarEpochYears,
        solarScaleMode,
        SOLAR_SUN_ORIGIN_X,
        SOLAR_SUN_ORIGIN_Z,
        localAnchorId
      )
    : null;
  const liveTarget = getLiveSolarTargetPosition(
    s.targetId,
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );
  const targetX = liveNavPos ? liveNavPos.x : liveTarget.x;
  const targetZ = liveNavPos ? liveNavPos.z : liveTarget.z;
  const targetBodyId = navSpec ? navSpec.id : s.targetId === 'mars' ? 'mars' : 'moon';
  const targetRadius = getBodyVisualRadiusUnits(targetBodyId, solarScaleMode);
  const targetLabel = navSpec ? navSpec.name : targetMeta.name;

  const shipStartDx = targetX - s.shipX;
  const shipStartDz = targetZ - s.shipZ;
  const distToTarget = Math.hypot(shipStartDx, shipStartDz);

  // Compute live gravity-well centers for dominant Sphere of Influence (SOI) & orbital escape physics
  const sunSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'sun')!;
  const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
  const moonSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'moon')!;
  const marsSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'mars')!;

  const sunBodyPos = computeKeplerBodyPosition(
    sunSpec,
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );
  const earthBodyPos = computeKeplerBodyPosition(
    earthSpec,
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );
  const moonBodyPos = computeKeplerBodyPosition(
    moonSpec,
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );
  const marsBodyPos = computeKeplerBodyPosition(
    marsSpec,
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );

  const distEarth = Math.hypot(s.shipX - earthBodyPos.x, s.shipZ - earthBodyPos.z);
  const distMoon = Math.hypot(s.shipX - moonBodyPos.x, s.shipZ - moonBodyPos.z);
  const distMars = Math.hypot(s.shipX - marsBodyPos.x, s.shipZ - marsBodyPos.z);
  const distSun = Math.hypot(s.shipX - sunBodyPos.x, s.shipZ - sunBodyPos.z);

  // Scaled Laplace Sphere of Influence (SOI) radii consistent with rendered orbital separations
  // Real NASA/JPL Catalog: Moon SOI = 66,100 km (17.1956% of 384,400 km Earth-Moon distance)
  // Exploration mode: Earth-Moon distance = 5.8u -> Moon SOI = 5.8 * (66,100 / 384,400) = 0.9973u (~1.00u)
  // Earth Hill SOI = 1450u * (924,000 / 149,597,870) = 8.96u
  // Mars Hill SOI = 1950u * (576,000 / 227,939,200) = 4.93u
  const soiRadii =
    solarScaleMode === 'scientific'
      ? { moon: 0.071, earth: 0.99, mars: 0.74 }
      : solarScaleMode === 'local'
        ? { moon: 66.1, earth: 924.0, mars: 576.0 }
        : { moon: 1.00, earth: 8.96, mars: 4.93 };

  let domId: 'moon' | 'earth' | 'mars' | 'sun' = 'sun';
  let domPos = sunBodyPos;
  let domDist = distSun;
  let domMuSi = PLANETARY_CATALOG_SI.sun.muM3S2;
  let domMuScene = solarScaleMode === 'scientific' ? 18.0 : solarScaleMode === 'local' ? 0 : 24.0;
  let domName = 'Sun';

  if (distMoon <= soiRadii.moon) {
    domId = 'moon';
    domPos = moonBodyPos;
    domDist = distMoon;
    domMuSi = PLANETARY_CATALOG_SI.moon.muM3S2;
    domMuScene = solarScaleMode === 'scientific' ? 0.14 : solarScaleMode === 'local' ? 0.012 : 0.00119;
    domName = 'Moon';
  } else if (distEarth <= soiRadii.earth) {
    domId = 'earth';
    domPos = earthBodyPos;
    domDist = distEarth;
    domMuSi = PLANETARY_CATALOG_SI.earth.muM3S2;
    domMuScene = solarScaleMode === 'scientific' ? 0.45 : solarScaleMode === 'local' ? 0.8006 : 0.0964;
    domName = 'Earth';
  } else if (distMars <= soiRadii.mars) {
    domId = 'mars';
    domPos = marsBodyPos;
    domDist = distMars;
    domMuSi = PLANETARY_CATALOG_SI.mars.muM3S2;
    domMuScene = solarScaleMode === 'scientific' ? 0.22 : solarScaleMode === 'local' ? 0.28 : 0.0104;
    domName = 'Mars';
  }

  s.timeWarp = s.timeWarp ?? 1;
  s.throttle = s.throttle ?? 0;
  s.sasMode = s.sasMode ?? 'MANUAL';

  const scaleSpeedMult =
    solarScaleMode === 'scientific'
      ? Math.max(1.0, distToTarget > 35 ? distToTarget * 0.28 : 2.5)
      : solarScaleMode === 'local'
        ? Math.max(1.8, Math.min(5.2, distToTarget * 0.06))
        : 1.0;

  const captureRadius =
    !navSpec && s.targetId === 'relay-orbit'
      ? targetRadius + (solarScaleMode === 'scientific' ? 0.55 : solarScaleMode === 'local' ? 4.2 : 3.0)
      : targetRadius +
        (solarScaleMode === 'scientific'
          ? Math.max(0.02, targetRadius * 1.5)
          : solarScaleMode === 'local'
            ? 12.0
            : s.targetId === 'moon' || s.targetId === 'gateway'
              ? 0.45 // Moon capture orbit (~1.09u, at the boundary of scaled 1.00u Moon SOI)
              : 1.5);

  // Automatic drop-out of time warp to 1x on active keyboard maneuvers, SOI transition, or arrival
  const manualBurnInput = Boolean(input.forward || input.boost);
  const manualSteerInput = Boolean(input.left || input.right);
  const manualBrakeInput = Boolean(input.backward);

  const justEnteredCapture =
    distToTarget <= captureRadius &&
    s.prevDistToTarget !== undefined &&
    s.prevDistToTarget > captureRadius;

  let warpNotice: string | null = null;
  if (s.timeWarp > 1 && (manualBurnInput || manualSteerInput || manualBrakeInput)) {
    s.timeWarp = 1;
    warpNotice = 'Time warp dropped to 1x for flight maneuver';
  } else if (s.timeWarp > 1 && s.dominantBodyName && s.dominantBodyName !== domName) {
    s.timeWarp = 1;
    warpNotice = `SOI Transition: entered ${domName} Sphere of Influence (1x)`;
  } else if (s.timeWarp > 1 && justEnteredCapture) {
    s.timeWarp = 1;
    warpNotice = `Arrived at ${targetLabel} capture zone (1x)`;
  }

  const activeWarp = s.timeWarp ?? 1;
  const simDt = dt * activeWarp;

  if (input.forward) {
    s.throttle = Math.min(1.0, Math.max(s.throttle ?? 0, 0.25) + 1.8 * dt);
  } else if (input.backward && !s.autoPilot) {
    s.throttle = Math.max(0, (s.throttle ?? 0) - 2.5 * dt);
  }

  let thrusting = s.autoPilot ? false : ((s.throttle ?? 0) > 0.02 || input.forward);
  let braking = s.autoPilot ? false : (input.backward && (s.throttle ?? 0) <= 0.02);

  if (s.autoPilot) {
    let steerX = shipStartDx;
    let steerZ = shipStartDz;
    // If Earth lies directly between Orion and distant target during departure, arc cleanly around Earth's limb
    if (distToTarget > 2.2 && targetBodyId !== 'earth' && targetBodyId !== 'moon' && targetBodyId !== 'relay-orbit') {
      const eRelX = earthBodyPos.x - s.shipX;
      const eRelZ = earthBodyPos.z - s.shipZ;
      const tNorm = Math.max(0.001, distToTarget);
      const tDirX = shipStartDx / tNorm;
      const tDirZ = shipStartDz / tNorm;
      const proj = eRelX * tDirX + eRelZ * tDirZ;
      const earthClearR = getBodyVisualRadiusUnits('earth', solarScaleMode) * 1.45;
      if (proj > 0 && proj < distToTarget) {
        const perpX = eRelX - proj * tDirX;
        const perpZ = eRelZ - proj * tDirZ;
        const perpDist = Math.hypot(perpX, perpZ);
        if (perpDist < earthClearR) {
          const tangX = -tDirZ;
          const tangZ = tDirX;
          const sideSign = perpX * tangX + perpZ * tangZ >= 0 ? -1 : 1;
          steerX += tangX * sideSign * earthClearR * 1.6;
          steerZ += tangZ * sideSign * earthClearR * 1.6;
        }
      }
    }

    const desiredHeading = Math.atan2(steerX, steerZ);
    let diff = desiredHeading - s.headingRad;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    s.headingRad += clamp(diff, -3.8 * dt, 3.8 * dt);

    const speed = Math.hypot(s.vx, s.vz);
    if (distToTarget > captureRadius * 0.85) {
      const baseCap = distToTarget < 18 ? Math.max(2.5, distToTarget * 0.65) : 18 * scaleSpeedMult;
      thrusting = speed < baseCap;
      braking = speed > baseCap + 1.2 * scaleSpeedMult;
    } else {
      thrusting = false;
      braking = speed > 0.25;
      if (navSpec && speed <= 0.35) {
        s.autoPilot = false;
      }
    }
  } else {
    if (input.left || input.right) {
      s.sasMode = 'MANUAL';
      if (input.left) s.headingRad += 2.75 * dt;
      if (input.right) s.headingRad -= 2.75 * dt;
    } else if (s.sasMode && s.sasMode !== 'MANUAL') {
      const curSpd = Math.hypot(s.vx, s.vz);
      let desiredHeading: number | null = null;
      if (s.sasMode === 'PROGRADE' && curSpd > 0.01) {
        desiredHeading = Math.atan2(s.vx, s.vz);
      } else if (s.sasMode === 'RETROGRADE' && curSpd > 0.01) {
        desiredHeading = Math.atan2(-s.vx, -s.vz);
      } else if (s.sasMode === 'TARGET') {
        desiredHeading = Math.atan2(shipStartDx, shipStartDz);
      }
      if (desiredHeading != null) {
        let diff = desiredHeading - s.headingRad;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        s.headingRad += clamp(diff, -3.8 * dt, 3.8 * dt);
      }
    }
  }

  s.boostActive = Boolean(input.boost && thrusting && res.power > 5);

  const fwdX = Math.sin(s.headingRad);
  const fwdZ = Math.cos(s.headingRad);
  const throttleVal = s.autoPilot ? 1.0 : input.forward ? Math.max(0.4, s.throttle ?? 0) : (s.throttle ?? 0);
  const accel =
    (solarScaleMode === 'scientific'
      ? (s.boostActive ? 17.5 : 10.5) * Math.max(1.0, scaleSpeedMult * 0.35)
      : solarScaleMode === 'local'
        ? (s.boostActive ? 0.40 : 0.22)
        : (s.boostActive ? 0.16 : 0.09)) * throttleVal;

  if (thrusting && s.fuelPct > 0) {
    s.vx += fwdX * accel * simDt;
    s.vz += fwdZ * accel * simDt;
    s.fuelPct = Math.max(0, s.fuelPct - (s.boostActive ? 1.4 : 0.55) * throttleVal * fuelFactor * simDt);
    if (s.boostActive) {
      res.power = Math.max(0, res.power - 2.0 * simDt);
    }
  } else if (braking) {
    // RCS retro-thruster braking
    s.vx *= Math.max(0, 1 - 4.0 * simDt);
    s.vz *= Math.max(0, 1 - 4.0 * simDt);
  }

  // Central gravitational acceleration toward active dominant Sphere of Influence (SOI)
  // Skip gravity pull only while actively docked / holding station inside a target capture orbit.
  const domVisRadius = getBodyVisualRadiusUnits(domId, solarScaleMode);
  // Soften gravity only within or immediately below planetary surface, preserving 100% orbital equilibrium at LEO
  const rSoft = Math.max(domVisRadius * 0.98, domDist);
  const inStationHold =
    (distToTarget <= captureRadius &&
      (s.autoPilot || (s.inSatDeployZone && input.action) || (s.targetId === 'relay-orbit' && s.orbitalSat.linkLocked))) ||
    (s.autoPilot && distToTarget <= captureRadius * 0.8);

  if (!inStationHold && domMuScene > 0 && domDist > 0.02) {
    const gAccel = Math.min((solarScaleMode === 'exploration' ? 0.08 : (s.boostActive ? 17.5 : 10.5) * 0.42), domMuScene / (rSoft * rSoft));
    const gx = (domPos.x - s.shipX) / domDist;
    const gz = (domPos.z - s.shipZ) / domDist;
    s.vx += gx * gAccel * simDt;
    s.vz += gz * gAccel * simDt;
  } else if (inStationHold && !thrusting && !braking) {
    s.vx *= Math.max(0, 1 - 3.5 * dt);
    s.vz *= Math.max(0, 1 - 3.5 * dt);
  }

  const maxSpeed =
    solarScaleMode === 'scientific'
      ? (s.boostActive ? 28 : 18) * Math.max(1.0, scaleSpeedMult)
      : solarScaleMode === 'local'
        ? (s.boostActive ? 1.8 : 1.2)
        : (s.boostActive ? 0.50 : 0.35);
  const spd = Math.hypot(s.vx, s.vz);
  if (spd > maxSpeed) {
    s.vx = (s.vx / spd) * maxSpeed;
    s.vz = (s.vz / spd) * maxSpeed;
  }

  const bound = solarScaleMode === 'scientific' ? 25000 : solarScaleMode === 'local' ? 1500 : 25000;
  s.shipX = clamp(s.shipX + s.vx * simDt, -bound, bound);
  s.shipZ = clamp(s.shipZ + s.vz * simDt, -bound, bound);
  s.elapsedDays += (simDt * (s.boostActive ? 1.4 : 0.6)) / 30;

  // Heliocentric distance in AU & solar particle flux zone
  const distFromSunUnits = Math.hypot(s.shipX - SOLAR_SUN_ORIGIN_X, s.shipZ - SOLAR_SUN_ORIGIN_Z);
  let sunAuNow = distFromSunUnits / 38.5;
  if (solarScaleMode === 'local') {
    const anchorSi = computeBodyCartesianSI(localAnchorId, solarEpochYears).state;
    const sunDistM = Math.hypot(
      anchorSi.xM + s.shipX * 1_000_000,
      anchorSi.yM,
      anchorSi.zM + s.shipZ * 1_000_000
    );
    sunAuNow = metersToAu(sunDistM);
    s.inRadiationZone = sunAuNow < (donkiFlareActive ? 0.78 : 0.55);
  } else if (solarScaleMode === 'scientific') {
    sunAuNow = distFromSunUnits / 160;
    s.inRadiationZone = distFromSunUnits < (donkiFlareActive ? 95 : 65);
  } else {
    s.inRadiationZone = distFromSunUnits < (donkiFlareActive ? 30 : 21);
  }

  if (s.inRadiationZone) {
    if (s.shieldBoostActive && res.power > 2) {
      res.power = Math.max(0, res.power - 3.2 * dt);
      res.shield = Math.max(0, res.shield - 0.45 * dt);
    } else {
      res.shield = Math.max(0, res.shield - (donkiFlareActive ? 4.0 : 2.1) * dt);
    }
  }

  // Non-Landing Orbital Satellite Operations at Relay Orbit
  const relayNode = getLiveSolarTargetPosition(
    'relay-orbit',
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );
  if (!s.orbitalSat.deployed) {
    s.orbitalSat.satX = relayNode.x;
    s.orbitalSat.satZ = relayNode.z;
  }
  const relayCaptureDist = solarScaleMode === 'scientific' ? 1.2 : solarScaleMode === 'local' ? 5.2 : 3.4;
  const distToSatZone = Math.hypot(s.shipX - relayNode.x, s.shipZ - relayNode.z);
  const distToSat = Math.hypot(s.shipX - s.orbitalSat.satX, s.shipZ - s.orbitalSat.satZ);
  s.inSatDeployZone = distToSatZone <= relayCaptureDist || distToSat <= relayCaptureDist;

  if (input.action && s.inSatDeployZone && !s.orbitalSat.linkLocked) {
    // Active RCS station-keeping keeps Orion locked beside the satellite during deployment
    s.vx *= Math.max(0, 1 - 4.5 * dt);
    s.vz *= Math.max(0, 1 - 4.5 * dt);
    if (!s.orbitalSat.deployed) {
      s.orbitalSat.deployed = true;
      const sep = solarScaleMode === 'scientific' ? 0.35 : solarScaleMode === 'local' ? 2.8 : 3.0;
      s.orbitalSat.satX = clamp(s.shipX + fwdX * sep, -bound, bound);
      s.orbitalSat.satZ = clamp(s.shipZ + fwdZ * sep, -bound, bound);
    }
    s.orbitalSat.solarDeployedPct = clamp(
      s.orbitalSat.solarDeployedPct + 48 * satDeployBoost * dt,
      0,
      100
    );
    if (s.orbitalSat.solarDeployedPct >= 50) {
      s.orbitalSat.dishAlignedPct = clamp(
        s.orbitalSat.dishAlignedPct + 44 * satDeployBoost * dt,
        0,
        100
      );
      s.orbitalSat.rotationErrorDeg = clamp(
        42 * (1 - s.orbitalSat.dishAlignedPct / 100),
        0,
        42
      );
      s.orbitalSat.telemetrySignalPct = Math.round(
        15 + s.orbitalSat.solarDeployedPct * 0.35 + s.orbitalSat.dishAlignedPct * 0.5
      );
    } else {
      s.orbitalSat.telemetrySignalPct = Math.round(15 + s.orbitalSat.solarDeployedPct * 0.35);
    }

    if (s.orbitalSat.solarDeployedPct >= 99 && s.orbitalSat.dishAlignedPct >= 99) {
      s.orbitalSat.solarDeployedPct = 100;
      s.orbitalSat.dishAlignedPct = 100;
      s.orbitalSat.rotationErrorDeg = 0;
      s.orbitalSat.telemetrySignalPct = 100;
      s.orbitalSat.linkLocked = true;
      if (!s.visitedTargets.includes('relay-orbit')) {
        s.visitedTargets.push('relay-orbit');
      }
    }
  }

  // Check orbital capture at any target dynamically
  const extraCap = solarScaleMode === 'scientific' ? 1.2 : solarScaleMode === 'local' ? 3.8 : 1.4;
  (Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).forEach((id) => {
    const pos = getLiveSolarTargetPosition(
      id,
      solarEpochYears,
      solarScaleMode,
      SOLAR_SUN_ORIGIN_X,
      SOLAR_SUN_ORIGIN_Z,
      localAnchorId
    );
    const d = Math.hypot(s.shipX - pos.x, s.shipZ - pos.z);
    const capR = pos.radius + extraCap;
    if (id !== 'relay-orbit' && d <= capR && !s.visitedTargets.includes(id)) {
      s.visitedTargets.push(id);
    }
  });

  const moon = getLiveSolarTargetPosition(
    'moon',
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );
  s.arrivedMoon = Math.hypot(s.shipX - moon.x, s.shipZ - moon.z) <= moon.radius + extraCap;
  const gw = getLiveSolarTargetPosition(
    'gateway',
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );
  s.arrivedGateway = Math.hypot(s.shipX - gw.x, s.shipZ - gw.z) <= gw.radius + extraCap;
  const mars = getLiveSolarTargetPosition(
    'mars',
    solarEpochYears,
    solarScaleMode,
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    localAnchorId
  );
  s.arrivedMars =
    Math.hypot(s.shipX - mars.x, s.shipZ - mars.z) <=
    mars.radius + (solarScaleMode === 'scientific' ? 1.2 : solarScaleMode === 'local' ? 4.2 : 5.2);

  // Physical Vis-Viva orbital energy, escape velocity & trajectory regime relative to active gravity well
  const dx = targetX - s.shipX;
  const dz = targetZ - s.shipZ;
  const relDist = Math.max(0.001, distToTarget);
  const radialVelTarget = (s.vx * dx + s.vz * dz) / relDist;
  const tangVelTarget = Math.abs(s.vx * -dz + s.vz * dx) / relDist;

  // Compute physical SI radius around dominant body
  let domRadiusPhysM: number = SI.AU_M;
  if (solarScaleMode === 'local') {
    domRadiusPhysM = Math.max(PLANETARY_CATALOG_SI[domId].meanRadiusM + 120_000, domDist * 1_000_000);
  } else if (solarScaleMode === 'scientific') {
    if (domId === 'sun') {
      domRadiusPhysM = Math.max(PLANETARY_CATALOG_SI.sun.meanRadiusM * 2, (domDist / 160) * SI.AU_M);
    } else {
      domRadiusPhysM = Math.max(
        PLANETARY_CATALOG_SI[domId].meanRadiusM + 120_000,
        (domDist / 0.032) * PLANETARY_CATALOG_SI.earth.meanRadiusM
      );
    }
  } else {
    if (domId === 'earth') {
      const earthVisR = getBodyVisualRadiusUnits('earth', solarScaleMode);
      const leoLimit = earthVisR * 1.08;
      if (domDist <= leoLimit) {
        // Low Earth Orbit (165 - 500 km)
        const altRatio = Math.max(0, (domDist - earthVisR) / Math.max(0.01, leoLimit - earthVisR));
        domRadiusPhysM = PLANETARY_CATALOG_SI.earth.meanRadiusM + (165_000 + altRatio * 335_000);
      } else {
        const cislunarFraction = Math.min(1.0, Math.max(0, (domDist - leoLimit) / Math.max(0.1, 5.8 - leoLimit)));
        domRadiusPhysM = PLANETARY_CATALOG_SI.earth.meanRadiusM + 500_000 + cislunarFraction * 380_000_000;
      }
    } else if (domId === 'moon') {
      const moonVisR = getBodyVisualRadiusUnits('moon', solarScaleMode);
      const lloLimit = moonVisR * 1.15;
      if (domDist <= lloLimit) {
        // Low Lunar Orbit (~100 - 250 km)
        const altRatio = Math.max(0, (domDist - moonVisR) / Math.max(0.01, lloLimit - moonVisR));
        domRadiusPhysM = PLANETARY_CATALOG_SI.moon.meanRadiusM + (100_000 + altRatio * 150_000);
      } else {
        domRadiusPhysM = Math.max(PLANETARY_CATALOG_SI.moon.meanRadiusM + 100_000, (domDist / 2.2) * 18_000_000);
      }
    } else if (domId === 'mars') {
      domRadiusPhysM = Math.max(PLANETARY_CATALOG_SI.mars.meanRadiusM + 250_000, (domDist / 2.8) * 45_000_000);
    } else {
      domRadiusPhysM = Math.max(PLANETARY_CATALOG_SI.sun.meanRadiusM * 2, (domDist / 38.5) * SI.AU_M);
    }
  }

  const vCircPhysMs = Math.sqrt(domMuSi / domRadiusPhysM);
  const vEscPhysMs = Math.sqrt((2 * domMuSi) / domRadiusPhysM);
  const vEscScene = domMuScene > 0 ? Math.sqrt((2 * domMuScene) / rSoft) : 3.2;

  const domDx = s.shipX - domPos.x;
  const domDz = s.shipZ - domPos.z;
  const domLen = Math.max(0.001, Math.hypot(domDx, domDz));
  const radialOutwardWell = (s.vx * domDx + s.vz * domDz) / domLen;
  const tangWell = Math.abs(s.vx * -domDz + s.vz * domDx) / domLen;

  const dockedOrKeep = Boolean((s.arrivedMoon || s.arrivedGateway || s.arrivedMars || s.inSatDeployZone) && spd < 0.8);
  const vPhysMs =
    spd < 0.05
      ? vCircPhysMs
      : vCircPhysMs + (spd / Math.max(0.45, vEscScene)) * (vEscPhysMs - vCircPhysMs) * 1.15;
  const specEnergyPhys = 0.5 * vPhysMs * vPhysMs - domMuSi / domRadiusPhysM;
  const hPhys = domRadiusPhysM * vPhysMs * (spd > 0.05 ? Math.min(1, Math.max(0.25, tangWell / Math.max(0.01, spd))) : 1.0);
  const eccWell = Math.sqrt(
    Math.max(0, 1 + (2 * specEnergyPhys * hPhys * hPhys) / Math.pow(domMuSi, 2))
  );
  const isEscapingWell = !dockedOrKeep && domId !== 'sun' && specEnergyPhys >= 0 && radialOutwardWell > 0.15;

  s.trajectoryRegime = classifySpacecraftTrajectory({
    speedUnitsPerSec: spd,
    radialVelUnitsPerSec: -radialVelTarget,
    tangentialVelUnitsPerSec: tangVelTarget,
    distanceToTargetUnits: distToTarget,
    targetBodyRadiusUnits: targetRadius,
    autoPilot: s.autoPilot,
    dockedOrStationKeeping: dockedOrKeep,
    eccentricityEstimate: eccWell,
    specificEnergyJKg: specEnergyPhys,
    isEscapingWell,
  });

  s.dominantBodyName = domName;
  s.prevDistToTarget = distToTarget;
  s.escapeVelocityKmS = Math.round((vEscPhysMs / 1000) * 100) / 100;
  s.orbitalEccentricity = Math.round(eccWell * 100) / 100;
  s.orbitalSpeedKmS = Math.round((vPhysMs / 1000) * 100) / 100;

  s.distanceFromSunAu = Math.round(sunAuNow * 1000) / 1000;

  // Real physical altitude relative to dominant body surface (km)
  const domCatalog = PLANETARY_CATALOG_SI[domId];
  const domRadiusKm = domCatalog ? domCatalog.meanRadiusM / 1000 : 0;
  s.altitudeKm = Math.max(0, Math.round(domRadiusPhysM / 1000 - domRadiusKm));

  // One-way speed of light latency from Earth ground stations to spacecraft (sec)
  let distEarthMeters = 0;
  if (domId === 'earth') {
    distEarthMeters = domRadiusPhysM;
  } else if (solarScaleMode === 'local') {
    distEarthMeters = distEarth * 1_000_000;
  } else if (solarScaleMode === 'scientific') {
    distEarthMeters = (distEarth / 160) * SI.AU_M;
  } else {
    const isCislunar = distMoon <= soiRadii.moon || distEarth <= soiRadii.earth;
    distEarthMeters = isCislunar
      ? distEarth * (384_400_000 / 5.8)
      : (distEarth / 38.5) * SI.AU_M;
  }
  s.commsDelaySec = Math.round((distEarthMeters / SI.SPEED_OF_LIGHT_MS) * 100) / 100;

  // Radiation dose rate (uSv/h): GCR background ~62 uSv/h, shielded in LEO ~18 uSv/h, solar storm surge up to ~1500+ uSv/h
  let baseDose = 62.0;
  if (domId === 'earth' && (s.altitudeKm ?? 0) < 1200) {
    baseDose = 18.0;
  }
  if (s.inRadiationZone || donkiFlareActive) {
    const stormFlux = donkiFlareActive ? 1450.0 : 650.0;
    const prox = Math.max(1.0, 1.0 / Math.max(0.2, sunAuNow));
    baseDose += stormFlux * prox * (s.inRadiationZone ? 1.0 : 0.35);
  }
  if (s.shieldBoostActive) {
    baseDose *= 0.28; // Water-wall storm shelter ~72% attenuation
  }
  s.radiationDoseRateUsvH = Math.round(baseDose * 10) / 10;

  // Active trajectory reference frame
  if (distMoon <= soiRadii.moon) {
    s.activeTrajectoryFrame = 'moon_centred';
  } else if (domId === 'earth' && (s.altitudeKm ?? 0) < 2000) {
    s.activeTrajectoryFrame = 'earth_inertial';
  } else {
    s.activeTrajectoryFrame = 'earth_moon_rotating';
  }
  if (solarScaleMode === 'local') {
    s.distanceToTargetKm = Math.round(distToTarget * 1000);
  } else if (solarScaleMode === 'scientific') {
    s.distanceToTargetKm = Math.round(metersToKm((distToTarget / 160) * SI.AU_M));
  } else {
    const isCislunar =
      navSpec?.id === 'moon' ||
      (!navSpec && (s.targetId === 'moon' || s.targetId === 'relay-orbit' || s.targetId === 'gateway'));
    s.distanceToTargetKm = isCislunar
      ? Math.round(distToTarget * (384_400 / 5.8))
      : Math.round(metersToKm((distToTarget / 38.5) * SI.AU_M));
  }

  if (warpNotice) {
    s.statusText = warpNotice;
  } else if (s.orbitalSat.linkLocked && s.arrivedGateway) {
    s.statusText = 'Gateway NRHO Link Online! Ready to transfer ISRU payload.';
  } else if (s.orbitalSat.linkLocked && s.targetId === 'relay-orbit' && !navSpec) {
    s.statusText = 'HERMES Relay Satellite Locked! High-Res Surface Maps Unlocked.';
  } else if (s.inSatDeployZone && !s.orbitalSat.linkLocked && !navSpec) {
    s.statusText = `In Relay Orbit — Hold [E / SPACE] to unfold wings & lock Dish (${Math.round(s.orbitalSat.dishAlignedPct)}%)`;
  } else if (s.arrivedMoon && !navSpec) {
    s.statusText = 'Lunar Orbit Captured! Ready to begin South Pole Descent.';
  } else if (s.arrivedMars && (!navSpec || navSpec.id === 'mars')) {
    s.statusText = 'Jezero Capture Orbit Reached! Ready for 0.38g Mars Descent.';
  } else if (s.inRadiationZone) {
    s.statusText = 'Solar Radiation Zone! Activate Water-Wall Storm Shield or steer clear of the Sun!';
  } else if (isEscapingWell) {
    s.statusText = `Escaping ${domName} gravity well (v > ${s.escapeVelocityKmS.toFixed(2)} km/s) -> ${targetLabel}`;
  } else {
    s.statusText = `Course set for ${targetLabel} (${(s.distanceToTargetKm ?? 0).toLocaleString()} km)`;
  }

  return { space: s, resources: res };
}
