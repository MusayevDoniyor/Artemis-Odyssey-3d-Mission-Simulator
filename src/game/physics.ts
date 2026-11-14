import { LANDING_ZONES, PAYLOADS, PHYSICS, SOLAR_TARGETS } from './constants';
import type {
  InputState,
  LandingState,
  LaunchState,
  ResourceState,
  RoverCollider,
  RoverState,
  SpaceFlightState,
  SpaceTargetId,
} from './types';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getLunarTerrainHeight(x: number, z: number): number {
  const distPad = Math.hypot(x, z);
  if (distPad < 15) return 0;
  const blend = clamp((distPad - 15) / 14, 0, 1);

  let h =
    Math.sin(x * 0.045) * Math.cos(z * 0.045) * 2.4 +
    Math.sin(x * 0.1 + 1.1) * Math.cos(z * 0.085) * 0.9;

  // Shackleton Ice Crater at (38, -42)
  const dIce = Math.hypot(x - 38, z + 42);
  if (dIce < 15) {
    h -= Math.cos((dIce / 15) * (Math.PI / 2)) * 3.6;
  } else if (dIce < 21) {
    h += Math.sin(((dIce - 15) / 6) * Math.PI) * 1.6;
  }

  // Malapert Sunlit Ridge at (-40, -28)
  const dRidge = Math.hypot(x + 40, z + 28);
  if (dRidge < 20) {
    h += Math.cos((dRidge / 20) * (Math.PI / 2)) * 4.2;
  }

  // Outer South Pole mountain rim
  if (distPad > 125) {
    const rim = (distPad - 125) / 45;
    h += Math.pow(rim, 1.4) * 18 * (0.7 + 0.3 * Math.sin(Math.atan2(z, x) * 6));
  }

  return h * blend;
}

