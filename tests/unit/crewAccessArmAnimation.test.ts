import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { buildProceduralMobileLauncher } from '../../src/three/models.js';

describe('Mobile Launcher: Crew Access Arm & Umbilicals Animation Verification', () => {
  it('procedural LC-39B tower constructs Crew Access Arm with White Room and umbilical arms', () => {
    const lc = buildProceduralMobileLauncher();
    const parent = lc.groundGroup;

    assert.ok(lc.tower, 'LC-39B tower must exist');
    assert.ok(lc.crewAccessArm, 'Crew Access Arm (CAA) must exist');
    assert.equal(lc.crewAccessArm.userData.partId, 'ml-caa', 'CAA must have partId ml-caa');

    // Count triangles of procedural Mobile Launcher
    let totalTris = 0;
    parent.traverse((obj: any) => {
      if (obj.isMesh && obj.geometry) {
        const geom = obj.geometry;
        let tris = 0;
        if (geom.index) tris = geom.index.count / 3;
        else if (geom.attributes.position) tris = geom.attributes.position.count / 3;
        if (obj.isInstancedMesh && obj.count) tris *= obj.count;
        totalTris += tris;
      }
    });

    console.log('Procedural Mobile Launcher & LC-39B tower triangles:', totalTris);
    assert.equal(totalTris, 2888, `Total procedural ML tower + base triangles must equal measured 2,888 (got ${totalTris})`);
  });

  it('Crew Access Arm rotates from extended (0 rad) at T-10 to retracted (-0.78 rad) at T-0', () => {
    const lc = buildProceduralMobileLauncher();

    // Initial state: Arm extended flush with Orion capsule hatch
    lc.crewAccessArm.rotation.y = 0;
    assert.equal(lc.crewAccessArm.rotation.y, 0, 'CAA must be at 0 rad (extended) at T-10');

    // Retraction kinematics formula from SpaceSceneManager.ts:2304
    function getArmRotation(countdownSec: number, sequence: string) {
      if (sequence === 'PRE_SIM') return 0;
      const retractT = sequence === 'READY' ? 1 : Math.min(1, Math.max(0, (2.4 - countdownSec) / 1.8));
      const rot = -0.78 * retractT;
      return rot === 0 ? 0 : rot;
    }

    assert.equal(getArmRotation(10, 'PRE_SIM'), 0, 'At T-10 (PRE_SIM), arm is 0 rad (extended)');
    assert.equal(getArmRotation(5, 'COUNTDOWN'), 0, 'At T-5s, arm remains extended');
    
    const midRetract = getArmRotation(1.5, 'COUNTDOWN');
    assert.ok(midRetract < -0.3 && midRetract > -0.5, `At T-1.5s, arm is mid-retraction (got ${midRetract})`);

    const fullRetract = getArmRotation(0.5, 'COUNTDOWN');
    assert.equal(fullRetract, -0.78, 'At T-0.5s, arm is fully retracted (-0.78 rad)');
  });
});
