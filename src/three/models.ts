import * as THREE from 'three';
import {
  MARS_LANDING_ZONES,
  MARS_OBJECTIVES,
  MOON_LANDING_ZONES,
  MOON_OBJECTIVES,
  SOLAR_TARGETS,
} from '../game/constants';
import { getLunarTerrainHeight, getSurfaceTerrainHeight } from '../game/physics';
import type { RoverCollider, SpaceTargetId, SurfacePlanet } from '../game/types';
import type { ProceduralTextureSet } from './textures';

export function tagPart(obj: THREE.Object3D, partId: string) {
  obj.traverse((child) => {
    child.userData.partId = partId;
  });
}

const UP_AXIS = new THREE.Vector3(0, 1, 0);

function createStrutBetween(
  p1: THREE.Vector3,
  p2: THREE.Vector3,
  rTop: number,
  rBot: number,
  mat: THREE.Material
): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const len = Math.max(0.001, dir.length());
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, len, 10), mat);
  mesh.position.copy(p1).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(UP_AXIS, dir.normalize());
  mesh.castShadow = true;
  return mesh;
}

export interface LunarEnvironmentHandles {
  group: THREE.Group;
  colliders: RoverCollider[];
  moonColliders: RoverCollider[];
  marsColliders: RoverCollider[];
  applyPlanet: (planet: SurfacePlanet) => void;
  earthGroup: THREE.Group;
  earthGlobe: THREE.Mesh;
  earthClouds: THREE.Mesh;
  marsDecorGroup: THREE.Group;
  padLight: THREE.PointLight;
  objectiveMeshes: Array<{
    id: string;
    planet: SurfacePlanet;
    group: THREE.Group;
    crystal: THREE.Mesh;
    beam: THREE.Mesh;
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
}

export function createLunarEnvironment(tex: ProceduralTextureSet): LunarEnvironmentHandles {
  const group = new THREE.Group();
  const moonColliders: RoverCollider[] = [];
  const marsColliders: RoverCollider[] = [];
  let activePlanet: SurfacePlanet = 'moon';

  // 1. Earth in Lunar Sky
  const earthGroup = new THREE.Group();
  earthGroup.position.set(-180, 130, -390);
  const earthGlobe = new THREE.Mesh(
    new THREE.SphereGeometry(28, 40, 40),
    new THREE.MeshStandardMaterial({
      map: tex.earthAlbedo,
      roughness: 0.52,
      metalness: 0.1,
    })
  );
  earthGlobe.rotation.z = 0.41;
  earthGroup.add(earthGlobe);

  const earthClouds = new THREE.Mesh(
    new THREE.SphereGeometry(28.4, 40, 40),
    new THREE.MeshStandardMaterial({
      map: tex.earthClouds,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      roughness: 0.9,
    })
  );
  earthGroup.add(earthClouds);

  const earthAtmo = new THREE.Mesh(
    new THREE.SphereGeometry(30.4, 36, 36),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide,
    })
  );
  earthGroup.add(earthAtmo);
  group.add(earthGroup);

  // 2. Displaced Dual-Planet Surface Terrain (520m x 520m covering ±140m corridors)
  const terrainGeo = new THREE.PlaneGeometry(520, 520, 150, 150);
  terrainGeo.rotateX(-Math.PI / 2);

  const rebuildTerrainGeometry = (planet: SurfacePlanet) => {
    const posAttr = terrainGeo.attributes.position;
    const colors: number[] = [];
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const y = getSurfaceTerrainHeight(planet, x, z);
      posAttr.setY(i, y);
      if (planet === 'mars') {
        const shade = 0.78 + Math.min(0.2, Math.max(-0.18, y * 0.028));
        colors.push(shade, shade * 0.88, shade * 0.82);
      } else {
        const shade = 0.62 + Math.min(0.24, Math.max(-0.18, y * 0.03));
        colors.push(shade, shade + 0.01, shade + 0.03);
      }
    }
    posAttr.needsUpdate = true;
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();
  };
  rebuildTerrainGeometry('moon');

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
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.55, roughness: 0.45 })
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
  const padRing = new THREE.Mesh(new THREE.RingGeometry(6.2, 6.65, 36), ringMat);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.y = 0.39;
  padGroup.add(padRing);

  const padInner = new THREE.Mesh(
    new THREE.RingGeometry(2.8, 3.1, 32),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
  );
  padInner.rotation.x = -Math.PI / 2;
  padInner.position.y = 0.4;
  padGroup.add(padInner);

  // Landing Pad 'H' markings
  const hMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, side: THREE.DoubleSide });
  const hBarL = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 2.8), hMat);
  hBarL.rotation.x = -Math.PI / 2;
  hBarL.position.set(-0.95, 0.41, 0);
  const hBarR = hBarL.clone();
  hBarR.position.x = 0.95;
  const hCross = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.45), hMat);
  hCross.rotation.x = -Math.PI / 2;
  hCross.position.set(0, 0.41, 0);
  padGroup.add(hBarL, hBarR, hCross);

  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.68, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 })
    );
    bollard.position.set(Math.cos(a) * 8.6, 0.42, Math.sin(a) * 8.6);
    padGroup.add(bollard);

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x38bdf8 : 0xf59e0b })
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
  const hullWhite = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.35 });
  const hullDark = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.55, metalness: 0.55 });
  const nasaBadgeMat = new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true });

  // Lower Pressurized Foundation Collar
  const habBase = new THREE.Mesh(new THREE.CylinderGeometry(6.4, 7.1, 1.5, 12), hullDark);
  habBase.position.y = 0.75;
  habBase.castShadow = true;
  habCore.add(habBase);

  const collarRing = new THREE.Mesh(new THREE.CylinderGeometry(6.1, 6.4, 0.85, 16), hullWhite);
  collarRing.position.y = 1.9;
  habCore.add(collarRing);

  // Multi-deck Warm Interior Core visible inside Geodesic Dome
  const deck1 = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 4.8, 0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, emissive: 0xf59e0b, emissiveIntensity: 0.35 })
  );
  deck1.position.y = 2.3;
  const deck2 = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 3.5, 0.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x38bdf8, emissiveIntensity: 0.3 })
  );
  deck2.position.y = 4.0;
  const centerCore = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.0, 4.4, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, emissive: 0xfbbf24, emissiveIntensity: 0.22 })
  );
  centerCore.position.y = 3.8;
  habCore.add(deck1, deck2, centerCore);

  // Geodesic Glass Dome + Titanium Geodesic Rib Frame
  const habDome = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.42,
      metalness: 0.3,
      roughness: 0.12,
      emissive: 0x0284c7,
      emissiveIntensity: 0.25,
    })
  );
  habDome.position.y = 2.1;
  habCore.add(habDome);

  const domeCage = new THREE.Mesh(
    new THREE.SphereGeometry(5.65, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, wireframe: true, metalness: 0.75, roughness: 0.25 })
  );
  domeCage.position.y = 2.1;
  habCore.add(domeCage);

  // Apex cupola ring on dome top
  const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.1, 0.65, 12), hullWhite);
  cupola.position.y = 6.95;
  habCore.add(cupola);

  // 4 Radial Pressurized Modules (Front Airlock, Lab, Storage, Rover Garage)
  const moduleAngles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  moduleAngles.forEach((ang, idx) => {
    const mod = new THREE.Group();
    mod.rotation.y = ang;

    const tunnel = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.35, 3.6, 16), hullWhite);
    tunnel.rotation.z = Math.PI / 2;
    tunnel.position.set(7.4, 1.45, 0);
    tunnel.castShadow = true;
    mod.add(tunnel);

    const endCap = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.45, 16), hullDark);
    endCap.rotation.z = Math.PI / 2;
    endCap.position.set(9.2, 1.45, 0);
    mod.add(endCap);

    // Module side windows / bay door
    const bayLight = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 0.65),
      new THREE.MeshBasicMaterial({ color: idx === 0 ? 0xfbbf24 : 0x38bdf8 })
    );
    bayLight.rotation.y = Math.PI / 2;
    bayLight.position.set(9.44, 1.45, 0);
    mod.add(bayLight);

    // NASA meatball decal on pressurized module side
    const badge = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), nasaBadgeMat);
    badge.position.set(7.6, 1.55, 1.37);
    mod.add(badge);

    // Support legs beneath radial modules
    [-1.1, 1.1].forEach((lz) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 8), hullDark);
      leg.position.set(8.2, 0.6, lz);
      mod.add(leg);
    });

    habCore.add(mod);
  });

  tagPart(habCore, 'base-habitat');
  habGroup.add(habCore);

  // Twin Articulated Vertical Solar Power Towers (10m x 6m blueprint proportions)
  const solarGroup = new THREE.Group();
  [-4.2, 4.2].forEach((sz) => {
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.55, 1.1, 10), hullDark);
    pedestal.position.set(-8.6, 0.55, sz);
    solarGroup.add(pedestal);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 6.2, 10), hullWhite);
    mast.position.set(-8.6, 4.1, sz);
    solarGroup.add(mast);

    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 2.8), hullDark);
    yoke.position.set(-8.6, 6.8, sz);
    solarGroup.add(yoke);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 4.8, 2.8),
      new THREE.MeshStandardMaterial({ map: tex.solarPanel, color: 0xffffff, metalness: 0.55, roughness: 0.18 })
    );
    panel.position.set(-8.6, 6.8, sz);
    panel.rotation.z = 0.22;
    panel.castShadow = true;
    solarGroup.add(panel);
  });
  tagPart(solarGroup, 'base-power');
  habGroup.add(solarGroup);

  // Deep Space Comms Antenna Tower
  const commsGroup = new THREE.Group();
  const dishPole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 5.4, 10), hullWhite);
  dishPole.position.set(-5.2, 3.8, -5.8);
  commsGroup.add(dishPole);

  const dishBowl = new THREE.Mesh(
    new THREE.SphereGeometry(1.65, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.65, roughness: 0.2, side: THREE.DoubleSide })
  );
  dishBowl.position.set(-5.2, 6.4, -5.8);
  dishBowl.rotation.x = Math.PI * 0.66;
  commsGroup.add(dishBowl);

  const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.1, 8), hullDark);
  feedHorn.position.set(-5.2, 6.7, -5.2);
  feedHorn.rotation.x = Math.PI * 0.35;
  commsGroup.add(feedHorn);

  tagPart(commsGroup, 'base-comms');
  habGroup.add(commsGroup);

  group.add(habGroup);
  moonColliders.push({ x: -15, z: -13, r: 9.6, type: 'habitat', label: 'Artemis Base Camp' });
  marsColliders.push({ x: -15, z: -13, r: 9.6, type: 'habitat', label: 'Jezero Base & MOXIE' });

  // 4b. Mars Jezero Crater Sedimentary Delta Mesas & Basalt Buttes (visible only on Mars)
  const marsDecorGroup = new THREE.Group();
  marsDecorGroup.visible = false;
  const mesaMat = new THREE.MeshStandardMaterial({
    map: tex.marsAlbedo,
    color: 0xd97745,
    roughness: 0.92,
    metalness: 0.04,
  });
  [
    { x: 78, z: -84, rTop: 11, rBot: 17, h: 12 },
    { x: -88, z: -64, rTop: 9, rBot: 15, h: 11 },
    { x: 92, z: 72, rTop: 10, rBot: 16, h: 10 },
    { x: -82, z: 86, rTop: 12, rBot: 18, h: 13 },
  ].forEach((m) => {
    const mesa = new THREE.Mesh(new THREE.CylinderGeometry(m.rTop, m.rBot, m.h, 7), mesaMat);
    mesa.position.set(m.x, getSurfaceTerrainHeight('mars', m.x, m.z) + m.h * 0.4, m.z);
    mesa.castShadow = true;
    mesa.receiveShadow = true;
    marsDecorGroup.add(mesa);
  });
  // Distant Phobos orbital speck in Mars sky
  const phobos = new THREE.Mesh(
    new THREE.DodecahedronGeometry(3.2, 1),
    new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 })
  );
  phobos.position.set(160, 118, -320);
  marsDecorGroup.add(phobos);
  group.add(marsDecorGroup);

  // 5. Instanced Boulders (expanded across ±138m corridors, clean around all Moon & Mars waypoints)
  const allStations = [...MOON_OBJECTIVES, ...MARS_OBJECTIVES];
  const allLandingZones = [...MOON_LANDING_ZONES, ...MARS_LANDING_ZONES];
  const boulderSpecs: Array<{ x: number; yMoon: number; yMars: number; z: number; s: number; rot: number }> = [];
  for (let i = 0; i < 96; i++) {
    const angle = i * 2.39996;
    const dist = 20 + i * 1.42;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const nearObj = allStations.some((o) => Math.hypot(rx - o.x, rz - o.z) < 7.5);
    const nearPad = allLandingZones.some((lz) => Math.hypot(rx - lz.x, rz - lz.z) < lz.radius + 3.5);
    const nearHab = Math.hypot(rx + 15, rz + 13) < 13;
    if (nearObj || nearPad || nearHab) continue;

    const yMoon = getSurfaceTerrainHeight('moon', rx, rz);
    const yMars = getSurfaceTerrainHeight('mars', rx, rz);
    const s = 0.48 + (i % 6) * 0.22;
    boulderSpecs.push({ x: rx, yMoon, yMars, z: rz, s, rot: i * 0.7 });
    const c: RoverCollider = { x: rx, z: rz, r: s * 1.05, type: 'rock', label: 'Surface Boulder' };
    moonColliders.push(c);
    marsColliders.push({ ...c, label: 'Basalt Boulder' });
  }

  const rockGeo = new THREE.DodecahedronGeometry(1.0, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    map: tex.moonAlbedo,
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.05,
    flatShading: true,
  });
  const boulderInstanced = new THREE.InstancedMesh(rockGeo, rockMat, boulderSpecs.length);
  boulderInstanced.castShadow = true;
  boulderInstanced.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  const updateBouldersForPlanet = (planet: SurfacePlanet) => {
    boulderSpecs.forEach((b, idx) => {
      const y = planet === 'mars' ? b.yMars : b.yMoon;
      dummy.position.set(b.x, y + b.s * 0.28, b.z);
      dummy.rotation.set(b.rot, b.rot * 1.3, 0);
      dummy.scale.set(b.s * 1.2, b.s * 0.75, b.s * 1.05);
      dummy.updateMatrix();
      boulderInstanced.setMatrixAt(idx, dummy.matrix);
      const tone = 0.78 + (idx % 5) * 0.06;
      if (planet === 'mars') {
        tint.setRGB(tone * 1.05, tone * 0.58, tone * 0.42);
      } else {
        tint.setRGB(tone, tone, tone + 0.03);
      }
      boulderInstanced.setColorAt(idx, tint);
    });
    boulderInstanced.instanceMatrix.needsUpdate = true;
    if (boulderInstanced.instanceColor) boulderInstanced.instanceColor.needsUpdate = true;
    rockMat.map = planet === 'mars' ? tex.marsAlbedo : tex.moonAlbedo;
    rockMat.needsUpdate = true;
  };
  updateBouldersForPlanet('moon');
  boulderInstanced.computeBoundingSphere();
  group.add(boulderInstanced);

  // 6. Science Stations at Moon & Mars Objective Coordinates
  const objectiveMeshes: LunarEnvironmentHandles['objectiveMeshes'] = [];
  allStations.forEach((obj) => {
    const g = new THREE.Group();
    const ty = getSurfaceTerrainHeight(obj.planet, obj.x, obj.z);
    g.position.set(obj.x, ty, obj.z);
    g.visible = obj.planet === 'moon';
    const stationCol: RoverCollider = { x: obj.x, z: obj.z, r: 1.5, type: 'station', label: obj.siteName };
    if (obj.planet === 'mars') marsColliders.push(stationCol);
    else moonColliders.push(stationCol);

    if (obj.id.includes('ice') || obj.id.includes('hydrogen')) {
      for (let k = 0; k < 5; k++) {
        const shard = new THREE.Mesh(
          new THREE.ConeGeometry(0.45, 1.5, 6),
          new THREE.MeshStandardMaterial({
            color: obj.color,
            emissive: 0x0284c7,
            emissiveIntensity: 0.45,
            roughness: 0.2,
            metalness: 0.65,
          })
        );
        const a = (k / 5) * Math.PI * 2;
        shard.position.set(Math.cos(a) * 1.0, 0.7, Math.sin(a) * 1.0);
        g.add(shard);
      }
    } else if (obj.id.includes('solar') || obj.id.includes('maaz')) {
      const box = new THREE.Mesh(
        new THREE.CylinderGeometry(1.0, 1.2, 0.8, 8),
        new THREE.MeshStandardMaterial({ map: tex.foilAlbedo, color: 0xffffff, metalness: 0.8, roughness: 0.3 })
      );
      box.position.y = 0.4;
      g.add(box);
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 1.5, 0.1),
        new THREE.MeshStandardMaterial({ map: tex.solarPanel, color: 0xffffff, metalness: 0.5, roughness: 0.2 })
      );
      wing.position.y = 2.2;
      g.add(wing);
    } else if (obj.id.includes('moxie') || obj.id.includes('delta')) {
      const unit = new THREE.Mesh(
        new THREE.BoxGeometry(2.1, 1.3, 1.6),
        new THREE.MeshStandardMaterial({ map: tex.foilAlbedo, color: 0xf8fafc, metalness: 0.75, roughness: 0.28 })
      );
      unit.position.y = 0.75;
      g.add(unit);
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 1.8, 12),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 })
      );
      tank.position.set(1.2, 0.9, 0);
      g.add(tank);
    } else {
      for (let b = 0; b < 3; b++) {
        const mono = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.95, 0),
          new THREE.MeshStandardMaterial({ color: obj.planet === 'mars' ? 0xfdba74 : 0x86efac, roughness: 0.75, metalness: 0.15 })
        );
        mono.position.set((b - 1) * 1.1, 0.8, (b % 2) * 0.5);
        g.add(mono);
      }
    }

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.9, 0),
      new THREE.MeshStandardMaterial({
        color: obj.color,
        emissive: obj.color,
        emissiveIntensity: 0.75,
        roughness: 0.2,
        metalness: 0.8,
      })
    );
    crystal.position.y = 4.4;
    g.add(crystal);

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 1.4, 34, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: obj.color,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    beam.position.y = 17;
    g.add(beam);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(5.2, 5.7, 32),
      new THREE.MeshBasicMaterial({ color: obj.color, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.24;
    g.add(ring);

    group.add(g);
    objectiveMeshes.push({ id: obj.id, planet: obj.planet, group: g, crystal, beam });
  });

  // 7. Moon & Mars Landing Zones
  const landingZoneMeshes: LunarEnvironmentHandles['landingZoneMeshes'] = [];
  const registerZones = (zones: typeof MOON_LANDING_ZONES, planet: SurfacePlanet) => {
    zones.forEach((lz) => {
      const zg = new THREE.Group();
      const zy = getSurfaceTerrainHeight(planet, lz.x, lz.z);
      zg.position.set(lz.x, zy + 0.25, lz.z);
      zg.visible = planet === 'moon';

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(lz.radius - 0.55, lz.radius, 36),
        new THREE.MeshBasicMaterial({ color: lz.color, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
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
        })
      );
      cyl.position.y = 6;
      cyl.visible = false;
      zg.add(cyl);

      group.add(zg);
      landingZoneMeshes.push({ id: lz.id, planet, group: zg, ring, cyl });
    });
  };
  registerZones(MOON_LANDING_ZONES, 'moon');
  registerZones(MARS_LANDING_ZONES, 'mars');

  // 8. Four Approach Sky Gates
  const approachGates: LunarEnvironmentHandles['approachGates'] = [];
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
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 })
    );
    gg.add(torus);
    gg.visible = false;
    group.add(gg);
    approachGates.push({ group: gg, torus, passed: false });
  });

  // 9. Predictive Trajectory Arc
  const arcGeo = new THREE.BufferGeometry();
  arcGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(25 * 3), 3));
  const trajectoryArc = new THREE.Line(
    arcGeo,
    new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.78 })
  );
  trajectoryArc.visible = false;
  group.add(trajectoryArc);

  const envHandles: LunarEnvironmentHandles = {
    group,
    colliders: moonColliders,
    moonColliders,
    marsColliders,
    applyPlanet: (planet: SurfacePlanet) => {
      if (activePlanet === planet) return;
      activePlanet = planet;
      rebuildTerrainGeometry(planet);
      terrainMat.map = planet === 'mars' ? tex.marsAlbedo : tex.moonAlbedo;
      terrainMat.bumpMap = planet === 'mars' ? tex.marsBump : tex.moonBump;
      terrainMat.needsUpdate = true;
      updateBouldersForPlanet(planet);
      earthGroup.visible = planet === 'moon';
      marsDecorGroup.visible = planet === 'mars';
      envHandles.colliders = planet === 'mars' ? marsColliders : moonColliders;
      objectiveMeshes.forEach((om) => {
        om.group.visible = om.planet === planet;
      });
    },
    earthGroup,
    earthGlobe,
    earthClouds,
    marsDecorGroup,
    padLight,
    objectiveMeshes,
    landingZoneMeshes,
    approachGates,
    trajectoryArc,
  };

  return envHandles;
}

