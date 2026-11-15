import type {
  LandingGuidanceMode,
  MarsEdlStage,
  MarsEdlState,
  PostLandingUnstowStage,
  PostLandingUnstowState,
  PreLaunchChecks,
  LeoTransferState,
  SurfacePlanet,
  TelemetrySpeedScale,
} from './types';

export const PRE_LAUNCH_ITEMS: ReadonlyArray<{
  key: keyof PreLaunchChecks;
  code: string;
  label: string;
  detail: string;
}> = [
  {
    key: 'powerBus',
    code: 'CHK-01',
    label: 'Internal Power & Avionics Bus',
    detail: 'Switch Orion & Core flight computers from pad umbilical to internal fuel cells.',
  },
  {
    key: 'cryoChill',
    code: 'CHK-02',
    label: 'Cryo LH₂ / LOX Engine Chilldown',
    detail: 'Chill 4× RS-25 turbopumps to -253°C so liquid fuel flows without vapor lock.',
  },
  {
    key: 'delugeArmed',
    code: 'CHK-03',
    label: 'LC-39B Sound-Suppression Deluge',
    detail: 'Arm 450,000 gal water flood to protect rocket skin from 195 dB acoustic blast.',
  },
  {
    key: 'crewArmClear',
    code: 'CHK-04',
    label: 'Crew Access Arm Retract & LAS Armed',
    detail: 'Retract white boarding bridge cleanly and arm Launch Abort System for crew safety.',
  },
];

export function createInitialPreLaunchChecks(): PreLaunchChecks {
  return {
    powerBus: false,
    cryoChill: false,
    delugeArmed: false,
    crewArmClear: false,
  };
}

export function areAllPreLaunchChecksGo(checks: PreLaunchChecks): boolean {
  return checks.powerBus && checks.cryoChill && checks.delugeArmed && checks.crewArmClear;
}

export function createInitialLeoTransferState(targetDeltaVMs = 3150): LeoTransferState {
  const rOrbitM = 6371000 + 165000;
  const muEarth = 3.986004418e14;
  const vCircKmS = Math.sqrt(muEarth / rOrbitM) / 1000;
  const vEscKmS = Math.sqrt((2 * muEarth) / rOrbitM) / 1000;
  return {
    inParkingOrbit: false,
    orbitAltitudeKm: 165,
    orbitalVelocityKmS: Number(vCircKmS.toFixed(2)),
    inclinationDeg: 28.5,
    orbitalPeriodMin: 87.8,
    tliBurnActive: false,
    tliBurnProgressPct: 0,
    tliDeltaVAppliedMs: 0,
    tliTargetDeltaVMs: targetDeltaVMs,
    readyForSpaceTransition: false,
    targetVelocityKmS: Number((vCircKmS + targetDeltaVMs / 1000).toFixed(2)),
    escapeVelocityKmS: Number(vEscKmS.toFixed(2)),
    apoapsisKm: 165,
    eccentricity: 0,
    fuelBurnedPct: 0,
  };
}

