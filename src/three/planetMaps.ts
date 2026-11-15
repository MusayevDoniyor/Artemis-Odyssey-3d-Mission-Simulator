import * as THREE from 'three';

export interface RealPlanetMaps {
  earthMap: THREE.Texture;
  moonMap: THREE.Texture;
  marsMap: THREE.Texture;
  dispose: () => void;
}

const EARTH_MAP_URL = '/assets/aistudio/image_ff00a818.png';
const MOON_MAP_URL = '/assets/aistudio/image_b10e22ac.png';
const MARS_MAP_URL = '/assets/aistudio/image_93ad272a.png';

function configureEquirectTexture(
  tex: THREE.Texture,
  maxAnisotropy: number,
  vRepeat = 1,
  vOffset = 0
): THREE.Texture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = maxAnisotropy;
  if (vRepeat !== 1 || vOffset !== 0) {
    tex.repeat.set(1, vRepeat);
    tex.offset.set(0, vOffset);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createRealPlanetMaps(maxAnisotropy: number): RealPlanetMaps {
  const loader = new THREE.TextureLoader();

  const earthMap = configureEquirectTexture(
    loader.load(EARTH_MAP_URL, (loaded) => {
      loaded.needsUpdate = true;
    }),
    maxAnisotropy
  );

  // Trim 2% top/bottom border rows present on source lunar mosaic to keep poles seamless
  const moonMap = configureEquirectTexture(
    loader.load(MOON_MAP_URL, (loaded) => {
      loaded.needsUpdate = true;
    }),
    maxAnisotropy,
    0.96,
    0.02
  );

  // Trim bottom attribution/scale strip on Mars Express mosaic via UV framing
  const marsMap = configureEquirectTexture(
    loader.load(MARS_MAP_URL, (loaded) => {
      loaded.needsUpdate = true;
    }),
    maxAnisotropy,
    0.94,
    0.045
  );

  return {
    earthMap,
    moonMap,
    marsMap,
    dispose: () => {
      earthMap.dispose();
      moonMap.dispose();
      marsMap.dispose();
    },
  };
}

export interface PlanetAtmosphereOptions {
  dayColor: number;
  twilightColor: number;
  intensity: number;
  power: number;
  nightFloor?: number;
}

/**
 * Rayleigh-inspired outer atmospheric limb shader driven by live solar direction.
 * Fades cleanly to zero at the outer shell boundary so planets never show hard halos.
 */
export function createPlanetAtmosphereMaterial(
  opts: PlanetAtmosphereOptions
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.7, 0.35, 0.6).normalize() },
      uDayColor: { value: new THREE.Color(opts.dayColor) },
      uTwilightColor: { value: new THREE.Color(opts.twilightColor) },
      uIntensity: { value: opts.intensity },
      uPower: { value: opts.power },
      uNightFloor: { value: opts.nightFloor ?? 0.08 },
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uDayColor;
      uniform vec3 uTwilightColor;
      uniform float uIntensity;
      uniform float uPower;
      uniform float uNightFloor;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        // BackSide sphere: ndotv is 0 at outer silhouette edge, negative toward planet center.
        float ndotv = dot(n, viewDir);
        float limb = pow(clamp(-ndotv * 2.15, 0.0, 1.0), uPower);
        float outerFade = smoothstep(0.0, 0.28, -ndotv);

        float sunDot = dot(n, normalize(uSunDir));
        float dayWeight = smoothstep(-0.26, 0.42, sunDot);
        float twilightBand = exp(-pow((sunDot + 0.04) * 4.5, 2.0));

        vec3 scatterCol = mix(uDayColor, uTwilightColor, twilightBand * 0.45);
        float alpha = limb * outerFade * uIntensity * mix(uNightFloor, 1.0, dayWeight);
        gl_FragColor = vec4(scatterCol * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
  });
}

export function updateAtmosphereSunDirection(
  mesh: THREE.Object3D | undefined | null,
  worldPos: THREE.Vector3,
  sunOrigin: THREE.Vector3,
  scratch: THREE.Vector3
) {
  if (!(mesh instanceof THREE.Mesh)) return;
  const mat = mesh.material;
  if (!(mat instanceof THREE.ShaderMaterial) || !mat.uniforms?.uSunDir) return;
  scratch.subVectors(sunOrigin, worldPos).normalize();
  mat.uniforms.uSunDir.value.copy(scratch);
}
