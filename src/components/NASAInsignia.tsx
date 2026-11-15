interface NASAInsigniaProps {
  size?: number;
  className?: string;
}

export function NASAInsignia({ size = 48, className = '' }: NASAInsigniaProps) {
  return (
    <img
      src="/assets/nasa-meatball.png"
      alt="NASA Insignia"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={`object-contain select-none ${className}`}
      draggable={false}
    />
  );
}
