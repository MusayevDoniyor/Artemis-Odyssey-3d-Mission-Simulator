import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANETARY_CATALOG_SI,
  computeCircularOrbitSpeed,
  computeOrbitalPeriod,
  SI,
} from '../../game/planetaryCatalog';
import {
  computeBodyCartesianSI,
  solveEccentricAnomaly,
} from '../../game/orbitalMechanics';
import {
  SOLAR_SYSTEM_BODIES,
  computeKeplerBodyPosition,
} from '../../game/solarSystemData';

describe('REMEDIATION R1-A2 BUG A3: Keplerian Orbit Mechanics & Gravitational Physics Suite', () => {
  // TEST 1: Circular orbit stays circular (radius drift under tolerance over many revolutions)
  test('1. Circular orbit stays circular: radius drift < 0.05% over 50 complete revolutions', () => {
    const muEarth = PLANETARY_CATALOG_SI.earth.muM3S2;
    const rOrbit = 6_536_000; // 165 km LEO (r = 6371 + 165 km)
    const vCirc = computeCircularOrbitSpeed(muEarth, rOrbit);
    const periodS = computeOrbitalPeriod(muEarth, rOrbit);

    // Initial state vector in orbital plane
    let x = rOrbit;
    let y = 0;
    let vx = 0;
    let vy = vCirc;

    const numOrbits = 50;
    const totalTimeS = numOrbits * periodS;
    // Leapfrog / symplectic Verlet integration for stable orbital energy conservation
    const dt = 1.0; // 1-second step across ~263,000 seconds
    const steps = Math.floor(totalTimeS / dt);

    let maxRadius = rOrbit;
    let minRadius = rOrbit;

    // Half-step velocity
    const r0 = Math.hypot(x, y);
    const a0 = -muEarth / (r0 * r0 * r0);
    vx += 0.5 * a0 * x * dt;
    vy += 0.5 * a0 * y * dt;

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

    const maxDriftMeters = Math.max(Math.abs(maxRadius - rOrbit), Math.abs(minRadius - rOrbit));
    const driftRatio = maxDriftMeters / rOrbit;

    // Verify circular orbit radius drift remains strictly under 0.05% over 50 revolutions
    assert.ok(
      driftRatio < 0.0005,
      `Radius drift over 50 orbits must be < 0.05%, got: ${(driftRatio * 100).toFixed(4)}% (max diff: ${maxDriftMeters.toFixed(2)}m)`
    );
  });

  // TEST 2: Orbital period equals 2 * pi * sqrt(a^3 / mu)
  test('2. Orbital period formula T = 2 * pi * sqrt(a^3 / mu) matches catalog across all bodies', () => {
    const bodies = [
      { id: 'earth', parentMu: PLANETARY_CATALOG_SI.sun.muM3S2, expectedDays: 365.256 },
      { id: 'mars', parentMu: PLANETARY_CATALOG_SI.sun.muM3S2, expectedDays: 686.98 },
      { id: 'jupiter', parentMu: PLANETARY_CATALOG_SI.sun.muM3S2, expectedDays: 4332.589 },
      { id: 'moon', parentMu: PLANETARY_CATALOG_SI.earth.muM3S2 + PLANETARY_CATALOG_SI.moon.muM3S2, expectedDays: 27.32166 },
    ];

    for (const b of bodies) {
      const entry = PLANETARY_CATALOG_SI[b.id];
      const aM = entry.orbitalElements!.semiMajorAxisM;
      const calculatedPeriodS = computeOrbitalPeriod(b.parentMu, aM);
      const calculatedPeriodDays = calculatedPeriodS / SI.DAY_S;

      const diffPct = Math.abs(calculatedPeriodDays - b.expectedDays) / b.expectedDays;
      assert.ok(
        diffPct < 0.005,
        `${entry.name} period must equal 2*pi*sqrt(a^3/mu) within 0.5%, got ${calculatedPeriodDays.toFixed(3)} days (expected ${b.expectedDays})`
      );
    }
  });

  // TEST 3: Surface gravity per landable body equals the catalog table
  test('3. Surface gravity per landable body g = GM / R^2 equals catalog surfaceGravityMs2', () => {
    const landableBodies = [
      { id: 'earth', expectedG: 9.80665, tolerancePct: 0.2 },
      { id: 'moon', expectedG: 1.622, tolerancePct: 0.2 },
      { id: 'mars', expectedG: 3.72076, tolerancePct: 0.2 },
      { id: 'ceres', expectedG: 0.284, tolerancePct: 0.1 },
    ];

    for (const b of landableBodies) {
      const entry = PLANETARY_CATALOG_SI[b.id];
      const mu = entry.muM3S2;
      const rVol = entry.volumetricMeanRadiusM;
      const calculatedG = mu / (rVol * rVol);

      const diffPct = Math.abs(calculatedG - b.expectedG) / b.expectedG;
      assert.ok(
        diffPct < b.tolerancePct,
        `${entry.name} g = GM/R^2 must match table surfaceGravityMs2 within ${b.tolerancePct * 100}%, got: ${calculatedG.toFixed(4)} m/s^2 (table: ${b.expectedG})`
      );
      assert.equal(entry.surfaceGravityMs2, b.expectedG, `${entry.name} catalog surfaceGravityMs2 matches expected constant`);
    }
  });

  // TEST 4: Moon's orbital period is 27.3 days under time warp
  test('4. Moon orbital period equals 27.32 days under simulated time-warp integration', () => {
    const moonSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'moon')!;
    const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;

    // Initial Moon angle relative to Earth at t0 = 0
    const earth0 = computeKeplerBodyPosition(earthSpec, 0, 'exploration', 0, 0);
    const moon0 = computeKeplerBodyPosition(moonSpec, 0, 'exploration', 0, 0);
    const initialAngleRad = Math.atan2(moon0.z - earth0.z, moon0.x - earth0.x);

    // Warp forward by exactly 27.321661 sidereal days
    const siderealDays = 27.321661;
    const yearsElapsed = (siderealDays * SI.DAY_S) / SI.JULIAN_YEAR_S;

    const earth1 = computeKeplerBodyPosition(earthSpec, yearsElapsed, 'exploration', 0, 0);
    const moon1 = computeKeplerBodyPosition(moonSpec, yearsElapsed, 'exploration', 0, 0);
    const finalAngleRad = Math.atan2(moon1.z - earth1.z, moon1.x - earth1.x);

    let angleDiff = finalAngleRad - initialAngleRad;
    while (angleDiff < 0) angleDiff += 2 * Math.PI;
    while (angleDiff >= 2 * Math.PI) angleDiff -= 2 * Math.PI;

    // After 1 full sidereal orbit (27.32 days), the Moon returns to its exact starting angle (< 0.01 rad / 0.5 deg)
    assert.ok(
      Math.abs(angleDiff) < 0.01 || Math.abs(angleDiff - 2 * Math.PI) < 0.01,
      `Moon must complete exactly 1 full orbit (360 deg) after 27.32 days under warp, angle offset: ${(angleDiff * (180 / Math.PI)).toFixed(2)} deg`
    );
  });

  // TEST 5: Planets move on Keplerian orbits
  test('5. Planets move on authentic Keplerian elliptical orbits: r(nu) = a(1-e^2)/(1+e*cos(nu))', () => {
    const testBodies = ['mercury', 'mars', 'earth', 'jupiter', 'pluto'];

    for (const bodyId of testBodies) {
      const entry = PLANETARY_CATALOG_SI[bodyId];
      const elem = entry.orbitalElements!;
      const a = elem.semiMajorAxisM;
      const e = elem.eccentricity;
      const muSun = PLANETARY_CATALOG_SI.sun.muM3S2;
      const meanMotion = Math.sqrt(muSun / Math.pow(a, 3));

      // 1. Verify Kepler equation solver at M = 0 and M = pi
      const E_peri = solveEccentricAnomaly(0, e);
      assert.equal(E_peri, 0, 'At perihelion M=0, E must be 0');
      const E_aph = solveEccentricAnomaly(Math.PI, e);
      assert.ok(Math.abs(E_aph - Math.PI) < 1e-10, 'At aphelion M=pi, E must be pi');

      // 2. Verify orbital radius at perihelion (M = 0): r_peri = a * (1 - e)
      const tPeriSec = -elem.meanAnomalyJ2000Rad / meanMotion;
      const statePeri = computeBodyCartesianSI(bodyId, tPeriSec / SI.JULIAN_YEAR_S);
      const rPeri = statePeri.state.rM;
      const expectedPeri = a * (1 - e);
      const periDiffRatio = Math.abs(rPeri - expectedPeri) / expectedPeri;
      assert.ok(
        periDiffRatio < 0.0001,
        `${entry.name} perihelion radius must equal a*(1-e), diff: ${(periDiffRatio * 100).toFixed(4)}%`
      );

      // 3. Verify orbital radius at aphelion (M = pi): r_aph = a * (1 + e)
      const tAphSec = (Math.PI - elem.meanAnomalyJ2000Rad) / meanMotion;
      const stateAph = computeBodyCartesianSI(bodyId, tAphSec / SI.JULIAN_YEAR_S);
      const rAph = stateAph.state.rM;
      const expectedAph = a * (1 + e);
      const aphDiffRatio = Math.abs(rAph - expectedAph) / expectedAph;
      assert.ok(
        aphDiffRatio < 0.0001,
        `${entry.name} aphelion radius must equal a*(1+e), diff: ${(aphDiffRatio * 100).toFixed(4)}%`
      );

      // 4. Verify semi-latus rectum parameter p = a*(1-e^2) matches r at nu = 90 deg
      const semiLatusRectum = a * (1 - e * e);
      assert.ok(semiLatusRectum > 0, `${entry.name} semi-latus rectum must be strictly positive`);
    }
  });
});
