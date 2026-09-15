import { describe, it, expect } from "vitest";
import {
  fftReal,
  fftInPlace,
  ifftReal,
  nextPow2,
  isPow2,
  hannWindow,
  applyWindow,
  magnitudeSpectrum,
  magnitudeSpectrumDb,
} from "../fft";

describe("nextPow2 / isPow2", () => {
  it("rounds up to the next power of two", () => {
    expect(nextPow2(1)).toBe(1);
    expect(nextPow2(3)).toBe(4);
    expect(nextPow2(1025)).toBe(2048);
    expect(nextPow2(1024)).toBe(1024);
  });
  it("rejects invalid sizes", () => {
    expect(() => nextPow2(0)).toThrow();
    expect(() => nextPow2(NaN)).toThrow();
  });
  it("detects powers of two", () => {
    expect(isPow2(256)).toBe(true);
    expect(isPow2(255)).toBe(false);
    expect(isPow2(0)).toBe(false);
  });
});

describe("fft", () => {
  it("impulse gives a flat magnitude spectrum", () => {
    const n = 256;
    const x = new Float32Array(n);
    x[0] = 1;
    const { re, im } = fftReal(x);
    for (let k = 0; k < n; k++) {
      expect(Math.hypot(re[k], im[k])).toBeCloseTo(1, 4);
    }
  });

  it("throws on non-power-of-two input", () => {
    expect(() => fftReal(new Float32Array(1000))).toThrow(/power of two/);
    const re = new Float32Array(12);
    const im = new Float32Array(12);
    expect(() => fftInPlace(re, im)).toThrow(/power of two/);
  });

  it("recovers a sine amplitude with the one-sided magnitude spectrum", () => {
    const n = 4096;
    const x = new Float32Array(n);
    const bin = 64; // exact bin frequency => no leakage
    for (let i = 0; i < n; i++) x[i] = 0.5 * Math.sin((2 * Math.PI * bin * i) / n);
    const mag = magnitudeSpectrum(x);
    expect(mag[bin]).toBeCloseTo(0.5, 3);
  });

  it("inverse FFT round-trips", () => {
    const n = 128;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin(i * 0.3) + 0.2 * Math.cos(i * 1.7);
    const { re, im } = fftReal(x);
    const back = ifftReal(re, im);
    for (let i = 0; i < n; i++) expect(back[i]).toBeCloseTo(x[i], 4);
  });
});

describe("hannWindow", () => {
  it("has zero endpoints (symmetric) and unit center", () => {
    const w = hannWindow(1024);
    expect(w[0]).toBeCloseTo(0, 6);
    expect(w[1023]).toBeCloseTo(0, 6);
    expect(w[512]).toBeCloseTo(1, 3);
  });

  it("length 1 is defined ([1]) and length 0 throws", () => {
    const w = hannWindow(1);
    expect(w.length).toBe(1);
    expect(Number.isFinite(w[0])).toBe(true);
    expect(w[0]).toBe(1);
    expect(() => hannWindow(0)).toThrow();
  });

  it("periodic variant ends at the start of the next cycle", () => {
    const w = hannWindow(8, true);
    expect(w[0]).toBeCloseTo(0, 6);
    // periodic: w[n-1] equals the symmetric w at i=n-1 of length n+1
    expect(w[7]).toBeCloseTo(0.5 - 0.5 * Math.cos((2 * Math.PI * 7) / 8), 5);
  });
});

describe("spectra helpers", () => {
  it("magnitudeSpectrumDb floors silence at -240 dB", () => {
    const db = magnitudeSpectrumDb(new Float32Array(256));
    for (const v of db) expect(v).toBe(-240);
  });

  it("DC bin reads the mean and Nyquist bin is not doubled", () => {
    const n = 256;
    const x = new Float32Array(n).fill(0.25);
    const mag = magnitudeSpectrum(x);
    expect(mag[0]).toBeCloseTo(0.25, 4);
    // Nyquist component: alternating +/-0.5 reads 0.5, not 1.0
    const y = new Float32Array(n);
    for (let i = 0; i < n; i++) y[i] = i % 2 === 0 ? 0.5 : -0.5;
    const magY = magnitudeSpectrum(y);
    expect(magY[n / 2]).toBeCloseTo(0.5, 4);
  });

  it("fftInPlace rejects mismatched re/im lengths", () => {
    expect(() => fftInPlace(new Float32Array(16), new Float32Array(8))).toThrow(/mismatch/);
  });

  it("applyWindow rejects length mismatch", () => {
    expect(() => applyWindow(new Float32Array(16), hannWindow(8))).toThrow(/mismatch/);
  });

  it("size-1 and size-2 transforms work", () => {
    const one = fftReal(new Float32Array([2]));
    expect(one.re[0]).toBeCloseTo(2, 6);
    const two = fftReal(new Float32Array([1, -1]));
    expect(two.re[0]).toBeCloseTo(0, 5);
    expect(two.re[1]).toBeCloseTo(2, 5);
  });
});
