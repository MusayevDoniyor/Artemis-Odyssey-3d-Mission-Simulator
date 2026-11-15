import { PHYSICS } from '../game/constants';
import { getRoverSpeedometerTelemetry } from '../game/missionProgress';
import { computeRoverDisplaySpeed } from '../game/sequences';
import type { RoverState, TelemetrySpeedScale } from '../game/types';

interface RoverSpeedometerProps {
  rover: RoverState;
  speedScale?: TelemetrySpeedScale;
  onToggleSpeedScale?: () => void;
}

const DIAL_MAX_MS = 14.0;
const CX = 76;
const CY = 74;
const RADIUS = 54;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function RoverSpeedometer({
  rover,
  speedScale = 'KID_25X',
  onToggleSpeedScale,
}: RoverSpeedometerProps) {
  const tel = getRoverSpeedometerTelemetry(rover);
  const speedInfo = computeRoverDisplaySpeed(tel.absSpeedMs, speedScale);
  const isMars = rover.planet === 'mars';
  const isReal = speedScale === 'REAL_SPEED';

  // Gauge sweeps from -180 deg (left, 0 m/s) to 0 deg (right, 14.0 m/s trainer arc)
  const clampedRatio = Math.max(0, Math.min(1, tel.absSpeedMs / DIAL_MAX_MS));
  const needleAngleDeg = -180 + clampedRatio * 180;
  const walkerCapAngleDeg = -180 + (PHYSICS.ROVER_WALKER_SPEED / DIAL_MAX_MS) * 180;
  const maxDriveAngleDeg = -180 + (PHYSICS.ROVER_MAX_SPEED / DIAL_MAX_MS) * 180;

  const needleTip = polarToCartesian(CX, CY, RADIUS - 7, needleAngleDeg);
  const activeArcEnd = -180 + Math.max(0.01, clampedRatio) * 180;

  const arcStroke =
    tel.isHighSpeed
      ? '#f59e0b'
      : isMars
        ? '#fb923c'
        : '#22d3ee';

  const gearTone =
    tel.gearLabel === 'FWD'
      ? 'text-emerald-300 border-emerald-400/50 bg-emerald-500/15'
      : tel.gearLabel === 'REV'
        ? 'text-amber-300 border-amber-400/50 bg-amber-500/15'
        : tel.gearLabel === 'PIVOT'
          ? 'text-cyan-300 border-cyan-400/50 bg-cyan-500/15'
          : 'text-slate-300 border-slate-600 bg-slate-900';

  const ticks = [0, 3, 6, 9, 12];

  return (
    <section
      data-testid="viper-speedometer"
      aria-label="VIPER Rover Speedometer"
      className="hud-panel pointer-events-auto flex items-center gap-4 rounded-xl px-4 py-2 tabular-nums"
    >
      {/* Analog + Arc Gauge SVG */}
      <div className="relative shrink-0">
        <svg
          width="152"
          height="84"
          viewBox="0 0 152 84"
          className="overflow-visible"
          aria-hidden="true"
        >
          {/* Base Dial Track */}
          <path
            d={describeArc(CX, CY, RADIUS, -180, 0)}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* High-Speed Amber Band (4.2 -> 8.6 m/s) */}
          <path
            d={describeArc(CX, CY, RADIUS, walkerCapAngleDeg, maxDriveAngleDeg)}
            fill="none"
            stroke="rgba(245, 158, 11, 0.24)"
            strokeWidth="8"
          />

          {/* Live Speed Arc */}
          {tel.absSpeedMs > 0.04 && (
            <path
              d={describeArc(CX, CY, RADIUS, -180, activeArcEnd)}
              fill="none"
              stroke={arcStroke}
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}

          {/* Major Calibration Ticks */}
          {ticks.map((v) => {
            const deg = -180 + (v / DIAL_MAX_MS) * 180;
            const outer = polarToCartesian(CX, CY, RADIUS + 6, deg);
            const inner = polarToCartesian(CX, CY, RADIUS - 6, deg);
            const lbl = polarToCartesian(CX, CY, RADIUS - 16, deg);
            return (
              <g key={v}>
                <line
                  x1={inner.x}
                  y1={inner.y}
                  x2={outer.x}
                  y2={outer.y}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
                <text
                  x={lbl.x}
                  y={lbl.y + 3}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="8.5"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="700"
                >
                  {v}
                </text>
              </g>
            );
          })}

          {/* Walker Gait Speed Cap Marker (4.2 m/s) */}
          {rover.driveMode === 'WALKER' && (
            <g>
              {(() => {
                const p1 = polarToCartesian(CX, CY, RADIUS - 8, walkerCapAngleDeg);
                const p2 = polarToCartesian(CX, CY, RADIUS + 8, walkerCapAngleDeg);
                return (
                  <line
                    x1={p1.x}
                    y1={p1.y}
                    x2={p2.x}
                    y2={p2.y}
                    stroke="#34d399"
                    strokeWidth="2.2"
                  />
                );
              })()}
            </g>
          )}

          {/* Live Needle */}
          <line
            x1={CX}
            y1={CY}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="#f8fafc"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx={CX} cy={CY} r="5" fill={arcStroke} stroke="#0f172a" strokeWidth="2" />
        </svg>
      </div>

      {/* Digital Speedometer Telemetry Readout */}
      <div className="flex min-w-[168px] flex-col">
        <div className="flex items-center justify-between gap-2">
          <span className="font-hud text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
            {isMars ? 'Rover Speed' : 'VIPER Speed'}
          </span>
          <span
            data-testid="viper-gear-label"
            className={`rounded border px-1.5 py-0.5 font-mono-tech text-[10px] font-bold ${gearTone}`}
          >
            {tel.gearLabel}
          </span>
        </div>

        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span
            data-testid="viper-speed-ms"
            className="font-mono-tech text-3xl leading-none font-bold text-white"
          >
            {isReal ? speedInfo.displayMs.toFixed(2) : speedInfo.displayMs.toFixed(1)}
          </span>
          <span className="font-mono-tech text-xs font-bold text-slate-400">m/s</span>
          <span
            className={`ml-auto rounded border px-1.5 py-0.5 font-mono-tech text-[9px] font-bold ${
              isReal
                ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                : 'border-amber-400/50 bg-amber-500/15 text-amber-300'
            }`}
          >
            {speedInfo.badgeText}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-3 border-t border-slate-700/70 pt-1 font-mono-tech text-[11px]">
          <span data-testid="viper-speed-kmh" className="font-semibold text-sky-300">
            {isReal ? speedInfo.displayKmh.toFixed(2) : speedInfo.displayKmh.toFixed(1)} km/h
          </span>
          <span className="text-slate-400">
            {rover.driveMode} · Slip {rover.wheelSlipPct}%
          </span>
        </div>

        {onToggleSpeedScale && (
          <button
            type="button"
            data-testid="toggle-speed-scale-btn"
            onClick={onToggleSpeedScale}
            className="mt-1.5 flex items-center justify-between gap-2 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono-tech text-[9px] font-bold text-slate-200 hover:border-cyan-400"
          >
            <span>{speedInfo.scaleLabel}</span>
            <span className="text-cyan-300">{isReal ? '-> ×25' : '-> 0.18 m/s'}</span>
          </button>
        )}
      </div>
    </section>
  );
}
