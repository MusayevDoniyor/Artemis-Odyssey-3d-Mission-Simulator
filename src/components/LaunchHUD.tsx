import {
  CheckCircle2,
  Compass,
  Database,
  FastForward,
  Gauge,
  Pause,
  Play,
  Rocket,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { LAUNCH_PART_DETAILS, PHYSICS } from '../game/constants';
import { getLaunchMissionProgress } from '../game/missionProgress';
import type { GamePhase, LaunchState, ResourceState } from '../game/types';
import { getLaunchWarnings } from '../game/warnings';
import { CameraViewControls } from './CameraViewControls';
import { MissionProgressBar } from './MissionProgressBar';
import { MissionWarningBanner } from './MissionWarningBanner';
import { NASAInsignia } from './NASAInsignia';

interface LaunchHUDProps {
  launch: LaunchState;
  resources: ResourceState;
  selectedPartId?: string | null;
  onClearSelectedPart?: () => void;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onResetLaunch: () => void;
  onBeginSimulation: () => void;
  onStartLaunch: () => void;
  onSeparateStage: () => void;
  onToggleAutoGuidance: () => void;
  onSkipToSpace: () => void;
  onJumpToPhase: (phase: GamePhase) => void;
  onOpenNasaModal: () => void;
  onSetCameraPreset: (yaw: number, pitch: number) => void;
  onZoomCamera: (delta: number) => void;
  onResetCamera: () => void;
}

const STAGE_TABS: Array<{ id: GamePhase; label: string }> = [
  { id: 'briefing', label: '1. Payload' },
  { id: 'launch', label: '2. Launch' },
  { id: 'landing', label: '3. Landing' },
  { id: 'rover', label: '4. Rover' },
];

function formatMissionTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const mm = String(Math.floor(whole / 60)).padStart(2, '0');
  const ss = String(whole % 60).padStart(2, '0');
  return `T+${mm}:${ss}`;
}

function getVehicleStatusBadge(launch: LaunchState): { label: string; colorClass: string } {
  if (launch.launchSequence === 'PRE_SIM') {
    return { label: 'PRE-LAUNCH', colorClass: 'text-sky-300' };
  }
  if (launch.launchSequence === 'COUNTDOWN') {
    return { label: 'COUNTDOWN', colorClass: 'text-amber-300' };
  }
  if (launch.launchSequence === 'READY') {
    return { label: 'READY', colorClass: 'text-emerald-300' };
  }
  if (launch.coreSeparated) {
    return { label: 'ORBIT BURN', colorClass: 'text-sky-300' };
  }
  if (launch.srbSeparated) {
    return { label: 'STAGE 2', colorClass: 'text-amber-300' };
  }
  if (launch.dynamicPressureKpa > 18 && launch.altitudeKm < 28) {
    return { label: 'MAX-Q', colorClass: 'text-amber-300' };
  }
  return { label: 'LIFTOFF', colorClass: 'text-emerald-300' };
}

function getEducationalHint(launch: LaunchState): string {
  if (launch.launchSequence === 'PRE_SIM') {
    return '~3,940 kN thrust beats gravity (F = m·a). Click Begin Simulation.';
  }
  if (launch.launchSequence === 'COUNTDOWN') {
    return 'Crew arm retracting & RS-25 chilldown active.';
  }
  if (launch.launchSequence === 'READY') {
    return 'Pad green! Hold [SPACE] or [W] for liftoff.';
  }
  if (launch.stagePrompt === 'SRB_SEP') {
    return 'SRBs spent — press [SPACE] to drop boosters.';
  }
  if (launch.stagePrompt === 'CORE_SEP') {
    return 'MECO cutoff — press [SPACE] to stage ICPS.';
  }
  if (launch.coreSeparated) {
    return 'ICPS vacuum burn — accelerating to 165 km orbit.';
  }
  if (launch.altitudeKm >= 10 && launch.altitudeKm <= 26) {
    return 'Passing Max-Q (~12 km) — keep pitch smooth.';
  }
  return 'Net force (Thrust − Weight − Drag) climbs toward orbit.';
}

