/**
 * Quick Lab engine — unit tests (node, no DOM).
 *
 * Covers: RNG determinism, block-randomization balance, blinding leak
 * discipline (S20.1), stats honesty gates (k−1 sessions, CI spanning 0,
 * all-identical outcomes, n=0), dose refusal, cross-midnight logging, and
 * corrupt-storage salvage.
 */

import { describe, expect, it } from 'vitest';
import { SoundDoseTracker } from '@/safety/dose';
import { getProtocol, PROTOCOLS } from '../protocols';
import {
  analyze,
  armCounts,
  armForSession,
  blindedView,
  checkDose,
  createSchedule,
  dayKey,
  debitDose,
  enroll,
  loadEnrollments,
  median,
  memoryStorage,
  mulberry32,
  QUICKLAB_DBA,
  recordSession,
  revealSchedule,
  saveEnrollments,
  sessionCode,
  tCrit975,
  upsertEnrollment,
  type Enrollment,
} from '../engine';

const RATE_FLOOR = getProtocol('ql-rate-floor')!; // 2 arms
const PLACEBO = getProtocol('ql-active-placebo')!; // 3 arms

/** Fill an enrollment with sessions; outcomes chosen per arm via the sealed key (test-internal access). */
function fillSessions(
  e: Enrollment,
  count: number,
  outcomeFor: (armIndex: number, sessionIndex: number) => { calm: number; focus: number },
): Enrollment {
  let cur = e;
  for (let i = 0; i < count; i++) {
    const arm = cur.sealedKey[i];
    const o = outcomeFor(arm, i);
    const start = new Date(2026, 0, 5 + i, 21, 30).toISOString();
    const end = new Date(2026, 0, 5 + i, 21, 45).toISOString();
    cur = recordSession(cur, {
      startedAt: start,
      completedAt: end,
      scales: { calm: o.calm, focus: o.focus, salience: 5 },
      doseDebited: true,
    });
  }
  return cur;
}

describe('mulberry32', () => {
  it('is deterministic for a fixed seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0,1) and differs across seeds', () => {
    const r = mulberry32(7);
    const vals = Array.from({ length: 1000 }, () => r());
    expect(vals.every((v) => v >= 0 && v < 1)).toBe(true);
    const r2 = mulberry32(8);
    expect(Array.from({ length: 10 }, () => r2())).not.toEqual(vals.slice(0, 10));
  });
});

