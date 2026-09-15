/**
 * Live Web Audio engine bridge (UI layer).
 *
 * The engine package (src/engine) provides pure, deterministic offline
 * renderers plus a buffer-oriented SessionPlayer — it has no real-time node
 * graph and no AnalyserNode tap. This adapter builds the live front-panel
 * graph (oscillators + engine-rendered noise/bowl/nature loops + analysers)
 * so the Studio visualizer and Analyzer can run at 60 fps from real meter
 * data. WAV export and preset rendering still go through the pure engine.
 */

import {
  dbToLin,
  isochronicGate,
  renderBowl,
  renderNature,
  renderNoise,
  type EntrainmentMode,
  type NatureKind,
  type NoiseColor,
} from '@/engine';

export type Waveform = 'sine' | 'triangle' | 'square';
export type GateShape = 'raised-cosine' | 'hard';

export interface LiveEngineConfig {
  mode: EntrainmentMode;
  carrierHz: number;
  beatHz: number;
  waveform: Waveform;
  gateDuty: number; // 0..1
  gateShape: GateShape;
}

const NOISE_COLORS: NoiseColor[] = ['white', 'pink', 'brown', 'blue', 'violet', 'grey'];
/** Engine noise layers are scaled by 0.25 × level — mirror that here. */
const NOISE_SCALE = 0.25;

