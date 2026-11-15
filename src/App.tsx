import { useCallback, useEffect, useRef, useState } from 'react';
import { BriefingOverlay } from './components/BriefingOverlay';
import { CalmFactToast } from './components/CalmFactToast';
import { CenteredEventCard } from './components/CenteredEventCard';
import { DrillingModal } from './components/DrillingModal';
import { FieldNotebookModal } from './components/FieldNotebookModal';
import { GameMenuModal } from './components/GameMenuModal';
import { LandingHUD } from './components/LandingHUD';
import { LaunchHUD } from './components/LaunchHUD';
import { LearnObjectModal } from './components/LearnObjectModal';
import { MobileAcademyView } from './components/MobileAcademyView';
import { NasaDataModal } from './components/NasaDataModal';
import { OutcomeModal } from './components/OutcomeModal';
import { OutpostConsoleModal } from './components/OutpostConsoleModal';
import { RoverHUD } from './components/RoverHUD';
import { SpaceFlightHUD } from './components/SpaceFlightHUD';
import { TitleOverlay } from './components/TitleOverlay';
import { VehicleInspectorOverlay } from './components/VehicleInspectorOverlay';
import { WorldTargetPins } from './components/WorldTargetPins';
import { soundSynth } from './game/audio';
import {
  CAMPAIGN_ANOMALIES,
  CAMPAIGN_MISSIONS,
  CAMPAIGN_ORDER,
  LAUNCH_PART_DETAILS,
  PAYLOADS,
  getLandingZones,
  getPlanetObjectives,
} from './game/constants';
import {
  createInitialDrillingState,
  purgeAndCoolDrill,
  setDrillSetting,
  stepDrillingConsole,
} from './game/drilling';
import { CONTEXTUAL_FACTS, type ContextualFact, type FactContextKey } from './game/factsAndGlossary';
import { HARDWARE_CATALOG } from './game/hardwareCatalog';
import {
  createInitialLearnModalState,
  getLearnModuleForObjective,
  type LearnModalState,
} from './game/learningModules';
import {
  clearMarsQueue,
  createInitialMarsQueueState,
  enqueueMarsWaypoint,
  removeLastMarsCommand,
  shouldShowDidYouKnowToast,
  stepMarsQueue,
  transmitMarsQueue,
} from './game/marsQueue';
import {
  createInitialOutpostConsoleState,
  stepAirlockCycle,
  switchOutpostPowerSource,
  toggleOutpostAirlock,
} from './game/outpost';
import {
  applyAnomalyDecision,
  beginLaunchCountdown,
  clamp,
  createInitialCampaignCarryover,
  createInitialLandingState,
  createInitialLaunchState,
  createInitialRoverState,
  createInitialSpaceFlightState,
  getSurfaceTerrainHeight,
  separateLaunchStage,
  stepLandingPhysics,
  stepLaunchPhysics,
  stepRoverPhysics,
  stepSpaceFlightPhysics,
} from './game/physics';
import {
  createInitialLeoTransferState,
  createInitialMarsEdlState,
  createInitialPreLaunchChecks,
  createInitialUnstowState,
  fastForwardMarsEdl,
  fastForwardUnstow,
  shouldTriggerApollo1202Alarm,
  stepLeoTransfer,
  stepMarsEdlSequence,
  stepUnstowSequence,
} from './game/sequences';
import { SOLAR_SYSTEM_BODIES, type SolarScaleMode } from './game/solarSystemData';
import type {
  AudioSettings,
  CameraMode,
  CampaignCarryoverState,
  CampaignMissionId,
  DonkiStatus,
  DrillSetting,
  DrillingConsoleState,
  GameMenuTab,
  GamePhase,
  InputState,
  InspectorLabelPoint,
  InspectorUiState,
  LandingGuidanceMode,
  LandingState,
  LaunchState,
  LeoTransferState,
  MarsEdlState,
  MarsQueueState,
  MissionAnomaly,
  OsdrStatus,
  OutpostConsoleState,
  OutpostInteriorRoom,
  PayloadId,
  PostLandingUnstowState,
  PowerSourceMode,
  PreLaunchChecks,
  QualityPreset,
  ResourceState,
  RoverDriveMode,
  RoverObjective,
  RoverState,
  SpaceFlightState,
  SpaceTargetId,
  SurfacePlanet,
  SurfaceWorldPrompt,
  TelemetrySpeedScale,
  VehicleShowcaseId,
} from './game/types';
import {
  getLandingWarnings,
  getLaunchWarnings,
  getRoverWarnings,
  getSpaceWarnings,
} from './game/warnings';
import { SpaceSceneManager, type SceneSimulationBridge } from './three/SpaceSceneManager';

const DEFAULT_DONKI: DonkiStatus = {
  isLive: false,
  status: 'archived',
  classType: 'M2.4 Nominal',
  beginTime: '',
  sourceLocation: 'Solar Disk',
  link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  description: 'NASA DONKI solar flare telemetry active.',
};

const DEFAULT_OSDR: OsdrStatus = {
  isLive: false,
  totalCatalogStudies: 4,
  studies: [],
};

const DEFAULT_INSPECTOR_UI: InspectorUiState = {
  explodePct: 0,
  isolatePart: false,
  showConnections: false,
  showLabels: false,
  autoRotate: false,
  quizMode: false,
  quizTargetId: null,
  quizFeedback: null,
  quizScore: 0,
};

const EMPTY_INPUT: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  action: false,
  boost: false,
  tiltForward: false,
  stabilize: false,
  throttleDown: false,
  cutoff: false,
  killDrift: false,
};

function clonePlanetObjectives(planet: SurfacePlanet): RoverObjective[] {
  return getPlanetObjectives(planet).map((o) => ({
    ...o,
    reward: { ...o.reward },
    progress: 0,
    completed: false,
  }));
}

