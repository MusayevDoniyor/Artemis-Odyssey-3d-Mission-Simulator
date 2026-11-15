# ARTEMIS ODYSSEY: GAME DESIGN DOCUMENT (GDD)
**Document Version:** 2.1.0 · **Target Phase:** Post-Audit Rebuild  
**Primary Focus:** Educational Spaceflight Simulator Game  
**Author:** Lead Game Designer & Systems Architect  
**Architecture Baseline:** NASA Primary Sources as of November 2026 (`nasa.gov/artemis`)  

---

## 1. VISION & CORE PHILOSOPHY

### 1.1 The High Concept
**Artemis Odyssey** is an authentic, educational 3D spaceflight simulator game where players master real aerospace engineering, orbital mechanics, and space science by actively piloting missions grounded in NASA's updated Artemis and Mars architectures.

### 1.2 The Core Problem with Version 1.0 (Post-Hackathon)
- It was an overwhelming cockpit of unlabelled, graduate-level numbers (`ṁ`, `Isp`, `q`, negative periapsis `-6364 km`) wrapped in disjointed popups.
- It lacked the fundamental loop of a game: players had no clear goal, no progressive onboarding, punishing and confusing failure (spawning into a 4-second crash), and no satisfying closure.

### 1.3 The Guiding Pillars of Version 2.0
1. **Show, Don't Just Tell**: Concepts like Max-Q, orbital circularization, or gravitational assist must be physically experienced through flight controls and visual cues, not read from a static modal.
2. **Progressive Disclosure**: Start clean. Instruments and telemetry reveal themselves as the player is taught how to read them.
3. **Failure is a Flight Debrief**: A crash or missed orbit is never a dead-end "GAME OVER". It triggers a slow-motion telemetry replay and a clear "What Happened & Why" debrief with an instant 1-click retry.
4. **Honest Science (Dated as of November 2026)**: Where the game simplifies or uses time compression, it explicitly says so. Fictional concept hardware is clearly labeled as fictional, and NASA primary source manifests are strictly cited.
5. **Learn → Apply → Reuse**: Every mission provides carryover benefits (docking protocols, mined water ice, radiation shielding) that visibly impact future flights.

---

## 2. TARGET AUDIENCE & TWO-TIER SIMULATION MODES

### 2.1 Primary Audience
- **Target**: Ages 12+ through adults curious about real space exploration, astronomy, and STEM.
- **Tone**: Professional, encouraging, immersive NASA Mission Control aesthetic. The childish "ages 8–14" framing and patronizing trivia toasts are removed.

### 2.2 Two Flight Simulation Modes (Toggled in Settings or Pre-Flight)

```
+-----------------------------------------------------------------------------------------+
|                                  FLIGHT DIFFICULTY MODES                                |
|                                                                                         |
|  [ CADET MODE ] (Default for newcomers)        [ ENGINEER MODE ] (For space enthusiasts)|
|  - Streamlined, clean HUD                      - Full aerospace telemetry (SI units)    |
|  - Flight director guidance overlays (PIPS)    - Manual pitch programs & throttle trim  |
|  - Rate-assist and automatic hover active       - Raw TWR, mass flow (ṁ), dynamic q     |
|  - Forgiving touchdown tolerances (< 3.5 m/s)  - True NASA flight limits (< 1.8 m/s)    |
|  - Clear qualitative gauges (Green/Amber/Red)  - Detailed delta-V & orbital elements    |
+-----------------------------------------------------------------------------------------+
```

1. **Cadet Mode (Default)**:
   - Designed for players learning space mechanics for the first time.
   - Replaces intimidating differential formulas with intuitive vector indicators and colored safety zones.
   - Assists enabled by default: Auto-Pitch program during launch, Rate-Assist (horizontal drift cancellation) during landing.
2. **Engineer Mode**:
   - Designed for flight sim enthusiasts, physics students, and Kerbal Space Program players.
   - Unmasks complete raw SI numbers: dynamic pressure ($q$ in kPa), propellant mass flow ($\dot{m}$ in kg/s), true apoapsis/periapsis relative to mean surface radius, specific impulse ($I_{sp}$), and exact delta-V expended.
   - Manual gimbal control and strict landing limits ($v_y \le 1.8\text{ m/s}$, tilt $\le 6^\circ$).

