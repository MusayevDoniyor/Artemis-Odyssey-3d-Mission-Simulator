import { AlertTriangle, CheckCircle2, Flame, Layers, Snowflake, Wrench, X } from 'lucide-react';
import { getDrillStrata } from '../game/drilling';
import type { DrillSetting, DrillingConsoleState } from '../game/types';

interface DrillingModalProps {
  state: DrillingConsoleState | null;
  onChangeSetting: (setting: DrillSetting) => void;
  onSetDrillingActive: (active: boolean) => void;
  onPurgeAndCool: () => void;
  onClaimCoreSample: () => void;
  onClose: () => void;
}

const SPEED_MODES: Array<{ id: DrillSetting; label: string; desc: string }> = [
  { id: 'GENTLE', label: 'Gentle', desc: 'Low heat · Safe ice' },
  { id: 'NOMINAL', label: 'Nominal', desc: 'Balanced rotary' },
  { id: 'HIGH_TORQUE', label: 'High Torque', desc: 'Fast basalt bite' },
];

export function DrillingModal({
  state,
  onChangeSetting,
  onSetDrillingActive,
  onPurgeAndCool,
  onClaimCoreSample,
  onClose,
}: DrillingModalProps) {
  if (!state || !state.open) return null;

  const strata = getDrillStrata(state.planet);
  const currentIdx = Math.min(3, Math.floor(state.depthCm / 25));
  const activeStratum = strata[currentIdx];
  const tempTone =
    state.bitTempC >= 80
      ? 'text-rose-300'
      : state.bitTempC >= 30
        ? 'text-amber-300'
        : 'text-cyan-300';
  const torqueTone =
    state.torquePct >= 85
      ? 'text-rose-300'
      : state.torquePct >= 62
        ? 'text-amber-300'
        : 'text-emerald-300';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/82 p-4">
      <div
        data-testid="drilling-console-modal"
        className="hud-panel tactical-frame animate-modal-enter w-full max-w-3xl rounded-2xl p-5"
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-sky-400/20 pb-3">
          <div>
            <p className="font-hud text-[11px] font-bold tracking-[0.18em] text-sky-300 uppercase">
              TRIDENT 1m Percussive Core Sampler · {state.planet === 'mars' ? 'Jezero Crater' : 'Lunar South Pole'}
            </p>
            <h2 className="font-display text-xl font-bold text-white uppercase">
              {state.objectiveTitle}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close TRIDENT Drill Console"
            onClick={onClose}
            className="rounded-xl border border-sky-400/25 bg-slate-900/75 p-2 text-slate-300 hover:border-sky-400/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          {/* Left: Drill Controls, Heat & Torque Monitors */}
          <div className="flex flex-col gap-3">
            {/* Speed Selector */}
            <div className="rounded-xl border border-sky-400/20 bg-slate-950/65 p-3">
              <div className="mb-2 flex items-center justify-between font-hud text-[11px] font-bold tracking-wider text-slate-300 uppercase">
                <span>Auger Speed &amp; Percussion</span>
                <span className="font-mono-tech text-sky-300">
                  {Math.round(state.depthCm)} / 100 cm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SPEED_MODES.map((m) => {
                  const active = state.setting === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeSetting(m.id)}
                      className={`rounded-lg border px-2.5 py-2 text-left transition ${
                        active
                          ? 'border-amber-400 bg-amber-500/20 text-white'
                          : 'border-sky-400/15 bg-slate-900/75 text-slate-300 hover:border-sky-400/50'
                      }`}
                    >
                      <div className="font-hud text-xs font-bold uppercase">{m.label}</div>
                      <div className="text-[10px] text-slate-400">{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Bit Temp, Torque, Depth Gauges */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-slate-700/80 bg-slate-950/95 p-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-hud font-bold text-slate-300 uppercase">
                    <Flame className="h-3.5 w-3.5 text-amber-400" />
                    Bit Temp
                  </span>
                  <span className={`font-mono-tech font-bold ${tempTone}`}>
                    {state.bitTempC}°C
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all ${
                      state.bitTempC >= 80
                        ? 'bg-rose-500'
                        : state.bitTempC >= 30
                          ? 'bg-amber-400'
                          : 'bg-cyan-400'
                    }`}
                    style={{ width: `${Math.max(4, Math.min(100, ((state.bitTempC + 45) / 150) * 100))}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Limit 95°C (protects volatile ice)</p>
              </div>

              <div className="rounded-xl border border-slate-700/80 bg-slate-950/95 p-3">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 font-hud font-bold text-slate-300 uppercase">
                    <Wrench className="h-3.5 w-3.5 text-emerald-400" />
                    Motor Torque
                  </span>
                  <span className={`font-mono-tech font-bold ${torqueTone}`}>
                    {state.torquePct}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full transition-all ${
                      state.torquePct >= 85
                        ? 'bg-rose-500'
                        : state.torquePct >= 62
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, state.torquePct)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-slate-400">Current layer: {activeStratum.name}</p>
              </div>
            </div>

            {/* Jam / Overheat Warning + Purge Action */}
            {(state.jammed || state.overheated) && (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-400/60 bg-rose-950/85 p-3 text-xs">
                <div className="flex items-center gap-2 text-rose-100">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                  <span>{state.statusNote}</span>
                </div>
                <button
                  type="button"
                  onClick={onPurgeAndCool}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-sky-400 px-3 py-2 font-hud text-xs font-bold text-slate-950 uppercase hover:bg-sky-300"
                >
                  <Snowflake className="h-3.5 w-3.5" />
                  Purge &amp; Cool
                </button>
              </div>
            )}

            {!state.jammed && !state.overheated && (
              <div className="rounded-lg border border-sky-400/20 bg-slate-900/65 px-3 py-2 text-xs text-slate-200">
                {state.statusNote}
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {!state.completed ? (
                <>
                  <button
                    type="button"
                    data-testid="drill-hold-btn"
                    disabled={state.jammed || state.overheated}
                    onPointerDown={() => onSetDrillingActive(true)}
                    onPointerUp={() => onSetDrillingActive(false)}
                    onPointerLeave={() => onSetDrillingActive(false)}
                    onPointerCancel={() => onSetDrillingActive(false)}
                    onClick={() => {
                      if (!state.isDrilling) {
                        onSetDrillingActive(true);
                        window.setTimeout(() => onSetDrillingActive(false), 650);
                      }
                    }}
                    className={`flex-1 rounded-xl px-4 py-3 font-display text-xs font-bold tracking-wider uppercase transition ${
                      state.jammed || state.overheated
                        ? 'bg-slate-800 text-slate-500'
                        : state.isDrilling
                          ? 'bg-emerald-400 text-slate-950'
                          : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                    }`}
                  >
                    {state.isDrilling ? 'DRILLING AUGER...' : 'HOLD TO DRILL CORE (OR TAP STEP)'}
                  </button>
                  <button
                    type="button"
                    onClick={onPurgeAndCool}
                    className="rounded-xl border border-sky-400/35 bg-slate-900/75 px-3.5 py-3 font-hud text-xs font-bold text-sky-200 uppercase hover:border-sky-300"
                  >
                    Purge / Cool
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="claim-core-btn"
                  onClick={onClaimCoreSample}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-display text-sm font-bold tracking-wider text-slate-950 uppercase hover:bg-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Log Core Sample &amp; Collect ISRU Rewards
                </button>
              )}
            </div>
          </div>

          {/* Right: 2D Core Sample Stratigraphy Tube Viewer */}
          <div className="flex flex-col rounded-xl border border-sky-400/20 bg-slate-950/65 p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 font-display text-xs font-bold text-sky-300 uppercase">
                <Layers className="h-4 w-4" />
                Core Stratigraphy Tube
              </span>
              <span className="font-mono-tech text-[10px] font-bold text-slate-400">
                {state.collectedStrata.length}/4 LAYERS
              </span>
            </div>

            <div className="flex flex-1 gap-3">
              {/* Vertical Borehole Tube Diagram */}
              <div className="relative w-11 shrink-0 overflow-hidden rounded-lg border-2 border-slate-700 bg-slate-900">
                {strata.map((s) => {
                  const extracted = state.collectedStrata.includes(s.index);
                  return (
                    <div
                      key={s.index}
                      className="flex h-1/4 items-center justify-center border-b border-slate-950/60 font-mono-tech text-[9px] font-bold transition-opacity"
                      style={{
                        backgroundColor: extracted ? s.colorHex : '#0f172a',
                        color: extracted ? '#020617' : '#475569',
                      }}
                    >
                      {s.icePct}%
                    </div>
                  );
                })}
                {/* Live Auger Head Depth Marker */}
                <div
                  className="pointer-events-none absolute right-0 left-0 h-1 bg-amber-400 shadow"
                  style={{ top: `${Math.min(98, state.depthCm)}%` }}
                />
              </div>

              {/* Layer Science Breakdown */}
              <div className="flex flex-1 flex-col justify-between gap-1.5">
                {strata.map((s) => {
                  const extracted = state.collectedStrata.includes(s.index);
                  const active = currentIdx === s.index && !state.completed;
                  return (
                    <div
                      key={s.index}
                      className={`rounded-lg border px-2.5 py-1.5 text-[11px] transition ${
                        extracted
                          ? 'border-emerald-400/50 bg-emerald-950/50 text-slate-100'
                          : active
                            ? 'border-amber-400/60 bg-amber-500/10 text-amber-100'
                            : 'border-slate-800 bg-slate-900/70 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 font-hud font-bold">
                        <span>
                          {s.depthRangeCm} · {extracted || active ? s.name : 'Unexplored Layer'}
                        </span>
                        {extracted && (
                          <span className="font-mono-tech text-[10px] text-cyan-300">
                            {s.icePct}% H₂O
                          </span>
                        )}
                      </div>
                      {(extracted || active) && (
                        <p className="mt-0.5 text-[10px] leading-tight text-slate-300">
                          {s.mineralNote}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
