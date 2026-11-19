# Artemis Odyssey — Credits & Legal Notices

## 1. Typefaces & Typography

The following fonts are bundled locally under the SIL Open Font License 1.1 (OFL-1.1). No runtime network or third-party CDN connections are required.

- **Orbitron** (Display headings, hero typography)
  - Designer: Matt McInerney
  - License: SIL Open Font License, Version 1.1 (http://scripts.sil.org/OFL)
  - Copyright: (c) 2009 Matt McInerney (matt@pixelspread.com)
  - Scope: Hero brand titles and primary phase headers only.

- **Plus Jakarta Sans** (Primary interface and body typography)
  - Designers: Ghaith Zahid, Tokotype
  - License: SIL Open Font License, Version 1.1 (http://scripts.sil.org/OFL)
  - Copyright: (c) 2020 The Plus Jakarta Sans Project Authors (https://github.com/tokotype/PlusJakartaSans)
  - Scope: Main interface body, mission briefings, flight operations logs, buttons, and system modal dialogs.

- **JetBrains Mono** (Telemetry digits, engineering coordinates, and SI units)
  - Designers: Philipp Nurullin, Konstantin Bulenkov, JetBrains
  - License: SIL Open Font License, Version 1.1 (http://scripts.sil.org/OFL)
  - Copyright: (c) 2020 JetBrains s.r.o. (https://www.jetbrains.com/lp/mono/)
  - Scope: Telemetry readouts, vector vectors, coordinates, delta-v metrics, countdown clocks, SI units.

_Note on Font Consolidation: In accordance with M4 design constraints (maximum 3 font families), Chakra Petch was removed from the active type stack in favor of JetBrains Mono for technical clarity and reduced font budget._

---

## 2. NASA Trademark & Legal Disclaimer

- **Legal Compliance**:
  - **14 CFR § 1221.110 ("Use of the NASA Insignia")**: Regulates the primary agency insignia ("meatball"). Under § 1221.110(a)(10), display is authorized on _"NASA-occupied buildings when the use of the NASA Insignia is more appropriate than the NASA Seal."_ Under § 1221.110(b) and (c), the Insignia _"cannot be used in any way that could be construed as an endorsement by NASA of a commercial product, service, or enterprise"_ and commercial manufacture or sale as a standalone item without authorization is prohibited.
    - URL: https://www.ecfr.gov/current/title-14/chapter-V/part-1221/subpart-1221.1/section-1221.110
  - **14 CFR § 1221.111 ("Use of the NASA Logotype")**: Regulates the 1975–1992 red "worm" logotype, specifying: _"The NASA Logotype was officially retired by NASA in 1992... The NASA Logotype may be used only in an authentic historical context, on merchandise in accordance with § 1221.110(c), in the NASA graphics standards/style guide, or with prior written approval of the NASA Administrator."_
    - URL: https://www.ecfr.gov/current/title-14/chapter-V/part-1221/subpart-1221.1/section-1221.111
  - **NASA Media Usage Guidelines § 2.1**: _"NASA emblems (including the NASA Insignia, the NASA logotype, and the NASA Seal) may not be used by non-NASA entities without prior written permission, except in an authentic historical or educational context where it appears on NASA hardware or facilities as originally placed by NASA."_
    - URL: https://www.nasa.gov/multimedia/guidelines/index.html
- **VAB Cladding & Agency Logos**: To guarantee 100% compliance without displaying unauthorized commercial reproductions of agency insignia or flags on third-party 3D geometry, the distant VAB model (`public/assets/structures/vab.glb`) dynamically overrides building facade textures with neutral industrial gray cladding (`plainWallMat`, color `0x94a3b8`).
- **Disclaimer**: Artemis Odyssey is an independent, unofficial educational project and simulation trainer. It is **not affiliated with, endorsed by, sponsored by, or maintained by NASA** (National Aeronautics and Space Administration).
- **Insignia**: All visual emblems used within the simulator are original vector icons representing fictional and flight-trainer motifs. NASA agency logos are not used.

---

## 3. Real-Time Data & Public Datasets

- **NASA DONKI (Database of Notifications, Knowledge, and Information)**: Space weather notifications (Solar Flares, Coronal Mass Ejections) sourced from public NASA APIs (https://kauai.ccmc.gsfc.nasa.gov/DONKI/).
- **NASA OSDR (Open Science Data Repository)**: Space life sciences open science datasets sourced from NASA OSDR public repositories (https://osdr.nasa.gov/).
- **Planetary Textures & Ephemerides**: NASA Scientific Visualization Studio (SVS) and USGS Astrogeology Science Center public domain mapping models.

---

## 4. Planetary Textures, Ring Profiles & 3D Astrometric Models

- **Solar System Scope Textures (CC-BY 4.0)**:
  - Textures for the Sun, Mercury, Venus (cloud & radar surface), Earth night lights, Jupiter, Saturn and Saturn's rings, Uranus, Neptune, and Ceres.
  - Creator: INOVE s.r.o. (https://www.solarsystemscope.com/textures/)
  - License: Creative Commons Attribution 4.0 International (CC-BY 4.0) (https://creativecommons.org/licenses/by/4.0/)
- **NASA 3D Resources — Asteroid 101955 Bennu Shape Model (Public Domain)**:
  - 3D shape model of asteroid 101955 Bennu (1999 RQ36) derived from NASA OSIRIS-REx Laser Altimeter (OLA) and PolyCam imaging.
  - Source: NASA 3D Resources (https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/1999%20RQ36%20asteroid)
  - License: Public Domain (U.S. Government Work, 17 U.S.C. § 105).
- **NASA Blue Marble & Black Marble (Public Domain)**:
  - Earth daylight land/ocean mosaic and Suomi NPP VIIRS day-night band city lights.
  - Source: NASA Earth Observatory (https://earthobservatory.nasa.gov/).
- **NASA LRO & MGS Planetary Datasets (Public Domain)**:
  - Moon LROC WAC mosaic and LOLA altimetry (NASA GSFC / Arizona State University).
  - Mars MGS MOC / Viking MDIM 2.1 mosaic (NASA JPL / Malin Space Science Systems).
- **NASA New Horizons Pluto Global Mosaic (Public Domain)**:
  - Global color cylindrical map of Pluto captured by the Multispectral Visible Imaging Camera (MVIC) on NASA's New Horizons spacecraft during the July 2015 flyby.
  - Source: NASA / Johns Hopkins University Applied Physics Laboratory / Southwest Research Institute (https://photojournal.jpl.nasa.gov/catalog/PIA19952 / https://svs.gsfc.nasa.gov/).
  - License: Public Domain (U.S. Government Work, 17 U.S.C. § 105).
- **NASA 3D Resources — Spacecraft & Launch Vehicles (Public Domain & Project Modifications)**:
  - Official 3D models of Apollo Saturn V, Apollo 11 Lunar Module, International Space Station (ISS), James Webb Space Telescope (JWST), Voyager 1 & 2, Tracking and Data Relay Satellite (TDRS), Perseverance Mars Rover, and Mobile Launcher.
  - Source: NASA 3D Resources (https://github.com/nasa/NASA-3D-Resources)
  - License: Public Domain (U.S. Government Work, 17 U.S.C. § 105).
  - **Engineering Modifications Applied to NASA Geometry**:
    - **SLS Block 1 (`public/assets/rockets/sls_block1.glb`)**: Converted from official NASA CAD `Block 1 (GNC markings).blend`.
      - *Rogue Vertex Removal*: Removed 2 rogue out-of-bounds vertices in the left booster node (`srb_left`) located at coordinates $x = -34.93\text{ m}, z = 48.86\text{ m}$ which caused extreme blade-like streaking geometry across the scene.
      - *Transform Baking*: Inverted node scale transforms (`[-0.823, -1.309, -0.823]` on `srb_left`) were baked into vertex positions with corrected counter-clockwise polygon winding, eliminating negative determinant matrices.
      - *Node Separation*: Monolithic stack separated into 8 distinct aerospace nodes (`core_stage`, `srb_left`, `srb_right`, `rs25_engines`, `icps`, `orion_cm`, `orion_esm`, `orion_las`) for staging and educational inspector interaction.
    - **Mobile Launcher & LC-39B Tower Architecture**:
      - *Corrupt CAD Quarantined*: The initial external CAD model (`tests/fixtures/corrupt/mobile_launcher_corrupt.glb`, 19,276 triangles, 30,212 vertices) was retired from production due to 779 needle triangles, extreme edge ratios (75.1% of diagonal), and rogue railing vertices extending up to $y = 210.4\text{ m}$. It is retained exclusively as an automated negative test fixture in `tests/regression/geometryDoctorRegression.test.ts`.
      - *Procedural Engineering Replacement*: In production, the Mobile Launcher is constructed via optimized procedural Three.js architecture (`src/three/models.ts`):
        - MLP Base & Flame Trench (`buildMobileLauncherAndTrench`): 752 clean triangles.
        - LC-39B Structural Tower & Umbilicals (`buildLC39BServiceTower`): 2,136 clean triangles.
        - Combined Tower + Base total: **2,888 clean triangles** (0 degenerate triangles, 0 NaN coordinates).
      - *Umbilicals & Retractable Crew Access Arm (CAA)*:
        - Modeled with 4 functional cryogenic umbilical arms (`ml-osmu`, `ml-icpsu`, `ml-csfsu`, `ml-csitu`).
        - Retractable Orion Crew Access Arm (`ml-caa`) features environmental enclosure White Room and rubber sealing bellows aligned flush with the Orion capsule hatch at $y = 22.46\text{ m}$.
        - Kinematic Animation: The CAA remains fully extended ($0\text{ rad}$) through T-10s, begins automated mechanical swing-back at T-2.4s, and reaches fully retracted park position ($-0.78\text{ rad}$) at T-0s (verified by unit test `tests/unit/crewAccessArmAnimation.test.ts` and screenshots `docs/qa/screens/launch_pad_caa_extended_t10.webp` and `launch_pad_caa_retracted_t0.webp`).
    - **International Space Station (`public/assets/crafts/iss.glb`)**:
      - Converted from official NASA 3D Resources `ISS (A)` model.
      - Processed with `@gltf-transform` (`weld`, `dedup`, `prune`) and geometric filtering to eliminate 132 zero-area degenerate triangles (0.00% degenerate residual). Model complies strictly with the $\le 40,000$ background triangle budget (6,510 triangles, 24.6 KB).
- **Google Draco 3D Geometry Decompression (Apache 2.0)**:
  - Local Draco WebAssembly decoder files (`public/draco/`).
  - Source: Google Draco (https://github.com/google/draco)
  - License: Apache License, Version 2.0.

---

## 5. Acoustic & Audio Recordings

- **NASA Historical STS Rocket Launch Audio (Public Domain)**:
  - High-fidelity physical rocket liftoff acoustic recordings captured at Kennedy Space Center LC-39 pad perimeter during Space Shuttle launches (STS program), capturing real solid rocket motor crackle, liquid engine low-frequency rumble, and pad deluge steam quenching.
  - Sourced via: NASA Audio Collections on Internet Archive (https://archive.org/details/nasa-audio).
  - License: Public Domain (U.S. Government Work, 17 U.S.C. § 105).
  - Processing: Compressed to OGG Vorbis (`rocket-launch-roar.ogg` at 947 KB, `rocket-launch-distant.ogg` at 1.08 MB) strictly adhering to the <1.5 MB audio asset limit.
- **Sound Effects Synthesis Engine (Web Audio API)**:
  - Real-time Web Audio API synthesized SFX engine for physical rocket acoustics (sub-bass rumble, SRB crackle, aerodynamic buffeting), cockpit alerts, alarm beeps, stage separation pyrotechnics, and UI clicks. The Web Audio synth is strictly reserved for physical sound effects, never for background music.
  - Created by: Artemis Odyssey team, distributed under project open-source terms.

---

## 6. Music & Soundtrack Layers

### Pixabay Content License Terms (Verbatim vs Summary)

- **Verbatim Permissions**:
  - _"All content on Pixabay can be used for free for commercial and noncommercial use across print and digital, except in the cases mentioned in 'What is not allowed'."_
  - _"Attribution is not required. Giving credit to the contributor or Pixabay is not necessary but is always appreciated by our community."_
  - _"You can make modifications to content from Pixabay."_
- **Verbatim Restrictions**:
  - _"This section only applies to image, video and audio users and not to the appropriate authors, contributors or copyright owners of the Content."_
  - _"Don't sell or distribute Content (either in digital or physical form) on a standalone basis."_
  - _"Don't alter Content in a way that creates a deceptive or misleading impression."_
  - _"Don't use Content featuring identifiable people in an offensive, pornographic, obscene, immoral, or illegal way."_
  - _"Don't use Content as part of a trademark, design mark, trade name, business name, or service mark."_
- **Operational Legal Analysis (Summary)**:
  - **In-Game Use & Web Hosting**: Permitted under the grant allowing free commercial and non-commercial use across digital formats when integrated into a creative composite work.
  - **Standalone Redistribution Prohibition**: Raw MP3 audio files cannot be sold or distributed on a standalone basis. Consequently, music tracks are strictly gitignored and not hosted in this git repository.
  - **Content ID Claims**: The Pixabay track page shows _"Content ID Registered"_. Pixabay does not host an automated external claim-clearing URL; instead, if an automated fingerprinting claim is registered on video platforms (e.g., YouTube), the uploader can file a dispute in platform tools (such as YouTube Studio) selecting _"I have permission or a license to use the content"_ and submitting the official Pixabay License Certificate text file provided upon track download.

### Track Manifest & Attribution

- **Title & Main Menu Theme (`main_page.mp3` / `title_theme.mp3`)**:
  - File / Path: Gitignored (`public/assets/audio/music/title_theme.mp3` / `assets-src/music/main_page.mp3`)
  - Track Title: _"Space Ambient Cinematic"_
  - Artist / Composer: Tunetank (`tunetank`) (https://pixabay.com/users/tunetank-50201703/)
  - Licence: Pixabay Content License (https://pixabay.com/service/license-summary/)
  - Verification Status: **Source still unverified** (Upstream track duration specified as 2:24; local asset duration measured at 3:05 / 184.92s).
  - Content ID Status: Registered with YouTube Content ID. Non-infringing under Pixabay Content License; clearable via Pixabay license certificate.
  - Fallback: Complete silent fallback when audio files are absent (no placeholder synth tones).

- **Space Flight Ambient Soundtrack (`space_flight_theme.mp3`)**:
  - File / Path: Gitignored (`public/assets/audio/music/space_flight_theme.mp3` / `assets-src/music/viacheslavstarostin-space-ambient-cinematic-music-338203.mp3`)
  - Track Title: _"Space Ambient Cinematic Music"_
  - Artist / Composer: Viacheslav Starostin (`viacheslavstarostin`) (https://pixabay.com/users/viacheslavstarostin-35805728/)
  - Track ID: `338203`
  - Source URL: https://pixabay.com/music/ambient-space-ambient-cinematic-music-338203/
  - Licence: Pixabay Content License (https://pixabay.com/service/license-summary/)
  - Verification Status: **Verified** (Duration 3:00 / 180.22s, Track ID 338203).
  - Content ID Status: Registered with automated digital fingerprinting.
  - Fallback: Complete silent fallback when audio files are absent.

---

## 7. Shipped Asset Manifest & File Provenance

Every local file in `public/` is documented below with its author, license, and upstream source URL:

| File Name                       | Category     | Author / Origin                      | License       | Source URL                                                                               |
| ------------------------------- | ------------ | ------------------------------------ | ------------- | ---------------------------------------------------------------------------------------- |
| `bennu.glb`                     | 3D Model     | NASA / OSIRIS-REx Team               | Public Domain | https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/1999%20RQ36%20asteroid |
| `apollo_lunar_module.glb`       | 3D Model     | NASA 3D Resources                    | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `iss.glb`                       | 3D Model     | NASA 3D Resources                    | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `jwst.glb`                      | 3D Model     | NASA 3D Resources                    | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `perseverance.glb`              | 3D Model     | NASA / JPL-Caltech                   | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `tdrs.glb`                      | 3D Model     | NASA 3D Resources                    | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `voyager.glb`                   | 3D Model     | NASA / JPL-Caltech                   | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `saturn_v.glb`                  | 3D Model     | NASA 3D Resources                    | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `sls_block1.glb`                | 3D Model     | NASA / MSFC                          | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `vab.glb`                       | 3D Model     | NASA 3D Resources                    | Public Domain | https://github.com/nasa/NASA-3D-Resources                                                |
| `artemis2-sls-pad.jpg`          | Image Banner | NASA / Kim Shiflett                  | Public Domain | https://images.nasa.gov/                                                                 |
| `sun.jpg`                       | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `mercury.jpg`                   | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `venus.jpg`                     | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `venus_surface.jpg`             | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `earth.jpg`                     | Texture      | NASA Earth Observatory Blue Marble   | Public Domain | https://earthobservatory.nasa.gov/                                                       |
| `earth-clouds.png`              | Texture      | NASA Scientific Visualization Studio | Public Domain | https://svs.gsfc.nasa.gov/                                                               |
| `earth_night.jpg`               | Texture      | NASA / Suomi NPP VIIRS Black Marble  | Public Domain | https://earthobservatory.nasa.gov/                                                       |
| `moon.jpg`                      | Texture      | NASA GSFC / ASU / LRO LROC WAC       | Public Domain | https://svs.gsfc.nasa.gov/                                                               |
| `mars.jpg`                      | Texture      | NASA JPL / USGS / Viking MDIM        | Public Domain | https://astrogeology.usgs.gov/                                                           |
| `jupiter.jpg`                   | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `saturn.jpg`                    | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `saturn_ring.png`               | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `uranus.jpg`                    | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `neptune.jpg`                   | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `ceres.jpg`                     | Texture      | INOVE / Solar System Scope           | CC-BY 4.0     | https://www.solarsystemscope.com/textures/                                               |
| `pluto.jpg`                     | Texture      | NASA / JHUAPL / SwRI New Horizons    | Public Domain | https://photojournal.jpl.nasa.gov/catalog/PIA19952                                       |
| `rocket-launch-roar.ogg`        | Audio        | NASA STS Program / Internet Archive  | Public Domain | https://archive.org/details/nasa-audio                                                   |
| `rocket-launch-distant.ogg`     | Audio        | NASA STS Program / Internet Archive  | Public Domain | https://archive.org/details/nasa-audio                                                   |
| `orbitron-latin.woff2`          | Font         | Matt McInerney                       | OFL-1.1       | http://scripts.sil.org/OFL                                                               |
| `plus-jakarta-sans-latin.woff2` | Font         | Ghaith Zahid, Tokotype               | OFL-1.1       | https://github.com/tokotype/PlusJakartaSans                                              |
| `jetbrains-mono-latin.woff2`    | Font         | JetBrains s.r.o.                     | OFL-1.1       | https://www.jetbrains.com/lp/mono/                                                       |
