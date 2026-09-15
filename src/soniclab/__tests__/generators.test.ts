/**
 * Sonic Lab generator tests — math verification per research/math_sound_synthesis.md (E2).
 */

import { describe, expect, it } from 'vitest';
import { amplitudeSpectrum } from '../dsp';
import {
  ASTRO_LABEL,
  astroTuner,
  barberPoleAM,
  bjorklund,
  bohlenPierce,
  BP_STEP_CENTS,
  centsToRatio,
  euclideanPattern,
  fibonacciWord,
  fractalNoise,
  goldenBeattyPattern,
  jiTable,
  logisticSequence,
  LOGISTIC_CHAOS_ONSET,
  nEDO,
  PHI,
  primePulsePattern,
  PYTHAGOREAN_COMMA_CENTS,
  ratioToCents,
  renderCustomWave,
  renderFibonacciRhythm,
  renderLogisticMod,
  renderPattern,
  renderTone,
  rissetRhythm,
  SCHISMA_CENTS,
  shepardEnvelope,
  shepardTone,
  SYNTONIC_COMMA_CENTS,
  TRAPPIST_ANCHOR_HZ,
  TRAPPIST_PERIODS_DAYS,
} from '../generators';

const SR = 24000;

function finiteAll(x: Float32Array): boolean {
  for (let i = 0; i < x.length; i++) if (!Number.isFinite(x[i])) return false;
  return true;
}

/** Linear regression slope of y on x. */
function regressionSlope(x: number[], y: number[]): number {
  const n = x.length;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
  }
  return sxy / sxx;
}

/** Octave-band mean spectrum levels (dB) from fLo to fHi. */
function octaveBandDb(samples: Float32Array, sr: number, fLo: number, fHi: number) {
  const { freqs, mags } = amplitudeSpectrum(samples, sr, 65536);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let f0 = fLo; f0 * 2 <= fHi; f0 *= 2) {
    let sum = 0;
    let count = 0;
    for (let k = 0; k < freqs.length; k++) {
      if (freqs[k] >= f0 && freqs[k] < f0 * 2) {
        sum += mags[k];
        count++;
      }
    }
    if (count > 0 && sum > 0) {
      xs.push(Math.log2(f0 * Math.SQRT2)); // band geometric center
      ys.push(20 * Math.log10(sum / count));
    }
  }
  return { xs, ys };
}

