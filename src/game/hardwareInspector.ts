import { HARDWARE_CATALOG } from './hardwareCatalog';
import type { HardwareShowcaseId, HardwareSubPart } from './hardwareCatalog';
import type { InspectorLabelPoint } from './types';

export interface PropulsionProfile {
  engineLabel: string;
  ratedThrustKn: number;
  ispVacS: number;
  ispSeaLevelS: number;
  referenceMassKg: number;
  burnRateNominalKgS: number;
  gravityMs2: number;
  minThrottlePct: number;
  maxThrottlePct: number;
}

export interface PropulsionCalcResult {
  engineLabel: string;
  throttlePct: number;
  thrustKn: number;
  exhaustVelocityMs: number;
  massFlowKgS: number;
  twr: number;
  accelMs2: number;
}

export interface StageSepStepSpec {
  step: number;
  code: string;
  title: string;
  altitudeLabel: string;
  description: string;
  srbSepFactor: number;
  coreSepFactor: number;
  lasSepFactor: number;
  esmSolarFoldPct: number;
  icpsThrusting: boolean;
}

export interface Rs25EngineInfo {
  index: 1 | 2 | 3 | 4;
  quadrantLabel: string;
  mountOffsetM: [number, number];
  nominalVacThrustKn: number;
  chamberPressureMpa: number;
  gimbalDeg: number;
  lateralForceKn: number;
  axialForceKn: number;
}

const G0 = 9.80665;

export function getPropulsionProfileForPart(
  showcase: HardwareShowcaseId,
  partId: string | null
): PropulsionProfile {
  if (showcase === 'rocket') {
    if (partId === 'sls-boosters') {
      return {
        engineLabel: 'Twin 5-Seg SRBs (2×)',
        ratedThrustKn: 32000,
        ispVacS: 269,
        ispSeaLevelS: 242,
        referenceMassKg: 2608000,
        burnRateNominalKgS: 12128,
        gravityMs2: G0,
        minThrottlePct: 75,
        maxThrottlePct: 100,
      };
    }
    if (partId === 'sls-icps') {
      return {
        engineLabel: '1× RL10B-2 (ICPS)',
        ratedThrustKn: 110.1,
        ispVacS: 465.5,
        ispSeaLevelS: 465.5,
        referenceMassKg: 58000,
        burnRateNominalKgS: 24.1,
        gravityMs2: G0,
        minThrottlePct: 100,
        maxThrottlePct: 100,
      };
    }
    if (partId === 'sls-esm') {
      return {
        engineLabel: '1× AJ10-190 (ESM OMS)',
        ratedThrustKn: 26.7,
        ispVacS: 316,
        ispSeaLevelS: 316,
        referenceMassKg: 25850,
        burnRateNominalKgS: 8.6,
        gravityMs2: G0,
        minThrottlePct: 100,
        maxThrottlePct: 100,
      };
    }
    return {
      engineLabel: '4× RS-25 Core Cluster',
      ratedThrustKn: 9116,
      ispVacS: 452.3,
      ispSeaLevelS: 366,
      referenceMassKg: 2608000,
      burnRateNominalKgS: 2055,
      gravityMs2: G0,
      minThrottlePct: 67,
      maxThrottlePct: 109,
    };
  }

  if (showcase === 'lander') {
    if (partId === 'lm-ascent') {
      return {
        engineLabel: 'Ascent Propulsion (APS)',
        ratedThrustKn: 15.6,
        ispVacS: 311,
        ispSeaLevelS: 311,
        referenceMassKg: 4670,
        burnRateNominalKgS: 5.1,
        gravityMs2: 1.625,
        minThrottlePct: 100,
        maxThrottlePct: 100,
      };
    }
    return {
      engineLabel: 'LM Descent Engine (LMDE)',
      ratedThrustKn: 46.7,
      ispVacS: 311,
      ispSeaLevelS: 311,
      referenceMassKg: 15200,
      burnRateNominalKgS: 15.3,
      gravityMs2: 1.625,
      minThrottlePct: 10,
      maxThrottlePct: 100,
    };
  }

  return {
    engineLabel: '4× RS-25 Core Cluster',
    ratedThrustKn: 9116,
    ispVacS: 452.3,
    ispSeaLevelS: 366,
    referenceMassKg: 2608000,
    burnRateNominalKgS: 2055,
    gravityMs2: G0,
    minThrottlePct: 67,
    maxThrottlePct: 109,
  };
}

