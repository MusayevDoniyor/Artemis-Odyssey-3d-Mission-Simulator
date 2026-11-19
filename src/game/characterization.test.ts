import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginLaunchCountdown,
  createInitialCampaignCarryover,
  createInitialLandingState,
  createInitialLaunchState,
  createInitialRoverState,
  createInitialSpaceFlightState,
  computeLaunchOrbitHandoffState,
  evaluateTouchdown,
  getSurfaceTerrainHeight,
  separateLaunchStage,
  stepLandingPhysics,
  stepLaunchPhysics,
  stepRoverPhysics,
  stepSpaceFlightPhysics,
} from './physics';
import { PHYSICS } from './constants';
import { computeRoverDisplaySpeed, createInitialLeoTransferState, stepLeoTransfer } from './sequences';
import type { InputState } from './types';

const IDLE_INPUT: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  action: false,
  boost: false,
  tiltForward: false,
  stabilize: false,
};

// ---------------------------------------------------------------------------
// 1. LAUNCH SIMULATION CHARACTERIZATION
// ---------------------------------------------------------------------------
test('CHARACTERIZATION: Launch state initialization and countdown progression', () => {
  let L = createInitialLaunchState();
  assert.equal(L.launchSequence, 'PRE_SIM');
  assert.equal(L.altitudeKm, 0);
  assert.equal(L.massKg, PHYSICS.SLS_LIFTOFF_MASS_KG);
  assert.equal(L.ignited, false);

  L = beginLaunchCountdown(L);
  assert.equal(L.launchSequence, 'COUNTDOWN');
  assert.equal(L.countdownSec, 3);

  // Tick 10 steps of 0.1s (1.0s total): countdown decreases from 3 to 2, rocket does not move
  for (let i = 0; i < 10; i++) {
    L = stepLaunchPhysics(L, IDLE_INPUT, 0.1);
  }
  assert.equal(L.launchSequence, 'COUNTDOWN');
  assert.ok(Math.abs(L.countdownSec - 2.0) < 0.01, `Countdown should be 2.0, actual: ${L.countdownSec}`);
  assert.equal(L.altitudeKm, 0);

  // Tick 25 steps of 0.1s (2.5s more): reaches READY without auto-igniting
  for (let i = 0; i < 25; i++) {
    L = stepLaunchPhysics(L, IDLE_INPUT, 0.1);
  }
  assert.equal(L.launchSequence, 'READY');
  assert.equal(L.ignited, false);
  assert.equal(L.altitudeKm, 0);
});

test('CHARACTERIZATION: Launch ascent, Max-Q aerodynamic pressure, and staging', () => {
  let L = createInitialLaunchState();
  L = beginLaunchCountdown(L);

  // Tick through countdown to READY
  for (let i = 0; i < 35; i++) {
    L = stepLaunchPhysics(L, IDLE_INPUT, 0.1);
  }
  assert.equal(L.launchSequence, 'READY');

  // Press forward to ignite
  const FLY_INPUT: InputState = { ...IDLE_INPUT, forward: true };
  L = stepLaunchPhysics(L, FLY_INPUT, 0.05);
  assert.equal(L.ignited, true);
  assert.equal(L.launchSequence, 'ASCENDING');

  // Climb through Max-Q (between 9 km and 16 km)
  let maxQObserved = 0;
  for (let i = 0; i < 400; i++) {
    L = stepLaunchPhysics(L, FLY_INPUT, 0.05);
    if (L.dynamicPressureKpa > maxQObserved) {
      maxQObserved = L.dynamicPressureKpa;
    }
    if (L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && !L.srbSeparated) {
      L = separateLaunchStage(L);
    }
  }

  // Max-Q must produce measurable dynamic pressure > 20 kPa
  assert.ok(maxQObserved > 20, `Max-Q should exceed 20 kPa, observed: ${maxQObserved}`);
  assert.ok(L.altitudeKm > 30, `Rocket should climb past 30 km, actual: ${L.altitudeKm}`);
});

// ---------------------------------------------------------------------------
// 2. LANDING POWERED DESCENT CHARACTERIZATION (WITH KNOWN DEFECT TAGS)
// ---------------------------------------------------------------------------

