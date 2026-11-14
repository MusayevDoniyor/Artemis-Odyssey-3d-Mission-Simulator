import { Camera, Compass, Pause, Volume2, VolumeX } from 'lucide-react';
import { LANDING_ZONES, PHYSICS } from '../game/constants';
import { getLunarTerrainHeight } from '../game/physics';
import type { CameraMode, LandingGuidanceMode, LandingState } from '../game/types';

interface LandingHUDProps {
  landing: LandingState;
  cameraMode: CameraMode;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onCycleCamera: () => void;
  onSelectZone: (id: number) => void;
  onSetGuidance: (mode: LandingGuidanceMode) => void;
}

export function LandingHUD({
  landing,
  cameraMode,
  muted,
  onToggleMute,
  onPause,
  onCycleCamera,
  onSelectZone,
  onSetGuidance,
}: LandingHUDProps) {
  const groundH = getLunarTerrainHeight(landing.x, landing.z);
  const altM = Math.max(0, landing.y - groundH);
  const descentSpeed = Math.abs(landing.vy);
  const horizDrift = Math.hypot(landing.vx, landing.vz);
  const activeZone = LANDING_ZONES[landing.targetZoneId] || LANDING_ZONES[0];

  const vyColor =
    descentSpeed <= PHYSICS.LANDER_PERFECT_VY
      ? 'text-emerald-300'
      : descentSpeed <= PHYSICS.LANDER_HARD_VY
        ? 'text-amber-300'
        : 'text-rose-400';

  // Relative pad radar coordinates (-45..45 -> 0..100%)
  const relX = Math.max(-45, Math.min(45, landing.x - activeZone.x));
  const relZ = Math.max(-45, Math.min(45, landing.z - activeZone.z));

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Perimeter Telemetry + Zone Selector */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-4 rounded-xl px-4 py-2 text-xs">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase">Altitude</span>
            <span className="font-mono-tech text-base font-bold text-white">{altM.toFixed(1)} m</span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase">
              Descent (&lt;2.5 safe)
            </span>
            <span className={`font-mono-tech text-base font-bold ${vyColor}`}>
              {descentSpeed.toFixed(1)} m/s
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase">Drift</span>
            <span className="font-mono-tech text-base font-bold text-sky-300">
              {horizDrift.toFixed(1)} m/s
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase">Fuel</span>
            <span className="font-mono-tech text-base font-bold text-emerald-300">
              {Math.round(landing.fuelPct)}%
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase">Mass Load</span>
            <span className="font-mono-tech text-base font-bold text-amber-300">
              {landing.massMultiplier.toFixed(2)}×
            </span>
          </div>
        </div>

        {/* Landing Zones + Radar + Utility Buttons */}
        <div className="flex items-start gap-2.5">
          <div className="hud-panel pointer-events-auto flex items-center gap-2 rounded-xl p-2">
            {/* Compact Top-Down Pad Alignment Radar */}
            <div className="relative h-12 w-12 shrink-0 rounded-full border border-sky-400/50 bg-slate-950">
              <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-400/60" />
              <div
                className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400"
                style={{
                  left: `${50 + (relX / 45) * 42}%`,
                  top: `${50 + (relZ / 45) * 42}%`,
                }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1 text-[10px] font-bold text-sky-300 uppercase">
                <Compass className="h-3 w-3" />
                Target Zone ({Math.round(landing.distToPad)}m)
              </div>
              <div className="flex gap-1">
                {LANDING_ZONES.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => onSelectZone(z.id)}
                    className={`rounded px-2 py-1 text-[11px] font-bold transition ${
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
            className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400"
          >
            <Camera className="h-4 w-4 text-sky-300" />
            <span className="capitalize">{cameraMode}</span>
            <span className="keycap">C</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-sky-400"
          >
            {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-sky-300" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-sky-400"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Contact Light + Bottom Thruster Controls */}
      <div className="mx-auto flex flex-col items-center gap-2.5">
        {landing.contactLight && !landing.landed && (
          <div className="rounded-lg bg-sky-500 px-4 py-1.5 font-display text-xs font-bold tracking-wider text-slate-950">
            CONTACT LIGHT! CUT THROTTLE FOR SOFT TOUCHDOWN
          </div>
        )}

        <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs">
          <button
            type="button"
            data-hold-keys="forward,action"
            className="rounded-lg bg-amber-500 px-4 py-2 font-display text-xs font-bold text-slate-950 hover:bg-amber-400"
          >
            HOLD ENGINE <span className="keycap ml-1.5">W / Space</span>
          </button>
          <button
            type="button"
            data-hold-keys="left"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100"
          >
            <span className="keycap mr-1">A</span> Left
          </button>
          <button
            type="button"
            data-hold-keys="right"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100"
          >
            Right <span className="keycap ml-1">D</span>
          </button>
          <button
            type="button"
            data-hold-keys="backward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100"
          >
            Back <span className="keycap ml-1">S</span>
          </button>
          <button
            type="button"
            data-hold-keys="tiltForward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100"
          >
            Fwd <span className="keycap ml-1">Q</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            onClick={() =>
              onSetGuidance(landing.guidanceMode === 'RATE_ASSIST' ? 'MANUAL' : 'RATE_ASSIST')
            }
            className={`rounded-lg px-3 py-1.5 font-bold ${
              landing.guidanceMode === 'RATE_ASSIST'
                ? 'bg-sky-500 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200'
            }`}
          >
            Hover Assist
          </button>
          <button
            type="button"
            onClick={() =>
              onSetGuidance(landing.guidanceMode === 'AUTOLAND' ? 'MANUAL' : 'AUTOLAND')
            }
            className={`rounded-lg px-3 py-1.5 font-bold ${
              landing.guidanceMode === 'AUTOLAND'
                ? 'bg-emerald-500 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200'
            }`}
          >
            Auto-Land <span className="keycap ml-1">G</span>
          </button>
        </div>
      </div>
    </div>
  );
}
