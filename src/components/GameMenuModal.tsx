import { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Gauge,
  HelpCircle,
  Home,
  Keyboard,
  Lock,
  Map,
  Play,
  RotateCcw,
  Settings,
  Sliders,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import type { MusicState } from '../game/audio';
import { getLandingZones } from '../game/constants';
import { CONTEXTUAL_FACTS, GLOSSARY_ENTRIES, type FactContextKey } from '../game/factsAndGlossary';
import {
  SOLAR_SYSTEM_BODIES,
  type SolarScaleMode,
  computeWeightOnBodyKg,
} from '../game/solarSystemData';
import type {
  AudioSettings,
  CampaignCarryoverState,
  GameMenuTab,
  GamePhase,
  LandingState,
  MarsQueueState,
  QualityPreset,
  RoverObjective,
  RoverState,
  SpaceFlightState,
  SpaceTargetId,
  TelemetrySpeedScale,
  UnitsSystem,
} from '../game/types';
import { SurfaceMapPanel } from './SurfaceMapPanel';
import { Button, Panel } from './ui';

interface GameMenuModalProps {
  open: boolean;
  activeTab: GameMenuTab;
  phase: GamePhase;
  carryover: CampaignCarryoverState;
  exploredSolarBodyIds: string[];
  rover: RoverState;
  objectives: RoverObjective[];
  marsQueue: MarsQueueState;
  space: SpaceFlightState;
  landing: LandingState;
  audioSettings: AudioSettings;
  musicState?: MusicState;
  qualityPreset: QualityPreset;
  speedScale: TelemetrySpeedScale;
  solarScaleMode: SolarScaleMode;
  solarTimeSpeed: number;
  focusedSolarBodyId: string | null;
  unitsSystem?: UnitsSystem;
  reducedMotion?: boolean;
  highContrastBorders?: boolean;
  onSelectTab: (tab: GameMenuTab) => void;
  onClose: () => void;
  onRestartStage: () => void;
  onBackToTitle: () => void;
  onOpenFieldLedger: () => void;
  onJumpToInspector: () => void;
  onToggleSpeedScale: () => void;
  onUpdateAudio: (partial: Partial<AudioSettings>) => void;
  onToggleMusic?: () => void;
  onChangeMusicVolume?: (vol: number) => void;
  onChangeQuality: (q: QualityPreset) => void;
  onChangeUnits?: (units: UnitsSystem) => void;
  onToggleReducedMotion?: () => void;
  onToggleHighContrast?: () => void;
  onResetPreferences?: () => void;
  onResetCamera: () => void;
  onQueueMarsPoint: (x: number, z: number, label: string, objectiveId?: string) => void;
  onAutoDriveToPoint?: (x: number, z: number, label: string, objectiveId?: string) => void;
  onClearMarsQueue: () => void;
  onTransmitMarsQueue: () => void;
  onSelectSpaceTarget: (id: SpaceTargetId) => void;
  onChangeSolarScaleMode: (mode: SolarScaleMode) => void;
  onChangeSolarTimeSpeed: (speed: number) => void;
  onFocusSolarBody: (bodyId: string | null) => void;
  onSelectLandingZone: (id: number) => void;
  onToggleAutoCutoff: () => void;
}

export function GameMenuModal({
  open,
  activeTab,
  phase,
  carryover,
  exploredSolarBodyIds,
  rover,
  objectives,
  marsQueue,
  space,
  landing,
  audioSettings,
  musicState,
  qualityPreset,
  speedScale,
  solarScaleMode,
  solarTimeSpeed,
  focusedSolarBodyId,
  unitsSystem = 'metric',
  reducedMotion = false,
  highContrastBorders = false,
  onSelectTab,
  onClose,
  onRestartStage,
  onBackToTitle,
  onOpenFieldLedger,
  onJumpToInspector,
  onToggleSpeedScale,
  onUpdateAudio,
  onToggleMusic,
  onChangeMusicVolume,
  onChangeQuality,
  onChangeUnits,
  onToggleReducedMotion,
  onToggleHighContrast,
  onResetPreferences,
  onResetCamera,
  onQueueMarsPoint,
  onAutoDriveToPoint,
  onClearMarsQueue,
  onTransmitMarsQueue,
  onSelectSpaceTarget,
  onChangeSolarScaleMode,
  onChangeSolarTimeSpeed,
  onFocusSolarBody,
  onSelectLandingZone,
  onToggleAutoCutoff,
}: GameMenuModalProps) {
  if (!open) return null;

  const [confirmAbort, setConfirmAbort] = useState(false);

  const isMarsRover = phase === 'rover' && rover.planet === 'mars';
  const factKey: FactContextKey =
    phase === 'launch'
      ? 'launch'
      : phase === 'space'
        ? 'space'
        : phase === 'landing'
          ? landing.planet === 'mars'
            ? 'mars-edl'
            : 'moon-landing'
          : 'rover';
  const phaseFacts = CONTEXTUAL_FACTS[factKey] || CONTEXTUAL_FACTS.rover;
  const glossaryList = Object.values(GLOSSARY_ENTRIES);

  const achievements = [
    {
      id: 'ach-solar-explorer',
      title: 'Solar System Explorer',
      desc: 'Inspect at least 5 worlds across the Solar System.',
      unlocked: exploredSolarBodyIds.length >= 5,
      progress: `${Math.min(5, exploredSolarBodyIds.length)} / 5`,
    },
    {
      id: 'ach-hermes',
      title: 'Artemis II Relay',
      desc: 'Deploy and lock the HERMES orbital communications link.',
      unlocked: carryover.relaySatelliteOnline || carryover.completedMissions.includes('artemis-2'),
      progress: carryover.relaySatelliteOnline ? 'Complete' : 'Pending',
    },
    {
      id: 'ach-shackleton',
      title: 'Lunar South Pole',
      desc: 'Complete Artemis III ice coring and polar outpost setup.',
      unlocked: carryover.completedMissions.includes('artemis-3'),
      progress: `${carryover.isruWaterKg} kg H₂O`,
    },
    {
      id: 'ach-gateway',
      title: 'Gateway Navigator',
      desc: 'Dock with Lunar Gateway in NRHO during Artemis IV.',
      unlocked: carryover.completedMissions.includes('artemis-4'),
      progress: carryover.completedMissions.includes('artemis-4') ? 'Docked' : 'Pending',
    },
    {
      id: 'ach-mars',
      title: 'Jezero Pathfinder',
      desc: 'Land through Mars 0.38g EDL and collect rover science cores.',
      unlocked: carryover.completedMissions.includes('mars-pathfinder') || carryover.marsSamplesCached >= 4,
      progress: `${carryover.marsSamplesCached} / 4 Cores`,
    },
    {
      id: 'ach-notes',
      title: 'Chief Field Engineer',
      desc: 'Unlock 4 NASA engineering field notes in your Astronaut Notebook.',
      unlocked: carryover.unlockedFieldNotes.length >= 4,
      progress: `${carryover.unlockedFieldNotes.length} Notes`,
    },
  ];

  const isTitleOrInspector = phase === 'title' || phase === 'inspector';
  const allTabs: Array<{ id: GameMenuTab; label: string; icon: typeof Map; gameplayOnly?: boolean }> = [
    {
      id: 'map',
      label: phase === 'rover' ? 'Topo Map' : phase === 'space' ? 'Solar Map' : 'Flight Map',
      icon: Map,
      gameplayOnly: true,
    },
    { id: 'ledger', label: 'Field Ledger', icon: BookOpen },
    { id: 'achievements', label: 'Achievements', icon: Trophy },
    { id: 'glossary', label: 'Glossary & Facts', icon: HelpCircle },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];
  const tabs = allTabs.filter((t) => !isTitleOrInspector || !t.gameplayOnly);

  return (
    <div
      data-testid="unified-game-menu"
      className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/82 p-4"
    >
      <Panel
        variant="surface"
        className="tactical-frame animate-modal-enter flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden p-5 text-slate-100"
      >
        {/* Top Bar */}
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-xl font-bold text-white">Mission Menu</h2>
            <p className="text-sm text-slate-300">
              Simulation paused — review maps, achievements, science notes, hardware, or settings.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close Menu"
            onClick={onClose}
            className="rounded-xl border border-white/15 bg-white/5 p-2 text-slate-200 hover:border-sky-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-4 flex shrink-0 flex-wrap gap-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`menu-tab-${tab.id}`}
                onClick={() => onSelectTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? 'hud-nav-active'
                    : 'border border-sky-400/15 bg-slate-900/65 text-slate-200 hover:border-cyan-400/50 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-cyan-300' : 'text-slate-300'}`} />
                {tab.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onClose();
              onJumpToInspector();
            }}
            className="ml-auto inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/12 px-3 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-white"
          >
            <Wrench className="h-4 w-4" />
            Hardware Bay
          </button>
        </div>

        {/* Tab Body */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {activeTab === 'map' && (
            <div className="space-y-4">
              {phase === 'rover' && (
                <div className="grid gap-4 md:grid-cols-[auto_1fr]">
                  <SurfaceMapPanel
                    planet={rover.planet}
                    rover={rover}
                    objectives={objectives}
                    relayOnline={carryover.relaySatelliteOnline}
                    expanded
                    onToggleExpand={() => {}}
                    marsQueue={marsQueue}
                    onMapClick={(wx, wz) => {
                      if (isMarsRover) {
                        onQueueMarsPoint(wx, wz, `Point (${Math.round(wx)}, ${Math.round(wz)})`);
                      } else if (onAutoDriveToPoint) {
                        onAutoDriveToPoint(wx, wz, `Point (${Math.round(wx)}, ${Math.round(wz)})`);
                        onClose();
                      }
                    }}
                  />
                  <div className="flex flex-col justify-between gap-3 rounded-xl border border-sky-400/20 bg-slate-950/60 p-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {isMarsRover ? 'Mars A* Command Queue (14-Min Lag)' : 'Surface A* AutoNav & Waypoints'}
                      </h3>
                      <p className="mt-1 text-base text-slate-300">
                        {isMarsRover
                          ? 'Click anywhere on the map, queue a batch, or Auto-Drive directly around terrain hazards.'
                          : 'Select any polar sampling site or click the map to plot an A* route around boulders.'}
                      </p>

                      <div className="mt-3 space-y-2">
                        {objectives.map((o) => {
                          const dist = Math.round(Math.hypot(o.x - rover.x, o.z - rover.z));
                          return (
                            <div
                              key={o.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-base"
                            >
                              <span className={o.completed ? 'text-slate-400 line-through' : 'font-semibold text-white'}>
                                {o.siteName}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-amber-300">{o.completed ? 'Done' : `${dist} m`}</span>
                                {!o.completed && onAutoDriveToPoint && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onAutoDriveToPoint(o.x, o.z, o.siteName, o.id);
                                      onClose();
                                    }}
                                    className="rounded-lg bg-cyan-400 px-2.5 py-1 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                                  >
                                    Auto-Drive
                                  </button>
                                )}
                                {isMarsRover && !o.completed && (
                                  <button
                                    type="button"
                                    onClick={() => onQueueMarsPoint(o.x, o.z, o.siteName, o.id)}
                                    className="rounded-lg bg-amber-500 px-2.5 py-1 text-sm font-bold text-slate-950 hover:bg-amber-400"
                                  >
                                    Queue
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {isMarsRover && (
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
                        <span className="text-sm text-amber-200">{marsQueue.statusMessage}</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={onClearMarsQueue}
                            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:border-rose-400"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            data-testid="menu-send-mars-batch-btn"
                            disabled={marsQueue.queue.length === 0 || marsQueue.phase !== 'IDLE'}
                            onClick={() => {
                              onTransmitMarsQueue();
                              onClose();
                            }}
                            className="rounded-lg bg-amber-500 px-4 py-1.5 text-sm font-bold text-slate-950 disabled:opacity-40"
                          >
                            Send Batch ({marsQueue.queue.length})
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {phase === 'space' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-slate-950/60 p-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onChangeSolarScaleMode('exploration')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                          solarScaleMode === 'exploration' ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        Educational Scale
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeSolarScaleMode('scientific')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                          solarScaleMode === 'scientific' ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        True Scale (1:1 AU)
                      </button>
                      <button
                        type="button"
                        onClick={() => onChangeSolarScaleMode('local')}
                        className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                          solarScaleMode === 'local' ? 'bg-amber-500 text-slate-950' : 'bg-white/10 text-slate-200'
                        }`}
                      >
                        Local Mission View
                      </button>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-200">
                      <span>Orbit Speed</span>
                      <input
                        type="range"
                        min={0}
                        max={4}
                        step={0.25}
                        value={solarTimeSpeed}
                        onChange={(e) => onChangeSolarTimeSpeed(Number(e.target.value))}
                        className="accent-amber-400"
                      />
                      <span className="font-bold text-amber-300">{solarTimeSpeed}×</span>
                    </label>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-4">
                    {(
                      [
                        { id: 'relay-orbit', label: 'HERMES Relay' },
                        { id: 'moon', label: 'Moon' },
                        { id: 'gateway', label: 'Gateway' },
                        { id: 'mars', label: 'Mars' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onSelectSpaceTarget(t.id)}
                        className={`rounded-xl border px-3 py-2.5 text-base font-bold ${
                          space.targetId === t.id
                            ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                            : 'border-white/10 bg-white/5 text-slate-200'
                        }`}
                      >
                        Course: {t.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-4">
                    <button
                      type="button"
                      onClick={() => {
                        onFocusSolarBody(null);
                        onClose();
                      }}
                      className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${
                        !focusedSolarBodyId ? 'border-amber-400 bg-amber-500/20 text-white' : 'border-white/10 bg-white/5 text-slate-300'
                      }`}
                    >
                      Orion Spacecraft
                    </button>
                    {SOLAR_SYSTEM_BODIES.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          onFocusSolarBody(b.id);
                          onClose();
                        }}
                        className={`rounded-xl border px-3 py-2 text-left text-sm ${
                          focusedSolarBodyId === b.id
                            ? 'border-sky-400 bg-sky-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300'
                        }`}
                      >
                        <div className="font-bold text-white">{b.name}</div>
                        <div className="text-xs text-amber-300">
                          {b.gravityG}g · 35kg = {computeWeightOnBodyKg(35, b.gravityG)}kg
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'landing' && (
                <div className="space-y-3 rounded-xl border border-sky-400/20 bg-slate-950/60 p-4">
                  <h3 className="text-lg font-bold text-white">Landing Zone Selector</h3>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    {getLandingZones(landing.planet).map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => onSelectLandingZone(z.id)}
                        className={`rounded-xl border p-3 text-left ${
                          landing.targetZoneId === z.id
                            ? 'border-amber-400 bg-amber-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-200'
                        }`}
                      >
                        <div className="text-base font-bold">{z.name}</div>
                        <div className="text-sm text-amber-300">Score ×{z.multiplier}</div>
                        <div className="mt-1 text-sm text-slate-300">{z.hint}</div>
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={onToggleAutoCutoff}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-base font-semibold text-slate-100"
                  >
                    Contact Light Auto-Cut: {landing.autoCutoff ? 'Armed' : 'Off'}
                  </button>
                </div>
              )}

              {phase === 'launch' && (
                <div className="rounded-xl border border-sky-400/20 bg-slate-950/60 p-4 text-base text-slate-200">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Compass className="h-5 w-5 text-amber-400" />
                    LC-39B Ascent Profile
                  </div>
                  <p className="mt-2">
                    Climb to 165 km parking orbit: separate Twin SRBs at 45 km, Core Stage at 110 km, then fire the RL10 Trans-Lunar Injection burn.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${
                    ach.unlocked
                      ? 'border-cyan-400/55 bg-cyan-500/12'
                      : 'border-sky-400/20 bg-slate-950/60'
                  }`}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      ach.unlocked ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {ach.unlocked ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-white">{ach.title}</h3>
                      <span className="text-xs font-semibold text-cyan-300 tabular-nums">
                        {ach.progress}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'ledger' && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-sky-400/20 bg-slate-950/60 p-5">
              <h3 className="text-lg font-bold text-white">Astronaut Field Ledger</h3>
              <p className="text-base text-slate-300">
                {carryover.unlockedFieldNotes.length} engineering notes unlocked · {carryover.isruWaterKg} kg water · {carryover.radiationDoseMsv} mSv dose.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenFieldLedger();
                }}
                className="hud-cta-cyan rounded-xl px-5 py-2.5 text-base font-bold"
              >
                Open Full Ledger
              </button>
            </div>
          )}

          {activeTab === 'glossary' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-sky-400/20 bg-slate-950/60 p-4">
                <h3 className="mb-2 text-lg font-bold text-cyan-300">Phase &ldquo;Did you know?&rdquo; Facts</h3>
                <ul className="space-y-2 text-base text-slate-200">
                  {phaseFacts.map((f) => (
                    <li key={f.text} className="rounded-lg bg-white/5 px-3 py-2">
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {glossaryList.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-sky-400/20 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-white">{entry.term}</span>
                      <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                        {entry.badge}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-300">{entry.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* 4-Bus Audio Mixing Console */}
                <div className="space-y-3 rounded-xl border border-sky-400/20 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="flex items-center gap-2 text-base font-bold text-white">
                      <Sliders className="h-4 w-4 text-cyan-400" />
                      Acoustic &amp; Audio Console
                    </h3>
                    <button
                      type="button"
                      data-testid="audio-mute-toggle-btn"
                      onClick={() => onUpdateAudio({ muted: !audioSettings.muted })}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                        audioSettings.muted
                          ? 'border border-rose-500/40 bg-rose-500/20 text-rose-300'
                          : 'border border-cyan-400/30 bg-cyan-500/15 text-cyan-200 hover:border-cyan-400'
                      }`}
                    >
                      {audioSettings.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                      {audioSettings.muted ? 'MUTED' : 'LIVE'}
                    </button>
                  </div>

                  {/* Master Volume */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Master Bus</span>
                      <span className="font-mono-tech text-cyan-300">
                        {Math.round((audioSettings.masterVolume ?? 0.85) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      aria-label="Master Volume"
                      value={audioSettings.masterVolume ?? 0.85}
                      onChange={(e) => onUpdateAudio({ masterVolume: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Engine Acoustics Volume */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Rocket Propulsion &amp; Thrusters</span>
                      <span className="font-mono-tech text-amber-300">
                        {Math.round((audioSettings.engineVolume ?? 0.85) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      aria-label="Engine Propulsion Volume"
                      value={audioSettings.engineVolume ?? 0.85}
                      onChange={(e) => onUpdateAudio({ engineVolume: Number(e.target.value) })}
                      className="w-full accent-amber-400"
                    />
                  </div>

                  {/* SFX Volume */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Telemetry &amp; Systems SFX</span>
                      <span className="font-mono-tech text-cyan-300">
                        {Math.round((audioSettings.sfxVolume ?? 0.9) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      aria-label="Sound Effects Volume"
                      value={audioSettings.sfxVolume ?? 0.9}
                      onChange={(e) => onUpdateAudio({ sfxVolume: Number(e.target.value) })}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  {/* Music Volume & Toggle */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span>Procedural Score</span>
                        {onToggleMusic && (
                          <button
                            type="button"
                            onClick={onToggleMusic}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              musicState?.musicEnabled !== false
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-white/10 text-slate-400'
                            }`}
                          >
                            {musicState?.musicEnabled !== false ? 'ON' : 'OFF'}
                          </button>
                        )}
                      </span>
                      <span className="font-mono-tech text-cyan-300">
                        {Math.round((musicState?.musicVolume ?? 0.28) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.02}
                      aria-label="Music Volume"
                      value={musicState?.musicVolume ?? 0.28}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (onChangeMusicVolume) onChangeMusicVolume(val);
                        onUpdateAudio({ ambienceVolume: val });
                      }}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                {/* Graphics & Visual Fidelity */}
                <div className="space-y-3 rounded-xl border border-sky-400/20 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <h3 className="flex items-center gap-2 text-base font-bold text-white">
                      <Gauge className="h-4 w-4 text-cyan-400" />
                      Visual Fidelity Presets
                    </h3>
                    <span className="font-mono-tech text-xs font-bold uppercase text-cyan-300">
                      {qualityPreset}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { id: 'low', label: 'Low', desc: '1.0× DPR · No Shadows' },
                        { id: 'med', label: 'Medium', desc: '1.5× DPR · Basic Shadows' },
                        { id: 'high', label: 'High', desc: '2.0× DPR · PCF Shadows' },
                        { id: 'ultra', label: 'Ultra', desc: '2.5× DPR · PCF Soft' },
                      ] as const
                    ).map((q) => (
                      <button
                        key={q.id}
                        type="button"
                        data-testid={`quality-preset-${q.id}`}
                        onClick={() => onChangeQuality(q.id)}
                        className={`rounded-xl border p-2.5 text-left transition ${
                          qualityPreset === q.id
                            ? 'border-cyan-400 bg-cyan-500/20 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-bold uppercase">{q.label}</div>
                        <div className="text-[10px] text-slate-400">{q.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Rover Speed & Camera */}
                  <div className="border-t border-white/10 pt-2 space-y-2">
                    <button
                      type="button"
                      data-testid="toggle-speed-scale-btn"
                      onClick={onToggleSpeedScale}
                      className="flex w-full items-center justify-between rounded-xl border border-sky-400/25 bg-slate-900/75 px-3 py-2 text-left text-xs font-semibold text-white hover:border-cyan-400"
                    >
                      <span>Rover Telemetry Speed</span>
                      <span className="font-mono-tech text-cyan-300">
                        {speedScale === 'REAL_SPEED' ? 'NASA 1× (0.18 m/s)' : 'Sim 25× (4.5 m/s)'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={onResetCamera}
                      className="w-full rounded-xl border border-sky-400/25 bg-slate-900/75 px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:border-cyan-400"
                    >
                      Reset Active Camera Pose
                    </button>
                  </div>
                </div>
              </div>

              {/* Units, Accessibility & Flight Deck Controls */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3 rounded-xl border border-sky-400/20 bg-slate-950/60 p-4">
                  <h3 className="flex items-center gap-2 text-base font-bold text-white border-b border-white/10 pb-2">
                    <Compass className="h-4 w-4 text-cyan-400" />
                    Units &amp; Accessibility
                  </h3>

                  {/* Units Switcher */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">Engineering Units</div>
                      <div className="text-[10px] text-slate-400">
                        {unitsSystem === 'imperial' ? 'Nautical Miles, ft/s, lbf, psi' : 'Kilometers, m/s, kN, bar'}
                      </div>
                    </div>
                    <div className="flex gap-1 rounded-lg border border-white/10 bg-black/40 p-0.5">
                      <button
                        type="button"
                        data-testid="units-metric-btn"
                        onClick={() => onChangeUnits?.('metric')}
                        className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                          unitsSystem !== 'imperial'
                            ? 'bg-cyan-400 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Metric (SI)
                      </button>
                      <button
                        type="button"
                        data-testid="units-imperial-btn"
                        onClick={() => onChangeUnits?.('imperial')}
                        className={`rounded px-2.5 py-1 text-xs font-bold transition ${
                          unitsSystem === 'imperial'
                            ? 'bg-cyan-400 text-slate-950'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        Aerospace (US)
                      </button>
                    </div>
                  </div>

                  {/* Reduced Motion Toggle */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <div>
                      <div className="text-xs font-semibold text-white">Reduced Motion</div>
                      <div className="text-[10px] text-slate-400">Dampens camera shake, launch turbulence, &amp; drift</div>
                    </div>
                    <button
                      type="button"
                      data-testid="reduced-motion-toggle-btn"
                      onClick={() => onToggleReducedMotion?.()}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                        reducedMotion
                          ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-300'
                          : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {reducedMotion ? 'ENABLED' : 'OFF'}
                    </button>
                  </div>

                  {/* High Contrast Borders Toggle */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <div>
                      <div className="text-xs font-semibold text-white">High-Contrast Borders</div>
                      <div className="text-[10px] text-slate-400">Enhance HUD element frames for high legibility</div>
                    </div>
                    <button
                      type="button"
                      data-testid="high-contrast-toggle-btn"
                      onClick={() => onToggleHighContrast?.()}
                      className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                        highContrastBorders
                          ? 'border border-cyan-400 bg-cyan-500/20 text-cyan-300'
                          : 'border border-white/10 bg-white/5 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      {highContrastBorders ? 'ENABLED' : 'OFF'}
                    </button>
                  </div>

                  {/* Reset Preferences */}
                  {onResetPreferences && (
                    <div className="border-t border-white/10 pt-2">
                      <button
                        type="button"
                        data-testid="reset-preferences-btn"
                        onClick={onResetPreferences}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 py-1.5 text-xs font-bold text-rose-300 transition hover:border-rose-400 hover:bg-rose-500/20"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reset All Settings to Defaults
                      </button>
                    </div>
                  )}
                </div>

                {/* Flight Deck Keyboard Controls Reference */}
                <div className="space-y-3 rounded-xl border border-sky-400/20 bg-slate-950/60 p-4">
                  <h3 className="flex items-center gap-2 text-base font-bold text-white border-b border-white/10 pb-2">
                    <Keyboard className="h-4 w-4 text-cyan-400" />
                    Flight Deck Keybindings
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                      <span className="text-slate-300">Pitch / Throttle</span>
                      <kbd className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">W / S</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                      <span className="text-slate-300">Yaw / Steer</span>
                      <kbd className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">A / D</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                      <span className="text-slate-300">Stage / Booster</span>
                      <kbd className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">Space</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                      <span className="text-slate-300">Cycle Camera</span>
                      <kbd className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">C</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                      <span className="text-slate-300">Mission Menu</span>
                      <kbd className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">Tab / Esc</kbd>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-white/5 px-2.5 py-1.5">
                      <span className="text-slate-300">Mute Audio</span>
                      <kbd className="rounded bg-black/50 px-1.5 py-0.5 font-mono text-[11px] text-cyan-300">M</kbd>
                    </div>
                  </div>
                  <div className="rounded-lg bg-cyan-950/30 border border-cyan-500/20 p-2 text-[11px] text-cyan-200">
                    Tip: Click and drag anywhere in 3D viewport to engage free orbital camera orbit around your spacecraft.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            {phase !== 'title' && (
              <>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={onRestartStage}
                  className="font-hud text-xs font-bold uppercase"
                >
                  <RotateCcw className="h-4 w-4" />
                  Restart Stage
                </Button>

                {confirmAbort ? (
                  <div className="flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/60 px-3 py-1 text-xs text-rose-200">
                    <span className="font-medium">Abort flight?</span>
                    <Button
                      variant="danger"
                      size="sm"
                      data-testid="confirm-abort-btn"
                      onClick={() => {
                        setConfirmAbort(false);
                        onBackToTitle();
                      }}
                      className="font-hud text-xs font-bold uppercase"
                    >
                      Confirm Abort
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmAbort(false)}
                      className="font-hud text-xs font-bold uppercase"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="danger"
                    size="md"
                    data-testid="abort-to-title-btn"
                    onClick={() => setConfirmAbort(true)}
                    className="font-hud text-xs font-bold uppercase"
                  >
                    <Home className="h-4 w-4" />
                    Abort to Title
                  </Button>
                )}
              </>
            )}
          </div>
          <Button
            variant="primary"
            size="lg"
            data-testid="resume-from-menu-btn"
            onClick={onClose}
            className="font-display text-sm font-bold tracking-wider uppercase"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            {phase === 'title' ? 'Close' : 'Resume Flight'}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
