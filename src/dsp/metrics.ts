/**
 * Signal-quality metrics: THD, THD+N, SINAD, SNR, wow & flutter,
 * azimuth (interaural pilot phase), DC offset, crest factor and stereo
 * phase coherence.
 */

import { nextPow2, fftReal, hannWindow, fftInPlace } from "./fft";

function assertFinite(x: Float32Array, what: string): void {
  if (!x.length) throw new Error(`${what}: empty input`);
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i])) throw new Error(`${what}: input contains NaN/Infinity`);
  }
}

/** Root-mean-square level. */
export function rms(x: Float32Array): number {
  assertFinite(x, "rms");
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

/** Peak absolute amplitude. */
export function peak(x: Float32Array): number {
  assertFinite(x, "peak");
  let p = 0;
  for (let i = 0; i < x.length; i++) {
    const a = Math.abs(x[i]);
    if (a > p) p = a;
  }
  return p;
}

/** Mean value (DC offset). */
export function dcOffset(x: Float32Array): number {
  assertFinite(x, "dcOffset");
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i];
  return s / x.length;
}

/** Crest factor (peak / RMS), linear. */
export function crestFactor(x: Float32Array): number {
  const r = rms(x);
  return r > 0 ? peak(x) / r : Infinity;
}

/** Crest factor in dB. */
export function crestFactorDb(x: Float32Array): number {
  const c = crestFactor(x);
  return c > 0 && Number.isFinite(c) ? 20 * Math.log10(c) : c > 0 ? Infinity : -Infinity;
}

/** SNR of a signal against a measured silence/noise-floor segment, in dB. */
export function snrDb(signal: Float32Array, noiseFloor: Float32Array): number {
  const rs = rms(signal);
  const rn = rms(noiseFloor);
  if (rn === 0) return Infinity;
  return 20 * Math.log10(rs / rn);
}

/**
 * Parabolic interpolation on log-magnitudes around bin k.
 * Returns { bin, mag } with fractional bin and interpolated linear magnitude.
 */
function parabolicInterp(logMag: Float64Array, k: number): { bin: number; mag: number } {
  const a = logMag[k - 1];
  const b = logMag[k];
  const c = logMag[k + 1];
  const denom = a - 2 * b + c;
  const delta = denom !== 0 ? 0.5 * (a - c) / denom : 0;
  const logPeak = b - 0.25 * (a - c) * delta;
  return { bin: k + delta, mag: Math.exp(logPeak) };
}

interface SpectrumData {
  logMag: Float64Array; // one-sided natural-log magnitudes (scaled, amplitude-like)
  nFft: number;
  binHz: number;
}

function computeSpectrum(x: Float32Array, sampleRate: number): SpectrumData {
  const n = x.length;
  const win = hannWindow(n);
  const w = new Float32Array(n);
  let wsum = 0;
  for (let i = 0; i < n; i++) {
    w[i] = x[i] * win[i];
    wsum += win[i];
  }
  const nFft = nextPow2(n);
  const padded = new Float32Array(nFft);
  padded.set(w);
  const { re, im } = fftReal(padded);
  const half = nFft / 2;
  const logMag = new Float64Array(half + 1);
  // amplitude scaling: coherent gain correction (2 / sum(window))
  const scale = 2 / wsum;
  for (let k = 0; k <= half; k++) {
    const mag = Math.hypot(re[k], im[k]) * scale;
    logMag[k] = Math.log(Math.max(mag, 1e-15));
  }
  return { logMag, nFft, binHz: sampleRate / nFft };
}

/** Locate the strongest spectral peak above DC. */
function findFundamental(spec: SpectrumData, minHz = 20): number {
  const kMin = Math.max(1, Math.ceil(minHz / spec.binHz));
  let kBest = kMin;
  for (let k = kMin; k < spec.logMag.length - 1; k++) {
    if (spec.logMag[k] > spec.logMag[kBest]) kBest = k;
  }
  return kBest;
}

export interface ThdResult {
  /** THD (H2..H8) as a ratio (e.g. 0.01 = 1%). */
  thd: number;
  /** THD in percent. */
  thdPercent: number;
  /** THD in dB relative to the fundamental. */
  thdDb: number;
  /** Estimated fundamental frequency in Hz. */
  fundamentalHz: number;
  /** Fundamental amplitude (linear). */
  fundamentalAmplitude: number;
  /** Harmonic amplitudes H1..H8 (linear). */
  harmonicAmplitudes: number[];
}

/**
 * THD via FFT fundamental-notch method: locate the fundamental bin with
 * parabolic interpolation, then interpolate amplitudes at H2..H8.
 */
