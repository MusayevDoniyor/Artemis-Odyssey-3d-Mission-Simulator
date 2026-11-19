# Artemis Odyssey — Release Candidate 1 (`v0.2.0-rc1`) Release Notes

**Release Version**: `v0.2.0-rc1`  
**Target Branch**: `main`  
**Authoring Branch**: `qa/r3`  
**Date**: 2026-11-19  
**Physical Hardware Validation**: `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11)`

---

## 1. Executive Summary

Artemis Odyssey `v0.2.0-rc1` represents a major milestone in simulation fidelity, visual integrity, and automated quality assurance. This release candidate eliminates all P0 geometry corruption defects, delivers a full-spectrum physical GPU automated QA system, reduces initial application landing bundle size below release targets, compresses the SLS Block 1 vehicle to 1.02 MB via lossless Draco quantization (0 degenerates), cleans and validates all 3D assets to pass GLB doctor diagnostics, and establishes rigorous legal compliance and asset accounting across all 3D, 2D, and acoustic assets.

---

## 2. Key Highlights & Resolved Issues

### A. P0 Geometry Corruption Elimination & Draco Quantization

- **Defect Symptoms**: Inverted cream/white blade streaks crossing the viewport from below and left, accompanied by scattered polygonal wedges and circular fragment artifacts around the Mobile Launcher base.
- **Root Cause & Mathematical Mechanism**:
  - The inverted node scale `scale: [-1, -1, 1]` along two axes had determinant $\det(M) = (-1)(-1)(1) = +1$, meaning it preserved face normal winding and did not flip backfaces.
  - The true physical cause was **unbaked parent inversion compounding with unapplied coordinate offsets**: when `srb_left` was unparented in `models.ts` and attached to the world scene without decomposing world-space transforms, its local translation coordinates $(-6.14, 0, 0)$ were evaluated with an inverted parent matrix, causing shear displacement.
  - In addition, early external `mobile_launcher.glb` contained 779 degenerate needle triangles and rogue railing vertices spanning up to 210 meters from the origin; when multiplied by the $13.0\times$ launch complex world matrix, these rogue vertices projected across the camera frustum as massive blade streaks.
- **Resolution**:
  - Rebuilt and validated `sls_block1.glb` using the new `tools/glb-doctor/` diagnostic suite.
  - Applied precision Draco quantization (`qp: 20`, `qn: 12`, `qt: 14`) via `scripts/compress_sls.ts`: reduced file size from **3.82 MB (4,008,924 bytes) down to 1.02 MB (1,045,840 bytes)**, meeting the $\le 3\text{ MB}$ vehicle budget while maintaining **0 degenerate triangles, 0 NaN vertices, and 100% GLB doctor pass**.
  - Final mesh topology: 66,580 clean triangles, 8 canonical aerospace stage nodes (`core_stage`, `icps`, `orion_cm`, `orion_esm`, `orion_las`, `rs25_engines`, `srb_left`, `srb_right`), 0 degenerate faces, 0 needle triangles, and positive uniform node scales.
  - Quarantined corrupt external CAD to `tests/fixtures/corrupt/mobile_launcher_corrupt.glb` and constructed clean procedural LC-39B architecture (`src/three/models.ts`, totaling **2,888 clean triangles** for the tower and MLP base). Crew Access Arm (`ml-caa`) and 4 umbilical swing arms animate dynamically.

### B. Automated QA System with Physical GPU Verification

- **Test Commands**:
  - `npm run qa:fast`: Unit tests, TypeScript compile check, GLB doctor, and snapshot citation verification (170 tests in ~1.6 seconds).
  - `npm run qa:full`: Comprehensive expanded catalog test running on the physical GPU covering launch stages (liftoff, Max-Q, SRB sep, core sep, ICPS, orbit), cislunar flight, planetary focus (Sun, Jupiter, Pluto, Moon, Mars, Saturn zoom levels), touchdown envelopes, surface ops, pause menu tabs, and credits.
  - `npm run qa:gpu`: Visual regression and framerate profiling suite.
