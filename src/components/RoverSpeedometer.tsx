import { getRoverSpeedometerTelemetry } from '../game/missionProgress';
import { computeRoverDisplaySpeed } from '../game/sequences';
import type { RoverState, TelemetrySpeedScale } from '../game/types';

interface RoverSpeedometerProps {
  rover: RoverState;
  speedScale?: TelemetrySpeedScale;
  onToggleSpeedScale?: () => void;
  marsLagLabel?: string;
}

export function RoverSpeedometer({
  rover,
  speedScale = 'KID_25X',
  onToggleSpeedScale,
  marsLagLabel,
}: RoverSpeedometerProps) {
  const tel = getRoverSpeedometerTelemetry(rover);
  const speedInfo = computeRoverDisplaySpeed(tel.absSpeedMs, speedScale);
  const isReal = speedScale === 'REAL_SPEED';
  const fillPct = Math.min(100, Math.round((tel.absSpeedMs / 10) * 100));

  return (
    <section
      data-testid="viper-speedometer"
      aria-label="Rover Speedometer"
      className="hud-soft pointer-events-auto flex items-center gap-4 rounded-2xl px-5 py-2.5 tabular-nums"
    >
      <div className="flex items-baseline gap-2">
        <span
          data-testid="viper-speed-ms"
          className="text-3xl leading-none font-bold text-white"
        >
          {isReal ? speedInfo.displayMs.toFixed(2) : speedInfo.displayMs.toFixed(1)}
        </span>
        <span className="text-base font-semibold text-slate-300">m/s</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-base">
          <span
            data-testid="viper-speed-kmh"
            className="font-semibold text-amber-300"
          >
            {isReal ? speedInfo.displayKmh.toFixed(2) : speedInfo.displayKmh.toFixed(1)} km/h
          </span>
          <span
            data-testid="viper-gear-label"
            className="rounded-md bg-sky-500/15 px-2 py-0.5 text-sm font-bold text-slate-100"
          >
            {tel.gearLabel}
          </span>
          {marsLagLabel && (
            <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-sm font-semibold text-amber-200">
              {marsLagLabel}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-amber-400 transition-all"
              style={{ width: `${Math.max(4, fillPct)}%` }}
            />
          </div>
          {onToggleSpeedScale && (
            <button
              type="button"
              data-testid="toggle-speed-scale-btn"
              onClick={onToggleSpeedScale}
              className="text-sm font-semibold text-slate-300 hover:text-amber-300"
            >
              {isReal ? 'Real 1×' : 'Kid ×25'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
