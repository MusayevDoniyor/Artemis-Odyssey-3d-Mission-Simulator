import {
  ArrowDown,
  ArrowRight,
  Battery,
  BookOpen,
  Box,
  CircleDot,
  Clock,
  Compass,
  Mouse,
  Orbit,
  Radio,
  Rocket,
  Scale,
  Settings,
  Shield,
  Trophy,
  Wind,
  X,
} from 'lucide-react';
import { SOLAR_TARGETS } from '../game/constants';
import {
  PRIMARY_SOLAR_BAR_IDS,
  SOLAR_SYSTEM_BODIES,
  type SolarScaleMode,
  computeKeplerBodyPosition,
} from '../game/solarSystemData';
import type {
  CampaignMissionId,
  GameMenuTab,
  ResourceState,
  SpaceFlightState,
  SpaceTargetId,
} from '../game/types';
import { NASAInsignia } from './NASAInsignia';

interface SpaceFlightHUDProps {
  space: SpaceFlightState;
  resources: ResourceState;
  campaignMission: CampaignMissionId;
  donkiFlareActive: boolean;
  nasaOnline: boolean;
  freeExploreMode: boolean;
  focusedSolarBodyId: string | null;
  exploredSolarBodyIds: string[];
  selectedBodyPin: { xPct: number; yPct: number; visible: boolean } | null;
  solarScaleMode: SolarScaleMode;
  solarEpochYears: number;
  onFocusSolarBody: (bodyId: string | null) => void;
  onExploreSolarBody: (bodyId: string) => void;
  onOpenMenuTab: (tab: GameMenuTab) => void;
  onOpenBriefing: () => void;
  onOpenHardwareBay: () => void;
  onOpenNotebook: () => void;
  onOpenNasaModal: () => void;
  onToggleAutoPilot: () => void;
  onToggleShieldBoost: () => void;
  onCompleteSatelliteMission: () => void;
  onCompleteGatewayMission: () => void;
  onEnterLunarOrbit: () => void;
  onEnterMarsOrbit: () => void;
}

const PLANET_ART_STYLE: Record<string, { background: string; ring?: boolean; sunGlow?: boolean }> = {
  sun: {
    background:
      'radial-gradient(circle at 38% 35%, #fffbeb 0%, #fde047 26%, #f97316 68%, #c2410c 100%)',
    sunGlow: true,
  },
  mercury: {
    background:
      'radial-gradient(circle at 35% 32%, #e2e8f0 0%, #94a3b8 52%, #475569 100%)',
  },
  venus: {
    background:
      'radial-gradient(circle at 35% 32%, #fef3c7 0%, #eab308 48%, #b45309 100%)',
  },
  earth: {
    background:
      'radial-gradient(circle at 36% 34%, #e0f2fe 0%, #38bdf8 30%, #1d4ed8 68%, #0f172a 100%)',
  },
  mars: {
    background:
      'radial-gradient(circle at 35% 34%, #fdba74 0%, #ea580c 52%, #7c2d12 100%)',
  },
  jupiter: {
    background:
      'linear-gradient(165deg, #fde68a 0%, #d97706 24%, #fef3c7 42%, #b45309 58%, #f59e0b 78%, #78350f 100%)',
  },
  saturn: {
    background:
      'radial-gradient(circle at 38% 34%, #fef9c3 0%, #eab308 55%, #a16207 100%)',
    ring: true,
  },
  uranus: {
    background:
      'radial-gradient(circle at 35% 32%, #ecfeff 0%, #67e8f9 48%, #0e7490 100%)',
    ring: true,
  },
  neptune: {
    background:
      'radial-gradient(circle at 35% 32%, #93c5fd 0%, #2563eb 50%, #1e3a8a 100%)',
  },
  pluto: {
    background:
      'radial-gradient(circle at 35% 34%, #f1f5f9 0%, #cbd5e1 44%, #78716c 100%)',
  },
  ceres: {
    background:
      'radial-gradient(circle at 35% 34%, #e2e8f0 0%, #64748b 65%, #334155 100%)',
  },
  eris: {
    background:
      'radial-gradient(circle at 35% 34%, #ecfeff 0%, #a5f3fc 55%, #475569 100%)',
  },
  halley: {
    background:
      'radial-gradient(circle at 35% 34%, #f0f9ff 0%, #38bdf8 58%, #1e293b 100%)',
  },
};

