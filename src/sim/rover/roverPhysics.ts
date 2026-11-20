import { PHYSICS } from '../../game/constants';
import type { InputState, RoverCollider, RoverState, SurfacePlanet, TelemetrySpeedScale } from '../../game/types';
import { clamp, getSurfaceTerrainHeight } from '../common/math';
import { resolveSolidCollision } from '../collision/colliderRegistry';

export function createInitialRoverState(
  startX = 6,
  startZ = 6,
  planet: SurfacePlanet = 'moon'
): RoverState {
  return {
    planet,
    x: startX,
    y: getSurfaceTerrainHeight(planet, startX, startZ),
    z: startZ,
    headingRad: 0,
    speed: 0,
    steerAngleRad: 0,
    pitchRad: 0,
    rollRad: 0,
    wheelAngle: 0,
    walkPhase: 0,
    wheelOffsets: [0, 0, 0, 0],
    driveMode: 'DRIVE',
    highClearance: false,
    headlightsOn: true,
    wheelSlipPct: 0,
    hydrogenSignal: 18,
    dustAccumulationPct: planet === 'mars' ? 8 : 0,
    collisionLabel: '',
  };
}

export function stepRoverPhysics(
  state: RoverState,
  input: Pick<InputState, 'forward' | 'backward' | 'left' | 'right'>,
  colliders: RoverCollider[],
  rawDt: number,
  speedScale: TelemetrySpeedScale = 'KID_25X'
): RoverState {
  const dt = Math.min(rawDt, 0.05);
  const r: RoverState = {
    ...state,
    wheelOffsets: [...state.wheelOffsets] as [number, number, number, number],
  };

  const gravity = r.planet === 'mars' ? PHYSICS.MARS_GRAVITY : PHYSICS.MOON_GRAVITY;
  const fwdX = Math.sin(r.headingRad);
  const fwdZ = Math.cos(r.headingRad);
  const rightX = Math.cos(r.headingRad);
  const rightZ = -Math.sin(r.headingRad);

  // Speed scale factor (Bug B3 resolution): REAL_SPEED is authentic real-time rate (~0.18 m/s max)
  // KID_25X is 25x time-compressed exploration speed (~4.5 - 6.8 m/s max)
  const speedScaleFactor = speedScale === 'REAL_SPEED' ? (0.18 / PHYSICS.ROVER_MAX_SPEED) : 1.0;

  const isWalker = r.driveMode === 'WALKER';
  const maxSpeed = (isWalker ? PHYSICS.ROVER_WALKER_SPEED : PHYSICS.ROVER_MAX_SPEED) * speedScaleFactor;
  const baseAccel = PHYSICS.ROVER_ACCEL * speedScaleFactor;
  const slopeGravity = Math.sin(r.pitchRad) * gravity * 0.42 * speedScaleFactor;

  if (r.driveMode === 'SPIN') {
    r.speed *= Math.max(0, 1 - 6 * dt);
    const spinDir = input.left ? 1 : input.right ? -1 : input.forward ? 1 : input.backward ? -1 : 0;
    const spinRate = PHYSICS.ROVER_TURN_RATE * 1.45 * (speedScale === 'REAL_SPEED' ? 0.35 : 1.0);
    r.headingRad += spinDir * spinRate * dt;
    r.wheelAngle += spinDir * dt * 3.4 * (speedScale === 'REAL_SPEED' ? 0.35 : 1.0);
  } else {
    if (input.forward) {
      r.speed = Math.min(maxSpeed, r.speed + (baseAccel + slopeGravity) * dt);
    } else if (input.backward) {
      r.speed = Math.max(-maxSpeed * 0.55, r.speed - (baseAccel * 1.4 - slopeGravity) * dt);
    } else {
      r.speed *= Math.max(0, 1 - 2.6 * dt);
      if (Math.abs(r.speed) < 0.001) r.speed = 0;
    }
  }

  if (isWalker && (input.forward || input.backward || Math.abs(r.speed) > 0.15)) {
    r.walkPhase += dt * 7.2;
  }

  const targetSteer = input.left ? 0.52 : input.right ? -0.52 : 0;
  r.steerAngleRad += (targetSteer - r.steerAngleRad) * Math.min(1, 10 * dt);

  let vx = 0;
  let vz = 0;
  if (r.driveMode === 'CRAB') {
    const crabHeading = r.headingRad - r.steerAngleRad * 1.15;
    vx = Math.sin(crabHeading) * r.speed;
    vz = Math.cos(crabHeading) * r.speed;
  } else if (r.driveMode !== 'SPIN') {
    const ackermannYaw = (r.speed * Math.tan(r.steerAngleRad)) / PHYSICS.ROVER_WHEELBASE;
    const steerInputDir = input.left ? 1 : input.right ? -1 : 0;
    const lowSpeedPivot =
      steerInputDir *
      PHYSICS.ROVER_TURN_RATE *
      (Math.abs(r.speed) < 1.2 ? 0.92 : 0.28);
    const yawRate =
      Math.abs(ackermannYaw) >= Math.abs(lowSpeedPivot)
        ? ackermannYaw
        : ackermannYaw * 0.4 + lowSpeedPivot;
    r.headingRad += yawRate * dt;
    vx = Math.sin(r.headingRad) * r.speed;
    vz = Math.cos(r.headingRad) * r.speed;
  }

  let nextX = r.x + vx * dt;
  let nextZ = r.z + vz * dt;

  const roverRadius = isWalker ? 0.95 : 1.18;
  const resolution = resolveSolidCollision(nextX, nextZ, roverRadius, colliders, isWalker);
  nextX = resolution.x;
  nextZ = resolution.z;
  const collisionLabel = resolution.label;

  if (resolution.collided) {
    const pushDx = nextX - (r.x + vx * dt);
    const pushDz = nextZ - (r.z + vz * dt);
    const pushDist = Math.hypot(pushDx, pushDz);
    if (pushDist > 0.0001) {
      const nx = pushDx / pushDist;
      const nz = pushDz / pushDist;
      const dot = vx * nx + vz * nz;
      if (dot < 0) {
        vx -= dot * nx;
        vz -= dot * nz;
        const slideSpeed = Math.hypot(vx, vz);
        r.speed = slideSpeed;
        if (slideSpeed > 0.25) {
          const slideHeading = Math.atan2(vx, vz);
          let headingDiff = slideHeading - r.headingRad;
          while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
          while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
          // Only allow alignment for glancing/diagonal sliding; never spinout on steep or head-on impacts
          if (Math.abs(headingDiff) <= 1.45) {
            r.headingRad += clamp(headingDiff, -14 * dt, 14 * dt);
          }
        } else if (slideSpeed < 0.08) {
          // At near-zero tangential speed (head-on stall), stop cleanly without jitter spinout
          r.speed = 0;
        }
      }
    } else {
      r.speed = 0;
    }
  }

  r.collisionLabel = collisionLabel;
  const bound = PHYSICS.SURFACE_BOUND_M;
  r.x = clamp(nextX, -bound, bound);
  r.z = clamp(nextZ, -bound, bound);

  const centerGround = getSurfaceTerrainHeight(r.planet, r.x, r.z);
  r.y = centerGround;

  const wheelCoords: [number, number][] = [
    [-0.78, 0.95],
    [0.78, 0.95],
    [-0.78, -0.95],
    [0.78, -0.95],
  ];
  const wheelGrounds = wheelCoords.map(([lx, lz]) => {
    const wx = r.x + rightX * lx + fwdX * lz;
    const wz = r.z + rightZ * lx + fwdZ * lz;
    return getSurfaceTerrainHeight(r.planet, wx, wz);
  });

  const avgFront = (wheelGrounds[0] + wheelGrounds[1]) * 0.5;
  const avgRear = (wheelGrounds[2] + wheelGrounds[3]) * 0.5;
  const avgLeft = (wheelGrounds[0] + wheelGrounds[2]) * 0.5;
  const avgRight = (wheelGrounds[1] + wheelGrounds[3]) * 0.5;

  const targetPitch = -Math.atan2(avgFront - avgRear, 1.9);
  const targetRoll = Math.atan2(avgLeft - avgRight, 1.56);
  r.pitchRad += (targetPitch - r.pitchRad) * Math.min(1, 10 * dt);
  r.rollRad += (targetRoll - r.rollRad) * Math.min(1, 10 * dt);

  if (r.driveMode !== 'SPIN') {
    r.wheelAngle += (r.speed * dt) / 0.25;
  }

  const diagonalPhases = [0, Math.PI, Math.PI, 0];
  for (let i = 0; i < 4; i++) {
    const terrainFollow = clamp(wheelGrounds[i] - centerGround, -0.22, 0.28);
    const stepLift = isWalker
      ? Math.max(0, Math.sin(r.walkPhase + diagonalPhases[i])) * 0.28
      : 0;
    r.wheelOffsets[i] = terrainFollow + stepLift;
  }

  if (r.planet === 'mars') {
    // Signal tracks organic/clay delta & carbonate shelves; high wind near Máaz clears dust
    const distDelta = Math.hypot(r.x - 126, r.z + 134);
    const distCarb = Math.hypot(r.x - 112, r.z - 142);
    const nearestSig = Math.min(distDelta, distCarb);
    r.hydrogenSignal = Math.round(Math.max(14, 220 * Math.exp(-nearestSig / 52)));

    const dMaaz = Math.hypot(r.x + 148, r.z + 96);
    if (dMaaz < 34) {
      r.dustAccumulationPct = clamp(r.dustAccumulationPct - 6.5 * dt, 2, 65);
    } else if (Math.abs(r.speed) > 0.5) {
      r.dustAccumulationPct = clamp(r.dustAccumulationPct + 0.42 * dt, 2, 65);
    }
  } else {
    const distShack = Math.hypot(r.x - 128, r.z + 142);
    const distCabeus = Math.hypot(r.x + 124, r.z - 152);
    const nearestIce = Math.min(distShack, distCabeus);
    r.hydrogenSignal = Math.round(Math.max(12, 240 * Math.exp(-nearestIce / 52)));
    r.dustAccumulationPct = 0;
  }

  const slopeRatio = Math.abs(Math.sin(r.pitchRad)) + Math.abs(Math.sin(r.rollRad));
  const gravSlipFactor = r.planet === 'mars' ? 0.88 : 1.0;
  r.wheelSlipPct = isWalker
    ? Math.min(12, Math.round(slopeRatio * 18 * gravSlipFactor))
    : Math.min(44, Math.round((slopeRatio * 48 + Math.abs(r.speed) * 1.35) * gravSlipFactor));

  return r;
}
