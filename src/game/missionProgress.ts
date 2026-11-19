import { PHYSICS, SOLAR_TARGETS, getLandingZones } from './constants';
import { clamp, getSurfaceTerrainHeight } from './physics';
import {
  type SolarScaleMode,
  getLiveSolarTargetPosition,
  getShipSpawnForMission,
} from './solarSystemData';
import type {
  CampaignMissionId,
  LandingState,
  LaunchState,
  RoverObjective,
  RoverState,
  SpaceFlightState,
} from './types';

export interface MissionMilestone {
  label: string;
  pct: number;
  reached: boolean;
}

export interface MissionProgressInfo {
  phaseLabel: string;
  originLabel: string;
  destinationLabel: string;
  progressPct: number;
  remainingLabel: string;
  detailLabel: string;
  accent: 'cyan' | 'amber' | 'emerald' | 'orange';
  milestones: MissionMilestone[];
}

export interface RoverSpeedometerTelemetry {
  absSpeedMs: number;
  speedKmh: number;
  maxSpeedMs: number;
  gaugePct: number;
  modeCapPct: number;
  gearLabel: 'FWD' | 'REV' | 'HOLD' | 'PIVOT';
  isHighSpeed: boolean;
}

export function getLaunchMissionProgress(launch: LaunchState): MissionProgressInfo {
  const targetKm = PHYSICS.SLS_ORBIT_TARGET_KM;
  const altKm = clamp(launch.altitudeKm, 0, targetKm);
  const progressPct = launch.orbitReached ? 100 : clamp((altKm / targetKm) * 100, 0, 100);
  const remKm = Math.max(0, targetKm - altKm);

  const remainingLabel = launch.orbitReached
    ? 'Orbit Inserted · 0.0 km left'
    : launch.launchSequence === 'PRE_SIM' || launch.launchSequence === 'COUNTDOWN' || launch.launchSequence === 'READY'
      ? `${targetKm.toFixed(1)} km to orbit`
      : `${remKm.toFixed(1)} km to orbit`;

  return {
    phaseLabel: 'Ascent Trajectory',
    originLabel: 'LC-39B Pad (0 km)',
    destinationLabel: `${targetKm} km Orbit`,
    progressPct,
    remainingLabel,
    detailLabel: `${altKm.toFixed(1)} / ${targetKm} km`,
    accent: launch.orbitReached ? 'emerald' : launch.coreSeparated ? 'cyan' : 'amber',
    milestones: [
      {
        label: 'SRB 45km',
        pct: (PHYSICS.SLS_SRB_SEP_ALT_KM / targetKm) * 100,
        reached: launch.srbSeparated || altKm >= PHYSICS.SLS_SRB_SEP_ALT_KM,
      },
      {
        label: 'LAS 80km',
        pct: (PHYSICS.SLS_LAS_JETTISON_ALT_KM / targetKm) * 100,
        reached: launch.lasJettisoned || altKm >= PHYSICS.SLS_LAS_JETTISON_ALT_KM,
      },
      {
        label: 'MECO 110km',
        pct: (PHYSICS.SLS_CORE_SEP_ALT_KM / targetKm) * 100,
        reached: launch.coreSeparated || altKm >= PHYSICS.SLS_CORE_SEP_ALT_KM,
      },
    ],
  };
}

