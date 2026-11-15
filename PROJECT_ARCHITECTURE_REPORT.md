# ARTEMIS ODYSSEY: COMPREHENSIVE ARCHITECTURAL & TECHNICAL REPORT
**Interactive 3D Moon-to-Mars Mission Simulator · NASA Space Apps Challenge**
*Document Version: 2.4.0 · Local Timestamp: 2026-11-15 · Author: Technical Architecture Analysis*

---

## 1. EXECUTIVE SUMMARY & SYSTEM PHILOSOPHY

### 1.1 Project Purpose & Core Concept
**Artemis Odyssey** is an authentic, educational 3D aerospace mission simulator and systems-engineering trainer. Built for students, space science enthusiasts, and aerospace engineering learners (target audience ages 8–14 and higher), it bridges the gap between static academic fact sheets and disconnected arcade games.

Every mission event in Artemis Odyssey is governed by **real NASA flight physics, verified aerospace equations, and live NASA APIs**:
- **"Learn → Apply → Reuse" Philosophy**: Engineering actions in early missions directly carry over into later missions via persistent state (`CampaignCarryoverState`). For example, mining water ice at the Lunar South Pole in Artemis III produces liquid hydrogen ($LH_2$) fuel and radiation shielding water-walls that are reused in the Artemis IV Gateway transfer and the Mars Jezero Crater descent.
- **Zero External Heavy Asset Philosophy**: 
  - **3D Models**: 100% procedurally modeled in Three.js geometry (SLS Block 1, Mobile Launcher ML-1, Launch Complex LC-39B, Dual-Planet Lander, VIPER Rover, Gateway, JWST, Voyager). No heavy external `.gltf` or `.obj` assets are required for core vehicles.
  - **Audio Engine**: 100% procedural sound synthesis using the Web Audio API (white/pink noise filters, resonant biquad filters, FM oscillators, Apollo Quindar radio beeps, and live Geiger counter radiation clicks).
  - **Textures**: Dynamic procedural HTML5 canvas texture generators for terrain bump maps, regolith, craters, launch tower trusses, solar cells, and insulation foam.

---

## 2. HIGH-LEVEL ARCHITECTURE & TECHNOLOGY STACK

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|                                                                                       |
|  +--------------------+  +----------------------+  +-------------------------------+  |
|  |  React 19 + Vite 8 |  | Three.js r187 WebGL  |  |      Web Audio API Synth      |  |
|  |  Tailwind CSS v4   |  | Custom GLSL Shaders  |  |  Noise & Quindar Oscillators  |  |
|  |  Framer Motion     |  | Procedural Geometry  |  |  Geiger Counter Pulse Gen     |  |
|  +---------+----------+  +----------+-----------+  +---------------+---------------+  |
|            |                        |                              |                  |
|            +-------------------+    |    +-------------------------+                  |
|                                |    |    |                                            |
|                                v    v    v                                            |
|                    +---------------------------+                                      |
|                    |     App.tsx Controller    |                                      |
|                    |  - Game State Machine     |                                      |
|                    |  - Campaign Carryover     |                                      |
|                    |  - 120Hz Physics Stepper  |                                      |
|                    +-------------+-------------+                                      |
+----------------------------------|----------------------------------------------------+
                                   | HTTP REST (JSON)
                                   v
+---------------------------------------------------------------------------------------+
|                               EXPRESS BACKEND (server.ts)                             |
|                                                                                       |
|   +-------------------+  +-------------------+  +------------------+  +-----------+   |
|   | NASA DONKI Proxy  |  |  NASA OSDR Proxy  |  | JPL Horizons API |  | Gemini AI |   |
|   | Space Weather FLR |  | Radiobiology Data |  | Live Ephemerides |  |  CAPCOM   |   |
|   | (6-hr RAM Cache)  |  | (6-hr RAM Cache)  |  | (12-hr Cache)    |  | Assistant |   |
|   +---------+---------+  +---------+---------+  +--------+---------+  +-----+-----+   |
+-------------|----------------------|---------------------|------------------|---------+
              v                      v                     v                  v
