import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PHYSICS, SOLAR_TARGETS, getLandingZones } from '../game/constants';
import { getSurfaceTerrainHeight } from '../game/physics';
import type {
  CameraMode,
  CampaignMissionId,
  GamePhase,
  InputState,
  LandingState,
  LaunchState,
  ResourceState,
  RoverCollider,
  RoverObjective,
  RoverState,
  SpaceFlightState,
  SurfacePlanet,
  VehicleShowcaseId,
} from '../game/types';
import {
  createLaunchComplexAndSLS,
  createLunarEnvironment,
  createLunarLander,
  createOrbitalSatellite,
  createSolarSystemScene,
  createViperRover,
  type LaunchComplexHandles,
  type LunarEnvironmentHandles,
  type LunarLanderHandles,
  type OrbitalSatelliteHandles,
  type SolarSystemHandles,
  type ViperRoverHandles,
} from './models';
import { createProceduralTextureSet, type ProceduralTextureSet } from './textures';

export interface SceneSimulationBridge {
  phase: GamePhase;
  campaignMission: CampaignMissionId;
  planet: SurfacePlanet;
  paused: boolean;
  cameraMode: CameraMode;
  showcase: VehicleShowcaseId;
  highlightedPart: string | null;
  donkiFlareActive: boolean;
  orbitYaw: number;
  orbitPitch: number;
  orbitDistance: number;
  activeDrillingId: string | null;
  launch: LaunchState;
  space: SpaceFlightState;
  landing: LandingState;
  rover: RoverState;
  resources: ResourceState;
  objectives: RoverObjective[];
  input: InputState;
}

const PARTICLE_COUNT = 260;