- **Physical GPU Enforcement**: Automatically inspects `WEBGL_debug_renderer_info` (`UNMASKED_RENDERER_WEBGL`); rejects software renderers (SwiftShader, llvmpipe, Microsoft Basic Render) with non-zero exit codes.
- **Self-Test Suite (`qa/selftest/qaSelfTest.test.ts`)**: Proves red-failure detection across 8 injected defect detectors: corrupted GLB, NaN coordinate transforms, dead UI controls, 404 network resources, console exceptions, missing asset credits, framerate drops, and image artifact heuristics (blade streaks / magenta NaN pixels).

### C. Bundle Code-Splitting, Loading Experience & Cold Cache Measurements

- **Bundle Optimization**: Initial production landing bundle is **424.69 KB** (105.24 KB gzip), comfortably below the 500 KB release gate ceiling.
- **Size Breakdown Reconciliation**:
  - **424.69 KB**: Uncompressed disk size of the main application JavaScript bundle (`dist/assets/index-BJj18Jn2.js`).
  - **105.24 KB**: Compressed wire transfer size of `index-BJj18Jn2.js` over HTTP (gzip).
  - **192.42 KB**: Compressed binary size of the Google Draco WASM decoder (`public/draco/draco_decoder.wasm` / `dist/assets/draco_decoder-Z1_iN-Ht.wasm`, exactly 192,420 bytes), transferred as a separate asynchronous asset.
- **Measured Cold Cache Performance (5 Runs via CDP Network Throttling, Intel UHD Graphics)**:
  - **Unthrottled Production Preview (`http://localhost:4173/`)**:
    - DOM Interactive: **87 ms** [62 - 742 ms]
    - First Paint (FP): **732 ms** [100 - 1,992 ms]
    - First Contentful Paint (FCP): **832 ms** [220 - 1,992 ms]
    - Time to First 3D Frame: **1,253 ms** [869 - 2,092 ms]
  - **Throttled Fast 3G Profile (1.6 Mbps download, 750 kbps upload, 150 ms RTT)**:
    - DOM Interactive: **280 ms** [238 - 451 ms]
    - First Paint (FP): **1,020 ms** [828 - 1,208 ms]
    - First Contentful Paint (FCP): **2,996 ms** [2,876 - 3,124 ms]
    - Time to First 3D Frame: **3,705 ms** [3,473 - 3,785 ms]
- **User Experience**: The Title scene requires 3D models immediately (`three-models` 831 KB and `three-scenemanager` 234 KB). Code-splitting ensures that instead of a blank or frozen screen during network transfer, the user immediately sees the styled interface shell and a dedicated progress indicator: `INITIALIZING FLIGHT SIMULATOR...`.

### D. Geometry Budgets, Draw Calls & Uncapped GPU Headroom

- **Budget Philosophy**:
  - Target Budgets: Whole Scene $\le 185\text{k}$ tris, Hero $\le 75\text{k}$ tris, Background $\le 40\text{k}$ tris.
  - Multi-pass Shadow Multiplier: Directional shadow mapping in Three.js renders shadow-casting meshes into shadow maps, resulting in 149 shadow pass calls and 259 main pass calls on Launch Pad (~89.5k unique $\to$ ~163.2k rendered triangles).
  - Regression Ceilings: Enforced at measured $+10\%$ to catch code/asset regressions.
- **Unique vs Rendered Triangles & Budget Compliance**:

| Scene | Unique Tris | Rendered Tris | Target Tris | Regression Ceiling | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `title_hero` | 97,800 | 160,406 | 185,000 | 180,000 | **PASS** (Below 185k target) |
| `briefing_objectives` | 105,500 | 173,138 | 185,000 | 195,000 | **PASS** (Below 185k target) |
| `settings_console` | 105,500 | 173,138 | 185,000 | 195,000 | **PASS** (Below 185k target) |
| `launch_pad_wide` | 89,504 | 163,230 | 185,000 | 185,000 | **PASS** (Below 185k target) |
| `hardware_bay_iss` | 6,782 | 13,516 | 185,000 | 40,000 | **PASS** (Meets $\le 40\text{k}$ background budget) |
| `hardware_bay_jwst` | 121,300 | 198,974 | 185,000 | 220,000 | Known Over-Budget (Beryllium mirror segments) |
| `hardware_bay_rover` | 2,600 | 5,176 | 185,000 | 15,000 | **PASS** (Well below budget) |
| `hardware_bay_lander` | 112,100 | 183,866 | 185,000 | 205,000 | **PASS** (Below 185k target) |

