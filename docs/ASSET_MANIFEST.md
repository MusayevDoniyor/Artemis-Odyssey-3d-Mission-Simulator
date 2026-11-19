# ARTEMIS ODYSSEY: 3D ASSET MANIFEST & SPECIFICATIONS
**Document Version:** 2.1.0 · **Target Phase:** Post-Audit Remediation R1-A  
**Primary Source:** NASA 3D Resources (`https://science.nasa.gov/3d-resources/`) & GitHub Mirror (`https://github.com/nasa/NASA-3D-Resources`)  
**Licensing & Usage Reference:** NASA Media Usage Guidelines (`https://www.nasa.gov/multimedia/guidelines/index.html`)  

---

## 1. NASA USAGE GUIDELINES & LEGAL COMPLIANCE

Per official NASA Media Usage Guidelines (`nasa.gov/multimedia/guidelines/index.html`):
> *"NASA material is not protected by copyright unless noted. It may be used for educational or informational purposes without explicit permission. NASA's name and insignia (meatball) may not be used in any way that implies endorsement or sponsorship of a commercial product or service."*

- All models sourced from NASA 3D Resources are free and open for public educational use.
- Any model contributed by non-NASA institutional partners (e.g. SwRI, JHU-APL, ESA) carries explicit individual attribution in `docs/CREDITS.md`.

---

## 2. OFFICIAL NASA 3D ASSET AUDIT TABLE

Assets are classified by implementation type:
- **[WIRED IN SCENE]**: Downloaded NASA 3D asset actively loaded and rendered in Three.js via `GLTFLoader`.
- **[DOWNLOADED, UNWIRED]**: NASA 3D asset downloaded to `public/assets/`, awaiting scene-graph wiring and decimation in Step 2 (procedural fallback currently rendered).
- **[PROCEDURAL RECREATION]**: Procedurally generated 3D geometry based on public dimensional specifications (no official NASA GLB in repo).

| Asset Name | Official NASA Source URL / GitHub Path | Contributor | Format | Status | Measured Triangles | File Size | Scene Graph Status |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **SLS Block 1 Launch Vehicle** | Public NASA MSFC dimensions | NASA MSFC data | Procedural | **[PROCEDURAL]** | ~8,400 tris | In-code | **Active** (procedural model in `models.ts:2900`) |
| **Orion Spacecraft (MPCV & ESM)**| Public NASA JSC dimensions | NASA JSC data | Procedural | **[PROCEDURAL]** | ~2,640 tris | In-code | **Active** (procedural model in `models.ts:3032`) |
| **Mobile Launcher 1 (ML-1) & Pad 39B**| Public NASA KSC GSDP drawings | NASA KSC data | Procedural | **[PROCEDURAL]** | ~14,200 tris | In-code | **Active** (procedural model in `models.ts:2400`) |
| **Falcon 9 Commercial Launcher**| Public SpaceX dimensions | Public dimensions | Procedural | **[PROCEDURAL]** | ~3,120 tris | In-code | **Active** (procedural model in `models.ts:3949`) |
| **VIPER Lunar Rover** | NASA Ames Research Center data | NASA ARC data | Procedural | **[PROCEDURAL]** | ~1,420 tris | In-code | **Active** (procedural model in `models.ts:1511`) |
| **Concept Lunar Lander** | Fictional educational architecture | Artemis Odyssey | Procedural | **[PROCEDURAL]** | ~1,850 tris | In-code | **Active** (procedural model in `models.ts:1330`) |
| **James Webb Space Telescope (JWST)** | `github.com/nasa/NASA-3D-Resources/tree/master/Models/JWST` | NASA GSFC | `.glb` | **[WIRED IN SCENE]** | 99,239 tris | 980.7 KB | **Active** (`GLTFLoader` in `models.ts:3671`) |
| **Voyager 1/2 Probe** | `github.com/nasa/NASA-3D-Resources/tree/master/Models/Voyager` | NASA JPL | `.glb` | **[WIRED IN SCENE]** | 29,911 tris | 279.2 KB | **Active** (`GLTFLoader` in `models.ts:3770`) |
| **International Space Station (ISS)** | NASA 3D Resources / JSC | NASA JSC | `.glb` | **[WIRED IN SCENE]** | 174,440 tris | 465.8 KB | **Active** (`GLTFLoader` in `models.ts:4142`) |
| **Asteroid 101955 Bennu** | NASA OSIRIS-REx / 3D Resources | NASA / OLA | `.glb` | **[WIRED IN SCENE]** | 18,240 tris | 321.9 KB | **Active** (`GLTFLoader` in `models.ts:5004`) |
| **Apollo Saturn V** | `science.nasa.gov/3d-resources/` | NASA MSFC | `.glb` | **[DOWNLOADED, UNWIRED]** | 34,814 tris | 905.5 KB | **Pending Step 2** (scene uses procedural fallback) |
| **Apollo 11 Lunar Module (LM)** | `science.nasa.gov/3d-resources/` | NASA JSC | `.glb` | **[DOWNLOADED, UNWIRED]** | 97,588 tris | 700.0 KB | **Pending Step 2** (scene uses procedural fallback) |
| **Perseverance Mars Rover (2020)**| `science.nasa.gov/3d-resources/` | NASA JPL | `.glb` | **[DOWNLOADED, UNWIRED]** | 183,037 tris | 1,513.1 KB | **Pending Step 2** (scene uses procedural fallback) |
| **TDRS Satellite** | `science.nasa.gov/3d-resources/` | NASA GSFC | `.glb` | **[DOWNLOADED, UNWIRED]** | 2,964 tris | 94.5 KB | **Pending Step 2** (scene uses procedural fallback) |

