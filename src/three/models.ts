import * as THREE from "three";
import {
  MARS_LANDING_ZONES,
  MARS_OBJECTIVES,
  MOON_LANDING_ZONES,
  MOON_OBJECTIVES,
  SOLAR_TARGETS,
} from "../game/constants";
import {
  SOLAR_SUN_ORIGIN_X,
  SOLAR_SUN_ORIGIN_Z,
  SOLAR_SYSTEM_BODIES,
  computeKeplerBodyPosition,
} from "../game/solarSystemData";
import { PLANETARY_CATALOG_SI } from "../game/planetaryCatalog";
import {
  EXPLORATION_VISUAL_LAYOUT,
  getBodyVisualRadiusUnits,
  projectHeliocentricSIToScene,
  sampleKeplerOrbitPointsSI,
} from "../game/orbitalMechanics";
import {
  getLunarTerrainHeight,
  getSurfaceTerrainHeight,
} from "../game/physics";
import type {
  RoverCollider,
  SpaceTargetId,
  SurfacePlanet,
} from "../game/types";
import {
  createEarthNightMaterial,
  createEarthSurfaceScatteringMaterial,
  createPlanetaryRingGeometry,
  createPlanetAtmosphereMaterial,
  type RealPlanetMaps,
} from "./planetMaps";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import type { ProceduralTextureSet } from "./textures";

let sharedDracoLoader: DRACOLoader | null = null;
function getSharedDracoLoader(): DRACOLoader | null {
  if (typeof window === "undefined") return null;
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath("/draco/");
  }
  return sharedDracoLoader;
}

export function getSharedGLTFLoader(): GLTFLoader | null {
  if (typeof window === "undefined") return null;
  const loader = new GLTFLoader();
  const draco = getSharedDracoLoader();
  if (draco) {
    loader.setDRACOLoader(draco);
  }
  return loader;
}

export function tagPart(
  obj: THREE.Object3D,
  partId: string,
  explodeAxisOverride?: [number, number, number],
) {
  obj.userData.explodePartId = partId;
  if (!obj.name) {
    obj.name = partId;
  }
  if (explodeAxisOverride) {
    obj.userData.explodeAxisOverride = explodeAxisOverride;
  }
  if (!obj.userData.basePos) {
    obj.userData.basePos = obj.position.clone();
  }
  obj.traverse((child) => {
    child.userData.partId = partId;
    if (!child.name) {
      child.name = partId;
    }
  });
}

const UP_AXIS = new THREE.Vector3(0, 1, 0);

function createStrutBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  rTop: number,
  rBot: number,
  mat: THREE.Material,
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = Math.max(0.001, dir.length());
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, len, 10),
    mat,
  );
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP_AXIS, dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

export interface LunarEnvironmentHandles {
  group: THREE.Group;
  terrainMesh: THREE.Mesh;
  colliders: RoverCollider[];
  moonColliders: RoverCollider[];
  marsColliders: RoverCollider[];
  applyPlanet: (planet: SurfacePlanet) => void;
  earthGroup: THREE.Group;
  earthGlobe: THREE.Mesh;
  earthClouds: THREE.Mesh;
  earthScatter: THREE.Mesh;
  earthAtmo: THREE.Mesh;
  marsDecorGroup: THREE.Group;
  padLight: THREE.PointLight;
  objectiveMeshes: Array<{
    id: string;
    planet: SurfacePlanet;
    group: THREE.Group;
    ring: THREE.Mesh;
    halo: THREE.Mesh;
  }>;
  landingZoneMeshes: Array<{
    id: number;
    planet: SurfacePlanet;
    group: THREE.Group;
    ring: THREE.Mesh;
    cyl: THREE.Mesh;
  }>;
  approachGates: Array<{
    group: THREE.Group;
    torus: THREE.Mesh;
    passed: boolean;
  }>;
  trajectoryArc: THREE.Line;
  habGroup: THREE.Group;
  kilopowerGroup: THREE.Group;
  wheelTrackMesh: THREE.InstancedMesh;
}

export function createLunarEnvironment(
  tex: ProceduralTextureSet,
  planetMaps: RealPlanetMaps,
): LunarEnvironmentHandles {
  const group = new THREE.Group();
  const moonColliders: RoverCollider[] = [];
  const marsColliders: RoverCollider[] = [];
  let activePlanet: SurfacePlanet = "moon";

  // 1. Earth in Lunar Sky (Real geographic map + cloud veil + Rayleigh blue rim shader)
  const earthGroup = new THREE.Group();
  earthGroup.position.set(-180, 130, -390);
  const earthGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(28, 48, 36),
    new THREE.MeshStandardMaterial({
      map: planetMaps.earthMap,
      roughness: 0.58,
      metalness: 0.06,
      envMapIntensity: 0.25,
    }),
  );
  earthGlobe.rotation.z = 0.41;
  earthGroup.add(earthGlobe);

  const earthClouds = new THREE.Mesh(
    new THREE.SphereGeometry(28.35, 44, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      alphaMap: planetMaps.earthCloudsMap,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      roughness: 0.92,
    }),
  );
  earthGroup.add(earthClouds);

  const earthScatter = new THREE.Mesh(
    new THREE.SphereGeometry(28.45, 44, 32),
    createEarthSurfaceScatteringMaterial(0.76),
  );
  earthGroup.add(earthScatter);

  const earthAtmo = new THREE.Mesh(
    new THREE.SphereGeometry(29.85, 40, 32),
    createPlanetAtmosphereMaterial({
      dayColor: 0x3b9eff,
      twilightColor: 0xfb923c,
      intensity: 1.08,
      power: 2.35,
      nightFloor: 0.14,
    }),
  );
  earthGroup.add(earthAtmo);
  group.add(earthGroup);

  // 2. Displaced Dual-Planet Surface Terrain (780m x 780m covering ±260m corridors)
  const terrainGeo = new THREE.PlaneGeometry(780, 780, 168, 168);
  terrainGeo.rotateX(-Math.PI / 2);

  const rebuildTerrainGeometry = (planet: SurfacePlanet) => {
    const posAttr = terrainGeo.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = getSurfaceTerrainHeight(planet, x, z);
      posAttr.setY(i, y);
      if (planet === "mars") {
        const shade = 0.78 + Math.min(0.2, Math.max(-0.18, y * 0.028));
        colors.push(shade, shade * 0.88, shade * 0.82);
      } else {
        const shade = 0.62 + Math.min(0.24, Math.max(-0.18, y * 0.03));
        colors.push(shade, shade + 0.01, shade + 0.03);
      }
    }
    posAttr.needsUpdate = true;
    terrainGeo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(colors, 3),
    );
    terrainGeo.computeVertexNormals();
  };
  rebuildTerrainGeometry("moon");

  const terrainMat = new THREE.MeshStandardMaterial({
    map: tex.moonAlbedo,
    bumpMap: tex.moonBump,
    bumpScale: 0.42,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.05,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  group.add(terrain);

  // 3. Artemis 30m Sintered Landing Pad with 'H' Marking (Blueprint Accurate)
  const padGroup = new THREE.Group();
  const padBase = new THREE.Mesh(
    new THREE.CylinderGeometry(9.2, 10.0, 0.36, 8),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.55,
      roughness: 0.45,
    }),
  );
  padBase.position.y = 0.18;
  padBase.receiveShadow = true;
  padGroup.add(padBase);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const padRing = new THREE.Mesh(
    new THREE.RingGeometry(6.2, 6.65, 36),
    ringMat,
  );
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.y = 0.385;
  padGroup.add(padRing);

  const padInner = new THREE.Mesh(
    new THREE.RingGeometry(2.8, 3.1, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide }),
  );
  padInner.rotation.x = -Math.PI / 2;
  padInner.position.y = 0.405;
  padGroup.add(padInner);

  // Landing Pad 'H' markings
  const hMat = new THREE.MeshBasicMaterial({
    color: 0xe2e8f0,
    side: THREE.DoubleSide,
  });
  const hBarL = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 2.8), hMat);
  hBarL.rotation.x = -Math.PI / 2;
  hBarL.position.set(-0.95, 0.425, 0);
  const hBarR = hBarL.clone();
  hBarR.position.x = 0.95;
  const hCross = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.45), hMat);
  hCross.rotation.x = -Math.PI / 2;
  hCross.position.set(0, 0.425, 0);
  padGroup.add(hBarL, hBarR, hCross);

  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.68, 8),
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        metalness: 0.7,
        roughness: 0.3,
      }),
    );
    bollard.position.set(Math.cos(a) * 8.6, 0.42, Math.sin(a) * 8.6);
    padGroup.add(bollard);

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x38bdf8 : 0xf59e0b }),
    );
    lamp.position.set(Math.cos(a) * 8.6, 0.84, Math.sin(a) * 8.6);
    padGroup.add(lamp);
  }
  const padLight = new THREE.PointLight(0x38bdf8, 2.2, 36);
  padLight.position.set(0, 2.8, 0);
  padGroup.add(padLight);
  group.add(padGroup);

  // 4. Artemis Base Camp Outpost (-15, 0, -13) — Blueprint Accurate (28m x 24m x 8.5m)
  const habGroup = new THREE.Group();
  habGroup.position.set(-15, 0, -13);

  const habCore = new THREE.Group();
  const hullWhite = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.45,
    metalness: 0.35,
  });
  const hullDark = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.55,
    metalness: 0.55,
  });
  const nasaBadgeMat = new THREE.MeshBasicMaterial({
    map: tex.nasaDecal,
    transparent: true,
  });

  // Lower Pressurized Foundation Collar
  const habBase = new THREE.Mesh(
    new THREE.CylinderGeometry(6.4, 7.1, 1.5, 12),
    hullDark,
  );
  habBase.position.y = 0.75;
  habBase.castShadow = true;
  habCore.add(habBase);

  const collarRing = new THREE.Mesh(
    new THREE.CylinderGeometry(6.1, 6.4, 0.85, 16),
    hullWhite,
  );
  collarRing.position.y = 1.9;
  habCore.add(collarRing);

  // Multi-deck Warm Interior Core visible inside Geodesic Dome
  const deck1 = new THREE.Mesh(
    new THREE.CylinderGeometry(4.5, 4.9, 0.28, 18),
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.55,
    }),
  );
  deck1.position.y = 2.32;
  const deck2 = new THREE.Mesh(
    new THREE.CylinderGeometry(3.25, 3.6, 0.22, 18),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.42,
    }),
  );
  deck2.position.y = 4.05;
  const centerCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.08, 4.5, 14),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.35,
    }),
  );
  centerCore.position.y = 3.85;
  const warmCoreLight = new THREE.PointLight(0xfbbf24, 3.4, 22, 1.4);
  warmCoreLight.position.set(0, 3.6, 0);
  const airlockCoolLight = new THREE.PointLight(0x38bdf8, 1.8, 18, 1.5);
  airlockCoolLight.position.set(9.6, 2.2, 0);
  habCore.add(deck1, deck2, centerCore, warmCoreLight, airlockCoolLight);

  // Geodesic Glass Dome + Titanium Geodesic Rib Frame
  const habDome = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 22, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.34,
      metalness: 0.45,
      roughness: 0.08,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.2,
    }),
  );
  habDome.position.y = 2.1;
  habCore.add(habDome);

  const domeCage = new THREE.Mesh(
    new THREE.SphereGeometry(5.66, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      wireframe: true,
      metalness: 0.85,
      roughness: 0.22,
    }),
  );
  domeCage.position.y = 2.1;
  habCore.add(domeCage);

  // Illuminated Cyan Equatorial Ring + Apex Cupola
  const eqGlowRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.05, 0.07, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
  );
  eqGlowRing.rotation.x = Math.PI / 2;
  eqGlowRing.position.y = 2.18;
  habCore.add(eqGlowRing);

  const cupola = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 1.1, 0.65, 12),
    hullWhite,
  );
  cupola.position.y = 7.0;
  habCore.add(cupola);

  // 4 Radial Pressurized Modules (Front Airlock, Lab, Storage, Rover Garage)
  const moduleAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  moduleAngles.forEach((ang, idx) => {
    const mod = new THREE.Group();
    mod.rotation.y = ang;

    const tunnel = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.35, 3.6, 16),
      hullWhite,
    );
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.set(7.4, 1.45, 0);
    tunnel.castShadow = true;
    mod.add(tunnel);

    const endCap = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.5, 0.45, 16),
      hullDark,
    );
    endCap.rotation.z = Math.PI / 2;
    endCap.position.set(9.2, 1.45, 0);
    mod.add(endCap);

    // Module side windows / bay door
    const bayLight = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.65),
      new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xfbbf24 : 0x38bdf8 }),
    );
    bayLight.rotation.y = Math.PI / 2;
    bayLight.position.set(9.44, 1.45, 0);
    mod.add(bayLight);

    // NASA meatball decal on pressurized module side
    const badge = new THREE.Mesh(
      new THREE.PlaneGeometry(1.0, 1.0),
      nasaBadgeMat,
    );
    badge.position.set(7.6, 1.55, 1.37);
    mod.add(badge);

    // Support legs beneath radial modules
    [-1.1, 1.1].forEach((lz) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8),
        hullDark,
      );
      leg.position.set(8.2, 0.6, lz);
      mod.add(leg);
    });

    habCore.add(mod);
  });

  // Exterior Cryo Supply Canisters & Equipment Crates beside Airlock
  const crateMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.45,
  });
  const cryoBlueMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.25,
    metalness: 0.65,
  });
  const cratePositions: Array<[number, number, number]> = [
    [6.8, 0.36, 4.6],
    [7.7, 0.36, 4.9],
    [4.6, 0.36, 7.6],
  ];
  cratePositions.forEach(([cx, cy, cz], i) => {
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.72, 0.85),
      crateMat,
    );
    crate.position.set(cx, cy, cz);
    crate.rotation.y = 0.28 + i * 0.4;
    crate.castShadow = true;
    habCore.add(crate);
  });
  const cryoCan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.38, 1.55, 14),
    cryoBlueMat,
  );
  cryoCan.position.set(7.9, 0.78, 3.6);
  cryoCan.castShadow = true;
  habCore.add(cryoCan);

  tagPart(habCore, "base-habitat");
  habGroup.add(habCore);

  // Twin Articulated Vertical Solar Power Towers (10m x 6m blueprint proportions)
  const solarGroup = new THREE.Group();
  [-4.2, 4.2].forEach((sz) => {
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.55, 1.1, 10),
      hullDark,
    );
    pedestal.position.set(-8.6, 0.55, sz);
    solarGroup.add(pedestal);

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 6.2, 10),
      hullWhite,
    );
    mast.position.set(-8.6, 4.1, sz);
    solarGroup.add(mast);

    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2.8), hullDark);
    yoke.position.set(-8.6, 6.8, sz);
    solarGroup.add(yoke);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 4.8, 2.8),
      new THREE.MeshStandardMaterial({
        map: tex.solarPanel,
        color: 0xffffff,
        metalness: 0.55,
        roughness: 0.18,
      }),
    );
    panel.position.set(-8.6, 6.8, sz);
    panel.rotation.z = 0.22;
    panel.castShadow = true;
    solarGroup.add(panel);
  });
  tagPart(solarGroup, "base-power");
  habGroup.add(solarGroup);

  // Deep Space Comms Antenna Tower
  const commsGroup = new THREE.Group();
  const dishPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 5.4, 10),
    hullWhite,
  );
  dishPole.position.set(-5.2, 3.8, -5.8);
  commsGroup.add(dishPole);

  const dishBowl = new THREE.Mesh(
    new THREE.SphereGeometry(1.65, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.65,
      roughness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  dishBowl.position.set(-5.2, 6.4, -5.8);
  dishBowl.rotation.x = Math.PI * 0.66;
  commsGroup.add(dishBowl);

  const feedHorn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.08, 1.1, 8),
    hullDark,
  );
  feedHorn.position.set(-5.2, 6.7, -5.2);
  feedHorn.rotation.x = Math.PI * 0.35;
  commsGroup.add(feedHorn);

  tagPart(commsGroup, "base-comms");
  habGroup.add(commsGroup);

  // Exterior ISRU / MOXIE Electrolysis Skid & Compacted Regolith Berm Arc
  const isruSkid = new THREE.Group();
  isruSkid.position.set(5.4, 0, -6.2);
  const skidBase = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.25, 2.2),
    hullDark,
  );
  skidBase.position.y = 0.125;
  isruSkid.add(skidBase);
  [-0.75, 0.75].forEach((tx, idx) => {
    const cryoTank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.44, 2.1, 14),
      idx === 0
        ? hullWhite
        : new THREE.MeshStandardMaterial({
            color: 0x38bdf8,
            metalness: 0.65,
            roughness: 0.25,
          }),
    );
    cryoTank.position.set(tx, 1.25, 0);
    cryoTank.castShadow = true;
    isruSkid.add(cryoTank);
  });
  isruSkid.add(
    createStrutBetween(
      new THREE.Vector3(-0.75, 1.95, 0),
      new THREE.Vector3(0.75, 1.95, 0),
      0.08,
      0.08,
      hullDark,
    ),
  );
  isruSkid.add(
    createStrutBetween(
      new THREE.Vector3(0, 0.5, 0.8),
      new THREE.Vector3(-2.6, 1.1, 3.2),
      0.07,
      0.07,
      hullWhite,
    ),
  );
  tagPart(isruSkid, "base-power");
  habGroup.add(isruSkid);

  // Hydroponic Greenhouse Pod connected on East Side + Rover Garage Canopy on South Side
  const greenhouseGroup = new THREE.Group();
  greenhouseGroup.position.set(0, 0, 10.6);
  const ghFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(3.1, 3.3, 0.4, 14),
    hullDark,
  );
  ghFloor.position.y = 0.2;
  greenhouseGroup.add(ghFloor);
  const ghPlants = new THREE.Mesh(
    new THREE.CylinderGeometry(2.3, 2.3, 0.45, 12),
    new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.35,
    }),
  );
  ghPlants.position.y = 0.62;
  greenhouseGroup.add(ghPlants);
  const ghShell = new THREE.Mesh(
    new THREE.SphereGeometry(2.85, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0xc4b5fd,
      emissive: 0x7c3aed,
      emissiveIntensity: 0.28,
      transparent: true,
      opacity: 0.48,
      roughness: 0.15,
    }),
  );
  ghShell.position.y = 0.4;
  greenhouseGroup.add(ghShell);
  tagPart(greenhouseGroup, "base-habitat");
  habGroup.add(greenhouseGroup);

  // Kilopower Compact Nuclear Fission Stirling Umbrella (toggleable backup power!)
  const kilopowerGroup = new THREE.Group();
  kilopowerGroup.position.set(-10.5, 0, 7.6);
  const kpBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.15, 0.45, 10),
    hullDark,
  );
  kpBase.position.y = 0.22;
  const kpCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 2.6, 12),
    new THREE.MeshStandardMaterial({
      map: tex.foilAlbedo,
      color: 0xfef08a,
      metalness: 0.85,
      roughness: 0.25,
    }),
  );
  kpCore.position.y = 1.5;
  const kpUmbrella = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 0.5, 0.16, 14),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.18,
      metalness: 0.6,
      roughness: 0.3,
    }),
  );
  kpUmbrella.position.y = 3.1;
  kilopowerGroup.add(kpBase, kpCore, kpUmbrella);
  tagPart(kilopowerGroup, "base-power");
  habGroup.add(kilopowerGroup);

  // Compacted Regolith Radiation Berm Arc (OSDR OSD-489 shelter wall)
  const bermGroup = new THREE.Group();
  const bermMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.94,
    metalness: 0.06,
    flatShading: true,
  });
  for (let b = 0; b < 7; b++) {
    const ang = -Math.PI * 0.85 + (b / 6) * Math.PI * 0.7;
    const mound = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.9, 1.85, 6),
      bermMat,
    );
    mound.position.set(Math.cos(ang) * 10.6, 0.8, Math.sin(ang) * 10.6);
    mound.rotation.y = ang;
    mound.castShadow = true;
    mound.receiveShadow = true;
    bermGroup.add(mound);
  }
  tagPart(bermGroup, "base-habitat");
  habGroup.add(bermGroup);

  group.add(habGroup);
  moonColliders.push({
    x: -15,
    z: -13,
    r: 9.6,
    type: "habitat",
    label: "Artemis Base Camp",
  });
  marsColliders.push({
    x: -15,
    z: -13,
    r: 9.6,
    type: "habitat",
    label: "Jezero Base & MOXIE",
  });

  // Persistent Wheel Track InstancedMesh (320 tread prints left behind moving rover)
  const wheelTrackMesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.32, 0.72),
    new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    }),
    320,
  );
  wheelTrackMesh.frustumCulled = false;
  const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < 320; i++) wheelTrackMesh.setMatrixAt(i, zeroMat);
  wheelTrackMesh.instanceMatrix.needsUpdate = true;
  group.add(wheelTrackMesh);

  // 4b. Mars Jezero Crater Distant Layered Ridges & Horizon Rim Outcrops (visible only on Mars)
  const marsDecorGroup = new THREE.Group();
  marsDecorGroup.visible = false;
  const ridgeMat = new THREE.MeshStandardMaterial({
    map: tex.marsAlbedo,
    bumpMap: tex.marsBump,
    bumpScale: 0.65,
    color: 0xc2653b,
    roughness: 0.94,
    metalness: 0.03,
  });

  const makeDisplacedOutcropGeo = (
    rx: number,
    ry: number,
    rz: number,
    seed: number,
  ) => {
    const geo = new THREE.IcosahedronGeometry(1, 3);
    const pos = geo.attributes.position;
    for (let vi = 0; vi < pos.count; vi++) {
      const vx = pos.getX(vi);
      const vy = pos.getY(vi);
      const vz = pos.getZ(vi);
      const strata = Math.sin(vy * 9.0 + seed) * 0.08;
      const crag =
        Math.sin(vx * 4.3 + seed * 1.7) *
          Math.cos(vz * 3.9 - seed * 0.9) *
          0.22 +
        strata;
      const flatTop = vy > 0.35 ? 0.58 + (vy - 0.35) * 0.22 : 1.0;
      pos.setXYZ(
        vi,
        vx * rx * (1 + crag),
        vy * ry * flatTop * (1 + crag * 0.5),
        vz * rz * (1 + crag),
      );
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };

  // Organic rocky crater-rim ridges around far perimeter (no oversized blocky polygon frustums)
  for (let rIdx = 0; rIdx < 16; rIdx++) {
    const ang = (rIdx / 16) * Math.PI * 2 + 0.14;
    const dist = 285 + (rIdx % 3) * 28;
    const rx = Math.cos(ang) * dist;
    const rz = Math.sin(ang) * dist;
    const widthX = 36 + (rIdx % 4) * 14;
    const heightY = 14 + (rIdx % 3) * 8;
    const depthZ = 24 + ((rIdx + 1) % 3) * 10;
    const outcrop = new THREE.Mesh(
      makeDisplacedOutcropGeo(widthX, heightY, depthZ, rIdx + 1),
      ridgeMat,
    );
    outcrop.position.set(
      rx,
      getSurfaceTerrainHeight("mars", rx, rz) + heightY * 0.24,
      rz,
    );
    outcrop.rotation.y = ang + Math.PI * 0.5;
    outcrop.castShadow = true;
    outcrop.receiveShadow = true;
    marsDecorGroup.add(outcrop);
  }

  // Distant Phobos orbital speck in Mars sky
  const phobos = new THREE.Mesh(
    new THREE.DodecahedronGeometry(3.0, 1),
    new THREE.MeshStandardMaterial({ color: 0xa8a29e, roughness: 0.92 }),
  );
  phobos.position.set(160, 118, -320);
  marsDecorGroup.add(phobos);
  group.add(marsDecorGroup);

  // 5. Instanced Organic Craggy Boulders & Gravel Pebbles (expanded across ±260m corridors)
  const allStations = [...MOON_OBJECTIVES, ...MARS_OBJECTIVES];
  const allLandingZones = [...MOON_LANDING_ZONES, ...MARS_LANDING_ZONES];
  const boulderSpecs: Array<{
    x: number;
    yMoon: number;
    yMars: number;
    z: number;
    s: number;
    rot: number;
  }> = [];
  for (let i = 0; i < 142; i++) {
    const angle = i * 2.39996;
    const dist = 20 + i * 1.65;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const nearObj = allStations.some(
      (o) => Math.hypot(rx - o.x, rz - o.z) < 9.5,
    );
    const nearPad = allLandingZones.some(
      (lz) => Math.hypot(rx - lz.x, rz - lz.z) < lz.radius + 4.0,
    );
    const nearHab = Math.hypot(rx + 15, rz + 13) < 14;
    if (nearObj || nearPad || nearHab) continue;

    const yMoon = getSurfaceTerrainHeight("moon", rx, rz);
    const yMars = getSurfaceTerrainHeight("mars", rx, rz);
    const s = 0.45 + (i % 7) * 0.26;
    boulderSpecs.push({ x: rx, yMoon, yMars, z: rz, s, rot: i * 0.7 });
    // Physical collider radius matches the rendered mesh horizontal scale: s * 1.28
    const r = Math.round(s * 1.28 * 1000) / 1000;
    const c: RoverCollider = {
      x: rx,
      z: rz,
      r,
      type: "rock",
      label: "Surface Boulder",
    };
    moonColliders.push(c);
    marsColliders.push({ ...c, label: "Basalt Boulder" });
  }

  // Craggy deterministic vertex displacement on rock geometry
  const rockGeo = new THREE.IcosahedronGeometry(1.0, 2);
  const rockPos = rockGeo.attributes.position;
  for (let vi = 0; vi < rockPos.count; vi++) {
    const vx = rockPos.getX(vi);
    const vy = rockPos.getY(vi);
    const vz = rockPos.getZ(vi);
    const ridgeNoise =
      Math.sin(vx * 3.7 + vz * 2.1) * 0.18 +
      Math.cos(vy * 4.5 - vx * 2.9) * 0.14 +
      Math.sin((vx + vy + vz) * 6.2) * 0.08;
    const scale = 1.0 + ridgeNoise;
    const flat = vy < -0.2 ? 0.65 : 1.0;
    rockPos.setXYZ(vi, vx * scale, vy * scale * flat, vz * scale);
  }
  rockPos.needsUpdate = true;
  rockGeo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    map: tex.moonAlbedo,
    bumpMap: tex.moonBump,
    bumpScale: 0.35,
    color: 0xffffff,
    roughness: 0.93,
    metalness: 0.04,
  });
  const boulderInstanced = new THREE.InstancedMesh(
    rockGeo,
    rockMat,
    boulderSpecs.length,
  );
  boulderInstanced.castShadow = true;
  boulderInstanced.receiveShadow = true;

  // Fine surface gravel/cobble scatter (non-colliding atmosphere detail)
  const pebbleSpecs: Array<{
    x: number;
    yMoon: number;
    yMars: number;
    z: number;
    s: number;
    rot: number;
  }> = [];
  for (let pi = 0; pi < 260; pi++) {
    const ang = pi * 2.39996 + 0.55;
    const dist = 7 + pi * 0.92;
    const px = Math.cos(ang) * dist;
    const pz = Math.sin(ang) * dist;
    if (Math.hypot(px, pz) < 6) continue;
    pebbleSpecs.push({
      x: px,
      yMoon: getSurfaceTerrainHeight("moon", px, pz),
      yMars: getSurfaceTerrainHeight("mars", px, pz),
      z: pz,
      s: 0.12 + (pi % 5) * 0.06,
      rot: pi * 1.17,
    });
  }
  const pebbleInstanced = new THREE.InstancedMesh(
    rockGeo,
    rockMat,
    pebbleSpecs.length,
  );
  pebbleInstanced.receiveShadow = true;

  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  const updateBouldersForPlanet = (planet: SurfacePlanet) => {
    boulderSpecs.forEach((b, idx) => {
      const y = planet === "mars" ? b.yMars : b.yMoon;
      dummy.position.set(b.x, y + b.s * 0.22, b.z);
      dummy.rotation.set(b.rot * 0.4, b.rot * 1.3, b.rot * 0.25);
      dummy.scale.set(b.s * 1.28, b.s * 0.72, b.s * 1.08);
      dummy.updateMatrix();
      boulderInstanced.setMatrixAt(idx, dummy.matrix);
      const tone = 0.72 + (idx % 5) * 0.06;
      if (planet === "mars") {
        tint.setRGB(tone * 1.02, tone * 0.52, tone * 0.36);
      } else {
        tint.setRGB(tone, tone, tone + 0.03);
      }
      boulderInstanced.setColorAt(idx, tint);
    });
    boulderInstanced.instanceMatrix.needsUpdate = true;
    if (boulderInstanced.instanceColor)
      boulderInstanced.instanceColor.needsUpdate = true;

    pebbleSpecs.forEach((p, idx) => {
      const y = planet === "mars" ? p.yMars : p.yMoon;
      dummy.position.set(p.x, y + p.s * 0.16, p.z);
      dummy.rotation.set(p.rot * 0.5, p.rot * 1.7, p.rot * 0.3);
      dummy.scale.set(p.s * 1.35, p.s * 0.6, p.s * 1.1);
      dummy.updateMatrix();
      pebbleInstanced.setMatrixAt(idx, dummy.matrix);
      const tone = 0.68 + (idx % 4) * 0.07;
      if (planet === "mars") {
        tint.setRGB(tone * 0.98, tone * 0.48, tone * 0.34);
      } else {
        tint.setRGB(tone, tone, tone + 0.02);
      }
      pebbleInstanced.setColorAt(idx, tint);
    });
    pebbleInstanced.instanceMatrix.needsUpdate = true;
    if (pebbleInstanced.instanceColor)
      pebbleInstanced.instanceColor.needsUpdate = true;

    rockMat.map = planet === "mars" ? tex.marsAlbedo : tex.moonAlbedo;
    rockMat.bumpMap = planet === "mars" ? tex.marsBump : tex.moonBump;
    rockMat.needsUpdate = true;
  };
  updateBouldersForPlanet("moon");
  boulderInstanced.computeBoundingSphere();
  pebbleInstanced.computeBoundingSphere();
  group.add(boulderInstanced);
  group.add(pebbleInstanced);

  // 6. Grounded NASA Hardware Science Stations + Amber Ground Target Rings (Zero Floating Crystals/Beams)
  const objectiveMeshes: LunarEnvironmentHandles["objectiveMeshes"] = [];
  const stationMetalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.72,
    roughness: 0.28,
  });
  const stationDarkMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.55,
    roughness: 0.45,
  });
  const stationGoldMat = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    color: 0xfbbf24,
    metalness: 0.84,
    roughness: 0.26,
  });

  allStations.forEach((obj) => {
    const g = new THREE.Group();
    const ty = getSurfaceTerrainHeight(obj.planet, obj.x, obj.z);
    g.position.set(obj.x, ty, obj.z);
    g.visible = obj.planet === "moon";
    const stationCol: RoverCollider = {
      x: obj.x,
      z: obj.z,
      r: 1.5,
      type: "station",
      label: obj.siteName,
    };
    if (obj.planet === "mars") marsColliders.push(stationCol);
    else moonColliders.push(stationCol);

    // Grounded outcrop rock / ice deposit with vivid mineral seams beside instrument
    const isIceSite = obj.id.includes("ice") || obj.id.includes("hydrogen");
    const specimenRock = new THREE.Mesh(rockGeo, rockMat.clone());
    (specimenRock.material as THREE.MeshStandardMaterial).color.setHex(
      isIceSite ? 0xbae6fd : obj.planet === "mars" ? 0xb4532a : 0x94a3b8,
    );
    specimenRock.scale.set(1.22, 0.86, 1.04);
    specimenRock.position.set(0, 0.36, 0);
    specimenRock.castShadow = true;
    specimenRock.receiveShadow = true;
    g.add(specimenRock);

    const veinMat = new THREE.MeshStandardMaterial({
      color: isIceSite ? 0x38bdf8 : 0xf59e0b,
      emissive: isIceSite ? 0x0ea5e9 : 0xd97706,
      emissiveIntensity: 0.72,
      roughness: 0.28,
      metalness: 0.35,
    });
    const veinGeo = new THREE.OctahedronGeometry(0.16, 0);
    for (let v = 0; v < 4; v++) {
      const va = (v / 4) * Math.PI * 2 + 0.4;
      const shard = new THREE.Mesh(veinGeo, veinMat);
      shard.position.set(
        Math.cos(va) * 0.42,
        0.44 + (v % 2) * 0.14,
        Math.sin(va) * 0.36,
      );
      shard.rotation.set(v * 0.7, va, v * 0.5);
      shard.scale.set(1.3, 0.7, 0.8);
      g.add(shard);
    }

    if (obj.id.includes("ice") || obj.id.includes("hydrogen")) {
      // TRIDENT Cryo-Drill Tripod beside regolith specimen
      for (let leg = 0; leg < 3; leg++) {
        const a = (leg / 3) * Math.PI * 2;
        const strut = createStrutBetween(
          new THREE.Vector3(Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15),
          new THREE.Vector3(Math.cos(a) * 0.22, 1.85, Math.sin(a) * 0.22),
          0.04,
          0.055,
          stationDarkMat,
        );
        g.add(strut);
      }
      const drillHead = new THREE.Mesh(
        new THREE.BoxGeometry(0.62, 0.55, 0.58),
        stationGoldMat,
      );
      drillHead.position.y = 1.75;
      drillHead.castShadow = true;
      g.add(drillHead);
      const auger = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.04, 1.55, 10),
        stationMetalMat,
      );
      auger.position.y = 0.85;
      g.add(auger);
    } else if (obj.id.includes("solar") || obj.id.includes("maaz")) {
      // Articulated Solar & Weather Mast on anchored tripod
      const baseSkid = new THREE.Mesh(
        new THREE.CylinderGeometry(0.75, 0.9, 0.28, 8),
        stationDarkMat,
      );
      baseSkid.position.y = 0.14;
      baseSkid.castShadow = true;
      g.add(baseSkid);
      const mastPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 2.35, 10),
        stationMetalMat,
      );
      mastPole.position.set(1.1, 1.18, -0.4);
      mastPole.castShadow = true;
      g.add(mastPole);
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 0.06, 0.95),
        new THREE.MeshStandardMaterial({
          map: tex.solarPanel,
          color: 0xffffff,
          metalness: 0.45,
          roughness: 0.24,
        }),
      );
      wing.position.set(1.1, 2.15, -0.4);
      wing.rotation.x = 0.48;
      wing.castShadow = true;
      g.add(wing);
    } else if (obj.id.includes("moxie") || obj.id.includes("delta")) {
      // MOXIE Electrolysis Skid + Dual O2 Cylinders
      const unit = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.95, 1.15),
        stationGoldMat,
      );
      unit.position.set(1.35, 0.52, -0.35);
      unit.castShadow = true;
      g.add(unit);
      for (const offsetZ of [-0.28, 0.28]) {
        const tank = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.24, 1.15, 12),
          stationMetalMat,
        );
        tank.position.set(2.3, 0.6, offsetZ - 0.35);
        tank.castShadow = true;
        g.add(tank);
      }
    } else {
      // Spectrometer Beacon & Sample Cairn
      const sensorBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.44, 0.54),
        stationGoldMat,
      );
      sensorBox.position.set(1.25, 1.15, 0.25);
      sensorBox.castShadow = true;
      g.add(sensorBox);
      const stand = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.09, 1.15, 8),
        stationDarkMat,
      );
      stand.position.set(1.25, 0.58, 0.25);
      g.add(stand);
    }

    // Crisp glowing amber target ground ring matching reference art direction
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(4.4, 4.88, 48),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.24;
    g.add(ring);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(3.85, 5.45, 48),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.21;
    g.add(halo);

    group.add(g);
    objectiveMeshes.push({
      id: obj.id,
      planet: obj.planet,
      group: g,
      ring,
      halo,
    });
  });

  // 7. Moon & Mars Landing Zones
  const landingZoneMeshes: LunarEnvironmentHandles["landingZoneMeshes"] = [];
  const registerZones = (
    zones: typeof MOON_LANDING_ZONES,
    planet: SurfacePlanet,
  ) => {
    zones.forEach((lz) => {
      const zg = new THREE.Group();
      const zy = getSurfaceTerrainHeight(planet, lz.x, lz.z);
      zg.position.set(lz.x, zy + 0.25, lz.z);
      zg.visible = planet === "moon";

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(lz.radius - 0.55, lz.radius, 36),
        new THREE.MeshBasicMaterial({
          color: lz.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      zg.add(ring);

      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(lz.radius, lz.radius, 12, 24, 1, true),
        new THREE.MeshBasicMaterial({
          color: lz.color,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.1,
          depthWrite: false,
        }),
      );
      cyl.position.y = 6;
      cyl.visible = false;
      zg.add(cyl);

      group.add(zg);
      landingZoneMeshes.push({ id: lz.id, planet, group: zg, ring, cyl });
    });
  };
  registerZones(MOON_LANDING_ZONES, "moon");
  registerZones(MARS_LANDING_ZONES, "mars");

  // 8. Four Approach Sky Gates
  const approachGates: LunarEnvironmentHandles["approachGates"] = [];
  [
    { x: 0, y: 132, z: -28 },
    { x: 0, y: 95, z: -19 },
    { x: 0, y: 60, z: -10 },
    { x: 0, y: 26, z: -3 },
  ].forEach((gc) => {
    const gg = new THREE.Group();
    gg.position.set(gc.x, gc.y, gc.z);
    gg.lookAt(0, 0, 0);

    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(9.0, 0.28, 12, 32),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.8,
      }),
    );
    gg.add(torus);
    gg.visible = false;
    group.add(gg);
    approachGates.push({ group: gg, torus, passed: false });
  });

  // 9. Predictive Trajectory Arc
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(25 * 3), 3),
  );
  const trajectoryArc = new THREE.Line(
    arcGeo,
    new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.78,
    }),
  );
  trajectoryArc.visible = false;
  group.add(trajectoryArc);

  const envHandles: LunarEnvironmentHandles = {
    group,
    terrainMesh: terrain,
    colliders: moonColliders,
    moonColliders,
    marsColliders,
    applyPlanet: (planet: SurfacePlanet) => {
      if (activePlanet === planet) return;
      activePlanet = planet;
      rebuildTerrainGeometry(planet);
      terrainMat.map = planet === "mars" ? tex.marsAlbedo : tex.moonAlbedo;
      terrainMat.bumpMap = planet === "mars" ? tex.marsBump : tex.moonBump;
      terrainMat.needsUpdate = true;
      updateBouldersForPlanet(planet);
      earthGroup.visible = planet === "moon";
      marsDecorGroup.visible = planet === "mars";
      envHandles.colliders = planet === "mars" ? marsColliders : moonColliders;
      objectiveMeshes.forEach((om) => {
        om.group.visible = om.planet === planet;
      });
    },
    earthGroup,
    earthGlobe,
    earthClouds,
    earthScatter,
    earthAtmo,
    marsDecorGroup,
    padLight,
    objectiveMeshes,
    landingZoneMeshes,
    approachGates,
    trajectoryArc,
    habGroup,
    kilopowerGroup,
    wheelTrackMesh,
  };

  return envHandles;
}

