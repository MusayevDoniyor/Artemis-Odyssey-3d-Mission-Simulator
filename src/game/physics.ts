import {
  CAMPAIGN_ANOMALIES,
  PAYLOADS,
  PHYSICS,
  SOLAR_TARGETS,
  getLandingZones,
} from './constants';
import {
  SOLAR_SUN_ORIGIN_X,
  SOLAR_SUN_ORIGIN_Z,
  SOLAR_SYSTEM_BODIES,
  type SolarScaleMode,
  computeKeplerBodyPosition,
  getLiveSolarTargetPosition,
  getShipSpawnForMission,
} from './solarSystemData';
import type {
  CampaignCarryoverState,
  CampaignMissionId,
  InputState,
  LandingState,
  LaunchState,
  ResourceState,
  RoverCollider,
  RoverState,
  SpaceFlightState,
  SpaceTargetId,
  SurfacePlanet,
} from './types';
import {
  PLANETARY_CATALOG_SI,
  SI,
  metersToAu,
  metersToKm,
} from './planetaryCatalog';
import {
  classifySpacecraftTrajectory,
  computeBodyCartesianSI,
  getBodyVisualRadiusUnits,
} from './orbitalMechanics';

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

export function createInitialCampaignCarryover(): CampaignCarryoverState {
  return {
    activeMission: 'artemis-2',
    completedMissions: [],
    relaySatelliteOnline: false,
    highResMapUnlocked: false,
    isruWaterKg: 0,
    isruFuelBonusPct: 0,
    solarGridKw: 0,
    regolithShieldLevel: 0,
    radiationDoseMsv: 14, // Nominal LEO + Van Allen transit baseline
    marsSamplesCached: 0,
    unlockedFieldNotes: [],
    solvedAnomalies: [],
  };
}

export function createInitialLaunchState(autoGuidance = true): LaunchState {
  const targetVelMs = Math.sqrt(
    PHYSICS.EARTH_MU_M3_S2 / (PHYSICS.EARTH_RADIUS_M + PHYSICS.SLS_ORBIT_TARGET_KM * 1000)
  );
  return {
    launchSequence: 'PRE_SIM',
    countdownSec: 3,
    autoGuidance,
    ignited: false,
    elapsed: 0,
    altitudeKm: 0,
    verticalSpeedMs: 0,
    horizontalSpeedMs: 0,
    netAccelMs2: 0,
    thrustKn: 0,
    dragKn: 0,
    massKg: PHYSICS.SLS_LIFTOFF_MASS_KG,
    dynamicPressureKpa: 0,
    pitchDeg: 0,
    throttle: 0,
    fuelPct: 100,
    srbSeparated: false,
    coreSeparated: false,
    lasJettisoned: false,
    orbitReached: false,
    stagePrompt: null,
    twr: 0,
    ispS: PHYSICS.SLS_STAGE0_ISP_SL_S,
    airDensityKgM3: 1.225,
    deltaVExpendedMs: 0,
    orbitalVelocityTargetMs: Math.round(targetVelMs),
    apoapsisKm: 0,
    periapsisKm: -PHYSICS.EARTH_RADIUS_M / 1000,
    orbitalEccentricity: 1,
  };
}

export function beginLaunchCountdown(L: LaunchState): LaunchState {
  if (L.launchSequence !== 'PRE_SIM') return L;
  return {
    ...L,
    launchSequence: 'COUNTDOWN',
    countdownSec: 3,
  };
}

export function separateLaunchStage(L: LaunchState): LaunchState {
  const next = { ...L };
  if (!next.srbSeparated && next.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM) {
    next.srbSeparated = true;
    next.fuelPct = 100;
    next.stagePrompt = null;
    return next;
  }
  if (next.srbSeparated && !next.coreSeparated && next.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM) {
    next.coreSeparated = true;
    next.fuelPct = 100;
    next.stagePrompt = null;
    return next;
  }
  return next;
}

/** Smooth 1976 US Standard Atmosphere exponential density approximation (SI kg/m^3) */
function computeEarthAirDensitySI(altM: number): number {
  if (altM <= 0) return 1.225;
  if (altM > 140_000) return 0;
  // Two-layer scale height fit: troposphere/stratosphere H=7.6km up to 50km, thermosphere blend above
  return altM < 50_000
    ? 1.225 * Math.exp(-altM / 7650)
    : 1.225 * Math.exp(-50_000 / 7650) * Math.exp(-(altM - 50_000) / 6800);
}

/** Mach-dependent drag coefficient curve for slender 11.7:1 launch vehicle */
function computeSlsDragCoeff(speedMs: number, altM: number): number {
  const tempK = Math.max(195, 288.15 - 0.0065 * Math.min(altM, 14_300));
  const soundSpeed = Math.sqrt(1.4 * 287.05 * tempK);
  const mach = speedMs / soundSpeed;
  if (mach < 0.8) return 0.28;
  if (mach < 1.25) return 0.28 + ((mach - 0.8) / 0.45) * 0.34; // Transonic wave drag peak (~0.62 at Mach 1.25)
  if (mach < 3.0) return Math.max(0.24, 0.62 - ((mach - 1.25) / 1.75) * 0.34);
  return 0.22;
}

