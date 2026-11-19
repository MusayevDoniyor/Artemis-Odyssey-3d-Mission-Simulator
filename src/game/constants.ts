import { getLiveSolarTargetPosition } from './solarSystemData';
import type {
  CampaignMissionId,
  CampaignMissionSpec,
  FieldNote,
  LandingZone,
  MissionAnomaly,
  PayloadId,
  PayloadOption,
  RoverObjective,
  SpaceTargetId,
  SurfacePlanet,
  VehiclePartSpec,
  VehicleShowcaseId,
} from './types';

export const PHYSICS = {
  EARTH_GRAVITY: 9.80665,
  EARTH_MU_M3_S2: 3.986004418e14,
  EARTH_RADIUS_M: 6371000,
  MOON_GRAVITY: 1.622,
  MARS_GRAVITY: 3.721,

  // SLS Block 1 Rocket Parameters (NASA SI Reference + Launch Time Scale 24x for ~21s interactive ascent)
  SLS_LIFTOFF_MASS_KG: 2608000,
  SLS_LIFTOFF_THRUST_N: 39140000, // Sea-level: 2x SRB (~31.7 MN) + 4x RS-25 (~7.44 MN)
  SLS_STAGE0_VAC_THRUST_N: 41800000,
  SLS_CORE_THRUST_N: 9116000, // Vacuum: 4x RS-25D/E (2,279 kN each)
  SLS_ICPS_THRUST_N: 110100, // Real Aerojet Rocketdyne RL10B-2 vacuum thrust (110.1 kN)
  SLS_STAGE0_ISP_SL_S: 269,
  SLS_STAGE0_ISP_VAC_S: 305,
  SLS_CORE_ISP_VAC_S: 452.3,
  SLS_ICPS_ISP_VAC_S: 462.0,
  SLS_FIRST_STAGE_PROP_KG: 1560000, // Twin SRB prop (1,252t) + Core prop burned during booster phase (308t)
  SLS_SRB_DRY_PAIR_KG: 200000, // Jettisoned twin empty 5-segment SRB casings
  SLS_CORE_DRY_KG: 169000, // Dry Core (85.3t) + LVSA + ICPS wet + Orion until core sep
  SLS_CORE_PROP_KG: 679000, // Remaining Core LH2/LOX burned after SRB sep
  SLS_ICPS_DRY_KG: 30000, // ICPS dry (~3.5t) + Orion MPCV (~26.5t)
  SLS_ICPS_PROP_KG: 29000, // ICPS LH2/LOX usable propellant
  SLS_DRAG_AREA_M2: 72.0, // Core + Twin SRB frontal reference area
  SLS_SRB_SEP_ALT_KM: 45,
  SLS_LAS_JETTISON_ALT_KM: 80,
  SLS_CORE_SEP_ALT_KM: 110,
  SLS_ORBIT_TARGET_KM: 165,
  LAUNCH_TIME_SCALE: 30.0,

  // Descent Vehicle Parameters (1:1 Apollo LMDE 46.7 kN Moon 0.165g & Mars 112 kN Quad-MLE 0.38g)
  LANDER_FIXED_MASS_KG: 4850,
  LANDER_PROP_MASS_KG: 6450,
  LANDER_MAX_THRUST_N: 46700,
  LANDER_MARS_MAX_THRUST_N: 112000,
  LANDER_FUEL_FLOW_KG_S: 14.8,
  LANDER_PERFECT_VY: 2.5,
  LANDER_HARD_VY: 4.8,
  LANDER_PERFECT_TILT: 12,
  LANDER_HARD_TILT: 24,

  // Rover Mobility Parameters (Expanded ±260m Moon & Mars Traversable Worlds)
  ROVER_MAX_SPEED: 13.2,
  ROVER_WALKER_SPEED: 6.4,
  ROVER_ACCEL: 8.2,
  ROVER_TURN_RATE: 1.45,
  ROVER_WHEELBASE: 2.1,
  SURFACE_BOUND_M: 260,
} as const;

export type CameraViewPresetId = 'iso' | 'front' | 'side' | 'top' | 'rear';

export const CAMERA_VIEW_PRESETS: ReadonlyArray<{
  id: CameraViewPresetId;
  label: string;
  yaw: number;
  pitch: number;
}> = [
  { id: 'iso', label: '3/4', yaw: 0.68, pitch: 0.28 },
  { id: 'front', label: 'Front', yaw: 0.0, pitch: 0.14 },
  { id: 'side', label: 'Side', yaw: Math.PI / 2, pitch: 0.14 },
  { id: 'top', label: 'Top', yaw: 0.02, pitch: 1.24 },
  { id: 'rear', label: 'Rear', yaw: Math.PI, pitch: 0.18 },
];