export interface LunarLanderHandles {
  group: THREE.Group;
  descentStage: THREE.Group;
  ascentStage: THREE.Group;
  marsTrim: THREE.Group;
  legs: THREE.Group[];
  probes: THREE.Mesh[];
  nozzleGroup: THREE.Group;
  flameMesh: THREE.Mesh;
  flameInner: THREE.Mesh;
  machDiamond: THREE.Mesh;
  engineLight: THREE.PointLight;
  landingSpot: THREE.SpotLight;
  rcsLeft: THREE.Mesh;
  rcsRight: THREE.Mesh;
  rcsFwd: THREE.Mesh;
  rcsBack: THREE.Mesh;
  legsGroup: THREE.Group;
  rampGroup: THREE.Group;
  edlGroup: THREE.Group;
  entryPlasmaCone: THREE.Mesh;
  parachuteGroup: THREE.Group;
  heatShieldDisk: THREE.Mesh;
  skyCraneGroup: THREE.Group;
  skyCraneCables: THREE.Group;
}

export function createLunarLander(
  tex: ProceduralTextureSet,
): LunarLanderHandles {
  // Blueprint Accurate: Apollo LM-2 (Eagle Class) — 7.3m height x 7.0m width
  const group = new THREE.Group();
  const descentStage = new THREE.Group();
  const ascentStage = new THREE.Group();

  const foilMat = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    bumpMap: tex.foilBump,
    bumpScale: 0.11,
    color: 0xffffff,
    metalness: 0.85,
    roughness: 0.24,
  });
  const strutMat = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    color: 0xfbbf24,
    metalness: 0.82,
    roughness: 0.28,
  });
  const cabinLightMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.55,
    roughness: 0.35,
  });
  const cabinDarkMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.65,
    roughness: 0.35,
  });
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.82,
    roughness: 0.22,
  });

  // Octagonal Descent Stage Hull
  const descentHull = new THREE.Mesh(
    new THREE.CylinderGeometry(2.25, 2.35, 1.65, 8),
    foilMat,
  );
  descentHull.position.y = 1.75;
  descentHull.rotation.y = Math.PI / 8;
  descentHull.castShadow = true;
  descentStage.add(descentHull);

  // Side recessed equipment frame ribs & spherical helium/propellant tanks
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const bay = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.15, 0.35),
      cabinDarkMat,
    );
    bay.position.set(Math.sin(a) * 2.1, 1.75, Math.cos(a) * 2.1);
    bay.rotation.y = a;
    descentStage.add(bay);

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 1.05, 12),
      tankMat,
    );
    tank.position.set(Math.sin(a) * 2.15, 1.75, Math.cos(a) * 2.15);
    descentStage.add(tank);
  }

  // 4 Articulated Tripod Landing Legs + Retractable Contact Probes + Front Boarding Ladder (+Z)
  const legsGroup = new THREE.Group();
  const legs: THREE.Group[] = [];
  const probes: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const legRoot = new THREE.Group();
    legRoot.rotation.y = a;

    const pUpperCenter = new THREE.Vector3(0, 2.38, 2.08);
    const pFoot = new THREE.Vector3(0, 0.14, 3.24);
    const pMidCollar = new THREE.Vector3(0, 1.38, 2.6);
    const pLowerCenter = new THREE.Vector3(0, 1.02, 2.16);
    const pAnkle = new THREE.Vector3(0, 0.36, 3.12);

    // Primary telescoping shock strut (upper hull -> footpad ball joint)
    legRoot.add(
      createStrutBetween(pUpperCenter, pFoot, 0.085, 0.068, strutMat),
    );

    // Dual diagonal upper V-braces (hull side outriggers -> mid-leg collar)
    legRoot.add(
      createStrutBetween(
        new THREE.Vector3(-0.82, 2.42, 1.98),
        pMidCollar,
        0.048,
        0.045,
        strutMat,
      ),
    );
    legRoot.add(
      createStrutBetween(
        new THREE.Vector3(0.82, 2.42, 1.98),
        pMidCollar,
        0.048,
        0.045,
        strutMat,
      ),
    );

    // Lower A-frame deploy trusses (lower hull -> ankle collar)
    legRoot.add(
      createStrutBetween(pLowerCenter, pAnkle, 0.05, 0.045, strutMat),
    );
    legRoot.add(
      createStrutBetween(
        new THREE.Vector3(-0.66, 1.05, 2.08),
        pAnkle,
        0.042,
        0.04,
        strutMat,
      ),
    );
    legRoot.add(
      createStrutBetween(
        new THREE.Vector3(0.66, 1.05, 2.08),
        pAnkle,
        0.042,
        0.04,
        strutMat,
      ),
    );

    // Dish Footpad + Ankle Collar + Telescoping Surface Contact Probe
    const footpad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.52, 0.62, 0.14, 18),
      strutMat,
    );
    footpad.position.set(0, 0.07, 3.24);
    legRoot.add(footpad);

    const ankleCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.12, 0.18, 10),
      cabinDarkMat,
    );
    ankleCollar.position.set(0, 0.22, 3.24);
    legRoot.add(ankleCollar);

    if (i !== 0) {
      const probe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.015, 0.72, 6),
        new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          metalness: 0.9,
          roughness: 0.15,
        }),
      );
      probe.position.set(0, -0.24, 3.24);
      legRoot.add(probe);
      probes.push(probe);
    } else {
      // Front Astronaut Boarding Ladder cleanly parallel along the +Z primary strut
      const lTop = new THREE.Vector3(-0.21, 2.38, 2.26);
      const lBot = new THREE.Vector3(-0.21, 0.42, 3.22);
      const rTop = new THREE.Vector3(0.21, 2.38, 2.26);
      const rBot = new THREE.Vector3(0.21, 0.42, 3.22);
      legRoot.add(createStrutBetween(lTop, lBot, 0.024, 0.024, tankMat));
      legRoot.add(createStrutBetween(rTop, rBot, 0.024, 0.024, tankMat));

      for (let r = 0; r < 7; r++) {
        const t = 0.08 + (r / 6) * 0.84;
        const pL = new THREE.Vector3().lerpVectors(lTop, lBot, t);
        const pR = new THREE.Vector3().lerpVectors(rTop, rBot, t);
        legRoot.add(createStrutBetween(pL, pR, 0.018, 0.018, tankMat));
      }
    }

    legsGroup.add(legRoot);
    legs.push(legRoot);
  }
  descentStage.add(legsGroup);

  // Mars 0.38g EDL Trim Package (Aeroshell Thermal Flange + 4 Canted Quad-MLE Pods)
  const marsTrim = new THREE.Group();
  const aeroshellRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.38, 0.16, 10, 24),
    new THREE.MeshStandardMaterial({
      color: 0x451a12,
      metalness: 0.35,
      roughness: 0.65,
    }),
  );
  aeroshellRing.rotation.x = Math.PI / 2;
  aeroshellRing.position.y = 0.98;
  marsTrim.add(aeroshellRing);
  [
    Math.PI / 4,
    (3 * Math.PI) / 4,
    (5 * Math.PI) / 4,
    (7 * Math.PI) / 4,
  ].forEach((ma) => {
    const pod = new THREE.Group();
    pod.position.set(Math.sin(ma) * 2.32, 1.32, Math.cos(ma) * 2.32);
    pod.rotation.y = ma;
    const fairing = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.62, 0.44),
      cabinDarkMat,
    );
    pod.add(fairing);
    const mleNoz = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.2, 0.42, 12, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.9,
        roughness: 0.22,
        side: THREE.DoubleSide,
      }),
    );
    mleNoz.position.set(0, -0.38, 0.12);
    mleNoz.rotation.x = -0.22;
    pod.add(mleNoz);
    marsTrim.add(pod);
  });
  marsTrim.visible = false;
  descentStage.add(marsTrim);

  // Gimbaled Variable-Thrust Descent Engine Bell
  const nozzleGroup = new THREE.Group();
  nozzleGroup.position.y = 0.85;
  const bell = new THREE.Mesh(
    new THREE.ConeGeometry(0.88, 1.32, 22, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.92,
      roughness: 0.2,
      side: THREE.DoubleSide,
    }),
  );
  nozzleGroup.add(bell);

  const flameGeo = new THREE.ConeGeometry(0.86, 4.8, 16);
  flameGeo.rotateX(Math.PI);
  flameGeo.translate(0, -2.4, 0);
  const flameMesh = new THREE.Mesh(
    flameGeo,
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  flameMesh.position.y = -0.55;
  flameMesh.visible = false;
  nozzleGroup.add(flameMesh);

  const innerFlameGeo = new THREE.ConeGeometry(0.42, 2.8, 12);
  innerFlameGeo.rotateX(Math.PI);
  innerFlameGeo.translate(0, -1.4, 0);
  const flameInner = new THREE.Mesh(
    innerFlameGeo,
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    }),
  );
  flameMesh.add(flameInner);

  // Supersonic shock-diamond node (glows inside Mars thin CO2 atmosphere under high throttle)
  const machDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 1),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  machDiamond.scale.set(0.85, 1.9, 0.85);
  machDiamond.position.set(0, -1.55, 0);
  machDiamond.visible = false;
  flameMesh.add(machDiamond);

  descentStage.add(nozzleGroup);
  const engineLight = new THREE.PointLight(0xf97316, 0, 28);
  engineLight.position.set(0, -0.5, 0);
  descentStage.add(engineLight);

  const landingSpot = new THREE.SpotLight(
    0xe0f2fe,
    0,
    56,
    Math.PI / 5,
    0.55,
    1.2,
  );
  landingSpot.position.set(0, 1.15, 1.65);
  landingSpot.target.position.set(0, -14, 1.65);
  descentStage.add(landingSpot);
  descentStage.add(landingSpot.target);
  tagPart(descentStage, "lm-descent");

  // Faceted Ascent Stage Crew Cabin (LM-2 Blueprint Accurate)
  const cabinCenter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.58, 1.92, 1.72, 8),
    cabinLightMat,
  );
  cabinCenter.position.y = 3.45;
  cabinCenter.rotation.y = Math.PI / 8;
  cabinCenter.castShadow = true;
  ascentStage.add(cabinCenter);

  // Side cylindrical Ascent Propellant & Life Support Cheek Pods
  [-1.48, 1.48].forEach((cx) => {
    const pod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.62, 1.05, 14),
      cabinDarkMat,
    );
    pod.rotation.z = Math.PI / 2;
    pod.position.set(cx, 3.35, -0.18);
    ascentStage.add(pod);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.54, 12, 10), tankMat);
    cap.scale.set(0.42, 1, 1);
    cap.position.set(cx + Math.sign(cx) * 0.52, 3.35, -0.18);
    ascentStage.add(cap);
  });

  // Forward Cockpit Face + Egress Hatch + Astronaut Porch
  const fwdPanel = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 1.45, 1.15),
    cabinDarkMat,
  );
  fwdPanel.position.set(0, 3.38, 1.42);
  ascentStage.add(fwdPanel);

  const egressHatch = new THREE.Mesh(
    new THREE.BoxGeometry(0.84, 0.78, 0.14),
    cabinLightMat,
  );
  egressHatch.position.set(0, 2.98, 2.02);
  ascentStage.add(egressHatch);

  const porch = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.42), tankMat);
  porch.position.set(0, 2.54, 2.15);
  ascentStage.add(porch);

  // Two Canted Triangular Cockpit Windows
  const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  [-0.46, 0.46].forEach((wx, idx) => {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.44), winMat);
    win.position.set(wx, 3.68, 1.98);
    win.rotation.x = -0.22;
    win.rotation.z = idx === 0 ? 0.16 : -0.16;
    ascentStage.add(win);
  });

  // Overhead Docking Tunnel Collar
  const dockCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.68, 0.42, 16),
    tankMat,
  );
  dockCollar.position.set(0, 4.48, 0);
  ascentStage.add(dockCollar);

  // S-Band Steerable Parabolic Dish & Feed Horn
  const dishMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.85, 8),
    tankMat,
  );
  dishMast.position.set(0.95, 4.65, 0.45);
  ascentStage.add(dishMast);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      metalness: 0.78,
      roughness: 0.25,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.set(0.95, 5.15, 0.45);
  dish.rotation.x = Math.PI * 0.72;
  ascentStage.add(dish);
  const lmFeed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.04, 0.36, 8),
    cabinDarkMat,
  );
  lmFeed.position.set(0.95, 5.18, 0.62);
  lmFeed.rotation.x = Math.PI * 0.22;
  ascentStage.add(lmFeed);

  const nasaDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.52),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true }),
  );
  nasaDecal.position.set(0, 1.75, 2.38);
  descentStage.add(nasaDecal);
  tagPart(ascentStage, "lm-ascent");

  // 4-Quad RCS Thruster Clusters (16 nozzles total) on outrigger brackets
  const rcsGroup = new THREE.Group();
  const rcsPodMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.3,
  });
  [
    [-1.78, 1.25],
    [1.78, 1.25],
    [-1.78, -1.25],
    [1.78, -1.25],
  ].forEach(([rx, rz]) => {
    const cluster = new THREE.Group();
    cluster.position.set(rx, 3.65, rz);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 0.36, 10),
      rcsPodMat,
    );
    cluster.add(body);
    // 4 small orthogonal RCS nozzles per quad
    const nUp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), tankMat);
    nUp.position.y = 0.26;
    const nDn = nUp.clone();
    nDn.rotation.x = Math.PI;
    nDn.position.y = -0.26;
    const nSide = nUp.clone();
    nSide.rotation.z = (Math.sign(rx) * -Math.PI) / 2;
    nSide.position.set(Math.sign(rx) * 0.24, 0, 0);
    const nFwd = nUp.clone();
    nFwd.rotation.x = (Math.sign(rz) * Math.PI) / 2;
    nFwd.position.set(0, 0, Math.sign(rz) * 0.24);
    cluster.add(nUp, nDn, nSide, nFwd);
    rcsGroup.add(cluster);
  });

  const rcsGeo = new THREE.ConeGeometry(0.24, 1.2, 8);
  const rcsMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.85,
  });
  const rcsLeft = new THREE.Mesh(rcsGeo, rcsMat);
  rcsLeft.position.set(-2.35, 3.65, 0.6);
  rcsLeft.rotation.z = -Math.PI / 2;
  rcsLeft.visible = false;
  rcsGroup.add(rcsLeft);

  const rcsRight = new THREE.Mesh(rcsGeo, rcsMat);
  rcsRight.position.set(2.35, 3.65, 0.6);
  rcsRight.rotation.z = Math.PI / 2;
  rcsRight.visible = false;
  rcsGroup.add(rcsRight);

  const rcsFwd = new THREE.Mesh(rcsGeo, rcsMat);
  rcsFwd.position.set(0, 3.65, 2.05);
  rcsFwd.rotation.x = Math.PI / 2;
  rcsFwd.visible = false;
  rcsGroup.add(rcsFwd);

  const rcsBack = new THREE.Mesh(rcsGeo, rcsMat);
  rcsBack.position.set(0, 3.65, -2.05);
  rcsBack.rotation.x = -Math.PI / 2;
  rcsBack.visible = false;
  rcsGroup.add(rcsBack);

  tagPart(rcsGroup, "lm-rcs");
  tagPart(nozzleGroup, "lm-rcs");

  // Deployable Unstow Ramp on Front +Z Edge of Descent Stage
  const rampGroup = new THREE.Group();
  rampGroup.position.set(0, 0.95, 2.22);
  const rampDeck = new THREE.Mesh(
    new THREE.BoxGeometry(1.75, 0.1, 3.1),
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.72,
      roughness: 0.34,
    }),
  );
  rampDeck.position.set(0, 1.5, 0.08);
  rampDeck.rotation.x = Math.PI / 2;
  rampGroup.add(rampDeck);
  [-0.86, 0.86].forEach((rx) => {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 3.1, 0.18),
      tankMat,
    );
    rail.position.set(rx, 1.5, 0.14);
    rampGroup.add(rail);
  });
  descentStage.add(rampGroup);

  // Mars 7-Min EDL & Sky Crane Rig (plasma sheath, supersonic chute, heat shield, 3 bridle cables)
  const edlGroup = new THREE.Group();
  const entryPlasmaCone = new THREE.Mesh(
    new THREE.ConeGeometry(4.4, 3.2, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.56,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  entryPlasmaCone.rotation.x = Math.PI;
  entryPlasmaCone.position.y = 0.6;
  entryPlasmaCone.visible = false;
  edlGroup.add(entryPlasmaCone);

  const heatShieldDisk = new THREE.Mesh(
    new THREE.SphereGeometry(
      3.4,
      24,
      10,
      0,
      Math.PI * 2,
      Math.PI * 0.72,
      Math.PI * 0.28,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85,
      metalness: 0.15,
      side: THREE.DoubleSide,
    }),
  );
  heatShieldDisk.position.y = 2.6;
  heatShieldDisk.visible = false;
  edlGroup.add(heatShieldDisk);

  const parachuteGroup = new THREE.Group();
  parachuteGroup.position.y = 11.2;
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.7,
      side: THREE.DoubleSide,
    }),
  );
  parachuteGroup.add(canopy);
  for (let c = 0; c < 4; c++) {
    const a = (c / 4) * Math.PI * 2;
    parachuteGroup.add(
      createStrutBetween(
        new THREE.Vector3(Math.cos(a) * 3.8, 0.4, Math.sin(a) * 3.8),
        new THREE.Vector3(Math.cos(a) * 0.8, -5.8, Math.sin(a) * 0.8),
        0.025,
        0.025,
        tankMat,
      ),
    );
  }
  parachuteGroup.visible = false;
  edlGroup.add(parachuteGroup);

  const skyCraneGroup = new THREE.Group();
  skyCraneGroup.visible = false;
  const skyCraneCables = new THREE.Group();
  [
    [-0.55, -0.45],
    [0.55, -0.45],
    [0, 0.62],
  ].forEach(([cx, cz]) => {
    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 1.0, 6),
      new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }),
    );
    cable.position.set(cx, -0.5, cz);
    skyCraneCables.add(cable);
  });
  skyCraneGroup.add(skyCraneCables);
  const slungRover = new THREE.Mesh(
    new THREE.BoxGeometry(1.25, 0.55, 1.45),
    new THREE.MeshStandardMaterial({
      map: tex.foilAlbedo,
      color: 0xffffff,
      metalness: 0.7,
      roughness: 0.3,
    }),
  );
  slungRover.position.y = -1.1;
  skyCraneCables.add(slungRover);
  edlGroup.add(skyCraneGroup);

  group.add(descentStage, ascentStage, rcsGroup, edlGroup);

  // Load official NASA 3D Model of Apollo Lunar Module asynchronously
  if (typeof Image !== "undefined") {
    const gltfLoader = getSharedGLTFLoader();
    if (gltfLoader) {
      gltfLoader.load("/assets/crafts/apollo_lunar_module.glb", (gltf) => {
        const lmScene = gltf.scene;
        lmScene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            tagPart(child, "lm-descent");
          }
        });
        const bbox = new THREE.Box3().setFromObject(lmScene);
        const sz = bbox.getSize(new THREE.Vector3());
        // NASA Apollo LM height is 7.0m (1.75 units in simulator)
        const scale = 5.2 / (sz.y || 1.0);
        lmScene.scale.setScalar(scale);
        lmScene.position.set(0, 0, 0);

        // Hide procedural descent and ascent mesh geometries while preserving landing legs, probes, and emitters
        descentStage.children.forEach((c) => {
          if (c instanceof THREE.Mesh) c.visible = false;
        });
        ascentStage.children.forEach((c) => {
          if (c instanceof THREE.Mesh) c.visible = false;
        });

        descentStage.add(lmScene);
      });
    }
  }
  return {
    group,
    descentStage,
    ascentStage,
    marsTrim,
    legs,
    probes,
    nozzleGroup,
    flameMesh,
    flameInner,
    machDiamond,
    engineLight,
    landingSpot,
    rcsLeft,
    rcsRight,
    rcsFwd,
    rcsBack,
    legsGroup,
    rampGroup,
    edlGroup,
    entryPlasmaCone,
    parachuteGroup,
    heatShieldDisk,
    skyCraneGroup,
    skyCraneCables,
  };
}