+---------------------+    +-------------------+  +------------------+  +---------------+
| NASA api.nasa.gov   |    | NASA osdr.nasa.gov|  | NASA JPL SSD     |  | Google GenAI  |
| DONKI (FLR/CME/GST) |    | Open Science Data |  | Horizons System  |  | Search/Maps   |
+---------------------+    +-------------------+  +------------------+  +---------------+
```

### 2.1 Core Stack Specifications
- **Runtime Environment**: Node.js v20+ / Node.js v24 compatible; Bun lockfile provided.
- **Frontend Framework**: React 19 (`19.0.1`), React DOM (`19.0.1`).
- **Language**: TypeScript (`7.0.2` dev dependency, strict mode typechecking).
- **Build System**: Vite 8 (`8.3.0`) with `@vitejs/plugin-react` (`6.1.1`).
- **Styling**: Tailwind CSS v4 (`4.3.3`) via `@tailwindcss/vite`.
- **UI Animation**: Motion (`motion` 12.23.24) and Lucide React icons (`lucide-react` 0.546.0).
- **3D Graphics Engine**: Three.js (`0.187.0`) + `@types/three` (`0.187.0`), RoomEnvironment module.
- **Server Framework**: Express.js (`4.21.2`) with `tsx` (`4.21.0`) execution wrapper.
- **AI Grounding**: Google GenAI SDK (`@google/genai` 3.3.0) with Gemini 2.5 Flash / Flash-lite models.
- **External Data Sources**: 
  - NASA DONKI (Space Weather Database of Notifications, Knowledge, and Information)
  - NASA OSDR (Open Science Data Repository for space biology and radiation studies)
  - NASA JPL Horizons System (High-precision Solar System Ephemerides)

---

## 3. COMPLETE DIRECTORY & FILE-BY-FILE AUDIT

### 3.1 Root Configuration & Build Files
| File | Role & Contents |
| :--- | :--- |
| `package.json` | Project dependencies (React 19, Three.js 0.187, Tailwind v4, Express 4.21, GenAI 3.3). Scripts: `dev`, `build`, `start`, `preview`, `lint`. |
| `tsconfig.json` | Strict TypeScript compiler options: ESNext module, Bundler module resolution, DOM lib, `noEmit: true`. |
| `vite.config.ts` | Vite configuration mounting `@vitejs/plugin-react` and `@tailwindcss/vite`. |
| `server.ts` | Express API server (562 lines): Caches and serves NASA DONKI, OSDR, JPL Horizons, Gemini AI search grounding, Google Maps launch site grounding, and serves Vite SPA static build. |
| `index.html` | HTML5 root shell, viewport setup, preloading fonts, title tags. |
| `bun.lock` | Bun lockfile for reproducible package tree installation. |
| `metadata.json` | Project identity metadata and educational descriptions. |
| `README.md` | NASA Space Apps documentation and user guide. |

### 3.2 Source Tree: `src/game/` (Physics, Math & Simulation State)
This directory houses the entire deterministic simulation engine. It contains no React or DOM dependencies.

| File | Lines | Key Functions & Technical Responsibilities |
| :--- | :--- | :--- |
| `src/game/types.ts` | 635 | Master TypeScript interface definition: `GamePhase`, `LaunchState`, `SpaceFlightState`, `LandingState`, `RoverState`, `CampaignCarryoverState`, `MarsQueueState`, `DrillingConsoleState`, `OutpostConsoleState`, `DonkiStatus`, `OsdrStudy`, `InspectorUiState`. |
| `src/game/constants.ts` | 932 | True NASA SI physical constants (`PHYSICS` object), SLS Block 1 engineering specs (thrust, dry mass, propellant mass, Isp), 4-mission campaign specs (`CAMPAIGN_MISSIONS`), landing zones, rover objectives, payload tradeoff definitions. |
| `src/game/physics.ts` | 1822 | The core physics engine: 120Hz sub-stepped launch trajectory, barometric atmospheric density, Mach drag curve, gravity turn program, 6-DOF lunar/martian powered descent, landing touchdown scoring, 4-mode rover kinematics, surface height generation for Moon and Mars. |
| `src/game/marsQueue.ts` | 1283 | Martian teleoperation queue and autonomous navigation engine: command buffering, signal delay simulation (3–22 min light time), A* style waypoint interpolation, dynamic rock collider avoidance, stuck detection, reverse escape routines. |
| `src/game/orbitalMechanics.ts` | 620 | Keplerian orbital elements to Cartesian state vector conversions, Newton-Raphson solver for eccentric anomaly, trajectory regime classification, orbital velocity and escape velocity calculations. |
| `src/game/solarSystemData.ts` | 740 | Ephemerides and orbital characteristics of the Sun and 9 major celestial bodies, multi-scale coordinate conversion (Astronomical Units to 3D scene units), planetary scaling modes. |
| `src/game/jplHorizons.ts` | 280 | NASA JPL Horizons REST API URL generator, batch vector CSV parser, ICRF Cartesian state vector formatting, fallback analytical propagator. |
| `src/game/audio.ts` | 677 | Procedural Web Audio API sound synthesis: dynamic low-pass filtered noise for rocket thrust, FM synthesis for RCS jets, Quindar audio beeps, Geiger counter radiation pulses, space ambience drone. |
| `src/game/drilling.ts` | 310 | TRIDENT regolith and polar ice core drill simulation: multi-layer hardness modeling, bit temperature thermal dissipation, torque load, jam recovery, cooling pulse sequencing. |
| `src/game/outpost.ts` | 240 | Artemis Base Camp / Mars Outpost management: dual airlock pressure cycling, Sol summary generation, power grid allocation between Solar Photovoltaics and Kilopower nuclear reactor. |
| `src/game/hardwareCatalog.ts` | 420 | Comprehensive engineering data sheets for all modeled spacecraft (SLS, Orion, Lunar Lander, VIPER, Gateway, JWST, Voyager) with clickable subsystem specifications. |
| `src/game/hardwareInspector.ts` | 310 | Exploded-view coordinate math, part isolation logic, gimbal angle propagation, stage separation animation sequences. |
| `src/game/learningModules.ts` | 390 | Educational aerospace science curriculum modules linked to in-game objectives and anomalies. |
| `src/game/factsAndGlossary.ts` | 450 | Contextual aerospace facts, engineering glossary entries, and pop-up educational tips for kids aged 8–14. |
| `src/game/missionBriefing.ts` | 260 | Pre-flight payload configuration, mass penalty calculations, and starting resource state derivation. |
| `src/game/missionProgress.ts` | 180 | Mission score calculation, objective completion verification, and milestone unlocking. |
| `src/game/planetaryCatalog.ts` | 250 | SI astronomical reference tables (mass, radius, surface gravity, standard gravitational parameters $\mu = GM$). |
| `src/game/sequences.ts` | 320 | State machines for EDL (Entry, Descent, and Landing), Rover Unstow ramp animation, and LEO parking orbit TLI burn. |
| `src/game/warnings.ts` | 190 | Flight advisory alarm triggers: Master Caution & Warning, Apollo 1202 radar overload, low fuel, thermal runaway. |
| Unit Tests (`*.test.ts`) | ~400 | Vitest/Jest unit test suites covering physics math, orbital propagation, hardware inspection, and mission logic. |

### 3.3 Source Tree: `src/three/` (3D WebGL Graphics & Shaders)
| File | Lines | Key Functions & Technical Responsibilities |
| :--- | :--- | :--- |
| `src/three/SpaceSceneManager.ts` | 3616 | Master WebGL engine orchestrator. Manages Three.js scene graph, multiple camera modes (chase, cockpit, orbit, overhead), lighting rigs, shadow maps, particle systems (exhaust, smoke, water deluge, lunar dust), 3D raycasting, and screen-space coordinate projection for HUD target pins. |
| `src/three/models.ts` | 4373 | 100% procedural 3D model construction: SLS Block 1, Mobile Launcher 1 tower, LC-39B flame trench, Lunar Lander, VIPER Rover, Artemis Outpost dome, JWST, Voyager, and Gateway. |
| `src/three/planetMaps.ts` | 420 | Procedural sphere mapping, bump map synthesis, cloud layer animation, and atmospheric Rayleigh scattering uniforms. |
| `src/three/textures.ts` | 380 | Procedural canvas texture generators: rocket foam insulation, solar panel grids, metallic trusses, regolith craters, lunar maria. |

### 3.4 Source Tree: `src/components/` (React HUD & UI Suite)
| File | Lines | Role & UI Responsibility |
| :--- | :--- | :--- |
| `src/App.tsx` | 3462 | Central state controller, keyboard input listener, 120Hz physics update loop, modal dialog routing, audio synthesizer hookup. |
| `TitleOverlay.tsx` | 520 | Cinematic landing page / main menu: hero header, 4 mission mode cards, Mission Overview telemetry preview, NASA Updates ticker, bottom navigation. |
| `BriefingOverlay.tsx` | 380 | Pre-mission briefing console: campaign selector (Artemis II–IV, Mars), payload mass/bonus tradeoffs, NASA mission grounding. |
| `LaunchHUD.tsx` | 640 | Rocket launch cockpit: 14 flight phases, countdown, throttle control, staging manual trigger, dynamic pressure ($q$), altitude, velocity, trajectory pitch angle, time warp (1x, 2x, 4x). |
| `SpaceFlightHUD.tsx` | 480 | Interplanetary cislunar flight cockpit: solar system radar, delta-V expended, radiation exposure warning, autopilot navigation. |
| `LandingHUD.tsx` | 560 | Lunar/Martian powered descent guidance console: sticky throttle pintle, TWR gauge, 3 guidance modes (Manual, Rate Assist, Autoland), 4-axis RCS kill-drift, Apollo contact light, approach gates. |
| `RoverHUD.tsx` | 720 | Surface rover dashboard: 4 drive modes (Drive, Crab, Spin, Walker), headlights, hazard cams, spectrometer, Auto-Drive waypoint list, rock collision alert, speedometer. |
| `DrillingModal.tsx` | 340 | TRIDENT ice coring minigame console: depth gauge, bit temp thermometer, torque load meter, cooling pulse trigger. |
| `OutpostConsoleModal.tsx` | 380 | Artemis Base Camp / Mars Outpost interior monitor: airlock cycle control, room selector (quarters, lab, greenhouse, comms), solar vs Kilopower selector, Sol report. |
| `VehicleInspectorOverlay.tsx` | 680 | 3D spacecraft interactive engineering lab: exploded view slider, subsystem highlight, gimbal actuation, educational quiz mode. |
| `FieldNotebookModal.tsx` | 280 | Aerospace science field journal: unlocked scientific discoveries, OSDR study notes, DONKI space weather summaries. |
| `NasaDataModal.tsx` | 320 | Dedicated live NASA API telemetry browser: real-time solar flare lists, OSDR biology datasets, JPL Horizons ephemerides. |
| `GameMenuModal.tsx` | 420 | Fullscreen settings, surface map, achievement tracker, glossary, audio volume sliders. |
| `WorldTargetPins.tsx` | 180 | Screen-space CSS pins projected from Three.js 3D world coordinates for landing pads, objectives, and hazards. |
| `MobileAcademyView.tsx` | 450 | Responsive non-WebGL fallback view for smartphones (<1024px) offering full aerospace lessons, hardware diagrams, and quiz systems. |
| Other Components | ~800 | `AudioQualityPopover`, `CalmFactToast`, `CenteredEventCard`, `LearnObjectModal`, `MissionTelemetryStrip`, `NASAInsignia`, `OutcomeModal`, `RoverSpeedometer`, `SurfaceMapPanel`. |

---

## 4. DETAILED SUBSYSTEM BREAKDOWN

### 4.1 The Physics Engine (`src/game/physics.ts`)

#### A. Rocket Launch & Atmospheric Ascent
The launch simulation uses a deterministic internal sub-step at 120 Hz (`FIXED_LAUNCH_DT = 1 / 120`):
$$\vec{F}_{\text{net}} = \vec{F}_{\text{thrust}} - \vec{F}_{\text{drag}} - m \cdot \vec{g}_{\text{eff}}$$
$$\vec{a} = \frac{\vec{F}_{\text{net}}}{m}$$

Key physical phenomena accurately modeled:
1. **Dynamic Atmospheric Density**: Calculated using the international barometric formula:
   $$\rho(h) = \rho_0 \cdot \exp\left(-\frac{h}{H}\right)$$
   Where scale height $H \approx 7,400\text{ m}$ in the lower atmosphere, with temperature gradient compensation up to 120 km.
2. **Mach-Dependent Drag Coefficient ($C_d$)**:
   - Subsonic ($M < 0.8$): $C_d \approx 0.28$
   - Transonic Peak ($0.8 \le M \le 1.2$): $C_d$ surges to $0.48$ due to wave drag.
   - Supersonic ($M > 1.2$): $C_d$ smoothly declines toward $0.22$.
3. **Dynamic Pressure (Max-Q)**:
   $$q = \frac{1}{2} \rho v^2$$
   Max-Q occurs between $11\text{ km}$ and $14\text{ km}$ altitude, requiring structural throttle back in real SLS missions.
4. **Centrifugal Gravity Offset**:
   $$g_{\text{eff}} = \frac{G M_E}{(R_E + h)^2} - \frac{v_{\text{horiz}}^2}{R_E + h}$$
5. **Multi-Stage Mass Depletion**:
   - **Stage 0 (Liftoff)**: Twin 5-segment SRBs ($2 \times 16.0\text{ MN}$) + 4 RS-25 hydrolox engines ($4 \times 1.86\text{ MN}$ SL / $4 \times 2.28\text{ MN}$ Vac). Total liftoff thrust $\approx 39.1\text{ MN}$, mass $\approx 2,608,000\text{ kg}$.
   - **Stage 1 (Post-SRB Separation @ 45 km)**: Core Stage hydrolox burns until 110 km altitude.
   - **Stage 2 (ICPS Insertion @ 110–165 km)**: RL10B-2 engine ($110\text{ kN}$, $I_{sp} = 462\text{ s}$) performs orbital circularization at 165 km LEO ($v_{\text{orbit}} \approx 7,805\text{ m/s}$).

#### B. Powered Descent & Lunar/Martian Touchdown
Simulates a 6-DOF descent vehicle under lunar gravity ($g_{\text{moon}} = 1.625\text{ m/s}^2$) or Martian gravity ($g_{\text{mars}} = 3.721\text{ m/s}^2$):
- **Throttle Dynamics**: Variable pintle engine ($10\%\text{--}100\%$) with inertia lag.
- **Guidance Modes**:
  1. *MANUAL*: Direct astronaut attitude and throttle control.
  2. *RATE ASSIST*: Automatically damps horizontal drift velocity ($\vec{v}_{xz} \to 0$) and caps vertical sink rate proportional to radar altitude ($v_y \le -0.1 \cdot \text{alt}$).
  3. *AUTOLAND*: Predictive Apollo E-Guidance / Mars G-FOLD algorithm solving optimal quadratic deceleration trajectories onto the selected landing pad.
- **Touchdown Criteria**:
  - *Perfect Touchdown*: Touchdown speed $\le 1.8\text{ m/s}$, vehicle tilt $\le 6^\circ$.
  - *Hard Landing*: Touchdown speed between $1.8\text{ m/s}$ and $3.5\text{ m/s}$, tilt $\le 15^\circ$.
  - *Structural Crash*: Speed $> 3.5\text{ m/s}$ or tilt $> 15^\circ$.

#### C. Surface Rover Mechanics & Auto-Drive (`src/game/marsQueue.ts`)
- **4 Drive Modes**:
  - `DRIVE`: Standard Ackerman-like 4-wheel kinematics.
  - `CRAB`: Lateral $45^\circ$ omnidirectional translation to avoid boulders.
  - `SPIN`: Zero-radius point turn for tight crater corridors.
  - `WALKER`: High-clearance rocker-bogie stepping over rocks up to $0.4\text{ m}$ high.
- **Terrain Height Generator (`getSurfaceTerrainHeight`)**:
  - Analytical multi-frequency sinusoidal synthesis with blended crater basins.
  - *Moon South Pole*: Shackleton Cold Trap crater ($-5.2\text{ m}$ depth), Cabeus basin, Malapert ridge ($+6.2\text{ m}$ elevation), Nobile bench.
  - *Mars Jezero*: Sedimentary river delta terraces ($+4.4\text{ m}$), dry paleolake river channel ($-2.4\text{ m}$), Máaz basalt ridge ($+6.4\text{ m}$), and outer crater rim wall ($+22\text{ m}$).
- **Autonomous Navigation Engine**:
  - Calculates Euclidean distance to target objectives.
  - Snaps waypoints to objective sites within $6.8\text{ m}$.
  - Detects obstacles and executes real-time avoidance path offsets.
  - Monitors progression; if velocity stalls for $>2.0\text{ s}$, activates automatic reverse escape maneuver.

---

### 4.2 NASA Open Data Integration (`server.ts`)

```
+---------------------------------------------------------------------------------+
|                                 NASA DATA FLOW                                  |
|                                                                                 |
|   NASA DONKI API                                                                |
|   (api.nasa.gov)  --->  /api/donki (6-hr RAM Cache)  ---> Cislunar Radiation    |
|   - Solar Flares                                          Belt Expansion &      |
|   - CMEs & Geomagnetic Storms                             Proton Drain Rate     |
|                                                                                 |
|   NASA OSDR                                                                     |
|   (osdr.nasa.gov) --->  /api/osdr (6-hr RAM Cache)   ---> Active Gameplay Rules:|
|   - OSD-569: MARE Water-Wall Vest                         -48% SPE Proton Dose  |
|   - OSD-612: BioSentinel DNA Damage                       120 mSv Dose Limit    |
|   - OSD-489: Regolith Berm Shielding                      -62% Radiation Scatter|
|   - OSD-366: Mars MSL-RAD Dust Attenuation                -35% Solar Power Drop |
|                                                                                 |
|   NASA JPL Horizons                                                             |
|   (ssd.jpl.nasa.gov)->  /api/jpl-horizons (12-hr Cache)-> Exact Planetary State |
|   - J2000 ICRF Cartesian Vectors                          Vectors in Solar View |
+---------------------------------------------------------------------------------+
```

1. **NASA DONKI Space Weather API**:
   - Queries real-time solar events from the previous 30 days.
   - Detects active M-class or X-class solar flares and Coronal Mass Ejections (CMEs).
   - In-game effect: Dynamically expands dangerous solar radiation zones in cislunar space ($32 \to 48\text{ scene units}$) and increases astronaut radiation dosage accumulation per second.
2. **NASA OSDR (Open Science Data Repository)**:
   - Connects actual peer-reviewed space radiobiology experiments to gameplay decisions:
     - `OSD-569`: Anthropomorphic phantom dosimetry showing water-wall shielding reduces organ dose by $48\%$.
     - `OSD-612`: BioSentinel deep-space yeast DNA repair thresholds ($120\text{ mSv}$).
     - `OSD-489`: Compacted lunar regolith simulant attenuating secondary neutron scatter by $62\%$.
     - `OSD-366`: Mars Curiosity MSL-RAD radiation and atmospheric dust storm solar power reduction ($-35\%$).
3. **NASA JPL Horizons API**:
   - Fetches live Cartesian state vectors $(\vec{r}, \vec{v})$ in the ICRF J2000 reference frame for the Sun, Earth, Moon, Mars, and major planets.
   - Converts kilometers to simulation units while providing an analytical Keplerian fallback if the NASA server times out.

---

### 4.3 Procedural 3D Graphics Engine (`src/three/`)

1. **Procedural Spacecraft & Facility Architecture (`models.ts`)**:
   - **SLS Block 1**: Extruded cylindrical core with cryo foam insulation rings, 4 gimbaled RS-25 engine nozzles with interior ceramic regeneratively-cooled throat geometries, twin 5-segment solid rocket booster casings with aft skirts and canted nose cones, Orion Crew Module with hatch window, European Service Module (ESM) with folded solar arrays, and a 4-nozzle Launch Abort System (LAS).
   - **Launch Complex 39B & ML-1**: 120-meter mobile launcher steel lattice structure, Crew Access Arm (CAA) with White Room, propellant feed lines, swing umbilicals, flame trench blast deflector, and 3 surrounding catenary lightning towers.
   - **Lunar / Martian Lander**: Octagonal core, gold Kapton multi-layer insulation (MLI), 4 articulating landing legs with Apollo-style contact probe wires that retract on ground contact, 4-quadrant RCS thruster clusters, and descent engine bell.
   - **VIPER Rover**: 4 independent steering knuckles, chevron tread wheels, stereo navigation hazard cameras, high-gain mast antenna with LED beacon, TRIDENT rotary drill assembly, and belly-mounted neutron spectrometer.
2. **Custom Atmospheric GLSL Shader (`SpaceSceneManager.ts`)**:
   - Custom `ShaderMaterial` implementing Rayleigh scattering (blue sky atmospheric haze) and Mie scattering (forward sun glare):
   - Computes Fresnel rim lighting against view angle $\cos \theta = \vec{n} \cdot \vec{v}$ to generate atmospheric glow around the planetary limb.
3. **Dynamic Particle Systems**:
   - Dual-emitter particle engines:
     - RS-25 hydrolox clean exhaust (translucent cyan-white Mach diamond shock discs).
     - SRB solid fuel exhaust (opaque orange flame transitioning into voluminous billowing grey smoke particles with turbulent curl noise).
     - Launch pad sound suppression deluge (high-velocity white water spray and condensing steam cloud).
     - Lunar regolith dust kicked outward by descent engine plumes and rover wheels.

---

### 4.4 Web Audio Procedural Sound Engine (`src/game/audio.ts`)

No audio media files (.mp3, .wav) are downloaded or stored. Everything is generated in real time using the browser's `AudioContext`:
- **Rocket Thrust Roar**: White and pink noise generators fed into an automated low-pass `BiquadFilterNode` with resonance ($Q = 2.4$), modulated by engine throttle.
- **RCS Thruster Puffs**: High-frequency bandpass noise bursts with rapid exponential amplitude decay ($60\text{ ms}$).
- **Quindar Tones**: Dual pure sine wave beeps (intro tone: $2,525\text{ Hz}$ for $250\text{ ms}$; outro tone: $2,475\text{ Hz}$ for $250\text{ ms}$) recreating Apollo/Artemis mission control communications.
- **Geiger Counter**: Poisson-distributed random click pulses whose trigger frequency is directly proportional to live radiation dosage rates from NASA DONKI and OSDR.
- **Space Ambience**: Detuned dual-sine oscillators ($55\text{ Hz}$ and $55.4\text{ Hz}$) producing a subtle deep-space binaural drone.

---

## 5. PERSISTENT CAMPAIGN STATE & DATA FLOW

The simulation maintains cross-mission continuity through `CampaignCarryoverState`:

```typescript
export interface CampaignCarryoverState {
  activeMission: CampaignMissionId;         // 'artemis-2' | 'artemis-3' | 'artemis-4' | 'mars-pathfinder'
  completedMissions: CampaignMissionId[];   // Successfully finished stages
  relaySatelliteOnline: boolean;            // Deployed in Artemis II -> enables high-res surface telemetry
  highResMapUnlocked: boolean;              // Unlocks topographic contour overlays
  isruWaterKg: number;                      // Mined by VIPER on Moon -> converted to LH2 rocket fuel
  isruFuelBonusPct: number;                 // Added fuel margin for Artemis IV and Mars descent
  solarGridKw: number;                      // Deployed solar capacity at Malapert Ridge
  regolithShieldLevel: number;              // Sintered regolith berm level (OSD-489)
  radiationDoseMsv: number;                 // Cumulative astronaut biological dosage
  marsSamplesCached: number;                // Sealed geological core tubes cached in Jezero
  unlockedFieldNotes: string[];             // Science discoveries recorded in Field Notebook
  solvedAnomalies: string[];                // Resolved engineering dilemmas
}
```

### The 4 Campaign Missions:
1. **Artemis II (`artemis-2`)**:
   - Goal: Launch SLS Block 1 from LC-39B, execute staging, navigate cislunar space, deploy HERMES Relay Satellite in lunar orbit.
   - Carryover: Deploys the communications relay, unlocking high-resolution mapping and +60s solar flare warnings.
2. **Artemis III (`artemis-3`)**:
   - Goal: Powered descent to the Lunar South Pole (Shackleton / Malapert), explore terrain with VIPER, drill water ice with TRIDENT.
   - Carryover: Generates ISRU water and hydrogen fuel, builds Malapert solar grid, constructs regolith radiation berm.
3. **Artemis IV (`artemis-4`)**:
   - Goal: Navigate to Lunar Gateway in Near-Rectilinear Halo Orbit (NRHO), dock, transfer cryogenic propellants, survive solar storms.
   - Carryover: Upgrades interplanetary shielding and transfers fuel reserves into the Mars exploration fleet.
4. **Mars Pathfinder (`mars-pathfinder`)**:
   - Goal: Atmospheric entry and terminal landing in Jezero Crater ($0.38g$), drill ancient river delta deposits, operate MOXIE CO₂ oxygen production, cache return samples.
   - Outcome: Culmination of the Moon-to-Mars campaign with cumulative biological radiation audit.

---

## 6. COMPLETE STATE & COMPONENT HIERARCHY

```
<App> (Central Orchestrator, Input State, Loop, Audio Synth Bridge)
 ├── <canvas> (Managed by SpaceSceneManager Three.js Engine)
 ├── <TitleOverlay> (Cinematic Main Menu & Mode Selector)
 ├── <BriefingOverlay> (Mission Objective, Payload Customizer, Tradeoff Rules)
 ├── <VehicleInspectorOverlay> (3D CAD Lab, Exploded View Slider, Quiz Mode)
 ├── <LaunchHUD> (SLS Cockpit, 14 Flight Phases, Staging Triggers, Time Warp)
 ├── <SpaceFlightHUD> (Interplanetary Nav, Kepler Trajectories, Solar Weather)
 ├── <LandingHUD> (Descent Computer, Throttle Pintle, TWR, Autoland, Radar)
 ├── <RoverHUD> (VIPER Dashboard, 4 Drive Modes, Auto-Drive, Obstacle Avoid)
 ├── <DrillingModal> (TRIDENT Core Drill, Stratum Hardness, Thermal Limits)
 ├── <OutpostConsoleModal> (Base Camp Hab, Airlock Cycling, Solar vs Nuclear)
 ├── <FieldNotebookModal> (Scientific Logs, OSDR Studies, DONKI Reports)
 ├── <NasaDataModal> (Live NASA DONKI, OSDR, JPL Horizons API Telemetry)
 ├── <GameMenuModal> (Settings, Maps, Achievements, Volume Sliders)
 ├── <WorldTargetPins> (Screen-space projected 2D overlays on 3D targets)
 ├── <CenteredEventCard> (Milestone alerts, Staging notices, Apollo 1202)
 ├── <CalmFactToast> (Educational micro-learning toasts)
 └── <MobileAcademyView> (Responsive Non-WebGL view for screens < 1024px)