export interface LunarLanderHandles {
  group: THREE.Group;
  descentStage: THREE.Group;
  ascentStage: THREE.Group;
  legs: THREE.Group[];
  nozzleGroup: THREE.Group;
  flameMesh: THREE.Mesh;
  flameInner: THREE.Mesh;
  machDiamond: THREE.Mesh;
  engineLight: THREE.PointLight;
  rcsLeft: THREE.Mesh;
  rcsRight: THREE.Mesh;
  legsGroup: THREE.Group;
}

export function createLunarLander(tex: ProceduralTextureSet): LunarLanderHandles {
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
  const cabinLightMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.55, roughness: 0.35 });
  const cabinDarkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.65, roughness: 0.35 });
  const tankMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.82, roughness: 0.22 });

  // Octagonal Descent Stage Hull
  const descentHull = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.35, 1.65, 8), foilMat);
  descentHull.position.y = 1.75;
  descentHull.rotation.y = Math.PI / 8;
  descentHull.castShadow = true;
  descentStage.add(descentHull);

  // Side recessed equipment frame ribs & spherical helium/propellant tanks
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const bay = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.15, 0.35), cabinDarkMat);
    bay.position.set(Math.sin(a) * 2.1, 1.75, Math.cos(a) * 2.1);
    bay.rotation.y = a;
    descentStage.add(bay);

    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.05, 12), tankMat);
    tank.position.set(Math.sin(a) * 2.15, 1.75, Math.cos(a) * 2.15);
    descentStage.add(tank);
  }

  // 4 Articulated Tripod Landing Legs + Boarding Ladder on Front Leg (+Z)
  const legsGroup = new THREE.Group();
  const legs: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const legRoot = new THREE.Group();
    legRoot.rotation.y = a;

    const pUpperCenter = new THREE.Vector3(0, 2.38, 2.08);
    const pFoot = new THREE.Vector3(0, 0.14, 3.24);
    const pMidCollar = new THREE.Vector3(0, 1.38, 2.60);
    const pLowerCenter = new THREE.Vector3(0, 1.02, 2.16);
    const pAnkle = new THREE.Vector3(0, 0.36, 3.12);

    // Primary telescoping shock strut (upper hull -> footpad ball joint)
    legRoot.add(createStrutBetween(pUpperCenter, pFoot, 0.085, 0.068, strutMat));

    // Dual diagonal upper V-braces (hull side outriggers -> mid-leg collar)
    legRoot.add(createStrutBetween(new THREE.Vector3(-0.82, 2.42, 1.98), pMidCollar, 0.048, 0.045, strutMat));
    legRoot.add(createStrutBetween(new THREE.Vector3(0.82, 2.42, 1.98), pMidCollar, 0.048, 0.045, strutMat));

    // Lower A-frame deploy trusses (lower hull -> ankle collar)
    legRoot.add(createStrutBetween(pLowerCenter, pAnkle, 0.05, 0.045, strutMat));
    legRoot.add(createStrutBetween(new THREE.Vector3(-0.66, 1.05, 2.08), pAnkle, 0.042, 0.04, strutMat));
    legRoot.add(createStrutBetween(new THREE.Vector3(0.66, 1.05, 2.08), pAnkle, 0.042, 0.04, strutMat));

    // Dish Footpad + Ankle Collar + Contact Probe
    const footpad = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 0.14, 18), strutMat);
    footpad.position.set(0, 0.07, 3.24);
    legRoot.add(footpad);

    if (i !== 0) {
      const probe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.015, 1.05, 6),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.15 })
      );
      probe.position.set(0, -0.46, 3.24);
      legRoot.add(probe);
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

  // Gimbaled Variable-Thrust Descent Engine Bell
  const nozzleGroup = new THREE.Group();
  nozzleGroup.position.y = 0.85;
  const bell = new THREE.Mesh(
    new THREE.ConeGeometry(0.88, 1.32, 22, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.92, roughness: 0.2, side: THREE.DoubleSide })
  );
  nozzleGroup.add(bell);

  const flameGeo = new THREE.ConeGeometry(0.86, 4.8, 16);
  flameGeo.rotateX(Math.PI);
  flameGeo.translate(0, -2.4, 0);
  const flameMesh = new THREE.Mesh(
    flameGeo,
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85, depthWrite: false })
  );
  flameMesh.position.y = -0.55;
  flameMesh.visible = false;
  nozzleGroup.add(flameMesh);

  const innerFlameGeo = new THREE.ConeGeometry(0.42, 2.8, 12);
  innerFlameGeo.rotateX(Math.PI);
  innerFlameGeo.translate(0, -1.4, 0);
  const flameInner = new THREE.Mesh(
    innerFlameGeo,
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.94, depthWrite: false })
  );
  flameMesh.add(flameInner);

  // Supersonic shock-diamond node (glows inside Mars thin CO2 atmosphere under high throttle)
  const machDiamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 1),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9, depthWrite: false })
  );
  machDiamond.scale.set(0.85, 1.9, 0.85);
  machDiamond.position.set(0, -1.55, 0);
  machDiamond.visible = false;
  flameMesh.add(machDiamond);

  descentStage.add(nozzleGroup);
  const engineLight = new THREE.PointLight(0xf97316, 0, 28);
  engineLight.position.set(0, -0.5, 0);
  descentStage.add(engineLight);
  tagPart(descentStage, 'lm-descent');

  // Faceted Ascent Stage Crew Cabin (LM-2 Blueprint Accurate)
  const cabinCenter = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.92, 1.72, 8), cabinLightMat);
  cabinCenter.position.y = 3.45;
  cabinCenter.rotation.y = Math.PI / 8;
  cabinCenter.castShadow = true;
  ascentStage.add(cabinCenter);

  // Side cylindrical Ascent Propellant & Life Support Cheek Pods
  [-1.48, 1.48].forEach((cx) => {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 1.05, 14), cabinDarkMat);
    pod.rotation.z = Math.PI / 2;
    pod.position.set(cx, 3.35, -0.18);
    ascentStage.add(pod);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.54, 12, 10), tankMat);
    cap.scale.set(0.42, 1, 1);
    cap.position.set(cx + Math.sign(cx) * 0.52, 3.35, -0.18);
    ascentStage.add(cap);
  });

  // Forward Cockpit Face + Egress Hatch + Astronaut Porch
  const fwdPanel = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.45, 1.15), cabinDarkMat);
  fwdPanel.position.set(0, 3.38, 1.42);
  ascentStage.add(fwdPanel);

  const egressHatch = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.78, 0.14), cabinLightMat);
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
  const dockCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.68, 0.42, 16), tankMat);
  dockCollar.position.set(0, 4.48, 0);
  ascentStage.add(dockCollar);

  // S-Band Steerable Parabolic Dish & Feed Horn
  const dishMast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.85, 8), tankMat);
  dishMast.position.set(0.95, 4.65, 0.45);
  ascentStage.add(dishMast);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.56, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.78, roughness: 0.25, side: THREE.DoubleSide })
  );
  dish.position.set(0.95, 5.15, 0.45);
  dish.rotation.x = Math.PI * 0.72;
  ascentStage.add(dish);
  const lmFeed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.36, 8), cabinDarkMat);
  lmFeed.position.set(0.95, 5.18, 0.62);
  lmFeed.rotation.x = Math.PI * 0.22;
  ascentStage.add(lmFeed);

  const nasaDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.52, 0.52),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true })
  );
  nasaDecal.position.set(0, 1.75, 2.38);
  descentStage.add(nasaDecal);
  tagPart(ascentStage, 'lm-ascent');

  // 4-Quad RCS Thruster Clusters (16 nozzles total) on outrigger brackets
  const rcsGroup = new THREE.Group();
  const rcsPodMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
  [
    [-1.78, 1.25],
    [1.78, 1.25],
    [-1.78, -1.25],
    [1.78, -1.25],
  ].forEach(([rx, rz]) => {
    const cluster = new THREE.Group();
    cluster.position.set(rx, 3.65, rz);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.36, 10), rcsPodMat);
    cluster.add(body);
    // 4 small orthogonal RCS nozzles per quad
    const nUp = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 8), tankMat);
    nUp.position.y = 0.26;
    const nDn = nUp.clone();
    nDn.rotation.x = Math.PI;
    nDn.position.y = -0.26;
    const nSide = nUp.clone();
    nSide.rotation.z = Math.sign(rx) * -Math.PI / 2;
    nSide.position.set(Math.sign(rx) * 0.24, 0, 0);
    const nFwd = nUp.clone();
    nFwd.rotation.x = Math.sign(rz) * Math.PI / 2;
    nFwd.position.set(0, 0, Math.sign(rz) * 0.24);
    cluster.add(nUp, nDn, nSide, nFwd);
    rcsGroup.add(cluster);
  });

  const rcsGeo = new THREE.ConeGeometry(0.24, 1.2, 8);
  const rcsMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.85 });
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

  tagPart(rcsGroup, 'lm-rcs');
  tagPart(nozzleGroup, 'lm-rcs');

  group.add(descentStage, ascentStage, rcsGroup);
  return {
    group,
    descentStage,
    ascentStage,
    legs,
    nozzleGroup,
    flameMesh,
    flameInner,
    machDiamond,
    engineLight,
    rcsLeft,
    rcsRight,
    legsGroup,
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
  headlight: THREE.SpotLight;
}

