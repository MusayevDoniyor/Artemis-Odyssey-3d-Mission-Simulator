# Research: Cinematic Audio Architecture, Web Audio Routing & Settings System

## 1. Web Audio 4-Bus Mixing Console Architecture

In interactive aerospace simulations, audio design must separate functional acoustic layers into independently adjustable and muting buses to prevent sound mud and ear fatigue:

```
[AudioContext Destination]
          ▲
    [Master Bus Gain]  (0 - 100%, Mute toggle)
    ┌─────┴──────────────────┬─────────────────┬──────────────────┐
    │                        │                 │                  │
[SFX Bus Gain]        [Music Bus Gain]   [Engine Bus Gain]   [Ambience Bus Gain]
 (Beeps, UI clicks,   (Space Piano/      (Phase 4 Rocket     (Cabin ventilation,
 Alarms, Docking)     Celesta, Chords)   Acoustics, Plumes)   Wind, Solar flux)
```

### 1.1 Dynamic Gain Ramping Envelopes
To eliminate pops, DC offsets, and sudden volume discontinuities, Web Audio parameter updates must never change discontinuously. Parameter transitions use `exponentialRampToValueAtTime` or `linearRampToValueAtTime` with a duration of 0.05s to 0.1s for UI sliders, and 1.5s to 2.0s for musical crossfades.

## 2. Dynamic Musical State Machine

The procedural ambient music engine synthesizes distinct harmonic progressions tailored to each mission phase:

| State | Game Phases | Harmonic Progression | Tempo / Cadence | Tone Characteristics |
|---|---|---|---|---|
| `menu` | Title, Briefing, Hardware Bay, Victory | Dm9 -> Bbmaj9 -> Cmaj9 -> Am9 | 6.5s phrase breath | Pure sine piano + celesta harmonics, zero sub-bass drone |
| `launch` | Launch Pad, Ascent, Staging | Dm -> F -> C -> G (minor/modal) | 4.8s building tension | Rising mid-register swells, lowpass ducking when rocket engines ignite |
| `space` | Earth Orbit, TLI, Cislunar Transit | Asus2 -> Fmaj7 -> Gmaj7 -> Dm9 | 8.2s deep contemplative | Expansive octave spacing, crystalline high shimmer |
| `descent` | Lunar Descent, Mars EDL | Gm -> Eb -> F -> Dm (syncopated) | 3.6s pulsed cadence | Focused focus chords, subtle rhythmic radar pings |
| `surface` | Moon South Pole, Mars Jezero Surface | Cmaj7 -> Em7 -> Fmaj7 -> G | 7.4s calm exploration | Warm drifting ambient chords, gentle acoustic texture |

## 3. Graphics Quality Presets & Scalability

| Quality Preset | Shadow Maps | Pixel Ratio | Particle Budget | Antialiasing | Bloom / Glow |
|---|---|---|---|---|---|
| `low` | Disabled | 1.0 (Fixed) | 250 particles | Off | Minimal |
| `med` | Enabled (1024x1024) | `min(dpr, 1.5)` | 750 particles | FXAA | Standard |
| `high` | Enabled (2048x2048) | `min(dpr, 2.0)` | 1,500 particles | Standard | Enhanced |
| `ultra` | Soft PCF (4096x4096) | `min(dpr, 2.5)` | 3,000 particles | SMAA / Sub-pixel | High Dynamic |

## 4. Aerospace Units of Measurement & Conversions

Conforming to NASA and NIST SP 811 standards:

| Physical Quantity | SI Metric Units | Aerospace / Imperial Units | Conversion Factor |
|---|---|---|---|
| **Speed** | $\text{m/s}$ or $\text{km/s}$ | $\text{ft/s}$ or $\text{nmi/s}$ | $1\text{ m/s} = 3.28084\text{ ft/s}$<br>$1\text{ km/s} = 0.539957\text{ nmi/s}$ |
| **Altitude / Distance** | $\text{km}$ or $\text{m}$ | $\text{nmi}$ or $\text{ft}$ | $1\text{ km} = 0.539957\text{ nmi}$<br>$1\text{ km} = 3280.84\text{ ft}$ |
| **Thrust / Force** | $\text{kN}$ or $\text{MN}$ | $\text{lbf}$ or $\text{klbf}$ | $1\text{ kN} = 224.809\text{ lbf}$ |
| **Pressure** | $\text{kPa}$ or $\text{bar}$ | $\text{psi}$ or $\text{atm}$ | $1\text{ kPa} = 0.145038\text{ psi}$<br>$1\text{ bar} = 14.5038\text{ psi}$ |
| **Mass** | $\text{kg}$ or $\text{t}$ | $\text{lb}$ | $1\text{ kg} = 2.20462\text{ lb}$ |

## 5. Accessibility & Persistence (WCAG 2.2 Standards)

1. **Reduced Motion**: Respects `prefers-reduced-motion` system settings and provides an in-game toggle. Disables screen vibration during launch and high-frequency solar storm screen flashes.
2. **High-Contrast Borders**: Enforces 4.5:1 text-to-background contrast and adds solid `ring-1 ring-cyan-400` border outlines on transparent glass panels.
3. **Local Storage Schema**: Stored under `artemis_odyssey_user_settings_v1`. Validates each field upon load with graceful default fallback for corrupted values.
