import type { AudioSettings } from './types';

class SoundSynth {
  private ctx: AudioContext | null = null;
  private thrustGain: GainNode | null = null;
  private thrustFilter: BiquadFilterNode | null = null;
  private settings: AudioSettings = {
    muted: false,
    masterVolume: 0.85,
    sfxVolume: 0.9,
    ambienceVolume: 0.75,
  };
  private altitudeScale = 1.0;

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    this.thrustFilter = this.ctx.createBiquadFilter();
    this.thrustFilter.type = 'lowpass';
    this.thrustFilter.frequency.value = 175;

    this.thrustGain = this.ctx.createGain();
    this.thrustGain.gain.value = 0;

    noise.connect(this.thrustFilter);
    this.thrustFilter.connect(this.thrustGain);
    this.thrustGain.connect(this.ctx.destination);
    noise.start(0);
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (this.settings.muted) {
      this.setThrustVolume(0);
    }
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  setMuted(next: boolean) {
    this.settings.muted = next;
    if (this.settings.muted) {
      this.setThrustVolume(0);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.settings.muted);
    return this.settings.muted;
  }

  /**
   * Physics-accurate atmospheric taper: engine air-borne roar drops smoothly above 50 km
   * to near-silence in vacuum (>95 km), leaving only soft cabin mechanical conduction.
   */
  setLaunchAtmosphere(altitudeKm: number, dynamicPressureKpa: number) {
    const atmoFactor = Math.max(0.08, 1 - Math.min(1, altitudeKm / 95));
    this.altitudeScale = atmoFactor;
    if (this.ctx && this.thrustFilter) {
      const targetFreq = 160 + Math.min(340, dynamicPressureKpa * 9.5) + atmoFactor * 90;
      this.thrustFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);
    }
  }

  resetAtmosphere() {
    this.altitudeScale = 1.0;
    if (this.ctx && this.thrustFilter) {
      this.thrustFilter.frequency.setTargetAtTime(175, this.ctx.currentTime, 0.08);
    }
  }

  setThrustVolume(level: number) {
    if (!this.ctx || !this.thrustGain) return;
    const scale = this.settings.masterVolume * this.settings.ambienceVolume * this.altitudeScale;
    const v = this.settings.muted ? 0 : Math.max(0, Math.min(0.42, level * 0.36 * scale));
    this.thrustGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.06);
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.14) {
    if (this.settings.muted) return;
    this.init();
    if (!this.ctx) return;

    const effVol = Math.max(0.002, volume * this.settings.masterVolume * this.settings.sfxVolume);
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(effVol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playClick() {
    this.playTone(640, 0.07, 'triangle', 0.1);
  }

  playStageSep() {
    this.playTone(135, 0.4, 'sawtooth', 0.22);
    setTimeout(() => this.playTone(540, 0.18, 'sine', 0.16), 110);
  }

  playSuccess() {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.24, 'triangle', 0.18), idx * 85);
    });
  }

  playCrash() {
    this.playTone(72, 0.7, 'sawtooth', 0.3);
  }

  playDrillTick() {
    this.playTone(860 + Math.random() * 80, 0.05, 'sine', 0.07);
  }

  playRoverDrivePulse(speedAbs: number) {
    if (speedAbs < 0.4) return;
    this.playTone(120 + Math.min(90, speedAbs * 7), 0.04, 'triangle', 0.032);
  }

  playAirlockCycle() {
    this.playTone(210, 0.38, 'sine', 0.11);
    setTimeout(() => this.playTone(320, 0.35, 'triangle', 0.08), 180);
  }

  playCautionAlarm() {
    this.playTone(940, 0.12, 'square', 0.11);
    setTimeout(() => this.playTone(940, 0.12, 'square', 0.11), 190);
  }

  playCountdownBeep(isReady = false) {
    if (isReady) {
      this.playTone(1046.5, 0.14, 'sine', 0.16);
      setTimeout(() => this.playTone(1318.5, 0.24, 'sine', 0.16), 110);
    } else {
      this.playTone(784, 0.14, 'sine', 0.14);
    }
  }

  playIgnitionRoar() {
    if (this.settings.muted) return;
    this.init();
    if (!this.ctx) return;
    const effVol = 0.24 * this.settings.masterVolume * this.settings.sfxVolume;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(52, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(118, this.ctx.currentTime + 0.55);
    gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(effVol, this.ctx.currentTime + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.9);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.9);
  }
}

export const soundSynth = new SoundSynth();
