import type { MouseEvent } from 'react';
import { Compass, Map, Maximize2, Minimize2, Satellite, Sun } from 'lucide-react';
import { PHYSICS, getLandingZones } from '../game/constants';
import type { MarsQueueState, RoverObjective, RoverState, SurfacePlanet } from '../game/types';

interface SurfaceMapPanelProps {
  planet: SurfacePlanet;
  rover: RoverState;
  objectives: RoverObjective[];
  relayOnline: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  marsQueue?: MarsQueueState;
  onMapClick?: (worldX: number, worldZ: number) => void;
}

const MAP_BOUND = PHYSICS.SURFACE_BOUND_M + 10;

function toSvg(x: number, z: number): { sx: number; sy: number } {
  const sx = ((x + MAP_BOUND) / (MAP_BOUND * 2)) * 240;
  const sy = ((z + MAP_BOUND) / (MAP_BOUND * 2)) * 240;
  return { sx, sy };
}

function fromSvgClient(
  rect: DOMRect,
  clientX: number,
  clientY: number
): { x: number; z: number } {
  const nx = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  const ny = Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height)));
  const rawX = nx * (MAP_BOUND * 2) - MAP_BOUND;
  const rawZ = ny * (MAP_BOUND * 2) - MAP_BOUND;
  return {
    x: Math.max(-PHYSICS.SURFACE_BOUND_M, Math.min(PHYSICS.SURFACE_BOUND_M, rawX)),
    z: Math.max(-PHYSICS.SURFACE_BOUND_M, Math.min(PHYSICS.SURFACE_BOUND_M, rawZ)),
  };
}

