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
 * Physically-based Rayleigh + Henyey-Greenstein Mie outer atmospheric limb shader driven by live solar direction
 * and camera-altitude fade. Computes Chapman scale-height attenuation and wavelength dispersion along the terminator.
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
      uAltitudeFade: { value: 1.0 },
      uRimSharpness: { value: 1.0 },
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
      uniform float uAltitudeFade;
      uniform float uRimSharpness;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 sunDir = normalize(uSunDir);

        // BackSide shell: ndotv is 0 at outer exosphere boundary, negative toward planetary horizon.
        float ndotv = dot(n, viewDir);
        float shellDepth = clamp(-ndotv * 2.45, 0.0, 1.0);
        float chapmanScale = exp(-pow(1.0 - shellDepth, 1.75) * 2.85);
        float limb = pow(clamp(-ndotv * 2.25, 0.0, 1.0), max(1.1, uPower * uRimSharpness));
        float outerFade = smoothstep(0.0, 0.25, -ndotv);
        float limbDensity = mix(limb, chapmanScale * limb, 0.55) * outerFade;

        float sunDot = dot(n, sunDir);
        float dayWeight = smoothstep(-0.28, 0.44, sunDot);
        float twilightBand = exp(-pow((sunDot + 0.03) * 4.6, 2.0));

        // Henyey-Greenstein Mie forward scattering (g = 0.72) brightening the sunlit limb halo
        float cosTheta = clamp(dot(-viewDir, sunDir), -1.0, 1.0);
        float g = 0.72;
        float g2 = g * g;
        float miePhase = clamp((1.0 - g2) / (4.0 * 3.14159265 * pow(max(0.04, 1.0 + g2 - 2.0 * g * cosTheta), 1.5)), 0.0, 2.6);

        vec3 rayleighCol = mix(uDayColor, uTwilightColor, twilightBand * 0.52);
        vec3 scatterCol = rayleighCol + vec3(0.55, 0.78, 1.0) * (miePhase * 0.22 * dayWeight);

        float alpha = clamp(limbDensity * uIntensity * uAltitudeFade * mix(uNightFloor, 1.0, dayWeight), 0.0, 1.0);
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
 * Physically-based FrontSide Earth atmospheric scattering veil:
 * adds Rayleigh blue horizon rim Fresnel glow + sunlit disk aerial perspective + warm terminator scatter.
 */
export function createEarthSurfaceScatteringMaterial(intensity = 0.78): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.7, 0.35, 0.6).normalize() },
      uIntensity: { value: intensity },
      uAltitudeFade: { value: 1.0 },
      uRimSharpness: { value: 1.0 },
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
      uniform float uIntensity;
      uniform float uAltitudeFade;
      uniform float uRimSharpness;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;

      void main() {
        vec3 n = normalize(vWorldNormal);
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 sunDir = normalize(uSunDir);

        float mu = max(0.0, dot(n, viewDir));
        float fresnel = pow(1.0 - mu, max(2.2, 3.35 * uRimSharpness));
        float airMass = mix(0.06, 1.0, fresnel);

        float sunDot = dot(n, sunDir);
        float dayWeight = smoothstep(-0.22, 0.48, sunDot);
        float twilightBand = exp(-pow((sunDot + 0.02) * 4.4, 2.0));

        vec3 rayleighZenith = vec3(0.20, 0.56, 1.00);
        vec3 rayleighRim = vec3(0.42, 0.80, 1.00);
        vec3 sunsetScatter = vec3(0.96, 0.54, 0.26);

        vec3 baseCol = mix(rayleighZenith, rayleighRim, fresnel);
        vec3 finalCol = mix(baseCol, sunsetScatter, twilightBand * (0.48 * fresnel + 0.14));

        float alpha = clamp(airMass * uIntensity * uAltitudeFade * mix(0.04, 1.0, dayWeight), 0.0, 0.92);
        gl_FragColor = vec4(finalCol * alpha, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false,
  });
}

function smoothstepRange(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / Math.max(1e-5, edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Computes camera-altitude-dependent atmospheric scattering attenuation:
 * - Softens near-surface exosphere entry (`alt < 0.22 R_earth`) so close-ups never clip or blow out
 * - Peaks across orbital / cislunar views (`0.3 .. 6.0 R_earth`)
 * - Smoothly attenuates at high interplanetary overview altitudes (`> 6 R_earth`)
 */
export function computeEarthAltitudeFade(
  cameraDistUnits: number,
  earthRadiusUnits: number
): { limbFade: number; surfaceFade: number; rimSharpness: number } {
  const safeR = Math.max(0.001, earthRadiusUnits);
  const altRadii = Math.max(0, (cameraDistUnits - safeR) / safeR);
  const nearEntry = smoothstepRange(0.015, 0.22, altRadii);

  const farExcess = Math.max(0, altRadii - 6.0);
  const farLimbAtten = Math.max(0.22, 1.0 / (1.0 + Math.pow(farExcess / 26.0, 1.3)));
  const farSurfaceAtten = Math.max(0.0, 1.0 / (1.0 + Math.pow(farExcess / 14.0, 1.45)));

  const rimSharpness = 0.88 + 0.24 * smoothstepRange(0.2, 8.0, altRadii);
  return {
    limbFade: nearEntry * farLimbAtten,
    surfaceFade: nearEntry * farSurfaceAtten,
    rimSharpness,
  };
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

export function updateAtmosphereAltitudeFade(
  mesh: THREE.Object3D | undefined | null,
  altitudeFade: number,
  rimSharpness = 1.0
) {
  if (!(mesh instanceof THREE.Mesh)) return;
  const mat = mesh.material;
  if (!(mat instanceof THREE.ShaderMaterial)) return;
  if (mat.uniforms?.uAltitudeFade) {
    mat.uniforms.uAltitudeFade.value = altitudeFade;
  }
  if (mat.uniforms?.uRimSharpness) {
    mat.uniforms.uRimSharpness.value = rimSharpness;
  }
}
