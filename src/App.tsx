import { useCallback, useEffect, useRef, useState } from 'react';
import { BriefingOverlay } from './components/BriefingOverlay';
import { FieldNotebookModal } from './components/FieldNotebookModal';
import { LandingHUD } from './components/LandingHUD';
import { LaunchHUD } from './components/LaunchHUD';
import { NasaDataModal } from './components/NasaDataModal';
import { OutcomeModal } from './components/OutcomeModal';
import { RoverHUD } from './components/RoverHUD';
import { SpaceFlightHUD } from './components/SpaceFlightHUD';
import { TitleOverlay } from './components/TitleOverlay';
import { VehicleInspectorOverlay } from './components/VehicleInspectorOverlay';
import { soundSynth } from './game/audio';
import {
  CAMPAIGN_ANOMALIES,
  CAMPAIGN_MISSIONS,
  CAMPAIGN_ORDER,
  PAYLOADS,
  VEHICLE_CATALOG,
  getLandingZones,
  getPlanetObjectives,
} from './game/constants';
import {
  applyAnomalyDecision,
  beginLaunchCountdown,
  clamp,
  createInitialCampaignCarryover,
  createInitialLandingState,
  createInitialLaunchState,
  createInitialRoverState,
  createInitialSpaceFlightState,
  separateLaunchStage,
  stepLandingPhysics,
  stepLaunchPhysics,
  stepRoverPhysics,
  stepSpaceFlightPhysics,
} from './game/physics';
import type {
  CameraMode,
  CampaignCarryoverState,
  CampaignMissionId,
  DonkiStatus,
  GamePhase,
  InputState,
  LandingGuidanceMode,
  LandingState,
  LaunchState,
  MissionAnomaly,
  OsdrStatus,
  PayloadId,
  ResourceState,
  RoverDriveMode,
  RoverObjective,
  RoverState,
  SpaceFlightState,
  SpaceTargetId,
  SurfacePlanet,
  VehicleShowcaseId,
} from './game/types';
import { SpaceSceneManager, type SceneSimulationBridge } from './three/SpaceSceneManager';

const DEFAULT_DONKI: DonkiStatus = {
  isLive: false,
  status: 'loading',
  classType: 'Checking DONKI...',
  beginTime: '',
  sourceLocation: 'Solar Disk',
  link: 'https://kauai.ccmc.gsfc.nasa.gov/DONKI/',
  description: 'Fetching latest solar flare telemetry from NASA DONKI.',
};