export interface ViperRoverHandles {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheelModules: Array<{
    pivot: THREE.Group;
    spin: THREE.Group;
    arm: THREE.Object3D;
    knuckle: THREE.Mesh;
    side: number;
    forward: number;
    baseY: number;
  }>;
  drillArm: THREE.Group;
  drillBit: THREE.Mesh;
  dish: THREE.Mesh;
  camHead: THREE.Group;
  panelMat: THREE.MeshStandardMaterial;
  strobeMesh: THREE.Mesh;
  headlight: THREE.SpotLight;
  headlightBounce: THREE.PointLight;
  headlightBeams: THREE.Group;
  headlampLensMat: THREE.MeshBasicMaterial;
}

export function createViperRover(tex: ProceduralTextureSet): ViperRoverHandles {
  // Blueprint Accurate: VIPER Lunar Rover (2.0 m x 1.8 m x 1.4 m, 430 kg)
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.45,
    roughness: 0.4,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.78,
    roughness: 0.25,
  });
  const foilMat = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    bumpMap: tex.foilBump,
    bumpScale: 0.08,
    color: 0xffffff,
    metalness: 0.82,
    roughness: 0.25,
  });

  // Central Gold Kapton Avionics Core + White Machined Structural Frame
  const coreBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.56, 1.65),
    foilMat,
  );
  coreBox.position.set(0, 0.86, 0);
  coreBox.castShadow = true;
  bodyGroup.add(coreBox);

  const upperDeck = new THREE.Mesh(
    new THREE.BoxGeometry(1.36, 0.14, 1.85),
    frameMat,
  );
  upperDeck.position.set(0, 1.18, 0);
  upperDeck.castShadow = true;
  bodyGroup.add(upperDeck);

  // Front & Aft Equipment Bumper Panels with unobstructed NASA Meatball Decal
  const frontFace = new THREE.Mesh(
    new THREE.BoxGeometry(1.26, 0.52, 0.14),
    frameMat,
  );
  frontFace.position.set(0, 0.86, 0.88);
  bodyGroup.add(frontFace);

  const nasaFront = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.38),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true }),
  );
  nasaFront.position.set(-0.18, 0.88, 0.965);
  bodyGroup.add(nasaFront);

  const nasaRear = nasaFront.clone();
  nasaRear.position.set(0, 0.88, -1.135);
  nasaRear.rotation.y = Math.PI;
  bodyGroup.add(nasaRear);

  // Aft Battery Pack Module + Under-Chassis Neutron Spectrometer Housing
  const batteryBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.44, 0.34),
    darkMetal,
  );
  batteryBox.position.set(0, 0.86, -0.95);
  bodyGroup.add(batteryBox);

  const neutronSpec = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.22, 0.56),
    darkMetal,
  );
  neutronSpec.position.set(-0.12, 0.52, -0.15);
  bodyGroup.add(neutronSpec);

  // Front & Rear Stereo Hazcam Pods
  const hazLensMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  [
    [-0.44, 0.7, 0.96, 0],
    [0.44, 0.7, 0.96, 0],
    [-0.36, 0.7, -1.12, Math.PI],
    [0.36, 0.7, -1.12, Math.PI],
  ].forEach(([hx, hy, hz, ry]) => {
    const pod = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.1, 0.08),
      darkMetal,
    );
    pod.position.set(hx, hy, hz);
    pod.rotation.y = ry;
    const hLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.028, 0.05, 8),
      hazLensMat,
    );
    hLens.rotation.x = Math.PI / 2;
    hLens.position.set(0, 0, 0.04);
    pod.add(hLens);
    bodyGroup.add(pod);
  });

  tagPart(bodyGroup, "rover-mobility");

  // High-Efficiency Twin Wing Top-Mounted Solar Array + Hinge Brackets
  const solarGroup = new THREE.Group();
  const panelMat = new THREE.MeshStandardMaterial({
    map: tex.solarPanel,
    color: 0xbfe3ff,
    metalness: 0.52,
    roughness: 0.22,
  });
  [-0.64, 0.64].forEach((px) => {
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.06, 1.56),
      panelMat,
    );
    wing.position.set(px, 1.29, -0.2);
    wing.rotation.z = -Math.sign(px) * 0.06;
    wing.castShadow = true;
    solarGroup.add(wing);

    [-0.65, 0.25].forEach((hz) => {
      const hinge = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.08, 0.1),
        darkMetal,
      );
      hinge.position.set(Math.sign(px) * 0.42, 1.24, hz);
      solarGroup.add(hinge);
    });
  });
  [-0.72, 0.72].forEach((sx) => {
    const sideWing = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.4, 1.62),
      panelMat,
    );
    sideWing.position.set(sx, 0.96, -0.05);
    solarGroup.add(sideWing);
  });
  tagPart(solarGroup, "rover-power");
  bodyGroup.add(solarGroup);

  // Panoramic Stereo Camera Mast (clear in front of solar wings) + Headlight + Rear Dish & Whip Antenna
  const commsGroup = new THREE.Group();
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.072, 1.15, 10),
    frameMat,
  );
  mast.position.set(-0.34, 1.8, 0.72);
  commsGroup.add(mast);

  const camHead = new THREE.Group();
  camHead.position.set(-0.34, 2.38, 0.72);
  camHead.add(
    new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.32), frameMat),
  );
  const bezelGeo = new THREE.CylinderGeometry(0.082, 0.082, 0.08, 12);
  bezelGeo.rotateX(Math.PI / 2);
  const lensGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.1, 12);
  lensGeo.rotateX(Math.PI / 2);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  [-0.15, 0.15].forEach((lx) => {
    const bezel = new THREE.Mesh(bezelGeo, darkMetal);
    bezel.position.set(lx, 0, 0.17);
    camHead.add(bezel);
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(lx, 0, 0.18);
    camHead.add(lens);
  });
  commsGroup.add(camHead);

  const headlampLensMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  [-0.36, 0.36].forEach((hx) => {
    const lampHousing = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.11, 0.1),
      darkMetal,
    );
    lampHousing.position.set(hx, 1.05, 0.96);
    bodyGroup.add(lampHousing);
    const lampLens = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.075, 0.04),
      headlampLensMat,
    );
    lampLens.position.set(hx, 1.05, 1.01);
    bodyGroup.add(lampLens);
  });

  const headlight = new THREE.SpotLight(
    0xe0f2fe,
    44,
    74,
    Math.PI / 4,
    0.45,
    0.55,
  );
  headlight.position.set(0, 1.25, 1.05);
  headlight.target.position.set(0, -0.8, 15);
  commsGroup.add(headlight);
  commsGroup.add(headlight.target);

  const headlightBounce = new THREE.PointLight(0xfef9c3, 6.5, 20);
  headlightBounce.position.set(0, 1.35, 2.6);
  commsGroup.add(headlightBounce);

  const headlightBeams = new THREE.Group();
  const beamCoreMat = new THREE.MeshBasicMaterial({
    color: 0xfef9c3,
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const beamOuterMat = new THREE.MeshBasicMaterial({
    color: 0xbae6fd,
    transparent: true,
    opacity: 0.055,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  [-0.36, 0.36].forEach((bx) => {
    // Narrow aperture (0.07m) at the LED lamp lens (z=0), widening forward along +Z to 1.35m / 2.1m
    const coreGeo = new THREE.CylinderGeometry(0.06, 1.15, 12.5, 20, 1, true);
    coreGeo.rotateX(-Math.PI / 2);
    coreGeo.translate(0, 0, 6.25);
    const coreBeam = new THREE.Mesh(coreGeo, beamCoreMat);
    coreBeam.position.set(bx, 1.05, 1.04);
    coreBeam.rotation.x = 0.09;
    headlightBeams.add(coreBeam);

    const outerGeo = new THREE.CylinderGeometry(0.09, 2.05, 14.5, 20, 1, true);
    outerGeo.rotateX(-Math.PI / 2);
    outerGeo.translate(0, 0, 7.25);
    const outerBeam = new THREE.Mesh(outerGeo, beamOuterMat);
    outerBeam.position.set(bx, 1.05, 1.04);
    outerBeam.rotation.x = 0.09;
    headlightBeams.add(outerBeam);
  });
  bodyGroup.add(headlightBeams);

  // Rear High-Gain Parabolic Dish (tilted upward/aft) + Vertical Comms Whip Antenna
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.7,
      roughness: 0.25,
      side: THREE.DoubleSide,
    }),
  );
  dish.position.set(0.32, 1.56, -0.78);
  dish.rotation.x = Math.PI * 0.85;
  commsGroup.add(dish);

  const whip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.028, 1.15, 8),
    darkMetal,
  );
  whip.position.set(-0.42, 1.82, -0.78);
  commsGroup.add(whip);

  const strobeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
  );
  strobeMesh.position.set(0, 0.16, 0);
  camHead.add(strobeMesh);

  tagPart(commsGroup, "rover-comms");
  bodyGroup.add(commsGroup);

  // Forward 2-Segment Articulated TRIDENT Ice Drill Arm + Helical Auger Spiral Collars (stowed clearly off terrain)
  const drillArm = new THREE.Group();
  drillArm.position.set(0.46, 0.98, 0.9);
  const boom1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.09, 0.62),
    frameMat,
  );
  boom1.position.set(0, 0.04, 0.3);
  drillArm.add(boom1);

  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.075, 0.56, 12),
    darkMetal,
  );
  housing.position.set(0, -0.22, 0.62);
  drillArm.add(housing);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.1, 12),
    foilMat,
  );
  collar.position.set(0, -0.52, 0.62);
  drillArm.add(collar);

  const drillBit = new THREE.Mesh(
    new THREE.ConeGeometry(0.068, 0.44, 10),
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.88,
      roughness: 0.22,
    }),
  );
  drillBit.position.set(0, -0.78, 0.62);
  drillBit.rotation.x = Math.PI;
  for (let f = 0; f < 5; f++) {
    const t = -0.14 + f * 0.072;
    const flute = new THREE.Mesh(
      new THREE.TorusGeometry(0.072 - f * 0.008, 0.012, 6, 12),
      foilMat,
    );
    flute.position.y = t;
    flute.rotation.x = Math.PI / 2 + 0.36;
    flute.rotation.z = f * 0.65;
    drillBit.add(flute);
  }
  drillArm.add(drillBit);
  tagPart(drillArm, "rover-science");
  bodyGroup.add(drillArm);

  group.add(bodyGroup);

  // 4 Rocker-Bogie Articulated Wheel-Legs (FL, FR, RL, RR) pivoted at differential hubs
  [-0.68, 0.68].forEach((sx) => {
    const diffPivot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.14, 10),
      darkMetal,
    );
    diffPivot.rotation.z = Math.PI / 2;
    diffPivot.position.set(sx, 0.78, 0);
    tagPart(diffPivot, "rover-mobility");
    group.add(diffPivot);
  });

  const wheelModules: ViperRoverHandles["wheelModules"] = [];
  const corners: Array<[number, number]> = [
    [-0.92, 0.9],
    [0.92, 0.9],
    [-0.92, -0.9],
    [0.92, -0.9],
  ];
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.25,
  });
  const grouserMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.65,
    metalness: 0.55,
  });

  corners.forEach(([wx, wz]) => {
    const side = Math.sign(wx);
    const forward = Math.sign(wz);

    // Rocker-Bogie arm pivoted right at differential hub (side * 0.68, 0.78, 0) -> knuckle top (wx, 0.56, wz)
    const arm = new THREE.Group();
    arm.position.set(side * 0.68, 0.78, 0);
    const elbow = new THREE.Vector3(side * 0.2, -0.06, forward * 0.45);
    const knuckleTop = new THREE.Vector3(wx - side * 0.68, 0.56 - 0.78, wz);
    arm.add(
      createStrutBetween(
        new THREE.Vector3(0, 0, 0),
        elbow,
        0.048,
        0.045,
        frameMat,
      ),
    );
    arm.add(createStrutBetween(elbow, knuckleTop, 0.045, 0.042, frameMat));
    const elbowJoint = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      darkMetal,
    );
    elbowJoint.position.copy(elbow);
    arm.add(elbowJoint);
    tagPart(arm, "rover-mobility", [side * 0.85, -0.45, forward * 0.6]);
    group.add(arm);

    // Vertical Steering Knuckle fork above wheel
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.34, wz);

    const knuckle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8),
      darkMetal,
    );
    knuckle.position.set(0, 0.24, 0);
    pivot.add(knuckle);

    const spin = new THREE.Group();
    const tire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.24, 24),
      tireMat,
    );
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spin.add(tire);

    // Deep High-Traction Lunar Grouser Cleats
    for (let t = 0; t < 12; t++) {
      const a = (t / 12) * Math.PI * 2;
      const grouser = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.055, 0.06),
        grouserMat,
      );
      grouser.position.set(0, Math.cos(a) * 0.3, Math.sin(a) * 0.3);
      grouser.rotation.x = a;
      spin.add(grouser);
    }

    // 6-Spoke Inner Wheel Rim + Gold Hubcap
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.44, 0.045),
        grouserMat,
      );
      spoke.rotation.x = (s * Math.PI) / 3;
      spin.add(spoke);
    }
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.27, 12),
      foilMat,
    );
    hub.rotation.z = Math.PI / 2;
    spin.add(hub);

    pivot.add(spin);
    tagPart(pivot, "rover-mobility", [side * 0.95, -0.55, forward * 0.65]);
    group.add(pivot);

    wheelModules.push({
      pivot,
      spin,
      arm,
      knuckle,
      side,
      forward,
      baseY: 0.34,
    });
  });

  return {
    group,
    bodyGroup,
    wheelModules,
    drillArm,
    drillBit,
    dish,
    camHead,
    panelMat,
    strobeMesh,
    headlight,
    headlightBounce,
    headlightBeams,
    headlampLensMat,
  };
}

export interface LaunchComplexHandles {
  group: THREE.Group;
  groundGroup: THREE.Group;
  skyDomeMat: THREE.MeshBasicMaterial;
  cloudMat: THREE.SpriteMaterial;
  coolCloudMat: THREE.SpriteMaterial;
  earthLimb: THREE.Group;
  earthLimbGlobeMat: THREE.MeshStandardMaterial;
  earthLimbScatter: THREE.Mesh;
  earthLimbAtmo: THREE.Mesh;
  moonMesh: THREE.Mesh;
  cloudLayer: THREE.Group;
  crewAccessArm: THREE.Group;
  rocketFull: THREE.Group;
  coreGroup: THREE.Group;
  rs25Group: THREE.Group;
  rs25EngineGroups: THREE.Group[];
  rs25Emitters: THREE.Group[];
  srbLeft: THREE.Group;
  srbRight: THREE.Group;
  srbLeftEmitter: THREE.Group;
  srbRightEmitter: THREE.Group;
  srbLeftBsm: THREE.Mesh;
  srbRightBsm: THREE.Mesh;
  upperGroup: THREE.Group;
  icpsFlame: THREE.Group;
  esmGroup: THREE.Group;
  esmSolarPivots: THREE.Group[];
  orionGroup: THREE.Group;
  machCone: THREE.Mesh;
  thermalGlowCone: THREE.Mesh;
  abortTower: THREE.Group;
  lasFlame: THREE.Mesh;
  flameGroup: THREE.Group;
  machDiamondsGroup: THREE.Group;
  trenchLight: THREE.PointLight;
  rocketEngineGlow: THREE.PointLight;
  padSpotlight: THREE.SpotLight;
  leoOrbitRing: THREE.Mesh;
}

export function buildProceduralMobileLauncher(tex?: any): {
  groundGroup: THREE.Group;
  trenchGroup: THREE.Group;
  mlpBase: THREE.Group;
  tower: THREE.Group;
  crewAccessArm: THREE.Group;
} {
  const dummyTex = tex || { towerSteel: null };
  const { trenchGroup, mlpBase } = buildMobileLauncherAndTrench(dummyTex);
  const { tower, crewAccessArm } = buildLC39BServiceTower(dummyTex);
  const groundGroup = new THREE.Group();
  groundGroup.add(trenchGroup);
  groundGroup.add(tower);
  return { groundGroup, trenchGroup, mlpBase, tower, crewAccessArm };
}

function buildMobileLauncherAndTrench(tex: ProceduralTextureSet): {
  trenchGroup: THREE.Group;
  mlpBase: THREE.Group;
} {
  const g = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.9,
    metalness: 0.08,
  });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    map: tex.towerSteel,
    color: 0xcbd5e1,
    metalness: 0.72,
    roughness: 0.36,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.55,
    metalness: 0.25,
  });

  // Raised LC-39B Concrete Apron Split Around Central Flame Trench
  const apronLeft = new THREE.Mesh(
    new THREE.BoxGeometry(16, 1.2, 28),
    concreteMat,
  );
  apronLeft.position.set(-12, 0.2, 0);
  apronLeft.receiveShadow = true;
  const apronRight = apronLeft.clone();
  apronRight.position.x = 12;
  g.add(apronLeft, apronRight);

  // Sloped Apron Approach Ramps
  const rampFront = new THREE.Mesh(
    new THREE.BoxGeometry(40, 0.8, 12),
    concreteMat,
  );
  rampFront.position.set(0, -0.05, 19);
  rampFront.rotation.x = 0.08;
  rampFront.receiveShadow = true;
  const rampBack = rampFront.clone();
  rampBack.position.z = -19;
  rampBack.rotation.x = -0.08;
  g.add(rampFront, rampBack);

  // Flame Trench Floor & Sloped Blast Deflector Wedge
  const trenchFloor = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.4, 34),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.92,
      metalness: 0.15,
    }),
  );
  trenchFloor.position.set(0, -0.25, 0);
  g.add(trenchFloor);

  const deflector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 4.4, 8.6, 4),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.78,
      roughness: 0.42,
    }),
  );
  deflector.rotation.y = Math.PI / 4;
  deflector.scale.set(1.1, 0.45, 1.45);
  deflector.position.set(0, 0.75, 0);
  g.add(deflector);

  // Concrete Flame Trench Blast Walls
  [-4.2, 4.2].forEach((wx) => {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 2.0, 26),
      concreteMat,
    );
    wall.position.set(wx, 0.75, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
  });

  // Mobile Launcher Platform (MLP) Steel Deck & Corner Pedestal Legs
  const mlpBase = new THREE.Group();
  const mlpDeckMat = new THREE.MeshStandardMaterial({
    map: tex.towerSteel,
    color: 0x334155,
    metalness: 0.35,
    roughness: 0.72,
  });
  const deckSlab = new THREE.Mesh(
    new THREE.BoxGeometry(14.6, 1.55, 14.6),
    mlpDeckMat,
  );
  deckSlab.position.set(-1.6, 1.72, 0);
  deckSlab.castShadow = true;
  deckSlab.receiveShadow = true;
  mlpBase.add(deckSlab);

  // Perimeter Hazard Safety Curb (leaving dark steel MLP deck surface visible!)
  [
    [-1.6, 7.36, 14.8, 0.22],
    [-1.6, -7.36, 14.8, 0.22],
  ].forEach(([cx, cz, w, d]) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), hazardMat);
    curb.position.set(cx, 2.48, cz);
    mlpBase.add(curb);
  });
  [
    [-8.96, 0, 0.22, 14.8],
    [5.76, 0, 0.22, 14.8],
  ].forEach(([cx, cz, w, d]) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), hazardMat);
    curb.position.set(cx, 2.48, cz);
    mlpBase.add(curb);
  });

  // MLP Central Flame Exhaust Trench Collar under SLS Engines
  const exhaustWell = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.16, 3.8),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.85,
      metalness: 0.45,
    }),
  );
  exhaustWell.position.set(0, 2.45, 0);
  mlpBase.add(exhaustWell);

  // 6 MLP Support Mount Pedestals (Instanced: reduces 6 draw calls to 1)
  const legGeo = new THREE.BoxGeometry(1.1, 1.4, 1.1);
  const legInstanced = new THREE.InstancedMesh(legGeo, darkSteelMat, 6);
  const legDummy = new THREE.Object3D();
  [
    [-7.6, -5.8],
    [-7.6, 5.8],
    [-1.6, -5.8],
    [-1.6, 5.8],
    [4.4, -5.8],
    [4.4, 5.8],
  ].forEach(([px, pz], idx) => {
    legDummy.position.set(px, 0.7, pz);
    legDummy.updateMatrix();
    legInstanced.setMatrixAt(idx, legDummy.matrix);
  });
  legInstanced.instanceMatrix.needsUpdate = true;
  mlpBase.add(legInstanced);

  // 4 Hold-Down Posts & Twin Tail Service Masts cradling SLS (Instanced: reduces 4 draw calls to 1)
  const clampGeo = new THREE.BoxGeometry(0.32, 0.85, 0.32);
  const clampInstanced = new THREE.InstancedMesh(clampGeo, hazardMat, 4);
  const clampDummy = new THREE.Object3D();
  [
    [-1.62, -0.52],
    [-1.62, 0.52],
    [1.62, -0.52],
    [1.62, 0.52],
  ].forEach(([hx, hz], idx) => {
    clampDummy.position.set(hx, 2.75, hz);
    clampDummy.updateMatrix();
    clampInstanced.setMatrixAt(idx, clampDummy.matrix);
  });
  clampInstanced.instanceMatrix.needsUpdate = true;
  mlpBase.add(clampInstanced);

  // Tail Service Mast Umbilicals (TSMU-LH2 and TSMU-LOX) flanking Core Stage aft skirt
  [-1.95, 1.95].forEach((tz, idx) => {
    const tsmGroup = new THREE.Group();
    tsmGroup.position.set(-2.35, 2.5, tz);
    // Steel mast housing
    const tsm = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 3.2, 0.95),
      darkSteelMat,
    );
    tsm.position.y = 1.6;
    tsm.castShadow = true;
    tsmGroup.add(tsm);
    // Angled blast protective hood over quick-disconnect plate
    const hood = new THREE.Mesh(
      new THREE.ConeGeometry(0.65, 0.8, 4),
      darkSteelMat,
    );
    hood.rotation.y = Math.PI / 4;
    hood.rotation.z = -Math.PI / 6;
    hood.position.set(0.42, 2.9, 0);
    tsmGroup.add(hood);
    // Cryogenic fill carrier arm extending to SLS aft skirt
    const carrierArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.65, 0.28, 0.32),
      hazardMat,
    );
    carrierArm.position.set(0.65, 2.3, 0);
    tsmGroup.add(carrierArm);
    tsmGroup.userData.partId = idx === 0 ? "ml-tsmu-lh2" : "ml-tsmu-lox";
    mlpBase.add(tsmGroup);
  });

  g.add(mlpBase);
  return { trenchGroup: g, mlpBase };
}

