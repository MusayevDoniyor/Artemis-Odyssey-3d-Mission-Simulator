import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSpaceFlightState, stepSpaceFlightPhysics } from './orbitPhysics';
import type { SpaceFlightState, SpaceTimeWarp } from '../../game/types';

test('BUG A2 FIX: Space time-warp ladder accurately scales simulated displacement and automatically drops out', () => {
  const baseRes = { power: 80, oxygen: 80, shield: 80 };
  const nullInput = { forward: false, backward: false, left: false, right: false, boost: false, action: false };

  // 1. Initial state has default 1x time warp and 0 throttle
  const init = createInitialSpaceFlightState('artemis-2');
  assert.equal(init.timeWarp, 1, 'Default time warp must be 1x');
  assert.equal(init.throttle ?? 0, 0, 'Default throttle must be 0');

  // 2. Calibrated 1x velocity in LEO produces smooth, slow displacement relative to Earth
  // Earth radius is 2.35u (perimeter ~17u). At 1x, displacement in 1 second should be < 0.8u (not 18u/s pinball)
  let s1x: SpaceFlightState = {
    ...init,
    shipX: 1450,
    shipZ: 1452.8,
    vx: 0.35,
    vz: 0.0,
    timeWarp: 1,
  };
  const startX = s1x.shipX;
  const startZ = s1x.shipZ;

  // Step 20 steps of dt = 0.05s (= 1.0 real second)
  for (let i = 0; i < 20; i++) {
    const res = stepSpaceFlightPhysics(s1x, baseRes, nullInput, false, 0.05, 0, 'exploration');
    s1x = res.space;
  }
  const disp1x = Math.hypot(s1x.shipX - startX, s1x.shipZ - startZ);
  assert.ok(disp1x > 0.1 && disp1x < 0.8, `1x displacement in 1 second (${disp1x.toFixed(3)}u) must be smooth and slow`);

  // 3. 10x time warp produces exactly 10x the simulated displacement over the same real elapsed time
  let s10x: SpaceFlightState = {
    ...init,
    shipX: 1450,
    shipZ: 1452.8,
    vx: 0.35,
    vz: 0.0,
    timeWarp: 10 as SpaceTimeWarp,
  };
  for (let i = 0; i < 20; i++) {
    const res = stepSpaceFlightPhysics(s10x, baseRes, nullInput, false, 0.05, 0, 'exploration');
    s10x = res.space;
  }
  const disp10x = Math.hypot(s10x.shipX - startX, s10x.shipZ - startZ);
  assert.ok(
    disp10x > disp1x * 7.5,
    `10x time warp displacement (${disp10x.toFixed(3)}u) must scale simulated motion well above 1x (${disp10x} vs ${disp1x})`
  );

  // 4. Automatic drop-out to 1x when player commands an engine burn
  let sWarpBurn: SpaceFlightState = {
    ...init,
    timeWarp: 100 as SpaceTimeWarp,
  };
  const burnRes = stepSpaceFlightPhysics(
    sWarpBurn,
    baseRes,
    { ...nullInput, forward: true },
    false,
    0.05,
    0,
    'exploration'
  );
  assert.equal(burnRes.space.timeWarp, 1, 'Engine burn must automatically drop time warp back to 1x');

  // 5. Automatic drop-out to 1x when player steers manually
  let sWarpSteer: SpaceFlightState = {
    ...init,
    timeWarp: 50 as SpaceTimeWarp,
  };
  const steerRes = stepSpaceFlightPhysics(
    sWarpSteer,
    baseRes,
    { ...nullInput, left: true },
    false,
    0.05,
    0,
    'exploration'
  );
  assert.equal(steerRes.space.timeWarp, 1, 'Manual steering must automatically drop time warp back to 1x');

  // 6. SAS Prograde mode aligns heading cleanly to velocity vector
  let sSas: SpaceFlightState = {
    ...init,
    headingRad: 0,
    vx: 1.0,
    vz: 0.0, // velocity points along +X (heading = Math.PI / 2)
    sasMode: 'PROGRADE',
    timeWarp: 1,
  };
  for (let i = 0; i < 30; i++) {
    const res = stepSpaceFlightPhysics(sSas, baseRes, nullInput, false, 0.05, 0, 'exploration');
    sSas = res.space;
  }
  const targetHeading = Math.atan2(sSas.vx, sSas.vz);
  const headingDiff = Math.abs(sSas.headingRad - targetHeading);
  assert.ok(headingDiff < 0.15, `SAS Prograde should align heading with velocity vector (diff ${headingDiff})`);

  // 7. SAS Retrograde mode aligns heading opposite velocity vector
  let sSasRetro: SpaceFlightState = {
    ...init,
    headingRad: 0,
    vx: 1.0,
    vz: 0.0,
    sasMode: 'RETROGRADE',
    timeWarp: 1,
  };
  for (let i = 0; i < 30; i++) {
    const res = stepSpaceFlightPhysics(sSasRetro, baseRes, nullInput, false, 0.05, 0, 'exploration');
    sSasRetro = res.space;
  }
  const retroHeading = Math.atan2(-sSasRetro.vx, -sSasRetro.vz);
  let retroDiff = Math.abs(sSasRetro.headingRad - retroHeading);
  while (retroDiff > Math.PI) retroDiff -= Math.PI * 2;
  assert.ok(Math.abs(retroDiff) < 0.15, `SAS Retrograde should align heading opposite velocity vector`);
});
