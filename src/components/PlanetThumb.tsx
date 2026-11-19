const PLANET_THUMB_MAP: Record<string, string> = {
  sun: '/assets/planets/thumbs/sun.png',
  mercury: '/assets/planets/thumbs/mercury.png',
  venus: '/assets/planets/thumbs/venus.png',
  earth: '/assets/planets/thumbs/earth.png',
  moon: '/assets/planets/thumbs/moon.png',
  mars: '/assets/planets/thumbs/mars.png',
  jupiter: '/assets/planets/thumbs/jupiter.png',
  saturn: '/assets/planets/thumbs/saturn.png',
  uranus: '/assets/planets/thumbs/uranus.png',
  neptune: '/assets/planets/thumbs/neptune.png',
  pluto: '/assets/planets/thumbs/pluto.png',
  ceres: '/assets/planets/thumbs/ceres.png',
  eris: '/assets/planets/thumbs/pluto.png',
  halley: '/assets/planets/thumbs/ceres.png',
  bennu: '/assets/planets/thumbs/ceres.png',
};

export function PlanetThumb({
  bodyId,
  size = 'sm',
}: {
  bodyId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}) {
  const thumbUrl = PLANET_THUMB_MAP[bodyId] ?? `/assets/planets/thumbs/${bodyId}.png`;
  const dim =
    size === 'lg'
      ? 'h-12 w-12'
      : size === 'md'
        ? 'h-10 w-10'
        : size === 'xs'
          ? 'h-7 w-7'
          : 'h-8 w-8';

  const isSun = bodyId === 'sun';
  const isEarth = bodyId === 'earth';

  return (
    <span className={`relative inline-flex shrink-0 items-center justify-center ${dim}`}>
      {isSun && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full bg-amber-400/30 blur-sm"
        />
      )}
      {isEarth && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-0.5 rounded-full bg-cyan-400/25 blur-[2px]"
        />
      )}
      <img
        src={thumbUrl}
        alt={bodyId}
        loading="lazy"
        decoding="async"
        className="relative z-1 h-full w-full object-contain pointer-events-none select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] transition-transform duration-200"
        onError={(e) => {
          // Fallback if image fails to load
          const target = e.currentTarget as HTMLImageElement;
          target.style.display = 'none';
        }}
      />
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
