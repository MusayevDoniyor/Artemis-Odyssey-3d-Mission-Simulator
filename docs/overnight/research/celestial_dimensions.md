# Celestial Dimensions and Orbital Reference Data

Verified against NASA Planetary Fact Sheets (NASA Goddard Space Flight Center, Dr. David R. Williams):
- https://nssdc.gsfc.nasa.gov/planetary/factsheet/
- IAU 2012 Definition of the Astronomical Unit (Resolution B2): 1 AU = 149,597,870,700 m (149,597,870.7 km)

---

## 1. Physical Dimensions (Mean Radii & Masses)

| Body | Mean Radius ($R$, km) | Equatorial Radius (km) | Polar Radius (km) | Mass ($10^{24}$ kg) | Ratio to Earth ($R / R_\oplus$) | NASA Fact Sheet Source |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sun** | 695,700 | 695,700 | 695,700 | 1,988,500 | 109.20 | [NASA Sun Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html) |
| **Mercury** | 2,439.7 | 2,439.7 | 2,439.7 | 0.3301 | 0.3829 | [NASA Mercury Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/mercuryfact.html) |
| **Venus** | 6,051.8 | 6,051.8 | 6,051.8 | 4.8675 | 0.9499 | [NASA Venus Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/venusfact.html) |
| **Earth** | 6,371.0 | 6,378.14 | 6,356.75 | 5.9724 | 1.0000 | [NASA Earth Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/earthfact.html) |
| **Moon** | 1,737.4 | 1,738.1 | 1,736.0 | 0.07346 | 0.2727 | [NASA Moon Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/moonfact.html) |
| **Mars** | 3,389.5 | 3,396.2 | 3,376.2 | 0.64171 | 0.5320 | [NASA Mars Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html) |
| **Jupiter** | 69,911 | 71,492 | 66,854 | 1,898.19 | 10.973 | [NASA Jupiter Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/jupiterfact.html) |
| **Saturn** | 58,232 | 60,268 | 54,364 | 568.34 | 9.140 | [NASA Saturn Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturnfact.html) |
| **Uranus** | 25,362 | 25,559 | 24,973 | 86.813 | 3.981 | [NASA Uranus Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/uranusfact.html) |
| **Neptune** | 24,622 | 24,764 | 24,341 | 102.413 | 3.865 | [NASA Neptune Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptunefact.html) |
| **Pluto** | 1,188.3 | 1,188.3 | 1,188.3 | 0.01303 | 0.1865 | [NASA Pluto Fact Sheet](https://nssdc.gsfc.nasa.gov/planetary/factsheet/plutofact.html) |

---

## 2. Orbital Distances & Characteristic Ratios

- **1 AU**: 149,597,870.7 km
- **Earth Mean Orbital Distance**: 1.0000 AU (149.598 million km)
- **Moon Mean Distance from Earth**: 384,400 km
  - Perigee: 363,300 km
  - Apogee: 405,500 km
  - **Distance in Earth radii**: $384,400 / 6,371.0 \approx 60.338\,R_\oplus$
  - **Earth / Moon diameter ratio**: $12,742.0 / 3,474.8 \approx 3.6670$
- **Low Earth Orbit (LEO) Parking Orbit**:
  - Altitude: 165.0 km
  - Orbital radius: $r = 6,371.0 + 165.0 = 6,536.0\text{ km} = 6.536 \times 10^6\text{ m}$
  - Earth standard gravitational parameter: $\mu_\oplus = 3.986004418 \times 10^{14}\text{ m}^3/\text{s}^2$
  - Circular orbital speed: $v = \sqrt{\mu / r} = \sqrt{3.986004418 \times 10^{14} / 6.536 \times 10^6} \approx 7,809.26\text{ m/s} = 7.809\text{ km/s}$
  - Orbital period: $T = 2\pi \sqrt{r^3 / \mu} \approx 5,263.6\text{ s} \approx 87.73\text{ minutes}$
  - Escape speed at 165 km: $v_\text{esc} = \sqrt{2} \times v_\text{circ} \approx 11,043.96\text{ m/s} = 11.044\text{ km/s}$
  - Trans-Lunar Injection (TLI) $\Delta v$: $\sim 3,150\text{ m/s}$ (raises apoapsis towards cislunar sphere).

---

## 3. Spacecraft vs Celestial Bodies Scale Comparison

- **SLS Block 1**:
  - Height with Orion & Launch Abort System (LAS): 98.1 m (0.0981 km)
  - Core Stage diameter: 8.4 m (0.0084 km)
  - Solid Rocket Boosters: Length 53.9 m, diameter 3.7 m
- **Orion Spacecraft (CM + ESM)**:
  - Crew Module base diameter: 5.02 m (0.00502 km)
  - ESM diameter: 5.2 m (4.12 m body excluding solar panels)
  - Solar array span deployed: 19.0 m
  - Total length: ~8.0 m (excluding engine nozzle extension)
- **Scale Comparison**:
  - Earth Diameter / Orion CM Diameter = $12,742,000\text{ m} / 5.02\text{ m} \approx 2,538,247 : 1$.
  - When Earth is drawn at 1.0 m diameter on screen, Orion is $0.394\,\mu\text{m}$ (invisible without zoom/marker).
  - Therefore, in 3D scene rendering, the spacecraft must be rendered at true physical scale relative to local frames with a high-visibility tactical HUD pin/beacon when zoomed out, while celestial bodies maintain verified true physical proportions.
