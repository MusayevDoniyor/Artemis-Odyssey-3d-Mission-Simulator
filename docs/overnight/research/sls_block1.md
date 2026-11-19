# Research & Verified Engineering Specifications: NASA Space Launch System (SLS Block 1)

## 1. Overview & Vehicle Geometry
- **Vehicle**: NASA SLS Block 1 Crew Configuration (Artemis I & II flight stack)
- **Total Height**: 98.3 m (322.4 ft) with Orion MPCV and Launch Abort System (LAS)
- **Total Liftoff Mass**: 2,608,000 kg (5,750,000 lb)
- **Total Liftoff Thrust**: 39.1 MN (8,800,000 lbf)
- **Thrust-to-Weight Ratio (TWR) at Liftoff**: ~1.53
- **Primary Mission**: Trans-Lunar Injection (>27 metric tons payload to cislunar trajectory)
- **Primary Authority Sources**:
  - NASA SLS Reference Guide (NASA-SP-20220005230, https://www.nasa.gov/reference/sls-space-launch-system/)
  - NASA Artemis Flight Operations & Trajectory Books (Flight Readiness Review Documentation)

---

## 2. Propulsion Subsystems & Stage Stacking

### 2.1 Twin Solid Rocket Boosters (SRBs)
- **Manufacturer**: Northrop Grumman Space Systems (Promontory, Utah)
- **Configuration**: Two 5-segment solid rocket motor boosters
- **Height**: 53.9 m (177 ft)
- **Diameter**: 3.71 m (12.2 ft)
- **Mass per Booster**:
  - Dry mass: ~100,500 kg (221,500 lb)
  - Propellant mass: ~628,500 kg (1,385,000 lb) PBAN (polybutadiene acrylonitrile)
  - Gross mass: ~729,000 kg (1,607,000 lb)
- **Thrust**:
  - Sea-level liftoff thrust per booster: 16.0 MN (3,600,000 lbf)
  - Combined twin booster thrust: 32.0 MN (7,200,000 lbf) — delivers 75% of total launch thrust
- **Specific Impulse (Isp)**: 269 s (sea level)
- **Burn Duration**: ~126 seconds (2 min 6 s)
- **Staging / Separation**:
  - Separation altitude: ~45–48 km (148,000–157,000 ft)
  - Separation velocity: ~1,850 m/s (Mach 4.5+)
  - Booster Separation Motors (BSMs): 16 small solid motors (8 forward, 8 aft per booster) push spent casings radially away from core.

### 2.2 Core Stage
- **Manufacturer**: The Boeing Company (Michoud Assembly Facility, New Orleans)
- **Height**: 64.6 m (212 ft)
- **Diameter**: 8.4 m (27.6 ft)
- **Thermal Protection System**: Orange spray-on polyisocyanurate thermal insulation foam
- **Dry Mass**: ~85,275 kg (188,000 lb)
- **Propellant Mass**: ~987,460 kg (2,177,000 lb)
  - Liquid Oxygen (LOX): ~832,200 kg (742,000 L at -183 °C / 90 K)
  - Liquid Hydrogen (LH₂): ~155,260 kg (2,030,000 L at -253 °C / 20 K)
- **Engines**: 4 x Aerojet Rocketdyne RS-25D/E (liquid hydrolox staged-combustion cycle)
  - Sea-level thrust (4 engines at 109% rated power): 7.436 MN (1,671,000 lbf) [1.859 MN each]
  - Vacuum thrust (4 engines at 109% rated power): 9.116 MN (2,049,000 lbf) [2.279 MN each]
  - Specific Impulse (Isp): 366 s (sea level) / 452 s (vacuum)
  - Engine Gimbal Range: ±8° pitch and yaw via dual hydraulic servoactuators
- **Burn Duration**: ~485 seconds (8 min 5 s)
- **Main Engine Cutoff (MECO)**:
  - Altitude: ~165 km (541,000 ft)
  - Inertial Velocity: ~7,809 m/s (28,100 km/h) into 165 km x 1,800 km insertion sub-orbit
  - Target Perigee/Apoapsis at separation: Perigee ~30 km (disposal into ocean), Apoapsis ~1,805 km.

### 2.3 Launch Vehicle Stage Adapter (LVSA) & ICPS
- **LVSA**: Conical composite shroud connecting 8.4 m core to 5.1 m ICPS; encloses the RL10B-2 engine bell during first-stage ascent.
- **Interim Cryogenic Propulsion Stage (ICPS)**:
  - Based on ULA Delta Cryogenic Second Stage (DCSS)
  - Height: 13.7 m, Diameter: 5.1 m
  - Engine: 1 x Aerojet Rocketdyne RL10B-2 hydrolox expander cycle engine
  - Vacuum Thrust: 110.1 kN (24,750 lbf)
  - Vacuum Isp: 462.4 s
  - Propellant: ~28,700 kg (LH₂ / LOX)
  - Primary Burns:
    1. Perigee Raise Burn: At apogee (T+51 min), burns ~20–30 s (+30 m/s delta-v) to circularize orbit into stable 185 km x 185 km parking orbit.
    2. Trans-Lunar Injection (TLI): T+90 min over Pacific Ocean, burns ~18 minutes (3,050 m/s delta-v) to send Orion into translunar trajectory.

### 2.4 Launch Abort System (LAS)
- **Height**: 15.2 m (50 ft)
- **Motors**:
  - Abort Motor: 1.76 MN (400,000 lbf) solid rocket motor pulls Orion capsule away from catastrophic pad failure.
  - Attitude Control Motor: 8 thrusters steer the abort trajectory.
  - Jettison Motor: 178 kN (40,000 lbf) solid motor jettisons the LAS tower at T+200–220 s (~75 km altitude) during nominal launch.

---

## 3. Flight Profile, Aerodynamics & Staging Timeline

| Time (T+) | Event | Altitude | Velocity | Acceleration | Aerodynamic Conditions |
|---|---|---|---|---|---|
| **T-00:00:06.6** | RS-25 Core Engines Ignition (4 engines staggered 120 ms) | 0 m | 0 m/s | 0 g | Pad water sound deluge active (1.1M L/min) |
| **T-00:00:00** | Twin SRB Ignition & Hold-Down Release | 0 m | 0 m/s | 1.53 g | Liftoff acoustic roar & flame trench deflection |
| **T+00:00:10** | Tower Clearance & Roll/Pitch Gravity Turn Initiation | 180 m | 42 m/s | 1.62 g | Pitch toward 91.5° flight azimuth |
| **T+00:00:48** | Transonic Transition (Mach 1.0) | 7.8 km | 320 m/s | 1.95 g | Prandtl-Glauert vapour cone forms |
| **T+00:01:05** | **Max-Q (Maximum Dynamic Pressure)** | **12.4 km** | **450 m/s** | **2.20 g** | Peak dynamic pressure $q \approx 36.5\text{ kPa}$ |
| **T+00:02:06** | Twin SRB Burnout & Separation | 46.5 km | 1,850 m/s | 3.85 g | 16 BSMs fire; boosters tumble radially outward |
| **T+00:03:30** | LAS (Launch Abort System) Tower Jettison | 76.0 km | 2,420 m/s | 1.65 g | Jettison motor fires; Orion windows uncovered |
| **T+00:08:05** | Main Engine Cutoff (MECO) | 165.2 km | 7,809 m/s | 3.00 g (throttled) | RS-25 shutdown; zero-g float |
| **T+00:08:15** | Core Stage Separation | 166.0 km | 7,810 m/s | 0 g | Pneumatic separation; Core descends to ocean |
| **T+00:51:00** | ICPS Perigee Raise Circularization Burn | 185.0 km | 7,790 m/s | 0.35 g | RL10B-2 fires ~28 s; circularizes parking orbit |
| **T+01:32:00** | Trans-Lunar Injection (TLI) Burn | 185.0 km | 10,840 m/s | 0.38–0.72 g | RL10B-2 fires ~18 min (+3,050 m/s delta-v) |
