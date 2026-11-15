# ARTEMIS ODYSSEY: PHASE 1 COMPREHENSIVE REPOSITORY AUDIT
**Document Type:** Total Systems, Game-Feel, Science, and Technical Audit  
**Date of Audit:** 2026-11-15  
**Codebase Version Audited:** Commit `1ced144` (`main` branch)  
**Auditor:** Principal Game Designer, Systems Architect & Lead Technical Artist  

---

## EXECUTIVE AUDIT SUMMARY

Artemis Odyssey was developed under intense hackathon pressure with AI code generation. Beneath an impressive-sounding hackathon report lies a fractured experience:
- It is currently an **unplayable hybrid**: half interactive 3D physics tech-demo, half academic textbook.
- **HUD panels occupy up to 70% of screen real-estate**, bombarding players with graduate-level aerospace propulsion variables (`ṁ`, `Isp`, `q`, `TWR`, negative periapsis `-6364 km`) while masquerading as a "Junior Astronaut Mission Trainer for ages 8–14".
- **Zero actual game loop**: players are dropped into free-falling landers or 14-stage launch check routines without onboarding, progression, or tutorial feedback. Crashes display bogus telemetry (`0.0 m/s impact` on crash).
- **All 3D models are crude, hand-assembled procedural primitives** (cylinders, boxes, cones) rated on average 2.4/5 in visual fidelity.
- **The NASA "live data" integration is partially cosmetic theater**: OSDR queries return random biology papers whose titles are forcefully paired with hardcoded radiation-vest strings.

---

## 1. REALITY CHECK: CLAIMS VS. CODE

The table below contrasts every major claim in `PROJECT_ARCHITECTURE_REPORT.md` and `README.md` with empirical inspection of the actual source code.

| Architecture Claim | Code Implementation Reality | Status | Evidence / File Reference |
| :--- | :--- | :--- | :--- |
| **"TypeScript 7.0 & Vite 8 build smoothly"** | `typescript@7.0.2` and `vite@8.3.8` exist, but `package.json` contains conflicting `"esbuild": "^0.25.0"` while Vite 8 requires `esbuild@^0.27.0 \|\| ^0.28.0`. Default `npm install` **crashes with ERESOLVE**. Requires `--legacy-peer-deps`. `bun.lock` exists but Bun is not installed. | **PARTIAL / BROKEN SETUP** | `package.json`, `bun.lock`, npm ERESOLVE error |
| **"120 Hz Deterministic Physics Sub-stepping"** | `FIXED_LAUNCH_DT = 1 / 120` exists inside `stepLaunchPhysics`, but the main requestAnimationFrame loop passes variable browser `dt` without an accumulator in `SpaceSceneManager.ts`. In headless / non-focused browser tabs, RAF completely freezes. | **PARTIAL** | `src/game/physics.ts:264`, `src/three/SpaceSceneManager.ts:1009` |
| **"Zero External Heavy Assets, 100% Procedural"** | 4,373 lines of procedural Three.js geometry in `models.ts`. However, 4 raster images were added in `public/assets/planets/` (earth, mars, moon, clouds ~1.6 MB) and 3 large hero images in `src/assets/images/` (~2.4 MB) creating a bloated bundle. | **WORKS (Crude quality)** | `src/three/models.ts`, `public/assets/planets/` |
| **"Live NASA DONKI Space Weather Integration"** | Queries `api.nasa.gov/DONKI/FLR` with `DEMO_KEY`. When rate-limited (frequently), silently falls back to hardcoded archived M2.4 flare. In-game effect is minimal: expands an invisible collision circle and multiplies radiation accumulator. Player sees no flare or CME visuals. | **PARTIAL / COSMETIC** | `server.ts:126-209`, `src/game/physics.ts:1082` |
| **"Live NASA OSDR Biological Data Integration"** | Queries OSDR REST search API for "radiation shielding". When it returns real study titles (e.g. mouse colon microbiota OSD-72), `server.ts` **overrides `keyFinding` and `gameplayRule` with hardcoded strings** from `CURATED_OSDR_STUDIES`. Real OSDR data is not actually parsed or applied. | **FAKE / COSMETIC THEATER** | `server.ts:305-359` |
| **"Live NASA JPL Horizons Ephemeris Integration"** | Endpoint `/api/jpl-horizons` fetches Horizons CSV vectors. However, in gameplay (`solarSystemData.ts`), orbits in "Explore" mode are artificially compressed and non-linearly warped to fit the screen. Real vectors only serve decorative background placement. | **PARTIAL** | `server.ts:232-302`, `src/game/solarSystemData.ts` |
| **"Web Audio API Procedural Synthesizer"** | Pure procedural Web Audio synth works (`soundSynth` in `audio.ts`), generating noise, resonant filters, Quindar tones, and Geiger clicks without media files. However, audio auto-play is blocked until the player clicks an unobtrusive "ENABLE AUDIO" button; silent by default. | **WORKS** | `src/game/audio.ts` |
| **"1:1 Apollo LMDE & SLS Rocket Dynamics"** | SLS mass flow and TWR formulas are accurate, but the lander is a bizarre hybrid: LMDE 46.7 kN thrust (Apollo era) mixed with "Quad-MLE 112 kN" (invented) for Mars. Lander spawns at 84m altitude falling at 16.5 m/s with 0% throttle, crashing in 4 seconds. | **BROKEN GAMEPLAY** | `src/game/physics.ts:1205-1230` |
| **"VIPER Autonomous Rocker-Bogie Kinematics"** | `marsQueue.ts` implements A* waypoint routing, collision offsets, and reverse escape maneuvers (1,283 lines). But rover moves at up to 13.2 m/s (47.5 km/h) — 100x faster than real VIPER (0.1 m/s). Terrain conforming is purely mathematical, not physical wheel-raycast suspension. | **PARTIAL** | `src/game/marsQueue.ts`, `src/game/physics.ts:59` |
| **"Responsive Mobile Academy Mode"** | `MobileAcademyView.tsx` (450 lines) locks out 3D WebGL under 1024px screen width. Instead of responsive gameplay, it is a text/card browser duplicating information from modals. | **DEAD-END / SEPARATE APP** | `src/components/MobileAcademyView.tsx` |

