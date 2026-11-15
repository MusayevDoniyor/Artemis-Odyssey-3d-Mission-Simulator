# ARTEMIS ODYSSEY: SYSTEM REBUILD PLAN & ARCHITECTURE
**Document Version:** 2.1.0 · **Target Phase:** Post-Audit Rebuild  
**Execution Method:** Small, Independently Shippable Milestones  
**Architecture Baseline:** NASA Primary Sources as of November 2026 (`nasa.gov/artemis`)  

---

## 1. REVISED MILESTONE ROADMAP (With Characterization Tests & Refactoring)

```
[ M1: Tooling Baseline & Cut ] 
              │
              v
[ M1B: Characterization Tests & src/sim/ Decoupling ]
              │
              v
[ M2: Design System & Title / Briefing Flow ]
              │
              v
[ M3: Asset Pipeline & First NASA Hero Model (SLS/Orion) ]
              │
              v
[ M4: Artemis II Gold-Standard Vertical Slice (Launch to Flight) ]
              │
              v
[ M5: Visual, Audio & Camera Polish on Vertical Slice ]
              │
              v
[ M6: Artemis III (LEO Rendezvous & Docking) & Artemis IV (Landing) ]
              │
              v
[ M7: Concept Mars Expedition & Real NASA Data Replay ]
              │
              v
[ M8: Progression Carryover, Settings & Accessibility ]
              │
              v
[ M9: Performance Optimization (Code Splitting), Docs & Credits ]
```

---

## 2. DETAILED MILESTONE SPECIFICATIONS

### MILESTONE 1: Tooling Clean-up, Build Fix & Dead-Code Pruning
- **Goal**: Fix the `npm install` ERESOLVE conflict, establish a clean reproducible build, add a native test runner script, and delete verified dead-code / CUT components.
- **Actions**:
  1. Confirm `package-lock.json` is generated and tracked before deleting `bun.lock`.
  2. Update `package.json`:
     - Update `"esbuild": "^0.28.0"` to satisfy `vite@8` peer dependencies.
     - Add `"test": "node --import tsx --test \"src/game/*.test.ts\""`.
  3. Delete `bun.lock`.
  4. Safely delete CUT components:
     - `src/components/OutpostConsoleModal.tsx`
     - `src/components/NasaDataModal.tsx`
     - `src/components/CalmFactToast.tsx`
  5. Remove all import references and dead state in `src/App.tsx`.
  6. Verify `npm install` (without `--legacy-peer-deps`), `npm run lint` (`tsc --noEmit`), `npm run build`, and `npm test` all pass with 0 errors.
- **Commit Strategy**:
  - `chore(tooling): fix esbuild peer dep and add native test script`
  - `refactor(cleanup): remove bun.lock and cut dead modals (Outpost, NasaData, CalmFact)`

---

### MILESTONE 1B: Characterization Tests & Pure Simulation Decoupling (`src/sim/`)
- **Goal**: Pin down all current flight physics, staging, landing, and rover math with automated characterization tests, then safely decouple `src/game/physics.ts` into clean modular simulation files in `src/sim/`.
- **Actions**:
  1. Write automated characterization test suites in `src/game/physics.characterization.test.ts` capturing:
     - Exact launch trajectory coordinates, velocity, Mach number, dynamic pressure, and fuel consumption over a 1,000-step simulation.
     - Exact landing physics with hover throttle ($TWR = 1.0$), horizontal rate-assist damping, and touchdown criteria.
     - Exact rover suspension height conforming and terrain slope calculations.
  2. Create modular directories under `src/sim/`:
     - `src/sim/launch/` (SLS Block 1 ascent, staging, barometric drag, Max-Q)
     - `src/sim/landing/` (6-DOF lunar descent, hover physics, touchdown evaluation)
     - `src/sim/rover/` (VIPER kinematics, 5x time-compression, obstacle avoidance)
     - `src/sim/orbit/` (Keplerian orbits, Hohmann transfer, Vis-Viva equation)
     - `src/sim/stateMachine.ts` (Unified Mission State Machine replacing 14 modal useState hooks)
  3. Point test script to `"test": "node --import tsx --test \"src/sim/**/*.test.ts\""`.
  4. Verify all characterization tests pass identically before and after the move.

