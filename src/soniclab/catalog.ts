/**
 * Sonic Lab — page catalog: generator card metadata, groups, grades, and the
 * honesty labels surfaced in the UI. Kept separate from the page component so
 * tests can lint every user-facing string (banned-claim lint, honesty labels)
 * without rendering.
 *
 * `featureId` values are FEATURES (src/docs/features.ts) ids. They do not
 * exist yet — InfoPopover renders nothing until the doc entries are merged
 * (lead owns features.ts). Needed ids are listed in NEEDED_FEATURE_IDS.
 */

import type { GradeLetter } from '@/ui/theme';

export type SonicGroup =
  | 'illusions'
  | 'math-rhythms'
  | 'fractal-chaos'
  | 'custom-waves'
  | 'tuning'
  | 'astro';

export interface SonicCard {
  id: string;
  group: SonicGroup;
  title: string;
  grade: GradeLetter;
  /** One-line what-it-is (shown on the card). */
  blurb: string;
  /** Honesty caveat (shown as a warning chip when present). */
  caveat?: string;
  /** features.ts id for the ⓘ popover (pending lead merge). */
  featureId: string;
}

export const SONIC_GROUPS: ReadonlyArray<{ id: SonicGroup; title: string }> = [
  { id: 'illusions', title: 'Auditory Illusions' },
  { id: 'math-rhythms', title: 'Mathematical Rhythms' },
  { id: 'fractal-chaos', title: 'Fractal & Chaos' },
  { id: 'custom-waves', title: 'Custom Waveforms' },
  { id: 'tuning', title: 'Tuning Systems' },
  { id: 'astro', title: 'Astro-Tuned' },
];

export const SONIC_CARDS: readonly SonicCard[] = [
  {
    id: 'shepard',
    group: 'illusions',
    title: 'Shepard–Risset glissando',
    grade: 'A',
    blurb:
      'Octave-spaced sines under a fixed Gaussian (log-frequency) envelope; the spectrum is pitch-class circular, so pitch appears to rise forever.',
    featureId: 'soniclab-shepard',
  },
  {
    id: 'risset-rhythm',
    group: 'illusions',
    title: 'Risset rhythm',
    grade: 'A',
    blurb:
      'The temporal analog: two click layers at tempos in ratio r:1 crossfade while ramping one ratio-octave per metabar — an endless accelerando.',
    featureId: 'soniclab-risset-rhythm',
  },
  {
    id: 'barber-pole',
    group: 'illusions',
    title: 'Barber-pole AM',
    grade: 'B',
    blurb:
      'Amplitude-modulation layers in a 2:1 rate octave crossfade so the beat rate sounds constant while the texture endlessly descends.',
    caveat: 'Perceptual craft effect — the underlying math is exact, the illusion strength varies by listener.',
    featureId: 'soniclab-barber-pole',
  },
  {
    id: 'euclidean',
    group: 'math-rhythms',
    title: 'Euclidean rhythm gate',
    grade: 'A',
    blurb:
      'Bjorklund’s algorithm spreads k pulses over n steps as evenly as possible (E(3,8) = tresillo). Applied here as an AM gate on a tone.',
    featureId: 'soniclab-euclidean',
  },
  {
    id: 'phi-beatty',
    group: 'math-rhythms',
    title: 'Golden-ratio Beatty rhythm',
    grade: 'B',
    blurb:
      'Sturmian pulse sequence at slope 1/φ — the most-irrational spacing, maximally avoiding periodic coincidence.',
    caveat: 'Generative device. Claims that Bartók/Debussy composed with φ are contested (grade C).',
    featureId: 'soniclab-phi-beatty',
  },
  {
    id: 'prime-pulse',
    group: 'math-rhythms',
    title: 'Prime pulse train',
    grade: 'B',
    blurb: 'A click on every prime integer step; density thins as ~1/ln n over the window.',
    featureId: 'soniclab-prime-pulse',
  },
  {
    id: 'fibonacci-word',
    group: 'math-rhythms',
    title: 'Fibonacci word rhythm',
    grade: 'B',
    blurb: 'Self-similar rhythm from the word A→AB, B→A; the long:short ratio approaches φ.',
    caveat:
      'Honesty note: Fibonacci numbers fold-mapped onto pitches carry no Fibonacci information (only Pisano periodicity is real) — this card uses the word rhythm, not a pitch fold-map.',
    featureId: 'soniclab-fibonacci-word',
  },
  {
    id: 'fractal-noise',
    group: 'fractal-chaos',
    title: '1/f^α fractal noise',
    grade: 'A',
    blurb:
      'Spectrally shaped noise with power ∝ f^−α. Voss & Clarke measured ≈1/f fluctuation spectra in music; α sweeps white → pink → brown.',
    caveat: 'The observation is grade A; the “1/f sounds most musical” aesthetic claim is grade B.',
    featureId: 'soniclab-fractal-noise',
  },
  {
    id: 'logistic',
    group: 'fractal-chaos',
    title: 'Logistic-map chaos LFO',
    grade: 'A',
    blurb:
      'x′ = r·x(1−x) iterated at control rate, mapped to pitch or AM depth. Period-doubling cascade below r ≈ 3.5699, chaos above.',
    featureId: 'soniclab-logistic',
  },
  {
    id: 'custom-wave',
    group: 'custom-waves',
    title: 'Custom waveform designer',
    grade: 'A',
    blurb:
      'Additive harmonic stacks, two-operator FM (Chowning), Chebyshev waveshaping (exact harmonic weights), and CZ-style phase distortion.',
    featureId: 'soniclab-custom-wave',
  },
  {
    id: 'tuning-systems',
    group: 'tuning',
    title: 'Tuning systems explorer',
    grade: 'A',
    blurb:
      'Just intonation vs 12-TET cent deviations (syntonic comma 21.51¢), n-EDO equal divisions, and the Bohlen–Pierce 13-step tritave scale.',
    featureId: 'soniclab-tuning',
  },
  {
    id: 'astro',
    group: 'astro',
    title: 'Astro-tuned sonification',
    grade: 'D',
    blurb:
      'TRAPPIST-1 orbital-period ladder (anchored to planet h = C3) and cosmic-octave year/day/month tones.',
    caveat:
      'The arithmetic is verifiable astronomy (grade A); any claim that these frequencies carry special effects or planetary “energy” is grade D — no evidence.',
    featureId: 'soniclab-astro',
  },
];

/** features.ts entries the lead needs to add for the ⓘ popovers to light up. */
export const NEEDED_FEATURE_IDS = SONIC_CARDS.map((c) => c.featureId);

/** Mandatory D-grade meaning label shown in the astro panel (E2 §5.2). */
export const ASTRO_MEANING_LABEL =
  'Astronomically derived frequencies: the arithmetic is exact, but there is no evidence of any special effect on listeners.';

/** Banned overclaim phrases — mirror of the program-wide lint lists. */
export const BANNED_PHRASES = ['induces', 'synchronizes', 'attunes', 'cia-validated', 'digital drug'];
