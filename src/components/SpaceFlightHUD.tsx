import { Battery, Compass, Radio, Rocket, Shield, Wind } from 'lucide-react';
import { SOLAR_TARGETS } from '../game/constants';
import type {
  CampaignMissionId,
  GameMenuTab,
  ResourceState,
  SpaceFlightState,
  SpaceTargetId,
} from '../game/types';

interface SpaceFlightHUDProps {
  space: SpaceFlightState;
  resources: ResourceState;
  campaignMission: CampaignMissionId;
  donkiFlareActive: boolean;
  freeExploreMode: boolean;
  onOpenMenuTab: (tab: GameMenuTab) => void;
  onToggleAutoPilot: () => void;
  onToggleShieldBoost: () => void;
  onCompleteSatelliteMission: () => void;
  onCompleteGatewayMission: () => void;
  onEnterLunarOrbit: () => void;
  onEnterMarsOrbit: () => void;
}

function toCircleRadar(x: number, z: number): { rx: number; ry: number } {
  const nx = (x - -8) / 70;
  const nz = (z - -8) / 60;
  const rx = 72 + nx * 46;
  const ry = 72 + nz * 46;
  const dx = rx - 72;
  const dy = ry - 72;
  const dist = Math.hypot(dx, dy);
  if (dist > 56) {
    const s = 56 / dist;
    return { rx: 72 + dx * s, ry: 72 + dy * s };
  }
  return { rx, ry };
}

