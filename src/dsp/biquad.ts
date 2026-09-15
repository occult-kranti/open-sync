/**
 * RBJ Audio EQ Cookbook biquad design plus a cascade processor.
 * Used by the BS.1770 K-weighting filters and exposed for the UI EQ.
 */

export interface BiquadCoefficients {
  /** feed-forward coefficients */
  b0: number;
  b1: number;
  b2: number;
  /** feedback coefficients (a0 normalized to 1) */
  a1: number;
  a2: number;
}

export type BiquadType =
  | "lowpass"
  | "highpass"
  | "peaking"
  | "notch"
  | "lowshelf"
  | "highshelf";

/**
 * Design an RBJ biquad.
 * @param type filter type
 * @param sampleRate Hz
 * @param f0 center/corner frequency Hz (0 < f0 < fs/2)
 * @param q quality factor (ignored for shelves unless gainDb=0 edge use)
 * @param gainDb peaking/shelf gain in dB
 */
export function designBiquad(
  type: BiquadType,
  sampleRate: number,
  f0: number,
  q = Math.SQRT1_2,
  gainDb = 0,
): BiquadCoefficients {
  if (!(sampleRate > 0)) throw new Error("designBiquad: sampleRate must be > 0");
  if (!(f0 > 0) || f0 >= sampleRate / 2) {
    throw new Error("designBiquad: f0 must be in (0, fs/2)");
  }
  if (!(q > 0)) throw new Error("designBiquad: q must be > 0");

  const A = Math.pow(10, gainDb / 40);
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const cosw0 = Math.cos(w0);
  const sinw0 = Math.sin(w0);
  const alpha = sinw0 / (2 * q);
  // shelf slope term (S = 1)
  const shelfAlpha = (sinw0 / 2) * Math.sqrt((A + 1 / A) * (1 / 1 - 1) + 2);
  const sqrtA = Math.sqrt(A);

  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;

  switch (type) {
    case "lowpass":
      b0 = (1 - cosw0) / 2;
      b1 = 1 - cosw0;
      b2 = (1 - cosw0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosw0;
      a2 = 1 - alpha;
      break;
    case "highpass":
      b0 = (1 + cosw0) / 2;
      b1 = -(1 + cosw0);
      b2 = (1 + cosw0) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosw0;
      a2 = 1 - alpha;
      break;
    case "peaking":
      b0 = 1 + alpha * A;
      b1 = -2 * cosw0;
      b2 = 1 - alpha * A;
      a0 = 1 + alpha / A;
      a1 = -2 * cosw0;
      a2 = 1 - alpha / A;
      break;
    case "notch":
      b0 = 1;
      b1 = -2 * cosw0;
      b2 = 1;
      a0 = 1 + alpha;
      a1 = -2 * cosw0;
      a2 = 1 - alpha;
      break;
    case "lowshelf": {
      b0 = A * (A + 1 - (A - 1) * cosw0 + 2 * sqrtA * shelfAlpha);
      b1 = 2 * A * (A - 1 - (A + 1) * cosw0);
      b2 = A * (A + 1 - (A - 1) * cosw0 - 2 * sqrtA * shelfAlpha);
      a0 = A + 1 + (A - 1) * cosw0 + 2 * sqrtA * shelfAlpha;
      a1 = -2 * (A - 1 + (A + 1) * cosw0);
      a2 = A + 1 + (A - 1) * cosw0 - 2 * sqrtA * shelfAlpha;
      break;
    }
    case "highshelf": {
      b0 = A * (A + 1 + (A - 1) * cosw0 + 2 * sqrtA * shelfAlpha);
      b1 = -2 * A * (A - 1 + (A + 1) * cosw0);
      b2 = A * (A + 1 + (A - 1) * cosw0 - 2 * sqrtA * shelfAlpha);
      a0 = A + 1 - (A - 1) * cosw0 + 2 * sqrtA * shelfAlpha;
      a1 = 2 * (A - 1 - (A + 1) * cosw0);
      a2 = A + 1 - (A - 1) * cosw0 - 2 * sqrtA * shelfAlpha;
      break;
    }
  }

  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Direct Form II transposed biquad state. */
export class Biquad {
  readonly coeffs: BiquadCoefficients;
  private z1 = 0;
  private z2 = 0;

  constructor(coeffs: BiquadCoefficients) {
    this.coeffs = coeffs;
  }

  reset(): void {
    this.z1 = 0;
    this.z2 = 0;
  }

  processSample(x: number): number {
    const { b0, b1, b2, a1, a2 } = this.coeffs;
    const y = b0 * x + this.z1;
    this.z1 = b1 * x - a1 * y + this.z2;
    this.z2 = b2 * x - a2 * y;
    return y;
  }

  /** Process a block in place; returns the same array. */
  process(x: Float32Array): Float32Array {
    for (let i = 0; i < x.length; i++) x[i] = this.processSample(x[i]);
    return x;
  }
}

/** Cascade of biquads (series connection). */
export class BiquadCascade {
  readonly stages: Biquad[];

  constructor(coeffs: BiquadCoefficients[]) {
    this.stages = coeffs.map((c) => new Biquad(c));
  }

  reset(): void {
    for (const s of this.stages) s.reset();
  }

  processSample(x: number): number {
    let y = x;
    for (const s of this.stages) y = s.processSample(y);
    return y;
  }

  process(x: Float32Array): Float32Array {
    for (const s of this.stages) s.process(x);
    return x;
  }
}

/** Frequency response magnitude (linear) of coefficients at frequency f Hz. */
export function biquadMagnitudeAt(c: BiquadCoefficients, sampleRate: number, f: number): number {
  const w = (2 * Math.PI * f) / sampleRate;
  const cosw = Math.cos(w);
  const cos2w = Math.cos(2 * w);
  const sinw = Math.sin(w);
  const sin2w = Math.sin(2 * w);
  // H(e^jw) = (b0 + b1 e^-jw + b2 e^-j2w) / (1 + a1 e^-jw + a2 e^-j2w)
  const nr = c.b0 + c.b1 * cosw + c.b2 * cos2w;
  const ni = -(c.b1 * sinw + c.b2 * sin2w);
  const dr = 1 + c.a1 * cosw + c.a2 * cos2w;
  const di = -(c.a1 * sinw + c.a2 * sin2w);
  return Math.hypot(nr, ni) / Math.hypot(dr, di);
}