function PlanetSphereThumb({ bodyId, size = 'sm' }: { bodyId: string; size?: 'sm' | 'lg' }) {
  const art = PLANET_ART_STYLE[bodyId] ?? PLANET_ART_STYLE.earth;
  const dim = size === 'lg' ? 'h-12 w-12' : 'h-8 w-8';

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${dim}`}>
      {art.sunGlow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full bg-amber-400/30"
        />
      )}
      <span
        className={`relative block ${dim} overflow-hidden rounded-full shadow-[inset_-4px_-4px_10px_rgba(2,6,23,0.65)]`}
        style={{ background: art.background }}
      >
        {bodyId === 'earth' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-85"
            style={{
              background:
                'radial-gradient(circle at 58% 42%, rgba(34,197,94,0.8) 0%, transparent 32%), radial-gradient(circle at 34% 62%, rgba(74,222,128,0.75) 0%, transparent 26%), radial-gradient(circle at 46% 26%, rgba(255,255,255,0.75) 0%, transparent 28%)',
            }}
          />
        )}
      </span>
      {art.ring && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[22deg] rounded-full border-2 ${
            bodyId === 'uranus' ? 'border-cyan-200/70' : 'border-amber-200/80'
          } ${size === 'lg' ? 'h-4 w-16' : 'h-2.5 w-11'}`}
        />
      )}
    </span>
  );
}

