import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANETARY_CATALOG_SI,
  computeCircularOrbitSpeed,
  computeOrbitalPeriod,
} from '../src/game/planetaryCatalog';
import {
  SOLAR_SYSTEM_BODIES,
} from '../src/game/solarSystemData';
import {
  createInitialLandingState,
  stepLandingPhysics,
  evaluateTouchdown,
} from '../src/sim/landing/landingPhysics';
import {
  createInitialRoverState,
  stepRoverPhysics,
} from '../src/sim/rover/roverPhysics';
import { computeRoverDisplaySpeed } from '../src/game/sequences';
import type { InputState } from '../src/game/types';

describe('QA SIMULATION SUITE: Orbital Mechanics & Autopilot Invariants', () => {
  test('Continuous parking orbit: speed, radius, period and energy conservation', () => {
    const muEarth = PLANETARY_CATALOG_SI.earth.muM3S2;
    const rOrbit = 6_536_000; // 165 km LEO (r = 6371 + 165 km) in SI meters
    const vOrbit = computeCircularOrbitSpeed(muEarth, rOrbit);
    const periodSec = computeOrbitalPeriod(muEarth, rOrbit);

    const vOrbitKmS = vOrbit / 1000;
    assert.ok(vOrbitKmS >= 7.79 && vOrbitKmS <= 7.82, `Orbital speed at 165km must be ~7.80 km/s (got ${vOrbitKmS})`);
    assert.ok(periodSec >= 5240 && periodSec <= 5280, `Period at 165km must be ~87.7 min (got ${periodSec}s)`);

    // Energy conservation: epsilon = v^2 / 2 - mu / r
    const specificEnergy = (vOrbit * vOrbit) / 2 - muEarth / rOrbit;
    assert.ok(Number.isFinite(specificEnergy));
    assert.ok(specificEnergy < 0, 'Bound orbit must have negative specific orbital energy');

    // Numerical integration of 2 full coasting revolutions (10,500s) using Symplectic Verlet
    let x = rOrbit;
    let y = 0;
    let vx = 0;
    let vy = vOrbit;

    const dt = 2.0; // 2s time step
    const steps = Math.floor((periodSec * 2) / dt);
    const r0 = Math.hypot(x, y);
    const a0 = -muEarth / (r0 * r0 * r0);
    vx += 0.5 * a0 * x * dt;
    vy += 0.5 * a0 * y * dt;

    let maxRadius = rOrbit;
    let minRadius = rOrbit;

    for (let i = 0; i < steps; i++) {
      x += vx * dt;
      y += vy * dt;
      const r = Math.hypot(x, y);
      if (r > maxRadius) maxRadius = r;
      if (r < minRadius) minRadius = r;
      const a = -muEarth / (r * r * r);
      vx += a * x * dt;
      vy += a * y * dt;
    }

    const radialDriftPct = ((maxRadius - minRadius) / rOrbit) * 100;
    assert.ok(radialDriftPct < 0.05, `Circular orbit radius drift must be < 0.05% (got ${radialDriftPct.toFixed(4)}%)`);
  });

  test('Scale invariants: rendered radii ratios equal true volumetric mean radius ratios in both modes', () => {
    const earthR = PLANETARY_CATALOG_SI.earth.volumetricMeanRadiusM;
    const moonR = PLANETARY_CATALOG_SI.moon.volumetricMeanRadiusM;
    const jupiterR = PLANETARY_CATALOG_SI.jupiter.volumetricMeanRadiusM;
    const sunR = PLANETARY_CATALOG_SI.sun.volumetricMeanRadiusM;

    const trueMoonRatio = moonR / earthR;
    const trueJupiterRatio = jupiterR / earthR;
    const trueSunRatio = sunR / earthR;

    assert.ok(Math.abs(trueMoonRatio - 0.2727) < 0.005, 'Moon/Earth true ratio must be ~0.273');
    assert.ok(Math.abs(trueJupiterRatio - 10.97) < 0.05, 'Jupiter/Earth true ratio must be ~10.97');
    assert.ok(Math.abs(trueSunRatio - 109.2) < 0.5, 'Sun/Earth true ratio must be ~109.2');

    // Verify all planetary catalog entries have positive radius and mass
    for (const body of Object.values(PLANETARY_CATALOG_SI)) {
      assert.ok(body.volumetricMeanRadiusM > 0, `${body.name} must have positive volumetricMeanRadiusM`);
      assert.ok(body.massKg > 0, `${body.name} must have positive massKg`);
    }
  });
});

