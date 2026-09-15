import { describe, expect, it } from 'vitest';
import { CYMATIC_PRESETS } from '../presets';
import { SQUARE_PLATE_MODES, CIRCULAR_PLATE_MODES } from '../chladni';

describe('CYMATIC_PRESETS', () => {
  it('contains at least eight presets', () => {
    expect(CYMATIC_PRESETS.length).toBeGreaterThanOrEqual(8);
  });

  it('every preset references a mode that exists in the mode tables', () => {
    const all = new Set(
      [...SQUARE_PLATE_MODES, ...CIRCULAR_PLATE_MODES].map((m) => `${m.plate}:${m.m}:${m.n}`),
    );
    for (const p of CYMATIC_PRESETS) {
      expect(all.has(`${p.mode.plate}:${p.mode.m}:${p.mode.n}`)).toBe(true);
    }
  });

  it('preset params stay within documented ranges', () => {
    for (const p of CYMATIC_PRESETS) {
      expect(p.params.driveHz).toBeGreaterThan(0);
      expect(p.params.driveHz).toBeLessThanOrEqual(1200);
      expect(p.params.driveGain).toBeGreaterThanOrEqual(0);
      expect(p.params.driveGain).toBeLessThanOrEqual(1);
      expect(p.params.damping).toBeGreaterThanOrEqual(0);
      expect(p.params.damping).toBeLessThanOrEqual(1);
      expect(p.params.grainSize).toBeGreaterThan(0);
    }
  });

  it('preset ids are unique', () => {
    const ids = CYMATIC_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each preset carries a non-empty physicalNote honesty string', () => {
    for (const p of CYMATIC_PRESETS) {
      expect(p.physicalNote.trim().length).toBeGreaterThan(0);
    }
  });
});