export function getSpaceMissionProgress(
  space: SpaceFlightState,
  missionId: CampaignMissionId,
  solarEpochYears = 0,
  solarScaleMode: SolarScaleMode = 'exploration'
): MissionProgressInfo {
  const target = SOLAR_TARGETS[space.targetId];
  const liveTarget = getLiveSolarTargetPosition(space.targetId, solarEpochYears, solarScaleMode);
  const spawn = getShipSpawnForMission(missionId, 0, solarScaleMode);
  const startX = spawn.x;
  const startZ = spawn.z;

  const captureRadius =
    space.targetId === 'relay-orbit'
      ? solarScaleMode === 'scientific'
        ? 1.1
        : solarScaleMode === 'local'
          ? 5.2
          : 2.8
      : liveTarget.radius + (space.targetId === 'mars' ? 5.2 : 4.8);

  const rawDist = Math.hypot(liveTarget.x - space.shipX, liveTarget.z - space.shipZ);
  const remDist = Math.max(0, rawDist - captureRadius);
  const totalLegSpan = Math.max(1, Math.hypot(liveTarget.x - startX, liveTarget.z - startZ) - captureRadius);

  if (missionId === 'artemis-2') {
    const transitRatio = clamp(1 - remDist / totalLegSpan, 0, 1);
    const flybyComplete = Boolean(space.arrivedMoon || space.inSatDeployZone || remDist <= 0.2 || space.orbitalSat.linkLocked);
    const progressPct = flybyComplete ? 100 : clamp(transitRatio * 100, 0, 99.5);
    const remainingLabel = flybyComplete
      ? 'Lunar Flyby Nominal · Align Earth Corridor'
      : `${Math.round(remDist * 10)}k sim-km to Perilune`;

    return {
      phaseLabel: 'Cislunar Free-Return Flyby',
      originLabel: 'Earth LEO',
      destinationLabel: 'Moon (~7,400 km Perilune)',
      progressPct,
      remainingLabel,
      detailLabel: flybyComplete ? 'Perilune Bypass (~7,400 km)' : `${Math.round(rawDist)}u range`,
      accent: flybyComplete ? 'emerald' : 'cyan',
      milestones: [
        {
          label: 'TLI Coast',
          pct: 35,
          reached: transitRatio >= 0.35,
        },
        {
          label: 'Lunar SOI',
          pct: 70,
          reached: transitRatio >= 0.70 || flybyComplete,
        },
        {
          label: 'Perilune Flyby',
          pct: 100,
          reached: flybyComplete,
        },
      ],
    };
  }

  if (space.targetId === 'relay-orbit') {
    const transitRatio = clamp(1 - remDist / totalLegSpan, 0, 1);
    const satCalibRatio = space.orbitalSat.linkLocked
      ? 1
      : clamp((space.orbitalSat.solarDeployedPct + space.orbitalSat.dishAlignedPct) / 200, 0, 1);
    const progressPct = space.orbitalSat.linkLocked
      ? 100
      : clamp(transitRatio * 70 + satCalibRatio * 30, 0, 99.5);

    const remainingLabel = space.orbitalSat.linkLocked
      ? 'HERMES Link Locked · Complete'
      : space.inSatDeployZone
        ? `In Relay Orbit · Calibrating (${Math.round(satCalibRatio * 100)}%)`
        : `${Math.round(remDist * 10)}k sim-km remaining`;

    return {
      phaseLabel: 'Cislunar Relay Transit',
      originLabel: 'Earth LEO',
      destinationLabel: target.name,
      progressPct,
      remainingLabel,
      detailLabel: space.inSatDeployZone
        ? `Signal ${Math.round(space.orbitalSat.telemetrySignalPct)}%`
        : `${Math.round(rawDist)}u range`,
      accent: space.orbitalSat.linkLocked ? 'emerald' : 'cyan',
      milestones: [
        {
          label: 'Transit',
          pct: 35,
          reached: transitRatio >= 0.5 || space.inSatDeployZone,
        },
        {
          label: 'Relay Orbit',
          pct: 70,
          reached: space.inSatDeployZone || space.orbitalSat.deployed,
        },
        {
          label: 'Solar Wings',
          pct: 85,
          reached: space.orbitalSat.solarDeployedPct >= 99,
        },
      ],
    };
  }

  const arrived =
    (space.targetId === 'moon' && space.arrivedMoon) ||
    (space.targetId === 'gateway' && space.arrivedGateway) ||
    (space.targetId === 'mars' && space.arrivedMars);

  const progressPct = arrived ? 100 : clamp((1 - remDist / totalLegSpan) * 100, 0, 99.5);
  const remainingLabel = arrived
    ? `${target.name.split(' · ')[0]} Orbit Captured`
    : `${Math.round(remDist * 10)}k sim-km remaining`;

  return {
    phaseLabel: space.targetId === 'mars' ? 'Interplanetary Transit' : 'Lunar Transfer',
    originLabel: missionId === 'artemis-4' ? 'Lunar Vicinity' : 'Earth LEO',
    destinationLabel: target.name,
    progressPct,
    remainingLabel,
    detailLabel: `${target.realDistanceLabel} leg`,
    accent: arrived ? 'emerald' : space.targetId === 'mars' ? 'orange' : 'cyan',
    milestones: [
      { label: 'TLI Burn', pct: 25, reached: progressPct >= 25 },
      { label: 'Midcourse', pct: 55, reached: progressPct >= 55 },
      { label: 'Capture Window', pct: 85, reached: progressPct >= 85 },
    ],
  };
}

