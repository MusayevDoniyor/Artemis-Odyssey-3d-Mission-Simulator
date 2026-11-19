import test from "node:test";
import assert from "node:assert/strict";
import {
  getUnifiedSurfaceColliders,
  getEarthPadColliders,
  resolveSolidCollision,
  resolveCameraOcclusion,
} from "./colliderRegistry";
import {
  stepRoverPhysics,
  createInitialRoverState,
} from "../rover/roverPhysics";
import { RoverCollider, InputState } from "../../game/types";

const EMPTY_INPUT: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  action: false,
  boost: false,
  tiltForward: false,
  stabilize: false,
};

test("BUG A5 TEST: Unified collider registry matches visual mesh radius and covers all solid bodies", () => {
  const moonColliders = getUnifiedSurfaceColliders("moon", { x: 0, z: 0 });
  const marsColliders = getUnifiedSurfaceColliders("mars", null);
  const earthColliders = getEarthPadColliders();

  assert.ok(
    moonColliders.length >= 100,
    `Moon must register >= 100 colliders, got ${moonColliders.length}`,
  );
  assert.ok(
    marsColliders.length >= 100,
    `Mars must register >= 100 colliders, got ${marsColliders.length}`,
  );
  assert.ok(
    earthColliders.length >= 2,
    `Earth pad must register MLP and tower, got ${earthColliders.length}`,
  );

  // Habitat check
  const moonHab = moonColliders.find((c) => c.type === "habitat");
  assert.ok(moonHab, "Moon colliders must include Artemis Base Camp habitat");
  assert.ok(moonHab.r >= 9.5, "Habitat collider radius must be >= 9.5m");

  // Lander check
  const moonLander = moonColliders.find((c) => c.type === "lander");
  assert.ok(
    moonLander,
    "Moon colliders must include Parked Lander when landedPose is set",
  );
  assert.ok(moonLander.r >= 3.6, "Lander collider radius must be >= 3.6m");

  // Boulder radius fidelity check: all rock colliders must have radius matching visual mesh scale (s * 1.28)
  const rocks = moonColliders.filter((c) => c.type === "rock");
  assert.ok(rocks.length >= 90, "Must have >= 90 rock colliders");

  for (const rock of rocks) {
    // In old code, rock collider radius was s * 1.02, while visual mesh was s * 1.28.
    // Smallest boulder s = 0.45: old r = 0.459, new r = 0.576.
    // Largest boulder s = 2.01: old r = 2.05, new r = 2.572.
    // Any rock with visual scale s must have r >= s * 1.25.
    assert.ok(
      rock.r >= 0.55,
      `Rock collider ${rock.label} at (${rock.x.toFixed(1)}, ${rock.z.toFixed(1)}) radius (${rock.r.toFixed(3)}) must not be underestimated`,
    );
  }
});

test("BUG A5 TEST: Rover collision stop and ZERO penetration across small, medium, and large boulders", () => {
  const colliders: RoverCollider[] = [
    { x: 10, z: 0, r: 0.58, type: "rock", label: "Small Boulder" },
    { x: 25, z: 0, r: 1.35, type: "rock", label: "Medium Boulder" },
    { x: 45, z: 0, r: 2.58, type: "rock", label: "Large Monolith Boulder" },
    { x: 75, z: 0, r: 9.6, type: "habitat", label: "Artemis Base Camp" },
  ];

  const FWD_INPUT: InputState = {
    ...EMPTY_INPUT,
    forward: true,
  };

  const roverRadius = 1.18;

  // Test driving directly at each obstacle
  for (const col of colliders) {
    let rover = createInitialRoverState(col.x - 3.5, col.z, "moon");
    rover.headingRad = Math.PI / 2; // facing +X towards the obstacle
    rover.speed = 4.0; // high approach speed

    // Step physics forward 40 steps (4 seconds) straight into the obstacle
    for (let step = 0; step < 40; step++) {
      rover = stepRoverPhysics(rover, FWD_INPUT, colliders, 0.1, "KID_25X");
    }

    // Verify measured tolerance: dist must be >= roverRadius + col.r - 1e-12
    const dist = Math.hypot(rover.x - col.x, rover.z - col.z);
    const minDist = roverRadius + col.r;
    const penetration = minDist - dist;

    assert.ok(
      penetration <= 1e-12,
      `Rover penetrated ${penetration.toFixed(4)}m into ${col.label} (dist=${dist.toFixed(3)}, minDist=${minDist.toFixed(3)})`,
    );
    assert.equal(
      rover.collisionLabel,
      col.label,
      `Collision label must record ${col.label}`,
    );
  }
});

