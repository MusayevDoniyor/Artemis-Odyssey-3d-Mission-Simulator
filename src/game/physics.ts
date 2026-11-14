import {
  CAMPAIGN_ANOMALIES,
  PAYLOADS,
  PHYSICS,
  SOLAR_TARGETS,
  getLandingZones,
} from './constants';
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
    // Jezero Crater sedimentary ripples + dry paleolake channel
    let h =
      Math.sin(x * 0.038 + 0.6) * Math.cos(z * 0.042) * 2.1 +
      Math.sin(x * 0.095) * Math.cos(z * 0.08 + 1.2) * 0.85;

    // Ancient Delta Fan Terraces near (54, -58)
    const dDelta = Math.hypot(x - 54, z + 58);
    if (dDelta < 24) {
      h += Math.cos((dDelta / 24) * (Math.PI / 2)) * 3.4;
    }

    // Dry River Channel winding toward Base Delta
    const channelDist = Math.abs(z + x * 0.65 - 12);
    if (channelDist < 12 && distPad > 22) {
      h -= Math.cos((channelDist / 12) * (Math.PI / 2)) * 2.1;
    }

    // Máaz Basalt Ridge at (-66, -42)
    const dMaaz = Math.hypot(x + 66, z + 42);
    if (dMaaz < 24) {
      h += Math.cos((dMaaz / 24) * (Math.PI / 2)) * 5.2;
    }

    // Outer Jezero Crater Wall (bounded plateau ridge — never spikes above descent approach ring)
    if (distPad > 142) {
      const rimT = clamp((distPad - 142) / 56, 0, 1);
      const smoothRim = rimT * rimT * (3 - 2 * rimT);
      h += smoothRim * 17.5 * (0.76 + 0.24 * Math.sin(Math.atan2(z, x) * 5));
    }

    return h * blend;
  }

  // Moon South Pole: smooth undulating highlands + 4 named corridors across ±140m
  let h =
    Math.sin(x * 0.042) * Math.cos(z * 0.042) * 2.3 +
    Math.sin(x * 0.095 + 1.1) * Math.cos(z * 0.082) * 0.85;

  // Shackleton Cold Trap Crater at (56, -62)
  const dIce = Math.hypot(x - 56, z + 62);
  if (dIce < 18) {
    h -= Math.cos((dIce / 18) * (Math.PI / 2)) * 4.1;
  } else if (dIce < 25) {
    h += Math.sin(((dIce - 18) / 7) * Math.PI) * 1.7;
  }

  // Cabeus Secondary Shadow Basin at (-54, 66)
  const dCabeus = Math.hypot(x + 54, z - 66);
  if (dCabeus < 16) {
    h -= Math.cos((dCabeus / 16) * (Math.PI / 2)) * 3.2;
  }

  // Malapert Sunlit Ridge at (-64, -48)
  const dRidge = Math.hypot(x + 64, z + 48);
  if (dRidge < 24) {
    h += Math.cos((dRidge / 24) * (Math.PI / 2)) * 4.8;
  }

  // Nobile Highland Quarry Bench at (52, 58)
  const dNobile = Math.hypot(x - 52, z - 58);
  if (dNobile < 20) {
    h += Math.cos((dNobile / 20) * (Math.PI / 2)) * 2.9;
  }

  // Outer South Pole mountain rim outside expanded ±140m perimeter (bounded crest plateau)
  if (distPad > 142) {
    const rimT = clamp((distPad - 142) / 56, 0, 1);
    const smoothRim = rimT * rimT * (3 - 2 * rimT);
    h += smoothRim * 16.5 * (0.74 + 0.26 * Math.sin(Math.atan2(z, x) * 6));
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
    // Critical: Never auto-launch after countdown reaches zero. Wait for player SPACE or W.
    return L;
  }

  if (L.launchSequence === 'READY') {
    if (input.forward || input.action) {
      L.ignited = true;
      L.launchSequence = 'ASCENDING';
      L.throttle = 0.85;
    } else {
      return L;
    }
  }

  if (!L.ignited) {
    return L;
  }

  if (input.action) {
    L = separateLaunchStage(L);
  }

  L.throttle = clamp(L.throttle + 2.2 * dt, 0, L.fuelPct > 0 ? 1 : 0);

  const nominalPitch = L.altitudeKm < 2.2 ? 0 : Math.min(54, (L.altitudeKm - 2.2) * 0.48);
  if (L.autoGuidance) {
    L.pitchDeg += (nominalPitch - L.pitchDeg) * Math.min(1, 1.35 * dt);
  }
  if (input.left) L.pitchDeg = clamp(L.pitchDeg - 26 * dt, -18, 68);
  if (input.right) L.pitchDeg = clamp(L.pitchDeg + 26 * dt, -18, 68);
  if (input.stabilize && !L.stagePrompt) {
    L.pitchDeg += (nominalPitch - L.pitchDeg) * Math.min(1, 3.8 * dt);
  }

  const simDt = dt * PHYSICS.LAUNCH_TIME_SCALE;
  L.elapsed += simDt;

  const altM = L.altitudeKm * 1000;
  const airDensity = 1.225 * Math.exp(-altM / 8500);
  const speed = Math.hypot(L.verticalSpeedMs, L.horizontalSpeedMs);
  const qPa = 0.5 * airDensity * speed * speed;
  L.dynamicPressureKpa = qPa / 1000;

  const massKg = L.coreSeparated
    ? PHYSICS.SLS_ICPS_DRY_KG + PHYSICS.SLS_ICPS_PROP_KG * (L.fuelPct / 100)
    : L.srbSeparated
      ? PHYSICS.SLS_CORE_DRY_KG + PHYSICS.SLS_CORE_PROP_KG * (L.fuelPct / 100)
      : PHYSICS.SLS_LIFTOFF_MASS_KG - PHYSICS.SLS_FIRST_STAGE_PROP_KG * (1 - L.fuelPct / 100);

  const thrustN =
    (L.coreSeparated
      ? PHYSICS.SLS_ICPS_THRUST_N
      : L.srbSeparated
        ? PHYSICS.SLS_CORE_THRUST_N
        : PHYSICS.SLS_LIFTOFF_THRUST_N) * L.throttle;

  const pitchRad = (L.pitchDeg * Math.PI) / 180;
  const gravityMs2 =
    PHYSICS.EARTH_GRAVITY *
    Math.pow(PHYSICS.EARTH_RADIUS_M / (PHYSICS.EARTH_RADIUS_M + altM), 2);
  const gravityN = massKg * gravityMs2;

  const dragN = qPa * 22;
  const vertDragN = speed > 0 ? dragN * (L.verticalSpeedMs / speed) : 0;
  const horizDragN = speed > 0 ? dragN * (L.horizontalSpeedMs / speed) : 0;

  const centrifugalN =
    massKg * ((L.horizontalSpeedMs * L.horizontalSpeedMs) / (PHYSICS.EARTH_RADIUS_M + altM));
  const effGravityN = L.coreSeparated ? gravityN * 0.25 : gravityN;

  const rawVertForceN = thrustN * Math.cos(pitchRad) + centrifugalN - effGravityN - vertDragN;
  const onPad = altM <= 0.001 && L.verticalSpeedMs <= 0.001;
  const minVertAccel = L.coreSeparated ? 6.5 : L.srbSeparated ? 4.8 : 0;
  const vertAccel = onPad
    ? Math.max(0, rawVertForceN / Math.max(1, massKg))
    : Math.max(minVertAccel, rawVertForceN / Math.max(1, massKg));

  const rawHorizForceN = thrustN * Math.sin(pitchRad) - horizDragN;
  const horizAccel = L.verticalSpeedMs > 0.5 || !onPad ? rawHorizForceN / Math.max(1, massKg) : 0;

  L.massKg = massKg;
  L.thrustKn = thrustN / 1000;
  L.dragKn = dragN / 1000;
  L.netAccelMs2 = Math.hypot(vertAccel, horizAccel);

  const prevVy = L.verticalSpeedMs;
  L.verticalSpeedMs = Math.max(0, L.verticalSpeedMs + vertAccel * simDt);
  L.horizontalSpeedMs = Math.max(0, L.horizontalSpeedMs + horizAccel * simDt);
  L.altitudeKm = Math.max(0, L.altitudeKm + ((prevVy + L.verticalSpeedMs) * 0.5 * simDt) / 1000);

  const burnPctPerSec = L.coreSeparated ? 0.65 : L.srbSeparated ? 0.9 : 1.15;
  L.fuelPct = Math.max(0, L.fuelPct - burnPctPerSec * L.throttle * simDt);

  if (!L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && L.fuelPct <= 2) {
    L.srbSeparated = true;
    L.fuelPct = 100;
  }
  if (L.srbSeparated && !L.coreSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM && L.fuelPct <= 2) {
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

  if (L.coreSeparated && L.altitudeKm >= PHYSICS.SLS_ORBIT_TARGET_KM) {
    L.orbitReached = true;
    L.altitudeKm = PHYSICS.SLS_ORBIT_TARGET_KM;
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
  const fuelStart = clamp(
    (missionId === 'artemis-4' ? 76 : 92) + (carryover?.isruFuelBonusPct || 0),
    45,
    100
  );

  const satAlreadyOnline = Boolean(carryover?.relaySatelliteOnline);

  return {
    shipX: missionId === 'artemis-4' ? 22 : -14,
    shipZ: missionId === 'artemis-4' ? -14 : 18,
    vx: 0,
    vz: 0,
    headingRad: Math.atan2(
      target.x - (missionId === 'artemis-4' ? 22 : -14),
      target.z - (missionId === 'artemis-4' ? -14 : 18)
    ),
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
      satX: SOLAR_TARGETS['relay-orbit'].x,
      satZ: SOLAR_TARGETS['relay-orbit'].z,
      solarDeployedPct: satAlreadyOnline ? 100 : 0,
      dishAlignedPct: satAlreadyOnline ? 100 : 0,
      linkLocked: satAlreadyOnline,
      rotationErrorDeg: satAlreadyOnline ? 0 : 42,
      telemetrySignalPct: satAlreadyOnline ? 100 : 12,
    },
    statusText: satAlreadyOnline
      ? `Course ready for ${target.name}. Fly cleanly to orbital capture!`
      : 'Fly to HERMES Relay Orbit and hold [E / SPACE] to deploy & align the Orbital Satellite!',
  };
}

