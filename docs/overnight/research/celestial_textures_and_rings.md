# Research: Celestial Textures, Ring Systems & Physical Parameters

## 1. Texture Sourcing & Licensing

All planetary texture maps are sourced in accordance with open-access and scientific guidelines:

| Celestial Body | Source Imagery / Dataset | Spatial Resolution | License | Local Path |
|---|---|---|---|---|
| **Sun** | NASA Solar Dynamics Observatory (SDO) AIA 4500Å & HMI Continuum | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA) | `/assets/planets/sun.jpg` |
| **Mercury** | NASA MESSENGER MDIS Global Mosaic | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA/JHUAPL) | `/assets/planets/mercury.jpg` |
| **Venus (Clouds)** | NASA Mariner 10 / Pioneer Venus UV & visible cloud mosaic | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA) | `/assets/planets/venus.jpg` |
| **Venus (Surface)** | NASA Magellan Radar Global Altimetry & SAR Mosaic | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA/JPL) | `/assets/planets/venus_surface.jpg` |
| **Earth (Day)** | NASA Blue Marble Next Generation (MODIS visible mosaic) | 2048x1024 equirectangular | Public Domain (NASA Earth Observatory) | `/assets/planets/earth.jpg` |
| **Earth (Night)** | NASA Black Marble (Suomi NPP VIIRS day-night band) | 2048x1024 equirectangular | Public Domain (NASA Earth Observatory) | `/assets/planets/earth_night.jpg` |
| **Earth (Clouds)** | NASA Blue Marble Cloud Topography (alpha-masked) | 2048x1024 PNG | Public Domain (NASA Earth Observatory) | `/assets/planets/earth-clouds.png` |
| **Moon** | NASA LRO Lunar Reconnaissance Orbiter Camera (LROC) WAC Global Morphologic Mosaic | 2048x1024 equirectangular | Public Domain (NASA/GSFC/ASU) | `/assets/planets/moon.jpg` |
| **Mars** | NASA Mars Global Surveyor (MGS) MOC / Viking Global Mosaic | 2048x1024 equirectangular | Public Domain (NASA/JPL/MSSS) | `/assets/planets/mars.jpg` |
| **Ceres** | NASA Dawn Mission Framing Camera (FC) Global Mosaic | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA/JPL-Caltech/UCLA/MPS/DLR/IDA) | `/assets/planets/ceres.jpg` |
| **Jupiter** | NASA Cassini / JunoCam Global Map | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA/JPL/SSI) | `/assets/planets/jupiter.jpg` |
| **Saturn** | NASA Cassini Imaging Science Subsystem (ISS) Cylindrical Map | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA/JPL/Space Science Institute) | `/assets/planets/saturn.jpg` |
| **Saturn Ring** | NASA Cassini ISS calibrated radial ring profile with alpha transparency | 1024x64 PNG radial strip | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA/JPL) | `/assets/planets/saturn_ring.png` |
| **Uranus** | NASA Voyager 2 Narrow-Angle Camera Composite Map | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA/JPL) | `/assets/planets/uranus.jpg` |
| **Neptune** | NASA Voyager 2 Narrow-Angle Camera Composite Map | 2048x1024 equirectangular | CC-BY 4.0 (Solar System Scope) / Public Domain (NASA/JPL) | `/assets/planets/neptune.jpg` |
| **Bennu (3D)** | NASA OSIRIS-REx Laser Altimeter (OLA) / PolyCam 3D Shape Model | 329 KB binary glTF (.glb) | Public Domain (NASA 3D Resources) | `/assets/asteroids/bennu.glb` |

---

## 2. Planetary Ring Systems: Dimensions and Optical Properties

### Saturn Main Ring System
- Equatorial radius of Saturn: $R_{eq} = 60,268\text{ km}$
- Main Ring Extents:
  - C Ring inner edge: $74,658\text{ km} \rightarrow 1.239\ R_{sat}$
  - B Ring: $92,000\text{ km} \text{ to } 117,580\text{ km} \rightarrow 1.526\text{ to } 1.951\ R_{sat}$
  - Cassini Division: $117,580\text{ km} \text{ to } 122,170\text{ km} \rightarrow 1.951\text{ to } 2.027\ R_{sat}$
  - A Ring outer edge: $136,775\text{ km} \rightarrow 2.269\ R_{sat}$
