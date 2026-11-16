import test from 'node:test';
import assert from 'node:assert/strict';
import {
  soundSynth,
  MENU_CHORDS,
  LAUNCH_CHORDS,
  SPACE_CHORDS,
  DESCENT_CHORDS,
  SURFACE_CHORDS,
  TRACK_URLS,
  type MusicTrackId,
} from '../../game/audio';
import {
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_USER_PREFERENCES,
  USER_PREFERENCES_STORAGE_KEY,
  loadUserPreferences,
  saveUserPreferences,
  resetUserPreferences,
  formatSpeed,
  formatAltitude,
  formatDistance,
  formatForce,
} from '../../game/userPreferences';
import type { UserPreferencesState } from '../../game/types';

test('PHASE 10: 4-Bus Audio Mixing Console settings, clamping, and mute state', () => {
  // Test soundSynth settings query
  const s = soundSynth.getSettings();
  assert.equal(typeof s.masterVolume, 'number');
  assert.equal(typeof s.sfxVolume, 'number');
  assert.equal(typeof s.ambienceVolume, 'number');
  assert.equal(typeof s.engineVolume, 'number');
  assert.equal(typeof s.muted, 'boolean');

  // Test updating individual bus volumes
  soundSynth.updateSettings({
    masterVolume: 0.72,
    sfxVolume: 0.88,
    ambienceVolume: 0.35,
    engineVolume: 0.95,
  });
  const updated = soundSynth.getSettings();
  assert.equal(updated.masterVolume, 0.72);
  assert.equal(updated.sfxVolume, 0.88);
  assert.equal(updated.ambienceVolume, 0.35);
  assert.equal(updated.engineVolume, 0.95);

  // Test clamping out-of-bounds values
  soundSynth.updateSettings({
    masterVolume: 1.5,
    sfxVolume: -0.2,
  });
  const clamped = soundSynth.getSettings();
  assert.equal(clamped.masterVolume, 1.0);
  assert.equal(clamped.sfxVolume, 0.0);

  // Test mute toggle
  const initialMute = clamped.muted;
  const toggled = soundSynth.toggleMute();
  assert.equal(toggled, !initialMute);
  assert.equal(soundSynth.getSettings().muted, !initialMute);

  // Restore initial mute
  soundSynth.toggleMute();
});

test('PHASE 10: Procedural music tracks and harmonic chord distributions across 5 phases', () => {
  const tracks: MusicTrackId[] = ['menu', 'launch', 'space', 'descent', 'surface'];
  for (const track of tracks) {
    assert.ok(TRACK_URLS[track], `Track ${track} must have an associated audio file path`);
    assert.ok(TRACK_URLS[track].endsWith('.mp3'), `Track ${track} path must end in .mp3`);
  }

  const collections = [
    { name: 'menu', chords: MENU_CHORDS },
    { name: 'launch', chords: LAUNCH_CHORDS },
    { name: 'space', chords: SPACE_CHORDS },
    { name: 'descent', chords: DESCENT_CHORDS },
    { name: 'surface', chords: SURFACE_CHORDS },
  ];

  for (const { name, chords } of collections) {
    assert.ok(chords.length >= 3, `${name} must contain at least 3 distinct chords`);
    for (const chord of chords) {
      assert.ok(chord.length >= 3, `Chord in ${name} must contain at least 3 voices`);
      for (const freq of chord) {
        assert.ok(Number.isFinite(freq), `Frequency in ${name} must be finite`);
        assert.ok(freq > 100, `Frequency ${freq} in ${name} should be audible (> 100 Hz)`);
        assert.ok(freq < 2000, `Frequency ${freq} in ${name} should be musical (< 2000 Hz)`);
      }
    }
  }
});

