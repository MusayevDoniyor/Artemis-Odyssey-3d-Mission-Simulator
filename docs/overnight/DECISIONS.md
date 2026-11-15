# Overnight Architecture & Engineering Decisions

This file records all architectural, engineering, and asset decisions made autonomously during the overnight run, documenting the decision, the rationale, and the alternatives considered.

---

## Decision D4: Rocket Acoustics & Web Audio Synthesis Architecture (Phase 4)
- **Date**: 2026-11-16T03:55:00+05:00
- **Decision**:
  1. **Multi-Layer Acoustics Engine**:
     - Modeled rocket acoustics not as a flat synthesized tone or simple looping sound effect, but as a composite 5-layer physical system derived from aerospace acoustic literature:
       - **Layer 1: Sub-Bass Rumble (30–80 Hz)**: Large-scale turbulent eddy shedding; mechanical structure-borne conduction preserved into vacuum ($p_{amb} \approx 0$).
       - **Layer 2: Supersonic Exhaust Shear Crackle (1200–3500 Hz)**: Non-linear acoustic shock waves (Mach wave radiation) with skewness $S > 0.4$, rapidly decaying with ambient atmospheric air density $\rho \approx \rho_0 e^{-h/8.2}$.
       - **Layer 3: Solid Rocket Booster Roar (150–800 Hz)**: Aluminum oxide particulate turbulent combustion noise; active only while SRBs burn, cutting to zero upon SRB staging ($h \approx 45\text{ km}$).
       - **Layer 4: Aerodynamic Buffeting**: Transonic boundary layer pressure fluctuations peaking near Maximum Dynamic Pressure (Max-Q, $q \approx 33\text{ kPa}$), decaying cleanly above 40 km.
       - **Layer 5: Cockpit Hull Transmission Low-pass Filter**: Dynamic Biquad lowpass filtering (380 Hz in cockpit mode, 18,000 Hz in exterior view).
  2. **Propagation Physics & Environmental Effects**:
     - Speed-of-sound propagation delay ($t = d / 343\text{ m/s}$), capped at 0.85s for responsive gameplay feedback.
     - High-frequency air absorption ($18\text{ kHz} \to 750\text{ Hz}$ rolloff over distance).
     - Doppler frequency pitch shifting for moving listener cameras.
  3. **Authentic NASA Audio Integration**:
     - Integrated authentic Public Domain NASA acoustic launch recordings from Internet Archive (`/audio/rocket-launch-roar.ogg`, 947 KB, STS-82 twin SRB + SSME acoustic power, and `/audio/rocket-launch-distant.ogg`, 1.08 MB).
     - Multi-tier playback: procedural synthesis + sample playback mixed seamlessly via the Web Audio graph with graceful offline fallback.
  4. **Transient Mechanical Effects**:
     - Upgraded `playStageSep()` with a 120 Hz $\to$ 36 Hz pyrotechnic punch + 1450 Hz pneumatic venting hiss + metallic ping.
     - Added `playRcsPuff()` for attitude control thruster firing (2200 Hz bandpass noise pulse, 85 ms decay).
- **Why**: Replaces synthetic buzz with authentic aerospace sound design grounded in physical acoustic principles, while strictly respecting file size constraints (<1.5 MB audio limit).
- **Alternatives Considered**:
  - Playing only a single static recorded WAV (rejected: cannot dynamically adapt to atmospheric density, Mach number, Max-Q dynamic pressure, or camera distance).
  - Pure synthesizer without authentic NASA launch recordings (rejected: fails to capture the exact acoustic timbre of solid propellant particulate crackle and twin solid booster roar).

---

