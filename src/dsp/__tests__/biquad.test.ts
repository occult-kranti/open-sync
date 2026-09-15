import { describe, it, expect } from "vitest";
import { designBiquad, Biquad, BiquadCascade, biquadMagnitudeAt } from "../biquad";

const FS = 48000;

function steadyStateGain(coeffs: ReturnType<typeof designBiquad>, freq: number): number {
  const bq = new Biquad(coeffs);
  const n = 8192;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * freq * i) / FS);
  bq.process(x);
  // measure amplitude of the second half (steady state)
  let maxA = 0;
  for (let i = n / 2; i < n; i++) maxA = Math.max(maxA, Math.abs(x[i]));
  return maxA;
}

describe("designBiquad", () => {
  it("lowpass at fc=1kHz attenuates 4kHz near the 2nd-order slope (-24 dB/octave^2)", () => {
    const c = designBiquad("lowpass", FS, 1000, Math.SQRT1_2);
    const g1k = biquadMagnitudeAt(c, FS, 1000);
    const g4k = biquadMagnitudeAt(c, FS, 4000);
    // butterworth: -3 dB at fc
    expect(20 * Math.log10(g1k)).toBeCloseTo(-3, 0);
    // bilinear-warped Butterworth: 1/sqrt(1+Om^4) with
    // Om = tan(pi*f/fs)/tan(pi*fc/fs) gives -24.48 dB at 4 kHz (fs=48k)
    expect(20 * Math.log10(g4k)).toBeCloseTo(-24.48, 1);
  });

  it("time-domain lowpass matches the analytic response", () => {
    const c = designBiquad("lowpass", FS, 1000, Math.SQRT1_2);
    const g = steadyStateGain(c, 4000);
    // time-domain measurement within ~0.15 dB of the analytic -24.48 dB
    expect(20 * Math.log10(g)).toBeCloseTo(-24.5, 0);
    // passband is untouched
    const gPass = steadyStateGain(c, 100);
    expect(20 * Math.log10(gPass)).toBeCloseTo(0, 1);
  });

  it("highpass passes highs and blocks lows", () => {
    const c = designBiquad("highpass", FS, 1000, Math.SQRT1_2);
    expect(20 * Math.log10(biquadMagnitudeAt(c, FS, 8000))).toBeCloseTo(0, 1);
    expect(20 * Math.log10(biquadMagnitudeAt(c, FS, 250))).toBeLessThan(-20);
  });

  it("peaking boosts at f0 by gainDb", () => {
    const c = designBiquad("peaking", FS, 2000, 2, 6);
    expect(20 * Math.log10(biquadMagnitudeAt(c, FS, 2000))).toBeCloseTo(6, 1);
  });

  it("notch nulls at f0", () => {
    const c = designBiquad("notch", FS, 1000, 8);
    expect(20 * Math.log10(biquadMagnitudeAt(c, FS, 1000))).toBeLessThan(-40);
  });

  it("lowshelf boosts lows by gainDb and leaves highs alone", () => {
    const c = designBiquad("lowshelf", FS, 500, 0.9, 6);
    expect(20 * Math.log10(biquadMagnitudeAt(c, FS, 20))).toBeCloseTo(6, 0);
    expect(20 * Math.log10(biquadMagnitudeAt(c, FS, 10000))).toBeCloseTo(0, 0);
  });

  it("highshelf cuts highs by gainDb and leaves lows alone", () => {
    const c = designBiquad("highshelf", FS, 4000, 0.9, -12);
    expect(20 * Math.log10(biquadMagnitudeAt(c, FS, 16000))).toBeCloseTo(-12, 0);
    expect(20 * Math.log10(biquadMagnitudeAt(c, FS, 100))).toBeCloseTo(0, 0);
  });

  it("zero-gain peaking and shelves are transparent (unity)", () => {
    for (const type of ["peaking", "lowshelf", "highshelf"] as const) {
      const c = designBiquad(type, FS, 1000, 1, 0);
      expect(biquadMagnitudeAt(c, FS, 100)).toBeCloseTo(1, 6);
      expect(biquadMagnitudeAt(c, FS, 1000)).toBeCloseTo(1, 6);
      expect(biquadMagnitudeAt(c, FS, 10000)).toBeCloseTo(1, 6);
    }
  });

  it("cascade of two lowpasses doubles the slope", () => {
    const c = designBiquad("lowpass", FS, 1000, Math.SQRT1_2);
    const cas = new BiquadCascade([c, c]);
    const n = 8192;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * 4000 * i) / FS);
    cas.process(x);
    let maxA = 0;
    for (let i = n / 2; i < n; i++) maxA = Math.max(maxA, Math.abs(x[i]));
    // analytic cascade gain is 2 * -24.48 = -48.95 dB
    expect(20 * Math.log10(maxA)).toBeCloseTo(-49.0, 0);
  });

  it("reset() clears filter state", () => {
    const c = designBiquad("lowpass", FS, 1000);
    const bq = new Biquad(c);
    const impulse = new Float32Array(64);
    impulse[0] = 1;
    const first = bq.process(new Float32Array(impulse));
    bq.reset();
    const second = bq.process(new Float32Array(impulse));
    for (let i = 0; i < 64; i++) expect(second[i]).toBeCloseTo(first[i], 7);
  });

  it("rejects invalid parameters", () => {
    expect(() => designBiquad("lowpass", FS, 0)).toThrow();
    expect(() => designBiquad("lowpass", FS, FS / 2)).toThrow();
    expect(() => designBiquad("lowpass", FS, 1000, 0)).toThrow();
    expect(() => designBiquad("lowpass", -1, 1000)).toThrow();
  });
});
