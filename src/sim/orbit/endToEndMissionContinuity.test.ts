import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANETARY_CATALOG_SI,
  computeCircularOrbitSpeed,
  computeOrbitalPeriod,
  computeEscapeVelocity,
  computeLaplaceSoiRadius,
} from '../../game/planetaryCatalog';
import { createInitialLaunchState, stepLaunchPhysics } from '../launch/launchPhysics';
import {
  computeLaunchOrbitHandoffState,
  createInitialSpaceFlightState,
  stepSpaceFlightPhysics,
} from './orbitPhysics';
import { separateLaunchStage } from '../launch/launchPhysics';
import { PHYSICS } from '../../game/constants';
import type { InputState } from '../../game/types';

test('BUG A3: Centralized NASA physical parameters & Keplerian orbit formulas verification', () => {
  // 1. Verify circular orbit speed formula: v = sqrt(GM / r)
  // For Earth at 165 km altitude (r = 6371 + 165 = 6536 km)
  const muEarth = PLANETARY_CATALOG_SI.earth.muM3S2;
  const rLEO = 6_536_000;
  const vCirc = computeCircularOrbitSpeed(muEarth, rLEO);
  assert.ok(Math.abs(vCirc - 7809.26) < 1.0, `Earth LEO vCirc should be ~7809.26 m/s, got ${vCirc}`);

  // 2. Verify orbital period formula: T = 2 * pi * sqrt(a^3 / GM)
  const tLEO = computeOrbitalPeriod(muEarth, rLEO);
  const tLEOMin = tLEO / 60;
  assert.ok(Math.abs(tLEOMin - 87.73) < 0.2, `Earth LEO orbital period should be ~87.73 min, got ${tLEOMin}`);

  // 3. Verify escape velocity formula: v_esc = sqrt(2 * GM / r)
  const vEsc = computeEscapeVelocity(muEarth, rLEO);
  assert.ok(Math.abs(vEsc - Math.SQRT2 * vCirc) < 0.01, `Escape velocity must equal sqrt(2) * vCirc`);

  // 4. Verify Laplace SOI formula: r_soi = a * (m / M_parent)^0.4
  const aMoon = PLANETARY_CATALOG_SI.moon.orbitalElements!.semiMajorAxisM;
  const mMoon = PLANETARY_CATALOG_SI.moon.massKg;
  const mEarth = PLANETARY_CATALOG_SI.earth.massKg;
  const rSoiMoon = computeLaplaceSoiRadius(aMoon, mMoon, mEarth);
  assert.ok(Math.abs(rSoiMoon - 66_100_000) < 2_000_000, `Moon Laplace SOI should be ~66,100 km, got ${rSoiMoon / 1000} km`);

  // 5. Verify every solar system body has populated NASA parameters
  for (const [id, body] of Object.entries(PLANETARY_CATALOG_SI)) {
    if (['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn'].includes(id)) {
      assert.ok(body.muM3S2 > 0, `${id} must have positive GM`);
      assert.ok(body.meanRadiusM > 0, `${id} must have positive mean radius`);
      assert.ok(body.surfaceGravityMs2 >= 0, `${id} must have valid surface gravity`);
      assert.ok(body.soiRadiusM != null && body.soiRadiusM > 0, `${id} must have positive SOI radius`);
      assert.ok(typeof body.hasAtmosphere === 'boolean', `${id} must define atmosphere flag`);
    }
  }
});