function cloneAnomalyForMission(missionId: CampaignMissionId): MissionAnomaly | null {
  const found = CAMPAIGN_ANOMALIES.find((a) => a.missionId === missionId);
  if (!found) return null;
  return {
    ...found,
    choices: found.choices.map((c) => ({ ...c, deltaResources: { ...c.deltaResources } })),
    resolvedChoiceId: null,
    resolvedSummary: null,
  };
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneMgrRef = useRef<SpaceSceneManager | null>(null);

  const isAutostart =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';

  const carryoverRef = useRef<CampaignCarryoverState>(createInitialCampaignCarryover());

  const simRef = useRef<SceneSimulationBridge>({
    phase: isAutostart ? 'launch' : 'title',
    campaignMission: 'artemis-2',
    planet: 'moon',
    paused: false,
    cameraMode: 'chase',
    showcase: 'outpost',
    highlightedPart: null,
    donkiFlareActive: false,
    orbitYaw: 0.63,
    orbitPitch: 0.25,
    orbitDistance: isAutostart ? 38 : 24,
    userOrbitActive: false,
    activeDrillingId: null,
    crashFx: { active: false, kind: 'landing', elapsed: 0, x: 0, y: 0, z: 0, planet: 'moon' },
    launch: createInitialLaunchState(),
    space: createInitialSpaceFlightState('artemis-2'),
    landing: createInitialLandingState(PAYLOADS['oxygen-tanks'].massMultiplier, 'moon'),
    rover: createInitialRoverState(6, 6, 'moon'),
    resources: { power: 75, oxygen: 75, shield: 70 },
    objectives: clonePlanetObjectives('moon'),
    input: { ...EMPTY_INPUT },
    freeExploreMode: false,
    inspector: { ...DEFAULT_INSPECTOR_UI },
    leoTransfer: createInitialLeoTransferState(),
    marsEdl: createInitialMarsEdlState('moon'),
    unstow: null,
    landedPose: null,
    mastPanRad: 0,
    kilopowerActive: false,
    solarScaleMode: 'exploration',
    solarEpochYears: 0,
    focusedSolarBodyId: null,
    quality: 'high',
  });

  const payloadRef = useRef<PayloadId>('oxygen-tanks');
  const scoreRef = useRef<number>(0);
  const activeAnomalyRef = useRef<MissionAnomaly | null>(null);
  const phaseTimerRef = useRef<number>(0);
  const scienceMultRef = useRef<number>(1.0);
  const discoveryObjRef = useRef<RoverObjective | null>(null);
  const failReasonRef = useRef<string>('');
  const lastUiSyncRef = useRef<number>(0);
  const lastDrillSoundRef = useRef<number>(0);
  const lastRoverDriveSoundRef = useRef<number>(0);
  const launchPrevCountdownDigitRef = useRef<number>(4);

  const apollo1202TriggeredRef = useRef<boolean>(false);
  const apollo1202ClearedRef = useRef<boolean>(false);
  const drillingConsoleRef = useRef<DrillingConsoleState | null>(null);
  const learnModalRef = useRef<LearnModalState | null>(null);
  const outpostConsoleRef = useRef<OutpostConsoleState>(createInitialOutpostConsoleState('moon'));
  const marsQueueRef = useRef<MarsQueueState>(createInitialMarsQueueState(14));
  const mastPanDegRef = useRef<number>(0);
  const solarTimeSpeedRef = useRef<number>(0.8);
  const calmElapsedRef = useRef<number>(0);
  const toastVisibleSecRef = useRef<number>(0);
  const toastFactIndexRef = useRef<number>(0);
  const activeToastRef = useRef<ContextualFact | null>(null);

  const [phase, setPhase] = useState<GamePhase>(simRef.current.phase);
  const [paused, setPaused] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [menuTab, setMenuTab] = useState<GameMenuTab>('map');
  const [muted, setMuted] = useState<boolean>(false);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => soundSynth.getSettings());
  const [qualityPreset, setQualityPreset] = useState<QualityPreset>('high');
  const [freeExploreMode, setFreeExploreMode] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [showcase, setShowcase] = useState<VehicleShowcaseId>('outpost');
  const [highlightedPart, setHighlightedPart] = useState<string | null>(null);
  const [inspectorUi, setInspectorUi] = useState<InspectorUiState>({ ...DEFAULT_INSPECTOR_UI });
  const [inspectorLabels, setInspectorLabels] = useState<InspectorLabelPoint[]>([]);
  const [selectedPayload, setSelectedPayload] = useState<PayloadId>('oxygen-tanks');
  const [donki, setDonki] = useState<DonkiStatus>(DEFAULT_DONKI);
  const [osdr, setOsdr] = useState<OsdrStatus>(DEFAULT_OSDR);
  const [nasaModalOpen, setNasaModalOpen] = useState<boolean>(false);
  const [fieldNotebookOpen, setFieldNotebookOpen] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 1024
  );
  const modalOpenRef = useRef<boolean>(false);
  const menuOpenRef = useRef<boolean>(false);
  const prevGatesPassedRef = useRef<number>(0);

  const [preLaunchChecks, setPreLaunchChecks] = useState<PreLaunchChecks>(() =>
    createInitialPreLaunchChecks()
  );
  const [leoTransferUi, setLeoTransferUi] = useState<LeoTransferState>(() =>
    createInitialLeoTransferState()
  );
  const [marsEdlUi, setMarsEdlUi] = useState<MarsEdlState>(() =>
    createInitialMarsEdlState('moon')
  );
  const [unstowUi, setUnstowUi] = useState<PostLandingUnstowState | null>(null);
  const [apollo1202Active, setApollo1202Active] = useState<boolean>(false);
  const [marsQueueUi, setMarsQueueUi] = useState<MarsQueueState>(marsQueueRef.current);
  const [worldPrompts, setWorldPrompts] = useState<SurfaceWorldPrompt[]>([]);
  const [activeToastFact, setActiveToastFact] = useState<ContextualFact | null>(null);

  const [speedScale, setSpeedScale] = useState<TelemetrySpeedScale>('KID_25X');
  const [drillingConsoleUi, setDrillingConsoleUi] = useState<DrillingConsoleState | null>(null);
  const [learnModalUi, setLearnModalUi] = useState<LearnModalState | null>(null);
  const [outpostConsoleUi, setOutpostConsoleUi] = useState<OutpostConsoleState>(() =>
    createInitialOutpostConsoleState('moon')
  );

  const [solarScaleMode, setSolarScaleMode] = useState<SolarScaleMode>('exploration');
  const [solarTimeSpeed, setSolarTimeSpeed] = useState<number>(0.8);
  const [solarEpochYearsUi, setSolarEpochYearsUi] = useState<number>(0);
  const [focusedSolarBodyId, setFocusedSolarBodyId] = useState<string | null>(null);
  const [exploredSolarBodyIds, setExploredSolarBodyIds] = useState<string[]>(['earth']);
  const [selectedBodyPin, setSelectedBodyPin] = useState<{
    xPct: number;
    yPct: number;
    visible: boolean;
  } | null>(null);

  useEffect(() => {
    modalOpenRef.current =
      nasaModalOpen ||
      fieldNotebookOpen ||
      Boolean(drillingConsoleUi?.open) ||
      Boolean(learnModalUi?.open) ||
      outpostConsoleUi.open;
  }, [nasaModalOpen, fieldNotebookOpen, drillingConsoleUi, learnModalUi, outpostConsoleUi]);

  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  useEffect(() => {
    const onResize = () => {
      const nextDesktop = window.innerWidth >= 1024;
      setIsDesktop(nextDesktop);
      if (!nextDesktop) {
        soundSynth.setThrustVolume(0);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [carryoverUi, setCarryoverUi] = useState<CampaignCarryoverState>(carryoverRef.current);
  const [launchUi, setLaunchUi] = useState<LaunchState>(simRef.current.launch);
  const [spaceUi, setSpaceUi] = useState<SpaceFlightState>(simRef.current.space);
  const [landingUi, setLandingUi] = useState<LandingState>(simRef.current.landing);
  const [roverUi, setRoverUi] = useState<RoverState>(simRef.current.rover);
  const [resourcesUi, setResourcesUi] = useState<ResourceState>(simRef.current.resources);
  const [objectivesUi, setObjectivesUi] = useState<RoverObjective[]>(simRef.current.objectives);
  const [roverInputUi, setRoverInputUi] = useState<
    Pick<InputState, 'forward' | 'backward' | 'left' | 'right'>
  >({
    forward: false,
    backward: false,
    left: false,
    right: false,
  });
  const [activeAnomalyUi, setActiveAnomalyUi] = useState<MissionAnomaly | null>(null);
  const [discoveryObjUi, setDiscoveryObjUi] = useState<RoverObjective | null>(null);
  const [scoreUi, setScoreUi] = useState<number>(0);
  const [failReason, setFailReason] = useState<string>('');

  const syncUiNow = useCallback(() => {
    const s = simRef.current;
    setPhase(s.phase);
    setPaused(s.paused);
    setCameraMode(s.cameraMode);
    setShowcase(s.showcase);
    setHighlightedPart(s.highlightedPart);
    if (s.inspector) {
      setInspectorUi({ ...s.inspector });
    }
    setCarryoverUi({
      ...carryoverRef.current,
      completedMissions: [...carryoverRef.current.completedMissions],
      unlockedFieldNotes: [...carryoverRef.current.unlockedFieldNotes],
      solvedAnomalies: [...carryoverRef.current.solvedAnomalies],
    });
    setLaunchUi({ ...s.launch });
    if (s.leoTransfer) setLeoTransferUi({ ...s.leoTransfer });
    if (s.marsEdl) setMarsEdlUi({ ...s.marsEdl });
    setUnstowUi(s.unstow ? { ...s.unstow } : null);
    setSpaceUi({ ...s.space, orbitalSat: { ...s.space.orbitalSat } });
    setLandingUi({ ...s.landing });
    setRoverUi({ ...s.rover });
    setResourcesUi({ ...s.resources });
    setObjectivesUi(s.objectives.map((o) => ({ ...o })));
    setRoverInputUi({
      forward: s.input.forward,
      backward: s.input.backward,
      left: s.input.left,
      right: s.input.right,
    });
    setActiveAnomalyUi(activeAnomalyRef.current ? { ...activeAnomalyRef.current } : null);
    setDiscoveryObjUi(discoveryObjRef.current ? { ...discoveryObjRef.current } : null);
    setDrillingConsoleUi(drillingConsoleRef.current ? { ...drillingConsoleRef.current } : null);
    setLearnModalUi(learnModalRef.current ? { ...learnModalRef.current } : null);
    setOutpostConsoleUi({ ...outpostConsoleRef.current });
    setMarsQueueUi({ ...marsQueueRef.current });
    setScoreUi(scoreRef.current);
    setFailReason(failReasonRef.current);
  }, []);

  const openMenuWithTab = useCallback((tab: GameMenuTab) => {
    simRef.current.paused = true;
    menuOpenRef.current = true;
    setMenuTab(tab);
    setMenuOpen(true);
    setPaused(true);
    soundSynth.init();
    soundSynth.playClick();
  }, []);

  const closeMenu = useCallback(() => {
    simRef.current.paused = false;
    menuOpenRef.current = false;
    setMenuOpen(false);
    setPaused(false);
    soundSynth.playClick();
  }, []);

  const unlockFieldNote = useCallback((noteId?: string) => {
    if (!noteId) return;
    if (!carryoverRef.current.unlockedFieldNotes.includes(noteId)) {
      carryoverRef.current = {
        ...carryoverRef.current,
        unlockedFieldNotes: [...carryoverRef.current.unlockedFieldNotes, noteId],
      };
    }
  }, []);

  const markMissionComplete = useCallback((id: CampaignMissionId) => {
    if (!carryoverRef.current.completedMissions.includes(id)) {
      carryoverRef.current = {
        ...carryoverRef.current,
        completedMissions: [...carryoverRef.current.completedMissions, id],
      };
    }
  }, []);

  const completeObjectiveWithRewards = useCallback(
    (objId: string) => {
      const s = simRef.current;
      const target = s.objectives.find((o) => o.id === objId);
      if (!target || target.completed) return;

      target.completed = true;
      target.progress = 1;
      s.activeDrillingId = null;
      s.resources.power = clamp(s.resources.power + (target.reward.power || 0), 0, 100);
      s.resources.oxygen = clamp(s.resources.oxygen + (target.reward.oxygen || 0), 0, 100);
      s.resources.shield = clamp(s.resources.shield + (target.reward.shield || 0), 0, 100);
      scoreRef.current += 800;

      carryoverRef.current = {
        ...carryoverRef.current,
        isruWaterKg: carryoverRef.current.isruWaterKg + (target.isruWaterGainKg || 0),
        isruFuelBonusPct: Math.min(
          45,
          carryoverRef.current.isruFuelBonusPct + (target.isruFuelGainPct || 0)
        ),
        solarGridKw: carryoverRef.current.solarGridKw + (target.solarGainKw || 0),
        regolithShieldLevel:
          carryoverRef.current.regolithShieldLevel + (target.shieldLevelGain || 0),
        marsSamplesCached:
          carryoverRef.current.marsSamplesCached + (target.marsSamplesGain || 0),
      };
      unlockFieldNote(target.unlockNoteId);
      soundSynth.playSuccess();

      const allDone = s.objectives.every((o) => o.completed);
      if (allDone) {
        scoreRef.current += Math.round(
          (s.resources.power + s.resources.oxygen + s.resources.shield) * 8
        );
        markMissionComplete(s.rover.planet === 'mars' ? 'mars-pathfinder' : 'artemis-3');
        s.phase = 'victory';
      } else {
        discoveryObjRef.current = { ...target };
      }
      syncUiNow();
    },
    [markMissionComplete, syncUiNow, unlockFieldNote]
  );

  // Update body[data-state] for deterministic automation/accessibility state checks
  useEffect(() => {
    if (!isDesktop) {
      document.body.dataset.state = 'mobile-academy';
      return;
    }
    let bodyState = 'playing';
    if (phase === 'title') bodyState = 'title';
    else if (phase === 'gameover' || phase === 'victory') bodyState = 'gameover';
    else if (paused || nasaModalOpen || fieldNotebookOpen || discoveryObjUi || learnModalUi?.open) {
      bodyState = 'paused';
    }
    document.body.dataset.state = bodyState;
  }, [isDesktop, phase, paused, nasaModalOpen, fieldNotebookOpen, discoveryObjUi, learnModalUi]);

  // Fetch live NASA DONKI + OSDR telemetry
  useEffect(() => {
    fetch('/api/donki')
      .then((r) => r.json())
      .then((data: DonkiStatus) => {
        setDonki(data);
        const flareHeavy = /M|X/i.test(data.classType || '');
        simRef.current.donkiFlareActive = flareHeavy;
      })
      .catch(() => {});

    fetch('/api/osdr')
      .then((r) => r.json())
      .then((data: OsdrStatus) => {
        setOsdr(data);
      })
      .catch(() => {});
  }, []);

  const applyPayloadBonus = useCallback((id: PayloadId): ResourceState => {
    const p = PAYLOADS[id];
    const solarBonus = Math.min(18, Math.round(carryoverRef.current.solarGridKw * 0.25));
    const bermBonus = Math.min(16, carryoverRef.current.regolithShieldLevel * 8);
    return {
      power: clamp(75 + (p.bonus.power || 0) + solarBonus, 0, 100),
      oxygen: clamp(75 + (p.bonus.oxygen || 0), 0, 100),
      shield: clamp(70 + (p.bonus.shield || 0) + bermBonus, 0, 100),
    };
  }, []);

  const selectCampaignMission = useCallback(
    (id: CampaignMissionId) => {
      const spec = CAMPAIGN_MISSIONS[id];
      carryoverRef.current = {
        ...carryoverRef.current,
        activeMission: id,
      };
      simRef.current.campaignMission = id;
      simRef.current.planet = spec.planet;
      syncUiNow();
    },
    [syncUiNow]
  );

  const jumpToPhase = useCallback(
    (targetPhase: GamePhase, planetOverride?: SurfacePlanet) => {
      soundSynth.init();
      soundSynth.playClick();
      soundSynth.resetAtmosphere();
      const s = simRef.current;
      const payload = PAYLOADS[payloadRef.current];
      const activeSpec = CAMPAIGN_MISSIONS[carryoverRef.current.activeMission];
      const targetPlanet = planetOverride || activeSpec.planet || s.planet;

      s.paused = false;
      s.planet = targetPlanet;
      s.input = { ...EMPTY_INPUT };
      s.activeDrillingId = null;
      s.crashFx = { active: false, kind: 'landing', elapsed: 0, x: 0, y: 0, z: 0, planet: targetPlanet };
      s.userOrbitActive = false;
      discoveryObjRef.current = null;
      activeAnomalyRef.current = null;
      drillingConsoleRef.current = null;
      learnModalRef.current = null;
      outpostConsoleRef.current = createInitialOutpostConsoleState(targetPlanet);
      s.kilopowerActive = false;
      phaseTimerRef.current = 0;
      failReasonRef.current = '';

      apollo1202TriggeredRef.current = false;
      apollo1202ClearedRef.current = false;
      setApollo1202Active(false);

      marsQueueRef.current = createInitialMarsQueueState(14);
      setMarsQueueUi(marsQueueRef.current);
      setWorldPrompts([]);
      menuOpenRef.current = false;
      setMenuOpen(false);
      activeToastRef.current = null;
      setActiveToastFact(null);
      calmElapsedRef.current = 0;
      toastVisibleSecRef.current = 0;

      if (targetPhase !== 'space') {
        s.focusedSolarBodyId = null;
        setFocusedSolarBodyId(null);
        setSelectedBodyPin(null);
      }

      if (targetPhase === 'title') {
        s.phase = 'title';
        s.freeExploreMode = false;
        setFreeExploreMode(false);
        s.showcase = 'outpost';
        s.highlightedPart = null;
        s.orbitYaw = 0.63;
        s.orbitPitch = 0.25;
        s.orbitDistance = 24;
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'inspector') {
        s.phase = 'inspector';
        s.showcase = 'rocket';
        const craft = HARDWARE_CATALOG.rocket;
        const firstPart = craft.parts[0];
        s.highlightedPart = firstPart.id;
        s.inspector = { ...DEFAULT_INSPECTOR_UI };
        setInspectorLabels([]);
        unlockFieldNote(firstPart.unlockNoteId);
        s.orbitYaw = 0.65;
        s.orbitPitch = 0.18;
        s.orbitDistance = craft.defaultCameraDist;
        s.userOrbitActive = true;
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'briefing') {
        s.phase = 'briefing';
        s.orbitYaw = 0.62;
        s.orbitPitch = 0.26;
        s.orbitDistance = 28;
        s.resources = { power: 75, oxygen: 75, shield: 70 };
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'launch') {
        s.phase = 'launch';
        s.highlightedPart = null;
        s.orbitYaw = 0.52;
        s.orbitPitch = 0.12;
        s.orbitDistance = 38;
        s.resources = applyPayloadBonus(payloadRef.current);
        s.launch = createInitialLaunchState(s.launch.autoGuidance);
        s.leoTransfer = createInitialLeoTransferState();
        setPreLaunchChecks(createInitialPreLaunchChecks());
        launchPrevCountdownDigitRef.current = 4;
        scoreRef.current = 0;
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'space') {
        s.phase = 'space';
        s.solarEpochYears = 0;
        setSolarEpochYearsUi(0);
        if (s.freeExploreMode) {
          s.focusedSolarBodyId = 'earth';
          setFocusedSolarBodyId('earth');
          s.orbitYaw = 0.35;
          s.orbitPitch = 0.34;
          s.orbitDistance = 30;
        } else {
          s.focusedSolarBodyId = null;
          setFocusedSolarBodyId(null);
          s.orbitYaw = 0.55;
          s.orbitPitch = 0.48;
          s.orbitDistance = 22;
        }
        s.resources = applyPayloadBonus(payloadRef.current);
        s.space = createInitialSpaceFlightState(s.campaignMission, carryoverRef.current);
      } else if (targetPhase === 'landing') {
        s.phase = 'landing';
        s.cameraMode = 'chase';
        s.orbitYaw = 0.54;
        s.orbitPitch = 0.26;
        s.orbitDistance = 28;
        s.resources = applyPayloadBonus(payloadRef.current);
        s.landing = createInitialLandingState(
          payload.massMultiplier,
          targetPlanet,
          carryoverRef.current.isruFuelBonusPct
        );
        s.marsEdl = createInitialMarsEdlState(targetPlanet);
        s.unstow = null;
        prevGatesPassedRef.current = 0;
      } else if (targetPhase === 'rover') {
        s.phase = 'rover';
        s.cameraMode = 'chase';
        s.orbitYaw = 0.6;
        s.orbitPitch = 0.24;
        s.orbitDistance = 5.4;
        s.resources = applyPayloadBonus(payloadRef.current);
        s.rover = createInitialRoverState(6, 6, targetPlanet);
        s.landedPose = { planet: targetPlanet, x: 0, y: 0, z: 0, zoneId: 0 };
        s.unstow = null;
        mastPanDegRef.current = 0;
        s.mastPanRad = 0;
        sceneMgrRef.current?.resetWheelTracks();
        s.objectives = clonePlanetObjectives(targetPlanet);
        scienceMultRef.current = 1.0;
      }
      syncUiNow();
    },
    [applyPayloadBonus, syncUiNow, unlockFieldNote]
  );

  const startActiveMission = useCallback(() => {
    const spec = CAMPAIGN_MISSIONS[carryoverRef.current.activeMission];
    scoreRef.current = 0;
    simRef.current.freeExploreMode = false;
    setFreeExploreMode(false);
    jumpToPhase(spec.startPhase, spec.planet);
  }, [jumpToPhase]);

  const handleStartFreeExplore = useCallback(() => {
    simRef.current.freeExploreMode = true;
    setFreeExploreMode(true);
    scoreRef.current = 0;
    jumpToPhase('space', 'moon');
  }, [jumpToPhase]);

  const handleFocusSolarBody = useCallback((bodyId: string | null) => {
    const s = simRef.current;
    s.focusedSolarBodyId = bodyId;
    s.userOrbitActive = false;
    setFocusedSolarBodyId(bodyId);
    if (bodyId) {
      const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === bodyId);
      const isSci = s.solarScaleMode === 'scientific';
      const baseSize =
        (bodyId === 'sun' ? 11.4 : bodyId === 'earth' ? 4.8 : spec?.explorationBodySize ?? 2.5) *
        (isSci ? 0.5 : 1);
      s.orbitYaw = bodyId === 'earth' ? 0.35 : 0.52;
      s.orbitPitch = bodyId === 'earth' ? 0.34 : 0.32;
      s.orbitDistance =
        bodyId === 'sun'
          ? isSci
            ? 24
            : 44
          : bodyId === 'earth'
            ? isSci
              ? 16
              : 30
            : Math.max(isSci ? 7.5 : 11, baseSize * 4.6);
      setExploredSolarBodyIds((prev) => (prev.includes(bodyId) ? prev : [...prev, bodyId]));
    } else {
      setSelectedBodyPin(null);
      s.orbitYaw = 0.55;
      s.orbitPitch = 0.48;
      s.orbitDistance = 22;
    }
    soundSynth.init();
    soundSynth.playClick();
  }, []);

  const handleExploreSolarBody = useCallback(
    (bodyId: string) => {
      setExploredSolarBodyIds((prev) => (prev.includes(bodyId) ? prev : [...prev, bodyId]));
      if (bodyId === 'mars') {
        jumpToPhase('landing', 'mars');
        return;
      }
      if (bodyId === 'earth' || bodyId === 'moon') {
        jumpToPhase('landing', 'moon');
        return;
      }
      const s = simRef.current;
      const spec = SOLAR_SYSTEM_BODIES.find((b) => b.id === bodyId);
      const baseSize = bodyId === 'sun' ? 11.4 : spec?.explorationBodySize ?? 2.5;
      s.focusedSolarBodyId = bodyId;
      s.userOrbitActive = false;
      setFocusedSolarBodyId(bodyId);
      s.orbitYaw = 0.42;
      s.orbitPitch = 0.22;
      s.orbitDistance = bodyId === 'sun' ? 28 : Math.max(8.5, baseSize * 2.9);
      soundSynth.init();
      soundSynth.playClick();
    },
    [jumpToPhase]
  );

  const handleFlyToSolarBody = useCallback(
    (bodyId: string) => {
      const s = simRef.current;
      s.space.navBodyId = bodyId;
      s.space.autoPilot = true;
      s.focusedSolarBodyId = null;
      s.userOrbitActive = false;
      setFocusedSolarBodyId(null);
      setSelectedBodyPin(null);
      s.orbitYaw = 0.55;
      s.orbitPitch = 0.48;
      s.orbitDistance = 22;
      setExploredSolarBodyIds((prev) => (prev.includes(bodyId) ? prev : [...prev, bodyId]));
      soundSynth.init();
      soundSynth.playClick();
      syncUiNow();
    },
    [syncUiNow]
  );

  const handleOpenLearnForObjective = useCallback(
    (obj: RoverObjective) => {
      if (obj.completed) return;
      const existing = learnModalRef.current;
      if (existing && existing.objectiveId === obj.id) {
        learnModalRef.current = { ...existing, open: true };
      } else {
        learnModalRef.current = createInitialLearnModalState(obj);
      }
      soundSynth.playClick();
      syncUiNow();
    },
    [syncUiNow]
  );

  // Per-frame physics + game progression loop
  const onFrameTick = useCallback(
    (dt: number) => {
      const s = simRef.current;

      // Active engineering consoles (Drill & Outpost Airlock) still animate when modal is open
      if (!s.paused) {
        if (drillingConsoleRef.current?.open) {
          const drillBoost = PAYLOADS[payloadRef.current].drillBoost;
          const prevDrill = drillingConsoleRef.current;
          const nextDrill = stepDrillingConsole(prevDrill, dt, drillBoost);
          drillingConsoleRef.current = nextDrill;
          if (nextDrill.isDrilling && performance.now() - lastDrillSoundRef.current > 140) {
            lastDrillSoundRef.current = performance.now();
            soundSynth.playDrillTick();
          }
          if (!prevDrill.jammed && nextDrill.jammed) {
            soundSynth.playCautionAlarm();
          }
          if (!prevDrill.overheated && nextDrill.overheated) {
            soundSynth.playCautionAlarm();
          }
        }
        if (outpostConsoleRef.current.open) {
          outpostConsoleRef.current = stepAirlockCycle(outpostConsoleRef.current, dt);
        }
      }

      if (s.paused || modalOpenRef.current || menuOpenRef.current || discoveryObjRef.current) {
        soundSynth.setThrustVolume(0);
        const nowModal = performance.now();
        if (nowModal - lastUiSyncRef.current > 90) {
          lastUiSyncRef.current = nowModal;
          if (drillingConsoleRef.current?.open) {
            setDrillingConsoleUi({ ...drillingConsoleRef.current });
          }
          if (outpostConsoleRef.current.open) {
            setOutpostConsoleUi({ ...outpostConsoleRef.current });
          }
        }
        return;
      }

      // Active 3D crash breakup animation before revealing Mission Abort modal
      if (s.crashFx.active) {
        soundSynth.setThrustVolume(0);
        if (s.phase !== 'gameover') {
          s.crashFx.elapsed += dt;
          if (s.crashFx.elapsed >= 1.65) {
            s.phase = 'gameover';
            syncUiNow();
          }
          return;
        }
        if (s.crashFx.elapsed < 3.0) {
          s.crashFx.elapsed += dt;
        }
        return;
      }

      if (s.phase === 'launch') {
        const prevSeq = s.launch.launchSequence;
        const launchInput =
          prevSeq === 'PRE_SIM' || prevSeq === 'COUNTDOWN'
            ? { ...s.input, forward: false, action: false, stabilize: false }
            : s.input;
        s.launch = stepLaunchPhysics(s.launch, launchInput, dt);
        soundSynth.setLaunchAtmosphere(s.launch.altitudeKm, s.launch.dynamicPressureKpa);

        if (s.launch.launchSequence === 'COUNTDOWN') {
          const digit = Math.max(1, Math.ceil(s.launch.countdownSec));
          if (digit !== launchPrevCountdownDigitRef.current) {
            launchPrevCountdownDigitRef.current = digit;
            soundSynth.playCountdownBeep(false);
          }
        } else if (prevSeq === 'COUNTDOWN' && s.launch.launchSequence === 'READY') {
          soundSynth.playCountdownBeep(true);
          syncUiNow();
        } else if (prevSeq === 'READY' && s.launch.launchSequence === 'ASCENDING') {
          soundSynth.playIgnitionRoar();
          syncUiNow();
        }

        if (s.launch.orbitReached) {
          const leo = s.leoTransfer || createInitialLeoTransferState();
          const wasInOrbit = leo.inParkingOrbit;
          const nextLeo = stepLeoTransfer(leo, dt, true);
          s.leoTransfer = nextLeo;

          if (!wasInOrbit) {
            soundSynth.playSuccess();
            syncUiNow();
          }

          soundSynth.setThrustVolume(nextLeo.tliBurnActive ? 0.52 : 0);

          if (nextLeo.readyForSpaceTransition) {
            soundSynth.setThrustVolume(0);
            soundSynth.resetAtmosphere();
            soundSynth.playSuccess();
            scoreRef.current += 500;
            s.phase = 'space';
            s.userOrbitActive = false;
            s.orbitYaw = 0.55;
            s.orbitPitch = 0.48;
            s.orbitDistance = 22;
            phaseTimerRef.current = 0;
            activeAnomalyRef.current = null;
            s.solarEpochYears = 0;
            s.space = createInitialSpaceFlightState(s.campaignMission, carryoverRef.current);
            syncUiNow();
            return;
          }
        } else {
          soundSynth.setThrustVolume(s.launch.ignited && s.launch.fuelPct > 0 ? s.launch.throttle : 0);
        }
      } else if (s.phase === 'space') {
        const prevTargets = s.space.visitedTargets.length;
        const prevSatLocked = s.space.orbitalSat.linkLocked;
        const result = stepSpaceFlightPhysics(
          s.space,
          s.resources,
          s.input,
          s.donkiFlareActive,
          dt,
          s.solarEpochYears ?? 0,
          s.solarScaleMode ?? 'exploration'
        );
        s.space = result.space;
        s.resources = result.resources;
        s.solarEpochYears = (s.solarEpochYears ?? 0) + dt * solarTimeSpeedRef.current * 0.08;
        phaseTimerRef.current += dt;

        // Trigger orbital Applied Knowledge Anomaly in Artemis II or Artemis IV
        if (
          !activeAnomalyRef.current &&
          (s.campaignMission === 'artemis-2' || s.campaignMission === 'artemis-4') &&
          phaseTimerRef.current > 2.8
        ) {
          const anom = cloneAnomalyForMission(s.campaignMission);
          if (anom && !carryoverRef.current.solvedAnomalies.includes(anom.id)) {
            activeAnomalyRef.current = anom;
            soundSynth.playTone(440, 0.25, 'triangle', 0.16);
            syncUiNow();
          }
        }

        if (!prevSatLocked && s.space.orbitalSat.linkLocked) {
          scoreRef.current += 650;
          carryoverRef.current = {
            ...carryoverRef.current,
            relaySatelliteOnline: true,
            highResMapUnlocked: true,
          };
          unlockFieldNote('note-hermes-relay');
          soundSynth.playSuccess();
          syncUiNow();
        } else if (s.space.visitedTargets.length > prevTargets) {
          scoreRef.current += 300;
          soundSynth.playSuccess();
          syncUiNow();
        }

        const atSpaceTarget =
          (s.space.targetId === 'relay-orbit' &&
            (s.space.inSatDeployZone || s.space.orbitalSat.linkLocked)) ||
          (s.space.targetId === 'moon' && s.space.arrivedMoon) ||
          (s.space.targetId === 'gateway' && s.space.arrivedGateway) ||
          (s.space.targetId === 'mars' && s.space.arrivedMars);
        const thrustOn =
          (s.input.forward || (s.space.autoPilot && !atSpaceTarget)) &&
          s.space.fuelPct > 0;
        soundSynth.setThrustVolume(thrustOn ? (s.space.boostActive ? 0.75 : 0.45) : 0);

        if (s.resources.shield <= 0) {
          soundSynth.setThrustVolume(0);
          soundSynth.playCrash();
          failReasonRef.current =
            'Solar proton storm overwhelmed Orion radiation shield.';
          s.crashFx = {
            active: true,
            kind: 'space',
            elapsed: 0,
            x: s.space.shipX,
            y: 0,
            z: s.space.shipZ,
            planet: s.planet,
          };
          return;
        }
      } else if (s.phase === 'landing') {
        // Post-Landing Unstow Sequence (Engine Cool -> Crew Check -> Ramp Deploy -> Rover Unstow -> Handoff)
        if (s.unstow && s.unstow.active) {
          soundSynth.setThrustVolume(0);
          const prevStage = s.unstow.stage;
          s.unstow = stepUnstowSequence(s.unstow, dt);
          if (s.unstow.stage !== prevStage) {
            soundSynth.playTone(580, 0.14, 'triangle', 0.12);
            syncUiNow();
          }
          if (s.unstow.completed) {
            const pose = s.landedPose || {
              planet: s.landing.planet,
              x: s.landing.x,
              y: s.landing.y,
              z: s.landing.z,
              zoneId: s.landing.targetZoneId,
            };
            const startX = clamp(pose.x, -240, 240);
            const startZ = clamp(pose.z + 6.2, -240, 240);
            s.planet = pose.planet;
            s.cameraMode = 'chase';
            s.userOrbitActive = false;
            s.orbitYaw = 0.6;
            s.orbitPitch = 0.24;
            s.orbitDistance = 5.4;
            s.rover = createInitialRoverState(startX, startZ, pose.planet);
            marsQueueRef.current = createInitialMarsQueueState(14);
            setMarsQueueUi(marsQueueRef.current);
            mastPanDegRef.current = 0;
            s.mastPanRad = 0;
            sceneMgrRef.current?.resetWheelTracks();
            s.objectives = clonePlanetObjectives(pose.planet);
            outpostConsoleRef.current = createInitialOutpostConsoleState(pose.planet);
            activeAnomalyRef.current = null;
            phaseTimerRef.current = 0;
            scienceMultRef.current = 1.0;
            s.unstow = null;
            s.phase = 'rover';
            soundSynth.playSuccess();
            syncUiNow();
            return;
          }
        } else {
          if (s.landing.gatesPassed > prevGatesPassedRef.current) {
            prevGatesPassedRef.current = s.landing.gatesPassed;
            soundSynth.playTone(987.77, 0.16, 'triangle', 0.14);
          }

          const groundH = getSurfaceTerrainHeight(s.landing.planet, s.landing.x, s.landing.z);
          const altM = Math.max(0, s.landing.y - groundH);

          if (s.landing.planet === 'mars' && s.marsEdl?.active) {
            const prevEdlStage = s.marsEdl.stage;
            s.marsEdl = stepMarsEdlSequence(s.marsEdl, dt, altM, 'mars');
            if (s.marsEdl.stage !== prevEdlStage) {
              soundSynth.playTone(460, 0.16, 'triangle', 0.12);
              syncUiNow();
            }
          }

          if (
            shouldTriggerApollo1202Alarm(
              s.landing.planet,
              altM,
              s.landing.guidanceMode,
              apollo1202TriggeredRef.current,
              apollo1202ClearedRef.current
            )
          ) {
            apollo1202TriggeredRef.current = true;
            setApollo1202Active(true);
            soundSynth.playCautionAlarm();
            syncUiNow();
          }

          const payload = PAYLOADS[payloadRef.current];
          s.landing = stepLandingPhysics(s.landing, s.input, dt, payload.fragile);
          soundSynth.setThrustVolume(!s.landing.landed && s.landing.fuelPct > 0 ? s.landing.throttle : 0);

          if (s.landing.landed) {
            soundSynth.setThrustVolume(0);
            if (s.landing.result === 'crash') {
              soundSynth.playCrash();
              failReasonRef.current =
                s.landing.planet === 'mars'
                  ? 'Mars 0.38g touchdown exceeded sink-rate or tilt limit.'
                  : 'Lunar touchdown exceeded gear speed or tilt limit.';
              s.crashFx = {
                active: true,
                kind: 'landing',
                elapsed: 0,
                x: s.landing.x,
                y: s.landing.y + 0.4,
                z: s.landing.z,
                planet: s.landing.planet,
              };
              return;
            }

            if (s.landing.result === 'hard' && payload.fragile) {
              s.resources.power = clamp(s.resources.power - 25, 10, 100);
            }
            const zones = getLandingZones(s.landing.planet);
            if (s.landing.targetZoneId === 2 && s.landing.distToPad <= zones[2].radius + 3.5) {
              s.resources.power = clamp(s.resources.power + 20, 0, 100);
            }
            scoreRef.current += s.landing.score;
            soundSynth.playSuccess();

            // Persist exact landing coordinates so lander stays parked there & rover unstows down the ramp
            s.landedPose = {
              planet: s.landing.planet,
              x: s.landing.x,
              y: groundH,
              z: s.landing.z,
              zoneId: s.landing.targetZoneId,
            };
            s.unstow = createInitialUnstowState(s.landing.planet);
            s.rover = createInitialRoverState(
              clamp(s.landing.x, -240, 240),
              clamp(s.landing.z + 6.2, -240, 240),
              s.landing.planet
            );
            syncUiNow();
            return;
          }
        }
      } else if (s.phase === 'rover') {
        soundSynth.setThrustVolume(0);
        s.mastPanRad = (mastPanDegRef.current * Math.PI) / 180;
        const colliders = sceneMgrRef.current?.getSurfaceColliders(s.rover.planet) || [];
        let effectiveInput = s.input;
        if (s.rover.planet === 'mars') {
          const mq = stepMarsQueue(marsQueueRef.current, s.rover, s.objectives, dt);
          marsQueueRef.current = mq.queueState;
          effectiveInput = mq.queueState.phase === 'IDLE' ? s.input : mq.input;
          if (mq.triggerDrillObjectiveId) {
            const obj = s.objectives.find((o) => o.id === mq.triggerDrillObjectiveId && !o.completed);
            if (obj) {
              handleOpenLearnForObjective(obj);
            }
          }
        }
        s.rover = stepRoverPhysics(s.rover, effectiveInput, colliders, dt);
        phaseTimerRef.current += dt;

        if (
          Math.abs(s.rover.speed) > 0.45 &&
          performance.now() - lastRoverDriveSoundRef.current > 195
        ) {
          lastRoverDriveSoundRef.current = performance.now();
          soundSynth.playRoverDrivePulse(Math.abs(s.rover.speed));
        }

        // Trigger Surface Applied Knowledge Anomaly after 4 seconds on Moon or Mars
        if (!activeAnomalyRef.current && phaseTimerRef.current > 4.0) {
          const missionKey: CampaignMissionId =
            s.rover.planet === 'mars' ? 'mars-pathfinder' : 'artemis-3';
          const anom = cloneAnomalyForMission(missionKey);
          if (anom && !carryoverRef.current.solvedAnomalies.includes(anom.id)) {
            activeAnomalyRef.current = anom;
            soundSynth.playTone(440, 0.25, 'triangle', 0.16);
            syncUiNow();
          }
        }

        const bermFactor = Math.max(0.45, 1 - carryoverRef.current.regolithShieldLevel * 0.25);
        const atBaseCamp = Math.hypot(s.rover.x + 15, s.rover.z + 13) <= 22;
        const flareDrain =
          (s.donkiFlareActive ? 0.28 : 0.11) * bermFactor * (atBaseCamp ? 0.25 : 1);
        const kiloBonus = outpostConsoleRef.current.kilopowerActive ? 0.28 : 0;
        const dustPenalty =
          s.rover.planet === 'mars' && !outpostConsoleRef.current.kilopowerActive
            ? (s.rover.dustAccumulationPct / 100) * 0.24
            : 0;

        if (atBaseCamp) {
          s.resources.oxygen = clamp(s.resources.oxygen + 2.0 * dt, 0, 100);
          s.resources.power = clamp(s.resources.power + (2.2 + kiloBonus) * dt, 0, 100);
          s.resources.shield = clamp(s.resources.shield + (2.8 - flareDrain) * dt, 0, 100);
        } else {
          s.resources.oxygen = clamp(s.resources.oxygen - 0.24 * dt, 0, 100);
          s.resources.power = clamp(
            s.resources.power - ((s.rover.headlightsOn ? 0.22 : 0.14) + dustPenalty - kiloBonus) * dt,
            0,
            100
          );
          s.resources.shield = clamp(s.resources.shield - flareDrain * dt, 0, 100);
        }

        // Science Drilling / Coring Check (Hold [E / SPACE])
        const nearest = s.objectives.find(
          (o) => !o.completed && Math.hypot(o.x - s.rover.x, o.z - s.rover.z) < 6.8
        );
        if (nearest && s.input.action) {
          s.activeDrillingId = nearest.id;
          const drillBoost = PAYLOADS[payloadRef.current].drillBoost;
          nearest.progress = clamp(
            nearest.progress + (dt * drillBoost * scienceMultRef.current) / nearest.durationSec,
            0,
            1
          );
          if (performance.now() - lastDrillSoundRef.current > 140) {
            lastDrillSoundRef.current = performance.now();
            soundSynth.playDrillTick();
          }

          if (nearest.progress >= 1) {
            completeObjectiveWithRewards(nearest.id);
            return;
          }
        } else {
          s.activeDrillingId = null;
        }

        if (s.resources.oxygen <= 0 || s.resources.power <= 0 || s.resources.shield <= 0) {
          soundSynth.playCrash();
          failReasonRef.current =
            s.resources.oxygen <= 0
              ? 'Crew O₂ reserve depleted before ice or MOXIE resupply.'
              : s.resources.power <= 0
                ? 'Rover battery depleted on shadowed surface.'
                : 'Surface shielding breached by solar particle storm.';
          s.crashFx = {
            active: true,
            kind: 'rover',
            elapsed: 0,
            x: s.rover.x,
            y: s.rover.y + 0.5,
            z: s.rover.z,
            planet: s.rover.planet,
          };
          return;
        }
      } else {
        soundSynth.setThrustVolume(0);
      }

      // Calm-Moment "Did you know?" Toast (~8s every ~26s during quiet moments only)
      if (s.phase === 'launch' || s.phase === 'space' || s.phase === 'landing' || s.phase === 'rover') {
        const hasCritical =
          s.phase === 'launch'
            ? getLaunchWarnings(s.launch, s.resources).some((w) => w.severity === 'critical')
            : s.phase === 'space'
              ? getSpaceWarnings(s.space, s.resources, s.donkiFlareActive).some(
                  (w) => w.severity === 'critical'
                )
              : s.phase === 'landing'
                ? getLandingWarnings(s.landing, s.resources).some((w) => w.severity === 'critical')
                : getRoverWarnings(s.rover, s.resources, s.donkiFlareActive).some(
                    (w) => w.severity === 'critical'
                  );

        const isCalm = shouldShowDidYouKnowToast({
          hasActiveAnomaly: Boolean(
            activeAnomalyRef.current && !activeAnomalyRef.current.resolvedChoiceId
          ),
          apollo1202Active: apollo1202TriggeredRef.current && !apollo1202ClearedRef.current,
          hasCriticalWarning: hasCritical,
          menuOpen: menuOpenRef.current,
          modalOpen: modalOpenRef.current,
        });

        if (!isCalm) {
          if (activeToastRef.current) {
            activeToastRef.current = null;
            toastVisibleSecRef.current = 0;
            setActiveToastFact(null);
          }
        } else if (activeToastRef.current) {
          toastVisibleSecRef.current += dt;
          if (toastVisibleSecRef.current >= 8) {
            activeToastRef.current = null;
            toastVisibleSecRef.current = 0;
            setActiveToastFact(null);
          }
        } else {
          calmElapsedRef.current += dt;
          if (calmElapsedRef.current >= 26) {
            calmElapsedRef.current = 0;
            const ctxKey: FactContextKey =
              s.phase === 'launch'
                ? s.launch.orbitReached
                  ? 'leo'
                  : 'launch'
                : s.phase === 'space'
                  ? 'space'
                  : s.phase === 'landing'
                    ? s.unstow?.active
                      ? 'unstow'
                      : s.landing.planet === 'mars'
                        ? 'mars-edl'
                        : 'moon-landing'
                    : 'rover';
            const list = CONTEXTUAL_FACTS[ctxKey] || CONTEXTUAL_FACTS.rover;
            const picked = list[toastFactIndexRef.current % list.length];
            toastFactIndexRef.current += 1;
            activeToastRef.current = picked;
            toastVisibleSecRef.current = 0;
            setActiveToastFact(picked);
          }
        }
      }

      // Throttled <= 10Hz UI state sync
      const now = performance.now();
      if (now - lastUiSyncRef.current > 100) {
        lastUiSyncRef.current = now;
        setLaunchUi({ ...s.launch });
        if (s.leoTransfer) setLeoTransferUi({ ...s.leoTransfer });
        if (s.marsEdl) setMarsEdlUi({ ...s.marsEdl });
        setUnstowUi(s.unstow ? { ...s.unstow } : null);
        setSpaceUi({ ...s.space, orbitalSat: { ...s.space.orbitalSat } });
        setLandingUi({ ...s.landing });
        setRoverUi({ ...s.rover });
        setResourcesUi({ ...s.resources });
        setObjectivesUi(s.objectives.map((o) => ({ ...o })));
        setMarsQueueUi({ ...marsQueueRef.current });
        if (s.phase === 'space') {
          setSolarEpochYearsUi(s.solarEpochYears ?? 0);
          setSelectedBodyPin(
            sceneMgrRef.current?.getSelectedSolarBodyScreenPos(s.focusedSolarBodyId ?? null) ?? null
          );
        }
        if (s.phase === 'rover') {
          setWorldPrompts(sceneMgrRef.current?.getSurfaceWorldPrompts(s) || []);
        }
        if (s.phase === 'inspector' && s.inspector?.showLabels) {
          setInspectorLabels(sceneMgrRef.current?.getInspectorScreenLabels(s.showcase) || []);
        }
      }
    },
    [completeObjectiveWithRewards, handleOpenLearnForObjective, syncUiNow, unlockFieldNote]
  );

  const onFrameTickRef = useRef(onFrameTick);
  onFrameTickRef.current = onFrameTick;

  // Mount Three.js Scene Manager only on desktop (>=1024px); never tear down WebGL on modal open/close
  useEffect(() => {
    if (!isDesktop) return;
    const el = containerRef.current;
    if (!el) return;
    const mgr = new SpaceSceneManager(el, simRef, (dt) => onFrameTickRef.current(dt));
    sceneMgrRef.current = mgr;

    return () => {
      soundSynth.setThrustVolume(0);
      mgr.dispose();
      sceneMgrRef.current = null;
    };
  }, [isDesktop]);

  // Unified Keyboard + Pointer + Hold-Button Input Hub
  useEffect(() => {
    const syncRoverInputState = () => {
      if (simRef.current.phase !== 'rover') return;
      const inp = simRef.current.input;
      setRoverInputUi((prev) =>
        prev.forward === inp.forward &&
        prev.backward === inp.backward &&
        prev.left === inp.left &&
        prev.right === inp.right
          ? prev
          : {
              forward: inp.forward,
              backward: inp.backward,
              left: inp.left,
              right: inp.right,
            }
      );
    };

    const releaseAll = () => {
      simRef.current.input = { ...EMPTY_INPUT };
      setRoverInputUi((prev) =>
        !prev.forward && !prev.backward && !prev.left && !prev.right
          ? prev
          : { forward: false, backward: false, left: false, right: false }
      );
    };

    const setInputKey = (code: string, down: boolean) => {
      const inp = simRef.current.input;
      let moveChanged = false;
      if (code === 'KeyW' || code === 'ArrowUp') {
        moveChanged = inp.forward !== down;
        inp.forward = down;
      }
      if (code === 'KeyS' || code === 'ArrowDown') {
        moveChanged = inp.backward !== down;
        inp.backward = down;
      }
      if (code === 'KeyA' || code === 'ArrowLeft') {
        moveChanged = inp.left !== down;
        inp.left = down;
      }
      if (code === 'KeyD' || code === 'ArrowRight') {
        moveChanged = inp.right !== down;
        inp.right = down;
      }
      if (code === 'Space' || code === 'KeyE') {
        inp.action = down;
        if (code === 'Space') {
          inp.stabilize = down;
        }
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') inp.boost = down;
      if (code === 'KeyQ') inp.tiltForward = down;
      if (code === 'KeyZ') inp.throttleDown = down;
      if (code === 'KeyX') inp.cutoff = down;
      if (code === 'KeyB') inp.killDrift = down;
      if (
        down &&
        simRef.current.phase === 'space' &&
        simRef.current.focusedSolarBodyId &&
        ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)
      ) {
        simRef.current.focusedSolarBodyId = null;
        simRef.current.userOrbitActive = false;
        setFocusedSolarBodyId(null);
        setSelectedBodyPin(null);
      }
      if (moveChanged) syncRoverInputState();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (window.innerWidth < 1024) return;
      if (!document.hasFocus()) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      soundSynth.init();

      const s = simRef.current;
      const isGameplay =
        s.phase === 'launch' || s.phase === 'space' || s.phase === 'landing' || s.phase === 'rover';

      if (e.code === 'KeyM' && !e.repeat) {
        if (isGameplay) {
          if (menuOpenRef.current) {
            closeMenu();
          } else {
            openMenuWithTab('map');
          }
          return;
        }
        const m = soundSynth.toggleMute();
        setMuted(m);
        setAudioSettings(soundSynth.getSettings());
        return;
      }

      if (e.code === 'Tab' && !e.repeat && isGameplay) {
        if (menuOpenRef.current) {
          closeMenu();
        } else {
          openMenuWithTab('map');
        }
        return;
      }

      if (e.code === 'Escape') {
        if (drillingConsoleRef.current?.open) {
          drillingConsoleRef.current = { ...drillingConsoleRef.current, open: false, isDrilling: false };
          syncUiNow();
          return;
        }
        if (learnModalRef.current?.open) {
          learnModalRef.current = { ...learnModalRef.current, open: false };
          syncUiNow();
          return;
        }
        if (outpostConsoleRef.current.open) {
          outpostConsoleRef.current = { ...outpostConsoleRef.current, open: false };
          syncUiNow();
          return;
        }
        if (nasaModalOpen) {
          setNasaModalOpen(false);
          return;
        }
        if (fieldNotebookOpen) {
          setFieldNotebookOpen(false);
          return;
        }
      }

      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        if (menuOpenRef.current && e.code === 'Escape') {
          closeMenu();
          return;
        }
        if (isGameplay) {
          if (menuOpenRef.current) {
            closeMenu();
          } else {
            openMenuWithTab('map');
          }
        }
        return;
      }

      if (
        s.phase === 'title' &&
        !menuOpenRef.current &&
        !nasaModalOpen &&
        !fieldNotebookOpen &&
        (e.code === 'Enter' || e.code === 'Space')
      ) {
        jumpToPhase('briefing');
        return;
      }

      if (s.phase === 'launch' && e.code === 'KeyR' && !e.repeat) {
        s.input = { ...EMPTY_INPUT };
        s.launch = createInitialLaunchState(s.launch.autoGuidance);
        s.leoTransfer = createInitialLeoTransferState();
        launchPrevCountdownDigitRef.current = 4;
        soundSynth.setThrustVolume(0);
        soundSynth.resetAtmosphere();
        syncUiNow();
        return;
      }

      if (
        s.phase === 'launch' &&
        e.code === 'Space' &&
        !e.repeat &&
        s.launch.launchSequence === 'ASCENDING'
      ) {
        const prev = s.launch;
        const next = separateLaunchStage(prev);
        if (next.srbSeparated !== prev.srbSeparated || next.coreSeparated !== prev.coreSeparated) {
          s.launch = next;
          soundSynth.playStageSep();
          syncUiNow();
        }
      }

      if (e.code === 'KeyC' && !e.repeat && (s.phase === 'landing' || s.phase === 'rover')) {
        if (
          s.phase === 'rover' &&
          s.rover.planet === 'mars' &&
          (marsQueueRef.current.queue.length > 0 || marsQueueRef.current.phase !== 'IDLE') &&
          !menuOpenRef.current
        ) {
          marsQueueRef.current = clearMarsQueue(marsQueueRef.current);
          setMarsQueueUi(marsQueueRef.current);
          soundSynth.playClick();
          return;
        }
        const order: CameraMode[] = ['chase', 'cockpit', 'overhead', 'orbit'];
        const nextMode = order[(order.indexOf(s.cameraMode) + 1) % order.length];
        s.cameraMode = nextMode;
        s.userOrbitActive = nextMode === 'orbit';
        syncUiNow();
      }

      if (e.code === 'KeyG' && !e.repeat) {
        if (s.phase === 'space') {
          s.space.autoPilot = !s.space.autoPilot;
          syncUiNow();
        } else if (s.phase === 'landing') {
          s.landing.guidanceMode = s.landing.guidanceMode === 'AUTOLAND' ? 'MANUAL' : 'AUTOLAND';
          syncUiNow();
        }
      }

      if (!e.repeat && s.phase === 'landing') {
        if (e.code === 'Digit1') {
          s.landing.targetZoneId = 0;
          syncUiNow();
        } else if (e.code === 'Digit2') {
          s.landing.targetZoneId = 1;
          syncUiNow();
        } else if (e.code === 'Digit3') {
          s.landing.targetZoneId = 2;
          syncUiNow();
        } else if (e.code === 'KeyX') {
          s.landing.guidanceMode = 'MANUAL';
          s.landing.targetThrottle = 0;
          s.landing.throttle = 0;
          syncUiNow();
        } else if (e.code === 'KeyH') {
          s.landing.guidanceMode = 'MANUAL';
          const pct = clamp(s.landing.hoverThrottlePct / 100, 0.1, 1);
          s.landing.targetThrottle = pct;
          s.landing.throttle = pct;
          syncUiNow();
        } else if (e.code === 'KeyK') {
          s.landing.autoCutoff = !s.landing.autoCutoff;
          syncUiNow();
        }
      }

      if (!e.repeat && s.phase === 'rover') {
        if (
          e.code === 'Space' &&
          s.rover.planet === 'mars' &&
          marsQueueRef.current.phase === 'IDLE' &&
          marsQueueRef.current.queue.length > 0 &&
          !menuOpenRef.current
        ) {
          marsQueueRef.current = transmitMarsQueue(marsQueueRef.current);
          setMarsQueueUi(marsQueueRef.current);
          soundSynth.playClick();
          return;
        }
        if (e.code === 'KeyE' && !menuOpenRef.current && !modalOpenRef.current) {
          const nearObj = s.objectives.find(
            (o) => !o.completed && Math.hypot(o.x - s.rover.x, o.z - s.rover.z) < 6.8
          );
          if (nearObj) {
            handleOpenLearnForObjective(nearObj);
            return;
          }
          const atBase = Math.hypot(s.rover.x + 15, s.rover.z + 13) <= 22;
          if (atBase) {
            outpostConsoleRef.current = {
              ...outpostConsoleRef.current,
              planet: s.rover.planet,
              open: true,
            };
            soundSynth.playClick();
            syncUiNow();
            return;
          }
        }
        if (e.code === 'Digit1') s.rover.driveMode = 'DRIVE';
        if (e.code === 'Digit2') s.rover.driveMode = 'CRAB';
        if (e.code === 'Digit3') s.rover.driveMode = 'SPIN';
        if (e.code === 'Digit4') s.rover.driveMode = 'WALKER';
        if (e.code === 'KeyF') s.rover.highClearance = !s.rover.highClearance;
        if (e.code === 'KeyL') s.rover.headlightsOn = !s.rover.headlightsOn;
        if (e.code === 'KeyQ' || e.code === 'BracketLeft') {
          mastPanDegRef.current = clamp(mastPanDegRef.current - 15, -75, 75);
          s.mastPanRad = (mastPanDegRef.current * Math.PI) / 180;
        }
        if (e.code === 'BracketRight') {
          mastPanDegRef.current = clamp(mastPanDegRef.current + 15, -75, 75);
          s.mastPanRad = (mastPanDegRef.current * Math.PI) / 180;
        }
        syncUiNow();
      }

      setInputKey(e.code, true);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      setInputKey(e.code, false);
    };

    // Hold-button pointer delegation for [data-hold-keys]
    let heldBtnKeys: Array<keyof InputState> = [];
    const onPointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest('[data-hold-keys]');
      if (!target) return;
      soundSynth.init();
      const attr = target.getAttribute('data-hold-keys') || '';
      heldBtnKeys = attr.split(',').filter(Boolean) as Array<keyof InputState>;
      heldBtnKeys.forEach((k) => {
        simRef.current.input[k] = true;
      });
      syncRoverInputState();
    };
    const onPointerUp = () => {
      if (heldBtnKeys.length > 0) {
        heldBtnKeys.forEach((k) => {
          simRef.current.input[k] = false;
        });
        heldBtnKeys = [];
        syncRoverInputState();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', releaseAll);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', releaseAll);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [
    closeMenu,
    fieldNotebookOpen,
    handleOpenLearnForObjective,
    jumpToPhase,
    nasaModalOpen,
    openMenuWithTab,
    syncUiNow,
  ]);

  // Universal 360° drag-to-orbit + scroll-wheel zoom across every 3D stage & model
  const dragStateRef = useRef<{ active: boolean; x: number; y: number; startX: number; startY: number }>({
    active: false,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    const onWindowPointerMove = (e: PointerEvent) => {
      if (!dragStateRef.current.active) return;
      const dx = e.clientX - dragStateRef.current.x;
      const dy = e.clientY - dragStateRef.current.y;
      dragStateRef.current.x = e.clientX;
      dragStateRef.current.y = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) < 0.25) return;

      const s = simRef.current;
      s.userOrbitActive = true;
      s.orbitYaw -= dx * 0.0085;
      s.orbitPitch = clamp(s.orbitPitch + dy * 0.0068, -1.35, 1.42);
    };

    const onWindowPointerUp = () => {
      dragStateRef.current.active = false;
    };

    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', onWindowPointerUp);
    window.addEventListener('pointercancel', onWindowPointerUp);
    window.addEventListener('blur', onWindowPointerUp);
    return () => {
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerup', onWindowPointerUp);
      window.removeEventListener('pointercancel', onWindowPointerUp);
      window.removeEventListener('blur', onWindowPointerUp);
    };
  }, []);

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
    if (
      nasaModalOpen ||
      fieldNotebookOpen ||
      discoveryObjUi ||
      drillingConsoleUi?.open ||
      learnModalUi?.open ||
      outpostConsoleUi.open
    ) {
      return;
    }
    dragStateRef.current = {
      active: true,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
    };
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    if (
      menuOpen ||
      nasaModalOpen ||
      fieldNotebookOpen ||
      discoveryObjUi ||
      drillingConsoleUi?.open ||
      learnModalUi?.open ||
      outpostConsoleUi.open
    ) {
      return;
    }
    const travel = Math.hypot(
      e.clientX - dragStateRef.current.startX,
      e.clientY - dragStateRef.current.startY
    );
    if (
      travel < 6 &&
      simRef.current.phase === 'rover' &&
      simRef.current.rover.planet === 'mars' &&
      marsQueueRef.current.phase === 'IDLE'
    ) {
      const hit = sceneMgrRef.current?.pickSurfacePoint(e.clientX, e.clientY);
      if (hit) {
        const snapObj = simRef.current.objectives.find(
          (o) => !o.completed && Math.hypot(o.x - hit.x, o.z - hit.z) < 9.5
        );
        marsQueueRef.current = snapObj
          ? enqueueMarsWaypoint(marsQueueRef.current, snapObj.x, snapObj.z, snapObj.siteName, snapObj.id)
          : enqueueMarsWaypoint(
              marsQueueRef.current,
              hit.x,
              hit.z,
              `Point (${Math.round(hit.x)}, ${Math.round(hit.z)})`
            );
        setMarsQueueUi(marsQueueRef.current);
        soundSynth.init();
        soundSynth.playClick();
      }
      return;
    }
    if (travel < 6 && simRef.current.phase === 'space') {
      const hitBodyId = sceneMgrRef.current?.pickSolarBody(e.clientX, e.clientY) || null;
      if (hitBodyId) {
        handleFocusSolarBody(hitBodyId);
      }
      return;
    }
    if (travel < 6 && simRef.current.phase === 'launch') {
      const partId = sceneMgrRef.current?.pickLaunchPart(e.clientX, e.clientY) || null;
      simRef.current.highlightedPart = partId;
      if (partId) {
        soundSynth.init();
        soundSynth.playClick();
        unlockFieldNote(LAUNCH_PART_DETAILS[partId]?.unlockNoteId);
      }
      syncUiNow();
    } else if (travel < 6 && simRef.current.phase === 'inspector') {
      const s = simRef.current;
      const partId = sceneMgrRef.current?.pickInspectorPart(e.clientX, e.clientY, s.showcase) || null;
      if (partId) {
        soundSynth.init();
        soundSynth.playClick();
        s.highlightedPart = partId;
        const catalog = HARDWARE_CATALOG[s.showcase];
        const part = catalog.parts.find((p) => p.id === partId);
        unlockFieldNote(part?.unlockNoteId);

        if (s.inspector?.quizMode && s.inspector.quizTargetId) {
          if (partId === s.inspector.quizTargetId) {
            const others = catalog.parts.filter((p) => p.id !== partId);
            const nextTarget =
              others.length > 0 ? others[Math.floor(Math.random() * others.length)] : part;
            soundSynth.playSuccess();
            s.inspector = {
              ...s.inspector,
              quizScore: s.inspector.quizScore + 1,
              quizTargetId: nextTarget?.id ?? null,
              quizFeedback: `Correct! Identified ${part?.name}. Next challenge loaded.`,
            };
          } else {
            soundSynth.playTone(230, 0.14, 'triangle', 0.12);
            s.inspector = {
              ...s.inspector,
              quizFeedback: `Selected ${part?.name || partId} — keep looking for the target subsystem!`,
            };
          }
        }
        syncUiNow();
      }
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    if (
      nasaModalOpen ||
      fieldNotebookOpen ||
      discoveryObjUi ||
      drillingConsoleUi?.open ||
      learnModalUi?.open ||
      outpostConsoleUi.open
    ) {
      return;
    }
    const s = simRef.current;
    const minD = s.phase === 'launch' ? 9 : s.phase === 'space' ? 4.5 : s.phase === 'landing' ? 5.5 : 3.2;
    const maxD = s.phase === 'launch' ? 88 : s.phase === 'space' ? 240 : s.phase === 'landing' ? 80 : 65;
    s.userOrbitActive = true;
    s.orbitDistance = clamp(s.orbitDistance + e.deltaY * 0.022, minD, maxD);
  };

  const handleSetCameraPreset = useCallback(
    (yaw: number, pitch: number) => {
      const s = simRef.current;
      s.orbitYaw = yaw;
      s.orbitPitch = clamp(pitch, -1.25, 1.38);
      s.userOrbitActive = true;
      if (s.phase === 'landing' || s.phase === 'rover') {
        s.cameraMode = 'orbit';
      }
      soundSynth.init();
      soundSynth.playClick();
      syncUiNow();
    },
    [syncUiNow]
  );

  const handleZoomCamera = useCallback(
    (delta: number) => {
      const s = simRef.current;
      const minD =
        s.phase === 'launch'
          ? 9
          : s.phase === 'space'
            ? 4.5
            : s.phase === 'landing'
              ? 5.5
              : s.phase === 'title' || s.phase === 'inspector'
                ? s.showcase === 'rover' || s.showcase === 'satellite'
                  ? 3.8
                  : 8
                : 3.2;
      const maxD =
        s.phase === 'launch' || s.phase === 'space'
          ? 88
          : s.phase === 'landing'
            ? 80
            : 65;
      s.userOrbitActive = true;
      if (s.phase === 'landing' || s.phase === 'rover') {
        s.cameraMode = 'orbit';
      }
      s.orbitDistance = clamp(s.orbitDistance + delta, minD, maxD);
      syncUiNow();
    },
    [syncUiNow]
  );

  const handleResetCamera = useCallback(() => {
    const s = simRef.current;
    s.cameraMode = 'chase';
    if (s.phase === 'launch') {
      s.userOrbitActive = false;
      s.orbitYaw = 0.52;
      s.orbitPitch = 0.12;
      s.orbitDistance = 38;
    } else if (s.phase === 'space') {
      s.userOrbitActive = false;
      s.orbitYaw = 0.55;
      s.orbitPitch = 0.48;
      s.orbitDistance = 22;
    } else if (s.phase === 'landing') {
      s.userOrbitActive = false;
      s.orbitYaw = 0.54;
      s.orbitPitch = 0.26;
      s.orbitDistance = 28;
    } else if (s.phase === 'rover') {
      s.userOrbitActive = false;
      s.orbitYaw = 0.6;
      s.orbitPitch = 0.24;
      s.orbitDistance = 5.4;
    } else if (s.phase === 'inspector') {
      s.userOrbitActive = true;
      s.orbitYaw = 0.65;
      s.orbitPitch = 0.18;
      s.orbitDistance = HARDWARE_CATALOG[s.showcase].defaultCameraDist;
    } else {
      s.userOrbitActive = false;
      s.orbitYaw = 0.63;
      s.orbitPitch = 0.25;
      s.orbitDistance = HARDWARE_CATALOG[s.showcase].defaultCameraDist;
    }
    soundSynth.init();
    soundSynth.playClick();
    syncUiNow();
  }, [syncUiNow]);

  const toggleMute = () => {
    const next = soundSynth.toggleMute();
    setMuted(next);
    setAudioSettings(soundSynth.getSettings());
  };

  const handleUpdateAudio = useCallback((partial: Partial<AudioSettings>) => {
    soundSynth.init();
    soundSynth.updateSettings(partial);
    const updated = soundSynth.getSettings();
    setAudioSettings(updated);
    setMuted(updated.muted);
  }, []);

  const handleChangeQuality = useCallback((quality: QualityPreset) => {
    simRef.current.quality = quality;
    setQualityPreset(quality);
    soundSynth.playClick();
  }, []);

  const handleUpdateInspectorUi = useCallback(
    (partial: Partial<InspectorUiState>) => {
      const current = simRef.current.inspector || DEFAULT_INSPECTOR_UI;
      const next = { ...current, ...partial };
      simRef.current.inspector = next;
      if (partial.showLabels === true) {
        setInspectorLabels(
          sceneMgrRef.current?.getInspectorScreenLabels(simRef.current.showcase) || []
        );
      } else if (partial.showLabels === false) {
        setInspectorLabels([]);
      }
      setInspectorUi(next);
    },
    []
  );

  const handleStartInspectorQuiz = useCallback(() => {
    const s = simRef.current;
    const catalog = HARDWARE_CATALOG[s.showcase];
    const current = s.inspector || DEFAULT_INSPECTOR_UI;
    const nextQuizMode = !current.quizMode;
    const target = catalog.parts[0];
    const next: InspectorUiState = {
      ...current,
      quizMode: nextQuizMode,
      quizTargetId: nextQuizMode ? target.id : null,
      quizFeedback: nextQuizMode ? 'Click the matching 3D part in the bay!' : null,
    };
    s.inspector = next;
    setInspectorUi(next);
    soundSynth.playClick();
  }, []);

  const handleResolveAnomaly = useCallback(
    (anomalyId: string, choiceId: string) => {
      const out = applyAnomalyDecision(
        simRef.current.resources,
        carryoverRef.current,
        anomalyId,
        choiceId
      );
      simRef.current.resources = out.resources;
      carryoverRef.current = out.carryover;
      scienceMultRef.current = out.scienceMultiplier;
      if (out.isOptimal) {
        scoreRef.current += 400;
      }
      if (activeAnomalyRef.current) {
        activeAnomalyRef.current = {
          ...activeAnomalyRef.current,
          resolvedChoiceId: choiceId,
          resolvedSummary: out.summary,
        };
      }
      soundSynth.playSuccess();
      syncUiNow();
    },
    [syncUiNow]
  );

  const handleDismissAnomaly = useCallback(
    (anomalyId: string) => {
      if (activeAnomalyRef.current && activeAnomalyRef.current.id === anomalyId) {
        activeAnomalyRef.current = {
          ...activeAnomalyRef.current,
          resolvedChoiceId: '__dismissed__',
          resolvedSummary: 'Alert dismissed by Flight Director.',
        };
        soundSynth.playClick();
        syncUiNow();
      }
    },
    [syncUiNow]
  );

  const nearestObjective =
    phase === 'rover'
      ? objectivesUi.find(
          (o) => !o.completed && Math.hypot(o.x - roverUi.x, o.z - roverUi.z) < 6.8
        ) || null
      : null;

  const activeIdx = CAMPAIGN_ORDER.indexOf(carryoverUi.activeMission);
  const nextMissionId =
    activeIdx >= 0 && activeIdx < CAMPAIGN_ORDER.length - 1
      ? CAMPAIGN_ORDER[activeIdx + 1]
      : null;
  const nextMissionLabel = nextMissionId
    ? `Next: ${CAMPAIGN_MISSIONS[nextMissionId].shortLabel}`
    : null;

  if (!isDesktop) {
    return (
      <div className="relative h-full w-full overflow-hidden bg-slate-950">
        <MobileAcademyView
          donki={donki}
          osdr={osdr}
          onOpenNasaModal={() => setNasaModalOpen(true)}
        />
        <NasaDataModal
          open={nasaModalOpen}
          donki={donki}
          osdr={osdr}
          onClose={() => setNasaModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Full-bleed WebGL 3D Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerUp={handleCanvasPointerUp}
        onWheel={handleCanvasWheel}
        onContextMenu={(e) => e.preventDefault()}
        className="fixed inset-0 z-0 cursor-grab active:cursor-grabbing"
      />

      {phase === 'title' && (
        <TitleOverlay
          showcase={showcase}
          carryover={carryoverUi}
          donki={donki}
          osdr={osdr}
          audioSettings={audioSettings}
          qualityPreset={qualityPreset}
          onUpdateAudio={handleUpdateAudio}
          onChangeQuality={handleChangeQuality}
          onSelectShowcase={(v) => {
            simRef.current.showcase = v;
            simRef.current.userOrbitActive = false;
            simRef.current.orbitYaw = 0.63;
            simRef.current.orbitPitch = 0.25;
            simRef.current.orbitDistance = HARDWARE_CATALOG[v].defaultCameraDist;
            setShowcase(v);
          }}
          onSetCameraPreset={handleSetCameraPreset}
          onZoomCamera={handleZoomCamera}
          onResetCamera={handleResetCamera}
          onSelectCampaignMission={selectCampaignMission}
          onStartMission={() => {
            simRef.current.freeExploreMode = false;
            setFreeExploreMode(false);
            jumpToPhase('briefing');
          }}
          onStartFreeExplore={handleStartFreeExplore}
          onExploreWorld={(bodyId) => {
            simRef.current.freeExploreMode = true;
            setFreeExploreMode(true);
            scoreRef.current = 0;
            jumpToPhase('space', bodyId === 'mars' ? 'mars' : 'moon');
            handleFocusSolarBody(bodyId);
          }}
          onJumpToPhase={(p) => jumpToPhase(p)}
          onOpenBriefing={() => {
            simRef.current.freeExploreMode = false;
            setFreeExploreMode(false);
            jumpToPhase('briefing');
          }}
          onOpenNotebook={() => setFieldNotebookOpen(true)}
          onOpenNasaModal={() => setNasaModalOpen(true)}
          onOpenMenuTab={openMenuWithTab}
          muted={muted}
          onToggleMute={toggleMute}
        />
      )}

      {phase === 'inspector' && (
        <VehicleInspectorOverlay
          showcase={showcase}
          selectedPartId={highlightedPart}
          unlockedNotes={carryoverUi.unlockedFieldNotes}
          inspectorUi={inspectorUi}
          labelPoints={inspectorLabels}
          onUpdateInspectorUi={handleUpdateInspectorUi}
          onStartQuiz={handleStartInspectorQuiz}
          onSelectVehicle={(v) => {
            const craft = HARDWARE_CATALOG[v];
            simRef.current.showcase = v;
            simRef.current.userOrbitActive = true;
            simRef.current.orbitDistance = craft.defaultCameraDist;
            const firstPart = craft.parts[0];
            simRef.current.highlightedPart = firstPart.id;
            if (simRef.current.inspector) {
              simRef.current.inspector = {
                ...simRef.current.inspector,
                quizTargetId: simRef.current.inspector.quizMode ? firstPart.id : null,
                quizFeedback: simRef.current.inspector.quizMode
                  ? 'New craft loaded—click the matching target part!'
                  : null,
              };
            }
            unlockFieldNote(firstPart.unlockNoteId);
            setShowcase(v);
            syncUiNow();
          }}
          onSelectPart={(id) => {
            simRef.current.highlightedPart = id;
            const part = HARDWARE_CATALOG[showcase].parts.find((p) => p.id === id);
            unlockFieldNote(part?.unlockNoteId);
            setHighlightedPart(id);
            syncUiNow();
          }}
          onSetCameraPreset={handleSetCameraPreset}
          onZoomCamera={handleZoomCamera}
          onResetCamera={handleResetCamera}
          onBackTitle={() => jumpToPhase('title')}
          onStartMission={() => jumpToPhase('briefing')}
          onOpenNotebook={() => setFieldNotebookOpen(true)}
        />
      )}

      {phase === 'briefing' && (
        <BriefingOverlay
          selectedPayload={selectedPayload}
          carryover={carryoverUi}
          onSelectCampaignMission={selectCampaignMission}
          onSelectPayload={(id) => {
            payloadRef.current = id;
            setSelectedPayload(id);
          }}
          resources={{ power: 75, oxygen: 75, shield: 70 }}
          donki={donki}
          osdr={osdr}
          onBack={() => jumpToPhase('title')}
          onLaunch={startActiveMission}
          onOpenNasaModal={() => setNasaModalOpen(true)}
          onOpenNotebook={() => setFieldNotebookOpen(true)}
        />
      )}

      {phase === 'rover' &&
        !menuOpen &&
        !nasaModalOpen &&
        !fieldNotebookOpen &&
        !drillingConsoleUi?.open &&
        !learnModalUi?.open &&
        !outpostConsoleUi.open &&
        !discoveryObjUi && (
          <WorldTargetPins
            prompts={worldPrompts}
            planet={roverUi.planet}
            marsQueue={marsQueueUi}
            onInteractObjective={(objId) => {
              const obj = objectivesUi.find((o) => o.id === objId);
              if (obj) handleOpenLearnForObjective(obj);
            }}
            onOpenOutpost={() => {
              outpostConsoleRef.current = {
                ...outpostConsoleRef.current,
                planet: simRef.current.rover.planet,
                open: true,
              };
              soundSynth.playClick();
              syncUiNow();
            }}
            onQueueMarsTarget={(prompt) => {
              if (marsQueueRef.current.phase !== 'IDLE') return;
              marsQueueRef.current = enqueueMarsWaypoint(
                marsQueueRef.current,
                prompt.worldX,
                prompt.worldZ,
                prompt.title,
                prompt.kind === 'objective' ? prompt.id : undefined
              );
              setMarsQueueUi(marsQueueRef.current);
              soundSynth.playClick();
            }}
          />
        )}

      {phase === 'launch' && (
        <LaunchHUD
          launch={launchUi}
          preLaunchChecks={preLaunchChecks}
          leoTransfer={leoTransferUi}
          resources={resourcesUi}
          selectedPartId={highlightedPart}
          onClearSelectedPart={() => {
            simRef.current.highlightedPart = null;
            syncUiNow();
          }}
          onOpenMenuTab={openMenuWithTab}
          onTogglePreLaunchCheck={(key) => {
            soundSynth.init();
            soundSynth.playClick();
            setPreLaunchChecks((prev) => ({ ...prev, [key]: !prev[key] }));
          }}
          onVerifyAllPreLaunchChecks={() => {
            soundSynth.init();
            soundSynth.playClick();
            setPreLaunchChecks({
              powerBus: true,
              cryoChill: true,
              delugeArmed: true,
              crewArmClear: true,
            });
          }}
          onBeginSimulation={() => {
            soundSynth.init();
            soundSynth.playClick();
            simRef.current.launch = beginLaunchCountdown(simRef.current.launch);
            launchPrevCountdownDigitRef.current = 3;
            soundSynth.playCountdownBeep(false);
            syncUiNow();
          }}
          onStartLaunch={() => {
            soundSynth.init();
            const prev = simRef.current.launch;
            if (prev.launchSequence === 'READY') {
              simRef.current.launch = stepLaunchPhysics(
                prev,
                { ...EMPTY_INPUT, forward: true },
                0.016
              );
              soundSynth.playIgnitionRoar();
              syncUiNow();
            }
          }}
          onSeparateStage={() => {
            const prev = simRef.current.launch;
            const next = separateLaunchStage(prev);
            if (
              next.srbSeparated !== prev.srbSeparated ||
              next.coreSeparated !== prev.coreSeparated
            ) {
              simRef.current.launch = next;
              soundSynth.playStageSep();
              syncUiNow();
            }
          }}
          onFireTliBurn={() => {
            soundSynth.init();
            soundSynth.playIgnitionRoar();
            const cur = simRef.current.leoTransfer || createInitialLeoTransferState();
            simRef.current.leoTransfer = { ...cur, tliBurnActive: true };
            syncUiNow();
          }}
          onToggleAutoGuidance={() => {
            simRef.current.launch.autoGuidance = !simRef.current.launch.autoGuidance;
            syncUiNow();
          }}
          onSkipToSpace={() => jumpToPhase('space')}
          onResetLaunch={() => {
            soundSynth.init();
            soundSynth.playClick();
            soundSynth.setThrustVolume(0);
            soundSynth.resetAtmosphere();
            simRef.current.input = { ...EMPTY_INPUT };
            simRef.current.crashFx = {
              active: false,
              kind: 'landing',
              elapsed: 0,
              x: 0,
              y: 0,
              z: 0,
              planet: simRef.current.planet,
            };
            simRef.current.launch = createInitialLaunchState(simRef.current.launch.autoGuidance);
            simRef.current.leoTransfer = createInitialLeoTransferState();
            setPreLaunchChecks(createInitialPreLaunchChecks());
            launchPrevCountdownDigitRef.current = 4;
            syncUiNow();
          }}
        />
      )}

      {phase === 'space' && (
        <SpaceFlightHUD
          space={spaceUi}
          resources={resourcesUi}
          campaignMission={carryoverUi.activeMission}
          donkiFlareActive={Boolean(/M|X/i.test(donki.classType || ''))}
          nasaOnline={donki.isLive || osdr.isLive}
          freeExploreMode={freeExploreMode}
          focusedSolarBodyId={focusedSolarBodyId}
          exploredSolarBodyIds={exploredSolarBodyIds}
          selectedBodyPin={selectedBodyPin}
          solarScaleMode={solarScaleMode}
          solarEpochYears={solarEpochYearsUi}
          onFocusSolarBody={handleFocusSolarBody}
          onExploreSolarBody={handleExploreSolarBody}
          onFlyToSolarBody={handleFlyToSolarBody}
          onOpenMenuTab={openMenuWithTab}
          onOpenBriefing={() => jumpToPhase('briefing')}
          onOpenHardwareBay={() => jumpToPhase('inspector')}
          onOpenNotebook={() => setFieldNotebookOpen(true)}
          onOpenNasaModal={() => setNasaModalOpen(true)}
          onToggleAutoPilot={() => {
            simRef.current.space.autoPilot = !simRef.current.space.autoPilot;
            syncUiNow();
          }}
          onToggleShieldBoost={() => {
            simRef.current.space.shieldBoostActive = !simRef.current.space.shieldBoostActive;
            syncUiNow();
          }}
          onCompleteSatelliteMission={() => {
            soundSynth.setThrustVolume(0);
            soundSynth.playSuccess();
            scoreRef.current += 900;
            markMissionComplete('artemis-2');
            simRef.current.phase = 'victory';
            syncUiNow();
          }}
          onCompleteGatewayMission={() => {
            soundSynth.setThrustVolume(0);
            soundSynth.playSuccess();
            scoreRef.current += 1100;
            markMissionComplete('artemis-4');
            simRef.current.phase = 'victory';
            syncUiNow();
          }}
          onEnterLunarOrbit={() => jumpToPhase('landing', 'moon')}
          onEnterMarsOrbit={() => jumpToPhase('landing', 'mars')}
        />
      )}

      {phase === 'landing' && (
        <LandingHUD
          landing={landingUi}
          marsEdl={marsEdlUi}
          unstow={unstowUi}
          resources={resourcesUi}
          isruFuelBonusPct={carryoverUi.isruFuelBonusPct}
          onOpenMenuTab={openMenuWithTab}
          onFastForwardEdl={() => {
            if (simRef.current.marsEdl) {
              simRef.current.marsEdl = fastForwardMarsEdl(simRef.current.marsEdl);
              soundSynth.playClick();
              syncUiNow();
            }
          }}
          onSkipUnstow={() => {
            if (simRef.current.unstow) {
              simRef.current.unstow = fastForwardUnstow(simRef.current.unstow);
              const pose = simRef.current.landedPose || {
                planet: simRef.current.landing.planet,
                x: simRef.current.landing.x,
                y: simRef.current.landing.y,
                z: simRef.current.landing.z,
                zoneId: simRef.current.landing.targetZoneId,
              };
              const startX = clamp(pose.x, -240, 240);
              const startZ = clamp(pose.z + 6.2, -240, 240);
              simRef.current.planet = pose.planet;
              simRef.current.cameraMode = 'chase';
              simRef.current.userOrbitActive = false;
              simRef.current.orbitYaw = 0.6;
              simRef.current.orbitPitch = 0.24;
              simRef.current.orbitDistance = 5.4;
              simRef.current.rover = createInitialRoverState(startX, startZ, pose.planet);
              marsQueueRef.current = createInitialMarsQueueState(14);
              setMarsQueueUi(marsQueueRef.current);
              mastPanDegRef.current = 0;
              simRef.current.mastPanRad = 0;
              sceneMgrRef.current?.resetWheelTracks();
              simRef.current.objectives = clonePlanetObjectives(pose.planet);
              outpostConsoleRef.current = createInitialOutpostConsoleState(pose.planet);
              simRef.current.unstow = null;
              simRef.current.phase = 'rover';
              soundSynth.playSuccess();
              syncUiNow();
            }
          }}
          onSetGuidance={(mode: LandingGuidanceMode) => {
            simRef.current.landing.guidanceMode = mode;
            syncUiNow();
          }}
          onSetThrottlePct={(pct: number) => {
            simRef.current.landing.guidanceMode = 'MANUAL';
            const norm = clamp(pct / 100, 0, 1);
            simRef.current.landing.targetThrottle = norm;
            simRef.current.landing.throttle = norm;
            syncUiNow();
          }}
          onCutoffEngine={() => {
            simRef.current.landing.guidanceMode = 'MANUAL';
            simRef.current.landing.targetThrottle = 0;
            simRef.current.landing.throttle = 0;
            syncUiNow();
          }}
          onMatchHover={() => {
            simRef.current.landing.guidanceMode = 'MANUAL';
            const hoverNorm = clamp(simRef.current.landing.hoverThrottlePct / 100, 0.1, 1);
            simRef.current.landing.targetThrottle = hoverNorm;
            simRef.current.landing.throttle = hoverNorm;
            syncUiNow();
          }}
        />
      )}

      {phase === 'rover' && (
        <RoverHUD
          rover={roverUi}
          roverInput={roverInputUi}
          resources={resourcesUi}
          objectives={objectivesUi}
          marsQueue={marsQueueUi}
          nearestObjective={nearestObjective}
          donkiFlareActive={Boolean(/M|X/i.test(donki.classType || ''))}
          speedScale={speedScale}
          freeExploreMode={freeExploreMode}
          onToggleSpeedScale={() => {
            soundSynth.playClick();
            setSpeedScale((prev) => (prev === 'KID_25X' ? 'REAL_SPEED' : 'KID_25X'));
          }}
          onOpenDrillConsole={(obj) => {
            handleOpenLearnForObjective(obj);
          }}
          onOpenOutpostConsole={() => {
            outpostConsoleRef.current = {
              ...outpostConsoleRef.current,
              planet: simRef.current.rover.planet,
              open: true,
            };
            soundSynth.playClick();
            syncUiNow();
          }}
          onOpenMenuTab={openMenuWithTab}
          onSetDriveMode={(mode: RoverDriveMode) => {
            simRef.current.rover.driveMode = mode;
            syncUiNow();
          }}
          onTransmitMarsQueue={() => {
            marsQueueRef.current = transmitMarsQueue(marsQueueRef.current);
            setMarsQueueUi(marsQueueRef.current);
            soundSynth.playClick();
          }}
          onUndoMarsQueue={() => {
            marsQueueRef.current = removeLastMarsCommand(marsQueueRef.current);
            setMarsQueueUi(marsQueueRef.current);
            soundSynth.playClick();
          }}
          onClearMarsQueue={() => {
            marsQueueRef.current = clearMarsQueue(marsQueueRef.current);
            setMarsQueueUi(marsQueueRef.current);
            soundSynth.playClick();
          }}
        />
      )}

      {(phase === 'launch' || phase === 'space' || phase === 'landing' || phase === 'rover') &&
        !menuOpen && (
          <CenteredEventCard
            anomaly={activeAnomalyUi}
            apollo1202Active={phase === 'landing' && apollo1202Active}
            placement={phase === 'space' ? 'space-corner' : 'center'}
            onResolveAnomaly={handleResolveAnomaly}
            onDismissAnomaly={handleDismissAnomaly}
            onAckApollo1202={() => {
              apollo1202ClearedRef.current = true;
              setApollo1202Active(false);
              soundSynth.playClick();
            }}
          />
        )}

      {!menuOpen && !discoveryObjUi && (
        <CalmFactToast
          fact={activeToastFact}
          onDismiss={() => {
            activeToastRef.current = null;
            toastVisibleSecRef.current = 0;
            setActiveToastFact(null);
          }}
        />
      )}

      <GameMenuModal
        open={menuOpen}
        activeTab={menuTab}
        phase={phase}
        carryover={carryoverUi}
        exploredSolarBodyIds={exploredSolarBodyIds}
        rover={roverUi}
        objectives={objectivesUi}
        marsQueue={marsQueueUi}
        space={spaceUi}
        landing={landingUi}
        audioSettings={audioSettings}
        qualityPreset={qualityPreset}
        speedScale={speedScale}
        solarScaleMode={solarScaleMode}
        solarTimeSpeed={solarTimeSpeed}
        focusedSolarBodyId={focusedSolarBodyId}
        onSelectTab={setMenuTab}
        onClose={closeMenu}
        onRestartStage={() => {
          closeMenu();
          jumpToPhase(phase, simRef.current.planet);
        }}
        onBackToTitle={() => {
          closeMenu();
          jumpToPhase('title');
        }}
        onOpenOutpostConsole={() => {
          outpostConsoleRef.current = {
            ...outpostConsoleRef.current,
            planet: simRef.current.rover.planet,
            open: true,
          };
          soundSynth.playClick();
          syncUiNow();
        }}
        onOpenFieldLedger={() => setFieldNotebookOpen(true)}
        onOpenNasaModal={() => setNasaModalOpen(true)}
        onJumpToInspector={() => jumpToPhase('inspector')}
        onToggleSpeedScale={() => {
          soundSynth.playClick();
          setSpeedScale((prev) => (prev === 'KID_25X' ? 'REAL_SPEED' : 'KID_25X'));
        }}
        onUpdateAudio={handleUpdateAudio}
        onChangeQuality={handleChangeQuality}
        onResetCamera={handleResetCamera}
        onQueueMarsPoint={(wx, wz, label, objectiveId) => {
          marsQueueRef.current = enqueueMarsWaypoint(
            marsQueueRef.current,
            wx,
            wz,
            label,
            objectiveId
          );
          setMarsQueueUi(marsQueueRef.current);
          soundSynth.playClick();
        }}
        onClearMarsQueue={() => {
          marsQueueRef.current = clearMarsQueue(marsQueueRef.current);
          setMarsQueueUi(marsQueueRef.current);
          soundSynth.playClick();
        }}
        onTransmitMarsQueue={() => {
          marsQueueRef.current = transmitMarsQueue(marsQueueRef.current);
          setMarsQueueUi(marsQueueRef.current);
          soundSynth.playClick();
        }}
        onSelectSpaceTarget={(id: SpaceTargetId) => {
          simRef.current.space.targetId = id;
          syncUiNow();
        }}
        onChangeSolarScaleMode={(mode) => {
          simRef.current.solarScaleMode = mode;
          setSolarScaleMode(mode);
          soundSynth.playClick();
        }}
        onChangeSolarTimeSpeed={(speed) => {
          solarTimeSpeedRef.current = speed;
          setSolarTimeSpeed(speed);
        }}
        onFocusSolarBody={handleFocusSolarBody}
        onSelectLandingZone={(id) => {
          simRef.current.landing.targetZoneId = id;
          syncUiNow();
        }}
        onToggleAutoCutoff={() => {
          simRef.current.landing.autoCutoff = !simRef.current.landing.autoCutoff;
          syncUiNow();
        }}
      />

      {drillingConsoleUi?.open && (
        <DrillingModal
          state={drillingConsoleUi}
          onChangeSetting={(setting: DrillSetting) => {
            if (!drillingConsoleRef.current) return;
            drillingConsoleRef.current = setDrillSetting(drillingConsoleRef.current, setting);
            soundSynth.playClick();
            syncUiNow();
          }}
          onSetDrillingActive={(active: boolean) => {
            if (!drillingConsoleRef.current) return;
            drillingConsoleRef.current = { ...drillingConsoleRef.current, isDrilling: active };
            syncUiNow();
          }}
          onPurgeAndCool={() => {
            if (!drillingConsoleRef.current) return;
            drillingConsoleRef.current = purgeAndCoolDrill(drillingConsoleRef.current);
            soundSynth.playClick();
            syncUiNow();
          }}
          onClaimCoreSample={() => {
            const objId = drillingConsoleRef.current?.objectiveId;
            drillingConsoleRef.current = null;
            setDrillingConsoleUi(null);
            if (objId && learnModalRef.current && learnModalRef.current.objectiveId === objId) {
              learnModalRef.current = {
                ...learnModalRef.current,
                open: true,
                sampleStudied: true,
                activeStep: 'notes',
              };
              soundSynth.playSuccess();
              syncUiNow();
            } else if (objId) {
              completeObjectiveWithRewards(objId);
            } else {
              syncUiNow();
            }
          }}
          onClose={() => {
            const objId = drillingConsoleRef.current?.objectiveId;
            if (drillingConsoleRef.current) {
              drillingConsoleRef.current = {
                ...drillingConsoleRef.current,
                open: false,
                isDrilling: false,
              };
            }
            if (objId && learnModalRef.current && learnModalRef.current.objectiveId === objId) {
              learnModalRef.current = { ...learnModalRef.current, open: true };
            }
            syncUiNow();
          }}
        />
      )}

      {learnModalUi?.open && (
        <LearnObjectModal
          state={learnModalUi}
          objective={objectivesUi.find((o) => o.id === learnModalUi.objectiveId) ?? null}
          onSelectStep={(step) => {
            if (!learnModalRef.current) return;
            learnModalRef.current = { ...learnModalRef.current, activeStep: step };
            soundSynth.playClick();
            syncUiNow();
          }}
          onMarkSampleStudied={() => {
            if (!learnModalRef.current) return;
            learnModalRef.current = { ...learnModalRef.current, sampleStudied: true };
            soundSynth.playSuccess();
            syncUiNow();
          }}
          onMarkNotesRead={() => {
            if (!learnModalRef.current) return;
            learnModalRef.current = { ...learnModalRef.current, notesRead: true };
            soundSynth.playClick();
            syncUiNow();
          }}
          onSelectQuizAnswer={(index) => {
            if (!learnModalRef.current) return;
            const obj = simRef.current.objectives.find(
              (o) => o.id === learnModalRef.current?.objectiveId
            );
            if (!obj) return;
            const spec = getLearnModuleForObjective(obj);
            const correct = index === spec.quiz.correctIndex;
            if (correct) {
              soundSynth.playSuccess();
            } else {
              soundSynth.playTone(230, 0.14, 'triangle', 0.12);
            }
            learnModalRef.current = {
              ...learnModalRef.current,
              selectedAnswer: index,
              quizPassed: correct || learnModalRef.current.quizPassed,
              quizFeedback: correct
                ? spec.quiz.explanation
                : 'Not quite — review the research notes and try another option.',
            };
            syncUiNow();
          }}
          onOpenTridentDrill={(obj) => {
            if (learnModalRef.current) {
              learnModalRef.current = { ...learnModalRef.current, open: false };
            }
            drillingConsoleRef.current = createInitialDrillingState(
              obj.id,
              obj.title,
              obj.planet
            );
            soundSynth.playClick();
            syncUiNow();
          }}
          onCompleteAndClaim={(objId) => {
            learnModalRef.current = null;
            setLearnModalUi(null);
            completeObjectiveWithRewards(objId);
          }}
          onClose={() => {
            if (learnModalRef.current) {
              learnModalRef.current = { ...learnModalRef.current, open: false };
            }
            soundSynth.playClick();
            syncUiNow();
          }}
        />
      )}

      {outpostConsoleUi.open && (
        <OutpostConsoleModal
          state={outpostConsoleUi}
          resources={resourcesUi}
          carryover={carryoverUi}
          dustPct={roverUi.dustAccumulationPct}
          onClose={() => {
            outpostConsoleRef.current = { ...outpostConsoleRef.current, open: false };
            syncUiNow();
          }}
          onToggleAirlock={() => {
            outpostConsoleRef.current = toggleOutpostAirlock(outpostConsoleRef.current);
            soundSynth.playAirlockCycle();
            syncUiNow();
          }}
          onSelectRoom={(room: OutpostInteriorRoom) => {
            outpostConsoleRef.current = { ...outpostConsoleRef.current, activeRoom: room };
            soundSynth.playClick();
            syncUiNow();
          }}
          onSwitchPowerSource={(mode: PowerSourceMode) => {
            outpostConsoleRef.current = switchOutpostPowerSource(outpostConsoleRef.current, mode);
            simRef.current.kilopowerActive = outpostConsoleRef.current.kilopowerActive;
            soundSynth.playClick();
            syncUiNow();
          }}
          onAdvanceSol={() => {
            const solNum = outpostConsoleRef.current.solNumber + 1;
            const kilopower = outpostConsoleRef.current.powerSource === 'kilopower';
            simRef.current.resources = {
              power: clamp(
                simRef.current.resources.power + (kilopower ? 25 : 15),
                15,
                100
              ),
              oxygen: clamp(simRef.current.resources.oxygen + 18, 15, 100),
              shield: clamp(simRef.current.resources.shield + 14, 15, 100),
            };
            outpostConsoleRef.current = {
              ...outpostConsoleRef.current,
              solNumber: solNum,
            };
            soundSynth.playSuccess();
            syncUiNow();
          }}
        />
      )}

      {discoveryObjUi && (
        <OutcomeModal
          mode="discovery"
          discoveryObjective={discoveryObjUi}
          score={scoreUi}
          resources={resourcesUi}
          onResume={() => {
            discoveryObjRef.current = null;
            syncUiNow();
          }}
          onRetry={() => jumpToPhase('rover')}
          onBackToTitle={() => jumpToPhase('title')}
        />
      )}

      {(phase === 'gameover' || phase === 'victory') && !discoveryObjUi && (
        <OutcomeModal
          mode={phase === 'victory' ? 'victory' : 'gameover'}
          reason={failReason}
          score={scoreUi}
          resources={resourcesUi}
          carryover={carryoverUi}
          nextMissionLabel={nextMissionLabel}
          failTelemetry={
            phase === 'gameover'
              ? {
                  crashKind: simRef.current.crashFx.kind,
                  planet: simRef.current.crashFx.planet,
                  descentMs: Math.abs(landingUi.vy),
                  tiltDeg: Math.max(Math.abs(landingUi.pitchDeg), Math.abs(landingUi.rollDeg)),
                }
              : undefined
          }
          onNextMission={
            nextMissionId
              ? () => {
                  selectCampaignMission(nextMissionId);
                  jumpToPhase('briefing', CAMPAIGN_MISSIONS[nextMissionId].planet);
                }
              : undefined
          }
          onRetry={() => jumpToPhase('briefing')}
          onBackToTitle={() => jumpToPhase('title')}
        />
      )}

      <NasaDataModal
        open={nasaModalOpen}
        donki={donki}
        osdr={osdr}
        onClose={() => setNasaModalOpen(false)}
      />

      <FieldNotebookModal
        open={fieldNotebookOpen}
        carryover={carryoverUi}
        onClose={() => setFieldNotebookOpen(false)}
      />
    </div>
  );
}
