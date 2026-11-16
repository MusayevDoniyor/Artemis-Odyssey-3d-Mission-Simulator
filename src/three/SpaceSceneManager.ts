import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { PHYSICS, SOLAR_TARGETS, getLandingZones } from '../game/constants';
import { getSurfaceTerrainHeight } from '../game/physics';
import {
  SOLAR_SUN_ORIGIN_X,
  SOLAR_SUN_ORIGIN_Z,
  SOLAR_SYSTEM_BODIES,
  type SolarScaleMode,
  computeKeplerBodyPosition,
  getLiveSolarTargetPosition,
} from '../game/solarSystemData';
import {
  EXPLORATION_VISUAL_LAYOUT,
  LOCAL_UNITS_PER_METER,
  SCIENTIFIC_UNITS_PER_AU,
  getBodyVisualRadiusUnits,
  projectHeliocentricSIToScene,
} from '../game/orbitalMechanics';
import { PLANETARY_CATALOG_SI } from '../game/planetaryCatalog';
import { HARDWARE_CATALOG } from '../game/hardwareCatalog';
import { getStageSepStep, resolveInspectorLabelLayout } from '../game/hardwareInspector';
import type {
  CameraMode,
  CampaignMissionId,
  CrashFxState,
  GamePhase,
  InputState,
  InspectorLabelPoint,
  InspectorUiState,
  LandedPose,
  LandingState,
  LaunchState,
  LeoTransferState,
  MarsEdlState,
  PostLandingUnstowState,
  QualityPreset,
  ResourceState,
  RoverCollider,
  RoverObjective,
  RoverState,
  SpaceCameraMode,
  SpaceFlightState,
  SurfacePlanet,
  SurfaceWorldPrompt,
  VehicleShowcaseId,
} from '../game/types';
import {
  createCrashFxSystem,
  createFalcon9Showcase,
  createISSShowcase,
  createJWSTModel,
  createLaunchComplexAndSLS,
  createLunarEnvironment,
  createLunarLander,
  createOrbitalSatellite,
  createSaturnVShowcase,
  createSolarSystemScene,
  createViperRover,
  createVoyagerModel,
  type CrashFxHandles,
  type LaunchComplexHandles,
  type LunarEnvironmentHandles,
  type LunarLanderHandles,
  type OrbitalSatelliteHandles,
  type SolarSystemHandles,
  type ViperRoverHandles,
} from './models';
import {
  createRealPlanetMaps,
  updateAtmosphereSunDirection,
  type RealPlanetMaps,
} from './planetMaps';
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
  userOrbitActive: boolean;
  activeDrillingId: string | null;
  crashFx: CrashFxState;
  launch: LaunchState;
  space: SpaceFlightState;
  landing: LandingState;
  rover: RoverState;
  resources: ResourceState;
  objectives: RoverObjective[];
  input: InputState;
  freeExploreMode?: boolean;
  inspector?: InspectorUiState;
  leoTransfer?: LeoTransferState;
  marsEdl?: MarsEdlState;
  unstow?: PostLandingUnstowState | null;
  landedPose?: LandedPose | null;
  mastPanRad?: number;
  kilopowerActive?: boolean;
  solarScaleMode?: SolarScaleMode;
  solarEpochYears?: number;
  focusedSolarBodyId?: string | null;
  spaceCameraMode?: SpaceCameraMode;
  localAnchorId?: string;
  quality?: QualityPreset;
  panOffset?: { x: number; y: number; z: number };
}

const PARTICLE_COUNT = 260;

/**
 * Custom VertexShader + FragmentShader for Earth's physically-based Rayleigh + Mie atmospheric scattering shell.
 */
function createEarthAtmosphericScatteringMaterial(intensity = 1.18): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.7, 0.35, 0.6).normalize() },
      uCameraDistance: { value: 10.0 },
      uPlanetRadius: { value: 2.35 },
      uAltitudeFade: { value: 1.0 },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying float vViewAngleCos;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec3 viewDir = normalize(cameraPosition - worldPos.xyz);
        vViewAngleCos = dot(vWorldNormal, viewDir);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform float uCameraDistance;
      uniform float uPlanetRadius;
      uniform float uAltitudeFade;
      uniform float uIntensity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying float vViewAngleCos;

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 sunDir = normalize(uSunDir);

        // Normalize camera altitude in planetary radii so scattering responds consistently across scale modes
        float altRadii = max(0.0, (uCameraDistance - uPlanetRadius) / max(0.001, uPlanetRadius));
        float distResponse = smoothstep(0.015, 0.24, altRadii) *
          clamp(1.0 / (1.0 + pow(max(0.0, altRadii - 6.0) / 26.0, 1.3)), 0.22, 1.0);

        // BackSide atmospheric shell: Chapman scale-height optical depth toward outer exosphere boundary
        float ndotv = dot(n, viewDir);
        float shellDepth = clamp(-ndotv * 2.45, 0.0, 1.0);
        float chapmanDensity = exp(-pow(1.0 - shellDepth, 1.75) * 2.85);
        float outerFade = smoothstep(0.0, 0.26, -ndotv);

        // Rayleigh wavelength coefficients normalized to RGB (beta ~ lambda^-4)
        vec3 betaRayleigh = vec3(0.24, 0.56, 1.00);
        float sunDot = dot(n, sunDir);
        float rayleighPhase = 0.75 * (1.0 + pow(dot(-viewDir, sunDir), 2.0));
        float dayWeight = smoothstep(-0.28, 0.44, sunDot);

        // Sunset/twilight atmospheric dispersion along the day-night terminator
        float terminatorBand = exp(-pow((sunDot + 0.03) * 4.6, 2.0));
        vec3 twilightTint = vec3(0.98, 0.54, 0.24);

        // Henyey-Greenstein Mie forward scattering (g = 0.74)
        float cosTheta = clamp(dot(-viewDir, sunDir), -1.0, 1.0);
        float g = 0.74;
        float g2 = g * g;
        float miePhase = clamp((1.0 - g2) / (4.0 * 3.14159265 * pow(max(0.04, 1.0 + g2 - 2.0 * g * cosTheta), 1.5)), 0.0, 2.6);

        vec3 scatterCol = mix(betaRayleigh * (0.72 + 0.28 * rayleighPhase), twilightTint, terminatorBand * 0.52);
        scatterCol += vec3(0.58, 0.80, 1.0) * (miePhase * 0.22 * dayWeight);

        float alpha = clamp(chapmanDensity * outerFade * uIntensity * distResponse * uAltitudeFade * mix(0.08, 1.0, dayWeight), 0.0, 1.0);
        gl_FragColor = vec4(scatterCol * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

/**
 * Separate Three.js mesh layer VertexShader + FragmentShader calculating Earth's blue rim
 * via a physically-grounded Schlick Fresnel equation driven by camera distance & viewing angle.
 */
function createEarthFresnelRimMaterial(intensity = 0.92): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.7, 0.35, 0.6).normalize() },
      uCameraDistance: { value: 10.0 },
      uPlanetRadius: { value: 2.35 },
      uAltitudeFade: { value: 1.0 },
      uIntensity: { value: intensity },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewVector;

      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vViewVector = cameraPosition - worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform float uCameraDistance;
      uniform float uPlanetRadius;
      uniform float uAltitudeFade;
      uniform float uIntensity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewVector;

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 viewDir = normalize(vViewVector);
        vec3 sunDir = normalize(uSunDir);

        // Viewing angle cosine between surface normal and camera ray
        float cosTheta = clamp(dot(n, viewDir), 0.0, 1.0);

        // Camera distance in planetary radii modulates rim sharpness and altitude attenuation
        float altRadii = max(0.0, (uCameraDistance - uPlanetRadius) / max(0.001, uPlanetRadius));
        float distanceFade = smoothstep(0.015, 0.22, altRadii) *
          clamp(1.0 / (1.0 + pow(max(0.0, altRadii - 6.0) / 14.0, 1.45)), 0.0, 1.0);

        // Schlick Fresnel equation: F = F0 + (1.0 - F0) * (1.0 - cosTheta)^p
        float F0 = 0.028;
        float fresnelExponent = mix(3.9, 2.35, clamp(1.0 - altRadii * 0.12, 0.0, 1.0));
        float fresnel = F0 + (1.0 - F0) * pow(1.0 - cosTheta, fresnelExponent);

        float sunDot = dot(n, sunDir);
        float dayWeight = smoothstep(-0.24, 0.46, sunDot);
        float twilightBand = exp(-pow((sunDot + 0.02) * 4.4, 2.0));

        vec3 rayleighZenithBlue = vec3(0.18, 0.56, 1.00);
        vec3 rayleighElectricRim = vec3(0.42, 0.82, 1.00);
        vec3 terminatorAmber = vec3(0.95, 0.52, 0.26);

        vec3 rimColor = mix(rayleighZenithBlue, rayleighElectricRim, fresnel);
        rimColor = mix(rimColor, terminatorAmber, twilightBand * (0.45 * fresnel + 0.12));

        float rimAlpha = clamp(fresnel * uIntensity * distanceFade * uAltitudeFade * mix(0.05, 1.0, dayWeight), 0.0, 0.94);
        gl_FragColor = vec4(rimColor * rimAlpha, rimAlpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false,
  });
}

export class SpaceSceneManager {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private pmremGenerator: THREE.PMREMGenerator;
  private envTarget: THREE.WebGLRenderTarget;
  private textures: ProceduralTextureSet;
  private planetMaps: RealPlanetMaps;
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
  private jwstModel: { group: THREE.Group };
  private voyagerModel: { group: THREE.Group };
  private saturnVModel: { group: THREE.Group };
  private falcon9Model: { group: THREE.Group };
  private issModel: { group: THREE.Group };
  private crashFxSys: CrashFxHandles;

  private trackIdx = 0;
  private lastTrackX = 9999;
  private lastTrackZ = 9999;
  private appliedQuality: QualityPreset = 'high';
  private lastSolarScaleMode: SolarScaleMode | null = null;
  private lastLocalAnchorId = 'earth';
  private lastPhase: GamePhase | null = null;
  private lastTitleShowcase: VehicleShowcaseId = 'outpost';
  private titleOrbitAngle = 0.58;
  private prefersReducedMotion =
    typeof window !== 'undefined' &&
    Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  private sunLight: THREE.DirectionalLight;
  private bayRimLight: THREE.DirectionalLight;
  private ambientLight: THREE.HemisphereLight;
  private bayTurntable: THREE.Group;
  private starField: THREE.Points;

  // Separate Three.js Fresnel blue-rim mesh layers for Earth across scenes
  private solarEarthFresnelRimMesh: THREE.Mesh;
  private launchEarthFresnelRimMesh: THREE.Mesh;
  private lunarEarthFresnelRimMesh: THREE.Mesh;

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

  // SRB / Core / LAS separation visual timers & smooth pitch transition
  private srbDetachedTime = -1;
  private coreDetachedTime = -1;
  private lasDetachedTime = -1;
  private launchPitchVisualRad = 0;

  // Camera smoothing & debris scratch objects (zero per-frame GC)
  private camPosTarget = new THREE.Vector3(0, 12, 28);
  private camLookCurrent = new THREE.Vector3(0, 2, 0);
  private camLookTarget = new THREE.Vector3(0, 2, 0);
  private scratchVec = new THREE.Vector3();
  private scratchAtmoVec = new THREE.Vector3();
  private scratchFocusVec = new THREE.Vector3();
  private scratchShipAnchor = new THREE.Vector3();
  private sunOriginVec = new THREE.Vector3(SOLAR_SUN_ORIGIN_X, 0, SOLAR_SUN_ORIGIN_Z);
  private scratchColor = new THREE.Color();
  private dimTargetColor = new THREE.Color(0x0f172a);
  private crashDummy = new THREE.Object3D();
  private scratchBeltDummy = new THREE.Object3D();

  // Hardware Bay per-mesh material isolation & smooth inspection state
  private emissiveOriginal = new WeakMap<THREE.MeshStandardMaterial, { hex: number; intensity: number }>();
  private inspectorMatCache = new WeakMap<
    THREE.Mesh,
    {
      origMat: THREE.Material;
      inspectMat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
      origColorHex: number;
      origEmissiveHex: number;
      origEmissiveIntensity: number;
      origOpacity: number;
      origTransparent: boolean;
    }
  >();
  private inspectorMaterialsActive = false;
  private lastHighlightedPart: string | null = null;
  private lastHoverPart: string | null = null;
  private lastSubEngine: number | null = null;
  private lastHighlightPhase: GamePhase | null = null;
  private currentExplodeT = 0;
  private inspectFocusCurrent = new THREE.Vector3(0, 12, 0);
  private inspectBoxScratch = new THREE.Box3();
  private inspectFocusBox = new THREE.Box3();
  private lastInspectShowcase: VehicleShowcaseId | null = null;
  private raycaster = new THREE.Raycaster();
  private pointerNdc = new THREE.Vector2();
  private launchFog = new THREE.FogExp2(0x162238, 0.0022);
  private marsFog = new THREE.FogExp2(0x9a4d2c, 0.0046);

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
      logarithmicDepthBuffer: true,
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
    this.camera = new THREE.PerspectiveCamera(54, aspect, 0.05, 5000000);
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

    // Subtle cool aerospace rim light & turntable reference ring for Hardware Bay inspection
    this.bayRimLight = new THREE.DirectionalLight(0x7dd3fc, 0);
    this.bayRimLight.position.set(-70, 36, -65);
    this.scene.add(this.bayRimLight);