function buildLC39BServiceTower(tex: ProceduralTextureSet): {
  tower: THREE.Group;
  crewAccessArm: THREE.Group;
} {
  const tower = new THREE.Group();
  tower.position.set(-6.6, 2.5, 0);

  const steelMat = new THREE.MeshStandardMaterial({
    map: tex.towerSteel,
    color: 0xe2e8f0,
    metalness: 0.78,
    roughness: 0.3,
  });
  const darkIron = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.82,
    roughness: 0.35,
  });
  const armWhite = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.45,
    roughness: 0.28,
  });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });

  const towerHeight = 31.5;
  const halfW = 1.9;
  const corners: Array<[number, number]> = [
    [-halfW, -halfW],
    [halfW, -halfW],
    [-halfW, halfW],
    [halfW, halfW],
  ];

  // 4 Main Vertical Structural Columns
  corners.forEach(([cx, cz]) => {
    const col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, towerHeight, 10),
      steelMat,
    );
    col.position.set(cx, towerHeight / 2, cz);
    col.castShadow = true;
    tower.add(col);
  });

  // 7 Tiered Access Platforms + Diagonal Cross-Bracing per Bay (Instanced: reduces 63 draw calls to 2)
  const bayHeights = [0, 4.5, 9.0, 13.5, 18.0, 22.5, 27.0, 31.5];
  const numBays = bayHeights.length - 1; // 7
  const deckGeo = new THREE.BoxGeometry(halfW * 2.18, 0.28, halfW * 2.18);
  const deckInstanced = new THREE.InstancedMesh(deckGeo, darkIron, numBays);
  deckInstanced.castShadow = true;

  const strutGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8);
  const totalStruts = numBays * 4 * 2; // 56
  const strutInstanced = new THREE.InstancedMesh(
    strutGeo,
    steelMat,
    totalStruts,
  );
  strutInstanced.castShadow = true;

  const dummyDeck = new THREE.Object3D();
  const dummyStrut = new THREE.Object3D();
  const upVec = new THREE.Vector3(0, 1, 0);

  let strutIdx = 0;
  for (let b = 0; b < numBays; b++) {
    const y0 = bayHeights[b];
    const y1 = bayHeights[b + 1];

    dummyDeck.position.set(0, y1, 0);
    dummyDeck.updateMatrix();
    deckInstanced.setMatrixAt(b, dummyDeck.matrix);

    // Front, Back, Left, Right X-bracing trusses
    const faces: Array<[number, number, number, number]> = [
      [-halfW, halfW, halfW, halfW],
      [-halfW, -halfW, halfW, -halfW],
      [-halfW, -halfW, -halfW, halfW],
      [halfW, -halfW, halfW, halfW],
    ];
    faces.forEach(([x1, z1, x2, z2]) => {
      const pairs: Array<[THREE.Vector3, THREE.Vector3]> = [
        [new THREE.Vector3(x1, y0, z1), new THREE.Vector3(x2, y1, z2)],
        [new THREE.Vector3(x2, y0, z2), new THREE.Vector3(x1, y1, z1)],
      ];
      pairs.forEach(([p1, p2]) => {
        const dir = new THREE.Vector3().subVectors(p2, p1);
        const len = Math.max(0.001, dir.length());
        dummyStrut.position.copy(p1).addScaledVector(dir, 0.5);
        dummyStrut.quaternion.setFromUnitVectors(
          upVec,
          dir.clone().normalize(),
        );
        dummyStrut.scale.set(1, len, 1);
        dummyStrut.updateMatrix();
        strutInstanced.setMatrixAt(strutIdx++, dummyStrut.matrix);
      });
    });
  }

  deckInstanced.instanceMatrix.needsUpdate = true;
  strutInstanced.instanceMatrix.needsUpdate = true;
  tower.add(deckInstanced);
  tower.add(strutInstanced);

  // Interior Dual Crew Elevator Shaft
  const elevShaft = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, towerHeight - 1.5, 1.15),
    darkIron,
  );
  elevShaft.position.set(-0.4, towerHeight / 2, 0);
  tower.add(elevShaft);

  // Verified Mobile Launcher Flight Service Umbilicals connecting Tower -> SLS Stack
  // 1. Orion Service Module Umbilical (OSMU) at y=19.8: environmental purge & electrical power
  // 2. ICPS Umbilical (ICPSU) at y=16.8: LH2/LOX cryo top-off and pneumatics
  // 3. Core Stage Forward Skirt Umbilical (CSFSU) at y=13.5: avionics and GN2 purge
  // 4. Core Stage Inter-Tank Umbilical (CSITU) at y=9.8: LOX/LH2 vent lines
  const umbilicalSpecs = [
    { uy: 19.8, len: 4.02, name: "ml-osmu" },
    { uy: 16.8, len: 3.74, name: "ml-icpsu" },
    { uy: 13.5, len: 3.74, name: "ml-csfsu" },
    { uy: 9.8, len: 3.74, name: "ml-csitu" },
  ];
  umbilicalSpecs.forEach(({ uy, len, name }) => {
    const uArm = new THREE.Mesh(
      new THREE.BoxGeometry(len, 0.36, 0.58),
      steelMat,
    );
    uArm.position.set(1.9 + len / 2, uy, 0);
    uArm.castShadow = true;
    uArm.userData.partId = name;
    tower.add(uArm);
    const coupler = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.52, 0.72),
      darkIron,
    );
    coupler.position.set(1.9 + len, uy, 0);
    tower.add(coupler);
    // Cryogenic piping flex lines along top of swing arm
    const cryoPipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, len, 8),
      darkIron,
    );
    cryoPipe.rotation.z = Math.PI / 2;
    cryoPipe.position.set(1.9 + len / 2, uy + 0.24, 0);
    tower.add(cryoPipe);
  });

  // Retractable White Orion Crew Access Arm (CAA) & White Room (aligned flush with Orion hatch at y=22.46)
  const crewAccessArm = new THREE.Group();
  crewAccessArm.position.set(halfW, 22.46, 0);
  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(4.05, 0.78, 1.0),
    armWhite,
  );
  walkway.position.set(2.02, 0, 0);
  walkway.castShadow = true;
  crewAccessArm.add(walkway);
  // Environmental Enclosure White Room at distal end
  const whiteRoom = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 1.45, 1.3),
    armWhite,
  );
  whiteRoom.position.set(4.1, 0.32, 0);
  whiteRoom.castShadow = true;
  crewAccessArm.add(whiteRoom);
  const bellows = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.95, 1.15),
    darkIron,
  );
  bellows.position.set(4.65, 0.32, 0);
  crewAccessArm.add(bellows);
  crewAccessArm.userData.partId = "ml-caa";
  tower.add(crewAccessArm);

  // Top Hammerhead Crane + Lightning Protection Spire
  const craneBoom = new THREE.Mesh(
    new THREE.BoxGeometry(7.2, 0.55, 1.1),
    darkIron,
  );
  craneBoom.position.set(1.2, towerHeight + 0.45, 0);
  tower.add(craneBoom);

  const spire = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.16, 4.6, 8),
    steelMat,
  );
  spire.position.set(0, towerHeight + 2.8, 0);
  tower.add(spire);

  const topBeacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 10, 10),
    beaconMat,
  );
  topBeacon.position.set(0, towerHeight + 5.15, 0);
  tower.add(topBeacon);

  tagPart(tower, "lc39b-tower");
  tagPart(crewAccessArm, "ml-caa");
  return { tower, crewAccessArm };
}

function buildFloridaVegetation(): THREE.Group {
  const g = new THREE.Group();

  // Sabal Palmetto (Florida Cabbage Palm) - 100 instanced trees
  const palmTrunkGeo = new THREE.CylinderGeometry(0.08, 0.14, 2.8, 6);
  palmTrunkGeo.translate(0, 1.4, 0);
  const palmTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.92,
    metalness: 0.05,
  });
  const palmCrownGeo = new THREE.ConeGeometry(1.4, 0.9, 7);
  palmCrownGeo.translate(0, 2.9, 0);
  const palmCrownMat = new THREE.MeshStandardMaterial({
    color: 0x2e5c1e,
    roughness: 0.85,
    metalness: 0.05,
  });

  const numPalms = 100;
  const palmTrunkMesh = new THREE.InstancedMesh(
    palmTrunkGeo,
    palmTrunkMat,
    numPalms,
  );
  const palmCrownMesh = new THREE.InstancedMesh(
    palmCrownGeo,
    palmCrownMat,
    numPalms,
  );
  palmTrunkMesh.castShadow = true;
  palmCrownMesh.castShadow = true;

  // Slash Pine (Pinus elliottii) - 70 instanced trees
  const pineTrunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 4.8, 6);
  pineTrunkGeo.translate(0, 2.4, 0);
  const pineTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x3e2723,
    roughness: 0.95,
    metalness: 0.02,
  });
  const pineFoliageGeo = new THREE.ConeGeometry(1.6, 3.8, 6);
  pineFoliageGeo.translate(0, 4.6, 0);
  const pineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x1b4332,
    roughness: 0.88,
    metalness: 0.05,
  });

  const numPines = 70;
  const pineTrunkMesh = new THREE.InstancedMesh(
    pineTrunkGeo,
    pineTrunkMat,
    numPines,
  );
  const pineFoliageMesh = new THREE.InstancedMesh(
    pineFoliageGeo,
    pineFoliageMat,
    numPines,
  );
  pineTrunkMesh.castShadow = true;
  pineFoliageMesh.castShadow = true;

  const dummy = new THREE.Object3D();

  // Populate Sabal Palms along perimeter berms, crawlerway flanks, and lagoon edges
  let palmIdx = 0;
  for (let i = 0; i < numPalms; i++) {
    const a = (i / numPalms) * Math.PI * 2;
    const r = 58 + ((i * 17) % 55);
    let px = Math.cos(a) * r;
    let pz = Math.sin(a) * r;
    // Keep clear of pad center and flame trench
    if (Math.hypot(px, pz) < 38) {
      px = (px / Math.hypot(px, pz)) * 42;
      pz = (pz / Math.hypot(px, pz)) * 42;
    }
    const scale = 0.75 + ((i * 13) % 40) * 0.01;
    dummy.position.set(px, -0.3, pz);
    dummy.rotation.set(
      (((i * 7) % 15) - 7) * 0.01,
      ((i * 23) % 360) * (Math.PI / 180),
      (((i * 11) % 15) - 7) * 0.01,
    );
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    palmTrunkMesh.setMatrixAt(palmIdx, dummy.matrix);
    palmCrownMesh.setMatrixAt(palmIdx, dummy.matrix);
    palmIdx++;
  }

  // Populate Slash Pines along outer wetlands and distant crawlerway corridor
  let pineIdx = 0;
  for (let i = 0; i < numPines; i++) {
    const angle = 1.8 + ((i * 11) % 50) * 0.06;
    const dist = 75 + ((i * 29) % 120);
    const px = Math.cos(angle) * dist - 30;
    const pz = Math.sin(angle) * dist + 40;
    const scale = 0.8 + ((i * 19) % 35) * 0.012;
    dummy.position.set(px, -0.3, pz);
    dummy.rotation.set(0, ((i * 31) % 360) * (Math.PI / 180), 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    pineTrunkMesh.setMatrixAt(pineIdx, dummy.matrix);
    pineFoliageMesh.setMatrixAt(pineIdx, dummy.matrix);
    pineIdx++;
  }

  palmTrunkMesh.instanceMatrix.needsUpdate = true;
  palmCrownMesh.instanceMatrix.needsUpdate = true;
  pineTrunkMesh.instanceMatrix.needsUpdate = true;
  pineFoliageMesh.instanceMatrix.needsUpdate = true;

  g.add(palmTrunkMesh, palmCrownMesh, pineTrunkMesh, pineFoliageMesh);
  return g;
}

function buildPerimeterInfrastructure(tex: ProceduralTextureSet): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    map: tex.towerSteel,
    color: 0x94a3b8,
    metalness: 0.72,
    roughness: 0.35,
  });
  const whiteTankMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.45,
    roughness: 0.32,
  });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const xenonMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

  // 3 Massive 180-Meter (600 ft) Steel Lattice Lightning Protection Towers in Equilateral Triangle
  // Radius ~52 units (180m scale) at 30° (NE), 150° (NW), and 270° (S)
  const lpsTowerCoords: Array<[number, number]> = [
    [45.0, -26.0], // Tower 1 (North-East)
    [-45.0, -26.0], // Tower 2 (North-West)
    [0.0, 52.0], // Tower 3 (South)
  ];
  const lpsTowerHeight = 38.0;
  const lpsSpireHeight = 6.0;
  const baseW = 1.8;
  const topW = 0.5;
  const tiers = [7, 14, 21, 28, 35];
  const dummy = new THREE.Object3D();

  // Instanced tower tier platforms & red FAA obstruction lights (reduces 36 draw calls to 2)
  const platGeo = new THREE.BoxGeometry(1, 0.22, 1);
  const platInstanced = new THREE.InstancedMesh(
    platGeo,
    steelMat,
    lpsTowerCoords.length * tiers.length,
  );
  const beaconGeo = new THREE.SphereGeometry(0.18, 6, 6);
  const beaconInstanced = new THREE.InstancedMesh(
    beaconGeo,
    beaconMat,
    lpsTowerCoords.length * (tiers.length + 1),
  );
  const mastGeo = new THREE.CylinderGeometry(0.04, 0.16, lpsSpireHeight, 8);
  const mastInstanced = new THREE.InstancedMesh(
    mastGeo,
    steelMat,
    lpsTowerCoords.length,
  );

  let platIdx = 0;
  let beaconIdx = 0;

  lpsTowerCoords.forEach(([tx, tz], tidx) => {
    const lt = new THREE.Group();
    lt.position.set(tx, 0, tz);

    // 4 Tapering Lattice Columns per tower
    const corners = [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ];
    corners.forEach(([cx, cz]) => {
      lt.add(
        createStrutBetween(
          new THREE.Vector3(cx * baseW, 0, cz * baseW),
          new THREE.Vector3(cx * topW, lpsTowerHeight, cz * topW),
          0.12,
          0.22,
          steelMat,
        ),
      );
    });

    // Populate platform and beacon instances for this tower
    tiers.forEach((ty) => {
      const s = baseW - (ty / lpsTowerHeight) * (baseW - topW);
      dummy.position.set(tx, ty, tz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(s * 2.1, 1, s * 2.1);
      dummy.updateMatrix();
      platInstanced.setMatrixAt(platIdx++, dummy.matrix);

      dummy.position.set(tx + s * 1.05, ty + 0.2, tz + s * 1.05);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      beaconInstanced.setMatrixAt(beaconIdx++, dummy.matrix);
    });

    // Mast instance
    dummy.position.set(tx, lpsTowerHeight + lpsSpireHeight / 2, tz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    mastInstanced.setMatrixAt(tidx, dummy.matrix);

    // Apex beacon instance
    dummy.position.set(tx, lpsTowerHeight + lpsSpireHeight + 0.15, tz);
    dummy.scale.set(1.5, 1.5, 1.5);
    dummy.updateMatrix();
    beaconInstanced.setMatrixAt(beaconIdx++, dummy.matrix);

    lt.userData.partId = `lps-tower-${tidx + 1}`;
    g.add(lt);
  });

  platInstanced.instanceMatrix.needsUpdate = true;
  beaconInstanced.instanceMatrix.needsUpdate = true;
  mastInstanced.instanceMatrix.needsUpdate = true;
  g.add(platInstanced, beaconInstanced, mastInstanced);

  // Overhead Catenary Ground Shield Wires Interconnecting the 3 Tower Spires
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
  for (let i = 0; i < 3; i++) {
    const p1 = lpsTowerCoords[i];
    const p2 = lpsTowerCoords[(i + 1) % 3];
    const v1 = new THREE.Vector3(
      p1[0],
      lpsTowerHeight + lpsSpireHeight - 0.4,
      p1[1],
    );
    const v2 = new THREE.Vector3(
      p2[0],
      lpsTowerHeight + lpsSpireHeight - 0.4,
      p2[1],
    );
    // 3-segment catenary with gentle natural sag over the pad
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    mid.y -= 2.2;
    g.add(createStrutBetween(v1, mid, 0.025, 0.025, wireMat));
    g.add(createStrutBetween(mid, v2, 0.025, 0.025, wireMat));
  }

  // 6 Stadium Xenon Floodlight Masts (Instanced: reduces 18 draw calls to 3)
  const floodlightPositions: Array<[number, number]> = [
    [-19, 10],
    [19, 10],
    [-22, -4],
    [22, -4],
    [-16, -19],
    [16, -19],
  ];
  const flPoleGeo = new THREE.CylinderGeometry(0.14, 0.24, 13.5, 8);
  const flRackGeo = new THREE.BoxGeometry(2.6, 1.35, 0.32);
  const flLampGeo = new THREE.PlaneGeometry(2.35, 1.1);

  const flPoleInstanced = new THREE.InstancedMesh(
    flPoleGeo,
    steelMat,
    floodlightPositions.length,
  );
  const flRackInstanced = new THREE.InstancedMesh(
    flRackGeo,
    steelMat,
    floodlightPositions.length,
  );
  const flLampInstanced = new THREE.InstancedMesh(
    flLampGeo,
    xenonMat,
    floodlightPositions.length,
  );

  floodlightPositions.forEach(([fx, fz], idx) => {
    dummy.position.set(fx, 6.75, fz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    flPoleInstanced.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(fx, 13.6, fz);
    dummy.lookAt(0, 8, 0);
    dummy.updateMatrix();
    flRackInstanced.setMatrixAt(idx, dummy.matrix);

    dummy.translateZ(0.18);
    dummy.updateMatrix();
    flLampInstanced.setMatrixAt(idx, dummy.matrix);
  });

  flPoleInstanced.instanceMatrix.needsUpdate = true;
  flRackInstanced.instanceMatrix.needsUpdate = true;
  flLampInstanced.instanceMatrix.needsUpdate = true;
  g.add(flPoleInstanced, flRackInstanced, flLampInstanced);

  // LC-39B IOP/SS Deluge Water Tower (4-Leg X-Braced Truss + 300,000 Gallon Water Drum)
  const waterTower = new THREE.Group();
  waterTower.position.set(-34, 0, -14);
  const wtCorners: Array<[number, number]> = [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ];
  wtCorners.forEach(([lx, lz]) => {
    waterTower.add(
      createStrutBetween(
        new THREE.Vector3(lx * 1.45, 0, lz * 1.45),
        new THREE.Vector3(lx * 0.85, 13.0, lz * 0.85),
        0.14,
        0.22,
        steelMat,
      ),
    );
  });
  [4.4, 8.8].forEach((ry) => {
    const s = 1.45 - (ry / 13.0) * 0.6;
    waterTower.add(
      createStrutBetween(
        new THREE.Vector3(-1.4 * s, ry, -1.4 * s),
        new THREE.Vector3(1.4 * s, ry, -1.4 * s),
        0.08,
        0.08,
        steelMat,
      ),
    );
    waterTower.add(
      createStrutBetween(
        new THREE.Vector3(-1.4 * s, ry, 1.4 * s),
        new THREE.Vector3(1.4 * s, ry, 1.4 * s),
        0.08,
        0.08,
        steelMat,
      ),
    );
    waterTower.add(
      createStrutBetween(
        new THREE.Vector3(-1.4 * s, ry, -1.4 * s),
        new THREE.Vector3(-1.4 * s, ry, 1.4 * s),
        0.08,
        0.08,
        steelMat,
      ),
    );
    waterTower.add(
      createStrutBetween(
        new THREE.Vector3(1.4 * s, ry, -1.4 * s),
        new THREE.Vector3(1.4 * s, ry, 1.4 * s),
        0.08,
        0.08,
        steelMat,
      ),
    );
  });
  const wtRiser = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 13.2, 12),
    whiteTankMat,
  );
  wtRiser.position.y = 6.6;
  waterTower.add(wtRiser);
  const wtCatwalk = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 3.5, 0.24, 16),
    steelMat,
  );
  wtCatwalk.position.y = 13.0;
  waterTower.add(wtCatwalk);
  const wtDrum = new THREE.Mesh(
    new THREE.CylinderGeometry(2.85, 2.85, 4.2, 24),
    whiteTankMat,
  );
  wtDrum.position.y = 15.2;
  wtDrum.castShadow = true;
  waterTower.add(wtDrum);
  const wtCap = new THREE.Mesh(
    new THREE.ConeGeometry(2.9, 1.4, 24),
    whiteTankMat,
  );
  wtCap.position.y = 18.0;
  waterTower.add(wtCap);
  g.add(waterTower);

  // Dual 2.1 m Large-Diameter IOP/SS Water Deluge Penstock Lines to Flame Trench
  const delugePipeMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.45,
    roughness: 0.38,
  });
  g.add(
    createStrutBetween(
      new THREE.Vector3(-32, 1.6, -13.2),
      new THREE.Vector3(-5.2, 1.6, -1.8),
      0.32,
      0.32,
      delugePipeMat,
    ),
  );
  g.add(
    createStrutBetween(
      new THREE.Vector3(-32, 1.1, -12.2),
      new THREE.Vector3(-5.2, 1.1, 1.8),
      0.28,
      0.28,
      delugePipeMat,
    ),
  );

  // Spherical LH2 & LOX Cryo Storage Vessels on Braced Ring Legs
  [
    [32, -16, 3.6],
    [38, -8, 2.8],
  ].forEach(([cx, cz, rad]) => {
    const cryo = new THREE.Group();
    cryo.position.set(cx, 0, cz);
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(rad, 24, 18),
      whiteTankMat,
    );
    sphere.position.y = rad + 1.8;
    sphere.castShadow = true;
    cryo.add(sphere);
    const eqRing = new THREE.Mesh(
      new THREE.TorusGeometry(rad * 1.01, 0.14, 8, 24),
      steelMat,
    );
    eqRing.rotation.x = Math.PI / 2;
    eqRing.position.y = rad + 1.8;
    cryo.add(eqRing);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2;
      cryo.add(
        createStrutBetween(
          new THREE.Vector3(
            Math.cos(a) * rad * 0.96,
            0,
            Math.sin(a) * rad * 0.96,
          ),
          new THREE.Vector3(
            Math.cos(a) * rad * 0.96,
            rad + 1.8,
            Math.sin(a) * rad * 0.96,
          ),
          0.14,
          0.18,
          steelMat,
        ),
      );
    }
    const ventStack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 1.6, 10),
      steelMat,
    );
    ventStack.position.y = rad * 2 + 2.1;
    cryo.add(ventStack);
    g.add(cryo);
  });

  // Elevated Insulated LOX / LH2 Cryogenic Transfer Pipes connecting Spheres to Mobile Launcher
  const cryoPipeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.65,
    roughness: 0.25,
  });
  const cryoLegA = createStrutBetween(
    new THREE.Vector3(31, 2.2, -14.5),
    new THREE.Vector3(5.6, 2.2, -2.5),
    0.22,
    0.22,
    cryoPipeMat,
  );
  const cryoLegB = createStrutBetween(
    new THREE.Vector3(36, 1.8, -7.5),
    new THREE.Vector3(5.6, 1.8, 1.8),
    0.18,
    0.18,
    cryoPipeMat,
  );
  g.add(cryoLegA, cryoLegB);

  // Dual-Lane Crawlerway (Two 12.2m lanes separated by a 15.2m grass median)
  // Sweeping South-Southwest toward distant VAB along bearing 215°
  const crawlerGravelMat = new THREE.MeshStandardMaterial({
    color: 0x8c7853,
    roughness: 0.96,
    metalness: 0.03,
  });
  const crawlerMedianMat = new THREE.MeshStandardMaterial({
    color: 0x2d4f1e,
    roughness: 0.95,
    metalness: 0.02,
  });
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.05,
  });

  const crawlerwayGroup = new THREE.Group();
  crawlerwayGroup.position.set(-22, -0.28, 122);
  crawlerwayGroup.rotation.y = -0.24;

  const trackLeft = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.18, 240),
    crawlerGravelMat,
  );
  trackLeft.position.x = -2.8;
  trackLeft.receiveShadow = true;
  const trackRight = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.18, 240),
    crawlerGravelMat,
  );
  trackRight.position.x = 2.8;
  trackRight.receiveShadow = true;
  const medianStrip = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.16, 240),
    crawlerMedianMat,
  );
  medianStrip.receiveShadow = true;
  crawlerwayGroup.add(trackLeft, trackRight, medianStrip);
  g.add(crawlerwayGroup);

  // Outer Asphalt Perimeter Road & Pad Turnaround
  const perimRing = new THREE.Mesh(
    new THREE.RingGeometry(44, 48.5, 48),
    roadMat,
  );
  perimRing.rotation.x = -Math.PI / 2;
  perimRing.position.y = -0.34;
  perimRing.receiveShadow = true;
  g.add(perimRing);

  // Atlantic Ocean Surf & Space Coast Barrier Beach along East Horizon
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(920, 360),
    new THREE.MeshStandardMaterial({
      color: 0x0369a1,
      roughness: 0.28,
      metalness: 0.42,
    }),
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(48, -0.52, -240);
  g.add(ocean);

  const beachSand = new THREE.Mesh(
    new THREE.BoxGeometry(900, 0.32, 28),
    new THREE.MeshStandardMaterial({
      color: 0xc2b280,
      roughness: 0.94,
      metalness: 0,
    }),
  );
  beachSand.position.set(24, -0.32, -112);
  g.add(beachSand);

  // Inland Banana River / Mosquito Lagoon Brackish Wetland Plane (West / South-West)
  const wetlandWater = new THREE.Mesh(
    new THREE.PlaneGeometry(360, 480),
    new THREE.MeshStandardMaterial({
      color: 0x0f343a,
      roughness: 0.35,
      metalness: 0.35,
    }),
  );
  wetlandWater.rotation.x = -Math.PI / 2;
  wetlandWater.position.set(-180, -0.48, 60);
  g.add(wetlandWater);

  // Distant NASA Vehicle Assembly Building (VAB) & Launch Control Center (LCC)
  // Placed at verified KSC bearing 215° SSW (x = -168, z = 240)
  const vabGroup = new THREE.Group();
  vabGroup.position.set(-168, 0, 240);
  vabGroup.rotation.y = 0.38;
  const vabWallMat = new THREE.MeshStandardMaterial({
    color: 0xa0aec0,
    roughness: 0.72,
    metalness: 0.15,
  });
  const vabDoorMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.65,
    metalness: 0.35,
  });
  const vabRedMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.6,
  });
  const vabBlueMat = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.6,
  });
  const lccGlassMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.2,
    metalness: 0.6,
    transparent: true,
    opacity: 0.85,
  });

  // Main High Bay (160m tall scale: 40 units tall, 36 units wide, 32 units deep)
  const vabMain = new THREE.Mesh(new THREE.BoxGeometry(36, 40, 32), vabWallMat);
  vabMain.position.y = 20;
  vabMain.castShadow = true;
  vabGroup.add(vabMain);

  // Low Bay Annex (East extension)
  const vabLowBay = new THREE.Mesh(
    new THREE.BoxGeometry(22, 18, 28),
    vabWallMat,
  );
  vabLowBay.position.set(26, 9, 0);
  vabGroup.add(vabLowBay);

  // High-Bay Roll-Up Doors (139m scale)
  const vabDoor = new THREE.Mesh(
    new THREE.BoxGeometry(8.5, 34, 0.6),
    vabDoorMat,
  );
  vabDoor.position.set(-6, 17, -16.1);
  vabGroup.add(vabDoor);

  // Vertical Stripes & NASA High-Bay Façade Accents
  const flagRed = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 14), vabRedMat);
  flagRed.position.set(5.5, 24, -16.2);
  flagRed.rotation.y = Math.PI;
  const flagWhite = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 14),
    whiteTankMat,
  );
  flagWhite.position.set(7.7, 24, -16.2);
  flagWhite.rotation.y = Math.PI;
  const flagBlue = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 14), vabBlueMat);
  flagBlue.position.set(10.4, 24, -16.2);
  flagBlue.rotation.y = Math.PI;
  vabGroup.add(flagRed, flagWhite, flagBlue);

  // Launch Control Center (LCC) 4-Story Wing with canted observation glass windows
  const lccGroup = new THREE.Group();
  lccGroup.position.set(38, 0, -8);
  const lccBase = new THREE.Mesh(
    new THREE.BoxGeometry(14, 7.5, 10),
    vabWallMat,
  );
  lccBase.position.y = 3.75;
  lccGroup.add(lccBase);
  // Canted observation window gallery facing northeast toward LC-39B
  const lccGlass = new THREE.Mesh(
    new THREE.BoxGeometry(13.2, 2.2, 1.2),
    lccGlassMat,
  );
  lccGlass.position.set(0, 5.8, -5.1);
  lccGlass.rotation.x = -0.22;
  lccGroup.add(lccGlass);
  vabGroup.add(lccGroup);

  // Load official NASA 3D Model of the Vehicle Assembly Building asynchronously
  if (typeof Image !== "undefined") {
    const gltfLoader = getSharedGLTFLoader();
    if (gltfLoader) {
      gltfLoader.load("/assets/structures/vab.glb", (gltf) => {
        const m = gltf.scene;
        const plainWallMat = new THREE.MeshStandardMaterial({
          color: 0x94a3b8,
          roughness: 0.72,
          metalness: 0.15,
        });
        m.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (
              child.material &&
              (child.material.name === "lambert10SG.001" ||
                child.material.name === "initialShadingGroup.001" ||
                (child.material.map &&
                  child.material.map.name?.includes("vabwall")))
            ) {
              child.material = plainWallMat;
            }
          }
        });
        // Real VAB is 160m tall (160 units in model). Scale 0.25 yields 40 units high, matching procedural high bay.
        m.scale.setScalar(0.25);
        m.position.set(0, 0, 0);
        vabMain.visible = false;
        vabLowBay.visible = false;
        vabDoor.visible = false;
        flagRed.visible = false;
        flagWhite.visible = false;
        flagBlue.visible = false;
        vabGroup.add(m);
      });
    }
  }

  g.add(vabGroup);

  // Instanced Florida Space Coast Vegetation (Palmettos & Slash Pines)
  g.add(buildFloridaVegetation());

  // S-Band Telemetry Tracking Dish Station (Lattice Pedestal + Elevation Yoke + Tripod Feedhorn)
  const dishBase = new THREE.Group();
  dishBase.position.set(42, 0, 28);
  const dFoot = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.2, 0.8, 12),
    steelMat,
  );
  dFoot.position.y = 0.4;
  dishBase.add(dFoot);
  const dPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 1.15, 4.4, 12),
    whiteTankMat,
  );
  dPedestal.position.y = 2.8;
  dishBase.add(dPedestal);
  const dYoke = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 1.1), steelMat);
  dYoke.position.y = 5.1;
  dishBase.add(dYoke);
  const dDish = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.65,
      roughness: 0.26,
      side: THREE.DoubleSide,
    }),
  );
  dDish.position.y = 6.2;
  dDish.rotation.x = Math.PI * 0.72;
  dishBase.add(dDish);
  const dFeed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.16, 1.9, 8),
    steelMat,
  );
  dFeed.position.set(0, 6.7, -1.25);
  dFeed.rotation.x = Math.PI * 0.22;
  dishBase.add(dFeed);
  g.add(dishBase);

  return g;
}

