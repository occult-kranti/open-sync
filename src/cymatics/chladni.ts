/**
 * Cymatic plate mathematics — pure, node-testable.
 *
 * Square plate (Chladni): the classic idealized nodal pattern for a square
 * plate driven at the center (Paul Bourke 2003 form) is
 *
 *   value(x, y) = cos(n·π·x)·cos(m·π·y) − sign·cos(m·π·x)·cos(n·π·y)
 *
 * with x, y ∈ [0, 1], integers n, m ≥ 0 (n = m = 0 excluded — that is rigid
 * translation, not a vibration mode), sign ∈ {+1, −1}. Nodal lines are the
 * zero set; we mark |value| < threshold as "nodal" for a finite-width line.
 *
 * Generalized sin-form (simply-supported plate modes + degenerate mix):
 *
 *   value(x, y) = a·sin(n·π·x)·sin(m·π·y) + b·sin(m·π·x)·sin(n·π·y)
 *
 * with a, b ∈ [−1, 1]. Fractional n, m are allowed here to morph smoothly
 * between integer modes (art mode). Note a = −b reproduces the difference
 * family; n = m with a = −b is identically zero (trivial).
 *
 * Circular plate: modes of an ideal plate factor in polar coordinates as
 *
 *   value(r, θ) = J_m(k·r)·cos(m·θ)
 *
 * where k is chosen so the rim r = 1 is nodal: a zero of J_m (clamped rim)
 * or of J'_m (free rim approximation). Bessel zeros are hardcoded below.
 *
 * HONESTY NOTE (must surface in UI): `frequencyToModes` maps a target
 * frequency to ideal-plate modal indices using an eigenfrequency ladder
 * (thin plate: f ∝ n² + m²; membrane: f ∝ √(n² + m²)) relative to a chosen
 * fundamental. Real Chladni patterns depend on plate geometry, thickness,
 * material, and boundary conditions — NOT on frequency alone (COMSOL;
 * MDPI Entropy 26(3):264; Suciu & Karimine 2024). This module simulates
 * idealized virtual plates for visualization; it does not claim a given Hz
 * "produces" a specific physical pattern.
 */

// ---------------------------------------------------------------------------
// Seeded PRNG (mulberry32) — deterministic, serializable state.
// ---------------------------------------------------------------------------

export type PrngState = number;

/** Create a PRNG state from a seed. */
export function seedPrng(seed: number): PrngState {
  return (seed >>> 0) || 1;
}

/** Advance the PRNG; returns the next value in [0, 1) and the next state. */
export function nextRandom(state: PrngState): { value: number; state: PrngState } {
  const t = (state + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return { value, state: t >>> 0 };
}

/** Convenience functional PRNG over a mutable box (used by the sand sim). */
export function createPrng(seed: number): () => number {
  let s = seedPrng(seed);
  return () => {
    const r = nextRandom(s);
    s = r.state;
    return r.value;
  };
}

// ---------------------------------------------------------------------------
// Square plate (Chladni figures)
// ---------------------------------------------------------------------------

export type PlateSign = 1 | -1;

export function assertValidSquareMode(n: number, m: number): void {
  if (!Number.isInteger(n) || !Number.isInteger(m)) {
    throw new Error(`mode indices must be integers (got n=${n}, m=${m})`);
  }
  if (n < 0 || m < 0) {
    throw new Error(`mode indices must be ≥ 0 (got n=${n}, m=${m})`);
  }
  if (n === 0 && m === 0) {
    throw new Error('n = m = 0 is not a vibration mode (rigid translation)');
  }
}

/**
 * Square-plate Chladni field value at (x, y) ∈ [0, 1]² (Bourke cos-form).
 * |value| ≤ 2 (both cosine products bounded by 1).
 */
export function squarePlateValue(
  x: number,
  y: number,
  n: number,
  m: number,
  sign: PlateSign = 1,
): number {
  assertValidSquareMode(n, m);
  return (
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) -
    sign * Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y)
  );
}

/** Theoretical max of |value| for the square plate (both terms ≤ 1). */
export const SQUARE_PLATE_MAX = 2;