export const CAMPAIGN_MISSIONS: Record<CampaignMissionId, CampaignMissionSpec> = {
  'artemis-2': {
    id: 'artemis-2',
    code: 'MISSION 1 · ARTEMIS II',
    shortLabel: '1. Artemis II · Flyby',
    title: 'Artemis II: Crewed Lunar Flyby',
    planet: 'moon',
    startPhase: 'launch',
    hasSurfaceOps: false,
    nasaGrounding: 'SLS Block 1 · Orion MPCV · Cislunar Free-Return (https://www.nasa.gov/mission/artemis-ii/)',
    objectiveSummary:
      'Launch to 165 km orbit, execute TLI (~3,050 m/s), fly past the Moon on a free-return trajectory (~7,400 km perilune), and align Earth atmospheric entry corridor (11.0 km/s at -5.9°).',
    reuseInput: 'Inspect Orion MPCV & ESM systems to unlock cislunar navigation telemetry.',
    reuseOutput: 'Unlocks High-Res Lunar Maps & +60s Flare Alerts.',
  },
  'artemis-3': {
    id: 'artemis-3',
    code: 'MISSION 2 · ARTEMIS III',
    shortLabel: '2. Artemis III · LEO Docking',
    title: 'Artemis III: LEO HLS Docking Test',
    planet: 'moon',
    startPhase: 'landing',
    hasSurfaceOps: false,
    nasaGrounding: 'Orion MPCV · Commercial HLS Lander · Target Mid-2027 (https://www.nasa.gov/mission/artemis-iii/)',
    objectiveSummary:
      'Low Earth Orbit rendezvous and docking demonstration with Commercial Human Landing System (Target: Mid-2027 manifest). In development.',
    reuseInput: 'Uses Mission 1 cislunar navigation telemetry and Orion systems checkout.',
    reuseOutput: 'Unlocks Verified HLS Docking Protocols & Propellant Transfer.',
  },
  'artemis-4': {
    id: 'artemis-4',
    code: 'MISSION 3 · ARTEMIS IV',
    shortLabel: '3. Artemis IV · Lunar Landing',
    title: 'Artemis IV: South Pole Landing',
    planet: 'moon',
    startPhase: 'landing',
    hasSurfaceOps: true,
    nasaGrounding: 'First Crewed Lunar Surface Landing · Target Early 2028 (https://www.nasa.gov/mission/artemis-iv/)',
    objectiveSummary:
      'Powered terminal descent to South Pole Shackleton Rim, TRIDENT water ice core drilling, and regolith berm construction. In development.',
    reuseInput: 'Cryogenic fuel & docking protocols carried from Missions 1-2.',
    reuseOutput: 'Mined ISRU Propellant & Validated Regolith Radiation Berm.',
  },
  'mars-pathfinder': {
    id: 'mars-pathfinder',
    code: 'MISSION 4 · MARS',
    shortLabel: '4. Mars · Conceptual Architecture',
    title: 'Human Mars Exploration (Concept)',
    planet: 'mars',
    startPhase: 'landing',
    hasSurfaceOps: true,
    nasaGrounding: 'Conceptual Architecture · Jezero Crater · 2030s Concept (https://www.nasa.gov/humans-in-space/humans-to-mars/)',
    objectiveSummary:
      'Martian aerocapture, supersonic parachute descent into Jezero Crater, MOXIE O₂ generation, and long-range sample caching. In development.',
    reuseInput: 'Deep-space navigation and life support proven across Artemis lunar flights.',
    reuseOutput: 'Completes Moon-to-Mars Exploration Campaign.',
  },
};

export const CAMPAIGN_ORDER: CampaignMissionId[] = [
  'artemis-2',
  'artemis-3',
  'artemis-4',
  'mars-pathfinder',
];

export const PAYLOADS: Record<PayloadId, PayloadOption> = {
  'heavy-shield': {
    id: 'heavy-shield',
    name: 'AstroRad Ergonomic Vest (MARE)',
    shortTag: '+35% SHIELD',
    description:
      'StemRad polymer radiation vest tested on Artemis I phantoms Helga & Zohar (https://www.nasa.gov/general/artemis-i-space-radiation-research-to-help-moon-mars-explorers/).',
    tradeoffHint: 'Simulation Loadout: +40% mass tradeoff for +35% solar proton defense',
    massMultiplier: 1.4,
    fragile: false,
    bonus: { shield: 35 },
    drillBoost: 1.0,
  },
  'oxygen-tanks': {
    id: 'oxygen-tanks',
    name: 'Cryo O₂ & MOXIE Core',
    shortTag: '+35% O₂',
    description: 'Supercritical O₂ tanks + CO₂ electrolysis backup.',
    tradeoffHint: 'Balanced (+20% mass) — steady handling',
    massMultiplier: 1.2,
    fragile: false,
    bonus: { oxygen: 35 },
    drillBoost: 1.0,
  },
  'solar-panels': {
    id: 'solar-panels',
    name: 'Malapert Solar Wing',
    shortTag: '+40% POWER',
    description: 'Ultra-light roll-out solar wing for base & rover.',
    tradeoffHint: 'Fragile (+10% mass) — land <2.5 m/s!',
    massMultiplier: 1.1,
    fragile: true,
    bonus: { power: 40 },
    drillBoost: 1.0,
  },
  'water-drill': {
    id: 'water-drill',
    name: 'TRIDENT Core Auger',
    shortTag: '+15% O₂ & PWR',
    description: 'Percussive auger drills ice & rock cores 60% faster.',
    tradeoffHint: 'Medium (+25% mass) — +60% drill speed',
    massMultiplier: 1.25,
    fragile: false,
    bonus: { oxygen: 15, power: 15 },
    drillBoost: 1.6,
  },
};

export interface SolarPlanetSpec {
  id: SpaceTargetId;
  name: string;
  x: number;
  z: number;
  radius: number;
  realDistanceLabel: string;
  nominalDays: number;
  color: number;
  fact: string;
}

