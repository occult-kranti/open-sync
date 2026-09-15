import { describe, it, expect } from 'vitest';
import { FREQUENCIES, getFrequencyById, type Grade } from '../frequencies';

const GRADES: readonly Grade[] = ['A', 'B', 'C', 'D'];

describe('FREQUENCIES integrity', () => {
  it('has unique ids', () => {
    const ids = FREQUENCIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry sets exactly one of hz / band', () => {
    for (const f of FREQUENCIES) {
      expect((f.hz !== undefined) !== (f.band !== undefined), `${f.id} must set exactly one of hz/band`).toBe(true);
    }
  });

  it('hz values are positive and bands are ordered', () => {
    for (const f of FREQUENCIES) {
      if (f.hz !== undefined) {
        expect(f.hz, f.id).toBeGreaterThan(0);
        expect(Number.isFinite(f.hz), f.id).toBe(true);
      }
      if (f.band !== undefined) {
        expect(f.band.maxHz, f.id).toBeGreaterThan(f.band.minHz);
        expect(f.band.minHz, f.id).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('grades are valid and secondary grades come with a scope', () => {
    for (const f of FREQUENCIES) {
      expect(GRADES, f.id).toContain(f.grade);
      if (f.secondaryGrade !== undefined) {
        expect(GRADES, f.id).toContain(f.secondaryGrade);
        expect(f.secondaryScope, f.id).toBeTruthy();
      }
    }
  });

  it('every entry carries origin, citation and note (honest labeling)', () => {
    for (const f of FREQUENCIES) {
      expect(f.origin.trim().length, f.id).toBeGreaterThan(0);
      expect(f.citation.trim().length, f.id).toBeGreaterThan(0);
      expect(f.note.trim().length, f.id).toBeGreaterThan(0);
    }
  });
});

describe('grade assignments follow the evidence policy', () => {
  it('all Solfeggio and chakra entries are grade D', () => {
    for (const f of FREQUENCIES) {
      if (f.id.startsWith('solfeggio-') || f.id.startsWith('chakra-')) {
        expect(f.grade, f.id).toBe('D');
      }
    }
  });

  it('Schumann physics is grade A with measured-mode values', () => {
    const fundamental = getFrequencyById('schumann-fundamental');
    expect(fundamental?.grade).toBe('A');
    expect(fundamental?.hz).toBeCloseTo(7.83, 2);
    for (const [id, expected] of [
      ['schumann-mode-2', 14.1],
      ['schumann-mode-3', 20.3],
      ['schumann-mode-4', 26.4],
      ['schumann-mode-5', 32],
    ] as const) {
      expect(getFrequencyById(id)?.hz, id).toBeCloseTo(expected, 1);
    }
  });

  it('Cousto OM arithmetic reproduces 136.10 Hz from the Earth year', () => {
    const om = getFrequencyById('planetary-om');
    expect(om?.grade).toBe('A');
    expect(om?.secondaryGrade).toBe('D');
    const yearHz = 1 / (365.256 * 86400);
    expect(om?.hz).toBeCloseTo(yearHz * Math.pow(2, 32), 0);
  });

  it('Cousto Earth-day tone reproduces 194.18 Hz from the mean solar day', () => {
    const day = getFrequencyById('planetary-earth-day');
    expect(day?.hz).toBeCloseTo((1 / 86400) * Math.pow(2, 24), 1);
  });

  it('EEG bands are grade B as entrainment claims and cover standard ranges', () => {
    const expected: Record<string, [number, number]> = {
      'band-delta': [0.5, 4],
      'band-theta': [4, 8],
      'band-alpha': [8, 13],
      'band-smr': [12, 15],
      'band-beta': [13, 30],
      'band-gamma': [30, 100],
    };
    for (const [id, [lo, hi]] of Object.entries(expected)) {
      const f = getFrequencyById(id);
      expect(f?.grade, id).toBe('B');
      expect(f?.band).toEqual({ minHz: lo, maxHz: hi });
    }
  });

  it('vendor/marketing constructs (lambda, epsilon) are grade D', () => {
    expect(getFrequencyById('band-lambda')?.grade).toBe('D');
    expect(getFrequencyById('band-epsilon')?.grade).toBe('D');
  });

  it('432 Hz entry records that it is NOT a Schumann harmonic', () => {
    const f = getFrequencyById('tuning-432');
    expect(f?.grade).toBe('B');
    expect(f?.origin).toContain('430.65');
  });

  it('40 Hz gamma entry carries the failed-pivotal-trial caveat', () => {
    const f = getFrequencyById('gamma-40');
    expect(f?.grade).toBe('B');
    expect(f?.note).toContain('UNPROVEN');
  });
});

describe('getFrequencyById', () => {
  it('finds entries and returns undefined for misses', () => {
    expect(getFrequencyById('schumann-fundamental')?.name).toContain('Schumann');
    expect(getFrequencyById('nope')).toBeUndefined();
  });
});
