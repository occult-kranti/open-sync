/**
 * Radix-2 FFT utilities (pure TS, Float32Array based).
 *
 * All transforms operate on interleaved re/im Float32Arrays of power-of-two
 * length. Convenience helpers are provided for real-valued input, magnitude
 * and dB spectra, windowing and size helpers.
 */

/** Next power of two >= n (n must be >= 1). */
export function nextPow2(n: number): number {
  if (!Number.isFinite(n) || n < 1) throw new Error("nextPow2: n must be a finite number >= 1");
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/** True when n is a positive power of two. */
export function isPow2(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

function assertPow2(n: number, what: string): void {
  if (!isPow2(n)) throw new Error(`${what}: length must be a power of two, got ${n}`);
}

/**
 * In-place iterative radix-2 Cooley-Tukey FFT.
 * re/im must have the same power-of-two length. inverse=false is the forward
 * DFT (sign convention e^{-i 2 pi k n / N}).
 */
export function fftInPlace(re: Float32Array, im: Float32Array, inverse = false): void {
  const n = re.length;
  if (im.length !== n) throw new Error("fftInPlace: re/im length mismatch");
  assertPow2(n, "fftInPlace");

  // bit-reversal permutation
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }

  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const ang = (sign * 2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cwr = 1;
      let cwi = 0;
      for (let k = 0; k < half; k++) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + half] * cwr - im[i + k + half] * cwi;
        const vi = re[i + k + half] * cwi + im[i + k + half] * cwr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + half] = ur - vr;
        im[i + k + half] = ui - vi;
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

export interface ComplexSpectrum {
  re: Float32Array;
  im: Float32Array;
}

/**
 * Forward FFT of real-valued input. Input length must be a power of two;
 * use {@link nextPow2} plus zero-padding for arbitrary lengths.
 */
export function fftReal(input: Float32Array): ComplexSpectrum {
  assertPow2(input.length, "fftReal");
  const re = new Float32Array(input);
  const im = new Float32Array(input.length);
  fftInPlace(re, im, false);
  return { re, im };
}

/** Inverse FFT; returns real part. */
export function ifftReal(re: Float32Array, im: Float32Array): Float32Array {
  const r = new Float32Array(re);
  const i = new Float32Array(im);
  fftInPlace(r, i, true);
  return r;
}

/** Hann window of length n (periodic/symmetric selectable). */
export function hannWindow(n: number, periodic = false): Float32Array {
  if (n < 1) throw new Error("hannWindow: length must be >= 1");
  const w = new Float32Array(n);
  if (n === 1 && !periodic) {
    // symmetric Hann is undefined for n=1 (denominator n-1); convention is [1]
    w[0] = 1;
    return w;
  }
  const denom = periodic ? n : n - 1;
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / denom);
  }
  return w;
}

/** Apply window in place. */
export function applyWindow(x: Float32Array, window: Float32Array): Float32Array {
  if (x.length !== window.length) throw new Error("applyWindow: length mismatch");
  for (let i = 0; i < x.length; i++) x[i] *= window[i];
  return x;
}

/**
 * One-sided magnitude spectrum of a real signal.
 * Returns n/2+1 magnitudes (linear). Amplitudes are scaled so that a sine of
 * amplitude A at a bin center reads ~A (2/N one-sided scaling).
 */
export function magnitudeSpectrum(input: Float32Array): Float32Array {
  const { re, im } = fftReal(input);
  const n = re.length;
  const out = new Float32Array(n / 2 + 1);
  for (let k = 0; k <= n / 2; k++) {
    const mag = Math.hypot(re[k], im[k]);
    out[k] = k === 0 || k === n / 2 ? mag / n : (2 * mag) / n;
  }
  return out;
}

const DB_FLOOR = 1e-12;

/**
 * One-sided magnitude spectrum in dBFS (20*log10 of linear magnitude,
 * floored at -240 dB).
 */
export function magnitudeSpectrumDb(input: Float32Array): Float32Array {
  const mag = magnitudeSpectrum(input);
  for (let i = 0; i < mag.length; i++) {
    mag[i] = 20 * Math.log10(Math.max(mag[i], DB_FLOOR));
  }
  return mag;
}
