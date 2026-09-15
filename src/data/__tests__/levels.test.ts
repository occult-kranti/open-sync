import { describe, it, expect } from 'vitest';
import { FOCUS_LEVELS, FOCUS_LEVEL_NUMBERS, gatewayHistory } from '../levels';

describe('FOCUS_LEVELS integrity', () => {
  it('FOCUS_LEVEL_NUMBERS matches the level list exactly, in order', () => {
    expect(FOCUS_LEVELS.map((l) => l.level)).toEqual([...FOCUS_LEVEL_NUMBERS]);
  });

  it('levels are unique, positive integers and non-contiguous', () => {
    const nums = FOCUS_LEVELS.map((l) => l.level);
    expect(new Set(nums).size).toBe(nums.length);
    for (const n of nums) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
    const gaps = nums.slice(1).some((n, i) => n !== nums[i] + 1);
    expect(gaps, 'level set must not be a 1..N continuum').toBe(true);
  });

  it('contains the classic Gateway anchors (10, 12, 15, 21)', () => {
    for (const anchor of [10, 12, 15, 21]) {
      expect(FOCUS_LEVEL_NUMBERS).toContain(anchor);
    }
  });

  it('every level has a name and a neutral, non-metaphysical description', () => {
    for (const l of FOCUS_LEVELS) {
      expect(l.name.trim().length).toBeGreaterThan(0);
      expect(l.description.trim().length).toBeGreaterThan(0);
      expect(l.description.toLowerCase(), `level ${l.level}`).not.toContain('guaranteed');
      expect(l.description.toLowerCase(), `level ${l.level}`).not.toContain('proven');
    }
  });
});

describe('gatewayHistory provenance note', () => {
  it('identifies the report, author and date correctly', () => {
    expect(gatewayHistory).toContain('CIA-RDP96-00788R001700210016-5');
    expect(gatewayHistory).toContain('McDonnell');
    expect(gatewayHistory).toContain('1983');
    expect(gatewayHistory).toContain('INSCOM');
  });

  it('states the key honesty facts: no experiments, no validation, page 25 story', () => {
    expect(gatewayHistory.toLowerCase()).toContain('no experiments');
    expect(gatewayHistory).toContain('page 25');
    expect(gatewayHistory).toContain('never validated');
  });
});
