import React from 'react';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  label?: string;
  unit?: string;
  variant?: 'nominal' | 'caution' | 'critical' | 'auto';
  size?: 'sm' | 'md';
}

export function ProgressBar({
  value,
  max = 100,
  label,
  unit = '%',
  variant = 'auto',
  size = 'md',
  className = '',
  ...props
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const resolvedVariant =
    variant === 'auto'
      ? percentage > 35
        ? 'nominal'
        : percentage > 20
          ? 'caution'
          : 'critical'
      : variant;

  const barColor = {
    nominal: 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]',
    caution: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]',
    critical: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)] animate-pulse',
  }[resolvedVariant];

  const heightClass = size === 'sm' ? 'h-1.5' : 'h-2.5';

  return (
    <div className={`w-full font-body ${className}`} {...props}>
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="font-medium text-slate-300">{label}</span>
          <span className="font-mono text-xs font-bold text-slate-200">
            {Math.round(value)}
            {unit}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        className={`w-full overflow-hidden rounded-full border border-slate-800 bg-slate-900/90 p-0.5 ${heightClass}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