export function createViperRover(tex: ProceduralTextureSet): ViperRoverHandles {
  // Blueprint Accurate: VIPER Lunar Rover (2.0 m x 1.8 m x 1.4 m, 430 kg)
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.45, roughness: 0.4 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.78, roughness: 0.25 });
  const foilMat = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    bumpMap: tex.foilBump,
    bumpScale: 0.08,
    color: 0xffffff,
    metalness: 0.82,
    roughness: 0.25,
  });

  // Central Gold Kapton Avionics Core + White Machined Structural Frame
  const coreBox = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.56, 1.65), foilMat);
  coreBox.position.set(0, 0.86, 0);
  coreBox.castShadow = true;
  bodyGroup.add(coreBox);

  const upperDeck = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.14, 1.85), frameMat);
  upperDeck.position.set(0, 1.18, 0);
  upperDeck.castShadow = true;
  bodyGroup.add(upperDeck);

  // Front & Aft Equipment Bumper Panels with unobstructed NASA Meatball Decal
  const frontFace = new THREE.Mesh(new THREE.BoxGeometry(1.26, 0.52, 0.14), frameMat);
  frontFace.position.set(0, 0.86, 0.88);
  bodyGroup.add(frontFace);

  const nasaFront = new THREE.Mesh(
    new THREE.PlaneGeometry(0.38, 0.38),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true })
  );
  nasaFront.position.set(-0.18, 0.88, 0.96);
  bodyGroup.add(nasaFront);

  const nasaRear = nasaFront.clone();
  nasaRear.position.set(0, 0.88, -0.96);
  nasaRear.rotation.y = Math.PI;
  bodyGroup.add(nasaRear);

  // Aft Battery Pack Module
  const batteryBox = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.44, 0.34), darkMetal);
  batteryBox.position.set(0, 0.86, -0.95);
  bodyGroup.add(batteryBox);

  tagPart(bodyGroup, 'rover-mobility');

  // High-Efficiency Twin Wing Top-Mounted Solar Array (mounted cleanly aft of camera mast)
  const solarGroup = new THREE.Group();
  const panelMat = new THREE.MeshStandardMaterial({
    map: tex.solarPanel,
    color: 0xbfe3ff,
    metalness: 0.52,
    roughness: 0.22,
  });
  [-0.64, 0.64].forEach((px) => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.06, 1.56), panelMat);
    wing.position.set(px, 1.29, -0.2);
    wing.rotation.z = -Math.sign(px) * 0.06;
    wing.castShadow = true;
    solarGroup.add(wing);
  });
  [-0.72, 0.72].forEach((sx) => {
    const sideWing = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 1.62), panelMat);
    sideWing.position.set(sx, 0.96, -0.05);
    solarGroup.add(sideWing);
  });
  tagPart(solarGroup, 'rover-power');
  bodyGroup.add(solarGroup);

  // Panoramic Stereo Camera Mast (clear in front of solar wings) + Headlight + Rear Dish & Whip Antenna
  const commsGroup = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.072, 1.15, 10), frameMat);
  mast.position.set(-0.34, 1.8, 0.72);
  commsGroup.add(mast);

  const camHead = new THREE.Group();
  camHead.position.set(-0.34, 2.38, 0.72);
  camHead.add(new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.24, 0.32), frameMat));
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

  const headlight = new THREE.SpotLight(0xe0f2fe, 2.2, 38, Math.PI / 4, 0.45, 1);
  headlight.position.set(-0.34, 2.3, 0.92);
  headlight.target.position.set(0, 0, 12);
  commsGroup.add(headlight);
  commsGroup.add(headlight.target);

  // Rear High-Gain Parabolic Dish (tilted upward/aft) + Vertical Comms Whip Antenna
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.36, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7, roughness: 0.25, side: THREE.DoubleSide })
  );
  dish.position.set(0.32, 1.56, -0.78);
  dish.rotation.x = Math.PI * 0.85;
  commsGroup.add(dish);

  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.028, 1.15, 8), darkMetal);
  whip.position.set(-0.42, 1.82, -0.78);
  commsGroup.add(whip);

  tagPart(commsGroup, 'rover-comms');
  bodyGroup.add(commsGroup);

  // Forward 2-Segment Articulated TRIDENT Ice Drill Arm (right-front mount, metallic steel & gold collar)
  const drillArm = new THREE.Group();
  drillArm.position.set(0.46, 0.88, 0.9);
  const boom1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.62), frameMat);
  boom1.position.set(0, 0.04, 0.3);
  drillArm.add(boom1);

  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.075, 0.64, 12),
    darkMetal
  );
  housing.position.set(0, -0.26, 0.62);
  drillArm.add(housing);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.1, 12), foilMat);
  collar.position.set(0, -0.52, 0.62);
  drillArm.add(collar);

  const drillBit = new THREE.Mesh(
    new THREE.ConeGeometry(0.068, 0.44, 10),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.88, roughness: 0.22 })
  );
  drillBit.position.set(0, -0.78, 0.62);
  drillBit.rotation.x = Math.PI;
  drillArm.add(drillBit);
  tagPart(drillArm, 'rover-science');
  bodyGroup.add(drillArm);

  group.add(bodyGroup);

  // 4 Rocker-Bogie Articulated Wheel-Legs (FL, FR, RL, RR) pivoted at differential hubs
  [-0.68, 0.68].forEach((sx) => {
    const diffPivot = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.14, 10), darkMetal);
    diffPivot.rotation.z = Math.PI / 2;
    diffPivot.position.set(sx, 0.78, 0);
    tagPart(diffPivot, 'rover-mobility');
    group.add(diffPivot);
  });

  const wheelModules: ViperRoverHandles['wheelModules'] = [];
  const corners: Array<[number, number]> = [
    [-0.92, 0.9],
    [0.92, 0.9],
    [-0.92, -0.9],
    [0.92, -0.9],
  ];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.25 });
  const grouserMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65, metalness: 0.55 });

  corners.forEach(([wx, wz]) => {
    const side = Math.sign(wx);
    const forward = Math.sign(wz);

    // Rocker-Bogie arm pivoted right at differential hub (side * 0.68, 0.78, 0) -> knuckle top (wx, 0.56, wz)
    const arm = new THREE.Group();
    arm.position.set(side * 0.68, 0.78, 0);
    const elbow = new THREE.Vector3(side * 0.2, -0.06, forward * 0.45);
    const knuckleTop = new THREE.Vector3(wx - side * 0.68, 0.56 - 0.78, wz);
    arm.add(createStrutBetween(new THREE.Vector3(0, 0, 0), elbow, 0.048, 0.045, frameMat));
    arm.add(createStrutBetween(elbow, knuckleTop, 0.045, 0.042, frameMat));
    const elbowJoint = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), darkMetal);
    elbowJoint.position.copy(elbow);
    arm.add(elbowJoint);
    tagPart(arm, 'rover-mobility');
    group.add(arm);

    // Vertical Steering Knuckle fork above wheel
    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.34, wz);

    const knuckle = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.34, 8), darkMetal);
    knuckle.position.set(0, 0.24, 0);
    pivot.add(knuckle);

    const spin = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.24, 24), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spin.add(tire);

    // Deep High-Traction Lunar Grouser Cleats
    for (let t = 0; t < 12; t++) {
      const a = (t / 12) * Math.PI * 2;
      const grouser = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.055, 0.06), grouserMat);
      grouser.position.set(0, Math.cos(a) * 0.3, Math.sin(a) * 0.3);
      grouser.rotation.x = a;
      spin.add(grouser);
    }

    // 6-Spoke Inner Wheel Rim + Gold Hubcap
    for (let s = 0; s < 3; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.44, 0.045), grouserMat);
      spoke.rotation.x = (s * Math.PI) / 3;
      spin.add(spoke);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.27, 12), foilMat);
    hub.rotation.z = Math.PI / 2;
    spin.add(hub);

    pivot.add(spin);
    tagPart(pivot, 'rover-mobility');
    group.add(pivot);

    wheelModules.push({ pivot, spin, arm, knuckle, side, forward, baseY: 0.34 });
  });

  return { group, bodyGroup, wheelModules, drillArm, drillBit, dish, camHead, headlight };
}

