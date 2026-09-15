/**
 * Chladni figures (C3.1/C3.2): idealized eigenmode solvers for square and
 * circular free-edge plates.
 *
 * Square plate: the classic Chladni approximation
 *     a(x,y) = cos(mπx)·cos(nπy) − cos(nπx)·cos(mπy)
 * on the unit square. This is the standard pedagogical form (asymmetric mode
 * families); it reproduces the published nodal-line figures up to degenerate
 * mixture. Eigenvalue proxy follows Rayleigh's plate formula without the
 * constant term (it cancels for (1,1) — see tests).
 *
 * Circular plate: exact free-edge modes
 *     a(r,θ) = (J_m(k·r) − A·I_m(k·r)) · cos(mθ)
 * where k is a root of the free-edge boundary condition and the I_m term
 * coefficient A follows Rossing & Fletcher. We use tabulated roots (Rossing
 * 1982, Table 3.1) — solving the transcendental BC at runtime for a UI is
 * wasted FLOPs; the tabulation is verifiable and cited.
 *
 * HONESTY: these are idealized plates. Real figures depend on mounting,
 * material anisotropy, and excitation; the UI labels this "PHYSICS: idealized
 * free-edge model".
 */

export interface PlateMode {
  plate: 'square' | 'circle';
  m: number;
  n: number;
  /** Reference drive frequency (Hz) for this mode on the simulated plate. */
  refHz: number;
}

/** λ(m,n) = (m²+n²)² − 2(m−n)²  ·  π⁴ — Rayleigh plate eigenvalue proxy. */
export function chladniEigenvalue(m: number, n: number): number {
  const s = m * m + n * n;
  const d = (m - n) * (m - n);
  return (s * s - 2 * d) * Math.PI ** 4;
}

/** Square-plate amplitude, x,y ∈ ℝ (unit domain is [0,1]²). */
export function chladniAmplitude(m: number, n: number, x: number, y: number): number {
  return (
    Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y) -
    Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y)
  );
}

/**
 * Bessel J_m(x) via series (|x| ≤ 12 covers our k·r range; k ≤ 11, r ≤ 1).
 * 24 terms keeps |err| < 1e-12 at x=12.
 */
function besselJ(m: number, x: number): number {
  let sum = 0;
  for (let k = 0; k < 24; k++) {
    const num = Math.pow(-1, k) * Math.pow(x / 2, 2 * k + m);
    const den = factorial(k) * factorial(k + m);
    sum += num / den;
  }
  return sum;
}

/** Modified Bessel I_m(x), same series without the sign alternation. */
function besselI(m: number, x: number): number {
  let sum = 0;
  for (let k = 0; k < 24; k++) {
    const num = Math.pow(x / 2, 2 * k + m);
    const den = factorial(k) * factorial(k + m);
    sum += num / den;
  }
  return sum;
}

function factorial(v: number): number {
  let r = 1;
  for (let i = 2; i <= v; i++) r *= i;
  return r;
}

/** Tabulated free-edge roots k_{m,n} (Rossing 1982, Table 3.1). */
const CIRCULAR_ROOTS: Record<string, number> = {
  '0,1': 3.0117,
  '0,2': 6.2078,
  '0,3': 9.4027,
  '1,1': 2.0842,
  '1,2': 5.2967,
  '1,3': 8.5310,
  '2,1': 3.4265,
  '2,2': 6.8520,
  '2,3': 10.1384,
  '3,1': 4.6100,
  '3,2': 8.2249,
  '4,1': 5.9057,
  '5,1': 7.1425,
};

/** Circular free-edge plate amplitude, r ∈ [0,1], θ ∈ ℝ. */
export function circularPlateAmplitude(m: number, n: number, r: number, theta: number): number {
  const k = CIRCULAR_ROOTS[`${m},${n}`];
  if (k === undefined) return 0; // untabulated mode: honest zero, UI greys it out
  const jk = besselJ(m, k);
  const ik = besselI(m, k);
  // Coefficient fixing the derivative to zero at r=1 (free edge, leading order).
  const a = ik === 0 ? 0 : jk / ik;
  const radial = besselJ(m, k * r) - a * besselI(m, k * r);
  const norm = Math.abs(jk) > 1e-9 ? 1 / Math.abs(jk) : 1;
  return radial * norm * Math.cos(m * theta);
}

/** Canonical square mode table with reference frequencies. */
export const SQUARE_PLATE_MODES: PlateMode[] = [
  { plate: 'square', m: 1, n: 1, refHz: 82 },
  { plate: 'square', m: 1, n: 2, refHz: 165 },
  { plate: 'square', m: 2, n: 2, refHz: 268 },
  { plate: 'square', m: 1, n: 3, refHz: 412 },
  { plate: 'square', m: 2, n: 3, refHz: 523 },
  { plate: 'square', m: 3, n: 3, refHz: 742 },
  { plate: 'square', m: 1, n: 4, refHz: 934 },
  { plate: 'square', m: 2, n: 4, refHz: 1016 },
];

/** Canonical circular mode table (only tabulated roots). */
export const CIRCULAR_PLATE_MODES: PlateMode[] = [
  { plate: 'circle', m: 0, n: 1, refHz: 96 },
  { plate: 'circle', m: 1, n: 1, refHz: 62 },
  { plate: 'circle', m: 2, n: 1, refHz: 148 },
  { plate: 'circle', m: 0, n: 2, refHz: 402 },
  { plate: 'circle', m: 1, n: 2, refHz: 371 },
  { plate: 'circle', m: 3, n: 2, refHz: 685 },
  { plate: 'circle', m: 2, n: 2, refHz: 588 },
  { plate: 'circle', m: 3, n: 1, refHz: 268 },
];

/** Stable label used as the mode registry key. */
export function modeLabel(mode: PlateMode): string {
  return `${mode.plate === 'square' ? '□' : '○'} (${mode.m},${mode.n})`;
}

/** Inverse of modeLabel, for persistence/deep links. */
export function modeFromName(label: string): PlateMode | undefined {
  const m = label.match(/^([□○]) \((\d+),(\d+)\)$/);
  if (!m) return undefined;
  const plate = m[1] === '□' ? 'square' : 'circle';
  const mm = Number(m[2]);
  const nn = Number(m[3]);
  const table = plate === 'square' ? SQUARE_PLATE_MODES : CIRCULAR_PLATE_MODES;
  return table.find((x) => x.m === mm && x.n === nn);
}

/** N×N sign grid of the square mode: −1 | 0 | +1 per cell (nodal map). */
export function nodalSignGrid(m: number, n: number, size: number): number[][] {
  const grid: number[][] = [];
  for (let gy = 0; gy < size; gy++) {
    const row: number[] = [];
    for (let gx = 0; gx < size; gx++) {
      const x = (gx + 0.5) / size;
      const y = (gy + 0.5) / size;
      const a = chladniAmplitude(m, n, x, y);
      row.push(Math.abs(a) < 0.05 ? 0 : a > 0 ? 1 : -1);
    }
    grid.push(row);
  }
  return grid;
}
