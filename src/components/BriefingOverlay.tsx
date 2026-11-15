import { ArrowLeft, BookOpen, Database, Drill, Rocket, ShieldCheck, Sun, Wind } from 'lucide-react';
import missionPatchImg from '../assets/images/artemis_mission_patch_v2_1794686358129.jpg';
import { CAMPAIGN_MISSIONS, CAMPAIGN_ORDER, PAYLOADS } from '../game/constants';
import type {
  CampaignCarryoverState,
  CampaignMissionId,
  DonkiStatus,
  OsdrStatus,
  PayloadId,
  ResourceState,
} from '../game/types';

interface BriefingOverlayProps {
  selectedPayload: PayloadId;
  carryover: CampaignCarryoverState;
  onSelectCampaignMission: (id: CampaignMissionId) => void;
  onSelectPayload: (id: PayloadId) => void;
  resources: ResourceState;
  donki: DonkiStatus;
  osdr: OsdrStatus;
  onBack: () => void;
  onLaunch: () => void;
  onOpenNasaModal: () => void;
  onOpenNotebook: () => void;
}

const MISSION_NODES: Record<CampaignMissionId, { steps: string[]; accent: string }> = {
  'artemis-2': {
    steps: ['Pad 39B', '165 km LEO', 'HERMES Sat', 'Laser Link'],
    accent: '#22d3ee',
  },
  'artemis-3': {
    steps: ['Moon Orbit', '0.165g Land', 'Shackleton Ice', 'Berm & Solar'],
    accent: '#38bdf8',
  },
  'artemis-4': {
    steps: ['Lunar Orbit', 'NRHO Dock', 'ISRU Fuel', 'Storm Shield'],
    accent: '#facc15',
  },
  'mars-pathfinder': {
    steps: ['0.38g Entry', 'Jezero Pad', 'Delta Cores', 'MOXIE O₂'],
    accent: '#fb923c',
  },
};

