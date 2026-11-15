import type { AudioSettings, GamePhase } from './types';

export type MusicTrackId = 'menu' | 'space';

export interface MusicState {
  musicEnabled: boolean;
  musicVolume: number;
  audioBlocked: boolean;
  activeTrack: MusicTrackId | null;
  usingFallbackPad: boolean;
}

const MUSIC_PREFS_KEY = 'artemis_music_prefs';
const TRACK_URLS: Record<MusicTrackId, string> = {
  menu: '/audio/main-menu-ambient.mp3',
  space: '/audio/space-flight-ambient.mp3',
};

const MENU_CHORDS: number[][] = [
  [146.83, 220.0, 261.63, 329.63, 349.23, 440.0], // Dm9 warm lunar horizon
  [116.54, 174.61, 220.0, 293.66, 329.63, 440.0], // Bbmaj7#11 cinematic lift
  [130.81, 196.0, 246.94, 293.66, 329.63, 440.0], // Cmaj9 open orbit
  [110.0, 164.81, 220.0, 246.94, 293.66, 392.0], // Am11 drift
];

const SPACE_CHORDS: number[][] = [
  [110.0, 164.81, 246.94, 329.63, 392.0, 493.88], // Am9 deep cosmos
  [174.61, 220.0, 261.63, 329.63, 440.0, 523.25], // Fmaj7 expanse
  [130.81, 196.0, 293.66, 329.63, 392.0, 493.88], // G6/9 solar wind
  [146.83, 220.0, 261.63, 329.63, 440.0, 523.25], // Dm9 / A celestial
];

const CHIME_FREQS_MENU = [440.0, 523.25, 587.33, 659.25, 698.46, 880.0];
const CHIME_FREQS_SPACE = [392.0, 493.88, 523.25, 587.33, 659.25, 783.99];

function loadMusicPrefs(): { musicEnabled: boolean; musicVolume: number } {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { musicEnabled: true, musicVolume: 0.34 };
    }
    const raw = window.localStorage.getItem(MUSIC_PREFS_KEY);
    if (!raw) return { musicEnabled: true, musicVolume: 0.34 };
    const parsed = JSON.parse(raw) as Partial<{ musicEnabled: boolean; musicVolume: number }>;
    return {
      musicEnabled: typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : true,
      musicVolume:
        typeof parsed.musicVolume === 'number' && Number.isFinite(parsed.musicVolume)
          ? Math.max(0, Math.min(1, parsed.musicVolume))
          : 0.34,
    };
  } catch {
    return { musicEnabled: true, musicVolume: 0.34 };
  }
}