/** True when (x, y) sits on a nodal line for the given mode. */
export function isNodalSquare(
  x: number,
  y: number,
  n: number,
  m: number,
  threshold: number,
  sign: PlateSign = 1,
): boolean {
  return Math.abs(squarePlateValue(x, y, n, m, sign)) < threshold;
}

/**
 * Generalized simply-supported form with mix coefficients:
 *   a·sin(n·π·x)·sin(m·π·y) + b·sin(m·π·x)·sin(n·π·y)
 *
 * Fractional n, m ≥ 0 are allowed (smooth morphing between integer modes —
 * "art mode"). Integer n, m give the exact simply-supported plate modes and
 * their degenerate mixes ("physics mode"). |value| ≤ |a| + |b|.
 */
export function squarePlateValueMix(
  x: number,
  y: number,
  n: number,
  m: number,
  a: number,
  b: number,
): number {
  if (!(n >= 0) || !(m >= 0)) {
    throw new Error(`mode indices must be ≥ 0 (got n=${n}, m=${m})`);
  }
  if (n === 0 && m === 0) {
    throw new Error('n = m = 0 is not a vibration mode (rigid translation)');
  }
  return (
    a * Math.sin(n * Math.PI * x) * Math.sin(m * Math.PI * y) +
    b * Math.sin(m * Math.PI * x) * Math.sin(n * Math.PI * y)
  );
}

/** True when the mixed sin-form is identically zero (degenerate case). */
export function isTrivialMix(n: number, m: number, a: number, b: number): boolean {
  if (a === 0 && b === 0) return true;
  // n = m with a = −b cancels everywhere; n = m = 0 already rejected.
  return n === m && a === -b;
}

// ---------------------------------------------------------------------------
// Bessel functions and zero tables (circular plate)
// ---------------------------------------------------------------------------

/**
 * Zeros of J_m for m = 0..5 (first several each), ascending.
 * Source: Abramowitz & Stegun Table 9.5.
 */
export const BESSEL_ZEROS: readonly (readonly number[])[] = [
  /* J0 */ [2.4048255577, 5.5200781103, 8.6537279129, 11.7915344391, 14.9309177086, 18.0710639679, 21.2116366299, 24.3524715308],
  /* J1 */ [3.8317059702, 7.0155866698, 10.1734681351, 13.3236919363, 16.4706300509, 19.6158585105, 22.7600843806, 25.9036720876],
  /* J2 */ [5.1356223018, 8.4172441404, 11.6198411721, 14.7959517824, 17.959819495, 21.116997053, 24.2701123136],
  /* J3 */ [6.3801618959, 9.76102313, 13.0152007217, 16.2234661603, 19.4094152264, 22.5827295933],
  /* J4 */ [7.5883424345, 11.0647094886, 14.3725366716, 17.6159660498, 20.826932957, 24.0190195248],
  /* J5 */ [8.7714838159, 12.3386041974, 15.7001740794, 18.9801338752, 22.2177998966],
];

/**
 * Zeros of J'_m for m = 0..5 (free-rim approximation), ascending.
 * J'_0 = −J_1, so row 0 matches the J1 zeros. (A&S Table 9.5.)
 */
export const BESSEL_DERIVATIVE_ZEROS: readonly (readonly number[])[] = [
  /* J'0 */ [3.8317059702, 7.0155866698, 10.1734681351, 13.3236919363, 16.4706300509, 19.6158585105, 22.7600843806],
  /* J'1 */ [1.8411837813, 5.3314427735, 8.5363163664, 11.7060049026, 14.8635886339, 18.0155278627, 21.1643698592],
  /* J'2 */ [3.0542369282, 6.7061331942, 9.9694678231, 13.170370856, 16.3475225213, 19.5129135364],
  /* J'3 */ [4.2011889412, 8.0152365984, 11.3459243107, 14.5858482862, 17.7887478661, 20.9724769366],
  /* J'4 */ [5.3175531261, 9.2823962852, 12.6819084426, 15.9641070372, 19.196028805],
  /* J'5 */ [6.4156163757, 10.5198608737, 13.9871886301, 17.3128424989, 20.5755145214],
];

export type CircularBoundary = 'clamped' | 'free';

