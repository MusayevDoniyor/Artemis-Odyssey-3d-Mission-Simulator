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
  EARTH_GRAVITY: 9.81,
  EARTH_RADIUS_M: 6371000,
  MOON_GRAVITY: 1.625,
  MARS_GRAVITY: 3.721,

  // SLS Block 1 Rocket Parameters (Compressed trainer burn times for responsive 60s launch)
  SLS_LIFTOFF_MASS_KG: 2604000,
  SLS_LIFTOFF_THRUST_N: 39100000,
  SLS_CORE_THRUST_N: 9200000,
  SLS_ICPS_THRUST_N: 1650000,
  SLS_FIRST_STAGE_PROP_KG: 1450000,
  SLS_CORE_DRY_KG: 170000,
  SLS_CORE_PROP_KG: 360000,
  SLS_ICPS_DRY_KG: 35000,
  SLS_ICPS_PROP_KG: 28000,
  SLS_SRB_SEP_ALT_KM: 45,
  SLS_LAS_JETTISON_ALT_KM: 80,
  SLS_CORE_SEP_ALT_KM: 110,
  SLS_ORBIT_TARGET_KM: 165,
  LAUNCH_TIME_SCALE: 11.5,

  // Descent Vehicle Parameters (Moon 1.625 m/s² vs Mars 3.721 m/s² powered descent)
  LANDER_FIXED_MASS_KG: 7258,
  LANDER_PROP_MASS_KG: 8845,
  LANDER_MAX_THRUST_N: 43900,
  LANDER_MARS_MAX_THRUST_N: 76500,
  LANDER_FUEL_FLOW_KG_S: 14.4,
  LANDER_PERFECT_VY: 2.5,
  LANDER_HARD_VY: 4.8,
  LANDER_PERFECT_TILT: 12,
  LANDER_HARD_TILT: 24,

  // Rover Mobility Parameters (Expanded ±138m Moon & Mars Traversable Worlds)
  ROVER_MAX_SPEED: 8.6,
  ROVER_WALKER_SPEED: 4.2,
  ROVER_ACCEL: 5.6,
  ROVER_TURN_RATE: 1.38,
  ROVER_WHEELBASE: 2.1,
  SURFACE_BOUND_M: 138,
} as const;

