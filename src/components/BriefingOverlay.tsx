import {
  ArrowLeft,
  Battery,
  BookOpen,
  Check,
  Database,
  Drill,
  Rocket,
  Shield,
  ShieldCheck,
  Sun,
  Wind,
} from 'lucide-react';
import missionPatchImg from '../assets/images/artemis_mission_patch_v2_1794686358129.jpg';
import { CAMPAIGN_MISSIONS, CAMPAIGN_ORDER, PAYLOADS } from '../game/constants';
import type {
  CampaignCarryoverState,
  CampaignMissionId,
  DonkiStatus,
  OsdrStatus,
  PayloadId,
  PayloadOption,
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
  const nodeXs = [36, 134, 234, 326];
  const nodeYs = [38, 16, 18, 36];

  return (
    <svg
      viewBox="0 0 360 66"
      className="h-16 w-full"
      aria-label="Mission flight profile diagram"
    >
      <defs>
        <linearGradient id="trajGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <path
        d={`M ${nodeXs[0]} ${nodeYs[0]} Q 88 10, ${nodeXs[1]} ${nodeYs[1]} T ${nodeXs[2]} ${nodeYs[2]} T ${nodeXs[3]} ${nodeYs[3]}`}
        fill="none"
        stroke="url(#trajGrad)"
        strokeWidth="2.2"
        strokeDasharray="4 3"
      />

      <circle cx={nodeXs[0]} cy={nodeYs[0]} r="9" fill="#0ea5e9" fillOpacity="0.18" />
      <circle
        cx={nodeXs[3]}
        cy={nodeYs[3]}
        r="10"
        fill={planet === 'mars' ? '#f97316' : '#cbd5e1'}
        fillOpacity="0.2"
      />

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
            y={idx === 1 || idx === 2 ? 36 : 58}
            textAnchor="middle"
            fill={idx === 3 ? '#f8fafc' : '#cbd5e1'}
            fontSize="10"
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
          ? 'border-cyan-400/80 bg-cyan-500/18 text-cyan-300'
          : 'border-sky-400/25 bg-slate-950/75 text-sky-300'
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
            className={`h-1.5 w-3.5 rounded-sm ${
              idx <= pips ? (pips === 4 ? 'bg-amber-400' : 'bg-cyan-400') : 'bg-slate-800'
            }`}
          />
        ))}
      </div>
      <span className="text-xs font-semibold text-slate-300">+{pctPenalty}% Mass</span>
    </div>
  );
}