export function computePropulsionExplorerMetrics(
  profile: PropulsionProfile,
  requestedThrottlePct: number,
  useVacuum = true
): PropulsionCalcResult {
  const throttlePct = Math.max(
    profile.minThrottlePct,
    Math.min(profile.maxThrottlePct, requestedThrottlePct)
  );
  const isp = useVacuum ? profile.ispVacS : profile.ispSeaLevelS;
  const exhaustVelocityMs = isp * G0;
  const scale = throttlePct / 100;
  const thrustKn =
    profile.ratedThrustKn * scale * (useVacuum ? 1 : profile.ispSeaLevelS / profile.ispVacS);
  const massFlowKgS = (thrustKn * 1000) / Math.max(1, exhaustVelocityMs);
  const weightN = profile.referenceMassKg * profile.gravityMs2;
  const twr = (thrustKn * 1000) / Math.max(1, weightN);
  const accelMs2 = (thrustKn * 1000) / Math.max(1, profile.referenceMassKg) - profile.gravityMs2;

  return {
    engineLabel: profile.engineLabel,
    throttlePct: Math.round(throttlePct),
    thrustKn: Math.round(thrustKn * 10) / 10,
    exhaustVelocityMs: Math.round(exhaustVelocityMs),
    massFlowKgS: Math.round(massFlowKgS * 10) / 10,
    twr: Math.round(twr * 100) / 100,
    accelMs2: Math.round(accelMs2 * 100) / 100,
  };
}

export const SLS_STAGE_SEQUENCE: StageSepStepSpec[] = [
  {
    step: 0,
    code: 'T-00:00',
    title: 'Integrated Pad Stack',
    altitudeLabel: '0 km · LC-39B',
    description:
      'Twin 5-segment SRBs, Core Stage with 4 RS-25s, ICPS, ESM, Orion, and Launch Abort System locked together for liftoff.',
    srbSepFactor: 0,
    coreSepFactor: 0,
    lasSepFactor: 0,
    esmSolarFoldPct: 0,
    icpsThrusting: false,
  },
  {
    step: 1,
    code: 'T+02:12',
    title: 'Twin SRB Separation',
    altitudeLabel: '~45 km · Mach 4.4',
    description:
      'Spent solid booster casings release; 8 Booster Separation Motors push them safely away while 4 RS-25 engines sustain Core acceleration.',
    srbSepFactor: 1,
    coreSepFactor: 0,
    lasSepFactor: 0,
    esmSolarFoldPct: 0,
    icpsThrusting: false,
  },
  {
    step: 2,
    code: 'T+03:20',
    title: 'LAS Tower Jettison',
    altitudeLabel: '~90 km · Thin Upper Atmo',
    description:
      'With aerodynamic heating behind Orion, the 7.3 t Launch Abort System tower fires its jettison motor and pulls clear, exposing Orion’s windows.',
    srbSepFactor: 1,
    coreSepFactor: 0,
    lasSepFactor: 1,
    esmSolarFoldPct: 0,
    icpsThrusting: false,
  },
  {
    step: 3,
    code: 'T+08:05',
    title: 'Core Stage MECO & Separation',
    altitudeLabel: '~165 km · Orbital Edge',
    description:
      '4 RS-25s throttle down and shut off cleanly; the Core Stage + LVSA interstage separate cleanly to expose the ICPS RL10B-2 vacuum bell.',
    srbSepFactor: 1,
    coreSepFactor: 1,
    lasSepFactor: 1,
    esmSolarFoldPct: 35,
    icpsThrusting: false,
  },
  {
    step: 4,
    code: 'T+54:00',
    title: 'ESM Solar Unfold & ICPS TLI Burn',
    altitudeLabel: 'LEO -> Lunar Transfer',
    description:
      'European Service Module deploys its 4 X-wing solar panels (~11.2 kW), and the RL10B-2 fires to propel Orion onto a Trans-Lunar Injection arc.',
    srbSepFactor: 1,
    coreSepFactor: 1,
    lasSepFactor: 1,
    esmSolarFoldPct: 100,
    icpsThrusting: true,
  },
];

export function getStageSepStep(stepIdx: number): StageSepStepSpec {
  const clamped = Math.max(0, Math.min(SLS_STAGE_SEQUENCE.length - 1, Math.round(stepIdx)));
  return SLS_STAGE_SEQUENCE[clamped];
}

export function getRs25EngineClusterInfo(
  engineIndex: number,
  gimbalDeg: number,
  throttlePct = 109
): Rs25EngineInfo {
  const idx = (Math.max(1, Math.min(4, Math.round(engineIndex))) as 1 | 2 | 3 | 4);
  const clampedGimbal = Math.max(-10.5, Math.min(10.5, gimbalDeg));
  const quadrants: Record<1 | 2 | 3 | 4, { label: string; pos: [number, number] }> = {
    1: { label: 'Engine #1 (Aft Port-Top)', pos: [-1.68, -1.68] },
    2: { label: 'Engine #2 (Aft Starboard-Top)', pos: [1.68, -1.68] },
    3: { label: 'Engine #3 (Aft Port-Bottom)', pos: [-1.68, 1.68] },
    4: { label: 'Engine #4 (Aft Starboard-Bottom)', pos: [1.68, 1.68] },
  };
  const thrust = 2279 * (throttlePct / 100);
  const rad = (clampedGimbal * Math.PI) / 180;
  return {
    index: idx,
    quadrantLabel: quadrants[idx].label,
    mountOffsetM: quadrants[idx].pos,
    nominalVacThrustKn: Math.round(thrust),
    chamberPressureMpa: 20.6,
    gimbalDeg: Math.round(clampedGimbal * 10) / 10,
    lateralForceKn: Math.round(thrust * Math.sin(rad) * 10) / 10,
    axialForceKn: Math.round(thrust * Math.cos(rad) * 10) / 10,
  };
}

