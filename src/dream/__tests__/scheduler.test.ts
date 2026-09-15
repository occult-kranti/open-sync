import { describe, expect, it } from 'vitest';
import {
  TLR_REPLAY_AFTER_ONSET_MIN,
  WBTB_WEEKLY_CAP,
  fmtMin,
  isoWeekKey,
  parseBedtime,
  planNight,
  realityCheckSchedule,
  wbtbWeeklyGate,
} from '../scheduler';
import type { ScreeningAnswers } from '../protocols';

const NO_FLAGS: ScreeningAnswers = {
  insomnia: false,
  psychosisSpectrum: false,
  dissociative: false,
  nightmareDisorder: false,
};

describe('parseBedtime', () => {
  it('parses 24 h input', () => {
    expect(parseBedtime('23:30')).toBe(23 * 60 + 30);
    expect(parseBedtime('0:00')).toBe(0);
    expect(parseBedtime('7:05')).toBe(7 * 60 + 5);
  });

  it('parses 12 h input (case-insensitive)', () => {
    expect(parseBedtime('11:30 PM')).toBe(23 * 60 + 30);
    expect(parseBedtime('11:30 am')).toBe(11 * 60 + 30);
    expect(parseBedtime('12:00 am')).toBe(0);
    expect(parseBedtime('12:00 pm')).toBe(720);
  });

  it('rejects invalid input', () => {
    for (const bad of ['', 'abc', '24:00', '23:60', '9:99', '13:00 pm', '0:00 pm', '22', '22:1', '22:1 pm', '  ']) {
      expect(parseBedtime(bad), bad).toBeNull();
    }
  });
});

describe('fmtMin', () => {
  it('formats absolute minutes and wraps midnight', () => {
    expect(fmtMin(0)).toBe('00:00');
    expect(fmtMin(255)).toBe('04:15');
    expect(fmtMin(1695)).toBe('04:15'); // 1695 mod 1440
    expect(fmtMin(-60)).toBe('23:00');
  });
});

describe('planNight — WBTB math across midnight', () => {
  const plan = planNight({ bedtimeMin: 23 * 60 }); // 23:00

  it('computes the WBTB alarm 5 h after sleep onset, wrapped past midnight', () => {
    expect(plan.wbtb).not.toBeNull();
    // onset 23:15 + 300 min = 04:15
    expect(fmtMin(plan.wbtb!.alarm.absMin)).toBe('04:15');
    expect(fmtMin(plan.wbtb!.backToBed.absMin)).toBe('04:45');
    expect(plan.wbtb!.awakeWindowMin).toBe(30);
  });

  it('computes wake time across midnight', () => {
    expect(fmtMin(plan.wakeTime.absMin)).toBe('07:15');
  });

  it('always emits the weekly-cap rail warning when WBTB is on', () => {
    expect(plan.warnings.some((w) => w.includes(`${WBTB_WEEKLY_CAP} nights/week`))).toBe(true);
  });

  it('clamps out-of-range WBTB parameters into the validated window', () => {
    const p = planNight({ bedtimeMin: 1320, wakeAfterMin: 60, awakeWindowMin: 120 });
    expect(p.wbtb!.alarm.relMin - p.sleepOnset.relMin).toBe(270); // clamped to 4.5 h
    expect(p.wbtb!.awakeWindowMin).toBe(40); // clamped
    expect(p.warnings.some((w) => w.includes('clamped'))).toBe(true);
  });

  it('omits WBTB when the sleep opportunity is too short', () => {
    const p = planNight({ bedtimeMin: 1320, sleepOpportunityMin: 300 });
    expect(p.wbtb).toBeNull();
    expect(p.warnings.some((w) => w.includes('too short'))).toBe(true);
  });
});

describe('planNight — TLR cue window stays inside the REM window', () => {
  it('default plan: cues begin ≤6 h post onset and inside the REM-rich last third', () => {
    const p = planNight({ bedtimeMin: 23 * 60 });
    expect(p.tlr).not.toBeNull();
    const t = p.tlr!;
    expect(t.windowStart.relMin).toBeGreaterThanOrEqual(t.remWindowStartRel);
    expect(t.windowEnd.relMin).toBeLessThanOrEqual(t.remWindowEndRel);
    expect(t.interCueGapSec).toEqual({ min: 60, max: 300 });
  });

  it('without WBTB, cues begin exactly 6 h after sleep onset', () => {
    const p = planNight({ bedtimeMin: 23 * 60, includeWbtb: false });
    expect(p.tlr!.windowStart.relMin).toBe(p.sleepOnset.relMin + TLR_REPLAY_AFTER_ONSET_MIN);
  });

  it('property: for a sweep of bedtimes/opportunities, any emitted cue window is inside the REM window', () => {
    for (const bedtimeMin of [0, 360, 720, 1080, 1380, 1430]) {
      for (const sleepOpportunityMin of [360, 420, 480, 540, 600]) {
        for (const includeWbtb of [true, false]) {
          const p = planNight({ bedtimeMin, sleepOpportunityMin, includeWbtb });
          if (p.tlr) {
            expect(p.tlr.windowStart.relMin).toBeGreaterThanOrEqual(p.tlr.remWindowStartRel - 1e-9);
            expect(p.tlr.windowEnd.relMin).toBeLessThanOrEqual(p.tlr.remWindowEndRel + 1e-9);
            expect(p.tlr.windowStart.relMin).toBeLessThan(p.tlr.windowEnd.relMin);
          }
        }
      }
    }
  });

  it('omits the cue window when the night is too short to reach REM-rich sleep', () => {
    const p = planNight({ bedtimeMin: 1320, sleepOpportunityMin: 300, includeWbtb: false });
    expect(p.tlr).toBeNull();
    expect(p.warnings.some((w) => w.includes('cue window falls outside'))).toBe(true);
  });
});

