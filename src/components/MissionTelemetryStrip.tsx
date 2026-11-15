import { HelpCircle, Info, X } from 'lucide-react';
import { useState } from 'react';
import {
  GLOSSARY_ENTRIES,
  type FactContextKey,
  type HonestyBadgeKind,
  getFactForPhase,
} from '../game/factsAndGlossary';

export interface TelemetryMetricItem {
  label: string;
  value: string;
  tone?: 'white' | 'cyan' | 'amber' | 'emerald' | 'rose';
}

interface MissionTelemetryStripProps {
  context: FactContextKey;
  elapsedSec: number;
  phaseLabel: string;
  nextMilestone: string;
  etaLabel: string;
  metrics?: TelemetryMetricItem[];
  compact?: boolean;
}

const BADGE_STYLE: Record<HonestyBadgeKind, string> = {
  'REAL DATA': 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300',
  'REFERENCE VALUE': 'border-cyan-400/50 bg-cyan-500/15 text-cyan-300',
  'SIMULATED VALUE': 'border-amber-400/50 bg-amber-500/15 text-amber-300',
};

const TONE_CLASS: Record<NonNullable<TelemetryMetricItem['tone']>, string> = {
  white: 'text-white',
  cyan: 'text-cyan-300',
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  rose: 'text-rose-300',
};

export function MissionTelemetryStrip({
  context,
  elapsedSec,
  phaseLabel,
  nextMilestone,
  etaLabel,
  metrics = [],
  compact = false,
}: MissionTelemetryStripProps) {
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const fact = getFactForPhase(context, elapsedSec);
  const glossary = GLOSSARY_ENTRIES[fact.glossaryId] ?? GLOSSARY_ENTRIES['delta-v'];

  return (
    <div
      data-testid="mission-telemetry-strip"
      className="hud-panel pointer-events-auto relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2.5 rounded-xl px-3.5 py-1.5 text-xs tabular-nums"
    >
      {/* Left: Live Phase + Next Milestone + Metrics */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 border-r border-slate-700/80 pr-3">
          <span className="font-display text-[11px] font-bold tracking-wider text-cyan-300 uppercase">
            {phaseLabel}
          </span>
          <span className="text-slate-500">·</span>
          <span className="font-mono-tech text-[11px] font-semibold text-amber-300">
            Next: {nextMilestone}
          </span>
          <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono-tech text-[10px] font-bold text-slate-300">
            ETA {etaLabel}
          </span>
        </div>

        {!compact && metrics.length > 0 && (
          <div className="hidden flex-wrap items-center gap-3 lg:flex">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-baseline gap-1.5">
                <span className="font-hud text-[10px] font-bold text-slate-400 uppercase">
                  {m.label}
                </span>
                <span
                  className={`font-mono-tech text-[11px] font-bold ${
                    TONE_CLASS[m.tone ?? 'white']
                  }`}
                >
                  {m.value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Rotating Educational "Did You Know?" + Glossary Chip + Honesty Badge */}
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] text-slate-200">
          <Info className="h-3.5 w-3.5 shrink-0 text-amber-300" />
          <span className="hidden font-hud text-[10px] font-bold tracking-wide text-amber-300 uppercase sm:inline">
            Did You Know?
          </span>
          <p className="truncate font-medium text-slate-100" title={fact.text}>
            {fact.text}
          </p>
        </div>

        <button
          type="button"
          data-testid="glossary-chip-btn"
          onClick={() => setGlossaryOpen((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 rounded border border-cyan-400/50 bg-cyan-500/15 px-2 py-0.5 font-hud text-[10px] font-bold text-cyan-200 uppercase hover:border-cyan-300 hover:bg-cyan-500/25"
        >
          <HelpCircle className="h-3 w-3" />
          {glossary.shortLabel}
        </button>

        <span
          className={`hidden shrink-0 rounded border px-1.5 py-0.5 font-mono-tech text-[9px] font-bold tracking-wide uppercase md:inline-block ${
            BADGE_STYLE[fact.badge]
          }`}
        >
          {fact.badge}
        </span>
      </div>

      {/* Inline Glossary Tooltip Card */}
      {glossaryOpen && (
        <div
          role="dialog"
          aria-label={`Glossary: ${glossary.term}`}
          className="hud-panel-amber tactical-frame absolute top-full right-3 z-30 mt-2 w-80 rounded-xl p-3 shadow-2xl"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-display text-xs font-bold text-amber-300 uppercase">
              {glossary.term}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`rounded border px-1.5 py-0.5 font-mono-tech text-[9px] font-bold ${
                  BADGE_STYLE[glossary.badge]
                }`}
              >
                {glossary.badge}
              </span>
              <button
                type="button"
                aria-label="Close glossary definition"
                onClick={() => setGlossaryOpen(false)}
                className="rounded border border-slate-700 bg-slate-900 p-0.5 text-slate-300 hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-100">{glossary.definition}</p>
        </div>
      )}
    </div>
  );
}
