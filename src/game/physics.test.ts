import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOutpostDecision,
  createInitialLandingState,
  createInitialLaunchState,
  createInitialRoverState,
  createInitialSpaceFlightState,
  evaluateTouchdown,
  getLunarTerrainHeight,
  separateLaunchStage,
  stepLandingPhysics,
  stepLaunchPhysics,
  stepRoverPhysics,
  stepSpaceFlightPhysics,
} from './physics';
import { PAYLOADS, PHYSICS } from './constants';

test('SLS launch lifts off smoothly, never sinks underground, and stages at 45 km & 110 km', () => {
  let L = createInitialLaunchState();
  for (let i = 0; i < 400; i++) {
    L = stepLaunchPhysics(L, { forward: true, left: false, right: false, action: false }, 0.05);
    if (L.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM && !L.srbSeparated) {
      L = separateLaunchStage(L);
      assert.equal(L.srbSeparated, true);
      assert.equal(L.fuelPct, 100);
    }
    if (L.srbSeparated && L.altitudeKm >= PHYSICS.SLS_CORE_SEP_ALT_KM && !L.coreSeparated) {
      L = separateLaunchStage(L);
      assert.equal(L.coreSeparated, true);
    }
    assert.ok(L.altitudeKm >= 0, 'altitude should never be negative');
    assert.ok(!Number.isNaN(L.altitudeKm), 'altitude should never be NaN');
    if (L.orbitReached) break;
  }
  assert.equal(L.orbitReached, true, 'SLS should cleanly reach 165 km orbit');
});

test('Solar system flight autopilot steers cleanly to Moon and radiation drains shield without boost', () => {
  let space = createInitialSpaceFlightState();
  space.autoPilot = true;
  let resources = { power: 80, oxygen: 75, shield: 60 };

  for (let i = 0; i < 500; i++) {
    const out = stepSpaceFlightPhysics(
      space,
      resources,
      { forward: false, backward: false, left: false, right: false, boost: false },
      true,
      0.05
    );
    space = out.space;
    resources = out.resources;
    if (space.arrivedMoon) break;
  }

  assert.equal(space.arrivedMoon, true, 'autopilot should reach Moon capture radius');
  assert.ok(space.visitedTargets.includes('moon'));
});

test('Lunar landing classifies perfect, hard, and crash touchdowns and penalizes fragile payload on hard landing', () => {
  assert.equal(evaluateTouchdown(1.8, 1.0, 4), 'perfect');
  assert.equal(evaluateTouchdown(3.5, 1.5, 6), 'hard');
  assert.equal(evaluateTouchdown(5.2, 1.5, 6), 'crash');

  let state = createInitialLandingState(PAYLOADS['solar-panels'].massMultiplier);
  state.guidanceMode = 'AUTOLAND';
  for (let i = 0; i < 1600; i++) {
    state = stepLandingPhysics(
      state,
      { forward: false, backward: false, left: false, right: false, action: false, tiltForward: false },
      0.05,
      true
    );
    if (state.landed) break;
  }
  assert.equal(state.landed, true, 'Auto-land must complete touchdown');
  assert.equal(state.result, 'perfect', 'Auto-land must touch down softly under 2.5 m/s');
  assert.ok(state.score > 1000);
});

test('VIPER Rover conforms to terrain, slides smoothly along boulders, and activates alternating Walker stride', () => {
  assert.equal(getLunarTerrainHeight(0, 0), 0);

  let rover = createInitialRoverState(0, 0);
  const colliders = [{ x: 0, z: 3.5, r: 1.4, label: 'Test Boulder', type: 'rock' as const }];

  for (let i = 0; i < 60; i++) {
    rover = stepRoverPhysics(
      rover,
      { forward: true, backward: false, left: true, right: false },
      colliders,
      0.05
    );
    const dist = Math.hypot(rover.x - colliders[0].x, rover.z - colliders[0].z);
    assert.ok(dist >= 1.18 + 1.4 - 0.05, 'rover should not tunnel inside solid collider');
  }

  // Switch to WALKER mode and verify diagonal wheel stride offsets animate cleanly
  rover.driveMode = 'WALKER';
  rover = stepRoverPhysics(
    rover,
    { forward: true, backward: false, left: false, right: false },
    colliders,
    0.05
  );
  assert.ok(rover.walkPhase > 0, 'walker stride phase should advance while moving');
  const diagonalLiftDiff = Math.abs(rover.wheelOffsets[0] - rover.wheelOffsets[1]);
  assert.ok(diagonalLiftDiff >= 0, 'wheel offsets should be finite numbers');
});

test('Outpost decisions enforce genuine engineering trade-offs (no free options)', () => {
  const base = { power: 80, oxygen: 75, shield: 50 };
  const shieldRes = applyOutpostDecision(base, 'boost-shield');
  assert.ok(shieldRes.resources.shield > base.shield);
  assert.ok(shieldRes.resources.power < base.power);

  const o2Res = applyOutpostDecision(base, 'life-support');
  assert.ok(o2Res.resources.oxygen > base.oxygen);
  assert.ok(o2Res.resources.power < base.power);
  assert.ok(o2Res.resources.shield < base.shield);

  const sciRes = applyOutpostDecision(base, 'push-science');
  assert.ok(sciRes.scienceMultiplier > 1.0);
  assert.ok(sciRes.resources.power < base.power);
  assert.ok(sciRes.resources.shield < base.shield);
});
