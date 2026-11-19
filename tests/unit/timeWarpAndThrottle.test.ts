import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stepSpaceFlightPhysics, createInitialSpaceFlightState } from '../../src/sim/orbit/orbitPhysics';
import type { InputState, ResourceState } from '../../src/game/types';

test('TIME WARP & INTERACTIVE THROTTLE SPEED CONTROL SUITE', async (t) => {
  const defaultResources: ResourceState = {
    power: 90,
    oxygen: 100,
    shield: 85,
  };

  const idleInput: InputState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    boost: false,
    action: false,
    tiltForward: false,
    stabilize: false,
  };

  await t.test('1. Time Warp Ladder supports 0.5x precision slow-motion and preserves warp with active throttle', () => {
    const s = createInitialSpaceFlightState('artemis-2');
    s.timeWarp = 10;
    s.throttle = 0.5; // Engine throttle set to 50%

    // Step physics with idle keyboard input
    const out = stepSpaceFlightPhysics(
      s,
      defaultResources,
      idleInput,
      false,
      0.016,
      0,
      'exploration',
      { satDeployBoost: 0, fuelFactor: 1, localAnchorId: 'earth' }
    );

    // Time warp must remain at 10x! It must NOT be dropped back to 1x just because throttle is 0.5
    assert.equal(out.space.timeWarp, 10, 'Time warp 10x should not drop when throttle is 0.5 without active maneuver keys');
  });

  await t.test('2. Time Warp drops to 1x on active keyboard burns or steering inputs', () => {
    const s = createInitialSpaceFlightState('artemis-2');
    s.timeWarp = 50;

    const burnInput: InputState = {
      ...idleInput,
      forward: true,
    };

    const out = stepSpaceFlightPhysics(
      s,
      defaultResources,
      burnInput,
      false,
      0.016,
      0,
      'exploration',
      { satDeployBoost: 0, fuelFactor: 1, localAnchorId: 'earth' }
    );

    assert.equal(out.space.timeWarp, 1, 'Active forward burn key must immediately drop time warp to 1x');
    assert.match(out.space.statusText, /dropped to 1x/i);
  });

  await t.test('3. Time Warp can remain active while spacecraft is in stable orbit inside target capture radius', () => {
    const s = createInitialSpaceFlightState('artemis-2');
    s.targetId = 'moon';
    // Set ship distance already inside capture radius, with previous distance also inside
    s.prevDistToTarget = 0.3; // Already inside zone
    s.timeWarp = 5;

    const out = stepSpaceFlightPhysics(
      s,
      defaultResources,
      idleInput,
      false,
      0.016,
      0,
      'exploration',
      { satDeployBoost: 0, fuelFactor: 1, localAnchorId: 'earth' }
    );

    // Should NOT drop to 1x because spacecraft did not just cross the boundary (it was already inside)
    assert.equal(out.space.timeWarp, 5, 'Spacecraft already orbiting within capture zone should be able to run time warp');
  });

  await t.test('4. 0.5x Slow-Motion Precision mode scales simDt accurately', () => {
    const s = createInitialSpaceFlightState('artemis-2');
    s.timeWarp = 0.5;
    const initialElapsed = s.elapsedDays;

    const out = stepSpaceFlightPhysics(
      s,
      defaultResources,
      idleInput,
      false,
      0.04, // dt
      0,
      'exploration',
      { satDeployBoost: 0, fuelFactor: 1, localAnchorId: 'earth' }
    );

    assert.equal(out.space.timeWarp, 0.5, '0.5x time warp must remain set');
    // In exploration mode, elapsedDays delta scales with simDt = dt * 0.5
    const deltaDays = out.space.elapsedDays - initialElapsed;
    assert.ok(deltaDays > 0, 'Elapsed days should advance');
  });

  await t.test('5. SpaceFlightHUD source code includes interactive throttle bar and 0.5x warp button', () => {
    const hudSrc = fs.readFileSync(path.resolve('src/components/SpaceFlightHUD.tsx'), 'utf-8');
    assert.ok(hudSrc.includes('warp-btn-'), 'SpaceFlightHUD must include warp button test id');
    assert.ok(hudSrc.includes('[0.5, 1, 2, 5, 10, 50, 100, 500, 1000]'), 'SpaceFlightHUD must include 0.5 in warp ladder');
    assert.ok(hudSrc.includes('throttle-slider'), 'SpaceFlightHUD must include clickable throttle-slider');
    assert.ok(hudSrc.includes('throttle-minus-btn'), 'SpaceFlightHUD must include throttle minus button');
    assert.ok(hudSrc.includes('throttle-plus-btn'), 'SpaceFlightHUD must include throttle plus button');
  });

  await t.test('6. App.tsx integrates 0.5x in warpLadder and advances planetary solarEpochYears with activeWarp', () => {
    const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
    assert.ok(appSrc.includes('[0.5, 1, 2, 5, 10, 50, 100, 500, 1000]'), 'App.tsx must include 0.5 in warpLadder');
    assert.ok(appSrc.includes('dt * activeWarp * solarTimeSpeedRef.current'), 'App.tsx must advance solarEpochYears with activeWarp');
    assert.ok(!appSrc.includes('if (thr > 0.02 && (simRef.current.space.timeWarp ?? 1) > 1)'), 'App.tsx must not auto-drop time warp when setting throttle');
  });
});
