import { PHYSICS, getPlanetObjectives } from './constants';
import { clamp, getSurfaceTerrainHeight } from './physics';
import { GLOSSARY_ENTRIES } from './factsAndGlossary';
import type {
  AnomalyChoice,
  InputState,
  MarsCommand,
  MarsQueueState,
  RoverCollider,
  RoverObjective,
  RoverState,
  SurfacePlanet,
} from './types';

export function createInitialMarsQueueState(delayMin = 14): MarsQueueState {
  return {
    phase: 'IDLE',
    queue: [],
    activeIndex: 0,
    txRemainingSec: 0,
    txTotalSec: 1.2,
    realDelayMin: delayMin,
    statusMessage: 'Click map, target badge, or Auto-Drive to navigate.',
    plannedPath: [],
    avoidingObstacleLabel: null,
    repathTimerSec: 0,
    stuckTimerSec: 0,
    reverseEscapeSec: 0,
    lastProgressDist: undefined,
    lastPlannedGoalKey: undefined,
  };
}

/** Snaps coordinates near a known Moon or Mars objective on the active planet to its exact center so arrival always triggers inRange (<6.8m) */
function resolveObjectiveSnap(
  x: number,
  z: number,
  planet: SurfacePlanet,
  explicitObjectiveId?: string
): { x: number; z: number; objectiveId?: string; snappedLabel?: string } {
  const planetObjs = getPlanetObjectives(planet);
  const allObjs = [...planetObjs, ...getPlanetObjectives(planet === 'mars' ? 'moon' : 'mars')];
  if (explicitObjectiveId) {
    const exact = allObjs.find((o) => o.id === explicitObjectiveId);
    if (exact) {
      return { x: exact.x, z: exact.z, objectiveId: exact.id, snappedLabel: exact.siteName };
    }
    return { x, z, objectiveId: explicitObjectiveId };
  }

  let bestObj: RoverObjective | null = null;
  let bestDist = 10.5;
  for (let i = 0; i < planetObjs.length; i++) {
    const obj = planetObjs[i];
    const d = Math.hypot(obj.x - x, obj.z - z);
    if (d <= bestDist) {
      bestDist = d;
      bestObj = obj;
    }
  }
  if (bestObj) {
    return { x: bestObj.x, z: bestObj.z, objectiveId: bestObj.id, snappedLabel: bestObj.siteName };
  }
  return { x, z };
}