export interface LaunchComplexHandles {
  group: THREE.Group;
  groundGroup: THREE.Group;
  earthLimb: THREE.Group;
  moonMesh: THREE.Mesh;
  cloudLayer: THREE.Group;
  crewAccessArm: THREE.Group;
  rocketFull: THREE.Group;
  coreGroup: THREE.Group;
  srbLeft: THREE.Group;
  srbRight: THREE.Group;
  srbLeftBsm: THREE.Mesh;
  srbRightBsm: THREE.Mesh;
  upperGroup: THREE.Group;
  icpsFlame: THREE.Group;
  machCone: THREE.Mesh;
  abortTower: THREE.Group;
  lasFlame: THREE.Mesh;
  flameGroup: THREE.Group;
  trenchLight: THREE.PointLight;
}

function buildMobileLauncherAndTrench(tex: ProceduralTextureSet): THREE.Group {
  const g = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, metalness: 0.08 });
  const darkSteelMat = new THREE.MeshStandardMaterial({
    map: tex.towerSteel,
    color: 0xcbd5e1,
    metalness: 0.72,
    roughness: 0.36,
  });
  const hazardMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55, metalness: 0.25 });

  // Raised LC-39B Concrete Apron Split Around Central Flame Trench
  const apronLeft = new THREE.Mesh(new THREE.BoxGeometry(16, 1.2, 28), concreteMat);
  apronLeft.position.set(-12, 0.2, 0);
  apronLeft.receiveShadow = true;
  const apronRight = apronLeft.clone();
  apronRight.position.x = 12;
  g.add(apronLeft, apronRight);

  // Sloped Apron Approach Ramps
  const rampFront = new THREE.Mesh(new THREE.BoxGeometry(40, 0.8, 12), concreteMat);
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
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.92, metalness: 0.15 })
  );
  trenchFloor.position.set(0, -0.25, 0);
  g.add(trenchFloor);

  const deflector = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 4.4, 8.6, 4),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.78, roughness: 0.42 })
  );
  deflector.rotation.y = Math.PI / 4;
  deflector.scale.set(1.1, 0.45, 1.45);
  deflector.position.set(0, 0.75, 0);
  g.add(deflector);

  // Concrete Flame Trench Blast Walls
  [-4.2, 4.2].forEach((wx) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.0, 26), concreteMat);
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
  const deckSlab = new THREE.Mesh(new THREE.BoxGeometry(14.6, 1.55, 14.6), mlpDeckMat);
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
    new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.85, metalness: 0.45 })
  );
  exhaustWell.position.set(0, 2.45, 0);
  mlpBase.add(exhaustWell);

  // 6 MLP Support Mount Pedestals
  [
    [-7.6, -5.8],
    [-7.6, 5.8],
    [-1.6, -5.8],
    [-1.6, 5.8],
    [4.4, -5.8],
    [4.4, 5.8],
  ].forEach(([px, pz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 1.1), darkSteelMat);
    leg.position.set(px, 0.7, pz);
    mlpBase.add(leg);
  });

  // 4 Hold-Down Posts & Twin Tail Service Masts cradling SLS
  [
    [-1.62, -0.52],
    [-1.62, 0.52],
    [1.62, -0.52],
    [1.62, 0.52],
  ].forEach(([hx, hz]) => {
    const clampPost = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.85, 0.32), hazardMat);
    clampPost.position.set(hx, 2.75, hz);
    mlpBase.add(clampPost);
  });

  [-1.95, 1.95].forEach((tz) => {
    const tsm = new THREE.Mesh(new THREE.BoxGeometry(0.75, 2.8, 0.75), darkSteelMat);
    tsm.position.set(-2.35, 3.85, tz);
    tsm.castShadow = true;
    mlpBase.add(tsm);
  });

  g.add(mlpBase);
  return g;
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
  const darkIron = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.82, roughness: 0.35 });
  const armWhite = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.45, roughness: 0.28 });
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
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, towerHeight, 10), steelMat);
    col.position.set(cx, towerHeight / 2, cz);
    col.castShadow = true;
    tower.add(col);
  });

  // 7 Tiered Access Platforms + Diagonal Cross-Bracing per Bay
  const bayHeights = [0, 4.5, 9.0, 13.5, 18.0, 22.5, 27.0, 31.5];
  for (let b = 0; b < bayHeights.length - 1; b++) {
    const y0 = bayHeights[b];
    const y1 = bayHeights[b + 1];

    const deck = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2.18, 0.28, halfW * 2.18), darkIron);
    deck.position.y = y1;
    deck.castShadow = true;
    tower.add(deck);

    // Front, Back, Left, Right X-bracing trusses
    const faces: Array<[number, number, number, number]> = [
      [-halfW, halfW, halfW, halfW],
      [-halfW, -halfW, halfW, -halfW],
      [-halfW, -halfW, -halfW, halfW],
      [halfW, -halfW, halfW, halfW],
    ];
    faces.forEach(([x1, z1, x2, z2]) => {
      tower.add(createStrutBetween(new THREE.Vector3(x1, y0, z1), new THREE.Vector3(x2, y1, z2), 0.06, 0.06, steelMat));
      tower.add(createStrutBetween(new THREE.Vector3(x2, y0, z2), new THREE.Vector3(x1, y1, z1), 0.06, 0.06, steelMat));
    });
  }

  // Interior Dual Crew Elevator Shaft
  const elevShaft = new THREE.Mesh(new THREE.BoxGeometry(1.15, towerHeight - 1.5, 1.15), darkIron);
  elevShaft.position.set(-0.4, towerHeight / 2, 0);
  tower.add(elevShaft);

  // Umbilical Swing Arms connecting Tower -> SLS Core & ICPS (flush with hull wall at local x=5.92)
  [11.2, 16.5, 20.1].forEach((uy, idx) => {
    const len = idx === 2 ? 4.02 : 3.74;
    const uArm = new THREE.Mesh(new THREE.BoxGeometry(len, 0.36, 0.58), steelMat);
    uArm.position.set(1.9 + len / 2, uy, 0);
    tower.add(uArm);
    const coupler = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.52, 0.72), darkIron);
    coupler.position.set(1.9 + len, uy, 0);
    tower.add(coupler);
  });

  // Retractable White Orion Crew Access Arm (aligned flush with Orion Crew Module hatch at y=22.50)
  const crewAccessArm = new THREE.Group();
  crewAccessArm.position.set(halfW, 22.46, 0);
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.78, 1.0), armWhite);
  walkway.position.set(2.02, 0, 0);
  walkway.castShadow = true;
  crewAccessArm.add(walkway);
  const bellows = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.88, 1.1), darkIron);
  bellows.position.set(4.02, 0, 0);
  crewAccessArm.add(bellows);
  tower.add(crewAccessArm);

  // Top Hammerhead Crane + Lightning Protection Spire
  const craneBoom = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.55, 1.1), darkIron);
  craneBoom.position.set(1.2, towerHeight + 0.45, 0);
  tower.add(craneBoom);

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.16, 4.6, 8), steelMat);
  spire.position.set(0, towerHeight + 2.8, 0);
  tower.add(spire);

  const topBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), beaconMat);
  topBeacon.position.set(0, towerHeight + 5.15, 0);
  tower.add(topBeacon);

  tagPart(tower, 'lc39b-tower');
  return { tower, crewAccessArm };
}