/** k_r for circular mode (m, s): the s-th zero (1-based) of J_m or J'_m. */
export function circularWaveNumber(m: number, s: number, boundary: CircularBoundary = 'clamped'): number {
  if (!Number.isInteger(m) || m < 0) throw new Error(`azimuthal order must be an integer ≥ 0 (got ${m})`);
  if (!Number.isInteger(s) || s < 1) throw new Error(`radial order must be an integer ≥ 1 (got ${s})`);
  if (m >= BESSEL_ZEROS.length) throw new Error(`azimuthal order ${m} outside zero table (max ${BESSEL_ZEROS.length - 1})`);
  const table = boundary === 'free' ? BESSEL_DERIVATIVE_ZEROS : BESSEL_ZEROS;
  const row = table[m];
  if (s > row.length) throw new Error(`radial order ${s} outside zero table for m=${m} (max ${row.length})`);
  return row[s - 1];
}

/**
 * Bessel function of the first kind J_m(x) for integer m ≥ 0 via power
 * series. Accurate to ~1e-12 for |x| ≲ 25 (covers every zero in the tables).
 */
export function besselJ(m: number, x: number): number {
  if (!Number.isInteger(m) || m < 0) throw new Error(`order must be an integer ≥ 0 (got ${m})`);
  const ax = Math.abs(x);
  if (ax > 30) throw new Error(`besselJ series not valid for |x| = ${ax} > 30`);
  const half = x / 2;
  let term = Math.pow(half, m) / factorial(m);
  let sum = term;
  const halfSq = half * half;
  for (let k = 1; k < 80; k++) {
    term *= -halfSq / (k * (k + m));
    sum += term;
    if (Math.abs(term) < 1e-16 * Math.max(1, Math.abs(sum))) break;
  }
  return sum;
}

function factorial(k: number): number {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return f;
}

/**
 * Circular-plate field value at polar (r, θ), r ∈ [0, 1]:
 * J_m(k·r)·cos(m·θ), normalized so max |value| ≈ 1 for the mode.
 */
export function circularPlateValue(
  r: number,
  theta: number,
  m: number,
  s: number,
  boundary: CircularBoundary = 'clamped',
): number {
  const k = circularWaveNumber(m, s, boundary);
  const raw = besselJ(m, k * Math.max(0, Math.min(1, r))) * Math.cos(m * theta);
  return raw / circularPlateNorm(m, s, boundary);
}

/** Approximate normalization: max of |J_m| on the mode's k·r range. */
export function circularPlateNorm(m: number, s: number, boundary: CircularBoundary = 'clamped'): number {
  const k = circularWaveNumber(m, s, boundary);
  if (m === 0) return 1; // J_0(0) = 1 is the global max.
  // Sample |J_m| over [0, k]; 64 samples suffice for a stable peak estimate.
  let peak = 0;
  for (let i = 0; i <= 64; i++) {
    const v = Math.abs(besselJ(m, (k * i) / 64));
    if (v > peak) peak = v;
  }
  return peak || 1;
}

// ---------------------------------------------------------------------------
// Nodal statistics (used by renderer + tests)
// ---------------------------------------------------------------------------

export interface NodalGrid {
  res: number;
  /** |value| per cell, row-major, y fastest-varying upward from 0. */
  abs: Float32Array;
  max: number;
}

/**
 * Evaluate |field| on a res×res grid over the unit domain. For circular
 * plates, cells outside the disk are filled with NaN.
 */
export function computeAbsGrid(
  field: (x: number, y: number) => number,
  res: number,
  circular = false,
): NodalGrid {
  const r = Math.max(1, Math.floor(res));
  const abs = new Float32Array(r * r);
  let max = 0;
  for (let iy = 0; iy < r; iy++) {
    for (let ix = 0; ix < r; ix++) {
      const x = (ix + 0.5) / r;
      const y = (iy + 0.5) / r;
      let v: number;
      if (circular) {
        const dx = x - 0.5;
        const dy = y - 0.5;
        if (dx * dx + dy * dy > 0.25) {
          v = NaN;
          abs[iy * r + ix] = v;
          continue;
        }
        v = Math.abs(field(x, y));
      } else {
        v = Math.abs(field(x, y));
      }
      abs[iy * r + ix] = v;
      if (v > max) max = v;
    }
  }
  return { res: r, abs, max };
}

