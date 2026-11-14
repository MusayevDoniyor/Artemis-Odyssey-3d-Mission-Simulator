import type {
  LandingZone,
  OutpostEvent,
  PayloadId,
  PayloadOption,
  RoverObjective,
  SpaceTargetId,
  VehiclePartSpec,
  VehicleShowcaseId,
} from './types';

export const PHYSICS = {
  EARTH_GRAVITY: 9.81,
  EARTH_RADIUS_M: 6371000,
  MOON_GRAVITY: 1.625,

  // SLS Block 1 Rocket Parameters (Compressed trainer burn times for responsive 60s launch)
  SLS_LIFTOFF_MASS_KG: 2604000,
  SLS_LIFTOFF_THRUST_N: 39100000,
  SLS_CORE_THRUST_N: 9200000,
  SLS_ICPS_THRUST_N: 1650000, // Scaled trainer upper stage for smooth orbital insertion
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

  // Lunar Lander Descent Parameters (Apollo LM inspired)
  LANDER_FIXED_MASS_KG: 7258,
  LANDER_PROP_MASS_KG: 8845,
  LANDER_MAX_THRUST_N: 43900,
  LANDER_FUEL_FLOW_KG_S: 14.4,
  LANDER_PERFECT_VY: 2.5,
  LANDER_HARD_VY: 4.8,
  LANDER_PERFECT_TILT: 12,
  LANDER_HARD_TILT: 24,

  // VIPER Rover Mobility Parameters
  ROVER_MAX_SPEED: 7.5, // m/s trainer top speed for fun crater traversal
  ROVER_WALKER_SPEED: 3.6, // Steady articulated leg-step speed over rough boulders
  ROVER_ACCEL: 5.2,
  ROVER_TURN_RATE: 1.35,
  ROVER_WHEELBASE: 2.1,
} as const;

