import type {
  DrillSetting,
  DrillStratum,
  DrillingConsoleState,
  SurfacePlanet,
} from './types';

export const MOON_DRILL_STRATA: DrillStratum[] = [
  {
    index: 0,
    depthRangeCm: '0–25 cm',
    name: 'Fluffy Polar Regolith',
    hardness: 0.28,
    icePct: 0.4,
    mineralNote: 'Loose electrostatically charged dust grains pulverized by micrometeorites.',
    colorHex: '#94a3b8',
  },
  {
    index: 1,
    depthRangeCm: '25–55 cm',
    name: 'Compacted Grey Regolith',
    hardness: 0.55,
    icePct: 2.1,
    mineralNote: 'Packed silicate grit holding trace solar-wind hydrogen ions.',
    colorHex: '#64748b',
  },
  {
    index: 2,
    depthRangeCm: '55–80 cm',
    name: 'Sintered Breccia Crust',
    hardness: 0.85,
    icePct: 4.8,
    mineralNote: 'Dense rocky layer requiring steady torque without overheating bit.',
    colorHex: '#475569',
  },
  {
    index: 3,
    depthRangeCm: '80–100 cm',
    name: 'Cold-Trap Permafrost Ice',
    hardness: 0.72,
    icePct: 11.6,
    mineralNote: 'Permanently shadowed water-ice veins (-200°C) ready for O₂ & LH₂ ISRU!',
    colorHex: '#38bdf8',
  },
];

export const MARS_DRILL_STRATA: DrillStratum[] = [
  {
    index: 0,
    depthRangeCm: '0–25 cm',
    name: 'Iron-Oxide Ferric Dust',
    hardness: 0.25,
    icePct: 0.6,
    mineralNote: 'Fine rusty sand blown across Jezero Crater floor.',
    colorHex: '#c2410c',
  },
  {
    index: 1,
    depthRangeCm: '25–55 cm',
    name: 'Ancient River Delta Silt',
    hardness: 0.52,
    icePct: 3.4,
    mineralNote: '3.5B-year-old layered mudstone formed when water filled Jezero Lake.',
    colorHex: '#b45309',
  },
  {
    index: 2,
    depthRangeCm: '55–80 cm',
    name: 'Máaz Basalt & Sulfate Cap',
    hardness: 0.88,
    icePct: 5.2,
    mineralNote: 'Hard volcanic crust—use GENTLE or NOMINAL torque to prevent bit jam!',
    colorHex: '#78350f',
  },
  {
    index: 3,
    depthRangeCm: '80–100 cm',
    name: 'Smectite Clay & Hydrated Salts',
    hardness: 0.68,
    icePct: 8.9,
    mineralNote: 'Organic-preserving phyllosilicate clay trapping bound water molecules!',
    colorHex: '#38bdf8',
  },
];

export function getDrillStrata(planet: SurfacePlanet): DrillStratum[] {
  return planet === 'mars' ? MARS_DRILL_STRATA : MOON_DRILL_STRATA;
}

export function createInitialDrillingState(
  objectiveId: string,
  objectiveTitle: string,
  planet: SurfacePlanet
): DrillingConsoleState {
  return {
    open: true,
    objectiveId,
    objectiveTitle,
    planet,
    depthCm: 0,
    targetDepthCm: 100,
    setting: 'NOMINAL',
    bitTempC: -40,
    torquePct: 18,
    jammed: false,
    overheated: false,
    coolingPulseSec: 0,
    isDrilling: false,
    collectedStrata: [],
    completed: false,
    statusNote: 'Select drill speed and hold [DRILL] to sample 0–100 cm into the crater bed.',
  };
}

