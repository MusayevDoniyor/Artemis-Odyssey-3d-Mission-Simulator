import { useState } from 'react';
import { Sliders, Zap } from 'lucide-react';
import type { HardwareShowcaseId, HardwareSubPart } from '../game/hardwareCatalog';
import {
  SLS_STAGE_SEQUENCE,
  computePropulsionExplorerMetrics,
  getPropulsionProfileForPart,
  getRs25EngineClusterInfo,
} from '../game/hardwareInspector';
import type { InspectorUiState } from '../game/types';

interface EngineeringLabWidgetProps {
  showcase: HardwareShowcaseId;
  part: HardwareSubPart;
  inspectorUi: InspectorUiState;
  onUpdateInspectorUi: (partial: Partial<InspectorUiState>) => void;
}

export function EngineeringLabWidget({
  showcase,
  part,
  inspectorUi,
  onUpdateInspectorUi,
}: EngineeringLabWidgetProps) {
  const [vacuumMode, setVacuumMode] = useState(true);
  const [sunAngleDeg, setSunAngleDeg] = useState(15);
  const [wavelengthUm, setWavelengthUm] = useState(2.0);
  const [voyagerYear, setVoyagerYear] = useState(2026);
  const [linkTargetIdx, setLinkTargetIdx] = useState(1);
  const [pointingOffDeg, setPointingOffDeg] = useState(0.2);
  const [sinkRateMs, setSinkRateMs] = useState(1.8);
  const [slopeDeg, setSlopeDeg] = useState(14);
  const [roverMode, setRoverMode] = useState<'DRIVE' | 'CRAB' | 'SPIN' | 'WALKER'>('DRIVE');
  const [drillTempK, setDrillTempK] = useState(110);
  const [drillRpm, setDrillRpm] = useState(120);
  const [habCrew, setHabCrew] = useState(4);
  const [bermThicknessM, setBermThicknessM] = useState(1.5);
  const [kilopowerOn, setKilopowerOn] = useState(true);

  const kind = part.interactionKind;

  if (kind === 'rs25-engines') {
    const selectedEngine = inspectorUi.selectedSubEngine || 1;
    const gimbalDeg = inspectorUi.gimbalDeg ?? 0;
    const throttlePct = inspectorUi.propulsionThrottlePct ?? 109;
    const info = getRs25EngineClusterInfo(selectedEngine, gimbalDeg, throttlePct);

    return (
      <div className="space-y-3" data-testid="lab-rs25-engines">
        <div className="flex items-center justify-between">
          <span className="font-hud text-[11px] font-bold tracking-wide text-cyan-300 uppercase">
            RS-25 Cluster &amp; Gimbal Test
          </span>
          <span className="font-mono-tech text-[10px] text-slate-400">
            Click 3D bell or select below
          </span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {([1, 2, 3, 4] as const).map((idx) => (
            <button
              key={idx}
              type="button"
              data-testid={`rs25-eng-btn-${idx}`}
              onClick={() => onUpdateInspectorUi({ selectedSubEngine: idx })}
              className={`rounded border px-2 py-1.5 font-mono-tech text-xs font-bold transition ${
                selectedEngine === idx
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-700/80 bg-slate-900/70 text-slate-300 hover:border-cyan-400/45'
              }`}
            >
              #{idx}
            </button>
          ))}
        </div>

        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <div className="mb-2 font-hud text-[11px] font-semibold text-slate-200">
            {info.quadrantLabel} · Mount ({info.mountOffsetM[0]}m, {info.mountOffsetM[1]}m)
          </div>

          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Gimbal Deflection</span>
              <span className="font-bold text-cyan-300">
                {gimbalDeg > 0 ? `+${gimbalDeg.toFixed(1)}` : gimbalDeg.toFixed(1)}°
              </span>
            </div>
            <input
              type="range"
              data-testid="rs25-gimbal-slider"
              min={-10.5}
              max={10.5}
              step={0.5}
              value={gimbalDeg}
              onChange={(e) => onUpdateInspectorUi({ gimbalDeg: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </label>

          <label className="block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Throttle Setting</span>
              <span className="font-bold text-slate-100">{throttlePct}%</span>
            </div>
            <input
              type="range"
              min={67}
              max={109}
              step={1}
              value={throttlePct}
              onChange={(e) =>
                onUpdateInspectorUi({ propulsionThrottlePct: Number(e.target.value) })
              }
              className="w-full accent-cyan-400"
            />
          </label>

          <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-slate-800 pt-2 font-mono-tech text-[11px]">
            <div>
              <div className="text-[10px] text-slate-400">Vac Thrust</div>
              <div className="font-bold text-white">{info.nominalVacThrustKn} kN</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Axial Force</div>
              <div className="font-bold text-slate-100">{info.axialForceKn} kN</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Steering Force</div>
              <div className="font-bold text-cyan-300">{info.lateralForceKn} kN</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'stage-sep' && showcase === 'rocket') {
    const activeStep = inspectorUi.stageSepStep ?? 0;
    const stepSpec = SLS_STAGE_SEQUENCE[activeStep] || SLS_STAGE_SEQUENCE[0];
    return (
      <div className="space-y-3" data-testid="lab-stage-sep">
        <div className="flex items-center justify-between">
          <span className="font-hud text-[11px] font-bold tracking-wide text-cyan-300 uppercase">
            Ascent Staging Preview
          </span>
          <span className="font-mono-tech text-[11px] font-bold text-amber-300">
            {stepSpec.code}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {SLS_STAGE_SEQUENCE.map((st) => (
            <button
              key={st.step}
              type="button"
              data-testid={`stage-step-btn-${st.step}`}
              onClick={() => onUpdateInspectorUi({ stageSepStep: st.step })}
              className={`rounded border py-1.5 font-mono-tech text-[11px] font-bold transition ${
                activeStep === st.step
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-700/80 bg-slate-900/70 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st.step === 0 ? 'Pad' : `S${st.step}`}
            </button>
          ))}
        </div>

        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-hud font-bold text-white">{stepSpec.title}</span>
            <span className="font-mono-tech text-[10px] text-cyan-300">
              {stepSpec.altitudeLabel}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
            {stepSpec.description}
          </p>
        </div>
      </div>
    );
  }

  if (kind === 'propulsion-calc') {
    const profile = getPropulsionProfileForPart(showcase, part.id);
    const defaultThrottle = inspectorUi.propulsionThrottlePct ?? profile.maxThrottlePct;
    const metrics = computePropulsionExplorerMetrics(profile, defaultThrottle, vacuumMode);
    const fixedThrottle = profile.minThrottlePct === profile.maxThrottlePct;

    return (
      <div className="space-y-3" data-testid="lab-propulsion-calc">
        <div className="flex items-center justify-between gap-2">
          <span className="font-hud text-[11px] font-bold tracking-wide text-cyan-300 uppercase">
            Propulsion &amp; Thrust Explorer
          </span>
          {profile.ispVacS !== profile.ispSeaLevelS && (
            <div className="flex rounded border border-slate-700 bg-slate-900 p-0.5 font-mono-tech text-[10px]">
              <button
                type="button"
                onClick={() => setVacuumMode(false)}
                className={`rounded px-2 py-0.5 ${!vacuumMode ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-300'}`}
              >
                Sea Level
              </button>
              <button
                type="button"
                onClick={() => setVacuumMode(true)}
                className={`rounded px-2 py-0.5 ${vacuumMode ? 'bg-cyan-400 text-slate-950 font-bold' : 'text-slate-300'}`}
              >
                Vacuum
              </button>
            </div>
          )}
        </div>

        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <div className="mb-2 flex items-center justify-between font-mono-tech text-[11px]">
            <span className="text-slate-300">{metrics.engineLabel}</span>
            <span className="font-bold text-cyan-300">{metrics.throttlePct}% Throttle</span>
          </div>

          {!fixedThrottle && (
            <input
              type="range"
              data-testid="propulsion-throttle-slider"
              min={profile.minThrottlePct}
              max={profile.maxThrottlePct}
              value={metrics.throttlePct}
              onChange={(e) =>
                onUpdateInspectorUi({ propulsionThrottlePct: Number(e.target.value) })
              }
              className="mb-2.5 w-full accent-cyan-400"
            />
          )}

          <div className="grid grid-cols-2 gap-2 font-mono-tech text-[11px]">
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Net Thrust</div>
              <div className="font-bold text-white">{metrics.thrustKn.toLocaleString()} kN</div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Exhaust Velocity</div>
              <div className="font-bold text-cyan-300">
                {metrics.exhaustVelocityMs.toLocaleString()} m/s
              </div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Propellant Flow</div>
              <div className="font-bold text-slate-100">
                {metrics.massFlowKgS.toLocaleString()} kg/s
              </div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Local TWR</div>
              <div className={`font-bold ${metrics.twr >= 1 ? 'text-emerald-300' : 'text-amber-300'}`}>
                {metrics.twr.toFixed(2)} ({metrics.accelMs2 >= 0 ? '+' : ''}
                {metrics.accelMs2.toFixed(1)} m/s²)
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'solar-array') {
    const deployPct = inspectorUi.deployPct ?? 85;
    const peakKw =
      showcase === 'rocket' ? 11.2 : showcase === 'satellite' ? 4.8 : showcase === 'jwst' ? 2.0 : 0.48;
    const activeKw = peakKw * (deployPct / 100) * Math.max(0.08, Math.cos((sunAngleDeg * Math.PI) / 180));
    return (
      <div className="space-y-2.5" data-testid="lab-solar-array">
        <div className="flex items-center justify-between font-hud text-[11px] font-bold text-cyan-300 uppercase">
          <span>Solar Array Deployment &amp; Flux</span>
          <span className="font-mono-tech text-emerald-300">{activeKw.toFixed(2)} kW</span>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Wing Deployment (3D)</span>
              <span className="font-bold text-cyan-300">{deployPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={deployPct}
              onChange={(e) => onUpdateInspectorUi({ deployPct: Number(e.target.value) })}
              className="w-full accent-cyan-400"
            />
          </label>
          <label className="block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Sun Beta / Incidence Angle</span>
              <span className="font-bold text-slate-200">{sunAngleDeg}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={85}
              value={sunAngleDeg}
              onChange={(e) => setSunAngleDeg(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
        </div>
      </div>
    );
  }

  if (kind === 'optics-mirror') {
    const thetaArcsec = (1.22 * (wavelengthUm * 1e-6) / 6.5) * (180 / Math.PI) * 3600;
    const bandName =
      wavelengthUm < 5 ? 'NIRCam / NIRSpec (Near-IR)' : 'MIRI Cryo-Mid-Infrared';
    return (
      <div className="space-y-2.5" data-testid="lab-optics-mirror">
        <div className="font-hud text-[11px] font-bold text-cyan-300 uppercase">
          Diffraction &amp; Wavelength Explorer (D = 6.5 m)
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Infrared Wavelength</span>
              <span className="font-bold text-amber-300">{wavelengthUm.toFixed(1)} µm</span>
            </div>
            <input
              type="range"
              min={0.6}
              max={25.0}
              step={0.2}
              value={wavelengthUm}
              onChange={(e) => setWavelengthUm(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 font-mono-tech text-[11px]">
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Angular Resolution</div>
              <div className="font-bold text-white">{thetaArcsec.toFixed(3)} arcsec</div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Active Instrument</div>
              <div className="font-bold text-cyan-300">{bandName}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'thermal-shield') {
    const pitchTilt = Math.max(0, sunAngleDeg - 15);
    const l1TempK = Math.round(383 + pitchTilt * 0.6);
    const l5TempK = Math.round(36 + Math.max(0, pitchTilt - 5) * 0.8);
    return (
      <div className="space-y-2.5" data-testid="lab-thermal-shield">
        <div className="font-hud text-[11px] font-bold text-cyan-300 uppercase">
          5-Layer Kapton Attenuation Lab
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Observatory Sun-Pitch Angle</span>
              <span className="font-bold text-amber-300">{sunAngleDeg}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={45}
              value={sunAngleDeg}
              onChange={(e) => setSunAngleDeg(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </label>
          <div className="grid grid-cols-3 gap-2 font-mono-tech text-[11px]">
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Layer 1 (Sun)</div>
              <div className="font-bold text-amber-300">{l1TempK} K</div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Layer 5 (Cold)</div>
              <div className="font-bold text-cyan-300">{l5TempK} K</div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Shield ΔT</div>
              <div className="font-bold text-emerald-300">{l1TempK - l5TempK} K</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'rtg-power') {
    const yearsElapsed = Math.max(0, voyagerYear - 1977);
    const elecWatts = Math.round(470 * Math.pow(0.5, yearsElapsed / 87.74) * Math.pow(0.992, yearsElapsed));
    return (
      <div className="space-y-2.5" data-testid="lab-rtg-power">
        <div className="font-hud text-[11px] font-bold text-cyan-300 uppercase">
          Pu-238 Radioisotope Decay Curve
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Mission Year</span>
              <span className="font-bold text-amber-300">
                {voyagerYear} (+{yearsElapsed} yr)
              </span>
            </div>
            <input
              type="range"
              min={1977}
              max={2035}
              value={voyagerYear}
              onChange={(e) => setVoyagerYear(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 font-mono-tech text-[11px]">
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">3× MHW-RTG Output</div>
              <div className="font-bold text-cyan-300">{elecWatts} W</div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Science Payload State</div>
              <div className="font-bold text-slate-100">
                {elecWatts > 300 ? 'Full Suite Active' : elecWatts > 220 ? 'Heaters Cycled' : 'Core Interstellar Only'}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'lander-legs') {
    const g = 1.625;
    const kineticKj = 0.5 * 15200 * sinkRateMs * sinkRateMs / 1000;
    const status = sinkRateMs <= 2.4 ? 'NOMINAL CRUSH' : sinkRateMs <= 3.1 ? 'LIMIT STRAIN' : 'STRUCTURAL OVERLOAD';
    return (
      <div className="space-y-2.5" data-testid="lab-lander-legs">
        <div className="font-hud text-[11px] font-bold text-cyan-300 uppercase">
          Honeycomb Strut Impact Calculator (g = {g} m/s²)
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Touchdown Sink Rate</span>
              <span className="font-bold text-white">{sinkRateMs.toFixed(1)} m/s</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={4.0}
              step={0.1}
              value={sinkRateMs}
              onChange={(e) => setSinkRateMs(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 font-mono-tech text-[11px]">
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Absorbed Energy</div>
              <div className="font-bold text-cyan-300">{kineticKj.toFixed(1)} kJ</div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Gear Margin</div>
              <div className={`font-bold ${sinkRateMs <= 2.4 ? 'text-emerald-300' : sinkRateMs <= 3.1 ? 'text-amber-300' : 'text-rose-400'}`}>
                {status}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'rover-mobility') {
    const slipPct =
      roverMode === 'CRAB' ? Math.round(slopeDeg * 0.45) : roverMode === 'WALKER' ? Math.round(slopeDeg * 0.25) : Math.round(slopeDeg * 0.85);
    return (
      <div className="space-y-2.5" data-testid="lab-rover-mobility">
        <div className="font-hud text-[11px] font-bold text-cyan-300 uppercase">
          Rocker-Bogie &amp; Wheel Mode Lab
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(['DRIVE', 'CRAB', 'SPIN', 'WALKER'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setRoverMode(m)}
              className={`rounded border py-1 font-mono-tech text-[10px] font-bold ${
                roverMode === m
                  ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-700/80 bg-slate-900/70 text-slate-300'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Crater Wall Slope</span>
              <span className="font-bold text-amber-300">{slopeDeg}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={slopeDeg}
              onChange={(e) => setSlopeDeg(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
          <div className="flex justify-between font-mono-tech text-[11px]">
            <span className="text-slate-400">Estimated Regolith Slip</span>
            <span className={`font-bold ${slipPct < 15 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {slipPct}% ({roverMode === 'WALKER' ? 'Active Suspension Lift' : 'Standard Rolling'})
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'rover-drill') {
    const bitTempC = Math.round(drillTempK - 273 + drillRpm * 0.18);
    return (
      <div className="space-y-2.5" data-testid="lab-rover-drill">
        <div className="font-hud text-[11px] font-bold text-cyan-300 uppercase">
          TRIDENT Percussive Ice-Coring Lab
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">PSR Crater Regolith Temp</span>
              <span className="font-bold text-cyan-300">{drillTempK} K</span>
            </div>
            <input
              type="range"
              min={70}
              max={160}
              value={drillTempK}
              onChange={(e) => setDrillTempK(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Auger Rotary Speed</span>
              <span className="font-bold text-white">{drillRpm} RPM</span>
            </div>
            <input
              type="range"
              min={60}
              max={180}
              step={10}
              value={drillRpm}
              onChange={(e) => setDrillRpm(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
          <div className="flex justify-between border-t border-slate-800 pt-2 font-mono-tech text-[11px]">
            <span className="text-slate-400">Bit Tip Heating</span>
            <span className={`font-bold ${bitTempC < -120 ? 'text-emerald-300' : 'text-amber-300'}`}>
              {bitTempC} °C ({bitTempC < -120 ? 'Ice Preserved' : 'Sublimation Risk'})
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (kind === 'hab-shield') {
    const netPowerKw = (kilopowerOn ? 10.0 : 2.2) - habCrew * 0.85;
    const doseReductionPct = Math.min(92, Math.round(45 + bermThicknessM * 22));
    return (
      <div className="space-y-2.5" data-testid="lab-hab-shield">
        <div className="flex items-center justify-between">
          <span className="font-hud text-[11px] font-bold text-cyan-300 uppercase">
            Base Camp Power &amp; Shielding
          </span>
          <button
            type="button"
            onClick={() => setKilopowerOn((v) => !v)}
            className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono-tech text-[10px] font-bold ${
              kilopowerOn
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-700 bg-slate-900 text-slate-400'
            }`}
          >
            <Zap className="h-3 w-3" />
            {kilopowerOn ? 'Kilopower 10 kWe' : 'Solar Only'}
          </button>
        </div>
        <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Crew Complement</span>
              <span className="font-bold text-white">{habCrew} astronauts</span>
            </div>
            <input
              type="range"
              min={2}
              max={6}
              value={habCrew}
              onChange={(e) => setHabCrew(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
          <label className="mb-2 block">
            <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
              <span className="text-slate-400">Regolith Berm Depth</span>
              <span className="font-bold text-cyan-300">{bermThicknessM.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2.5}
              step={0.25}
              value={bermThicknessM}
              onChange={(e) => setBermThicknessM(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 font-mono-tech text-[11px]">
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">Power Margin</div>
              <div className={`font-bold ${netPowerKw >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                {netPowerKw >= 0 ? `+${netPowerKw.toFixed(1)}` : netPowerKw.toFixed(1)} kW
              </div>
            </div>
            <div className="rounded bg-slate-900/75 p-2">
              <div className="text-[10px] text-slate-400">SPE Dose Reduction</div>
              <div className="font-bold text-cyan-300">{doseReductionPct}%</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: 'gimbal-attitude' / Deep-space RF link & attitude pointing calculator
  const targets = [
    { name: 'LEO Relay', km: 400 },
    { name: 'Lunar Orbit', km: 384400 },
    { name: 'Mars Conj.', km: 225000000 },
    { name: 'Heliopause', km: 24380000000 },
  ];
  const activeTarget = targets[linkTargetIdx] || targets[1];
  const oneWaySec = (activeTarget.km * 1000) / 299792458;
  const pointLossDb = (pointingOffDeg * pointingOffDeg * 4.2).toFixed(1);
  return (
    <div className="space-y-2.5" data-testid="lab-gimbal-attitude">
      <div className="flex items-center gap-1.5 font-hud text-[11px] font-bold text-cyan-300 uppercase">
        <Sliders className="h-3.5 w-3.5" />
        RF Link Budget &amp; Pointing Explorer
      </div>
      <div className="grid grid-cols-4 gap-1">
        {targets.map((t, idx) => (
          <button
            key={t.name}
            type="button"
            onClick={() => setLinkTargetIdx(idx)}
            className={`rounded border py-1 font-mono-tech text-[10px] font-bold ${
              linkTargetIdx === idx
                ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                : 'border-slate-700/80 bg-slate-900/70 text-slate-300'
            }`}
          >
            {t.name.split(' ')[0]}
          </button>
        ))}
      </div>
      <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
        <label className="mb-2 block">
          <div className="mb-1 flex justify-between font-mono-tech text-[11px]">
            <span className="text-slate-400">Dish Pointing Error</span>
            <span className="font-bold text-amber-300">{pointingOffDeg.toFixed(1)}°</span>
          </div>
          <input
            type="range"
            min={0}
            max={2.0}
            step={0.1}
            value={pointingOffDeg}
            onChange={(e) => setPointingOffDeg(Number(e.target.value))}
            className="w-full accent-cyan-400"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 font-mono-tech text-[11px]">
          <div className="rounded bg-slate-900/75 p-2">
            <div className="text-[10px] text-slate-400">One-Way Light Time</div>
            <div className="font-bold text-white">
              {oneWaySec < 1
                ? `${(oneWaySec * 1000).toFixed(1)} ms`
                : oneWaySec < 120
                  ? `${oneWaySec.toFixed(2)} s`
                  : oneWaySec < 7200
                    ? `${(oneWaySec / 60).toFixed(1)} min`
                    : `${(oneWaySec / 3600).toFixed(1)} hr`}
            </div>
          </div>
          <div className="rounded bg-slate-900/75 p-2">
            <div className="text-[10px] text-slate-400">Pointing Attenuation</div>
            <div className={`font-bold ${Number(pointLossDb) < 3 ? 'text-emerald-300' : 'text-amber-300'}`}>
              -{pointLossDb} dB
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
