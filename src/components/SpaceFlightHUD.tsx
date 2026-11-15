import {
  BookOpen,
  Compass,
  Navigation,
  Pause,
  Radio,
  Rocket,
  Satellite,
  Scale,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { CAMPAIGN_MISSIONS, SOLAR_TARGETS } from '../game/constants';
import { getSpaceMissionProgress } from '../game/missionProgress';
import {
  SOLAR_SYSTEM_BODIES,
  type SolarScaleMode,
  computeWeightOnBodyKg,
} from '../game/solarSystemData';
import type {
  CampaignCarryoverState,
  CampaignMissionId,
  MissionAnomaly,
  ResourceState,
  SpaceFlightState,
  SpaceTargetId,
} from '../game/types';
import { getSpaceWarnings } from '../game/warnings';
import { CameraViewControls } from './CameraViewControls';
import { MissionProgressBar } from './MissionProgressBar';
import { MissionTelemetryStrip } from './MissionTelemetryStrip';
import { MissionWarningBanner } from './MissionWarningBanner';

interface SpaceFlightHUDProps {
  space: SpaceFlightState;
  resources: ResourceState;
  campaignMission: CampaignMissionId;
  carryover: CampaignCarryoverState;
  activeAnomaly: MissionAnomaly | null;
  donkiFlareActive: boolean;
  freeExploreMode: boolean;
  solarScaleMode: SolarScaleMode;
  solarTimeSpeed: number;
  focusedSolarBodyId: string | null;
  onChangeSolarScaleMode: (mode: SolarScaleMode) => void;
  onChangeSolarTimeSpeed: (speed: number) => void;
  onFocusSolarBody: (bodyId: string | null) => void;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onSelectTarget: (id: SpaceTargetId) => void;
  onToggleAutoPilot: () => void;
  onToggleShieldBoost: () => void;
  onCompleteSatelliteMission: () => void;
  onCompleteGatewayMission: () => void;
  onEnterLunarOrbit: () => void;
  onEnterMarsOrbit: () => void;
  onResolveAnomaly: (anomalyId: string, choiceId: string) => void;
  onOpenNotebook: () => void;
  onSetCameraPreset: (yaw: number, pitch: number) => void;
  onZoomCamera: (delta: number) => void;
  onResetCamera: () => void;
}

function toRadar(x: number, z: number): { rx: number; ry: number } {
  // Maps 3D solar system span x in [-72, 58], z in [-66, 40] cleanly onto 120x84 radar
  const rx = 8 + ((x + 72) / 130) * 104;
  const ry = 8 + ((z + 66) / 106) * 68;
  return {
    rx: Math.max(6, Math.min(114, rx)),
    ry: Math.max(6, Math.min(78, ry)),
  };
}

function EclipticMiniRadar({
  space,
  satLocked,
  donkiFlareActive,
}: {
  space: SpaceFlightState;
  satLocked: boolean;
  donkiFlareActive: boolean;
}) {
  const shipPt = toRadar(space.shipX, space.shipZ);
  const sunPt = toRadar(-48, -36);
  const earthPt = toRadar(-22, 26);
  const tgt = SOLAR_TARGETS[space.targetId];
  const tgtPt = toRadar(tgt.x, tgt.z);
  const stormR = donkiFlareActive ? 34 : 23;

  return (
    <svg
      width="120"
      height="84"
      viewBox="0 0 120 84"
      className="shrink-0 rounded-lg border border-cyan-500/25 bg-slate-950"
      aria-label="Solar System Radar"
    >
      {/* Sun & Radiation Storm Ring */}
      <circle
        cx={sunPt.rx}
        cy={sunPt.ry}
        r={stormR}
        fill={donkiFlareActive ? 'rgba(244,63,94,0.12)' : 'none'}
        stroke="#f43f5e"
        strokeWidth="0.7"
        strokeDasharray="2 2"
        opacity="0.65"
      />
      <circle cx={sunPt.rx} cy={sunPt.ry} r="44" fill="none" stroke="#1e293b" strokeWidth="0.8" />
      <circle cx={sunPt.rx} cy={sunPt.ry} r="6" fill="#f97316" opacity="0.28" />
      <circle cx={sunPt.rx} cy={sunPt.ry} r="4.2" fill="#fbbf24" />

      {/* Earth Departure Blip */}
      <circle cx={earthPt.rx} cy={earthPt.ry} r="3.4" fill="#0284c7" stroke="#38bdf8" strokeWidth="0.8" />

      {/* Target Vector Line */}
      <line
        x1={shipPt.rx}
        y1={shipPt.ry}
        x2={tgtPt.rx}
        y2={tgtPt.ry}
        stroke="#22d3ee"
        strokeWidth="1"
        strokeDasharray="3 2"
        opacity="0.75"
      />

      {(Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).map((id) => {
        const t = SOLAR_TARGETS[id];
        const pt = toRadar(t.x, t.z);
        const hex = `#${t.color.toString(16).padStart(6, '0')}`;
        const isTarget = space.targetId === id;
        const done = space.visitedTargets.includes(id) || (id === 'relay-orbit' && satLocked);
        return (
          <g key={id}>
            {isTarget && (
              <circle cx={pt.rx} cy={pt.ry} r="6.2" fill="none" stroke="#22d3ee" strokeWidth="1" />
            )}
            <circle
              cx={pt.rx}
              cy={pt.ry}
              r="3"
              fill={done ? '#10b981' : hex}
              stroke="#020617"
              strokeWidth="0.8"
            />
          </g>
        );
      })}

      {/* Live Orion Blip */}
      <circle cx={shipPt.rx} cy={shipPt.ry} r="2.8" fill="#ffffff" stroke="#38bdf8" strokeWidth="1.2" />
    </svg>
  );
}

export function SpaceFlightHUD({
  space,
  resources,
  campaignMission,
  carryover,
  activeAnomaly,
  donkiFlareActive,
  freeExploreMode,
  solarScaleMode,
  solarTimeSpeed,
  focusedSolarBodyId,
  onChangeSolarScaleMode,
  onChangeSolarTimeSpeed,
  onFocusSolarBody,
  muted,
  onToggleMute,
  onPause,
  onSelectTarget,
  onToggleAutoPilot,
  onToggleShieldBoost,
  onCompleteSatelliteMission,
  onCompleteGatewayMission,
  onEnterLunarOrbit,
  onEnterMarsOrbit,
  onResolveAnomaly,
  onOpenNotebook,
  onSetCameraPreset,
  onZoomCamera,
  onResetCamera,
}: SpaceFlightHUDProps) {
  const activeTarget = SOLAR_TARGETS[space.targetId];
  const distToTarget = Math.hypot(activeTarget.x - space.shipX, activeTarget.z - space.shipZ);
  const shipSpeed = Math.hypot(space.vx, space.vz);
  const missionSpec = CAMPAIGN_MISSIONS[campaignMission];
  const sat = space.orbitalSat;
  const missionProgress = getSpaceMissionProgress(space, campaignMission);
  const focusedBody = focusedSolarBodyId
    ? SOLAR_SYSTEM_BODIES.find((b) => b.id === focusedSolarBodyId) ?? null
    : null;
  const lightTimeLabel =
    space.targetId === 'mars'
      ? '14 min'
      : space.targetId === 'moon' || space.targetId === 'gateway'
        ? '1.3 s'
        : '0.4 s';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      <div className="flex flex-col gap-2">
        <MissionProgressBar info={missionProgress} />
        <MissionTelemetryStrip
          context="space"
          elapsedSec={space.elapsedDays * 4}
          phaseLabel={freeExploreMode ? 'FREE EXPLORE · SOLAR SYSTEM' : `${missionSpec.code} TRANSIT`}
          nextMilestone={activeTarget.name.split(' · ')[0]}
          etaLabel={`${Math.max(1, Math.round(distToTarget / Math.max(2, shipSpeed)))}s`}
          metrics={[
            { label: 'Vel', value: `${shipSpeed.toFixed(1)} u/s`, tone: 'cyan' },
            { label: 'Comms Lag', value: lightTimeLabel, tone: 'amber' },
            { label: 'Range', value: `${Math.round(distToTarget)}u`, tone: 'white' },
          ]}
        />
        <MissionWarningBanner warnings={getSpaceWarnings(space, resources, donkiFlareActive)} />

        {/* Top Bar: Destination Selector + Ecliptic Radar + Resources */}
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="hud-panel pointer-events-auto flex items-center gap-3 rounded-xl p-2.5">
          <EclipticMiniRadar
            space={space}
            satLocked={sat.linkLocked}
            donkiFlareActive={donkiFlareActive}
          />

          <div>
            <div className="mb-1.5 flex items-center gap-1.5 font-hud text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
              <Navigation className="h-3.5 w-3.5" />
              {missionSpec.code} · Course
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).map((id) => {
                const t = SOLAR_TARGETS[id];
                const active = space.targetId === id;
                const visited =
                  space.visitedTargets.includes(id) || (id === 'relay-orbit' && sat.linkLocked);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectTarget(id)}
                    className={`rounded-lg px-2.5 py-1.5 font-hud text-xs font-bold whitespace-nowrap transition ${
                      active
                        ? 'bg-cyan-400 text-slate-950'
                        : visited
                          ? 'border border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                          : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-400'
                    }`}
                  >
                    {t.name.split(' · ')[0]}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 max-w-md text-[11px] text-slate-300">{activeTarget.fact}</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-start gap-2">
            <div className="hud-panel pointer-events-auto flex items-center gap-4 rounded-xl px-4 py-2 text-xs">
              <div>
                <span className="block font-hud text-[10px] text-slate-400 uppercase">Power</span>
                <span className="font-mono-tech font-bold text-amber-300">
                  {Math.round(resources.power)}%
                </span>
              </div>
              <div>
                <span className="block font-hud text-[10px] text-slate-400 uppercase">Shield</span>
                <span className="font-mono-tech font-bold text-emerald-300">
                  {Math.round(resources.shield)}%
                </span>
              </div>
              <div>
                <span className="block font-hud text-[10px] text-slate-400 uppercase">Fuel</span>
                <span className="font-mono-tech font-bold text-sky-300">
                  {Math.round(space.fuelPct)}%
                </span>
              </div>
              <div>
                <span className="block font-hud text-[10px] text-slate-400 uppercase">Range</span>
                <span className="font-mono-tech font-bold text-white">
                  {Math.round(distToTarget)}u
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenNotebook}
              className="hud-panel pointer-events-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 font-hud text-xs font-bold text-amber-200 hover:border-amber-400"
            >
              <BookOpen className="h-4 w-4 text-amber-300" />
              Ledger ({carryover.unlockedFieldNotes.length})
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-sky-400"
              title="Mute [M]"
            >
              {muted ? (
                <VolumeX className="h-4 w-4 text-slate-400" />
              ) : (
                <Volume2 className="h-4 w-4 text-sky-300" />
              )}
            </button>
            <button
              type="button"
              onClick={onPause}
              className="hud-panel pointer-events-auto rounded-lg p-2 text-slate-200 hover:border-sky-400"
              title="Pause [Esc]"
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

          {/* Non-Landing Orbital Relay Satellite Telemetry Card */}
          {(space.targetId === 'relay-orbit' || space.inSatDeployZone || sat.deployed) && (
            <div
              data-testid="orbital-sat-panel"
              className="hud-panel tactical-frame pointer-events-auto w-72 rounded-xl p-3.5 text-xs"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-display text-[11px] font-bold text-cyan-300 uppercase">
                  <Satellite className="h-4 w-4" />
                  HERMES Relay Sat
                </span>
                <span
                  data-testid="sat-link-status"
                  className={`font-mono-tech text-[10px] font-bold ${
                    sat.linkLocked ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {sat.linkLocked ? 'LINK LOCKED' : sat.deployed ? 'CALIBRATING' : 'STOWED'}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div>
                  <div className="flex justify-between font-hud text-slate-300">
                    <span>Solar Wings</span>
                    <span className="font-mono-tech font-bold text-amber-300">
                      {Math.round(sat.solarDeployedPct)}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-amber-400 transition-all"
                      style={{ width: `${Math.round(sat.solarDeployedPct)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-hud text-slate-300">
                    <span>Ka-Band &amp; Laser Dish</span>
                    <span className="font-mono-tech font-bold text-cyan-300">
                      {Math.round(sat.dishAlignedPct)}%
                    </span>
                  </div>
                  <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-400 transition-all"
                      style={{ width: `${Math.round(sat.dishAlignedPct)}%` }}
                    />
                  </div>
                </div>
              </div>

              {!sat.linkLocked && space.inSatDeployZone && (
                <button
                  type="button"
                  data-testid="deploy-sat-btn"
                  data-hold-keys="action"
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 font-display text-[11px] font-bold whitespace-nowrap text-slate-950 uppercase hover:bg-amber-400"
                >
                  <Radio className="h-3.5 w-3.5" />
                  HOLD [E / SPACE] DEPLOY
                </button>
              )}
            </div>
          )}

          {/* Orbital Applied Knowledge Anomaly Card */}
          {activeAnomaly && !activeAnomaly.resolvedChoiceId && (
            <div
              data-testid="space-anomaly-card"
              className="hud-panel-amber tactical-frame animate-modal-enter pointer-events-auto w-80 rounded-xl p-3.5"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-display text-xs font-bold text-amber-300 uppercase">
                  {activeAnomaly.title}
                </span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono-tech text-[9px] font-bold text-amber-200">
                  ALERT
                </span>
              </div>
              <p className="mb-1 font-mono-tech text-[10px] font-semibold text-cyan-300">
                {activeAnomaly.nasaRef}
              </p>
              <p className="mb-2.5 text-xs text-slate-200">{activeAnomaly.context}</p>
              <div className="flex flex-col gap-1.5">
                {activeAnomaly.choices.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onResolveAnomaly(activeAnomaly.id, c.id)}
                    className="rounded-lg border border-cyan-500/25 bg-slate-950/95 px-2.5 py-1.5 text-left text-xs font-semibold text-slate-100 transition hover:border-amber-400"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Bottom Controls, Complete Solar System Explorer & Orbital Objective Actions */}
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2">
        {/* Complete Solar System Explorer Bar (8 Planets + Dwarf Worlds + Halley's Comet) */}
        <div
          data-testid="solar-explorer-bar"
          className="hud-panel pointer-events-auto flex w-full flex-col gap-1.5 rounded-xl px-3 py-2 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => onFocusSolarBody(null)}
                className={`rounded px-2 py-1 font-hud text-[10px] font-bold uppercase ${
                  !focusedSolarBodyId
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Orion Ship
              </button>
              {SOLAR_SYSTEM_BODIES.map((b) => {
                const active = focusedSolarBodyId === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    data-testid={`solar-body-${b.id}`}
                    onClick={() => onFocusSolarBody(active ? null : b.id)}
                    className={`rounded px-2 py-1 font-hud text-[10px] font-bold whitespace-nowrap transition ${
                      active
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-900 text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {b.name.split(' ')[0]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded border border-slate-700 bg-slate-900 p-0.5 text-[10px]">
                <button
                  type="button"
                  data-testid="scale-exploration-btn"
                  onClick={() => onChangeSolarScaleMode('exploration')}
                  className={`rounded px-2 py-0.5 font-hud font-bold uppercase ${
                    solarScaleMode === 'exploration'
                      ? 'bg-cyan-400 text-slate-950'
                      : 'text-slate-300'
                  }`}
                >
                  Explore Scale
                </button>
                <button
                  type="button"
                  data-testid="scale-scientific-btn"
                  onClick={() => onChangeSolarScaleMode('scientific')}
                  className={`rounded px-2 py-0.5 font-hud font-bold uppercase ${
                    solarScaleMode === 'scientific'
                      ? 'bg-amber-400 text-slate-950'
                      : 'text-slate-300'
                  }`}
                >
                  Real AU Scale
                </button>
              </div>

              <label className="flex items-center gap-1.5 font-mono-tech text-[10px] text-slate-300">
                <span>Time</span>
                <input
                  type="range"
                  aria-label="Orbital Time Speed"
                  min={0}
                  max={4}
                  step={0.5}
                  value={solarTimeSpeed}
                  onChange={(e) => onChangeSolarTimeSpeed(Number(e.target.value))}
                  className="w-16 accent-cyan-400"
                />
                <span className="text-cyan-300">{solarTimeSpeed}×</span>
              </label>
            </div>
          </div>

          {focusedBody && (
            <div
              data-testid="solar-body-detail"
              className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-1.5 text-[11px]"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display font-bold text-amber-300 uppercase">
                  {focusedBody.name}
                </span>
                <span className="font-mono-tech text-cyan-300">
                  {focusedBody.semiMajorAu} AU · {focusedBody.gravityG}g · Light-time {focusedBody.lightTimeOneWay}
                </span>
                <span className="text-slate-300">{focusedBody.moonsSummary}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 font-mono-tech text-[10px] font-bold text-emerald-200">
                  <Scale className="h-3 w-3" />
                  35 kg Kid Weighs {computeWeightOnBodyKg(35, focusedBody.gravityG)} kg
                </span>
                <span className="hidden text-slate-200 xl:inline">{focusedBody.fact}</span>
              </div>
            </div>
          )}
        </div>

        {space.inRadiationZone && (
          <div className="hud-panel-amber pointer-events-auto flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-semibold text-amber-200">
            <Compass className="h-3.5 w-3.5 text-amber-400" />
            Solar Radiation Ring — enable Storm Shield or steer clear.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {sat.linkLocked && campaignMission === 'artemis-2' && (
            <button
              type="button"
              data-testid="complete-sat-mission-btn"
              onClick={onCompleteSatelliteMission}
              className="pointer-events-auto rounded-xl bg-emerald-500 px-6 py-2.5 font-display text-sm font-bold text-slate-950 shadow-lg hover:bg-emerald-400"
            >
              RELAY LOCKED — COMPLETE ARTEMIS II
            </button>
          )}

          {space.arrivedGateway && campaignMission === 'artemis-4' && (
            <button
              type="button"
              data-testid="complete-gateway-mission-btn"
              onClick={onCompleteGatewayMission}
              className="pointer-events-auto rounded-xl bg-emerald-500 px-6 py-2.5 font-display text-sm font-bold text-slate-950 shadow-lg hover:bg-emerald-400"
            >
              GATEWAY DOCKED — COMPLETE ARTEMIS IV
            </button>
          )}

          {(space.arrivedMoon || freeExploreMode) && campaignMission !== 'mars-pathfinder' && (
            <button
              type="button"
              data-testid="land-moon-btn"
              onClick={onEnterLunarOrbit}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-5 py-2.5 font-display text-xs font-bold text-slate-950 shadow-lg hover:bg-sky-400"
            >
              <Rocket className="h-4 w-4" />
              {space.arrivedMoon ? 'LUNAR ORBIT — START 0.165g DESCENT' : 'FREE EXPLORE: LAND MOON (0.165g)'}
            </button>
          )}

          {(space.arrivedMars || freeExploreMode) && (
            <button
              type="button"
              data-testid="land-mars-btn"
              onClick={onEnterMarsOrbit}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 font-display text-xs font-bold text-slate-950 shadow-lg hover:bg-orange-400"
            >
              <Rocket className="h-4 w-4" />
              {space.arrivedMars ? 'MARS ORBIT — START 0.38g EDL' : 'FREE EXPLORE: LAND MARS (0.38g)'}
            </button>
          )}
        </div>

        <div className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs">
          <button
            type="button"
            data-hold-keys="left"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100 hover:border-sky-400"
          >
            <span className="keycap mr-1">A</span> Left
          </button>
          <button
            type="button"
            data-hold-keys="forward"
            className="rounded-lg bg-sky-500/20 px-3.5 py-1.5 font-bold text-sky-100 ring-1 ring-sky-400/50"
          >
            <span className="keycap mr-1">W</span> Thrust
          </button>
          <button
            type="button"
            data-hold-keys="backward"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100 hover:border-sky-400"
          >
            <span className="keycap mr-1">S</span> Brake
          </button>
          <button
            type="button"
            data-hold-keys="right"
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 font-semibold text-slate-100 hover:border-sky-400"
          >
            Right <span className="keycap ml-1">D</span>
          </button>
          <button
            type="button"
            data-hold-keys="forward,boost"
            className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 font-semibold text-amber-200"
          >
            Boost <span className="keycap ml-1">Shift</span>
          </button>

          <div className="h-5 w-px bg-slate-700" />

          <button
            type="button"
            onClick={onToggleAutoPilot}
            className={`rounded-lg px-3 py-1.5 font-bold transition ${
              space.autoPilot
                ? 'bg-emerald-500 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-emerald-400'
            }`}
          >
            Auto-Pilot <span className="keycap ml-1">G</span>
          </button>

          <button
            type="button"
            onClick={onToggleShieldBoost}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition ${
              space.shieldBoostActive
                ? 'bg-sky-500 text-slate-950'
                : 'border border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-400'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Storm Shield
          </button>
        </div>
      </div>
    </div>
  );
}
