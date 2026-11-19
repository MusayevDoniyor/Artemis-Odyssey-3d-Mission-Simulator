# Overnight Autonomous Run: Progress Checklist & Reconciliation

- [x] **PHASE 0: Baseline and bug reproduction**
  - [x] 0.1 Record baseline tsc, tests (62 pass), build output, bundle sizes (index.js = 1519.99 kB), and frame time.
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

- [ ] **PHASE 2: Celestial bodies (Sun, planets, Moon, Pluto, asteroids)**
  - [x] 2.1 Research and source real NASA/USGS maps (Sun SDO, Mercury MESSENGER, Venus clouds/radar, Earth Blue Marble + specular/clouds, Moon LOLA, Mars Viking, Outer Gas Giants).
  - [ ] 2.1b **Pluto texture: NOT DONE** (uses procedural 256x128 canvas `tex.plutoAlbedo`; real New Horizons imagery pending).
  - [x] 2.2 Saturn rings, thin faint ring bands for gas giants, correct axial tilts & rotation periods.
  - [x] 2.3 Atmospheric limb glow shaders & Sun emissive corona.
  - [x] 2.4 Asteroid belt (260 instanced particles) & NASA Bennu 3D model (18,240 tris).
  - [x] 2.5 Orbit lines (J2000 Keplerian elements) and hover telemetry cards.
  - [x] 2.6 Verify and tag `overnight-phase-2-green`.

- [ ] **PHASE 3: Rockets (launch vehicles), exact and detailed**
  - [x] 3.1 Research & source: SLS Block 1, Saturn V, Falcon 9.
  - [x] 3.2 Authentic stage structure, separated moving nodes (fairings, LAS, SRBs, gimbal bells).
  - [x] 3.3 Flight aerodynamics: Mach-dependent drag, Max-Q altitude, real thrust/Isp profiles.
  - [x] 3.4 Visual effects: transparent hydrolox plumes + Mach diamonds, sooty SRB plumes, plume expansion in vacuum, condensation cone, pad smoke deluge.
  - [ ] 3.5 **Saturn V GLB model wiring: NOT DONE** (`saturn_v.glb` downloaded at 905 KB, but scene uses procedural `createSaturnVShowcase`).
  - [x] 3.6 Verify and tag `overnight-phase-3-green`.

- [ ] **PHASE 4: Real rocket sound (not synthetic slop)**
  - [x] 4.1 Source authentic public-domain/CC0 rocket audio recordings (NASA STS launch audio from Internet Archive).
  - [x] 4.2 Multi-layer audio engine: LF rumble, supersonic shear crackle, SRB particulate roar, transonic buffeting, cabin cockpit lowpass filter (380 Hz) vs exterior, distance delay, air absorption.
  - [x] 4.3 Web Audio buses (master, sfx, music, engine) strictly under budget (<1.5 MB per file; `rocket-launch-roar.ogg` is 947 KB, `rocket-launch-distant.ogg` is 1.08 MB).
  - [ ] 4.4 **In-game STS launch audio disclosure: NOT DONE** (attributed in `docs/CREDITS.md`, but unlabelled in UI).
  - [x] 4.5 Verify and tag `overnight-phase-4-green`.

- [ ] **PHASE 5: Capsule, spacecraft and other hardware**
  - [x] 5.1 Research: Orion + ESM, Apollo LM, concept lander, VIPER / Perseverance, JWST, Voyager, ISS, satellites.
  - [x] 5.2 Materials (MLI gold foil, thermal tiles, radiators) and articulating nodes.
  - [x] 5.3 Integrated NASA GLB models: JWST (99k tris), Voyager (30k tris), ISS (174k tris), Bennu (18k tris).
  - [ ] 5.4 **Apollo LM, Perseverance, TDRS GLB wiring: NOT DONE** (GLBs downloaded to `public/assets/`, but scene uses procedural fallbacks). Orion and VIPER are procedural recreations (no NASA GLBs in repo).
  - [x] 5.5 Verify and tag `overnight-phase-5-green`.

- [x] **PHASE 6: Launch site, facilities and surroundings**
  - [x] 6.1 Research LC-39B layout, flame trench, Mobile Launcher umbilicals, VAB in background (160m at correct distance/bearing).
  - [x] 6.2 Florida terrain, coastline, pad lighting, instanced props.
  - [x] 6.3 Verify and tag `overnight-phase-6-green`.

