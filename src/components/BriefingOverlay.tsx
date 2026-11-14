import {
  ArrowLeft,
  BookOpen,
  Database,
  Recycle,
  Rocket,
  ShieldAlert,
  Zap,
} from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4">
      <div className="hud-panel my-auto w-full max-w-4xl rounded-2xl p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-3.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400"
            >
              <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
              Title
            </button>
            <div>
              <p className="text-[11px] font-bold tracking-wider text-sky-300 uppercase">
                {mission.code} · {mission.planet === 'mars' ? 'MARS 0.38g' : 'MOON 0.165g'}
              </p>
              <h2 className="font-display text-2xl font-bold text-white">{mission.title}</h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenNotebook}
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-400/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/25"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Notes ({carryover.unlockedFieldNotes.length})
            </button>

            <button
              type="button"
              onClick={onOpenNasaModal}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
            >
              <Database className="h-4 w-4" />
              DONKI {donki.classType} · {osdr.studies.length} OSDR
            </button>
          </div>
        </div>

        {/* Campaign Stage Selector + Reuse Summary */}
        <div className="mb-4 grid gap-3 md:grid-cols-[1.25fr_1fr]">
          <div className="rounded-xl border border-slate-700/80 bg-slate-900/75 p-3">
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
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                      active
                        ? 'bg-sky-500 text-slate-950'
                        : done
                          ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                          : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {m.shortLabel}
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-relaxed text-slate-200">{mission.objectiveSummary}</p>
            <p className="mt-1 text-[11px] font-semibold text-sky-300">{mission.nasaGrounding}</p>
          </div>

          <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 p-3 text-xs">
            <div className="mb-1 flex items-center gap-1.5 font-bold text-emerald-300 uppercase">
              <Recycle className="h-3.5 w-3.5" />
              Reuse & Knowledge Loop
            </div>
            <p className="text-[11px] leading-snug text-slate-100">
              <strong className="text-amber-300">Inputs Used:</strong> {mission.reuseInput}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-100">
              <strong className="text-emerald-300">Unlocks Next:</strong> {mission.reuseOutput}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 border-t border-emerald-400/20 pt-1.5 font-mono-tech text-[10px] text-emerald-200">
              <span>Relay: {carryover.relaySatelliteOnline ? 'ON' : 'OFF'}</span>
              <span>H₂O: {carryover.isruWaterKg}kg</span>
              <span>Fuel: +{carryover.isruFuelBonusPct}%</span>
              <span>Dose: {carryover.radiationDoseMsv} mSv</span>
            </div>
          </div>
        </div>

        {/* Starting Resource Preview */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          {[
            {
              label: 'Power',
              val: previewResources.power,
              color: 'bg-amber-400',
              text: 'text-amber-300',
            },
            {
              label: 'Oxygen',
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
            <div key={r.label} className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-2.5">
              <div className="mb-1 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-200">{r.label}</span>
                <span className={`font-mono-tech ${r.text}`}>{Math.round(r.val)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full ${r.color} transition-all`} style={{ width: `${r.val}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* 4 Cargo Cards with Clear NASA Trade-Offs */}
        <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
          {payloadList.map((p) => {
            const active = p.id === selectedPayload;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPayload(p.id)}
                className={`rounded-xl border p-3.5 text-left transition ${
                  active
                    ? 'border-amber-400 bg-amber-500/15 shadow-md'
                    : 'border-slate-700/80 bg-slate-900/75 hover:border-sky-400/60'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-display text-sm font-bold text-white">{p.name}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      p.fragile ? 'bg-rose-500/20 text-rose-200' : 'bg-sky-500/20 text-sky-200'
                    }`}
                  >
                    {p.shortTag}
                  </span>
                </div>
                <p className="mb-1.5 text-xs leading-relaxed text-slate-200">{p.description}</p>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                  Trade-off: {p.tradeoffHint}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-200">
            <Zap className="h-4 w-4 text-sky-300" />
            <span>Every choice shifts spacecraft weight, fragility, or drill speed.</span>
          </div>

          <button
            type="button"
            data-testid="briefing-launch-btn"
            onClick={onLaunch}
            className="inline-flex items-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3 font-display text-sm font-bold tracking-wide text-slate-950 transition hover:bg-amber-400"
          >
            <Rocket className="h-4 w-4" />
            {launchCtaLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
