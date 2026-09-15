import { describe, expect, it } from 'vitest';
import { FREQUENCIES, getFrequencyById } from '../frequencies';

describe('FREQUENCIES database', () => {
  it('every entry carries an evidence grade A-D', () => {
    for (const f of FREQUENCIES) {
      expect(['A', 'B', 'C', 'D']).toContain(f.grade);
    }
  });

  it('every entry has origin, citation, and note strings', () => {
    for (const f of FREQUENCIES) {
      expect(f.origin.trim().length).toBeGreaterThan(0);
      expect(f.citation.trim().length).toBeGreaterThan(0);
      expect(f.note.trim().length).toBeGreaterThan(0);
    }
  });

  it('ids are unique', () => {
    const ids = FREQUENCIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hz or band is present, never both, never neither', () => {
    for (const f of FREQUENCIES) {
      const hasHz = typeof f.hz === 'number';
      const hasBand = typeof f.band === 'object' && f.band !== null;
      expect(hasHz !== hasBand).toBe(true);
    }
  });

  it('band entries have minHz < maxHz', () => {
    for (const f of FREQUENCIES) {
      if (f.band) expect(f.band.minHz).toBeLessThan(f.band.maxHz);
    }
  });

  it('schumann entries use measured values (7.83, 14.3, 20.8, 27.3, 33.8)', () => {
    const measured = [7.83, 14.3, 20.8, 27.3, 33.8];
    const schumann = FREQUENCIES.filter((f) => f.id.startsWith('schumann-'));
    expect(schumann.length).toBe(5);
    schumann.forEach((f, i) => {
      expect(f.hz).toBeCloseTo(measured[i], 2);
    });
  });

  it('getFrequencyById finds and misses honestly', () => {
    expect(getFrequencyById('solfeggio-528')?.name).toContain('528');
    expect(getFrequencyById('no-such-id')).toBeUndefined();
  });
});
