import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { extractChoiceCostChips, getAnomalyHelpTerms } from '../game/marsQueue';
import type { AnomalyChoice, MissionAnomaly } from '../game/types';

interface CenteredEventCardProps {
  anomaly: MissionAnomaly | null;
  apollo1202Active: boolean;
  onResolveAnomaly: (anomalyId: string, choiceId: string) => void;
  onAckApollo1202: () => void;
}

function shortVerbLabel(choice: AnomalyChoice): string {
  // Trim inline stat suffixes in parens from raw choice labels so we render clean cost chips instead
  const cleaned = choice.label.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  const words = cleaned.split(/\s+/);
  return words.length > 7 ? `${words.slice(0, 7).join(' ')}` : cleaned;
}

export function CenteredEventCard({
  anomaly,
  apollo1202Active,
  onResolveAnomaly,
  onAckApollo1202,
}: CenteredEventCardProps) {
  const [openHelpIdx, setOpenHelpIdx] = useState<number | null>(null);

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
              className="rounded-xl bg-amber-500 px-4 py-3 text-base font-bold text-slate-950 transition hover:bg-amber-400"
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

  // Enforce max 2 big choice buttons on the centered event card (keep optimal + first contrast option)
  const sortedChoices = [...anomaly.choices];
  const optimal = sortedChoices.find((c) => c.isOptimal) ?? sortedChoices[0];
  const contrast = sortedChoices.find((c) => c.id !== optimal.id) ?? sortedChoices[1];
  const displayChoices = [optimal, contrast].filter((c): c is AnomalyChoice => Boolean(c));
  const helpTerms = getAnomalyHelpTerms(`${anomaly.title} ${anomaly.context}`);

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center p-4">
      <div
        data-testid="centered-event-card"
        className="hud-soft animate-modal-enter pointer-events-auto w-full max-w-lg rounded-2xl border-amber-400/45 p-5 text-slate-100"
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
            <h2 className="text-lg font-bold text-white">{anomaly.title}</h2>
          </div>
          {helpTerms.length > 0 && (
            <div className="flex items-center gap-1.5">
              {helpTerms.map((term, idx) => (
                <button
                  key={term.term}
                  type="button"
                  onClick={() => setOpenHelpIdx((v) => (v === idx ? null : idx))}
                  title={`Explain ${term.term}`}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm font-semibold ${
                    openHelpIdx === idx
                      ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                      : 'border-sky-400/25 text-slate-300 hover:border-amber-300'
                  }`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>{term.term}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="text-base leading-snug text-slate-200">{anomaly.context}</p>

        {openHelpIdx !== null && helpTerms[openHelpIdx] && (
          <div className="mt-2.5 rounded-xl bg-slate-950/75 px-3 py-2 text-sm text-amber-200">
            <strong className="text-amber-300">{helpTerms[openHelpIdx].term}: </strong>
            {helpTerms[openHelpIdx].definition}
          </div>
        )}

        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {displayChoices.map((choice) => {
            const chips = extractChoiceCostChips(choice);
            return (
              <button
                key={choice.id}
                type="button"
                onClick={() => onResolveAnomaly(anomaly.id, choice.id)}
                className="flex flex-col justify-between rounded-xl border border-sky-400/25 bg-slate-900/75 px-4 py-3 text-left transition hover:border-amber-400 hover:bg-amber-500/15"
              >
                <span className="text-base font-bold text-white">{shortVerbLabel(choice)}</span>
                {chips.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {chips.map((chip) => (
                      <span
                        key={chip.label}
                        className={`rounded-md px-2 py-0.5 text-sm font-semibold ${
                          chip.positive
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'bg-rose-500/20 text-rose-200'
                        }`}
                      >
                        {chip.label}
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
