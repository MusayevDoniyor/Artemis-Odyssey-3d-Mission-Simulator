import { BookOpen, CheckCircle2, Lock, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/88 p-4 backdrop-blur-md">
      <div className="hud-panel tactical-frame animate-modal-enter flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl p-6">
        <div className="mb-4 flex shrink-0 items-center justify-between border-b border-cyan-500/20 pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-amber-300" />
            <div>
              <p className="font-hud text-[11px] font-bold tracking-[0.18em] text-cyan-300 uppercase">
                ISRU Carryover &amp; Field Rules
              </p>
              <h2 className="font-display text-2xl font-bold text-white uppercase">
                Astronaut Field Ledger
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-cyan-500/30 bg-slate-900 p-2 text-slate-300 hover:border-cyan-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          {/* Carryover ISRU & Hardware Assets Grid */}
          <div className="mb-5 rounded-xl border border-cyan-400/30 bg-slate-900/95 p-4">
            <div className="mb-2.5 flex items-center justify-between font-hud text-xs font-bold tracking-wider text-cyan-300 uppercase">
              <span>Campaign Hardware &amp; ISRU Reserves</span>
              <span className="font-mono-tech text-[10px] text-emerald-300">
                BERM TIER {carryover.regolithShieldLevel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <div className="rounded-lg border border-cyan-500/25 bg-slate-950/95 p-2.5">
                <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                  HERMES Sat
                </span>
                <span
                  className={`font-display text-sm font-bold ${
                    carryover.relaySatelliteOnline ? 'text-emerald-300' : 'text-slate-400'
                  }`}
                >
                  {carryover.relaySatelliteOnline ? 'ONLINE' : 'STOWED'}
                </span>
              </div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-950/95 p-2.5">
                <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                  ISRU H₂O
                </span>
                <span className="font-mono-tech text-sm font-bold text-cyan-300">
                  {carryover.isruWaterKg} kg
                </span>
              </div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-950/95 p-2.5">
                <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                  Fuel Bonus
                </span>
                <span className="font-mono-tech text-sm font-bold text-amber-300">
                  +{carryover.isruFuelBonusPct}%
                </span>
              </div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-950/95 p-2.5">
                <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                  Solar Grid
                </span>
                <span className="font-mono-tech text-sm font-bold text-emerald-300">
                  {carryover.solarGridKw} kW
                </span>
              </div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-950/95 p-2.5">
                <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                  Mars Cores
                </span>
                <span className="font-mono-tech text-sm font-bold text-orange-300">
                  {carryover.marsSamplesCached} / 4
                </span>
              </div>
            </div>

            {/* Illustrated 150 mSv NASA Crew Dose Safety Scale */}
            <div className="mt-3 rounded-lg border border-cyan-500/25 bg-slate-950/95 p-3">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-hud font-bold tracking-wide text-slate-200 uppercase">
                  Cumulative Crew Dose vs NASA Limit
                </span>
                <span className="font-mono-tech font-bold text-amber-300">
                  {carryover.radiationDoseMsv} / 150 mSv
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
                {/* Threshold zone ticks at 33% (50 mSv) & 67% (100 mSv) */}
                <div className="absolute left-1/3 top-0 z-10 h-full w-px bg-slate-950/80" />
                <div className="absolute left-2/3 top-0 z-10 h-full w-px bg-slate-950/80" />
                <div
                  className={`h-full transition-all ${
                    dosePct > 75 ? 'bg-rose-400' : dosePct > 45 ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                  style={{ width: `${Math.max(2, dosePct)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between font-mono-tech text-[9px] text-slate-400">
                <span>0 mSv SAFE</span>
                <span>50 mSv NOMINAL</span>
                <span>100 mSv CAUTION</span>
                <span className="text-rose-300">150 mSv LIMIT</span>
              </div>
            </div>
          </div>

          {/* Field Notes Section */}
          <h3 className="mb-2.5 font-display text-sm font-bold tracking-wider text-amber-300 uppercase">
            Engineering Notes ({carryover.unlockedFieldNotes.length}/{FIELD_NOTES.length})
          </h3>
          <div className="mb-5 grid gap-2.5 sm:grid-cols-2">
            {FIELD_NOTES.map((note) => {
              const unlocked = carryover.unlockedFieldNotes.includes(note.id);
              return (
                <div
                  key={note.id}
                  className={`rounded-xl border p-3 ${
                    unlocked
                      ? 'border-emerald-400/45 bg-slate-900/95'
                      : 'border-slate-800 bg-slate-900/90 opacity-80'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-hud text-xs font-bold text-white">
                      {unlocked ? (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      )}
                      {note.title}
                    </span>
                    <span className="font-mono-tech text-[10px] font-bold text-cyan-300 uppercase">
                      {note.category}
                    </span>
                  </div>
                  <p className="mb-1 font-mono-tech text-[10px] text-slate-400">{note.sourceRef}</p>
                  {unlocked ? (
                    <>
                      <p className="mb-1.5 text-xs text-slate-200">{note.summary}</p>
                      <p className="rounded bg-slate-950/95 px-2 py-1 text-[11px] font-semibold text-amber-200">
                        Apply: {note.appliedRule}
                      </p>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-400">
                      Inspect vehicle hardware or sample surface sites to unlock.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Solved Campaign Anomalies */}
          <h3 className="mb-2 font-display text-sm font-bold tracking-wider text-cyan-300 uppercase">
            Flight Crisis Log ({carryover.solvedAnomalies.length}/{CAMPAIGN_ANOMALIES.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {CAMPAIGN_ANOMALIES.map((anom) => {
              const solved = carryover.solvedAnomalies.includes(anom.id);
              return (
                <div
                  key={anom.id}
                  className="rounded-lg border border-cyan-500/25 bg-slate-900/95 p-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-hud font-bold text-white">{anom.title}</span>
                    <span
                      className={`font-mono-tech text-[10px] font-bold ${
                        solved ? 'text-emerald-300' : 'text-slate-400'
                      }`}
                    >
                      {solved ? 'RESOLVED' : 'PENDING'}
                    </span>
                  </div>
                  <p className="mt-0.5 font-mono-tech text-[10px] text-slate-400">{anom.nasaRef}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