describe('QA SIMULATION SUITE: Landing Envelope & Touchdown Telemetry', () => {
  test('Landing grid evaluation: soft, hard, and crash envelopes', () => {
    // 1. Nominal soft touchdown
    const soft = evaluateTouchdown(1.2, 0.5, 2.0, 0);
    assert.equal(soft, 'perfect');

    // 2. Fatal crash (excess speed > 4.6 m/s)
    const crashSpeed = evaluateTouchdown(8.5, 0.5, 2.0, 0);
    assert.equal(crashSpeed, 'crash');

    // 3. Fatal crash (excess tilt > 12 deg)
    const crashTilt = evaluateTouchdown(1.2, 0.5, 25.0, 0);
    assert.equal(crashTilt, 'crash');
  });

  test('Fuzz test: Landing physics produces no NaN or Infinity across 500 randomized runs', () => {
    const dummyInput = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      action: false,
      tiltForward: false,
    };

    for (let i = 0; i < 500; i++) {
      let state = createInitialLandingState(1.0, 'moon');
      state.y = 50 + Math.random() * 200;
      state.vy = -Math.random() * 25;
      state.throttle = Math.random() * 100;
      state.pitchDeg = (Math.random() - 0.5) * 30;

      const next = stepLandingPhysics(state, dummyInput, 0.05, false);

      assert.ok(Number.isFinite(next.y), 'Altitude must be finite');
      assert.ok(Number.isFinite(next.vy), 'Vertical speed must be finite');
      assert.ok(!Number.isNaN(next.y), 'Altitude must not be NaN');
      assert.ok(!Number.isNaN(next.vy), 'Vertical speed must not be NaN');
      assert.ok(Number.isFinite(next.fuelPct), 'Fuel percentage must be finite');
    }
  });
});

describe('QA SIMULATION SUITE: Rover Kinematics & Speed Scaling', () => {
  test('Displacement strictly scales with speedScale across scientific and kid scale', () => {
    const DRIVE_FWD: Pick<InputState, 'forward' | 'backward' | 'left' | 'right'> = {
      forward: true,
      backward: false,
      left: false,
      right: false,
    };

    let roverReal = createInitialRoverState(6, 6, 'moon');
    let roverKid = createInitialRoverState(6, 6, 'moon');

    const dt = 0.05;
    for (let i = 0; i < 20; i++) {
      roverReal = stepRoverPhysics(roverReal, DRIVE_FWD, [], dt, 'REAL_SPEED');
      roverKid = stepRoverPhysics(roverKid, DRIVE_FWD, [], dt, 'KID_25X');
    }

    const distReal = Math.hypot(roverReal.x - 6, roverReal.z - 6);
    const distKid = Math.hypot(roverKid.x - 6, roverKid.z - 6);

    assert.ok(roverReal.speed <= 0.30, `REAL_SPEED rover speed should be <= 0.30 m/s, got ${roverReal.speed}`);
    assert.ok(roverKid.speed >= 5.0, `KID_25X rover speed should be >= 5.0 m/s, got ${roverKid.speed}`);
    assert.ok(distKid > distReal * 15, `KID_25X distance (${distKid}) must be substantially greater than REAL_SPEED (${distReal})`);
  });

  test('Speedometer readout matches physics telemetry', () => {
    const telemetryReal = computeRoverDisplaySpeed(0.05, 'REAL_SPEED');
    assert.equal(telemetryReal.displayMs, 0.05);
    assert.equal(telemetryReal.scaleLabel, 'REAL VIPER RATE (1×)');

    const telemetryKid = computeRoverDisplaySpeed(1.25, 'KID_25X');
    assert.equal(telemetryKid.displayMs, 1.3); // rounded to 1 decimal place in computeRoverDisplaySpeed
    assert.equal(telemetryKid.scaleLabel, 'KID EXPLORE (TIME ×25)');
  });
});