---

## 3. MASTER TOUCHDOWN TOLERANCE TABLE

This single authoritative table defines all touchdown and crash evaluations across Cadet Mode and Engineer Mode:

| Parameter | Cadet Mode (Forgiving / Assists) | Engineer Mode (NASA Flight Standard) | Units | Failure Diagnostic Message |
| :--- | :---: | :---: | :---: | :--- |
| **Max Vertical Velocity ($v_y$)** | $\le 3.5$ | $\le 1.8$ | $\text{m/s}$ | `"SINK RATE EXCESS: Impact at {speed} m/s exceeded landing gear limit ({limit} m/s)"` |
| **Max Horizontal Velocity ($v_{xz}$)** | $\le 1.5$ | $\le 0.6$ | $\text{m/s}$ | `"LATERAL DRIFT: Ground speed at {speed} m/s caused gear shear and tip-over"` |
| **Max Touchdown Tilt Angle** | $\le 15^\circ$ | $\le 6^\circ$ | degrees | `"ATTITUDE TILT: Touchdown at {tilt}° exceeded vehicle static stability envelope"` |
| **Max Terrain Slope at Pad** | $\le 12^\circ$ | $\le 7^\circ$ | degrees | `"SLOPE HAZARD: Landing on {slope}° slope caused rollover"` |
| **Hover Throttle Equilibrium** | Auto-Trimmed ($\sim 45\%$) | Manual Feathering ($40\text{--}55\%$) | $\%$ | `"THRUST MISMATCH: Throttle dropped below 1.0 TWR above surface"` |

---

## 4. AUTHENTIC NASA ARTEMIS CAMPAIGN (As of November 2026)

NASA's Moon-to-Mars manifest was significantly updated in 2025–2026 (`Source: nasa.gov/artemis manifests, 2026 updates`). Gateway construction was paused in March 2026, Artemis III was re-scoped as a LEO docking demonstration, and the crewed surface landing shifted to Artemis IV:

| Mission | Official Designation & Real-World Status | Environment & Objective | Interactive Mechanics | Real Science & Engineering Taught | Concrete Carryover Unlocked |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Mission 1** | **Artemis II: Crewed Lunar Flyby**<br>*(Flown Mission: April 2026)* | Earth LC-39B $\to$ High Earth Orbit $\to$ Lunar Free-Return Trajectory | 1. Manual SLS liftoff & gravity turn.<br>2. SRB & Core stage separation.<br>3. Translunar Injection (TLI) burn.<br>4. Orion lunar flyby trajectory trim. | - Gravity turn & Earth rotation boost.<br>- Atmospheric drag & Max-Q.<br>- Free-return trajectory geometry.<br>*(Fictional HERMES satellite removed)* | **Cislunar Flight Experience**:<br>Unlocks precise cislunar navigation telemetry and proven Orion thermal margins. |
| **Mission 2** | **Artemis III: LEO HLS Rendezvous & Docking**<br>*(Target: Mid-2027 Manifest)* | Low Earth Orbit ($185\text{ km}$ LEO) | 1. Orion rendezvous with Commercial HLS lander.<br>2. Precision RCS approach ($< 0.1\text{ m/s}$).<br>3. Docking latch alignment.<br>4. Cryogenic propellant transfer simulation. | - Orbital rendezvous mechanics (prograde vs radial burns).<br>- Relative velocity sensing.<br>- Cryogenic fluid transfer in microgravity. | **Docked System Ready**:<br>Unlocks verified HLS docking protocols and transfers propellant reserves. |
| **Mission 3** | **Artemis IV: Lunar South Pole Landing & Surface Ops**<br>*(Target: 2028 First Crewed Surface Landing)* | Lunar South Pole (Shackleton Rim / Malapert Mountain) | 1. Powered terminal descent from 450m.<br>2. Precision touchdown on Pad Alpha ($v_y < 1.8\text{ m/s}$).<br>3. VIPER Rover traverse ($5\times$ time compression).<br>4. TRIDENT water ice core drilling. | - 6-DOF descent rocket dynamics in $0.165g$.<br>- Throttle-to-Weight balance ($TWR=1.0$ at 45.2% throttle).<br>- Lunar Permanently Shadowed Regions (PSRs).<br>- ISRU polar ice electrolysis ($H_2O \to LH_2 + O_2$). | **Mined ISRU Fuel & Shield**:<br>Produces 350 kg liquid hydrogen for future deep-space exploration and validates regolith radiation berms. |
| **Mission 4** | **Human Mars Exploration (Concept Mission)**<br>*(Clearly Labeled 2030s Conceptual Architecture)* | Mars Atmosphere $\to$ Jezero Crater Ancient Paleolake | 1. Atmospheric entry deceleration & supersonic parachute.<br>2. Terminal rocket touchdown in $0.38g$ crosswind.<br>3. Jezero delta geological traverse.<br>4. MOXIE $CO_2 \to O_2$ electrolysis run. | - Martian aerocapture vs vacuum landing.<br>- Atmospheric pressure variations.<br>- Fluvial geomorphology in ancient Jezero. | **Campaign Victory**:<br>NASA Mission Commander Evaluation, STEM Mastery Certification, and crew health dosimeter report. |

