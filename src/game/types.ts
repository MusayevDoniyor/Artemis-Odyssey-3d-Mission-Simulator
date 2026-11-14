export type GamePhase =
  | 'title'
  | 'inspector'
  | 'briefing'
  | 'launch'
  | 'space'
  | 'landing'
  | 'rover'
  | 'victory'
  | 'gameover';

export type CameraMode = 'chase' | 'cockpit' | 'overhead' | 'orbit';

export type VehicleShowcaseId = 'rocket' | 'lander' | 'rover' | 'outpost';

export type PayloadId = 'heavy-shield' | 'oxygen-tanks' | 'solar-panels' | 'water-drill';

export type SpaceTargetId = 'moon' | 'mars' | 'jupiter';

export type RoverDriveMode = 'DRIVE' | 'CRAB' | 'SPIN' | 'WALKER';

export type LandingGuidanceMode = 'MANUAL' | 'RATE_ASSIST' | 'AUTOLAND';

export type LandingResult = 'perfect' | 'hard' | 'crash' | null;

export interface ResourceState {
  power: number;
  oxygen: number;
  shield: number;
}

export interface PayloadOption {
  id: PayloadId;
  name: string;
  shortTag: string;
  description: string;
  tradeoffHint: string;
  massMultiplier: number;
  fragile: boolean;
  bonus: Partial<ResourceState>;
  drillBoost: number;
}

export interface DonkiStatus {
  isLive: boolean;
  status: 'loading' | 'live' | 'quiet' | 'archived';
  classType: string;
  beginTime: string;
  sourceLocation: string;
  link: string;
  description: string;
}

export interface LaunchState {
  ignited: boolean;
  elapsed: number;
  altitudeKm: number;
  verticalSpeedMs: number;
  horizontalSpeedMs: number;
  dynamicPressureKpa: number;
  pitchDeg: number;
  throttle: number;
  fuelPct: number;
  srbSeparated: boolean;
  coreSeparated: boolean;
  lasJettisoned: boolean;
  orbitReached: boolean;
  stagePrompt: string | null;
}

export interface SpaceFlightState {
  shipX: number;
  shipZ: number;
  vx: number;
  vz: number;
  headingRad: number;
  targetId: SpaceTargetId;
  autoPilot: boolean;
  boostActive: boolean;
  shieldBoostActive: boolean;
  fuelPct: number;
  elapsedDays: number;
  inRadiationZone: boolean;
  arrivedMoon: boolean;
  visitedTargets: SpaceTargetId[];
  statusText: string;
}

export interface LandingZone {
  id: number;
  code: string;
  name: string;
  x: number;
  z: number;
  radius: number;
  multiplier: number;
  bonusPts: number;
  color: number;
  hint: string;
}

export interface LandingState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rollDeg: number;
  pitchDeg: number;
  tiltDeg: number;
  throttle: number;
  fuelPct: number;
  massMultiplier: number;
  twr: number;
  targetZoneId: number;
  guidanceMode: LandingGuidanceMode;
  contactLight: boolean;
  predX: number;
  predZ: number;
  distToPad: number;
  gatesPassed: number;
  gateBonusScore: number;
  landed: boolean;
  result: LandingResult;
  score: number;
}

export interface RoverCollider {
  x: number;
  z: number;
  r: number;
  label: string;
  type: 'rock' | 'habitat' | 'lander' | 'station';
}

export interface RoverObjective {
  id: string;
  title: string;
  siteName: string;
  instrument: string;
  x: number;
  z: number;
  color: number;
  durationSec: number;
  progress: number;
  completed: boolean;
  reward: Partial<ResourceState>;
  rewardText: string;
  nasaFact: string;
}

export interface RoverState {
  x: number;
  y: number;
  z: number;
  headingRad: number;
  speed: number;
  steerAngleRad: number;
  pitchRad: number;
  rollRad: number;
  wheelAngle: number;
  walkPhase: number;
  wheelOffsets: [number, number, number, number];
  driveMode: RoverDriveMode;
  highClearance: boolean;
  headlightsOn: boolean;
  wheelSlipPct: number;
  hydrogenSignal: number;
  collisionLabel: string;
}

export interface OutpostEvent {
  id: string;
  title: string;
  description: string;
  resolvedChoice: string | null;
  scienceMultiplier: number;
}

export interface VehiclePartSpec {
  id: string;
  name: string;
  role: string;
  fact: string;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
  boost: boolean;
  tiltForward: boolean;
}
