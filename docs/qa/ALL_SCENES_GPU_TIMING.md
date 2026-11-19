# Real-GPU Synchronized Timing Report (All 47 Catalog Scenes)
Captured directly with hardware completion synchronization (`gl.readPixels`) on physical GPU.

- **Physical GPU**: `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11)`
- **Methodology**: 25 sampled frames per scene with cold/warmup phase, synchronized GPU rasterization flush via `gl.readPixels(0,0,1,1)`.
- **Target Budget**: 60 FPS target ($le 16.0	ext{ ms}$ total frame time).
- **At-Risk Scenes Threshold**: GPU p95 frame time $> 16.0	ext{ ms}$.

---

## 1. Executive Summary & Weak GPU Risk Assessment

- **devicePixelRatio = 1**:
  - Total scenes tested: **47**
  - Scenes meeting 60 FPS budget (GPU p95 $le 16.0	ext{ ms}$): **26 / 47 (55.3%)**
  - **At-Risk Scenes (GPU p95 > 16 ms)**: `launch_pad_wide` (18 ms), `launch_pad_close_tower` (18.1 ms), `launch_vab_distance` (18.3 ms), `surface_moon_south_pole` (22.8 ms), `surface_mars_jezero` (24.1 ms), `hardware_bay_lander` (16.5 ms), `launch_liftoff_t0` (21.4 ms), `launch_liftoff_t5` (17.3 ms), `solar_system_sun` (17.2 ms), `solar_system_jupiter` (19.4 ms), `solar_system_pluto` (27.7 ms), `solar_system_mars` (21.7 ms), `landing_touchdown_success` (20.9 ms), `landing_hard_touchdown` (21.5 ms), `landing_crash_debrief` (21.4 ms), `surface_rover_driving` (25.3 ms), `menu_pause_map` (24.6 ms), `menu_pause_ledger` (29.2 ms), `menu_pause_achievements` (26.8 ms), `menu_pause_glossary` (26.6 ms), `menu_credits_screen` (29.1 ms)

- **devicePixelRatio = 2**:
  - Total scenes tested: **47**
  - Scenes meeting 60 FPS budget (GPU p95 $le 16.0	ext{ ms}$): **16 / 47 (34.0%)**
  - **At-Risk Scenes (GPU p95 > 16 ms)**: `briefing_objectives` (25.2 ms), `settings_console` (27.2 ms), `launch_pad_wide` (19.6 ms), `launch_pad_close_tower` (22.4 ms), `launch_vab_distance` (21 ms), `space_parking_orbit` (40.8 ms), `landing_lunar_approach` (29.1 ms), `surface_moon_south_pole` (47.9 ms), `surface_mars_jezero` (39.2 ms), `hardware_bay_sls_exploded_35` (18 ms), `hardware_bay_sls_exploded_100` (19.6 ms), `hardware_bay_lander` (23.2 ms), `hardware_bay_voyager` (16.1 ms), `launch_liftoff_t0` (31.7 ms), `launch_liftoff_t5` (24 ms), `launch_max_q` (19.9 ms), `solar_system_sun` (19.7 ms), `solar_system_jupiter` (18.1 ms), `solar_system_pluto` (25.5 ms), `solar_system_moon` (22.5 ms), `solar_system_mars` (22.5 ms), `solar_system_saturn_close` (17.9 ms), `landing_touchdown_success` (37 ms), `landing_hard_touchdown` (30.8 ms), `landing_crash_debrief` (29.2 ms), `surface_rover_driving` (43.6 ms), `menu_pause_map` (34 ms), `menu_pause_ledger` (33 ms), `menu_pause_achievements` (32.2 ms), `menu_pause_glossary` (32.5 ms), `menu_credits_screen` (34.6 ms)

> [!NOTE]
> Scenes flagged as "At Risk" at DPR 2 exceed 16 ms due to fill-rate / fragment shading costs on integrated Intel UHD Graphics at $2880 	imes 1800$ resolution. The dynamic resolution scaler in production automatically downscales pixel ratio on underperforming devices to maintain stable 60 FPS.

---