// KNOWN_DEFECT: Fixed in Milestone 6
// Currently, createInitialLandingState spawns at ~84m altitude with 0% throttle,
// causing an unrecoverable crash in ~4.5 seconds under lunar gravity.
test('CHARACTERIZATION [KNOWN_DEFECT: M6]: Initial landing state spawns with 0 throttle and negative velocity', () => {
  const landing = createInitialLandingState(1.0, 'moon', 0);
  assert.equal(landing.planet, 'moon');
  assert.equal(landing.throttle, 0); // KNOWN_DEFECT: Spawns at 0% throttle
  assert.ok(landing.vy < 0, 'Spawns with negative vertical velocity');
  assert.ok(landing.y > 100, 'Spawns at initial height above 100m');
});

// KNOWN_DEFECT: Fixed in Milestone 6
// evaluateTouchdown assesses gear limits, but currently returns 'crash' if speed > 4.8 m/s
// without latching impact velocity into an outcome state, leading to '0.0 m/s' display bug.
test('CHARACTERIZATION: Touchdown criteria evaluation across speeds and tilts', () => {
  // Safe touchdown (vy <= 2.5, horiz <= 1.2, tilt <= 12)
  const perfect = evaluateTouchdown(1.2, 0.5, 3, 0);
  assert.equal(perfect, 'perfect');

  // Hard touchdown (within gear limits, but exceeds perfect: vy 3.2 > 2.5)
  const hard = evaluateTouchdown(3.2, 0.5, 10, 0);
  assert.equal(hard, 'hard');

  // Catastrophic crash (vy 5.5 > 4.8)
  const crash = evaluateTouchdown(5.5, 0.5, 2, 0);
  assert.equal(crash, 'crash');

  // Excessive tilt crash (tilt 26 > 24)
  const tiltCrash = evaluateTouchdown(1.0, 0.5, 26, 0);
  assert.equal(tiltCrash, 'crash');
});

// ---------------------------------------------------------------------------
// 3. ROVER MOBILITY & TERRAIN CHARACTERIZATION
// ---------------------------------------------------------------------------
test('CHARACTERIZATION: Surface terrain height equations generate distinctive features', () => {
  // Moon Pad center (radius < 15m) is flat (height = 0)
  assert.equal(getSurfaceTerrainHeight('moon', 0, 0), 0);

  // Moon Shackleton crater cold trap at (128, -142) has negative elevation (depression)
  const shackletonDepth = getSurfaceTerrainHeight('moon', 128, -142);
  assert.ok(shackletonDepth < -3.0, `Shackleton crater should be < -3m, actual: ${shackletonDepth}`);

  // Moon Malapert mountain ridge at (-148, -108) has positive elevation
  const malapertHeight = getSurfaceTerrainHeight('moon', -148, -108);
  assert.ok(malapertHeight > 4.0, `Malapert ridge should be > +4m, actual: ${malapertHeight}`);

  // Mars Jezero paleolake river channel near channel line has depression (distPad > 24m)
  const jezeroChannel = getSurfaceTerrainHeight('mars', -50, 51);
  assert.ok(jezeroChannel < -1.5, `Jezero river channel should be < -1.5m, actual: ${jezeroChannel}`);
});

test('CHARACTERIZATION: Rover kinematics updates heading and position', () => {
  let rover = createInitialRoverState(6, 6, 'moon');
  assert.equal(rover.planet, 'moon');
  assert.equal(rover.x, 6);
  assert.equal(rover.speed, 0);

  // Steer right and drive forward
  const DRIVE_INPUT: InputState = { ...IDLE_INPUT, forward: true, right: true };
  for (let i = 0; i < 20; i++) {
    rover = stepRoverPhysics(rover, DRIVE_INPUT, [], 0.05);
  }

  assert.ok(rover.speed > 0, 'Rover should accelerate when forward is held');
  assert.ok(rover.headingRad !== 0, 'Rover heading should turn when right is held');
});

