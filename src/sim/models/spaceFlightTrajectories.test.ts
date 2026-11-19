import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateEarthParkingOrbitCoordinates,
  generateTliConicCoordinates,
  generateCislunarFreeReturnCoordinates,
  generateMoonSoiConicCoordinates,
  createInitialSpaceFlightState,
  stepSpaceFlightPhysics,
} from '../orbit/orbitPhysics';
import { PLANETARY_CATALOG_SI, SI } from '../../game/planetaryCatalog';
import {
  SOLAR_SYSTEM_BODIES,
  computeKeplerBodyPosition,
  SOLAR_SUN_ORIGIN_X,
  SOLAR_SUN_ORIGIN_Z,
} from '../../game/solarSystemData';
import { getBodyVisualRadiusUnits } from '../../game/orbitalMechanics';
import type { InputState, ResourceState } from '../../game/types';

const IDLE_INPUT: Pick<InputState, 'forward' | 'left' | 'right' | 'boost' | 'action' | 'backward'> = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  boost: false,
  action: false,
};

const BASE_RESOURCES: ResourceState = {
  power: 100,
  oxygen: 100,
  shield: 100,
};

test('PHASE 9: Low Earth Parking Orbit (28.5 deg LC-39B) geometry and inclination verification', () => {
  const earthPos = { x: 10, y: 0, z: -20 };
  const radius = 5.0;
  const pts = generateEarthParkingOrbitCoordinates(earthPos, radius, 64);

  assert.equal(pts.length, 65, 'Should produce 65 points for 64 closed segments');

  // Verify first and last points coincide (closed loop)
  assert.ok(Math.hypot(pts[0].x - pts[64].x, pts[0].y - pts[64].y, pts[0].z - pts[64].z) < 1e-6);

  // Maximum vertical elevation must match radius * sin(28.5 deg)
  const expectedMaxY = radius * Math.sin(28.5 * (Math.PI / 180));
  const maxY = Math.max(...pts.map((p) => p.y));
  const minY = Math.min(...pts.map((p) => p.y));

  assert.ok(
    Math.abs(maxY - expectedMaxY) < 0.05,
    `Max vertical elevation should be ~${expectedMaxY.toFixed(3)}, got ${maxY.toFixed(3)}`
  );
  assert.ok(
    Math.abs(minY - -expectedMaxY) < 0.05,
    `Min vertical elevation should be -${expectedMaxY.toFixed(3)}, got ${minY.toFixed(3)}`
  );

  // Radial distance in orbital plane must be exactly radius for all points
  pts.forEach((p) => {
    const dx = p.x - earthPos.x;
    const dy = p.y - earthPos.y;
    const dz = p.z - earthPos.z;
    const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    assert.ok(
      Math.abs(dist3d - radius) < 1e-4,
      `Orbital point distance from Earth must equal radius (${radius}), got ${dist3d}`
    );
  });
});

test('PHASE 9: TLI outbound conic transfer arc reaches Moon with smooth lateral bow', () => {
  const earthPos = { x: 0, y: 0, z: 0 };
  const moonPos = { x: 50, y: 0, z: 0 }; // 50 units down X axis
  const pts = generateTliConicCoordinates(earthPos, moonPos, 64);

  assert.equal(pts.length, 65);
  // Start near Earth, end at Moon
  assert.ok(Math.hypot(pts[0].x - earthPos.x, pts[0].z - earthPos.z) < 1e-5);
  assert.ok(Math.hypot(pts[64].x - moonPos.x, pts[64].z - moonPos.z) < 1e-5);

  // Midpoint should exhibit outward bow
  const midPt = pts[32];
  assert.ok(
    Math.abs(midPt.x - 25) < 1.0,
    `Midpoint X should be halfway (~25), got ${midPt.x}`
  );
  assert.ok(
    Math.abs(midPt.z) > 1.0,
    `Midpoint should bow out laterally, got Z = ${midPt.z}`
  );
  assert.ok(midPt.y > 0.1, `Midpoint should have positive vertical lift, got Y = ${midPt.y}`);
});

