/**
 * Sample Lab analysis engine — PURE, node-testable DSP. No DOM, no Web Audio:
 * the page decodes files with `AudioContext.decodeAudioData` and hands plain
 * Float32Array channels in here. Everything below also runs under vitest.
 *
 * Modules (monroe_structure_and_samplelab_spec.md Part 3):
 *   3.0 chunked/cancellable STFT spectrogram (2048 window, 75% hop by default)
 *   3.1 per-frame spectral centroid / spread / rolloff85 / flux / flatness
 *   3.2 ANSI octave-band energy histogram
 *   3.3 onset envelope (spectral flux) + ACF tempo estimate
 *   3.4 mid/side energy, inter-channel correlation, binaural-beat construction
 *       detection (carrier offset between L/R, Δf from the L·R product spectrum)
 *   3.5 LUFS-over-time (reuses src/dsp/loudness.ts verbatim)
 *   3.7 YIN-lite pitch track → nearest note / cents
 *   3.8 loop detector via log-band fingerprint self-similarity
 *
 * Advisor constraint (AC): this module detects modulation PATTERNS only.
 * Nothing here measures, predicts, or validates any effect on a listener.
 */

import { fftInPlace, hannWindow, nextPow2 } from '@/dsp/fft';
import { analyzeLoudness, type LoudnessResult } from '@/dsp/loudness';

// ---------------------------------------------------------------- utilities

/** Thrown (as a promise rejection) when an AbortSignal cancels the run. */
export class AnalysisCancelled extends Error {
  constructor() {
    super('Sample Lab analysis cancelled');
    this.name = 'AnalysisCancelled';
  }
}

export interface AudioData {
  /** Per-channel PCM, float in [-1, 1]. 1 = mono, 2 = stereo. */
  channels: Float32Array[];
  sampleRate: number;
}

export interface AnalysisOptions {
  signal?: AbortSignal;
  /** Progress callback: fraction in [0,1] plus a short stage label. */
  onProgress?: (fraction: number, stage: string) => void;
  /** Cap on STFT/spectrogram frames; hop widens to cover long files. */
  maxStftFrames?: number;
  /** Cap on YIN pitch frames for very long files. */
  maxPitchFrames?: number;
}

const EPS = 1e-12;
const DB_FLOOR = -120;

/** Yield to the event loop so the UI thread stays responsive between chunks. */
function yieldTo(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

function checkCancel(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AnalysisCancelled();
}

/**
 * Defensive copy: replaces NaN/±Infinity samples with 0 (a corrupted decode
 * must never poison the whole report). Returns the number of replaced samples.
 */
export function sanitizeChannel(x: Float32Array): { clean: Float32Array; replaced: number } {
  let replaced = 0;
  const clean = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    if (Number.isFinite(v)) clean[i] = v;
    else {
      clean[i] = 0;
      replaced++;
    }
  }
  return { clean, replaced };
}

/** Equal-power mono mix of all channels. */
export function monoMix(channels: Float32Array[]): Float32Array {
  const n = channels[0]?.length ?? 0;
  const out = new Float32Array(n);
  const g = 1 / Math.max(1, channels.length);
  for (const ch of channels) {
    for (let i = 0; i < n; i++) out[i] += ch[i] * g;
  }
  return out;
}

// ------------------------------------------------------------- 3.0 STFT

export interface SpectrogramResult {
  windowSize: number;
  hopSamples: number;
  frames: number;
  /** One-sided bins (windowSize/2 + 1). */
  bins: number;
  binHz: number;
  /** Frames per second. */
  frameRate: number;
  /** Center time of each frame (s). */
  timesSec: Float32Array;
  /** Row-major [frames × bins] power in dB, 0 dB ≈ full-scale sine bin peak. */
  powerDb: Float32Array;
  /** Linear power companion (frames × bins), used by stats/bands/loop. */
  power: Float32Array;
}

export interface StftFrameSink {
  /** Called per frame with the linear power spectrum and frame index. */
  onFrame?: (power: Float32Array, frame: number) => void;
}

/**
 * Chunked, cancellable STFT. Default recipe: 2048 window / 512 hop (75%
 * overlap, Hann). When the file would exceed `maxFrames`, the hop widens so
 * windows still tile the whole file (display-grade time grid).
 */
export async function computeStft(
  x: Float32Array,
  sampleRate: number,
  opts: { windowSize?: number; hopSamples?: number; maxFrames?: number; signal?: AbortSignal } & StftFrameSink = {},
): Promise<SpectrogramResult> {
  const N = opts.windowSize ?? 2048;
  const maxFrames = Math.max(4, opts.maxFrames ?? 2048);
  const n = x.length;
  let hop = opts.hopSamples ?? Math.max(1, N >> 2);
  if (n > N) {
    const natural = 1 + Math.floor((n - N) / hop);
    if (natural > maxFrames) hop = Math.ceil((n - N) / (maxFrames - 1));
  }
  const frames = n >= N ? 1 + Math.floor((n - N) / hop) : 0;
  const bins = N / 2 + 1;
  const win = hannWindow(N);
  let winSum = 0;
  for (let i = 0; i < N; i++) winSum += win[i];
  const scale = 2 / Math.max(EPS, winSum); // sine of amplitude A peaks at ~A

  const powerDb = new Float32Array(frames * bins);
  const power = new Float32Array(frames * bins);
  const timesSec = new Float32Array(frames);
  const re = new Float32Array(N);
  const im = new Float32Array(N);

  const CHUNK = 256;
  for (let f = 0; f < frames; f++) {
    const off = f * hop;
    for (let i = 0; i < N; i++) {
      re[i] = (off + i < n ? x[off + i] : 0) * win[i];
      im[i] = 0;
    }
    fftInPlace(re, im, false);
    const row = f * bins;
    for (let k = 0; k < bins; k++) {
      const p = (re[k] * re[k] + im[k] * im[k]) * scale * scale;
      power[row + k] = p;
      const db = 10 * Math.log10(Math.max(p, Math.pow(10, DB_FLOOR / 10)));
      powerDb[row + k] = Math.max(DB_FLOOR, db);
    }
    timesSec[f] = (off + N / 2) / sampleRate;
    opts.onFrame?.(power.subarray(row, row + bins), f);
    if (f % CHUNK === CHUNK - 1) {
      checkCancel(opts.signal);
      await yieldTo();
    }
  }
  checkCancel(opts.signal);
  return {
    windowSize: N,
    hopSamples: hop,
    frames,
    bins,
    binHz: sampleRate / N,
    frameRate: sampleRate / hop,
    timesSec,
    powerDb,
    power,
  };
}

