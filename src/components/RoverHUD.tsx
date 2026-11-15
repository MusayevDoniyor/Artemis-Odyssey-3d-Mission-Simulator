import { Battery, BookOpen, Compass, Shield, Undo2, Wind, X } from 'lucide-react';
import { PHYSICS } from '../game/constants';
import type {
  GameMenuTab,
  InputState,
  MarsQueueState,
  ResourceState,
  RoverDriveMode,
  RoverObjective,
  RoverState,
  TelemetrySpeedScale,
} from '../game/types';
import { RoverSpeedometer } from './RoverSpeedometer';

interface RoverHUDProps {
  rover: RoverState;
  roverInput: Pick<InputState, 'forward' | 'backward' | 'left' | 'right'>;
  resources: ResourceState;
  objectives: RoverObjective[];
  marsQueue: MarsQueueState;
  nearestObjective: RoverObjective | null;
  donkiFlareActive: boolean;
  speedScale: TelemetrySpeedScale;
  freeExploreMode: boolean;
  onToggleSpeedScale: () => void;
  onOpenDrillConsole: (obj: RoverObjective) => void;
  onOpenOutpostConsole: () => void;
  onOpenMenuTab: (tab: GameMenuTab) => void;
  onSetDriveMode: (mode: RoverDriveMode) => void;
  onTransmitMarsQueue: () => void;
  onUndoMarsQueue: () => void;
  onClearMarsQueue: () => void;
}

