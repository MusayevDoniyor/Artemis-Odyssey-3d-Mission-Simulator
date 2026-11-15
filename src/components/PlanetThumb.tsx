const PLANET_ART_STYLE: Record<string, { background: string; ring?: boolean; sunGlow?: boolean }> = {
  sun: {
    background:
      'radial-gradient(circle at 38% 35%, #fffbeb 0%, #fde047 26%, #f97316 68%, #c2410c 100%)',
    sunGlow: true,
  },
  mercury: {
    background:
      'radial-gradient(circle at 35% 32%, #e2e8f0 0%, #94a3b8 52%, #475569 100%)',
  },
  venus: {
    background:
      'radial-gradient(circle at 35% 32%, #fef3c7 0%, #eab308 48%, #b45309 100%)',
  },
  earth: {
    background:
      'radial-gradient(circle at 36% 34%, #e0f2fe 0%, #38bdf8 30%, #1d4ed8 68%, #0f172a 100%)',
  },
  moon: {
    background:
      'radial-gradient(circle at 36% 32%, #f8fafc 0%, #cbd5e1 46%, #475569 100%)',
  },
  mars: {
    background:
      'radial-gradient(circle at 35% 34%, #fdba74 0%, #ea580c 52%, #7c2d12 100%)',
  },
  jupiter: {
    background:
      'linear-gradient(165deg, #fde68a 0%, #d97706 24%, #fef3c7 42%, #b45309 58%, #f59e0b 78%, #78350f 100%)',
  },
  saturn: {
    background:
      'radial-gradient(circle at 38% 34%, #fef9c3 0%, #eab308 55%, #a16207 100%)',
    ring: true,
  },
  uranus: {
    background:
      'radial-gradient(circle at 35% 32%, #ecfeff 0%, #67e8f9 48%, #0e7490 100%)',
    ring: true,
  },
  neptune: {
    background:
      'radial-gradient(circle at 35% 32%, #93c5fd 0%, #2563eb 50%, #1e3a8a 100%)',
  },
  pluto: {
    background:
      'radial-gradient(circle at 35% 34%, #f1f5f9 0%, #cbd5e1 44%, #78716c 100%)',
  },
  ceres: {
    background:
      'radial-gradient(circle at 35% 34%, #e2e8f0 0%, #64748b 65%, #334155 100%)',
  },
  eris: {
    background:
      'radial-gradient(circle at 35% 34%, #ecfeff 0%, #a5f3fc 55%, #475569 100%)',
  },
  halley: {
    background:
      'radial-gradient(circle at 35% 34%, #f0f9ff 0%, #38bdf8 58%, #1e293b 100%)',
  },
};

export function PlanetThumb({
  bodyId,
  size = 'sm',
}: {
  bodyId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const art = PLANET_ART_STYLE[bodyId] ?? PLANET_ART_STYLE.earth;
  const dim =
    size === 'lg'
      ? 'h-12 w-12'
      : size === 'md'
        ? 'h-10 w-10'
        : size === 'xs'
          ? 'h-7 w-7'
          : 'h-8 w-8';
  const ringDim =
    size === 'lg'
      ? 'h-4 w-16'
      : size === 'md'
        ? 'h-3 w-13'
        : size === 'xs'
          ? 'h-2 w-9'
          : 'h-2.5 w-11';
  const ringTiltClass =
    bodyId === 'uranus' ? '-rotate-[74deg] border-[1.5px]' : '-rotate-[22deg] border-2';

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${dim}`}>
      {art.sunGlow && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full bg-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
        />
      )}
      <span
        className={`relative block ${dim} overflow-hidden rounded-full shadow-[inset_-4px_-4px_10px_rgba(2,6,23,0.72),inset_1px_1px_3px_rgba(255,255,255,0.22)]`}
        style={{ background: art.background }}
      >
        {bodyId === 'earth' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-95"
            style={{
              background:
                'radial-gradient(circle at 58% 42%, rgba(34,197,94,0.85) 0%, transparent 32%), radial-gradient(circle at 34% 62%, rgba(74,222,128,0.8) 0%, transparent 26%), radial-gradient(circle at 46% 24%, rgba(255,255,255,0.82) 0%, transparent 26%)',
            }}
          />
        )}
        {bodyId === 'moon' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-65"
            style={{
              background:
                'radial-gradient(circle at 30% 42%, rgba(30,41,59,0.58) 0%, transparent 25%), radial-gradient(circle at 65% 58%, rgba(51,65,85,0.48) 0%, transparent 23%), radial-gradient(circle at 52% 28%, rgba(30,41,59,0.42) 0%, transparent 18%)',
            }}
          />
        )}
        {bodyId === 'mars' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-85"
            style={{
              background:
                'radial-gradient(circle at 50% 6%, rgba(248,250,252,0.82) 0%, transparent 22%), radial-gradient(circle at 64% 58%, rgba(69,26,18,0.55) 0%, transparent 28%)',
            }}
          />
        )}
        {bodyId === 'jupiter' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-85"
            style={{
              background:
                'radial-gradient(ellipse at 62% 62%, rgba(220,38,38,0.85) 0%, rgba(234,88,12,0.4) 16%, transparent 28%)',
            }}
          />
        )}
        {bodyId === 'neptune' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-75"
            style={{
              background:
                'linear-gradient(155deg, transparent 36%, rgba(219,234,254,0.42) 44%, transparent 52%), radial-gradient(circle at 60% 60%, rgba(15,23,42,0.55) 0%, transparent 24%)',
            }}
          />
        )}
        {bodyId === 'mercury' && (
          <span
            aria-hidden="true"
            className="absolute inset-0 opacity-55"
            style={{
              background:
                'radial-gradient(circle at 38% 36%, rgba(51,65,85,0.55) 0%, transparent 20%), radial-gradient(circle at 64% 62%, rgba(71,85,105,0.45) 0%, transparent 18%)',
            }}
          />
        )}
      </span>
      {art.ring && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${ringTiltClass} ${
            bodyId === 'uranus' ? 'border-cyan-200/80' : 'border-amber-200/85'
          } ${ringDim}`}
        />
      )}
    </span>
  );
}

export function GatewayStationThumb({ sizeClass = 'h-9 w-9' }: { sizeClass?: string }) {
  return (
    <span
      className={`relative inline-flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sky-400/35 bg-[#060f23]`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 36 36" className="h-full w-full p-0.5">
        <defs>
          <linearGradient id="gwSolar" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>
        <circle cx="18" cy="18" r="15" fill="rgba(56,189,248,0.08)" />
        {/* Solar wings */}
        <rect x="3" y="9" width="8" height="18" rx="1" fill="url(#gwSolar)" opacity="0.92" />
        <rect x="25" y="9" width="8" height="18" rx="1" fill="url(#gwSolar)" opacity="0.92" />
        <line x1="11" y1="18" x2="25" y2="18" stroke="#94a3b8" strokeWidth="1.5" />
        {/* HALO + PPE pressurized habitat core */}
        <rect x="14" y="8" width="8" height="20" rx="2" fill="#e2e8f0" stroke="#38bdf8" strokeWidth="0.9" />
        <rect x="15.5" y="13" width="5" height="6" rx="1" fill="#0284c7" />
        <circle cx="18" cy="10.5" r="1.4" fill="#22d3ee" />
      </svg>
    </span>
  );
}
