import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { stepRoverPhysics, createInitialRoverState } from '../../src/sim/rover/roverPhysics';
import type { InputState, RoverCollider } from '../../src/game/types';

test('COCKPIT FPV, EARTH ORBIT FRAMING, SATELLITE SCALE & ROVER COLLISION VERIFICATION', async (t) => {
  await t.test('1. Rover boulder collision maintains driver heading and does NOT force spinout', () => {
    const rover = createInitialRoverState(0, 0, 'moon');
    rover.headingRad = 0; // pointed +Z
    rover.speed = 1.0;

    // Place a boulder directly ahead at z = 1.0
    const rockCollider: RoverCollider = {
      x: 0,
      z: 1.0,
      r: 0.8,
      type: 'rock',
      label: 'Impact Boulder',
    };

    const forwardInput: InputState = {
      forward: true,
      backward: false,
      left: false,
      right: false,
      action: false,
      boost: false,
      tiltForward: false,
      stabilize: false,
    };

    // Step physics forward into the boulder
    const out = stepRoverPhysics(rover, forwardInput, [rockCollider], 0.05, 'KID_25X');

    // Heading must remain controlled by driver (headingRad = 0), not snapped to tangent or spun around!
    assert.equal(out.headingRad, 0, `Rover heading must not snap upon rock collision, got ${out.headingRad}`);
    // Collision must be registered
    assert.equal(out.collisionLabel, 'Impact Boulder');
    // Speed must stop cleanly on head-on collision
    assert.equal(out.speed, 0, 'Speed must stop cleanly on head-on boulder collision');
  });

  await t.test('2. SpaceSceneManager evaluates Cockpit mode before userOrbitActive and hides exterior hull', () => {
    const ssmSrc = fs.readFileSync(path.resolve('src/three/SpaceSceneManager.ts'), 'utf-8').replace(/\r\n/g, '\n');
    const cockpitIdx = ssmSrc.indexOf('spaceCamMode === "cockpit"');
    const orbitCamIdx = ssmSrc.indexOf('spaceCamMode === "orbit"');

    assert.ok(cockpitIdx > 0, 'SpaceSceneManager must handle spaceCamMode === "cockpit"');
    assert.ok(orbitCamIdx > 0, 'SpaceSceneManager must handle spaceCamMode === "orbit"');
    assert.ok(
      cockpitIdx < orbitCamIdx,
      'spaceCamMode === "cockpit" must be evaluated BEFORE orbit camera so mouse drag does not cancel FPV'
    );
    assert.ok(
      ssmSrc.includes('ss.shipGroup.visible = false'),
      'SpaceSceneManager must hide exterior ship hull during cockpit FPV to avoid polygon clipping'
    );
  });

  await t.test('3. Satellite scale is properly proportioned and loads NASA TDRS model', () => {
    const ssmSrc = fs.readFileSync(path.resolve('src/three/SpaceSceneManager.ts'), 'utf-8');
    assert.ok(
      ssmSrc.includes('ss.satellite.group.scale.setScalar(targetSatScale)'),
      'SpaceSceneManager must scale satellite to targetSatScale'
    );
    assert.ok(
      ssmSrc.includes('targetSatScale = isSci ? 0.008 : isLocal ? 0.024 : 0.035'),
      'Satellite scale in exploration mode must be 0.035, matching realistic proportions'
    );

    const modelsSrc = fs.readFileSync(path.resolve('src/three/models.ts'), 'utf-8');
    assert.ok(
      modelsSrc.includes('/assets/crafts/tdrs.glb'),
      'models.ts must load official NASA TDRS 3D model in createOrbitalSatellite'
    );
  });

  await t.test('4. Earth orbit framing maintains prominent Earth globe visibility in track mode', () => {
    const ssmSrc = fs.readFileSync(path.resolve('src/three/SpaceSceneManager.ts'), 'utf-8');
    assert.ok(
      ssmSrc.includes('inEarthOrbit = distToEarth < earthVisR * 3.5'),
      'SpaceSceneManager must detect inEarthOrbit'
    );
    assert.ok(
      ssmSrc.includes('shipCamSpaceX - fwdX * chBack + radOutX * chOut'),
      'SpaceSceneManager must offset camera radially outward to frame Earth curve'
    );
  });

  await t.test('5. App.tsx resets userOrbitActive and orientation upon switching to cockpit mode', () => {
    const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8').replace(/\r\n/g, '\n');
    assert.ok(
      appSrc.includes('mode === "cockpit"'),
      'App.tsx handleChangeSpaceCameraMode must handle cockpit mode explicitly'
    );
    assert.ok(
      appSrc.includes('s.userOrbitActive = false;\n        s.orbitYaw = 0;\n        s.orbitPitch = 0'),
      'App.tsx must reset userOrbitActive and orientation to forward viewport for cockpit mode'
    );
  });
});