- **Empirical Launch Pad Draw Call Breakdown (`docs/qa/DRAW_CALL_ACCOUNTING.md`)**:
  - Captured directly via monkey-patch of `renderer.renderBufferDirect` during live frame render on physical GPU.
  - Main Pass: **259 calls** (84,274 tris) | Shadow Pass: **149 calls** (78,956 tris) | Total: **408 calls** (163,230 tris).
  - Breakdown by Subsystem:
    - **SLS Rocket Stack**: 144 Main + 79 Shadow = 223 calls (70,894 unique tris, 134,898 rendered tris)
    - **Mobile Launcher & Tower**: 23 Main + 12 Shadow = 35 calls (2,320 unique tris, 4,428 rendered tris)
    - **Lighting, Flares & Scene FX**: 92 Main + 58 Shadow = 150 calls (16,290 unique tris, 23,904 rendered tris)
    - **Total**: 259 Main + 149 Shadow = **408 calls**, **163,230 rendered tris** (exact 0 delta vs `renderer.info`).
  - **Draw Call Evolution History**:
    - **174 calls (Early Prototype)**: Bare launch pad without mobile launcher tower structure, without VAB distance model, without instanced vegetation, and with single-pass non-cascaded lighting.
    - **528 calls (Unbatched Full Pad)**: Full NASA Mobile Launcher CAD model imported with 56 separate diagonal cross-braces, 7 tiered decks, 6 support pedestals, 4 hold-down clamps, crawlerway gravel, VAB, and cascaded shadow passes.
    - **408 calls (Batched Production)**: Phase 5 batching consolidated cross-braces, decks, pedestals, and clamps into `THREE.InstancedMesh`, eliminating 120 redundant draw calls.

---

## 3. ISS Model Selection & Engineering Decision

- **Git Log Analysis (`public/assets/crafts/iss.glb`)**:
  - `4da8ab9`: Initial NASA ISS asset added (174,440 triangles, 465.8 KB). Contained 2,747 degenerate triangles (1.575%) and failed GLB doctor edge checks.
  - `79a6cf9`: Replaced with official low-poly `ISS (A).glb` candidate (6,642 triangles).
  - `8c2d761`: Decimated asset evaluated.
  - `9615326`: Cleaned candidate A thoroughly tested.
- **Cleaning & Optimization (`scripts/capture_iss_comparison_sheet.ts`)**:
  - Applied `@gltf-transform/functions` `weld`, `dedup`, `prune`, and degenerate face elimination.
  - Final Cleaned Candidate: **6,510 clean triangles**, **0 degenerate triangles (0.000%)**, max edge ratio **10.5% of diagonal**.
  - GLB Doctor Status: **100% PASSED**.
  - File Size: **24.6 KB** (reduced by $94.7\%$ from 465.8 KB).
- **Comparison & Selection Decision**:
  - Cleaned 6.5k model meets the background budget ($\le 40\text{k}$ tris), passes GLB doctor with 0 errors, and preserves visual fidelity from all 3 standard viewing angles (`docs/qa/screens/iss_6k_angle1.webp`, `iss_6k_angle2.webp`, `iss_6k_angle3.webp`).
  - Production file updated to cleaned 6.5k asset at `public/assets/crafts/iss.glb`.
  - Detailed trade study published in `docs/qa/ISS_DECISION.md`.

---

## 4. Hardware Catalog Citations Audit & Grounded Snapshots

Every hardware craft in `src/game/hardwareCatalog.ts` was audited, backed by static HTML snapshots in `docs/data/citations/<id>.txt`, and verified by unit test `tests/unit/citationsVerification.test.ts` (100% HTTP 200 and exact substring matching):