---

## 2. RUNTIME, BUILD & FLOW WALKTHROUGH

### 2.1 Build & Static Check Audit
- **Dependency Resolution (`npm install`)**:
  - `npm install` **FAILS** with code `ERESOLVE` due to `vite@8.3.8` peer-dependency conflict with root `esbuild@^0.25.0`.
  - Fix required: install with `--legacy-peer-deps` or upgrade `esbuild` to `^0.28.0`.
- **Static Type Check (`npm run lint` / `tsc --noEmit`)**:
  - **PASSES** cleanly with 0 type errors.
- **Production Build (`npm run build` / `vite build`)**:
  - **PASSES**, but outputs a severe chunk warning:
    `dist/assets/index-TQ4FkDYx.js: 1,545.55 kB (raw) / 417.92 kB (gzip)`.
    The entire application is bundled into a single monolithic bundle exceeding Vite's 500 kB threshold.
- **Automated Test Suite**:
  - No `test` script in `package.json`.
  - Running test files directly via `npx tsx --test src/game/*.test.ts`:
    - 7 test files, **51 unit tests PASS** (608 ms duration).
    - Tests only exercise pure functions in `src/game/`. There are **0 tests** for Three.js rendering, UI component interactions, or `server.ts` endpoints.

### 2.2 End-to-End Walkthrough Diagnoses

```
[Title Screen] ──> [Briefing] ──> [Launch Pad] ──> [Atmospheric Ascent] ──> [LEO Orbit / TLI]
      │                                                                           │
      │                                                                           v
[Outpost Console] <── [Drilling Modal] <── [VIPER Rover] <── [Powered Descent] <── [Cislunar Space]
```

1. **Title Screen (`TitleOverlay.tsx`)**:
   - Visual impression: Overloaded. Top navigation bar has 6 buttons; bottom bar has 4; right has mission overview; center has 4 mission cards; background has procedural Earth/Moon.
   - Confusion: Clicking "Missions" opens a modal that looks almost identical to the Title screen's center cards. "EXPLORE" vs "BRIEF & LAUNCH" triggers different, non-obvious flows.