// ------------------------------------------- 3.1 spectral stats per frame

export interface SpectralStats {
  timesSec: Float32Array;
  centroidHz: Float32Array;
  spreadHz: Float32Array;
  rolloff85Hz: Float32Array;
  /** Positive-only spectral flux, per frame (drives onset detection). */
  flux: Float32Array;
  /** Flatness of a lightly time-smoothed spectrum (0 tone-like … ~1 noise). */
  flatness: Float32Array;
}

/**
 * Centroid / spread / rolloff85 / flux / flatness from an existing STFT.
 * Flatness is computed on an exponential moving average of power (α = 1/8)
 * across frames: raw periodogram bins of white noise are exponentially
 * distributed (flatness ≈ e^−γ ≈ 0.56), so the smoothed variant is what
 * actually separates "tone" (→0) from "hiss" (→1) as the spec promises.
 */
export function spectralStats(spec: SpectrogramResult, sampleRate: number): SpectralStats {
  const { frames, bins, power, binHz, timesSec } = spec;
  const centroidHz = new Float32Array(frames);
  const spreadHz = new Float32Array(frames);
  const rolloff85Hz = new Float32Array(frames);
  const flux = new Float32Array(frames);
  const flatness = new Float32Array(frames);
  const smooth = new Float32Array(bins);
  const ALPHA = 0.125;
  const nyquist = sampleRate / 2;

  for (let f = 0; f < frames; f++) {
    const row = f * bins;
    let total = 0;
    for (let k = 0; k < bins; k++) total += power[row + k];
    if (!(total > EPS)) {
      // silent frame: defined, neutral values (no NaN propagation)
      continue;
    }
    let c = 0;
    for (let k = 1; k < bins; k++) c += k * binHz * power[row + k];
    c /= total;
    let s = 0;
    for (let k = 1; k < bins; k++) {
      const d = k * binHz - c;
      s += d * d * power[row + k];
    }
    s = Math.sqrt(s / total);
    let cum = 0;
    let roll = nyquist;
    for (let k = 0; k < bins; k++) {
      cum += power[row + k];
      if (cum >= 0.85 * total) {
        roll = k * binHz;
        break;
      }
    }
    if (f > 0) {
      const prev = row - bins;
      let fl = 0;
      for (let k = 0; k < bins; k++) {
        const d = power[row + k] - power[prev + k];
        if (d > 0) fl += d;
      }
      flux[f] = fl;
    }
    let logSum = 0;
    let arith = 0;
    for (let k = 1; k < bins; k++) {
      smooth[k] = (1 - ALPHA) * smooth[k] + ALPHA * power[row + k];
      logSum += Math.log(smooth[k] + EPS);
      arith += smooth[k];
    }
    const geo = Math.exp(logSum / (bins - 1));
    flatness[f] = arith > EPS ? Math.min(1, geo / (arith / (bins - 1))) : 0;
    centroidHz[f] = c;
    spreadHz[f] = s;
    rolloff85Hz[f] = roll;
  }
  return { timesSec, centroidHz, spreadHz, rolloff85Hz, flux, flatness };
}

// ------------------------------------------------ 3.2 octave-band energy

/** ANSI octave band centers (Hz). */
export const OCTAVE_CENTERS = [31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000, 16000] as const;

export interface BandEnergyResult {
  centersHz: number[];
  labels: string[];
  /** Mean band power in dB (0 dB ≈ full-scale sine energy in one band). */
  db: number[];
  /** Fraction of total spectral energy per band (sums to ~1). */
  share: number[];
}

export function octaveBandEnergies(spec: SpectrogramResult, sampleRate: number): BandEnergyResult {
  const nyquist = sampleRate / 2;
  const centers = OCTAVE_CENTERS.filter((fc) => fc * Math.SQRT2 < nyquist * 0.98);
  const sums = new Float64Array(centers.length);
  let total = 0;
  const { frames, bins, power, binHz } = spec;
  // bin → band lookup (edges at fc/√2 … fc·√2)
  const bandOf = new Int16Array(bins).fill(-1);
  for (let k = 1; k < bins; k++) {
    const f = k * binHz;
    for (let b = 0; b < centers.length; b++) {
      if (f >= centers[b] / Math.SQRT2 && f < centers[b] * Math.SQRT2) {
        bandOf[k] = b;
        break;
      }
    }
  }
  for (let f = 0; f < frames; f++) {
    const row = f * bins;
    for (let k = 1; k < bins; k++) {
      const b = bandOf[k];
      if (b >= 0) {
        sums[b] += power[row + k];
        total += power[row + k];
      }
    }
  }
  const db = centers.map((_, b) =>
    frames > 0 && sums[b] > 0 ? Math.max(DB_FLOOR, 10 * Math.log10(sums[b] / frames)) : DB_FLOOR,
  );
  const share = centers.map((_, b) => (total > 0 ? sums[b] / total : 0));
  return {
    centersHz: [...centers],
    labels: centers.map((fc) => (fc >= 1000 ? `${(fc / 1000).toFixed(fc % 1000 ? 1 : 0)}k` : String(Math.round(fc)))),
    db,
    share,
  };
}

// ------------------------------------------- 3.3 onset envelope + tempo

