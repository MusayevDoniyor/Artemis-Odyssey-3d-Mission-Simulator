import { Battery, Compass, Flame, Orbit, Play, Rocket, Shield, Wind, X } from 'lucide-react';
import { LAUNCH_PART_DETAILS, PHYSICS } from '../game/constants';
import { PRE_LAUNCH_ITEMS, areAllPreLaunchChecksGo } from '../game/sequences';
import type {
  GameMenuTab,
  LaunchState,
  LeoTransferState,
  PreLaunchChecks,
  ResourceState,
} from '../game/types';

interface LaunchHUDProps {
  launch: LaunchState;
  preLaunchChecks: PreLaunchChecks;
  leoTransfer: LeoTransferState;
  resources: ResourceState;
  selectedPartId?: string | null;
  onClearSelectedPart?: () => void;
  onOpenMenuTab: (tab: GameMenuTab) => void;
  onTogglePreLaunchCheck: (key: keyof PreLaunchChecks) => void;
  onVerifyAllPreLaunchChecks: () => void;
  onBeginSimulation: () => void;
  onStartLaunch: () => void;
  onSeparateStage: () => void;
  onFireTliBurn: () => void;
  onToggleAutoGuidance: () => void;
  onSkipToSpace: () => void;
  onResetLaunch: () => void;
}

