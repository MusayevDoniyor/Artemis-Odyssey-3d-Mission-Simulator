import test from 'node:test';
import assert from 'node:assert/strict';
import { HARDWARE_CATALOG, HARDWARE_ORDER } from '../../game/hardwareCatalog';
import { SPACECRAFT_CATALOG_SI } from '../../game/planetaryCatalog';

test('PHASE 5: Orion MPCV and European Service Module (ESM) match published NASA/ESA specifications', () => {
  const orion = SPACECRAFT_CATALOG_SI['orion-mpcv'];
  assert.ok(orion, 'Orion MPCV must be defined in SPACECRAFT_CATALOG_SI');
  assert.equal(orion.diameterM, 5.02, 'Heatshield base diameter must be 5.02 m');
  assert.equal(orion.wingspanM, 19.0, 'X-wing solar array wingspan must be 19.0 m');
  assert.equal(orion.thrustN, 26_700, 'AJ10-190 OMS engine thrust must be 26.7 kN');
  assert.equal(orion.ispVacuumS, 316, 'AJ10 vacuum Isp must be 316 s');
  assert.ok(orion.wetMassKg >= 25_000 && orion.wetMassKg <= 28_000, 'Orion stack wet mass ~26.5 t');
});

test('PHASE 5: International Space Station (ISS) is defined with authentic 108.5m truss and 5 subsystems', () => {
  const iss = HARDWARE_CATALOG.iss;
  assert.ok(iss, 'ISS must be present in HARDWARE_CATALOG');
  assert.equal(iss.parts.length, 5, 'ISS must have 5 major subsystems');

  const partIds = iss.parts.map((p) => p.id);
  assert.ok(partIds.includes('iss-truss'), 'ISS must have Integrated Truss Structure');
  assert.ok(partIds.includes('iss-modules'), 'ISS must have Pressurized Modules');
  assert.ok(partIds.includes('iss-solar-arrays'), 'ISS must have 8 Solar Array Wings');
  assert.ok(partIds.includes('iss-radiators'), 'ISS must have Ammonia Radiators');
  assert.ok(partIds.includes('iss-canadarm'), 'ISS must have Canadarm2');

  const issSI = SPACECRAFT_CATALOG_SI.iss;
  assert.ok(issSI, 'ISS must be defined in SPACECRAFT_CATALOG_SI');
  assert.equal(issSI.diameterM, 108.5, 'Integrated Truss Structure must be 108.5 m');
  assert.equal(issSI.wetMassKg, 450_000, 'ISS mass ~450,000 kg');
});

test('PHASE 5: Space Network TDRS satellite replaces fictional relay and reflects verified NASA specs', () => {
  const tdrs = HARDWARE_CATALOG.satellite;
  assert.ok(tdrs, 'Satellite must exist in HARDWARE_CATALOG');
  assert.equal(tdrs.shortLabel, 'TDRS Relay');
  assert.ok(tdrs.title.includes('Tracking and Data Relay Satellite'));

  const tdrsSI = SPACECRAFT_CATALOG_SI.tdrs;
  assert.ok(tdrsSI, 'TDRS must be defined in SPACECRAFT_CATALOG_SI');
  assert.equal(tdrsSI.wingspanM, 14.8, 'TDRS deployable wingspan must be 14.8 m');
});

test('PHASE 5: Gateway is formally designated as a paused programme per March 2026 NASA architecture', () => {
  const outpost = HARDWARE_CATALOG.outpost;
  assert.ok(outpost.subtitle.toLowerCase().includes('paused gateway'));
  assert.ok(outpost.summary.toLowerCase().includes('paused programme'));

  const gatewaySI = SPACECRAFT_CATALOG_SI.gateway;
  assert.ok(gatewaySI, 'Gateway must be in SPACECRAFT_CATALOG_SI');
  assert.ok(gatewaySI.approximationNote?.toLowerCase().includes('paused programme'));
});

test('PHASE 5: All 10 vehicles in HARDWARE_ORDER have complete educational copy, quizzes, and explode axes', () => {
  assert.equal(HARDWARE_ORDER.length, 10);
  for (const craftId of HARDWARE_ORDER) {
    const spec = HARDWARE_CATALOG[craftId];
    assert.ok(spec, `Missing spec for ${craftId}`);
    assert.ok(spec.overviewSpecs.length >= 3, `${craftId} must have >= 3 overview specs`);
    assert.ok(spec.parts.length >= 3, `${craftId} must have >= 3 parts`);
    for (const part of spec.parts) {
      assert.equal(part.explodeAxis.length, 3, `${part.id} must have 3D explode axis`);
      assert.ok(part.levels.level1What.length > 10, `${part.id} missing Level 1`);
      assert.ok(part.levels.level2How.length > 10, `${part.id} missing Level 2`);
      assert.ok(part.levels.level3Engineering.length > 10, `${part.id} missing Level 3`);
      assert.equal(part.quizQuestion.options.length, 3, `${part.id} quiz must have 3 options`);
    }
  }
});