export interface TempoResult {
  /** Onset-strength envelope (spectral flux of a fine-grid STFT). */
  envelope: Float32Array;
  envelopeRate: number;
  onsetsSec: number[];
  /** Weighted autocorrelation curve, index 0 = lagMinFrames. */
  acf: Float32Array;
  lagMinFrames: number;
  lagSecPerIndex: number;
  bpm: number | null;
  /** ACF peak / mean ratio (1 = no periodicity … higher = metronomic). */
  confidence: number;
  reason: string;
}

function medianOf(x: Float32Array): number {
  const s = Array.from(x).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

/**
 * Onset envelope from spectral flux on a fine time grid (~86 fps target),
 * adaptive-threshold peak picking (median + λ·MAD, 30 ms refractory), then
 * tempo from the envelope autocorrelation searched over 250 ms…2 s
 * (30–240 BPM) with a mild log-Gaussian preference around 120 BPM.
 */
export async function analyzeTempo(
  mono: Float32Array,
  sampleRate: number,
  opts: { maxFrames?: number; signal?: AbortSignal } = {},
): Promise<TempoResult> {
  const empty: TempoResult = {
    envelope: new Float32Array(0),
    envelopeRate: 0,
    onsetsSec: [],
    acf: new Float32Array(0),
    lagMinFrames: 0,
    lagSecPerIndex: 0,
    bpm: null,
    confidence: 0,
    reason: 'insufficient audio',
  };
  const n = mono.length;
  const W = 1024;
  if (n < W * 2) return empty;
  const maxFrames = Math.max(8, opts.maxFrames ?? 4096);
  let hop = Math.max(1, Math.round(sampleRate / 86));
  const natural = 1 + Math.floor((n - W) / hop);
  if (natural > maxFrames) hop = Math.ceil((n - W) / (maxFrames - 1));
  const rate = sampleRate / hop;
  // Below ~4 envelope fps the 250 ms ACF floor is unrepresentable.
  if (rate < 4) return { ...empty, envelopeRate: rate, reason: 'file too long for the tempo grid' };

  const spec = await computeStft(mono, sampleRate, {
    windowSize: W,
    hopSamples: hop,
    maxFrames,
    signal: opts.signal,
  });
  const stats = spectralStats(spec, sampleRate);
  const env = stats.flux;
  const frames = env.length;
  if (frames < 16) return { ...empty, envelope: env, envelopeRate: rate };

  // Onset picking: adaptive threshold (median + λ·MAD), refractory.
  const med = medianOf(env);
  const absDev = new Float32Array(frames);
  for (let i = 0; i < frames; i++) absDev[i] = Math.abs(env[i] - med);
  const mad = 1.4826 * medianOf(absDev);
  const threshold = med + 2.5 * Math.max(mad, 1e-9);
  const refractory = Math.max(1, Math.round(0.03 * rate));
  const onsetsSec: number[] = [];
  let lastOnset = -refractory - 1;
  for (let i = 1; i < frames - 1; i++) {
    if (env[i] > threshold && env[i] >= env[i - 1] && env[i] > env[i + 1] && i - lastOnset >= refractory) {
      onsetsSec.push(i / rate);
      lastOnset = i;
    }
  }

  // ACF of the mean-centered envelope.
  let mean = 0;
  for (let i = 0; i < frames; i++) mean += env[i];
  mean /= frames;
  const lagMin = Math.max(1, Math.round(0.25 * rate));
  const lagMax = Math.min(frames - 2, Math.floor(2.0 * rate));
  if (lagMax <= lagMin) {
    return { ...empty, envelope: env, envelopeRate: rate, onsetsSec, reason: 'too short for tempo range' };
  }
  const acfRaw = new Float32Array(lagMax - lagMin + 1);
  let acfMean = 0;
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let acc = 0;
    const m = frames - lag;
    for (let i = 0; i < m; i++) acc += (env[i] - mean) * (env[i + lag] - mean);
    const v = acc / m;
    acfRaw[lag - lagMin] = v;
    acfMean += v;
  }
  acfMean /= acfRaw.length;
  // Mild log-Gaussian tempo preference around 120 BPM (σ ≈ 0.9 octaves).
  const acf = new Float32Array(acfRaw.length);
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < acfRaw.length; i++) {
    const lag = lagMin + i;
    const bpm = (60 * rate) / lag;
    const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.9, 2));
    acf[i] = acfRaw[i] * w;
    if (acf[i] > bestScore) {
      bestScore = acf[i];
      best = i;
    }
  }
  const peakRatio = acfMean > 0 ? bestScore / acfMean : 0;
  if (best < 0 || !(bestScore > 0) || !(peakRatio > 1.05)) {
    return {
      envelope: env,
      envelopeRate: rate,
      onsetsSec,
      acf,
      lagMinFrames: lagMin,
      lagSecPerIndex: 1 / rate,
      bpm: null,
      confidence: 0,
      reason: 'no stable periodicity in the onset envelope',
    };
  }
  // Parabolic interpolation on the weighted ACF for sub-frame lag accuracy.
  let lagEst = lagMin + best;
  if (best > 0 && best < acf.length - 1) {
    const a = acf[best - 1];
    const b = acf[best];
    const c = acf[best + 1];
    const denom = a - 2 * b + c;
    if (Math.abs(denom) > EPS) lagEst += (0.5 * (a - c)) / denom;
  }
  const bpm = (60 * rate) / lagEst;
  return {
    envelope: env,
    envelopeRate: rate,
    onsetsSec,
    acf,
    lagMinFrames: lagMin,
    lagSecPerIndex: 1 / rate,
    bpm,
    confidence: Math.min(1, peakRatio / 4),
    reason: 'ok',
  };
}

// ------------------------------------ 3.4 mid/side + correlation + binaural

export interface BinauralResult {
  /** False for mono files (no second channel to compare). */
  possible: boolean;
  detected: boolean;
  /** Whole-file inter-channel Pearson correlation ρ. */
  correlation: number;
  carrierLeftHz: number | null;
  carrierRightHz: number | null;
  /** Beat estimate from the L·R product spectrum (most direct Δf readout). */
  deltaFHz: number | null;
  confidence: number;
  reason: string;
}