const relayPos0 = getLiveSolarTargetPosition('relay-orbit', 0, 'exploration');
const moonPos0 = getLiveSolarTargetPosition('moon', 0, 'exploration');
const gatewayPos0 = getLiveSolarTargetPosition('gateway', 0, 'exploration');
const marsPos0 = getLiveSolarTargetPosition('mars', 0, 'exploration');

export const SOLAR_TARGETS: Record<SpaceTargetId, SolarPlanetSpec> = {
  'relay-orbit': {
    id: 'relay-orbit',
    name: 'Cislunar Free-Return · Orion',
    x: relayPos0.x,
    z: relayPos0.z,
    radius: 2.4,
    realDistanceLabel: '384,400 km',
    nominalDays: 4.0,
    color: 0x38bdf8,
    fact: 'Translunar injection (TLI) to lunar far-side flyby (~7,400 km perilune) returning safely without LOI burn.',
  },
  moon: {
    id: 'moon',
    name: 'Moon · South Pole',
    x: moonPos0.x,
    z: moonPos0.z,
    radius: 2.2,
    realDistanceLabel: '384,400 km',
    nominalDays: 4,
    color: 0xcbd5e1,
    fact: 'Shadowed polar craters trap water ice beside sunlit power ridges.',
  },
  gateway: {
    id: 'gateway',
    name: 'Gateway · NRHO',
    x: gatewayPos0.x,
    z: gatewayPos0.z,
    radius: 2.2,
    realDistanceLabel: '405,000 km',
    nominalDays: 8,
    color: 0xfacc15,
    fact: 'Lunar halo station carrying HERMES & IDA radiation instruments.',
  },
  mars: {
    id: 'mars',
    name: 'Mars · Jezero',
    x: marsPos0.x,
    z: marsPos0.z,
    radius: 2.6,
    realDistanceLabel: '225,000,000 km',
    nominalDays: 210,
    color: 0xf97316,
    fact: '0.38g Mars entry into Jezero Crater fueled by lunar ISRU reserves.',
  },
};

export const MOON_LANDING_ZONES: LandingZone[] = [
  {
    id: 0,
    code: 'PAD ALPHA',
    name: 'Artemis Base Pad',
    x: 0,
    z: 0,
    radius: 9.5,
    multiplier: 1.0,
    bonusPts: 250,
    color: 0x38bdf8,
    hint: 'Flat sintered landing pad beside Base Camp.',
  },
  {
    id: 1,
    code: 'ZONE BRAVO',
    name: 'Shackleton Rim Bench',
    x: 34,
    z: -30,
    radius: 7.0,
    multiplier: 1.5,
    bonusPts: 500,
    color: 0xf59e0b,
    hint: 'Elevated rim overlooking Shackleton Cold Trap (×1.5 score).',
  },
  {
    id: 2,
    code: 'ZONE CHARLIE',
    name: 'Malapert Sunlit Ridge',
    x: -36,
    z: -24,
    radius: 6.5,
    multiplier: 2.0,
    bonusPts: 900,
    color: 0x10b981,
    hint: 'Sunlit mountain ridge awarding +20% Power on landing (×2.0 score).',
  },
];

export const MARS_LANDING_ZONES: LandingZone[] = [
  {
    id: 0,
    code: 'PAD DELTA',
    name: 'Octavia E. Butler Site',
    x: 0,
    z: 0,
    radius: 9.5,
    multiplier: 1.0,
    bonusPts: 300,
    color: 0xf97316,
    hint: 'Flat Jezero crater floor beside the Mars Base & MOXIE station.',
  },
  {
    id: 1,
    code: 'ZONE ECHO',
    name: 'Ancient Delta Apron',
    x: 34,
    z: -32,
    radius: 7.0,
    multiplier: 1.5,
    bonusPts: 600,
    color: 0x38bdf8,
    hint: 'Layered river delta fan near clay biosignatures (×1.5 score).',
  },
  {
    id: 2,
    code: 'ZONE FOXTROT',
    name: 'Máaz Basalt Terrace',
    x: -38,
    z: -22,
    radius: 6.5,
    multiplier: 2.0,
    bonusPts: 950,
    color: 0x10b981,
    hint: 'High volcanic ridge awarding +20% Power on touchdown (×2.0 score).',
  },
];

export function getLandingZones(planet: SurfacePlanet): LandingZone[] {
  return planet === 'mars' ? MARS_LANDING_ZONES : MOON_LANDING_ZONES;
}