export function enqueueMarsWaypoint(
  state: MarsQueueState,
  x: number,
  z: number,
  label: string,
  objectiveId?: string,
  planet?: SurfacePlanet
): MarsQueueState {
  if (state.phase !== 'IDLE') return state;
  const activePlanet: SurfacePlanet = planet ?? (state.realDelayMin > 0 ? 'mars' : 'moon');
  const clampedX = clamp(x, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
  const clampedZ = clamp(z, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
  const snapped = resolveObjectiveSnap(clampedX, clampedZ, activePlanet, objectiveId);
  const finalX = Math.round(snapped.x * 10) / 10;
  const finalZ = Math.round(snapped.z * 10) / 10;
  const finalObjId = snapped.objectiveId;

  const cmd: MarsCommand = {
    id: `cmd-${Date.now()}-${state.queue.length}`,
    type: finalObjId ? 'DRILL' : 'DRIVE_TO',
    x: finalX,
    z: finalZ,
    label: snapped.snappedLabel || label,
    objectiveId: finalObjId,
  };
  const nextQueue = [...state.queue, cmd].slice(-6);
  return {
    ...state,
    queue: nextQueue,
    statusMessage: `${nextQueue.length} command${nextQueue.length === 1 ? '' : 's'} queued. Press Space or Send Batch.`,
  };
}

/** Immediately starts autonomous A* pathfinding & obstacle-avoiding drive to a target badge or waypoint */
export function startAutoDriveToWaypoint(
  state: MarsQueueState,
  x: number,
  z: number,
  label: string,
  objectiveId?: string,
  planet?: SurfacePlanet
): MarsQueueState {
  const activePlanet: SurfacePlanet = planet ?? (state.realDelayMin > 0 ? 'mars' : 'moon');
  const clampedX = clamp(x, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
  const clampedZ = clamp(z, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
  const snapped = resolveObjectiveSnap(clampedX, clampedZ, activePlanet, objectiveId);
  const finalX = Math.round(snapped.x * 10) / 10;
  const finalZ = Math.round(snapped.z * 10) / 10;
  const finalObjId = snapped.objectiveId;
  const finalLabel = snapped.snappedLabel || label;

  const cmd: MarsCommand = {
    id: `cmd-${Date.now()}-auto`,
    type: finalObjId ? 'DRILL' : 'DRIVE_TO',
    x: finalX,
    z: finalZ,
    label: finalLabel,
    objectiveId: finalObjId,
  };
  return {
    ...state,
    phase: 'EXECUTING',
    queue: [cmd],
    activeIndex: 0,
    txRemainingSec: 0,
    statusMessage: `AutoNav A* route -> ${finalLabel}`,
    plannedPath: [],
    avoidingObstacleLabel: null,
    repathTimerSec: 0,
    stuckTimerSec: 0,
    reverseEscapeSec: 0,
    lastProgressDist: undefined,
    lastPlannedGoalKey: undefined,
  };
}

export function removeLastMarsCommand(state: MarsQueueState): MarsQueueState {
  if (state.phase !== 'IDLE' || state.queue.length === 0) return state;
  const nextQueue = state.queue.slice(0, -1);
  return {
    ...state,
    queue: nextQueue,
    plannedPath: [],
    avoidingObstacleLabel: null,
    statusMessage:
      nextQueue.length === 0
        ? 'Queue empty. Click map or ground to plan.'
        : `${nextQueue.length} command${nextQueue.length === 1 ? '' : 's'} queued.`,
  };
}

export function clearMarsQueue(state: MarsQueueState): MarsQueueState {
  return {
    ...state,
    phase: 'IDLE',
    queue: [],
    activeIndex: 0,
    txRemainingSec: 0,
    plannedPath: [],
    avoidingObstacleLabel: null,
    repathTimerSec: 0,
    stuckTimerSec: 0,
    reverseEscapeSec: 0,
    lastProgressDist: undefined,
    lastPlannedGoalKey: undefined,
    statusMessage: 'Auto-Drive stopped. Click target or press WASD.',
  };
}

export function transmitMarsQueue(state: MarsQueueState): MarsQueueState {
  if (state.phase !== 'IDLE' || state.queue.length === 0) return state;
  return {
    ...state,
    phase: 'TRANSMITTING',
    activeIndex: 0,
    txRemainingSec: state.txTotalSec,
    repathTimerSec: 0,
    stuckTimerSec: 0,
    reverseEscapeSec: 0,
    lastProgressDist: undefined,
    lastPlannedGoalKey: undefined,
    statusMessage: `Sending batch (${state.realDelayMin} min lag @ TIME x300)...`,
  };
}

function normalizeAngleDiff(target: number, current: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Projects a target goal point outside any solid habitat, station, or rock collider
 * so the rover stops on an obstacle-free stand-off apron within exact interaction range (<6.8m for stations, <=22m for Base Camp).
 */
export function resolveSafeGoalPosition(
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number,
  colliders: RoverCollider[],
  roverRadius = 1.18
): { x: number; z: number; arriveRadius: number } {
  let gx = clamp(goalX, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
  let gz = clamp(goalZ, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
  let arriveRadius = 2.6;

  // 1. Check if goal is inside or at a Habitat (e.g. Base Camp (-15,-13) r=9.6m or Parked Lander r=3.6m)
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (col.type !== 'habitat') continue;
    const distGoalToCol = Math.hypot(gx - col.x, gz - col.z);
    const safeDist = col.r + roverRadius + 2.6;
    if (distGoalToCol < safeDist) {
      const dirX = startX - col.x;
      const dirZ = startZ - col.z;
      const dirLen = Math.hypot(dirX, dirZ);
      if (dirLen > 0.1) {
        gx = col.x + (dirX / dirLen) * safeDist;
        gz = col.z + (dirZ / dirLen) * safeDist;
      } else {
        gx = col.x + safeDist;
        gz = col.z;
      }
      arriveRadius = 3.4;
    }
  }

  // 2. Check if goal is at a Science Station (col.type === 'station', r = 1.5m)
  // Physical collision occurs at 1.5 + 1.18 = 2.68m, while interaction requires dist < 6.8m.
  // Place stand-off point at 3.55m from station center along clearest approach angle!
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (col.type !== 'station') continue;
    const distGoalToStation = Math.hypot(gx - col.x, gz - col.z);
    if (distGoalToStation < col.r + roverRadius + 1.1) {
      const standOffDist = col.r + roverRadius + 0.95; // ~3.63m from station center (well inside 6.8m interaction range!)
      const baseAngle = Math.atan2(startX - col.x, startZ - col.z);
      const candidateAngles = [0, 0.35, -0.35, 0.7, -0.7, 1.1, -1.1, Math.PI];

      let bestX = col.x + Math.sin(baseAngle) * standOffDist;
      let bestZ = col.z + Math.cos(baseAngle) * standOffDist;
      for (const offset of candidateAngles) {
        const ang = baseAngle + offset;
        const cx = clamp(col.x + Math.sin(ang) * standOffDist, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
        const cz = clamp(col.z + Math.cos(ang) * standOffDist, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
        const blockedByOther = colliders.some(
          (other) =>
            other !== col &&
            Math.hypot(cx - other.x, cz - other.z) < other.r + roverRadius + 0.65
        );
        if (!blockedByOther) {
          bestX = cx;
          bestZ = cz;
          break;
        }
      }
      gx = bestX;
      gz = bestZ;
      arriveRadius = 2.2;
    }
  }

  // 3. Check if goal lands inside any surface boulder (col.type === 'rock')
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (col.type !== 'rock') continue;
    const distGoalToRock = Math.hypot(gx - col.x, gz - col.z);
    const minSafe = col.r + roverRadius + 1.15;
    if (distGoalToRock < minSafe) {
      const dirX = startX - col.x;
      const dirZ = startZ - col.z;
      const dirLen = Math.hypot(dirX, dirZ);
      if (dirLen > 0.1) {
        gx = col.x + (dirX / dirLen) * minSafe;
        gz = col.z + (dirZ / dirLen) * minSafe;
      } else {
        gx = col.x + minSafe;
        gz = col.z;
      }
    }
  }

  return {
    x: clamp(gx, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M),
    z: clamp(gz, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M),
    arriveRadius,
  };
}

/** Checks if a point (px, pz) is inside any obstacle collider with given safety margin */
function isPointBlocked(
  px: number,
  pz: number,
  rawGoalX: number,
  rawGoalZ: number,
  colliders: RoverCollider[],
  margin: number,
  isWalker: boolean
): boolean {
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (isWalker && col.type === 'rock' && col.r < 0.78) continue;
    // Allow approaching the target science station apron itself
    if (col.type === 'station' && Math.hypot(col.x - rawGoalX, col.z - rawGoalZ) < 4.5) {
      if (Math.hypot(px - col.x, pz - col.z) >= col.r + 1.15) continue;
    }
    if (Math.hypot(px - col.x, pz - col.z) < col.r + margin) {
      return true;
    }
  }
  return false;
}

/** Finds the closest collider intersecting segment A -> B */
export function findFirstBlockingCollider(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  rawGoalX: number,
  rawGoalZ: number,
  colliders: RoverCollider[],
  clearanceMargin: number,
  isWalker: boolean
): { col: RoverCollider; projT: number; distAlong: number } | null {
  const segDx = bx - ax;
  const segDz = bz - az;
  const segLen = Math.hypot(segDx, segDz);
  if (segLen < 0.2) return null;
  const ux = segDx / segLen;
  const uz = segDz / segLen;

  let best: { col: RoverCollider; projT: number; distAlong: number } | null = null;

  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (isWalker && col.type === 'rock' && col.r < 0.78) continue;
    const isTargetStation =
      col.type === 'station' && Math.hypot(col.x - rawGoalX, col.z - rawGoalZ) < 4.5;
    const safeR = isTargetStation ? col.r + 1.18 : col.r + clearanceMargin;

    const relX = col.x - ax;
    const relZ = col.z - az;
    const proj = relX * ux + relZ * uz;
    if (proj <= 0.05 || proj >= segLen + 0.05) continue;

    const clampedProj = clamp(proj, 0, segLen);
    const closestX = ax + ux * clampedProj;
    const closestZ = az + uz * clampedProj;
    const perpDist = Math.hypot(col.x - closestX, col.z - closestZ);

    if (perpDist < safeR) {
      if (!best || clampedProj < best.distAlong) {
        best = { col, projT: clampedProj / segLen, distAlong: clampedProj };
      }
    }
  }

  return best;
}

/** Checks if straight segment A -> B is free of both obstacle colliders and severe terrain slope hazards */
function isSegmentHazardFree(
  ax: number,
  az: number,
  bx: number,
  bz: number,
  rawGoalX: number,
  rawGoalZ: number,
  colliders: RoverCollider[],
  clearanceMargin: number,
  isWalker: boolean,
  planet?: SurfacePlanet
): boolean {
  const hit = findFirstBlockingCollider(
    ax,
    az,
    bx,
    bz,
    rawGoalX,
    rawGoalZ,
    colliders,
    clearanceMargin,
    isWalker
  );
  if (hit) return false;

  if (!planet) return true;

  // Sample terrain slope along segment every 3.5m to prevent string-pulling across steep crater cliffs
  const segLen = Math.hypot(bx - ax, bz - az);
  const steps = Math.max(1, Math.ceil(segLen / 3.5));
  const maxAllowedSlopeDeg = isWalker ? 25.0 : 18.5;
  let prevX = ax;
  let prevZ = az;
  let prevH = getSurfaceTerrainHeight(planet, ax, az);

  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const cx = ax + (bx - ax) * t;
    const cz = az + (bz - az) * t;
    const ch = getSurfaceTerrainHeight(planet, cx, cz);
    const stepDist = Math.hypot(cx - prevX, cz - prevZ);
    if (stepDist > 0.2) {
      const slopeDeg = (Math.atan2(Math.abs(ch - prevH), stepDist) * 180) / Math.PI;
      if (slopeDeg > maxAllowedSlopeDeg) {
        return false;
      }
    }
    prevX = cx;
    prevZ = cz;
    prevH = ch;
  }

  return true;
}

// ============================================================================
// 2D A* (A-STAR) GRID PATHFINDING + THETA* LINE-OF-SIGHT STRING PULLING
// ============================================================================

const ASTAR_BOUND_M = PHYSICS.SURFACE_BOUND_M; // 260m
const ASTAR_CELL_M = 4.0;
const ASTAR_GRID_DIM = Math.floor((ASTAR_BOUND_M * 2) / ASTAR_CELL_M) + 1; // 131 x 131 cells

function worldToGrid(wx: number, wz: number): { gx: number; gz: number } {
  const gx = clamp(
    Math.round((wx + ASTAR_BOUND_M) / ASTAR_CELL_M),
    0,
    ASTAR_GRID_DIM - 1
  );
  const gz = clamp(
    Math.round((wz + ASTAR_BOUND_M) / ASTAR_CELL_M),
    0,
    ASTAR_GRID_DIM - 1
  );
  return { gx, gz };
}

function gridToWorld(gx: number, gz: number): { x: number; z: number } {
  return {
    x: -ASTAR_BOUND_M + gx * ASTAR_CELL_M,
    z: -ASTAR_BOUND_M + gz * ASTAR_CELL_M,
  };
}

/** Fast binary min-heap for A* open set */
class AStarMinHeap {
  private nodes: number[] = [];
  private priorities: number[] = [];

  get size(): number {
    return this.nodes.length;
  }

  push(nodeIdx: number, fScore: number): void {
    this.nodes.push(nodeIdx);
    this.priorities.push(fScore);
    this.bubbleUp(this.nodes.length - 1);
  }

  pop(): number | undefined {
    if (this.nodes.length === 0) return undefined;
    const top = this.nodes[0];
    const lastNode = this.nodes.pop()!;
    const lastPrio = this.priorities.pop()!;
    if (this.nodes.length > 0) {
      this.nodes[0] = lastNode;
      this.priorities[0] = lastPrio;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(idx: number): void {
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      if (this.priorities[idx] >= this.priorities[parent]) break;
      this.swap(idx, parent);
      idx = parent;
    }
  }

  private sinkDown(idx: number): void {
    const len = this.nodes.length;
    while (true) {
      const left = (idx << 1) + 1;
      const right = left + 1;
      let smallest = idx;
      if (left < len && this.priorities[left] < this.priorities[smallest]) {
        smallest = left;
      }
      if (right < len && this.priorities[right] < this.priorities[smallest]) {
        smallest = right;
      }
      if (smallest === idx) break;
      this.swap(idx, smallest);
      idx = smallest;
    }
  }

  private swap(i: number, j: number): void {
    const tn = this.nodes[i];
    this.nodes[i] = this.nodes[j];
    this.nodes[j] = tn;
    const tp = this.priorities[i];
    this.priorities[i] = this.priorities[j];
    this.priorities[j] = tp;
  }
}

/**
 * Fallback tangent subdivision used when start/goal are within a single grid cell or if grid is unconstrained.
 */
function computeTangentSubdivisionFallback(
  startX: number,
  startZ: number,
  safeGoalX: number,
  safeGoalZ: number,
  rawGoalX: number,
  rawGoalZ: number,
  colliders: RoverCollider[],
  clearanceMargin: number,
  isWalker: boolean
): Array<{ x: number; z: number }> {
  const waypoints: Array<{ x: number; z: number }> = [
    { x: startX, z: startZ },
    { x: safeGoalX, z: safeGoalZ },
  ];

  for (let iter = 0; iter < 8; iter++) {
    let inserted = false;
    for (let s = 0; s < waypoints.length - 1; s++) {
      const a = waypoints[s];
      const b = waypoints[s + 1];
      const hit = findFirstBlockingCollider(
        a.x,
        a.z,
        b.x,
        b.z,
        rawGoalX,
        rawGoalZ,
        colliders,
        clearanceMargin,
        isWalker
      );
      if (!hit) continue;

      const segDx = b.x - a.x;
      const segDz = b.z - a.z;
      const segLen = Math.max(0.01, Math.hypot(segDx, segDz));
      const perpX = -segDz / segLen;
      const perpZ = segDx / segLen;

      const detourBase = hit.col.r + clearanceMargin + 1.65;
      let chosenPt: { x: number; z: number } | null = null;
      let bestScore = Infinity;

      for (const mult of [1.0, 1.5, 2.1, 2.8]) {
        for (const side of [1, -1] as const) {
          const cx = clamp(
            hit.col.x + perpX * side * detourBase * mult,
            -PHYSICS.SURFACE_BOUND_M,
            PHYSICS.SURFACE_BOUND_M
          );
          const cz = clamp(
            hit.col.z + perpZ * side * detourBase * mult,
            -PHYSICS.SURFACE_BOUND_M,
            PHYSICS.SURFACE_BOUND_M
          );
          const blocked = isPointBlocked(
            cx,
            cz,
            rawGoalX,
            rawGoalZ,
            colliders,
            clearanceMargin * 0.9,
            isWalker
          );
          const pathCost =
            Math.hypot(cx - a.x, cz - a.z) +
            Math.hypot(b.x - cx, b.z - cz) +
            (blocked ? 600 : 0);
          if (pathCost < bestScore) {
            bestScore = pathCost;
            chosenPt = { x: cx, z: cz };
          }
        }
        if (bestScore < 450) break;
      }

      if (chosenPt) {
        waypoints.splice(s + 1, 0, chosenPt);
        inserted = true;
        break;
      }
    }
    if (!inserted) break;
  }

  return waypoints.slice(1);
}

/**
 * Computes a globally optimal obstacle- and terrain-hazard-avoiding path from (startX, startZ)
 * to (goalX, goalZ) using 8-connected A* search + Theta* line-of-sight string-pulling.
 */
export function computeSafeRoverPath(
  startX: number,
  startZ: number,
  goalX: number,
  goalZ: number,
  colliders: RoverCollider[],
  isWalker = false,
  planet?: SurfacePlanet
): Array<{ x: number; z: number }> {
  const roverRadius = isWalker ? 0.95 : 1.18;
  const safeGoal = resolveSafeGoalPosition(startX, startZ, goalX, goalZ, colliders, roverRadius);
  const clearanceMargin = roverRadius + 1.45;

  // Fast path: if direct line-of-sight is completely free of colliders and steep slope hazards, return direct goal
  if (
    isSegmentHazardFree(
      startX,
      startZ,
      safeGoal.x,
      safeGoal.z,
      goalX,
      goalZ,
      colliders,
      clearanceMargin,
      isWalker,
      planet
    )
  ) {
    return [{ x: safeGoal.x, z: safeGoal.z }];
  }

  const totalCells = ASTAR_GRID_DIM * ASTAR_GRID_DIM;
  const blockedGrid = new Uint8Array(totalCells);
  const penaltyGrid = new Float32Array(totalCells);

  // Rasterize obstacle colliders + repulsive proximity halos onto the A* grid
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    if (isWalker && col.type === 'rock' && col.r < 0.78) continue;
    const isTargetStation =
      col.type === 'station' && Math.hypot(col.x - goalX, col.z - goalZ) < 4.5;

    const hardRadius = isTargetStation ? col.r + 1.15 : col.r + roverRadius + 1.25;
    const softRadius = hardRadius + 3.2;

    const minGx = Math.max(0, Math.floor((col.x - softRadius + ASTAR_BOUND_M) / ASTAR_CELL_M));
    const maxGx = Math.min(
      ASTAR_GRID_DIM - 1,
      Math.ceil((col.x + softRadius + ASTAR_BOUND_M) / ASTAR_CELL_M)
    );
    const minGz = Math.max(0, Math.floor((col.z - softRadius + ASTAR_BOUND_M) / ASTAR_CELL_M));
    const maxGz = Math.min(
      ASTAR_GRID_DIM - 1,
      Math.ceil((col.z + softRadius + ASTAR_BOUND_M) / ASTAR_CELL_M)
    );

    for (let gz = minGz; gz <= maxGz; gz++) {
      const wz = -ASTAR_BOUND_M + gz * ASTAR_CELL_M;
      const rowOffset = gz * ASTAR_GRID_DIM;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const wx = -ASTAR_BOUND_M + gx * ASTAR_CELL_M;
        const dist = Math.hypot(wx - col.x, wz - col.z);
        const idx = rowOffset + gx;
        if (dist < hardRadius) {
          blockedGrid[idx] = 1;
        } else if (dist < softRadius) {
          const norm = (softRadius - dist) / (softRadius - hardRadius);
          penaltyGrid[idx] += norm * norm * 14.0;
        }
      }
    }
  }

  const startCell = worldToGrid(startX, startZ);
  const goalCell = worldToGrid(safeGoal.x, safeGoal.z);

  // Ensure startCell and goalCell are unblocked by snapping to nearest free cell if necessary
  const snapToUnblockedCell = (gx0: number, gz0: number): { gx: number; gz: number } => {
    const idx0 = gz0 * ASTAR_GRID_DIM + gx0;
    if (!blockedGrid[idx0]) return { gx: gx0, gz: gz0 };
    for (let rad = 1; rad <= 6; rad++) {
      let best: { gx: number; gz: number; d: number } | null = null;
      for (let dz = -rad; dz <= rad; dz++) {
        for (let dx = -rad; dx <= rad; dx++) {
          const nx = gx0 + dx;
          const nz = gz0 + dz;
          if (nx < 0 || nx >= ASTAR_GRID_DIM || nz < 0 || nz >= ASTAR_GRID_DIM) continue;
          const nIdx = nz * ASTAR_GRID_DIM + nx;
          if (!blockedGrid[nIdx]) {
            const d = Math.hypot(dx, dz);
            if (!best || d < best.d) {
              best = { gx: nx, gz: nz, d };
            }
          }
        }
      }
      if (best) return { gx: best.gx, gz: best.gz };
    }
    blockedGrid[idx0] = 0;
    return { gx: gx0, gz: gz0 };
  };

  const sCell = snapToUnblockedCell(startCell.gx, startCell.gz);
  const gCell = snapToUnblockedCell(goalCell.gx, goalCell.gz);
  const startIdx = sCell.gz * ASTAR_GRID_DIM + sCell.gx;
  const goalIdx = gCell.gz * ASTAR_GRID_DIM + gCell.gx;

  if (startIdx === goalIdx) {
    return computeTangentSubdivisionFallback(
      startX,
      startZ,
      safeGoal.x,
      safeGoal.z,
      goalX,
      goalZ,
      colliders,
      clearanceMargin,
      isWalker
    );
  }

  const gScore = new Float32Array(totalCells);
  gScore.fill(Infinity);
  const cameFrom = new Int32Array(totalCells);
  cameFrom.fill(-1);
  const closed = new Uint8Array(totalCells);

  const openHeap = new AStarMinHeap();
  gScore[startIdx] = 0;

  const octileHeuristic = (gx: number, gz: number): number => {
    const dx = Math.abs(gx - gCell.gx);
    const dz = Math.abs(gz - gCell.gz);
    const mn = Math.min(dx, dz);
    const mx = Math.max(dx, dz);
    return (mn * Math.SQRT2 + (mx - mn)) * ASTAR_CELL_M;
  };

  openHeap.push(startIdx, octileHeuristic(sCell.gx, sCell.gz));

  const neighborDirs: ReadonlyArray<[number, number, number]> = [
    [1, 0, ASTAR_CELL_M],
    [-1, 0, ASTAR_CELL_M],
    [0, 1, ASTAR_CELL_M],
    [0, -1, ASTAR_CELL_M],
    [1, 1, ASTAR_CELL_M * Math.SQRT2],
    [1, -1, ASTAR_CELL_M * Math.SQRT2],
    [-1, 1, ASTAR_CELL_M * Math.SQRT2],
    [-1, -1, ASTAR_CELL_M * Math.SQRT2],
  ];

  let foundGoal = false;
  let expansions = 0;
  const maxExpansions = 9500;

  while (openHeap.size > 0 && expansions < maxExpansions) {
    const currIdx = openHeap.pop()!;
    if (currIdx === goalIdx) {
      foundGoal = true;
      break;
    }
    if (closed[currIdx]) continue;
    closed[currIdx] = 1;
    expansions++;

    const cx = currIdx % ASTAR_GRID_DIM;
    const cz = (currIdx - cx) / ASTAR_GRID_DIM;
    const currG = gScore[currIdx];
    const currW = gridToWorld(cx, cz);
    const currH = planet ? getSurfaceTerrainHeight(planet, currW.x, currW.z) : 0;

    for (let d = 0; d < neighborDirs.length; d++) {
      const [dx, dz, stepDistM] = neighborDirs[d];
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nx >= ASTAR_GRID_DIM || nz < 0 || nz >= ASTAR_GRID_DIM) continue;

      const nIdx = nz * ASTAR_GRID_DIM + nx;
      if (closed[nIdx] || blockedGrid[nIdx]) continue;

      // Prevent diagonal corner-cutting adjacent to blocked cells
      if (dx !== 0 && dz !== 0) {
        const card1 = cz * ASTAR_GRID_DIM + nx;
        const card2 = nz * ASTAR_GRID_DIM + cx;
        if (blockedGrid[card1] || blockedGrid[card2]) continue;
      }

      // Compute terrain slope traversal penalty when planet surface topography is provided
      let slopePenalty = 0;
      if (planet) {
        const nextW = gridToWorld(nx, nz);
        const nextH = getSurfaceTerrainHeight(planet, nextW.x, nextW.z);
        const slopeDeg = (Math.atan2(Math.abs(nextH - currH), stepDistM) * 180) / Math.PI;
        if (slopeDeg > 9.0) {
          const excess = slopeDeg - 9.0;
          const walkerFactor = isWalker ? 0.35 : 1.0;
          slopePenalty = excess * excess * 0.45 * walkerFactor * stepDistM;
        }
      }

      const tentativeG = currG + stepDistM + penaltyGrid[nIdx] + slopePenalty;
      if (tentativeG < gScore[nIdx]) {
        cameFrom[nIdx] = currIdx;
        gScore[nIdx] = tentativeG;
        const fScore = tentativeG + octileHeuristic(nx, nz) * 1.001;
        openHeap.push(nIdx, fScore);
      }
    }
  }

  if (!foundGoal) {
    return computeTangentSubdivisionFallback(
      startX,
      startZ,
      safeGoal.x,
      safeGoal.z,
      goalX,
      goalZ,
      colliders,
      clearanceMargin,
      isWalker
    );
  }

  // Reconstruct raw grid path
  const rawPts: Array<{ x: number; z: number }> = [];
  let trace = goalIdx;
  while (trace !== -1 && trace !== startIdx) {
    const gx = trace % ASTAR_GRID_DIM;
    const gz = (trace - gx) / ASTAR_GRID_DIM;
    rawPts.push(gridToWorld(gx, gz));
    trace = cameFrom[trace];
  }
  rawPts.reverse();

  // Replace first and last points with exact continuous start and safeGoal coordinates
  const fullChain: Array<{ x: number; z: number }> = [
    { x: startX, z: startZ },
    ...rawPts,
    { x: safeGoal.x, z: safeGoal.z },
  ];

  // Theta* Line-of-Sight String-Pulling: collapse stair-step grid nodes into smooth direct segments
  const smoothed: Array<{ x: number; z: number }> = [{ x: startX, z: startZ }];
  let anchorIdx = 0;

  while (anchorIdx < fullChain.length - 1) {
    let furthestVisible = anchorIdx + 1;
    const anchor = fullChain[anchorIdx];

    for (let testIdx = fullChain.length - 1; testIdx > anchorIdx + 1; testIdx--) {
      const candidate = fullChain[testIdx];
      if (
        isSegmentHazardFree(
          anchor.x,
          anchor.z,
          candidate.x,
          candidate.z,
          goalX,
          goalZ,
          colliders,
          clearanceMargin * 0.94,
          isWalker,
          planet
        )
      ) {
        furthestVisible = testIdx;
        break;
      }
    }

    smoothed.push(fullChain[furthestVisible]);
    anchorIdx = furthestVisible;
  }

  const finalWaypoints = smoothed.slice(1);
  return finalWaypoints.length > 0 ? finalWaypoints : [{ x: safeGoal.x, z: safeGoal.z }];
}

/**
 * Multi-ray LiDAR local hazard avoidance: scans 17 candidate steering angles around the desired
 * sub-waypoint heading and selects a collision-free direction around nearby boulders/structures.
 */
export function computeObstacleAvoidanceHeading(
  rover: RoverState,
  subTargetX: number,
  subTargetZ: number,
  finalGoalX: number,
  finalGoalZ: number,
  colliders: RoverCollider[]
): { safeHeadingRad: number; avoidingLabel: string | null; minClearanceM: number } {
  const desiredHeading = Math.atan2(subTargetX - rover.x, subTargetZ - rover.z);
  if (colliders.length === 0) {
    return { safeHeadingRad: desiredHeading, avoidingLabel: null, minClearanceM: 99 };
  }

  const isWalker = rover.driveMode === 'WALKER';
  const roverRadius = isWalker ? 0.95 : 1.18;
  const safetyBuffer = roverRadius + 1.35;
  const distToSub = Math.hypot(subTargetX - rover.x, subTargetZ - rover.z);
  const lookaheadM = Math.min(14.5, Math.max(4.2, distToSub));

  // Candidate offsets in degrees from desiredHeading (from 0° out to ±135°)
  const candidateOffsetsDeg = [
    0, 12, -12, 24, -24, 38, -38, 52, -52, 68, -68, 85, -85, 108, -108, 135, -135,
  ];

  let bestHeading = desiredHeading;
  let bestCost = Infinity;
  let nearestThreatLabel: string | null = null;
  let globalMinClearance = 99;

  for (let cIdx = 0; cIdx < candidateOffsetsDeg.length; cIdx++) {
    const offsetRad = (candidateOffsetsDeg[cIdx] * Math.PI) / 180;
    const candHeading = desiredHeading + offsetRad;
    const dirX = Math.sin(candHeading);
    const dirZ = Math.cos(candHeading);

    // Base cost prefers staying close to desired sub-waypoint heading and current rover heading
    const diffFromRover = Math.abs(normalizeAngleDiff(candHeading, rover.headingRad));
    let rayCost = Math.abs(offsetRad) * 1.3 + diffFromRover * 0.3;

    for (let i = 0; i < colliders.length; i++) {
      const col = colliders[i];
      if (isWalker && col.type === 'rock' && col.r < 0.78) continue;
      const isTargetStation =
        col.type === 'station' && Math.hypot(col.x - finalGoalX, col.z - finalGoalZ) < 4.5;
      const safeR = isTargetStation ? col.r + roverRadius + 0.35 : col.r + safetyBuffer;

      const relX = col.x - rover.x;
      const relZ = col.z - rover.z;
      const centerDist = Math.hypot(relX, relZ);
      const surfaceClearance = centerDist - (col.r + roverRadius);
      if (surfaceClearance < globalMinClearance) {
        globalMinClearance = surfaceClearance;
      }

      if (centerDist > lookaheadM + safeR) continue;

      // Project obstacle center onto candidate ray
      const forwardProj = relX * dirX + relZ * dirZ;
      if (forwardProj < -0.35 || forwardProj > lookaheadM) continue;

      const clampedProj = Math.max(0, forwardProj);
      const perpDist = Math.hypot(relX - dirX * clampedProj, relZ - dirZ * clampedProj);

      if (perpDist < safeR) {
        const penetration = (safeR - perpDist) / safeR;
        const proximityWeight = Math.pow(1 - clampedProj / (lookaheadM + 1.0), 1.6);
        const hazardPenalty = 48.0 * (0.4 + penetration) * (0.35 + proximityWeight * 2.5);
        rayCost += hazardPenalty;
        if (cIdx === 0 && !nearestThreatLabel) {
          nearestThreatLabel = col.label;
        }
      }
    }

    if (rayCost < bestCost) {
      bestCost = rayCost;
      bestHeading = candHeading;
    }
  }

  return {
    safeHeadingRad: bestHeading,
    avoidingLabel: nearestThreatLabel,
    minClearanceM: globalMinClearance,
  };
}

export interface MarsQueueStepResult {
  queueState: MarsQueueState;
  input: InputState;
  triggerDrillObjectiveId: string | null;
}

const ZERO_INPUT: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  action: false,
  boost: false,
  tiltForward: false,
  stabilize: false,
};

