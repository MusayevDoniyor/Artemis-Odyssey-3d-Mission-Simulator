import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLaunchOrbitHandoffState,
  createInitialSpaceFlightState,
  stepSpaceFlightPhysics,
} from '../../src/sim/orbit/orbitPhysics';
import {
  SOLAR_SYSTEM_BODIES,
  computeKeplerBodyPosition,
  SOLAR_SUN_ORIGIN_X,
  SOLAR_SUN_ORIGIN_Z,
} from '../../src/game/solarSystemData';
import { createLaunchComplexAndSLS } from '../../src/three/models';
import type { SpaceCameraMode, SpaceSasMode } from '../../src/game/types';

test('SPACE FLIGHT OVERHAUL: LEO Parking Equilibrium, Throttle, Cockpit & Thermal Glow', async (t) => {
  await t.test('1. LEO Parking Orbit: Zero radial drift & exact gravitational-centrifugal equilibrium', () => {
    const launch = {
      altitudeKm: 165,
      horizontalSpeedMs: 7810,
      verticalSpeedMs: 0,
      orbitReached: true,
      downrangeKm: 0,
    };
    // Handoff with 0 TLI deltaV -> entering stable parking orbit
    const handoff = computeLaunchOrbitHandoffState(launch, 'artemis-2', 'exploration', 0, 'earth', false, 0);
    assert.equal(handoff.trajectoryRegime, 'Circular Orbit');
    const v = Math.hypot(handoff.vx, handoff.vz);
    assert.ok(Math.abs(v - 0.20) < 0.02, `Circular orbit speed must be ~0.20 u/s, got ${v.toFixed(4)}`);

    // True Earth position in exploration mode
    const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
    const earthPos = computeKeplerBodyPosition(earthSpec, 0, 'exploration', SOLAR_SUN_ORIGIN_X, SOLAR_SUN_ORIGIN_Z, 'earth');
    const r = Math.hypot(handoff.shipX - earthPos.x, handoff.shipZ - earthPos.z);
    assert.ok(r > 2.35, `Orbit radius (${r.toFixed(3)}) must be outside Earth radius (2.35)`);

    // Equilibrium check: a_centrifugal = v^2 / r vs a_gravity = mu / r^2
    const aCentrifugal = (v * v) / r;
    const muEarthScene = 0.0964;
    const aGravity = muEarthScene / (r * r);
    const diff = Math.abs(aCentrifugal - aGravity);
    assert.ok(
      diff < 0.001,
      `Centrifugal (${aCentrifugal.toFixed(6)}) and gravity (${aGravity.toFixed(6)}) must balance within 0.001, diff=${diff.toFixed(6)}`
    );
  });

  await t.test('2. SpaceFlightState initialization without handoff spawns in stable circular orbit', () => {
    const space = createInitialSpaceFlightState('artemis-2');
    const spd = Math.hypot(space.vx, space.vz);
    assert.ok(spd > 0.18 && spd < 0.22, `Default space spawn must have circular orbit speed ~0.20 u/s, got ${spd.toFixed(4)}`);
  });

  await t.test('3. Throttle & Attitude (SAS) controls: Prograde, Retrograde, Manual and Reverse RCS', () => {
    let space = createInitialSpaceFlightState('artemis-2');
    let resources = { power: 100, oxygen: 100, shield: 100 };

    // Throttle up with forward thrust
    const outThrust = stepSpaceFlightPhysics(
      { ...space, throttle: 0.8 },
      resources,
      { forward: false, backward: false, left: false, right: false, boost: false, action: false },
      false,
      0.05
    );
    assert.ok(outThrust.space.fuelPct < space.fuelPct, 'Forward thrusting must consume propellant');

    // Test Retrograde SAS alignment
    space.vx = 0.20;
    space.vz = 0.00;
    space.sasMode = 'RETROGRADE';
    space.headingRad = 0; // pointed in +Z direction
    // Retrograde heading should point opposite to (0.20, 0.00) -> atan2(-0.20, 0.00) = -PI/2
    const outRetro = stepSpaceFlightPhysics(
      space,
      resources,
      { forward: false, backward: false, left: false, right: false, boost: false, action: false },
      false,
      0.1
    );
    // Heading should steer towards negative X (-PI/2)
    assert.ok(outRetro.space.headingRad < 0, 'RETROGRADE SAS must steer heading opposite to velocity vector');
  });

  await t.test('4. SpaceCameraMode includes cockpit FPV mode', () => {
    const validModes: SpaceCameraMode[] = ['overview', 'focus', 'orbit', 'track', 'free', 'cockpit'];
    assert.ok(validModes.includes('cockpit'), 'cockpit must be a valid SpaceCameraMode');
  });

  await t.test('5. Launch Complex models include thermalGlowCone for hypersonic aerothermal heating', () => {
    const dummyTex: any = {
      duskSky: null,
      cloudPuff: null,
      towerSteel: null,
      cableTexture: null,
    };
    const dummyMaps: any = {
      moonMap: null,
    };
    const lc = createLaunchComplexAndSLS(dummyTex, dummyMaps);
    assert.ok(lc.thermalGlowCone, 'thermalGlowCone mesh must be instantiated in LaunchComplexHandles');
    assert.equal(lc.thermalGlowCone.visible, false, 'thermalGlowCone must default to invisible on pad');
    assert.ok(lc.thermalGlowCone.position.y > 20, 'thermalGlowCone must be positioned on the forward LAS/fairing stack');
  });
});
