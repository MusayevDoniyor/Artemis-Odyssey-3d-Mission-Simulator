import {
  Activity,
  Atom,
  DoorOpen,
  FileBarChart,
  FlaskConical,
  Radio,
  Shield,
  Sprout,
  Sun,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { OUTPOST_INTERIOR_BAYS, buildSolSummaryReport } from '../game/outpost';
import type {
  CampaignCarryoverState,
  OutpostConsoleState,
  OutpostInteriorRoom,
  PowerSourceMode,
  ResourceState,
} from '../game/types';

interface OutpostConsoleModalProps {
  state: OutpostConsoleState;
  resources: ResourceState;
  carryover: CampaignCarryoverState;
  dustPct: number;
  onClose: () => void;
  onToggleAirlock: () => void;
  onSelectRoom: (room: OutpostInteriorRoom) => void;
  onSwitchPowerSource: (mode: PowerSourceMode) => void;
  onAdvanceSol: () => void;
}

const ROOM_ICON: Record<OutpostInteriorRoom, typeof Shield> = {
  quarters: Shield,
  lab: FlaskConical,
  greenhouse: Sprout,
  comms: Radio,
};

export function OutpostConsoleModal({
  state,
  resources,
  carryover,
  dustPct,
  onClose,
  onToggleAirlock,
  onSelectRoom,
  onSwitchPowerSource,
  onAdvanceSol,
}: OutpostConsoleModalProps) {
  const [showSolReport, setShowSolReport] = useState(false);

  if (!state.open) return null;

  const isInside = state.airlockStage === 'SEALED_INT';
  const isCycling =
    state.airlockStage === 'REPRESSURIZING' || state.airlockStage === 'DEPRESSURIZING';
  const activeBay =
    OUTPOST_INTERIOR_BAYS.find((b) => b.id === state.activeRoom) ?? OUTPOST_INTERIOR_BAYS[0];
  const solReport = buildSolSummaryReport(
    state.planet,
    resources,
    carryover,
    state.powerSource,
    state.solNumber,
    dustPct
  );

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/82 p-4">
      <div
        data-testid="outpost-console-modal"
        className="hud-panel tactical-frame animate-modal-enter flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl p-5"
      >
        {/* Header */}
        <div className="mb-4 flex shrink-0 items-start justify-between gap-3 border-b border-sky-400/20 pb-3">
          <div>
            <p className="font-hud text-[11px] font-bold tracking-[0.18em] text-emerald-300 uppercase">
              Sol {state.solNumber} · {state.planet === 'mars' ? 'Jezero Base Camp' : 'Shackleton Rim Base Camp'}
            </p>
            <h2 className="font-display text-xl font-bold text-white uppercase">
              Outpost Interior &amp; Airlock Console
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="toggle-sol-report-btn"
              onClick={() => setShowSolReport((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-hud text-xs font-bold uppercase ${
                showSolReport
                  ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                  : 'border-sky-400/35 bg-slate-900/75 text-sky-200 hover:border-sky-300'
              }`}
            >
              <FileBarChart className="h-3.5 w-3.5" />
              {showSolReport ? 'Interior Bays' : 'Sol Summary'}
            </button>
            <button
              type="button"
              aria-label="Close Outpost Console"
              onClick={onClose}
              className="rounded-xl border border-sky-400/25 bg-slate-900/75 p-2 text-slate-300 hover:border-sky-400/60 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 3 Core Resource Strips (POWER, AIR/O₂, SHIELDING) */}
        <div className="mb-4 grid shrink-0 grid-cols-3 gap-2.5 text-xs tabular-nums">
          <div className="rounded-xl border border-amber-400/30 bg-slate-950/65 p-2.5">
            <div className="flex justify-between font-hud text-[11px] font-bold text-amber-300 uppercase">
              <span>Power Bus</span>
              <span className="font-mono-tech">{Math.round(resources.power)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-amber-400" style={{ width: `${Math.round(resources.power)}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-sky-400/30 bg-slate-950/65 p-2.5">
            <div className="flex justify-between font-hud text-[11px] font-bold text-sky-300 uppercase">
              <span>Air / O₂</span>
              <span className="font-mono-tech">{Math.round(resources.oxygen)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-sky-400" style={{ width: `${Math.round(resources.oxygen)}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-emerald-400/30 bg-slate-950/65 p-2.5">
            <div className="flex justify-between font-hud text-[11px] font-bold text-emerald-300 uppercase">
              <span>Shielding</span>
              <span className="font-mono-tech">{Math.round(resources.shield)}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-emerald-400" style={{ width: `${Math.round(resources.shield)}%` }} />
            </div>
          </div>
        </div>

        {/* Airlock Pressurization Cycle Bar */}
        <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-400/20 bg-slate-900/65 p-3">
          <div className="flex items-center gap-3">
            <DoorOpen className={`h-5 w-5 ${isInside ? 'text-emerald-300' : 'text-amber-300'}`} />
            <div>
              <div className="font-hud text-xs font-bold text-white uppercase">
                Airlock Status: {state.airlockStage.replace('_', ' ')}
              </div>
              <div className="text-[11px] text-slate-300">
                {isInside
                  ? 'Cabin pressurized to 101 kPa Earth-normal mix—interior bays open.'
                  : isCycling
                    ? `Equalizing chamber pressure (${Math.round(state.airlockProgressPct)}%)...`
                    : 'Outer hatch open to crater vacuum—cycle airlock to enter habitat safely.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full transition-all ${
                  isInside ? 'bg-emerald-400' : isCycling ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${Math.round(state.airlockProgressPct)}%` }}
              />
            </div>
            <button
              type="button"
              data-testid="airlock-cycle-btn"
              disabled={isCycling}
              onClick={onToggleAirlock}
              className={`rounded-lg px-3.5 py-2 font-hud text-xs font-bold uppercase transition ${
                isCycling
                  ? 'bg-slate-800 text-slate-500'
                  : isInside
                    ? 'border border-amber-400/60 bg-amber-500/20 text-amber-200 hover:bg-amber-500/30'
                    : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
              }`}
            >
              {isInside ? 'Depressurize / Exit' : isCycling ? 'Cycling...' : 'Cycle Airlock & Enter'}
            </button>
          </div>
        </div>

        {/* Main Body: Interior Bays OR End-of-Sol "What Happened & Why" Report */}
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {showSolReport ? (
            <div
              data-testid="sol-summary-report"
              className="rounded-xl border border-amber-400/40 bg-slate-950/95 p-4"
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div>
                  <h3 className="font-display text-base font-bold text-amber-300 uppercase">
                    Sol {solReport.solNumber} — What Happened &amp; Why
                  </h3>
                  <p className="text-xs text-slate-300">
                    Trade-off debrief across Power, Air/O₂, and Radiation Shielding ({solReport.doseMsv} mSv cumulative).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onAdvanceSol}
                  className="rounded-lg bg-amber-500 px-3.5 py-1.5 font-hud text-xs font-bold text-slate-950 uppercase hover:bg-amber-400"
                >
                  Start Sol {solReport.solNumber + 1} (+Recharge)
                </button>
              </div>

              <ul className="mb-3 space-y-2 text-xs text-slate-100">
                {solReport.highlights.map((h) => (
                  <li key={h} className="rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-2">
                    {h}
                  </li>
                ))}
              </ul>

              <div className="rounded-lg border border-sky-400/30 bg-sky-500/10 p-3 text-xs text-sky-100">
                <strong className="font-hud uppercase">Flight Surgeon Recommendation: </strong>
                {solReport.recommendation}
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              {/* Room Selector Tabs */}
              <div className="flex flex-col gap-1.5">
                {OUTPOST_INTERIOR_BAYS.map((bay) => {
                  const Icon = ROOM_ICON[bay.id];
                  const active = state.activeRoom === bay.id;
                  return (
                    <button
                      key={bay.id}
                      type="button"
                      disabled={!isInside}
                      onClick={() => onSelectRoom(bay.id)}
                      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left font-hud text-xs font-bold transition ${
                        !isInside
                          ? 'border-slate-800 bg-slate-900/50 text-slate-600'
                          : active
                            ? 'border-sky-400 bg-sky-500/20 text-white'
                            : 'border-sky-400/15 bg-slate-900/65 text-slate-200 hover:border-sky-400/50'
                      }`}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${active && isInside ? 'text-sky-300' : 'text-slate-400'}`} />
                        {bay.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Interior Bay Schematic & Controls */}
              <div className="flex flex-col justify-between gap-3 rounded-xl border border-sky-400/20 bg-slate-950/65 p-4">
                {!isInside ? (
                  <div className="my-auto py-8 text-center">
                    <p className="font-display text-sm font-bold text-amber-300 uppercase">
                      Airlock Exterior Open
                    </p>
                    <p className="mt-1 text-xs text-slate-300">
                      Press <strong>Cycle Airlock &amp; Enter</strong> above to seal the hatch and access interior habitat bays.
                    </p>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-display text-base font-bold text-sky-200 uppercase">
                          {activeBay.name}
                        </h3>
                        <span className="rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-emerald-300">
                          {activeBay.resourceFocus}
                        </span>
                      </div>
                      <p className="font-mono-tech text-[11px] font-semibold text-amber-300">
                        {activeBay.role}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-100">
                        {activeBay.statusLine}
                      </p>
                      <div className="mt-3 rounded-lg border border-sky-400/15 bg-slate-900/75 p-3 text-xs text-slate-200">
                        <span className="font-hud font-bold text-sky-300 uppercase">Real Physics Rule: </span>
                        {activeBay.fact}
                      </div>
                    </div>

                    {/* Power Source Switcher (Solar Towers vs Kilopower Nuclear Fission) */}
                    <div className="border-t border-slate-800 pt-3">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="inline-flex items-center gap-1.5 font-hud font-bold text-slate-200 uppercase">
                          <Activity className="h-3.5 w-3.5 text-amber-300" />
                          Outpost Power Grid Source
                        </span>
                        <span className="font-mono-tech text-[11px] text-slate-400">
                          3D Kilopower Module: {state.kilopowerActive ? 'ONLINE' : 'STANDBY'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => onSwitchPowerSource('solar')}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                            state.powerSource === 'solar'
                              ? 'border-amber-400 bg-amber-500/20 text-white'
                              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-400/50'
                          }`}
                        >
                          <Sun className="h-4 w-4 shrink-0 text-amber-300" />
                          <div>
                            <div className="font-hud font-bold uppercase">Solar Towers</div>
                            <div className="text-[10px] text-slate-300">
                              Clean peak power · Mars dust shades arrays
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          data-testid="kilopower-switch-btn"
                          onClick={() => onSwitchPowerSource('kilopower')}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition ${
                            state.powerSource === 'kilopower'
                              ? 'border-cyan-400 bg-cyan-500/20 text-white'
                              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-400/50'
                          }`}
                        >
                          <Atom className="h-4 w-4 shrink-0 text-cyan-300" />
                          <div>
                            <div className="font-hud font-bold uppercase">Kilopower Fission</div>
                            <div className="text-[10px] text-slate-300">
                              Steady 24/7 base wattage in dark craters
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
