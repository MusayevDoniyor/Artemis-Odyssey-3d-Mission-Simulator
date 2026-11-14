class SoundSynth {
  private ctx: AudioContext | null = null;
  private thrustGain: GainNode | null = null;
  private muted = false;

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

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 175;

    this.thrustGain = this.ctx.createGain();
    this.thrustGain.gain.value = 0;

    noise.connect(filter);
    filter.connect(this.thrustGain);
    this.thrustGain.connect(this.ctx.destination);
    noise.start(0);
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(next: boolean) {
    this.muted = next;
    if (this.muted) {
      this.setThrustVolume(0);
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setThrustVolume(level: number) {
    if (!this.ctx || !this.thrustGain) return;
    const v = this.muted ? 0 : Math.max(0, Math.min(0.4, level * 0.36));
    this.thrustGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.06);
  }

  playTone(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.14) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
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
}

export const soundSynth = new SoundSynth();