export function thd(x: Float32Array, sampleRate: number, numHarmonics = 8): ThdResult {
  assertFinite(x, "thd");
  if (x.length < 64) throw new Error("thd: need at least 64 samples");
  const spec = computeSpectrum(x, sampleRate);
  const k1 = findFundamental(spec);
  const f1 = parabolicInterp(spec.logMag, k1);
  const fundamentalHz = f1.bin * spec.binHz;
  const harmonicAmplitudes: number[] = [f1.mag];
  let sumSq = 0;
  for (let h = 2; h <= numHarmonics; h++) {
    const kf = f1.bin * h;
    const kMax = spec.logMag.length - 2;
    if (kf >= kMax) {
      harmonicAmplitudes.push(0);
      continue;
    }
    // local max within +-1 bin of the expected harmonic position
    const kc = Math.round(kf);
    let kBest = Math.max(1, Math.min(kMax, kc));
    for (let k = Math.max(1, kc - 1); k <= Math.min(kMax, kc + 1); k++) {
      if (spec.logMag[k] > spec.logMag[kBest]) kBest = k;
    }
    const hp = parabolicInterp(spec.logMag, kBest);
    harmonicAmplitudes.push(hp.mag);
    sumSq += hp.mag * hp.mag;
  }
  const ratio = f1.mag > 0 ? Math.sqrt(sumSq) / f1.mag : 0;
  return {
    thd: ratio,
    thdPercent: ratio * 100,
    thdDb: ratio > 0 ? 20 * Math.log10(ratio) : -Infinity,
    fundamentalHz,
    fundamentalAmplitude: f1.mag,
    harmonicAmplitudes,
  };
}

export interface ThdnResult {
  /** THD+N as a ratio. */
  thdn: number;
  thdnPercent: number;
  thdnDb: number;
  /** SINAD = 10*log10(P_signal / P_noise+distortion), dB. */
  sinadDb: number;
  fundamentalHz: number;
  fundamentalAmplitude: number;
  /** RMS of the residual after notching the fitted fundamental. */
  residualRms: number;
}

/**
 * THD+N: estimate the fundamental frequency from the spectrum (parabolic
 * interpolation), refine it by minimizing residual energy, fit the sinusoid
 * by least squares, then measure the residual ("fundamental notch").
 * SINAD is the exact reciprocal measure (signal / (noise + distortion)).
 */
export function thdN(x: Float32Array, sampleRate: number): ThdnResult {
  assertFinite(x, "thdN");
  if (x.length < 64) throw new Error("thdN: need at least 64 samples");
  const spec = computeSpectrum(x, sampleRate);
  const k1 = findFundamental(spec);
  let fHz = parabolicInterp(spec.logMag, k1).bin * spec.binHz;

  const n = x.length;
  const fitResidual = (f: number): { res: number; amp: number } => {
    const w = (2 * Math.PI * f) / sampleRate;
    let sc = 0, sx = 0, cx = 0, cc = 0, ssn = 0;
    for (let i = 0; i < n; i++) {
      const c = Math.cos(w * i);
      const s = Math.sin(w * i);
      cc += c * c;
      ssn += s * s;
      sc += s * c;
      cx += x[i] * c;
      sx += x[i] * s;
    }
    // least squares for [a*cos + b*sin]
    const det = cc * ssn - sc * sc;
    if (Math.abs(det) < 1e-12) return { res: Infinity, amp: 0 };
    const a = (cx * ssn - sx * sc) / det;
    const b = (sx * cc - cx * sc) / det;
    let res = 0;
    for (let i = 0; i < n; i++) {
      const d = x[i] - (a * Math.cos(w * i) + b * Math.sin(w * i));
      res += d * d;
    }
    return { res: Math.sqrt(res / n), amp: Math.hypot(a, b) };
  };

  // refine frequency around the FFT estimate (+-1.5 bins)
  let best = fitResidual(fHz);
  const step0 = spec.binHz / 8;
  for (let pass = 0; pass < 3; pass++) {
    const step = step0 / Math.pow(4, pass);
    for (let df = -4; df <= 4; df++) {
      const cand = fitResidual(fHz + df * step);
      if (cand.res < best.res) {
        best = cand;
        fHz = fHz + df * step;
      }
    }
  }
  best = fitResidual(fHz);

  const sigRms = rms(x);
  // THD+N is an RMS ratio: residual RMS against fitted-fundamental RMS (A/sqrt(2))
  const fundRms = best.amp / Math.SQRT2;
  const ratio = fundRms > 0 ? best.res / fundRms : Infinity;
  const sinad = best.res > 0 ? 20 * Math.log10(sigRms / best.res) : Infinity;
  return {
    thdn: ratio,
    thdnPercent: ratio * 100,
    thdnDb: ratio === 0 ? -Infinity : Number.isFinite(ratio) ? 20 * Math.log10(ratio) : Infinity,
    sinadDb: sinad,
    fundamentalHz: fHz,
    fundamentalAmplitude: best.amp,
    residualRms: best.res,
  };
}

export interface WowFlutterResult {
  /** RMS frequency deviation of the pilot, in percent of pilot frequency. */
  rmsPercent: number;
  /** Peak absolute deviation, in percent. */
  peakPercent: number;
  /** Mean frequency drift, in percent. */
  driftPercent: number;
  /** Per-sample deviation trace (percent), edges included. */
  trace: Float32Array;
  pilotHz: number;
}