export function stepLeoTransfer(
  state: LeoTransferState,
  dt: number,
  orbitReached: boolean,
  achievedSpeedKmS?: number,
  options?: { altitudeKm?: number; icpsFuelPct?: number }
): LeoTransferState {
  if (!orbitReached) return state;

  const rEarthM = 6371000;
  const muEarth = 3.986004418e14;
  const altKm = Math.max(150, options?.altitudeKm ?? (state.orbitAltitudeKm || 165));
  const rPerigeeM = rEarthM + altKm * 1000;
  const vCircMs = Math.sqrt(muEarth / rPerigeeM);
  const vEscMs = Math.sqrt((2 * muEarth) / rPerigeeM);

  const baseSpeedKmS =
    state.tliDeltaVAppliedMs > 0
      ? vCircMs / 1000
      : achievedSpeedKmS && achievedSpeedKmS > 5.5 && achievedSpeedKmS < 8.1
        ? achievedSpeedKmS
        : vCircMs / 1000;

  const targetDvMs = state.tliTargetDeltaVMs || 3150;
  const next: LeoTransferState = {
    ...state,
    inParkingOrbit: true,
    orbitAltitudeKm: Math.round(altKm),
    escapeVelocityKmS: Number((vEscMs / 1000).toFixed(2)),
    targetVelocityKmS: Number((baseSpeedKmS + targetDvMs / 1000).toFixed(2)),
    orbitalVelocityKmS: Number((baseSpeedKmS + (state.tliDeltaVAppliedMs || 0) / 1000).toFixed(2)),
  };

  if (next.tliBurnActive && !next.readyForSpaceTransition) {
    // Physical RL10B-2 vacuum burn: F = 110.1 kN, Isp = 462 s, wet ICPS+Orion mass
    const rl10ThrustN = 110100;
    const rl10IspS = 462.0;
    const g0 = 9.80665;
    const dryMassKg = 30000;
    const totalPropKg = 29000;
    const currentFuelPct = Math.max(
      4,
      (options?.icpsFuelPct ?? 92) - (next.fuelBurnedPct ?? 0)
    );
    const propMassKg = (totalPropKg * currentFuelPct) / 100;
    const massKg = dryMassKg + propMassKg;

    // Orbital departure time compression (~185x real-time so ~800s RL10 burn plays smoothly over ~4.4s)
    const burnTimeScale = 185;
    const burnDt = Math.min(dt, 0.1) * burnTimeScale;
    const accelMs2 = rl10ThrustN / massKg;
    const dvStepMs = accelMs2 * burnDt;

    const nextDvMs = Math.min(targetDvMs, (next.tliDeltaVAppliedMs || 0) + dvStepMs);
    const mdotKgS = rl10ThrustN / (rl10IspS * g0);
    const burnedPctStep = ((mdotKgS * burnDt) / totalPropKg) * 100;

    next.tliDeltaVAppliedMs = Math.round(nextDvMs);
    next.tliBurnProgressPct = Math.min(100, (nextDvMs / targetDvMs) * 100);
    next.fuelBurnedPct = Math.min(95, (next.fuelBurnedPct ?? 0) + burnedPctStep);

    const vNowMs = baseSpeedKmS * 1000 + nextDvMs;
    next.orbitalVelocityKmS = Number((vNowMs / 1000).toFixed(2));

    // Real Vis-Viva orbital energy & eccentricity at perigee departure
    const specEnergy = 0.5 * vNowMs * vNowMs - muEarth / rPerigeeM;
    const hAng = rPerigeeM * vNowMs;
    const ecc = Math.sqrt(Math.max(0, 1 + (2 * specEnergy * hAng * hAng) / (muEarth * muEarth)));
    next.eccentricity = Number(ecc.toFixed(3));
    if (specEnergy < -10) {
      const aOrbit = -muEarth / (2 * specEnergy);
      next.apoapsisKm = Math.round((aOrbit * (1 + ecc) - rEarthM) / 1000);
    } else {
      next.apoapsisKm = 400_000; // Hyperbolic escape trajectory
    }

    if (next.tliBurnProgressPct >= 99.9) {
      next.tliBurnProgressPct = 100;
      next.tliDeltaVAppliedMs = targetDvMs;
      next.tliBurnActive = false;
      next.readyForSpaceTransition = true;
    }
  } else {
    const vNowMs = baseSpeedKmS * 1000 + (next.tliDeltaVAppliedMs || 0);
    const specEnergy = 0.5 * vNowMs * vNowMs - muEarth / rPerigeeM;
    const hAng = rPerigeeM * vNowMs;
    const ecc = Math.sqrt(Math.max(0, 1 + (2 * specEnergy * hAng * hAng) / (muEarth * muEarth)));
    next.eccentricity = Number(ecc.toFixed(3));
    next.apoapsisKm =
      specEnergy < -10
        ? Math.round(((-muEarth / (2 * specEnergy)) * (1 + ecc) - rEarthM) / 1000)
        : 400_000;
  }

  return next;
}

