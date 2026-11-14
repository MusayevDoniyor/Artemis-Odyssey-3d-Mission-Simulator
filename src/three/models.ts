import * as THREE from 'three';
import { INITIAL_OBJECTIVES, LANDING_ZONES, SOLAR_TARGETS } from '../game/constants';
import { getLunarTerrainHeight } from '../game/physics';
import type { RoverCollider, SpaceTargetId } from '../game/types';
import type { ProceduralTextureSet } from './textures';

export function tagPart(obj: THREE.Object3D, partId: string) {
  obj.traverse((child) => {
    child.userData.partId = partId;
  });
}

export interface LunarEnvironmentHandles {
  group: THREE.Group;
  colliders: RoverCollider[];
  earthGlobe: THREE.Mesh;
  earthClouds: THREE.Mesh;
  padLight: THREE.PointLight;
  objectiveMeshes: Array<{
    id: string;
    group: THREE.Group;
    crystal: THREE.Mesh;
    beam: THREE.Mesh;
  }>;
  landingZoneMeshes: Array<{
    id: number;
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
  const colliders: RoverCollider[] = [];

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

  // 2. Displaced Lunar South Pole Terrain
  const terrainGeo = new THREE.PlaneGeometry(460, 460, 140, 140);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  const colors: number[] = [];
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);
    const y = getLunarTerrainHeight(x, z);
    posAttr.setY(i, y);
    const shade = 0.62 + Math.min(0.24, Math.max(-0.18, y * 0.03));
    colors.push(shade, shade + 0.01, shade + 0.03);
  }
  terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const terrain = new THREE.Mesh(
    terrainGeo,
    new THREE.MeshStandardMaterial({
      map: tex.moonAlbedo,
      bumpMap: tex.moonBump,
      bumpScale: 0.35,
      vertexColors: true,
      roughness: 0.94,
      metalness: 0.05,
    })
  );
  terrain.receiveShadow = true;
  group.add(terrain);

  // 3. Artemis Sintered Hexagonal Landing Pad
  const padGroup = new THREE.Group();
  const padBase = new THREE.Mesh(
    new THREE.CylinderGeometry(8.8, 9.6, 0.36, 6),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.55, roughness: 0.42 })
  );
  padBase.position.y = 0.18;
  padBase.receiveShadow = true;
  padGroup.add(padBase);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const padRing = new THREE.Mesh(new THREE.RingGeometry(5.6, 6.1, 32), ringMat);
  padRing.rotation.x = -Math.PI / 2;
  padRing.position.y = 0.39;
  padGroup.add(padRing);

  const padInner = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.55, 24),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })
  );
  padInner.rotation.x = -Math.PI / 2;
  padInner.position.y = 0.41;
  padGroup.add(padInner);

  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.3 })
    );
    bollard.position.set(Math.cos(a) * 8.3, 0.42, Math.sin(a) * 8.3);
    padGroup.add(bollard);

    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    lamp.position.set(Math.cos(a) * 8.3, 0.82, Math.sin(a) * 8.3);
    padGroup.add(lamp);
  }
  const padLight = new THREE.PointLight(0x38bdf8, 2.2, 36);
  padLight.position.set(0, 2.8, 0);
  padGroup.add(padLight);
  group.add(padGroup);

  // 4. Artemis Base Camp Outpost (-15, 0, -13)
  const habGroup = new THREE.Group();
  habGroup.position.set(-15, 0, -13);

  const habCore = new THREE.Group();
  const habBase = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.9, 1.3, 24),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, metalness: 0.15 })
  );
  habBase.position.y = 0.65;
  habBase.castShadow = true;
  habCore.add(habBase);

  const habDome = new THREE.Mesh(
    new THREE.SphereGeometry(5.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.62,
      metalness: 0.25,
      roughness: 0.15,
      emissive: 0x0284c7,
      emissiveIntensity: 0.3,
    })
  );
  habDome.position.y = 1.25;
  habCore.add(habDome);

  const airlock = new THREE.Mesh(
    new THREE.CylinderGeometry(1.3, 1.3, 4.8, 16),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.55, roughness: 0.35 })
  );
  airlock.rotation.z = Math.PI / 2;
  airlock.position.set(5.6, 1.35, 1.2);
  airlock.castShadow = true;
  habCore.add(airlock);
  tagPart(habCore, 'base-habitat');
  habGroup.add(habCore);

  const solarGroup = new THREE.Group();
  for (let s = 0; s < 2; s++) {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 4.6, 10),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.25 })
    );
    mast.position.set(-7.2, 2.3, -2.2 + s * 3.4);
    solarGroup.add(mast);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 3.8, 2.1),
      new THREE.MeshStandardMaterial({ map: tex.solarPanel, color: 0xffffff, metalness: 0.5, roughness: 0.2 })
    );
    panel.position.set(-7.2, 3.6, -2.2 + s * 3.4);
    panel.rotation.z = 0.22;
    panel.castShadow = true;
    solarGroup.add(panel);
  }
  tagPart(solarGroup, 'base-power');
  habGroup.add(solarGroup);

  const commsGroup = new THREE.Group();
  const dishPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 4.8, 10),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.75, roughness: 0.3 })
  );
  dishPole.position.set(-4.2, 3.4, -4.8);
  commsGroup.add(dishPole);

  const dishBowl = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.2, side: THREE.DoubleSide })
  );
  dishBowl.position.set(-4.2, 5.7, -4.8);
  dishBowl.rotation.x = Math.PI * 0.68;
  commsGroup.add(dishBowl);
  tagPart(commsGroup, 'base-comms');
  habGroup.add(commsGroup);

  group.add(habGroup);
  colliders.push({ x: -15, z: -13, r: 7.0, type: 'habitat', label: 'Artemis Habitat Dome' });
  colliders.push({ x: -9.8, z: -11.8, r: 2.1, type: 'habitat', label: 'Habitat Airlock' });

  // 5. Instanced Lunar Boulders (> 20 instances) with Solid Colliders
  const boulderSpecs: Array<{ x: number; y: number; z: number; s: number; rot: number }> = [];
  for (let i = 0; i < 64; i++) {
    const angle = i * 2.39996;
    const dist = 18.5 + i * 1.75;
    const rx = Math.cos(angle) * dist;
    const rz = Math.sin(angle) * dist;
    const nearObj = INITIAL_OBJECTIVES.some((o) => Math.hypot(rx - o.x, rz - o.z) < 6.5);
    const nearPad = LANDING_ZONES.some((lz) => Math.hypot(rx - lz.x, rz - lz.z) < lz.radius + 3.5);
    const nearHab = Math.hypot(rx + 15, rz + 13) < 11;
    if (nearObj || nearPad || nearHab) continue;

    const ry = getLunarTerrainHeight(rx, rz);
    const s = 0.48 + (i % 6) * 0.22;
    boulderSpecs.push({ x: rx, y: ry, z: rz, s, rot: i * 0.7 });
    colliders.push({ x: rx, z: rz, r: s * 1.05, type: 'rock', label: 'Lunar Boulder' });
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
  boulderSpecs.forEach((b, idx) => {
    dummy.position.set(b.x, b.y + b.s * 0.28, b.z);
    dummy.rotation.set(b.rot, b.rot * 1.3, 0);
    dummy.scale.set(b.s * 1.2, b.s * 0.75, b.s * 1.05);
    dummy.updateMatrix();
    boulderInstanced.setMatrixAt(idx, dummy.matrix);
    const tone = 0.78 + (idx % 5) * 0.06;
    tint.setRGB(tone, tone, tone + 0.03);
    boulderInstanced.setColorAt(idx, tint);
  });
  boulderInstanced.instanceMatrix.needsUpdate = true;
  if (boulderInstanced.instanceColor) boulderInstanced.instanceColor.needsUpdate = true;
  boulderInstanced.computeBoundingSphere();
  group.add(boulderInstanced);

  // 6. Science Stations at Objective Coordinates
  const objectiveMeshes: LunarEnvironmentHandles['objectiveMeshes'] = [];
  INITIAL_OBJECTIVES.forEach((obj) => {
    const g = new THREE.Group();
    const ty = getLunarTerrainHeight(obj.x, obj.z);
    g.position.set(obj.x, ty, obj.z);
    colliders.push({ x: obj.x, z: obj.z, r: 1.5, type: 'station', label: obj.siteName });

    if (obj.id === 'ice-sample') {
      for (let k = 0; k < 5; k++) {
        const shard = new THREE.Mesh(
          new THREE.ConeGeometry(0.45, 1.5, 6),
          new THREE.MeshStandardMaterial({
            color: 0x7dd3fc,
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
    } else if (obj.id === 'solar-deploy') {
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
    } else {
      for (let b = 0; b < 3; b++) {
        const mono = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.95, 0),
          new THREE.MeshStandardMaterial({ color: 0x86efac, roughness: 0.75, metalness: 0.15 })
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
    objectiveMeshes.push({ id: obj.id, group: g, crystal, beam });
  });

  // 7. Three Landing Zones
  const landingZoneMeshes: LunarEnvironmentHandles['landingZoneMeshes'] = [];
  LANDING_ZONES.forEach((lz) => {
    const zg = new THREE.Group();
    const zy = getLunarTerrainHeight(lz.x, lz.z);
    zg.position.set(lz.x, zy + 0.25, lz.z);

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
    landingZoneMeshes.push({ id: lz.id, group: zg, ring, cyl });
  });

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

  return {
    group,
    colliders,
    earthGlobe,
    earthClouds,
    padLight,
    objectiveMeshes,
    landingZoneMeshes,
    approachGates,
    trajectoryArc,
  };
}

export interface LunarLanderHandles {
  group: THREE.Group;
  nozzleGroup: THREE.Group;
  flameMesh: THREE.Mesh;
  engineLight: THREE.PointLight;
  rcsLeft: THREE.Mesh;
  rcsRight: THREE.Mesh;
  legsGroup: THREE.Group;
}

export function createLunarLander(tex: ProceduralTextureSet): LunarLanderHandles {
  const group = new THREE.Group();
  const descentStage = new THREE.Group();
  const ascentStage = new THREE.Group();

  const descentHull = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.35, 1.55, 8),
    new THREE.MeshStandardMaterial({
      map: tex.foilAlbedo,
      bumpMap: tex.foilBump,
      bumpScale: 0.08,
      color: 0xffffff,
      metalness: 0.82,
      roughness: 0.25,
    })
  );
  descentHull.position.y = 1.65;
  descentHull.castShadow = true;
  descentStage.add(descentHull);

  const tankMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.75, roughness: 0.25 });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const tank = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 14), tankMat);
    tank.position.set(Math.cos(a) * 1.95, 1.65, Math.sin(a) * 1.95);
    descentStage.add(tank);
  }

  const legsGroup = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.07, 2.5, 10),
      new THREE.MeshStandardMaterial({ map: tex.foilAlbedo, color: 0xffffff, metalness: 0.78, roughness: 0.3 })
    );
    leg.position.set(Math.cos(a) * 2.5, 1.3, Math.sin(a) * 2.5);
    leg.rotation.z = -Math.cos(a) * 0.42;
    leg.rotation.x = Math.sin(a) * 0.42;
    legsGroup.add(leg);

    const footpad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.62, 0.14, 16),
      new THREE.MeshStandardMaterial({ map: tex.foilAlbedo, color: 0xffffff, metalness: 0.82, roughness: 0.28 })
    );
    footpad.position.set(Math.cos(a) * 3.05, 0.07, Math.sin(a) * 3.05);
    legsGroup.add(footpad);

    if (i !== 0) {
      const probe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.015, 1.15, 6),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.9, roughness: 0.15 })
      );
      probe.position.set(Math.cos(a) * 3.05, -0.52, Math.sin(a) * 3.05);
      legsGroup.add(probe);
    }
  }
  descentStage.add(legsGroup);

  const nozzleGroup = new THREE.Group();
  nozzleGroup.position.y = 0.72;
  const bell = new THREE.Mesh(
    new THREE.ConeGeometry(0.92, 1.25, 20, 1, true),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2, side: THREE.DoubleSide })
  );
  nozzleGroup.add(bell);

  const flameGeo = new THREE.ConeGeometry(0.88, 4.8, 16);
  flameGeo.rotateX(Math.PI);
  flameGeo.translate(0, -2.4, 0);
  const flameMesh = new THREE.Mesh(
    flameGeo,
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.85 })
  );
  flameMesh.position.y = -0.5;
  flameMesh.visible = false;
  nozzleGroup.add(flameMesh);

  const innerFlameGeo = new THREE.ConeGeometry(0.42, 2.8, 12);
  innerFlameGeo.rotateX(Math.PI);
  innerFlameGeo.translate(0, -1.4, 0);
  flameMesh.add(new THREE.Mesh(innerFlameGeo, new THREE.MeshBasicMaterial({ color: 0xe0f2fe })));

  descentStage.add(nozzleGroup);
  const engineLight = new THREE.PointLight(0xf97316, 0, 28);
  engineLight.position.set(0, -0.5, 0);
  descentStage.add(engineLight);
  tagPart(descentStage, 'lm-descent');

  // Ascent Cabin
  const cabin = new THREE.Mesh(
    new THREE.CylinderGeometry(1.48, 1.88, 1.65, 8),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.58, roughness: 0.35 })
  );
  cabin.position.y = 3.18;
  cabin.castShadow = true;
  ascentStage.add(cabin);

  const hatch = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.05, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.45 })
  );
  hatch.position.set(0, 2.98, 1.45);
  ascentStage.add(hatch);

  const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const winL = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.44), winMat);
  winL.position.set(-0.54, 3.38, 1.56);
  winL.rotation.x = -0.18;
  ascentStage.add(winL);
  const winR = winL.clone();
  winR.position.x = 0.54;
  ascentStage.add(winR);

  const dishMast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.7, roughness: 0.25 })
  );
  dishMast.position.set(0.9, 4.3, 0.35);
  ascentStage.add(dishMast);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.44),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, metalness: 0.85, roughness: 0.2, side: THREE.DoubleSide })
  );
  dish.position.set(0.9, 4.75, 0.35);
  dish.rotation.x = Math.PI * 0.7;
  ascentStage.add(dish);
  tagPart(ascentStage, 'lm-ascent');

  const rcsGroup = new THREE.Group();
  const rcsGeo = new THREE.ConeGeometry(0.24, 1.2, 8);
  const rcsMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.85 });
  const rcsLeft = new THREE.Mesh(rcsGeo, rcsMat);
  rcsLeft.position.set(-2.3, 3.25, 0);
  rcsLeft.rotation.z = -Math.PI / 2;
  rcsLeft.visible = false;
  rcsGroup.add(rcsLeft);

  const rcsRight = new THREE.Mesh(rcsGeo, rcsMat);
  rcsRight.position.set(2.3, 3.25, 0);
  rcsRight.rotation.z = Math.PI / 2;
  rcsRight.visible = false;
  rcsGroup.add(rcsRight);
  tagPart(rcsGroup, 'lm-rcs');
  tagPart(nozzleGroup, 'lm-rcs');

  group.add(descentStage, ascentStage, rcsGroup);
  return { group, nozzleGroup, flameMesh, engineLight, rcsLeft, rcsRight, legsGroup };
}

