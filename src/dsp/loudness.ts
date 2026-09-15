/**
 * ITU-R BS.1770-4 K-weighted loudness, true peak and loudness range (LRA).
 *
 * K-weighting = two biquad stages:
 *   1) pre-filter: high-shelf (~+4 dB, f0 ~1682 Hz)
 *   2) RLB filter: high-pass (f0 ~38 Hz)
 * Exact published coefficients are used at 48 kHz; for other sample rates the
 * stages are re-designed from the analog prototype parameters via the bilinear
 * transform (RBJ-cookbook form, De Man's Q-based shelf parameterization).
 *
 * True peak is estimated by 4x oversampling (zero-stuffing + windowed-sinc
 * low-pass FIR). This is an approximation of the BS.1770 Annex 2 polyphase
 * filter; it detects inter-sample peaks with slightly wider tolerance.
 */

import type { BiquadCoefficients } from "./biquad";

/** Published BS.1770 stage coefficients at 48 kHz. */
const PRE_FILTER_48K: BiquadCoefficients = {
  b0: 1.53512485958697,
  b1: -2.69169618940638,
  b2: 1.19839281085285,
  a1: -1.69065929318241,
  a2: 0.73248077421585,
};
const RLB_48K: BiquadCoefficients = {
  b0: 1.0,
  b1: -2.0,
  b2: 1.0,
  a1: -1.99004745483398,
  a2: 0.99007225036621,
};

// Analog prototype parameters (De Man) for re-design at other sample rates.
const PRE_F0 = 1681.974450955533;
const PRE_G_DB = 3.999843853973347;
const PRE_Q = 0.7071752369554196;
const RLB_F0 = 38.13547087602444;
const RLB_Q = 0.5003270373238773;

/** Bilinear-designed high shelf using Q-based alpha (matches BS.1770 pre-filter). */
function designPreFilter(fs: number): BiquadCoefficients {
  const K = Math.tan((Math.PI * PRE_F0) / fs);
  const Vh = Math.pow(10, PRE_G_DB / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  const a0 = 1 + K / PRE_Q + K * K;
  return {
    b0: (Vh + (Vb * K) / PRE_Q + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / PRE_Q + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / PRE_Q + K * K) / a0,
  };
}

/** Bilinear-designed resonant high-pass (matches BS.1770 RLB filter). */
function designRlb(fs: number): BiquadCoefficients {
  const K = Math.tan((Math.PI * RLB_F0) / fs);
  const a0 = 1 + K / RLB_Q + K * K;
  return {
    b0: 1 / a0,
    b1: -2 / a0,
    b2: 1 / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / RLB_Q + K * K) / a0,
  };
}

/** K-weighting filter stages (pre-filter shelf + RLB high-pass). */
export function designKWeighting(sampleRate: number): BiquadCoefficients[] {
  if (!(sampleRate > 0)) throw new Error("designKWeighting: sampleRate must be > 0");
  if (sampleRate === 48000) return [PRE_FILTER_48K, RLB_48K];
  return [designPreFilter(sampleRate), designRlb(sampleRate)];
}

/** Absolute gate threshold (LUFS). */
export const ABSOLUTE_GATE_LUFS = -70;
/** Relative gate offset (LU). */
export const RELATIVE_GATE_LU = -10;
/** BS.1770 loudness offset. */
const LOUDNESS_OFFSET = -0.691;

export interface LoudnessResult {
  /** Integrated (gated) programme loudness in LUFS; -Infinity if nothing passes the gates. */
  integrated: number;
  /** Momentary loudness (400 ms blocks, 75% overlap) in LUFS. */
  momentary: number[];
  /** Short-term loudness (3 s window, hop = one 100 ms block hop) in LUFS. */
  shortTerm: number[];
  /** Loudness range in LU (95th - 10th percentile of gated short-term values). */
  lra: number;
  /** Highest true peak across channels, linear amplitude. */
  truePeak: number;
  /** Highest true peak in dBTP (-Infinity for silence). */
  truePeakDb: number;
  /** Block length in samples (400 ms rounded). */
  blockSamples: number;
  /** Hop length in samples (100 ms rounded, 75% overlap). */
  hopSamples: number;
  sampleRate: number;
}