export interface StereoResult {
  channels: number;
  midDb: number;
  sideDb: number;
  correlationSeries: Float32Array;
  correlationTimesSec: Float32Array;
  /** Mean ρ over windows with audible energy. */
  meanCorrelation: number;
  binaural: BinauralResult;
}

/** Strided whole-file Pearson correlation between two channels. */
export function interChannelCorrelation(l: Float32Array, r: Float32Array): number {
  const n = Math.min(l.length, r.length);
  if (n < 16) return NaN;
  const stride = Math.max(1, Math.floor(n / 1_000_000));
  let sl = 0;
  let sr = 0;
  let sll = 0;
  let srr = 0;
  let slr = 0;
  let m = 0;
  for (let i = 0; i < n; i += stride) {
    const a = l[i];
    const b = r[i];
    sl += a;
    sr += b;
    sll += a * a;
    srr += b * b;
    slr += a * b;
    m++;
  }
  const cov = slr - (sl * sr) / m;
  const vl = sll - (sl * sl) / m;
  const vr = srr - (sr * sr) / m;
  if (!(vl > EPS) || !(vr > EPS)) return 0;
  return Math.max(-1, Math.min(1, cov / Math.sqrt(vl * vr)));
}

/** Strongest spectral peak in [fMin, fMax] via Welch averaging + parabolic interp. */
function dominantPeak(
  x: Float32Array,
  sampleRate: number,
  fMin: number,
  fMax: number,
  signal?: AbortSignal,
): { hz: number; prominenceDb: number } | null {
  const n = x.length;
  if (n < 256) return null;
  // ~2 s windows → sub-Hz resolution; up to 16 windows strided across the file.
  const N = nextPow2(Math.min(n, Math.round(sampleRate * 2)));
  const maxWin = 16;
  const natural = Math.max(1, Math.floor(n / (N / 2)) - 1);
  const stride = natural > maxWin ? Math.ceil((n - N) / (maxWin - 1)) : N >> 1;
  const winCount = 1 + Math.floor((n - N) / stride);
  const win = hannWindow(N);
  let winSum = 0;
  for (let i = 0; i < N; i++) winSum += win[i];
  const scale = 2 / Math.max(EPS, winSum);
  const avg = new Float64Array(N / 2 + 1);
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  for (let w = 0; w < winCount; w++) {
    checkCancel(signal);
    const off = w * stride;
    for (let i = 0; i < N; i++) {
      re[i] = x[off + i] * win[i];
      im[i] = 0;
    }
    fftInPlace(re, im, false);
    for (let k = 0; k <= N / 2; k++) avg[k] += (re[k] * re[k] + im[k] * im[k]) * scale * scale;
  }
  for (let k = 0; k <= N / 2; k++) avg[k] /= winCount;
  const binHz = sampleRate / N;
  const kMin = Math.max(1, Math.floor(fMin / binHz));
  const kMax = Math.min(N / 2 - 1, Math.ceil(fMax / binHz));
  if (kMax <= kMin) return null;
  let kBest = -1;
  let pBest = -1;
  for (let k = kMin; k <= kMax; k++) {
    if (avg[k] > pBest) {
      pBest = avg[k];
      kBest = k;
    }
  }
  if (kBest < 0 || !(pBest > EPS)) return null;
  // Prominence vs neighborhood median (± ~20 bins).
  const hood: number[] = [];
  for (let k = Math.max(kMin, kBest - 20); k <= Math.min(kMax, kBest + 20); k++) {
    if (Math.abs(k - kBest) > 2) hood.push(avg[k]);
  }
  hood.sort((a, b) => a - b);
  const hoodMed = hood.length ? hood[Math.floor(hood.length / 2)] : 0;
  const prominenceDb = 10 * Math.log10((pBest + EPS) / (hoodMed + EPS));
  // Parabolic interpolation on log-power.
  let kEst = kBest;
  const a = Math.log(avg[kBest - 1] + EPS);
  const b = Math.log(avg[kBest] + EPS);
  const c = Math.log(avg[kBest + 1] + EPS);
  const denom = a - 2 * b + c;
  if (Math.abs(denom) > EPS) kEst += Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom));
  return { hz: kEst * binHz, prominenceDb };
}

/**
 * Direct Δf readout: the product signal L·R contains a real component at
 * |fL − fR| (sum-and-difference identity). Decimate to ~2 kHz, then find the
 * strongest baseband peak in 0.5…40 Hz — the classic beat-frequency meter.
 */
function productBeatFrequency(
  l: Float32Array,
  r: Float32Array,
  sampleRate: number,
  signal?: AbortSignal,
): { hz: number; prominenceDb: number } | null {
  const n = Math.min(l.length, r.length);
  const cap = Math.min(n, 4_000_000);
  if (cap < sampleRate) return null; // need ≥ ~1 s
  const D = Math.max(1, Math.floor(sampleRate / 2000));
  const fs2 = sampleRate / D;
  const m = Math.floor(cap / D);
  const dec = new Float32Array(m);
  for (let i = 0; i < m; i++) {
    // boxcar over D samples (cheap anti-alias) of the product signal
    let acc = 0;
    const off = i * D;
    for (let j = 0; j < D; j++) acc += l[off + j] * r[off + j];
    dec[i] = acc / D;
  }
  return dominantPeak(dec, fs2, 0.5, Math.min(40, fs2 / 2 - 1), signal);
}

