import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SEED,
  aWeightMagnitude,
  createGaussian,
  createPrng,
  dbToLin,
  fftInPlace,
  isochronicGate,
  linToDb,
  normalizeRms,
  renderBinaural,
  renderBowl,
  renderIsochronic,
  renderMonaural,
  renderNature,
  renderNoise,
  renderPhase,
  TWO_PI,
} from '../synth';
import type { NatureKind, NoiseColor, Phase, PhaseOffsets } from '../types';

const SR = 48000;
const ZERO: PhaseOffsets = { left: 0, right: 0, beat: 0 };

function makePhase(overrides: Partial<Phase> = {}): Phase {
  return {
    durationSec: 1,
    carrierHz: 200,
    beatHz: 10,
    mode: 'binaural',
    gainDb: 0,
    ...overrides,
  };
}

function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / Math.max(1, buf.length));
}

function peak(buf: Float32Array): number {
  let p = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf[i]);
    if (a > p) p = a;
  }
  return p;
}

/** Dominant FFT bin frequency in Hz. */
function dominantFreq(buf: Float32Array, sampleRate: number): number {
  let size = 1;
  while (size < buf.length) size <<= 1;
  const re = new Float32Array(size);
  const im = new Float32Array(size);
  re.set(buf);
  fftInPlace(re, im, false);
  let best = 0;
  let bestMag = 0;
  for (let k = 1; k < size / 2; k++) {
    const mag = re[k] * re[k] + im[k] * im[k];
    if (mag > bestMag) {
      bestMag = mag;
      best = k;
    }
  }
  return (best * sampleRate) / size;
}

