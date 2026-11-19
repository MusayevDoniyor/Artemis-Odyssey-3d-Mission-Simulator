import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialRoverState, stepRoverPhysics } from '../rover/roverPhysics';
import { createInitialLandingState, stepLandingPhysics, evaluateTouchdown } from '../landing/landingPhysics';
import { getSurfaceTerrainHeight } from '../common/math';
import { computeRoverDisplaySpeed } from '../../game/sequences';
import type { InputState } from '../../game/types';

const DRIVE_FWD: Pick<InputState, 'forward' | 'backward' | 'left' | 'right'> = {
  forward: true,
  backward: false,
  left: false,
  right: false,
};

describe('PHASE 7: Planetary Surfaces, Touchdown Telemetry & Rover Kinematics (Fixes B3)', () => {
  it('Fixes B3: stepRoverPhysics scales physical motion displacement with speedScale', () => {
    let roverReal = createInitialRoverState(6, 6, 'moon');
    let roverKid = createInitialRoverState(6, 6, 'moon');

    // Drive both rovers for 1.0 second (20 steps of 0.05s)
    const dt = 0.05;
    for (let i = 0; i < 20; i++) {
      roverReal = stepRoverPhysics(roverReal, DRIVE_FWD, [], dt, 'REAL_SPEED');
      roverKid = stepRoverPhysics(roverKid, DRIVE_FWD, [], dt, 'KID_25X');
    }

    const distReal = Math.hypot(roverReal.x - 6, roverReal.z - 6);
    const distKid = Math.hypot(roverKid.x - 6, roverKid.z - 6);

    // Rover in REAL_SPEED moves at authentic scientific speed (~0.18 m/s rate)
    assert.ok(roverReal.speed <= 0.30, `REAL_SPEED rover speed should be <= 0.30 m/s, got ${roverReal.speed}`);
    assert.ok(distReal <= 0.25, `REAL_SPEED displacement should be <= 0.25m, got ${distReal}`);

    // Rover in KID_25X moves with 25x time compression
    assert.ok(roverKid.speed >= 5.0, `KID_25X rover speed should be >= 5.0 m/s, got ${roverKid.speed}`);
    assert.ok(distKid >= 2.5, `KID_25X displacement should be >= 2.5m, got ${distKid}`);

    // Verify displacement ratio reflects the authentic VIPER reduction factor (~73x slower than unscaled game speed)
    const ratio = distKid / distReal;
    assert.ok(ratio >= 50 && ratio <= 85, `Displacement ratio should reflect VIPER rate factor, got ${ratio.toFixed(2)}x`);

    // Verify telemetry formatting reflects both modes
    const displayReal = computeRoverDisplaySpeed(roverReal.speed, 'REAL_SPEED');
    const displayKid = computeRoverDisplaySpeed(roverKid.speed, 'KID_25X');
    assert.strictEqual(displayReal.scaleLabel, 'REAL VIPER RATE (1×)');
    assert.strictEqual(displayKid.scaleLabel, 'KID EXPLORE (TIME ×25)');
    assert.ok(displayReal.displayMs <= 0.22);
    assert.ok(displayKid.displayMs >= 5.0);
  });

  it('Verifies kinematics consistency: distance travelled equals speed * time', () => {
    let rover = createInitialRoverState(0, 0, 'moon');
    const dt = 0.05;
    // Accelerate to steady cruise
    for (let i = 0; i < 30; i++) {
      rover = stepRoverPhysics(rover, DRIVE_FWD, [], dt, 'REAL_SPEED');
    }

    const prevX = rover.x;
    const prevZ = rover.z;
    const cruiseSpeed = rover.speed;

    // Single step displacement check
    rover = stepRoverPhysics(rover, DRIVE_FWD, [], dt, 'REAL_SPEED');
    const actualStepDist = Math.hypot(rover.x - prevX, rover.z - prevZ);
    const expectedStepDist = cruiseSpeed * dt;

    // Must match v * dt within numerical rounding
    assert.ok(
      Math.abs(actualStepDist - expectedStepDist) < 0.015,
      `Step displacement (${actualStepDist}) must equal v * dt (${expectedStepDist})`
    );
  });

  it('Fixes landing 0.0 m/s crash bug: latches true non-zero impact speed and tilt upon crash', () => {
    let lander = createInitialLandingState(1.0, 'moon', 0);
    const groundH = getSurfaceTerrainHeight(lander.planet, lander.x, lander.z);
    // Position 0.15m above surface with excessive sink rate (6.5 m/s) and 14 deg tilt
    lander.y = groundH + 0.15;
    lander.vy = -6.5;
    lander.vx = 1.2;
    lander.pitchDeg = 14.0;
    lander.tiltDeg = 14.0;

    const idleInput: InputState = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      action: false,
      boost: false,
      tiltForward: false,
      stabilize: false,
    };

    // Step physics to ground touchdown
    lander = stepLandingPhysics(lander, idleInput, 0.05, false);

    assert.strictEqual(lander.landed, true);
    assert.strictEqual(lander.result, 'crash');

    // Operational velocities zero out upon crash
    assert.strictEqual(lander.vy, 0);
    assert.strictEqual(lander.vx, 0);

    // But latched impact metrics must record the TRUE impact values (never 0.0 m/s!)
    assert.ok(lander.impactVy !== undefined && lander.impactVy >= 6.0, `impactVy must be >= 6.0, got ${lander.impactVy}`);
    assert.ok(
      lander.impactSpeedMs !== undefined && lander.impactSpeedMs >= 6.0,
      `impactSpeedMs must be >= 6.0, got ${lander.impactSpeedMs}`
    );
    assert.ok(
      lander.impactTiltDeg !== undefined && Math.abs(lander.impactTiltDeg - 10.36) < 0.1,
      `impactTiltDeg must record actual tilt at touchdown, got ${lander.impactTiltDeg}`
    );
  });

  it('Evaluates touchdown safety envelope accurately across soft, firm, and crash boundaries', () => {
    // Soft nominal touchdown (vy <= 2.5, horiz <= 2.4, tilt <= 12)
    assert.strictEqual(evaluateTouchdown(1.2, 0.4, 4.0, 0), 'perfect');

    // Firm acceptable touchdown (2.5 < vy <= 4.8, or 12 < tilt <= 24)
    assert.strictEqual(evaluateTouchdown(3.2, 0.9, 9.5, 0), 'hard');
    assert.strictEqual(evaluateTouchdown(1.0, 0.3, 16.5, 0), 'hard');

    // Crash: high sink rate (> 4.8 m/s)
    assert.strictEqual(evaluateTouchdown(5.4, 0.4, 4.0, 0), 'crash');

    // Crash: excessive tilt angle (> 24 deg)
    assert.strictEqual(evaluateTouchdown(1.0, 0.3, 26.5, 0), 'crash');

    // Crash: steep slope (> 20 deg)
    assert.strictEqual(evaluateTouchdown(1.0, 0.3, 4.0, 22.0), 'crash');
  });

  it('Verifies real elevation features for Moon Shackleton and Mars Jezero', () => {
    // Pad center (x=0, z=0) must be smooth and flat (elevation 0)
    assert.strictEqual(getSurfaceTerrainHeight('moon', 0, 0), 0);
    assert.strictEqual(getSurfaceTerrainHeight('mars', 0, 0), 0);

    // Moon Shackleton cold trap crater at (128, -142) is a deep depression
    const shackletonFloor = getSurfaceTerrainHeight('moon', 128, -142);
    assert.ok(shackletonFloor < -2.0, `Shackleton floor should be < -2.0m, got ${shackletonFloor}`);

    // Mars Jezero delta fan terraces at (126, -134) is an elevated deposit
    const jezeroDelta = getSurfaceTerrainHeight('mars', 126, -134);
    assert.ok(jezeroDelta > 2.0, `Jezero delta should be > 2.0m, got ${jezeroDelta}`);

    // Mars Máaz basalt ridge at (-148, -96) is an elevated volcanic ridge
    const maazRidge = getSurfaceTerrainHeight('mars', -148, -96);
    assert.ok(maazRidge > 3.0, `Máaz ridge should be > 3.0m, got ${maazRidge}`);
  });

  it('Rover suspension adapts wheel offsets dynamically across uneven terrain', () => {
    let rover = createInitialRoverState(120, -130, 'mars'); // Near Jezero delta slopes
    rover = stepRoverPhysics(rover, DRIVE_FWD, [], 0.05, 'KID_25X');

    // 4 wheels must have non-zero terrain-following offsets on slopes
    assert.strictEqual(rover.wheelOffsets.length, 4);
    const hasDifferentialOffsets =
      rover.wheelOffsets[0] !== rover.wheelOffsets[2] ||
      rover.wheelOffsets[1] !== rover.wheelOffsets[3];
    assert.ok(hasDifferentialOffsets, 'Rocker-bogie suspension should differentiate wheel heights on slopes');
  });
});