export function setDrillSetting(
  state: DrillingConsoleState,
  setting: DrillSetting
): DrillingConsoleState {
  return {
    ...state,
    setting,
    statusNote:
      setting === 'GENTLE'
        ? 'Gentle mode: slow progress, minimal bit heat—ideal for fragile ice layers.'
        : setting === 'HIGH_TORQUE'
          ? 'High-Torque mode: blasts through basalt fast, but watch bit heat & stall!'
          : 'Nominal mode: balanced rotary + percussive 10 cm bites.',
  };
}

export function purgeAndCoolDrill(state: DrillingConsoleState): DrillingConsoleState {
  return {
    ...state,
    jammed: false,
    overheated: false,
    bitTempC: Math.max(-45, state.bitTempC - 48),
    torquePct: 14,
    coolingPulseSec: 1.0,
    isDrilling: false,
    statusNote: 'Fluted auger retracted & purged cuttings—bit cooled and unjammed!',
  };
}

export function stepDrillingConsole(
  state: DrillingConsoleState,
  dt: number,
  drillBoost = 1.0
): DrillingConsoleState {
  if (!state.open || state.completed) return state;

  const strata = getDrillStrata(state.planet);
  const currentIdx = Math.min(3, Math.floor(state.depthCm / 25));
  const stratum = strata[currentIdx];

  let temp = state.bitTempC;
  let torque = state.torquePct;
  let depth = state.depthCm;
  let jammed = state.jammed;
  let overheated = state.overheated;
  let isDrilling = state.isDrilling;
  let statusNote = state.statusNote;
  const collected = [...state.collectedStrata];
  const coolingPulseSec = Math.max(0, state.coolingPulseSec - dt);

  if (state.isDrilling && !jammed && !overheated) {
    const speedFactor =
      state.setting === 'GENTLE' ? 12 : state.setting === 'HIGH_TORQUE' ? 28 : 19;
    const rateCmPerSec = (speedFactor * drillBoost) / (0.65 + stratum.hardness * 0.7);
    depth = Math.min(100, depth + rateCmPerSec * dt);

    const heatGain =
      (state.setting === 'HIGH_TORQUE' ? 32 : state.setting === 'NOMINAL' ? 17 : 7) *
      (0.6 + stratum.hardness);
    temp = Math.min(130, temp + heatGain * dt);

    const targetTorque =
      (state.setting === 'HIGH_TORQUE' ? 78 : state.setting === 'NOMINAL' ? 54 : 34) *
      (0.55 + stratum.hardness * 0.65);
    torque = Math.min(100, torque + (targetTorque - torque) * Math.min(1, dt * 6));

    if (temp >= 95) {
      overheated = true;
      isDrilling = false;
      statusNote =
        'BIT OVERHEAT (>95°C): Water ice would vaporize! Click [PURGE & COOL] or drop to GENTLE.';
    } else if (torque >= 92 && state.setting === 'HIGH_TORQUE' && stratum.hardness > 0.75) {
      jammed = true;
      isDrilling = false;
      statusNote =
        'AUGER TORQUE STALL in hard crust! Click [PURGE & COOL] to reverse flutes cleanly.';
    } else {
      statusNote = `Coring ${stratum.name} (${Math.round(depth)} cm / 100 cm · ${stratum.icePct}% H₂O)`;
    }
  } else {
    // Passive cooling when idle
    temp = Math.max(-45, temp - 22 * dt);
    torque = Math.max(12, torque - 35 * dt);
  }

  for (const s of strata) {
    const endCm = (s.index + 1) * 25;
    if (depth >= endCm - 1 && !collected.includes(s.index)) {
      collected.push(s.index);
    }
  }

  const completed = depth >= 100;
  if (completed) {
    isDrilling = false;
    statusNote = '100 cm TRIDENT core extracted cleanly—inspect core sample layers below!';
  }

  return {
    ...state,
    depthCm: depth,
    bitTempC: Math.round(temp),
    torquePct: Math.round(torque),
    jammed,
    overheated,
    coolingPulseSec,
    isDrilling,
    collectedStrata: collected,
    completed,
    statusNote,
  };
}
