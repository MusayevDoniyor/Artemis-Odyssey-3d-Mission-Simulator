import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createLaunchComplexAndSLS,
  createSaturnVShowcase,
  createFalcon9Showcase,
} from '../../three/models';
import type { ProceduralTextureSet } from '../../three/textures';
import type { RealPlanetMaps } from '../../three/planetMaps';

// Lightweight headless texture proxy
function createHeadlessTextureMock(): ProceduralTextureSet {
  const dummy = new THREE.Texture();
  return new Proxy({}, { get: () => dummy }) as unknown as ProceduralTextureSet;
}

function createHeadlessPlanetMapsMock(): RealPlanetMaps {
  const dummy = new THREE.Texture();
  return new Proxy({}, { get: () => dummy }) as unknown as RealPlanetMaps;
}

test('BUG A4 TEST: SLS RS-25 exhaust flame emanates directly from nozzle exit plane and gimbals coaxially', () => {
  const tex = createHeadlessTextureMock();
  const maps = createHeadlessPlanetMapsMock();
  const lc = createLaunchComplexAndSLS(tex, maps);

  // Compute world matrices
  lc.group.updateMatrixWorld(true);

  // Measure RS-25 nozzle exit planes vs exhaust flame bases
  assert.equal(lc.rs25EngineGroups.length, 4, 'Must have 4 RS-25 engine groups');

  for (let i = 0; i < lc.rs25EngineGroups.length; i++) {
    const eng = lc.rs25EngineGroups[i];

    // Find the engine bell cylinder in this engine group
    let bellMesh: THREE.Mesh | null = null;
    let flameEmitter: THREE.Object3D | null = null;

    eng.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry) {
        // Bell geometry has height 0.9 and radiusBottom 0.42
        const cyl = child.geometry as THREE.CylinderGeometry;
        if (cyl.parameters.height >= 0.8 && cyl.parameters.height <= 1.0) {
          bellMesh = child;
        }
      }
      if (child.name.includes('rs25-emitter') || child.userData.type === 'exhaustEmitter') {
        flameEmitter = child;
      }
    });

    assert.ok(bellMesh, `Engine ${i + 1} must have a valid bell mesh`);
    assert.ok(flameEmitter, `Engine ${i + 1} must have a dedicated exhaust flame emitter attached`);

    // In engine local space, bell center is at (0, -0.48, 0), height is 0.9.
    // Therefore exit plane is at y = -0.48 - 0.45 = -0.93.
    const bellWorldPos = new THREE.Vector3();
    (bellMesh as THREE.Mesh).getWorldPosition(bellWorldPos);
    const expectedExitWorldY = bellWorldPos.y - (0.9 / 2);

    const emitterWorldPos = new THREE.Vector3();
    (flameEmitter as THREE.Object3D).getWorldPosition(emitterWorldPos);

    // Assert vertical alignment within 0.05 units
    const distY = Math.abs(emitterWorldPos.y - expectedExitWorldY);
    assert.ok(
      distY < 0.05,
      `RS-25 engine ${i + 1} flame emitter base (${emitterWorldPos.y.toFixed(3)}) must match nozzle exit (${expectedExitWorldY.toFixed(3)}), diff was ${distY.toFixed(3)}`
    );

    // Assert radial XZ alignment with nozzle centerline
    const distXZ = Math.hypot(
      emitterWorldPos.x - bellWorldPos.x,
      emitterWorldPos.z - bellWorldPos.z
    );
    assert.ok(
      distXZ < 0.02,
      `RS-25 engine ${i + 1} flame emitter must be centered on nozzle axis, diff was ${distXZ.toFixed(3)}`
    );
  }

  // Verify Gimbal Coaxiality: when engine gimbals by 10 degrees, flame rotates identically with the nozzle
  const testEng = lc.rs25EngineGroups[0];
  const gimbalAngleRad = (10 * Math.PI) / 180;
  testEng.rotation.set(gimbalAngleRad, 0, gimbalAngleRad * 0.5);
  lc.group.updateMatrixWorld(true);

  let testEmitter: THREE.Object3D | null = null;
  testEng.traverse((child) => {
    if (child.name.includes('rs25-emitter') || child.userData.type === 'exhaustEmitter') {
      testEmitter = child;
    }
  });
  assert.ok(testEmitter, 'Must find test emitter for gimbal test');

  // World direction of nozzle axis vs world direction of flame axis
  const engWorldQuat = new THREE.Quaternion();
  testEng.getWorldQuaternion(engWorldQuat);
  const emitterWorldQuat = new THREE.Quaternion();
  (testEmitter as THREE.Object3D).getWorldQuaternion(emitterWorldQuat);

  const nozzleDown = new THREE.Vector3(0, -1, 0).applyQuaternion(engWorldQuat);
  const emitterDown = new THREE.Vector3(0, -1, 0).applyQuaternion(emitterWorldQuat);
  const dotAlignment = nozzleDown.dot(emitterDown);
  assert.ok(
    dotAlignment > 0.9999,
    `Gimbaled flame axis must remain collinear with nozzle axis, dot was ${dotAlignment}`
  );
});