---

## 5. ROVER MOBILITY, SPEED & TIME COMPRESSION

To maintain 100% scientific integrity:
- **True Physical Speed**: Modeled at authentic rover speeds ($0.1\text{--}0.4\text{ km/h} \approx 0.03\text{--}0.11\text{ m/s}$) to reflect real VIPER hazard-cam and neutron spectrometer operational protocols.
- **Interactive Traverse Rate**: Simulation clock runs with a clearly labeled **5× Time Compression** ($0.5\text{--}2.0\text{ km/h}$ traverse speed) so crater traverses take ~2–3 minutes of engaging gameplay.
- **HUD Readout**: Live speedometer displays:
  `TRAVERSE SPEED: 1.5 km/h [5× TIME COMPRESSION]`
  `TRUE INSTRUMENT SPEED: 0.3 km/h`
  `NOTE: Real NASA VIPER navigates at 0.1–0.4 km/h to process stereo hazard cams.`

---

## 6. NASA DATA AUTHENTICITY

1. **NASA DONKI Space Weather**:
   - Explicitly presented as **Real Archived Space Weather Event Replays** (e.g., *"Historical Solar Storm: May 2024 Event AR3664 Replay"*), not fake real-time predictive forecasts.
   - When active in simulation: renders a visible solar proton wave through Three.js, triggers Geiger counter audio clicks, and prompts crew to orient Orion's service module water tanks toward the Sun.
2. **NASA OSDR Space Biology**:
   - Displays real verified studies (`OSD-569`: *MARE Artemis I Radiation Phantoms*; `OSD-612`: *BioSentinel Lunar Flyby Yeast DNA Damage*).
   - Any derived gameplay mechanics are explicitly labeled: *"Game Balance Rule Inspired by NASA OSDR Research (OSD-569)"*. No raw biology titles are ever overwritten with fabricated text.

---

## 7. USER INTERFACE & PROGRESSIVE DISCLOSURE

- **Clean Viewport Rule**: Minimum 65% of the screen must always be dedicated to unobstructed 3D space and spacecraft rendering.
- **HUD Placement**:
  - Top Ribbon: Mission phase, primary objective, and distance/altitude progress bar.
  - Left Panel: Primary flight vectors (throttle tape, vertical sink speed, radar altitude).
  - Right Panel: Vehicle status, resource bars (Power, Propellant, Shield), and non-blocking CAPCOM radio messages.
  - Bottom Bar: Dynamic control hints (updating based on active phase).
- **Design Tokens**: 100% SVG vector iconography (`lucide-react`), 8-pt spatial geometry (`p-2 = 8px`, `p-4 = 16px`, `gap-4 = 16px`), high-contrast dark space theme.

---
*End of Game Design Document.*
