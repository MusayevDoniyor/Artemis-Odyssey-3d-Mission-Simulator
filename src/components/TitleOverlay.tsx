import {
  ArrowRight,
  Battery,
  BookOpen,
  Box,
  ChevronRight,
  Compass,
  Globe,
  Mouse,
  Music,
  Orbit,
  Play,
  Rocket,
  RotateCcw,
  Settings,
  Sliders,
  Thermometer,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import { useState } from 'react';
import type { MusicState } from '../game/audio';
import { CAMPAIGN_MISSIONS, CAMPAIGN_ORDER } from '../game/constants';
import { SOLAR_SYSTEM_BODIES } from '../game/solarSystemData';
import type {
  AudioSettings,
  CampaignCarryoverState,
  CampaignMissionId,
  DonkiStatus,
  GameMenuTab,
  GamePhase,
  OsdrStatus,
  QualityPreset,
  VehicleShowcaseId,
} from '../game/types';
import { AudioQualityPopover } from './AudioQualityPopover';
import { NASAInsignia } from './NASAInsignia';
import { GatewayStationThumb, PlanetThumb } from './PlanetThumb';

interface TitleOverlayProps {
  showcase: VehicleShowcaseId;
  carryover: CampaignCarryoverState;
  donki: DonkiStatus;
  osdr: OsdrStatus;
  audioSettings: AudioSettings;
  musicState?: MusicState;
  qualityPreset: QualityPreset;
  onUpdateAudio: (partial: Partial<AudioSettings>) => void;
  onToggleMusic?: () => void;
  onChangeMusicVolume?: (vol: number) => void;
  onUnlockAudio?: () => void;
  onChangeQuality: (quality: QualityPreset) => void;
  onSelectShowcase: (v: VehicleShowcaseId) => void;
  onSetCameraPreset: (yaw: number, pitch: number) => void;
  onZoomCamera: (delta: number) => void;
  onResetCamera: () => void;
  onSelectCampaignMission: (id: CampaignMissionId) => void;
  onStartMission: () => void;
  onStartFreeExplore: () => void;
  onExploreWorld: (bodyId: string) => void;
  onJumpToPhase: (phase: GamePhase) => void;
  onOpenBriefing: () => void;
  onOpenNotebook: () => void;
  onOpenNasaModal: () => void;
  onOpenMenuTab: (tab: GameMenuTab) => void;
  muted: boolean;
  onToggleMute: () => void;
}

const SHOWCASE_OPTIONS: Array<{ id: VehicleShowcaseId; label: string }> = [
  { id: 'outpost', label: 'Moon Base' },
  { id: 'rocket', label: 'SLS Rocket' },
  { id: 'satellite', label: 'HERMES Sat' },
  { id: 'jwst', label: 'JWST' },
  { id: 'voyager', label: 'Voyager' },
  { id: 'lander', label: 'Lander' },
  { id: 'rover', label: 'Rover' },
];

const QUICK_STAGES: Array<{ phase: GamePhase; label: string }> = [
  { phase: 'inspector', label: 'Hardware' },
  { phase: 'launch', label: 'Launch' },
  { phase: 'space', label: 'Solar System' },
  { phase: 'landing', label: 'Descent' },
  { phase: 'rover', label: 'Rover' },
];

const CAMPAIGN_CARD_META: Record<
  CampaignMissionId,
  { num: number; name: string; destination: string; planetThumb?: string }
> = {
  'artemis-2': {
    num: 1,
    name: 'Artemis II',
    destination: 'Earth → LLO',
    planetThumb: 'earth',
  },
  'artemis-3': {
    num: 2,
    name: 'Artemis III',
    destination: 'Moon South Pole',
    planetThumb: 'moon',
  },
  'artemis-4': {
    num: 3,
    name: 'Artemis IV',
    destination: 'Lunar Gateway',
  },
  'mars-pathfinder': {
    num: 4,
    name: 'Mars Expedition',
    destination: 'Jezero Crater',
    planetThumb: 'mars',
  },
};

const CAMPAIGN_DESTINATION_BODY: Record<CampaignMissionId, string> = {
  'artemis-2': 'earth',
  'artemis-3': 'moon',
  'artemis-4': 'moon',
  'mars-pathfinder': 'mars',
};

const CAROUSEL_PAGE_ONE = ['earth', 'moon', 'mars', 'jupiter', 'saturn'];
const CAROUSEL_PAGE_TWO = ['sun', 'mercury', 'venus', 'uranus', 'neptune', 'pluto'];

export function TitleOverlay({
  showcase,
  carryover,
  donki,
  osdr,
  audioSettings,
  musicState,
  qualityPreset,
  onUpdateAudio,
  onToggleMusic,
  onChangeMusicVolume,
  onUnlockAudio,
  onChangeQuality,
  onSelectShowcase,
  onResetCamera,
  onSelectCampaignMission,
  onStartMission,
  onStartFreeExplore,
  onExploreWorld,
  onJumpToPhase,
  onOpenBriefing,
  onOpenNotebook,
  onOpenNasaModal,
  onOpenMenuTab,
  muted,
  onToggleMute,
}: TitleOverlayProps) {
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('moon');
  const [carouselPage, setCarouselPage] = useState<0 | 1>(0);
  const [quickToolsOpen, setQuickToolsOpen] = useState(false);

  const activeMission = CAMPAIGN_MISSIONS[carryover.activeMission];
  const nasaLive = donki.isLive || osdr.isLive;
  const visibleCarouselIds = carouselPage === 0 ? CAROUSEL_PAGE_ONE : CAROUSEL_PAGE_TWO;
  const selectedPlanet =
    SOLAR_SYSTEM_BODIES.find((b) => b.id === selectedPlanetId) ??
    SOLAR_SYSTEM_BODIES.find((b) => b.id === 'moon')!;

  const handleCycleCarousel = () => {
    const nextPage = carouselPage === 0 ? 1 : 0;
    setCarouselPage(nextPage);
    const nextList = nextPage === 0 ? CAROUSEL_PAGE_ONE : CAROUSEL_PAGE_TWO;
    if (!nextList.includes(selectedPlanetId)) {
      setSelectedPlanetId(nextList[0]);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* Subtle Left + Edge Scrim leaving Moon Base & Earthrise vivid */}
      <div className="title-scrim pointer-events-none absolute inset-0" />

      {/* TOP BAR + LUNAR ENVIRONMENTAL READOUT */}
      <div className="relative z-20 flex flex-col gap-2 px-5 pt-4 lg:px-7">
        <header className="flex items-center justify-between gap-3">
          {/* Left: NASA Insignia + ARTEMIS ODYSSEY Wordmark */}
          <div className="pointer-events-auto flex items-center gap-3 drop-shadow-[0_2px_14px_rgba(0,0,0,0.85)]">
            <NASAInsignia size={38} className="shrink-0" />
            <div className="leading-none">
              <span className="block font-display text-sm font-extrabold tracking-[0.16em] text-white">
                ARTEMIS
              </span>
              <span className="mt-0.5 block font-display text-sm font-extrabold tracking-[0.16em] text-cyan-300">
                ODYSSEY
              </span>
            </div>
          </div>

          {/* Center: Single-Row Midnight Glass Navigation */}
          <nav
            aria-label="Primary Navigation"
            className="hud-soft pointer-events-auto flex items-center gap-0.5 rounded-2xl p-1"
          >
            <button
              type="button"
              onClick={onStartFreeExplore}
              className="hud-nav-active inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition lg:text-sm"
            >
              <Globe className="h-4 w-4 text-cyan-300" />
              Solar System
            </button>

            <span className="hidden h-4 w-px bg-sky-400/20 xl:block" />

            <button
              type="button"
              onClick={onOpenBriefing}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:text-sm"
            >
              <Rocket className="h-4 w-4 text-sky-300" />
              Missions
            </button>

            <span className="hidden h-4 w-px bg-sky-400/20 xl:block" />

            <button
              type="button"
              onClick={() => onJumpToPhase('inspector')}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:text-sm"
            >
              <Box className="h-4 w-4 text-sky-300" />
              Hardware Bay
            </button>

            <span className="hidden h-4 w-px bg-sky-400/20 xl:block" />

            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:text-sm"
            >
              <BookOpen className="h-4 w-4 text-sky-300" />
              Astronaut Notebook
              {carryover.unlockedFieldNotes.length > 0 && (
                <span className="rounded-md bg-cyan-500/20 px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-cyan-200">
                  {carryover.unlockedFieldNotes.length}
                </span>
              )}
            </button>

            <span className="hidden h-4 w-px bg-sky-400/20 xl:block" />

            <button
              type="button"
              onClick={() => onOpenMenuTab('achievements')}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:text-sm"
            >
              <Trophy className="h-4 w-4 text-cyan-300" />
              Achievements
            </button>

            <span className="hidden h-4 w-px bg-sky-400/20 xl:block" />

            <button
              type="button"
              onClick={() => onOpenMenuTab('settings')}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white lg:text-sm"
            >
              <Settings className="h-4 w-4 text-slate-300" />
              Settings
            </button>
          </nav>

          {/* Right: Live NASA Data Status + Ambient Music + Mute */}
          <div className="pointer-events-auto flex items-center gap-2">
            {musicState?.audioBlocked && musicState.musicEnabled && !muted && onUnlockAudio && (
              <button
                type="button"
                data-testid="enable-audio-btn"
                onClick={onUnlockAudio}
                className="hud-cta-cyan inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-hud text-[11px] font-bold tracking-wider uppercase shadow-[0_0_16px_rgba(34,211,238,0.4)]"
              >
                <Volume2 className="h-3.5 w-3.5" />
                ENABLE AUDIO
              </button>
            )}

            <button
              type="button"
              onClick={onOpenNasaModal}
              className="hud-soft inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap text-slate-100 transition hover:border-cyan-400/70"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  nasaLive
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                }`}
              />
              <span className={nasaLive ? 'text-emerald-200' : 'text-amber-200'}>
                {nasaLive ? 'NASA Data Connected' : 'NASA Data Archived'}
              </span>
            </button>

            {onToggleMusic && (
              <div className="hud-soft hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-200 sm:flex">
                <button
                  type="button"
                  data-testid="title-music-toggle-btn"
                  onClick={onToggleMusic}
                  title={musicState?.musicEnabled ? 'Mute Ambient Music' : 'Enable Ambient Music'}
                  className="inline-flex items-center gap-1.5 transition hover:text-cyan-300"
                >
                  <Music
                    className={`h-3.5 w-3.5 ${
                      musicState?.musicEnabled && !muted ? 'text-cyan-300' : 'text-slate-500'
                    }`}
                  />
                  <span>{musicState?.musicEnabled ? 'Music' : 'Off'}</span>
                </button>
                {onChangeMusicVolume && musicState?.musicEnabled && (
                  <input
                    type="range"
                    aria-label="Ambient Music Volume"
                    min={0}
                    max={1}
                    step={0.02}
                    value={musicState.musicVolume}
                    onChange={(e) => onChangeMusicVolume(Number(e.target.value))}
                    className="h-1 w-14 cursor-pointer accent-cyan-400"
                  />
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              title="Toggle Sound [M]"
              className="hud-soft inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/60"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-slate-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-cyan-300" />
              )}
              <span className="keycap">M</span>
            </button>
          </div>
        </header>

        {/* Sub-Top Right Lunar Base Reference Spec Chip */}
        <div className="flex justify-end">
          <div className="hud-soft pointer-events-auto inline-flex items-center divide-x divide-sky-400/20 rounded-full px-4 py-1.5 font-mono-tech text-xs font-semibold text-slate-100 tabular-nums">
            <span
              className="inline-flex items-center gap-1.5 pr-3"
              title="Nominal Outpost Power Bus Readiness"
            >
              <Battery className="h-3.5 w-3.5 text-emerald-400" />
              <span>100%</span>
            </span>
            <span
              className="inline-flex items-center gap-1.5 px-3"
              title="Lunar South Pole Night / Crater Average"
            >
              <Thermometer className="h-3.5 w-3.5 text-cyan-300" />
              <span>-173°C</span>
            </span>
            <span
              className="inline-flex items-center gap-1.5 pl-3"
              title="Mean Earth–Moon Orbital Distance"
            >
              <Orbit className="h-3.5 w-3.5 text-sky-300" />
              <span>384,400 km</span>
            </span>
          </div>
        </div>
      </div>

      {/* LEFT HERO COLUMN */}
      <div className="relative z-10 max-w-[495px] px-6 lg:px-9">
        {/* Eyebrow */}
        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
          <p className="font-hud text-[11px] font-bold tracking-[0.26em] text-cyan-300 uppercase">
            NASA Flight Operations Simulator
          </p>
        </div>

        {/* Title Lockup with Cyan Orbital Swoosh + Official Mission Patch */}
        <div className="relative mb-3 flex items-center gap-3.5">
          <svg
            width="64"
            height="68"
            viewBox="0 0 64 68"
            fill="none"
            aria-hidden="true"
            className="pointer-events-none -ml-2 shrink-0"
          >
            <path
              d="M52 12C24 14 8 31 12 49C15 61 31 64 46 57"
              stroke="#22d3ee"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d="M16 42C24 27 40 19 56 17"
              stroke="#38bdf8"
              strokeWidth="1.4"
              strokeOpacity="0.65"
              strokeLinecap="round"
            />
            <circle cx="15" cy="40" r="2.8" fill="#67e8f9" />
            <circle cx="49" cy="14" r="2.2" fill="#e0f2fe" />
          </svg>

          <div className="-ml-5 min-w-0 flex-1 leading-[0.95]">
            <h1 className="font-display text-4xl font-extrabold tracking-[0.04em] text-white uppercase drop-shadow-[0_4px_24px_rgba(34,211,238,0.28)] xl:text-[46px]">
              ARTEMIS
              <span className="mt-0.5 block bg-gradient-to-r from-cyan-300 via-sky-300 to-cyan-500 bg-clip-text text-transparent">
                ODYSSEY
              </span>
            </h1>
          </div>
        </div>

        <p className="mb-4 max-w-[430px] text-sm leading-relaxed text-slate-200/95">
          Launch SLS, explore the Moon and Mars, and experience the next chapter of space exploration.
        </p>

        {/* CAMPAIGN MISSIONS 2×2 Interactive Card Panel */}
        <section className="hud-soft pointer-events-auto mb-3.5 rounded-2xl p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-2 font-hud text-[11px] font-bold tracking-[0.18em] text-cyan-200 uppercase">
              <span className="inline-block h-2 w-2 rotate-45 rounded-[1px] bg-cyan-400" />
              <span>Campaign Missions</span>
            </div>
            {carryover.completedMissions.length > 0 && (
              <span className="font-mono-tech text-[10px] font-bold text-emerald-300">
                {carryover.completedMissions.length}/4 CLEARED · {carryover.isruWaterKg}kg H₂O
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CAMPAIGN_ORDER.map((id) => {
              const meta = CAMPAIGN_CARD_META[id];
              const active = carryover.activeMission === id;
              const done = carryover.completedMissions.includes(id);

              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`campaign-btn-${id}`}
                  onClick={() => {
                    onSelectCampaignMission(id);
                    const destBody = CAMPAIGN_DESTINATION_BODY[id];
                    if (destBody) {
                      setSelectedPlanetId(destBody);
                      setCarouselPage(0);
                    }
                  }}
                  className={`group flex items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition ${
                    active
                      ? 'border-cyan-400 bg-cyan-500/16 shadow-[0_0_22px_rgba(34,211,238,0.26)]'
                      : done
                        ? 'border-emerald-400/50 bg-emerald-500/10 hover:border-emerald-300'
                        : 'border-sky-400/20 bg-slate-950/65 hover:border-cyan-400/55 hover:bg-slate-900/80'
                  }`}
                >
                  {meta.planetThumb ? (
                    <PlanetThumb bodyId={meta.planetThumb} size="sm" />
                  ) : (
                    <GatewayStationThumb sizeClass="h-8 w-8" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span
                        className={`truncate font-hud text-xs font-bold ${
                          active ? 'text-white' : 'text-slate-100'
                        }`}
                      >
                        {meta.num}. {meta.name}
                      </span>
                      {done && (
                        <span className="rounded bg-emerald-500/25 px-1 font-mono-tech text-[9px] font-bold text-emerald-300">
                          DONE
                        </span>
                      )}
                    </div>
                    <div
                      className={`truncate text-[11px] ${
                        active ? 'text-cyan-200' : 'text-slate-400'
                      }`}
                    >
                      {meta.destination}
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 transition ${
                      active
                        ? 'text-cyan-300'
                        : 'text-slate-500 group-hover:translate-x-0.5 group-hover:text-cyan-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* Concise Active Objective Readout */}
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-sky-400/15 bg-slate-950/75 px-3 py-1.5 text-[11px]">
            <span className="truncate text-slate-200">
              <strong className="font-hud text-cyan-300 uppercase">{activeMission.code}: </strong>
              {activeMission.objectiveSummary}
            </span>
          </div>
        </section>

        {/* Primary Action CTAs: BRIEF & LAUNCH / EXPLORE / HARDWARE BAY */}
        <div className="pointer-events-auto flex flex-col gap-2">
          <div className="grid grid-cols-[1.28fr_1fr] gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onStartMission}
              className="hud-cta-cyan inline-flex items-center justify-between gap-2 rounded-xl px-4 py-3 font-display text-sm font-bold tracking-wider whitespace-nowrap uppercase transition active:scale-[0.985]"
            >
              <span className="inline-flex items-center gap-2">
                <Play className="h-4 w-4 fill-white" />
                Brief &amp; Launch
              </span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              data-testid="free-explore-btn"
              onClick={onStartFreeExplore}
              className="hud-btn-glass inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-hud text-sm font-bold tracking-wider whitespace-nowrap uppercase transition active:scale-[0.985]"
            >
              <Compass className="h-4 w-4 text-cyan-300" />
              Explore
            </button>
          </div>

          <button
            type="button"
            onClick={() => onJumpToPhase('inspector')}
            className="hud-btn-glass inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-hud text-sm font-bold tracking-wider whitespace-nowrap uppercase transition active:scale-[0.99]"
          >
            <Wrench className="h-4 w-4 text-cyan-300" />
            Hardware Bay
          </button>

          {/* Compact Expandable Quick Jump & 3D Preview Drawer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setQuickToolsOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-hud text-[11px] font-semibold text-cyan-300/90 transition hover:bg-cyan-500/10 hover:text-cyan-200"
            >
              <Sliders className="h-3.5 w-3.5" />
              {quickToolsOpen ? 'Hide 3D Preview & Quick Jump' : '3D Preview & Quick Jump'}
            </button>

            <AudioQualityPopover
              audio={audioSettings}
              quality={qualityPreset}
              onUpdateAudio={onUpdateAudio}
              onChangeQuality={onChangeQuality}
            />
          </div>

          {quickToolsOpen && (
            <div className="hud-panel animate-modal-enter space-y-2 rounded-xl p-2.5 text-xs">
              <div>
                <div className="mb-1 font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Direct Stage Jump
                </div>
                <div className="flex flex-wrap gap-1">
                  {QUICK_STAGES.map((stage) => (
                    <button
                      key={stage.phase}
                      type="button"
                      onClick={() => onJumpToPhase(stage.phase)}
                      className="rounded-lg border border-sky-400/20 bg-slate-900/80 px-2.5 py-1 font-hud text-[11px] font-bold text-slate-200 hover:border-cyan-400 hover:text-cyan-200"
                    >
                      {stage.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Backdrop 3D Model
                </div>
                <div className="flex flex-wrap gap-1">
                  {SHOWCASE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onSelectShowcase(opt.id)}
                      className={`rounded-lg px-2 py-1 font-hud text-[11px] font-bold transition ${
                        showcase === opt.id
                          ? 'bg-cyan-400 text-slate-950'
                          : 'border border-sky-400/20 bg-slate-900/80 text-slate-200 hover:border-cyan-400/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM STRIP: Controls (Left), Planet Selector Carousel (Center), Selected Planet Card (Right) */}
      <div className="relative z-10 flex items-end justify-between gap-4 px-5 pb-4 lg:px-7">
        {/* Bottom-Left Controls Hint + Reset Camera Orbit */}
        <div className="hud-soft pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs text-slate-200">
          <span className="inline-flex items-center gap-1">
            {['W', 'A', 'S', 'D'].map((k) => (
              <span key={k} className="keycap">
                {k}
              </span>
            ))}
            <span className="ml-1 font-medium text-slate-300">Navigate</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-300">
            <Mouse className="h-3.5 w-3.5 text-cyan-300" />
            <span className="font-semibold text-white">Drag</span> Orbit
          </span>
          <button
            type="button"
            data-testid="title-reset-view-btn"
            onClick={onResetCamera}
            title="Reset Cinematic Orbit Camera"
            className="inline-flex items-center gap-1 rounded-lg border border-sky-400/25 bg-slate-900/75 px-2 py-1 font-hud text-[11px] font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-white"
          >
            <RotateCcw className="h-3 w-3" />
            Reset View
          </button>
        </div>

        {/* Bottom-Center Interactive Planet Selector Pill */}
        <div
          data-testid="title-planet-selector"
          className="hud-soft pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-2 shadow-[0_12px_36px_rgba(2,6,23,0.75)]"
        >
          {visibleCarouselIds.map((bodyId) => {
            const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === bodyId);
            if (!spec) return null;
            const active = selectedPlanetId === bodyId;
            return (
              <button
                key={bodyId}
                type="button"
                data-testid={`title-planet-btn-${bodyId}`}
                aria-label={`Select ${spec.name}`}
                title={`${spec.name} · ${spec.gravityDisplay}`}
                onClick={() => setSelectedPlanetId(bodyId)}
                className={`relative flex h-11 w-11 items-center justify-center rounded-full transition ${
                  active
                    ? 'scale-110 ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#050811] shadow-[0_0_22px_rgba(34,211,238,0.55)]'
                    : 'opacity-85 hover:scale-105 hover:opacity-100'
                }`}
              >
                <PlanetThumb bodyId={bodyId} size="md" />
              </button>
            );
          })}

          <button
            type="button"
            aria-label="More Solar System Worlds"
            title="Show more worlds"
            onClick={handleCycleCarousel}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/25 bg-slate-900/75 text-cyan-300 transition hover:border-cyan-400 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Bottom-Right Selected Planet Info Card */}
        <aside
          data-testid="title-planet-info-card"
          className="hud-soft pointer-events-auto w-72 shrink-0 rounded-2xl p-3.5 text-slate-100"
        >
          <div className="flex items-start gap-3">
            <PlanetThumb bodyId={selectedPlanet.id} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-base leading-tight font-bold text-white">
                {selectedPlanet.id === 'moon' ? 'The Moon' : selectedPlanet.name}
              </h2>
              <p className="mt-0.5 font-mono-tech text-[11px] font-semibold text-cyan-300">
                {selectedPlanet.gravityG}g · {selectedPlanet.avgDistanceDisplay}
              </p>
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-300">
                {selectedPlanet.fact}
              </p>
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              data-testid="title-explore-planet-btn"
              onClick={() => onExploreWorld(selectedPlanet.id)}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/65 bg-cyan-500/18 px-3.5 py-1.5 font-hud text-xs font-bold tracking-wide text-cyan-100 transition hover:bg-cyan-400 hover:text-slate-950"
            >
              <span>Explore Planet</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