// KNOWN_DEFECT: Fixed in Milestone 7 / Phase 7 (Bug B3)
// Choosing 'REAL_SPEED' in UI changes display telemetry label to ~0.18 m/s,
// but stepRoverPhysics simulates at unscaled speed (~6.8 m/s), meaning physical displacement
// in the simulation world is identical regardless of the speed scale setting.
test('CHARACTERIZATION [KNOWN_DEFECT: B3]: Rover physics step displacement does not scale with telemetry speedScale', () => {
  let rover1 = createInitialRoverState(6, 6, 'moon');
  let rover2 = createInitialRoverState(6, 6, 'moon');
  const DRIVE_FWD: InputState = { ...IDLE_INPUT, forward: true };

  // Drive both rovers for 1.0 second (20 steps of 0.05s)
  for (let i = 0; i < 20; i++) {
    rover1 = stepRoverPhysics(rover1, DRIVE_FWD, [], 0.05);
    rover2 = stepRoverPhysics(rover2, DRIVE_FWD, [], 0.05);
  }

  // Both rovers moved the exact same distance (~3.4m), reaching speed ~6.8 m/s
  assert.equal(rover1.speed, rover2.speed);
  assert.ok(rover1.speed > 5.0, 'Simulation runs at rapid game speed > 5 m/s');

  // But computeRoverDisplaySpeed formats REAL_SPEED down to 0.18 m/s while KID_25X displays 6.8 m/s:
  const displayReal = computeRoverDisplaySpeed(rover1.speed, 'REAL_SPEED');
  const displayKid = computeRoverDisplaySpeed(rover2.speed, 'KID_25X');
  assert.equal(displayReal.scaleLabel, 'REAL VIPER RATE (1×)');
  assert.equal(displayKid.scaleLabel, 'KID EXPLORE (TIME ×25)');
  assert.ok(displayReal.displayMs <= 0.20, 'Display claims 0.18 m/s');
  assert.ok(displayKid.displayMs >= 5.0, 'Display claims >= 5.0 m/s');
  // Proves the bug: physical motion in simulation is 100% disconnected from the REAL_SPEED selection!
});

// ---------------------------------------------------------------------------
// 4. ORBIT & SPACE FLIGHT CHARACTERIZATION (WITH KNOWN DEFECT TAGS)
// ---------------------------------------------------------------------------

// KNOWN_DEFECT: Fixed in Milestone 4
// Cislunar space flight initializes at shipX=0, shipZ=28. Trajectory classifications
// classify hyperbolic escape when speed exceeds local escape velocity.
test('CHARACTERIZATION: Space flight state initialization and target navigation', () => {
  const space = createInitialSpaceFlightState('artemis-2');
  assert.equal(space.targetId, 'moon');
  assert.equal(space.autoPilot, false);
  assert.ok(space.fuelPct > 0);
});

// KNOWN_DEFECT: Fixed in Milestone 4
// LEO Parking to TLI burn currently uses artificial 210x time compression and transitions
// directly to deep space without interactive orbital insertion or transfer flight guidance.
test('CHARACTERIZATION [KNOWN_DEFECT: M4]: LEO parking TLI burn progression and transition gating', () => {
  let leo = createInitialLeoTransferState();
  assert.equal(leo.inParkingOrbit, false);
  assert.equal(leo.tliBurnActive, false);
  assert.equal(leo.readyForSpaceTransition, false);

  // Activate TLI burn when in orbit
  leo = { ...leo, tliBurnActive: true };
  leo = stepLeoTransfer(leo, 0.1, true);
  assert.ok(leo.tliDeltaVAppliedMs > 0, 'TLI burn should apply Delta-V incrementally');
  assert.ok(leo.tliBurnProgressPct > 0, 'TLI progress should increase');
});

// RESOLVED IN PHASE 1 (Bug B2):
// Launch orbit handoff generates continuous coordinates and preserves ~7.8 km/s orbital speed
test('Launch to orbit phase transition handoff provides continuous orbital velocity and coordinates (Fixes B2)', () => {
  // 1. In launch state at orbital insertion:
  let L = createInitialLaunchState();
  L.altitudeKm = 165;
  L.horizontalSpeedMs = 7809;
  L.downrangeKm = 1500;
  L.orbitReached = true;

  // 2. Compute continuous orbital handoff:
  const handoff = computeLaunchOrbitHandoffState(L, 'artemis-2', 'exploration', 0, 'earth', false, 0);

  // 3. Space flight state created with handoff:
  const space = createInitialSpaceFlightState('artemis-2', undefined, handoff);

  assert.equal(space.shipX, handoff.shipX);
  assert.equal(space.shipZ, handoff.shipZ);
  assert.equal(space.orbitalSpeedKmS, 7.81);
  assert.ok(Math.hypot(space.vx, space.vz) >= 0.15, 'Space flight velocity is continuous with orbit');
  assert.equal(space.trajectoryRegime, 'Circular Orbit');
});

test('CHARACTERIZATION: Campaign carryover state tracking', () => {
  const carryover = createInitialCampaignCarryover();
  assert.equal(carryover.activeMission, 'artemis-2');
  assert.equal(carryover.completedMissions.length, 0);
  assert.equal(carryover.relaySatelliteOnline, false);
  assert.equal(carryover.isruWaterKg, 0);
});
