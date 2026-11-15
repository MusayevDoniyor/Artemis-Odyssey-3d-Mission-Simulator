# Research: Modern Commercial Launcher (SpaceX Falcon 9 Full Thrust)

## 1. Overview & Vehicle Geometry
- **Vehicle**: Falcon 9 Full Thrust (Block 5)
- **Role**: Reusable two-stage medium/heavy lift commercial orbital launch vehicle
- **Total Height**: 70.0 m (229.6 ft) with standard payload fairing
- **Core Diameter**: 3.66 m (12.0 ft)
- **Fairing Diameter**: 5.2 m (17.1 ft)
- **Total Liftoff Mass**: 549,054 kg (1,207,920 lb)
- **Total Liftoff Thrust**: 7,607 kN (7.61 MN / 1,710,000 lbf) at sea level
- **Thrust-to-Weight Ratio (TWR) at Liftoff**: ~1.41
- **Payload Capacity**:
  - LEO (expendable): 22,800 kg (50,265 lb)
  - LEO (reusable drone ship recovery): ~17,500 kg
  - GTO: 8,300 kg (expendable) / 5,500 kg (reusable)
- **Primary Sources**:
  - SpaceX Falcon 9 Launch Vehicle Payload User's Guide (Rev 3.0)
  - Federal Aviation Administration (FAA) Commercial Launch Licenses

---

## 2. Stage-by-Stage Subsystems

### 2.1 First Stage (Booster)
- **Height**: 47.7 m
- **Diameter**: 3.66 m
- **Structural Material**: Aluminum-lithium alloy tanks with carbon-composite interstage
- **Dry Mass**: ~22,200 kg
- **Propellant Mass**: ~411,000 kg
  - Fuel: Densified RP-1 kerosene (chilled to -7 °C)
  - Oxidizer: Densified Liquid Oxygen (LOX, chilled to -207 °C)
- **Engines**: 9 x Merlin 1D (M1D) gas-generator cycle engines arranged in Octaweb configuration (8 outer, 1 center)
  - Sea-level thrust per engine: 845 kN (190,000 lbf)
  - Vacuum thrust per engine: 914 kN (205,500 lbf)
  - Sea-level Isp: 282 s / Vacuum Isp: 311 s
  - Throttle capability: 40% to 100%
- **Reusability Hardware**:
  - 4 x Hypersonic Titanium Grid Fins mounted at top of first stage (independent hydraulic gimbal for atmospheric pitch/yaw/roll guidance)
  - 4 x Pneumatically deployed carbon fiber landing legs at base (span 18 m when unfolded)
  - Cold gas thrusters (nitrogen) on interstage for exo-atmospheric attitude maneuvers
- **Burn Duration**: ~162 s (2 min 42 s)
- **Main Engine Cutoff (MECO)**: Altitude ~65–70 km, velocity ~1,650–2,000 m/s

### 2.2 Interstage & Second Stage
- **Interstage**: Carbon fiber composite cylinder housing pneumatic pusher stage separation mechanism.
- **Second Stage**:
  - Height: 12.6 m, Diameter: 3.66 m
  - Dry mass: ~4,000 kg, Propellant: ~107,500 kg densified LOX/RP-1
  - Engine: 1 x Merlin 1D Vacuum (MVacD) engine with extended niobium radiation-cooled nozzle bell
  - Vacuum thrust: 981 kN (220,500 lbf), Vacuum Isp: 348 s
  - Burn time: ~397 s (6 min 37 s)
- **Payload Fairing**:
  - Height: 13.1 m, Diameter: 5.2 m
  - Carbon composite sandwich structure, jettisoned at ~T+210 s (~110 km altitude) via pneumatic pushers.

---

## 3. Flight Profile Comparison Table

| Parameter | NASA SLS Block 1 | NASA Saturn V | SpaceX Falcon 9 (FT) |
|---|---|---|---|
| **Height** | 98.3 m | 110.6 m | 70.0 m |
| **Diameter** | 8.4 m (16.1 m span) | 10.06 m | 3.66 m |
| **Liftoff Mass** | 2,608,000 kg | 2,970,000 kg | 549,054 kg |
| **Liftoff Thrust** | 39.1 MN | 34.5 MN | 7.61 MN |
| **First Stage Engines** | 2x SRB + 4x RS-25 | 5x F-1 | 9x Merlin 1D |
| **First Stage Propellants**| Solid PBAN + Hydrolox | RP-1 / LOX | Densified RP-1 / LOX |
| **MECO Velocity** | ~7,809 m/s (Direct to orbit) | ~2,390 m/s (S-IC cutoff) | ~1,850 m/s (Booster cutoff) |
| **Burn Time (First Stage)**| 126 s (SRBs) / 485 s (Core) | 168 s | 162 s |
| **Recovery Mode** | Expendable | Expendable | Propulsive Boostback / ASDS Drone Ship Landing |
