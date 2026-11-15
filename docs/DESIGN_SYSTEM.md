# ARTEMIS ODYSSEY: DESIGN SYSTEM & UI TOKEN SPECIFICATION

**Document Version:** 2.0.0 · **Target Phase:** Milestone 4 (Phase A)  
**Author:** Lead UI/UX Designer & Systems Architect  
**Architecture Baseline:** Tailwind CSS v4 `@theme`, WCAG 2.2 AA Compliance, NASA Mission Control Aesthetic

---

## 1. DESIGN STANCE & ATMOSPHERE

- **Aesthetic Direction**: _Aerospace Utilitarian / NASA Mission Control Cockpit_.  
  High-contrast deep space dark background, precision technical typography, crisp 1px borders, subtle telemetry glows, and strict functional restraint. Zero cartoonish blobs or rainbow gradients.
- **Project Overrides**: Per project constitution, aerospace flight HUD conventions (uppercase labels, mono tabular telemetry, and glowing vector pips) override generic generic-web UI skill defaults where appropriate for flight instrumentation.
- **Viewports**: Fully responsive down to 390px mobile width with **zero horizontal overflow** (`scrollWidth <= clientWidth`), and calibrated for 1440px desktop command displays.

---

## 2. TAILWIND CSS v4 TOKENS (`@theme`)

All design tokens are defined in **one authoritative source of truth** inside the CSS stylesheet using Tailwind v4's native `@theme` directive:

```css
@import "tailwindcss";

@theme {
  /* Surface & Background Colors */
  --color-space-base: #020617; /* Pitch-black space background */
  --color-space-surface: #0b1329; /* Primary panel midnight slate */
  --color-space-elevated: #111e3f; /* Raised card / popover surface */
  --color-space-overlay: rgba(2, 6, 23, 0.88); /* Modal glass backdrop */

  /* Semantic Accent Palettes */
  --color-hud-cyan-50: #ecfeff;
  --color-hud-cyan-300: #67e8f9; /* Telemetry pips & active markers */
  --color-hud-cyan-400: #22d3ee; /* Primary vector action & highlights */
  --color-hud-cyan-500: #06b6d4; /* Primary button gradient base */
  --color-hud-cyan-950: #083344; /* Interactive button hover / active tint */

  --color-hud-amber-300: #fcd34d; /* Secondary caution indicator */
  --color-hud-amber-400: #fbbf24; /* Archival telemetry & warning pips */
  --color-hud-amber-500: #f59e0b; /* Trajectory markers & caution tape */
  --color-hud-amber-950: #451a03;

  --color-hud-emerald-400: #34d399; /* Nominal status & live data pulse */
  --color-hud-emerald-500: #10b981;
  --color-hud-rose-400: #fb7185; /* Critical flight abort & alarm */
  --color-hud-rose-500: #f43f5e;

  /* Typography Families (Self-Hosted / Bundled) */
  --font-display: "Orbitron", system-ui, sans-serif;
  --font-hud: "Chakra Petch", system-ui, sans-serif;
  --font-body: "Plus Jakarta Sans", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Type Scale */
  --text-2xs: 0.625rem; /* 10px - Micro sensor labels & units */
  --text-xs: 0.75rem; /* 12px - HUD secondary telemetry tags */
  --text-sm: 0.875rem; /* 14px - Body copy & button labels */
  --text-base: 1rem; /* 16px - Standard dialogs & cards */
  --text-lg: 1.125rem; /* 18px - Card headings */
  --text-xl: 1.25rem; /* 20px - Section titles */
  --text-2xl: 1.5rem; /* 24px - Mission headers */
  --text-3xl: 2rem; /* 32px - Main Hero displays */

  /* Border Radii */
  --radius-xs: 4px; /* Micro chips & telemetry pips */
  --radius-sm: 6px; /* Tactical buttons & tags */
  --radius-md: 10px; /* Interactive cards & panels */
  --radius-lg: 16px; /* Dialog modals & mission cards */
  --radius-full: 9999px; /* Status pills & flight reticles */

  /* Strict 8-pt Spatial Geometry */
  --spacing-1: 4px; /* Half-grid micro gap */
  --spacing-2: 8px; /* 1 grid unit */
  --spacing-3: 12px; /* 1.5 grid units */
  --spacing-4: 16px; /* 2 grid units */
  --spacing-6: 24px; /* 3 grid units */
  --spacing-8: 32px; /* 4 grid units */
  --spacing-12: 48px; /* 6 grid units */

  /* Motion & Transitions */
  --ease-flight: cubic-bezier(0.16, 1, 0.3, 1);
  --duration-snap: 120ms;
  --duration-hover: 180ms;
  --duration-modal: 240ms;
}
```