export function createLaunchComplexAndSLS(
  tex: ProceduralTextureSet,
  planetMaps: RealPlanetMaps,
): LaunchComplexHandles {
  // Blueprint Accurate: SLS Block 1 (111.3m height, Core 65.1m x 8.4m, Twin SRBs 54.9m x 3.7m, Orion + LAS 9.8m)
  const group = new THREE.Group();
  group.visible = false;

  const skyDomeMat = new THREE.MeshBasicMaterial({
    map: tex.duskSky,
    side: THREE.BackSide,
    fog: false,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
  });
  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(760, 32, 22),
    skyDomeMat,
  );
  group.add(skyDome);

  // Realistic Distant Moon Hanging High in the Upper-Right Sky (never floating near the launch tower)
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(9.2, 44, 32),
    new THREE.MeshStandardMaterial({
      map: planetMaps.moonMap,
      color: 0xf8fafc,
      emissive: 0x1e293b,
      emissiveIntensity: 0.22,
      roughness: 0.92,
      metalness: 0.0,
      envMapIntensity: 0.12,
      fog: false,
    }),
  );
  moonMesh.position.set(64, 178, -485);
  group.add(moonMesh);

  // Atmospheric Cloud Deck Floating Across Space Coast Horizon
  const cloudLayer = new THREE.Group();
  const cloudMat = new THREE.SpriteMaterial({
    map: tex.cloudPuff,
    color: 0xfde68a,
    transparent: true,
    opacity: 0.44,
    depthWrite: false,
  });
  const coolCloudMat = new THREE.SpriteMaterial({
    map: tex.cloudPuff,
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  for (let i = 0; i < 36; i++) {
    const sp = new THREE.Sprite(i % 2 === 0 ? cloudMat : coolCloudMat);
    const angle = (i / 36) * Math.PI * 1.4 - Math.PI * 0.7;
    const dist = 145 + (i % 5) * 34;
    sp.position.set(
      Math.sin(angle) * dist,
      18 + (i % 6) * 5.5,
      -Math.cos(angle) * dist,
    );
    const w = 48 + (i % 4) * 18;
    sp.scale.set(w, w * 0.32, 1);
    cloudLayer.add(sp);
  }
  group.add(cloudLayer);

  // Pad 39B Ground Complex
  const groundGroup = new THREE.Group();
  const plain = new THREE.Mesh(
    new THREE.CircleGeometry(480, 56),
    new THREE.MeshStandardMaterial({
      map: tex.kscGround,
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0,
    }),
  );
  plain.rotation.x = -Math.PI / 2;
  plain.position.y = -0.4;
  plain.receiveShadow = true;
  groundGroup.add(plain);

  const { trenchGroup, mlpBase } = buildMobileLauncherAndTrench(tex);
  groundGroup.add(trenchGroup);
  const { tower, crewAccessArm } = buildLC39BServiceTower(tex);
  groundGroup.add(tower);
  groundGroup.add(buildPerimeterInfrastructure(tex));

  const trenchLight = new THREE.PointLight(0xf97316, 0, 72);
  trenchLight.position.set(0, 2.2, 2.2);
  groundGroup.add(trenchLight);

  // Pad Xenon Spotlight illuminating SLS hull & LC-39B tower with crisp contrast
  const padSpotlight = new THREE.SpotLight(
    0xe0f2fe,
    5.8,
    120,
    Math.PI / 3.8,
    0.55,
    0.6,
  );
  padSpotlight.position.set(19, 10, 24);
  padSpotlight.target.position.set(0, 14, 0);
  groundGroup.add(padSpotlight, padSpotlight.target);
  group.add(groundGroup);

  // Curved Earth Horizon with Real Surface Map + Rayleigh Surface Scatter + Blue Rim Halo for > 16 km
  const earthLimb = new THREE.Group();
  earthLimb.position.set(0, -104, 0);
  const earthLimbGlobeMat = new THREE.MeshStandardMaterial({
    map: planetMaps.earthMap,
    color: 0xffffff,
    roughness: 0.56,
    metalness: 0.08,
    envMapIntensity: 0.24,
    emissive: 0x051b2c,
    emissiveIntensity: 0.08,
    transparent: true,
    opacity: 0,
  });
  earthLimb.add(
    new THREE.Mesh(new THREE.SphereGeometry(95, 56, 36), earthLimbGlobeMat),
  );
  const earthLimbClouds = new THREE.Mesh(
    new THREE.SphereGeometry(95.22, 52, 34),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      alphaMap: planetMaps.earthCloudsMap,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      roughness: 0.92,
    }),
  );
  earthLimb.add(earthLimbClouds);
  const earthLimbScatter = new THREE.Mesh(
    new THREE.SphereGeometry(95.35, 56, 36),
    createEarthSurfaceScatteringMaterial(0.84),
  );
  earthLimb.add(earthLimbScatter);
  const earthLimbAtmo = new THREE.Mesh(
    new THREE.SphereGeometry(98.2, 48, 32),
    createPlanetAtmosphereMaterial({
      dayColor: 0x3b9eff,
      twilightColor: 0xfb923c,
      intensity: 1.16,
      power: 2.2,
      nightFloor: 0.24,
    }),
  );
  earthLimb.add(earthLimbAtmo);
  earthLimb.visible = false;
  group.add(earthLimb);

  // Low Earth Orbit (LEO) Parking Trajectory Arc aligned in Orion's orbital plane above Earth's atmosphere
  const leoOrbitRing = new THREE.Mesh(
    new THREE.TorusGeometry(108.5, 0.14, 12, 144),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.42,
    }),
  );
  leoOrbitRing.position.copy(earthLimb.position);
  leoOrbitRing.visible = false;
  group.add(leoOrbitRing);

  // SLS Block 1 Stack — Calibrated to NASA 98.3m height x 8.4m core (11.7:1 fineness at 1 unit = 4 m)
  const rocketFull = new THREE.Group();
  const coreGroup = new THREE.Group();
  const coreStage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 16.15, 32),
    new THREE.MeshStandardMaterial({
      map: tex.slsCore,
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0.16,
    }),
  );
  coreStage.position.y = 8.98;
  coreStage.castShadow = true;
  coreGroup.add(coreStage);

  // External LOX Feedlines & Avionics System Tunnel along Core Stage
  const feedMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.48,
    metalness: 0.25,
  });
  const racewayMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    roughness: 0.42,
    metalness: 0.28,
  });
  [-1.07, 1.07].forEach((fx) => {
    const conduit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 14.0, 10),
      feedMat,
    );
    conduit.position.set(fx, 8.75, 0.22);
    coreGroup.add(conduit);
  });
  const sysTunnel = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 14.4, 0.16),
    racewayMat,
  );
  sysTunnel.position.set(0, 8.95, 1.07);
  coreGroup.add(sysTunnel);

  // 4 Detailed RS-25 Engine Bells + Turbopump Gimbal Collars + Glowing Throats (own group for sls-rs25)
  const rs25Positions: Array<[number, number, number]> = [
    [-0.42, 1.06, -0.42],
    [0.42, 1.06, -0.42],
    [-0.42, 1.06, 0.42],
    [0.42, 1.06, 0.42],
  ];
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.92,
    roughness: 0.18,
    side: THREE.DoubleSide,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
  });
  const throatMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const rs25Group = new THREE.Group();
  const rs25EngineGroups: THREE.Group[] = [];
  const rs25Emitters: THREE.Group[] = [];
  rs25Positions.forEach(([px, py, pz], engIdx) => {
    const engGroup = new THREE.Group();
    engGroup.position.set(px, py, pz);
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.23, 0.23, 0.26, 14),
      collarMat,
    );
    collar.position.set(0, 0, 0);
    engGroup.add(collar);
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.42, 0.9, 22, 1, true),
      bellMat,
    );
    bell.position.set(0, -0.48, 0);
    engGroup.add(bell);
    const throat = new THREE.Mesh(
      new THREE.CircleGeometry(0.15, 14),
      throatMat,
    );
    throat.rotation.x = Math.PI / 2;
    throat.position.set(0, -0.2, 0);
    engGroup.add(throat);

    // Dedicated RS-25 exhaust emitter base at nozzle exit plane (-0.48 - 0.45 = -0.93)
    const rs25Emitter = new THREE.Group();
    rs25Emitter.name = `rs25-emitter-${engIdx + 1}`;
    rs25Emitter.userData = {
      type: "exhaustEmitter",
      engine: "rs25",
      subEngineIndex: engIdx + 1,
    };
    rs25Emitter.position.set(0, -0.93, 0);

    const rs25OuterGeo = new THREE.ConeGeometry(0.32, 3.2, 16);
    rs25OuterGeo.rotateX(Math.PI);
    rs25OuterGeo.translate(0, -1.6, 0);
    const rs25Outer = new THREE.Mesh(
      rs25OuterGeo,
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    const rs25CoreGeo = new THREE.ConeGeometry(0.16, 1.9, 12);
    rs25CoreGeo.rotateX(Math.PI);
    rs25CoreGeo.translate(0, -0.95, 0);
    const rs25Core = new THREE.Mesh(
      rs25CoreGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfef9c3,
        transparent: true,
        opacity: 0.96,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    rs25Emitter.add(rs25Outer, rs25Core);
    rs25Emitter.visible = false;
    engGroup.add(rs25Emitter);
    rs25Emitters.push(rs25Emitter);

    engGroup.traverse((c) => {
      c.userData.subEngineIndex = engIdx + 1;
    });
    rs25Group.add(engGroup);
    rs25EngineGroups.push(engGroup);
  });
  tagPart(rs25Group, "sls-rs25");

  // Launch Vehicle Stage Adapter (LVSA) stays attached to Core Stage upon MECO separation,
  // cleanly exposing ICPS + RL10B-2 vacuum nozzle bell on the remaining upper stage!
  const lvsa = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 1.05, 1.45, 28),
    new THREE.MeshStandardMaterial({
      color: 0xea580c,
      roughness: 0.46,
      metalness: 0.22,
    }),
  );
  lvsa.position.y = 17.78;
  coreGroup.add(lvsa);
  const lvsaCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 0.66, 0.14, 28),
    collarMat,
  );
  lvsaCollar.position.y = 18.46;
  coreGroup.add(lvsaCollar);

  tagPart(coreGroup, "sls-core");

  // Twin 5-Segment Solid Rocket Boosters (54.9m = 13.73u height x 3.71m = 0.464u radius)
  const makeSrb = (xOffset: number) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.464, 0.464, 10.9, 24),
      new THREE.MeshStandardMaterial({
        map: tex.slsSrb,
        color: 0xffffff,
        roughness: 0.34,
        metalness: 0.18,
      }),
    );
    body.position.set(xOffset, 6.85, 0);
    body.castShadow = true;
    g.add(body);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.464, 1.95, 24),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.28,
        metalness: 0.18,
      }),
    );
    cone.position.set(xOffset, 13.28, 0);
    g.add(cone);

    // 5-Segment Field Joint Stiffener Rings
    [2.8, 5.1, 7.4, 9.7].forEach((ry) => {
      const ring = new THREE.Mesh(
        new THREE.CylinderGeometry(0.484, 0.484, 0.1, 20),
        collarMat,
      );
      ring.position.set(xOffset, ry, 0);
      g.add(ring);
    });

    // Upper & Lower Heavy Attach Struts to Core Stage
    [3.0, 11.2].forEach((sy) => {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(0.58, 0.22, 0.3),
        collarMat,
      );
      strut.position.set(xOffset * 0.76, sy, 0);
      g.add(strut);
    });

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.464, 0.64, 1.05, 20),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.38,
        metalness: 0.2,
      }),
    );
    skirt.position.set(xOffset, 0.98, 0);
    g.add(skirt);

    const srbNozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.21, 0.42, 0.62, 18, 1, true),
      bellMat,
    );
    srbNozzle.position.set(xOffset, 0.32, 0);
    g.add(srbNozzle);

    // Dedicated SRB exhaust flame emitter at nozzle exit plane (y = 0.32 - 0.31 = 0.01)
    const srbEmitter = new THREE.Group();
    srbEmitter.name = `srb-emitter-${xOffset < 0 ? "left" : "right"}`;
    srbEmitter.userData = {
      type: "exhaustEmitter",
      engine: "srb",
      side: xOffset < 0 ? "left" : "right",
    };
    srbEmitter.position.set(xOffset, 0.01, 0);

    const haloGeo = new THREE.ConeGeometry(1.25, 7.2, 18);
    haloGeo.rotateX(Math.PI);
    haloGeo.translate(0, -3.6, 0);
    const srbHalo = new THREE.Mesh(
      haloGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.36,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    const outerGeo = new THREE.ConeGeometry(0.82, 5.8, 16);
    outerGeo.rotateX(Math.PI);
    outerGeo.translate(0, -2.9, 0);
    const srbOuter = new THREE.Mesh(
      outerGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    const coreGeo = new THREE.ConeGeometry(0.46, 3.8, 14);
    coreGeo.rotateX(Math.PI);
    coreGeo.translate(0, -1.9, 0);
    const srbInner = new THREE.Mesh(
      coreGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfef08a,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );

    srbEmitter.add(srbHalo, srbOuter, srbInner);
    srbEmitter.visible = false;
    g.add(srbEmitter);

    // Booster Separation Motor (BSM) radial plume puff
    const bsm = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 2.0, 10),
      new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.92,
      }),
    );
    bsm.position.set(xOffset - Math.sign(xOffset) * 0.42, 12.6, 0);
    bsm.rotation.z = Math.sign(xOffset) * (Math.PI / 2);
    bsm.visible = false;
    g.add(bsm);

    tagPart(g, "sls-boosters", [Math.sign(xOffset) * 4.2, -0.4, 0]);
    return { g, bsm, emitter: srbEmitter };
  };
  const srbLeftBuilt = makeSrb(-1.55);
  const srbRightBuilt = makeSrb(1.55);
  const srbLeft = srbLeftBuilt.g;
  const srbRight = srbRightBuilt.g;
  const srbLeftBsm = srbLeftBuilt.bsm;
  const srbRightBsm = srbRightBuilt.bsm;
  const srbLeftEmitter = srbLeftBuilt.emitter;
  const srbRightEmitter = srbRightBuilt.emitter;

  // Upper Stage Stack (ICPS 5.1m dia + RL10B-2 Bell + OSA + ESA Service Module + Unfolding X-Wing Solar Arrays + Orion + LAS)
  const upperGroup = new THREE.Group();
  const icpsGroup = new THREE.Group();

  // ICPS Aft Carbon-Composite Thrust Structure & Cryogenic COPV Helium Spheres
  const icpsAftSkirt = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.34, 0.56, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.38,
      metalness: 0.72,
    }),
  );
  icpsAftSkirt.position.y = 18.42;
  icpsGroup.add(icpsAftSkirt);

  [-0.42, 0.42].forEach((hx) => {
    const heliumTank = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 14, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.28,
        metalness: 0.78,
      }),
    );
    heliumTank.position.set(hx, 18.28, 0.22);
    icpsGroup.add(heliumTank);
  });

  const icps = new THREE.Mesh(
    new THREE.CylinderGeometry(0.64, 0.64, 1.72, 28),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.36,
    }),
  );
  icps.position.y = 19.52;
  icpsGroup.add(icps);

  // ICPS Structural Rib Collars
  [18.74, 20.32].forEach((ry) => {
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(0.655, 0.655, 0.09, 28),
      collarMat,
    );
    ring.position.y = ry;
    icpsGroup.add(ring);
  });

  // Exposed RL10B-2 Extendable Carbon-Carbon Vacuum Engine Bell & Luminous Cryogenic Plume
  const rl10Gimbal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.18, 0.24, 16),
    collarMat,
  );
  rl10Gimbal.position.y = 18.08;
  icpsGroup.add(rl10Gimbal);

  const icpsNozzleMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.88,
    roughness: 0.26,
    side: THREE.DoubleSide,
  });
  const icpsNozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.4, 0.86, 24, 1, true),
    icpsNozzleMat,
  );
  icpsNozzle.position.y = 17.64;
  icpsGroup.add(icpsNozzle);

  const icpsThroatGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.15, 16),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.DoubleSide }),
  );
  icpsThroatGlow.rotation.x = Math.PI / 2;
  icpsThroatGlow.position.y = 17.95;
  icpsGroup.add(icpsThroatGlow);

  const icpsFlame = new THREE.Group();
  icpsFlame.position.y = 17.22;
  const icpsOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.68, 4.8, 18),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.68,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  icpsOuter.rotation.x = Math.PI;
  icpsOuter.position.y = -2.4;
  const icpsCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 2.7, 14),
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  icpsCore.rotation.x = Math.PI;
  icpsCore.position.y = -1.35;
  icpsFlame.add(icpsOuter, icpsCore);
  icpsFlame.visible = false;
  icpsGroup.add(icpsFlame);

  // NASA Meatball decal cleanly mounted on ICPS fairing
  const orionDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.44, 0.44),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true }),
  );
  orionDecal.position.set(0, 19.55, 0.66);
  icpsGroup.add(orionDecal);
  tagPart(icpsGroup, "sls-icps");
  upperGroup.add(icpsGroup);

  const orionStack = new THREE.Group();
  const esmGroup = new THREE.Group();
  const stageAdapter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.63, 0.64, 0.44, 28),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.32,
      metalness: 0.4,
    }),
  );
  stageAdapter.position.y = 20.62;
  esmGroup.add(stageAdapter);

  // European Service Module (ESM) cylindrical bus + unfolding 4-wing X-Wing Solar Arrays & RCS quads
  const esmBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.63, 0.63, 0.78, 26),
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.3,
      metalness: 0.68,
    }),
  );
  esmBody.position.y = 21.22;
  esmGroup.add(esmBody);

  const esmSolarPivots: THREE.Group[] = [];
  const esmWingMat = new THREE.MeshStandardMaterial({
    map: tex.solarPanel,
    color: 0xbfdbfe,
    metalness: 0.52,
    roughness: 0.22,
  });
  [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((ea) => {
    const wingAngle = ea + Math.PI / 4;
    const yawWrap = new THREE.Group();
    yawWrap.position.set(
      Math.sin(wingAngle) * 0.66,
      21.42,
      Math.cos(wingAngle) * 0.66,
    );
    yawWrap.rotation.y = wingAngle;

    const hingePivot = new THREE.Group();
    // Folded vertically along ESM during atmospheric ascent; negative X rotation unfolds radially outward into X-wing
    const wingMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 1.48, 0.05),
      esmWingMat,
    );
    wingMesh.position.y = -0.74;
    const wingBoom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.54, 8),
      collarMat,
    );
    wingBoom.position.y = -0.74;
    hingePivot.add(wingMesh, wingBoom);

    yawWrap.add(hingePivot);
    esmGroup.add(yawWrap);
    esmSolarPivots.push(hingePivot);

    const rcsPod = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.14, 0.1),
      collarMat,
    );
    rcsPod.position.set(Math.sin(ea) * 0.67, 21.38, Math.cos(ea) * 0.67);
    esmGroup.add(rcsPod);
  });

  const heatshieldRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.63, 0.14, 28),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.48,
      metalness: 0.45,
    }),
  );
  heatshieldRing.position.y = 21.68;
  esmGroup.add(heatshieldRing);
  tagPart(esmGroup, "sls-esm");
  orionStack.add(esmGroup);

  // Orion Crew Module frustum seated flush atop ESM (5.02m dia = 0.628u max radius)
  const orionGroup = new THREE.Group();
  const orion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.64, 0.86, 28),
    new THREE.MeshStandardMaterial({
      map: tex.orionTile,
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.3,
    }),
  );
  orion.position.y = 22.18;
  orionGroup.add(orion);

  // Orion Crew Cockpit Windows & Forward Docking Collar (exposed cleanly once LAS jettisons!)
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x0ea5e9,
    emissive: 0x0284c7,
    emissiveIntensity: 0.45,
    metalness: 0.9,
    roughness: 0.1,
  });
  [-0.14, 0.14].forEach((wx) => {
    const win = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.08, 0.04),
      windowMat,
    );
    win.position.set(wx, 22.28, 0.47);
    win.rotation.x = -0.36;
    orionGroup.add(win);
  });
  const dockingCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.32, 0.16, 20),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.72,
      roughness: 0.25,
    }),
  );
  dockingCollar.position.y = 22.68;
  orionGroup.add(dockingCollar);
  tagPart(orionGroup, "sls-orion");
  orionStack.add(orionGroup);

  // Transonic Mach-1 Condensation Vapor Cone
  const machCone = new THREE.Mesh(
    new THREE.ConeGeometry(3.0, 3.6, 28, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  machCone.position.y = 18.4;
  machCone.visible = false;
  orionStack.add(machCone);

  // Hypersonic Aerothermal Shock Glow Mesh (Max-Q / Mach 1.3 to 4.5)
  const thermalGlowCone = new THREE.Mesh(
    new THREE.ConeGeometry(1.65, 4.8, 28, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  thermalGlowCone.position.y = 23.8;
  thermalGlowCone.visible = false;
  orionStack.add(thermalGlowCone);

  // Launch Abort System (LAS) Ogive Fairing & Escape Tower -> Tip reaches y = 25.47 (height = 24.57u = 98.3m)
  const abortTower = new THREE.Group();
  abortTower.position.y = 23.02;
  const lasBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.35, 1.38, 24),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.22,
    }),
  );
  lasBody.position.y = 0.62;
  abortTower.add(lasBody);
  const lasCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.13, 16),
    collarMat,
  );
  lasCollar.position.y = 1.28;
  abortTower.add(lasCollar);
  [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((na) => {
    const abortNoz = new THREE.Mesh(
      new THREE.ConeGeometry(0.048, 0.17, 8),
      bellMat,
    );
    abortNoz.position.set(Math.sin(na) * 0.17, 1.2, Math.cos(na) * 0.17);
    abortNoz.rotation.x = Math.cos(na) * 0.45;
    abortNoz.rotation.z = -Math.sin(na) * 0.45;
    abortTower.add(abortNoz);
  });
  const lasTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 1.22, 18),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.28,
      metalness: 0.22,
    }),
  );
  lasTip.position.y = 1.92;
  abortTower.add(lasTip);
  const lasFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.34, 2.4, 12),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
    }),
  );
  lasFlame.rotation.x = Math.PI;
  lasFlame.position.y = -0.38;
  lasFlame.visible = false;
  abortTower.add(lasFlame);
  tagPart(abortTower, "sls-las");
  orionStack.add(abortTower);

  upperGroup.add(orionStack);

  // RS-25 Shock Train / Mach Diamonds (Sea-Level Core Plume Shock Disks downstream of nozzle exits)
  const machDiamondsGroup = new THREE.Group();
  machDiamondsGroup.position.set(0, 0.13, 0);
  const outerDiamondMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const innerDiamondMat = new THREE.MeshBasicMaterial({
    color: 0xfef9c3,
    transparent: true,
    opacity: 0.98,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  [0.55, 1.25, 2.0, 2.75].forEach((dy, idx) => {
    const s = 1.0 - idx * 0.16;
    const outerD = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18 * s, 0),
      outerDiamondMat,
    );
    outerD.scale.set(0.9, 1.8, 0.9);
    outerD.position.set(0, -dy, 0);
    const innerD = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.09 * s, 0),
      innerDiamondMat,
    );
    innerD.scale.set(0.8, 1.5, 0.8);
    innerD.position.set(0, -dy, 0);
    machDiamondsGroup.add(outerD, innerD);
  });
  machDiamondsGroup.visible = false;
  coreGroup.add(machDiamondsGroup);

  // flameGroup maintained for backward compatibility (shares visibility with RS-25 cluster)
  const flameGroup = new THREE.Group();
  flameGroup.position.set(0, 0.13, 0);
  flameGroup.visible = false;
  coreGroup.add(flameGroup);

  const rocketEngineGlow = new THREE.PointLight(0xfdba74, 0, 42, 1.2);
  rocketEngineGlow.position.set(0, -1.2, 1.5);
  rocketFull.add(rocketEngineGlow);

  rocketFull.add(coreGroup, rs25Group, srbLeft, srbRight, upperGroup);
  group.add(rocketFull);

  // Load official NASA 3D Model of SLS Block 1 asynchronously
  if (typeof Image !== "undefined") {
    const gltfLoader = getSharedGLTFLoader();
    if (gltfLoader) {
      gltfLoader.load("/assets/rockets/sls_block1.glb", (gltf) => {
        const root = gltf.scene;
        root.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // 1 unit = 4 meters: scale factor 0.25
        root.scale.setScalar(0.25);

        // Find individual staging nodes
        const srbL = root.getObjectByName("srb_left");
        const srbR = root.getObjectByName("srb_right");
        const core = root.getObjectByName("core_stage");
        const rs25 = root.getObjectByName("rs25_engines");
        const icps = root.getObjectByName("icps");
        const esm = root.getObjectByName("orion_esm");
        const cm = root.getObjectByName("orion_cm");
        const las = root.getObjectByName("orion_las");

        if (srbL && srbR && core && rs25 && icps && esm && cm && las) {
          // Hide procedural meshes while preserving emitters, lights, and gimbals
          srbLeft.children.forEach((c) => {
            if (c instanceof THREE.Mesh && !c.name.includes("emitter"))
              c.visible = false;
          });
          srbRight.children.forEach((c) => {
            if (c instanceof THREE.Mesh && !c.name.includes("emitter"))
              c.visible = false;
          });
          coreGroup.children.forEach((c) => {
            if (c instanceof THREE.Mesh) c.visible = false;
          });
          rs25EngineGroups.forEach((eg) => {
            eg.children.forEach((c) => {
              if (c instanceof THREE.Mesh && !c.name.includes("emitter"))
                c.visible = false;
            });
          });
          icpsGroup.children.forEach((c) => {
            if (c instanceof THREE.Mesh) c.visible = false;
          });
          orionGroup.children.forEach((c) => {
            if (c instanceof THREE.Mesh) c.visible = false;
          });
          abortTower.children.forEach((c) => {
            if (c instanceof THREE.Mesh) c.visible = false;
          });

          // Tag parts for Hardware Bay Inspector (all 7 SLS parts mapped 1:1)
          tagPart(core, "sls-core");
          tagPart(rs25, "sls-rs25");
          tagPart(srbL, "sls-boosters");
          tagPart(srbR, "sls-boosters");
          tagPart(icps, "sls-icps");
          tagPart(esm, "sls-esm");
          tagPart(cm, "sls-orion");
          tagPart(las, "sls-las");

          // Scale factor 0.25 converts real-world meters to simulator units (1 unit = 4 m)
          const scale = 0.25;
          core.scale.setScalar(scale);
          rs25.scale.setScalar(scale);
          icps.scale.setScalar(scale);
          esm.scale.setScalar(scale);
          cm.scale.setScalar(scale);
          srbL.scale.setScalar(scale);
          srbR.scale.setScalar(scale);
          las.scale.setScalar(scale);

          // Center SRBs along their parent pivot centerlines (x = +/- 1.535 u)
          srbL.position.set(6.14, 0, 0);
          srbR.position.set(-6.14, 0, 0);

          // Position LAS relative to abortTower base (y = 20.30 u)
          abortTower.userData.baseY = 20.3;
          abortTower.position.y = 20.3;
          las.position.set(0, -81.19, 0);

          coreGroup.add(core);
          rs25Group.add(rs25);
          srbLeft.add(srbL);
          srbRight.add(srbR);
          icpsGroup.add(icps);
          orionGroup.add(esm, cm);
          abortTower.add(las);
        } else {
          rocketFull.add(root);
        }
      });
    }
  }

  return {
    group,
    groundGroup,
    skyDomeMat,
    cloudMat,
    coolCloudMat,
    earthLimb,
    earthLimbGlobeMat,
    earthLimbScatter,
    earthLimbAtmo,
    moonMesh,
    cloudLayer,
    crewAccessArm,
    rocketFull,
    coreGroup,
    rs25Group,
    rs25EngineGroups,
    rs25Emitters,
    srbLeft,
    srbRight,
    srbLeftEmitter,
    srbRightEmitter,
    srbLeftBsm,
    srbRightBsm,
    upperGroup,
    icpsFlame,
    esmGroup,
    esmSolarPivots,
    orionGroup,
    machCone,
    thermalGlowCone,
    abortTower,
    lasFlame,
    flameGroup,
    machDiamondsGroup,
    trenchLight,
    rocketEngineGlow,
    padSpotlight,
    leoOrbitRing,
  };
}