/** Mean power in the octave band [f0, 2*f0). */
function bandPower(buf: Float32Array, sampleRate: number, f0: number): number {
  let size = 1;
  while (size < buf.length) size <<= 1;
  const re = new Float32Array(size);
  const im = new Float32Array(size);
  re.set(buf);
  fftInPlace(re, im, false);
  const binHz = sampleRate / size;
  let sum = 0;
  let count = 0;
  for (let k = 1; k < size / 2; k++) {
    const f = k * binHz;
    if (f >= f0 && f < 2 * f0) {
      sum += re[k] * re[k] + im[k] * im[k];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

describe('dbToLin / linToDb', () => {
  it('round-trips and hits reference points', () => {
    expect(dbToLin(0)).toBeCloseTo(1, 12);
    expect(dbToLin(-6)).toBeCloseTo(0.5011872, 6);
    expect(dbToLin(20)).toBeCloseTo(10, 12);
    expect(linToDb(1)).toBeCloseTo(0, 12);
    expect(linToDb(dbToLin(-13.7))).toBeCloseTo(-13.7, 10);
  });

  it('floors silence at -300 dB instead of -Infinity', () => {
    expect(linToDb(0)).toBe(-300);
    expect(Number.isFinite(linToDb(0))).toBe(true);
  });
});

describe('createPrng / createGaussian', () => {
  it('is deterministic for a given seed and differs across seeds', () => {
    const a = createPrng(42);
    const b = createPrng(42);
    const c = createPrng(43);
    for (let i = 0; i < 10; i++) {
      expect(a()).toBe(b());
    }
    const seqA = Array.from({ length: 8 }, () => createPrng(42)());
    const seqC = Array.from({ length: 8 }, () => createPrng(43)());
    expect(seqA).not.toEqual(seqC);
    expect(c()).not.toBe(createPrng(42)());
  });

  it('stays in [0, 1)', () => {
    const prng = createPrng(7);
    for (let i = 0; i < 10000; i++) {
      const v = prng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('gaussian has ~zero mean and ~unit variance', () => {
    const gauss = createGaussian(createPrng(1234));
    let sum = 0;
    let sumSq = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const v = gauss();
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / n;
    const variance = sumSq / n - mean * mean;
    expect(Math.abs(mean)).toBeLessThan(0.03);
    expect(variance).toBeGreaterThan(0.95);
    expect(variance).toBeLessThan(1.05);
  });
});

describe('renderBinaural', () => {
  it('renders carrier on left and carrier+beat on right', () => {
    const r = renderBinaural(makePhase({ carrierHz: 200, beatHz: 10 }), SR);
    expect(r.left.length).toBe(SR);
    expect(dominantFreq(r.left, SR)).toBeCloseTo(200, 0);
    expect(dominantFreq(r.right, SR)).toBeCloseTo(210, 0);
    expect(r.warnings).toEqual([]);
  });

  it('is phase-continuous when chained via offsets', () => {
    const first = renderBinaural(makePhase({ durationSec: 0.5 }), SR, ZERO);
    const second = renderBinaural(makePhase({ durationSec: 0.5 }), SR, first.offsets);
    const joined = new Float32Array(first.left.length + second.left.length);
    joined.set(first.left);
    joined.set(second.left, first.left.length);
    const single = renderBinaural(makePhase({ durationSec: 1 }), SR, ZERO);
    let maxDiff = 0;
    for (let i = 0; i < joined.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(joined[i] - single.left[i]));
    }
    expect(maxDiff).toBeLessThan(1e-4);
  });

  it('returns an empty buffer for zero duration', () => {
    const r = renderBinaural(makePhase({ durationSec: 0 }), SR);
    expect(r.left.length).toBe(0);
    expect(r.right.length).toBe(0);
  });

  it('renders silence plus a warning for NaN parameters', () => {
    const r = renderBinaural(makePhase({ carrierHz: Number.NaN }), SR);
    expect(peak(r.left)).toBe(0);
    expect(r.warnings.some((w) => w.includes('NaN'))).toBe(true);
  });

  it('renders silence plus a warning for negative frequency', () => {
    const r = renderBinaural(makePhase({ carrierHz: -100 }), SR);
    expect(peak(r.left)).toBe(0);
    expect(r.warnings.some((w) => w.includes('negative'))).toBe(true);
  });

  it('warns when the beat exceeds the 30 Hz binaural percept limit', () => {
    const r = renderBinaural(makePhase({ beatHz: 40 }), SR);
    expect(r.warnings.some((w) => w.includes('30 Hz'))).toBe(true);
    // Still renders audio — warnings are advisory.
    expect(peak(r.left)).toBeGreaterThan(0.9);
  });

  it('warns when the carrier exceeds 1000 Hz for binaural', () => {
    const r = renderBinaural(makePhase({ carrierHz: 1200, beatHz: 10 }), SR);
    expect(r.warnings.some((w) => w.includes('1000 Hz'))).toBe(true);
  });

  it('warns above Nyquist', () => {
    const r = renderBinaural(makePhase({ carrierHz: 20000, beatHz: 5000 }), SR);
    expect(r.warnings.some((w) => w.includes('Nyquist'))).toBe(true);
  });
});

describe('renderMonaural', () => {
  it('produces identical channels with 100% AM depth', () => {
    const r = renderMonaural(makePhase({ mode: 'monaural', carrierHz: 180, beatHz: 8 }), SR);
    expect(r.left).toEqual(r.right);
    // Full-depth envelope reaches both 0 and ~1 times the carrier peak.
    expect(peak(r.left)).toBeGreaterThan(0.95);
    let minEnv = Infinity;
    for (let i = 0; i < r.left.length; i += 7) {
      minEnv = Math.min(minEnv, Math.abs(r.left[i]));
    }
    expect(minEnv).toBeLessThan(0.02);
    expect(dominantFreq(r.left, SR)).toBeCloseTo(180, 0);
  });

  it('keeps beat phase continuous across chained calls', () => {
    const a = renderMonaural(makePhase({ mode: 'monaural', durationSec: 0.3 }), SR, ZERO);
    const b = renderMonaural(makePhase({ mode: 'monaural', durationSec: 0.3 }), SR, a.offsets);
    const single = renderMonaural(makePhase({ mode: 'monaural', durationSec: 0.6 }), SR, ZERO);
    let maxDiff = 0;
    for (let i = 0; i < a.left.length; i++) {
      maxDiff = Math.max(maxDiff, Math.abs(b.left[i] - single.left[i + a.left.length]));
    }
    expect(maxDiff).toBeLessThan(1e-4);
  });
});

describe('isochronicGate', () => {
  it('is bounded in [0, 1] and reaches both extremes', () => {
    let max = 0;
    let min = 1;
    for (let i = 0; i <= 10000; i++) {
      const g = isochronicGate(i / 10000);
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
      max = Math.max(max, g);
      min = Math.min(min, g);
    }
    expect(max).toBeGreaterThan(0.999);
    expect(min).toBeLessThan(0.001);
  });

  it('half-amplitude duty cycle matches the requested duty', () => {
    for (const duty of [0.2, 0.5, 0.8]) {
      let above = 0;
      const n = 100000;
      for (let i = 0; i < n; i++) {
        if (isochronicGate(i / n, duty) > 0.5) above++;
      }
      expect(above / n).toBeCloseTo(duty, 2);
    }
  });

  it('clamps out-of-range duty without producing NaN', () => {
    for (const duty of [0, -1, 1, 2]) {
      for (let i = 0; i < 100; i++) {
        expect(Number.isFinite(isochronicGate(i / 100, duty))).toBe(true);
      }
    }
  });

  it('wraps continuously across the cycle boundary (phase near 1 ≡ phase near 0)', () => {
    // Inputs just below 1 are shifted by exactly -1 internally, so
    // gate(1 - e) must equal gate(-e): the rising edge straddles the wrap.
    for (let i = 1; i < 100; i++) {
      const e = i / 10000;
      expect(isochronicGate(1 - e)).toBeCloseTo(isochronicGate(-e), 12);
    }
    // And the wrapped value joins smoothly onto gate(0+) = 0.5 region.
    expect(Math.abs(isochronicGate(0.9999) - isochronicGate(0.0001))).toBeLessThan(0.15);
  });
});

describe('renderIsochronic', () => {
  it('gates the carrier at the beat rate', () => {
    const r = renderIsochronic(makePhase({ mode: 'isochronic', carrierHz: 240, beatHz: 10 }), SR);
    // Count gate bursts via a coarse energy envelope: expect ~10 in 1 s.
    const win = Math.floor(SR / 200); // 5 ms windows
    let bursts = 0;
    let inBurst = false;
    for (let i = 0; i + win <= r.left.length; i += win) {
      let e = 0;
      for (let j = 0; j < win; j++) e += r.left[i + j] * r.left[i + j];
      const on = e / win > 0.05;
      if (on && !inBurst) bursts++;
      inBurst = on;
    }
    expect(bursts).toBe(10);
    expect(dominantFreq(r.left, SR)).toBeCloseTo(240, 0);
  });
});

describe('renderNoise', () => {
  const colors: NoiseColor[] = ['white', 'pink', 'brown', 'blue', 'violet', 'grey'];

  it('is deterministic per seed and color', () => {
    for (const color of colors) {
      const a = renderNoise(color, 0.5, SR, 99);
      const b = renderNoise(color, 0.5, SR, 99);
      expect(a).toEqual(b);
      const c = renderNoise(color, 0.5, SR, 100);
      expect(a).not.toEqual(c);
    }
  });

  it('normalizes every color to unit RMS', () => {
    for (const color of colors) {
      const buf = renderNoise(color, 2, SR);
      expect(rms(buf)).toBeCloseTo(1, 1);
    }
  });

  it('returns empty for zero duration', () => {
    expect(renderNoise('white', 0, SR).length).toBe(0);
    expect(renderNoise('pink', -5, SR).length).toBe(0);
  });

  it('white noise has a flat spectrum (octave powers within ~4 dB)', () => {
    const buf = renderNoise('white', 4, SR, 5);
    const low = bandPower(buf, SR, 500);
    const high = bandPower(buf, SR, 8000);
    const ratioDb = 10 * Math.log10(high / low);
    expect(Math.abs(ratioDb)).toBeLessThan(4);
  });

  it('pink noise falls ~3 dB/octave', () => {
    const buf = renderNoise('pink', 4, SR, 5);
    const octaves = [250, 500, 1000, 2000, 4000].map((f) => bandPower(buf, SR, f));
    for (let i = 1; i < octaves.length; i++) {
      const slopeDb = 10 * Math.log10(octaves[i] / octaves[i - 1]);
      expect(slopeDb).toBeGreaterThan(-5);
      expect(slopeDb).toBeLessThan(-1.5);
    }
  });

  it('brown noise falls faster than pink (~6 dB/octave)', () => {
    const buf = renderNoise('brown', 4, SR, 5);
    const slopeDb = 10 * Math.log10(bandPower(buf, SR, 2000) / bandPower(buf, SR, 500));
    expect(slopeDb).toBeLessThan(-8);
    expect(slopeDb).toBeGreaterThan(-16);
  });

  it('violet noise rises with frequency', () => {
    const buf = renderNoise('violet', 4, SR, 5);
    const slopeDb = 10 * Math.log10(bandPower(buf, SR, 8000) / bandPower(buf, SR, 1000));
    expect(slopeDb).toBeGreaterThan(8);
  });

  it('aWeightMagnitude is 1 at 1 kHz and attenuates deep bass', () => {
    expect(aWeightMagnitude(1000)).toBeCloseTo(1, 10);
    expect(aWeightMagnitude(40)).toBeLessThan(0.6);
    expect(aWeightMagnitude(0)).toBe(0);
  });
});

describe('renderBowl', () => {
  it('decays exponentially after a strike', () => {
    const buf = renderBowl({ baseHz: 136, level: 1, decaySec: 1 }, 4, SR, 11);
    const env = (from: number, to: number): number => rms(buf.subarray(from * SR, to * SR));
    const first = env(0.05, 0.5);
    const second = env(1.05, 1.5);
    const third = env(2.05, 2.5);
    expect(first).toBeGreaterThan(second);
    expect(second).toBeGreaterThan(third);
  });

  it('re-strikes on the configured interval', () => {
    const buf = renderBowl({ baseHz: 136, level: 1, decaySec: 0.3, restrikeSec: 1 }, 3, SR, 11);
    // Energy right after each strike should exceed energy just before it.
    const before = rms(buf.subarray(0.9 * SR, 0.99 * SR));
    const after = rms(buf.subarray(1.01 * SR, 1.1 * SR));
    expect(after).toBeGreaterThan(before * 2);
  });

  it('is deterministic per seed and differs across seeds', () => {
    const a = renderBowl({ baseHz: 200, level: 1 }, 1, SR, 1);
    const b = renderBowl({ baseHz: 200, level: 1 }, 1, SR, 1);
    const c = renderBowl({ baseHz: 200, level: 1 }, 1, SR, 2);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('renders silence for invalid baseHz without throwing', () => {
    expect(peak(renderBowl({ baseHz: 0, level: 1 }, 1, SR))).toBe(0);
    expect(peak(renderBowl({ baseHz: Number.NaN, level: 1 }, 1, SR))).toBe(0);
    expect(peak(renderBowl({ baseHz: -10, level: 1 }, 1, SR))).toBe(0);
  });

  it('contains the default inharmonic partials', () => {
    const buf = renderBowl({ baseHz: 100, level: 1, decaySec: 6 }, 2, SR, 3);
    let size = 1;
    while (size < buf.length) size <<= 1;
    const re = new Float32Array(size);
    const im = new Float32Array(size);
    re.set(buf);
    fftInPlace(re, im, false);
    const magAt = (hz: number): number => {
      const k = Math.round((hz * size) / SR);
      return Math.sqrt(re[k] * re[k] + im[k] * im[k]);
    };
    expect(magAt(276)).toBeGreaterThan(0);
    expect(magAt(540)).toBeGreaterThan(0);
  });
});

describe('renderNature', () => {
  const kinds: NatureKind[] = ['rain', 'ocean', 'stream', 'fire', 'thunder'];

  it('produces deterministic, non-silent audio for every kind', () => {
    for (const kind of kinds) {
      const a = renderNature(kind, 1, SR, 17);
      const b = renderNature(kind, 1, SR, 17);
      expect(a).toEqual(b);
      expect(rms(a)).toBeGreaterThan(0.01);
      expect(Number.isFinite(peak(a))).toBe(true);
    }
  });

  it('returns empty for zero duration', () => {
    expect(renderNature('rain', 0, SR).length).toBe(0);
  });

  it('thunder is darker than stream (more low-band energy)', () => {
    const thunder = renderNature('thunder', 4, SR, 23);
    const stream = renderNature('stream', 4, SR, 23);
    const lowRatio = (buf: Float32Array): number =>
      bandPower(buf, SR, 75) / (bandPower(buf, SR, 75) + bandPower(buf, SR, 2000));
    expect(lowRatio(thunder)).toBeGreaterThan(lowRatio(stream));
  });
});

describe('renderPhase', () => {
  it('applies phase gain to the tone', () => {
    const unity = renderPhase(makePhase({ gainDb: 0 }), SR);
    const down = renderPhase(makePhase({ gainDb: -6 }), SR);
    expect(peak(down.left)).toBeCloseTo(peak(unity.left) * dbToLin(-6), 3);
  });

  it('mixes a noise layer only when level > 0', () => {
    const toneOnly = renderPhase(makePhase(), SR, ZERO, 7);
    const withNoise = renderPhase(makePhase({ noise: { color: 'white', level: 0.8 } }), SR, ZERO, 7);
    expect(withNoise.left).not.toEqual(toneOnly.left);
    const zeroLevel = renderPhase(makePhase({ noise: { color: 'white', level: 0 } }), SR, ZERO, 7);
    expect(zeroLevel.left).toEqual(toneOnly.left);
  });

  it('skips layers with NaN level without corrupting the tone', () => {
    const r = renderPhase(makePhase({ noise: { color: 'white', level: Number.NaN } }), SR);
    const toneOnly = renderPhase(makePhase(), SR);
    expect(r.left).toEqual(toneOnly.left);
  });

  it('renders silence with warnings for a fully invalid phase', () => {
    const r = renderPhase(makePhase({ carrierHz: Number.POSITIVE_INFINITY }), SR);
    expect(peak(r.left)).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('handles zero-duration phases as empty output', () => {
    const r = renderPhase(makePhase({ durationSec: 0 }), SR);
    expect(r.left.length).toBe(0);
  });

  it('normalizes silence without NaN (normalizeRms no-op)', () => {
    const silent = new Float32Array(1024);
    normalizeRms(silent, 1);
    expect(peak(silent)).toBe(0);
  });

  it('keeps every mode under ±1.2 peak at unity gain', () => {
    for (const mode of ['binaural', 'monaural', 'isochronic'] as const) {
      const r = renderPhase(makePhase({ mode }), SR);
      expect(peak(r.left)).toBeLessThanOrEqual(1.0001);
      expect(peak(r.right)).toBeLessThanOrEqual(1.0001);
    }
  });
});

describe('fftInPlace', () => {
  it('recovers a pure tone bin and inverts exactly', () => {
    const n = 4096;
    const re = new Float32Array(n);
    const im = new Float32Array(n);
    for (let i = 0; i < n; i++) re[i] = Math.sin((TWO_PI * 7 * i) / n);
    const original = re.slice();
    fftInPlace(re, im, false);
    const bin7 = Math.sqrt(re[7] * re[7] + im[7] * im[7]);
    expect(bin7).toBeGreaterThan(n * 0.49);
    fftInPlace(re, im, true);
    for (let i = 0; i < n; i++) expect(re[i]).toBeCloseTo(original[i], 5);
  });
});

describe('DEFAULT_SEED', () => {
  it('is the documented default', () => {
    expect(DEFAULT_SEED).toBe(0x1a2b3c4d);
  });
});
