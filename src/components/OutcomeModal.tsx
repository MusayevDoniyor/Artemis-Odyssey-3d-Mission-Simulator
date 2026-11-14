import { ArrowRight, Award, Play, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import { CAMPAIGN_MISSIONS } from '../game/constants';
import type { CampaignCarryoverState, ResourceState, RoverObjective } from '../game/types';

interface OutcomeModalProps {
  mode: 'pause' | 'discovery' | 'gameover' | 'victory';
  reason?: string;
  score: number;
  resources: ResourceState;
  carryover?: CampaignCarryoverState;
  nextMissionLabel?: string | null;
  discoveryObjective?: RoverObjective | null;
  onResume?: () => void;
  onNextMission?: () => void;
  onRetry: () => void;
  onBackToTitle: () => void;
}

export function OutcomeModal({
  mode,
  reason,
  score,
  resources,
  carryover,
  nextMissionLabel,
  discoveryObjective,
  onResume,
  onNextMission,
  onRetry,
  onBackToTitle,
}: OutcomeModalProps) {
  if (mode === 'discovery' && discoveryObjective) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/70 p-4">
        <div className="hud-panel w-full max-w-lg rounded-2xl p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            Science Discovery Complete · Logged for Reuse
          </div>
          <h2 className="font-display text-2xl font-bold text-white">{discoveryObjective.title}</h2>
          <p className="mt-1 text-xs font-semibold text-amber-300">
            Carryover Gain: {discoveryObjective.rewardText}
          </p>
          <p className="mt-3 rounded-xl border border-slate-700/80 bg-slate-900/80 p-3.5 text-sm leading-relaxed text-slate-100">
            {discoveryObjective.nasaFact}
          </p>
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={onResume}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-sky-400"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              Continue Exploring
            </button>
          </div>
        </div>
      </div>
    );
  }

  const missionSpec = carryover ? CAMPAIGN_MISSIONS[carryover.activeMission] : null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-950/75 p-4">
      <div className="hud-panel w-full max-w-lg rounded-2xl p-6 text-center">
        {mode === 'pause' && (
          <>
            <h2 className="font-display text-2xl font-bold text-white">Mission Paused</h2>
            <p className="mt-2 text-sm text-slate-300">
              Take a breath, Commander. Your spacecraft telemetry is holding steady.
            </p>
          </>
        )}

        {mode === 'gameover' && (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/20 text-rose-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white">Mission Abort</h2>
            <p className="mt-2 text-sm text-rose-200">{reason || 'Critical system limit reached.'}</p>
          </>
        )}

        {mode === 'victory' && (
          <>
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20 text-amber-300">
              <Award className="h-6 w-6" />
            </div>
            <h2 className="font-display text-2xl font-bold text-white">
              {missionSpec ? `${missionSpec.code} Complete!` : 'Mission Complete!'}
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              {missionSpec?.reuseOutput ||
                'You balanced Power, Oxygen, and Shielding to advance NASA exploration.'}
            </p>
            <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3">
              <span className="block text-[11px] font-bold text-amber-300 uppercase">
                Mission Score
              </span>
              <span className="font-mono-tech text-3xl font-bold text-white">{score}</span>
            </div>
          </>
        )}

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs">
          <div>
            <span className="block text-[10px] text-slate-400 uppercase">Power</span>
            <span className="font-mono-tech font-bold text-amber-300">
              {Math.round(resources.power)}%
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase">Oxygen</span>
            <span className="font-mono-tech font-bold text-sky-300">
              {Math.round(resources.oxygen)}%
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 uppercase">Shield</span>
            <span className="font-mono-tech font-bold text-emerald-300">
              {Math.round(resources.shield)}%
            </span>
          </div>
        </div>

        {mode === 'victory' && carryover && (
          <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-2.5 text-[11px]">
            <div>
              <span className="block text-[9px] text-slate-300 uppercase">Relay</span>
              <span className="font-bold text-emerald-300">
                {carryover.relaySatelliteOnline ? 'ONLINE' : 'OFF'}
              </span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-300 uppercase">ISRU H₂O</span>
              <span className="font-mono-tech font-bold text-sky-300">
                {carryover.isruWaterKg}kg
              </span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-300 uppercase">Fuel Bonus</span>
              <span className="font-mono-tech font-bold text-amber-300">
                +{carryover.isruFuelBonusPct}%
              </span>
            </div>
            <div>
              <span className="block text-[9px] text-slate-300 uppercase">Crew Dose</span>
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
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-sky-400"
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
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-emerald-400"
            >
              {nextMissionLabel}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            data-start={mode === 'victory' || mode === 'gameover' ? 'true' : undefined}
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 font-display text-sm font-bold text-slate-950 hover:bg-amber-400"
          >
            <RotateCcw className="h-4 w-4" />
            {mode === 'pause' ? 'Restart Stage' : 'Replay Mission'}
          </button>
          <button
            type="button"
            onClick={onBackToTitle}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-sky-400"
          >
            Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}