export function LaunchHUD({
  launch,
  resources,
  selectedPartId,
  onClearSelectedPart,
  muted,
  onToggleMute,
  onPause,
  onResetLaunch,
  onBeginSimulation,
  onStartLaunch,
  onSeparateStage,
  onToggleAutoGuidance,
  onSkipToSpace,
  onJumpToPhase,
  onOpenNasaModal,
  onSetCameraPreset,
  onZoomCamera,
  onResetCamera,
}: LaunchHUDProps) {
  const inspectedPart = selectedPartId ? LAUNCH_PART_DETAILS[selectedPartId] || null : null;
  const speedTotal = Math.round(Math.hypot(launch.verticalSpeedMs, launch.horizontalSpeedMs));
  const altDisplay =
    launch.altitudeKm < 1
      ? `${Math.round(launch.altitudeKm * 1000)} m`
      : `${launch.altitudeKm.toFixed(1)} km`;
  const statusBadge = getVehicleStatusBadge(launch);
  const countdownDigit = Math.max(1, Math.ceil(launch.countdownSec));

  const checklist =
    launch.launchSequence === 'ASCENDING'
      ? [
          {
            label: 'Liftoff & Pad Clear',
            done: launch.altitudeKm > 0.4,
            active: launch.altitudeKm <= 0.4,
          },
          {
            label: 'Max-Q & Gravity Turn',
            done: launch.altitudeKm >= 30,
            active: launch.altitudeKm > 0.4 && launch.altitudeKm < 30,
          },
          {
            label: 'SRB Separation',
            done: launch.srbSeparated,
            active: !launch.srbSeparated && launch.altitudeKm >= PHYSICS.SLS_SRB_SEP_ALT_KM,
          },
          {
            label: 'Orbital Insertion',
            done: launch.orbitReached,
            active: launch.coreSeparated && !launch.orbitReached,
          },
        ]
      : [
          {
            label: 'Systems Check',
            done: launch.launchSequence !== 'PRE_SIM',
            active: launch.launchSequence === 'PRE_SIM',
          },
          {
            label: 'Propellant Chilldown',
            done:
              launch.launchSequence === 'READY' ||
              (launch.launchSequence === 'COUNTDOWN' && launch.countdownSec <= 2.1),
            active: launch.launchSequence === 'COUNTDOWN' && launch.countdownSec > 2.1,
          },
          {
            label: 'Crew Arm Retraction',
            done:
              launch.launchSequence === 'READY' ||
              (launch.launchSequence === 'COUNTDOWN' && launch.countdownSec <= 0.9),
            active:
              launch.launchSequence === 'COUNTDOWN' &&
              launch.countdownSec <= 2.1 &&
              launch.countdownSec > 0.9,
          },
          {
            label: 'Ready for Launch',
            done: false,
            active: launch.launchSequence === 'READY',
          },
        ];

  const missionProgress = getLaunchMissionProgress(launch);

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between px-4 py-3">
      {/* TOP BAR: NASA Insignia + Stage Tabs + Quick Controls + Mission Progress */}
      <div className="flex flex-col gap-2">
        <header className="pointer-events-auto flex flex-wrap items-center justify-between gap-2.5">
        <div className="hud-panel flex items-center gap-3 rounded-xl px-3.5 py-2">
          <NASAInsignia size={36} className="shrink-0" />
          <div className="leading-tight">
            <h1 className="font-display text-base font-bold tracking-wide text-white uppercase">
              ARTEMIS ODYSSEY
            </h1>
            <p className="font-hud text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
              LC-39B Flight Director
            </p>
          </div>
        </div>

        {/* 4 Mission Stage Tabs */}
        <nav
          aria-label="Mission Stages"
          className="hud-panel flex items-center gap-1 rounded-xl p-1"
        >
          {STAGE_TABS.map((tab) => {
            const active = tab.id === 'launch';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (!active) onJumpToPhase(tab.id);
                }}
                className={`rounded-lg px-3 py-1.5 font-hud text-xs font-bold whitespace-nowrap transition ${
                  active
                    ? 'bg-cyan-400 text-slate-950 shadow-sm'
                    : 'text-slate-200 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right Header Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNasaModal}
            className="hud-panel inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold whitespace-nowrap text-emerald-300 uppercase hover:border-emerald-400"
          >
            <Database className="h-3.5 w-3.5" />
            NASA DATA
          </button>

          <button
            type="button"
            onClick={onToggleAutoGuidance}
            className={`hud-panel inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold whitespace-nowrap uppercase transition ${
              launch.autoGuidance
                ? 'border-cyan-400/70 text-cyan-200'
                : 'text-slate-300 hover:border-cyan-400/50'
            }`}
          >
            <Compass className="h-3.5 w-3.5 text-cyan-300" />
            {launch.autoGuidance ? 'AUTO GUIDANCE' : 'MANUAL PITCH'}
          </button>

          <button
            type="button"
            onClick={onSkipToSpace}
            className="hud-panel inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold whitespace-nowrap text-slate-200 uppercase hover:border-cyan-400"
          >
            <FastForward className="h-3.5 w-3.5 text-cyan-300" />
            Orbit
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            title="Toggle Sound [M]"
            className="hud-panel rounded-lg p-2 text-slate-200 hover:border-cyan-400"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-slate-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-cyan-300" />
            )}
          </button>
        </div>
        </header>

        <MissionProgressBar info={missionProgress} />
        <MissionWarningBanner warnings={getLaunchWarnings(launch, resources)} />
      </div>

      {/* MIDDLE ROW */}
      <div className="relative my-auto flex items-start justify-between gap-4 py-2">
        {/* LEFT COLUMN */}
        <aside className="pointer-events-auto flex w-64 shrink-0 flex-col gap-2.5">
          {/* Mission Objective */}
          <section className="hud-panel rounded-xl p-3.5">
            <h2 className="mb-1 font-display text-xs font-bold tracking-wider text-amber-300 uppercase">
              Flight Objective
            </h2>
            <p className="text-xs leading-snug text-slate-200">
              Reach 165 km orbit. Keep pitch smooth &amp; stage on cue.
            </p>
            <p className="mt-1.5 font-mono-tech text-[10px] font-semibold text-cyan-300">
              Click any 3D SLS / tower part to inspect
            </p>
          </section>

          {/* Mission Status Progression */}
          <section className="hud-panel rounded-xl p-3.5">
            <h2 className="mb-2.5 font-display text-xs font-bold tracking-wider text-sky-300 uppercase">
              Ascent Sequence
            </h2>
            <ul className="space-y-2">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2">
                    {item.done ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <span
                        className={`inline-block h-3 w-3 shrink-0 rounded-full border ${
                          item.active
                            ? 'border-sky-300 bg-sky-400/35'
                            : 'border-slate-600 bg-slate-900'
                        }`}
                      />
                    )}
                    <span
                      className={
                        item.done
                          ? 'text-slate-300'
                          : item.active
                            ? 'font-semibold text-white'
                            : 'text-slate-400'
                      }
                    >
                      {item.label}
                    </span>
                  </span>
                  {item.done && (
                    <span className="font-mono-tech text-[10px] font-bold text-emerald-400">
                      DONE
                    </span>
                  )}
                  {!item.done && item.active && (
                    <span className="font-mono-tech text-[10px] font-bold text-sky-300">
                      NOW
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {/* Vehicle Systems */}
          <section className="hud-panel rounded-xl p-3.5">
            <h2 className="mb-2.5 font-display text-xs font-bold tracking-wider text-sky-300 uppercase">
              Vehicle Systems
            </h2>
            <div className="space-y-2 text-xs">
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-hud text-slate-200 uppercase">Power</span>
                  <span className="font-mono-tech font-bold text-amber-300">
                    {Math.round(resources.power)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-amber-400 transition-all"
                    style={{ width: `${Math.round(resources.power)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-hud text-slate-200 uppercase">Propellant</span>
                  <span className="font-mono-tech font-bold text-sky-300">
                    {Math.round(launch.fuelPct)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-sky-400 transition-all"
                    style={{ width: `${Math.round(launch.fuelPct)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-hud text-slate-200 uppercase">Crew O₂</span>
                  <span className="font-mono-tech font-bold text-emerald-300">
                    {Math.round(resources.oxygen)}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-emerald-400 transition-all"
                    style={{ width: `${Math.round(resources.oxygen)}%` }}
                  />
                </div>
              </div>
            </div>
          </section>
        </aside>

        {/* CENTER-LOWER CINEMATIC OVERLAY (Positioned low so Orion & SLS remain unobstructed) */}
        <div className="pointer-events-none flex flex-1 flex-col items-center self-end pb-3">
          {launch.launchSequence === 'COUNTDOWN' && (
            <div className="hud-panel-amber tactical-frame rounded-2xl px-8 py-4 text-center">
              <p className="font-display text-xs font-bold tracking-[0.22em] text-cyan-200 uppercase">
                T-Minus Sequence
              </p>
              <div className="my-1 flex items-baseline justify-center gap-6 font-display">
                <span className="text-2xl font-bold text-slate-500">
                  {countdownDigit < 3 ? countdownDigit + 1 : ''}
                </span>
                <span className="text-5xl font-bold text-amber-400">{countdownDigit}</span>
                <span className="text-2xl font-bold text-slate-500">
                  {countdownDigit > 1 ? countdownDigit - 1 : ''}
                </span>
              </div>
              <p className="font-hud text-xs font-bold tracking-wider text-slate-200 uppercase">
                Arming RS-25 Core Igniters...
              </p>
            </div>
          )}

          {launch.launchSequence === 'READY' && (
            <div
              data-testid="launch-ready-banner"
              className="hud-panel-success tactical-frame rounded-2xl px-7 py-3.5 text-center"
            >
              <p className="font-display text-lg font-bold tracking-wider text-emerald-300 uppercase">
                READY FOR LIFTOFF
              </p>
              <p className="mt-0.5 font-mono-tech text-xs font-semibold text-amber-200">
                HOLD SPACE OR PRESS W TO IGNITE ENGINES
              </p>
            </div>
          )}

          {launch.launchSequence === 'ASCENDING' && launch.stagePrompt && (
            <button
              type="button"
              onClick={onSeparateStage}
              className="pointer-events-auto rounded-xl bg-amber-500 px-6 py-2.5 font-display text-sm font-bold whitespace-nowrap text-slate-950 shadow-lg hover:bg-amber-400"
            >
              {launch.stagePrompt === 'SRB_SEP'
                ? 'PRESS [SPACE] TO SEPARATE BOOSTERS!'
                : 'PRESS [SPACE] TO SEPARATE CORE STAGE!'}
            </button>
          )}

          {inspectedPart && (
            <div
              data-testid="launch-part-callout"
              className="hud-panel tactical-frame pointer-events-auto mt-2 max-w-md rounded-xl p-3.5 text-left"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-mono-tech text-[10px] font-bold text-cyan-300 uppercase">
                  {inspectedPart.role} · {inspectedPart.spec}
                </span>
                {onClearSelectedPart && (
                  <button
                    type="button"
                    onClick={onClearSelectedPart}
                    className="rounded border border-slate-700 bg-slate-900 p-1 text-slate-300 hover:border-cyan-400 hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <h3 className="font-display text-sm font-bold text-white">{inspectedPart.name}</h3>
              <p className="mt-1 text-xs leading-snug text-slate-200">{inspectedPart.fact}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <aside className="pointer-events-auto flex w-64 shrink-0 flex-col gap-2.5">
          {/* Telemetry */}
          <section className="hud-panel rounded-xl p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-sky-300" />
                <h2 className="font-display text-xs font-bold tracking-wider text-sky-300 uppercase">
                  Telemetry
                </h2>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 uppercase">
                Target {PHYSICS.SLS_ORBIT_TARGET_KM} km
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Altitude</span>
                <span
                  data-testid="launch-altitude"
                  className="font-mono-tech text-sm font-bold text-white"
                >
                  {altDisplay}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Speed</span>
                <span
                  data-testid="launch-speed"
                  className="font-mono-tech text-sm font-bold text-sky-300"
                >
                  {speedTotal} m/s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Acceleration</span>
                <span className="font-mono-tech text-sm font-bold text-amber-300">
                  {launch.netAccelMs2.toFixed(1)} m/s²
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Mission Time</span>
                <span className="font-mono-tech text-sm font-bold text-white">
                  {formatMissionTime(launch.elapsed)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-700/70 pt-2">
                <span className="text-slate-300">Vehicle Status</span>
                <span
                  data-testid="launch-vehicle-status"
                  className={`font-display text-xs font-bold tracking-wider ${statusBadge.colorClass}`}
                >
                  {statusBadge.label}
                </span>
              </div>
            </div>
          </section>

          {/* Compact SLS Block 1 + Orion Spec Diagram */}
          <section className="hud-panel rounded-xl p-3.5">
            <h2 className="mb-2 font-display text-xs font-bold tracking-wider text-sky-300 uppercase">
              Rocket Specs · SLS Block 1
            </h2>
            <div className="flex items-center gap-3">
              {/* Crisp Blueprint SVG of SLS Block 1 + Orion */}
              <svg
                width="68"
                height="138"
                viewBox="0 0 68 138"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="shrink-0"
                aria-label="SLS Block 1 Specification Diagram"
              >
                {/* Dimension line */}
                <line x1="8" y1="6" x2="8" y2="130" stroke="#475569" strokeWidth="1" />
                <line x1="5" y1="6" x2="11" y2="6" stroke="#475569" strokeWidth="1" />
                <line x1="5" y1="130" x2="11" y2="130" stroke="#475569" strokeWidth="1" />

                {/* LAS Tower */}
                <polygon points="36,5 38.5,18 33.5,18" fill="#F8FAFC" />
                {/* Orion Module */}
                <polygon points="33.5,18 38.5,18 40.5,27 31.5,27" fill="#E2E8F0" />
                {/* ICPS Upper Stage */}
                <rect x="31.5" y="27" width="9" height="10" fill="#F1F5F9" />
                <circle cx="36" cy="32" r="2.2" fill="#0B3D91" />
                {/* LVSA Adapter */}
                <polygon points="31.5,37 40.5,37 43,45 29,45" fill="#EA580C" />
                {/* Core Stage */}
                <rect x="29" y="45" width="14" height="76" rx="1" fill="#EA580C" />
                <rect x="33" y="45" width="6" height="76" fill="#C2410C" opacity="0.45" />
                {/* 4 RS-25 Nozzles */}
                <polygon points="31,121 34,121 35,129 30,129" fill="#94A3B8" />
                <polygon points="38,121 41,121 42,129 37,129" fill="#94A3B8" />
                {/* Left SRB */}
                <polygon points="21,60 26.5,60 23.75,50" fill="#F8FAFC" />
                <rect x="21" y="60" width="5.5" height="63" fill="#F8FAFC" />
                <line x1="21" y1="76" x2="26.5" y2="76" stroke="#334155" strokeWidth="1" />
                <line x1="21" y1="92" x2="26.5" y2="92" stroke="#334155" strokeWidth="1" />
                <line x1="21" y1="108" x2="26.5" y2="108" stroke="#334155" strokeWidth="1" />
                <polygon points="21,123 26.5,123 27.5,129 20,129" fill="#64748B" />
                {/* Right SRB */}
                <polygon points="45.5,60 51,60 48.25,50" fill="#F8FAFC" />
                <rect x="45.5" y="60" width="5.5" height="63" fill="#F8FAFC" />
                <line x1="45.5" y1="76" x2="51" y2="76" stroke="#334155" strokeWidth="1" />
                <line x1="45.5" y1="92" x2="51" y2="92" stroke="#334155" strokeWidth="1" />
                <line x1="45.5" y1="108" x2="51" y2="108" stroke="#334155" strokeWidth="1" />
                <polygon points="45.5,123 51,123 52,129 44.5,129" fill="#64748B" />
              </svg>

              <div className="space-y-2 text-[11px]">
                <div>
                  <span className="block text-slate-400">Height</span>
                  <span className="font-mono-tech font-bold text-white">111.3 m (365 ft)</span>
                </div>
                <div>
                  <span className="block text-slate-400">Lift-off Thrust</span>
                  <span className="font-mono-tech font-bold text-amber-300">~3,940 kN</span>
                </div>
                <div>
                  <span className="block text-slate-400">Core Stage</span>
                  <span className="font-semibold text-slate-200">65.1 m · 4× RS-25</span>
                </div>
                <div>
                  <span className="block text-slate-400">Boosters</span>
                  <span className="font-semibold text-slate-200">2× 5-Seg SRB</span>
                </div>
              </div>
            </div>
          </section>

          <CameraViewControls
            compact
            onSelectPreset={onSetCameraPreset}
            onZoom={onZoomCamera}
            onReset={onResetCamera}
            className="w-full justify-between"
          />
        </aside>
      </div>

      {/* BOTTOM FLIGHT CONSOLE */}
      <footer className="pointer-events-auto flex flex-wrap items-center justify-between gap-3">
        {/* Flight Controls */}
        <div className="hud-panel flex items-center gap-2 rounded-xl px-3 py-2">
          <span className="mr-1 hidden text-[10px] font-bold tracking-wider text-slate-400 uppercase lg:inline">
            Flight Controls
          </span>
          <button
            type="button"
            data-hold-keys="left"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-sky-400"
          >
            <span className="keycap mr-1.5">A</span>Pitch Left
          </button>
          <button
            type="button"
            data-hold-keys="right"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-sky-400"
          >
            Pitch Right<span className="keycap ml-1.5">D</span>
          </button>
          <button
            type="button"
            data-hold-keys="stabilize"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-100 hover:border-sky-400"
          >
            Stabilize<span className="keycap ml-1.5">SPACE</span>
          </button>
        </div>

        {/* Mission Assist Toggle + Educational Physics Hint */}
        <div className="hud-panel flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-1.5">
          <button
            type="button"
            onClick={onToggleAutoGuidance}
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
              launch.autoGuidance
                ? 'border-sky-400/70 bg-sky-500/20 text-sky-200'
                : 'border-slate-700 bg-slate-900 text-slate-300'
            }`}
          >
            Auto Guidance: {launch.autoGuidance ? 'ON' : 'OFF'}
          </button>
          <div className="flex min-w-0 items-center gap-2 text-[11px] leading-tight text-slate-200">
            <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 font-hud text-[10px] font-bold text-amber-300 uppercase">
              Cue
            </span>
            <p className="line-clamp-2" title={getEducationalHint(launch)}>
              {getEducationalHint(launch)}
            </p>
          </div>
        </div>

        {/* Primary Launch Action + Pause + Reset */}
        <div className="flex items-center gap-2">
          {launch.launchSequence === 'PRE_SIM' && (
            <button
              type="button"
              data-testid="begin-simulation-btn"
              onClick={onBeginSimulation}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-display text-sm font-bold tracking-wide text-slate-950 shadow-lg hover:bg-amber-400 active:scale-[0.98]"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              BEGIN SIMULATION
            </button>
          )}

          {launch.launchSequence === 'COUNTDOWN' && (
            <button
              type="button"
              disabled
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-slate-900 px-5 py-2.5 font-display text-sm font-bold tracking-wide text-amber-300"
            >
              <Rocket className="h-4 w-4" />
              COUNTDOWN ({countdownDigit})
            </button>
          )}

          {launch.launchSequence === 'READY' && (
            <button
              type="button"
              data-testid="start-launch-btn"
              data-hold-keys="forward"
              onClick={onStartLaunch}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-display text-sm font-bold tracking-wide text-slate-950 shadow-lg hover:bg-amber-400 active:scale-[0.98]"
            >
              <Rocket className="h-4 w-4" />
              START LAUNCH
            </button>
          )}

          {launch.launchSequence === 'ASCENDING' && (
            <button
              type="button"
              data-hold-keys="forward"
              onClick={launch.stagePrompt ? onSeparateStage : undefined}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-display text-sm font-bold tracking-wide shadow-lg ${
                launch.stagePrompt
                  ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                  : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
              }`}
            >
              <Rocket className="h-4 w-4" />
              {launch.stagePrompt ? 'SEPARATE STAGE' : 'FULL THRUST (W)'}
            </button>
          )}

          <button
            type="button"
            onClick={onPause}
            title="Pause [P]"
            className="hud-panel inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:border-sky-400"
          >
            <Pause className="h-4 w-4" />
            <span className="hidden sm:inline">Pause (P)</span>
          </button>

          <button
            type="button"
            onClick={onResetLaunch}
            title="Reset Pad 39B [R]"
            className="hud-panel inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:border-amber-400"
          >
            <RotateCcw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset (R)</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