```

---

## 7. IDENTIFIED TECHNICAL STRENGTHS & PRODUCTION QUALITY

1. **Extreme Engineering Realism**: The math governing rocket ascent, orbital mechanics, planetary descent, and radiobiology is based directly on published NASA Technical Reports and SI units, not arbitrary game timers.
2. **Resilient Data Architecture**: All NASA API endpoints on the Express server feature a multi-tiered failover strategy:
   - High-speed in-memory cache (6 to 12 hours) to avoid hitting NASA API rate limits.
   - Network timeout guards (`AbortSignal.timeout(3500)`).
   - High-fidelity offline reference fallbacks (curated OSDR studies and analytical Keplerian planetary ephemerides) ensuring 100% uptime even without an internet connection.
3. **Clean Code Separation**: Physics calculations and business logic in `src/game/` are strictly decoupled from Three.js rendering code in `src/three/` and React UI code in `src/components/`.
4. **Zero-Asset Footprint**: Because all models, audio, and textures are generated procedurally in code, the initial client download bundle is extremely lean and fast to load.

---

## 8. ROADMAP & EXPANSION BLUEPRINT (FOR FUTURE LLM PROMPTING)

When delegating future development tasks to Claude or other frontier models, use the following prioritized blueprint:

| Target Area | Proposed Feature | Technical Scope |
| :--- | :--- | :--- |
| **Launch Phase** | Mobile Launcher Arm Demount Animation | Add physical retraction kinematics for the Crew Access Arm (CAA) and ground umbilical lines during countdown T-10s. |
| **Space Flight** | Continuous Runge-Kutta 4th Order Propagator | Implement RK4 n-body gravity integration to allow real-time gravitational slingshots past the Moon and Earth. |
| **Surface Ops** | Dynamic Rover Wheel Tracks | Add a Three.js instanced mesh or dynamic canvas displacement trail behind rover wheels on lunar/martian dust. |
| **Outpost Sim** | Resource Loop Automation | Implement a visual closed-loop diagram showing $H_2O \to O_2 + H_2$ electrolysis, Sabatier reactor methane production, and food biomass loops. |
| **VR Support** | WebXR Stereoscopic Cockpit Mode | Integrate Three.js `WebXRManager` to enable immersive VR headset viewing inside the Orion capsule and Lunar Lander cockpit. |
| **Multiplayer / Lab** | Real-Time CAPCOM Multiplayer Role | Enable WebRTC or WebSocket connections allowing a second player on a laptop or tablet to act as Mission Control (Flight Director) while the astronaut flies. |

---

## 9. INSTRUCTIONS FOR PROMPTING CLAUDE

When copying this document into Claude for prompt engineering or coding tasks:

> **Recommended Claude System Prompt / Context Injection**:
> *"You are the Lead Systems Architect and Principal Graphics Engineer for Artemis Odyssey, an authentic NASA-inspired 3D mission simulator built with React 19, TypeScript, Three.js (r187), Tailwind CSS v4, and Express. Review the attached `PROJECT_ARCHITECTURE_REPORT.md` thoroughly. All physics formulas must respect true SI units, all 3D models must adhere to procedural Three.js standards, and all UI modifications must maintain the aerospace aesthetic (anti-slop principles: SVG vector icons, zero emojis as buttons, 8-pt spatial grid, responsive states). Maintain the 4-phase campaign carryover and NASA DONKI/OSDR data integrations."*

---
*Report compiled and verified against the Artemis Odyssey codebase repository.*
