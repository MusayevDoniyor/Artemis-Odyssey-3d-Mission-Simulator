import { Compass, Database, MapPin, Play, Rocket, Shield, Volume2, VolumeX, Wrench } from 'lucide-react';
import type { DonkiStatus, GamePhase, VehicleShowcaseId } from '../game/types';

interface TitleOverlayProps {
  showcase: VehicleShowcaseId;
  onSelectShowcase: (v: VehicleShowcaseId) => void;
  onStartMission: () => void;
  onJumpToPhase: (phase: GamePhase) => void;
  onOpenNasaModal: () => void;
  donki: DonkiStatus;
  muted: boolean;
  onToggleMute: () => void;
}

const SHOWCASE_OPTIONS: Array<{ id: VehicleShowcaseId; label: string }> = [
  { id: 'outpost', label: 'Moon Base' },
  { id: 'rocket', label: 'SLS Rocket' },
  { id: 'lander', label: 'Lunar Lander' },
  { id: 'rover', label: 'VIPER Rover' },
];

const QUICK_STAGES: Array<{ phase: GamePhase; label: string }> = [
  { phase: 'inspector', label: 'Inspect Parts' },
  { phase: 'launch', label: 'Rocket Launch' },
  { phase: 'space', label: 'Space Flight' },
  { phase: 'landing', label: 'Moon Landing' },
  { phase: 'rover', label: 'Rover & Base' },
];

export function TitleOverlay({
  showcase,
  onSelectShowcase,
  onStartMission,
  onJumpToPhase,
  onOpenNasaModal,
  donki,
  muted,
  onToggleMute,
}: TitleOverlayProps) {
  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Subtle left calm scrim protecting title legibility over open 3D Moon/Rocket stage */}
      <div className="title-scrim pointer-events-none absolute inset-0" />

      {/* Top minimal utility corner */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5">
        <div className="hud-panel pointer-events-auto flex items-center gap-3 rounded-lg px-3.5 py-2 text-xs text-slate-200">
          <Shield className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-amber-200">NASA Space Weather:</span>
          <span className="font-mono-tech text-slate-100">{donki.classType}</span>
          <button
            type="button"
            onClick={onOpenNasaModal}
            className="ml-1 inline-flex items-center gap-1 rounded bg-sky-500/20 px-2 py-0.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/35"
          >
            <Database className="h-3 w-3" />
            NASA Data & Map
          </button>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          title="Toggle Sound [M]"
          className="hud-panel pointer-events-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400/60"
        >
          {muted ? <VolumeX className="h-4 w-4 text-slate-400" /> : <Volume2 className="h-4 w-4 text-sky-300" />}
          <span className="keycap">M</span>
        </button>
      </div>

      {/* Left-aligned Title Lockup & Mission Controls */}
      <div className="relative z-10 max-w-xl px-6 md:px-10">
        {/* Custom Inline SVG Emblem Lockup */}
        <div className="mb-3 flex items-center gap-3">
          <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="22" stroke="#38BDF8" strokeWidth="2" strokeOpacity="0.65" />
            <path d="M12 34L24 10L36 34H29L24 23L19 34H12Z" fill="#F8FAFC" />
            <path d="M9 28C16 22 31 20 40 24" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="35" cy="14" r="3" fill="#38BDF8" />
          </svg>
          <div>
            <p className="text-[11px] font-bold tracking-[0.22em] text-sky-300 uppercase">
              Junior Astronaut Mission Trainer
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight text-white md:text-5xl">
              ARTEMIS ODYSSEY
            </h1>
          </div>
        </div>

        <p className="mb-5 max-w-md text-sm leading-relaxed text-slate-200">
          Launch from Pad 39B, fly past solar storms, land on the Moon’s South Pole, and drive the
          VIPER rover — balancing real NASA trade-offs between Power, Oxygen, and Shielding.
        </p>

        {/* Primary CTA */}
        <div className="pointer-events-auto mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onStartMission}
            className="inline-flex items-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3.5 font-display text-base font-bold tracking-wide text-slate-950 shadow-lg transition hover:bg-amber-400 active:scale-[0.98]"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            START MISSION
          </button>

          <button
            type="button"
            onClick={() => onJumpToPhase('inspector')}
            className="hud-panel inline-flex items-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold text-sky-100 hover:border-sky-400/70 hover:bg-slate-800/90"
          >
            <Wrench className="h-4 w-4 text-sky-300" />
            Explore 3D Ship Parts
          </button>
        </div>

        {/* Direct Stage Jump Strip (for kids & hackathon judges) */}
        <div className="pointer-events-auto">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-wider text-slate-300 uppercase">
            <Compass className="h-3.5 w-3.5 text-sky-300" />
            Jump Directly To Any Stage
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_STAGES.map((stage) => (
              <button
                key={stage.phase}
                type="button"
                onClick={() => onJumpToPhase(stage.phase)}
                className="hud-panel rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-amber-400/70 hover:text-amber-200"
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
            <span className="keycap">Space</span> Stage / Brake / Drill
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="keycap">C</span> Camera
          </span>
        </div>

        <div className="hud-panel pointer-events-auto flex items-center gap-1.5 rounded-lg p-1.5">
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