describe('shepardTone', () => {
  // Seam metric: linear extrapolation of the last two samples predicts the
  // wrap sample y(T); a periodic render must satisfy y(T) ≈ y(0) including
  // slope. (Plain |y[N−1]−y[0]| measures waveform slope, not discontinuity.)
  const seamError = (s: Float32Array) => Math.abs(2 * s[s.length - 1] - s[s.length - 2] - s[0]);

  it('seamless loop: end/start sample continuity within tolerance', () => {
    const r = shepardTone({ durationSec: 2, loop: true, sampleRate: SR, centerHz: 400, sigmaOctaves: 1 });
    expect(seamError(r.samples)).toBeLessThan(0.03);
    expect(finiteAll(r.samples)).toBe(true);
  });

  it('loop mode covers exactly 12 semitones (rate snap), seam stays small across centers', () => {
    for (const centerHz of [300, 400, 500]) {
      const r = shepardTone({ durationSec: 1.5, loop: true, sampleRate: SR, centerHz });
      expect(seamError(r.samples)).toBeLessThan(0.03);
    }
  });

  it('Gaussian envelope is normalized (peak 1 at center) and octave-symmetric', () => {
    expect(shepardEnvelope(400, 400, 1)).toBeCloseTo(1, 12);
    // ±1 octave at σ=1 → exp(−0.5)
    expect(shepardEnvelope(800, 400, 1)).toBeCloseTo(Math.exp(-0.5), 10);
    expect(shepardEnvelope(200, 400, 1)).toBeCloseTo(Math.exp(-0.5), 10);
    expect(shepardEnvelope(1600, 400, 1)).toBeCloseTo(Math.exp(-2), 10);
    expect(shepardEnvelope(440, 400, 1)).toBeLessThan(1);
  });

  it('warns on out-of-range params and infrasonic base', () => {
    const r = shepardTone({ durationSec: 1, centerHz: 800, baseHz: 12, sampleRate: SR });
    expect(r.warnings.some((w) => w.includes('outside recommended 260–500'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('infrasonic'))).toBe(true);
  });
});

describe('rissetRhythm / barberPoleAM', () => {
  it('renders clicks at finite levels and warns on insane tempo', () => {
    const r = rissetRhythm({ metabarSec: 2, baseBpm: 120, ratio: 2, sampleRate: SR });
    expect(r.samples.length).toBe(2 * SR);
    expect(finiteAll(r.samples)).toBe(true);
    let peak = 0;
    for (const v of r.samples) peak = Math.max(peak, Math.abs(v));
    expect(peak).toBeGreaterThan(0.1);
    const bad = rissetRhythm({ metabarSec: 2, baseBpm: 400, sampleRate: SR });
    expect(bad.warnings.some((w) => w.includes('BPM'))).toBe(true);
  });

  it('barber-pole loop snaps to integer beat cycles (seam-free ends)', () => {
    const r = barberPoleAM({ durationSec: 4, carrierHz: 400, sweepFromHz: 40, sampleRate: SR });
    const s = r.samples;
    // Envelope end (layer B at Ω0, phase 2πN) meets start (layer A at Ω0, phase 0).
    expect(Math.abs(s[s.length - 1] - s[0])).toBeLessThan(0.05);
    expect(finiteAll(s)).toBe(true);
  });
});

describe('bjorklund / euclidean', () => {
  const str = (pat: boolean[]) => pat.map((b) => (b ? 'x' : '.')).join('');

  it('known vectors: E(3,8) tresillo, E(5,8) cinquillo, E(5,12) bell', () => {
    expect(str(euclideanPattern(3, 8))).toBe('x..x..x.');
    expect(str(euclideanPattern(5, 8))).toBe('x.xx.xx.');
    // E(5,12) bell pattern — Bjorklund rotation (gaps 2,3,2,3,2; maximally even).
    expect(str(euclideanPattern(5, 12))).toBe('x.x..x.x..x.');
    // E(7,16) — Bjorklund rotation (gaps 2,2,3,2,2,3,2; maximally even).
    expect(str(euclideanPattern(7, 16))).toBe('x.x.x..x.x.x..x.');
  });

  it('rotation preserves hit count; rotating by n is identity', () => {
    for (const [k, n] of [[3, 8], [5, 8], [7, 16], [1, 4], [11, 32]] as const) {
      const base = bjorklund(k, n);
      expect(base.filter(Boolean).length).toBe(k);
      for (let rot = 0; rot < n; rot++) {
        const p = euclideanPattern(k, n, rot);
        expect(p.filter(Boolean).length).toBe(k);
      }
      expect(str(euclideanPattern(k, n, n))).toBe(str(euclideanPattern(k, n, 0)));
    }
  });

  it('rotation by 1 shifts the pattern left by one step', () => {
    const base = str(euclideanPattern(3, 8, 0));
    const rot1 = str(euclideanPattern(3, 8, 1));
    expect(rot1).toBe(base.slice(1) + base[0]);
  });

  it('degenerate cases: k=0 none, k=n all; invalid throws', () => {
    expect(bjorklund(0, 8).every((b) => !b)).toBe(true);
    expect(bjorklund(8, 8).every((b) => b)).toBe(true);
    expect(() => bjorklund(9, 8)).toThrow(RangeError);
  });
});

describe('number-theory patterns', () => {
  it('golden Beatty sequence matches the floor formula and density → 1/φ', () => {
    const pat = goldenBeattyPattern(64);
    for (let i = 0; i < 64; i++) {
      expect(pat[i]).toBe(Math.floor((i + 1) / PHI) - Math.floor(i / PHI) === 1);
    }
    const hits = pat.filter(Boolean).length;
    expect(hits / 64).toBeGreaterThan(1 / PHI - 0.05);
    expect(hits / 64).toBeLessThan(1 / PHI + 0.05);
  });

  it('prime pulse train hits exactly the primes', () => {
    const pat = primePulsePattern(32);
    const primes = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31];
    for (let i = 0; i < 32; i++) expect(pat[i]).toBe(primes.includes(i));
  });

  it('fibonacci word: correct iterations, symbol ratio → φ, symbol cap', () => {
    expect(fibonacciWord(1)).toBe('AB');
    expect(fibonacciWord(2)).toBe('ABA');
    expect(fibonacciWord(3)).toBe('ABAAB');
    expect(fibonacciWord(4)).toBe('ABAABABA');
    const w = fibonacciWord(10);
    const a = w.split('').filter((c) => c === 'A').length;
    const b = w.length - a;
    expect(a / b).toBeGreaterThan(PHI - 0.02);
    expect(a / b).toBeLessThan(PHI + 0.02);
    expect(fibonacciWord(99).length).toBeLessThanOrEqual(2000);
  });

  it('fibonacci rhythm carries the crit_r2 honesty note', () => {
    const r = renderFibonacciRhythm({ iterations: 5, sampleRate: SR });
    expect(r.warnings.some((w) => w.includes('zero-information'))).toBe(true);
    expect(finiteAll(r.samples)).toBe(true);
  });

  it('renderPattern gates a tone (AM control signal) with silence on rest steps', () => {
    // E(1,4): hit only on first step → 3/4 of each loop is silent.
    const r = renderPattern({ steps: euclideanPattern(1, 4), stepRate: 10, loops: 1, sampleRate: SR, toneHz: 440 });
    const stepN = SR / 10;
    const rms = (from: number, to: number) => {
      let s = 0;
      for (let i = from; i < to; i++) s += r.samples[i] ** 2;
      return Math.sqrt(s / (to - from));
    };
    expect(rms(0.1 * stepN, 0.9 * stepN)).toBeGreaterThan(0.05);
    expect(rms(1.2 * stepN, 1.8 * stepN)).toBeLessThan(1e-6);
  });
});

