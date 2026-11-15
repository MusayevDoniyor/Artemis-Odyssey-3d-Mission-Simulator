import { PHYSICS } from './constants';
import { clamp } from './physics';
import { GLOSSARY_ENTRIES } from './factsAndGlossary';
import type {
  AnomalyChoice,
  InputState,
  MarsCommand,
  MarsQueueState,
  RoverObjective,
  RoverState,
} from './types';

export function createInitialMarsQueueState(delayMin = 14): MarsQueueState {
  return {
    phase: 'IDLE',
    queue: [],
    activeIndex: 0,
    txRemainingSec: 0,
    txTotalSec: 2.6,
    realDelayMin: delayMin,
    statusMessage: 'Click map or terrain to queue waypoints.',
  };
}

export function enqueueMarsWaypoint(
  state: MarsQueueState,
  x: number,
  z: number,
  label: string,
  objectiveId?: string
): MarsQueueState {
  if (state.phase !== 'IDLE') return state;
  const clampedX = clamp(x, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
  const clampedZ = clamp(z, -PHYSICS.SURFACE_BOUND_M, PHYSICS.SURFACE_BOUND_M);
  const cmd: MarsCommand = {
    id: `cmd-${Date.now()}-${state.queue.length}`,
    type: objectiveId ? 'DRILL' : 'DRIVE_TO',
    x: Math.round(clampedX),
    z: Math.round(clampedZ),
    label,
    objectiveId,
  };
  const nextQueue = [...state.queue, cmd].slice(-6);
  return {
    ...state,
    queue: nextQueue,
    statusMessage: `${nextQueue.length} command${nextQueue.length === 1 ? '' : 's'} queued. Press Space to uplink.`,
  };
}

export function removeLastMarsCommand(state: MarsQueueState): MarsQueueState {
  if (state.phase !== 'IDLE' || state.queue.length === 0) return state;
  const nextQueue = state.queue.slice(0, -1);
  return {
    ...state,
    queue: nextQueue,
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
    statusMessage: 'Queue cleared. Click map or ground to plan.',
  };
}

export function transmitMarsQueue(state: MarsQueueState): MarsQueueState {
  if (state.phase !== 'IDLE' || state.queue.length === 0) return state;
  return {
    ...state,
    phase: 'TRANSMITTING',
    activeIndex: 0,
    txRemainingSec: state.txTotalSec,
    statusMessage: `Sending batch (${state.realDelayMin} min lag @ TIME x300)...`,
  };
}

function normalizeAngleDiff(target: number, current: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
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
  dt: number
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
          statusMessage: first ? `Autonomous drive -> ${first.label}` : 'Executing batch...',
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

  // EXECUTING autonomous batch
  const cmd = state.queue[state.activeIndex];
  if (!cmd) {
    return {
      queueState: createInitialMarsQueueState(state.realDelayMin),
      input: { ...ZERO_INPUT },
      triggerDrillObjectiveId: null,
    };
  }

  const dx = cmd.x - rover.x;
  const dz = cmd.z - rover.z;
  const dist = Math.hypot(dx, dz);
  const arriveThreshold = cmd.objectiveId ? 5.6 : 4.2;

  if (dist <= arriveThreshold) {
    const matchedObj = cmd.objectiveId
      ? objectives.find((o) => o.id === cmd.objectiveId && !o.completed)
      : objectives.find((o) => !o.completed && Math.hypot(o.x - rover.x, o.z - rover.z) < 6.4);

    const nextIdx = state.activeIndex + 1;
    if (nextIdx >= state.queue.length) {
      return {
        queueState: {
          ...createInitialMarsQueueState(state.realDelayMin),
          statusMessage: matchedObj
            ? `Arrived at ${matchedObj.siteName} — ready to drill.`
            : `Arrived at ${cmd.label}.`,
        },
        input: { ...ZERO_INPUT },
        triggerDrillObjectiveId: matchedObj ? matchedObj.id : null,
      };
    }

    const nextCmd = state.queue[nextIdx];
    return {
      queueState: {
        ...state,
        activeIndex: nextIdx,
        statusMessage: `Autonomous drive -> ${nextCmd.label}`,
      },
      input: { ...ZERO_INPUT },
      triggerDrillObjectiveId: matchedObj ? matchedObj.id : null,
    };
  }

  // Steer smoothly using same +Z forward convention as stepRoverPhysics (headingRad: +X = sin, +Z = cos)
  const targetHeading = Math.atan2(dx, dz);
  const err = normalizeAngleDiff(targetHeading, rover.headingRad);
  const turnLeft = err > 0.08;
  const turnRight = err < -0.08;
  const driveForward = Math.abs(err) < 1.15;

  return {
    queueState: {
      ...state,
      statusMessage: `Executing ${state.activeIndex + 1}/${state.queue.length}: ${cmd.label} (${Math.round(dist)} m)`,
    },
    input: {
      ...ZERO_INPUT,
      forward: driveForward,
      left: turnLeft,
      right: turnRight,
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
  { pattern: /\b(?:TLI|orbit|LEO|NRHO)\b/i, glossaryKey: 'tli' },
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