function resolveCtx(): AudioContext | null {
  const g = globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  const Ctor = g.AudioContext ?? g.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export class LiveEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;
  private oscL: OscillatorNode | null = null;
  private oscR: OscillatorNode | null = null;
  private gL: GainNode | null = null;
  private gR: GainNode | null = null;
  private gateGain: GainNode | null = null;
  private gateSrc: AudioBufferSourceNode | null = null;
  private anaSpectrum: AnalyserNode | null = null;
  private anaL: AnalyserNode | null = null;
  private anaR: AnalyserNode | null = null;
  /** Section buses: noise colors and nature/bowl layers each sum into their
   * own gain stage before the main bus, so the Studio's master bypass
   * toggles can ramp a whole section to true 0 without stopping sources. */
  private noiseBus: GainNode | null = null;
  private layerBus: GainNode | null = null;
  private noiseBypassed = false;
  private layersBypassed = false;
  private noiseNodes = new Map<NoiseColor, { src: AudioBufferSourceNode; gain: GainNode }>();
  private noiseBuffers = new Map<NoiseColor, AudioBuffer>();
  private layerNodes: { nature?: AudioBufferSourceNode; bowl?: AudioBufferSourceNode } = {};
  /** One-shot preview sources (playBuffer) so panic/stop can cut them too. */
  private previewSrcs = new Set<AudioBufferSourceNode>();
  private running = false;
  private paused = false;
  private config: LiveEngineConfig = {
    mode: 'binaural',
    carrierHz: 200,
    beatHz: 10,
    waveform: 'sine',
    gateDuty: 0.5,
    gateShape: 'raised-cosine',
  };
  private outDb = -12;
  private muted = false;

  get isRunning(): boolean {
    return this.running;
  }

  get isPaused(): boolean {
    return this.paused;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  get sampleRate(): number {
    return this.ctx?.sampleRate ?? 48000;
  }

  private ensureGraph(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const ctx = resolveCtx();
    if (!ctx) return null;
    this.ctx = ctx;
    this.bus = ctx.createGain();
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.anaSpectrum = ctx.createAnalyser();
    this.anaSpectrum.fftSize = 4096;
    this.anaSpectrum.smoothingTimeConstant = 0.6;
    this.bus.connect(this.master);
    this.master.connect(this.anaSpectrum);
    this.anaSpectrum.connect(ctx.destination);
    // Section buses (start at the current bypass state — set at graph build,
    // before any source flows, so this is not an audible step).
    this.noiseBus = ctx.createGain();
    this.noiseBus.gain.value = this.noiseBypassed ? 0 : 1;
    this.noiseBus.connect(this.bus);
    this.layerBus = ctx.createGain();
    this.layerBus.gain.value = this.layersBypassed ? 0 : 1;
    this.layerBus.connect(this.bus);
    const splitter = ctx.createChannelSplitter(2);
    this.master.connect(splitter);
    this.anaL = ctx.createAnalyser();
    this.anaR = ctx.createAnalyser();
    this.anaL.fftSize = 2048;
    this.anaR.fftSize = 2048;
    this.anaL.smoothingTimeConstant = 0;
    this.anaR.smoothingTimeConstant = 0;
    splitter.connect(this.anaL, 0);
    splitter.connect(this.anaR, 1);
    return ctx;
  }

  /** Analysers for canvas scopes; null before first start (no AudioContext yet). */
  analysers(): { spectrum: AnalyserNode; left: AnalyserNode; right: AnalyserNode } | null {
    if (!this.anaSpectrum || !this.anaL || !this.anaR) return null;
    return { spectrum: this.anaSpectrum, left: this.anaL, right: this.anaR };
  }

  /** Rebuild the tone chain for the current config (called on mode/waveform change). */
  private buildTone(): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    this.teardownTone();
    const { mode, carrierHz, beatHz, waveform } = this.config;
    this.merger = ctx.createChannelMerger(2);
    this.merger.connect(this.bus);
    this.gL = ctx.createGain();
    this.gR = ctx.createGain();
    this.gL.connect(this.merger, 0, 0);
    this.gR.connect(this.merger, 0, 1);

    const mkOsc = (freq: number): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = waveform;
      o.frequency.value = freq;
      return o;
    };

    if (mode === 'binaural') {
      this.oscL = mkOsc(carrierHz);
      this.oscR = mkOsc(carrierHz + beatHz);
      this.gL.gain.value = 0.5;
      this.gR.gain.value = 0.5;
      this.oscL.connect(this.gL);
      this.oscR.connect(this.gR);
      this.oscL.start();
      this.oscR.start();
    } else if (mode === 'monaural') {
      // Both tones summed acoustically into both ears (half level each).
      this.oscL = mkOsc(carrierHz);
      this.oscR = mkOsc(carrierHz + beatHz);
      this.gL.gain.value = 0.5;
      this.gR.gain.value = 0.5;
      this.oscL.connect(this.gL);
      this.oscL.connect(this.gR);
      this.oscR.connect(this.gL);
      this.oscR.connect(this.gR);
      this.oscL.start();
      this.oscR.start();
    } else {
      // Isochronic: single carrier, both channels, gated by a looped envelope.
      this.oscL = mkOsc(carrierHz);
      this.gateGain = ctx.createGain();
      this.gateGain.gain.value = 0;
      this.gateSrc = ctx.createBufferSource();
      this.gateSrc.buffer = this.renderGateBuffer(beatHz, this.config.gateDuty, this.config.gateShape);
      this.gateSrc.loop = true;
      this.gateSrc.connect(this.gateGain.gain as unknown as AudioNode);
      this.oscL.connect(this.gateGain);
      this.gateGain.connect(this.gL);
      this.gateGain.connect(this.gR);
      this.gL.gain.value = 0.7;
      this.gR.gain.value = 0.7;
      this.oscL.start();
      this.gateSrc.start();
    }
  }

  /** One period-accurate gate envelope loop: N whole cycles in ~1 s. */
  private renderGateBuffer(beatHz: number, duty: number, shape: GateShape): AudioBuffer {
    const ctx = this.ctx!;
    const sr = ctx.sampleRate;
    const cycles = Math.max(1, Math.round(beatHz));
    const len = Math.max(64, Math.round((cycles / Math.max(0.05, beatHz)) * sr));
    const buf = ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const cyclePhase = (i / len) * cycles;
      const p = cyclePhase - Math.floor(cyclePhase);
      data[i] = shape === 'hard' ? (p < duty ? 1 : 0) : isochronicGate(p, duty);
    }
    return buf;
  }

  private teardownTone(): void {
    for (const n of [this.oscL, this.oscR, this.gateSrc]) {
      if (n) {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
        n.disconnect();
      }
    }
    this.gateGain?.disconnect();
    this.gL?.disconnect();
    this.gR?.disconnect();
    this.merger?.disconnect();
    this.oscL = this.oscR = null;
    this.gateSrc = null;
    this.gateGain = null;
    this.gL = this.gR = null;
    this.merger = null;
  }

  start(): boolean {
    const ctx = this.ensureGraph();
    if (!ctx) return false;
    if (ctx.state === 'suspended') void ctx.resume();
    if (!this.running) {
      this.buildTone();
      this.running = true;
    }
    this.applyMasterGain(0.05);
    return true;
  }

  /** Gentle stop with a short fade (normal stop path). */
  stop(fadeSec = 0.15): void {
    this.paused = false;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + fadeSec);
    this.running = false;
    window.setTimeout(() => this.teardownTone(), fadeSec * 1000 + 60);
  }

  /**
   * Pause: ramp master to 0 over 50 ms (no click), then suspend the
   * AudioContext so its clock — and every oscillator/gate/noise phase
   * accumulator — freezes in place (player.ts pause semantics applied to the
   * live graph: the position is retained, not rebuilt). Resume continues the
   * frozen phases, so there is no phase jump. No-op when not running.
   */
  pause(): void {
    if (!this.ctx || !this.master || !this.running || this.paused) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.05);
    this.paused = true;
    const ctx = this.ctx;
    // Suspend only after the fade has landed, and only if still paused
    // (stop()/panic()/resume() clear `paused` first, cancelling this).
    window.setTimeout(() => {
      if (this.paused && ctx.state === 'running') void ctx.suspend();
    }, 90);
  }

  /**
   * Resume from pause: unfreeze the context clock (all phases continue from
   * the suspended accumulator) and ramp master back over 150 ms. No-op when
   * not paused.
   */
  resume(): void {
    if (!this.ctx || !this.master || !this.paused) return;
    this.paused = false;
    void this.ctx.resume();
    const t = this.ctx.currentTime;
    const target = this.muted ? 0 : dbToLin(this.outDb);
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(target, t + 0.15);
  }

  /** Panic: hard mute at 0 ms — no fade (safety.md: fades are how people get hurt). */
  panic(): void {
    this.paused = false;
    // Previews bypass the master bus (they connect to destination directly),
    // so panic must cut them explicitly — panic silences EVERYTHING.
    this.stopPreviews();
    if (!this.ctx || !this.master) return;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.value = 0;
    this.running = false;
    this.teardownTone();
  }

  /** Hard-stop all one-shot preview buffers (second tap / panic / new preview). */
  stopPreviews(): void {
    for (const src of this.previewSrcs) {
      try {
        src.onended = null;
        src.stop();
      } catch {
        /* already stopped */
      }
      src.disconnect();
    }
    this.previewSrcs.clear();
  }

  /** Resume after panic at −12 dB below previous level, ramped 2 s. */
  resumeSafely(): number {
    this.outDb = Math.max(-60, this.outDb - 12);
    this.start();
    if (this.ctx && this.master) {
      const t = this.ctx.currentTime;
      const target = this.muted ? 0 : dbToLin(this.outDb);
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(0, t);
      this.master.gain.linearRampToValueAtTime(target, t + 2);
    }
    return this.outDb;
  }

  private applyMasterGain(rampSec = 0.05): void {
    if (!this.ctx || !this.master) return;
    const target = this.muted ? 0 : dbToLin(this.outDb);
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(target, t + rampSec);
  }

  setOutputDb(db: number): void {
    this.outDb = Math.max(-60, Math.min(0, db));
    if (this.running) this.applyMasterGain();
  }

  getOutputDb(): number {
    return this.outDb;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyMasterGain(0.02);
  }

  /** Live-update config. Rebuilds the tone chain only when structure changes. */
  updateConfig(next: Partial<LiveEngineConfig>): void {
    const prev = this.config;
    this.config = { ...prev, ...next };
    if (!this.running || !this.ctx) return;
    const structural =
      prev.mode !== this.config.mode || prev.waveform !== this.config.waveform;
    if (structural) {
      this.buildTone();
      return;
    }
    const { mode, carrierHz, beatHz } = this.config;
    if (mode === 'binaural' && this.oscL && this.oscR) {
      this.oscL.frequency.value = carrierHz;
      this.oscR.frequency.value = carrierHz + beatHz;
    } else if (mode === 'monaural' && this.oscL && this.oscR) {
      this.oscL.frequency.value = carrierHz;
      this.oscR.frequency.value = carrierHz + beatHz;
    } else if (mode === 'isochronic' && this.oscL) {
      this.oscL.frequency.value = carrierHz;
      if (prev.beatHz !== beatHz || prev.gateDuty !== this.config.gateDuty || prev.gateShape !== this.config.gateShape) {
        // Swap the gate loop for the new rate/shape.
        if (this.gateSrc) {
          const old = this.gateSrc;
          const src = this.ctx.createBufferSource();
          src.buffer = this.renderGateBuffer(beatHz, this.config.gateDuty, this.config.gateShape);
          src.loop = true;
          if (this.gateGain) src.connect(this.gateGain.gain as unknown as AudioNode);
          src.start();
          this.gateSrc = src;
          try {
            old.stop(this.ctx.currentTime + 0.02);
          } catch {
            /* noop */
          }
          old.disconnect();
        }
      }
    }
  }

  /**
   * Click-free master bypass for a whole section (noise mixer / nature+bowl
   * layers): ramps the section bus with a 50 ms time constant. No
   * gain.value step, no source stop/start — toggling mid-session cannot
   * click, and re-enable is phase-continuous (buffers keep looping).
   */
  private rampSection(section: GainNode | null, on: boolean): void {
    if (!this.ctx || !section) return;
    section.gain.setTargetAtTime(on ? 1 : 0, this.ctx.currentTime, 0.05);
  }

  /** Bypass (false) or enable (true) the noise mixer section. */
  setNoiseBypass(on: boolean): void {
    this.noiseBypassed = !on;
    this.rampSection(this.noiseBus, on);
  }

  /** Bypass (false) or enable (true) the nature/bowl layers section. */
  setLayersBypass(on: boolean): void {
    this.layersBypassed = !on;
    this.rampSection(this.layerBus, on);
  }

  /** Set one noise color's level in dB (−Infinity = off). Loops an engine-rendered buffer. */
  setNoiseLevel(color: NoiseColor, db: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    const existing = this.noiseNodes.get(color);
    if (!Number.isFinite(db)) {
      if (existing) {
        try {
          existing.src.stop();
        } catch {
          /* noop */
        }
        existing.src.disconnect();
        existing.gain.disconnect();
        this.noiseNodes.delete(color);
      }
      return;
    }
    if (!existing) {
      let buffer = this.noiseBuffers.get(color);
      if (!buffer) {
        const data = renderNoise(color, 8, ctx.sampleRate);
        buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
        buffer.getChannelData(0).set(data);
        this.noiseBuffers.set(color, buffer);
      }
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = dbToLin(db) * NOISE_SCALE;
      src.connect(gain);
      gain.connect(this.noiseBus ?? this.bus);
      src.start();
      this.noiseNodes.set(color, { src, gain });
    } else {
      existing.gain.gain.setTargetAtTime(dbToLin(db) * NOISE_SCALE, ctx.currentTime, 0.05);
    }
  }

  /**
   * Play a rendered stereo buffer once, straight to the output (preview tones).
   * Sources are tracked so stopPreviews()/panic() can cut them; `onEnded`
   * fires on natural completion (never on a manual stop).
   */
  playBuffer(left: Float32Array, right: Float32Array, sampleRate: number, db = -18, onEnded?: () => void): boolean {
    const ctx = this.ensureGraph();
    if (!ctx || !this.bus) return false;
    if (ctx.state === 'suspended') void ctx.resume();
    const frames = Math.min(left.length, right.length);
    if (frames === 0) return false;
    const buffer = ctx.createBuffer(2, frames, sampleRate);
    buffer.getChannelData(0).set(left.subarray(0, frames));
    buffer.getChannelData(1).set(right.subarray(0, frames));
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.onended = () => {
      this.previewSrcs.delete(src);
      src.disconnect();
      onEnded?.();
    };
    const gain = ctx.createGain();
    gain.gain.value = dbToLin(db);
    src.connect(gain);
    // Route previews straight to the output so they are audible even when the
    // session engine is stopped (master gain is 0 while stopped).
    gain.connect(ctx.destination);
    this.previewSrcs.add(src);
    src.start();
    return true;
  }

  /** Nature texture layer (engine-rendered loop). kind null = off. */
  setNature(kind: NatureKind | null, db: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    if (this.layerNodes.nature) {
      try {
        this.layerNodes.nature.stop();
      } catch {
        /* noop */
      }
      this.layerNodes.nature.disconnect();
      this.layerNodes.nature = undefined;
    }
    if (!kind || !Number.isFinite(db)) return;
    const data = renderNature(kind, 12, ctx.sampleRate);
    const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buffer.getChannelData(0).set(data);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = dbToLin(db) * 0.5;
    src.connect(gain);
    gain.connect(this.bus);
    src.start();
    this.layerNodes.nature = src;
  }

  /** Singing-bowl layer (engine-rendered loop). enabled false = off. */
  setBowl(enabled: boolean, baseHz: number, db: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.bus) return;
    if (this.layerNodes.bowl) {
      try {
        this.layerNodes.bowl.stop();
      } catch {
        /* noop */
      }
      this.layerNodes.bowl.disconnect();
      this.layerNodes.bowl = undefined;
    }
    if (!enabled || !Number.isFinite(db)) return;
    const data = renderBowl({ baseHz, level: 1, restrikeSec: 8 }, 8, ctx.sampleRate);
    const buffer = ctx.createBuffer(1, data.length, ctx.sampleRate);
    buffer.getChannelData(0).set(data);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    gain.gain.value = dbToLin(db) * 0.5;
    src.connect(gain);
    gain.connect(this.bus);
    src.start();
    this.layerNodes.bowl = src;
  }
}

export const LIVE_NOISE_COLORS = NOISE_COLORS;