function saveMusicPrefs(musicEnabled: boolean, musicVolume: number) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(
        MUSIC_PREFS_KEY,
        JSON.stringify({ musicEnabled, musicVolume })
      );
    }
  } catch {
    // Ignore storage quota errors
  }
}

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

  // Ambient music manager state
  private musicState: MusicState = {
    ...loadMusicPrefs(),
    audioBlocked: false,
    activeTrack: null,
    usingFallbackPad: false,
  };
  private musicListeners = new Set<(st: MusicState) => void>();
  private desiredTrack: MusicTrackId | null = null;
  private trackElements: Partial<Record<MusicTrackId, HTMLAudioElement>> = {};
  private trackVolumes: Record<MusicTrackId, number> = { menu: 0, space: 0 };
  private trackAvailable: Partial<Record<MusicTrackId, boolean | 'checking'>> = {};
  private fadeTimerId: number | null = null;

  // Evolving Web Audio Space Ambient Synth (used seamlessly whenever MP3 assets are absent)
  private padGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private padOscs: OscillatorNode[] = [];
  private padSubOsc: OscillatorNode | null = null;
  private padLfo: OscillatorNode | null = null;
  private padEvolutionTimerId: number | null = null;
  private padChordIndex = 0;

  init(): boolean {
    if (typeof window === 'undefined') return false;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;

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

      this.ctx.onstatechange = () => {
        if (this.ctx?.state === 'running') {
          if (this.musicState.audioBlocked) {
            this.musicState.audioBlocked = false;
          }
          this.syncMusicPlayback();
          this.emitMusicState();
        }
      };
    }

    if (this.ctx.state === 'suspended') {
      this.ctx
        .resume()
        .then(() => {
          if (this.ctx?.state === 'running') {
            this.musicState.audioBlocked = false;
            this.syncMusicPlayback();
            this.emitMusicState();
          }
        })
        .catch(() => {
          if (this.desiredTrack && this.musicState.musicEnabled && !this.settings.muted) {
            this.musicState.audioBlocked = true;
            this.emitMusicState();
          }
        });
    }

    return this.ctx.state === 'running';
  }

  private emitMusicState() {
    const snap = this.getMusicState();
    this.musicListeners.forEach((cb) => cb(snap));
  }

  getMusicState(): MusicState {
    return { ...this.musicState };
  }

  subscribeMusicState(cb: (state: MusicState) => void): () => void {
    this.musicListeners.add(cb);
    cb(this.getMusicState());
    return () => {
      this.musicListeners.delete(cb);
    };
  }

  setMusicModeForPhase(phase: GamePhase) {
    const nextTrack: MusicTrackId | null =
      phase === 'title' || phase === 'briefing' || phase === 'inspector' || phase === 'victory'
        ? 'menu'
        : phase === 'space' || phase === 'launch' || phase === 'landing' || phase === 'rover'
          ? 'space'
          : null;
    if (this.desiredTrack === nextTrack && this.musicState.activeTrack === nextTrack) {
      return;
    }
    this.desiredTrack = nextTrack;
    this.musicState.activeTrack = nextTrack;
    if (nextTrack) {
      this.retunePadToTrack(nextTrack);
    }
    this.syncMusicPlayback();
    this.emitMusicState();
  }

  setMusicEnabled(enabled: boolean) {
    this.musicState.musicEnabled = enabled;
    saveMusicPrefs(this.musicState.musicEnabled, this.musicState.musicVolume);
    if (!enabled) {
      this.musicState.audioBlocked = false;
    } else {
      this.init();
    }
    this.syncMusicPlayback();
    this.emitMusicState();
  }

  setMusicVolume(volume: number) {
    this.musicState.musicVolume = Math.max(0, Math.min(1, volume));
    saveMusicPrefs(this.musicState.musicEnabled, this.musicState.musicVolume);
    this.syncFallbackPadGain();
    this.emitMusicState();
  }

  unlockMusicOnGesture() {
    const running = this.init();
    if (running && this.musicState.audioBlocked) {
      this.musicState.audioBlocked = false;
      this.emitMusicState();
    }
    this.syncMusicPlayback();
  }

  private effectiveMusicTarget(track: MusicTrackId): number {
    if (
      this.settings.muted ||
      !this.musicState.musicEnabled ||
      this.desiredTrack !== track
    ) {
      return 0;
    }
    return Math.max(0, Math.min(1, this.musicState.musicVolume * this.settings.masterVolume));
  }

  private retunePadToTrack(track: MusicTrackId) {
    if (!this.ctx || !this.padGain || this.padOscs.length === 0) return;
    const chords = track === 'space' ? SPACE_CHORDS : MENU_CHORDS;
    const chord = chords[this.padChordIndex % chords.length];
    const now = this.ctx.currentTime;
    this.padOscs.forEach((osc, idx) => {
      const freq = chord[idx] ?? chord[idx % chord.length];
      osc.frequency.setTargetAtTime(freq, now, 0.9);
    });
    if (this.padSubOsc) {
      this.padSubOsc.frequency.setTargetAtTime(chord[0] * 0.5, now, 0.9);
    }
  }

  private playAmbientChime(track: MusicTrackId) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (this.settings.muted || !this.musicState.musicEnabled) return;
    const now = this.ctx.currentTime;
    const chimes = track === 'space' ? CHIME_FREQS_SPACE : CHIME_FREQS_MENU;
    const chimeFreq = chimes[(this.padChordIndex * 2 + Math.floor(Math.random() * 2)) % chimes.length];
    const chimeOsc = this.ctx.createOscillator();
    const chimeGain = this.ctx.createGain();
    chimeOsc.type = 'sine';
    chimeOsc.frequency.setValueAtTime(chimeFreq, now);
    const chimePeak = Math.max(
      0.008,
      Math.min(0.14, this.musicState.musicVolume * this.settings.masterVolume * 0.24)
    );
    chimeGain.gain.setValueAtTime(0.0001, now);
    chimeGain.gain.linearRampToValueAtTime(chimePeak, now + 0.28);
    chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
    chimeOsc.connect(chimeGain);
    if (this.padFilter) {
      chimeGain.connect(this.padFilter);
    } else {
      chimeGain.connect(this.ctx.destination);
    }
    chimeOsc.start(now);
    chimeOsc.stop(now + 3.3);
  }

  private ensureFallbackPad(): boolean {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    if (this.padGain) return true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = this.desiredTrack === 'space' ? 1550 : 1250;
    filter.Q.value = 0.7;

    // Gentle LFO sweeping the filter cutoff for an organic breathing cosmic synth
    const lfo = this.ctx.createOscillator();
    const lfoDepth = this.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.09;
    lfoDepth.gain.value = 340;
    lfo.connect(lfoDepth);
    lfoDepth.connect(filter.frequency);
    lfo.start();
    this.padLfo = lfo;

    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 12;
    comp.ratio.value = 2.5;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    const initialChord = this.desiredTrack === 'space' ? SPACE_CHORDS[0] : MENU_CHORDS[0];
    const oscs: OscillatorNode[] = [];
    initialChord.forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      osc.type = idx < 2 ? 'sine' : idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.value = f;
      osc.detune.value = (idx - 2.5) * 6.0;
      const voiceGain = this.ctx!.createGain();
      voiceGain.gain.value = idx === 0 ? 0.24 : idx === 1 ? 0.2 : idx < 4 ? 0.17 : 0.13;
      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start();
      oscs.push(osc);
    });

    // Warm sub-octave foundation voice
    const subOsc = this.ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.value = initialChord[0] * 0.5;
    const subGain = this.ctx.createGain();
    subGain.gain.value = 0.22;
    subOsc.connect(subGain);
    subGain.connect(filter);
    subOsc.start();
    this.padSubOsc = subOsc;

    filter.connect(comp);
    comp.connect(gain);
    gain.connect(this.ctx.destination);
    this.padFilter = filter;
    this.padGain = gain;
    this.padOscs = oscs;

    if (this.padEvolutionTimerId === null && typeof window !== 'undefined') {
      this.padEvolutionTimerId = window.setInterval(() => {
        this.evolveAmbientPadStep();
      }, 3600);
    }

    if (this.desiredTrack) {
      this.playAmbientChime(this.desiredTrack);
    }
    return true;
  }

  private evolveAmbientPadStep() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.padGain) return;
    const track = this.desiredTrack;
    const active =
      Boolean(track) &&
      this.musicState.musicEnabled &&
      !this.settings.muted &&
      this.trackAvailable[track!] !== true;
    if (!active) return;

    this.padChordIndex = (this.padChordIndex + 1) % MENU_CHORDS.length;
    const chords = track === 'space' ? SPACE_CHORDS : MENU_CHORDS;
    const nextChord = chords[this.padChordIndex % chords.length];
    const now = this.ctx.currentTime;
    this.padOscs.forEach((osc, idx) => {
      const freq = nextChord[idx] ?? nextChord[idx % nextChord.length];
      osc.frequency.setTargetAtTime(freq, now, 1.1);
    });
    if (this.padSubOsc) {
      this.padSubOsc.frequency.setTargetAtTime(nextChord[0] * 0.5, now, 1.1);
    }

    // Subtle crystalline space shimmer note on every harmonic shift
    this.playAmbientChime(track!);
  }

  private syncFallbackPadGain() {
    if (!this.ctx || !this.padGain) return;
    const track = this.desiredTrack;
    const usePad =
      Boolean(track) &&
      this.musicState.musicEnabled &&
      !this.settings.muted &&
      this.trackAvailable[track!] !== true;

    if (this.padFilter && track) {
      const targetFreq = track === 'space' ? 1550 : 1250;
      this.padFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.7);
    }
    const targetVol = usePad
      ? Math.max(0, Math.min(0.65, this.musicState.musicVolume * this.settings.masterVolume * 0.78))
      : 0;
    this.padGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.35);
    void this.padLfo;
  }

  private checkTrackAvailability(track: MusicTrackId) {
    if (typeof window === 'undefined') return;
    const status = this.trackAvailable[track];
    if (status !== undefined) return;
    this.trackAvailable[track] = 'checking';

    fetch(TRACK_URLS[track], { method: 'HEAD' })
      .then((res) => {
        const ctype = (res.headers.get('content-type') || '').toLowerCase();
        const valid = res.ok && (ctype.startsWith('audio/') || ctype === 'application/octet-stream');
        this.trackAvailable[track] = valid;
        this.musicState.usingFallbackPad = !valid;
        this.syncMusicPlayback();
        this.emitMusicState();
      })
      .catch(() => {
        this.trackAvailable[track] = false;
        this.musicState.usingFallbackPad = true;
        this.syncMusicPlayback();
        this.emitMusicState();
      });
  }

  private getOrCreateAudioElement(track: MusicTrackId): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
    if (this.trackElements[track]) return this.trackElements[track]!;

    const el = new Audio(TRACK_URLS[track]);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    el.addEventListener('error', () => {
      this.trackAvailable[track] = false;
      this.musicState.usingFallbackPad = true;
      this.syncMusicPlayback();
      this.emitMusicState();
    });
    this.trackElements[track] = el;
    return el;
  }

  private startFadeLoop() {
    if (typeof window === 'undefined' || this.fadeTimerId !== null) return;
    this.fadeTimerId = window.setInterval(() => {
      const dt = 0.05;
      const tracks: MusicTrackId[] = ['menu', 'space'];
      let anyChanging = false;

      for (const track of tracks) {
        const target =
          this.trackAvailable[track] === true ? this.effectiveMusicTarget(track) : 0;
        const current = this.trackVolumes[track];
        const fadeSec = target > current ? 1.8 : 0.7;
        const step = dt / fadeSec;
        let next = current;
        if (Math.abs(target - current) <= step) {
          next = target;
        } else {
          next = current + Math.sign(target - current) * step;
          anyChanging = true;
        }
        this.trackVolumes[track] = next;

        const el = this.trackElements[track];
        if (el) {
          el.volume = Math.max(0, Math.min(1, next));
          if (next <= 0.001 && target === 0 && !el.paused) {
            el.pause();
          }
        }
      }

      this.syncFallbackPadGain();

      if (!anyChanging && this.fadeTimerId !== null) {
        window.clearInterval(this.fadeTimerId);
        this.fadeTimerId = null;
      }
    }, 50);
  }

  private syncMusicPlayback() {
    if (typeof window === 'undefined') return;
    const track = this.desiredTrack;
    if (track && this.musicState.musicEnabled && !this.settings.muted) {
      this.checkTrackAvailability(track);
      if (this.trackAvailable[track] === true) {
        this.musicState.usingFallbackPad = false;
        const el = this.getOrCreateAudioElement(track);
        if (el && el.paused) {
          el.play()
            .then(() => {
              if (this.musicState.audioBlocked) {
                this.musicState.audioBlocked = false;
                this.emitMusicState();
              }
            })
            .catch((err: unknown) => {
              const name = err instanceof Error ? err.name : '';
              if (name === 'NotAllowedError') {
                this.musicState.audioBlocked = true;
                this.emitMusicState();
              }
            });
        }
      } else {
        // Immediately use procedural Web Audio synth while MP3 is absent or being verified
        this.musicState.usingFallbackPad = true;
        if (this.ctx && this.ctx.state === 'running') {
          if (this.musicState.audioBlocked) {
            this.musicState.audioBlocked = false;
            this.emitMusicState();
          }
          this.ensureFallbackPad();
        } else {
          // Prompt user with ENABLE AUDIO button immediately until a user gesture unlocks AudioContext
          if (!this.musicState.audioBlocked) {
            this.musicState.audioBlocked = true;
            this.emitMusicState();
          }
        }
      }
    }
    this.syncFallbackPadGain();
    this.startFadeLoop();
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  updateSettings(partial: Partial<AudioSettings>) {
    this.settings = { ...this.settings, ...partial };
    if (this.settings.muted) {
      this.setThrustVolume(0);
    } else if (this.musicState.musicEnabled) {
      this.init();
    }
    this.syncMusicPlayback();
    this.emitMusicState();
  }

  isMuted(): boolean {
    return this.settings.muted;
  }

  setMuted(next: boolean) {
    this.settings.muted = next;
    if (this.settings.muted) {
      this.setThrustVolume(0);
    } else if (this.musicState.musicEnabled) {
      this.init();
    }
    this.syncMusicPlayback();
    this.emitMusicState();
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
