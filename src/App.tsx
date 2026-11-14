import { useCallback, useEffect, useRef, useState } from 'react';
import { BriefingOverlay } from './components/BriefingOverlay';
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
  INITIAL_OBJECTIVES,
  LANDING_ZONES,
  PAYLOADS,
  SOLAR_STORM_EVENTS,
  VEHICLE_CATALOG,
} from './game/constants';
import {
  applyOutpostDecision,
  clamp,
  createInitialLandingState,
  createInitialLaunchState,
  createInitialRoverState,
  createInitialSpaceFlightState,
  separateLaunchStage,
  stepLandingPhysics,
  stepLaunchPhysics,
  stepRoverPhysics,
  stepSpaceFlightPhysics,
  type OutpostDecisionId,
} from './game/physics';
import type {
  CameraMode,
  DonkiStatus,
  GamePhase,
  InputState,
  LandingGuidanceMode,
  LandingState,
  LaunchState,
  OutpostEvent,
  PayloadId,
  ResourceState,
  RoverCollider,
  RoverDriveMode,
  RoverObjective,
  RoverState,
  SpaceFlightState,
  SpaceTargetId,
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

const EMPTY_INPUT: InputState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  action: false,
  boost: false,
  tiltForward: false,
};

function cloneObjectives(): RoverObjective[] {
  return INITIAL_OBJECTIVES.map((o) => ({ ...o, reward: { ...o.reward }, progress: 0, completed: false }));
}

function cloneEvent(): OutpostEvent {
  return { ...SOLAR_STORM_EVENTS[0], resolvedChoice: null, scienceMultiplier: 1.0 };
}

