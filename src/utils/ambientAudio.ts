/**
 * Synthesizes a subtle, cinematic, historical atmospheric soundscape using Web Audio API.
 * Provides a warm, low drone and archival air texture to accompany documentary narration.
 */

class AmbientSoundscape {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private isPlaying = false;

  private init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public start(volume: number = 0.15) {
    if (this.isPlaying) return;
    this.init();
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), this.ctx.currentTime + 2.5);
    this.masterGain.connect(this.ctx.destination);

    // Warm fundamental drone (A1 = 55Hz, gentle cello-like root)
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'triangle';
    this.osc1.frequency.setValueAtTime(55, this.ctx.currentTime);

    const filter1 = this.ctx.createBiquadFilter();
    filter1.type = 'lowpass';
    filter1.frequency.setValueAtTime(140, this.ctx.currentTime);

    const osc1Gain = this.ctx.createGain();
    osc1Gain.gain.setValueAtTime(0.35, this.ctx.currentTime);

    this.osc1.connect(filter1);
    filter1.connect(osc1Gain);
    osc1Gain.connect(this.masterGain);

    // Subtle 5th harmony drone (E2 = 82.4Hz)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.setValueAtTime(82.41, this.ctx.currentTime);

    const osc2Gain = this.ctx.createGain();
    osc2Gain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.osc2.connect(osc2Gain);
    osc2Gain.connect(this.masterGain);

    // Archival warmth (filtered soft pink noise)
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      output[i] = (b0 + b1 + b2) * 0.05;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(250, this.ctx.currentTime);
    noiseFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.08, this.ctx.currentTime);

    this.noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);

    this.osc1.start();
    this.osc2.start();
    this.noiseNode.start();

    this.isPlaying = true;
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.linearRampToValueAtTime(
        Math.max(0.0001, volume),
        this.ctx.currentTime + 0.1
      );
    }
  }

  public stop() {
    if (!this.isPlaying) return;
    if (this.masterGain && this.ctx) {
      const curTime = this.ctx.currentTime;
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, curTime + 1.2);
      setTimeout(() => {
        try {
          this.osc1?.stop();
          this.osc2?.stop();
          this.noiseNode?.stop();
          this.osc1?.disconnect();
          this.osc2?.disconnect();
          this.noiseNode?.disconnect();
        } catch {
          // Ignore
        }
        this.isPlaying = false;
      }, 1250);
    } else {
      this.isPlaying = false;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const ambientSoundscape = new AmbientSoundscape();