export interface MarsEdlStageSpec {
  id: MarsEdlStage;
  title: string;
  altWindowLabel: string;
  speedLabel: string;
  durationSec: number;
  summary: string;
}

export const MARS_EDL_TIMELINE: MarsEdlStageSpec[] = [
  {
    id: 'CRUISE_SEP',
    title: '1. Cruise Stage Separation',
    altWindowLabel: '~125 km Entry Interface',
    speedLabel: '19,800 km/h',
    durationSec: 1.5,
    summary: 'Solar cruise ring separates so heat-shielded aeroshell faces Mars atmosphere.',
  },
  {
    id: 'ENTRY_PLASMA',
    title: '2. Peak Hypersonic Plasma',
    altWindowLabel: '125 km -> 11 km',
    speedLabel: '2,100°C Heat Shield',
    durationSec: 2.2,
    summary: 'Thin CO₂ air creates glowing orange shock plasma—14-min comms blackout active.',
  },
  {
    id: 'PARACHUTE',
    title: '3. Supersonic Parachute Deploy',
    altWindowLabel: '~11 km AGL · Mach 1.7',
    speedLabel: '1,600 -> 320 km/h',
    durationSec: 2.0,
    summary: '21.5 m disk-gap-band nylon canopy snaps open against Mars wind.',
  },
  {
    id: 'HEAT_SHIELD_DROP',
    title: '4. Heat Shield Jettison & Radar Lock',
    altWindowLabel: '~7 km -> 1.8 km',
    speedLabel: 'Terrain Relative Nav',
    durationSec: 1.8,
    summary: 'Charred shield drops away so descent cameras match Jezero boulders below.',
  },
  {
    id: 'SKY_CRANE',
    title: '5. Powered Sky Crane & Tether Lowering',
    altWindowLabel: '20 m Hover',
    speedLabel: '0.75 m/s Nylon Bridle',
    durationSec: 2.6,
    summary: 'Hovering jetpack lowers rover softly on 3 nylon cables, cuts wires, and flies clear!',
  },
  {
    id: 'HANDOFF',
    title: '6. Manual Flare & Touchdown Window',
    altWindowLabel: '< 140 m Terminal',
    speedLabel: 'Pilot Control Active',
    durationSec: 0,
    summary: 'Sky Crane backshell clear—pilot or Autoland guides final Jezero touchdown!',
  },
];

export function createInitialMarsEdlState(planet: SurfacePlanet): MarsEdlState {
  if (planet !== 'mars') {
    return {
      active: false,
      stage: 'HANDOFF',
      stageTimerSec: 0,
      signalDelayMin: 0.02, // 1.3s Moon light-time
      commsBlackout: false,
      heatShieldDropped: true,
      parachuteDeployed: false,
      skyCraneLoweringPct: 0,
    };
  }
  return {
    active: true,
    stage: 'CRUISE_SEP',
    stageTimerSec: 0,
    signalDelayMin: 14,
    commsBlackout: false,
    heatShieldDropped: false,
    parachuteDeployed: false,
    skyCraneLoweringPct: 0,
  };
}