export function SpaceFlightHUD({
  space,
  resources,
  campaignMission,
  donkiFlareActive,
  nasaOnline,
  freeExploreMode,
  focusedSolarBodyId,
  exploredSolarBodyIds,
  selectedBodyPin,
  solarScaleMode,
  solarEpochYears,
  onFocusSolarBody,
  onExploreSolarBody,
  onOpenMenuTab,
  onOpenBriefing,
  onOpenHardwareBay,
  onOpenNotebook,
  onOpenNasaModal,
  onToggleAutoPilot,
  onToggleShieldBoost,
  onCompleteSatelliteMission,
  onCompleteGatewayMission,
  onEnterLunarOrbit,
  onEnterMarsOrbit,
}: SpaceFlightHUDProps) {
  const activeTarget = SOLAR_TARGETS[space.targetId];
  const distToTarget = Math.hypot(activeTarget.x - space.shipX, activeTarget.z - space.shipZ);
  const shipSpeed = Math.hypot(space.vx, space.vz);
  const sat = space.orbitalSat;
  const isMoving = shipSpeed > 0.4;

  const selectedBody = focusedSolarBodyId
    ? SOLAR_SYSTEM_BODIES.find((b) => b.id === focusedSolarBodyId) ?? null
    : null;

  const targetNames: Record<SpaceTargetId, string> = {
    'relay-orbit': 'HERMES Relay',
    moon: 'Moon Orbit',
    gateway: 'Lunar Gateway',
    mars: 'Mars Orbit',
  };

  let objectiveText = freeExploreMode
    ? 'Explore the Solar System and learn about the planets!'
    : `Fly Orion toward ${targetNames[space.targetId]}.`;
  if (!freeExploreMode) {
    if (space.targetId === 'relay-orbit' && space.inSatDeployZone && !sat.linkLocked) {
      objectiveText = 'Hold E or Space to deploy HERMES Relay.';
    } else if (sat.linkLocked && campaignMission === 'artemis-2') {
      objectiveText = 'HERMES Relay online. Complete mission below.';
    } else if (space.arrivedGateway && campaignMission === 'artemis-4') {
      objectiveText = 'Docked with Gateway. Complete mission below.';
    } else if (space.arrivedMoon) {
      objectiveText = 'Lunar orbit reached. Start powered descent.';
    } else if (space.arrivedMars) {
      objectiveText = 'Mars orbit reached. Begin atmospheric entry.';
    }
  }

  const mapDotPos = (bodyId: string) => {
    const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === bodyId);
    if (!spec) return { rx: 72, ry: 72, rOrbit: 0 };
    if (spec.id === 'sun') return { rx: 72, ry: 72, rOrbit: 0 };
    const pos = computeKeplerBodyPosition(spec, solarEpochYears, solarScaleMode, 0, 0);
    const maxUnits = solarScaleMode === 'scientific' ? 190 : 155;
    const normR = Math.min(54, (pos.orbitalRadius / maxUnits) * 54);
    const rx = 72 + Math.cos(pos.angleRad) * normR;
    const ry = 72 + Math.sin(pos.angleRad) * normR;
    return { rx, ry, rOrbit: normR };
  };

  const shipRelX = space.shipX - -48;
  const shipRelZ = space.shipZ - -36;
  const shipMax = solarScaleMode === 'scientific' ? 190 : 155;
  const shipNormDist = Math.min(54, (Math.hypot(shipRelX, shipRelZ) / shipMax) * 54);
  const shipAngle = Math.atan2(shipRelZ, shipRelX);
  const shipMapX = 72 + Math.cos(shipAngle) * shipNormDist;
  const shipMapY = 72 + Math.sin(shipAngle) * shipNormDist;

  const showArriveBtn =
    (space.inSatDeployZone && !sat.linkLocked) ||
    (sat.linkLocked && campaignMission === 'artemis-2') ||
    (space.arrivedGateway && campaignMission === 'artemis-4') ||
    space.arrivedMoon ||
    space.arrivedMars ||
    freeExploreMode;

  const showMetersGroup = !freeExploreMode || space.inRadiationZone || space.fuelPct < 35;

  const exploreButtonLabel =
    selectedBody?.id === 'mars'
      ? 'Explore Planet'
      : selectedBody?.id === 'earth'
        ? 'Explore Planet'
        : 'Inspect World';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 lg:px-6 lg:py-4">
      {/* Floating In-World Pin over Selected Planet */}
      {selectedBody && selectedBodyPin?.visible && (
        <div
          style={{
            left: `${Math.min(72, Math.max(18, selectedBodyPin.xPct))}%`,
            top: `${Math.min(74, Math.max(16, selectedBodyPin.yPct))}%`,
          }}
          className="pointer-events-none fixed z-10 -translate-x-1/2 -translate-y-full"
        >
          <div className="hud-soft flex flex-col items-center rounded-xl border-sky-400/55 px-4 py-1.5 text-base font-bold text-white shadow-xl">
            <span>{selectedBody.shortName}</span>
          </div>
          <div className="mx-auto -mt-0.5 h-0 w-0 border-x-[7px] border-t-[8px] border-x-transparent border-t-sky-400" />
        </div>
      )}

      {/* TOP AREA: Full Modern Navigation Header + Sub-Top Objective / Campaign Meters */}
      <div className="flex flex-col gap-3">
        {/* Top Bar matching New Reference */}
        <header className="flex items-center justify-between gap-3">
          {/* Left: Brand Logo */}
          <div className="pointer-events-auto flex items-center gap-3 drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)]">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 4L27 27H21.5L16 15.5L10.5 27H5L16 4Z" fill="#FFFFFF" />
              <path
                d="M6.5 22.5C12 18 20 15 28.5 16.5"
                stroke="#F59E0B"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <div className="h-7 w-px bg-white/20" />
            <div className="leading-tight">
              <span className="block font-display text-sm font-extrabold tracking-[0.14em] text-white">
                ARTEMIS
              </span>
              <span className="block font-display text-sm font-extrabold tracking-[0.14em] text-slate-200">
                ODYSSEY
              </span>
            </div>
          </div>

          {/* Center: Unified Navigation Bar */}
          <nav
            aria-label="Primary Solar Navigation"
            className="hud-soft pointer-events-auto flex items-center gap-1 rounded-2xl p-1.5"
          >
            <button
              type="button"
              onClick={() => onFocusSolarBody(focusedSolarBodyId || 'earth')}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/60 bg-amber-500/20 px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap text-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.16)]"
            >
              <Orbit className="h-4 w-4 text-amber-400" />
              Solar System
            </button>
            <button
              type="button"
              onClick={onOpenBriefing}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              <Rocket className="h-4 w-4 text-sky-300" />
              Missions
            </button>
            <button
              type="button"
              onClick={onOpenHardwareBay}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              <Box className="h-4 w-4 text-sky-300" />
              Hardware Bay
            </button>
            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              <BookOpen className="h-4 w-4 text-sky-300" />
              Astronaut Notebook
            </button>
            <button
              type="button"
              onClick={() => onOpenMenuTab('achievements')}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              <Trophy className="h-4 w-4 text-amber-300" />
              Achievements
            </button>
            <button
              type="button"
              onClick={() => onOpenMenuTab('settings')}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium whitespace-nowrap text-slate-200 transition hover:bg-white/5 hover:text-white"
            >
              <Settings className="h-4 w-4 text-slate-300" />
              Settings
            </button>
          </nav>

          {/* Right: NASA Data Online Status + Insignia */}
          <div className="pointer-events-auto flex items-center gap-2.5">
            <button
              type="button"
              onClick={onOpenNasaModal}
              className="hud-soft inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap text-slate-100 transition hover:border-sky-300/60"
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  nasaOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                }`}
              />
              <span>{nasaOnline ? 'Online' : 'Archived'}</span>
              <span className="text-slate-400">•</span>
              <span className="text-sky-200">NASA Data</span>
            </button>
            <NASAInsignia size={30} />
          </div>
        </header>

        {/* Sub-Top Row: Exploration Objective (Left) & Campaign Meters / Hazard Chip (Right) */}
        <div className="flex items-start justify-between gap-4">
          <section
            data-testid="hud-group-objective"
            className="hud-soft pointer-events-auto max-w-xs rounded-2xl px-4 py-3 text-slate-100"
          >
            <div className="flex items-center gap-2 text-base font-bold text-amber-400">
              <span className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-amber-400" />
              <span>{freeExploreMode ? 'Exploration Objective' : 'Deep Space Transit'}</span>
            </div>
            <div className="mt-1.5 flex items-end justify-between gap-4">
              <p className="text-base leading-snug text-slate-200">{objectiveText}</p>
              <span className="shrink-0 text-base font-bold text-white tabular-nums">
                {freeExploreMode
                  ? `${Math.min(10, exploredSolarBodyIds.length)} / 10`
                  : `${space.visitedTargets.length} / 4`}
              </span>
            </div>
          </section>

          {showMetersGroup && (
            <div data-testid="hud-group-meters" className="flex flex-col items-end gap-2">
              {!freeExploreMode && (
                <div className="hud-soft pointer-events-auto flex items-center divide-x divide-white/10 rounded-2xl px-4 py-2.5 tabular-nums">
                  <div className="flex items-center gap-2.5 pr-4">
                    <Battery
                      className={`h-5 w-5 ${resources.power <= 20 ? 'text-rose-400' : 'text-amber-400'}`}
                    />
                    <div>
                      <span className="block text-lg leading-none font-bold text-white">
                        {Math.round(resources.power)}%
                      </span>
                      <span className="text-sm text-slate-400">Power</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 px-4">
                    <Wind className="h-5 w-5 text-sky-300" />
                    <div>
                      <span className="block text-lg leading-none font-bold text-white">
                        {Math.round(resources.oxygen)}%
                      </span>
                      <span className="text-sm text-slate-400">Air</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 px-4">
                    <Shield
                      className={`h-5 w-5 ${resources.shield <= 20 ? 'text-rose-400' : 'text-amber-400'}`}
                    />
                    <div>
                      <span
                        className={`block text-lg leading-none font-bold ${
                          resources.shield <= 20 ? 'text-rose-400' : 'text-white'
                        }`}
                      >
                        {Math.round(resources.shield)}%
                      </span>
                      <span className="text-sm text-slate-400">Shield</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 pl-4">
                    <Compass className="h-5 w-5 text-amber-400" />
                    <div>
                      <span className="block text-lg leading-none font-bold text-white">
                        {Math.round(distToTarget)} u
                      </span>
                      <span className="text-sm text-slate-400">Target</span>
                    </div>
                  </div>
                </div>
              )}

              {(space.inRadiationZone || space.fuelPct < 35 || (!freeExploreMode && space.targetId === 'mars')) && (
                <div className="flex flex-wrap justify-end gap-2">
                  {!freeExploreMode && space.targetId === 'mars' && (
                    <span className="hud-soft rounded-xl px-3 py-1.5 text-sm font-semibold text-amber-200">
                      14m radio lag
                    </span>
                  )}
                  {space.fuelPct < 35 && (
                    <span className="hud-soft rounded-xl px-3 py-1.5 text-sm font-semibold text-amber-200">
                      Fuel {Math.round(space.fuelPct)}%
                    </span>
                  )}
                  {space.inRadiationZone && (
                    <button
                      type="button"
                      onClick={onToggleShieldBoost}
                      className="hud-soft-alert pointer-events-auto rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-200"
                    >
                      {donkiFlareActive ? 'Solar Storm' : 'Radiation Zone'} ·{' '}
                      {space.shieldBoostActive ? 'Shield On' : 'Enable Shield'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT-SIDE SELECTED PLANET INFO CARD */}
      {selectedBody && (
        <aside
          data-testid="solar-planet-info-card"
          className="hud-soft pointer-events-auto fixed top-1/2 right-6 z-10 w-80 -translate-y-1/2 rounded-2xl p-4 text-slate-100"
        >
          <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
            <div className="flex items-center gap-3">
              <PlanetSphereThumb bodyId={selectedBody.id} size="lg" />
              <div>
                <h2 className="text-xl leading-tight font-bold text-white">
                  {selectedBody.name}
                </h2>
                <p className="text-sm text-sky-300/90">{selectedBody.subtitle}</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Switch to Orion View"
              title="Back to Orion Camera"
              onClick={() => onFocusSolarBody(null)}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <dl className="mt-3 space-y-2 text-sm tabular-nums">
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-2 text-slate-400">
                <CircleDot className="h-4 w-4 text-sky-300" />
                Diameter
              </dt>
              <dd className="font-semibold text-white">{selectedBody.diameterDisplay}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-2 text-slate-400">
                <Scale className="h-4 w-4 text-sky-300" />
                Mass
              </dt>
              <dd className="font-semibold text-white">{selectedBody.massDisplay}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-2 text-slate-400">
                <ArrowDown className="h-4 w-4 text-sky-300" />
                Gravity
              </dt>
              <dd className="font-semibold text-white">{selectedBody.gravityDisplay}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-2 text-slate-400">
                <Clock className="h-4 w-4 text-sky-300" />
                Orbital Period
              </dt>
              <dd className="font-semibold text-white">{selectedBody.orbitalPeriodDisplay}</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="inline-flex items-center gap-2 text-slate-400">
                <Orbit className="h-4 w-4 text-sky-300" />
                Avg. Distance
              </dt>
              <dd className="font-semibold text-white">{selectedBody.avgDistanceDisplay}</dd>
            </div>
          </dl>

          <p className="mt-3 border-t border-white/10 pt-3 text-sm leading-relaxed text-slate-200">
            {selectedBody.fact}
          </p>

          <button
            type="button"
            data-testid="explore-planet-btn"
            onClick={() => onExploreSolarBody(selectedBody.id)}
            className="mt-3.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/70 bg-amber-500/20 px-4 py-2.5 text-base font-bold text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
          >
            <span>{exploreButtonLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </aside>
      )}

      {/* BOTTOM ROW: Circular Orbital Minimap (Left), Planet Bar + Actions (Center), Controls (Right) */}
      <div className="flex items-end justify-between gap-4">
        {/* Bottom-Left: Circular Solar System Minimap */}
        <button
          type="button"
          data-testid="hud-group-radar"
          onClick={() => onOpenMenuTab('map')}
          title="Open Full Solar Map [Tab]"
          className="hud-soft pointer-events-auto relative h-32 w-32 shrink-0 rounded-full p-1 transition hover:border-sky-300/70 lg:h-36 lg:w-36"
        >
          <svg viewBox="0 0 144 144" className="h-full w-full">
            <circle
              cx="72"
              cy="72"
              r="62"
              fill="#070c18"
              stroke="rgba(56,189,248,0.32)"
              strokeWidth="1.2"
            />
            <text x="72" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="#e2e8f0">
              N
            </text>

            {/* Concentric Orbit Rings */}
            {['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'].map(
              (id) => {
                const pt = mapDotPos(id);
                return (
                  <circle
                    key={`ring-${id}`}
                    cx="72"
                    cy="72"
                    r={pt.rOrbit}
                    fill="none"
                    stroke="rgba(148,163,184,0.22)"
                    strokeWidth="0.75"
                  />
                );
              }
            )}

            {/* Sun Core */}
            <circle cx="72" cy="72" r="7.5" fill="#fbbf24" />

            {/* Planet Dots */}
            {PRIMARY_SOLAR_BAR_IDS.filter((id) => id !== 'sun').map((id) => {
              const pt = mapDotPos(id);
              const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === id);
              const hex = spec ? `#${spec.color.toString(16).padStart(6, '0')}` : '#38bdf8';
              const isSelected = focusedSolarBodyId === id;
              return (
                <g key={`dot-${id}`}>
                  {isSelected && (
                    <circle
                      cx={pt.rx}
                      cy={pt.ry}
                      r="5.5"
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.3"
                    />
                  )}
                  <circle cx={pt.rx} cy={pt.ry} r={id === 'jupiter' ? 3.1 : 2.3} fill={hex} />
                </g>
              );
            })}

            {/* Orion Spacecraft Marker */}
            <circle cx={shipMapX} cy={shipMapY} r="2.6" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.2" />
          </svg>
        </button>

        {/* Bottom-Center: Contextual Transit Actions, Speed Pill & 10-World Selector Strip */}
        <div data-testid="hud-group-speed" className="flex flex-col items-center gap-2">
          {(showArriveBtn || isMoving) && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {space.inSatDeployZone && !sat.linkLocked && (
                <button
                  type="button"
                  data-testid="deploy-sat-btn"
                  data-hold-keys="action"
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg hover:bg-amber-400"
                >
                  <Radio className="h-4 w-4" />
                  Hold E to Deploy Relay ({Math.round((sat.solarDeployedPct + sat.dishAlignedPct) / 2)}%)
                </button>
              )}

              {sat.linkLocked && campaignMission === 'artemis-2' && (
                <button
                  type="button"
                  data-testid="complete-sat-mission-btn"
                  onClick={onCompleteSatelliteMission}
                  className="pointer-events-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg hover:bg-amber-400"
                >
                  Relay Locked — Complete Artemis II
                </button>
              )}

              {space.arrivedGateway && campaignMission === 'artemis-4' && (
                <button
                  type="button"
                  data-testid="complete-gateway-mission-btn"
                  onClick={onCompleteGatewayMission}
                  className="pointer-events-auto rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-slate-950 shadow-lg hover:bg-amber-400"
                >
                  Gateway Docked — Complete Artemis IV
                </button>
              )}

              {(space.arrivedMoon || freeExploreMode) && campaignMission !== 'mars-pathfinder' && (
                <button
                  type="button"
                  data-testid="land-moon-btn"
                  onClick={onEnterLunarOrbit}
                  className="hud-soft pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border-amber-400/50 px-3.5 py-1.5 text-sm font-bold text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Land on Moon
                </button>
              )}

              {(space.arrivedMars || freeExploreMode) && (
                <button
                  type="button"
                  data-testid="land-mars-btn"
                  onClick={onEnterMarsOrbit}
                  className="hud-soft pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border-amber-400/50 px-3.5 py-1.5 text-sm font-bold text-amber-300 transition hover:bg-amber-500 hover:text-slate-950"
                >
                  <Rocket className="h-3.5 w-3.5" />
                  Land on Mars
                </button>
              )}

              {isMoving && (
                <div className="hud-soft flex items-center gap-2.5 rounded-xl px-4 py-1.5 tabular-nums">
                  <span className="text-base font-bold text-white">{shipSpeed.toFixed(1)} u/s</span>
                  {space.autoPilot && (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">
                      Auto-Pilot
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 10-Body Circular Selector Bar matching Reference */}
          <div
            data-testid="solar-planet-strip"
            className="hud-soft pointer-events-auto flex items-center gap-1 rounded-2xl px-2.5 py-2"
          >
            {PRIMARY_SOLAR_BAR_IDS.map((bodyId) => {
              const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === bodyId);
              if (!spec) return null;
              const isSelected = focusedSolarBodyId === bodyId;
              const isSun = bodyId === 'sun';
              return (
                <button
                  key={bodyId}
                  type="button"
                  data-testid={`solar-bar-${bodyId}`}
                  onClick={() => onFocusSolarBody(bodyId)}
                  className={`flex min-w-[58px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition ${
                    isSelected
                      ? isSun
                        ? 'border border-amber-400/80 bg-amber-500/15 shadow-[0_0_14px_rgba(245,158,11,0.22)]'
                        : 'border border-sky-400/80 bg-sky-500/18 shadow-[0_0_14px_rgba(56,189,248,0.24)]'
                      : 'border border-transparent hover:bg-white/5'
                  }`}
                >
                  <PlanetSphereThumb bodyId={bodyId} size="sm" />
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`}
                  >
                    {spec.shortName}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom-Right: Minimalist Navigation Controls Card */}
        <div
          data-testid="hud-group-hints"
          className="hud-soft pointer-events-auto flex flex-col gap-2 rounded-2xl px-4 py-3 text-sm"
        >
          <button
            type="button"
            data-hold-keys="forward"
            className="flex items-center gap-3 text-left transition hover:text-amber-300"
          >
            <span className="inline-flex items-center gap-1">
              {['W', 'A', 'S', 'D'].map((k) => (
                <span
                  key={k}
                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-sky-400/45 bg-sky-500/10 text-[11px] font-bold text-white"
                >
                  {k}
                </span>
              ))}
            </span>
            <span className="font-medium text-slate-200">Navigate</span>
          </button>

          <div className="flex items-center gap-3 text-slate-200">
            <span className="inline-flex w-[92px] items-center gap-1.5 text-sky-300">
              <Mouse className="h-4 w-4 shrink-0" />
              <span className="text-xs font-semibold text-white">Click</span>
            </span>
            <span className="font-medium text-slate-300">Select</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-slate-200">
            <div className="flex items-center gap-3">
              <span className="inline-flex w-[92px] items-center gap-1.5 text-sky-300">
                <Mouse className="h-4 w-4 shrink-0" />
                <span className="text-xs font-semibold text-white">Scroll</span>
              </span>
              <span className="font-medium text-slate-300">Zoom</span>
            </div>
            {!freeExploreMode && (
              <button
                type="button"
                onClick={onToggleAutoPilot}
                className="rounded-md border border-amber-400/45 bg-amber-500/15 px-2 py-0.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
              >
                G {space.autoPilot ? 'Auto On' : 'Auto'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