export function stepMarsQueue(
  state: MarsQueueState,
  rover: RoverState,
  objectives: RoverObjective[],
  dt: number,
  colliders: RoverCollider[] = []
): MarsQueueStepResult {
  if (state.phase === 'IDLE') {
    return { queueState: state, input: { ...ZERO_INPUT }, triggerDrillObjectiveId: null };
  }

  if (state.phase === 'TRANSMITTING') {
    const nextRem = Math.max(0, state.txRemainingSec - dt);
    if (nextRem <= 0) {
      const first = state.queue[0];
      return {
        queueState: {
          ...state,
          phase: 'EXECUTING',
          activeIndex: 0,
          txRemainingSec: 0,
          repathTimerSec: 0,
          stuckTimerSec: 0,
          reverseEscapeSec: 0,
          lastProgressDist: undefined,
          lastPlannedGoalKey: undefined,
          statusMessage: first ? `Autonomous A* drive -> ${first.label}` : 'Executing batch...',
        },
        input: { ...ZERO_INPUT },
        triggerDrillObjectiveId: null,
      };
    }
    return {
      queueState: {
        ...state,
        txRemainingSec: nextRem,
        statusMessage: `Uplink signal in transit (${state.realDelayMin} min lag)...`,
      },
      input: { ...ZERO_INPUT },
      triggerDrillObjectiveId: null,
    };
  }

  // EXECUTING autonomous navigation
  const cmd = state.queue[state.activeIndex];
  if (!cmd) {
    return {
      queueState: createInitialMarsQueueState(state.realDelayMin),
      input: { ...ZERO_INPUT },
      triggerDrillObjectiveId: null,
    };
  }

  const isWalker = rover.driveMode === 'WALKER';
  const roverRadius = isWalker ? 0.95 : 1.18;

  // Match objective either by explicit objectiveId or proximity to command target
  const targetObj = cmd.objectiveId
    ? objectives.find((o) => o.id === cmd.objectiveId && !o.completed)
    : objectives.find((o) => !o.completed && Math.hypot(o.x - cmd.x, o.z - cmd.z) <= 10.5);

  const rawGoalX = targetObj ? targetObj.x : cmd.x;
  const rawGoalZ = targetObj ? targetObj.z : cmd.z;
  const safeGoal = resolveSafeGoalPosition(
    rover.x,
    rover.z,
    rawGoalX,
    rawGoalZ,
    colliders,
    roverRadius
  );

  const rawDistToGoal = Math.hypot(rawGoalX - rover.x, rawGoalZ - rover.z);
  const distToSafeGoal = Math.hypot(safeGoal.x - rover.x, safeGoal.z - rover.z);

  // Precise arrival condition:
  // - For mission objectives: must be strictly within < 6.4m of objective center (so App.tsx <6.8m inRange is guaranteed!)
  // - For Base Camp (-15, -13): must be within <= 18.5m of Base Camp center and <= 3.5m of apron safeGoal
  // - For custom waypoints: within safeGoal.arriveRadius (2.6m) of safeGoal or 2.8m of rawGoal
  const isBaseCampGoal = !targetObj && Math.hypot(rawGoalX + 15, rawGoalZ + 13) <= 14.0;
  const hasArrived = targetObj
    ? rawDistToGoal <= 5.8 || (distToSafeGoal <= 2.0 && rawDistToGoal <= 6.4)
    : isBaseCampGoal
      ? rawDistToGoal <= 18.5 && distToSafeGoal <= 3.6
      : distToSafeGoal <= safeGoal.arriveRadius || rawDistToGoal <= 2.8;

  if (hasArrived) {
    const arrivedObj =
      targetObj ||
      objectives.find((o) => !o.completed && Math.hypot(o.x - rover.x, o.z - rover.z) < 6.6);

    const nextIdx = state.activeIndex + 1;
    if (nextIdx >= state.queue.length) {
      return {
        queueState: {
          ...createInitialMarsQueueState(state.realDelayMin),
          statusMessage: arrivedObj
            ? `Arrived at ${arrivedObj.siteName} — ready to drill.`
            : `Arrived at ${cmd.label}.`,
        },
        input: { ...ZERO_INPUT },
        triggerDrillObjectiveId: arrivedObj ? arrivedObj.id : null,
      };
    }

    const nextCmd = state.queue[nextIdx];
    return {
      queueState: {
        ...state,
        activeIndex: nextIdx,
        plannedPath: [],
        avoidingObstacleLabel: null,
        repathTimerSec: 0,
        stuckTimerSec: 0,
        reverseEscapeSec: 0,
        lastProgressDist: undefined,
        lastPlannedGoalKey: undefined,
        statusMessage: `Autonomous A* drive -> ${nextCmd.label}`,
      },
      input: { ...ZERO_INPUT },
      triggerDrillObjectiveId: arrivedObj ? arrivedObj.id : null,
    };
  }

  // Prune intermediate waypoints in existing plannedPath that the rover has already reached
  let currentPath = (state.plannedPath || []).slice();
  while (currentPath.length > 1) {
    const wp = currentPath[0];
    if (Math.hypot(wp.x - rover.x, wp.z - rover.z) <= 3.4) {
      currentPath.shift();
    } else {
      break;
    }
  }

  // Determine whether dynamic A* path recalculation is needed
  const goalKey = `${cmd.id}:${Math.round(rawGoalX)}:${Math.round(rawGoalZ)}:${colliders.length}:${isWalker ? 1 : 0}`;
  const nextRepathTimer = (state.repathTimerSec ?? 0) - dt;
  const firstWp = currentPath[0];
  const segmentBlocked = firstWp
    ? Boolean(
        findFirstBlockingCollider(
          rover.x,
          rover.z,
          firstWp.x,
          firstWp.z,
          rawGoalX,
          rawGoalZ,
          colliders,
          roverRadius + 1.15,
          isWalker
        )
      )
    : true;

  const needsReplan =
    currentPath.length === 0 ||
    state.lastPlannedGoalKey !== goalKey ||
    nextRepathTimer <= 0 ||
    segmentBlocked;

  if (needsReplan) {
    currentPath = computeSafeRoverPath(
      rover.x,
      rover.z,
      rawGoalX,
      rawGoalZ,
      colliders,
      isWalker,
      rover.planet
    );
    while (currentPath.length > 1 && Math.hypot(currentPath[0].x - rover.x, currentPath[0].z - rover.z) <= 3.2) {
      currentPath.shift();
    }
  }

  const activeSub = currentPath[0] || { x: safeGoal.x, z: safeGoal.z };

  // Multi-ray LiDAR hazard scan around activeSub
  const lidar = computeObstacleAvoidanceHeading(
    rover,
    activeSub.x,
    activeSub.z,
    rawGoalX,
    rawGoalZ,
    colliders
  );

  // Track forward progress & detect if wedged against a rock or steep wall
  const prevDist = state.lastProgressDist ?? distToSafeGoal;
  const madeProgress = prevDist - distToSafeGoal > 0.18;
  let stuckTimerSec = madeProgress ? 0 : (state.stuckTimerSec ?? 0) + dt;
  const lastProgressDist = madeProgress ? distToSafeGoal : prevDist;
  let reverseEscapeSec = Math.max(0, (state.reverseEscapeSec ?? 0) - dt);

  const touchingFrontObstacle =
    Boolean(rover.collisionLabel) && lidar.minClearanceM < 0.35;

  if ((stuckTimerSec > 1.15 || touchingFrontObstacle) && reverseEscapeSec <= 0) {
    reverseEscapeSec = 0.65;
    stuckTimerSec = 0;
  }

  const err = normalizeAngleDiff(lidar.safeHeadingRad, rover.headingRad);
  const turnLeft = err > 0.055;
  const turnRight = err < -0.055;

  const driveBackward = reverseEscapeSec > 0;
  // Drive forward whenever aligned within ~55°, or while turning when clearance ahead is open
  const driveForward =
    !driveBackward &&
    (Math.abs(err) < 0.96 || (lidar.minClearanceM > 2.4 && Math.abs(err) < 1.55));

  const displayDist = Math.round(targetObj ? rawDistToGoal : distToSafeGoal);
  const statusPrefix = lidar.avoidingLabel
    ? `Bypassing ${lidar.avoidingLabel} -> ${cmd.label}`
    : currentPath.length > 1
      ? `A* Route (${currentPath.length} pts) -> ${cmd.label}`
      : `AutoNav ${state.activeIndex + 1}/${state.queue.length}: ${cmd.label}`;

  return {
    queueState: {
      ...state,
      plannedPath: currentPath,
      avoidingObstacleLabel: lidar.avoidingLabel,
      repathTimerSec: needsReplan ? 0.45 : nextRepathTimer,
      stuckTimerSec,
      reverseEscapeSec,
      lastProgressDist,
      lastPlannedGoalKey: goalKey,
      statusMessage: `${statusPrefix} (${displayDist} m)`,
    },
    input: {
      ...ZERO_INPUT,
      forward: driveForward,
      backward: driveBackward,
      left: driveBackward ? !turnLeft : turnLeft,
      right: driveBackward ? !turnRight : turnRight,
    },
    triggerDrillObjectiveId: null,
  };
}

