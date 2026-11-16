# Space Flight Views, Orbital Conics & Cislunar Reference Frames (Phase 9)

## 1. Reference Frames in Cislunar Flight

Accurate visualization of deep space flight requires displaying trajectories in their physically appropriate reference frames rather than projecting everything into a single naive heliocentric coordinate system:

1. **Earth-Centred Inertial (ECI) Frame**:
   - **Application**: Low Earth Orbit (LEO) parking orbit and early trans-lunar departure.
   - **Physics**: At 165 km altitude, the spacecraft moves at circular orbital velocity $v_{circ} = \sqrt{\mu_{Earth} / r} \approx 7.79\text{ km/s}$ with an orbital period of $T = 2\pi \sqrt{r^3 / \mu} \approx 87.8\text{ minutes}$.
   - **Inclination**: $28.5^\circ$ corresponding to eastward launches from Kennedy Space Center LC-39B.
   - **Geometry**: Closed circular/elliptical line centered directly on Earth's center of mass.

2. **Trans-Lunar Injection (TLI) Transfer Conic**:
   - **Application**: Outbound transit from LEO to lunar distance.
   - **Physics**: The ICPS / RL10B-2 engine adds $\Delta v \approx 3,050\text{ m/s}$ prograde thrust, raising apogee from 165 km to $\sim 384,400\text{ km}$ ($e \approx 0.975$).
   - **Geometry**: Highly eccentric ellipse stretching from Earth's orbital departure point toward lunar intercept.

3. **Earth-Moon Rotating (Synodic) Frame — Cislunar Free-Return**:
   - **Application**: Apollo 8, 10, 11, 13 and Artemis II free-return trajectory abort envelope.
   - **Physics**: In an Earth-centred inertial frame, the spacecraft follows a high ellipse, but in the rotating frame where Earth and Moon are fixed along the X-axis, the trajectory forms an authentic **figure-8 loop**:
     - Leaves Earth's leading hemisphere.
     - Crosses cislunar space toward the trailing side of the Moon.
     - Loops behind the Moon's far side at pericynthion ($h \approx 110\text{ km}$ altitude), where lunar gravity swings the velocity vector by $\sim 110^\circ$.
     - Returns to Earth, intercepting the atmospheric entry corridor at flight path angle $\gamma \approx -6.2^\circ$ ($h_{entry} \approx 120\text{ km}$) with zero propulsion required.

4. **Moon-Centred Frame & Sphere of Influence (SOI) Transition**:
   - **Application**: Lunar approach, orbit insertion, and landing preparation.
   - **Physics**: Laplace Sphere of Influence radius:
     $$r_{SOI} = d_{Earth-Moon} \cdot \left(\frac{M_{Moon}}{M_{Earth}}\right)^{2/5} \approx 384,400 \cdot (0.0123)^{0.4} \approx 66,100\text{ km}$$
   - **Conic Transition**: Outside $66,100\text{ km}$, Earth's gravity dominates; inside $66,100\text{ km}$, the trajectory smoothly transitions to a Moon-centred hyperbola ($e > 1.0$) or closed capture ellipse ($e < 1.0$).

---

## 2. Speed-of-Light Comms Latency

In deep space exploration, electromagnetic telemetry propagates strictly at the speed of light in vacuum:
$$c = 299,792.458\text{ km/s}$$

- **Earth-Moon Distance**: $384,400\text{ km}$ mean.
  $$\Delta t_{one-way} = \frac{384,400}{299,792.458} \approx 1.282\text{ seconds} \quad (\Delta t_{round-trip} \approx 2.564\text{ s})$$
- **Earth-Mars Distance**: Varies continuously between perihelic opposition ($\sim 55\text{ million km}$) and solar conjunction ($\sim 400\text{ million km}$):
  $$\Delta t_{min} = \frac{55 \times 10^6}{299,792.458} \approx 183\text{ s} \approx 3.06\text{ minutes}$$
  $$\Delta t_{max} = \frac{400 \times 10^6}{299,792.458} \approx 1,334\text{ s} \approx 22.24\text{ minutes}$$

---

## 3. Deep-Space Radiation Environment

- **Galactic Cosmic Rays (GCR)**: High-energy omnidirectional protons and HZE nuclei outside Earth's magnetosphere produce a continuous background dose rate of $\sim 50 \text{ to } 75\text{ }\mu\text{Sv/h}$ ($\sim 1.2 \text{ to } 1.8\text{ mSv/day}$).
- **Solar Particle Events (SPE / CME)**: During a severe coronal mass ejection (such as detected by NOAA/NASA DONKI), solar proton fluxes can raise dose rates above $1,500 \text{ to } 5,000\text{ }\mu\text{Sv/h}$.
- **Orion Protective Shielding**: Water wall storage, food lockers, and supplementary storm shelter bulkheads provide hydrogenous radiation shielding that attenuates SPE proton dose rates by $65\% \text{ to } 75\%$.
