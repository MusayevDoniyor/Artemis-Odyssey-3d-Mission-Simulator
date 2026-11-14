import { ArrowLeft, Database, Rocket, ShieldAlert, Zap } from 'lucide-react';
import { PAYLOADS } from '../game/constants';
import type { DonkiStatus, PayloadId, ResourceState } from '../game/types';

interface BriefingOverlayProps {
  selectedPayload: PayloadId;
  onSelectPayload: (id: PayloadId) => void;
  resources: ResourceState;
  donki: DonkiStatus;
  onBack: () => void;
  onLaunch: () => void;
  onOpenNasaModal: () => void;
}

export function BriefingOverlay({
  selectedPayload,
  onSelectPayload,
  resources,
  donki,
  onBack,
  onLaunch,
  onOpenNasaModal,
}: BriefingOverlayProps) {
  const payloadList = Object.values(PAYLOADS);
  const chosen = PAYLOADS[selectedPayload];

  const previewResources: ResourceState = {
    power: Math.min(100, resources.power + (chosen.bonus.power || 0)),
    oxygen: Math.min(100, resources.oxygen + (chosen.bonus.oxygen || 0)),
    shield: Math.min(100, resources.shield + (chosen.bonus.shield || 0)),
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/55 p-4">
      <div className="hud-panel w-full max-w-4xl rounded-2xl p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/70 pb-4">
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
                Stage 0 · Engineering Trade-Off Briefing
              </p>
              <h2 className="font-display text-2xl font-bold text-white">Choose Your Lunar Cargo</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenNasaModal}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-500/25"
          >
            <Database className="h-4 w-4" />
            DONKI Alert: {donki.classType}
          </button>
        </div>

        {/* Starting Resource Preview */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          {[
            { label: 'Power', val: previewResources.power, color: 'bg-amber-400', text: 'text-amber-300' },
            { label: 'Oxygen', val: previewResources.oxygen, color: 'bg-sky-400', text: 'text-sky-300' },
            { label: 'Radiation Shield', val: previewResources.shield, color: 'bg-emerald-400', text: 'text-emerald-300' },
          ].map((r) => (
            <div key={r.label} className="rounded-xl border border-slate-700/70 bg-slate-900/80 p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
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
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {payloadList.map((p) => {
            const active = p.id === selectedPayload;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPayload(p.id)}
                className={`rounded-xl border p-4 text-left transition ${
                  active
                    ? 'border-amber-400 bg-amber-500/15 shadow-md'
                    : 'border-slate-700/80 bg-slate-900/75 hover:border-sky-400/60'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="font-display text-base font-bold text-white">{p.name}</span>
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-bold ${
                      p.fragile ? 'bg-rose-500/20 text-rose-200' : 'bg-sky-500/20 text-sky-200'
                    }`}
                  >
                    {p.shortTag}
                  </span>
                </div>
                <p className="mb-2 text-xs leading-relaxed text-slate-200">{p.description}</p>
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
            onClick={onLaunch}
            className="inline-flex items-center gap-2.5 rounded-xl bg-amber-500 px-6 py-3 font-display text-sm font-bold tracking-wide text-slate-950 transition hover:bg-amber-400"
          >
            <Rocket className="h-4 w-4" />
            PROCEED TO PAD 39B LAUNCH
          </button>
        </div>
      </div>
    </div>
  );
}
