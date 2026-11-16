# Overnight Autonomous Run: Progress Checklist

- [x] **PHASE 0: Baseline and bug reproduction**
  - [x] 0.1 Record baseline tsc, tests (60 pass), build output, bundle sizes, and frame time.
  - [x] 0.2 Reproduce B1 (Planet vs Spacecraft scale bug): inspect Three.js scene scale code, capture screenshot/numbers.
  - [x] 0.3 Reproduce B2 (Launch-to-orbit teleport bug): analyze `separateLaunchStage` / `leoTransfer` / phase handoff in `src/sim/` and write characterization / failing test.
  - [x] 0.4 Reproduce B3 (Rover speed bug): verify `speedScale === 'REAL_SPEED'` vs actual `stepRoverKinematics` speed multiplier, write failing test proving simulated speed does not change.
  - [x] 0.5 Tag `overnight-phase-0-green`.

- [x] **PHASE 1: Scale, coordinates and continuous flight (fixes B1 and B2)**
  - [x] 1.1 Verified reference data for Sun, planets, Moon, distances (AU/km).
  - [x] 1.2 Implement camera-relative rendering (floating origin) and dual scale modes ("True scale" vs "Educational scale").
  - [x] 1.3 Spacecraft rendered at true scale with pin/marker and zoom-to-vehicle camera.
  - [x] 1.4 Continuous inertial Earth-centred coordinates from pad liftoff to orbit coasting (no teleport).
  - [x] 1.5 Real drawn Earth parking orbit (~165 km, 7.8 km/s, ~87 min period) with apsis markers before TLI burn.
  - [x] 1.6 Verify and tag `overnight-phase-1-green`.

- [x] **PHASE 2: Celestial bodies (Sun, planets, Moon, Pluto, asteroids)**
  - [x] 2.1 Research and source real NASA/USGS maps (Sun, Mercury, Venus, Earth Blue Marble + specular/clouds, Moon LOLA, Mars MOLA, Outer Gas Giants, Pluto).
  - [x] 2.2 Saturn rings, thin faint ring bands for gas giants, correct axial tilts & rotation periods.
  - [x] 2.3 Atmospheric limb glow shaders & Sun emissive corona.
  - [x] 2.4 Asteroid belt & NASA Bennu 3D model.
  - [x] 2.5 Orbit lines (J2000 Keplerian elements) and hover telemetry cards.
  - [x] 2.6 Verify and tag `overnight-phase-2-green`.

- [x] **PHASE 3: Rockets (launch vehicles), exact and detailed**
  - [x] 3.1 Research & source: SLS Block 1, Saturn V, Falcon 9 / Starship stack.
  - [x] 3.2 Authentic stage structure, separated moving nodes (fairings, LAS, SRBs, gimbal bells).
  - [x] 3.3 Flight aerodynamics: Mach-dependent drag, Max-Q altitude, real thrust/Isp profiles.
  - [x] 3.4 Visual effects: transparent hydrolox plumes + Mach diamonds, sooty SRB plumes, plume expansion in vacuum, condensation cone, pad smoke deluge.
  - [x] 3.5 Verify and tag `overnight-phase-3-green`.

- [x] **PHASE 4: Real rocket sound (not synthetic slop)**
  - [x] 4.1 Source authentic public-domain/CC0 rocket audio recordings (NASA STS launch audio from Internet Archive).
  - [x] 4.2 Multi-layer audio engine: LF rumble, supersonic shear crackle, SRB particulate roar, transonic buffeting, cabin cockpit lowpass filter (380 Hz) vs exterior, distance delay, air absorption.
  - [x] 4.3 Web Audio buses (master, sfx, music) strictly under budget (<1.5 MB per file; `rocket-launch-roar.ogg` is 947 KB, `rocket-launch-distant.ogg` is 1.08 MB).
  - [x] 4.4 Verify and tag `overnight-phase-4-green`.

- [x] **PHASE 5: Capsule, spacecraft and other hardware**
  - [x] 5.1 Research & source: Orion + ESM (solar wings, RCS), Apollo LM, concept lander, VIPER / Perseverance, JWST, Voyager, ISS, satellites.
  - [x] 5.2 Materials (MLI gold foil, thermal tiles, radiators) and articulating nodes.
  - [x] 5.3 Verify and tag `overnight-phase-5-green`.

- [x] **PHASE 6: Launch site, facilities and surroundings**
  - [x] 6.1 Research LC-39B layout, flame trench, Mobile Launcher umbilicals, VAB in background (160m at correct distance/bearing).
  - [x] 6.2 Florida terrain, coastline, pad lighting, instanced props.
  - [x] 6.3 Verify and tag `overnight-phase-6-green`.

- [x] **PHASE 7: Surfaces, landing and rover**
  - [x] 7.1 Moon Shackleton & Mars Jezero terrain from real elevation datasets (LOLA/MOLA).
  - [x] 7.2 Ballistic lunar dust particles, vacuum descent plume, honest touchdown speed/tilt telemetry (fixes 0.0 m/s crash bug).
  - [x] 7.3 Rover speed fix (B3): real scientific speed + time compression, rocker-bogie suspension with ground raycasts.
  - [x] 7.4 Verify and tag `overnight-phase-7-green`.

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
