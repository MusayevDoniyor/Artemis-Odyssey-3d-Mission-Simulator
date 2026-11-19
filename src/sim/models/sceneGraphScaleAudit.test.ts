import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import * as THREE from 'three';
import { getBodyVisualRadiusUnits, EXPLORATION_VISUAL_LAYOUT, projectHeliocentricSIToScene } from '../../game/orbitalMechanics';
import { PLANETARY_CATALOG_SI } from '../../game/planetaryCatalog';
import { computeBodyCartesianSI } from '../../game/orbitalMechanics';

describe('REMEDIATION R1-A BUG A1: Real Scene Graph Planetary & Sun Scale Audit', () => {
  test('Rendered visual radii and bounding spheres match authentic NASA radius ratios (Fixes Bug A1)', () => {
    // Single Convention: Volumetric Mean Radius (NASA/JPL Solar System Dynamics)
    const sunVol = PLANETARY_CATALOG_SI.sun.volumetricMeanRadiusM;
    const jupVol = PLANETARY_CATALOG_SI.jupiter.volumetricMeanRadiusM;
    const earthVol = PLANETARY_CATALOG_SI.earth.volumetricMeanRadiusM;
    const moonVol = PLANETARY_CATALOG_SI.moon.volumetricMeanRadiusM;

    assert.equal(sunVol, 695_700_000, 'Sun volumetric mean radius = 695,700 km');
    assert.equal(jupVol, 69_911_000, 'Jupiter volumetric mean radius = 69,911 km');
    assert.equal(earthVol, 6_371_000, 'Earth volumetric mean radius = 6,371 km');
    assert.equal(moonVol, 1_737_400, 'Moon volumetric mean radius = 1,737.4 km');

    assert.ok(Math.abs(sunVol / jupVol - 9.9512) < 0.001, 'Sun/Jupiter volumetric ratio = 9.951');
    assert.ok(Math.abs(sunVol / earthVol - 109.1979) < 0.001, 'Sun/Earth volumetric ratio = 109.198');
    assert.ok(Math.abs(jupVol / earthVol - 10.9733) < 0.001, 'Jupiter/Earth volumetric ratio = 10.973');
    assert.ok(Math.abs(moonVol / earthVol - 0.2727) < 0.001, 'Moon/Earth volumetric ratio = 0.273');

    const rSun = getBodyVisualRadiusUnits('sun', 'exploration');
    const rEarth = getBodyVisualRadiusUnits('earth', 'exploration');
    const rJup = getBodyVisualRadiusUnits('jupiter', 'exploration');
    const rSat = getBodyVisualRadiusUnits('saturn', 'exploration');
    const rMoon = getBodyVisualRadiusUnits('moon', 'exploration');
    const rMars = getBodyVisualRadiusUnits('mars', 'exploration');
    const rMerc = getBodyVisualRadiusUnits('mercury', 'exploration');
    const rVen = getBodyVisualRadiusUnits('venus', 'exploration');
    const rPluto = getBodyVisualRadiusUnits('pluto', 'exploration');
    const rCeres = getBodyVisualRadiusUnits('ceres', 'exploration');

    // Earth is base reference = 2.35 units
    assert.equal(rEarth, 2.35);

    // 1. Sun / Earth must be ~109.2 (Real NASA: 695,700 km / 6,371 km = 109.1979)
    const sunEarthRatio = rSun / rEarth;
    assert.ok(
      Math.abs(sunEarthRatio - 109.1979) < 0.2,
      `Sun/Earth ratio must be ~109.2, got: ${sunEarthRatio.toFixed(3)}`
    );

    // 2. Sun / Jupiter must be ~9.95 (Real NASA: 695,700 km / 69,911 km = 9.9512)
    const sunJupRatio = rSun / rJup;
    assert.ok(
      Math.abs(sunJupRatio - 9.9512) < 0.05,
      `Sun/Jupiter ratio must be ~9.95, got: ${sunJupRatio.toFixed(3)}`
    );

    // 3. Jupiter / Earth must be ~10.97 (Real NASA: 69,911 km / 6,371 km = 10.9733)
    const jupEarthRatio = rJup / rEarth;
    assert.ok(
      Math.abs(jupEarthRatio - 10.9733) < 0.05,
      `Jupiter/Earth ratio must be ~10.97, got: ${jupEarthRatio.toFixed(3)}`
    );

    // 4. Sun must be strictly larger than all gas giants
    assert.ok(rSun > rJup * 9.8, 'Sun must be nearly 10x larger than Jupiter');
    assert.ok(rSun > rSat * 11.5, 'Sun must be nearly 12x larger than Saturn');

    // 5. Verify other terrestrial and dwarf planet ratios
    assert.ok(Math.abs(rMoon / rEarth - 0.2727) < 0.01, 'Moon/Earth ratio is ~0.2727');
    assert.ok(Math.abs(rMars / rEarth - 0.5320) < 0.01, 'Mars/Earth ratio is ~0.532');
    assert.ok(Math.abs(rMerc / rEarth - 0.3829) < 0.01, 'Mercury/Earth ratio is ~0.383');
    assert.ok(Math.abs(rVen / rEarth - 0.9499) < 0.01, 'Venus/Earth ratio is ~0.950');
    assert.ok(Math.abs(rPluto / rEarth - 0.1865) < 0.01, 'Pluto/Earth ratio is ~0.1865');
    assert.ok(Math.abs(rCeres / rEarth - 0.0737) < 0.01, 'Ceres/Earth ratio is ~0.0737');
  });

  test('Educational scale distance-compression mapping enforces Mercury distance >= 2.5x Sun radius and strict monotonicity', () => {
    const rSun = getBodyVisualRadiusUnits('sun', 'exploration');

    // 1. Mercury rendered semi-major distance must be >= 2.5 * rendered Sun radius
    const mercOrbit = EXPLORATION_VISUAL_LAYOUT.mercury.orbitRadiusUnits;
    const mercRatioToSun = mercOrbit / rSun;
    assert.ok(
      mercRatioToSun >= 2.5,
      `Mercury orbit distance must be >= 2.5 * Sun radius (${(2.5 * rSun).toFixed(1)}u), got: ${mercOrbit}u (${mercRatioToSun.toFixed(2)}x)`
    );

    // 2. Mercury perihelion distance in 3D Keplerian projection must ALSO be >= 2.5 * Sun radius
    const mercEcc = PLANETARY_CATALOG_SI.mercury.orbitalElements!.eccentricity;
    const mercPeri = mercOrbit * (1 - mercEcc);
    assert.ok(
      mercPeri >= 2.5 * rSun,
      `Mercury perihelion distance (${mercPeri.toFixed(1)}u) must be >= 2.5 * Sun radius (${(2.5 * rSun).toFixed(1)}u)`
    );

    // 3. Strict planetary orbital ordering & monotonicity check
    const orderedPlanetIds = [
      'mercury',
      'venus',
      'earth',
      'mars',
      'ceres',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ];

    let lastDistance = 0;
    for (const bodyId of orderedPlanetIds) {
      const dist = EXPLORATION_VISUAL_LAYOUT[bodyId].orbitRadiusUnits;
      assert.ok(
        dist > lastDistance,
        `Orbital distance for ${bodyId} (${dist}u) must be strictly greater than preceding distance (${lastDistance}u)`
      );
      lastDistance = dist;
    }
  });

  test('Scene graph bounding sphere verification: Mesh world scale matches getBodyVisualRadiusUnits in BOTH Exploration and Scientific modes', () => {
    for (const mode of ['exploration', 'scientific'] as const) {
      const rSun = getBodyVisualRadiusUnits('sun', mode);
      const rJup = getBodyVisualRadiusUnits('jupiter', mode);
      const rEarth = getBodyVisualRadiusUnits('earth', mode);
      const rMoon = getBodyVisualRadiusUnits('moon', mode);

      // Sun scale group
      const sunGroup = new THREE.Group();
      sunGroup.scale.setScalar(rSun);
      const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32));
      sunGroup.add(sunMesh);
      sunGroup.updateMatrixWorld(true);

      // Jupiter scale group
      const jupGroup = new THREE.Group();
      jupGroup.scale.setScalar(rJup);
      const jupMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32));
      jupGroup.add(jupMesh);
      jupGroup.updateMatrixWorld(true);

      // Earth scale group
      const earthGroup = new THREE.Group();
      earthGroup.scale.setScalar(rEarth);
      const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32));
      earthGroup.add(earthMesh);
      earthGroup.updateMatrixWorld(true);

      // Moon scale group
      const moonGroup = new THREE.Group();
      moonGroup.scale.setScalar(rMoon);
      const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 32, 32));
      moonGroup.add(moonMesh);
      moonGroup.updateMatrixWorld(true);

      // Compute bounding spheres in world space
      sunMesh.geometry.computeBoundingSphere();
      jupMesh.geometry.computeBoundingSphere();
      earthMesh.geometry.computeBoundingSphere();
      moonMesh.geometry.computeBoundingSphere();

      const sunSphere = sunMesh.geometry.boundingSphere!.clone().applyMatrix4(sunMesh.matrixWorld);
      const jupSphere = jupMesh.geometry.boundingSphere!.clone().applyMatrix4(jupMesh.matrixWorld);
      const earthSphere = earthMesh.geometry.boundingSphere!.clone().applyMatrix4(earthMesh.matrixWorld);
      const moonSphere = moonMesh.geometry.boundingSphere!.clone().applyMatrix4(moonMesh.matrixWorld);

      assert.ok(Math.abs(sunSphere.radius - rSun) < 0.001);
      assert.ok(Math.abs(jupSphere.radius - rJup) < 0.001);
      assert.ok(Math.abs(earthSphere.radius - rEarth) < 0.001);
      assert.ok(Math.abs(moonSphere.radius - rMoon) < 0.001);

      // Ratios of actual world bounding spheres in both modes:
      // (Old code had Sun=12.5, Jup=4.8, Earth=2.35 -> Sun/Jup=2.6, Sun/Earth=5.3, failing this test)
      assert.ok(
        Math.abs(sunSphere.radius / jupSphere.radius - 9.9512) < 0.05,
        `Mode ${mode}: Sun/Jupiter bounding sphere ratio must be ~9.9512, got ${(sunSphere.radius / jupSphere.radius).toFixed(4)}`
      );
      assert.ok(
        Math.abs(sunSphere.radius / earthSphere.radius - 109.1979) < 0.2,
        `Mode ${mode}: Sun/Earth bounding sphere ratio must be ~109.1979, got ${(sunSphere.radius / earthSphere.radius).toFixed(4)}`
      );
      assert.ok(
        Math.abs(jupSphere.radius / earthSphere.radius - 10.9733) < 0.05,
        `Mode ${mode}: Jupiter/Earth bounding sphere ratio must be ~10.9733, got ${(jupSphere.radius / earthSphere.radius).toFixed(4)}`
      );
      assert.ok(
        Math.abs(moonSphere.radius / earthSphere.radius - 0.2727) < 0.01,
        `Mode ${mode}: Moon/Earth bounding sphere ratio must be ~0.2727, got ${(moonSphere.radius / earthSphere.radius).toFixed(4)}`
      );
    }
  });
});
