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
