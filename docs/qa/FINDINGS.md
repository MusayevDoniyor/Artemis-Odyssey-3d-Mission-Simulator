# Artemis Odyssey — Master QA Findings Registry (`docs/qa/FINDINGS.md`)

This register records all engineering defects, geometry anomalies, visual regressions, and data integrity findings raised across the project lifecycle. In accordance with QA release rails, IDs are permanent and are never renumbered.

**Release Criteria**: Release requires **0 open P0** and **0 open P1** findings.

---

## 1. Findings Master Table

| ID | Title / Subsystem | Current Severity | Severity History | Status | Commit / Fix Evidence |
|:---|:---|:---:|:---:|:---:|:---|
| **DEF-01** | Rogue needle triangles & streaks in SLS & pad | P0 | `P0` | **RESOLVED** | Commit `67ca7c0`, healed `sls_block1.glb`, `tools/glb-doctor` |
| **DEF-02** | Craft IDs & Inspector Parts Mismatch (SLS node split) | P1 | `P1` | **RESOLVED** | Commit `cd168f0`, `sls_block1.glb` 8-node hierarchy |
| **DEF-03** | Title Screen Baseline Drift / Camera jitter | P2 | `P1 → P2` (Review #2) | **RESOLVED** | Commit `a6ad268`, seeded Mulberry32 RNG & `resetTitleOrbit()` |
| **DEF-04** | Procedural nameless meshes in scene graph traversal | P2 | `P1 → P2` (Review #2) | **RESOLVED** | Commit `392cc5d`, `models.ts` named groups & traversal audit |
| **DEF-05** | Deprecated "Base Camp" entry in Hardware Bay selection | P1 | `P1` | **RESOLVED** | Commit `47bf783`, `hardwareCatalog.ts` & `SpaceSceneManager.ts` |
| **DEF-06** | LM-2 Lander missing fictional concept honesty badge | P1 | `P1` | **RESOLVED** | Commit `b1f728a`, `hardwareCatalog.ts` disclosure badges |
| **DEF-07** | ISS Truss detail & degenerate triangles in candidate A | P1 | `P2 → P1` (Review #2) | **RESOLVED** | Cleaned `iss.glb` (6,510 tris, 0 degen, 24.6 KB, GLB doctor pass) |
| **DEF-08** | SLS Height Inconsistency (94.62 m 3D vs 98.3 m published) | P2 | `P2` | **RESOLVED** | `tests/unit/slsPerPartDimensions.test.ts` & catalog envelope labels |
| **DEF-09** | NaN Crash in `lm-ascent` node during crash/debrief transition | P0 | `P0` | **RESOLVED** | Commit `32309c8`, `src/three/SpaceSceneManager.ts` |
| **DEF-10** | Background Model Leakage / Cross-Scene Visibility Pollution | P1 | `P1` | **RESOLVED** | Commit `61a80c6`, `SpaceSceneManager.ts:1720-1785` |
| **DEF-11** | External Mobile Launcher CAD corruption (19.3k tris, 779 needles) | P0 | `P0` | **RESOLVED** | Commit `67ca7c0`, replaced with procedural LC-39B tower (2,888 tris) |
| **DEF-12** | Cold-cache loading benchmark network throttling inversion | P2 | `P2` | **RESOLVED** | CDP cache purge & disabled cache in `scripts/measure_loading_cdp_5runs.ts` |
| **DEF-13** | Hardware catalog ungrounded citations & Wikipedia text | P1 | `P1` | **RESOLVED** | Snapshots in `docs/data/citations/` & `citationsVerification.test.ts` |
| **DEF-14** | `sls_block1.glb` file size exceeded 3 MB budget (3.82 MB) | P1 | `P1` | **RESOLVED** | Draco quantization (`qp: 20`) to 1.02 MB with 0 degenerates |

---

## 2. Severity Change Rationale

### DEF-03: Title Screen Drift (`P1 → P2`)
- **Initial Classification**: `P1` because automated visual regression tests (`pixelmatch`) flagged inconsistent 1.2–3.5% pixel diffs between runs, tripping QA threshold gates.
- **Downgrade Justification**: Root cause investigation revealed the drift was caused purely by unseeded orbital starfield particles and continuous camera angular momentum in the background render loop. There was zero functional failure, zero UI breakage, and zero user-visible gameplay corruption. Once Mulberry32 deterministic seeding was wired in, it was downgraded to `P2` (cosmetic polish) and resolved.

### DEF-04: Procedural Nameless Meshes (`P1 → P2`)
- **Initial Classification**: `P1` because scene-graph audits could not attribute draw calls to verified architectural subsystems, reporting generic `Mesh` or unnamed `Group`.
- **Downgrade Justification**: Nameless Three.js nodes are an internal scene-graph organization issue that does not degrade WebGL draw call throughput, GPU frame time, or user-facing visual rendering. It was downgraded to `P2` (engineering architecture / diagnostics) and resolved by adding explicit semantic `.name` and `.partId` tags across `src/three/models.ts`.

### DEF-07: ISS Model Integrity & Background Budget (`P2 → P1`)
- **Initial Classification**: `P2` because the issue was initially framed as an optional asset polish between two external CAD models.
- **Downgrade Justification**: When candidate A was evaluated against `tools/glb-doctor`, it contained 132 zero-area degenerate triangles (1.987%), causing an immediate release gate failure. Simultaneously, the legacy 174k model in production violated the background model budget by +336% (174k vs 40k target). Because shipping a model with degenerate triangles or an egregious budget overrun violates release criteria, severity was upgraded to `P1`. Resolved by cleaning candidate A (weld, dedup, prune) to **6,510 triangles, 0 degenerates, 24.6 KB file size**, which passes GLB doctor 100%.

---

## 3. Detailed Findings & Fix Evidence

### DEF-01: Rogue Needle Triangles & Streaks in Mobile Launcher & SLS
- **Severity**: P0 (Visual Corruption / Geometry Glitch)
- **Status**: **RESOLVED**
- **Affected Scenes**: `launch_pad_wide`, `hardware_bay_sls_assembled`, `title_hero`
- **Symptom**: Large white/cream blade-like streaks crossing the screen from the lower-left corner; scattered white fragments below the launch pad base disk.
- **Root Cause**:
  1. `srb_left` mesh in `sls_block1.blend` contained 2 rogue out-of-bounds vertices located at coordinates $x = -34.93\text{ m}, z = 48.86\text{ m}$ (far outside the 5m rocket radius).
  2. Node `srb_left` possessed an inverted 3-axis negative scale transform `[-0.823, -1.309, -0.823]`, which created negative-determinant matrices and broke backface culling in WebGL pipelines.
  3. `mobile_launcher_corrupt.glb` contained needle triangles whose edge lengths exceeded 75.1% of the total bounding-box diagonal.
- **Remediation**:
  - Removed rogue vertices using Blender geometry pipeline script `scripts/build_flawless_sls.py`.
  - Inverted transforms baked directly into vertex coordinates with normalized counter-clockwise winding.
  - Sanitized `mobile_launcher.glb` and added regression tests `tests/regression/geometryDoctorRegression.test.ts`.
- **Evidence**:
  - `docs/qa/screens/sls_corrupt_wireframe_streaks.png` (wireframe showing rogue vertices)
  - `tools/glb-doctor/index.ts public/assets/rockets/sls_block1.glb` passes with 0 errors (0 degenerate triangles, 0 NaN, max edge 55.9%).
  - Hardware Bay 0%, 35%, and 100% explosion renders 100% clean.

---

### DEF-02: Craft IDs & Inspector Parts Mismatch (SLS Node Split)
- **Severity**: P1 (Functional / Content Integrity)
- **Status**: **RESOLVED**
- **Affected Scenes**: `hardware_bay_sls_assembled`, `hardware_bay_sls_exploded_35`, `hardware_bay_sls_exploded_100`
- **Symptom**: The Hardware Bay vehicle inspector displayed 7 distinct technical subsystems, but early 3D models grouped the entire Orion stack into a single monolithic node `orion_las`. Selecting Orion CM or ESM could not highlight individual components.
- **Root Cause**: Incomplete node separation during initial CAD export from NASA `.blend` source.
- **Remediation**: Separated `sls_block1.glb` into 8 discrete aerospace nodes matching `hardwareCatalog.ts` 1:1. Added individual highlight shaders and inspection bounds.
- **Evidence**: Verified by `tests/sim/models/slsBlock1Model.test.ts` and automated node coverage suite in `qa/qaAutomatedNodeCoverage.test.ts`.

---

### DEF-03: Title Screen Baseline Drift / Camera Jitter
- **Severity**: P2 (Visual Polish / Determinism)
- **Status**: **RESOLVED**
- **Affected Scenes**: `title_hero` (1440x900, 1920x1080, 390x844)
- **Symptom**: Visual regression tests (`pixelmatch`) occasionally flagged 1.2–3.5% pixel diffs between consecutive runs of the title screen.
- **Root Cause**: Unseeded Math.random calls in background orbital starfield particle generation, combined with non-zero camera angular velocity in unpaused animation loops.
- **Remediation**:
  - Replaced standard random generator with deterministic Mulberry32 seeded RNG (`createSeededRNG`).
  - Added `resetTitleOrbit()` method to `SpaceSceneManager.ts` resetting camera coordinates to $[18, 12, 38]$ and target to $[0, 10, 0]$ before QA capture.
- **Evidence**: Baseline diffs between identical runs dropped to 0.00% across all viewports.

---

### DEF-04: Procedural Nameless Meshes in Scene Graph Traversal
- **Severity**: P2 (Engineering Architecture / Diagnostics)
- **Status**: **RESOLVED**
- **Affected Scenes**: All scenes using `createLaunchComplexAndSLS`
- **Symptom**: Traversal audits reported large collections of meshes under generic names like `Mesh` or unnamed `Group`, hindering draw-call attribution.
- **Root Cause**: Procedural helper functions created Three.js groups without assigning explicit `.name` strings.
- **Remediation**: Added explicit semantic `.name` identifiers across `src/three/models.ts` and instrumented traversal audits with hierarchical subsystem classification.
- **Evidence**: `docs/qa/DRAW_CALL_ACCOUNTING.md` attributes 100% of draw calls to verified named groups with 0 unexplained meshes.

---

### DEF-05: Deprecated "Base Camp" Entry in Hardware Bay Selection
- **Severity**: P1 (UI / Content Dead Ends)
- **Status**: **RESOLVED**
- **Affected Scenes**: `hardware_bay`
- **Symptom**: Hardware Bay craft selector included an entry for "Base Camp" which had no dedicated vehicle model (it is a surface habitat environment, not an isolated spacecraft). Clicking it produced empty inspection states.
- **Root Cause**: Vestigial entry from initial prototype design.
- **Remediation**: Removed `outpost` from the active Hardware Bay carousel (`HARDWARE_ORDER` in `src/game/hardwareCatalog.ts`). Base Camp is correctly rendered as part of the live surface simulation in `surface_moon` and `surface_mars`.
- **Evidence**: Verified by unit test `tests/unit/hardwareCatalog.test.ts`.

---

### DEF-06: LM-2 Lander Missing Fictional Concept Honesty Badge
- **Severity**: P1 (Scientific Honesty / Content Accuracy)
- **Status**: **RESOLVED**
- **Affected Scenes**: `hardware_bay_lander`, `landing_touchdown_success`
- **Symptom**: The LM-2 lunar lander model (a modern educational concept combining Apollo LM staging with contemporary composite cockpits) was presented alongside historical NASA hardware without explicit disclosure of its conceptual nature.
- **Root Cause**: Missing honesty metadata tag in catalog definitions.
- **Remediation**:
  - Assigned `modelHonestyTag: "Fictional Educational Concept"` in `src/game/hardwareCatalog.ts`.
  - Added visible "FICTIONAL CONCEPT LANDER" badge to inspector cards and HUD telemetry overlay.
- **Evidence**: Verified by `tests/sim/catalogHonesty.test.ts`.

---

### DEF-07: ISS Truss Detail & Degenerate Triangles in Candidate A
- **Severity**: P1 (Geometry Integrity / Performance Budget)
- **Status**: **RESOLVED**
- **Affected Scenes**: `hardware_bay_iss`
- **Symptom**: Low-poly NASA candidate `ISS (A).glb` (6,642 triangles) failed GLB doctor due to 132 zero-area degenerate triangles (1.987%), while production `iss.glb` (174k triangles) exceeded the 40k background model budget.
- **Root Cause**: Raw CAD export contained un-welded coplanar slivers along module seams.
- **Remediation**: Cleaned `ISS (A).glb` using `@gltf-transform` pipeline: executed `weld`, `dedup`, `prune`, and customized zero-area triangle filtering. Cleaned model has **6,510 triangles**, **0 degenerate triangles**, 24.6 KB file size, and passes GLB doctor 100%.
- **Evidence**:
  - `tools/glb-doctor/index.ts public/assets/crafts/iss.glb` -> PASSED.
  - 3-angle comparison screenshots captured at `docs/qa/screens/iss_6k_angle1.webp`, `iss_6k_angle2.webp`, `iss_6k_angle3.webp`.
  - Detailed trade study in `docs/qa/ISS_DECISION.md`.

---

### DEF-08: SLS Height Inconsistency (94.62 m 3D vs 98.3 m Published)
- **Severity**: P2 (Educational / Numerical Reconciliation)
- **Status**: **RESOLVED**
- **Affected Scenes**: `hardware_bay_sls_assembled`
- **Symptom**: The 3D model bounding envelope measured 94.62 m from engine bell to LAS tip, whereas the vehicle inspector displayed 98.3 m.
- **Root Cause**:
  - LAS lightning mitigation rod at apex omitted in 3D geometry: $-0.98\text{ m}$.
  - Mobile Launcher 0-level elevation standoff clearance below nozzle exit: $-0.83\text{ m}$.
  - CAD interstage nesting overlap between Core Stage LVSA and ICPS: $-1.87\text{ m}$.
  - Total deficit: $0.98 + 0.83 + 1.87 = \mathbf{3.68\text{ m}}$ ($98.3 - 94.62 = 3.68\text{ m}$).
- **Remediation**: In `src/game/hardwareCatalog.ts`, updated technical dimensions to label Core Stage, SRBs, and LAS as `"Model envelope: X m (published: Y m)"`. Implemented deterministic test `tests/unit/slsPerPartDimensions.test.ts`.
- **Evidence**: `tests/unit/slsPerPartDimensions.test.ts` passes 100%.

---

### DEF-09: NaN Crash in `lm-ascent` Node During Crash/Debrief Transition
- **Severity**: P0 (Runtime Crash / NaN Propagation)
- **Status**: **RESOLVED**
- **Affected Scenes**: `landing_crash_debrief`
- **Symptom**: When transitioning from active landing into crash state, an uninitialized velocity vector caused division by zero in ascent module orientation calculations, resulting in `NaN` matrix values and blanking the screen.
- **Root Cause**: `SpaceSceneManager.ts` lacked a numerical finite guard on crash scatter displacement vectors.
- **Remediation**: Added `Number.isFinite()` validation guards in `SpaceSceneManager.ts` (commit `32309c8`).
- **Evidence**: `tests/sim/landingOutcomeFuzz.test.ts` passes 500 randomized runs with 0 NaN or Infinity occurrences.

---

### DEF-10: Background Model Leakage / Cross-Scene Visibility Pollution
- **Severity**: P1 (Visual Polish / Resource Leak)
- **Status**: **RESOLVED**
- **Affected Scenes**: `space`, `hardware_bay`
- **Symptom**: Meshes from previously visited scenes remained set to `visible = true` when transitioning to deep space or hardware bay turntable.
- **Root Cause**: Implicit visibility inheritance without centralized scene reset.
- **Remediation**: Hardened `syncScene` in `src/three/SpaceSceneManager.ts:1720-1785` with exhaustive mutually exclusive visibility flags for all subsystems.
- **Evidence**: Verified by `scripts/scene_traversal_audit.ts` confirming zero extraneous meshes in isolated craft bays.

---

### DEF-11: External Mobile Launcher CAD Corruption
- **Severity**: P0 (Geometry Defect / Bloat)
- **Status**: **RESOLVED**
- **Affected Scenes**: `launch_pad_wide`, `launch_pad_close_tower`
- **Symptom**: Early external `mobile_launcher.glb` had 19,276 triangles, 779 needle triangles, and rogue vertices extending up to $y = 210.4\text{ m}$.
- **Root Cause**: Corrupted third-party CAD export with non-planar railing geometry.
- **Remediation**: Eliminated external GLB from production; quarantined file to `tests/fixtures/corrupt/mobile_launcher_corrupt.glb`. Replaced with procedural LC-39B architecture in `src/three/models.ts` (**2,888 clean triangles** for tower + base). Retractable Crew Access Arm and 4 umbilical arms modeled procedurally and animated.
- **Evidence**:
  - `tests/regression/geometryDoctorRegression.test.ts` verifies corrupt fixture fails and production assets pass.
  - `tests/unit/crewAccessArmAnimation.test.ts` verifies 2,888 procedural triangles and arm rotation ($0\text{ rad}$ at T-10s to $-0.78\text{ rad}$ at T-0s).
  - Screenshots: `docs/qa/screens/launch_pad_caa_extended_t10.png` and `launch_pad_caa_retracted_t0.png`.

---

### DEF-12: Cold-Cache Loading Benchmark Network Throttling Inversion
- **Severity**: P2 (Benchmarking Integrity)
- **Status**: **RESOLVED**
- **Affected Scenes**: First load / Preview (`http://localhost:4173/`)
- **Symptom**: Early performance runs showed Fast 3G achieving faster DOM interactive and First Paint than unthrottled runs.
- **Root Cause**: Browser cache was not cleared prior to Fast 3G runs, allowing chunks to be served from memory cache.
- **Remediation**: Created `scripts/measure_loading_cdp_5runs.ts` utilizing CDP `Network.clearBrowserCache` and `Network.setCacheDisabled` across 5 cold runs per profile.
- **Evidence**: `docs/qa/LOADING_BENCHMARK.md` shows Unthrottled First 3D Frame median **1,253 ms** vs Fast 3G **3,705 ms**.

---

### DEF-13: Hardware Catalog Ungrounded Citations & Wikipedia Text
- **Severity**: P1 (Scientific Integrity / Provenance)
- **Status**: **RESOLVED**
- **Affected Subsystems**: `src/game/hardwareCatalog.ts` (all 9 craft)
- **Symptom**: SLS quote copied Wikipedia's lead sentence; VIPER cited a Mars 2020 URL; several older NTRS URLs returned soft 404s.
- **Root Cause**: Unverified copy pasted during early prototyping.
- **Remediation**:
  - Updated all 18 citations to authentic NASA Science and National Air & Space Museum pages.
  - Replaced Wikipedia sentence with official NASA SLS reference text.
  - Replaced Mars 2020 URL with official NASA Science VIPER Mission & Instruments overview.
  - Downloaded live HTML snapshots to `docs/data/citations/<id>.txt`.
  - Added unit test `tests/unit/citationsVerification.test.ts` verifying HTTP 200 and exact substring inclusion.
- **Evidence**: `tests/unit/citationsVerification.test.ts` passes 100%.

---

### DEF-14: `sls_block1.glb` File Size Exceeded 3 MB Budget
- **Severity**: P1 (Performance / Asset Budget)
- **Status**: **RESOLVED**
- **Affected Scenes**: `launch`, `hardware_bay`
- **Symptom**: `sls_block1.glb` uncompressed was 3.82 MB (4,008,924 bytes), exceeding the 3.0 MB rocket asset limit. Standard Draco quantization (`qp: 14`) generated 1,917 degenerate triangles due to fine grid collapse across a 96m vehicle.
- **Root Cause**: Low bit-depth position quantization in Draco encoder.
- **Remediation**: Implemented precision quantization ladder (`scripts/compress_sls.ts`) selecting `quantizePosition: 20`, `quantizeNormal: 12`, `quantizeTexcoord: 14`.
- **Evidence**: File size dropped to **1,045,840 bytes (1.02 MB)**, well under 3.0 MB budget. `tools/glb-doctor` reports **0 degenerate triangles, 0 NaN, result PASSED 100%**.

---
*Registry maintained in accordance with Artemis Odyssey Engineering Constitution.*
