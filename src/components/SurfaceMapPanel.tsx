import { Compass, Map, Maximize2, Minimize2, Satellite } from 'lucide-react';
import { getLandingZones } from '../game/constants';
import type { RoverObjective, RoverState, SurfacePlanet } from '../game/types';

interface SurfaceMapPanelProps {
  planet: SurfacePlanet;
  rover: RoverState;
  objectives: RoverObjective[];
  relayOnline: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
}

const MAP_BOUND = 140;

function toSvg(x: number, z: number): { sx: number; sy: number } {
  const sx = ((x + MAP_BOUND) / (MAP_BOUND * 2)) * 240;
  const sy = ((z + MAP_BOUND) / (MAP_BOUND * 2)) * 240;
  return { sx, sy };
}

export function SurfaceMapPanel({
  planet,
  rover,
  objectives,
  relayOnline,
  expanded,
  onToggleExpand,
}: SurfaceMapPanelProps) {
  const zones = getLandingZones(planet);
  const rovPt = toSvg(rover.x, rover.z);
  const headingDeg = (rover.headingRad * 180) / Math.PI;
  const basePt = toSvg(0, -24);
  const padPt = toSvg(0, 0);

  const isMars = planet === 'mars';
  const sizePx = expanded ? 288 : 168;

  return (
    <div
      data-testid="surface-map-panel"
      className="hud-panel pointer-events-auto rounded-xl p-2.5 transition-all"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Map className={`h-3.5 w-3.5 ${isMars ? 'text-amber-400' : 'text-cyan-300'}`} />
          <span className="font-display text-[11px] font-bold tracking-wider text-white uppercase">
            {isMars ? 'Jezero Topo Map' : 'South Pole Map'}
          </span>
        </div>

        <button
          type="button"
          data-testid="toggle-surface-map-btn"
          onClick={onToggleExpand}
          title="Expand / Collapse Map [Tab]"
          className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-slate-900 px-1.5 py-0.5 font-hud text-[10px] font-bold text-slate-200 hover:border-cyan-400"
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          <span className="keycap">Tab</span>
        </button>
      </div>

      {/* Satellite Resolution Indicator */}
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px]">
        <span
          className={`inline-flex items-center gap-1 font-semibold ${
            relayOnline ? 'text-emerald-300' : 'text-amber-300'
          }`}
        >
          <Satellite className="h-3 w-3" />
          {relayOnline ? 'HERMES High-Res Contours' : 'Coarse Wireframe (No Relay)'}
        </span>
        <span className="font-mono-tech text-slate-400">±138m</span>
      </div>

      {/* SVG Topographic Arena */}
      <div className="relative overflow-hidden rounded-lg border border-slate-700/80 bg-slate-950">
        <svg
          width={sizePx}
          height={sizePx}
          viewBox="0 0 240 240"
          className="block"
          aria-label={`${planet} tactical terrain map`}
        >
          {/* Background Terrain Tint */}
          <rect
            x="0"
            y="0"
            width="240"
            height="240"
            fill={isMars ? '#1e100a' : '#09101d'}
          />

          {/* Grid Lines */}
          {[60, 120, 180].map((g) => (
            <g key={g} opacity="0.22">
              <line x1={g} y1="0" x2={g} y2="240" stroke="#64748b" strokeWidth="0.7" />
              <line x1="0" y1={g} x2="240" y2={g} stroke="#64748b" strokeWidth="0.7" />
            </g>
          ))}

          {/* High-Res Satellite Topographic Contours (unlocked via Mission 1 HERMES Relay) */}
          {relayOnline ? (
            isMars ? (
              <g>
                {/* Jezero Dry Paleolake Channel */}
                <path
                  d="M 10 198 Q 92 150 154 96 T 230 34"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="12"
                  strokeOpacity="0.18"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 198 Q 92 150 154 96 T 230 34"
                  fill="none"
                  stroke="#fb923c"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                  opacity="0.65"
                />
                {/* Ancient River Delta Contours (54, -58) */}
                {[28, 20, 12].map((r, i) => (
                  <circle
                    key={`delta-${i}`}
                    cx={toSvg(54, -58).sx}
                    cy={toSvg(54, -58).sy}
                    r={r}
                    fill="#38bdf8"
                    fillOpacity="0.06"
                    stroke="#38bdf8"
                    strokeWidth="0.9"
                    strokeOpacity="0.55"
                  />
                ))}
                {/* Máaz Volcanic Ridge Contours (-66, -42) */}
                {[30, 20, 11].map((r, i) => (
                  <circle
                    key={`maaz-${i}`}
                    cx={toSvg(-66, -42).sx}
                    cy={toSvg(-66, -42).sy}
                    r={r}
                    fill="#facc15"
                    fillOpacity="0.06"
                    stroke="#facc15"
                    strokeWidth="0.9"
                    strokeOpacity="0.6"
                  />
                ))}
              </g>
            ) : (
              <g>
                {/* Shackleton Cold Trap Crater (56, -62) */}
                {[26, 17, 9].map((r, i) => (
                  <circle
                    key={`shack-${i}`}
                    cx={toSvg(56, -62).sx}
                    cy={toSvg(56, -62).sy}
                    r={r}
                    fill="#38bdf8"
                    fillOpacity="0.08"
                    stroke="#38bdf8"
                    strokeWidth="0.9"
                    strokeOpacity="0.6"
                  />
                ))}
                {/* Cabeus Shadow Basin (-54, 66) */}
                {[22, 13].map((r, i) => (
                  <circle
                    key={`cab-${i}`}
                    cx={toSvg(-54, 66).sx}
                    cy={toSvg(-54, 66).sy}
                    r={r}
                    fill="#c084fc"
                    fillOpacity="0.07"
                    stroke="#c084fc"
                    strokeWidth="0.9"
                    strokeOpacity="0.5"
                  />
                ))}
                {/* Malapert Sunlit Ridge (-64, -48) */}
                {[28, 18, 9].map((r, i) => (
                  <circle
                    key={`mal-${i}`}
                    cx={toSvg(-64, -48).sx}
                    cy={toSvg(-64, -48).sy}
                    r={r}
                    fill="#facc15"
                    fillOpacity="0.06"
                    stroke="#facc15"
                    strokeWidth="0.9"
                    strokeOpacity="0.6"
                  />
                ))}
              </g>
            )
          ) : (
            <circle
              cx="120"
              cy="120"
              r="98"
              fill="none"
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="3 4"
            />
          )}

          {/* Landing Pads / Zones */}
          {zones.map((z) => {
            const pt = toSvg(z.x, z.z);
            return (
              <circle
                key={z.id}
                cx={pt.sx}
                cy={pt.sy}
                r={z.id === 0 ? 7 : 5}
                fill="none"
                stroke="#64748b"
                strokeWidth="0.9"
                strokeDasharray="2 2"
              />
            );
          })}

          {/* Base Camp + Landing Pad Alpha/Delta */}
          <rect
            x={basePt.sx - 6}
            y={basePt.sy - 5}
            width="12"
            height="10"
            rx="2"
            fill="#1e293b"
            stroke="#94a3b8"
            strokeWidth="1"
          />
          <circle cx={padPt.sx} cy={padPt.sy} r="3.5" fill="#38bdf8" opacity="0.65" />

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
                    opacity="0.35"
                  />
                )}
                <circle
                  cx={pt.sx}
                  cy={pt.sy}
                  r={obj.completed ? 4.5 : 6}
                  fill={obj.completed ? '#10b981' : hex}
                  fillOpacity={obj.completed ? 0.35 : 0.28}
                  stroke={obj.completed ? '#34d399' : hex}
                  strokeWidth="1.4"
                />
                {expanded && (
                  <text
                    x={pt.sx + 7}
                    y={pt.sy + 3}
                    fontSize="8"
                    fontWeight="bold"
                    fill="#e2e8f0"
                  >
                    {idx + 1}. {obj.siteName.split(' ')[0]}
                  </text>
                )}
              </g>
            );
          })}

          {/* Live Rover Heading Arrow & Position */}
          <g transform={`translate(${rovPt.sx}, ${rovPt.sy}) rotate(${-headingDeg})`}>
            <polygon
              points="0,8 -4.5,-5 0,-2.5 4.5,-5"
              fill="#f8fafc"
              stroke="#0ea5e9"
              strokeWidth="1.2"
            />
          </g>
        </svg>
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
