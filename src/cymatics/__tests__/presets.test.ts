/**
 * Cymatic preset integrity: presets must reference real virtual plates, carry
 * valid mode selections (or a frequency-driven flag), resolve to real ladder
 * modes, and keep the physics/art honesty labeling intact.
 */

import { describe, it, expect } from 'vitest';
import { CYMATIC_PRESETS, CYMATIC_PLATE_IDS, getCymaticPresetById } from '../presets';
import {
  assertValidSquareMode,
  circularWaveNumber,
  circularModeHz,
  squareModeHz,
  frequencyToModes,
  virtualPlateById,
} from '../chladni';

describe('CYMATIC_PRESETS integrity', () => {
  it('has unique ids', () => {
    const ids = CYMATIC_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every preset references a declared virtual plate', () => {
    for (const p of CYMATIC_PRESETS) {
      expect(CYMATIC_PLATE_IDS, p.id).toContain(p.plateId);
    }
  });

  it('every preset has an audible drive frequency, a label, and a note', () => {
    for (const p of CYMATIC_PRESETS) {
      expect(Number.isFinite(p.driveHz), p.id).toBe(true);
      expect(p.driveHz, p.id).toBeGreaterThanOrEqual(20);
      expect(p.driveHz, p.id).toBeLessThanOrEqual(20000);
      expect(['physics', 'art'], p.id).toContain(p.label);
      expect(p.note.trim().length, p.id).toBeGreaterThan(0);
    }
  });

  it('each preset is either explicit-mode or frequency-driven, never both/neither', () => {
    for (const p of CYMATIC_PRESETS) {
      expect(p.modes !== undefined, p.id).toBe(!p.frequencyDriven);
    }
  });

  it('explicit mode selections are valid for their plate shape', () => {
    for (const p of CYMATIC_PRESETS.filter((x) => x.modes !== undefined)) {
      const plate = virtualPlateById(p.plateId);
      const modes = p.modes!;
      if (modes.kind === 'square') {
        expect(plate.shape, p.id).toBe('square');
        expect(() => assertValidSquareMode(modes.n, modes.m), p.id).not.toThrow();
        // driveHz must equal the ideal modal frequency on that plate.
        expect(p.driveHz, p.id).toBeCloseTo(squareModeHz(modes.n, modes.m, plate.fundamentalHz, plate.scaling), 6);
      } else {
        expect(plate.shape, p.id).toBe('circular');
        expect(() => circularWaveNumber(modes.m, modes.s, plate.boundary), p.id).not.toThrow();
        expect(p.driveHz, p.id).toBeCloseTo(
          circularModeHz(modes.m, modes.s, plate.fundamentalHz, plate.boundary),
          6,
        );
      }
    }
  });

  it('frequency-driven presets resolve at least one ladder mode on their plate', () => {
    for (const p of CYMATIC_PRESETS.filter((x) => x.frequencyDriven)) {
      const plate = virtualPlateById(p.plateId);
      // maxOrder 5: the free-rim derivative-zero table has only 5 entries for
      // m=4, so the default maxOrder 6 would index outside the table.
      const candidates = frequencyToModes(p.driveHz, plate.shape, {
        fundamentalHz: plate.fundamentalHz,
        boundary: plate.boundary,
        scaling: plate.scaling,
        maxOrder: 5,
      });
      expect(candidates.length, `${p.id} resolves no modes at ${p.driveHz} Hz on ${p.plateId}`).toBeGreaterThan(0);
    }
  });
});

describe('honesty labeling', () => {
  it('Solfeggio presets are art-labeled and marked cultural, not physical', () => {
    const solfeggio = CYMATIC_PRESETS.filter((p) => p.id.startsWith('solfeggio-'));
    expect(solfeggio.length).toBeGreaterThanOrEqual(9);
    for (const p of solfeggio) {
      expect(p.label, p.id).toBe('art');
      expect(p.name.toLowerCase(), `${p.id} name`).toContain('cultural, not physical');
      expect(p.note.toLowerCase(), `${p.id} note`).toContain('cultural, not physical');
    }
  });

  it('octave-folded brainwave/Schumann presets carry the fold honesty note', () => {
    const folded = CYMATIC_PRESETS.filter((p) => p.id.includes('fold'));
    expect(folded.length).toBeGreaterThanOrEqual(7);
    for (const p of folded) {
      expect(p.note.toLowerCase(), p.id).toContain('octave-fold');
      expect(p.note.toLowerCase(), p.id).toContain('representational');
    }
  });

  it('the 432/440 comparison pair exists and disclaims pattern-level claims', () => {
    const a440 = getCymaticPresetById('drive-440-concert')!;
    const a432 = getCymaticPresetById('drive-432-verdi')!;
    expect(a440.driveHz).toBe(440);
    expect(a432.driveHz).toBe(432);
    expect(a432.note).toContain('pilot-grade');
  });
});