export function shouldShowDidYouKnowToast(params: {
  hasActiveAnomaly: boolean;
  apollo1202Active: boolean;
  hasCriticalWarning: boolean;
  menuOpen: boolean;
  modalOpen: boolean;
}): boolean {
  return !(
    params.hasActiveAnomaly ||
    params.apollo1202Active ||
    params.hasCriticalWarning ||
    params.menuOpen ||
    params.modalOpen
  );
}

export interface CostChip {
  label: string;
  positive: boolean;
}

export function extractChoiceCostChips(choice: AnomalyChoice): CostChip[] {
  const chips: CostChip[] = [];
  const { power, oxygen, shield } = choice.deltaResources;
  if (typeof power === 'number' && power !== 0) {
    chips.push({ label: `Power ${power > 0 ? '+' : ''}${power}`, positive: power > 0 });
  }
  if (typeof oxygen === 'number' && oxygen !== 0) {
    chips.push({ label: `Air ${oxygen > 0 ? '+' : ''}${oxygen}`, positive: oxygen > 0 });
  }
  if (typeof shield === 'number' && shield !== 0) {
    chips.push({ label: `Shield ${shield > 0 ? '+' : ''}${shield}`, positive: shield > 0 });
  }
  if (choice.doseDeltaMsv > 0) {
    chips.push({ label: `Dose +${choice.doseDeltaMsv} mSv`, positive: false });
  }
  return chips;
}