export function stepSpaceFlightPhysics(
  state: SpaceFlightState,
  resources: ResourceState,
  input: Pick<InputState, 'forward' | 'backward' | 'left' | 'right' | 'boost' | 'action'>,
  donkiFlareActive: boolean,
  rawDt: number
): { space: SpaceFlightState; resources: ResourceState } {
  const dt = Math.min(rawDt, 0.05);
  const s: SpaceFlightState = {
    ...state,
    visitedTargets: [...state.visitedTargets],
    orbitalSat: { ...state.orbitalSat },
  };
  const res: ResourceState = { ...resources };

  const target = SOLAR_TARGETS[s.targetId];
  const dx = target.x - s.shipX;
  const dz = target.z - s.shipZ;
  const distToTarget = Math.hypot(dx, dz);

  let thrusting = input.forward;
  let braking = input.backward;

  if (s.autoPilot) {
    const desiredHeading = Math.atan2(dx, dz);
    let diff = desiredHeading - s.headingRad;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    s.headingRad += clamp(diff, -2.8 * dt, 2.8 * dt);

    const speed = Math.hypot(s.vx, s.vz);
    const captureRadius =
      s.targetId === 'relay-orbit'
        ? 8.5
        : target.radius + (s.targetId === 'mars' ? 5.2 : 4.8);
    if (distToTarget > captureRadius * 0.72) {
      const approachCap = distToTarget < 18 ? Math.max(4.5, distToTarget * 0.65) : 14;
      thrusting = speed < approachCap;
      braking = speed > approachCap + 1.2;
    } else {
      thrusting = false;
      braking = speed > 0.25;
    }
  } else {
    if (input.left) s.headingRad += 2.3 * dt;
    if (input.right) s.headingRad -= 2.3 * dt;
  }

  s.boostActive = Boolean(input.boost && thrusting && res.power > 5);

  const fwdX = Math.sin(s.headingRad);
  const fwdZ = Math.cos(s.headingRad);
  const accel = s.boostActive ? 14.5 : 8.2;

  if (thrusting && s.fuelPct > 0) {
    s.vx += fwdX * accel * dt;
    s.vz += fwdZ * accel * dt;
    s.fuelPct = Math.max(0, s.fuelPct - (s.boostActive ? 2.1 : 0.85) * dt);
    if (s.boostActive) {
      res.power = Math.max(0, res.power - 2.0 * dt);
    }
  } else if (braking) {
    s.vx *= Math.max(0, 1 - 3.4 * dt);
    s.vz *= Math.max(0, 1 - 3.4 * dt);
  } else {
    s.vx *= Math.max(0, 1 - 0.35 * dt);
    s.vz *= Math.max(0, 1 - 0.35 * dt);
  }

  const maxSpeed = s.boostActive ? 22 : 14;
  const spd = Math.hypot(s.vx, s.vz);
  if (spd > maxSpeed) {
    s.vx = (s.vx / spd) * maxSpeed;
    s.vz = (s.vz / spd) * maxSpeed;
  }

  s.shipX = clamp(s.shipX + s.vx * dt, -95, 95);
  s.shipZ = clamp(s.shipZ + s.vz * dt, -95, 95);
  s.elapsedDays += dt * (s.boostActive ? 1.4 : 0.6);

  // Sun located at (-48, -36): solar storm radiation belt extends out when DONKI flare is active
  const distFromSun = Math.hypot(s.shipX + 48, s.shipZ + 36);
  const stormRadius = donkiFlareActive ? 48 : 32;
  s.inRadiationZone = distFromSun < stormRadius;

  if (s.inRadiationZone) {
    if (s.shieldBoostActive && res.power > 2) {
      res.power = Math.max(0, res.power - 3.2 * dt);
      res.shield = Math.max(0, res.shield - 0.45 * dt);
    } else {
      res.shield = Math.max(0, res.shield - (donkiFlareActive ? 4.0 : 2.1) * dt);
    }
  }

  // Non-Landing Orbital Satellite Operations at Relay Orbit
  const relayNode = SOLAR_TARGETS['relay-orbit'];
  const distToSatZone = Math.hypot(s.shipX - relayNode.x, s.shipZ - relayNode.z);
  const distToSat = Math.hypot(s.shipX - s.orbitalSat.satX, s.shipZ - s.orbitalSat.satZ);
  s.inSatDeployZone = distToSatZone <= 9.5 || distToSat <= 9.5;

  if (input.action && s.inSatDeployZone && !s.orbitalSat.linkLocked) {
    // RCS station-keeping keeps Orion steady beside the satellite during deployment & dish lock
    s.vx *= Math.max(0, 1 - 4.2 * dt);
    s.vz *= Math.max(0, 1 - 4.2 * dt);
    if (!s.orbitalSat.deployed) {
      s.orbitalSat.deployed = true;
      s.orbitalSat.satX = clamp(s.shipX + fwdX * 3.2, -85, 85);
      s.orbitalSat.satZ = clamp(s.shipZ + fwdZ * 3.2, -85, 85);
    }
    s.orbitalSat.solarDeployedPct = clamp(s.orbitalSat.solarDeployedPct + 48 * dt, 0, 100);
    if (s.orbitalSat.solarDeployedPct >= 50) {
      s.orbitalSat.dishAlignedPct = clamp(s.orbitalSat.dishAlignedPct + 44 * dt, 0, 100);
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

  // Check arrival at any target
  (Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).forEach((id) => {
    const planet = SOLAR_TARGETS[id];
    const d = Math.hypot(s.shipX - planet.x, s.shipZ - planet.z);
    if (id !== 'relay-orbit' && d <= planet.radius + 4.8 && !s.visitedTargets.includes(id)) {
      s.visitedTargets.push(id);
    }
  });

  const moon = SOLAR_TARGETS.moon;
  s.arrivedMoon = Math.hypot(s.shipX - moon.x, s.shipZ - moon.z) <= moon.radius + 4.8;
  const gw = SOLAR_TARGETS.gateway;
  s.arrivedGateway = Math.hypot(s.shipX - gw.x, s.shipZ - gw.z) <= gw.radius + 4.8;
  const mars = SOLAR_TARGETS.mars;
  s.arrivedMars = Math.hypot(s.shipX - mars.x, s.shipZ - mars.z) <= mars.radius + 5.2;

  if (s.orbitalSat.linkLocked && s.arrivedGateway) {
    s.statusText = 'Gateway NRHO Link Online! Ready to transfer ISRU payload.';
  } else if (s.orbitalSat.linkLocked && s.targetId === 'relay-orbit') {
    s.statusText = 'HERMES Relay Satellite Locked! High-Res Surface Maps Unlocked.';
  } else if (s.inSatDeployZone && !s.orbitalSat.linkLocked) {
    s.statusText = `In Relay Orbit — Hold [E / SPACE] to unfold wings & lock Dish (${Math.round(s.orbitalSat.dishAlignedPct)}%)`;
  } else if (s.arrivedMoon) {
    s.statusText = 'Lunar Orbit Captured! Ready to begin South Pole Descent.';
  } else if (s.arrivedMars) {
    s.statusText = 'Jezero Capture Orbit Reached! Ready for 0.38g Mars Descent.';
  } else if (s.inRadiationZone) {
    s.statusText = 'Solar Radiation Zone! Activate Water-Wall Storm Shield or steer clear of the Sun!';
  } else {
    s.statusText = `Course set for ${target.name} (${Math.round(distToTarget * 10)}k sim-km remaining)`;
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
    const distDelta = Math.hypot(r.x - 54, r.z + 58);
    const distCarb = Math.hypot(r.x - 48, r.z - 62);
    const nearestSig = Math.min(distDelta, distCarb);
    r.hydrogenSignal = Math.round(Math.max(14, 220 * Math.exp(-nearestSig / 26)));

    const dMaaz = Math.hypot(r.x + 66, r.z + 42);
    if (dMaaz < 22) {
      r.dustAccumulationPct = clamp(r.dustAccumulationPct - 6.5 * dt, 2, 65);
    } else if (Math.abs(r.speed) > 0.5) {
      r.dustAccumulationPct = clamp(r.dustAccumulationPct + 0.45 * dt, 2, 65);
    }
  } else {
    const distShack = Math.hypot(r.x - 56, r.z + 62);
    const distCabeus = Math.hypot(r.x + 54, r.z - 66);
    const nearestIce = Math.min(distShack, distCabeus);
    r.hydrogenSignal = Math.round(Math.max(12, 240 * Math.exp(-nearestIce / 26)));
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
