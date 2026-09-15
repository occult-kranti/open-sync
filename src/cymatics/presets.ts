/**
 * Cymatic plate presets (C3.4). Each preset pins a documented Chladni mode +
 * physically-plausible drive parameters. `physicalNote` is mandatory honesty:
 * presets ship with the caveat that a real plate's figure depends on material,
 * thickness, boundary mounting, and bow/tap excitation — the simulator shows
 * idealized free-edge modes.
 */

import type { PlateMode } from './chladni';
import { SQUARE_PLATE_MODES, CIRCULAR_PLATE_MODES } from './chladni';

export interface CymaticParams {
  driveHz: number;
  driveGain: number; // 0..1
  damping: number; // 0..1
  grainSize: number; // px
}

export interface CymaticPreset {
  id: string;
  name: string;
  mode: PlateMode;
  params: CymaticParams;
  /** Mandatory provenance/limitation note surfaced in the UI. */
  physicalNote: string;
}

const sq = (m: number, n: number): PlateMode =>
  SQUARE_PLATE_MODES.find((x) => x.m === m && x.n === n)!;
const circ = (m: number, n: number): PlateMode =>
  CIRCULAR_PLATE_MODES.find((x) => x.m === m && x.n === n)!;

export const CYMATIC_PRESETS: CymaticPreset[] = [
  {
    id: 'square-12-cross',
    name: 'Square plate (1,2) — first cross',
    mode: sq(1, 2),
    params: { driveHz: sq(1, 2).refHz, driveGain: 0.6, damping: 0.3, grainSize: 2 },
    physicalNote:
      'Idealized free-edge square plate; real plates clamp or support edges, shifting figures.',
  },
  {
    id: 'square-13-diagonal',
    name: 'Square plate (1,3) — diagonals',
    mode: sq(1, 3),
    params: { driveHz: sq(1, 3).refHz, driveGain: 0.6, damping: 0.35, grainSize: 2 },
    physicalNote:
      'Degenerate pairs mix under slight asymmetry; the diagonal figure is one stable mixture.',
  },
  {
    id: 'square-22-quad',
    name: 'Square plate (2,2) — four quadrants',
    mode: sq(2, 2),
    params: { driveHz: sq(2, 2).refHz, driveGain: 0.55, damping: 0.3, grainSize: 2 },
    physicalNote:
      'The classic four-square figure documented by Waller (1940) on brass plates.',
  },
  {
    id: 'square-23-lattice',
    name: 'Square plate (2,3) — lattice',
    mode: sq(2, 3),
    params: { driveHz: sq(2, 3).refHz, driveGain: 0.55, damping: 0.4, grainSize: 2 },
    physicalNote:
      'Higher modes need more drive; grain migration saturates — see damping trade-off.',
  },
  {
    id: 'circle-01-first-ring',
    name: 'Circular plate (0,1) — first ring',
    mode: circ(0, 1),
    params: { driveHz: circ(0, 1).refHz, driveGain: 0.6, damping: 0.3, grainSize: 2 },
    physicalNote:
      'Axisymmetric breathing ring; center-driven like Chladni\'s original violin-bow plates.',
  },
  {
    id: 'circle-11-dipole',
    name: 'Circular plate (1,1) — dipole',
    mode: circ(1, 1),
    params: { driveHz: circ(1, 1).refHz, driveGain: 0.6, damping: 0.3, grainSize: 2 },
    physicalNote:
      'Single diameter nodal line; orientation drifts freely on a real free plate.',
  },
  {
    id: 'circle-21-quatrefoil',
    name: 'Circular plate (2,1) — quatrefoil',
    mode: circ(2, 1),
    params: { driveHz: circ(2, 1).refHz, driveGain: 0.55, damping: 0.35, grainSize: 2 },
    physicalNote:
      'Four-lobed figure; the m=2 angular family of Bessel-mode Chladni patterns.',
  },
  {
    id: 'circle-32-star',
    name: 'Circular plate (3,2) — star',
    mode: circ(3, 2),
    params: { driveHz: circ(3, 2).refHz, driveGain: 0.5, damping: 0.4, grainSize: 2 },
    physicalNote:
      'Compound figure: three diameters × two rings. Sensitive to drive purity.',
  },
];