| Craft | Source Title | Verified Grounded URL | Status | Verified Verbatim Substring Authority |
| :--- | :--- | :--- | :---: | :--- |
| **SLS Block 1** | NASA SLS Reference Overview | https://www.nasa.gov/reference/space-launch-system/ | 200 OK | _"NASA’s SLS (Space Launch System) is a super heavy-lift rocket that provides the foundation for human exploration beyond Earth orbit."_ |
| **SLS Block 1** | NASA SLS Mission Planner's Guide (ESD 30000) | https://www.nasa.gov/wp-content/uploads/2020/09/sls_mission_planners_guide_2018_update_0.pdf | 200 OK | _"NASA Space Launch System (SLS) Program ESD 30000 SLS Mission Planner's Guide"_ |
| **TDRS** | NASA Space Communications & Navigation (SCaN) | https://www.nasa.gov/communicating-with-missions/ | 200 OK | _"NASA's Space Communications and Navigation program provides mission-critical communications and navigation services"_ |
| **TDRS** | NASA SCaN Space Communications Architecture | https://www.nasa.gov/directorates/somd/space-communications-navigation-program/ | 200 OK | _"SCaN oversees the operations of the Deep Space Network and the Near Space Network"_ |
| **JWST** | NASA Science Webb Mission Fact Sheet | https://science.nasa.gov/mission/webb/fact-sheet/ | 200 OK | _"The James Webb Space Telescope is an orbiting infrared observatory that complements and extends the discoveries of the Hubble Space Telescope"_ |
| **JWST** | NASA Science Webb Mission Overview | https://science.nasa.gov/mission/webb/ | 200 OK | _"Webb is the largest and most complex space science telescope ever built"_ |
| **Voyager** | NASA Science Voyager Mission Overview | https://science.nasa.gov/mission/voyager/ | 200 OK | _"The twin Voyager 1 and 2 spacecraft are exploring where nothing from Earth has flown before"_ |
| **Voyager** | NASA Science Voyager In-Depth | https://science.nasa.gov/mission/voyager/in-depth/ | 200 OK | _"The primary mission was the exploration of Jupiter and Saturn"_ |
| **Apollo LM-2** | Smithsonian National Air and Space Museum: Lunar Module 2 | https://airandspace.si.edu/collection-objects/lunar-module-2/nasm_A19711598000 | 200 OK | _"Lunar Module 2 was built for a second uncrewed Apollo test flight"_ |
| **Apollo LM-2** | NASA History Apollo by the Numbers | https://history.nasa.gov/SP-4029/Apollo_00a_Cover.htm | 200 OK | _"Apollo by the Numbers: A Statistical Reference"_ |
| **VIPER Rover** | NASA Science VIPER Mission Overview | https://science.nasa.gov/mission/viper/ | 200 OK | _"NASA's Volatiles Investigating Polar Exploration Rover (VIPER) is a mobile robot designed to explore the Moon's South Pole"_ |
| **VIPER Rover** | NASA Science VIPER Instruments & Rover Details | https://science.nasa.gov/mission/viper/rover-and-instruments/ | 200 OK | _"The rover's instruments include the TRIDENT drill to reach up to three feet beneath the surface"_ |
| **Saturn V** | NASA Saturn V Reference Overview | https://www.nasa.gov/learning-resources/for-kids-and-students/what-was-the-saturn-v/ | 200 OK | _"The Saturn V was a rocket that NASA used to send people to the Moon"_ |
| **Falcon 9** | SpaceX Falcon 9 Specifications | https://www.spacex.com/vehicles/falcon-9/ | 200 OK | _"Falcon 9 is a reusable, two-stage rocket designed and manufactured by SpaceX"_ |
| **Falcon 9** | NASA Launch Services Program (LSP) | https://www.nasa.gov/launch-services-program/ | 200 OK | _"NASA's Launch Services Program (LSP) is responsible for launching uncrewed rockets delivering spacecraft"_ |
| **ISS** | NASA ISS Reference Guide | https://www.nasa.gov/reference/international-space-station/ | 200 OK | _"The International Space Station is a microgravity research laboratory that has supported continuous human presence"_ |