export function RoverHUD({
  rover,
  roverInput,
  resources,
  objectives,
  marsQueue,
  nearestObjective,
  donkiFlareActive,
  speedScale,
  freeExploreMode,
  onToggleSpeedScale,
  onOpenDrillConsole,
  onOpenOutpostConsole,
  onOpenMenuTab,
  onSetDriveMode,
  onTransmitMarsQueue,
  onUndoMarsQueue,
  onClearMarsQueue,
}: RoverHUDProps) {
  const isMars = rover.planet === 'mars';
  const atBaseCamp = Math.hypot(rover.x + 15, rover.z + 13) <= 22;
  const completedCount = objectives.filter((o) => o.completed).length;
  const nextObj = objectives.find((o) => !o.completed) ?? null;
  const distToNext = nextObj
    ? Math.round(Math.hypot(nextObj.x - rover.x, nextObj.z - rover.z))
    : Math.round(Math.hypot(-15 - rover.x, -13 - rover.z));

  const isMoving =
    Math.abs(rover.speed) > 0.15 ||
    roverInput.forward ||
    roverInput.backward ||
    roverInput.left ||
    roverInput.right;
  const isMarsExecuting = isMars && marsQueue.phase !== 'IDLE';
  const showSpeed = isMoving || isMarsExecuting;

  const slopeSteep = rover.wheelSlipPct >= 28;
  const marsHighDust = isMars && rover.dustAccumulationPct > 35;

  // One concise plain-language instruction
  let objectiveText = 'Return to Base Camp airlock.';
  if (nearestObjective && !nearestObjective.completed) {
    objectiveText = `Press E to learn & sample ${nearestObjective.siteName}.`;
  } else if (nextObj) {
    if (isMars) {
      objectiveText =
        marsQueue.phase === 'IDLE'
          ? marsQueue.queue.length > 0
            ? `Send ${marsQueue.queue.length} queued drive commands.`
            : `Drive WASD or click terrain toward ${nextObj.siteName}.`
          : marsQueue.phase === 'TRANSMITTING'
            ? `Sending commands across 14 min radio lag.`
            : `Driving autonomously to ${nextObj.siteName}.`;
    } else {
      objectiveText = `Drive to ${nextObj.siteName} to study & sample.`;
    }
  } else if (atBaseCamp) {
    objectiveText = 'Enter Base Camp airlock to finish your sol.';
  }

  // Compass Mini-Map Calculations
  const headingDeg = (rover.headingRad * 180) / Math.PI;
  const compassBound = PHYSICS.SURFACE_BOUND_M;
  const toCompassPt = (wx: number, wz: number) => {
    const dx = ((wx - rover.x) / compassBound) * 56;
    const dz = ((wz - rover.z) / compassBound) * 56;
    const len = Math.hypot(dx, dz);
    const clampedLen = Math.min(52, len);
    const scale = len > 0 ? clampedLen / len : 0;
    return { x: 72 + dx * scale, y: 72 + dz * scale };
  };
  const nextPt = nextObj ? toCompassPt(nextObj.x, nextObj.z) : toCompassPt(-15, -13);

  // Max 3 Contextual Hints (Bottom-Right)
  const hints = isMars
    ? marsQueue.phase === 'IDLE'
      ? marsQueue.queue.length > 0
        ? [
            { keys: 'Click', label: 'Add Point', action: undefined },
            { keys: 'Space', label: 'Send Batch', action: onTransmitMarsQueue },
            { keys: 'Tab', label: 'Topo Map', action: () => onOpenMenuTab('map') },
          ]
        : [
            { keys: 'W/A/S/D', label: 'Drive', hold: 'forward' as const },
            {
              keys: nearestObjective ? 'E' : 'Click',
              label: nearestObjective ? 'Learn' : 'Queue Waypoint',
              action: nearestObjective ? () => onOpenDrillConsole(nearestObjective) : undefined,
            },
            { keys: 'Tab', label: 'Map', action: () => onOpenMenuTab('map') },
          ]
      : [
          { keys: '14m', label: 'Signal Lag', action: undefined },
          { keys: 'C', label: 'Clear Queue', action: onClearMarsQueue },
          { keys: 'Esc', label: 'Menu', action: () => onOpenMenuTab('settings') },
        ]
    : isMoving
      ? [
          { keys: 'W/S', label: 'Drive', hold: 'forward' as const },
          { keys: 'A/D', label: 'Turn', hold: 'left' as const },
          {
            keys: 'E',
            label: nearestObjective ? 'Learn' : atBaseCamp ? 'Airlock' : 'Interact',
            action: nearestObjective
              ? () => onOpenDrillConsole(nearestObjective)
              : atBaseCamp
                ? onOpenOutpostConsole
                : undefined,
          },
        ]
      : [
          { keys: 'W', label: 'Drive', hold: 'forward' as const },
          {
            keys: nearestObjective ? 'E' : atBaseCamp ? 'E' : 'Q',
            label: nearestObjective ? 'Learn' : atBaseCamp ? 'Airlock' : 'Turn Mast',
            action: nearestObjective
              ? () => onOpenDrillConsole(nearestObjective)
              : atBaseCamp
                ? onOpenOutpostConsole
                : undefined,
          },
          { keys: 'Tab', label: 'Map & Menu', action: () => onOpenMenuTab('map') },
        ];

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5">
      {/* TOP ROW: Group 1 (Left Wordmark + Objective) & Group 2 (Right 3 Meters + Dist) */}
      <div className="flex items-start justify-between gap-4">
        {/* GROUP 1: Top-Left Wordmark + Single Objective Card */}
        <div data-testid="hud-group-objective" className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 4L27 27H21.5L16 15.5L10.5 27H5L16 4Z" fill="#FFFFFF" />
              <path
                d="M7 22C12 18 20 15 28 16.5"
                stroke="#F59E0B"
                strokeWidth="2.4"
                strokeLinecap="round"
              />
            </svg>
            <div className="leading-none">
              <span className="block text-base font-extrabold tracking-widest text-white">
                ARTEMIS
              </span>
              <span className="block text-base font-extrabold tracking-widest text-white">
                ODYSSEY
              </span>
            </div>
          </div>

          <section className="hud-soft pointer-events-auto max-w-xs rounded-2xl px-4 py-3 text-slate-100">
            <div className="flex items-center gap-2 text-base font-bold text-amber-400">
              <span className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-amber-400" />
              <span>
                {isMars ? 'Mars Mission' : freeExploreMode ? 'Free Explore' : 'Mission Objective'}
              </span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-4">
              <p className="text-base leading-snug text-slate-100">{objectiveText}</p>
              <span className="shrink-0 text-base font-bold text-slate-200 tabular-nums">
                {completedCount} / {objectives.length}
              </span>
            </div>

            {slopeSteep && rover.driveMode !== 'WALKER' && (
              <button
                type="button"
                onClick={() => onSetDriveMode('WALKER')}
                className="mt-2 w-full rounded-xl bg-amber-500/20 px-3 py-1.5 text-left text-sm font-semibold text-amber-200 hover:bg-amber-500/30"
              >
                Steep slope: press 4 for Walker grip
              </button>
            )}
          </section>
        </div>

        {/* GROUP 2: Top-Right Core 3 Meters + Distance (+ Contextual Chip only if triggered) */}
        <div data-testid="hud-group-meters" className="flex flex-col items-end gap-2">
          <div className="hud-soft pointer-events-auto flex items-center divide-x divide-sky-400/15 rounded-2xl px-4 py-2.5 tabular-nums">
            <div className="flex items-center gap-2.5 pr-4">
              <Battery
                className={`h-5 w-5 ${resources.power <= 20 ? 'text-rose-400' : 'text-amber-400'}`}
              />
              <div>
                <span
                  className={`block text-lg leading-none font-bold ${
                    resources.power <= 20 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {Math.round(resources.power)}%
                </span>
                <span className="text-sm text-slate-400">Power</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4">
              <Wind
                className={`h-5 w-5 ${resources.oxygen <= 20 ? 'text-rose-400' : 'text-sky-300'}`}
              />
              <div>
                <span
                  className={`block text-lg leading-none font-bold ${
                    resources.oxygen <= 20 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {Math.round(resources.oxygen)}%
                </span>
                <span className="text-sm text-slate-400">Air</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-4">
              <Shield
                className={`h-5 w-5 ${resources.shield <= 20 ? 'text-rose-400' : 'text-emerald-300'}`}
              />
              <div>
                <span
                  className={`block text-lg leading-none font-bold ${
                    resources.shield <= 20 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {Math.round(resources.shield)}%
                </span>
                <span className="text-sm text-slate-400">Shield</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pl-4">
              <Compass className="h-5 w-5 text-amber-400" />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {distToNext} m
                </span>
                <span className="text-sm text-slate-400">Target</span>
              </div>
            </div>
          </div>

          {(marsHighDust || donkiFlareActive || atBaseCamp) && (
            <div className="flex flex-wrap justify-end gap-2">
              {atBaseCamp && (
                <button
                  type="button"
                  data-testid="open-outpost-console-btn"
                  onClick={onOpenOutpostConsole}
                  className="hud-soft pointer-events-auto rounded-xl border-amber-400/50 px-3 py-1.5 text-sm font-semibold text-amber-200 hover:border-amber-300"
                >
                  Base Shelter · Enter [E]
                </button>
              )}
              {marsHighDust && (
                <span className="hud-soft-alert rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-200">
                  Dust {Math.round(rover.dustAccumulationPct)}%
                </span>
              )}
              {donkiFlareActive && !atBaseCamp && (
                <span className="hud-soft-alert rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-200">
                  Solar Storm
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Group 3 (Bottom-Left Compass), Group 5 (Bottom-Center Moving/Queue), Group 4 (Bottom-Right Hints) */}
      <div className="flex items-end justify-between gap-4">
        {/* GROUP 3: Bottom-Left Circular Compass Mini-Map */}
        <button
          type="button"
          data-testid="hud-group-radar"
          onClick={() => onOpenMenuTab('map')}
          title="Open Full Topo Map [Tab]"
          className="hud-soft pointer-events-auto relative h-36 w-36 shrink-0 rounded-full p-1 transition hover:border-sky-400/60"
        >
          <svg viewBox="0 0 144 144" className="h-full w-full">
            <circle
              cx="72"
              cy="72"
              r="60"
              fill={isMars ? '#1d1216' : '#0b1222'}
              stroke="rgba(56,189,248,0.28)"
              strokeWidth="1.5"
            />
            <circle cx="72" cy="72" r="34" fill="none" stroke="rgba(148,163,184,0.16)" strokeWidth="1" />

            {/* Cardinal Markers */}
            <text x="72" y="11" textAnchor="middle" fontSize="11" fontWeight="700" fill="#f8fafc">
              N
            </text>
            <text x="72" y="139" textAnchor="middle" fontSize="11" fontWeight="700" fill="#94a3b8">
              S
            </text>
            <text x="10" y="76" textAnchor="middle" fontSize="11" fontWeight="700" fill="#94a3b8">
              W
            </text>
            <text x="134" y="76" textAnchor="middle" fontSize="11" fontWeight="700" fill="#94a3b8">
              E
            </text>

            {/* Queued Mars waypoints */}
            {isMars &&
              marsQueue.queue.map((cmd) => {
                const pt = toCompassPt(cmd.x, cmd.z);
                return (
                  <circle
                    key={cmd.id}
                    cx={pt.x}
                    cy={pt.y}
                    r="3.2"
                    fill="#f59e0b"
                    opacity="0.85"
                  />
                );
              })}

            {/* Next Objective Diamond */}
            <polygon
              points={`${nextPt.x},${nextPt.y - 6} ${nextPt.x + 6},${nextPt.y} ${nextPt.x},${nextPt.y + 6} ${nextPt.x - 6},${nextPt.y}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
            />

            {/* Rover Center Heading Arrow */}
            <g transform={`translate(72, 72) rotate(${-headingDeg})`}>
              <polygon points="0,-10 -6,7 0,3 6,7" fill="#fbbf24" />
            </g>
          </svg>
        </button>

        {/* GROUP 5: Bottom-Center Speedometer (Moving Only) or Mars Batch Controls */}
        <div data-testid="hud-group-speed" className="flex flex-col items-center gap-2">
          {nearestObjective && !nearestObjective.completed && (
            <button
              type="button"
              data-testid="open-drill-console-btn"
              onClick={() => onOpenDrillConsole(nearestObjective)}
              className="hud-soft pointer-events-auto inline-flex items-center gap-2 rounded-2xl border-amber-400/60 px-4 py-2 text-base font-bold text-amber-300 hover:border-amber-300"
            >
              <BookOpen className="h-4 w-4" />
              Learn &amp; Sample ({nearestObjective.siteName})
            </button>
          )}

          {isMars && marsQueue.phase === 'IDLE' && marsQueue.queue.length > 0 && (
            <div
              data-testid="mars-batch-bar"
              className="hud-soft pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 text-base"
            >
              <span className="font-semibold text-slate-100">
                {marsQueue.queue.length} Waypoint{marsQueue.queue.length > 1 ? 's' : ''} (14m lag)
              </span>
              <button
                type="button"
                aria-label="Undo last waypoint"
                onClick={onUndoMarsQueue}
                className="rounded-lg border border-sky-400/20 bg-slate-900/80 p-1.5 text-slate-200 hover:border-amber-400"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Clear waypoints"
                onClick={onClearMarsQueue}
                className="rounded-lg border border-sky-400/20 bg-slate-900/80 p-1.5 text-slate-200 hover:border-rose-400"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-testid="send-mars-batch-btn"
                onClick={onTransmitMarsQueue}
                className="rounded-xl bg-amber-500 px-4 py-1.5 text-base font-bold text-slate-950 hover:bg-amber-400"
              >
                Send Batch
              </button>
            </div>
          )}

          {showSpeed && (
            <RoverSpeedometer
              rover={rover}
              speedScale={speedScale}
              onToggleSpeedScale={onToggleSpeedScale}
              marsLagLabel={
                isMarsExecuting
                  ? marsQueue.phase === 'TRANSMITTING'
                    ? 'Sending 14m lag'
                    : 'Auto Drive'
                  : undefined
              }
            />
          )}
        </div>

        {/* GROUP 4: Bottom-Right Max 3 Contextual Hints */}
        <div
          data-testid="hud-group-hints"
          className="hud-soft pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 text-base"
        >
          {hints.map((h) => {
            const inner = (
              <>
                <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-sky-400/30 bg-slate-900/90 px-1.5 py-0.5 text-sm font-bold text-white">
                  {h.keys}
                </span>
                <span className="font-medium text-slate-200">{h.label}</span>
              </>
            );
            if ('hold' in h && h.hold) {
              return (
                <button
                  key={h.label}
                  type="button"
                  data-hold-keys={h.hold}
                  className="inline-flex items-center gap-2 hover:text-amber-300"
                >
                  {inner}
                </button>
              );
            }
            if (h.action) {
              return (
                <button
                  key={h.label}
                  type="button"
                  onClick={h.action}
                  className="inline-flex items-center gap-2 hover:text-amber-300"
                >
                  {inner}
                </button>
              );
            }
            return (
              <span key={h.label} className="inline-flex items-center gap-2">
                {inner}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