function getPayloadBonuses(p: PayloadOption): { label: string; tone: string }[] {
  const badges: { label: string; tone: string }[] = [];
  if (p.bonus.shield) {
    badges.push({ label: `+${p.bonus.shield}% Shield`, tone: 'border-emerald-400/35 bg-emerald-500/12 text-emerald-200' });
  }
  if (p.bonus.oxygen) {
    badges.push({ label: `+${p.bonus.oxygen}% Air`, tone: 'border-sky-400/35 bg-sky-500/12 text-sky-200' });
  }
  if (p.bonus.power) {
    badges.push({ label: `+${p.bonus.power}% Power`, tone: 'border-amber-400/35 bg-amber-500/12 text-amber-200' });
  }
  if (p.drillBoost > 1) {
    badges.push({ label: '+25% Drill Speed', tone: 'border-cyan-400/35 bg-cyan-500/12 text-cyan-200' });
  }
  if (p.fragile) {
    badges.push({ label: 'Fragile Hull', tone: 'border-rose-400/40 bg-rose-500/12 text-rose-200' });
  }
  return badges;
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
      ? 'Proceed to Pad 39B Launch'
      : mission.startPhase === 'space'
        ? 'Undock to Orbital Transit'
        : `Begin ${mission.planet === 'mars' ? 'Mars Jezero' : 'South Pole'} Descent`;

  const nasaBadgeText =
    osdr.studies.length > 0
      ? `DONKI ${donki.classType} · ${osdr.studies.length} OSDR`
      : `Space Weather · ${donki.classType}`;

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-slate-950/84 p-4">
      <div className="hud-panel tactical-frame animate-modal-enter my-auto w-full max-w-5xl rounded-2xl p-5 lg:p-6">
        {/* SECTION 1: Mission Identity & Destination */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-400/20 pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="hud-btn-glass inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap uppercase transition"
            >
              <ArrowLeft className="h-4 w-4 text-sky-300" />
              Command Deck
            </button>

            <div
              data-testid="briefing-mission-patch"
              className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-cyan-400/55 bg-[#050811] shadow-[0_0_16px_rgba(34,211,238,0.22)]"
            >
              <img
                src={missionPatchImg}
                alt="Artemis Odyssey Mission Patch"
                referrerPolicy="no-referrer"
                className="h-full w-full scale-[1.18] object-cover"
              />
            </div>

            <div>
              <p className="font-hud text-xs font-bold tracking-[0.16em] text-cyan-300 uppercase">
                {mission.code} · {mission.planet === 'mars' ? 'Mars · 0.38g Gravity' : 'Moon · 0.165g Gravity'}
              </p>
              <h2 className="font-display text-xl font-bold text-white uppercase lg:text-2xl">
                {mission.title}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenNotebook}
              className="hud-btn-glass inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap uppercase transition"
            >
              <BookOpen className="h-4 w-4 text-cyan-300" />
              Ledger ({carryover.unlockedFieldNotes.length})
            </button>

            <button
              type="button"
              onClick={onOpenNasaModal}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/15 px-3.5 py-2 text-xs font-bold whitespace-nowrap text-amber-200 uppercase transition hover:bg-amber-500/25"
            >
              <Database className="h-4 w-4 shrink-0" />
              {nasaBadgeText}
            </button>
          </div>
        </header>

        {/* SECTION 2: Mission Tabs + Flight Profile & Objective Summary */}
        <div className="mt-4 grid gap-3.5 lg:grid-cols-[1.35fr_1fr]">
          <section className="rounded-2xl border border-sky-400/20 bg-slate-900/65 p-3.5">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {CAMPAIGN_ORDER.map((id) => {
                const m = CAMPAIGN_MISSIONS[id];
                const active = carryover.activeMission === id;
                const done = carryover.completedMissions.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectCampaignMission(id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold whitespace-nowrap transition ${
                      active
                        ? 'bg-cyan-400 text-slate-950 shadow-[0_0_14px_rgba(34,211,238,0.3)]'
                        : done
                          ? 'border border-emerald-400/45 bg-emerald-500/15 text-emerald-200'
                          : 'border border-white/10 bg-slate-800/80 text-slate-200 hover:border-cyan-400/45 hover:text-white'
                    }`}
                  >
                    {m.shortLabel}
                  </button>
                );
              })}
            </div>

            <div className="rounded-xl border border-sky-400/15 bg-slate-950/75 px-3 py-1.5">
              <MissionProfileDiagram missionId={mission.id} planet={mission.planet} />
            </div>

            <p className="mt-2.5 text-xs leading-relaxed text-slate-200 lg:text-sm">
              {mission.objectiveSummary}
            </p>
          </section>

          {/* SECTION 3: Campaign Carryover Status */}
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
                    ? 'border-emerald-400/45 bg-emerald-950/60'
                    : 'border-sky-400/15 bg-slate-950/75'
                }`}
              >
                <span className="block text-xs font-medium text-slate-400">HERMES Relay</span>
                <span
                  className={`text-sm font-bold ${
                    carryover.relaySatelliteOnline ? 'text-emerald-300' : 'text-slate-300'
                  }`}
                >
                  {carryover.relaySatelliteOnline ? 'Online' : 'Stowed'}
                </span>
              </div>

              <div className="rounded-xl border border-sky-400/20 bg-slate-950/75 px-3 py-2">
                <span className="block text-xs font-medium text-slate-400">ISRU Harvest</span>
                <span className="text-sm font-bold text-sky-300">
                  {carryover.isruWaterKg} kg H₂O
                </span>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-slate-950/75 px-3 py-2">
                <span className="block text-xs font-medium text-slate-400">Fuel Carryover</span>
                <span className="text-sm font-bold text-cyan-300">
                  +{carryover.isruFuelBonusPct}% Delta-V
                </span>
              </div>

              <div className="rounded-xl border border-amber-400/25 bg-slate-950/75 px-3 py-2">
                <span className="block text-xs font-medium text-slate-400">Crew Dose</span>
                <span className="text-sm font-bold text-amber-300">
                  {carryover.radiationDoseMsv} / 150 mSv
                </span>
              </div>
            </div>

            <p className="border-t border-emerald-400/20 pt-2 text-xs leading-snug text-emerald-200">
              {mission.reuseOutput}
            </p>
          </section>
        </div>

        {/* SECTION 4: Starting Resource Statistics Preview */}
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 tabular-nums">
          {[
            {
              label: 'Power Bus',
              icon: Battery,
              base: resources.power,
              bonus: chosen.bonus.power || 0,
              val: previewResources.power,
              bar: 'bg-amber-400',
              text: 'text-amber-300',
            },
            {
              label: 'O₂ Reserve',
              icon: Wind,
              base: resources.oxygen,
              bonus: chosen.bonus.oxygen || 0,
              val: previewResources.oxygen,
              bar: 'bg-sky-400',
              text: 'text-sky-300',
            },
            {
              label: 'Radiation Shield',
              icon: Shield,
              base: resources.shield,
              bonus: chosen.bonus.shield || 0,
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
                    {r.bonus > 0 && (
                      <span className="rounded bg-cyan-500/18 px-1.5 py-0.5 text-xs font-bold text-cyan-200">
                        +{r.bonus}%
                      </span>
                    )}
                    <span className={`text-sm font-bold ${r.text}`}>{Math.round(r.val)}%</span>
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full ${r.bar} transition-all duration-200`} style={{ width: `${r.val}%` }} />
                </div>
              </div>
            );
          })}
        </section>

        {/* SECTION 5: 4-Card Equipment Loadout Comparison */}
        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-hud text-xs font-bold tracking-wider text-cyan-300 uppercase">
              Select Mission Payload &amp; Compare Tradeoffs
            </h3>
            <span className="text-xs text-slate-400">
              Selected loadout adjusts launch mass, handling, and reserve boosts
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {payloadList.map((p) => {
              const active = p.id === selectedPayload;
              const bonuses = getPayloadBonuses(p);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPayload(p.id)}
                  className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition ${
                    active
                      ? 'border-cyan-400/85 bg-cyan-500/15 shadow-[0_0_24px_rgba(34,211,238,0.18)]'
                      : 'border-sky-400/20 bg-slate-900/65 hover:border-cyan-400/55'
                  }`}
                >
                  <PayloadBlueprintIcon id={p.id} active={active} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-display text-sm font-bold text-white">
                        {p.name}
                      </span>
                      {active ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-cyan-400 px-2 py-0.5 text-xs font-bold text-slate-950">
                          <Check className="h-3 w-3" />
                          Selected
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md border border-white/10 bg-slate-800/80 px-2 py-0.5 text-xs font-semibold text-slate-300">
                          {p.shortTag}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs leading-snug text-slate-300">{p.description}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {bonuses.map((b) => (
                        <span
                          key={b.label}
                          className={`rounded-md border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${b.tone}`}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-2">
                      <MassPips massMultiplier={p.massMultiplier} />
                      <span
                        className={`text-xs font-semibold ${
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
        </section>

        {/* SECTION 6: Loadout Summary + Back + Prominent Launch CTA */}
        <footer className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-sky-400/20 pt-4">
          <div className="text-xs text-slate-300 tabular-nums lg:text-sm">
            <span className="text-slate-400">Active Loadout: </span>
            <span className="font-bold text-cyan-300">{chosen.name}</span>
            <span className="mx-2 text-slate-500">·</span>
            <span>{chosen.massMultiplier.toFixed(2)}× Mass</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="hud-btn-glass rounded-xl px-4 py-2.5 text-xs font-bold whitespace-nowrap uppercase transition"
            >
              Back
            </button>
            <button
              type="button"
              data-testid="briefing-launch-btn"
              onClick={onLaunch}
              className="hud-cta-cyan inline-flex items-center gap-2.5 rounded-xl px-6 py-2.5 font-display text-xs font-bold tracking-wider whitespace-nowrap uppercase transition lg:text-sm"
            >
              <Rocket className="h-4 w-4 shrink-0" />
              {launchCtaLabel}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
