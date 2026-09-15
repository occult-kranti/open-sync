/**
 * Sonic Lab — shared pure-DSP helpers (no Web Audio, no DOM).
 *
 * Radix-2 Cooley–Tukey FFT (iterative, in-place), a deterministic PRNG
 * (mulberry32) so every renderer is reproducible from a seed, and small
 * numeric helpers used by the generators and the safety rails.
 */

/** Next power of two ≥ n (min 2). */
export function nextPow2(n: number): number {
  let p = 2;
  while (p < n) p *= 2;
  return p;
}

/**
 * In-place iterative radix-2 FFT. `re`/`im` must have equal power-of-2 length.
 * `inverse` conjugates and normalizes by N.
 */
export function fft(re: Float64Array, im: Float64Array, inverse = false): void {
  const n = re.length;
  if (n !== im.length || (n & (n - 1)) !== 0) {
    throw new Error('fft: inputs must share a power-of-2 length');
  }
  // Bit-reversal permutation.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((2 * Math.PI) / len) * (inverse ? 1 : -1);
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1;
      let cwi = 0;
      for (let j = 0; j < len / 2; j++) {
        const ur = re[i + j];
        const ui = im[i + j];
        const vr = re[i + j + len / 2] * cwr - im[i + j + len / 2] * cwi;
        const vi = re[i + j + len / 2] * cwi + im[i + j + len / 2] * cwr;
        re[i + j] = ur + vr;
        im[i + j] = ui + vi;
        re[i + j + len / 2] = ur - vr;
        im[i + j + len / 2] = ui - vi;
        const nwr = cwr * wr - cwi * wi;
        cwi = cwr * wi + cwi * wr;
        cwr = nwr;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

/** Deterministic mulberry32 PRNG → uniform [0,1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gaussian white sample from a uniform PRNG (Box–Muller, cached pair). */
export function makeGaussian(rand: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = rand() * 2 - 1;
      v = rand() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);
    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    return u * mul;
  };
}

export const linToDb = (x: number): number => 20 * Math.log10(Math.max(x, 1e-12));
export const dbToLin = (db: number): number => Math.pow(10, db / 20);

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Peak absolute value of a buffer (NaN-safe: non-finite counts as 0). */
export function peakAbs(samples: Float32Array): number {
  let p = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (Number.isFinite(a) && a > p) p = a;
  }
  return p;
}

/** True if any sample is NaN or ±Infinity. */
export function hasNonFinite(samples: Float32Array): boolean {
  for (let i = 0; i < samples.length; i++) {
    if (!Number.isFinite(samples[i])) return true;
  }
  return false;
}

/** Hann window of length n. */
export function hannWindow(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  return w;
}

/**
 * Amplitude spectrum (magnitudes) of the first `n` samples (padded/truncated
 * to a power of two, Hann-windowed). Returns {freqs, mags} for bins 0..N/2.
 */
export function amplitudeSpectrum(
  samples: Float32Array,
  sampleRate: number,
  maxN = 32768,
): { freqs: Float64Array; mags: Float64Array } {
  // Largest power of two that the buffer can actually fill (zero-padding a
  // Hann window would scallop the spectrum).
  const avail = Math.min(samples.length, maxN);
  const n = Math.max(2, 2 ** Math.floor(Math.log2(Math.max(2, avail))));
  const w = hannWindow(n);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const s = i < samples.length && Number.isFinite(samples[i]) ? samples[i] : 0;
    re[i] = s * w[i];
  }
  fft(re, im);
  const half = n / 2;
  const freqs = new Float64Array(half + 1);
  const mags = new Float64Array(half + 1);
  for (let k = 0; k <= half; k++) {
    freqs[k] = (k * sampleRate) / n;
    mags[k] = Math.hypot(re[k], im[k]);
  }
  return { freqs, mags };
}