- [x] **PHASE 7: Surfaces, landing and rover**
  - [x] 7.1 Moon Shackleton & Mars Jezero terrain from real elevation datasets (LOLA/MOLA).
  - [x] 7.2 Ballistic lunar dust particles, vacuum descent plume, honest touchdown speed/tilt telemetry (fixes 0.0 m/s crash bug).
  - [x] 7.3 Rover speed fix (B3): real scientific speed + time compression, rocker-bogie suspension with ground raycasts.
  - [x] 7.4 Verify and tag `overnight-phase-7-green`.

- [x] **PHASE 8: Vehicle Inspector (exploded view, every part explained)**
  - [x] 8.1 Rebuild inspector in design tokens with multi-stage exploded views along assembly axes (presets 0%, 35%, 100%).
  - [x] 8.2 Part deep-dives: real names, function descriptions, verified facts, sources for every visible node.
  - [x] 8.3 Automated node coverage audit (100% coverage, zero placeholder or empty parts).
  - [x] 8.4 Guided systems tours: "How SLS works", "How Orion keeps crew alive", "How LM landed on the Moon", "How Perseverance samples Mars", "How ISS sustains human life in LEO", and interactive quizzes.
  - [x] 8.5 Verify and tag `overnight-phase-8-green`.

- [x] **PHASE 9: Space flight views, trajectories and orbit lines**
  - [x] 9.1 Trajectory lines for parking orbit, TLI, cislunar free return, SOI transfers.
  - [x] 9.2 Real-time telemetry physics: altitude, speed of light comms delay, radiation dose rate, active reference frame switching.
  - [x] 9.3 Space Flight HUD aerospace styling with design tokens.
  - [x] 9.4 Verify and tag `overnight-phase-9-green`.

- [ ] **PHASE 10: Cinematic audio, music and settings**
  - [ ] 10.1 **Licensed cinematic ambient music track: NOT DONE** (procedural oscillator chords implemented instead; licensed track pending).
  - [x] 10.2 Comprehensive settings overhaul: 4 buses, 4 graphics presets, aerospace units (NIST SP 811), accessibility toggles, flight deck key bindings, resilient localStorage persistence.
  - [x] 10.3 Verify and tag `overnight-phase-10-green`.

- [ ] **PHASE 11: Performance, cleanup and final report**
  - [ ] 11.1 **Dynamic code-splitting: NOT DONE** (application remains a monolithic 1.7 MB bundle).
  - [x] 11.2 Disposal, draw call instancing, zero memory leaks across scene graph traversals.
  - [x] 11.3 Update `CREDITS.md`, `ASSET_MANIFEST.md`, `REBUILD_PLAN.md`.
  - [x] 11.4 Write `FINAL_REPORT.md` and `COVERAGE_AUDIT.md`.
  - [x] 11.5 Verify and tag `overnight-phase-11-green`.

---

## R3 Autonomous Execution Checklist

- [x] **R3 PHASE 1: Geometry Corruption Fix & GLB Doctor (P0)**
  - [x] 1.1 Build `tools/glb-doctor/` (Node diagnostic engine + CLI + unit tests).
  - [x] 1.2 Audit all 36 GLBs across repo and NASA cache; isolate in solid/wireframe from 3 angles on REAL physical GPU (`ANGLE D3D11`).
  - [x] 1.3 Establish root causes:
    - Root Cause 1: `sls_block1.glb` negative node scale on `srb_left` from unbaked parent empties + rogue triangles from unapplied mirrored brackets.
    - Root Cause 2: `mobile_launcher.glb` 779 needle triangles and 210m edges in railings primitive, scaled by 13.0 on pad.
    - Root Cause 3: `models.ts` detaching nodes stripped 0.25 scaling and compounded translations.
  - [x] 1.4 Re-export clean `sls_block1.glb` with 8 clean nodes mapped 1:1 to inspector parts, 0 negative scale, 0 degenerate faces, 66,580 triangles (under 75k hero budget); remove corrupt `mobile_launcher.glb` and keep authentic procedural LC-39B tower.
  - [x] 1.5 Preserve corrupted fixtures in `tests/fixtures/corrupt/`; write `tests/regression/geometryDoctorRegression.test.ts` (4/4 pass green).
  - [x] 1.6 Capture before/after real GPU screenshots at 1440x900 in Hardware Bay, Launch Pad, and Title. Diff verified (14.88% and 11.86% diff eliminating all streaks).
  - [x] Tag `r3-phase-1-green`.