export function stepLaunchPhysics(
  state: LaunchState,
  input: Pick<InputState, 'forward' | 'left' | 'right' | 'action'> & { stabilize?: boolean },
  rawDt: number
): LaunchState {
  const dt = Math.min(rawDt, 0.05);
  let L: LaunchState = { ...state };

  if (L.launchSequence === 'PRE_SIM') {
    return L;
  }

  if (L.launchSequence === 'COUNTDOWN') {
    L.countdownSec = Math.max(0, L.countdownSec - dt);
    if (L.countdownSec <= 0.001) {
      L.countdownSec = 0;
      L.launchSequence = 'READY';
    }
    // Never auto-launch after countdown reaches zero; await player SPACE or W
    return L;
  }

  if (L.launchSequence === 'READY') {
    if (input.forward || input.action) {
      L.ignited = true;
      L.launchSequence = 'ASCENDING';
      L.throttle = 1.0;
    } else {
      return L;
    }
  }

  if (!L.ignited) {
    return L;
  }

  // Once 165 km circular parking orbit is inserted, execute SECO-1 cutoff and coast cleanly
  // (preserving remaining ICPS LH2/LOX propellant for the manual/interactive TLI burn).
  if (L.orbitReached) {
    const rParkM = PHYSICS.EARTH_RADIUS_M + PHYSICS.SLS_ORBIT_TARGET_KM * 1000;
    const vParkMs = Math.sqrt(PHYSICS.EARTH_MU_M3_S2 / rParkM);
    L.throttle = 0;
    L.thrustKn = 0;
    L.dragKn = 0;
    L.twr = 0;
    L.netAccelMs2 = 0;
    L.pitchDeg = 90;
    L.altitudeKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.verticalSpeedMs = 0;
    L.horizontalSpeedMs = Math.round(vParkMs);
    L.orbitalVelocityTargetMs = Math.round(vParkMs);
    L.apoapsisKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.periapsisKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.orbitalEccentricity = 0;
    return L;
  }

  if (input.action) {
    L = separateLaunchStage(L);
  }

  L.throttle = clamp(L.throttle + 2.6 * dt, 0, L.fuelPct > 0 ? 1 : 0);

  // Realistic gravity-turn schedule:
  // - Vertical tower clear (< 0.5 km)
  // - Stage 0 atmospheric pitch-over (0.5..45 km -> 74°) keeping vertical speed ~550 m/s
  // - Core stage downrange acceleration holding 85-106 km until ~7.0 km/s before crossing 110 km MECO
  // - ICPS RL10B-2 circularization climb from 110 km to 165 km orbit
  const altKmNow = L.altitudeKm;
  const speedNow = Math.hypot(L.verticalSpeedMs, L.horizontalSpeedMs);
  let nominalPitch = 0;
  if (altKmNow < 0.5) {
    nominalPitch = 0;
  } else if (!L.srbSeparated && altKmNow < PHYSICS.SLS_SRB_SEP_ALT_KM) {
    nominalPitch = Math.min(72, Math.pow((altKmNow - 0.5) / 44.5, 0.55) * 72);
  } else if (!L.coreSeparated) {
    if (speedNow < 6500 && altKmNow > 68) {
      // Gently shallow out climb around 90-106 km while Stage 1 burns horizontally up toward orbital speed
      const targetVy = clamp((106 - altKmNow) * 7.0, 50, 220);
      const vyErr = L.verticalSpeedMs - targetVy;
      nominalPitch = clamp(85 + vyErr * 0.08, 70, 102);
    } else if (speedNow >= 6500) {
      // Climb smoothly past 110 km MECO gate once Core approaches near-orbital speed
      nominalPitch = L.verticalSpeedMs < 240 ? 74 : 83;
    } else {
      nominalPitch = 72 + clamp((altKmNow - 45) / 23, 0, 1) * 14;
    }
  } else {
    // ICPS RL10B-2 upper stage: balance radial climb to 165 km with horizontal circularization
    const altErr = PHYSICS.SLS_ORBIT_TARGET_KM - altKmNow;
    const targetVy = clamp(altErr * 6.5, 0, 380);
    const vyErr = targetVy - L.verticalSpeedMs;
    nominalPitch = altErr > 2 ? clamp(83 - vyErr * 0.08, 58, 90) : 89.5;
  }

  if (L.autoGuidance) {
    L.pitchDeg += (nominalPitch - L.pitchDeg) * Math.min(1, 3.8 * dt);
  }
  if (input.left) L.pitchDeg = clamp(L.pitchDeg - 26 * dt, -18, 92);
  if (input.right) L.pitchDeg = clamp(L.pitchDeg + 26 * dt, -18, 92);
  if (input.stabilize && !L.stagePrompt) {
    L.pitchDeg += (nominalPitch - L.pitchDeg) * Math.min(1, 4.2 * dt);
  }

  const simDt = dt * PHYSICS.LAUNCH_TIME_SCALE;
  L.elapsed += simDt;

  const altM = L.altitudeKm * 1000;
  const rEarth = PHYSICS.EARTH_RADIUS_M;
  const r = rEarth + altM;
  const airDensity = computeEarthAirDensitySI(altM);
  L.airDensityKgM3 = airDensity;

  const atmFrac = clamp(airDensity / 1.225, 0, 1);
  const speed = Math.hypot(L.verticalSpeedMs, L.horizontalSpeedMs);
  const qPa = 0.5 * airDensity * speed * speed;
  L.dynamicPressureKpa = qPa / 1000;

  // True SI stage propellant & dry masses
  const stagePropTotalKg = L.coreSeparated
    ? PHYSICS.SLS_ICPS_PROP_KG
    : L.srbSeparated
      ? PHYSICS.SLS_CORE_PROP_KG
      : PHYSICS.SLS_FIRST_STAGE_PROP_KG;

  const stageBaseDryKg = L.coreSeparated
    ? PHYSICS.SLS_ICPS_DRY_KG
    : L.srbSeparated
      ? PHYSICS.SLS_CORE_DRY_KG
      : PHYSICS.SLS_LIFTOFF_MASS_KG - PHYSICS.SLS_FIRST_STAGE_PROP_KG;

  const massKg = stageBaseDryKg + stagePropTotalKg * (L.fuelPct / 100);

  // Stage thrust & specific impulse (Isp) interpolated between sea level & vacuum
  const maxStageThrustN = L.coreSeparated
    ? PHYSICS.SLS_ICPS_THRUST_N
    : L.srbSeparated
      ? PHYSICS.SLS_CORE_THRUST_N
      : PHYSICS.SLS_STAGE0_VAC_THRUST_N -
        (PHYSICS.SLS_STAGE0_VAC_THRUST_N - PHYSICS.SLS_LIFTOFF_THRUST_N) * atmFrac;

  const ispS = L.coreSeparated
    ? PHYSICS.SLS_ICPS_ISP_VAC_S
    : L.srbSeparated
      ? PHYSICS.SLS_CORE_ISP_VAC_S
      : PHYSICS.SLS_STAGE0_ISP_VAC_S -
        (PHYSICS.SLS_STAGE0_ISP_VAC_S - PHYSICS.SLS_STAGE0_ISP_SL_S) * atmFrac;

  const thrustN = maxStageThrustN * L.throttle;

  const pitchRad = (L.pitchDeg * Math.PI) / 180;
  const gravityMs2 = PHYSICS.EARTH_MU_M3_S2 / (r * r);
  const gravityN = massKg * gravityMs2;

  // Real atmospheric aerodynamic drag
  const cd = computeSlsDragCoeff(speed, altM);
  const refArea = L.coreSeparated ? 20.4 : L.srbSeparated ? 55.4 : PHYSICS.SLS_DRAG_AREA_M2;
  const dragN = qPa * cd * refArea;
  const vertDragN = speed > 0 ? dragN * (L.verticalSpeedMs / speed) : 0;
  const horizDragN = speed > 0 ? dragN * (L.horizontalSpeedMs / speed) : 0;

  // Exact spherical Earth radial & tangential dynamics (zero fake gravity multipliers!)
  const centrifugalAccel = (L.horizontalSpeedMs * L.horizontalSpeedMs) / r;
  const coriolisAccel = (L.verticalSpeedMs * L.horizontalSpeedMs) / r;

  const rawVertAccel = (thrustN * Math.cos(pitchRad) - vertDragN) / massKg - gravityMs2 + centrifugalAccel;
  const onPad = altM <= 0.001 && L.verticalSpeedMs <= 0.001;
  const vertAccel = onPad ? Math.max(0, rawVertAccel) : rawVertAccel;

  const rawHorizAccel = (thrustN * Math.sin(pitchRad) - horizDragN) / massKg - coriolisAccel;
  const horizAccel = L.verticalSpeedMs > 0.5 || !onPad ? rawHorizAccel : 0;

  L.massKg = Math.round(massKg);
  L.thrustKn = thrustN / 1000;
  L.dragKn = dragN / 1000;
  L.ispS = Math.round(ispS);
  L.twr = Math.round((thrustN / Math.max(1, gravityN)) * 100) / 100;
  L.netAccelMs2 = Math.hypot(vertAccel, horizAccel);

  const prevVy = L.verticalSpeedMs;
  // Clamp vertical speed >= 0 during orbital circularization glide while ICPS completes horizontal burn
  L.verticalSpeedMs = L.coreSeparated && altKmNow >= PHYSICS.SLS_ORBIT_TARGET_KM
    ? Math.max(0, L.verticalSpeedMs + vertAccel * simDt)
    : Math.max(-20, L.verticalSpeedMs + vertAccel * simDt);
  L.horizontalSpeedMs = Math.max(0, L.horizontalSpeedMs + horizAccel * simDt);
  L.altitudeKm = Math.max(0, L.altitudeKm + ((prevVy + L.verticalSpeedMs) * 0.5 * simDt) / 1000);

  // True Tsiolkovsky propellant depletion: dm/dt = Thrust / (Isp * g0)
  const mdotKgS = thrustN > 0 ? thrustN / (ispS * PHYSICS.EARTH_GRAVITY) : 0;
  const fuelPctBurn = (mdotKgS * simDt * 100) / Math.max(1, stagePropTotalKg);
  L.fuelPct = Math.max(0, L.fuelPct - fuelPctBurn);
  L.deltaVExpendedMs = Math.round(L.deltaVExpendedMs + (thrustN / Math.max(1, massKg)) * simDt);

  // Auto-stage on empty propellant after crossing stage altitude gates
  if (!L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && L.fuelPct <= 2.5) {
    L.srbSeparated = true;
    L.fuelPct = 100;
  }
  if (L.srbSeparated && !L.coreSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM && L.fuelPct <= 2.5) {
    L.coreSeparated = true;
    L.fuelPct = 100;
  }
  if (L.srbSeparated && !L.lasJettisoned && L.altitudeKm >= PHYSICS.SLS_LAS_JETTISON_ALT_KM) {
    L.lasJettisoned = true;
  }

  if (!L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM) {
    L.stagePrompt = 'SRB_SEP';
  } else if (L.srbSeparated && !L.coreSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM) {
    L.stagePrompt = 'CORE_SEP';
  } else {
    L.stagePrompt = null;
  }

  // Real vis-viva orbital element diagnostics
  const rNow = rEarth + L.altitudeKm * 1000;
  const vNow = Math.hypot(L.verticalSpeedMs, L.horizontalSpeedMs);
  const vCircMs = Math.sqrt(PHYSICS.EARTH_MU_M3_S2 / rNow);
  L.orbitalVelocityTargetMs = Math.round(vCircMs);

  const specEnergy = 0.5 * vNow * vNow - PHYSICS.EARTH_MU_M3_S2 / rNow;
  const hAng = rNow * L.horizontalSpeedMs;
  const eccSq = Math.max(0, 1 + (2 * specEnergy * hAng * hAng) / Math.pow(PHYSICS.EARTH_MU_M3_S2, 2));
  const ecc = Math.sqrt(eccSq);
  L.orbitalEccentricity = Math.round(ecc * 1000) / 1000;

  if (specEnergy < -1) {
    const aOrbit = -PHYSICS.EARTH_MU_M3_S2 / (2 * specEnergy);
    L.apoapsisKm = Math.round((aOrbit * (1 + ecc) - rEarth) / 1000);
    L.periapsisKm = Math.round((aOrbit * (1 - ecc) - rEarth) / 1000);
  } else {
    L.apoapsisKm = Math.round(L.altitudeKm + 9999);
    L.periapsisKm = Math.round((rNow - rEarth) / 1000);
  }

  // True orbital insertion gate: requires upper stage active, target altitude AND orbital velocity >= 95% circular speed
  if (L.coreSeparated && L.altitudeKm >= PHYSICS.SLS_ORBIT_TARGET_KM && vNow >= vCircMs * 0.95) {
    const rParkM = rEarth + PHYSICS.SLS_ORBIT_TARGET_KM * 1000;
    const vParkMs = Math.sqrt(PHYSICS.EARTH_MU_M3_S2 / rParkM);
    L.orbitReached = true;
    L.altitudeKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.verticalSpeedMs = 0;
    L.horizontalSpeedMs = Math.round(Math.max(vParkMs, Math.min(vNow, vParkMs * 1.03)));
    L.throttle = 0;
    L.thrustKn = 0;
    L.twr = 0;
    L.pitchDeg = 90;
    L.apoapsisKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.periapsisKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.orbitalEccentricity = 0;
  }

  return L;
}

