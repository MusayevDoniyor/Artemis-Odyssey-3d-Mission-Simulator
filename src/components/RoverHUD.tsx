import { BookOpen, Camera, CheckCircle2, Database, Pause, Volume2, VolumeX } from 'lucide-react';
import { getRoverMissionProgress } from '../game/missionProgress';
import type {
  CameraMode,
  CampaignCarryoverState,
  MissionAnomaly,
  ResourceState,
  RoverDriveMode,
  RoverObjective,
  RoverState,
} from '../game/types';
import { MissionProgressBar } from './MissionProgressBar';
import { RoverSpeedometer } from './RoverSpeedometer';
import { SurfaceMapPanel } from './SurfaceMapPanel';

interface RoverHUDProps {
  rover: RoverState;
  resources: ResourceState;
  objectives: RoverObjective[];
  carryover: CampaignCarryoverState;
  activeAnomaly: MissionAnomaly | null;
  nearestObjective: RoverObjective | null;
  cameraMode: CameraMode;
  mapExpanded: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onToggleMap: () => void;
  onPause: () => void;
  onCycleCamera: () => void;
  onSetDriveMode: (mode: RoverDriveMode) => void;
  onToggleClearance: () => void;
  onToggleHeadlights: () => void;
  onResolveAnomaly: (anomalyId: string, choiceId: string) => void;
  onOpenNasaModal: () => void;
  onOpenNotebook: () => void;
}

const DRIVE_MODES: Array<{ id: RoverDriveMode; keyHint: string; label: string }> = [
  { id: 'DRIVE', keyHint: '1', label: 'Drive' },
  { id: 'CRAB', keyHint: '2', label: 'Crab' },
  { id: 'SPIN', keyHint: '3', label: 'Spin' },
  { id: 'WALKER', keyHint: '4', label: 'Walker' },
];

