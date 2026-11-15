import React from 'react';

export interface NASAInsigniaProps {
  size?: number;
  className?: string;
  showNotice?: boolean;
}

export function NASAInsignia({
  size = 48,
  className = '',
  showNotice = false,
}: NASAInsigniaProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 select-none ${className}`}
      title="Artemis Odyssey Flight Operations — Unofficial Educational Simulator (Not affiliated with or endorsed by NASA)"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Flight Operations Insignia"
        className="shrink-0 drop-shadow-[0_0_8px_rgba(34,211,238,0.35)]"
      >
        {/* Outer Hexagonal Shield */}
        <polygon
          points="24,3 43,14 43,34 24,45 5,34 5,14"
          fill="url(#insignia-bg)"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeOpacity="0.6"
        />

        {/* Cislunar Elliptical Orbit Ring */}
        <ellipse
          cx="24"
          cy="26"
          rx="15"
          ry="6.5"
          transform="rotate(-22 24 26)"
          stroke="url(#orbit-grad)"
          strokeWidth="1.75"
          strokeDasharray="2 1.5"
          strokeOpacity="0.85"
        />

        {/* Ascending Flight Chevron */}
        <path
          d="M24 10L32 32L24 28L16 32L24 10Z"
          fill="url(#chevron-grad)"
          stroke="#e0f2fe"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Core Trajectory Meridian */}
        <path
          d="M24 10V28"
          stroke="#ffffff"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />

        {/* Polaris Apex Star */}
        <path
          d="M24 6L25 8.5L27.5 9.5L25 10.5L24 13L23 10.5L20.5 9.5L23 8.5L24 6Z"
          fill="#38bdf8"
        />

        <defs>
          <linearGradient id="insignia-bg" x1="24" y1="3" x2="24" y2="45" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0f172a" />
            <stop offset="1" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="orbit-grad" x1="9" y1="26" x2="39" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0284c7" />
            <stop offset="0.5" stopColor="#22d3ee" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
          <linearGradient id="chevron-grad" x1="24" y1="10" x2="24" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="0.6" stopColor="#0284c7" />
            <stop offset="1" stopColor="#0369a1" />
          </linearGradient>
        </defs>
      </svg>
      {showNotice && (
        <span className="font-body text-[10px] text-slate-400">
          Unofficial educational project · Not affiliated with NASA
        </span>
      )}
    </div>
  );
}

// Export alias for clarity
export { NASAInsignia as FlightOpsInsignia };
