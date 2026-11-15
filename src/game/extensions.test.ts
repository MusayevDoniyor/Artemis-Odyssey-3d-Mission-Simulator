import test from 'node:test';
import assert from 'node:assert/strict';
import {
  HARDWARE_CATALOG,
  HARDWARE_ORDER,
} from './hardwareCatalog';
import {
  SOLAR_SYSTEM_BODIES,
  computeKeplerBodyPosition,
  computeWeightOnBodyKg,
  getLiveSolarTargetPosition,
} from './solarSystemData';
import { getLearnModuleForObjective } from './learningModules';
import {
  areAllPreLaunchChecksGo,
  computeRoverDisplaySpeed,
  createInitialLeoTransferState,
  createInitialMarsEdlState,
  createInitialPreLaunchChecks,
  createInitialUnstowState,
  fastForwardMarsEdl,
  fastForwardUnstow,
  shouldTriggerApollo1202Alarm,
  stepLeoTransfer,
  stepMarsEdlSequence,
  stepUnstowSequence,
} from './sequences';
import {
  createInitialDrillingState,
  getDrillStrata,
  purgeAndCoolDrill,
  setDrillSetting,
  stepDrillingConsole,
} from './drilling';
import {
  buildSolSummaryReport,
  createInitialOutpostConsoleState,
  stepAirlockCycle,
  switchOutpostPowerSource,
  toggleOutpostAirlock,
} from './outpost';
import {
  clearMarsQueue,
  createInitialMarsQueueState,
  enqueueMarsWaypoint,
  removeLastMarsCommand,
  shouldShowDidYouKnowToast,
  stepMarsQueue,
  transmitMarsQueue,
} from './marsQueue';
import { getPlanetObjectives } from './constants';
import { createInitialCampaignCarryover, createInitialRoverState } from './physics';

test('hardware catalog includes all 7 vehicles with parts, explode axes, and connections', () => {
  assert.equal(HARDWARE_ORDER.length, 7);
  for (const id of HARDWARE_ORDER) {
    const spec = HARDWARE_CATALOG[id];
    assert.ok(spec, `Missing hardware spec for ${id}`);
    assert.ok(spec.parts.length >= 3, `Expected >= 3 parts for ${id}`);
    for (const part of spec.parts) {
      assert.equal(part.explodeAxis.length, 3);
      assert.ok(Array.isArray(part.connections));
      assert.ok(part.quizPrompt.length > 5);
    }
  }
});

test('solar system catalog covers Sun through Eris/Halley with Moon orbiting Earth and increasing planetary order', () => {
  assert.equal(SOLAR_SYSTEM_BODIES.length, 14);
  const saturn = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'saturn');
  assert.ok(saturn);
  const expPos = computeKeplerBodyPosition(saturn, 0, 'exploration');
  const sciPos = computeKeplerBodyPosition(saturn, 0, 'scientific');
  assert.notEqual(expPos.x, sciPos.x);

  const laterPos = computeKeplerBodyPosition(saturn, 5, 'exploration');
  assert.notEqual(laterPos.angleRad, expPos.angleRad);

  // Strictly increasing orbital order for planets/dwarfs around Sun
  const orderedIds = [
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
    'eris',
  ];
  for (const mode of ['exploration', 'scientific'] as const) {
    let prevR = 0;
    for (const id of orderedIds) {
      const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === id);
      assert.ok(spec, `Missing solar body ${id}`);
      const r = mode === 'scientific' ? spec.scientificScaleRadius : spec.explorationRadiusUnits;
      assert.ok(r > prevR, `${id} radius (${r}) must exceed previous (${prevR}) in ${mode}`);
      prevR = r;
    }
  }

  // Moon stays tightly bound to Earth across arbitrary orbital epochs
  const earth = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
  const moon = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'moon')!;
  for (const epoch of [0, 0.25, 0.75, 2.4]) {
    const eExp = computeKeplerBodyPosition(earth, epoch, 'exploration');
    const mExp = computeKeplerBodyPosition(moon, epoch, 'exploration');
    assert.ok(Math.abs(Math.hypot(mExp.x - eExp.x, mExp.z - eExp.z) - 10.5) < 0.05);

    const eSci = computeKeplerBodyPosition(earth, epoch, 'scientific');
    const mSci = computeKeplerBodyPosition(moon, epoch, 'scientific');
    assert.ok(Math.abs(Math.hypot(mSci.x - eSci.x, mSci.z - eSci.z) - 4.2) < 0.05);
  }

  const liveMoon = getLiveSolarTargetPosition('moon', 0, 'exploration');
  const liveEarth = computeKeplerBodyPosition(earth, 0, 'exploration');
  assert.ok(Math.hypot(liveMoon.x - liveEarth.x, liveMoon.z - liveEarth.z) < 11.0);

  assert.equal(computeWeightOnBodyKg(35, 0.165), 5.8);
  assert.equal(computeWeightOnBodyKg(35, 0.38), 13.3);
});