describe('planNight — screening advisories', () => {
  it('insomnia refuses WBTB with an advisory', () => {
    const p = planNight({ bedtimeMin: 1320, screening: { ...NO_FLAGS, insomnia: true } });
    expect(p.wbtb).toBeNull();
    expect(p.warnings.some((w) => w.includes('insomnia') && w.includes('refused'))).toBe(true);
  });

  it('psychosis-spectrum and dissociative answers add advisories but keep bedtime MILD paths', () => {
    const p = planNight({
      bedtimeMin: 1320,
      screening: { ...NO_FLAGS, psychosisSpectrum: true, dissociative: true },
    });
    expect(p.warnings.some((w) => w.includes('psychosis-spectrum'))).toBe(true);
    expect(p.warnings.some((w) => w.includes('dissociative'))).toBe(true);
    expect(p.wbtb).not.toBeNull(); // advised, not hard-blocked
  });

  it('nightmare disorder routes to IRT-informed content', () => {
    const p = planNight({ bedtimeMin: 1320, screening: { ...NO_FLAGS, nightmareDisorder: true } });
    expect(p.warnings.some((w) => w.includes('nightmare'))).toBe(true);
  });
});

describe('WBTB weekly cap', () => {
  const mon = new Date(2026, 0, 5); // Monday, ISO week 2 of 2026
  const tue = new Date(2026, 0, 6);
  const wed = new Date(2026, 0, 7);
  const thu = new Date(2026, 0, 8);
  const nextWeek = new Date(2026, 0, 12);

  it('same ISO week shares a key; adjacent weeks differ', () => {
    expect(isoWeekKey(mon)).toBe(isoWeekKey(thu));
    expect(isoWeekKey(mon)).not.toBe(isoWeekKey(nextWeek));
  });

  it('allows up to 3 nights and refuses the 4th in the same week', () => {
    expect(wbtbWeeklyGate([mon, tue], wed).ok).toBe(true);
    expect(wbtbWeeklyGate([mon, tue, wed], thu).ok).toBe(false);
    const r = wbtbWeeklyGate([mon, tue, wed], thu);
    expect(r.warning).toContain(`${WBTB_WEEKLY_CAP} nights`);
  });

  it('resets across ISO weeks', () => {
    expect(wbtbWeeklyGate([mon, tue, wed], nextWeek).ok).toBe(true);
  });

  it('counts only the candidate week', () => {
    expect(wbtbWeeklyGate([mon, nextWeek], tue).count).toBe(1);
  });
});

describe('realityCheckSchedule', () => {
  it('enforces the ≥5 checks/day floor', () => {
    const r = realityCheckSchedule({ startMin: 540, endMin: 1320, count: 2 });
    expect(r.timesMin.length).toBe(5);
    expect(r.warnings.some((w) => w.includes('≥5'))).toBe(true);
  });

  it('spaces reminders inside the window', () => {
    const r = realityCheckSchedule({ startMin: 540, endMin: 1320, count: 6 });
    expect(r.timesMin.length).toBe(6);
    for (const t of r.timesMin) {
      expect(t).toBeGreaterThan(540);
      expect(t).toBeLessThan(1320);
    }
    const sorted = [...r.timesMin].sort((a, b) => a - b);
    expect(r.timesMin).toEqual(sorted);
  });

  it('falls back on an inverted window', () => {
    const r = realityCheckSchedule({ startMin: 1200, endMin: 600, count: 5 });
    expect(r.timesMin.length).toBe(5);
    expect(r.warnings.some((w) => w.includes('inverted'))).toBe(true);
  });

  it('caps absurd reminder counts', () => {
    const r = realityCheckSchedule({ startMin: 540, endMin: 1320, count: 500 });
    expect(r.timesMin.length).toBe(24);
  });
});
