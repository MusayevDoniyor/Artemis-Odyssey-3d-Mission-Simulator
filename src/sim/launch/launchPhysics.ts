import { PHYSICS } from '../../game/constants';
import type { InputState, LaunchState } from '../../game/types';
import { clamp } from '../common/math';

export function createInitialLaunchState(autoGuidance = true): LaunchState {
  const targetVelMs = Math.sqrt(
    PHYSICS.EARTH_MU_M3_S2 / (PHYSICS.EARTH_RADIUS_M + PHYSICS.SLS_ORBIT_TARGET_KM * 1000)
  );
  return {
    launchSequence: 'PRE_SIM',
    phaseStage: 'PRE_LAUNCH',
    countdownSec: 3,
    autoGuidance,
    ignited: false,
    ignitionTimerSec: 0,
    physicsAccumulatorSec: 0,
    timeWarp: 1,
    elapsed: 0,
    altitudeKm: 0,
    downrangeKm: 0,
    verticalSpeedMs: 0,
    horizontalSpeedMs: 0,
    netAccelMs2: 0,
    thrustKn: 0,
    dragKn: 0,
    massKg: PHYSICS.SLS_LIFTOFF_MASS_KG,
    propellantMassKg: PHYSICS.SLS_FIRST_STAGE_PROP_KG,
    massFlowRateKgS: 0,
    machNumber: 0,
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
    phaseStage: 'SYSTEM_CHECK',
    countdownSec: 3,
  };
}

