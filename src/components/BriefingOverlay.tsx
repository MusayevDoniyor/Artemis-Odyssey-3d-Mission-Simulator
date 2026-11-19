import {
  AlertTriangle,
  ArrowLeft,
  Battery,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Database,
  Drill,
  Fuel,
  Lock,
  Radio,
  Rocket,
  Shield,
  ShieldCheck,
  Sun,
  Wind,
} from 'lucide-react';
// In-engine 3D render of SLS Block 1 & LC-39B Mobile Launcher on pad
const artemis2PadBanner = '/assets/banners/artemis2-sls-pad.jpg';
import architectureImg from '../assets/images/mission_architecture_diagram_v2_1794685546954.jpg';
import viperLanderImg from '../assets/images/viper_lander_showcase_1794685527556.jpg';
import { NASAInsignia } from './NASAInsignia';
import { Button, Panel, StatusPill } from './ui';
import { CAMPAIGN_MISSIONS, CAMPAIGN_ORDER } from '../game/constants';
import {
  MISSION_BRIEFING_META,
  evaluateBriefingMissionStatus,
  getMissionEquipmentList,
  getMissionEquipmentOption,
  getMissionStartingResources,
  type EquipmentVisualKind,
  type MissionEquipmentOption,
  type MissionRouteNode,
} from '../game/missionBriefing';
import type {
  CampaignCarryoverState,
  CampaignMissionId,
  DonkiStatus,
  LandingState,
  LaunchState,
  LeoTransferState,
  OsdrStatus,
  PayloadId,
  ResourceState,
  RoverObjective,
  SpaceFlightState,
} from '../game/types';

interface BriefingOverlayProps {
  selectedPayload: PayloadId;
  carryover: CampaignCarryoverState;
  onSelectCampaignMission: (id: CampaignMissionId) => void;
  onSelectPayload: (id: PayloadId) => void;
  resources: ResourceState;
  launch?: LaunchState;
  leoTransfer?: LeoTransferState;
  space?: SpaceFlightState;
  landing?: LandingState;
  objectives?: RoverObjective[];
  donki: DonkiStatus;
  osdr: OsdrStatus;
  onBack: () => void;
  onLaunch: () => void;
  onOpenNotebook: () => void;
}

const MISSION_PREVIEW_IMAGE: Record<CampaignMissionId, { src: string; alt: string; posClass: string }> = {
  'artemis-2': {
    src: artemis2PadBanner,
    alt: 'In-engine 3D render: SLS Block 1 & LC-39B Mobile Launcher, Artemis Odyssey simulator',
    posClass: 'object-center',
  },
  'artemis-3': {
    src: viperLanderImg,
    alt: 'Lunar South Pole Lander and VIPER Prospecting Rover',
    posClass: 'object-center',
  },
  'artemis-4': {
    src: architectureImg,
    alt: 'Lunar Gateway NRHO Propellant Transfer Architecture',
    posClass: 'object-[50%_42%]',
  },
  'mars-pathfinder': {
    src: '/assets/planets/mars.jpg',
    alt: 'Mars Global Mosaic of Cratered Surface Terrain (NASA Public Domain)',
    posClass: 'object-center',
  },
};