test('all Moon and Mars surface objectives provide complete LearnObjectModal modules & quizzes', () => {
  for (const planet of ['moon', 'mars'] as const) {
    const objs = getPlanetObjectives(planet);
    assert.equal(objs.length, 4);
    for (const obj of objs) {
      const mod = getLearnModuleForObjective({ ...obj, progress: 0, completed: false });
      assert.ok(mod.composition.length > 3);
      assert.equal(mod.researchBullets.length, 2);
      assert.equal(mod.quiz.options.length, 3);
      assert.ok(mod.quiz.correctIndex >= 0 && mod.quiz.correctIndex < 3);
    }
  }
});

test('pre-launch checklist gates countdown and LEO parking completes TLI burn cleanly', () => {
  const checks = createInitialPreLaunchChecks();
  assert.equal(areAllPreLaunchChecksGo(checks), false);
  checks.powerBus = true;
  checks.cryoChill = true;
  checks.delugeArmed = true;
  checks.crewArmClear = true;
  assert.equal(areAllPreLaunchChecksGo(checks), true);

  let leo = createInitialLeoTransferState();
  leo = stepLeoTransfer(leo, 0.5, true);
  assert.equal(leo.inParkingOrbit, true);
  assert.equal(leo.readyForSpaceTransition, false);

  leo = { ...leo, tliBurnActive: true };
  for (let i = 0; i < 60; i++) {
    leo = stepLeoTransfer(leo, 0.1, true);
  }
  assert.equal(leo.tliBurnProgressPct, 100);
  assert.equal(leo.tliDeltaVAppliedMs, 3150);
  assert.equal(leo.readyForSpaceTransition, true);
});

test('Apollo 1202 alarm triggers once on Moon descent window in manual mode only', () => {
  assert.equal(shouldTriggerApollo1202Alarm('moon', 60, 'MANUAL', false, false), true);
  assert.equal(shouldTriggerApollo1202Alarm('moon', 60, 'AUTOLAND', false, false), false);
  assert.equal(shouldTriggerApollo1202Alarm('moon', 60, 'MANUAL', true, false), false);
  assert.equal(shouldTriggerApollo1202Alarm('mars', 60, 'MANUAL', false, false), false);
});

test('Mars 7-minute EDL progresses through comms blackout, parachute, heat shield, sky crane, to handoff', () => {
  let edl = createInitialMarsEdlState('mars');
  assert.equal(edl.active, true);
  assert.equal(edl.stage, 'CRUISE_SEP');

  let sawBlackout = false;
  let sawChute = false;
  let sawSkyCrane = false;
  for (let i = 0; i < 140; i++) {
    edl = stepMarsEdlSequence(edl, 0.1, Math.max(20, 120 - i), 'mars');
    if (edl.commsBlackout) sawBlackout = true;
    if (edl.parachuteDeployed) sawChute = true;
    if (edl.stage === 'SKY_CRANE') sawSkyCrane = true;
  }
  assert.equal(sawBlackout, true);
  assert.equal(sawChute, true);
  assert.equal(sawSkyCrane, true);
  assert.equal(edl.stage, 'HANDOFF');
  assert.equal(edl.active, false);

  const skipped = fastForwardMarsEdl(createInitialMarsEdlState('mars'));
  assert.equal(skipped.stage, 'HANDOFF');
  assert.equal(skipped.active, false);
});

test('Post-landing unstow runs Engine Cool -> Crew Check -> Ramp -> Rover Unstow -> Complete', () => {
  let unstow = createInitialUnstowState('moon');
  assert.equal(unstow.active, true);
  assert.equal(unstow.stage, 'ENGINE_COOL');

  const seenStages = new Set<string>();
  for (let i = 0; i < 100; i++) {
    seenStages.add(unstow.stage);
    unstow = stepUnstowSequence(unstow, 0.1);
  }
  assert.ok(seenStages.has('RAMP_DEPLOY'));
  assert.ok(seenStages.has('ROVER_UNSTOW'));
  assert.equal(unstow.completed, true);
  assert.equal(unstow.rampDeployPct, 100);
  assert.equal(unstow.roverRolloutPct, 100);

  const fast = fastForwardUnstow(createInitialUnstowState('mars'));
  assert.equal(fast.completed, true);
  assert.equal(fast.active, false);
});

test('computeRoverDisplaySpeed converts accurately between Real VIPER rate and Kid Explore x25', () => {
  const real = computeRoverDisplaySpeed(13.2, 'REAL_SPEED');
  assert.equal(real.displayMs, 0.18);
  assert.equal(real.badgeText, 'REAL DATA');

  const kid = computeRoverDisplaySpeed(10.0, 'KID_25X');
  assert.equal(kid.displayMs, 10.0);
  assert.equal(kid.badgeText, 'SIMULATED VALUE');
});