describe('fractalNoise', () => {
  it.each([0.5, 1, 2])('spectral slope ≈ −3.01·α dB/oct (±1) for α=%s', (alpha) => {
    const r = fractalNoise({ alpha, durationSec: 4, method: 'fft', sampleRate: SR, seed: 42 });
    const { xs, ys } = octaveBandDb(r.samples, SR, 60, 6000);
    expect(xs.length).toBeGreaterThanOrEqual(5);
    const slope = regressionSlope(xs, ys);
    const expected = -alpha * 10 * Math.log10(2); // power ∝ f^−α → −3.0103α dB/oct
    expect(Math.abs(slope - expected)).toBeLessThan(1);
  });

  it('voss-mccartney approximates pink noise (α=1) within a looser band', () => {
    const r = fractalNoise({ alpha: 1, durationSec: 8, method: 'voss', sampleRate: SR, seed: 7 });
    const { xs, ys } = octaveBandDb(r.samples, SR, 40, 4000);
    const slope = regressionSlope(xs, ys);
    expect(Math.abs(slope - -3.0103)).toBeLessThan(1.6);
  });

  it('is deterministic per seed and finite', () => {
    const a = fractalNoise({ alpha: 1, durationSec: 1, sampleRate: SR, seed: 5 });
    const b = fractalNoise({ alpha: 1, durationSec: 1, sampleRate: SR, seed: 5 });
    expect(Array.from(a.samples.slice(0, 64))).toEqual(Array.from(b.samples.slice(0, 64)));
    expect(finiteAll(a.samples)).toBe(true);
  });

  it('warns when voss is requested with α≠1', () => {
    const r = fractalNoise({ alpha: 2, method: 'voss', durationSec: 0.5, sampleRate: SR });
    expect(r.warnings.some((w) => w.includes('Voss'))).toBe(true);
  });
});