/** Mid/side levels, windowed correlation, and the binaural-construction check. */
export async function analyzeStereo(
  channels: Float32Array[],
  sampleRate: number,
  opts: { signal?: AbortSignal } = {},
): Promise<StereoResult> {
  const l = channels[0];
  const n = l?.length ?? 0;
  const base: StereoResult = {
    channels: channels.length,
    midDb: -Infinity,
    sideDb: -Infinity,
    correlationSeries: new Float32Array(0),
    correlationTimesSec: new Float32Array(0),
    meanCorrelation: NaN,
    binaural: {
      possible: false,
      detected: false,
      correlation: NaN,
      carrierLeftHz: null,
      carrierRightHz: null,
      deltaFHz: null,
      confidence: 0,
      reason: 'mono file — nothing to compare',
    },
  };
  if (!l || n < 64) return base;
  const r = channels.length > 1 ? channels[1] : channels[0];
  const stereo = channels.length > 1;

  // Whole-file M/S RMS.
  let eM = 0;
  let eS = 0;
  const stride = Math.max(1, Math.floor(n / 1_000_000));
  let m = 0;
  for (let i = 0; i < n; i += stride) {
    const mid = (l[i] + r[i]) / 2;
    const side = (l[i] - r[i]) / 2;
    eM += mid * mid;
    eS += side * side;
    m++;
  }
  const midDb = eM > EPS ? 10 * Math.log10(eM / m) : -Infinity;
  const sideDb = stereo && eS > EPS ? 10 * Math.log10(eS / m) : -Infinity;

  // Windowed correlation (100 ms windows, 50 ms hop, capped count).
  const win = Math.max(16, Math.round(sampleRate * 0.1));
  let hop = Math.max(8, Math.round(sampleRate * 0.05));
  const maxCorrWindows = 2048;
  if (n > win) {
    const natural = 1 + Math.floor((n - win) / hop);
    if (natural > maxCorrWindows) hop = Math.ceil((n - win) / (maxCorrWindows - 1));
  }
  const winCount = n >= win ? 1 + Math.floor((n - win) / hop) : 0;
  const corr = new Float32Array(winCount);
  const corrT = new Float32Array(winCount);
  let corrSum = 0;
  let corrN = 0;
  for (let wI = 0; wI < winCount; wI++) {
    const off = wI * hop;
    let sl = 0;
    let sr = 0;
    let sll = 0;
    let srr = 0;
    let slr = 0;
    for (let i = off; i < off + win; i++) {
      const a = l[i];
      const b = r[i];
      sl += a;
      sr += b;
      sll += a * a;
      srr += b * b;
      slr += a * b;
    }
    const vl = sll - (sl * sl) / win;
    const vr = srr - (sr * sr) / win;
    const rms2 = (sll + srr) / (2 * win);
    if (rms2 < 1e-8 || !(vl > EPS) || !(vr > EPS)) {
      corr[wI] = NaN; // silence / degenerate window — skipped in plots and means
    } else {
      corr[wI] = Math.max(-1, Math.min(1, (slr - (sl * sr) / win) / Math.sqrt(vl * vr)));
      corrSum += corr[wI];
      corrN++;
    }
    corrT[wI] = (off + win / 2) / sampleRate;
    if (wI % 256 === 255) {
      checkCancel(opts.signal);
      await yieldTo();
    }
  }

  const result: StereoResult = {
    ...base,
    channels: channels.length,
    midDb,
    sideDb,
    correlationSeries: corr,
    correlationTimesSec: corrT,
    meanCorrelation: corrN ? corrSum / corrN : NaN,
  };
  if (!stereo) return result;

  const correlation = interChannelCorrelation(l, r);
  const binaural: BinauralResult = {
    possible: true,
    detected: false,
    correlation,
    carrierLeftHz: null,
    carrierRightHz: null,
    deltaFHz: null,
    confidence: 0,
    reason: 'no isolated per-channel carrier pair found',
  };
  result.binaural = binaural;
  if (!(correlation < 0.4)) {
    binaural.reason = `channels too correlated (ρ ≈ ${Number.isFinite(correlation) ? correlation.toFixed(2) : '—'}) for a dichotic pair`;
    return result;
  }
  const fHi = Math.min(1500, sampleRate / 2 - 1);
  if (fHi <= 40) return result;
  const pkL = dominantPeak(l, sampleRate, 30, fHi, opts.signal);
  const pkR = dominantPeak(r, sampleRate, 30, fHi, opts.signal);
  if (!pkL || !pkR || pkL.prominenceDb < 10 || pkR.prominenceDb < 10) {
    binaural.reason = 'no prominent steady carrier tone in one or both channels';
    return result;
  }
  binaural.carrierLeftHz = pkL.hz;
  binaural.carrierRightHz = pkR.hz;
  const dfCarriers = Math.abs(pkL.hz - pkR.hz);
  if (dfCarriers < 0.5 || dfCarriers > 35) {
    binaural.reason =
      dfCarriers < 0.5
        ? 'carrier peaks coincide — common (correlated) content, not a dichotic pair'
        : `carrier peaks ${dfCarriers.toFixed(1)} Hz apart — outside the 0.5–35 Hz beat range`;
    return result;
  }
  const beat = productBeatFrequency(l, r, sampleRate, opts.signal);
  const df = beat && beat.prominenceDb >= 6 ? beat.hz : dfCarriers;
  binaural.deltaFHz = df;
  // A product-spectrum peak near the carrier offset corroborates the pair.
  const corroborated = beat !== null && Math.abs(beat.hz - dfCarriers) <= Math.max(1, 0.2 * dfCarriers);
  binaural.detected = true;
  binaural.confidence = Math.max(
    0.2,
    Math.min(1, (0.4 - correlation) / 0.4) *
      Math.min(1, Math.min(pkL.prominenceDb, pkR.prominenceDb) / 30) *
      (corroborated ? 1 : 0.6),
  );
  binaural.reason = corroborated
    ? 'decorrelated channels, isolated L/R carriers, and a matching L·R product peak'
    : 'decorrelated channels with isolated L/R carriers (product peak inconclusive)';
  return result;
}

// ----------------------------------------------------- 3.7 YIN-lite pitch