- [x] **R3 PHASE 2: Build Real, Reusable QA System**
  - [x] 2.1 Deterministic harness: `?qa=1` exposing `window.__QA__` (seeded RNG, step(n), wait-idle, scene-jump, camera presets, stats dump).
  - [x] 2.2 Scene catalog (`qa/scenes.ts` covering all 24 required scenes, camera angles, explosion states, and viewports).
  - [x] 2.3 Per-scene checks: console/network error trap, scene graph sanity traversal, triangle/aspect ratio sanity, pixelmatch visual regression, 600-frame perf telemetry (p50 >= 30 FPS floor), 5x enter/exit leak test, axe-core a11y, dead-control crawl.
  - [x] 2.4 Simulation QA: full-mission continuous autopilot (`qa/simulationQa.test.ts`), landing grid fuzz, rover kinematics displacement tests.
  - [x] 2.5 Server & API QA: DONKI, Horizons, OSDR schema validation & offline fallbacks.
  - [x] 2.6 Audio QA: 4-bus volume & clipping test, silent fallback verification.
  - [x] 2.7 Asset & license integrity: manifest audit (`docs/CREDITS.md` asset table), orphan detection, license checks.
  - [x] 2.8 npm commands: `qa:fast`, `qa:full`, `qa:gpu`, `qa:update-baselines`.
  - [x] 2.9 QA selftest (`qa/selftest/qaSelfTest.test.ts` testing 8 injected defects; 100% pass red).
  - [x] 2.10 Tag `r3-phase-2-green`.

- [x] **R3 PHASE 3: Run QA, Triage, Fix in Rounds**
  - [x] 3.1 Executed `npm run qa:full` on physical GPU (`ANGLE Direct3D11`).
  - [x] 3.2 Triage in `docs/qa/FINDINGS.md`: 0 open P0, 0 open P1.
  - [x] 3.3 Aligned all 9 hardware showcase craft in `qa/scenes.ts`.
  - [x] 3.4 Tagged visible procedural meshes in `tagPart()`.
  - [x] 3.5 Cut Base Camp from Hardware Bay; labeled LM-2 lander as educational concept; verified primary part sources.
  - [x] Tag `r3-phase-3-green`.

- [x] **R3 PHASE 4: Reconcile Earlier Reports**
  - [x] 4.1 Standardized audio paths to `/assets/audio/music/` with silent fallback; credited tracks in `CREDITS.md`.
  - [x] 4.2 Pad draw call analysis authored in `docs/qa/PERF_ANALYSIS.md`.
  - [x] 4.3 Saturn V facts reconciled: verified authentic 34,382 triangle count.
  - [x] 4.4 Authored `docs/qa/SHIP_AUDIT.md` mapping all prompt requirements to shipping code.
  - [x] 4.5 Cited 14 CFR § 1221.110(a) and NASA Media Usage Guidelines § 2.1 for VAB; verified neutral cladding.
  - [x] 4.6 ISS 3-angle detail check completed on real GPU.
  - [x] Tag `r3-phase-4-green`.

- [x] **R3 PHASE 5: Approved Leftovers**
  - [x] 5.1 Code-splitting: dynamic import of `SpaceSceneManager` in `App.tsx` and Rollup manual chunks; reduced initial JS landing bundle to 418.67 KB (<500 KB limit).
  - [x] 5.2 Shader pre-warm: added `prewarmShaders()` with `renderer.compileAsync` in `SpaceSceneManager.ts`.
  - [x] 5.3 Texture optimization: downscaled Ceres texture from 4096 to 2048 (down to 552 KB MozJPEG).
  - [x] 5.4 Launch pad draw calls: batched 56 tower diagonal X-bracing struts, 7 tiered platforms, 6 MLP pedestals, and 4 hold-down clamps into `THREE.InstancedMesh`; pad draw calls dropped from 528–534 to 400–404 per frame.
  - [x] 5.5 In-game Credits & Legal modal panel added to `GameMenuModal.tsx` and title overlay.
  - [x] Tag `r3-phase-5-green`.

- [x] **R3 PHASE 6: Pre-Release Cleanup**
  - [x] 6.1 Secrets scan: 0 API keys, 0 private tokens, 0 `.env` files tracked.
  - [x] 6.2 Repo hygiene: working tree clean, 0 files > 5 MB, pruned objects.
  - [x] 6.3 Updated `README.md`, authored `CHANGELOG.md` and `docs/RELEASE_NOTES_rc1.md`.
  - [x] 6.4 Authored `docs/qa/RELEASE_GATES.md` (Gates G1–G9 passing green) and `docs/qa/ROLLBACK.md`.
  - [x] 6.5 Music provenance verified: `viacheslavstarostin` verified (Track ID 338203, 3:00); `main_page.mp3` marked "source still unverified" (local duration 3:05 vs source 2:24).

- [ ] **R3 PHASE 7: Gated Release to Main (HELD AT CHECKPOINT)**
  - [ ] Awaiting operator explicit confirmation ("merge") before executing Phase 7 safety tag, branch merge, squash merge to `main`, and `v0.2.0-rc1` release tagging.

