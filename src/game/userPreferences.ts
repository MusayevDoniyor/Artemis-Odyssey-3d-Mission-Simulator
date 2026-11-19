import type { AudioSettings, QualityPreset, TelemetrySpeedScale, UnitsSystem, UserPreferencesState } from './types';

export const USER_PREFERENCES_STORAGE_KEY = 'artemis_odyssey_user_settings_v1';

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  muted: false,
  masterVolume: 0.85,
  sfxVolume: 0.90,
  ambienceVolume: 0.40,
  engineVolume: 0.85,
};

export const DEFAULT_USER_PREFERENCES: UserPreferencesState = {
  audio: DEFAULT_AUDIO_SETTINGS,
  graphics: {
    quality: 'high',
    reducedMotion: false,
    highContrastBorders: false,
    bloomEnabled: true,
  },
  units: 'metric',
  speedScale: 'KID_25X',
};

/**
 * Loads user preferences from localStorage with schema validation and default fallbacks.
 */
export function loadUserPreferences(): UserPreferencesState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_USER_PREFERENCES };
    }
    const raw = window.localStorage.getItem(USER_PREFERENCES_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_PREFERENCES };

    const parsed = (JSON.parse(raw) || {}) as Record<string, any>;
    const pAudio = (parsed.audio || {}) as Record<string, any>;
    const pGraphics = (parsed.graphics || {}) as Record<string, any>;

    const quality: QualityPreset =
      pGraphics.quality === 'low' || pGraphics.quality === 'med' || pGraphics.quality === 'high' || pGraphics.quality === 'ultra'
        ? pGraphics.quality
        : 'high';

    const units: UnitsSystem = parsed.units === 'imperial' ? 'imperial' : 'metric';
    const speedScale: TelemetrySpeedScale = parsed.speedScale === 'REAL_SPEED' ? 'REAL_SPEED' : 'KID_25X';

    const clampVol = (v: unknown, fallback: number) =>
      typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;

    return {
      audio: {
        muted: Boolean(pAudio.muted),
        masterVolume: clampVol(pAudio.masterVolume, DEFAULT_AUDIO_SETTINGS.masterVolume),
        sfxVolume: clampVol(pAudio.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume),
        ambienceVolume: clampVol(pAudio.ambienceVolume, DEFAULT_AUDIO_SETTINGS.ambienceVolume),
        engineVolume: clampVol(pAudio.engineVolume, DEFAULT_AUDIO_SETTINGS.engineVolume),
      },
      graphics: {
        quality,
        reducedMotion: Boolean(pGraphics.reducedMotion),
        highContrastBorders: Boolean(pGraphics.highContrastBorders),
        bloomEnabled: pGraphics.bloomEnabled !== false,
      },
      units,
      speedScale,
    };
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
}

/**
 * Saves user preferences to localStorage.
 */
export function saveUserPreferences(prefs: UserPreferencesState): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));
    }
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Resets user preferences back to verified default state and updates storage.
 */
export function resetUserPreferences(): UserPreferencesState {
  saveUserPreferences(DEFAULT_USER_PREFERENCES);
  return { ...DEFAULT_USER_PREFERENCES };
}

// ---------------------------------------------------------------------------
// Aerospace Units of Measurement Conversion Utilities (NIST SP 811)
// ---------------------------------------------------------------------------

export const UNIT_CONVERSIONS = {
  METERS_TO_FEET: 3.28084,
  KM_TO_NAUTICAL_MILES: 0.539957,
  KM_TO_STATUTE_MILES: 0.621371,
  NEWTONS_TO_LBF: 0.224809,
  KPA_TO_PSI: 0.145038,
  BAR_TO_PSI: 14.5038,
  KG_TO_POUNDS: 2.20462,
} as const;

/**
 * Formats speed into Metric (m/s or km/s) or Imperial (ft/s or nmi/s).
 */
export function formatSpeed(speedMs: number, units: UnitsSystem = 'metric'): string {
  if (units === 'imperial') {
    const ftS = speedMs * UNIT_CONVERSIONS.METERS_TO_FEET;
    if (ftS >= 5280) {
      const nmiS = (speedMs / 1000) * UNIT_CONVERSIONS.KM_TO_NAUTICAL_MILES;
      return `${nmiS.toFixed(2)} nmi/s`;
    }
    return `${Math.round(ftS).toLocaleString()} ft/s`;
  }

  if (speedMs >= 1000) {
    return `${(speedMs / 1000).toFixed(2)} km/s`;
  }
  return `${speedMs.toFixed(1)} m/s`;
}

/**
 * Formats altitude into Metric (m or km) or Imperial (ft or nmi).
 */
export function formatAltitude(altKm: number, units: UnitsSystem = 'metric'): string {
  if (units === 'imperial') {
    if (altKm < 2.0) {
      const ft = altKm * 1000 * UNIT_CONVERSIONS.METERS_TO_FEET;
      return `${Math.round(ft).toLocaleString()} ft`;
    }
    const nmi = altKm * UNIT_CONVERSIONS.KM_TO_NAUTICAL_MILES;
    return `${Math.round(nmi).toLocaleString()} nmi`;
  }

  if (altKm < 1.0) {
    return `${Math.round(altKm * 1000).toLocaleString()} m`;
  }
  return `${Math.round(altKm).toLocaleString()} km`;
}

/**
 * Formats large interplanetary or orbital distance into Metric (km or AU) or Imperial (nmi).
 */
export function formatDistance(distKm: number, units: UnitsSystem = 'metric'): string {
  if (units === 'imperial') {
    const nmi = distKm * UNIT_CONVERSIONS.KM_TO_NAUTICAL_MILES;
    return `${Math.round(nmi).toLocaleString()} nmi`;
  }
  return `${Math.round(distKm).toLocaleString()} km`;
}

/**
 * Formats propulsion force into Metric (N / kN / MN) or Imperial (lbf / klbf / M lbf).
 */
export function formatForce(forceN: number, units: UnitsSystem = 'metric'): string {
  if (units === 'imperial') {
    const lbf = forceN * UNIT_CONVERSIONS.NEWTONS_TO_LBF;
    if (lbf >= 1_000_000) {
      return `${(lbf / 1_000_000).toFixed(2)} M lbf`;
    }
    if (lbf >= 10_000) {
      return `${(lbf / 1000).toFixed(1)} klbf`;
    }
    return `${Math.round(lbf).toLocaleString()} lbf`;
  }

  if (forceN >= 1_000_000) {
    return `${(forceN / 1_000_000).toFixed(1)} MN`;
  }
  if (forceN >= 1_000) {
    return `${(forceN / 1000).toFixed(1)} kN`;
  }
  return `${Math.round(forceN).toLocaleString()} N`;
}
