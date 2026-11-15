import React from 'react';

export interface TelemetryValueProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TelemetryValue({
  label,
  value,
  unit,
  size = 'md',
  className = '',
  ...props
}: TelemetryValueProps) {
  const valueSizeClass = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  return (
    <div className={`flex flex-col font-body ${className}`} {...props}>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono font-bold tracking-tight text-white ${valueSizeClass}`}>
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs font-semibold text-cyan-300">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
