import type {
  LandingState,
  LaunchState,
  ResourceState,
  RoverState,
  SpaceFlightState,
} from './types';

export type WarningSeverity = 'warning' | 'critical';

export interface MissionWarning {
  id: string;
  severity: WarningSeverity;
  title: string;
  action: string;
}

function getResourceWarnings(res: ResourceState, inRadiationOrStorm: boolean): MissionWarning[] {
  const list: MissionWarning[] = [];

  if (res.shield <= 18) {
    list.push({
      id: 'res-shield-critical',
      severity: 'critical',
      title: `SHIELD CRITICAL (${Math.round(res.shield)}%)`,
      action: inRadiationOrStorm
        ? 'Steer clear of flare zone, shelter at Base Camp Berm (-15, -13), or resolve OSDR anomaly!'
        : 'Boost shielding at Base Camp / anomaly panel or sample Nobile Berm before next storm!',
    });
  } else if (res.shield <= 34) {
    list.push({
      id: 'res-shield-low',
      severity: 'warning',
      title: `LOW RADIATION SHIELD (${Math.round(res.shield)}%)`,
      action: 'Prepare Storm Shield, return near Base Camp Berm, or survey regolith protection.',
    });
  }

  if (res.power <= 16) {
    list.push({
      id: 'res-power-critical',
      severity: 'critical',
      title: `POWER BUS CRITICAL (${Math.round(res.power)}%)`,
      action: 'Cut Boost / Headlights [L] immediately & charge on sunlit ridge or Base Camp (-15, -13)!',
    });
  } else if (res.power <= 32) {
    list.push({
      id: 'res-power-low',
      severity: 'warning',
      title: `LOW POWER RESERVE (${Math.round(res.power)}%)`,
      action: 'Dim floodlights [L], avoid boost drains, or head to Malapert / Base Camp recharge.',
    });
  }

  if (res.oxygen <= 18) {
    list.push({
      id: 'res-o2-critical',
      severity: 'critical',
      title: `OXYGEN CRITICAL (${Math.round(res.oxygen)}%)`,
      action: 'Drill ice/MOXIE objective immediately or return within 22 m of Base Camp O₂ bus!',
    });
  } else if (res.oxygen <= 34) {
    list.push({
      id: 'res-o2-low',
      severity: 'warning',
      title: `OXYGEN RESERVE LOW (${Math.round(res.oxygen)}%)`,
      action: 'Prioritize Shackleton Ice / MOXIE Depot sample or Outpost O₂ Recycler.',
    });
  }

  return list;
}

function sortWarnings(warnings: MissionWarning[]): MissionWarning[] {
  return [...warnings].sort((a, b) => {
    if (a.severity === b.severity) return 0;
    return a.severity === 'critical' ? -1 : 1;
  });
}

export function getLaunchWarnings(launch: LaunchState, res: ResourceState): MissionWarning[] {
  const list = getResourceWarnings(res, false);

  if (launch.stagePrompt === 'SRB_SEP') {
    list.push({
      id: 'launch-srb-sep',
      severity: 'warning',
      title: 'SRB BURNOUT — STAGE SEPARATION DUE',
      action: 'Press [SPACE] or click SEPARATE STAGE to jettison Twin Solid Boosters.',
    });
  } else if (launch.stagePrompt === 'CORE_SEP') {
    list.push({
      id: 'launch-core-sep',
      severity: 'warning',
      title: 'CORE MECO — ICPS SEPARATION DUE',
      action: 'Press [SPACE] or click SEPARATE STAGE to ignite RL10 upper stage.',
    });
  }

  if (launch.ignited && Math.abs(launch.pitchDeg) > 58) {
    list.push({
      id: 'launch-pitch-steep',
      severity: 'critical',
      title: `STEEP ASCENT PITCH (${Math.round(launch.pitchDeg)}°)`,
      action: 'Hold [A] or [SPACE] Stabilize to return onto nominal gravity-turn corridor!',
    });
  }

  return sortWarnings(list);
}