export interface PitchFrame {
  t: number;
  /** Hz, NaN when the frame is unvoiced/silent. */
  f0: number;
  /** 1 − CMNDF dip depth (0…1); low confidence → treat f0 as decorative. */
  clarity: number;
}

export interface PitchResult {
  frames: PitchFrame[];
  voicedFraction: number;
  /** Median f0 over voiced frames — the "concert pitch" readout. */
  medianHz: number | null;
  noteName: string | null;
  midi: number | null;
  /** Signed cents from the nearest equal-tempered note. */
  cents: number | null;
}

const NOTE_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;

/**
 * YIN (de Cheveigné & Kawahara 2002), browser-subset: FFT-based difference
 * function, cumulative-mean normalization, absolute threshold 0.1 with
 * deepest-dip selection, parabolic interpolation for sub-sample periods.
 */
export async function pitchTrack(
  mono: Float32Array,
  sampleRate: number,
  opts: { maxFrames?: number; signal?: AbortSignal } = {},
): Promise<PitchResult> {
  const empty: PitchResult = { frames: [], voicedFraction: 0, medianHz: null, noteName: null, midi: null, cents: null };
  const n = mono.length;
  const W = 2048;
  const tauMax = Math.min(1024, Math.floor(sampleRate / 40));
  const frameLen = W + tauMax;
  if (n < frameLen) return empty;
  const maxFrames = Math.max(4, opts.maxFrames ?? 512);
  let hop = 1024;
  const natural = 1 + Math.floor((n - frameLen) / hop);
  if (natural > maxFrames) hop = Math.ceil((n - frameLen) / (maxFrames - 1));
  const frames = 1 + Math.floor((n - frameLen) / hop);
  const fftN = nextPow2(frameLen * 2);
  const aRe = new Float32Array(fftN);
  const aIm = new Float32Array(fftN);
  const bRe = new Float32Array(fftN);
  const bIm = new Float32Array(fftN);
  const d = new Float64Array(tauMax + 1);
  const dNorm = new Float64Array(tauMax + 1);
  // Prefix sums of x² for the exact energy term of the difference function.
  const prefix = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) prefix[i + 1] = prefix[i] + mono[i] * mono[i];

  const out: PitchFrame[] = [];
  const CHUNK = 64;
  for (let f = 0; f < frames; f++) {
    const off = f * hop;
    const t = (off + frameLen / 2) / sampleRate;
    const frameRms = Math.sqrt((prefix[off + W] - prefix[off]) / W);
    if (frameRms < 1e-4) {
      out.push({ t, f0: NaN, clarity: 0 });
      continue;
    }
    // Cross-correlation r(τ) = Σ_{j<W} x[j]·x[j+τ] via FFT(A)·conj(FFT(B)):
    // A = first W samples (zero-padded), B = the full frame. Two forward FFTs
    // + one inverse per frame; fftN ≥ W + frameLen keeps it linear, not circular.
    aRe.fill(0);
    aIm.fill(0);
    bRe.fill(0);
    bIm.fill(0);
    for (let i = 0; i < W; i++) aRe[i] = mono[off + i];
    for (let i = 0; i < frameLen; i++) bRe[i] = mono[off + i];
    fftInPlace(aRe, aIm, false);
    fftInPlace(bRe, bIm, false);
    for (let i = 0; i < fftN; i++) {
      const cr = aRe[i] * bRe[i] + aIm[i] * bIm[i]; // A · conj(B)
      const ci = aIm[i] * bRe[i] - aRe[i] * bIm[i];
      aRe[i] = cr;
      aIm[i] = ci;
    }
    fftInPlace(aRe, aIm, true);
    // d(τ) = E[0..W) + E[τ..τ+W) − 2·r(τ)
    const e0 = prefix[off + W] - prefix[off];
    for (let tau = 1; tau <= tauMax; tau++) {
      const e1 = prefix[off + tau + W] - prefix[off + tau];
      d[tau] = Math.max(0, e0 + e1 - 2 * aRe[tau]);
    }
    // Cumulative-mean normalization.
    dNorm[0] = 1;
    let run = 0;
    for (let tau = 1; tau <= tauMax; tau++) {
      run += d[tau];
      dNorm[tau] = run > EPS ? (d[tau] * tau) / run : 1;
    }
    // Absolute threshold with deepest-dip selection.
    let tauEst = -1;
    let deepest = 1;
    for (let tau = 2; tau < tauMax; tau++) {
      if (dNorm[tau] < 0.1) {
        let tt = tau;
        while (tt + 1 <= tauMax && dNorm[tt + 1] < dNorm[tt]) tt++;
        if (dNorm[tt] < deepest) {
          deepest = dNorm[tt];
          tauEst = tt;
        }
        break;
      }
      if (dNorm[tau] < deepest) {
        deepest = dNorm[tau];
        tauEst = tau;
      }
    }
    if (tauEst < 0 || deepest >= 0.5) {
      out.push({ t, f0: NaN, clarity: 0 });
      continue;
    }
    // Refinement: the FFT-based d(τ) = e0 + e1 − 2r suffers float32
    // cancellation right at the dip (terms ~256 cancelling to ~0). Recompute
    // the difference function DIRECTLY in float64 for τ ∈ [τEst−3, τEst+3]
    // (7 × W multiply-adds — cheap) and parabolic-interpolate that minimum.
    let tauRefined = tauEst;
    {
      const lo = Math.max(1, tauEst - 3);
      const hi = Math.min(tauMax, tauEst + 3);
      const dd = new Float64Array(hi - lo + 1);
      let bestI = 0;
      let bestV = Infinity;
      for (let tau = lo; tau <= hi; tau++) {
        let acc = 0;
        for (let j = 0; j < W; j++) {
          const diff = mono[off + j] - mono[off + j + tau];
          acc += diff * diff;
        }
        dd[tau - lo] = acc;
        if (acc < bestV) {
          bestV = acc;
          bestI = tau - lo;
        }
      }
      tauRefined = lo + bestI;
      if (bestI > 0 && bestI < dd.length - 1) {
        const a = dd[bestI - 1];
        const b = dd[bestI];
        const c = dd[bestI + 1];
        const denom = a - 2 * b + c;
        if (Math.abs(denom) > EPS) tauRefined += Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom));
      }
    }
    out.push({ t, f0: sampleRate / tauRefined, clarity: Math.max(0, Math.min(1, 1 - deepest)) });
    if (f % CHUNK === CHUNK - 1) {
      checkCancel(opts.signal);
      await yieldTo();
    }
  }
  checkCancel(opts.signal);

  const voiced = out.filter((fr) => Number.isFinite(fr.f0));
  if (!voiced.length) return { ...empty, frames: out };
  const sorted = voiced.map((fr) => fr.f0).sort((a, b) => a - b);
  const medianHz = sorted[Math.floor(sorted.length / 2)];
  const midi = 12 * Math.log2(medianHz / 440) + 69;
  const nearest = Math.round(midi);
  const cents = 100 * (midi - nearest);
  const noteName = `${NOTE_NAMES[((nearest % 12) + 12) % 12]}${Math.floor(nearest / 12) - 1}`;
  return {
    frames: out,
    voicedFraction: voiced.length / out.length,
    medianHz,
    noteName,
    midi: nearest,
    cents,
  };
}

