import { BookOpen, Home, MapPin } from 'lucide-react';
import type { MarsQueueState, SurfacePlanet, SurfaceWorldPrompt } from '../game/types';

interface WorldTargetPinsProps {
  prompts: SurfaceWorldPrompt[];
  planet: SurfacePlanet;
  marsQueue?: MarsQueueState;
  onInteractObjective: (objectiveId: string) => void;
  onQueueMarsTarget?: (prompt: SurfaceWorldPrompt) => void;
}

export function WorldTargetPins({
  prompts,
  planet,
  marsQueue,
  onInteractObjective,
  onQueueMarsTarget,
}: WorldTargetPinsProps) {
  const visiblePrompts = prompts.filter((p) => p.visible);
  if (visiblePrompts.length === 0) return null;

  return (
    <div
      data-testid="world-target-pins"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      {visiblePrompts.map((p) => {
        const isBase = p.kind === 'basecamp';
        const activeCmd = marsQueue?.queue[marsQueue.activeIndex];
        const isAutoTarget =
          marsQueue?.phase !== 'IDLE' &&
          activeCmd &&
          (activeCmd.objectiveId === p.id ||
            Math.hypot(activeCmd.x - p.worldX, activeCmd.z - p.worldZ) < 4.5);

        return (
          <div
            key={p.id}
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
            className="absolute -translate-x-1/2 -translate-y-full"
          >
            <div className="flex flex-col items-center gap-1">
              {/* Proximity Interact Prompt (E Interact) */}
              {p.inRange && !isBase ? (
                <button
                  type="button"
                  data-testid={`world-interact-${p.id}`}
                  onClick={() => onInteractObjective(p.id)}
                  className="hud-soft pointer-events-auto inline-flex items-center gap-2 rounded-xl border-cyan-400/75 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:border-cyan-300 lg:text-sm"
                >
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-cyan-400 px-1 text-xs font-bold text-slate-950">
                    E
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <BookOpen className="h-3.5 w-3.5 text-cyan-300" />
                    Learn &amp; Sample {p.title}
                  </span>
                  {p.progress > 0 && (
                    <span className="text-xs font-bold text-cyan-300 tabular-nums">
                      {Math.round(p.progress * 100)}%
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid={`world-pin-${p.id}`}
                  onClick={() => {
                    if (onQueueMarsTarget) {
                      onQueueMarsTarget(p);
                    }
                  }}
                  title={`Click to Auto-Drive around obstacles to ${p.title}`}
                  className="pointer-events-auto flex cursor-pointer flex-col items-center gap-0.5 transition-transform hover:scale-105"
                >
                  <span
                    className={`hud-soft inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums transition ${
                      isAutoTarget
                        ? 'border-cyan-400/80 bg-cyan-950/85 text-cyan-100 shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                        : 'text-stone-100 hover:border-cyan-400/60'
                    }`}
                  >
                    {isAutoTarget && (
                      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                    )}
                    <span className="max-w-36 truncate">{p.title}</span>
                    <span className="font-bold text-amber-300">{p.distM} m</span>
                  </span>
                  {isBase ? (
                    <Home className="h-5 w-5 text-emerald-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
                  ) : (
                    <MapPin
                      className={`h-5 w-5 drop-shadow-[0_2px_8px_rgba(245,158,11,0.7)] ${
                        isAutoTarget ? 'fill-cyan-400 text-slate-950' : 'fill-amber-400 text-stone-950'
                      }`}
                    />
                  )}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