export function stepMarsEdlSequence(
  state: MarsEdlState,
  dt: number,
  altitudeY: number,
  planet: SurfacePlanet
): MarsEdlState {
  if (planet !== 'mars' || !state.active || state.stage === 'HANDOFF') {
    return state;
  }

  const next = { ...state, stageTimerSec: state.stageTimerSec + dt };
  const currentSpec = MARS_EDL_TIMELINE.find((s) => s.id === next.stage);
  const idx = MARS_EDL_TIMELINE.findIndex((s) => s.id === next.stage);

  // Also guarantee transition before hitting ground if pilot dives early
  if (altitudeY < 58 && next.stage !== 'SKY_CRANE' && next.stage !== 'HANDOFF') {
    next.stage = 'SKY_CRANE';
    next.stageTimerSec = 0;
  } else if (currentSpec && currentSpec.durationSec > 0 && next.stageTimerSec >= currentSpec.durationSec) {
    const nextSpec = MARS_EDL_TIMELINE[Math.min(MARS_EDL_TIMELINE.length - 1, idx + 1)];
    next.stage = nextSpec.id;
    next.stageTimerSec = 0;
  }

  next.commsBlackout = next.stage === 'ENTRY_PLASMA';
  next.parachuteDeployed =
    next.stage === 'PARACHUTE' || next.stage === 'HEAT_SHIELD_DROP';
  next.heatShieldDropped =
    next.stage === 'HEAT_SHIELD_DROP' || next.stage === 'SKY_CRANE' || next.stage === 'HANDOFF';

  if (next.stage === 'SKY_CRANE') {
    next.skyCraneLoweringPct = Math.min(100, (next.stageTimerSec / 2.6) * 100);
  } else if (next.stage === 'HANDOFF') {
    next.skyCraneLoweringPct = 100;
    next.active = false;
  }

  return next;
}

export function fastForwardMarsEdl(state: MarsEdlState): MarsEdlState {
  return {
    ...state,
    active: false,
    stage: 'HANDOFF',
    stageTimerSec: 0,
    commsBlackout: false,
    heatShieldDropped: true,
    parachuteDeployed: false,
    skyCraneLoweringPct: 100,
  };
}

export interface UnstowStepSpec {
  id: PostLandingUnstowStage;
  title: string;
  durationSec: number;
  explanation: string;
}

export const POST_LANDING_UNSTOW_STEPS: UnstowStepSpec[] = [
  {
    id: 'ENGINE_COOL',
    title: '1. Descent Engine Shutdown & Thermal Soak',
    durationSec: 1.4,
    explanation: 'Closing propellant valves and letting 1,400°C engine bell cool beside dust.',
  },
  {
    id: 'CREW_CHECKLIST',
    title: '2. Post-Landing Cabin & Tilt Check',
    durationSec: 1.3,
    explanation: 'Confirming level footpads, battery bus health, and Earth DSN radio lock.',
  },
  {
    id: 'RAMP_DEPLOY',
    title: '3. Cargo Bay Unlock & Ramp Deployment',
    durationSec: 1.7,
    explanation: 'Explosive bolts release the fold-down ramp onto the crater floor.',
  },
  {
    id: 'ROVER_UNSTOW',
    title: '4. Rover Unstow, Mast & Rocker-Bogie Deploy',
    durationSec: 2.1,
    explanation: 'Wheels lock down, stereo camera mast rises, and rover rolls cleanly off the ramp!',
  },
  {
    id: 'SYSTEMS_CHECK',
    title: '5. TRIDENT Drill & Solar Self-Test',
    durationSec: 1.1,
    explanation: 'Verifying wheel steering motors and neutron spectrometer calibration—ready to drive!',
  },
];

export function createInitialUnstowState(planet: SurfacePlanet): PostLandingUnstowState {
  return {
    active: true,
    stage: 'ENGINE_COOL',
    planet,
    stageElapsedSec: 0,
    totalProgressPct: 0,
    rampDeployPct: 0,
    roverRolloutPct: 0,
    mastDeployPct: 0,
    completed: false,
  };
}

