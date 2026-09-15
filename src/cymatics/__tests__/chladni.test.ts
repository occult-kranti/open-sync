import { describe, expect, it } from 'vitest';

import {
  BESSEL_DERIVATIVE_ZEROS,
  BESSEL_ZEROS,
  SQUARE_PLATE_MAX,
  besselJ,
  circularPlateValue,
  circularWaveNumber,
  computeAbsGrid,
  createPrng,
  createSand,
  drivenSquareModes,
  frequencyToModes,
  isTrivialMix,
  meanParticleAbs,
  nodalCount,
  nodalFraction,
  plateField,
  seedPrng,
  nextRandom,
  squareModeHz,
  squareNodalCrossings,
  squareNodalLineEstimate,
  squarePlateValue,
  squarePlateValueMix,
  stepParticles,
} from '../chladni';

const spec = (n: number, m: number, sign: 1 | -1 = 1) => ({
  shape: 'square' as const,
  n,
  m,
  sign,
  mixA: 1,
  mixB: -1,
  useMix: false,
  circM: 0,
  circS: 1,
  boundary: 'clamped' as const,
});

describe('square plate field', () => {
  it('rejects n = m = 0', () => {
    expect(() => squarePlateValue(0.5, 0.5, 0, 0)).toThrow(/not a vibration mode/);
    expect(() => plateField(spec(0, 0))).toThrow();
  });

  it('rejects negative and non-integer mode indices', () => {
    expect(() => squarePlateValue(0.5, 0.5, -1, 2)).toThrow();
    expect(() => squarePlateValue(0.5, 0.5, 1.5, 2)).toThrow();
  });

  it('is symmetric: pattern(n,m) at (x,y) equals pattern(m,n) at (y,x) up to sign', () => {
    for (const [n, m] of [[1, 2], [0, 3], [2, 5]] as const) {
      for (const sign of [1, -1] as const) {
        for (const [x, y] of [[0.13, 0.71], [0.5, 0.5], [0.9, 0.05]] as const) {
          const a = squarePlateValue(x, y, n, m, sign);
          const b = squarePlateValue(y, x, m, n, sign);
          expect(Math.abs(a - b)).toBeLessThan(1e-12);
        }
      }
    }
  });

  it('stays within the theoretical bound |value| ≤ 2', () => {
    for (let i = 0; i < 500; i++) {
      const x = (i * 0.6180339887) % 1;
      const y = (i * 0.4142135623) % 1;
      expect(Math.abs(squarePlateValue(x, y, 3, 5, -1))).toBeLessThanOrEqual(SQUARE_PLATE_MAX + 1e-12);
    }
  });

  it('nodal line count grows with mode order', () => {
    // Crossing count is the honest "number of lines" metric — band area
    // depends on gradient steepness and is not monotonic per mode pair.
    const orders = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] as const;
    const counts = orders.map(([n, m]) => squareNodalCrossings(n, m));
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThan(counts[i - 1]);
    }
    // Band area still grows in aggregate: low orders vs high orders.
    const low = squareNodalLineEstimate(0, 1) + squareNodalLineEstimate(1, 2);
    const high = squareNodalLineEstimate(4, 5) + squareNodalLineEstimate(5, 6);
    expect(high).toBeGreaterThan(low);
  });

  it('threshold = 0 → no nodal cells; threshold = max → all cells nodal', () => {
    const field = plateField(spec(1, 2));
    const grid = computeAbsGrid(field, 64);
    expect(nodalCount(grid, 0)).toBe(0);
    expect(nodalCount(grid, grid.max)).toBe(64 * 64);
    expect(nodalFraction(grid, grid.max + 1e-6)).toBe(1);
  });

  it('mix form reproduces the simply-supported mode for a=1, b=0', () => {
    const x = 0.31;
    const y = 0.77;
    expect(squarePlateValueMix(x, y, 2, 3, 1, 0)).toBeCloseTo(
      Math.sin(2 * Math.PI * x) * Math.sin(3 * Math.PI y),
      12,
    );
  });
});