/** Count grid cells below the nodal threshold (NaN cells never count). */
export function nodalCount(grid: NodalGrid, threshold: number): number {
  let c = 0;
  for (let i = 0; i < grid.abs.length; i++) {
    const v = grid.abs[i];
    if (!Number.isNaN(v) && v < threshold) c++;
  }
  return c;
}

/** Fraction of valid cells that are nodal at the given threshold. */
export function nodalFraction(grid: NodalGrid, threshold: number): number {
  let valid = 0;
  for (let i = 0; i < grid.abs.length; i++) if (!Number.isNaN(grid.abs[i])) valid++;
  return valid === 0 ? 0 : nodalCount(grid, threshold) / valid;
}

// ---------------------------------------------------------------------------
// Eigenfrequency ladders — virtual plates
// ---------------------------------------------------------------------------

/**
 * Square-plate eigenvalue scaling. A thin (Kirchhoff–Love) plate obeys
 * f ∝ n² + m² (ω ∝ k²); a membrane obeys f ∝ √(n² + m²) (ω ∝ k).
 * Real Chladni plates are plates, so 'plate' is the default.
 */
export type SquareScaling = 'plate' | 'membrane';

export function squareEigenvalue(n: number, m: number, scaling: SquareScaling = 'plate'): number {
  assertValidSquareMode(n, m);
  const sum = n * n + m * m;
  return scaling === 'plate' ? sum : Math.sqrt(sum);
}

/**
 * A declared virtual plate: shape + material + fundamental. The eigenfrequency
 * ladder is derived from it; this is what makes the frequency→pattern mapping
 * honest — the user picks the physical object, and the driving frequency
 * excites whichever modes lie nearby.
 */
export interface VirtualPlate {
  id: string;
  label: string;
  shape: 'square' | 'circular';
  material: string;
  /** Fundamental modal frequency, Hz (square: mode (1,1) sin-form; circular: (0,1)). */
  fundamentalHz: number;
  boundary: CircularBoundary;
  scaling: SquareScaling;
  note: string;
}

export const VIRTUAL_PLATES: readonly VirtualPlate[] = [
  {
    id: 'steel-square-30',
    label: 'STEEL PLATE 30×30 CM',
    shape: 'square',
    material: 'steel, 1 mm',
    fundamentalHz: 180,
    boundary: 'clamped',
    scaling: 'plate',
    note: 'Simply-supported square steel plate — classic Chladni demo geometry.',
  },
  {
    id: 'glass-square-25',
    label: 'GLASS PLATE 25×25 CM',
    shape: 'square',
    material: 'soda glass, 2 mm',
    fundamentalHz: 320,
    boundary: 'clamped',
    scaling: 'plate',
    note: 'Stiffer and lighter than steel → ladder shifted upward.',
  },
  {
    id: 'plywood-square-40',
    label: 'PLYWOOD PLATE 40×40 CM',
    shape: 'square',
    material: 'birch ply, 4 mm',
    fundamentalHz: 95,
    boundary: 'clamped',
    scaling: 'plate',
    note: 'Lossy wood plate — wide resonances, heavy mode mixing.',
  },
  {
    id: 'steel-disc-17',
    label: 'STEEL DISC Ø17 CM',
    shape: 'circular',
    material: 'lacquered steel, 0.5 mm',
    fundamentalHz: 110,
    boundary: 'free',
    scaling: 'plate',
    note: 'Jeulin-style teaching disc, center-driven, free rim.',
  },
  {
    id: 'membrane-square',
    label: 'IDEAL MEMBRANE (SQUARE)',
    shape: 'square',
    material: 'idealized, tension-dominated',
    fundamentalHz: 120,
    boundary: 'clamped',
    scaling: 'membrane',
    note: 'Membrane limit (f ∝ √(n²+m²)) for comparison with the plate law.',
  },
] as const;

export function virtualPlateById(id: string): VirtualPlate {
  return VIRTUAL_PLATES.find((p) => p.id === id) ?? VIRTUAL_PLATES[0];
}

// ---------------------------------------------------------------------------
// Frequency → mode mapping (idealized — see HONESTY NOTE in header)
// ---------------------------------------------------------------------------