// Blueprint-Accurate TDRS / HERMES Relay Satellite (from NASA Satellites & Space Probes Blueprint)
export interface OrbitalSatelliteHandles {
  group: THREE.Group;
  busGroup: THREE.Group;
  solarLeftPivot: THREE.Group;
  solarRightPivot: THREE.Group;
  dishPivot: THREE.Group;
  umbrellaLeft: THREE.Group;
  umbrellaRight: THREE.Group;
  beaconMesh: THREE.Mesh;
  linkBeam: THREE.Mesh;
}

export function createOrbitalSatellite(
  tex: ProceduralTextureSet,
): OrbitalSatelliteHandles {
  const group = new THREE.Group();
  const busGroup = new THREE.Group();

  const foilMat = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    bumpMap: tex.foilBump,
    bumpScale: 0.1,
    color: 0xffffff,
    metalness: 0.88,
    roughness: 0.22,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.72,
    roughness: 0.26,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.82,
    roughness: 0.28,
  });
  const meshGoldMat = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    color: 0xfde047,
    metalness: 0.85,
    roughness: 0.26,
    side: THREE.DoubleSide,
  });
  const solarMat = new THREE.MeshStandardMaterial({
    map: tex.solarPanel,
    color: 0xdbeafe,
    metalness: 0.52,
    roughness: 0.18,
  });

  // 1. Hexagonal/Octagonal Gold Kapton Bus + Titanium Structural Rings & Radiator Louvers
  const busBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.72, 1.48, 8),
    foilMat,
  );
  busGroup.add(busBody);

  const collarTop = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.14, 16),
    frameMat,
  );
  collarTop.position.y = 0.76;
  const collarBot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 0.14, 16),
    frameMat,
  );
  collarBot.position.y = -0.76;
  busGroup.add(collarTop, collarBot);

  // Thermal Louver Radiator Plates (matching Landsat 9 / TDRS thermal control bus)
  [-0.72, 0.72].forEach((rz) => {
    const radiator = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.82, 0.08),
      frameMat,
    );
    radiator.position.set(0, 0.02, rz);
    busGroup.add(radiator);
  });

  // Dual Optical Star Trackers + Sun Sensors
  [-0.44, 0.44].forEach((sx) => {
    const baffle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 0.36, 12),
      darkMetal,
    );
    baffle.position.set(sx, 0.88, 0.36);
    baffle.rotation.set(0.42, 0, -sx * 0.35);
    busGroup.add(baffle);
  });

  // 4-Corner RCS Thruster Pods around lower propulsion bay
  [
    [-0.76, -0.76],
    [0.76, -0.76],
    [-0.76, 0.76],
    [0.76, 0.76],
  ].forEach(([tx, tz]) => {
    const pod = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8),
      darkMetal,
    );
    pod.position.set(tx, -0.64, tz);
    busGroup.add(pod);
  });

  // Upper S-Band Helical / Omni Telemetry Mast
  const omniMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.055, 1.35, 10),
    frameMat,
  );
  omniMast.position.set(-0.32, 1.48, -0.25);
  busGroup.add(omniMast);
  const helixCoil = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.018, 6, 18),
    meshGoldMat,
  );
  helixCoil.position.set(-0.32, 2.08, -0.25);
  busGroup.add(helixCoil);

  // Lower HERMES Space-Weather Fluxgate Magnetometer Boom
  const hermesBoom = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.048, 1.75, 8),
    frameMat,
  );
  hermesBoom.position.set(0, -1.6, 0);
  busGroup.add(hermesBoom);
  const magSensor = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.24, 0),
    frameMat,
  );
  magSensor.position.set(0, -2.52, 0);
  busGroup.add(magSensor);

  const nasaPatch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true }),
  );
  nasaPatch.position.set(0, 0.05, 0.78);
  busGroup.add(nasaPatch);

  tagPart(busGroup, "sat-bus");
  group.add(busGroup);

  // 2. Twin Articulated Unfolding Multi-Panel Photovoltaic Wings (Blueprint TDRS / Landsat 9 Truss Spine)
  const createWing = (dir: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(dir * 0.78, 0.08, 0);
    const yoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.08, 0.26),
      frameMat,
    );
    yoke.position.set(dir * 0.21, 0, 0);
    pivot.add(yoke);
    const spine = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 3.6, 8),
      frameMat,
    );
    spine.rotation.z = Math.PI / 2;
    spine.position.set(dir * 2.05, -0.04, 0);
    pivot.add(spine);
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.05, 0.96),
      solarMat,
    );
    inner.position.set(dir * 1.24, 0, 0);
    pivot.add(inner);
    const outer = new THREE.Mesh(
      new THREE.BoxGeometry(1.65, 0.05, 0.96),
      solarMat,
    );
    outer.position.set(dir * 2.98, 0, 0);
    pivot.add(outer);
    const tipCap = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 1.0),
      frameMat,
    );
    tipCap.position.set(dir * 3.83, 0, 0);
    pivot.add(tipCap);
    pivot.add(
      createStrutBetween(
        new THREE.Vector3(0, 0.06, 0),
        new THREE.Vector3(dir * 0.45, 0.02, 0.16),
        0.018,
        0.018,
        frameMat,
      ),
    );
    pivot.add(
      createStrutBetween(
        new THREE.Vector3(0, 0.06, 0),
        new THREE.Vector3(dir * 0.45, 0.02, -0.16),
        0.018,
        0.018,
        frameMat,
      ),
    );
    tagPart(pivot, "sat-solar", [dir * 2.4, 0, 0]);
    return pivot;
  };
  const solarLeftPivot = createWing(-1);
  const solarRightPivot = createWing(1);
  group.add(solarLeftPivot, solarRightPivot);

  // 3. Dual Deployable Gold-Mesh Umbrella High-Gain Dishes (TDRS Signature Twin Reflectors)
  const buildUmbrellaDish = (side: -1 | 1) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.58, 0.62, 0.52);
    const boom = createStrutBetween(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(side * 0.68, 0.54, 0.42),
      0.032,
      0.038,
      frameMat,
    );
    arm.add(boom);

    const reflector = new THREE.Group();
    reflector.position.set(side * 0.68, 0.54, 0.42);
    reflector.rotation.set(0.32, side * -0.25, 0);

    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.84, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.4),
      meshGoldMat,
    );
    bowl.rotation.x = Math.PI * 0.5;
    reflector.add(bowl);

    // 10 radial rib struts inside gold mesh dish (like TDRS / Voyager blueprint)
    for (let r = 0; r < 10; r++) {
      const a = (r / 10) * Math.PI * 2;
      const rib = createStrutBetween(
        new THREE.Vector3(0, 0, 0.55),
        new THREE.Vector3(Math.cos(a) * 0.78, Math.sin(a) * 0.78, 0.25),
        0.012,
        0.012,
        frameMat,
      );
      reflector.add(rib);
    }

    const subFeed = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.08, 0.55, 8),
      darkMetal,
    );
    subFeed.rotation.x = Math.PI / 2;
    subFeed.position.set(0, 0, 0.36);
    reflector.add(subFeed);

    arm.add(reflector);
    tagPart(arm, "sat-dish", [side * 1.4, 1.5, 0.85]);
    return arm;
  };
  const umbrellaLeft = buildUmbrellaDish(-1);
  const umbrellaRight = buildUmbrellaDish(1);
  group.add(umbrellaLeft, umbrellaRight);

  // 4. Central Gimbaled Ka-Band & Optical Laser Dish + Tripod Struts + Link Beam
  const dishPivot = new THREE.Group();
  dishPivot.position.set(0, 0.96, 0.14);
  const dishBowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
    frameMat,
  );
  dishBowl.rotation.x = Math.PI * 0.72;
  dishPivot.add(dishBowl);

  const feedHorn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.06, 0.58, 8),
    darkMetal,
  );
  feedHorn.position.set(0, 0.24, 0.32);
  feedHorn.rotation.x = Math.PI * 0.28;
  dishPivot.add(feedHorn);
  [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((ta) => {
    dishPivot.add(
      createStrutBetween(
        new THREE.Vector3(
          Math.cos(ta) * 0.46,
          Math.sin(ta) * 0.34 + 0.12,
          0.12,
        ),
        new THREE.Vector3(0, 0.38, 0.48),
        0.012,
        0.012,
        frameMat,
      ),
    );
  });

  const linkBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.42, 18, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.44,
      side: THREE.DoubleSide,
    }),
  );
  linkBeam.rotation.x = Math.PI * 0.45;
  linkBeam.position.set(0, 0.4, 9.2);
  linkBeam.visible = false;
  dishPivot.add(linkBeam);

  tagPart(dishPivot, "sat-dish", [0, 1.85, 0.95]);
  group.add(dishPivot);

  const beaconMesh = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.08, 10, 36),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.65,
    }),
  );
  beaconMesh.rotation.x = Math.PI / 2;
  group.add(beaconMesh);

  return {
    group,
    busGroup,
    solarLeftPivot,
    solarRightPivot,
    dishPivot,
    umbrellaLeft,
    umbrellaRight,
    beaconMesh,
    linkBeam,
  };
}

export interface SolarSystemHandles {
  group: THREE.Group;
  nebulaDome: THREE.Mesh;
  sun: THREE.Mesh;
  sunLight: THREE.PointLight;
  sunOuterGlow: THREE.Sprite;
  shipGroup: THREE.Group;
  shipFlame: THREE.Mesh;
  shipPlumeInner: THREE.Mesh;
  shipFillLight: THREE.PointLight;
  shipShieldShell: THREE.Mesh;
  shipWingsGroup: THREE.Group;
  progradeMarker: THREE.Group;
  retrogradeMarker: THREE.Group;
  orbitTrail: THREE.Line;
  earthBodyGroup: THREE.Group;
  earthNight: THREE.Mesh;
  earthClouds: THREE.Mesh;
  earthScatter: THREE.Mesh;
  earthAtmo: THREE.Mesh;
  marsAtmo: THREE.Mesh;
  sunCorona: THREE.Mesh;
  asteroidBelt: THREE.InstancedMesh;
  asteroidBeltSeeds: Float32Array;
  stormRing: THREE.Mesh;
  satellite: OrbitalSatelliteHandles;
  relayStageRing: THREE.Group;
  gatewayGroup: THREE.Group;
  marsPhobos: THREE.Mesh;
  planets: Record<SpaceTargetId, THREE.Mesh>;
  extraBodies: Record<string, THREE.Group>;
  bodyScaleGroups: Record<string, THREE.Group>;
  planetTiltGroups: Record<string, THREE.Group>;
  planetSpinMeshes: Record<string, THREE.Object3D>;
  orbitLines: Record<string, THREE.LineLoop>;
  orbitSamplesSI: Record<string, Array<{ xM: number; yM: number; zM: number }>>;
  lunarOrbitLine: THREE.LineLoop;
  lunarOrbitSamplesSI: Array<{ xM: number; yM: number; zM: number }>;
  transferArcs: {
    earthMoon: THREE.Line;
    moonGateway: THREE.Line;
    gatewayMars: THREE.Line;
    earthParking?: THREE.Line;
    freeReturn?: THREE.Line;
    moonSoi?: THREE.Line;
  };
  selectionRing: THREE.Group;
  halleyTail: THREE.Mesh;
  kuiperBelt: THREE.Points;
  oortCloud: THREE.Points;
  spaceDust: THREE.Points;
  spaceDustSeeds: Float32Array;
  targetBeacon: THREE.Mesh;
  shipBeacon: THREE.Mesh;
  courseLine: THREE.Line;
}

export function createJWSTModel(tex: ProceduralTextureSet): {
  group: THREE.Group;
} {
  const group = new THREE.Group();
  const goldMirrorMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x713f12,
    emissiveIntensity: 0.22,
    metalness: 0.94,
    roughness: 0.14,
  });
  const darkCarbon = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.72,
    roughness: 0.35,
  });
  const silverKapton = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: 0x6b21a8,
    emissiveIntensity: 0.12,
    metalness: 0.78,
    roughness: 0.24,
    side: THREE.DoubleSide,
  });

  // 18 Hexagonal Primary Mirror Segments
  const mirrorGroup = new THREE.Group();
  mirrorGroup.position.set(0, 1.4, -0.4);
  const hexGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.14, 6);
  const ringCoords: Array<[number, number]> = [];
  for (let gx = -2; gx <= 2; gx++) {
    for (let gy = -2; gy <= 2; gy++) {
      if (gx === 0 && gy === 0) continue; // center aft-optics baffle hole
      if (Math.abs(gx + gy) <= 2 && ringCoords.length < 18) {
        const px = gx * 0.76 + gy * 0.38;
        const py = gy * 0.66;
        if (Math.hypot(px, py) < 1.85) {
          ringCoords.push([px, py]);
        }
      }
    }
  }
  ringCoords.slice(0, 18).forEach(([mx, my]) => {
    const seg = new THREE.Mesh(hexGeo, goldMirrorMat);
    seg.rotation.x = Math.PI / 2;
    seg.position.set(mx, my, 0);
    mirrorGroup.add(seg);
  });
  const backplane = new THREE.Mesh(
    new THREE.CylinderGeometry(1.75, 1.75, 0.18, 6),
    darkCarbon,
  );
  backplane.rotation.x = Math.PI / 2;
  backplane.position.z = -0.18;
  mirrorGroup.add(backplane);
  tagPart(mirrorGroup, "jwst-mirror");

  // Tripod & Secondary Mirror
  const secGroup = new THREE.Group();
  secGroup.position.set(0, 1.4, -0.4);
  const secMirror = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.26, 0.22, 16),
    darkCarbon,
  );
  secMirror.rotation.x = Math.PI / 2;
  secMirror.position.set(0, 0, 2.7);
  secGroup.add(secMirror);
  [
    [0, 1.7],
    [-1.4, -1.0],
    [1.4, -1.0],
  ].forEach(([sx, sy]) => {
    secGroup.add(
      createStrutBetween(
        new THREE.Vector3(sx, sy, 0),
        new THREE.Vector3(0, 0, 2.7),
        0.04,
        0.04,
        darkCarbon,
      ),
    );
  });
  tagPart(secGroup, "jwst-secondary");

  // 5-Layer Diamond Kapton Sunshield
  const shieldGroup = new THREE.Group();
  shieldGroup.position.set(0, -0.5, 0);
  const kiteShape = new THREE.Shape();
  kiteShape.moveTo(0, 4.4);
  kiteShape.lineTo(2.7, 0);
  kiteShape.lineTo(0, -4.1);
  kiteShape.lineTo(-2.7, 0);
  kiteShape.closePath();
  const kiteGeo = new THREE.ShapeGeometry(kiteShape);
  kiteGeo.rotateX(Math.PI / 2);
  for (let l = 0; l < 5; l++) {
    const layer = new THREE.Mesh(kiteGeo, silverKapton);
    layer.position.y = l * 0.14;
    layer.scale.setScalar(1 - l * 0.025);
    shieldGroup.add(layer);
  }
  tagPart(shieldGroup, "jwst-sunshield");

  // Spacecraft Bus & Solar Wing (Warm Side below Sunshield)
  const busGroup = new THREE.Group();
  busGroup.position.set(0, -1.25, -0.4);
  const busBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.85, 1.8),
    darkCarbon,
  );
  busGroup.add(busBox);
  const solarWing = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.08, 2.8),
    new THREE.MeshStandardMaterial({
      map: tex.solarPanel,
      color: 0xffffff,
      metalness: 0.5,
      roughness: 0.2,
    }),
  );
  solarWing.position.set(0, -0.15, -2.1);
  busGroup.add(solarWing);
  tagPart(busGroup, "jwst-bus");

  // Load official NASA 3D Model asynchronously
  if (typeof Image !== "undefined") {
    const gltfLoader = getSharedGLTFLoader();
    if (gltfLoader) {
      gltfLoader.load("/assets/crafts/jwst.glb", (gltf) => {
        const m = gltf.scene;
        m.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            tagPart(child, "jwst-mirror");
          }
        });
        const bbox = new THREE.Box3().setFromObject(m);
        const sz = bbox.getSize(new THREE.Vector3());
        const maxD = Math.max(sz.x, sz.y, sz.z) || 1.0;
        m.scale.setScalar(6.5 / maxD);
        m.position.set(0, 0, 0);
        mirrorGroup.visible = false;
        secGroup.visible = false;
        shieldGroup.visible = false;
        busGroup.visible = false;
        group.add(m);
      });
    }
  }

  group.add(mirrorGroup, secGroup, shieldGroup, busGroup);
  return { group };
}

export function createVoyagerModel(tex: ProceduralTextureSet): {
  group: THREE.Group;
} {
  const group = new THREE.Group();
  const dishMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.35,
    roughness: 0.42,
    side: THREE.DoubleSide,
  });
  const darkCarbon = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.78,
    roughness: 0.3,
  });
  const goldFoil = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    color: 0xfde047,
    metalness: 0.88,
    roughness: 0.22,
  });

  // 3.7 m White Parabolic Dish
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, 1.25, 0);
  const dishBowl = new THREE.Mesh(
    new THREE.SphereGeometry(2.1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42),
    dishMat,
  );
  dishBowl.rotation.x = Math.PI;
  dishGroup.add(dishBowl);
  [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3].forEach((a) => {
    dishGroup.add(
      createStrutBetween(
        new THREE.Vector3(Math.cos(a) * 1.4, -0.4, Math.sin(a) * 1.4),
        new THREE.Vector3(0, 1.35, 0),
        0.035,
        0.035,
        darkCarbon,
      ),
    );
  });
  const feedCup = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.16, 0.24, 12),
    darkCarbon,
  );
  feedCup.position.y = 1.4;
  dishGroup.add(feedCup);
  tagPart(dishGroup, "voy-dish");

  // 10-Bay Octagonal Bus + Bright Golden Record
  const busGroup = new THREE.Group();
  busGroup.position.set(0, 0.1, 0);
  const decaBus = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.72, 10),
    darkCarbon,
  );
  busGroup.add(decaBus);
  const goldenRecord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.32, 0.06, 20),
    goldFoil,
  );
  goldenRecord.rotation.x = Math.PI / 2;
  goldenRecord.position.set(0, 0, 1.06);
  busGroup.add(goldenRecord);
  tagPart(busGroup, "voy-bus");

  // 3x Plutonium RTG Boom
  const rtgGroup = new THREE.Group();
  rtgGroup.position.set(-1.1, -0.2, 0);
  const rtgBoom = createStrutBetween(
    new THREE.Vector3(0, 0.2, 0),
    new THREE.Vector3(-2.8, -0.8, 0),
    0.06,
    0.06,
    darkCarbon,
  );
  rtgGroup.add(rtgBoom);
  for (let i = 0; i < 3; i++) {
    const can = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.78, 10),
      darkCarbon,
    );
    can.rotation.z = Math.PI / 2.6;
    can.position.set(-1.7 - i * 0.55, -0.35 - i * 0.2, 0);
    rtgGroup.add(can);
  }
  tagPart(rtgGroup, "voy-rtg");

  // Science Scan Platform Boom & Long Magnetometer Truss
  const scanGroup = new THREE.Group();
  scanGroup.position.set(1.0, 0.1, 0);
  scanGroup.add(
    createStrutBetween(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(2.4, -0.1, 0.5),
      0.05,
      0.05,
      darkCarbon,
    ),
  );
  const scanHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.45, 0.55),
    goldFoil,
  );
  scanHead.position.set(2.55, -0.1, 0.55);
  scanGroup.add(scanHead);
  scanGroup.add(
    createStrutBetween(
      new THREE.Vector3(0, -0.2, -0.4),
      new THREE.Vector3(4.8, -0.9, -1.8),
      0.03,
      0.03,
      dishMat,
    ),
  );
  tagPart(scanGroup, "voy-scan");

  // Load official NASA 3D Model asynchronously
  if (typeof Image !== "undefined") {
    const gltfLoader = getSharedGLTFLoader();
    if (gltfLoader) {
      gltfLoader.load("/assets/crafts/voyager.glb", (gltf) => {
        const m = gltf.scene;
        m.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            tagPart(child, "voy-bus");
          }
        });
        const bbox = new THREE.Box3().setFromObject(m);
        const sz = bbox.getSize(new THREE.Vector3());
        const maxD = Math.max(sz.x, sz.y, sz.z) || 1.0;
        m.scale.setScalar(5.5 / maxD);
        m.position.set(0, 0.4, 0);
        dishGroup.visible = false;
        busGroup.visible = false;
        rtgGroup.visible = false;
        scanGroup.visible = false;
        group.add(m);
      });
    }
  }

  group.add(dishGroup, busGroup, rtgGroup, scanGroup);
  return { group };
}

export function createSaturnVShowcase(tex: ProceduralTextureSet): {
  group: THREE.Group;
} {
  const group = new THREE.Group();
  group.visible = false;

  const whiteMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.32,
    metalness: 0.18,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.42,
    metalness: 0.1,
  });
  const darkInconel = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.35,
    metalness: 0.82,
  });
  const goldFoil = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0x713f12,
    emissiveIntensity: 0.28,
    metalness: 0.92,
    roughness: 0.18,
  });
  const csmMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.85,
  });
  const redMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.38,
    metalness: 0.25,
  });

  // 1. S-IC First Stage (Base to y = 10.5u · 42.1m)
  const s1Group = new THREE.Group();
  s1Group.position.set(0, 5.25, 0);

  // S-IC Main Tank with Apollo roll pattern (alternating black/white quadrant sections)
  const s1Body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.26, 1.26, 9.8, 36),
    whiteMat,
  );
  s1Group.add(s1Body);

  // Black roll pattern quadrants on lower S-IC
  const rollGeo = new THREE.CylinderGeometry(
    1.265,
    1.265,
    4.2,
    36,
    1,
    false,
    0,
    Math.PI / 2,
  );
  const q1 = new THREE.Mesh(rollGeo, blackMat);
  q1.position.y = -2.2;
  const q2 = q1.clone();
  q2.rotation.y = Math.PI;
  s1Group.add(q1, q2);

  // 5 F-1 Engine Bells at base (y = -5.25 within group)
  const f1Positions: Array<[number, number]> = [
    [0, 0],
    [0.72, 0.72],
    [-0.72, 0.72],
    [0.72, -0.72],
    [-0.72, -0.72],
  ];
  f1Positions.forEach(([fx, fz], idx) => {
    // F-1 engine bell: throat at top (+0.675), bell exit at bottom (-0.675)
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.42, 1.35, 20, 1, true),
      darkInconel,
    );
    bell.position.set(fx, -5.5, fz);
    s1Group.add(bell);

    // Dedicated F-1 exhaust emitter base at nozzle exit plane (-5.5 - 0.675 = -6.175)
    const f1Emitter = new THREE.Group();
    f1Emitter.name = `saturn-f1-emitter-${idx + 1}`;
    f1Emitter.userData = { type: "f1Emitter", engine: "f1", index: idx + 1 };
    f1Emitter.position.set(fx, -6.175, fz);

    const f1FlameGeo = new THREE.ConeGeometry(0.44, 4.2, 16);
    f1FlameGeo.rotateX(Math.PI);
    f1FlameGeo.translate(0, -2.1, 0);
    const f1Flame = new THREE.Mesh(
      f1FlameGeo,
      new THREE.MeshBasicMaterial({
        color: 0xf97316,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    f1Emitter.add(f1Flame);
    f1Emitter.visible = false;
    s1Group.add(f1Emitter);
  });

  // 4 Aerodynamic Stabilizing Fins
  for (let f = 0; f < 4; f++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 1.1), whiteMat);
    const ang = (f * Math.PI) / 2;
    fin.position.set(Math.cos(ang) * 1.65, -4.6, Math.sin(ang) * 1.65);
    fin.rotation.y = -ang;
    s1Group.add(fin);
  }
  tagPart(s1Group, "saturn-sic");

  // 2. S-II Second Stage (y = 10.5u to 16.7u · 24.8m)
  const s2Group = new THREE.Group();
  s2Group.position.set(0, 13.6, 0);
  const s2Body = new THREE.Mesh(
    new THREE.CylinderGeometry(1.26, 1.26, 6.2, 36),
    whiteMat,
  );
  s2Group.add(s2Body);

  // S-II Vertical Black Tracking Stripes
  const s2StripeGeo = new THREE.CylinderGeometry(
    1.265,
    1.265,
    6.2,
    36,
    1,
    false,
    0,
    Math.PI / 4,
  );
  const s2s1 = new THREE.Mesh(s2StripeGeo, blackMat);
  const s2s2 = s2s1.clone();
  s2s2.rotation.y = Math.PI;
  s2Group.add(s2s1, s2s2);

  // 5 J-2 Cryogenic Engine Bells inside interstage
  const j2Positions: Array<[number, number]> = [
    [0, 0],
    [0.55, 0],
    [-0.55, 0],
    [0, 0.55],
    [0, -0.55],
  ];
  j2Positions.forEach(([jx, jz]) => {
    const bell = new THREE.Mesh(
      new THREE.ConeGeometry(0.26, 0.95, 18, 1, true),
      darkInconel,
    );
    bell.rotation.x = Math.PI;
    bell.position.set(jx, -3.4, jz);
    s2Group.add(bell);
  });
  tagPart(s2Group, "saturn-sii");

  // 3. S-IVB Third Stage (y = 16.7u to 21.15u · 17.8m)
  const s3Group = new THREE.Group();
  s3Group.position.set(0, 18.9, 0);
  // Interstage conical taper from 2.52u to 1.65u
  const s3Adapter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.825, 1.26, 1.1, 36),
    whiteMat,
  );
  s3Adapter.position.y = -1.65;
  // S-IVB Main Tank
  const s3Body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.825, 0.825, 3.35, 36),
    whiteMat,
  );
  s3Body.position.y = 0.55;
  // Single J-2 engine bell
  const j2Single = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 1.05, 18, 1, true),
    darkInconel,
  );
  j2Single.rotation.x = Math.PI;
  j2Single.position.y = -2.1;
  s3Group.add(s3Adapter, s3Body, j2Single);
  tagPart(s3Group, "saturn-sivb");

  // 4. Instrument Unit & Spacecraft-LM Adapter (y = 21.15u to 23.5u · 9.4m)
  const iuGroup = new THREE.Group();
  iuGroup.position.set(0, 22.3, 0);
  // Ring-shaped IBM LVDC Instrument Unit
  const iuRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.83, 0.83, 0.35, 36),
    darkInconel,
  );
  iuRing.position.y = -1.0;
  // Conical 4-petal SLA fairing
  const slaCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.49, 0.825, 1.95, 36),
    whiteMat,
  );
  slaCone.position.y = 0.15;
  // Miniature Apollo Lunar Module inside SLA
  const lmInside = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.45, 0.55),
    goldFoil,
  );
  lmInside.position.y = 0.1;
  iuGroup.add(iuRing, slaCone, lmInside);
  tagPart(iuGroup, "saturn-iu-sla");

  // 5. Apollo Command & Service Module (y = 23.5u to 26.25u · 11.0m)
  const csmGroup = new THREE.Group();
  csmGroup.position.set(0, 24.85, 0);
  // Service Module cylinder
  const smCyl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.49, 0.49, 1.75, 32),
    csmMat,
  );
  smCyl.position.y = -0.45;
  // SPS Engine Bell
  const spsBell = new THREE.Mesh(
    new THREE.ConeGeometry(0.22, 0.75, 16, 1, true),
    darkInconel,
  );
  spsBell.rotation.x = Math.PI;
  spsBell.position.y = -1.6;
  // Command Module cone
  const cmCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.49, 0.95, 32),
    csmMat,
  );
  cmCone.position.y = 0.9;
  csmGroup.add(smCyl, spsBell, cmCone);
  tagPart(csmGroup, "saturn-csm");

  // 6. Launch Escape System (y = 26.25u to 28.8u · 10.2m)
  const lesGroup = new THREE.Group();
  lesGroup.position.set(0, 27.5, 0);
  // Open truss tower
  const towerTruss = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.22, 1.5, 8, 1, true),
    redMat,
  );
  towerTruss.position.y = -0.4;
  // Solid escape motor body & canard nosecone
  const lesMotor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 1.05, 16),
    whiteMat,
  );
  lesMotor.position.y = 0.85;
  const lesNose = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.35, 16),
    redMat,
  );
  lesNose.position.y = 1.5;
  lesGroup.add(towerTruss, lesMotor, lesNose);
  tagPart(lesGroup, "saturn-les");

  // Load official NASA 3D Model asynchronously
  if (typeof Image !== "undefined") {
    const gltfLoader = getSharedGLTFLoader();
    if (gltfLoader) {
      gltfLoader.load("/assets/rockets/saturn_v.glb", (gltf) => {
        const m = gltf.scene;
        m.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            tagPart(child, "saturn-sic");
          }
        });
        const bbox = new THREE.Box3().setFromObject(m);
        const sz = bbox.getSize(new THREE.Vector3());
        // NASA Saturn V height is 110.6 m (27.65 units at 1 unit = 4 m)
        const scale = 27.65 / (sz.y || 1.0);
        m.scale.setScalar(scale);
        const updatedBbox = new THREE.Box3().setFromObject(m);
        m.position.y = -updatedBbox.min.y;

        s1Group.visible = false;
        s2Group.visible = false;
        s3Group.visible = false;
        iuGroup.visible = false;
        csmGroup.visible = false;
        lesGroup.visible = false;

        group.add(m);
      });
    }
  }

  group.add(s1Group, s2Group, s3Group, iuGroup, csmGroup, lesGroup);
  return { group };
}

