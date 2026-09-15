import { describe, expect, it } from 'vitest';
import {
  chladniAmplitude,
  chladniEigenvalue,
  circularPlateAmplitude,
  modeFromName,
  modeLabel,
  nodalSignGrid,
  SQUARE_PLATE_MODES,
  CIRCULAR_PLATE_MODES,
} from '../chladni';

describe('chladniEigenvalue', () => {
  it('is symmetric in (m, n)', () => {
    expect(chladniEigenvalue(1, 2)).toBeCloseTo(chladniEigenvalue(2, 1), 12);
    expect(chladniEigenvalue(3, 5)).toBeCloseTo(chladniEigenvalue(5, 3), 12);
  });

  it('has λ(1,1)=0 with no constant term', () => {
    // The constant π^4·2 cancels exactly for the (1,1) mode — this is the
    // rattleback Chladni-figure reference point: zero-restoring-force mode.
    expect(chladniEigenvalue(1, 1)).toBeCloseTo(0, 10);
  });

  it('matches the classic Chladni-mode λ ordering', () => {
    // Ordering invariant, not value: λ(1,2) < λ(2,2) < λ(1,3) < λ(2,3) < λ(1,4).
    const l12 = chladniEigenvalue(1, 2);
    const l22 = chladniEigenvalue(2, 2);
    const l13 = chladniEigenvalue(1, 3);
    const l23 = chladniEigenvalue(2, 3);
    const l14 = chladniEigenvalue(1, 4);
    expect(l12).toBeLessThan(l22);
    expect(l22).toBeLessThan(l13);
    expect(l13).toBeLessThan(l23);
    expect(l23).toBeLessThan(l14);
  });
});

describe('chladniAmplitude', () => {
  it('vanishes on the nodal lines of the (1,2) mode', () => {
    // For cos(πx)·cos(2πy) − cos(2πx)·cos(πy), the nodal set includes the
    // diagonal x = y. Sample several points along it.
    for (const t of [0.1, 0.25, 0.5, 0.77, 0.9]) {
      expect(Math.abs(chladniAmplitude(1, 2, t, t))).toBeLessThan(1e-12);
    }
  });

  it('is zero at plate corners for free-edge modes (1,1) diagonal', () => {
    // (1,1): cosπx cosπy − cosπx cosπy ≡ 0 — degenerate; amplitude map is
    // identically zero, which the renderer must tolerate.
    expect(chladniAmplitude(1, 1, 0.3, 0.4)).toBe(0);
  });

  it('respects the amplitude cap for large coordinates', () => {
    const a = chladniAmplitude(4, 7, 3.3, 8.8);
    expect(Math.abs(a)).toBeLessThanOrEqual(2); // sum of two ±1 terms
  });
});

describe('circularPlateAmplitude', () => {
  it('is finite on the domain [0,1]×[0,2π)', () => {
    for (let i = 0; i < 64; i++) {
      const r = i / 63;
      const th = (i * Math.PI) / 32;
      const a = circularPlateAmplitude(2, 1, r, th);
      expect(Number.isFinite(a)).toBe(true);
    }
  });

  it('has cos(mθ) angular symmetry: amplitude(θ)=amplitude(−θ)', () => {
    for (const [m, n] of [[0, 1], [1, 1], [2, 1], [3, 2]] as const) {
      const a1 = circularPlateAmplitude(m, n, 0.6, 1.1);
      const a2 = circularPlateAmplitude(m, n, 0.6, -1.1);
      expect(a1).toBeCloseTo(a2, 10);
    }
  });

  it('m=0 modes are axisymmetric (no θ dependence)', () => {
    const a = circularPlateAmplitude(0, 2, 0.4, 0.0);
    const b = circularPlateAmplitude(0, 2, 0.4, 2.2);
    expect(a).toBeCloseTo(b, 12);
  });
});

describe('mode tables', () => {
  it('square table entries carry (m,n) and a positive reference Hz', () => {
    for (const mode of SQUARE_PLATE_MODES) {
      expect(mode.m).toBeGreaterThanOrEqual(1);
      expect(mode.n).toBeGreaterThanOrEqual(1);
      expect(mode.refHz).toBeGreaterThan(0);
    }
  });

  it('circular table entries carry (m,n) and a positive reference Hz', () => {
    for (const mode of CIRCULAR_PLATE_MODES) {
      expect(mode.m).toBeGreaterThanOrEqual(0);
      expect(mode.n).toBeGreaterThanOrEqual(1);
      expect(mode.refHz).toBeGreaterThan(0);
    }
  });

  it('modeFromName round-trips every listed mode', () => {
    for (const mode of [...SQUARE_PLATE_MODES, ...CIRCULAR_PLATE_MODES]) {
      expect(modeFromName(modeLabel(mode))).toEqual(mode);
    }
  });
});

describe('nodalSignGrid', () => {
  it('returns an N×N grid of −1|0|+1 values', () => {
    const g = nodalSignGrid(1, 2, 16);
    expect(g.length).toBe(16);
    expect(g[0].length).toBe(16);
    for (const row of g) {
      for (const v of row) {
        expect([-1, 0, 1]).toContain(v);
      }
    }
  });

  it('(1,2) mode grid has a sign flip across the diagonal', () => {
    const g = nodalSignGrid(1, 2, 8);
    // Opposite corners of the (1,2) square mode carry opposite signs.
    expect(g[1][6]).toBe(-g[6][1]);
  });
});