export function SpaceFlightHUD({
  space,
  resources,
  campaignMission,
  donkiFlareActive,
  freeExploreMode,
  onOpenMenuTab,
  onToggleAutoPilot,
  onToggleShieldBoost,
  onCompleteSatelliteMission,
  onCompleteGatewayMission,
  onEnterLunarOrbit,
  onEnterMarsOrbit,
}: SpaceFlightHUDProps) {
  const activeTarget = SOLAR_TARGETS[space.targetId];
  const distToTarget = Math.hypot(activeTarget.x - space.shipX, activeTarget.z - space.shipZ);
  const shipSpeed = Math.hypot(space.vx, space.vz);
  const sat = space.orbitalSat;
  const isMoving = shipSpeed > 0.4;

  const targetNames: Record<SpaceTargetId, string> = {
    'relay-orbit': 'HERMES Relay',
    moon: 'Moon Orbit',
    gateway: 'Lunar Gateway',
    mars: 'Mars Orbit',
  };

  let objectiveText = `Fly Orion toward ${targetNames[space.targetId]}.`;
  if (space.targetId === 'relay-orbit' && space.inSatDeployZone && !sat.linkLocked) {
    objectiveText = 'Hold E or Space to deploy HERMES Relay.';
  } else if (sat.linkLocked && campaignMission === 'artemis-2') {
    objectiveText = 'HERMES Relay online. Complete mission below.';
  } else if (space.arrivedGateway && campaignMission === 'artemis-4') {
    objectiveText = 'Docked with Gateway. Complete mission below.';
  } else if (space.arrivedMoon) {
    objectiveText = 'Lunar orbit reached. Start powered descent.';
  } else if (space.arrivedMars) {
    objectiveText = 'Mars orbit reached. Begin atmospheric entry.';
  }

  const shipPt = toCircleRadar(space.shipX, space.shipZ);
  const sunPt = toCircleRadar(-48, -36);
  const tgtPt = toCircleRadar(activeTarget.x, activeTarget.z);

  const showArriveBtn =
    (space.inSatDeployZone && !sat.linkLocked) ||
    (sat.linkLocked && campaignMission === 'artemis-2') ||
    (space.arrivedGateway && campaignMission === 'artemis-4') ||
    space.arrivedMoon ||
    space.arrivedMars ||
    freeExploreMode;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-5">
      {/* TOP ROW: Group 1 & Group 2 */}
      <div className="flex items-start justify-between gap-4">
        {/* GROUP 1: Top-Left Wordmark + Objective */}
        <div data-testid="hud-group-objective" className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-2.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 4L27 27H21.5L16 15.5L10.5 27H5L16 4Z" fill="#FFFFFF" />
              <path d="M7 22C12 18 20 15 28 16.5" stroke="#F59E0B" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <div className="leading-none">
              <span className="block text-base font-extrabold tracking-widest text-white">ARTEMIS</span>
              <span className="block text-base font-extrabold tracking-widest text-white">ODYSSEY</span>
            </div>
          </div>

          <section className="hud-soft pointer-events-auto max-w-xs rounded-2xl px-4 py-3 text-stone-100">
            <div className="flex items-center gap-2 text-base font-bold text-amber-400">
              <span className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-amber-400" />
              <span>{freeExploreMode ? 'Free Explore' : 'Deep Space Transit'}</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-4">
              <p className="text-base leading-snug text-stone-100">{objectiveText}</p>
              <span className="shrink-0 text-base font-bold text-stone-200 tabular-nums">
                {space.visitedTargets.length} / 4
              </span>
            </div>
          </section>
        </div>

        {/* GROUP 2: Top-Right 3 Meters + Target Range (+ Contextual Chips only when relevant) */}
        <div data-testid="hud-group-meters" className="flex flex-col items-end gap-2">
          <div className="hud-soft pointer-events-auto flex items-center divide-x divide-white/10 rounded-2xl px-4 py-2.5 tabular-nums">
            <div className="flex items-center gap-2.5 pr-4">
              <Battery
                className={`h-5 w-5 ${resources.power <= 20 ? 'text-rose-400' : 'text-amber-400'}`}
              />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {Math.round(resources.power)}%
                </span>
                <span className="text-sm text-stone-400">Power</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4">
              <Wind className="h-5 w-5 text-stone-200" />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {Math.round(resources.oxygen)}%
                </span>
                <span className="text-sm text-stone-400">Air</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4">
              <Shield
                className={`h-5 w-5 ${resources.shield <= 20 ? 'text-rose-400' : 'text-amber-400'}`}
              />
              <div>
                <span
                  className={`block text-lg leading-none font-bold ${
                    resources.shield <= 20 ? 'text-rose-400' : 'text-white'
                  }`}
                >
                  {Math.round(resources.shield)}%
                </span>
                <span className="text-sm text-stone-400">Shield</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pl-4">
              <Compass className="h-5 w-5 text-amber-400" />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {Math.round(distToTarget)} u
                </span>
                <span className="text-sm text-stone-400">Target</span>
              </div>
            </div>
          </div>

          {(space.inRadiationZone || space.fuelPct < 35 || space.targetId === 'mars') && (
            <div className="flex flex-wrap justify-end gap-2">
              {space.targetId === 'mars' && (
                <span className="hud-soft rounded-xl px-3 py-1.5 text-sm font-semibold text-amber-200">
                  14m radio lag
                </span>
              )}
              {space.fuelPct < 35 && (
                <span className="hud-soft rounded-xl px-3 py-1.5 text-sm font-semibold text-amber-200">
                  Fuel {Math.round(space.fuelPct)}%
                </span>
              )}
              {space.inRadiationZone && (
                <button
                  type="button"
                  onClick={onToggleShieldBoost}
                  className="hud-soft-alert pointer-events-auto rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-200"
                >
                  {donkiFlareActive ? 'Solar Storm' : 'Radiation Zone'} ·{' '}
                  {space.shieldBoostActive ? 'Shield On' : 'Enable Shield'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Group 3 (Circular Solar Radar), Group 5 (Speed / Arrival), Group 4 (Hints) */}
      <div className="flex items-end justify-between gap-4">
        {/* GROUP 3: Circular Solar System Mini Radar */}
        <button
          type="button"
          data-testid="hud-group-radar"
          onClick={() => onOpenMenuTab('map')}
          title="Open Solar Map & Course [Tab]"
          className="hud-soft pointer-events-auto relative h-36 w-36 shrink-0 rounded-full p-1 transition hover:border-amber-400"
        >
          <svg viewBox="0 0 144 144" className="h-full w-full">
            <circle cx="72" cy="72" r="60" fill="#111013" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
            <circle cx={sunPt.rx} cy={sunPt.ry} r="22" fill="none" stroke="rgba(244,63,94,0.38)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={sunPt.rx} cy={sunPt.ry} r="5.5" fill="#fbbf24" />

            <line
              x1={shipPt.rx}
              y1={shipPt.ry}
              x2={tgtPt.rx}
              y2={tgtPt.ry}
              stroke="#f59e0b"
              strokeWidth="1.2"
              strokeDasharray="3 3"
              opacity="0.7"
            />
            <polygon
              points={`${tgtPt.rx},${tgtPt.ry - 6} ${tgtPt.rx + 6},${tgtPt.ry} ${tgtPt.rx},${tgtPt.ry + 6} ${tgtPt.rx - 6},${tgtPt.ry}`}
              fill="none"
              stroke="#fbbf24"
              strokeWidth="2"
            />
            <circle cx={shipPt.rx} cy={shipPt.ry} r="4" fill="#ffffff" stroke="#f59e0b" strokeWidth="1.5" />
          </svg>
        </button>

        {/* GROUP 5: Bottom-Center Moving Velocity & Arrival Action */}
        <div data-testid="hud-group-speed" className="flex flex-col items-center gap-2.5">
          {showArriveBtn && (
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              {space.inSatDeployZone && !sat.linkLocked && (
                <button
                  type="button"
                  data-testid="deploy-sat-btn"
                  data-hold-keys="action"
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 text-base font-bold text-stone-950 shadow-lg hover:bg-amber-400"
                >
                  <Radio className="h-4 w-4" />
                  Hold E to Deploy Relay ({Math.round((sat.solarDeployedPct + sat.dishAlignedPct) / 2)}%)
                </button>
              )}

              {sat.linkLocked && campaignMission === 'artemis-2' && (
                <button
                  type="button"
                  data-testid="complete-sat-mission-btn"
                  onClick={onCompleteSatelliteMission}
                  className="pointer-events-auto rounded-2xl bg-amber-500 px-5 py-2.5 text-base font-bold text-stone-950 shadow-lg hover:bg-amber-400"
                >
                  Relay Locked — Complete Artemis II
                </button>
              )}

              {space.arrivedGateway && campaignMission === 'artemis-4' && (
                <button
                  type="button"
                  data-testid="complete-gateway-mission-btn"
                  onClick={onCompleteGatewayMission}
                  className="pointer-events-auto rounded-2xl bg-amber-500 px-5 py-2.5 text-base font-bold text-stone-950 shadow-lg hover:bg-amber-400"
                >
                  Gateway Docked — Complete Artemis IV
                </button>
              )}

              {(space.arrivedMoon || freeExploreMode) && campaignMission !== 'mars-pathfinder' && (
                <button
                  type="button"
                  data-testid="land-moon-btn"
                  onClick={onEnterLunarOrbit}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 text-base font-bold text-stone-950 shadow-lg hover:bg-amber-400"
                >
                  <Rocket className="h-4 w-4" />
                  Land on Moon
                </button>
              )}

              {(space.arrivedMars || freeExploreMode) && (
                <button
                  type="button"
                  data-testid="land-mars-btn"
                  onClick={onEnterMarsOrbit}
                  className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-2.5 text-base font-bold text-stone-950 shadow-lg hover:bg-amber-400"
                >
                  <Rocket className="h-4 w-4" />
                  Land on Mars
                </button>
              )}
            </div>
          )}

          {isMoving && (
            <div className="hud-soft flex items-center gap-3 rounded-2xl px-5 py-2 tabular-nums">
              <span className="text-2xl font-bold text-white">{shipSpeed.toFixed(1)} u/s</span>
              {space.autoPilot && (
                <span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-sm font-semibold text-amber-200">
                  Auto-Pilot
                </span>
              )}
            </div>
          )}
        </div>

        {/* GROUP 4: Bottom-Right Max 3 Hints */}
        <div
          data-testid="hud-group-hints"
          className="hud-soft pointer-events-auto flex items-center gap-3 rounded-xl px-4 py-2.5 text-base"
        >
          <button
            type="button"
            data-hold-keys="forward"
            className="inline-flex items-center gap-2 hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-sm font-bold text-white">
              W
            </span>
            <span className="font-medium text-stone-200">Thrust</span>
          </button>
          <button
            type="button"
            onClick={onToggleAutoPilot}
            className="inline-flex items-center gap-2 hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-sm font-bold text-white">
              G
            </span>
            <span className="font-medium text-stone-200">
              {space.autoPilot ? 'Auto On' : 'Auto-Pilot'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onOpenMenuTab('map')}
            className="inline-flex items-center gap-2 hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-sm font-bold text-white">
              Tab
            </span>
            <span className="font-medium text-stone-200">Solar Map</span>
          </button>
        </div>
      </div>
    </div>
  );
}