export function createFalcon9Showcase(tex: ProceduralTextureSet): {
  group: THREE.Group;
} {
  const group = new THREE.Group();
  group.visible = false;

  const whiteCore = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.28,
    metalness: 0.2,
  });
  const darkCarbon = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.45,
    metalness: 0.65,
  });
  const titaniumMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.35,
    metalness: 0.92,
  });
  const niobiumBell = new THREE.MeshStandardMaterial({
    color: 0x334155,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.28,
    metalness: 0.88,
    roughness: 0.25,
  });
  const merlinBell = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.3,
    metalness: 0.85,
  });

  // 1. Stage 1 Booster Core (y = 0 to 10.65u · 42.6m)
  const s1Group = new THREE.Group();
  s1Group.position.set(0, 5.32, 0);
  const coreBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 10.65, 32),
    whiteCore,
  );
  s1Group.add(coreBody);

  // Black raceway strip running along booster
  const raceway = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 10.2, 0.08),
    darkCarbon,
  );
  raceway.position.set(0.46, 0, 0);
  s1Group.add(raceway);

  // Octaweb: 9 Merlin 1D Engine Bells (1 center + 8 ring at r = 0.26u)
  const octawebPositions: Array<[number, number]> = [[0, 0]];
  for (let m = 0; m < 8; m++) {
    const rad = (m * Math.PI) / 4;
    octawebPositions.push([Math.cos(rad) * 0.26, Math.sin(rad) * 0.26]);
  }
  octawebPositions.forEach(([mx, mz], m) => {
    // Merlin 1D engine bell: CylinderGeometry with throat at top (+0.21), exit at bottom (-0.21)
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.09, 0.42, 14, 1, true),
      merlinBell,
    );
    bell.position.set(mx, -5.5, mz);
    s1Group.add(bell);

    // Dedicated Merlin 1D exhaust emitter base at nozzle exit plane (-5.5 - 0.21 = -5.71)
    const merlinEmitter = new THREE.Group();
    merlinEmitter.name = `merlin-emitter-${m + 1}`;
    merlinEmitter.userData = {
      type: "merlinEmitter",
      engine: "merlin-1d",
      index: m + 1,
    };
    merlinEmitter.position.set(mx, -5.71, mz);

    const merlinFlameGeo = new THREE.ConeGeometry(0.1, 1.4, 12);
    merlinFlameGeo.rotateX(Math.PI);
    merlinFlameGeo.translate(0, -0.7, 0);
    const merlinFlame = new THREE.Mesh(
      merlinFlameGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    merlinEmitter.add(merlinFlame);
    merlinEmitter.visible = false;
    s1Group.add(merlinEmitter);
  });
  tagPart(s1Group, "falcon-stage1");

  // 2. 4× Titanium Hypersonic Grid Fins (near top of Stage 1 at y = 10.2u)
  const gridGroup = new THREE.Group();
  gridGroup.position.set(0, 10.2, 0);
  for (let g = 0; g < 4; g++) {
    const finP = new THREE.Group();
    const ang = (g * Math.PI) / 2;
    finP.rotation.y = ang;
    const finMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.42, 0.32),
      titaniumMat,
    );
    finMesh.position.set(0.58, 0, 0);
    finP.add(finMesh);
    gridGroup.add(finP);
  }
  tagPart(gridGroup, "falcon-grid-fins");

  // 3. 4× Carbon Fiber Landing Legs (folded along base of Stage 1)
  const legsGroup = new THREE.Group();
  legsGroup.position.set(0, 1.6, 0);
  for (let l = 0; l < 4; l++) {
    const legP = new THREE.Group();
    const ang = (l * Math.PI) / 2 + Math.PI / 4;
    legP.rotation.y = ang;
    const legA = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 2.8, 8),
      darkCarbon,
    );
    legA.position.set(0.48, 0, 0);
    legP.add(legA);
    legsGroup.add(legP);
  }
  tagPart(legsGroup, "falcon-landing-legs");

  // 4. Carbon Composite Interstage (y = 10.65u to 12.65u · 8.0m)
  const interGroup = new THREE.Group();
  interGroup.position.set(0, 11.65, 0);
  const interBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 2.0, 32),
    darkCarbon,
  );
  interGroup.add(interBody);
  tagPart(interGroup, "falcon-interstage");

  // 5. Stage 2 & Merlin 1D Vacuum Engine (y = 12.65u to 15.8u · 12.6m)
  const s2Group = new THREE.Group();
  s2Group.position.set(0, 14.2, 0);
  const s2Tank = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 3.15, 32),
    whiteCore,
  );
  // Large Vacuum Niobium Nozzle
  const mvacBell = new THREE.Mesh(
    new THREE.ConeGeometry(0.38, 1.25, 24, 1, true),
    niobiumBell,
  );
  mvacBell.rotation.x = Math.PI;
  mvacBell.position.y = -2.1;
  s2Group.add(s2Tank, mvacBell);
  tagPart(s2Group, "falcon-stage2");

  // 6. 5.2m Clamshell Payload Fairing (y = 15.8u to 19.1u · 13.1m)
  const fairingGroup = new THREE.Group();
  fairingGroup.position.set(0, 17.45, 0);
  // Split Left Half
  const fairingGeoLeft = new THREE.CylinderGeometry(
    0.1,
    0.65,
    3.3,
    24,
    1,
    false,
    0,
    Math.PI,
  );
  const fLeft = new THREE.Mesh(fairingGeoLeft, whiteCore);
  // Split Right Half
  const fairingGeoRight = new THREE.CylinderGeometry(
    0.1,
    0.65,
    3.3,
    24,
    1,
    false,
    Math.PI,
    Math.PI,
  );
  const fRight = new THREE.Mesh(fairingGeoRight, whiteCore);
  fairingGroup.add(fLeft, fRight);
  tagPart(fairingGroup, "falcon-fairing");

  group.add(s1Group, gridGroup, legsGroup, interGroup, s2Group, fairingGroup);
  return { group };
}

export function createISSShowcase(tex: ProceduralTextureSet): {
  group: THREE.Group;
} {
  const group = new THREE.Group();
  group.visible = false;

  const trussMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.82,
    roughness: 0.28,
  });
  const modMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.65,
    roughness: 0.32,
  });
  const sawMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0x78350f,
    emissiveIntensity: 0.18,
    metalness: 0.88,
    roughness: 0.18,
    side: THREE.DoubleSide,
  });
  const radMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.52,
    roughness: 0.45,
    side: THREE.DoubleSide,
  });

  // 1. Integrated Truss Structure (108.5 m length proxy)
  const trussGroup = new THREE.Group();
  const mainSpine = new THREE.Mesh(
    new THREE.BoxGeometry(18.0, 0.42, 0.42),
    trussMat,
  );
  trussGroup.add(mainSpine);
  tagPart(trussGroup, "iss-truss");
  group.add(trussGroup);

  // 2. Pressurized Modules (Zarya, Unity, Zvezda, Destiny, Columbus, Kibo, Cupola)
  const modGroup = new THREE.Group();
  const usHab = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 4.2, 18),
    modMat,
  );
  usHab.rotation.x = Math.PI / 2;
  usHab.position.z = 1.2;
  modGroup.add(usHab);

  const rusHab = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 3.8, 16),
    modMat,
  );
  rusHab.rotation.x = Math.PI / 2;
  rusHab.position.z = -2.6;
  modGroup.add(rusHab);

  const kiboPorch = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.65, 1.2),
    modMat,
  );
  kiboPorch.position.set(1.2, 0, 1.4);
  modGroup.add(kiboPorch);

  const cupola = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
    modMat,
  );
  cupola.rotation.x = Math.PI;
  cupola.position.set(0, -0.72, 0.6);
  modGroup.add(cupola);
  tagPart(modGroup, "iss-modules");
  group.add(modGroup);

  // 3. 8 Solar Array Wings (SAWs)
  const sawGroup = new THREE.Group();
  [-7.5, 7.5].forEach((tx) => {
    [-1.8, 1.8].forEach((tz) => {
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 0.05, 5.2),
        sawMat,
      );
      wing.position.set(tx, 0, tz);
      sawGroup.add(wing);
    });
  });
  tagPart(sawGroup, "iss-solar-arrays");
  group.add(sawGroup);

  // 4. Ammonia Thermal Radiator Panels
  const radGroup = new THREE.Group();
  [-3.8, 3.8].forEach((rx) => {
    const rad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 3.6), radMat);
    rad.rotation.z = Math.PI / 4;
    rad.position.set(rx, 1.2, -1.8);
    radGroup.add(rad);
  });
  tagPart(radGroup, "iss-radiators");
  group.add(radGroup);

  // 5. Canadarm2 Robotic Arm
  const armGroup = new THREE.Group();
  const boom1 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8),
    modMat,
  );
  boom1.position.set(0.6, 0.8, 0.8);
  boom1.rotation.z = -Math.PI / 3;
  const boom2 = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.4, 8),
    modMat,
  );
  boom2.position.set(1.8, 1.4, 0.8);
  boom2.rotation.z = Math.PI / 6;
  armGroup.add(boom1, boom2);
  tagPart(armGroup, "iss-canadarm");
  group.add(armGroup);

  // Load official NASA 3D Model asynchronously
  if (typeof Image !== "undefined") {
    const gltfLoader = getSharedGLTFLoader();
    if (gltfLoader) {
      gltfLoader.load("/assets/crafts/iss.glb", (gltf) => {
        const model = gltf.scene;
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            tagPart(child, "iss-modules");
          }
        });
        const bbox = new THREE.Box3().setFromObject(model);
        const sz = bbox.getSize(new THREE.Vector3());
        const maxD = Math.max(sz.x, sz.y, sz.z) || 1.0;
        model.scale.setScalar(18.0 / maxD);
        model.position.set(0, 0, 0);
        trussGroup.visible = false;
        modGroup.visible = false;
        sawGroup.visible = false;
        radGroup.visible = false;
        armGroup.visible = false;
        group.add(model);
      });
    }
  }

  return { group };
}