function buildPerimeterInfrastructure(tex: ProceduralTextureSet): THREE.Group {
  const g = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    map: tex.towerSteel,
    color: 0x94a3b8,
    metalness: 0.72,
    roughness: 0.35,
  });
  const whiteTankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.45, roughness: 0.32 });
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
  const xenonMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

  // 4 Catenary Lightning Protection Towers around Pad 39B
  [
    [-25, -18],
    [25, -18],
    [-27, 17],
    [27, 17],
  ].forEach(([lx, lz]) => {
    const lt = new THREE.Group();
    lt.position.set(lx, 0, lz);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.95, 34, 6), steelMat);
    mast.position.y = 17;
    mast.castShadow = true;
    lt.add(mast);

    const mastTip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.16, 5.2, 6), steelMat);
    mastTip.position.y = 36.4;
    lt.add(mastTip);

    const redLight = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), beaconMat);
    redLight.position.y = 39.1;
    lt.add(redLight);
    g.add(lt);
  });

  // 6 Stadium Xenon Floodlight Masts illuminating Pad 39B
  [
    [-19, 10],
    [19, 10],
    [-22, -4],
    [22, -4],
    [-16, -19],
    [16, -19],
  ].forEach(([fx, fz]) => {
    const fl = new THREE.Group();
    fl.position.set(fx, 0, fz);
    fl.lookAt(0, 8, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 13.5, 8), steelMat);
    pole.position.y = 6.75;
    fl.add(pole);

    const rack = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.35, 0.32), steelMat);
    rack.position.y = 13.6;
    fl.add(rack);

    const lampFace = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 1.1), xenonMat);
    lampFace.position.set(0, 13.6, 0.18);
    fl.add(lampFace);
    g.add(fl);
  });

  // LC-39B Deluge Water Tower & Spherical LH2 / LOX Cryo Storage Tanks
  const waterTower = new THREE.Group();
  waterTower.position.set(-34, 0, -14);
  const wtLegs = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.2, 13, 8, 1, true), steelMat);
  wtLegs.position.y = 6.5;
  waterTower.add(wtLegs);
  const wtBowl = new THREE.Mesh(new THREE.SphereGeometry(3.2, 18, 14), whiteTankMat);
  wtBowl.scale.set(1, 0.78, 1);
  wtBowl.position.y = 14.5;
  wtBowl.castShadow = true;
  waterTower.add(wtBowl);
  g.add(waterTower);

  [
    [32, -16, 3.6],
    [38, -8, 2.8],
  ].forEach(([cx, cz, rad]) => {
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(rad, 20, 16), whiteTankMat);
    sphere.position.set(cx, rad + 1.4, cz);
    sphere.castShadow = true;
    g.add(sphere);
    const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(rad * 0.78, rad * 0.9, 1.6, 12), steelMat);
    baseRing.position.set(cx, 0.8, cz);
    g.add(baseRing);
  });

  // Elevated Insulated LOX / LH2 Cryogenic Transfer Pipes connecting Spheres to Mobile Launcher
  const cryoPipeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.25 });
  const cryoLegA = createStrutBetween(new THREE.Vector3(31, 2.2, -14.5), new THREE.Vector3(5.6, 2.2, -2.5), 0.22, 0.22, cryoPipeMat);
  const cryoLegB = createStrutBetween(new THREE.Vector3(36, 1.8, -7.5), new THREE.Vector3(5.6, 1.8, 1.8), 0.18, 0.18, cryoPipeMat);
  g.add(cryoLegA, cryoLegB);

  // Deluge Water Pipe from Elevated Sphere Tank into Flame Trench
  const delugePipeMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.45, roughness: 0.4 });
  g.add(createStrutBetween(new THREE.Vector3(-32, 1.4, -12.8), new THREE.Vector3(-4.5, 1.4, -2.2), 0.26, 0.26, delugePipeMat));

  // Crawlerway Road stretching Southwest toward distant Vehicle Assembly Building (VAB)
  const gravelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.95, metalness: 0.04 });
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, metalness: 0.05 });
  const crawlerway = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.18, 220), gravelMat);
  crawlerway.position.set(-22, -0.28, 122);
  crawlerway.rotation.y = -0.22;
  crawlerway.receiveShadow = true;
  g.add(crawlerway);

  // Outer Asphalt Perimeter Road & Pad Turnaround
  const perimRing = new THREE.Mesh(new THREE.RingGeometry(44, 48.5, 48), roadMat);
  perimRing.rotation.x = -Math.PI / 2;
  perimRing.position.y = -0.34;
  perimRing.receiveShadow = true;
  g.add(perimRing);

  // Atlantic Ocean Surf & Cape Canaveral Dunes along East/North Horizon
  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(920, 280),
    new THREE.MeshStandardMaterial({ color: 0x0c3454, roughness: 0.22, metalness: 0.55 })
  );
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(40, -0.52, -260);
  g.add(ocean);

  const beachSand = new THREE.Mesh(
    new THREE.BoxGeometry(900, 0.28, 26),
    new THREE.MeshStandardMaterial({ color: 0x7c6f59, roughness: 0.95, metalness: 0 })
  );
  beachSand.position.set(20, -0.32, -118);
  g.add(beachSand);

  // Distant NASA Vehicle Assembly Building (VAB) Silhouette + Launch Control Center
  const vabGroup = new THREE.Group();
  vabGroup.position.set(-76, 0, 232);
  vabGroup.rotation.y = 0.25;
  const vabWallMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.72, metalness: 0.15 });
  const vabDoorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65, metalness: 0.35 });
  const vabMain = new THREE.Mesh(new THREE.BoxGeometry(36, 40, 32), vabWallMat);
  vabMain.position.y = 20;
  vabGroup.add(vabMain);
  const vabLowBay = new THREE.Mesh(new THREE.BoxGeometry(22, 18, 28), vabWallMat);
  vabLowBay.position.set(26, 9, 0);
  vabGroup.add(vabLowBay);
  const vabDoor = new THREE.Mesh(new THREE.BoxGeometry(8.5, 34, 0.6), vabDoorMat);
  vabDoor.position.set(-6, 17, -16.1);
  vabGroup.add(vabDoor);
  const vabStripe = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 14),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true })
  );
  vabStripe.position.set(8, 24, -16.2);
  vabStripe.rotation.y = Math.PI;
  vabGroup.add(vabStripe);
  g.add(vabGroup);

  // S-Band Telemetry Tracking Dish Station
  const dishBase = new THREE.Group();
  dishBase.position.set(42, 0, 28);
  const dPedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.45, 5.2, 12), whiteTankMat);
  dPedestal.position.y = 2.6;
  dishBase.add(dPedestal);
  const dDish = new THREE.Mesh(
    new THREE.SphereGeometry(2.8, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.6, roughness: 0.3, side: THREE.DoubleSide })
  );
  dDish.position.y = 5.6;
  dDish.rotation.x = Math.PI * 0.72;
  dishBase.add(dDish);
  g.add(dishBase);

  // Instanced Space Coast Palmetto Scrub Mounds outside Perimeter Road
  const scrubGeo = new THREE.DodecahedronGeometry(1.4, 1);
  const scrubMat = new THREE.MeshStandardMaterial({ color: 0x1e3a2f, roughness: 0.94, metalness: 0.02 });
  const scrubMesh = new THREE.InstancedMesh(scrubGeo, scrubMat, 88);
  const sd = new THREE.Object3D();
  for (let i = 0; i < 88; i++) {
    const ang = (i * 2.39996) % (Math.PI * 2);
    const rad = 52 + ((i * 19.7) % 92);
    const sx = Math.cos(ang) * rad;
    const sz = Math.sin(ang) * rad;
    if (sz < -105) continue;
    sd.position.set(sx, 0.05, sz);
    const sc = 0.7 + ((i * 7) % 10) * 0.14;
    sd.scale.set(sc * 1.4, sc * 0.55, sc * 1.4);
    sd.rotation.y = ang;
    sd.updateMatrix();
    scrubMesh.setMatrixAt(i, sd.matrix);
  }
  scrubMesh.instanceMatrix.needsUpdate = true;
  g.add(scrubMesh);

  return g;
}