/**
 * Resolves 2D screen label positions from live 3D projected anchor points so labels:
 * 1) remain strictly inside safe center viewport bounds (avoiding left/right drawers & toolbars),
 * 2) never overlap vertically or horizontally when subsystems sit close together.
 */
export function resolveInspectorLabelLayout(
  rawPoints: InspectorLabelPoint[],
  bounds = { minX: 22, maxX: 73, minY: 11, maxY: 82, minDy: 5.8, minDx: 17 }
): InspectorLabelPoint[] {
  const visible = rawPoints
    .filter((pt) => pt.visible)
    .map((pt) => {
      const anchorX = pt.anchorXPct ?? pt.xPct;
      const anchorY = pt.anchorYPct ?? pt.yPct;
      const clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, anchorX));
      const clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, anchorY));
      return {
        ...pt,
        anchorXPct: anchorX,
        anchorYPct: anchorY,
        xPct: clampedX,
        yPct: clampedY,
      };
    });

  // Sort top-to-bottom for deterministic 2D de-overlapping across all previously placed labels
  const sorted = [...visible].sort((a, b) => a.yPct - b.yPct);
  const overlapsAny = (
    candidate: InspectorLabelPoint,
    placed: InspectorLabelPoint[]
  ): InspectorLabelPoint | null => {
    for (const p of placed) {
      if (
        Math.abs(candidate.xPct - p.xPct) < bounds.minDx &&
        Math.abs(candidate.yPct - p.yPct) < bounds.minDy
      ) {
        return p;
      }
    }
    return null;
  };

  const placed: InspectorLabelPoint[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const curr = { ...sorted[i] };
    if (overlapsAny(curr, placed)) {
      // Try alternating left/right fan offsets around anchor first so leader lines radiate cleanly
      const baseSign = i % 2 === 0 ? 1 : -1;
      const candidateOffsets = [
        baseSign * (bounds.minDx * 1.05),
        -baseSign * (bounds.minDx * 1.05),
        baseSign * (bounds.minDx * 1.45),
        -baseSign * (bounds.minDx * 1.45),
      ];
      let resolvedSpot = false;
      for (const offset of candidateOffsets) {
        const testPt: InspectorLabelPoint = {
          ...curr,
          xPct: Math.max(
            bounds.minX,
            Math.min(bounds.maxX, (curr.anchorXPct ?? curr.xPct) + offset)
          ),
        };
        if (!overlapsAny(testPt, placed)) {
          curr.xPct = testPt.xPct;
          resolvedSpot = true;
          break;
        }
      }
      // Fallback: push downward past the blocking label if horizontal space is full
      let guard = 0;
      while (!resolvedSpot && guard++ < 20) {
        const blocker = overlapsAny(curr, placed);
        if (!blocker) break;
        const nextY = Math.max(curr.yPct + 0.1, blocker.yPct + bounds.minDy);
        if (nextY <= bounds.maxY) {
          curr.yPct = nextY;
        } else {
          curr.xPct = Math.max(
            bounds.minX,
            Math.min(bounds.maxX, (curr.anchorXPct ?? curr.xPct) + baseSign * bounds.minDx)
          );
          break;
        }
      }
    }
    placed.push(curr);
  }

  // Re-attach invisible entries unchanged so array length/order remains predictable
  const byId = new Map(placed.map((p) => [p.partId, p]));
  return rawPoints.map((pt) => byId.get(pt.partId) || { ...pt, visible: false });
}

export function getCatalogPartById(
  showcase: HardwareShowcaseId,
  partId: string | null
): HardwareSubPart | null {
  const craft = HARDWARE_CATALOG[showcase];
  if (!craft || !partId) return null;
  return craft.parts.find((p) => p.id === partId) || null;
}

export function evaluatePartFinderPick(
  showcase: HardwareShowcaseId,
  clickedPartId: string,
  targetPartId: string,
  currentScore: number
): {
  isCorrect: boolean;
  nextScore: number;
  nextTargetId: string;
  feedback: string;
} {
  const craft = HARDWARE_CATALOG[showcase];
  const clicked = craft.parts.find((p) => p.id === clickedPartId);
  if (clickedPartId === targetPartId) {
    const idx = craft.parts.findIndex((p) => p.id === targetPartId);
    const nextPart = craft.parts[(idx + 1) % craft.parts.length];
    return {
      isCorrect: true,
      nextScore: currentScore + 1,
      nextTargetId: nextPart.id,
      feedback: `Verified: ${clicked?.name || clickedPartId}. Next target loaded.`,
    };
  }
  return {
    isCorrect: false,
    nextScore: currentScore,
    nextTargetId: targetPartId,
    feedback: `Selected ${clicked?.name || clickedPartId} — locate the prompted subsystem on the 3D craft.`,
  };
}