// Expanded Lunar South Pole Objectives across ±260m arena
export const MOON_OBJECTIVES: RoverObjective[] = [
  {
    id: 'moon-shackleton-ice',
    planet: 'moon',
    title: 'Shackleton Cold Trap Ice',
    siteName: 'Shackleton Ice',
    instrument: 'TRIDENT 1m Drill',
    x: 128,
    z: -142,
    color: 0x38bdf8,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { oxygen: 22, power: 8 },
    isruWaterGainKg: 420,
    isruFuelGainPct: 18,
    unlockNoteId: 'note-isru-electrolysis',
    rewardText: '+420 kg H₂O · +18% Fuel · +22% O₂',
    nasaFact:
      'Polar crater ice (-200°C) splits via electrolysis into breathable O₂ and Artemis IV LH₂ propellant.',
  },
  {
    id: 'moon-malapert-solar',
    planet: 'moon',
    title: 'Malapert Solar Ridge',
    siteName: 'Malapert Ridge',
    instrument: 'PV Relay Bus',
    x: -148,
    z: -108,
    color: 0xfacc15,
    durationSec: 2.1,
    progress: 0,
    completed: false,
    reward: { power: 30 },
    solarGainKw: 45,
    unlockNoteId: 'note-malapert-sunlight',
    rewardText: '+45 kW Grid · +30% Power',
    nasaFact:
      'Malapert Peak receives sunlight 89% of the year to power shadowed crater ops.',
  },
  {
    id: 'moon-nobile-regolith',
    planet: 'moon',
    title: 'Nobile Regolith Berm',
    siteName: 'Nobile Quarry',
    instrument: 'OSDR Berm Probe',
    x: 118,
    z: 134,
    color: 0x34d399,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { shield: 26 },
    shieldLevelGain: 1,
    unlockNoteId: 'note-osdr-regolith',
    rewardText: '+1 Berm Tier · +26% Shield',
    nasaFact:
      'OSDR OSD-489: 1.5 m packed regolith absorbs ~62% of solar storm proton dose.',
  },
  {
    id: 'moon-cabeus-hydrogen',
    planet: 'moon',
    title: 'Cabeus Hydrogen Scan',
    siteName: 'Cabeus Basin',
    instrument: 'Neutron Spectrometer',
    x: -124,
    z: 152,
    color: 0xc084fc,
    durationSec: 2.2,
    progress: 0,
    completed: false,
    reward: { oxygen: 14, shield: 14 },
    isruWaterGainKg: 280,
    isruFuelGainPct: 12,
    rewardText: '+280 kg H₂O · +12% Fuel · +14% O₂ & Shield',
    nasaFact:
      'VIPER Neutron Spectrometer maps buried hydrogen 1 m deep on the move.',
  },
];

// Mars Jezero Crater Objectives across ±260m arena
export const MARS_OBJECTIVES: RoverObjective[] = [
  {
    id: 'mars-jezero-delta',
    planet: 'mars',
    title: 'Jezero River Delta Core',
    siteName: 'Jezero Delta',
    instrument: 'SHERLOC Corer',
    x: 126,
    z: -134,
    color: 0x38bdf8,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { power: 10 },
    marsSamplesGain: 2,
    unlockNoteId: 'note-jezero-delta',
    rewardText: '+2 Biosignature Cores · +10% Power',
    nasaFact:
      'Ancient Jezero river clays preserve 3.5B-year-old organic mineral signatures.',
  },
  {
    id: 'mars-maaz-ridge',
    planet: 'mars',
    title: 'Máaz Basalt Ridge',
    siteName: 'Máaz Ridge',
    instrument: 'SuperCam & Walker',
    x: -148,
    z: -96,
    color: 0xfacc15,
    durationSec: 2.2,
    progress: 0,
    completed: false,
    reward: { power: 26 },
    solarGainKw: 30,
    marsSamplesGain: 1,
    rewardText: 'Clean Dust · +26% Power · +1 Core',
    nasaFact:
      'Walker gait climbs steep basalt in 0.38g while ridge winds clear solar dust.',
  },
  {
    id: 'mars-carbonate-shore',
    planet: 'mars',
    title: 'Carbonate Lake Margin',
    siteName: 'Carbonate Shelf',
    instrument: 'PIXL + RAD Dosimeter',
    x: 112,
    z: 142,
    color: 0x34d399,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { shield: 25 },
    shieldLevelGain: 1,
    unlockNoteId: 'note-mars-radiation',
    rewardText: '+25% Shield · OSDR RAD Data',
    nasaFact:
      'OSDR OSD-366: Mars CO₂ air blocks partial radiation; storm shelters remain vital.',
  },
  {
    id: 'mars-moxie-depot',
    planet: 'mars',
    title: 'MOXIE O₂ & Fuel Cache',
    siteName: 'MOXIE Depot',
    instrument: 'CO₂ Electrolysis',
    x: -118,
    z: 128,
    color: 0xf97316,
    durationSec: 2.2,
    progress: 0,
    completed: false,
    reward: { oxygen: 30 },
    isruFuelGainPct: 15,
    marsSamplesGain: 1,
    unlockNoteId: 'note-moxie-isru',
    rewardText: '+30% O₂ · +15% Ascent Fuel · +1 Core',
    nasaFact:
      'MOXIE converts 95% Martian CO₂ at 800°C into breathable O₂ and ascent oxidizer.',
  },
];

export function getPlanetObjectives(planet: SurfacePlanet): RoverObjective[] {
  return planet === 'mars' ? MARS_OBJECTIVES : MOON_OBJECTIVES;
}

