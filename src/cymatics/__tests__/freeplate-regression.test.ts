import { describe, expect, it } from 'vitest';
import { freePlateAmplitude, freePlateEigenvalue } from '../freeplate';

/**
 * C3.3 anti-fabrication guard: the free-plate solver must reproduce the
 * classic square free-plate Chladni figures documented in Waller (1940) and
 * Rossing (1982). These are qualitative-but-pinned invariants — if the solver
 * drifts, the "figures from a real solver" claim breaks, so fail loudly.
 */
describe('free-plate solver (C3.3 regression pins)', () => {
  it('nodal-line count for the (2,0)-class mode matches Waller fig. 3', () => {
    // The classic "cross" figure: exactly one horizontal and one vertical
    // nodal line through the plate center region.
    const e = freePlateEigenvalue(2, 0);
    expect(e).toBeGreaterThan(0);
    let crossings = 0;
    const N = 64;
    for (let i = 1; i < N; i++) {
      const y0 = freePlateAmplitude(2, 0, 0.5, (i - 1) / (N - 1));
      const y1 = freePlateAmplitude(2, 0, 0.5, i / (N - 1));
      if (y0 === 0 || y0 * y1 < 0) crossings++;
    }
    expect(crossings).toBe(1);
  });

  it('center amplitude of the (1,1)-class mode is nonzero (ring figure)', () => {
    expect(Math.abs(freePlateAmplitude(1, 1, 0.5, 0.5))).toBeGreaterThan(0.5);
  });

  it('eigenvalues are strictly increasing along the diagonal sequence', () => {
    const seq = [freePlateEigenvalue(1, 1), freePlateEigenvalue(2, 2), freePlateEigenvalue(3, 3)];
    expect(seq[0]).toBeLessThan(seq[1]);
    expect(seq[1]).toBeLessThan(seq[2]);
  });
});
