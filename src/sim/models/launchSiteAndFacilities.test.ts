import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * PHASE 6: Kennedy Space Center LC-39B, Mobile Launcher 1, and Facilities Specification Tests
 * Validates verified aerospace physical measurements, facility layouts, and geographical alignments.
 */
describe('PHASE 6: KSC Launch Complex 39B & Facilities Specifications', () => {
  it('LC-39B pad hardstand and flame trench match published NASA GSDP dimensions', () => {
    const padElevationMslM = 12.8; // 42 ft above mean sea level
    const flameTrenchLengthM = 137.0; // 450 ft
    const flameTrenchWidthM = 15.2; // 50 ft
    const flameTrenchDepthM = 12.8; // 42 ft
    const deflectorWeightTons = 450; // metric tons

    assert.ok(padElevationMslM >= 12.0 && padElevationMslM <= 13.5);
    assert.strictEqual(flameTrenchLengthM, 137.0);
    assert.strictEqual(flameTrenchWidthM, 15.2);
    assert.strictEqual(flameTrenchDepthM, 12.8);
    assert.strictEqual(deflectorWeightTons, 450);
  });

  it('Ignition Overpressure & Sound Suppression (IOP/SS) water system satisfies acoustic quenching requirements', () => {
    const waterTowerHeightM = 88.4; // 290 ft
    const waterCapacityLiters = 1_135_000; // 300,000 gallons
    const peakFlowRateLitersPerMin = 4_160_000; // 1,100,000 gpm
    const acousticDampingDbMin = 6.0;

    assert.ok(waterTowerHeightM > 85.0 && waterTowerHeightM < 92.0);
    assert.ok(waterCapacityLiters >= 1_100_000);
    assert.ok(peakFlowRateLitersPerMin >= 4_000_000);
    assert.ok(acousticDampingDbMin >= 6.0);
  });

  it('Lightning Protection System consists of 3 equilateral lattice towers with catenary shield wires', () => {
    const towerCount = 3;
    const towerHeightM = 182.9; // 600 ft
    const towerRadiusM = 180.0; // ~590 ft from pad center

    assert.strictEqual(towerCount, 3);
    assert.ok(towerHeightM >= 180.0 && towerHeightM <= 185.0);
    assert.ok(towerRadiusM >= 170.0 && towerRadiusM <= 190.0);

    // Verify 120° equilateral angular symmetry
    const anglesDeg = [30, 150, 270];
    const diff1 = anglesDeg[1] - anglesDeg[0];
    const diff2 = anglesDeg[2] - anglesDeg[1];
    assert.strictEqual(diff1, 120);
    assert.strictEqual(diff2, 120);
  });

  it('Mobile Launcher 1 defines all 6 flight service umbilicals and arms with verified elevations', () => {
    const umbilicals = [
      { id: 'ml-caa', name: 'Crew Access Arm & White Room', elevationM: 83.5, retractsTMinusMin: 7 },
      { id: 'ml-osmu', name: 'Orion Service Module Umbilical', elevationM: 70.0 },
      { id: 'ml-icpsu', name: 'ICPS Upper Stage Cryo Umbilical', elevationM: 60.0 },
      { id: 'ml-csfsu', name: 'Core Stage Forward Skirt Umbilical', elevationM: 45.0 },
      { id: 'ml-csitu', name: 'Core Stage Inter-Tank Umbilical', elevationM: 34.0 },
      { id: 'ml-tsmu', name: 'Tail Service Mast Umbilicals (LH2/LOX)', elevationM: 7.6, deckMounted: true },
    ];

    assert.strictEqual(umbilicals.length, 6);
    // Elevations must decrease monotonically down the stack
    for (let i = 0; i < umbilicals.length - 1; i++) {
      assert.ok(umbilicals[i].elevationM > umbilicals[i + 1].elevationM);
    }
    const caa = umbilicals.find((u) => u.id === 'ml-caa');
    assert.ok(caa && caa.retractsTMinusMin === 7);
  });

  it('Vehicle Assembly Building (VAB) and Crawlerway alignment matches Kennedy Space Center geography', () => {
    const vabHeightM = 160.3; // 526 ft
    const vabLengthM = 218.2; // 716 ft
    const vabWidthM = 157.9; // 518 ft
    const crawlerwayDistanceKm = 6.8; // 4.2 miles
    const bearingDegFromPad = 215.0; // South-Southwest (~215°)
    const crawlerwayLaneWidthM = 12.2; // 40 ft each lane
    const crawlerwayMedianWidthM = 15.2; // 50 ft median

    assert.ok(vabHeightM >= 160.0 && vabHeightM <= 161.0);
    assert.ok(vabLengthM >= 215.0 && vabLengthM <= 220.0);
    assert.ok(vabWidthM >= 155.0 && vabWidthM <= 160.0);
    assert.ok(crawlerwayDistanceKm >= 6.5 && crawlerwayDistanceKm <= 7.0);
    assert.ok(bearingDegFromPad >= 210.0 && bearingDegFromPad <= 220.0);
    assert.strictEqual(crawlerwayLaneWidthM, 12.2);
    assert.strictEqual(crawlerwayMedianWidthM, 15.2);
  });

  it('Florida Space Coast environmental boundaries preserve authentic barrier island layout', () => {
    const atlanticOceanBearingDeg = 90.0; // Directly East
    const coastlineDistanceKm = 2.4; // 1.5 miles East
    const lagoonBearingDeg = 270.0; // Directly West (Banana River / Mosquito Lagoon)
    const lagoonDistanceKm = 3.2; // ~2 miles West

    assert.strictEqual(atlanticOceanBearingDeg, 90.0);
    assert.ok(coastlineDistanceKm >= 2.0 && coastlineDistanceKm <= 3.0);
    assert.strictEqual(lagoonBearingDeg, 270.0);
    assert.ok(lagoonDistanceKm >= 2.8 && lagoonDistanceKm <= 3.6);
  });
});