test('BUG A4 TEST: SLS Solid Rocket Boosters have exhaust emitters attached at nozzle exit with staging cutoff', () => {
  const tex = createHeadlessTextureMock();
  const maps = createHeadlessPlanetMapsMock();
  const lc = createLaunchComplexAndSLS(tex, maps);
  lc.group.updateMatrixWorld(true);

  const srbs = [
    { name: 'left', group: lc.srbLeft, x: -1.55 },
    { name: 'right', group: lc.srbRight, x: 1.55 },
  ];

  for (const srb of srbs) {
    let srbNozzle: THREE.Mesh | null = null;
    let srbEmitter: THREE.Object3D | null = null;

    srb.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.CylinderGeometry) {
        const cyl = child.geometry as THREE.CylinderGeometry;
        if (cyl.parameters.height >= 0.5 && cyl.parameters.height <= 0.7) {
          srbNozzle = child;
        }
      }
      if (child.name.includes('srb-emitter') || child.userData.type === 'exhaustEmitter') {
        srbEmitter = child;
      }
    });

    assert.ok(srbNozzle, `SRB ${srb.name} must have a valid nozzle cylinder mesh`);
    assert.ok(srbEmitter, `SRB ${srb.name} must have an attached exhaust flame emitter`);

    const nozzleWorldPos = new THREE.Vector3();
    (srbNozzle as THREE.Mesh).getWorldPosition(nozzleWorldPos);
    // Cylinder height 0.62, centered at 0.32 in SRB space, exit is at y = 0.01
    const expectedExitY = nozzleWorldPos.y - (0.62 / 2);

    const emitterWorldPos = new THREE.Vector3();
    (srbEmitter as THREE.Object3D).getWorldPosition(emitterWorldPos);

    const diffY = Math.abs(emitterWorldPos.y - expectedExitY);
    assert.ok(
      diffY < 0.05,
      `SRB ${srb.name} emitter base (${emitterWorldPos.y.toFixed(3)}) must match nozzle exit (${expectedExitY.toFixed(3)}), diff was ${diffY.toFixed(3)}`
    );

    // When SRBs separate (move in space), the emitter moves with the SRB group
    srb.group.position.set(srb.x * 3, -10, 0);
    lc.group.updateMatrixWorld(true);

    const movedNozzleWorld = new THREE.Vector3();
    (srbNozzle as THREE.Mesh).getWorldPosition(movedNozzleWorld);
    const movedEmitterWorld = new THREE.Vector3();
    (srbEmitter as THREE.Object3D).getWorldPosition(movedEmitterWorld);

    assert.ok(
      Math.abs(movedEmitterWorld.y - (movedNozzleWorld.y - 0.31)) < 0.05,
      `SRB ${srb.name} flame emitter must stay physically attached to booster nozzle upon staging displacement`
    );
  }
});

test('BUG A4 TEST: Saturn V F-1 engine bells and Falcon 9 Merlin engine bells are correctly oriented with exit emitters', () => {
  const tex = createHeadlessTextureMock();
  const saturn = createSaturnVShowcase(tex);
  const falcon = createFalcon9Showcase(tex);

  saturn.group.updateMatrixWorld(true);
  falcon.group.updateMatrixWorld(true);

  // Saturn V F-1: 5 engine bells
  let f1Count = 0;
  saturn.group.traverse((child) => {
    if (child.name.includes('saturn-f1-emitter') || child.userData.type === 'f1Emitter') {
      f1Count++;
    }
  });
  assert.equal(f1Count, 5, 'Saturn V S-IC must have 5 dedicated F-1 exhaust emitters');

  // Falcon 9 Octaweb: 9 Merlin 1D engines
  let merlinCount = 0;
  falcon.group.traverse((child) => {
    if (child.name.includes('merlin-emitter') || child.userData.type === 'merlinEmitter') {
      merlinCount++;
    }
  });
  assert.equal(merlinCount, 9, 'Falcon 9 Stage 1 Octaweb must have 9 Merlin 1D exhaust emitters');
});