2. **Mission Briefing (`BriefingOverlay.tsx`)**:
   - Shows payload options (MARE Water-Wall, Extended O2, etc.).
   - Player has no baseline knowledge of what "+40% Mass Heavy hull" will feel like. The tradeoff hint ("brake earlier") is vague.
3. **Launch Pad (`LaunchHUD.tsx`)**:
   - Player is forced to click 4 procedural checklist buttons ("Internal Power", "Cryo Chilldown", "Deluge", "Crew Access Arm") before the "Verify & Start" button unlocks. This is busywork, not gameplay.
   - After clicking "Verify & Start", countdown T-3 counts down. At T-0, it does NOT launch; it shows "STAGE 3/14 · RS-25 ENGINE IGNITION - Hold W or Space".
4. **Atmospheric Ascent (`LaunchHUD.tsx`)**:
   - Holding W accelerates the rocket. Rocket ascends to Max-Q in ~18 seconds.
   - The HUD displays 14 flight phases, but the player has nothing to do except watch numbers change and press Space at 45 km (SRB sep) and 110 km (Core sep).
   - Telemetry displays confusing data: `ṁ 14074 kg/s`, `Isp 300s`, `q 32 kPa`, `Apo/Peri 30/-6364 km`. Showing a raw negative periapsis of `-6364 km` inside the Earth induces cognitive dissonance.
5. **LEO Orbit & TLI Burn (`SpaceFlightHUD.tsx`)**:
   - Reaches 165 km parking orbit. Player clicks "Fire TLI Burn", which executes an instant progress bar burn.
   - Transition to deep space drops the player into a top-down solar system plane where orbits are warped and scale feels completely arbitrary.
6. **Lunar Powered Descent (`LandingHUD.tsx`)**:
   - **CRITICAL GAMEPLAY FAILURE**: Lander spawns at 84m altitude, falling at -16.5 m/s with 0% throttle.
   - An "Apollo 1202 Alarm" modal immediately pops up in the dead center of the screen, intercepting pointer clicks and obscuring landing telemetry.
   - Before the player can read the modal or find the throttle key, the lander impacts the surface in ~4.5 seconds.
   - The crash screen (`OutcomeModal.tsx`) displays:
     `IMPACT SINK RATE: 0.0 m/s (MAX 4.8)`
     `TOUCHDOWN TILT: 0.0° (MAX 24°)`
     Reporting 0.0 m/s and 0.0° tilt on a catastrophic crash completely breaks immersion.
7. **Surface Rover & Outpost (`RoverHUD.tsx`, `OutpostConsoleModal.tsx`, `DrillingModal.tsx`)**:
   - Rover driving feels weightless: rover skates at 47 km/h across lunar craters without physical wheel suspension.
   - Clicking an objective opens `DrillingModal.tsx` — a minigame with 3 buttons ("GENTLE", "NOMINAL", "HIGH_TORQUE") where the player clicks "COOL" when the temperature bar turns red.
   - Outpost console is an isolated modal with static room images and an airlock depressurization button that has zero influence on the rover.

---

## 3. BLOAT AND CLUTTER AUDIT

The following table categorizes every screen, HUD widget, and modal. Verdicts are strictly assigned: **KEEP**, **MERGE**, **SIMPLIFY**, or **CUT**.