export const PAYLOADS: Record<PayloadId, PayloadOption> = {
  'heavy-shield': {
    id: 'heavy-shield',
    name: 'Heavy Solar Storm Shield',
    shortTag: '+35% Shield · Heavy Mass',
    description:
      'Polyethylene + magnetic shielding protects astronauts during solar flares, but increases lander weight.',
    tradeoffHint: 'Heavier ship (+40% mass) — fire braking rockets earlier!',
    massMultiplier: 1.4,
    fragile: false,
    bonus: { shield: 35 },
    drillBoost: 1.0,
  },
  'oxygen-tanks': {
    id: 'oxygen-tanks',
    name: 'Cryogenic O₂ Reserve Tanks',
    shortTag: '+35% Oxygen · Balanced',
    description:
      'High-pressure supercritical oxygen tanks keep outpost life support steady with balanced flight weight.',
    tradeoffHint: 'Moderate mass (+20%) — steady descent handling.',
    massMultiplier: 1.2,
    fragile: false,
    bonus: { oxygen: 35 },
    drillBoost: 1.0,
  },
  'solar-panels': {
    id: 'solar-panels',
    name: 'Deployable Solar Array',
    shortTag: '+40% Power · Fragile!',
    description:
      'Lightweight photovoltaic wings power base heaters and drills, but a hard landing (>2.5 m/s) damages them.',
    tradeoffHint: 'Lightest mass (+10%) — requires soft touchdown under 2.5 m/s!',
    massMultiplier: 1.1,
    fragile: true,
    bonus: { power: 40 },
    drillBoost: 1.0,
  },
  'water-drill': {
    id: 'water-drill',
    name: 'TRIDENT Deep Ice Drill',
    shortTag: '+15% O₂ & Power · Fast Drill',
    description:
      'Upgraded rotary-percussive ice auger extracts lunar crater ice 60% faster and yields extra oxygen and power.',
    tradeoffHint: 'Medium mass (+25%) — speeds up all Moon surface science.',
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
  moon: {
    id: 'moon',
    name: 'Moon · South Pole',
    x: 24,
    z: -18,
    radius: 3.4,
    realDistanceLabel: '384,400 km',
    nominalDays: 3,
    color: 0xcbd5e1,
    fact: 'Target destination! Permanently shadowed craters at the lunar South Pole trap ancient water ice.',
  },
  mars: {
    id: 'mars',
    name: 'Mars · Orbital Flyby',
    x: -44,
    z: -34,
    radius: 4.2,
    realDistanceLabel: '225,000,000 km',
    nominalDays: 210,
    color: 0xf97316,
    fact: 'Bonus Flyby! Mars has 38% of Earth gravity and thin CO₂ air — Artemis Moon missions test tech for Mars.',
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter · Deep Space Flyby',
    x: 62,
    z: 36,
    radius: 7.4,
    realDistanceLabel: '628,000,000 km',
    nominalDays: 600,
    color: 0xfacc15,
    fact: 'Bonus Flyby! Jupiter’s huge magnetic belt creates intense radiation, showing why deep-space shielding matters.',
  },
};

export const LANDING_ZONES: LandingZone[] = [
  {
    id: 0,
    code: 'PAD ALPHA',
    name: 'Artemis Base Pad',
    x: 0,
    z: 0,
    radius: 9.0,
    multiplier: 1.0,
    bonusPts: 250,
    color: 0x38bdf8,
    hint: 'Flat sintered pad right beside the Moon Base.',
  },
  {
    id: 1,
    code: 'ZONE BRAVO',
    name: 'Shackleton Rim',
    x: 26,
    z: -20,
    radius: 6.5,
    multiplier: 1.5,
    bonusPts: 500,
    color: 0xf59e0b,
    hint: 'Elevated crater rim near ice deposits (×1.5 score).',
  },
  {
    id: 2,
    code: 'ZONE CHARLIE',
    name: 'Eternal Light Ridge',
    x: -28,
    z: -16,
    radius: 6.0,
    multiplier: 2.0,
    bonusPts: 900,
    color: 0x10b981,
    hint: 'Sunlit mountain ridge awarding +20% Power (×2.0 score).',
  },
];

export const INITIAL_OBJECTIVES: RoverObjective[] = [
  {
    id: 'ice-sample',
    title: 'Drill Shadowed Crater Ice',
    siteName: 'Shackleton Cold Trap',
    instrument: 'TRIDENT 1m Percussive Drill + MSolo',
    x: 38,
    z: -42,
    color: 0x38bdf8,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { oxygen: 20, power: 10 },
    rewardText: '+20% Oxygen · +10% Power',
    nasaFact:
      'Lunar South Pole craters stay below -200°C in permanent shadow, trapping water ice that future crews can turn into breathable oxygen and rocket fuel.',
  },
  {
    id: 'solar-deploy',
    title: 'Calibrate Sunlit Solar Ridge',
    siteName: 'Malapert Massif',
    instrument: 'Photovoltaic Array & Power Grid',
    x: -40,
    z: -28,
    color: 0xfacc15,
    durationSec: 2.1,
    progress: 0,
    completed: false,
    reward: { power: 28 },
    rewardText: '+28% Power',
    nasaFact:
      'High ridges near the Moon’s South Pole stay in sunlight for most of the lunar year, making them prime spots for solar power stations.',
  },
  {
    id: 'geology-scan',
    title: 'Survey Regolith Radiation Shield',
    siteName: 'Anorthosite Highlands',
    instrument: 'NIRVSS Spectrometer & Dosimeter',
    x: 22,
    z: 36,
    color: 0x34d399,
    durationSec: 2.4,
    progress: 0,
    completed: false,
    reward: { shield: 22 },
    rewardText: '+22% Radiation Shield',
    nasaFact:
      'Packing lunar soil (regolith) over habitats blocks harmful solar storm particles — a real engineering trade-off studied in NASA OSDR.',
  },
];

export const SOLAR_STORM_EVENTS: OutpostEvent[] = [
  {
    id: 'donki-flare-1',
    title: 'Solar Flare Alert (NASA DONKI)',
    description:
      'Charged solar particles are heading toward the Moon! How will you balance your outpost systems?',
    resolvedChoice: null,
    scienceMultiplier: 1.0,
  },
];

export const VEHICLE_CATALOG: Record<
  VehicleShowcaseId,
  { title: string; subtitle: string; summary: string; parts: VehiclePartSpec[] }
> = {
  rocket: {
    title: 'SLS Block 1 Heavy Rocket',
    subtitle: '98.3 m tall · 39.1 MN liftoff thrust',
    summary:
      'Launches astronauts and heavy cargo out of Earth’s gravity using twin solid boosters and four liquid hydrogen engines.',
    parts: [
      {
        id: 'sls-core',
        name: 'Core Stage & 4 RS-25 Engines',
        role: 'Main Liquid Fuel Tank',
        fact: 'Orange foam insulates super-cold liquid hydrogen (-253°C) feeding four RS-25 rocket engines.',
      },
      {
        id: 'sls-boosters',
        name: 'Twin Solid Rocket Boosters',
        role: '75% of Liftoff Thrust',
        fact: 'Provide huge initial push off Pad 39B, then peel away safely at 45 km altitude.',
      },
      {
        id: 'sls-upper',
        name: 'Orion Capsule & Escape Tower',
        role: 'Crew Cabin & Upper Stage',
        fact: 'Carries up to 4 astronauts to lunar orbit with heat shield protection for Earth return.',
      },
    ],
  },
  lander: {
    title: 'Artemis Lunar Lander',
    subtitle: 'Two-stage descent & ascent vehicle',
    summary:
      'Brakes from lunar orbit under 1/6th Earth gravity using a throttleable descent engine and four shock-absorbing legs.',
    parts: [
      {
        id: 'lm-descent',
        name: 'Gold Kapton Descent Stage',
        role: 'Fuel Tanks & Landing Legs',
        fact: 'Shiny gold foil reflects extreme Moon heat; 1.7m probes under the footpads trigger the Contact Light.',
      },
      {
        id: 'lm-ascent',
        name: 'Pressurized Crew Cabin',
        role: 'Astronaut Cockpit',
        fact: 'Houses flight instruments, triangular windows for downward sightlines, and the docking hatch.',
      },
      {
        id: 'lm-rcs',
        name: 'RCS Thrusters & Gimbal Bell',
        role: 'Steering & Braking',
        fact: 'Small side thrusters tilt the ship while the main engine bell gimbals up to ±6° to cancel sideways drift.',
      },
    ],
  },
  rover: {
    title: 'VIPER Moon Rover / Walker',
    subtitle: '4-Wheel Independent + Walker Stride',
    summary:
      'Prospects icy craters at the Moon’s South Pole with articulated wheel-legs that drive, crab sideways, spin in place, or step over rocks.',
    parts: [
      {
        id: 'rover-mobility',
        name: '4 Articulated Wheel-Legs',
        role: 'Drive, Crab & Walker Stride',
        fact: 'Each wheel turns independently and lifts on rocker arms so the rover never gets stuck in soft lunar dust.',
      },
      {
        id: 'rover-science',
        name: 'TRIDENT 1m Ice Drill',
        role: 'Subsurface Sampling',
        fact: 'Hammer-drills up to 1 meter deep in 10 cm bites while the MSolo spectrometer sniffs water vapor.',
      },
      {
        id: 'rover-power',
        name: '3-Sided Solar Panels',
        role: 'Low-Sun Energy Capture',
        fact: 'Vertical side panels catch low-horizon sunlight at the Moon’s South Pole without overheating.',
      },
      {
        id: 'rover-comms',
        name: 'Stereo Camera Mast & Dish',
        role: 'Navigation & Earth Link',
        fact: 'High-mast headlights illuminate pitch-black craters while the dish beams data to Earth.',
      },
    ],
  },
  outpost: {
    title: 'Artemis South Pole Base',
    subtitle: 'Sustained Lunar Habitat Concept',
    summary:
      'Combines pressurized living domes, solar arrays, airlocks, and regolith shielding so crews can survive weeks on the Moon.',
    parts: [
      {
        id: 'base-habitat',
        name: 'Pressurized Habitat Dome',
        role: 'Crew Living & ECLSS',
        fact: 'Recycles oxygen and water in a closed loop while maintaining breathable Earth-like pressure.',
      },
      {
        id: 'base-power',
        name: 'Vertical Solar Towers',
        role: '24/7 Ridge Power',
        fact: 'Powers air scrubbers, battery banks, and scientific drills through freezing lunar nights.',
      },
      {
        id: 'base-comms',
        name: 'Deep Space Antenna',
        role: 'Earth Telemetry Link',
        fact: 'Relays astronaut health data and live DONKI solar flare warnings from Mission Control.',
      },
    ],
  },
};

export const OSDR_FACTS = [
  {
    code: 'NASA DONKI (Space Weather)',
    summary:
      'Real-time database of solar flares and coronal mass ejections. In the simulator, flare alerts force real power-vs-shielding trade-offs.',
  },
  {
    code: 'NASA OSDR (Open Science Data Repository)',
    summary:
      'Spaceflight biology and radiation dosimetry studies showing how shielding and life-support balance keep crews healthy.',
  },
  {
    code: 'Artemis & VIPER South Pole Data',
    summary:
      'Lunar South Pole topography (1.625 m/s² gravity, permanently shadowed cold traps, and sunlit ridge lighting).',
  },
];