/** Single-pole state for a biquad section applied sample-wise. */
class Section {
  private z1 = 0;
  private z2 = 0;
  private readonly c: BiquadCoefficients;
  constructor(c: BiquadCoefficients) {
    this.c = c;
  }
  step(x: number): number {
    const y = this.c.b0 * x + this.z1;
    this.z1 = this.c.b1 * x - this.c.a1 * y + this.z2;
    this.z2 = this.c.b2 * x - this.c.a2 * y;
    return y;
  }
}

function assertChannels(channels: Float32Array[]): number {
  if (!channels.length) throw new Error("loudness: at least one channel required");
  const n = channels[0].length;
  for (const ch of channels) {
    if (ch.length !== n) throw new Error("loudness: channel length mismatch");
    for (let i = 0; i < ch.length; i++) {
      if (!Number.isFinite(ch[i])) throw new Error("loudness: input contains NaN/Infinity");
    }
  }
  return n;
}

/**
 * K-weighted mean-square energy per 400 ms block (75% overlap), summed
 * across channels (equal channel weights, per BS.1770 for stereo).
 */
function blockEnergies(
  channels: Float32Array[],
  sampleRate: number,
  blockSamples: number,
  hopSamples: number,
): Float64Array {
  const n = channels[0].length;
  const nBlocks = n >= blockSamples ? 1 + Math.floor((n - blockSamples) / hopSamples) : 0;
  const energies = new Float64Array(nBlocks);

  // K-weight all channels once (streaming), then integrate per block.
  const coeffs = designKWeighting(sampleRate);
  const filtered = channels.map((ch) => {
    const sections = coeffs.map((c) => new Section(c));
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let y = ch[i];
      for (const s of sections) y = s.step(y);
      out[i] = y * y; // instantaneous square
    }
    return out;
  });

  // Prefix sums per channel for fast block mean-square.
  const prefix = filtered.map((sq) => {
    const p = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) p[i + 1] = p[i] + sq[i];
    return p;
  });

  for (let b = 0; b < nBlocks; b++) {
    const start = b * hopSamples;
    const end = start + blockSamples;
    let z = 0;
    for (const p of prefix) z += (p[end] - p[start]) / blockSamples;
    energies[b] = z;
  }
  return energies;
}

function blockLoudness(z: number): number {
  return z > 0 ? LOUDNESS_OFFSET + 10 * Math.log10(z) : -Infinity;
}

function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Simple windowed-sinc low-pass for 4x zero-stuffed interpolation. */
function designInterpFir(cutoff: number, fs: number, taps: number): Float64Array {
  const h = new Float64Array(taps);
  const mid = (taps - 1) / 2;
  const fc = cutoff / fs;
  for (let i = 0; i < taps; i++) {
    const m = i - mid;
    const sinc = m === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * m) / (Math.PI * m);
    const blackman = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (taps - 1));
    h[i] = sinc * blackman;
  }
  // normalize DC gain
  let sum = 0;
  for (const v of h) sum += v;
  for (let i = 0; i < taps; i++) h[i] /= sum;
  return h;
}

const firCache = new Map<number, Float64Array>();

/**
 * True peak via 4x oversampling (zero-stuff + windowed-sinc FIR low-pass;
 * approximation of the BS.1770 Annex 2 polyphase interpolator; cutoff at
 * 0.95 * original Nyquist). Returns max |sample| of the oversampled signal.
 */