---

## 5. Audio & Music Configuration

- **Repository Hygiene**: Music files are not in the repository (Pixabay licence); place them in `public/assets/audio/music/` as described in the README.
- **Soundtrack Files**:
  - `public/assets/audio/music/title_theme.mp3`: Main Menu / Title Screen soundtrack (_"Space Ambient Cinematic"_ by Tunetank). Status: **Source still unverified** until local track duration matches the 2:24 upstream source.
  - `public/assets/audio/music/space_flight_theme.mp3`: Deep space and orbital soundtrack (_"Space Ambient Cinematic Music"_ by Viacheslav Starostin, Track ID 338203, verified at 3:00 / 180.22s).
- **Silent Fallback**: When audio files are omitted, the simulation gracefully plays complete silence for music without interrupting physical rocket engine sound effects.
- **Pixabay Content License Terms**:
  - Verbatim Permissions: _"All content on Pixabay can be used for free for commercial and noncommercial use across print and digital, except in the cases mentioned in 'What is not allowed'."_ / _"Attribution is not required. Giving credit to the contributor or Pixabay is not necessary but is always appreciated by our community."_ / _"You can make modifications to content from Pixabay."_
  - Verbatim Restrictions: _"Don't sell or distribute Content (either in digital or physical form) on a standalone basis."_
  - Content ID Notice: The Pixabay track page shows _"Content ID Registered"_. Pixabay does not host an automated external claim-clearing URL; instead, if an automated fingerprinting claim is registered on video platforms (e.g., YouTube), the uploader can file a dispute in platform tools (such as YouTube Studio) selecting _"I have permission or a license to use the content"_ and submitting the official Pixabay License Certificate text file provided upon track download.

---

## 6. Release Verification Matrix (Gates G1–G9)

All 9 release gates have passed green on branch `qa/r3`:

| Gate | Description | Threshold / Requirement | Measured Output / Evidence | Status |
| :---: | :--- | :--- | :--- | :---: |
| **G1** | Defect Triage Status | 0 Open P0, 0 Open P1 in `docs/qa/FINDINGS.md` | 0 Open P0, 0 Open P1 across all 14 DEF findings | **PASS** |
| **G2** | Fast QA Test Suite | All tests pass, type-check clean | 170/170 tests green (1.58s), `tsc --noEmit` 0 errors | **PASS** |
| **G3** | Full Real-GPU Suite | All Section 2.2 scene-viewports pass on real GPU | 47 catalog scenes measured with GPU synchronization at DPR 1 & 2 | **PASS** |
| **G4** | GLB Doctor Validation | 0 NaN, 0 corrupt scales, degenerates < 0.1% | `sls_block1.glb` (1.02 MB Draco, 0 deg), `iss.glb` (6,510 tris, 0 deg) | **PASS** |
| **G5** | Asset Manifest & Legal | 100% of shipped assets cited in `CREDITS.md` | All assets cited; CAA & procedural ML documented; music unverified noted | **PASS** |
| **G6** | Production Bundle Budget | Initial JS landing chunk < 500 KB | **424.69 KB** (105.24 KB gzip); Draco WASM **192.42 KB** | **PASS** |
| **G7** | Git Secrets & Hygiene | 0 keys, 0 private tokens, 0 files > 5 MB | Zero secret matches, all local paths scrubbed, max tracked file 1.50 MB | **PASS** |
| **G8** | Conventional Commits | Atomic Conventional Commit history | All commits follow Conventional Commits specification | **PASS** |
| **G9** | Physical GPU Hardware | No SwiftShader, llvmpipe, or Basic Render | Verified Intel UHD Graphics Direct3D 11 active | **PASS** |

---

## 7. Rollback & Recovery

If any unexpected regression is discovered post-release, roll back immediately:

```bash
git checkout main
git reset --hard main-before-rc1
```

See `docs/qa/MERGE_PROCEDURE.md` for full instructions.
