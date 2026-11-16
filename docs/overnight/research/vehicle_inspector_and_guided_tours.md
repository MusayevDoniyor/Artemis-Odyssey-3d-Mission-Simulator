# Vehicle Inspector Architecture, Assembly Axes & Guided Systems Tours (Phase 8)

## 1. Overview & Pedagogical Objectives
The Vehicle Inspector is the core interactive engineering museum of Artemis Odyssey. Rather than treating spacecraft as static display models or decorative 3D assets, every vehicle is deconstructed into authentic aerospace subsystems along physical manufacturing and assembly axes.

The goals for Phase 8 are:
1. **Multi-Stage Exploded View along Assembly Axes**: Subsystems displace along verified mechanical mate/demate directions (e.g. radial booster separation, axial interstage jettison, planar solar array deployment), never random or aesthetic-only vectors.
2. **100% Verified Technical Depth**: Zero placeholder or generic copy (no "Part 1" or fictional specs). Every part contains:
   - Primary operational function
   - Physical dimensions and mass
   - 3+ engineering parameters (e.g. chamber pressure, specific impulse, thermal limits, bus voltage)
   - 3-level educational explanation (Level 1 "What", Level 2 "How", Level 3 "Engineering")
   - Primary NASA/ESA source citations
3. **Interactive Guided Systems Tours**: Linear, step-by-step engineering walkthroughs answering foundational aerospace questions:
   - *How SLS Works*: Pad ignition through SRB separation, Core burn, ICPS TLI insertion.
   - *How Orion Keeps Crew Alive*: Atmospheric ECLSS, Avcoat heat shield, ESM power/radiators.
   - *How LM Landed on the Moon*: Descent stage throttling, crushable landing gear, ascent stage return.
   - *How Perseverance Samples Mars*: Rocker-bogie mobility, MMRTG nuclear power, robotic coring drill & sample caching.
   - *How ISS Sustains Human Life in LEO*: 108.5m integrated truss, solar array wings, pressurized labs, ammonia radiators, Canadarm2.
4. **Integrated Knowledge Quizzes**: Immediate educational reinforcement with 3-option multiple choice questions, corrective feedback, and the interactive 3D Part Finder challenge.

---

## 2. Assembly Axes & Multi-Stage Exploded Views

| Vehicle | Part ID | Subsystem | Explode Vector [X, Y, Z] | Physical Assembly / Separation Axis |
| :--- | :--- | :--- | :--- | :--- |
| **SLS Block 1** | `sls-boosters` | Twin 5-Segment SRBs | `[±5.2, 0, 0]` | Radial outward separation along booster thrust pins & BSM motors |
| | `sls-core` | Cryogenic Core Stage | `[0, -4.5, 0]` | Axial downward displacement away from Launch Vehicle Stage Adapter (LVSA) |
| | `sls-rs25` | 4× RS-25 Core Cluster | `[0, -7.8, 0]` | Aft boat-tail engine compartment removal along thrust structure gimbal mounts |
| | `sls-icps` | RL10B-2 Upper Stage | `[0, 2.2, 0]` | Axial separation from Core Stage forward skirt into translunar coast |
| | `sls-esm` | European Service Module | `[0, 5.0, 0]` | Service module separation from spacecraft adapter cone |
| | `sls-orion` | Orion Crew Module | `[0, 7.5, 0]` | Crew module separation from service module prior to atmospheric entry |
| | `sls-las` | Launch Abort System | `[0, 11.0, 0]` | Tower jettison motor firing along vertical ascent centerline |
| **Saturn V** | `saturn-sic` | S-IC First Stage | `[0, -6.0, 0]` | Downward separation along 8 retro-rocket thrust vector |
| | `saturn-sii` | S-II Second Stage | `[0, -2.5, 0]` | Dual-plane interstage ring separation |
| | `saturn-sivb` | S-IVB Third Stage | `[0, 2.0, 0]` | Translunar injection stage separation |
| | `saturn-iu-sla` | Instrument Unit & SLA | `[0, 4.5, 0]` | 4 SLA clamshell panels blooming outward along hinge pins |
| | `saturn-csm` | Apollo CSM | `[0, 7.0, 0]` | CSM transposition, docking, and extraction axis |
| | `saturn-les` | Launch Escape System | `[0, 10.5, 0]` | Escape tower jettison along vertical centerline |
| **Falcon 9** | `falcon-stage1` | Booster Stage | `[0, -4.5, 0]` | Pneumatic collet release along interstage separation axis |
| | `falcon-grid-fins` | Titanium Grid Fins | `[±2.5, 0, 0]` | Radial deployment outward from interstage circumference |
| | `falcon-landing-legs` | Carbon-Fiber Legs | `[±2.8, -2.0, 0]` | Pneumatic deployment downward and outward for landing touchdown |
| | `falcon-interstage` | Carbon Interstage | `[0, -1.5, 0]` | Intermediate structural interface |
| | `falcon-stage2` | Second Stage & MVacD | `[0, 2.8, 0]` | Upper stage acceleration axis |
| | `falcon-fairing` | 5.2 m Clamshell Fairing | `[±3.2, 3.5, 0]` | Bilateral split along explosive pneumatic zip-strip seam |
| **Apollo LM** | `lm-descent` | Descent Stage & Gear | `[0, -3.2, 0]` | Four explosive guillotine nuts severing interstage truss ties |
| | `lm-ascent` | Ascent Stage & Cabin | `[0, 3.2, 0]` | APS engine ignition liftoff axis from lunar surface launch pad |
| | `lm-rcs` | Marquardt RCS Quads | `[±2.0, 0, ±2.0]` | Radial maintenance access and inspection vectors |
| **VIPER / Rover** | `rover-mobility` | Rocker-Bogie & Wheels | `[0, -1.8, 0]` | Downward suspension maintenance inspection drop |
| | `rover-science` | TRIDENT Drill & NIRVSS | `[0, 0, 2.2]` | Forward deployment of coring mast and spectrometer bench |
| | `rover-power` | Solar Mast & Batteries | `[0, 2.0, 0]` | Vertical extension of mast and thermal enclosure |
| | `rover-comms` | High-Gain Antenna (HGA) | `[0, 2.2, -1.5]` | Aft/zenith gimbal articulation axis |
| **ISS** | `iss-truss` | Integrated Truss (ITS) | `[0, 0, 0]` | Central structural datum (108.5 m length) |
| | `iss-modules` | Pressurized Habitats | `[0, -2.5, 3.5]` | Forward/aft Common Berthing Mechanism (CBM) axial slide |
| | `iss-solar-arrays` | 8 Solar Array Wings | `[±8.0, 0, 0]` | Outward lateral expansion along SARJ rotational joints |
| | `iss-radiators` | Ammonia Thermal Radiators | `[0, 3.5, -3.5]` | Dorsal/aft rotation away from truss thermal loop bays |
| | `iss-canadarm` | Canadarm2 Manipulator | `[2.5, 3.0, 1.5]` | Outward operational clearance from Mobile Base System track |

