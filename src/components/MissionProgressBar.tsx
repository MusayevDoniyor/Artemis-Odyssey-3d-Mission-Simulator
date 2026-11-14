import type { MissionProgressInfo } from '../game/missionProgress';

interface MissionProgressBarProps {
  info: MissionProgressInfo;
}

const ACCENT_STYLES: Record<
  MissionProgressInfo['accent'],
  {
    fill: string;
    label: string;
    marker: string;
  }
> = {
  cyan: {
    fill: 'bg-cyan-400',
    label: 'text-cyan-300',
    marker: 'bg-cyan-200 border-cyan-400',
  },
  amber: {
    fill: 'bg-amber-400',
    label: 'text-amber-300',
    marker: 'bg-amber-200 border-amber-400',
  },
  emerald: {
    fill: 'bg-emerald-400',
    label: 'text-emerald-300',
    marker: 'bg-emerald-200 border-emerald-400',
  },
  orange: {
    fill: 'bg-orange-400',
    label: 'text-orange-300',
    marker: 'bg-orange-200 border-orange-400',
  },
};

export function MissionProgressBar({ info }: MissionProgressBarProps) {
  const pct = Math.max(0, Math.min(100, info.progressPct));
  const styles = ACCENT_STYLES[info.accent];

  return (
    <section
      data-testid="mission-progress-bar"
      aria-label="Mission Progress"
      className="hud-panel pointer-events-auto mx-auto w-full max-w-3xl rounded-xl px-4 py-2"
    >
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`font-display text-[11px] font-bold tracking-wider uppercase ${styles.label}`}>
            {info.phaseLabel}
          </span>
          <span className="hidden text-slate-500 sm:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden truncate font-hud text-[11px] font-semibold text-slate-300 sm:inline">
            {info.originLabel} → {info.destinationLabel}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <span
            data-testid="mission-progress-remaining"
            className="font-mono-tech text-[11px] font-bold text-white"
          >
            {info.remainingLabel}
          </span>
          <span className="hidden text-slate-600 md:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden font-mono-tech text-[11px] text-slate-300 md:inline">
            {info.detailLabel}
          </span>
          <span
            data-testid="mission-progress-pct"
            className={`font-mono-tech text-xs font-bold ${styles.label}`}
          >
            {Math.round(pct)}%
          </span>
        </div>
      </div>

      {/* Progress Track + Milestone Ticks */}
      <div className="relative h-2.5 w-full rounded-full bg-slate-900/95 ring-1 ring-slate-700/80">
        <div
          className={`h-full rounded-full transition-[width] duration-150 ${styles.fill}`}
          style={{ width: `${pct.toFixed(1)}%` }}
        />

        {/* Milestone vertical ticks */}
        {info.milestones.map((m) => (
          <div
            key={m.label}
            className="pointer-events-none absolute top-0 bottom-0 -translate-x-1/2"
            style={{ left: `${Math.max(4, Math.min(96, m.pct))}%` }}
            title={m.label}
          >
            <div
              className={`h-full w-0.5 ${m.reached ? 'bg-slate-950/75' : 'bg-slate-500/75'}`}
            />
          </div>
        ))}

        {/* Active Craft / Mission Cursor */}
        <div
          className={`pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow ${styles.marker}`}
          style={{ left: `${Math.max(1.5, Math.min(98.5, pct))}%` }}
        />
      </div>

      {/* Milestone Micro-Labels */}
      {info.milestones.length > 0 && (
        <div className="relative mt-1 hidden h-3.5 sm:block">
          {info.milestones.map((m) => (
            <span
              key={m.label}
              className={`absolute top-0 -translate-x-1/2 font-mono-tech text-[9px] font-semibold whitespace-nowrap ${
                m.reached ? 'text-emerald-300' : 'text-slate-400'
              }`}
              style={{ left: `${Math.max(6, Math.min(94, m.pct))}%` }}
            >
              {m.label}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