| Component / Feature | Current State & Bloat Factor | Verdict | Actionable Rationale |
| :--- | :--- | :--- | :--- |
| `TitleOverlay.tsx` | Overcrowded landing page with competing CTAs and duplicated mission cards. | **SIMPLIFY** | Convert into clean cinematic title screen with unified "Launch Mission" entry point. |
| `BriefingOverlay.tsx` | Text-heavy card layout with technical jargon and vague payload modifiers. | **SIMPLIFY** | Focus on mission goal, 2 clear equipment choices, and visible carryover effects. |
| `VehicleInspectorOverlay.tsx` | 3D inspection lab with exploded view slider, quiz mode, and sub-engine gimbals. | **MERGE** | Merge educational part inspection into pre-flight briefing as an interactive 3D preview. |
| `LaunchHUD.tsx` | 14 flight phases, 4 pad checklist buttons, 12 simultaneous telemetry gauges. | **SIMPLIFY** | Remove artificial pre-pad checkboxes; reduce HUD to altitude, velocity, throttle, and staging prompt. |
| `SpaceFlightHUD.tsx` | 10 planet selector buttons, compressed orbit warp, cluttered radar. | **SIMPLIFY** | Streamline cislunar trajectory view; remove irrelevant outer planets (Pluto, Neptune) from Artemis missions. |
| `LandingHUD.tsx` | Cluttered gauges, central Apollo 1202 alarm modal blocking flight path, confusing TWR bar. | **SIMPLIFY** | Center flight vector reticle, move alarms to non-blocking HUD ribbon, auto-hover on start. |
| `RoverHUD.tsx` | 4 drive modes, radar, speedometer, obstacle lists, queue commands, and target pins. | **SIMPLIFY** | Keep standard Drive + Crab; simplify Auto-Drive into 1-click waypoint nav; clean up gauges. |
| `DrillingModal.tsx` | Separate pop-up minigame with stratum layers, torque, jamming, and cooling pulses. | **SIMPLIFY** | Integrate coring drill directly into the 3D HUD without popping up a blocking 2D modal. |
| `OutpostConsoleModal.tsx` | Airlock pressure cycling and static 2D room selector (quarters, greenhouse, lab). | **CUT** | Completely disconnected from 3D world; adds zero spaceflight simulation value. |
| `GameMenuModal.tsx` | 7-tab behemoth duplicating map, outpost, ledger, achievements, NASA, glossary, settings. | **MERGE** | Consolidate into standard lightweight pause menu (Settings, Controls, Audio, Abort). |
| `NasaDataModal.tsx` | Displays raw JSON-like DONKI and OSDR telemetry; redundant with GameMenuModal. | **CUT** | Remove standalone modal; weave NASA data effects contextually into briefing and flight HUDs. |
| `FieldNotebookModal.tsx` | Academic card list of unlocked science discoveries; redundant with GameMenu. | **MERGE** | Display discoveries in the post-mission debrief screen. |
| `LearnObjectModal.tsx` | Large modal appearing when rover reaches an objective, interrupting driving. | **SIMPLIFY** | Convert into non-blocking radio transmission / CAPCOM voiceover box. |
| `CenteredEventCard.tsx` | Modal popping up dead-center during critical flight events (Apollo 1202, staging). | **SIMPLIFY** | Replace modal with non-modal HUD alert banner at top of screen. |
| `CalmFactToast.tsx` | Random trivia popups appearing during gameplay. | **CUT** | Distracting; replaces game immersion with passive reading. |
| `MobileAcademyView.tsx` | 450-line alternative non-3D app branch locking out mobile users. | **SIMPLIFY** | Replace with clean responsive splash: "Desktop WebGL Recommended (1024px+)" with lightweight viewer. |
| `AudioQualityPopover.tsx` | Floating volume popup. | **MERGE** | Move volume sliders into standard Settings menu. |
| `RoverSpeedometer.tsx` | Separate speedometer widget. | **MERGE** | Absorb directly into unified Rover HUD. |
| `SurfaceMapPanel.tsx` | Secondary mini-map. | **MERGE** | Combine with rover compass radar. |
| `NASAInsignia.tsx` | Decorative logo. | **KEEP** | Retain for official aesthetic. |

---

## 4. GAME-FEEL DIAGNOSIS

1. **Onboarding & The "What Do I Do Now?" Problem**:
   - There is zero tutorial or guidance. When a mission begins, the player is presented with a wall of technical readouts and no primary objective callout.
   - Flight controls are indicated in tiny secondary labels (`A/D Tilt`, `W/Z Throttle`, `G Auto-Land`).
