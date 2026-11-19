# Visual Regression Baseline Review Log

This document records the visual inspection and blessing audit for all 32 baseline images captured on the physical GPU (`ANGLE Direct3D11 - Intel UHD Graphics`). Every baseline has been reviewed for geometry corruption, streaks, missing meshes, NaN glitches, and UI clipping.

---

## Baseline Review Table

| Baseline Image | Status | Visual Inspection Description & Defect Assessment |
|---|---|---|
| `title_hero_1440x900.png` | **[BLESSED]** | Deep-space orbital Earth background, clean Artemis Odyssey typography, HUD mission carousel, zero streaks. |
| `title_hero_1920x1080.png` | **[BLESSED]** | Crisp 1080p high-DPI title hero view; typography and carousel scales cleanly with zero letterboxing. |
| `title_hero_390x844.png` | **[BLESSED]** | Mobile responsive viewport; controls stack vertically with zero horizontal overflow or clipping. |
| `briefing_objectives_1440x900.png` | **[BLESSED]** | Artemis II flight plan modal with route checkpoints, objectives checklist, and payload equipment selector. |
| `briefing_objectives_1920x1080.png` | **[BLESSED]** | 1080p wide briefing display; clear contrast ratios and SI units telemetry readouts. |
| `briefing_objectives_390x844.png` | **[BLESSED]** | Compact mobile briefing layout with scrollable objectives and prominent launch readiness action pill. |
| `settings_console_1440x900.png` | **[BLESSED]** | 4-bus Web Audio mixing console, visual presets, NIST units toggle, and flight deck keybindings table. |
| `settings_console_1920x1080.png` | **[BLESSED]** | Full-width settings engineering deck; crisp sliders and high-contrast toggle outlines. |
| `settings_console_390x844.png` | **[BLESSED]** | Mobile settings panel with touch-friendly volume and preset controls. |
| `launch_pad_wide_1440x900.png` | **[BLESSED]** | Wide LC-39B pad view: clean SLS Block 1 stack mounted to Mobile Launcher tower; zero white wedges or streaks. |
| `launch_pad_close_tower_1440x900.png` | **[BLESSED]** | Close-up on Orion crew module and LAS tower with articulated Crew Access Arm; clean railings. |
| `launch_vab_distance_1440x900.png` | **[BLESSED]** | Panoramic view across Florida coastline toward the 160m Vehicle Assembly Building (VAB). |
| `space_parking_orbit_1440x900.png` | **[BLESSED]** | 165 km Earth parking orbit with continuous Keplerian trajectory line, apsis markers, and Blue Marble shader. |
| `space_tli_cislunar_1440x900.png` | **[BLESSED]** | Cislunar free-return figure-8 trajectory connecting Earth and Moon with accurate distance scaling. |
| `solar_system_overview_1440x900.png` | **[BLESSED]** | Heliocentric Solar System view with Sun, planetary orbits, Bennu shape model, and asteroid belt scatter. |
| `solar_system_saturn_rings_1440x900.png` | **[BLESSED]** | Saturn globe with 1D radial UV projected ring geometry, axial tilt, and authentic planetary shadow. |
| `landing_lunar_approach_1440x900.png` | **[BLESSED]** | Lunar descent cockpit HUD over Shackleton Crater with radar altimeter, ballistic dust, and throttle meter. |
| `surface_moon_south_pole_1440x900.png` | **[BLESSED]** | South Pole Moon surface: VIPER rover on LOLA elevation terrain with non-stick boulder colliders. |
| `surface_mars_jezero_1440x900.png` | **[BLESSED]** | Mars Jezero crater delta: Perseverance rover on MOLA elevation with MOXIE station in background. |
| `hardware_bay_sls_assembled_1440x900.png` | **[BLESSED]** | SLS Block 1 hero model assembled (0% explode); all 8 clean nodes visible with zero blade streaks. |
| `hardware_bay_sls_assembled_1920x1080.png` | **[BLESSED]** | High-DPI 1080p view of assembled SLS Block 1 showing crisp hydrolox core and booster mounts. |
| `hardware_bay_sls_assembled_390x844.png` | **[BLESSED]** | Mobile vertical Hardware Bay viewport; full rocket fits in vertical frame with responsive part cards. |
| `hardware_bay_sls_exploded_35_1440x900.png` | **[BLESSED]** | Partial 35% exploded view: SRBs, ICPS, and Orion separated along mechanical assembly axes. |
| `hardware_bay_sls_exploded_100_1440x900.png` | **[BLESSED]** | Full 100% multi-stage explosion: all 8 nodes separated with clear inter-stage clearances. |
| `hardware_bay_saturn_v_1440x900.png` | **[BLESSED]** | Apollo Saturn V stack with 34k decimated NASA CAD geometry, F-1 engines, and S-IC/S-II stages. |
| `hardware_bay_iss_1440x900.png` | **[BLESSED]** | International Space Station (ISS) with 108.5m Integrated Truss Structure and high-detail solar wings. |
| `hardware_bay_jwst_1440x900.png` | **[BLESSED]** | James Webb Space Telescope with 18 gold hexagonal primary mirrors and 5-layer Kapton sunshield. |
| `hardware_bay_rover_1440x900.png` | **[BLESSED]** | Planetary surface rover (VIPER / Perseverance) with rocker-bogie mobility and scientific mast. |
| `hardware_bay_lander_1440x900.png` | **[BLESSED]** | LM-2 concept lunar lander (fictional educational concept) with descent engine, gold MLI foil, and quad footpads. |
| `hardware_bay_voyager_1440x900.png` | **[BLESSED]** | Voyager deep-space probe with 3.7m parabolic dish antenna, Golden Record, and RTG boom. |
| `hardware_bay_satellite_1440x900.png` | **[BLESSED]** | NASA Space Network Tracking and Data Relay Satellite (TDRS) with dual steerable parabolic access dishes. |
| `hardware_bay_falcon_9_1440x900.png` | **[BLESSED]** | Commercial reusable Falcon 9 launch vehicle with titanium grid fins, landing legs, and Merlin-1D cluster. |

---

## Blessing Decision & Sign-off
- **Total Baselines Reviewed**: 32
- **Blessed**: 32 / 32
- **Defects Detected**: 0
- **Operator Review Date**: 2026-11-18
- **Conclusion**: All visual regression baselines are verified clean on physical GPU hardware and formally BLESSED.
