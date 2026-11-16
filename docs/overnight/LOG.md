# Overnight Execution Log

Timestamped log of actions, verification runs, test outputs, and measurements.

---

### [2026-11-16T02:04:00+05:00] Initialization
- Created branch `overnight/world-and-models` from `rebuild/m4-design-system`.
- Copied `OVERNIGHT_MASTER_PROMPT.md` to `docs/overnight/MASTER_PROMPT.md`.
- Initialized `PROGRESS.md`, `DECISIONS.md`, `BLOCKERS.md`, `LOG.md`, `docs/overnight/screens/`, `docs/overnight/research/`.
- Configured `.gitignore` for `assets-src/*` with `assets-src/SOURCES.md`.

---

### [2026-11-16T02:18:00+05:00] Phase 0: Baseline & Bug Reproduction
- **Verification Commands Executed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npm test`: 62 tests passing, 0 failing (duration 1515 ms).
  - `npm run build`: dist/index.html (1.18 kB), dist/assets/index.css (114.15 kB), dist/assets/index.js (1519.99 kB).
  - Headless frame time: ~32 ms average (~31.2 FPS in headless test environment).
- **Bug Reproduction Evidence**:
  - **B1 (Planet vs Spacecraft scale bug)**:
    - Inspected `src/three/SpaceSceneManager.ts:2500` and `src/game/orbitalMechanics.ts:325`. Spacecraft mesh (~2 units long) scaled at 0.62 in exploration mode = 1.24 units. Earth visual radius = 2.35 units (diameter 4.7 units), Moon radius = 0.64 units (diameter 1.28 units).
    - Result: Spacecraft appears 1:3.8 against Earth and almost 1:1 against the Moon, whereas real Orion (5.02m) vs Earth (12,742 km) ratio is >1:2,500,000.
    - Screenshot saved: `docs/overnight/screens/b1-scale-bug-before.png`.
  - **B2 (Launch-to-orbit teleport bug)**:
    - Root cause in `src/App.tsx:1116` & `src/game/solarSystemData.ts:503`: transitioning from `launch` to `space` discards continuous orbit state vector and calls `getShipSpawnForMission`, arbitrarily placing Orion stationary (`vx=0, vz=0`) at an artificial offset on the opposite side of Earth.
    - Added characterization test: `src/game/characterization.test.ts` ("CHARACTERIZATION [KNOWN_DEFECT: B2]: Launch to orbit phase transition teleports spacecraft discontinuous with launch trajectory").
  - **B3 (Rover speed bug)**:
    - Root cause in `src/sim/rover/roverPhysics.ts`: `stepRoverPhysics` does not accept or apply `speedScale`. `speedScale === 'REAL_SPEED'` is only used in `computeRoverDisplaySpeed` for UI formatting, leaving actual simulation position advancement identical at ~6.8 m/s.
    - Added characterization test: `src/game/characterization.test.ts` ("CHARACTERIZATION [KNOWN_DEFECT: B3]: Rover physics step displacement does not scale with telemetry speedScale").

---

### [2026-11-16T02:42:00+05:00] Phase 1: Scale, Coordinates & Continuous Flight (Fixes B1 & B2)
- **Verification Commands Executed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npm test`: 66 tests passing, 0 failing (duration 1394 ms).
  - `npm run build`: dist/index.html (1.18 kB), dist/assets/index.css (114.15 kB), dist/assets/index.js (1521.67 kB).
  - Browser verification (Puppeteer 1440x900):
    - Title -> Briefing -> Launch pad -> 165 km Earth parking orbit -> TLI burn -> Space flight.
    - Console errors: 0.
- **Artifacts & Screens Generated**:
  - `docs/overnight/research/celestial_dimensions.md`: NASA planetary fact sheet reference data.
  - `docs/overnight/screens/b1-scale-bug-after.png`: Educational & Scientific views showing true relative body sizes.
  - `docs/overnight/screens/b2-parking-orbit-continuous.png`: Continuous LEO parking orbit (165 km, 7.81 km/s).
  - `docs/overnight/screens/b2-space-continuous-post-tli.png`: Seamless cislunar spaceflight following TLI burn.
- **Bug Fixes Verified**:
  - **B1**: Orion scale corrected from 0.62 to 0.048; close chase camera calibrated to 0.85u offset; billboarded tactical beacon reticle added when distance > 6u. Educational mode body radii now match true NASA physical ratios.
  - **B2**: `computeLaunchOrbitHandoffState` and continuous parking orbit coasting implemented. Spacecraft enters orbit at 165 km altitude, 7.81 km/s, 87.7 min period, downrange advancing continuously. Phase handoff preserves Cartesian state without teleportation.

