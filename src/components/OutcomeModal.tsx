import { ArrowRight, Play, RotateCcw } from 'lucide-react';
import { CAMPAIGN_MISSIONS, PHYSICS } from '../game/constants';
import type {
  CampaignCarryoverState,
  CrashFxState,
  ResourceState,
  RoverObjective,
  SurfacePlanet,
} from '../game/types';

export interface FailTelemetrySummary {
  crashKind: CrashFxState['kind'];
  planet: SurfacePlanet;
  descentMs: number;
  tiltDeg: number;
}

interface OutcomeModalProps {
  mode: 'pause' | 'discovery' | 'gameover' | 'victory';
  reason?: string;
  score: number;
  resources: ResourceState;
  carryover?: CampaignCarryoverState;
  nextMissionLabel?: string | null;
  discoveryObjective?: RoverObjective | null;
  failTelemetry?: FailTelemetrySummary;
  onResume?: () => void;
  onNextMission?: () => void;
  onRetry: () => void;
  onBackToTitle: () => void;
}

function getRecoveryTip(fail?: FailTelemetrySummary): string {
  if (!fail) {
    return 'Check power, O₂, and shield margins before next burn.';
  }
  if (fail.crashKind === 'landing') {
    if (fail.planet === 'mars') {
      return 'Mars 0.38g: start braking by 65 m AGL or press [G] Auto-Land.';
    }
    return 'Hold sink under 4.5 m/s and level tilt within 12° at contact.';
  }
  if (fail.crashKind === 'space') {
    return 'Enable Storm Shield inside the flare ring or steer wide.';
  }
  return 'Sample ice/MOXIE early, dim lights on ridges, clear Mars dust.';
}

