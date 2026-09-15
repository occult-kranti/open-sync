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
      Math.sin(2 * Math.PI * x) * Math.sin(3 * Math.PI * y),
      12,
    );
  });

  it('mix form supports fractional morphing and flags trivial mixes', () => {
    expect(Number.isFinite(squarePlateValueMix(0.4, 0.6, 1.5, 2.25, 0.7, 0.3))).toBe(true);
    expect(isTrivialMix(2, 2, 1, -1)).toBe(true); // cancels everywhere
    expect(isTrivialMix(1, 2, 1, -1)).toBe(false);
    expect(isTrivialMix(1, 2, 0, 0)).toBe(true);
    expect(() => squarePlateValueMix(0.5, 0.5, 0, 0, 1, 1)).toThrow();
  });
});

describe('bessel tables and circular plate', () => {
  it('zero tables are positive, sorted, and dense enough', () => {
    for (const table of [BESSEL_ZEROS, BESSEL_DERIVATIVE_ZEROS]) {
      expect(table.length).toBeGreaterThanOrEqual(6);
      for (const row of table) {
        expect(row.length).toBeGreaterThanOrEqual(5);
        for (let i = 0; i < row.length; i++) {
          expect(row[i]).toBeGreaterThan(0);
          if (i > 0) expect(row[i]).toBeGreaterThan(row[i - 1]);
        }
      }
    }
  });

  it('tabulated zeros are actual zeros of the series evaluation', () => {
    for (let m = 0; m <= 5; m++) {
      for (let s = 1; s <= 3; s++) {
        const k = circularWaveNumber(m, s, 'clamped');
        expect(Math.abs(besselJ(m, k))).toBeLessThan(1e-8);
      }
    }
  });

  it('besselJ matches known values', () => {
    expect(besselJ(0, 0)).toBeCloseTo(1, 12);
    expect(besselJ(1, 0)).toBeCloseTo(0, 12);
    expect(besselJ(0, 1)).toBeCloseTo(0.7651976865, 8);
    expect(besselJ(2, 5)).toBeCloseTo(0.0465651163, 6);
  });

  it('circular field is nodal at the clamped rim and finite on the disk', () => {
    for (const [m, s] of [[0, 1], [2, 2], [4, 1]] as const) {
      expect(Math.abs(circularPlateValue(1, 0.7, m, s, 'clamped'))).toBeLessThan(1e-6);
      for (let i = 1; i < 20; i++) {
        const v = circularPlateValue(i / 20, i * 0.9, m, s, 'clamped');
        expect(Number.isFinite(v)).toBe(true);
        expect(Math.abs(v)).toBeLessThanOrEqual(1.05);
      }
    }
  });

  it('rejects out-of-table mode indices', () => {
    expect(() => circularWaveNumber(9, 1)).toThrow();
    expect(() => circularWaveNumber(1, 99)).toThrow();
    expect(() => circularWaveNumber(1, 0)).toThrow();
  });
});

