import { describe, it, expect } from "vitest";
import {
  rms,
  peak,
  dcOffset,
  crestFactor,
  crestFactorDb,
  snrDb,
  thd,
  thdN,
  wowFlutter,
  azimuthErrorDeg,
  phaseCoherence,
} from "../metrics";

const FS = 48000;

function sine(freq: number, amplitude: number, n: number, fs = FS, phase = 0): Float32Array {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / fs + phase);
  return x;
}

describe("basic level metrics", () => {
  it("rms of a sine is A/sqrt(2)", () => {
    // 4800 samples = exactly 100 cycles of 1 kHz at 48 kHz
    expect(rms(sine(1000, 0.5, 4800))).toBeCloseTo(0.5 / Math.SQRT2, 4);
    expect(rms(new Float32Array(1024))).toBe(0);
  });

  it("peak is the max absolute sample", () => {
    const x = new Float32Array([0.1, -0.7, 0.3]);
    expect(peak(x)).toBeCloseTo(0.7, 6);
  });

  it("dcOffset returns the mean", () => {
    // 4800 samples = exactly 50 cycles of 500 Hz at 48 kHz (zero-mean sine)
    const x = sine(500, 0.5, 4800);
    for (let i = 0; i < x.length; i++) x[i] += 0.25;
    expect(dcOffset(x)).toBeCloseTo(0.25, 3);
  });

  it("crest factor of a sine is sqrt(2), ~3.01 dB", () => {
    const x = sine(1000, 0.8, 8192);
    expect(crestFactor(x)).toBeCloseTo(Math.SQRT2, 2);
    expect(crestFactorDb(x)).toBeCloseTo(3.01, 1);
  });

  it("crest factor of silence is Infinity", () => {
    expect(crestFactor(new Float32Array(512))).toBe(Infinity);
  });

  it("rejects empty and non-finite input", () => {
    expect(() => rms(new Float32Array(0))).toThrow(/empty/);
    const bad = new Float32Array(64);
    bad[3] = Infinity;
    expect(() => peak(bad)).toThrow(/NaN|Infinity/);
    expect(() => dcOffset(bad)).toThrow(/NaN|Infinity/);
  });
});

describe("snrDb", () => {
  it("60 dB for a 1000:1 rms ratio", () => {
    const sig = sine(1000, 1, 4096);
    const noise = sine(1000, 0.001, 4096);
    expect(snrDb(sig, noise)).toBeCloseTo(60, 1);
  });

  it("returns Infinity against a zero noise floor and -Infinity for a silent signal", () => {
    const sig = sine(1000, 1, 4096);
    expect(snrDb(sig, new Float32Array(4096))).toBe(Infinity);
    expect(snrDb(new Float32Array(4096), sig)).toBe(-Infinity);
  });
});

describe("thd", () => {
  it("pure sine has near-zero THD and a recovered fundamental", () => {
    const r = thd(sine(997.3, 0.8, 16384), FS);
    expect(r.thdPercent).toBeLessThan(0.2);
    expect(r.fundamentalHz).toBeCloseTo(997.3, 0);
    expect(r.fundamentalAmplitude).toBeCloseTo(0.8, 1);
  });

  it("measures a known -40 dB (1%) second harmonic", () => {
    const n = 16384;
    const x = sine(1000, 0.8, n);
    const h2 = sine(2000, 0.008, n); // 1% of fundamental
    for (let i = 0; i < n; i++) x[i] += h2[i];
    const r = thd(x, FS, 4);
    expect(r.thdPercent).toBeGreaterThan(0.8);
    expect(r.thdPercent).toBeLessThan(1.2);
    expect(r.thdDb).toBeCloseTo(-40, 0);
  });

  it("rejects short, empty and non-finite input", () => {
    expect(() => thd(sine(1000, 1, 32), FS)).toThrow(/64/);
    expect(() => thd(new Float32Array(0), FS)).toThrow(/empty/);
    const bad = sine(1000, 1, 1024);
    bad[7] = NaN;
    expect(() => thd(bad, FS)).toThrow(/NaN/);
  });
});

describe("thdN / sinad", () => {
  it("pure sine has very low THD+N and high SINAD", () => {
    const r = thdN(sine(1000, 0.8, 16384), FS);
    expect(r.thdnPercent).toBeLessThan(0.05);
    expect(r.sinadDb).toBeGreaterThan(60);
    expect(r.fundamentalHz).toBeCloseTo(1000, 0);
  });

  it("recovers an off-bin fundamental frequency", () => {
    const r = thdN(sine(997.3, 0.8, 16384), FS);
    expect(r.fundamentalHz).toBeCloseTo(997.3, 0);
    expect(r.fundamentalAmplitude).toBeCloseTo(0.8, 1);
  });

  it("measures a known 1% distortion component", () => {
    const n = 16384;
    const x = sine(1000, 0.8, n);
    const h2 = sine(2000, 0.008, n);
    for (let i = 0; i < n; i++) x[i] += h2[i];
    const r = thdN(x, FS);
    expect(r.thdnPercent).toBeGreaterThan(0.85);
    expect(r.thdnPercent).toBeLessThan(1.15);
    expect(r.sinadDb).toBeCloseTo(40, 0);
  });

  it("rejects short and non-finite input", () => {
    expect(() => thdN(sine(1000, 1, 32), FS)).toThrow(/64/);
    const bad = sine(1000, 1, 1024);
    bad[0] = NaN;
    expect(() => thdN(bad, FS)).toThrow(/NaN/);
  });
});

