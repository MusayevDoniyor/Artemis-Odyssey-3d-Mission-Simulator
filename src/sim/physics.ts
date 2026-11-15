import {
  CAMPAIGN_ANOMALIES,
  PAYLOADS,
  PHYSICS,
  SOLAR_TARGETS,
  getLandingZones,
} from '../game/constants';
import {
  SOLAR_SUN_ORIGIN_X,
  SOLAR_SUN_ORIGIN_Z,
  SOLAR_SYSTEM_BODIES,
  type SolarScaleMode,
  computeKeplerBodyPosition,
  getLiveSolarTargetPosition,
  getShipSpawnForMission,
} from '../game/solarSystemData';
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
} from '../game/types';
import {
  PLANETARY_CATALOG_SI,
  SI,
  metersToAu,
  metersToKm,
} from '../game/planetaryCatalog';
import {
  classifySpacecraftTrajectory,
  computeBodyCartesianSI,
  getBodyVisualRadiusUnits,
} from '../game/orbitalMechanics';

export * from './common/math';
export * from './launch/launchPhysics';
export * from './landing/landingPhysics';
export * from './rover/roverPhysics';

import {
  clamp,
  getLunarTerrainHeight,
  getSurfaceTerrainHeight,
  getSurfaceSlopeDeg,
} from './common/math';
import {
  createInitialLaunchState,
  beginLaunchCountdown,
  separateLaunchStage,
  resolveLaunchPhaseStage,
  stepLaunchPhysics,
} from './launch/launchPhysics';

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