export interface SquareModeCandidate {
  kind: 'square';
  n: number;
  m: number;
  sign: PlateSign;
  /** Dimensionless eigenvalue relative to the fundamental (see scaling). */
  eigenvalue: number;
  /** Ideal modal frequency for the given fundamental, Hz. */
  hz: number;
  /** |hz − target| relative error. */
  relError: number;
}

export interface CircularModeCandidate {
  kind: 'circular';
  m: number;
  s: number;
  boundary: CircularBoundary;
  /** Dimensionless eigenvalue (k/k_ref)² — thin-plate ω ∝ k². */
  eigenvalue: number;
  hz: number;
  relError: number;
}

export type ModeCandidate = SquareModeCandidate | CircularModeCandidate;

export interface FrequencyToModesOptions {
  /** Frequency of the plate's fundamental mode, Hz (default 100). */
  fundamentalHz?: number;
  /** Max mode order scanned (square: n,m ≤ maxOrder; circular: m, s). */
  maxOrder?: number;
  /** Keep candidates within this relative error of the target (default 0.15). */
  tolerance?: number;
  boundary?: CircularBoundary;
  /** Square eigenvalue scaling (default 'plate': f ∝ n² + m²). */
  scaling?: SquareScaling;
  /** Max candidates returned (default 8), sorted by closeness. */
  limit?: number;
}

/**
 * Map a target frequency to ideal-plate mode candidates.
 *
 * Square: f_nm = f₀·(n² + m²) for a thin plate (default) or f₀·√(n² + m²)
 * for a membrane; f₀ is the fundamental of mode (1,0). Circular: thin-plate
 * f_ms = f₀·(k_ms/k_ref)² referenced to the lowest mode in the selected
 * boundary's zero table.
 *
 * Degenerate square modes are listed once per (n ≤ m) pair, with both signs
 * when n ≠ m, since a real plate mixes them.
 */
export function frequencyToModes(
  hz: number,
  shape: 'square' | 'circular',
  opts: FrequencyToModesOptions = {},
): ModeCandidate[] {
  if (!Number.isFinite(hz) || hz <= 0) return [];
  const fundamentalHz = opts.fundamentalHz ?? 100;
  const maxOrder = Math.max(1, Math.floor(opts.maxOrder ?? 6));
  const tolerance = opts.tolerance ?? 0.15;
  const scaling = opts.scaling ?? 'plate';
  const limit = opts.limit ?? 8;
  const out: ModeCandidate[] = [];

  if (shape === 'square') {
    const target = hz / fundamentalHz;
    for (let n = 0; n <= maxOrder; n++) {
      for (let m = n; m <= maxOrder; m++) {
        if (n === 0 && m === 0) continue;
        const ev = scaling === 'plate' ? n * n + m * m : Math.sqrt(n * n + m * m);
        const f = fundamentalHz * ev;
        const relError = Math.abs(f - hz) / hz;
        if (Math.abs(ev - target) / target > tolerance) continue;
        out.push({ kind: 'square', n, m, sign: 1, eigenvalue: ev, hz: f, relError });
        if (n !== m) out.push({ kind: 'square', n, m, sign: -1, eigenvalue: ev, hz: f, relError });
      }
    }
  } else {
    const boundary = opts.boundary ?? 'clamped';
    const kRef = circularWaveNumber(0, 1, boundary);
    const table = boundary === 'free' ? BESSEL_DERIVATIVE_ZEROS : BESSEL_ZEROS;
    for (let m = 0; m <= Math.min(maxOrder, table.length - 1); m++) {
      const maxS = Math.min(maxOrder, table[m].length);
      for (let s = 1; s <= maxS; s++) {
        const k = circularWaveNumber(m, s, boundary);
        const ev = (k / kRef) ** 2;
        const f = fundamentalHz * ev;
        const relError = Math.abs(f - hz) / hz;
        if (relError > tolerance) continue;
        out.push({ kind: 'circular', m, s, boundary, eigenvalue: ev, hz: f, relError });
      }
    }
  }

  out.sort((a, b) => a.relError - b.relError);
  return out.slice(0, limit);
}

/** Ideal modal frequency of a square mode, Hz. */
export function squareModeHz(
  n: number,
  m: number,
  fundamentalHz = 100,
  scaling: SquareScaling = 'plate',
): number {
  return fundamentalHz * squareEigenvalue(n, m, scaling);
}