---

### MILESTONE 2: Design System Tokens & Title / Briefing Flow
- **Goal**: Implement the new design system (semantic colors, type scale, 8-pt grid, SVG icons) and build a clean Title, Briefing, and Pause menu.
- **Actions**:
  1. Create `src/ui/common/` design system primitives: `Panel`, `Button`, `ProgressBar`, `TelemetryValue`, `VectorIndicator`.
  2. Rebuild `TitleOverlay.tsx` into a high-contrast Mission Control launcher with one clear "START CAMPAIGN" button.
  3. Rebuild `BriefingOverlay.tsx` with explicit carryover badges and two clear equipment choices.
  4. Consolidate `GameMenuModal.tsx` into a clean Pause Menu (Resume, Settings, Controls, Abort).
- **Verification**: Open browser; verify Title screen renders at 1440px desktop and 390px mobile with zero horizontal overflow; verify clicking Briefing transitions smoothly.

---

### MILESTONE 3: Asset Pipeline & First NASA Hero Model (SLS/Orion)
- **Goal**: Establish the `GLTFLoader` pipeline and integrate the first real NASA model (SLS Block 1 + Orion) into the Launch Scene.
- **Actions**:
  1. Build `tools/optimize-assets.mjs` using `gltf-transform` to decimate, compress (Draco/Meshopt), and pack textures into WebP.
  2. Download and optimize official NASA SLS Block 1 and Orion models into `public/assets/models/sls-block1.glb`.
  3. Integrate `GLTFLoader` into `SpaceSceneManager.ts`, replacing procedural cylinder meshes for the hero rocket.
  4. Preserve node addressing for SRB and Core stage separation kinematics.
- **Verification**: Launch scene displays the detailed NASA SLS Block 1 rocket with accurate textures, booster nozzles, and Orion capsule.

---

### MILESTONE 4: Gold-Standard Vertical Slice — Artemis II Launch to Cislunar Flight
- **Goal**: Rebuild the Artemis II mission (flown April 2026) from T-0 liftoff through atmospheric ascent, Max-Q, stage separations, orbital circularization, and TLI burn as an exemplary, polished spaceflight experience.
- **Actions**:
  1. Refactor launch state machine into `src/sim/launch/launchSim.ts`.
  2. Replace artificial 4-button pad checkboxes with an authentic, physical countdown sequence.
  3. Implement the Progressive Disclosure `LaunchHUD.tsx`: clean altitude tape, throttle gauge, velocity vector, dynamic pressure ($q$) alert during Max-Q, and clear stage separation prompts.
  4. Add the 2-tier Cadet vs Engineer toggle.
  5. Build the post-flight Mission Debrief screen with real physics explanations and carryover reward unlock.
- **Verification**: Fly Artemis II from pad to 165 km orbit in browser; experience gravity turn and staging; verify debrief screen awards carryover state.

---

### MILESTONE 5: Visual, Audio & Camera Polish on Vertical Slice
- **Goal**: Bring lighting, particle effects, camera choreography, and sound synthesis up to professional simulator standards.
- **Actions**:
  1. Add realistic camera behaviors: dynamic launch vibration, smooth chase damping, cockpit view inside Orion, and free orbit mode.
  2. Upgrade particle systems: dual-layer SRB smoke volume with curl noise, translucent cyan RS-25 Mach diamonds, and launch pad water deluge steam.
  3. Refactor Web Audio synth: add sound barrier transonic muffled roar, Quindar beeps on CAPCOM transmissions, and responsive throttle pitch bending.
  4. Upgrade Earth atmospheric GLSL shader to eliminate altitude color banding.
