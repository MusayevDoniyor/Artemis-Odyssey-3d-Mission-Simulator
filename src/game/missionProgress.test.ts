import test from 'node:test';
import assert from 'node:assert/strict';
import { MOON_OBJECTIVES, PHYSICS, SOLAR_TARGETS } from './constants';
import {
  createInitialLandingState,
  createInitialLaunchState,
  createInitialRoverState,
  createInitialSpaceFlightState,
} from './physics';
import {
  getLandingMissionProgress,
  getLaunchMissionProgress,
  getRoverMissionProgress,
  getRoverSpeedometerTelemetry,
  getSpaceMissionProgress,
} from './missionProgress';

test('getLaunchMissionProgress tracks altitude progress and remaining km to 165 km orbit', () => {
  const pre = createInitialLaunchState();
  const preInfo = getLaunchMissionProgress(pre);
  assert.equal(preInfo.progressPct, 0);
  assert.match(preInfo.remainingLabel, /165\.0 km/);

  const mid = {
    ...pre,
    launchSequence: 'ASCENDING' as const,
    altitudeKm: 82.5,
    srbSeparated: true,
    lasJettisoned: true,
  };
  const midInfo = getLaunchMissionProgress(mid);
  assert.equal(Math.round(midInfo.progressPct), 50);
  assert.match(midInfo.remainingLabel, /82\.5 km/);
  assert.equal(midInfo.milestones[0].reached, true);
  assert.equal(midInfo.milestones[2].reached, false);

  const done = { ...mid, altitudeKm: PHYSICS.SLS_ORBIT_TARGET_KM, orbitReached: true };
  const doneInfo = getLaunchMissionProgress(done);
  assert.equal(doneInfo.progressPct, 100);
});

test('getSpaceMissionProgress computes remaining distance and relay calibration progress', () => {
  const space = createInitialSpaceFlightState('artemis-2');
  const startInfo = getSpaceMissionProgress(space, 'artemis-2');
  assert.ok(startInfo.progressPct >= 0 && startInfo.progressPct < 5);
  assert.match(startInfo.remainingLabel, /sim-km remaining/);

  const relayTarget = SOLAR_TARGETS['relay-orbit'];
  const atRelay = {
    ...space,
    shipX: relayTarget.x,
    shipZ: relayTarget.z,
    inSatDeployZone: true,
    orbitalSat: {
      ...space.orbitalSat,
      deployed: true,
      solarDeployedPct: 100,
      dishAlignedPct: 100,
      linkLocked: true,
      telemetrySignalPct: 100,
    },
  };
  const lockedInfo = getSpaceMissionProgress(atRelay, 'artemis-2');
  assert.equal(lockedInfo.progressPct, 100);
  assert.match(lockedInfo.remainingLabel, /Complete/);
});

test('getLandingMissionProgress tracks radar altitude remaining to surface touchdown', () => {
  const moonLanding = createInitialLandingState(1.2, 'moon');
  const startInfo = getLandingMissionProgress(moonLanding);
  assert.equal(Math.round(startInfo.progressPct), 0);
  assert.match(startInfo.originLabel, /^\d+ m Entry$/);
  assert.match(startInfo.remainingLabel, /165\.\d m alt/);

  const marsLanding = createInitialLandingState(1.2, 'mars');
  const marsStartInfo = getLandingMissionProgress(marsLanding);
  assert.match(marsStartInfo.originLabel, /^\d+ m Entry$/);

  const terminal = { ...moonLanding, y: 16.5 };
  const termInfo = getLandingMissionProgress(terminal);
  assert.equal(Math.round(termInfo.progressPct), 90);
  assert.equal(termInfo.milestones[0].reached, true);
  assert.equal(termInfo.milestones[1].reached, true);

  const landed = { ...moonLanding, y: 0, landed: true, result: 'perfect' as const };
  assert.equal(getLandingMissionProgress(landed).progressPct, 100);
});

test('getRoverMissionProgress tracks site completions, partial drilling, and nearest remaining site', () => {
  const rover = createInitialRoverState(0, 0, 'moon');
  const objs = MOON_OBJECTIVES.map((o) => ({ ...o, progress: 0, completed: false }));

  const initial = getRoverMissionProgress(rover, objs);
  assert.equal(initial.progressPct, 0);
  assert.equal(initial.detailLabel, '0 / 4 Sites');
  assert.match(initial.remainingLabel, /4 sites left/);

  objs[0].completed = true;
  objs[1].progress = 0.5;
  const partial = getRoverMissionProgress(rover, objs);
  assert.equal(Math.round(partial.progressPct * 10) / 10, 37.5);
  assert.equal(partial.detailLabel, '1 / 4 Sites');
  assert.match(partial.remainingLabel, /3 sites left/);

  objs.forEach((o) => {
    o.completed = true;
    o.progress = 1;
  });
  const complete = getRoverMissionProgress(rover, objs);
  assert.equal(complete.progressPct, 100);
  assert.match(complete.remainingLabel, /Mission Complete/);
});

test('getRoverSpeedometerTelemetry computes real m/s, km/h, gauge percentage, and gear states', () => {
  const rover = createInitialRoverState(6, 6, 'moon');
  const idle = getRoverSpeedometerTelemetry(rover);
  assert.equal(idle.absSpeedMs, 0);
  assert.equal(idle.speedKmh, 0);
  assert.equal(idle.gearLabel, 'HOLD');

  const fullFwd = { ...rover, speed: PHYSICS.ROVER_MAX_SPEED };
  const fwdInfo = getRoverSpeedometerTelemetry(fullFwd);
  assert.equal(fwdInfo.gearLabel, 'FWD');
  assert.equal(fwdInfo.gaugePct, 100);
  assert.ok(Math.abs(fwdInfo.speedKmh - 30.96) < 0.05);
  assert.equal(fwdInfo.isHighSpeed, true);

  const revWalker = { ...rover, driveMode: 'WALKER' as const, speed: -2.1 };
  const revInfo = getRoverSpeedometerTelemetry(revWalker);
  assert.equal(revInfo.gearLabel, 'REV');
  assert.equal(revInfo.absSpeedMs, 2.1);
  assert.equal(revInfo.maxSpeedMs, PHYSICS.ROVER_WALKER_SPEED);
  assert.ok(revInfo.modeCapPct < 55);

  const spin = { ...rover, driveMode: 'SPIN' as const, speed: 0 };
  assert.equal(getRoverSpeedometerTelemetry(spin).gearLabel, 'PIVOT');
});