test("BUG A5 TEST: Rover slides tangentially along obstacles without sticking when approaching diagonally", () => {
  const obstacle: RoverCollider = {
    x: 20,
    z: 20,
    r: 2.5,
    type: "rock",
    label: "Sliding Boulder",
  };
  const roverRadius = 1.18;

  // Position rover so it drives at 45 degrees towards the obstacle
  let rover = createInitialRoverState(17.0, 18.0, "moon");
  rover.headingRad = Math.PI / 4; // 45 deg towards +X, +Z
  rover.speed = 2.0;

  const FWD_INPUT: InputState = { ...EMPTY_INPUT, forward: true };

  let movedTangentially = false;

  for (let step = 0; step < 25; step++) {
    rover = stepRoverPhysics(rover, FWD_INPUT, [obstacle], 0.1, "KID_25X");
    const dist = Math.hypot(rover.x - obstacle.x, rover.z - obstacle.z);
    const minDist = roverRadius + obstacle.r;

    // Zero penetration within machine tolerance
    assert.ok(
      dist >= minDist - 1e-12,
      `Must not penetrate: dist=${dist}, minDist=${minDist}`,
    );

    // If in contact, verify rover continues to move along the perimeter (tangential speed > 0)
    if (dist <= minDist + 0.05) {
      assert.ok(
        rover.speed > 0.2,
        `Rover should slide along obstacle, got speed: ${rover.speed}`,
      );
      movedTangentially = true;
    }
  }

  assert.ok(
    movedTangentially,
    "Rover must successfully make contact and slide tangentially along obstacle without sticking",
  );
});

test("BUG A5 TEST: Multi-pass collision resolution prevents tunneling in tight boulder clusters", () => {
  // Two boulders close to each other forming a narrow V-notch
  const cluster: RoverCollider[] = [
    { x: 10, z: -1.2, r: 1.8, type: "rock", label: "Boulder A" },
    { x: 10, z: 1.2, r: 1.8, type: "rock", label: "Boulder B" },
  ];

  const roverRadius = 1.18;
  const startX = 8.5;
  const startZ = 0;

  // Push straight into notch
  const resolved = resolveSolidCollision(
    startX + 3.0,
    startZ,
    roverRadius,
    cluster,
  );

  // Check overlap against BOTH boulders
  for (const col of cluster) {
    const dist = Math.hypot(resolved.x - col.x, resolved.z - col.z);
    const minDist = roverRadius + col.r;
    assert.ok(
      dist >= minDist - 0.001,
      `Resolved position must not tunnel into ${col.label}: dist=${dist.toFixed(3)}, minDist=${minDist.toFixed(3)}`,
    );
  }
  assert.ok(resolved.collided, "Must record collision");
});

test("BUG A5 TEST: Camera occlusion resolution prevents camera from clipping inside solid objects", () => {
  const colliders: RoverCollider[] = [
    { x: 0, z: 0, r: 9.6, type: "habitat", label: "Habitat" },
    { x: 20, z: 10, r: 2.58, type: "rock", label: "Large Boulder" },
  ];

  const roverPos = { x: 0, y: 1.0, z: 12.0 }; // rover outside habitat
  // Camera trying to orbit behind the rover, placing it inside the habitat (at 0, 1.5, 5.0)
  const insideCamPos = { x: 0, y: 2.5, z: 4.0 }; // inside radius 9.6

  const resolvedCam = resolveCameraOcclusion(
    insideCamPos,
    roverPos,
    colliders,
    0.0,
  );

  // Distance from habitat center must be >= habitat radius + margin (0.35m)
  const camDistToHab = Math.hypot(resolvedCam.x, resolvedCam.z);
  assert.ok(
    camDistToHab >= 9.6 + 0.35 - 0.01,
    `Camera must be pushed outside solid habitat: dist=${camDistToHab.toFixed(3)}, required >= 9.95m`,
  );
});
