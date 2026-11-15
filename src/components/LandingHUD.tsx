import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Compass,
  FastForward,
  Flame,
  Pause,
  Radio,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PHYSICS, getLandingZones } from '../game/constants';
import { getLandingMissionProgress } from '../game/missionProgress';
import { getSurfaceTerrainHeight } from '../game/physics';
import { MARS_EDL_TIMELINE, POST_LANDING_UNSTOW_STEPS } from '../game/sequences';
import type {
  CameraMode,
  LandingGuidanceMode,
  LandingState,
  MarsEdlState,
  PostLandingUnstowState,
  ResourceState,
} from '../game/types';
import { getLandingWarnings } from '../game/warnings';
import { CameraViewControls } from './CameraViewControls';
import { MissionProgressBar } from './MissionProgressBar';
import { MissionTelemetryStrip } from './MissionTelemetryStrip';
import { MissionWarningBanner } from './MissionWarningBanner';

interface LandingHUDProps {
  landing: LandingState;
  marsEdl: MarsEdlState;
  unstow: PostLandingUnstowState | null;
  apollo1202Active: boolean;
  resources: ResourceState;
  isruFuelBonusPct: number;
  cameraMode: CameraMode;
  muted: boolean;
  onAckApollo1202: () => void;
  onFastForwardEdl: () => void;
  onSkipUnstow: () => void;
  onToggleMute: () => void;
  onPause: () => void;
  onCycleCamera: () => void;
  onSelectZone: (id: number) => void;
  onSetGuidance: (mode: LandingGuidanceMode) => void;
  onSetThrottlePct: (pct: number) => void;
  onCutoffEngine: () => void;
  onMatchHover: () => void;
  onToggleAutoCutoff: () => void;
  onSetCameraPreset: (yaw: number, pitch: number) => void;
  onZoomCamera: (delta: number) => void;
  onResetCamera: () => void;
}