export function getLandingMissionProgress(landing: LandingState): MissionProgressInfo {
  const isMars = landing.planet === 'mars';
  const startY = isMars ? 172 : 165;
  const startAltM = Math.max(1, startY - getSurfaceTerrainHeight(landing.planet, 0, -36));
  const groundH = getSurfaceTerrainHeight(landing.planet, landing.x, landing.z);
  const altM = Math.max(0, landing.y - groundH);

  const zones = getLandingZones(landing.planet);
  const activeZone = zones[landing.targetZoneId] || zones[0];

  const progressPct = landing.landed ? 100 : clamp((1 - altM / startAltM) * 100, 0, 99.5);
  const remainingLabel = landing.landed
    ? landing.result === 'crash'
      ? 'Touchdown Impact'
      : 'Touchdown Confirmed'
    : `${altM.toFixed(1)} m alt · ${Math.round(landing.distToPad)} m to pad`;

  return {
    phaseLabel: isMars ? 'Mars 0.38g Descent' : 'Lunar 0.165g Descent',
    originLabel: `${Math.round(startAltM)} m Entry`,
    destinationLabel: activeZone.name,
    progressPct,
    remainingLabel,
    detailLabel: `${landing.descentPhase} · ${Math.abs(landing.vy).toFixed(1)} m/s sink`,
    accent: landing.landed
      ? landing.result === 'crash'
        ? 'amber'
        : 'emerald'
      : isMars
        ? 'orange'
        : 'cyan',
    milestones: [
      {
        label: 'Approach 75m',
        pct: ((startAltM - 75) / startAltM) * 100,
        reached: altM <= 75 || landing.landed,
      },
      {
        label: 'Terminal 18m',
        pct: ((startAltM - 18) / startAltM) * 100,
        reached: altM <= 18 || landing.landed,
      },
    ],
  };
}

export function getRoverMissionProgress(
  rover: RoverState,
  objectives: RoverObjective[]
): MissionProgressInfo {
  const total = Math.max(1, objectives.length);
  const completedCount = objectives.filter((o) => o.completed).length;
  const weightedSum = objectives.reduce(
    (sum, o) => sum + (o.completed ? 1 : clamp(o.progress, 0, 1)),
    0
  );
  const progressPct = clamp((weightedSum / total) * 100, 0, 100);

  const remainingObjectives = objectives.filter((o) => !o.completed);
  let nearestDist = 0;
  let nearestName = '';
  if (remainingObjectives.length > 0) {
    let best = Infinity;
    for (const obj of remainingObjectives) {
      const d = Math.hypot(obj.x - rover.x, obj.z - rover.z);
      if (d < best) {
        best = d;
        nearestName = obj.siteName;
      }
    }
    nearestDist = best;
  }

  const isMars = rover.planet === 'mars';
  const remainingLabel =
    remainingObjectives.length === 0
      ? 'All Sites Sampled · Mission Complete'
      : `${remainingObjectives.length} ${remainingObjectives.length === 1 ? 'site' : 'sites'} left · ${Math.round(nearestDist)} m to ${nearestName}`;

  const milestones: MissionMilestone[] = objectives.map((obj, idx) => ({
    label: obj.siteName,
    pct: ((idx + 1) / total) * 100,
    reached: idx < completedCount,
  }));

  return {
    phaseLabel: isMars ? 'Jezero Surface Ops' : 'South Pole Science Ops',
    originLabel: 'Base Camp',
    destinationLabel: `${total} Survey Sites`,
    progressPct,
    remainingLabel,
    detailLabel: `${completedCount} / ${total} Sites`,
    accent: completedCount === total ? 'emerald' : isMars ? 'orange' : 'cyan',
    milestones,
  };
}

export function getRoverSpeedometerTelemetry(rover: RoverState): RoverSpeedometerTelemetry {
  const absSpeedMs = Math.abs(rover.speed);
  const speedKmh = absSpeedMs * 3.6;
  const maxSpeedMs =
    rover.driveMode === 'WALKER' ? PHYSICS.ROVER_WALKER_SPEED : PHYSICS.ROVER_MAX_SPEED;
  const gaugePct = clamp((absSpeedMs / PHYSICS.ROVER_MAX_SPEED) * 100, 0, 100);
  const modeCapPct = clamp((maxSpeedMs / PHYSICS.ROVER_MAX_SPEED) * 100, 0, 100);

  let gearLabel: RoverSpeedometerTelemetry['gearLabel'] = 'HOLD';
  if (rover.driveMode === 'SPIN') {
    gearLabel = 'PIVOT';
  } else if (rover.speed > 0.08) {
    gearLabel = 'FWD';
  } else if (rover.speed < -0.08) {
    gearLabel = 'REV';
  }

  return {
    absSpeedMs,
    speedKmh,
    maxSpeedMs,
    gaugePct,
    modeCapPct,
    gearLabel,
    isHighSpeed: absSpeedMs >= PHYSICS.ROVER_WALKER_SPEED * 1.15,
  };
}