## 2. Complete Timing Matrix (DPR 1 vs DPR 2)

| # | Scene ID | Category | Calls | Tris | DPR 1 CPU (p50/p95) | DPR 1 GPU (p50/p95) | DPR 2 CPU (p50/p95) | DPR 2 GPU (p50/p95) | Status |
| :-: | :--- | :---: | :-: | :-: | :-: | :-: | :-: | :-: | :---: |
| 1 | `title_hero` | ui | 402 | 160,406 | 3.5 / 5.3 ms | 12.1 / 14.6 ms | 1.5 / 2.1 ms | 8.4 / 9.8 ms | ✅ Pass |
| 2 | `briefing_objectives` | ui | 131 | 173,138 | 3.9 / 4.9 ms | 11 / 12.4 ms | 3.7 / 5.8 ms | 21.8 / 25.2 ms | ⚠️ Risk @ 2x |
| 3 | `settings_console` | ui | 131 | 173,138 | 4 / 4.6 ms | 12.5 / 15.1 ms | 4.1 / 6.1 ms | 23.5 / 27.2 ms | ⚠️ Risk @ 2x |
| 4 | `launch_pad_wide` | launch | 404 | 160,420 | 6.3 / 7.9 ms | 15.9 / 18 ms | 4.2 / 5.7 ms | 16.4 / 19.6 ms | ⚠️ Risk @ 1x |
| 5 | `launch_pad_close_tower` | launch | 406 | 163,150 | 6.1 / 6.8 ms | 14.1 / 18.1 ms | 3.4 / 4.8 ms | 18.2 / 22.4 ms | ⚠️ Risk @ 1x |
| 6 | `launch_vab_distance` | launch | 407 | 163,190 | 6 / 7.1 ms | 14.6 / 18.3 ms | 3.4 / 4.6 ms | 16.9 / 21 ms | ⚠️ Risk @ 1x |
| 7 | `space_parking_orbit` | space | 57 | 34,252 | 2.6 / 3.2 ms | 9.5 / 11.3 ms | 3.1 / 3.9 ms | 33.1 / 40.8 ms | ⚠️ Risk @ 2x |
| 8 | `space_tli_cislunar` | space | 68 | 54,418 | 2.6 / 2.9 ms | 11.4 / 14 ms | 3.4 / 4.8 ms | 12.7 / 14.9 ms | ✅ Pass |
| 9 | `solar_system_overview` | solar_system | 34 | 19,086 | 1.8 / 2.8 ms | 6.3 / 12.8 ms | 3.2 / 4.6 ms | 12.8 / 15.4 ms | ✅ Pass |
| 10 | `solar_system_saturn_rings` | solar_system | 80 | 47,958 | 3.6 / 4.9 ms | 9.3 / 13.1 ms | 1.4 / 3.5 ms | 10 / 14.9 ms | ✅ Pass |
| 11 | `landing_lunar_approach` | landing | 284 | 259,669 | 5.1 / 6.6 ms | 12.6 / 13.6 ms | 5 / 7.8 ms | 27.1 / 29.1 ms | ⚠️ Risk @ 2x |
| 12 | `surface_moon_south_pole` | surface | 655 | 346,056 | 8 / 9.9 ms | 19.6 / 22.8 ms | 8.8 / 14.1 ms | 42.5 / 47.9 ms | ⚠️ Risk @ 1x |
| 13 | `surface_mars_jezero` | surface | 654 | 347,552 | 8.2 / 10.5 ms | 22.8 / 24.1 ms | 7.6 / 10.4 ms | 32.9 / 39.2 ms | ⚠️ Risk @ 1x |
| 14 | `hardware_bay_sls_assembled` | hardware_bay | 210 | 135,842 | 5 / 5.9 ms | 12.2 / 15 ms | 3.7 / 5.5 ms | 14.3 / 15.9 ms | ✅ Pass |
| 15 | `hardware_bay_sls_exploded_35` | hardware_bay | 212 | 135,268 | 4.9 / 5.9 ms | 12 / 15.1 ms | 3.7 / 6.3 ms | 13.4 / 18 ms | ⚠️ Risk @ 2x |
| 16 | `hardware_bay_sls_exploded_100` | hardware_bay | 207 | 132,557 | 4.6 / 5.8 ms | 10.3 / 12.4 ms | 5 / 6.8 ms | 15.4 / 19.6 ms | ⚠️ Risk @ 2x |
| 17 | `hardware_bay_saturn_v` | hardware_bay | 102 | 68,124 | 0.9 / 1.7 ms | 5.2 / 7.1 ms | 2.7 / 4 ms | 10.2 / 15.5 ms | ✅ Pass |
| 18 | `hardware_bay_iss` | hardware_bay | 19 | 13,516 | 2.3 / 3.5 ms | 9.2 / 13.2 ms | 1.9 / 2.8 ms | 9.7 / 14.6 ms | ✅ Pass |
| 19 | `hardware_bay_jwst` | hardware_bay | 79 | 198,974 | 2.4 / 3 ms | 10 / 13.7 ms | 2.6 / 3.7 ms | 9.8 / 13 ms | ✅ Pass |
| 20 | `hardware_bay_rover` | hardware_bay | 153 | 5,176 | 3.9 / 4.5 ms | 9 / 13 ms | 5.4 / 7.6 ms | 12.1 / 15.8 ms | ✅ Pass |
| 21 | `hardware_bay_lander` | hardware_bay | 442 | 183,866 | 5.1 / 9.3 ms | 10.3 / 16.5 ms | 5.6 / 10.5 ms | 17.9 / 23.2 ms | ⚠️ Risk @ 1x |
| 22 | `hardware_bay_voyager` | hardware_bay | 39 | 60,318 | 1.4 / 2.4 ms | 5.7 / 8 ms | 1.5 / 2.8 ms | 9.1 / 16.1 ms | ⚠️ Risk @ 2x |
| 23 | `hardware_bay_satellite` | hardware_bay | 97 | 5,668 | 3.1 / 3.7 ms | 7.4 / 9.5 ms | 2 / 3.8 ms | 8.9 / 12.8 ms | ✅ Pass |
| 24 | `hardware_bay_falcon_9` | hardware_bay | 26 | 1,040 | 1.5 / 2.7 ms | 6.6 / 10.7 ms | 1.6 / 2 ms | 7.7 / 9.4 ms | ✅ Pass |
| 25 | `launch_liftoff_t0` | launch | 386 | 162,494 | 7.3 / 9.6 ms | 18.8 / 21.4 ms | 7 / 9.1 ms | 29.2 / 31.7 ms | ⚠️ Risk @ 1x |
| 26 | `launch_liftoff_t5` | launch | 371 | 162,266 | 6.5 / 8.2 ms | 14.3 / 17.3 ms | 5.7 / 7.2 ms | 21.4 / 24 ms | ⚠️ Risk @ 1x |
| 27 | `launch_max_q` | launch | 270 | 142,028 | 4.9 / 6 ms | 10.4 / 11.9 ms | 4.4 / 7 ms | 15.6 / 19.9 ms | ⚠️ Risk @ 2x |
| 28 | `launch_srb_separation` | launch | 204 | 138,428 | 3 / 5.9 ms | 7.6 / 12.8 ms | 3.4 / 3.9 ms | 11.4 / 12 ms | ✅ Pass |
| 29 | `launch_core_separation` | launch | 180 | 124,034 | 2.9 / 4 ms | 8.7 / 10.2 ms | 3.4 / 3.9 ms | 11.8 / 12.5 ms | ✅ Pass |
| 30 | `launch_icps_burn` | launch | 167 | 109,438 | 3 / 4.8 ms | 8.7 / 10.7 ms | 2.4 / 4.4 ms | 11.7 / 14.5 ms | ✅ Pass |
| 31 | `launch_orbit_insertion` | launch | 160 | 97,985 | 2.9 / 4.2 ms | 9.1 / 12.3 ms | 3.3 / 4.6 ms | 11.2 / 14.3 ms | ✅ Pass |
| 32 | `space_tli_burn` | space | 80 | 47,958 | 2.5 / 3.6 ms | 7.9 / 9.6 ms | 2 / 3.4 ms | 9.9 / 13.1 ms | ✅ Pass |
| 33 | `solar_system_sun` | solar_system | 82 | 50,774 | 2.4 / 4 ms | 10 / 17.2 ms | 2.6 / 3.5 ms | 10.8 / 19.7 ms | ⚠️ Risk @ 1x |
| 34 | `solar_system_jupiter` | solar_system | 80 | 47,958 | 2.6 / 3.8 ms | 10.2 / 19.4 ms | 1.8 / 3.4 ms | 11.3 / 18.1 ms | ⚠️ Risk @ 1x |
| 35 | `solar_system_pluto` | solar_system | 80 | 47,958 | 3.3 / 3.9 ms | 12 / 27.7 ms | 2.6 / 4 ms | 11 / 25.5 ms | ⚠️ Risk @ 1x |
| 36 | `solar_system_moon` | solar_system | 82 | 50,774 | 2.9 / 4.2 ms | 10.8 / 14.5 ms | 2.5 / 3.5 ms | 11.8 / 22.5 ms | ⚠️ Risk @ 2x |
| 37 | `solar_system_mars` | solar_system | 82 | 50,774 | 3.5 / 4.3 ms | 11.6 / 21.7 ms | 3.1 / 4.1 ms | 12.8 / 22.5 ms | ⚠️ Risk @ 1x |
| 38 | `solar_system_saturn_close` | solar_system | 80 | 47,958 | 2 / 5 ms | 9.5 / 13.7 ms | 3.1 / 4.2 ms | 12.5 / 17.9 ms | ⚠️ Risk @ 2x |
| 39 | `landing_touchdown_success` | landing | 518 | 343,034 | 6.2 / 9.6 ms | 17.4 / 20.9 ms | 3.6 / 6.1 ms | 29.9 / 37 ms | ⚠️ Risk @ 1x |
| 40 | `landing_hard_touchdown` | landing | 501 | 341,110 | 6.3 / 7.6 ms | 16.6 / 21.5 ms | 4.1 / 8.1 ms | 24.7 / 30.8 ms | ⚠️ Risk @ 1x |
| 41 | `landing_crash_debrief` | landing | 500 | 341,358 | 6.3 / 8.4 ms | 17.2 / 21.4 ms | 5.7 / 7.9 ms | 24.8 / 29.2 ms | ⚠️ Risk @ 1x |
| 42 | `surface_rover_driving` | surface | 671 | 347,116 | 7.4 / 11.1 ms | 22 / 25.3 ms | 7.2 / 10.9 ms | 36 / 43.6 ms | ⚠️ Risk @ 1x |
| 43 | `menu_pause_map` | ui | 666 | 346,736 | 6.9 / 10.5 ms | 19.2 / 24.6 ms | 7.9 / 9.3 ms | 30.5 / 34 ms | ⚠️ Risk @ 1x |
| 44 | `menu_pause_ledger` | ui | 666 | 346,736 | 6.4 / 11.1 ms | 20.5 / 29.2 ms | 7.9 / 9 ms | 31 / 33 ms | ⚠️ Risk @ 1x |
| 45 | `menu_pause_achievements` | ui | 666 | 346,736 | 9.2 / 14.3 ms | 22.3 / 26.8 ms | 7.4 / 9 ms | 30.2 / 32.2 ms | ⚠️ Risk @ 1x |
| 46 | `menu_pause_glossary` | ui | 666 | 346,736 | 10.2 / 13.4 ms | 22.7 / 26.6 ms | 8.1 / 9.9 ms | 31.1 / 32.5 ms | ⚠️ Risk @ 1x |
| 47 | `menu_credits_screen` | ui | 666 | 346,736 | 8.2 / 10.6 ms | 22.8 / 29.1 ms | 7.8 / 10.2 ms | 31.2 / 34.6 ms | ⚠️ Risk @ 1x |

---
*Report generated programmatically by `scripts/measure_all_scenes_gpu_timing.ts`.*