export class SpaceSceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envTarget: THREE.WebGLRenderTarget;
  private textures: ProceduralTextureSet;
  private isSoftwareGl: boolean;
  private disposed = false;
  private rafId = 0;
  private timerId = 0;
  private lastTime = performance.now();

  private lunarEnv: LunarEnvironmentHandles;
  private lander: LunarLanderHandles;
  private roverModel: ViperRoverHandles;
  private launchComplex: LaunchComplexHandles;
  private solarSystem: SolarSystemHandles;
  private showcaseSatellite: OrbitalSatelliteHandles;

  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.HemisphereLight;
  private starField: THREE.Points;

  // Landing guidance helpers
  private guideLine: THREE.Line;
  private bullseyeRing: THREE.Mesh;
  private predRing: THREE.Mesh;

  // Particle pool (ring buffer)
  private particlePoints: THREE.Points;
  private particlePos: Float32Array;
  private particleVel: Float32Array;
  private particleLife: Float32Array;
  private particleColors: Float32Array;
  private particleIdx = 0;

  // SRB separation visual timers
  private srbDetachedTime = -1;
  private coreDetachedTime = -1;

  // Camera smoothing scratch vectors
  private camPosTarget = new THREE.Vector3(0, 12, 28);
  private camLookCurrent = new THREE.Vector3(0, 2, 0);
  private camLookTarget = new THREE.Vector3(0, 2, 0);
  private scratchVec = new THREE.Vector3();
  private scratchColor = new THREE.Color();

  // Original emissive storage for part inspector highlight
  private emissiveOriginal = new WeakMap<THREE.MeshStandardMaterial, { hex: number; intensity: number }>();
  private lastHighlightedPart: string | null = null;
  private lastHighlightPhase: GamePhase | null = null;

  private simRef: { current: SceneSimulationBridge };
  private onFrameTick: (dt: number) => void;

  private onResizeBound: () => void;
  private onContextLostBound: (e: Event) => void;
  private onContextRestoredBound: () => void;

  constructor(
    container: HTMLElement,
    simRef: { current: SceneSimulationBridge },
    onFrameTick: (dt: number) => void
  ) {
    this.container = container;
    this.simRef = simRef;
    this.onFrameTick = onFrameTick;

    // Detect software WebGL (SwiftShader/llvmpipe) to pace loop safely without degrading visuals
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020617);

    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(54, aspect, 0.2, 1600);
    this.camera.position.set(14, 10, 24);

    // RoomEnvironment PBR reflections
    this.pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.pmremGenerator.compileEquirectangularShader();
    const roomEnv = new RoomEnvironment();
    this.envTarget = this.pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envTarget.texture;
    roomEnv.dispose();

    // Lighting
    this.ambientLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.55);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffbeb, 2.75);
    this.sunLight.position.set(90, 72, 60);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 320;
    const d = 110;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);

    // Starfield
    this.starField = this.createStarField();
    this.scene.add(this.starField);

    // Procedural Textures & World Models
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures = createProceduralTextureSet(maxAniso);

    this.lunarEnv = createLunarEnvironment(this.textures);
    this.scene.add(this.lunarEnv.group);

    this.lander = createLunarLander(this.textures);
    this.lander.group.position.set(0, 0, 0);
    this.scene.add(this.lander.group);

    this.roverModel = createViperRover(this.textures);
    this.roverModel.group.position.set(6, getSurfaceTerrainHeight('moon', 6, 6), 6);
    this.scene.add(this.roverModel.group);

    this.launchComplex = createLaunchComplexAndSLS(this.textures);
    this.scene.add(this.launchComplex.group);

    this.solarSystem = createSolarSystemScene(this.textures);
    this.scene.add(this.solarSystem.group);

    this.showcaseSatellite = createOrbitalSatellite(this.textures);
    this.showcaseSatellite.group.visible = false;
    this.showcaseSatellite.beaconMesh.visible = false;
    this.scene.add(this.showcaseSatellite.group);

    // Landing Guide Line & Surface Markers
    const guideGeo = new THREE.BufferGeometry();
    guideGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    this.guideLine = new THREE.Line(
      guideGeo,
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    );
    this.guideLine.visible = false;
    this.scene.add(this.guideLine);

    this.bullseyeRing = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.5, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    this.bullseyeRing.rotation.x = -Math.PI / 2;
    this.bullseyeRing.visible = false;
    this.scene.add(this.bullseyeRing);

    this.predRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.35, 24),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide })
    );
    this.predRing.rotation.x = -Math.PI / 2;
    this.predRing.visible = false;
    this.scene.add(this.predRing);

    // Particle Ring Buffer
    this.particlePos = new Float32Array(PARTICLE_COUNT * 3);
    this.particleVel = new Float32Array(PARTICLE_COUNT * 3);
    this.particleLife = new Float32Array(PARTICLE_COUNT);
    this.particleColors = new Float32Array(PARTICLE_COUNT * 3);
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.particlePos, 3));
    pGeo.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
    this.particlePoints = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        size: 1.75,
        map: this.textures.cloudPuff,
        vertexColors: true,
        transparent: true,
        opacity: 0.88,
        depthWrite: false,
      })
    );
    this.particlePoints.frustumCulled = false;
    this.scene.add(this.particlePoints);

    // Event listeners
    this.onResizeBound = () => this.handleResize();
    window.addEventListener('resize', this.onResizeBound);

    this.onContextLostBound = (e: Event) => {
      e.preventDefault();
      this.stopLoop();
    };
    this.onContextRestoredBound = () => {
      this.lastTime = performance.now();
      this.startLoop();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestoredBound);

    this.startLoop();
  }

  getLunarColliders(): RoverCollider[] {
    return this.lunarEnv.moonColliders;
  }

  getSurfaceColliders(planet: SurfacePlanet): RoverCollider[] {
    return planet === 'mars' ? this.lunarEnv.marsColliders : this.lunarEnv.moonColliders;
  }

  private detectSoftwareGl(): boolean {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      if (!ext) return false;
      const rendererName = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || '');
      return /SwiftShader|llvmpipe|Software|Mesa/i.test(rendererName);
    } catch {
      return false;
    }
  }

  private createStarField(): THREE.Points {
    const count = 1800;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 450 + Math.random() * 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) * 0.95 - 30;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const tint = 0.72 + Math.random() * 0.28;
      colors[i * 3] = i % 7 === 0 ? 0.75 : tint;
      colors[i * 3 + 1] = tint;
      colors[i * 3 + 2] = i % 5 === 0 ? 1.0 : tint;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({ size: 1.8, vertexColors: true, transparent: true, opacity: 0.9, sizeAttenuation: false })
    );
  }

  private handleResize() {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private startLoop() {
    this.stopLoop();
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const frameDt = Math.min(Math.max(rawDt, 0.001), 0.25);

      // Sub-step <= 0.05s so countdown and physics keep true 1:1 real-time pacing even on slower software WebGL
      let rem = frameDt;
      while (rem > 0.0001) {
        const step = Math.min(rem, 0.05);
        this.onFrameTick(step);
        rem -= step;
      }
      this.syncScene(Math.min(frameDt, 0.1), now * 0.001);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.rafId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.rafId = requestAnimationFrame(tick);
    } else {
      this.rafId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(next: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.timerId = window.setTimeout(next, 60);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      this.timerId = window.setTimeout(next, 60);
      return;
    }
    gl.flush();
    let checks = 0;
    const poll = () => {
      if (this.disposed) {
        gl.deleteSync(sync);
        return;
      }
      const status = gl.clientWaitSync(sync, 0, 0);
      checks++;
      if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED || checks > 12) {
        gl.deleteSync(sync);
        this.timerId = window.setTimeout(next, 120);
      } else {
        this.timerId = window.setTimeout(poll, 12);
      }
    };
    this.timerId = window.setTimeout(poll, 8);
  }

  private stopLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = 0;
    }
  }

  private emitParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    r: number,
    g: number,
    b: number
  ) {
    const i = this.particleIdx;
    this.particleIdx = (this.particleIdx + 1) % PARTICLE_COUNT;
    this.particlePos[i * 3] = x;
    this.particlePos[i * 3 + 1] = y;
    this.particlePos[i * 3 + 2] = z;
    this.particleVel[i * 3] = vx;
    this.particleVel[i * 3 + 1] = vy;
    this.particleVel[i * 3 + 2] = vz;
    this.particleLife[i] = life;
    this.particleColors[i * 3] = r;
    this.particleColors[i * 3 + 1] = g;
    this.particleColors[i * 3 + 2] = b;
  }

  private updateParticles(dt: number) {
    let anyAlive = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (this.particleLife[i] > 0) {
        anyAlive = true;
        this.particleLife[i] -= dt;
        this.particlePos[i * 3] += this.particleVel[i * 3] * dt;
        this.particlePos[i * 3 + 1] += this.particleVel[i * 3 + 1] * dt;
        this.particlePos[i * 3 + 2] += this.particleVel[i * 3 + 2] * dt;
        if (this.particleLife[i] <= 0) {
          this.particlePos[i * 3 + 1] = -9999;
        }
      }
    }
    if (anyAlive) {
      (this.particlePoints.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.particlePoints.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  private updatePartHighlight(partId: string | null, phase: GamePhase) {
    if (partId === this.lastHighlightedPart && phase === this.lastHighlightPhase) return;
    this.lastHighlightedPart = partId;
    this.lastHighlightPhase = phase;

    const targets = [
      this.launchComplex.rocketFull,
      this.lander.group,
      this.roverModel.group,
      this.lunarEnv.group,
      this.showcaseSatellite.group,
    ];

    targets.forEach((root) => {
      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const mat = obj.material;
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        if (!this.emissiveOriginal.has(mat)) {
          this.emissiveOriginal.set(mat, {
            hex: mat.emissive.getHex(),
            intensity: mat.emissiveIntensity,
          });
        }
        const orig = this.emissiveOriginal.get(mat)!;
        const meshPart = obj.userData.partId as string | undefined;
        if (phase === 'inspector' && partId && meshPart) {
          if (meshPart === partId) {
            mat.emissive.setHex(0xf59e0b);
            mat.emissiveIntensity = 0.95;
          } else {
            mat.emissive.setHex(orig.hex);
            mat.emissiveIntensity = orig.intensity * 0.28;
          }
        } else {
          mat.emissive.setHex(orig.hex);
          mat.emissiveIntensity = orig.intensity;
        }
      });
    });
  }

  private syncScene(dt: number, elapsedSec: number) {
    const s = this.simRef.current;
    const { phase } = s;

    // Reset launch visual offsets if not in launch or reset to pre-sim
    if (phase !== 'launch' || s.launch.launchSequence === 'PRE_SIM') {
      this.srbDetachedTime = -1;
      this.coreDetachedTime = -1;
    }

    // Visibility matrix per phase
    const showLaunch = phase === 'launch' || ((phase === 'title' || phase === 'inspector') && s.showcase === 'rocket');
    const showSatelliteShowcase = (phase === 'title' || phase === 'inspector') && s.showcase === 'satellite';
    const showSpace = phase === 'space';
    const showLunar = !showLaunch && !showSpace && !showSatelliteShowcase;

    this.launchComplex.group.visible = showLaunch;
    this.solarSystem.group.visible = showSpace;
    this.showcaseSatellite.group.visible = showSatelliteShowcase;
    this.lunarEnv.group.visible = showLunar;
    this.starField.visible = !showLaunch || s.launch.altitudeKm > 18;

    this.lander.group.visible =
      phase === 'landing' ||
      phase === 'rover' ||
      phase === 'victory' ||
      phase === 'gameover' ||
      phase === 'briefing' ||
      (phase === 'title' && s.showcase !== 'rocket' && s.showcase !== 'satellite') ||
      (phase === 'inspector' && (s.showcase === 'lander' || s.showcase === 'outpost'));

    this.roverModel.group.visible =
      phase === 'rover' ||
      phase === 'victory' ||
      phase === 'briefing' ||
      (phase === 'title' && (s.showcase === 'rover' || s.showcase === 'outpost')) ||
      (phase === 'inspector' && (s.showcase === 'rover' || s.showcase === 'outpost'));

    // Rotate Earth gently in Lunar Sky
    this.lunarEnv.earthGlobe.rotation.y += dt * 0.025;
    this.lunarEnv.earthClouds.rotation.y += dt * 0.033;

    // Highlight parts during Vehicle Inspector
    this.updatePartHighlight(s.highlightedPart, phase);

    // Hide landing helpers unless in landing phase
    this.guideLine.visible = false;
    this.bullseyeRing.visible = false;
    this.predRing.visible = false;
    this.lunarEnv.trajectoryArc.visible = false;
    this.lunarEnv.approachGates.forEach((g) => (g.group.visible = false));
    this.lunarEnv.landingZoneMeshes.forEach((z) => {
      z.group.visible = phase === 'landing' && z.planet === s.planet;
    });

    if (showLaunch) {
      this.syncLaunchScene(s, dt, elapsedSec);
    } else if (showSatelliteShowcase) {
      this.syncSatelliteShowcaseScene(s, elapsedSec);
    } else if (showSpace) {
      this.syncSpaceScene(s, dt, elapsedSec);
    } else {
      this.syncLunarScene(s, dt, elapsedSec);
    }

    this.updateParticles(dt);
  }

  private syncSatelliteShowcaseScene(s: SceneSimulationBridge, elapsedSec: number) {
    (this.scene.background as THREE.Color).setHex(0x020617);
    const sat = this.showcaseSatellite;
    sat.group.position.set(0, 0, 0);
    sat.group.rotation.set(0.18, elapsedSec * 0.25, 0);
    sat.solarLeftPivot.scale.x = 1;
    sat.solarRightPivot.scale.x = 1;
    sat.linkBeam.visible = false;

    if (s.phase === 'title') {
      this.camera.position.set(4.5, 2.6, 6.2);
      this.camera.lookAt(-1.4, 0, 0);
    } else {
      const dist = Math.min(18, Math.max(5.5, s.orbitDistance * 0.45));
      this.camera.position.set(
        Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
        Math.sin(s.orbitPitch) * dist,
        Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
      );
      this.camera.lookAt(0, 0, 0);
    }
  }

  private syncLaunchScene(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const L = s.launch;
    const lc = this.launchComplex;

    // Gentle horizon cloud drift
    lc.cloudLayer.rotation.y = Math.sin(elapsedSec * 0.03) * 0.05;

    if (s.phase === 'title' || s.phase === 'inspector') {
      lc.groundGroup.visible = true;
      lc.groundGroup.position.set(0, 0, 0);
      lc.earthLimb.visible = false;
      lc.moonMesh.visible = s.phase === 'title';
      lc.cloudLayer.visible = true;
      lc.crewAccessArm.rotation.y = 0;
      lc.rocketFull.position.set(0, 2.5, 0);
      lc.rocketFull.rotation.set(0, s.phase === 'inspector' ? elapsedSec * 0.16 : 0, 0);
      lc.srbLeft.visible = true;
      lc.srbLeft.position.set(0, 0, 0);
      lc.srbLeft.rotation.set(0, 0, 0);
      lc.srbRight.visible = true;
      lc.srbRight.position.set(0, 0, 0);
      lc.srbRight.rotation.set(0, 0, 0);
      lc.coreGroup.visible = true;
      lc.coreGroup.position.set(0, 0, 0);
      lc.abortTower.visible = true;
      lc.flameGroup.visible = false;
      lc.trenchLight.intensity = 0;
      (this.scene.background as THREE.Color).setHex(0x0b132b);

      if (s.phase === 'title') {
        // Frame rocket nicely on the right half so left title scrim never overlaps
        this.camera.position.set(22, 16, 30);
        this.camera.lookAt(-6.5, 13.0, 0);
      } else {
        const dist = s.orbitDistance;
        this.camera.position.set(
          Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
          12.0 + Math.sin(s.orbitPitch) * dist,
          Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
        );
        this.camera.lookAt(0, 12.0, 0);
      }
      return;
    }

    lc.moonMesh.visible = true;

    // PRE-SIMULATION & COUNTDOWN / READY: Keep exact same rocket & pad 39B scene, glide camera smoothly
    if (L.launchSequence !== 'ASCENDING') {
      lc.groundGroup.visible = true;
      lc.groundGroup.position.set(0, 0, 0);
      lc.earthLimb.visible = false;
      lc.cloudLayer.visible = true;
      lc.rocketFull.position.set(0, 2.5, 0);
      lc.rocketFull.rotation.set(0, 0, 0);
      lc.srbLeft.visible = true;
      lc.srbLeft.position.set(0, 0, 0);
      lc.srbLeft.rotation.set(0, 0, 0);
      lc.srbRight.visible = true;
      lc.srbRight.position.set(0, 0, 0);
      lc.srbRight.rotation.set(0, 0, 0);
      lc.coreGroup.visible = true;
      lc.coreGroup.position.set(0, 0, 0);
      lc.abortTower.visible = true;
      lc.flameGroup.visible = false;
      lc.trenchLight.intensity = 0;
      (this.scene.background as THREE.Color).setHex(0x0b132b);

      if (L.launchSequence === 'PRE_SIM') {
        lc.crewAccessArm.rotation.y = 0;
        this.camPosTarget.set(21.5, 11.8, 42.0);
        this.camLookTarget.set(-0.8, 15.0, 0);
      } else {
        // Retract crew access arm smoothly during 3..2..1 countdown
        const retractT =
          L.launchSequence === 'READY'
            ? 1
            : Math.min(1, Math.max(0, (2.4 - L.countdownSec) / 1.8));
        lc.crewAccessArm.rotation.y = -0.78 * retractT;

        // Low-angle cinematic launch-ready framing emphasizing 111.3m SLS height + Moon upper-right
        this.camPosTarget.set(16.0, 8.2, 29.5);
        this.camLookTarget.set(-0.6, 15.2, 0);

        // Cryogenic LOX/LH2 boil-off vapor wisps from upper stage vent
        if (!s.paused && Math.random() < 0.35) {
          this.emitParticle(
            0.9 + (Math.random() - 0.5) * 0.5,
            20.2 + (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 0.5,
            1.4 + Math.random() * 0.9,
            0.9 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.6,
            0.9,
            0.85,
            0.92,
            1.0
          );
        }
      }

      const camAlpha = 1 - Math.exp(-3.6 * dt);
      const lookAlpha = 1 - Math.exp(-4.2 * dt);
      this.camera.position.lerp(this.camPosTarget, camAlpha);
      this.camLookCurrent.lerp(this.camLookTarget, lookAlpha);
      this.camera.lookAt(this.camLookCurrent);
      return;
    }

    // ACTIVE ASCENDING LIFTOFF & ASCENT
    lc.crewAccessArm.rotation.y = -0.78;
    const alt = L.altitudeKm;

    // Rocket climbs genuinely past the stationary LC-39B tower first (0..1.2 km), then pad drops away below
    const liftY = 2.5 + Math.min(20, alt * 14.5);
    const groundDrop = Math.min(250, Math.max(0, alt - 0.45) * 5.2);
    lc.groundGroup.visible = alt < 40;
    lc.groundGroup.position.y = -groundDrop;
    lc.cloudLayer.visible = alt < 28;

    lc.earthLimb.visible = alt > 20;
    lc.earthLimb.position.y = -102 - Math.min(20, (alt - 20) * 0.12);

    // Sky transitions from Florida dusk to black space
    const spaceFade = Math.min(1, alt / 55);
    this.scratchColor.setHex(0x0b132b).lerp(new THREE.Color(0x020617), spaceFade);
    (this.scene.background as THREE.Color).copy(this.scratchColor);

    const pitchRad = (L.pitchDeg * Math.PI) / 180;
    lc.rocketFull.position.set(0, liftY, 0);
    lc.rocketFull.rotation.set(0, 0, -pitchRad);

    // Flame + trench fire + deluge steam cloud on pad clearance
    const thrusting = L.ignited && L.throttle > 0.05 && L.fuelPct > 0;
    lc.flameGroup.visible = thrusting;
    if (thrusting) {
      const flicker = 0.88 + Math.sin(elapsedSec * 46) * 0.16;
      lc.flameGroup.scale.set(
        1,
        Math.max(0.42, L.throttle) * flicker * (L.coreSeparated ? 0.55 : 1.18),
        1
      );
      lc.trenchLight.intensity = alt < 4 ? 11 * L.throttle : 0;

      if (!s.paused) {
        for (let k = 0; k < 3; k++) {
          this.emitParticle(
            (Math.random() - 0.5) * 1.8,
            liftY - 0.6,
            (Math.random() - 0.5) * 1.8,
            (Math.random() - 0.5) * 3.8,
            -9.5 - Math.random() * 6,
            (Math.random() - 0.5) * 3.8,
            0.48,
            1.0,
            0.68,
            0.24
          );
        }
        // Billowing white sound-suppression deluge steam from flame trench during liftoff
        if (alt < 1.2) {
          for (let k = 0; k < 4; k++) {
            const side = k % 2 === 0 ? 1 : -1;
            this.emitParticle(
              (Math.random() - 0.5) * 3.4,
              1.1 + Math.random() * 1.4,
              side * (2.5 + Math.random() * 4.5),
              (Math.random() - 0.5) * 9.5,
              1.6 + Math.random() * 3.8,
              side * (6 + Math.random() * 10),
              1.15,
              0.92,
              0.94,
              0.98
            );
          }
        }
      }
    } else {
      lc.trenchLight.intensity = 0;
    }

    // SRB separation physics visual
    if (L.srbSeparated) {
      if (this.srbDetachedTime < 0) this.srbDetachedTime = elapsedSec;
      const tSep = elapsedSec - this.srbDetachedTime;
      lc.srbLeft.visible = tSep < 4.5;
      lc.srbRight.visible = tSep < 4.5;
      lc.srbLeft.position.set(-tSep * 4.2, -tSep * tSep * 3.0, 0);
      lc.srbLeft.rotation.z = tSep * 0.45;
      lc.srbRight.position.set(tSep * 4.2, -tSep * tSep * 3.0, 0);
      lc.srbRight.rotation.z = -tSep * 0.45;
    } else {
      lc.srbLeft.visible = true;
      lc.srbRight.visible = true;
      lc.srbLeft.position.set(0, 0, 0);
      lc.srbLeft.rotation.set(0, 0, 0);
      lc.srbRight.position.set(0, 0, 0);
      lc.srbRight.rotation.set(0, 0, 0);
    }

    // Core separation
    if (L.coreSeparated) {
      if (this.coreDetachedTime < 0) this.coreDetachedTime = elapsedSec;
      const tCore = elapsedSec - this.coreDetachedTime;
      lc.coreGroup.visible = tCore < 4.0;
      lc.coreGroup.position.set(0, -tCore * tCore * 2.8, 0);
    } else {
      lc.coreGroup.visible = true;
      lc.coreGroup.position.set(0, 0, 0);
    }

    lc.abortTower.visible = !L.lasJettisoned;

    // Smooth camera tracking with subtle liftoff vibration
    const shakeAmp = thrusting && alt < 20 ? (alt < 2.2 ? 0.16 : 0.08) : 0;
    const shakeX = shakeAmp > 0 ? Math.sin(elapsedSec * 52) * shakeAmp : 0;
    const shakeY = shakeAmp > 0 ? Math.cos(elapsedSec * 61) * shakeAmp * 0.7 : 0;
    this.camPosTarget.set(16.5 + shakeX, liftY + 10.5 + shakeY, 30.5);
    this.camLookTarget.set(-0.4, liftY + 11.5, 0);
    this.camera.position.lerp(this.camPosTarget, 1 - Math.exp(-5.0 * dt));
    this.camLookCurrent.lerp(this.camLookTarget, 1 - Math.exp(-6.0 * dt));
    this.camera.lookAt(this.camLookCurrent);
  }

  private syncSpaceScene(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const sp = s.space;
    const ss = this.solarSystem;
    (this.scene.background as THREE.Color).setHex(0x020617);

    ss.shipGroup.position.set(sp.shipX, 0, sp.shipZ);
    ss.shipGroup.rotation.set(0, sp.headingRad, 0);

    const thrusting =
      (s.input.forward || (sp.autoPilot && !sp.arrivedMoon && !sp.arrivedGateway && !sp.arrivedMars)) &&
      sp.fuelPct > 0;
    ss.shipFlame.visible = thrusting;
    if (thrusting) {
      const fScale = (sp.boostActive ? 1.7 : 1.0) * (0.85 + Math.sin(elapsedSec * 40) * 0.15);
      ss.shipFlame.scale.set(1, fScale, 1);
    }

    ss.shipShieldShell.visible = sp.shieldBoostActive;
    if (sp.shieldBoostActive) {
      ss.shipShieldShell.rotation.y += dt * 1.4;
    }

    // Sync Modular Orbital Satellite (Deployment, Solar Wing Unfold, Dish Lock Beam)
    const satState = sp.orbitalSat;
    ss.satellite.group.visible = satState.deployed || sp.targetId === 'relay-orbit';
    ss.satellite.group.position.set(satState.satX, 0, satState.satZ);
    ss.satellite.group.rotation.y = (satState.rotationErrorDeg * Math.PI) / 180 + elapsedSec * (satState.linkLocked ? 0.08 : 0.65);
    const wingUnfold = satState.deployed ? Math.max(0.18, satState.solarDeployedPct / 100) : 0.12;
    ss.satellite.solarLeftPivot.scale.x = wingUnfold;
    ss.satellite.solarRightPivot.scale.x = wingUnfold;
    ss.satellite.dishPivot.rotation.z = ((100 - satState.dishAlignedPct) / 100) * 0.55;
    ss.satellite.linkBeam.visible = satState.linkLocked;
    (ss.satellite.beaconMesh.material as THREE.MeshBasicMaterial).color.setHex(
      satState.linkLocked ? 0x34d399 : 0x38bdf8
    );

    ss.gatewayGroup.rotation.y += dt * 0.15;

    // Pulse solar storm ring radius
    const stormScale = s.donkiFlareActive ? 1.5 : 1.0;
    ss.stormRing.scale.setScalar(stormScale + Math.sin(elapsedSec * 2.5) * 0.03);

    // Rotate planets gently & lock beacon onto active target
    (Object.keys(SOLAR_TARGETS) as Array<keyof typeof SOLAR_TARGETS>).forEach((id) => {
      ss.planets[id].rotation.y += dt * 0.18;
    });
    const targetSpec = SOLAR_TARGETS[sp.targetId];
    ss.targetBeacon.position.set(targetSpec.x, 0, targetSpec.z);
    ss.targetBeacon.scale.setScalar((targetSpec.radius / 3.4) * (1 + Math.sin(elapsedSec * 4) * 0.06));

    // Update live course line
    const posAttr = ss.courseLine.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.setXYZ(0, sp.shipX, 0, sp.shipZ);
    posAttr.setXYZ(1, targetSpec.x, 0, targetSpec.z);
    posAttr.needsUpdate = true;

    // Elevated chase camera above Orion spacecraft so planets, Satellite, Sun, and course line read clearly
    this.camPosTarget.set(sp.shipX - Math.sin(sp.headingRad) * 16, 13, sp.shipZ - Math.cos(sp.headingRad) * 16);
    this.camLookTarget.set(sp.shipX + Math.sin(sp.headingRad) * 6, 0, sp.shipZ + Math.cos(sp.headingRad) * 6);
    this.camera.position.lerp(this.camPosTarget, Math.min(1, 5.5 * dt));
    this.camLookCurrent.lerp(this.camLookTarget, Math.min(1, 6.5 * dt));
    this.camera.lookAt(this.camLookCurrent);
  }

  private syncLunarScene(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const activePlanet: SurfacePlanet =
      s.phase === 'title' || s.phase === 'inspector' ? 'moon' : s.planet;
    this.lunarEnv.applyPlanet(activePlanet);

    // Mars Jezero dusty salmon-amber sky vs Lunar deep black sky
    if (activePlanet === 'mars') {
      (this.scene.background as THREE.Color).setHex(0x3a1c14);
      this.ambientLight.color.setHex(0xfdba74);
      this.ambientLight.groundColor.setHex(0x451a12);
      this.sunLight.color.setHex(0xffedd5);
      this.starField.visible = false;
    } else {
      (this.scene.background as THREE.Color).setHex(0x020617);
      this.ambientLight.color.setHex(0x93c5fd);
      this.ambientLight.groundColor.setHex(0x1e293b);
      this.sunLight.color.setHex(0xfffbeb);
      this.starField.visible = true;
    }

    // Animate objective crystals for active planet
    const showObjectiveMarkers = s.phase !== 'title' && s.phase !== 'inspector';
    this.lunarEnv.objectiveMeshes.forEach((om, idx) => {
      if (om.planet !== activePlanet) {
        om.group.visible = false;
        return;
      }
      const obj = s.objectives.find((o) => o.id === om.id);
      if (!obj) {
        om.group.visible = false;
        return;
      }
      om.group.visible = true;
      om.crystal.rotation.y += dt * 1.4;
      om.crystal.position.y = 4.4 + Math.sin(elapsedSec * 2.5 + idx) * 0.25;
      om.beam.visible = showObjectiveMarkers && !obj.completed;
      om.crystal.visible = showObjectiveMarkers && !obj.completed;
    });

    // Showcase / Inspector Camera Modes
    if (s.phase === 'title' || s.phase === 'inspector') {
      this.lander.group.position.set(0, 0.36, 0);
      this.lander.group.rotation.set(0, 0, 0);
      this.lander.flameMesh.visible = false;
      this.lander.engineLight.intensity = 0;

      const rx = 6;
      const rz = 6;
      this.roverModel.group.position.set(rx, getSurfaceTerrainHeight('moon', rx, rz), rz);
      this.roverModel.group.rotation.set(0, 0.5, 0);

      let focusX = -8;
      let focusY = 2.6;
      let focusZ = -6;
      if (s.showcase === 'lander') {
        focusX = 0;
        focusY = 2.5;
        focusZ = 0;
      } else if (s.showcase === 'rover') {
        focusX = 6;
        focusY = getSurfaceTerrainHeight('moon', rx, rz) + 1.1;
        focusZ = 6;
      } else if (s.showcase === 'outpost') {
        focusX = -15;
        focusY = 3.2;
        focusZ = -13;
      }

      if (s.phase === 'title') {
        const angle = elapsedSec * 0.16;
        const rad = s.showcase === 'outpost' ? 24 : s.showcase === 'rover' ? 7.5 : 11;
        const camX = focusX + Math.sin(angle) * rad;
        const camY = focusY + (s.showcase === 'outpost' ? 7 : 3.2);
        const camZ = focusZ + Math.cos(angle) * rad;
        this.camera.position.set(camX, camY, camZ);
        const toCamX = camX - focusX;
        const toCamZ = camZ - focusZ;
        const len = Math.max(0.01, Math.hypot(toCamX, toCamZ));
        const rightX = toCamZ / len;
        const rightZ = -toCamX / len;
        const leftShift = s.showcase === 'outpost' ? 5.0 : s.showcase === 'rover' ? 1.8 : 2.8;
        this.camera.lookAt(focusX - rightX * leftShift, focusY, focusZ - rightZ * leftShift);
      } else {
        const dist = s.orbitDistance;
        this.camera.position.set(
          focusX + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
          focusY + Math.sin(s.orbitPitch) * dist,
          focusZ + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
        );
        this.camera.lookAt(focusX, focusY, focusZ);
      }
      return;
    }

    if (s.phase === 'briefing') {
      this.lander.group.position.set(0, 0.36, 0);
      this.roverModel.group.position.set(6, getSurfaceTerrainHeight(activePlanet, 6, 6), 6);
      this.camera.position.set(16, 11, 22);
      this.camera.lookAt(-3, 2.5, -3);
      return;
    }

    if (s.phase === 'landing') {
      this.syncLandingVisuals(s, dt, elapsedSec);
      return;
    }

    // Rover / Victory / Gameover
    this.syncRoverVisuals(s, dt, elapsedSec);
  }

  private syncLandingVisuals(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const f = s.landing;
    const lm = this.lander;
    const zones = getLandingZones(f.planet);
    const zone = zones[f.targetZoneId] || zones[0];
    const gravity = f.planet === 'mars' ? PHYSICS.MARS_GRAVITY : PHYSICS.MOON_GRAVITY;

    lm.group.position.set(f.x, f.y, f.z);
    lm.group.rotation.set((f.pitchDeg * Math.PI) / 180, 0, (f.rollDeg * Math.PI) / 180);

    lm.nozzleGroup.rotation.z = -(f.rollDeg * Math.PI) / 360;
    lm.nozzleGroup.rotation.x = (f.pitchDeg * Math.PI) / 360;

    const firing = f.throttle > 0.05 && f.fuelPct > 0 && !f.landed;
    lm.flameMesh.visible = firing;
    lm.engineLight.intensity = firing ? f.throttle * 12 : 0;
    if (firing) {
      const flick = 0.88 + Math.sin(elapsedSec * 42) * 0.14;
      lm.flameMesh.scale.set(0.8 + f.throttle * 0.3, f.throttle * flick * 1.35, 0.8 + f.throttle * 0.3);
      if (!s.paused) {
        this.emitParticle(
          f.x + (Math.random() - 0.5) * 0.8,
          f.y - 0.4,
          f.z + (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 3.5,
          -4.5 - Math.random() * 3,
          (Math.random() - 0.5) * 3.5,
          0.36,
          0.95,
          0.55,
          0.2
        );
      }
    }

    lm.rcsLeft.visible = !f.landed && s.input.right;
    lm.rcsRight.visible = !f.landed && s.input.left;

    const groundY = getSurfaceTerrainHeight(f.planet, f.x, f.z);
    const guideAttr = this.guideLine.geometry.attributes.position as THREE.BufferAttribute;
    guideAttr.setXYZ(0, f.x, f.y, f.z);
    guideAttr.setXYZ(1, f.x, groundY + 0.25, f.z);
    guideAttr.needsUpdate = true;
    this.guideLine.visible = !f.landed;

    this.bullseyeRing.visible = !f.landed;
    this.bullseyeRing.position.set(f.x, groundY + 0.3, f.z);

    const predGround = getSurfaceTerrainHeight(f.planet, f.predX, f.predZ);
    this.predRing.visible = !f.landed;
    this.predRing.position.set(f.predX, predGround + 0.32, f.predZ);

    this.lunarEnv.trajectoryArc.visible = !f.landed;
    const arcAttr = this.lunarEnv.trajectoryArc.geometry.attributes.position as THREE.BufferAttribute;
    let simX = f.x;
    let simY = f.y;
    let simZ = f.z;
    let simVy = f.vy;
    for (let i = 0; i < 25; i++) {
      arcAttr.setXYZ(i, simX, Math.max(getSurfaceTerrainHeight(f.planet, simX, simZ) + 0.2, simY), simZ);
      simX += f.vx * 0.35;
      simZ += f.vz * 0.35;
      simY += simVy * 0.35;
      simVy -= gravity * 0.35;
    }
    arcAttr.needsUpdate = true;

    this.lunarEnv.landingZoneMeshes.forEach((zm) => {
      if (zm.planet !== f.planet) {
        zm.group.visible = false;
        return;
      }
      zm.group.visible = true;
      zm.cyl.visible = zm.id === zone.id;
      zm.ring.scale.setScalar(zm.id === zone.id ? 1 + Math.sin(elapsedSec * 4) * 0.04 : 1);
    });

    this.lunarEnv.approachGates.forEach((gate, idx) => {
      gate.group.visible = true;
      const distGate = Math.hypot(
        f.x - gate.group.position.x,
        f.y - gate.group.position.y,
        f.z - gate.group.position.z
      );
      if (distGate < 9.5 && !gate.passed) {
        gate.passed = true;
        f.gatesPassed++;
        f.gateBonusScore += 150;
      }
      (gate.torus.material as THREE.MeshBasicMaterial).color.setHex(
        gate.passed ? 0x10b981 : idx === f.gatesPassed ? 0xfacc15 : 0x38bdf8
      );
    });

    if (s.cameraMode === 'cockpit') {
      this.camera.position.set(f.x, f.y + 3.2, f.z + 1.8);
      this.camera.lookAt(f.x + f.vx * 2, groundY, f.z + f.vz * 2 + 4);
    } else if (s.cameraMode === 'overhead') {
      this.camera.position.set(f.x, Math.max(55, f.y + 42), f.z + 12);
      this.camera.lookAt(f.x, groundY, f.z);
    } else if (s.cameraMode === 'orbit') {
      const dist = s.orbitDistance;
      this.camera.position.set(
        f.x + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
        f.y + 2 + Math.sin(s.orbitPitch) * dist,
        f.z + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
      );
      this.camera.lookAt(f.x, f.y + 2, f.z);
    } else {
      this.camPosTarget.set(f.x + 15, Math.max(groundY + 6, f.y + 7.5), f.z + 25);
      this.camLookTarget.set(f.x, Math.max(groundY, f.y - 1.2), f.z);
      this.camera.position.lerp(this.camPosTarget, Math.min(1, 5 * dt));
      this.camLookCurrent.lerp(this.camLookTarget, Math.min(1, 6 * dt));
      this.camera.lookAt(this.camLookCurrent);
    }
  }

  private syncRoverVisuals(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const r = s.rover;
    const rm = this.roverModel;

    // Keep lander parked on Pad Alpha
    this.lander.group.position.set(0, 0.36, 0);
    this.lander.group.rotation.set(0, 0, 0);
    this.lander.flameMesh.visible = false;
    this.lander.engineLight.intensity = 0;

    const clearanceLift = r.highClearance || r.driveMode === 'WALKER' ? 0.34 : 0;
    rm.group.position.set(r.x, r.y + clearanceLift, r.z);
    rm.group.rotation.set(r.pitchRad, r.headingRad, r.rollRad);

    // Update 4 articulated wheel-legs + rocker arms
    rm.wheelModules.forEach((wm, idx) => {
      const lift = r.wheelOffsets[idx] || 0;
      wm.pivot.position.y = wm.baseY + lift - clearanceLift * 0.45;

      if (r.driveMode === 'CRAB') {
        wm.pivot.rotation.y = -r.steerAngleRad * 1.15;
      } else if (r.driveMode === 'SPIN') {
        wm.pivot.rotation.y = (wm.side * wm.forward * Math.PI) / 4;
      } else {
        wm.pivot.rotation.y = wm.forward > 0 ? r.steerAngleRad : -r.steerAngleRad * 0.4;
      }

      wm.spin.rotation.x = r.wheelAngle;
      wm.arm.rotation.x = -wm.forward * (lift - clearanceLift * 0.45) * 0.85;
    });

    // Headlight + Comms dish sweep
    rm.headlight.intensity = r.headlightsOn ? 2.4 : 0;
    rm.dish.rotation.y = Math.sin(elapsedSec * 0.7) * 0.25;

    // TRIDENT Drill animation when drilling
    if (s.activeDrillingId) {
      rm.drillArm.rotation.x = 0.28;
      rm.drillBit.rotation.y += dt * 18;
      if (!s.paused && Math.random() < 0.45) {
        this.emitParticle(
          r.x + Math.sin(r.headingRad) * 1.6,
          r.y + 0.15,
          r.z + Math.cos(r.headingRad) * 1.6,
          (Math.random() - 0.5) * 1.5,
          1.2 + Math.random() * 1.2,
          (Math.random() - 0.5) * 1.5,
          0.4,
          0.72,
          0.82,
          0.95
        );
      }
    } else {
      rm.drillArm.rotation.x += (0 - rm.drillArm.rotation.x) * Math.min(1, 8 * dt);
    }

    // Regolith wheel dust when moving fast
    if (!s.paused && Math.abs(r.speed) > 1.8 && Math.random() < 0.3) {
      this.emitParticle(
        r.x - Math.sin(r.headingRad) * 1.2 + (Math.random() - 0.5) * 1.2,
        r.y + 0.15,
        r.z - Math.cos(r.headingRad) * 1.2 + (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 0.8,
        0.7 + Math.random() * 0.6,
        (Math.random() - 0.5) * 0.8,
        0.5,
        0.65,
        0.68,
        0.75
      );
    }

    // Rover Camera Modes
    const fwdX = Math.sin(r.headingRad);
    const fwdZ = Math.cos(r.headingRad);
    if (s.cameraMode === 'cockpit') {
      this.camera.position.set(r.x + fwdX * 0.65, r.y + 2.75 + clearanceLift, r.z + fwdZ * 0.65);
      this.camera.lookAt(r.x + fwdX * 16, r.y + 1.4, r.z + fwdZ * 16);
    } else if (s.cameraMode === 'overhead') {
      this.camera.position.set(r.x, r.y + 28, r.z + 4);
      this.camera.lookAt(r.x, r.y, r.z);
    } else if (s.cameraMode === 'orbit') {
      const dist = s.orbitDistance;
      this.camera.position.set(
        r.x + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
        r.y + 1.6 + Math.sin(s.orbitPitch) * dist,
        r.z + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
      );
      this.camera.lookAt(r.x, r.y + 1.1, r.z);
    } else {
      this.camPosTarget.set(r.x - fwdX * 9.5, r.y + 5.2 + clearanceLift, r.z - fwdZ * 9.5);
      this.camLookTarget.set(r.x + fwdX * 3.5, r.y + 1.4, r.z + fwdZ * 3.5);
      this.camera.position.lerp(this.camPosTarget, Math.min(1, 6.5 * dt));
      this.camLookCurrent.lerp(this.camLookTarget, Math.min(1, 7.5 * dt));
      this.camera.lookAt(this.camLookCurrent);
    }
  }

  dispose() {
    this.disposed = true;
    this.stopLoop();
    window.removeEventListener('resize', this.onResizeBound);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLostBound);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestoredBound);

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        const mat = obj.material;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });

    Object.values(this.textures).forEach((t) => t.dispose());
    this.envTarget.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
