import test from 'node:test';
import assert from 'node:assert/strict';
import { HARDWARE_CATALOG, HARDWARE_ORDER } from './hardwareCatalog';
import {
  SLS_STAGE_SEQUENCE,
  computePropulsionExplorerMetrics,
  evaluatePartFinderPick,
  getCatalogPartById,
  getPropulsionProfileForPart,
  getRs25EngineClusterInfo,
  getStageSepStep,
  resolveInspectorLabelLayout,
} from './hardwareInspector';
import type { InspectorLabelPoint } from './types';

test('SLS Block 1, Saturn V, and Falcon 9 define required aerospace subsystems and have complete specs and quizzes', () => {
  const sls = HARDWARE_CATALOG.rocket;
  assert.deepEqual(
    sls.parts.map((p) => p.id),
    ['sls-core', 'sls-rs25', 'sls-boosters', 'sls-icps', 'sls-orion', 'sls-esm', 'sls-las']
  );

  const saturn = HARDWARE_CATALOG['saturn-v'];
  assert.ok(saturn);
  assert.deepEqual(
    saturn.parts.map((p) => p.id),
    ['saturn-sic', 'saturn-sii', 'saturn-sivb', 'saturn-iu-sla', 'saturn-csm', 'saturn-les']
  );

  const falcon = HARDWARE_CATALOG['falcon-9'];
  assert.ok(falcon);
  assert.deepEqual(
    falcon.parts.map((p) => p.id),
    ['falcon-stage1', 'falcon-grid-fins', 'falcon-landing-legs', 'falcon-interstage', 'falcon-stage2', 'falcon-fairing']
  );

  const iss = HARDWARE_CATALOG.iss;
  assert.ok(iss);
  assert.deepEqual(
    iss.parts.map((p) => p.id),
    ['iss-truss', 'iss-modules', 'iss-solar-arrays', 'iss-radiators', 'iss-canadarm']
  );

  for (const craftId of HARDWARE_ORDER) {
    const spec = HARDWARE_CATALOG[craftId];
    assert.ok(spec.overviewSpecs.length >= 3);
    assert.ok(spec.modelHonestyTag.length > 0);
    for (const part of spec.parts) {
      assert.ok(part.mainFunction.length > 10, `${craftId}/${part.id} missing mainFunction`);
      assert.ok(part.dimensions.length > 5, `${craftId}/${part.id} missing dimensions`);
      assert.ok(part.engineeringSpecs.length >= 3, `${craftId}/${part.id} missing specs`);
      assert.ok(part.levels.level1What.length > 15);
      assert.ok(part.levels.level2How.length > 15);
      assert.ok(part.levels.level3Engineering.length > 15);
      assert.ok(part.missionRelevance.length > 10);
      assert.equal(part.quizQuestion.options.length, 3);
      assert.ok(part.quizQuestion.correctIndex >= 0 && part.quizQuestion.correctIndex < 3);
    }
  }
});

test('propulsion explorer computes physically consistent thrust, exhaust velocity, mass flow, and TWR', () => {
  const rs25Profile = getPropulsionProfileForPart('rocket', 'sls-rs25');
  const fullVac = computePropulsionExplorerMetrics(rs25Profile, 100, true);
  assert.equal(fullVac.thrustKn, 9116);
  assert.ok(fullVac.exhaustVelocityMs > 4400 && fullVac.exhaustVelocityMs < 4500);
  assert.ok(fullVac.massFlowKgS > 2000 && fullVac.massFlowKgS < 2100);
  assert.ok(fullVac.twr < 0.4); // Core alone cannot lift off without SRBs!

  // Throttle clamped to rated limits (67%..109%)
  const minT = computePropulsionExplorerMetrics(rs25Profile, 20, true);
  assert.equal(minT.throttlePct, 67);
  const maxT = computePropulsionExplorerMetrics(rs25Profile, 140, true);
  assert.equal(maxT.throttlePct, 109);

  // SRBs provide > 1.2 TWR combined even before adding RS-25 thrust
  const srbProfile = getPropulsionProfileForPart('rocket', 'sls-boosters');
  const srbRes = computePropulsionExplorerMetrics(srbProfile, 100, false);
  assert.ok(srbRes.thrustKn > 25000);
});

