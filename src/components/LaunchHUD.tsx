import { Battery, Camera, Compass, Flame, Gauge, Orbit, Play, Rocket, Shield, Wind, X } from 'lucide-react';
import { LAUNCH_PART_DETAILS, PHYSICS } from '../game/constants';
import { PRE_LAUNCH_ITEMS, areAllPreLaunchChecksGo } from '../game/sequences';
import type {
  CameraMode,
  GameMenuTab,
  LaunchPhaseStage,
  LaunchState,
  LaunchTimeWarp,
  LeoTransferState,
  PreLaunchChecks,
  ResourceState,
} from '../game/types';

const LAUNCH_STAGE_META: Record<LaunchPhaseStage, { index: number; label: string }> = {
  PRE_LAUNCH: { index: 1, label: 'PRE-LAUNCH PAD CHECK' },
  SYSTEM_CHECK: { index: 2, label: 'SYSTEM & DELUGE CHECK' },
  ENGINE_IGNITION: { index: 3, label: 'RS-25 ENGINE IGNITION' },
  THRUST_BUILDUP: { index: 4, label: 'THRUST BUILDUP (HOLD-DOWN)' },
  LIFTOFF: { index: 5, label: 'LIFTOFF & TOWER CLEAR' },
  INITIAL_ASCENT: { index: 6, label: 'INITIAL VERTICAL ASCENT' },
  PITCH_PROGRAM: { index: 7, label: 'GRAVITY TURN PITCH PROGRAM' },
  MAX_Q: { index: 8, label: 'MAX-Q AERODYNAMIC PEAK' },
  BOOSTER_SEPARATION: { index: 9, label: 'SRB BOOSTER SEPARATION' },
  CORE_STAGE_SEPARATION: { index: 10, label: 'CORE STAGE MECO & SEP' },
  UPPER_STAGE_OPERATION: { index: 11, label: 'ICPS RL10B-2 ASCENT' },
  ORBITAL_INSERTION: { index: 12, label: 'SECO-1 ORBITAL INSERTION' },
  ORBIT_CONFIRMATION: { index: 13, label: '165 KM LEO PARK CONFIRMED' },
  SPACECRAFT_DEPLOYMENT: { index: 14, label: 'TRANSLUNAR INJECTION (TLI)' },
};

interface LaunchHUDProps {
  launch: LaunchState;
  preLaunchChecks: PreLaunchChecks;
  leoTransfer: LeoTransferState;
  resources: ResourceState;
  cameraMode?: CameraMode;
  userOrbitActive?: boolean;
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
  onChangeTimeWarp?: (warp: LaunchTimeWarp) => void;
  onSelectCameraMode?: (mode: CameraMode | 'free') => void;
  onSkipToSpace: () => void;
  onResetLaunch: () => void;
}