export function LandingHUD({
  landing,
  marsEdl,
  unstow,
  apollo1202Active,
  resources,
  isruFuelBonusPct,
  cameraMode,
  muted,
  onAckApollo1202,
  onFastForwardEdl,
  onSkipUnstow,
  onToggleMute,
  onPause,
  onCycleCamera,
  onSelectZone,
  onSetGuidance,
  onSetThrottlePct,
  onCutoffEngine,
  onMatchHover,
  onToggleAutoCutoff,
  onSetCameraPreset,
  onZoomCamera,
  onResetCamera,
}: LandingHUDProps) {
  const zones = getLandingZones(landing.planet);
  const groundH = getSurfaceTerrainHeight(landing.planet, landing.x, landing.z);
  const altM = Math.max(0, landing.y - groundH);
  const descentSpeed = Math.abs(landing.vy);
  const horizDrift = Math.hypot(landing.vx, landing.vz);
  const activeZone = zones[landing.targetZoneId] || zones[0];
  const isMars = landing.planet === 'mars';
  const throttlePct = Math.round(landing.throttle * 100);
  const targetPct = Math.round(landing.targetThrottle * 100);

  const vyColor =
    descentSpeed <= PHYSICS.LANDER_PERFECT_VY
      ? 'text-emerald-300'
      : descentSpeed <= PHYSICS.LANDER_HARD_VY
        ? 'text-amber-300'
        : 'text-rose-400';

  const twrColor =
    landing.twr >= 1.1
      ? 'text-emerald-300'
      : landing.twr >= 0.85
        ? 'text-amber-300'
        : 'text-rose-300';

  const slopeColor =
    landing.slopeDeg <= 10
      ? 'text-emerald-300'
      : landing.slopeDeg <= 15
        ? 'text-amber-300'
        : 'text-rose-400';

  const relX = Math.max(-45, Math.min(45, landing.x - activeZone.x));
  const relZ = Math.max(-45, Math.min(45, landing.z - activeZone.z));
  const predRelX = Math.max(-45, Math.min(45, landing.predX - activeZone.x));
  const predRelZ = Math.max(-45, Math.min(45, landing.predZ - activeZone.z));
  const missionProgress = getLandingMissionProgress(landing);

  const activeEdlSpec = MARS_EDL_TIMELINE.find((s) => s.id === marsEdl.stage) || MARS_EDL_TIMELINE[0];
  const activeUnstowSpec =
    unstow && unstow.active
      ? POST_LANDING_UNSTOW_STEPS.find((s) => s.id === unstow.stage) || POST_LANDING_UNSTOW_STEPS[0]
      : null;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      <div className="flex flex-col gap-2">
        <MissionProgressBar info={missionProgress} />
        <MissionTelemetryStrip
          context={
            unstow?.active
              ? 'unstow'
              : isMars && marsEdl.active
                ? 'mars-edl'
                : 'moon-landing'
          }
          elapsedSec={landing.tGoSec + (unstow?.stageElapsedSec ?? 0)}
          phaseLabel={
            unstow?.active
              ? 'POST-LANDING UNSTOW'
              : isMars && marsEdl.active
                ? `MARS EDL · ${marsEdl.stage}`
                : `${isMars ? 'MARS' : 'MOON'} ${landing.descentPhase}`
          }
          nextMilestone={
            unstow?.active
              ? activeUnstowSpec?.title ?? 'Rover Deploy'
              : isMars && marsEdl.active
                ? activeEdlSpec.title
                : activeZone.name
          }
          etaLabel={
            unstow?.active
              ? `${Math.round(unstow.totalProgressPct)}%`
              : `${Math.max(1, Math.round(landing.tGoSec))}s`
          }
          metrics={[
            { label: 'Alt', value: `${altM.toFixed(1)} m`, tone: 'white' },
            { label: 'Sink', value: `${descentSpeed.toFixed(1)} m/s`, tone: descentSpeed > 3.8 ? 'amber' : 'emerald' },
            { label: 'Lag', value: isMars ? '14 min' : '1.3 s', tone: 'cyan' },
          ]}
        />
        <MissionWarningBanner warnings={getLandingWarnings(landing, resources)} />

        {/* Apollo 1202 Program Alarm Caution (Moon Descent) */}
        {apollo1202Active && (
          <div
            data-testid="apollo-1202-banner"
            className="hud-panel-amber tactical-frame pointer-events-auto mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-xl px-4 py-2 text-xs"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <div>
                <span className="font-display font-bold text-amber-300 uppercase">
                  MASTER ALARM 1202 · EXECUTIVE OVERFLOW
                </span>
                <p className="text-[11px] text-slate-100">
                  Real Apollo 11 computer overload! Priority scheduling protects engine guidance—acknowledge to clear warning.
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="ack-1202-btn"
              onClick={onAckApollo1202}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 font-hud text-xs font-bold text-slate-950 uppercase hover:bg-amber-400"
            >
              Ack &amp; Clear
            </button>
          </div>
        )}

        {/* Mars 7-Min EDL Live Stage Strip + Plasma Comms Blackout */}
        {isMars && marsEdl.active && !unstow?.active && (
          <div
            data-testid="mars-edl-banner"
            className="hud-panel pointer-events-auto mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 rounded-xl border-orange-400/50 px-4 py-2 text-xs"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded bg-orange-500/20 px-2 py-0.5 font-display text-[11px] font-bold text-orange-300 uppercase">
                7-Min EDL · {activeEdlSpec.title}
              </span>
              <span className="font-mono-tech text-[11px] text-cyan-300">
                {activeEdlSpec.altWindowLabel} · {activeEdlSpec.speedLabel}
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono-tech text-[10px] font-bold uppercase ${
                  marsEdl.commsBlackout
                    ? 'bg-rose-500/25 text-rose-200'
                    : 'bg-slate-800 text-amber-300'
                }`}
              >
                <Radio className="h-3 w-3" />
                {marsEdl.commsBlackout ? 'PLASMA COMMS BLACKOUT' : `14-MIN LIGHT-TIME LAG`}
              </span>
            </div>
            <button
              type="button"
              data-testid="fast-forward-edl-btn"
              onClick={onFastForwardEdl}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/50 bg-slate-900 px-2.5 py-1 font-hud text-[11px] font-bold text-cyan-200 uppercase hover:border-cyan-300"
            >
              <FastForward className="h-3 w-3" />
              Skip to Terminal
            </button>
          </div>
        )}

        {/* Top Perimeter Telemetry + Zone Selector */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="hud-panel pointer-events-auto flex flex-wrap items-center gap-3.5 rounded-xl px-3.5 py-2 text-xs tabular-nums">
            <div>
              <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                {isMars ? 'MARS · 0.38g EDL' : 'MOON · 0.165g EDL'}
              </span>
              <span
                className={`font-display text-sm font-bold ${
                  landing.descentPhase === 'TERMINAL'
                    ? 'text-emerald-300'
                    : landing.descentPhase === 'APPROACH'
                      ? 'text-cyan-300'
                      : 'text-amber-300'
                }`}
              >
                {landing.descentPhase}
              </span>
            </div>
            <div>
              <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                Radar Alt
              </span>
              <span className="font-mono-tech text-base font-bold text-white">{altM.toFixed(1)} m</span>
            </div>
            <div>
              <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                Sink (&lt;2.5 safe)
              </span>
              <span className={`font-mono-tech text-base font-bold ${vyColor}`}>
                {descentSpeed.toFixed(1)} m/s
              </span>
            </div>
            <div>
              <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                Lat Drift
              </span>
              <span className="font-mono-tech text-base font-bold text-cyan-300">
                {horizDrift.toFixed(1)} m/s
              </span>
            </div>
            <div>
              <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                Propellant {isruFuelBonusPct > 0 ? `(+${isruFuelBonusPct}% ISRU)` : ''}
              </span>
              <span className="font-mono-tech text-base font-bold text-emerald-300">
                {Math.round(landing.fuelPct)}%
              </span>
            </div>
            <div>
              <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                Thrust / TWR
              </span>
              <span className={`font-mono-tech text-base font-bold ${twrColor}`}>
                {landing.thrustKn.toFixed(1)} kN · {landing.twr.toFixed(2)}×
              </span>
            </div>
            <div>
              <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                Slope / T-Go
              </span>
              <span className={`font-mono-tech text-sm font-bold ${slopeColor}`}>
                {landing.slopeDeg.toFixed(1)}°{' '}
                <span className="text-slate-300">· {landing.tGoSec.toFixed(0)}s</span>
              </span>
            </div>
            <div>
              <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                {isMars ? 'Gates / Wind' : 'Approach Gates'}
              </span>
              <span className="font-mono-tech text-sm font-bold text-cyan-300">
                {landing.gatesPassed}/4
                {isMars ? (
                  <span className="text-orange-300"> · {landing.windSpeedMs.toFixed(1)}m/s</span>
                ) : null}
              </span>
            </div>
          </div>

          {/* Landing Zones + Predictive Impact Radar + Utility Buttons */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-start gap-2.5">
              <div className="hud-panel pointer-events-auto flex items-center gap-2 rounded-xl p-2">
                <div
                  className="relative h-12 w-12 shrink-0 rounded-full border border-cyan-400/50 bg-slate-950"
                  title="Target Pad (Center) · Amber = Lander · Yellow Ring = Predicted Impact"
                >
                  <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-400/70" />
                  <div
                    className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-300 bg-yellow-300/20"
                    style={{
                      left: `${50 + (predRelX / 45) * 42}%`,
                      top: `${50 + (predRelZ / 45) * 42}%`,
                    }}
                  />
                  <div
                    className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400"
                    style={{
                      left: `${50 + (relX / 45) * 42}%`,
                      top: `${50 + (relZ / 45) * 42}%`,
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1 font-hud text-[10px] font-bold text-cyan-300 uppercase">
                    <Compass className="h-3 w-3" />
                    {activeZone.name} ({Math.round(landing.distToPad)}m)
                  </div>
                  <div className="flex gap-1">
                    {zones.map((z) => (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => onSelectZone(z.id)}
                        className={`rounded px-2 py-1 font-hud text-[11px] font-bold whitespace-nowrap transition ${
                          landing.targetZoneId === z.id
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        [{z.id + 1}] {z.code.replace('PAD ', '').replace('ZONE ', '')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onCycleCamera}
                className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-hud text-xs font-bold whitespace-nowrap text-slate-200 hover:border-cyan-400"
              >
                <Camera className="h-4 w-4 text-cyan-300" />
                <span className="capitalize">{cameraMode}</span>
                <span className="keycap">C</span>
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-cyan-400"
              >
                {muted ? (
                  <VolumeX className="h-4 w-4 text-slate-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-cyan-300" />
                )}
              </button>

              <button
                type="button"
                onClick={onPause}
                className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-cyan-400"
              >
                <Pause className="h-4 w-4" />
              </button>
            </div>

            <CameraViewControls
              compact
              onSelectPreset={onSetCameraPreset}
              onZoom={onZoomCamera}
              onReset={onResetCamera}
            />
          </div>
        </div>
      </div>

      {/* Post-Landing Sequential Unstow Checklist OR Engine Console */}
      {unstow?.active ? (
        <div className="mx-auto mb-2 w-full max-w-2xl">
          <div
            data-testid="post-landing-unstow-panel"
            className="hud-panel-success tactical-frame pointer-events-auto rounded-2xl p-4 text-xs"
          >
            <div className="mb-2 flex items-center justify-between gap-2 border-b border-emerald-400/25 pb-2">
              <div>
                <h2 className="font-display text-sm font-bold text-emerald-300 uppercase">
                  Touchdown Confirmed — Sequential Post-Landing Unstow
                </h2>
                <p className="text-[11px] text-slate-200">
                  Nothing teleports: engine cools, cargo bay unlocks ramp, and rover deploys its rocker-bogie wheels onto the surface.
                </p>
              </div>
              <button
                type="button"
                data-testid="skip-unstow-btn"
                onClick={onSkipUnstow}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-400/50 bg-slate-900 px-3 py-1.5 font-hud text-xs font-bold text-emerald-200 uppercase hover:border-emerald-300"
              >
                <FastForward className="h-3.5 w-3.5" />
                Fast-Forward
              </button>
            </div>

            <div className="space-y-1.5">
              {POST_LANDING_UNSTOW_STEPS.map((step, i) => {
                const curIdx = POST_LANDING_UNSTOW_STEPS.findIndex((s) => s.id === unstow.stage);
                const done = i < curIdx || unstow.completed;
                const active = i === curIdx && !unstow.completed;
                return (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5 ${
                      done
                        ? 'border-emerald-400/40 bg-emerald-950/60 text-emerald-200'
                        : active
                          ? 'border-amber-400/70 bg-amber-500/15 text-white'
                          : 'border-slate-800 bg-slate-900/80 text-slate-500'
                    }`}
                  >
                    <div>
                      <div className="font-hud font-bold">{step.title}</div>
                      {active && <p className="text-[10px] text-slate-200">{step.explanation}</p>}
                    </div>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : active ? (
                      <span className="font-mono-tech text-[10px] font-bold text-amber-300">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="font-mono-tech text-[10px]">WAIT</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
      /* Contact Light + NASA DPS / MLE Engine Pressure Console & Attitude Bar */
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2">
        {landing.contactLight && !landing.landed && (
          <div className="rounded-lg border border-cyan-300 bg-cyan-400 px-4 py-1 font-display text-xs font-bold tracking-wider text-slate-950 uppercase shadow-lg">
            CONTACT LIGHT · {landing.autoCutoff ? 'AUTO-CUTOFF ARMED' : 'PRESS [X] TO CUT ENGINE'}
          </div>
        )}

        {/* Engine Chamber Pressure Bar + Quick Presets */}
        <div className="hud-panel pointer-events-auto flex w-full flex-wrap items-center justify-between gap-2.5 rounded-xl px-4 py-2 text-xs tabular-nums">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-amber-400" />
            <div>
              <span className="block font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {isMars ? 'MLE Chamber Pressure' : 'LMDE Pintle Throttle'}
              </span>
              <span className="font-mono-tech text-sm font-bold text-amber-300">
                {throttlePct}%{' '}
                <span className="text-[11px] font-normal text-slate-400">
                  (Cmd {targetPct}% · Hover {landing.hoverThrottlePct}%)
                </span>
              </span>
            </div>
          </div>

          {/* Interactive Throttle Bar with Hover Marker */}
          <div className="relative flex min-w-[170px] flex-1 items-center gap-2">
            <div className="relative flex-1">
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="absolute top-0 z-10 h-full w-0.5 bg-emerald-300"
                  style={{ left: `${landing.hoverThrottlePct}%` }}
                  title={`Hover Equilibrium: ${landing.hoverThrottlePct}%`}
                />
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-orange-500 transition-all"
                  style={{ width: `${throttlePct}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={throttlePct}
                aria-label="Engine Chamber Throttle Percentage"
                onChange={(e) => onSetThrottlePct(Number(e.target.value))}
                className="absolute inset-0 h-2.5 w-full cursor-pointer opacity-0"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onSetThrottlePct(Math.max(0, targetPct - 5))}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono-tech text-[11px] font-bold text-slate-200 hover:border-cyan-400"
              title="Decrease throttle 5%"
            >
              -5%
            </button>
            <button
              type="button"
              onClick={() => onSetThrottlePct(Math.min(100, targetPct + 5))}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono-tech text-[11px] font-bold text-slate-200 hover:border-cyan-400"
              title="Increase throttle 5%"
            >
              +5%
            </button>
            <button
              type="button"
              onClick={onCutoffEngine}
              className="rounded-md border border-rose-400/50 bg-rose-500/15 px-2.5 py-1 font-hud text-[11px] font-bold whitespace-nowrap text-rose-200 uppercase hover:bg-rose-500/25"
            >
              Cut 0% [X]
            </button>
            <button
              type="button"
              onClick={() => onSetThrottlePct(10)}
              className="rounded-md border border-cyan-500/35 bg-slate-900 px-2.5 py-1 font-hud text-[11px] font-bold whitespace-nowrap text-cyan-200 uppercase hover:border-cyan-400"
            >
              Idle 10%
            </button>
            <button
              type="button"
              onClick={onMatchHover}
              className="rounded-md border border-emerald-400/50 bg-emerald-500/15 px-2.5 py-1 font-hud text-[11px] font-bold whitespace-nowrap text-emerald-200 uppercase hover:bg-emerald-500/25"
            >
              Hover {landing.hoverThrottlePct}% [H]
            </button>
            <button
              type="button"
              onClick={() => onSetThrottlePct(100)}
              className="rounded-md border border-amber-400/50 bg-amber-500/20 px-2.5 py-1 font-hud text-[11px] font-bold whitespace-nowrap text-amber-200 uppercase hover:bg-amber-500/30"
            >
              Max 100%
            </button>
            <button
              type="button"
              onClick={onToggleAutoCutoff}
              className={`rounded-md px-2.5 py-1 font-hud text-[11px] font-bold whitespace-nowrap uppercase ${
                landing.autoCutoff
                  ? 'border border-cyan-400/60 bg-cyan-500/20 text-cyan-200'
                  : 'border border-slate-700 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
              title="Apollo Contact Light Automatic Engine Stop"
            >
              Auto-Cut [K]
            </button>
          </div>
        </div>

        {/* Attitude & Guidance Controls (single crisp row at 1440px) */}
        <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px]">
          <button
            type="button"
            data-hold-keys="forward"
            className="rounded-lg bg-amber-500 px-2.5 py-1.5 font-display text-[11px] font-bold whitespace-nowrap text-slate-950 uppercase hover:bg-amber-400"
          >
            Thrust + <span className="keycap ml-1">W</span>
          </button>
          <button
            type="button"
            data-hold-keys="throttleDown"
            className="rounded-lg border border-cyan-500/35 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            Thrust − <span className="keycap ml-1">Z</span>
          </button>
          <button
            type="button"
            data-hold-keys="action"
            className="rounded-lg border border-amber-400/60 bg-amber-500/20 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-amber-200 hover:bg-amber-500/30"
          >
            Max Brake <span className="keycap ml-1">SPACE</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            data-hold-keys="left"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            <span className="keycap mr-1">A</span>Left
          </button>
          <button
            type="button"
            data-hold-keys="right"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            Right<span className="keycap ml-1">D</span>
          </button>
          <button
            type="button"
            data-hold-keys="backward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            Back<span className="keycap ml-1">S</span>
          </button>
          <button
            type="button"
            data-hold-keys="tiltForward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-slate-100 hover:border-cyan-400"
          >
            Fwd<span className="keycap ml-1">Q</span>
          </button>
          <button
            type="button"
            data-hold-keys="killDrift"
            className="rounded-lg border border-sky-400/50 bg-sky-500/15 px-2.5 py-1.5 font-hud font-bold whitespace-nowrap text-sky-200 hover:bg-sky-500/25"
            title="Hold [B] to fire lateral RCS thrusters and zero horizontal drift"
          >
            Kill Drift <span className="keycap ml-1">B</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            onClick={() =>
              onSetGuidance(landing.guidanceMode === 'RATE_ASSIST' ? 'MANUAL' : 'RATE_ASSIST')
            }
            className={`rounded-lg px-2.5 py-1.5 font-hud font-bold whitespace-nowrap ${
              landing.guidanceMode === 'RATE_ASSIST'
                ? 'bg-cyan-400 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400'
            }`}
          >
            Hover Assist
          </button>
          <button
            type="button"
            onClick={() =>
              onSetGuidance(landing.guidanceMode === 'AUTOLAND' ? 'MANUAL' : 'AUTOLAND')
            }
            className={`rounded-lg px-2.5 py-1.5 font-hud font-bold whitespace-nowrap ${
              landing.guidanceMode === 'AUTOLAND'
                ? 'bg-emerald-400 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-400'
            }`}
          >
            Auto-Land <span className="keycap ml-1">G</span>
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
