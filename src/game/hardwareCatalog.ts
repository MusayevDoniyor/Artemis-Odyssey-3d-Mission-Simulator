import type { HonestyBadgeKind } from "./factsAndGlossary";

export type HardwareShowcaseId =
  | "rocket"
  | "satellite"
  | "jwst"
  | "voyager"
  | "lander"
  | "rover"
  | "outpost"
  | "saturn-v"
  | "falcon-9"
  | "iss";

export type EngineeringInteractionKind =
  | "rs25-engines"
  | "propulsion-calc"
  | "stage-sep"
  | "gimbal-attitude"
  | "solar-array"
  | "optics-mirror"
  | "thermal-shield"
  | "rtg-power"
  | "lander-legs"
  | "rover-mobility"
  | "rover-drill"
  | "hab-shield";

export interface EngineeringSpecRow {
  label: string;
  value: string;
}

export interface ComponentQuizQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface EducationalLevels {
  level1What: string;
  level2How: string;
  level3Engineering: string;
}

export interface HardwareSubPart {
  id: string;
  name: string;
  shortName: string;
  role: string;
  specLabel: string;
  badge: HonestyBadgeKind;
  honestyNote: string;
  fact: string;
  mainFunction: string;
  dimensions: string;
  engineeringSpecs: EngineeringSpecRow[];
  levels: EducationalLevels;
  missionRelevance: string;
  explodeAxis: [number, number, number];
  connections: string[];
  quizPrompt: string;
  quizQuestion: ComponentQuizQuestion;
  cameraFocusDist: number;
  cameraFocusYaw?: number;
  cameraFocusPitch?: number;
  interactionKind: EngineeringInteractionKind;
  unlockNoteId?: string;
  sourceCitation?: string;
}

export interface HardwareCraftSpec {
  id: HardwareShowcaseId;
  shortLabel: string;
  title: string;
  subtitle: string;
  summary: string;
  scenarioDistinction: string;
  modelHonestyTag:
    | "NASA Hardware Specs"
    | "Educational Hybrid Model"
    | "Conceptual Architecture"
    | "Fictional Educational Concept";
  defaultCameraDist: number;
  focusY: number;
  overviewSpecs: EngineeringSpecRow[];
  parts: HardwareSubPart[];
  sources?: string[];
}

export const HARDWARE_ORDER: HardwareShowcaseId[] = [
  "rocket",
  "satellite",
  "jwst",
  "voyager",
  "lander",
  "rover",
  "saturn-v",
  "falcon-9",
  "iss",
];

