# Changelog

All notable changes to **Artemis Odyssey** are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.2.0-rc1] - 2026-11-18

### Added
- **Automated QA & Real-GPU Harness**:
  - Implemented `npm run qa:fast`, `npm run qa:full`, `npm run qa:gpu`, and `npm run qa:update-baselines` with real physical GPU enforcement (`WEBGL_debug_renderer_info` Direct3D 11 / OpenGL).
  - Added deterministic `window.__QA__` harness in dev and preview builds (`?qa=1`) with seeded RNG, camera presets, fixed-timestep simulation stepping, and scene jumping.
  - Added 24-scene comprehensive catalog covering all launch, spaceflight, surface, and vehicle inspection modes across multiple viewports (1440x900, 1920x1080, 390x844).
  - Added self-test suite (`qa/selftest/qaSelfTest.test.ts`) verifying that synthetic regressions (corrupted GLB, NaN vectors, dead buttons, 404s, console errors, missing credits, FPS drops, image artifacts) fail red.
- **GLB Doctor Diagnostic Engine (`tools/glb-doctor/`)**:
  - Diagnostic suite reporting vertex/triangle counts, world bounding boxes, NaN/Infinity vertices, degenerate triangle fractions, needle triangle ratios, node transform scale inversions, texture formats, and compression bit rates.
- **In-Game Credits & Legal Screen**:
  - Dedicated "Credits & Legal" panel in `GameMenuModal.tsx` and title overlay referencing official NASA public domain works, Solar System Scope textures, SIL OFL fonts, Pixabay soundtrack licenses, and Content ID notices.
- **Performance & Architectural Optimizations**:
  - Rollup bundle code-splitting with manual chunking for Three.js, Lucide, and React, coupled with dynamic `import('./three/SpaceSceneManager')`, reducing initial landing JavaScript bundle from **1,719 KB** to **418.67 KB** (103.57 KB gzip).
  - Added initial simulator boot loader overlay ("INITIALIZING FLIGHT SIMULATOR...") to guarantee smooth visual feedback during dynamic import.
  - Asynchronous WebGL shader pre-warming via `renderer.compileAsync` during startup.

### Fixed
- **P0 Geometry Corruption**:
  - Root-caused and resolved blade-like streaks and base wedge geometry corruption in SLS Block 1: stripped inverted coordinate scales (`[-1, -1, 1]`) and repaired corrupted meshes, reducing the SLS GLB to 66,580 clean triangles with 0 degenerate faces.
- **Launch Pad Draw Call Reduction**:
  - Batched 56 LC-39B tower diagonal X-bracing struts, 7 tiered platforms, 6 MLP foundation support pedestals, and 4 hold-down clamps into `THREE.InstancedMesh`, dropping pad draw calls from **528–534** down to **400–404** per frame while maintaining 60 FPS.
- **Planetary Texture Optimization**:
  - Rescaled Ceres surface map from 4096 to 2048 (down to 552 KB MozJPEG), freeing over 3 MB decoded texture VRAM.
- **Vehicle Assembly Building (VAB) Trademark Compliance**:
  - Verified neutral industrial cladding on VAB geometry per Title 14 CFR § 1221.110(a) and NASA Media Usage Guidelines § 2.1.
- **Apollo Saturn V Triangle Count**:
  - Confirmed and verified authentic 34,382 triangle budget using the GLB doctor.
- **Soundtrack Integration**:
  - Standardized background music to gitignored `public/assets/audio/music/`, eliminated synthetic placeholder tones in favor of clean silent fallback.