export function LaunchHUD({
  launch,
  preLaunchChecks,
  leoTransfer,
  resources,
  selectedPartId,
  onClearSelectedPart,
  onOpenMenuTab,
  onTogglePreLaunchCheck,
  onVerifyAllPreLaunchChecks,
  onBeginSimulation,
  onStartLaunch,
  onSeparateStage,
  onFireTliBurn,
  onToggleAutoGuidance,
  onSkipToSpace,
  onResetLaunch,
}: LaunchHUDProps) {
  const inspectedPart = selectedPartId ? LAUNCH_PART_DETAILS[selectedPartId] || null : null;
  const speedTotal = Math.round(Math.hypot(launch.verticalSpeedMs, launch.horizontalSpeedMs));
  const distToOrbitKm = Math.max(0, Math.round(PHYSICS.SLS_ORBIT_TARGET_KM - launch.altitudeKm));
  const countdownDigit = Math.max(1, Math.ceil(launch.countdownSec));
  const allChecksGo = areAllPreLaunchChecksGo(preLaunchChecks);
  const doneCount = PRE_LAUNCH_ITEMS.filter((i) => preLaunchChecks[i.key]).length;
  const isMoving = launch.launchSequence === 'ASCENDING' && speedTotal > 2;

  let objectiveLine = 'Complete Pad 39B checks to begin launch.';
  let counterText = `${doneCount} / 4`;
  if (launch.orbitReached) {
    objectiveLine = 'Fire the RL10 engine for Lunar Transfer.';
    counterText = `${Math.round(leoTransfer.tliBurnProgressPct)}%`;
  } else if (launch.stagePrompt === 'SRB_SEP') {
    objectiveLine = 'Boosters empty — press Space to stage.';
    counterText = `${Math.round(launch.altitudeKm)} km`;
  } else if (launch.stagePrompt === 'CORE_SEP') {
    objectiveLine = 'Core cutoff — press Space for upper stage.';
    counterText = `${Math.round(launch.altitudeKm)} km`;
  } else if (launch.launchSequence === 'ASCENDING') {
    objectiveLine = 'Climb smoothly to 165 km parking orbit.';
    counterText = `${Math.round(launch.altitudeKm)} / 165`;
  } else if (launch.launchSequence === 'READY') {
    objectiveLine = 'Hold W or Space to ignite RS-25 engines.';
    counterText = 'GO';
  } else if (launch.launchSequence === 'COUNTDOWN') {
    objectiveLine = 'Water deluge active — engine ignition next.';
    counterText = `T-${countdownDigit}`;
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

          <section className="hud-soft pointer-events-auto max-w-xs rounded-2xl px-4 py-3 text-slate-100">
            <div className="flex items-center gap-2 text-base font-bold text-amber-400">
              <span className="inline-block h-2.5 w-2.5 rotate-45 rounded-[2px] bg-amber-400" />
              <span>LC-39B Ascent</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between gap-4">
              <p className="text-base leading-snug text-slate-100">{objectiveLine}</p>
              <span className="shrink-0 text-base font-bold text-slate-200 tabular-nums">
                {counterText}
              </span>
            </div>
          </section>

          {inspectedPart && (
            <div
              data-testid="launch-part-callout"
              className="hud-soft pointer-events-auto max-w-xs rounded-2xl p-3.5 text-slate-100"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold text-amber-300">{inspectedPart.name}</span>
                {onClearSelectedPart && (
                  <button
                    type="button"
                    aria-label="Close part note"
                    onClick={onClearSelectedPart}
                    className="rounded-lg p-1 text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-300">{inspectedPart.fact}</p>
            </div>
          )}
        </div>

        {/* GROUP 2: Top-Right 3 Meters + Orbit Distance (+ Conditional Fuel/Steep Chip) */}
        <div data-testid="hud-group-meters" className="flex flex-col items-end gap-2">
          <div className="hud-soft pointer-events-auto flex items-center divide-x divide-sky-400/15 rounded-2xl px-4 py-2.5 tabular-nums">
            <div className="flex items-center gap-2.5 pr-4">
              <Battery className="h-5 w-5 text-amber-400" />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {Math.round(resources.power)}%
                </span>
                <span className="text-sm text-slate-400">Power</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4">
              <Wind className="h-5 w-5 text-sky-300" />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {Math.round(resources.oxygen)}%
                </span>
                <span className="text-sm text-slate-400">Air</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 px-4">
              <Shield className="h-5 w-5 text-emerald-300" />
              <div>
                <span className="block text-lg leading-none font-bold text-white">
                  {Math.round(resources.shield)}%
                </span>
                <span className="text-sm text-slate-400">Shield</span>
              </div>
            </div>
            <div className="flex items-center gap-2.5 pl-4">
              <Compass className="h-5 w-5 text-amber-400" />
              <div>
                <span data-testid="launch-altitude" className="block text-lg leading-none font-bold text-white">
                  {distToOrbitKm} km
                </span>
                <span className="text-sm text-slate-400">To Orbit</span>
              </div>
            </div>
          </div>

          {(launch.fuelPct < 35 || Math.abs(launch.pitchDeg) > 58) && (
            <div className="flex gap-2">
              {launch.fuelPct < 35 && (
                <span className="hud-soft rounded-xl px-3 py-1.5 text-sm font-semibold text-amber-200">
                  Propellant {Math.round(launch.fuelPct)}%
                </span>
              )}
              {Math.abs(launch.pitchDeg) > 58 && (
                <span className="hud-soft-alert rounded-xl px-3 py-1.5 text-sm font-semibold text-rose-200">
                  Steep Pitch {Math.round(launch.pitchDeg)}°
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ROW: Group 3 (Circular Pitch Orb), Group 5 (Sequence/Speed), Group 4 (Hints) */}
      <div className="flex items-end justify-between gap-4">
        {/* GROUP 3: Bottom-Left Circular Pitch Horizon Dial (Click -> Menu) */}
        <button
          type="button"
          data-testid="hud-group-radar"
          onClick={() => onOpenMenuTab('map')}
          title="Open Ascent Map & Menu [Tab]"
          className="hud-soft pointer-events-auto relative h-36 w-36 shrink-0 rounded-full p-1 transition hover:border-sky-400/60"
        >
          <svg viewBox="0 0 144 144" className="h-full w-full">
            <circle cx="72" cy="72" r="60" fill="#0b1222" stroke="rgba(56,189,248,0.28)" strokeWidth="1.5" />
            <line x1="20" y1="72" x2="124" y2="72" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
            <g transform={`translate(72, 72) rotate(${launch.pitchDeg})`}>
              <line x1="-26" y1="0" x2="26" y2="0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
              <polygon points="0,-24 -5,-12 5,-12" fill="#fbbf24" />
            </g>
            <text x="72" y="114" textAnchor="middle" fontSize="12" fontWeight="700" fill="#f8fafc">
              {Math.round(launch.pitchDeg)}° PITCH
            </text>
          </svg>
        </button>

        {/* GROUP 5: Bottom-Center Sequence CTA / Speedometer */}
        <div data-testid="hud-group-speed" className="flex flex-col items-center gap-2.5">
          {launch.launchSequence === 'PRE_SIM' && (
            <div
              data-testid="prelaunch-checklist-panel"
              className="hud-soft pointer-events-auto flex flex-col gap-2.5 rounded-2xl p-4 text-base"
            >
              <div className="grid grid-cols-2 gap-2">
                {PRE_LAUNCH_ITEMS.map((item) => {
                  const checked = preLaunchChecks[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      data-testid={`prelaunch-chk-${item.key}`}
                      onClick={() => onTogglePreLaunchCheck(item.key)}
                      className={`rounded-xl border px-3 py-1.5 text-left text-sm font-semibold transition ${
                        checked
                          ? 'border-amber-400/60 bg-amber-500/20 text-amber-100'
                          : 'border-sky-400/20 bg-slate-900/75 text-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {item.label} · {checked ? 'GO' : 'CHK'}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                data-testid="begin-simulation-btn"
                onClick={() => {
                  if (!allChecksGo) onVerifyAllPreLaunchChecks();
                  onBeginSimulation();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-base font-bold text-slate-950 hover:bg-amber-400"
              >
                <Play className="h-4 w-4 fill-slate-950" />
                {allChecksGo ? 'Begin Countdown' : 'Verify & Start'}
              </button>
            </div>
          )}

          {launch.launchSequence === 'COUNTDOWN' && (
            <div className="hud-soft rounded-2xl px-8 py-3 text-center">
              <div className="text-4xl font-bold text-amber-400">T-{countdownDigit}</div>
              <div className="text-sm text-slate-200">Arming RS-25 Core</div>
            </div>
          )}

          {launch.launchSequence === 'READY' && (
            <button
              type="button"
              data-testid="start-launch-btn"
              data-hold-keys="forward"
              onClick={onStartLaunch}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-7 py-3 text-lg font-bold text-slate-950 shadow-lg hover:bg-amber-400"
            >
              <Rocket className="h-5 w-5" />
              Ignite &amp; Launch
            </button>
          )}

          {launch.orbitReached && (
            <div className="hud-soft pointer-events-auto flex items-center gap-3 rounded-2xl px-5 py-3">
              <Orbit className="h-5 w-5 text-amber-400" />
              <div className="text-base font-semibold text-white">
                165 km Orbit ({Math.round(leoTransfer.tliBurnProgressPct)}%)
              </div>
              <button
                type="button"
                data-testid="fire-tli-btn"
                disabled={leoTransfer.tliBurnActive || leoTransfer.readyForSpaceTransition}
                onClick={onFireTliBurn}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-base font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
              >
                <Flame className="h-4 w-4" />
                {leoTransfer.tliBurnActive ? 'Firing TLI...' : 'Fire TLI Burn'}
              </button>
            </div>
          )}

          {!launch.orbitReached && launch.stagePrompt && launch.launchSequence === 'ASCENDING' && (
            <button
              type="button"
              onClick={onSeparateStage}
              className="pointer-events-auto rounded-2xl bg-amber-500 px-6 py-2.5 text-base font-bold text-slate-950 shadow-lg hover:bg-amber-400"
            >
              {launch.stagePrompt === 'SRB_SEP'
                ? 'Press Space: Drop Boosters'
                : 'Press Space: Stage Upper'}
            </button>
          )}

          {isMoving && !launch.orbitReached && (
            <div className="hud-soft flex items-center gap-4 rounded-2xl px-5 py-2 tabular-nums">
              <span data-testid="launch-speed" className="text-2xl font-bold text-white">
                {speedTotal} m/s
              </span>
              <span className="text-base text-amber-300">
                {Math.round(launch.dynamicPressureKpa)} kPa
              </span>
            </div>
          )}
        </div>

        {/* GROUP 4: Bottom-Right Max 3 Contextual Hints */}
        <div
          data-testid="hud-group-hints"
          className="hud-soft pointer-events-auto flex items-center gap-3 rounded-2xl px-4 py-2.5 text-base"
        >
          <button
            type="button"
            onClick={onToggleAutoGuidance}
            className="inline-flex items-center gap-2 hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-sky-400/30 bg-slate-900/90 px-1.5 py-0.5 text-sm font-bold text-white">
              A/D
            </span>
            <span className="font-medium text-slate-200">
              {launch.autoGuidance ? 'Auto Pitch' : 'Manual Pitch'}
            </span>
          </button>
          <button
            type="button"
            onClick={launch.orbitReached ? onSkipToSpace : onSeparateStage}
            className="inline-flex items-center gap-2 hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-sky-400/30 bg-slate-900/90 px-1.5 py-0.5 text-sm font-bold text-white">
              Space
            </span>
            <span className="font-medium text-slate-200">
              {launch.orbitReached ? 'Skip Space' : 'Stage'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onOpenMenuTab('map')}
            title="Open Mission Menu (Press R to Reset Pad)"
            onDoubleClick={onResetLaunch}
            className="inline-flex items-center gap-2 hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-sky-400/30 bg-slate-900/90 px-1.5 py-0.5 text-sm font-bold text-white">
              Esc
            </span>
            <span className="font-medium text-slate-200">Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
