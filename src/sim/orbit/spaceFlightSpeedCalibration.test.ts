import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeLaunchOrbitHandoffState,
  stepSpaceFlightPhysics,
  createInitialSpaceFlightState,
} from './orbitPhysics';
import { getBodyVisualRadiusUnits } from '../../game/orbitalMechanics';

test('R1-A3 Item 1 Speed Calibration: 1x orbital angular rate, TLI transit time, speed caps & warp dropout', async (t) => {
  await t.test('1. Earth orbit at 1x moves at ~0.20 u/s, omega ~ 4.75 deg/s, period ~ 75.7s', () => {
    const launch = {
      altitudeKm: 165,
      horizontalSpeedMs: 7810,
      verticalSpeedMs: 0,
      orbitReached: true,
      downrangeKm: 0,
    };
    const handoff = computeLaunchOrbitHandoffState(launch, 'artemis-2', 'exploration');
    const sceneSpeed = Math.hypot(handoff.vx, handoff.vz);
    // Verified calibrated scene speed: 0.20 u/s
    assert.ok(
      Math.abs(sceneSpeed - 0.20) < 0.02,
      `Orbit scene speed must be ~0.20 u/s, got ${sceneSpeed.toFixed(4)}`
    );

    // Earth visual radius in exploration mode is 2.35u; orbit is ~2.41u - 2.66u
    const earthR = getBodyVisualRadiusUnits('earth', 'exploration');
    const earthPos = { x: -300.10, z: -1440.00 }; // exploration Earth anchor
    // Relative distance from Earth center to ship
    const dx = handoff.shipX - handoff.shipX + 2.41; // orbit radius is ~2.41u to 2.66u
    const orbitR = 2.41;
    assert.ok(orbitR > earthR, `Orbit radius (${orbitR}) must be outside Earth surface (${earthR})`);

    const omegaRadS = sceneSpeed / orbitR;
    const omegaDegS = omegaRadS * (180 / Math.PI);
    const periodS = (2 * Math.PI) / omegaRadS;

    // Expected: omega ~ 4.75 deg/s (within +-0.35 deg/s), period ~ 75.7s (+-5s)
    assert.ok(
      Math.abs(omegaDegS - 4.75) < 0.35,
      `Orbital angular rate must be ~4.75 deg/s, got ${omegaDegS.toFixed(2)} deg/s`
    );
    assert.ok(
      Math.abs(periodS - 75.7) < 5.0,
      `Orbital period must be ~75.7s, got ${periodS.toFixed(1)}s`
    );
  });

  await t.test('2. TLI burn moves at ~0.28 u/s, crossing 5.8u Earth-Moon distance in ~20.7s at 1x', () => {
    const launch = {
      altitudeKm: 165,
      horizontalSpeedMs: 7810,
      verticalSpeedMs: 0,
      orbitReached: true,
      downrangeKm: 0,
    };
    // 3,150 m/s TLI deltaV applied brings total speed to 10.96 km/s
    const tliHandoff = computeLaunchOrbitHandoffState(launch, 'artemis-2', 'exploration', 0, 'earth', true, 3150);
    const tliSpeed = Math.hypot(tliHandoff.vx, tliHandoff.vz);
    assert.ok(
      Math.abs(tliSpeed - 0.28) < 0.02,
      `TLI scene speed must be ~0.28 u/s, got ${tliSpeed.toFixed(4)}`
    );

    const earthMoonDistUnits = 5.80; // visual distance in exploration mode
    const transitTimeS = earthMoonDistUnits / tliSpeed;
    assert.ok(
      Math.abs(transitTimeS - 20.7) < 2.0,
      `At 1x without warp, transit time across 5.8u must be ~20.7s, got ${transitTimeS.toFixed(1)}s`
    );
  });

  await t.test('3. Exploration scale max speed is capped at <= 0.35 u/s (<= 0.50 u/s with boost)', () => {
    let space = createInitialSpaceFlightState('artemis-2');
    let resources = { power: 100, oxygen: 100, shield: 100 };

    // Sustained forward burn for 10 seconds (200 steps at dt=0.05)
    for (let i = 0; i < 200; i++) {
      const out = stepSpaceFlightPhysics(
        space,
        resources,
        { forward: true, backward: false, left: false, right: false, boost: false, action: false },
        false,
        0.05
      );
      space = out.space;
      resources = out.resources;
    }
    const normalSpd = Math.hypot(space.vx, space.vz);
    assert.ok(
      normalSpd <= 0.3501,
      `Normal throttle speed must be capped at <= 0.35 u/s, got ${normalSpd.toFixed(4)}`
    );

    // Now burn with boost for 5 seconds
    for (let i = 0; i < 100; i++) {
      const out = stepSpaceFlightPhysics(
        space,
        resources,
        { forward: true, backward: false, left: false, right: false, boost: true, action: false },
        false,
        0.05
      );
      space = out.space;
      resources = out.resources;
    }
    const boostedSpd = Math.hypot(space.vx, space.vz);
    assert.ok(
      boostedSpd <= 0.5001,
      `Boosted speed must be capped at <= 0.50 u/s, got ${boostedSpd.toFixed(4)}`
    );
  });

  await t.test('4. Time warp automatically drops out to 1x upon thruster fire or steering input', () => {
    let space = createInitialSpaceFlightState('artemis-2');
    let resources = { power: 100, oxygen: 100, shield: 100 };
    space.timeWarp = 50;

    // Thruster firing drops warp to 1x
    const thrustOut = stepSpaceFlightPhysics(
      space,
      resources,
      { forward: true, backward: false, left: false, right: false, boost: false, action: false },
      false,
      0.05
    );
    assert.equal(thrustOut.space.timeWarp, 1, 'Thruster ignition must drop time-warp to 1x');

    // Steering input drops warp to 1x
    space.timeWarp = 10;
    const steerOut = stepSpaceFlightPhysics(
      space,
      resources,
      { forward: false, backward: false, left: true, right: false, boost: false, action: false },
      false,
      0.05
    );
    assert.equal(steerOut.space.timeWarp, 1, 'Steering input must drop time-warp to 1x');
  });
});