test('RS-25 cluster inspector clamps gimbal angles and resolves lateral vs axial force vectors', () => {
  const straight = getRs25EngineClusterInfo(2, 0, 100);
  assert.equal(straight.index, 2);
  assert.equal(straight.lateralForceKn, 0);
  assert.equal(straight.axialForceKn, 2279);

  const gimbaled = getRs25EngineClusterInfo(4, 25, 100); // clamped to 10.5 deg
  assert.equal(gimbaled.gimbalDeg, 10.5);
  assert.ok(gimbaled.lateralForceKn > 400);
  assert.ok(gimbaled.axialForceKn < 2279);
});

test('SLS stage separation timeline sequences SRBs, LAS, Core Stage, and ESM/ICPS monotonically', () => {
  assert.equal(SLS_STAGE_SEQUENCE.length, 5);
  const pad = getStageSepStep(-3);
  assert.equal(pad.step, 0);
  assert.equal(pad.srbSepFactor, 0);

  const afterSrb = getStageSepStep(1);
  assert.equal(afterSrb.srbSepFactor, 1);
  assert.equal(afterSrb.lasSepFactor, 0);

  const tli = getStageSepStep(99);
  assert.equal(tli.step, 4);
  assert.equal(tli.coreSepFactor, 1);
  assert.equal(tli.esmSolarFoldPct, 100);
  assert.equal(tli.icpsThrusting, true);
});

test('resolveInspectorLabelLayout separates overlapping projected 3D labels while preserving anchor points', () => {
  const stacked: InspectorLabelPoint[] = [
    { partId: 'sls-las', name: 'Launch Abort System', xPct: 50, yPct: 30, visible: true },
    { partId: 'sls-orion', name: 'Orion Crew Capsule', xPct: 51, yPct: 31, visible: true },
    { partId: 'sls-esm', name: 'European Service Module', xPct: 50, yPct: 32, visible: true },
    { partId: 'sls-hidden', name: 'Hidden', xPct: 120, yPct: 50, visible: false },
  ];

  const resolved = resolveInspectorLabelLayout(stacked);
  const vis = resolved.filter((r) => r.visible);
  assert.equal(vis.length, 3);
  // Anchors preserved for leader lines
  assert.equal(vis[0].anchorYPct, 30);
  assert.equal(vis[1].anchorYPct, 31);
  assert.equal(vis[2].anchorYPct, 32);
  // Every pair of placed visible labels is cleanly separated in 2D space (horizontally fanned or vertically offset)
  for (let i = 0; i < vis.length; i++) {
    for (let j = i + 1; j < vis.length; j++) {
      const dx = Math.abs(vis[i].xPct - vis[j].xPct);
      const dy = Math.abs(vis[i].yPct - vis[j].yPct);
      assert.ok(dx >= 17 || dy >= 5.8, `Labels ${i} and ${j} collided (dx=${dx}, dy=${dy})`);
    }
  }
  assert.equal(resolved[3].visible, false);
});

test('evaluatePartFinderPick scores matches and preserves target on mismatch', () => {
  const hit = evaluatePartFinderPick('rocket', 'sls-rs25', 'sls-rs25', 2);
  assert.equal(hit.isCorrect, true);
  assert.equal(hit.nextScore, 3);
  assert.notEqual(hit.nextTargetId, 'sls-rs25');

  const miss = evaluatePartFinderPick('rocket', 'sls-core', 'sls-rs25', 2);
  assert.equal(miss.isCorrect, false);
  assert.equal(miss.nextScore, 2);
  assert.equal(miss.nextTargetId, 'sls-rs25');
  assert.equal(getCatalogPartById('rocket', 'sls-esm')?.id, 'sls-esm');
});