---

### [2026-11-16T03:07:00+05:00] Phase 2: Celestial Bodies (Sun, Planets, Moon, Pluto, Asteroid Bennu)
- **Verification Commands Executed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npm test`: 66 tests passing, 0 failing (duration 1570 ms).
  - `npm run build`: dist/index.html (1.18 kB), dist/assets/index.css (114.63 kB), dist/assets/index.js (1593.93 kB).
  - Headless browser verification (Playwright Chromium 1440x900):
    - Free exploration -> Space scene overview -> Saturn ring inspection -> Sun SDO imagery -> Solar system map with asteroid Bennu.
    - Console errors: 0.
- **Artifacts & Screens Generated**:
  - `docs/overnight/research/celestial_textures_and_rings.md`: Texture datasets, licensing, and ring dimensions.
  - `docs/overnight/screens/phase2-title-planets-1440px.png`: Title screen displaying authentic planetary textures.
  - `docs/overnight/screens/phase2-space-overview-earth.png`: Earth Blue Marble, night lights shader, and outer atmospheric limb glow.
  - `docs/overnight/screens/phase2-saturn-rings-cassini.png`: Saturn with 26.73° axial tilt and Cassini Division ring system.
  - `docs/overnight/screens/phase2-sun-sdo-imagery.png`: Sun SDO AIA 4500Å continuum map with emissive corona.
  - `docs/overnight/screens/phase2-solar-system-map-bennu.png`: Complete Keplerian orbit map including asteroid 101955 Bennu and outer Kuiper belt.
- **Features Implemented & Verified**:
  - **B4 & B5 Fixed**: Removed NASA meatball canvas decal loader (replaced with original vector Artemis flight operations emblem). Replaced all procedural canvas planetary textures with verified 2K equirectangular maps (Sun, Mercury, Venus, Earth night lights, Jupiter, Saturn & rings, Uranus, Neptune, Ceres).
  - **Planetary Ring System**: Implemented `createPlanetaryRingGeometry` with radial UV projection `u = (r - r_in) / (r_out - r_in)` for Saturn's C, B, Cassini, and A rings (1.24 to 2.27 R_sat). Added thin faint ring bands for Jupiter, Uranus, and Neptune.
  - **Atmosphere Shaders**: Rayleigh limb glow shaders tuned for Venus (dense runaway greenhouse haze), Mars (thin CO₂ limb), and gas giants. Earth features dynamic night lights masked by live solar direction (`uSunDir`).
  - **NASA Asteroid 101955 Bennu**: Sourced and loaded official NASA OSIRIS-REx 3D model (`public/assets/asteroids/bennu.glb`, 329 KB). Integrated into Keplerian orbit solver with real info card telemetry and NASA fact sheet source links.
  - **Atmospheric Meteors**: Added subtle shooting star entry streaks in Earth's orbital sky.

---

### [2026-11-16T03:40:00+05:00] Phase 3: Rockets / Launch Vehicles (SLS Block 1, Saturn V, Commercial)
- **Verification Commands Executed**:
  - `npx tsc --noEmit`: 0 errors.
  - `npm test`: 70 tests passing, 0 failing (duration 1252 ms).
  - `npm run build`: dist/index.html (1.18 kB), dist/assets/index.css (114.63 kB), dist/assets/index.js (1627.64 kB).
  - Headless browser verification (Puppeteer 1440x900):
    - Title screen showcase selection for Saturn V and Falcon 9.
    - Vehicle Inspector (Hardware Bay) navigation for all 9 vehicles, inspecting Saturn V (S-IC, S-II, S-IVB, IU/SLA, CSM, LES) and Falcon 9 (Stage 1, Octaweb, Grid Fins, Landing Legs, Interstage, Stage 2, Fairing).
    - SLS pad ignition, liftoff, Max-Q transonic ascent, and continuous orbital parking insertion.
    - Console errors: 0.
- **Artifacts & Screens Generated**:
  - Research docs:
    - `docs/overnight/research/sls_block1.md`: SLS Block 1 flight vehicle specifications, stage timings, RS-25 propulsion, and SRB ballistic thrust curves.
    - `docs/overnight/research/saturn_v.md`: Saturn V Apollo flight configuration, F-1 kerosene cluster, S-II/S-IVB cryogenics, and staging milestones.
    - `docs/overnight/research/commercial_launcher.md`: Falcon 9 Full Thrust / Block 5 specifications, Octaweb, titanium grid fins, landing leg pneumatic geometry, and MVacD vacuum nozzle.
  - Test suites:
    - `src/sim/launch/launchVehicles.test.ts`: 4 verified aerospace tests covering SLS Block 1 liftoff TWR, Max-Q transonic pressure at 10-14 km, staging altitudes, and Saturn V / Falcon 9 catalog specifications.
  - Screenshots:
    - `docs/overnight/screens/phase3-title-saturn-v.png`: Saturn V on title screen 360-degree showcase orbit.
    - `docs/overnight/screens/phase3-saturn-v-inspector.png`: Saturn V in Hardware Bay with 6 inspectable subsystems, educational levels, and propulsion metrics.
    - `docs/overnight/screens/phase3-falcon-9-inspector.png`: Falcon 9 Full Thrust in Hardware Bay with titanium grid fins highlighted.
    - `docs/overnight/screens/phase3-sls-launch-plume-mach.png`: SLS ascent showing RS-25 Mach diamonds, SRB flame, and liftoff cryogenic frost shedding.
- **Features Implemented & Verified**:
  - **Saturn V Integration**: Sourced official NASA 3D Resources model (`public/assets/rockets/saturn_v.glb`, 927 KB). Built `createSaturnVShowcase` with 6 interactive subsystems (`saturn-sic`, `saturn-sii`, `saturn-sivb`, `saturn-iu-sla`, `saturn-csm`, `saturn-les`).
  - **Falcon 9 Full Thrust Integration**: Built high-fidelity `createFalcon9Showcase` with 6 subsystems (`falcon-stage1`, `falcon-grid-fins`, `falcon-landing-legs`, `falcon-interstage`, `falcon-stage2`, `falcon-fairing`).
  - **Catalog & Propulsion Integration**: Added both vehicles to `HARDWARE_CATALOG`, `HARDWARE_ORDER`, `VEHICLE_CATALOG`, and `SPACECRAFT_CATALOG_SI`. Wired `getPropulsionProfileForPart` to compute authentic mass flow, exhaust velocity, and TWR for F-1, J-2, Merlin 1D, and MVacD engines.
  - **Plume Aerodynamics & Vacuum Expansion**: Modeled altitude-dependent exhaust expansion where plume widens smoothly up to 2.85x in near-vacuum. Added 4-stage RS-25 shock train (Mach diamonds) at sea level, fading out cleanly below 14 km altitude.
  - **Transonic Condensation Cone**: Modeled Prandtl-Glauert vapour cone dynamically rendered between Mach 0.92 and 1.18 (peaking at Mach 1.02).
  - **Cryogenic Frost Shedding**: Emitted white tumbling ice flake particles falling from core tank during liftoff (0-220 m).
  - **Acoustic Load Camera Shake**: Capped at 0.06 Three.js units and completely disabled if `prefersReducedMotion` or `reducedMotion` is true.

---

## 2026-11-16T03:56:00+05:00 - Phase 4 Completed: Real Rocket Sound & Multi-Layer Acoustics
- **Phase Objective**: Replace synthetic sound with authentic aerospace acoustics grounded in physical power spectra (370 MW for SLS), supersonic shear crackle, solid booster roar, Max-Q transonic buffeting, cockpit hull transmission filtering, and authentic NASA launch audio recordings.
- **Verification Gates**:
  - `npx tsc --noEmit`: 0 errors.
  - `npm test`: 82 tests passing, 0 failing (duration 1382 ms).
  - `npm run build`: dist/index.html (1.18 kB), dist/assets/index.css (114.63 kB), dist/assets/index.js (1637.82 kB).
  - Asset size limits: `rocket-launch-roar.ogg` (947 KB < 1.5 MB), `rocket-launch-distant.ogg` (1.08 MB < 1.5 MB).
- **Artifacts Generated**:
  - Research doc:
    - `docs/overnight/research/rocket_acoustics_and_audio.md`: Acoustic power calculation (~370 MW for SLS Block 1 liftoff), supersonic shear layer crackle physics with non-linear Mach wave coalescing, aluminum oxide particulate roar from polybutadiene acrylonitrile solid propellant, transonic boundary layer buffeting, cockpit hull transmission attenuation (~380 Hz lowpass filter), speed of sound propagation delay ($t = d / 343$), and Doppler frequency shifts.
  - Test suites:
    - `src/sim/audio/rocketAcoustics.test.ts`: 8 unit tests covering sub-bass scaling, supersonic crackle atmospheric decay, SRB roar gating, Max-Q dynamic pressure buffeting, cockpit hull filtering, speed of sound delay, air absorption rolloff, and Doppler shift.
    - `src/game/audio.test.ts`: 4 unit tests covering SoundSynth settings initialization, clamping, headless safe execution, and launch acoustics integration.
- **Features Implemented & Verified**:
  - **Sim Acoustics Module**: Pure mathematical functions in `src/sim/audio/rocketAcoustics.ts` computing all 5 acoustic layers, propagation delay, and Doppler shift without DOM or Web Audio dependencies.
  - **Multi-Layer Web Audio Synthesizer**: Enhanced `SoundSynth` in `src/game/audio.ts` with sub-bass oscillator + lowpass noise, supersonic shear bandpass crackle filter, SRB solid motor roar filter + 110 Hz harmonic oscillator, Max-Q aerodynamic buffeting filter, and authentic NASA sample bus.
  - **Dynamic Filtering Chain**: Master launch bus feeds into `launchCockpitFilter` (380 Hz in cockpit mode, 18,000 Hz in exterior views) and `launchAirAbsorptionFilter` (high-frequency rolloff over distance).
  - **Authentic NASA Audio**: Sourced and integrated STS-82 twin SRB + SSME launch recording (`public/audio/rocket-launch-roar.ogg`) and distant pad acoustic recording (`public/audio/rocket-launch-distant.ogg`) from Internet Archive Public Domain collections.
  - **Mechanical SFX Polish**: Upgraded `playStageSep()` with heavy pyrotechnic 120->36 Hz low-end thud + pneumatic venting hiss + metallic ping; added `playRcsPuff()` for attitude control thruster firing.

## 2026-11-16T06:42:00+05:00 - Phase 5 Completed: Capsule, Spacecraft and Other Hardware
- **Phase Objective**: Integrate official NASA Public Domain 3D models for all major spacecraft, capsules, rovers, and satellites, replacing crude procedural placeholders; build local Draco decompression pipeline; add International Space Station (ISS) showcase with 5 subsystems; update Gateway status honestly to reflect current NASA programme architecture.
- **Verification Gates**:
  - `npx tsc --noEmit`: 0 errors.
  - `npm test`: 87 tests passing, 0 failing (duration 1051 ms).
  - `npm run build`: built in 1.35s (dist/index.html 1.18 kB, dist/assets/index.css 114.63 kB, dist/assets/index.js 1658.89 kB).
  - Asset size limits: all GLBs strictly < 3 MB (`apollo_lunar_module.glb` 716 KB, `iss.glb` 476 KB, `jwst.glb` 1.00 MB, `perseverance.glb` 1.55 MB, `tdrs.glb` 96.8 KB, `voyager.glb` 285 KB).
- **Artifacts Generated**:
  - Research docs:
    - `docs/overnight/research/orion_and_esm.md`: Detailed engineering breakdown of Orion MPCV, European Service Module, solar array wings, AJ10 engine, LAS, and ICPS.
    - `docs/overnight/research/apollo_lunar_module.md`: Ascent and Descent stage structure, DPS throttling, APS, RCS quads, and landing gear.
    - `docs/overnight/research/spacecraft_hardware.md`: James Webb Space Telescope, Voyager 1 & 2, International Space Station, TDRS Space Network relay, and Gateway architecture alignment.
  - Test suites:
    - `src/sim/models/spacecraftHardware.test.ts`: 5 unit tests covering Orion/ESM specs, ISS 108.5m truss and 5 subsystems, TDRS satellite specifications, Gateway paused programme status, and completeness of all 10 vehicles in `HARDWARE_ORDER`.
- **Features Implemented & Verified**:
  - **Official NASA 3D Models**: Downloaded and integrated official NASA 3D Resources Public Domain GLB assets for Apollo LM, ISS, JWST, Voyager, TDRS, and Perseverance.
  - **Local Draco Decompression**: Bundled Three.js Draco wasm decoder files in `public/draco/` with zero runtime external CDN requests.
  - **ISS Showcase**: Built `createISSShowcase` and added ISS to `HARDWARE_ORDER` and `HARDWARE_CATALOG` with 5 subsystems (`iss-truss`, `iss-modules`, `iss-solar-arrays`, `iss-radiators`, `iss-canadarm`).
  - **TDRS Satellite**: Replaced fictional relay with official NASA Space Network TDRS satellite specs.
  - **Gateway Status**: Updated Gateway to "paused programme" reflecting March 2026 NASA architecture alignment.