export function separateLaunchStage(L: LaunchState): LaunchState {
  const next = { ...L };
  if (!next.srbSeparated && next.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM) {
    next.srbSeparated = true;
    next.fuelPct = 100;
    next.stagePrompt = null;
    next.phaseStage = 'BOOSTER_SEPARATION';
    return next;
  }
  if (next.srbSeparated && !next.coreSeparated && next.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM) {
    next.coreSeparated = true;
    next.fuelPct = 100;
    next.stagePrompt = null;
    next.phaseStage = 'CORE_STAGE_SEPARATION';
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
function computeSlsDragCoeff(speedMs: number, altM: number): { cd: number; mach: number } {
  const tempK = Math.max(195, 288.15 - 0.0065 * Math.min(altM, 14_300));
  const soundSpeed = Math.sqrt(1.4 * 287.05 * tempK);
  const mach = speedMs / soundSpeed;
  if (mach < 0.8) return { cd: 0.28, mach };
  if (mach < 1.25) return { cd: 0.28 + ((mach - 0.8) / 0.45) * 0.34, mach }; // Transonic wave drag peak (~0.62 at Mach 1.25)
  if (mach < 3.0) return { cd: Math.max(0.24, 0.62 - ((mach - 1.25) / 1.75) * 0.34), mach };
  return { cd: 0.22, mach };
}

/** Resolves the 14-state educational launch milestone from physical state */
export function resolveLaunchPhaseStage(L: LaunchState): LaunchState['phaseStage'] {
  if (L.launchSequence === 'PRE_SIM') return 'PRE_LAUNCH';
  if (L.launchSequence === 'COUNTDOWN') return 'SYSTEM_CHECK';
  if (L.launchSequence === 'READY') return 'ENGINE_IGNITION';
  if (L.orbitReached) return 'ORBIT_CONFIRMATION';
  const igTimer = L.ignitionTimerSec ?? 0;
  if (L.altitudeKm <= 0.001 && L.verticalSpeedMs <= 0.1) {
    return igTimer < 0.35 ? 'ENGINE_IGNITION' : 'THRUST_BUILDUP';
  }
  if (L.altitudeKm < 0.35) return 'LIFTOFF';
  if (L.altitudeKm < 1.8) return 'INITIAL_ASCENT';
  if (L.altitudeKm >= 9.0 && L.altitudeKm <= 16.0 && !L.srbSeparated) return 'MAX_Q';
  if (!L.srbSeparated) return 'PITCH_PROGRAM';
  if (!L.coreSeparated) {
    return L.altitudeKm < 55 ? 'BOOSTER_SEPARATION' : 'PITCH_PROGRAM';
  }
  if (L.altitudeKm < 118) return 'CORE_STAGE_SEPARATION';
  if (L.altitudeKm < 152) return 'UPPER_STAGE_OPERATION';
  return 'ORBITAL_INSERTION';
}

const FIXED_LAUNCH_DT = 1 / 120; // Deterministic 120 Hz internal physics sub-step

function stepSingleFixedLaunchSubstep(
  L: LaunchState,
  input: Pick<InputState, 'forward' | 'left' | 'right' | 'action'> & { stabilize?: boolean },
  dt: number
): void {
  if (L.orbitReached) {
    const rParkM = PHYSICS.EARTH_RADIUS_M + PHYSICS.SLS_ORBIT_TARGET_KM * 1000;
    const vParkMs = Math.sqrt(PHYSICS.EARTH_MU_M3_S2 / rParkM);
    L.throttle = 0;
    L.thrustKn = 0;
    L.dragKn = 0;
    L.twr = 0;
    L.netAccelMs2 = 0;
    L.massFlowRateKgS = 0;
    L.pitchDeg = 90;
    L.altitudeKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.verticalSpeedMs = 0;
    L.horizontalSpeedMs = Math.round(vParkMs);
    L.orbitalVelocityTargetMs = Math.round(vParkMs);
    L.apoapsisKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.periapsisKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.orbitalEccentricity = 0;
    L.phaseStage = 'ORBIT_CONFIRMATION';
    return;
  }

  // Advance real-time ignition timer for RS-25 startup & SRB thrust buildup
  const igTimer = (L.ignitionTimerSec ?? 0) + dt;
  L.ignitionTimerSec = igTimer;

  // Coherent Engine Ignition (0..0.35s) -> Thrust Buildup (0.35..0.85s) -> Full Rated Thrust (>0.85s)
  if (L.fuelPct <= 0) {
    L.throttle = 0;
  } else if (igTimer < 0.35) {
    // RS-25 main engine ignition start: thrust builds from 15% to 52% (TWR < 1.0, rocket stays clamped to ML-1)
    L.throttle = 0.15 + (igTimer / 0.35) * 0.37;
  } else if (igTimer < 0.85) {
    // RS-25s reach 100% and twin SRBs ignite: TWR crosses 1.00 at ~0.55s and reaches 1.53 at 0.85s
    L.throttle = 0.52 + ((igTimer - 0.35) / 0.50) * 0.48;
  } else {
    L.throttle = 1.0;
  }

  const altKmNow = L.altitudeKm;

  // Progressive time-scale schedule:
  // - 1.0x during pad ignition & thrust buildup (TWR <= 1.0)
  // - 2.6x -> 7.5x during initial liftoff & tower clear (0 .. 0.35 km) so liftoff feels weighty and physical
  // - Smoothly ramps to 28x through Max-Q and 42x in upper atmosphere/vacuum so 8.5-min ascent completes in ~18.5s
  let ascentTimeScale = 1.0;
  if (igTimer >= 0.45) {
    if (altKmNow < 0.35) {
      const pPad = clamp(altKmNow / 0.35, 0, 1);
      ascentTimeScale = 2.6 + pPad * pPad * (3 - 2 * pPad) * 5.4;
    } else if (altKmNow < 12) {
      const pLow = clamp((altKmNow - 0.35) / 11.65, 0, 1);
      ascentTimeScale = 8.0 + pLow * pLow * (3 - 2 * pLow) * 22.0;
    } else {
      const pHigh = clamp((altKmNow - 12) / 33, 0, 1);
      ascentTimeScale = 30.0 + pHigh * 15.5;
    }
  }

  const simDt = dt * ascentTimeScale;
  if (igTimer >= 0.45) {
    L.elapsed += simDt;
  }

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

  const propMassKg = stagePropTotalKg * (L.fuelPct / 100);
  const massKg = stageBaseDryKg + propMassKg;

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
  const accelMag = Math.max(0.5, thrustN / Math.max(1, massKg));

  const gravityMs2 = PHYSICS.EARTH_MU_M3_S2 / (r * r);
  const gravityN = massKg * gravityMs2;
  const twrNow = thrustN / Math.max(1, gravityN);
  const centrifugalAccel = (L.horizontalSpeedMs * L.horizontalSpeedMs) / r;
  const effectiveGravityMs2 = Math.max(0, gravityMs2 - centrifugalAccel);

  // Gravity-Turn Guidance:
  // - Stage 0 (0.35..45 km): lofts trajectory smoothly (0 -> 71 deg) to ~550 m/s vertical & ~1,550 m/s horizontal
  // - Stage 1 (45..110 km): hydrolox sustainer accelerates horizontally to ~7,000 m/s while climbing continuously to 110 km
  // - Stage 2 (110..165 km): ICPS RL10B-2 circularizes at 165 km & 7,805 m/s
  let nominalPitch = 0;
  if (altKmNow < 0.35) {
    nominalPitch = 0;
  } else if (!L.srbSeparated && altKmNow < PHYSICS.SLS_SRB_SEP_ALT_KM) {
    nominalPitch = Math.min(71, Math.pow((altKmNow - 0.35) / 44.65, 0.54) * 71);
  } else if (!L.coreSeparated) {
    if (L.horizontalSpeedMs < 6900) {
      const remAltM = Math.max(1800, (108.5 - altKmNow) * 1000);
      const remVxMs = Math.max(150, 7000 - L.horizontalSpeedMs);
      const estTimeRemSec = remVxMs / Math.max(9, accelMag * 0.92);
      const targetVy = clamp(remAltM / Math.max(10, estTimeRemSec), 78, 240);
      const desiredVertAccel = (targetVy - L.verticalSpeedMs) * 0.15;
      const reqCos = clamp((effectiveGravityMs2 + desiredVertAccel) / accelMag, -0.16, 0.78);
      nominalPitch = (Math.acos(reqCos) * 180) / Math.PI;
    } else {
      // Loft smoothly across 110 km MECO gate at ~7,350 m/s and ~350 m/s vertical climb for ICPS handoff
      const targetVy = 355;
      const desiredVertAccel = (targetVy - L.verticalSpeedMs) * 0.16;
      const reqCos = clamp((effectiveGravityMs2 + desiredVertAccel) / accelMag, 0.08, 0.58);
      nominalPitch = (Math.acos(reqCos) * 180) / Math.PI;
    }
  } else {
    const altErr = Math.max(0, PHYSICS.SLS_ORBIT_TARGET_KM - altKmNow);
    const targetVy = clamp(altErr * 7.2, 0, 380);
    const vyErr = targetVy - L.verticalSpeedMs;
    nominalPitch = altErr > 1.5 ? clamp(79 - vyErr * 0.09, 55, 89) : 89.5;
  }

  if (L.autoGuidance) {
    L.pitchDeg += (nominalPitch - L.pitchDeg) * Math.min(1, 5.0 * dt);
  }
  if (input.left) L.pitchDeg = clamp(L.pitchDeg - 26 * dt, -18, 90);
  if (input.right) L.pitchDeg = clamp(L.pitchDeg + 26 * dt, -18, 90);
  if (input.stabilize && !L.stagePrompt) {
    L.pitchDeg += (nominalPitch - L.pitchDeg) * Math.min(1, 5.0 * dt);
  }

  const pitchRad = (L.pitchDeg * Math.PI) / 180;

  // Real atmospheric aerodynamic drag & Mach number
  const { cd, mach } = computeSlsDragCoeff(speed, altM);
  L.machNumber = Math.round(mach * 100) / 100;
  const refArea = L.coreSeparated ? 20.4 : L.srbSeparated ? 55.4 : PHYSICS.SLS_DRAG_AREA_M2;
  const dragN = qPa * cd * refArea;
  const vertDragN = speed > 0 ? dragN * (L.verticalSpeedMs / speed) : 0;
  const horizDragN = speed > 0 ? dragN * (L.horizontalSpeedMs / speed) : 0;

  // Spherical Earth radial & tangential dynamics:
  // Hold-down bolts keep rocket stationary on pad until TWR > 1.0!
  const coriolisAccel = (L.verticalSpeedMs * L.horizontalSpeedMs) / r;

  const rawVertAccel =
    (thrustN * Math.cos(pitchRad) - vertDragN) / massKg - gravityMs2 + centrifugalAccel;
  const onPad = altM <= 0.001 && L.verticalSpeedMs <= 0.001;
  const vertAccel = onPad ? (twrNow > 1.0 ? Math.max(0, rawVertAccel) : 0) : rawVertAccel;

  const rawHorizAccel = (thrustN * Math.sin(pitchRad) - horizDragN) / massKg - coriolisAccel;
  const horizAccel = L.verticalSpeedMs > 0.5 || !onPad ? rawHorizAccel : 0;

  // True Tsiolkovsky propellant depletion: dm/dt = Thrust / (Isp * g0)
  const mdotKgS = thrustN > 0 ? thrustN / (ispS * PHYSICS.EARTH_GRAVITY) : 0;

  L.massKg = Math.round(massKg);
  L.propellantMassKg = Math.round(propMassKg);
  L.massFlowRateKgS = Math.round(mdotKgS);
  L.thrustKn = thrustN / 1000;
  L.dragKn = dragN / 1000;
  L.ispS = Math.round(ispS);
  L.twr = Math.round(twrNow * 100) / 100;
  L.netAccelMs2 = onPad && twrNow <= 1.0 ? 0 : Math.hypot(vertAccel, horizAccel);

  if (!onPad || twrNow > 1.0) {
    const prevVy = L.verticalSpeedMs;
    const prevVx = L.horizontalSpeedMs;
    L.verticalSpeedMs =
      L.coreSeparated && altKmNow >= PHYSICS.SLS_ORBIT_TARGET_KM
        ? Math.max(0, L.verticalSpeedMs + vertAccel * simDt)
        : Math.max(0, L.verticalSpeedMs + vertAccel * simDt);
    L.horizontalSpeedMs = Math.max(0, L.horizontalSpeedMs + horizAccel * simDt);
    L.altitudeKm = Math.max(0, L.altitudeKm + ((prevVy + L.verticalSpeedMs) * 0.5 * simDt) / 1000);
    L.downrangeKm =
      (L.downrangeKm ?? 0) + ((prevVx + L.horizontalSpeedMs) * 0.5 * simDt) / 1000;
  }

  const fuelEvalDt = onPad && twrNow <= 1.0 ? dt * 0.25 : simDt;
  const fuelPctBurn = (mdotKgS * fuelEvalDt * 100) / Math.max(1, stagePropTotalKg);
  L.fuelPct = Math.max(0, L.fuelPct - fuelPctBurn);
  if (!onPad || twrNow > 1.0) {
    L.deltaVExpendedMs = Math.round(
      L.deltaVExpendedMs + (thrustN / Math.max(1, massKg)) * simDt
    );
  }

  // Auto-stage on empty propellant after crossing stage altitude gates
  if (!L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && L.fuelPct <= 2.5) {
    L.srbSeparated = true;
    L.fuelPct = 100;
  }
  if (
    L.srbSeparated &&
    !L.coreSeparated &&
    L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM &&
    L.fuelPct <= 2.5
  ) {
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
  const eccSq = Math.max(
    0,
    1 + (2 * specEnergy * hAng * hAng) / Math.pow(PHYSICS.EARTH_MU_M3_S2, 2)
  );
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
    L.massFlowRateKgS = 0;
    L.pitchDeg = 90;
    L.apoapsisKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.periapsisKm = PHYSICS.SLS_ORBIT_TARGET_KM;
    L.orbitalEccentricity = 0;
  }

  L.phaseStage = resolveLaunchPhaseStage(L);
}

export function stepLaunchPhysics(
  state: LaunchState,
  input: Pick<InputState, 'forward' | 'left' | 'right' | 'action'> & { stabilize?: boolean },
  rawDt: number
): LaunchState {
  const dt = clamp(rawDt, 0, 0.1);
  let L: LaunchState = { ...state };

  if (L.launchSequence === 'PRE_SIM') {
    L.phaseStage = 'PRE_LAUNCH';
    return L;
  }

  if (L.launchSequence === 'COUNTDOWN') {
    L.countdownSec = Math.max(0, L.countdownSec - dt);
    L.phaseStage = 'SYSTEM_CHECK';
    if (L.countdownSec <= 0.001) {
      L.countdownSec = 0;
      L.launchSequence = 'READY';
      L.phaseStage = 'ENGINE_IGNITION';
    }
    // Never auto-launch after countdown reaches zero; await player SPACE or W
    return L;
  }

  if (L.launchSequence === 'READY') {
    if (input.forward || input.action) {
      L.ignited = true;
      L.launchSequence = 'ASCENDING';
      L.ignitionTimerSec = 0;
      L.physicsAccumulatorSec = 0;
      L.throttle = 0.15;
      L.phaseStage = 'ENGINE_IGNITION';
    } else {
      L.phaseStage = 'ENGINE_IGNITION';
      return L;
    }
  }

  if (!L.ignited) {
    return L;
  }

  if (input.action) {
    L = separateLaunchStage(L);
  }

  if (L.orbitReached) {
    stepSingleFixedLaunchSubstep(L, input, FIXED_LAUNCH_DT);
    return L;
  }

  // Deterministic Fixed-Timestep Accumulator (120 Hz internal sub-step for 30/60/120 FPS invariance)
  const warp = L.timeWarp ?? 1;
  let acc = (L.physicsAccumulatorSec ?? 0) + dt * warp;
  let maxSubSteps = 60;
  while (acc + 1e-9 >= FIXED_LAUNCH_DT && maxSubSteps > 0) {
    stepSingleFixedLaunchSubstep(L, input, FIXED_LAUNCH_DT);
    acc = Math.max(0, acc - FIXED_LAUNCH_DT);
    maxSubSteps--;
    if (L.orbitReached) {
      acc = 0;
      break;
    }
  }
  L.physicsAccumulatorSec = acc;
  L.phaseStage = resolveLaunchPhaseStage(L);
  return L;
}
