import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialLandingState,
  createInitialLaunchState,
  createInitialRoverState,
  createInitialSpaceFlightState,
} from './physics';
import {
  getLandingWarnings,
  getLaunchWarnings,
  getRoverWarnings,
  getSpaceWarnings,
} from './warnings';

test('getLaunchWarnings flags critical resource loss and stage separation prompts', () => {
  const launch = { ...createInitialLaunchState(), ignited: true, pitchDeg: 62, stagePrompt: 'SRB_SEP' as const };
  const warnings = getLaunchWarnings(launch, { power: 12, oxygen: 75, shield: 80 });
  assert.equal(warnings[0].severity, 'critical');
  assert.ok(warnings.some((w) => w.id === 'launch-srb-sep'));
  assert.ok(warnings.some((w) => w.id === 'launch-pitch-steep'));
});

test('getSpaceWarnings alerts on unshielded solar flare zone and low fuel', () => {
  const space = { ...createInitialSpaceFlightState('artemis-2'), inRadiationZone: true, shieldBoostActive: false, fuelPct: 12 };
  const warnings = getSpaceWarnings(space, { power: 60, oxygen: 80, shield: 28 }, true);
  assert.ok(warnings.some((w) => w.id === 'space-radiation-zone' && w.severity === 'critical'));
  assert.ok(warnings.some((w) => w.id === 'space-fuel-critical'));
  assert.ok(warnings.some((w) => w.id === 'res-shield-low'));
});

test('getLandingWarnings warns before high sink rate or excessive tilt crash', () => {
  const landing = { ...createInitialLandingState(1.1, 'moon'), y: 42, vy: -6.2, tiltDeg: 21, vx: 4.5 };
  const warnings = getLandingWarnings(landing, { power: 75, oxygen: 75, shield: 75 });
  assert.ok(warnings.some((w) => w.id === 'landing-sink-critical' && w.severity === 'critical'));
  assert.ok(warnings.some((w) => w.id === 'landing-tilt-critical'));
  assert.ok(warnings.some((w) => w.id === 'landing-drift-warn'));
});

test('getRoverWarnings alerts on Mars dust, steep slip, and active flare drain', () => {
  const marsRover = { ...createInitialRoverState(0, 0, 'mars'), dustAccumulationPct: 48, wheelSlipPct: 35 };
  const warnings = getRoverWarnings(marsRover, { power: 25, oxygen: 15, shield: 40 }, true);
  assert.equal(warnings[0].severity, 'critical');
  assert.ok(warnings.some((w) => w.id === 'rover-mars-dust'));
  assert.ok(warnings.some((w) => w.id === 'rover-wheel-slip'));
  assert.ok(warnings.some((w) => w.id === 'rover-flare-storm'));
});
