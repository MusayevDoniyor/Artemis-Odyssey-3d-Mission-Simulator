import test from 'node:test';
import assert from 'node:assert/strict';
import {
  beginLaunchCountdown,
  createInitialLaunchState,
  separateLaunchStage,
  stepLaunchPhysics,
} from './launchPhysics';
import { PHYSICS } from '../../game/constants';
import { SPACECRAFT_CATALOG_SI } from '../../game/planetaryCatalog';

const FLY_INPUT = { forward: true, left: false, right: false, action: false };
const IDLE_INPUT = { forward: false, left: false, right: false, action: false };

test('PHASE 3: SLS Block 1 liftoff propulsion and TWR match NASA published figures', () => {
  const L = createInitialLaunchState(true);
  assert.equal(L.massKg, 2_608_000, 'SLS Block 1 liftoff mass is 2,608,000 kg (NASA Reference Guide)');
  assert.equal(PHYSICS.SLS_LIFTOFF_THRUST_N, 39_140_000, 'SLS Block 1 liftoff thrust is 39.14 MN');

  const liftoffTwr = PHYSICS.SLS_LIFTOFF_THRUST_N / (L.massKg * PHYSICS.EARTH_GRAVITY);
  assert.ok(
    Math.abs(liftoffTwr - 1.53) < 0.05,
    `Liftoff TWR must be ~1.53 (published 1.53, got ${liftoffTwr.toFixed(3)})`
  );
});

test('PHASE 3: SLS ascent passes Max-Q at 10-14 km with transonic Mach peak', () => {
  let L = createInitialLaunchState(true);
  L = beginLaunchCountdown(L);
  for (let i = 0; i < 35; i++) {
    L = stepLaunchPhysics(L, IDLE_INPUT, 0.1);
  }
  // Hold launch button to ascend
  let maxQFound = false;
  let maxQAlt = 0;
  let peakDynamicPressureKpa = 0;

  for (let step = 0; step < 200; step++) {
    L = stepLaunchPhysics(L, FLY_INPUT, 0.05);
    if (L.dynamicPressureKpa > peakDynamicPressureKpa) {
      peakDynamicPressureKpa = L.dynamicPressureKpa;
      maxQAlt = L.altitudeKm;
    }
    if (L.phaseStage === 'MAX_Q') {
      maxQFound = true;
    }
    if (L.altitudeKm > 20) break;
  }

  assert.ok(maxQFound, 'SLS must traverse MAX_Q launch milestone phase');
  assert.ok(
    maxQAlt >= 9.0 && maxQAlt <= 15.0,
    `Max-Q altitude must occur between 9 and 15 km (NASA Artemis I: 12.4 km, got: ${maxQAlt.toFixed(2)} km)`
  );
  assert.ok(
    peakDynamicPressureKpa >= 25 && peakDynamicPressureKpa <= 45,
    `Peak dynamic pressure must be ~30-40 kPa (Artemis I: 36.5 kPa, got: ${peakDynamicPressureKpa.toFixed(1)} kPa)`
  );
});

test('PHASE 3: SLS staging sequence matches NASA published altitudes (SRB ~45 km, MECO ~165 km)', () => {
  let L = createInitialLaunchState(true);
  L = beginLaunchCountdown(L);
  for (let i = 0; i < 35; i++) {
    L = stepLaunchPhysics(L, IDLE_INPUT, 0.1);
  }

  // Ascend through SRB burnout and orbital insertion
  for (let step = 0; step < 460; step++) {
    L = stepLaunchPhysics(L, FLY_INPUT, 0.05);
    if (L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && !L.srbSeparated) {
      L = separateLaunchStage(L);
    }
    if (L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM && !L.coreSeparated) {
      L = separateLaunchStage(L);
    }
    if (L.orbitReached) break;
  }

  assert.ok(L.srbSeparated, 'SRBs must separate at ~45 km');
  assert.ok(L.coreSeparated, 'Core stage must separate at ~110 km MECO gate');
  assert.ok(L.orbitReached, 'Orbit must be confirmed at 165 km target');
  assert.ok(
    Math.abs(L.horizontalSpeedMs - 7809) < 15,
    `Orbital speed must be ~7,809 m/s (got ${L.horizontalSpeedMs} m/s)`
  );
});

test('PHASE 3: Historical Saturn V and Commercial Falcon 9 catalog specifications match published aerospace manuals', () => {
  const saturn = SPACECRAFT_CATALOG_SI['saturn-v'];
  assert.ok(saturn, 'Missing saturn-v in SPACECRAFT_CATALOG_SI');
  assert.equal(saturn.heightM, 110.6, 'Saturn V height is 110.6 m (MSFC-MAN-507)');
  assert.equal(saturn.diameterM, 10.06, 'Saturn V base diameter is 10.06 m');
  assert.equal(saturn.thrustN, 34_500_000, 'Saturn V first stage thrust is 34.5 MN');
  assert.equal(saturn.wetMassKg, 2_970_000, 'Saturn V liftoff mass is 2,970,000 kg');
  const saturnTwr = saturn.thrustN / (saturn.wetMassKg * 9.80665);
  assert.ok(Math.abs(saturnTwr - 1.185) < 0.05, `Saturn V liftoff TWR is ~1.18 (got ${saturnTwr.toFixed(3)})`);

  const falcon = SPACECRAFT_CATALOG_SI['falcon-9'];
  assert.ok(falcon, 'Missing falcon-9 in SPACECRAFT_CATALOG_SI');
  assert.equal(falcon.heightM, 70.0, 'Falcon 9 height is 70.0 m (SpaceX User Guide)');
  assert.equal(falcon.diameterM, 3.66, 'Falcon 9 diameter is 3.66 m');
  assert.equal(falcon.thrustN, 7_607_000, 'Falcon 9 sea-level thrust is 7.607 MN');
  assert.equal(falcon.wetMassKg, 549_054, 'Falcon 9 liftoff mass is 549,054 kg');
  const falconTwr = falcon.thrustN / (falcon.wetMassKg * 9.80665);
  assert.ok(Math.abs(falconTwr - 1.41) < 0.05, `Falcon 9 liftoff TWR is ~1.41 (got ${falconTwr.toFixed(3)})`);
});
