import {
  Camera,
  CheckCircle2,
  Circle,
  Database,
  Lightbulb,
  Pause,
  Pickaxe,
  ShieldAlert,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { OutpostDecisionId } from '../game/physics';
import type {
  CameraMode,
  OutpostEvent,
  ResourceState,
  RoverDriveMode,
  RoverObjective,
  RoverState,
} from '../game/types';

interface RoverHUDProps {
  rover: RoverState;
  resources: ResourceState;
  objectives: RoverObjective[];
  activeEvent: OutpostEvent | null;
  nearestObjective: RoverObjective | null;
  cameraMode: CameraMode;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onCycleCamera: () => void;
  onSetDriveMode: (mode: RoverDriveMode) => void;
  onToggleClearance: () => void;
  onToggleHeadlights: () => void;
  onResolveEvent: (choice: OutpostDecisionId) => void;
  onOpenNasaModal: () => void;
}

const DRIVE_MODES: Array<{ id: RoverDriveMode; keyHint: string; label: string }> = [
  { id: 'DRIVE', keyHint: '1', label: 'Drive' },
  { id: 'CRAB', keyHint: '2', label: 'Crab' },
  { id: 'SPIN', keyHint: '3', label: 'Spin' },
  { id: 'WALKER', keyHint: '4', label: 'Walker Step' },
];

export function RoverHUD({
  rover,
  resources,
  objectives,
  activeEvent,
  nearestObjective,
  cameraMode,
  muted,
  onToggleMute,
  onPause,
  onCycleCamera,
  onSetDriveMode,
  onToggleClearance,
  onToggleHeadlights,
  onResolveEvent,
  onOpenNasaModal,
}: RoverHUDProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top Bar: Science Checklist (Left) + Outpost Resources & Utility (Right) */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Science Mission Checklist */}
        <div className="hud-panel pointer-events-auto max-w-xs rounded-xl p-3">
          <p className="mb-2 text-[10px] font-bold tracking-wider text-sky-300 uppercase">
            South Pole Science Missions
          </p>
          <div className="flex flex-col gap-1.5">
            {objectives.map((obj) => {
              const dist = Math.round(Math.hypot(obj.x - rover.x, obj.z - rover.z));
              return (
                <div
                  key={obj.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs ${
                    obj.completed ? 'bg-emerald-500/15 text-emerald-200' : 'bg-slate-900/80 text-slate-100'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {obj.completed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 text-sky-400" />
                    )}
                    {obj.title}
                  </span>
                  {!obj.completed && (
                    <span className="font-mono-tech text-[11px] font-bold text-amber-300">
                      {dist}m
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 3 Outpost Survival Resources + Tools */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="hud-panel pointer-events-auto flex items-center gap-4 rounded-xl px-4 py-2 text-xs">
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Power</span>
                <span className="font-mono-tech text-sm font-bold text-amber-300">
                  {Math.round(resources.power)}%
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Oxygen</span>
                <span className="font-mono-tech text-sm font-bold text-sky-300">
                  {Math.round(resources.oxygen)}%
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">Shield</span>
                <span className="font-mono-tech text-sm font-bold text-emerald-300">
                  {Math.round(resources.shield)}%
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-400 uppercase">H₂ Ice Signal</span>
                <span className="font-mono-tech text-sm font-bold text-white">
                  {rover.hydrogenSignal} ppm
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenNasaModal}
              className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-sky-200 hover:border-sky-400"
            >
              <Database className="h-4 w-4 text-sky-300" />
              NASA Data
            </button>

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

          {/* Solar Storm Outpost Engineering Trade-Off Decision Card */}
          {activeEvent && !activeEvent.resolvedChoice && (
            <div className="hud-panel-amber pointer-events-auto max-w-sm rounded-xl p-3.5">
              <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-amber-300">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                {activeEvent.title}
              </div>
              <p className="mb-2.5 text-xs leading-relaxed text-slate-200">
                {activeEvent.description}
              </p>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => onResolveEvent('boost-shield')}
                  className="rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-left text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25"
                >
                  Power Up Storm Shield (+26% Shield · -22% Power)
                </button>
                <button
                  type="button"
                  onClick={() => onResolveEvent('life-support')}
                  className="rounded-lg border border-sky-400/50 bg-sky-500/15 px-3 py-1.5 text-left text-xs font-semibold text-sky-100 hover:bg-sky-500/25"
                >
                  Boost O₂ Scrubber (+22% Oxygen · -16% Power · -10% Shield)
                </button>
                <button
                  type="button"
                  onClick={() => onResolveEvent('push-science')}
                  className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-left text-xs font-semibold text-amber-100 hover:bg-amber-500/25"
                >
                  Overdrive Ice Drill (+40% Drill Speed · -14% Power · -15% Shield)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Drill Prompt + Mobility & Driving Dock */}
      <div className="mx-auto flex flex-col items-center gap-2.5">
        {nearestObjective && !nearestObjective.completed && (
          <div className="hud-panel pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-2.5">
            <button
              type="button"
              data-hold-keys="action"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-display text-xs font-bold text-slate-950 hover:bg-amber-400"
            >
              <Pickaxe className="h-4 w-4" />
              HOLD [E / SPACE] TO DRILL {nearestObjective.siteName.toUpperCase()}
            </button>
            <div className="w-28">
              <div className="mb-1 flex justify-between font-mono-tech text-[11px] font-bold text-sky-200">
                <span>Core Sample</span>
                <span>{Math.round(nearestObjective.progress * 100)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full bg-sky-400 transition-all"
                  style={{ width: `${Math.round(nearestObjective.progress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs">
          {/* 4 Rover/Walker Drive Modes */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-950/70 p-1">
            {DRIVE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => onSetDriveMode(m.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-bold transition ${
                  rover.driveMode === m.id
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                [{m.keyHint}] {m.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            data-hold-keys="left"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-100"
          >
            <span className="keycap">A</span>
          </button>
          <button
            type="button"
            data-hold-keys="forward"
            className="rounded-lg bg-sky-500/20 px-3 py-1.5 font-bold text-sky-100 ring-1 ring-sky-400/50"
          >
            <span className="keycap mr-1">W</span> Move
          </button>
          <button
            type="button"
            data-hold-keys="backward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-100"
          >
            <span className="keycap">S</span>
          </button>
          <button
            type="button"
            data-hold-keys="right"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-semibold text-slate-100"
          >
            <span className="keycap">D</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            onClick={onToggleClearance}
            className={`rounded-lg px-2.5 py-1.5 font-semibold ${
              rover.highClearance
                ? 'bg-emerald-500 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200'
            }`}
          >
            Lift [F]
          </button>
          <button
            type="button"
            onClick={onToggleHeadlights}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-semibold ${
              rover.headlightsOn
                ? 'bg-amber-400 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200'
            }`}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            [L]
          </button>

          <span className="font-mono-tech pl-1 text-xs font-bold text-sky-300">
            {Math.abs(rover.speed).toFixed(1)} m/s
          </span>
        </div>
      </div>
    </div>
  );
}