export function RoverHUD({
  rover,
  resources,
  objectives,
  carryover,
  activeAnomaly,
  nearestObjective,
  cameraMode,
  mapExpanded,
  muted,
  onToggleMute,
  onToggleMap,
  onPause,
  onCycleCamera,
  onSetDriveMode,
  onToggleClearance,
  onToggleHeadlights,
  onResolveAnomaly,
  onOpenNasaModal,
  onOpenNotebook,
}: RoverHUDProps) {
  const isMars = rover.planet === 'mars';
  const missionProgress = getRoverMissionProgress(rover, objectives);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      <div className="flex flex-col gap-2.5">
        <MissionProgressBar info={missionProgress} />

        {/* Top Bar: Science Checklist + Interactive Topographic Map (Left) | Resources & Anomaly (Right) */}
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col items-start gap-2.5">
          {/* Science Mission Checklist */}
          <div className="hud-panel pointer-events-auto max-w-xs rounded-xl p-3">
            <p
              className={`mb-2 font-hud text-[10px] font-bold tracking-wider uppercase ${
                isMars ? 'text-orange-300' : 'text-cyan-300'
              }`}
            >
              {isMars ? 'Jezero Crater · 0.38g' : 'South Pole · 0.165g'}
            </p>
            <div className="flex flex-col gap-1.5">
              {objectives.map((obj) => {
                const dist = Math.round(Math.hypot(obj.x - rover.x, obj.z - rover.z));
                const hex = `#${obj.color.toString(16).padStart(6, '0')}`;
                return (
                  <div
                    key={obj.id}
                    className={`flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-xs ${
                      obj.completed
                        ? 'bg-emerald-500/15 text-emerald-200'
                        : 'bg-slate-900/80 text-slate-100'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 font-hud font-semibold">
                      {obj.completed ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <span
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: hex }}
                        />
                      )}
                      {obj.siteName}
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

          {/* Interactive Topographic Surface Map (±138m Moon / Mars) */}
          <SurfaceMapPanel
            planet={rover.planet}
            rover={rover}
            objectives={objectives}
            relayOnline={carryover.relaySatelliteOnline}
            expanded={mapExpanded}
            onToggleExpand={onToggleMap}
          />
        </div>

        {/* Right: Outpost Survival Resources + Tools + Applied Knowledge Anomaly */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="hud-panel pointer-events-auto flex items-center gap-3.5 rounded-xl px-4 py-2 text-xs">
              <div>
                <span className="block font-hud text-[10px] text-slate-400 uppercase">Power</span>
                <span className="font-mono-tech text-sm font-bold text-amber-300">
                  {Math.round(resources.power)}%
                </span>
              </div>
              <div>
                <span className="block font-hud text-[10px] text-slate-400 uppercase">Oxygen</span>
                <span className="font-mono-tech text-sm font-bold text-sky-300">
                  {Math.round(resources.oxygen)}%
                </span>
              </div>
              <div>
                <span className="block font-hud text-[10px] text-slate-400 uppercase">Shield</span>
                <span className="font-mono-tech text-sm font-bold text-emerald-300">
                  {Math.round(resources.shield)}%
                </span>
              </div>
              <div>
                <span className="block font-hud text-[10px] text-slate-400 uppercase">
                  {isMars ? 'Biosig' : 'H₂ Ice'}
                </span>
                <span className="font-mono-tech text-sm font-bold text-white">
                  {rover.hydrogenSignal} ppm
                </span>
              </div>
              {isMars && (
                <div>
                  <span className="block font-hud text-[10px] text-slate-400 uppercase">Dust</span>
                  <span className="font-mono-tech text-sm font-bold text-orange-300">
                    {Math.round(rover.dustAccumulationPct)}%
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onOpenNotebook}
              className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-hud text-xs font-bold text-amber-200 hover:border-amber-400"
            >
              <BookOpen className="h-4 w-4 text-amber-300" />
              Ledger ({carryover.unlockedFieldNotes.length})
            </button>

            <button
              type="button"
              onClick={onOpenNasaModal}
              className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-hud text-xs font-bold text-sky-200 hover:border-sky-400"
            >
              <Database className="h-4 w-4 text-sky-300" />
              NASA Data
            </button>

            <button
              type="button"
              onClick={onCycleCamera}
              className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-hud text-xs font-bold text-slate-200 hover:border-sky-400"
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
              {muted ? (
                <VolumeX className="h-4 w-4 text-slate-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-sky-300" />
              )}
            </button>

            <button
              type="button"
              onClick={onPause}
              className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-sky-400"
            >
              <Pause className="h-4 w-4" />
            </button>
          </div>

          {/* Applied Knowledge Crisis Trade-Off Card */}
          {activeAnomaly && !activeAnomaly.resolvedChoiceId && (
            <div
              data-testid="rover-anomaly-card"
              className="hud-panel-amber tactical-frame animate-modal-enter pointer-events-auto max-w-sm rounded-xl p-3.5"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold text-amber-300 uppercase">
                  {activeAnomaly.title}
                </span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono-tech text-[9px] font-bold text-amber-200">
                  ALERT
                </span>
              </div>
              <p className="mb-1 font-mono-tech text-[10px] font-semibold text-cyan-300">
                {activeAnomaly.nasaRef}
              </p>
              <p className="mb-2.5 text-xs text-slate-200">{activeAnomaly.context}</p>
              <div className="flex flex-col gap-1.5">
                {activeAnomaly.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => onResolveAnomaly(activeAnomaly.id, choice.id)}
                    className="rounded-lg border border-cyan-500/25 bg-slate-950/85 px-3 py-1.5 text-left text-xs font-semibold text-slate-100 transition hover:border-amber-400"
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Bottom: Drill Prompt + Center-Bottom VIPER Speedometer + Mobility & Driving Dock */}
      <div className="mx-auto flex flex-col items-center gap-2">
        {nearestObjective && !nearestObjective.completed && (
          <div className="hud-panel pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-2.5">
            <button
              type="button"
              data-hold-keys="action"
              className="rounded-lg bg-amber-500 px-4 py-2 font-display text-xs font-bold whitespace-nowrap text-slate-950 uppercase hover:bg-amber-400"
            >
              HOLD [E / SPACE] · SAMPLE {nearestObjective.siteName.toUpperCase()}
            </button>
            <div className="w-28">
              <div className="mb-1 flex justify-between font-mono-tech text-[11px] font-bold text-sky-200">
                <span>Core</span>
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

        <RoverSpeedometer rover={rover} />

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
            className={`rounded-lg px-2.5 py-1.5 font-semibold ${
              rover.headlightsOn
                ? 'bg-amber-400 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200'
            }`}
          >
            Lights [L]
          </button>
        </div>
      </div>
    </div>
  );
}