export function truePeakOf(channel: Float32Array, oversample = 4): number {
  if (!channel.length) throw new Error("truePeakOf: empty input");
  for (let i = 0; i < channel.length; i++) {
    if (!Number.isFinite(channel[i])) throw new Error("truePeakOf: input contains NaN/Infinity");
  }
  // Zero-stuff at `oversample` rate, then low-pass at the oversampled rate.
  const nUp = channel.length * oversample;
  const up = new Float64Array(nUp);
  for (let i = 0; i < channel.length; i++) up[i * oversample] = channel[i];
  const taps = 97;
  let h = firCache.get(oversample);
  if (!h) {
    // normalized: original Nyquist = 0.5 (fs=1); oversampled fs = `oversample`
    h = designInterpFir(0.95 * 0.5, oversample, taps);
    firCache.set(oversample, h);
  }
  // The FIR window is truncated at the signal edges, so the reconstruction
  // there is unreliable (Gibbs-style transient on an abruptly starting
  // signal). Only trust the interpolated values whose full window overlaps
  // the signal, and floor the result with the plain sample peak (a hard
  // lower bound on the true peak) so genuine edge peaks are not lost.
  let samplePeak = 0;
  for (let i = 0; i < channel.length; i++) {
    const a = Math.abs(channel[i]);
    if (a > samplePeak) samplePeak = a;
  }
  let peak = samplePeak;
  const mid = (taps - 1) / 2;
  for (let i = mid; i < nUp - mid; i++) {
    let acc = 0;
    for (let j = i - mid; j <= i + mid; j++) acc += up[j] * h[i - j + mid];
    acc *= oversample; // restore amplitude lost to zero-stuffing
    const a = Math.abs(acc);
    if (a > peak) peak = a;
  }
  return peak;
}

/**
 * Full loudness analysis of a multi-channel programme.
 * @param channels per-channel PCM (e.g. [left, right]); equal gain weights
 * @param sampleRate Hz
 */
export function analyzeLoudness(channels: Float32Array[], sampleRate: number): LoudnessResult {
  assertChannels(channels);
  const blockSamples = Math.max(1, Math.round(sampleRate * 0.4));
  const hopSamples = Math.max(1, Math.round(blockSamples / 4));
  const stSamples = Math.max(blockSamples, Math.round(sampleRate * 3));

  const energies = blockEnergies(channels, sampleRate, blockSamples, hopSamples);
  const momentary: number[] = [];
  for (let b = 0; b < energies.length; b++) momentary.push(blockLoudness(energies[b]));

  // Integrated: absolute gate, then relative gate on the mean of survivors.
  let integrated = -Infinity;
  const absSurvivors: number[] = [];
  for (let b = 0; b < energies.length; b++) {
    if (blockLoudness(energies[b]) > ABSOLUTE_GATE_LUFS) absSurvivors.push(energies[b]);
  }
  if (absSurvivors.length) {
    const mean = absSurvivors.reduce((a, v) => a + v, 0) / absSurvivors.length;
    const relGate = blockLoudness(mean) + RELATIVE_GATE_LU;
    let sum = 0;
    let count = 0;
    for (const z of absSurvivors) {
      if (blockLoudness(z) > relGate) {
        sum += z;
        count++;
      }
    }
    if (count > 0) integrated = blockLoudness(sum / count);
  }

  // Short-term: sliding 3 s window stepped by one hop (100 ms).
  const blocksPerSt = Math.max(1, Math.round(stSamples / hopSamples));
  const shortTerm: number[] = [];
  for (let b = 0; b + blocksPerSt <= energies.length; b++) {
    let z = 0;
    for (let k = 0; k < blocksPerSt; k++) z += energies[b + k];
    shortTerm.push(blockLoudness(z / blocksPerSt));
  }

  // LRA: absolute gate + relative gate at -20 LU, 10th..95th percentile.
  let lra = 0;
  const stAbs = shortTerm.filter((l) => l > ABSOLUTE_GATE_LUFS && Number.isFinite(l));
  if (stAbs.length >= 2) {
    const sorted = [...stAbs].sort((a, b) => a - b);
    // relative gate from mean energy of absolute-gated blocks
    let zMean = 0;
    for (const l of stAbs) zMean += Math.pow(10, (l - LOUDNESS_OFFSET) / 10);
    zMean /= stAbs.length;
    const relGate = blockLoudness(zMean) - 20;
    const gated = sorted.filter((l) => l > relGate);
    if (gated.length >= 2) {
      lra = percentile(gated, 95) - percentile(gated, 10);
    }
  }

  // True peak across channels.
  let tp = 0;
  for (const ch of channels) {
    if (ch.length) {
      const p = truePeakOf(ch);
      if (p > tp) tp = p;
    }
  }

  return {
    integrated,
    momentary,
    shortTerm,
    lra,
    truePeak: tp,
    truePeakDb: tp > 0 ? 20 * Math.log10(tp) : -Infinity,
    blockSamples,
    hopSamples,
    sampleRate,
  };
}