describe("wowFlutter", () => {
  const N = 32768;

  it("clean pilot measures near-zero deviation", () => {
    const r = wowFlutter(sine(3150, 0.8, N), FS);
    expect(r.rmsPercent).toBeLessThan(0.03);
    expect(Math.abs(r.driftPercent)).toBeLessThan(0.01);
    expect(r.trace.length).toBe(N - 2 * Math.floor(N * 0.1));
  });

  it("recovers a 0.1% peak sinusoidal frequency modulation", () => {
    // FM: f(t) = 3150 + 3.15 Hz * sin(2*pi*4*t)  => 0.1% peak deviation
    const fm = 4;
    const df = 3.15;
    const x = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / FS;
      x[i] = 0.8 * Math.sin(2 * Math.PI * 3150 * t + (df / fm) * Math.sin(2 * Math.PI * fm * t));
    }
    const r = wowFlutter(x, FS);
    // RMS of a 0.1%-peak sine deviation is 0.1/sqrt(2) = 0.0707%
    expect(r.rmsPercent).toBeGreaterThan(0.055);
    expect(r.rmsPercent).toBeLessThan(0.095);
    expect(r.peakPercent).toBeGreaterThan(0.08);
    expect(r.peakPercent).toBeLessThan(0.18);
  });

  it("reports steady off-frequency pilots as drift", () => {
    const r = wowFlutter(sine(3155, 0.8, N), FS);
    expect(r.driftPercent).toBeCloseTo(((3155 - 3150) / 3150) * 100, 1);
    expect(r.rmsPercent).toBeLessThan(0.03);
  });

  it("rejects short and non-finite input", () => {
    expect(() => wowFlutter(sine(3150, 1, 128), FS)).toThrow(/256/);
    const bad = sine(3150, 1, 1024);
    bad[100] = Infinity;
    expect(() => wowFlutter(bad, FS)).toThrow(/NaN|Infinity/);
  });
});

describe("azimuthErrorDeg", () => {
  const N = 16384;

  it("identical channels have zero error", () => {
    const x = sine(3150, 0.5, N);
    expect(azimuthErrorDeg(x, new Float32Array(x), FS)).toBeCloseTo(0, 1);
  });

  it("one sample of delay at 3150 Hz is +23.6 degrees (left leads)", () => {
    const left = sine(3150, 0.5, N);
    const right = sine(3150, 0.5, N, FS, -(2 * Math.PI * 3150) / FS);
    const deg = azimuthErrorDeg(left, right, FS);
    expect(deg).toBeCloseTo((360 * 3150) / FS, 0);
  });

  it("wraps into [-180, 180]", () => {
    const left = sine(3150, 0.5, N);
    // 170 degrees of lag
    const right = sine(3150, 0.5, N, FS, (-170 * Math.PI) / 180);
    const deg = azimuthErrorDeg(left, right, FS);
    expect(deg).toBeCloseTo(170, 0);
    expect(deg).toBeGreaterThanOrEqual(-180);
    expect(deg).toBeLessThanOrEqual(180);
  });

  it("rejects mismatched channel lengths", () => {
    expect(() => azimuthErrorDeg(new Float32Array(1024), new Float32Array(2048), FS)).toThrow(
      /mismatch/,
    );
  });
});

describe("phaseCoherence", () => {
  it("is 1 for identical, -1 for inverted, ~0 for decorrelated channels", () => {
    const x = sine(1000, 0.5, 8192);
    expect(phaseCoherence(x, new Float32Array(x))).toBeCloseTo(1, 4);
    const inv = new Float32Array(x);
    for (let i = 0; i < inv.length; i++) inv[i] *= -1;
    expect(phaseCoherence(x, inv)).toBeCloseTo(-1, 4);
    const other = sine(1737.7, 0.5, 8192);
    expect(Math.abs(phaseCoherence(x, other))).toBeLessThan(0.05);
  });

  it("returns 0 for zero-variance (constant) channels", () => {
    const a = new Float32Array(1024).fill(0.5);
    const b = sine(1000, 0.5, 1024);
    expect(phaseCoherence(a, b)).toBe(0);
  });

  it("rejects mismatched lengths and non-finite input", () => {
    expect(() => phaseCoherence(new Float32Array(10), new Float32Array(11))).toThrow(/mismatch/);
    const bad = new Float32Array(64);
    bad[2] = NaN;
    expect(() => phaseCoherence(bad, new Float32Array(64))).toThrow(/NaN/);
  });
});