export function getSpaceWarnings(
  space: SpaceFlightState,
  res: ResourceState,
  donkiFlareActive: boolean
): MissionWarning[] {
  const list = getResourceWarnings(res, space.inRadiationZone);

  if (space.inRadiationZone && !space.shieldBoostActive) {
    list.push({
      id: 'space-radiation-zone',
      severity: donkiFlareActive ? 'critical' : 'warning',
      title: donkiFlareActive
        ? 'DONKI SOLAR STORM FLUX — UNSHIELDED!'
        : 'INSIDE SOLAR CORONA RADIATION RING',
      action: 'Activate Storm Shield, steer away from Sun (-48, -36), or orient Orion water bay!',
    });
  }

  if (space.fuelPct <= 14) {
    list.push({
      id: 'space-fuel-critical',
      severity: 'critical',
      title: `PROPELLANT CRITICAL (${Math.round(space.fuelPct)}%)`,
      action: 'Release Boost [Shift], drift cleanly, or engage Auto-Pilot [G] approach!',
    });
  } else if (space.fuelPct <= 26) {
    list.push({
      id: 'space-fuel-low',
      severity: 'warning',
      title: `RCS / ESM FUEL LOW (${Math.round(space.fuelPct)}%)`,
      action: 'Conserve burns — Orion coasts effortlessly in vacuum without thruster input.',
    });
  }

  return sortWarnings(list);
}

export function getLandingWarnings(landing: LandingState, res: ResourceState): MissionWarning[] {
  const list = getResourceWarnings(res, false);
  const absVy = Math.abs(landing.vy);
  const horiz = Math.hypot(landing.vx, landing.vz);

  if (landing.fuelPct <= 12 && !landing.landed) {
    list.push({
      id: 'landing-fuel-critical',
      severity: 'critical',
      title: `DESCENT FUEL CRITICAL (${Math.round(landing.fuelPct)}%)`,
      action: 'Engage Auto-Land [G] or pulse throttle only near touchdown (< 30 m)!',
    });
  }

  if (absVy > 4.6 && landing.y < 60 && !landing.landed) {
    list.push({
      id: 'landing-sink-critical',
      severity: 'critical',
      title: `HIGH SINK RATE (${absVy.toFixed(1)} m/s < 60m)`,
      action: 'Hold [SPACE] Max Brake or press [W] / Auto-Land [G] immediately to avoid crash!',
    });
  } else if (absVy > 3.2 && landing.y < 32 && !landing.landed) {
    list.push({
      id: 'landing-sink-warn',
      severity: 'warning',
      title: `FAST FINAL APPROACH (${absVy.toFixed(1)} m/s)`,
      action: 'Increase throttle [W] / [SPACE] to bring touchdown speed under 2.5 m/s.',
    });
  }

  if (landing.tiltDeg > 19 && !landing.landed) {
    list.push({
      id: 'landing-tilt-critical',
      severity: 'critical',
      title: `EXCESSIVE TILT (${Math.round(landing.tiltDeg)}°)`,
      action: 'Release WASD keys or switch to Hover Assist / Auto-Land [G] to level lander!',
    });
  }

  if (horiz > 3.8 && landing.y < 55 && !landing.landed) {
    list.push({
      id: 'landing-drift-warn',
      severity: 'warning',
      title: `LATERAL DRIFT (${horiz.toFixed(1)} m/s)`,
      action: 'Hold [B] Kill Drift to null sideways velocity before leg contact!',
    });
  }

  if (landing.slopeDeg > 15 && landing.y < 55 && !landing.landed) {
    list.push({
      id: 'landing-slope-warn',
      severity: 'warning',
      title: `STEEP PREDICTED SLOPE (${landing.slopeDeg.toFixed(0)}°)`,
      action: 'Fly toward flat Pad Alpha / target zone or engage Auto-Land [G].',
    });
  }

  return sortWarnings(list);
}

export function getRoverWarnings(
  rover: RoverState,
  res: ResourceState,
  donkiFlareActive: boolean
): MissionWarning[] {
  const list = getResourceWarnings(res, donkiFlareActive);

  if (donkiFlareActive && res.shield <= 48) {
    list.push({
      id: 'rover-flare-storm',
      severity: 'warning',
      title: 'SOLAR FLARE ACTIVE — SHIELD DRAIN ELEVATED',
      action: 'Shelter within 22 m of Base Camp Berm (-15, -13) or solve Active Anomaly!',
    });
  }

  if (rover.planet === 'mars' && rover.dustAccumulationPct >= 42) {
    list.push({
      id: 'rover-mars-dust',
      severity: 'warning',
      title: `SOLAR ARRAY DUST HIGH (${Math.round(rover.dustAccumulationPct)}%)`,
      action: 'Drive up Máaz Ridge (-148, -96) wind zone or trigger Dust Clear to restore solar!',
    });
  }

  if (rover.wheelSlipPct >= 30) {
    list.push({
      id: 'rover-wheel-slip',
      severity: 'warning',
      title: `HIGH WHEEL SLIP (${rover.wheelSlipPct}%)`,
      action: 'Press [4] Walker Gait + [F] High Clearance to grip steep crater slopes!',
    });
  }

  return sortWarnings(list);
}