export interface ViperRoverHandles {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  wheelModules: Array<{
    pivot: THREE.Group;
    spin: THREE.Group;
    arm: THREE.Mesh;
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
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();

  const chassisMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.35, roughness: 0.55 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.78, roughness: 0.25 });
  const foilMat = new THREE.MeshStandardMaterial({
    map: tex.foilAlbedo,
    color: 0xffffff,
    metalness: 0.78,
    roughness: 0.28,
  });

  // Cleanly proportioned 1.6m wide x 2.3m long chassis (NO root non-uniform scale distortion!)
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.65, 2.2), chassisMat);
  chassis.position.y = 0.85;
  chassis.castShadow = true;
  bodyGroup.add(chassis);

  const warmBox = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.42, 1.72), foilMat);
  warmBox.position.set(0, 1.24, -0.08);
  warmBox.castShadow = true;
  bodyGroup.add(warmBox);
  tagPart(bodyGroup, 'rover-mobility');

  // 3-Sided Solar Panels
  const solarGroup = new THREE.Group();
  const panelMat = new THREE.MeshStandardMaterial({
    map: tex.solarPanel,
    color: 0xffffff,
    metalness: 0.45,
    roughness: 0.22,
  });
  const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.64, 1.95), panelMat);
  panelL.position.set(-0.71, 0.88, 0);
  solarGroup.add(panelL);
  const panelR = panelL.clone();
  panelR.position.x = 0.71;
  solarGroup.add(panelR);
  const panelAft = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.64, 0.06), panelMat);
  panelAft.position.set(0, 0.88, -1.14);
  solarGroup.add(panelAft);
  tagPart(solarGroup, 'rover-power');
  bodyGroup.add(solarGroup);

  // Camera Mast + Spotlight + High-Gain Dish
  const commsGroup = new THREE.Group();
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 1.45, 10), frameMat);
  mast.position.set(0, 1.85, 0.62);
  commsGroup.add(mast);

  const camHead = new THREE.Group();
  camHead.position.set(0, 2.55, 0.62);
  camHead.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.28, 0.36),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 })
    )
  );
  const lensGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.1, 12);
  lensGeo.rotateX(Math.PI / 2);
  const lensMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const lensL = new THREE.Mesh(lensGeo, lensMat);
  lensL.position.set(-0.16, 0, 0.2);
  camHead.add(lensL);
  const lensR = lensL.clone();
  lensR.position.x = 0.16;
  camHead.add(lensR);
  commsGroup.add(camHead);

  const headlight = new THREE.SpotLight(0xe0f2fe, 2.0, 38, Math.PI / 4, 0.45, 1);
  headlight.position.set(0, 2.45, 0.85);
  headlight.target.position.set(0, 0, 12);
  commsGroup.add(headlight);
  commsGroup.add(headlight.target);

  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.24, 16),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.65, roughness: 0.3 })
  );
  dish.position.set(0, 1.56, -0.82);
  dish.rotation.x = -0.5;
  commsGroup.add(dish);
  tagPart(commsGroup, 'rover-comms');
  bodyGroup.add(commsGroup);

  // TRIDENT Rotary-Percussive Ice Drill Arm
  const drillArm = new THREE.Group();
  drillArm.position.set(0, 0.82, 0.98);
  const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.72, 10), frameMat);
  seg.rotation.x = Math.PI / 2;
  seg.position.set(0, 0.06, 0.34);
  drillArm.add(seg);
  const housing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.09, 0.68, 12),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.75, roughness: 0.25 })
  );
  housing.position.set(0, -0.3, 0.7);
  drillArm.add(housing);
  const drillBit = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 10), foilMat);
  drillBit.position.set(0, -0.82, 0.7);
  drillArm.add(drillBit);
  tagPart(drillArm, 'rover-science');
  bodyGroup.add(drillArm);

  group.add(bodyGroup);

  // 4 Articulated Rocker-Bogie Wheel-Legs (FL, FR, RL, RR)
  const wheelModules: ViperRoverHandles['wheelModules'] = [];
  const corners: Array<[number, number]> = [
    [-0.88, 0.92],
    [0.88, 0.92],
    [-0.88, -0.92],
    [0.88, -0.92],
  ];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.88, metalness: 0.2 });
  const grouserMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75, metalness: 0.45 });

  corners.forEach(([wx, wz]) => {
    const side = Math.sign(wx);
    const forward = Math.sign(wz);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.75), frameMat);
    arm.position.set(side * 0.68, 0.56, forward * 0.62);
    arm.castShadow = true;
    tagPart(arm, 'rover-mobility');
    group.add(arm);

    const pivot = new THREE.Group();
    pivot.position.set(wx, 0.34, wz);

    const spin = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.24, 24), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    spin.add(tire);

    for (let t = 0; t < 10; t++) {
      const a = (t / 10) * Math.PI * 2;
      const grouser = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.06), grouserMat);
      grouser.position.set(0, Math.cos(a) * 0.28, Math.sin(a) * 0.28);
      grouser.rotation.x = a;
      spin.add(grouser);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 12), foilMat);
    hub.rotation.z = Math.PI / 2;
    spin.add(hub);

    pivot.add(spin);
    tagPart(pivot, 'rover-mobility');
    group.add(pivot);

    wheelModules.push({ pivot, spin, arm, side, forward, baseY: 0.34 });
  });

  return { group, bodyGroup, wheelModules, drillArm, drillBit, dish, camHead, headlight };
}

