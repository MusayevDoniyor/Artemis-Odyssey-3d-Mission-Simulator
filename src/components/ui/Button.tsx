import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    type = 'button',
    disabled = false,
    className = '',
    children,
    ...props
  },
  ref
) {
  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5 rounded-lg min-h-[32px]',
    md: 'px-3.5 py-2 text-sm gap-2 rounded-xl min-h-[40px]',
    lg: 'px-5 py-3 text-base gap-2.5 rounded-xl min-h-[48px]',
  }[size];

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-bold border border-cyan-300/60 shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:brightness-110 active:scale-[0.98]',
    secondary:
      'bg-sky-950/40 border border-sky-400/30 text-sky-100 font-semibold hover:bg-sky-900/50 hover:border-sky-400/60 hover:text-white active:scale-[0.98]',
    ghost:
      'bg-transparent text-slate-300 font-medium hover:bg-slate-900/60 hover:text-white border border-transparent hover:border-slate-700/60 active:scale-[0.98]',
    danger:
      'bg-rose-950/40 border border-rose-500/40 text-rose-200 font-semibold hover:bg-rose-900/50 hover:border-rose-400 hover:text-white active:scale-[0.98]',
  }[variant];

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-body transition-all duration-150 select-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${sizeStyles} ${variantStyles} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