export interface PlainHelpTerm {
  term: string;
  definition: string;
}

const KEYWORD_MAP: Array<{ pattern: RegExp; glossaryKey: keyof typeof GLOSSARY_ENTRIES }> = [
  { pattern: /\bMax-Q\b/i, glossaryKey: 'max-q' },
  { pattern: /\b(?:Δv|delta-?v)\b/i, glossaryKey: 'delta-v' },
  { pattern: /\bregolith|dust|berm\b/i, glossaryKey: 'regolith' },
  { pattern: /\bsol\b/i, glossaryKey: 'sol' },
  { pattern: /\b(?:mSv|radiation|proton|SPE|flare|storm|MARE|shield)\b/i, glossaryKey: 'radiation-dose' },
  { pattern: /\b(?:TLI|orbit|NRHO)\b/i, glossaryKey: 'tli' },
  { pattern: /\b(?:delay|lag|light-time)\b/i, glossaryKey: 'comms-delay' },
  { pattern: /\b(?:ISRU|MOXIE|ice)\b/i, glossaryKey: 'isru' },
  { pattern: /\brock(er)?-bogie\b/i, glossaryKey: 'rocker-bogie' },
];

export function getAnomalyHelpTerms(text: string): PlainHelpTerm[] {
  const results: PlainHelpTerm[] = [];
  const seen = new Set<string>();
  for (const item of KEYWORD_MAP) {
    if (item.pattern.test(text)) {
      const entry = GLOSSARY_ENTRIES[item.glossaryKey];
      if (entry && !seen.has(entry.id)) {
        seen.add(entry.id);
        results.push({ term: entry.shortLabel, definition: entry.definition });
      }
    }
    if (results.length >= 2) break;
  }
  return results;
}