---

## 3. LUNAR LANDER IDENTITY & SELF-CONSISTENT PHYSICS

### 3.1 Transparent Identity: Fictional Educational Concept Lander
NASA does not build in-house human lunar landers for Artemis; NASA contracted private commercial providers:
- **SpaceX Starship HLS**: Massive $\sim 100\text{t}$ payload capacity vehicle powered by methalox Raptor engines.
- **Blue Origin Blue Moon Mark 2**: High-energy hydrolox lander powered by BE-7 engines.

Neither commercial vehicle is offered as an unencumbered raw CAD model on NASA 3D Resources due to commercial proprietary rights. Therefore:
- The descent vehicle in Artemis Odyssey is strictly and honestly labeled in-game:
  **"Educational Concept Lunar Lander (Fictional Architecture for Flight Training)"**.
- An educational placard explains the real commercial Artemis HLS landers with diagrams and citations.

### 3.2 Self-Consistent Lunar Descent Physics Table
The concept lander is calibrated so that a balanced hover ($TWR = 1.0$) is naturally achieved at a realistic throttle setting ($\sim 45\%$):

| Parameter | Value | Units | Aerospace Engineering Justification |
| :--- | :---: | :---: | :--- |
| **Lunar Surface Gravity ($g_{\text{moon}}$)** | $1.625$ | $\text{m/s}^2$ | Standard Lunar South Pole gravitational acceleration. |
| **Vehicle Dry Mass** | $4,500$ | $\text{kg}$ | Crew cabin, avionics, landing legs, structure. |
| **Descent Propellant Capacity ($LH_2 / LOX$)** | $5,500$ | $\text{kg}$ | Cryogenic hydrolox propellant. |
| **Descent Start Propellant (80% Fuel)** | $4,400$ | $\text{kg}$ | Nominal fuel at 450m approach gate. |
| **Total Start Mass ($m_{\text{start}}$)** | $8,900$ | $\text{kg}$ | $4,500\text{ kg (dry)} + 4,400\text{ kg (propellant)}$. |
| **Lunar Weight at Start ($W_{\text{start}}$)** | $14,462.5$ | $\text{N}$ ($14.46\text{ kN}$) | $m \cdot g_{\text{moon}} = 8,900 \times 1.625$. |
| **Max Descent Engine Thrust ($F_{\text{max}}$)** | $32,000$ | $\text{N}$ ($32.0\text{ kN}$) | Deep-throttling pintle hydrolox engine. |
| **Maximum TWR at Start** | $2.21$ | ratio | $32.0\text{ kN} / 14.46\text{ kN}$. |
| **Hover Throttle Equilibrium (at Start)** | **$45.2\%$** | $\%$ | $14.4625 / 32.0 = 45.2\%$ at start mass ($8,900\text{ kg}$). **Note: As propellant burns, hover throttle dynamically declines to $22.9\%$ at empty dry mass ($4,500\text{ kg}$).** |
| **Specific Impulse ($I_{sp}$)** | $440$ | $\text{s}$ | High-efficiency vacuum hydrolox performance. |
| **Propellant Mass Flow at Hover** | $3.35$ | $\text{kg/s}$ | $\dot{m} = F / (I_{sp} \cdot g_0) = 14,462.5 / (440 \times 9.80665)$. |
| **Hover Time Available (at Start)** | $\sim 21.8$ | minutes | $4,400\text{ kg} / 3.35\text{ kg/s} = 1,313\text{ seconds}$. |

---

## 4. RECONCILED SCENE & POLYGON BUDGETS

To guarantee consistent 60 fps rendering on mid-range laptops:

| Category | Max Triangle Budget | Max Compressed Size | Max Draw Calls |
| :--- | :---: | :---: | :---: |
| **Hero Craft (SLS, Orion, Lander, Rover)** | $\le 75,000$ tris | $\le 3.0\text{ MB}$ | $\le 15$ |
| **Secondary Craft / Props (Pad, Satellite)** | $\le 45,000$ tris | $\le 1.8\text{ MB}$ | $\le 10$ |
| **Terrain Elevation Mesh (LOLA / MOLA)** | $\le 65,000$ tris | $\le 1.5\text{ MB}$ | $\le 4$ |
| **Total Active Scene Budget** | **$\le 185,000$ tris** | **$\le 6.5\text{ MB}$** | **$\le 45$ calls** |

