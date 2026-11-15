import test from 'node:test';
import assert from 'node:assert/strict';
import { PLANETARY_CATALOG_SI, SI } from './planetaryCatalog';
import {
  SCIENTIFIC_EARTH_RADIUS_UNITS,
  classifySpacecraftTrajectory,
  computeBodyCartesianSI,
  getBodyVisualRadiusUnits,
  keplerianToCartesianSI,
  projectHeliocentricSIToScene,
  solveEccentricAnomaly,
} from './orbitalMechanics';
import { parseHorizonsVectorCsv } from './jplHorizons';

test('solveEccentricAnomaly satisfies Kepler equation M = E - e*sin(E) to <1e-10 rad', () => {
  const eccentricities = [0, 0.01671123, 0.20563593, 0.43607, 0.96714];
  const meanAnomalies = [-2.5, -0.7, 0, 0.45, 1.57, 2.9];

  for (const e of eccentricities) {
    for (const rawM of meanAnomalies) {
      const E = solveEccentricAnomaly(rawM, e);
      let expectedM = rawM % (Math.PI * 2);
      if (expectedM < 0) expectedM += Math.PI * 2;
      if (expectedM > Math.PI) expectedM -= Math.PI * 2;
      const residual = Math.abs(E - e * Math.sin(E) - expectedM);
      assert.ok(
        residual < 1e-10,
        `Kepler residual too large for e=${e}, M=${rawM}: residual=${residual}`
      );
    }
  }
});

test('keplerianToCartesianSI computes 3D inclined coordinates for Mercury, Pluto, and Halley', () => {
  const muSun = PLANETARY_CATALOG_SI.sun.muM3S2;
  for (const id of ['mercury', 'pluto', 'halley'] as const) {
    const entry = PLANETARY_CATALOG_SI[id];
    assert.ok(entry?.orbitalElements);
    const state = keplerianToCartesianSI(entry.orbitalElements, muSun, 0.25 * SI.JULIAN_YEAR_S);
    assert.ok(state.rM > 0);
    assert.ok(
      Math.abs(state.yM) > 1e8,
      `${id} inclined orbit should produce significant 3D out-of-plane Y coordinate`
    );
    assert.ok(state.specificEnergyJKg < 0, `${id} bound orbit should have negative specific energy`);
  }
});

test('parseHorizonsVectorCsv parses JPL Horizons SOE/EOE block into Three.js ecliptic SI meters & m/s', () => {
  const sampleCsv = `
*******************************************************************************
$$SOE
2460600.500000000, A.D. 2024-Oct-17 00:00:00.0000, 1.350000000000000E+08, 6.200000000000000E+07, -1.500000000000000E+04, -1.250000000000000E+01, 2.710000000000000E+01, 1.200000000000000E-03,
$$EOE
*******************************************************************************
`;
  const parsed = parseHorizonsVectorCsv(sampleCsv);
  assert.ok(parsed);
  assert.equal(parsed.posM.x, 1.35e11);
  assert.equal(parsed.posM.y, -1.5e7); // Three.Y = JPL.Z
  assert.equal(parsed.posM.z, -6.2e10); // Three.Z = -JPL.Y
  assert.equal(parsed.velMs.x, -12500);
  assert.equal(parsed.velMs.y, 1.2);
  assert.equal(parsed.velMs.z, -27100);

  assert.equal(parseHorizonsVectorCsv('invalid payload without markers'), null);
});

test('scientific mode preserves true Sun/Earth, Jupiter/Earth, and Earth-Moon physical ratios', () => {
  const rSun = getBodyVisualRadiusUnits('sun', 'scientific');
  const rEarth = getBodyVisualRadiusUnits('earth', 'scientific');
  const rJup = getBodyVisualRadiusUnits('jupiter', 'scientific');

  assert.equal(rEarth, SCIENTIFIC_EARTH_RADIUS_UNITS);
  const sunEarthRatio = rSun / rEarth;
  assert.ok(Math.abs(sunEarthRatio - 109.2) < 0.2, `Sun/Earth ratio expected ~109.2, got ${sunEarthRatio}`);

  const jupEarthRatio = rJup / rEarth;
  assert.ok(Math.abs(jupEarthRatio - 10.97) < 0.2, `Jupiter/Earth ratio expected ~10.97, got ${jupEarthRatio}`);

  const earthSi = computeBodyCartesianSI('earth', 0).state;
  const moonSi = computeBodyCartesianSI('moon', 0).state;
  const earthScene = projectHeliocentricSIToScene('earth', earthSi, 'scientific', 0, 0, earthSi);
  const moonScene = projectHeliocentricSIToScene('moon', moonSi, 'scientific', 0, 0, earthSi);
  const moonDistInEarthRadii =
    Math.hypot(moonScene.x - earthScene.x, moonScene.y - earthScene.y, moonScene.z - earthScene.z) / rEarth;
  assert.ok(
    Math.abs(moonDistInEarthRadii - 60.336) < 4.0,
    `Moon distance in R_earth expected ~60.34 (with eccentricity), got ${moonDistInEarthRadii}`
  );
});

test('classifySpacecraftTrajectory classifies Station-Keeping, Rendezvous, Flyby, Transfer, and Circular Orbit', () => {
  assert.equal(
    classifySpacecraftTrajectory({
      speedUnitsPerSec: 0,
      radialVelUnitsPerSec: 0,
      tangentialVelUnitsPerSec: 0,
      distanceToTargetUnits: 2,
      targetBodyRadiusUnits: 1,
      autoPilot: false,
      dockedOrStationKeeping: true,
    }),
    'Station-Keeping'
  );

  assert.equal(
    classifySpacecraftTrajectory({
      speedUnitsPerSec: 0.6,
      radialVelUnitsPerSec: 0.1,
      tangentialVelUnitsPerSec: 0.5,
      distanceToTargetUnits: 2.5,
      targetBodyRadiusUnits: 1,
      autoPilot: false,
      dockedOrStationKeeping: false,
    }),
    'Rendezvous'
  );

  assert.equal(
    classifySpacecraftTrajectory({
      speedUnitsPerSec: 4.5,
      radialVelUnitsPerSec: 1.2,
      tangentialVelUnitsPerSec: 4.2,
      distanceToTargetUnits: 2.5,
      targetBodyRadiusUnits: 1,
      autoPilot: false,
      dockedOrStationKeeping: false,
    }),
    'Flyby'
  );

  assert.equal(
    classifySpacecraftTrajectory({
      speedUnitsPerSec: 6.0,
      radialVelUnitsPerSec: 4.0,
      tangentialVelUnitsPerSec: 2.0,
      distanceToTargetUnits: 45,
      targetBodyRadiusUnits: 1.5,
      autoPilot: true,
      dockedOrStationKeeping: false,
    }),
    'Transfer Trajectory'
  );

  assert.equal(
    classifySpacecraftTrajectory({
      speedUnitsPerSec: 5.0,
      radialVelUnitsPerSec: 0.1,
      tangentialVelUnitsPerSec: 5.0,
      distanceToTargetUnits: 45,
      targetBodyRadiusUnits: 1.5,
      autoPilot: false,
      dockedOrStationKeeping: false,
      eccentricityEstimate: 0.02,
    }),
    'Circular Orbit'
  );
});