export function stepUnstowSequence(
  state: PostLandingUnstowState,
  dt: number
): PostLandingUnstowState {
  if (!state.active || state.completed) return state;

  const idx = POST_LANDING_UNSTOW_STEPS.findIndex((s) => s.id === state.stage);
  const spec = POST_LANDING_UNSTOW_STEPS[idx] ?? POST_LANDING_UNSTOW_STEPS[0];
  let nextStage = state.stage;
  let stageElapsed = state.stageElapsedSec + dt;
  let completed = false;

  if (stageElapsed >= spec.durationSec) {
    if (idx >= POST_LANDING_UNSTOW_STEPS.length - 1) {
      completed = true;
      stageElapsed = spec.durationSec;
      nextStage = 'COMPLETE';
    } else {
      nextStage = POST_LANDING_UNSTOW_STEPS[idx + 1].id;
      stageElapsed = 0;
    }
  }

  const totalDur = POST_LANDING_UNSTOW_STEPS.reduce((acc, s) => acc + s.durationSec, 0);
  let accum = 0;
  for (let i = 0; i < POST_LANDING_UNSTOW_STEPS.length; i++) {
    const s = POST_LANDING_UNSTOW_STEPS[i];
    if (s.id === nextStage) {
      accum += stageElapsed;
      break;
    }
    accum += s.durationSec;
  }
  const totalProgressPct = completed ? 100 : Math.min(99, (accum / totalDur) * 100);

  let rampDeployPct = state.rampDeployPct;
  let roverRolloutPct = state.roverRolloutPct;
  let mastDeployPct = state.mastDeployPct;

  if (nextStage === 'RAMP_DEPLOY') {
    rampDeployPct = Math.min(100, (stageElapsed / 1.7) * 100);
  } else if (
    nextStage === 'ROVER_UNSTOW' ||
    nextStage === 'SYSTEMS_CHECK' ||
    nextStage === 'COMPLETE'
  ) {
    rampDeployPct = 100;
  }

  if (nextStage === 'ROVER_UNSTOW') {
    roverRolloutPct = Math.min(100, (stageElapsed / 2.1) * 100);
    mastDeployPct = Math.min(100, (stageElapsed / 1.5) * 100);
  } else if (nextStage === 'SYSTEMS_CHECK' || nextStage === 'COMPLETE') {
    roverRolloutPct = 100;
    mastDeployPct = 100;
  }

  return {
    ...state,
    active: !completed,
    stage: nextStage,
    stageElapsedSec: stageElapsed,
    totalProgressPct,
    rampDeployPct,
    roverRolloutPct,
    mastDeployPct,
    completed,
  };
}

export function fastForwardUnstow(state: PostLandingUnstowState): PostLandingUnstowState {
  return {
    ...state,
    active: false,
    stage: 'COMPLETE',
    stageElapsedSec: 0,
    totalProgressPct: 100,
    rampDeployPct: 100,
    roverRolloutPct: 100,
    mastDeployPct: 100,
    completed: true,
  };
}

/**
 * Apollo 11 1202 Program Alarm helper: triggers once on Moon landing between 45m and 75m AGL
 * in MANUAL or RATE_ASSIST when guidance mode isn't already cleared.
 */
export function shouldTriggerApollo1202Alarm(
  planet: SurfacePlanet,
  altitudeY: number,
  guidanceMode: LandingGuidanceMode,
  alreadyTriggered: boolean,
  alreadyCleared: boolean
): boolean {
  if (planet !== 'moon' || alreadyTriggered || alreadyCleared) return false;
  if (guidanceMode === 'AUTOLAND') return false;
  return altitudeY <= 74 && altitudeY >= 38;
}

/**
 * Real VIPER top speed is ~0.10–0.20 m/s (0.36–0.72 km/h); Kid Mode applies ×25 exploration speed.
 */
export function computeRoverDisplaySpeed(
  simSpeedMs: number,
  scale: TelemetrySpeedScale
): { displayMs: number; displayKmh: number; scaleLabel: string; badgeText: string } {
  const abs = Math.abs(simSpeedMs);
  if (scale === 'REAL_SPEED') {
    // Normalize physics speed (0..13.2 m/s trainer units) to authentic 0..0.20 m/s VIPER drive rate
    const realMs = Math.min(0.2, (abs / 13.2) * 0.18);
    return {
      displayMs: Number(realMs.toFixed(2)),
      displayKmh: Number((realMs * 3.6).toFixed(2)),
      scaleLabel: 'REAL VIPER RATE (1×)',
      badgeText: 'REAL DATA',
    };
  }
  return {
    displayMs: Number(abs.toFixed(1)),
    displayKmh: Number((abs * 3.6).toFixed(1)),
    scaleLabel: 'KID EXPLORE (TIME ×25)',
    badgeText: 'SIMULATED VALUE',
  };
}