// Astronaut Field Notebook ("Learn -> Apply" Dual Reuse Loop)
export const FIELD_NOTES: FieldNote[] = [
  {
    id: 'note-orion-water-shield',
    category: 'osdr',
    title: 'AstroRad Radiation Shielding (MARE)',
    sourceRef: 'OSDR OSD-569 · MARE (nasa.gov)',
    summary:
      'High-density ergonomic polymer vest shielding human torso stem cells from SPE solar protons.',
    appliedRule: 'Orient crew compartment & radiation storm shelter away from solar flare flux.',
  },
  {
    id: 'note-hermes-relay',
    category: 'donki',
    title: 'Cislunar Navigation & Free-Return Telemetry',
    sourceRef: 'NASA Deep Space Network · Orion O2O',
    summary:
      'High-precision optical & radiometric tracking verifies cislunar free-return and streams high-res lunar terrain.',
    appliedRule: 'Verify TLI & cislunar nav lock before landing to unlock High-Res Surface Maps.',
  },
  {
    id: 'note-isru-electrolysis',
    category: 'isru',
    title: 'Water Electrolysis (H₂O → O₂ + LH₂)',
    sourceRef: 'Artemis III · VIPER',
    summary: 'Polar water ice splits into crew oxygen and cryogenic rocket propellant.',
    appliedRule: 'Shackleton & Cabeus ice directly refills Artemis IV & Mars fuel.',
  },
  {
    id: 'note-malapert-sunlight',
    category: 'vehicle',
    title: 'Malapert Ridge & Walker Gait',
    sourceRef: 'South Pole Power Arch.',
    summary: 'Sunlit ridges charge panels while Walker suspension prevents slope slip.',
    appliedRule: 'Press [4] Walker + [F] Lift on steep craters and basalt ridges.',
  },
  {
    id: 'note-osdr-regolith',
    category: 'osdr',
    title: 'Compacted Regolith Berm',
    sourceRef: 'OSDR OSD-489 & OSD-612',
    summary: '1.5 m lunar soil shields habitats from primary solar proton bursts.',
    appliedRule: 'Survey Nobile Berm to cut flare drain below 150 mSv limit.',
  },
  {
    id: 'note-moxie-isru',
    category: 'isru',
    title: 'MOXIE O₂ & Mars Dust Storms',
    sourceRef: 'MOXIE · OSDR OSD-366',
    summary: 'MOXIE produces O₂ from Mars CO₂ while dust storms cut solar output ~35%.',
    appliedRule: 'Dim headlights during storms, keep power >35%, and run MOXIE.',
  },
  {
    id: 'note-jezero-delta',
    category: 'vehicle',
    title: '0.38g Jezero Braking Profile',
    sourceRef: 'Mars 2020 · Jezero',
    summary: 'Mars gravity (3.72 m/s²) is 2.3× stronger than the Moon (1.63 m/s²).',
    appliedRule: 'Fire retro-brakes higher (~65–90 m) on Mars before final flare.',
  },
];

// Real Engineering Anomalies solved by applying Field Notes
export const CAMPAIGN_ANOMALIES: MissionAnomaly[] = [
  {
    id: 'anom-artemis2-spe',
    missionId: 'artemis-2',
    title: 'Solar Particle Alert · Orion Orbit',
    context: 'High-energy solar protons incoming. Shield Orion while aligning HERMES.',
    requiredNoteId: 'note-orion-water-shield',
    nasaRef: 'DONKI SPE · OSDR OSD-569',
    resolvedChoiceId: null,
    resolvedSummary: null,
    choices: [
      {
        id: 'orient-water-wall',
        label: 'Point Water Bay Sunward + MARE Shield (-10% Pwr, +18% Shd)',
        rationale: 'OSDR OSD-569: water tanks cut proton dose by ~48% with minimal power draw.',
        isOptimal: true,
        deltaResources: { power: -10, shield: 18 },
        doseDeltaMsv: 8,
        scienceMultiplier: 1.25,
      },
      {
        id: 'burn-full-escape',
        label: 'Emergency Max Burn Without Turning (-24% Pwr, -14% Shd)',
        rationale: 'Drains fuel & leaves thin crew cabin facing peak proton flux.',
        isOptimal: false,
        deltaResources: { power: -24, shield: -14 },
        doseDeltaMsv: 34,
        scienceMultiplier: 0.9,
      },
      {
        id: 'power-down-all',
        label: 'Shut Down Telemetry & Drift (+6% Pwr, -18% Shd)',
        rationale: 'Breaks satellite link and spikes crew radiation exposure.',
        isOptimal: false,
        deltaResources: { power: 6, shield: -18 },
        doseDeltaMsv: 42,
        scienceMultiplier: 0.85,
      },
    ],
  },
  {
    id: 'anom-artemis3-storm',
    missionId: 'artemis-3',
    title: 'M-Class Flare · South Pole',
    context: 'Solar flare hitting Base Camp. Choose outpost protection plan.',
    requiredNoteId: 'note-osdr-regolith',
    nasaRef: 'DONKI · OSDR OSD-489 Berm',
    resolvedChoiceId: null,
    resolvedSummary: null,
    choices: [
      {
        id: 'berm-and-shelter',
        label: 'Shelter Under Regolith Berm (-10% Pwr, +24% Shd, +6% O₂)',
        rationale: 'OSDR OSD-489: regolith blocks protons passively and saves battery.',
        isOptimal: true,
        deltaResources: { power: -10, shield: 24, oxygen: 6 },
        doseDeltaMsv: 10,
        scienceMultiplier: 1.2,
      },
      {
        id: 'active-shield-only',
        label: 'Max Magnetic Shield Only (-24% Pwr, +22% Shd)',
        rationale: 'Protects crew (+22% Shield) at steep electrical cost.',
        isOptimal: false,
        deltaResources: { power: -24, shield: 22 },
        doseDeltaMsv: 16,
        scienceMultiplier: 1.0,
      },
      {
        id: 'overdrive-drill',
        label: 'Keep Full-Speed Drilling (-16% Pwr, -18% Shd)',
        rationale: 'Boosts drill yield, but exposes crew to 36 mSv dose spike.',
        isOptimal: false,
        deltaResources: { power: -16, shield: -18 },
        doseDeltaMsv: 36,
        scienceMultiplier: 1.4,
      },
    ],
  },
  {
    id: 'anom-artemis4-gateway',
    missionId: 'artemis-4',
    title: 'Gateway NRHO · ISRU Transfer',
    context: 'Elevated GCR flux during Mars fuel loading. Pick transfer protocol.',
    requiredNoteId: 'note-isru-electrolysis',
    nasaRef: 'Gateway IDA · Artemis III ISRU',
    resolvedChoiceId: null,
    resolvedSummary: null,
    choices: [
      {
        id: 'cryo-transfer-shield',
        label: 'Shield With ISRU LH₂ Tanks (-8% Pwr, +12% O₂, +20% Shd)',
        rationale: 'Lunar fuel tanks double as hydrogen radiation shielding.',
        isOptimal: true,
        deltaResources: { power: -8, oxygen: 12, shield: 20 },
        doseDeltaMsv: 9,
        scienceMultiplier: 1.3,
      },
      {
        id: 'fast-transfer',
        label: 'High-Thrust Direct Transfer (-20% Pwr, -10% O₂, -8% Shd)',
        rationale: 'Saves time but strains bus power and O₂ reserves.',
        isOptimal: false,
        deltaResources: { power: -20, oxygen: -10, shield: -8 },
        doseDeltaMsv: 24,
        scienceMultiplier: 1.0,
      },
    ],
  },
  {
    id: 'anom-mars-dust',
    missionId: 'mars-pathfinder',
    title: 'Jezero Dust Storm · Solar -35%',
    context: 'Iron-oxide dust dims sunlight by 35%. Set rover response.',
    requiredNoteId: 'note-moxie-isru',
    nasaRef: 'Jezero Met · OSDR OSD-366',
    resolvedChoiceId: null,
    resolvedSummary: null,
    choices: [
      {
        id: 'moxie-low-power',
        label: 'Dim Lights, Run MOXIE & Wind Clean (+14% Pwr, +16% O₂, +10% Shd)',
        rationale: 'OSD-366 power discipline keeps O₂ positive and cleans arrays.',
        isOptimal: true,
        deltaResources: { power: 14, oxygen: 16, shield: 10 },
        doseDeltaMsv: 11,
        scienceMultiplier: 1.25,
      },
      {
        id: 'push-max-speed',
        label: 'Drive Max Speed With Floodlights (-26% Pwr, -12% Shd)',
        rationale: 'Clogs arrays quickly and drains rover batteries.',
        isOptimal: false,
        deltaResources: { power: -26, shield: -12 },
        doseDeltaMsv: 28,
        scienceMultiplier: 0.9,
      },
    ],
  },
];

