import { Navigation, Pause, Shield, ShieldAlert, Volume2, VolumeX, Zap } from 'lucide-react';
import { SOLAR_TARGETS } from '../game/constants';
import type { ResourceState, SpaceFlightState, SpaceTargetId } from '../game/types';

interface SpaceFlightHUDProps {
  space: SpaceFlightState;
  resources: ResourceState;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onSelectTarget: (id: SpaceTargetId) => void;
  onToggleAutoPilot: () => void;
  onToggleShieldBoost: () => void;
  onEnterLunarOrbit: () => void;
}

export function SpaceFlightHUD({
  space,
  resources,
  muted,
  onToggleMute,
  onPause,
  onSelectTarget,
  onToggleAutoPilot,
  onToggleShieldBoost,
  onEnterLunarOrbit,
}: SpaceFlightHUDProps) {
  const activeTarget = SOLAR_TARGETS[space.targetId];
  const distToTarget = Math.hypot(activeTarget.x - space.shipX, activeTarget.z - space.shipZ);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Bar: Destination Selector + Resources + Pause/Mute */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="hud-panel pointer-events-auto rounded-xl p-2.5">
          <div className="mb-1.5 flex items-center gap-2 text-[10px] font-bold tracking-wider text-sky-300 uppercase">
            <Navigation className="h-3.5 w-3.5" />
            Solar System Destination
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).map((id) => {
              const t = SOLAR_TARGETS[id];
              const active = space.targetId === id;
              const visited = space.visitedTargets.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onSelectTarget(id)}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                    active
                      ? 'bg-sky-500 text-slate-950'
                      : visited
                        ? 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                        : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400'
                  }`}
                >
                  {t.name.split(' · ')[0]} · {t.realDistanceLabel}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 max-w-md text-[11px] text-slate-200">{activeTarget.fact}</p>
        </div>

        <div className="flex items-start gap-2">
          <div className="hud-panel pointer-events-auto flex items-center gap-4 rounded-xl px-4 py-2 text-xs">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Power</span>
              <span className="font-mono-tech font-bold text-amber-300">{Math.round(resources.power)}%</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Shield</span>
              <span className="font-mono-tech font-bold text-emerald-300">{Math.round(resources.shield)}%</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Fuel</span>
              <span className="font-mono-tech font-bold text-sky-300">{Math.round(space.fuelPct)}%</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase">Range</span>
              <span className="font-mono-tech font-bold text-white">{Math.round(distToTarget)}u</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onToggleMute}
            className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-sky-400"
            title="Mute [M]"
          >
            {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-sky-300" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-sky-400"
            title="Pause [Esc]"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bottom Controls & Arrival Prompt */}
      <div className="mx-auto flex flex-col items-center gap-2.5">
        {space.inRadiationZone && (
          <div className="hud-panel-amber pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold text-amber-200">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            Solar Radiation Belt! Activate Storm Shield (trades Power) or steer away from the Sun.
          </div>
        )}

        {space.arrivedMoon && (
          <button
            type="button"
            onClick={onEnterLunarOrbit}
            className="pointer-events-auto rounded-xl bg-emerald-500 px-6 py-3 font-display text-sm font-bold text-slate-950 shadow-lg hover:bg-emerald-400"
          >
            LUNAR ORBIT CAPTURED — BEGIN MOON LANDING!
          </button>
        )}

        <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs">
          <button
            type="button"
            data-hold-keys="left"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100 hover:border-sky-400"
          >
            <span className="keycap mr-1">A</span> Left
          </button>
          <button
            type="button"
            data-hold-keys="forward"
            className="rounded-lg bg-sky-500/20 px-3.5 py-1.5 font-bold text-sky-100 ring-1 ring-sky-400/50"
          >
            <span className="keycap mr-1">W</span> Thrust
          </button>
          <button
            type="button"
            data-hold-keys="backward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100 hover:border-sky-400"
          >
            <span className="keycap mr-1">S</span> Brake
          </button>
          <button
            type="button"
            data-hold-keys="right"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100 hover:border-sky-400"
          >
            Right <span className="keycap ml-1">D</span>
          </button>
          <button
            type="button"
            data-hold-keys="forward,boost"
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-200"
          >
            <Zap className="h-3.5 w-3.5" />
            Boost <span className="keycap ml-1">Shift</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            onClick={onToggleAutoPilot}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              space.autoPilot
                ? 'bg-emerald-500 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-400'
            }`}
          >
            Auto-Pilot <span className="keycap ml-1">G</span>
          </button>

          <button
            type="button"
            onClick={onToggleShieldBoost}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition ${
              space.shieldBoostActive
                ? 'bg-sky-500 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Storm Shield
          </button>
        </div>
      </div>
    </div>
  );
}
