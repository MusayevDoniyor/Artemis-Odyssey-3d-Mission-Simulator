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

export type SpaceCameraMode = 'overview' | 'focus' | 'orbit' | 'track' | 'free';

export type VehicleShowcaseId =
  | 'rocket'
  | 'satellite'
  | 'jwst'
  | 'voyager'
  | 'lander'
  | 'rover'
  | 'outpost';

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
  totalEvents30d?: number | null;
  cmeCount30d?: number;
  gstCount30d?: number;
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

export type LaunchPhaseStage =
  | 'PRE_LAUNCH'
  | 'SYSTEM_CHECK'
  | 'ENGINE_IGNITION'
  | 'THRUST_BUILDUP'
  | 'LIFTOFF'
  | 'INITIAL_ASCENT'
  | 'PITCH_PROGRAM'
  | 'MAX_Q'
  | 'BOOSTER_SEPARATION'
  | 'CORE_STAGE_SEPARATION'
  | 'UPPER_STAGE_OPERATION'
  | 'ORBITAL_INSERTION'
  | 'ORBIT_CONFIRMATION'
  | 'SPACECRAFT_DEPLOYMENT';

export type LaunchTimeWarp = 1 | 2 | 4;

export interface LaunchState {
  launchSequence: LaunchSequencePhase;
  phaseStage?: LaunchPhaseStage;
  countdownSec: number;
  autoGuidance: boolean;
  ignited: boolean;
  ignitionTimerSec?: number;
  physicsAccumulatorSec?: number;
  timeWarp?: LaunchTimeWarp;
  elapsed: number;
  altitudeKm: number;
  downrangeKm?: number;
  verticalSpeedMs: number;
  horizontalSpeedMs: number;
  netAccelMs2: number;
  thrustKn: number;
  dragKn: number;
  massKg: number;
  propellantMassKg?: number;
  massFlowRateKgS?: number;
  machNumber?: number;
  dynamicPressureKpa: number;
  pitchDeg: number;
  throttle: number;
  fuelPct: number;
  srbSeparated: boolean;
  coreSeparated: boolean;
  lasJettisoned: boolean;
  orbitReached: boolean;
  stagePrompt: string | null;
  twr: number;
  ispS: number;
  airDensityKgM3: number;
  deltaVExpendedMs: number;
  orbitalVelocityTargetMs: number;
  apoapsisKm: number;
  periapsisKm: number;
  orbitalEccentricity: number;
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

export type SpacecraftTrajectoryType =
  | 'Circular Orbit'
  | 'Elliptical Orbit'
  | 'Transfer Trajectory'
  | 'Hyperbolic Escape'
  | 'Rendezvous'
  | 'Flyby'
  | 'Landing Trajectory'
  | 'Station-Keeping';

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
  navBodyId?: string | null;
  trajectoryRegime?: SpacecraftTrajectoryType;
  orbitalSpeedKmS?: number;
  escapeVelocityKmS?: number;
  dominantBodyName?: string;
  orbitalEccentricity?: number;
  distanceFromSunAu?: number;
  distanceToTargetKm?: number;
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

export type LandingPhaseName = 'BRAKING' | 'APPROACH' | 'TERMINAL';

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
  targetThrottle: number;
  thrustKn: number;
  hoverThrottlePct: number;
  descentPhase: LandingPhaseName;
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
  slopeDeg: number;
  tGoSec: number;
  windSpeedMs: number;
  autoCutoff: boolean;
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
  throttleDown?: boolean;
  cutoff?: boolean;
  killDrift?: boolean;
}

export interface CrashFxState {
  active: boolean;
  kind: 'landing' | 'space' | 'rover' | 'launch';
  elapsed: number;
  x: number;
  y: number;
  z: number;
  planet: SurfacePlanet;
}

export interface PreLaunchChecks {
  powerBus: boolean;
  cryoChill: boolean;
  delugeArmed: boolean;
  crewArmClear: boolean;
}

export interface LeoTransferState {
  inParkingOrbit: boolean;
  orbitAltitudeKm: number;
  orbitalVelocityKmS: number;
  inclinationDeg: number;
  orbitalPeriodMin: number;
  tliBurnActive: boolean;
  tliBurnProgressPct: number;
  tliDeltaVAppliedMs: number;
  tliTargetDeltaVMs: number;
  readyForSpaceTransition: boolean;
  targetVelocityKmS?: number;
  escapeVelocityKmS?: number;
  apoapsisKm?: number;
  eccentricity?: number;
  fuelBurnedPct?: number;
}

export type MarsEdlStage =
  | 'CRUISE_SEP'
  | 'ENTRY_PLASMA'
  | 'PARACHUTE'
  | 'HEAT_SHIELD_DROP'
  | 'SKY_CRANE'
  | 'HANDOFF';

