import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCircularOrbitVelocity,
  computeOrbitPeriodSeconds,
  getBodyVisualRadiusUnits,
  EXPLORATION_VISUAL_LAYOUT,
  SCIENTIFIC_EARTH_RADIUS_UNITS,
} from '../../game/orbitalMechanics';
import { PLANETARY_CATALOG_SI } from '../../game/planetaryCatalog';
import { createInitialLaunchState, stepLaunchPhysics } from '../launch/launchPhysics';
import { computeLaunchOrbitHandoffState, createInitialSpaceFlightState } from './orbitPhysics';
import type { InputState } from '../../game/types';

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

test('PHASE 1: Low Earth Orbit (165 km) speed and orbital period numerical verification', () => {
  const muEarth = PLANETARY_CATALOG_SI.earth.muM3S2;
  const rEarthM = PLANETARY_CATALOG_SI.earth.meanRadiusM; // 6,371,000 m
  const altM = 165_000; // 165 km LEO parking orbit
  const rOrbitM = rEarthM + altM; // 6,536,000 m

  const vCircMs = computeCircularOrbitVelocity(muEarth, rOrbitM);
  // Theoretical: sqrt(3.986004418e14 / 6536000) = 7809.26 m/s
  assert.ok(
    Math.abs(vCircMs - 7809.26) < 1.0,
    `Circular orbit velocity should be ~7809.26 m/s, actual: ${vCircMs}`
  );

  const periodS = computeOrbitPeriodSeconds(muEarth, rOrbitM);
  const periodMin = periodS / 60;
  // Theoretical: 2 * pi * sqrt(6536000^3 / 3.986004418e14) = 5263.6 s = ~87.73 min
  assert.ok(
    Math.abs(periodMin - 87.73) < 0.2,
    `Orbital period should be ~87.73 minutes, actual: ${periodMin}`
  );
});

test('PHASE 1: Continuous parking orbit coasting advances elapsed time and downrange without stopping', () => {
  let L = createInitialLaunchState();
  L.altitudeKm = 165;
  L.horizontalSpeedMs = 7809;
  L.orbitReached = true;
  L.downrangeKm = 980;
  L.elapsed = 512;
  L.timeWarp = 1;

  // Coast in parking orbit for 10.0 seconds
  for (let i = 0; i < 100; i++) {
    L = stepLaunchPhysics(L, IDLE_INPUT, 0.1);
  }

  // Downrange must advance by ~ (7.809 km/s * 10s) = 78.09 km
  assert.ok(L.elapsed >= 522.0, `Elapsed time must advance, actual: ${L.elapsed}`);
  assert.ok(
    Math.abs((L.downrangeKm ?? 0) - (980 + 78.09)) < 1.0,
    `Downrange should advance by ~78.1 km, actual: ${L.downrangeKm}`
  );
  assert.equal(L.altitudeKm, 165);
  assert.equal(L.horizontalSpeedMs, 7809);
});

test('PHASE 1: Launch-to-orbit handoff generates continuous position and velocity (Fixes Bug B2)', () => {
  let L = createInitialLaunchState();
  L.altitudeKm = 165;
  L.horizontalSpeedMs = 7809;
  L.verticalSpeedMs = 0;
  L.downrangeKm = 1200;
  L.orbitReached = true;

  const handoff = computeLaunchOrbitHandoffState(L, 'artemis-2', 'exploration', 0, 'earth', false, 0);

  // Position must not be at origin or arbitrary default spawn
  assert.ok(Number.isFinite(handoff.shipX));
  assert.ok(Number.isFinite(handoff.shipZ));

  // Velocity must reflect the 7.81 km/s orbital speed, NOT zero
  assert.equal(handoff.orbitalSpeedKmS, 7.81);
  const sceneSpeed = Math.hypot(handoff.vx, handoff.vz);
  assert.ok(sceneSpeed > 1.5, `Scene speed must be positive and dynamic, got: ${sceneSpeed}`);
  assert.equal(handoff.trajectoryRegime, 'Circular Orbit');

  // Spaceflight state initialized with handoff preserves exact coordinates
  const space = createInitialSpaceFlightState('artemis-2', undefined, handoff);
  assert.equal(space.shipX, handoff.shipX);
  assert.equal(space.shipZ, handoff.shipZ);
  assert.equal(space.vx, handoff.vx);
  assert.equal(space.vz, handoff.vz);
  assert.equal(space.orbitalSpeedKmS, 7.81);
  assert.equal(space.trajectoryRegime, 'Circular Orbit');
});

test('PHASE 1: Educational and Scientific scale modes preserve authentic NASA planetary radius ratios (Fixes Bug B1)', () => {
  const rEarthSci = getBodyVisualRadiusUnits('earth', 'scientific');
  const rMoonSci = getBodyVisualRadiusUnits('moon', 'scientific');
  const rJupSci = getBodyVisualRadiusUnits('jupiter', 'scientific');
  const rSatSci = getBodyVisualRadiusUnits('saturn', 'scientific');

  // In scientific mode:
  assert.equal(rEarthSci, SCIENTIFIC_EARTH_RADIUS_UNITS);
  assert.ok(Math.abs(rMoonSci / rEarthSci - 0.2727) < 0.01, 'Moon/Earth radius ratio is ~0.2727');
  assert.ok(Math.abs(rJupSci / rEarthSci - 10.973) < 0.05, 'Jupiter/Earth radius ratio is ~10.97');
  assert.ok(Math.abs(rSatSci / rEarthSci - 9.140) < 0.05, 'Saturn/Earth radius ratio is ~9.14');

  // In educational mode:
  const rEarthEdu = getBodyVisualRadiusUnits('earth', 'exploration');
  const rMoonEdu = getBodyVisualRadiusUnits('moon', 'exploration');
  const rJupEdu = getBodyVisualRadiusUnits('jupiter', 'exploration');
  const rSatEdu = getBodyVisualRadiusUnits('saturn', 'exploration');

  assert.equal(rEarthEdu, 2.35);
  // Earth diameter / Moon diameter = (2 * 2.35) / (2 * 0.6409) = 3.667
  const earthMoonRatio = rEarthEdu / rMoonEdu;
  assert.ok(Math.abs(earthMoonRatio - 3.667) < 0.02, `Earth/Moon diameter ratio must be 3.667, got: ${earthMoonRatio}`);

  // Jupiter / Earth = 25.787 / 2.35 = 10.97
  const jupEarthRatio = rJupEdu / rEarthEdu;
  assert.ok(Math.abs(jupEarthRatio - 10.97) < 0.05, `Jupiter/Earth ratio must be ~10.97, got: ${jupEarthRatio}`);

  // Saturn / Earth = 21.478 / 2.35 = 9.14
  const satEarthRatio = rSatEdu / rEarthEdu;
  assert.ok(Math.abs(satEarthRatio - 9.14) < 0.05, `Saturn/Earth ratio must be ~9.14, got: ${satEarthRatio}`);
});
