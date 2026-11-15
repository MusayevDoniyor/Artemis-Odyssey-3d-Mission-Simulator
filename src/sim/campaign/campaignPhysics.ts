import { CAMPAIGN_ANOMALIES } from '../../game/constants';
import type { CampaignCarryoverState, ResourceState } from '../../game/types';
import { clamp } from '../common/math';

export function createInitialCampaignCarryover(): CampaignCarryoverState {
  return {
    activeMission: 'artemis-2',
    completedMissions: [],
    relaySatelliteOnline: false,
    highResMapUnlocked: false,
    isruWaterKg: 0,
    isruFuelBonusPct: 0,
    solarGridKw: 0,
    regolithShieldLevel: 0,
    radiationDoseMsv: 14, // Nominal LEO + Van Allen transit baseline
    marsSamplesCached: 0,
    unlockedFieldNotes: [],
    solvedAnomalies: [],
  };
}

export function applyAnomalyDecision(
  resources: ResourceState,
  carryover: CampaignCarryoverState,
  anomalyId: string,
  choiceId: string
): {
  resources: ResourceState;
  carryover: CampaignCarryoverState;
  scienceMultiplier: number;
  summary: string;
  isOptimal: boolean;
} {
  const anomaly = CAMPAIGN_ANOMALIES.find((a) => a.id === anomalyId);
  const choice = anomaly?.choices.find((c) => c.id === choiceId);
  if (!anomaly || !choice) {
    return {
      resources,
      carryover,
      scienceMultiplier: 1.0,
      summary: 'Telemetry acknowledged.',
      isOptimal: false,
    };
  }

  // Carryover bonus: regolith berms cut SPE radiation dose
  const bermReduction = clamp(carryover.regolithShieldLevel * 0.25, 0, 0.5);
  const effectiveDose = Math.round(choice.doseDeltaMsv * (1 - bermReduction));

  const nextResources: ResourceState = {
    power: clamp(resources.power + (choice.deltaResources.power || 0), 0, 100),
    oxygen: clamp(resources.oxygen + (choice.deltaResources.oxygen || 0), 0, 100),
    shield: clamp(resources.shield + (choice.deltaResources.shield || 0), 0, 100),
  };

  const nextCarryover: CampaignCarryoverState = {
    ...carryover,
    radiationDoseMsv: Math.max(0, carryover.radiationDoseMsv + effectiveDose),
    solvedAnomalies: carryover.solvedAnomalies.includes(anomalyId)
      ? carryover.solvedAnomalies
      : [...carryover.solvedAnomalies, anomalyId],
    unlockedFieldNotes: carryover.unlockedFieldNotes.includes(anomaly.requiredNoteId)
      ? carryover.unlockedFieldNotes
      : [...carryover.unlockedFieldNotes, anomaly.requiredNoteId],
  };

  return {
    resources: nextResources,
    carryover: nextCarryover,
    scienceMultiplier: choice.scienceMultiplier,
    summary: `${choice.rationale} (Crew dose +${effectiveDose} mSv · Total ${nextCarryover.radiationDoseMsv} mSv)`,
    isOptimal: choice.isOptimal,
  };
}

export type OutpostDecisionId = 'boost-shield' | 'life-support' | 'push-science';

export function applyOutpostDecision(
  resources: ResourceState,
  decision: OutpostDecisionId
): { resources: ResourceState; scienceMultiplier: number; summary: string } {
  const next = { ...resources };

  if (decision === 'boost-shield') {
    next.power = clamp(next.power - 22, 0, 100);
    next.shield = clamp(next.shield + 26, 0, 100);
    return {
      resources: next,
      scienceMultiplier: 0.9,
      summary: 'Magnetic Shield Boosted (+26% Shield, -22% Power). Science slows slightly.',
    };
  }

  if (decision === 'life-support') {
    next.power = clamp(next.power - 16, 0, 100);
    next.oxygen = clamp(next.oxygen + 22, 0, 100);
    next.shield = clamp(next.shield - 10, 0, 100);
    return {
      resources: next,
      scienceMultiplier: 1.0,
      summary: 'Oxygen Recycler Boosted (+22% Oxygen, -16% Power, -10% Shield).',
    };
  }

  next.power = clamp(next.power - 14, 0, 100);
  next.shield = clamp(next.shield - 15, 0, 100);
  return {
    resources: next,
    scienceMultiplier: 1.4,
    summary: 'Full Drill Power (+40% Drill Speed, -14% Power, -15% Shield).',
  };
}
