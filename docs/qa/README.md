# Artemis Odyssey Automated QA System Documentation

This document explains the architecture, commands, execution workflows, and verification standards for the Artemis Odyssey Automated Quality Assurance (QA) System.

---

## 1. Commands Overview

The QA system provides four primary npm scripts defined in `package.json`:

```bash
# 1. Fast smoke test (< 2 minutes, headless/node)
npm run qa:fast

# 2. Comprehensive physical GPU run (full catalog, 600-frame perf profiling, a11y, leak test)
npm run qa:full

# 3. Visual and performance suite only (faster iteration on rendering and FPS)
npm run qa:gpu

# 4. Baseline regeneration (requires explicit human review flag)
npm run qa:update-baselines -- --i-reviewed-the-contact-sheet
```

---

## 2. Real Physical GPU Rails & Hardware Verification

All visual, shader, geometry, and performance tests **must run on physical GPU hardware**. Software emulators (SwiftShader, llvmpipe, Microsoft Basic Render Driver, Mesa generic) are rejected by `qa/helpers/gpu.ts`.

### How Physical GPU Verification Works:
1. Playwright launches Chromium with hardware acceleration flags:
   - `--use-angle=d3d11`
   - `--ignore-gpu-blocklist`
   - `--enable-gpu-rasterization`
   - `--enable-webgl`
   - `--enable-webgl2`
2. Upon page load, the harness queries the WebGL context:
   - `gl.getParameter(gl.RENDERER)`
   - `dbg.getParameter(dbg.UNMASKED_RENDERER_WEBGL)`
   - `dbg.getParameter(dbg.UNMASKED_VENDOR_WEBGL)`
3. The renderer string is matched against a blacklist regex (`/swiftshader|llvmpipe|software|microsoft basic render/i`).
4. If a software emulator is detected, the run aborts immediately with exit code 1.
5. The verified physical GPU name (e.g., `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11)`) is recorded in:
   - `qa-report/index.html` header badge
   - `qa-report/results.json`
   - `qa-report/perf.json`
   - `docs/qa/LATEST_SUMMARY.md`

---

## 3. How to Read the QA Report

Each run outputs an interactive HTML report to `qa-report/index.html` (gitignored to keep repo size minimal, while `docs/qa/LATEST_SUMMARY.md` is committed):

1. **Header Section**:
   - Status badge: `ALL GATES PASSED (0 P0 / 0 P1)` (Green) vs `RELEASE GATES BLOCKED` (Red).
   - Physical GPU renderer and hardware vendor.
   - Defect counts: P0 (Critical/Crash/Corruption), P1 (Floor breach/Console error/404), P2 (Visual target missed).
2. **Summary Table**:
   - Every catalog scene across viewports (`1440x900`, `1920x1080`, `390x844`).
   - `p50 FPS`: Measured median FPS over 600 frames. Floor is 30 FPS; target is 60 FPS (45 FPS for surface/landing).
   - `p95 Frame Time`: 95th percentile frame delta. Floor is $\le 50.0\text{ ms}$.
   - `Triangles & Draw Calls`: Real-time WebGL pipeline load.
   - `Visual Diff`: Pixelmatch difference percentage against blessed baseline.
   - `Status`: `PASS`, `P0`, `P1`, `P2`, or `P3`.
3. **Scene Cards & Visual Evidence**:
   - High-resolution screenshot preview.
   - Expandable console error and warning logs.
   - Image heuristic flags (e.g., blade streak detector, magenta NaN glitch detector).

---

## 4. How to Bless or Update Baselines

Visual regression testing prevents unintended visual changes or shader glitches:

1. **Initial Baseline Generation**:
   ```bash
   npm run qa:update-baselines -- --i-reviewed-the-contact-sheet
   ```
   *Note*: The runner will refuse to overwrite baselines without `--i-reviewed-the-contact-sheet`.
2. **Reviewing Baselines**:
   - Inspect the images in `qa/baselines/` or the contact sheet in `qa-report/index.html`.
   - Record an honest, one-line visual assessment for each scene in `qa/baselines/REVIEW.md`.
   - Mark scenes as `[BLESSED]` only if no visible defects (streaks, missing parts, misalignments) are present.
   - If an unresolved defect exists, mark as `[UNBLESSED - DEFECT DETECTED]` and file an issue.

---

## 5. How to Add a Scene to the Catalog

To add a new test scenario, edit `qa/scenes.ts`:

```typescript
{
  id: 'hardware_bay_my_new_craft',
  name: 'Hardware Bay: My New Spacecraft (Assembled)',
  category: 'hardware_bay',
  sceneId: 'hardware_bay',
  params: { craft: 'my-craft-id', explodePct: 0 },
  camera: { position: [0, 10, 25], target: [0, 5, 0], fov: 45 },
  viewports: DEFAULT_VIEWPORTS,
  requiredObjects: ['chassis', 'solar_panels', 'antenna'],
  budget: {
    minTriangles: 10000,
    maxTriangles: 80000,
    maxDrawCalls: 90,
    targetFps: 60,
    floorFps: 30,
  },
  description: 'Detailed inspection of new spacecraft model.',
}
```

Every entry defines:
- `id`: Unique identifier for filenames and reports.
- `sceneId` & `params`: Instructions passed to `window.__QA__.jumpToScene()`.
- `camera`: Camera position, look-at target, and FOV.
- `requiredObjects`: Mesh names or DOM test-ids that must be visible in the scene graph.
- `budget`: Performance floor (p50 $\ge 30$) and target FPS, plus triangle and draw call limits.