export function createSolarSystemScene(
  tex: ProceduralTextureSet,
  planetMaps: RealPlanetMaps,
): SolarSystemHandles {
  const group = new THREE.Group();
  group.visible = false;

  const markSolarBody = (obj: THREE.Object3D, bodyId: string) => {
    obj.userData.solarBodyId = bodyId;
    obj.traverse((child) => {
      child.userData.solarBodyId = bodyId;
    });
  };

  // Deep-Space Milky Way Nebula Sky Dome (18,000u outer shell surrounds even Scientific outer Kuiper worlds)
  const nebulaDome = new THREE.Mesh(
    new THREE.SphereGeometry(18000, 32, 24),
    new THREE.MeshBasicMaterial({
      map: tex.nebulaSky,
      side: THREE.BackSide,
      depthWrite: false,
      transparent: true,
      opacity: 0.9,
      fog: false,
    }),
  );
  nebulaDome.frustumCulled = false;
  group.add(nebulaDome);

  const bodyScaleGroups: Record<string, THREE.Group> = {};
  const planetTiltGroups: Record<string, THREE.Group> = {};
  const planetSpinMeshes: Record<string, THREE.Object3D> = {};
  const extraBodies: Record<string, THREE.Group> = {};
  const orbitLines: Record<string, THREE.LineLoop> = {};
  const orbitSamplesSI: Record<
    string,
    Array<{ xM: number; yM: number; zM: number }>
  > = {};

  const sunOrigin = new THREE.Vector3(
    SOLAR_SUN_ORIGIN_X,
    0,
    SOLAR_SUN_ORIGIN_Z,
  );

  // Sun (normalized r = 1.0 scaled by bodyScaleGroups.sun -> EXPLORATION_VISUAL_LAYOUT.sun.bodyRadiusUnits)
  const sunScaleGroup = new THREE.Group();
  sunScaleGroup.position.copy(sunOrigin);
  sunScaleGroup.scale.setScalar(EXPLORATION_VISUAL_LAYOUT.sun.bodyRadiusUnits);
  const sunTiltGroup = new THREE.Group();
  sunTiltGroup.rotation.z = PLANETARY_CATALOG_SI.sun.axialTiltRad;
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 48, 36),
    new THREE.MeshBasicMaterial({ map: planetMaps.sunMap, color: 0xffffff }),
  );
  markSolarBody(sun, "sun");
  sunTiltGroup.add(sun);
  sunScaleGroup.add(sunTiltGroup);
  group.add(sunScaleGroup);
  bodyScaleGroups.sun = sunScaleGroup;
  planetTiltGroups.sun = sunTiltGroup;
  planetSpinMeshes.sun = sun;

  const sunCorona = new THREE.Mesh(
    new THREE.SphereGeometry(1.16, 28, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  sunScaleGroup.add(sunCorona);

  const sunOuterGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: tex.sunGlowSprite,
      color: 0xffedd5,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  sunOuterGlow.position.copy(sunOrigin);
  sunOuterGlow.scale.set(540, 540, 1);
  group.add(sunOuterGlow);

  // Subtle Solar Coronal Prominence Loops attached to Sun scale group
  [0.35, -0.55].forEach((rotY, idx) => {
    const prom = new THREE.Mesh(
      new THREE.TorusGeometry(1.06 + idx * 0.06, 0.012, 8, 42, Math.PI * 0.8),
      new THREE.MeshBasicMaterial({
        color: 0xfb923c,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    prom.rotation.set(0.4 + idx * 0.6, rotY, idx * 1.1);
    sunScaleGroup.add(prom);
  });

  // Infinite-range heliocentric PointLight (distance = 0, gentle physical falloff) so outer planets get sharp day/night terminators
  const sunLight = new THREE.PointLight(0xfff3d6, 3.6, 0, 0.04);
  sunLight.position.copy(sunOrigin);
  group.add(sunLight);

  // Subtle Solar Radiation Boundary Ring (glows brighter only during active solar flare)
  const stormRing = new THREE.Mesh(
    new THREE.RingGeometry(276, 286, 72),
    new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  stormRing.rotation.x = -Math.PI / 2;
  stormRing.position.set(sunOrigin.x, -0.05, sunOrigin.z);
  group.add(stormRing);

  const earthSpec = SOLAR_SYSTEM_BODIES.find((b) => b.id === "earth")!;
  const earth0 = computeKeplerBodyPosition(
    earthSpec,
    0,
    "exploration",
    SOLAR_SUN_ORIGIN_X,
    SOLAR_SUN_ORIGIN_Z,
  );

  // Earth: normalized r = 1.0 mesh hierarchy (scaleGroup -> tiltGroup -> spinMesh(earthBodyGroup))
  const earthGroup = new THREE.Group();
  earthGroup.position.set(earth0.x, earth0.y, earth0.z);
  const earthScaleGroup = new THREE.Group();
  earthScaleGroup.scale.setScalar(
    getBodyVisualRadiusUnits("earth", "exploration"),
  );
  const earthTiltGroup = new THREE.Group();
  earthTiltGroup.rotation.z = PLANETARY_CATALOG_SI.earth.axialTiltRad;
  const earthBodyGroup = new THREE.Group();
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1.0, 48, 36),
    new THREE.MeshStandardMaterial({
      map: planetMaps.earthMap,
      color: 0xffffff,
      roughness: 0.58,
      metalness: 0.06,
      envMapIntensity: 0.18,
    }),
  );
  earthBodyGroup.add(earth);
  const earthNight = new THREE.Mesh(
    new THREE.SphereGeometry(1.002, 48, 36),
    createEarthNightMaterial(planetMaps.earthNightMap),
  );
  earthBodyGroup.add(earthNight);
  const earthClouds = new THREE.Mesh(
    new THREE.SphereGeometry(1.014, 44, 32),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      alphaMap: planetMaps.earthCloudsMap,
      transparent: true,
      opacity: 0.74,
      roughness: 0.92,
      metalness: 0.0,
      depthWrite: false,
    }),
  );
  earthBodyGroup.add(earthClouds);
  const earthScatter = new THREE.Mesh(
    new THREE.SphereGeometry(1.018, 44, 32),
    createEarthSurfaceScatteringMaterial(0.78),
  );
  earthBodyGroup.add(earthScatter);
  const earthAtmo = new THREE.Mesh(
    new THREE.SphereGeometry(1.06, 40, 32),
    createPlanetAtmosphereMaterial({
      dayColor: 0x3b9eff,
      twilightColor: 0xfb923c,
      intensity: 1.18,
      power: 2.32,
      nightFloor: 0.08,
    }),
  );
  earthBodyGroup.add(earthAtmo);

  // Occasional meteors/streaks in Earth's orbital sky (clearly an atmospheric effect)
  const meteorCount = 12;
  const meteorGeo = new THREE.BufferGeometry();
  const meteorPositions = new Float32Array(meteorCount * 6);
  for (let i = 0; i < meteorCount; i++) {
    const angle = (i / meteorCount) * Math.PI * 2;
    const r = 1.08 + (i % 3) * 0.02;
    const x0 = Math.cos(angle) * r;
    const y0 = ((i % 5) - 2) * 0.15;
    const z0 = Math.sin(angle) * r;
    const trailAngle = angle + 0.06;
    const x1 = Math.cos(trailAngle) * (r - 0.04);
    const y1 = y0 - 0.03;
    const z1 = Math.sin(trailAngle) * (r - 0.04);
    meteorPositions[i * 6] = x0;
    meteorPositions[i * 6 + 1] = y0;
    meteorPositions[i * 6 + 2] = z0;
    meteorPositions[i * 6 + 3] = x1;
    meteorPositions[i * 6 + 4] = y1;
    meteorPositions[i * 6 + 5] = z1;
  }
  meteorGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(meteorPositions, 3),
  );
  const meteorLines = new THREE.LineSegments(
    meteorGeo,
    new THREE.LineBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  earthBodyGroup.add(meteorLines);

  earthTiltGroup.add(earthBodyGroup);
  earthScaleGroup.add(earthTiltGroup);
  earthGroup.add(earthScaleGroup);
  markSolarBody(earthGroup, "earth");
  group.add(earthGroup);
  bodyScaleGroups.earth = earthScaleGroup;
  planetTiltGroups.earth = earthTiltGroup;
  planetSpinMeshes.earth = earth;
  extraBodies.earth = earthGroup;

  // 3D Inclined Geocentric Lunar Orbit LineLoop anchored cleanly at Earth
  const lunarOrbitSamplesSI = sampleKeplerOrbitPointsSI("moon", 128);
  const lunarPositions = new Float32Array(lunarOrbitSamplesSI.length * 3);
  for (let i = 0; i < lunarOrbitSamplesSI.length; i++) {
    const pt = projectHeliocentricSIToScene(
      "moon",
      lunarOrbitSamplesSI[i],
      "exploration",
      0,
      0,
      { xM: 0, yM: 0, zM: 0 },
    );
    lunarPositions[i * 3] = pt.x;
    lunarPositions[i * 3 + 1] = pt.y;
    lunarPositions[i * 3 + 2] = pt.z;
  }
  const lunarOrbitGeo = new THREE.BufferGeometry();
  lunarOrbitGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(lunarPositions, 3),
  );
  const lunarOrbitLine = new THREE.LineLoop(
    lunarOrbitGeo,
    new THREE.LineBasicMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.45,
    }),
  );
  earthGroup.add(lunarOrbitLine);

  // Dashed TLI & Mars Hohmann Transfer Trajectory Arcs (dynamically synced by SpaceSceneManager)
  const buildTransferArc = (
    p0: THREE.Vector3,
    ctrl: THREE.Vector3,
    p1: THREE.Vector3,
    color: number,
  ) => {
    const curve = new THREE.QuadraticBezierCurve3(p0, ctrl, p1);
    const pts = curve.getPoints(48);
    const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const line = new THREE.Line(
      arcGeo,
      new THREE.LineDashedMaterial({
        color,
        dashSize: 1.4,
        gapSize: 0.85,
        transparent: true,
        opacity: 0.34,
      }),
    );
    line.computeLineDistances();
    return line;
  };
  const arcEarthMoon = buildTransferArc(
    new THREE.Vector3(earth0.x, 0, earth0.z),
    new THREE.Vector3(
      (earth0.x + SOLAR_TARGETS.moon.x) * 0.5,
      0.25,
      (earth0.z + SOLAR_TARGETS.moon.z) * 0.5 + 1.8,
    ),
    new THREE.Vector3(SOLAR_TARGETS.moon.x, 0, SOLAR_TARGETS.moon.z),
    0x38bdf8,
  );
  const arcMoonGateway = buildTransferArc(
    new THREE.Vector3(SOLAR_TARGETS.moon.x, 0, SOLAR_TARGETS.moon.z),
    new THREE.Vector3(
      (SOLAR_TARGETS.moon.x + SOLAR_TARGETS.gateway.x) * 0.5,
      0.2,
      (SOLAR_TARGETS.moon.z + SOLAR_TARGETS.gateway.z) * 0.5,
    ),
    new THREE.Vector3(SOLAR_TARGETS.gateway.x, 0, SOLAR_TARGETS.gateway.z),
    0xfacc15,
  );
  const arcGatewayMars = buildTransferArc(
    new THREE.Vector3(SOLAR_TARGETS.gateway.x, 0, SOLAR_TARGETS.gateway.z),
    new THREE.Vector3(
      (SOLAR_TARGETS.gateway.x + SOLAR_TARGETS.mars.x) * 0.5,
      0.6,
      (SOLAR_TARGETS.gateway.z + SOLAR_TARGETS.mars.z) * 0.5,
    ),
    new THREE.Vector3(SOLAR_TARGETS.mars.x, 0, SOLAR_TARGETS.mars.z),
    0xf97316,
  );
  const buildDynamicTrajectoryLine = (
    color: number,
    pointsCount: number,
    dashed = false,
  ) => {
    const positions = new Float32Array(pointsCount * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const mat = dashed
      ? new THREE.LineDashedMaterial({
          color,
          dashSize: 0.6,
          gapSize: 0.4,
          transparent: true,
          opacity: 0.45,
        })
      : new THREE.LineBasicMaterial({
          color,
          transparent: true,
          opacity: 0.55,
        });
    const line = new THREE.Line(geo, mat);
    line.frustumCulled = false;
    return line;
  };

  const arcEarthParking = buildDynamicTrajectoryLine(0x38bdf8, 65, false); // 64 segments + 1
  const arcFreeReturn = buildDynamicTrajectoryLine(0xf59e0b, 81, true); // 80 segments + 1
  const arcMoonSoi = buildDynamicTrajectoryLine(0x0ea5e9, 49, false); // 48 segments + 1

  group.add(
    arcEarthMoon,
    arcMoonGateway,
    arcGatewayMars,
    arcEarthParking,
    arcFreeReturn,
    arcMoonSoi,
  );
  const transferArcs = {
    earthMoon: arcEarthMoon,
    moonGateway: arcMoonGateway,
    gatewayMars: arcGatewayMars,
    earthParking: arcEarthParking,
    freeReturn: arcFreeReturn,
    moonSoi: arcMoonSoi,
  };

  // Targets: HERMES Relay Orbit, Moon, Gateway NRHO, Mars (using normalized r=1.0 hierarchy for planets/Moon)
  const planets = {} as Record<SpaceTargetId, THREE.Mesh>;
  let marsPhobos = new THREE.Mesh();
  let marsAtmo = new THREE.Mesh();

  (Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).forEach((id) => {
    const spec = SOLAR_TARGETS[id];
    if (id === "moon" || id === "mars") {
      const parentGroup = new THREE.Group();
      parentGroup.position.set(spec.x, 0, spec.z);
      const scaleGroup = new THREE.Group();
      scaleGroup.scale.setScalar(getBodyVisualRadiusUnits(id, "exploration"));
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = PLANETARY_CATALOG_SI[id].axialTiltRad;

      const mat =
        id === "moon"
          ? new THREE.MeshStandardMaterial({
              map: planetMaps.moonMap,
              bumpMap: planetMaps.moonMap,
              bumpScale: 0.022,
              color: 0xffffff,
              roughness: 0.92,
              metalness: 0.0,
              envMapIntensity: 0.08,
            })
          : new THREE.MeshStandardMaterial({
              map: planetMaps.marsMap,
              bumpMap: planetMaps.marsMap,
              bumpScale: 0.018,
              color: 0xffffff,
              roughness: 0.86,
              metalness: 0.0,
              envMapIntensity: 0.1,
            });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 48, 36), mat);
      tiltGroup.add(mesh);

      if (id === "mars") {
        marsAtmo = new THREE.Mesh(
          new THREE.SphereGeometry(1.045, 36, 28),
          createPlanetAtmosphereMaterial({
            dayColor: 0xea7a47,
            twilightColor: 0xfdba74,
            intensity: 0.65,
            power: 2.6,
            nightFloor: 0.04,
          }),
        );
        tiltGroup.add(marsAtmo);

        // Phobos at realistic ~2.76 Mars radii & subtle rocky radius (0.045 * R_mars visually visible cleanly)
        marsPhobos = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.055, 1),
          new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.92 }),
        );
        marsPhobos.position.set(2.76, 0.14, 0);
        scaleGroup.add(marsPhobos);
      }

      scaleGroup.add(tiltGroup);
      parentGroup.add(scaleGroup);
      markSolarBody(parentGroup, id);
      group.add(parentGroup);

      planets[id] = mesh;
      extraBodies[id] = parentGroup;
      bodyScaleGroups[id] = scaleGroup;
      planetTiltGroups[id] = tiltGroup;
      planetSpinMeshes[id] = mesh;
    } else {
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        emissive: spec.color,
        emissiveIntensity: 0.28,
        roughness: 0.35,
        metalness: 0.65,
        wireframe: id === "relay-orbit",
      });
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(
          id === "relay-orbit" ? 0.45 : spec.radius,
          14,
          10,
        ),
        mat,
      );
      mesh.position.set(spec.x, 0, spec.z);
      mesh.visible = false;
      group.add(mesh);
      planets[id] = mesh;
    }
  });

  // Main Asteroid Belt (260 stony C/S/M-type asteroids dynamically scaled across a = 2.1..3.3 AU)
  const beltCount = 260;
  const asteroidBeltSeeds = new Float32Array(beltCount * 4);
  const asteroidBelt = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.18, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.95,
      metalness: 0.04,
      envMapIntensity: 0.1,
    }),
    beltCount,
  );
  asteroidBelt.position.copy(sunOrigin);
  asteroidBelt.frustumCulled = false;
  const dummy = new THREE.Object3D();
  const astTint = new THREE.Color();
  for (let i = 0; i < beltCount; i++) {
    const aAu = 2.1 + Math.random() * 1.2;
    const angle = (i / beltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.22;
    const yRatio = (Math.random() - 0.5) * 0.08;
    const sc = 0.45 + Math.random() * 0.9;
    asteroidBeltSeeds[i * 4] = aAu;
    asteroidBeltSeeds[i * 4 + 1] = angle;
    asteroidBeltSeeds[i * 4 + 2] = yRatio;
    asteroidBeltSeeds[i * 4 + 3] = sc;

    const expR = 2200.0 + ((aAu - 2.1) / 1.2) * 1100.0;
    dummy.position.set(
      Math.cos(angle) * expR,
      yRatio * expR * 0.45,
      Math.sin(angle) * expR,
    );
    dummy.rotation.set(i * 0.7, i * 1.1, i * 0.4);
    dummy.scale.set(sc * 4.0, sc * 3.0, sc * 3.6);
    dummy.updateMatrix();
    asteroidBelt.setMatrixAt(i, dummy.matrix);
    // Low stony albedos (0.07..0.22)
    const albedo = 0.08 + (i % 6) * 0.025;
    astTint.setRGB(albedo * 1.18, albedo * 1.02, albedo * 0.88);
    asteroidBelt.setColorAt(i, astTint);
  }
  asteroidBelt.instanceMatrix.needsUpdate = true;
  if (asteroidBelt.instanceColor) asteroidBelt.instanceColor.needsUpdate = true;
  asteroidBelt.computeBoundingSphere();
  group.add(asteroidBelt);

  // Lunar Gateway NRHO Multi-Module Station
  const gwSpec = SOLAR_TARGETS.gateway;
  const gatewayGroup = new THREE.Group();
  gatewayGroup.position.set(gwSpec.x, 0, gwSpec.z);
  gatewayGroup.scale.setScalar(0.45);
  const gwHull = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.65,
    roughness: 0.3,
  });
  const gwGold = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    color: 0xffffff,
    metalness: 0.82,
    roughness: 0.26,
  });
  const ppe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.72, 2.2, 12),
    gwGold,
  );
  ppe.rotation.z = Math.PI / 2;
  const halo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.75, 0.75, 2.6, 12),
    gwHull,
  );
  halo.rotation.z = Math.PI / 2;
  halo.position.x = 2.4;
  const iHab = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 2.1, 12),
    gwHull,
  );
  iHab.rotation.z = Math.PI / 2;
  iHab.position.x = 4.65;
  const dockNode = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 1.5, 10),
    gwHull,
  );
  dockNode.rotation.x = Math.PI / 2;
  dockNode.position.set(3.1, 0, 0);
  const gwSolarL = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 5.2, 0.08),
    new THREE.MeshStandardMaterial({
      map: tex.solarPanel,
      color: 0xffffff,
      metalness: 0.5,
      roughness: 0.2,
    }),
  );
  gwSolarL.position.set(-0.2, 0, 0);
  const gwRad = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 1.1), gwHull);
  gwRad.position.set(2.4, 1.7, 0);
  gatewayGroup.add(ppe, halo, iHab, dockNode, gwSolarL, gwRad);
  group.add(gatewayGroup);

  // Orbital Staging Beacon Ring at HERMES Relay Orbit
  const relayStageRing = new THREE.Group();
  relayStageRing.position.set(
    SOLAR_TARGETS["relay-orbit"].x,
    0,
    SOLAR_TARGETS["relay-orbit"].z,
  );
  const stageOuter = new THREE.Mesh(
    new THREE.TorusGeometry(2.0, 0.07, 10, 36),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.78,
    }),
  );
  stageOuter.rotation.x = Math.PI / 2;
  const stageInner = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.04, 8, 28),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.55,
    }),
  );
  stageInner.rotation.x = Math.PI / 2;
  const stageBeacon = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.32, 0),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true }),
  );
  relayStageRing.add(stageOuter, stageInner, stageBeacon);
  group.add(relayStageRing);

  const satellite = createOrbitalSatellite(tex);
  satellite.group.position.set(
    SOLAR_TARGETS["relay-orbit"].x,
    0,
    SOLAR_TARGETS["relay-orbit"].z,
  );
  satellite.group.scale.setScalar(0.55);
  satellite.group.visible = false;
  group.add(satellite.group);

  const targetBeacon = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.14, 10, 36),
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.72,
    }),
  );
  targetBeacon.rotation.x = Math.PI / 2;
  group.add(targetBeacon);

  const shipBeacon = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.28, 6),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  shipBeacon.visible = false;
  group.add(shipBeacon);

  // 3D NASA Orion MPCV Crew Capsule + European Service Module (ESM)
  const shipGroup = new THREE.Group();
  shipGroup.scale.setScalar(0.62);
  const silverHull = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.68,
    roughness: 0.24,
  });
  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
  });

  const esmBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.86, 0.84, 1.35, 24),
    silverHull,
  );
  esmBody.rotation.x = Math.PI / 2;
  esmBody.position.z = -0.78;
  shipGroup.add(esmBody);

  const esmFoilBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.89, 0.89, 0.58, 24),
    new THREE.MeshStandardMaterial({
      map: tex.foilAlbedo,
      color: 0xffffff,
      metalness: 0.82,
      roughness: 0.26,
    }),
  );
  esmFoilBand.rotation.x = Math.PI / 2;
  esmFoilBand.position.z = -0.82;
  shipGroup.add(esmFoilBand);

  const aj10Bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.48, 0.66, 18, 1, true),
    darkTrim,
  );
  aj10Bell.rotation.x = Math.PI / 2;
  aj10Bell.position.z = -1.78;
  shipGroup.add(aj10Bell);

  const heatshield = new THREE.Mesh(
    new THREE.CylinderGeometry(0.94, 0.9, 0.18, 24),
    darkTrim,
  );
  heatshield.rotation.x = Math.PI / 2;
  heatshield.position.z = 0.0;
  shipGroup.add(heatshield);

  const crewModule = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.94, 1.05, 24),
    new THREE.MeshStandardMaterial({
      map: tex.orionTile,
      color: 0xffffff,
      metalness: 0.36,
      roughness: 0.32,
    }),
  );
  crewModule.rotation.x = Math.PI / 2;
  crewModule.position.z = 0.62;
  shipGroup.add(crewModule);

  [-0.22, 0.22].forEach((wx, idx) => {
    const cWin = new THREE.Mesh(
      new THREE.PlaneGeometry(0.22, 0.14),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
    );
    cWin.position.set(wx, 0.46, 0.82);
    cWin.rotation.set(-0.56, 0, idx === 0 ? 0.18 : -0.18);
    shipGroup.add(cWin);
  });

  const dockingCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.34, 0.32, 16),
    silverHull,
  );
  dockingCollar.rotation.x = Math.PI / 2;
  dockingCollar.position.z = 1.28;
  shipGroup.add(dockingCollar);

  [
    Math.PI / 4,
    (3 * Math.PI) / 4,
    (5 * Math.PI) / 4,
    (7 * Math.PI) / 4,
  ].forEach((ra) => {
    const rcs = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.16, 0.28),
      darkTrim,
    );
    rcs.position.set(Math.cos(ra) * 0.92, Math.sin(ra) * 0.92, -0.35);
    shipGroup.add(rcs);
  });

  const shipWingsGroup = new THREE.Group();
  const wingMat = new THREE.MeshStandardMaterial({
    map: tex.solarPanel,
    color: 0xe0f2fe,
    metalness: 0.48,
    roughness: 0.2,
  });
  [0.52, -0.52, Math.PI - 0.52, Math.PI + 0.52].forEach((ang) => {
    const pivot = new THREE.Group();
    pivot.position.set(Math.cos(ang) * 0.88, Math.sin(ang) * 0.88, -0.68);
    pivot.rotation.z = ang;
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.6, 8),
      silverHull,
    );
    strut.rotation.z = Math.PI / 2;
    strut.position.x = 0.28;
    pivot.add(strut);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(2.45, 0.05, 0.62),
      wingMat,
    );
    panel.position.set(1.65, 0, -0.22);
    panel.rotation.y = 0.24;
    pivot.add(panel);
    shipWingsGroup.add(pivot);
  });
  shipGroup.add(shipWingsGroup);

  const shipFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 3.1, 14),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  shipFlame.rotation.x = -Math.PI / 2;
  shipFlame.position.z = -3.15;
  shipFlame.visible = false;
  shipGroup.add(shipFlame);

  const shipPlumeInner = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 1.85, 10),
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  shipPlumeInner.rotation.x = -Math.PI / 2;
  shipPlumeInner.position.z = -2.55;
  shipPlumeInner.visible = false;
  shipGroup.add(shipPlumeInner);

  const shipFillLight = new THREE.PointLight(0xe0f2fe, 1.8, 14, 1.2);
  shipFillLight.position.set(2.4, 3.1, 2.8);
  shipGroup.add(shipFillLight);

  const shipShieldShell = new THREE.Mesh(
    new THREE.SphereGeometry(2.55, 18, 16),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.22,
      wireframe: true,
    }),
  );
  shipShieldShell.visible = false;
  shipGroup.add(shipShieldShell);
  group.add(shipGroup);

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(6), 3),
  );
  const courseLine = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.5,
    }),
  );
  group.add(courseLine);

  // Prograde Marker (Green/Cyan ring with 3 ticks)
  const progradeMarker = new THREE.Group();
  const proRing = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.32, 24),
    new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  proRing.rotation.x = -Math.PI / 2;
  progradeMarker.add(proRing);
  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3;
    const tick = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide }),
    );
    tick.rotation.x = -Math.PI / 2;
    tick.position.set(Math.cos(ang) * 0.42, 0, Math.sin(ang) * 0.42);
    progradeMarker.add(tick);
  }
  progradeMarker.visible = false;
  group.add(progradeMarker);

  // Retrograde Marker (Amber ring with X cross)
  const retrogradeMarker = new THREE.Group();
  const retroRing = new THREE.Mesh(
    new THREE.RingGeometry(0.24, 0.32, 24),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    }),
  );
  retroRing.rotation.x = -Math.PI / 2;
  retrogradeMarker.add(retroRing);
  [-Math.PI / 4, Math.PI / 4].forEach((ang) => {
    const bar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.48),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide }),
    );
    bar.rotation.x = -Math.PI / 2;
    bar.rotation.z = ang;
    retrogradeMarker.add(bar);
  });
  retrogradeMarker.visible = false;
  group.add(retrogradeMarker);

  // Dynamic Orbital Trail Polyline
  const trailMaxPoints = 200;
  const trailPositions = new Float32Array(trailMaxPoints * 3);
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(trailPositions, 3),
  );
  trailGeo.setDrawRange(0, 0);
  const orbitTrail = new THREE.Line(
    trailGeo,
    new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
    }),
  );
  group.add(orbitTrail);

  // Remaining Complete Solar System Bodies (Mercury -> Eris + Halley's Comet + Bennu)
  let halleyTail = new THREE.Mesh();
  const textureForBody = (id: string) => {
    switch (id) {
      case "mercury":
        return planetMaps.mercuryMap;
      case "venus":
        return planetMaps.venusMap;
      case "jupiter":
        return planetMaps.jupiterMap;
      case "saturn":
        return planetMaps.saturnMap;
      case "uranus":
        return planetMaps.uranusMap;
      case "neptune":
        return planetMaps.neptuneMap;
      case "pluto":
        return planetMaps.plutoMap;
      case "ceres":
        return planetMaps.ceresMap;
      case "eris":
        return tex.plutoAlbedo;
      case "bennu":
        return tex.moonAlbedo;
      default:
        return undefined;
    }
  };

  SOLAR_SYSTEM_BODIES.forEach((b) => {
    if (b.id === "sun" || b.id === "moon") return;
    if (b.id !== "earth" && b.id !== "mars") {
      const bg = new THREE.Group();
      const scaleGroup = new THREE.Group();
      scaleGroup.scale.setScalar(getBodyVisualRadiusUnits(b.id, "exploration"));
      const tiltGroup = new THREE.Group();
      tiltGroup.rotation.z = PLANETARY_CATALOG_SI[b.id]?.axialTiltRad ?? 0;

      const mapTex = textureForBody(b.id);
      const isComet = b.category === "comet";
      const sphMat = new THREE.MeshStandardMaterial({
        map: mapTex,
        bumpMap:
          b.id === "mercury" || b.id === "ceres" || b.id === "eris"
            ? tex.moonBump
            : undefined,
        bumpScale: b.id === "mercury" ? 0.08 : 0.05,
        color: mapTex ? 0xffffff : b.color,
        emissive: isComet ? b.color : 0x000000,
        emissiveIntensity: isComet ? 0.38 : 0.0,
        roughness:
          b.id === "jupiter" || b.id === "saturn" || b.id === "venus"
            ? 0.56
            : b.id === "uranus" || b.id === "neptune"
              ? 0.46
              : 0.84,
        metalness: b.id === "uranus" || b.id === "neptune" ? 0.06 : 0.02,
        envMapIntensity: 0.14,
      });
      const sph = new THREE.Mesh(new THREE.SphereGeometry(1.0, 36, 28), sphMat);
      tiltGroup.add(sph);

      // Equatorial ring systems inside tiltGroup so Saturn (26.73°) & Uranus (97.77°) align to exact pole tilt
      if (b.id === "saturn") {
        const rings = new THREE.Mesh(
          createPlanetaryRingGeometry(1.24, 2.27, 96),
          new THREE.MeshBasicMaterial({
            map: planetMaps.saturnRingMap,
            color: 0xffffff,
            transparent: true,
            opacity: 0.96,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        rings.rotation.x = -Math.PI / 2;
        tiltGroup.add(rings);

        const sAtmo = new THREE.Mesh(
          new THREE.SphereGeometry(1.035, 36, 28),
          createPlanetAtmosphereMaterial({
            dayColor: 0xfef08a,
            twilightColor: 0xb45309,
            intensity: 0.48,
            power: 2.9,
            nightFloor: 0.04,
          }),
        );
        tiltGroup.add(sAtmo);
      } else if (b.id === "uranus") {
        const uRing = new THREE.Mesh(
          createPlanetaryRingGeometry(1.42, 1.95, 72),
          new THREE.MeshBasicMaterial({
            color: 0xa5f3fc,
            transparent: true,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        uRing.rotation.x = -Math.PI / 2;
        tiltGroup.add(uRing);

        const uAtmo = new THREE.Mesh(
          new THREE.SphereGeometry(1.035, 36, 28),
          createPlanetAtmosphereMaterial({
            dayColor: 0x67e8f9,
            twilightColor: 0x0891b2,
            intensity: 0.65,
            power: 2.6,
            nightFloor: 0.04,
          }),
        );
        tiltGroup.add(uAtmo);
      } else if (b.id === "neptune") {
        const nRing = new THREE.Mesh(
          createPlanetaryRingGeometry(1.68, 2.45, 72),
          new THREE.MeshBasicMaterial({
            color: 0x93c5fd,
            transparent: true,
            opacity: 0.14,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        nRing.rotation.x = -Math.PI / 2;
        tiltGroup.add(nRing);

        const nAtmo = new THREE.Mesh(
          new THREE.SphereGeometry(1.035, 36, 28),
          createPlanetAtmosphereMaterial({
            dayColor: 0x38bdf8,
            twilightColor: 0x1d4ed8,
            intensity: 0.72,
            power: 2.5,
            nightFloor: 0.04,
          }),
        );
        tiltGroup.add(nAtmo);
      } else if (b.id === "jupiter") {
        const jRing = new THREE.Mesh(
          createPlanetaryRingGeometry(1.4, 1.81, 72),
          new THREE.MeshBasicMaterial({
            color: 0xfde68a,
            transparent: true,
            opacity: 0.09,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        );
        jRing.rotation.x = -Math.PI / 2;
        tiltGroup.add(jRing);

        const jAtmo = new THREE.Mesh(
          new THREE.SphereGeometry(1.035, 40, 32),
          createPlanetAtmosphereMaterial({
            dayColor: 0xfed7aa,
            twilightColor: 0xc2410c,
            intensity: 0.52,
            power: 2.8,
            nightFloor: 0.04,
          }),
        );
        tiltGroup.add(jAtmo);

        for (let m = 0; m < 4; m++) {
          const jMoon = new THREE.Mesh(
            new THREE.SphereGeometry(0.055, 10, 8),
            new THREE.MeshStandardMaterial({
              color: 0xe2e8f0,
              roughness: 0.82,
            }),
          );
          const ang = (m / 4) * Math.PI * 2;
          const distR = 1.45 + m * 0.25;
          jMoon.position.set(Math.cos(ang) * distR, 0, Math.sin(ang) * distR);
          tiltGroup.add(jMoon);
        }
      } else if (b.id === "venus") {
        const vAtmo = new THREE.Mesh(
          new THREE.SphereGeometry(1.045, 36, 28),
          createPlanetAtmosphereMaterial({
            dayColor: 0xffe2a4,
            twilightColor: 0xd97706,
            intensity: 1.45,
            power: 2.1,
            nightFloor: 0.06,
          }),
        );
        tiltGroup.add(vAtmo);
      } else if (b.id === "pluto") {
        const charon = new THREE.Mesh(
          new THREE.SphereGeometry(0.51, 14, 10),
          new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 }),
        );
        charon.position.set(2.4, 0, 0.9);
        tiltGroup.add(charon);
      } else if (b.id === "halley") {
        halleyTail = new THREE.Mesh(
          new THREE.ConeGeometry(1.4, 12.0, 14),
          new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.36,
            depthWrite: false,
          }),
        );
        halleyTail.rotation.x = Math.PI / 2;
        halleyTail.position.z = 6.2;
        scaleGroup.add(halleyTail);
      } else if (b.id === "bennu") {
        sph.visible = false;
        const bennuHolder = new THREE.Group();
        tiltGroup.add(bennuHolder);
        if (typeof Image !== "undefined") {
          const gltfLoader = new GLTFLoader();
          gltfLoader.load(
            "/assets/asteroids/bennu.glb",
            (gltf) => {
              const model = gltf.scene;
              model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material = new THREE.MeshStandardMaterial({
                    color: 0x71717a,
                    roughness: 0.94,
                    metalness: 0.06,
                  });
                  child.castShadow = true;
                  child.receiveShadow = true;
                  markSolarBody(child, "bennu");
                }
              });
              const bbox = new THREE.Box3().setFromObject(model);
              const sz = bbox.getSize(new THREE.Vector3());
              const maxD = Math.max(sz.x, sz.y, sz.z) || 1.0;
              model.scale.setScalar(2.0 / maxD);
              bennuHolder.add(model);
            },
            undefined,
            () => {
              sph.visible = true;
            },
          );
        } else {
          sph.visible = true;
        }
      }

      scaleGroup.add(tiltGroup);
      bg.add(scaleGroup);
      markSolarBody(bg, b.id);
      group.add(bg);
      extraBodies[b.id] = bg;
      bodyScaleGroups[b.id] = scaleGroup;
      planetTiltGroups[b.id] = tiltGroup;
      planetSpinMeshes[b.id] = sph;
    }

    // True 3D inclined elliptical LineLoop sampled from SI Keplerian elements
    const samples = sampleKeplerOrbitPointsSI(b.id, 192);
    orbitSamplesSI[b.id] = samples;
    const ptsAttr = new Float32Array(samples.length * 3);
    for (let i = 0; i < samples.length; i++) {
      const pt = projectHeliocentricSIToScene(
        b.id,
        samples[i],
        "exploration",
        SOLAR_SUN_ORIGIN_X,
        SOLAR_SUN_ORIGIN_Z,
      );
      ptsAttr[i * 3] = pt.x;
      ptsAttr[i * 3 + 1] = pt.y;
      ptsAttr[i * 3 + 2] = pt.z;
    }
    const lineGeoOrbit = new THREE.BufferGeometry();
    lineGeoOrbit.setAttribute(
      "position",
      new THREE.BufferAttribute(ptsAttr, 3),
    );
    const baseOp =
      b.id === "earth" || b.id === "mars"
        ? 0.48
        : b.category === "planet"
          ? 0.32
          : 0.2;
    const orbitColor =
      b.id === "earth"
        ? 0x38bdf8
        : b.id === "mars"
          ? 0xfb923c
          : b.category === "comet"
            ? 0x38bdf8
            : b.category === "dwarf"
              ? 0x64748b
              : 0x7dd3fc;
    const orbitLoop = new THREE.LineLoop(
      lineGeoOrbit,
      new THREE.LineBasicMaterial({
        color: orbitColor,
        transparent: true,
        opacity: baseOp,
      }),
    );
    orbitLoop.userData.baseOpacity = baseOp;
    orbitLoop.frustumCulled = false;
    group.add(orbitLoop);
    orbitLines[b.id] = orbitLoop;
  });

  // Glowing Cyan Selection Halo Ring around focused planet
  const selectionRing = new THREE.Group();
  selectionRing.visible = false;
  const selPrimary = new THREE.Mesh(
    new THREE.TorusGeometry(1.42, 0.042, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  selPrimary.rotation.x = Math.PI / 2 - 0.24;
  const selOuter = new THREE.Mesh(
    new THREE.TorusGeometry(1.62, 0.024, 10, 64),
    new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  selOuter.rotation.x = Math.PI / 2 - 0.24;
  selectionRing.add(selPrimary, selOuter);
  group.add(selectionRing);

  // Kuiper Belt & Outer Oort Cloud Halo Points
  const makeBeltPoints = (
    count: number,
    minR: number,
    maxR: number,
    spherical: boolean,
    colHex: number,
  ) => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = minR + Math.random() * (maxR - minR);
      if (spherical) {
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(a);
        pos[i * 3 + 1] = r * Math.cos(phi) * 0.45;
        pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(a);
      } else {
        pos[i * 3] = Math.cos(a) * r;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 4.5;
        pos[i * 3 + 2] = Math.sin(a) * r;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: colHex,
        size: spherical ? 1.4 : 1.1,
        transparent: true,
        opacity: 0.42,
        sizeAttenuation: false,
      }),
    );
  };
  const kuiperBelt = makeBeltPoints(380, 150, 186, false, 0x93c5fd);
  kuiperBelt.position.copy(sunOrigin);
  group.add(kuiperBelt);

  const oortCloud = makeBeltPoints(450, 225, 295, true, 0x64748b);
  oortCloud.position.copy(sunOrigin);
  group.add(oortCloud);

  // Subtle close-range space parallax micro-dust around Orion (wrapped seamlessly per frame)
  const dustCount = 220;
  const spaceDustSeeds = new Float32Array(dustCount * 3);
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    const sx = (Math.random() - 0.5) * 56;
    const sy = (Math.random() - 0.5) * 24;
    const sz = (Math.random() - 0.5) * 56;
    spaceDustSeeds[i * 3] = sx;
    spaceDustSeeds[i * 3 + 1] = sy;
    spaceDustSeeds[i * 3 + 2] = sz;
    dustPositions[i * 3] = sx;
    dustPositions[i * 3 + 1] = sy;
    dustPositions[i * 3 + 2] = sz;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const spaceDust = new THREE.Points(
    dustGeo,
    new THREE.PointsMaterial({
      color: 0xbae6fd,
      size: 0.14,
      transparent: true,
      opacity: 0.45,
      sizeAttenuation: true,
      depthWrite: false,
    }),
  );
  spaceDust.frustumCulled = false;
  group.add(spaceDust);

  return {
    group,
    nebulaDome,
    sun,
    sunLight,
    sunOuterGlow,
    shipGroup,
    shipFlame,
    shipPlumeInner,
    shipFillLight,
    shipShieldShell,
    shipWingsGroup,
    progradeMarker,
    retrogradeMarker,
    orbitTrail,
    earthBodyGroup,
    earthNight,
    earthClouds,
    earthScatter,
    earthAtmo,
    marsAtmo,
    sunCorona,
    asteroidBelt,
    asteroidBeltSeeds,
    stormRing,
    satellite,
    relayStageRing,
    gatewayGroup,
    marsPhobos,
    planets,
    extraBodies,
    bodyScaleGroups,
    planetTiltGroups,
    planetSpinMeshes,
    orbitLines,
    orbitSamplesSI,
    lunarOrbitLine,
    lunarOrbitSamplesSI,
    transferArcs,
    selectionRing,
    halleyTail,
    kuiperBelt,
    oortCloud,
    spaceDust,
    spaceDustSeeds,
    targetBeacon,
    shipBeacon,
    courseLine,
  };
}

export interface CrashFxHandles {
  group: THREE.Group;
  fireball: THREE.Mesh;
  shockwave: THREE.Mesh;
  debrisMesh: THREE.InstancedMesh;
  debrisSeeds: Array<{
    vx: number;
    vy: number;
    vz: number;
    rx: number;
    ry: number;
    rz: number;
    scale: number;
  }>;
}

export function createCrashFxSystem(tex: ProceduralTextureSet): CrashFxHandles {
  const group = new THREE.Group();
  group.visible = false;

  const fireball = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 20, 16),
    new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    }),
  );
  group.add(fireball);

  const shockwave = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 1.35, 36),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  shockwave.rotation.x = -Math.PI / 2;
  group.add(shockwave);

  const debrisCount = 28;
  const debrisMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.42, 0.18, 0.34),
    new THREE.MeshStandardMaterial({
      map: tex.foilAlbedo,
      color: 0xfbbf24,
      metalness: 0.82,
      roughness: 0.32,
    }),
    debrisCount,
  );
  debrisMesh.frustumCulled = false;
  group.add(debrisMesh);

  const debrisSeeds = Array.from({ length: debrisCount }, (_, i) => {
    const a = (i / debrisCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const speed = 4.5 + Math.random() * 11.5;
    return {
      vx: Math.cos(a) * speed,
      vy: 4.5 + Math.random() * 11.0,
      vz: Math.sin(a) * speed,
      rx: (Math.random() - 0.5) * 14,
      ry: (Math.random() - 0.5) * 14,
      rz: (Math.random() - 0.5) * 14,
      scale: 0.55 + Math.random() * 1.25,
    };
  });

  return { group, fireball, shockwave, debrisMesh, debrisSeeds };
}