---

## 3. TYPOGRAPHY & FONT LICENSING

To ensure **zero runtime CDN dependencies** and complete offline reliability in secure educational environments, all fonts will be bundled locally under `public/fonts/` (or via `@fontsource` packages):

| Font Family           | Primary Role                                             | Weight(s)     | Licensing                       | Usage Source                               |
| :-------------------- | :------------------------------------------------------- | :------------ | :------------------------------ | :----------------------------------------- |
| **Orbitron**          | Hero title wordmark, major section headers               | 700, 800      | SIL Open Font License 1.1 (OFL) | NASA-style geometric display font          |
| **Chakra Petch**      | Flight phase tags, telemetry ribbons, CTA buttons        | 600, 700      | SIL Open Font License 1.1 (OFL) | High-legibility technical square grotesque |
| **Plus Jakarta Sans** | Mission briefings, educational descriptions, settings    | 400, 500, 600 | SIL Open Font License 1.1 (OFL) | Clean contemporary humanist sans           |
| **JetBrains Mono**    | Numerical values, coordinates, SI units ($m/s, km, kPa$) | 500, 700      | SIL Open Font License 1.1 (OFL) | Tabular figures preventing layout jitter   |

---

## 4. DESIGN SYSTEM COMPONENT PRIMITIVES

All new UI elements are constructed from reusable, accessible primitives adhering to the **8-state interactive model**:
_(Default, Hover, Focus-Visible, Active, Disabled, Loading, Error, Success)_ with mandatory `cursor: pointer` on clickable controls.

### 4.1 `Panel` (Surface Container)

- **Role**: Midnight aerospace glass substrate providing readable contrast over Three.js starfields.
- **Styling**: `bg-slate-950/85 border border-sky-400/20 backdrop-blur-md shadow-2xl`.
- **Nested Radius Rule**: Outer container $R=16\text{px}$, inner item padding $P=12\text{px} \implies R_{\text{inner}} = 4\text{px}$ to preserve optical concentricity.

### 4.2 `Button` (Interactive Trigger)

- **Variants**:
  - `primary`: Cyan gradient (`bg-gradient-to-r from-cyan-500 to-sky-600 text-slate-950 font-bold hover:brightness-110 active:scale-[0.98]`).
  - `secondary`: Glass border (`bg-sky-950/40 border border-sky-400/30 text-sky-100 hover:bg-sky-900/50`).
  - `ghost`: Transparent with hover tint (`text-slate-300 hover:text-white hover:bg-slate-900/50`).
  - `danger`: Red border (`bg-rose-950/40 border border-rose-500/40 text-rose-200 hover:bg-rose-900/50`).
- **Focus Rings**: Mandatory high-contrast `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950`.

### 4.3 `ProgressBar` (Resource & Throttle Tape)

- **Role**: Displays propellant, oxygen, electrical power, and flight ascent progress.
- **Structure**: 6px or 8px height track (`bg-slate-900 border border-slate-800 rounded-full`) with filled segment colored by threshold:
  - Nominal ($>35\%$): Emerald or Cyan fill.
  - Caution ($20\%\text{--}35\%$): Amber fill.
  - Critical ($<20\%$): Rose fill with subtle 1 Hz pulse.

### 4.4 `TelemetryValue` (Numerical Readout)

- **Role**: Displays speed, altitude, dynamic pressure, downrange distance.
- **Composition**: Micro label (`font-hud text-2xs text-slate-400 uppercase tracking-widest`) stacked above mono tabular digits (`font-mono text-base font-bold text-white`) accompanied by SI unit pill (`text-xs text-cyan-300`).

