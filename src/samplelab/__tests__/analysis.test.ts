/**
 * Sample Lab DSP module tests (node env) — per-module edge cases:
 *  - silence input: everything defined, nothing NaN-poisoned
 *  - 0.2 s short input: graceful, empty-safe report
 *  - sine 440 Hz → centroid ≈ 440 Hz and pitch = A4 ±2¢
 *  - synthetic binaural pair (L 200 / R 210) → Δf = 10 Hz flagged
 *  - looped audio → loop detected with the right period
 *  - white noise → flatness ≈ 1
 *  - 120 BPM click track → tempo within ±3 BPM
 *  - NaN/Infinity guards (sanitize, never throw)
 *  - chunked + cancellable: AbortSignal rejects with AnalysisCancelled
 *  - 45-min long-file performance budget (frame caps keep work bounded)
 *
 * Run: `npm test`.
 */

import { describe, expect, it } from 'vitest';
import {
  AnalysisCancelled,
  analyzeAudio,
  analyzeTempo,
  detectLoop,
  interChannelCorrelation,
  monoMix,
  octaveBandEnergies,
  pitchTrack,
  sanitizeChannel,
  spectralStats,
  computeStft,
  type AudioData,
} from '../analysis';

// ---------------------------------------------------------- synth helpers

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sine(fs: number, hz: number, dur: number, amp = 0.5, phase = 0): Float32Array {
  const n = Math.round(fs * dur);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = amp * Math.sin((2 * Math.PI * hz * i) / fs + phase);
  return x;
}

function whiteNoise(fs: number, dur: number, amp = 0.5, seed = 7): Float32Array {
  const rnd = mulberry32(seed);
  const n = Math.round(fs * dur);
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = amp * (rnd() * 2 - 1);
  return x;
}

function clickTrack(fs: number, bpm: number, beats: number): Float32Array {
  const period = 60 / bpm;
  const n = Math.round(fs * period * beats + fs * 0.5);
  const x = new Float32Array(n);
  const rnd = mulberry32(11);
  const clickLen = Math.round(fs * 0.02);
  for (let b = 0; b < beats; b++) {
    const off = Math.round(b * period * fs);
    for (let i = 0; i < clickLen && off + i < n; i++) {
      x[off + i] += 0.9 * (rnd() * 2 - 1) * Math.exp(-i / (clickLen / 6));
    }
  }
  return x;
}

const stereo = (l: Float32Array, r: Float32Array, fs: number): AudioData => ({ channels: [l, r], sampleRate: fs });
const monoFile = (m: Float32Array, fs: number): AudioData => ({ channels: [m], sampleRate: fs });

function median(arr: ArrayLike<number>): number {
  const s = Array.from(arr as ArrayLike<number> as unknown as number[]).filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
}

// --------------------------------------------------------------- silence

describe('silence input', () => {
  it('produces a fully-defined, unpoisoned report', async () => {
    const fs = 8000;
    const silent = new Float32Array(fs * 2);
    const rep = await analyzeAudio(stereo(silent, silent, fs));
    expect(rep.durationSec).toBeCloseTo(2, 5);
    expect(rep.loudness.integrated).toBe(-Infinity);
    expect(rep.loudness.truePeakDb).toBe(-Infinity);
    expect(rep.spectral.centroidHz.every((v) => v === 0)).toBe(true);
    expect(rep.spectral.flatness.every((v) => v === 0)).toBe(true);
    expect(rep.tempo.bpm).toBeNull();
    expect(rep.stereo.binaural.detected).toBe(false);
    expect(rep.pitch.medianHz).toBeNull();
    expect(rep.pitch.frames.every((f) => !Number.isFinite(f.f0))).toBe(true);
    expect(rep.loop.detected).toBe(false);
    expect(rep.bands.share.reduce((a, b) => a + b, 0)).toBe(0);
    // no stray NaN in headline numbers
    expect(Number.isNaN(rep.loudness.lra)).toBe(false);
    expect(rep.stereo.midDb).toBe(-Infinity);
  });
});

// ----------------------------------------------------------- short input

describe('0.2 s short input', () => {
  it('analyzes without throwing and degrades gracefully', async () => {
    const fs = 8000;
    const x = sine(fs, 440, 0.2);
    const rep = await analyzeAudio(monoFile(x, fs));
    expect(rep.durationSec).toBeCloseTo(0.2, 5);
    expect(rep.spectrogram.frames).toBe(0); // shorter than one 2048 window
    expect(rep.pitch.frames.length).toBe(0); // shorter than one YIN frame
    expect(rep.tempo.bpm).toBeNull();
    expect(rep.loop.evaluated).toBe(false);
    expect(rep.stereo.binaural.possible).toBe(false); // mono
    expect(Number.isFinite(rep.loudness.truePeak)).toBe(true);
    expect(rep.loudness.truePeak).toBeGreaterThan(0.4);
  });
});

// ------------------------------------------------------------- sine 440