/** Ideal modal frequency of a circular mode, Hz (thin-plate ω ∝ k²). */
export function circularModeHz(
  m: number,
  s: number,
  fundamentalHz = 100,
  boundary: CircularBoundary = 'clamped',
): number {
  const kRef = circularWaveNumber(0, 1, boundary);
  const k = circularWaveNumber(m, s, boundary);
  return fundamentalHz * (k / kRef) ** 2;
}

// ---------------------------------------------------------------------------
// Driven-plate superposition ("physics mode")
//
// A real plate driven at frequency f responds as a weighted sum of nearby
// eigenmodes, with Lorentzian resonance weights w_mn ∝ 1/((f − f_mn)² + γ²)
// and damping γ (Tuan et al. 2018; ratwolfzero/Chladni_Figures, MIT — model
// re-implemented from the published physics, no code copied).
// ---------------------------------------------------------------------------

export interface DrivenSquareMode {
  n: number;
  m: number;
  hz: number;
  /** Normalized Lorentzian weight (all returned modes sum to 1). */
  weight: number;
}

export interface DrivenCircularMode {
  m: number;
  s: number;
  hz: number;
  weight: number;
}

/**
 * Lorentzian-weighted square modes near a driving frequency, on a virtual
 * plate's ladder. `gammaHz` defaults to 6% of the drive frequency (measured
 * plate damping ratios are ~0.08–0.12; Suciu & Karimine 2024).
 */
export function drivenSquareModes(
  hz: number,
  plate: VirtualPlate,
  gammaHz?: number,
  maxOrder = 8,
  limit = 6,
): DrivenSquareMode[] {
  if (!Number.isFinite(hz) || hz <= 0) return [];
  const gamma = Math.max(1e-6, gammaHz ?? hz * 0.06);
  const g2 = gamma * gamma;
  const raw: DrivenSquareMode[] = [];
  for (let n = 0; n <= maxOrder; n++) {
    for (let m = 0; m <= maxOrder; m++) {
      if (n === 0 && m === 0) continue;
      const f = squareModeHz(n, m, plate.fundamentalHz, plate.scaling);
      // Skip modes far above the drive — their weight is negligible.
      if (f > hz * 4 && raw.length > 0) continue;
      const d = f - hz;
      raw.push({ n, m, hz: f, weight: 1 / (d * d + g2) });
    }
  }
  raw.sort((a, b) => b.weight - a.weight);
  const top = raw.slice(0, Math.max(1, limit));
  const sum = top.reduce((acc, m) => acc + m.weight, 0) || 1;
  return top.map((m) => ({ ...m, weight: m.weight / sum }));
}

/** Lorentzian-weighted circular modes near a driving frequency. */
export function drivenCircularModes(
  hz: number,
  plate: VirtualPlate,
  gammaHz?: number,
  maxOrder = 5,
  limit = 6,
): DrivenCircularMode[] {
  if (!Number.isFinite(hz) || hz <= 0) return [];
  const gamma = Math.max(1e-6, gammaHz ?? hz * 0.06);
  const g2 = gamma * gamma;
  const raw: DrivenCircularMode[] = [];
  const table = plate.boundary === 'free' ? BESSEL_DERIVATIVE_ZEROS : BESSEL_ZEROS;
  for (let m = 0; m <= Math.min(maxOrder, table.length - 1); m++) {
    const maxS = Math.min(maxOrder, table[m].length);
    for (let s = 1; s <= maxS; s++) {
      const f = circularModeHz(m, s, plate.fundamentalHz, plate.boundary);
      if (f > hz * 4 && raw.length > 0) continue;
      const d = f - hz;
      raw.push({ m, s, hz: f, weight: 1 / (d * d + g2) });
    }
  }
  raw.sort((a, b) => b.weight - a.weight);
  const top = raw.slice(0, Math.max(1, limit));
  const sum = top.reduce((acc, mm) => acc + mm.weight, 0) || 1;
  return top.map((mm) => ({ ...mm, weight: mm.weight / sum }));
}

/**
 * Build a driven-plate field: Σ w_nm·sin(nπx)sin(mπy) (simply-supported
 * plate response). Normalized so max |field| ≤ 1 (sum of weights = 1).
 */
