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

export type CampaignMissionId = 'artemis-2' | 'artemis-3' | 'artemis-4' | 'mars-pathfinder';

export type SurfacePlanet = 'moon' | 'mars';

export type CameraMode = 'chase' | 'cockpit' | 'overhead' | 'orbit';

export type VehicleShowcaseId = 'rocket' | 'lander' | 'rover' | 'outpost' | 'satellite';

export type PayloadId = 'heavy-shield' | 'oxygen-tanks' | 'solar-panels' | 'water-drill';

export type SpaceTargetId = 'relay-orbit' | 'moon' | 'gateway' | 'mars';

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

export interface OsdrStudy {
  accession: string;
  title: string;
  organism: string;
  radiationType: string;
  doseThresholdMsv: number;
  shieldingAttenuationPct: number;
  keyFinding: string;
  gameplayRule: string;
  uri: string;
}

export interface OsdrStatus {
  isLive: boolean;
  totalCatalogStudies: number;
  studies: OsdrStudy[];
}

export interface FieldNote {
  id: string;
  category: 'vehicle' | 'osdr' | 'donki' | 'isru';
  title: string;
  sourceRef: string;
  summary: string;
  appliedRule: string;
}

export interface AnomalyChoice {
  id: string;
  label: string;
  rationale: string;
  isOptimal: boolean;
  deltaResources: Partial<ResourceState>;
  doseDeltaMsv: number;
  scienceMultiplier: number;
}

export interface MissionAnomaly {
  id: string;
  missionId: CampaignMissionId;
  title: string;
  context: string;
  requiredNoteId: string;
  nasaRef: string;
  choices: AnomalyChoice[];
  resolvedChoiceId: string | null;
  resolvedSummary: string | null;
}

export interface CampaignCarryoverState {
  activeMission: CampaignMissionId;
  completedMissions: CampaignMissionId[];
  relaySatelliteOnline: boolean;
  highResMapUnlocked: boolean;
  isruWaterKg: number;
  isruFuelBonusPct: number;
  solarGridKw: number;
  regolithShieldLevel: number;
  radiationDoseMsv: number;
  marsSamplesCached: number;
  unlockedFieldNotes: string[];
  solvedAnomalies: string[];
}

export interface CampaignMissionSpec {
  id: CampaignMissionId;
  code: string;
  shortLabel: string;
  title: string;
  planet: SurfacePlanet;
  startPhase: GamePhase;
  hasSurfaceOps: boolean;
  nasaGrounding: string;
  objectiveSummary: string;
  reuseInput: string;
  reuseOutput: string;
}

export type LaunchSequencePhase = 'PRE_SIM' | 'COUNTDOWN' | 'READY' | 'ASCENDING';

export interface LaunchState {
  launchSequence: LaunchSequencePhase;
  countdownSec: number;
  autoGuidance: boolean;
  ignited: boolean;
  elapsed: number;
  altitudeKm: number;
  verticalSpeedMs: number;
  horizontalSpeedMs: number;
  netAccelMs2: number;
  thrustKn: number;
  dragKn: number;
  massKg: number;
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

export interface OrbitalSatState {
  deployed: boolean;
  satX: number;
  satZ: number;
  solarDeployedPct: number;
  dishAlignedPct: number;
  linkLocked: boolean;
  rotationErrorDeg: number;
  telemetrySignalPct: number;
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
  arrivedMars: boolean;
  arrivedGateway: boolean;
  inSatDeployZone: boolean;
  visitedTargets: SpaceTargetId[];
  orbitalSat: OrbitalSatState;
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
  planet: SurfacePlanet;
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
  planet: SurfacePlanet;
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
  isruWaterGainKg?: number;
  isruFuelGainPct?: number;
  solarGainKw?: number;
  shieldLevelGain?: number;
  marsSamplesGain?: number;
  unlockNoteId?: string;
  rewardText: string;
  nasaFact: string;
}

export interface RoverState {
  planet: SurfacePlanet;
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
  dustAccumulationPct: number;
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
  unlockNoteId?: string;
}

export interface InputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
  boost: boolean;
  tiltForward: boolean;
  stabilize: boolean;
}
