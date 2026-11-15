import type {
  AirlockStage,
  CampaignCarryoverState,
  OutpostConsoleState,
  OutpostInteriorRoom,
  PowerSourceMode,
  ResourceState,
  SolSummaryReport,
  SurfacePlanet,
} from './types';

export interface InteriorBaySpec {
  id: OutpostInteriorRoom;
  name: string;
  role: string;
  statusLine: string;
  fact: string;
  resourceFocus: 'O₂' | 'POWER' | 'SHIELDING';
}

export const OUTPOST_INTERIOR_BAYS: InteriorBaySpec[] = [
  {
    id: 'quarters',
    name: 'Crew Quarters & Storm Shelter',
    role: 'MARE Water-Wall Bunks · 150 mSv Safe Limit',
    statusLine: 'Radiation sleeping bags buffered behind packed water & supply totes.',
    fact: 'Surrounded by 1.5 m regolith + water bags, crew radiation stays ~62% lower during solar flares (OSDR OSD-489).',
    resourceFocus: 'SHIELDING',
  },
  {
    id: 'lab',
    name: 'Science & Core Analysis Lab',
    role: 'Gas Chromatograph & TRIDENT Cold Vault',
    statusLine: 'Analyzing Shackleton water ice & Jezero clay mineral cores.',
    fact: 'Frozen cores remain below -150°C inside the glovebox so polar water ice never sublimates away.',
    resourceFocus: 'O₂',
  },
  {
    id: 'greenhouse',
    name: 'Hydroponic Greenhouse Module',
    role: 'Dwarf Wheat, Lettuce & Bio-O₂ Loop',
    statusLine: 'Purple-pink grow LEDs photosynthesizing fresh greens and scrubbing CO₂.',
    fact: 'Plants turn crew exhaled CO₂ back into breathable O₂ while boosting crew nutrition and morale.',
    resourceFocus: 'O₂',
  },
  {
    id: 'comms',
    name: 'Life Support & DSN Comms Rack',
    role: 'ISRU Electrolyzer · MOXIE · Solar / Kilopower Bus',
    statusLine: 'Balancing 3-resource bus: POWER, AIR/O₂, and SHIELDING.',
    fact: 'Toggle Solar Towers (high midday wattage, dust sensitive) vs Kilopower Fission (steady 24/7 base load).',
    resourceFocus: 'POWER',
  },
];

export function createInitialOutpostConsoleState(planet: SurfacePlanet): OutpostConsoleState {
  return {
    open: false,
    planet,
    airlockStage: 'EXTERIOR_OPEN',
    airlockProgressPct: 100,
    activeRoom: 'quarters',
    powerSource: 'solar',
    solNumber: 1,
    kilopowerActive: false,
  };
}

export function stepAirlockCycle(
  state: OutpostConsoleState,
  dt: number
): OutpostConsoleState {
  if (state.airlockStage !== 'DEPRESSURIZING' && state.airlockStage !== 'REPRESSURIZING') {
    return state;
  }
  const nextPct = Math.min(100, state.airlockProgressPct + dt * 58);
  if (nextPct >= 100) {
    const nextStage: AirlockStage =
      state.airlockStage === 'REPRESSURIZING' ? 'SEALED_INT' : 'EXTERIOR_OPEN';
    return {
      ...state,
      airlockStage: nextStage,
      airlockProgressPct: 100,
    };
  }
  return {
    ...state,
    airlockProgressPct: nextPct,
  };
}

export function toggleOutpostAirlock(state: OutpostConsoleState): OutpostConsoleState {
  if (state.airlockStage === 'EXTERIOR_OPEN') {
    return {
      ...state,
      airlockStage: 'REPRESSURIZING',
      airlockProgressPct: 0,
    };
  }
  if (state.airlockStage === 'SEALED_INT') {
    return {
      ...state,
      airlockStage: 'DEPRESSURIZING',
      airlockProgressPct: 0,
    };
  }
  return state;
}

export function switchOutpostPowerSource(
  state: OutpostConsoleState,
  mode: PowerSourceMode
): OutpostConsoleState {
  return {
    ...state,
    powerSource: mode,
    kilopowerActive: mode === 'kilopower',
  };
}

export function buildSolSummaryReport(
  planet: SurfacePlanet,
  resources: ResourceState,
  carryover: CampaignCarryoverState,
  powerSource: PowerSourceMode,
  solNumber: number,
  dustPct: number
): SolSummaryReport {
  const highlights: string[] = [];
  if (powerSource === 'kilopower') {
    highlights.push(
      'Kilopower Stirling fission kept base power rock-steady even when dust or shadows fell.'
    );
  } else if (planet === 'mars' && dustPct > 35) {
    highlights.push(
      `Martian dust (${Math.round(dustPct)}%) dimmed solar output—consider wind-cleaning on ridges or switching to Kilopower.`
    );
  } else {
    highlights.push(
      `Solar Towers harvested sunlight cleanly (${carryover.solarGridKw} kW expansion grid online).`
    );
  }

  if (carryover.isruWaterKg > 0) {
    highlights.push(
      `ISRU electrolyzers converted ${carryover.isruWaterKg} kg polar ice into O₂ & +${carryover.isruFuelBonusPct}% propellant.`
    );
  }
  if (carryover.regolithShieldLevel > 0) {
    highlights.push(
      `Regolith Shield Berm Tier ${carryover.regolithShieldLevel} reduced storm exposure (${carryover.radiationDoseMsv} mSv total).`
    );
  }

  let weakest: 'POWER' | 'AIR / O₂' | 'SHIELDING' = 'POWER';
  if (resources.oxygen <= resources.power && resources.oxygen <= resources.shield) {
    weakest = 'AIR / O₂';
  } else if (resources.shield <= resources.power && resources.shield <= resources.oxygen) {
    weakest = 'SHIELDING';
  }

  const recommendation =
    weakest === 'POWER'
      ? 'Priority next Sol: Switch to Kilopower or survey Malapert / Máaz ridge to recharge power.'
      : weakest === 'AIR / O₂'
        ? 'Priority next Sol: Drill polar ice or run MOXIE CO₂ electrolysis to boost breathable O₂.'
        : 'Priority next Sol: Reinforce compacted regolith berm and keep dose below 150 mSv limit.';

  return {
    solNumber,
    planet,
    powerPct: Math.round(resources.power),
    oxygenPct: Math.round(resources.oxygen),
    shieldPct: Math.round(resources.shield),
    doseMsv: Math.round(carryover.radiationDoseMsv),
    powerSource,
    highlights,
    recommendation,
  };
}