export interface LaunchComplexHandles {
  group: THREE.Group;
  groundGroup: THREE.Group;
  earthLimb: THREE.Group;
  moonMesh: THREE.Mesh;
  rocketFull: THREE.Group;
  coreGroup: THREE.Group;
  srbLeft: THREE.Group;
  srbRight: THREE.Group;
  upperGroup: THREE.Group;
  abortTower: THREE.Group;
  flameGroup: THREE.Group;
  trenchLight: THREE.PointLight;
}

export function createLaunchComplexAndSLS(tex: ProceduralTextureSet): LaunchComplexHandles {
  const group = new THREE.Group();
  group.visible = false;

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(680, 32, 20),
    new THREE.MeshBasicMaterial({ map: tex.duskSky, side: THREE.BackSide, fog: false })
  );
  group.add(skyDome);

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(7.0, 28, 28),
    new THREE.MeshStandardMaterial({ map: tex.moonAlbedo, color: 0xffffff, roughness: 0.9, metalness: 0.05 })
  );
  moonMesh.position.set(26, 26, -34);
  group.add(moonMesh);

  // Pad 39B Ground Complex
  const groundGroup = new THREE.Group();
  const plain = new THREE.Mesh(
    new THREE.PlaneGeometry(680, 680),
    new THREE.MeshStandardMaterial({ map: tex.kscGround, color: 0xffffff, roughness: 0.95, metalness: 0 })
  );
  plain.rotation.x = -Math.PI / 2;
  plain.position.y = -0.4;
  plain.receiveShadow = true;
  groundGroup.add(plain);

  const padDeck = new THREE.Mesh(
    new THREE.CylinderGeometry(17, 19, 0.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.85, metalness: 0.1 })
  );
  padDeck.position.y = 0.4;
  padDeck.receiveShadow = true;
  groundGroup.add(padDeck);

  const mlp = new THREE.Mesh(
    new THREE.BoxGeometry(12.5, 2.2, 12.5),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.35 })
  );
  mlp.position.y = 1.5;
  groundGroup.add(mlp);

  // Launch Umbilical Tower
  const tower = new THREE.Group();
  tower.position.set(-8.0, 0, 0);
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.28 });
  [
    [-1.4, -1.4],
    [1.4, -1.4],
    [-1.4, 1.4],
    [1.4, 1.4],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 36, 10), steelMat);
    col.position.set(cx, 18, cz);
    tower.add(col);
  });
  [7, 14, 21, 28, 34].forEach((py) => {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.3, 3.4), steelMat);
    deck.position.y = py;
    tower.add(deck);
  });
  const crewArm = new THREE.Mesh(
    new THREE.BoxGeometry(5.2, 0.75, 1.0),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.55, roughness: 0.3 })
  );
  crewArm.position.set(3.2, 21.5, 0);
  tower.add(crewArm);
  groundGroup.add(tower);

  const trenchLight = new THREE.PointLight(0xf97316, 0, 42);
  trenchLight.position.set(0, 1.0, 0);
  groundGroup.add(trenchLight);
  group.add(groundGroup);

  // Curved Earth Horizon for > 24 km
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

  // SLS Block 1 Stack
  const rocketFull = new THREE.Group();
  const coreGroup = new THREE.Group();
  const coreStage = new THREE.Mesh(
    new THREE.CylinderGeometry(1.06, 1.06, 15.8, 32),
    new THREE.MeshStandardMaterial({ map: tex.slsCore, color: 0xffffff, roughness: 0.55, metalness: 0.18 })
  );
  coreStage.position.y = 8.9;
  coreStage.castShadow = true;
  coreGroup.add(coreStage);

  const rs25Positions: Array<[number, number, number]> = [
    [-0.44, 0.9, -0.44],
    [0.44, 0.9, -0.44],
    [-0.44, 0.9, 0.44],
    [0.44, 0.9, 0.44],
  ];
  const bellMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    metalness: 0.92,
    roughness: 0.18,
    side: THREE.DoubleSide,
  });
  rs25Positions.forEach(([px, py, pz]) => {
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 0.92, 20, 1, true), bellMat);
    bell.position.set(px, py - 0.3, pz);
    coreGroup.add(bell);
  });
  tagPart(coreGroup, 'sls-core');

  // Twin 5-Segment Solid Rocket Boosters
  const makeSrb = (xOffset: number) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 11.4, 24),
      new THREE.MeshStandardMaterial({ map: tex.slsSrb, color: 0xffffff, roughness: 0.35, metalness: 0.2 })
    );
    body.position.set(xOffset, 7.2, 0);
    g.add(body);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.46, 1.9, 24),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.15 })
    );
    cone.position.set(xOffset, 13.85, 0);
    g.add(cone);
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.62, 1.1, 20),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
    );
    skirt.position.set(xOffset, 1.1, 0);
    g.add(skirt);
    tagPart(g, 'sls-boosters');
    return g;
  };
  const srbLeft = makeSrb(-1.62);
  const srbRight = makeSrb(1.62);

  // Upper Stage (LVSA + ICPS + Orion + LAS)
  const upperGroup = new THREE.Group();
  const lvsa = new THREE.Mesh(
    new THREE.CylinderGeometry(0.66, 1.06, 2.2, 28),
    new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.48, metalness: 0.22 })
  );
  lvsa.position.y = 17.9;
  upperGroup.add(lvsa);

  const icps = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 2.1, 24),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32, metalness: 0.45 })
  );
  icps.position.y = 20.05;
  upperGroup.add(icps);

  const orion = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.64, 0.98, 28),
    new THREE.MeshStandardMaterial({ map: tex.orionTile, color: 0xffffff, roughness: 0.35, metalness: 0.3 })
  );
  orion.position.y = 21.85;
  upperGroup.add(orion);

  const abortTower = new THREE.Group();
  abortTower.position.y = 22.45;
  const lasBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.64, 1.4, 24),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
  );
  lasBody.position.y = 0.6;
  abortTower.add(lasBody);
  const lasTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.14, 1.2, 18),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 })
  );
  lasTip.position.y = 1.9;
  abortTower.add(lasTip);
  upperGroup.add(abortTower);
  tagPart(upperGroup, 'sls-upper');

  // Plume Group
  const flameGroup = new THREE.Group();
  rs25Positions.forEach(([px, , pz]) => {
    const p = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 1.9, 12),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 })
    );
    p.rotation.x = Math.PI;
    p.position.set(px, -0.2, pz);
    flameGroup.add(p);
  });
  [-1.62, 1.62].forEach((bx) => {
    const srbFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.68, 4.2, 14),
      new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.9 })
    );
    srbFlame.rotation.x = Math.PI;
    srbFlame.position.set(bx, -1.6, 0);
    flameGroup.add(srbFlame);
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
    rocketFull,
    coreGroup,
    srbLeft,
    srbRight,
    upperGroup,
    abortTower,
    flameGroup,
    trenchLight,
  };
}