---

## 3. Verified Aerospace Source Citations

1. **NASA Space Launch System (SLS)**:
   - *NASA SLS Mission Planner's Guide (ESD 30000)*: Launch vehicle specifications, mass budgets, stage dimensions, thrust ratings, and stage separation timelines.
   - *NASA Marshall Space Flight Center SLS Fact Sheet*: RS-25 hydrolox core engine parameters (2,279 kN vac thrust, 452.3 s Isp, 109% RPL), Northrop Grumman 5-segment solid rocket booster propellant formulation (polybutadiene acrylonitrile / PBAN).
2. **Orion Multi-Purpose Crew Vehicle (MPCV) & ESM**:
   - *NASA Orion Quick Facts & Technical Press Kit*: 5.0m Avcoat ablative heat shield, 4-person 21-day life support specs, ECLSS nitrogen/oxygen 101.3 kPa regulation.
   - *ESA European Service Module Technical Overview*: 4 X-wing solar panels (11.2 kW at 1 AU), Aerojet Rocketdyne AJ10-190 OMS engine (26.7 kN vac thrust, 316 s Isp), ammonia thermal loops.
3. **Apollo Saturn V & Lunar Module (LM)**:
   - *NASA SP-4029: Apollo by the Numbers*: S-IC (5× F-1, 35.1 MN liftoff thrust), S-II (5× J-2, 5.1 MN vac thrust), S-IVB (1× J-2, 1.0 MN vac thrust), Instrument Unit LVDC specifications.
   - *Grumman Aerospace Apollo 11 Lunar Module Operations Handbook (LM 5)*: Descent Propulsion System (DPS) throttling (4.6 kN to 46.7 kN, 10:1 throttle ratio), Ascent Propulsion System (APS) 15.6 kN pressure-fed hypergolic engine, aluminum honeycomb landing gear crush cartridges.
4. **NASA Jet Propulsion Laboratory Mars Exploration**:
   - *NASA JPL Perseverance Mars 2020 Press Kit*: 1,025 kg rover mass, MMRTG 110W electrical / 2,000W thermal power from 4.8 kg Plutonium-238, 2.1 m robotic arm with coring drill, Adaptive Caching Assembly (ACA), Mastcam-Z stereoscopic multispectral imager.
   - *NASA VIPER Polar Rover Technical Documentation*: 450 kg rover, 4-wheel active suspension, 1-meter TRIDENT percussive drill, NIRVSS and MSolo spectrometers.
5. **International Space Station (ISS)**:
   - *NASA Reference Guide to the International Space Station*: 419,725 kg orbiting mass, 108.5 m truss length, 72.8 m module length, 916 m³ habitable volume, 8 Solar Array Wings (2,400 m² total surface area, 120 kW power), Canadarm2 SSRMS 17.6 m robotic manipulator.
6. **Commercial Launch Vehicles (Falcon 9)**:
   - *SpaceX Falcon 9 Launch Vehicle User's Guide (Rev 3.0)*: Octaweb 9× Merlin 1D sea level cluster (7,607 kN liftoff thrust), MVacD second stage vacuum engine (981 kN vac thrust, 348 s Isp), 5.2 m carbon-composite clamshell fairing, cold gas nitrogen RCS thrusters, titanium grid fins.