export const VEHICLE_CATALOG: Partial<
  Record<
    VehicleShowcaseId,
    { title: string; subtitle: string; summary: string; parts: VehiclePartSpec[] }
  >
> = {
  rocket: {
    title: 'SLS Block 1 Launch System',
    subtitle: '111.3 m · 2,610 t · 4× RS-25 + Twin SRBs',
    summary: 'Heavy-lift launcher sending Orion toward lunar transfer.',
    parts: [
      {
        id: 'sls-core',
        name: 'Core Stage & 4× RS-25',
        role: 'LH₂ / LOX Propulsion',
        fact: '65.1 m orange cryo core feeds four RS-25 engines (~2,000 kN vacuum thrust each, 452s Isp).',
        unlockNoteId: 'note-isru-electrolysis',
      },
      {
        id: 'sls-boosters',
        name: 'Twin 5-Segment SRBs',
        role: '75% Liftoff Thrust',
        fact: '54.9 m solid boosters deliver primary Pad 39B acceleration for 2 minutes before jettison.',
      },
      {
        id: 'sls-icps',
        name: 'LVSA & ICPS Upper Stage',
        role: 'RL10 Trans-Lunar Burn',
        fact: 'Cryogenic LH₂/LOX stage powered by a single 110 kN RL10B-2 engine pushing Orion toward the Moon.',
        unlockNoteId: 'note-isru-electrolysis',
      },
      {
        id: 'sls-upper',
        name: 'Orion Crew Module & ESM',
        role: 'Crew Cabin, ESM & LAS',
        fact: '5.0 m crew capsule; AstroRad ergonomic polymer vest protects vital organs during solar particle events (OSD-569).',
        unlockNoteId: 'note-orion-water-shield',
      },
    ],
  },
  satellite: {
    title: 'HERMES Weather & Relay Sat',
    subtitle: 'Kapton Bus · Twin PV Wings · Ka-Band & Laser Dish',
    summary: 'Orbital sentinel mapping craters and forecasting DONKI solar flares.',
    parts: [
      {
        id: 'sat-bus',
        name: 'Kapton Bus & Magnetometer',
        role: 'Space Weather Core',
        fact: 'Detects coronal mass ejections +60 seconds early for Moon & Mars surface crews.',
        unlockNoteId: 'note-hermes-relay',
      },
      {
        id: 'sat-solar',
        name: 'Twin Roll-Out Solar Wings',
        role: 'Zero-G Power Bus',
        fact: 'Unfold after orbital release to power continuous Ka-band and laser radar.',
        unlockNoteId: 'note-malapert-sunlight',
      },
      {
        id: 'sat-dish',
        name: 'Twin High-Gain & Laser Dishes',
        role: 'Topographic Mapping',
        fact: 'Streams high-res South Pole & Jezero elevation contours directly to Rover maps.',
        unlockNoteId: 'note-hermes-relay',
      },
    ],
  },
  lander: {
    title: 'Lunar / Mars Descent Lander',
    subtitle: '7.3 m × 7.0 m · 15,000 kg · 0.165g / 0.38g',
    summary: 'Two-stage lander with 4 shock legs, RCS quads, and braking engine.',
    parts: [
      {
        id: 'lm-descent',
        name: 'Descent Stage & 4 Shock Legs',
        role: 'Fuel & Touchdown Gear',
        fact: 'Gold-foil octagonal stage tuned for Moon (1.63 m/s²) and Mars (3.72 m/s²) landings.',
        unlockNoteId: 'note-jezero-delta',
      },
      {
        id: 'lm-ascent',
        name: 'Pressurized Ascent Cabin',
        role: 'Crew & NRHO Dock',
        fact: 'Canted landing windows, front egress hatch, and Gateway NRHO docking collar.',
      },
      {
        id: 'lm-rcs',
        name: '4-Quad RCS & Main Bell',
        role: 'Attitude & Braking',
        fact: 'RCS thrusters level pitch/roll while gimbaled bell cancels descent speed under 2.5 m/s.',
      },
    ],
  },
  rover: {
    title: 'VIPER / Jezero Explorer Rover',
    subtitle: '2.0 m × 1.8 m · 430 kg · Rocker-Bogie + Walker',
    summary: '4-wheel explorer with 1m TRIDENT drill, stereo mast, and solar wings.',
    parts: [
      {
        id: 'rover-mobility',
        name: 'Rocker-Bogie & Walker Gait',
        role: 'Drive · Crab · Spin · Walk',
        fact: 'Walker Step [4] + High Clearance [F] climbs steep crater rims and Mars basalt with low slip.',
        unlockNoteId: 'note-malapert-sunlight',
      },
      {
        id: 'rover-science',
        name: 'TRIDENT Core Auger',
        role: '1m Ice & Rock Corer',
        fact: 'Drills polar water ice and Jezero river delta sediments to fuel ISRU O₂ and LH₂.',
        unlockNoteId: 'note-isru-electrolysis',
      },
      {
        id: 'rover-power',
        name: 'Dust-Tolerant Solar Wings',
        role: '450 W Power Bus',
        fact: 'Captures low polar sun; Mars ridge winds clear settled iron-oxide dust off cells.',
        unlockNoteId: 'note-moxie-isru',
      },
      {
        id: 'rover-comms',
        name: 'Stereo Camera Mast & Dish',
        role: '360° Nav & Relay Link',
        fact: 'Syncs telemetry with HERMES Relay Satellite to keep tactical terrain maps live.',
        unlockNoteId: 'note-hermes-relay',
      },
    ],
  },
  outpost: {
    title: 'Artemis & Mars Base Camp',
    subtitle: '28 m × 24 m · ISRU Electrolyzer + Regolith Berm',
    summary: 'Geodesic crew habitat, MOXIE/ISRU plant, solar towers, and pad.',
    parts: [
      {
        id: 'base-habitat',
        name: 'Geodesic Dome & Regolith Berm',
        role: 'Crew Quarters & Shield',
        fact: '1.5 m compacted soil berm cuts solar proton dose by ~62% (OSDR OSD-489).',
        unlockNoteId: 'note-osdr-regolith',
      },
      {
        id: 'base-power',
        name: 'Solar Towers & ISRU / MOXIE',
        role: 'O₂ & LH₂ Production',
        fact: 'Turns polar ice or Martian CO₂ into breathable oxygen and ascent fuel.',
        unlockNoteId: 'note-moxie-isru',
      },
      {
        id: 'base-comms',
        name: 'Deep Space Dish & Pad Control',
        role: 'DONKI Early Warning',
        fact: 'Receives HERMES flare alerts so surface teams shelter before proton arrival.',
        unlockNoteId: 'note-hermes-relay',
      },
    ],
  },
  'saturn-v': {
    title: 'Apollo Saturn V Launch Vehicle',
    subtitle: '110.6 m · 2,970 t · 5× F-1 + 5× J-2 + 1× J-2',
    summary: 'NASA Moon rocket that sent Apollo 8 through 17 crews into translunar injection.',
    parts: [
      {
        id: 'saturn-sic',
        name: 'S-IC First Stage & 5× F-1s',
        role: '34.5 MN Pad Acceleration',
        fact: 'Five Rocketdyne F-1 engines burn 15 tons of RP-1 kerosene and LOX every second.',
      },
      {
        id: 'saturn-sii',
        name: 'S-II Second Stage & 5× J-2s',
        role: 'Cryogenic Upper Ascent',
        fact: 'Burns liquid hydrogen at 421s vacuum Isp to climb to 175 km altitude.',
      },
      {
        id: 'saturn-sivb',
        name: 'S-IVB Third Stage & 1× J-2',
        role: 'Restartable TLI Burn',
        fact: 'Reignites in Earth orbit for 5.8 minutes to push Apollo to 10.8 km/s lunar escape speed.',
      },
      {
        id: 'saturn-iu-sla',
        name: 'Instrument Unit & SLA',
        role: 'LVDC Guidance & LM Bay',
        fact: 'IBM triple-redundant LVDC guidance computer plus 4 hinged petals housing the Lunar Module.',
      },
      {
        id: 'saturn-csm',
        name: 'Apollo Command & Service Module',
        role: 'Crew Habitat & SPS Engine',
        fact: 'Carried 3 astronauts and fired hypergolic SPS engine for lunar capture and Earth return.',
      },
      {
        id: 'saturn-les',
        name: 'Launch Escape Tower',
        role: 'Pad & In-Flight Abort',
        fact: '667 kN solid rocket motor capable of rocketing the crew capsule clear at 15g.',
      },
    ],
  },
  'falcon-9': {
    title: 'Falcon 9 Full Thrust Launch System',
    subtitle: '70.0 m · 549 t · Octaweb 9× Merlin 1D',
    summary: 'Commercial orbital launcher with propulsive vertical booster recovery.',
    parts: [
      {
        id: 'falcon-stage1',
        name: 'Booster Core & 9× Merlin 1D',
        role: 'Reusable Booster Stage',
        fact: 'Octaweb engine cluster throttling from 40% to 100% for pinpoint vertical landing.',
      },
      {
        id: 'falcon-grid-fins',
        name: '4× Titanium Grid Fins',
        role: 'Hypersonic Re-entry Steering',
        fact: 'Single forged titanium grid fins steering the booster through Mach 4.5 entry heating.',
      },
      {
        id: 'falcon-landing-legs',
        name: '4× Carbon Fiber Legs',
        role: 'Vertical Touchdown Gear',
        fact: '18m stance pneumatic deployable legs with aluminum honeycomb crush cores.',
      },
      {
        id: 'falcon-interstage',
        name: 'Composite Interstage',
        role: 'Pneumatic Separation',
        fact: 'Carbon composite structure with four debris-free pneumatic pushers.',
      },
      {
        id: 'falcon-stage2',
        name: 'Stage 2 & Merlin Vacuum',
        role: 'Orbital Insertion',
        fact: 'Single MVacD engine with 165:1 radiation-cooled niobium nozzle yielding 348s Isp.',
      },
      {
        id: 'falcon-fairing',
        name: '5.2m Clamshell Fairing',
        role: 'Payload Protection',
        fact: 'Split carbon composite fairing halves with cold-gas thrusters and parafoil recovery.',
      },
    ],
  },
};

