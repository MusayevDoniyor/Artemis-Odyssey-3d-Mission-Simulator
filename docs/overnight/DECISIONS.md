# Overnight Architecture & Engineering Decisions

This file records all architectural, engineering, and asset decisions made autonomously during the overnight run, documenting the decision, the rationale, and the alternatives considered.

---

## Decision D0: Overnight Branch & Safety Configuration
- **Date**: 2026-11-16T02:04:00+05:00
- **Decision**: Created isolated branch `overnight/world-and-models` from `rebuild/m4-design-system`. Set up `.gitignore` for `assets-src/*` while tracking `assets-src/SOURCES.md`.
- **Why**: Protects `main` and earlier milestone branches from untested regressions; preserves tight repository size limits (<3 MB per GLB, <1.5 MB per audio file).
- **Alternatives Considered**: Direct work on `rebuild/m4-design-system` (rejected: separates design system milestone from overnight multi-phase asset overhaul).

---

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
