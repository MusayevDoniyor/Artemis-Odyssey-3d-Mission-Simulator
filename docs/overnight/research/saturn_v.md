# Research & Verified Engineering Specifications: NASA Saturn V Launch Vehicle

## 1. Overview & Vehicle Geometry
- **Vehicle**: NASA Saturn V (Apollo lunar flight configuration, SA-501 through SA-512)
- **Total Height**: 110.6 m (363.0 ft) with Apollo Command/Service Module and Launch Escape System (LES)
- **Base Diameter (S-IC First Stage)**: 10.06 m (33.0 ft)
- **Total Liftoff Mass**: 2,970,000 kg (6,540,000 lb)
- **Total Liftoff Thrust**: 34,500,000 N (34.5 MN / 7,750,000 lbf) from 5 x Rocketdyne F-1 engines
- **Thrust-to-Weight Ratio (TWR) at Liftoff**: ~1.18–1.22
- **Payload to Low Earth Orbit (LEO)**: ~140,000 kg (310,000 lb)
- **Payload to Trans-Lunar Injection (TLI)**: ~48,600 kg (107,100 lb)
- **Primary Sources**:
  - NASA SP-4029 (Saturn Illustrated Chronology)
  - NASA Marshall Space Flight Center Saturn V Flight Manual (MSFC-MAN-507)
  - Apollo 11 Flight Evaluation Report (NASA MSFC)

---

## 2. Stage-by-Stage Architecture

### 2.1 First Stage: S-IC (Boeing)
- **Height**: 42.1 m (138 ft)
- **Diameter**: 10.06 m (33 ft)
- **Empty / Dry Mass**: 130,000 kg (288,000 lb)
- **Propellant Mass**: 2,150,000 kg (4,740,000 lb)
  - Fuel: RP-1 high-grade kerosene (810,000 L / 214,000 gal)
  - Oxidizer: Liquid Oxygen (LOX) (1,311,000 L / 346,000 gal)
- **Engines**: 5 x Rocketdyne F-1 gas-generator engines
  - Sea-level thrust per engine: 6.77 MN (1,522,000 lbf), increasing to 7.74 MN in vacuum
  - Total stage liftoff thrust: 33.85 MN (7,610,000 lbf)
  - Specific Impulse: 263 s (sea level) / 304 s (vacuum)
  - Burn time: 168 seconds (2 min 48 s)
  - Staging: Altitude ~67 km, velocity ~2,390 m/s (~Mach 7.1)
  - Center F-1 engine shuts down at T+135 s to cap acceleration at 4.0 g.

### 2.2 Second Stage: S-II (North American Aviation)
- **Height**: 24.8 m (81.5 ft)
- **Diameter**: 10.06 m (33 ft)
- **Empty / Dry Mass**: 40,100 kg (88,400 lb)
- **Propellant Mass**: 454,000 kg (1,000,000 lb)
  - Liquid Hydrogen (LH₂): 1,020,000 L (270,000 gal)
  - Liquid Oxygen (LOX): 314,000 L (83,000 gal)
- **Engines**: 5 x Rocketdyne J-2 hydrolox engines
  - Vacuum thrust: 1.03 MN (230,000 lbf) per engine = 5.15 MN (1,150,000 lbf) total
  - Specific Impulse: 421 s (vacuum)
  - Burn time: 360 seconds (6 min 0 s)
  - Staging: Altitude ~175 km, velocity ~6,990 m/s

### 2.3 Third Stage: S-IVB (Douglas Aircraft)
- **Height**: 17.8 m (58.4 ft)
- **Diameter**: 6.6 m (21.7 ft)
- **Empty / Dry Mass**: 15,200 kg (33,500 lb)
- **Propellant Mass**: 109,000 kg (240,000 lb) LH₂ / LOX
- **Engine**: 1 x Rocketdyne J-2 hydrolox engine (restartable in vacuum)
  - Vacuum thrust: 1.03 MN (230,000 lbf)
  - Specific Impulse: 421 s (vacuum)
  - First Burn: 150 s to circularize Apollo CSM/LM into 185 km parking orbit (velocity 7,790 m/s)
  - Second Burn (TLI): Re-ignited ~2.5 hours into mission, burns 350 s (+3,050 m/s) to achieve escape trajectory (velocity ~10,840 m/s).

---

## 3. Flight Profile & Comparison with SLS

| Parameter | Saturn V (Apollo) | SLS Block 1 (Artemis) | Comparison Notes |
|---|---|---|---|
| **Total Height** | 110.6 m (363 ft) | 98.3 m (322 ft) | Saturn V is 12.3 m taller |
| **First Stage Diameter** | 10.06 m (33 ft) | 8.4 m core + twin 3.71 m SRBs | SLS has wider effective wingspan (16.1 m) |
| **Liftoff Mass** | 2,970,000 kg | 2,608,000 kg | Saturn V is ~14% heavier |
| **Liftoff Thrust** | 34.5 MN (7.75M lbf) | 39.1 MN (8.80M lbf) | SLS produces 13% more liftoff thrust |
| **Boosters** | None (all-liquid S-IC) | Two 5-segment solid rocket boosters | SLS relies heavily on SRBs for first 2 minutes |
| **First Stage Propellants** | RP-1 Kerosene / LOX | Liquid Hydrogen / LOX (+ Solid PBAN) | F-1 produces brilliant bright yellow-white kerosene flame; RS-25 produces pale blue transparent hydrolox |
| **Max-Q Time / Altitude** | T+84 s / 13.5 km | T+65 s / 12.4 km | SLS reaches Max-Q faster due to higher initial acceleration |