/**
 * Wow & flutter estimate: FM demodulation of a pilot tone (default 3150 Hz)
 * via the analytic signal (Hilbert transform through FFT). The instantaneous
 * frequency trace is differentiated from unwrapped phase; edge transients are
 * trimmed before computing RMS/peak deviation.
 */
export function wowFlutter(x: Float32Array, sampleRate: number, pilotHz = 3150): WowFlutterResult {
  assertFinite(x, "wowFlutter");
  if (x.length < 256) throw new Error("wowFlutter: need at least 256 samples");

  // analytic signal via Hilbert transform (zero-padded to pow2)
  const n = x.length;
  const nFft = nextPow2(n);
  const re = new Float32Array(nFft);
  re.set(x);
  const im = new Float32Array(nFft);
  fftInPlace(re, im, false);
  const half = nFft / 2;
  for (let k = 0; k < nFft; k++) {
    let h = 0;
    if (k === 0 || k === half) h = 1;
    else if (k < half) h = 2;
    re[k] *= h;
    im[k] *= h;
  }
  fftInPlace(re, im, true);

  // instantaneous frequency from unwrapped analytic phase
  const instFreq = new Float64Array(n);
  for (let i = 1; i < n; i++) {
    // phase increment via conjugate product (robust unwrap-free difference)
    const pr = re[i] * re[i - 1] + im[i] * im[i - 1];
    const pi = im[i] * re[i - 1] - re[i] * im[i - 1];
    const dphi = Math.atan2(pi, pr);
    instFreq[i] = (dphi * sampleRate) / (2 * Math.PI);
  }
  instFreq[0] = instFreq[1];

  // trim 10% each side to drop Hilbert edge transients
  const trim = Math.floor(n * 0.1);
  const trace = new Float32Array(n - 2 * trim);
  let sum = 0;
  let sumSq = 0;
  let pk = 0;
  for (let i = trim; i < n - trim; i++) {
    const d = ((instFreq[i] - pilotHz) / pilotHz) * 100;
    trace[i - trim] = d;
    sum += d;
    sumSq += d * d;
    const a = Math.abs(d);
    if (a > pk) pk = a;
  }
  const m = trace.length;
  const mean = sum / m;
  const rmsDev = Math.sqrt(Math.max(0, sumSq / m - mean * mean));

  return {
    rmsPercent: rmsDev,
    peakPercent: pk,
    driftPercent: mean,
    trace,
    pilotHz,
  };
}

/**
 * Azimuth error: interaural phase difference of a pilot tone, in degrees.
 * Positive = left leads right. Returns 0 for mono-perfect alignment.
 */
export function azimuthErrorDeg(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
  pilotHz = 3150,
): number {
  assertFinite(left, "azimuth(left)");
  assertFinite(right, "azimuth(right)");
  if (left.length !== right.length) throw new Error("azimuth: channel length mismatch");

  const phaseAt = (x: Float32Array): number => {
    const nFft = nextPow2(x.length);
    const padded = new Float32Array(nFft);
    padded.set(x);
    const { re, im } = fftReal(padded);
    const binHz = sampleRate / nFft;
    // strongest bin near the pilot (search +-5% to be safe)
    const kEst = pilotHz / binHz;
    let kBest = Math.max(1, Math.round(kEst));
    const span = Math.max(1, Math.round(kEst * 0.05));
    for (let k = Math.max(1, Math.round(kEst) - span); k <= Math.round(kEst) + span && k <= nFft / 2; k++) {
      if (re[k] * re[k] + im[k] * im[k] > re[kBest] * re[kBest] + im[kBest] * im[kBest]) kBest = k;
    }
    return Math.atan2(im[kBest], re[kBest]);
  };

  const dphi = phaseAt(left) - phaseAt(right);
  let deg = (dphi * 180) / Math.PI;
  // wrap to [-180, 180]
  deg = ((deg + 540) % 360) - 180;
  return deg;
}

/**
 * Stereo phase coherence: Pearson correlation between channels,
 * in [-1, 1]. 1 = fully in phase, -1 = fully out of phase.
 */
export function phaseCoherence(left: Float32Array, right: Float32Array): number {
  assertFinite(left, "phaseCoherence(left)");
  assertFinite(right, "phaseCoherence(right)");
  if (left.length !== right.length) throw new Error("phaseCoherence: channel length mismatch");
  const n = left.length;
  let ml = 0, mr = 0;
  for (let i = 0; i < n; i++) {
    ml += left[i];
    mr += right[i];
  }
  ml /= n;
  mr /= n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const a = left[i] - ml;
    const b = right[i] - mr;
    sxy += a * b;
    sxx += a * a;
    syy += b * b;
  }
  const denom = Math.sqrt(sxx * syy);
  return denom > 0 ? sxy / denom : 0;
}