---

## 5. IMPLEMENTED PRODUCTION ASSETS AUDIT TABLE (POST-OVERNIGHT RUN)

| Category | File Path | Measured File Size | Format / Encoding | Source / License | Scene Integration Status |
| :--- | :--- | :---: | :---: | :--- | :--- |
| **Spacecraft** | `public/assets/crafts/jwst.glb` | 980.7 KB | GLB / Draco | NASA 3D Resources (Public Domain) | **WIRED IN SCENE** (`GLTFLoader`) |
| **Spacecraft** | `public/assets/crafts/voyager.glb` | 279.2 KB | GLB / Draco | NASA 3D Resources (Public Domain) | **WIRED IN SCENE** (`GLTFLoader`) |
| **Spacecraft** | `public/assets/crafts/iss.glb` | 465.8 KB | GLB / Draco | NASA 3D Resources (Public Domain) | **WIRED IN SCENE** (`GLTFLoader`) |
| **Asteroid** | `public/assets/asteroids/bennu.glb` | 321.9 KB | GLB / Draco | NASA OSIRIS-REx (Public Domain) | **WIRED IN SCENE** (`GLTFLoader`) |
| **Launch Vehicle** | `public/assets/rockets/saturn_v.glb` | 905.5 KB | GLB / Draco | NASA 3D Resources (Public Domain) | **Downloaded, UNWIRED** (uses procedural fallback) |
| **Spacecraft** | `public/assets/crafts/apollo_lunar_module.glb` | 700.0 KB | GLB / Draco | NASA 3D Resources (Public Domain) | **Downloaded, UNWIRED** (uses procedural fallback) |
| **Spacecraft** | `public/assets/crafts/perseverance.glb` | 1,513.1 KB | GLB / Draco | NASA 3D Resources (Public Domain) | **Downloaded, UNWIRED** (uses procedural fallback) |
| **Spacecraft** | `public/assets/crafts/tdrs.glb` | 94.5 KB | GLB / Draco | NASA 3D Resources (Public Domain) | **Downloaded, UNWIRED** (uses procedural fallback) |
| **Audio** | `public/audio/rocket-launch-distant.ogg` | 1,104.0 KB | OGG Vorbis | NASA Historical STS Launch (Public Domain) | **WIRED IN AUDIO ENGINE** (historical Space Shuttle audio) |
| **Audio** | `public/audio/rocket-launch-roar.ogg` | 925.0 KB | OGG Vorbis | NASA Historical STS Launch (Public Domain) | **WIRED IN AUDIO ENGINE** (historical Space Shuttle audio) |
| **Celestial Texture** | `public/assets/planets/ceres.jpg` | 1,101.2 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/venus_surface.jpg` | 864.3 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/mercury.jpg` | 852.1 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/sun.jpg` | 803.2 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/mars.jpg` | 512.9 KB | JPEG (2K) | NASA JPL / USGS (Public Domain) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/earth.jpg` | 500.6 KB | JPEG (2K) | NASA Visible Earth Blue Marble (Public Domain) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/jupiter.jpg` | 487.3 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/moon.jpg` | 394.2 KB | JPEG (2K) | NASA SVS / LROC (Public Domain) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/earth_night.jpg` | 249.3 KB | JPEG (2K) | NASA Black Marble / VIIRS (Public Domain) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/neptune.jpg` | 235.9 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/venus.jpg` | 224.3 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/earth-clouds.png` | 220.8 KB | PNG | NASA Visible Earth (Public Domain) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/saturn.jpg` | 195.2 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/saturn_ring.png` | 11.8 KB | PNG Alpha | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/uranus.jpg` | 75.9 KB | JPEG (2K) | Solar System Scope (CC-BY 4.0) | **WIRED IN SCENE** (`planetMaps`) |
| **Celestial Texture** | `public/assets/planets/pluto.jpg` | — | — | — | **NOT DOWNLOADED** (uses procedural 256x128 canvas) |
| **Draco Decoder** | `public/draco/draco_decoder.wasm` | 187.9 KB | WASM | Google Draco (Apache 2.0) | **WIRED** (used by DRACOLoader) |
| **Draco Decoder** | `public/draco/draco_decoder.js` | 500.5 KB | JS | Google Draco (Apache 2.0) | **WIRED** (used by DRACOLoader) |
| **Typography** | `public/fonts/jetbrains-mono-latin.woff2` | 30.7 KB | WOFF2 | JetBrains (OFL-1.1) | **WIRED** (Tailwind theme font) |
| **Typography** | `public/fonts/plus-jakarta-sans-latin.woff2`| 26.7 KB | WOFF2 | Tokotype (OFL-1.1) | **WIRED** (Tailwind theme font) |
| **Typography** | `public/fonts/orbitron-latin.woff2` | 11.5 KB | WOFF2 | Matt McInerney (OFL-1.1) | **WIRED** (Tailwind theme font) |

---
*End of Asset Manifest.*