2. **Missing Feedback Loops & Physicality**:
   - In launch, holding W increases a speed number, but the camera exhibits minimal shake, no atmospheric heating effects, and no auditory sense of sound barrier transition (transonic boom).
   - In landing, thruster firings have zero tactile recoil; the lander handles like a point mass in vacuum with no inertia dampening.
   - In rover driving, the vehicle does not tilt or bounce over bumps realistically. Wheels spin on terrain without leaving tracks or kicking physical dust particles.
3. **Pacing & Dead Time**:
   - Launch ascent takes ~18.5 seconds under an aggressive artificial time warp (24x–42x). The player has no real steering agency because gravity turn is handled largely by automatic guidance.
   - Conversely, space transit is slow and aimless, requiring manual steering across hundreds of abstract coordinate units.
4. **Punishing & Uninformative Failure**:
   - When the lander crashes, the game instantly cuts to a black/red abort card. There is no crash camera, no debris physics replay, and the readout claims `0.0 m/s impact`.
   - The player learns nothing from the failure other than frustration.
5. **Audience Identity Crisis**:
   - The interface cannot decide if it is for an 8-year-old child ("Junior Astronaut Mission Trainer", cartoonish "Did You Know?" popups) or a graduate aerospace engineer (`ṁ = 14,074 kg/s`, `Isp = 300s`, `q = 32 kPa`, `Vis-Viva Vis-A-Vis`).
   - Neither audience is served: kids are overwhelmed and confused; adults are annoyed by childish trivia cards.

---

## 5. VISUAL & 3D ASSET AUDIT

### 5.1 Procedural Models in `src/three/models.ts`

| Model Name | Construction Technique | Fidelity (1–5) | Recognisability Against Real NASA Hardware | Visual Deficiencies & Cheap Elements |
| :--- | :--- | :---: | :--- | :--- |
| **SLS Block 1 & LC-39B** | Cylinder core stage, cone nosecones, box lattice tower. | **2.5 / 5** | Moderate. Orange core and twin white SRBs are recognizable from distance. | Lattice tower looks like a wireframe cage; zero panel lines or umbilical swing arms; RS-25 engines are plain grey cones with zero piping. |
| **Lunar Lander** | Octagonal gold foil cylinder with 4 thin stick legs. | **2.0 / 5** | Poor. Resembles a crude Apollo LEM toy. | Does not resemble SpaceX Starship HLS or Blue Moon; landing legs have no hydraulic struts or footpads; ladder is a box strip. |
| **VIPER Rover** | Rectangular chassis box with 4 cylinder wheels and mast. | **2.5 / 5** | Fair. General boxy silhouette is recognizable. | Wheels are smooth cylinders without treads; suspension has no rocker-bogie differential joints; instruments are colored boxes. |
| **HERMES Satellite** | Octagonal prism with 2 flat blue planes for solar wings. | **2.5 / 5** | Fair. Standard generic satellite look. | Solar panels are flat 2D planes without cell tiling; communication dish is a primitive low-poly paraboloid. |
| **JWST** | 5 diamond planes for sunshield, 18 gold hexagonal mirrors. | **3.0 / 5** | Good. Iconic gold hexagonal mirror array is clear. | Sunshield layers have zero billowing or tension cables; secondary mirror support struts are thin untextured lines. |
| **Voyager Probe** | White dish cone, 10-sided cylinder bus, box truss booms. | **2.5 / 5** | Moderate. High-gain dish gives away identity. | RTG nuclear power generator looks like a ribbed tin can; magnetometer boom lacks delicate truss detail. |
| **Artemis Outpost Dome** | Half-sphere geometry with white standard material. | **2.0 / 5** | Poor. Generic sci-fi bubble. | No realistic airlock seals, docking collars, regolith sandbags, or solar tower linkages. |
| **Celestial Bodies** | Three.js spheres with canvas generated procedural maps. | **3.0 / 5** | Fair. Moon maria and Earth continents are recognizable. | Procedural canvas noise produces blurry terrain up close; lack of real elevation normal maps makes mountains flat. |

### 5.2 Shaders, Lighting & UI Design System
- **Atmospheric Shader (`SpaceSceneManager.ts:117-195`)**:
  - Custom vertex/fragment shader implementing Rayleigh scattering and Mie forward glare.
  - *Quality*: Looks decent at orbital distances, but exhibits harsh banding and clipping when the camera enters upper atmospheric altitudes (15–60 km).
