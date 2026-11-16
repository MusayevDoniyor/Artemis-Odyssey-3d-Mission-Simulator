# Aerospace Research: NASA Orion MPCV & European Service Module (ESM)

## 1. Flight Stack Architecture & Dimensions
- **Spacecraft Identifier**: Orion Multi-Purpose Crew Vehicle (MPCV).
- **Primary Contractor (Crew Module)**: Lockheed Martin Space (Denver, CO).
- **Primary Contractor (Service Module)**: Airbus Defence and Space (Bremen, Germany) under ESA contract.
- **Flight Stack Dimensions**:
  - Crew Module (CM) Diameter: 5.02 m (16.5 ft).
  - Crew Module Height: 3.33 m (10.9 ft).
  - Habitable Volume: 9.0 m³ (316 cu ft) pressurized cabin; 19.55 m³ total pressurized volume.
  - Crew Capacity: 4 astronauts for up to 21 days active mission duration (expandable with habitat module).
  - European Service Module (ESM) Diameter: 4.12 m (excluding solar arrays).
  - ESM Cylindrical Length: 4.00 m (13.1 ft) from spacecraft adapter to CM heat shield interface.
  - Solar Array Wingspan: 19.0 m (62.3 ft) across 4 deployable X-wing articulated wings.
  - Combined Orion Spacecraft Wet Mass: ~26,520 kg (~58,470 lb).
    - Crew Module (wet): ~10,400 kg.
    - ESM (wet): ~15,460 kg (~8,600 kg usable bipropellant).

---

## 2. Subsystems & Articulating Components

### 2.1 Orion Crew Module (CM)
- **Primary Structure**: Welded aluminum-lithium alloy (Al-Li 2195) pressurized pressure vessel encased in titanium backbone stringers and composite outer backshell panels.
- **Thermal Protection System (TPS)**:
  - Base Heat Shield: 5.02 m diameter spherical cap coated with Avcoat ablative syntactic foam (fibreglass honeycomb filled with epoxy novolac resin). Formulated to withstand 2,760°C (5,000°F) and entry velocities of 39,500 km/h (Mach 32) direct from lunar return.
  - Backshell Tiles: ~1,300 black high-temperature reusable ceramic tiles (AETB-8) on windward/leeward slopes.
  - Low-Emissivity Silver Coating: Aluminized thermal control film applied over backshell to stabilize orbital radiational cooling.
- **Reaction Control System (RCS)**:
  - 12 monopropellant MR-104G hydrazine thrusters (160 N / 36 lbf each).
  - Arranged in 6 redundant roll, pitch, and yaw couples for entry corridor steering and attitude hold after ESM separation.
- **Docking System**:
  - NASA Docking System (NDS) low-impact mating collar (1.27 m internal passage diameter) with peripheral latches, alignment petals, and 24-pin electrical/data feedthroughs.
- **Cockpit Windows & Hatch**:
  - 2 forward-facing triangular pilot windows (chemically strengthened aluminosilicate glass with infrared reflective and anti-reflective coatings).
  - Starboard crew ingress/egress outward-opening hatch (flush seal with explosive release pyrotechnic bolts for emergency egress).

### 2.2 European Service Module (ESM)
- **Main Propulsion Engine (OMS)**:
  - Aerojet Rocketdyne AJ10-190 pressure-fed rocket engine (Space Shuttle Orbital Maneuvering System heritage).
  - Vacuum Thrust: 26.7 kN (6,000 lbf).
  - Specific Impulse ($I_{sp}$): 312 s.
  - Propellants: Monomethylhydrazine (MMH) fuel and Nitrogen Tetroxide (NTO / MON-3) oxidizer stored in 4 titanium cylindrical tanks ($2 \times 2,100\text{ L}$).
- **Auxiliary Propulsion**:
  - 8 Aerojet Rocketdyne R-4D-11 thrusters (490 N / 110 lbf each) mounted in fixed pods for translational velocity trim and orbit insertion backup.
  - 24 Airbus RCS thrusters (220 N each) in 6 clusters of 4 for fine attitude control.
- **Electrical Power Generation & Articulation**:
  - 4 deployable solar array wings configured in an "X-wing" pattern at 45° dihedral angles.
  - Each wing consists of 3 rigid carbon-fiber reinforced polymer (CFRP) panels populated with triple-junction gallium arsenide (GaAs) solar cells.
  - Total Power Output: 11.2 kW at 1 AU.
  - Two-axis Sun-tracking gimbals ($\pm 35^\circ$ canting during burn to reduce inertial acoustic/vibration loads from AJ10 thrust vector).
- **Thermal Control & Life Support**:
  - Active Liquid Cooling Loops: Water/glycol radiators integrated into external cylindrical shear panels.
  - Life Support Gas Delivery: 90 kg breathable oxygen and 30 kg nitrogen stored in high-pressure composite overwrapped pressure vessels (COPVs), delivered through the umbilical to the CM cabin.

### 2.3 Launch Abort System (LAS)
- **Tower Height**: 13.5 m (44.3 ft), 7,200 kg gross mass.
- **Abort Motor**: Solid propellant rocket generating 1,780 kN (400,000 lbf) peak thrust in <3.2 s to accelerate Orion away from a failing booster at 15g.
- **Attitude Control Motor (ACM)**: 8 proportional thrust valves producing 31 kN total lateral thrust for pitch-over steering.
- **Jettison Motor**: 140 kN solid motor to separate LAS tower cleanly after nominal core ascent past 95 km altitude.

### 2.4 Interim Cryogenic Propulsion Stage (ICPS)
- **Manufacturer**: United Launch Alliance (ULA) (Delta IV heritage).
- **Dimensions**: 13.7 m length, 5.1 m diameter, 28,500 kg hydrolox propellant mass.
- **Engine**: Single Aerojet Rocketdyne RL10B-2 engine with deployable carbon-carbon nozzle extension.
  - Vacuum Thrust: 110.1 kN (24,750 lbf).
  - Specific Impulse ($I_{sp}$): 465.5 s (highest efficiency operational chemical upper stage engine).
  - Translunar Injection (TLI): Burns for ~18 minutes to apply $\approx 3,150\text{ m/s}$ delta-v, lifting Orion out of Low Earth Orbit onto a cislunar free-return trajectory.

---

## 3. Materials & Visual Verification Standards
1. **White Ortho-Fabric Thermal Blankets**: High diffuse reflectance ($R \approx 0.88$), low specular roughness ($0.38$).
2. **Aluminized Gold/Silver Multi-Layer Insulation (MLI)**: High metalness ($0.85$), low roughness ($0.15$), anisotropic micro-crinkles.
3. **Black Ceramic Entry Tiles**: Flat matte ($0.75$ roughness, $0.15$ metalness), hex-grid seam lines.
4. **Deep Indigo Solar Panels**: Metallic specular gloss ($0.65$), dark blue/indigo color with faint busbar gridlines.
5. **Nozzle Bell**: Niobium alloy / carbon-carbon dark gunmetal finish ($0.80$ metalness, $0.35$ roughness).

---

## 4. References & Verified Sources
- NASA Orion Quick Facts: https://www.nasa.gov/reference/orion-spacecraft/
- ESA European Service Module Specifications: https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Orion/European_Service_Module
- Lockheed Martin Orion Crew Module Design: https://www.lockheedmartin.com/en-us/capabilities/space/orion.html
- Artemis I Press Kit & Mission Flight Parameters (NASA NP-2022-08-3012-HQ).
