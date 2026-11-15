# ARTEMIS ODYSSEY: DEFERRED SCOPE & FEATURE BACKLOG
**Document Purpose:** Living repository of deferred features, non-core extensions, and future ideas  
**Target:** To be reviewed following successful completion of Milestones 1–8  

---

## 1. DEFERRED FROM HACKATHON SCOPE (CUT ITEMS)

### 1.1 Outpost 3D Surface Base Camp & Interior Simulator
- **Original Hackathon State**: `OutpostConsoleModal.tsx` was a 2D popup with static background images and an airlock depressurization button completely disconnected from the 3D world.
- **Future Backlog Vision**: A fully walkable 3D Lunar Outpost / Mars Base interior built using Three.js:
  - Walkable geodesic dome interior with airlock transition from the surface rover.
  - Interactive life-support console balancing $O_2$ generation (electrolysis) and $CO_2$ scrubbers.
  - Greenhouse hydroponics unit displaying plant biomass growth under artificial lighting.
  - Sintered regolith 3D printing bay for base expansion.
- **Why Deferred**: Requires extensive 3D architectural modeling, interior collision meshes, and character camera controls that distract from the core flight-and-landing space simulator.

### 1.2 Lunar Gateway NRHO Orbital Station Operations
- **Real-World Context**: NASA paused Gateway's deployment in March 2026 to prioritize direct surface landings and orbital propellant demonstrations.
- **Future Backlog Vision**: Complete 3D simulation of Lunar Gateway in Near-Rectilinear Halo Orbit (NRHO), including Power & Propulsion Element (PPE) ion thrusters, HALO habitat module, and Canadarm3 robotics.
- **Why Deferred**: Removed from the critical path of the Artemis campaign to align with NASA's updated 2026 manifest.

### 1.2 Dedicated Standalone NASA Data Telemetry Browser (`NasaDataModal.tsx`)
- **Original State**: A separate modal listing raw JSON-like DONKI flare reports and OSDR biology accession numbers.
- **Future Backlog Vision**: An in-cockpit holographic "Space Weather Telemetry Terminal" embedded into the vehicle's avionics dashboard rather than an overlay modal.
- **Why Deferred**: In Version 2.0, NASA data is integrated directly into pre-flight briefings and in-flight radiation warnings where it matters to the player.

### 1.3 Random Educational Trivia Toasts (`CalmFactToast.tsx`)
- **Original State**: Trivia cards popped up randomly during gameplay, interrupting immersion.
- **Future Backlog Vision**: An interactive "CAPCOM Ground School" audio log player accessible during long coast phases (Trans-Lunar Injection transit).

---

## 2. FUTURE TECHNICAL & FEATURE EXTENSIONS

### 2.1 Real-Time Multiplayer CAPCOM Role (WebRTC)
- Allow two players to connect in a shared session:
  - **Player 1 (Astronaut)**: Cockpit view with flight controls.
  - **Player 2 (Flight Director / CAPCOM)**: Mission Control radar consoles, telemetry monitoring, abort triggers, and voice/text radio instructions.

### 2.2 WebXR Stereoscopic Cockpit Mode
- Virtual Reality (VR) headset support using Three.js `WebXRManager`.
- 1:1 scale stereoscopic viewing inside the Orion capsule, the Lunar Lander cabin, and standing on the surface of the Moon.

### 2.3 Runge-Kutta 4th-Order (RK4) N-Body Gravitational Propagator
- Replace analytical two-body Kepler conic sections with true multi-body numerical gravity integration.
- Enables genuine gravitational slingshots (free-return trajectories, Earth-Moon Lagrange point halo orbits).

### 2.4 Dynamic Soil Displacement & Rover Wheel Tracks
- Render physical geometric wheel trenches in lunar and martian regolith as the rover drives, using Three.js dynamic canvas displacement or instanced trail quads.

### 2.5 Procedural Re-entry Plasma & Shockwave Fluid Dynamics
- Volumetric re-entry fireball shader using raymarching around the Orion heatshield during 11 km/s Earth re-entry.

---
*End of Backlog Document.*
