import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'surface' | 'elevated' | 'glass';
  children: React.ReactNode;
}

export function Panel({
  variant = 'surface',
  className = '',
  children,
  ...props
}: PanelProps) {
  const variantStyles = {
    surface: 'bg-slate-950/85 border-sky-400/20 text-slate-100',
    elevated: 'bg-slate-900/90 border-sky-400/30 text-white',
    glass: 'bg-slate-950/60 border-sky-400/15 text-slate-200',
  }[variant];

  return (
    <div
      className={`rounded-2xl border shadow-2xl backdrop-blur-md transition-colors ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