describe('sine 440 Hz', () => {
  const fs = 44100;
  it('spectral centroid ≈ 440 Hz', async () => {
    const x = sine(fs, 440, 2);
    const rep = await analyzeAudio(monoFile(x, fs));
    const c = median(rep.spectral.centroidHz);
    expect(Math.abs(c - 440)).toBeLessThan(5);
  });

  it('YIN pitch track reads A4 within ±2¢', async () => {
    const x = sine(fs, 440, 2);
    const pitch = await pitchTrack(monoMix([x]), fs);
    expect(pitch.medianHz).not.toBeNull();
    const cents = 1200 * Math.log2((pitch.medianHz as number) / 440);
    expect(Math.abs(cents)).toBeLessThan(2);
    expect(pitch.noteName).toBe('A4');
    expect(pitch.midi).toBe(69);
    expect(Math.abs(pitch.cents as number)).toBeLessThan(2);
    expect(pitch.voicedFraction).toBeGreaterThan(0.9);
  });

  it('flatness stays near 0 (tone, not hiss)', async () => {
    const x = sine(fs, 440, 2);
    const rep = await analyzeAudio(monoFile(x, fs));
    const flat = median(rep.spectral.flatness);
    expect(flat).toBeLessThan(0.1);
  });
});

// ---------------------------------------------------------- white noise

