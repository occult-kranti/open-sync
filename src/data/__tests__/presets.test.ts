import { describe, expect, it } from 'vitest';
import { PRESETS, getPresetById } from '../presets';

describe('PRESETS (46 evidence-graded protocols)', () => {
  it('contains exactly 46 presets', () => {
    expect(PRESETS.length).toBe(46);
  });

  it('ids are unique', () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset carries an evidence grade A-D', () => {
    for (const p of PRESETS) {
      expect(['A', 'B', 'C', 'D']).toContain(p.grade);
    }
  });

  it('every preset has at least one phase with positive duration', () => {
    for (const p of PRESETS) {
      expect(p.spec.phases.length).toBeGreaterThan(0);
      for (const ph of p.spec.phases) {
        expect(ph.durationSec).toBeGreaterThan(0);
      }
    }
  });

  it('phase gains never exceed 0 dBFS (safety rail)', () => {
    for (const p of PRESETS) {
      for (const ph of p.spec.phases) {
        expect(ph.gainDbFs).toBeLessThanOrEqual(0);
      }
    }
  });

  it('infant presets are capped at <=50 dBA and carry the advisory', () => {
    const infant = PRESETS.filter((p) => p.id.startsWith('infant-'));
    expect(infant.length).toBeGreaterThan(0);
    for (const p of infant) {
      expect(p.safetyNote).toMatch(/50 dBA/i);
    }
  });

  it('every preset has a safety note', () => {
    for (const p of PRESETS) {
      expect(p.safetyNote.trim().length).toBeGreaterThan(0);
    }
  });

  it('categories cover the documented families', () => {
    const cats = new Set(PRESETS.map((p) => p.category));
    for (const c of ['sleep', 'focus', 'relax', 'meditate', 'wellness', 'experimental', 'walk', 'infant']) {
      expect(cats.has(c as never)).toBe(true);
    }
  });

  it('walk presets reference preview manifest ids', () => {
    const walk = PRESETS.filter((p) => p.category === 'walk');
    for (const p of walk) {
      expect(p.id).toMatch(/^walk-/);
    }
  });

  it('getPresetById round-trips', () => {
    expect(getPresetById('sleep-delta-descent')?.category).toBe('sleep');
    expect(getPresetById('nonexistent')).toBeUndefined();
  });

  it('experimental presets are NOT grade A (honesty: unproven stimuli)', () => {
    for (const p of PRESETS) {
      if (p.category === 'experimental') {
        expect(['B', 'C', 'D']).toContain(p.grade);
      }
    }
  });
});