export function createLaunchComplexAndSLS(tex: ProceduralTextureSet): LaunchComplexHandles {
  // Blueprint Accurate: SLS Block 1 (111.3m height, Core 65.1m x 8.4m, Twin SRBs 54.9m x 3.7m, Orion + LAS 9.8m)
  const group = new THREE.Group();
  group.visible = false;

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(760, 32, 22),
    new THREE.MeshBasicMaterial({ map: tex.duskSky, side: THREE.BackSide, fog: false })
  );
  group.add(skyDome);

  // Realistic Distant Moon Hanging High in the Upper-Right Sky (never floating near the launch tower)
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(9.2, 36, 32),
    new THREE.MeshStandardMaterial({
      map: tex.moonSphereAlbedo,
      bumpMap: tex.moonBump,
      bumpScale: 0.22,
      color: 0xf8fafc,
      emissive: 0x334155,
      emissiveIntensity: 0.36,
      roughness: 0.88,
      metalness: 0.04,
      fog: false,
    })
  );
  moonMesh.position.set(64, 178, -485);
  group.add(moonMesh);

  // Atmospheric Cloud Deck Floating Across Space Coast Horizon
  const cloudLayer = new THREE.Group();
  const cloudMat = new THREE.SpriteMaterial({
    map: tex.cloudPuff,
    color: 0xfde68a,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const coolCloudMat = new THREE.SpriteMaterial({
    map: tex.cloudPuff,
    color: 0x94a3b8,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  });
  for (let i = 0; i < 36; i++) {
    const sp = new THREE.Sprite(i % 2 === 0 ? cloudMat : coolCloudMat);
    const angle = (i / 36) * Math.PI * 1.4 - Math.PI * 0.7;
    const dist = 145 + (i % 5) * 34;
    sp.position.set(Math.sin(angle) * dist, 18 + (i % 6) * 5.5, -Math.cos(angle) * dist);
    const w = 48 + (i % 4) * 18;
    sp.scale.set(w, w * 0.32, 1);
    cloudLayer.add(sp);
  }
  group.add(cloudLayer);

  // Pad 39B Ground Complex
  const groundGroup = new THREE.Group();
  const plain = new THREE.Mesh(
    new THREE.CircleGeometry(480, 56),
    new THREE.MeshStandardMaterial({ map: tex.kscGround, color: 0xffffff, roughness: 0.94, metalness: 0 })
  );
  plain.rotation.x = -Math.PI / 2;
  plain.position.y = -0.4;
  plain.receiveShadow = true;
  groundGroup.add(plain);

  groundGroup.add(buildMobileLauncherAndTrench(tex));
  const { tower, crewAccessArm } = buildLC39BServiceTower(tex);
  groundGroup.add(tower);
  groundGroup.add(buildPerimeterInfrastructure(tex));

  const trenchLight = new THREE.PointLight(0xf97316, 0, 56);
  trenchLight.position.set(0, 1.4, 2.0);
  groundGroup.add(trenchLight);
  group.add(groundGroup);

  // Curved Earth Horizon for > 20 km
  const earthLimb = new THREE.Group();
  earthLimb.position.set(0, -102, 0);
  earthLimb.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(95, 40, 28),
      new THREE.MeshStandardMaterial({ map: tex.earthAlbedo, color: 0xffffff, roughness: 0.55, metalness: 0.1 })
    )
  );
  earthLimb.visible = false;
  group.add(earthLimb);

  // SLS Block 1 Stack (Single Rocket Instance shared across Title, Inspector, and Launch)
  const rocketFull = new THREE.Group();
  const coreGroup = new THREE.Group();
  const coreStage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.08, 1.08, 15.8, 32),
    new THREE.MeshStandardMaterial({ map: tex.slsCore, color: 0xffffff, roughness: 0.5, metalness: 0.16 })
  );
  coreStage.position.y = 8.9;
  coreStage.castShadow = true;
  coreGroup.add(coreStage);

  // External LOX Feedlines & Avionics System Tunnel along Core Stage
  const feedMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.48, metalness: 0.25 });
  const racewayMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.42, metalness: 0.28 });
  [-1.1, 1.1].forEach((fx) => {
    const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 13.8, 10), feedMat);
    conduit.position.set(fx, 8.6, 0.25);
    coreGroup.add(conduit);
  });
  const sysTunnel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 14.2, 0.18), racewayMat);
  sysTunnel.position.set(0, 8.8, 1.1);
  coreGroup.add(sysTunnel);

  // 4 Detailed RS-25 Engine Bells + Turbopump Gimbal Collars + Glowing Throats
  const rs25Positions: Array<[number, number, number]> = [
    [-0.44, 0.9, -0.44],
    [0.44, 0.9, -0.44],
    [-0.44, 0.9, 0.44],
    [0.44, 0.9, 0.44],
  ];
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.92,
    roughness: 0.18,
    side: THREE.DoubleSide,
  });
  const collarMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
  rs25Positions.forEach(([px, py, pz]) => {
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.28, 14), collarMat);
    collar.position.set(px, py + 0.16, pz);
    coreGroup.add(collar);
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.44, 0.95, 22, 1, true), bellMat);
    bell.position.set(px, py - 0.34, pz);
    coreGroup.add(bell);
  });
  tagPart(coreGroup, 'sls-core');

  // Twin 5-Segment Solid Rocket Boosters (54.9m proportion)
  const makeSrb = (xOffset: number) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.47, 11.4, 24),
      new THREE.MeshStandardMaterial({ map: tex.slsSrb, color: 0xffffff, roughness: 0.34, metalness: 0.18 })
    );
    body.position.set(xOffset, 7.2, 0);
    body.castShadow = true;
    g.add(body);

    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.47, 1.95, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.18 })
    );
    cone.position.set(xOffset, 13.88, 0);
    g.add(cone);

    // 5-Segment Field Joint Stiffener Rings
    [3.0, 5.4, 7.8, 10.2].forEach((ry) => {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 0.1, 20), collarMat);
      ring.position.set(xOffset, ry, 0);
      g.add(ring);
    });

    // Upper & Lower Heavy Attach Struts to Core Stage
    [3.2, 11.6].forEach((sy) => {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.24, 0.32), collarMat);
      strut.position.set(xOffset * 0.76, sy, 0);
      g.add(strut);
    });

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.66, 1.15, 20),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38, metalness: 0.2 })
    );
    skirt.position.set(xOffset, 1.05, 0);
    g.add(skirt);

    const srbNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.44, 0.65, 18, 1, true), bellMat);
    srbNozzle.position.set(xOffset, 0.35, 0);
    g.add(srbNozzle);

    // Booster Separation Motor (BSM) radial plume puff
    const bsm = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 2.2, 10),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.92 })
    );
    bsm.position.set(xOffset - Math.sign(xOffset) * 0.45, 13.2, 0);
    bsm.rotation.z = Math.sign(xOffset) * (Math.PI / 2);
    bsm.visible = false;
    g.add(bsm);

    tagPart(g, 'sls-boosters');
    return { g, bsm };
  };
  const srbLeftBuilt = makeSrb(-1.62);
  const srbRightBuilt = makeSrb(1.62);
  const srbLeft = srbLeftBuilt.g;
  const srbRight = srbRightBuilt.g;
  const srbLeftBsm = srbLeftBuilt.bsm;
  const srbRightBsm = srbRightBuilt.bsm;

  // Upper Stage Stack (LVSA + ICPS + Stage Adapter + ESM + Orion + Seamless LAS Ogive Tower)
  const upperGroup = new THREE.Group();
  const icpsGroup = new THREE.Group();

  const lvsa = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 1.08, 2.2, 28),
    new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.46, metalness: 0.22 })
  );
  lvsa.position.y = 17.9;
  icpsGroup.add(lvsa);

  const icps = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 2.08, 24),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.42 })
  );
  icps.position.y = 20.02;
  icpsGroup.add(icps);

  // ICPS RL10 Vacuum Cryogenic Engine Bell & Plume
  const icpsNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.68, 16, 1, true), bellMat);
  icpsNozzle.position.y = 18.6;
  icpsGroup.add(icpsNozzle);

  const icpsFlame = new THREE.Group();
  icpsFlame.position.y = 18.2;
  const icpsOuter = new THREE.Mesh(
    new THREE.ConeGeometry(0.54, 4.2, 16),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.68 })
  );
  icpsOuter.rotation.x = Math.PI;
  icpsOuter.position.y = -2.1;
  const icpsCore = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 2.4, 12),
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.92 })
  );
  icpsCore.rotation.x = Math.PI;
  icpsCore.position.y = -1.2;
  icpsFlame.add(icpsOuter, icpsCore);
  icpsFlame.visible = false;
  icpsGroup.add(icpsFlame);

  // NASA Meatball decal cleanly mounted on ICPS fairing
  const orionDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.46, 0.46),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true })
  );
  orionDecal.position.set(0, 20.05, 0.7);
  icpsGroup.add(orionDecal);
  tagPart(icpsGroup, 'sls-icps');
  upperGroup.add(icpsGroup);

  const orionStack = new THREE.Group();
  const stageAdapter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.67, 0.68, 0.44, 28),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.38 })
  );
  stageAdapter.position.y = 21.26;
  orionStack.add(stageAdapter);

  // European Service Module (ESM) cylindrical bus + folded solar bay ribs
  const esmBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.67, 0.67, 0.72, 24),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.32, metalness: 0.65 })
  );
  esmBody.position.y = 21.82;
  orionStack.add(esmBody);

  const heatshieldRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.67, 0.14, 28),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.5 })
  );
  heatshieldRing.position.y = 22.22;
  orionStack.add(heatshieldRing);

  // Orion Crew Module frustum seated flush atop ESM (22.24..23.12)
  const orion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.68, 0.88, 28),
    new THREE.MeshStandardMaterial({ map: tex.orionTile, color: 0xffffff, roughness: 0.34, metalness: 0.3 })
  );
  orion.position.y = 22.68;
  orionStack.add(orion);

  // Transonic Mach-1 Condensation Vapor Cone
  const machCone = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 3.8, 28, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  machCone.position.y = 18.8;
  machCone.visible = false;
  orionStack.add(machCone);

  // Launch Abort System (LAS) Ogive Fairing & Escape Tower seated flush on Orion forward ring
  const abortTower = new THREE.Group();
  abortTower.position.y = 23.02;
  const lasBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.38, 1.45, 24),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.22 })
  );
  lasBody.position.y = 0.62;
  abortTower.add(lasBody);
  const lasCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.19, 0.19, 0.14, 16),
    collarMat
  );
  lasCollar.position.y = 1.32;
  abortTower.add(lasCollar);
  const lasTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.15, 1.25, 18),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.28, metalness: 0.22 })
  );
  lasTip.position.y = 1.95;
  abortTower.add(lasTip);
  const lasFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.36, 2.5, 12),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 })
  );
  lasFlame.rotation.x = Math.PI;
  lasFlame.position.y = -0.4;
  lasFlame.visible = false;
  abortTower.add(lasFlame);
  orionStack.add(abortTower);

  tagPart(orionStack, 'sls-upper');
  upperGroup.add(orionStack);

  // Multi-Layer Incandescent Exhaust Plume Group (RS-25 Mach Blue + White Core & SRB Blazing Amber)
  const flameGroup = new THREE.Group();
  rs25Positions.forEach(([px, , pz]) => {
    const outer = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 2.6, 14),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.88 })
    );
    outer.rotation.x = Math.PI;
    outer.position.set(px, -0.5, pz);
    flameGroup.add(outer);

    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 1.65, 10),
      new THREE.MeshBasicMaterial({ color: 0xfef9c3, transparent: true, opacity: 0.95 })
    );
    core.rotation.x = Math.PI;
    core.position.set(px, -0.2, pz);
    flameGroup.add(core);
  });
  [-1.62, 1.62].forEach((bx) => {
    const srbOuter = new THREE.Mesh(
      new THREE.ConeGeometry(0.76, 5.4, 16),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 })
    );
    srbOuter.rotation.x = Math.PI;
    srbOuter.position.set(bx, -2.1, 0);
    flameGroup.add(srbOuter);

    const srbInner = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 3.6, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 })
    );
    srbInner.rotation.x = Math.PI;
    srbInner.position.set(bx, -1.3, 0);
    flameGroup.add(srbInner);
  });
  flameGroup.position.y = 0.6;
  flameGroup.visible = false;
  coreGroup.add(flameGroup);

  rocketFull.add(coreGroup, srbLeft, srbRight, upperGroup);
  group.add(rocketFull);

  return {
    group,
    groundGroup,
    earthLimb,
    moonMesh,
    cloudLayer,
    crewAccessArm,
    rocketFull,
    coreGroup,
    srbLeft,
    srbRight,
    srbLeftBsm,
    srbRightBsm,
    upperGroup,
    icpsFlame,
    machCone,
    abortTower,
    lasFlame,
    flameGroup,
    trenchLight,
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

export function createOrbitalSatellite(tex: ProceduralTextureSet): OrbitalSatelliteHandles {
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
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.72, roughness: 0.26 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.82, roughness: 0.28 });
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
  const busBody = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 1.48, 8), foilMat);
  busGroup.add(busBody);

  const collarTop = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.14, 16), frameMat);
  collarTop.position.y = 0.76;
  const collarBot = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.14, 16), frameMat);
  collarBot.position.y = -0.76;
  busGroup.add(collarTop, collarBot);

  // Thermal Louver Radiator Plates (matching Landsat 9 / TDRS thermal control bus)
  [-0.72, 0.72].forEach((rz) => {
    const radiator = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.82, 0.08), frameMat);
    radiator.position.set(0, 0.02, rz);
    busGroup.add(radiator);
  });

  // Dual Optical Star Trackers + Sun Sensors
  [-0.44, 0.44].forEach((sx) => {
    const baffle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.36, 12), darkMetal);
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
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 8), darkMetal);
    pod.position.set(tx, -0.64, tz);
    busGroup.add(pod);
  });

  // Upper S-Band Helical / Omni Telemetry Mast
  const omniMast = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.055, 1.35, 10), frameMat);
  omniMast.position.set(-0.32, 1.48, -0.25);
  busGroup.add(omniMast);
  const helixCoil = new THREE.Mesh(
    new THREE.TorusGeometry(0.085, 0.018, 6, 18),
    meshGoldMat
  );
  helixCoil.position.set(-0.32, 2.08, -0.25);
  busGroup.add(helixCoil);

  // Lower HERMES Space-Weather Fluxgate Magnetometer Boom
  const hermesBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.048, 1.75, 8), frameMat);
  hermesBoom.position.set(0, -1.6, 0);
  busGroup.add(hermesBoom);
  const magSensor = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), frameMat);
  magSensor.position.set(0, -2.52, 0);
  busGroup.add(magSensor);

  const nasaPatch = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.42),
    new THREE.MeshBasicMaterial({ map: tex.nasaDecal, transparent: true })
  );
  nasaPatch.position.set(0, 0.05, 0.78);
  busGroup.add(nasaPatch);

  tagPart(busGroup, 'sat-bus');
  group.add(busGroup);

  // 2. Twin Articulated Unfolding Multi-Panel Photovoltaic Wings (Blueprint TDRS / Landsat 9 Truss Spine)
  const createWing = (dir: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(dir * 0.78, 0.08, 0);
    const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.26), frameMat);
    yoke.position.set(dir * 0.21, 0, 0);
    pivot.add(yoke);
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.6, 8), frameMat);
    spine.rotation.z = Math.PI / 2;
    spine.position.set(dir * 2.05, -0.04, 0);
    pivot.add(spine);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.05, 0.96), solarMat);
    inner.position.set(dir * 1.24, 0, 0);
    pivot.add(inner);
    const outer = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.05, 0.96), solarMat);
    outer.position.set(dir * 2.98, 0, 0);
    pivot.add(outer);
    tagPart(pivot, 'sat-solar');
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
      frameMat
    );
    arm.add(boom);

    const reflector = new THREE.Group();
    reflector.position.set(side * 0.68, 0.54, 0.42);
    reflector.rotation.set(0.32, side * -0.25, 0);

    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(0.84, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.4),
      meshGoldMat
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
        frameMat
      );
      reflector.add(rib);
    }

    const subFeed = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 8), darkMetal);
    subFeed.rotation.x = Math.PI / 2;
    subFeed.position.set(0, 0, 0.36);
    reflector.add(subFeed);

    arm.add(reflector);
    tagPart(arm, 'sat-dish');
    return arm;
  };
  const umbrellaLeft = buildUmbrellaDish(-1);
  const umbrellaRight = buildUmbrellaDish(1);
  group.add(umbrellaLeft, umbrellaRight);

  // 4. Central Gimbaled Ka-Band & Optical Laser Dish + Link Beam
  const dishPivot = new THREE.Group();
  dishPivot.position.set(0, 0.96, 0.14);
  const dishBowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.42),
    frameMat
  );
  dishBowl.rotation.x = Math.PI * 0.72;
  dishPivot.add(dishBowl);

  const feedHorn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.58, 8), darkMetal);
  feedHorn.position.set(0, 0.24, 0.32);
  feedHorn.rotation.x = Math.PI * 0.28;
  dishPivot.add(feedHorn);

  const linkBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.42, 18, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.44, side: THREE.DoubleSide })
  );
  linkBeam.rotation.x = Math.PI * 0.45;
  linkBeam.position.set(0, 0.4, 9.2);
  linkBeam.visible = false;
  dishPivot.add(linkBeam);

  tagPart(dishPivot, 'sat-dish');
  group.add(dishPivot);

  const beaconMesh = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.08, 10, 36),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.65 })
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
  shipGroup: THREE.Group;
  shipFlame: THREE.Mesh;
  shipShieldShell: THREE.Mesh;
  shipWingsGroup: THREE.Group;
  earthClouds: THREE.Mesh;
  sunCorona: THREE.Mesh;
  asteroidBelt: THREE.InstancedMesh;
  stormRing: THREE.Mesh;
  satellite: OrbitalSatelliteHandles;
  gatewayGroup: THREE.Group;
  planets: Record<SpaceTargetId, THREE.Mesh>;
  targetBeacon: THREE.Mesh;
  courseLine: THREE.Line;
}

