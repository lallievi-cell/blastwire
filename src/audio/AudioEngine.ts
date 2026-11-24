import * as Tone from 'tone';
import type { WireModuleId } from '../types/game';

export class AudioEngine {
  private ready = false;
  private muted: boolean;
  private clickSynth: Tone.Synth | null = null;
  private blastSynth: Tone.MembraneSynth | null = null;
  private crunchNoise: Tone.NoiseSynth | null = null;
  private harmonicSynth: Tone.PolySynth | null = null;
  private chordSynth: Tone.PolySynth | null = null;
  private droneOsc: Tone.Oscillator | null = null;
  private droneFilter: Tone.Filter | null = null;
  private droneGain: Tone.Gain | null = null;

  constructor(initialMuted = false) {
    this.muted = initialMuted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(next: boolean): void {
    this.muted = next;
    if (this.droneGain) {
      this.droneGain.gain.rampTo(this.muted ? 0 : 0.0001, 0.15);
    }
  }

  async init(): Promise<void> {
    if (this.ready) {
      try {
        if (Tone.getContext().state !== 'running') {
          await Tone.start();
        }
      } catch {
        // Ignore autoplay restrictions until next user gesture
      }
      return;
    }

    try {
      await Tone.start();

      this.clickSynth = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.002, decay: 0.048, sustain: 0, release: 0.035 },
      }).toDestination();
      this.clickSynth.volume.value = -13;

