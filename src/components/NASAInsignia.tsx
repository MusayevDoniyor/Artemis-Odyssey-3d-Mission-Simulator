interface NASAInsigniaProps {
  size?: number;
  className?: string;
}

export function NASAInsignia({ size = 48, className = '' }: NASAInsigniaProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NASA Insignia"
    >
      {/* Classic NASA Blue Sphere */}
      <circle cx="60" cy="60" r="46" fill="#0B3D91" stroke="#E2E8F0" strokeWidth="1.5" strokeOpacity="0.45" />

      {/* Subtle Starfield */}
      <circle cx="38" cy="36" r="1.4" fill="#FFFFFF" />
      <circle cx="51" cy="27" r="1.1" fill="#FFFFFF" />
      <circle cx="72" cy="32" r="1.5" fill="#FFFFFF" />
      <circle cx="84" cy="43" r="1.1" fill="#FFFFFF" />
      <circle cx="32" cy="74" r="1.2" fill="#FFFFFF" />
      <circle cx="48" cy="86" r="1.4" fill="#FFFFFF" />
      <circle cx="76" cy="82" r="1.2" fill="#FFFFFF" />
      <circle cx="88" cy="68" r="1.0" fill="#FFFFFF" />

      {/* Elliptical Orbit Ring */}
      <ellipse
        cx="60"
        cy="60"
        rx="44"
        ry="15"
        transform="rotate(-24 60 60)"
        stroke="#FFFFFF"
        strokeWidth="2.2"
        strokeOpacity="0.9"
      />

      {/* Red Chevron Vector */}
      <path
        d="M16 74L60 44L108 26L68 54L96 88L58 58L16 74Z"
        fill="#FC3D21"
      />

      {/* Bold White NASA Wordmark */}
      <text
        x="60"
        y="67"
        textAnchor="middle"
        fill="#FFFFFF"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight="700"
        fontSize="24"
        letterSpacing="2"
      >
        NASA
      </text>
    </svg>
  );
}