export const CAMPAIGN_MISSIONS: Record<CampaignMissionId, CampaignMissionSpec> = {
  'artemis-2': {
    id: 'artemis-2',
    code: 'MISSION 1 · ARTEMIS II',
    shortLabel: '1. Artemis II · Sat Ops',
    title: 'SLS Launch & Orbital Relay Satellite',
    planet: 'moon',
    startPhase: 'launch',
    hasSurfaceOps: false,
    nasaGrounding: 'Artemis II Free-Return Trajectory · HERMES / ERSA Space Weather · OSDR OSD-569',
    objectiveSummary:
      'Launch Orion on SLS Block 1, fly into lunar staging orbit without landing, deploy the HERMES Relay Satellite, unfold its solar wings, and lock Earth-Moon laser telemetry.',
    reuseInput: 'Inspect vehicle subsystems first to unlock radiation-orientation & satellite notes.',
    reuseOutput: 'Unlocks High-Res Topographic Surface Maps & +60s Early DONKI Flare Warnings for Missions 2–4.',
  },
  'artemis-3': {
    id: 'artemis-3',
    code: 'MISSION 2 · ARTEMIS III',
    shortLabel: '2. Artemis III · Moon',
    title: 'Lunar South Pole Touchdown & VIPER',
    planet: 'moon',
    startPhase: 'landing',
    hasSurfaceOps: true,
    nasaGrounding: 'Artemis III South Pole Landing · VIPER TRIDENT Drill · OSDR OSD-489 Regolith Berm',
    objectiveSummary:
      'Land at the Lunar South Pole and traverse an expanded 4-corridor crater map: drill Shackleton cold-trap ice, align Malapert solar ridges, quarry Nobile regolith, and scan Cabeus hydrogen.',
    reuseInput: 'Uses Mission 1 Relay Satellite for high-res crater contour maps & saved Orion fuel margin.',
    reuseOutput: 'Harvests ISRU H₂O + LH₂ Propellant, Solar Grid kW, and Regolith Shielding carried into Artemis IV.',
  },
  'artemis-4': {
    id: 'artemis-4',
    code: 'MISSION 3 · ARTEMIS IV',
    shortLabel: '3. Artemis IV · Gateway',
    title: 'Lunar Gateway Resupply & ISRU Transfer',
    planet: 'moon',
    startPhase: 'space',
    hasSurfaceOps: false,
    nasaGrounding: 'Artemis IV Gateway NRHO Assembly · HERMES/IDA Dosimetry · Lunar Ice-to-Fuel Loop',
    objectiveSummary:
      'Pilot Orion from Lunar Orbit to Lunar Gateway NRHO carrying Artemis III ISRU propellant, upgrade deep-space relay gain, and resolve a DONKI solar particle radiation crisis.',
    reuseInput: 'Propellant margin & shielding depend directly on water ice, solar kW & regolith harvested in Mission 2.',
    reuseOutput: 'Fuels the Deep-Space Mars Transit Window & certifies OSDR shielding protocols for Mars.',
  },
  'mars-pathfinder': {
    id: 'mars-pathfinder',
    code: 'MISSION 4 · MARS',
    shortLabel: '4. Mars · Jezero Crater',
    title: 'Jezero Crater Descent & Sample Cache',
    planet: 'mars',
    startPhase: 'landing',
    hasSurfaceOps: true,
    nasaGrounding: 'Mars 2020 Perseverance · Jezero Ancient Delta · MOXIE CO₂→O₂ · OSDR OSD-366',
    objectiveSummary:
      'Execute a 0.38g Martian descent into Jezero Crater, explore the Ancient River Delta and Máaz Ridge, run MOXIE O₂ generation, and manage Martian dust accumulation.',
    reuseInput: 'Reuses Orbital Relay Map, Artemis III ISRU fuel reserve, Solar Cleaning tactics & OSDR Dose Budget.',
    reuseOutput: 'Completes the Moon-to-Mars Sustainable Exploration Campaign!',
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
    name: 'MARE Water-Wall Storm Vest',
    shortTag: '+35% Shield · Heavy Mass',
    description:
      'Polyethylene + hydrogen-rich water shield modeled on OSDR OSD-569 (Helga & Zohar). Cuts solar flare DNA dose, but adds lander mass.',
    tradeoffHint: 'Heavier ship (+40% mass) — fire braking rockets earlier!',
    massMultiplier: 1.4,
    fragile: false,
    bonus: { shield: 35 },
    drillBoost: 1.0,
  },
  'oxygen-tanks': {
    id: 'oxygen-tanks',
    name: 'Cryogenic O₂ Reserve & MOXIE Core',
    shortTag: '+35% Oxygen · Balanced',
    description:
      'Supercritical oxygen tanks plus CO₂ electrolysis cell hardware to keep lunar & Martian life support steady.',
    tradeoffHint: 'Moderate mass (+20%) — steady descent handling.',
    massMultiplier: 1.2,
    fragile: false,
    bonus: { oxygen: 35 },
    drillBoost: 1.0,
  },
  'solar-panels': {
    id: 'solar-panels',
    name: 'Malapert Lightweight Solar Wing',
    shortTag: '+40% Power · Fragile!',
    description:
      'Ultra-light roll-out photovoltaic wings power base heaters and drills, but a hard landing (>2.5 m/s) damages cells.',
    tradeoffHint: 'Lightest mass (+10%) — requires soft touchdown under 2.5 m/s!',
    massMultiplier: 1.1,
    fragile: true,
    bonus: { power: 40 },
    drillBoost: 1.0,
  },
  'water-drill': {
    id: 'water-drill',
    name: 'TRIDENT Deep Core Auger',
    shortTag: '+15% O₂ & Power · Fast Drill',
    description:
      'Rotary-percussive ice & basalt corer extracts Shackleton ice and Jezero delta samples 60% faster.',
    tradeoffHint: 'Medium mass (+25%) — speeds up all Moon & Mars surface science.',
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

export const SOLAR_TARGETS: Record<SpaceTargetId, SolarPlanetSpec> = {
  'relay-orbit': {
    id: 'relay-orbit',
    name: 'HERMES Relay Orbit · LLO',
    x: 6,
    z: -4,
    radius: 2.8,
    realDistanceLabel: '365,000 km',
    nominalDays: 2.5,
    color: 0x38bdf8,
    fact: 'Non-landing orbital objective! Deploy & unfold the HERMES/Relay Satellite here to unlock High-Res Moon & Mars surface maps.',
  },
  moon: {
    id: 'moon',
    name: 'Moon · South Pole Orbit',
    x: 26,
    z: -18,
    radius: 3.4,
    realDistanceLabel: '384,400 km',
    nominalDays: 4,
    color: 0xcbd5e1,
    fact: 'Permanently shadowed craters at the lunar South Pole trap water ice right next to sunlit Malapert power ridges.',
  },
  gateway: {
    id: 'gateway',
    name: 'Lunar Gateway · NRHO',
    x: 42,
    z: 14,
    radius: 2.6,
    realDistanceLabel: '405,000 km',
    nominalDays: 8,
    color: 0xfacc15,
    fact: 'Artemis IV staging station in Near-Rectilinear Halo Orbit carrying HERMES & IDA space-weather radiation instruments.',
  },
  mars: {
    id: 'mars',
    name: 'Mars · Jezero Insertion',
    x: -46,
    z: -34,
    radius: 4.3,
    realDistanceLabel: '225,000,000 km',
    nominalDays: 210,
    color: 0xf97316,
    fact: 'Mars gravity is 0.38g (3.72 m/s²) with a thin CO₂ atmosphere — Artemis lunar ISRU fuel makes Mars transit achievable.',
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

// Expanded Lunar South Pole Objectives across ±138m arena
export const MOON_OBJECTIVES: RoverObjective[] = [
  {
    id: 'moon-shackleton-ice',
    planet: 'moon',
    title: 'Drill Shackleton Cold Trap Ice',
    siteName: 'Shackleton Cold Trap',
    instrument: 'TRIDENT 1m Drill + MSolo Spectrometer',
    x: 56,
    z: -62,
    color: 0x38bdf8,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { oxygen: 22, power: 8 },
    isruWaterGainKg: 420,
    isruFuelGainPct: 18,
    unlockNoteId: 'note-isru-electrolysis',
    rewardText: '+420 kg H₂O Ice · +18% ISRU Fuel · +22% O₂',
    nasaFact:
      'Permanently shadowed South Pole craters trap water ice at -200°C. Splitting H₂O by electrolysis produces breathable O₂ and LH₂ fuel for Artemis IV.',
  },
  {
    id: 'moon-malapert-solar',
    planet: 'moon',
    title: 'Calibrate Malapert Solar Ridge',
    siteName: 'Malapert Massif Ridge',
    instrument: 'Photovoltaic Relay & Power Bus',
    x: -64,
    z: -48,
    color: 0xfacc15,
    durationSec: 2.1,
    progress: 0,
    completed: false,
    reward: { power: 30 },
    solarGainKw: 45,
    unlockNoteId: 'note-malapert-sunlight',
    rewardText: '+45 kW Grid · +30% Power',
    nasaFact:
      'Peaks of Eternal Light on Malapert Ridge stay sunlit up to 89% of the lunar year, powering nearby shadowed crater operations.',
  },
  {
    id: 'moon-nobile-regolith',
    planet: 'moon',
    title: 'Quarry Nobile Regolith Berm',
    siteName: 'Nobile Highland Quarry',
    instrument: 'NIRVSS + OSDR Radiation Berm Probe',
    x: 52,
    z: 58,
    color: 0x34d399,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { shield: 26 },
    shieldLevelGain: 1,
    unlockNoteId: 'note-osdr-regolith',
    rewardText: '+1 Regolith Berm Tier · +26% Shield',
    nasaFact:
      'OSDR OSD-489 shows 1.5 m of compacted lunar regolith absorbs ~62% of solar storm proton dose over crew habitats.',
  },
  {
    id: 'moon-cabeus-hydrogen',
    planet: 'moon',
    title: 'Map Cabeus Hydrogen Plume',
    siteName: 'Cabeus Shadowed Basin',
    instrument: 'Neutron Spectrometer System (NSS)',
    x: -54,
    z: 66,
    color: 0xc084fc,
    durationSec: 2.2,
    progress: 0,
    completed: false,
    reward: { oxygen: 14, shield: 14 },
    isruWaterGainKg: 280,
    isruFuelGainPct: 12,
    rewardText: '+280 kg H₂O · +12% Fuel · +14% O₂ & Shield',
    nasaFact:
      'VIPER’s Neutron Spectrometer detects hydrogen down to 1 meter depth without stopping, guiding crews to the richest ice veins.',
  },
];

// Mars Jezero Crater Objectives across ±138m arena
export const MARS_OBJECTIVES: RoverObjective[] = [
  {
    id: 'mars-jezero-delta',
    planet: 'mars',
    title: 'Core Ancient River Delta Fan',
    siteName: 'Jezero River Delta',
    instrument: 'SHERLOC + Percussion Corer',
    x: 54,
    z: -58,
    color: 0x38bdf8,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { power: 10 },
    marsSamplesGain: 2,
    unlockNoteId: 'note-jezero-delta',
    rewardText: '+2 Biosignature Cores · +10% Power',
    nasaFact:
      '3.5 billion years ago, a river flowed into Jezero Lake, depositing clay and mudstone layers that best preserve ancient organic signatures.',
  },
  {
    id: 'mars-maaz-ridge',
    planet: 'mars',
    title: 'Climb Máaz Basalt Ridge',
    siteName: 'Máaz Volcanic Ridge',
    instrument: 'SuperCam Laser & Walker Suspension',
    x: -66,
    z: -42,
    color: 0xfacc15,
    durationSec: 2.2,
    progress: 0,
    completed: false,
    reward: { power: 26 },
    solarGainKw: 30,
    marsSamplesGain: 1,
    rewardText: 'Clean Dust Panels · +26% Power · +1 Core',
    nasaFact:
      'In 0.38g gravity on steep volcanic basalt, high-clearance Walker gait lowers wheel slip while ridge winds sweep dust off solar arrays.',
  },
  {
    id: 'mars-carbonate-shore',
    planet: 'mars',
    title: 'Scan Marginal Carbonate Shelf',
    siteName: 'Lakebed Carbonate Margin',
    instrument: 'PIXL X-Ray + RAD Dosimeter',
    x: 48,
    z: 62,
    color: 0x34d399,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { shield: 25 },
    shieldLevelGain: 1,
    unlockNoteId: 'note-mars-radiation',
    rewardText: '+25% Radiation Shield · OSDR Telemetry',
    nasaFact:
      'OSDR OSD-366 / MSL-RAD shows Mars’ thin CO₂ atmosphere gives partial shielding, yet deep-space GCR still requires storm-shelter planning.',
  },
  {
    id: 'mars-moxie-depot',
    planet: 'mars',
    title: 'Run MOXIE CO₂→O₂ & Cache',
    siteName: 'MOXIE & Sample Depot',
    instrument: 'Solid Oxide Electrolysis Unit',
    x: -50,
    z: 56,
    color: 0xf97316,
    durationSec: 2.2,
    progress: 0,
    completed: false,
    reward: { oxygen: 30 },
    isruFuelGainPct: 15,
    marsSamplesGain: 1,
    unlockNoteId: 'note-moxie-isru',
    rewardText: '+30% Oxygen · +15% Ascent Fuel · +1 Core',
    nasaFact:
      'NASA’s MOXIE splits Martian 95% CO₂ air at 800°C into pure breathable oxygen and oxidizer for Mars ascent rockets.',
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
    title: 'Orion Service Module Water-Wall Shielding',
    sourceRef: 'NASA OSDR OSD-569 (MARE Helga & Zohar)',
    summary:
      'Hydrogen-rich water, propellant, and polyethylene vests absorb high-energy solar storm protons nearly twice as well as thin aluminum.',
    appliedRule:
      'When a Solar Particle Event hits in orbit, turn Orion’s water/service bay toward the Sun & activate Storm Shielding instead of fleeing blindly.',
  },
  {
    id: 'note-hermes-relay',
    category: 'donki',
    title: 'HERMES & Orbital Relay Early Warning',
    sourceRef: 'NASA DONKI + Gateway HERMES',
    summary:
      'Orbital heliophysics satellites detect coronal mass ejections and relay high-resolution terrain data continuously across craters and canyons.',
    appliedRule:
      'Deploy & align the Orbital Relay Satellite before landing to unlock High-Res Topographic Maps and +60s flare preparation.',
  },
  {
    id: 'note-isru-electrolysis',
    category: 'isru',
    title: 'ISRU Water Electrolysis (H₂O → O₂ + LH₂)',
    sourceRef: 'Artemis III Shackleton & VIPER',
    summary:
      'Every kilogram of lunar water ice can be electrolyzed using solar power into breathable oxygen for astronauts and liquid hydrogen rocket fuel.',
    appliedRule:
      'Mining Shackleton & Cabeus ice directly refills Artemis IV Gateway propellant and Mars return oxidizer.',
  },
  {
    id: 'note-malapert-sunlight',
    category: 'vehicle',
    title: 'Malapert Ridge Solar & Dust Discipline',
    sourceRef: 'Artemis South Pole Power Architecture',
    summary:
      'High ridges capture low-angle sunlight while rover walker-mode suspension keeps solar wings level and prevents steep-slope wheel slip.',
    appliedRule:
      'Engage Walker Step [4] + High Clearance [F] on steep basalt/crater slopes to halve slip and preserve power.',
  },
  {
    id: 'note-osdr-regolith',
    category: 'osdr',
    title: 'Compacted Regolith Radiation Berm',
    sourceRef: 'NASA OSDR OSD-489 & OSD-612',
    summary:
      'Covering habitats with ~1.5 meters of lunar regolith blocks primary solar storm particles and prevents DNA double-strand breaks.',
    appliedRule:
      'Complete regolith berm surveys to cut storm shield drain and keep crew cumulative dose well below NASA’s 150 mSv mission limit.',
  },
  {
    id: 'note-moxie-isru',
    category: 'isru',
    title: 'MOXIE CO₂ Electrolysis & Dust Trade-Off',
    sourceRef: 'Mars Perseverance MOXIE + OSDR OSD-366',
    summary:
      'MOXIE converts Martian CO₂ air into O₂, but regional dust storms drop photovoltaic array output by ~35% on Jezero Crater floors.',
    appliedRule:
      'During Mars dust storms, switch non-essential floodlights off, conserve battery reserve above 35%, and harvest MOXIE O₂.',
  },
  {
    id: 'note-jezero-delta',
    category: 'vehicle',
    title: '0.38g Jezero Delta Braking & Coring',
    sourceRef: 'Mars 2020 Jezero Crater Profile',
    summary:
      'Mars gravity (3.72 m/s²) is more than double the Moon’s (1.63 m/s²), demanding earlier descent braking thrust and careful delta terrace driving.',
    appliedRule:
      'Fire descent engines higher (~90 m) on Mars and use Rover Walker stride across layered delta rock shelves.',
  },
];

// Real Engineering Anomalies solved by applying Field Notes
export const CAMPAIGN_ANOMALIES: MissionAnomaly[] = [
  {
    id: 'anom-artemis2-spe',
    missionId: 'artemis-2',
    title: 'DONKI Solar Particle Event Alert (Orion Orbit)',
    context:
      'A high-flux proton burst is sweeping across Earth-Moon space outside the Van Allen Belt. How do you shield Orion while calibrating the Relay Satellite?',
    requiredNoteId: 'note-orion-water-shield',
    nasaRef: 'DONKI SPE + OSDR OSD-569 / OSD-612',
    resolvedChoiceId: null,
    resolvedSummary: null,
    choices: [
      {
        id: 'orient-water-wall',
        label: 'Orient Water/Service Tanks Sunward & Run MARE Shielding',
        rationale: 'Applies OSDR OSD-569: hydrogen-rich water tanks cut organ radiation dose by ~48% for modest power.',
        isOptimal: true,
        deltaResources: { power: -10, shield: 18 },
        doseDeltaMsv: 8,
        scienceMultiplier: 1.25,
      },
      {
        id: 'burn-full-escape',
        label: 'Max Emergency Thrusters Without Reorienting',
        rationale: 'Wastes propellant and leaves thin crew-cabin aluminum facing peak proton flux.',
        isOptimal: false,
        deltaResources: { power: -24, shield: -14 },
        doseDeltaMsv: 34,
        scienceMultiplier: 0.9,
      },
      {
        id: 'power-down-all',
        label: 'Shut Down Telemetry & Drift Unshielded',
        rationale: 'Saves power briefly, but breaks satellite link lock and increases cumulative DNA dose.',
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
    title: 'DONKI M-Class Flare Over South Pole',
    context:
      'Solar protons are inbound toward Shackleton & Base Camp! Balance outpost power, oxygen electrolysis, and regolith shelter protection.',
    requiredNoteId: 'note-osdr-regolith',
    nasaRef: 'NASA DONKI + OSDR OSD-489 Regolith Berm',
    resolvedChoiceId: null,
    resolvedSummary: null,
    choices: [
      {
        id: 'berm-and-shelter',
        label: 'Route Crew Under Regolith Berm & Throttle Heaters',
        rationale: 'Applies OSDR OSD-489: regolith mass blocks protons passively, preserving power for life support.',
        isOptimal: true,
        deltaResources: { power: -10, shield: 24, oxygen: 6 },
        doseDeltaMsv: 10,
        scienceMultiplier: 1.2,
      },
      {
        id: 'active-shield-only',
        label: 'Max Magnetic Shielding Without Life Support Trim',
        rationale: 'Strong shield boost (+22%), but heavy electrical draw (-24% Power).',
        isOptimal: false,
        deltaResources: { power: -24, shield: 22 },
        doseDeltaMsv: 16,
        scienceMultiplier: 1.0,
      },
      {
        id: 'overdrive-drill',
        label: 'Push Full TRIDENT Drill Speed During Peak Flare',
        rationale: '40% faster drilling, but drains power and drops shield margin significantly.',
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
    title: 'Gateway NRHO Telemetry & Propellant Balance',
    context:
      'Gateway IDA dosimeters detect elevated GCR flux as you prepare the ISRU fuel transfer for Mars departure. Select your transfer protocol.',
    requiredNoteId: 'note-isru-electrolysis',
    nasaRef: 'Gateway HERMES/IDA + Artemis III ISRU Carryover',
    resolvedChoiceId: null,
    resolvedSummary: null,
    choices: [
      {
        id: 'cryo-transfer-shield',
        label: 'Use Lunar ISRU LH₂/LOX Buffer Tanks as Storm Wall',
        rationale: 'Dual reuse: Moon water-ice propellant protects crew during transfer and saves Orion fuel!',
        isOptimal: true,
        deltaResources: { power: -8, oxygen: 12, shield: 20 },
        doseDeltaMsv: 9,
        scienceMultiplier: 1.3,
      },
      {
        id: 'fast-transfer',
        label: 'High-Thrust Direct Transfer Burn',
        rationale: 'Saves flight time but stresses power bus and leaves lower O₂ reserve.',
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
    title: 'Jezero Regional Dust Storm & Solar Drop',
    context:
      'Suspended iron-oxide dust dims Jezero Crater sunlight by 35% while atmospheric GCR climbs. How should your Mars rover team respond?',
    requiredNoteId: 'note-moxie-isru',
    nasaRef: 'Perseverance Jezero Meteorology + OSDR OSD-366',
    resolvedChoiceId: null,
    resolvedSummary: null,
    choices: [
      {
        id: 'moxie-low-power',
        label: 'Dim Headlights, Run MOXIE Duty Cycle & Ridge Wind Clean',
        rationale: 'Applies OSD-366 + Malapert power discipline: keeps O₂ positive and recovers array efficiency.',
        isOptimal: true,
        deltaResources: { power: 14, oxygen: 16, shield: 10 },
        doseDeltaMsv: 11,
        scienceMultiplier: 1.25,
      },
      {
        id: 'push-max-speed',
        label: 'Drive Full Speed Through Deep Dust With Floodlights On',
        rationale: 'Clogs solar array faster and drains battery reserves dangerously low.',
        isOptimal: false,
        deltaResources: { power: -26, shield: -12 },
        doseDeltaMsv: 28,
        scienceMultiplier: 0.9,
      },
    ],
  },
];

export const VEHICLE_CATALOG: Record<
  VehicleShowcaseId,
  { title: string; subtitle: string; summary: string; parts: VehiclePartSpec[] }
> = {
  rocket: {
    title: 'SLS Block 1 Space Launch System',
    subtitle: '111.3 m tall · 2,610,000 kg liftoff mass · 4 RS-25 + Twin SRBs',
    summary:
      'Launches Orion and up to 95,000 kg toward the Moon using twin 5-segment solid boosters and four liquid hydrogen RS-25 engines.',
    parts: [
      {
        id: 'sls-core',
        name: 'Core Stage (65.1m) & 4 RS-25 Engines',
        role: 'LH₂ / LOX Main Tank & Thrusters',
        fact: 'Insulated orange core holds cryogenic liquid hydrogen and oxygen feeding four RS-25 engines (~2,000 kN vacuum thrust each, Isp 452s).',
        unlockNoteId: 'note-isru-electrolysis',
      },
      {
        id: 'sls-boosters',
        name: 'Twin 5-Segment SRBs (54.9 m)',
        role: 'Primary Liftoff Boosters',
        fact: 'Provide ~75% of liftoff thrust off Pad 39B, burning solid propellant for ~2 minutes before jettisoning safely.',
      },
      {
        id: 'sls-upper',
        name: 'Orion Capsule & Water-Wall Shielding',
        role: 'Crew Cabin (4–6) & Escape Tower',
        fact: '5.0 m heat-shielded Orion capsule. Surrounding crew quarters with water/propellant tanks cuts solar flare radiation dose by ~48% (OSDR OSD-569).',
        unlockNoteId: 'note-orion-water-shield',
      },
    ],
  },
  satellite: {
    title: 'HERMES Deep-Space Weather & Relay Satellite',
    subtitle: 'Modular Orbital Bus · Twin Solar Wings · Ka-Band + Laser Dish',
    summary:
      'Non-landing orbital sentinel deployed ahead of lunar touchdown to map South Pole craters and forecast DONKI solar flares.',
    parts: [
      {
        id: 'sat-bus',
        name: 'Gold Kapton Bus & HERMES Magnetometer',
        role: 'Space Weather & Attitude Core',
        fact: 'Detects incoming Solar Particle Events up to 60 seconds earlier for Moon & Mars surface crews (DONKI + Gateway HERMES).',
        unlockNoteId: 'note-hermes-relay',
      },
      {
        id: 'sat-solar',
        name: 'Unfolding Twin Photovoltaic Wings',
        role: 'Orbital Power Generation',
        fact: 'Deploy in zero-g once free of Orion’s adapter, tracking sunlight continuously to power continuous Ka-band and laser mapping.',
        unlockNoteId: 'note-malapert-sunlight',
      },
      {
        id: 'sat-dish',
        name: 'Gimbaled High-Gain Laser & Ka-Band Dish',
        role: 'High-Res Topographic Mapping',
        fact: 'Locks onto Lunar South Pole and Jezero Crater to stream high-resolution elevation contours to Rover tactical maps.',
        unlockNoteId: 'note-hermes-relay',
      },
    ],
  },
  lander: {
    title: 'Lunar & Mars Descent Module (Eagle Class)',
    subtitle: '7.3 m tall × 7.0 m wide · 15,000 kg · 0.165g Moon / 0.38g Mars',
    summary:
      'Two-stage descent and ascent spacecraft featuring 4 shock-absorbing outrigger legs, 4-quad RCS clusters, and a throttleable main engine.',
    parts: [
      {
        id: 'lm-descent',
        name: 'Gold Kapton Descent Stage & 4 Legs',
        role: 'Fuel Tanks, Ladder & Landing Gear',
        fact: 'Octagonal gold-foil descent stage carries propellant tanks and shock-absorbing legs tuned for Moon (1.63 m/s²) and Mars (3.72 m/s²).',
        unlockNoteId: 'note-jezero-delta',
      },
      {
        id: 'lm-ascent',
        name: 'Pressurized Ascent Cabin',
        role: 'Crew Cockpit & Docking Hatch',
        fact: 'Faceted metallic crew cabin with canted downward-viewing windows, front egress hatch, and Gateway NRHO docking collar.',
      },
      {
        id: 'lm-rcs',
        name: '4-Quad RCS Clusters & Gimbaled Bell',
        role: 'Attitude & Powered Braking',
        fact: 'Four clusters of RCS thrusters tilt and stabilize the lander while the gimbaled main engine cancels descent speed.',
      },
    ],
  },
  rover: {
    title: 'VIPER / Jezero Dual-World Exploration Rover',
    subtitle: '2.0 m × 1.8 m × 1.4 m · 430 kg · Rocker-Bogie + Walker Gait',
    summary:
      'Articulated 4-wheel polar and Martian explorer with TRIDENT 1m ice/core drill, stereo nav cameras, and dust-tolerant solar wings.',
    parts: [
      {
        id: 'rover-mobility',
        name: 'Rocker-Bogie & Walker Suspension',
        role: 'Drive, Crab, Spin & Walker Stride',
        fact: 'Engaging Walker Step [4] + High Clearance [F] steps cleanly over steep Shackleton craters and Jezero basalt ridges with low slip.',
        unlockNoteId: 'note-malapert-sunlight',
      },
      {
        id: 'rover-science',
        name: 'TRIDENT Drill & Core Auger',
        role: '1m Ice Core & Delta Biosignatures',
        fact: 'Two-segment extendable boom drills into frozen lunar craters and Jezero river-delta sediments to fuel ISRU O₂ & LH₂.',
        unlockNoteId: 'note-isru-electrolysis',
      },
      {
        id: 'rover-power',
        name: 'High-Efficiency Twin Solar Array',
        role: '450 W Power & Dust Management',
        fact: 'Harvests low-angle South Pole sun and Jezero daylight; ridge wind sweeps off Martian dust when traversing high ground.',
        unlockNoteId: 'note-moxie-isru',
      },
      {
        id: 'rover-comms',
        name: 'Panoramic Camera Mast & Dish',
        role: '360° Stereo Vision & Relay Link',
        fact: 'Links directly to the HERMES Orbital Relay Satellite to update live Moon & Mars topographic contour maps.',
        unlockNoteId: 'note-hermes-relay',
      },
    ],
  },
  outpost: {
    title: 'Artemis & Mars Surface Base Camp',
    subtitle: '28.0 m × 24.0 m × 8.5 m · ISRU Electrolyzer + Regolith Berm',
    summary:
      'Sustained planetary station uniting a geodesic habitat dome, airlock, research labs, MOXIE/ISRU plant, solar towers, and landing pad.',
    parts: [
      {
        id: 'base-habitat',
        name: 'Geodesic Dome & OSDR Regolith Berm',
        role: 'Crew Quarters, Labs & Shielding',
        fact: 'Packing compacted regolith over the habitat cuts solar flare proton exposure by ~62% (OSDR OSD-489).',
        unlockNoteId: 'note-osdr-regolith',
      },
      {
        id: 'base-power',
        name: 'Twin Solar Towers & ISRU Electrolyzer',
        role: 'Solar Grid + O₂ / LH₂ Production',
        fact: 'Converts mined lunar ice or Martian CO₂ (MOXIE) into breathable oxygen and liquid propellant for Artemis IV & Mars.',
        unlockNoteId: 'note-moxie-isru',
      },
      {
        id: 'base-comms',
        name: 'Deep Space Antenna & Pad Control',
        role: 'Orbital Relay & DONKI Link',
        fact: 'Receives early solar flare alerts from the Orbital Relay Satellite so crews can shelter before particles arrive.',
        unlockNoteId: 'note-hermes-relay',
      },
    ],
  },
};

export const OSDR_FACTS = [
  {
    code: 'NASA DONKI (Space Weather)',
    summary:
      'Real-time database of solar flares and coronal mass ejections driving flare alerts and orbital storm shielding.',
  },
  {
    code: 'NASA OSDR (Open Science Data Repository)',
    summary:
      'Real radiation & space biology studies (OSD-569 MARE Phantoms, OSD-612 BioSentinel, OSD-489 Regolith, OSD-366 Mars RAD).',
  },
  {
    code: 'Artemis II–IV & Mars Jezero Data',
    summary:
      'Moon (1.625 m/s²) South Pole cold traps + sunlit ridges linked via ISRU fuel to Mars Jezero Crater (3.721 m/s²).',
  },
];