export const HARDWARE_CATALOG: Record<HardwareShowcaseId, HardwareCraftSpec> = {
  rocket: {
    id: "rocket",
    shortLabel: "SLS Block 1",
    title: "SLS Block 1 Launch System",
    subtitle: "98.3 m · 2,608 t Liftoff Mass · 39.1 MN Total Liftoff Thrust",
    summary:
      "NASA super-heavy-lift launch vehicle stacking twin solid boosters, a cryogenic core stage, an upper stage, and the Orion spacecraft.",
    scenarioDistinction:
      "NASA Artemis Block 1 published specifications; 3D mesh groups represent real stage interfaces at a 1:4 m simplified CAD scale.",
    modelHonestyTag: "NASA Hardware Specs",
    defaultCameraDist: 40,
    focusY: 13.0,
    overviewSpecs: [
      { label: "Total Height", value: "98.3 m" },
      { label: "Liftoff Thrust", value: "39.1 MN" },
      { label: "TLI Payload", value: "> 27 t" },
    ],
    sources: [
      "NASA Space Launch System Reference Guide (https://www.nasa.gov/reference/space-launch-system/)",
      "NASA Space Launch System Core Stage Specifications (https://www.nasa.gov/reference/space-launch-system/)",
    ],
    parts: [
      {
        id: "sls-core",
        name: "Core Stage",
        shortName: "Core Stage",
        role: "LH₂ / LOX Cryogenic Tank & Spine",
        specLabel: "64.6 m × 8.4 m · 2.7M L Cryo Propellant",
        badge: "REAL DATA",
        honestyNote:
          "NASA Marshall/Boeing Core Stage hardware metrics; 3D model envelope measures 73.2 m (matching 73.2 m published stack interface within 0.04%).",
        fact: "Orange spray-on foam insulates internal liquid hydrogen (-253 °C) and liquid oxygen (-183 °C) tanks while bearing full structural launch loads.",
        mainFunction:
          "Stores super-cold liquid hydrogen fuel and liquid oxygen oxidizer, channels them down external feedlines, and forms the structural backbone connecting boosters to upper stages.",
        dimensions:
          "Model envelope: 73.2 m (published: 64.6 m core tankage + 8.6 m interstage/boat-tail) · 8.4 m diameter · 85,275 kg dry mass",
        engineeringSpecs: [
          { label: "Propellants", value: "LH₂ (-253 °C) / LOX (-183 °C)" },
          { label: "Propellant Volume", value: "2.77 million L combined" },
          { label: "Core Burn Time", value: "~485 s (8 min 5 s)" },
          { label: "Stage Adapter", value: "LVSA conical interstage" },
        ],
        levels: {
          level1What:
            "The giant orange cylinder at the center of SLS. It is essentially two gigantic insulated thermoses stacked end-to-end filled with super-cold rocket fuel and oxygen.",
          level2How:
            "Liquid oxygen sits in the upper tank and flows down external pipes outside the lower liquid hydrogen tank to reach the 4 RS-25 engines. Pressurized helium pushes propellant steadily as tanks drain.",
          level3Engineering:
            "Friction-stir-welded 2219 aluminum-lithium alloy barrels withstand 39 MN axial thrust while holding cryogenic fluids 250 °C below freezing. The orange color comes from polyisocyanurate thermal foam that prevents ice buildup on the pad.",
        },
        missionRelevance:
          "Carries Orion and the ICPS nearly all the way to orbit—shutting down at Main Engine Cutoff (MECO) ~165 km up before separating cleanly so the upper stage can circularize orbit.",
        explodeAxis: [0, 0, 0],
        connections: ["sls-rs25", "sls-boosters", "sls-icps"],
        quizPrompt:
          "Click the giant orange cryogenic center tank stack (Core Stage).",
        quizQuestion: {
          prompt:
            "Why is the SLS Core Stage covered in orange foam rather than painted white?",
          options: [
            "It insulates -253 °C LH₂ & -183 °C LOX and prevents thick ice from forming and breaking off during launch",
            "It acts as a heat shield for Earth atmospheric reentry after orbit",
            "Orange foam generates extra electricity from Florida sunlight on the pad",
          ],
          correctIndex: 0,
          explanation:
            "Without spray-on foam insulation, humid Florida air would freeze into heavy ice chunks on the cryogenic tanks that could damage the rocket at liftoff.",
        },
        cameraFocusDist: 23,
        cameraFocusYaw: 0.62,
        cameraFocusPitch: 0.14,
        interactionKind: "stage-sep",
        unlockNoteId: "note-isru-electrolysis",
      },
      {
        id: "sls-rs25",
        name: "RS-25 Engines",
        shortName: "RS-25 Engines",
        role: "4× Staged-Combustion Main Engines",
        specLabel: "4× 2,279 kN Vac · 452.3 s Isp · ±10.5° Gimbal",
        badge: "REAL DATA",
        honestyNote:
          "Authentic Aerojet Rocketdyne RS-25 performance specs; 3D bells support live gimbal preview.",
        fact: "Four heritage Space Shuttle Main Engines burn cryogenic hydrogen and oxygen at 20.6 MPa chamber pressure and steer via hydraulic gimbal actuators.",
        mainFunction:
          "Converts cryogenic LH₂ and LOX into supersonic exhaust steam, steering the entire 2,608-metric-ton stack via synchronized ±10.5° hydraulic nozzle gimbaling.",
        dimensions:
          "4.3 m height × 2.4 m nozzle exit diameter per engine · 3,527 kg dry mass each",
        engineeringSpecs: [
          { label: "Cluster Thrust (Vac)", value: "9,116 kN (4 × 2,279 kN)" },
          { label: "Specific Impulse", value: "366 s (SL) / 452.3 s (Vac)" },
          { label: "Gimbal Authority", value: "±10.5° pitch & yaw" },
          { label: "Throttle Range", value: "67% – 109% (111% SLS)" },
        ],
        levels: {
          level1What:
            "Four bell-shaped rocket engines bolted to the bottom of the Core Stage. They ignite 6.6 seconds before liftoff so computers can verify every pump is healthy before releasing the pad clamps.",
          level2How:
            "High-pressure turbopumps spin over 35,000 RPM to force hydrogen and oxygen into the combustion chamber. Hydraulic pistons tilt each engine bell sideways to keep the rocket balanced like balancing a broom on your hand.",
          level3Engineering:
            "A fuel-rich staged-combustion cycle burns propellant twice—first in dual preburners driving the turbopumps, then in the main regenerative-cooled chamber at 3,300 °C, achieving an exceptional 452.3 s vacuum specific impulse.",
        },
        missionRelevance:
          "Burns continuously for over 8 minutes through max dynamic pressure (Max-Q) and thin upper atmosphere—providing continuous steering even after the solid boosters separate.",
        explodeAxis: [0, -2.4, 0],
        connections: ["sls-core"],
        quizPrompt:
          "Click the 4 metallic bell nozzles mounted beneath the Core Stage (RS-25 Engines).",
        quizQuestion: {
          prompt: "How do the 4 RS-25 engines steer SLS during flight?",
          options: [
            "By tilting each engine bell up to ±10.5° on hydraulic gimbals to vector thrust",
            "By opening wing flaps on the orange Core Stage",
            "By shutting off two engines on one side permanently",
          ],
          correctIndex: 0,
          explanation:
            "Thrust Vector Control (TVC) pivots the entire RS-25 nozzle assembly via hydraulic actuators to torque the rocket smoothly onto its pitch program.",
        },
        cameraFocusDist: 10.5,
        cameraFocusYaw: 0.68,
        cameraFocusPitch: -0.04,
        interactionKind: "rs25-engines",
        unlockNoteId: "note-isru-electrolysis",
      },
      {
        id: "sls-boosters",
        name: "Solid Rocket Boosters",
        shortName: "Twin 5-Seg SRBs",
        role: "75%+ Liftoff Solid Propulsion",
        specLabel: "54.0 m × 3.71 m · ~32,000 kN Combined",
        badge: "REAL DATA",
        honestyNote:
          "Northrop Grumman 5-segment SRB specs; 3D model geometry measures 50.8 m bounding height vs 54.0 m published flight spec (-3.1 m / -5.8% variance).",
        fact: "Twin five-segment solid rocket motors deliver more than three-quarters of SLS thrust during the first two minutes before Booster Separation Motors push them clear.",
        mainFunction:
          "Supplies raw liftoff acceleration to hoist the heavy cryogenic core off Pad 39B and punch through Earth’s dense lower atmosphere.",
        dimensions:
          "Model envelope: 50.8 m (published: 54.0 m / 177 ft) · 3.71 m diameter · 726,000 kg liftoff mass per booster",
        engineeringSpecs: [
          { label: "Max Thrust (Total)", value: "~32,000 kN (2 × 16 MN)" },
          { label: "Specific Impulse", value: "269 s (Vac)" },
          { label: "Burn Duration", value: "126 seconds" },
          { label: "Propellant", value: "PBAN solid composite" },
        ],
        levels: {
          level1What:
            "The two tall white rockets strapped to the left and right sides of the orange Core Stage. Once lit, solid boosters cannot be shut off until all their solid rubbery fuel burns out.",
          level2How:
            "Inside each steel casing is solid propellant molded with a star-shaped hollow core down the middle. Igniting the top blasts hot gas down the entire length, creating huge thrust for two minutes until Booster Separation Motors fire them away.",
          level3Engineering:
            "Upgraded from 4 Space Shuttle segments to 5 segments (added center propellant grain and larger nozzle throat), yielding ~25% more total impulse. The shaped internal grain tailors thrust during Max-Q.",
        },
        missionRelevance:
          "Without the SRBs, the Core Stage alone (TWR < 0.4 at liftoff) could never lift off the pad; jettisoning the heavy empty steel casings at ~45 km saves hundreds of tons of dead weight.",
        explodeAxis: [3.8, -0.2, 0],
        connections: ["sls-core"],
        quizPrompt:
          "Click either of the twin white Solid Rocket Boosters flanking the Core Stage.",
        quizQuestion: {
          prompt:
            "What happens to the Solid Rocket Boosters at about T+2 minutes (~45 km altitude)?",
          options: [
            "Explosive bolts release and 8 small Booster Separation Motors push them cleanly away from the Core Stage",
            "They throttle down to 10% and land vertically back on Pad 39B",
            "They remain attached all the way to lunar orbit",
          ],
          correctIndex: 0,
          explanation:
            "Once solid propellant is spent, forward and aft Booster Separation Motors fire briefly to push the empty casings safely clear of the ascending Core Stage.",
        },
        cameraFocusDist: 22,
        cameraFocusYaw: 0.45,
        cameraFocusPitch: 0.08,
        interactionKind: "propulsion-calc",
      },
      {
        id: "sls-icps",
        name: "ICPS Upper Stage",
        shortName: "ICPS Upper Stage",
        role: "Orbital Circularization & TLI Burn",
        specLabel: "13.7 m × 5.1 m · 1× RL10B-2 · 110 kN · 465.5 s Isp",
        badge: "REAL DATA",
        honestyNote:
          "NASA/ULA Interim Cryogenic Propulsion Stage specs; model reveals extendable RL10B-2 nozzle bell inside LVSA.",
        fact: "Powered by an ultra-efficient extendable-nozzle RL10B-2 engine burning LH₂/LOX in vacuum to fling Orion from Earth orbit toward the Moon.",
        mainFunction:
          "Executes orbit-raising burns after Core Stage MECO and delivers the ~3,150 m/s Trans-Lunar Injection (TLI) burn toward deep space.",
        dimensions: "13.7 m height × 5.1 m diameter · 30,710 kg fueled mass",
        engineeringSpecs: [
          { label: "Engine", value: "1× Aerojet RL10B-2" },
          { label: "Vacuum Thrust", value: "110 kN (24,750 lbf)" },
          { label: "Specific Impulse", value: "465.5 s (LH₂ / LOX)" },
          { label: "Pressurization", value: "High-pressure He COPVs" },
        ],
        levels: {
          level1What:
            "A compact white upper rocket stage hidden between the orange Core Stage adapter and Orion. It only wakes up once the rocket is already high above Earth’s atmosphere.",
          level2How:
            "First it fires briefly to make Orion’s orbit circular instead of falling back into the atmosphere. Then, after systems check, it restarts for ~18 minutes to accelerate Orion past 10.8 km/s toward the Moon.",
          level3Engineering:
            "Derived from the Delta IV Cryogenic Second Stage, the RL10B-2 deploys a carbon-carbon nozzle extension skirt after staging, expanding the exhaust ratio to 285:1 for a world-class 465.5 s vacuum specific impulse.",
        },
        missionRelevance:
          "Provides the exact Trans-Lunar Injection delta-V required to escape low Earth orbit and enter a multi-day trajectory toward lunar orbit.",
        explodeAxis: [0, 1.8, 0],
        connections: ["sls-core", "sls-esm"],
        quizPrompt:
          "Click the white ICPS Upper Stage and exposed RL10B-2 bell above the orange LVSA cone.",
        quizQuestion: {
          prompt:
            "Why does the ICPS only need 110 kN of thrust compared to 39,100 kN at liftoff?",
          options: [
            "In orbital vacuum with lighter remaining mass, high exhaust efficiency (465.5 s Isp) matters far more than brute liftoff force",
            "Because gravity disappears completely at 165 km altitude",
            "Because solid propellant burns slower in space",
          ],
          correctIndex: 0,
          explanation:
            "Earth gravity is still ~95% as strong in LEO, but because Orion is moving sideways at ~7.8 km/s in free-fall vacuum, a gentle, ultra-efficient burn steadily raises apogee all the way to the Moon.",
        },
        cameraFocusDist: 10.5,
        cameraFocusYaw: 0.72,
        cameraFocusPitch: 0.22,
        interactionKind: "propulsion-calc",
        unlockNoteId: "note-isru-electrolysis",
      },
      {
        id: "sls-orion",
        name: "Orion Crew Capsule",
        shortName: "Orion Capsule",
        role: "Pressurized Crew Habitat & Reentry Craft",
        specLabel: "3.3 m × 5.02 m · 4 Crew · Avcoat Heat Shield",
        badge: "REAL DATA",
        honestyNote:
          "Lockheed Martin Orion Crew Module specs; forward docking collar & windows represented in 3D.",
        fact: "Conical pressurized cabin housing up to four astronauts, flight computers, docking adapter, and an ablative heat shield built for 40,000 km/h lunar reentry.",
        mainFunction:
          "Protects crew inside a shirt-sleeve environment during launch, deep-space transit, solar storm shelter, and 2,760 °C Earth atmospheric reentry.",
        dimensions:
          "3.3 m height × 5.02 m base diameter · 9.3 m³ habitable volume · ~10,387 kg reentry mass",
        engineeringSpecs: [
          { label: "Crew Capacity", value: "4 astronauts (up to 21 d)" },
          { label: "Heat Shield", value: "Avcoat ablative TPS (5.0 m)" },
          { label: "Reentry Speed", value: "11.0 km/s (~40,000 km/h)" },
          { label: "Radiation Shelter", value: "Hydrogen-rich water walls" },
        ],
        levels: {
          level1What:
            "The cone-shaped astronaut cabin near the very top of the rocket. It is the only part of the entire 98-meter SLS vehicle that actually comes back to Earth and splashes down in the ocean.",
          level2How:
            "Windows and navigation sensors let astronauts monitor docking, while dense water storage bags inside the lower bay absorb incoming solar storm radiation (OSDR OSD-569). At mission end, it separates from the service module and rides its heat shield through Earth’s atmosphere.",
          level3Engineering:
            "Reentry from lunar distance hits the atmosphere at ~11 km/s—nearly twice the kinetic energy per kilogram of ISS return. The skip-entry trajectory and Avcoat blocks manage peak heating (~2,760 °C) and G-loads (< 4 g).",
        },
        missionRelevance:
          "Serves as the crew’s lifeboat, radiation storm shelter, and precision Earth-return capsule at the end of every Artemis voyage.",
        explodeAxis: [0, 5.2, 0],
        connections: ["sls-esm", "sls-las"],
        quizPrompt:
          "Click the conical Orion Crew Capsule seated between the Service Module and Abort Tower.",
        quizQuestion: {
          prompt:
            "Which part of the SLS stack returns astronauts safely through Earth’s atmosphere?",
          options: [
            "Only the Orion Crew Capsule with its Avcoat ablative heat shield",
            "Orion together with the European Service Module and solar wings",
            "The ICPS upper stage and Orion together",
          ],
          correctIndex: 0,
          explanation:
            "Right before Earth atmospheric entry interface, Orion jettisons the European Service Module and turns its 5-meter blunt Avcoat heat shield into the plasma flow.",
        },
        cameraFocusDist: 7.5,
        cameraFocusYaw: 0.58,
        cameraFocusPitch: 0.25,
        interactionKind: "stage-sep",
        unlockNoteId: "note-orion-water-shield",
      },
      {
        id: "sls-esm",
        name: "European Service Module",
        shortName: "Service Module (ESM)",
        role: "Power, Propulsion, Air & Thermal Control",
        specLabel: "4.0 m × 4.1 m · 19 m Span · ~11.2 kW X-Wing",
        badge: "REAL DATA",
        honestyNote:
          "ESA / Airbus European Service Module specs; 3D unfolds 4 X-wing solar arrays on deploy preview.",
        fact: "Built by ESA in Europe, the cylindrical Service Module powers Orion with four X-wing solar arrays and carries 8.6 tons of storable propellant, water, oxygen, and nitrogen.",
        mainFunction:
          "Supplies electrical power, breathable air, drinking water, thermal radiators, main orbital maneuvering thrust, and 24 RCS attitude jets for Orion.",
        dimensions:
          "4.0 m height × 4.1 m body diameter · 19.0 m deployed solar array span · ~15,461 kg fueled",
        engineeringSpecs: [
          { label: "Main Engine", value: "1× AJ10-190 (26.7 kN)" },
          { label: "Solar Power", value: "~11.2 kW (4× 7.3 m wings)" },
          { label: "RCS / Aux", value: "8 aux + 24 RCS thrusters" },
          { label: "Consumables", value: "240 kg H₂O + 90 kg O₂ + 30 kg N₂" },
        ],
        levels: {
          level1What:
            "The dark cylindrical backpack strapped directly under the Orion Crew Capsule. It carries the fuel, air, water, and four foldable solar wings that keep astronauts alive.",
          level2How:
            "Once clear of Earth’s atmosphere, its four solar wings unfold into an X-shape to make 11.2 kilowatts of electricity. Its main engine brakes Orion into lunar orbit and later fires to send the crew back toward Earth.",
          level3Engineering:
            "Uses hypergolic MON-3 oxidizer and MMH fuel—propellants that ignite on contact without spark plugs and stay liquid in space without cryogenic boil-off over 21+ day missions.",
        },
        missionRelevance:
          "Performs lunar orbit insertion (LOI) and trans-Earth injection (TEI), while sustaining crew life support until separating minutes before Earth splashdown.",
        explodeAxis: [0, 3.6, 0],
        connections: ["sls-icps", "sls-orion"],
        quizPrompt:
          "Click the dark European Service Module cylinder and folded solar wings below Orion.",
        quizQuestion: {
          prompt:
            "Why does the European Service Module use hypergolic propellants instead of LH₂/LOX?",
          options: [
            "Hypergolics stay liquid for weeks without boiling off and ignite reliably on contact for critical lunar orbit maneuvers",
            "They have higher specific impulse than liquid hydrogen",
            "They are lighter than helium gas",
          ],
          correctIndex: 0,
          explanation:
            "Cryogenic hydrogen slowly boils away over multi-week flights; hypergolic propellants remain storable at spacecraft temperatures and ignite instantly every time.",
        },
        cameraFocusDist: 8.5,
        cameraFocusYaw: 0.78,
        cameraFocusPitch: 0.16,
        interactionKind: "solar-array",
        unlockNoteId: "note-orion-water-shield",
      },
      {
        id: "sls-las",
        name: "Launch Abort System",
        shortName: "Launch Abort System",
        role: "Crew Escape Tower & Aero Shroud",
        specLabel: "13.6 m Tower · ~1,800 kN Abort Motor · 0–90 km",
        badge: "REAL DATA",
        honestyNote:
          "NASA/Northrop Grumman/Lockheed LAS specs; 3D model geometry measures 14.3 m bounding height vs 15.2 m published flight spec (-1.0 m / -6.4% variance).",
        fact: "Pointed aerodynamic escape tower capable of pulling Orion safely away from a failing booster in milliseconds, then jettisoning cleanly once clear of the atmosphere.",
        mainFunction:
          "Pulled-away crew safety shield on pad/ascent emergencies and aerodynamic nose cone protecting Orion windows until ~90 km altitude.",
        dimensions: "Model envelope: 14.3 m (published: 15.2 m / 50 ft) · ~7,300 kg mass",
        engineeringSpecs: [
          { label: "Abort Motor", value: "~1,800 kN (> 12 g pull)" },
          { label: "Attitude Motor", value: "8 valves steer escape arc" },
          { label: "Jettison Motor", value: "Fires at ~90 km (T+3:20)" },
          { label: "Operating Window", value: "Pad T-0 through upper atmo" },
        ],
        levels: {
          level1What:
            "The tall pointed needle at the very top of SLS. Think of it like an ejection seat for the entire Orion Crew Capsule if anything goes wrong on the launch pad or during climb.",
          level2How:
            "In an emergency, four downward-angled nozzles fire with enormous thrust in milliseconds to yank Orion clear of the rocket, while steering valves at the tip flip Orion upright for parachute landing.",
          level3Engineering:
            "Features three distinct solid motors in one composite ogive shroud: the 1.8 MN Abort Motor (pull-away), Attitude Control Motor (pitch over), and Jettison Motor (nominal clean peel-off at ~90 km once atmospheric heating drops).",
        },
        missionRelevance:
          "Protects crew lives from T-0 through Max-Q; jettisoning it early after SRB staging sheds ~7 tons of mass so the Core Stage reaches orbit efficiently.",
        explodeAxis: [0, 6.9, 0],
        connections: ["sls-orion"],
        quizPrompt:
          "Click the white pointed Launch Abort System tower at the very top of the rocket.",
        quizQuestion: {
          prompt:
            "When is the Launch Abort System normally jettisoned on a healthy Artemis launch?",
          options: [
            "Around ~90 km altitude after SRB separation, once the upper atmosphere is thin enough to save weight",
            "On the launch pad right before liftoff",
            "After reaching Lunar Orbit",
          ],
          correctIndex: 0,
          explanation:
            "Once clear of dense atmosphere (~90 km), an abort no longer needs aerodynamic shielding, and Orion’s own engines can handle orbital aborts—shedding the 7-ton tower boosts payload.",
        },
        cameraFocusDist: 7.2,
        cameraFocusYaw: 0.62,
        cameraFocusPitch: 0.28,
        interactionKind: "stage-sep",
      },
    ],
  },

  satellite: {
    id: "satellite",
    shortLabel: "TDRS Relay",
    title: "Tracking and Data Relay Satellite (TDRS)",
    subtitle:
      "4.5 m Dual Mesh Dishes · S/Ku/Ka-Band · 35,786 km Geosynchronous Orbit",
    summary:
      "NASA Space Network flagship communications satellite providing continuous high-bandwidth two-way data and telemetry coverage for human spaceflight (ISS, Orion) and robotic science missions.",
    scenarioDistinction:
      "Official NASA SCaN Space Network TDRS satellite specifications; 3D geometry represents the Boeing 601/702 flight bus.",
    modelHonestyTag: "NASA Hardware Specs",
    defaultCameraDist: 8.2,
    focusY: 0,
    overviewSpecs: [
      { label: "Dual Dishes", value: "4.5 m deployable mesh" },
      { label: "Orbit", value: "35,786 km GEO" },
      { label: "Frequencies", value: "S, Ku, Ka-Band" },
    ],
    sources: [
      "NASA Space Communications and Navigation (SCaN) Program Overview (https://www.nasa.gov/communicating-with-missions/)",
      "NASA Space Network TDRSS Ground Facilities (https://www.nasa.gov/communicating-with-missions/)",
    ],
    parts: [
      {
        id: "sat-bus",
        name: "Kapton Bus & Magnetometer Boom",
        shortName: "Bus & Magnetometer",
        role: "Avionics, Attitude & Solar Wind Core",
        specLabel: "MLI Kapton Foil · Fluxgate Boom · Star Trackers",
        badge: "REFERENCE VALUE",
        honestyNote:
          "Educational hybrid: mirrors NASA HERMES magnetometer boom + octagonal spacecraft bus.",
        fact: "Gold multi-layer Kapton foil insulates electronics while the rigid lower boom places the fluxgate magnetometer clear of spacecraft magnetic noise.",
        mainFunction:
          "Houses flight computers, reaction wheels, star trackers, and space-weather particle sensors while isolating sensitive magnetic measurements on an extendable boom.",
        dimensions:
          "Educational 3D scale ~1.5 m bus body + 1.8 m magnetometer boom (approx. proxy)",
        engineeringSpecs: [
          { label: "Thermal Coat", value: "Gold MLI Kapton + Louvers" },
          { label: "Attitude Nav", value: "Dual optical star trackers" },
          { label: "Weather Sensor", value: "Fluxgate magnetometer" },
          { label: "Propulsion", value: "4-corner RCS thruster pods" },
        ],
        levels: {
          level1What:
            "The shiny gold octagon in the middle of the satellite plus the long metal stick hanging underneath with a diamond sensor at its tip.",
          level2How:
            "The gold foil acts like an emergency space blanket reflecting brutal sunlight. Star trackers read star patterns to aim the dishes accurately, while the boom sensor detects magnetic shockwaves from solar flares.",
          level3Engineering:
            "Placing a fluxgate magnetometer at the end of a rigid boom removes stray electromagnetic fields generated by solar array currents and reaction wheel motors inside the bus.",
        },
        missionRelevance:
          "Measures solar-wind speed and magnetic polarity ahead of astronauts on the Moon so surface teams get early warning of DONKI solar particle storms.",
        explodeAxis: [0, -1.2, 0],
        connections: ["sat-solar", "sat-dish"],
        quizPrompt:
          "Click the octagonal gold spacecraft body or the lower magnetometer boom.",
        quizQuestion: {
          prompt:
            "Why is the fluxgate magnetometer mounted at the end of a long boom away from the satellite body?",
          options: [
            "To keep spacecraft electronics and currents from interfering with sensitive magnetic field readings",
            "To serve as a landing leg on the lunar surface",
            "To store liquid hydrogen fuel outside the bus",
          ],
          correctIndex: 0,
          explanation:
            "Power cables and motors create tiny magnetic fields inside the bus; extending the sensor out on a boom guarantees clean space-weather measurements.",
        },
        cameraFocusDist: 5.8,
        cameraFocusYaw: 0.55,
        cameraFocusPitch: -0.05,
        interactionKind: "gimbal-attitude",
        unlockNoteId: "note-hermes-relay",
      },
      {
        id: "sat-solar",
        name: "Twin Roll-Out Solar Wings",
        shortName: "Solar Wings",
        role: "Photovoltaic Electrical Power System",
        specLabel: "2× Multi-Panel Hinged Arrays",
        badge: "REFERENCE VALUE",
        honestyNote:
          "Representative multi-panel PV array geometry (approx. 8 m deployed span in simulator).",
        fact: "Dual opposing solar wings rotate along a central gimbal axis to track the Sun continuously while the relay dishes stay pointed at the Moon and Earth.",
        mainFunction:
          "Harvests solar irradiance in deep space to charge onboard batteries and power continuous Ka-band and S-band telemetry amplifiers.",
        dimensions:
          "Educational 3D span ~8.2 m tip-to-tip with central truss spine",
        engineeringSpecs: [
          { label: "Cell Chemistry", value: "Triple-junction GaAs PV" },
          { label: "Articulation", value: "Single-axis solar alpha gimbal" },
          { label: "Efficiency", value: "~29–30% space-grade PV" },
          { label: "Deployment", value: "Motorized spring yoke hinges" },
        ],
        levels: {
          level1What:
            "The two wide blue wing panels stretching out from either side of the gold satellite box.",
          level2How:
            "Packed tightly inside the rocket fairing during launch, spring-loaded hinges unfold both wings once in orbit. Drive motors turn them slowly to face sunlight even while the satellite points elsewhere.",
          level3Engineering:
            "Multi-junction gallium arsenide photovoltaic cells capture blue, red, and infrared solar wavelengths simultaneously, achieving nearly double the efficiency of standard rooftop silicon panels.",
        },
        missionRelevance:
          "Keeps high-power radio transmitters and radiation monitors running 24/7 around Gateway orbit so rovers never lose relay contact.",
        explodeAxis: [2.4, 0, 0],
        connections: ["sat-bus"],
        quizPrompt:
          "Click either blue solar wing array extending left or right.",
        quizQuestion: {
          prompt:
            "How can the satellite keep its solar wings aimed at the Sun while its dishes point at the Moon?",
          options: [
            "Rotary solar drive gimbals turn the wings independently of the spacecraft body",
            "The satellite flips upside down every 10 seconds",
            "Solar panels work equally well in total darkness",
          ],
          correctIndex: 0,
          explanation:
            "Solar array drive assemblies (SADAs) rotate the wings around their Y-axis mount so the main bus remains locked onto surface targets.",
        },
        cameraFocusDist: 7.4,
        cameraFocusYaw: 0.35,
        cameraFocusPitch: 0.38,
        interactionKind: "solar-array",
        unlockNoteId: "note-malapert-sunlight",
      },
      {
        id: "sat-dish",
        name: "Ka-Band & Umbrella Relay Dishes",
        shortName: "Relay Dishes",
        role: "High-Data-Rate Optical/RF Telemetry",
        specLabel: "2× Gold Mesh Umbrellas + Central Ka-Band",
        badge: "REFERENCE VALUE",
        honestyNote:
          "TDRS-inspired twin deployable gold-mesh reflectors combined with gimbaled Ka-band antenna.",
        fact: "Twin umbrella mesh reflectors expand in microgravity to focus faint deep-space radio waves alongside a precision gimbaled Ka-band link dish.",
        mainFunction:
          "Beams high-resolution terrain contour maps, rover science data, and real-time solar storm alerts between lunar surface crews and Earth.",
        dimensions:
          "Educational 3D diameter ~1.7 m mesh dishes + 1.2 m central Ka-band dish",
        engineeringSpecs: [
          { label: "Bands", value: "S-Band & High-Rate Ka-Band" },
          { label: "Reflector Mesh", value: "Gold-plated molybdenum wire" },
          { label: "Steering", value: "2-axis gimbaled feed assembly" },
          { label: "Link Latency", value: "~1.28 s Earth–Moon one-way" },
        ],
        levels: {
          level1What:
            "The two round gold mesh umbrella dishes and the white central dish mounted on top of the satellite.",
          level2How:
            "Like flashlights working in reverse, curved parabolic bowls bounce weak radio signals from miles away onto a tiny receiver tip hanging in front of each dish.",
          level3Engineering:
            "Knitted gold-plated molybdenum wire weighs a fraction of solid aluminum while reflecting millimeter-wave Ka-band frequencies, enabling tens of megabits per second from lunar orbit.",
        },
        missionRelevance:
          "Relays signals around shadowed South Pole crater walls where Earth sits low on the horizon, unlocking high-res hazard maps for surface landings.",
        explodeAxis: [0, 1.8, 1.0],
        connections: ["sat-bus"],
        quizPrompt:
          "Click the gold mesh umbrella dishes or white central Ka-band dish.",
        quizQuestion: {
          prompt:
            "Why are the two large umbrella dishes built from gold-plated wire mesh instead of solid metal plates?",
          options: [
            "Mesh folds compactly for rocket launch and is ultra-light while still reflecting radio waves",
            "Radio waves pass straight through gold wire so nothing is reflected",
            "Solid metal plates melt at lunar orbit temperatures",
          ],
          correctIndex: 0,
          explanation:
            "When mesh holes are much smaller than the radio wavelength, the screen reflects signals just like a solid mirror at a fraction of the launch mass.",
        },
        cameraFocusDist: 5.8,
        cameraFocusYaw: 0.72,
        cameraFocusPitch: 0.28,
        interactionKind: "gimbal-attitude",
        unlockNoteId: "note-hermes-relay",
      },
    ],
  },

  jwst: {
    id: "jwst",
    shortLabel: "JWST Telescope",
    title: "James Webb Space Telescope",
    subtitle: "6.5 m Gold Mirror · 5-Layer Sunshield · Sun-Earth L2",
    summary:
      "Premier infrared space observatory orbiting 1.5 million km from Earth, studying the first stars and exoplanet atmospheres.",
    scenarioDistinction:
      "NASA / ESA / CSA James Webb Space Telescope published architecture and thermal design metrics.",
    modelHonestyTag: "NASA Hardware Specs",
    defaultCameraDist: 10.6,
    focusY: 0.35,
    overviewSpecs: [
      { label: "Primary Aperture", value: "6.5 m" },
      { label: "Cold Side Temp", value: "-233 °C" },
      { label: "Orbit Distance", value: "1.5M km (L2)" },
    ],
    sources: [
      "NASA Science Webb Telescope Fact Sheet (https://science.nasa.gov/mission/webb/fact-sheet/)",
      "NASA Science Webb Innovations & Sunshield (https://science.nasa.gov/mission/webb/fact-sheet/)",
    ],
    parts: [
      {
        id: "jwst-mirror",
        name: "18 Gold Beryllium Hex Mirrors",
        shortName: "Primary Mirror (18 Hex)",
        role: "6.5 m Infrared Light Collector",
        specLabel: "18× 1.32 m Hexagons · 100 nm Gold Coat",
        badge: "REAL DATA",
        honestyNote:
          "Authentic 18-segment honeycomb layout and beryllium/gold optical specifications.",
        fact: "Eighteen lightweight hexagonal beryllium segments coated in 100 nanometers of pure gold collect faint infrared starlight from over 13 billion years ago.",
        mainFunction:
          "Captures extremely faint infrared photons from ancient galaxies and cool exoplanet atmospheres and focuses them with nanometer precision.",
        dimensions:
          "6.5 m overall diameter · 25.4 m² collecting area · 20 kg per beryllium segment",
        engineeringSpecs: [
          { label: "Substrate", value: "Cryogenic Beryllium" },
          { label: "Reflective Coat", value: "100 nm vapor-deposited gold" },
          { label: "Actuators", value: "132 hexapod micro-motors" },
          { label: "Operating Temp", value: "-233 °C (40 K)" },
        ],
        levels: {
          level1What:
            "The giant golden honeycomb made of 18 flat hexagons sitting above the silver sunshield.",
          level2How:
            "Gold reflects red and infrared light far better than ordinary aluminum mirrors. Tiny motors behind every hexagon nudge each segment by less than 1/10,000th the width of a human hair so all 18 act as one giant mirror.",
          level3Engineering:
            "Beryllium stays rigid at 40 K without warping from thermal contraction. Seven actuators per segment (6-DOF hexapod + radius-of-curvature actuator) align wavefront errors below ~150 nm RMS.",
        },
        missionRelevance:
          "Detects water vapor, methane, and carbon dioxide signatures in distant planetary atmospheres and peers through cosmic dust where Hubble’s visible optics cannot see.",
        explodeAxis: [0, 2.2, 0.7],
        connections: ["jwst-secondary", "jwst-sunshield"],
        quizPrompt:
          "Click the golden honeycomb of 18 hexagonal mirror segments.",
        quizQuestion: {
          prompt:
            "Why are JWST’s mirrors coated in gold rather than silver or aluminum?",
          options: [
            "Gold reflects over 98% of infrared wavelengths that Webb observes from the early universe",
            "Gold makes the mirror heavier to resist micrometeoroids",
            "Gold glows visibly in deep space so astronauts can spot it",
          ],
          correctIndex: 0,
          explanation:
            "While aluminum reflects UV and blue light well, gold is far more reflective across near- and mid-infrared wavelengths (> 0.6 micrometers).",
        },
        cameraFocusDist: 6.8,
        cameraFocusYaw: 0.42,
        cameraFocusPitch: 0.22,
        interactionKind: "optics-mirror",
      },
      {
        id: "jwst-secondary",
        name: "Tripod & Secondary Mirror",
        shortName: "Secondary Optics",
        role: "Cassegrain Focal Relay Assembly",
        specLabel: "0.74 m Convex Mirror · 3 Carbon Struts",
        badge: "REAL DATA",
        honestyNote:
          "Authentic 3-strut deployable optical tower holding the convex secondary mirror.",
        fact: "A convex gold-beryllium secondary mirror suspended on three carbon-composite booms bounces collected infrared light into the aft science instruments.",
        mainFunction:
          "Intercepts light converged by the 18 primary hexagons and directs a tightly focused beam back through the central aft-optics baffle into ISIM cameras.",
        dimensions:
          "0.74 m convex secondary diameter · ~7.6 m carbon-fiber tripod struts",
        engineeringSpecs: [
          { label: "Strut Material", value: "Carbon-fiber composite" },
          { label: "Mirror Diameter", value: "0.74 m convex beryllium" },
          { label: "Optical Design", value: "Three-mirror anastigmat" },
          { label: "Pointing Stability", value: "~6.7 milliarcseconds" },
        ],
        levels: {
          level1What:
            "The round cap held far out in front of the golden honeycomb by three thin dark legs.",
          level2How:
            "Light hits the big gold honeycomb first, bounces forward to this smaller secondary mirror, and then shoots straight back through the center hole into four super-cooled cameras.",
          level3Engineering:
            "Carbon-composite tubes have near-zero thermal expansion across a 250 °C cooldown, ensuring the secondary mirror stays at the exact focal distance once deployed at L2.",
        },
        missionRelevance:
          "Unfolding this tripod cleanly in space was one of Webb’s highest-stakes deployments—without it in exact alignment, images would never come into focus.",
        explodeAxis: [0, 1.4, 2.8],
        connections: ["jwst-mirror"],
        quizPrompt:
          "Click the 3-legged tripod boom and round secondary mirror held out front.",
        quizQuestion: {
          prompt:
            "Where does infrared light travel immediately after bouncing off the secondary mirror?",
          options: [
            "Back into the central optical baffle feeding Webb’s cooled science cameras and spectrographs",
            "Straight out into deep space toward the Sun",
            "Into the bottom solar panel array for power generation",
          ],
          correctIndex: 0,
          explanation:
            "In Webb’s three-mirror anastigmat telescope, the secondary mirror directs light back through the central nose cone (aft-optics subsystem) into ISIM.",
        },
        cameraFocusDist: 6.6,
        cameraFocusYaw: 0.95,
        cameraFocusPitch: 0.14,
        interactionKind: "optics-mirror",
      },
      {
        id: "jwst-sunshield",
        name: "5-Layer Tennis-Court Sunshield",
        shortName: "5-Layer Sunshield",
        role: "Passive Cryogenic Heat Barrier",
        specLabel: "21.2 m × 14.2 m · 5× Kapton Layers",
        badge: "REAL DATA",
        honestyNote:
          "Authentic 5-membrane diamond kite thermal shield architecture.",
        fact: "Five hair-thin aluminum- and silicon-coated Kapton sheets create a 300 °C temperature drop from the sun-baked underside to the frozen mirrors above.",
        mainFunction:
          "Blocks infrared heat radiated by the Sun, Earth, and Moon so the telescope cools passively to -233 °C without obscuring its own infrared sensors.",
        dimensions:
          "21.197 m × 14.162 m kite area · 0.025–0.05 mm membrane thickness",
        engineeringSpecs: [
          { label: "Hot Layer Temp", value: "+85 °C (358 K)" },
          { label: "Cold Layer Temp", value: "-233 °C (40 K)" },
          { label: "Layer Count", value: "5 tensioned Kapton sheets" },
          { label: "Heat Rejection", value: "~300,000 W solar -> < 1 W" },
        ],
        levels: {
          level1What:
            "The huge five-layer silver diamond kite under the mirrors—roughly the size of a tennis court.",
          level2How:
            "Why 5 separated sheets instead of 1 thick blanket? Vacuum gaps between every sheet let trapped heat escape sideways out the edges, so each higher layer gets dramatically colder than the one below it.",
          level3Engineering:
            "Coated with vapor-deposited aluminum (and pink doped-silicon on the hottest sunward layers for emissivity), each membrane is separated by spreader bars to stop conductive heat transfer.",
        },
        missionRelevance:
          "If Webb’s optics warmed up even slightly, the telescope’s own glow would blind its infrared detectors to faint light from the first galaxies.",
        explodeAxis: [0, -1.6, 0],
        connections: ["jwst-mirror", "jwst-bus"],
        quizPrompt:
          "Click the 5-layer diamond-shaped Kapton sunshield below the mirrors.",
        quizQuestion: {
          prompt:
            "Why does JWST use 5 thin separated Kapton sheets instead of a single solid metal plate?",
          options: [
            "Vacuum gaps between thin reflective layers force heat to radiate out the sides, cooling each successive layer dramatically",
            "Because 5 layers generate more aerodynamic lift at L2",
            "So micrometeoroids bounce harmlessly upward into the mirror",
          ],
          correctIndex: 0,
          explanation:
            "Each vacuum gap stops conduction and cuts radiative heat transfer step by step, dropping temperature from +85 °C on layer 1 down to -233 °C on layer 5.",
        },
        cameraFocusDist: 9.6,
        cameraFocusYaw: 0.65,
        cameraFocusPitch: 0.34,
        interactionKind: "thermal-shield",
      },
      {
        id: "jwst-bus",
        name: "Spacecraft Bus & Solar Wing",
        shortName: "Bus & Solar Wing",
        role: "Power, Steering & Earth Downlink",
        specLabel: "2 kW Solar Wing · Reaction Wheels · Ka Dish",
        badge: "REAL DATA",
        honestyNote:
          "Authentic warm-side spacecraft bus positioning beneath the 5-layer sunshield.",
        fact: "Tucked permanently on the sunny underside at comfortable room temperature, housing guidance computers, thruster propellant, reaction wheels, and Webb’s solar array.",
        mainFunction:
          "Powers the entire observatory, stabilizes pointing to milliarcsecond precision, performs L2 station-keeping burns, and transmits science data back to Earth.",
        dimensions:
          "Approx. 3.5 m bus structure + 6 m deployable solar wing (warm side)",
        engineeringSpecs: [
          { label: "Bus Temp", value: "~20 °C (Warm Side)" },
          { label: "Solar Power", value: "~2,000 W continuous" },
          { label: "Fine Pointing", value: "6 reaction wheels" },
          { label: "Data Rate", value: "~28+ GB/day via DSN" },
        ],
        levels: {
          level1What:
            "The dark equipment box and solar wing tucked underneath the bottom of the giant sunshield.",
          level2How:
            "Because electronics and batteries freeze below -40 °C, keeping them on the sunlit bottom keeps computers cozy while the telescope stays freezing above. Spinning reaction wheels turn Webb smoothly without shaking.",
          level3Engineering:
            "A momentum-unloading solar trim flap extends aft to balance solar radiation pressure torque across the 300 m² sunshield, conserving hydrazine propellant for a 20+ year L2 mission.",
        },
        missionRelevance:
          "Feeds electrical power through insulated cryo-harnesses across the sunshield and streams high-rate spectra back to NASA’s Deep Space Network.",
        explodeAxis: [0, -3.0, -0.7],
        connections: ["jwst-sunshield"],
        quizPrompt:
          "Click the spacecraft bus box and solar wing tucked underneath the sunshield.",
        quizQuestion: {
          prompt:
            "Why are Webb’s flight computers and solar wing mounted on the sunlit underside of the sunshield?",
          options: [
            "To keep electronics at room temperature and provide continuous sunlight for the solar array",
            "To hide the solar wing from Earth radar",
            "Because computers run faster when warmed to +300 °C",
          ],
          correctIndex: 0,
          explanation:
            "Keeping the bus on the warm sun-facing side keeps avionics within safe operating temperatures and guarantees uninterrupted solar power.",
        },
        cameraFocusDist: 7.4,
        cameraFocusYaw: 2.2,
        cameraFocusPitch: -0.25,
        interactionKind: "solar-array",
      },
    ],
  },

  voyager: {
    id: "voyager",
    shortLabel: "Voyager Probe",
    title: "Voyager Interstellar Probe",
    subtitle:
      "3.7 m Dish · 3× Plutonium RTGs · Golden Record · Interstellar Space",
    summary:
      "Launched in 1977, humanity’s farthest operating spacecraft—exploring all four giant planets and now crossing interstellar space.",
    scenarioDistinction:
      "NASA / JPL Voyager 1 & 2 historic spacecraft measurements and subsystems.",
    modelHonestyTag: "NASA Hardware Specs",
    defaultCameraDist: 10.6,
    focusY: 0.1,
    overviewSpecs: [
      { label: "High-Gain Dish", value: "3.7 m" },
      { label: "Launch Mass", value: "721.9 kg" },
      { label: "Power Source", value: "3× Pu-238 RTG" },
    ],
    sources: [
      "NASA Science Voyager Mission Overview (https://science.nasa.gov/mission/voyager/)",
      "NASA Science Voyager Interstellar Trajectory Milestones (https://science.nasa.gov/mission/voyager/)",
    ],
    parts: [
      {
        id: "voy-dish",
        name: "3.7 m High-Gain Dish Antenna",
        shortName: "3.7 m High-Gain Dish",
        role: "Interstellar Deep-Space Radio Link",
        specLabel: "3.7 m Parabolic · S/X-Band · > 22 hr Light Lag",
        badge: "REAL DATA",
        honestyNote:
          "Authentic 3.7 m parabolic high-gain reflector geometry & X-band link metrics.",
        fact: "Aimed steadily back toward Earth from over 24 billion kilometers away, focusing 20-watt radio whispers so 70-meter Deep Space Network antennas can hear them.",
        mainFunction:
          "Receives faint uplink commands from Earth and beams scientific telemetry across the outer solar system and interstellar medium.",
        dimensions:
          "3.7 m parabolic diameter · ~0.5 m sub-reflector on 3 tripod struts",
        engineeringSpecs: [
          { label: "Dish Diameter", value: "3.7 m (12 ft)" },
          { label: "TX Power", value: "~22.4 W (like a fridge bulb)" },
          { label: "One-Way Light Time", value: "> 22.5 hours (Voyager 1)" },
          { label: "Frequencies", value: "X-Band (8.4 GHz) / S-Band" },
        ],
        levels: {
          level1What:
            "The big white satellite bowl sitting on top of Voyager, permanently pointed back toward Earth.",
          level2How:
            "Even though Voyager’s transmitter uses less power than a household light bulb, this precision 3.7-meter reflector focuses the radio beam tightly toward Earth, where giant 70-meter dishes catch fractions of a billionth of a watt.",
          level3Engineering:
            "The Cassegrain dual-reflector geometry bounces X-band (8.4 GHz) and S-band signals off the main paraboloid to the tripod sub-reflector and down into the central wave-guide feed horn.",
        },
        missionRelevance:
          "Without continuous micro-thruster attitude control keeping this dish locked within 0.5° of Earth, humanity would lose contact with its interstellar emissary.",
        explodeAxis: [0, 2.0, 0],
        connections: ["voy-bus"],
        quizPrompt:
          "Click the large 3.7 m white circular parabolic antenna dish on top.",
        quizQuestion: {
          prompt:
            "Roughly how much radio transmitter power does Voyager use to communicate across > 24 billion km?",
          options: [
            "Only ~20–23 watts—about the power of a small refrigerator light bulb—focused by its 3.7 m dish",
            "Over 500,000 watts using a giant laser beam",
            "Zero watts—it bounces sunlight back to Earth",
          ],
          correctIndex: 0,
          explanation:
            "Voyager’s aged RTG power budget allows only ~22 W for its X-band transmitter; NASA’s 70-meter Deep Space Network arrays amplify the whisper back on Earth.",
        },
        cameraFocusDist: 7.4,
        cameraFocusYaw: 0.52,
        cameraFocusPitch: 0.42,
        interactionKind: "gimbal-attitude",
      },
      {
        id: "voy-bus",
        name: "10-Bay Decagonal Bus & Golden Record",
        shortName: "10-Bay Bus & Record",
        role: "Avionics Frame & Interstellar Time Capsule",
        specLabel: "1.78 m 10-Bay Ring · 30 cm Gold-Plated Copper Disc",
        badge: "REAL DATA",
        honestyNote:
          "Authentic 10-bay electronics frame and 30 cm Voyager Golden Record disc.",
        fact: "Ten modular electronics bays house 69 KB of flight computer memory, while the mounted Golden Record carries music, greetings in 55 languages, and Earth’s pulsar map.",
        mainFunction:
          "Protects flight computers, tape storage, and hydrazine attitude propellants inside a temperature-controlled ring carrying humanity’s interstellar message.",
        dimensions:
          "1.78 m across flats · 0.47 m bay height · 30 cm Golden Record cover",
        engineeringSpecs: [
          { label: "Computer Memory", value: "69.63 KB total (3 dual CPUs)" },
          { label: "Record Medium", value: "Gold-plated copper phonograph" },
          { label: "Record Contents", value: "115 images + 90 min audio" },
          { label: "Attitude Fuel", value: "Hydrazine monopropellant" },
        ],
        levels: {
          level1What:
            "The ten-sided ring underneath the white dish, with the shiny gold phonograph record bolted onto its outside wall.",
          level2How:
            "Inside the 10 bays are three pairs of computers with less memory than a modern wristwatch—yet engineers still rewrite and upload code to them from billions of miles away. The Golden Record includes instructions engraved in hydrogen-atom ticks.",
          level3Engineering:
            "Thermal louvers along the bays open and close mechanically via bimetallic springs to trap waste heat inside the electronics ring without using electrical motors.",
        },
        missionRelevance:
          "Runs fault-protection algorithms autonomously over 45+ years of interstellar radiation while preserving Earth’s cultural archive for billions of years.",
        explodeAxis: [0, -0.8, 0.9],
        connections: ["voy-dish", "voy-rtg", "voy-scan"],
        quizPrompt:
          "Click the 10-sided central frame carrying the bright Golden Record disc.",
        quizQuestion: {
          prompt:
            "How do aliens (or future explorers) know how to play the Voyager Golden Record?",
          options: [
            "Pictograms engraved on the aluminum cover show the stylus, spin speed, and hydrogen atom time unit alongside a pulsar map of Earth",
            "A Wi-Fi router inside the bus broadcasts MP3 files",
            "It requires reading an instruction manual left on Jupiter",
          ],
          correctIndex: 0,
          explanation:
            "Carl Sagan’s team etched universal physics diagrams based on the hyperfine transition of neutral hydrogen (1,420 MHz) to explain playback speed and video decoding.",
        },
        cameraFocusDist: 5.5,
        cameraFocusYaw: 0.25,
        cameraFocusPitch: 0.08,
        interactionKind: "gimbal-attitude",
      },
      {
        id: "voy-rtg",
        name: "3× Plutonium RTG Power Boom",
        shortName: "3× Plutonium RTGs",
        role: "Nuclear Radioisotope Electricity",
        specLabel: "3× MHW-RTG · Pu-238 · 470 W Launch -> ~220 W",
        badge: "REAL DATA",
        honestyNote:
          "Authentic 3-unit MHW-RTG boom offset away from sensitive science sensors.",
        fact: "Sunlight at Neptune is 900 times dimmer than at Earth—so Voyager uses heat from Plutonium-238 radioactive decay turned directly into electricity by thermocouples.",
        mainFunction:
          "Generates continuous electrical power independent of sunlight for decades across the outer planets and interstellar space.",
        dimensions:
          "3 stacked cylinders (~1.1 m long × 0.4 m dia each) on ~3.7 m structural boom",
        engineeringSpecs: [
          { label: "Launch Output", value: "470 W electrical (at 30 V DC)" },
          { label: "Pu-238 Half-Life", value: "87.7 years" },
          {
            label: "Conversion",
            value: "SiGe thermocouples (no moving parts)",
          },
          { label: "Present Output", value: "~220 W (gradual decay)" },
        ],
        levels: {
          level1What:
            "The three black finned cylinders lined up on a boom sticking out to the left side.",
          level2How:
            "No solar panels could power Voyager out past Saturn where sunlight is hundreds of times weaker. Inside each cylinder, warm Plutonium-238 pellets glow with decay heat, and thermocouples convert the temperature difference against freezing space directly into electricity.",
          level3Engineering:
            "Solid-state silicon-germanium thermocouples eliminate moving turbines that could wear out over 50 years. Because Pu-238 decays with an 87.7-year half-life, engineers steadily shut down heaters and non-essential instruments to stretch remaining watts.",
        },
        missionRelevance:
          "Proved outer-planet exploration was possible—without nuclear radioisotope power, missions past Jupiter would freeze and go dark.",
        explodeAxis: [-3.1, -0.5, 0],
        connections: ["voy-bus"],
        quizPrompt:
          "Click the boom holding the 3 cylindrical nuclear RTG power generators.",
        quizQuestion: {
          prompt: "Why couldn’t Voyager use solar panels like JWST or ISS?",
          options: [
            "Sunlight drops by the inverse-square law—at Neptune it is ~900× too dim for practical solar wings",
            "Solar panels only work inside Earth’s magnetic field",
            "Solar panels block radio signals from the 3.7 m dish",
          ],
          correctIndex: 0,
          explanation:
            "At 30 AU (Neptune), solar flux is 1/900th of Earth’s; solar arrays huge enough to make 300 W would weigh far too much to launch.",
        },
        cameraFocusDist: 6.4,
        cameraFocusYaw: -0.78,
        cameraFocusPitch: 0.14,
        interactionKind: "rtg-power",
      },
      {
        id: "voy-scan",
        name: "Science Scan Platform & Mag Boom",
        shortName: "Science Platform & Mag Boom",
        role: "Cameras, Spectrometers & Heliopause Sensors",
        specLabel: "ISS Cameras · IRIS/UVS · 13 m Mag Truss",
        badge: "REAL DATA",
        honestyNote:
          "Representative scan platform boom and extended magnetometer truss (actual truss is 13 m long).",
        fact: "Motorized two-axis scan platform swiveled cameras to shoot Jupiter, Saturn, Uranus, Neptune, and volcanic Io without turning the Earth-aimed dish.",
        mainFunction:
          "Aims imaging cameras and spectrometers during planetary flybys while the opposite ultra-long truss measures interstellar magnetic fields and plasma.",
        dimensions:
          "~2.5 m science boom + 13 m real magnetometer mast (compressed in 3D view)",
        engineeringSpecs: [
          { label: "Imaging", value: "Narrow & wide-angle Vidicon TV" },
          { label: "Spectrometers", value: "IR, UV & Photopolarimeter" },
          { label: "Mag Boom", value: "13 m collapsible fiberglass truss" },
          {
            label: "Interstellar Data",
            value: "Cosmic ray & plasma wave sensors",
          },
        ],
        levels: {
          level1What:
            "The gold camera box on the right boom plus the super-long thin rod reaching far out into space.",
          level2How:
            "While flying past moons at 60,000 km/h, motors spun this camera head to track target worlds smoothly like a photographer panning with a speeding car—keeping the main dish aimed at Earth.",
          level3Engineering:
            "Voyager 1 crossed the heliopause in 2012 and Voyager 2 in 2018; plasma-wave and low-energy charged particle instruments on these outer booms directly measured the jump in interstellar plasma density.",
        },
        missionRelevance:
          "Discovered active sulfur volcanoes on Io, icy geysers on Triton, intricate ring spokes at Saturn, and confirmed both probes entered interstellar space.",
        explodeAxis: [3.1, 0.2, 0.4],
        connections: ["voy-bus"],
        quizPrompt:
          "Click the science camera platform boom and long magnetometer truss on the right.",
        quizQuestion: {
          prompt:
            "How did Voyager take sharp photos while streaking past moons without losing its radio link to Earth?",
          options: [
            "The motorized scan platform rotated the cameras independently while the main dish stayed pointed at Earth",
            "It stopped in mid-space to take photos",
            "It dropped miniature drones onto each planet",
          ],
          correctIndex: 0,
          explanation:
            "A 2-axis gimbaled scan platform allowed astronomers to pan cameras smoothly across fast flyby targets without breaking Earth dish alignment.",
        },
        cameraFocusDist: 7.2,
        cameraFocusYaw: 0.92,
        cameraFocusPitch: 0.12,
        interactionKind: "gimbal-attitude",
      },
    ],
  },

  lander: {
    id: "lander",
    shortLabel: "LM-2 Lander (Concept)",
    title: "LM-2 Lander (Fictional Educational Concept)",
    subtitle:
      "7.0 m Height × 9.4 m Gear Span · Fictional Educational Concept · 15,200 kg Trainer",
    summary:
      "Two-stage descent and ascent lander modeled on Apollo LM architecture and adapted in Artemis Odyssey as a fictional educational concept for lunar and Martian descent training.",
    scenarioDistinction:
      "Fictional educational concept based on Apollo LM architecture adapted for dual lunar and Martian simulation training. Not an official NASA flight vehicle.",
    modelHonestyTag: "Fictional Educational Concept",
    defaultCameraDist: 10.6,
    focusY: 2.3,
    overviewSpecs: [
      { label: "Gear Span", value: "9.4 m" },
      { label: "Descent Engine", value: "46.7 kN" },
      { label: "Classification", value: "Fictional Educational Concept" },
    ],
    sources: [
      "Smithsonian National Air and Space Museum Lunar Module LM-2 Spec Sheet (https://airandspace.si.edu/collection-objects/lunar-module-2/nasm_A19711598000)",
      "Smithsonian NASM Apollo Lunar Module Operations Record (https://airandspace.si.edu/collection-objects/lunar-module-2/nasm_A19711598000)",
    ],
    parts: [
      {
        id: "lm-descent",
        name: "Octagonal Descent Stage & 4 Legs",
        shortName: "Descent Stage & Gear",
        role: "Propellant Bays & Crushable Touchdown Gear",
        specLabel: "4.2 m Octagon · 9.4 m Span · Contact Probes",
        badge: "REAL DATA",
        honestyNote:
          "Apollo LM descent stage honeycomb shock-absorber struts & 1.7 m contact probes.",
        fact: "Gold Kapton thermal insulation wraps propellant tanks while crushable aluminum honeycomb struts inside the 4 legs absorb landing impact without bouncing.",
        mainFunction:
          "Carries descent fuel, scientific cargo bays, deployable rover ramp, and shock-absorbing landing legs that stabilize touchdown on uneven crater slopes.",
        dimensions:
          "4.2 m body width · 9.4 m diagonal footpad span · ~10,334 kg fueled descent stage",
        engineeringSpecs: [
          { label: "Impact Struts", value: "Crushable aluminum honeycomb" },
          {
            label: "Contact Probes",
            value: "1.7 m probes trigger engine cutoff",
          },
          { label: "Thermal Foil", value: "25-layer aluminized Kapton" },
          { label: "Payload Bay", value: "Deployable front rover ramp" },
        ],
        levels: {
          level1What:
            "The gold eight-sided lower platform with four wide spider legs and big round dish footpads.",
          level2How:
            "Thin blue probes hanging beneath the footpads touch the Moon first and turn on a dashboard Contact Light so pilots shut off the engine right before the pads hit—avoiding blowing dust or tipping over.",
          level3Engineering:
            "Instead of bouncy hydraulic springs that could bounce a lander in 1/6th gravity, each leg packs crushable aluminum honeycomb cartridges that deform permanently to absorb kinetic energy cleanly.",
        },
        missionRelevance:
          "Remains behind on the surface as a stable launch platform for the upper Ascent Cabin when astronauts lift off back to lunar orbit.",
        explodeAxis: [0, -1.8, 0],
        connections: ["lm-ascent", "lm-rcs"],
        quizPrompt:
          "Click the gold octagonal lower stage or one of its four spider landing legs.",
        quizQuestion: {
          prompt:
            "Why do Apollo-style landing legs use crushable aluminum honeycomb instead of bouncy car springs?",
          options: [
            "So the lander absorbs impact energy without bouncing back up or tipping over in weak gravity",
            "Because springs freeze solid on Earth before launch",
            "To generate solar power when footpads touch regolith",
          ],
          correctIndex: 0,
          explanation:
            "In 0.165g lunar gravity, a spring rebound could tip the spacecraft sideways; crushable honeycomb dissipates impact energy cleanly in one stroke.",
        },
        cameraFocusDist: 8.6,
        cameraFocusYaw: 0.65,
        cameraFocusPitch: 0.15,
        interactionKind: "lander-legs",
        unlockNoteId: "note-jezero-delta",
      },
      {
        id: "lm-ascent",
        name: "Pressurized Ascent Cabin",
        shortName: "Ascent Cabin",
        role: "Crew Flight Deck & Orbit Return Stage",
        specLabel: "2 Crew · Canted Windows · 15.6 kN APS",
        badge: "REAL DATA",
        honestyNote:
          "Apollo LM ascent stage cabin & S-band steerable dish baseline.",
        fact: "Compact pressurized crew compartment with forward-slanted landing windows, front EVA hatch, overhead docking tunnel, and independent ascent engine.",
        mainFunction:
          "Houses astronauts during descent and surface stays, then separates cleanly from the descent stage to launch back to orbital rendezvous.",
        dimensions: "3.76 m tall × 4.3 m wide · ~4,670 kg fueled ascent stage",
        engineeringSpecs: [
          { label: "Habitable Volume", value: "4.5 m³ (6.65 m³ pressurized)" },
          { label: "Cabin Atmosphere", value: "34.5 kPa (5 psi) 100% O₂" },
          { label: "Ascent Engine", value: "15.6 kN hypergolic APS" },
          { label: "Docking", value: "Overhead tunnel + S-band dish" },
        ],
        levels: {
          level1What:
            "The grey angular upper cabin with two slanted front windows, a square exit door, and a round radar dish on the roof.",
          level2How:
            "The windows lean inward and downward so standing astronauts can look straight down at boulders and craters while flying toward the landing zone. At mission end, it blasts off from the gold lower stage.",
          level3Engineering:
            "Every gram mattered: chemically milled aluminum cabin walls were shaved as thin as 0.3 mm in low-stress zones, saving hundreds of kilograms of lunar ascent propellant.",
        },
        missionRelevance:
          "Provides pilots unobstructed downward visibility during terminal approach and acts as the return taxi back to Orion/Gateway.",
        explodeAxis: [0, 2.5, 0],
        connections: ["lm-descent", "lm-rcs"],
        quizPrompt:
          "Click the upper grey Ascent Cabin with the canted cockpit windows.",
        quizQuestion: {
          prompt:
            "Why are the Lander’s cockpit windows angled downward instead of facing straight forward?",
          options: [
            "So standing pilots can see the landing zone directly below them during steep vertical descent",
            "To make room for wider wings during reentry",
            "To reflect sunlight into the descent propellant tanks",
          ],
          correctIndex: 0,
          explanation:
            "Astronauts stood strapped in harnesses; downward-canted triangular panes gave full view of boulders and craters beneath the craft.",
        },
        cameraFocusDist: 7.2,
        cameraFocusYaw: 0.48,
        cameraFocusPitch: 0.24,
        interactionKind: "propulsion-calc",
      },
      {
        id: "lm-rcs",
        name: "4-Quad RCS & Gimbaled Descent Engine",
        shortName: "RCS Quads & Engine Bell",
        role: "Attitude Control & Deep-Throttle Braking",
        specLabel: "16× 445 N RCS + 46.7 kN Variable Descent Bell",
        badge: "REAL DATA",
        honestyNote:
          "Authentic 10:1 throttleable LM descent engine and 4×4 RCS thruster pods.",
        fact: "Sixteen orthogonal reaction-control thrusters tilt and translate the lander in vacuum while the deep-throttling center engine balances weight for soft hover.",
        mainFunction:
          "Controls pitch, roll, yaw, and horizontal drift in vacuum while throttling main braking thrust continuously down to 10% for precision touchdown.",
        dimensions:
          "Center bell ~1.5 m exit cone · 4 outrigger quads (~0.4 m each)",
        engineeringSpecs: [
          { label: "Descent Thrust", value: "4.7 – 46.7 kN (10–100%)" },
          {
            label: "Specific Impulse",
            value: "311 s (hypergolic N₂O₄/Aerozine)",
          },
          { label: "RCS Clusters", value: "4 quads × 4 jets (445 N each)" },
          { label: "Gimbal Range", value: "±6° main descent nozzle" },
        ],
        levels: {
          level1What:
            "The four small black thruster pods sticking out from the corners plus the big central rocket bell underneath.",
          level2How:
            "In airless space or Mars’s ultra-thin air, wings cannot steer. Short puffs from corner RCS thrusters tilt the lander slightly sideways so the big main engine underneath pushes it toward or away from landing hazards.",
          level3Engineering:
            "Unlike most engines that only run at 100%, the Lunar Module Descent Engine used a variable-area cavitating venturi pintle injector to throttle smoothly across a 10:1 thrust range without flameout.",
        },
        missionRelevance:
          "Enables pilots to hover cleanly, arrest horizontal speed below 1 m/s, and touch down upright inside tight rocky landing zones.",
        explodeAxis: [2.2, 0.4, 0],
        connections: ["lm-descent", "lm-ascent"],
        quizPrompt:
          "Click any corner RCS attitude thruster pod or the center gimbaled engine nozzle.",
        quizQuestion: {
          prompt:
            "How do you brake sideways speed in a rocket lander where there is no air for wings?",
          options: [
            "Fire corner RCS thrusters to tilt the lander slightly so main engine thrust pushes against the sideways drift",
            "Deploy rubber wheel brakes while still 50 meters up",
            "Turn off gravity using the landing spotlight",
          ],
          correctIndex: 0,
          explanation:
            "Tilting the thrust vector opposite your horizontal velocity provides braking force horizontally while reducing vertical lift slightly—requiring careful throttle coordination.",
        },
        cameraFocusDist: 7.8,
        cameraFocusYaw: 0.85,
        cameraFocusPitch: 0.08,
        interactionKind: "propulsion-calc",
      },
    ],
  },

  rover: {
    id: "rover",
    shortLabel: "VIPER Rover",
    title: "VIPER South Pole Explorer Rover",
    subtitle:
      "2.0 m × 1.8 m × 1.4 m · 430 kg · 4-Wheel Independent Steering · 1 m Drill",
    summary:
      "Mobile lunar prospector engineered to map subsurface water ice across sunlit rims and pitch-black permanently shadowed craters.",
    scenarioDistinction:
      "NASA Ames/JSC VIPER hardware reference (also deployed in Jezero Mars surface training mode).",
    modelHonestyTag: "NASA Hardware Specs",
    defaultCameraDist: 5.8,
    focusY: 0.95,
    overviewSpecs: [
      { label: "Rover Mass", value: "430 kg" },
      { label: "Max Real Speed", value: "0.20 m/s" },
      { label: "TRIDENT Drill", value: "100 cm depth" },
    ],
    sources: [
      "NASA Science VIPER Lunar Rover Mission Overview (https://science.nasa.gov/mission/viper/)",
      "NASA Science VIPER Rover and Instruments (https://science.nasa.gov/mission/viper/rover-and-instruments/)",
    ],
    parts: [
      {
        id: "rover-mobility",
        name: "Rocker-Bogie & Independent Wheel Hubs",
        shortName: "Mobility & Wheels",
        role: "Drive, Crab, Zero-Spin & Walker Gait",
        specLabel: "4× Hub Motors · 50 cm Cleated Wheels · ~0.2 m/s",
        badge: "REAL DATA",
        honestyNote:
          "NASA VIPER independent 4-wheel steering & active suspension/walker mode metrics.",
        fact: "Four independently steered, height-adjustable wheel legs let the rover drive forward, crab sideways, spin in place, or lift individual legs in a walking gait over loose crater powder.",
        mainFunction:
          "Traverses steep slopes, boulders, and fluffy polar regolith without getting stuck while carrying scientific drills and spectrometers.",
        dimensions:
          "2.0 m length × 1.8 m width × 1.4 m chassis · 50 cm diameter cleated wheels",
        engineeringSpecs: [
          { label: "Drive Modes", value: "Ackermann, Crab, Spin, Walker" },
          { label: "Real Top Speed", value: "0.20 m/s (0.72 km/h)" },
          { label: "Ground Clearance", value: "Adjustable active suspension" },
          { label: "Mass (Earth)", value: "430 kg (71 kg on Moon)" },
        ],
        levels: {
          level1What:
            "The white insulated chassis box, jointed suspension arms, and four cleated metal wheels.",
          level2How:
            "Every wheel has both a drive motor and a steering motor—so all four can turn sideways together like a crab or angle inward to spin on a dime. In soft dust, the rover lifts one wheel at a time in a walking crawl.",
          level3Engineering:
            "VIPER’s active suspension combines rocker-bogie terrain equalization with lifting actuators, preventing wheel sinkage (slip > 40%) in ultra-low-cohesion polar regolith.",
        },
        missionRelevance:
          "Keeps the rover from stalling inside permanently shadowed craters before battery reserves deplete.",
        explodeAxis: [0, -0.9, 0],
        connections: ["rover-science", "rover-power"],
        quizPrompt:
          "Click the lower rover chassis, suspension arms, or cleated wheels.",
        quizQuestion: {
          prompt:
            "Why did NASA engineers build VIPER with active lifting wheel legs instead of fixed axles?",
          options: [
            "So the rover can step/walk out of ultra-soft crater dust and crab sideways without turning its solar wings away from the Sun",
            "So it can jump 10 meters over deep canyons",
            "Because fixed axles melt at -180 °C",
          ],
          correctIndex: 0,
          explanation:
            "Active suspension lets VIPER sweep/step through fluffy regolith traps and crab diagonally to keep side-mounted solar panels aimed toward low polar sunlight.",
        },
        cameraFocusDist: 4.8,
        cameraFocusYaw: 0.75,
        cameraFocusPitch: 0.16,
        interactionKind: "rover-mobility",
        unlockNoteId: "note-malapert-sunlight",
      },
      {
        id: "rover-science",
        name: "TRIDENT 1 m Percussive Drill",
        shortName: "TRIDENT Drill",
        role: "Subsurface Ice & Core Sampler",
        specLabel: "100 cm Depth · 10 cm Bites · Auger Temp Telemetry",
        badge: "REAL DATA",
        honestyNote:
          "Honeybee Robotics TRIDENT rotary-percussive lunar ice drill specifications.",
        fact: "Rotary-percussive auger punches up to 1 meter deep in 10 cm bites, bringing frozen regolith tailings to the surface for infrared and mass spectrometer scans.",
        mainFunction:
          "Penetrates hard, frozen lunar regolith and collects intact depth strata while avoiding friction heat that would vaporize precious water ice.",
        dimensions:
          "1.0 m full drill stroke · ~16 kg instrument mass (front-right mount)",
        engineeringSpecs: [
          { label: "Max Depth", value: "100 cm (1.0 m)" },
          { label: "Bite Increment", value: "10 cm rotary-percussive passes" },
          { label: "Thermal Sensor", value: "Downhole bit temperature probe" },
          { label: "Companion Tech", value: "NIRVSS + MSolo spectrometers" },
        ],
        levels: {
          level1What:
            "The vertical drill arm hanging right off the front-right bumper with a corkscrew auger tip.",
          level2How:
            "Instead of spinning constantly at high speed like a carpenter drill (which would melt or boil away frozen water in vacuum), TRIDENT drills down in short 10 cm bites using gentle hammer taps.",
          level3Engineering:
            "A rotary-percussive drive paired with a fluted auger brings cold cuttings up to NIRVSS and MSolo spectrometers while monitoring bit temperature (< 95 °C limit) and torque against dense icy cement.",
        },
        missionRelevance:
          "Proves whether polar water ice is shallow enough and pure enough to mine for future astronaut oxygen and rocket propellant (ISRU).",
        explodeAxis: [0, 0.2, 1.8],
        connections: ["rover-mobility"],
        quizPrompt:
          "Click the front vertical TRIDENT ice drill assembly on the rover nose.",
        quizQuestion: {
          prompt:
            "Why must TRIDENT monitor bit temperature closely and drill in 10 cm bites?",
          options: [
            "Excessive friction heat in vacuum will sublimate (vaporize) water ice directly into gas before sensors can measure it",
            "Because cold metal becomes rubbery below 0 °C",
            "To cook lunar regolith into liquid lava for brick-making",
          ],
          correctIndex: 0,
          explanation:
            "In hard lunar vacuum, ice sublimates straight from solid to gas if heated—ruining the sample and over-pressurizing the borehole.",
        },
        cameraFocusDist: 4.2,
        cameraFocusYaw: 0.42,
        cameraFocusPitch: 0.14,
        interactionKind: "rover-drill",
        unlockNoteId: "note-isru-electrolysis",
      },
      {
        id: "rover-power",
        name: "Vertical Polar Solar Wings & Battery",
        shortName: "Solar Wings (450 W)",
        role: "Low-Sun Polar Power Generation",
        specLabel: "450 W Peak · Vertical Side Arrays · Thermal Survival",
        badge: "REAL DATA",
        honestyNote:
          "Authentic vertical-slant solar panel mounting designed specifically for low lunar pole sun angles.",
        fact: "Unlike equatorial rovers with flat roof panels, VIPER mounts solar arrays along its steep sides to catch a Sun that barely skims 1°–4° above the lunar horizon.",
        mainFunction:
          "Harvests oblique polar sunlight to recharge survival batteries before the rover dives into pitch-black permanently shadowed craters.",
        dimensions: "~1.6 m × 0.8 m tilted side arrays · ~450 W peak output",
        engineeringSpecs: [
          { label: "Peak Power", value: "450 W electrical" },
          { label: "Polar Sun Elev", value: "0° – 5° near South Pole" },
          { label: "Mount Geometry", value: "Vertical / steep flank panels" },
          { label: "Thermal Control", value: "Warm electronics box + heaters" },
        ],
        levels: {
          level1What:
            "The blue solar panel wings mounted along the top edges and steep sides of the rover.",
          level2How:
            "Near the Moon’s South Pole, the Sun never climbs high overhead—it circles low around the horizon like an endless sunrise. Flat roof panels would barely catch any light, so side-angled panels catch maximum rays.",
          level3Engineering:
            "Paired with lithium-ion battery packs inside a thermally isolated electronics enclosure, enabling 10–12 hour sprints into -220 °C shadow zones where no photon of sunlight has hit in billions of years.",
        },
        missionRelevance:
          "Forces every polar route plan to balance shadow-zone science time against reaching sunlit crater rims before battery reserves run dry.",
        explodeAxis: [1.6, 1.0, 0],
        connections: ["rover-mobility", "rover-comms"],
        quizPrompt:
          "Click the blue solar panel wings mounted along the rover deck.",
        quizQuestion: {
          prompt:
            "Why are VIPER’s solar panels mounted at steep vertical angles rather than flat on the roof?",
          options: [
            "At the Moon’s South Pole, sunlight arrives almost horizontally near the horizon",
            "Flat roof panels attract too much lunar rain",
            "Vertical panels act as sails to blow the rover across craters",
          ],
          correctIndex: 0,
          explanation:
            "Because the Moon’s axial tilt is only 1.5°, the Sun sits perpetually near the horizon at the poles—making vertical or side-mounted arrays far more effective.",
        },
        cameraFocusDist: 4.5,
        cameraFocusYaw: 0.95,
        cameraFocusPitch: 0.25,
        interactionKind: "solar-array",
        unlockNoteId: "note-moxie-isru",
      },
      {
        id: "rover-comms",
        name: "Stereo Camera Mast, Headlights & Dish",
        shortName: "Nav Mast & Dish",
        role: "360° Stereo Vision, Headlights & Direct-to-Earth Link",
        specLabel: "NavCam + Dual LED Headlights + X-Band Dish",
        badge: "REAL DATA",
        honestyNote:
          "Authentic mast headlights (first NASA lunar rover headlamps) + gimbaled stereo NavCam.",
        fact: "Equipped with powerful LED headlights—the first ever on a NASA lunar rover—to spot steep boulders inside pitch-black craters alongside a high-gain Earth dish.",
        mainFunction:
          "Maps obstacles in real time across blind shadow zones and transmits telemetry directly back to Earth flight controllers.",
        dimensions:
          "Mast ~2.4 m above ground · Twin stereo cameras + LED headlight array",
        engineeringSpecs: [
          { label: "Vision", value: "Stereo NavCam + HazCams" },
          { label: "Lighting", value: "Narrow/wide-beam LED floodlamps" },
          { label: "Telemetry", value: "Steerable X-Band High-Gain Dish" },
          { label: "Beacon", value: "Amber optical locator strobe" },
        ],
        levels: {
          level1What:
            "The tall white mast sticking up with two blue camera eyes, bright headlights on the front bumper, and the round white dish at the back.",
          level2How:
            "Inside permanently shadowed craters there is zero sunlight—only starlight—so without headlights the cameras would be completely blind to hidden cliffs and boulders.",
          level3Engineering:
            "Two spaced stereo lenses calculate 3D depth maps of every rock within ~15 meters, while Earth operators inspect panoramic mosaics across a ~2.6-second two-way radio delay.",
        },
        missionRelevance:
          "Prevents fatal rollovers in crater darkness and links the rover back to Mission Control without needing a local relay tower.",
        explodeAxis: [0, 1.6, 0.2],
        connections: ["rover-power"],
        quizPrompt:
          "Click the tall camera mast head or the white parabolic dish on the rear deck.",
        quizQuestion: {
          prompt:
            "Why did NASA equip VIPER with bright headlights when earlier Mars rovers didn’t need them for driving?",
          options: [
            "VIPER drives inside permanently shadowed polar craters that have received zero sunlight for billions of years",
            "The Moon has thick night fog that scatters sunlight",
            "Headlights warm the solar panels from the front",
          ],
          correctIndex: 0,
          explanation:
            "Polar crater floors sit in perpetual darkness; active LED floodlights let stereo NavCams spot hazards before a wheel drops into a hole.",
        },
        cameraFocusDist: 4.5,
        cameraFocusYaw: 0.45,
        cameraFocusPitch: 0.3,
        interactionKind: "gimbal-attitude",
        unlockNoteId: "note-hermes-relay",
      },
    ],
  },

  outpost: {
    id: "outpost",
    shortLabel: "Base Camp",
    title: "Artemis & Mars Modular Base Camp",
    subtitle:
      "Conceptual Surface Outpost · Geodesic Habitat · Paused Gateway Programme (March 2026)",
    summary:
      "Conceptual sustained-presence surface habitat demonstrating pressurized modules, regolith radiation shielding, and ISRU. Note: Lunar Gateway orbital platform is designated as a paused programme (March 2026 NASA architecture alignment) while Artemis prioritizes direct human lunar landing and surface operations.",
    scenarioDistinction:
      "Conceptual future Moon-to-Mars architecture informed by NASA OSDR shielding studies & Kilopower/MOXIE technology demonstrators. Gateway orbital staging is officially noted as a paused programme.",
    modelHonestyTag: "Conceptual Architecture",
    defaultCameraDist: 23,
    focusY: 2.8,
    overviewSpecs: [
      { label: "Footprint", value: "~28 m × 24 m (Sim)" },
      { label: "Regolith Shield", value: "-62% Dose (OSD-489)" },
      { label: "Architecture", value: "Conceptual Moon/Mars" },
    ],
    sources: [
      "NASA Lunar Living & Working Architecture Study",
      "NASA Kilopower & MOXIE Demonstrator Reports",
    ],
    parts: [
      {
        id: "base-habitat",
        name: "Geodesic Dome, Greenhouse & Regolith Berm",
        shortName: "Habitat & Shield Berm",
        role: "Crew Quarters, Hydroponics & Radiation Shelter",
        specLabel:
          "Pressurized Dome · Airlock Tunnels · 1.5 m Berm (-62% Dose)",
        badge: "REFERENCE VALUE",
        honestyNote:
          "Conceptual geodesic modules paired with OSDR OSD-489 regolith radiation attenuation data.",
        fact: "Modular pressurized domes connect via airlock tunnels to a hydroponic plant bay, shielded externally by a compacted moon/Mars soil berm.",
        mainFunction:
          "Provides shirt-sleeve living space, crop growth, dust-mitigation airlocks, and physical mass shielding against galactic cosmic rays and solar storms.",
        dimensions:
          "Conceptual simulator footprint ~20 m × 18 m habitat + protective rock berm arc",
        engineeringSpecs: [
          { label: "Dose Reduction", value: "~62% solar proton attenuation" },
          { label: "Airlock System", value: "Dual-stage pressure + dust lock" },
          { label: "Crop Module", value: "LED hydroponic greenhouse pod" },
          { label: "Structure", value: "Geodesic pressure shell + tunnels" },
        ],
        levels: {
          level1What:
            "The big transparent/armored geodesic dome, purple-lit plant greenhouse, connecting tunnels, and curved gray rock wall beside them.",
          level2How:
            "Living on the Moon or Mars exposes crews to harmful space radiation. Piling local soil (regolith) into a thick protective wall or burying modules stops most incoming high-energy protons without hauling heavy lead from Earth.",
          level3Engineering:
            "Informed by NASA OSDR radiation shielding biology studies (OSD-489): compacting ~1.5 m of local regolith attenuates secondary neutron and proton cascades significantly while multi-stage airlocks keep abrasive lunar dust out of crew lungs.",
        },
        missionRelevance:
          "Serves as the safe haven astronauts and rovers return to whenever DONKI alerts warn of an incoming solar flare.",
        explodeAxis: [0, 2.4, 0],
        connections: ["base-power", "base-comms"],
        quizPrompt:
          "Click the geodesic habitat dome, glowing purple greenhouse, or compacted rock shield berm.",
        quizQuestion: {
          prompt:
            "How do bases shield astronauts from space radiation without launching hundreds of tons of lead from Earth?",
          options: [
            "By piling compacted local Moon or Mars soil (regolith) into thick shield berms around habitats",
            "By painting the glass dome bright blue",
            "By spinning the greenhouse fast enough to deflect protons",
          ],
          correctIndex: 0,
          explanation:
            "In-situ regolith is free and abundant right outside the airlock—mass alone absorbs cosmic and solar particle radiation effectively.",
        },
        cameraFocusDist: 18,
        cameraFocusYaw: 0.62,
        cameraFocusPitch: 0.28,
        interactionKind: "hab-shield",
        unlockNoteId: "note-osdr-regolith",
      },
      {
        id: "base-power",
        name: "Solar Towers, Kilopower & ISRU Skid",
        shortName: "Power & ISRU Skid",
        role: "Nuclear Fission, Polar Solar & O₂/H₂ Processing",
        specLabel: "Vertical Solar + 10 kWe Kilopower + Cryo ISRU",
        badge: "REFERENCE VALUE",
        honestyNote:
          "Combines NASA Kilopower KRUSTY fission concept with MOXIE/lunar-ice electrolysis demonstrators.",
        fact: "Vertical tracking solar arrays work alongside a compact Kilopower nuclear umbrella and cryogenic ISRU tanks producing breathable oxygen and rocket fuel locally.",
        mainFunction:
          "Supplies uninterrupted megawatt-hour electricity through 14-day lunar nights and Mars dust storms while splitting local water/CO₂ into oxygen and fuel.",
        dimensions:
          "Conceptual 10 m vertical solar arrays + 3.2 m ISRU tank skid + 3.1 m Kilopower radiator",
        engineeringSpecs: [
          {
            label: "Fission Concept",
            value: "Kilopower Stirling (10 kWe class)",
          },
          { label: "ISRU Process", value: "H₂O Electrolysis / CO₂ MOXIE" },
          { label: "Solar Geometry", value: "Elevated vertical polar masts" },
          {
            label: "Night Survival",
            value: "Fission continuous through 350 hr night",
          },
        ],
        levels: {
          level1What:
            "The twin tall blue solar towers, the cryo fuel tank skid with white and blue cylinders, and the golden umbrella-topped Kilopower reactor.",
          level2How:
            "A lunar night lasts 14 Earth days—far too long for normal batteries alone. A compact fission reactor generates steady heat turned into electricity by Stirling engines, while ISRU tanks crack local ice or Mars CO₂ into oxygen.",
          level3Engineering:
            "Demonstrated by NASA’s KRUSTY Kilopower test (uranium-235 core, sodium heat pipes, Stirling convertors, umbrella radiator) and Perseverance’s MOXIE solid-oxide electrolysis cell (~6–10 g O₂/hr scaled up for crew).",
        },
        missionRelevance:
          "Without local oxygen and fuel production plus reliable night power, human outposts would remain tiny short-stay camping trips.",
        explodeAxis: [-3.4, 0.8, 0],
        connections: ["base-habitat"],
        quizPrompt:
          "Click the twin vertical blue solar towers, cryogenic ISRU tanks, or golden Kilopower unit.",
        quizQuestion: {
          prompt:
            "Why is a compact nuclear reactor like Kilopower so valuable for a Moon or Mars base?",
          options: [
            "It provides steady 24/7 power through 14-day lunar nights and weeks-long Mars dust storms when solar drops",
            "It replaces the need for oxygen tanks inside spacesuits",
            "It turns lunar dust directly into liquid hydrogen without water",
          ],
          correctIndex: 0,
          explanation:
            "Polar craters and Martian global dust storms starve solar arrays; compact fission Stirling units output continuous baseline heat and power.",
        },
        cameraFocusDist: 17,
        cameraFocusYaw: -0.65,
        cameraFocusPitch: 0.24,
        interactionKind: "rtg-power",
        unlockNoteId: "note-moxie-isru",
      },
      {
        id: "base-comms",
        name: "Deep Space Dish & Navigation Beacon",
        shortName: "Base Comms Dish",
        role: "Earth DSN & Orbital Relay Terminal",
        specLabel: "Ka-Band Ground Terminal + DONKI Alert Receiver",
        badge: "REFERENCE VALUE",
        honestyNote:
          "Conceptual surface high-gain terminal linking habitat directly to Earth & HERMES relays.",
        fact: "Ground-mounted parabolic terminal keeps high-bandwidth biomedical, weather, and command links open between surface astronauts, orbiting satellites, and Earth.",
        mainFunction:
          "Maintains direct-to-Earth and relay-satellite communications for mission control coordination, storm warnings, and science uploads.",
        dimensions:
          "Conceptual 3.3 m parabolic dish mounted on 5.4 m structural mast",
        engineeringSpecs: [
          { label: "Frequency", value: "Ka-Band / Optical Terminal" },
          { label: "Primary Link", value: "Earth DSN & NRHO Relay Sat" },
          { label: "Alert System", value: "Live DONKI space-weather feed" },
          { label: "Mounting", value: "Dust-elevated AZ/EL gimbal" },
        ],
        levels: {
          level1What:
            "The tall white tower holding a large round dish beside the habitat dome.",
          level2How:
            "Elevated high above fine surface dust, this dish aims at either an orbiting relay satellite overhead or straight at Earth whenever Earth peeks above the lunar horizon.",
          level3Engineering:
            "High-gain narrow-beam Ka-band links allow HD video, high-rate geological core spectra, and instantaneous emergency telemetry from Earth’s Deep Space Network.",
        },
        missionRelevance:
          "Receives automated DONKI coronal-mass-ejection alerts minutes after satellites spot them, giving EVA crews crucial time to reach the regolith shelter.",
        explodeAxis: [3.0, 1.2, -1.8],
        connections: ["base-habitat"],
        quizPrompt:
          "Click the tall parabolic Deep Space communications dish tower beside the dome.",
        quizQuestion: {
          prompt:
            "Why is the surface communications dish raised on a 5+ meter mast above the lunar soil?",
          options: [
            "To clear nearby crater rims/berms for line-of-sight and keep sensitive gimbal bearings above abrasive kicked-up dust",
            "Because radio signals cannot travel within 5 meters of rock",
            "To cool the dish inside Earth’s upper atmosphere",
          ],
          correctIndex: 0,
          explanation:
            "Raising the dish improves horizon visibility toward low-elevation Earth/relays and protects moving elevation joints from sharp electrostatic regolith dust.",
        },
        cameraFocusDist: 14,
        cameraFocusYaw: -0.95,
        cameraFocusPitch: 0.22,
        interactionKind: "gimbal-attitude",
        unlockNoteId: "note-hermes-relay",
      },
    ],
  },
  "saturn-v": {
    id: "saturn-v",
    shortLabel: "Saturn V",
    title: "Apollo Saturn V Launch Vehicle",
    subtitle: "110.6 m · 2,970 t Liftoff Mass · 34.5 MN Liftoff Thrust",
    summary:
      "Legendary NASA three-stage super-heavy launcher that propelled nine Apollo crews to lunar orbit and six to landings on the Moon between 1968 and 1972.",
    scenarioDistinction:
      "Historical Apollo lunar architecture (F-1 & J-2 kerosene/cryo stack)",
    modelHonestyTag: "NASA Hardware Specs",
    defaultCameraDist: 34,
    focusY: 12.5,
    overviewSpecs: [
      { label: "Liftoff Thrust", value: "34,500 kN (7.89M lbf)" },
      { label: "Liftoff Mass", value: "2,970,000 kg (2,970 t)" },
      { label: "Total Height", value: "110.6 m (363 ft)" },
      { label: "Payload to LEO", value: "140,000 kg (140 t)" },
      { label: "Payload to TLI", value: "48,600 kg (Apollo CSM/LM)" },
      { label: "Launch Pad", value: "KSC LC-39A / LC-39B" },
      {
        label: "3D Mesh Geometry",
        value: "34,382 triangles (Decimated NASA CAD)",
      },
    ],
    sources: [
      "NASA Saturn V Launch Vehicle Overview (https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-saturn-v/)",
      "NASA Saturn V Flight History & Heritage (https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-saturn-v/)",
    ],
    parts: [
      {
        id: "saturn-sic",
        name: "S-IC First Stage & 5× F-1 Engines",
        shortName: "S-IC Stage",
        role: "34.5 MN Pad Acceleration",
        specLabel: "5× F-1 Kerosene Cluster",
        badge: "REAL DATA",
        honestyNote:
          "Built by Boeing at Michoud; burns 2,149 t of RP-1 and LOX in 168 seconds.",
        fact: "Five Rocketdyne F-1 engines generate 34.5 MN of thrust—each pump flows 2.6 metric tons of liquid propellant per second.",
        mainFunction:
          "Lifts the 3,000-ton vehicle through maximum aerodynamic pressure to 67 km altitude before dropping into the Atlantic.",
        dimensions: "42.1 m height × 10.1 m diameter · 2,280,000 kg fueled",
        engineeringSpecs: [
          { label: "Thrust (SL)", value: "34,500 kN (6.77 MN per F-1)" },
          { label: "Specific Impulse", value: "263 s SL / 304 s vac" },
          { label: "Propellants", value: "RP-1 Kerosene / Liquid Oxygen" },
          { label: "Burn Duration", value: "168 seconds" },
        ],
        levels: {
          level1What:
            "The massive lower stage with five giant rocket engines and four aerodynamic fins.",
          level2How:
            "Consumes 15 tons of rocket fuel and oxidizer every second to power the rocket from zero to Mach 7.3.",
          level3Engineering:
            "Gimbals the four outer F-1 engines up to ±6 degrees with hydraulic actuators while the center engine remains fixed.",
        },
        missionRelevance:
          "Carried all 24 Apollo lunar astronauts out of Earth’s dense lower atmosphere.",
        explodeAxis: [0, -4.5, 0],
        connections: ["saturn-sii"],
        quizPrompt:
          "Click the massive S-IC first stage with five F-1 rocket bells at the base.",
        quizQuestion: {
          prompt:
            "What propellant combination powered the Saturn V S-IC first stage?",
          options: [
            "RP-1 refined kerosene and liquid oxygen (LOX)",
            "Liquid hydrogen and liquid nitrogen",
            "Solid rubber polymer and ammonium perchlorate",
          ],
          correctIndex: 0,
          explanation:
            "RP-1 kerosene provides high density impulse, allowing the enormous first stage tanks to remain compact enough to stand 42 meters tall.",
        },
        cameraFocusDist: 22,
        cameraFocusPitch: 0.15,
        interactionKind: "propulsion-calc",
      },
      {
        id: "saturn-sii",
        name: "S-II Second Stage & 5× J-2 Engines",
        shortName: "S-II Stage",
        role: "Upper Atmosphere Cryo Ascent",
        specLabel: "5× J-2 Cryogenic Cluster",
        badge: "REAL DATA",
        honestyNote:
          "Built by North American Aviation; features a lightweight common bulkhead between LH2 and LOX.",
        fact: "Powered by 5 J-2 engines burning high-efficiency liquid hydrogen and oxygen, yielding a 421-second vacuum Isp.",
        mainFunction:
          "Accelerates the stack from Mach 7 to Mach 21, climbing from 67 km to 175 km above Earth.",
        dimensions: "24.8 m height × 10.1 m diameter · 480,000 kg fueled",
        engineeringSpecs: [
          { label: "Thrust (Vac)", value: "5,140 kN (1,028 kN per J-2)" },
          { label: "Specific Impulse", value: "421 s vac" },
          { label: "Propellants", value: "Liquid Hydrogen / LOX" },
          { label: "Burn Duration", value: "360 seconds" },
        ],
        levels: {
          level1What:
            "The white middle cylindrical section directly above the booster stage.",
          level2How:
            "Fires five cryogenic hydrogen engines in the vacuum of space to boost Apollo to near-orbital speed.",
          level3Engineering:
            "Uses a phenolic honeycomb common bulkhead to insulate -253°C LH2 from -183°C LOX with zero dead air gap.",
        },
        missionRelevance:
          "Provided 70% of the kinetic energy required to reach Earth orbit for the Apollo missions.",
        explodeAxis: [0, 0, 0],
        connections: ["saturn-sic", "saturn-sivb"],
        quizPrompt:
          "Select the S-II second stage with its five cryogenic J-2 rocket engines.",
        quizQuestion: {
          prompt:
            "Why did the Saturn V switch to liquid hydrogen propellant for its second and third stages?",
          options: [
            "Liquid hydrogen delivers significantly higher specific impulse (421 s vs 304 s) in the vacuum of space",
            "Liquid hydrogen is heavier and pushes the rocket down faster",
            "Kerosene cannot be ignited above 10 kilometers",
          ],
          correctIndex: 0,
          explanation:
            "Liquid hydrogen provides roughly 40% higher exhaust velocity than kerosene, drastically reducing upper stage mass.",
        },
        cameraFocusDist: 20,
        cameraFocusPitch: 0.18,
        interactionKind: "propulsion-calc",
      },
      {
        id: "saturn-sivb",
        name: "S-IVB Third Stage & 1× J-2 Engine",
        shortName: "S-IVB Stage",
        role: "Orbit Insertion & TLI Burn",
        specLabel: "Restartable J-2 Engine",
        badge: "REAL DATA",
        honestyNote:
          "Built by Douglas Aircraft; reignites after a 2-hour parking orbit coast to inject Apollo onto the Moon trajectory.",
        fact: "Fires twice: first for 2.5 minutes to achieve a 185 km circular parking orbit, then for 5.8 minutes for Trans-Lunar Injection (TLI).",
        mainFunction:
          "Places Apollo into Low Earth Orbit and subsequently accelerates the Apollo CSM and LM to 10.8 km/s lunar escape velocity.",
        dimensions: "17.8 m height × 6.6 m diameter · 120,000 kg fueled",
        engineeringSpecs: [
          { label: "Thrust (Vac)", value: "1,000 kN (225,000 lbf)" },
          { label: "Specific Impulse", value: "421 s vac" },
          { label: "Restart Capability", value: "Two burns (LEO + TLI)" },
          { label: "TLI Delta-V", value: "3,050 m/s" },
        ],
        levels: {
          level1What:
            "The narrower stage beneath the Apollo spacecraft housing a single rocket engine.",
          level2How:
            "Shuts down in Earth orbit, checks all systems, then reignites to fling the astronauts toward the Moon.",
          level3Engineering:
            "Includes cold helium pressurization spheres and solid propellant ullage motors to settle propellants before the zero-g restart.",
        },
        missionRelevance:
          "Every Apollo lunar landing depended on the flawless zero-g restart of the S-IVB stage.",
        explodeAxis: [0, 2.5, 0],
        connections: ["saturn-sii", "saturn-iu-sla"],
        quizPrompt:
          "Click the S-IVB third stage with the single restartable J-2 engine.",
        quizQuestion: {
          prompt:
            "What critical maneuver did the S-IVB third stage perform during Apollo missions?",
          options: [
            "Trans-Lunar Injection (TLI) to accelerate the Apollo spacecraft from orbit toward the Moon",
            "Landing directly on the lunar surface with astronauts inside",
            "Deploying parachutes to return gently to Earth",
          ],
          correctIndex: 0,
          explanation:
            "The S-IVB restarted in Earth orbit to add ~3,050 m/s of speed, flinging the Apollo CSM and LM into a translunar trajectory.",
        },
        cameraFocusDist: 18,
        cameraFocusPitch: 0.2,
        interactionKind: "stage-sep",
      },
      {
        id: "saturn-iu-sla",
        name: "Instrument Unit & Spacecraft-LM Adapter",
        shortName: "IU & SLA Adapter",
        role: "Digital Guidance & LM Garage",
        specLabel: "IBM LVDC & 4-Petal SLA",
        badge: "REAL DATA",
        honestyNote:
          "Houses the 74-pound IBM Launch Vehicle Digital Computer (LVDC) and encloses the Apollo Lunar Module.",
        fact: "The SLA fairing split into four hinged petals during translunar coast to expose the Lunar Module for transposition and docking.",
        mainFunction:
          "Guides the Saturn V autonomously into orbit and protects the Lunar Module from aerodynamic forces during ascent.",
        dimensions:
          "9.4 m height × 6.6 m to 3.9 m tapered diameter · 2,000 kg empty",
        engineeringSpecs: [
          {
            label: "Guidance Computer",
            value: "IBM LVDC (2.048 MHz, triple modular redundancy)",
          },
          { label: "SLA Panels", value: "4 spring-hinged jettisonable petals" },
          { label: "Payload Bay", value: "Apollo Lunar Module (LM)" },
          {
            label: "Navigation",
            value: "ST-124-M3 gimbaled inertial platform",
          },
        ],
        levels: {
          level1What:
            "The tapered section connecting the wide rocket to the Apollo command ship.",
          level2How:
            "Contains the rocket’s electronic brain and opens four petals in space so the crew can pull the Moon lander out.",
          level3Engineering:
            "The IBM LVDC used triple-redundant logic circuits that voted on calculations, surviving severe lightning strikes on Apollo 12.",
        },
        missionRelevance:
          "Kept the fragile Lunar Module safe during the violent 4g ascent through Earth atmosphere.",
        explodeAxis: [2.5, 3.8, 0],
        connections: ["saturn-sivb", "saturn-csm"],
        quizPrompt:
          "Select the tapered Spacecraft-LM Adapter and ring-shaped Instrument Unit.",
        quizQuestion: {
          prompt:
            "What spacecraft was hidden inside the Saturn V SLA fairing during launch?",
          options: [
            "The Apollo Lunar Module (LM)",
            "The Space Shuttle orbiter",
            "A Hubble space telescope prototype",
          ],
          correctIndex: 0,
          explanation:
            "The Lunar Module was mounted inside the tapered SLA fairing directly behind the Service Module until extracted in translunar flight.",
        },
        cameraFocusDist: 16,
        cameraFocusPitch: 0.22,
        interactionKind: "stage-sep",
      },
      {
        id: "saturn-csm",
        name: "Apollo Command & Service Module (CSM)",
        shortName: "Apollo CSM",
        role: "Crew Cabin & SPS Engine",
        specLabel: "AJ10-137 & AVCOAT Shield",
        badge: "REAL DATA",
        honestyNote:
          "Built by North American Rockwell; carried 3 astronauts to lunar orbit, powered return, and reentered at 11 km/s.",
        fact: "The Service Propulsion System (SPS) AJ10-137 engine burned hypergolic Aerozine 50 and N2O4 with no igniters needed.",
        mainFunction:
          "Houses the 3-astronaut crew, generates life support, maneuvers in lunar orbit, and protects astronauts during 11 km/s Earth reentry.",
        dimensions: "11.0 m total length × 3.9 m diameter · 30,300 kg fueled",
        engineeringSpecs: [
          { label: "Crew Capacity", value: "3 astronauts" },
          { label: "SPS Thrust", value: "91 kN (20,500 lbf)" },
          {
            label: "Heat Shield",
            value: "AVCOAT 5026-39 ablative composite (up to 2,760°C)",
          },
          { label: "Electrical Power", value: "3× Alkaline H2/O2 fuel cells" },
        ],
        levels: {
          level1What:
            "The conical capsule with windows and the silver cylinder behind it.",
          level2How:
            "Provides oxygen, water, and steering for the 8-day voyage, then brings the astronauts home through fiery reentry.",
          level3Engineering:
            "Hypergolic propellants ignite spontaneously upon contact inside the SPS combustion chamber, maximizing reliability for lunar orbit departure.",
        },
        missionRelevance:
          "Safely returned all 27 Apollo astronauts who flew around or to the Moon.",
        explodeAxis: [0, 5.2, 0],
        connections: ["saturn-iu-sla", "saturn-les"],
        quizPrompt: "Click the Apollo Command and Service Module spacecraft.",
        quizQuestion: {
          prompt:
            "Why did the Apollo Service Propulsion System (SPS) use hypergolic propellants?",
          options: [
            "Hypergolic propellants ignite automatically on contact without spark plugs, ensuring reliable restart to leave lunar orbit",
            "They are completely non-toxic and smell like pine",
            "They produce zero heat when burned",
          ],
          correctIndex: 0,
          explanation:
            "Eliminating electrical igniters ensured maximum reliability for the critical Trans-Earth Injection burn behind the Moon.",
        },
        cameraFocusDist: 14,
        cameraFocusPitch: 0.25,
        interactionKind: "thermal-shield",
      },
      {
        id: "saturn-les",
        name: "Launch Escape System (LES)",
        shortName: "LES Tower",
        role: "Pad & Ascent Emergency Escape",
        specLabel: "667 kN Solid Escape Motor",
        badge: "REAL DATA",
        honestyNote:
          "Mounted atop the Command Module; capable of pulling astronauts to safety in under 4 seconds from pad or ascent aborts.",
        fact: "The 667 kN solid propellant escape motor accelerated the Command Module away from an exploding rocket at 15g.",
        mainFunction:
          "Pulls the Apollo Command Module clear of the launch vehicle in the event of pad fire or catastrophic booster failure.",
        dimensions: "10.2 m height × 0.6 m tower diameter · 4,170 kg total",
        engineeringSpecs: [
          { label: "Escape Thrust", value: "667 kN (150,000 lbf)" },
          { label: "Burn Time", value: "3.2 seconds" },
          { label: "Jettison Motor", value: "140 kN (31,500 lbf)" },
          {
            label: "Pitch Control",
            value: "Aerodynamic canards & pitch motor",
          },
        ],
        levels: {
          level1What:
            "The pointed red-and-white tower perched at the very tip of the Saturn V.",
          level2How:
            "Fires instantly if the rocket malfunctions, rocketing the crew capsule high into the sky away from danger.",
          level3Engineering:
            "Contains two deployable aerodynamic canard surfaces at the nose that automatically pitch the capsule into a blunt-end-first attitude.",
        },
        missionRelevance:
          "Protected the lives of Apollo crews on the launch pad through staging.",
        explodeAxis: [0, 7.5, 0],
        connections: ["saturn-csm"],
        quizPrompt:
          "Select the pointed Launch Escape System tower on top of the rocket.",
        quizQuestion: {
          prompt:
            "How was the Launch Escape System tower jettisoned during a normal Apollo flight?",
          options: [
            "A separate solid jettison motor fired at ~90 km altitude to pull the tower away from the spacecraft",
            "It remained attached all the way to lunar landing",
            "It was unbolted by an astronaut on spacewalk",
          ],
          correctIndex: 0,
          explanation:
            "Once the rocket cleared the dense lower atmosphere and abort mode 2 took over, the 140 kN jettison motor pulled the tower away.",
        },
        cameraFocusDist: 12,
        cameraFocusPitch: 0.3,
        interactionKind: "stage-sep",
      },
    ],
  },
  "falcon-9": {
    id: "falcon-9",
    shortLabel: "Falcon 9",
    title: "Falcon 9 Full Thrust Launch System",
    subtitle: "70.0 m · 549 t Liftoff Mass · 7.61 MN Liftoff Thrust",
    summary:
      "The world’s first orbital class reusable two-stage launch vehicle, revolutionizing aerospace with propulsive vertical booster landings on land and autonomous drone ships.",
    scenarioDistinction:
      "Commercial heavy launcher with re-entry burns and vertical landing legs",
    modelHonestyTag: "NASA Hardware Specs",
    defaultCameraDist: 26,
    focusY: 10.5,
    overviewSpecs: [
      { label: "Liftoff Thrust", value: "7,607 kN (1.71M lbf)" },
      { label: "Liftoff Mass", value: "549,054 kg (549 t)" },
      { label: "Height / Diameter", value: "70.0 m / 3.66 m" },
      {
        label: "Payload to LEO",
        value: "22,800 kg (Expendable) / 18,400 kg (Reusable)",
      },
      {
        label: "Payload to GTO",
        value: "8,300 kg (Expendable) / 5,500 kg (Reusable)",
      },
      {
        label: "Booster Recovery",
        value: "Autonomous Spaceport Drone Ship (ASDS) / RTLS",
      },
    ],
    sources: [
      "NASA Launch Services Program (LSP) Falcon 9 Advisory (https://www.nasa.gov/launch-services-program/)",
      "NASA LSP Commercial Launch Vehicle Contract Fleet (https://www.nasa.gov/launch-services-program/)",
    ],
    parts: [
      {
        id: "falcon-stage1",
        name: "Stage 1 Booster Core & 9× Merlin 1D",
        shortName: "Stage 1 Booster",
        role: "Reusable Booster Propulsion",
        specLabel: "Octaweb 9× Merlin 1D",
        badge: "REAL DATA",
        honestyNote:
          "Constructed from aluminum-lithium alloy; burns RP-1 and densified subcooled LOX.",
        fact: "Nine SpaceX Merlin 1D engines arranged in an Octaweb structure provide 7.61 MN of thrust and throttle down to 40% for vertical landing.",
        mainFunction:
          "Accelerates the upper stage through the atmosphere, then executes boostback, entry, and landing burns to touch down vertically on a ship.",
        dimensions: "42.6 m height × 3.66 m diameter · 433,000 kg fueled",
        engineeringSpecs: [
          { label: "Liftoff Thrust", value: "7,607 kN sea level" },
          { label: "Specific Impulse", value: "282 s SL / 311 s vac" },
          { label: "Propellants", value: "RP-1 Kerosene / Subcooled LOX" },
          { label: "Throttle Range", value: "40% to 100%" },
        ],
        levels: {
          level1What:
            "The tall white booster core with nine rocket engines at the bottom.",
          level2How:
            "Lifts the rocket into space, disconnects from the upper stage, turns around, and flies itself back down to a landing pad.",
          level3Engineering:
            "Uses cryogenic subcooled liquid oxygen at -207°C to increase propellant density by ~8%, squeezing extra payload margin into a 3.66m road-transportable diameter.",
        },
        missionRelevance:
          "Routinely launches NASA Commercial Crew missions carrying astronauts to the International Space Station.",
        explodeAxis: [0, -3.2, 0],
        connections: [
          "falcon-interstage",
          "falcon-landing-legs",
          "falcon-grid-fins",
        ],
        quizPrompt:
          "Select the Stage 1 booster core with the 9-engine Octaweb cluster.",
        quizQuestion: {
          prompt:
            "What engine layout does Falcon 9 use on its first stage booster?",
          options: [
            "Octaweb layout with eight perimeter engines and one center engine",
            "Linear row of nine engines in a straight line",
            "Single massive solid rocket motor",
          ],
          correctIndex: 0,
          explanation:
            "The Octaweb arrangement distributes thrust evenly across the 3.66m booster diameter and allows center-engine throttle for vertical landing.",
        },
        cameraFocusDist: 18,
        cameraFocusPitch: 0.16,
        interactionKind: "propulsion-calc",
      },
      {
        id: "falcon-grid-fins",
        name: "4× Titanium Hypersonic Grid Fins",
        shortName: "Grid Fins",
        role: "Atmospheric Entry Aerodynamic Steering",
        specLabel: "Forged Titanium Lattice",
        badge: "REAL DATA",
        honestyNote:
          "Cast from single forgings of titanium to endure the extreme heat of hypersonic atmospheric reentry without burning.",
        fact: "Each grid fin pivots independently to roll, pitch, and yaw the returning booster from Mach 4.5 down to terminal velocity.",
        mainFunction:
          "Provides high-authority 3-axis aerodynamic steering through the upper and transonic atmosphere during booster descent.",
        dimensions:
          "1.5 m × 1.2 m each · 4 fins at 90° intervals around interstage",
        engineeringSpecs: [
          { label: "Material", value: "Solid forged titanium alloy" },
          {
            label: "Actuation",
            value: "High-pressure closed-loop hydraulic system",
          },
          {
            label: "Thermal Tolerance",
            value: "Over 1,000°C without ablative paint",
          },
          {
            label: "Control Authority",
            value: "Roll, pitch, and yaw control from Mach 4.5",
          },
        ],
        levels: {
          level1What:
            "The four rectangular waffle-like metal flaps near the top of the booster.",
          level2How:
            "Tilt in the wind like wings to guide the rocket directly toward the floating ocean drone ship.",
          level3Engineering:
            "Grid fins maintain aerodynamic effectiveness across supersonic, transonic, and subsonic regimes with very little hinge moment torque.",
        },
        missionRelevance:
          "Enabled precise pinpoint landings within a few meters of the drone ship target center.",
        explodeAxis: [2.5, 0.5, 0],
        connections: ["falcon-stage1"],
        quizPrompt:
          "Click the four titanium waffle grid fins near the top of the booster.",
        quizQuestion: {
          prompt:
            "Why are Falcon 9 grid fins cast from solid titanium rather than painted aluminum?",
          options: [
            "Titanium withstands the extreme frictional heat of hypersonic atmospheric entry without burning or melting",
            "Titanium is magnetic and attaches to the atmosphere",
            "Aluminum is too shiny and reflects sunlight into cameras",
          ],
          correctIndex: 0,
          explanation:
            "Early aluminum grid fins caught fire during aggressive reentry burns; solid titanium withstands heating above 1,000°C with unlimited reuse.",
        },
        cameraFocusDist: 12,
        cameraFocusPitch: 0.2,
        interactionKind: "gimbal-attitude",
      },
      {
        id: "falcon-landing-legs",
        name: "4× Carbon Fiber Landing Legs",
        shortName: "Landing Legs",
        role: "Touchdown Shock Absorption",
        specLabel: "Pneumatic Deploy & Crush Core",
        badge: "REAL DATA",
        honestyNote:
          "Folded along the base of the booster during ascent; deployed by high-pressure helium seconds before touchdown.",
        fact: "When deployed, the four carbon-fiber legs span 18 meters (60 feet) tip-to-tip and contain aluminum crush cores to absorb impact energy.",
        mainFunction:
          "Deploys in under 1.5 seconds just before touchdown to provide a stable, wide footprint and cushion landing forces.",
        dimensions:
          "18.0 m deployed stance diameter · 4 deployable A-frame struts",
        engineeringSpecs: [
          { label: "Deployed Span", value: "18 m (60 ft) tip-to-tip" },
          {
            label: "Construction",
            value: "Carbon fiber composite with aluminum honeycomb cores",
          },
          {
            label: "Deployment System",
            value: "High-pressure gaseous helium pneumatic pistons",
          },
          { label: "Deployment Time", value: "1.2 seconds before touchdown" },
        ],
        levels: {
          level1What:
            "The four long black angled struts folded flat against the bottom of the booster.",
          level2How:
            "Snap outward like spider legs right before the rocket hits the pad to catch it softly.",
          level3Engineering:
            "Telescoping pneumatic struts lock over-center mechanically on full extension, resisting bounce without heavy hydraulics.",
        },
        missionRelevance:
          "Essential component for vertical booster recovery on drone ships and landing zones.",
        explodeAxis: [-2.5, -2.8, 0],
        connections: ["falcon-stage1"],
        quizPrompt:
          "Select the deployable carbon fiber landing legs folded at the rocket base.",
        quizQuestion: {
          prompt:
            "How are the Falcon 9 landing legs deployed just before touchdown?",
          options: [
            "High-pressure helium gas pneumatically pushes the legs outward in ~1.2 seconds",
            "Astronauts manually crank them down with a wheel",
            "Gravity drops them when the booster is upside down",
          ],
          correctIndex: 0,
          explanation:
            "High-pressure helium stores high energy per unit mass, snapping the carbon fiber legs into locked position rapidly without hydraulic fluid weight.",
        },
        cameraFocusDist: 14,
        cameraFocusPitch: 0.15,
        interactionKind: "lander-legs",
      },
      {
        id: "falcon-interstage",
        name: "Carbon-Composite Interstage",
        shortName: "Interstage",
        role: "Structural Coupling & Pneumatic Separation",
        specLabel: "Pneumatic Pusher System",
        badge: "REAL DATA",
        honestyNote:
          "Joins Stage 1 and Stage 2; encloses the second stage MVacD engine nozzle during ascent.",
        fact: "Uses four pneumatic pushers to gently push Stage 2 clear after collet releases, creating zero orbital debris.",
        mainFunction:
          "Transfers thrust loads between stages and houses the pneumatic separation system and stage-control electronics.",
        dimensions:
          "8.0 m height × 3.66 m diameter · Carbon-fiber composite barrel",
        engineeringSpecs: [
          {
            label: "Material",
            value: "Carbon fiber honeycomb sandwich composite",
          },
          {
            label: "Separation Mechanism",
            value: "4 pneumatic separation pushers",
          },
          {
            label: "Debris Generation",
            value: "Zero (no pyrotechnic bolts severed)",
          },
          {
            label: "Nozzle Clearance",
            value: "Encloses 165:1 vacuum niobium bell",
          },
        ],
        levels: {
          level1What:
            "The dark charcoal ring separating the tall booster from the upper section.",
          level2How:
            "Pushes the two rocket stages apart cleanly in space without small explosive fragments.",
          level3Engineering:
            "Pneumatic pushers impart a smooth, non-shock separating delta-V, preventing damage to the delicate niobium nozzle extension of Stage 2.",
        },
        missionRelevance:
          "Provides debris-free staging to protect low Earth orbit satellites.",
        explodeAxis: [0, 0.8, 0],
        connections: ["falcon-stage1", "falcon-stage2"],
        quizPrompt:
          "Click the dark carbon-composite interstage coupling the first and second stages.",
        quizQuestion: {
          prompt:
            "What advantage does Falcon 9’s pneumatic stage separation system have over explosive pyrotechnic separation bolts?",
          options: [
            "It creates zero orbital debris and produces low mechanical shock on sensitive payloads",
            "It weighs three times more than dynamite",
            "It makes the separation completely invisible to radar",
          ],
          correctIndex: 0,
          explanation:
            "Pneumatic pushers produce gentle, repeatable separation without explosive debris or sharp shockwaves.",
        },
        cameraFocusDist: 14,
        cameraFocusPitch: 0.22,
        interactionKind: "stage-sep",
      },
      {
        id: "falcon-stage2",
        name: "Stage 2 & 1× Merlin 1D Vacuum (MVacD)",
        shortName: "Stage 2 & MVacD",
        role: "Orbital Insertion & Payload Delivery",
        specLabel: "Merlin 1D Vacuum Engine",
        badge: "REAL DATA",
        honestyNote:
          "Powered by a single Merlin Vacuum engine equipped with an oversized radiatively cooled niobium alloy bell.",
        fact: "Delivers 981 kN of thrust with an exceptional 348 s vacuum specific impulse—the highest of any US-developed hydrocarbon engine.",
        mainFunction:
          "Inserts payloads into low Earth orbit, geostationary transfer orbit, or interplanetary escape trajectories with multiple restarts.",
        dimensions: "12.6 m height × 3.66 m diameter · 111,500 kg fueled",
        engineeringSpecs: [
          { label: "Vacuum Thrust", value: "981 kN (220,500 lbf)" },
          { label: "Specific Impulse", value: "348 s vac" },
          {
            label: "Expansion Ratio",
            value: "165:1 radiatively cooled niobium bell",
          },
          {
            label: "Restart System",
            value: "TEA-TEB dual-pyrophoric igniter cartridges",
          },
        ],
        levels: {
          level1What:
            "The upper rocket stage with a giant flared metal bell beneath the payload nose cone.",
          level2How:
            "Burns liquid fuel in space to push satellites to orbital speeds exceeding 27,000 km/h.",
          level3Engineering:
            "The oversized radiation-cooled niobium alloy bell glows incandescent red in vacuum, expanding exhaust gases to 165 times the nozzle throat area.",
        },
        missionRelevance:
          "Carries NASA scientific spacecraft, Dragon crew capsules, and communications constellations to orbit.",
        explodeAxis: [0, 2.8, 0],
        connections: ["falcon-interstage", "falcon-fairing"],
        quizPrompt:
          "Select the Stage 2 upper section with its large Merlin Vacuum rocket bell.",
        quizQuestion: {
          prompt:
            "What material is the oversized Merlin Vacuum (MVacD) engine nozzle extension made from?",
          options: [
            "Radiatively cooled niobium alloy that glows red-hot in space",
            "Cast iron with gold spray paint",
            "Standard household aluminum foil",
          ],
          correctIndex: 0,
          explanation:
            "Niobium retains immense structural strength at incandescent temperatures above 1,300°C while radiating excess heat directly into space.",
        },
        cameraFocusDist: 16,
        cameraFocusPitch: 0.24,
        interactionKind: "propulsion-calc",
      },
      {
        id: "falcon-fairing",
        name: "5.2m Clamshell Payload Fairing",
        shortName: "Payload Fairing",
        role: "Aerodynamic Protection & Acoustic Shielding",
        specLabel: "Carbon Composite Split Shell",
        badge: "REAL DATA",
        honestyNote:
          "Protects satellites from wind and sound at launch; splits into two halves once above the dense atmosphere.",
        fact: "Each 13.1m carbon composite fairing half features cold-gas thrusters and steerable parafoils for recovery from the ocean surface.",
        mainFunction:
          "Protects the satellite or spacecraft payload from atmospheric drag, acoustic loads, and weather during ascent.",
        dimensions: "13.1 m height × 5.2 m outer diameter · 1,750 kg total",
        engineeringSpecs: [
          {
            label: "Dimensions",
            value: "13.1 m height × 5.2 m outer diameter",
          },
          {
            label: "Construction",
            value: "Carbon-fiber composite sandwich with aluminum core",
          },
          {
            label: "Separation",
            value: "Pneumatic pushers & cold gas thrusters at ~110 km",
          },
          {
            label: "Recovery Gear",
            value: "Steerable parafoils & GPS ocean splashdown recovery",
          },
        ],
        levels: {
          level1What:
            "The smooth cone-shaped nose of the rocket that covers the satellite.",
          level2How:
            "Splits open like a clamshell once the rocket reaches the vacuum of space, exposing the satellite.",
          level3Engineering:
            "Cold-gas nitrogen thrusters orient the falling fairing halves during atmospheric entry before deploying steerable parafoils.",
        },
        missionRelevance:
          "Protected NASA flagship missions such as DART, IXPE, and PACE during launch.",
        explodeAxis: [2.8, 4.2, 0],
        connections: ["falcon-stage2"],
        quizPrompt: "Click the 5.2-meter clamshell payload fairing nose cone.",
        quizQuestion: {
          prompt:
            "How does SpaceX recover and reuse Falcon 9 payload fairing halves?",
          options: [
            "Cold-gas thrusters orient the halves during entry, and steerable parafoils guide them to ocean retrieval ships",
            "They land vertically on their own rocket engines",
            "They burn up completely and are never recovered",
          ],
          correctIndex: 0,
          explanation:
            "Fairing halves execute controlled atmospheric entry with cold nitrogen thrusters and parafoils, saving ~$6 million per launch.",
        },
        cameraFocusDist: 14,
        cameraFocusPitch: 0.28,
        interactionKind: "stage-sep",
      },
    ],
  },

  iss: {
    id: "iss",
    shortLabel: "ISS Station",
    title: "International Space Station (ISS)",
    subtitle: "108.5 m Truss · 450 t Mass · 120 kW Solar Power · 418 km LEO",
    summary:
      "International modular space station in Low Earth Orbit serving as a permanent microgravity laboratory and testbed for deep-space life support and technology since 1998.",
    scenarioDistinction:
      "Official NASA / ESA / JAXA / Roscosmos orbital laboratory specifications; 3D geometry represents the full operational assembly.",
    modelHonestyTag: "NASA Hardware Specs",
    defaultCameraDist: 28,
    focusY: 0,
    overviewSpecs: [
      { label: "Truss Span", value: "108.5 m (356 ft)" },
      { label: "Orbit Altitude", value: "~418 km (51.6° inc)" },
      { label: "Total Mass", value: "~450,000 kg" },
    ],
    sources: [
      "NASA International Space Station Reference Guide (https://www.nasa.gov/reference/international-space-station/)",
      "NASA International Space Station Program Overview (https://www.nasa.gov/international-space-station/)",
    ],
    parts: [
      {
        id: "iss-truss",
        name: "Integrated Truss Structure (ITS) & SARJ Gimbals",
        shortName: "Truss & SARJ",
        role: "Structural Backbone, Thermal Bus & Power Routing",
        specLabel: "108.5 m Aluminum Truss · Solar Alpha Rotary Joints",
        badge: "REAL DATA",
        honestyNote: "NASA ISS Integrated Truss Structure specifications.",
        fact: "The 108.5-meter Integrated Truss Structure acts as the station backbone, routing electrical power, coolant lines, and data between modules and solar arrays.",
        mainFunction:
          "Houses thermal radiator rotary joints, primary avionics, ammonia coolant pipes, and mobile transporter tracks for Canadarm2.",
        dimensions: "108.5 m length · 4.5 m cross-section",
        engineeringSpecs: [
          { label: "Material", value: "Al-Li truss framework" },
          { label: "SARJ Joints", value: "360° continuous rotation" },
          { label: "Coolant Loop", value: "Dual closed ammonia lines" },
        ],
        levels: {
          level1What:
            "The giant metal backbone that holds the entire space station together.",
          level2How:
            "Carries power cables, coolant tubes, and computer networks from the solar wings to the science labs.",
          level3Engineering:
            "108.5-meter segmented aluminum-lithium truss with dual Solar Alpha Rotary Joints (SARJs) rotating continuously to track the Sun across 16 orbits per day.",
        },
        missionRelevance:
          "Provides mounting and utility transport for all external experiments and station power systems.",
        explodeAxis: [0, 2.8, 0],
        connections: ["iss-modules", "iss-solar-arrays", "iss-radiators"],
        quizPrompt:
          "Click the 108.5-meter Integrated Truss Structure backbone.",
        quizQuestion: {
          prompt: "What does the ISS Integrated Truss Structure provide?",
          options: [
            "Living quarters for the crew",
            "Structural backbone and power/cooling routing",
            "Rocket engines for interplanetary flight",
          ],
          correctIndex: 1,
          explanation:
            "The 108.5m truss is the structural backbone of the ISS, mounting the solar wings, radiators, and routing power/coolant.",
        },
        cameraFocusDist: 22,
        cameraFocusPitch: 0.25,
        interactionKind: "hab-shield",
      },
      {
        id: "iss-modules",
        name: "Pressurized Module Cluster (Destiny, Kibo, Columbus, Cupola)",
        shortName: "Hab & Lab Modules",
        role: "Pressurized Living Volume & Microgravity Science Labs",
        specLabel:
          "388 m³ Living Volume · 16 Pressurized Modules · Cupola 360°",
        badge: "REAL DATA",
        honestyNote: "NASA/ESA/JAXA habitable module dimensions.",
        fact: "The pressurized modules maintain a 1 atmosphere (101.3 kPa) sea-level Earth air mix (78% N2, 21% O2) where astronauts conduct over 300 simultaneous science experiments.",
        mainFunction:
          "Houses human crew, environmental life support systems, laboratory experiment racks, and the 7-window Cupola observatory.",
        dimensions: "72.8 m pressurized length · 4.2 m outer diameter modules",
        engineeringSpecs: [
          { label: "Atmosphere", value: "101.3 kPa (21% O2, 78% N2)" },
          { label: "Habitable Vol", value: "388 m³ living space" },
          {
            label: "Cupola Windows",
            value: "7 fused silica/borosilicate panes",
          },
        ],
        levels: {
          level1What:
            "The interconnected metal cans where astronauts live, sleep, and do science in space.",
          level2How:
            "Maintains fresh air, comfortable temperatures, and water recycling while shielding crew from radiation.",
          level3Engineering:
            "Welded aluminum micrometeoroid/orbital debris (MMOD) shielded cylinders with International Standard Payload Racks (ISPRs) and Node mating adapters.",
        },
        missionRelevance:
          "Enables long-duration human spaceflight research required before embarking on multi-year journeys to Mars.",
        explodeAxis: [0, 0, 3.2],
        connections: ["iss-truss", "iss-canadarm"],
        quizPrompt:
          "Click the central pressurized living and laboratory modules.",
        quizQuestion: {
          prompt:
            "What atmospheric composition and pressure is kept inside the ISS?",
          options: [
            "Pure oxygen at 34 kPa",
            "Earth sea-level air at 101.3 kPa",
            "Carbon dioxide at 50 kPa",
          ],
          correctIndex: 1,
          explanation:
            "The ISS uses a standard Earth sea-level atmosphere of 101.3 kPa (14.7 psi) with 78% nitrogen and 21% oxygen.",
        },
        cameraFocusDist: 14,
        cameraFocusPitch: 0.35,
        interactionKind: "hab-shield",
      },
      {
        id: "iss-solar-arrays",
        name: "8 Solar Array Wings (SAWs) & Silicon Photovoltaics",
        shortName: "120 kW Solar Arrays",
        role: "Primary Station Electrical Power Generation",
        specLabel: "34 m × 10.7 m per Wing · 120 kW Continuous · 262,400 Cells",
        badge: "REAL DATA",
        honestyNote: "NASA Glenn Research Center ISS power architecture.",
        fact: "The 8 massive solar wings contain over 262,000 solar cells, converting sunlight into 120 kilowatts of direct current electricity stored in lithium-ion batteries.",
        mainFunction:
          "Powers all life support systems, computers, science laboratory freezers, and communication transmitters 24 hours a day.",
        dimensions: "34 m length × 10.7 m width per wing (8 wings total)",
        engineeringSpecs: [
          { label: "Total Power", value: "120 kW continuous" },
          {
            label: "Cell Technology",
            value: "Silicon solar cells (supplemented by iROSA)",
          },
          { label: "Battery Storage", value: "Lithium-ion battery ORUs" },
        ],
        levels: {
          level1What:
            "Giant gold-colored wings that capture sunlight to power the station.",
          level2How:
            "Tracks the Sun as the station flies around Earth, storing extra energy in batteries for when the station passes through Earth shadow.",
          level3Engineering:
            "Deployable mast blankets delivering 160V DC regulated bus power converted down to 124V secondary distribution across the US and international segments.",
        },
        missionRelevance:
          "Supplies continuous electricity for critical life support and science operations.",
        explodeAxis: [4.5, 0, 0],
        connections: ["iss-truss"],
        quizPrompt: "Click the 120 kW photovoltaic solar array wings.",
        quizQuestion: {
          prompt:
            "What is the total continuous power output of the ISS solar arrays?",
          options: ["~12 kW", "~120 kW", "~1,200 kW"],
          correctIndex: 1,
          explanation:
            "The 8 main Solar Array Wings generate approximately 120 kilowatts of power during sunlit portions of each orbit.",
        },
        cameraFocusDist: 20,
        cameraFocusPitch: 0.22,
        interactionKind: "solar-array",
      },
      {
        id: "iss-radiators",
        name: "External Active Thermal Control Ammonia Radiators",
        shortName: "Ammonia Radiators",
        role: "Station Waste Heat Rejection",
        specLabel:
          "Liquid Ammonia Loops · Honeycomb Panels · 70 kW Heat Rejection",
        badge: "REAL DATA",
        honestyNote: "NASA Active Thermal Control System (ATCS) specs.",
        fact: "Because there is no air in space to carry heat away, liquid ammonia circulates through the station to collect waste heat and radiate it as infrared into deep space.",
        mainFunction:
          "Rejects heat produced by electronics, experiments, and crew bodies to keep station temperatures between 18°C and 26°C.",
        dimensions: "3 panels per wing · 24 m deployed span",
        engineeringSpecs: [
          { label: "Coolant", value: "Anhydrous ammonia (NH3)" },
          { label: "Heat Rejection", value: "~70 kW thermal" },
          { label: "Cabin Loop", value: "Internal water heat exchangers" },
        ],
        levels: {
          level1What:
            "Large white cooling panels that keep the space station from overheating.",
          level2How:
            "Pumps cold ammonia through metal panels that glow in invisible infrared light to radiate heat away into space.",
          level3Engineering:
            "Active Thermal Control System with dual independent external ammonia loops operating at -40°C to +40°C, isolated from crew compartments via titanium interface heat exchangers.",
        },
        missionRelevance:
          "Without thermal radiators, heat from electronics and crew would cook the station interior within hours.",
        explodeAxis: [0, 0, -3.5],
        connections: ["iss-truss"],
        quizPrompt: "Click the white ammonia cooling radiator panels.",
        quizQuestion: {
          prompt:
            "Why is ammonia used in the external radiator loops of the ISS?",
          options: [
            "It does not freeze at -77°C and transfers heat efficiently",
            "It is non-toxic to breath in an emergency",
            "It serves as rocket fuel for re-boosting the station",
          ],
          correctIndex: 0,
          explanation:
            "Ammonia has a very low freezing point (-77.7°C) and high specific heat, making it ideal for the extreme thermal vacuum of space.",
        },
        cameraFocusDist: 18,
        cameraFocusPitch: 0.35,
        interactionKind: "thermal-shield",
      },
      {
        id: "iss-canadarm",
        name: "Canadarm2 (Space Station Remote Manipulator System)",
        shortName: "Canadarm2 Robotic Arm",
        role: "Heavy Payload Handling, Station Assembly & EVA Assistance",
        specLabel:
          "17.6 m Length · 7 Motorized Joints · 116,000 kg Payload Capacity",
        badge: "REAL DATA",
        honestyNote: "Canadian Space Agency (CSA) Canadarm2 specifications.",
        fact: "Canadarm2 has 7 motorized joints and symmetrical hands at both ends, allowing it to inchworm end-over-end across PDGF fixtures all over the station exterior.",
        mainFunction:
          "Grapples visiting cargo spaceships, moves heavy replacement battery boxes, and positions spacewalking astronauts during exterior repairs.",
        dimensions:
          "17.6 m (57.7 ft) total length · 35 cm diameter carbon composite boom",
        engineeringSpecs: [
          { label: "Joints", value: "7 motorized rotary joints" },
          { label: "Payload Max", value: "116,000 kg (256,000 lb)" },
          {
            label: "Control",
            value: "Robotic workstation in Cupola / Destiny",
          },
        ],
        levels: {
          level1What:
            "A giant robotic arm that catches spaceships and helps astronauts on spacewalks.",
          level2How:
            "Controlled by astronauts looking out the Cupola windows using joysticks and cameras.",
          level3Engineering:
            "Carbon-fiber thermoplastic composite boom with Latching End Effectors (LEEs) capable of bidirectional power, data, and video transmission.",
        },
        missionRelevance:
          "Crucial for capturing visiting cargo vehicles (Cygnus, HTV, Dragon) and performing external station repairs.",
        explodeAxis: [-2.2, 1.8, 0],
        connections: ["iss-modules"],
        quizPrompt: "Click the 17.6-meter Canadarm2 robotic arm.",
        quizQuestion: {
          prompt: "How does Canadarm2 relocate around the ISS exterior?",
          options: [
            "It has wheels that drive along the truss",
            "It moves end-over-end like an inchworm between anchor fixtures",
            "It must be disconnected by spacewalkers and carried",
          ],
          correctIndex: 1,
          explanation:
            "Canadarm2 has identical latching hands on both ends, allowing it to walk end-over-end across Power Data Grapple Fixtures.",
        },
        cameraFocusDist: 15,
        cameraFocusPitch: 0.3,
        interactionKind: "hab-shield",
      },
    ],
  },
};
