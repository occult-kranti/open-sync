/**
 * Evidence-graded frequency database.
 *
 * Grades:
 *   A — solid physics / multiple peer-reviewed replications
 *   B — some human evidence (small pilots / meta-analytic support)
 *   C — plausible mechanism, weak or indirect evidence
 *   D — folklore / numerology, no physiological evidence
 *
 * Every entry carries its documented origin and a citation. Honest labeling is
 * the point: Solfeggio/chakra/angel/Fibonacci sets are modern numerology
 * constructs; only the Schumann physics and a few pilot-backed items rank above D.
 */

export type Grade = 'A' | 'B' | 'C' | 'D';

export interface FrequencyBand {
  minHz: number;
  maxHz: number;
}

export interface FrequencyEntry {
  id: string;
  name: string;
  /** Single tone, Hz. Exactly one of hz/band is set. */
  hz?: number;
  /** Frequency range, Hz (for bands). */
  band?: FrequencyBand;
  grade: Grade;
  /** Documented historical/cultural origin of the claim. */
  origin: string;
  /** Primary or best-available citation. */
  citation: string;
  note: string;
  /**
   * Optional second grade when the arithmetic and the therapy claim split
   * (e.g. planetary tones: A for the math, D for healing claims).
   */
  secondaryGrade?: Grade;
  secondaryScope?: string;
}

const SOLFEGGIO_ORIGIN =
  'Modern construct: digit-reduction numerology of Book of Numbers verses by naturopath Joseph Puleo (mid-1970s), expanded/popularized by Leonard Horowitz, "Healing Codes for the Biological Apocalypse" (1999). Falsely backdated to Guido d\'Arezzo (~11th c.), whose solmization syllables carried no Hz values.';

const solfeggio = (hz: number, name: string, note: string): FrequencyEntry => ({
  id: `solfeggio-${hz}`,
  name,
  hz,
  grade: 'D',
  origin: SOLFEGGIO_ORIGIN,
  citation:
    'Evidence audit: musickanheal.com/528-hz-frequency (2026); no musicological documentation of Hz values before 1974.',
  note,
});