export interface MarsEdlState {
  active: boolean;
  stage: MarsEdlStage;
  stageTimerSec: number;
  signalDelayMin: number;
  commsBlackout: boolean;
  heatShieldDropped: boolean;
  parachuteDeployed: boolean;
  skyCraneLoweringPct: number;
}

export type PostLandingUnstowStage =
  | 'ENGINE_COOL'
  | 'CREW_CHECKLIST'
  | 'RAMP_DEPLOY'
  | 'ROVER_UNSTOW'
  | 'SYSTEMS_CHECK'
  | 'COMPLETE';

export interface PostLandingUnstowState {
  active: boolean;
  stage: PostLandingUnstowStage;
  planet: SurfacePlanet;
  stageElapsedSec: number;
  totalProgressPct: number;
  rampDeployPct: number;
  roverRolloutPct: number;
  mastDeployPct: number;
  completed: boolean;
}

export type TelemetrySpeedScale = 'KID_25X' | 'REAL_SPEED';

export type DrillSetting = 'GENTLE' | 'NOMINAL' | 'HIGH_TORQUE';

export interface DrillStratum {
  index: number;
  depthRangeCm: string;
  name: string;
  hardness: number;
  icePct: number;
  mineralNote: string;
  colorHex: string;
}

export interface DrillingConsoleState {
  open: boolean;
  objectiveId: string;
  objectiveTitle: string;
  planet: SurfacePlanet;
  depthCm: number;
  targetDepthCm: number;
  setting: DrillSetting;
  bitTempC: number;
  torquePct: number;
  jammed: boolean;
  overheated: boolean;
  coolingPulseSec: number;
  isDrilling: boolean;
  collectedStrata: number[];
  completed: boolean;
  statusNote: string;
}

export type AirlockStage =
  | 'EXTERIOR_OPEN'
  | 'REPRESSURIZING'
  | 'SEALED_INT'
  | 'DEPRESSURIZING';

export type OutpostInteriorRoom = 'quarters' | 'lab' | 'greenhouse' | 'comms';

export type PowerSourceMode = 'solar' | 'kilopower';

export interface OutpostConsoleState {
  open: boolean;
  planet: SurfacePlanet;
  airlockStage: AirlockStage;
  airlockProgressPct: number;
  activeRoom: OutpostInteriorRoom;
  powerSource: PowerSourceMode;
  solNumber: number;
  kilopowerActive: boolean;
}

export interface SolSummaryReport {
  solNumber: number;
  planet: SurfacePlanet;
  powerPct: number;
  oxygenPct: number;
  shieldPct: number;
  doseMsv: number;
  powerSource: PowerSourceMode;
  highlights: string[];
  recommendation: string;
}

export interface AudioSettings {
  muted: boolean;
  masterVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
}

export type QualityPreset = 'low' | 'med' | 'high';

export interface InspectorLabelPoint {
  partId: string;
  name: string;
  role?: string;
  xPct: number;
  yPct: number;
  anchorXPct?: number;
  anchorYPct?: number;
  visible: boolean;
}

export interface InspectorUiState {
  explodePct: number;
  isolatePart: boolean;
  showConnections: boolean;
  showLabels: boolean;
  autoRotate: boolean;
  quizMode: boolean;
  quizTargetId: string | null;
  quizFeedback: string | null;
  quizScore: number;
  hoveredPartId?: string | null;
  activeEduLevel?: 1 | 2 | 3;
  activeRightTab?: 'overview' | 'lab' | 'quiz';
  selectedSubEngine?: number | null;
  gimbalDeg?: number;
  stageSepStep?: number;
  deployPct?: number;
  propulsionThrottlePct?: number;
  focusNonce?: number;
  doubleClickZoom?: boolean;
}

export interface LandedPose {
  planet: SurfacePlanet;
  x: number;
  y: number;
  z: number;
  zoneId: number;
}

export interface MarsCommand {
  id: string;
  type: 'DRIVE_TO' | 'DRILL';
  x: number;
  z: number;
  label: string;
  objectiveId?: string;
}

export interface MarsQueueState {
  phase: 'IDLE' | 'TRANSMITTING' | 'EXECUTING';
  queue: MarsCommand[];
  activeIndex: number;
  txRemainingSec: number;
  txTotalSec: number;
  realDelayMin: number;
  statusMessage: string;
  plannedPath?: Array<{ x: number; z: number }>;
  avoidingObstacleLabel?: string | null;
  repathTimerSec?: number;
  stuckTimerSec?: number;
  reverseEscapeSec?: number;
  lastProgressDist?: number;
  lastPlannedGoalKey?: string;
}

export interface SurfaceWorldPrompt {
  id: string;
  kind: 'objective' | 'basecamp';
  title: string;
  subtitle: string;
  xPct: number;
  yPct: number;
  visible: boolean;
  distM: number;
  inRange: boolean;
  completed: boolean;
  progress: number;
  worldX: number;
  worldZ: number;
}

export type GameMenuTab =
  | 'map'
  | 'ledger'
  | 'achievements'
  | 'glossary'
  | 'settings';