export function drivenSquareField(modes: readonly DrivenSquareMode[]): (x: number, y: number) => number {
  const terms = modes.map((md) => ({ ...md, nPi: md.n * Math.PI, mPi: md.m * Math.PI }));
  return (x, y) => {
    let v = 0;
    for (const t of terms) {
      v += t.weight * Math.sin(t.nPi * x) * Math.sin(t.mPi * y);
    }
    return v;
  };
}

/** Build a driven circular-plate field: Σ w_ms·J_m(k_ms·r)·cos(mθ)/norm. */
export function drivenCircularField(
  modes: readonly DrivenCircularMode[],
  boundary: CircularBoundary = 'clamped',
): (x: number, y: number) => number {
  const terms = modes.map((md) => ({
    ...md,
    k: circularWaveNumber(md.m, md.s, boundary),
    norm: circularPlateNorm(md.m, md.s, boundary),
  }));
  return (x, y) => {
    const dx = x - 0.5;
    const dy = y - 0.5;
    const r = Math.hypot(dx, dy) * 2;
    if (r > 1) return 0;
    const theta = Math.atan2(dy, dx);
    let v = 0;
    for (const t of terms) {
      v += (t.weight * besselJ(t.m, t.k * r) * Math.cos(t.m * theta)) / t.norm;
    }
    return v;
  };
}

// ---------------------------------------------------------------------------
// Sand simulation — particles drift down-gradient of |value| (Euler step)
// ---------------------------------------------------------------------------

export interface SandState {
  count: number;
  x: Float64Array;
  y: Float64Array;
  prng: PrngState;
  circular: boolean;
}

export interface StepOptions {
  /** Drift speed in domain units per second along −∇|value| (default 0.35). */
  speed?: number;
  /** Random jitter amplitude per √second (default 0.02) — thermal wiggle. */
  jitter?: number;
  /** Finite-difference epsilon for the gradient (default 1e-3). */
  eps?: number;
}

/** Uniform random particle layout over the plate domain (seeded). */
export function createSand(count: number, seed = 1, circular = false): SandState {
  const n = Math.max(0, Math.floor(count));
  const x = new Float64Array(n);
  const y = new Float64Array(n);
  let prng = seedPrng(seed);
  for (let i = 0; i < n; i++) {
    if (circular) {
      // Uniform over the inscribed disk via rejection from the unit square.
      let dx = 0;
      let dy = 0;
      do {
        const a = nextRandom(prng);
        prng = a.state;
        const b = nextRandom(prng);
        prng = b.state;
        dx = a.value - 0.5;
        dy = b.value - 0.5;
      } while (dx * dx + dy * dy > 0.25);
      x[i] = dx + 0.5;
      y[i] = dy + 0.5;
    } else {
      const a = nextRandom(prng);
      prng = a.state;
      const b = nextRandom(prng);
      prng = b.state;
      x[i] = a.value;
      y[i] = b.value;
    }
  }
  return { count: n, x, y, prng, circular };
}

/**
 * One Euler step: each particle moves down the gradient of |field(x,y)| and
 * gets a small seeded jitter. Mutates and returns `state` (allocation-free
 * for the 60 fps render loop; copy the state first if you need immutability).
 *
 * Deterministic for a given (state, field, dt, opts).
 */
export function stepParticles(
  state: SandState,
  field: (x: number, y: number) => number,
  dt: number,
  opts: StepOptions = {},
): SandState {
  const speed = opts.speed ?? 0.35;
  const jitter = opts.jitter ?? 0.02;
  const eps = opts.eps ?? 1e-3;
  const step = speed * Math.max(0, dt);
  const jig = jitter * Math.sqrt(Math.max(0, dt));
  const inv2e = 1 / (2 * eps);

  for (let i = 0; i < state.count; i++) {
    const px = state.x[i];
    const py = state.y[i];
    const gx =
      (Math.abs(field(px + eps, py)) - Math.abs(field(px - eps, py))) * inv2e;
    const gy =
      (Math.abs(field(px, py + eps)) - Math.abs(field(px, py - eps))) * inv2e;
    const glen = Math.hypot(gx, gy);
    let nx = px;
    let ny = py;
    if (glen > 1e-9) {
      nx -= (gx / glen) * step;
      ny -= (gy / glen) * step;
    }
    if (jig > 0) {
      const a = nextRandom(state.prng);
      state.prng = a.state;
      const b = nextRandom(state.prng);
      state.prng = b.state;
      nx += (a.value - 0.5) * 2 * jig;
      ny += (b.value - 0.5) * 2 * jig;
    }
    // Keep particles on the plate.
    if (state.circular) {
      const dx = nx - 0.5;
      const dy = ny - 0.5;
      const rr = Math.hypot(dx, dy);
      const rMax = 0.499;
      if (rr > rMax) {
        nx = 0.5 + (dx / rr) * rMax;
        ny = 0.5 + (dy / rr) * rMax;
      }
    } else {
      nx = Math.min(1, Math.max(0, nx));
      ny = Math.min(1, Math.max(0, ny));
    }
    state.x[i] = nx;
    state.y[i] = ny;
  }
  return state;
}