export const OSDR_FACTS = [
  {
    code: 'NASA DONKI',
    summary: 'Live solar flare & CME database driving orbital and surface storm alerts.',
  },
  {
    code: 'NASA OSDR',
    summary: 'Radiation biology studies: OSD-569 MARE, OSD-612 BioSentinel, OSD-489 Berm, OSD-366 Mars RAD.',
  },
  {
    code: 'Artemis → Mars',
    summary: 'Moon (0.165g) polar ice ISRU refuels Gateway NRHO & Jezero Crater (0.38g) operations.',
  },
];

export interface LaunchPartDetail {
  id: string;
  name: string;
  role: string;
  spec: string;
  fact: string;
  unlockNoteId?: string;
}

export const LAUNCH_PART_DETAILS: Record<string, LaunchPartDetail> = {
  'sls-core': {
    id: 'sls-core',
    name: 'Core Stage & 4× RS-25',
    role: 'Main Cryogenic Stage',
    spec: '65.1 m · LH₂/LOX · 8,800 kN Vacuum',
    fact: 'Feeds four RS-25 engines with super-cold liquid hydrogen (-253°C) and oxygen (-183°C) for 8 minutes.',
    unlockNoteId: 'note-isru-electrolysis',
  },
  'sls-boosters': {
    id: 'sls-boosters',
    name: 'Twin 5-Segment SRBs',
    role: 'Liftoff Solid Boosters',
    spec: '54.9 m · ~32,000 kN Combined',
    fact: 'Provides over 75% of pad liftoff thrust before firing separation motors cleanly at 45 km altitude.',
  },
  'sls-icps': {
    id: 'sls-icps',
    name: 'ICPS & Stage Adapter (LVSA)',
    role: 'Trans-Lunar Injection',
    spec: '1× RL10B-2 · 110 kN · 465 s Isp',
    fact: 'Ignites in vacuum after Core cutoff to raise Orion from 165 km orbit onto a lunar transfer arc.',
    unlockNoteId: 'note-isru-electrolysis',
  },
  'sls-upper': {
    id: 'sls-upper',
    name: 'Orion Capsule, ESM & LAS Tower',
    role: 'Crew & Abort System',
    spec: '5.0 m Cabin · AstroRad Vest Shield',
    fact: 'European Service Module supplies power/air while AstroRad ergonomic polymer vest shields crew from proton bursts (OSD-569).',
    unlockNoteId: 'note-orion-water-shield',
  },
  'lc39b-tower': {
    id: 'lc39b-tower',
    name: 'LC-39B Mobile Launcher & Tower',
    role: 'Launch Complex 39B',
    spec: '115 m Tower · 450,000 gal Deluge',
    fact: 'Crew Access Arm retracts at T-2s while water deluge floods the flame trench to absorb acoustic shock.',
  },
};