export function createInitialLaunchState(): LaunchState {
  return {
    ignited: false,
    elapsed: 0,
    altitudeKm: 0,
    verticalSpeedMs: 0,
    horizontalSpeedMs: 0,
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
  input: Pick<InputState, 'forward' | 'left' | 'right' | 'action'>,
  rawDt: number
): LaunchState {
  const dt = Math.min(rawDt, 0.05);
  let L: LaunchState = { ...state };

  if ((input.forward || input.action) && !L.ignited) {
    L.ignited = true;
    L.throttle = 0.4;
  }

  if (!L.ignited) {
    return L;
  }

  if (input.action) {
    L = separateLaunchStage(L);
  }

  L.throttle = clamp(L.throttle + 2.8 * dt, 0, L.fuelPct > 0 ? 1 : 0);

  // Smooth gravity turn pitch (0° at pad -> up to 54° downrange)
  const targetPitch = L.altitudeKm < 2.5 ? 0 : Math.min(54, (L.altitudeKm - 2.5) * 0.48);
  L.pitchDeg += (targetPitch - L.pitchDeg) * Math.min(1, 1.2 * dt);
  if (input.left) L.pitchDeg = clamp(L.pitchDeg - 26 * dt, -15, 68);
  if (input.right) L.pitchDeg = clamp(L.pitchDeg + 26 * dt, -15, 68);

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

  const thrustAccel = thrustN / Math.max(1, massKg);
  const pitchRad = (L.pitchDeg * Math.PI) / 180;
  const gravity =
    PHYSICS.EARTH_GRAVITY *
    Math.pow(PHYSICS.EARTH_RADIUS_M / (PHYSICS.EARTH_RADIUS_M + altM), 2);

  const dragAccel = (qPa * 22) / Math.max(1, massKg);
  const vertDrag = speed > 0 ? dragAccel * (L.verticalSpeedMs / speed) : 0;
  const horizDrag = speed > 0 ? dragAccel * (L.horizontalSpeedMs / speed) : 0;

  const centrifugal = (L.horizontalSpeedMs * L.horizontalSpeedMs) / (PHYSICS.EARTH_RADIUS_M + altM);
  const effGravity = L.coreSeparated ? gravity * 0.25 : gravity;

  const vertAccel = Math.max(
    L.coreSeparated ? 6.5 : L.srbSeparated ? 4.8 : 0,
    thrustAccel * Math.cos(pitchRad) + centrifugal - effGravity - vertDrag
  );
  const horizAccel = thrustAccel * Math.sin(pitchRad) - horizDrag;

  const prevVy = L.verticalSpeedMs;
  L.verticalSpeedMs = Math.max(0, L.verticalSpeedMs + vertAccel * simDt);
  L.horizontalSpeedMs = Math.max(0, L.horizontalSpeedMs + horizAccel * simDt);
  L.altitudeKm = Math.max(0, L.altitudeKm + ((prevVy + L.verticalSpeedMs) * 0.5 * simDt) / 1000);

  // Propellant consumption per stage (tuned for responsive ~20s ascent)
  const burnPctPerSec = L.coreSeparated ? 0.65 : L.srbSeparated ? 0.9 : 1.15;
  L.fuelPct = Math.max(0, L.fuelPct - burnPctPerSec * L.throttle * simDt);

  // Automatic safety staging fallback if fuel reaches zero past altitude gate
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

export function createInitialSpaceFlightState(): SpaceFlightState {
  return {
    shipX: -12,
    shipZ: 18,
    vx: 0,
    vz: 0,
    headingRad: Math.atan2(24 - -12, -18 - 18),
    targetId: 'moon',
    autoPilot: false,
    boostActive: false,
    shieldBoostActive: false,
    fuelPct: 100,
    elapsedDays: 0,
    inRadiationZone: false,
    arrivedMoon: false,
    visitedTargets: [],
    statusText: 'Point toward the glowing Moon beacon and hold [W] to thrust!',
  };
}

export function stepSpaceFlightPhysics(
  state: SpaceFlightState,
  resources: ResourceState,
  input: Pick<InputState, 'forward' | 'backward' | 'left' | 'right' | 'boost'>,
  donkiFlareActive: boolean,
  rawDt: number
): { space: SpaceFlightState; resources: ResourceState } {
  const dt = Math.min(rawDt, 0.05);
  const s: SpaceFlightState = {
    ...state,
    visitedTargets: [...state.visitedTargets],
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
    if (distToTarget > 8) {
      thrusting = speed < 14;
    } else {
      braking = speed > 2.5;
      thrusting = speed < 3.5;
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
    s.fuelPct = Math.max(0, s.fuelPct - (s.boostActive ? 2.4 : 1.0) * dt);
    if (s.boostActive) {
      res.power = Math.max(0, res.power - 2.2 * dt);
    }
  } else if (braking) {
    s.vx *= Math.max(0, 1 - 3.2 * dt);
    s.vz *= Math.max(0, 1 - 3.2 * dt);
  } else {
    // Gentle space guidance damping so kids don't drift uncontrollably
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
      res.power = Math.max(0, res.power - 3.5 * dt);
      res.shield = Math.max(0, res.shield - 0.5 * dt);
    } else {
      res.shield = Math.max(0, res.shield - (donkiFlareActive ? 4.2 : 2.2) * dt);
    }
  }

  // Check arrival at any target
  (Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).forEach((id) => {
    const planet = SOLAR_TARGETS[id];
    const d = Math.hypot(s.shipX - planet.x, s.shipZ - planet.z);
    if (d <= planet.radius + 4.5 && !s.visitedTargets.includes(id)) {
      s.visitedTargets.push(id);
    }
  });

  const moon = SOLAR_TARGETS.moon;
  const distMoon = Math.hypot(s.shipX - moon.x, s.shipZ - moon.z);
  s.arrivedMoon = distMoon <= moon.radius + 4.5;

  if (s.arrivedMoon) {
    s.statusText = 'Lunar Orbit Captured! Ready to begin South Pole Descent.';
  } else if (s.inRadiationZone) {
    s.statusText = 'Solar Radiation Zone! Activate Storm Shield or steer clear of the Sun!';
  } else {
    s.statusText = `Course set for ${target.name} (${Math.round(distToTarget * 10)}k sim-km remaining)`;
  }

  return { space: s, resources: res };
}

export function createInitialLandingState(massMultiplier: number): LandingState {
  return {
    x: 0,
    y: 165,
    z: -36,
    vx: 0,
    vy: -3.2,
    vz: 2.2,
    rollDeg: 0,
    pitchDeg: 0,
    tiltDeg: 0,
    throttle: 0,
    fuelPct: 100,
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
    landed: false,
    result: null,
    score: 0,
  };
}

export function evaluateTouchdown(
  impactVy: number,
  horizSpeed: number,
  tiltDeg: number
): 'perfect' | 'hard' | 'crash' {
  if (
    impactVy > PHYSICS.LANDER_HARD_VY ||
    tiltDeg > PHYSICS.LANDER_HARD_TILT ||
    horizSpeed > 4.6
  ) {
    return 'crash';
  }
  if (
    impactVy > PHYSICS.LANDER_PERFECT_VY ||
    tiltDeg > PHYSICS.LANDER_PERFECT_TILT ||
    horizSpeed > 2.4
  ) {
    return 'hard';
  }
  return 'perfect';
}

export function stepLandingPhysics(
  state: LandingState,
  input: Pick<InputState, 'forward' | 'backward' | 'left' | 'right' | 'action' | 'tiltForward'>,
  rawDt: number,
  fragilePayload: boolean
): LandingState {
  const dt = Math.min(rawDt, 0.05);
  const f: LandingState = { ...state };
  if (f.landed) return f;

  const zone = LANDING_ZONES[f.targetZoneId] || LANDING_ZONES[0];
  const groundH = getLunarTerrainHeight(f.x, f.z);
  const alt = Math.max(0, f.y - groundH);

  const propKg = (PHYSICS.LANDER_PROP_MASS_KG * f.fuelPct) / 100;
  const totalMass = (PHYSICS.LANDER_FIXED_MASS_KG + propKg) * f.massMultiplier;
  const hoverThrottle = (totalMass * PHYSICS.MOON_GRAVITY) / PHYSICS.LANDER_MAX_THRUST_N;

  if (f.guidanceMode === 'AUTOLAND' && f.fuelPct > 0) {
    const dx = zone.x - f.x;
    const dz = zone.z - f.z;
    const desiredVx = clamp(dx * 0.25, -5.5, 5.5);
    const desiredVz = clamp(dz * 0.25, -5.5, 5.5);
    const targetRoll = clamp(-(desiredVx - f.vx) * 6.0, -16, 16);
    const targetPitch = clamp((desiredVz - f.vz) * 6.0, -16, 16);

    f.rollDeg += (targetRoll - f.rollDeg) * Math.min(1, 5 * dt);
    f.pitchDeg += (targetPitch - f.pitchDeg) * Math.min(1, 5 * dt);

    const safeVy = alt > 75 ? -3.8 : alt > 20 ? -2.2 : -1.1;
    f.throttle = clamp(hoverThrottle + (safeVy - f.vy) * 0.24, 0.08, 0.96);
  } else {
    if (f.guidanceMode === 'RATE_ASSIST' && f.fuelPct > 0) {
      const targetVy = alt > 28 ? -2.2 : -1.3;
      f.throttle = clamp(hoverThrottle + (targetVy - f.vy) * 0.24, 0.08, 0.96);
    } else {
      if ((input.forward || input.action) && f.fuelPct > 0) {
        f.throttle = clamp(f.throttle + 3.5 * dt, 0, 1);
      } else {
        f.throttle = clamp(f.throttle - 3.5 * dt, 0, 1);
      }
    }

    if (input.left) f.rollDeg = clamp(f.rollDeg + 42 * dt, -26, 26);
    else if (input.right) f.rollDeg = clamp(f.rollDeg - 42 * dt, -26, 26);
    else f.rollDeg *= Math.max(0, 1 - 5.0 * dt);

    if (input.backward) f.pitchDeg = clamp(f.pitchDeg - 38 * dt, -22, 22);
    else if (input.tiltForward) f.pitchDeg = clamp(f.pitchDeg + 38 * dt, -22, 22);
    else f.pitchDeg *= Math.max(0, 1 - 5.0 * dt);
  }

  f.tiltDeg = Math.hypot(f.rollDeg, f.pitchDeg);

  const thrustForce = f.fuelPct > 0 ? PHYSICS.LANDER_MAX_THRUST_N * f.throttle : 0;
  const lunarWeight = totalMass * PHYSICS.MOON_GRAVITY;
  f.twr = lunarWeight > 0 ? thrustForce / lunarWeight : 0;

  const rollRad = (f.rollDeg * Math.PI) / 180;
  const pitchRad = (f.pitchDeg * Math.PI) / 180;
  const tiltRad = (f.tiltDeg * Math.PI) / 180;

  const ay = (thrustForce * Math.cos(tiltRad)) / totalMass - PHYSICS.MOON_GRAVITY;
  let ax = -(thrustForce * Math.sin(rollRad)) / totalMass;
  let az = (thrustForce * Math.sin(pitchRad)) / totalMass;

  // Responsive RCS translation assist
  if (input.left) ax -= 1.8;
  if (input.right) ax += 1.8;
  if (input.backward) az -= 1.8;
  if (input.tiltForward) az += 1.8;

  // Gentle horizontal drift damper near the pad when manual keys are released
  if (f.guidanceMode !== 'AUTOLAND') {
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

  if (f.throttle > 0 && f.fuelPct > 0) {
    const kgBurned = PHYSICS.LANDER_FUEL_FLOW_KG_S * f.throttle * dt;
    f.fuelPct = Math.max(0, f.fuelPct - (kgBurned / PHYSICS.LANDER_PROP_MASS_KG) * 100);
  }

  const nextGroundH = getLunarTerrainHeight(f.x, f.z);
  const nextAlt = Math.max(0, f.y - nextGroundH);
  f.contactLight = nextAlt <= 1.75;
  f.distToPad = Math.hypot(f.x - zone.x, f.z - zone.z);

  if (f.y <= nextGroundH) {
    f.y = nextGroundH;
    f.landed = true;
    f.throttle = 0;

    const impactVy = Math.abs(f.vy);
    const horiz = Math.hypot(f.vx, f.vz);
    f.result = evaluateTouchdown(impactVy, horiz, f.tiltDeg);
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

export function createInitialRoverState(startX = 6, startZ = 6): RoverState {
  return {
    x: startX,
    y: getLunarTerrainHeight(startX, startZ),
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
    hydrogenSignal: 15,
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

  const fwdX = Math.sin(r.headingRad);
  const fwdZ = Math.cos(r.headingRad);
  const rightX = Math.cos(r.headingRad);
  const rightZ = -Math.sin(r.headingRad);

  const isWalker = r.driveMode === 'WALKER';
  const maxSpeed = isWalker ? PHYSICS.ROVER_WALKER_SPEED : PHYSICS.ROVER_MAX_SPEED;
  const slopeGravity = Math.sin(r.pitchRad) * PHYSICS.MOON_GRAVITY * 0.45;

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

  // Smooth tangent-sliding collider resolution (prevents jarring backward bounces)
  // In WALKER mode with high clearance, rover steps cleanly over small rocks (< 0.72m radius)!
  const roverRadius = isWalker ? 0.95 : 1.18;
  let collisionLabel = '';
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (isWalker && col.type === 'rock' && col.r < 0.75) {
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

      // Project velocity onto tangent instead of bouncing backwards!
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
  r.x = clamp(nextX, -115, 115);
  r.z = clamp(nextZ, -115, 115);

  const centerGround = getLunarTerrainHeight(r.x, r.z);
  r.y = centerGround;

  // 4-wheel terrain contact sampling (FL, FR, RL, RR)
  const wheelCoords: [number, number][] = [
    [-0.78, 0.95],
    [0.78, 0.95],
    [-0.78, -0.95],
    [0.78, -0.95],
  ];
  const wheelGrounds = wheelCoords.map(([lx, lz]) => {
    const wx = r.x + rightX * lx + fwdX * lz;
    const wz = r.z + rightZ * lx + fwdZ * lz;
    return getLunarTerrainHeight(wx, wz);
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

  // Alternating diagonal 4-leg articulated stepping gait in WALKER mode!
  const diagonalPhases = [0, Math.PI, Math.PI, 0];
  for (let i = 0; i < 4; i++) {
    const terrainFollow = clamp(wheelGrounds[i] - centerGround, -0.22, 0.28);
    const stepLift = isWalker
      ? Math.max(0, Math.sin(r.walkPhase + diagonalPhases[i])) * 0.28
      : 0;
    r.wheelOffsets[i] = terrainFollow + stepLift;
  }

  const distIce = Math.hypot(r.x - 38, r.z + 42);
  r.hydrogenSignal = Math.round(Math.max(12, 240 * Math.exp(-distIce / 22)));
  const slopeRatio = Math.abs(Math.sin(r.pitchRad)) + Math.abs(Math.sin(r.rollRad));
  r.wheelSlipPct = isWalker
    ? Math.min(12, Math.round(slopeRatio * 18))
    : Math.min(42, Math.round(slopeRatio * 48 + Math.abs(r.speed) * 1.4));

  return r;
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

  // push-science
  next.power = clamp(next.power - 14, 0, 100);
  next.shield = clamp(next.shield - 15, 0, 100);
  return {
    resources: next,
    scienceMultiplier: 1.4,
    summary: 'Full Drill Power (+40% Drill Speed, -14% Power, -15% Shield).',
  };
}
