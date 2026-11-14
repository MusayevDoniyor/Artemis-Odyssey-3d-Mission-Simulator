import { BookOpen, Compass, Database, Play, Rocket, Volume2, VolumeX, Wrench } from 'lucide-react';
import { CAMPAIGN_MISSIONS, CAMPAIGN_ORDER } from '../game/constants';
import type {
  CampaignCarryoverState,
  CampaignMissionId,
  GamePhase,
  VehicleShowcaseId,
} from '../game/types';
import { NASAInsignia } from './NASAInsignia';

interface TitleOverlayProps {
  showcase: VehicleShowcaseId;
  carryover: CampaignCarryoverState;
  onSelectShowcase: (v: VehicleShowcaseId) => void;
  onSelectCampaignMission: (id: CampaignMissionId) => void;
  onStartMission: () => void;
  onJumpToPhase: (phase: GamePhase) => void;
  onOpenNotebook: () => void;
  onOpenNasaModal: () => void;
  muted: boolean;
  onToggleMute: () => void;
}

const SHOWCASE_OPTIONS: Array<{ id: VehicleShowcaseId; label: string }> = [
  { id: 'outpost', label: 'Moon Base' },
  { id: 'rocket', label: 'SLS Rocket' },
  { id: 'satellite', label: 'HERMES Sat' },
  { id: 'lander', label: 'Lander' },
  { id: 'rover', label: 'Rover' },
];

const QUICK_STAGES: Array<{ phase: GamePhase; label: string }> = [
  { phase: 'inspector', label: 'Inspect Parts' },
  { phase: 'launch', label: 'Pad 39B Launch' },
  { phase: 'space', label: 'Orbital & Sat Ops' },
  { phase: 'landing', label: 'Powered Descent' },
  { phase: 'rover', label: 'Surface Rover' },
];

export function TitleOverlay({
  showcase,
  carryover,
  onSelectShowcase,
  onSelectCampaignMission,
  onStartMission,
  onJumpToPhase,
  onOpenNotebook,
  onOpenNasaModal,
  muted,
  onToggleMute,
}: TitleOverlayProps) {
  const activeMission = CAMPAIGN_MISSIONS[carryover.activeMission];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Subtle left calm scrim protecting title legibility over open 3D Moon/Rocket stage */}
      <div className="title-scrim pointer-events-none absolute inset-0" />

      {/* Top right utility buttons (Field Notebook, NASA Data, Mute) */}
      <div className="relative z-10 flex items-center justify-end gap-2 px-6 pt-5">
        <button
          type="button"
          onClick={onOpenNotebook}
          className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-amber-200 hover:border-amber-400/60"
        >
          <BookOpen className="h-3.5 w-3.5 text-amber-300" />
          Field Notebook ({carryover.unlockedFieldNotes.length})
        </button>

        <button
          type="button"
          onClick={onOpenNasaModal}
          className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-emerald-300 hover:border-emerald-400/60"
        >
          <Database className="h-3.5 w-3.5" />
          NASA OSDR & DONKI
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          title="Toggle Sound [M]"
          className="hud-panel pointer-events-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400/60"
        >
          {muted ? (
            <VolumeX className="h-4 w-4 text-slate-400" />
          ) : (
            <Volume2 className="h-4 w-4 text-sky-300" />
          )}
          <span className="keycap">M</span>
        </button>
      </div>

      {/* Left-aligned NASA Emblem + Title Lockup & Artemis II-IV -> Mars Campaign */}
      <div className="relative z-10 max-w-xl px-6 md:px-10">
        <div className="mb-2.5 flex items-center gap-3.5">
          <NASAInsignia size={54} className="shrink-0" />
          <div>
            <p className="text-[11px] font-bold tracking-[0.22em] text-sky-300 uppercase">
              Junior Astronaut Mission Trainer
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
              ARTEMIS ODYSSEY
            </h1>
          </div>
        </div>

        <p className="mb-4 max-w-md text-sm leading-relaxed text-slate-200">
          Fly NASA’s Artemis II–IV South Pole & Mars Jezero Campaign: deploy orbital satellites,
          land across 0.165g & 0.38g worlds, and reuse ISRU ice, fuel, and OSDR radiation knowledge.
        </p>

        {/* 4-Stage Campaign Selector */}
        <div className="pointer-events-auto mb-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold tracking-wider text-sky-300 uppercase">
            <span>Select NASA Campaign Mission</span>
            {carryover.completedMissions.length > 0 && (
              <span className="font-mono-tech text-emerald-300">
                {carryover.completedMissions.length}/4 Completed · {carryover.isruWaterKg}kg H₂O
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:max-w-lg">
            {CAMPAIGN_ORDER.map((id) => {
              const m = CAMPAIGN_MISSIONS[id];
              const active = carryover.activeMission === id;
              const done = carryover.completedMissions.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`campaign-btn-${id}`}
                  onClick={() => onSelectCampaignMission(id)}
                  className={`rounded-lg border px-2.5 py-2 text-left text-xs transition ${
                    active
                      ? 'border-amber-400 bg-amber-500/20 text-white'
                      : done
                        ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-200 hover:border-emerald-300'
                        : 'hud-panel text-slate-200 hover:border-sky-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-bold">
                    <span>{m.shortLabel}</span>
                    {done && <span className="font-mono-tech text-[10px] text-emerald-300">DONE</span>}
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 max-w-lg text-[11px] text-slate-300">
            <strong className="text-amber-300">{activeMission.code}:</strong>{' '}
            {activeMission.objectiveSummary}
          </p>
        </div>

        {/* Primary CTA */}
        <div className="pointer-events-auto mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStartMission}
            className="inline-flex items-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3.5 font-display text-base font-bold tracking-wide text-slate-950 shadow-lg transition hover:bg-amber-400 active:scale-[0.98]"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            BRIEF & LAUNCH MISSION
          </button>

          <button
            type="button"
            onClick={() => onJumpToPhase('inspector')}
            className="hud-panel inline-flex items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-sky-100 hover:border-sky-400/70 hover:bg-slate-800/90"
          >
            <Wrench className="h-4 w-4 text-sky-300" />
            Explore 3D Hardware
          </button>
        </div>

        {/* Direct Stage Jump Strip */}
        <div className="pointer-events-auto">
          <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold tracking-wider text-slate-300 uppercase">
            <Compass className="h-3.5 w-3.5 text-sky-300" />
            Jump Directly To Any Simulation Stage
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_STAGES.map((stage) => (
              <button
                key={stage.phase}
                type="button"
                onClick={() => onJumpToPhase(stage.phase)}
                className="hud-panel rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-amber-400/70 hover:text-amber-200"
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Strip: Control Hints + 3D Showcase Switcher */}
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 px-6 pb-5">
        <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-3 rounded-lg px-3.5 py-2 text-xs text-slate-200">
          <span className="inline-flex items-center gap-1.5">
            <span className="keycap">Enter</span> Start
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="keycap">WASD</span> Thrust / Steer / Drive
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="keycap">E / Space</span> Deploy Sat / Drill / Stage
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="keycap">Tab</span> Surface Map
          </span>
        </div>

        <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg p-1.5">
          <span className="px-2 text-[11px] font-bold text-slate-300 uppercase">
            <Rocket className="mr-1 inline h-3.5 w-3.5 text-sky-300" />
            3D View:
          </span>
          {SHOWCASE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectShowcase(opt.id)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                showcase === opt.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-200 hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