## Decision D3: Launch Vehicles Architecture & Plume Aerodynamics (Phase 3)
- **Date**: 2026-11-16T03:38:00+05:00
- **Decision**:
  1. **Historical & Commercial Launch Vehicles**:
     - Saturn V: Sourced official NASA 3D Resources Public Domain model (`saturn_v.glb`, 927 KB). Built `createSaturnVShowcase` dividing the stack into 6 inspectable subsystems (`saturn-sic`, `saturn-sii`, `saturn-sivb`, `saturn-iu-sla`, `saturn-csm`, `saturn-les`) with authentic roll patterns, 5 F-1 engines, 5 J-2 engines, IBM LVDC Instrument Unit, Lunar Module SLA bay, Apollo CSM, and Launch Escape System.
     - Falcon 9: Built high-detail `createFalcon9Showcase` with 6 inspectable subsystems (`falcon-stage1`, `falcon-grid-fins`, `falcon-landing-legs`, `falcon-interstage`, `falcon-stage2`, `falcon-fairing`) with 9 Merlin 1D Octaweb cluster, single-forged titanium grid fins, 4 deployable carbon-fiber legs, 165:1 radiatively cooled niobium MVacD engine, and 5.2 m clamshell fairing halves.
     - Added both vehicles to `HARDWARE_CATALOG`, `HARDWARE_ORDER`, `VEHICLE_CATALOG`, and `SPACECRAFT_CATALOG_SI` with complete aerospace specs, 3-level educational copy, interactive quizzes, and explode vectors.
  2. **Plume Aerodynamics & Vacuum Expansion**:
     - Modeled atmospheric pressure expansion: sea level plume is compressed/columnar, expanding smoothly up to 2.85x radial width in vacuum ($p_{amb} \approx 0$) as atmospheric density drops between 0 km and 165 km.
     - Added 4-stage shock diamond train (Mach diamonds) in the central RS-25 hydrolox core plume at sea level, smoothly fading out as ambient pressure drops below 14 km altitude.
  3. **Transonic Condensation Cone**:
     - Transonic Prandtl-Glauert vapour cone dynamically rendered between Mach 0.92 and 1.18 (peaking at Mach 1.02), responding to live airspeed and condensation opacity.
  4. **Pad Release & Liftoff Cryogenic Shedding**:
     - Emitted fluttering white ice/frost flake particles falling from the cryogenic core tank during liftoff (alt 0 to 220 m).
  5. **Acoustic Camera Shake**:
     - Hard-capped at 0.06 Three.js units, scaled with engine throttle and altitude, and completely disabled (`0`) if `prefersReducedMotion` or `reducedMotion` is active.
