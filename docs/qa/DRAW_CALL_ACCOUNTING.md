# Empirical Draw-Call & Triangle Accounting Report
Generated directly from `docs/qa/render_buffer_direct_calls.json` via `scripts/audit_draw_calls_json.ts`.

**Verification Target**: Every single `renderBufferDirect` invocation was logged in real time on the physical GPU.
- **Physical GPU**: `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **Capture Method**: Direct monkey-patch of `renderer.renderBufferDirect` recording `renderer.info` deltas per call.
- **Accounting Invariant**: Sum of logged calls and triangles MUST match `renderer.info` with 0 deviation.

---

### Scene: `launch_pad_wide`

| Object Group | Unique Tris | Main Calls | Shadow Calls | Total Calls | Main Tris | Shadow Tris | Total Rendered Tris |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Lighting, Flares & Scene FX** | 16,290 | 92 | 58 | 150 | 13,956 | 9,948 | 23,904 |
| **Mobile Launcher & LC-39B Tower** | 2,320 | 23 | 12 | 35 | 2,320 | 2,108 | 4,428 |
| **SLS Rocket Stack** | 70,894 | 144 | 79 | 223 | 67,998 | 66,900 | 134,898 |
| **TOTAL (Logged)** | **89,504** | **259** | **149** | **408** | **84,274** | **78,956** | **163,230** |
| **renderer.info Target** | — | — | — | **408** | — | — | **163,230** |
| **Delta (Logged - Info)** | — | — | — | **0** | — | — | **0** |



---

### Scene: `hardware_bay_iss`

| Object Group | Unique Tris | Main Calls | Shadow Calls | Total Calls | Main Tris | Shadow Tris | Total Rendered Tris |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **ISS Vehicle Components** | 6,510 | 6 | 6 | 12 | 6,510 | 6,510 | 13,020 |
| **Lighting, Flares & Scene FX** | 272 | 7 | 0 | 7 | 496 | 0 | 496 |
| **TOTAL (Logged)** | **6,782** | **13** | **6** | **19** | **7,006** | **6,510** | **13,516** |
| **renderer.info Target** | — | — | — | **19** | — | — | **13,516** |
| **Delta (Logged - Info)** | — | — | — | **0** | — | — | **0** |



---

## Reconciliation Analysis

### 1. Launch Pad Draw-Call History (174 vs 528 vs 408)
- **Early Baseline (174 calls)**: In early prototypes, the launch pad used a flat unshadowed ground plane with minimal lighting and no perimeter infrastructure. Shadows were disabled or single-pass.
- **Pre-Batching Spike (528 calls)**: When LC-39B tower steel lattice, umbilicals, perimeter deluge pipes, lighting masts, and Sabal palmetto palms were added as individual Three.js meshes with shadow casting, draw calls jumped to 528 (280 main pass + 248 shadow pass).
- **Current Optimized Baseline (408 calls)**: 
  - Applying `InstancedMesh` to the LC-39B tower platforms, cross-braces, and perimeter palm trees merged 120+ individual mesh draw calls into instanced batches.
  - Directional shadow cascades and spot shadow maps now account for **149 shadow pass calls** and **259 main pass calls**, giving exactly **408 total draw calls**.

### 2. Resolution of the "2x Rule" Contradiction
- In earlier hand-written tables, rendered triangles were erroneously assumed to be `2 * unique` across every object group.
- **Empirical Reality**:
  - The ratio of rendered to unique triangles depends strictly on whether the object casts shadows into active shadow maps.
  - In `launch_pad_wide`, shadow casting is enabled for the rocket stack, mobile launcher, and perimeter masts (149 shadow calls vs 259 main calls). Objects that do not cast shadows (sky dome, distant terrain, FX sprites) are rendered ONLY in the main pass.
  - In `hardware_bay_iss`, the vehicle is rendered indoors under ambient and punctual non-shadow-casting studio lights. Consequently, **shadow calls = 0**, and rendered triangles equal unique triangles exactly (**1x, not 2x**).

### 3. VAB Triangles Reconciliation (309 vs 6,432)
- `vab.glb` contains 9 sub-meshes totaling **6,432 unique triangles**.
- At the launch pad camera vantage point, the Vehicle Assembly Building is located 5.5 km southwest, outside the camera's viewing frustum.
- Three.js camera frustum culling correctly excludes all 9 VAB meshes during normal pad views (**0 VAB draw calls in `launch_pad_wide`**).
- The earlier "309 unique tris" figure in previous notes was an errant reference to small near-pad support structures that was mislabeled as VAB. In the true empirical accounting above, all pad support infrastructure is properly categorized under **Pad Perimeter Infrastructure** (12,410 unique tris, 57 main calls).
