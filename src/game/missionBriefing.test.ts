import test from 'node:test';
import assert from 'node:assert/strict';
import { CAMPAIGN_ORDER } from './constants';
import {
  MISSION_BRIEFING_META,
  evaluateBriefingMissionStatus,
  getMissionEquipmentList,
  getMissionEquipmentOption,
  getMissionStartingResources,
} from './missionBriefing';
import {
  createInitialCampaignCarryover,
  createInitialLaunchState,
  createInitialSpaceFlightState,
  stepSpaceFlightPhysics,
} from './physics';

test('each campaign mission provides distinct mission-adapted equipment and clean metadata', () => {
  const drillSlotNames = new Set<string>();
  for (const id of CAMPAIGN_ORDER) {
    const meta = MISSION_BRIEFING_META[id];
    const eqList = getMissionEquipmentList(id);
    assert.equal(eqList.length, 4);
    assert.ok(!meta.code.includes('MARS · MARS'), `${id} should not duplicate Mars label`);

    const scienceEq = getMissionEquipmentOption(id, 'water-drill');
    drillSlotNames.add(scienceEq.name);

    // Orbital-only missions should not show surface-landing fragility penalties
    if (id === 'artemis-2' || id === 'artemis-4') {
      assert.equal(
        eqList.some((e) => e.fragile),
        false,
        `${id} should not mark equipment fragile for non-landing ops`
      );
    }
  }
  assert.equal(drillSlotNames.size, 4, 'All 4 missions should tailor the 4th equipment slot');
});

test('getMissionStartingResources combines carryover bonuses and equipment bonuses accurately', () => {
  const carryover = {
    ...createInitialCampaignCarryover(),
    solarGridKw: 40, // +10 power
    regolithShieldLevel: 1, // +8 shield
  };
  const resSolar = getMissionStartingResources(carryover, 'artemis-3', 'solar-panels');
  assert.equal(resSolar.power, 100); // 75 + 10 + 40 clamped to 100
  assert.equal(resSolar.oxygen, 75);
  assert.equal(resSolar.shield, 78); // 70 + 8

  const resHeavy = getMissionStartingResources(carryover, 'mars-pathfinder', 'heavy-shield');
  assert.equal(resHeavy.power, 85); // 75 + 10
  assert.equal(resHeavy.shield, 100); // 70 + 8 + 35 clamped to 100
});

test('Artemis II HERMES Optical Relay Kit accelerates satellite deployment in stepSpaceFlightPhysics', () => {
  const carryover = createInitialCampaignCarryover();
  const baseSpace = createInitialSpaceFlightState('artemis-2', carryover);
  // Position ship right inside HERMES relay deploy zone
  const relaySpace = {
    ...baseSpace,
    shipX: baseSpace.orbitalSat.satX,
    shipZ: baseSpace.orbitalSat.satZ,
    inSatDeployZone: true,
  };
  const baseRes = { power: 80, oxygen: 80, shield: 80 };
  const input = { forward: false, backward: false, left: false, right: false, boost: false, action: true };

  const baselineEq = getMissionEquipmentOption('artemis-2', 'oxygen-tanks');
  const hermesEq = getMissionEquipmentOption('artemis-2', 'water-drill');
  assert.equal(baselineEq.satDeployBoost, 1.0);
  assert.equal(hermesEq.satDeployBoost, 1.6);

  let sNorm = relaySpace;
  let rNorm = baseRes;
  let sBoost = relaySpace;
  let rBoost = baseRes;
  for (let i = 0; i < 44; i++) {
    const out1 = stepSpaceFlightPhysics(sNorm, rNorm, input, false, 0.05, 0, 'exploration', {
      satDeployBoost: baselineEq.satDeployBoost,
      fuelFactor: baselineEq.spaceFuelFactor,
    });
    sNorm = out1.space;
    rNorm = out1.resources;

    const out2 = stepSpaceFlightPhysics(sBoost, rBoost, input, false, 0.05, 0, 'exploration', {
      satDeployBoost: hermesEq.satDeployBoost,
      fuelFactor: hermesEq.spaceFuelFactor,
    });
    sBoost = out2.space;
    rBoost = out2.resources;
  }

  assert.ok(
    sBoost.orbitalSat.telemetrySignalPct > sNorm.orbitalSat.telemetrySignalPct,
    `Expected boosted sat signal (${sBoost.orbitalSat.telemetrySignalPct}) > baseline (${sNorm.orbitalSat.telemetrySignalPct})`
  );
  assert.equal(sBoost.orbitalSat.linkLocked, true);
  assert.equal(sNorm.orbitalSat.linkLocked, false);
});

test('Artemis IV IDA Docking & Nav Suite cuts cislunar thruster fuel consumption by 25%', () => {
  const carryover = createInitialCampaignCarryover();
  const startSpace = createInitialSpaceFlightState('artemis-4', carryover);
  const startRes = { power: 80, oxygen: 80, shield: 80 };
  const thrustInput = { forward: true, backward: false, left: false, right: false, boost: false, action: false };

  const baselineEq = getMissionEquipmentOption('artemis-4', 'heavy-shield');
  const navEq = getMissionEquipmentOption('artemis-4', 'water-drill');
  assert.equal(navEq.spaceFuelFactor, 0.75);

  const outBase = stepSpaceFlightPhysics(startSpace, startRes, thrustInput, false, 0.05, 0, 'exploration', {
    fuelFactor: baselineEq.spaceFuelFactor,
  });
  const outNav = stepSpaceFlightPhysics(startSpace, startRes, thrustInput, false, 0.05, 0, 'exploration', {
    fuelFactor: navEq.spaceFuelFactor,
  });

  const baseBurn = startSpace.fuelPct - outBase.space.fuelPct;
  const navBurn = startSpace.fuelPct - outNav.space.fuelPct;
  assert.ok(Math.abs(navBurn - baseBurn * 0.75) < 1e-6);
});

test('evaluateBriefingMissionStatus updates route checkpoints and objectives from live state', () => {
  const carryover = {
    ...createInitialCampaignCarryover(),
    activeMission: 'artemis-2' as const,
    relaySatelliteOnline: true,
    completedMissions: ['artemis-2'] as const,
  };
  const launch = { ...createInitialLaunchState(), orbitReached: true, altitudeKm: 170 };

  const doneA2 = evaluateBriefingMissionStatus('artemis-2', {
    carryover: { ...carryover, completedMissions: [...carryover.completedMissions] },
    launch,
  });
  assert.equal(doneA2.isCleared, true);
  assert.equal(doneA2.routeNodes.every((n) => n.status === 'done'), true);
  assert.equal(doneA2.objectives.every((o) => o.completed), true);

  const freshMars = evaluateBriefingMissionStatus('mars-pathfinder', {
    carryover: {
      ...createInitialCampaignCarryover(),
      activeMission: 'mars-pathfinder',
      marsSamplesCached: 1,
    },
  });
  assert.equal(freshMars.isCleared, false);
  assert.equal(freshMars.routeNodes[0].status, 'active');
  assert.equal(freshMars.objectives[1].detail, '1 samples cached');
});