### 4.5 `StatusPill` (Live Connection & Telemetry Indicator)

- **Role**: Conveys authentic telemetry status without fake buttons.
- **States**:
  - `LIVE`: Green beacon dot (`bg-emerald-400 animate-pulse`), `"DONKI LIVE · OSDR LIVE"`.
  - `ARCHIVED`: Amber dot (`bg-amber-400`), `"DONKI M2.4 REPLAY · OSDR ARCHIVED"`.
  - `OFFLINE`: Red dot (`bg-rose-400`), `"TELEMETRY OFFLINE"`.

### 4.6 `MissionCard` (Campaign Progression)

- **Role**: Shows mission title, destination, status badge, and launch CTA.
- **States**:
  - `Available / Placed`: Highlighted cyan border, prominent "LAUNCH" button.
  - `Locked / In Development`: Subtle slate border (`opacity-70`), lock icon badge (`IN DEVELOPMENT · MILESTONE X`), disabled CTA explaining timeline.

---

## 5. ACCESSIBILITY & CONTRAST RIGOR (WCAG 2.2 AA)

1. **Text Contrast**:
   - Primary white text (`#f8fafc`) on slate surface (`#0b1329`): **$15.2:1$** (Exceeds WCAG AAA $7:1$).
   - Cyan accent (`#22d3ee`) on dark surface: **$9.4:1$** (Exceeds WCAG AAA).
   - Amber caution text (`#fbbf24`) on dark surface: **$8.6:1$** (Exceeds WCAG AAA).
   - Disabled text (`#64748b`): **$4.6:1$** (Exceeds WCAG AA $4.5:1$).
2. **Keyboard Navigation**:
   - Logical tab order: Top navigation $\to$ Mission selection $\to$ Primary action CTA.
   - Escape key cleanly dismisses modals and returns focus to the triggering element.
3. **Screen Reader Support**:
   - All interactive controls have semantic roles (`button`, `role="tab"`, `aria-selected`, `aria-expanded`).
   - SVG icons include `aria-hidden="true"` while enclosing buttons provide explicit `aria-label`s.

---

## 6. NASA BRAND COMPLIANCE & LEGAL HONESTY

- **Legal Authority**: Title 14 Code of Federal Regulations (CFR) Part 1221 & [NASA Media Usage Guidelines](https://www.nasa.gov/multimedia/guidelines/index.html).
- **Prohibition**: Third-party commercial or independent software may not use the official NASA blue "meatball" or red "worm" insignia in application headers as an identifying trademark without explicit written permission from NASA Office of Communications.
- **Original Mark Implementation**:
  - Replace `nasa-meatball.png` in [src/components/NASAInsignia.tsx](file:///C:/Users/doniy/Desktop/ArtemisOdyssey/src/components/NASAInsignia.tsx) with an original, vector SVG flight chevron mark: twin cyan ascent trajectories orbiting a stylized lunar crescent.
  - Accompany all displays with an explicit disclaimer:
    _"Unofficial educational mission simulator. Not affiliated with, sponsored, or endorsed by NASA. NASA open data and public-domain mission manifests are utilized strictly for STEM educational purposes."_

---

## 7. PAUSE MENU CONTENT ARCHITECTURE

To preserve 100% of game information without cluttering the pause overlay:

1. **Primary Navigation**:
   - `Resume` (Return to simulation)
   - `Flight Controls` (Keyboard & mouse mapping cheatsheet)
   - `Simulation Settings` (Cadet vs Engineer flight tier, time compression, visual fidelity)
   - `Audio & Synth` (Procedural rocket synth volume, Quindar tones, soundtrack)
   - `Research & Records` (Field Ledger discoveries, Mission Achievements, Science Glossary)
   - `Abort Mission` (Return to Title screen)
2. **Content Preservation**:
   - The _Field Ledger_ (unlocked astronaut notes), _Achievements_ (campaign medals), and _Glossary_ remain fully accessible inside the **Research & Records** tab until the post-flight Mission Debrief screen (Milestone 6) is implemented. Zero content is deleted.