      this.blastSynth = new Tone.MembraneSynth({
        pitchDecay: 0.085,
        octaves: 5.5,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.003, decay: 0.34, sustain: 0.02, release: 0.25 },
      }).toDestination();
      this.blastSynth.volume.value = -5;

      const noiseFilter = new Tone.Filter(980, 'bandpass').toDestination();
      this.crunchNoise = new Tone.NoiseSynth({
        noise: { type: 'brown' },
        envelope: { attack: 0.004, decay: 0.15, sustain: 0, release: 0.07 },
      }).connect(noiseFilter);
      this.crunchNoise.volume.value = -10;

      this.harmonicSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.004, decay: 0.12, sustain: 0.02, release: 0.1 },
      }).toDestination();
      this.harmonicSynth.volume.value = -16;

      this.chordSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.014, decay: 0.2, sustain: 0.14, release: 0.45 },
      }).toDestination();
      this.chordSynth.volume.value = -11;

      // Subtle adaptive industrial tension drone when mines are armed
      this.droneFilter = new Tone.Filter(95, 'lowpass');
      this.droneGain = new Tone.Gain(0).toDestination();
      this.droneFilter.connect(this.droneGain);
      this.droneOsc = new Tone.Oscillator(55, 'sawtooth').connect(this.droneFilter);
      this.droneOsc.start();

      this.ready = true;
    } catch {
      // Audio optional fallback
    }
  }

  /** Smoothly adjusts atmospheric tension drone based on armed charges (0 = silent). */
  setTensionLevel(wiredCount: number, isDetonating = false): void {
    if (!this.ready || !this.droneGain || !this.droneFilter) return;
    if (this.muted || isDetonating || wiredCount <= 0) {
      this.droneGain.gain.rampTo(0, 0.2);
      return;
    }
    const level = Math.min(5, wiredCount);
    const targetGain = 0.012 + level * 0.0055;
    const targetFreq = 95 + level * 42;
    this.droneGain.gain.rampTo(targetGain, 0.35);
    this.droneFilter.frequency.rampTo(targetFreq, 0.35);
  }

  playReveal(big = false): void {
    if (this.muted || !this.ready || !this.clickSynth) return;
    try {
      this.clickSynth.triggerAttackRelease(big ? 560 : 400, '32n');
      if (big) {
        setTimeout(() => {
          if (!this.muted && this.ready && this.clickSynth) {
            this.clickSynth.triggerAttackRelease(740, '32n');
          }
        }, 45);
      }
    } catch {
      // no-op
    }
  }

  playWire(type: WireModuleId | 'pin' | 'unwire' | 'buy'): void {
    try {
      if (navigator.vibrate) navigator.vibrate(type === 'unwire' ? 8 : 14);
    } catch {
      // no-op
    }
    if (this.muted || !this.ready || !this.clickSynth) return;
    try {
      const notes: Record<string, string> = {
        c4: 'C5',
        arc: 'E5',
        cross: 'G5',
        amp: 'A5',
        prism: 'B5',
        siphon: 'D5',
        pin: 'D4',
        unwire: 'A3',
        buy: 'F5',
      };
      this.clickSynth.triggerAttackRelease(notes[type] || 'D5', '16n');
    } catch {
      // no-op
    }
  }

  playCrystal(): void {
    if (this.muted || !this.ready || !this.chordSynth) return;
    try {
      this.chordSynth.triggerAttackRelease(['A5', 'E6'], '16n');
    } catch {
      // no-op
    }
  }

  playSonar(): void {
    if (this.muted || !this.ready || !this.chordSynth) return;
    try {
      this.chordSynth.triggerAttackRelease(['G5', 'D6'], '8n');
    } catch {
      // no-op
    }
  }

  playBlast(chainIdx: number, heavy = false): void {
    try {
      if (navigator.vibrate && (chainIdx === 0 || heavy)) {
        navigator.vibrate(heavy ? [18, 22, 40] : [14, 22]);
      }
    } catch {
      // no-op
    }
    if (this.muted || !this.ready || !this.blastSynth || !this.crunchNoise || !this.harmonicSynth) {
      return;
    }
    try {
      const pitch = Math.min(200, (heavy ? 52 : 64) + chainIdx * 13);
      this.blastSynth.triggerAttackRelease(pitch, heavy ? '4n' : '8n');
      this.crunchNoise.triggerAttackRelease(heavy ? '8n' : '16n');
      const scale = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6'];
      const note = scale[Math.min(scale.length - 1, chainIdx)];
      this.harmonicSynth.triggerAttackRelease(heavy ? [note, 'C5'] : [note], '16n');
    } catch {
      // no-op
    }
  }

  playBeam(style: 'arc' | 'prism' | 'cross' | 'omega'): void {
    if (this.muted || !this.ready || !this.harmonicSynth) return;
    try {
      if (style === 'prism') {
        this.harmonicSynth.triggerAttackRelease(['G5', 'D6', 'A6'], '16n');
      } else if (style === 'arc') {
        this.harmonicSynth.triggerAttackRelease(['E5', 'B5', 'E6'], '16n');
      } else {
        this.harmonicSynth.triggerAttackRelease(['C4', 'G4'], '16n');
      }
    } catch {
      // no-op
    }
  }

  playArmorSlam(): void {
    if (this.muted || !this.ready || !this.blastSynth) return;
    try {
      this.blastSynth.triggerAttackRelease(48, '16n');
    } catch {
      // no-op
    }
  }

  playRelicPop(): void {
    if (this.muted || !this.ready || !this.clickSynth) return;
    try {
      this.clickSynth.triggerAttackRelease('A5', '32n');
    } catch {
      // no-op
    }
  }

  playDud(): void {
    try {
      if (navigator.vibrate) navigator.vibrate([30, 35, 45]);
    } catch {
      // no-op
    }
    if (this.muted || !this.ready || !this.harmonicSynth) return;
    try {
      this.harmonicSynth.triggerAttackRelease(['Eb2', 'D2'], '8n');
    } catch {
      // no-op
    }
  }

  playWin(): void {
    if (this.muted || !this.ready || !this.chordSynth) return;
    try {
      const now = Tone.now();
      this.chordSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '8n', now);
      this.chordSynth.triggerAttackRelease(['D4', 'F#4', 'A4'], '8n', now + 0.12);
      this.chordSynth.triggerAttackRelease(['E4', 'G4', 'B4', 'E5'], '4n', now + 0.24);
    } catch {
      // no-op
    }
  }

  playFail(): void {
    if (this.muted || !this.ready || !this.chordSynth) return;
    try {
      const now = Tone.now();
      this.chordSynth.triggerAttackRelease(['C3', 'Eb3', 'G3'], '4n', now);
      this.chordSynth.triggerAttackRelease(['B2', 'D3', 'F3'], '2n', now + 0.2);
    } catch {
      // no-op
    }
  }
}