/** Mean |field| over all particles — falls as sand collects on nodal lines. */
export function meanParticleAbs(state: SandState, field: (x: number, y: number) => number): number {
  if (state.count === 0) return 0;
  let sum = 0;
  for (let i = 0; i < state.count; i++) sum += Math.abs(field(state.x[i], state.y[i]));
  return sum / state.count;
}

// ---------------------------------------------------------------------------
// Field factory shared by renderer / page / tests
// ---------------------------------------------------------------------------

export interface PlateSpec {
  shape: 'square' | 'circular';
  /** Square mode indices (cos-form, integers). */
  n: number;
  m: number;
  sign: PlateSign;
  /** Sin-form mix coefficients (used when useMix = true; fractional n/m ok). */
  mixA: number;
  mixB: number;
  useMix: boolean;
  /** Circular mode indices (circular plate). */
  circM: number;
  circS: number;
  boundary: CircularBoundary;
}

/** Build the field function for a plate spec: (x, y) ∈ [0,1]² → value. */
export function plateField(spec: PlateSpec): (x: number, y: number) => number {
  if (spec.shape === 'square') {
    if (spec.useMix) {
      const { n, m, mixA, mixB } = spec;
      return (x, y) => squarePlateValueMix(x, y, n, m, mixA, mixB);
    }
    assertValidSquareMode(spec.n, spec.m);
    return (x, y) => squarePlateValue(x, y, spec.n, spec.m, spec.sign);
  }
  const k = circularWaveNumber(spec.circM, spec.circS, spec.boundary);
  const norm = circularPlateNorm(spec.circM, spec.circS, spec.boundary);
  return (x, y) => {
    const dx = x - 0.5;
    const dy = y - 0.5;
    const r = Math.hypot(dx, dy) * 2; // disk of radius 0.5 → r ∈ [0, 1]
    if (r > 1) return 0;
    const theta = Math.atan2(dy, dx);
    return (besselJ(spec.circM, k * r) * Math.cos(spec.circM * theta)) / norm;
  };
}

/**
 * Approximate nodal-line band size for a square mode, computed by counting
 * near-zero cells on a grid. Used for the "order ↑ → lines ↑" invariant
 * without analytic bookkeeping.
 */
export function squareNodalLineEstimate(n: number, m: number, sign: PlateSign = 1, res = 128): number {
  const field = (x: number, y: number) => squarePlateValue(x, y, n, m, sign);
  const grid = computeAbsGrid(field, res);
  // Threshold at 10% of max separates the nodal line band robustly.
  return nodalCount(grid, grid.max * 0.1);
}

/**
 * Count nodal-line crossings of a square mode along horizontal scanlines.
 * Unlike band area, this grows monotonically with mode order — it counts
 * actual curves rather than gradient-dependent band width.
 */
export function squareNodalCrossings(
  n: number,
  m: number,
  sign: PlateSign = 1,
  lines = 48,
  samples = 512,
): number {
  assertValidSquareMode(n, m);
  let total = 0;
  for (let i = 0; i < lines; i++) {
    const y = (i + 0.5) / lines;
    let prev = squarePlateValue(0.5 / samples, y, n, m, sign);
    for (let j = 1; j < samples; j++) {
      const v = squarePlateValue((j + 0.5) / samples, y, n, m, sign);
      if (prev * v < 0) total++;
      prev = v;
    }
  }
  return total;
}