const DEFAULT_OSDR: OsdrStatus = {
  isLive: false,
  totalCatalogStudies: 4,
  studies: [],
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
    orbitYaw: 0.6,
    orbitPitch: 0.25,
    orbitDistance: 24,
    activeDrillingId: null,
    launch: createInitialLaunchState(),
    space: createInitialSpaceFlightState('artemis-2'),
    landing: createInitialLandingState(PAYLOADS['oxygen-tanks'].massMultiplier, 'moon'),
    rover: createInitialRoverState(6, 6, 'moon'),
    resources: { power: 75, oxygen: 75, shield: 70 },
    objectives: clonePlanetObjectives('moon'),
    input: { ...EMPTY_INPUT },
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
  const launchPrevCountdownDigitRef = useRef<number>(4);

  const [phase, setPhase] = useState<GamePhase>(simRef.current.phase);
  const [paused, setPaused] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [showcase, setShowcase] = useState<VehicleShowcaseId>('outpost');
  const [highlightedPart, setHighlightedPart] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<PayloadId>('oxygen-tanks');
  const [donki, setDonki] = useState<DonkiStatus>(DEFAULT_DONKI);
  const [osdr, setOsdr] = useState<OsdrStatus>(DEFAULT_OSDR);
  const [nasaModalOpen, setNasaModalOpen] = useState<boolean>(false);
  const [fieldNotebookOpen, setFieldNotebookOpen] = useState<boolean>(false);
  const [mapExpanded, setMapExpanded] = useState<boolean>(false);

  const [carryoverUi, setCarryoverUi] = useState<CampaignCarryoverState>(carryoverRef.current);
  const [launchUi, setLaunchUi] = useState<LaunchState>(simRef.current.launch);
  const [spaceUi, setSpaceUi] = useState<SpaceFlightState>(simRef.current.space);
  const [landingUi, setLandingUi] = useState<LandingState>(simRef.current.landing);
  const [roverUi, setRoverUi] = useState<RoverState>(simRef.current.rover);
  const [resourcesUi, setResourcesUi] = useState<ResourceState>(simRef.current.resources);
  const [objectivesUi, setObjectivesUi] = useState<RoverObjective[]>(simRef.current.objectives);
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
    setCarryoverUi({
      ...carryoverRef.current,
      completedMissions: [...carryoverRef.current.completedMissions],
      unlockedFieldNotes: [...carryoverRef.current.unlockedFieldNotes],
      solvedAnomalies: [...carryoverRef.current.solvedAnomalies],
    });
    setLaunchUi({ ...s.launch });
    setSpaceUi({ ...s.space, orbitalSat: { ...s.space.orbitalSat } });
    setLandingUi({ ...s.landing });
    setRoverUi({ ...s.rover });
    setResourcesUi({ ...s.resources });
    setObjectivesUi(s.objectives.map((o) => ({ ...o })));
    setActiveAnomalyUi(activeAnomalyRef.current ? { ...activeAnomalyRef.current } : null);
    setDiscoveryObjUi(discoveryObjRef.current ? { ...discoveryObjRef.current } : null);
    setScoreUi(scoreRef.current);
    setFailReason(failReasonRef.current);
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

  // Update body[data-state] for deterministic automation/accessibility state checks
  useEffect(() => {
    let bodyState = 'playing';
    if (phase === 'title') bodyState = 'title';
    else if (phase === 'gameover' || phase === 'victory') bodyState = 'gameover';
    else if (paused || nasaModalOpen || fieldNotebookOpen || discoveryObjUi) bodyState = 'paused';
    document.body.dataset.state = bodyState;
  }, [phase, paused, nasaModalOpen, fieldNotebookOpen, discoveryObjUi]);

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
      const s = simRef.current;
      const payload = PAYLOADS[payloadRef.current];
      const activeSpec = CAMPAIGN_MISSIONS[carryoverRef.current.activeMission];
      const targetPlanet = planetOverride || activeSpec.planet || s.planet;

      s.paused = false;
      s.planet = targetPlanet;
      s.input = { ...EMPTY_INPUT };
      s.activeDrillingId = null;
      discoveryObjRef.current = null;
      activeAnomalyRef.current = null;
      phaseTimerRef.current = 0;
      failReasonRef.current = '';

      if (targetPhase === 'title') {
        s.phase = 'title';
        s.showcase = 'outpost';
        s.highlightedPart = null;
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'inspector') {
        s.phase = 'inspector';
        s.showcase = 'rocket';
        const firstPart = VEHICLE_CATALOG.rocket.parts[0];
        s.highlightedPart = firstPart.id;
        unlockFieldNote(firstPart.unlockNoteId);
        s.orbitYaw = 0.65;
        s.orbitPitch = 0.15;
        s.orbitDistance = 35;
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'briefing') {
        s.phase = 'briefing';
        s.resources = { power: 75, oxygen: 75, shield: 70 };
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'launch') {
        s.phase = 'launch';
        s.resources = applyPayloadBonus(payloadRef.current);
        s.launch = createInitialLaunchState(s.launch.autoGuidance);
        launchPrevCountdownDigitRef.current = 4;
        scoreRef.current = 0;
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'space') {
        s.phase = 'space';
        s.resources = applyPayloadBonus(payloadRef.current);
        s.space = createInitialSpaceFlightState(s.campaignMission, carryoverRef.current);
      } else if (targetPhase === 'landing') {
        s.phase = 'landing';
        s.cameraMode = 'chase';
        s.resources = applyPayloadBonus(payloadRef.current);
        s.landing = createInitialLandingState(
          payload.massMultiplier,
          targetPlanet,
          carryoverRef.current.isruFuelBonusPct
        );
      } else if (targetPhase === 'rover') {
        s.phase = 'rover';
        s.cameraMode = 'chase';
        s.resources = applyPayloadBonus(payloadRef.current);
        s.rover = createInitialRoverState(6, 6, targetPlanet);
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
    jumpToPhase(spec.startPhase, spec.planet);
  }, [jumpToPhase]);

  // Per-frame physics + game progression loop
  const onFrameTick = useCallback(
    (dt: number) => {
      const s = simRef.current;
      if (s.paused || nasaModalOpen || fieldNotebookOpen || discoveryObjRef.current) {
        soundSynth.setThrustVolume(0);
        return;
      }

      if (s.phase === 'launch') {
        const prevSeq = s.launch.launchSequence;
        const launchInput =
          prevSeq === 'PRE_SIM' || prevSeq === 'COUNTDOWN'
            ? { ...s.input, forward: false, action: false, stabilize: false }
            : s.input;
        s.launch = stepLaunchPhysics(s.launch, launchInput, dt);

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

        soundSynth.setThrustVolume(s.launch.ignited && s.launch.fuelPct > 0 ? s.launch.throttle : 0);

        if (s.launch.orbitReached) {
          soundSynth.setThrustVolume(0);
          soundSynth.playSuccess();
          scoreRef.current += 500;
          s.phase = 'space';
          phaseTimerRef.current = 0;
          activeAnomalyRef.current = null;
          s.space = createInitialSpaceFlightState(s.campaignMission, carryoverRef.current);
          syncUiNow();
          return;
        }
      } else if (s.phase === 'space') {
        const prevTargets = s.space.visitedTargets.length;
        const prevSatLocked = s.space.orbitalSat.linkLocked;
        const result = stepSpaceFlightPhysics(s.space, s.resources, s.input, s.donkiFlareActive, dt);
        s.space = result.space;
        s.resources = result.resources;
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

        const thrustOn =
          (s.input.forward ||
            (s.space.autoPilot && !s.space.arrivedMoon && !s.space.arrivedMars && !s.space.arrivedGateway)) &&
          s.space.fuelPct > 0;
        soundSynth.setThrustVolume(thrustOn ? (s.space.boostActive ? 0.75 : 0.45) : 0);

        if (s.resources.shield <= 0) {
          soundSynth.setThrustVolume(0);
          soundSynth.playCrash();
          failReasonRef.current = 'Solar radiation depleted your spacecraft shielding!';
          s.phase = 'gameover';
          syncUiNow();
          return;
        }
      } else if (s.phase === 'landing') {
        const payload = PAYLOADS[payloadRef.current];
        s.landing = stepLandingPhysics(s.landing, s.input, dt, payload.fragile);
        soundSynth.setThrustVolume(!s.landing.landed && s.landing.fuelPct > 0 ? s.landing.throttle : 0);

        if (s.landing.landed) {
          soundSynth.setThrustVolume(0);
          if (s.landing.result === 'crash') {
            soundSynth.playCrash();
            failReasonRef.current =
              s.landing.planet === 'mars'
                ? 'Mars Jezero touchdown was too fast or tilted! 0.38g demands earlier braking.'
                : 'Lunar touchdown was too fast or tilted! Brake earlier next time.';
            s.phase = 'gameover';
            syncUiNow();
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

          const startX = clamp(s.landing.x + 5, -120, 120);
          const startZ = clamp(s.landing.z + 5, -120, 120);
          s.planet = s.landing.planet;
          s.rover = createInitialRoverState(startX, startZ, s.landing.planet);
          s.objectives = clonePlanetObjectives(s.landing.planet);
          activeAnomalyRef.current = null;
          phaseTimerRef.current = 0;
          scienceMultRef.current = 1.0;
          s.phase = 'rover';
          syncUiNow();
          return;
        }
      } else if (s.phase === 'rover') {
        soundSynth.setThrustVolume(0);
        const colliders = sceneMgrRef.current?.getSurfaceColliders(s.rover.planet) || [];
        s.rover = stepRoverPhysics(s.rover, s.input, colliders, dt);
        phaseTimerRef.current += dt;

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

        // Survival trade-offs: regolith berm cuts shield drain; Mars dust shades solar output
        const bermFactor = Math.max(0.45, 1 - carryoverRef.current.regolithShieldLevel * 0.25);
        const flareDrain = (s.donkiFlareActive ? 0.42 : 0.18) * bermFactor;
        const dustPenalty = s.rover.planet === 'mars' ? (s.rover.dustAccumulationPct / 100) * 0.35 : 0;

        s.resources.oxygen = clamp(s.resources.oxygen - 0.48 * dt, 0, 100);
        s.resources.power = clamp(
          s.resources.power - ((s.rover.headlightsOn ? 0.38 : 0.24) + dustPenalty) * dt,
          0,
          100
        );
        s.resources.shield = clamp(s.resources.shield - flareDrain * dt, 0, 100);

        // Science Drilling / Coring Check
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
            nearest.completed = true;
            s.activeDrillingId = null;
            s.resources.power = clamp(s.resources.power + (nearest.reward.power || 0), 0, 100);
            s.resources.oxygen = clamp(s.resources.oxygen + (nearest.reward.oxygen || 0), 0, 100);
            s.resources.shield = clamp(s.resources.shield + (nearest.reward.shield || 0), 0, 100);
            scoreRef.current += 800;

            // Persist ISRU + Field Note Reuse Carryover
            carryoverRef.current = {
              ...carryoverRef.current,
              isruWaterKg: carryoverRef.current.isruWaterKg + (nearest.isruWaterGainKg || 0),
              isruFuelBonusPct: Math.min(
                45,
                carryoverRef.current.isruFuelBonusPct + (nearest.isruFuelGainPct || 0)
              ),
              solarGridKw: carryoverRef.current.solarGridKw + (nearest.solarGainKw || 0),
              regolithShieldLevel:
                carryoverRef.current.regolithShieldLevel + (nearest.shieldLevelGain || 0),
              marsSamplesCached:
                carryoverRef.current.marsSamplesCached + (nearest.marsSamplesGain || 0),
            };
            unlockFieldNote(nearest.unlockNoteId);
            soundSynth.playSuccess();

            const allDone = s.objectives.every((o) => o.completed);
            if (allDone) {
              scoreRef.current += Math.round(
                (s.resources.power + s.resources.oxygen + s.resources.shield) * 8
              );
              markMissionComplete(
                s.rover.planet === 'mars' ? 'mars-pathfinder' : 'artemis-3'
              );
              s.phase = 'victory';
            } else {
              discoveryObjRef.current = { ...nearest };
            }
            syncUiNow();
            return;
          }
        } else {
          s.activeDrillingId = null;
        }

        if (s.resources.oxygen <= 0 || s.resources.power <= 0 || s.resources.shield <= 0) {
          soundSynth.playCrash();
          failReasonRef.current =
            s.resources.oxygen <= 0
              ? 'Outpost Oxygen ran out! Complete Ice/MOXIE objectives or manage O₂.'
              : s.resources.power <= 0
                ? 'Outpost Power depleted! Survey ridges to recharge & clean dust.'
                : 'Radiation Shield failed during solar activity!';
          s.phase = 'gameover';
          syncUiNow();
          return;
        }
      } else {
        soundSynth.setThrustVolume(0);
      }

      // Throttled <= 10Hz UI state sync
      const now = performance.now();
      if (now - lastUiSyncRef.current > 100) {
        lastUiSyncRef.current = now;
        setLaunchUi({ ...s.launch });
        setSpaceUi({ ...s.space, orbitalSat: { ...s.space.orbitalSat } });
        setLandingUi({ ...s.landing });
        setRoverUi({ ...s.rover });
        setResourcesUi({ ...s.resources });
        setObjectivesUi(s.objectives.map((o) => ({ ...o })));
      }
    },
    [fieldNotebookOpen, markMissionComplete, nasaModalOpen, syncUiNow, unlockFieldNote]
  );

  // Mount Three.js Scene Manager
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const mgr = new SpaceSceneManager(el, simRef, onFrameTick);
    sceneMgrRef.current = mgr;

    return () => {
      mgr.dispose();
      sceneMgrRef.current = null;
    };
  }, [onFrameTick]);

  // Unified Keyboard + Pointer + Hold-Button Input Hub
  useEffect(() => {
    const releaseAll = () => {
      simRef.current.input = { ...EMPTY_INPUT };
    };

    const setInputKey = (code: string, down: boolean) => {
      const inp = simRef.current.input;
      if (code === 'KeyW' || code === 'ArrowUp') inp.forward = down;
      if (code === 'KeyS' || code === 'ArrowDown') inp.backward = down;
      if (code === 'KeyA' || code === 'ArrowLeft') inp.left = down;
      if (code === 'KeyD' || code === 'ArrowRight') inp.right = down;
      if (code === 'Space' || code === 'KeyE') {
        inp.action = down;
        if (code === 'Space') {
          inp.stabilize = down;
        }
      }
      if (code === 'ShiftLeft' || code === 'ShiftRight') inp.boost = down;
      if (code === 'KeyQ') inp.tiltForward = down;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (!document.hasFocus()) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      soundSynth.init();

      const s = simRef.current;
      if (e.code === 'KeyM') {
        const m = soundSynth.toggleMute();
        setMuted(m);
        return;
      }

      if (e.code === 'Tab' && !e.repeat && s.phase === 'rover') {
        setMapExpanded((prev) => !prev);
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (
          s.phase !== 'title' &&
          s.phase !== 'briefing' &&
          s.phase !== 'inspector' &&
          s.phase !== 'victory' &&
          s.phase !== 'gameover'
        ) {
          s.paused = !s.paused;
          syncUiNow();
        }
        return;
      }

      if (s.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        jumpToPhase('briefing');
        return;
      }

      if (s.phase === 'launch' && e.code === 'KeyR' && !e.repeat) {
        s.input = { ...EMPTY_INPUT };
        s.launch = createInitialLaunchState(s.launch.autoGuidance);
        launchPrevCountdownDigitRef.current = 4;
        soundSynth.setThrustVolume(0);
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
        const order: CameraMode[] = ['chase', 'cockpit', 'overhead', 'orbit'];
        s.cameraMode = order[(order.indexOf(s.cameraMode) + 1) % order.length];
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
        }
      }

      if (!e.repeat && s.phase === 'rover') {
        if (e.code === 'Digit1') s.rover.driveMode = 'DRIVE';
        if (e.code === 'Digit2') s.rover.driveMode = 'CRAB';
        if (e.code === 'Digit3') s.rover.driveMode = 'SPIN';
        if (e.code === 'Digit4') s.rover.driveMode = 'WALKER';
        if (e.code === 'KeyF') s.rover.highClearance = !s.rover.highClearance;
        if (e.code === 'KeyL') s.rover.headlightsOn = !s.rover.headlightsOn;
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
    };
    const onPointerUp = () => {
      if (heldBtnKeys.length > 0) {
        heldBtnKeys.forEach((k) => {
          simRef.current.input[k] = false;
        });
        heldBtnKeys = [];
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
  }, [jumpToPhase, syncUiNow]);

  // Drag-to-orbit camera handler on canvas container
  const dragStateRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    dragStateRef.current = { active: true, x: e.clientX, y: e.clientY };
  };
  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!dragStateRef.current.active) return;
    const dx = e.clientX - dragStateRef.current.x;
    const dy = e.clientY - dragStateRef.current.y;
    dragStateRef.current = { active: true, x: e.clientX, y: e.clientY };
    const s = simRef.current;
    if (s.phase === 'inspector' || s.cameraMode === 'orbit') {
      s.orbitYaw -= dx * 0.008;
      s.orbitPitch = clamp(s.orbitPitch + dy * 0.006, -0.35, 1.15);
    }
  };
  const handleCanvasPointerUp = () => {
    dragStateRef.current.active = false;
  };
  const handleCanvasWheel = (e: React.WheelEvent) => {
    const s = simRef.current;
    if (s.phase === 'inspector' || s.cameraMode === 'orbit') {
      s.orbitDistance = clamp(s.orbitDistance + e.deltaY * 0.02, 6, 48);
    }
  };

  const toggleMute = () => {
    const next = soundSynth.toggleMute();
    setMuted(next);
  };

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

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      {/* Full-bleed WebGL 3D Canvas Container */}
      <div
        ref={containerRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onWheel={handleCanvasWheel}
        className="fixed inset-0 z-0"
      />

      {phase === 'title' && (
        <TitleOverlay
          showcase={showcase}
          carryover={carryoverUi}
          onSelectShowcase={(v) => {
            simRef.current.showcase = v;
            setShowcase(v);
          }}
          onSelectCampaignMission={selectCampaignMission}
          onStartMission={() => jumpToPhase('briefing')}
          onJumpToPhase={(p) => jumpToPhase(p)}
          onOpenNotebook={() => setFieldNotebookOpen(true)}
          onOpenNasaModal={() => setNasaModalOpen(true)}
          muted={muted}
          onToggleMute={toggleMute}
        />
      )}

      {phase === 'inspector' && (
        <VehicleInspectorOverlay
          showcase={showcase}
          selectedPartId={highlightedPart}
          unlockedNotes={carryoverUi.unlockedFieldNotes}
          onSelectVehicle={(v) => {
            simRef.current.showcase = v;
            simRef.current.orbitDistance =
              v === 'rocket' ? 35 : v === 'outpost' ? 24 : v === 'rover' ? 6.2 : 11;
            const firstPart = VEHICLE_CATALOG[v].parts[0];
            simRef.current.highlightedPart = firstPart.id;
            unlockFieldNote(firstPart.unlockNoteId);
            setShowcase(v);
            syncUiNow();
          }}
          onSelectPart={(id) => {
            simRef.current.highlightedPart = id;
            const part = VEHICLE_CATALOG[showcase].parts.find((p) => p.id === id);
            unlockFieldNote(part?.unlockNoteId);
            setHighlightedPart(id);
            syncUiNow();
          }}
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

      {phase === 'launch' && (
        <LaunchHUD
          launch={launchUi}
          resources={resourcesUi}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={() => {
            simRef.current.paused = true;
            syncUiNow();
          }}
          onResetLaunch={() => {
            soundSynth.init();
            soundSynth.playClick();
            soundSynth.setThrustVolume(0);
            simRef.current.input = { ...EMPTY_INPUT };
            simRef.current.launch = createInitialLaunchState(simRef.current.launch.autoGuidance);
            launchPrevCountdownDigitRef.current = 4;
            syncUiNow();
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
          onToggleAutoGuidance={() => {
            simRef.current.launch.autoGuidance = !simRef.current.launch.autoGuidance;
            syncUiNow();
          }}
          onSkipToSpace={() => jumpToPhase('space')}
          onJumpToPhase={(p) => jumpToPhase(p)}
          onOpenNasaModal={() => setNasaModalOpen(true)}
        />
      )}

      {phase === 'space' && (
        <SpaceFlightHUD
          space={spaceUi}
          resources={resourcesUi}
          campaignMission={carryoverUi.activeMission}
          carryover={carryoverUi}
          activeAnomaly={activeAnomalyUi}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={() => {
            simRef.current.paused = true;
            syncUiNow();
          }}
          onSelectTarget={(id: SpaceTargetId) => {
            simRef.current.space.targetId = id;
            syncUiNow();
          }}
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
          onResolveAnomaly={handleResolveAnomaly}
          onOpenNotebook={() => setFieldNotebookOpen(true)}
        />
      )}

      {phase === 'landing' && (
        <LandingHUD
          landing={landingUi}
          isruFuelBonusPct={carryoverUi.isruFuelBonusPct}
          cameraMode={cameraMode}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={() => {
            simRef.current.paused = true;
            syncUiNow();
          }}
          onCycleCamera={() => {
            const order: CameraMode[] = ['chase', 'cockpit', 'overhead', 'orbit'];
            simRef.current.cameraMode =
              order[(order.indexOf(simRef.current.cameraMode) + 1) % order.length];
            syncUiNow();
          }}
          onSelectZone={(id) => {
            simRef.current.landing.targetZoneId = id;
            syncUiNow();
          }}
          onSetGuidance={(mode: LandingGuidanceMode) => {
            simRef.current.landing.guidanceMode = mode;
            syncUiNow();
          }}
        />
      )}

      {phase === 'rover' && (
        <RoverHUD
          rover={roverUi}
          resources={resourcesUi}
          objectives={objectivesUi}
          carryover={carryoverUi}
          activeAnomaly={activeAnomalyUi}
          nearestObjective={nearestObjective}
          cameraMode={cameraMode}
          mapExpanded={mapExpanded}
          muted={muted}
          onToggleMute={toggleMute}
          onToggleMap={() => setMapExpanded((prev) => !prev)}
          onPause={() => {
            simRef.current.paused = true;
            syncUiNow();
          }}
          onCycleCamera={() => {
            const order: CameraMode[] = ['chase', 'cockpit', 'overhead', 'orbit'];
            simRef.current.cameraMode =
              order[(order.indexOf(simRef.current.cameraMode) + 1) % order.length];
            syncUiNow();
          }}
          onSetDriveMode={(mode: RoverDriveMode) => {
            simRef.current.rover.driveMode = mode;
            syncUiNow();
          }}
          onToggleClearance={() => {
            simRef.current.rover.highClearance = !simRef.current.rover.highClearance;
            syncUiNow();
          }}
          onToggleHeadlights={() => {
            simRef.current.rover.headlightsOn = !simRef.current.rover.headlightsOn;
            syncUiNow();
          }}
          onResolveAnomaly={handleResolveAnomaly}
          onOpenNasaModal={() => setNasaModalOpen(true)}
          onOpenNotebook={() => setFieldNotebookOpen(true)}
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

      {(paused || phase === 'gameover' || phase === 'victory') && !discoveryObjUi && (
        <OutcomeModal
          mode={phase === 'victory' ? 'victory' : phase === 'gameover' ? 'gameover' : 'pause'}
          reason={failReason}
          score={scoreUi}
          resources={resourcesUi}
          carryover={carryoverUi}
          nextMissionLabel={nextMissionLabel}
          onResume={
            paused
              ? () => {
                  simRef.current.paused = false;
                  syncUiNow();
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
          onRetry={() => {
            if (phase === 'victory' || phase === 'gameover') {
              jumpToPhase('briefing');
            } else {
              jumpToPhase(phase);
            }
          }}
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
