import { describe, it, expect } from "vitest";
import { analyzeLoudness, truePeakOf, designKWeighting, ABSOLUTE_GATE_LUFS } from "../loudness";

const FS = 48000;

function sine(freq: number, amplitude: number, seconds: number, fs = FS, phase = 0): Float32Array {
  const n = Math.round(seconds * fs);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = amplitude * Math.sin((2 * Math.PI * freq * i) / fs + phase);
  return x;
}

describe("K-weighting design", () => {
  it("returns two stages at any rate and exact constants at 48 kHz", () => {
    const k48 = designKWeighting(48000);
    expect(k48).toHaveLength(2);
    expect(k48[0].b0).toBeCloseTo(1.53512485958697, 10);
    const k44 = designKWeighting(44100);
    expect(k44).toHaveLength(2);
    expect(() => designKWeighting(0)).toThrow();
  });
});

describe("integrated loudness (BS.1770)", () => {
  it("1 kHz sine at -20 dBFS measures about -23 LUFS", () => {
    const x = sine(1000, 0.1, 10);
    const r = analyzeLoudness([x], FS);
    expect(r.integrated).toBeGreaterThan(-23.7);
    expect(r.integrated).toBeLessThan(-22.3);
  });

  it("silence is fully gated out (-Infinity)", () => {
    const r = analyzeLoudness([new Float32Array(FS * 3)], FS);
    expect(r.integrated).toBe(-Infinity);
    expect(r.truePeakDb).toBe(-Infinity);
  });

  it("very quiet signal below the absolute gate reads -Infinity", () => {
    const x = sine(1000, 1e-5, 3); // ~ -103 dBFS
    const r = analyzeLoudness([x], FS);
    expect(r.integrated).toBe(-Infinity);
    expect(ABSOLUTE_GATE_LUFS).toBe(-70);
  });

  it("full-scale square wave is louder than a full-scale sine (crest sanity)", () => {
    const n = FS * 5;
    const sq = new Float32Array(n);
    for (let i = 0; i < n; i++) sq[i] = Math.sin((2 * Math.PI * 100 * i) / FS) >= 0 ? 0.999 : -0.999;
    const si = sine(100, 0.999, 5);
    const rSq = analyzeLoudness([sq], FS);
    const rSi = analyzeLoudness([si], FS);
    expect(rSq.integrated).toBeGreaterThan(rSi.integrated + 1.5);
  });

  it("works at 44.1 kHz via bilinear re-design", () => {
    const x = sine(1000, 0.1, 10, 44100);
    const r = analyzeLoudness([x], 44100);
    expect(r.integrated).toBeGreaterThan(-23.9);
    expect(r.integrated).toBeLessThan(-22.1);
  });

  it("stereo dual-mono sums +3 LU over mono", () => {
    const x = sine(1000, 0.1, 8);
    const mono = analyzeLoudness([x], FS);
    const stereo = analyzeLoudness([x, new Float32Array(x)], FS);
    expect(stereo.integrated).toBeCloseTo(mono.integrated + 3.01, 1);
  });

  it("rejects empty and NaN input", () => {
    expect(() => analyzeLoudness([], FS)).toThrow();
    const bad = new Float32Array(FS);
    bad[10] = NaN;
    expect(() => analyzeLoudness([bad], FS)).toThrow(/NaN/);
  });
});

describe("true peak", () => {
  it("detects an inter-sample peak invisible to sample peak", () => {
    // 11025 Hz at fs=44100 sampled at 45deg offsets: samples hit +/-0.7071,
    // the analog waveform peaks at 1.0 between samples.
    const fs = 44100;
    const n = 4096;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * 11025 * i) / fs + Math.PI / 4);
    let samplePeak = 0;
    for (const v of x) samplePeak = Math.max(samplePeak, Math.abs(v));
    expect(samplePeak).toBeLessThan(0.72);
    const tp = truePeakOf(x);
    expect(tp).toBeGreaterThan(0.95);
    expect(tp).toBeLessThan(1.05);
  });

  it("sweeps sine phase and always recovers near-unity peak", () => {
    const fs = 44100;
    for (const phase of [0, 0.3, 0.7, 1.1, 1.9, 2.6]) {
      const x = sine(11025, 1.0, 0.05, fs, phase);
      const tp = truePeakOf(x);
      expect(tp).toBeGreaterThan(0.93);
      expect(tp).toBeLessThan(1.06);
    }
  });

  it("equals sample peak for low-frequency content", () => {
    const x = sine(100, 0.5, 0.2);
    expect(truePeakOf(x)).toBeCloseTo(0.5, 2);
  });

  it("rejects empty and non-finite input", () => {
    expect(() => truePeakOf(new Float32Array(0))).toThrow();
    const bad = new Float32Array(64);
    bad[5] = NaN;
    expect(() => truePeakOf(bad)).toThrow(/NaN/);
  });

  it("keeps a genuine peak located at the very last sample", () => {
    const x = new Float32Array(256);
    x[255] = 0.9;
    expect(truePeakOf(x)).toBeCloseTo(0.9, 4);
  });

  it("handles signals shorter than the FIR window via the sample-peak floor", () => {
    const x = new Float32Array(10).fill(0.3);
    expect(truePeakOf(x)).toBeCloseTo(0.3, 5);
  });
});

describe("analysis structure and LRA", () => {
  it("reports BS.1770 block geometry (400 ms block, 100 ms hop)", () => {
    const r = analyzeLoudness([sine(1000, 0.1, 10)], FS);
    expect(r.blockSamples).toBe(Math.round(FS * 0.4));
    expect(r.hopSamples).toBe(Math.round(FS * 0.1));
    const expectedBlocks = 1 + Math.floor((FS * 10 - r.blockSamples) / r.hopSamples);
    expect(r.momentary.length).toBe(expectedBlocks);
    // short-term needs 3 s of blocks: 30 hops per value
    expect(r.shortTerm.length).toBe(expectedBlocks - Math.round(FS * 3 / r.hopSamples) + 1);
    expect(r.sampleRate).toBe(FS);
  });

  it("constant-level programme has LRA near zero, stepped programme has wide LRA", () => {
    const steady = analyzeLoudness([sine(1000, 0.1, 20)], FS);
    expect(steady.lra).toBeLessThan(0.5);

    // 10 s at -20 dBFS then 10 s at -40 dBFS => ~20 LU range
    const n = FS * 10;
    const x = new Float32Array(n * 2);
    const loud = sine(1000, 0.1, 10);
    const quiet = sine(1000, 0.01, 10);
    x.set(loud, 0);
    x.set(quiet, n);
    const stepped = analyzeLoudness([x], FS);
    expect(stepped.lra).toBeGreaterThan(10);
  });

  it("signal shorter than one 400 ms block yields no blocks and -Infinity", () => {
    const r = analyzeLoudness([sine(1000, 0.5, 0.2)], FS);
    expect(r.momentary.length).toBe(0);
    expect(r.integrated).toBe(-Infinity);
    // true peak still works
    expect(r.truePeak).toBeCloseTo(0.5, 2);
  });

  it("rejects mismatched channel lengths", () => {
    expect(() =>
      analyzeLoudness([new Float32Array(FS), new Float32Array(FS / 2)], FS),
    ).toThrow(/mismatch/);
  });
});
