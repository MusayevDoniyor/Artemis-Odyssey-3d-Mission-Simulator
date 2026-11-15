import {
  AlertTriangle,
  BatteryCharging,
  ChevronDown,
  HelpCircle,
  Minimize2,
  Radiation,
  Shield,
  Wind,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { getAnomalyHelpTerms } from '../game/marsQueue';
import type { AnomalyChoice, MissionAnomaly } from '../game/types';

interface CenteredEventCardProps {
  anomaly: MissionAnomaly | null;
  apollo1202Active: boolean;
  placement?: 'space-corner' | 'center';
  onResolveAnomaly: (anomalyId: string, choiceId: string) => void;
  onDismissAnomaly?: (anomalyId: string) => void;
  onAckApollo1202: () => void;
}

function shortVerbLabel(choice: AnomalyChoice): string {
  const cleaned = choice.label.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  const words = cleaned.split(/\s+/);
  return words.length > 7 ? `${words.slice(0, 7).join(' ')}` : cleaned;
}

interface EffectMetric {
  key: 'power' | 'shield' | 'oxygen' | 'dose';
  label: string;
  valueText: string;
  positive: boolean;
}

function getChoiceEffects(choice: AnomalyChoice): EffectMetric[] {
  const metrics: EffectMetric[] = [];
  const { power, shield, oxygen } = choice.deltaResources;
  if (typeof power === 'number' && power !== 0) {
    metrics.push({
      key: 'power',
      label: 'Power',
      valueText: `${power > 0 ? '+' : ''}${power}%`,
      positive: power > 0,
    });
  }
  if (typeof shield === 'number' && shield !== 0) {
    metrics.push({
      key: 'shield',
      label: 'Shield',
      valueText: `${shield > 0 ? '+' : ''}${shield}%`,
      positive: shield > 0,
    });
  }
  if (typeof oxygen === 'number' && oxygen !== 0) {
    metrics.push({
      key: 'oxygen',
      label: 'Air',
      valueText: `${oxygen > 0 ? '+' : ''}${oxygen}%`,
      positive: oxygen > 0,
    });
  }
  if (choice.doseDeltaMsv > 0) {
    metrics.push({
      key: 'dose',
      label: 'Dose',
      valueText: `+${choice.doseDeltaMsv} mSv`,
      positive: false,
    });
  }
  return metrics;
}

function EffectIcon({ kind, positive }: { kind: EffectMetric['key']; positive: boolean }) {
  const cls = `h-3.5 w-3.5 shrink-0 ${positive ? 'text-emerald-300' : 'text-rose-300'}`;
  if (kind === 'power') return <BatteryCharging className={cls} />;
  if (kind === 'shield') return <Shield className={cls} />;
  if (kind === 'oxygen') return <Wind className={cls} />;
  return <Radiation className="h-3.5 w-3.5 shrink-0 text-amber-300" />;
}

export function CenteredEventCard({
  anomaly,
  apollo1202Active,
  placement = 'center',
  onResolveAnomaly,
  onDismissAnomaly,
  onAckApollo1202,
}: CenteredEventCardProps) {
  const [openHelpIdx, setOpenHelpIdx] = useState<number | null>(null);
  const [minimizedForId, setMinimizedForId] = useState<string | null>(null);

  if (apollo1202Active) {
    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center p-4">
        <div
          data-testid="apollo-1202-banner"
          className="hud-soft-alert animate-modal-enter pointer-events-auto w-full max-w-lg rounded-2xl p-5 text-slate-100"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
              <h2 className="text-lg font-bold text-white">Computer Alarm 1202</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpenHelpIdx((v) => (v === 0 ? null : 0))}
              aria-label="Explain Alarm 1202"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-400/25 text-amber-300 hover:border-amber-300"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>
          <p className="text-base leading-snug text-slate-200">
            Rendezvous radar flooded the guidance computer, but priority scheduling kept engine control alive.
          </p>
          {openHelpIdx === 0 && (
            <p className="mt-2.5 rounded-xl bg-slate-950/75 px-3 py-2 text-sm text-amber-200">
              Program 1202 means the computer restarted low-priority tasks while protecting critical landing thrust.
            </p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              data-testid="ack-1202-btn"
              onClick={onAckApollo1202}
              className="hud-cta-cyan rounded-xl px-4 py-3 text-base font-bold transition"
            >
              Keep Landing
            </button>
            <button
              type="button"
              onClick={onAckApollo1202}
              className="rounded-xl border border-sky-400/25 bg-slate-900/75 px-4 py-3 text-base font-semibold text-slate-100 transition hover:border-amber-300"
            >
              Reset Radar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!anomaly || anomaly.resolvedChoiceId) return null;

  const isMinimized = minimizedForId === anomaly.id;
  const isCorner = placement === 'space-corner';

  // Enforce max 2 high-clarity decision options (optimal vs contrast)
  const sortedChoices = [...anomaly.choices];
  const optimal = sortedChoices.find((c) => c.isOptimal) ?? sortedChoices[0];
  const contrast = sortedChoices.find((c) => c.id !== optimal.id) ?? sortedChoices[1];
  const displayChoices = [optimal, contrast].filter((c): c is AnomalyChoice => Boolean(c));
  const helpTerms = getAnomalyHelpTerms(`${anomaly.title} ${anomaly.context}`);

  // Compact minimized warning chip tucked away from planetary center
  if (isMinimized) {
    return (
      <div
        className={
          isCorner
            ? 'pointer-events-none fixed top-[178px] left-4 z-20 lg:left-6'
            : 'pointer-events-none fixed top-20 left-1/2 z-20 -translate-x-1/2'
        }
      >
        <div
          data-testid="centered-event-card"
          className="hud-soft pointer-events-auto flex items-center gap-2.5 rounded-xl border-amber-400/45 px-3 py-2 text-slate-100 shadow-lg"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <button
            type="button"
            onClick={() => setMinimizedForId(null)}
            className="inline-flex items-center gap-2 text-left text-xs font-bold whitespace-nowrap text-white hover:text-cyan-200"
          >
            <span>{anomaly.title}</span>
            <ChevronDown className="h-3.5 w-3.5 text-cyan-300" />
          </button>
          {onDismissAnomaly && (
            <button
              type="button"
              aria-label="Dismiss mission alert"
              onClick={() => onDismissAnomaly(anomaly.id)}
              className="rounded-md p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isCorner
          ? 'pointer-events-none fixed top-[176px] left-4 z-20 w-[336px] max-w-[calc(100vw-2rem)] lg:left-6'
          : 'pointer-events-none fixed inset-0 z-20 flex items-center justify-center p-4'
      }
    >
      <div
        data-testid="centered-event-card"
        className={`hud-soft animate-modal-enter pointer-events-auto rounded-2xl border-amber-400/40 text-slate-100 ${
          isCorner ? 'w-full p-3.5' : 'w-full max-w-lg p-5'
        }`}
      >
        {/* Header Row: Warning Indicator + Title + Minimize / Dismiss */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-500/12">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-sm leading-snug font-bold text-white">
                {anomaly.title}
              </h2>
              <p className="mt-0.5 text-[11px] font-medium text-amber-200/80">
                {anomaly.nasaRef}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              data-testid="minimize-event-btn"
              aria-label="Minimize alert"
              title="Minimize Alert"
              onClick={() => setMinimizedForId(anomaly.id)}
              className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            {onDismissAnomaly && (
              <button
                type="button"
                data-testid="dismiss-event-btn"
                aria-label="Dismiss alert"
                title="Dismiss Alert"
                onClick={() => onDismissAnomaly(anomaly.id)}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Event Description */}
        <p className="mt-2 text-xs leading-relaxed text-slate-200">{anomaly.context}</p>

        {/* Single-line Technical Term Help Toggles */}
        {helpTerms.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {helpTerms.map((term, idx) => (
              <button
                key={term.term}
                type="button"
                onClick={() => setOpenHelpIdx((v) => (v === idx ? null : idx))}
                title={`Explain ${term.term}`}
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap shrink-0 transition ${
                  openHelpIdx === idx
                    ? 'border-amber-400/70 bg-amber-500/15 text-amber-200'
                    : 'border-white/12 bg-white/[0.03] text-slate-300 hover:border-cyan-400/45 hover:text-white'
                }`}
              >
                <HelpCircle className="h-3 w-3 text-cyan-300" />
                <span>{term.term}</span>
              </button>
            ))}
          </div>
        )}

        {openHelpIdx !== null && helpTerms[openHelpIdx] && (
          <div className="mt-2 rounded-xl border border-amber-400/25 bg-slate-950/80 px-2.5 py-2 text-xs leading-snug text-amber-100">
            <strong className="text-amber-300">{helpTerms[openHelpIdx].term}: </strong>
            {helpTerms[openHelpIdx].definition}
          </div>
        )}

        {/* Compact Interactive Decision Cards */}
        <div className={`mt-2.5 grid gap-2 ${isCorner ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
          {displayChoices.map((choice) => {
            const effects = getChoiceEffects(choice);
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onResolveAnomaly(anomaly.id, choice.id)}
                className="group flex flex-col gap-1.5 rounded-xl border border-sky-400/22 bg-slate-900/72 px-3 py-2 text-left transition duration-150 hover:border-cyan-400/80 hover:bg-cyan-500/12"
              >
                <span className="text-xs leading-snug font-bold text-white group-hover:text-cyan-100">
                  {shortVerbLabel(choice)}
                </span>
                {effects.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.06] pt-1.5 text-[11px] font-semibold tabular-nums">
                    {effects.map((eff) => (
                      <span
                        key={eff.key}
                        className={`inline-flex items-center gap-1 whitespace-nowrap ${
                          eff.key === 'dose'
                            ? 'text-amber-200'
                            : eff.positive
                              ? 'text-emerald-300'
                              : 'text-rose-300'
                        }`}
                      >
                        <EffectIcon kind={eff.key} positive={eff.positive} />
                        <span className="text-slate-400">{eff.label}</span>
                        <span>{eff.valueText}</span>
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
