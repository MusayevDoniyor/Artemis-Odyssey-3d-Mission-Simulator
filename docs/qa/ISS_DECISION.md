# ISS Model Trade Study & Empirical Decision Record
**Defect Reference**: `DEF-07` (ISS model triangle budget & geometry integrity)

## 1. Candidate Comparison

| Parameter | Legacy Candidate (`iss_107k.glb`) | Cleaned Candidate A (`public/assets/crafts/iss.glb`) |
| :--- | :---: | :---: |
| **Origin** | NASA 3D Resources / Sketchfab (Commit `4da8ab9`) | Cleaned & Welded Low-Poly Model (Commit `79a6cf9` & `9615326`) |
| **File Size (Wire)** | **465.8 KB** | **24.6 KB** (94.7% reduction) |
| **Unique Triangles** | **174,440** (Exceeds background budget by +336%) | **6,510** (Meets $\le 40\text{k}$ budget with 84% headroom) |
| **Degenerate Triangles** | **2,747 (1.575%)** (Failed $> 0.100%$) | **0 (0.000%)** (100% Passed) |
| **Max Edge / Diagonal Ratio** | **65.0%** (Failed $> 60.0%$) | **10.5%** (Passed) |
| **GLB Doctor Verification** | **REJECTED (FAIL)** | **ACCEPTED (PASS 100%)** |
| **Rendering Draw Calls** | 12 calls | 12 calls |
| **Visual Artifacts** | Z-fighting on solar panels, needle spikes | Clean planar geometry, zero flickering |

## 2. Multi-Angle Visual Inspection (Cleaned 6.5k Candidate)
- **Angle 1 (Truss & Solar Arrays)**: `docs/qa/screens/iss_6k_angle1.webp` — S0/P1/S1 truss structure, 8 solar array wings, and heat rejection radiators rendered with clean silhouette and zero needle distortion.
- **Angle 2 (45° Perspective)**: `docs/qa/screens/iss_6k_angle2.webp` — Integrated Canadarm2, Destiny laboratory, Columbus, and Kibo modules clearly distinguishable without geometry self-intersection.
- **Angle 3 (Core Hub Close-up)**: `docs/qa/screens/iss_6k_angle3.webp` — Unity node, Zarya FGB, and Zvezda service module docking ports well-defined.

## 3. Engineering Decision
- The 174k legacy model violates the whole-scene background budget (174,440 > 40,000) and contains 2,747 degenerate triangles and rogue edge ratios that hard-fail `tools/glb-doctor`.
- The cleaned 6.5k candidate meets all release criteria: passes `tools/glb-doctor` with zero violations, uses only 24.6 KB of bandwidth, and maintains 60 FPS on weak GPUs.
- **Decision**: Keep the cleaned 6.5k model permanently in `public/assets/crafts/iss.glb`. Update `DEF-07` in `docs/qa/FINDINGS.md` to **RESOLVED (Cleaned Candidate Deployed)**.