// ------------------------------------------------- 3.8 loop self-similarity

export interface LoopResult {
  /** False when the file is too short or too featureless to judge. */
  evaluated: boolean;
  detected: boolean;
  periodSec: number | null;
  /** Best self-similarity score (cosine of log-band fingerprints), 0…1. */
  score: number;
  lagsSec: Float32Array;
  scores: Float32Array;
  segmentSec: number;
  reason: string;
}

const LOOP_BANDS = 16;

/**
 * "Is this 60-minute file a 5-minute loop?" — per-second log-band energy
 * fingerprints from the STFT, then cosine self-similarity at every whole-second
 * lag. Off-diagonal ridges at exact multiples of one period = looped product.
 */
export function detectLoop(spec: SpectrogramResult, sampleRate: number, durationSec: number): LoopResult {
  const notEvaluated = (reason: string): LoopResult => ({
    evaluated: false,
    detected: false,
    periodSec: null,
    score: 0,
    lagsSec: new Float32Array(0),
    scores: new Float32Array(0),
    segmentSec: 1,
    reason,
  });
  if (durationSec < 6) return notEvaluated('file too short to judge looping (< 6 s)');
  const { frames, bins, power, binHz, frameRate } = spec;
  const fLo = 40;
  const fHi = Math.min(12000, (sampleRate / 2) * 0.9);
  if (frames < 8 || fHi <= fLo * 2) return notEvaluated('not enough spectral data');

  // bin → log-band map
  const bandOf = new Int16Array(bins).fill(-1);
  const logLo = Math.log(fLo);
  const logSpan = Math.log(fHi) - logLo;
  for (let k = 1; k < bins; k++) {
    const f = k * binHz;
    if (f < fLo || f >= fHi) continue;
    bandOf[k] = Math.min(LOOP_BANDS - 1, Math.floor(((Math.log(f) - logLo) / logSpan) * LOOP_BANDS));
  }

  // Per-segment (1 s) mean log-band energy fingerprints, in dB.
  const segFrames = Math.max(1, Math.round(frameRate));
  const segments = Math.floor(frames / segFrames);
  if (segments < 6) return notEvaluated('file too short to judge looping (< 6 s)');
  const segSec = segFrames / frameRate;
  const vecs: Float64Array[] = [];
  for (let s = 0; s < segments; s++) {
    const v = new Float64Array(LOOP_BANDS);
    for (let f = s * segFrames; f < (s + 1) * segFrames; f++) {
      const row = f * bins;
      for (let k = 1; k < bins; k++) {
        const b = bandOf[k];
        if (b >= 0) v[b] += power[row + k];
      }
    }
    for (let b = 0; b < LOOP_BANDS; b++) {
      v[b] = 10 * Math.log10(Math.max(v[b] / segFrames, Math.pow(10, DB_FLOOR / 10)));
    }
    vecs.push(v);
  }

  // Normalize: zero-mean, unit-norm (guard against silent/constant segments).
  let live = 0;
  for (const v of vecs) {
    let mean = 0;
    for (const x of v) mean += x;
    mean /= LOOP_BANDS;
    let norm = 0;
    for (let b = 0; b < LOOP_BANDS; b++) {
      v[b] -= mean;
      norm += v[b] * v[b];
    }
    norm = Math.sqrt(norm);
    if (norm > 1e-6) {
      for (let b = 0; b < LOOP_BANDS; b++) v[b] /= norm;
      live++;
    } else {
      v.fill(0);
    }
  }
  if (live < segments / 2) {
    return {
      ...notEvaluated('signal is silent or spectrally constant — nothing to fingerprint'),
      evaluated: true,
      reason: 'signal is silent or spectrally constant — nothing to fingerprint',
    };
  }

  const maxLag = Math.floor(segments / 2);
  const lags = new Float32Array(Math.max(0, maxLag - 1));
  const scores = new Float32Array(Math.max(0, maxLag - 1));
  let bestLag = -1;
  let bestScore = -Infinity;
  for (let lag = 2; lag <= maxLag; lag++) {
    let acc = 0;
    let pairs = 0;
    for (let i = 0; i + lag < segments; i++) {
      const a = vecs[i];
      const b = vecs[i + lag];
      let dot = 0;
      for (let k = 0; k < LOOP_BANDS; k++) dot += a[k] * b[k];
      acc += dot;
      pairs++;
    }
    const s = pairs ? acc / pairs : 0;
    lags[lag - 2] = lag * segSec;
    scores[lag - 2] = s;
    if (s > bestScore) {
      bestScore = s;
      bestLag = lag;
    }
  }
  const THRESHOLD = 0.92;
  // Smallest lag within a whisker of the max above threshold (the fundamental
  // period, not one of its multiples).
  let periodLag = -1;
  for (let lag = 2; lag <= maxLag; lag++) {
    if (scores[lag - 2] >= Math.max(THRESHOLD, bestScore - 0.01)) {
      periodLag = lag;
      break;
    }
  }
  const detected = periodLag >= 0;
  const lagUsed = detected ? periodLag : bestLag;
  return {
    evaluated: true,
    detected,
    periodSec: detected ? lagUsed * segSec : null,
    score: detected ? scores[lagUsed - 2] : Math.max(0, bestScore),
    lagsSec: lags,
    scores,
    segmentSec: segSec,
    reason: detected
      ? `segments repeat with a ${(lagUsed * segSec).toFixed(1)} s period (self-similarity ${scores[lagUsed - 2].toFixed(2)})`
      : `no exact-repetition ridge found (best self-similarity ${Math.max(0, bestScore).toFixed(2)} < ${THRESHOLD})`,
  };
}

