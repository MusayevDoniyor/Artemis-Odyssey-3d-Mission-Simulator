import { PAYLOADS, PHYSICS } from './constants';
import { clamp } from './physics';
import type {
  CampaignCarryoverState,
  CampaignMissionId,
  DonkiStatus,
  LandingState,
  LaunchState,
  LeoTransferState,
  PayloadId,
  ResourceState,
  RoverObjective,
  SpaceFlightState,
} from './types';

export type EquipmentVisualKind = 'shield' | 'oxygen' | 'solar' | 'science';

export interface MissionEquipmentOption {
  id: PayloadId;
  name: string;
  shortTag: string;
  description: string;
  tradeoffHint: string;
  visualKind: EquipmentVisualKind;
  massMultiplier: number;
  fragile: boolean;
  bonus: Partial<ResourceState>;
  drillBoost: number;
  satDeployBoost: number;
  spaceFuelFactor: number;
  perkBadge?: string;
}

export interface MissionRouteNode {
  id: string;
  label: string;
  status: 'done' | 'active' | 'pending';
}

export interface MissionBriefingObjective {
  id: string;
  label: string;
  detail: string;
  completed: boolean;
}

export interface MissionBriefingMeta {
  id: CampaignMissionId;
  code: string;
  destination: string;
  gravityLabel: string;
  title: string;
  summary: string;
  educationalNote: string;
  ctaLabel: string;
  accentHex: string;
  challengeChips: string[];
}

export const MISSION_BRIEFING_META: Record<CampaignMissionId, MissionBriefingMeta> = {
  'artemis-2': {
    id: 'artemis-2',
    code: 'MISSION 1 · ARTEMIS II',
    destination: 'Earth → Cislunar Orbit',
    gravityLabel: '1.0g Launch → Microgravity',
    title: 'SLS Launch & HERMES Relay',
    summary:
      'Ascend from LC-39B to 165 km orbit, fire TLI, deploy the HERMES weather satellite, and lock cislunar telemetry.',
    educationalNote:
      'Educational scenario: pairs Artemis II Orion flight with student-operated HERMES relay deployment.',
    ctaLabel: 'Proceed to SLS Launch',
    accentHex: '#22d3ee',
    challengeChips: ['Max-Q & SRB Staging', 'Van Allen / Solar Flare Belt'],
  },
  'artemis-3': {
    id: 'artemis-3',
    code: 'MISSION 2 · ARTEMIS III',
    destination: 'Moon · South Pole',
    gravityLabel: '0.165g Gravity',
    title: 'Lunar South Pole & VIPER',
    summary:
      'Pilot a precision 0.165g descent to Shackleton Basin and explore 4 sites for water ice, solar power, and regolith shielding.',
    educationalNote:
      'Combines Artemis III South Pole landing with VIPER ice prospecting & OSDR radiation research.',
    ctaLabel: 'Begin Lunar Descent',
    accentHex: '#38bdf8',
    challengeChips: ['Low-Sun Crater Shadows', 'Touchdown < 2.5 m/s'],
  },
  'artemis-4': {
    id: 'artemis-4',
    code: 'MISSION 3 · ARTEMIS IV',
    destination: 'Lunar Gateway · NRHO',
    gravityLabel: 'Microgravity Orbit',
    title: 'Gateway NRHO Fuel Transfer',
    summary:
      'Navigate Orion through lunar halo orbit to rendezvous with Gateway, stage lunar ISRU propellant, and weather solar flares.',
    educationalNote:
      'Tests deep-space orbital station rendezvous, solar storm shielding, and lunar ISRU propellant reuse.',
    ctaLabel: 'Begin Gateway Operations',
    accentHex: '#facc15',
    challengeChips: ['Solar Proton Storm', 'Cislunar Rendezvous Burn'],
  },
  'mars-pathfinder': {
    id: 'mars-pathfinder',
    code: 'MISSION 4 · MARS EXPEDITION',
    destination: 'Jezero Crater',
    gravityLabel: '0.38g Gravity',
    title: 'Jezero Descent & Sample Cache',
    summary:
      'Survive Mars 0.38g entry and powered descent, core ancient river delta rocks, run MOXIE O₂ generation, and manage dust.',
    educationalNote:
      'Integrates Perseverance Jezero science, MOXIE O₂ generation, and 14-minute delayed rover command queues.',
    ctaLabel: 'Begin Mars Jezero Descent',
    accentHex: '#fb923c',
    challengeChips: ['2.3× Lunar Gravity (0.38g)', 'Dust & 14m Radio Lag'],
  },
};