function MissionRoutePreview({
  missionId,
  nodes,
  accent,
}: {
  missionId: CampaignMissionId;
  nodes: MissionRouteNode[];
  accent: string;
}) {
  const nodeXs = [46, 146, 248, 348];
  const nodeYs = [38, 22, 22, 36];
  const gradId = `briefing-traj-${missionId}`;

  return (
    <svg
      viewBox="0 0 394 64"
      className="h-14 w-full drop-shadow-[0_2px_8px_rgba(2,6,23,0.9)]"
      aria-label="Mission route checkpoints"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.65" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <path
        d={`M ${nodeXs[0]} ${nodeYs[0]} Q 96 14, ${nodeXs[1]} ${nodeYs[1]} T ${nodeXs[2]} ${nodeYs[2]} T ${nodeXs[3]} ${nodeYs[3]}`}
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.2"
        strokeDasharray="4 3"
      />

      {nodes.map((node, idx) => {
        const isDone = node.status === 'done';
        const isActive = node.status === 'active';
        const fill = isDone ? '#34d399' : isActive ? accent : '#0f172a';
        const stroke = isDone ? '#6ee7b7' : isActive ? '#f8fafc' : '#64748b';
        return (
          <g key={node.id}>
            {isActive && (
              <circle
                cx={nodeXs[idx]}
                cy={nodeYs[idx]}
                r="8.5"
                fill={accent}
                fillOpacity="0.22"
              />
            )}
            <circle
              cx={nodeXs[idx]}
              cy={nodeYs[idx]}
              r={isDone || isActive ? 4.5 : 3.5}
              fill={fill}
              stroke={stroke}
              strokeWidth="1.6"
            />
            <text
              x={nodeXs[idx]}
              y={56}
              textAnchor="middle"
              fill={isDone ? '#a7f3d0' : isActive ? '#f8fafc' : '#cbd5e1'}
              fontSize="10"
              fontWeight="700"
              fontFamily="Chakra Petch, sans-serif"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function EquipmentIcon({
  kind,
  missionId,
  active,
}: {
  kind: EquipmentVisualKind;
  missionId: CampaignMissionId;
  active: boolean;
}) {
  const Icon =
    kind === 'shield'
      ? ShieldCheck
      : kind === 'oxygen'
        ? Wind
        : kind === 'solar'
          ? Sun
          : missionId === 'artemis-2'
            ? Radio
            : missionId === 'artemis-4'
              ? Fuel
              : Drill;

  const toneClass =
    kind === 'shield'
      ? 'text-emerald-300 border-emerald-400/35 bg-emerald-500/12'
      : kind === 'oxygen'
        ? 'text-sky-300 border-sky-400/35 bg-sky-500/12'
        : kind === 'solar'
          ? 'text-amber-300 border-amber-400/35 bg-amber-500/12'
          : 'text-cyan-300 border-cyan-400/35 bg-cyan-500/12';

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
        active ? 'border-cyan-400/85 bg-cyan-500/20 text-cyan-200' : toneClass
      }`}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function MassPips({ massMultiplier }: { massMultiplier: number }) {
  const pips = massMultiplier >= 1.35 ? 4 : massMultiplier >= 1.24 ? 3 : massMultiplier >= 1.15 ? 2 : 1;
  const pctPenalty = Math.round((massMultiplier - 1) * 100);
  return (
    <div className="flex items-center gap-2 tabular-nums">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((idx) => (
          <span
            key={idx}
            className={`h-1.5 w-3 rounded-sm ${
              idx <= pips ? (pips === 4 ? 'bg-amber-400' : 'bg-cyan-400') : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-300">+{pctPenalty}% Mass</span>
    </div>
  );
}

function getSimpleEquipmentHighlight(eq: MissionEquipmentOption): {
  text: string;
  tone: string;
} {
  if (eq.perkBadge) {
    return { text: eq.perkBadge, tone: 'text-emerald-300' };
  }
  if (eq.fragile) {
    return { text: 'Fragile — land < 2.5 m/s', tone: 'text-rose-300' };
  }
  if (eq.massMultiplier >= 1.35) {
    return { text: 'Heavy hull — brake earlier', tone: 'text-amber-300' };
  }
  return { text: eq.tradeoffHint.split('—')[1]?.trim() || 'Balanced loadout', tone: 'text-slate-300' };
}

export function BriefingOverlay({
  selectedPayload,
  carryover,
  onSelectCampaignMission,
  onSelectPayload,
  resources,
  launch,
  leoTransfer,
  space,
  landing,
  objectives,
  donki,
  osdr,
  onBack,
  onLaunch,
  onOpenNotebook,
}: BriefingOverlayProps) {
  const activeMissionId = carryover.activeMission;
  const meta = MISSION_BRIEFING_META[activeMissionId];
  const mission = CAMPAIGN_MISSIONS[activeMissionId];
  const equipmentList = getMissionEquipmentList(activeMissionId);
  const chosen = getMissionEquipmentOption(activeMissionId, selectedPayload);
  const previewResources = getMissionStartingResources(carryover, activeMissionId, selectedPayload);
  const previewImg = MISSION_PREVIEW_IMAGE[activeMissionId];

  const status = evaluateBriefingMissionStatus(activeMissionId, {
    carryover,
    launch,
    leoTransfer,
    space,
    landing,
    objectives,
    donki,
  });

  const flareActive = Boolean(/M|X/i.test(donki.classType || ''));
  const nasaBadgeText =
    osdr.studies.length > 0
      ? `DONKI ${donki.classType} · ${osdr.studies.length} OSDR`
      : `Space Weather · ${donki.classType}`;

  const solarCarryBonus = Math.min(18, Math.round(carryover.solarGridKw * 0.25));
  const bermCarryBonus = Math.min(16, carryover.regolithShieldLevel * 8);

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-3 sm:p-4">
      <Panel variant="surface" className="tactical-frame animate-modal-enter my-auto w-full max-w-5xl p-4 sm:p-5 lg:p-6">
        {/* TOP BAR */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/20 pb-3.5">
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={onBack}
              className="shrink-0 font-hud text-xs font-bold uppercase"
            >
              <ArrowLeft className="h-4 w-4 text-sky-300" />
              Command Deck
            </Button>

            <NASAInsignia size={40} className="shrink-0" />

            <div>
              <p
                data-testid="briefing-mission-subtitle"
                className="font-hud text-xs font-bold tracking-[0.14em] text-cyan-300 uppercase"
              >
                {meta.code} · {meta.destination} · {meta.gravityLabel}
              </p>
              <h2 className="font-display text-lg font-bold text-white uppercase sm:text-xl lg:text-2xl">
                {meta.title}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenNotebook}
              className="shrink-0 font-hud text-xs font-bold uppercase"
            >
              <BookOpen className="h-4 w-4 text-cyan-300" />
              Ledger ({carryover.unlockedFieldNotes.length})
            </Button>

            <StatusPill donki={donki} osdr={osdr} />
          </div>
        </header>

        {/* ROW 1: MISSION TABS + DYNAMIC ENVIRONMENT BANNER & OBJECTIVES + CARRYOVER */}
        <div className="mt-3.5 grid gap-3.5 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-sky-400/20 bg-slate-900/65 p-3.5">
            {/* Mission Switcher Tabs */}
            <div className="mb-2.5 flex flex-wrap gap-1.5" role="tablist" aria-label="Campaign Missions">
              {CAMPAIGN_ORDER.map((id) => {
                const m = CAMPAIGN_MISSIONS[id];
                const active = activeMissionId === id;
                const done = carryover.completedMissions.includes(id);
                const isLocked = id !== 'artemis-2' && !done;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    disabled={isLocked}
                    title={isLocked ? `${m.title} — In development (as of Nov 2026)` : m.title}
                    onClick={() => !isLocked && onSelectCampaignMission(id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                      active
                        ? 'bg-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.3)]'
                        : done
                          ? 'border border-emerald-400/45 bg-emerald-500/15 text-emerald-200 hover:border-emerald-300'
                          : isLocked
                            ? 'cursor-not-allowed border border-dashed border-slate-700/60 bg-slate-950/40 text-slate-500 opacity-70'
                            : 'border border-white/10 bg-slate-800/80 text-slate-200 hover:border-cyan-400/45 hover:text-white'
                    }`}
                  >
                    {isLocked ? (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-amber-400/70" />
                    ) : done ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : null}
                    <span>{m.shortLabel}</span>
                    {isLocked && (
                      <span className="rounded bg-amber-500/15 px-1 py-0.5 font-mono-tech text-[9px] font-bold text-amber-300/85 uppercase">
                        In Dev
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Dynamic Environment Preview + Route Overlay */}
            <div className="relative h-36 overflow-hidden rounded-xl border border-sky-400/25 bg-slate-950">
              <img
                src={previewImg.src}
                alt={previewImg.alt}
                referrerPolicy="no-referrer"
                className={`h-full w-full object-cover opacity-55 ${previewImg.posClass}`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-slate-950/35" />

              <div className="relative z-10 flex h-full flex-col justify-between p-2.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-950/80 px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-sky-300 uppercase border border-sky-400/25">
                    Distances compressed 24× (Educational Scale)
                  </span>
                </div>
                <MissionRoutePreview
                  missionId={activeMissionId}
                  nodes={status.routeNodes}
                  accent={meta.accentHex}
                />
                <div>
                  <p className="text-xs leading-snug font-medium text-slate-100">
                    {meta.summary}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-tight text-sky-200/80">
                    {meta.educationalNote}
                  </p>
                </div>
              </div>
            </div>

            {/* Live Mission Objectives + Environment Hazards */}
            <div className="mt-2.5 space-y-1.5">
              {status.objectives.map((obj) => (
                <div
                  key={obj.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/[0.06] bg-slate-950/60 px-2.5 py-1.5 text-xs"
                >
                  <span className="flex min-w-0 items-center gap-2 text-slate-100">
                    {obj.completed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 text-cyan-400/70" />
                    )}
                    <span className="truncate">{obj.label}</span>
                  </span>
                  <span
                    className={`shrink-0 text-[11px] font-semibold whitespace-nowrap tabular-nums ${
                      obj.completed ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {obj.detail}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {meta.challengeChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-md border border-sky-400/20 bg-slate-950/75 px-2 py-0.5 text-[11px] font-semibold text-sky-200"
                >
                  {chip}
                </span>
              ))}
              {flareActive && (
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
                  <AlertTriangle className="h-3 w-3" />
                  DONKI {donki.classType} Flare
                </span>
              )}
            </div>
          </section>

          {/* CAMPAIGN CARRYOVER */}
          <section className="flex flex-col justify-between rounded-2xl border border-emerald-400/25 bg-slate-900/65 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-hud text-xs font-bold tracking-wider text-emerald-300 uppercase">
                Campaign Carryover
              </span>
              <span className="text-xs font-semibold text-slate-300 tabular-nums">
                {carryover.completedMissions.length} / 4 Cleared
              </span>
            </div>

            <div className="my-2.5 grid grid-cols-2 gap-2 tabular-nums">
              <div
                className={`rounded-xl border px-3 py-2 ${
                  carryover.relaySatelliteOnline
                    ? 'border-emerald-400/45 bg-emerald-950/55'
                    : 'border-sky-400/15 bg-slate-950/75'
                }`}
              >
                <span className="block text-[11px] font-medium text-slate-400">Cislunar Nav Link</span>
                <span
                  className={`block text-sm font-bold ${
                    carryover.relaySatelliteOnline ? 'text-emerald-300' : 'text-slate-300'
                  }`}
                >
                  {carryover.relaySatelliteOnline ? 'Online' : 'Pending'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {carryover.relaySatelliteOnline ? 'Optical nav locked' : 'Pending (Mission 1)'}
                </span>
              </div>

              <div className="rounded-xl border border-sky-400/20 bg-slate-950/75 px-3 py-2">
                <span className="block text-[11px] font-medium text-slate-400">ISRU Harvest</span>
                <span className="block text-sm font-bold text-sky-300">
                  {carryover.isruWaterKg} kg H₂O
                </span>
                <span className="text-[11px] text-slate-400">
                  {carryover.isruWaterKg > 0 ? 'Active reserve' : 'Pending (Mission 2)'}
                </span>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-slate-950/75 px-3 py-2">
                <span className="block text-[11px] font-medium text-slate-400">Fuel Carryover</span>
                <span className="block text-sm font-bold text-cyan-300">
                  +{carryover.isruFuelBonusPct}% Delta-V
                </span>
                <span className="text-[11px] text-slate-400">
                  {carryover.isruFuelBonusPct > 0 ? 'Active bonus' : 'Earn via Mission 2'}
                </span>
              </div>

              <div className="rounded-xl border border-amber-400/25 bg-slate-950/75 px-3 py-2">
                <span className="block text-[11px] font-medium text-slate-400">Crew Dose</span>
                <span className="block text-sm font-bold text-amber-300">
                  {carryover.radiationDoseMsv} / 150 mSv
                </span>
                <span className="text-[11px] text-slate-400">
                  {carryover.radiationDoseMsv >= 100 ? 'Elevated dose' : 'Nominal limit'}
                </span>
              </div>
            </div>

            <div className="space-y-1 border-t border-emerald-400/20 pt-2 text-xs">
              <p className="leading-snug text-slate-300">
                <span className="font-semibold text-sky-300">Input: </span>
                {mission.reuseInput}
              </p>
              <p className="leading-snug text-emerald-200">
                <span className="font-semibold text-emerald-300">Reward: </span>
                {mission.reuseOutput}
              </p>
            </div>
          </section>
        </div>

        {/* ROW 2: STARTING RESOURCE TELEMETRY PREVIEW */}
        <section className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3 tabular-nums">
          {[
            {
              label: 'Power Bus',
              icon: Battery,
              base: resources.power,
              equipBonus: chosen.bonus.power || 0,
              carryNote: solarCarryBonus > 0 ? `+${solarCarryBonus}% grid` : null,
              val: previewResources.power,
              bar: 'bg-amber-400',
              text: 'text-amber-300',
            },
            {
              label: 'O₂ Reserve',
              icon: Wind,
              base: resources.oxygen,
              equipBonus: chosen.bonus.oxygen || 0,
              carryNote: null,
              val: previewResources.oxygen,
              bar: 'bg-sky-400',
              text: 'text-sky-300',
            },
            {
              label: 'Radiation Shield',
              icon: Shield,
              base: resources.shield,
              equipBonus: chosen.bonus.shield || 0,
              carryNote: bermCarryBonus > 0 ? `+${bermCarryBonus}% berm` : null,
              val: previewResources.shield,
              bar: 'bg-emerald-400',
              text: 'text-emerald-300',
            },
          ].map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.label}
                className="rounded-xl border border-sky-400/20 bg-slate-900/65 px-3.5 py-2.5"
              >
                <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-slate-200">
                    <Icon className={`h-4 w-4 ${r.text}`} />
                    {r.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {r.carryNote && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                        {r.carryNote}
                      </span>
                    )}
                    {r.equipBonus > 0 && (
                      <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[11px] font-bold text-cyan-200">
                        +{r.equipBonus}%
                      </span>
                    )}
                    <span className={`text-sm font-bold ${r.text}`}>{Math.round(r.val)}%</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${r.bar} transition-all duration-200`}
                    style={{ width: `${r.val}%` }}
                  />
                </div>
              </div>
            );
          })}
        </section>

        {/* ROW 3: SIMPLIFIED MISSION-SPECIFIC 2x2 EQUIPMENT GRID */}
        <section className="mt-3.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-hud text-xs font-bold tracking-wider text-cyan-300 uppercase">
                Select Equipment · {mission.shortLabel}
              </h3>
              <p className="font-mono-tech text-[10px] text-slate-400">
                Simulation Equipment Package (Gameplay Balance Modifier — Not Real Vehicle Configuration)
              </p>
            </div>
            <span className="text-xs text-slate-400">
              Updates starting meters and live mission handling
            </span>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {equipmentList.map((eq) => {
              const active = eq.id === selectedPayload;
              const highlight = getSimpleEquipmentHighlight(eq);
              return (
                <button
                  key={eq.id}
                  type="button"
                  onClick={() => onSelectPayload(eq.id)}
                  className={`flex items-start gap-3 rounded-2xl border p-3 text-left transition ${
                    active
                      ? 'border-cyan-400/85 bg-cyan-500/15 shadow-[0_0_22px_rgba(34,211,238,0.18)]'
                      : 'border-sky-400/20 bg-slate-900/65 hover:border-cyan-400/55'
                  }`}
                >
                  <EquipmentIcon kind={eq.visualKind} missionId={activeMissionId} active={active} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        title={eq.name}
                        className="font-display text-sm font-bold text-white break-words leading-tight"
                      >
                        {eq.name}
                      </span>
                      {active ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-cyan-400 px-2 py-0.5 text-xs font-bold text-slate-950">
                          <Check className="h-3 w-3" />
                          Selected
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md border border-white/10 bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                          {eq.shortTag}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-snug text-slate-300">{eq.description}</p>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-1.5">
                      <MassPips massMultiplier={eq.massMultiplier} />
                      <span className={`text-xs font-semibold ${highlight.tone}`}>
                        {highlight.text}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sky-400/20 pt-3.5">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 tabular-nums lg:text-sm">
            <span className="text-slate-400">Active Loadout:</span>
            <span className="font-bold text-cyan-300">{chosen.name}</span>
            <span className="text-slate-500">·</span>
            <span>{chosen.massMultiplier.toFixed(2)}× Mass</span>
            <span className="text-slate-500">·</span>
            <span className="font-semibold text-sky-200">{chosen.shortTag}</span>
            {chosen.perkBadge && (
              <>
                <span className="text-slate-500">·</span>
                <span className="font-semibold text-emerald-300">{chosen.perkBadge}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="secondary"
              size="md"
              onClick={onBack}
              className="font-hud text-xs font-bold uppercase"
            >
              Back
            </Button>
            {activeMissionId === 'artemis-2' ? (
              <Button
                variant="primary"
                size="lg"
                data-testid="briefing-launch-btn"
                onClick={onLaunch}
                className="font-display text-xs font-bold tracking-wider uppercase lg:text-sm"
              >
                <Rocket className="h-4 w-4 shrink-0" />
                {meta.ctaLabel}
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                data-testid="briefing-launch-btn"
                disabled
                title="This mission is in development (as of Nov 2026). Select Artemis II to fly."
                className="text-xs text-amber-300/90"
              >
                In Development (as of Nov 2026)
              </Button>
            )}
          </div>
        </footer>
      </Panel>
    </div>
  );
}