test('PHASE 10: User preferences schema validation, corruption recovery, and persistence', () => {
  // Mock localStorage in Node test environment
  const mockStorage = new Map<string, string>();
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, val: string) => mockStorage.set(key, String(val)),
      removeItem: (key: string) => mockStorage.delete(key),
      clear: () => mockStorage.clear(),
    },
  };

  try {
    // 1. Initial load with empty storage returns defaults
    const initial = loadUserPreferences();
    assert.deepEqual(initial, DEFAULT_USER_PREFERENCES);

    // 2. Corrupt JSON recovery
    mockStorage.set(USER_PREFERENCES_STORAGE_KEY, '{invalid_json!!}');
    const recovered = loadUserPreferences();
    assert.deepEqual(recovered, DEFAULT_USER_PREFERENCES);

    // 3. Partial preferences merged with defaults
    const partialState = {
      audio: {
        masterVolume: 0.65,
        engineVolume: 0.90,
      },
      graphics: {
        quality: 'ultra',
        reducedMotion: true,
      },
      units: 'imperial',
    };
    mockStorage.set(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(partialState));
    const merged = loadUserPreferences();
    assert.equal(merged.audio.masterVolume, 0.65);
    assert.equal(merged.audio.engineVolume, 0.90);
    assert.equal(merged.audio.sfxVolume, DEFAULT_AUDIO_SETTINGS.sfxVolume);
    assert.equal(merged.graphics.quality, 'ultra');
    assert.equal(merged.graphics.reducedMotion, true);
    assert.equal(merged.units, 'imperial');
    assert.equal(merged.speedScale, 'KID_25X');

    // 4. Invalid quality preset fallback
    const invalidQuality = {
      graphics: { quality: 'raytracing_ultra_extreme' },
    };
    mockStorage.set(USER_PREFERENCES_STORAGE_KEY, JSON.stringify(invalidQuality));
    assert.equal(loadUserPreferences().graphics.quality, 'high');

    // 5. Save and reset preferences
    const customPrefs: UserPreferencesState = {
      audio: {
        muted: true,
        masterVolume: 0.5,
        sfxVolume: 0.5,
        ambienceVolume: 0.5,
        engineVolume: 0.5,
      },
      graphics: {
        quality: 'low',
        reducedMotion: true,
        highContrastBorders: true,
        bloomEnabled: false,
      },
      units: 'imperial',
      speedScale: 'REAL_SPEED',
    };
    saveUserPreferences(customPrefs);
    assert.deepEqual(loadUserPreferences(), customPrefs);

    const reset = resetUserPreferences();
    assert.deepEqual(reset, DEFAULT_USER_PREFERENCES);
    assert.deepEqual(loadUserPreferences(), DEFAULT_USER_PREFERENCES);
  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test('PHASE 10: Aerospace Units formatting (NIST SP 811 verified)', () => {
  // Speed formatting
  // Sub-km/s: 25.5 m/s -> "25.5 m/s" vs ~84 ft/s
  assert.equal(formatSpeed(25.5, 'metric'), '25.5 m/s');
  assert.equal(formatSpeed(25.5, 'imperial'), '84 ft/s');

  // Orbital speed: 7800 m/s -> "7.80 km/s" vs ~4.21 nmi/s
  assert.equal(formatSpeed(7800, 'metric'), '7.80 km/s');
  assert.equal(formatSpeed(7800, 'imperial'), '4.21 nmi/s');

  // Altitude formatting
  // Low altitude: 450 m (0.45 km)
  assert.equal(formatAltitude(0.45, 'metric'), '450 m');
  assert.equal(formatAltitude(0.45, 'imperial'), '1,476 ft');

  // Orbital altitude: 165 km
  assert.equal(formatAltitude(165, 'metric'), '165 km');
  assert.equal(formatAltitude(165, 'imperial'), '89 nmi');

  // Interplanetary distance formatting: 384,400 km (Earth-Moon)
  const distKm = 384400;
  assert.equal(formatDistance(distKm, 'metric'), '384,400 km');
  assert.equal(formatDistance(distKm, 'imperial'), '207,559 nmi');

  // Force formatting: 33,000,000 N (33 MN SLS Liftoff Thrust)
  assert.equal(formatForce(33_000_000, 'metric'), '33.0 MN');
  assert.equal(formatForce(33_000_000, 'imperial'), '7.42 M lbf');

  // Smaller thruster force: 450 N RCS thruster
  assert.equal(formatForce(450, 'metric'), '450 N');
  assert.equal(formatForce(450, 'imperial'), '101 lbf');
});