- **Why**: Implements Phase 3 requirements, giving players deep engineering insight into Apollo and commercial heavy lift architectures alongside SLS Block 1, while grounding launch visual effects in authentic aerodynamic physics.
- **Alternatives Considered**:
  - Full procedural generation only for Saturn V (rejected: having NASA's authentic Public Domain CAD geometry ensures historically accurate scale and silhouette).
  - Unbounded camera shake (rejected: violates accessibility guidelines and causes visual disorientation).


## Decision D2: Real Planetary Textures, Ring Systems, Atmosphere Shaders & Asteroid Bennu (Phase 2)
- **Date**: 2026-11-16T03:05:00+05:00
- **Decision**:
  1. **Real Scientific Textures**: Replaced all procedural canvas planetary textures with verified 2K equirectangular maps:
     - Sun: SDO AIA 4500Å continuum map with unlit emissive material, coronal prominences, and additive glow.
     - Mercury: MESSENGER MDIS global mosaic.
     - Venus: Mariner 10 / Pioneer Venus cloud layer with dense Rayleigh limb glow (`uDayColor: 0xffe2a4`, `uTwilightColor: 0xd97706`) + Magellan radar surface map.
     - Earth: NASA Blue Marble daylight mosaic, alpha-masked clouds, and NASA Black Marble night lights shader dynamically masked by solar terminator direction (`uSunDir`).
     - Moon: LRO LROC WAC mosaic.
     - Mars: MGS MOC / Viking MDIM mosaic with thin Martian atmosphere shader.
     - Jupiter: Cassini/Juno composite map with Galilean moons and faint ring band.
     - Saturn: Cassini ISS calibrated cylindrical map.
     - Uranus: Voyager 2 composite map with 97.77° axial tilt and faint ring band.
     - Neptune: Voyager 2 composite map with 28.32° axial tilt and faint ring band.
     - Ceres: Dawn Framing Camera global mosaic.
     - Bennu: NASA OSIRIS-REx 3D laser altimeter / shape model (.glb).
  2. **Planetary Ring Geometry**: Implemented `createPlanetaryRingGeometry` with radial UV projection `u = (r - r_in) / (r_out - r_in)` to accurately map 1D radial ring profiles (C ring, B ring, Cassini Division, A ring out to 2.27 R_sat) with zero polar distortion. Added faint ring bands for Jupiter, Uranus, and Neptune; no rings on bodies that have none.
  3. **Atmospheric Shaders**: Rayleigh limb glow shaders tuned for Venus (thick dense greenhouse haze), Mars (thin tenuous CO₂ limb), and gas giants.
  4. **NASA Fact Sheet References & Bennu Integration**: Expanded `SOLAR_SYSTEM_BODIES` and `PLANETARY_CATALOG_SI` with authentic NASA fact sheet figures (mean diameter, mass, surface gravity, rotation period, orbit elements) and clickable direct links to official NASA fact sheets.
  5. **B4 & B5 Resolution**: Verified elimination of NASA meatball canvas decal (replaced with original vector Artemis flight operations insignia) and poor procedural textures.
- **Why**: Fulfills Phase 2 requirements for aerospace realism; replaces generic procedural noise with authentic scientific imagery while staying within the <3 MB asset budget.
- **Alternatives Considered**:
  - Procedural WebGL noise shaders for planets (rejected: produces synthetic textures that fail aerospace fidelity standards).
  - 8K uncompressed textures (rejected: would exceed the 3 MB budget per asset and cause mobile VRAM exhaustion; 2K equirectangular WebP/JPEG provides crisp resolution while keeping total planetary package under 7 MB).

## Decision D0: Overnight Branch & Safety Configuration
- **Date**: 2026-11-16T02:04:00+05:00
- **Decision**: Created isolated branch `overnight/world-and-models` from `rebuild/m4-design-system`. Set up `.gitignore` for `assets-src/*` while tracking `assets-src/SOURCES.md`.
- **Why**: Protects `main` and earlier milestone branches from untested regressions; preserves tight repository size limits (<3 MB per GLB, <1.5 MB per audio file).
- **Alternatives Considered**: Direct work on `rebuild/m4-design-system` (rejected: separates design system milestone from overnight multi-phase asset overhaul).

---

## Decision D2: Real Planetary Textures, Ring Systems, Atmosphere Shaders & Asteroid Bennu (Phase 2)
- **Date**: 2026-11-16T03:05:00+05:00
- **Decision**:
  1. **Real Scientific Textures**: Replaced all procedural canvas planetary textures with verified 2K equirectangular maps:
     - Sun: SDO AIA 4500Å continuum map with unlit emissive material, coronal prominences, and additive glow.
     - Mercury: MESSENGER MDIS global mosaic.
     - Venus: Mariner 10 / Pioneer Venus cloud layer with dense Rayleigh limb glow (`uDayColor: 0xffe2a4`, `uTwilightColor: 0xd97706`) + Magellan radar surface map.
     - Earth: NASA Blue Marble daylight mosaic, alpha-masked clouds, and NASA Black Marble night lights shader dynamically masked by solar terminator direction (`uSunDir`).
     - Moon: LRO LROC WAC mosaic.
     - Mars: MGS MOC / Viking MDIM mosaic with thin Martian atmosphere shader.
     - Jupiter: Cassini/Juno composite map with Galilean moons and faint ring band.
     - Saturn: Cassini ISS calibrated cylindrical map.
     - Uranus: Voyager 2 composite map with 97.77° axial tilt and faint ring band.
     - Neptune: Voyager 2 composite map with 28.32° axial tilt and faint ring band.
     - Ceres: Dawn Framing Camera global mosaic.
     - Bennu: NASA OSIRIS-REx 3D laser altimeter / shape model (.glb).
  2. **Planetary Ring Geometry**: Implemented `createPlanetaryRingGeometry` with radial UV projection `u = (r - r_in) / (r_out - r_in)` to accurately map 1D radial ring profiles (C ring, B ring, Cassini Division, A ring out to 2.27 R_sat) with zero polar distortion. Added faint ring bands for Jupiter, Uranus, and Neptune; no rings on bodies that have none.
  3. **Atmospheric Shaders**: Rayleigh limb glow shaders tuned for Venus (thick dense greenhouse haze), Mars (thin tenuous CO₂ limb), and gas giants.
  4. **NASA Fact Sheet References & Bennu Integration**: Expanded `SOLAR_SYSTEM_BODIES` and `PLANETARY_CATALOG_SI` with authentic NASA fact sheet figures (mean diameter, mass, surface gravity, rotation period, orbit elements) and clickable direct links to official NASA fact sheets.
  5. **B4 & B5 Resolution**: Verified elimination of NASA meatball canvas decal (replaced with original vector Artemis flight operations insignia) and poor procedural textures.
- **Why**: Fulfills Phase 2 requirements for aerospace realism; replaces generic procedural noise with authentic scientific imagery while staying within the <3 MB asset budget.
- **Alternatives Considered**:
  - Procedural WebGL noise shaders for planets (rejected: produces synthetic textures that fail aerospace fidelity standards).
  - 8K uncompressed textures (rejected: would exceed the 3 MB budget per asset and cause mobile VRAM exhaustion; 2K equirectangular WebP/JPEG provides crisp resolution while keeping total planetary package under 7 MB).

## Decision D1: Dual Scale Modes, Continuous Coordinates, and Depth Buffer Calibration (Phase 1)
- **Date**: 2026-11-16T02:40:00+05:00
- **Decision**:
  1. **Depth Buffer**: Activated `logarithmicDepthBuffer: true` on `THREE.WebGLRenderer` and calibrated near/far planes to 0.05 / 5,000,000 units.
  2. **Dual Scale Modes**:
     - *Educational Scale* (`exploration`): Preserves 100% authentic NASA physical body radius ratios relative to Earth (Moon: 0.2727x, Mars: 0.532x, Venus: 0.950x, Jupiter: 10.973x, Saturn: 9.140x) while compressing interplanetary orbital distances for visual overview. Crucially, the Earth-Moon flight corridor is true scale (60.338 Earth radii, 3.667:1 diameter ratio).
     - *True Scale* (`scientific`): 1:1 astronomical linear distances (1 AU = 160u) and true physical body sizes.
  3. **Spacecraft Sizing & Pin/Beacon**: Orion is rendered at true physical scale (0.048 scale units in exploration, 0.012 in scientific) with a close aft-quarter chase camera (0.85u offset). When zoomed out (>6u), a billboarded hexagonal tactical beacon with distance tracking is displayed. Orion is never blown up to planet scale.
  4. **Continuous Inertial Parking Orbit**: Liftoff and ascent continuously transition into a 165 km circular parking orbit (~7,809 m/s, 87.7 min period). `computeLaunchOrbitHandoffState` passes the continuous Cartesian state vector across phase transitions, completely eliminating teleportation.
- **Why**: Fixes reported bugs B1 (planet/spacecraft 1:2 scale bug) and B2 (launch to orbit teleport bug). Eliminates z-fighting at astronomical distances and ensures seamless flight physics.
- **Alternatives Considered**:
  - Two-camera near/far split scene (rejected: higher CPU draw call overhead and complex shadow/lighting synchronization compared to logarithmic depth buffer).
  - Hardcoded scaling multiplier on spacecraft during space flight (rejected: causes B1; true relative scale with tactical beacon when far provides authentic aerospace fidelity).