export const FREQUENCIES: readonly FrequencyEntry[] = [
  // ---------------------------------------------------------------- Solfeggio
  solfeggio(174, 'Solfeggio 174 Hz', 'Numerology set member; no controlled physiological evidence.'),
  solfeggio(285, 'Solfeggio 285 Hz', 'Numerology set member; added by Horowitz (1999).'),
  solfeggio(396, 'Solfeggio 396 Hz ("UT")', 'Numerology set member; "liberating guilt" claim is folklore.'),
  solfeggio(417, 'Solfeggio 417 Hz ("RE")', 'Numerology set member; "undoing situations" claim is folklore.'),
  {
    ...solfeggio(
      528,
      'Solfeggio 528 Hz ("MI", "DNA repair")',
      'The "DNA repair" claim rests on Babayi & Riazi 2017, an in-vitro astrocyte study that measured NO DNA endpoint (pay-to-publish journal, unreplicated). A n=9 human pilot (Akimoto 2018) found acute cortisol decrease vs 440 Hz — Grade C signal only.',
    ),
    citation:
      'Babayi & Riazi, J Addict Res Ther 8:335 (2017); Akimoto et al., Health 10 (2018); audit: trytomatoes.com/blog/528-hz',
  },
  solfeggio(639, 'Solfeggio 639 Hz ("FA")', 'Numerology set member; "connection" claim is folklore.'),
  solfeggio(741, 'Solfeggio 741 Hz ("SOL")', 'Numerology set member; "intuition" claim is folklore.'),
  solfeggio(852, 'Solfeggio 852 Hz ("LA")', 'Numerology set member; "third eye" mapping is a 1990s numerological graft.'),
  solfeggio(963, 'Solfeggio 963 Hz', 'Numerology set member; added by Horowitz (1999); "crown" claim is folklore.'),

  // ------------------------------------------------------------------ Schumann
  {
    id: 'schumann-fundamental',
    name: 'Schumann resonance — fundamental',
    hz: 7.83,
    grade: 'A',
    origin:
      'Predicted by W.O. Schumann (1952, Z. Naturforsch. A 7:149-154); first measured by Balser & Wagner, Nature 188:638-641 (1960); driven by global lightning in the Earth-ionosphere cavity.',
    citation: 'Balser & Wagner, Nature 188, 638-641 (1960); continuous monitoring (Tomsk SOS, Hylaty).',
    note:
      'Grade A for the GEOPHYSICS. Measured 7.8-7.9 Hz, drifting with season/time of day; "Schumann is spiking" claims are false. 7.83 Hz is inaudible — any audio product SIMULATES it via binaural beat or AM envelope, not the EM field. Biological-coupling claims (Persinger group, Wever bunker retellings) are Grade C: correlational, unreplicated.',
  },
  {
    id: 'schumann-mode-2',
    name: 'Schumann mode 2 (measured ~14.1 Hz)',
    hz: 14.1,
    grade: 'A',
    origin: 'Earth-ionosphere cavity resonance; Balser & Wagner 1960; Hylaty ELF station power spectra.',
    citation: 'Hylaty station report (Pol. J. Environ. Stud., 2016): modes at 7.9/14.2/20.3/26.4/32.3 Hz.',
    note: 'Physics grade A. NOTE: the original site lists 14.3 Hz — systematically HIGH vs measurements; value here is the measured mode.',
  },
  {
    id: 'schumann-mode-3',
    name: 'Schumann mode 3 (measured ~20.3 Hz)',
    hz: 20.3,
    grade: 'A',
    origin: 'Earth-ionosphere cavity resonance; Balser & Wagner 1960; Hylaty ELF station power spectra.',
    citation: 'Hylaty station report (Pol. J. Environ. Stud., 2016): 20.3 Hz; Balser & Wagner 1960: 19.6 Hz.',
    note: 'Physics grade A. Original site lists 20.8 Hz — HIGH vs measured 19.6-20.3 Hz.',
  },
  {
    id: 'schumann-mode-4',
    name: 'Schumann mode 4 (measured ~26.4 Hz)',
    hz: 26.4,
    grade: 'A',
    origin: 'Earth-ionosphere cavity resonance; Balser & Wagner 1960; Hylaty ELF station power spectra.',
    citation: 'Hylaty station report (Pol. J. Environ. Stud., 2016): 26.4 Hz; Balser & Wagner 1960: 25.9 Hz.',
    note: 'Physics grade A. Original site lists 27.3 Hz — HIGH vs measured 25.9-26.4 Hz.',
  },
  {
    id: 'schumann-mode-5',
    name: 'Schumann mode 5 (measured ~32 Hz)',
    hz: 32,
    grade: 'A',
    origin: 'Earth-ionosphere cavity resonance; Balser & Wagner 1960; Hylaty ELF station power spectra.',
    citation: 'Hylaty station report (2016): 32.3 Hz; Balser & Wagner 1960: 32 Hz.',
    note: 'Physics grade A. Original site lists 33.8 Hz — HIGH vs measured ~32 Hz.',
  },

  // -------------------------------------------------------------------- Chakra
  ...(
    [
      ['root', 396],
      ['sacral', 417],
      ['solar-plexus', 528],
      ['heart', 639],
      ['throat', 741],
      ['third-eye', 852],
      ['crown', 963],
    ] as const
  ).map(([chakra, hz]): FrequencyEntry => ({
    id: `chakra-${chakra}`,
    name: `Chakra — ${chakra} (${hz} Hz)`,
    hz,
    grade: 'D',
    origin:
      'Chakras are a genuine ~1st-millennium Tantric contemplative system, but no traditional text assigns frequencies; the Hz mapping is 1990s-2000s Puleo/Horowitz numerology grafted onto chakra doctrine.',
    citation:
      'soundr.xyz chakra-frequency guide (2024): "the specific healing claims for these frequencies lack peer-reviewed scientific support."',
    note: 'Meditation/cultural soundscape only; no physiological evidence for the assignment.',
  })),

  // ------------------------------------------------------- Planetary (Cousto)
  {
    id: 'planetary-om',
    name: 'OM — Earth year octave tone',
    hz: 136.1,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin:
      'Hans Cousto, "Die Kosmische Oktave" (1978/1984): orbital period 365.256 d -> 3.1688e-8 Hz, octave-doubled x2^32 = 136.10 Hz (C#). Lineage: Pythagoras -> Kepler, Harmonices Mundi (1619) -> Kayser -> Cousto.',
    citation: 'Cousto, The Cosmic Octave (LifeRhythm); planetware.de/octave (f = (1/T) x 2^n).',
    note:
      'Grade A for the ARITHMETIC (exactly reproducible); Grade D for any healing claim — an octave of an orbital period is a representational device; planets do not emit sound in space.',
  },
  {
    id: 'planetary-earth-day',
    name: 'Earth day octave tone',
    hz: 194.18,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin: 'Cousto Cosmic Octave: mean solar day 86400 s -> 1/86400 Hz octave-doubled x2^24 = 194.18 Hz (using the sidereal day 86164 s would give ~194.71 Hz; Cousto publishes 194.18).',
    citation: 'Cousto, The Cosmic Octave; planetware.de/octave.',
    note: 'Arithmetic A; therapy D (no controlled studies).',
  },
  {
    id: 'planetary-mercury',
    name: 'Mercury octave tone',
    hz: 141.27,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin: 'Cousto Cosmic Octave: Mercury orbital period 87.97 d octave-doubled = 141.27 Hz.',
    citation: 'Cousto tuning-fork tables (jini-site The_CoOc_Tuning.pdf).',
    note: 'Arithmetic A; therapy D.',
  },
  {
    id: 'planetary-venus',
    name: 'Venus octave tone',
    hz: 221.23,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin: 'Cousto Cosmic Octave: Venus orbital period octave-doubled = 221.23 Hz.',
    citation: 'Cousto tuning-fork tables.',
    note: 'Arithmetic A; therapy D.',
  },
  {
    id: 'planetary-mars',
    name: 'Mars octave tone',
    hz: 144.72,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin: 'Cousto Cosmic Octave: Mars orbital period octave-doubled = 144.72 Hz.',
    citation: 'Cousto tuning-fork tables.',
    note: 'Arithmetic A; therapy D.',
  },
  {
    id: 'planetary-jupiter',
    name: 'Jupiter octave tone',
    hz: 183.58,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin: 'Cousto Cosmic Octave: Jupiter orbital period octave-doubled = 183.58 Hz.',
    citation: 'Cousto tuning-fork tables.',
    note: 'Arithmetic A; therapy D.',
  },
  {
    id: 'planetary-saturn',
    name: 'Saturn octave tone',
    hz: 147.85,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin: 'Cousto Cosmic Octave: Saturn orbital period octave-doubled = 147.85 Hz.',
    citation: 'Cousto tuning-fork tables.',
    note: 'Arithmetic A; therapy D.',
  },
  {
    id: 'planetary-sun',
    name: 'Sun octave tone',
    hz: 126.22,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin: 'Cousto Cosmic Octave: Sun tone = 126.22 Hz.',
    citation: 'Cousto tuning-fork tables.',
    note: 'Arithmetic A; therapy D.',
  },
  {
    id: 'planetary-moon-synodic',
    name: 'Synodic Moon octave tone',
    hz: 210.42,
    grade: 'A',
    secondaryGrade: 'D',
    secondaryScope: 'therapeutic claims',
    origin: 'Cousto Cosmic Octave: synodic month 29.53 d octave-doubled = 210.42 Hz.',
    citation: 'Cousto tuning-fork tables.',
    note: 'Arithmetic A; therapy D.',
  },

  // ----------------------------------------------------------------- Fibonacci
  {
    id: 'fibonacci-phi-set',
    name: 'Fibonacci / golden-ratio tones',
    hz: 256,
    grade: 'D',
    origin:
      'Fibonacci sequence (Leonardo of Pisa, Liber Abaci 1202) and phi = 1.618... are real mathematics appearing in phyllotaxis; "Fibonacci tuning forks" are a recent wellness construct.',
    citation: 'astrionacademy.com Fibonacci tuning-fork page (beliefs only, no trials).',
    note:
      'Real math, zero controlled therapeutic evidence; the leap from "ratio appears in shells" to "tone pairs heal" has no proposed mechanism.',
  },

  // ------------------------------------------------------------ Angel numbers
  {
    id: 'angel-111',
    name: 'Angel number 111 Hz',
    hz: 111,
    grade: 'D',
    origin:
      'Term "angel numbers" coined ~2005 by New Age author Doreen Virtue via meditation/automatic writing; Virtue has since recanted. The Hz conversion is an even more recent content-farm invention.',
    citation: 'servantsofgrace.org interview with Doreen Virtue (origin of the term).',
    note: 'Pure folklore; no historical or scientific basis.',
  },
  {
    id: 'angel-222',
    name: 'Angel number 222 Hz',
    hz: 222,
    grade: 'D',
    origin: 'Doreen Virtue "angel numbers" (~2005); Hz conversion is a recent content-farm invention.',
    citation: 'servantsofgrace.org interview with Doreen Virtue.',
    note: 'Pure folklore.',
  },
  {
    id: 'angel-444',
    name: 'Angel number 444 Hz',
    hz: 444,
    grade: 'D',
    origin: 'Doreen Virtue "angel numbers" (~2005); Hz conversion is a recent content-farm invention.',
    citation: 'servantsofgrace.org interview with Doreen Virtue.',
    note: 'Pure folklore.',
  },

  // ---------------------------------------------------------- Brainwave bands
  {
    id: 'band-delta',
    name: 'Delta band (deep sleep)',
    band: { minHz: 0.5, maxHz: 4 },
    grade: 'B',
    origin: 'Standard EEG band nomenclature (clinical neurophysiology).',
    citation: 'Ngo et al., Neuron 2013 (closed-loop delta-phase acoustic stimulation enhances slow oscillations).',
    note:
      'Bands are real EEG categories (grade A as taxonomy); grade B for ENTRAINMENT claims — Ingendoh 2023: only 5 of 14 EEG studies support the entrainment hypothesis.',
  },
  {
    id: 'band-theta',
    name: 'Theta band (drowsiness/meditation)',
    band: { minHz: 4, maxHz: 8 },
    grade: 'B',
    origin: 'Standard EEG band nomenclature.',
    citation: 'Garcia-Argibay et al., Psychol Res 2019 (pooled g = 0.45); Ingendoh 2023 (mechanism unproven).',
    note: 'Behavioral effects modest and heterogeneous; EEG entrainment not consistently supported.',
  },
  {
    id: 'band-alpha',
    name: 'Alpha band (relaxed wakefulness)',
    band: { minHz: 8, maxHz: 13 },
    grade: 'B',
    origin: 'Standard EEG band nomenclature (Berger 1929).',
    citation: 'Garcia-Argibay 2019; Padmanabhan 2005 (peri-operative anxiety RCT).',
    note: 'Anxiety-relief evidence is the strongest; entrainment mechanism unproven.',
  },
  {
    id: 'band-smr',
    name: 'SMR band (sensorimotor rhythm)',
    band: { minHz: 12, maxHz: 15 },
    grade: 'B',
    origin: 'Neurofeedback literature (Sterman).',
    citation: 'JAMA Psychiatry 2024 meta-analysis: neurofeedback effects SMD 0.04 (near-null).',
    note: 'SMR neurofeedback claims weakened by 2024 meta-analysis; audio-only entrainment evidence weaker still.',
  },
  {
    id: 'band-beta',
    name: 'Beta band (alert focus)',
    band: { minHz: 13, maxHz: 30 },
    grade: 'B',
    origin: 'Standard EEG band nomenclature.',
    citation: 'Basu & Banerjee 2023 (g = 0.40 for memory/attention; frequency-specific claims inconsistent).',
    note: 'Beta="focus" mapping inconsistent at individual-study level; Klichowski 2023 (n=1000) found 15 Hz beats WORSENED fluid-intelligence scores.',
  },
  {
    id: 'band-gamma',
    name: 'Gamma band (binding/cognition)',
    band: { minHz: 30, maxHz: 100 },
    grade: 'B',
    origin: 'Gray & Singer 1989 (stimulus-specific gamma oscillations, cat visual cortex, PNAS).',
    citation: 'Gray & Singer, PNAS 86:1698-1702 (1989); Iaccarino et al., Nature 2016 (40 Hz mouse).',
    note: 'Gamma oscillations are real neurophysiology; audio-driven gamma entrainment benefits in humans remain unproven.',
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