- **Lighting Rigs**:
  - Single `DirectionalLight` simulating the Sun plus a weak ambient light.
  - *Deficiency*: Deep space shadows are 100% pitch black with zero Earthshine or Moonbounce, causing spacecraft to lose all definition on their unlit sides.
- **UI & Typography Consistency**:
  - Fonts: Inconsistent mixing of Tailwind system sans, `font-hud` (monospace), and uppercase tracking.
  - Colors: Over-reliance on electric cyan (`#22d3ee`) borders and glowing blue cards, creating visual monotony.
  - Spatial Grid: Good compliance with Tailwind 8-pt spacing, but padding is too compact (`p-2`, `p-3`), making buttons feel cramped.

---

## 6. TECHNICAL DEBT & ARCHITECTURAL HOTSPOTS

### 6.1 The Four "God Files"
1. **`src/App.tsx` (3,462 lines)**:
   - Houses state hooks for all 14 modals, flight physics, audio parameters, carryover variables, and keyboard listeners.
   - Re-renders frequently on telemetry changes, causing performance hiccups on lower-end devices.
2. **`src/three/SpaceSceneManager.ts` (3,616 lines)**:
   - Violates Single Responsibility Principle: handles scene graph, camera animation, lighting, post-processing, particle systems, 3D raycasting, and 2D label math.
3. **`src/three/models.ts` (4,373 lines)**:
   - Massive procedural CAD-in-code file. Impossible to maintain or visually inspect without running the entire application.
4. **`src/game/physics.ts` (1,822 lines)**:
   - Conflates launch dynamics, atmospheric models, orbital mechanics, powered descent, and terrain elevation into one monolithic module.

### 6.2 Performance & Memory Hotspots
- **Per-Frame Allocations**: `SpaceSceneManager.ts` creates new `THREE.Vector3` and `THREE.Matrix4` instances inside per-frame animation and label projection functions, triggering garbage collection stutter.
- **Draw Call Overhead**: In `models.ts`, individual lattice bars, struts, and bolts are separate `Mesh` objects rather than instanced or merged geometries, driving draw calls over 350 per frame.
- **Bundle Monolith**: 1.55 MB uncompressed JS chunk with zero route or asset code-splitting.

---

## 7. SCIENCE-ACCURACY AUDIT