// ------------------------------------------------------------- orchestration

export interface AnalysisReport {
  fileName?: string;
  durationSec: number;
  sampleRate: number;
  channels: number;
  /** Non-finite samples that were zeroed before analysis (NaN guard trail). */
  sanitizedSamples: number;
  loudness: LoudnessResult;
  spectrogram: SpectrogramResult;
  spectral: SpectralStats;
  bands: BandEnergyResult;
  tempo: TempoResult;
  stereo: StereoResult;
  pitch: PitchResult;
  loop: LoopResult;
  /** Wall-clock milliseconds the analysis took. */
  elapsedMs: number;
}

const STAGES = {
  prepare: [0, 0.04],
  stft: [0.04, 0.4],
  bands: [0.4, 0.46],
  tempo: [0.46, 0.58],
  stereo: [0.58, 0.72],
  loudness: [0.72, 0.84],
  pitch: [0.84, 0.95],
  loop: [0.95, 1],
} as const;

/**
 * Full multi-module analysis. Chunked (yields between STFT/pitch/correlation
 * chunks) and cancellable via `opts.signal` — rejection is `AnalysisCancelled`.
 */
export async function analyzeAudio(input: AudioData, opts: AnalysisOptions = {}): Promise<AnalysisReport> {
  const t0 = Date.now();
  const { signal, onProgress } = opts;
  const maxStftFrames = opts.maxStftFrames ?? 2048;
  const maxPitchFrames = opts.maxPitchFrames ?? 512;
  const report = (f: number, stage: string) => onProgress?.(Math.min(1, Math.max(0, f)), stage);
  const stageRange = (key: keyof typeof STAGES) => STAGES[key];

  checkCancel(signal);
  if (!input.channels.length || !input.channels[0].length) throw new Error('analyzeAudio: empty input');
  if (!(input.sampleRate > 0)) throw new Error('analyzeAudio: sampleRate must be > 0');
  const n = input.channels[0].length;
  for (const ch of input.channels) {
    if (ch.length !== n) throw new Error('analyzeAudio: channel length mismatch');
  }

  // ---- prepare: sanitize (NaN guard) + mono mix
  report(stageRange('prepare')[0], 'preparing channels');
  let sanitized = 0;
  const channels = input.channels.map((ch) => {
    const { clean, replaced } = sanitizeChannel(ch);
    sanitized += replaced;
    return clean;
  });
  const mono = monoMix(channels);
  const sampleRate = input.sampleRate;
  const durationSec = n / sampleRate;
  report(stageRange('prepare')[1], 'preparing channels');
  await yieldTo();

  // ---- STFT spectrogram + 3.1 spectral stats
  const [s0, s1] = stageRange('stft');
  let framesDone = 0;
  const spec = await computeStft(mono, sampleRate, {
    maxFrames: maxStftFrames,
    signal,
    onFrame: (_p, f) => {
      if (f - framesDone >= 128) {
        framesDone = f;
        report(s0 + (s1 - s0) * (f / maxStftFrames), 'spectrogram');
      }
    },
  });
  const spectral = spectralStats(spec, sampleRate);
  report(s1, 'spectrogram');

  // ---- 3.2 octave bands
  report(stageRange('bands')[0], 'band energy');
  const bands = octaveBandEnergies(spec, sampleRate);
  checkCancel(signal);
  await yieldTo();

  // ---- 3.3 tempo
  report(stageRange('tempo')[0], 'onset / tempo');
  const tempo = await analyzeTempo(mono, sampleRate, { signal });
  report(stageRange('tempo')[1], 'onset / tempo');

  // ---- 3.4 stereo
  report(stageRange('stereo')[0], 'stereo field');
  const stereo = await analyzeStereo(channels, sampleRate, { signal });
  report(stageRange('stereo')[1], 'stereo field');

  // ---- 3.5 loudness (BS.1770 module, reused verbatim)
  report(stageRange('loudness')[0], 'K-weighted loudness');
  checkCancel(signal);
  await yieldTo(); // let the UI paint before the monolithic loudness pass
  checkCancel(signal);
  const loudness = analyzeLoudness(channels, sampleRate);
  report(stageRange('loudness')[1], 'K-weighted loudness');

  // ---- 3.7 pitch
  report(stageRange('pitch')[0], 'pitch track');
  const pitch = await pitchTrack(mono, sampleRate, { maxFrames: maxPitchFrames, signal });
  report(stageRange('pitch')[1], 'pitch track');

  // ---- 3.8 loop detection
  report(stageRange('loop')[0], 'loop fingerprint');
  const loop = detectLoop(spec, sampleRate, durationSec);
  checkCancel(signal);
  report(1, 'done');

  return {
    durationSec,
    sampleRate,
    channels: channels.length,
    sanitizedSamples: sanitized,
    loudness,
    spectrogram: spec,
    spectral,
    bands,
    tempo,
    stereo,
    pitch,
    loop,
    elapsedMs: Date.now() - t0,
  };
}
