import { Lightbulb, X } from 'lucide-react';
import type { ContextualFact } from '../game/factsAndGlossary';

interface CalmFactToastProps {
  fact: ContextualFact | null;
  onDismiss: () => void;
}

export function CalmFactToast({ fact, onDismiss }: CalmFactToastProps) {
  if (!fact) return null;

  return (
    <div
      data-testid="calm-fact-toast"
      className="hud-soft animate-modal-enter pointer-events-auto fixed bottom-20 left-1/2 z-15 flex w-full max-w-xl -translate-x-1/2 items-start gap-3 rounded-2xl border-amber-400/35 px-4 py-3"
    >
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
          <span>Did you know?</span>
          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-xs font-semibold text-sky-200">
            {fact.badge}
          </span>
        </div>
        <p className="mt-0.5 text-base leading-snug text-slate-100">{fact.text}</p>
      </div>
      <button
        type="button"
        aria-label="Dismiss fact"
        onClick={onDismiss}
        className="rounded-lg p-1 text-slate-400 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
