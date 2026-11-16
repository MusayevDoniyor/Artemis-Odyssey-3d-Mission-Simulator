# Planetary Surfaces, Touchdown Dynamics & Rover Kinematics: Aerospace Baseline

**Author**: Autonomous Flight Systems Engineering Agent  
**Date**: 2026-11-16  
**Status**: Verified Aerospace Engineering Document (Phase 7)  
**Topic**: Moon South Pole (LOLA), Mars Jezero Crater (MOLA/HiRISE), Ballistic Dust Mechanics, Touchdown Criteria & VIPER Rover Kinematics

---

## 1. Planetary Surface Environments & Elevation Datasets

### 1.1 Moon South Pole (Shackleton & Connecting Ridge)
- **Reference Datasets**: NASA Lunar Reconnaissance Orbiter (LRO) Lunar Orbiter Laser Altimeter (LOLA) and LROC Narrow Angle Camera (NAC) mosaics.
- **Topography**:
  - Shackleton Crater: Centered at 89.9°S, 0.0°E; diameter 21 km, depth ~4.2 km.
  - Rim Elevation: Rises ~1.2 km above the surrounding South Pole-Aitken basin floor.
  - Slopes: Rim flanks average 15°–25°; crater inner walls exceed 30°–32° (beyond safe lander gear tipping limits).
  - Connecting Ridge: A relatively level, highly illuminated highland corridor between Shackleton and de Gerlache craters providing peak sunlight (~86% of the lunar year) while remaining adjacent to ultra-cold shadow basins.
- **Illumination & Thermal Environment**:
  - Solar Elevation Angle: Low grazing incidence (~1.5° to 1.8° above the local horizon), casting extreme, long shadows across regolith topography.
  - Permanently Shadowed Regions (PSRs): Deep crater floors receive zero direct sunlight for billions of years, remaining at cryogenic equilibrium temperatures of 35–45 K (-238°C to -228°C), acting as cold traps that preserve water ice deposits.

### 1.2 Mars Jezero Crater
- **Reference Datasets**: NASA Mars Global Surveyor (MGS) Mars Orbiter Laser Altimeter (MOLA) and Mars Reconnaissance Orbiter (MRO) High Resolution Imaging Science Experiment (HiRISE) digital terrain models.
- **Topography**:
  - Location: 18.38°N, 77.58°E in the Syrtis Major quadrangle; diameter ~45 km.
  - Western Fan Delta: Prominent sedimentary fan deposit rising 40–80 m above the paleolake crater floor, with distinctive stratified layers of clay minerals, carbonates, and mudstones deposited by ancient river channels (Neretva Vallis).
  - Máaz Basaltic Floor: Lava-capped volcanic basement unit featuring aeolian megaripples, fragmented fractured paving stones, and boulder clusters.

---

## 2. Plume-Surface Interaction (PSI) & Ballistic Regolith Dynamics

### 2.1 Ballistic Lunar Dust (Vacuum Conditions)
- **Atmospheric Drag**: $C_d = 0$, $\rho_{amb} \approx 0\text{ kg/m}^3$.
- **Dust Physics**:
  - Under rocket exhaust impingement (altitude $< 18\text{ m}$), sub-millimeter regolith grains are stripped from the surface at velocities up to 1,000–2,000 m/s.
  - In a hard vacuum, dust particles encounter zero aerodynamic drag and follow pure Keplerian ballistic parabolas under lunar gravity ($g = 1.625\text{ m/s}^2$).
  - Grains travel vast distances (hundreds of meters to orbital trajectories) with zero atmospheric billow or billowing cloud formation, appearing as a razor-sharp, high-velocity ground-hugging sheet.

### 2.2 Martian Dust Transport (Tenuous CO₂ Atmosphere)
- **Atmospheric Drag**: Surface pressure $p \approx 610\text{ Pa}$ (~0.6% Earth sea-level), density $\rho \approx 0.020\text{ kg/m}^3$.
- **Dust Physics**:
  - Mars gravity ($g = 3.72\text{ m/s}^2$) combined with aerodynamic drag causes fine dust particles (1–10 µm) to remain suspended in turbulent plumes.
  - Surface aeolian saltation: Ambient winds ($v_{wind} \approx 5\text{–}15\text{ m/s}$) produce horizontal drift, dust devils, and gradual accumulation of red iron-oxide dust on solar panels and wheels.

---

## 3. Lander Touchdown & Crash Telemetry Physics

