import { describe, it, expect } from 'vitest';
import {
  SoundDoseTracker,
  REF_LEVEL_ADULT_DBA,
  REF_LEVEL_CHILD_DBA,
  REF_WEEK_SECONDS,
  EXCHANGE_RATE_DB,
  INFANT_CEILING_DBA,
  NICU_LEQ_DBA,
  NICU_LMAX_DBA,
} from '../dose';

describe('H.870 constants', () => {
  it('adult reference is 80 dBA, child 75 dBA, week is 40 h', () => {
    expect(REF_LEVEL_ADULT_DBA).toBe(80);
    expect(REF_LEVEL_CHILD_DBA).toBe(75);
    expect(REF_WEEK_SECONDS).toBe(144000);
    expect(EXCHANGE_RATE_DB).toBe(3);
  });

  it('infant/NICU ceilings are ordered sanely', () => {
    expect(NICU_LEQ_DBA).toBeLessThan(INFANT_CEILING_DBA);
    expect(INFANT_CEILING_DBA).toBeLessThan(NICU_LMAX_DBA);
  });
});

describe('dose rate (3 dB equal-energy exchange)', () => {
  it('is exactly 1.0 at the reference level', () => {
    const t = new SoundDoseTracker('adult');
    expect(t.doseRateAt(REF_LEVEL_ADULT_DBA)).toBe(1);
  });

  it('doubles per +3 dB and halves per -3 dB', () => {
    const t = new SoundDoseTracker('adult');
    expect(t.doseRateAt(83)).toBeCloseTo(2, 10);
    expect(t.doseRateAt(86)).toBeCloseTo(4, 10);
    expect(t.doseRateAt(77)).toBeCloseTo(0.5, 10);
  });

  it('child mode shifts the reference by 5 dB', () => {
    const t = new SoundDoseTracker('child');
    expect(t.refLevelDbA).toBe(REF_LEVEL_CHILD_DBA);
    expect(t.doseRateAt(75)).toBeCloseTo(1, 10);
    expect(t.doseRateAt(80)).toBeCloseTo(Math.pow(2, 5 / 3), 10);
  });
});

describe('addExposure validation', () => {
  it('rejects non-finite levels and non-positive durations', () => {
    const t = new SoundDoseTracker();
    expect(() => t.addExposure(NaN, 10)).toThrow(RangeError);
    expect(() => t.addExposure(Infinity, 10)).toThrow(RangeError);
    expect(() => t.addExposure(80, 0)).toThrow(RangeError);
    expect(() => t.addExposure(80, -5)).toThrow(RangeError);
    expect(() => t.addExposure(80, NaN)).toThrow(RangeError);
  });

  it('logs accepted exposures in history', () => {
    const t = new SoundDoseTracker();
    t.addExposure(80, 60);
    t.addExposure(70, 120);
    expect(t.history).toHaveLength(2);
    expect(t.history[0]).toEqual({ dbA: 80, seconds: 60 });
  });
});

describe('weekly allowance accounting', () => {
  it('40 h at the adult reference consumes exactly 100%', () => {
    const t = new SoundDoseTracker('adult');
    t.addExposure(80, REF_WEEK_SECONDS);
    expect(t.rawDosePercent()).toBeCloseTo(100, 6);
    expect(t.isOverLimit()).toBe(true);
  });

  it('20 h at 80 dBA consumes 50%', () => {
    const t = new SoundDoseTracker('adult');
    t.addExposure(80, 20 * 3600);
    expect(t.weeklyDosePercent()).toBeCloseTo(50, 6);
    expect(t.isOverLimit()).toBe(false);
  });

  it('1 h at 86 dBA consumes the same dose as 4 h at 80 dBA', () => {
    const loud = new SoundDoseTracker();
    loud.addExposure(86, 3600);
    const ref = new SoundDoseTracker();
    ref.addExposure(80, 4 * 3600);
    expect(loud.rawDosePercent()).toBeCloseTo(ref.rawDosePercent(), 10);
  });

  it('40 h at 75 dBA fills the CHILD allowance but only part of the adult one', () => {
    const child = new SoundDoseTracker('child');
    child.addExposure(75, REF_WEEK_SECONDS);
    expect(child.rawDosePercent()).toBeCloseTo(100, 6);

    const adult = new SoundDoseTracker('adult');
    adult.addExposure(75, REF_WEEK_SECONDS);
    expect(adult.rawDosePercent()).toBeCloseTo(100 / Math.pow(2, 5 / 3), 6);
  });

  it('clamps displayed dose to [0, 100] while raw value keeps counting', () => {
    const t = new SoundDoseTracker();
    t.addExposure(90, REF_WEEK_SECONDS);
    expect(t.rawDosePercent()).toBeGreaterThan(100);
    expect(t.weeklyDosePercent()).toBe(100);
  });
});

describe('weeklyAllowanceSecondsAt / timeRemainingSec', () => {
  it('allowance at ref level is the full week; at +3 dB it is half', () => {
    const t = new SoundDoseTracker('adult');
    expect(t.weeklyAllowanceSecondsAt(80)).toBe(REF_WEEK_SECONDS);
    expect(t.weeklyAllowanceSecondsAt(83)).toBeCloseTo(REF_WEEK_SECONDS / 2, 6);
  });

  it('remaining time depletes with dose and floors at 0', () => {
    const t = new SoundDoseTracker('adult');
    t.addExposure(80, 10 * 3600);
    expect(t.timeRemainingSec(80)).toBeCloseTo(30 * 3600, 6);
    expect(t.timeRemainingSec(83)).toBeCloseTo(15 * 3600, 6);

    t.addExposure(80, REF_WEEK_SECONDS);
    expect(t.timeRemainingSec(80)).toBe(0);
  });

  it('rejects non-finite query levels', () => {
    const t = new SoundDoseTracker();
    expect(() => t.weeklyAllowanceSecondsAt(NaN)).toThrow(RangeError);
    expect(() => t.timeRemainingSec(Infinity)).toThrow(RangeError);
  });
});

describe('reset', () => {
  it('starts a fresh window', () => {
    const t = new SoundDoseTracker();
    t.addExposure(90, 3600);
    t.reset();
    expect(t.rawDosePercent()).toBe(0);
    expect(t.history).toHaveLength(0);
    expect(t.isOverLimit()).toBe(false);
  });
});