const MISSION_EQUIPMENT_MAP: Record<CampaignMissionId, Record<PayloadId, MissionEquipmentOption>> = {
  'artemis-2': {
    'heavy-shield': {
      id: 'heavy-shield',
      name: 'MARE Water-Wall Shield',
      shortTag: '+35% Shield',
      description: 'Hydrogen-rich water vest protects Orion crew across Earth radiation belts.',
      tradeoffHint: 'Heavy (+40% mass) — strong flare defense',
      visualKind: 'shield',
      massMultiplier: PAYLOADS['heavy-shield'].massMultiplier,
      fragile: false,
      bonus: { shield: 35 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'oxygen-tanks': {
      id: 'oxygen-tanks',
      name: 'Orion Extended O₂ Tanks',
      shortTag: '+35% Air',
      description: 'Extra supercritical O₂ reserve for multi-day cislunar transit & EVA.',
      tradeoffHint: 'Balanced (+20% mass) — steady margin',
      visualKind: 'oxygen',
      massMultiplier: PAYLOADS['oxygen-tanks'].massMultiplier,
      fragile: false,
      bonus: { oxygen: 35 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'solar-panels': {
      id: 'solar-panels',
      name: 'ESM High-Output Solar',
      shortTag: '+40% Power',
      description: 'Lightweight European Service Module solar wing boosts power & shield bus.',
      tradeoffHint: 'Light (+10% mass) — ideal for fast orbit ops',
      visualKind: 'solar',
      massMultiplier: PAYLOADS['solar-panels'].massMultiplier,
      fragile: false,
      bonus: { power: 40 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'water-drill': {
      id: 'water-drill',
      name: 'HERMES Optical Relay Kit',
      shortTag: '+15% Air & Pwr',
      description: 'Pre-aligned laser transponder deploys & locks HERMES 60% faster.',
      tradeoffHint: 'Medium (+25% mass) — +60% sat deploy speed',
      visualKind: 'science',
      massMultiplier: PAYLOADS['water-drill'].massMultiplier,
      fragile: false,
      bonus: { oxygen: 15, power: 15 },
      drillBoost: 1.0,
      satDeployBoost: 1.6,
      spaceFuelFactor: 1.0,
      perkBadge: '+60% Sat Deploy',
    },
  },
  'artemis-3': {
    'heavy-shield': {
      id: 'heavy-shield',
      name: 'Regolith & MARE Shielding',
      shortTag: '+35% Shield',
      description: 'Heavy water-wall hull shields crew during South Pole solar storms.',
      tradeoffHint: 'Heavy (+40% mass) — brake earlier on descent',
      visualKind: 'shield',
      massMultiplier: PAYLOADS['heavy-shield'].massMultiplier,
      fragile: false,
      bonus: { shield: 35 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'oxygen-tanks': {
      id: 'oxygen-tanks',
      name: 'Polar Cryo O₂ Reserve',
      shortTag: '+35% Air',
      description: 'High-pressure O₂ tanks sustain long rover traverses into cold craters.',
      tradeoffHint: 'Balanced (+20% mass) — steady landing',
      visualKind: 'oxygen',
      massMultiplier: PAYLOADS['oxygen-tanks'].massMultiplier,
      fragile: false,
      bonus: { oxygen: 35 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'solar-panels': {
      id: 'solar-panels',
      name: 'Malapert Solar Wing',
      shortTag: '+40% Power',
      description: 'Ultra-light roll-out solar wing powers rover lamps and outpost systems.',
      tradeoffHint: 'Fragile (+10% mass) — touch down < 2.5 m/s',
      visualKind: 'solar',
      massMultiplier: PAYLOADS['solar-panels'].massMultiplier,
      fragile: true,
      bonus: { power: 40 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'water-drill': {
      id: 'water-drill',
      name: 'VIPER TRIDENT Ice Auger',
      shortTag: '+15% Air & Pwr',
      description: 'Percussive auger extracts Shackleton polar water-ice cores 60% faster.',
      tradeoffHint: 'Medium (+25% mass) — +60% drill speed',
      visualKind: 'science',
      massMultiplier: PAYLOADS['water-drill'].massMultiplier,
      fragile: false,
      bonus: { oxygen: 15, power: 15 },
      drillBoost: 1.6,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
      perkBadge: '+60% Drill Speed',
    },
  },
  'artemis-4': {
    'heavy-shield': {
      id: 'heavy-shield',
      name: 'Gateway Storm Shelter',
      shortTag: '+35% Shield',
      description: 'Water-lined crew shelter attenuates galactic cosmic rays in NRHO.',
      tradeoffHint: 'Heavy (+40% mass) — peak radiation margin',
      visualKind: 'shield',
      massMultiplier: PAYLOADS['heavy-shield'].massMultiplier,
      fragile: false,
      bonus: { shield: 35 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'oxygen-tanks': {
      id: 'oxygen-tanks',
      name: 'HALO Pressurized O₂ Tank',
      shortTag: '+35% Air',
      description: 'Modular life-support canister expands Gateway cabin air reserves.',
      tradeoffHint: 'Balanced (+20% mass) — steady transit',
      visualKind: 'oxygen',
      massMultiplier: PAYLOADS['oxygen-tanks'].massMultiplier,
      fragile: false,
      bonus: { oxygen: 35 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'solar-panels': {
      id: 'solar-panels',
      name: 'PPE Roll-Out Solar Array',
      shortTag: '+40% Power',
      description: 'High-efficiency array powers Gateway electric propulsion & storm shields.',
      tradeoffHint: 'Light (+10% mass) — extra shield power',
      visualKind: 'solar',
      massMultiplier: PAYLOADS['solar-panels'].massMultiplier,
      fragile: false,
      bonus: { power: 40 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'water-drill': {
      id: 'water-drill',
      name: 'IDA Docking & Nav Suite',
      shortTag: '+15% Air & Pwr',
      description: 'Precision optical rendezvous avionics cut cislunar thruster burn by 25%.',
      tradeoffHint: 'Medium (+25% mass) — -25% fuel burn',
      visualKind: 'science',
      massMultiplier: PAYLOADS['water-drill'].massMultiplier,
      fragile: false,
      bonus: { oxygen: 15, power: 15 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 0.75,
      perkBadge: '-25% Fuel Burn',
    },
  },
  'mars-pathfinder': {
    'heavy-shield': {
      id: 'heavy-shield',
      name: 'Deep-Space Water Wall',
      shortTag: '+35% Shield',
      description: 'Blocks interplanetary solar flares on Mars while adding entry mass.',
      tradeoffHint: 'Heavy (+40% mass) — brake earlier at 0.38g',
      visualKind: 'shield',
      massMultiplier: PAYLOADS['heavy-shield'].massMultiplier,
      fragile: false,
      bonus: { shield: 35 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'oxygen-tanks': {
      id: 'oxygen-tanks',
      name: 'MOXIE CO₂-to-O₂ Core',
      shortTag: '+35% Air',
      description: 'Cryo O₂ reserves plus solid-oxide electrolysis for Jezero operations.',
      tradeoffHint: 'Balanced (+20% mass) — steady 0.38g EDL',
      visualKind: 'oxygen',
      massMultiplier: PAYLOADS['oxygen-tanks'].massMultiplier,
      fragile: false,
      bonus: { oxygen: 35 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'solar-panels': {
      id: 'solar-panels',
      name: 'Jezero Dust-Resistant Wing',
      shortTag: '+40% Power',
      description: 'Ultra-light solar array powers rover driving across Jezero dust flats.',
      tradeoffHint: 'Fragile (+10% mass) — touch down < 2.5 m/s',
      visualKind: 'solar',
      massMultiplier: PAYLOADS['solar-panels'].massMultiplier,
      fragile: true,
      bonus: { power: 40 },
      drillBoost: 1.0,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
    },
    'water-drill': {
      id: 'water-drill',
      name: 'Jezero Core Percussion Drill',
      shortTag: '+15% Air & Pwr',
      description: 'Rotary-percussive corer extracts Jezero delta & clay samples 60% faster.',
      tradeoffHint: 'Medium (+25% mass) — +60% drill speed',
      visualKind: 'science',
      massMultiplier: PAYLOADS['water-drill'].massMultiplier,
      fragile: false,
      bonus: { oxygen: 15, power: 15 },
      drillBoost: 1.6,
      satDeployBoost: 1.0,
      spaceFuelFactor: 1.0,
      perkBadge: '+60% Drill Speed',
    },
  },
};

const PAYLOAD_ORDER: PayloadId[] = ['heavy-shield', 'oxygen-tanks', 'solar-panels', 'water-drill'];

export function getMissionEquipmentList(missionId: CampaignMissionId): MissionEquipmentOption[] {
  const map = MISSION_EQUIPMENT_MAP[missionId];
  return PAYLOAD_ORDER.map((id) => map[id]);
}

export function getMissionEquipmentOption(
  missionId: CampaignMissionId,
  payloadId: PayloadId
): MissionEquipmentOption {
  return MISSION_EQUIPMENT_MAP[missionId][payloadId];
}

export function getMissionStartingBaseResources(carryover: CampaignCarryoverState): ResourceState {
  const solarBonus = Math.min(18, Math.round(carryover.solarGridKw * 0.25));
  const bermBonus = Math.min(16, carryover.regolithShieldLevel * 8);
  return {
    power: clamp(75 + solarBonus, 0, 100),
    oxygen: 75,
    shield: clamp(70 + bermBonus, 0, 100),
  };
}

export function getMissionStartingResources(
  carryover: CampaignCarryoverState,
  missionId: CampaignMissionId,
  payloadId: PayloadId
): ResourceState {
  const base = getMissionStartingBaseResources(carryover);
  const eq = getMissionEquipmentOption(missionId, payloadId);
  return {
    power: clamp(base.power + (eq.bonus.power || 0), 0, 100),
    oxygen: clamp(base.oxygen + (eq.bonus.oxygen || 0), 0, 100),
    shield: clamp(base.shield + (eq.bonus.shield || 0), 0, 100),
  };
}

export interface BriefingTelemetrySnapshot {
  carryover: CampaignCarryoverState;
  launch?: LaunchState;
  leoTransfer?: LeoTransferState;
  space?: SpaceFlightState;
  landing?: LandingState;
  objectives?: RoverObjective[];
  donki?: DonkiStatus;
}

export function evaluateBriefingMissionStatus(
  missionId: CampaignMissionId,
  snap: BriefingTelemetrySnapshot
): {
  routeNodes: MissionRouteNode[];
  objectives: MissionBriefingObjective[];
  isCleared: boolean;
} {
  const { carryover, launch, leoTransfer, space, landing, objectives = [] } = snap;
  const isCleared = carryover.completedMissions.includes(missionId);
  const isCurrentActive = carryover.activeMission === missionId;

  if (missionId === 'artemis-2') {
    const orbitDone =
      isCleared ||
      (isCurrentActive && Boolean(launch?.orbitReached || (launch && launch.altitudeKm >= PHYSICS.SLS_ORBIT_TARGET_KM)));
    const tliDone =
      isCleared || (isCurrentActive && Boolean(leoTransfer?.readyForSpaceTransition));
    const satZoneDone =
      isCleared ||
      carryover.relaySatelliteOnline ||
      (isCurrentActive && Boolean(space?.inSatDeployZone || space?.orbitalSat.deployed));
    const linkLocked =
      isCleared ||
      carryover.relaySatelliteOnline ||
      (isCurrentActive && Boolean(space?.orbitalSat.linkLocked));

    const routeNodes: MissionRouteNode[] = [
      { id: 'pad', label: 'LC-39B Pad', status: orbitDone ? 'done' : 'active' },
      {
        id: 'leo',
        label: '165 km Orbit',
        status: orbitDone ? 'done' : tliDone ? 'done' : orbitDone ? 'active' : 'pending',
      },
      {
        id: 'hermes',
        label: 'HERMES Deploy',
        status: satZoneDone ? 'done' : orbitDone ? 'active' : 'pending',
      },
      {
        id: 'link',
        label: 'Telemetry Lock',
        status: linkLocked ? 'done' : satZoneDone ? 'active' : 'pending',
      },
    ];

    const list: MissionBriefingObjective[] = [
      {
        id: 'a2-orbit',
        label: 'Ascend to 165 km LEO & ignite TLI burn',
        detail: orbitDone ? 'Orbit achieved' : 'Pad 39B launch',
        completed: orbitDone,
      },
      {
        id: 'a2-transit',
        label: 'Fly Orion to HERMES relay orbit',
        detail: satZoneDone ? 'In relay zone' : 'Cislunar transit',
        completed: satZoneDone,
      },
      {
        id: 'a2-lock',
        label: 'Deploy HERMES solar wings & lock laser link',
        detail: linkLocked ? 'Relay online' : 'Unlocks high-res Moon maps',
        completed: linkLocked,
      },
    ];

    return { routeNodes, objectives: list, isCleared };
  }

  if (missionId === 'artemis-3') {
    const moonLanded =
      isCleared || (isCurrentActive && landing?.planet === 'moon' && Boolean(landing.landed && landing.result !== 'crash'));
    const moonObjs = isCurrentActive ? objectives.filter((o) => o.planet === 'moon') : [];
    const completedSites = isCleared ? 4 : moonObjs.filter((o) => o.completed).length;
    const iceDone = isCleared || carryover.isruWaterKg >= 120 || Boolean(moonObjs.find((o) => o.id === 'shackleton-ice')?.completed);

    const routeNodes: MissionRouteNode[] = [
      { id: 'entry', label: 'Lunar Orbit', status: moonLanded ? 'done' : 'active' },
      { id: 'touch', label: '0.165g Land', status: moonLanded ? 'done' : 'pending' },
      { id: 'ice', label: 'Shackleton Ice', status: iceDone ? 'done' : moonLanded ? 'active' : 'pending' },
      {
        id: 'sites',
        label: '4/4 Survey Sites',
        status: completedSites >= 4 ? 'done' : iceDone ? 'active' : 'pending',
      },
    ];

    const list: MissionBriefingObjective[] = [
      {
        id: 'a3-land',
        label: 'Complete 0.165g South Pole powered landing',
        detail: moonLanded ? 'Touchdown safe' : 'Keep sink < 2.5 m/s',
        completed: moonLanded,
      },
      {
        id: 'a3-ice',
        label: 'Core Shackleton Rim for polar water ice',
        detail: iceDone ? `${Math.max(120, carryover.isruWaterKg)} kg H₂O logged` : 'Funds ISRU propellant',
        completed: iceDone,
      },
      {
        id: 'a3-sites',
        label: 'Deploy Malapert solar array & complete 4 sites',
        detail: `${completedSites} / 4 sites`,
        completed: completedSites >= 4,
      },
    ];

    return { routeNodes, objectives: list, isCleared };
  }

  if (missionId === 'artemis-4') {
    const docked =
      isCleared || (isCurrentActive && Boolean(space?.arrivedGateway));
    const isruReady = carryover.isruFuelBonusPct > 0;
    const stormSolved =
      isCleared || carryover.solvedAnomalies.includes('anom-artemis4-storm');

    const routeNodes: MissionRouteNode[] = [
      { id: 'llo', label: 'Lunar Orbit', status: docked ? 'done' : 'active' },
      { id: 'nrho', label: 'Gateway NRHO', status: docked ? 'done' : 'pending' },
      {
        id: 'isru',
        label: isruReady ? `+${carryover.isruFuelBonusPct}% Fuel` : 'ISRU Staging',
        status: isruReady && docked ? 'done' : docked ? 'active' : 'pending',
      },
      {
        id: 'storm',
        label: 'Storm Protocol',
        status: stormSolved ? 'done' : docked ? 'active' : 'pending',
      },
    ];

    const list: MissionBriefingObjective[] = [
      {
        id: 'a4-dock',
        label: 'Fly Orion to Lunar Gateway NRHO station',
        detail: docked ? 'Docked at Gateway' : 'Halo orbit rendezvous',
        completed: docked,
      },
      {
        id: 'a4-storm',
        label: 'Resolve cislunar solar storm radiation protocol',
        detail: stormSolved ? 'Crew shielded' : 'Triggered in flight',
        completed: stormSolved,
      },
      {
        id: 'a4-isru',
        label: 'Stage lunar ISRU fuel carryover for Mars transit',
        detail: isruReady ? `+${carryover.isruFuelBonusPct}% propellant staged` : 'Optional: earn via Mission 2',
        completed: isCleared || (docked && isruReady),
      },
    ];

    return { routeNodes, objectives: list, isCleared };
  }

  // mars-pathfinder
  const marsLanded =
    isCleared || (isCurrentActive && landing?.planet === 'mars' && Boolean(landing.landed && landing.result !== 'crash'));
  const marsObjs = isCurrentActive ? objectives.filter((o) => o.planet === 'mars') : [];
  const marsDoneCount = isCleared ? 4 : marsObjs.filter((o) => o.completed).length;
  const samplesCached = isCleared ? Math.max(2, carryover.marsSamplesCached) : carryover.marsSamplesCached;
  const moxieDone = isCleared || Boolean(marsObjs.find((o) => o.id === 'mars-moxie-o2')?.completed);

  const routeNodes: MissionRouteNode[] = [
    { id: 'edl', label: '0.38g EDL', status: marsLanded ? 'done' : 'active' },
    { id: 'pad', label: 'Jezero Pad', status: marsLanded ? 'done' : 'pending' },
    { id: 'delta', label: 'Delta Cores', status: samplesCached > 0 ? 'done' : marsLanded ? 'active' : 'pending' },
    { id: 'moxie', label: 'MOXIE & 4/4', status: marsDoneCount >= 4 ? 'done' : moxieDone ? 'active' : 'pending' },
  ];

  const list: MissionBriefingObjective[] = [
    {
      id: 'm4-land',
      label: 'Execute 0.38g Jezero EDL & powered touchdown',
      detail: marsLanded ? 'Jezero touchdown safe' : 'Brake earlier for Mars gravity',
      completed: marsLanded,
    },
    {
      id: 'm4-cores',
      label: 'Cache Jezero River Delta & clay biosignatures',
      detail: `${samplesCached} samples cached`,
      completed: isCleared || samplesCached >= 2,
    },
    {
      id: 'm4-moxie',
      label: 'Run MOXIE CO₂-to-O₂ & complete all 4 Jezero sites',
      detail: `${marsDoneCount} / 4 sites`,
      completed: marsDoneCount >= 4,
    },
  ];

  return { routeNodes, objectives: list, isCleared };
}
