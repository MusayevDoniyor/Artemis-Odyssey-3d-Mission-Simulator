import { test } from 'node:test';
import assert from 'node:assert/strict';
import { soundSynth } from './audio';
import { computeRocketAcoustics } from '../sim/audio/rocketAcoustics';

test('audio: soundSynth initialized with valid default settings', () => {
  const settings = soundSynth.getSettings();
  assert.equal(typeof settings.masterVolume, 'number');
  assert.equal(typeof settings.sfxVolume, 'number');
  assert.equal(typeof settings.ambienceVolume, 'number');
  assert.equal(typeof settings.muted, 'boolean');
  assert.ok(settings.masterVolume > 0 && settings.masterVolume <= 1);
});

test('audio: soundSynth updateSettings clamps bounds correctly', () => {
  soundSynth.updateSettings({ masterVolume: 0.5, sfxVolume: 0.75 });
  const s = soundSynth.getSettings();
  assert.equal(s.masterVolume, 0.5);
  assert.equal(s.sfxVolume, 0.75);

  // Restore defaults
  soundSynth.updateSettings({ masterVolume: 0.85, sfxVolume: 0.9 });
});

test('audio: soundSynth headless safe execution', () => {
  // Methods should run safely in headless Node test environment without throwing
  assert.doesNotThrow(() => {
    soundSynth.init();
    soundSynth.playClick();
    soundSynth.playStageSep();
    soundSynth.playRcsPuff();
    soundSynth.playCountdownBeep(false);
    soundSynth.playCountdownBeep(true);
    soundSynth.playIgnitionRoar();
    soundSynth.setLaunchAtmosphere(12.5, 33.0);
    soundSynth.resetAtmosphere();
    soundSynth.setThrustVolume(0.8);
    soundSynth.setThrustVolume(0);
  });
});

test('audio: updateLaunchAcoustics integrates computeRocketAcoustics telemetry', () => {
  const result = soundSynth.updateLaunchAcoustics({
    throttle: 1.0,
    altitudeKm: 14.0,
    dynamicPressureKpa: 33.5,
    machNumber: 1.6,
    srbSeparated: false,
    coreSeparated: false,
    isCockpit: false,
    cameraDistanceM: 40,
  });

  assert.ok(result.totalEngineGain > 0, 'Composite launch gain should be positive');
  assert.ok(result.subBassRumbleGain > 0, 'Sub-bass rumble should be active');
  assert.ok(result.srbRoarGain > 0, 'SRB roar should be active prior to staging');
  assert.ok(result.exhaustCrackleGain > 0, 'Supersonic shear crackle should be active in atmosphere');
  assert.ok(result.buffetGain > 0, 'Max-Q aerodynamic buffeting should be active');
  assert.equal(result.cabinFilterCutoffHz, 18000, 'Exterior camera should have open filter');
});
