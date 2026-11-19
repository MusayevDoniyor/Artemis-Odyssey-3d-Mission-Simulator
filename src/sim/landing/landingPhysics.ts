import { getLandingZones, PHYSICS } from '../../game/constants';
import type { InputState, LandingState, SurfacePlanet } from '../../game/types';
import { clamp, getSurfaceSlopeDeg, getSurfaceTerrainHeight } from '../common/math';

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
    impactVy: 0,
    impactSpeedMs: 0,
    impactTiltDeg: 0,
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
    f.impactVy = impactVy;
    f.impactSpeedMs = Math.hypot(impactVy, horiz);
    f.impactTiltDeg = f.tiltDeg;
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