test('PHASE 9: Cislunar Free-Return trajectory figure-8 geometry & perilune swing-by', () => {
  const earthPos = { x: 0, y: 0, z: 0 };
  const moonPos = { x: 0, y: 0, z: 100 }; // 100 units down Z axis
  const moonRadius = 2.0;
  const pts = generateCislunarFreeReturnCoordinates(earthPos, moonPos, moonRadius, 80);

  assert.equal(pts.length, 81);

  // Depart Earth
  assert.ok(Math.hypot(pts[0].x, pts[0].z) < 0.1, 'Must depart from Earth vicinity');

  // Perilune swing-by at midpoint index 40 (t = 0.5) must pass behind the Moon's far side
  const perilunePt = pts[40];
  // Moon is at Z = 100; far side is Z > 100
  assert.ok(
    perilunePt.z > 100.0,
    `Perilune point must be on the Moon's far side (Z > 100), got Z = ${perilunePt.z}`
  );
  const periluneAlt = perilunePt.z - 100.0;
  assert.ok(
    periluneAlt >= moonRadius && periluneAlt <= moonRadius * 2.0,
    `Perilune altitude should be within 1.0 - 2.0x Moon radius, got ${periluneAlt}`
  );

  // Inbound leg returns back toward Earth (last point)
  const lastPt = pts[80];
  assert.ok(
    Math.hypot(lastPt.x, lastPt.z) < 5.0,
    `Return trajectory must return to Earth re-entry corridor, got dist ${Math.hypot(lastPt.x, lastPt.z)}`
  );

  // Verify outbound leg and inbound leg are on opposite sides of Earth-Moon axis (figure-8 asymmetry)
  const outboundMid = pts[20]; // t = 0.25
  const returnMid = pts[60];   // t = 0.75
  assert.ok(
    outboundMid.x * returnMid.x < 0,
    `Outbound X (${outboundMid.x}) and Return X (${returnMid.x}) must have opposite signs across Earth-Moon axis`
  );
});

test('PHASE 9: Lunar SOI hyperbolic flyby conic accurately resolves periapsis', () => {
  const moonPos = { x: 10, y: 0, z: 20 };
  const periapsisR = 1.5;
  const headingRad = 0; // along Z axis
  const pts = generateMoonSoiConicCoordinates(moonPos, headingRad, periapsisR, 48);

  assert.equal(pts.length, 49);

  // Midpoint index 24 is true anomaly f = 0 (periapsis closest approach)
  const periPt = pts[24];
  const periDist = Math.hypot(periPt.x - moonPos.x, periPt.z - moonPos.z);
  assert.ok(
    Math.abs(periDist - periapsisR) < 1e-4,
    `Closest approach distance must equal periapsisRadius (${periapsisR}), got ${periDist}`
  );

  // Edge points at f = +/- maxTrueAnomaly must be farther away (hyperbolic divergence)
  const entryDist = Math.hypot(pts[0].x - moonPos.x, pts[0].z - moonPos.z);
  const exitDist = Math.hypot(pts[48].x - moonPos.x, pts[48].z - moonPos.z);
  assert.ok(entryDist > periDist * 1.5, `Entry distance must be > 1.5x periapsis, got ${entryDist}`);
  assert.ok(exitDist > periDist * 1.5, `Exit distance must be > 1.5x periapsis, got ${exitDist}`);
});