describe('logistic map', () => {
  it('r<3 converges to a fixed point (variance → 0)', () => {
    const xs = logisticSequence(2.8, 0.4, 2000);
    const tail = xs.slice(-100);
    let mean = 0;
    for (const v of tail) mean += v;
    mean /= tail.length;
    let varr = 0;
    for (const v of tail) varr += (v - mean) ** 2;
    expect(varr / tail.length).toBeLessThan(1e-10);
    // fixed point x* = 1 − 1/r
    expect(mean).toBeCloseTo(1 - 1 / 2.8, 4);
  });

  it('r=4 is chaotic (variance > 0) and stays in (0,1)', () => {
    const xs = logisticSequence(4, 0.4, 2000);
    const tail = xs.slice(-500);
    let mean = 0;
    for (const v of tail) mean += v;
    mean /= tail.length;
    let varr = 0;
    for (const v of tail) varr += (v - mean) ** 2;
    expect(varr / tail.length).toBeGreaterThan(0.02);
    for (const v of tail) {
      expect(v).toBeGreaterThan(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('renderer documents the bifurcation edge in warnings', () => {
    const fixed = renderLogisticMod({ r: 2.8, durationSec: 0.5, sampleRate: SR });
    expect(fixed.warnings.some((w) => w.includes('fixed point'))).toBe(true);
    const cascade = renderLogisticMod({ r: 3.5, durationSec: 0.5, sampleRate: SR });
    expect(cascade.warnings.some((w) => w.includes(`${LOGISTIC_CHAOS_ONSET}`))).toBe(true);
    const chaotic = renderLogisticMod({ r: 3.9, durationSec: 0.5, sampleRate: SR });
    expect(chaotic.warnings.some((w) => w.includes('fixed point'))).toBe(false);
    expect(finiteAll(chaotic.samples)).toBe(true);
  });
});

describe('renderCustomWave', () => {
  const peakNear = (samples: Float32Array, sr: number, targetHz: number, tolHz: number) => {
    const { freqs, mags } = amplitudeSpectrum(samples, sr);
    let best = 0;
    let bestF = 0;
    for (let k = 1; k < mags.length; k++) {
      if (mags[k] > best) {
        best = mags[k];
        bestF = freqs[k];
      }
    }
    let targetMag = 0;
    for (let k = 1; k < mags.length; k++) {
      if (Math.abs(freqs[k] - targetHz) < tolHz) targetMag = Math.max(targetMag, mags[k]);
    }
    return { bestF, targetRatio: targetMag / best, mags, freqs, best };
  };

  it('additive: two-harmonic stack peaks at f0 and 2f0', () => {
    const r = renderCustomWave({ type: 'additive', f0Hz: 200, harmonics: [1, 0.5], durationSec: 1, sampleRate: SR });
    const p = peakNear(r.samples, SR, 400, 8);
    expect(p.bestF).toBeGreaterThan(196);
    expect(p.bestF).toBeLessThan(204);
    expect(p.targetRatio).toBeGreaterThan(0.4);
    expect(p.targetRatio).toBeLessThan(0.6);
  });

  it('FM: sidebands at fc ± k·fm and bandwidth ≈ 2·fm·(I+1)', () => {
    const fc = 1000;
    const ratio = 1;
    const I = 2;
    const r = renderCustomWave({ type: 'fm', carrierHz: fc, modRatio: ratio, index: I, durationSec: 1, sampleRate: SR });
    const { freqs, mags } = amplitudeSpectrum(r.samples, SR);
    let maxMag = 0;
    for (let k = 0; k < mags.length; k++) maxMag = Math.max(maxMag, mags[k]);
    // Significant partials (> −40 dB) must sit on multiples of fm (= fc).
    let highest = 0;
    for (let k = 0; k < mags.length; k++) {
      if (mags[k] > maxMag * Math.pow(10, -40 / 20)) {
        const f = freqs[k];
        const nearest = Math.round(f / 1000) * 1000;
        expect(Math.abs(f - nearest)).toBeLessThan(6);
        highest = Math.max(highest, f);
      }
    }
    // Carson-rule BW = 2·fm·(I+1) = 6000 → content up to fc+3000 = 4000 Hz;
    // allow one extra sideband of slack either side.
    expect(highest).toBeGreaterThanOrEqual(2000);
    expect(highest).toBeLessThanOrEqual(6500);
  });

  it('Chebyshev T3 of a cosine is a pure 3rd harmonic (FFT verify)', () => {
    const f0 = 200;
    const r = renderCustomWave({ type: 'chebyshev', f0Hz: f0, weights: [0, 0, 0, 1], index: 1, durationSec: 1, sampleRate: SR });
    const { freqs, mags } = amplitudeSpectrum(r.samples, SR);
    // Spectral peak sits exactly at 3·f0.
    let bestF = 0;
    let best = 0;
    for (let k = 1; k < mags.length; k++) {
      if (mags[k] > best) {
        best = mags[k];
        bestF = freqs[k];
      }
    }
    expect(Math.abs(bestF - 3 * f0)).toBeLessThan(3);
    // Out-of-lobe spectral energy is < 1% of the total (main lobe ±8 Hz).
    let inLobe = 0;
    let total = 0;
    for (let k = 1; k < mags.length; k++) {
      const e = mags[k] ** 2;
      total += e;
      if (Math.abs(freqs[k] - 3 * f0) <= 8) inLobe += e;
    }
    expect(1 - inLobe / total).toBeLessThan(0.01);
    // Time-domain identity check: T3(cos θ) = cos(3θ), interior samples only
    // (skip the 5 ms edge fades).
    const n = r.samples.length;
    const s0 = Math.round(0.01 * SR);
    let maxDiff = 0;
    for (let i = s0; i < n - s0; i++) {
      const expected = 0.6 * Math.cos((2 * Math.PI * 3 * f0 * i) / SR);
      maxDiff = Math.max(maxDiff, Math.abs(r.samples[i] - expected));
    }
    expect(maxDiff).toBeLessThan(1e-3);
  });

  it('phase-distortion with knee 0.5 is a sine; other knees add harmonics', () => {
    const sine = renderCustomWave({ type: 'phase-distortion', f0Hz: 200, knee: 0.5, durationSec: 1, sampleRate: SR });
    const p = peakNear(sine.samples, SR, 200, 5);
    expect(p.bestF).toBeGreaterThan(195);
    expect(p.bestF).toBeLessThan(205);
    const { freqs, mags } = amplitudeSpectrum(sine.samples, SR);
    let fund = 0;
    let second = 0;
    for (let k = 0; k < mags.length; k++) {
      if (Math.abs(freqs[k] - 200) < 5) fund = Math.max(fund, mags[k]);
      if (Math.abs(freqs[k] - 400) < 5) second = Math.max(second, mags[k]);
    }
    expect(second / fund).toBeLessThan(0.001);
    const warped = renderCustomWave({ type: 'phase-distortion', f0Hz: 200, knee: 0.2, durationSec: 1, sampleRate: SR });
    const spec2 = amplitudeSpectrum(warped.samples, SR);
    let fund2 = 0;
    let second2 = 0;
    for (let k = 0; k < spec2.mags.length; k++) {
      if (Math.abs(spec2.freqs[k] - 200) < 5) fund2 = Math.max(fund2, spec2.mags[k]);
      if (Math.abs(spec2.freqs[k] - 400) < 5) second2 = Math.max(second2, spec2.mags[k]);
    }
    expect(second2 / fund2).toBeGreaterThan(0.05);
  });
});

describe('tuning utils', () => {
  it('ratioToCents exact values', () => {
    expect(ratioToCents(2)).toBeCloseTo(1200, 9);
    expect(ratioToCents(3 / 2)).toBeCloseTo(701.955, 2);
    expect(ratioToCents(NaN)).toBeNaN();
    expect(ratioToCents(-1)).toBeNaN();
    expect(centsToRatio(1200)).toBeCloseTo(2, 12);
  });

  it('JI table exact cent values and 12-TET deviations (E2 §3.1)', () => {
    const t = jiTable();
    const byName = new Map(t.map((r) => [r.name, r]));
    expect(byName.get('Major 2nd')!.cents).toBeCloseTo(203.91, 2);
    expect(byName.get('Major 3rd')!.cents).toBeCloseTo(386.31, 2);
    expect(byName.get('Perfect 4th')!.cents).toBeCloseTo(498.04, 2);
    expect(byName.get('Perfect 5th')!.cents).toBeCloseTo(701.96, 2);
    expect(byName.get('Major 6th')!.cents).toBeCloseTo(884.36, 2);
    expect(byName.get('Major 7th')!.cents).toBeCloseTo(1088.27, 2);
    expect(byName.get('Major 3rd')!.deviationCents).toBeCloseTo(-13.69, 2);
    expect(byName.get('Perfect 5th')!.deviationCents).toBeCloseTo(1.96, 2);
    expect(byName.get('Major 6th')!.deviationCents).toBeCloseTo(-15.64, 2);
  });

  it('comma reference values', () => {
    expect(SYNTONIC_COMMA_CENTS).toBeCloseTo(21.51, 2);
    expect(PYTHAGOREAN_COMMA_CENTS).toBeCloseTo(23.46, 2);
    expect(SCHISMA_CENTS).toBeCloseTo(1.95, 2);
  });

  it('bohlen–pierce: step = 3^(1/13) = 146.304¢, 13 steps = tritave', () => {
    const bp = bohlenPierce(220);
    expect(bp.stepRatio).toBeCloseTo(Math.pow(3, 1 / 13), 12);
    expect(BP_STEP_CENTS).toBeCloseTo(146.304, 2);
    expect(bp.frequencies[13]).toBeCloseTo(660, 6);
    expect(bp.frequencies).toHaveLength(14);
  });

  it('nEDO: step = 1200/n cents, octave reached at step n', () => {
    const e19 = nEDO(19, 261.63);
    expect(e19.stepCents).toBeCloseTo(63.158, 2);
    expect(e19.frequencies[19]).toBeCloseTo(523.26, 1);
    const e53 = nEDO(53);
    expect(e53.stepCents).toBeCloseTo(22.642, 2);
  });
});

describe('astroTuner', () => {
  it('TRAPPIST-1 ladder ratios match measured period ratios (within 2%)', () => {
    const entries = astroTuner('trappist-1');
    expect(entries).toHaveLength(7);
    const h = entries[entries.length - 1];
    expect(h.hz).toBeCloseTo(TRAPPIST_ANCHOR_HZ, 6); // planet h → C3 = 130.81 Hz
    entries.forEach((e, i) => {
      const periodRatio = TRAPPIST_PERIODS_DAYS[6] / TRAPPIST_PERIODS_DAYS[i];
      const freqRatio = e.hz / TRAPPIST_ANCHOR_HZ;
      expect(Math.abs(freqRatio / periodRatio - 1)).toBeLessThan(0.02);
    });
    // Deviations from the whole-number ladder are real: P_h/P_b ≈ 12.43 ≠ 12.
    expect(entries[0].hz / TRAPPIST_ANCHOR_HZ).toBeGreaterThan(12);
    expect(entries[0].hz / TRAPPIST_ANCHOR_HZ).toBeLessThan(13);
  });

  it('cosmic octave: sidereal/tropical year tones straddle 136.10 Hz', () => {
    const tropical = astroTuner('cosmic-octave', 'tropical');
    const sidereal = astroTuner('cosmic-octave', 'sidereal');
    const yearT = tropical.find((e) => e.name.includes('year'))!;
    const yearS = sidereal.find((e) => e.name.includes('year'))!;
    expect(yearT.hz).toBeCloseTo(136.1022, 2);
    expect(yearS.hz).toBeCloseTo(136.0969, 2);
    expect(yearT.periodConvention).toBe('tropical');
    expect(yearS.periodConvention).toBe('sidereal');
  });

  it('schema: EVERY astro entry carries the mandatory D-grade label fields', () => {
    const all = [
      ...astroTuner('trappist-1'),
      ...astroTuner('cosmic-octave', 'sidereal'),
      ...astroTuner('cosmic-octave', 'tropical'),
    ];
    expect(all.length).toBeGreaterThan(0);
    for (const e of all) {
      expect(e.gradeArithmetic).toBe('A');
      expect(e.gradeMeaning).toBe('D');
      expect(e.label).toBe(ASTRO_LABEL);
      expect(e.label).toBe('astronomically derived; no evidence of special effect');
      expect(['sidereal', 'tropical', 'anomalistic']).toContain(e.periodConvention);
      expect(e.hz).toBeGreaterThan(0);
      expect(Number.isFinite(e.hz)).toBe(true);
    }
  });
});

describe('NaN guards', () => {
  it('NaN parameters are caught, zeroed, and warned — never silent NaN audio', () => {
    const r = shepardTone({ durationSec: 0.2, centerHz: NaN, sampleRate: SR });
    expect(finiteAll(r.samples)).toBe(true);
    expect(r.warnings.some((w) => w.includes('NaN'))).toBe(true);
  });

  it('logistic map survives degenerate x0', () => {
    const xs = logisticSequence(3.9, 0, 100);
    expect(finiteAll(xs)).toBe(true);
  });

  it('renderTone flags infrasonic and ultrasonic frequencies', () => {
    expect(renderTone(15, 0.2, SR).warnings.some((w) => w.includes('infrasonic'))).toBe(true);
    expect(renderTone(18000, 0.2, SR).warnings.some((w) => w.includes('ultrasonic'))).toBe(true);
  });
});
