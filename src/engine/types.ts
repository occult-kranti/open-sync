/**
 * Open Sync engine — shared session types.
 *
 * Everything in this module is pure data: no Web Audio, no DOM, no runtime
 * state. A SessionSpec fully describes a render so that the same spec always
 * produces bit-identical audio (see sequencer.ts manifest hashing).
 */

/** Entrainment synthesis mode for a phase. */
export type EntrainmentMode = 'binaural' | 'monaural' | 'isochronic';

/** Noise colors supported by the synth. */
export type NoiseColor = 'white' | 'pink' | 'brown' | 'blue' | 'violet' | 'grey';

/** Nature texture kinds. */
export type NatureKind = 'rain' | 'ocean' | 'stream' | 'fire' | 'thunder';

/** Additive noise layer. `level` is linear, 0..1 (0 = off). */
export interface NoiseSpec {
  color: NoiseColor;
  /** Linear layer level, 0..1. */
  level: number;
}

/**
 * Singing-bowl layer: FM-modulated inharmonic partials (~[1, 2.76, 5.4])
 * with exponential decay, re-struck on a configurable interval.
 */
export interface BowlSpec {
  /** Fundamental of the bowl in Hz. */
  baseHz: number;
  /** Linear layer level, 0..1. */
  level: number;
  /** Inharmonic partial ratios (default [1, 2.76, 5.4]). */
  partials?: number[];
  /** Amplitude decay time constant in seconds (default 6). */
  decaySec?: number;
  /** Re-strike interval in seconds (default: phase length, i.e. struck once). */
  restrikeSec?: number;
}

/** Procedurally generated nature texture layer. */
export interface NatureSpec {
  kind: NatureKind;
  /** Linear layer level, 0..1. */
  level: number;
}

/**
 * One entrainment phase. Carrier/beat continuity across phases is handled by
 * the sequencer via explicit phase offsets, so a ramp of beatHz values renders
 * click-free when phases are crossfaded.
 */
export interface Phase {
  /** Length of the phase in seconds. May be 0 (renders as empty). */
  durationSec: number;
  /** Sine carrier frequency in Hz (left channel for binaural). */
  carrierHz: number;
  /**
   * Beat / modulation frequency in Hz.
   * - binaural: right channel = carrierHz + beatHz
   * - monaural: full-depth AM at beatHz on both channels
   * - isochronic: raised-cosine gate at beatHz
   */
  beatHz: number;
  mode: EntrainmentMode;
  /** Phase gain in dB applied to the mixed phase (0 = unity). */
  gainDb: number;
  noise?: NoiseSpec;
  bowl?: BowlSpec;
  nature?: NatureSpec;
}

/** Breath-cue overlay: sine sweep markers at each breath transition. */
export interface BreathSpec {
  inhaleSec: number;
  holdSec: number;
  exhaleSec: number;
  /** Optional second hold (after exhale). Default 0. */
  holdAfterExhaleSec?: number;
  /** Linear cue level, 0..1 (default 0.15). */
  level?: number;
  /** Sweep start frequency in Hz (default 320). */
  baseHz?: number;
  /** Sweep end frequency in Hz (default 480). */
  topHz?: number;
}

/** A complete, reproducible session description. */
export interface SessionSpec {
  name?: string;
  /** Render sample rate (default 48000). */
  sampleRate?: number;
  /** Crossfade between adjacent phases in seconds (default 2). */
  crossfadeSec?: number;
  /** Master gain in dB applied before final normalization (default 0). */
  masterGainDb?: number;
  /** PRNG seed for noise/bowl/nature layers (default 0x1a2b3c4d). */
  seed?: number;
  phases: Phase[];
  breath?: BreathSpec;
}

/** Stereo buffer pair returned by all pure renderers. */
export interface StereoBuffer {
  left: Float32Array;
  right: Float32Array;
}

/** Result of rendering a single phase or layer. */
export interface RenderResult extends StereoBuffer {
  /** Human-readable guardrail warnings (never thrown for bad input). */
  warnings: string[];
}

/** Tone-phase continuation state for click-free phase chaining. */
export interface PhaseOffsets {
  /** Radians, left/mono carrier phase at the start of the next buffer. */
  left: number;
  /** Radians, right carrier phase at the start of the next buffer. */
  right: number;
  /** Beat/LFO phase (radians) at the start of the next buffer. */
  beat: number;
}

/** Full result of a multi-phase session render. */
export interface SessionRenderResult extends StereoBuffer {
  warnings: string[];
  manifest: SessionManifest;
}

/** Reproducibility manifest: captures the full spec plus render statistics. */
export interface SessionManifest {
  /** Manifest format version. */
  version: 1;
  name: string;
  sampleRate: number;
  /** Canonical (sorted-key) JSON of the input spec. */
  specJson: string;
  /** FNV-1a 32-bit hash of specJson + sampleRate, hex-encoded. */
  hash: string;
  phaseCount: number;
  totalDurationSec: number;
  totalSamples: number;
  /** Peak absolute sample value after normalization (<= 1). */
  peak: number;
  warnings: string[];
}