test('PHASE 9: Telemetry physics: Altitude, Comms Latency, Radiation & Reference Frame switching', () => {
  const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
  const moonSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'moon')!;
  const earthPos = computeKeplerBodyPosition(
    earthSpec,
    0,
    'exploration',
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    'earth'
  );
  const moonPos = computeKeplerBodyPosition(
    moonSpec,
    0,
    'exploration',
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
    'earth'
  );
  const earthVisR = getBodyVisualRadiusUnits('earth', 'exploration');
  const moonVisR = getBodyVisualRadiusUnits('moon', 'exploration');

  const state = createInitialSpaceFlightState('artemis-2');

  // Initial state should have authentic LEO values
  assert.equal(state.altitudeKm, 165);
  assert.equal(state.commsDelaySec, 0.0);
  assert.equal(state.radiationDoseRateUsvH, 18.0);
  assert.equal(state.activeTrajectoryFrame, 'earth_inertial');

  // Step in Low Earth Orbit (near Earth at radius ~1.03 * earthVisR)
  const leoState = {
    ...state,
    shipX: earthPos.x,
    shipZ: earthPos.z + earthVisR * 1.03,
  };
  const { space: s1 } = stepSpaceFlightPhysics(
    leoState,
    BASE_RESOURCES,
    IDLE_INPUT,
    false,
    0.05,
    0,
    'exploration'
  );

  assert.ok(
    s1.altitudeKm != null && s1.altitudeKm >= 150 && s1.altitudeKm <= 350,
    `LEO altitude should be ~165-350 km, got ${s1.altitudeKm}`
  );
  assert.ok(s1.commsDelaySec != null && s1.commsDelaySec < 0.05); // negligible LEO light travel time
  assert.equal(s1.radiationDoseRateUsvH, 18.0, 'LEO radiation must reflect Earth geomagnetic shielding');
  assert.equal(s1.activeTrajectoryFrame, 'earth_inertial');

  // Simulate Cislunar transit (halfway between Earth and Moon)
  const transitState = {
    ...state,
    shipX: (earthPos.x + moonPos.x) * 0.5,
    shipZ: (earthPos.z + moonPos.z) * 0.5,
  };
  const { space: s2 } = stepSpaceFlightPhysics(
    transitState,
    BASE_RESOURCES,
    IDLE_INPUT,
    false,
    0.05,
    0,
    'exploration'
  );

  assert.equal(s2.activeTrajectoryFrame, 'earth_moon_rotating');
  assert.ok(
    s2.commsDelaySec != null && s2.commsDelaySec >= 0.15 && s2.commsDelaySec <= 1.4,
    `Cislunar comms delay should be ~0.15 - 1.4s, got ${s2.commsDelaySec}`
  );
  assert.equal(s2.radiationDoseRateUsvH, 62.0, 'Deep space GCR background should be ~62 uSv/h');

  // Simulate Lunar SOI proximity (near Moon at radius ~1.05 * moonVisR)
  const lunarState = {
    ...state,
    shipX: moonPos.x,
    shipZ: moonPos.z + moonVisR * 1.05,
  };
  const { space: s3 } = stepSpaceFlightPhysics(
    lunarState,
    BASE_RESOURCES,
    IDLE_INPUT,
    false,
    0.05,
    0,
    'exploration'
  );
  assert.equal(s3.activeTrajectoryFrame, 'moon_centred');
  assert.ok(
    s3.commsDelaySec != null && s3.commsDelaySec >= 1.15 && s3.commsDelaySec <= 1.5,
    `Moon comms delay should be ~1.28s (1.15-1.5s), got ${s3.commsDelaySec}`
  );

  // Simulate solar storm / DONKI flare
  const { space: sStorm } = stepSpaceFlightPhysics(
    transitState,
    BASE_RESOURCES,
    IDLE_INPUT,
    true, // donkiFlareActive
    0.05,
    0,
    'exploration'
  );
  assert.ok(
    sStorm.radiationDoseRateUsvH != null && sStorm.radiationDoseRateUsvH > 500,
    `Solar storm should elevate radiation above 500 uSv/h, got ${sStorm.radiationDoseRateUsvH}`
  );

  // Storm shield attenuation (water-wall shelter)
  const shieldedState = {
    ...transitState,
    shieldBoostActive: true,
  };
  const { space: sShielded } = stepSpaceFlightPhysics(
    shieldedState,
    BASE_RESOURCES,
    IDLE_INPUT,
    true,
    0.05,
    0,
    'exploration'
  );
  assert.ok(
    sShielded.radiationDoseRateUsvH != null &&
      sShielded.radiationDoseRateUsvH < sStorm.radiationDoseRateUsvH * 0.35,
    `Water-wall storm shelter must attenuate dose by ~70%, got ${sShielded.radiationDoseRateUsvH} vs unshielded ${sStorm.radiationDoseRateUsvH}`
  );
});
