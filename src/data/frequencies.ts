/**
 * Frequency library (W2): the 7 audited frequency sets, evidence-graded.
 * Every entry pins { hz | band, grade, origin, citation, note }. Grades:
 *   A = replicated human evidence for the narrow claim made
 *   B = suggestive human evidence / strong animal + plausible mechanism
 *   C = historical or cultural record; claims untested
 *   D = marketing construct, numerology, or audited-false provenance
 * Nothing here may be described as "proven to entrain" — see note fields.
 */

export type Grade = 'A' | 'B' | 'C' | 'D';

export interface FrequencyBand {
  minHz: number;
  maxHz: number;
}

export interface FrequencyEntry {
  id: string;
  name: string;
  hz?: number;
  band?: FrequencyBand;
  grade: Grade;
  /** Audited provenance — where the number actually came from. */
  origin: string;
  /** Best available literature anchor (or honest absence). */
  citation: string;
  /** What the evidence does and does not support. */
  note: string;
}

export const FREQUENCIES: FrequencyEntry[] = [
  // ------------------------------------------------------------- Schumann
  {
    id: 'schumann-1',
    name: 'Schumann resonance, mode 1',
    hz: 7.83,
    grade: 'C',
    origin:
      'Predicted by Winfried Otto Schumann (1952), first measured by Balser & Wagner (1960). Fundamental of the Earth-ionosphere cavity.',
    citation:
      'Balser & Wagner, Nature 188:638-641 (1960); Price, J. Atmos. Sol.-Terr. Phys. 159 (2017).',
    note:
      'Real geophysics, measured daily. No replicated evidence that listening to 7.83 Hz tones couples the brain to the cavity mode.',
  },
  {
    id: 'schumann-2',
    name: 'Schumann resonance, mode 2',
    hz: 14.3,
    grade: 'C',
    origin:
      'Second cavity mode. Varies ±0.5 Hz with ionospheric height; textbook value is a long-term average.',
    citation: 'Nickolaenko & Hayakawa, Resonances in the Earth-Ionosphere Cavity (2002).',
    note: 'Measured value drifts; apps shipping "exactly 14.1" are behind the literature.',
  },
  {
    id: 'schumann-3',
    name: 'Schumann resonance, mode 3',
    hz: 20.8,
    grade: 'C',
    origin: 'Third cavity mode.',
    citation: 'Nickolaenko & Hayakawa (2002).',
    note: 'Same geophysics-accurate / wellness-unproven status as mode 1.',
  },
  {
    id: 'schumann-4',
    name: 'Schumann resonance, mode 4',
    hz: 27.3,
    grade: 'C',
    origin: 'Fourth cavity mode.',
    citation: 'Nickolaenko & Hayakawa (2002).',
    note: 'Same status as mode 1.',
  },
  {
    id: 'schumann-5',
    name: 'Schumann resonance, mode 5',
    hz: 33.8,
    grade: 'C',
    origin: 'Fifth cavity mode, near the gamma-band edge used by vendors.',
    citation: 'Nickolaenko & Hayakawa (2002).',
    note: 'Same status as mode 1; gamma claims attached to it are vendor additions.',
  },

  // ------------------------------------------------------------ Solfeggio
  {
    id: 'solfeggio-174',
    name: 'Solfeggio 174 Hz',
    hz: 174,
    grade: 'D',
    origin:
      '1970s-90s numerology (Puleo/Horowitz): digit-sums on a 3x3 grid. No medieval source; the "Gregorian hymn" attribution is unverifiable.',
    citation: 'No peer-reviewed literature; provenance audit 2026.',
    note: 'Cultural artifact. Play it as a tone if you like it — not as medicine.',
  },
  {
    id: 'solfeggio-285',
    name: 'Solfeggio 285 Hz',
    hz: 285,
    grade: 'D',
    origin: 'Same Puleo/Horowitz numerological series.',
    citation: 'No peer-reviewed literature; provenance audit 2026.',
    note: 'Same status as the rest of the set.',
  },
  {
    id: 'solfeggio-396',
    name: 'Solfeggio 396 Hz (Ut)',
    hz: 396,
    grade: 'D',
    origin:
      'Loosely attached to the medieval ut-re-mi solmization syllables; the Hz values themselves are modern.',
    citation: 'No peer-reviewed literature; provenance audit 2026.',
    note: '"Liberates guilt" claims are folklore.',
  },
  {
    id: 'solfeggio-417',
    name: 'Solfeggio 417 Hz (Re)',
    hz: 417,
    grade: 'D',
    origin: 'Puleo/Horowitz series.',
    citation: 'No peer-reviewed literature; provenance audit 2026.',
    note: 'Same status.',
  },
  {
    id: 'solfeggio-528',
    name: 'Solfeggio 528 Hz (Mi, "love frequency")',
    hz: 528,
    grade: 'D',
    origin:
      'The most-marketed member: "DNA repair" claims trace to a 1999 Horowitz book, not to biology. One small rat study (cortisol) is endlessly overcited.',
    citation:
      'Akimoto et al., J. Addiction Res. Ther. 9(3) (2018) — n=10 rats, cortisol only, never replicated in humans.',
    note:
      'Relaxing music at any pitch lowers arousal; nothing pins the effect to 528 specifically. Grade D for the marketed claim, not for the sound.',
  },
  {
    id: 'solfeggio-639',
    name: 'Solfeggio 639 Hz (Fa)',
    hz: 639,
    grade: 'D',
    origin: 'Puleo/Horowitz series.',
    citation: 'No peer-reviewed literature; provenance audit 2026.',
    note: 'Same status.',
  },
  {
    id: 'solfeggio-741',
    name: 'Solfeggio 741 Hz (Sol)',
    hz: 741,
    grade: 'D',
    origin: 'Puleo/Horowitz series.',
    citation: 'No peer-reviewed literature; provenance audit 2026.',
    note: 'Same status.',
  },
  {
    id: 'solfeggio-852',
    name: 'Solfeggio 852 Hz (La)',
    hz: 852,
    grade: 'D',
    origin: 'Puleo/Horowitz series.',
    citation: 'No peer-reviewed literature; provenance audit 2026.',
    note: 'Same status.',
  },
  {
    id: 'solfeggio-963',
    name: 'Solfeggio 963 Hz',
    hz: 963,
    grade: 'D',
    origin: 'Puleo/Horowitz series ("God frequency" marketing).',
    citation: 'No peer-reviewed literature; provenance audit 2026.',
    note: 'Same status.',
  },

  // --------------------------------------------------------------- Chakra
  {
    id: 'chakra-root',
    name: 'Chakra set — root (194.18 Hz "Earth day")',
    hz: 194.18,
    grade: 'D',
    origin:
      'Hans Cousto "Cosmic Octave" (1978): octave-doubling of astronomical periods into audio range. Arithmetic is correct; meaning is asserted.',
    citation: 'Cousto, The Cosmic Octave (1988 English ed.); no peer-reviewed validation.',
    note: 'Split-grade in Sonic Lab: arithmetic A · meaning D. Here graded on meaning.',
  },
  {
    id: 'chakra-crown',
    name: 'Chakra set — crown (172.06 Hz "Platonic year")',
    hz: 172.06,
    grade: 'D',
    origin: 'Cousto Cosmic Octave, axial precession period octave-shifted.',
    citation: 'Cousto (1988); no peer-reviewed validation.',
    note: 'Same split-grade status.',
  },

  // ---------------------------------------------------------- Angel/etc.
  {
    id: 'angel-111',
    name: '"Angel number" 111 Hz',
    hz: 111,
    grade: 'D',
    origin: 'Numerology social-media trend (2020s); no historical anchor at all.',
    citation: 'No literature; provenance audit 2026.',
    note: 'Exhibit only.',
  },
  {
    id: 'py-phi',
    name: 'Golden-ratio interval (φ ≈ 1.618)',
    hz: 161.8,
    grade: 'D',
    origin: 'Aesthetic mathematics; the "most beautiful interval" claim is untested.',
    citation: 'Livio, The Golden Ratio (2002) — documents the myth, does not endorse it.',
    note: 'Interesting as a sonic-lab interval; claims are folklore.',
  },

  // ------------------------------------------------------ EEG band edges
  {
    id: 'band-delta',
    name: 'Delta band (0.5-4 Hz)',
    band: { minHz: 0.5, maxHz: 4 },
    grade: 'B',
    origin:
      'Standard EEG nomenclature (IFCN). Deep NREM slow-wave sleep is genuinely delta-dominant.',
    citation:
      'Besedovsky et al., Physiol. Rev. 97:1325-1380 (2017); Rasch & Born, Physiol. Rev. 93:681-766 (2013).',
    note:
      'Slow oscillations are real sleep physiology; audio-driven delta entrainment benefits in humans remain unproven.',
  },
  {
    id: 'band-theta',
    name: 'Theta band (4-8 Hz)',
    band: { minHz: 4, maxHz: 8 },
    grade: 'B',
    origin: 'Standard EEG nomenclature; drowsiness, meditation, memory encoding.',
    citation: 'Klimesch, Brain Res. Rev. 29:169-195 (1999).',
    note: 'Same physiology-real / entrainment-unproven split as delta.',
  },
  {
    id: 'band-alpha',
    name: 'Alpha band (8-13 Hz)',
    band: { minHz: 8, maxHz: 13 },
    grade: 'B',
    origin: 'Berger 1929: the first EEG rhythm ever described. Relaxed wakefulness.',
    citation: 'Berger, Arch. Psychiatr. Nervenkr. 87:527-570 (1929).',
    note: 'Alpha rises with eyes closed — free, no apparatus needed. Audio claim gap identical.',
  },
  {
    id: 'band-smr',
    name: 'SMR band (12-15 Hz)',
    band: { minHz: 12, maxHz: 15 },
    grade: 'B',
    origin:
      'Sensorimotor rhythm; the one entrainment-adjacent paradigm with replicated human biofeedback data (Sterman).',
    citation: 'Sterman, Clin. Neurophysiol. 111:2101-2107 (2000).',
    note:
      'Biofeedback evidence does not transfer automatically to passive audio stimulation — graded on the narrow claim only.',
  },
  {
    id: 'band-beta',
    name: 'Beta band (13-30 Hz)',
    band: { minHz: 13, maxHz: 30 },
    grade: 'B',
    origin: 'Standard nomenclature; active concentration, motor preparation.',
    citation: 'Engel & Fries, Curr. Opin. Neurobiol. 20:156-165 (2010).',
    note: 'Physiology real; passive-audio cognitive benefits unproven.',
  },
  {
    id: 'band-gamma',
    name: 'Gamma band (30-100 Hz)',
    band: { minHz: 30, maxHz: 100 },
    grade: 'B',
    origin:
      'Feature binding and attention research; 40 Hz ASSR is a real, well-replicated brainstem/cortical response.',
    citation:
      'Galambos et al., PNAS 78:2643-2647 (1981); Herrmann, Int. J. Psychophysiol. 39:41-48 (2001).',
    note:
      'ASSR (steady-state response) ≠ the therapeutic "gamma entrainment" claim; the response is measurable, the benefit is not established.',
  },

  // -------------------------------------------------------------- 432 vs 440
  {
    id: 'tuning-432',
    name: 'A=432 Hz tuning (vs 440 Hz)',
    hz: 432,
    grade: 'B',
    origin:
      '440 Hz was a pragmatic 1939 compromise (ISO 16, 1955); Verdi advocated ~432 in 1884 on vocal-strain grounds. "Cosmic/ancient tuning" and Nazi-conspiracy versions are unsupported. 432 Hz is NOT an exact harmonic of 7.83 Hz (7.83 x 55 = 430.65).',
    citation:
      'Calamassi & Pomponi, Explore 15(4):283-290 (2019), double-blind crossover n=33 (+2020 corrigendum); Aravena 2020 dental-anxiety RCT n=42.',
    note:
      'Grade B- (small pilots): ~5 BPM heart-rate advantage for 432 in one double-blind pilot; authors call for larger trials. Preliminary, not confirmed.',
  },

  // ------------------------------------------------------------------ 40 Hz
  {
    id: 'gamma-40',
    name: '40 Hz gamma stimulation (GENUS-style)',
    hz: 40,
    grade: 'B',
    origin:
      'MIT Picower lab: Iaccarino et al., Nature 2016 (mouse); Martorell et al., Cell 2019 (mouse multi-modal); human safety pilots Chan 2022, Agger 2023.',
    citation:
      'Iaccarino et al., Nature 540:230-235 (2016); Martorell et al., Cell 177:256-271 (2019); Hajós et al. 2024 (Cognito OVERTURE).',
    note:
      'EXPERIMENTAL. Robust mouse data; human efficacy UNPROVEN — Cognito Therapeutics pivotal OVERTURE trial MISSED its primary endpoint (Hajós 2024). Failed replications exist (Soula 2023; Yang & Lai 2023). Any Alzheimer\'s/neuroprotection claim is regulated medical-device territory — do not make disease claims.',
  },

  // ------------------------------------------------------------- Lambda band
  {
    id: 'band-lambda',
    name: 'Lambda band (100-200 Hz)',
    band: { minHz: 100, maxHz: 200 },
    grade: 'D',
    origin:
      'Vendor construct in consumer neurotech marketing; not a recognized clinical EEG band in standard nomenclature.',
    citation: 'No peer-reviewed literature establishing "lambda" as a physiological EEG band (audit 2026).',
    note: 'Marketing construct; do not present as established neuroscience.',
  },

  // ------------------------------------------------------------- Epsilon band
  {
    id: 'band-epsilon',
    name: 'Epsilon band (<0.5 Hz)',
    band: { minHz: 0, maxHz: 0.5 },
    grade: 'D',
    origin:
      'Sub-delta marketing construct; infra-slow oscillations exist in research EEG but no "epsilon band" entrainment literature exists.',
    citation: 'No peer-reviewed literature supporting epsilon-band entrainment claims (audit 2026).',
    note: 'Below the range addressable by binaural beats in practice; claims are folklore.',
  },
];

/** Lookup helper. */
export function getFrequencyById(id: string): FrequencyEntry | undefined {
  return FREQUENCIES.find((f) => f.id === id);
}
