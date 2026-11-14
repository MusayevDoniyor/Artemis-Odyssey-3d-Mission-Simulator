import { FastForward, Pause, Rocket, Volume2, VolumeX } from 'lucide-react';
import { PHYSICS } from '../game/constants';
import type { LaunchState } from '../game/types';

interface LaunchHUDProps {
  launch: LaunchState;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onSeparateStage: () => void;
  onSkipToSpace: () => void;
}

export function LaunchHUD({
  launch,
  muted,
  onToggleMute,
  onPause,
  onSeparateStage,
  onSkipToSpace,
}: LaunchHUDProps) {
  const speedTotal = Math.round(Math.hypot(launch.verticalSpeedMs, launch.horizontalSpeedMs));
  const stageLabel = launch.coreSeparated
    ? 'Stage 3 · Upper ICPS Burn'
    : launch.srbSeparated
      ? 'Stage 2 · Core Stage Burn'
      : 'Stage 1 · Core + Twin SRBs';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Compact Telemetry Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-4 rounded-xl px-4 py-2 text-xs">
          <div>
            <span className="block text-[10px] font-bold text-sky-300 uppercase">Stage</span>
            <span className="font-display font-bold text-white">{stageLabel}</span>
          </div>
          <div className="h-6 w-px bg-slate-700" />
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Altitude</span>
            <span className="font-mono-tech text-sm font-bold text-white">
              {launch.altitudeKm.toFixed(1)} / {PHYSICS.SLS_ORBIT_TARGET_KM} km
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Velocity</span>
            <span className="font-mono-tech text-sm font-bold text-sky-300">{speedTotal} m/s</span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Pitch</span>
            <span className="font-mono-tech text-sm font-bold text-amber-300">
              {Math.round(launch.pitchDeg)}°
            </span>
          </div>
          <div>
            <span className="block text-[10px] font-bold text-slate-400 uppercase">Propellant</span>
            <span className="font-mono-tech text-sm font-bold text-emerald-300">
              {Math.round(launch.fuelPct)}%
            </span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onSkipToSpace}
            className="hud-panel inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400"
          >
            <FastForward className="h-3.5 w-3.5 text-sky-300" />
            Skip to Space
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="hud-panel rounded-lg p-2 text-slate-200 hover:border-sky-400"
            title="Mute [M]"
          >
            {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-sky-300" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            className="hud-panel rounded-lg p-2 text-slate-200 hover:border-sky-400"
            title="Pause [Esc]"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom Action & Controls Dock */}
      <div className="mx-auto flex flex-col items-center gap-2.5">
        {launch.stagePrompt && (
          <button
            type="button"
            onClick={onSeparateStage}
            className="pointer-events-auto rounded-xl bg-amber-500 px-5 py-2.5 font-display text-sm font-bold text-slate-950 shadow-lg hover:bg-amber-400"
          >
            {launch.stagePrompt === 'SRB_SEP'
              ? 'PRESS [SPACE] TO SEPARATE BOOSTERS!'
              : 'PRESS [SPACE] TO SEPARATE CORE STAGE!'}
          </button>
        )}

        <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2.5 rounded-xl px-4 py-2.5">
          {!launch.ignited ? (
            <button
              type="button"
              data-hold-keys="forward"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 font-display text-sm font-bold text-slate-950 hover:bg-amber-400"
            >
              <Rocket className="h-4 w-4" />
              IGNITE ENGINES <span className="keycap">W</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                data-hold-keys="left"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-sky-400"
              >
                <span className="keycap mr-1.5">A</span> Pitch Left
              </button>
              <button
                type="button"
                data-hold-keys="forward"
                className="rounded-lg bg-sky-500/20 px-4 py-1.5 text-xs font-bold text-sky-100 ring-1 ring-sky-400/50"
              >
                <span className="keycap mr-1.5">W</span> Full Thrust
              </button>
              <button
                type="button"
                data-hold-keys="right"
                className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-sky-400"
              >
                Pitch Right <span className="keycap ml-1.5">D</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
