import { HARDWARE_CATALOG, HARDWARE_ORDER } from './hardwareCatalog';
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

  if (showcase === 'saturn-v') {
    if (partId === 'saturn-sii') {
      return {
        engineLabel: '5× J-2 Cryogenic Cluster (S-II)',
        ratedThrustKn: 5140,
        ispVacS: 421,
        ispSeaLevelS: 200,
        referenceMassKg: 480000,
        burnRateNominalKgS: 1245,
        gravityMs2: G0,
        minThrottlePct: 100,
        maxThrottlePct: 100,
      };
    }
    if (partId === 'saturn-sivb') {
      return {
        engineLabel: '1× J-2 Restartable Cryo (S-IVB)',
        ratedThrustKn: 1000,
        ispVacS: 421,
        ispSeaLevelS: 200,
        referenceMassKg: 120000,
        burnRateNominalKgS: 242,
        gravityMs2: G0,
        minThrottlePct: 100,
        maxThrottlePct: 100,
      };
    }
    if (partId === 'saturn-csm') {
      return {
        engineLabel: '1× AJ10-137 SPS (Apollo CSM)',
        ratedThrustKn: 91,
        ispVacS: 314,
        ispSeaLevelS: 314,
        referenceMassKg: 30300,
        burnRateNominalKgS: 29.5,
        gravityMs2: G0,
        minThrottlePct: 100,
        maxThrottlePct: 100,
      };
    }
    return {
      engineLabel: '5× F-1 Kerosene Cluster (S-IC)',
      ratedThrustKn: 34500,
      ispVacS: 304,
      ispSeaLevelS: 263,
      referenceMassKg: 2970000,
      burnRateNominalKgS: 13370,
      gravityMs2: G0,
      minThrottlePct: 100,
      maxThrottlePct: 100,
    };
  }

  if (showcase === 'falcon-9') {
    if (partId === 'falcon-stage2') {
      return {
        engineLabel: '1× Merlin 1D Vacuum (MVacD)',
        ratedThrustKn: 981,
        ispVacS: 348,
        ispSeaLevelS: 348,
        referenceMassKg: 111500,
        burnRateNominalKgS: 287.5,
        gravityMs2: G0,
        minThrottlePct: 40,
        maxThrottlePct: 100,
      };
    }
    return {
      engineLabel: '9× Merlin 1D Octaweb (Stage 1)',
      ratedThrustKn: 7607,
      ispVacS: 311,
      ispSeaLevelS: 282,
      referenceMassKg: 549054,
      burnRateNominalKgS: 2748,
      gravityMs2: G0,
      minThrottlePct: 40,
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

// ---------------------------------------------------------------------------
// GUIDED SYSTEMS TOURS & COVERAGE AUDIT (PHASE 8)
// ---------------------------------------------------------------------------

export interface GuidedTourStep {
  partId: string;
  stepNumber: number;
  totalSteps: number;
  title: string;
  narration: string;
  focusHint?: string;
}

export interface GuidedTour {
  id: string;
  craftId: HardwareShowcaseId;
  title: string;
  subtitle: string;
  summary: string;
  steps: GuidedTourStep[];
}

export const GUIDED_TOURS: GuidedTour[] = [
  {
    id: 'tour-sls',
    craftId: 'rocket',
    title: 'How SLS Works: Liftoff to TLI',
    subtitle: 'Step-by-step aerospace propulsion and staging breakdown',
    summary:
      'Walk through the exact flight mechanics of NASA’s Space Launch System Block 1, from solid booster ignition to core burn and trans-lunar injection.',
    steps: [
      {
        partId: 'sls-boosters',
        stepNumber: 1,
        totalSteps: 5,
        title: 'Step 1: Pad Liftoff & Solid Booster Thrust',
        narration:
          'At T-00:00, twin 5-segment solid rocket boosters ignite, providing over 75% of the vehicle’s 39.1 MN liftoff thrust. Burning 1.4 million kg of solid propellant in 126 seconds, they lift the 2,608-tonne stack off LC-39B before separating cleanly at 45 km altitude.',
        focusHint: 'Twin 5-segment boosters mounted on core forward & aft rings',
      },
      {
        partId: 'sls-core',
        stepNumber: 2,
        totalSteps: 5,
        title: 'Step 2: Cryogenic Core Stage Spine',
        narration:
          'The 64.6-meter orange foam core stage acts as the structural spine, holding 2.77 million liters of super-cold liquid hydrogen (-253 °C) and liquid oxygen (-183 °C). External feedlines channel propellants directly into the 4 aft RS-25 engines for over 8 minutes of powered flight.',
        focusHint: 'Central 8.4m orange cryogenic tanks and feedlines',
      },
      {
        partId: 'sls-rs25',
        stepNumber: 3,
        totalSteps: 5,
        title: 'Step 3: RS-25 Hydrolox Core Engines',
        narration:
          'Four heritage Space Shuttle Main Engines (RS-25) fire at 109% rated power level, producing 9.1 MN of vacuum thrust with an extraordinary specific impulse of 452.3 seconds. Hydraulic actuators gimbal each nozzle up to ±10.5° to steer the rocket through Max-Q and atmospheric exit.',
        focusHint: 'Four gimbaling rocket nozzles in the aft boat-tail',
      },
      {
        partId: 'sls-icps',
        stepNumber: 4,
        totalSteps: 5,
        title: 'Step 4: Interim Cryogenic Propulsion Stage (ICPS)',
        narration:
          'After core separation at 165 km altitude, the ICPS upper stage coasts in low Earth orbit before reigniting its RL10B-2 engine. With a 465.5-second vacuum Isp and extendable carbon nozzle, it delivers the critical ~3,050 m/s Trans-Lunar Injection (TLI) burn toward the Moon.',
        focusHint: 'RL10B-2 upper stage nestled inside the LVSA interstage',
      },
      {
        partId: 'sls-orion',
        stepNumber: 5,
        totalSteps: 5,
        title: 'Step 5: Orion MPCV Payload Delivery',
        narration:
          'Once TLI is achieved, Orion and the European Service Module separate from ICPS. Orion carries the crew through deep space and returns them safely through atmospheric skip re-entry at 11 km/s (Mach 32) protected by its 5.0-meter Avcoat heat shield.',
        focusHint: 'Crew module at the summit of the SLS stack',
      },
    ],
  },
  {
    id: 'tour-orion',
    craftId: 'rocket',
    title: 'How Orion Keeps Crew Alive',
    subtitle: 'Deep-space life support, thermal protection & abort systems',
    summary:
      'Explore the multi-layer environmental control, European service module propulsion, and thermal heat shield engineering that protects astronauts across cislunar space.',
    steps: [
      {
        partId: 'sls-orion',
        stepNumber: 1,
        totalSteps: 3,
        title: 'Step 1: Pressurized Cabin & ECLSS Life Support',
        narration:
          'Orion’s 9.0 m³ habitable cabin supports 4 astronauts for up to 21 days. The Environmental Control and Life Support System (ECLSS) maintains a sea-level atmospheric pressure of 101.3 kPa with a 21% O₂ / 78% N₂ mix, using amine regenerative scrubbers to remove carbon dioxide and moisture.',
        focusHint: 'Hermetic crew pressure vessel and cockpit displays',
      },
      {
        partId: 'sls-esm',
        stepNumber: 2,
        totalSteps: 3,
        title: 'Step 2: European Service Module (ESM)',
        narration:
          'Built by ESA and Airbus, the ESM provides propulsion, electrical power, water, and breathable gases. Four X-wing solar panels generate 11.2 kW of power, while external ammonia radiators reject cabin heat into space. An AJ10-190 orbital maneuvering engine provides 26.7 kN of vacuum thrust.',
        focusHint: 'Cylindrical service module with 4 deployable solar wings',
      },
      {
        partId: 'sls-las',
        stepNumber: 3,
        totalSteps: 3,
        title: 'Step 3: Launch Abort System (LAS) Escape Envelope',
        narration:
          'Positioned above Orion during launch, the LAS can pull the crew capsule away from a failing rocket in milliseconds. Its solid abort motor generates 1.78 MN of thrust to lift Orion 1.6 km high in under 5 seconds, followed by attitude control steering and tower jettison.',
        focusHint: 'Pointed solid motor escape tower atop the capsule',
      },
    ],
  },
  {
    id: 'tour-lm',
    craftId: 'lander',
    title: 'How LM Landed on the Moon',
    subtitle: 'Apollo 11 Lunar Module descent, touchdown & ascent return',
    summary:
      'Analyze the dual-stage lunar architecture: deep-throttling descent engine, energy-absorbing landing gear, and hypergolic ascent engine.',
    steps: [
      {
        partId: 'lm-descent',
        stepNumber: 1,
        totalSteps: 3,
        title: 'Step 1: Descent Stage & Deep-Throttling DPS',
        narration:
          'The Descent Propulsion System (DPS) was the first throttlable rocket engine (10% to 100%, 4.6 to 46.7 kN). Controlled by the Apollo Guidance Computer and manual astronaut throttle, it brought the lander down from a 15 km periapsis to hover and touchdown while burning hypergolic Aerozine-50 and N₂O₄.',
        focusHint: 'Cruciform octagonal descent chassis wrapped in Mylar',
      },
      {
        partId: 'lm-ascent',
        stepNumber: 2,
        totalSteps: 3,
        title: 'Step 2: Ascent Stage Cockpit & APS Engine',
        narration:
          'The ascent stage housed two standing astronauts in front of triangular triangular rendezvous windows. Upon surface departure, the 15.6 kN pressure-fed Ascent Propulsion System (APS) ignited with zero pumps or spark plugs (hypergolic contact ignition) to boost the crew back into lunar orbit.',
        focusHint: 'Habitable ascent cabin and rendezvous radar mount',
      },
      {
        partId: 'lm-rcs',
        stepNumber: 3,
        totalSteps: 3,
        title: 'Step 3: 16-Thruster Reaction Control System (RCS)',
        narration:
          'Four 4-nozzle Marquardt RCS quads mounted at 90° intervals provided 3-axis attitude control (pitch, roll, yaw) and minute translational adjustments during descent hover, lunar orbit rendezvous, and CSM docking.',
        focusHint: 'Quad cross-thruster cluster on outriggers',
      },
    ],
  },
  {
    id: 'tour-perseverance',
    craftId: 'rover',
    title: 'How Perseverance Samples Mars',
    subtitle: 'Mobility, nuclear power, robotics & sample caching',
    summary:
      'Follow the engineering path of Mars 2020 Perseverance and VIPER rovers: nuclear heat, rocker-bogie terrain negotiation, and robotic rock coring.',
    steps: [
      {
        partId: 'rover-power',
        stepNumber: 1,
        totalSteps: 4,
        title: 'Step 1: MMRTG Nuclear Power & Thermal Loop',
        narration:
          'A Multi-Mission Radioisotope Thermoelectric Generator (MMRTG) containing 4.8 kg of plutonium dioxide produces 110 W of electrical power and 2,000 W of thermal energy. Warm fluid pumped through internal heat pipes protects sensitive computers from -90 °C Martian night chills.',
        focusHint: 'Aft finned radioactive thermoelectric generator',
      },
      {
        partId: 'rover-mobility',
        stepNumber: 2,
        totalSteps: 4,
        title: 'Step 2: Rocker-Bogie Suspension & Cleated Wheels',
        narration:
          'The patented rocker-bogie differential linkage connects 6 independently driven aluminum wheels with curved titanium cleats. Without springs, it distributes weight equally across all wheels, allowing the rover to climb obstacles over 40 cm high without tipping.',
        focusHint: 'Differential pivot bogie arms and 6 drive wheels',
      },
      {
        partId: 'rover-science',
        stepNumber: 3,
        totalSteps: 4,
        title: 'Step 3: 2.1 m Robotic Arm & Coring Drill',
        narration:
          'The 45 kg turret on the robotic arm carries a rotary-percussive drill that bores into ancient Martian riverbed rocks, collecting pencil-sized core samples directly into hermetically sealed ultra-pure titanium tubes for future Earth return.',
        focusHint: 'Front-mounted heavy robotic arm and rotary coring head',
      },
      {
        partId: 'rover-comms',
        stepNumber: 4,
        totalSteps: 4,
        title: 'Step 4: High-Gain Antenna (HGA) Direct-to-Earth Link',
        narration:
          'The steerable 30 cm High-Gain Antenna points directly at Earth across 55 to 400 million km, beaming science telemetry at X-band directly to NASA’s Deep Space Network dishes in Goldstone, Madrid, and Canberra, supplemented by UHF relays to orbiting Mars orbiters.',
        focusHint: 'Steerable circular dish antenna on the rover deck',
      },
    ],
  },
  {
    id: 'tour-iss',
    craftId: 'iss',
    title: 'How ISS Sustains Human Life in LEO',
    subtitle: '108.5 m integrated truss, solar arrays & pressurized labs',
    summary:
      'Explore the largest human-made orbital structure: 120 kW solar wings, ammonia heat rejection, international laboratory modules, and Canadarm2.',
    steps: [
      {
        partId: 'iss-truss',
        stepNumber: 1,
        totalSteps: 5,
        title: 'Step 1: 108.5 m Integrated Truss Structure (ITS)',
        narration:
          'The Integrated Truss Structure is the primary structural backbone of the ISS. Assembled across dozens of space shuttle flights, it spans 108.5 meters, carrying electrical power buses, ammonia cooling pipes, and the rail track for the Mobile Servicing System.',
        focusHint: 'Central aluminum open-lattice structural truss',
      },
      {
        partId: 'iss-solar-arrays',
        stepNumber: 2,
        totalSteps: 5,
        title: 'Step 2: 8 Solar Array Wings (SAWs)',
        narration:
          'Eight solar array wings spanning 2,400 m² contain 262,400 silicon solar cells, generating up to 120 kW of DC electrical power. Solar Alpha Rotary Joints (SARJs) rotate 360° continuously to keep arrays perpendicular to the Sun throughout every 90-minute orbit.',
        focusHint: 'Golden-orange photovoltaic wing arrays at truss extremities',
      },
      {
        partId: 'iss-modules',
        stepNumber: 3,
        totalSteps: 5,
        title: 'Step 3: Pressurized Laboratory & Living Quarters',
        narration:
          'With 916 m³ of habitable volume across US, Russian, European, and Japanese modules (Zarya, Unity, Zvezda, Destiny, Columbus, Kibo, and Cupola), the station provides continuous life support, sleeping berths, microgravity science racks, and exercise equipment.',
        focusHint: 'Central cluster of cylindrical pressurized habitat cylinders',
      },
      {
        partId: 'iss-radiators',
        stepNumber: 4,
        totalSteps: 5,
        title: 'Step 4: Ammonia Thermal Control Radiators',
        narration:
          'In the vacuum of space, heat cannot be conducted away by air. High-pressure loops circulate liquid anhydrous ammonia through avionics and cabin heat exchangers, pumping it out to giant folding radiator panels that radiate excess heat into space at infrared wavelengths.',
        focusHint: 'White angled radiator panel wings flanking the truss',
      },
      {
        partId: 'iss-canadarm',
        stepNumber: 5,
        totalSteps: 5,
        title: 'Step 5: Canadarm2 Robotic Manipulator',
        narration:
          'The 17.6-meter Space Station Remote Manipulator System (Canadarm2) features 7 motorized joints and identical latching hands on each end, allowing it to "inchworm" end-over-end across anchor fixtures on the station’s exterior to berth visiting cargo vehicles.',
        focusHint: 'Articulated multi-segment robotic crane arm on truss',
      },
    ],
  },
];

export function getAllGuidedTours(): GuidedTour[] {
  return GUIDED_TOURS;
}

export function getGuidedToursForCraft(craftId: HardwareShowcaseId): GuidedTour[] {
  return GUIDED_TOURS.filter((t) => t.craftId === craftId);
}

export function getGuidedTourById(tourId: string): GuidedTour | null {
  return GUIDED_TOURS.find((t) => t.id === tourId) || null;
}

export function getTourStep(tourId: string, stepIndex: number): GuidedTourStep | null {
  const tour = getGuidedTourById(tourId);
  if (!tour || stepIndex < 0 || stepIndex >= tour.steps.length) return null;
  return tour.steps[stepIndex];
}

export interface NodeCoverageAuditResult {
  totalCrafts: number;
  totalParts: number;
  validParts: number;
  coveragePct: number;
  issues: string[];
}

export function auditVehicleNodeCoverage(): NodeCoverageAuditResult {
  const issues: string[] = [];
  let totalParts = 0;
  let validParts = 0;

  for (const craftId of HARDWARE_ORDER) {
    const craft = HARDWARE_CATALOG[craftId];
    if (!craft) {
      issues.push(`Missing craft in catalog: ${craftId}`);
      continue;
    }
    if (!craft.parts || craft.parts.length < 3) {
      issues.push(`Craft ${craftId} has fewer than 3 parts (${craft.parts?.length ?? 0})`);
    }
    for (const part of craft.parts) {
      totalParts++;
      const partErrors: string[] = [];
      if (!part.id || part.id.trim().length === 0) partErrors.push('missing id');
      if (!part.name || part.name.trim().length === 0 || part.name.startsWith('Part ')) {
        partErrors.push('missing or generic name');
      }
      if (!part.role || part.role.trim().length === 0) partErrors.push('missing role');
      if (!part.mainFunction || part.mainFunction.trim().length < 10) partErrors.push('missing mainFunction');
      if (!part.dimensions || part.dimensions.trim().length < 5) partErrors.push('missing dimensions');
      if (!part.engineeringSpecs || part.engineeringSpecs.length < 3) partErrors.push('fewer than 3 engineeringSpecs');
      if (!part.levels || !part.levels.level1What || part.levels.level1What.length < 15) partErrors.push('missing level1What');
      if (!part.levels || !part.levels.level2How || part.levels.level2How.length < 15) partErrors.push('missing level2How');
      if (!part.levels || !part.levels.level3Engineering || part.levels.level3Engineering.length < 15) {
        partErrors.push('missing level3Engineering');
      }
      if (!part.missionRelevance || part.missionRelevance.trim().length < 10) partErrors.push('missing missionRelevance');
      if (!part.quizQuestion || part.quizQuestion.options.length !== 3) partErrors.push('quizQuestion must have 3 options');
      if (!part.explodeAxis || part.explodeAxis.length !== 3) partErrors.push('explodeAxis must have 3 dimensions');
      const citation = part.sourceCitation || part.honestyNote || (craft.sources && craft.sources[0]);
      if (!citation || citation.trim().length < 5) partErrors.push('missing source citation');

      if (partErrors.length > 0) {
        issues.push(`${craftId}/${part.id}: ${partErrors.join(', ')}`);
      } else {
        validParts++;
      }
    }
  }

  const coveragePct = totalParts > 0 ? Math.round((validParts / totalParts) * 100) : 0;
  return {
    totalCrafts: HARDWARE_ORDER.length,
    totalParts,
    validParts,
    coveragePct,
    issues,
  };
}
