import { Battery, Compass, FastForward, Flame, Shield, Wind } from 'lucide-react';
import { PHYSICS, getLandingZones } from '../game/constants';
import { getSurfaceTerrainHeight } from '../game/physics';
import { MARS_EDL_TIMELINE, POST_LANDING_UNSTOW_STEPS } from '../game/sequences';
import type {
  GameMenuTab,
  LandingGuidanceMode,
  LandingState,
  MarsEdlState,
  PostLandingUnstowState,
  ResourceState,
} from '../game/types';

interface LandingHUDProps {
  landing: LandingState;
  marsEdl: MarsEdlState;
  unstow: PostLandingUnstowState | null;
  resources: ResourceState;
  isruFuelBonusPct: number;
  onOpenMenuTab: (tab: GameMenuTab) => void;
  onFastForwardEdl: () => void;
  onSkipUnstow: () => void;
  onSetGuidance: (mode: LandingGuidanceMode) => void;
  onSetThrottlePct: (pct: number) => void;
  onCutoffEngine: () => void;
  onMatchHover: () => void;
}

export function LandingHUD({
  landing,
  marsEdl,
  unstow,
  resources,
  isruFuelBonusPct,
  onOpenMenuTab,
  onFastForwardEdl,
  onSkipUnstow,
  onSetGuidance,
  onSetThrottlePct,
  onCutoffEngine,
  onMatchHover,
}: LandingHUDProps) {
  const zones = getLandingZones(landing.planet);
  const groundH = getSurfaceTerrainHeight(landing.planet, landing.x, landing.z);
  const altM = Math.max(0, landing.y - groundH);
  const descentSpeed = Math.abs(landing.vy);
  const activeZone = zones[landing.targetZoneId] || zones[0];
  const isMars = landing.planet === 'mars';
  const throttlePct = Math.round(landing.throttle * 100);
  const isMoving = altM > 0.2 || descentSpeed > 0.2;

  const relX = Math.max(-45, Math.min(45, landing.x - activeZone.x));
  const relZ = Math.max(-45, Math.min(45, landing.z - activeZone.z));
  const predRelX = Math.max(-45, Math.min(45, landing.predX - activeZone.x));
  const predRelZ = Math.max(-45, Math.min(45, landing.predZ - activeZone.z));

  const activeEdlSpec = MARS_EDL_TIMELINE.find((s) => s.id === marsEdl.stage) || MARS_EDL_TIMELINE[0];
  const activeUnstowSpec =
    unstow && unstow.active
      ? POST_LANDING_UNSTOW_STEPS.find((s) => s.id === unstow.stage) || POST_LANDING_UNSTOW_STEPS[0]
      : null;

  let objectiveLine = `Land softly on ${activeZone.name} (< 2.5 m/s).`;
  let counterText = `${landing.gatesPassed} / 4`;
  if (unstow?.active && activeUnstowSpec) {
    objectiveLine = activeUnstowSpec.title;
    counterText = `${Math.round(unstow.totalProgressPct)}%`;
  } else if (isMars && marsEdl.active) {
    objectiveLine = `Entry step: ${activeEdlSpec.title}`;
    counterText = `${Math.round(altM)} m`;
  }

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
              <span>{isMars ? 'Mars Powered Descent' : 'Lunar Powered Descent'}</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-4">
              <p className="text-base leading-snug text-stone-100">{objectiveLine}</p>
              <span className="shrink-0 text-base font-bold text-stone-200 tabular-nums">
                {counterText}
              </span>
            </div>
          </section>
        </div>

        {/* GROUP 2: Top-Right 3 Meters + Pad Distance (+ Contextual Alert Chips only when needed) */}
        <div data-testid="hud-group-meters" className="flex flex-col items-end gap-2">
          <div className="hud-soft pointer-events-auto flex items-center divide-x divide-white/10 rounded-2xl px-4 py-2.5 tabular-nums">
            <div className="flex items-center gap-2.5 pr-4">
              <Battery className="h-5 w-5 text-amber-400" />
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
              <Shield className="h-5 w-5 text-amber-400" />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {Math.round(resources.shield)}%
                </span>
                <span className="text-sm text-stone-400">Shield</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pl-4">
              <Compass className="h-5 w-5 text-amber-400" />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {Math.round(landing.distToPad)} m
                </span>
                <span className="text-sm text-stone-400">Pad Dist</span>
              </div>
            </div>
          </div>

          {(landing.fuelPct < 35 ||
            (altM < 45 && descentSpeed > PHYSICS.LANDER_HARD_VY) ||
            (landing.contactLight && !landing.landed) ||
            isruFuelBonusPct > 0) && (
            <div className="flex flex-wrap justify-end gap-2">
              {landing.contactLight && !landing.landed && (
                <span className="hud-soft rounded-xl border-amber-400 px-3 py-1.5 text-sm font-bold text-amber-300">
                  Contact Light — Press X to Cut
                </span>
              )}
              {altM < 45 && descentSpeed > PHYSICS.LANDER_HARD_VY && !landing.landed && (
                <span className="hud-soft-alert rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-200">
                  Fast Sink {descentSpeed.toFixed(1)} m/s
                </span>
              )}
              {landing.fuelPct < 35 && (
                <span className="hud-soft rounded-xl px-3 py-1.5 text-sm font-semibold text-amber-200">
                  Fuel {Math.round(landing.fuelPct)}%
                </span>
              )}
              {isruFuelBonusPct > 0 && landing.fuelPct >= 35 && (
                <span className="hud-soft rounded-xl px-3 py-1.5 text-sm font-semibold text-amber-200">
                  +{isruFuelBonusPct}% ISRU Fuel
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Group 3 (Circular Pad Radar), Group 5 (Unstow / EDL / Throttle), Group 4 (Hints) */}
      <div className="flex items-end justify-between gap-4">
        {/* GROUP 3: Bottom-Left Circular Predictive Pad Radar */}
        <button
          type="button"
          data-testid="hud-group-radar"
          onClick={() => onOpenMenuTab('map')}
          title="Open Landing Zone Map [Tab]"
          className="hud-soft pointer-events-auto relative h-36 w-36 shrink-0 rounded-full p-1 transition hover:border-amber-400"
        >
          <svg viewBox="0 0 144 144" className="h-full w-full">
            <circle cx="72" cy="72" r="60" fill="#131214" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
            <circle cx="72" cy="72" r="30" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="1" />
            <circle cx="72" cy="72" r="6" fill="none" stroke="#f59e0b" strokeWidth="1.8" />

            {/* Predicted Touchdown Ring */}
            <circle
              cx={72 + (predRelX / 45) * 48}
              cy={72 + (predRelZ / 45) * 48}
              r="5.5"
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            {/* Live Lander Position */}
            <circle
              cx={72 + (relX / 45) * 48}
              cy={72 + (relZ / 45) * 48}
              r="4.5"
              fill="#ffffff"
              stroke="#f59e0b"
              strokeWidth="1.5"
            />
            <text x="72" y="122" textAnchor="middle" fontSize="11" fontWeight="700" fill="#e7e5e4">
              {altM.toFixed(0)} m ALT
            </text>
          </svg>
        </button>

        {/* GROUP 5: Bottom-Center Unstow Stepper OR EDL/Descent Console */}
        <div data-testid="hud-group-speed" className="flex flex-col items-center gap-2.5">
          {unstow?.active ? (
            <div
              data-testid="post-landing-unstow-panel"
              className="hud-soft pointer-events-auto flex items-center gap-4 rounded-2xl px-5 py-3 text-base"
            >
              <div>
                <div className="font-bold text-amber-300">
                  {activeUnstowSpec?.title ?? 'Unstowing Rover'}
                </div>
                <div className="text-sm text-stone-300">
                  {activeUnstowSpec?.explanation ?? 'Deploying rocker-bogie wheels onto surface.'}
                </div>
              </div>
              <button
                type="button"
                data-testid="skip-unstow-btn"
                onClick={onSkipUnstow}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-stone-950 hover:bg-amber-400"
              >
                <FastForward className="h-4 w-4" />
                Deploy Now
              </button>
            </div>
          ) : (
            <>
              {isMars && marsEdl.active && (
                <div
                  data-testid="mars-edl-banner"
                  className="hud-soft pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2 text-sm"
                >
                  <span className="font-bold text-amber-300">
                    7-Min EDL · {activeEdlSpec.title}
                  </span>
                  {marsEdl.commsBlackout && (
                    <span className="rounded-md bg-rose-500/20 px-2 py-0.5 font-semibold text-rose-200">
                      Plasma Blackout
                    </span>
                  )}
                  <button
                    type="button"
                    data-testid="fast-forward-edl-btn"
                    onClick={onFastForwardEdl}
                    className="rounded-lg bg-amber-500 px-3 py-1 font-bold text-stone-950 hover:bg-amber-400"
                  >
                    Skip to Terminal
                  </button>
                </div>
              )}

              {isMoving && (
                <div className="hud-soft pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl px-4 py-2.5 tabular-nums">
                  <div className="flex items-center gap-2 pr-2">
                    <Flame className="h-5 w-5 text-amber-400" />
                    <span className="text-xl font-bold text-white">
                      {descentSpeed.toFixed(1)} m/s
                    </span>
                    <span className="text-sm text-stone-300">sink</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={throttlePct}
                      aria-label="Engine Throttle"
                      onChange={(e) => onSetThrottlePct(Number(e.target.value))}
                      className="w-28 accent-amber-400"
                    />
                    <span className="w-11 text-right text-base font-bold text-amber-300">
                      {throttlePct}%
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onMatchHover}
                    className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-sm font-semibold text-stone-100 hover:border-amber-400"
                  >
                    Hover
                  </button>
                  <button
                    type="button"
                    onClick={onCutoffEngine}
                    className="rounded-lg border border-rose-400/45 bg-rose-500/15 px-2.5 py-1 text-sm font-semibold text-rose-200 hover:bg-rose-500/25"
                  >
                    Cut
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSetGuidance(landing.guidanceMode === 'AUTOLAND' ? 'MANUAL' : 'AUTOLAND')
                    }
                    className={`rounded-lg px-3 py-1 text-sm font-bold ${
                      landing.guidanceMode === 'AUTOLAND'
                        ? 'bg-amber-500 text-stone-950'
                        : 'border border-white/15 bg-white/5 text-stone-100 hover:border-amber-400'
                    }`}
                  >
                    Auto-Land
                  </button>
                </div>
              )}
            </>
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
              W/Z
            </span>
            <span className="font-medium text-stone-200">Throttle</span>
          </button>
          <button
            type="button"
            data-hold-keys="left"
            className="inline-flex items-center gap-2 hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-sm font-bold text-white">
              A/D
            </span>
            <span className="font-medium text-stone-200">Tilt</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onSetGuidance(landing.guidanceMode === 'AUTOLAND' ? 'MANUAL' : 'AUTOLAND')
            }
            className="inline-flex items-center gap-2 hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-white/25 bg-white/10 px-1.5 py-0.5 text-sm font-bold text-white">
              G
            </span>
            <span className="font-medium text-stone-200">Auto-Land</span>
          </button>
        </div>
      </div>
    </div>
  );
}