| Parameter / Claim | In-Game Code Value | Real NASA Reference Value | Accuracy Verdict | Explanation & Fix |
| :--- | :--- | :--- | :---: | :--- |
| **SLS Liftoff Thrust** | $39,140\text{ kN}$ | $39,100\text{ kN}$ ($8.8\text{M lbf}$) | **ACCURATE** | Twin 5-segment SRBs ($31.7\text{ MN}$) + 4x RS-25 ($7.44\text{ MN}$). |
| **SLS Liftoff Mass** | $2,608,000\text{ kg}$ | $2,610,000\text{ kg}$ ($5.75\text{M lbs}$) | **ACCURATE** | Matches official NASA SLS Block 1 mission manifest. |
| **SLS Staging Altitudes** | SRB: $45\text{ km}$, LAS: $80\text{ km}$, Core: $110\text{ km}$ | SRB: $\sim 45\text{ km}$, LAS: $\sim 91\text{ km}$, Core: $\sim 150\text{ km}$ | **REASONABLE** | Minor altitude compression for pacing; scientifically sound. |
| **LEO Orbit Target** | $165\text{ km}$ circular ($7,805\text{ m/s}$) | $185\text{ km} \times 185\text{ km}$ ($7,790\text{ m/s}$) | **ACCURATE** | Close match to Artemis I insertion orbit. |
| **Lunar Gravity** | $1.622\text{ m/s}^2$ | $1.625\text{ m/s}^2$ | **ACCURATE** | Matches Moon South Pole gravitational data. |
| **Mars Gravity** | $3.721\text{ m/s}^2$ | $3.72076\text{ m/s}^2$ | **ACCURATE** | Exact match for Mars equatorial/Jezero surface. |
| **Lander Thrust & Engine** | LMDE $46.7\text{ kN}$ / Mars $112\text{ kN}$ Quad-MLE | Starship HLS: $2,200\text{ kN}$ Raptor; Blue Moon: $100\text{ kN}$ BE-7 | **INACCURATE / HISTORICAL MISMATCH** | Reuses 1969 Apollo LEM engine specifications for a 2026 Artemis lunar lander. |
| **Rover Top Speed** | $13.2\text{ m/s}$ ($47.5\text{ km/h}$) | VIPER: $0.1\text{ m/s}$ ($0.36\text{ km/h}$); Lunar Roving Vehicle: $3.3\text{ m/s}$ ($12\text{ km/h}$) | **GROSSLY INACCURATE** | Rover moves 100x faster than real autonomous science rovers to prevent player boredom, without explaining the time-scale distortion. |
| **Radiobiology Doses** | $120\text{--}210\text{ mSv}$ thresholds | Deep-space career limit: $\sim 600\text{ mSv}$; SPE event: $250\text{--}500\text{ mSv}$ | **REASONABLE** | Plausible radiation safety thresholds based on NASA space flight health standards. |
| **NASA DONKI Integration** | Expands radiation zone $32 \to 48$ units | Real DONKI tracks solar flux ($\text{W/m}^2$) and CME speed ($1,000+\text{ km/s}$) | **DECORATIVE SIMPLIFICATION** | Does not simulate actual proton flux arrival time or magnetic deflection. |
| **NASA OSDR Integration** | Mocked key findings attached to real study titles | OSDR hosts genomic, proteomic, and transcriptomic datasets | **DECORATIVE / MISREPRESENTED** | Fabricates direct engineering rules on top of unrelated academic biology titles. |

---

## TOP 10 CRITICAL PROBLEMS TO SOLVE IN THE REBUILD

1. **Monolithic God Files**: `App.tsx` (3,462 lines), `SpaceSceneManager.ts` (3,616 lines), `models.ts` (4,373 lines), and `physics.ts` (1,822 lines) make targeted development, testing, and debugging nearly impossible.
2. **Broken Build Setup**: Standard `npm install` fails due to an upstream `esbuild` vs `vite@8` peer-dependency conflict; Bun lockfile exists with no Bun runtime.
3. **Crude Procedural 3D Assets**: Spacecraft and lunar facilities are constructed from low-poly procedural boxes and cylinders (average fidelity rating 2.4/5), severely undermining visual immersion.
4. **Catastrophic Landing Flow**: Lander spawns falling at high speed (-16.5 m/s) with 0% throttle, while a blocking Apollo 1202 alarm modal obscures the screen, causing an unavoidable crash within 4.5 seconds.
5. **Bogus Crash Reporting**: Crashes report `0.0 m/s impact velocity` and `0.0° tilt`, breaking player trust in the physics simulation.
6. **Severe UI & Modal Clutter**: 14 distinct modals, overlapping telemetry bars, and pop-up event cards cover up to 70% of the 3D viewport, obscuring the simulation.
7. **Audience Identity Schizophrenia**: The app attempts to serve 8-year-old children with cartoonish popups while simultaneously displaying raw propulsion differential variables (`ṁ`, `Isp`, `q`, negative periapsis) suitable only for aerospace graduates.
8. **Cosmetic NASA Data Integration**: OSDR API queries return unrelated biology papers whose results are overridden by hardcoded strings; DONKI solar weather only alters an invisible math variable without visual representation.
9. **Lack of Core Game Loop & Onboarding**: Missions lack clear objective tutorials, progressive instrument disclosure, feedback loops, and meaningful difficulty curves.
10. **Single Monolithic 1.55 MB Bundle**: All models, shaders, components, and sounds are bundled into a single chunk without code splitting or lazy loading, leading to high initial load times and memory footprint.

---
*End of Phase 1 Audit Report. Next step: Phase 2 Redesign Plan (`docs/GAME_DESIGN.md` and `docs/REBUILD_PLAN.md`).*
