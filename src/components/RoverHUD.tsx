import {
  BookOpen,
  Camera,
  CheckCircle2,
  Database,
  DoorOpen,
  Eye,
  Pause,
  ShieldCheck,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { getRoverMissionProgress } from '../game/missionProgress';
import type {
  CameraMode,
  CampaignCarryoverState,
  InputState,
  MissionAnomaly,
  ResourceState,
  RoverDriveMode,
  RoverObjective,
  RoverState,
  TelemetrySpeedScale,
} from '../game/types';
import { getRoverWarnings } from '../game/warnings';
import { CameraViewControls } from './CameraViewControls';
import { MissionProgressBar } from './MissionProgressBar';
import { MissionTelemetryStrip } from './MissionTelemetryStrip';
import { MissionWarningBanner } from './MissionWarningBanner';
import { RoverSpeedometer } from './RoverSpeedometer';
import { SurfaceMapPanel } from './SurfaceMapPanel';

interface RoverHUDProps {
  rover: RoverState;
  roverInput: Pick<InputState, 'forward' | 'backward' | 'left' | 'right'>;
  resources: ResourceState;
  objectives: RoverObjective[];
  carryover: CampaignCarryoverState;
  activeAnomaly: MissionAnomaly | null;
  nearestObjective: RoverObjective | null;
  donkiFlareActive: boolean;
  cameraMode: CameraMode;
  mapExpanded: boolean;
  muted: boolean;
  speedScale: TelemetrySpeedScale;
  mastPanDeg: number;
  freeExploreMode: boolean;
  onToggleSpeedScale: () => void;
  onPanMast: (deltaDeg: number) => void;
  onResetMast: () => void;
  onOpenDrillConsole: (obj: RoverObjective) => void;
  onOpenOutpostConsole: () => void;
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
  onSetCameraPreset: (yaw: number, pitch: number) => void;
  onZoomCamera: (delta: number) => void;
  onResetCamera: () => void;
}

const DRIVE_MODES: Array<{ id: RoverDriveMode; keyHint: string; label: string }> = [
  { id: 'DRIVE', keyHint: '1', label: 'Drive' },
  { id: 'CRAB', keyHint: '2', label: 'Crab' },
  { id: 'SPIN', keyHint: '3', label: 'Spin' },
  { id: 'WALKER', keyHint: '4', label: 'Walker' },
];

export function RoverHUD({
  rover,
  roverInput,
  resources,
  objectives,
  carryover,
  activeAnomaly,
  nearestObjective,
  donkiFlareActive,
  cameraMode,
  mapExpanded,
  muted,
  speedScale,
  mastPanDeg,
  freeExploreMode,
  onToggleSpeedScale,
  onPanMast,
  onResetMast,
  onOpenDrillConsole,
  onOpenOutpostConsole,
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
  onSetCameraPreset,
  onZoomCamera,
  onResetCamera,
}: RoverHUDProps) {
  const [showTutorialRibbon, setShowTutorialRibbon] = useState(true);
  const isMars = rover.planet === 'mars';
  const missionProgress = getRoverMissionProgress(rover, objectives);
  const atBaseCamp = Math.hypot(rover.x + 15, rover.z + 13) <= 22;
  const isMoving =
    roverInput.forward || roverInput.backward || roverInput.left || roverInput.right;
  const wheelGlowTone = roverInput.backward ? 'amber' : isMars ? 'orange' : 'cyan';

  const completedCount = objectives.filter((o) => o.completed).length;
  const nextObj = objectives.find((o) => !o.completed);
  const distToNext = nextObj
    ? Math.round(Math.hypot(nextObj.x - rover.x, nextObj.z - rover.z))
    : 0;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      <div className="flex flex-col gap-2">
        <MissionProgressBar info={missionProgress} />

        <MissionTelemetryStrip
          context="rover"
          elapsedSec={Math.abs(rover.x) + Math.abs(rover.z) + completedCount * 14}
          phaseLabel={isMars ? 'JEZERO ROVER OPS' : 'VIPER POLAR OPS'}
          nextMilestone={
            nextObj
              ? `${nextObj.siteName} (${distToNext} m)`
              : 'All Core Samples Collected'
          }
          etaLabel={nextObj ? `${Math.max(5, Math.round(distToNext / 4))} s` : 'DONE'}
          metrics={[
            { label: 'Gravity', value: isMars ? '0.38 g' : '0.165 g', tone: 'cyan' },
            { label: 'Lag', value: isMars ? '14 min' : '1.3 s', tone: 'amber' },
            { label: 'Cores', value: `${completedCount}/${objectives.length}`, tone: 'emerald' },
            { label: 'Mast', value: `${mastPanDeg > 0 ? '+' : ''}${mastPanDeg}°`, tone: 'white' },
          ]}
        />

        {showTutorialRibbon && (
          <div
            data-testid="rover-tutorial-ribbon"
            className="hud-panel pointer-events-auto mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-500/35 px-3 py-1.5 text-[11px] text-slate-200"
          >
            <div className="flex flex-wrap items-center gap-3 font-mono-tech">
              <span className="font-bold text-cyan-300 uppercase">Surface Checklist:</span>
              <span>1. Drive [WASD]</span>
              <span>2. Pan Mast [Q / Buttons]</span>
              <span>3. Open TRIDENT Drill</span>
              <span>4. Enter Base Camp Airlock</span>
            </div>
            <button
              type="button"
              onClick={() => setShowTutorialRibbon(false)}
              className="inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-hud text-[10px] font-bold text-slate-300 hover:border-cyan-400"
            >
              <X className="h-3 w-3" />
              Skip Tutorial
            </button>
          </div>
        )}

        <MissionWarningBanner warnings={getRoverWarnings(rover, resources, donkiFlareActive)} />

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
                {freeExploreMode ? ' · FREE EXPLORE' : ''}
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
                          ? 'bg-emerald-950/90 text-emerald-200'
                          : 'bg-slate-900/95 text-slate-100'
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

            {/* Interactive Topographic Surface Map (±260m Moon / Mars) */}
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
              <div className="hud-panel pointer-events-auto flex items-center gap-3.5 rounded-xl px-4 py-2 text-xs tabular-nums">
                <div>
                  <span className="block font-hud text-[10px] text-slate-400 uppercase">Power</span>
                  <span className="font-mono-tech text-sm font-bold text-amber-300">
                    {Math.round(resources.power)}%
                  </span>
                </div>
                <div>
                  <span className="block font-hud text-[10px] text-slate-400 uppercase">Air / O₂</span>
                  <span className="font-mono-tech text-sm font-bold text-sky-300">
                    {Math.round(resources.oxygen)}%
                  </span>
                </div>
                <div>
                  <span className="block font-hud text-[10px] text-slate-400 uppercase">Shielding</span>
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
                data-testid="open-outpost-console-btn"
                onClick={onOpenOutpostConsole}
                className={`pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 font-hud text-xs font-bold ${
                  atBaseCamp
                    ? 'border-emerald-400 bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'hud-panel text-emerald-200 hover:border-emerald-400'
                }`}
              >
                <DoorOpen className="h-4 w-4" />
                {atBaseCamp ? 'Enter Base Airlock' : 'Base Camp Console'}
              </button>

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
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
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
                aria-label="Pause mission"
                onClick={onPause}
                className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-sky-400"
              >
                <Pause className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {atBaseCamp && (
                <div
                  data-testid="basecamp-shelter-badge"
                  className="pointer-events-auto inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/70 bg-emerald-950/95 px-2.5 py-1 font-hud text-[10px] font-bold tracking-wider text-emerald-200 uppercase"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  Sheltered at Base Camp (+PWR · +O₂ · +SHD)
                </div>
              )}

              {/* Stereo Mast Pan Controls */}
              <div className="hud-panel pointer-events-auto flex items-center gap-1 rounded-lg px-2 py-1 text-[11px]">
                <Eye className="h-3.5 w-3.5 text-cyan-300" />
                <span className="font-hud text-[10px] font-bold text-slate-300 uppercase">Mast</span>
                <button
                  type="button"
                  onClick={() => onPanMast(-15)}
                  className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-slate-200 hover:border-cyan-400"
                >
                  -15°
                </button>
                <button
                  type="button"
                  onClick={onResetMast}
                  className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-cyan-300 hover:border-cyan-400"
                >
                  {mastPanDeg > 0 ? `+${mastPanDeg}°` : `${mastPanDeg}°`}
                </button>
                <button
                  type="button"
                  onClick={() => onPanMast(15)}
                  className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-slate-200 hover:border-cyan-400"
                >
                  +15°
                </button>
              </div>

              <CameraViewControls
                compact
                onSelectPreset={onSetCameraPreset}
                onZoom={onZoomCamera}
                onReset={onResetCamera}
              />
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
                      className="rounded-lg border border-cyan-500/25 bg-slate-950/95 px-3 py-1.5 text-left text-xs font-semibold text-slate-100 transition hover:border-amber-400"
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
          <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-xl px-4 py-2.5">
            <button
              type="button"
              data-hold-keys="action"
              className="rounded-lg bg-amber-500 px-4 py-2 font-display text-xs font-bold whitespace-nowrap text-slate-950 uppercase hover:bg-amber-400"
            >
              HOLD [E / SPACE] · SAMPLE {nearestObjective.siteName.toUpperCase()}
            </button>
            <button
              type="button"
              data-testid="open-drill-console-btn"
              onClick={() => onOpenDrillConsole(nearestObjective)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-cyan-500/20 px-3 py-2 font-display text-xs font-bold whitespace-nowrap text-cyan-200 uppercase hover:bg-cyan-500/30"
            >
              <Wrench className="h-3.5 w-3.5" />
              Open TRIDENT Drill Console
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

        <RoverSpeedometer
          rover={rover}
          speedScale={speedScale}
          onToggleSpeedScale={onToggleSpeedScale}
        />

        <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs">
          {/* 4 Rover/Walker Drive Modes */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-950/95 p-1">
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

          {/* 4-Wheel Drive & Thruster Glow Indicator */}
          <div
            data-testid="rover-wheel-glow-pod"
            data-moving={isMoving ? 'true' : 'false'}
            aria-label="Rover Wheel Torque Status"
            className="relative flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-950/95 px-2.5 py-1"
          >
            <div className="relative grid grid-cols-2 gap-x-2.5 gap-y-1.5">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 rounded-xs bg-slate-700/80"
              />
              {(['FL', 'FR', 'RL', 'RR'] as const).map((wheelId) => {
                const isFront = wheelId === 'FL' || wheelId === 'FR';
                const isLeftWheel = wheelId === 'FL' || wheelId === 'RL';
                const steerBoost =
                  (roverInput.left && isLeftWheel) || (roverInput.right && !isLeftWheel);
                const glowBg =
                  wheelGlowTone === 'amber'
                    ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
                    : wheelGlowTone === 'orange'
                      ? 'bg-orange-400 shadow-[0_0_12px_rgba(251,146,60,0.9)]'
                      : 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)]';

                return (
                  <span
                    key={wheelId}
                    className={`relative z-10 h-2.5 w-1.5 rounded-xs border border-slate-600 bg-slate-800 transition-transform duration-150 ${
                      isFront && roverInput.left
                        ? '-rotate-12'
                        : isFront && roverInput.right
                          ? 'rotate-12'
                          : rover.driveMode === 'CRAB' && (roverInput.left || roverInput.right)
                            ? roverInput.left
                              ? '-rotate-45'
                              : 'rotate-45'
                            : ''
                    }`}
                  >
                    <span
                      className={`pointer-events-none absolute -inset-1 rounded-sm transition-opacity duration-200 ${glowBg} ${
                        isMoving
                          ? steerBoost
                            ? 'rover-wheel-glow-active opacity-100'
                            : 'rover-wheel-glow-active opacity-85'
                          : 'opacity-0'
                      }`}
                    />
                  </span>
                );
              })}
            </div>
            <span
              className={`font-mono-tech text-[10px] font-bold tracking-wider uppercase transition-opacity duration-200 ${
                isMoving
                  ? wheelGlowTone === 'amber'
                    ? 'text-amber-300 opacity-100'
                    : wheelGlowTone === 'orange'
                      ? 'text-orange-300 opacity-100'
                      : 'text-cyan-300 opacity-100'
                  : 'text-slate-500 opacity-75'
              }`}
            >
              {isMoving ? (roverInput.backward ? 'REV' : 'TORQ') : 'IDLE'}
            </span>
          </div>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            data-hold-keys="left"
            className={`rounded-lg border px-2.5 py-1.5 font-semibold transition ${
              roverInput.left
                ? 'border-cyan-400 bg-cyan-500/25 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                : 'border-slate-700 bg-slate-900 text-slate-100'
            }`}
          >
            <span className="keycap">A</span>
          </button>
          <button
            type="button"
            data-hold-keys="forward"
            className={`rounded-lg px-3 py-1.5 font-bold ring-1 transition ${
              roverInput.forward
                ? 'bg-cyan-500/35 text-white ring-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.35)]'
                : 'bg-sky-500/20 text-sky-100 ring-sky-400/50'
            }`}
          >
            <span className="keycap mr-1">W</span> Move
          </button>
          <button
            type="button"
            data-hold-keys="backward"
            className={`rounded-lg border px-2.5 py-1.5 font-semibold transition ${
              roverInput.backward
                ? 'border-amber-400 bg-amber-500/25 text-amber-100 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'border-slate-700 bg-slate-900 text-slate-100'
            }`}
          >
            <span className="keycap">S</span>
          </button>
          <button
            type="button"
            data-hold-keys="right"
            className={`rounded-lg border px-2.5 py-1.5 font-semibold transition ${
              roverInput.right
                ? 'border-cyan-400 bg-cyan-500/25 text-white shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                : 'border-slate-700 bg-slate-900 text-slate-100'
            }`}
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
