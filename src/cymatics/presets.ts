/**
 * Named cymatic-plate presets for the Cymatic Studio.
 *
 * Each preset drives one of the declared VIRTUAL_PLATES (chladni.ts) either at
 * an explicit eigenmode or — when `frequencyDriven` is set — at an audible
 * frequency whose nearest modes are resolved at runtime from the plate's
 * eigenfrequency ladder (frequencyToModes / drivenSquareModes).
 *
 * HONESTY CONTRACT (mirrors chladni.ts header):
 *  - label 'physics': the pattern is the idealized virtual plate's modal
 *    response to the drive frequency — real plate physics, simulated geometry.
 *  - label 'art': the drive frequency comes from a cultural set (Solfeggio,
 *    brainwave octave folds); the PATTERN is still computed plate physics, but
 *    the choice of frequency carries no physical or therapeutic meaning.
 *  - Frequency → pattern mapping is virtual-plate-dependent: change the plate
 *    and the same drive frequency excites different modes. No preset here
 *    claims a given Hz "produces" a specific physical pattern on a real plate.
 */

import {
  VIRTUAL_PLATES,
  circularModeHz,
  squareModeHz,
  type PlateSign,
} from './chladni';

/** Explicit mode selection on the chosen plate. */
export type CymaticModeSelection =
  | { kind: 'square'; n: number; m: number; sign: PlateSign }
  | { kind: 'circular'; m: number; s: number };

export interface CymaticPreset {
  id: string;
  name: string;
  /** Audible drive frequency for the virtual plate, Hz. */
  driveHz: number;
  /** Explicit eigenmode selection; omit when frequencyDriven is true. */
  modes?: CymaticModeSelection;
  /** True → modes are resolved at runtime from driveHz on the plate ladder. */
  frequencyDriven: boolean;
  /** Must reference an entry of VIRTUAL_PLATES. */
  plateId: string;
  /** 'physics' = eigenmode-driven simulation; 'art' = cultural/aesthetic mapping. */
  label: 'physics' | 'art';
  /** Honest framing note shown with the preset. */
  note: string;
}

const FOLD_NOTE =
  'Octave-folded into the audible range (x2^k); the fold is a representational device and the resulting pattern depends on the chosen virtual plate, not on the source frequency alone.';