function MissionProfileDiagram({
  missionId,
  planet,
}: {
  missionId: CampaignMissionId;
  planet: 'moon' | 'mars';
}) {
  const { steps, accent } = MISSION_NODES[missionId];
  const nodeXs = [28, 128, 232, 332];
  const nodeYs = [38, 16, 18, 36];

  return (
    <svg
      viewBox="0 0 360 62"
      className="h-14 w-full"
      aria-label="Mission flight profile diagram"
    >
      <defs>
        <linearGradient id="trajGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Flight trajectory arc */}
      <path
        d={`M ${nodeXs[0]} ${nodeYs[0]} Q 85 10, ${nodeXs[1]} ${nodeYs[1]} T ${nodeXs[2]} ${nodeYs[2]} T ${nodeXs[3]} ${nodeYs[3]}`}
        fill="none"
        stroke="url(#trajGrad)"
        strokeWidth="2"
        strokeDasharray="4 3"
      />

      {/* Origin & Target body hints */}
      <circle cx={nodeXs[0]} cy={nodeYs[0]} r="9" fill="#0ea5e9" fillOpacity="0.16" />
      <circle
        cx={nodeXs[3]}
        cy={nodeYs[3]}
        r="10"
        fill={planet === 'mars' ? '#f97316' : '#cbd5e1'}
        fillOpacity="0.18"
      />

      {/* Nodes & crisp labels */}
      {steps.map((label, idx) => (
        <g key={label}>
          <circle
            cx={nodeXs[idx]}
            cy={nodeYs[idx]}
            r={idx === 0 || idx === 3 ? 4.5 : 3.5}
            fill={idx === 3 ? accent : '#0f172a'}
            stroke={accent}
            strokeWidth="1.6"
          />
          <text
            x={nodeXs[idx]}
            y={idx === 1 || idx === 2 ? 35 : 56}
            textAnchor="middle"
            fill={idx === 3 ? '#f8fafc' : '#cbd5e1'}
            fontSize="8.5"
            fontWeight="700"
            fontFamily="Chakra Petch, sans-serif"
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function PayloadBlueprintIcon({ id, active }: { id: PayloadId; active: boolean }) {
  const Icon =
    id === 'heavy-shield'
      ? ShieldCheck
      : id === 'oxygen-tanks'
        ? Wind
        : id === 'solar-panels'
          ? Sun
          : Drill;

  return (
    <div
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
        active
          ? 'border-amber-400/70 bg-amber-500/15 text-amber-300'
          : 'border-sky-400/25 bg-slate-950/75 text-sky-300'
      }`}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

function MassPips({ massMultiplier }: { massMultiplier: number }) {
  const pips = massMultiplier >= 1.35 ? 4 : massMultiplier >= 1.24 ? 3 : massMultiplier >= 1.15 ? 2 : 1;
  return (
    <div className="flex items-center gap-1">
      <span className="font-hud text-[10px] font-bold text-slate-400 uppercase">Mass</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4].map((idx) => (
          <span
            key={idx}
            className={`h-1.5 w-3 rounded-sm ${
              idx <= pips ? (pips === 4 ? 'bg-amber-400' : 'bg-sky-400') : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function BriefingOverlay({
  selectedPayload,
  carryover,
  onSelectCampaignMission,
  onSelectPayload,
  resources,
  donki,
  osdr,
  onBack,
  onLaunch,
  onOpenNasaModal,
  onOpenNotebook,
}: BriefingOverlayProps) {
  const payloadList = Object.values(PAYLOADS);
  const chosen = PAYLOADS[selectedPayload];
  const mission = CAMPAIGN_MISSIONS[carryover.activeMission];

  const previewResources: ResourceState = {
    power: Math.min(100, resources.power + (chosen.bonus.power || 0)),
    oxygen: Math.min(100, resources.oxygen + (chosen.bonus.oxygen || 0)),
    shield: Math.min(100, resources.shield + (chosen.bonus.shield || 0)),
  };

  const launchCtaLabel =
    mission.startPhase === 'launch'
      ? 'PROCEED TO PAD 39B LAUNCH'
      : mission.startPhase === 'space'
        ? 'UNDOCK TO ORBITAL TRANSIT'
        : `BEGIN ${mission.planet === 'mars' ? 'MARS JEZERO' : 'SOUTH POLE'} DESCENT`;

  const nasaBadgeText =
    osdr.studies.length > 0
      ? `DONKI ${donki.classType} · ${osdr.studies.length} OSDR`
      : `Space Weather · ${donki.classType}`;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-slate-950/82 p-4">
      <div className="hud-panel tactical-frame animate-modal-enter my-auto w-full max-w-4xl rounded-2xl p-5 md:p-6">
        {/* Top Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/20 pb-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-xl border border-sky-400/25 bg-slate-900/75 px-3 py-2 font-hud text-xs font-bold text-slate-200 uppercase transition hover:border-sky-400/60"
            >
              <ArrowLeft className="mr-1 inline h-3.5 w-3.5 text-sky-300" />
              Command Deck
            </button>
            <div
              data-testid="briefing-mission-patch"
              className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-amber-400/55 bg-[#050811] shadow-[0_0_16px_rgba(245,158,11,0.2)]"
            >
              <img
                src={missionPatchImg}
                alt="Artemis Odyssey Mission Patch"
                referrerPolicy="no-referrer"
                className="h-full w-full scale-[1.18] object-cover"
              />
            </div>
            <div>
              <p className="font-hud text-[11px] font-bold tracking-[0.18em] text-sky-300 uppercase">
                {mission.code} · {mission.planet === 'mars' ? 'MARS 0.38g' : 'MOON 0.165g'}
              </p>
              <h2 className="font-display text-2xl font-bold text-white uppercase">
                {mission.title}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex items-center gap-1.5 rounded-xl border border-sky-400/35 bg-sky-500/12 px-3 py-2 font-hud text-xs font-bold whitespace-nowrap text-sky-200 uppercase hover:bg-sky-500/25"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Ledger ({carryover.unlockedFieldNotes.length})
            </button>

            <button
              type="button"
              onClick={onOpenNasaModal}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3 py-2 font-hud text-xs font-bold whitespace-nowrap text-amber-200 uppercase hover:bg-amber-500/25"
            >
              <Database className="h-3.5 w-3.5" />
              {nasaBadgeText}
            </button>
          </div>
        </div>

        {/* Mission Flight Profile Diagram + Carryover Loop Schematic */}
        <div className="mb-4 grid gap-3 md:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border border-sky-400/20 bg-slate-900/65 p-3">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {CAMPAIGN_ORDER.map((id) => {
                const m = CAMPAIGN_MISSIONS[id];
                const active = carryover.activeMission === id;
                const done = carryover.completedMissions.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectCampaignMission(id)}
                    className={`rounded-lg px-2.5 py-1 font-hud text-[11px] font-bold whitespace-nowrap transition ${
                      active
                        ? 'bg-sky-400 text-slate-950'
                        : done
                          ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                          : 'bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {m.shortLabel}
                  </button>
                );
              })}
            </div>

            {/* Visual Mission Profile Arc */}
            <div className="rounded-lg border border-sky-400/15 bg-slate-950/75 px-2 py-1">
              <MissionProfileDiagram missionId={mission.id} planet={mission.planet} />
            </div>

            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-slate-200">{mission.objectiveSummary}</span>
            </div>
          </div>

          {/* Carryover Flow Diagram */}
          <div className="flex flex-col justify-between rounded-xl border border-emerald-400/25 bg-slate-900/65 p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-hud text-[11px] font-bold tracking-wider text-emerald-300 uppercase">
                Campaign Carryover Link
              </span>
              <span className="font-mono-tech text-[10px] text-slate-400">
                {carryover.completedMissions.length}/4 CLEARED
              </span>
            </div>

            {/* 3-Node Visual Resource Transfer Diagram */}
            <div className="my-2 grid grid-cols-3 gap-1.5 text-center">
              <div
                className={`rounded-lg border px-2 py-2 ${
                  carryover.relaySatelliteOnline
                    ? 'border-emerald-400/50 bg-emerald-950/75'
                    : 'border-sky-400/15 bg-slate-950/75'
                }`}
              >
                <span className="block font-hud text-[9px] font-bold text-slate-400 uppercase">
                  HERMES Sat
                </span>
                <span
                  className={`font-mono-tech text-xs font-bold ${
                    carryover.relaySatelliteOnline ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {carryover.relaySatelliteOnline ? 'ONLINE' : 'STOWED'}
                </span>
              </div>

              <div className="rounded-lg border border-sky-400/20 bg-slate-950/75 px-2 py-2">
                <span className="block font-hud text-[9px] font-bold text-slate-400 uppercase">
                  ISRU H₂O / Fuel
                </span>
                <span className="font-mono-tech text-xs font-bold text-sky-300">
                  {carryover.isruWaterKg}kg · +{carryover.isruFuelBonusPct}%
                </span>
              </div>

              <div className="rounded-lg border border-amber-500/25 bg-slate-950/75 px-2 py-2">
                <span className="block font-hud text-[9px] font-bold text-slate-400 uppercase">
                  Crew Dose
                </span>
                <span className="font-mono-tech text-xs font-bold text-amber-300">
                  {carryover.radiationDoseMsv}/150 mSv
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-emerald-400/20 pt-2 text-[11px]">
              <span className="text-emerald-200">{mission.reuseOutput}</span>
            </div>
          </div>
        </div>

        {/* Starting Resource Preview */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            {
              label: 'Power Bus',
              val: previewResources.power,
              color: 'bg-amber-400',
              text: 'text-amber-300',
            },
            {
              label: 'O₂ Reserve',
              val: previewResources.oxygen,
              color: 'bg-sky-400',
              text: 'text-sky-300',
            },
            {
              label: 'Radiation Shield',
              val: previewResources.shield,
              color: 'bg-emerald-400',
              text: 'text-emerald-300',
            },
          ].map((r) => (
            <div
              key={r.label}
              className="rounded-xl border border-sky-400/20 bg-slate-900/65 p-2.5"
            >
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="font-hud text-slate-200 uppercase">{r.label}</span>
                <span className={`font-mono-tech ${r.text}`}>{Math.round(r.val)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full ${r.color} transition-all`} style={{ width: `${r.val}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* 4 Blueprint Payload Cards (Zero Repeated Warning Icons, Scannable Visual Meters) */}
        <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
          {payloadList.map((p) => {
            const active = p.id === selectedPayload;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPayload(p.id)}
                className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                  active
                    ? 'border-amber-400/80 bg-amber-500/18 shadow-[0_0_24px_rgba(245,158,11,0.18)]'
                    : 'border-sky-400/20 bg-slate-900/65 hover:border-sky-400/55'
                }`}
              >
                <PayloadBlueprintIcon id={p.id} active={active} />

                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate font-display text-sm font-bold text-white">
                      {p.name}
                    </span>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 font-mono-tech text-[10px] font-bold uppercase ${
                        p.fragile ? 'bg-rose-500/20 text-rose-200' : 'bg-sky-500/20 text-sky-200'
                      }`}
                    >
                      {p.shortTag}
                    </span>
                  </div>

                  <p className="mb-2 text-xs text-slate-300">{p.description}</p>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-1.5">
                    <MassPips massMultiplier={p.massMultiplier} />
                    <span
                      className={`font-hud text-[11px] font-bold ${
                        p.fragile
                          ? 'text-rose-300'
                          : p.drillBoost > 1
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                      }`}
                    >
                      {p.tradeoffHint}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Clean Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono-tech text-xs text-slate-300">
            LOADOUT: <span className="font-bold text-amber-300">{chosen.name}</span> ·{' '}
            {chosen.massMultiplier.toFixed(2)}× Mass
          </div>

          <button
            type="button"
            data-testid="briefing-launch-btn"
            onClick={onLaunch}
            className="inline-flex items-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3 font-display text-xs font-bold tracking-wider whitespace-nowrap text-slate-950 uppercase transition hover:bg-amber-400"
          >
            <Rocket className="h-4 w-4" />
            {launchCtaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