    this.bayTurntable = new THREE.Group();
    const bayRingOuter = new THREE.Mesh(
      new THREE.RingGeometry(4.8, 5.0, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.24, side: THREE.DoubleSide })
    );
    bayRingOuter.rotation.x = -Math.PI / 2;
    const bayDisc = new THREE.Mesh(
      new THREE.CircleGeometry(4.8, 48),
      new THREE.MeshStandardMaterial({ color: 0x091224, roughness: 0.88, metalness: 0.25 })
    );
    bayDisc.rotation.x = -Math.PI / 2;
    bayDisc.position.y = -0.02;
    bayDisc.receiveShadow = true;
    const bayInnerRing = new THREE.Mesh(
      new THREE.RingGeometry(2.6, 2.68, 48),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
    );
    bayInnerRing.rotation.x = -Math.PI / 2;
    bayInnerRing.position.y = 0.01;
    this.bayTurntable.add(bayDisc, bayRingOuter, bayInnerRing);
    this.bayTurntable.visible = false;
    this.scene.add(this.bayTurntable);

    // Starfield
    this.starField = this.createStarField();
    this.scene.add(this.starField);

    // Procedural + Real Planetary Textures & World Models
    const maxAniso = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.textures = createProceduralTextureSet(maxAniso);
    this.planetMaps = createRealPlanetMaps(maxAniso);

    this.lunarEnv = createLunarEnvironment(this.textures, this.planetMaps);
    this.lunarEnv.earthScatter.visible = false;
    (this.lunarEnv.earthAtmo.material as THREE.Material).dispose();
    this.lunarEnv.earthAtmo.material = createEarthAtmosphericScatteringMaterial(1.1);
    this.lunarEarthFresnelRimMesh = new THREE.Mesh(
      new THREE.SphereGeometry(28.58, 48, 36),
      createEarthFresnelRimMaterial(0.86)
    );
    this.lunarEarthFresnelRimMesh.renderOrder = 4;
    this.lunarEnv.earthGroup.add(this.lunarEarthFresnelRimMesh);
    this.scene.add(this.lunarEnv.group);

    this.lander = createLunarLander(this.textures);
    this.lander.group.position.set(0, 0, 0);
    this.scene.add(this.lander.group);

    this.roverModel = createViperRover(this.textures);
    this.roverModel.group.position.set(6, getSurfaceTerrainHeight('moon', 6, 6), 6);
    this.scene.add(this.roverModel.group);

    this.launchComplex = createLaunchComplexAndSLS(this.textures, this.planetMaps);
    this.launchComplex.earthLimbScatter.visible = false;
    (this.launchComplex.earthLimbAtmo.material as THREE.Material).dispose();
    this.launchComplex.earthLimbAtmo.material = createEarthAtmosphericScatteringMaterial(1.18);
    this.launchEarthFresnelRimMesh = new THREE.Mesh(
      new THREE.SphereGeometry(95.65, 56, 36),
      createEarthFresnelRimMaterial(0.92)
    );
    this.launchEarthFresnelRimMesh.renderOrder = 4;
    this.launchComplex.earthLimb.add(this.launchEarthFresnelRimMesh);
    this.scene.add(this.launchComplex.group);

    this.solarSystem = createSolarSystemScene(this.textures, this.planetMaps);
    this.solarSystem.earthScatter.visible = false;
    (this.solarSystem.earthAtmo.material as THREE.Material).dispose();
    this.solarSystem.earthAtmo.material = createEarthAtmosphericScatteringMaterial(1.22);
    this.solarEarthFresnelRimMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.022, 48, 36),
      createEarthFresnelRimMaterial(0.92)
    );
    this.solarEarthFresnelRimMesh.renderOrder = 4;
    this.solarSystem.earthBodyGroup.add(this.solarEarthFresnelRimMesh);
    this.scene.add(this.solarSystem.group);

    this.showcaseSatellite = createOrbitalSatellite(this.textures);
    this.showcaseSatellite.group.visible = false;
    this.showcaseSatellite.beaconMesh.visible = false;
    this.scene.add(this.showcaseSatellite.group);

    this.jwstModel = createJWSTModel(this.textures);
    this.jwstModel.group.visible = false;
    this.scene.add(this.jwstModel.group);

    this.voyagerModel = createVoyagerModel(this.textures);
    this.voyagerModel.group.visible = false;
    this.scene.add(this.voyagerModel.group);

    this.saturnVModel = createSaturnVShowcase(this.textures);
    this.saturnVModel.group.visible = false;
    this.scene.add(this.saturnVModel.group);

    this.falcon9Model = createFalcon9Showcase(this.textures);
    this.falcon9Model.group.visible = false;
    this.scene.add(this.falcon9Model.group);

    this.issModel = createISSShowcase(this.textures);
    this.issModel.group.visible = false;
    this.scene.add(this.issModel.group);

    this.crashFxSys = createCrashFxSystem(this.textures);
    this.scene.add(this.crashFxSys.group);

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

  pickSurfacePoint(clientX: number, clientY: number): { x: number; z: number } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObject(this.lunarEnv.terrainMesh, false);
    if (hits.length === 0) return null;
    const pt = hits[0].point;
    return {
      x: Math.max(-PHYSICS.SURFACE_BOUND_M, Math.min(PHYSICS.SURFACE_BOUND_M, pt.x)),
      z: Math.max(-PHYSICS.SURFACE_BOUND_M, Math.min(PHYSICS.SURFACE_BOUND_M, pt.z)),
    };
  }

  getSurfaceWorldPrompts(s: SceneSimulationBridge): SurfaceWorldPrompt[] {
    if (s.phase !== 'rover') return [];
    const r = s.rover;
    const out: SurfaceWorldPrompt[] = [];

    s.objectives.forEach((obj) => {
      if (obj.completed) return;
      const distM = Math.round(Math.hypot(obj.x - r.x, obj.z - r.z));
      const inRange = distM < 6.8;
      const ty = getSurfaceTerrainHeight(obj.planet, obj.x, obj.z);
      this.scratchVec.set(obj.x, ty + (inRange ? 2.4 : 2.9), obj.z);
      this.scratchVec.project(this.camera);
      const visible =
        this.scratchVec.z >= -1 &&
        this.scratchVec.z <= 1 &&
        Math.abs(this.scratchVec.x) <= 0.96 &&
        Math.abs(this.scratchVec.y) <= 0.94;
      const rawXPct = Math.round((this.scratchVec.x * 0.5 + 0.5) * 1000) / 10;
      const rawYPct = Math.round((-this.scratchVec.y * 0.5 + 0.5) * 1000) / 10;
      out.push({
        id: obj.id,
        kind: 'objective',
        title: obj.siteName,
        subtitle: obj.instrument,
        xPct: visible ? Math.min(90, Math.max(10, rawXPct)) : rawXPct,
        yPct: visible ? Math.min(76, Math.max(18, rawYPct)) : rawYPct,
        visible,
        distM,
        inRange,
        completed: obj.completed,
        progress: obj.progress,
        worldX: obj.x,
        worldZ: obj.z,
      });
    });

    const baseDist = Math.round(Math.hypot(-15 - r.x, -13 - r.z));
    const baseInRange = baseDist <= 22;
    const baseTy = getSurfaceTerrainHeight(r.planet, -15, -13);
    this.scratchVec.set(-15, baseTy + 4.4, -13);
    this.scratchVec.project(this.camera);
    const baseVisible =
      this.scratchVec.z >= -1 &&
      this.scratchVec.z <= 1 &&
      Math.abs(this.scratchVec.x) <= 0.96 &&
      Math.abs(this.scratchVec.y) <= 0.94;
    const baseRawXPct = Math.round((this.scratchVec.x * 0.5 + 0.5) * 1000) / 10;
    const baseRawYPct = Math.round((-this.scratchVec.y * 0.5 + 0.5) * 1000) / 10;
    out.push({
      id: 'basecamp-airlock',
      kind: 'basecamp',
      title: r.planet === 'mars' ? 'Jezero Base' : 'Base Camp',
      subtitle: 'Airlock & Shelter',
      xPct: baseVisible ? Math.min(90, Math.max(10, baseRawXPct)) : baseRawXPct,
      yPct: baseVisible ? Math.min(76, Math.max(18, baseRawYPct)) : baseRawYPct,
      visible: baseVisible,
      distM: baseDist,
      inRange: baseInRange,
      completed: false,
      progress: 0,
      worldX: -15,
      worldZ: -13,
    });

    return out;
  }

  pickLaunchPart(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(
      [this.launchComplex.rocketFull, this.launchComplex.groundGroup],
      true
    );
    for (const hit of hits) {
      let cur: THREE.Object3D | null = hit.object;
      while (cur) {
        if (typeof cur.userData?.partId === 'string') {
          const pid = cur.userData.partId;
          if (pid === 'sls-rs25') return 'sls-core';
          if (pid === 'sls-orion' || pid === 'sls-esm' || pid === 'sls-las') return 'sls-upper';
          return pid;
        }
        cur = cur.parent;
      }
    }
    return null;
  }

  private getInspectorRoots(showcase: VehicleShowcaseId): THREE.Object3D[] {
    switch (showcase) {
      case 'rocket':
        return [this.launchComplex.rocketFull];
      case 'satellite':
        return [this.showcaseSatellite.group];
      case 'jwst':
        return [this.jwstModel.group];
      case 'voyager':
        return [this.voyagerModel.group];
      case 'lander':
        return [this.lander.group];
      case 'rover':
        return [this.roverModel.group];
      case 'outpost':
        return [this.lunarEnv.habGroup];
      case 'saturn-v':
        return [this.saturnVModel.group];
      case 'falcon-9':
        return [this.falcon9Model.group];
      case 'iss':
        return [this.issModel.group];
    }
  }

  pickInspectorHit(
    clientX: number,
    clientY: number,
    showcase: VehicleShowcaseId
  ): { partId: string | null; subEngineIndex?: number } {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { partId: null };
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);
    const hits = this.raycaster.intersectObjects(this.getInspectorRoots(showcase), true);
    for (const hit of hits) {
      if (!hit.object.visible) continue;
      let cur: THREE.Object3D | null = hit.object;
      let subEngineIndex: number | undefined;
      while (cur) {
        if (typeof cur.userData?.subEngineIndex === 'number' && subEngineIndex === undefined) {
          subEngineIndex = cur.userData.subEngineIndex;
        }
        if (typeof cur.userData?.partId === 'string') {
          return { partId: cur.userData.partId, subEngineIndex };
        }
        cur = cur.parent;
      }
    }
    return { partId: null };
  }

  pickInspectorPart(clientX: number, clientY: number, showcase: VehicleShowcaseId): string | null {
    return this.pickInspectorHit(clientX, clientY, showcase).partId;
  }

  private computeInspectorPartWorldCenter(
    showcase: VehicleShowcaseId,
    partId: string | null,
    out: THREE.Vector3
  ): boolean {
    const roots = this.getInspectorRoots(showcase);
    this.inspectFocusBox.makeEmpty();
    let found = false;
    roots.forEach((root) => {
      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
        const pid = obj.userData?.partId as string | undefined;
        if (!pid) return;
        if (partId && pid !== partId) return;
        this.inspectBoxScratch.setFromObject(obj);
        this.inspectFocusBox.union(this.inspectBoxScratch);
        found = true;
      });
    });
    if (!found || this.inspectFocusBox.isEmpty()) return false;
    this.inspectFocusBox.getCenter(out);
    return true;
  }

  getInspectorScreenLabels(showcase: VehicleShowcaseId): InspectorLabelPoint[] {
    const spec = HARDWARE_CATALOG[showcase];
    if (!spec) return [];
    const roots = this.getInspectorRoots(showcase);
    const accumMap = new Map<string, { box: THREE.Box3; count: number }>();
    roots.forEach((root) => {
      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
        const pid = obj.userData?.partId as string | undefined;
        if (!pid) return;
        if (!accumMap.has(pid)) {
          accumMap.set(pid, { box: new THREE.Box3().setFromObject(obj), count: 1 });
        } else {
          accumMap.get(pid)!.box.expandByObject(obj);
          accumMap.get(pid)!.count += 1;
        }
      });
    });

    const raw: InspectorLabelPoint[] = [];
    spec.parts.forEach((part) => {
      if (showcase === 'rocket' && part.id === 'sls-boosters') {
        this.inspectBoxScratch.setFromObject(this.launchComplex.srbRight);
        this.inspectBoxScratch.getCenter(this.scratchVec);
      } else {
        const entry = accumMap.get(part.id);
        if (!entry) {
          raw.push({ partId: part.id, name: part.shortName, role: part.role, xPct: 50, yPct: 50, visible: false });
          return;
        }
        entry.box.getCenter(this.scratchVec);
      }
      this.scratchVec.project(this.camera);
      const visible =
        this.scratchVec.z >= -1 &&
        this.scratchVec.z <= 1 &&
        this.scratchVec.x >= -0.92 &&
        this.scratchVec.x <= 0.92 &&
        this.scratchVec.y >= -0.92 &&
        this.scratchVec.y <= 0.92;
      const anchorX = Math.round((this.scratchVec.x * 0.5 + 0.5) * 1000) / 10;
      const anchorY = Math.round((-this.scratchVec.y * 0.5 + 0.5) * 1000) / 10;
      raw.push({
        partId: part.id,
        name: part.shortName,
        role: part.role,
        xPct: anchorX,
        yPct: anchorY,
        anchorXPct: anchorX,
        anchorYPct: anchorY,
        visible,
      });
    });
    return resolveInspectorLabelLayout(raw);
  }

  pickSolarBody(clientX: number, clientY: number): string | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    this.pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    const targets: THREE.Object3D[] = [
      this.solarSystem.sun,
      this.solarSystem.planets.moon,
      this.solarSystem.planets.mars,
      ...Object.values(this.solarSystem.extraBodies),
    ];
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const hit of hits) {
      let cur: THREE.Object3D | null = hit.object;
      while (cur) {
        if (typeof cur.userData?.solarBodyId === 'string') {
          return cur.userData.solarBodyId;
        }
        cur = cur.parent;
      }
    }
    return null;
  }

  private getSolarVisualRadius(bodyId: string): number {
    return getBodyVisualRadiusUnits(bodyId, this.lastSolarScaleMode ?? 'exploration');
  }

  getSelectedSolarBodyScreenPos(
    bodyId: string | null
  ): { xPct: number; yPct: number; visible: boolean } | null {
    if (!bodyId) return null;
    const radius = this.getSolarVisualRadius(bodyId);
    const yOffset =
      (this.lastSolarScaleMode ?? 'exploration') === 'scientific'
        ? Math.max(0.015, radius * 0.65)
        : bodyId === 'sun'
          ? 3.2
          : 1.75;

    let targetObj: THREE.Object3D | undefined;
    if (bodyId === 'sun') {
      targetObj = this.solarSystem.bodyScaleGroups.sun ?? this.solarSystem.sun;
    } else if (bodyId === 'moon') {
      targetObj = this.solarSystem.extraBodies.moon;
    } else if (bodyId === 'mars') {
      targetObj = this.solarSystem.extraBodies.mars;
    } else {
      targetObj = this.solarSystem.extraBodies[bodyId];
    }
    if (!targetObj) return null;

    targetObj.getWorldPosition(this.scratchVec);
    this.scratchVec.y += radius + yOffset;
    this.scratchVec.project(this.camera);
    const visible =
      this.scratchVec.z >= -1 &&
      this.scratchVec.z <= 1 &&
      Math.abs(this.scratchVec.x) <= 0.94 &&
      Math.abs(this.scratchVec.y) <= 0.88;
    return {
      xPct: Math.round((this.scratchVec.x * 0.5 + 0.5) * 1000) / 10,
      yPct: Math.round((-this.scratchVec.y * 0.5 + 0.5) * 1000) / 10,
      visible,
    };
  }

  resetWheelTracks() {
    this.trackIdx = 0;
    this.lastTrackX = 9999;
    this.lastTrackZ = 9999;
    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < 320; i++) {
      this.lunarEnv.wheelTrackMesh.setMatrixAt(i, zeroMat);
    }
    this.lunarEnv.wheelTrackMesh.instanceMatrix.needsUpdate = true;
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

  private updateParticles(dt: number, gravityMs2: number, windDriftX: number) {
    let anyAlive = false;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      if (this.particleLife[i] > 0) {
        anyAlive = true;
        this.particleLife[i] -= dt;
        this.particleVel[i * 3 + 1] -= gravityMs2 * dt;
        this.particleVel[i * 3] += windDriftX * dt;
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

  private getAllInspectableRoots(): THREE.Object3D[] {
    return [
      this.launchComplex.rocketFull,
      this.launchComplex.groundGroup,
      this.lander.group,
      this.roverModel.group,
      this.lunarEnv.habGroup,
      this.showcaseSatellite.group,
      this.jwstModel.group,
      this.voyagerModel.group,
    ];
  }

  private setInspectorMaterialsMode(active: boolean) {
    if (active === this.inspectorMaterialsActive) return;
    this.inspectorMaterialsActive = active;
    const roots = this.getAllInspectableRoots();
    roots.forEach((root) => {
      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        if (!obj.userData?.partId) return;
        const m = obj.material;
        if (Array.isArray(m)) return;

        if (active) {
          let cached = this.inspectorMatCache.get(obj);
          if (!cached && (m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshBasicMaterial)) {
            const cloned = m.clone() as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;
            cached = {
              origMat: m,
              inspectMat: cloned,
              origColorHex: cloned.color.getHex(),
              origEmissiveHex: cloned instanceof THREE.MeshStandardMaterial ? cloned.emissive.getHex() : 0,
              origEmissiveIntensity: cloned instanceof THREE.MeshStandardMaterial ? cloned.emissiveIntensity : 0,
              origOpacity: cloned.opacity,
              origTransparent: cloned.transparent,
            };
            this.inspectorMatCache.set(obj, cached);
          }
          if (cached) {
            obj.material = cached.inspectMat;
          }
        } else {
          const cached = this.inspectorMatCache.get(obj);
          if (cached) {
            obj.material = cached.origMat;
          }
        }
      });
    });
  }

  private updatePartHighlight(
    partId: string | null,
    phase: GamePhase,
    hoverPartId: string | null = null,
    selectedSubEngine: number | null = null
  ) {
    this.setInspectorMaterialsMode(phase === 'inspector');

    if (
      partId === this.lastHighlightedPart &&
      phase === this.lastHighlightPhase &&
      hoverPartId === this.lastHoverPart &&
      selectedSubEngine === this.lastSubEngine
    ) {
      return;
    }
    this.lastHighlightedPart = partId;
    this.lastHighlightPhase = phase;
    this.lastHoverPart = hoverPartId;
    this.lastSubEngine = selectedSubEngine;

    const targets = this.getAllInspectableRoots();
    const isInspector = phase === 'inspector';
    const isLaunchHighlight = phase === 'launch' && Boolean(partId);

    targets.forEach((root) => {
      root.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const meshPart = obj.userData.partId as string | undefined;

        if (isInspector && meshPart) {
          const cached = this.inspectorMatCache.get(obj);
          if (!cached) return;
          const mat = cached.inspectMat;
          const isSelected = Boolean(partId && meshPart === partId);
          const isHovered = Boolean(hoverPartId && meshPart === hoverPartId);
          const subIdx = obj.userData?.subEngineIndex as number | undefined;

          if (isSelected) {
            mat.color.setHex(cached.origColorHex);
            if (partId === 'sls-rs25' && selectedSubEngine && subIdx) {
              if (subIdx === selectedSubEngine) {
                mat.opacity = 1;
                mat.transparent = cached.origTransparent;
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.emissive.setHex(0x22d3ee);
                  mat.emissiveIntensity = 0.55;
                }
              } else {
                mat.color.setHex(cached.origColorHex).lerp(this.dimTargetColor, 0.55);
                mat.opacity = cached.origOpacity;
                mat.transparent = cached.origTransparent;
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.emissive.setHex(cached.origEmissiveHex);
                  mat.emissiveIntensity = cached.origEmissiveIntensity * 0.15;
                }
              }
            } else {
              mat.color.setHex(cached.origColorHex);
              mat.opacity = cached.origOpacity;
              mat.transparent = cached.origTransparent;
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.emissive.setHex(0x0ea5e9);
                mat.emissiveIntensity = Math.min(0.24, cached.origEmissiveIntensity + 0.16);
              }
            }
          } else if (partId) {
            // Subtle albedo darkening for unrelated components without alpha-sorting artifacts
            mat.color.setHex(cached.origColorHex).lerp(this.dimTargetColor, isHovered ? 0.15 : 0.68);
            mat.opacity = cached.origOpacity;
            mat.transparent = cached.origTransparent;
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.emissive.setHex(isHovered ? 0x38bdf8 : cached.origEmissiveHex);
              mat.emissiveIntensity = isHovered ? 0.2 : cached.origEmissiveIntensity * 0.08;
            }
          } else if (isHovered) {
            mat.color.setHex(cached.origColorHex);
            mat.opacity = cached.origOpacity;
            mat.transparent = cached.origTransparent;
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.emissive.setHex(0x22d3ee);
              mat.emissiveIntensity = Math.min(0.26, cached.origEmissiveIntensity + 0.18);
            }
          } else {
            mat.color.setHex(cached.origColorHex);
            mat.opacity = cached.origOpacity;
            mat.transparent = cached.origTransparent;
            if (mat instanceof THREE.MeshStandardMaterial) {
              mat.emissive.setHex(cached.origEmissiveHex);
              mat.emissiveIntensity = cached.origEmissiveIntensity;
            }
          }
          return;
        }

        // Non-inspector phase (e.g., Launch hover/click)
        const mat = obj.material;
        if (!(mat instanceof THREE.MeshStandardMaterial)) return;
        if (!this.emissiveOriginal.has(mat)) {
          this.emissiveOriginal.set(mat, {
            hex: mat.emissive.getHex(),
            intensity: mat.emissiveIntensity,
          });
        }
        const orig = this.emissiveOriginal.get(mat)!;
        if (isLaunchHighlight && meshPart === partId) {
          mat.emissive.setHex(0x22d3ee);
          mat.emissiveIntensity = 0.72;
        } else {
          mat.emissive.setHex(orig.hex);
          mat.emissiveIntensity = orig.intensity;
        }
      });
    });
  }

  private applyExplodeAndIsolate(s: SceneSimulationBridge, dt: number) {
    const isInspector = s.phase === 'inspector';
    const targetExplodeT = isInspector ? (s.inspector?.explodePct ?? 0) / 100 : 0;
    const blend = isInspector ? 1 - Math.exp(-10 * dt) : 1;
    this.currentExplodeT += (targetExplodeT - this.currentExplodeT) * blend;
    if (Math.abs(this.currentExplodeT - targetExplodeT) < 0.001) {
      this.currentExplodeT = targetExplodeT;
    }
    const explodeT = this.currentExplodeT;
    const isolate = isInspector && Boolean(s.inspector?.isolatePart && s.highlightedPart);
    const activeCraft = HARDWARE_CATALOG[s.showcase];
    const stageSpec =
      isInspector && s.showcase === 'rocket' && (s.inspector?.stageSepStep ?? 0) > 0
        ? getStageSepStep(s.inspector?.stageSepStep ?? 0)
        : null;

    const craftList = [
      this.launchComplex.rocketFull,
      this.showcaseSatellite.group,
      this.jwstModel.group,
      this.voyagerModel.group,
      this.lander.group,
      this.roverModel.group,
      this.lunarEnv.habGroup,
      this.saturnVModel.group,
      this.falcon9Model.group,
      this.issModel.group,
    ];

    craftList.forEach((root) => {
      root.traverse((obj) => {
        const expId = obj.userData?.explodePartId as string | undefined;
        if (expId && obj.userData.basePos instanceof THREE.Vector3) {
          const base = obj.userData.basePos as THREE.Vector3;
          const partSpec = activeCraft?.parts.find((p) => p.id === expId);
          const axis = (obj.userData.explodeAxisOverride as [number, number, number] | undefined) || partSpec?.explodeAxis;

          let ox = 0;
          let oy = 0;
          let oz = 0;
          if (explodeT > 0.001 && axis && isInspector) {
            ox += axis[0] * explodeT;
            oy += axis[1] * explodeT;
            oz += axis[2] * explodeT;
          }

          // SLS Stage Separation Sequence preview offsets
          if (stageSpec) {
            if (expId === 'sls-boosters' && stageSpec.srbSepFactor > 0) {
              const sideSign = obj === this.launchComplex.srbLeft ? -1 : 1;
              ox += sideSign * 3.8 * stageSpec.srbSepFactor;
              oy -= 2.6 * stageSpec.srbSepFactor;
            } else if (expId === 'sls-las' && stageSpec.lasSepFactor > 0) {
              ox += 1.2 * stageSpec.lasSepFactor;
              oy += 4.5 * stageSpec.lasSepFactor;
              oz += 0.6 * stageSpec.lasSepFactor;
            } else if ((expId === 'sls-core' || expId === 'sls-rs25') && stageSpec.coreSepFactor > 0) {
              oy -= 4.8 * stageSpec.coreSepFactor;
            }
          }

          obj.position.set(base.x + ox, base.y + oy, base.z + oz);
        }

        if (obj instanceof THREE.Mesh && typeof obj.userData?.partId === 'string') {
          if (isolate && activeCraft?.parts.some((p) => p.id === s.highlightedPart)) {
            obj.visible = obj.userData.partId === s.highlightedPart;
          } else {
            obj.visible = true;
          }
        }
      });
    });

    // Interactive hardware actuation in inspector (RS-25 gimbals, ESM solar wings, HERMES solar/dish)
    if (isInspector && s.showcase === 'rocket') {
      const lc = this.launchComplex;
      const gDeg = s.highlightedPart === 'sls-rs25' ? (s.inspector?.gimbalDeg ?? 0) : 0;
      const gRad = (gDeg * Math.PI) / 180;
      lc.rs25EngineGroups.forEach((eng, idx) => {
        const targetZ = gRad;
        const targetX = (idx < 2 ? 1 : -1) * gRad * 0.35;
        eng.rotation.z += (targetZ - eng.rotation.z) * (1 - Math.exp(-12 * dt));
        eng.rotation.x += (targetX - eng.rotation.x) * (1 - Math.exp(-12 * dt));
      });

      const esmFoldPct =
        stageSpec?.esmSolarFoldPct ?? (s.highlightedPart === 'sls-esm' ? (s.inspector?.deployPct ?? 70) : 0);
      const targetWingAngle = -(Math.PI * 0.44) * (esmFoldPct / 100);
      for (let i = 0; i < lc.esmSolarPivots.length; i++) {
        const p = lc.esmSolarPivots[i];
        p.rotation.x += (targetWingAngle - p.rotation.x) * (1 - Math.exp(-8 * dt));
      }

      lc.icpsFlame.visible = Boolean(stageSpec?.icpsThrusting);
      lc.srbLeftBsm.visible = Boolean(stageSpec && stageSpec.step === 1);
      lc.srbRightBsm.visible = Boolean(stageSpec && stageSpec.step === 1);
      lc.lasFlame.visible = Boolean(stageSpec && stageSpec.step === 2);
    } else if (!isInspector) {
      this.launchComplex.rs25EngineGroups.forEach((eng) => {
        eng.rotation.set(0, 0, 0);
      });
    }
  }

  private syncQuality(quality: QualityPreset = 'high') {
    if (this.appliedQuality === quality) return;
    this.appliedQuality = quality;
    if (this.isSoftwareGl) return;
    if (quality === 'low') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    } else if (quality === 'med') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
    }
  }

  private syncScene(dt: number, elapsedSec: number) {
    const s = this.simRef.current;
    const { phase } = s;

    this.syncQuality(s.quality ?? 'high');

    // Reset launch visual offsets if not in launch or reset to pre-sim
    if (phase !== 'launch' || s.launch.launchSequence === 'PRE_SIM') {
      this.srbDetachedTime = -1;
      this.coreDetachedTime = -1;
      this.lasDetachedTime = -1;
      this.launchPitchVisualRad = 0;
    }

    // Track cinematic 360-degree main menu orbit angle (62s calm period)
    if (phase === 'title') {
      if (this.lastPhase !== 'title' || s.showcase !== this.lastTitleShowcase) {
        this.titleOrbitAngle = 0.58;
        this.lastTitleShowcase = s.showcase;
      }
      if (!s.userOrbitActive && !this.prefersReducedMotion) {
        this.titleOrbitAngle = (this.titleOrbitAngle + dt * ((Math.PI * 2) / 62)) % (Math.PI * 2);
      }
    }
    this.lastPhase = phase;

    // Auto-rotate showcase in inspector if enabled
    if (phase === 'inspector' && s.inspector?.autoRotate && !s.userOrbitActive) {
      s.orbitYaw += dt * 0.32;
    }

    // Visibility matrix per phase
    const showLaunch = phase === 'launch' || ((phase === 'title' || phase === 'inspector') && s.showcase === 'rocket');
    const showSatelliteShowcase = (phase === 'title' || phase === 'inspector') && s.showcase === 'satellite';
    const showJwstShowcase = (phase === 'title' || phase === 'inspector') && s.showcase === 'jwst';
    const showVoyagerShowcase = (phase === 'title' || phase === 'inspector') && s.showcase === 'voyager';
    const showSaturnVShowcase = (phase === 'title' || phase === 'inspector') && s.showcase === 'saturn-v';
    const showFalcon9Showcase = (phase === 'title' || phase === 'inspector') && s.showcase === 'falcon-9';
    const showIssShowcase = (phase === 'title' || phase === 'inspector') && s.showcase === 'iss';
    const showSpace = phase === 'space' || (phase === 'gameover' && s.crashFx.active && s.crashFx.kind === 'space');
    const showLunar =
      !showLaunch &&
      !showSpace &&
      !showSatelliteShowcase &&
      !showJwstShowcase &&
      !showVoyagerShowcase &&
      !showSaturnVShowcase &&
      !showFalcon9Showcase &&
      !showIssShowcase;

    this.launchComplex.group.visible = showLaunch;
    this.solarSystem.group.visible = showSpace;
    this.showcaseSatellite.group.visible = showSatelliteShowcase;
    this.jwstModel.group.visible = showJwstShowcase;
    this.voyagerModel.group.visible = showVoyagerShowcase;
    this.saturnVModel.group.visible = showSaturnVShowcase;
    this.falcon9Model.group.visible = showFalcon9Showcase;
    this.issModel.group.visible = showIssShowcase;
    this.lunarEnv.group.visible = showLunar;
    this.lunarEnv.kilopowerGroup.visible =
      Boolean(s.kilopowerActive) ||
      ((phase === 'title' || phase === 'inspector') && s.showcase === 'outpost');
    this.starField.visible = !showLaunch || s.launch.altitudeKm > 18;
    const isSurfaceMars =
      showLunar && s.phase !== 'title' && s.phase !== 'inspector' && s.planet === 'mars';
    this.scene.fog =
      showLaunch && s.launch.altitudeKm < 16
        ? this.launchFog
        : isSurfaceMars
          ? this.marsFog
          : null;
    if (showLaunch) {
      this.launchFog.density = Math.max(0, 0.0022 * (1 - s.launch.altitudeKm / 16));
    }

    const unstowingOnSurface = phase === 'landing' && Boolean(s.unstow?.active);

    this.lander.group.visible =
      phase === 'landing' ||
      phase === 'rover' ||
      phase === 'victory' ||
      (phase === 'gameover' && s.crashFx.kind !== 'space') ||
      phase === 'briefing' ||
      (phase === 'title' &&
        s.showcase !== 'rocket' &&
        s.showcase !== 'satellite' &&
        s.showcase !== 'jwst' &&
        s.showcase !== 'voyager' &&
        s.showcase !== 'saturn-v' &&
        s.showcase !== 'falcon-9' &&
        s.showcase !== 'iss') ||
      (phase === 'inspector' && s.showcase === 'lander');

    this.roverModel.group.visible =
      phase === 'rover' ||
      phase === 'victory' ||
      unstowingOnSurface ||
      (phase === 'gameover' && s.crashFx.kind === 'rover') ||
      phase === 'briefing' ||
      (phase === 'title' && (s.showcase === 'rover' || s.showcase === 'outpost')) ||
      (phase === 'inspector' && s.showcase === 'rover');

    this.lunarEnv.habGroup.visible = phase !== 'inspector' || s.showcase === 'outpost';

    this.bayRimLight.intensity = phase === 'inspector' ? 1.2 : 0;
    if (phase === 'inspector') {
      if (s.showcase === 'rocket') {
        this.bayTurntable.visible = true;
        this.bayTurntable.position.set(0, 1.65, 0);
        this.bayTurntable.scale.setScalar(1.85);
      } else if (s.showcase === 'satellite' || s.showcase === 'jwst' || s.showcase === 'voyager' || s.showcase === 'iss') {
        this.bayTurntable.visible = true;
        this.bayTurntable.position.set(0, -3.2, 0);
        this.bayTurntable.scale.setScalar(s.showcase === 'iss' ? 1.9 : 1.25);
      } else {
        this.bayTurntable.visible = false;
      }
    } else {
      this.bayTurntable.visible = false;
      this.lastInspectShowcase = null;
    }

    // Rotate Earth gently in Lunar Sky & update custom atmospheric scattering + separate Fresnel blue rim mesh
    this.lunarEnv.earthGlobe.rotation.y += dt * 0.008;
    this.lunarEnv.earthClouds.rotation.y += dt * 0.011;
    const lunarEarthDist = Math.hypot(
      this.camera.position.x - this.lunarEnv.earthGroup.position.x,
      this.camera.position.y - this.lunarEnv.earthGroup.position.y,
      this.camera.position.z - this.lunarEnv.earthGroup.position.z
    );
    this.updateEarthShaderLayerUniforms(
      this.lunarEnv.earthAtmo,
      this.lunarEnv.earthGroup.position,
      this.sunLight.position,
      lunarEarthDist,
      28,
      1.0
    );
    this.updateEarthShaderLayerUniforms(
      this.lunarEarthFresnelRimMesh,
      this.lunarEnv.earthGroup.position,
      this.sunLight.position,
      lunarEarthDist,
      28,
      1.0
    );

    // Highlight parts & smoothly actuate exploded / stage-sep / gimbal subsystems during Vehicle Inspector
    this.updatePartHighlight(
      s.highlightedPart,
      phase,
      s.inspector?.hoveredPartId ?? null,
      s.inspector?.selectedSubEngine ?? null
    );
    this.applyExplodeAndIsolate(s, dt);

    // Hide landing helpers unless in landing phase
    this.guideLine.visible = false;
    this.bullseyeRing.visible = false;
    this.predRing.visible = false;
    this.lunarEnv.trajectoryArc.visible = false;
    this.lunarEnv.approachGates.forEach((g) => (g.group.visible = false));
    this.lunarEnv.landingZoneMeshes.forEach((z) => {
      z.group.visible = phase === 'landing' && z.planet === s.planet && !unstowingOnSurface;
    });

    if (showLaunch) {
      this.solarSystem.group.position.set(0, 0, 0);
      this.starField.position.set(0, 0, 0);
      this.syncLaunchScene(s, dt, elapsedSec);
    } else if (
      showSatelliteShowcase ||
      showJwstShowcase ||
      showVoyagerShowcase ||
      showSaturnVShowcase ||
      showFalcon9Showcase ||
      showIssShowcase
    ) {
      this.solarSystem.group.position.set(0, 0, 0);
      this.starField.position.set(0, 0, 0);
      const kind = showSaturnVShowcase
        ? 'saturn-v'
        : showFalcon9Showcase
          ? 'falcon-9'
          : showIssShowcase
            ? 'iss'
            : showJwstShowcase
              ? 'jwst'
              : showVoyagerShowcase
                ? 'voyager'
                : 'satellite';
      this.syncSpacecraftShowcaseScene(s, dt, kind);
    } else if (showSpace) {
      this.syncSpaceScene(s, dt, elapsedSec);
    } else {
      this.solarSystem.group.position.set(0, 0, 0);
      this.starField.position.set(0, 0, 0);
      this.syncLunarScene(s, dt, elapsedSec);
    }

    if (!showSpace && Math.abs(this.camera.near - 0.2) > 0.005) {
      this.camera.near = 0.2;
      this.camera.far = 2500;
      this.camera.updateProjectionMatrix();
    }

    this.syncCrashFxVisuals(s, dt, elapsedSec);
    const particleGrav =
      showLunar && (phase === 'rover' || phase === 'landing')
        ? s.planet === 'mars'
          ? 0.45
          : 1.625
        : 0;
    const windX = isSurfaceMars ? 0.35 : 0;
    this.updateParticles(dt, particleGrav, windX);
  }

  private applyInspectorOrbitCamera(
    s: SceneSimulationBridge,
    dt: number,
    baseFocusX: number,
    baseFocusY: number,
    baseFocusZ: number,
    minDist: number,
    maxDist: number,
    minCamY = -50
  ) {
    if (this.lastInspectShowcase !== s.showcase) {
      this.lastInspectShowcase = s.showcase;
      this.inspectFocusCurrent.set(baseFocusX, baseFocusY, baseFocusZ);
    }

    const stageStep = s.showcase === 'rocket' ? (s.inspector?.stageSepStep ?? 0) : 0;
    if (stageStep >= 3) {
      this.camLookTarget.set(0, 17.8, 0);
    } else {
      const foundPart = s.highlightedPart
        ? this.computeInspectorPartWorldCenter(s.showcase, s.highlightedPart, this.scratchVec)
        : false;
      if (foundPart) {
        this.camLookTarget.copy(this.scratchVec);
      } else {
        this.camLookTarget.set(baseFocusX, baseFocusY, baseFocusZ);
      }
    }

    if (s.panOffset) {
      this.camLookTarget.x += s.panOffset.x;
      this.camLookTarget.y += s.panOffset.y;
      this.camLookTarget.z += s.panOffset.z;
    }

    const focusAlpha = 1 - Math.exp(-8.5 * dt);
    this.inspectFocusCurrent.lerp(this.camLookTarget, focusAlpha);

    const explodeZoomBoost =
      s.showcase === 'rocket' && !s.highlightedPart && stageStep === 0
        ? 1 + this.currentExplodeT * 0.34
        : 1;
    const rawDist = stageStep >= 3 ? Math.max(s.orbitDistance, 25) : s.orbitDistance * explodeZoomBoost;
    const dist = Math.min(maxDist, Math.max(minDist, rawDist));
    const camX = this.inspectFocusCurrent.x + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
    const camZ = this.inspectFocusCurrent.z + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
    const rawCamY = this.inspectFocusCurrent.y + Math.sin(s.orbitPitch) * dist;
    const camY = Math.max(minCamY, rawCamY);

    this.camPosTarget.set(camX, camY, camZ);
    const camAlpha = 1 - Math.exp(-11.5 * dt);
    this.camera.position.lerp(this.camPosTarget, camAlpha);
    this.camLookCurrent.copy(this.inspectFocusCurrent);
    this.camera.lookAt(this.camLookCurrent);
  }

  private syncSpacecraftShowcaseScene(
    s: SceneSimulationBridge,
    dt: number,
    kind: 'satellite' | 'jwst' | 'voyager' | 'saturn-v' | 'falcon-9' | 'iss'
  ) {
    const isInspector = s.phase === 'inspector';
    (this.scene.background as THREE.Color).setHex(isInspector ? 0x050914 : 0x020617);
    this.ambientLight.color.setHex(0x93c5fd);
    this.ambientLight.groundColor.setHex(0x1e293b);
    this.ambientLight.intensity = isInspector ? 0.68 : 0.55;
    this.sunLight.color.setHex(0xfffbeb);
    this.sunLight.position.set(90, 72, 60);
    this.sunLight.intensity = isInspector ? 2.85 : 2.75;

    // Stationary 3D showcase spacecraft — the camera orbits smoothly around them
    if (kind === 'satellite') {
      const sat = this.showcaseSatellite;
      sat.group.position.set(0, 0, 0);
      sat.group.rotation.set(0.18, 0.35, 0);
      const wingScale =
        isInspector && s.highlightedPart === 'sat-solar'
          ? 0.25 + 0.75 * ((s.inspector?.deployPct ?? 100) / 100)
          : 1;
      sat.solarLeftPivot.scale.x = wingScale;
      sat.solarRightPivot.scale.x = wingScale;
      sat.umbrellaLeft.scale.setScalar(1);
      sat.umbrellaRight.scale.setScalar(1);
      sat.linkBeam.visible = isInspector && s.highlightedPart === 'sat-dish';
    } else if (kind === 'jwst') {
      this.jwstModel.group.position.set(0, 0.2, 0);
      this.jwstModel.group.rotation.set(0.12, 0.45, 0);
    } else if (kind === 'voyager') {
      this.voyagerModel.group.position.set(0, 0.2, 0);
      this.voyagerModel.group.rotation.set(0.16, -0.4, 0);
    } else if (kind === 'saturn-v') {
      this.saturnVModel.group.position.set(0, 0, 0);
      this.saturnVModel.group.rotation.set(0, 0, 0);
    } else if (kind === 'falcon-9') {
      this.falcon9Model.group.position.set(0, 0, 0);
      this.falcon9Model.group.rotation.set(0, 0, 0);
    } else if (kind === 'iss') {
      this.issModel.group.position.set(0, 0, 0);
      this.issModel.group.rotation.set(0.12, 0.42, 0);
    }

    const focusY =
      kind === 'saturn-v' ? 12.5 : kind === 'falcon-9' ? 9.5 : kind === 'iss' ? 0 : kind === 'satellite' ? 0 : 0.2;
    if (isInspector) {
      const minDist = kind === 'saturn-v' ? 6.0 : kind === 'falcon-9' ? 4.5 : kind === 'iss' ? 6.0 : 2.8;
      const maxDist = kind === 'saturn-v' ? 65 : kind === 'falcon-9' ? 48 : kind === 'iss' ? 55 : 32;
      this.applyInspectorOrbitCamera(s, dt, 0, focusY, 0, minDist, maxDist);
    } else if (s.phase === 'title' && !s.userOrbitActive) {
      const dist =
        kind === 'saturn-v'
          ? 32.0
          : kind === 'falcon-9'
            ? 24.0
            : kind === 'iss'
              ? 26.0
              : kind === 'satellite'
                ? 8.8
                : kind === 'jwst'
                  ? 10.8
                  : 11.2;
      const a = this.titleOrbitAngle;
      const camX = Math.sin(a) * dist;
      const camY = focusY + 2.6 + Math.sin(a * 0.5) * 0.45;
      const camZ = Math.cos(a) * dist;
      const len = Math.max(0.01, Math.hypot(camX, camZ));
      const rightX = camZ / len;
      const rightZ = -camX / len;
      const leftShift =
        kind === 'saturn-v'
          ? 3.5
          : kind === 'falcon-9'
            ? 2.8
            : kind === 'iss'
              ? 3.0
              : kind === 'satellite'
                ? 1.8
                : 2.1;
      this.camPosTarget.set(camX, camY, camZ);
      this.camLookTarget.set(-rightX * leftShift, focusY, -rightZ * leftShift);
      const rate = 1 - Math.exp(-4.2 * dt);
      this.camera.position.lerp(this.camPosTarget, rate);
      this.camLookCurrent.lerp(this.camLookTarget, 1 - Math.exp(-4.8 * dt));
      this.camera.lookAt(this.camLookCurrent);
    } else {
      const dist = Math.min(
        kind === 'saturn-v' ? 65 : 34,
        Math.max(3.2, s.orbitDistance)
      );
      this.camPosTarget.set(
        Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
        focusY + Math.sin(s.orbitPitch) * dist,
        Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
      );
      this.camLookTarget.set(0, focusY, 0);
      const rate = s.phase === 'title' ? 1 - Math.exp(-12 * dt) : 1;
      this.camera.position.lerp(this.camPosTarget, rate);
      this.camLookCurrent.lerp(this.camLookTarget, rate);
      this.camera.lookAt(this.camLookCurrent);
    }
  }

  private syncLaunchScene(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const L = s.launch;
    const lc = this.launchComplex;
    this.ambientLight.color.setHex(0x93c5fd);
    this.ambientLight.groundColor.setHex(0x1e293b);
    this.ambientLight.intensity = 0.55;
    this.sunLight.color.setHex(0xfffbeb);
    this.sunLight.position.set(90, 72, 60);
    this.sunLight.intensity = 2.75;

    // Gentle horizon cloud drift
    lc.cloudLayer.rotation.y = Math.sin(elapsedSec * 0.03) * 0.05;

    if (s.phase === 'inspector') {
      lc.groundGroup.visible = false;
      lc.earthLimb.visible = false;
      lc.moonMesh.visible = false;
      lc.cloudLayer.visible = false;
      lc.leoOrbitRing.visible = false;
      lc.rocketFull.position.set(0, 2.5, 0);
      lc.rocketFull.rotation.set(0, 0, 0);
      lc.srbLeft.visible = true;
      lc.srbLeft.rotation.set(0, 0, 0);
      lc.srbRight.visible = true;
      lc.srbRight.rotation.set(0, 0, 0);
      lc.coreGroup.visible = true;
      lc.coreGroup.rotation.set(0, 0, 0);
      lc.rs25Group.visible = true;
      lc.rs25Group.rotation.set(0, 0, 0);
      lc.abortTower.visible = true;
      lc.abortTower.rotation.set(0, 0, 0);
      lc.machCone.visible = false;
      lc.flameGroup.visible = false;
      lc.trenchLight.intensity = 0;
      const stageSepOn = (s.inspector?.stageSepStep ?? 0) === 4;
      lc.rocketEngineGlow.intensity = stageSepOn ? 3.8 : 0;
      lc.rocketEngineGlow.color.setHex(0x38bdf8);
      lc.rocketEngineGlow.position.set(0, 16.5, 0);
      lc.padSpotlight.intensity = 0;
      lc.skyDomeMat.opacity = 0;
      this.ambientLight.intensity = 0.68;
      this.sunLight.intensity = 2.85;
      this.launchPitchVisualRad = 0;
      (this.scene.background as THREE.Color).setHex(0x050914);
      this.applyInspectorOrbitCamera(s, dt, 0, 12.2, 0, 5.5, 68);
      return;
    }

    if (s.phase === 'title') {
      lc.groundGroup.visible = true;
      lc.groundGroup.position.set(0, 0, 0);
      lc.earthLimb.visible = false;
      lc.moonMesh.visible = true;
      lc.cloudLayer.visible = true;
      lc.crewAccessArm.rotation.y = 0;
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
      lc.coreGroup.rotation.set(0, 0, 0);
      lc.rs25Group.visible = true;
      lc.rs25Group.position.set(0, 0, 0);
      lc.rs25Group.rotation.set(0, 0, 0);
      lc.abortTower.visible = true;
      lc.abortTower.position.set(0, 23.02, 0);
      lc.abortTower.rotation.set(0, 0, 0);
      lc.lasFlame.visible = false;
      lc.srbLeftBsm.visible = false;
      lc.srbRightBsm.visible = false;
      lc.icpsFlame.visible = false;
      lc.machCone.visible = false;
      lc.flameGroup.visible = false;
      for (let i = 0; i < lc.esmSolarPivots.length; i++) {
        lc.esmSolarPivots[i].rotation.x = 0;
      }
      lc.trenchLight.intensity = 0;
      lc.rocketEngineGlow.intensity = 0;
      lc.padSpotlight.intensity = 5.8;
      lc.skyDomeMat.opacity = 1;
      lc.cloudMat.opacity = 0.44;
      lc.coolCloudMat.opacity = 0.36;
      this.launchPitchVisualRad = 0;
      (this.scene.background as THREE.Color).setHex(0x0b132b);

      if (!s.userOrbitActive) {
        // Cinematic 360-degree camera orbit framing stationary SLS on the right/center stage
        const a = this.titleOrbitAngle;
        const dist = 32;
        const camX = Math.sin(a) * dist;
        const camY = 15.8 + Math.sin(a * 0.5) * 1.4;
        const camZ = Math.cos(a) * dist;
        const len = Math.max(0.01, Math.hypot(camX, camZ));
        const rightX = camZ / len;
        const rightZ = -camX / len;
        this.camPosTarget.set(camX, Math.max(2.4, camY), camZ);
        this.camLookTarget.set(-rightX * 5.8, 13.0, -rightZ * 5.8);
        this.camera.position.lerp(this.camPosTarget, 1 - Math.exp(-4.2 * dt));
        this.camLookCurrent.lerp(this.camLookTarget, 1 - Math.exp(-4.8 * dt));
        this.camera.lookAt(this.camLookCurrent);
      } else {
        const dist = Math.min(85, Math.max(8, s.orbitDistance));
        const camY = Math.max(1.2, 12.0 + Math.sin(s.orbitPitch) * dist);
        this.camPosTarget.set(
          Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
          camY,
          Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
        );
        this.camLookTarget.set(0, 12.0, 0);
        const rate = 1 - Math.exp(-12 * dt);
        this.camera.position.lerp(this.camPosTarget, rate);
        this.camLookCurrent.lerp(this.camLookTarget, rate);
        this.camera.lookAt(this.camLookCurrent);
      }
      return;
    }

    lc.moonMesh.visible = true;

    // PRE-SIMULATION & COUNTDOWN / READY: Make SLS the unmistakable hero at LC-39B
    if (L.launchSequence !== 'ASCENDING') {
      lc.groundGroup.visible = true;
      lc.groundGroup.position.set(0, 0, 0);
      lc.earthLimb.visible = false;
      lc.cloudLayer.visible = true;
      lc.skyDomeMat.opacity = 1;
      lc.cloudMat.opacity = 0.44;
      lc.coolCloudMat.opacity = 0.36;
      lc.padSpotlight.intensity = 5.8;
      lc.rocketEngineGlow.intensity = 0;
      this.launchPitchVisualRad = 0;
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
      lc.coreGroup.rotation.set(0, 0, 0);
      lc.rs25Group.visible = true;
      lc.rs25Group.position.set(0, 0, 0);
      lc.rs25Group.rotation.set(0, 0, 0);
      lc.abortTower.visible = true;
      lc.abortTower.position.set(0, 23.02, 0);
      lc.abortTower.rotation.set(0, 0, 0);
      lc.lasFlame.visible = false;
      lc.srbLeftBsm.visible = false;
      lc.srbRightBsm.visible = false;
      lc.icpsFlame.visible = false;
      lc.machCone.visible = false;
      lc.flameGroup.visible = false;
      for (let i = 0; i < lc.esmSolarPivots.length; i++) {
        lc.esmSolarPivots[i].rotation.x = 0;
      }
      lc.trenchLight.intensity = 0;
      (this.scene.background as THREE.Color).setHex(0x0b132b);

      if (L.launchSequence === 'PRE_SIM') {
        lc.crewAccessArm.rotation.y = 0;
        this.camPosTarget.set(14.5, 11.4, 28.0);
        this.camLookTarget.set(-0.4, 14.0, 0);
      } else {
        // Retract crew access arm smoothly during 3..2..1 countdown
        const retractT =
          L.launchSequence === 'READY'
            ? 1
            : Math.min(1, Math.max(0, (2.4 - L.countdownSec) / 1.8));
        lc.crewAccessArm.rotation.y = -0.78 * retractT;

        // Hero low-angle framing emphasizing 111.3m SLS stack & cryogenic vents
        this.camPosTarget.set(11.8, 7.6, 22.8);
        this.camLookTarget.set(-0.3, 14.2, 0);

        // Cryogenic LOX/LH2 boil-off vapor wisps from upper stage vent
        if (!s.paused && Math.random() < 0.42) {
          this.emitParticle(
            0.9 + (Math.random() - 0.5) * 0.5,
            20.2 + (Math.random() - 0.5) * 0.6,
            (Math.random() - 0.5) * 0.5,
            1.4 + Math.random() * 0.9,
            0.9 + Math.random() * 0.8,
            (Math.random() - 0.5) * 0.6,
            1.05,
            0.88,
            0.94,
            1.0
          );
        }
      }

      if (s.userOrbitActive) {
        const dist = Math.min(85, Math.max(9, s.orbitDistance));
        const lookY = 14.0;
        this.camPosTarget.set(
          Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
          Math.max(1.2, lookY + Math.sin(s.orbitPitch) * dist),
          Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
        );
        this.camLookTarget.set(0, lookY, 0);
        this.camera.position.lerp(this.camPosTarget, Math.min(1, 14 * dt));
        this.camLookCurrent.lerp(this.camLookTarget, Math.min(1, 14 * dt));
        this.camera.lookAt(this.camLookCurrent);
        return;
      }

      const camAlpha = 1 - Math.exp(-3.6 * dt);
      const lookAlpha = 1 - Math.exp(-4.2 * dt);
      this.camera.position.lerp(this.camPosTarget, camAlpha);
      this.camLookCurrent.lerp(this.camLookTarget, lookAlpha);
      this.camera.lookAt(this.camLookCurrent);
      return;
    }

    // ACTIVE ASCENDING LIFTOFF & ASCENT (INCLUDING PAD ENGINE IGNITION & THRUST BUILDUP)
    lc.crewAccessArm.rotation.y = -0.78;
    const alt = L.altitudeKm;
    const downrangeKm = L.downrangeKm ?? 0;

    // Continuous, physically grounded tower clear (0..140m = 23 scene units) -> floating-origin ascent
    const towerClearT = 1 - Math.exp(-alt / 0.16);
    const padVibration =
      L.ignited && alt < 0.02 && !s.paused
        ? Math.sin(elapsedSec * 72) * 0.035 * Math.min(1, L.throttle)
        : 0;
    const liftY = 2.5 + towerClearT * 24.0 + padVibration;
    // Continuous ground recession matching tower-clear scale (150 units/km near pad, tapering smoothly at high altitude)
    const nearPadDrop = Math.min(alt, 1.2) * 145.0;
    const highAltDrop = Math.max(0, alt - 1.2) * 18.5;
    const groundDrop = Math.min(480, nearPadDrop + highAltDrop);
    lc.groundGroup.visible = alt < 38;
    lc.groundGroup.position.set(-Math.min(180, downrangeKm * 4.2), -groundDrop, 0);

    // Continuous SI atmospheric density fade (1.225 kg/m^3 at sea level -> exponential vacuum)
    const atmoDensityRatio = Math.min(1, Math.max(0, (L.airDensityKgM3 ?? 1.225) / 1.225));
    const skyScatter = Math.pow(atmoDensityRatio, 0.34);
    lc.skyDomeMat.opacity = Math.min(1, skyScatter * 1.12);
    lc.cloudMat.opacity = 0.44 * Math.min(1, skyScatter * 1.15);
    lc.coolCloudMat.opacity = 0.36 * Math.min(1, skyScatter * 1.15);
    lc.cloudLayer.visible = atmoDensityRatio > 0.015;
    lc.cloudLayer.position.x = -((downrangeKm * 2.4) % 90);
    lc.padSpotlight.intensity = alt < 8 ? 5.8 * (1 - alt / 8) : 0;

    const tliPct =
      L.orbitReached && s.leoTransfer
        ? Math.min(1, Math.max(0, s.leoTransfer.tliBurnProgressPct / 100))
        : 0;
    const limbAppear = Math.min(1, Math.max(0, (alt - 8) / 28));
    const limbFade = limbAppear * limbAppear * (3 - 2 * limbAppear);
    lc.earthLimb.visible = limbFade > 0.01;
    lc.earthLimb.position.x = -tliPct * 16;
    lc.earthLimb.position.y = -101 - Math.min(22, Math.max(0, alt - 8) * 0.14) - tliPct * 14;
    // Rotate Earth limb continuously with downrange distance so orbital velocity is visually unmistakable
    lc.earthLimb.rotation.z = downrangeKm * 0.0026 + (L.orbitReached ? elapsedSec * 0.016 : 0);
    lc.earthLimbGlobeMat.opacity = limbFade;
    lc.earthLimbGlobeMat.transparent = limbFade < 0.99;
    lc.earthLimbGlobeMat.depthWrite = limbFade >= 0.95;
    if (lc.earthLimb.visible) {
      const limbDist = Math.hypot(
        this.camera.position.x - lc.earthLimb.position.x,
        this.camera.position.y - lc.earthLimb.position.y,
        this.camera.position.z - lc.earthLimb.position.z
      );
      const orbitalRimBoost = limbFade * (0.72 + 0.28 * (1 - atmoDensityRatio));
      this.updateEarthShaderLayerUniforms(
        lc.earthLimbAtmo,
        lc.earthLimb.position,
        this.sunLight.position,
        limbDist,
        95,
        orbitalRimBoost
      );
      this.updateEarthShaderLayerUniforms(
        this.launchEarthFresnelRimMesh,
        lc.earthLimb.position,
        this.sunLight.position,
        limbDist,
        95,
        orbitalRimBoost
      );
    }

    // Sky transitions seamlessly via Rayleigh density decay from Florida twilight to orbital deep space
    const spaceFade = 1 - skyScatter;
    this.scratchColor.setHex(0x0b132b).lerp(new THREE.Color(0x020617), spaceFade);
    (this.scene.background as THREE.Color).copy(this.scratchColor);

    const targetPitchRad = L.orbitReached ? Math.PI / 2 : (L.pitchDeg * Math.PI) / 180;
    this.launchPitchVisualRad +=
      (targetPitchRad - this.launchPitchVisualRad) * (1 - Math.exp(-3.4 * dt));
    const sinP = Math.sin(this.launchPitchVisualRad);
    const cosP = Math.cos(this.launchPitchVisualRad);
    lc.rocketFull.position.set(tliPct * 6.5, liftY + tliPct * 1.4, 0);
    lc.rocketFull.rotation.set(0, 0, -this.launchPitchVisualRad);

    // World-space center of active stack & exhaust nozzle along rocket pitch vector
    const stackCenterLocalY = L.coreSeparated ? 20.4 : 12.2;
    const focusX = lc.rocketFull.position.x + stackCenterLocalY * sinP;
    const focusY = lc.rocketFull.position.y + stackCenterLocalY * cosP;
    const nozzleLocalY = L.coreSeparated ? 17.22 : -0.2;
    const nozzleX = lc.rocketFull.position.x + nozzleLocalY * sinP;
    const nozzleY = lc.rocketFull.position.y + nozzleLocalY * cosP;
    const exDirX = -sinP;
    const exDirY = -cosP;

    // Align LEO circular orbit path cleanly through Orion's orbital altitude well above Earth's surface
    lc.leoOrbitRing.visible = L.orbitReached;
    if (lc.leoOrbitRing.visible) {
      lc.leoOrbitRing.position.copy(lc.earthLimb.position);
      const rOrbit = Math.hypot(
        focusX - lc.earthLimb.position.x,
        focusY - lc.earthLimb.position.y
      );
      lc.leoOrbitRing.scale.setScalar(Math.max(1.0, rOrbit / 108.5));
      (lc.leoOrbitRing.material as THREE.MeshBasicMaterial).opacity = 0.42 * (1 - tliPct * 0.65);
    }

    // Deploy Orion ESM X-wing solar arrays once LAS jettisons / orbital vacuum is reached
    const targetWingAngle = L.lasJettisoned || L.orbitReached ? -(Math.PI * 0.44) : 0;
    const wingBlend = 1 - Math.exp(-3.2 * dt);
    for (let i = 0; i < lc.esmSolarPivots.length; i++) {
      const p = lc.esmSolarPivots[i];
      p.rotation.x += (targetWingAngle - p.rotation.x) * wingBlend;
    }

    // Flame + trench fire + deluge steam cloud + Transonic Mach Cone + Vacuum Plume Expansion
    const tliBurning = Boolean(L.orbitReached && s.leoTransfer?.tliBurnActive);
    const thrusting = (L.ignited && L.throttle > 0.05 && L.fuelPct > 0 && !L.orbitReached) || tliBurning;
    const vacuumExpand = 1.0 + (1 - Math.max(0, atmoDensityRatio)) * 1.85;
    lc.flameGroup.visible = thrusting && !L.coreSeparated;
    lc.icpsFlame.visible = thrusting && L.coreSeparated;
    if (lc.icpsFlame.visible) {
      const flicker = 0.86 + Math.sin(elapsedSec * 38) * 0.16;
      lc.icpsFlame.scale.set(
        1.15,
        (tliBurning ? 1.32 : Math.max(0.55, L.throttle)) * flicker,
        1.15
      );
    }
    lc.rocketEngineGlow.position.set(0, nozzleLocalY - 1.2, 0);
    lc.rocketEngineGlow.color.setHex(L.coreSeparated ? 0x38bdf8 : 0xffb347);
    lc.rocketEngineGlow.intensity = thrusting ? (L.coreSeparated ? 4.4 : 9.2 * L.throttle) : 0;

    // RS-25 Shock Train / Mach Diamonds (Sea-Level Core Plume Shock Disks, fading out by 14 km)
    lc.machDiamondsGroup.visible = thrusting && !L.coreSeparated && alt < 14;
    if (lc.machDiamondsGroup.visible) {
      const diamondFade = Math.max(0, 1 - alt / 14) * Math.min(1, L.throttle * 1.2);
      lc.machDiamondsGroup.children.forEach((ch) => {
        if ((ch as THREE.Mesh).material) {
          ((ch as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.92 * diamondFade;
        }
      });
    }

    // Transonic Prandtl-Glauert Condensation Vapour Cone (Mach 0.92 to 1.18)
    const machNum = L.machNumber ?? 0;
    const isTransonic =
      thrusting && !L.orbitReached && ((machNum >= 0.92 && machNum <= 1.18) || (alt >= 9 && alt <= 15));
    lc.machCone.visible = isTransonic;
    if (lc.machCone.visible) {
      const transonicPeak = 1 - Math.min(1, Math.abs(machNum - 1.02) / 0.16);
      const pulse = 0.94 + Math.sin(elapsedSec * 32) * 0.08;
      lc.machCone.scale.set(pulse * (1 + transonicPeak * 0.25), 1, pulse * (1 + transonicPeak * 0.25));
      if ((lc.machCone.material as THREE.MeshBasicMaterial)) {
        (lc.machCone.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.42 * transonicPeak);
      }
    }

    if (thrusting) {
      const flicker = 0.88 + Math.sin(elapsedSec * 46) * 0.16;
      lc.flameGroup.scale.set(
        vacuumExpand,
        Math.max(0.35, L.throttle) * flicker * (L.srbSeparated ? 0.78 : 1.22),
        vacuumExpand
      );
      lc.trenchLight.intensity = alt < 4 ? 12 * L.throttle : 0;

      if (!s.paused) {
        const emitCount = L.coreSeparated ? 3 : 4;
        for (let k = 0; k < emitCount; k++) {
          const speed = (L.coreSeparated ? 13 : 16) + Math.random() * 7;
          this.emitParticle(
            nozzleX + (Math.random() - 0.5) * 1.4,
            nozzleY + (Math.random() - 0.5) * 1.4,
            (Math.random() - 0.5) * 1.4,
            exDirX * speed + (Math.random() - 0.5) * 3.4,
            exDirY * speed + (Math.random() - 0.5) * 3.4,
            (Math.random() - 0.5) * 3.4,
            0.52,
            L.coreSeparated ? 0.35 : 1.0,
            L.coreSeparated ? 0.86 : 0.7,
            L.coreSeparated ? 1.0 : 0.24
          );
        }
        // Cryogenic ice / frost shedding from core LOX/LH2 tank during liftoff (alt 0 to 0.22 km)
        if (alt < 0.22 && alt > 0.01) {
          for (let k = 0; k < 3; k++) {
            const angle = Math.random() * Math.PI * 2;
            const r = 1.1 + Math.random() * 0.25;
            const frostH = liftY + 6 + Math.random() * 10;
            this.emitParticle(
              focusX + Math.cos(angle) * r,
              frostH,
              Math.sin(angle) * r,
              Math.cos(angle) * (0.8 + Math.random() * 1.2),
              -2.5 - Math.random() * 3.5,
              Math.sin(angle) * (0.8 + Math.random() * 1.2),
              0.45,
              0.96,
              0.98,
              1.0
            );
          }
        }
        // Billowing white sound-suppression deluge steam from flame trench during ignition & liftoff
        if (alt < 0.85) {
          for (let k = 0; k < 5; k++) {
            const side = k % 2 === 0 ? 1 : -1;
            this.emitParticle(
              (Math.random() - 0.5) * 3.4,
              1.1 - groundDrop + Math.random() * 1.4,
              side * (2.5 + Math.random() * 4.5),
              (Math.random() - 0.5) * 9.5,
              1.6 + Math.random() * 3.8,
              side * (6 + Math.random() * 10),
              1.2,
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

    // SRB separation physics visual + Booster Separation Motor (BSM) radial plume puffs
    if (L.srbSeparated) {
      if (this.srbDetachedTime < 0) this.srbDetachedTime = elapsedSec;
      const tSep = elapsedSec - this.srbDetachedTime;
      lc.srbLeft.visible = tSep < 4.8;
      lc.srbRight.visible = tSep < 4.8;
      lc.srbLeftBsm.visible = tSep < 1.15;
      lc.srbRightBsm.visible = tSep < 1.15;
      lc.srbLeft.position.set(-tSep * 4.6, -tSep * tSep * 3.1, -tSep * 0.6);
      lc.srbLeft.rotation.z = tSep * 0.52;
      lc.srbLeft.rotation.x = tSep * 0.14;
      lc.srbRight.position.set(tSep * 4.6, -tSep * tSep * 3.1, tSep * 0.6);
      lc.srbRight.rotation.z = -tSep * 0.52;
      lc.srbRight.rotation.x = -tSep * 0.14;

      if (!s.paused && tSep < 0.75) {
        for (const dir of [-1, 1]) {
          this.emitParticle(
            nozzleX + dir * (2.2 + tSep * 4.5) * cosP,
            nozzleY + 12.5 * cosP - tSep * 3,
            0,
            dir * 5.2 + (Math.random() - 0.5) * 2,
            2.2 + Math.random() * 2,
            (Math.random() - 0.5) * 2,
            0.55,
            1.0,
            0.78,
            0.28
          );
        }
      }
    } else {
      this.srbDetachedTime = -1;
      lc.srbLeft.visible = true;
      lc.srbRight.visible = true;
      lc.srbLeftBsm.visible = false;
      lc.srbRightBsm.visible = false;
      lc.srbLeft.position.set(0, 0, 0);
      lc.srbLeft.rotation.set(0, 0, 0);
      lc.srbRight.position.set(0, 0, 0);
      lc.srbRight.rotation.set(0, 0, 0);
    }

    // Core separation (MECO cutoff + downward tumble, keeping RS-25 engine cluster attached)
    if (L.coreSeparated) {
      if (this.coreDetachedTime < 0) this.coreDetachedTime = elapsedSec;
      const tCore = elapsedSec - this.coreDetachedTime;
      lc.coreGroup.visible = tCore < 4.5;
      lc.coreGroup.position.set(0, -tCore * tCore * 3.0, -tCore * 0.7);
      lc.coreGroup.rotation.z = tCore * 0.18;
      lc.rs25Group.visible = lc.coreGroup.visible;
      lc.rs25Group.position.copy(lc.coreGroup.position);
      lc.rs25Group.rotation.copy(lc.coreGroup.rotation);
    } else {
      this.coreDetachedTime = -1;
      lc.coreGroup.visible = true;
      lc.coreGroup.position.set(0, 0, 0);
      lc.coreGroup.rotation.set(0, 0, 0);
      lc.rs25Group.visible = true;
      lc.rs25Group.position.set(0, 0, 0);
      lc.rs25Group.rotation.set(0, 0, 0);
    }

    // LAS Tower Jettison Rocket-Away Animation
    if (L.lasJettisoned) {
      if (this.lasDetachedTime < 0) this.lasDetachedTime = elapsedSec;
      const tLas = elapsedSec - this.lasDetachedTime;
      lc.abortTower.visible = tLas < 2.2;
      lc.lasFlame.visible = tLas < 1.25;
      lc.abortTower.position.set(tLas * 1.6, 23.02 + tLas * 19.0, tLas * 0.9);
      lc.abortTower.rotation.z = -tLas * 0.34;
    } else {
      this.lasDetachedTime = -1;
      lc.abortTower.visible = true;
      lc.abortTower.position.set(0, 23.02, 0);
      lc.abortTower.rotation.set(0, 0, 0);
      lc.lasFlame.visible = false;
    }

    // Smooth camera tracking with continuous pad-to-ascent interpolation & camera mode support
    const reducedMotionActive = this.prefersReducedMotion || Boolean((s as any).reducedMotion);
    const maxAcousticShake = reducedMotionActive ? 0 : 0.06;
    const shakeAmp =
      thrusting && alt < 20 && !reducedMotionActive
        ? Math.min(maxAcousticShake, (alt < 2.2 ? 0.06 : 0.035) * Math.min(1, L.throttle * 1.2))
        : 0;
    const shakeX = shakeAmp > 0 ? Math.sin(elapsedSec * 52) * shakeAmp : 0;
    const shakeY = shakeAmp > 0 ? Math.cos(elapsedSec * 61) * shakeAmp * 0.7 : 0;
    if (s.userOrbitActive) {
      const dist = Math.min(90, Math.max(8, s.orbitDistance));
      this.camPosTarget.set(
        focusX + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist + shakeX,
        Math.max(1.2, focusY + Math.sin(s.orbitPitch) * dist + shakeY),
        Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
      );
      this.camLookTarget.set(focusX, focusY, 0);
    } else if (s.cameraMode === 'cockpit') {
      // Orion fairing / rocket hull camera looking along the vehicle & Earth horizon
      this.camPosTarget.set(
        focusX + sinP * 5.2 - cosP * 2.4 + shakeX * 0.5,
        focusY + cosP * 5.2 + sinP * 2.4 + shakeY * 0.5,
        4.2
      );
      this.camLookTarget.set(focusX - sinP * 12.0, focusY - cosP * 12.0, 0);
    } else if (s.cameraMode === 'overhead') {
      // Wide trajectory profile camera
      this.camPosTarget.set(focusX + 4.0, focusY + 6.5, 34.0);
      this.camLookTarget.set(focusX + sinP * 2.5, focusY, 0);
    } else if (L.orbitReached) {
      const pullBack = tliPct * 3.8;
      this.camPosTarget.set(
        focusX - (4.8 + pullBack),
        focusY + 2.3 + tliPct * 0.8,
        7.2 + pullBack * 0.65
      );
      this.camLookTarget.set(focusX + 0.35, focusY - 0.35, 0);
    } else {
      // Continuous smoothstep blend between Pad/Tower-Clear camera and Pitch-Tracking Ascent camera (zero hard cut)
      const blendRaw = Math.min(1, Math.max(0, (alt - 0.08) / 1.6));
      const blend = blendRaw * blendRaw * (3 - 2 * blendRaw);

      const padCamX = 12.5 + shakeX;
      const padCamY = Math.min(18.5, liftY + 6.2) + shakeY;
      const padCamZ = 23.5;
      const padLookX = focusX;
      const padLookY = Math.max(12.2, focusY - 0.6);

      const ascentDist = L.srbSeparated ? 19.5 : 22.5;
      const ascCamX = focusX - sinP * 9.5 + 10.5 + shakeX;
      const ascCamY = focusY - cosP * 3.5 + 5.2 + shakeY;
      const ascCamZ = ascentDist;
      const ascLookX = focusX + sinP * 2.2;
      const ascLookY = focusY + cosP * 1.4;

      this.camPosTarget.set(
        padCamX + (ascCamX - padCamX) * blend,
        padCamY + (ascCamY - padCamY) * blend,
        padCamZ + (ascCamZ - padCamZ) * blend
      );
      this.camLookTarget.set(
        padLookX + (ascLookX - padLookX) * blend,
        padLookY + (ascLookY - padLookY) * blend,
        0
      );
    }
    const camRate = s.userOrbitActive ? 11.0 : 6.4;
    this.camera.position.lerp(this.camPosTarget, 1 - Math.exp(-camRate * dt));
    this.camLookCurrent.lerp(this.camLookTarget, 1 - Math.exp(-(camRate + 1.0) * dt));
    this.camera.lookAt(this.camLookCurrent);
  }

  private syncSpaceScene(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const sp = s.space;
    const ss = this.solarSystem;
    (this.scene.background as THREE.Color).setHex(0x020617);
    // Let the Solar PointLight drive planetary day/night terminators while preserving subtle starlight fill
    this.ambientLight.color.setHex(0x64748b);
    this.ambientLight.groundColor.setHex(0x0f172a);
    this.ambientLight.intensity = 0.34;
    this.sunLight.color.setHex(0x93c5fd);
    this.sunLight.position.set(110, 85, 80);
    this.sunLight.intensity = 0.38;

    const bankTarget = s.input.left ? 0.32 : s.input.right ? -0.32 : 0;
    ss.shipGroup.position.set(sp.shipX, 0, sp.shipZ);
    ss.shipGroup.rotation.y = sp.headingRad;
    ss.shipGroup.rotation.x = 0;
    if (!s.crashFx.active) {
      ss.shipGroup.rotation.z += (bankTarget - ss.shipGroup.rotation.z) * Math.min(1, 8 * dt);
    }

    const atSpaceTarget =
      (sp.targetId === 'relay-orbit' && (sp.inSatDeployZone || sp.orbitalSat.linkLocked)) ||
      (sp.targetId === 'moon' && sp.arrivedMoon) ||
      (sp.targetId === 'gateway' && sp.arrivedGateway) ||
      (sp.targetId === 'mars' && sp.arrivedMars);
    const thrusting = (s.input.forward || (sp.autoPilot && !atSpaceTarget)) && sp.fuelPct > 0;
    ss.shipFlame.visible = thrusting;
    ss.shipPlumeInner.visible = thrusting;
    if (thrusting) {
      const fScale = (sp.boostActive ? 1.75 : 1.08) * (0.86 + Math.sin(elapsedSec * 40) * 0.16);
      ss.shipFlame.scale.set(1, fScale, 1);
      ss.shipPlumeInner.scale.set(1, fScale * 0.92, 1);
      if (!s.paused && Math.random() < 0.75) {
        const fwdX = Math.sin(sp.headingRad);
        const fwdZ = Math.cos(sp.headingRad);
        this.emitParticle(
          sp.shipX - fwdX * 2.15 + (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 0.25,
          sp.shipZ - fwdZ * 2.15 + (Math.random() - 0.5) * 0.25,
          -fwdX * (9.5 + Math.random() * 4.5) + (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.2,
          -fwdZ * (9.5 + Math.random() * 4.5) + (Math.random() - 0.5) * 1.2,
          0.42,
          0.32,
          0.86,
          1.0
        );
      }
    }

    // Wrap ambient micro-dust parallax volume smoothly around Orion when not planet-focused
    ss.spaceDust.visible = !s.focusedSolarBodyId;
    if (ss.spaceDust.visible) {
      const dustAttr = ss.spaceDust.geometry.attributes.position as THREE.BufferAttribute;
      const seeds = ss.spaceDustSeeds;
      const spanXZ = 56;
      const halfXZ = 28;
      const spanY = 24;
      const halfY = 12;
      for (let i = 0; i < seeds.length / 3; i++) {
        const relX = ((((seeds[i * 3] - sp.shipX + halfXZ) % spanXZ) + spanXZ) % spanXZ) - halfXZ;
        const relY = ((((seeds[i * 3 + 1] + halfY) % spanY) + spanY) % spanY) - halfY;
        const relZ = ((((seeds[i * 3 + 2] - sp.shipZ + halfXZ) % spanXZ) + spanXZ) % spanXZ) - halfXZ;
        dustAttr.setXYZ(i, sp.shipX + relX, relY, sp.shipZ + relZ);
      }
      dustAttr.needsUpdate = true;
    }

    ss.shipShieldShell.visible = sp.shieldBoostActive;
    if (sp.shieldBoostActive) {
      ss.shipShieldShell.rotation.y += dt * 1.4;
    }

    // Sync Modular Orbital Satellite: keep hidden until Orion actually deploys it; show staging ring beforehand
    const satState = sp.orbitalSat;
    ss.satellite.group.visible = satState.deployed;
    ss.relayStageRing.visible = !satState.deployed;
    if (ss.relayStageRing.visible) {
      ss.relayStageRing.rotation.y += dt * 0.9;
      ss.relayStageRing.scale.setScalar(1 + Math.sin(elapsedSec * 3.2) * 0.08);
    }
    ss.satellite.group.position.set(satState.satX, 0, satState.satZ);
    ss.satellite.group.rotation.y = (satState.rotationErrorDeg * Math.PI) / 180 + elapsedSec * (satState.linkLocked ? 0.08 : 0.65);
    const wingUnfold = satState.deployed ? Math.max(0.18, satState.solarDeployedPct / 100) : 0.12;
    ss.satellite.solarLeftPivot.scale.x = wingUnfold;
    ss.satellite.solarRightPivot.scale.x = wingUnfold;
    const umbrellaScale = 0.35 + 0.65 * wingUnfold;
    ss.satellite.umbrellaLeft.scale.setScalar(umbrellaScale);
    ss.satellite.umbrellaRight.scale.setScalar(umbrellaScale);
    ss.satellite.dishPivot.rotation.z = ((100 - satState.dishAlignedPct) / 100) * 0.55;
    ss.satellite.linkBeam.visible = satState.linkLocked;
    (ss.satellite.beaconMesh.material as THREE.MeshBasicMaterial).color.setHex(
      satState.linkLocked ? 0x34d399 : 0x38bdf8
    );

    const scaleMode: SolarScaleMode = s.solarScaleMode ?? 'exploration';
    const localAnchorId = s.localAnchorId ?? 'earth';
    const isSci = scaleMode === 'scientific';
    const isLocal = scaleMode === 'local';
    const epochYears = s.solarEpochYears ?? 0;
    const spaceCamMode: SpaceCameraMode = s.spaceCameraMode ?? 'track';

    // Rebuild 3D inclined elliptical orbit lines & asteroid belt matrices only when scaleMode or localAnchorId changes
    if (scaleMode !== this.lastSolarScaleMode || localAnchorId !== this.lastLocalAnchorId) {
      this.lastSolarScaleMode = scaleMode;
      this.lastLocalAnchorId = localAnchorId;

      Object.entries(ss.orbitLines).forEach(([bodyId, line]) => {
        if (isLocal) {
          line.visible = false;
          return;
        }
        line.visible = true;
        const samples = ss.orbitSamplesSI[bodyId];
        if (!samples || samples.length === 0) return;
        const attr = line.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < samples.length && i < attr.count; i++) {
          const pt = projectHeliocentricSIToScene(
            bodyId,
            samples[i],
            scaleMode,
            SOLAR_SUN_ORIGIN_X,
            SOLAR_SUN_ORIGIN_Z
          );
          attr.setXYZ(i, pt.x, pt.y, pt.z);
        }
        attr.needsUpdate = true;
      });

      const lunarAttr = ss.lunarOrbitLine.geometry.attributes.position as THREE.BufferAttribute;
      const zeroVec = { xM: 0, yM: 0, zM: 0 };
      for (let i = 0; i < ss.lunarOrbitSamplesSI.length && i < lunarAttr.count; i++) {
        const pt = projectHeliocentricSIToScene(
          'moon',
          ss.lunarOrbitSamplesSI[i],
          scaleMode,
          0,
          0,
          zeroVec,
          zeroVec
        );
        lunarAttr.setXYZ(i, pt.x, pt.y, pt.z);
      }
      lunarAttr.needsUpdate = true;
      ss.lunarOrbitLine.visible = !isLocal || localAnchorId === 'earth' || localAnchorId === 'moon';

      // Rebuild instanced Asteroid Belt geometry matrices to match exact AU scale
      if (isLocal) {
        ss.asteroidBelt.visible = false;
      } else {
        ss.asteroidBelt.visible = true;
        const seeds = ss.asteroidBeltSeeds;
        const beltCount = seeds.length / 4;
        for (let i = 0; i < beltCount; i++) {
          const aAu = seeds[i * 4];
          const angle = seeds[i * 4 + 1];
          const yRatio = seeds[i * 4 + 2];
          const sc = seeds[i * 4 + 3];
          const r = isSci
            ? aAu * SCIENTIFIC_UNITS_PER_AU
            : 60.5 + ((aAu - 2.1) / 1.2) * 12.0;
          const scMult = isSci ? 1.85 : 1.0;
          this.scratchBeltDummy.position.set(
            Math.cos(angle) * r,
            yRatio * r * (isSci ? 0.32 : 0.45),
            Math.sin(angle) * r
          );
          this.scratchBeltDummy.rotation.set(i * 0.7, i * 1.1, i * 0.4);
          this.scratchBeltDummy.scale.set(
            sc * scMult,
            sc * 0.75 * scMult,
            sc * 0.9 * scMult
          );
          this.scratchBeltDummy.updateMatrix();
          ss.asteroidBelt.setMatrixAt(i, this.scratchBeltDummy.matrix);
        }
        ss.asteroidBelt.instanceMatrix.needsUpdate = true;
      }
    }

    const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'earth')!;
    const sunSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === 'sun')!;
    const sunPos = computeKeplerBodyPosition(
      sunSpec,
      epochYears,
      scaleMode,
      SOLAR_SUN_ORIGIN_X,
      SOLAR_SUN_ORIGIN_Z,
      localAnchorId
    );
    const earthPos = computeKeplerBodyPosition(
      earthSpec,
      epochYears,
      scaleMode,
      SOLAR_SUN_ORIGIN_X,
      SOLAR_SUN_ORIGIN_Z,
      localAnchorId
    );
    const moonPos = getLiveSolarTargetPosition(
      'moon',
      epochYears,
      scaleMode,
      SOLAR_SUN_ORIGIN_X,
      SOLAR_SUN_ORIGIN_Z,
      localAnchorId
    );
    const relayPos = getLiveSolarTargetPosition(
      'relay-orbit',
      epochYears,
      scaleMode,
      SOLAR_SUN_ORIGIN_X,
      SOLAR_SUN_ORIGIN_Z,
      localAnchorId
    );
    const gatewayPos = getLiveSolarTargetPosition(
      'gateway',
      epochYears,
      scaleMode,
      SOLAR_SUN_ORIGIN_X,
      SOLAR_SUN_ORIGIN_Z,
      localAnchorId
    );
    const marsPos = getLiveSolarTargetPosition(
      'mars',
      epochYears,
      scaleMode,
      SOLAR_SUN_ORIGIN_X,
      SOLAR_SUN_ORIGIN_Z,
      localAnchorId
    );

    if (ss.extraBodies.earth) {
      ss.extraBodies.earth.position.set(earthPos.x, earthPos.y, earthPos.z);
    }
    if (ss.extraBodies.moon) {
      ss.extraBodies.moon.position.set(moonPos.x, moonPos.y, moonPos.z);
    }
    if (ss.extraBodies.mars) {
      ss.extraBodies.mars.position.set(marsPos.x, marsPos.y, marsPos.z);
    }
    ss.relayStageRing.position.set(relayPos.x, relayPos.y, relayPos.z);
    ss.relayStageRing.scale.setScalar(isSci ? 0.14 : isLocal ? 0.85 : 1.0);
    ss.gatewayGroup.position.set(gatewayPos.x, gatewayPos.y, gatewayPos.z);
    ss.gatewayGroup.scale.setScalar(isSci ? 0.06 : isLocal ? 0.42 : 0.45);
    const targetShipScale = isSci ? 0.012 : isLocal ? 0.032 : 0.048;
    ss.shipGroup.scale.setScalar(targetShipScale);

    // Sync transfer arc curves without per-frame allocations
    const updateArcLine = (
      line: THREE.Line,
      x0: number,
      y0: number,
      z0: number,
      cx: number,
      cy: number,
      cz: number,
      x1: number,
      y1: number,
      z1: number
    ) => {
      const attr = line.geometry.attributes.position as THREE.BufferAttribute;
      const count = attr.count;
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1);
        const omt = 1 - t;
        attr.setXYZ(
          i,
          omt * omt * x0 + 2 * omt * t * cx + t * t * x1,
          omt * omt * y0 + 2 * omt * t * cy + t * t * y1,
          omt * omt * z0 + 2 * omt * t * cz + t * t * z1
        );
      }
      attr.needsUpdate = true;
    };
    const arcLift = isSci ? 0.18 : 0.25;
    ss.transferArcs.earthMoon.visible = !isLocal || localAnchorId !== 'mars';
    ss.transferArcs.moonGateway.visible = !isLocal || localAnchorId !== 'mars';
    ss.transferArcs.gatewayMars.visible = !isLocal;
    updateArcLine(
      ss.transferArcs.earthMoon,
      earthPos.x,
      earthPos.y,
      earthPos.z,
      (earthPos.x + moonPos.x) * 0.5,
      (earthPos.y + moonPos.y) * 0.5 + arcLift,
      (earthPos.z + moonPos.z) * 0.5 + (isSci ? 0.3 : 1.5),
      moonPos.x,
      moonPos.y,
      moonPos.z
    );
    updateArcLine(
      ss.transferArcs.moonGateway,
      moonPos.x,
      moonPos.y,
      moonPos.z,
      (moonPos.x + gatewayPos.x) * 0.5,
      (moonPos.y + gatewayPos.y) * 0.5 + arcLift * 0.8,
      (moonPos.z + gatewayPos.z) * 0.5,
      gatewayPos.x,
      gatewayPos.y,
      gatewayPos.z
    );
    updateArcLine(
      ss.transferArcs.gatewayMars,
      gatewayPos.x,
      gatewayPos.y,
      gatewayPos.z,
      (gatewayPos.x + marsPos.x) * 0.5,
      (gatewayPos.y + marsPos.y) * 0.5 + (isSci ? 4.2 : 0.6),
      (gatewayPos.z + marsPos.z) * 0.5,
      marsPos.x,
      marsPos.y,
      marsPos.z
    );

    // Phobos sits inside Mars bodyScaleGroup at 2.76 Mars radii
    ss.marsPhobos.position.set(
      Math.cos(elapsedSec * 0.7) * 2.76,
      0.14,
      Math.sin(elapsedSec * 0.7) * 2.76
    );
    ss.gatewayGroup.rotation.y += dt * 0.045;

    // Position Sun & heliocentric lighting / belts
    this.sunOriginVec.set(sunPos.x, sunPos.y, sunPos.z);
    if (ss.bodyScaleGroups.sun) {
      ss.bodyScaleGroups.sun.position.copy(this.sunOriginVec);
      ss.bodyScaleGroups.sun.scale.setScalar(getBodyVisualRadiusUnits('sun', scaleMode));
    }
    ss.sunLight.position.copy(this.sunOriginVec);
    ss.sunLight.decay = isSci || isLocal ? 0.0 : 0.04;
    ss.sunOuterGlow.position.copy(this.sunOriginVec);
    const sunVisR = getBodyVisualRadiusUnits('sun', scaleMode);
    ss.sunCorona.scale.setScalar(1 + Math.sin(elapsedSec * 2.2) * 0.025);
    ss.sunOuterGlow.scale.set(sunVisR * 4.2, sunVisR * 4.2, 1);

    ss.asteroidBelt.position.copy(this.sunOriginVec);
    ss.asteroidBelt.rotation.y += dt * 0.004;
    ss.kuiperBelt.visible = !isLocal;
    ss.oortCloud.visible = !isLocal;
    ss.stormRing.visible = !isLocal;
    if (!isLocal) {
      ss.kuiperBelt.scale.setScalar(isSci ? (38.0 * SCIENTIFIC_UNITS_PER_AU) / 160.0 : 1.0);
      ss.oortCloud.scale.setScalar(isSci ? (52.0 * SCIENTIFIC_UNITS_PER_AU) / 245.0 : 1.0);
      const stormScale = (isSci ? (0.42 * SCIENTIFIC_UNITS_PER_AU) / 21.0 : 1.0) * (s.donkiFlareActive ? 1.42 : 1.0);
      ss.stormRing.scale.setScalar(stormScale + Math.sin(elapsedSec * 2.5) * 0.025);
      (ss.stormRing.material as THREE.MeshBasicMaterial).opacity = s.donkiFlareActive ? 0.36 : 0.11;
    }

    // Atmosphere Sun alignment
    this.scratchAtmoVec.set(earthPos.x, earthPos.y, earthPos.z);
    updateAtmosphereSunDirection(
      ss.earthAtmo,
      this.scratchAtmoVec,
      this.sunOriginVec,
      this.scratchVec
    );
    updateAtmosphereSunDirection(
      ss.earthNight,
      this.scratchAtmoVec,
      this.sunOriginVec,
      this.scratchVec
    );
    this.scratchAtmoVec.set(marsPos.x, marsPos.y, marsPos.z);
    updateAtmosphereSunDirection(
      ss.marsAtmo,
      this.scratchAtmoVec,
      this.sunOriginVec,
      this.scratchVec
    );

    const navSpec = sp.navBodyId ? SOLAR_SYSTEM_BODIES.find((b) => b.id === sp.navBodyId) : undefined;
    const navPos = navSpec
      ? computeKeplerBodyPosition(
          navSpec,
          epochYears,
          scaleMode,
          SOLAR_SUN_ORIGIN_X,
          SOLAR_SUN_ORIGIN_Z,
          localAnchorId
        )
      : null;
    const liveTarget = getLiveSolarTargetPosition(
      sp.targetId,
      epochYears,
      scaleMode,
      SOLAR_SUN_ORIGIN_X,
      SOLAR_SUN_ORIGIN_Z,
      localAnchorId
    );
    const beaconX = navPos ? navPos.x : liveTarget.x;
    const beaconY = navPos ? navPos.y : liveTarget.y;
    const beaconZ = navPos ? navPos.z : liveTarget.z;
    const beaconRadius = getBodyVisualRadiusUnits(
      navSpec ? navSpec.id : sp.targetId === 'mars' ? 'mars' : 'moon',
      scaleMode
    );

    ss.targetBeacon.position.set(beaconX, beaconY, beaconZ);
    ss.targetBeacon.scale.setScalar(
      Math.max(0.03, beaconRadius / 3.2) * (1 + Math.sin(elapsedSec * 4) * 0.06)
    );
    const showNavLine = !s.freeExploreMode || Boolean(navSpec);
    ss.targetBeacon.visible = showNavLine;
    ss.courseLine.visible = showNavLine;

    // Position Orion & live course line
    const shipY = 0;
    ss.shipGroup.position.set(sp.shipX, shipY, sp.shipZ);
    const posAttr = ss.courseLine.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.setXYZ(0, sp.shipX, shipY, sp.shipZ);
    posAttr.setXYZ(1, beaconX, beaconY, beaconZ);
    posAttr.needsUpdate = true;

    // Tactical navigation beacon for Orion when zoomed out
    const shipDistToCam = this.camera.position.distanceTo(ss.shipGroup.position);
    const showShipBeacon = shipDistToCam > 6.0;
    ss.shipBeacon.visible = showShipBeacon;
    if (showShipBeacon) {
      ss.shipBeacon.position.copy(ss.shipGroup.position);
      ss.shipBeacon.scale.setScalar(Math.max(0.35, shipDistToCam * 0.04));
      ss.shipBeacon.quaternion.copy(this.camera.quaternion);
    }

    // Update all Solar System bodies: 3D Keplerian coordinates + physical radius scale + sidereal rotation
    let hasFocus = false;
    let focusRadius = 4.5;
    SOLAR_SYSTEM_BODIES.forEach((b) => {
      const siEntry = PLANETARY_CATALOG_SI[b.id];
      const scaleGrp = ss.bodyScaleGroups[b.id];
      const visRadius = getBodyVisualRadiusUnits(b.id, scaleMode);
      if (scaleGrp) {
        scaleGrp.scale.setScalar(visRadius);
      }

      // Spin along tilted polar axis (prograde vs retrograde via signed siderealRotationPeriodS)
      const spinMesh = ss.planetSpinMeshes[b.id];
      if (spinMesh && siEntry && siEntry.siderealRotationPeriodS !== 0) {
        const periodDays = siEntry.siderealRotationPeriodS / 86400;
        const spinRate =
          Math.sign(periodDays) * Math.min(0.65, Math.max(0.015, 0.42 / Math.abs(periodDays)));
        spinMesh.rotation.y += dt * spinRate * 0.22;
        if (b.id === 'earth') {
          ss.earthClouds.rotation.y += dt * spinRate * 0.28;
        }
      }

      if (b.id === 'sun') {
        if (s.focusedSolarBodyId === 'sun') {
          this.scratchFocusVec.set(sunPos.x, sunPos.y, sunPos.z);
          hasFocus = true;
          focusRadius = visRadius;
        }
        return;
      }

      const orbitLine = ss.orbitLines[b.id];
      if (orbitLine && !isLocal) {
        const rMat = orbitLine.material as THREE.LineBasicMaterial;
        const baseOp = typeof orbitLine.userData.baseOpacity === 'number' ? orbitLine.userData.baseOpacity : 0.28;
        rMat.opacity = s.focusedSolarBodyId === b.id ? Math.min(0.82, baseOp + 0.36) : baseOp;
      }
      if (b.id === 'moon') {
        (ss.lunarOrbitLine.material as THREE.LineBasicMaterial).opacity =
          s.focusedSolarBodyId === 'moon' || s.focusedSolarBodyId === 'earth' ? 0.72 : 0.42;
      }

      const bodyObj = ss.extraBodies[b.id];
      if (!bodyObj) return;

      const pos = computeKeplerBodyPosition(
        b,
        epochYears,
        scaleMode,
        SOLAR_SUN_ORIGIN_X,
        SOLAR_SUN_ORIGIN_Z,
        localAnchorId
      );
      bodyObj.position.set(pos.x, pos.y, pos.z);

      if (isLocal) {
        const distFromAnchorLocal = Math.hypot(pos.x, pos.y, pos.z);
        bodyObj.visible = distFromAnchorLocal < 12000;
      } else {
        bodyObj.visible = true;
      }

      if (b.id === 'halley') {
        const dxS = pos.x - sunPos.x;
        const dyS = pos.y - sunPos.y;
        const dzS = pos.z - sunPos.z;
        bodyObj.rotation.y = Math.atan2(dxS, dzS);
        bodyObj.rotation.x = Math.atan2(-dyS, Math.max(0.01, Math.hypot(dxS, dzS)));
      }

      if (s.focusedSolarBodyId === b.id) {
        this.scratchFocusVec.set(pos.x, pos.y, pos.z);
        hasFocus = true;
        focusRadius = visRadius;
      }
    });

    // Selection Halo Ring around focused body
    if (hasFocus && s.focusedSolarBodyId) {
      ss.selectionRing.visible = true;
      ss.selectionRing.position.copy(this.scratchFocusVec);
      ss.selectionRing.scale.setScalar(focusRadius * (1.0 + Math.sin(elapsedSec * 2.6) * 0.025));
      ss.selectionRing.rotation.y += dt * 0.45;
    } else {
      ss.selectionRing.visible = false;
    }

    // Floating-Origin Camera-Relative Scene Shifting (prevents float32 jitter at 10^9+ km Scientific / Local scales)
    let originX = 0;
    let originY = 0;
    let originZ = 0;
    if (isSci || isLocal) {
      if (spaceCamMode === 'overview') {
        originX = isLocal ? 0 : SOLAR_SUN_ORIGIN_X;
        originY = 0;
        originZ = isLocal ? 0 : SOLAR_SUN_ORIGIN_Z;
      } else if (hasFocus) {
        originX = this.scratchFocusVec.x;
        originY = this.scratchFocusVec.y;
        originZ = this.scratchFocusVec.z;
      } else {
        originX = sp.shipX;
        originY = shipY;
        originZ = sp.shipZ;
      }
    }
    ss.group.position.set(-originX, -originY, -originZ);

    const focusCamSpaceX = this.scratchFocusVec.x - originX;
    const focusCamSpaceY = this.scratchFocusVec.y - originY;
    const focusCamSpaceZ = this.scratchFocusVec.z - originZ;
    const shipCamSpaceX = sp.shipX - originX;
    const shipCamSpaceY = shipY - originY;
    const shipCamSpaceZ = sp.shipZ - originZ;

    let activeDistForNear = 12;
    if (spaceCamMode === 'overview') {
      const ovDist = isSci
        ? Math.min(2800, Math.max(120, s.orbitDistance * 4.2))
        : isLocal
          ? Math.min(950, Math.max(40, s.orbitDistance * 2.2))
          : Math.min(340, Math.max(60, s.orbitDistance * 2.4));
      const ovTargetX = isSci || isLocal ? 0 : SOLAR_SUN_ORIGIN_X;
      const ovTargetZ = isSci || isLocal ? 0 : SOLAR_SUN_ORIGIN_Z;
      this.camPosTarget.set(
        ovTargetX + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * ovDist,
        Math.max(18, Math.sin(Math.max(0.38, s.orbitPitch)) * ovDist),
        ovTargetZ + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * ovDist
      );
      this.camLookTarget.set(ovTargetX, 0, ovTargetZ);
      activeDistForNear = ovDist;
    } else if ((spaceCamMode === 'focus' || (hasFocus && !s.userOrbitActive)) && hasFocus) {
      const minSafeDist = Math.max(isSci ? 0.025 : 2.6, focusRadius * 2.35);
      const maxSafeDist = isSci ? Math.max(24, focusRadius * 48) : 220;
      const rawDist = isSci && s.orbitDistance > focusRadius * 65 ? focusRadius * 5.2 : s.orbitDistance;
      const dist = Math.min(maxSafeDist, Math.max(minSafeDist, rawDist));
      this.camPosTarget.set(
        focusCamSpaceX + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist,
        focusCamSpaceY + Math.sin(s.orbitPitch) * dist + focusRadius * 0.25,
        focusCamSpaceZ + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist
      );
      this.camLookTarget.set(focusCamSpaceX, focusCamSpaceY, focusCamSpaceZ);
      activeDistForNear = dist;
    } else if (spaceCamMode === 'orbit' || spaceCamMode === 'free' || s.userOrbitActive) {
      const anchorX = hasFocus ? focusCamSpaceX : shipCamSpaceX;
      const anchorY = hasFocus ? focusCamSpaceY : shipCamSpaceY;
      const anchorZ = hasFocus ? focusCamSpaceZ : shipCamSpaceZ;
      const minSafeDist = hasFocus
        ? Math.max(isSci ? 0.022 : 2.2, focusRadius * 2.2)
        : isSci
          ? 0.25
          : 3.5;
      const maxSafeDist = isSci ? 900 : 280;
      const rawDist =
        isSci && !hasFocus && s.orbitDistance > 6
          ? 0.65
          : isSci && hasFocus && s.orbitDistance > focusRadius * 65
            ? focusRadius * 5.2
            : s.orbitDistance;
      const dist = Math.min(maxSafeDist, Math.max(minSafeDist, rawDist));
      const yaw =
        spaceCamMode === 'orbit' && !s.userOrbitActive ? s.orbitYaw + elapsedSec * 0.14 : s.orbitYaw;
      this.camPosTarget.set(
        anchorX + Math.sin(yaw) * Math.cos(s.orbitPitch) * dist,
        anchorY + Math.sin(s.orbitPitch) * dist,
        anchorZ + Math.cos(yaw) * Math.cos(s.orbitPitch) * dist
      );
      this.camLookTarget.set(anchorX, anchorY, anchorZ);
      activeDistForNear = dist;
    } else {
      // Hero 3/4 aft-quarter Orion chase camera scaled naturally for Exploration, Scientific & Local
      const fwdX = Math.sin(sp.headingRad);
      const fwdZ = Math.cos(sp.headingRad);
      const rightX = Math.cos(sp.headingRad);
      const rightZ = -Math.sin(sp.headingRad);
      const chBack = isSci ? 0.32 : isLocal ? 0.65 : 0.85;
      const chSide = isSci ? 0.08 : isLocal ? 0.16 : 0.20;
      const chUp = isSci ? 0.12 : isLocal ? 0.24 : 0.30;
      const chLook = isSci ? 0.18 : isLocal ? 0.36 : 0.45;
      this.camPosTarget.set(
        shipCamSpaceX - fwdX * chBack + rightX * chSide,
        shipCamSpaceY + chUp,
        shipCamSpaceZ - fwdZ * chBack + rightZ * chSide
      );
      this.camLookTarget.set(
        shipCamSpaceX + fwdX * chLook,
        shipCamSpaceY + (isSci ? 0.02 : 0.25),
        shipCamSpaceZ + fwdZ * chLook
      );
      activeDistForNear = chBack;
    }

    const desiredNear = Math.min(0.4, Math.max(0.002, activeDistForNear * 0.015));
    const desiredFar = 42000;
    if (Math.abs(desiredNear - this.camera.near) > 0.002 || Math.abs(desiredFar - this.camera.far) > 1) {
      this.camera.near = desiredNear;
      this.camera.far = desiredFar;
      this.camera.updateProjectionMatrix();
    }

    this.camera.position.lerp(this.camPosTarget, Math.min(1, 9.5 * dt));
    this.camLookCurrent.lerp(this.camLookTarget, Math.min(1, 10.5 * dt));
    this.camera.lookAt(this.camLookCurrent);

    // Update Earth's custom atmospheric scattering shader & separate Fresnel blue rim mesh layer
    const earthCamDist = Math.hypot(
      this.camera.position.x - (earthPos.x - originX),
      this.camera.position.y - (earthPos.y - originY),
      this.camera.position.z - (earthPos.z - originZ)
    );
    const earthVisR = getBodyVisualRadiusUnits('earth', scaleMode);
    this.scratchAtmoVec.set(earthPos.x, earthPos.y, earthPos.z);
    this.updateEarthShaderLayerUniforms(
      ss.earthAtmo,
      this.scratchAtmoVec,
      this.sunOriginVec,
      earthCamDist,
      earthVisR,
      1.0
    );
    this.updateEarthShaderLayerUniforms(
      this.solarEarthFresnelRimMesh,
      this.scratchAtmoVec,
      this.sunOriginVec,
      earthCamDist,
      earthVisR,
      1.0
    );

    // Keep starfield & deep-space nebula sky centered on active camera so sky never clips
    this.starField.position.copy(this.camera.position);
    ss.nebulaDome.position.set(
      this.camera.position.x + originX,
      this.camera.position.y + originY,
      this.camera.position.z + originZ
    );
  }

  private syncLunarScene(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const activePlanet: SurfacePlanet =
      s.phase === 'title' || s.phase === 'inspector' ? 'moon' : s.planet;
    this.lunarEnv.applyPlanet(activePlanet);

    // Mars Jezero dusty golden-amber sky & low sun vs Lunar deep black sky
    if (activePlanet === 'mars') {
      (this.scene.background as THREE.Color).setHex(0x9b4d2c);
      this.ambientLight.color.setHex(0xffcca0);
      this.ambientLight.groundColor.setHex(0x4e2112);
      this.ambientLight.intensity = 0.85;
      this.sunLight.color.setHex(0xffedd5);
      this.sunLight.position.set(112, 34, -84);
      this.sunLight.intensity = 3.1;
      this.starField.visible = false;
    } else {
      (this.scene.background as THREE.Color).setHex(0x020617);
      this.ambientLight.color.setHex(0x93c5fd);
      this.ambientLight.groundColor.setHex(0x1e293b);
      this.ambientLight.intensity = 0.58;
      this.sunLight.color.setHex(0xfffbeb);
      this.sunLight.position.set(112, 44, -76);
      this.sunLight.intensity = 3.05;
      this.starField.visible = true;
    }

    // Pulse grounded amber target rings for active uncompleted science sites
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
      const showRing = showObjectiveMarkers && !obj.completed;
      om.ring.visible = showRing;
      om.halo.visible = showRing;
      if (showRing) {
        const pulse = 1 + Math.sin(elapsedSec * 2.8 + idx) * 0.04;
        om.ring.scale.setScalar(pulse);
        om.halo.scale.setScalar(1 + Math.sin(elapsedSec * 2.8 + idx) * 0.08);
      }
    });

    // Showcase / Inspector Camera Modes
    this.lander.marsTrim.visible = activePlanet === 'mars';
    this.lander.landingSpot.intensity = 0;
    this.lander.rcsLeft.visible = false;
    this.lander.rcsRight.visible = false;
    this.lander.rcsFwd.visible = false;
    this.lander.rcsBack.visible = false;

    if (s.phase === 'title' || s.phase === 'inspector') {
      this.lander.group.position.set(0, 0.36, 0);
      this.lander.group.rotation.set(0, 0, 0);
      this.lander.flameMesh.visible = false;
      this.lander.engineLight.intensity = 0;
      this.lander.probes.forEach((p) => {
        p.position.y = 0.32;
        p.scale.y = 0.42;
      });

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

      if (s.phase === 'inspector') {
        const roverY = getSurfaceTerrainHeight('moon', rx, rz);
        const minCamFloor =
          s.showcase === 'rover' ? roverY + 0.55 : s.showcase === 'lander' ? 0.45 : 1.2;
        this.applyInspectorOrbitCamera(s, dt, focusX, focusY, focusZ, 2.8, 62, minCamFloor);
      } else if (s.phase === 'title' && !s.userOrbitActive) {
        const isOutpost = s.showcase === 'outpost';
        const angle = this.titleOrbitAngle;
        const rad = isOutpost ? 24.5 : s.showcase === 'rover' ? 7.5 : 11;
        const camX = focusX + Math.sin(angle) * rad;
        const camZ = focusZ + Math.cos(angle) * rad;
        const terrainFloor = getSurfaceTerrainHeight('moon', camX, camZ) + 1.4;
        const camY = Math.max(terrainFloor, focusY + 3.2 + Math.sin(angle * 0.5) * 0.45);
        const toCamX = camX - focusX;
        const toCamZ = camZ - focusZ;
        const len = Math.max(0.01, Math.hypot(toCamX, toCamZ));
        const rightX = toCamZ / len;
        const rightZ = -toCamX / len;
        const leftShift = isOutpost ? 5.2 : s.showcase === 'rover' ? 1.8 : 2.8;
        this.camPosTarget.set(camX, camY, camZ);
        this.camLookTarget.set(
          focusX - rightX * leftShift,
          focusY + (isOutpost ? 0.65 : 0),
          focusZ - rightZ * leftShift
        );
        this.camera.position.lerp(this.camPosTarget, 1 - Math.exp(-4.2 * dt));
        this.camLookCurrent.lerp(this.camLookTarget, 1 - Math.exp(-4.8 * dt));
        this.camera.lookAt(this.camLookCurrent);
      } else {
        const dist = Math.min(68, Math.max(3.2, s.orbitDistance));
        const camX = focusX + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
        const camZ = focusZ + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
        const floorY = getSurfaceTerrainHeight(activePlanet, camX, camZ) + 0.65;
        const camY = Math.max(floorY, focusY + Math.sin(s.orbitPitch) * dist);
        this.camPosTarget.set(camX, camY, camZ);
        this.camLookTarget.set(focusX, focusY, focusZ);
        const rate = s.phase === 'title' ? 1 - Math.exp(-12 * dt) : 1;
        this.camera.position.lerp(this.camPosTarget, rate);
        this.camLookCurrent.lerp(this.camLookTarget, rate);
        this.camera.lookAt(this.camLookCurrent);
      }
      return;
    }

    if (s.phase === 'briefing') {
      this.lander.group.position.set(0, 0.36, 0);
      this.lander.probes.forEach((p) => {
        p.position.y = 0.32;
        p.scale.y = 0.42;
      });
      this.roverModel.group.position.set(6, getSurfaceTerrainHeight(activePlanet, 6, 6), 6);
      if (s.userOrbitActive) {
        const dist = Math.min(68, Math.max(6, s.orbitDistance));
        const camX = -3 + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
        const camZ = -3 + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
        const floorY = getSurfaceTerrainHeight(activePlanet, camX, camZ) + 0.8;
        this.camera.position.set(camX, Math.max(floorY, 2.5 + Math.sin(s.orbitPitch) * dist), camZ);
        this.camera.lookAt(-3, 2.5, -3);
      } else {
        this.camera.position.set(16, 11, 22);
        this.camera.lookAt(-3, 2.5, -3);
      }
      return;
    }

    if (s.phase === 'landing' || (s.phase === 'gameover' && s.crashFx.kind === 'landing')) {
      this.syncLandingVisuals(s, dt, elapsedSec);
      return;
    }

    // Rover / Victory / Rover Gameover
    this.syncRoverVisuals(s, dt, elapsedSec);
  }

  private syncLandingVisuals(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const f = s.landing;
    const lm = this.lander;
    const zones = getLandingZones(f.planet);
    const zone = zones[f.targetZoneId] || zones[0];
    const gravity = f.planet === 'mars' ? PHYSICS.MARS_GRAVITY : PHYSICS.MOON_GRAVITY;

    const unstow = s.unstow;
    const groundY = getSurfaceTerrainHeight(f.planet, f.x, f.z);

    if (unstow?.active) {
      // Lander settles at touchdown spot; ramp unfolds and rover drives down ramp cleanly!
      lm.group.position.set(f.x, groundY + 0.36, f.z);
      lm.group.rotation.set(0, 0, 0);
      lm.flameMesh.visible = false;
      lm.engineLight.intensity = 0;
      lm.landingSpot.intensity = 1.6;
      lm.entryPlasmaCone.visible = false;
      lm.parachuteGroup.visible = false;
      lm.heatShieldDisk.visible = false;
      lm.skyCraneGroup.visible = false;
      lm.rampGroup.rotation.x = (unstow.rampDeployPct / 100) * 1.18;

      const rollT = unstow.roverRolloutPct / 100;
      const rx = f.x;
      const rz = f.z + 1.8 + rollT * 4.4;
      const ry = Math.max(getSurfaceTerrainHeight(f.planet, rx, rz), groundY + (1 - rollT) * 1.15);
      this.roverModel.group.position.set(rx, ry, rz);
      this.roverModel.group.rotation.set(rollT > 0.05 && rollT < 0.85 ? 0.25 : 0, 0, 0);
      this.roverModel.camHead.rotation.y = 0;
      this.roverModel.wheelModules.forEach((wm) => {
        wm.spin.rotation.x += rollT > 0.02 && rollT < 0.98 ? dt * 6 : 0;
      });
    } else {
      lm.rampGroup.rotation.x = 0;
      lm.group.position.set(f.x, f.y, f.z);
      lm.group.rotation.set((f.pitchDeg * Math.PI) / 180, 0, (f.rollDeg * Math.PI) / 180);

      // Mars 7-Min EDL Stage Visuals
      const edl = s.marsEdl;
      const marsEdlOn = f.planet === 'mars' && Boolean(edl?.active);
      lm.entryPlasmaCone.visible = marsEdlOn && edl?.stage === 'ENTRY_PLASMA';
      lm.heatShieldDisk.visible = marsEdlOn && !edl?.heatShieldDropped;
      lm.parachuteGroup.visible = marsEdlOn && Boolean(edl?.parachuteDeployed);
      lm.skyCraneGroup.visible = marsEdlOn && edl?.stage === 'SKY_CRANE';
      if (lm.skyCraneGroup.visible && edl) {
        const t = Math.max(0.1, edl.skyCraneLoweringPct / 100);
        lm.skyCraneCables.position.y = -t * 1.8;
        lm.skyCraneCables.scale.y = 0.4 + t * 1.8;
      }
    }

    lm.nozzleGroup.rotation.z = -(f.rollDeg * Math.PI) / 360;
    lm.nozzleGroup.rotation.x = (f.pitchDeg * Math.PI) / 360;

    const firing = f.throttle > 0.05 && f.fuelPct > 0 && !f.landed && !unstow?.active;
    const alt = Math.max(0, f.y - groundY);

    lm.flameMesh.visible = firing;
    lm.engineLight.intensity = firing ? 3.5 + f.throttle * 14 : 0;
    lm.landingSpot.intensity = unstow?.active ? 1.8 : !f.landed && alt < 44 ? 1.2 + (1 - alt / 44) * 3.8 : 0;
    lm.probes.forEach((p) => {
      if (f.landed) {
        p.position.y = 0.32;
        p.scale.y = 0.42;
      } else {
        p.position.y = -0.24;
        p.scale.y = 1.0;
      }
    });
    if (firing) {
      const flick = 0.9 + Math.sin(elapsedSec * 46) * 0.12;
      const outerMat = lm.flameMesh.material as THREE.MeshBasicMaterial;
      const innerMat = lm.flameInner.material as THREE.MeshBasicMaterial;
      const isMars = f.planet === 'mars';
      // NASA Vacuum Lunar Plume (wide under-expanded pale amber/cyan) vs Mars Mach-Diamond Plume
      outerMat.color.setHex(isMars ? 0xf97316 : 0xfdba74);
      outerMat.opacity = isMars ? 0.55 + f.throttle * 0.38 : 0.32 + f.throttle * 0.45;
      innerMat.color.setHex(isMars ? 0xfef08a : 0xe0f2fe);
      const radialSpread = isMars ? 0.52 + f.throttle * 0.45 : 0.78 + f.throttle * 0.72;
      const lengthScale = (0.35 + f.throttle * 1.15) * flick;
      lm.flameMesh.scale.set(radialSpread, lengthScale, radialSpread);
      lm.machDiamond.visible = isMars && f.throttle > 0.35;
      if (lm.machDiamond.visible) {
        lm.machDiamond.scale.set(0.85, 1.3 + f.throttle * 0.8, 0.85);
      }

      if (!s.paused) {
        this.emitParticle(
          f.x + (Math.random() - 0.5) * 0.65,
          f.y - 0.35,
          f.z + (Math.random() - 0.5) * 0.65,
          (Math.random() - 0.5) * (isMars ? 2.6 : 4.2),
          -4.5 - f.throttle * 4.5 - Math.random() * 2,
          (Math.random() - 0.5) * (isMars ? 2.6 : 4.2),
          0.34,
          isMars ? 0.98 : 0.95,
          isMars ? 0.58 : 0.82,
          isMars ? 0.22 : 0.48
        );

        // Plume-Surface Interaction (PSI): radial regolith dust sheet when firing below 18m
        if (alt < 18) {
          const psiIntensity = Math.min(1, ((18 - alt) / 18) * f.throttle * 1.35);
          const count = psiIntensity > 0.45 ? 3 : 1;
          for (let k = 0; k < count; k++) {
            const ang = Math.random() * Math.PI * 2;
            const spd = (5.5 + Math.random() * 7.5) * psiIntensity;
            this.emitParticle(
              f.x + Math.cos(ang) * 0.8,
              groundY + 0.35,
              f.z + Math.sin(ang) * 0.8,
              Math.cos(ang) * spd,
              0.9 + Math.random() * 1.6 * psiIntensity,
              Math.sin(ang) * spd,
              0.72,
              isMars ? 0.82 : 0.62,
              isMars ? 0.44 : 0.64,
              isMars ? 0.28 : 0.68
            );
          }
        }
      }
    }

    const rcsKillActive = !f.landed && Boolean(s.input.killDrift);
    const autoRollThr = f.guidanceMode === 'AUTOLAND' && Math.abs(f.rollDeg) > 2.2;
    const autoPitchThr = f.guidanceMode === 'AUTOLAND' && Math.abs(f.pitchDeg) > 2.2;
    lm.rcsLeft.visible = !f.landed && (s.input.right || (rcsKillActive && f.vx < -0.25) || (autoRollThr && f.rollDeg < -2.2));
    lm.rcsRight.visible = !f.landed && (s.input.left || (rcsKillActive && f.vx > 0.25) || (autoRollThr && f.rollDeg > 2.2));
    lm.rcsFwd.visible = !f.landed && (s.input.backward || (rcsKillActive && f.vz < -0.25) || (autoPitchThr && f.pitchDeg < -2.2));
    lm.rcsBack.visible = !f.landed && (s.input.tiltForward || (rcsKillActive && f.vz > 0.25) || (autoPitchThr && f.pitchDeg > 2.2));

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

    // Reset gates on fresh descent and align dynamically along active zone glideslope
    if (!f.landed && f.gatesPassed === 0) {
      this.lunarEnv.approachGates.forEach((gate) => {
        gate.passed = false;
      });
    }
    const zoneGround = getSurfaceTerrainHeight(f.planet, zone.x, zone.z);
    const entryY = f.planet === 'mars' ? 172 : 165;
    const gateT = [0.22, 0.44, 0.66, 0.85];
    this.lunarEnv.approachGates.forEach((gate, idx) => {
      const t = gateT[idx] ?? 0.5;
      const gx = zone.x * t;
      const gy = entryY * (1 - t) + (zoneGround + 8) * t;
      const gz = -36 * (1 - t) + zone.z * t;
      gate.group.visible = !f.landed;
      gate.group.position.set(gx, gy, gz);
      gate.group.lookAt(zone.x, zoneGround + 4, zone.z);

      const distGate = Math.hypot(
        f.x - gx,
        f.y - gy,
        f.z - gz
      );
      if (distGate < 10.5 && !gate.passed) {
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
    } else if (s.cameraMode === 'orbit' || s.userOrbitActive) {
      const dist = Math.min(82, Math.max(5.5, s.orbitDistance));
      const camX = f.x + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
      const camZ = f.z + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
      const floorY = getSurfaceTerrainHeight(f.planet, camX, camZ) + 0.85;
      this.camera.position.set(
        camX,
        Math.max(floorY, f.y + 2 + Math.sin(s.orbitPitch) * dist),
        camZ
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

    // Keep lander parked at actual touchdown pose (never teleporting back to (0,0) if landed elsewhere!)
    const lx = s.landedPose?.x ?? 0;
    const lz = s.landedPose?.z ?? 0;
    const ly = getSurfaceTerrainHeight(r.planet, lx, lz) + 0.36;
    this.lander.group.position.set(lx, ly, lz);
    this.lander.group.rotation.set(0, 0, 0);
    this.lander.rampGroup.rotation.x = 1.18;
    this.lander.entryPlasmaCone.visible = false;
    this.lander.parachuteGroup.visible = false;
    this.lander.heatShieldDisk.visible = false;
    this.lander.skyCraneGroup.visible = false;
    this.lander.flameMesh.visible = false;
    this.lander.engineLight.intensity = 0;
    this.lander.probes.forEach((p) => {
      p.position.y = 0.32;
      p.scale.y = 0.42;
    });

    const clearanceLift = r.highClearance || r.driveMode === 'WALKER' ? 0.34 : 0;
    rm.group.position.set(r.x, r.y + clearanceLift, r.z);
    rm.group.rotation.set(r.pitchRad, r.headingRad, r.rollRad);

    // Record persistent wheel track decals onto terrain when rover moves >0.85m
    if (s.phase === 'rover' && Math.hypot(r.x - this.lastTrackX, r.z - this.lastTrackZ) > 0.85) {
      this.lastTrackX = r.x;
      this.lastTrackZ = r.z;
      const rightX = Math.cos(r.headingRad) * 0.88;
      const rightZ = -Math.sin(r.headingRad) * 0.88;
      for (const side of [-1, 1]) {
        const tx = r.x + rightX * side;
        const tz = r.z + rightZ * side;
        const ty = getSurfaceTerrainHeight(r.planet, tx, tz) + 0.08;
        this.crashDummy.position.set(tx, ty, tz);
        this.crashDummy.rotation.set(-Math.PI / 2, 0, r.headingRad);
        this.crashDummy.scale.set(1, 1, 1);
        this.crashDummy.updateMatrix();
        this.lunarEnv.wheelTrackMesh.setMatrixAt(this.trackIdx, this.crashDummy.matrix);
        this.trackIdx = (this.trackIdx + 1) % 320;
      }
      this.lunarEnv.wheelTrackMesh.instanceMatrix.needsUpdate = true;
    }

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

    // Headlight, Mast Pan, Volumetric Beams, Comms Dish Sweep, Mast Strobe Beacon & Mars Dust Shading on Solar Array
    rm.camHead.rotation.y = s.mastPanRad ?? 0;
    rm.headlight.intensity = r.headlightsOn ? 44 : 0;
    rm.headlightBounce.intensity = r.headlightsOn ? 6.5 : 0;
    rm.headlightBeams.visible = r.headlightsOn;
    rm.headlampLensMat.color.setHex(r.headlightsOn ? 0xfef9c3 : 0x475569);
    rm.dish.rotation.y = Math.sin(elapsedSec * 0.7) * 0.25;
    const pulse = 0.55 + 0.55 * Math.max(0, Math.sin(elapsedSec * 5.2));
    rm.strobeMesh.scale.setScalar(pulse);
    this.scratchColor.setHex(0xbfe3ff).lerp(new THREE.Color(0xc27850), Math.min(1, r.dustAccumulationPct / 65));
    rm.panelMat.color.copy(this.scratchColor);

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

    // Regolith wheel dust plume when moving (planet-specific tint & gravity arc)
    if (!s.paused && Math.abs(r.speed) > 0.45 && Math.random() < 0.42) {
      const isMars = r.planet === 'mars';
      this.emitParticle(
        r.x - Math.sin(r.headingRad) * 1.15 + (Math.random() - 0.5) * 1.1,
        r.y + 0.18,
        r.z - Math.cos(r.headingRad) * 1.15 + (Math.random() - 0.5) * 1.1,
        (Math.random() - 0.5) * 0.9,
        0.55 + Math.random() * 0.55,
        (Math.random() - 0.5) * 0.9,
        isMars ? 0.85 : 0.46,
        isMars ? 0.78 : 0.65,
        isMars ? 0.42 : 0.68,
        isMars ? 0.28 : 0.74
      );
    }

    // Rover Camera Modes (close chase camera frames rover at ~15-20% viewport height; mouse orbit supported)
    const fwdX = Math.sin(r.headingRad);
    const fwdZ = Math.cos(r.headingRad);
    if (s.cameraMode === 'cockpit') {
      this.camera.position.set(r.x + fwdX * 0.65, r.y + 2.75 + clearanceLift, r.z + fwdZ * 0.65);
      this.camera.lookAt(r.x + fwdX * 16, r.y + 1.4, r.z + fwdZ * 16);
    } else if (s.cameraMode === 'overhead') {
      const zoomH = Math.min(68, Math.max(12, s.orbitDistance * 2.2));
      this.camera.position.set(r.x, r.y + zoomH, r.z + 4);
      this.camera.lookAt(r.x, r.y, r.z);
    } else if (s.cameraMode === 'orbit' || s.userOrbitActive) {
      const dist = Math.min(48, Math.max(3.2, s.orbitDistance));
      const camX = r.x + Math.sin(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
      const camZ = r.z + Math.cos(s.orbitYaw) * Math.cos(s.orbitPitch) * dist;
      const floorY = getSurfaceTerrainHeight(r.planet, camX, camZ) + 0.65;
      this.camera.position.set(
        camX,
        Math.max(floorY, r.y + 1.35 + Math.sin(s.orbitPitch) * dist),
        camZ
      );
      this.camera.lookAt(r.x, r.y + 1.0, r.z);
    } else {
      const dist = Math.min(24, Math.max(3.8, s.orbitDistance));
      const rightX = Math.cos(r.headingRad) * 0.72;
      const rightZ = -Math.sin(r.headingRad) * 0.72;
      this.camPosTarget.set(
        r.x - fwdX * dist + rightX,
        r.y + 1.58 + dist * 0.14 + clearanceLift,
        r.z - fwdZ * dist + rightZ
      );
      this.camLookTarget.set(r.x + fwdX * 5.2, r.y + 1.05, r.z + fwdZ * 5.2);
      this.camera.position.lerp(this.camPosTarget, Math.min(1, 7.5 * dt));
      this.camLookCurrent.lerp(this.camLookTarget, Math.min(1, 8.5 * dt));
      this.camera.lookAt(this.camLookCurrent);
    }
  }

  private syncCrashFxVisuals(s: SceneSimulationBridge, dt: number, elapsedSec: number) {
    const fx = s.crashFx;
    const cf = this.crashFxSys;

    if (!fx.active) {
      cf.group.visible = false;
      this.lander.descentStage.position.set(0, 0, 0);
      this.lander.descentStage.rotation.set(0, 0, 0);
      this.lander.ascentStage.position.set(0, 0, 0);
      this.lander.ascentStage.rotation.set(0, 0, 0);
      this.lander.legs.forEach((leg, idx) => {
        leg.position.set(0, 0, 0);
        leg.rotation.set(0, (idx * Math.PI) / 2, 0);
      });
      this.solarSystem.shipWingsGroup.position.set(0, 0, 0);
      this.solarSystem.shipWingsGroup.rotation.set(0, 0, 0);
      this.solarSystem.shipGroup.rotation.z = 0;
      this.roverModel.bodyGroup.position.set(0, 0, 0);
      this.roverModel.bodyGroup.rotation.set(0, 0, 0);
      return;
    }

    const t = Math.min(2.8, Math.max(0, fx.elapsed));
    cf.group.visible = true;
    cf.group.position.set(fx.x, fx.y, fx.z);

    // Expanding incandescent fireball & ground/plasma shockwave ring
    const fbScale = t < 0.32 ? 0.5 + (t / 0.32) * 3.6 : Math.max(0.01, 4.1 * Math.exp(-(t - 0.32) * 2.1));
    cf.fireball.scale.setScalar(fbScale);
    (cf.fireball.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.92 - t * 0.58);
    cf.fireball.visible = t < 1.65;

    const swScale = 0.65 + t * 9.8;
    cf.shockwave.scale.setScalar(swScale);
    (cf.shockwave.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.85 - t * 0.68);
    cf.shockwave.visible = t < 1.3;

    // 28 ballistic tumbling hull/foil debris shards (zero per-frame GC)
    const grav = fx.kind === 'space' ? 0.0 : fx.planet === 'mars' ? 3.72 : 1.62;
    for (let i = 0; i < cf.debrisSeeds.length; i++) {
      const d = cf.debrisSeeds[i];
      const py = fx.kind === 'space' ? d.vy * t * 0.55 : Math.max(-0.25, d.vy * t - 0.5 * grav * t * t);
      this.crashDummy.position.set(d.vx * t, py, d.vz * t);
      this.crashDummy.rotation.set(d.rx * t, d.ry * t, d.rz * t);
      this.crashDummy.scale.setScalar(d.scale);
      this.crashDummy.updateMatrix();
      cf.debrisMesh.setMatrixAt(i, this.crashDummy.matrix);
    }
    cf.debrisMesh.instanceMatrix.needsUpdate = true;

    // Structural vehicle breakup per crash type
    if (fx.kind === 'landing') {
      const lm = this.lander;
      lm.flameMesh.visible = false;
      lm.engineLight.intensity = 0;
      lm.landingSpot.intensity = 0;
      lm.rcsLeft.visible = false;
      lm.rcsRight.visible = false;
      lm.rcsFwd.visible = false;
      lm.rcsBack.visible = false;
      this.guideLine.visible = false;
      this.bullseyeRing.visible = false;
      this.predRing.visible = false;
      this.lunarEnv.trajectoryArc.visible = false;

      const legOpen = Math.min(1, t * 3.5);
      lm.legs.forEach((leg, idx) => {
        leg.rotation.set(-0.34 * legOpen, (idx * Math.PI) / 2, 0.14 * legOpen * (idx % 2 === 0 ? 1 : -1));
      });
      lm.descentStage.rotation.set(0.18 * legOpen, 0.12 * legOpen, -0.24 * legOpen);
      lm.ascentStage.position.set(
        t * 2.1,
        Math.max(-0.6, 5.2 * t - 0.5 * grav * t * t),
        -t * 1.3
      );
      lm.ascentStage.rotation.set(t * 2.0, t * 0.9, -t * 2.4);
    } else if (fx.kind === 'space') {
      const ss = this.solarSystem;
      ss.shipFlame.visible = false;
      ss.shipShieldShell.visible = false;
      ss.shipGroup.rotation.z = t * 1.9;
      ss.shipWingsGroup.position.set(t * 1.4, t * 0.8, -t * 1.1);
      ss.shipWingsGroup.rotation.set(t * 1.2, t * 1.7, -t * 2.1);
    } else if (fx.kind === 'rover') {
      const slump = Math.min(1, t * 2.6);
      this.roverModel.bodyGroup.position.y = -0.18 * slump;
      this.roverModel.bodyGroup.rotation.set(0.2 * slump, 0, 0.28 * slump);
      const blink = t % 0.22 < 0.11;
      this.roverModel.headlight.intensity = blink ? 22 : 0;
      this.roverModel.headlightBounce.intensity = blink ? 4 : 0;
      this.roverModel.headlightBeams.visible = blink;
    }

    // Smoke & incendiary ember particle plumes
    if (!s.paused && t < 1.55) {
      for (let k = 0; k < 3; k++) {
        const hot = Math.random() > 0.38;
        this.emitParticle(
          fx.x + (Math.random() - 0.5) * 2.0,
          fx.y + 0.5 + Math.random() * 1.2,
          fx.z + (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 7.5,
          2.8 + Math.random() * 6.5,
          (Math.random() - 0.5) * 7.5,
          0.95 + Math.random() * 0.55,
          hot ? 1.0 : 0.28,
          hot ? 0.52 : 0.26,
          hot ? 0.15 : 0.28
        );
      }
    }

    // Damped camera impact shake right on impact
    if (t < 1.15 && !s.paused && dt > 0) {
      const amp = (1.15 - t) * 0.42;
      this.camera.position.x += Math.sin(elapsedSec * 72) * amp;
      this.camera.position.y += Math.cos(elapsedSec * 84) * amp * 0.7;
    }
  }

  private updateEarthShaderLayerUniforms(
    mesh: THREE.Mesh,
    bodyPos: THREE.Vector3,
    sunPos: THREE.Vector3,
    cameraDistance: number,
    planetRadius: number,
    altitudeFade: number
  ) {
    const mat = mesh.material;
    if (!(mat instanceof THREE.ShaderMaterial)) return;
    if (mat.uniforms?.uSunDir) {
      this.scratchVec.subVectors(sunPos, bodyPos).normalize();
      mat.uniforms.uSunDir.value.copy(this.scratchVec);
    }
    if (mat.uniforms?.uCameraDistance) {
      mat.uniforms.uCameraDistance.value = cameraDistance;
    }
    if (mat.uniforms?.uPlanetRadius) {
      mat.uniforms.uPlanetRadius.value = planetRadius;
    }
    if (mat.uniforms?.uAltitudeFade) {
      mat.uniforms.uAltitudeFade.value = altitudeFade;
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
    this.planetMaps.dispose();
    this.envTarget.dispose();
    this.pmremGenerator.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
