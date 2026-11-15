# Overnight Autonomous Run: Progress Checklist

- [x] **PHASE 0: Baseline and bug reproduction**
  - [x] 0.1 Record baseline tsc, tests (60 pass), build output, bundle sizes, and frame time.
  - [x] 0.2 Reproduce B1 (Planet vs Spacecraft scale bug): inspect Three.js scene scale code, capture screenshot/numbers.
  - [x] 0.3 Reproduce B2 (Launch-to-orbit teleport bug): analyze `separateLaunchStage` / `leoTransfer` / phase handoff in `src/sim/` and write characterization / failing test.
  - [x] 0.4 Reproduce B3 (Rover speed bug): verify `speedScale === 'REAL_SPEED'` vs actual `stepRoverKinematics` speed multiplier, write failing test proving simulated speed does not change.
  - [x] 0.5 Tag `overnight-phase-0-green`.

- [ ] **PHASE 1: Scale, coordinates and continuous flight (fixes B1 and B2)**
  - [ ] 1.1 Verified reference data for Sun, planets, Moon, distances (AU/km).
  - [ ] 1.2 Implement camera-relative rendering (floating origin) and dual scale modes ("True scale" vs "Educational scale").
  - [ ] 1.3 Spacecraft rendered at true scale with pin/marker and zoom-to-vehicle camera.
  - [ ] 1.4 Continuous inertial Earth-centred coordinates from pad liftoff to orbit coasting (no teleport).
  - [ ] 1.5 Real drawn Earth parking orbit (~165 km, 7.8 km/s, ~87 min period) with apsis markers before TLI burn.
  - [ ] 1.6 Verify and tag `overnight-phase-1-green`.

- [ ] **PHASE 2: Celestial bodies (Sun, planets, Moon, Pluto, asteroids)**
  - [ ] 2.1 Research and source real NASA/USGS maps (Sun, Mercury, Venus, Earth Blue Marble + specular/clouds, Moon LOLA, Mars MOLA, Outer Gas Giants, Pluto).
  - [ ] 2.2 Saturn rings, thin faint ring bands for gas giants, correct axial tilts & rotation periods.
  - [ ] 2.3 Atmospheric limb glow shaders & Sun emissive corona.
  - [ ] 2.4 Asteroid belt & NASA Bennu 3D model.
  - [ ] 2.5 Orbit lines (J2000 Keplerian elements) and hover telemetry cards.
  - [ ] 2.6 Verify and tag `overnight-phase-2-green`.

- [ ] **PHASE 3: Rockets (launch vehicles), exact and detailed**
  - [ ] 3.1 Research & source: SLS Block 1, Saturn V, Falcon 9 / Starship stack.
  - [ ] 3.2 Authentic stage structure, separated moving nodes (fairings, LAS, SRBs, gimbal bells).
  - [ ] 3.3 Flight aerodynamics: Mach-dependent drag, Max-Q altitude, real thrust/Isp profiles.
  - [ ] 3.4 Visual effects: transparent hydrolox plumes + Mach diamonds, sooty SRB plumes, plume expansion in vacuum, condensation cone, pad smoke deluge.
  - [ ] 3.5 Verify and tag `overnight-phase-3-green`.

- [ ] **PHASE 4: Real rocket sound (not synthetic slop)**
  - [ ] 4.1 Source authentic public-domain/CC0 rocket audio recordings (Apollo/Shuttle/NASA archives).
  - [ ] 4.2 Multi-layer audio engine: LF rumble, crackle, transonic buffeting, cabin vs external distance-delay filtering.
  - [ ] 4.3 Web Audio buses (master, sfx, music, voice, ui) under budget (<1.5 MB per file).
  - [ ] 4.4 Verify and tag `overnight-phase-4-green`.

- [ ] **PHASE 5: Capsule, spacecraft and other hardware**
  - [ ] 5.1 Research & source: Orion + ESM (solar wings, RCS), Apollo LM, concept lander, VIPER / Perseverance, JWST, Voyager, ISS, satellites.
  - [ ] 5.2 Materials (MLI gold foil, thermal tiles, radiators) and articulating nodes.
  - [ ] 5.3 Verify and tag `overnight-phase-5-green`.

- [ ] **PHASE 6: Launch site, facilities and surroundings**
  - [ ] 6.1 Research LC-39B layout, flame trench, Mobile Launcher umbilicals, VAB in background (160m at correct distance/bearing).
  - [ ] 6.2 Florida terrain, coastline, pad lighting, instanced props.
  - [ ] 6.3 Verify and tag `overnight-phase-6-green`.

- [ ] **PHASE 7: Surfaces, landing and rover**
  - [ ] 7.1 Moon Shackleton & Mars Jezero terrain from real elevation datasets (LOLA/MOLA).
  - [ ] 7.2 Ballistic lunar dust particles, vacuum descent plume, honest touchdown speed/tilt telemetry.
  - [ ] 7.3 Rover speed fix (B3): real scientific speed + time compression, rocker-bogie suspension with ground raycasts.
  - [ ] 7.4 Verify and tag `overnight-phase-7-green`.

- [ ] **PHASE 8: Vehicle Inspector (exploded view, every part explained)**
  - [ ] 8.1 Rebuild inspector in design tokens with multi-stage exploded views along assembly axes.
  - [ ] 8.2 Part deep-dives: real names, function descriptions, verified facts, sources for every visible node.
  - [ ] 8.3 Automated node coverage audit (no empty parts).
  - [ ] 8.4 Guided systems tours and interactive quizzes.
  - [ ] 8.5 Verify and tag `overnight-phase-8-green`.

- [ ] **PHASE 9: Space flight views, trajectories and orbit lines**
  - [ ] 9.1 Trajectory lines for parking orbit, TLI, cislunar free return, SOI transfers.
  - [ ] 9.2 Smooth camera transitions and anti-popping entrance animations.
  - [ ] 9.3 Verify and tag `overnight-phase-9-green`.

- [ ] **PHASE 10: Cinematic audio, music and settings**
  - [ ] 10.1 Licensed ambient score lazy-loaded with crossfades.
  - [ ] 10.2 Comprehensive settings overhaul: buses, graphics presets, units, accessibility, key bindings, localStorage persistence.
  - [ ] 10.3 Verify and tag `overnight-phase-10-green`.

- [ ] **PHASE 11: Performance, cleanup and final report**
  - [ ] 11.1 Lazy-loading, disposal, draw call optimizations, zero memory leaks.
  - [ ] 11.2 Update `CREDITS.md`, `ASSET_MANIFEST.md`, `REBUILD_PLAN.md`.
  - [ ] 11.3 Write `FINAL_REPORT.md` with complete 5-section report.