function ResourceGaugeStrip({ resources }: { resources: ResourceState }) {
  const items = [
    {
      label: 'Power Bus',
      val: Math.round(resources.power),
      bar: 'bg-amber-400',
      text: 'text-amber-300',
    },
    {
      label: 'O₂ Reserve',
      val: Math.round(resources.oxygen),
      bar: 'bg-cyan-400',
      text: 'text-cyan-300',
    },
    {
      label: 'Rad Shield',
      val: Math.round(resources.shield),
      bar: 'bg-emerald-400',
      text: 'text-emerald-300',
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-xl border border-cyan-500/20 bg-slate-950/80 p-3 text-left text-xs">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-1">
            <span className="font-hud text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              {item.label}
            </span>
            <span className={`font-mono-tech text-xs font-bold ${item.text}`}>{item.val}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all ${item.val <= 15 ? 'bg-rose-500' : item.bar}`}
              style={{ width: `${Math.max(4, item.val)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function OutcomeModal({
  mode,
  reason,
  score,
  resources,
  carryover,
  nextMissionLabel,
  discoveryObjective,
  failTelemetry,
  onResume,
  onNextMission,
  onRetry,
  onBackToTitle,
}: OutcomeModalProps) {
  if (mode === 'discovery' && discoveryObjective) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/86 p-4 backdrop-blur-md">
        <div className="hud-panel tactical-frame animate-modal-enter w-full max-w-lg rounded-2xl p-6">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-cyan-500/20 pb-2.5">
            <span className="font-hud text-[11px] font-bold tracking-[0.16em] text-emerald-300 uppercase">
              SPECIMEN LOGGED · LEDGER UPDATED
            </span>
            <span className="font-mono-tech text-[11px] font-bold text-cyan-300">+800 PTS</span>
          </div>

          <h2 className="font-display text-2xl font-bold text-white">{discoveryObjective.title}</h2>
          <p className="mt-1.5 font-hud text-xs font-bold tracking-wide text-amber-300 uppercase">
            {discoveryObjective.rewardText}
          </p>

          <div className="mt-3.5 rounded-xl border border-cyan-500/25 bg-slate-950/80 p-3.5 text-sm leading-relaxed text-slate-100">
            {discoveryObjective.nasaFact}
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 font-display text-xs font-bold tracking-wider whitespace-nowrap text-slate-950 uppercase transition hover:bg-cyan-300"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              Resume
            </button>
          </div>
        </div>
      </div>
    );
  }

  const missionSpec = carryover ? CAMPAIGN_MISSIONS[carryover.activeMission] : null;
  const panelClass =
    mode === 'gameover'
      ? 'hud-panel-danger tactical-frame-danger'
      : mode === 'victory'
        ? 'hud-panel-success tactical-frame'
        : 'hud-panel tactical-frame';

  const abortCode =
    failTelemetry?.crashKind === 'space'
      ? 'ERR // CME-RAD-BREACH'
      : failTelemetry?.crashKind === 'rover'
        ? 'ERR // HAB-LIFE-SUPPORT'
        : failTelemetry?.planet === 'mars'
          ? 'ERR // MARS-EDL-IMPACT'
          : 'ERR // LUNAR-EDL-IMPACT';

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/86 p-4 backdrop-blur-md">
      <div className={`${panelClass} animate-modal-enter w-full max-w-xl rounded-2xl p-6`}>
        {mode === 'pause' && (
          <div className="text-center">
            <p className="font-hud text-[11px] font-bold tracking-[0.2em] text-cyan-300 uppercase">
              Houston Telemetry Hold
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-wide text-white uppercase">
              Flight Hold Active
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Thrusters and avionics frozen at current state vector.
            </p>
          </div>
        )}

        {mode === 'gameover' && (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-rose-500/30 pb-2.5">
              <span className="inline-flex items-center gap-2 font-mono-tech text-[11px] font-bold tracking-wider text-rose-300 uppercase">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                {abortCode}
              </span>
              <span className="rounded border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 font-hud text-[10px] font-bold tracking-wider text-rose-200 uppercase">
                {failTelemetry?.planet === 'mars'
                  ? 'Mars Jezero · 0.38g'
                  : failTelemetry?.crashKind === 'space'
                    ? 'Deep Space Transit'
                    : 'Moon South Pole · 0.165g'}
              </span>
            </div>

            <div>
              <h2 className="font-display text-2xl font-bold tracking-wide text-white uppercase">
                Mission Abort
              </h2>
              <p className="mt-1 text-sm text-rose-100">
                {reason || 'Vehicle structural or life-support limit exceeded.'}
              </p>
            </div>

            {failTelemetry?.crashKind === 'landing' && (
              <div className="mt-3.5 grid grid-cols-2 gap-2.5 rounded-xl border border-rose-500/25 bg-slate-950/75 p-3 text-xs">
                <div>
                  <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                    Impact Sink Rate
                  </span>
                  <span className="font-mono-tech text-base font-bold text-rose-300">
                    {failTelemetry.descentMs.toFixed(1)} m/s
                  </span>
                  <span className="ml-1.5 font-mono-tech text-[10px] text-slate-400">
                    (MAX {PHYSICS.LANDER_HARD_VY.toFixed(1)})
                  </span>
                </div>
                <div>
                  <span className="block font-hud text-[10px] font-bold text-slate-400 uppercase">
                    Touchdown Tilt
                  </span>
                  <span className="font-mono-tech text-base font-bold text-amber-300">
                    {failTelemetry.tiltDeg.toFixed(1)}°
                  </span>
                  <span className="ml-1.5 font-mono-tech text-[10px] text-slate-400">
                    (MAX {PHYSICS.LANDER_HARD_TILT}°)
                  </span>
                </div>
              </div>
            )}

            <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-100">
              <span className="font-hud font-bold tracking-wider text-amber-300 uppercase">
                Flight Director Fix:{' '}
              </span>
              {getRecoveryTip(failTelemetry)}
            </div>
          </div>
        )}

        {mode === 'victory' && (
          <div className="text-center">
            <p className="font-hud text-[11px] font-bold tracking-[0.2em] text-emerald-300 uppercase">
              Objectives Verified
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-wide text-white uppercase">
              {missionSpec ? `${missionSpec.code} Complete` : 'Mission Complete'}
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              {missionSpec?.reuseOutput || 'Outpost power, O₂, and shielding balanced.'}
            </p>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-400/40 bg-amber-500/12 px-5 py-3">
              <span className="font-hud text-xs font-bold tracking-wider text-amber-300 uppercase">
                Flight Readiness Score
              </span>
              <span className="font-mono-tech text-3xl font-bold text-white">{score}</span>
            </div>
          </div>
        )}

        <ResourceGaugeStrip resources={resources} />

        {mode === 'victory' && carryover && (
          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-center text-[11px]">
            <div>
              <span className="block font-hud text-[9px] font-bold text-slate-300 uppercase">
                HERMES Sat
              </span>
              <span className="font-mono-tech font-bold text-emerald-300">
                {carryover.relaySatelliteOnline ? 'ONLINE' : 'STOWED'}
              </span>
            </div>
            <div>
              <span className="block font-hud text-[9px] font-bold text-slate-300 uppercase">
                ISRU H₂O
              </span>
              <span className="font-mono-tech font-bold text-cyan-300">
                {carryover.isruWaterKg}kg
              </span>
            </div>
            <div>
              <span className="block font-hud text-[9px] font-bold text-slate-300 uppercase">
                Fuel Bonus
              </span>
              <span className="font-mono-tech font-bold text-amber-300">
                +{carryover.isruFuelBonusPct}%
              </span>
            </div>
            <div>
              <span className="block font-hud text-[9px] font-bold text-slate-300 uppercase">
                Crew Dose
              </span>
              <span className="font-mono-tech font-bold text-white">
                {carryover.radiationDoseMsv}mSv
              </span>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-2.5">
          {mode === 'pause' && onResume && (
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 font-display text-xs font-bold tracking-wider whitespace-nowrap text-slate-950 uppercase transition hover:bg-cyan-300"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              Resume
            </button>
          )}
          {mode === 'victory' && onNextMission && nextMissionLabel && (
            <button
              type="button"
              data-testid="next-mission-btn"
              onClick={onNextMission}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-2.5 font-display text-xs font-bold tracking-wider whitespace-nowrap text-slate-950 uppercase transition hover:bg-emerald-300"
            >
              {nextMissionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            data-start={mode === 'victory' || mode === 'gameover' ? 'true' : undefined}
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-display text-xs font-bold tracking-wider whitespace-nowrap text-slate-950 uppercase transition hover:bg-amber-400"
          >
            <RotateCcw className="h-4 w-4" />
            {mode === 'pause' ? 'Restart Stage' : 'Replay Mission'}
          </button>
          <button
            type="button"
            onClick={onBackToTitle}
            className="rounded-xl border border-cyan-500/30 bg-slate-900/90 px-4 py-2.5 font-hud text-xs font-bold tracking-wide whitespace-nowrap text-slate-200 uppercase transition hover:border-cyan-400 hover:text-white"
          >
            Command Deck
          </button>
        </div>
      </div>
    </div>
  );
}
