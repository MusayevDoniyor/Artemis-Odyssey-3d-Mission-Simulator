import { AlertTriangle, ShieldAlert } from 'lucide-react';
import type { MissionWarning } from '../game/warnings';

interface MissionWarningBannerProps {
  warnings: MissionWarning[];
}

export function MissionWarningBanner({ warnings }: MissionWarningBannerProps) {
  if (warnings.length === 0) return null;

  const top = warnings[0];
  const isCritical = top.severity === 'critical';

  return (
    <div
      data-testid="mission-warning-banner"
      role="status"
      aria-live="polite"
      className={`pointer-events-none mx-auto flex w-full max-w-3xl items-center justify-between gap-3 rounded-xl border px-3.5 py-2 shadow-lg ${
        isCritical
          ? 'border-rose-400 bg-rose-950/95 text-rose-100'
          : 'border-amber-400 bg-amber-950/95 text-amber-100'
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {isCritical ? (
          <ShieldAlert className="h-4 w-4 shrink-0 text-rose-300" />
        ) : (
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`font-display text-[11px] font-bold tracking-wider uppercase ${
                isCritical ? 'text-rose-300' : 'text-amber-300'
              }`}
            >
              {top.title}
            </span>
            <span className="text-xs font-medium text-white">{top.action}</span>
          </div>
        </div>
      </div>

      {warnings.length > 1 && (
        <span
          className={`shrink-0 rounded border px-1.5 py-0.5 font-mono-tech text-[10px] font-bold uppercase ${
            isCritical
              ? 'border-rose-400/60 bg-rose-900 text-rose-200'
              : 'border-amber-400/60 bg-amber-900 text-amber-200'
          }`}
        >
          +{warnings.length - 1} alert{warnings.length - 1 > 1 ? 's' : ''}
        </span>
      )}
    </div>
  );
}