export function createSolarSystemScene(tex: ProceduralTextureSet): SolarSystemHandles {
  const group = new THREE.Group();
  group.visible = false;

  // Sun at (-48, 0, -36) with Textured Granulation Plasma + Volumetric Dual Corona
  const sunPos = new THREE.Vector3(-48, 0, -36);
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(11.4, 36, 28),
    new THREE.MeshBasicMaterial({ map: tex.sunAlbedo, color: 0xffffff })
  );
  sun.position.copy(sunPos);
  group.add(sun);

  const sunCorona = new THREE.Mesh(
    new THREE.SphereGeometry(13.6, 28, 24),
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.24, depthWrite: false })
  );
  sunCorona.position.copy(sunPos);
  group.add(sunCorona);

  const sunOuterGlow = new THREE.Mesh(
    new THREE.SphereGeometry(16.2, 24, 20),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.1, depthWrite: false })
  );
  sunOuterGlow.position.copy(sunPos);
  group.add(sunOuterGlow);

  const sunLight = new THREE.PointLight(0xfde68a, 4.2, 240);
  sunLight.position.copy(sunPos);
  group.add(sunLight);

  // Solar Radiation Storm Ring
  const stormRing = new THREE.Mesh(
    new THREE.RingGeometry(31, 33.2, 72),
    new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
    })
  );
  stormRing.rotation.x = -Math.PI / 2;
  stormRing.position.set(sunPos.x, -0.5, sunPos.z);
  group.add(stormRing);

  // Precision Ecliptic Navigation Grid
  const grid = new THREE.GridHelper(220, 26, 0x06b6d4, 0x162238);
  grid.position.y = -4.2;
  group.add(grid);

  // Earth Departure World (-22, -2, 26) with Continents + Rotating Cloud Sphere + Atmospheric Rayleigh Halo
  const earthGroup = new THREE.Group();
  earthGroup.position.set(-22, -2, 26);
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(4.6, 32, 26),
    new THREE.MeshStandardMaterial({ map: tex.earthAlbedo, color: 0xffffff, roughness: 0.48, metalness: 0.08 })
  );
  earthGroup.add(earth);
  const earthClouds = new THREE.Mesh(
    new THREE.SphereGeometry(4.74, 30, 24),
    new THREE.MeshStandardMaterial({
      map: tex.earthClouds,
      transparent: true,
      opacity: 0.72,
      roughness: 0.85,
      depthWrite: false,
    })
  );
  earthGroup.add(earthClouds);
  const earthAtmo = new THREE.Mesh(
    new THREE.SphereGeometry(5.05, 28, 22),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      depthWrite: false,
    })
  );
  earthGroup.add(earthAtmo);
  group.add(earthGroup);

  // Targets: HERMES Relay Orbit, Moon, Gateway NRHO, Mars
  const planets = {} as Record<SpaceTargetId, THREE.Mesh>;
  (Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).forEach((id) => {
    const spec = SOLAR_TARGETS[id];
    const mat =
      id === 'moon'
        ? new THREE.MeshStandardMaterial({
            map: tex.moonSphereAlbedo,
            bumpMap: tex.moonBump,
            bumpScale: 0.14,
            color: 0xffffff,
            roughness: 0.84,
            metalness: 0.05,
          })
        : id === 'mars'
          ? new THREE.MeshStandardMaterial({
              map: tex.marsSphereAlbedo,
              bumpMap: tex.marsBump,
              bumpScale: 0.14,
              color: 0xffffff,
              roughness: 0.78,
              metalness: 0.06,
            })
          : new THREE.MeshStandardMaterial({
              color: spec.color,
              emissive: spec.color,
              emissiveIntensity: 0.3,
              roughness: 0.35,
              metalness: 0.65,
              wireframe: id === 'relay-orbit',
            });
    const geom =
      id === 'relay-orbit'
        ? new THREE.SphereGeometry(1.1, 16, 12)
        : new THREE.SphereGeometry(spec.radius, 36, 28);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(spec.x, 0, spec.z);
    if (id === 'gateway') mesh.visible = false;
    group.add(mesh);
    planets[id] = mesh;

    // Dusty salmon CO2 atmosphere rim around Mars Sphere
    if (id === 'mars') {
      const marsAtmo = new THREE.Mesh(
        new THREE.SphereGeometry(spec.radius * 1.09, 28, 22),
        new THREE.MeshBasicMaterial({
          color: 0xfb923c,
          transparent: true,
          opacity: 0.18,
          side: THREE.BackSide,
          depthWrite: false,
        })
      );
      marsAtmo.position.copy(mesh.position);
      group.add(marsAtmo);
    }

    const orbitDist = Math.hypot(spec.x - sunPos.x, spec.z - sunPos.z);
    const orbit = new THREE.Mesh(
      new THREE.RingGeometry(orbitDist - 0.15, orbitDist + 0.15, 96),
      new THREE.MeshBasicMaterial({
        color: id === 'mars' ? 0xf97316 : 0x22d3ee,
        transparent: true,
        opacity: 0.2,
        side: THREE.DoubleSide,
      })
    );
    orbit.rotation.x = -Math.PI / 2;
    orbit.position.set(sunPos.x, -4.0, sunPos.z);
    group.add(orbit);
  });

  // Main Asteroid Belt Ring (150 instanced rocky asteroids slowly orbiting deep space)
  const beltCount = 150;
  const asteroidBelt = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.45, 0),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.88, metalness: 0.12 }),
    beltCount
  );
  asteroidBelt.position.copy(sunPos);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < beltCount; i++) {
    const angle = (i / beltCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
    const rad = 52 + Math.random() * 14;
    dummy.position.set(
      Math.cos(angle) * rad,
      (Math.random() - 0.5) * 3.5,
      Math.sin(angle) * rad
    );
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.set(0.6 + Math.random() * 1.1, 0.45 + Math.random() * 0.7, 0.6 + Math.random() * 1.0);
    dummy.updateMatrix();
    asteroidBelt.setMatrixAt(i, dummy.matrix);
  }
  asteroidBelt.instanceMatrix.needsUpdate = true;
  asteroidBelt.computeBoundingSphere();
  group.add(asteroidBelt);

  // Lunar Gateway NRHO Multi-Module Station at gateway target coordinates
  const gwSpec = SOLAR_TARGETS.gateway;
  const gatewayGroup = new THREE.Group();
  gatewayGroup.position.set(gwSpec.x, 0, gwSpec.z);
  const gwHull = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.3 });
  const gwGold = new THREE.MeshStandardMaterial({ map: tex.foilAlbedo, color: 0xffffff, metalness: 0.82, roughness: 0.26 });
  const ppe = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.72, 2.2, 12), gwGold);
  ppe.rotation.z = Math.PI / 2;
  const halo = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 2.6, 12), gwHull);
  halo.rotation.z = Math.PI / 2;
  halo.position.x = 2.4;
  const gwSolarL = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 4.6, 0.08),
    new THREE.MeshStandardMaterial({ map: tex.solarPanel, color: 0xffffff, metalness: 0.5, roughness: 0.2 })
  );
  gwSolarL.position.set(-0.2, 0, 0);
  gatewayGroup.add(ppe, halo, gwSolarL);
  group.add(gatewayGroup);

  // Modular Orbital Satellite deployed in HERMES Relay Orbit
  const satellite = createOrbitalSatellite(tex);
  satellite.group.position.set(SOLAR_TARGETS['relay-orbit'].x, 0, SOLAR_TARGETS['relay-orbit'].z);
  group.add(satellite.group);

  // Target Selection Beacon Ring
  const targetBeacon = new THREE.Mesh(
    new THREE.TorusGeometry(4.8, 0.2, 10, 36),
    new THREE.MeshBasicMaterial({ color: 0x34d399 })
  );
  targetBeacon.rotation.x = Math.PI / 2;
  group.add(targetBeacon);

  // 3D Orion / European Service Module Spacecraft
  const shipGroup = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.72, 2.1, 18),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.65, roughness: 0.25 })
  );
  hull.rotation.x = Math.PI / 2;
  shipGroup.add(hull);

  const esmBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.74, 0.74, 0.55, 16),
    new THREE.MeshStandardMaterial({ map: tex.foilAlbedo, color: 0xffffff, metalness: 0.85, roughness: 0.24 })
  );
  esmBand.rotation.x = Math.PI / 2;
  esmBand.position.z = -0.65;
  shipGroup.add(esmBand);

  const aj10Bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.42, 0.58, 16, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide })
  );
  aj10Bell.rotation.x = Math.PI / 2;
  aj10Bell.position.z = -1.32;
  shipGroup.add(aj10Bell);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.56, 1.15, 18),
    new THREE.MeshStandardMaterial({ map: tex.orionTile, color: 0xffffff, metalness: 0.4, roughness: 0.32 })
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.62;
  shipGroup.add(nose);

  const shipWingsGroup = new THREE.Group();
  const wingMat = new THREE.MeshStandardMaterial({ map: tex.solarPanel, color: 0xffffff, metalness: 0.45, roughness: 0.2 });
  [-1, 1].forEach((side) => {
    const wTop = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.05, 0.7), wingMat);
    wTop.position.set(side * 1.58, 0.24, -0.35);
    wTop.rotation.z = side * 0.22;
    shipWingsGroup.add(wTop);

    const wBot = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.05, 0.7), wingMat);
    wBot.position.set(side * 1.58, -0.24, -0.35);
    wBot.rotation.z = -side * 0.22;
    shipWingsGroup.add(wBot);
  });
  shipGroup.add(shipWingsGroup);

  const shipFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 2.5, 12),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 })
  );
  shipFlame.rotation.x = -Math.PI / 2;
  shipFlame.position.z = -2.35;
  shipFlame.visible = false;
  shipGroup.add(shipFlame);

  const shipShieldShell = new THREE.Mesh(
    new THREE.SphereGeometry(2.35, 18, 16),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.22, wireframe: true })
  );
  shipShieldShell.visible = false;
  shipGroup.add(shipShieldShell);

  group.add(shipGroup);

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const courseLine = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.65 })
  );
  group.add(courseLine);

  return {
    group,
    shipGroup,
    shipFlame,
    shipShieldShell,
    shipWingsGroup,
    earthClouds,
    sunCorona,
    asteroidBelt,
    stormRing,
    satellite,
    gatewayGroup,
    planets,
    targetBeacon,
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
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9, depthWrite: false })
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
    })
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
    debrisCount
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