export const CYMATIC_PRESETS: readonly CymaticPreset[] = [
  // --------------------------- Physics: explicit eigenmodes of virtual plates
  {
    id: 'plate-steel-1-1',
    name: 'Steel plate — fundamental (1,1)',
    driveHz: squareModeHz(1, 1, 180, 'plate'),
    modes: { kind: 'square', n: 1, m: 1, sign: 1 },
    frequencyDriven: false,
    plateId: 'steel-square-30',
    label: 'physics',
    note: 'First simply-supported mode of the 30 cm steel plate (f0 x (1^2+1^2)). Thin-plate ladder: f ∝ n²+m².',
  },
  {
    id: 'plate-steel-1-2',
    name: 'Steel plate — mode (1,2)',
    driveHz: squareModeHz(1, 2, 180, 'plate'),
    modes: { kind: 'square', n: 1, m: 2, sign: 1 },
    frequencyDriven: false,
    plateId: 'steel-square-30',
    label: 'physics',
    note: 'Degenerate pair (1,2)/(2,1); a real plate mixes both signs — flip sign to see the mirror family.',
  },
  {
    id: 'plate-steel-2-3',
    name: 'Steel plate — mode (2,3)',
    driveHz: squareModeHz(2, 3, 180, 'plate'),
    modes: { kind: 'square', n: 2, m: 3, sign: 1 },
    frequencyDriven: false,
    plateId: 'steel-square-30',
    label: 'physics',
    note: 'Higher-order figure (eigenvalue 13): pattern complexity grows with mode order — textbook Chladni behavior.',
  },
  {
    id: 'plate-disc-free-0-1',
    name: 'Steel disc — free-rim breathing mode (0,1)',
    driveHz: circularModeHz(0, 1, 110, 'free'),
    modes: { kind: 'circular', m: 0, s: 1 },
    frequencyDriven: false,
    plateId: 'steel-disc-17',
    label: 'physics',
    note: "Axisymmetric mode of the free-rim teaching disc; rim sits on a zero of J'0 (free-boundary approximation).",
  },
  {
    id: 'plate-disc-free-2-1',
    name: 'Steel disc — two-diameter mode (2,1)',
    driveHz: circularModeHz(2, 1, 110, 'free'),
    modes: { kind: 'circular', m: 2, s: 1 },
    frequencyDriven: false,
    plateId: 'steel-disc-17',
    label: 'physics',
    note: 'Two nodal diameters, rim free. On this disc (2,1) lies BELOW the (0,1) reference — real free plates behave this way.',
  },
  {
    id: 'plate-membrane-1-1',
    name: 'Ideal membrane — fundamental (1,1)',
    driveHz: squareModeHz(1, 1, 120, 'membrane'),
    modes: { kind: 'square', n: 1, m: 1, sign: 1 },
    frequencyDriven: false,
    plateId: 'membrane-square',
    label: 'physics',
    note: 'Membrane limit (f ∝ √(n²+m²)) for direct comparison against the plate law on the same mode numbers.',
  },

  // -------------------------------- Physics: frequency-driven (ladder lookup)
  {
    id: 'drive-440-concert',
    name: 'Concert A — 440 Hz',
    driveHz: 440,
    frequencyDriven: true,
    plateId: 'membrane-square',
    label: 'physics',
    note: 'Standard ISO 16 concert pitch driving the ideal membrane; nearest modes are resolved from the ladder at runtime.',
  },
  {
    id: 'drive-432-verdi',
    name: 'Verdi A — 432 Hz',
    driveHz: 432,
    frequencyDriven: true,
    plateId: 'plywood-square-40',
    label: 'physics',
    note: 'Comparison partner of the 440 Hz preset. The plate response is computed physics; the 432-vs-440 music debate is a separate, pilot-grade (B-) question — no pattern-level claim is made.',
  },
  {
    id: 'schumann-fundamental-fold',
    name: 'Schumann fundamental 7.83 Hz (octave-folded)',
    driveHz: 250.56, // 7.83 x 2^5
    frequencyDriven: true,
    plateId: 'membrane-square',
    label: 'physics',
    note: `7.83 Hz is inaudible and sub-modal for any tabletop plate, so it is folded x32 to 250.56 Hz. ${FOLD_NOTE} The resonance itself is Grade A geophysics (Balser & Wagner 1960; Hylaty 2016).`,
  },
  {
    id: 'schumann-mode-2-fold',
    name: 'Schumann mode 2 — 14.1 Hz (octave-folded)',
    driveHz: 225.6, // 14.1 x 2^4
    frequencyDriven: true,
    plateId: 'membrane-square',
    label: 'physics',
    note: `Measured second cavity mode (14.1 Hz, Hylaty 2016 — not the drifted 14.3 Hz of wellness sites), folded x16. ${FOLD_NOTE}`,
  },
  {
    id: 'schumann-mode-3-fold',
    name: 'Schumann mode 3 — 20.3 Hz (octave-folded)',
    driveHz: 324.8, // 20.3 x 2^4
    frequencyDriven: true,
    plateId: 'glass-square-25',
    label: 'physics',
    note: `Measured third cavity mode (20.3 Hz), folded x16 onto the glass plate ladder. ${FOLD_NOTE}`,
  },
  {
    id: 'schumann-mode-4-fold',
    name: 'Schumann mode 4 — 26.4 Hz (octave-folded)',
    driveHz: 422.4, // 26.4 x 2^4
    frequencyDriven: true,
    plateId: 'steel-disc-17',
    label: 'physics',
    note: `Measured fourth cavity mode (26.4 Hz), folded x16 onto the free-rim steel disc. ${FOLD_NOTE}`,
  },
  {
    id: 'schumann-mode-5-fold',
    name: 'Schumann mode 5 — 32 Hz (octave-folded)',
    driveHz: 512, // 32 x 2^4
    frequencyDriven: true,
    plateId: 'membrane-square',
    label: 'physics',
    note: `Measured fifth cavity mode (~32 Hz), folded x16. ${FOLD_NOTE}`,
  },
  {
    id: 'gamma-40-fold',
    name: '40 Hz gamma (octave-folded to 320 Hz)',
    driveHz: 320, // 40 x 2^3
    frequencyDriven: true,
    plateId: 'glass-square-25',
    label: 'physics',
    note: `40 Hz folded x3 octaves lands exactly on the glass plate's 320 Hz fundamental. ${FOLD_NOTE} Honesty: 40 Hz human-benefit claims are contested (Hajós 2024 OVERTURE miss; Soula 2023) and nothing about the pattern implies a neural effect.`,
  },
  {
    id: 'alpha-10-fold',
    name: 'Alpha 10 Hz (octave-folded to 160 Hz)',
    driveHz: 160, // 10 x 2^4
    frequencyDriven: true,
    plateId: 'steel-square-30',
    label: 'physics',
    note: `10 Hz folded x4 octaves onto the steel plate. ${FOLD_NOTE} EEG alpha is a brain rhythm; the plate knows nothing about it — visualization only.`,
  },

  // ----------------- Art: Solfeggio set (cultural, not physical — see notes)
  ...(
    [
      [174, 'steel-square-30'],
      [285, 'glass-square-25'],
      [396, 'plywood-square-40'],
      [417, 'plywood-square-40'],
      [528, 'membrane-square'],
      [639, 'glass-square-25'],
      [741, 'steel-square-30'],
      [852, 'steel-square-30'],
      [963, 'steel-square-30'],
    ] as const
  ).map(
    ([hz, plateId]): CymaticPreset => ({
      id: `solfeggio-${hz}`,
      name: `Solfeggio ${hz} Hz — cultural, not physical`,
      driveHz: hz,
      frequencyDriven: true,
      plateId,
      label: 'art',
      note: 'Cultural, not physical: the Solfeggio Hz set is a 1970s-1999 numerology construct (Puleo/Horowitz) with no controlled physiological evidence. The figure shown is this virtual plate\'s computed modal response to that drive frequency — a pattern, not a healing geometry.',
    })
  ),
];

export function getCymaticPresetById(id: string): CymaticPreset | undefined {
  return CYMATIC_PRESETS.find((p) => p.id === id);
}

/** Every referenced plate id exists (development-time invariant, also tested). */
export const CYMATIC_PLATE_IDS: readonly string[] = VIRTUAL_PLATES.map((p) => p.id);
