import { Camera, Compass, Flame, Pause, Volume2, VolumeX } from 'lucide-react';
import { PHYSICS, getLandingZones } from '../game/constants';
import { getSurfaceTerrainHeight } from '../game/physics';
import type { CameraMode, LandingGuidanceMode, LandingState } from '../game/types';

interface LandingHUDProps {
  landing: LandingState;
  isruFuelBonusPct: number;
  cameraMode: CameraMode;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onCycleCamera: () => void;
  onSelectZone: (id: number) => void;
  onSetGuidance: (mode: LandingGuidanceMode) => void;
  onSetThrottlePct: (pct: number) => void;
  onCutoffEngine: () => void;
  onMatchHover: () => void;
}

export function LandingHUD({
  landing,
  isruFuelBonusPct,
  cameraMode,
  muted,
  onToggleMute,
  onPause,
  onCycleCamera,
  onSelectZone,
  onSetGuidance,
  onSetThrottlePct,
  onCutoffEngine,
  onMatchHover,
}: LandingHUDProps) {
  const zones = getLandingZones(landing.planet);
  const groundH = getSurfaceTerrainHeight(landing.planet, landing.x, landing.z);
  const altM = Math.max(0, landing.y - groundH);
  const descentSpeed = Math.abs(landing.vy);
  const horizDrift = Math.hypot(landing.vx, landing.vz);
  const activeZone = zones[landing.targetZoneId] || zones[0];
  const isMars = landing.planet === 'mars';
  const throttlePct = Math.round(landing.throttle * 100);
  const targetPct = Math.round(landing.targetThrottle * 100);

  const vyColor =
    descentSpeed <= PHYSICS.LANDER_PERFECT_VY
      ? 'text-emerald-300'
      : descentSpeed <= PHYSICS.LANDER_HARD_VY
        ? 'text-amber-300'
        : 'text-rose-400';

  const twrColor =
    landing.twr >= 1.1
      ? 'text-emerald-300'
      : landing.twr >= 0.85
        ? 'text-amber-300'
        : 'text-rose-300';

  const relX = Math.max(-45, Math.min(45, landing.x - activeZone.x));
  const relZ = Math.max(-45, Math.min(45, landing.z - activeZone.z));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Perimeter Telemetry + Zone Selector */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-4 rounded-xl px-4 py-2.5 text-xs">
          <div>
            <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
              {isMars ? 'MARS · 0.38g EDL' : 'MOON · 0.165g EDL'}
            </span>
            <span
              className={`font-display text-sm font-bold ${
                landing.descentPhase === 'TERMINAL'
                  ? 'text-emerald-300'
                  : landing.descentPhase === 'APPROACH'
                    ? 'text-cyan-300'
                    : 'text-amber-300'
              }`}
            >
              {landing.descentPhase}
            </span>
          </div>
          <div>
            <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
              Radar Alt
            </span>
            <span className="font-mono-tech text-base font-bold text-white">{altM.toFixed(1)} m</span>
          </div>
          <div>
            <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
              Sink (&lt;2.5 safe)
            </span>
            <span className={`font-mono-tech text-base font-bold ${vyColor}`}>
              {descentSpeed.toFixed(1)} m/s
            </span>
          </div>
          <div>
            <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
              Lat Drift
            </span>
            <span className="font-mono-tech text-base font-bold text-cyan-300">
              {horizDrift.toFixed(1)} m/s
            </span>
          </div>
          <div>
            <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
              Propellant {isruFuelBonusPct > 0 ? `(+${isruFuelBonusPct}% ISRU)` : ''}
            </span>
            <span className="font-mono-tech text-base font-bold text-emerald-300">
              {Math.round(landing.fuelPct)}%
            </span>
          </div>
          <div>
            <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
              Thrust / TWR
            </span>
            <span className={`font-mono-tech text-base font-bold ${twrColor}`}>
              {landing.thrustKn.toFixed(1)} kN · {landing.twr.toFixed(2)}×
            </span>
          </div>
        </div>

        {/* Landing Zones + Radar + Utility Buttons */}
        <div className="flex items-start gap-2.5">
          <div className="hud-panel pointer-events-auto flex items-center gap-2 rounded-xl p-2">
            <div className="relative h-12 w-12 shrink-0 rounded-full border border-cyan-400/50 bg-slate-950">
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/60" />
              <div
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400"
                style={{
                  left: `${50 + (relX / 45) * 42}%`,
                  top: `${50 + (relZ / 45) * 42}%`,
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 font-hud text-[10px] font-bold text-cyan-300 uppercase">
                <Compass className="h-3 w-3" />
                {activeZone.name} ({Math.round(landing.distToPad)}m)
              </div>
              <div className="flex gap-1">
                {zones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => onSelectZone(z.id)}
                    className={`rounded px-2 py-1 font-hud text-[11px] font-bold whitespace-nowrap transition ${
                      landing.targetZoneId === z.id
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    [{z.id + 1}] {z.code.replace('PAD ', '').replace('ZONE ', '')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onCycleCamera}
            className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold whitespace-nowrap text-slate-200 hover:border-cyan-400"
          >
            <Camera className="h-4 w-4 text-cyan-300" />
            <span className="capitalize">{cameraMode}</span>
            <span className="keycap">C</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-cyan-400"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-slate-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-cyan-300" />
            )}
          </button>

          <button
            type="button"
            onClick={onPause}
            className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-cyan-400"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Contact Light + NASA DPS / MLE Engine Pressure Console & Attitude Bar */}
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2">
        {landing.contactLight && !landing.landed && (
          <div className="rounded-lg border border-cyan-300 bg-cyan-400 px-4 py-1 font-display text-xs font-bold tracking-wider text-slate-950 uppercase shadow-lg">
            CONTACT LIGHT · PRESS [X] TO CUT ENGINE FOR SOFT TOUCHDOWN
          </div>
        )}

        {/* Engine Chamber Pressure Bar + Quick Presets */}
        <div className="hud-panel pointer-events-auto flex w-full flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <div>
              <span className="block font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {isMars ? 'MLE Chamber Pressure' : 'LMDE Pintle Throttle'}
              </span>
              <span className="font-mono-tech text-sm font-bold text-amber-300">
                {throttlePct}%{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  (Cmd {targetPct}% · Hover {landing.hoverThrottlePct}%)
                </span>
              </span>
            </div>
          </div>

          {/* Interactive Throttle Bar with NASA 10–60% Band & Hover Marker */}
          <div className="relative flex min-w-[200px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
                {/* Hover equilibrium marker */}
                <div
                  className="absolute top-0 z-10 h-full w-0.5 bg-emerald-300"
                  style={{ left: `${landing.hoverThrottlePct}%` }}
                  title={`Hover Equilibrium: ${landing.hoverThrottlePct}%`}
                />
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 transition-all"
                  style={{ width: `${throttlePct}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={throttlePct}
                aria-label="Engine Chamber Throttle Percentage"
                onChange={(e) => onSetThrottlePct(Number(e.target.value))}
                className="absolute inset-0 h-2.5 w-full cursor-pointer opacity-0"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onCutoffEngine}
              className="rounded-md border border-rose-400/50 bg-rose-500/15 px-2.5 py-1 font-hud text-[11px] font-bold text-rose-200 uppercase hover:bg-rose-500/25"
            >
              Cut 0% [X]
            </button>
            <button
              type="button"
              onClick={() => onSetThrottlePct(10)}
              className="rounded-md border border-cyan-500/35 bg-slate-900 px-2.5 py-1 font-hud text-[11px] font-bold text-cyan-200 uppercase hover:border-cyan-400"
            >
              Idle 10%
            </button>
            <button
              type="button"
              onClick={onMatchHover}
              className="rounded-md border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-1 font-hud text-[11px] font-bold text-emerald-200 uppercase hover:bg-emerald-500/25"
            >
              Hover {landing.hoverThrottlePct}% [H]
            </button>
            <button
              type="button"
              onClick={() => onSetThrottlePct(100)}
              className="rounded-md border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 font-hud text-[11px] font-bold text-amber-200 uppercase hover:bg-amber-500/30"
            >
              Max 100%
            </button>
          </div>
        </div>

        {/* Attitude & Guidance Controls */}
        <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs">
          <button
            type="button"
            data-hold-keys="forward"
            className="rounded-lg bg-amber-500 px-3 py-1.5 font-display text-xs font-bold whitespace-nowrap text-slate-950 uppercase hover:bg-amber-400"
          >
            Thrust + <span className="keycap ml-1">W</span>
          </button>
          <button
            type="button"
            data-hold-keys="throttleDown"
            className="rounded-lg border border-cyan-500/35 bg-slate-900 px-3 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            Thrust − <span className="keycap ml-1">Z</span>
          </button>
          <button
            type="button"
            data-hold-keys="action"
            className="rounded-lg border border-amber-400/60 bg-amber-500/20 px-3 py-1.5 font-hud font-bold whitespace-nowrap text-amber-200 hover:bg-amber-500/30"
          >
            Max Brake <span className="keycap ml-1">SPACE</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            data-hold-keys="left"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            <span className="keycap mr-1">A</span>Left
          </button>
          <button
            type="button"
            data-hold-keys="right"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            Right<span className="keycap ml-1">D</span>
          </button>
          <button
            type="button"
            data-hold-keys="backward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            Back<span className="keycap ml-1">S</span>
          </button>
          <button
            type="button"
            data-hold-keys="tiltForward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            Fwd<span className="keycap ml-1">Q</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            onClick={() =>
              onSetGuidance(landing.guidanceMode === 'RATE_ASSIST' ? 'MANUAL' : 'RATE_ASSIST')
            }
            className={`rounded-lg px-3 py-1.5 font-hud font-bold whitespace-nowrap ${
              landing.guidanceMode === 'RATE_ASSIST'
                ? 'bg-cyan-400 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400'
            }`}
          >
            Hover Assist
          </button>
          <button
            type="button"
            onClick={() =>
              onSetGuidance(landing.guidanceMode === 'AUTOLAND' ? 'MANUAL' : 'AUTOLAND')
            }
            className={`rounded-lg px-3 py-1.5 font-hud font-bold whitespace-nowrap ${
              landing.guidanceMode === 'AUTOLAND'
                ? 'bg-emerald-400 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-400'
            }`}
          >
            Auto-Land <span className="keycap ml-1">G</span>
          </button>
        </div>
      </div>
    </div>
  );
}
