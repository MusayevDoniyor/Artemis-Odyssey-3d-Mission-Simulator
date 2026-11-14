import { BookOpen, CheckCircle2, Lock, Radiation, Recycle, Shield, X } from 'lucide-react';
import { CAMPAIGN_ANOMALIES, FIELD_NOTES } from '../game/constants';
import type { CampaignCarryoverState } from '../game/types';

interface FieldNotebookModalProps {
  open: boolean;
  carryover: CampaignCarryoverState;
  onClose: () => void;
}

export function FieldNotebookModal({ open, carryover, onClose }: FieldNotebookModalProps) {
  if (!open) return null;

  const dosePct = Math.min(100, Math.round((carryover.radiationDoseMsv / 150) * 100));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="hud-panel max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between border-b border-slate-700/70 pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-300" />
            <div>
              <p className="text-[11px] font-bold tracking-wider text-sky-300 uppercase">
                Reuse & Applied Knowledge Ledger
              </p>
              <h2 className="font-display text-2xl font-bold text-white">
                Astronaut Field Notebook
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-300 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Carryover ISRU & Hardware Assets Grid */}
        <div className="mb-5 rounded-xl border border-sky-400/30 bg-slate-900/80 p-4">
          <div className="mb-2.5 flex items-center gap-2 text-xs font-bold tracking-wider text-sky-300 uppercase">
            <Recycle className="h-4 w-4" />
            Carried Hardware & ISRU Reserves Across Missions
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 p-2.5">
              <span className="block text-[10px] text-slate-400 uppercase">Relay Satellite</span>
              <span
                className={`font-display text-sm font-bold ${
                  carryover.relaySatelliteOnline ? 'text-emerald-300' : 'text-slate-400'
                }`}
              >
                {carryover.relaySatelliteOnline ? 'ONLINE' : 'NOT DEPLOYED'}
              </span>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 p-2.5">
              <span className="block text-[10px] text-slate-400 uppercase">ISRU Water</span>
              <span className="font-mono-tech text-sm font-bold text-sky-300">
                {carryover.isruWaterKg} kg
              </span>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 p-2.5">
              <span className="block text-[10px] text-slate-400 uppercase">ISRU Fuel</span>
              <span className="font-mono-tech text-sm font-bold text-amber-300">
                +{carryover.isruFuelBonusPct}%
              </span>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 p-2.5">
              <span className="block text-[10px] text-slate-400 uppercase">Solar Grid</span>
              <span className="font-mono-tech text-sm font-bold text-emerald-300">
                {carryover.solarGridKw} kW
              </span>
            </div>
            <div className="rounded-lg border border-slate-700/80 bg-slate-950/80 p-2.5">
              <span className="block text-[10px] text-slate-400 uppercase">Mars Cores</span>
              <span className="font-mono-tech text-sm font-bold text-orange-300">
                {carryover.marsSamplesCached} / 4
              </span>
            </div>
          </div>

          {/* Cumulative Crew Radiation Dose vs NASA 150 mSv Limit */}
          <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-950/75 p-2.5">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                <Radiation className="h-3.5 w-3.5 text-amber-400" />
                Cumulative Crew Dose (NASA Limit: 150 mSv) · Regolith Berm Tier{' '}
                {carryover.regolithShieldLevel}
              </span>
              <span className="font-mono-tech font-bold text-amber-300">
                {carryover.radiationDoseMsv} / 150 mSv
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all ${
                  dosePct > 75 ? 'bg-rose-400' : dosePct > 45 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${dosePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Field Notes Section */}
        <h3 className="mb-2.5 font-display text-sm font-bold tracking-wider text-amber-300 uppercase">
          Engineering Field Notes ({carryover.unlockedFieldNotes.length}/{FIELD_NOTES.length} Unlocked)
        </h3>
        <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
          {FIELD_NOTES.map((note) => {
            const unlocked = carryover.unlockedFieldNotes.includes(note.id);
            return (
              <div
                key={note.id}
                className={`rounded-xl border p-3 ${
                  unlocked
                    ? 'border-emerald-400/40 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-900/60 opacity-75'
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white">
                    {unlocked ? (
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                    {note.title}
                  </span>
                  <span className="text-[10px] font-semibold text-sky-300 uppercase">
                    {note.category}
                  </span>
                </div>
                <p className="mb-1 text-[10px] font-semibold text-slate-400">{note.sourceRef}</p>
                {unlocked ? (
                  <>
                    <p className="mb-1.5 text-xs leading-relaxed text-slate-200">{note.summary}</p>
                    <p className="rounded bg-slate-950/75 px-2 py-1 text-[11px] font-semibold text-amber-200">
                      Apply: {note.appliedRule}
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Inspect vehicle subsystems or complete surface science sites to unlock this rule.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Solved Campaign Anomalies */}
        <h3 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold tracking-wider text-sky-300 uppercase">
          <Shield className="h-4 w-4" />
          Applied Crisis Decisions ({carryover.solvedAnomalies.length}/{CAMPAIGN_ANOMALIES.length})
        </h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {CAMPAIGN_ANOMALIES.map((anom) => {
            const solved = carryover.solvedAnomalies.includes(anom.id);
            return (
              <div
                key={anom.id}
                className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{anom.title}</span>
                  <span
                    className={`font-mono-tech text-[10px] font-bold ${
                      solved ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {solved ? 'RESOLVED' : 'PENDING'}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-300">{anom.nasaRef}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
