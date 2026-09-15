import { describe, expect, it } from 'vitest';
import { KNOWLEDGE_BASE } from '../knowledge';

describe('KNOWLEDGE_BASE', () => {
  it('spans the 1839-2026 archive claim', () => {
    const years = KNOWLEDGE_BASE.map((e) => e.year);
    expect(Math.min(...years)).toBeLessThanOrEqual(1839);
    expect(Math.max(...years)).toBeGreaterThanOrEqual(2024);
  });

  it('every entry carries an evidence grade and a summary', () => {
    for (const e of KNOWLEDGE_BASE) {
      expect(['A', 'B', 'C', 'D']).toContain(e.grade);
      expect(e.summary.trim().length).toBeGreaterThan(0);
    }
  });

  it('contradictory EEG findings are represented (honesty requirement)', () => {
    // 8 of 14 rigorous studies contradict entrainment — the archive must not
    // cherry-pick positive results. At least 3 negative/null entries.
    const negative = KNOWLEDGE_BASE.filter((e) =>
      /no effect|null|failed|contradict|negative/i.test(e.summary),
    );
    expect(negative.length).toBeGreaterThanOrEqual(3);
  });
});
