/**
 * Deterministic QA Harness for Artemis Odyssey
 * Exposes window.__QA__ when ?qa=1 is present in the URL.
 */

export interface QASceneStats {
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  geometries: number;
  textures: number;
  programs: number;
  fps: number;
  frameTimeMs: number;
}

export interface QANodeSummary {
  name: string;
  type: string;
  visible: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  childrenCount: number;
}

export interface QAHarness {
  isReady: boolean;
  version: string;
  seedRandom: (seed?: number) => void;
  pause: () => void;
  resume: () => void;
  step: (frames?: number) => void;
  isPaused: () => boolean;
  waitUntilIdle: (timeoutMs?: number) => Promise<boolean>;
  jumpToScene: (sceneId: string, params?: Record<string, any>) => Promise<boolean>;
  setCameraPreset: (preset: { position: [number, number, number]; target: [number, number, number]; fov?: number }) => void;
  setTimeWarp: (warp: number) => void;
  injectMissionState: (stateUpdate: Record<string, any>) => void;
  dumpSceneStats: () => QASceneStats;
  dumpSceneGraph: () => QANodeSummary[];
  getWebGLInfo: () => { renderer: string; unmaskedRenderer: string; unmaskedVendor: string };
}

declare global {
  interface Window {
    __QA__?: QAHarness;
    __QA_APP_CONTEXT__?: any;
  }
}

// Deterministic Pseudo-Random Number Generator (Mulberry32)
export function createSeededRNG(seed: number = 0x12345678) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let originalRandom: (() => number) | null = null;
let isPausedState = false;
let stepFramesRemaining = 0;