test('TRIDENT drilling console handles strata progression, overheating at >=95C, and Purge & Cool recovery', () => {
  assert.equal(getDrillStrata('moon').length, 4);
  assert.equal(getDrillStrata('mars').length, 4);

  let drill = createInitialDrillingState('shackleton-ice', 'Drill Shackleton Rim Ice', 'moon');
  drill = setDrillSetting(drill, 'HIGH_TORQUE');
  drill = { ...drill, isDrilling: true };

  // Step continuously in High Torque until overheat occurs
  for (let i = 0; i < 60; i++) {
    drill = stepDrillingConsole(drill, 0.1, 1.0);
  }
  assert.equal(drill.overheated, true);
  assert.equal(drill.isDrilling, false);

  drill = purgeAndCoolDrill(drill);
  assert.equal(drill.overheated, false);
  assert.equal(drill.jammed, false);

  // Switch to GENTLE and finish core to 100cm
  drill = setDrillSetting(drill, 'GENTLE');
  drill = { ...drill, isDrilling: true };
  for (let i = 0; i < 180; i++) {
    drill = stepDrillingConsole(drill, 0.1, 1.2);
  }
  assert.equal(drill.completed, true);
  assert.equal(drill.collectedStrata.length, 4);
});

test('Outpost airlock cycles cleanly, Kilopower switches bus, and Sol report summarizes trade-offs', () => {
  let outpost = createInitialOutpostConsoleState('mars');
  assert.equal(outpost.airlockStage, 'EXTERIOR_OPEN');
  outpost = toggleOutpostAirlock(outpost);
  assert.equal(outpost.airlockStage, 'REPRESSURIZING');

  for (let i = 0; i < 25; i++) {
    outpost = stepAirlockCycle(outpost, 0.1);
  }
  assert.equal(outpost.airlockStage, 'SEALED_INT');

  outpost = switchOutpostPowerSource(outpost, 'kilopower');
  assert.equal(outpost.kilopowerActive, true);

  const report = buildSolSummaryReport(
    'mars',
    { power: 40, oxygen: 65, shield: 70 },
    createInitialCampaignCarryover(),
    'kilopower',
    2,
    45
  );
  assert.equal(report.solNumber, 2);
  assert.ok(report.highlights.length >= 1);
  assert.ok(report.recommendation.toLowerCase().includes('power'));
});

test('Mars waypoint batch queue clamps coords, transmits across lag, steers, and triggers arrival drill', () => {
  let mq = createInitialMarsQueueState(14);
  assert.equal(mq.phase, 'IDLE');
  assert.equal(mq.queue.length, 0);

  // Clamp out-of-bounds waypoint and enqueue an objective drill command
  mq = enqueueMarsWaypoint(mq, 999, -999, 'Far Point');
  assert.equal(mq.queue.length, 1);
  assert.ok(mq.queue[0].x <= 260 && mq.queue[0].z >= -260);
  assert.equal(mq.queue[0].type, 'DRIVE_TO');

  mq = removeLastMarsCommand(mq);
  assert.equal(mq.queue.length, 0);

  const marsObjs = getPlanetObjectives('mars').map((o) => ({ ...o, progress: 0, completed: false }));
  const targetObj = marsObjs[0];
  mq = enqueueMarsWaypoint(mq, targetObj.x, targetObj.z, targetObj.siteName, targetObj.id);
  assert.equal(mq.queue[0].type, 'DRILL');

  mq = transmitMarsQueue(mq);
  assert.equal(mq.phase, 'TRANSMITTING');
  assert.ok(mq.txRemainingSec > 0);

  // Step through simulated uplink lag -> transitions to EXECUTING
  const startRover = createInitialRoverState(0, 0, 'mars');
  for (let i = 0; i < 30; i++) {
    const res = stepMarsQueue(mq, startRover, marsObjs, 0.1);
    mq = res.queueState;
  }
  assert.equal(mq.phase, 'EXECUTING');

  // While far away, issues steering/drive commands cleanly
  const farRes = stepMarsQueue(mq, startRover, marsObjs, 0.05);
  assert.ok(farRes.input.left || farRes.input.right || farRes.input.forward);
  assert.equal(farRes.triggerDrillObjectiveId, null);

  // Once within arrival distance of targetObj, triggers drill prompt & clears queue
  const nearRover = createInitialRoverState(targetObj.x - 1.5, targetObj.z - 1.5, 'mars');
  const arriveRes = stepMarsQueue(mq, nearRover, marsObjs, 0.05);
  assert.equal(arriveRes.triggerDrillObjectiveId, targetObj.id);
  assert.equal(arriveRes.queueState.phase, 'IDLE');

  mq = enqueueMarsWaypoint(mq, 12, 12, 'Pad');
  mq = clearMarsQueue(mq);
  assert.equal(mq.queue.length, 0);
});

test('shouldShowDidYouKnowToast shows only during calm gameplay with zero alerts or menus open', () => {
  assert.equal(
    shouldShowDidYouKnowToast({
      hasActiveAnomaly: false,
      apollo1202Active: false,
      hasCriticalWarning: false,
      menuOpen: false,
      modalOpen: false,
    }),
    true
  );

  for (const flag of [
    'hasActiveAnomaly',
    'apollo1202Active',
    'hasCriticalWarning',
    'menuOpen',
    'modalOpen',
  ] as const) {
    assert.equal(
      shouldShowDidYouKnowToast({
        hasActiveAnomaly: false,
        apollo1202Active: false,
        hasCriticalWarning: false,
        menuOpen: false,
        modalOpen: false,
        [flag]: true,
      }),
      false
    );
  }
});