export function LaunchHUD({
  launch,
  preLaunchChecks,
  leoTransfer,
  resources,
  cameraMode = 'chase',
  userOrbitActive = false,
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
  onChangeTimeWarp,
  onSelectCameraMode,
  onSkipToSpace,
  onResetLaunch,
}: LaunchHUDProps) {
  const inspectedPart = selectedPartId ? LAUNCH_PART_DETAILS[selectedPartId] || null : null;
  const speedTotal = Math.round(Math.hypot(launch.verticalSpeedMs, launch.horizontalSpeedMs));
  const distToOrbitKm = Math.max(0, Math.round(PHYSICS.SLS_ORBIT_TARGET_KM - launch.altitudeKm));
  const orbitProgressPct = Math.min(
    100,
    Math.round((launch.altitudeKm / PHYSICS.SLS_ORBIT_TARGET_KM) * 100)
  );
  const fuelPctClamped = Math.max(0, Math.min(100, Math.round(launch.fuelPct)));
  const countdownDigit = Math.max(1, Math.ceil(launch.countdownSec));
  const allChecksGo = areAllPreLaunchChecksGo(preLaunchChecks);
  const doneCount = PRE_LAUNCH_ITEMS.filter((i) => preLaunchChecks[i.key]).length;
  const isIgnitedOrMoving =
    launch.launchSequence === 'ASCENDING' && (launch.ignited || speedTotal > 0);

  const effectiveStageKey: LaunchPhaseStage =
    launch.orbitReached && leoTransfer.tliBurnActive
      ? 'SPACECRAFT_DEPLOYMENT'
      : launch.phaseStage || 'PRE_LAUNCH';
  const stageMeta = LAUNCH_STAGE_META[effectiveStageKey] || LAUNCH_STAGE_META.PRE_LAUNCH;
  const activeTimeWarp: LaunchTimeWarp = launch.timeWarp ?? 1;

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
  } else if (
    launch.launchSequence === 'ASCENDING' &&
    launch.altitudeKm <= 0.001 &&
    launch.twr <= 1.0
  ) {
    objectiveLine = 'RS-25 thrust building — hold-down bolts release at TWR > 1.00.';
    counterText = `TWR ${launch.twr.toFixed(2)}`;
  } else if (launch.launchSequence === 'ASCENDING') {
    objectiveLine = 'Climb smoothly to 165 km parking orbit.';
    counterText = `${Math.round(launch.altitudeKm)} / 165 km`;
  } else if (launch.launchSequence === 'READY') {
    objectiveLine = 'Hold W or Space to ignite RS-25 engines.';
    counterText = 'GO';
  } else if (launch.launchSequence === 'COUNTDOWN') {
    objectiveLine = 'Water deluge active — engine ignition next.';
    counterText = `T-${countdownDigit}`;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 lg:p-5">
      {/* TOP ROW: Compact Edge-Hugging Objective (Left) & Meters + Always-Visible Propellant (Right) */}
      <div className="flex items-start justify-between gap-4">
        {/* GROUP 1: Top-Left Wordmark + Objective + 14-Stage Milestone + Altitude Progress */}
        <div data-testid="hud-group-objective" className="flex flex-col items-start gap-2.5">
          <div className="flex items-center gap-2.5 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path d="M16 4L27 27H21.5L16 15.5L10.5 27H5L16 4Z" fill="#FFFFFF" />
              <path d="M7 22C12 18 20 15 28 16.5" stroke="#22D3EE" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <div className="leading-none">
              <span className="block font-display text-xs font-extrabold tracking-[0.14em] text-white lg:text-sm">
                ARTEMIS
              </span>
              <span className="block font-display text-xs font-extrabold tracking-[0.14em] text-cyan-300 lg:text-sm">
                ODYSSEY
              </span>
            </div>
          </div>

          <section className="hud-soft pointer-events-auto w-[308px] rounded-2xl px-3.5 py-2.5 text-slate-100 lg:w-[340px]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-cyan-300 lg:text-sm">
                <span className="inline-block h-2 w-2 rotate-45 rounded-[2px] bg-cyan-400" />
                <span>LC-39B Ascent</span>
              </div>
              <span className="shrink-0 text-xs font-bold text-slate-200 tabular-nums lg:text-sm">
                {counterText}
              </span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-2 font-mono-tech text-[10px] font-bold tracking-wider uppercase">
              <span data-testid="launch-phase-stage" className="text-amber-300">
                STAGE {stageMeta.index}/14 · {stageMeta.label}
              </span>
              <span className="text-slate-400 tabular-nums">
                T+{launch.elapsed.toFixed(1)}s
              </span>
            </div>

            <p className="mt-1 text-xs leading-snug text-slate-200 lg:text-sm">{objectiveLine}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2 font-mono-tech text-[10px] font-semibold text-cyan-200/80">
              <span>
                {launch.orbitReached
                  ? 'RL10B-2 Orbital Transfer · SI Vis-Viva'
                  : `SCIENTIFIC SI · 120 Hz Δt · ${activeTimeWarp}× Warp`}
              </span>
              <span className="text-right tabular-nums">
                {launch.orbitReached
                  ? `Target ${(leoTransfer.targetVelocityKmS ?? 10.96).toFixed(2)} km/s · ${(leoTransfer.apoapsisKm ?? 165) >= 350000 ? 'TLI Escape' : `Apo ${leoTransfer.apoapsisKm ?? 165} km`}`
                  : `Target ${(launch.orbitalVelocityTargetMs / 1000).toFixed(2)} km/s`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-400 transition-all duration-200"
                style={{
                  width: `${launch.orbitReached ? Math.max(12, Math.round(leoTransfer.tliBurnProgressPct)) : orbitProgressPct}%`,
                }}
              />
            </div>
          </section>

          {inspectedPart && (
            <div
              data-testid="launch-part-callout"
              className="hud-soft pointer-events-auto w-[308px] rounded-2xl p-3 text-slate-100 lg:w-[340px]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-amber-300">{inspectedPart.name}</span>
                {onClearSelectedPart && (
                  <button
                    type="button"
                    aria-label="Close part note"
                    onClick={onClearSelectedPart}
                    className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-300">{inspectedPart.fact}</p>
            </div>
          )}
        </div>

        {/* GROUP 2: Top-Right 4 Core Telemetry Meters + Always-Visible Propellant Bar + Time Warp / Camera Bar */}
        <div data-testid="hud-group-meters" className="flex flex-col items-end gap-2">
          <div className="hud-soft pointer-events-auto flex items-center divide-x divide-sky-400/15 rounded-2xl px-3.5 py-2 tabular-nums">
            <div className="flex items-center gap-2 pr-3.5">
              <Battery className="h-4 w-4 text-amber-400 lg:h-5 lg:w-5" />
              <div>
                <span className="block text-sm leading-none font-bold text-white lg:text-base">
                  {Math.round(resources.power)}%
                </span>
                <span className="text-xs text-slate-400">Power</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5">
              <Wind className="h-4 w-4 text-sky-300 lg:h-5 lg:w-5" />
              <div>
                <span className="block text-sm leading-none font-bold text-white lg:text-base">
                  {Math.round(resources.oxygen)}%
                </span>
                <span className="text-xs text-slate-400">Air</span>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3.5">
              <Shield className="h-4 w-4 text-emerald-300 lg:h-5 lg:w-5" />
              <div>
                <span className="block text-sm leading-none font-bold text-white lg:text-base">
                  {Math.round(resources.shield)}%
                </span>
                <span className="text-xs text-slate-400">Shield</span>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-3.5">
              <Compass className="h-4 w-4 text-cyan-300 lg:h-5 lg:w-5" />
              <div>
                <span
                  data-testid="launch-altitude"
                  className="block text-sm leading-none font-bold text-white lg:text-base"
                >
                  {distToOrbitKm} km
                </span>
                <span className="text-xs text-slate-400">To Orbit</span>
              </div>
            </div>
          </div>

          {/* Always-visible compact Propellant readout + Time Warp + Camera controls */}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div
              data-testid="launch-propellant-status"
              className={`pointer-events-auto flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-semibold tabular-nums ${
                fuelPctClamped < 25 ? 'hud-soft-alert text-rose-200' : 'hud-soft text-slate-200'
              }`}
            >
              <Gauge className={`h-3.5 w-3.5 shrink-0 ${fuelPctClamped < 25 ? 'text-rose-300' : 'text-amber-300'}`} />
              <span className="whitespace-nowrap">Propellant</span>
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-150 ${
                    fuelPctClamped < 25
                      ? 'bg-rose-400'
                      : fuelPctClamped < 50
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                  }`}
                  style={{ width: `${fuelPctClamped}%` }}
                />
              </div>
              <span className="font-bold text-white">{fuelPctClamped}%</span>
            </div>

            {onChangeTimeWarp && (
              <div className="hud-soft pointer-events-auto flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold tabular-nums">
                <span className="px-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Warp
                </span>
                {([1, 2, 4] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    data-testid={`launch-warp-${w}x`}
                    onClick={() => onChangeTimeWarp(w)}
                    className={`rounded-lg px-2 py-0.5 text-xs font-bold transition ${
                      activeTimeWarp === w
                        ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {w}×
                  </button>
                ))}
              </div>
            )}

            {onSelectCameraMode && (
              <div className="hud-soft pointer-events-auto flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-semibold">
                <Camera className="mx-1 h-3.5 w-3.5 text-cyan-300" />
                {(
                  [
                    { id: 'chase', label: 'Chase' },
                    { id: 'cockpit', label: 'Hull' },
                    { id: 'overhead', label: 'Profile' },
                    { id: 'free', label: 'Orbit' },
                  ] as const
                ).map((cam) => {
                  const active =
                    cam.id === 'free'
                      ? userOrbitActive
                      : !userOrbitActive && cameraMode === cam.id;
                  return (
                    <button
                      key={cam.id}
                      type="button"
                      data-testid={`launch-cam-${cam.id}`}
                      onClick={() => onSelectCameraMode(cam.id)}
                      className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition ${
                        active
                          ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-400/60'
                          : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {cam.label}
                    </button>
                  );
                })}
              </div>
            )}

            {Math.abs(launch.pitchDeg) > 58 && !launch.orbitReached && (
              <span className="hud-soft-alert rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-rose-200 tabular-nums">
                Steep Pitch {Math.round(launch.pitchDeg)}°
              </span>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Compact Pitch Dial (Left), Action / Speed Bar (Center), 3-Hint Card (Right) */}
      <div className="flex items-end justify-between gap-4">
        {/* GROUP 3: Bottom-Left Circular Pitch Horizon Dial (Click -> Map / Menu) */}
        <button
          type="button"
          data-testid="hud-group-radar"
          onClick={() => onOpenMenuTab('map')}
          title="Open Ascent Map & Menu [Tab]"
          className="hud-soft pointer-events-auto relative h-28 w-28 shrink-0 rounded-full p-1 transition hover:border-sky-400/60 lg:h-[116px] lg:w-[116px]"
        >
          <svg viewBox="0 0 144 144" className="h-full w-full">
            <circle cx="72" cy="72" r="60" fill="#0b1222" stroke="rgba(56,189,248,0.28)" strokeWidth="1.5" />
            <line x1="20" y1="72" x2="124" y2="72" stroke="rgba(148,163,184,0.22)" strokeWidth="1" />
            <g transform={`translate(72, 72) rotate(${launch.pitchDeg})`}>
              <line x1="-24" y1="0" x2="24" y2="0" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
              <polygon points="0,-24 -5,-12 5,-12" fill="#fbbf24" />
            </g>
            <text x="72" y="114" textAnchor="middle" fontSize="12" fontWeight="700" fill="#f8fafc">
              {Math.round(launch.pitchDeg)}° PITCH
            </text>
          </svg>
        </button>

        {/* GROUP 5: Bottom-Center Sequence CTA / Stage Action / Speed & SI Diagnostics */}
        <div data-testid="hud-group-speed" className="flex flex-col items-center gap-2">
          {launch.launchSequence === 'PRE_SIM' && (
            <div
              data-testid="prelaunch-checklist-panel"
              className="hud-soft pointer-events-auto flex flex-col gap-2 rounded-2xl p-3 text-sm"
            >
              <div className="grid grid-cols-2 gap-1.5">
                {PRE_LAUNCH_ITEMS.map((item) => {
                  const checked = preLaunchChecks[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      data-testid={`prelaunch-chk-${item.key}`}
                      onClick={() => onTogglePreLaunchCheck(item.key)}
                      className={`rounded-xl border px-3 py-1.5 text-left text-xs font-semibold whitespace-nowrap transition ${
                        checked
                          ? 'border-cyan-400/75 bg-cyan-500/20 text-cyan-100'
                          : 'border-sky-400/20 bg-slate-900/75 text-slate-200 hover:border-cyan-300'
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
                className="hud-cta-cyan inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-bold whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-white" />
                {allChecksGo ? 'Begin Countdown' : 'Verify & Start'}
              </button>
            </div>
          )}

          {launch.launchSequence === 'COUNTDOWN' && (
            <div className="hud-soft rounded-2xl px-6 py-2.5 text-center">
              <div className="font-display text-3xl font-bold text-cyan-300 tabular-nums">
                T-{countdownDigit}
              </div>
              <div className="text-xs font-medium text-slate-200">Arming RS-25 Core</div>
            </div>
          )}

          {launch.launchSequence === 'READY' && (
            <button
              type="button"
              data-testid="start-launch-btn"
              data-hold-keys="forward"
              onClick={onStartLaunch}
              className="hud-cta-cyan pointer-events-auto inline-flex items-center gap-2 rounded-2xl px-6 py-2.5 text-base font-bold whitespace-nowrap"
            >
              <Rocket className="h-5 w-5 shrink-0" />
              Ignite &amp; Launch
            </button>
          )}

          {launch.orbitReached && (
            <div className="hud-soft pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-2.5">
              <Orbit className="h-5 w-5 shrink-0 text-cyan-300" />
              <div className="text-sm font-semibold whitespace-nowrap text-white tabular-nums">
                165 km Orbit · {leoTransfer.orbitalVelocityKmS.toFixed(2)} km/s ({Math.round(leoTransfer.tliBurnProgressPct)}%)
              </div>
              <button
                type="button"
                data-testid="fire-tli-btn"
                disabled={leoTransfer.tliBurnActive || leoTransfer.readyForSpaceTransition}
                onClick={onFireTliBurn}
                className="hud-cta-cyan inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-bold whitespace-nowrap disabled:opacity-60"
              >
                <Flame className="h-4 w-4 shrink-0" />
                {leoTransfer.tliBurnActive ? 'Firing TLI...' : 'Fire TLI Burn'}
              </button>
              <button
                type="button"
                data-testid="skip-tli-btn"
                onClick={onSkipToSpace}
                className="rounded-xl border border-sky-400/25 bg-slate-900/75 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-slate-300 transition hover:border-cyan-400 hover:text-white"
              >
                Enter LEO Orbit
              </button>
            </div>
          )}

          {!launch.orbitReached && launch.stagePrompt && launch.launchSequence === 'ASCENDING' && (
            <button
              type="button"
              onClick={onSeparateStage}
              className="pointer-events-auto rounded-2xl bg-amber-500 px-5 py-2 text-sm font-bold whitespace-nowrap text-slate-950 shadow-lg hover:bg-amber-400"
            >
              {launch.stagePrompt === 'SRB_SEP'
                ? 'Press Space: Drop Boosters'
                : 'Press Space: Stage Upper'}
            </button>
          )}

          {isIgnitedOrMoving && !launch.orbitReached && (
            <div className="hud-soft flex flex-wrap items-center justify-center gap-3 rounded-2xl px-4 py-2 font-mono-tech tabular-nums">
              <span data-testid="launch-speed" className="text-base font-bold text-white lg:text-lg">
                {speedTotal} m/s
              </span>
              <span className="h-4 w-px bg-white/15" />
              <span className="text-xs font-semibold text-cyan-200">
                TWR {launch.twr.toFixed(2)}
              </span>
              <span className="h-4 w-px bg-white/15" />
              <span className="text-xs font-semibold text-amber-300">
                q {Math.round(launch.dynamicPressureKpa)} kPa
              </span>
              <span className="h-4 w-px bg-white/15" />
              <span className="text-xs font-semibold text-slate-200">
                Mach {(launch.machNumber ?? 0).toFixed(2)}
              </span>
              <span className="h-4 w-px bg-white/15" />
              <span className="text-xs font-semibold text-slate-200">
                ṁ {Math.round(launch.massFlowRateKgS ?? 0)} kg/s
              </span>
              <span className="h-4 w-px bg-white/15" />
              <span className="text-xs font-semibold text-slate-200">
                Isp {launch.ispS}s
              </span>
              <span className="h-4 w-px bg-white/15" />
              <span className="text-xs font-semibold text-sky-200">
                Δv {launch.deltaVExpendedMs} m/s
              </span>
              <span className="h-4 w-px bg-white/15" />
              <span className="text-xs font-semibold text-emerald-300">
                Apo/Peri {launch.apoapsisKm}/{launch.periapsisKm} km
              </span>
            </div>
          )}
        </div>

        {/* GROUP 4: Bottom-Right Compact 3 Contextual Keyboard Hints */}
        <div
          data-testid="hud-group-hints"
          className="hud-soft pointer-events-auto flex shrink-0 items-center gap-3 rounded-2xl px-3.5 py-2 text-xs lg:text-sm"
        >
          <button
            type="button"
            onClick={onToggleAutoGuidance}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-sky-400/30 bg-slate-900/90 px-1.5 py-0.5 text-xs font-bold text-white">
              A/D
            </span>
            <span className="font-medium text-slate-200">
              {launch.autoGuidance ? 'Auto Pitch' : 'Manual Pitch'}
            </span>
          </button>
          <button
            type="button"
            onClick={launch.orbitReached ? onFireTliBurn : onSeparateStage}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-sky-400/30 bg-slate-900/90 px-1.5 py-0.5 text-xs font-bold text-white">
              Space
            </span>
            <span className="font-medium text-slate-200">
              {launch.orbitReached
                ? leoTransfer.tliBurnActive
                  ? 'Firing TLI'
                  : 'Fire TLI'
                : 'Stage'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => onOpenMenuTab('map')}
            title="Open Mission Menu (Double-click or R to Reset Pad)"
            onDoubleClick={onResetLaunch}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap hover:text-amber-300"
          >
            <span className="inline-flex min-w-7 items-center justify-center rounded-md border border-sky-400/30 bg-slate-900/90 px-1.5 py-0.5 text-xs font-bold text-white">
              Esc
            </span>
            <span className="font-medium text-slate-200">Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}