export function installQAHarness(appContext: any) {
  if (typeof window === 'undefined') return;

  const urlParams = new URLSearchParams(window.location.search);
  const qaEnabled = urlParams.get('qa') === '1';
  if (!qaEnabled) return;

  console.log('[QA] Initializing deterministic QA harness...');

  // Seeded Random Number Generator
  const seedRandom = (seed: number = 0x12345678) => {
    if (!originalRandom) originalRandom = Math.random;
    const rng = createSeededRNG(seed);
    Math.random = rng;
    console.log(`[QA] Math.random overridden with seeded Mulberry32 (seed: 0x${seed.toString(16)})`);
  };

  seedRandom(0x4a82b3d1);

  const harness: QAHarness = {
    isReady: true,
    version: '1.0.0',
    seedRandom,
    pause: () => {
      isPausedState = true;
      if (appContext?.setSimulationPaused) appContext.setSimulationPaused(true);
      console.log('[QA] Simulation paused');
    },
    resume: () => {
      isPausedState = false;
      stepFramesRemaining = 0;
      if (appContext?.setSimulationPaused) appContext.setSimulationPaused(false);
      console.log('[QA] Simulation resumed');
    },
    step: (frames: number = 1) => {
      stepFramesRemaining = frames;
      isPausedState = false;
      if (appContext?.stepSimulation) appContext.stepSimulation(frames);
      console.log(`[QA] Stepped ${frames} frame(s)`);
    },
    isPaused: () => isPausedState,
    waitUntilIdle: async (timeoutMs: number = 10000) => {
      const start = performance.now();
      while (performance.now() - start < timeoutMs) {
        const sceneManager = appContext?.getSceneManager?.();
        const pendingLoads = sceneManager?.hasPendingLoads?.() ?? false;
        if (!pendingLoads) {
          // Wait 3 animation frames for GPU rasterization to settle
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
          return true;
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      return false;
    },
    jumpToScene: async (sceneId: string, params: Record<string, any> = {}) => {
      console.log(`[QA] Jumping to scene: ${sceneId}`, params);
      if (!appContext) return false;

      const sim = appContext.getSim ? appContext.getSim() : {};

      if (!(sceneId === 'landing' && params.state === 'crash')) {
        appContext.updateMissionState?.({
          crashFx: { active: false, kind: 'landing', elapsed: 0, x: 0, y: 0, z: 0, planet: 'moon' },
        });
      }

      // Handle common scene jump targets
      switch (sceneId) {
        case 'title':
          appContext.setPhase?.('title');
          appContext.getSceneManager?.()?.resetTitleOrbit?.();
          break;
        case 'briefing':
          appContext.setPhase?.('briefing');
          if (params.tab && appContext.setBriefingTab) appContext.setBriefingTab(params.tab);
          break;
        case 'pad_countdown':
        case 'launch':
          appContext.setPhase?.('launch');
          if (params.stage) {
            const launchBase = sim.launch || {};
            if (params.stage === 'ignition') {
              appContext.updateMissionState?.({
                launch: { ...launchBase, launchSequence: 'IGNITION', countdownSec: 0, throttle: 1.0, ignited: true },
              });
            } else if (params.stage === 'liftoff') {
              appContext.updateMissionState?.({
                launch: { ...launchBase, launchSequence: 'ASCENDING', altitudeKm: params.altitudeKm || 0.15, verticalSpeedMs: params.verticalSpeedMs || 45, throttle: 1.0, ignited: true },
              });
            } else if (params.stage === 'max_q') {
              appContext.updateMissionState?.({
                launch: { ...launchBase, launchSequence: 'ASCENDING', altitudeKm: 13.5, dynamicPressureKpa: 34.5, machNumber: 1.6, throttle: 0.72 },
              });
            } else if (params.stage === 'srb_sep') {
              appContext.updateMissionState?.({
                launch: { ...launchBase, launchSequence: 'ASCENDING', altitudeKm: 48.0, srbSeparated: true, throttle: 1.0 },
              });
            } else if (params.stage === 'core_sep') {
              appContext.updateMissionState?.({
                launch: { ...launchBase, launchSequence: 'ASCENDING', altitudeKm: 155.0, srbSeparated: true, coreSeparated: true },
              });
            } else if (params.stage === 'icps') {
              appContext.updateMissionState?.({
                launch: { ...launchBase, launchSequence: 'ASCENDING', altitudeKm: 175.0, srbSeparated: true, coreSeparated: true, throttle: 1.0 },
              });
            } else if (params.stage === 'orbit') {
              appContext.updateMissionState?.({
                launch: { ...launchBase, orbitReached: true, altitudeKm: 185.0 },
              });
            }
          }
          break;
        case 'space':
          appContext.setPhase?.('space');
          if (params.maneuver === 'tli') {
            const spaceBase = sim.space || {};
            appContext.updateMissionState?.({
              space: { ...spaceBase, tliBurnActive: true, throttle: 1.0 },
            });
          }
          if (params.focusedBody !== undefined) {
            appContext.focusSolarBody?.(params.focusedBody);
          }
          if (params.scaleMode) {
            appContext.setSolarScaleMode?.(params.scaleMode);
          }
          if (params.viewMode === 'solar_system') {
            appContext.setSpaceCameraMode?.('overview');
          }
          break;
        case 'landing':
          if (params.state === 'crash') {
            appContext.setPhase?.('gameover');
            appContext.updateMissionState?.({
              crashFx: { active: true, kind: 'landing', elapsed: 0.5, x: 0, y: 0.36, z: 0, planet: 'moon' },
            });
          } else {
            appContext.setPhase?.('landing');
            if (params.state === 'touchdown') {
              const landingBase = sim.landing || {};
              appContext.updateMissionState?.({
                landing: { ...landingBase, landed: true, y: 0.36, verticalSpeedMs: -0.4, pitchDeg: 0 },
              });
            } else if (params.state === 'hard_landing') {
              const landingBase = sim.landing || {};
              appContext.updateMissionState?.({
                landing: { ...landingBase, landed: true, y: 0.36, verticalSpeedMs: -2.8, pitchDeg: 4.2 },
              });
            }
          }
          break;
        case 'surface_moon':
          appContext.setPhase?.('rover');
          appContext.setSurfaceBody?.('moon');
          if (params.roverDriving) {
            const roverBase = sim.rover || {};
            appContext.updateMissionState?.({
              rover: { ...roverBase, throttle: 1.0, speedScale: 1.0 },
            });
          }
          break;
        case 'surface_mars':
          appContext.setPhase?.('rover');
          appContext.setSurfaceBody?.('mars');
          break;
        case 'pause_menu':
          appContext.openMenuWithTab?.(params.tab || 'map');
          break;
        case 'credits':
          appContext.openMenuWithTab?.('credits');
          break;
        case 'settings':
          appContext.openMenuWithTab?.('settings');
          break;
        case 'hardware_bay':
          appContext.setPhase?.('inspector');
          if (params.craft && appContext.setSelectedCraft) appContext.setSelectedCraft(params.craft);
          if (params.explodePct !== undefined && appContext.setExplodePercentage) {
            appContext.setExplodePercentage(params.explodePct);
          }
          break;
        default:
          console.warn(`[QA] Unknown sceneId: ${sceneId}`);
          return false;
      }

      await harness.waitUntilIdle();
      return true;
    },
    setCameraPreset: (preset) => {
      const sceneManager = appContext?.getSceneManager?.();
      if (!sceneManager) return;
      const camera = sceneManager.camera;
      const controls = sceneManager.controls;
      if (camera) {
        camera.position.set(...preset.position);
        if (preset.fov && camera.fov) {
          camera.fov = preset.fov;
          camera.updateProjectionMatrix();
        }
      }
      if (controls) {
        controls.target.set(...preset.target);
        controls.update();
      }
    },
    setTimeWarp: (warp: number) => {
      if (appContext?.setTimeWarp) appContext.setTimeWarp(warp);
    },
    injectMissionState: (stateUpdate: Record<string, any>) => {
      if (appContext?.updateMissionState) appContext.updateMissionState(stateUpdate);
    },
    dumpSceneStats: () => {
      const sceneManager = appContext?.getSceneManager?.();
      const renderer = sceneManager?.renderer;
      const rInfo = renderer?.info?.render;
      const mInfo = renderer?.info?.memory;

      return {
        drawCalls: rInfo?.calls ?? 0,
        triangles: rInfo?.triangles ?? 0,
        points: rInfo?.points ?? 0,
        lines: rInfo?.lines ?? 0,
        geometries: mInfo?.geometries ?? 0,
        textures: mInfo?.textures ?? 0,
        programs: renderer?.info?.programs?.length ?? 0,
        fps: sceneManager?.getCurrentFps?.() ?? 60,
        frameTimeMs: sceneManager?.getLastFrameTimeMs?.() ?? 16.6,
      };
    },
    dumpSceneGraph: () => {
      const sceneManager = appContext?.getSceneManager?.();
      const scene = sceneManager?.scene;
      if (!scene) return [];

      const list: QANodeSummary[] = [];
      scene.traverse((obj: any) => {
        list.push({
          name: obj.name || obj.userData?.solarBodyId || obj.userData?.partId || 'unnamed',
          type: obj.type,
          visible: obj.visible,
          position: [obj.position.x, obj.position.y, obj.position.z],
          rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
          scale: [obj.scale.x, obj.scale.y, obj.scale.z],
          childrenCount: obj.children?.length ?? 0,
        });
      });
      return list;
    },
    getWebGLInfo: () => {
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        return { renderer: 'none', unmaskedRenderer: 'none', unmaskedVendor: 'none' };
      }
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: gl ? gl.getParameter(gl.RENDERER) : 'none',
        unmaskedRenderer: (dbg && gl) ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'none',
        unmaskedVendor: (dbg && gl) ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'none',
      };
    },
  };

  window.__QA__ = harness;
  window.__QA_APP_CONTEXT__ = appContext;
  console.log('[QA] Harness successfully installed on window.__QA__');
}