export interface SolarSystemHandles {
  group: THREE.Group;
  shipGroup: THREE.Group;
  shipFlame: THREE.Mesh;
  shipShieldShell: THREE.Mesh;
  stormRing: THREE.Mesh;
  planets: Record<SpaceTargetId, THREE.Mesh>;
  targetBeacon: THREE.Mesh;
  courseLine: THREE.Line;
}

export function createSolarSystemScene(tex: ProceduralTextureSet): SolarSystemHandles {
  const group = new THREE.Group();
  group.visible = false;

  // Sun at (-48, 0, -36)
  const sunPos = new THREE.Vector3(-48, 0, -36);
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(11, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  );
  sun.position.copy(sunPos);
  group.add(sun);

  const sunCorona = new THREE.Mesh(
    new THREE.SphereGeometry(13.2, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.25 })
  );
  sunCorona.position.copy(sunPos);
  group.add(sunCorona);

  const sunLight = new THREE.PointLight(0xfde68a, 3.6, 220);
  sunLight.position.copy(sunPos);
  group.add(sunLight);

  // Solar Radiation Storm Ring
  const stormRing = new THREE.Mesh(
    new THREE.RingGeometry(31, 33, 64),
    new THREE.MeshBasicMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
  );
  stormRing.rotation.x = -Math.PI / 2;
  stormRing.position.set(sunPos.x, -0.5, sunPos.z);
  group.add(stormRing);

  // Ecliptic Grid
  const grid = new THREE.GridHelper(200, 24, 0x0ea5e9, 0x1e293b);
  grid.position.y = -3.8;
  group.add(grid);

  // Earth Home Base positioned behind starting departure trajectory (-22, -2, 26)
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(4.4, 28, 24),
    new THREE.MeshStandardMaterial({ map: tex.earthAlbedo, color: 0xffffff, roughness: 0.55, metalness: 0.1 })
  );
  earth.position.set(-22, -2, 26);
  group.add(earth);

  // Moon, Mars, Jupiter
  const planets = {} as Record<SpaceTargetId, THREE.Mesh>;
  (Object.keys(SOLAR_TARGETS) as SpaceTargetId[]).forEach((id) => {
    const spec = SOLAR_TARGETS[id];
    const mat =
      id === 'moon'
        ? new THREE.MeshStandardMaterial({ map: tex.moonAlbedo, color: 0xffffff, roughness: 0.85, metalness: 0.05 })
        : new THREE.MeshStandardMaterial({ color: spec.color, roughness: 0.65, metalness: 0.1 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(spec.radius, 28, 24), mat);
    mesh.position.set(spec.x, 0, spec.z);
    group.add(mesh);
    planets[id] = mesh;

    // Orbit ring around Earth/Sun for visual clarity
    const orbitDist = Math.hypot(spec.x - sunPos.x, spec.z - sunPos.z);
    const orbit = new THREE.Mesh(
      new THREE.RingGeometry(orbitDist - 0.16, orbitDist + 0.16, 96),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    orbit.rotation.x = -Math.PI / 2;
    orbit.position.set(sunPos.x, -3.6, sunPos.z);
    group.add(orbit);
  });

  // Target Selection Beacon Ring
  const targetBeacon = new THREE.Mesh(
    new THREE.TorusGeometry(4.8, 0.22, 10, 32),
    new THREE.MeshBasicMaterial({ color: 0x34d399 })
  );
  targetBeacon.rotation.x = Math.PI / 2;
  group.add(targetBeacon);

  // 3D Orion/ICPS Spacecraft
  const shipGroup = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.72, 2.2, 16),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.28 })
  );
  hull.rotation.x = Math.PI / 2;
  shipGroup.add(hull);

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 1.1, 16),
    new THREE.MeshStandardMaterial({ map: tex.orionTile, color: 0xffffff, metalness: 0.4, roughness: 0.35 })
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.65;
  shipGroup.add(nose);

  const wingMat = new THREE.MeshStandardMaterial({ map: tex.solarPanel, color: 0xffffff, metalness: 0.4, roughness: 0.22 });
  const wingL = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.06, 0.75), wingMat);
  wingL.position.set(-1.6, 0, -0.3);
  shipGroup.add(wingL);
  const wingR = wingL.clone();
  wingR.position.x = 1.6;
  shipGroup.add(wingR);

  const shipFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 2.4, 12),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 })
  );
  shipFlame.rotation.x = -Math.PI / 2;
  shipFlame.position.z = -2.2;
  shipFlame.visible = false;
  shipGroup.add(shipFlame);

  const shipShieldShell = new THREE.Mesh(
    new THREE.SphereGeometry(2.3, 18, 16),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22, wireframe: true })
  );
  shipShieldShell.visible = false;
  shipGroup.add(shipShieldShell);

  group.add(shipGroup);

  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const courseLine = new THREE.Line(
    lineGeo,
    new THREE.LineBasicMaterial({ color: 0x34d399, transparent: true, opacity: 0.6 })
  );
  group.add(courseLine);

  return { group, shipGroup, shipFlame, shipShieldShell, stormRing, planets, targetBeacon, courseLine };
}