export function SurfaceMapPanel({
  planet,
  rover,
  objectives,
  relayOnline,
  expanded,
  onToggleExpand,
  marsQueue,
  onMapClick,
}: SurfaceMapPanelProps) {
  const zones = getLandingZones(planet);
  const rovPt = toSvg(rover.x, rover.z);
  const headingDeg = (rover.headingRad * 180) / Math.PI;
  const basePt = toSvg(-15, -13);
  const padPt = toSvg(0, 0);

  const isMars = planet === 'mars';
  const sizePx = expanded ? 304 : 180;
  const scale100mPx = (100 / (MAP_BOUND * 2)) * 240;

  const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
    if (!onMapClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const { x, z } = fromSvgClient(rect, e.clientX, e.clientY);
    onMapClick(x, z);
  };

  return (
    <div
      data-testid="surface-map-panel"
      className="hud-soft pointer-events-auto rounded-2xl p-3 transition-all"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-bold tracking-wide text-white uppercase">
            {isMars ? 'Jezero Topo Map' : 'South Pole Map'}
          </span>
        </div>

        <button
          type="button"
          data-testid="toggle-surface-map-btn"
          onClick={onToggleExpand}
          title="Expand / Collapse Map"
          className="inline-flex items-center gap-1 rounded-lg border border-sky-400/25 bg-slate-900/75 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-amber-400"
        >
          {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Satellite Resolution Indicator */}
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
          <Satellite className="h-3.5 w-3.5" />
          {relayOnline ? 'HERMES High-Res Contours' : 'Coarse Survey Grid'}
        </span>
        <span className="font-mono-tech text-slate-300">±{PHYSICS.SURFACE_BOUND_M}m</span>
      </div>

      {/* SVG Topographic Arena */}
      <div className="relative overflow-hidden rounded-xl border border-sky-400/25 bg-slate-950">
        <svg
          width={sizePx}
          height={sizePx}
          viewBox="0 0 240 240"
          onClick={handleSvgClick}
          className={`block ${onMapClick ? 'cursor-crosshair' : ''}`}
          aria-label={`${planet} tactical terrain map`}
        >
          {/* Background Terrain Tint */}
          <rect
            x="0"
            y="0"
            width="240"
            height="240"
            fill={isMars ? '#20110a' : '#0b1018'}
          />

          {/* Outer Arena Boundary Ring */}
          <rect
            x={toSvg(-PHYSICS.SURFACE_BOUND_M, -PHYSICS.SURFACE_BOUND_M).sx}
            y={toSvg(-PHYSICS.SURFACE_BOUND_M, -PHYSICS.SURFACE_BOUND_M).sy}
            width={
              toSvg(PHYSICS.SURFACE_BOUND_M, 0).sx -
              toSvg(-PHYSICS.SURFACE_BOUND_M, 0).sx
            }
            height={
              toSvg(0, PHYSICS.SURFACE_BOUND_M).sy -
              toSvg(0, -PHYSICS.SURFACE_BOUND_M).sy
            }
            fill="none"
            stroke="#334155"
            strokeWidth="0.9"
            strokeDasharray="4 3"
          />

          {/* Polar / Coordinate Grid Lines */}
          {[60, 120, 180].map((g) => (
            <g key={g} opacity="0.24">
              <line x1={g} y1="0" x2={g} y2="240" stroke="#64748b" strokeWidth="0.7" />
              <line x1="0" y1={g} x2="240" y2={g} stroke="#64748b" strokeWidth="0.7" />
            </g>
          ))}

          {/* Permanently Shadowed Regions (PSRs) & Topographic Elevation Contours */}
          {isMars ? (
            <g>
              {/* Jezero Paleolake Channel */}
              <path
                d={`M 8 206 Q 94 148 ${toSvg(126, -134).sx} ${toSvg(126, -134).sy}`}
                fill="none"
                stroke="#f97316"
                strokeWidth="10"
                strokeOpacity={relayOnline ? 0.22 : 0.1}
                strokeLinecap="round"
              />
              <path
                d={`M 8 206 Q 94 148 ${toSvg(126, -134).sx} ${toSvg(126, -134).sy}`}
                fill="none"
                stroke="#fb923c"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                opacity={relayOnline ? 0.75 : 0.35}
              />
              {/* Jezero River Delta Fan Contours (126, -134) */}
              {(relayOnline ? [26, 18, 10] : [18]).map((r, i) => (
                <circle
                  key={`delta-${i}`}
                  cx={toSvg(126, -134).sx}
                  cy={toSvg(126, -134).sy}
                  r={r}
                  fill="#38bdf8"
                  fillOpacity="0.08"
                  stroke="#38bdf8"
                  strokeWidth="0.9"
                  strokeOpacity={relayOnline ? 0.65 : 0.32}
                />
              ))}
              {/* Máaz Wind-Swept Volcanic Ridge (-148, -96) */}
              {(relayOnline ? [28, 19, 10] : [20]).map((r, i) => (
                <circle
                  key={`maaz-${i}`}
                  cx={toSvg(-148, -96).sx}
                  cy={toSvg(-148, -96).sy}
                  r={r}
                  fill="#facc15"
                  fillOpacity="0.08"
                  stroke="#facc15"
                  strokeWidth="0.9"
                  strokeOpacity={relayOnline ? 0.65 : 0.32}
                />
              ))}
              {/* Carbonate Shore & MOXIE Depot contours */}
              {relayOnline && (
                <>
                  <circle
                    cx={toSvg(112, 142).sx}
                    cy={toSvg(112, 142).sy}
                    r={16}
                    fill="#34d399"
                    fillOpacity="0.06"
                    stroke="#34d399"
                    strokeWidth="0.8"
                    strokeOpacity="0.5"
                  />
                  <circle
                    cx={toSvg(-118, 128).sx}
                    cy={toSvg(-118, 128).sy}
                    r={16}
                    fill="#fb923c"
                    fillOpacity="0.06"
                    stroke="#fb923c"
                    strokeWidth="0.8"
                    strokeOpacity="0.5"
                  />
                </>
              )}
            </g>
          ) : (
            <g>
              {/* Shackleton Cold Trap PSR Crater (128, -142) */}
              {(relayOnline ? [26, 17, 9] : [18]).map((r, i) => (
                <circle
                  key={`shack-${i}`}
                  cx={toSvg(128, -142).sx}
                  cy={toSvg(128, -142).sy}
                  r={r}
                  fill={i === 0 ? '#020617' : '#38bdf8'}
                  fillOpacity={i === 0 ? 0.55 : 0.12}
                  stroke="#38bdf8"
                  strokeWidth="0.9"
                  strokeOpacity={relayOnline ? 0.68 : 0.34}
                />
              ))}
              {/* Cabeus Shadow PSR Basin (-124, 152) */}
              {(relayOnline ? [24, 14] : [16]).map((r, i) => (
                <circle
                  key={`cab-${i}`}
                  cx={toSvg(-124, 152).sx}
                  cy={toSvg(-124, 152).sy}
                  r={r}
                  fill={i === 0 ? '#020617' : '#c084fc'}
                  fillOpacity={i === 0 ? 0.52 : 0.1}
                  stroke="#c084fc"
                  strokeWidth="0.9"
                  strokeOpacity={relayOnline ? 0.6 : 0.3}
                />
              ))}
              {/* Malapert Sunlit Ridge (-148, -108) */}
              {(relayOnline ? [28, 18, 9] : [19]).map((r, i) => (
                <circle
                  key={`mal-${i}`}
                  cx={toSvg(-148, -108).sx}
                  cy={toSvg(-148, -108).sy}
                  r={r}
                  fill="#facc15"
                  fillOpacity="0.09"
                  stroke="#facc15"
                  strokeWidth="0.9"
                  strokeOpacity={relayOnline ? 0.68 : 0.34}
                />
              ))}
              {/* Nobile Quarry Bench (118, 134) */}
              {relayOnline && (
                <circle
                  cx={toSvg(118, 134).sx}
                  cy={toSvg(118, 134).sy}
                  r={18}
                  fill="#34d399"
                  fillOpacity="0.07"
                  stroke="#34d399"
                  strokeWidth="0.85"
                  strokeOpacity="0.55"
                />
              )}
            </g>
          )}

          {/* Landing Pads / Zones */}
          {zones.map((z) => {
            const pt = toSvg(z.x, z.z);
            return (
              <circle
                key={z.id}
                cx={pt.sx}
                cy={pt.sy}
                r={z.id === 0 ? 6.5 : 4.5}
                fill="none"
                stroke="#64748b"
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Base Camp (-15, -13) Shelter Zone & Landing Pad Alpha/Delta (0, 0) */}
          <circle
            cx={basePt.sx}
            cy={basePt.sy}
            r={(22 / (MAP_BOUND * 2)) * 240}
            fill="#10b981"
            fillOpacity="0.08"
            stroke="#34d399"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          <rect
            x={basePt.sx - 5.5}
            y={basePt.sy - 4.5}
            width="11"
            height="9"
            rx="2"
            fill="#0f172a"
            stroke="#34d399"
            strokeWidth="1.2"
          />
          <circle cx={padPt.sx} cy={padPt.sy} r="3.2" fill="#38bdf8" opacity="0.75" />

          {/* 4 Science Objectives */}
          {objectives.map((obj, idx) => {
            const pt = toSvg(obj.x, obj.z);
            const hex = `#${obj.color.toString(16).padStart(6, '0')}`;
            return (
              <g key={obj.id}>
                {!obj.completed && (
                  <line
                    x1={rovPt.sx}
                    y1={rovPt.sy}
                    x2={pt.sx}
                    y2={pt.sy}
                    stroke={hex}
                    strokeWidth="0.7"
                    strokeDasharray="2 3"
                    opacity="0.38"
                  />
                )}
                <circle
                  cx={pt.sx}
                  cy={pt.sy}
                  r={obj.completed ? 4.2 : 5.6}
                  fill={obj.completed ? '#10b981' : hex}
                  fillOpacity={obj.completed ? 0.35 : 0.28}
                  stroke={obj.completed ? '#34d399' : hex}
                  strokeWidth="1.4"
                />
                {expanded && (
                  <text
                    x={pt.sx > 168 ? pt.sx - 8 : pt.sx + 7}
                    y={pt.sy + 3}
                    textAnchor={pt.sx > 168 ? 'end' : 'start'}
                    fontSize="8"
                    fontWeight="bold"
                    fill="#f1f5f9"
                  >
                    {idx + 1}. {obj.siteName.split(' ')[0]}
                  </text>
                )}
              </g>
            );
          })}

          {/* Active A* Obstacle-Avoiding Planned Path */}
          {marsQueue?.plannedPath && marsQueue.plannedPath.length > 0 && (
            <polyline
              points={[
                `${rovPt.sx.toFixed(1)},${rovPt.sy.toFixed(1)}`,
                ...marsQueue.plannedPath.map((wp) => {
                  const p = toSvg(wp.x, wp.z);
                  return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
                }),
              ].join(' ')}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="1.9"
              strokeDasharray="3 2"
              opacity="0.95"
            />
          )}

          {/* Mars Queued Command Waypoints */}
          {marsQueue && marsQueue.queue.length > 0 && (
            <g>
              <polyline
                points={[
                  `${rovPt.sx.toFixed(1)},${rovPt.sy.toFixed(1)}`,
                  ...marsQueue.queue.map((cmd) => {
                    const p = toSvg(cmd.x, cmd.z);
                    return `${p.sx.toFixed(1)},${p.sy.toFixed(1)}`;
                  }),
                ].join(' ')}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.4"
                strokeDasharray="4 3"
                opacity="0.65"
              />
              {marsQueue.queue.map((cmd, idx) => {
                const p = toSvg(cmd.x, cmd.z);
                const isDone = idx < marsQueue.activeIndex && marsQueue.phase === 'EXECUTING';
                const isCurrent = idx === marsQueue.activeIndex && marsQueue.phase === 'EXECUTING';
                return (
                  <g key={cmd.id}>
                    <circle
                      cx={p.sx}
                      cy={p.sy}
                      r={isCurrent ? 6.5 : 5}
                      fill={isDone ? '#57534e' : '#f59e0b'}
                      stroke="#141211"
                      strokeWidth="1.2"
                    />
                    <text
                      x={p.sx}
                      y={p.sy + 2.5}
                      textAnchor="middle"
                      fontSize="7"
                      fontWeight="bold"
                      fill="#141211"
                    >
                      {idx + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Live Rover Heading Arrow + Sensor FOV Wedge */}
          <g transform={`translate(${rovPt.sx}, ${rovPt.sy}) rotate(${-headingDeg})`}>
            <path d="M 0 0 L -9 20 A 22 22 0 0 0 9 20 Z" fill="#f59e0b" fillOpacity="0.18" />
            <polygon
              points="0,8 -4.5,-5 0,-2.5 4.5,-5"
              fill="#f8fafc"
              stroke="#f59e0b"
              strokeWidth="1.2"
            />
          </g>

          {/* Compass Cardinal Markers N / E / S / W */}
          <text x="120" y="10" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">
            N
          </text>
          <text x="120" y="235" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#94a3b8">
            S
          </text>
          <text x="8" y="123" textAnchor="start" fontSize="8" fontWeight="bold" fill="#94a3b8">
            W
          </text>
          <text x="232" y="123" textAnchor="end" fontSize="8" fontWeight="bold" fill="#94a3b8">
            E
          </text>

          {/* 100m Calibration Scale Bar */}
          <g transform="translate(10, 224)">
            <line x1="0" y1="4" x2={scale100mPx} y2="4" stroke="#cbd5e1" strokeWidth="1.4" />
            <line x1="0" y1="1" x2="0" y2="7" stroke="#cbd5e1" strokeWidth="1.4" />
            <line
              x1={scale100mPx}
              y1="1"
              x2={scale100mPx}
              y2="7"
              stroke="#cbd5e1"
              strokeWidth="1.4"
            />
            <text x={scale100mPx + 4} y="6.5" fontSize="7.5" fontWeight="bold" fill="#cbd5e1">
              100m
            </text>
          </g>
        </svg>

        {/* Sun Angle Grazing Indicator */}
        <div
          className="pointer-events-none absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded bg-slate-950/90 px-1.5 py-0.5 font-mono-tech text-[9px] text-amber-300"
          title="Low-angle solar illumination vector"
        >
          <Sun className="h-2.5 w-2.5" />
          SUN NW
        </div>
      </div>

      {/* Live Coordinates & Next Waypoint */}
      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-300">
        <span className="inline-flex items-center gap-1 font-mono-tech">
          <Compass className="h-3 w-3 text-sky-300" />
          X:{Math.round(rover.x)}m Z:{Math.round(rover.z)}m
        </span>
        <span className="font-mono-tech font-semibold text-amber-300">
          {objectives.filter((o) => o.completed).length}/{objectives.length} Sites
        </span>
      </div>
    </div>
  );
}