export function createInitialSpaceFlightState(
  missionId: CampaignMissionId = 'artemis-2',
  carryover?: Partial<CampaignCarryoverState>
): SpaceFlightState {
  const defaultTarget: SpaceTargetId =
    missionId === 'artemis-4'
      ? 'gateway'
      : missionId === 'mars-pathfinder'
        ? 'mars'
        : carryover?.relaySatelliteOnline
          ? 'moon'
          : 'relay-orbit';

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

  return {
    shipX: spawn.x,
    shipZ: spawn.z,
    vx: 0,
    vz: 0,
    headingRad: Math.atan2(liveTarget.x - spawn.x, liveTarget.z - spawn.z),
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
    statusText: satAlreadyOnline
      ? `Course ready for ${target.name}. Fly cleanly to orbital capture!`
      : 'Fly to HERMES Relay Orbit and hold [E / SPACE] to deploy & align the Orbital Satellite!',
    navBodyId: null,
    trajectoryRegime: 'Circular Orbit',
    orbitalSpeedKmS: 1.02,
    distanceFromSunAu: Math.round(metersToAu(earthSi.rM) * 1000) / 1000,
    distanceToTargetKm: 384400,
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

  const soiRadii =
    solarScaleMode === 'scientific'
      ? { moon: 0.65, earth: 4.2, mars: 3.2 }
      : solarScaleMode === 'local'
        ? { moon: 66.0, earth: 925.0, mars: 577.0 }
        : { moon: 2.9, earth: 10.5, mars: 7.5 };

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
    domMuScene = solarScaleMode === 'scientific' ? 0.14 : solarScaleMode === 'local' ? 22.0 : 3.2;
    domName = 'Moon';
  } else if (distEarth <= soiRadii.earth) {
    domId = 'earth';
    domPos = earthBodyPos;
    domDist = distEarth;
    domMuSi = PLANETARY_CATALOG_SI.earth.muM3S2;
    domMuScene = solarScaleMode === 'scientific' ? 0.45 : solarScaleMode === 'local' ? 140.0 : 12.0;
    domName = 'Earth';
  } else if (distMars <= soiRadii.mars) {
    domId = 'mars';
    domPos = marsBodyPos;
    domDist = distMars;
    domMuSi = PLANETARY_CATALOG_SI.mars.muM3S2;
    domMuScene = solarScaleMode === 'scientific' ? 0.22 : solarScaleMode === 'local' ? 48.0 : 5.4;
    domName = 'Mars';
  }

  let thrusting = input.forward;
  let braking = input.backward;

  const scaleSpeedMult =
    solarScaleMode === 'scientific'
      ? Math.max(1.0, distToTarget > 35 ? distToTarget * 0.28 : 2.5)
      : solarScaleMode === 'local'
        ? Math.max(1.8, Math.min(5.2, distToTarget * 0.06))
        : 1.0;

  const captureRadius =
    !navSpec && s.targetId === 'relay-orbit'
      ? targetRadius + (solarScaleMode === 'scientific' ? 0.55 : solarScaleMode === 'local' ? 4.2 : 3.2)
      : targetRadius +
        (solarScaleMode === 'scientific'
          ? Math.max(0.45, targetRadius * 2.5)
          : solarScaleMode === 'local'
            ? 4.6
            : 4.2);

  if (s.autoPilot) {
    let steerX = shipStartDx;
    let steerZ = shipStartDz;
    // If Earth lies directly between Orion and distant target during departure, arc cleanly around Earth's limb
    if (distToTarget > 2.2 && targetBodyId !== 'earth') {
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
    if (distToTarget > captureRadius * 0.72) {
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
    if (input.left) s.headingRad += 2.75 * dt;
    if (input.right) s.headingRad -= 2.75 * dt;
  }

  s.boostActive = Boolean(input.boost && thrusting && res.power > 5);

  const fwdX = Math.sin(s.headingRad);
  const fwdZ = Math.cos(s.headingRad);
  const accel =
    (s.boostActive ? 17.5 : 10.5) *
    (solarScaleMode === 'scientific'
      ? Math.max(1.0, scaleSpeedMult * 0.35)
      : solarScaleMode === 'local'
        ? 2.2
        : 1.0);

  if (thrusting && s.fuelPct > 0) {
    s.vx += fwdX * accel * dt;
    s.vz += fwdZ * accel * dt;
    s.fuelPct = Math.max(0, s.fuelPct - (s.boostActive ? 1.4 : 0.55) * fuelFactor * dt);
    if (s.boostActive) {
      res.power = Math.max(0, res.power - 2.0 * dt);
    }
  } else if (braking) {
    // RCS retro-thruster braking
    s.vx *= Math.max(0, 1 - 4.0 * dt);
    s.vz *= Math.max(0, 1 - 4.0 * dt);
  }

  // Central gravitational acceleration toward active dominant Sphere of Influence (SOI)
  // Skip gravity pull only while actively docked / holding station inside a target capture orbit.
  const domVisRadius = getBodyVisualRadiusUnits(domId, solarScaleMode);
  const rSoft = Math.max(domVisRadius * 1.25, domDist);
  const inStationHold =
    (distToTarget <= captureRadius &&
      (s.autoPilot || (s.inSatDeployZone && input.action) || (s.targetId === 'relay-orbit' && s.orbitalSat.linkLocked))) ||
    (s.autoPilot && distToTarget <= captureRadius * 0.8);

  if (!inStationHold && domMuScene > 0 && domDist > 0.02) {
    const gAccel = Math.min(accel * 0.42, domMuScene / (rSoft * rSoft));
    const gx = (domPos.x - s.shipX) / domDist;
    const gz = (domPos.z - s.shipZ) / domDist;
    s.vx += gx * gAccel * dt;
    s.vz += gz * gAccel * dt;
  } else if (inStationHold && !thrusting && !braking) {
    s.vx *= Math.max(0, 1 - 3.5 * dt);
    s.vz *= Math.max(0, 1 - 3.5 * dt);
  }

  const maxSpeed =
    (s.boostActive ? 28 : 18) *
    (solarScaleMode === 'scientific' || solarScaleMode === 'local' ? Math.max(1.0, scaleSpeedMult) : 1.0);
  const spd = Math.hypot(s.vx, s.vz);
  if (spd > maxSpeed) {
    s.vx = (s.vx / spd) * maxSpeed;
    s.vz = (s.vz / spd) * maxSpeed;
  }

  const bound = solarScaleMode === 'scientific' ? 12500 : solarScaleMode === 'local' ? 1500 : 280;
  s.shipX = clamp(s.shipX + s.vx * dt, -bound, bound);
  s.shipZ = clamp(s.shipZ + s.vz * dt, -bound, bound);
  s.elapsedDays += dt * (s.boostActive ? 1.4 : 0.6);

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
  const relayCaptureDist = solarScaleMode === 'scientific' ? 1.1 : solarScaleMode === 'local' ? 5.2 : 2.8;
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
  const extraCap = solarScaleMode === 'scientific' ? 1.2 : solarScaleMode === 'local' ? 3.8 : 4.8;
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
      domRadiusPhysM = Math.max(PLANETARY_CATALOG_SI.earth.meanRadiusM + 165_000, (domDist / 5.8) * 384_400_000);
    } else if (domId === 'moon') {
      domRadiusPhysM = Math.max(PLANETARY_CATALOG_SI.moon.meanRadiusM + 100_000, (domDist / 2.2) * 18_000_000);
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
  s.escapeVelocityKmS = Math.round((vEscPhysMs / 1000) * 100) / 100;
  s.orbitalEccentricity = Math.round(eccWell * 100) / 100;
  s.orbitalSpeedKmS = Math.round((vPhysMs / 1000) * 100) / 100;

  s.distanceFromSunAu = Math.round(sunAuNow * 1000) / 1000;
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

  if (s.orbitalSat.linkLocked && s.arrivedGateway) {
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

export function createInitialLandingState(
  massMultiplier: number,
  planet: SurfacePlanet = 'moon',
  isruFuelBonusPct = 0
): LandingState {
  const startFuel = clamp(84 + isruFuelBonusPct, 70, 100);
  const propKg = (PHYSICS.LANDER_PROP_MASS_KG * startFuel) / 100;
  const totalMass = (PHYSICS.LANDER_FIXED_MASS_KG + propKg) * massMultiplier;
  const gravity = planet === 'mars' ? PHYSICS.MARS_GRAVITY : PHYSICS.MOON_GRAVITY;
  const maxThrust =
    planet === 'mars' ? PHYSICS.LANDER_MARS_MAX_THRUST_N : PHYSICS.LANDER_MAX_THRUST_N;
  const hoverThrottlePct = Math.round(clamp(((totalMass * gravity) / maxThrust) * 100, 5, 95));
  const startY = planet === 'mars' ? 172 : 165;
  const startVy = planet === 'mars' ? -4.2 : -3.0;
  const startGround = getSurfaceTerrainHeight(planet, 0, -36);
  const startAlt = Math.max(0, startY - startGround);

  return {
    planet,
    x: 0,
    y: startY,
    z: -36,
    vx: 0,
    vy: startVy,
    vz: 2.2,
    rollDeg: 0,
    pitchDeg: 0,
    tiltDeg: 0,
    throttle: 0,
    targetThrottle: 0,
    thrustKn: 0,
    hoverThrottlePct,
    descentPhase: 'BRAKING',
    fuelPct: startFuel,
    massMultiplier,
    twr: 0,
    targetZoneId: 0,
    guidanceMode: 'MANUAL',
    contactLight: false,
    predX: 0,
    predZ: 0,
    distToPad: 36,
    gatesPassed: 0,
    gateBonusScore: 0,
    slopeDeg: 0,
    tGoSec: Math.round((startAlt / Math.max(0.5, Math.abs(startVy))) * 10) / 10,
    windSpeedMs: planet === 'mars' ? 1.8 : 0,
    autoCutoff: true,
    landed: false,
    result: null,
    score: 0,
  };
}

export function evaluateTouchdown(
  impactVy: number,
  horizSpeed: number,
  tiltDeg: number,
  slopeDeg = 0
): 'perfect' | 'hard' | 'crash' {
  const effectiveTilt = tiltDeg + slopeDeg * 0.45;
  if (
    impactVy > PHYSICS.LANDER_HARD_VY ||
    effectiveTilt > PHYSICS.LANDER_HARD_TILT ||
    horizSpeed > 4.6 ||
    slopeDeg > 20
  ) {
    return 'crash';
  }
  if (
    impactVy > PHYSICS.LANDER_PERFECT_VY ||
    effectiveTilt > PHYSICS.LANDER_PERFECT_TILT ||
    horizSpeed > 2.4 ||
    slopeDeg > 13
  ) {
    return 'hard';
  }
  return 'perfect';
}

export function stepLandingPhysics(
  state: LandingState,
  input: Pick<InputState, 'forward' | 'backward' | 'left' | 'right' | 'action' | 'tiltForward'> & {
    throttleDown?: boolean;
    cutoff?: boolean;
    killDrift?: boolean;
    directThrottle?: number;
  },
  rawDt: number,
  fragilePayload: boolean
): LandingState {
  const dt = Math.min(rawDt, 0.05);
  const f: LandingState = { ...state };
  if (f.landed) return f;

  const zones = getLandingZones(f.planet);
  const zone = zones[f.targetZoneId] || zones[0];
  const gravity = f.planet === 'mars' ? PHYSICS.MARS_GRAVITY : PHYSICS.MOON_GRAVITY;
  const maxThrust = f.planet === 'mars' ? PHYSICS.LANDER_MARS_MAX_THRUST_N : PHYSICS.LANDER_MAX_THRUST_N;

  const groundH = getSurfaceTerrainHeight(f.planet, f.x, f.z);
  const alt = Math.max(0, f.y - groundH);

  const propKg = (PHYSICS.LANDER_PROP_MASS_KG * f.fuelPct) / 100;
  const totalMass = (PHYSICS.LANDER_FIXED_MASS_KG + propKg) * f.massMultiplier;
  const hoverThrottle = (totalMass * gravity) / maxThrust;
  f.hoverThrottlePct = Math.round(clamp(hoverThrottle * 100, 5, 95));
  f.descentPhase = alt > 75 ? 'BRAKING' : alt > 18 ? 'APPROACH' : 'TERMINAL';

  const padGround = getSurfaceTerrainHeight(f.planet, zone.x, zone.z);
  const padAlt = Math.max(0, f.y - padGround);

  if (f.guidanceMode === 'AUTOLAND' && f.fuelPct > 0) {
    // Predictive Apollo E-Guidance / Mars G-FOLD powered descent controller
    const dx = zone.x - f.x;
    const dz = zone.z - f.z;
    const horizErr = Math.hypot(dx, dz);

    const gain = padAlt > 45 ? 0.34 : padAlt > 12 ? 0.45 : 0.62;
    const maxHoriz = padAlt > 35 ? 8.0 : padAlt > 12 ? 4.4 : padAlt > 4.5 ? 2.0 : 0.65;
    const desiredVx = clamp(dx * gain, -maxHoriz, maxHoriz);
    const desiredVz = clamp(dz * gain, -maxHoriz, maxHoriz);

    const maxTiltCmd = padAlt > 28 ? 19 : padAlt > 10 ? 13 : padAlt > 3.8 ? 6.0 : 0;
    const targetRoll = clamp(-(desiredVx - f.vx) * 6.5, -maxTiltCmd, maxTiltCmd);
    const targetPitch = clamp((desiredVz - f.vz) * 6.5, -maxTiltCmd, maxTiltCmd);

    f.rollDeg += (targetRoll - f.rollDeg) * Math.min(1, 7.2 * dt);
    f.pitchDeg += (targetPitch - f.pitchDeg) * Math.min(1, 7.2 * dt);

    const maxBrakeDecel = Math.max(0.9, (maxThrust * 0.74) / totalMass - gravity);
    let safeVy: number;
    if (padAlt > 75) {
      safeVy = -clamp(Math.sqrt(Math.max(0, padAlt - 14) * maxBrakeDecel * 0.44) + 1.6, 4.0, 12.5);
    } else if (padAlt > 18) {
      safeVy = -clamp(Math.sqrt(Math.max(0, padAlt - 4) * maxBrakeDecel * 0.36) + 0.9, 1.8, 5.2);
    } else if (padAlt > 4.5) {
      safeVy = -clamp(0.72 + (padAlt - 4.5) * 0.14, 0.72, 2.2);
    } else {
      safeVy = -0.68; // Apollo contact probe terminal descent (< 1.0 m/s)
    }

    // Hold or slow vertical descent briefly if far off-pad so AUTOLAND centers cleanly over ANY zone
    if (padAlt > 9 && padAlt < 55 && horizErr > Math.max(2.6, padAlt * 0.44) && f.fuelPct > 14) {
      safeVy = Math.max(safeVy, -0.35);
    }

    const curTiltRad = (Math.hypot(f.rollDeg, f.pitchDeg) * Math.PI) / 180;
    const cosTilt = Math.max(0.55, Math.cos(curTiltRad));
    const reqAccelY = gravity + (safeVy - f.vy) * (padAlt < 18 ? 3.4 : 2.3);
    const cmdThrottle = clamp((reqAccelY * totalMass) / (maxThrust * cosTilt), 0.1, 1.0);
    f.throttle += (cmdThrottle - f.throttle) * Math.min(1, 9.0 * dt);
    f.targetThrottle = f.throttle;
  } else {
    if (typeof input.directThrottle === 'number') {
      f.targetThrottle = clamp(input.directThrottle, 0, 1);
    } else if (input.cutoff) {
      f.targetThrottle = 0;
    }

    if (f.guidanceMode === 'RATE_ASSIST' && f.fuelPct > 0) {
      let targetVy = alt > 28 ? -2.2 : alt > 8 ? -1.2 : -0.75;
      if (input.forward) targetVy += 2.0;
      if (input.action) targetVy = 0.75;
      if (input.throttleDown) targetVy -= 1.8;
      const curTiltRad = (Math.hypot(f.rollDeg, f.pitchDeg) * Math.PI) / 180;
      const cosTilt = Math.max(0.55, Math.cos(curTiltRad));
      const cmdThrottle = clamp(
        ((gravity + (targetVy - f.vy) * 2.4) * totalMass) / (maxThrust * cosTilt),
        input.cutoff ? 0 : 0.1,
        1.0
      );
      f.throttle += (cmdThrottle - f.throttle) * Math.min(1, 8.0 * dt);
      f.targetThrottle = f.throttle;
    } else {
      // Sticky NASA pintle injector chamber pressure (DPS / MLE)
      if (input.forward && f.fuelPct > 0) {
        if (f.targetThrottle < 0.08) {
          f.targetThrottle = 0.1; // Instant 10% pintle ignition idle
        } else {
          f.targetThrottle = clamp(f.targetThrottle + 0.52 * dt, 0.1, 1);
        }
      } else if (input.throttleDown) {
        f.targetThrottle = clamp(f.targetThrottle - 0.55 * dt, 0, 1);
      }

      const effectiveTarget =
        f.fuelPct <= 0 ? 0 : input.action ? 1.0 : f.targetThrottle;
      f.throttle += (effectiveTarget - f.throttle) * Math.min(1, 9.0 * dt);
      if (f.throttle < 0.005 && effectiveTarget === 0) f.throttle = 0;
    }

    if (input.left) f.rollDeg = clamp(f.rollDeg + 42 * dt, -26, 26);
    else if (input.right) f.rollDeg = clamp(f.rollDeg - 42 * dt, -26, 26);
    else f.rollDeg *= Math.max(0, 1 - 5.2 * dt);

    if (input.backward) f.pitchDeg = clamp(f.pitchDeg - 38 * dt, -22, 22);
    else if (input.tiltForward) f.pitchDeg = clamp(f.pitchDeg + 38 * dt, -22, 22);
    else f.pitchDeg *= Math.max(0, 1 - 5.2 * dt);
  }

  // Contact Light Apollo Engine Auto-Cutoff for gentle kiss touchdown
  const shouldAutoCut =
    f.autoCutoff &&
    f.contactLight &&
    Math.abs(f.vy) <= (f.guidanceMode === 'AUTOLAND' ? 1.35 : 2.35) &&
    f.tiltDeg <= (f.guidanceMode === 'AUTOLAND' ? 5.0 : 11.0) &&
    Math.hypot(f.vx, f.vz) <= 2.3;
  if (shouldAutoCut) {
    f.throttle = 0;
    f.targetThrottle = 0;
  }

  f.tiltDeg = Math.hypot(f.rollDeg, f.pitchDeg);

  const thrustForce = f.fuelPct > 0 ? maxThrust * f.throttle : 0;
  f.thrustKn = thrustForce / 1000;
  const weightN = totalMass * gravity;
  f.twr = weightN > 0 ? thrustForce / weightN : 0;

  const rollRad = (f.rollDeg * Math.PI) / 180;
  const pitchRad = (f.pitchDeg * Math.PI) / 180;
  const tiltRad = (f.tiltDeg * Math.PI) / 180;

  // Mild thin-air drag + realistic mid-altitude crosswind shear on Mars
  const atmoDragY = f.planet === 'mars' ? -f.vy * 0.045 : 0;
  const marsWindAccelX =
    f.planet === 'mars' && alt > 18 && alt < 120
      ? Math.sin(alt * 0.055) * 0.18
      : 0;
  f.windSpeedMs =
    f.planet === 'mars' ? Math.round(Math.abs(Math.sin(alt * 0.055) * 2.4 + 0.8) * 10) / 10 : 0;

  const ay = (thrustForce * Math.cos(tiltRad)) / totalMass - gravity + atmoDragY;
  let ax = -(thrustForce * Math.sin(rollRad)) / totalMass + marsWindAccelX;
  let az = (thrustForce * Math.sin(pitchRad)) / totalMass;

  if (f.guidanceMode !== 'AUTOLAND') {
    if (input.left) ax -= 1.85;
    if (input.right) ax += 1.85;
    if (input.backward) az -= 1.85;
    if (input.tiltForward) az += 1.85;
  }

  // Active RCS lateral drift cancellation ([B] / Kill Drift or RATE_ASSIST auto-stabilizer)
  if (input.killDrift && f.fuelPct > 0) {
    ax -= clamp(f.vx * 3.8, -6.5, 6.5);
    az -= clamp(f.vz * 3.8, -6.5, 6.5);
    f.fuelPct = Math.max(0, f.fuelPct - 0.18 * dt);
  } else if (f.guidanceMode === 'RATE_ASSIST') {
    if (!input.left && !input.right && Math.abs(f.vx) > 0.04) {
      ax -= clamp(f.vx * 1.9, -2.8, 2.8);
    }
    if (!input.backward && !input.tiltForward && Math.abs(f.vz) > 0.04) {
      az -= clamp(f.vz * 1.9, -2.8, 2.8);
    }
  } else if (f.guidanceMode !== 'AUTOLAND') {
    if (!input.left && !input.right && Math.abs(f.vx) > 0.08) {
      ax -= Math.sign(f.vx) * 0.9;
    }
    if (!input.backward && !input.tiltForward && alt < 55 && Math.abs(f.vz) > 0.08) {
      az -= Math.sign(f.vz) * 0.9;
    }
  }

  f.vy += ay * dt;
  f.vx += ax * dt;
  f.vz += az * dt;

  f.x += f.vx * dt;
  f.y += f.vy * dt;
  f.z += f.vz * dt;

  const estFallTime = clamp(alt / Math.max(1.2, Math.abs(f.vy)), 0.15, 10);
  f.predX = f.x + f.vx * estFallTime * 0.65;
  f.predZ = f.z + f.vz * estFallTime * 0.65;
  f.slopeDeg = Math.round(getSurfaceSlopeDeg(f.planet, f.predX, f.predZ) * 10) / 10;
  f.tGoSec = Math.round(clamp(alt / Math.max(0.5, -f.vy), 0, 99.9) * 10) / 10;

  if (f.throttle > 0 && f.fuelPct > 0) {
    const kgBurned = PHYSICS.LANDER_FUEL_FLOW_KG_S * f.throttle * dt;
    f.fuelPct = Math.max(0, f.fuelPct - (kgBurned / PHYSICS.LANDER_PROP_MASS_KG) * 100);
  }

  const nextGroundH = getSurfaceTerrainHeight(f.planet, f.x, f.z);
  const nextAlt = Math.max(0, f.y - nextGroundH);
  f.contactLight = nextAlt <= 1.75;
  f.distToPad = Math.hypot(f.x - zone.x, f.z - zone.z);

  if (f.y <= nextGroundH) {
    f.y = nextGroundH;
    f.landed = true;
    f.throttle = 0;
    f.targetThrottle = 0;
    f.thrustKn = 0;
    f.tGoSec = 0;

    const impactVy = Math.abs(f.vy);
    const horiz = Math.hypot(f.vx, f.vz);
    const groundSlope =
      f.distToPad <= zone.radius + 3.5 ? 0 : getSurfaceSlopeDeg(f.planet, f.x, f.z);
    f.slopeDeg = Math.round(groundSlope * 10) / 10;
    f.result = evaluateTouchdown(impactVy, horiz, f.tiltDeg, groundSlope);
    f.vx = 0;
    f.vy = 0;
    f.vz = 0;

    if (f.result !== 'crash') {
      f.rollDeg = 0;
      f.pitchDeg = 0;
      f.tiltDeg = 0;
      const inZone = f.distToPad <= zone.radius + 3.5;
      const basePts = f.result === 'perfect' ? 1000 : 450;
      const padBonus = inZone ? zone.bonusPts : 100;
      const fragilePenalty = f.result === 'hard' && fragilePayload ? 0.6 : 1.0;
      f.score = Math.round(
        (basePts + Math.round(f.fuelPct * 8) + padBonus + f.gateBonusScore) *
          (inZone ? zone.multiplier : 1.0) *
          fragilePenalty
      );
    }
  }

  return f;
}

export function createInitialRoverState(
  startX = 6,
  startZ = 6,
  planet: SurfacePlanet = 'moon'
): RoverState {
  return {
    planet,
    x: startX,
    y: getSurfaceTerrainHeight(planet, startX, startZ),
    z: startZ,
    headingRad: 0,
    speed: 0,
    steerAngleRad: 0,
    pitchRad: 0,
    rollRad: 0,
    wheelAngle: 0,
    walkPhase: 0,
    wheelOffsets: [0, 0, 0, 0],
    driveMode: 'DRIVE',
    highClearance: false,
    headlightsOn: true,
    wheelSlipPct: 0,
    hydrogenSignal: 18,
    dustAccumulationPct: planet === 'mars' ? 8 : 0,
    collisionLabel: '',
  };
}

export function stepRoverPhysics(
  state: RoverState,
  input: Pick<InputState, 'forward' | 'backward' | 'left' | 'right'>,
  colliders: RoverCollider[],
  rawDt: number
): RoverState {
  const dt = Math.min(rawDt, 0.05);
  const r: RoverState = {
    ...state,
    wheelOffsets: [...state.wheelOffsets] as [number, number, number, number],
  };

  const gravity = r.planet === 'mars' ? PHYSICS.MARS_GRAVITY : PHYSICS.MOON_GRAVITY;
  const fwdX = Math.sin(r.headingRad);
  const fwdZ = Math.cos(r.headingRad);
  const rightX = Math.cos(r.headingRad);
  const rightZ = -Math.sin(r.headingRad);

  const isWalker = r.driveMode === 'WALKER';
  const maxSpeed = isWalker ? PHYSICS.ROVER_WALKER_SPEED : PHYSICS.ROVER_MAX_SPEED;
  const slopeGravity = Math.sin(r.pitchRad) * gravity * 0.42;

  if (r.driveMode === 'SPIN') {
    r.speed *= Math.max(0, 1 - 6 * dt);
    const spinDir = input.left ? 1 : input.right ? -1 : input.forward ? 1 : input.backward ? -1 : 0;
    r.headingRad += spinDir * PHYSICS.ROVER_TURN_RATE * 1.45 * dt;
    r.wheelAngle += spinDir * dt * 3.4;
  } else {
    if (input.forward) {
      r.speed = Math.min(maxSpeed, r.speed + (PHYSICS.ROVER_ACCEL + slopeGravity) * dt);
    } else if (input.backward) {
      r.speed = Math.max(-maxSpeed * 0.55, r.speed - (PHYSICS.ROVER_ACCEL * 1.4 - slopeGravity) * dt);
    } else {
      r.speed *= Math.max(0, 1 - 2.6 * dt);
      if (Math.abs(r.speed) < 0.03) r.speed = 0;
    }
  }

  if (isWalker && (input.forward || input.backward || Math.abs(r.speed) > 0.15)) {
    r.walkPhase += dt * 7.2;
  }

  const targetSteer = input.left ? 0.52 : input.right ? -0.52 : 0;
  r.steerAngleRad += (targetSteer - r.steerAngleRad) * Math.min(1, 10 * dt);

  let vx = 0;
  let vz = 0;
  if (r.driveMode === 'CRAB') {
    const crabHeading = r.headingRad - r.steerAngleRad * 1.15;
    vx = Math.sin(crabHeading) * r.speed;
    vz = Math.cos(crabHeading) * r.speed;
  } else if (r.driveMode !== 'SPIN') {
    const yawRate = (r.speed * Math.tan(r.steerAngleRad)) / PHYSICS.ROVER_WHEELBASE;
    r.headingRad += yawRate * dt;
    vx = Math.sin(r.headingRad) * r.speed;
    vz = Math.cos(r.headingRad) * r.speed;
  }

  let nextX = r.x + vx * dt;
  let nextZ = r.z + vz * dt;

  const roverRadius = isWalker ? 0.95 : 1.18;
  let collisionLabel = '';
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (isWalker && col.type === 'rock' && col.r < 0.78) {
      continue;
    }
    const dx = nextX - col.x;
    const dz = nextZ - col.z;
    const dist = Math.hypot(dx, dz);
    const minDist = roverRadius + col.r;

    if (dist < minDist && dist > 0.0001) {
      const nx = dx / dist;
      const nz = dz / dist;
      const overlap = minDist - dist;
      nextX += nx * overlap;
      nextZ += nz * overlap;

      const dot = vx * nx + vz * nz;
      if (dot < 0) {
        vx -= dot * nx;
        vz -= dot * nz;
        const projectedSpeed = vx * fwdX + vz * fwdZ;
        r.speed = projectedSpeed;
      }
      collisionLabel = col.label;
    }
  }

  r.collisionLabel = collisionLabel;
  const bound = PHYSICS.SURFACE_BOUND_M;
  r.x = clamp(nextX, -bound, bound);
  r.z = clamp(nextZ, -bound, bound);

  const centerGround = getSurfaceTerrainHeight(r.planet, r.x, r.z);
  r.y = centerGround;

  const wheelCoords: [number, number][] = [
    [-0.78, 0.95],
    [0.78, 0.95],
    [-0.78, -0.95],
    [0.78, -0.95],
  ];
  const wheelGrounds = wheelCoords.map(([lx, lz]) => {
    const wx = r.x + rightX * lx + fwdX * lz;
    const wz = r.z + rightZ * lx + fwdZ * lz;
    return getSurfaceTerrainHeight(r.planet, wx, wz);
  });

  const avgFront = (wheelGrounds[0] + wheelGrounds[1]) * 0.5;
  const avgRear = (wheelGrounds[2] + wheelGrounds[3]) * 0.5;
  const avgLeft = (wheelGrounds[0] + wheelGrounds[2]) * 0.5;
  const avgRight = (wheelGrounds[1] + wheelGrounds[3]) * 0.5;

  const targetPitch = -Math.atan2(avgFront - avgRear, 1.9);
  const targetRoll = Math.atan2(avgLeft - avgRight, 1.56);
  r.pitchRad += (targetPitch - r.pitchRad) * Math.min(1, 10 * dt);
  r.rollRad += (targetRoll - r.rollRad) * Math.min(1, 10 * dt);

  if (r.driveMode !== 'SPIN') {
    r.wheelAngle += (r.speed * dt) / 0.25;
  }

  const diagonalPhases = [0, Math.PI, Math.PI, 0];
  for (let i = 0; i < 4; i++) {
    const terrainFollow = clamp(wheelGrounds[i] - centerGround, -0.22, 0.28);
    const stepLift = isWalker
      ? Math.max(0, Math.sin(r.walkPhase + diagonalPhases[i])) * 0.28
      : 0;
    r.wheelOffsets[i] = terrainFollow + stepLift;
  }

  if (r.planet === 'mars') {
    // Signal tracks organic/clay delta & carbonate shelves; high wind near Máaz clears dust
    const distDelta = Math.hypot(r.x - 126, r.z + 134);
    const distCarb = Math.hypot(r.x - 112, r.z - 142);
    const nearestSig = Math.min(distDelta, distCarb);
    r.hydrogenSignal = Math.round(Math.max(14, 220 * Math.exp(-nearestSig / 52)));

    const dMaaz = Math.hypot(r.x + 148, r.z + 96);
    if (dMaaz < 34) {
      r.dustAccumulationPct = clamp(r.dustAccumulationPct - 6.5 * dt, 2, 65);
    } else if (Math.abs(r.speed) > 0.5) {
      r.dustAccumulationPct = clamp(r.dustAccumulationPct + 0.42 * dt, 2, 65);
    }
  } else {
    const distShack = Math.hypot(r.x - 128, r.z + 142);
    const distCabeus = Math.hypot(r.x + 124, r.z - 152);
    const nearestIce = Math.min(distShack, distCabeus);
    r.hydrogenSignal = Math.round(Math.max(12, 240 * Math.exp(-nearestIce / 52)));
    r.dustAccumulationPct = 0;
  }

  const slopeRatio = Math.abs(Math.sin(r.pitchRad)) + Math.abs(Math.sin(r.rollRad));
  const gravSlipFactor = r.planet === 'mars' ? 0.88 : 1.0;
  r.wheelSlipPct = isWalker
    ? Math.min(12, Math.round(slopeRatio * 18 * gravSlipFactor))
    : Math.min(44, Math.round((slopeRatio * 48 + Math.abs(r.speed) * 1.35) * gravSlipFactor));

  return r;
}

export function applyAnomalyDecision(
  resources: ResourceState,
  carryover: CampaignCarryoverState,
  anomalyId: string,
  choiceId: string
): {
  resources: ResourceState;
  carryover: CampaignCarryoverState;
  scienceMultiplier: number;
  summary: string;
  isOptimal: boolean;
} {
  const anomaly = CAMPAIGN_ANOMALIES.find((a) => a.id === anomalyId);
  const choice = anomaly?.choices.find((c) => c.id === choiceId);
  if (!anomaly || !choice) {
    return {
      resources,
      carryover,
      scienceMultiplier: 1.0,
      summary: 'Telemetry acknowledged.',
      isOptimal: false,
    };
  }

  // Carryover bonus: regolith berms cut SPE radiation dose
  const bermReduction = clamp(carryover.regolithShieldLevel * 0.25, 0, 0.5);
  const effectiveDose = Math.round(choice.doseDeltaMsv * (1 - bermReduction));

  const nextResources: ResourceState = {
    power: clamp(resources.power + (choice.deltaResources.power || 0), 0, 100),
    oxygen: clamp(resources.oxygen + (choice.deltaResources.oxygen || 0), 0, 100),
    shield: clamp(resources.shield + (choice.deltaResources.shield || 0), 0, 100),
  };

  const nextCarryover: CampaignCarryoverState = {
    ...carryover,
    radiationDoseMsv: Math.max(0, carryover.radiationDoseMsv + effectiveDose),
    solvedAnomalies: carryover.solvedAnomalies.includes(anomalyId)
      ? carryover.solvedAnomalies
      : [...carryover.solvedAnomalies, anomalyId],
    unlockedFieldNotes: carryover.unlockedFieldNotes.includes(anomaly.requiredNoteId)
      ? carryover.unlockedFieldNotes
      : [...carryover.unlockedFieldNotes, anomaly.requiredNoteId],
  };

  return {
    resources: nextResources,
    carryover: nextCarryover,
    scienceMultiplier: choice.scienceMultiplier,
    summary: `${choice.rationale} (Crew dose +${effectiveDose} mSv · Total ${nextCarryover.radiationDoseMsv} mSv)`,
    isOptimal: choice.isOptimal,
  };
}

export type OutpostDecisionId = 'boost-shield' | 'life-support' | 'push-science';

export function applyOutpostDecision(
  resources: ResourceState,
  decision: OutpostDecisionId
): { resources: ResourceState; scienceMultiplier: number; summary: string } {
  const next = { ...resources };

  if (decision === 'boost-shield') {
    next.power = clamp(next.power - 22, 0, 100);
    next.shield = clamp(next.shield + 26, 0, 100);
    return {
      resources: next,
      scienceMultiplier: 0.9,
      summary: 'Magnetic Shield Boosted (+26% Shield, -22% Power). Science slows slightly.',
    };
  }

  if (decision === 'life-support') {
    next.power = clamp(next.power - 16, 0, 100);
    next.oxygen = clamp(next.oxygen + 22, 0, 100);
    next.shield = clamp(next.shield - 10, 0, 100);
    return {
      resources: next,
      scienceMultiplier: 1.0,
      summary: 'Oxygen Recycler Boosted (+22% Oxygen, -16% Power, -10% Shield).',
    };
  }

  next.power = clamp(next.power - 14, 0, 100);
  next.shield = clamp(next.shield - 15, 0, 100);
  return {
    resources: next,
    scienceMultiplier: 1.4,
    summary: 'Full Drill Power (+40% Drill Speed, -14% Power, -15% Shield).',
  };
}
