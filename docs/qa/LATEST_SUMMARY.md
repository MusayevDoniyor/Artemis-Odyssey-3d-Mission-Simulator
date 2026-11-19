# Artemis Odyssey - Latest QA Run Summary

- **Timestamp**: 2026-11-19T03:44:27.220Z
- **Suite**: `full`
- **Result**: **GREEN (0 P0, 0 P1)**
- **Physical GPU**: `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11 vs_5_0 ps_5_0, D3D11)` (Google Inc. (Intel))
- **Total Scenes**: 59 (59 passed, 0 failed)
- **Defects**: P0: 0 | P1: 0 | P2: 27

## Scene Performance & Geometry Results

| Scene ID | Viewport | p50 FPS | p95 Frame | Triangles | Calls | Status |
|---|---|---|---|---|---|---|
| `title_hero` | 1440x900 | 60 | 16.8ms | 160,406 | 402 | P2 |
| `title_hero` | 1920x1080 | N/A | N/A | N/A | N/A | PASS |
| `title_hero` | 390x844 | N/A | N/A | N/A | N/A | P2 |
| `briefing_objectives` | 1440x900 | 60 | 16.9ms | 173,138 | 131 | PASS |
| `briefing_objectives` | 1920x1080 | N/A | N/A | N/A | N/A | PASS |
| `briefing_objectives` | 390x844 | N/A | N/A | N/A | N/A | PASS |
| `settings_console` | 1440x900 | 60 | 16.9ms | 173,138 | 131 | P2 |
| `settings_console` | 1920x1080 | N/A | N/A | N/A | N/A | P2 |
| `settings_console` | 390x844 | N/A | N/A | N/A | N/A | P2 |
| `launch_pad_wide` | 1440x900 | 60 | 16.9ms | 163,094 | 402 | P2 |
| `launch_pad_close_tower` | 1440x900 | 60 | 16.9ms | 160,364 | 400 | P2 |
| `launch_vab_distance` | 1440x900 | 60 | 16.9ms | 163,110 | 405 | P2 |
| `space_parking_orbit` | 1440x900 | 60 | 16.8ms | 50,528 | 65 | P2 |
| `space_tli_cislunar` | 1440x900 | 60 | 16.9ms | 50,528 | 65 | P2 |
| `solar_system_overview` | 1440x900 | 60 | 16.9ms | 46,014 | 80 | P2 |
| `solar_system_saturn_rings` | 1440x900 | 60 | 16.8ms | 40,514 | 74 | P2 |
| `landing_lunar_approach` | 1440x900 | 60 | 16.9ms | 259,669 | 284 | P2 |
| `surface_moon_south_pole` | 1440x900 | 60 | 16.9ms | 346,268 | 657 | P2 |
| `surface_mars_jezero` | 1440x900 | 60 | 16.8ms | 347,340 | 652 | P2 |
| `hardware_bay_sls_assembled` | 1440x900 | 60 | 16.9ms | 134,865 | 200 | P2 |
| `hardware_bay_sls_assembled` | 1920x1080 | N/A | N/A | N/A | N/A | P2 |
| `hardware_bay_sls_assembled` | 390x844 | N/A | N/A | N/A | N/A | PASS |
| `hardware_bay_sls_exploded_35` | 1440x900 | 60 | 16.9ms | 132,157 | 197 | P2 |
| `hardware_bay_sls_exploded_100` | 1440x900 | 60 | 17ms | 132,269 | 198 | P2 |
| `hardware_bay_saturn_v` | 1440x900 | 60 | 16.8ms | 48,286 | 84 | P2 |
| `hardware_bay_iss` | 1440x900 | 60 | 16.9ms | 213,850 | 72 | P2 |
| `hardware_bay_jwst` | 1440x900 | 60 | 16.8ms | 198,974 | 79 | P2 |
| `hardware_bay_rover` | 1440x900 | 60 | 17ms | 5,176 | 153 | P2 |
| `hardware_bay_lander` | 1440x900 | 60 | 17ms | 183,866 | 442 | P2 |
| `hardware_bay_voyager` | 1440x900 | 60 | 17ms | 60,318 | 39 | P2 |
| `hardware_bay_satellite` | 1440x900 | 60 | 16.9ms | 5,668 | 97 | P2 |
| `hardware_bay_falcon_9` | 1440x900 | 60 | 16.9ms | 1,040 | 26 | P2 |
| `launch_liftoff_t0` | 1440x900 | 60 | 16.9ms | 162,286 | 354 | P3 |
| `launch_liftoff_t5` | 1440x900 | 60 | 16.9ms | 160,260 | 359 | P3 |
| `launch_max_q` | 1440x900 | 60 | 16.9ms | 127,153 | 189 | P3 |
| `launch_srb_separation` | 1440x900 | 60 | 17ms | 70,067 | 121 | P3 |
| `launch_core_separation` | 1440x900 | 60 | 16.9ms | 17,950 | 78 | P3 |
| `launch_icps_burn` | 1440x900 | 60 | 16.9ms | 17,950 | 78 | P3 |
| `launch_orbit_insertion` | 1440x900 | 60 | 16.9ms | 18,610 | 74 | P3 |
| `space_tli_burn` | 1440x900 | 60 | 16.9ms | 46,014 | 79 | P3 |
| `solar_system_sun` | 1440x900 | 60 | 16.9ms | 48,830 | 81 | P3 |
| `solar_system_jupiter` | 1440x900 | 60 | 17ms | 46,014 | 79 | P3 |
| `solar_system_pluto` | 1440x900 | 60 | 16.9ms | 46,014 | 79 | P3 |
| `solar_system_moon` | 1440x900 | 60 | 17ms | 48,830 | 81 | P3 |
| `solar_system_mars` | 1440x900 | 60 | 16.9ms | 48,830 | 81 | P3 |
| `solar_system_saturn_close` | 1440x900 | 60 | 16.8ms | 40,514 | 74 | P3 |
| `landing_touchdown_success` | 1440x900 | 60 | 16.8ms | 340,494 | 486 | P3 |
| `landing_hard_touchdown` | 1440x900 | 60 | 16.8ms | 340,494 | 486 | P3 |
| `landing_crash_debrief` | 1440x900 | 60 | 17ms | 340,988 | 492 | P3 |
| `surface_rover_driving` | 1440x900 | 60 | 16.9ms | 345,116 | 639 | P3 |
| `menu_pause_map` | 1440x900 | 60 | 16.9ms | 345,116 | 639 | P3 |
| `menu_pause_map` | 1920x1080 | N/A | N/A | N/A | N/A | P3 |
| `menu_pause_map` | 390x844 | N/A | N/A | N/A | N/A | P3 |
| `menu_pause_ledger` | 1440x900 | 60 | 16.9ms | 345,116 | 639 | P3 |
| `menu_pause_achievements` | 1440x900 | 60 | 16.9ms | 345,116 | 639 | P3 |
| `menu_pause_glossary` | 1440x900 | 60 | 16.8ms | 345,116 | 639 | P3 |
| `menu_credits_screen` | 1440x900 | 60 | 17ms | 345,116 | 639 | P3 |
| `menu_credits_screen` | 1920x1080 | N/A | N/A | N/A | N/A | P3 |
| `menu_credits_screen` | 390x844 | N/A | N/A | N/A | N/A | P3 |

---
*Report generated automatically by Artemis Odyssey Automated QA System.*