describe('createSchedule block randomization', () => {
  it('is deterministic per seed and reproducible from the logged seed', () => {
    expect(createSchedule(2, 123, 20)).toEqual(createSchedule(2, 123, 20));
    expect(createSchedule(3, 123, 21)).toEqual(createSchedule(3, 123, 21));
  });

  it('keeps per-arm counts within ±1 at every prefix (2 arms)', () => {
    for (const seed of [1, 2, 3, 99, 31337]) {
      const s = createSchedule(2, seed, 25);
      for (let k = 1; k <= s.length; k++) {
        const c = armCounts(s.slice(0, k), 2);
        expect(Math.abs(c[0] - c[1]), `seed ${seed} prefix ${k}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('keeps per-arm counts within ±1 at every prefix (3 arms)', () => {
    const s = createSchedule(3, 555, 30);
    for (let k = 1; k <= s.length; k++) {
      const c = armCounts(s.slice(0, k), 3);
      expect(Math.max(...c) - Math.min(...c), `prefix ${k}`).toBeLessThanOrEqual(1);
    }
  });

  it('each completed block is a permutation of the arms', () => {
    const s = createSchedule(3, 77, 12);
    for (let blk = 0; blk < 4; blk++) {
      expect([...s.slice(blk * 3, blk * 3 + 3)].sort()).toEqual([0, 1, 2]);
    }
  });

  it('rejects degenerate inputs', () => {
    expect(() => createSchedule(1, 1, 10)).toThrow(RangeError);
    expect(createSchedule(2, 1, 0)).toEqual([]);
  });
});

describe('blinding (S20.1)', () => {
  it('session log and blinded view contain no arm identity before completion', () => {
    let e = enroll(PLACEBO, { seed: 42 });
    e = fillSessions(e, 6, () => ({ calm: 4, focus: 4 }));
    expect(e.completedAt).toBeNull();

    const armIds = PLACEBO.arms.map((a) => a.id);
    const logJson = JSON.stringify(e.sessions);
    const viewJson = JSON.stringify(blindedView(e));
    for (const id of armIds) {
      expect(logJson).not.toContain(id);
      expect(viewJson).not.toContain(id);
    }
    // The blinded view strips the sealed key entirely.
    expect('sealedKey' in blindedView(e)).toBe(false);
    // Codes carry no arm information.
    for (const rec of e.sessions) expect(rec.code).toMatch(/^QL-[0-9A-F]{4}-\d+$/);
  });

  it('armForSession is sealed until completion, then reveals', () => {
    let e = enroll(RATE_FLOOR, { seed: 9 });
    e = fillSessions(e, 3, () => ({ calm: 3, focus: 3 }));
    expect(() => armForSession(e, 0)).toThrow(/sealed/);
    expect(() => revealSchedule(e)).toThrow(/sealed/);

    e = fillSessions(e, e.plannedSessions - 3, () => ({ calm: 3, focus: 3 }));
    expect(e.completedAt).not.toBeNull();
    const revealed = revealSchedule(e);
    expect(revealed).toHaveLength(e.plannedSessions);
    expect(armForSession(e, 0)).toBe(revealed[0].armIndex);
    // Revealed assignment matches the logged seed's schedule.
    expect(revealed.map((r) => r.armIndex)).toEqual(createSchedule(RATE_FLOOR.arms.length, 9, e.plannedSessions));
  });

  it('session codes are unique per slot and opaque', () => {
    const e = enroll(RATE_FLOOR, { seed: 1 });
    expect(new Set(e.codes).size).toBe(e.codes.length);
    expect(sessionCode(1, 0)).toBe(e.codes[0]);
  });
});

describe('stats honesty gates', () => {
  it('n=0 and k<minSessions yield only a keep-going state, never a verdict', () => {
    const e0 = enroll(RATE_FLOOR, { seed: 5 });
    const r0 = analyze(RATE_FLOOR, e0);
    expect(r0.state).toBe('keep-going');
    expect(r0.n.total).toBe(0);
    expect(r0.meanDiff).toBeNull();
    expect(r0.ci95).toBeNull();

    const e9 = fillSessions(e0, RATE_FLOOR.minSessions - 1, () => ({ calm: 6, focus: 6 }));
    const r9 = analyze(RATE_FLOOR, e9);
    expect(r9.state).toBe('keep-going');
    expect(r9.text).toContain('Keep going');
    expect(r9.text).not.toContain('inconclusive');
  });

  it('CI spanning 0 → inconclusive, never worded as "no effect"', () => {
    // Both arms get the same value sequence (6,2,6,2,…) — equal means, real variance.
    const perArm: Record<number, number> = {};
    let e = enroll(RATE_FLOOR, { seed: 21, plannedSessions: 12 });
    e = fillSessions(e, 12, (arm) => {
      const k = (perArm[arm] = (perArm[arm] ?? 0) + 1);
      return k % 2 === 1 ? { calm: 6, focus: 6 } : { calm: 2, focus: 2 };
    });
    const r = analyze(RATE_FLOOR, e);
    expect(r.state).toBe('inconclusive');
    expect(r.ci95).not.toBeNull();
    expect(r.ci95![0]).toBeLessThanOrEqual(0);
    expect(r.ci95![1]).toBeGreaterThanOrEqual(0);
    expect(r.text).not.toMatch(/no effect/i);
    expect(r.text).toContain('inconclusive');
  });

  it('a clear separation yields a hedged signal verdict', () => {
    let e = enroll(RATE_FLOOR, { seed: 3, plannedSessions: 12 });
    // arm 0 (veridical) high, arm 1 (0 Hz) low, mild within-arm variance.
    e = fillSessions(e, 12, (arm, i) =>
      arm === 0 ? { calm: 6, focus: 6 + (i % 2) } : { calm: 2, focus: 2 + (i % 2) },
    );
    const r = analyze(RATE_FLOOR, e);
    expect(r.state).toBe('signal');
    expect(r.ci95![0]).toBeGreaterThan(0);
    expect(r.text).toContain('associated with');
    expect(r.text).toContain('does not establish a cause');
    expect(r.text).not.toMatch(/induces|synchronizes|attunes/i);
  });

  it('all-identical outcomes → zero-width CI handled as inconclusive, never a confirmed effect', () => {
    let e = enroll(RATE_FLOOR, { seed: 8, plannedSessions: 12 });
    e = fillSessions(e, 12, () => ({ calm: 4, focus: 4 }));
    const r = analyze(RATE_FLOOR, e);
    expect(r.state).toBe('inconclusive');
    expect(r.zeroVariance).toBe(true);
    expect(r.ci95).toEqual([0, 0]);
    expect(r.text).toContain('not that the conditions are equivalent');
  });

  it('all-identical but differing per arm → zero variance still refuses a confirmed effect', () => {
    let e = enroll(RATE_FLOOR, { seed: 11, plannedSessions: 12 });
    e = fillSessions(e, 12, (arm) => (arm === 0 ? { calm: 7, focus: 7 } : { calm: 3, focus: 3 }));
    const r = analyze(RATE_FLOOR, e);
    expect(r.state).toBe('inconclusive');
    expect(r.zeroVariance).toBe(true);
    expect(r.text).toContain('Inconclusive');
    expect(r.text).not.toMatch(/confirmed effect(?!\.?$)/i); // see text wording
  });

  it('tCrit975 sanity: df→∞ approaches 1.96, df=1 ≈ 12.7', () => {
    expect(tCrit975(10000)).toBeCloseTo(1.96, 2);
    expect(tCrit975(1)).toBeCloseTo(12.706, 1);
    expect(tCrit975(10)).toBeCloseTo(2.228, 2);
  });
});

describe('dose integration (H.870)', () => {
  it('refuses a session when the weekly allowance is exhausted', () => {
    const t = new SoundDoseTracker('adult');
    t.addExposure(80, 40 * 3600); // entire weekly allowance at reference level
    expect(t.isOverLimit()).toBe(true);
    const chk = checkDose(t, QUICKLAB_DBA, 600);
    expect(chk.ok).toBe(false);
    expect(chk.reason).toContain('H.870');
  });

  it('allows a session within allowance and debits it', () => {
    const t = new SoundDoseTracker('adult');
    const chk = checkDose(t, QUICKLAB_DBA, 900);
    expect(chk.ok).toBe(true);
    const after = debitDose(t, QUICKLAB_DBA, 900);
    expect(after).toBeGreaterThan(0);
    expect(after).toBeLessThan(1); // 15 min at 62 dBA is a fraction of a percent
    const chk2 = checkDose(t, QUICKLAB_DBA, 900);
    expect(chk2.projectedPercent).toBeCloseTo(after + chk2.addedDoseSeconds * (100 / (40 * 3600)), 6);
  });
});

describe('cross-midnight sessions', () => {
  it('a session crossing midnight counts once and belongs to its start day', () => {
    let e = enroll(RATE_FLOOR, { seed: 4 });
    const start = new Date(2026, 2, 10, 23, 52);
    const end = new Date(2026, 2, 11, 0, 7); // next local day
    e = recordSession(e, {
      startedAt: start.toISOString(),
      completedAt: end.toISOString(),
      scales: { calm: 5, focus: 5 },
      doseDebited: true,
    });
    expect(e.sessions).toHaveLength(1);
    expect(e.sessions[0].day).toBe(dayKey(start.toISOString()));
    expect(e.sessions[0].day).not.toBe(dayKey(end.toISOString()));
    expect(e.sessions[0].day).toMatch(/^2026-03-10$/);
  });
});

describe('storage persistence & salvage', () => {
  it('round-trips enrollments', () => {
    const store = memoryStorage();
    let e = enroll(RATE_FLOOR, { seed: 6 });
    e = fillSessions(e, 2, () => ({ calm: 3, focus: 3 }));
    upsertEnrollment(store, e);
    const loaded = loadEnrollments(store);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].sessions).toHaveLength(2);
    expect(loaded[0].seed).toBe(6);
    // Update in place.
    const e2 = fillSessions(loaded[0], 1, () => ({ calm: 4, focus: 4 }));
    upsertEnrollment(store, e2);
    expect(loadEnrollments(store)[0].sessions).toHaveLength(3);
  });

  it('salvages corrupt JSON without throwing and quarantines the blob', () => {
    const store = memoryStorage();
    store.setItem('opensync.quicklab.v1', '{not json!!');
    expect(loadEnrollments(store)).toEqual([]);
    expect(store.getItem('opensync.quicklab.v1')).toBeNull();
    expect(store.getItem('opensync.quicklab.v1.corrupt')).toBe('{not json!!');
  });

  it('drops malformed records individually, keeps valid ones', () => {
    const store = memoryStorage();
    const good = enroll(RATE_FLOOR, { seed: 2 });
    store.setItem('opensync.quicklab.v1', JSON.stringify([good, { bogus: true }, 42]));
    const loaded = loadEnrollments(store);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].protocolId).toBe(RATE_FLOOR.id);
  });

  it('saveEnrollments/loadEnrollments with a non-array payload returns []', () => {
    const store = memoryStorage();
    saveEnrollments(store, [enroll(RATE_FLOOR, { seed: 1 })]);
    expect(loadEnrollments(store)).toHaveLength(1);
    store.setItem('opensync.quicklab.v1', '"a string"');
    expect(loadEnrollments(store)).toEqual([]);
  });
});

describe('protocol registry sanity', () => {
  it('every protocol id is resolvable', () => {
    for (const p of PROTOCOLS) expect(getProtocol(p.id)).toBe(p);
  });
});

describe('median (tap-test reaction time)', () => {
  it('takes the middle value of odd samples', () => {
    expect(median([300, 100, 200])).toBe(200);
  });

  it('averages the two middle values of even samples (no upper-midpoint bias)', () => {
    expect(median([100, 200, 300, 400])).toBe(250);
    expect(median([211, 213])).toBe(212);
  });

  it('handles a single sample and the empty case', () => {
    expect(median([450])).toBe(450);
    expect(Number.isNaN(median([]))).toBe(true);
  });

  it('does not mutate the input', () => {
    const xs = [300, 100, 200];
    median(xs);
    expect(xs).toEqual([300, 100, 200]);
  });
});