export default function App() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneMgrRef = useRef<SpaceSceneManager | null>(null);
  const collidersRef = useRef<RoverCollider[]>([]);

  const isAutostart =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1';

  const simRef = useRef<SceneSimulationBridge>({
    phase: isAutostart ? 'launch' : 'title',
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
    space: createInitialSpaceFlightState(),
    landing: createInitialLandingState(PAYLOADS['oxygen-tanks'].massMultiplier),
    rover: createInitialRoverState(),
    resources: { power: 75, oxygen: 75, shield: 70 },
    objectives: cloneObjectives(),
    input: { ...EMPTY_INPUT },
  });

  const payloadRef = useRef<PayloadId>('oxygen-tanks');
  const scoreRef = useRef<number>(0);
  const outpostEventRef = useRef<OutpostEvent | null>(null);
  const roverTimerRef = useRef<number>(0);
  const scienceMultRef = useRef<number>(1.0);
  const discoveryObjRef = useRef<RoverObjective | null>(null);
  const failReasonRef = useRef<string>('');
  const lastUiSyncRef = useRef<number>(0);
  const lastDrillSoundRef = useRef<number>(0);

  const [phase, setPhase] = useState<GamePhase>(simRef.current.phase);
  const [paused, setPaused] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [showcase, setShowcase] = useState<VehicleShowcaseId>('outpost');
  const [highlightedPart, setHighlightedPart] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<PayloadId>('oxygen-tanks');
  const [donki, setDonki] = useState<DonkiStatus>(DEFAULT_DONKI);
  const [nasaModalOpen, setNasaModalOpen] = useState<boolean>(false);

  const [launchUi, setLaunchUi] = useState<LaunchState>(simRef.current.launch);
  const [spaceUi, setSpaceUi] = useState<SpaceFlightState>(simRef.current.space);
  const [landingUi, setLandingUi] = useState<LandingState>(simRef.current.landing);
  const [roverUi, setRoverUi] = useState<RoverState>(simRef.current.rover);
  const [resourcesUi, setResourcesUi] = useState<ResourceState>(simRef.current.resources);
  const [objectivesUi, setObjectivesUi] = useState<RoverObjective[]>(simRef.current.objectives);
  const [activeEventUi, setActiveEventUi] = useState<OutpostEvent | null>(null);
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
    setLaunchUi({ ...s.launch });
    setSpaceUi({ ...s.space });
    setLandingUi({ ...s.landing });
    setRoverUi({ ...s.rover });
    setResourcesUi({ ...s.resources });
    setObjectivesUi(s.objectives.map((o) => ({ ...o })));
    setActiveEventUi(outpostEventRef.current ? { ...outpostEventRef.current } : null);
    setDiscoveryObjUi(discoveryObjRef.current ? { ...discoveryObjRef.current } : null);
    setScoreUi(scoreRef.current);
    setFailReason(failReasonRef.current);
  }, []);

  // Update body[data-state] for deterministic automation/accessibility state checks
  useEffect(() => {
    let bodyState = 'playing';
    if (phase === 'title') bodyState = 'title';
    else if (phase === 'gameover' || phase === 'victory') bodyState = 'gameover';
    else if (paused || nasaModalOpen || discoveryObjUi) bodyState = 'paused';
    document.body.dataset.state = bodyState;
  }, [phase, paused, nasaModalOpen, discoveryObjUi]);

  // Fetch live NASA DONKI solar flare telemetry
  useEffect(() => {
    fetch('/api/donki')
      .then((r) => r.json())
      .then((data: DonkiStatus) => {
        setDonki(data);
        const flareHeavy = /M|X/i.test(data.classType || '');
        simRef.current.donkiFlareActive = flareHeavy;
      })
      .catch(() => {});
  }, []);

  const applyPayloadBonus = useCallback((id: PayloadId): ResourceState => {
    const p = PAYLOADS[id];
    return {
      power: clamp(75 + (p.bonus.power || 0), 0, 100),
      oxygen: clamp(75 + (p.bonus.oxygen || 0), 0, 100),
      shield: clamp(70 + (p.bonus.shield || 0), 0, 100),
    };
  }, []);

  const jumpToPhase = useCallback(
    (targetPhase: GamePhase) => {
      soundSynth.init();
      soundSynth.playClick();
      const s = simRef.current;
      const payload = PAYLOADS[payloadRef.current];

      s.paused = false;
      s.input = { ...EMPTY_INPUT };
      s.activeDrillingId = null;
      discoveryObjRef.current = null;
      failReasonRef.current = '';

      if (targetPhase === 'title') {
        s.phase = 'title';
        s.showcase = 'outpost';
        s.highlightedPart = null;
        soundSynth.setThrustVolume(0);
      } else if (targetPhase === 'inspector') {
        s.phase = 'inspector';
        s.showcase = 'rocket';
        s.highlightedPart = VEHICLE_CATALOG.rocket.parts[0].id;
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
        s.launch = createInitialLaunchState();
        scoreRef.current = 0;
      } else if (targetPhase === 'space') {
        s.phase = 'space';
        s.resources = applyPayloadBonus(payloadRef.current);
        s.space = createInitialSpaceFlightState();
      } else if (targetPhase === 'landing') {
        s.phase = 'landing';
        s.cameraMode = 'chase';
        s.resources = applyPayloadBonus(payloadRef.current);
        s.landing = createInitialLandingState(payload.massMultiplier);
      } else if (targetPhase === 'rover') {
        s.phase = 'rover';
        s.cameraMode = 'chase';
        s.resources = applyPayloadBonus(payloadRef.current);
        s.rover = createInitialRoverState(6, 6);
        s.objectives = cloneObjectives();
        outpostEventRef.current = null;
        roverTimerRef.current = 0;
        scienceMultRef.current = 1.0;
      }
      syncUiNow();
    },
    [applyPayloadBonus, syncUiNow]
  );

  // Per-frame physics + game progression loop
  const onFrameTick = useCallback(
    (dt: number) => {
      const s = simRef.current;
      if (s.paused || nasaModalOpen || discoveryObjRef.current) {
        soundSynth.setThrustVolume(0);
        return;
      }

      if (s.phase === 'launch') {
        s.launch = stepLaunchPhysics(s.launch, s.input, dt);
        soundSynth.setThrustVolume(s.launch.ignited && s.launch.fuelPct > 0 ? s.launch.throttle : 0);

        if (s.launch.orbitReached) {
          soundSynth.setThrustVolume(0);
          soundSynth.playSuccess();
          scoreRef.current += 500;
          s.phase = 'space';
          s.space = createInitialSpaceFlightState();
          syncUiNow();
          return;
        }
      } else if (s.phase === 'space') {
        const prevTargets = s.space.visitedTargets.length;
        const result = stepSpaceFlightPhysics(s.space, s.resources, s.input, s.donkiFlareActive, dt);
        s.space = result.space;
        s.resources = result.resources;
        if (s.space.visitedTargets.length > prevTargets) {
          scoreRef.current += 300;
          soundSynth.playSuccess();
        }
        const thrustOn = (s.input.forward || (s.space.autoPilot && !s.space.arrivedMoon)) && s.space.fuelPct > 0;
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
            failReasonRef.current = 'Lunar touchdown was too fast or tilted! Brake earlier next time.';
            s.phase = 'gameover';
            syncUiNow();
            return;
          }

          if (s.landing.result === 'hard' && payload.fragile) {
            s.resources.power = clamp(s.resources.power - 25, 10, 100);
          }
          if (s.landing.targetZoneId === 2 && s.landing.distToPad <= LANDING_ZONES[2].radius + 3.5) {
            s.resources.power = clamp(s.resources.power + 20, 0, 100);
          }
          scoreRef.current += s.landing.score;
          soundSynth.playSuccess();

          // Enter Rover & Base phase at landing coordinates (clamped safe from habitat)
          const startX = clamp(s.landing.x + 5, -75, 75);
          const startZ = clamp(s.landing.z + 5, -75, 75);
          s.rover = createInitialRoverState(startX, startZ);
          s.objectives = cloneObjectives();
          outpostEventRef.current = null;
          roverTimerRef.current = 0;
          scienceMultRef.current = 1.0;
          s.phase = 'rover';
          syncUiNow();
          return;
        }
      } else if (s.phase === 'rover') {
        soundSynth.setThrustVolume(0);
        s.rover = stepRoverPhysics(s.rover, s.input, collidersRef.current, dt);
        roverTimerRef.current += dt;

        // Trigger Solar Flare Trade-Off Event once after 4 seconds on the Moon
        if (!outpostEventRef.current && roverTimerRef.current > 4.0) {
          outpostEventRef.current = cloneEvent();
          soundSynth.playTone(440, 0.25, 'triangle', 0.16);
          syncUiNow();
        }

        // Gentle survival resource drain so trade-offs matter without stressing young players
        const flareDrain = s.donkiFlareActive ? 0.45 : 0.2;
        s.resources.oxygen = clamp(s.resources.oxygen - 0.55 * dt, 0, 100);
        s.resources.power = clamp(
          s.resources.power - (s.rover.headlightsOn ? 0.42 : 0.28) * dt,
          0,
          100
        );
        s.resources.shield = clamp(s.resources.shield - flareDrain * dt, 0, 100);

        // Science Drilling Check
        const nearest = s.objectives.find(
          (o) => !o.completed && Math.hypot(o.x - s.rover.x, o.z - s.rover.z) < 6.4
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
            soundSynth.playSuccess();

            const allDone = s.objectives.every((o) => o.completed);
            if (allDone) {
              scoreRef.current += Math.round(
                (s.resources.power + s.resources.oxygen + s.resources.shield) * 8
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
              ? 'Outpost Oxygen ran out! Complete Ice Drill objectives or boost life support.'
              : s.resources.power <= 0
                ? 'Outpost Power depleted! Survey the Solar Ridge to recharge.'
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
        setSpaceUi({ ...s.space });
        setLandingUi({ ...s.landing });
        setRoverUi({ ...s.rover });
        setResourcesUi({ ...s.resources });
        setObjectivesUi(s.objectives.map((o) => ({ ...o })));
      }
    },
    [nasaModalOpen, syncUiNow]
  );

  // Mount Three.js Scene Manager
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const mgr = new SpaceSceneManager(el, simRef, onFrameTick);
    sceneMgrRef.current = mgr;
    collidersRef.current = mgr.getLunarColliders();

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
      if (code === 'Space' || code === 'KeyE') inp.action = down;
      if (code === 'ShiftLeft' || code === 'ShiftRight') inp.boost = down;
      if (code === 'KeyQ') inp.tiltForward = down;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      soundSynth.init();

      const s = simRef.current;
      if (e.code === 'KeyM') {
        const m = soundSynth.toggleMute();
        setMuted(m);
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (s.phase !== 'title' && s.phase !== 'briefing' && s.phase !== 'inspector' && s.phase !== 'victory' && s.phase !== 'gameover') {
          s.paused = !s.paused;
          syncUiNow();
        }
        return;
      }

      if (s.phase === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
        jumpToPhase('briefing');
        return;
      }

      if (s.phase === 'launch' && e.code === 'Space' && !e.repeat) {
        s.launch = separateLaunchStage(s.launch);
        soundSynth.playStageSep();
        syncUiNow();
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
  const dragStateRef = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 });
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

  const nearestObjective =
    phase === 'rover'
      ? objectivesUi.find(
          (o) => !o.completed && Math.hypot(o.x - roverUi.x, o.z - roverUi.z) < 6.4
        ) || null
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
          onSelectShowcase={(v) => {
            simRef.current.showcase = v;
            setShowcase(v);
          }}
          onStartMission={() => jumpToPhase('briefing')}
          onJumpToPhase={jumpToPhase}
          onOpenNasaModal={() => setNasaModalOpen(true)}
          donki={donki}
          muted={muted}
          onToggleMute={toggleMute}
        />
      )}

      {phase === 'inspector' && (
        <VehicleInspectorOverlay
          showcase={showcase}
          selectedPartId={highlightedPart}
          onSelectVehicle={(v) => {
            simRef.current.showcase = v;
            simRef.current.orbitDistance =
              v === 'rocket' ? 35 : v === 'outpost' ? 24 : v === 'rover' ? 6.2 : 11;
            setShowcase(v);
          }}
          onSelectPart={(id) => {
            simRef.current.highlightedPart = id;
            setHighlightedPart(id);
          }}
          onBackTitle={() => jumpToPhase('title')}
          onStartMission={() => jumpToPhase('briefing')}
        />
      )}

      {phase === 'briefing' && (
        <BriefingOverlay
          selectedPayload={selectedPayload}
          onSelectPayload={(id) => {
            payloadRef.current = id;
            setSelectedPayload(id);
          }}
          resources={{ power: 75, oxygen: 75, shield: 70 }}
          donki={donki}
          onBack={() => jumpToPhase('title')}
          onLaunch={() => jumpToPhase('launch')}
          onOpenNasaModal={() => setNasaModalOpen(true)}
        />
      )}

      {phase === 'launch' && (
        <LaunchHUD
          launch={launchUi}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={() => {
            simRef.current.paused = true;
            syncUiNow();
          }}
          onSeparateStage={() => {
            simRef.current.launch = separateLaunchStage(simRef.current.launch);
            soundSynth.playStageSep();
            syncUiNow();
          }}
          onSkipToSpace={() => jumpToPhase('space')}
        />
      )}

      {phase === 'space' && (
        <SpaceFlightHUD
          space={spaceUi}
          resources={resourcesUi}
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
          onEnterLunarOrbit={() => jumpToPhase('landing')}
        />
      )}

      {phase === 'landing' && (
        <LandingHUD
          landing={landingUi}
          cameraMode={cameraMode}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={() => {
            simRef.current.paused = true;
            syncUiNow();
          }}
          onCycleCamera={() => {
            const order: CameraMode[] = ['chase', 'cockpit', 'overhead', 'orbit'];
            simRef.current.cameraMode = order[(order.indexOf(simRef.current.cameraMode) + 1) % order.length];
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
          activeEvent={activeEventUi}
          nearestObjective={nearestObjective}
          cameraMode={cameraMode}
          muted={muted}
          onToggleMute={toggleMute}
          onPause={() => {
            simRef.current.paused = true;
            syncUiNow();
          }}
          onCycleCamera={() => {
            const order: CameraMode[] = ['chase', 'cockpit', 'overhead', 'orbit'];
            simRef.current.cameraMode = order[(order.indexOf(simRef.current.cameraMode) + 1) % order.length];
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
          onResolveEvent={(choice: OutpostDecisionId) => {
            const out = applyOutpostDecision(simRef.current.resources, choice);
            simRef.current.resources = out.resources;
            scienceMultRef.current = out.scienceMultiplier;
            if (outpostEventRef.current) {
              outpostEventRef.current.resolvedChoice = out.summary;
            }
            soundSynth.playSuccess();
            syncUiNow();
          }}
          onOpenNasaModal={() => setNasaModalOpen(true)}
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
          onResume={
            paused
              ? () => {
                  simRef.current.paused = false;
                  syncUiNow();
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

      <NasaDataModal open={nasaModalOpen} donki={donki} onClose={() => setNasaModalOpen(false)} />
    </div>
  );
}
