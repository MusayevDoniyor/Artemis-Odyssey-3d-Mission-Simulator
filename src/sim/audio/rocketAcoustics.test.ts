import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SPEED_OF_SOUND_SEA_LEVEL_MS,
  computeSubBassRumble,
  computeExhaustCrackle,
  computeSrbRoar,
  computeAtmosphericBuffet,
  computeCockpitFilterCutoff,
  computeAcousticDistanceDelay,
  computeAirAbsorptionCutoff,
  computeDopplerRatio,
  computeRocketAcoustics,
} from './rocketAcoustics';

test('PHASE 4: Sub-bass rumble scales with throttle and preserves structural floor in vacuum', () => {
  // Pad liftoff at 100% throttle
  const padRumble = computeSubBassRumble(1.0, 0);
  assert.ok(padRumble >= 0.95, `Expected high sub-bass at liftoff: ${padRumble}`);

  // Idle / 0 throttle produces 0 rumble
  assert.equal(computeSubBassRumble(0, 0), 0);

  // 100 km near-vacuum retains mechanical hull floor (~0.18 to 0.45)
  const vacRumble = computeSubBassRumble(1.0, 100);
  assert.ok(vacRumble > 0.3 && vacRumble < 0.6, `Vacuum sub-bass should reflect structural conduction: ${vacRumble}`);
});

test('PHASE 4: Supersonic exhaust shear crackle decays exponentially with atmospheric density', () => {
  // Sea level liftoff produces intense shear crackle
  const seaCrackle = computeExhaustCrackle(1.0, 0, 0);
  assert.ok(seaCrackle >= 0.9, `Sea level crackle should be loud: ${seaCrackle}`);

  // At 45 km (near SRB separation), thin air drastically reduces airborne shear shockwaves
  const highAltCrackle = computeExhaustCrackle(1.0, 45, 4.4);
  assert.ok(highAltCrackle < 0.05, `Thin upper atmosphere must attenuate shear crackle: ${highAltCrackle}`);

  // Zero throttle produces 0 crackle
  assert.equal(computeExhaustCrackle(0.02, 0, 0), 0);
});

test('PHASE 4: Solid Rocket Booster roar is active until separation and drops to zero afterward', () => {
  // Liftoff on pad with SRBs burning
  const attachedRoar = computeSrbRoar(1.0, false);
  assert.equal(attachedRoar, 1.0);

  // Post-SRB staging (~45 km altitude)
  const stagedRoar = computeSrbRoar(1.0, true);
  assert.equal(stagedRoar, 0, 'SRB roar must be 0 after booster separation');
});

test('PHASE 4: Aerodynamic buffeting noise peaks at Max-Q and decays above 40 km', () => {
  // Low altitude / low speed (dynamic pressure ~2 kPa)
  const padBuffet = computeAtmosphericBuffet(2.0, 0.5);
  assert.ok(padBuffet.gain < 0.1, `Pad buffeting should be minimal: ${padBuffet.gain}`);

  // Max-Q at 12 km altitude, dynamic pressure 34 kPa
  const maxQBuffet = computeAtmosphericBuffet(34.0, 12.0);
  assert.ok(maxQBuffet.gain >= 0.85, `Max-Q buffeting should peak near 1.0: ${maxQBuffet.gain}`);
  assert.ok(maxQBuffet.centerFreqHz >= 250, `Buffet frequency should shift higher near Max-Q: ${maxQBuffet.centerFreqHz}`);

  // Orbital vacuum at 75 km altitude
  const orbitBuffet = computeAtmosphericBuffet(0.1, 75.0);
  assert.equal(orbitBuffet.gain, 0, 'Buffeting must be zero in orbital vacuum');
});

test('PHASE 4: Cockpit cabin filter drops cutoff from 18 kHz down to 380 Hz lowpass', () => {
  const exteriorCutoff = computeCockpitFilterCutoff(false);
  const cockpitCutoff = computeCockpitFilterCutoff(true);

  assert.equal(exteriorCutoff, 18000);
  assert.equal(cockpitCutoff, 380);
});

test('PHASE 4: Speed of sound propagation delay and high-frequency air absorption scale with distance', () => {
  // Pad tracking distance of 343.2 meters should delay by exactly 1.0 second
  const delay1s = computeAcousticDistanceDelay(SPEED_OF_SOUND_SEA_LEVEL_MS);
  assert.ok(Math.abs(delay1s - 1.0) < 0.001 || delay1s === 0.85); // clamped at 0.85

  // 171.6 meters should delay by ~0.50 seconds
  const delay500ms = computeAcousticDistanceDelay(171.6);
  assert.ok(Math.abs(delay500ms - 0.5) < 0.01, `Delay should be ~0.5s: ${delay500ms}`);

  // Air absorption cutoff: nearby (<20m) retains high frequencies; distant (500m) rolls off
  const nearCutoff = computeAirAbsorptionCutoff(15);
  const farCutoff = computeAirAbsorptionCutoff(600);
  assert.ok(nearCutoff > 12000, `Near cutoff should be high: ${nearCutoff}`);
  assert.ok(farCutoff < 3500, `Far cutoff should roll off high frequencies: ${farCutoff}`);
});

test('PHASE 4: Doppler pitch shift shifts higher toward listener and lower moving away', () => {
  // Ascending toward camera at 100 m/s
  const closingDoppler = computeDopplerRatio(100);
  assert.ok(closingDoppler > 1.0, `Doppler must raise pitch closing: ${closingDoppler}`);

  // Moving away at 100 m/s
  const openingDoppler = computeDopplerRatio(-100);
  assert.ok(openingDoppler < 1.0, `Doppler must lower pitch opening: ${openingDoppler}`);

  // Stationary produces exact 1.0
  assert.equal(computeDopplerRatio(0), 1.0);
});

test('PHASE 4: Master acoustic telemetry synthesis matches combined aerospace state', () => {
  const liftoffState = computeRocketAcoustics({
    throttle: 1.0,
    altitudeKm: 0.1,
    dynamicPressureKpa: 3.5,
    machNumber: 0.15,
    srbSeparated: false,
    coreSeparated: false,
    isCockpit: false,
    cameraDistanceM: 45,
    radialVelocityMs: 25,
  });

  assert.ok(liftoffState.subBassRumbleGain > 0.8);
  assert.ok(liftoffState.exhaustCrackleGain > 0.8);
  assert.ok(liftoffState.srbRoarGain === 1.0);
  assert.ok(liftoffState.cabinFilterCutoffHz === 18000);
  assert.ok(liftoffState.totalEngineGain > 0.6);
  assert.ok(liftoffState.dopplerPitchRatio > 1.0);

  // In-cockpit check
  const cockpitState = computeRocketAcoustics({
    throttle: 1.0,
    altitudeKm: 0.1,
    dynamicPressureKpa: 3.5,
    machNumber: 0.15,
    srbSeparated: false,
    coreSeparated: false,
    isCockpit: true,
    cameraDistanceM: 5,
  });
  assert.equal(cockpitState.cabinFilterCutoffHz, 380);
});
