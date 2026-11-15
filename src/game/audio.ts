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

// High-register, zero-hum Space Piano & Celesta harmonic progressions (no sub-bass drone < 196 Hz)
const MENU_CHORDS: number[][] = [
  [293.66, 349.23, 440.0, 523.25, 659.25], // Dm9 celestial piano
  [233.08, 293.66, 349.23, 440.0, 587.33], // Bbmaj9 warm horizon
  [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9 orbital light
  [220.0, 261.63, 329.63, 392.0, 493.88],  // Am9 quiet stars
];

const SPACE_CHORDS: number[][] = [
  [220.0, 293.66, 329.63, 440.0, 659.25],  // Asus2 / Am9 deep cosmos
  [261.63, 349.23, 440.0, 523.25, 659.25], // Fmaj7 expanse
  [196.0, 293.66, 392.0, 493.88, 587.33],  // Gmaj7 solar wind
  [293.66, 349.23, 440.0, 523.25, 783.99], // Dm9 cislunar drift
];

const ARPEGGIO_PATTERNS: number[][] = [
  [0, 2, 4, 3],
  [1, 3, 4, 2],
  [0, 1, 3, 4],
  [2, 4, 1, 3],
];

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

  // Zero-hum Generative Space Piano & Celesta Bus (transient notes with echo reverb, no continuous drone)
  private padGain: GainNode | null = null;
  private padFilter: BiquadFilterNode | null = null;
  private padEvolutionTimerId: number | null = null;
  private padChordIndex = 0;
  private padNoteStep = 0;

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

  /** Plays a single pure Space Piano / Celesta note with natural exponential decay (zero continuous hum) */
  private triggerPianoCelestaNote(freq: number, delaySec: number, durationSec: number, velocity = 1.0) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.padFilter) return;
    const startTime = this.ctx.currentTime + delaySec;

    // Fundamental pure sine voice
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    const peak = Math.max(0.002, Math.min(0.11, 0.065 * velocity));
    noteGain.gain.setValueAtTime(0.0001, startTime);
    noteGain.gain.linearRampToValueAtTime(peak, startTime + 0.035);
    noteGain.gain.exponentialRampToValueAtTime(peak * 0.35, startTime + 0.45);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec);

    osc.connect(noteGain);
    noteGain.connect(this.padFilter);
    osc.start(startTime);
    osc.stop(startTime + durationSec + 0.05);

    // Subtle crystalline 2x harmonic overtone (decays quickly like a felt piano hammer)
    const harmOsc = this.ctx.createOscillator();
    const harmGain = this.ctx.createGain();
    harmOsc.type = 'sine';
    harmOsc.frequency.setValueAtTime(freq * 2, startTime);
    const harmPeak = peak * 0.16;
    harmGain.gain.setValueAtTime(0.0001, startTime);
    harmGain.gain.linearRampToValueAtTime(harmPeak, startTime + 0.02);
    harmGain.gain.exponentialRampToValueAtTime(0.0001, startTime + Math.min(0.55, durationSec * 0.4));

    harmOsc.connect(harmGain);
    harmGain.connect(this.padFilter);
    harmOsc.start(startTime);
    harmOsc.stop(startTime + Math.min(0.6, durationSec * 0.45));
  }

  /** Plays a gentle, transient warm chord swell that fades in and completely out to silence */
  private triggerSoftChordBreath(chord: number[]) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.padFilter) return;
    const now = this.ctx.currentTime;
    const swellDuration = 3.2;
    // Use only 3 mid-high voices (no low frequencies that could hum)
    const voices = [chord[0], chord[2], chord[3]];
    voices.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.022, now + 1.1);
      g.gain.exponentialRampToValueAtTime(0.0001, now + swellDuration);
      osc.connect(g);
      g.connect(this.padFilter!);
      osc.start(now);
      osc.stop(now + swellDuration + 0.05);
    });
  }

  private ensureFallbackPad(): boolean {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    if (this.padGain) return true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    filter.Q.value = 0.5;

    // Highpass filter at 160 Hz to guarantee zero low-frequency hum or DC rumble
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 160;
    highpass.Q.value = 0.5;

    // Lush space echo delay network
    const delay = this.ctx.createDelay(1.0);
    delay.delayTime.value = 0.42;
    const delayFeedback = this.ctx.createGain();
    delayFeedback.gain.value = 0.28;
    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.value = 1400;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    filter.connect(highpass);
    highpass.connect(gain);

    // Wet reverb path
    highpass.connect(delay);
    delay.connect(delayFilter);
    delayFilter.connect(delayFeedback);
    delayFeedback.connect(delay);
    delayFilter.connect(gain);

    gain.connect(this.ctx.destination);

    this.padFilter = filter;
    this.padGain = gain;

    if (this.padEvolutionTimerId === null && typeof window !== 'undefined') {
      this.padEvolutionTimerId = window.setInterval(() => {
        this.evolveAmbientPadStep();
      }, 1750);
    }

    this.syncFallbackPadGain();
    this.evolveAmbientPadStep();
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

    const chords = track === 'space' ? SPACE_CHORDS : MENU_CHORDS;
    const chord = chords[this.padChordIndex % chords.length];
    const pattern = ARPEGGIO_PATTERNS[this.padChordIndex % ARPEGGIO_PATTERNS.length];

    // Trigger a soft chord breath at the start of every 4-step bar
    if (this.padNoteStep % 4 === 0) {
      this.triggerSoftChordBreath(chord);
    }

    // Play a delicate Space Piano / Celesta note from the current chord
    const noteIdx = pattern[this.padNoteStep % pattern.length];
    const baseFreq = chord[noteIdx % chord.length];
    const octaveMult = this.padNoteStep % 4 === 2 ? 2.0 : 1.0;
    this.triggerPianoCelestaNote(
      baseFreq * octaveMult,
      0,
      2.3,
      this.padNoteStep % 2 === 0 ? 1.0 : 0.76
    );

    this.padNoteStep += 1;
    if (this.padNoteStep % 4 === 0) {
      this.padChordIndex = (this.padChordIndex + 1) % chords.length;
    }
  }

  private syncFallbackPadGain() {
    if (!this.ctx || !this.padGain) return;
    const track = this.desiredTrack;
    const usePad =
      Boolean(track) &&
      this.musicState.musicEnabled &&
      !this.settings.muted &&
      this.trackAvailable[track!] !== true;

    const targetVol = usePad
      ? Math.max(0, Math.min(0.65, this.musicState.musicVolume * this.settings.masterVolume * 0.75))
      : 0;
    this.padGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.18);
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
    if (speedAbs < 0.8) return;
    this.playTone(420 + Math.min(140, speedAbs * 12), 0.024, 'sine', 0.012);
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
