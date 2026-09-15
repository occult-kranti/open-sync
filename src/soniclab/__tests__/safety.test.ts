/**
 * Sonic Lab render-time safety rail tests.
 */

import { describe, expect, it } from 'vitest';
import { analyzeRender, applyRenderRails, normalizeToCeiling, spectralEdges, truePeakEstimate } from '../safety';

const SR = 48000;

function sine(hz: number, durSec: number, level = 0.5): Float32Array {
  const n = Math.round(durSec * SR);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = level * Math.sin((2 * Math.PI * hz * i) / SR);
  return out;
}

describe('analyzeRender', () => {
  it('triggers the infrasonic warning for a 15 Hz tone', () => {
    const r = analyzeRender(sine(15, 1.4), SR);
    expect(r.warnings.some((w) => w.includes('infrasonic'))).toBe(true);
    expect(r.lowestHz).not.toBeNull();
    expect(r.lowestHz!).toBeLessThan(20);
  });

  it('does not flag a 440 Hz tone as infrasonic or ultrasonic', () => {
    const r = analyzeRender(sine(440, 1), SR);
    expect(r.warnings.some((w) => w.includes('infrasonic'))).toBe(false);
    expect(r.warnings.some((w) => w.includes('ultrasonic'))).toBe(false);
    expect(r.lowestHz!).toBeGreaterThan(20);
    expect(r.highestHz!).toBeLessThan(16000);
  });

  it('triggers the ultrasonic warning for an 18 kHz tone', () => {
    const r = analyzeRender(sine(18000, 1), SR);
    expect(r.warnings.some((w) => w.includes('ultrasonic'))).toBe(true);
    expect(r.highestHz!).toBeGreaterThan(16000);
  });

  it('flags peaks over the −1 dBTP ceiling and passes quiet renders', () => {
    const hot = analyzeRender(sine(440, 0.5, 1.0), SR);
    expect(hot.warnings.some((w) => w.includes('ceiling'))).toBe(true);
    expect(hot.truePeakDb).toBeGreaterThan(-1);
    const quiet = analyzeRender(sine(440, 0.5, 0.3), SR);
    expect(quiet.warnings.some((w) => w.includes('ceiling'))).toBe(false);
  });

  it('enforces the duration cap', () => {
    const long = analyzeRender(new Float32Array(SR * 31), SR);
    expect(long.warnings.some((w) => w.includes('duration') && w.includes('cap'))).toBe(true);
    const ok = analyzeRender(new Float32Array(SR * 10), SR);
    expect(ok.warnings.some((w) => w.includes('duration'))).toBe(false);
  });

  it('detects NaN/Inf samples', () => {
    const buf = sine(440, 0.2);
    buf[100] = NaN;
    buf[200] = Infinity;
    const r = analyzeRender(buf, SR);
    expect(r.warnings.some((w) => w.includes('NaN'))).toBe(true);
  });

  it('silent buffer: no spectral edges, no false warnings', () => {
    const r = analyzeRender(new Float32Array(SR), SR);
    expect(r.lowestHz).toBeNull();
    expect(r.highestHz).toBeNull();
    expect(r.warnings).toHaveLength(0);
  });
});

describe('truePeakEstimate / spectralEdges', () => {
  it('true-peak estimate ≥ sample peak', () => {
    const buf = sine(10000, 0.2, 0.5);
    expect(truePeakEstimate(buf)).toBeGreaterThanOrEqual(0.5 - 1e-6);
  });

  it('spectralEdges brackets a 1 kHz tone near 1 kHz', () => {
    const { lowestHz, highestHz } = spectralEdges(sine(1000, 1), SR);
    expect(lowestHz!).toBeGreaterThan(900);
    expect(highestHz!).toBeLessThan(1100);
  });
});

describe('normalizeToCeiling / applyRenderRails', () => {
  it('normalizes hot renders to the target peak and sanitizes NaN', () => {
    const buf = sine(440, 0.2, 1.2);
    buf[50] = NaN;
    const { samples, gainDb } = normalizeToCeiling(buf, -3);
    let peak = 0;
    for (const v of samples) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeLessThanOrEqual(Math.pow(10, -3 / 20) + 1e-4);
    expect(gainDb).toBeLessThan(0);
  });

  it('applyRenderRails pulls a clipped render under the −1 dBTP ceiling', () => {
    const buf = sine(440, 0.5, 1.0);
    const { samples, report } = applyRenderRails(buf, SR);
    expect(report.warnings.some((w) => w.includes('ceiling'))).toBe(true);
    expect(truePeakEstimate(samples)).toBeLessThanOrEqual(Math.pow(10, -1 / 20) + 1e-4);
  });

  it('applyRenderRails leaves compliant renders untouched', () => {
    const buf = sine(440, 0.5, 0.5);
    const { samples } = applyRenderRails(buf, SR);
    expect(samples).toBe(buf);
  });
});