- **Verification**: Launch rocket in browser; verify auditory and visual feedback during Max-Q and staging.

---

### MILESTONE 6: Artemis III (LEO Rendezvous & Docking) & Artemis IV (Landing & Rover)
- **Goal**: Rebuild Mission 2 (Artemis III LEO HLS rendezvous & docking) and Mission 3 (Artemis IV first human polar landing and VIPER surface rover).
- **Actions**:
  1. Implement Orion-HLS orbital rendezvous and docking alignment mechanic in 185 km LEO.
  2. Refactor landing physics: spawn lander at 450m altitude, $-2.5\text{ m/s}$ sink rate, pre-trimmed hover throttle ($TWR = 1.0$ at 45.2% throttle), horizontal drift zeroed.
  3. Move Apollo 1202 alarm to a non-blocking HUD ribbon.
  4. Build Flight Path Marker reticle showing predicted touchdown footprint and terrain slope.
  5. Build the Diagnostic Crash Replay: slow-motion 360-degree orbit camera, true impact velocity/angle readout, "What Happened & Why" debrief, and instant `[R]` retry.
  6. Calibrate VIPER Rover: realistic suspension physics, honest 5x time-compression indicator on speedometer, and integrated 3D coring drill without pop-up modals.
  7. Apply LRO LOLA elevation data for Shackleton Crater and Malapert Mountain.
- **Verification**: Dock Orion with HLS in LEO; pilot Lunar Lander onto Pad Alpha; test intentional hard crash and verify diagnostic telemetry; drive VIPER rover and drill water ice core.

---

### MILESTONE 7: Concept Mars Expedition & Real NASA Data Replay
- **Goal**: Build Mission 4 as a clearly labeled 2030s human Mars exploration concept, and wire NASA DONKI / OSDR as honest historical replays.
- **Actions**:
  1. Implement Mars 7-minute EDL sequence (atmospheric entry heating, supersonic parachute, terminal descent in Jezero Crater paleolake).
  2. Model Jezero ancient river delta using MGS MOLA elevation data.
  3. Wire NASA DONKI as historical event replays (e.g. May 2024 Solar Storm AR3664 Replay) generating visible solar proton wavefronts in Three.js and Geiger counter audio clicks.
  4. Wire NASA OSDR studies with real study titles and DOI links.
- **Verification**: Fly Mars entry and touchdown; collect geological core sample; trigger historical solar storm replay and verify radiation shielding mechanics.

---

### MILESTONE 8: Persistent Progression, Settings & Accessibility
- **Goal**: Finalize campaign carryover visibility, save game state in `localStorage`, and implement full accessibility controls.
- **Actions**:
  1. Build persistent Carryover Ribbon showing accumulated resources ($LH_2$ fuel, solar grid kW, radiation shielding) carried across missions.
  2. Add full keyboard and gamepad remapping in Settings.
  3. Implement high-contrast and color-blind safe telemetry modes.
  4. Add captions for all audio cues and Quindar communications.
- **Verification**: Complete Mission 1 $\to$ verify carryover fuel appears in Mission 2 briefing; reload browser $\to$ verify progress persists.

---

### MILESTONE 9: Performance Optimization (Code Splitting), Docs & Credits
- **Goal**: Optimize bundle size, verify 60 fps rendering, write automated campaign smoke tests, and publish complete credits.
- **Actions**:
  1. Implement route/mission code-splitting via `React.lazy()` to reduce initial bundle from 1.55 MB to < 350 kB.
  2. Eliminate per-frame memory allocations in Three.js animation loops.
  3. Add an automated end-to-end smoke test script (`npm run test:smoke`) that drives an autopilot through the entire campaign.
  4. Publish `docs/CREDITS.md` with complete NASA asset citations and licensing disclosures.
- **Verification**: Run `npm run build` and verify bundle chunk sizes; run `npm run test:smoke`; inspect Chrome DevTools Performance profiler to confirm 60 fps.

---
*End of Rebuild Plan.*
