/**
 * Comprehensive Scene Catalog for Artemis Odyssey Automated QA
 * Defines scenes, navigation steps, camera presets, required visible objects,
 * and performance/geometry budget expectations.
 */

export interface SceneViewConfig {
  width: number;
  height: number;
}

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov?: number;
}

export interface ExpectedBudget {
  targetTriangles?: number;
  minTriangles: number;
  maxTriangles: number;
  maxDrawCalls: number;
  targetFps: number;
  floorFps: number;
}

export interface SceneCatalogEntry {
  id: string;
  name: string;
  category:
    | "ui"
    | "launch"
    | "space"
    | "solar_system"
    | "landing"
    | "surface"
    | "hardware_bay";
  sceneId: string;
  params?: Record<string, any>;
  camera?: CameraPreset;
  viewports: SceneViewConfig[];
  requiredObjects: string[];
  budget: ExpectedBudget;
  description: string;
}

export const DEFAULT_VIEWPORTS: SceneViewConfig[] = [
  { width: 1440, height: 900 },
];

export const RESPONSIVE_VIEWPORTS: SceneViewConfig[] = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
];

export const SCENE_CATALOG: SceneCatalogEntry[] = [
  // --- UI & MENUS ---
  {
    id: "title_hero",
    name: "Title Screen (Hero Scene)",
    category: "ui",
    sceneId: "title",
    viewports: RESPONSIVE_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      targetTriangles: 185000,
      minTriangles: 10000,
      maxTriangles: 176500,
      maxDrawCalls: 445,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Main menu with background orbital hero view, mission selection, and title theme.",
  },
  {
    id: "briefing_objectives",
    name: "Mission Briefing (Objectives Tab)",
    category: "ui",
    sceneId: "briefing",
    params: { tab: "objectives" },
    viewports: RESPONSIVE_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      targetTriangles: 185000,
      minTriangles: 5000,
      maxTriangles: 398000,
      maxDrawCalls: 800,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Mission 1 Artemis II briefing overview with telemetry checkpoints and flight plan.",
  },
  {
    id: "settings_console",
    name: "Settings Flight Deck Console",
    category: "ui",
    sceneId: "settings",
    viewports: RESPONSIVE_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      targetTriangles: 185000,
      minTriangles: 5000,
      maxTriangles: 398000,
      maxDrawCalls: 800,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "4-bus audio mixing, graphics presets, NIST aerospace units, and accessibility settings.",
  },

  // --- LAUNCH PAD & ASCENT ---
  {
    id: "launch_pad_wide",
    name: "LC-39B Pad Pre-Launch Wide View",
    category: "launch",
    sceneId: "launch",
    camera: { position: [18, 12, 38], target: [0, 10, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["core_stage", "srb_left", "srb_right"],
    budget: {
      targetTriangles: 185000,
      minTriangles: 35000,
      maxTriangles: 179500,
      maxDrawCalls: 450,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Wide panoramic view of SLS Block 1 mounted on LC-39B with Mobile Launcher tower and flame trench.",
  },
  {
    id: "launch_pad_close_tower",
    name: "LC-39B Close View on Crew Access Arm",
    category: "launch",
    sceneId: "launch",
    camera: { position: [-3.5, 23.5, 8.5], target: [0, 22.0, 0], fov: 40 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["orion_cm", "orion_las"],
    budget: {
      minTriangles: 25000,
      maxTriangles: 220000,
      maxDrawCalls: 600,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Close inspection of Orion capsule, LAS tower, and animated Swing Arm.",
  },
  {
    id: "launch_vab_distance",
    name: "LC-39B Looking Toward VAB (Distance Bearing)",
    category: "launch",
    sceneId: "launch",
    camera: { position: [0, 6, 25], target: [-80, 15, -120], fov: 50 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["core_stage"],
    budget: {
      minTriangles: 20000,
      maxTriangles: 220000,
      maxDrawCalls: 600,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Looking toward the 160m Vehicle Assembly Building in the background across Florida terrain.",
  },

  // --- SPACE FLIGHT & CISLUNAR TRAJECTORIES ---
  {
    id: "space_parking_orbit",
    name: "Earth Parking Orbit (165 km, 28.5 deg Inclination)",
    category: "space",
    sceneId: "space",
    params: { orbitState: "parking" },
    camera: { position: [0, 4, 9], target: [0, 0, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["earth"],
    budget: {
      minTriangles: 15000,
      maxTriangles: 95000,
      maxDrawCalls: 90,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Circular 165 km Low Earth Parking Orbit with continuous inertial progression and apsis nodes.",
  },
  {
    id: "space_tli_cislunar",
    name: "Trans-Lunar Injection Outbound Free-Return Arc",
    category: "space",
    sceneId: "space",
    params: { orbitState: "cislunar" },
    camera: { position: [0, 15, 25], target: [0, 0, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["earth", "moon"],
    budget: {
      minTriangles: 15000,
      maxTriangles: 95000,
      maxDrawCalls: 90,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Cislunar free-return figure-8 trajectory with perilune flyby behind far side of Moon.",
  },

  // --- SOLAR SYSTEM ---
  {
    id: "solar_system_overview",
    name: "Solar System Overview (True vs Educational Scale)",
    category: "solar_system",
    sceneId: "space",
    params: { viewMode: "solar_system", scaleMode: "educational" },
    camera: { position: [0, 80, 140], target: [0, 0, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["sun", "earth", "jupiter"],
    budget: {
      minTriangles: 20000,
      maxTriangles: 110000,
      maxDrawCalls: 110,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Heliocentric view displaying Keplerian orbits, asteroid belt, and authentic planetary volumetric ratios.",
  },
  {
    id: "solar_system_saturn_rings",
    name: "Saturn Rings & Shadow System",
    category: "solar_system",
    sceneId: "space",
    params: { focusedBody: "saturn" },
    camera: { position: [0, 6, 14], target: [0, 0, 0], fov: 40 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["saturn"],
    budget: {
      minTriangles: 15000,
      maxTriangles: 90000,
      maxDrawCalls: 85,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Detailed view of Saturn rings, axial tilt, and authentic planetary shadow projection.",
  },

  // --- LANDING & SURFACE ---
  {
    id: "landing_lunar_approach",
    name: "Lunar Descent Approach (Shackleton Crater)",
    category: "landing",
    sceneId: "landing",
    params: { altitude: 120, sinkRate: -8.5 },
    camera: { position: [0, 8, 18], target: [0, 2, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 25000,
      maxTriangles: 130000,
      maxDrawCalls: 120,
      targetFps: 45,
      floorFps: 30,
    },
    description:
      "Powered descent flight deck with radar altimeter, ballistic dust particles, and throttle control.",
  },
  {
    id: "surface_moon_south_pole",
    name: "Moon South Pole Surface & VIPER Rover",
    category: "surface",
    sceneId: "surface_moon",
    params: { roverMode: "drive" },
    camera: { position: [0, 2.5, 6.5], target: [0, 0.8, 0], fov: 50 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 25000,
      maxTriangles: 140000,
      maxDrawCalls: 140,
      targetFps: 45,
      floorFps: 30,
    },
    description:
      "Moon Shackleton elevation with rocker-bogie suspension and non-stick boulder collision sliding.",
  },
  {
    id: "surface_mars_jezero",
    name: "Mars Jezero Crater Surface & Perseverance",
    category: "surface",
    sceneId: "surface_mars",
    params: { roverMode: "drive" },
    camera: { position: [0, 2.5, 6.5], target: [0, 0.8, 0], fov: 50 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 30000,
      maxTriangles: 160000,
      maxDrawCalls: 145,
      targetFps: 45,
      floorFps: 30,
    },
    description:
      "Mars Jezero delta terrain with MOLA elevation and scientific sampling targets.",
  },

  // --- HARDWARE BAY (ALL VEHICLES) ---
  {
    id: "hardware_bay_sls_assembled",
    name: "Hardware Bay: SLS Block 1 (Assembled 0%)",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "rocket", explodePct: 0 },
    camera: { position: [0, 12, 32], target: [0, 12, 0], fov: 45 },
    viewports: RESPONSIVE_VIEWPORTS,
    requiredObjects: [
      "core_stage",
      "rs25_engines",
      "srb_left",
      "srb_right",
      "icps",
      "orion_esm",
      "orion_cm",
      "orion_las",
    ],
    budget: {
      minTriangles: 40000,
      maxTriangles: 95000,
      maxDrawCalls: 110,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "SLS Block 1 hero stack assembled with clean 8-node staging hierarchy and zero geometry defects.",
  },
  {
    id: "hardware_bay_sls_exploded_35",
    name: "Hardware Bay: SLS Block 1 (Exploded 35%)",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "rocket", explodePct: 35 },
    camera: { position: [0, 14, 38], target: [0, 12, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: [
      "core_stage",
      "rs25_engines",
      "srb_left",
      "srb_right",
      "icps",
      "orion_esm",
      "orion_cm",
      "orion_las",
    ],
    budget: {
      minTriangles: 40000,
      maxTriangles: 95000,
      maxDrawCalls: 110,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "SLS Block 1 partial exploded view showing interstage, RS-25 cluster, and booster mount axes.",
  },
  {
    id: "hardware_bay_sls_exploded_100",
    name: "Hardware Bay: SLS Block 1 (Exploded 100%)",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "rocket", explodePct: 100 },
    camera: { position: [0, 16, 44], target: [0, 12, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: [
      "core_stage",
      "rs25_engines",
      "srb_left",
      "srb_right",
      "icps",
      "orion_esm",
      "orion_cm",
      "orion_las",
    ],
    budget: {
      minTriangles: 40000,
      maxTriangles: 95000,
      maxDrawCalls: 110,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Full multi-stage explosion revealing individual SLS subsystems separated along flight axes.",
  },
  {
    id: "hardware_bay_saturn_v",
    name: "Hardware Bay: Saturn V (Apollo Architecture)",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "saturn-v", explodePct: 0 },
    camera: { position: [0, 14, 36], target: [0, 12, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["saturn-sic", "saturn-sii", "saturn-sivb"],
    budget: {
      minTriangles: 25000,
      maxTriangles: 85000,
      maxDrawCalls: 95,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Saturn V Apollo 11 moon rocket with S-IC, S-II, S-IVB stages, and F-1 cluster.",
  },
  {
    id: "hardware_bay_iss",
    name: "Hardware Bay: International Space Station (ISS)",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "iss", explodePct: 0 },
    camera: { position: [0, 0, 48], target: [0, 0, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["iss-truss"],
    budget: {
      targetTriangles: 40000,
      minTriangles: 5000,
      maxTriangles: 20000,
      maxDrawCalls: 25,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "International Space Station (108.5m truss) with high-detail decimated solar arrays.",
  },
  {
    id: "hardware_bay_jwst",
    name: "Hardware Bay: James Webb Space Telescope (JWST)",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "jwst", explodePct: 0 },
    camera: { position: [0, 2, 14], target: [0, 0, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["jwst-mirror"],
    budget: {
      targetTriangles: 185000,
      minTriangles: 20000,
      maxTriangles: 220000,
      maxDrawCalls: 90,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "JWST gold hexagonal primary mirror segments and 5-layer Kapton sunshield.",
  },
  {
    id: "hardware_bay_rover",
    name: "Hardware Bay: Planetary Surface Rover (VIPER / Perseverance)",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "rover", explodePct: 0 },
    camera: { position: [0, 1.2, 3.8], target: [0, 0.6, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["rover-mobility"],
    budget: {
      targetTriangles: 40000,
      minTriangles: 2000,
      maxTriangles: 15000,
      maxDrawCalls: 170,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Perseverance Mars 2020 and VIPER lunar rover chassis with rocker-bogie mobility and scientific mast.",
  },
  {
    id: "hardware_bay_lander",
    name: "Hardware Bay: LM-2 Concept Lunar Lander",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "lander", explodePct: 0 },
    camera: { position: [0, 2.8, 8.2], target: [0, 2.2, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["lm-descent"],
    budget: {
      targetTriangles: 185000,
      minTriangles: 10000,
      maxTriangles: 375000,
      maxDrawCalls: 535,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Fictional educational concept lander with descent and ascent stages, gold Kapton foil, and quad footpads.",
  },
  {
    id: "hardware_bay_voyager",
    name: "Hardware Bay: Voyager Interstellar Spacecraft",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "voyager", explodePct: 0 },
    camera: { position: [0, 1.5, 4.2], target: [0, 0.4, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["voy-dish"],
    budget: {
      minTriangles: 10000,
      maxTriangles: 80000,
      maxDrawCalls: 85,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Voyager 1/2 deep space probe with 3.7m parabolic dish antenna and RTG power boom.",
  },
  {
    id: "hardware_bay_satellite",
    name: "Hardware Bay: Tracking & Data Relay Satellite (TDRS)",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "satellite", explodePct: 0 },
    camera: { position: [0, 1.2, 3.5], target: [0, 0, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["sat-bus"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 50000,
      maxDrawCalls: 75,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "NASA Space Network Tracking and Data Relay Satellite in geosynchronous orbit.",
  },
  {
    id: "hardware_bay_falcon_9",
    name: "Hardware Bay: Falcon 9 Reusable Launch Vehicle",
    category: "hardware_bay",
    sceneId: "hardware_bay",
    params: { craft: "falcon-9", explodePct: 0 },
    camera: { position: [0, 12, 30], target: [0, 9.5, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["falcon-stage1"],
    budget: {
      minTriangles: 15000,
      maxTriangles: 85000,
      maxDrawCalls: 95,
      targetFps: 60,
      floorFps: 30,
    },
    description:
      "Commercial orbital launch vehicle with re-usable first stage, titanium grid fins, and Merlin-1D cluster.",
  },

  // --- EXPANDED LAUNCH FLIGHT STAGES (SECTION 2.2) ---
  {
    id: "launch_liftoff_t0",
    name: "LC-39B T+0 RS-25 Main Engine Ignition",
    category: "launch",
    sceneId: "launch",
    params: { stage: "ignition", countdownSec: 0, throttle: 1.0 },
    camera: { position: [14.5, 11.4, 28.0], target: [0, 8.0, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["core_stage", "rs25_engines"],
    budget: {
      minTriangles: 25000,
      maxTriangles: 220000,
      maxDrawCalls: 600,
      targetFps: 60,
      floorFps: 30,
    },
    description: "T+0 RS-25 ignition with hydrolox startup steam and MLP sound suppression water deluge.",
  },
  {
    id: "launch_liftoff_t5",
    name: "LC-39B T+5 Tower Clear Ascent",
    category: "launch",
    sceneId: "launch",
    params: { stage: "liftoff", altitudeKm: 0.15, verticalSpeedMs: 48 },
    camera: { position: [25, 20, 50], target: [0, 15, 0], fov: 50 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["core_stage", "srb_left", "srb_right"],
    budget: {
      minTriangles: 25000,
      maxTriangles: 220000,
      maxDrawCalls: 600,
      targetFps: 60,
      floorFps: 30,
    },
    description: "T+5 liftoff ascent clearing the LC-39B mobile launcher tower with active SRB exhaust plumes.",
  },
  {
    id: "launch_max_q",
    name: "Ascent Phase: Max-Q Dynamic Pressure",
    category: "launch",
    sceneId: "launch",
    params: { stage: "max_q", altitudeKm: 13.5, dynamicPressureKpa: 34.5 },
    camera: { position: [12, 18, 30], target: [0, 14, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["core_stage", "srb_left", "srb_right"],
    budget: {
      minTriangles: 20000,
      maxTriangles: 220000,
      maxDrawCalls: 550,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Transonic Max-Q dynamic pressure checkpoint with atmospheric condensation shock collar.",
  },
  {
    id: "launch_srb_separation",
    name: "Ascent Staging: Solid Rocket Booster (SRB) Separation",
    category: "launch",
    sceneId: "launch",
    params: { stage: "srb_sep", altitudeKm: 48.0 },
    camera: { position: [0, 16, 28], target: [0, 12, 0], fov: 50 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["core_stage", "srb_left", "srb_right"],
    budget: {
      minTriangles: 20000,
      maxTriangles: 220000,
      maxDrawCalls: 550,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Booster Separation Motor (BSM) firing and twin solid rocket boosters peeling away from core.",
  },
  {
    id: "launch_core_separation",
    name: "Ascent Staging: Main Engine Cut-Off (MECO) & Core Separation",
    category: "launch",
    sceneId: "launch",
    params: { stage: "core_sep", altitudeKm: 155.0 },
    camera: { position: [0, 18, 25], target: [0, 15, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["icps", "orion_cm"],
    budget: {
      minTriangles: 15000,
      maxTriangles: 220000,
      maxDrawCalls: 500,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Core stage jettison into suborbital trajectory with ICPS and Orion continuing to orbit.",
  },
  {
    id: "launch_icps_burn",
    name: "Upper Stage: Interim Cryogenic Propulsion Stage (ICPS) Burn",
    category: "launch",
    sceneId: "launch",
    params: { stage: "icps", altitudeKm: 175.0 },
    camera: { position: [0, 18, 22], target: [0, 16, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["icps", "orion_cm"],
    budget: {
      minTriangles: 15000,
      maxTriangles: 220000,
      maxDrawCalls: 500,
      targetFps: 60,
      floorFps: 30,
    },
    description: "RL10B-2 hydrolox upper stage engine burning to raise perigee into stable parking orbit.",
  },
  {
    id: "launch_orbit_insertion",
    name: "Flight Milestone: LEO Orbit Insertion Achieved",
    category: "launch",
    sceneId: "launch",
    params: { stage: "orbit", altitudeKm: 185.0 },
    camera: { position: [0, 16, 26], target: [0, 14, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["icps", "orion_cm"],
    budget: {
      minTriangles: 15000,
      maxTriangles: 220000,
      maxDrawCalls: 500,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Target orbital velocity reached, telemetry switches from launch ascent to space flight.",
  },

  // --- SPACE FLIGHT & PLANETARY EXPLORATION (SECTION 2.2) ---
  {
    id: "space_tli_burn",
    name: "Space Flight: Trans-Lunar Injection (TLI) Burn",
    category: "space",
    sceneId: "space",
    params: { maneuver: "tli" },
    camera: { position: [0, 3, 7], target: [0, 0, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 10000,
      maxTriangles: 180000,
      maxDrawCalls: 250,
      targetFps: 60,
      floorFps: 30,
    },
    description: "RL10 / AJ10 continuous burn accelerating Orion out of Low Earth Orbit toward cislunar space.",
  },
  {
    id: "solar_system_sun",
    name: "Solar System Focus: Sun & Coronal Halo",
    category: "solar_system",
    sceneId: "space",
    params: { focusedBody: "sun" },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 150000,
      maxDrawCalls: 200,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Close-up observation of the Sun with dynamic solar flare shaders and coronal glow.",
  },
  {
    id: "solar_system_jupiter",
    name: "Solar System Focus: Jupiter & Galilean Moons",
    category: "solar_system",
    sceneId: "space",
    params: { focusedBody: "jupiter" },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 150000,
      maxDrawCalls: 200,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Jovian atmospheric bands, Great Red Spot, and orbital markers for Io, Europa, Ganymede, Callisto.",
  },
  {
    id: "solar_system_pluto",
    name: "Solar System Focus: Pluto & Tombaugh Regio",
    category: "solar_system",
    sceneId: "space",
    params: { focusedBody: "pluto" },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 150000,
      maxDrawCalls: 200,
      targetFps: 60,
      floorFps: 30,
    },
    description: "New Horizons global mosaic map of dwarf planet Pluto and Sputnik Planitia heart feature.",
  },
  {
    id: "solar_system_moon",
    name: "Solar System Focus: Earth's Moon",
    category: "solar_system",
    sceneId: "space",
    params: { focusedBody: "moon" },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 150000,
      maxDrawCalls: 200,
      targetFps: 60,
      floorFps: 30,
    },
    description: "LRO WAC lunar surface view showing near-side maria and south polar crater rim topography.",
  },
  {
    id: "solar_system_mars",
    name: "Solar System Focus: Planet Mars",
    category: "solar_system",
    sceneId: "space",
    params: { focusedBody: "mars" },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 150000,
      maxDrawCalls: 200,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Global mosaic view of Mars featuring Valles Marineris and Olympus Mons shield volcanoes.",
  },
  {
    id: "solar_system_saturn_close",
    name: "Saturn Close-Up: Ring Particles & Shadow Projection",
    category: "solar_system",
    sceneId: "space",
    params: { focusedBody: "saturn" },
    camera: { position: [0, 1.2, 3.2], target: [0, 0, 0], fov: 40 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 10000,
      maxTriangles: 150000,
      maxDrawCalls: 200,
      targetFps: 60,
      floorFps: 30,
    },
    description: "High-resolution close-up of Saturn A, B, and C rings with Cassini Division transparency.",
  },

  // --- LANDING & SURFACE TOUCHDOWN ENVELOPES (SECTION 2.2) ---
  {
    id: "landing_touchdown_success",
    name: "Lunar Landing: Nominal Touchdown Success",
    category: "landing",
    sceneId: "landing",
    params: { state: "touchdown" },
    camera: { position: [0, 2.5, 7.5], target: [0, 0.8, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["lm-descent"],
    budget: {
      minTriangles: 10000,
      maxTriangles: 195000,
      maxDrawCalls: 450,
      targetFps: 45,
      floorFps: 30,
    },
    description: "Soft landing touchdown at <1.0 m/s within designated safe landing zone.",
  },
  {
    id: "landing_hard_touchdown",
    name: "Lunar Landing: Hard Touchdown (Structural Limit Margin)",
    category: "landing",
    sceneId: "landing",
    params: { state: "hard_landing" },
    camera: { position: [0, 2.5, 7.5], target: [0, 0.8, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["lm-descent"],
    budget: {
      minTriangles: 10000,
      maxTriangles: 195000,
      maxDrawCalls: 450,
      targetFps: 45,
      floorFps: 30,
    },
    description: "Firm touchdown near structural envelope threshold with landing gear compression.",
  },
  {
    id: "landing_crash_debrief",
    name: "Landing Failure: Crash Event & Post-Flight Debrief",
    category: "landing",
    sceneId: "landing",
    params: { state: "crash" },
    camera: { position: [0, 3, 9], target: [0, 0.5, 0], fov: 50 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 195000,
      maxDrawCalls: 450,
      targetFps: 45,
      floorFps: 30,
    },
    description: "Excess velocity impact resulting in crash particle explosion and debrief diagnostics screen.",
  },
  {
    id: "surface_rover_driving",
    name: "Surface Ops: Rover Driving on Lunar Regolith",
    category: "surface",
    sceneId: "surface_moon",
    params: { roverDriving: true },
    camera: { position: [0, 1.8, 4.5], target: [0, 0.6, 0], fov: 45 },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["rover-mobility"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 195000,
      maxDrawCalls: 350,
      targetFps: 45,
      floorFps: 30,
    },
    description: "Active wheel kinematics and dust ejection during lunar terrain traverse.",
  },

  // --- PAUSE MENU TABS & CREDITS (SECTION 2.2) ---
  {
    id: "menu_pause_map",
    name: "Flight Deck Pause Menu: Mission Map Tab",
    category: "ui",
    sceneId: "pause_menu",
    params: { tab: "map" },
    viewports: RESPONSIVE_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 250000,
      maxDrawCalls: 450,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Interactive cislunar trajectory map displaying current vehicle position and transfer orbits.",
  },
  {
    id: "menu_pause_ledger",
    name: "Flight Deck Pause Menu: Science & Telemetry Ledger Tab",
    category: "ui",
    sceneId: "pause_menu",
    params: { tab: "ledger" },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 250000,
      maxDrawCalls: 450,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Mission log recording scientific sample collections, anomalies encountered, and flight milestones.",
  },
  {
    id: "menu_pause_achievements",
    name: "Flight Deck Pause Menu: Achievements & Milestones Tab",
    category: "ui",
    sceneId: "pause_menu",
    params: { tab: "achievements" },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 250000,
      maxDrawCalls: 450,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Campaign achievement badges tracking successful burns, orbital dockings, and precision landings.",
  },
  {
    id: "menu_pause_glossary",
    name: "Flight Deck Pause Menu: Aerospace Glossary Tab",
    category: "ui",
    sceneId: "pause_menu",
    params: { tab: "glossary" },
    viewports: DEFAULT_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 250000,
      maxDrawCalls: 450,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Illustrated NASA aerospace terminology glossary covering orbital mechanics and vehicle systems.",
  },
  {
    id: "menu_credits_screen",
    name: "In-Game Credits & Legal Attribution Screen",
    category: "ui",
    sceneId: "credits",
    viewports: RESPONSIVE_VIEWPORTS,
    requiredObjects: ["canvas"],
    budget: {
      minTriangles: 5000,
      maxTriangles: 250000,
      maxDrawCalls: 450,
      targetFps: 60,
      floorFps: 30,
    },
    description: "Dedicated in-game credits screen citing typefaces, 3D models, textures, audio, and NASA legal notices.",
  },
];