describe('white noise', () => {
  it('smoothed spectral flatness ≈ 1', async () => {
    const fs = 8000;
    const x = whiteNoise(fs, 2);
    const spec = await computeStft(monoMix([x]), fs);
    const stats = spectralStats(spec, fs);
    const tail = Array.from(stats.flatness.slice(16)); // skip EMA warmup
    const flat = tail.reduce((a, b) => a + b, 0) / tail.length;
    expect(flat).toBeGreaterThan(0.8);
    expect(flat).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------- binaural synthetic

describe('binaural construction detection', () => {
  it('flags L 200 Hz / R 210 Hz as a dichotic pair with Δf ≈ 10 Hz', async () => {
    const fs = 8000;
    const l = sine(fs, 200, 3);
    const r = sine(fs, 210, 3);
    const rep = await analyzeAudio(stereo(l, r, fs));
    const b = rep.stereo.binaural;
    expect(b.possible).toBe(true);
    expect(b.detected).toBe(true);
    expect(Math.abs((b.deltaFHz as number) - 10)).toBeLessThanOrEqual(1.5);
    expect(Math.abs((b.carrierLeftHz as number) - 200)).toBeLessThan(3);
    expect(Math.abs((b.carrierRightHz as number) - 210)).toBeLessThan(3);
    expect(Math.abs(b.correlation)).toBeLessThan(0.4);
  });

  it('does not flag a correlated mono-summed pair', async () => {
    const fs = 8000;
    const l = sine(fs, 200, 3);
    const r = sine(fs, 210, 3);
    const m = monoMix([l, r]); // both tones in both channels
    const rep = await analyzeAudio(stereo(m, m, fs));
    expect(rep.stereo.binaural.detected).toBe(false);
    expect(interChannelCorrelation(m, m)).toBeCloseTo(1, 5);
  });
});

// ----------------------------------------------------------------- tempo

describe('tempo on a 120 BPM click track', () => {
  it('reads 120 ± 3 BPM with onsets on the grid', async () => {
    const fs = 8000;
    const x = clickTrack(fs, 120, 16);
    const tempo = await analyzeTempo(x, fs);
    expect(tempo.bpm).not.toBeNull();
    expect(Math.abs((tempo.bpm as number) - 120)).toBeLessThanOrEqual(3);
    expect(tempo.onsetsSec.length).toBeGreaterThanOrEqual(12);
    expect(tempo.confidence).toBeGreaterThan(0.15);
  });

  it('does not crash on arrhythmic noise', async () => {
    const fs = 8000;
    const tempo = await analyzeTempo(whiteNoise(fs, 6, 0.3, 99), fs);
    // any bpm outcome is content, but the contract must hold: null or 30–240
    if (tempo.bpm !== null) {
      expect(tempo.bpm).toBeGreaterThanOrEqual(29);
      expect(tempo.bpm).toBeLessThanOrEqual(241);
    }
  });
});

// ------------------------------------------------------------------ loop

describe('loop detector', () => {
  it('detects a 4 s loop repeated 6× and reports its period', async () => {
    const fs = 8000;
    const loopSec = 4;
    const rnd = mulberry32(42);
    const n = Math.round(fs * loopSec);
    const cell = new Float32Array(n);
    // Each second of the cell gets a distinct partial + noise bed, so the
    // 1-s band fingerprints differ within the loop and repeat only at the
    // loop period (a spectrally stationary loop is genuinely ambiguous).
    for (let i = 0; i < n; i++) {
      const sec = Math.floor(i / fs);
      const partial = 200 + 60 * sec;
      cell[i] =
        (rnd() * 2 - 1) * 0.06 +
        0.4 * Math.sin((2 * Math.PI * partial * i) / fs) +
        0.2 * Math.sin((2 * Math.PI * partial * 2.02 * i) / fs);
    }
    const full = new Float32Array(n * 6);
    for (let k = 0; k < 6; k++) full.set(cell, k * n);
    const rep = await analyzeAudio(monoFile(full, fs));
    expect(rep.loop.evaluated).toBe(true);
    expect(rep.loop.detected).toBe(true);
    expect(Math.abs((rep.loop.periodSec as number) - loopSec)).toBeLessThanOrEqual(0.25);
    expect(rep.loop.score).toBeGreaterThan(0.9);
  });

  it('does not flag non-looping structured audio', async () => {
    const fs = 8000;
    // 16 s of slowly gliding tones — structured but never repeating
    const n = fs * 16;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / fs;
      const f = 180 + 90 * t;
      x[i] = 0.4 * Math.sin(2 * Math.PI * f * t) + 0.2 * Math.sin(2 * Math.PI * f * 1.5 * t);
    }
    const spec = await computeStft(monoMix([x]), fs);
    const loop = detectLoop(spec, fs, 16);
    expect(loop.evaluated).toBe(true);
    expect(loop.detected).toBe(false);
  });
});

// ------------------------------------------------------------ NaN guards

describe('NaN / Infinity guards', () => {
  it('sanitizeChannel zeroes non-finite samples and counts them', () => {
    const x = new Float32Array([0, NaN, 0.5, Infinity, -Infinity, 0.25]);
    const { clean, replaced } = sanitizeChannel(x);
    expect(replaced).toBe(3);
    expect(Array.from(clean)).toEqual([0, 0, 0.5, 0, 0, 0.25]);
  });

  it('a corrupted decode still yields a full report', async () => {
    const fs = 8000;
    const x = sine(fs, 100, 1);
    x[100] = NaN;
    x[2000] = Infinity;
    x[5000] = -Infinity;
    const rep = await analyzeAudio(monoFile(x, fs));
    expect(rep.sanitizedSamples).toBe(3);
    expect(Number.isFinite(rep.loudness.integrated)).toBe(true);
    expect(rep.pitch.medianHz).not.toBeNull();
  });
});

// ------------------------------------------------------------ cancellation

describe('chunked + cancellable', () => {
  it('reports progress and aborts with AnalysisCancelled', async () => {
    const fs = 8000;
    const x = whiteNoise(fs, 30, 0.3, 5);
    const ac = new AbortController();
    const stages: string[] = [];
    const p = analyzeAudio(stereo(x, x, fs), {
      signal: ac.signal,
      onProgress: (fraction: number, stage: string) => {
        stages.push(stage);
        if (fraction > 0.1) ac.abort();
      },
    });
    await expect(p).rejects.toBeInstanceOf(AnalysisCancelled);
    expect(stages.length).toBeGreaterThan(0);
  });

  it('an already-aborted signal rejects before doing work', async () => {
    const ac = new AbortController();
    ac.abort();
    await expect(analyzeAudio(monoFile(new Float32Array(8000), 8000), { signal: ac.signal })).rejects.toBeInstanceOf(
      AnalysisCancelled,
    );
  });
});

// ------------------------------------------- long-file performance budget

describe('45-min long file', () => {
  it(
    'stays within frame caps and a generous time budget',
    async () => {
      const fs = 1000;
      const dur = 45 * 60;
      const n = fs * dur; // 2.7M samples per channel
      const cell = whiteNoise(fs, 1, 0.4, 3);
      const l = new Float32Array(n);
      for (let off = 0; off < n; off += cell.length) l.set(cell.subarray(0, Math.min(cell.length, n - off)), off);
      const t0 = Date.now();
      const rep = await analyzeAudio(stereo(l, l, fs), { maxStftFrames: 2048, maxPitchFrames: 512 });
      const elapsed = Date.now() - t0;
      expect(rep.durationSec).toBeCloseTo(dur, 3);
      expect(rep.spectrogram.frames).toBeLessThanOrEqual(2048);
      expect(rep.pitch.frames.length).toBeLessThanOrEqual(512);
      expect(rep.stereo.correlationSeries.length).toBeLessThanOrEqual(2048);
      expect(rep.tempo.bpm).toBeNull(); // tempo grid correctly refuses 45 min
      expect(elapsed).toBeLessThan(45_000);
      console.log(`45-min analysis completed in ${elapsed} ms (internal clock ${rep.elapsedMs} ms)`);
    },
    120_000,
  );
});

// ------------------------------------------------- octave bands (sanity)

describe('octave-band energy', () => {
  it('concentrates a 250 Hz sine in the 250 Hz band', async () => {
    const fs = 8000;
    const x = sine(fs, 250, 2);
    const spec = await computeStft(monoMix([x]), fs);
    const bands = octaveBandEnergies(spec, fs);
    const idx = bands.centersHz.indexOf(250);
    expect(idx).toBeGreaterThan(-1);
    const top = bands.share.indexOf(Math.max(...bands.share));
    expect(top).toBe(idx);
    expect(bands.share[idx]).toBeGreaterThan(0.8);
  });
});
