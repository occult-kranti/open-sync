import { describe, expect, it } from 'vitest';
import { LEVELS } from '../levels';

describe('LEVELS (Deep Focus ladder)', () => {
  it('is a strictly ordered ladder with discrete signposts', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      expect(LEVELS[i].order).toBeGreaterThan(LEVELS[i - 1].order);
    }
    for (const l of LEVELS) {
      expect(l.signposts.length).toBeGreaterThan(0);
    }
  });

  it('every level states its Monroe-style name AND its evidence caveat', () => {
    for (const l of LEVELS) {
      expect(l.name.trim().length).toBeGreaterThan(0);
      expect(l.caveat.trim().length).toBeGreaterThan(0);
    }
  });

  it('the Gateway-exhibit level cites the 1983 CIA report accurately', () => {
    const gw = LEVELS.find((l) => /gateway/i.test(l.name));
    expect(gw).toBeDefined();
    expect(gw!.caveat).toMatch(/1983/);
    expect(gw!.caveat).toMatch(/assessment|theoretical|no experiment/i);
  });
});