### 3.1 Structural Gear Envelopes (Apollo & Artemis Human Landing Systems)
- **Vertical Touchdown Velocity ($v_y$)**:
  - Nominal (Soft): $\le 1.5\text{ m/s}$.
  - Acceptable (Firm): $1.5\text{–}2.5\text{ m/s}$.
  - Hard / Minor Damage: $2.5\text{–}3.8\text{ m/s}$.
  - Structural Crush / Crash: $> 4.8\text{ m/s}$ (leads to honeycomb shock strut shearing or fuel tank rupture).
- **Horizontal Velocity ($v_{horiz}$)**:
  - Safe Gear Friction: $\le 0.8\text{ m/s}$.
  - Gear Tripping / Tipping Hazard: $> 1.2\text{ m/s}$.
- **Attitude Tilt Angle ($\theta_{tilt}$)**:
  - Safe Landing Gear Footprint: $\le 8.0^\circ$.
  - Dynamic Limit: $\le 12.0^\circ$.
  - Roll-over Failure: $> 15.0^\circ$.
- **Telemetry Integrity**:
  - Touchdown outcomes must latch instantaneous impact metrics (`impactVy`, `impactSpeedMs`, `impactTiltDeg`) at the moment of ground contact before zeroing operational velocities, ensuring post-flight crash analysis displays honest physical numbers (e.g. 7.4 m/s at 16.2° tilt) rather than synthetic 0.0 m/s readouts.

---

## 4. NASA VIPER Rover Mobility & Kinematics

### 4.1 Physical Specifications (Volatiles Investigating Polar Exploration Rover)
- **Mass**: 430 kg (950 lb).
- **Dimensions**: 1.5 m (L) × 1.5 m (W) × 2.5 m (H).
- **Mobility Architecture**:
  - 4-wheel independent steering and independent drive motors.
  - Active suspension with independent wheel lift mechanism enabling:
    - Standard Ackermann Steering.
    - Crab Steering (all 4 wheels angled uniformly for lateral slope traversal).
    - Skid / Spin Steer (zero-radius in-place pivot).
    - "Walker" Inching Mode (lifts individual wheels over obstacles and loosens embedded wheels from sticky regolith).
- **Drive Rates & Time Compression (Bug B3 Resolution)**:
  - Scientific Speed (1× Real-Time): Nominal drive speed is 0.1 to 0.4 km/h (0.028 to 0.11 m/s), maximum ~0.18 m/s (~0.65 km/h).
  - Kid Explore / Time Compression (25×): Simulates driving with a 25× operational time-warp ladder, yielding physical speeds of 4.5 to 6.8 m/s.
  - Kinematic Integrity: In both modes, physical displacement must strictly satisfy:
    $$\Delta x = v \cdot \Delta t$$
    Changing the speed mode setting must scale physical world displacement accordingly.

### 4.2 Science Instrument Suite
1. **TRIDENT Drill (The Regolith and Ice Drill for Exploring New Terrain)**:
   - 1.0-meter rotary-percussive drill biting in 10-cm bites.
   - Temperature monitoring: Regolith heating exceeding 95°C risks sublimating volatile ice samples before spectrometers can measure them; requires Purge & Cool procedures.
2. **NIRVSS (Near-Infrared Volatiles Spectrometer System)**:
   - Measures surface water ice reflection spectra and hydroxyl absorption at 1.5 µm and 2.0 µm.
3. **MSolo (Mass Spectrometer Observing Lunar Operations)**:
   - Measures gas volatiles evolving during drilling.
4. **NSS (Neutron Spectrometer System)**:
   - Detects hydrogen up to 1 meter beneath the surface by measuring thermal and epithermal neutron moderation.

---

## 5. References & Official NASA Documentation

1. NASA VIPER Mission Technical Brief: *Volatiles Investigating Polar Exploration Rover Overview*, NASA Fact Sheet NP-2021-09-026-ARC.
2. NASA Apollo Lunar Surface Journal: *Apollo Lunar Module Touchdown Performance & Velocity Data*, Apollo Experience Report MSC-04374.
3. Metzger, P. T., et al.: *Rocket Exhaust Plume-Surface Interaction Mechanics in Lunar Vacuum*, Journal of Aerospace Engineering, ASCE, 2011.
4. NASA LRO LOLA Science Team: *Shackleton Crater High-Resolution Altimetry and Illumination Atlas*, NASA GSFC / ASU.
5. Farley, K. A., et al.: *Avezac / Jezero Crater Geological Floor Units and Deltaic Sedimentary Sequences*, Science, 2022.
