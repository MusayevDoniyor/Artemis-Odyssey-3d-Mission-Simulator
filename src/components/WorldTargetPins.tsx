import { BookOpen, Home, MapPin } from 'lucide-react';
import type { MarsQueueState, SurfacePlanet, SurfaceWorldPrompt } from '../game/types';

interface WorldTargetPinsProps {
  prompts: SurfaceWorldPrompt[];
  planet: SurfacePlanet;
  marsQueue?: MarsQueueState;
  onInteractObjective: (objectiveId: string) => void;
  onOpenOutpost: () => void;
  onQueueMarsTarget?: (prompt: SurfaceWorldPrompt) => void;
}

export function WorldTargetPins({
  prompts,
  planet,
  marsQueue,
  onInteractObjective,
  onOpenOutpost,
  onQueueMarsTarget,
}: WorldTargetPinsProps) {
  const visiblePrompts = prompts.filter((p) => p.visible);
  if (visiblePrompts.length === 0) return null;

  const isMarsIdle = planet === 'mars' && marsQueue?.phase === 'IDLE';

  return (
    <div
      data-testid="world-target-pins"
      className="pointer-events-none fixed inset-0 z-10 overflow-hidden"
    >
      {visiblePrompts.map((p) => {
        const isBase = p.kind === 'basecamp';
        return (
          <div
            key={p.id}
            style={{ left: `${p.xPct}%`, top: `${p.yPct}%` }}
            className="absolute -translate-x-1/2 -translate-y-full"
          >
            <div className="flex flex-col items-center gap-1">
              {/* Proximity Interact Prompt (E Interact) */}
              {p.inRange ? (
                <button
                  type="button"
                  data-testid={isBase ? 'world-basecamp-interact' : `world-interact-${p.id}`}
                  onClick={() => (isBase ? onOpenOutpost() : onInteractObjective(p.id))}
                  className="hud-soft pointer-events-auto inline-flex items-center gap-2 rounded-xl border-cyan-400/75 px-3.5 py-2 text-base font-semibold text-white shadow-lg transition hover:border-cyan-300"
                >
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-cyan-400 px-1.5 text-sm font-bold text-slate-950">
                    E
                  </span>
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    {isBase ? (
                      <>
                        <Home className="h-4 w-4 text-emerald-300" />
                        Enter Airlock
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4 text-cyan-300" />
                        Learn &amp; Sample {p.title}
                      </>
                    )}
                  </span>
                  {!isBase && p.progress > 0 && (
                    <span className="text-sm font-bold text-cyan-300">
                      {Math.round(p.progress * 100)}%
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (isMarsIdle && onQueueMarsTarget) {
                      onQueueMarsTarget(p);
                    }
                  }}
                  title={isMarsIdle ? `Queue rover drive to ${p.title}` : p.title}
                  className={`flex flex-col items-center gap-0.5 ${
                    isMarsIdle ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
                  }`}
                >
                  <span className="hud-soft inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-semibold text-stone-100">
                    <span className="max-w-36 truncate">{p.title}</span>
                    <span className="font-bold text-amber-300">{p.distM} m</span>
                  </span>
                  {isBase ? (
                    <Home className="h-5 w-5 text-emerald-300 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]" />
                  ) : (
                    <MapPin className="h-6 w-6 fill-amber-400 text-stone-950 drop-shadow-[0_2px_8px_rgba(245,158,11,0.7)]" />
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
