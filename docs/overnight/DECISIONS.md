# Overnight Architecture & Engineering Decisions

This file records all architectural, engineering, and asset decisions made autonomously during the overnight run, documenting the decision, the rationale, and the alternatives considered.

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