- Axial tilt: $26.73^\circ$ relative to ecliptic/orbital plane
- Geometry in Engine: `RingGeometry(1.24, 2.27, 72)` with alpha-tested double-sided map.

### Gas Giant Faint Rings (Labeled Faint)
- **Jupiter**:
  - Main ring: 122,800 to 129,200 km ($1.72\text{ to } 1.81\ R_{jup}$).
  - Low optical depth ($\tau \sim 10^{-6}$), visually rendered as thin band with opacity 0.12.
- **Uranus**:
  - Main $\epsilon$ and inner rings: 41,800 to 51,149 km ($1.63\text{ to } 2.00\ R_{ura}$).
  - Axial tilt: $97.77^\circ$ (retrograde, spins on its side).
  - Geometry: `RingGeometry(1.42, 1.95, 56)` with opacity 0.22.
- **Neptune**:
  - Adams and Le Verrier rings: 41,900 to 62,930 km ($1.70\text{ to } 2.54\ R_{nep}$).
  - Axial tilt: $28.32^\circ$.
  - Geometry: `RingGeometry(1.68, 2.45, 56)` with opacity 0.14.

---

## 3. NASA Fact Sheet Telemetry Verification

All telemetry values are checked against NASA Planetary Fact Sheets:
- Sun: Radius 696,340 km (109.2x Earth), Mass $1.9885 \times 10^{30}\text{ kg}$, Surface Gravity $274.0\text{ m/s}^2$
- Mercury: Radius 2,439.7 km, Mass $0.3301 \times 10^{24}\text{ kg}$, Gravity $3.70\text{ m/s}^2$, Period 87.97 days, Tilt $0.03^\circ$
- Venus: Radius 6,051.8 km, Mass $4.867 \times 10^{24}\text{ kg}$, Gravity $8.87\text{ m/s}^2$, Period 224.7 days, Tilt $177.36^\circ$ (retrograde)
- Earth: Radius 6,371.0 km, Mass $5.972 \times 10^{24}\text{ kg}$, Gravity $9.807\text{ m/s}^2$, Period 365.26 days, Tilt $23.44^\circ$
- Moon: Radius 1,737.4 km, Mass $0.07346 \times 10^{24}\text{ kg}$, Gravity $1.622\text{ m/s}^2$, Period 27.32 days, Distance $384,400\text{ km}$ ($60.338\ R_\oplus$)
- Mars: Radius 3,389.5 km, Mass $0.6417 \times 10^{24}\text{ kg}$, Gravity $3.721\text{ m/s}^2$, Period 686.98 days, Tilt $25.19^\circ$
- Ceres: Radius 469.7 km, Mass $0.000938 \times 10^{24}\text{ kg}$, Gravity $0.28\text{ m/s}^2$, Period 4.60 years, Tilt $4^\circ$
- Jupiter: Radius 69,911 km, Mass $1898.19 \times 10^{24}\text{ kg}$, Gravity $24.79\text{ m/s}^2$, Period 11.86 years, Tilt $3.13^\circ$
- Saturn: Radius 58,232 km, Mass $568.34 \times 10^{24}\text{ kg}$, Gravity $10.44\text{ m/s}^2$, Period 29.45 years, Tilt $26.73^\circ$
- Uranus: Radius 25,362 km, Mass $86.81 \times 10^{24}\text{ kg}$, Gravity $8.69\text{ m/s}^2$, Period 84.02 years, Tilt $97.77^\circ$
- Neptune: Radius 24,622 km, Mass $102.41 \times 10^{24}\text{ kg}$, Gravity $11.15\text{ m/s}^2$, Period 164.8 years, Tilt $28.32^\circ$
- Pluto: Radius 1,188.3 km, Mass $0.01303 \times 10^{24}\text{ kg}$, Gravity $0.62\text{ m/s}^2$, Period 247.9 years, Tilt $122.53^\circ$
- Bennu (101955): Mean diameter $490.06\text{ m}$, Mass $7.329 \times 10^{10}\text{ kg}$, Surface Gravity $6 \times 10^{-5}\text{ m/s}^2$, Rotation period $4.296\text{ h}$, Orbit $a = 1.1264\text{ AU}, e = 0.2037, i = 6.035^\circ$. Sourced from NASA OSIRIS-REx Mission Archive.