test('BUG A3 FIX: Single unbroken end-to-end integration: Liftoff -> SECO -> 2 Orbits Coast -> TLI -> Lunar SOI', () => {
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

  // STEP 1: Liftoff -> Powered Ascent -> SECO (165 km orbit)
  let L = createInitialLaunchState();
  assert.ok(L.launchSequence === 'PRE_SIM' || L.launchSequence === 'COUNTDOWN');
  L.launchSequence = 'ASCENDING';
  L.ignited = true;
  L.throttle = 1.0;

  // Simulate powered ascent with stage separations until orbit insertion
  for (let step = 0; step < 500; step++) {
    L = stepLaunchPhysics(L, { ...IDLE_INPUT, forward: true }, 0.05);
    if (L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && !L.srbSeparated) {
      L = separateLaunchStage(L);
    }
    if (L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM && !L.coreSeparated) {
      L = separateLaunchStage(L);
    }
    if (L.orbitReached) break;
  }
  assert.equal(L.orbitReached, true, 'Ascent must reach orbit');
  assert.ok(L.altitudeKm >= 160 && L.altitudeKm <= 170, `Orbit altitude must be ~165 km, got ${L.altitudeKm}`);
  assert.ok(L.horizontalSpeedMs >= 7700, `SECO horizontal speed must exceed 7700 m/s, got ${L.horizontalSpeedMs}`);

  // STEP 2: Parking Orbit Coast for >= 2 full orbits
  // Earth LEO period T = 5263.6 s (~87.7 min). 2 full orbits = 10,527.2 s
  // 1 full orbit circumference = 2 * pi * (6371 + 165) km = 41,067 km. 2 orbits = 82,134 km.
  const tOrbitS = computeOrbitalPeriod(PLANETARY_CATALOG_SI.earth.muM3S2, (6371 + 165) * 1000);
  const targetCoastTimeS = tOrbitS * 2.05; // > 2 full orbits

  const startCoastElapsed = L.elapsed;
  const startCoastDownrange = L.downrangeKm ?? 0;

  // Coast in parking orbit for >= 2 full orbits
  const coastDt = 0.1;
  const stepsToCoast = Math.ceil(targetCoastTimeS / coastDt);
  for (let i = 0; i < stepsToCoast; i++) {
    L = stepLaunchPhysics(L, IDLE_INPUT, coastDt);
    if (i % 25000 === 0) {
      assert.equal(L.altitudeKm, 165, 'Altitude must remain circular and stable at 165 km during coast');
      assert.equal(L.orbitReached, true);
    }
  }

  const elapsedCoasted = L.elapsed - startCoastElapsed;
  const downrangeCoasted = (L.downrangeKm ?? 0) - startCoastDownrange;
  assert.ok(elapsedCoasted >= targetCoastTimeS, `Coasted time (${elapsedCoasted}s) must cover >= 2 orbits (${targetCoastTimeS}s)`);
  assert.ok(downrangeCoasted >= 82000, `Coasted downrange (${downrangeCoasted} km) must cover >= 2 orbits (~82,134 km)`);

  // STEP 3: Trans-Lunar Injection (TLI) burn and Handoff to Space Flight
  // Artemis II ICPS applies ~3,050 - 3,150 m/s delta-v
  const tliDeltaVAppliedMs = 3150;
  const handoff = computeLaunchOrbitHandoffState(
    L,
    'artemis-2',
    'exploration',
    0,
    'earth',
    true,
    tliDeltaVAppliedMs
  );

  assert.equal(handoff.trajectoryRegime, 'Transfer Trajectory');
  // 7.81 km/s circular + 3.15 km/s TLI = 10.96 km/s hyperbolic transfer speed
  assert.equal(handoff.orbitalSpeedKmS, 10.96);
  assert.ok(Number.isFinite(handoff.shipX) && Number.isFinite(handoff.shipZ));

  // Initialize SpaceFlightState with handoff state
  let space = createInitialSpaceFlightState('artemis-2', undefined, handoff);
  space.targetId = 'moon';
  assert.equal(space.shipX, handoff.shipX, 'Handoff X must match initial space flight X exactly');
  assert.equal(space.shipZ, handoff.shipZ, 'Handoff Z must match initial space flight Z exactly');
  assert.equal(space.vx, handoff.vx, 'Handoff vx must match initial space flight vx exactly');
  assert.equal(space.vz, handoff.vz, 'Handoff vz must match initial space flight vz exactly');
  assert.equal(space.trajectoryRegime, 'Transfer Trajectory');

  // STEP 4: Coast through Cislunar space to Lunar Sphere of Influence (SOI)
  let resources = { power: 100, oxygen: 100, shield: 100 };
  let reachedLunarSoi = false;
  let previousShipX = space.shipX;
  let previousShipZ = space.shipZ;

  space.autoPilot = true;

  for (let step = 0; step < 800; step++) {
    const out = stepSpaceFlightPhysics(
      space,
      resources,
      IDLE_INPUT,
      false,
      0.05,
      0,
      'exploration'
    );
    space = out.space;
    resources = out.resources;

    // Verify coordinate continuity: position displacement per step must never teleport
    const stepDisp = Math.hypot(space.shipX - previousShipX, space.shipZ - previousShipZ);
    assert.ok(stepDisp < 25.0, `Displacement per physics step must be continuous without teleportation (got ${stepDisp}u)`);
    previousShipX = space.shipX;
    previousShipZ = space.shipZ;

    // Check for Lunar SOI arrival
    if (space.dominantBodyName === 'Moon' || space.activeTrajectoryFrame === 'moon_centred') {
      reachedLunarSoi = true;
      assert.ok(Number.isFinite(space.shipX) && Number.isFinite(space.shipZ));
      assert.ok(Number.isFinite(space.vx) && Number.isFinite(space.vz));
      break;
    }
  }

  assert.equal(reachedLunarSoi, true, 'Spacecraft must cleanly reach Lunar Sphere of Influence (SOI) in one unbroken flight');
});