describe('frequencyToModes (honest ladder mapping)', () => {
  it('is monotonic: higher targets hit higher eigenvalue ladders', () => {
    const targets = [100, 200, 500, 900, 1700, 2600];
    const eigenvalues = targets.map((hz) => {
      const modes = frequencyToModes(hz, 'square', { fundamentalHz: 100, tolerance: 0.5, limit: 1 });
      expect(modes.length).toBe(1);
      return modes[0].eigenvalue;
    });
    for (let i = 1; i < eigenvalues.length; i++) {
      expect(eigenvalues[i]).toBeGreaterThanOrEqual(eigenvalues[i - 1]);
    }
  });

  it('returns exact hits on ladder rungs (thin plate f ∝ n² + m²)', () => {
    // Fundamental 100 Hz → mode (2,1) sits at 100·(4+1) = 500 Hz.
    const modes = frequencyToModes(500, 'square', { fundamentalHz: 100, tolerance: 0.01 });
    expect(modes[0].kind).toBe('square');
    if (modes[0].kind === 'square') {
      expect(modes[0].n * modes[0].n + modes[0].m * modes[0].m).toBe(5);
      expect(modes[0].relError).toBeLessThan(1e-9);
    }
  });

  it('membrane scaling uses f ∝ √(n² + m²)', () => {
    expect(squareModeHz(3, 4, 100, 'membrane')).toBeCloseTo(500, 9);
    expect(squareModeHz(3, 4, 100, 'plate')).toBeCloseTo(2500, 9);
  });

  it('returns [] for invalid frequency and respects tolerance', () => {
    expect(frequencyToModes(0, 'square')).toEqual([]);
    expect(frequencyToModes(-50, 'square')).toEqual([]);
    expect(frequencyToModes(NaN, 'square')).toEqual([]);
    // 107 Hz is 7% off every low rung of a 100 Hz plate → nothing within 2%.
    expect(frequencyToModes(107, 'square', { fundamentalHz: 100, tolerance: 0.02 })).toEqual([]);
  });

  it('circular mapping returns table-consistent modes', () => {
    const f = frequencyToModes(200, 'circular', { fundamentalHz: 100, tolerance: 0.5, limit: 3 });
    expect(f.length).toBeGreaterThan(0);
    for (const mode of f) {
      expect(mode.kind).toBe('circular');
      if (mode.kind === 'circular') {
        expect(mode.m).toBeGreaterThanOrEqual(0);
        expect(mode.s).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('driven superposition weights are normalized and peaked near the drive', () => {
    const plate = { fundamentalHz: 100, scaling: 'plate' as const };
    const modes = drivenSquareModes(500, {
      id: 't', label: 't', shape: 'square', material: 't', boundary: 'clamped',
      ...plate,
      note: '',
    });
    expect(modes.length).toBeGreaterThan(0);
    const wSum = modes.reduce((a, m) => a + m.weight, 0);
    expect(wSum).toBeCloseTo(1, 9);
    expect(modes[0].hz).toBeCloseTo(500, 6); // exact rung dominates
  });
});

describe('sand simulation', () => {
  it('particles converge toward nodal lines (mean |value| decreases)', () => {
    const field = plateField(spec(1, 2));
    const sand = createSand(400, 1234);
    const before = meanParticleAbs(sand, field);
    for (let i = 0; i < 240; i++) stepParticles(sand, field, 1 / 60, { jitter: 0.01 });
    const after = meanParticleAbs(sand, field);
    expect(after).toBeLessThan(before * 0.6);
    // And all particles remain on the plate.
    for (let i = 0; i < sand.count; i++) {
      expect(sand.x[i]).toBeGreaterThanOrEqual(0);
      expect(sand.x[i]).toBeLessThanOrEqual(1);
      expect(sand.y[i]).toBeGreaterThanOrEqual(0);
      expect(sand.y[i]).toBeLessThanOrEqual(1);
    }
  });

  it('circular sand stays inside the disk', () => {
    const sand = createSand(200, 7, true);
    const field = (x: number, y: number) => x - y;
    for (let i = 0; i < 120; i++) stepParticles(sand, field, 1 / 30);
    for (let i = 0; i < sand.count; i++) {
      const dx = sand.x[i] - 0.5;
      const dy = sand.y[i] - 0.5;
      expect(Math.hypot(dx, dy)).toBeLessThanOrEqual(0.5);
    }
  });

  it('is deterministic for equal seeds and diverges for different seeds', () => {
    const field = plateField(spec(2, 3, -1));
    const a = createSand(50, 42);
    const b = createSand(50, 42);
    const c = createSand(50, 43);
    for (let i = 0; i < 30; i++) {
      stepParticles(a, field, 1 / 60);
      stepParticles(b, field, 1 / 60);
      stepParticles(c, field, 1 / 60);
    }
    expect(Array.from(a.x)).toEqual(Array.from(b.x));
    expect(Array.from(a.y)).toEqual(Array.from(b.y));
    expect(Array.from(a.x)).not.toEqual(Array.from(c.x));
  });

  it('handles zero particles and zero dt', () => {
    const empty = createSand(0, 1);
    stepParticles(empty, () => 1, 1 / 60);
    expect(empty.count).toBe(0);
    expect(meanParticleAbs(empty, () => 1)).toBe(0);
    const sand = createSand(10, 5);
    const xs = Array.from(sand.x);
    stepParticles(sand, (x) => x, 0);
    expect(Array.from(sand.x)).toEqual(xs);
  });
});

describe('seeded PRNG', () => {
  it('is deterministic and produces values in [0, 1)', () => {
    const r1 = createPrng(99);
    const r2 = createPrng(99);
    for (let i = 0; i < 1000; i++) {
      const v = r1();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      expect(v).toBe(r2());
    }
  });

  it('state threading matches the closure form', () => {
    let s = seedPrng(7);
    const closure = createPrng(7);
    for (let i = 0; i < 50; i++) {
      const r = nextRandom(s);
      s = r.state;
      expect(r.value).toBe(closure());
    }
  });
});
