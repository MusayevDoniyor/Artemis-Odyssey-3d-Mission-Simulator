import { BookOpen, Database, Play, Volume2, VolumeX } from 'lucide-react';
import missionPatchImg from '../assets/images/artemis_mission_patch_v2_1794686358129.jpg';
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
  { phase: 'inspector', label: 'Hardware' },
  { phase: 'launch', label: 'Launch' },
  { phase: 'space', label: 'Orbit & Sat' },
  { phase: 'landing', label: 'Descent' },
  { phase: 'rover', label: 'Rover' },
];

const MISSION_ROUTE_BADGE: Record<CampaignMissionId, string> = {
  'artemis-2': 'SLS Launch -> HERMES Sat -> Link Lock',
  'artemis-3': '0.165g Land -> 4 Crater Sites -> ISRU',
  'artemis-4': 'Lunar Orbit -> NRHO Gateway -> Storm Shield',
  'mars-pathfinder': '0.38g Entry -> Jezero Delta -> MOXIE O₂',
};

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
      {/* Left calm scrim protecting typography contrast over the live 3D showcase */}
      <div className="title-scrim pointer-events-none absolute inset-0" />

      {/* Top right utility buttons */}
      <div className="relative z-10 flex items-center justify-end gap-2 px-6 pt-5">
        <button
          type="button"
          onClick={onOpenNotebook}
          className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold tracking-wide whitespace-nowrap text-amber-200 uppercase transition hover:border-amber-400/70"
        >
          <BookOpen className="h-3.5 w-3.5 text-amber-300" />
          Ledger ({carryover.unlockedFieldNotes.length})
        </button>

        <button
          type="button"
          onClick={onOpenNasaModal}
          className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold tracking-wide whitespace-nowrap text-emerald-300 uppercase transition hover:border-emerald-400/70"
        >
          <Database className="h-3.5 w-3.5" />
          NASA OSDR &amp; DONKI
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          title="Toggle Sound [M]"
          className="hud-panel pointer-events-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/70"
        >
          {muted ? (
            <VolumeX className="h-4 w-4 text-slate-400" />
          ) : (
            <Volume2 className="h-4 w-4 text-cyan-300" />
          )}
          <span className="keycap">M</span>
        </button>
      </div>

      {/* Left-aligned NASA Emblem + Mission Patch + Title Lockup & Campaign */}
      <div className="relative z-10 max-w-xl px-6 md:px-10">
        <div className="mb-3 flex items-center gap-3.5">
          <div
            data-testid="title-mission-patch"
            className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-amber-400/60 bg-[#050811] shadow-[0_0_24px_rgba(34,211,238,0.22)]"
          >
            <img
              src={missionPatchImg}
              alt="Artemis Odyssey Official Mission Patch"
              referrerPolicy="no-referrer"
              className="h-full w-full scale-[1.18] object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <NASAInsignia size={22} className="shrink-0" />
              <p className="font-hud text-[11px] font-bold tracking-[0.24em] text-cyan-300 uppercase">
                NASA Flight Operations Simulator
              </p>
            </div>
            <h1 className="font-display text-4xl font-extrabold tracking-wide text-white uppercase md:text-5xl">
              ARTEMIS ODYSSEY
            </h1>
          </div>
        </div>

        <p className="mb-4 max-w-md text-sm text-slate-200">
          Fly SLS Block 1, deploy HERMES relay, land on Moon &amp; Mars, and reuse ISRU reserves.
        </p>

        {/* 4-Stage Campaign Selector */}
        <div className="pointer-events-auto mb-4">
          <div className="mb-1.5 flex items-center justify-between font-hud text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
            <span>Campaign Manifest</span>
            {carryover.completedMissions.length > 0 && (
              <span className="font-mono-tech text-emerald-300">
                {carryover.completedMissions.length}/4 CLEARED · {carryover.isruWaterKg}kg H₂O
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
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    active
                      ? 'border-amber-400 bg-amber-500/20 text-white shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                      : done
                        ? 'border-emerald-400/50 bg-emerald-500/12 text-emerald-200 hover:border-emerald-300'
                        : 'hud-panel text-slate-200 hover:border-cyan-400/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 font-hud font-bold tracking-wide">
                    <span>{m.shortLabel}</span>
                    {done && (
                      <span className="font-mono-tech text-[10px] text-emerald-300">DONE</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-2 max-w-lg rounded-lg border border-cyan-500/20 bg-slate-950/80 px-3 py-2 text-[11px]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-hud font-bold tracking-wide text-amber-300 uppercase">
                {activeMission.code}
              </span>
              <span className="font-mono-tech text-[10px] text-cyan-300">
                {MISSION_ROUTE_BADGE[activeMission.id]}
              </span>
            </div>
            <p className="mt-0.5 text-slate-200">{activeMission.objectiveSummary}</p>
          </div>
        </div>

        {/* Primary CTA */}
        <div className="pointer-events-auto mb-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStartMission}
            className="inline-flex items-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3.5 font-display text-sm font-bold tracking-wider whitespace-nowrap text-slate-950 uppercase shadow-lg transition hover:bg-amber-400 active:scale-[0.98]"
          >
            <Play className="h-4 w-4 fill-slate-950" />
            Brief &amp; Launch
          </button>

          <button
            type="button"
            onClick={() => onJumpToPhase('inspector')}
            className="hud-panel inline-flex items-center gap-2 rounded-xl px-4 py-3.5 font-hud text-sm font-bold tracking-wide whitespace-nowrap text-cyan-100 uppercase transition hover:border-cyan-400/75"
          >
            Hardware Bay
          </button>
        </div>

        {/* Direct Stage Jump Strip */}
        <div className="pointer-events-auto">
          <div className="mb-1.5 font-hud text-[11px] font-bold tracking-wider text-slate-400 uppercase">
            Quick Jump
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_STAGES.map((stage) => (
              <button
                key={stage.phase}
                type="button"
                onClick={() => onJumpToPhase(stage.phase)}
                className="hud-panel rounded-lg px-2.5 py-1.5 font-hud text-xs font-bold whitespace-nowrap text-slate-100 transition hover:border-amber-400/70 hover:text-amber-200"
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
            <span className="keycap">WASD</span> Fly / Drive
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="keycap">Space</span> Stage / Drill
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="keycap">Tab</span> Map
          </span>
        </div>

        <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-1 rounded-lg p-1.5">
          <span className="px-2 font-hud text-[11px] font-bold text-slate-400 uppercase">
            3D Model
          </span>
          {SHOWCASE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelectShowcase(opt.id)}
              className={`rounded-md px-2.5 py-1 font-hud text-xs font-bold whitespace-nowrap transition ${
                showcase === opt.id
                  ? 'bg-cyan-400 text-slate-950'
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
